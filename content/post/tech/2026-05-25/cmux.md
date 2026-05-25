---
title: "cmux：专为 AI 编码代理打造的 macOS 原生终端"
date: 2026-05-25
draft: false
categories: ["开发工具", "AI"]
tags: ["终端", "macOS", "AI编码", "Ghostty", "开源"]
description: ""
author: "Cheman"
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

## 一、项目概述

cmux 是一个基于 Ghostty 引擎构建的 macOS 原生终端应用，专门为运行 AI 编码代理（如 Claude Code、Codex）而优化。它解决了开发者在并行运行多个 AI 代理会话时的核心痛点：如何快速识别哪个代理需要你的输入确认。

传统的终端通知只能显示 "Claude is waiting for your input"，无法提供上下文信息。当打开大量标签页时，标题甚至无法完整显示。cmux 通过**通知环系统**和**垂直侧边栏**优雅地解决了这个问题——当代理等待输入时，对应的窗格会出现蓝色光环，标签页会高亮显示，让你一眼就能定位到需要关注的会话。

核心特性：
- **通知环系统**：窗格蓝色光环 + 标签高亮，精准定位待处理会话
- **内置浏览器**：可直接在应用内分屏浏览，支持脚本化 API
- **垂直侧边栏**：显示 Git 分支、PR 状态、工作目录、监听端口、最新通知文本
- **Claude Code Teams 原生支持**：一键启动队友模式，无需 tmux
- **SSH 远程工作区**：浏览器窗格自动路由远程网络，拖拽图片即可 SCP 上传
- **原生性能**：基于 Swift/AppKit 构建，非 Electron，启动快、内存占用低

## 二、技术原理

### 2.1 架构设计

cmux 的核心架构基于 Ghostty 终端引擎（libghostty），这是一个 GPU 加速的终端渲染库。项目通过 Swift 桥接头文件直接调用 Ghostty 的 C API：

```c
// cmux-Bridging-Header.h
@import GhosttyKit;
```

```c
// ghostty.h
#include "ghostty/include/ghostty.h"
```

这种设计让 cmux 能够：
1. **复用 Ghostty 的渲染管线**：获得流畅的 GPU 加速显示
2. **继承用户配置**：自动读取 `~/.config/ghostty/config` 中的主题、字体、颜色设置
3. **保持 ABI 兼容**：通过标准化 C API 确保跨版本稳定性

### 2.2 通知系统实现

cmux 的通知系统是其核心创新。它监听终端的 OSC 转义序列（OSC 9/99/777），这些是终端通知的标准协议：

```bash
# 通过 CLI 发送通知
cmux notify --title "Build Complete" --body "Tests passed"
```

通知系统的设计流程：
1. **终端序列捕获**：解析 OSC 转义序列
2. **状态持久化**：写入 `~/.cmuxterm/` 目录的会话映射
3. **UI 反馈**：触发蓝色光环动画和标签高亮
4. **快捷跳转**：`Cmd+Shift+U` 跳转到最新未读通知

### 2.3 浏览器集成

