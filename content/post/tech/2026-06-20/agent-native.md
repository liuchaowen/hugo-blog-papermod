---
title: "Agent-Native：让 AI Agent 与 UI 真正融合的开源框架"
date: 2026-06-20
description: "BuilderIO 开源的 Agent-Native 框架，打破 AI Agent 与用户界面的割裂状态，让两者成为同一系统的平等公民。支持 Action 一次定义多端复用、实时多人协作、Per-user 工作区，并可部署为 Headless API、Rich Chat 或完整应用三种形态。"
author: "Cheman"
slug: agent-native
draft: false
categories: [开源框架, AI Agent]
tags: [GitHub, 开源, AI Agent, BuilderIO, JavaScript]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Agent-Native**（by BuilderIO），它提出了一个很有说服力的观点——不要再在"丰富的用户界面"和"自主 Agent"之间做选择题，每一个 Agent-Native 应用两者兼备。

## 一、项目概述

Agent-Native 是一个开源框架，用于构建**你真正拥有**的 Agentic 应用。它的核心主张是：Agent 和 UI 应该是同一系统的平等公民，每一个操作都双向可用——既可以直接点击，也可以用自然语言告诉 Agent 来执行。

典型使用场景：

- 你正在用一个 SaaS 产品编辑文档，选中一段文字，按 `Cmd+I`，直接对 Agent 说"把这段改写成更专业的语气"——Agent 知道你选中了什么，因为 UI 和 Agent 共享状态
- 多个用户和 Agent 同时编辑同一个文档，CRDT 自动合并，Agent 是"一等公民协作者"，有自己的光标和选区
- 你用一个 `/visual-plan` slash 命令让 Coding Agent 在写代码前先打开一个可审查的结构化计划文档，而不是输出一堵文字墙

**核心特性一览：**

| 特性 | 说明 |
|------|------|
| Everything syncs | Agent 和 UI 共享一个数据库和状态，任何一方的变更即时反映在另一方 |
| Real-time multiplayer | 基于 CRDT 的实时协作，支持人类和 Agent 同时编辑，含光标、选区等 Presence 信息 |
| Context-aware | Agent 知道用户当前正在看什么、选中了什么 |
| Per-user workspace | Skills、Memory、Instructions、Sub-agents、MCP Servers 均支持按用户隔离，SQL 支持 |
| Agents call agents | 通过 A2A 协议，Agent 之间可以互相发现并跨应用执行操作 |
| Three shapes | 同一套原语可部署为 Headless API / Rich Chat / 完整应用 |
| Apps that improve themselves | Agent 可以自主添加功能、修复 Bug、优化 UI |
| Backend agnostic | 支持任何 Drizzle 兼容的 SQL 数据库，任何 Nitro 兼容的 Host |

## 二、技术原理

### 2.1 Action 原语：一次定义，多端复用

Agent-Native 最核心的设计是 `defineAction`。**一个 Action 定义，同时服务于 UI、Agent、HTTP API、MCP、A2A 和 CLI**，彻底消除了"前端调接口、Agent 调工具"的重复定义问题。

```ts
// 一次定义，多端复用
export default defineAction({
  schema: z.object({
    emailId: z.string(),
    body: z.string(),
  }),
  run: async ({ emailId, body }) => {
    await db.insert(replies).values({ emailId, body });
  },
});
```

这个 Action 会自动获得以下能力：
- **UI 调用**：通过前端组件直接触发
- **Agent 调用**：Agent 通过工具调用（Tool Call）使用
- **HTTP 调用**：外部系统通过 REST API 调用
- **MCP 调用**：兼容 MCP 协议的 Host 调用
- **A2A 调用**：其他 Agent-Native 应用中的 Agent 跨应用调用
- **CLI 调用**：通过命令行直接触发

### 2.2 三种产品形态共享同一套原语

Agent-Native 的架构设计允许开发者在同一套原语基础上，选择三种不同的产品形态：

| 形态 | 交付形式 | 适用场景 |
|------|---------|---------|
| **Headless** | 纯 API，无 UI | 被代码、CLI、MCP、A2A 调用 |
| **Rich Chat** | 独立或嵌入式聊天界面 | 需要丰富工具结果渲染（表格、图表、审批流）的场景 |
| **Whole App** | 完整 SaaS/产品 UI | Chat 可置中或移至侧边栏，与 App 状态实时同步 |

协议层（A2A、MCP、MCP Apps、标准远程 MCP OAuth、HTTP/CLI、AG-UI、Claude Agent SDK、Vercel AI SDK 等）都挂在同一个 Action 表面上，不需要为每个功能单独做集成。

### 2.3 实时多人协作架构

Agent-Native 的实时协作基于 CRDT（Conflict-free Replicated Data Type）实现，核心设计要点：

1. **Agent 是一等公民协作者**：Agent 在文档中有自己的 Presence（光标位置、选区环），和人类用户平权
2. **SQL 后端支持**：任何 Drizzle 支持的 SQL 数据库均可作为状态后端，包括 Serverless 环境
3. **跨应用 A2A**：同一 Origin 部署的多应用共享登录 Session，A2A 调用无需 JWT 签名和 CORS 配置

### 2.4 Skills 系统

Agent-Native 的 Skills 是可以被 Agent 安装的"能力包"，类似 Claude Code 的 slash command 扩展。官方示例：

```bash
npx @agent-native/core@latest skills add visual-plan
```

安装后获得两个 slash 命令：

