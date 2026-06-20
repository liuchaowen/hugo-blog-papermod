---
title: "Pake：一键将网页打包成轻量桌面应用"
date: 2026-06-20
description: "Pake 是一个基于 Rust Tauri 构建的桌面应用打包工具，能将任意网页一键转换为跨平台桌面应用，体积比 Electron 小近 20 倍，支持 macOS、Windows 和 Linux。"
author: "Cheman"
slug: pake
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "Rust", "Tauri", "桌面应用", "开源"]
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
ShowRssButtonInSectionTermListList: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个有意思的项目：**Pake**，它能用一条命令将任意网页打包成桌面应用，体积只有 Electron 的 1/20，堪称网页应用桌面化的利器。

## 一、项目概述

Pake 是一个开源的桌面应用打包工具，核心理念是"用最简单的方式将网页变成桌面应用"。相比传统的 Electron 方案，Pake 基于 Rust 的 Tauri 框架构建，具有以下核心特性：

- **轻量级**：打包体积约 5MB，比 Electron 小近 20 倍
- **高性能**：Rust 底层实现，内存占用更低，启动更快
- **易用性**：一条命令即可完成打包，无需复杂配置
- **功能丰富**：支持快捷键、沉浸式窗口、拖拽、样式定制、广告去除等

Pake 支持三大主流操作系统（macOS、Windows、Linux），开发者无需维护多套代码，一次打包即可生成跨平台应用。项目由阿里前端工程师 tw93 开发维护，在 GitHub 上已获得广泛关注。

## 二、技术原理

### 架构设计

Pake 的技术架构基于 Tauri v2，这是 Rust 生态中最成熟的桌面应用框架之一。整体架构可以分为三层：

1. **WebView 层**：使用操作系统自带的 WebView 组件渲染网页内容
   - macOS：WKWebView
   - Windows：WebView2（基于 Chromium）
   - Linux：WebKitGTK

2. **Rust 后端层**：处理原生功能，如文件系统访问、系统托盘、窗口管理等

3. **前端桥接层**：通过 Tauri 的 IPC 机制实现 JavaScript 与 Rust 的通信

这种架构的优势在于：
- **原生 WebView** 直接复用系统组件，避免打包整个 Chromium
- **Rust 后端** 提供高性能、内存安全的原生能力
- **小体积运行时** 仅包含必要的桥接代码

### 核心技术栈与选型理由

从 `package.json` 可以看到 Pake 的核心依赖：

```json
{
  "name": "pake-cli",
  "version": "3.11.10",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@tauri-apps/api": "~2.10.1",
    "@tauri-apps/cli": "^2.10.0",
    "commander": "^14.0.3",
    "execa": "^9.6.1",
    "sharp": "^0.34.5"
  }
}
```

**选型分析：**

- **Tauri v2**：相比 v1 有更好的跨平台支持和性能优化，支持 edition2024
- **Commander.js**：成熟的 CLI 框架，处理命令行参数解析
- **Sharp**：高性能图片处理库，用于生成应用图标
- **Execa**：改进的子进程管理，用于调用 Rust 编译链

### 构建流程

从 `Dockerfile` 可以看到完整的构建流程：

```dockerfile
# Rust 编译阶段
FROM rust:latest AS cargo-builder
RUN rustup update stable && rustup default stable
# 安装 Linux 依赖：WebKit、GTK、OpenSSL 等
RUN apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libssl-dev

# Node.js 构建阶段
FROM rust:latest AS builder
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile && pnpm run cli:build
```

构建过程采用多阶段构建：
1. **cargo-builder**：预编译 Rust 依赖，利用缓存加速后续构建
2. **builder**：编译 Node.js CLI 并整合 Rust 二进制文件

### 图标处理机制

Pake 提供了一个实用的图标转换脚本 `icns2png.py`：

```python
from PIL import Image

for file in file_list:
    image = Image.open(icns_path)
    # 生成三种尺寸：512x512、256x256、32x32
    image_512 = image.copy().resize((512, 512))
    image_256 = image.copy().resize((256, 256))
    image_32 = image.copy().resize((32, 32))
    # PNG 用于 Linux/Windows，ICO 用于 Windows
    image_512.save(image_512_path, "PNG")
    image_256.save(image_256_path, "ICO")
```

这确保了生成的应用在不同平台都有合适的图标格式。

## 三、安装与快速开始

### 环境要求

- **Node.js** >= 18.0.0（推荐 22.x LTS）
- **Rust** >= 1.85（支持 edition2024）
- **包管理器**：pnpm（推荐）

### 安装方式

**方式一：全局安装 CLI（开发者推荐）**

```bash
# 使用 pnpm 安装
pnpm install -g pake-cli

# 或使用 npm
npm install -g pake-cli
```

**方式二：下载预编译应用（普通用户）**

直接从 GitHub Releases 下载已打包好的热门应用，如微信读书、Twitter、ChatGPT、DeepSeek 等。

### 最简使用示例

```bash
# 基础用法 - 自动抓取网站图标
pake https://github.com --name GitHub

# 高级用法 - 自定义图标和窗口尺寸
pake https://weekly.tw93.fun \
  --name Weekly \
  --icon https://cdn.tw93.fun/pake/weekly.icns \
  --width 1200 \
  --height 800 \
  --hide-title-bar
```

