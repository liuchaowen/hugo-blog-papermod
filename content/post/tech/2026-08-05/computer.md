---
title: "Cloudflare Computer： Durable Object 内置的虚拟文件系统与多后端运行时"
date: 2026-08-05
description: "Cloudflare Computer 是一个运行在 Durable Object 内部的虚拟文件系统，通过 SQLite 持久化状态，并提供 Container、Isolate Shell、Isolate JavaScript 三种可插拔执行后端，可在云端 Sandbox 中运行完整 Linux 环境、bash 命令或 ECMAScript 模块。"
author: "Cheman"
slug: computer
draft: false
categories: ["技术", "云计算", "开源"]
tags: ["Cloudflare", "Durable Objects", "WebAssembly", "边缘计算", "FUSE", "Node.js"]
showToc: true
TocOpen: false
hidemeta: false
comments: false
disableHLJS: false
disableShare: false
hideSummary: false
searchHidden: true
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个有意思的项目：**Cloudflare Computer**，它将一个虚拟文件系统直接实现在 Durable Object 内部，通过 SQLite 作为状态中枢，支持三种完全不同的执行后端——从完整的 Linux 容器到纯 JavaScript 运行时。

## 一、项目概述

Cloudflare Computer 是一个 Durable Object 原生虚拟文件系统（VFS），核心设计思想是：**状态权威存储 + 可插拔执行面**。

项目的核心价值在于：让 AI Agent、工作流引擎或任何需要临时工作目录的场景，能够直接在 Cloudflare Workers 基础设施上获得持久化的文件系统，而无需额外部署存储服务。

### 核心特性

- **SQLite 权威状态**：所有文件元数据和内容存储在 Durable Object 的 SQLite 中，通过 capnweb RPC 协议与后端同步
- **三种运行时后端**：Container（FUSE 挂载 + 完整 Linux）、Isolate Shell（bash in Dynamic Worker）、Isolate JavaScript（ESM in Dynamic Worker）
- **统一执行入口**：`workspace.runtime.exec(source, { backend })` 是唯一的调用入口，后端按需懒加载
- **零额外存储往返**：Isolate 后端直接通过 Workers RPC 访问 Workspace，避免二次同步延迟
- **Monorepo 架构**：分为 `dofs`（文件系统核心）、`rpc`（通信协议）、`computerd`（FUSE 守护进程）、`computer`（顶层入口）四个包

## 二、技术原理

### 架构设计

Cloudflare Computer 的架构分为三层：

```
┌─────────────────────────────────────────────┐
│              Consumer (Worker)              │
│     workspace.runtime.exec(source, opts)    │
└──────────────────┬──────────────────────────┘
                   │
        workspace.runtime  ← 插拔层
┌──────────────────┼──────────────────────────┐
│          Durable Object                    │
│  ┌─────────────────────────────────────┐  │
│  │         SQLite (权威状态)             │  │
│  │         dofs 包 (虚拟文件系统)        │  │
│  └─────────────────────────────────────┘  │
└──────────┬──────────┬───────────────────────┘
           │          │
    ┌──────┴──────┐  ┌┴────────────────┐
    │  Container  │  │  Isolate Shell  │
    │  (FUSE RPC) │  │  (just-bash)    │
    │  computerd  │  └─────────────────┘
    └─────────────┘  ┌─────────────────┐
                     │  Isolate JS     │
                     │  (Dynamic Worker)│
                     └─────────────────┘
```

### Container 后端：FUSE 挂载 + 真实 Linux 环境

Container 后端使用 FUSE（Filesystem in Userspace）将 Durable Object 的 SQLite 状态映射为真实挂载点：

```bash
# computerd 守护进程工作流程
# 1. 启动时通过 capnweb RPC 连接 Durable Object
# 2. 从 SQLite 获取初始文件系统状态
# 3. 挂载为 FUSE 文件系统到 /mnt/workspace
# 4. 用户在容器内读写文件 → computerd 同步回 SQLite
```

核心源码在 `packages/computerd` 中，关键逻辑：

```javascript
// 伪代码：computerd 的核心同步循环
async function syncLoop() {
  const rpc = new CapnWebRPC(doConnection);
  for await (const event of watchFuseEvents()) {
    if (event.kind === 'WRITE') {
      await rpc.write(event.path, event.data);
    } else if (event.kind === 'READ') {
      const data = await rpc.read(event.path);
      respondFuse(event.fid, data);
    }
  }
}
```

### Isolate 后端：直接 RPC，无状态同步

Isolate Shell 和 Isolate JavaScript 后端不走 FUSE，而是通过 Workers RPC 直接与 Durable Object 通信：

```javascript
// packages/computer/src/exec.ts（概念示例）
export async function exec(source: string, opts: { backend: 'shell' | 'js' }) {
  const worker = await env.WORKER_POOL.getOne(); // Dynamic Worker
  if (opts.backend === 'shell') {
    return worker.eval(`just-bash -c "${source}"`);
  } else {
    return worker.eval(`import("${source}")`);
  }
}
```

这种方式避免了 FUSE 同步开销，适合轻量级任务。

### SQLite 作为权威状态

`@cloudflare/dofs`（Durable Object Filesystem）包负责 SQLite 的管理：