- **`/visual-plan`**：Agent 在写代码前先生成结构化、可审查的计划文档（含内联图表、UI 线框图、文件级实现地图、可评论标注）
- **`/visual-recap`**：代码变更后，将 PR 或 git diff 转化为高层视角的可视化回顾（Schema 变更、API 变更、文件变更以 before/after 块渲染，附可分享的审查链接）

Skills 支持 app-backed（有后端服务）和 local（纯本地）两种形态。

## 三、安装与快速开始

### 3.1 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Node.js | ≥ 22 |
| 包管理器 | pnpm 10.29.1（项目默认） |
| 数据库 | 任何 Drizzle 支持的 SQL 数据库 |

### 3.2 快速开始：从模板创建

Agent-Native 采用**模板克隆**（cloneable）而非脚手架（scaffold）的方式，每个模板都是一个完整、100% 开源的 SaaS 应用。

```bash
# 创建多应用工作区（monorepo）
npx @agent-native/core@latest create my-platform
cd my-platform
pnpm install
pnpm dev
```

CLI 会弹出多选器，可以选择同时包含多个模板应用：

```bash
# 只创建单个应用（非 monorepo）
npx @agent-native/core@latest create my-app --standalone --template mail
```

### 3.3 官方模板列表

| 模板 | 描述 | 对标产品 |
|------|------|---------|
| Calendar | 事件管理 + Google Calendar 同步 + AI 调度 | Google Calendar, Calendly |
| Content | 本地 MDX 编辑 + Agent 辅助写作 | Obsidian |
| Plans | Visual Plan Mode for Coding Agents | — |
| Slides | React 演示文稿生成与编辑 | Google Slides, Pitch |
| Analytics | 数据分析 + 图表生成 + 可复用 Dashboard | Amplitude, Mixpanel |
| Clips | 屏幕录制 + 自动转录 + Agent 剪辑 | Loom |

## 四、使用方法与实战

### 4.1 工作区（Monorepo）结构

默认创建的是多应用工作区，结构如下：

```
my-platform/
├── package.json                   # 声明 agent-native.workspaceCore
├── pnpm-workspace.yaml
├── .env                           # 共享密钥：ANTHROPIC_API_KEY 等
├── packages/
│   └── shared/                    # 跨应用共享代码/指令/Skills/Branding
└── apps/
    ├── mail/
    ├── calendar/
    └── forms/
```

后续添加新应用：

```bash
npx @agent-native/core@latest add-app notes --template content
```

### 4.2 一键部署多应用

所有应用共享一个 Origin，路由自动分配：

```bash
npx @agent-native/core@latest deploy
# https://your-agents.com/mail/*       → mail
# https://your-agents.com/calendar/*   → calendar
# https://your-agents.com/forms/*      → forms
```

同一 Origin 部署带来两个关键优势：
1. **共享登录 Session**：用户在一个应用登录，所有应用自动认证
2. **零配置跨应用 A2A**：从 Calendar 的 Agent Chat 中 `@mail` 即可调用 Mail 应用的能力

### 4.3 连接外部 Agent Host

Agent-Native 应用可以作为 MCP Server，被 Claude、ChatGPT、Codex、Cursor、OpenCode、GitHub Copilot 等 MCP Host 连接。配置方式见[外部 Agent 接入指南](https://agent-native.com/docs/external-agents)。

## 五、常见问题与解决方案

### Q1: Node.js 版本要求 ≥ 22，本地是 v18 怎么办？

需要使用 nvm 或 fnm 安装 Node.js 22+：

```bash
nvm install 22
nvm use 22
```

### Q2: pnpm install 时报 `postinstall` 脚本失败？

`postinstall` 会构建多个包并重建 `better-sqlite3`，确保：
1. 已安装 Xcode Command Line Tools（macOS）
2. Python 可用（better-sqlite3 需要编译）
3. 尝试先运行 `pnpm --filter @agent-native/core build` 单独构建核心包定位问题

### Q3: 数据库如何选择？

开发环境推荐使用 SQLite（零配置），生产环境可选：
- **Postgres**（Neon、Supabase、Vercel Postgres）
- **MySQL / MariaDB**
- **LibSQL**（Turso，边缘部署场景）

在 `.env` 中配置 `DATABASE_URL` 即可切换，Drizzle 自动适配。

### Q4: 如何自定义 Action 的鉴权？

Action 定义中可以通过 `auth` 字段控制访问权限，支持按用户、按角色、按 Scope 鉴权。详见 [Actions 文档](https://agent-native.com/docs/actions)。

### Q5: Agent 和 UI 的状态同步会不会有性能问题？

Agent-Native 的状态同步基于增量更新和 CRDT 合并，只在状态实际变更时推送。对于大规模实时协作场景，建议：
- 使用支持 Replica 的 SQL 数据库（如 Postgres）
- 对高频更新字段做节流/防抖处理
- 利用 Nitro 的 Serverless 缓存能力

## 六、总结

Agent-Native 解决了一个长期存在的矛盾：**用户需要丰富的 UI 来操作和可视化数据，同时希望 AI Agent 能自主执行复杂任务**。传统方案要么 Agent 是"对话侧边栏"（无法深度操作 UI 状态），要么 UI 是"Agent 的结果展示器"（用户失去直接操作能力）。

Agent-Native 的解法是让 Agent 和 UI 共享同一套 Action 原语和状态层，从架构层面消除两者的边界。对于想要构建"AI 原生"产品的团队，这是一个值得深入研究的框架。

- **GitHub**：https://github.com/BuilderIO/agent-native
- **官网**：https://agent-native.com
- **文档**：https://agent-native.com/docs
- **模板库**：https://agent-native.com/templates
- **Discord 社区**：https://discord.gg/qm82StQ2NC
- **License**：MIT
