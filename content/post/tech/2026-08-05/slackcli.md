---
title: "SlackCLI：用 TypeScript 与 Bun 打造的开发者友好 Slack 命令行工具"
date: 2026-08-05
description: "SlackCLI 是一款基于 TypeScript 与 Bun 构建的开源 Slack 命令行工具，支持标准 App Token 与浏览器会话 Token 双认证、多工作区管理、会话/消息/Canvas 操作，并可通过 cURL 自动提取浏览器令牌，非常适合 AI Agent 与自动化流程集成。"
author: "Cheman"
slug: slackcli
draft: false
categories: [开源, 工具]
tags: [GitHub, 开源, Slack, CLI, TypeScript, Bun, 自动化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**SlackCLI**，一个用 TypeScript 和 Bun 构建、面向开发者与 AI Agent 的 Slack 命令行工具。它把日常在 Slack 网页端才能完成的工作——收发消息、读会话、管理 Canvas——直接搬到了终端里。

## 一、项目概述

SlackCLI 是一个非官方、开源的 Slack 命令行交互工具，并非 Slack 官方出品，但它覆盖了大多数高频自动化场景。项目定位非常清晰：**让 AI 代理、自动化脚本和开发者能直接从终端访问 Slack 能力**。

核心特性包括：

- 🔐 **双认证支持**：既支持标准的 Slack App Token（xoxb/xoxp），也支持从浏览器会话提取的 Token（xoxd/xoxc）。
- 🎯 **一键提取浏览器 Token**：可自动解析从浏览器复制出的 cURL 命令，省去手动抠 Token 的麻烦。
- 🏢 **多工作区管理**：可同时维护多个 Slack 工作区，按名称或 ID 切换。
- 💬 **会话与消息管理**：列出频道、读取消息、发送消息、回复线程、编辑消息、添加表情回应。
- 📄 **Canvas 支持**：以 Markdown 形式列出与读取 Slack Canvas 文档。
- 🚀 **轻量高速**：基于 Bun 运行时，启动与执行速度都很快，并内置自更新机制。
- 🎨 **友好输出**：彩色、结构化的终端展示。

## 二、技术原理

### 架构设计

从 `package.json` 可以看出，项目采用 TypeScript + ESM 编写，运行时强依赖 Bun（`engines.bun >=1.0.0`），并用 `commander` 做命令路由，依赖 `@slack/web-api`（^7.15.2，即官方 Slack SDK）完成真正的 API 调用。

```json
{
  "name": "slackcli",
  "version": "0.7.1",
  "type": "module",
  "dependencies": {
    "@slack/web-api": "^7.15.2",
    "commander": "^12.1.0",
    "chalk": "^5.3.0",
    "ora": "^8.1.1"
  }
}
```

源码结构清晰地按职责拆分：

```
src/
├── index.ts              # CLI 入口
├── commands/             # 命令实现
│   ├── auth.ts           # 认证
│   ├── conversations.ts  # 会话
│   ├── messages.ts       # 消息
│   ├── update.ts         # 更新
├── lib/                  # 核心库
│   ├── auth.ts           # 令牌管理
│   ├── workspaces.ts     # 多工作区
│   ├── slack-client.ts   # API 封装
│   ├── formatter.ts      # 输出格式化
│   └── updater.ts        # 自更新
└── types/index.ts        # 类型定义
```

### 双认证的设计取舍

SlackCLI 同时支持两类令牌，原因在于使用场景不同：

- **标准 App Token（xoxb/xoxp）**：适合生产环境，需要创建 Slack App 并配置 OAuth Scope，权限可控、稳定，但不支持草稿（draft）消息等功能。
- **浏览器会话 Token（xoxd/xoxc）**：无需创建 App，从浏览器 Cookie/请求体中提取，上手快，支持更多网页端能力（如 `messages draft` 草稿消息），但会随浏览器会话过期。

配置统一存放在 `~/.config/slackcli/` 下，其中 `workspaces.json` 记录各工作区的凭据，便于多工作区切换。

### 构建与分发

`scripts/build.ts` 借助 Bun 的编译能力，可一次性产出 Linux/macOS/Windows 多平台二进制：

```bash
bun run build:all        # 同时构建 linux / macos / windows
```

这一设计让工具可以脱离 Node/Bun 环境单独运行，配合 Homebrew Tap 分发，安装成本极低。

## 三、安装与快速开始

### 环境要求

- Bun v1.0+（仅源码开发需要）
- TypeScript 5.x+
- 或从 Release 直接下载预编译二进制，无需任何运行时

### 安装方式

**Homebrew（推荐 macOS / Linux）：**

```bash
brew tap shaharia-lab/tap
brew install slackcli
brew upgrade slackcli   # 升级
```

**预编译二进制（以 macOS Apple Silicon 为例）：**

```bash
curl -L https://github.com/shaharia-lab/slackcli/releases/latest/download/slackcli-macos-arm64 -o slackcli
chmod +x slackcli
mkdir -p ~/.local/bin && mv slackcli ~/.local/bin/
```

**从源码构建：**

```bash
git clone https://github.com/shaharia-lab/slackcli.git
cd slackcli
bun install
bun run build
```

### 最简认证示例

最省事的方式是复制浏览器里的 Slack API 请求为 cURL，让 SlackCLI 自动解析：

```bash
slackcli auth parse-curl --login
# 粘贴 cURL 命令，按两次回车即可自动写入多工作区凭据
```

若使用标准 App Token：

```bash
slackcli auth login --token=xoxb-YOUR-TOKEN --workspace-name="My Team"
```

## 四、使用方法与实战

### 基础用法：列举与读取会话

```bash
slackcli conversations list                 # 列出所有会话
slackcli conversations list --types=public_channel
slackcli conversations read C1234567890      # 读取频道最近消息
slackcli conversations read C1234567890 --limit=50 --json
```

### 进阶用法：发送、回复与回应

```bash
# 发送频道消息
slackcli messages send --recipient-id=C1234567890 --message="Hello team!"

# 回复线程
slackcli messages send --recipient-id=C1234567890 \
  --thread-ts=1234567890.123456 --message="Great idea!"

# 带文件发送
slackcli messages send --recipient-id=C1234567890 \
  --message="Here is the file" --file=./report.pdf

# 添加表情回应
slackcli messages react --channel-id=C1234567890 \
  --timestamp=1234567890.123456 --emoji=fire
```

### 多工作区切换

```bash
slackcli auth list                       # 列出已认证工作区
slackcli auth set-default T1234567       # 设置默认
slackcli conversations list --workspace="My Team"  # 按名称指定
```

### 实战场景：AI Agent 自动播报

由于 `conversations read --json` 会返回含 `ts` / `thread_ts` 的结构化数据，配合标准 Token 的 `files:write` 权限，Agent 可以稳定地把构建产物、报表推送到指定频道，是典型的 CI/自动化集成模式。

## 五、常见问题与解决方案

**Q：浏览器 Token 认证失败？**
A：浏览器 Token 会随浏览器会话失效，重新执行 `slackcli auth extract-tokens` 提取新鲜 Token 即可；同时确认 workspace URL 格式为 `https://yourteam.slack.com`。

**Q：发送/读取提示权限错误？**
A：检查机器人或用户是否已被加入对应频道；确认 OAuth Scope 覆盖所需权限（如发文件需 `files:write`）；浏览器 Token 需保证在网页端有访问权限。

**Q：编辑消息不生效？**
A：只能编辑由当前认证用户/App 发布的消息，临时消息（ephemeral）无法编辑。

**Q：通过 Homebrew 安装后更新失败？**
A：用 `brew upgrade slackcli` 而非 `slackcli update`；若 `slackcli update` 仍失败，确保对二进制路径有写权限，或改用用户目录 `~/.local/bin` 安装。

## 六、总结

SlackCLI 把一个高频但分散的协作场景收敛到了一条命令里：双认证降低接入门槛，多工作区与结构化 JSON 输出让它天然适合自动化，Bun 带来的轻量与自更新则保证了长期可用性。如果你经常需要在脚本或 Agent 中操作 Slack，它值得一试——但请记住它是非官方工具，生产环境建议优先使用标准 App Token 并妥善管理权限。

- 项目地址：https://github.com/shaharia-lab/slackcli
- 许可协议：MIT
