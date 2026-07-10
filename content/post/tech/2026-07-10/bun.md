---
title: "Bun 1.x：集运行时、包管理器、测试器于一体的 JavaScript 工具箱"
date: "2026-07-10"
description: "Bun 是一个用 Rust 编写的全栈 JavaScript/TypeScript 工具链，内置运行时、包管理器、测试器和构建器，号称 Node.js 的直接替代品。本文深入解析其架构设计、核心特性与实战用法。"
author: "Cheman"
slug: bun
draft: false
categories: ["技术", "开源", "JavaScript"]
tags: ["Bun", "JavaScript", "TypeScript", "Node.js", "Rust", "开源"]
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

今天在 GitHub Trending 上看到一个热度不减的项目：**Bun**，一个用 Rust 编写的 JavaScript/TypeScript 全家桶工具链，号称 Node.js 的 drop-in 替代品，启动速度和内存占用都大幅领先传统方案。

## 一、项目概述

Bun 不仅仅是一个运行时，而是一个**all-in-one 工具包**，将 Node.js 生态中需要多个独立工具才能完成的事情整合到一个可执行文件中：

- **Bun Runtime**：基于 JavaScriptCore（Rust 实现）的 JavaScript 运行时，替代 Node.js
- **Bun Package Manager**：极速包管理器，替代 npm/yarn/pnpm
- **Bun Test Runner**：内置测试框架，替代 Jest/Vitest
- **Bun Bundler**：高性能构建器，替代 webpack/esbuild/Rollup

从 `Cargo.toml` 可以看到 Bun 的架构非常模块化，由 50+ 个 Rust crate 组成，包括 `bun_js`（JS 执行引擎）、`bun_bundler`（打包器）、`bun_install`（包管理）、`bun_http`（HTTP 服务器）、`bun_sql`（SQLite）、`bun_transpiler`（TypeScript 转译）等核心子模块。

安装方式极为简洁：

```sh
# Linux/macOS 安装脚本
curl -fsSL https://bun.com/install | bash

# Windows PowerShell
powershell -c "irm bun.sh/install.ps1 | iex"

# npm 全局安装
npm install -g bun

# Homebrew
brew tap oven-sh/bun && brew install bun
```

## 二、核心技术原理

### 2.1 运行时架构：JavaScriptCore + Rust

Bun 的运行时核心放弃了 V8，选择了 **JavaScriptCore**（WebKit 的 JS 引擎），配合 Rust 实现的高性能 IO 层。`bun_js` crate 是整个运行时的核心，负责：

```rust
// Cargo.toml 中 bun_js 的核心依赖
bun_jsc = { path = "src/jsc" }
bun_runtime = { path = "src/runtime", default-features = false }
bun_transpiler = { path = "src/transpiler" }
```

JavaScriptCore 相比 V8 在某些场景下有更快的启动时间和更低的内存占用，而 Rust 负责所有 IO、网络、文件系统的底层操作，两者结合实现了 Bun 号称的极速启动。

### 2.2 包管理器：智能缓存与并行下载

`bun_install` 模块实现了 Bun 的包管理逻辑，与 npm 生态完全兼容（`package.json` / `node_modules` 约定均支持），同时使用 `bun.lockb`（类 npm 的 lockfile）保证可复现性。核心特性包括：

- **全局缓存**：安装过的包缓存在全局 store，跨项目复用
- **并行安装**：依赖解析后并行下载，大幅缩短安装时间
- **Isolation 支持**：支持隔离安装模式，适合 CI 环境

```toml
# bun_install 支持的 Cargo.toml 配置片段
bun_install = { path = "src/install" }
```

### 2.3 HTTP 服务器：Bun.serve

Bun 原生内置了高性能 HTTP 服务器 API，无需任何第三方依赖：

```typescript
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/users") {
      const users = await Bun.sql`SELECT * FROM users`;
      return Response.json(users);
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

从 `src/bun_http` 和 `src/http_jsc` 的模块划分可以看出，Bun 使用了 Rust 原生 HTTP 解析 + JavaScript 上下文桥接的架构，既保证了底层解析效率，又保持了 JS 层的灵活性。

### 2.4 内置数据库支持

Bun 还内置了对 SQLite、PostgreSQL 和 Redis 的原生支持：

```typescript
// SQLite（bun:sqlite）
import { Database } from "bun:sqlite";
const db = new Database("app.db");
const users = db.query("SELECT * FROM users").all();

