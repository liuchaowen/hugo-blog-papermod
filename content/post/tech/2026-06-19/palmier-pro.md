---
title: "Palmier Pro：为 AI 而生的开源视频编辑器，支持 MCP 协议与 Agent 协作"
date: 2026-06-19
description: "深入解析 Palmier Pro 这款专为 AI 工作流设计的开源视频编辑器，探讨其 Swift 原生架构、内置生成式 AI 能力以及通过 MCP 协议与 Claude Code/Cursor 等 Agent 深度集成的技术实现。Y Combinator S24 孵化项目。"
author: "Cheman"
slug: palmier-pro
draft: false
categories: [AI工具, 开源项目]
tags: [GitHub, 开源, AI, 视频编辑, MCP, Swift, macOS]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Palmier Pro**，一款为 AI 工作流量身打造的开源 macOS 视频编辑器，支持通过 MCP 协议让 Claude Code、Cursor 等 AI Agent 直接操作时间线进行视频创作。

## 一、项目概述

Palmier Pro 是由 Y Combinator S24 孵化的开源视频编辑器，运行在 macOS 26 (Tahoe) 及 Apple Silicon 平台上。它与传统视频编辑器的核心区别在于：**从架构层面将 AI 作为一等公民集成到创作流程中**。

核心特性包括：

- **Swift 原生编辑器**：从零构建，对标 Premiere Pro 的专业级时间线编辑体验
- **内置生成式 AI**：支持 Seedance、Kling、Nano Banana Pro 等前沿模型，直接在时间线中生成视频和图像
- **MCP 协议集成**：暴露 HTTP MCP Server，让 Claude Code、Codex、Cursor 等 Agent 能直接操控项目

## 二、技术原理

### 架构设计

Palmier Pro 采用纯 Swift 原生架构，基于 Swift Package Manager 构建，最低平台要求 macOS 26。从 `Package.swift` 可以看出其模块化设计：

```swift
// swift-tools-version: 6.2
let package = Package(
    name: "PalmierPro",
    platforms: [.macOS(.v26)],
    dependencies: [
        .package(url: "https://github.com/modelcontextprotocol/swift-sdk.git", from: "0.11.0"),
        .package(url: "https://github.com/huggingface/swift-transformers", from: "1.3.3"),
        .package(url: "https://github.com/clerk/clerk-convex-swift", from: "0.1.0"),
        // ...
    ]
)
```

### 核心技术栈

| 依赖 | 用途 |
|------|------|
| `swift-sdk (MCP)` | MCP 协议通信，Agent 集成核心 |
| `swift-transformers` | HuggingFace Tokenizers，本地模型推理支持 |
| `DSWaveformImage` | 音频波形可视化渲染 |
| `Sparkle` | macOS 自动更新框架 |
| `Clerk + Convex` | 用户认证与云后端同步 |
| `Sentry` | 错误监控与崩溃上报 |
| `Lottie` | 动画资源渲染 |

### MCP Server 机制

当应用启动时，Palmier Pro 在本地暴露一个 HTTP MCP Server：

```
http://127.0.0.1:19789/mcp
```

这使得外部 AI Agent 可以通过标准 MCP 协议与编辑器交互。连接方式覆盖了主流开发工具：

```bash
# Claude Code
claude mcp add --transport http palmier-pro http://127.0.0.1:19789/mcp

# Codex
codex mcp add palmier-pro --url http://127.0.0.1:19789/mcp
```

对于 Cursor，应用还提供了 `mcpb`（MCP Bundle）一键安装能力，通过 `Help -> MCP Instructions -> Install in Cursor` 即可自动配置 `~/.cursor/mcp.json`。

### 开源与闭源的边界

项目采用分层开源策略：
- ✅ **完全开源**：视频编辑器核心、MCP Server、Agent Chat
- 🔒 **闭源**：生成式 AI 处理模块（需要登录和订阅）

这种设计既保证了核心工具的开放性，又为商业变现保留了空间。

## 三、安装与快速开始

### 环境要求

- macOS 26 (Tahoe) 及以上
- Apple Silicon (M1/M2/M3/M4) 芯片
- **不支持 Intel Mac 和其他平台**

### 安装步骤

1. 从 GitHub Releases 下载 DMG：

```bash
# 下载最新版本
curl -L -o PalmierPro.dmg \
  https://github.com/palmier-io/palmier-pro/releases/latest/download/PalmierPro.dmg
```

2. 挂载并安装：

```bash
hdiutil attach PalmierPro.dmg
cp -R /Volumes/PalmierPro/PalmierPro.app /Applications/
```

3. 首次启动后，即可作为普通视频编辑器使用，无需登录。

### 连接 AI Agent

启动应用后，MCP Server 自动运行。以 Claude Code 为例：

```bash
claude mcp add --transport http palmier-pro http://127.0.0.1:19789/mcp
```

之后就可以在 Claude Code 中直接操作视频时间线了。

## 四、使用方法与实战

### 基础用法：作为视频编辑器

Palmier Pro 本身是一个功能完整的视频编辑器，可以像 CapCut 或 Premiere 一样手动剪辑视频。免费且无需登录。

### 进阶用法：AI 生成内容

在时间线中直接调用生成式 AI 模型（需订阅）：

- 使用 Seedance 生成视频片段
- 使用 Kling 创建转场动画
- 使用 Nano Banana Pro 生成图像素材

### 实战：Agent 驱动的视频创作

最具革命性的工作流是让 AI Agent 接管创作过程：

1. 启动 Palmier Pro，确保 MCP Server 运行
2. 在 Claude Code 中描述你想要的视频效果
3. Agent 通过 MCP 协议操作时间线，添加片段、调整转场、生成素材
4. 人工审核并微调结果

这种**人机协作**模式让视频创作的效率提升了一个量级。

## 五、常见问题与解决方案

### macOS 版本不兼容

**问题**：提示需要 macOS 26，当前系统版本较低。

**解决**：Palmier Pro 使用了 macOS 26 的全新 API，目前不支持降级。需要升级系统或等待后续版本兼容。

### MCP 连接失败

**问题**：Agent 无法连接到 `http://127.0.0.1:19789/mcp`。

**解决**：
- 确认 Palmier Pro 应用已打开且在前台运行
- 检查端口 19789 是否被占用：`lsof -i :19789`
- 检查防火墙设置是否阻止了本地回环连接

### 生成式 AI 功能不可用

**问题**：无法使用视频生成功能。

**解决**：生成式 AI 功能需要登录并订阅，这是项目中唯一闭源的付费部分。基础的编辑功能和 MCP Server 完全免费。

### Intel Mac 无法运行

**问题**：下载后无法启动。

**解决**：目前仅支持 Apple Silicon，Intel Mac 用户需等待官方适配。

## 六、总结

Palmier Pro 代表了视频编辑工具的一个重要方向——**AI-Native 设计**。它不是在传统编辑器上叠加 AI 功能，而是从架构层面让 AI Agent 成为创作的平等参与者。MCP 协议的深度集成使得 Claude Code、Cursor 等工具可以直接操控视频时间线，这种 Agent-Editor 协作模式在开源社区中尚属首创。

虽然目前仅支持 macOS 26 + Apple Silicon 的硬件门槛较高，但其在 AI 与专业工具融合方向上的探索值得持续关注。对于 macOS 开发者和 AI 工作流爱好者来说，这是一个不容错过的项目。

项目地址：[https://github.com/palmier-io/palmier-pro](https://github.com/palmier-io/palmier-pro)
