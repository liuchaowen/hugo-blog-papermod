---
title: "OpenWork：让 AI 工作流跨 Agent 共享的开源桌面应用"
date: 2026-07-30
description: "OpenWork 是开源的 AI 工作流共享桌面应用，通过 MCP 协议让 Codex、Claude Code、Cursor 等 Agent 复用同一套 skills、MCP 与连接服务，并配套 OpenWork Den 企业级控制台统一管理推理资源、权限与技能市场。"
author: "Cheman"
slug: openwork
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, MCP, 工作流]
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

**今天在 GitHub Trending 上看到一个有意思的项目：[OpenWork](https://github.com/different-ai/openwork)**，它是一款免费开源的桌面应用，专门用来"共享 AI 工作流"——让同一套 skills、MCP 连接和第三方服务，能在 Codex、Claude Code、Cursor 等不同的 Agent 之间自由复用。

## 一、项目概述

OpenWork 把自己定位为 **Claude Cowork 和 Codex 的开源替代品**，支持 macOS、Windows 和 Linux。它的核心理念很直接：你不需要为每个 Agent 重复配置一遍工具链，而是把能力抽象成"可共享的单元"，一次创建、随处使用。

- **跨 Agent 复用**：为 Codex、Claude Code、Cursor 或其他兼容 Agent 添加同一个 OpenWork MCP，即可复用相同的 skills、MCP 和已连接服务。
- **桌面端可选**：提供一个独立的工作区桌面应用，但**并非必需**——你也可以完全从自己已有的 Agent 里使用 OpenWork。
- **组织级管控**：面向中大型团队，OpenWork Den 控制台让管理员发布能力、管理访问权限、配置共享或按用户的连接。

## 二、技术原理

### 基于 MCP 的能力注入

OpenWork 的接入方式不是"再训练一个模型"，而是利用 **MCP（Model Context Protocol）** 把能力注入到任意兼容 Agent。它暴露了一个远程 MCP Server：

```text
https://api.openworklabs.com/mcp/agent
```

该 Server 提供两个工具：

- `search_capabilities`：发现当前组织里你能使用的所有能力（skills、插件、连接等）。
- `execute_capability`：执行其中某个能力。

接入方式因客户端而异，下面是几个典型示例：

```bash
# Codex
codex mcp add openwork --url https://api.openworklabs.com/mcp/agent
```

```bash
# Claude Code
claude mcp add --transport http openwork https://api.openworklabs.com/mcp/agent
```

```json
// OpenCode（opencode.json）
{
  "mcp": {
    "openwork": {
      "type": "remote",
      "enabled": true,
      "url": "https://api.openworklabs.com/mcp/agent",
      "oauth": {}
    }
  }
}
```

添加 MCP 后，客户端会打开浏览器让你登录并选择 OpenWork 组织，之后你在该组织里被授权的 skills、插件、MCP 连接、Google Workspace、Microsoft 365 等能力就全部可用了。

### 整体架构

从仓库的 `package.json` 可以看出，OpenWork 是一个 **pnpm + turbo 驱动的 monorepo**，技术栈相当完整：

| 模块 | 作用 |
|------|------|
| `@openwork/desktop` | 基于 Electron 的桌面应用 |
| `@openwork/app` | 核心 Web 应用（含大量端到端测试脚本） |
| `@openwork/ui` / `@openwork/ui-demo` | UI 组件库与演示 |
| `@openwork-ee/den-api` | 组织控制台后端 API（OpenWork Den） |
| `@openwork-ee/den-web` | 控制台前端（Next.js） |
| `@openwork-ee/inference` | 推理代理 / 配额代理层 |
| `@openwork-ee/enterprise-mock-lab` / `diagnostics` | 企业特性测试与诊断 |

后端采用 **MySQL** 存储，使用 `better-auth` 做鉴权（开发环境通过 `BETTER_AUTH_SECRET`、`DEN_DB_ENCRYPTION_KEY` 等环境变量注入），并通过 Docker Compose 拉起本地依赖：

```bash
pnpm dev:den:mysql
# docker compose -p openwork-den-local up -d --wait mysql
pnpm dev:den:db-push   # 推送 schema
pnpm dev:den:api       # 启动 Den API
pnpm dev:den:web       # 启动 Den 控制台前端
```

### OpenWork Den：组织控制平面

OpenWork Den 是把"个人好用"升级到"团队可用"的关键部分，它承担了运维与治理职责：

- **推理资源治理**：规模化地配置推理资源，并控制哪些成员 / 团队可以使用某个模型提供商。
- **成员与团队管理**：邀请同事、创建团队、集中管理访问权限。
- **桌面策略**：设置桌面策略、限制本地模型访问、规定组织可使用的应用版本。
- **技能市场**：通过 marketplace 发布 skills 与插件，再分配给整个组织、某个团队或特定个人。
- **插件兼容**：导入 Anthropic 兼容插件，使其支持的 skills 与远程 MCP 通过 OpenWork MCP 对外可用。

## 三、安装与快速开始

如果你已经在使用某个 AI Agent，OpenWork 提供了一种"零点击安装"的体验：把下面这段提示词复制粘贴到 Claude Code、Cursor、Codex、ChatGPT 等任意可运行命令的 Agent 中即可：

```text
Install OpenWork on my computer, set up my first workspace, and open it ready to use. Follow the steps in https://openworklabs.com/start.md?v=hero
```

它会依次完成三件事：

1. 安装 OpenWork；
2. 创建你的 workspace；
3. 打开并准备就绪。

也可以直接下载桌面应用：[openworklabs.com/download](https://openworklabs.com/download)。

## 四、使用方法与实战

### 场景一：在 Claude Code 中启用 OpenWork 能力

```bash
claude mcp add --transport http openwork https://api.openworklabs.com/mcp/agent
```

添加后，在 Claude Code 里你就可以让 Agent 调用 `search_capabilities` 发现能力，再 `execute_capability` 执行，例如让它在已连接的 Google Workspace 中查找文档、或在 Microsoft 365 里创建事件——而不需要在每个会话里重新配置 OAuth 连接。

### 场景二：团队统一能力分发

管理员在 OpenWork Den 中：

1. 将团队沉淀的 skills / 插件发布到内部 marketplace；
2. 把其中的能力分配给"工程团队"或"某几个同事"；
3. 相关同事在自己的 Agent 里添加同一个 OpenWork MCP，登录组织后即刻获得这些能力。

这样，团队内部的最佳实践（prompt 技巧、内部工具封装、合规检查脚本）就能以"能力"的形式标准化分发。

### 场景三：本地开发（贡献者向）

仓库对开发者非常友好，支持多 git worktree 并行开发：

```bash
pnpm dev                  # 单工作区开发，复用共享 dev profile
pnpm dev:worktree        # 多 worktree 并行，自动分配端口与隔离 profile
```

`dev:worktree` 默认开启 `OPENWORK_ELECTRON_USE_MOCK_KEYCHAIN=1` 以避免 macOS 真实钥匙串弹窗阻塞 Electron 主循环；如需测试真实 keychain，可显式设为 `0`。

## 五、常见问题与解决方案

**Q：多个 worktree 启动时提示无法获取 profile 锁？**
A：新版本在拿不到 profile 锁时会明确报错并退出，而不是残留一个打开 CDP 端口却没有窗口的进程。确认没有其它 OpenWork 实例在运行即可。

**Q：本地开发时 Electron 卡在钥匙串弹窗？**
A：这是 Chromium 持久化已认证 cookie 时触发的系统 keychain 弹窗阻塞了主循环。在隔离 profile 下设置 `OPENWORK_ELECTRON_USE_MOCK_KEYCHAIN=1`（worktree 模式默认已开）即可绕过。

**Q：Den 本地环境起不来？**
A：确认已按序执行 `pnpm dev:den:mysql`（需要 Docker）拉起 MySQL，再 `pnpm dev:den:db-push` 推送 schema，最后启动 `dev:den:api` / `dev:den:web`，并正确设置 `DATABASE_URL` 与 `DEN_DB_ENCRYPTION_KEY`。

**Q：Agent 连不上 OpenWork MCP？**
A：检查远程地址 `https://api.openworklabs.com/mcp/agent` 是否可达，以及客户端添加 MCP 后是否完成了 OAuth 登录与组织选择；OpenCode 等需显式配置 `oauth: {}`。

**Q：桌面应用是必选项吗？**
A：不是。桌面端只是"想用独立工作区时的可选形态"，你完全可以从自己已有的 Agent 直接通过 MCP 使用 OpenWork。

## 六、总结

OpenWork 的差异化思路在于：**不重复造轮子，而是把"能力"标准化、服务化并通过 MCP 注入到任意 Agent**。对个人用户，它意味着 skills 和连接一次配置、处处可用；对团队，OpenWork Den 提供了推理治理、权限与技能市场的企业级底座。如果你正在被"每个 Agent 都要重新接一遍工具"所困扰，OpenWork 值得一试。

> 项目地址：[github.com/different-ai/openwork](https://github.com/different-ai/openwork) ｜ 文档：[openworklabs.com/docs](https://openworklabs.com/docs)
