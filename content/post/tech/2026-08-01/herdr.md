---
title: "Herdr：终端里的 AI Agent 多路复用器"
date: "2026-08-01"
description: "Herdr 是一款专为 AI 编程助手设计的终端多路复用器，提供实时终端视图、会话持久化、纯 Socket API 等能力，让 AI Agent 的工作流管理更加高效。"
author: "Cheman"
slug: herdr
draft: false
categories: ["技术", "开源"]
tags: ["AI", "终端", "TUI", "Rust", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Herdr**，一个专为 AI 编程 Agent 打造的终端多路复用器，让多个 Agent 的工作状态一目了然、互不干扰地并行运行。

## 一、项目概述

Herdr 的定位非常明确——解决 AI 编程助手在终端中"黑箱运行"的问题。传统方式下，你启动一个 Agent 后只能通过日志或结果输出来判断它的状态，而 Herdr 提供了真实的终端视图，每个 Agent 的执行进度一览无遗。

核心特性包括：

- **多路复用**：支持同时管理多个 AI Agent，各 Agent 在独立Pane中运行，互不干扰
- **会话持久化**：支持 detach/reattach，Agent 进程在后台持续运行，即使终端断开也不会中断
- **纯 Socket API**：Agent 可以通过 Socket 接口直接控制 Herdr（创建Pane、读取输出、互相等待），无需复杂集成
- **键盘鼠标双支持**：既支持 tmux 风格的快捷键（默认 `Ctrl+B Q` 绑定），也支持鼠标点击、拖拽、分割
- **插件系统**：支持自定义Pane和工作流，可通过 Marketplace 扩展功能
- **单二进制、无 Electron**：用 Rust 编写，安装简单，跨平台支持 macOS、Windows、Linux

## 二、技术原理

### 2.1 核心架构

Herdr 的架构核心在于 **Pane（窗格）** 和 **Session（会话）** 两大概念。从 `Cargo.toml` 中可以看到，它依赖了以下关键技术栈：

```toml
# 终端渲染层
ratatui = { version = "0.30", features = ["unstable-rendered-line-info"] }
crossterm = "0.29"

# PTY 管理（伪终端）
portable-pty = "=0.9.0"

# 进程间通信
interprocess = "2.4.2"

# 异步运行时
tokio = { version = "1", features = ["rt-multi-thread", "macros", "sync", "time"] }
```

其中 `ratatui` 负责 TUI 渲染（v0.30版本带 unstable-rendered-line-info），`crossterm` 处理终端输入，`portable-pty` 为每个 Agent 创建独立的伪终端。构建过程通过 Zig 编译 vendored 的 `libghostty-vt` 库来处理终端解析和渲染。

### 2.2 会话持久化原理

Herdr 的 detach/reattach 能力依赖于 `interprocess` 库实现命名管道（Named Pipe/FIFO）和 Unix Domain Socket，使得即便初始终端退出，Agent 进程仍可通过文件系统路径重新连接到会话。

```rust
// 核心会话管理思路（基于 Cargo.toml 推断）
tokio::sync::Mutex<pane_state>  // 每个 Pane 的状态由 tokio 异步锁保护
interprocess::unnamed_pipe()    // 创建 Agent 与 Herdr 主进程之间的通信管道
```

### 2.3 Socket API 的 Agent 间协作

Herdr 提供了纯 Socket API，Agent 之间可以实现复杂的协作模式：

- **子 Agent 派生**：一个 Agent 可以通过 Socket 请求 Herdr 创建新的 Pane 并启动另一个 Agent
- **输出订阅**：Agent 可以读取其他 Pane 的实时输出，实现跨 Agent 的状态感知
- **同步等待**：Agent 可以等待另一个 Agent 完成某个阶段后再继续

这种设计让多 Agent 协作不再需要复杂的进程间通信机制，只需连接到 Herdr 的 Socket 即可。

## 三、安装与快速开始

### 3.1 环境要求

- macOS（x86_64 / Apple Silicon）、Linux（x86_64 / aarch64）、Windows（Beta）
- 支持 Homebrew 或 curl 脚本安装

### 3.2 安装步骤

**方式一：官方安装脚本（推荐）**
```bash
curl -fsSL https://herdr.dev/install.sh | sh
```

**方式二：Homebrew**
```bash
brew install herdr
```

**方式三：mise（开发者常用）**
```bash
mise use -g herdr
```

**方式四：Windows（Beta）**
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://herdr.dev/install.ps1 | iex"
```

### 3.3 快速启动

在需要工作的目录下启动 Herdr：

```bash
herdr
```

启动后会进入 TUI 界面，首次使用默认会创建一个Pane。按 `Ctrl+B Q` 退出（detach），下次运行 `herdr` 即可重新连接（reattach）。

详细入门指南请参考官方文档：[herdr.dev/docs/quick-start](https://herdr.dev/docs/quick-start/)

## 四、使用方法与实战

### 4.1 基础操作

- `Ctrl+B Q` — 退出并保持会话（detach）
- `herdr` — 重新连接已有会话（reattach）
- 鼠标点击Pane边框拖拽调整大小
- `Ctrl+B %` / `Ctrl+B "` — 垂直/水平分割（tmux 风格）

### 4.2 AI Agent 集成

Herdr 的真正强大之处在于与 AI Agent 的深度集成。开发者只需让 Agent 连接到 Herdr 的 Socket API：

```bash
# Agent 通过 Socket 连接到 Herdr
# 官方提供了 herdr agent skill，详见：
# https://herdr.dev/docs/agent-skill/
```

### 4.3 插件使用

Herdr 支持通过插件扩展功能，浏览插件市场：[herdr.dev/plugins](https://herdr.dev/plugins/)

## 五、常见问题与解决方案

**Q：安装脚本执行失败？**
A：确保已安装 `curl`，在 macOS/Linux 上可直接使用。Windows 用户建议使用 PowerShell 方式安装。

**Q：Herdr 无法连接到已有会话？**
A：检查是否在同一台机器上运行，且工作目录一致（Herdr 按目录管理会话）。

**Q：多 Agent 之间如何通信？**
A：通过 Herdr 的 Socket API，Agent 之间可以互相创建Pane、读取输出和同步等待，无需额外部署消息队列。

**Q：Rust 源码如何编译？**
```bash
git clone https://github.com/herdrdev/herdr
cd herdr
cargo build --release
just test        # 运行单元测试
just check       # 格式化 + 测试 + 维护检查
```

## 六、总结

Herdr 填补了 AI 编程 Agent 在终端工具链上的空白。相比 tmux，它专为 Agent 场景设计，提供了原生的多 Agent 视图和 Socket API；相比简单的 `nohup` 后台运行，它保留了实时可见的交互能力。如果你经常运行多个 AI 编码助手，Herdr 是一个值得关注的新选择。

