---
title: "OpenCut：一套代码跨三端，开源视频编辑器进入 Rust 时代"
date: "2026-07-13"
description: "OpenCut 是一个完全重写的开源视频编辑器，基于 Rust 核心实现 Web、桌面和移动端三端合一，内置插件架构、MCP 服务器和自动化批量渲染能力。"
author: "Cheman"
slug: opencut
draft: false
categories: ["技术", "开源"]
tags: ["开源", "视频编辑", "Rust", "跨平台", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenCut**，一个正在从零重写的开源视频编辑器，目标是同时覆盖 Web、桌面和移动端三个平台，而实现这一切的底层核心是 Rust。

## 一、项目概述

OpenCut 脱胎于经典的 [opencut-classic](https://github.com/opencut-app/opencut-classic)，当前正在经历一次彻底的重构。新版的核心设计理念是"**一个代码库，多端运行**"，而不是维护多套代码分支。

主要特性：

- **Rust 核心**：底层渲染和媒体处理使用 Rust，保证性能和安全
- **插件优先架构**：内置 Editor API，支持第三方插件扩展
- **三端合一**：Web（浏览器）、Desktop（桌面应用）、Mobile（移动端）共用同一核心
- **MCP 服务器**：为 AI Agent 提供编程接口，可自动化操控编辑器
- **Headless 模式**：无需 GUI，适合自动化任务和批量渲染
- **内置脚本标签**：编辑器内可直接写脚本

目前的访问入口：[opencut.app](https://opencut.app) 仍运行经典版；新版开发进展可在 [new.opencut.app](https://new.opencut.app) 查看。

## 二、技术原理

### 架构设计

OpenCut 的架构核心依赖 Rust 的跨平台能力和 [gpui](https://github.com/zed-industries/gpui)——同 Zed 编辑器同款的 UI 框架。以下是 workspace 配置文件 `Cargo.toml` 中的核心依赖声明：

```toml
[workspace]
resolver = "3"
members = [
  'apps/desktop',
]

[workspace.package]
version = "0.1.0"
edition = "2024"
license = "MIT"

[workspace.dependencies]
gpui = "0.2.2"
```

gpui 框架让 OpenCut 天然具备跨平台渲染能力，这是 Zed 编辑器（VSCode 竞品）背后的同款技术栈。相比 Electron 方案，gpui 直接调用原生系统 API，省去了 WebView 的性能损耗。

### 插件系统设计

新版 OpenCut 的插件优先架构意味着整个编辑器围绕插件 API 构建。开发者可以通过 Editor API 向编辑器注入自定义功能，类似于 VSCode 的 Extensions 模式。由于项目目前尚未开放外部贡献，此架构的更多细节还有待代码库公开后深入分析。

### MCP 服务器集成

MCP（Model Context Protocol）服务器让 AI Agent 能够以编程方式控制 OpenCut。这意味着可以用 AI 脚本驱动视频渲染、批量处理、自动化剪辑等任务，是 AI 工作流与传统视频编辑工具结合的有益探索。

## 三、安装与快速开始

### 环境要求

- [proto](https://moonrepo.dev/proto)（类似 mise 的 Rust 工具链管理器）
- Rust 工具链（由 proto 自动管理）
- 支持的操作系统（桌面端）：macOS、Windows、Linux

### 安装步骤

```sh
# 安装 proto（类 mise 工具链管理）
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)

# 克隆仓库
git clone https://github.com/OpenCut-app/OpenCut.git
cd OpenCut

# 使用 proto 安装项目依赖
proto use
```

### 启动开发服务

```sh
# 启动 Web 版（localhost:5173）
moon run web:dev

# 启动 API 服务（localhost:8787）
moon run api:dev

# 启动桌面版
moon run desktop:dev
```

注意：moon 是 moonrepo 出品的任务运行器，类似 npm scripts 但支持跨语言工具链统一管理，proto use 会自动安装 .prototools 中锁定的版本。

## 四、使用方法与实战

### 基础用法

当前正式版仍在 opencut.app 运行经典版，可直接访问使用。如需体验新版，需按上方步骤启动本地开发服务。

### Headless 模式（自动化渲染）

新版提供的 Headless 模式非常适合批量渲染场景，无需启动 GUI：

```sh
# 示例：批量渲染指定项目（待 MCP API 完善后可用）
moon run headless --input ./projects/video1.json --output ./renders/
```

### AI Agent 集成

MCP 服务器暴露的接口让 AI Agent 能够：

- 自动分析视频素材并生成剪辑脚本
- 批量执行预设的渲染任务
- 通过自然语言指令驱动编辑器行为

这代表了视频编辑工具向 AI Native 方向演进的趋势。

## 五、常见问题与解决方案

**Q: proto use 报错找不到命令？**

> 确保 proto 安装成功，可运行 `proto --version` 验证。如仍有问题，按官方文档执行完整安装脚本。

**Q: moon run web:dev 启动失败？**

> 检查 .prototools 文件是否存在，以及本地 Rust 版本是否满足 edition = "2024" 要求（需要较新的 Rust  nightly 或 stable）。

**Q: 桌面版构建需要额外依赖吗？**

> 桌面版目前位于 apps/desktop workspace 成员，详细说明请参阅 `apps/desktop/README.md`。

**Q: 如何跟踪新版开发进度？**

> 加入 [Discord 社区](https://discord.gg/zmR9N35cjK)或关注 [@opencutapp](https://x.com/opencutapp)，团队会在这些渠道同步重构进展。

## 六、总结

OpenCut 代表了开源视频编辑工具的一次雄心勃勃的升级：从 Electron/Web 的传统路线，转向 Rust + gpui 的高性能跨平台架构，一套代码覆盖 Web、桌面和移动三端。同时引入插件系统和 MCP 服务器，为 AI 自动化留出了接口。

虽然目前仍在重构中，尚未开放外部贡献，但其技术选型和架构设计值得关注。如果你是跨平台应用开发者或对 Rust 在创意工具领域的应用感兴趣，OpenCut 是一个值得 Watch 的项目。
