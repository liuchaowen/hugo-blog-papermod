---
title: "iPolloWork：一个本地优先的 AI 可视化工作台，让 AI 协作真正可编辑"
date: "2026-08-14"
description: "iPolloWork 是一个开源本地优先 AI 工作台，将一个目标转化为可编辑的代码、文档、PPT、网站、设计和视频，是 Codex/Claude Code 的开源替代方案。"
author: "Cheman"
slug: ipollowork
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["AI", "开源", "GitHub", "本地部署", "开发者工具", "TypeScript"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**iPolloWork**，一个本地优先的 AI 可视化工作台，可以将一个目标转化为可编辑的代码、文档、PPT、网站、设计和视频——是 Codex 和 Claude Code 的开源替代方案。

## 一、项目概述

iPolloWork 不仅仅是一个聊天式的 AI 助手包装器，它为 AI Agent 提供了一个完整的工作空间，可以处理代码库、本地文件、浏览器任务、文档、演示文稿、网站、设计和视频。描述你想要的结果，Agent 会制定计划并执行，你可以检查工作、批准操作，并在同一地方继续编辑结果。

### 核心特性

- **Agent 优先的执行模式**：规划工作、使用工具、读写文件、运行命令，并从当前状态继续执行
- **可编辑的结果**：从代码到文档、网站、演示文稿、设计和视频，结果始终保持可编辑状态
- **本地控制**：在你的机器上运行，使用自己的模型或提供商，批准权限，通过 Skills、插件、MCP 服务器和浏览器自动化扩展工作空间
- **多平台支持**：macOS（Apple Silicon / Intel）、Windows（x64 / ARM64）、Linux（x64 / ARM64）

### 技术栈

项目基于 TypeScript 构建，使用 Electron 构建桌面应用，核心技术组件包括：
- React（前端 UI）
- Electron（桌面客户端）
- Node.js 22+ / pnpm 11+（开发环境）
- Bun（本地 Orchestrator 运行时）

## 二、技术架构

### 整体架构

```
iPolloWork desktop/UI ── local API ──> iPolloWork server ──> OpenCode
          │
          └── optional account/control requests ──> iPolloCloud
```

架构边界清晰：
- **Agent 执行和流式传输**：走 Work/Worker 路径，保留在本地
- **iPolloCloud**：处理身份认证、组织管理、托管 Worker 生命周期、管理后台和商业 App
- **本地模式**：完全可选，不需要账号或商业服务即可使用
- **OpenCode 独立升级**：作为独立组件存在，可以继续独立升级

### 仓库结构

```
apps/app          — 共享 React 用户界面
apps/desktop      — Electron 桌面客户端和打包
apps/server       — iPolloWork 服务端 API
apps/orchestrator — 无头运行时编排
packages          — 共享类型、组件、文档和集成
docs              — 工程笔记、平台指南和生成的报告
evals             — 可执行的产品流程和验证工具
examples          — 完整的示例插件包
scripts           — 开发、构建、审计和发布自动化
specs             — 产品和架构规格说明
```

## 三、安装与快速开始

### 下载桌面应用

官方安装包发布在 [GitHub Releases](https://github.com/Devin-AXIS/iPolloWork/releases)：

| 系统 | CPU | 安装包 |
|------|-----|--------|
| macOS | Apple Silicon (M系列) | `ipollowork-mac-arm64-<version>.dmg` |
| macOS | Intel | `ipollowork-mac-x64-<version>.dmg` |
| Windows | Intel/AMD 64位 | `ipollowork-win-x64-<version>.exe` |
| Windows | ARM64 | `ipollowork-win-arm64-<version>.exe` |
| Linux | Intel/AMD 64位 | `ipollowork-linux-x64-<version>.AppImage` |
| Linux | ARM64 | `ipollowork-linux-arm64-<version>.AppImage` |

### 源码开发环境

**前置要求：**
- Git
- Node.js 22+
- pnpm 11+（通过 `corepack enable` 启用）
- Bun 1.3.10+
- macOS 需要 Xcode Command Line Tools
- Windows 需要 Visual Studio 2022 Build Tools

```bash
# 克隆项目
git clone https://github.com/Devin-AXIS/iPolloWork.git
cd iPolloWork

# 启用 pnpm
corepack enable

# 初始化开发环境
./ipollowork setup

# 启动开发模式
./ipollowork dev
```

Windows 用户使用 PowerShell：

```powershell
git clone https://github.com/Devin-AXIS/iPolloWork.git
Set-Location iPolloWork
corepack enable
.\ipollowork.cmd setup
.\ipollowork.cmd dev
```

### 开发命令

| 用途 | macOS / Linux | Windows |
|------|---------------|---------|
| 启动桌面应用 | `./ipollowork dev` | `.\ipollowork.cmd dev` |
| 仅启动浏览器 UI | `./ipollowork dev:ui` | `.\ipollowork.cmd dev:ui` |
| 连接本地 Cloud | `./ipollowork dev:cloud http://localhost:3100` | `.\ipollowork.cmd dev:cloud http://localhost:3100` |
| 类型检查和测试 | `./ipollowork check` | `.\ipollowork.cmd check` |
| 生产构建 | `./ipollowork build` | `.\ipollowork.cmd build` |

## 四、打包与发布

### 三种构建级别

| 命令 | 结果 |
|------|------|
| `build` | 编译生产版 UI、Server、Electron 客户端和 sidecar，不创建安装包 |
| `package:dir` | 创建最快的解压版桌面应用，用于本地验证，不改变发布版本 |
| `package` | 运行检查、推进客户端版本，为当前系统和 CPU 创建原生安装包和解压包 |

```bash
# macOS / Linux
./ipollowork check
./ipollowork package:dir
./ipollowork package

# Windows PowerShell
.\ipollowork.cmd check
.\ipollowork.cmd package:dir
.\ipollowork.cmd package
```

构建产物位置 `apps/desktop/dist-electron/`：
- **macOS**：`.dmg`、`.zip`、未打包的 `.app`
- **Windows**：NSIS `.exe` 和 `win-unpacked/`
- **Linux**：`.AppImage`、`.tar.gz`、`linux-unpacked/`

## 五、常见问题

### Q: 支持中文吗？
A: 支持！项目提供简体中文、繁体中文和日语的 README 翻译。

### Q: 是否需要 iPolloCloud？
A: 不需要。iPolloWork 完全支持本地使用，可以自带模型或提供商，不需要账号即可使用。

### Q: 开发环境启动报错？
A: 确保 Node.js 版本 >= 22，pnpm 版本 >= 11，Bun 版本 >= 1.3.10。首次运行会下载 OpenCode sidecar。

### Q: Windows 开发模式下无法登录 Cloud？
A: Windows 开发构建不会自动注册 `ipollowork://` 协议处理器。测试 Cloud 登录时使用仓库的协议切换器，测试完成后恢复生产处理器。

### Q: 包管理工具的选择？
A: 项目使用 pnpm 管理 workspace，通过 Corepack 启用，确保版本 >= 11。

## 六、总结

iPolloWork 代表了一种新的 AI 协作范式——不是让 AI 生成一个静态文件然后交给用户，而是让 AI 在一个可视化工作空间中持续工作，用户可以实时检查、批准操作，并保持对结果的控制。

相比传统的 Codex/Claude Code 式的纯聊天交互，iPolloWork 的优势在于：
1. **结果始终可编辑**：不只是生成代码，还包括文档、PPT、网站、设计和视频
2. **本地优先**：数据留在本地，不需要云服务
3. **架构清晰**：Agent 执行路径和商业功能路径分离，便于定制和扩展

如果你在寻找一个开源的、AI 优先的本地工作台，iPolloWork 值得关注。开源地址：[https://github.com/Devin-AXIS/iPolloWork](https://github.com/Devin-AXIS/iPolloWork)