// PostgreSQL（Bun.sql）
const pg = Bun.sql`postgresql://user:pass@localhost/db`;
const result = await pg.query("SELECT * FROM products");

// Redis（Bun.redis）
const redis = new Bun.redis();
await redis.set("key", "value");
```

### 2.5 构建器：Bun.build

Bun 的打包构建模块同样集成在内核中，无需独立工具：

```typescript
import { build } from "bun";

const result = await build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  minify: true,
  target: "browser",
  format: "esm",
});
```

## 三、安装与快速开始

### 环境要求

- Linux（x64/arm64，内核 ≥ 5.1，推荐 5.6+）
- macOS（x64/Apple Silicon）
- Windows（x64/arm64）

### 快速上手

```sh
# 初始化一个新项目
bun init

# 运行 TypeScript/JS 文件（直接运行，无需编译）
bun run index.tsx

# 安装依赖
bun install

# 添加第三方包
bun add react
bunx cowsay 'Hello, world!'

# 运行测试
bun test

# 升级 Bun 本身
bun upgrade
```

## 四、实战用法与进阶

### 4.1 作为 Node.js 替代

Bun 的最大卖点是对 Node.js API 的高度兼容：

```typescript
// fs、path、process 等 Node.js 内置模块开箱即用
import { readFileSync } from "fs";
import path from "path";

const config = readFileSync(
  path.join(process.cwd(), "config.json"),
  "utf-8"
);
console.log(JSON.parse(config));
```

### 4.2 热重载开发服务器

```sh
# watch 模式，自动重启
bun --watch run start
```

### 4.3 TypeScript 原生支持

无需额外配置，`.ts`、`.tsx` 文件直接运行：

```sh
bun run index.tsx  # JSX/TS 直接运行，无需 tsc 编译
```

### 4.4 与主流框架集成

Bun 生态已覆盖几乎所有主流 JS 框架：

| 框架 | 集成方式 |
|------|---------|
| React | `bun add react react-dom` |
| Next.js | `bunx create-next-app` |
| Hono | `bun add hono` |
| Elysia | `bun add elysia` |
| Nuxt | `bunx nuxi init` |
| Astro | `bunx create-astro` |
| SvelteKit | `bunx sv create` |
| Prisma | `bun add prisma` + `bun prisma init` |

### 4.5 CI/CD 中的使用

Bun 的安装速度优势在 CI 环境中尤为明显：

```yaml
# GitHub Actions 示例
- name: Install Bun
  run: curl -fsSL https://bun.com/install | bash

- name: Install dependencies
  run: bun install --ci
```

## 五、常见问题

**Q: Bun 能完全替代 Node.js 吗？**
A: 对于绝大多数项目来说可以，但部分 Node.js 特有 API（如某些 `node:*` 内置模块的高级用法）可能存在细微差异。Bun 官方维护了 Node.js 兼容性列表，建议在关键项目中使用前做完整测试。

**Q: Bun 和 Deno 的区别是什么？**
A: Deno 主打安全沙箱和内置 TypeScript 支持；Bun 更注重与 Node.js 生态的完全兼容（npm 包零改动运行），性能上 Bun 在冷启动场景通常更有优势。

**Q: 安装 Bun 后会影响现有的 Node.js 项目吗？**
A: 不会。Bun 与 Node.js 完全独立安装，可以共存。建议通过 `npx`、`bunx` 等方式按项目选择使用哪个运行时。

**Q: Windows 支持情况如何？**
A: Bun 对 Windows 的支持已较为成熟，支持 x64 和 arm64架构，可以通过 PowerShell 脚本或 npm 全局安装。

**Q: 生产环境可以使用 Bun 吗？**
A: 可以。多家公司在生产环境中使用 Bun，包括 Vercel、Discord 等。Bun 遵循 MIT 许可证，生产使用无限制。

## 六、总结

Bun 用 Rust 重写了 JavaScript 工具链的每一层，从运行时、构建器到包管理器，形成了一个高度集成、高性能的 all-in-one 解决方案。对于新项目，直接用 `bun` 替代 `node`/`npm`/`jest`/`webpack` 的组合可以显著提升开发体验；对于现有项目，Bun 对 Node.js API 的高度兼容使得渐进式迁移成为可能。如果你追求极致的工具链性能和更简洁的项目依赖，Bun 值得深入一试。
