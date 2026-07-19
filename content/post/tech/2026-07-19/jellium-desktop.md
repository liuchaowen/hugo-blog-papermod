---
title: "Jellium Desktop：基于 CEF 和 mpv 的 Jellyfin 桌面客户端"
date: 2026-07-19
description: "Jellium Desktop 是一款非官方的 Jellyfin 桌面客户端，采用 Chromium Embedded Framework (CEF) 渲染界面、mpv 作为媒体播放器，跨平台支持 Linux、macOS 和 Windows，提供原生桌面级的媒体流媒体播放体验。"
author: "Cheman"
slug: jellium-desktop
draft: false
categories: ["技术", "开源"]
tags: ["Jellyfin", "桌面应用", "CEF", "mpv", "媒体播放器", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Jellium Desktop**，一款非官方的 Jellyfin 桌面客户端，通过 CEF + mpv 组合实现了跨平台的媒体流媒体播放体验。

## 一、项目概述

Jellium Desktop 是一个非官方的 [Jellyfin](https://jellyfin.org) 桌面客户端，专为追求更流畅、更低延迟播放体验的用户设计。项目采用 [CEF (Chromium Embedded Framework)](https://github.com/chromiumembedded/cef) 作为 UI 渲染引擎，结合高性能媒体播放器 [mpv](https://mpv.io) 处理音视频播放，为 Jellyfin 用户提供原生桌面级的体验。

**核心特性：**
- 跨平台支持：Linux（AppImage、AUR、Flatpak）、macOS（Apple Silicon / Intel）、Windows（x64 / arm64）
- 高性能播放：基于 mpv 的硬件解码，支持各种视频格式
- 原生体验：独立桌面应用，无需浏览器标签页切换
- 自动化构建：通过 GitHub Actions 提供 nightly 构建版本

## 二、技术原理

### 架构设计

Jellium Desktop 采用双层架构设计：

```
┌─────────────────────────────────────┐
│         Jellium Desktop App         │
├─────────────────────────────────────┤
│   CEF (Chromium Embedded Framework) │ ← UI 渲染层：Jellyfin Web UI
├─────────────────────────────────────┤
│           mpv Player                │ ← 媒体播放层：音视频解码
├─────────────────────────────────────┤
│         System APIs                 │ ← 系统集成：窗口管理、硬件加速
└─────────────────────────────────────┘
```

### 核心技术栈与选型理由

**1. CEF (Chromium Embedded Framework)**

CEF 提供 Chromium 的完整渲染能力，允许将 Jellyfin 的 Web UI 嵌入到原生桌面应用中。相比 Electron，CEF 更轻量、启动更快，且支持更精细的控制。

**2. mpv 播放器**

mpv 是一款命令行媒体播放器，以高性能、低资源占用著称。主要优势：
- 支持硬件解码（GPU 加速）
- 几乎支持所有视频/音频格式
- 可通过脚本和配置文件高度定制
- 跨平台一致性好

**3. Rust 构建系统**

项目使用 Rust 编写构建脚本和打包工具，配合 `just` 命令运行器，实现跨平台构建流程的统一管理：

```bash
Available recipes:
    [package]
    appimage ...    # [linux] build AppImage
    flatpak ...     # [linux] build Flatpak bundle
    dmg             # [macos] build Apple Disk Image (.dmg)

    [build]
    build           # Build the app

    [run]
    run *args       # Run the app
    run-mpv *args   # Run the mpv CLI
```

### 数据流分析

```
用户操作 → CEF UI 层 → Jellyfin Server API → 返回媒体流 URL
                                              ↓
用户观看 ← mpv 解码渲染 ← 获取媒体流 ← 直连媒体文件/转码流
```

这种架构将 UI 与播放分离，CEF 仅处理 Jellyfin Web 界面的渲染，媒体播放由 mpv 独立处理，避免了浏览器内置播放器的性能瓶颈。

## 三、安装与快速开始

### 环境要求

- Linux / macOS / Windows 操作系统
- 已部署 Jellyfin Server 并可访问
- 对于开发构建：Rust 工具链、just 命令运行器

### 安装步骤

**Linux**

```bash
# AppImage 方式（推荐，免安装）
# x86_64
wget https://nightly.link/andrewrabert/jellium-desktop/workflows/build-linux-appimage/main/linux-appimage-x86_64.zip
unzip linux-appimage-x86_64.zip
chmod +x Jellium_Desktop-*.AppImage
./Jellium_Desktop-*.AppImage

# Arch Linux（AUR）
yay -S jellium-desktop-git
```

**macOS**

```bash
# Apple Silicon (M1/M2/M3)
wget https://nightly.link/andrewrabert/jellium-desktop/workflows/build-macos/main/macos-arm64.zip
unzip macos-arm64.zip

# 安装后移除隔离属性
sudo xattr -cr /Applications/Jellium\ Desktop.app
```

**Windows**

```powershell
# 下载 x64 版本
Invoke-WebRequest -Uri "https://nightly.link/andrewrabert/jellium-desktop/workflows/build-windows/main/windows-x64.zip" -OutFile "jellium-desktop.zip"
Expand-Archive jellium-desktop.zip -DestinationPath .
```

### 最简运行示例

1. 启动 Jellium Desktop
2. 首次运行会提示输入 Jellyfin Server 地址（如 `http://192.168.1.100:8096`）
3. 登录你的 Jellyfin 账户
4. 选择媒体即可开始播放

## 四、使用方法与实战

### 基础用法

启动应用后会显示 Jellyfin 的标准 Web UI，操作与浏览器版本一致：
- 浏览媒体库
- 播放视频/音乐
- 管理播放列表
- 查看元数据

### 进阶用法

**自定义 mpv 配置**

由于底层使用 mpv，可以通过 mpv 配置文件自定义播放行为：

```bash
# ~/.config/mpv/mpv.conf
vo=gpu
hwdec=auto-safe
profile=gpu-hq
scale=ewa_lanczossharp
```

**命令行参数**

```bash
# 直接运行（开发模式）
./jellium-desktop --url http://your-jellyfin-server:8096

# 使用 mpv CLI 调试
mpv --profile=jellium http://stream-url
```

### 实际项目示例

**场景：家庭媒体中心**

在家庭网络中部署 Jellyfin Server + Jellium Desktop 组合：
- Server 部署在 NAS 或家庭服务器
- 各终端（客厅 PC、书房 Mac、卧室笔记本）安装 Jellium Desktop
- 统一的媒体库界面 + 高性能本地播放
- 避免了浏览器占用大量内存的问题

**场景：远程访问**

Jellium Desktop 支持 HTTPS 连接，可通过 VPN 或反向代理访问远程 Jellyfin Server：

```bash
# 通过 SSH 隧道访问远程服务器
ssh -L 8096:localhost:8096 user@remote-server
# Jellium Desktop 连接 http://localhost:8096
```

## 五、常见问题与解决方案

### 安装失败

**问题：macOS 提示"无法验证开发者"**

解决方案：
```bash
sudo xattr -cr /Applications/Jellium\ Desktop.app
```

这是由于应用未经过 Apple 公证，需要手动移除隔离属性。

**问题：Linux AppImage 无法运行**

检查依赖：
```bash
# 查看缺失库
ldd Jellium_Desktop-*.AppImage
# 安装缺失依赖
sudo apt install libfuse2  # Ubuntu/Debian
```

### 运行时错误

**问题：视频无法播放或黑屏**

可能原因：
1. 硬件解码不支持当前格式
2. mpv 配置冲突

解决方案：
```bash
# 禁用硬件解码测试
mpv --hwdec=no http://test-video-url
```

**问题：无法连接 Jellyfin Server**

检查网络：
```bash
# 测试服务器可达性
curl http://your-server:8096/health
# 检查防火墙规则
```

### 性能问题

**问题：播放卡顿、缓冲慢**

优化建议：
1. Jellyfin Server 端开启硬件转码
2. 客户端使用有线网络连接
3. 调整 mpv 缓冲设置：

```bash
# ~/.config/mpv/mpv.conf
cache=yes
cache-secs=30
```

### 兼容性

**问题：某些格式无法播放**

mpv 支持绝大多数格式，但部分编解码器需要额外安装：

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# Arch Linux
sudo pacman -S ffmpeg
```

## 六、总结

Jellium Desktop 为 Jellyfin 用户提供了一个高性能、原生桌面级的媒体播放解决方案。通过 CEF + mpv 的组合，它既保留了 Jellyfin Web UI 的完整功能，又带来了 mpv 的高性能播放能力。对于追求更好播放体验、更低资源占用的用户来说，这是一个值得尝试的开源项目。

项目仍在活跃开发中，通过 GitHub Actions 提供 nightly 构建，适合愿意尝试新版本的用户。如果你正在寻找 Jellyfin 的桌面客户端替代方案，Jellium Desktop 是一个不错的选择。
