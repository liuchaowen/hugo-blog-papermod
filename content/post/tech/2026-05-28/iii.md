---
title: "iii：零集成架构的后端统一运行时"
date: 2026-05-28
draft: false
categories: ["技术", "开源", "架构设计"]
tags: ["GitHub", "微服务", "Rust", "实时系统", "Agent"]
description: "iii 是一个革命性的后端统一运行时，通过 Worker、Function、Trigger 三个原语将队列、定时任务、HTTP、状态管理、可观测性等基础设施统一到一个实时系统表面，实现零集成的服务编排体验。"
author: "Cheman"
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

## 一、项目概述

在现代后端开发中，每一个服务从第一行业务代码开始，就需要集成各种基础设施：消息队列、定时任务、HTTP 服务、状态管理、可观测性、Agent、沙箱等。每种能力都带来独立的集成故事，导致开发周期长、维护成本高。

**iii** 是由 Motia LLC 开发的后端统一运行时，它将所有这些基础设施"坍缩"为一个实时系统表面。通过三个简单的原语——**Worker**、**Function**、**Trigger**——开发者可以轻松组合、扩展和实时观测服务栈中的每一个组件。

核心特性：

- **零集成架构**：一条命令添加队列、Agent、沙箱等能力，无需复杂配置
- **实时目录**：所有 Worker 自动注册到实时目录，可即时发现和调用
- **三原语模型**：Worker / Function / Trigger 构成完整的心智模型
- **多语言 SDK**：支持 Node.js、Python、Rust
- **Agent 友好**：Agent 可以像开发者一样动态添加 Worker 并调用其功能

## 二、技术原理

### 2.1 架构设计

iii 采用 Rust 编写的高性能引擎（Engine）作为核心运行时，负责：

- **Worker 注册与发现**：管理所有 Worker 的生命周期和元数据
- **路由与序列化**：处理 Trigger 触发的 Function 调用路由
- **可观测性**：内置 tracing、logs、实时状态监控

架构层次：

```
┌─────────────────────────────────────────────┐
│              iii Console (React + Rust)      │
│         可视化 Worker / Function / Trigger   │
├─────────────────────────────────────────────┤
│                 iii Engine (Rust)            │
│      核心运行时 / 模块 / 协议 / 路由          │
├─────────────────────────────────────────────┤
│    SDKs (Node.js / Python / Rust)           │
│         Worker 定义 / Function 注册          │
└─────────────────────────────────────────────┘
```

### 2.2 三原语模型

**Worker** 是注册到 iii 引擎的进程，可以是 TypeScript API 服务、Python 数据管道或 Rust 微服务。Worker 之间通过共享运行时自动发现彼此。

```python
# Python 示例：定义一个 Worker
from iii_sdk import Worker

worker = Worker("content-service")

@worker.function("classify")
async def classify_content(text: str) -> str:
    # 业务逻辑
    return "category"
```

**Trigger** 是触发 Function 执行的声明式规则，支持：

- 直接函数调用
- HTTP 端点
- Cron 定时任务
- 队列订阅
- 状态变更事件
- 流事件

```typescript
// Node.js 示例：声明 HTTP Trigger
import { Worker } from 'iii-sdk';

const worker = new Worker('api-gateway');

worker.trigger('http', {
  path: '/api/users',
  method: 'GET',
  function: 'users::list'
});
```

**Function** 是带有稳定标识符的工作单元，如 `content::classify`、`orders::validate`。它接收输入、执行工作并可选返回输出。

### 2.3 核心技术栈与选型理由

| 组件 | 技术选型 | 理由 |
|------|----------|------|
| Engine | Rust | 高性能、内存安全、异步支持 |
| SDK | Node.js / Python / Rust | 覆盖主流后端语言 |
| Console | React + Rust | 前端友好 + 高性能后端 |
| 通信协议 | WebSocket + 自定义协议 | 实时双向通信 |
| 序列化 | serde_json / serde_yaml | Rust 生态标准选择 |

从源码可见，Engine 使用 Tokio 作为异步运行时：

```rust
// Cargo.toml
tokio = { version = "1", features = ["macros", "rt-multi-thread", "fs", "process", "time"] }
```

### 2.4 零集成的工作原理

传统模式：

```
新可观测性工具 → 无数集成配置
新 Agent 框架 → 单独的重试/追踪/超时配置
新队列 → 供应商评估、采购、数周集成
```

iii 模式：

```bash
iii worker add observability
iii worker add queue
# 完成。系统自动注册、可追踪、可调用
```

关键在于 **共享运行时**：所有 Worker 通过 iii Engine 统一管理，自动获得：

- 统一的路由机制
- 统一的 tracing 和 logs
- 统一的重试/超时配置
- 实时状态同步

## 三、安装与快速开始

### 3.1 环境要求

- **操作系统**：Linux / macOS / Windows
- **运行时**：Node.js ≥ 20 / Python ≥ 3.8 / Rust ≥ 1.70
- **包管理器**：pnpm（Node.js）/ pip / uv（Python）/ cargo（Rust）

