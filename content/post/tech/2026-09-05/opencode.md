---
title: "OpenCode：开源 AI 编程助手，一个命令搞定全栈开发"
date: 2026-09-05T00:04:00+08:00
description: "OpenCode 是一个开源 AI 编程助手，支持多平台安装，提供 build 和 plan 双 Agent 模式，让开发者通过自然语言完成代码编辑、命令行操作等开发任务。"
author: "Cheman"
draft: false
tags: ["AI编程", "开源工具", "GitHub Trending", "开发效率"]
categories: ["技术", "开源工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenCode**，一个开源的 AI 编程助手，支持 macOS、Windows、Linux 全平台安装，可以通过自然语言完成代码编辑、bash 命令执行等开发任务。

## 一、项目概述

OpenCode 是一个开源 AI 编码 Agent，项目托管于 [opencode.ai](https://opencode.ai)，核心定位是为开发者提供一个本地化的、可控的 AI 编程助手。

主要特性：
- **双 Agent 模式**：内置 `build` 和 `plan` 两种 Agent，`Tab` 键自由切换
  - `build`：默认模式，全权限执行开发任务
  - `plan`：只读模式，默认拒绝文件编辑，执行 bash 前需确认，适合代码探索和方案规划
- **多平台桌面应用**：提供 DMG/EXE/AppImage 桌面版（Beta）
- **General 子 Agent**：通过 `@general` 召唤，处理复杂的多步搜索和任务编排
- **多语言国际化**：README 支持 20+ 语言，含简体中文

## 二、技术架构

从源码结构来看，OpenCode 采用 **monorepo + Bun workspace** 组织，主要技术栈：

- **运行时**：Bun（packageManager 指定 `bun@1.3.14`）
- **前端框架**：Solid.js + SolidStart
- **后端**：Hono（轻量 Web 框架）+ Cloudflare Workers 部署
- **AI 集成**：Vercel AI SDK（`ai@6.0.168`），支持多模型
- **样式**：Tailwind CSS v4 + OpenTUI 组件库
- **数据库**：Drizzle ORM + SQLite（`@effect/sql-sqlite-bun`）
- **部署**：SST + Cloudflare（AWS SES 邮件、Stripe 支付）

核心依赖体现了现代 AI 应用架构：Hono 作为轻量 API 层，AI SDK 负责模型调用，Drizzle 作为类型安全 ORM，Cloudflare Workers 提供边缘部署能力。

## 三、安装与快速开始

支持多种安装方式：

```bash
# 一键安装（YOLO）
curl -fsSL https://opencode.ai/install | bash

# npm / bun / pnpm / yarn
npm i -g opencode-ai@latest

# macOS Homebrew
brew install anomalyco/tap/opencode

# Windows Scoop
scoop install opencode

# Arch Linux
sudo pacman -S opencode
```

安装脚本支持自定义路径，优先级：`$OPENCODE_INSTALL_DIR` > `$XDG_BIN_DIR` > `$HOME/bin` > `$HOME/.opencode/bin`。

桌面版（Beta）可从 [Releases 页面](https://github.com/anomalyco/opencode/releases) 下载 DMG/EXE/AppImage，或通过包管理器安装：

```bash
# macOS
brew install --cask opencode-desktop

# Windows
scoop bucket add extras; scoop install extras/opencode-desktop
```

## 四、使用方法

### Agent 模式切换

在对话中按 `Tab` 键切换 Agent：

| Agent | 权限 | 适用场景 |
|-------|------|---------|
| `build` | 全权限 | 开发任务、代码修改 |
| `plan` | 只读 | 代码探索、方案设计 |
| `@general` | 多步 | 复杂搜索、跨文件任务 |

### 配置与文档

详细配置文档见 [opencode.ai/docs](https://opencode.ai/docs)。

## 五、总结

OpenCode 填补了开源 AI 编程助手的空白——不是套壳，而是真正开源可控的方案。对比 Cursor、Copilot 等商业工具，OpenCode 的优势在于本地运行、透明可控，且 monorepo 结构对贡献者友好。如果你需要一个可以部署在私有环境、或者希望深度定制的 AI 编程助手，OpenCode 值得关注。

---
