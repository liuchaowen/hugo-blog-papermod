---
title: "Deno 2.x：更安全、更现代的 JavaScript/TypeScript 运行时"
date: "2026-08-05"
description: "Deno 是由 Node.js 原作者 Ryan Dahl 打造的下一代 JavaScript/TypeScript 运行时，基于 V8、Rust 和 Tokio 构建，默认安全、TypeScript 原生支持、开箱即用。本文深入解析其架构设计与核心特性。"
author: "Cheman"
slug: deno
draft: false
categories: ["技术", "开源"]
tags: ["Deno", "TypeScript", "JavaScript", "运行时", "Rust"]
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

今天在 GitHub Trending 上看到一个值得关注的项目：**Deno**，这是 Node.js 原作者 Ryan Dahl 在离开 Node.js 多年后重新设计的 JavaScript/TypeScript 运行时，目标直指 Node.js 的历史包袱，用 Rust 重写内核、默认安全执行、一行命令即可运行 TypeScript。

## 一、项目概述

Deno 是一个安全、现代化、零配置的 JavaScript/TypeScript 和 WebAssembly 运行时，底层由 Google V8 JavaScript 引擎、Rust 语言和 Tokio 异步运行时共同驱动。与 Node.js 相比，Deno 的核心差异化在于：

- **默认安全**：没有文件、网络、环境变量等权限的隐式访问，所有敏感操作必须显式授权
- **TypeScript 原生支持**：无需额外构建工具链，直接运行 `.ts` 文件
- **内置工具链**：格式化（`deno fmt`）、linting（`deno lint`）、测试（`deno test`）、文档生成等开箱即用
- **标准库内置**：官方维护的 `@std` 标准库托管在 JSR 上，版本化管理
- **单一可执行文件**：Deno 本身是一个独立二进制，零依赖安装

Deno 目前已被众多开发者用于构建 Web 服务器、CLI 工具、边缘计算函数（通过 Deno Deploy）等场景。

## 二、技术原理

### 架构设计

Deno 的核心架构分为三层：

- **V8 引擎**：负责执行 JavaScript/TypeScript（编译为 V8 字节码）
- **Rust 中间层**（`deno_core`）：封装 V8 isolate 管理、异步任务调度、权限校验等核心逻辑
- **Tokio 异步运行时**：驱动所有 I/O 操作（网络、文件、HTTP 等）

从 `Cargo.toml` 可以看到，Deno 采用 Rust Workspace 模式组织了大量扩展模块（Extension），这些 ext 模块以插件化方式向 V8 上下文注入原生能力：

```toml
[workspace]
resolver = "2"
members = [
  "cli", "ext/fetch", "ext/net", "ext/fs",
  "ext/http", "ext/websocket", "ext/kv", "ext/ffi",
  "runtime", "libs/core", ...
]
```

每个 `ext/` 模块对应一类原生能力，如 `ext/fetch` 提供 Web Fetch API 实现，`ext/websocket` 提供 WebSocket 支持，`ext/ffi` 允许 JavaScript 直接调用 native 共享库。

### 权限系统

Deno 的沙箱安全模型是其最大亮点之一。默认情况下，Deno 进程无法访问网络、文件系统、子进程等系统资源，必须通过启动参数显式授权：

```sh
# 允许网络访问（指定域）
deno run --allow-net=api.github.com https://example.com/script.ts

# 允许读写指定目录
deno run --allow-read=/tmp --allow-write=/tmp script.ts

# 允许运行子进程
deno run --allow-run script.ts
```

这种白名单机制从根源上限制了恶意脚本的破坏半径。

### Web 标准 API

Deno 积极跟进 Web 标准，大量 Web Platform APIs（如 `fetch`、`Streams`、`WebSocket`、`Service Workers`）在 Deno 中原生可用，无需引入第三方 polyfill。从 README 的示例可以看到：

```typescript
Deno.serve((_req: Request) => {
  return new Response("Hello, world!");
});
```

这一行代码即可启动一个 HTTP 服务器，完全兼容 Web 标准 `Request/Response` 对象模型。

## 三、安装与快速开始

### 环境要求

- 操作系统：macOS、Linux、Windows 均支持
- 架构：x86_64、aarch64（ARM）

### 安装

**macOS / Linux（推荐）：**

```sh
curl -fsSL https://deno.land/install.sh | sh
```

**Windows PowerShell：**

```powershell
irm https://deno.land/install.ps1 | iex
```

**Homebrew（macOS）：**

```sh
brew install deno
```

安装完成后验证：

```sh
deno --version
# deno 2.x.x
```

### 最简运行示例

启动一个 HTTP 服务器（直接运行 TypeScript，无需构建）：

```sh
deno run --allow-net server.ts
```

`server.ts` 内容：

```typescript
Deno.serve((_req: Request) => {
  return new Response("Hello, world!");
});
```

浏览器访问 `http://localhost:8000`，即可看到输出。

## 四、使用方法与实战

### 基础用法

Deno 的核心理念是 **URL 即模块**——所有依赖通过 URL 引入，无需 `node_modules`：

```typescript
import { serve } from "https://deno.land/std/http/server.ts";

serve((req) => new Response("Hello"), { port: 3000 });
```

运行：

```sh
deno run --allow-net server.ts
```

### 进阶用法：调用本地共享库

通过 `ext/ffi` 模块，Deno 可以直接调用 C 共享库：

```typescript
const library = Deno.dlopen(
  "./libadd.so",
  { "add": { parameters: ["i32", "i32"], result: "i32" } }
);

const result = library.symbols.add(2, 3);
console.log(result); // 5
```

### 实战：构建 CLI 工具

Deno 的单文件分发特性非常适合 CLI 工具开发，示例：

```typescript
#!/usr/bin/env -S deno run --allow-read
const decoder = new TextDecoder();
const file = await Deno.readFile(Deno.args[0]);
console.log(`文件大小: ${file.byteLength} bytes`);
```

## 五、常见问题与解决方案

### 安装失败（Linux）

如果 `curl` 安装脚本失败，可手动下载二进制：

```sh
curl -fsSL https://deno.land/release/v2.0.0/deno-linux-amd64.zip -o /tmp/deno.zip
unzip /tmp/deno.zip -d /usr/local/bin/
chmod +x /usr/local/bin/deno
```

### 网络权限被拒

错误信息：`PermissionDenied: network access`。解决：使用 `--allow-net` 参数授权目标域名或域。

### TypeScript 编译慢

首次运行时 V8 会 JIT 编译 TypeScript，再次运行即有缓存。若需要预编译，可使用 `deno compile` 将运行时打包为单一可执行文件：

```sh
deno compile --allow-net -o myapp server.ts
```

### 与 Node.js 的兼容性问题

Deno 通过 `ext/node` 提供部分 Node.js 兼容层（如 `path`、`fs` 等 `node:` 模块），但并非 100% 兼容所有 npm 包。如果依赖较多 npm 包，建议在 `deno.json` 中配置 `nodeModulesDir: true` 使用 npm 兼容模式。

## 六、总结

Deno 2.x 作为 Ryan Dahl 对当年 Node.js 设计缺陷的全面修正，在安全性（权限沙箱）、开发者体验（TypeScript 原生、单文件分发）和标准化（Web Platform APIs）三个维度上都交出了令人满意的答卷。对于新项目，尤其是 CLI 工具、边缘函数、API 服务等场景，Deno 值得优先考虑。当然，Node.js 生态的成熟度（百万 npm 包）仍是 Deno 短期内难以完全取代的护城河，两者并非非此即彼的关系。
