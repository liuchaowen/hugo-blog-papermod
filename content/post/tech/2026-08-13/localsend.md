---
title: "LocalSend: 无需互联网，跨设备本地文件传输神器"
date: "2026-08-13"
description: "LocalSend 是一款免费开源的跨平台应用，通过本地局域网 REST API + HTTPS 加密，让设备之间无需互联网即可安全地互传文件与文字消息，支持 Windows、macOS、Linux、Android、iOS 等全平台。"
author: "Cheman"
slug: localsend
draft: false
categories: ["技术", "开源"]
tags: ["开源", "Flutter", "文件传输", "跨平台", "局域网"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**LocalSend**，它解决了一个我们每天都会遇到但很少有优雅解决方案的问题——同一局域网下多设备之间互传文件。传统方案要么依赖微信/QQ，要么依赖 U 盘，要么依赖各种国内厂商的"碰一碰"生态，而 LocalSend 用一种完全开源、无需服务器、完全本地化的方式做到了。

## 一、项目概述

LocalSend 是一个免费开源的跨平台应用，主打**离线、点对点、本地网络文件传输**，不需要互联网连接，不需要第三方中转服务器。

### 核心特性

- **全平台覆盖**：Windows、macOS、Linux、Android、iOS、Amazon Fire OS，一个都不落
- **本地局域网直连**：设备之间通过 REST API 直接通信，不走公网
- **TLS/HTTPS 加密传输**：所有数据通过 HTTPS 加密，TLS 证书是每个设备动态生成的，最大化安全性
- **多语言支持**：内置 20+ 种语言翻译，社区活跃贡献
- **多种分发渠道**：支持 Winget、Scoop、Homebrew、Flathub、AUR、Nixpkgs 等各大包管理器
- **开源透明**：代码完全开源在 GitHub 和 Codeberg 双平台

### 技术栈

| 组件 | 技术 |
|------|------|
| 移动端/桌面端 App | Flutter + Dart |
| 核心加密/网络层 | Rust |
| CLI 工具 | Rust |
| 协议 | REST API + HTTPS (TLS) |

## 二、技术原理

### 通信协议设计

LocalSend 的核心是自研的 **LocalSend Protocol**，基于 HTTPS/REST 架构。每个设备在启动时会动态生成一对 TLS 证书，作为设备身份的唯一标识。以下是项目源码中的 Cargo workspace 配置，体现了其 Rust 核心架构：

```toml
[workspace]
resolver = "3"
members = [
    "cli",
    "packages/core",
    "packages/localsend_isolates/rust",
    "server",
]
```

- `packages/core`：核心协议和加密逻辑
- `packages/localsend_isolates/rust`：Rust 原生isolate实现高性能文件读写
- `server`：本地 HTTP 服务器，处理文件接收请求
- `cli`：命令行工具接口

### 文件传输流程

1. **设备发现**：Sender 在局域网广播自己的存在（UDP，端口 53317）
2. **建立连接**：Receiver 收到广播后，通过 HTTPS 发起文件请求
3. **传输层**：使用 HTTP Multipart Form-Data 或流式传输大文件
4. **加密验证**：每个请求都携带动态生成的 TLS 证书签名

### 网络端口配置

```yaml
Incoming:  TCP, UDP  # 端口 53317
Outgoing:  TCP, UDP  # 任意端口
```

如果设备之间互相"看不见"，通常有两个原因：
- 路由器开启了 **AP 隔离（AP Isolation）**——需要关闭
- Windows 网络被设为"公用网络"——需改为"专用网络"

### 架构亮点

LocalSend 的一个设计亮点是**不依赖任何中心服务器**。传统的 AirDrop 其实背后也有 Apple 的认证服务器，而 LocalSend 完全去中心化——这意味着即使在内网隔离环境中（比如公司内网、科研网、飞机上），只要设备在同一个局域网就能用。

## 三、安装与快速开始

### 下载安装

LocalSend 支持几乎所有主流平台的安装方式：

| 平台 | 安装方式 |
|------|----------|
| Windows | Winget: `winget install LocalSend`、Scoop、Chocolatey、EXE 安装包 |
| macOS | App Store、Homebrew: `brew install --cask localsend`、DMG 安装包 |
| Linux | Flathub、Snap、AUR (Arch)、Nixpkgs、AppImage、DEB、TAR |
| Android | Google Play、F-Droid、APK 直接下载 |
| iOS | App Store |

### 从源码编译

```bash
# 1. 安装 Flutter（需要特定版本，项目用 fvm 管理）
fvm flutter --version

# 2. 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. 克隆仓库
git clone https://github.com/localsend/localsend.git
cd localsend

# 4. 下载依赖并运行
cd app
fvm flutter pub get
fvm flutter run
```

### 快速使用

1. 在所有设备上安装 LocalSend
2. 确保设备在同一 WiFi 网络下
3. 打开应用，设备会自动发现彼此
4. 选择目标设备，发送文件或文字即可

## 四、常见问题与解决方案

### 设备之间互相看不到

**原因**：大多数情况下是网络配置问题。

| 发送方 | 接收方 | 解决方案 |
|--------|--------|----------|
| 任意 | Windows | 将网络设为"专用网络"，关闭公用网络模式 |
| macOS/iOS | 任意 | 在 iOS 设置中重新开关"本地网络"权限 |
| 任意 | 任意 | 关闭路由器 AP 隔离功能（Guest 网络默认开启） |

### 传输速度过慢

- **切换到 5GHz WiFi**：2.4GHz 速率远低于 5GHz
- **暂时关闭加密**：在设置中可以关闭 TLS 加密以提升速度（仅在内网安全环境下建议）

### Android 端传输慢

已知问题（[Flutter SAF Stream Issue](https://github.com/flutter-cavalry/saf_stream/issues/4)），暂无完美解决方案，可等待后续版本更新。

## 五、总结

LocalSend 是那种"用了一次就再也回不去"的工具。它的核心价值在于：**完全开源、完全免费、完全本地化、不依赖任何互联网服务**。相比国内的各种"智慧互联"、"碰一碰"，它不仅开源透明，而且支持的平台更广——从 Windows 到 Linux，从 Android 到 iOS，没有生态锁死。

如果你经常需要在手机和电脑之间传文件，或者有多设备协作需求，LocalSend 值得一试。尤其是对于开发者群体，它的 Rust 核心 + Flutter UI 架构本身也是一个值得研究的技术样本。
