---
title: "OpenClaw：用开源方式把 AI 助手部署到你自己的设备上"
date: "2026-08-24"
description: "OpenClaw 是一个开源的个人 AI 助手框架，支持在本地设备运行，支持多平台消息通道（WhatsApp、Telegram、Discord 等），通过插件体系灵活扩展，由非营利组织 OpenClaw Foundation 维护。"
author: "Cheman"
slug: openclaw
draft: false
categories: ["技术", "开源", "AI"]
tags: ["OpenClaw", "开源", "AI助手", "本地部署", "Chatbot"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenClaw**，它是一个完全开源的个人 AI 助手框架，主打"在你的设备上运行，由你掌控"，支持接入 WhatsApp、Telegram、Discord 等主流 IM 平台，由非营利组织 OpenClaw Foundation 开发维护。

## 一、项目概述

OpenClaw 起源于为 **Molty**（一个"太空龙虾"主题的 AI 助手）打造的技术基础设施，由 Peter Steinberger 和社区共同创建。项目目标是让每个人都能在自己的服务器或电脑上运行一个功能完整、可扩展的 AI 助手，而不是把所有数据交给第三方 SaaS 服务。

核心特性：

- **本地优先**：Gateway 运行在你自己的机器上，所有对话数据不经过第三方服务器
- **多通道接入**：支持 WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage 等
- **插件生态**：通过 ClawHub 分享和安装插件，官方提供 Plugin SDK
- **多平台伴侣应用**：提供 Companion App，支持语音、Canvas、相机、屏幕、设备本地操作
- **安全设计**：DM 能力的通道默认启用配对机制，未知发送者需要管理员审批
- **开源非营利**：由 OpenClaw Foundation（501(c)(3) 非营利组织）维护

## 二、技术架构

### 核心组件

OpenClaw 的架构围绕 **Gateway**（本地控制平面）展开：

- **Gateway**：管理会话、工具、事件和通道连接的核心服务，运行在主机上
- **Control UI**：网页控制台，可配置模型、通道、插件
- **TUI**：终端用户界面，适合开发者快速操作
- **Channels**：与各 IM 平台的连接层，负责消息收发和状态同步
- **Companion Apps / Nodes**：在各平台（iOS/Android）运行的轻量代理，提供语音、相机等设备能力

### 技术选型

- **运行时**：Node.js 22.22.3+ / 24.15+ / 25.9+，以 pnpm workspace 管理多包工程
- **构建工具**：支持 Docker 多阶段构建，可通过 `OPENCLAW_EXTENSIONS` 参数选择性打包插件依赖
- **插件系统**：提供完整的 Plugin SDK，插件可独立发布到 ClawHub

核心源码结构示例（从 Dockerfile 和源码目录推断）：

```dockerfile
# 通过 build arg 选择性打包插件依赖
ARG OPENCLAW_EXTENSIONS=""
docker build --build-arg OPENCLAW_EXTENSIONS="diagnostics-otel,matrix" .
```

```bash
# 本地开发环境搭建
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
```

### 安全模型

OpenClaw 在安全设计上做了明确说明：

- 所有入站消息默认视为不可信输入
- 支持 DM 的通道（如私信）默认开启配对机制，新用户需管理员执行 `openclaw pairing approve <channel> <code>` 审批
- 工具默认在主机上执行，可通过配置启用沙箱隔离
- 远程暴露 Gateway 前建议阅读[安全指南](https://docs.openclaw.ai/gateway/security)和[暴露运行手册](https://docs.openclaw.ai/gateway/security/exposure-runbook)

## 三、安装与快速开始

### 安装方式

**macOS / Linux / WSL2：**
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

**Windows PowerShell：**
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

**已有 Node.js 环境（npm/pnpm/Bun）：**
```bash
npm install -g openclaw@latest --allow-scripts=openclaw
# 或
pnpm add -g openclaw@latest --allow-scripts=openclaw
```

> 注意：npm 11.15 及更早版本需去掉 `--allow-scripts=openclaw` 参数。

### 首次启动

```bash
# 启动守护进程并完成初始化引导
openclaw onboard --install-daemon

# 检查运行状态
openclaw gateway status

# 打开控制台
openclaw dashboard
```

首次运行会自动引导配置模型、创建工作区、设置通道连接。

## 四、进阶使用

### 配置消息通道

通过 Control UI 或 CLI 配置你需要的 IM 平台：

```bash
# 查看支持的通道
openclaw channel list

# 连接 Telegram
openclaw channel add telegram --token YOUR_BOT_TOKEN
```

### 安装插件

通过 ClawHub 安装社区插件：

```bash
openclaw plugin install <plugin-id>
```

或者访问 [clawhub.ai](https://clawhub.ai) 浏览插件列表。

### 远程访问与安全

如果需要从外网访问 Gateway（用于家庭服务器等场景），需要：

1. 仔细阅读[暴露运行手册](https://docs.openclaw.ai/gateway/security/exposure-runbook)
2. 启用沙箱模式：`openclaw gateway config set sandbox.enabled true`
3. 配置认证和 TLS

## 五、常见问题

**Q: 安装脚本报错"command not found"怎么办？**
确保 Node.js 22.22.3+ 已安装，可通过 `node -v` 确认版本。Linux/macOS 用户建议使用 nvm 管理多版本。

**Q: 启动后无法连接模型？**
检查 `~/.openclaw/config.json` 中的模型配置，确保 API Key 正确且额度充足。可运行 `openclaw gateway status` 查看诊断信息。

**Q: Docker 构建时插件依赖不完整？**
确保 `OPENCLAW_EXTENSIONS` 参数中指定的插件 ID 与本地 `openclaw-extensions/` 目录下的名称一致，或直接使用仓库已有的源码目录名。

**Q: 如何贡献代码？**
OpenClaw 欢迎 AI 辅助的 PR，详情见 [CONTRIBUTING.md](https://github.com/openclaw/openclaw/blob/main/CONTRIBUTING.md)。Bug 和功能请求通过 [GitHub Issue Chooser](https://github.com/openclaw/openclaw/issues/new/choose) 提交，安全问题走 SECURITY.md 专用通道。

## 六、总结

OpenClaw 为那些希望拥有自己 AI 助手、同时又不想被封闭平台绑定的用户，提供了一个扎实的技术方案。它不只是一个聊天机器人框架，而是一套完整的主机端 AI 基础设施——从 Gateway 到 Channels，从插件生态到 Companion App，每个层面都有清晰的抽象。对于动手能力强、注重隐私的开发者来说，这是一个值得深入探索的项目。
