---
title: "DeepSeek Harness：DeepSeek AI 开源的下一代 Agent 框架"
date: 2026-09-09T13:07:00+08:00
description: "DeepSeek Harness（dsh）是 DeepSeek AI 开源的 Agent 框架，基于一切皆插件架构和 Cordis 时空可组合性范式，提供 Web UI、桌面端、CLI 多形态运行方式，支持 Node.js 22+ 和 TypeScript 6。"
author: "Cheman"
draft: false
tags: ["DeepSeek", "Agent框架", "开源", "TypeScript", "AI"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**DeepSeek Harness**（`dsh`），这是 DeepSeek AI 官方开源的 Agent 框架，采用"一切皆插件"的架构设计，背后还有一套叫 Cordis 的时空可组合性编程范式撑腰。

## 一、项目概述

DeepSeek Harness（简称 `dsh`）是 [DeepSeek AI](https://deepseek.com) 开发的开源 Agent 运行框架。它不是又一个简单的 ChatBot 壳子，而是一个完整的 Agent 基础设施，核心理念是 **"everything-is-a-plugin"**——所有功能（工具、模型适配器、会话管理、沙箱执行）都以插件形式接入，框架本身只提供编排和生命周期管理。

项目当前处于 **Developer Preview** 阶段，版本号 `0.1.5-alpha.1`，迭代速度很快，官方明确表示会有破坏性变更。

核心特性：

- **插件化架构**：工具、模型、会话存储、沙箱都是插件，可自由替换
- **多运行形态**：Web UI（默认 `http://127.0.0.1:3080`）、桌面端（Electron 打包）、CLI
- **Cordis 驱动**：基于 [Cordis](https://github.com/cordiverse/cordis) 框架，遵循"时空可组合性"编程范式
- **跨平台**：支持 macOS（arm64/x64）、Windows（x64）、Linux
- **100% 测试覆盖**：单元测试、E2E 测试、快照测试、性能基准测试一应俱全

## 二、技术原理

### 架构设计：Host / Client 双面体系

从源码的 `tsconfig.json` 和 `tsdown.config.ts` 可以看出，dsh 采用了 **Host / Client 双面（Face）架构**：

```typescript
// tsdown.config.ts 中的核心逻辑
export default defineConfig(({ env }) => {
  const client = isBuildFaceClient(env?.DSH_BUILD_FACE)
  return {
    workspace: client
      ? ['vendor/*', 'packages/*/*', 'apps/cli']
      : ['vendor/*', 'packages/*/*', 'apps/cli', 'apps/desktop', 'apps/desktop-host'],
    entry: client ? '' : ['lib/types/{index,invariant,startup}.js'],
    plugins: client ? [] : [typertPlugin({ mode: 'workspace', faces: ['host'] })],
  }
})
```

- **Host Face**：Node.js 运行时，负责模型调用、文件系统、子进程管理、沙箱执行
- **Client Face**：浏览器运行时，负责 UI 渲染、用户交互、状态管理

两面通过 HTTP 桥接通信，互不直接依赖。这种设计让 Web UI 和桌面端共享同一套 Client 代码，而 Host 逻辑可以独立部署。

### Cordis：时空可组合性范式

Cordis 是 dsh 的底层框架，其设计理念来自论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)。核心思想是：

- **时间维度**：插件有明确的生命周期（注册 → 激活 → 挂起 → 恢复 → 销毁）
- **空间维度**：插件可以在不同运行时（Host/Client/Worker）间组合，不需要修改代码

这意味着同一个工具插件既能在本地 Node.js 进程中执行，也能在 Web Worker 或远程沙箱中运行，框架负责处理上下文传递和状态同步。

### Monorepo 工作区结构

从 `package.json` 的 `workspaces` 字段可以看出项目的高度模块化：

```json
{
  "workspaces": [
    "vendor/*",
    "packages/*/*",
    "native/system",
    "native/system/packages/*",
    "apps/*",
    "website"
  ]
}
```

关键目录：

| 路径 | 职责 |
|------|------|
| `vendor/*` | Cordis 框架及其依赖（重 scope 后内联） |
| `packages/*/*` | 核心功能包（agent、tool、session、shell、sandbox 等） |
| `native/system` | 原生系统模块（沙箱、子进程管理） |
| `apps/cli` | CLI 入口 |
| `apps/desktop` | Electron 桌面端 |
| `apps/web` | Web UI 前端 |

### 测试体系：100% 覆盖率门控

dsh 的测试策略非常硬核。从 `vitest.config.ts` 可以看到：

```typescript
thresholds: coveragePartitionMode
  ? undefined
  : {
      perFile: true,
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
```

**每个文件都必须 100% 覆盖**（语句、分支、函数、行），不达标就不让合并。测试分多个层级：

- **thread-safe**：线程安全的单元测试，用 fork 池运行
- **process-bound**：涉及进程全局状态的测试，单独隔离
- **snapshot**：录制/回放真实模型响应的快照测试
- **e2e**：调用真实 API 的端到端测试（需要 API Key）
- **bench**：性能基准测试
- **web**：浏览器端 E2E 测试

## 三、安装与快速开始

### 环境要求

- **Node.js**：`^22.19.0` 或 `>=24.0.0`
- **pnpm**：`11.7.0`（项目指定）
- **TypeScript**：`6.0.3`

### 方式一：NPX 直接运行（推荐）

```bash
npx @deepseek-ai/dsh web
```

这会自动安装并启动 Web UI，默认地址 `http://127.0.0.1:3080`，并自动打开浏览器。如果通过 SSH 连接，则只打印 URL 不打开浏览器。

加 `--no-open` 参数可以禁止自动打开浏览器：

```bash
npx @deepseek-ai/dsh web --no-open
```

### 方式二：从源码构建

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` 会执行完整的构建流水线：

1. `build:native-system` — 构建原生系统模块
2. `build:lib:host` — 编译 Host 面 TypeScript + tsdown 打包
3. `build:lib:client` — 编译 Client 面
4. `build:web` — 构建 Web UI 前端

## 四、使用方法与实战

### 启动 Web UI

最简单的使用方式：

```bash
npx @deepseek-ai/dsh web
```

启动后访问 `http://127.0.0.1:3080`，你会看到 dsh 的 Web 界面。在界面中可以：

- 选择模型（支持 DeepSeek 系列模型）
- 配置工具插件
- 创建 Agent 会话
- 查看工具调用轨迹和会话历史

### 桌面端应用

dsh 还提供 Electron 桌面端，支持 macOS arm64/x64 和 Windows x64：

```bash
# 开发模式
pnpm dev:desktop

# 打包
pnpm package:desktop:mac:arm64  # macOS Apple Silicon
pnpm package:desktop:win:x64    # Windows x64
```

### 插件开发

dsh 的插件开发遵循 `dsh-plugin` topic 规范。你可以创建自己的工具插件仓库，加上 `dsh-plugin` GitHub topic 就能被社区发现。插件需要遵循 Cordis 的生命周期接口：

- **注册**：声明插件名称、依赖、能力
- **激活**：初始化资源（连接、文件句柄等）
- **挂起/恢复**：保存和恢复运行时状态
- **销毁**：清理资源

## 五、常见问题与解决方案

### Q1: `pnpm install` 失败？

项目使用 pnpm 11.7.0，如果版本不匹配可能出错。建议用 corepack 管理：

```bash
corepack enable
corepack prepare pnpm@11.7.0 --activate
```

### Q2: 构建时报 TypeScript 错误？

项目要求 TypeScript 6.0.3 和 Node.js 22+。确保 `engines` 字段满足：

```json
{
  "engines": {
    "node": "^22.19.0 || >=24.0.0"
  }
}
```

### Q3: Windows 上某些测试失败？

从 `vitest.config.ts` 可以看到，Windows 上跳过了依赖 POSIX Shell 的测试套件：

```typescript
const windowsUnsupportedPackages = process.platform === 'win32'
  ? [
      'packages/shell/bash-local',
      'packages/shell/bash-sandbox',
      'packages/shell/tool-bash',
      'packages/hooks/*',
      'packages/terminal/terminal-bash',
      // ...
    ]
  : []
```

PowerShell 相关的测试在 Windows 上原生运行，不需要额外配置。

### Q4: 如何参与贡献？

项目有完整的贡献指南（`CONTRIBUTING.md`）和 Agent 指南（`AGENTS.md`）。由于 100% 覆盖率门控，新代码需要配套测试。可以加入 [Discord 社区](https://discord.gg/Ycq5dCaS4) 讨论。

## 六、总结

DeepSeek Harness 代表了一种新一代 Agent 框架的设计思路：不只是一个能跑 LLM 的壳子，而是从编程范式层面（Cordis 的时空可组合性）出发，构建一套真正可扩展、可组合的 Agent 基础设施。

**一切皆插件 + Host/Client 双面架构 + 100% 测试覆盖**，这三点让它在一众 Agent 框架中显得颇有诚意。虽然还在 alpha 阶段，但已经值得关注——毕竟这是 DeepSeek AI 出品，他们在大模型领域的技术积累有目共睹。

如果你在做 Agent 相关的开发，或者对可组合性编程范式感兴趣，dsh 值得一试。

**项目地址**：[https://github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)

**文档**：[https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

**许可证**：MIT