### 3.2 安装 iii CLI

通过 Docker：

```bash
docker pull iiidev/iii:latest
```

通过 npm（SDK）：

```bash
npm install iii-sdk
# 或
pnpm add iii-sdk
```

通过 pip（Python SDK）：

```bash
pip install iii-sdk
```

通过 cargo（Rust SDK）：

```toml
[dependencies]
iii-sdk = "0.16"
```

### 3.3 最简运行示例

```bash
# 初始化项目
iii project init myapp
cd myapp

# 启动引擎
iii

# 添加 Worker 能力
iii worker add queue
iii worker add agent
iii worker add sandbox
```

访问 [workers.iii.dev](https://workers.iii.dev/) 浏览可用的 Worker 目录。

## 四、使用方法与实战

### 4.1 基础用法：定义一个 API 服务

**Node.js 示例**：

```typescript
import { Worker, Function, Trigger } from 'iii-sdk';

const worker = new Worker('user-service');

// 定义 Function
@worker.function('create')
async function createUser(data: UserData): Promise<User> {
  // 业务逻辑
  return { id: '123', ...data };
}

// 声明 HTTP Trigger
worker.trigger('http', {
  path: '/users',
  method: 'POST',
  function: 'user-service::create'
});
```

**Python 示例**：

```python
from iii_sdk import Worker

worker = Worker("order-service")

@worker.function("validate")
async def validate_order(order_id: str) -> bool:
    # 验证逻辑
    return True

# 声明队列 Trigger
worker.trigger("queue", {
    "queue_name": "orders",
    "function": "order-service::validate"
})
```

### 4.2 进阶用法：Agent 动态扩展

iii 对 Agent 开发特别友好。当 Agent 发现系统缺少某种能力时，可以动态添加 Worker：

```python
# Agent 可以在运行时添加 Worker
await iii.worker.add("image-processor")

# 自动发现新 Worker 的函数
functions = await iii.discover_functions("image-processor")

# 调用函数
result = await iii.call("image-processor::resize", {
    "image": "path/to/image.jpg",
    "width": 800
})

# 查看追踪记录
trace = await iii.trace.get(result.trace_id)
```

### 4.3 实际项目示例：内容处理管道

```typescript
// content-worker.ts
import { Worker } from 'iii-sdk';

const worker = new Worker('content-pipeline');

// 步骤1：分类
@worker.function('classify')
async function classifyContent(text: string) {
  // 调用 ML 模型
  return { category: 'tech', confidence: 0.95 };
}

// 步骤2：摘要
@worker.function('summarize')
async function summarizeContent(text: string) {
  return { summary: '...' };
}

// 步骤3：发布
@worker.function('publish')
async function publishContent(content: Content) {
  // 发布到下游系统
}

// 定义流程 Trigger
worker.trigger('state', {
  entity: 'content',
  event: 'created',
  function: 'content-pipeline::classify'
});
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：Rust 编译失败

```bash
error: failed to run custom build command for `iii-engine`
```

**解决方案**：

1. 确保 Rust 版本 ≥ 1.70
2. 安装系统依赖（macOS）：

```bash
xcode-select --install
brew install openssl
```

### 5.2 运行时错误

**问题**：Worker 无法注册到 Engine

```
Error: Connection refused to ws://localhost:49199
```

**解决方案**：

1. 确认 iii Engine 已启动：

```bash
iii
# 或指定配置
iii --config config.yaml --port 49199
```

2. 检查端口占用：

```bash
lsof -i :49199
```

### 5.3 性能问题

**问题**：Function 调用延迟高

**解决方案**：

1. 使用 `--release` 编译：

```bash
cargo build --release -p iii
```

2. 调整 Tokio 线程池（在代码中）：

```rust
#[tokio::main(flavor = "multi_thread", worker_threads = 8)]
async fn main() {
    // ...
}
```

### 5.4 兼容性问题

**问题**：SDK 版本与 Engine 版本不匹配

**解决方案**：

检查版本一致性。从 `Cargo.toml` 可见当前版本为 `0.16.0-next.4`：

```toml
[workspace.package]
version = "0.16.0-next.4"
```

确保 SDK 和 Engine 使用相同版本。

## 六、总结

iii 通过 **Worker / Function / Trigger** 三个原语，重新定义了后端服务的开发体验。它将传统需要数周集成的基础设施——队列、定时任务、HTTP、状态管理、可观测性——统一到一个实时系统表面，实现真正的零集成架构。

对于平台团队，iii 提供了发布 Worker 的标准方式；对于应用团队，iii 简化了 Function 注册和 Trigger 声明；对于 Agent 开发者，iii 提供了与人类开发者相同的目录发现和函数调用接口。这种统一性使得 iii 成为现代后端架构的理想选择。

**项目信息**：

- GitHub: [https://github.com/iii-hq/iii](https://github.com/iii-hq/iii)
- 文档: [https://iii.dev/docs](https://iii.dev/docs)
- Worker 目录: [https://workers.iii.dev/](https://workers.iii.dev/)
- License: Engine (ELv2) / SDKs (Apache-2.0)
