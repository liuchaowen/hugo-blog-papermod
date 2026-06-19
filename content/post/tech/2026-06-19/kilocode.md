---
title: "Kilo Code：开源 AI 编程代理，支持 500+ 模型自由切换"
date: 2026-06-19
description: "Kilo Code 是一个开源 AI 编程代理，支持 VS Code、JetBrains 和 CLI 三大平台，可从 500+ 模型中自由切换，按模型提供商原价计费，无加价。"
author: "Cheman"
slug: kilocode
draft: false
categories: ["技术", "开源"]
tags: ["AI编程", "VS Code", "JetBrains", "CLI", "开源", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个火热的项目：**Kilo Code**，一个开源的 AI 编程代理，支持 VS Code、JetBrains 和 CLI 三大平台，让你在编程的每个场景都能用上 AI。

## 一、项目概述

Kilo Code 由 Kilo-Org 开发维护，是一个开源的 AI 编程代理（Coding Agent）。它最核心的特点有三个：

- **全平台覆盖**：VS Code 插件、JetBrains 插件、命令行 CLI，甚至提供 Web 云端版本
- **500+ 模型自由切换**：支持 GPT-5.5、Claude Opus 4.7、Claude Sonnet 4.6、Gemini 3.1 Pro Preview 等主流模型，并且可以在任务执行中动态切换模型
- **零加价透明计费**：按模型提供商的原价收费，不收任何中间费用，且无需提前配置 API Key 即可开始使用

项目基于 MIT 许可证开源，代码仓库采用 monorepo 架构，使用 Bun 作为包管理器，TypeScript 作为主要开发语言。

## 二、技术原理

### 架构设计

Kilo Code 采用典型的 monorepo 架构，通过 Bun workspaces 管理多个子包。从 `package.json` 可以看出项目结构：

```
packages/
├── kilo-vscode/       # VS Code 扩展
├── kilo-jetbrains/    # JetBrains 插件
├── opencode/          # 核心引擎（CLI）
├── sdk/               # JS SDK
├── plugin/            # 插件系统
└── storybook/         # UI 组件库
```

核心技术栈包括：

- **Bun** 作为运行时和包管理器（`packageManager: "bun@1.3.14"`）
- **TypeScript** 全栈类型安全，配置 `@tsconfig/bun` 和 `@tsconfig/node22`
- **SolidJS** 用于构建 VS Code 扩展的 Webview UI 界面
- **Turbo** 用于 monorepo 的构建编排
- **Drizzle ORM** 用于数据持久化（SQLite 后端）
- **Hono** 用于 Web 服务端

### 模型路由与切换

Kilo Code 支持任务中途切换模型是其一大亮点。用户可以根据任务的复杂度、延迟需求和成本预算，在不同模型间切换。例如：简单的代码补全可以用轻量快速模型，复杂架构设计则切换到推理能力更强的大模型。

### 内置 Agent 系统

Kilo Code 内置了多个专业化 Agent，用户可根据任务类型切换：

| Agent | 用途 |
|-------|------|
| **Code** | 默认 Agent，根据自然语言实现和编辑代码 |
| **Plan** | 设计架构、编写实施计划 |
| **Ask** | 回答代码库相关问题，不修改文件 |
| **Debug** | 排查和追踪问题 |
| **Review** | 审查代码变更，检查性能、安全、风格和测试覆盖 |

用户还可以构建自定义 Agent 来满足特定需求。

### 终端与浏览器自动化

Kilo Code 能够直接控制终端执行命令和自动化浏览器操作，这意味着它不仅能写代码，还能帮你运行测试、部署服务、操作网页。

## 三、安装与快速开始

### 环境要求

- **VS Code**：安装最新版 VS Code
- **JetBrains**：任意 JetBrains IDE（IntelliJ、PyCharm、WebStorm 等）
- **CLI**：Node.js 18+ 或直接使用独立二进制

### 安装方式

**VS Code 扩展：**

直接在 VS Code 扩展市场搜索 "Kilo Code" 安装，或访问 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=kilocode.Kilo-Code)。

**CLI 工具（多种安装方式）：**

```bash
# npm
npm install -g @kilocode/cli

# pnpm
pnpm add -g @kilocode/cli

# bun
bun add -g @kilocode/cli

# Homebrew (macOS / Linux)
brew install Kilo-Org/tap/kilo

# 一键安装脚本
curl -fsSL https://kilo.ai/cli/install | bash
```

**JetBrains 插件：**

在 JetBrains IDE 的 `Settings → Plugins` 中搜索 "Kilo Code" 安装。

### 快速开始

安装 CLI 后，在任意项目目录运行：

```bash
kilo
```

即可启动 AI 编程助手。

## 四、使用方法与实战

### 基础用法：代码生成

在 VS Code 中安装 Kilo Code 后，可以直接在编辑器中用自然语言描述需求，Agent 会自动生成、修改跨文件的代码。

### 自主运行模式（CI/CD）

Kilo Code 提供自主运行模式，适合 CI/CD 场景：

```bash
kilo run --auto "run tests and fix any failures"
```

`--auto` 参数禁用所有权限提示，Agent 完全自主执行操作。**注意：仅在受信任的环境中使用此模式。**

### MCP 扩展市场

Kilo Code 内置 MCP（Model Context Protocol）市场，用户可以查找和接入各种 MCP 服务器来扩展 Agent 的能力边界。

### 行内自动补全

除了 Agent 对话模式，Kilo Code 还提供行内自动补全功能，以幽灵文本（ghost-text）的形式给出建议，按 Tab 键接受。

## 五、常见问题与解决方案

### 需要配置 API Key 吗？

不需要。创建 Kilo 账户后即可直接使用，无需提前配置任何 API Key。但如果需要接入自托管的模型端点，可以通过配置文件指定。

### 支持哪些模型？

目前支持 500+ 模型，包括 OpenAI、Anthropic、Google 等主流提供商的最新模型。可以在任务执行中随时切换。

### 能否离线使用？

CLI 版本支持本地模型接入，配合 Ollama 等工具可以实现完全离线的 AI 编程体验。

### 与 Cursor / Copilot 有什么区别？

Kilo Code 是开源的，不锁定任何单一模型提供商，且不收取模型加价。其多 Agent 架构（Code、Plan、Ask、Debug、Review）也提供了更灵活的工作流。

## 六、总结

Kilo Code 代表了 AI 编程工具的一个新方向：**开源、模型无关、多平台统一**。对于不想被某个特定 AI 编程工具锁定、希望自由选择模型和编程环境的开发者来说，Kilo Code 是一个值得关注的选择。其内置的多 Agent 系统和 CI/CD 自主运行能力也使其不仅适合日常开发，还能融入自动化工作流。

项目地址：[https://github.com/Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode)