内置浏览器移植自 [agent-browser](https://github.com/vercel-labs/agent-browser)，提供脚本化 API：

```bash
# 创建工作区分屏浏览器
cmux workspace create --name "dev"
cmux split right --type browser --url "http://localhost:3000"

# 通过 socket API 自动化
cmux socket send '{"action": "snapshot_a11y"}'
```

浏览器窗格支持：
- **Cookie/历史导入**：从 Chrome、Firefox、Arc 等 20+ 浏览器导入
- **无障碍树快照**：供 AI 代理理解页面结构
- **元素操作 API**：点击、填表、执行 JS

### 2.4 Claude Code Teams 集成

`cmux claude-teams` 命令一键启动 Claude Code 的队友模式：

```bash
# 启动 Claude Code Teams
cmux claude-teams
```

底层实现：
1. 调用 Claude Code CLI 的 teammate 子命令
2. 为每个队友创建原生分屏窗格
3. 侧边栏显示队友元数据和通知状态
4. 完全替代 tmux 会话管理

## 三、安装与快速开始

### 3.1 环境要求

- macOS 12.0+（Monterey 或更高）
- 支持 Apple Silicon 和 Intel Mac

### 3.2 安装方式

**方式一：DMG 安装（推荐）**

```bash
# 下载最新版本
open "https://github.com/manaflow-ai/cmux/releases/latest/download/cmux-macos.dmg"

# 拖拽到 Applications
# 首次启动需在"系统设置 > 隐私与安全"中确认
```

**方式二：Homebrew**

```bash
brew tap manaflow-ai/cmux
brew install --cask cmux

# 更新
brew upgrade --cask cmux
```

### 3.3 Agent Hooks 配置

安装 Agent CLI 后配置通知钩子：

```bash
# 安装通用钩子
cmux hooks setup

# 安装特定代理钩子
cmux hooks setup codex
cmux hooks setup --agent opencode
```

支持的代理：Claude Code、Codex、Grok、OpenCode、Pi、Amp、Cursor CLI、Gemini、Rovo Dev、Copilot、CodeBuddy、Factory、Qoder。

## 四、使用方法与实战

### 4.1 工作区管理

```bash
# 创建新工作区
cmux workspace create --name "frontend"

# SSH 到远程机器
cmux ssh user@remote-server

# 列出工作区
cmux workspace list
```

### 4.2 分屏操作

```bash
# 右侧分屏
cmux split right

# 下方分屏
cmux split down

# 方向键切换焦点（Option+Cmd+方向键）
```

### 4.3 浏览器分屏

```bash
# 在右侧打开浏览器
cmux split right --type browser --url "http://localhost:3000"

# 或使用快捷键 Cmd+Shift+L
```

### 4.4 会话恢复

cmux 支持会话快照恢复：

```bash
# 保存位置
~/Library/Application Support/cmux/

# 手动恢复
cmux restore-session

# 或使用快捷键 Cmd+Shift+O
```

配置文件 `~/.config/cmux/cmux.json` 可关闭自动恢复：

```json
{
  "terminal": {
    "autoResumeAgentSessions": false
  }
}
```

### 4.5 自定义命令

在项目根目录创建 `cmux.json`：

```json
{
  "commands": [
    {
      "name": "Run Tests",
      "command": "npm test",
      "shortcut": "Cmd+T"
    }
  ]
}
```

通过命令面板（Cmd+P）快速执行。

## 五、常见问题与解决方案

### Q1：首次启动提示"无法验证开发者"

**原因**：macOS Gatekeeper 安全机制。

**解决**：
1. 打开"系统设置 > 隐私与安全"
2. 找到 cmux 的提示，点击"仍要打开"
3. 或右键点击应用，选择"打开"

### Q2：通知不显示或延迟

**原因**：Agent hooks 未正确安装或通知权限未授予。

**解决**：
```bash
# 重新安装 hooks
cmux hooks setup

# 检查系统通知权限
# 系统设置 > 通知 > cmux
```

### Q3：SSH 会话中浏览器窗格无法访问 localhost

**原因**：网络路由问题。

**解决**：cmux 的浏览器窗格会自动通过 SSH 隧道路由，确保使用最新版本。手动配置：

```bash
cmux ssh user@remote --tunnel-browser
```

### Q4：性能问题或内存占用高

**原因**：浏览器窗格过多或滚动缓冲区过大。

**解决**：
1. 关闭不需要的浏览器窗格
2. 在 Ghostty 配置中限制滚动缓冲区：
```
# ~/.config/ghostty/config
scrollback-limit = 10000
```

### Q5：与现有 Ghostty 配置冲突

**原因**：cmux 读取同一配置文件。

**解决**：cmux 设计为兼容 Ghostty 配置，大部分设置可直接复用。如有冲突，可在 `~/.config/cmux/cmux.json` 中覆盖。

## 六、总结

cmux 填补了 AI 编码代理工作流的终端工具空白。它不是简单的终端复用器，而是为"人类监督多个 AI 代理"这一新工作模式量身定制的工具。通过通知环系统，开发者可以同时运行数十个代理会话，而不必担心错过关键确认点。

其开源协议（GPL-3.0-or-later）和原生技术栈（Swift/AppKit + libghostty）确保了性能和可扩展性。对于重度使用 Claude Code、Codex 等 AI 编码工具的开发者，cmux 是值得尝试的生产力倍增器。

项目地址：https://github.com/manaflow-ai/cmux