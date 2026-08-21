---
title: "terminal-browser：在终端里跑浏览器的奇思妙想"
date: 2026-08-21
description: "terminal-browser 是一个把完整 Chromium 浏览器嵌入终端的项目，借助 kitty graphics 协议在终端窗口内渲染像素，配合 Electron offscreen rendering 实现零延迟的终端浏览器体验。"
author: "Cheman"
slug: terminal-browser
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "终端", "浏览器", "Electron", "Rust"]
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

今天在 GitHub Trending 上看到一个脑洞非常大的项目：**terminal-browser**，它把一个完整的 Chromium 浏览器直接嵌入了你的终端窗口，让你在命令行里也能上网冲浪。这个想法听起来有点反常识——浏览器和终端，明明是两个世界的东西，怎么就凑到一起了？

## 一、项目概述

terminal-browser 由 [zenbu-labs](https://github.com/zenbu-labs/terminal-browser) 开发，核心目标是用终端的图形协议渲染真实网页，实现"在终端里开浏览器"的体验。它不是一个模拟器或文本浏览器，而是一个货真价实的 GUI 浏览器，只不过输出载体换成了支持 kitty graphics 协议的终端。

目前支持以下终端：

- **ghostty**（macOS 原生终端，高性能）
- **kitty**（跨平台 GPU 加速终端）
- **cmux**（终端复用器）
- **VSCode 集成终端**

核心特性一览：

- 完整 Chromium 内核，渲染效果与桌面浏览器一致
- 支持 SSH 远程代理，可访问远程机器的 localhost 网站
- 开发者工具（F12 / cmd+shift+i）
- 命令面板（cmd+p / cmd+k）
- 分屏模式（`--split right`）
- App Mode：用浏览器技术构建终端 App

安装方式极其简单：

```bash
curl -fsSl https://terminal-browser.sh/install | bash
```

使用方式同样直观：

```bash
terminal-browser              # 直接启动浏览器
terminal-browser open <url>   # 打开指定网址
terminal-browser --split right  # 在右侧分屏打开
terminal-browser open --ssh user@host <url>  # SSH 代理访问远程网站
terminal-browser ls           # 列出当前打开的浏览器实例
```

## 二、技术原理

### 2.1 整体架构

terminal-browser 的架构分为三层，从下到上依次是：

**Layer 1 — Electron Offscreen Rendering（浏览器渲染层）**
terminal-browser 使用 Electron 的 [Offscreen Rendering API](https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering)，直接在 GPU 上渲染 Chromium 页面，而不创建传统意义上的窗口。像素数据从 GPU 显存直接读取，完全绕过了系统窗口管理器。

```javascript
// 核心渲染逻辑（简化自源码）
const { app, BrowserWindow } = require('electron');

app.on('ready', () => {
  const win = new BrowserWindow({
    webPreferences: {
      offscreen: true,  // 关键：开启 offscreen 模式
    }
  });
  win.loadURL('https://example.com');
  // 像素由 Electron 自动渲染到离屏画布
});
```

**Layer 2 — Rust 图形引擎（像素传输层）**
渲染出的像素通过 Rust 编写的图形引擎传输到终端。引擎的核心职责是：

1. 从 Electron 读取 GPU 渲染的像素帧
2. 将像素编码为 kitty graphics 协议的数据块
3. 通过终端的图形协议将像素绘制到屏幕上

kitty graphics 协议是一种将二进制图像数据嵌入终端输出的协议。协议支持 PNG/RGBA 格式，terminal-browser 使用 RGBA 直接传输像素：

```
# kitty graphics protocol 简化示意
\x1b_G...<image data>...\x1b\\ 
```

**Layer 3 — React UI + Swift 输入捕获（交互层）**
浏览器外壳的 UI（地址栏、标签栏、工具栏）使用 React 实现，通过自定义 React Renderer 直接绘制到 Rust 引擎的共享 Canvas 上。

用户输入（键盘、鼠标、触控）的捕获则是一个难点——终端本身并不能捕获所有输入事件（如触控板滚动）。terminal-browser 通过一个后台 Swift App 来全局监听输入事件，再转发给 Chromium：

```
终端输入事件 → Rust 引擎 → Electron Chromium (synthetic events)
                                      ↑
Swift 后台 App 监听系统级输入 → 转发到 Electron
```

### 2.2 SSH 远程代理的实现

SSH 模式是 terminal-browser 的一大亮点。常规 SSH X11 转发的问题是：每个像素帧都要通过网络传输，体验很差。

terminal-browser 的 SSH 模式采用**本地渲染 + 远程请求代理**的策略：

```bash
terminal-browser --ssh user@host <url>
```

工作原理：

1. Chromium 浏览器实例在**本地**运行并渲染
2. 网页发出的所有 HTTP/HTTPS 请求通过 SSH 隧道代理到远程服务器
3. 远程服务器充当代理，访问本地无法访问的资源（如远程 dev 环境）

这样一来，localhost、远程内网服务都可以在本地浏览器中完美呈现，同时保留了 Chromium 的完整渲染能力。

### 2.3 App Mode：从浏览器到终端 App

terminal-browser 的 App Mode 让它变成了一个用浏览器技术构建终端应用的框架：

```bash
terminal-browser open https://my-app.com \
  --app-mode \
  --no-toolbar \
  --no-frame \
  --allow-clipboard-read
```

结合 `--preload`（注入自定义 JavaScript API）和 `--main-script`（Node.js 主进程脚本），可以实现：

- 与终端命令行深度集成的 Web 应用
- 使用 Web 技术栈开发的终端原生 UI

## 三、安装与快速开始

### 环境要求

- macOS 或 Linux
- 支持 kitty graphics 协议的终端（推荐 ghostty 或 kitty）
- Node.js（用于 Electron）
- Rust（用于图形引擎编译）
- pnpm

### 安装步骤

官方一键安装脚本（自动检测平台并安装依赖）：

```bash
curl -fsSl https://terminal-browser.sh/install | bash
```

手动安装（macOS）：

```bash
brew install rustup
rustup-init
brew install node pnpm
git clone https://github.com/zenbu-labs/terminal-browser
cd terminal-browser
pnpm install
pnpm build
```

### 快速体验

```bash
# 启动浏览器
terminal-browser

# 打开指定网站
terminal-browser open https://github.com

# 分屏模式（左侧终端，右侧浏览器）
terminal-browser --split right

# SSH 代理访问远程 localhost
terminal-browser open --ssh myserver.com http://localhost:3000

# 命令面板
# macOS: cmd+p / Linux: ctrl+k
```

## 四、使用场景与实战

### 场景一：AI Agent 的浏览器工具

这是作者最看重的使用场景之一。将 terminal-browser 与 AI 编程 Agent 配合：

```bash
# 在终端左侧启动 Agent，右侧启动浏览器
terminal-browser --split right
```

Agent 可以通过 CLI 接口控制浏览器：

```bash
terminal-browser action open https://example.com
terminal-browser action click .btn-submit
terminal-browser action type #search "hello world"
```

这意味着 AI Agent 可以直接操控真实的浏览器，与传统基于文本解析的方案相比，准确率大幅提升。

### 场景二：远程开发预览

开发者通常需要预览远程服务器上跑的服务：

```bash
# 远程开发服务器跑在 myserver:8080，本地通过 SSH 代理预览
ssh -L 8080:localhost:8080 myserver &
terminal-browser open http://localhost:8080
```

### 场景三：终端 App 开发

用 Web 技术栈开发终端原生应用：

```bash
terminal-browser open ./dist/index.html \
  --app-mode \
  --no-toolbar \
  --preload=./preload.js
```

## 五、常见问题与解决方案

### Q1: 终端不支持 kitty graphics 协议怎么办？

terminal-browser 依赖 kitty graphics 协议发送像素帧。如果你的终端不支持该协议，浏览器窗口将无法显示。建议改用 **ghostty**（macOS，推荐）或 **kitty**（跨平台）。

```bash
# 检查终端是否支持 kitty graphics
# 在 kitty 终端中运行以下命令，如果有图像输出则支持
printf '\x1b_Gi=1\x1b\\'
```

### Q2: SSH 模式下网页加载很慢？

确保使用 `--ssh` 参数而不是直接 SSH X11 转发。本地渲染 + 远程请求代理的模式可以大幅降低延迟。如果仍然慢，检查网络带宽和 SSH 连接质量。

### Q3: 触控板滚动不工作？

默认情况下终端无法捕获触控板事件。terminal-browser 通过 Swift 后台 App 监听系统级触控事件来解决这个问题。如果滚动仍然有问题，检查系统设置中是否授权了终端的辅助功能权限。

### Q4: 浏览器字体太小？

使用终端自身的缩放快捷键（ghostty: cmd+=/cmd+-，kitty: ctrl+shift+T/K）调整缩放级别，terminal-browser 会自动适配。

### Q5: 如何自定义 App Mode 的主题？

通过 `--preload` 脚本访问 `globalThis.terminalBrowser` API：

```javascript
// preload.js
window.addEventListener('DOMContentLoaded', () => {
  if (globalThis.terminalBrowser) {
    globalThis.terminalBrowser.onTheme((theme) => {
      document.body.style.background = `rgb(${theme.background.join(',')})`;
    });
  }
});
```

## 六、总结

terminal-browser 是一个非常有意思的跨界项目——它不是简单地把浏览器塞进终端，而是用浏览器技术重新定义终端的边界。借助 Electron Offscreen Rendering + kitty graphics 协议 + Rust 图形引擎的三层架构，它实现了在终端里运行真实浏览器的目标，而且体验相当流畅。

最令人眼前一亮的应用场景是 AI Agent + 浏览器工具链：让 AI 直接操控真实浏览器访问网页，比任何文本解析方案都更可靠。随着 AI 编程工具的普及，这个方向可能会成为 terminal-browser 最有价值的落地点。

项目仍在活跃开发中（Roadmap 包括 Chrome 扩展支持和 Design Mode），如果你对终端图形化或 AI + 浏览器方向感兴趣，非常值得一试。
