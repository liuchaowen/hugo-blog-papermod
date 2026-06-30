---
title: "herdr——为 AI 编程助手打造的终端工作区管理器"
date: 2026-07-01
description: "herdr 是一款用 Rust 开发的终端工作区管理器，专为 AI 编程助手设计。它类似 tmux，但原生感知 Agent 状态，让你在一个终端里同时运行多个编程助手，实时查看谁在等待、谁在工作、谁已完成。"
author: "Cheman"
slug: herdr
draft: false
categories: ["工具", "开源"]
tags: ["GitHub", "开源", "AI", "终端", "Rust", "编程助手"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**herdr**，它为 AI 编程助手重新设计了终端复用器，让你在一个终端里同时管理多个 Agent，并实时感知每个助手的状态。

## 一、项目概述

herdr 是一个终端工作区管理器，专为 AI 编程助手（如 Claude Code、Codex、Pi 等）设计。它的核心定位是「为 Agent 重新构建的 tmux」——在一个终端里运行所有编程助手，并一目了然地看到谁被阻塞、谁在工作、谁已完成。

**核心特性：**
- 每个 Agent 拥有真实的终端（非模拟），支持全屏 TUI 正确渲染
- 侧边栏实时聚合每个 Agent 状态：🔴 阻塞、🟡 工作中、🔵 已完成、🟢 空闲
- 工作区、标签页、窗格自由组织，支持鼠标原生操作
- 后台服务器保持会话持久化，断开后可从任何终端（甚至手机 SSH）重新连接
- 单一 ~10MB Rust 二进制文件，无 GUI、无 Electron、无账号、无遥测
- 本地 Socket API + CLI，支持 Agent 自主编排

## 二、技术原理

### 架构设计

herdr 采用 Client-Server 架构：
- **Server**：后台持久化服务，管理所有工作区、标签页和窗格，保持 Agent 会话存活
- **Client**：终端 UI 客户端，通过 Unix Socket 与 Server 通信，渲染 Ratatui TUI

```rust
// Cargo.toml 关键依赖
ratatui = { version = "0.30", features = ["unstable-rendered-line-info"] }
portable-pty = { path = "vendor/portable-pty" }  //  fork 版本，修复 PTY 兼容性
interprocess = "2.4.2"  // Unix Socket 通信
tokio = { features = ["rt-multi-thread", "macros", "sync", "time"] }
```

### Agent 状态检测

herdr 通过进程名匹配 + 终端输出启发式分析，零配置检测 Agent 状态：

| 检测维度 | 实现方式 |
|---------|---------|
| Idle/Done | 进程输出静默检测 |
| Working | 终端输出活跃度分析 |
| Blocked | 特定提示符/等待模式匹配 |

支持 Claude Code、Codex、Pi、Droid、Amp、OpenCode 等 15+ 主流 AI 编程助手。

### VT 渲染引擎

herdr 内嵌了从 Ghostty 终端提取的 VT（Virtual Terminal）库，通过 Zig 编译为静态库链接：

```rust
// build.rs 中调用 Zig 构建 libghostty-vt
fn main() {
    let mut command = Command::new("zig");
    command
        .arg("build")
        .arg("-Demit-lib-vt")
        .arg(format!("-Doptimize={optimize}"))
        .arg(format!("-Dtarget={zig_target}"));
    // ...
}
```

这确保了即使全屏 TUI 应用（如 vim、top）也能正确渲染。

## 三、安装与快速开始

### 环境要求

- macOS / Linux（Windows 预览版）
- 无额外依赖，单一二进制文件

### 安装步骤

```bash
# 官方安装脚本（推荐）
curl -fsSL https://herdr.dev/install.sh | sh

# 或使用 Homebrew
brew install herdr

# 或使用 mise
mise use -g herdr

# 或从 GitHub Releases 下载稳定二进制
```

### 最简运行示例

```bash
# 启动或连接后台服务器
herdr

# 在窗格中运行 AI 助手
claude  # 或 codex、pi 等

# 快捷键操作
ctrl+b 然后 c     # 新建标签页
ctrl+b 然后 v     # 垂直分屏
ctrl+b 然后 -     # 水平分屏
ctrl+b 然后 w     # 切换工作区
ctrl+b 然后 q     # 断开连接（Agent 继续运行）
```

## 四、使用方法与实战

### 场景一：同时运行多个编程助手

```bash
herdr  # 启动 herdr

# 在窗格 1 运行 Claude Code 重构模块 A
ctrl+b 然后 v  # 分屏
# 在窗格 2 运行 Codex 编写测试
ctrl+b 然后 v  # 再分屏
# 在窗格 3 运行 Pi 做代码审查

# 侧边栏实时显示：
# 窗格 1: 🟡 工作中（Claude 正在重构）
# 窗格 2: 🔴 阻塞（等待用户输入）
# 窗格 3: 🔵 已完成（审查报告已输出）
```

### 场景二：远程开发

```bash
# 在 VPS 上运行 herdr server
ssh you@your-vps
herdr  # server 在后台启动

# 本地终端作为 client 连接
herdr --remote ssh://you@your-vps

# 即使本地断网，VPS 上的 Agent 继续运行
# 重新连接后，所有窗格状态完整恢复
```

### Agent 自主编排

herdr 提供 Socket API，Agent 可以自主创建窗格、分割屏幕、读取输出：

```bash
# 安装 Agent Skill（让 AI 助手能够控制 herdr）
npx skills add ogulcancelik/herdr --skill herdr -g
```

```json
// Socket API 示例：创建新窗格
{
  "action": "pane_create",
  "workspace_id": "main",
  "tab_id": "tab-1"
}
```

## 五、常见问题与解决方案

### 安装失败

**问题**：`curl | sh` 安装脚本执行失败。

**解决方案**：
```bash
# 检查架构支持
uname -m  # 支持 x86_64 / aarch64

# 或从 GitHub Releases 手动下载
# https://github.com/ogulcancelik/herdr/releases
```

### Agent 状态检测不准确

**问题**：某些 Agent 的状态显示不正确。

**解决方案**：
```bash
# 安装官方集成插件，提供更精确的语义状态
herdr integration install claude   # Claude Code
herdr integration install codex    # OpenAI Codex
herdr integration install pi        # Pi.dev

# 集成插件支持原生会话恢复和精确状态报告
```

### SSH 远程连接断连

**问题**：SSH 连接断开后，本地终端无法重新连接。

**解决方案**：
```bash
# 使用 --remote 参数，保持 server 端持久化
herdr --remote ssh://you@your-vps

# 配置 SSH keepalive
# ~/.ssh/config
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

###Windows 支持问题

**问题**：Windows 版本功能不完整。

**解决方案**：
- Windows 版本目前处于预览 Beta 阶段
- 建议通过 WSL2 使用 Linux 版本获得完整体验
- 或使用远程连接到 Linux/macOS 机器

## 六、总结

herdr 巧妙地填补了 tmux 与 AI 编程助手之间的空白。它不是简单的终端复用器，而是为 Agent 时代重新设计的开发环境基础设施：

1. **原生 Agent 感知**：侧边栏实时聚合状态，无需手动检查每个窗格
2. **真实终端渲染**：每个 Agent 获得真实 PTY，全屏 TUI 完美支持
3. **持久化 + 远程**：后台 Server 保持会话，SSH 断开不影响 Agent 运行
4. **可编程**：Socket API 让 Agent 能够自主管理工作区

如果你同时使用多个 AI 编程助手，或者希望让 Agent 在断开连接后继续工作，herdr 会是一个值得尝试的工具。它用 Rust 编写，性能优秀，单一二进制无依赖，开箱即用。

项目开源地址：<a href="https://github.com/ogulcancelik/herdr" target="_blank">https://github.com/ogulcancelik/herdr</a>