```javascript
// packages/dofs/src/index.ts
export class Workspace {
  constructor(private do: DurableObjectState) {}

  async mkdir(path: string) {
    await this.do.storage.transaction(async (txn) => {
      await txn.put(`meta:${path}`, { type: 'dir' });
    });
  }

  async writeFile(path: string, data: Uint8Array) {
    await this.do.storage.put(`file:${path}`, data);
  }

  async readFile(path: string): Promise<Uint8Array> {
    return (await this.do.storage.get(`file:${path}`)) ?? new Uint8Array();
  }
}
```

### 性能表现

根据官方 benchmark（`docs/19_performance.md`）：

| 操作类型 | computerd FUSE | 真实磁盘 |
|---------|---------------|---------|
| metadata-heavy（大量 stat/open） | **胜出** | 略慢 |
| large sequential I/O（大文件顺序读写） | 略慢 | **胜出** |

FUSE 在元数据密集型操作上反而有优势，这是因为 SQLite 的索引结构对高频小文件操作做了优化。

## 三、安装与快速开始

### 环境要求

- Node.js 18+
- Cloudflare Workers 部署环境（Wrangler v3+）
- Durable Objects 支持（需要 Workers Paid 计划）

### 安装

```bash
npm install @cloudflare/computer
```

### Container 示例（需要部署）

```javascript
import { Workspace, ContainerRuntime } from '@cloudflare/computer';

// 在 Durable Object 中初始化
export class MyDO implements DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    this.workspace = new Workspace(state);
    this.runtime = new ContainerRuntime(this.workspace);
  }

  async fetch(request: Request) {
    const result = await this.runtime.exec('ls -la /workspace', {
      backend: 'container'
    });
    return new Response(result.stdout);
  }
}
```

### JavaScript Isolate 示例

```javascript
import { Workspace, JsRuntime } from '@cloudflare/computer';

export class MyAgent implements DurableObject {
  constructor(state, env) {
    this.workspace = new Workspace(state);
    this.runtime = new JsRuntime(this.workspace);
  }

  async runAgent(prompt: string) {
    // workspace.fs 自动注入到模块执行上下文
    const result = await this.runtime.exec(`
      import { readdir, readFile, writeFile } from 'node:fs/promises';
      const files = await readdir('/workspace');
      await writeFile('/workspace/output.txt', 'done');
      return files;
    `, { backend: 'js' });
    return result;
  }
}
```

## 四、使用方法与实战

### 构建 AI Agent 工作目录

Cloudflare Computer 最实用的场景之一是让 AI Agent 拥有持久化的工作目录：

```javascript
// 来自 examples/think 的用法
import { Workspace } from '@cloudflare/computer';
import { think } from '@cloudflare/think';

const workspace = new Workspace(doState);
// Agent 可以像在真实服务器上一样操作文件
const session = await think({
  workspace,
  prompt: '帮我写一个 Python 脚本来处理 data.csv',
  runtime: 'container' // 或 'js'
});
```

### 对比不同后端

| 场景 | 推荐后端 | 原因 |
|-----|---------|------|
| 需要 `gcc`、`pandoc` 等系统工具 | Container | 完整 Linux 用户态 |
| 快速脚本任务（bash） | Isolate Shell | 无容器启动开销 |
| AI Agent 调用 JS/TS 库 | Isolate JavaScript | 天然 ESM 支持，依赖 npm 包 |
| 高频小文件操作 | Container（FUSE 优化过） | SQLite 索引优势 |

### 生成并发布 Worker 项目

```javascript
// examples/artifacts：用 AI 生成代码后直接发布
const generated = await think({
  prompt: '创建一个返回 "Hello World" 的 Worker',
  workspace,
  runtime: 'js'
});
await workspace.publish(); // 发布到 Cloudflare Artifacts
```

## 五、常见问题与解决方案

**Q：Container 后端需要特殊权限吗？**
A：需要 Workers 启用 `experimental饶有趣味的 Durable Objects 沙箱` 支持。目前处于 Preview 阶段，不适合生产环境。

**Q：SQLite 存储有大小限制吗？**
A：Durable Object 存储单对象上限 1MB（标准），可通过 R2 或 D1 扩展存储大文件。FUSE 层的 `computerd` 会处理溢出。

**Q：Isolate 后端和 Container 后端数据一致吗？**
A：是的，两者共享同一个 Durable Object Workspace 实例，SQLite 是唯一权威数据源。

**Q：文件修改后多久同步到 SQLite？**
A：Container 后端在每次 FUSE `fsync` 时同步；Isolate 后端通过 RPC 实时写入，无额外延迟。

## 六、总结

Cloudflare Computer 是一个非常前沿的实验性项目，它将虚拟文件系统的状态权威直接嵌入 Durable Object，用 SQLite 作为持久化层，通过三种不同的执行后端（Container/Shell/JS）提供统一的使用接口。对于需要在边缘运行 AI Agent、工作流引擎或临时构建系统的场景，这是一个值得关注的方案——尤其是它已经内置了与 `@cloudflare/think`（AI Agent 框架）的集成。

> [!IMPORTANT]
> 该项目目前处于 **Preview Only** 阶段，API 不稳定，不适合生产使用，但非常适合探索边缘计算与持久化工作目录结合的可能性。