首次打包需要编译 Rust 代码，耗时较长；后续构建会复用缓存，速度大幅提升。

## 四、使用方法与实战

### 基础用法

**1. 打包任意网站**

```bash
pake <url> --name <app-name>
```

Pake 会自动：
- 抓取网站的 favicon 作为应用图标
- 生成默认窗口配置
- 构建跨平台安装包

**2. 自定义图标**

```bash
pake https://twitter.com --name Twitter \
  --icon ./twitter-icon.png
```

支持 PNG、ICNS（macOS）、ICO（Windows）等格式。

**3. 调整窗口属性**

```bash
pake https://youtube.com --name YouTube \
  --width 1280 \
  --height 720 \
  --transparent \
  --resizable
```

### 进阶用法

**1. 沉浸式窗口**

隐藏标题栏，打造类似原生应用的体验：

```bash
pake https://notion.so --name Notion \
  --hide-title-bar \
  --transparent
```

**2. 注入自定义样式**

通过 `--inject-css` 注入自定义 CSS：

```bash
pake https://example.com --name MyApp \
  --inject-css ./custom.css
```

可以用来隐藏广告、调整布局、修改主题等。

**3. GitHub Actions 在线构建**

无需本地环境，直接在 GitHub 上构建：

1. Fork Pake 仓库
2. 在 Actions 页面选择 "Build App"
3. 输入目标 URL 和应用名
4. 等待构建完成，下载安装包

### 内置快捷键

Pake 为所有打包的应用内置了丰富的快捷键：

| 功能 | macOS | Windows/Linux |
|------|-------|---------------|
| 后退 | ⌘ + [ | Ctrl + ← |
| 前进 | ⌘ + ] | Ctrl + → |
| 刷新 | ⌘ + R | Ctrl + R |
| 缩放 | ⌘ + +/- | Ctrl + +/- |
| 复制 URL | ⌘ + L | Ctrl + L |
| 清除缓存 | ⌘ + ⇧ + ⌫ | Ctrl + ⇧ + Del |

### 热门预打包应用

Pake 官方提供了多款热门应用的预编译版本：

- **生产力工具**：ChatGPT、DeepSeek、Grok、Gemini、Claude
- **社交媒体**：Twitter、小红书、即刻
- **内容消费**：微信读书、YouTube、YouTube Music
- **工具类**：Excalidraw、语雀

直接从 Releases 页面下载对应平台的安装包即可使用。

## 五、常见问题与解决方案

### 安装失败

**问题：Rust 版本过低**

```
error: Rust 1.85 required, found 1.70
```

**解决方案：**

```bash
# 更新 Rust 到最新稳定版
rustup update stable
rustup default stable
```

**问题：Linux 缺少系统依赖**

```
error: Package 'webkit2gtk-4.1' not found
```

**解决方案：**

```bash
# Ubuntu/Debian
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Fedora
sudo dnf install \
  webkit2gtk4.1-devel \
  gtk3-devel \
  libappindicator-gtk3-devel
```

### 运行时错误

**问题：macOS 提示"无法验证开发者"**

```
"App" is damaged and can't be opened.
```

**解决方案：**

```bash
# 移除隔离属性
xattr -cr /Applications/YourApp.app
```

或在系统设置中允许第三方应用。

**问题：Windows SmartScreen 拦截**

点击"更多信息" → "仍要运行"，或使用代码签名证书签名应用。

### 性能问题

**问题：首次打包时间长**

首次构建需要编译 Rust 代码，可能需要 5-10 分钟。建议：
- 使用 SSD
- 确保网络畅通（需下载 Rust crates）
- 后续构建会复用缓存，时间大幅缩短

**问题：应用内存占用高**

Pake 应用内存占用通常在 100-300MB，远低于 Electron（通常 500MB+）。如果仍然过高：
- 检查网页本身是否内存泄漏
- 使用 `--disable-gpu` 禁用硬件加速

### 兼容性

**支持的平台：**
- macOS 10.15+
- Windows 10/11（需要 WebView2 运行时，Win11 已内置）
- Linux（需要 WebKitGTK）

**不支持的场景：**
- 需要复杂原生功能的场景（建议直接开发 Tauri 应用）
- 需要系统级权限的应用
- 需要后台常驻的服务（Pake 应用关闭后完全退出）

## 六、总结

Pake 是一个优雅的"网页桌面化"解决方案，它巧妙地结合了 Rust 的性能优势和 WebView 的轻量特性，让开发者能够用一条命令将任意网页变成原生体验的桌面应用。

相比 Electron，Pake 的体积优势显著（5MB vs 100MB+），内存占用更低，启动更快。相比原生开发，Pake 的学习成本几乎为零——只要你有一个网页，就能拥有一个桌面应用。

无论是开发者想要为自己的 Web 应用提供桌面版本，还是普通用户想要将常用网站变成独立应用，Pake 都是一个值得尝试的选择。项目的开源特性和活跃的社区支持，也让它成为学习 Tauri 和 Rust 桌面开发的优秀范例。

**GitHub 地址：** https://github.com/tw93/Pake
