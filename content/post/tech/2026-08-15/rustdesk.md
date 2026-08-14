---
title: "RustDesk：Rust 写的远程桌面神器，开箱即用"
date: "2026-08-15"
description: "RustDesk 是一款用 Rust 编写的远程桌面解决方案，跨平台支持 Windows、macOS、Linux、Android 和 iOS，无需配置即可开箱即用，支持文件传输、剪贴板同步、TCP 隧道等功能，数据完全自主可控。"
author: "Cheman"
slug: rustdesk
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "远程桌面", "开源", "跨平台"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**RustDesk**，一款用 Rust 编写的远程桌面工具，支持 Windows、macOS、Linux、Android 和 iOS，开箱即用无需配置，数据完全自主可控，妥妥的远程办公利器。

## 一、项目概述

RustDesk 是一个 Rust 编写的远程桌面解决方案，定位类似 TeamViewer、AnyDesk 或 VNC。它的核心目标是：

- **零配置开箱即用**：下载后直接运行，无需注册账号或配置网络
- **数据完全自主可控**：可使用官方中继服务器、自建服务器，或完全私有化部署
- **跨平台覆盖广**：支持桌面（Windows/macOS/Linux）和移动端（Android/iOS）

核心特性一览：

| 特性 | 说明 |
|------|------|
| 文件传输 | 远程会话中直接拖拽文件 |
| 剪贴板同步 | 两端剪贴板内容实时同步 |
| TCP 隧道 | 通过远程桌面建立 TCP 隧道端口转发 |
| 音频传输 | 支持远程音频播放 |
| 隐私安全 | 支持自建中继服务器，数据不过第三方 |
| 多语言 | 支持 20+ 种语言界面 |

## 二、技术架构

RustDesk 的架构设计非常清晰，核心分为以下几个模块（位于 `src/` 和 `libs/` 目录）：

### 核心模块一览

- **`src/client.rs`**：对等连接（P2P）发起端，通过 TCP 打洞或中继建立远程会话
- **`src/server.rs`**：远程桌面服务核心，处理音频、剪贴板、输入、视频服务
- **`src/rendezvous_mediator.rs`**：与中继服务器通信，处理 NAT 穿透和会话握手
- **`libs/hbb_common`**：视频编解码、配置管理、TCP/UDP 封装、Protobuf 协议和文件传输工具
- **`libs/scrap`**：跨平台屏幕截图，支持 DRM 硬件加速和 Wayland
- **`libs/enigo`**：平台特定的键盘/鼠标控制实现
- **`libs/clipboard`**：跨平台剪贴板读写及文件复制粘贴
- **`flutter/`**：Flutter 编写的跨平台 UI，支持桌面和移动端

### Rust + Flutter 的混合架构

桌面端 RustDesk 使用 Rust 实现底层核心逻辑（网络、视频编解码、远程控制），UI 层则通过 Flutter 实现。这种组合兼顾了：

```toml
# flutter 依赖桥接 Rust 业务逻辑
flutter_rust_bridge = { version = "=1.80", features = ["uuid"] }

# 核心编解码依赖
hbb_common = { path = "libs/hbb_common" }
scrap = { path = "libs/scrap", features = ["wayland"] }
```

Flutter UI 通过 `flutter_rust_bridge` 调用 Rust 侧功能，实现了高性能与跨平台 UI 的平衡。

### NAT 穿透与中继机制

RustDesk 的网络连接策略分三步走：

1. **直连（P2P）**：优先尝试 TCP/UDP 直连，通过 RFC 3489 STUN 进行 NAT 类型检测
2. **TCP 打洞**：若双方都在对称 NAT 之后，利用中继服务器协助打洞
3. **中继转发**：完全失败时，通过自建或官方中继服务器转发流量

关键源码逻辑（`rendezvous_mediator.rs` 思路）：

```rust
// 连接策略优先级
enum ConnectionStrategy {
    Direct,       // P2P 直连
    HolePunching, // TCP 打洞
    Relay,        // 中继转发
}

// 中继服务器可自建
// https://github.com/rustdesk/rustdesk-server
// 或使用官方服务 https://rustdesk.com/server
```

## 三、安装与快速开始

### 官方二进制下载（推荐）

直接下载对应平台的安装包，无需自行编译：

- **Windows/macOS/Linux**：https://github.com/rustdesk/rustdesk/releases
- **Android**：Google Play / F-Droid 搜索 "RustDesk"
- **iOS**：App Store 搜索 "RustDesk"

### Docker 构建（开发者）

```bash
git clone --recurse-submodules https://github.com/rustdesk/rustdesk
cd rustdesk

# 构建 Docker 镜像
docker build -t "rustdesk-builder" .

# 运行编译（首次较慢，依赖缓存后加速）
docker run --rm -it   -v $PWD:/home/user/rustdesk   -v rustdesk-git-cache:/home/user/.cargo/git   -v rustdesk-registry-cache:/home/user/.cargo/registry   -e PUID="$(id -u)" -e PGID="$(id -g)"   rustdesk-builder

# 编译产物在 target/debug/ 或 target/release/
```

### 从源码手动构建（Ubuntu）

```bash
# 安装依赖
sudo apt install -y zip g++ gcc git curl wget nasm yasm \
    libgtk-3-dev clang libxcb-randr0-dev libxdo-dev \
    libxfixes-dev libxcb-shape0-dev libxcb-xfixes0-dev \
    libasound2-dev libpulse-dev cmake make libclang-dev \
    ninja-build libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev

# 克隆并初始化子模块
git clone --recurse-submodules https://github.com/rustdesk/rustdesk
cd rustdesk

# 安装 vcpkg 和 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

git clone https://github.com/microsoft/vcpkg
cd vcpkg && git checkout 2023.04.15 && cd ..
vcpkg/bootstrap-vcpkg.sh
export VCPKG_ROOT=$HOME/vcpkg
vcpkg/vcpkg install libvpx libyuv opus aom

# 编译运行
VCPKG_ROOT=$HOME/vcpkg cargo run
```

## 四、使用方法与实战

### 基本远程连接

1. 打开 RustDesk，两端都显示一个 8 位数字 ID
2. 在控制端输入被控端的 ID，点击"连接"
3. 被控端会收到连接请求，点击"接受"即可

### 高级：自建中继服务器

若不想使用官方服务器，可一键部署私有中继：

```bash
# 使用官方提供的 rustdesk-server 镜像
docker run --name rustdesk-server -d \
  -p 21115:21115 -p 21116:21116 -p 21117:21117 -p 21118:21118 -p 21119:21119 \
  rustdesk/rustdesk-server:latest
```

然后在 RustDesk 设置中填写自建服务器的地址，即可实现完全私有化的远程连接。

### 文件传输

在远程会话中，点击工具栏的"文件"图标，可以：
- 浏览远程文件系统
- 直接拖拽文件传输（支持大文件分片）
- 断点续传

### TCP 隧道

RustDesk 内置 TCP 隧道功能，可以在建立远程会话的同时，将远程主机的端口映射到本地：

```
本地端口  →  远程桌面  →  远程主机指定端口
```

这对远程开发调试、访问内网服务非常有用。

## 五、常见问题与解决方案

**Q: 连接提示"连接失败"？**
检查双方网络是否畅通，确认被控端 RustDesk 已启动且未被防火墙拦截。尝试切换到中继模式（设置 → 网络 → 强制中继）。

**Q: 画面卡顿、延迟高？**
在连接设置中降低画质和帧率；确认网络带宽充足；优先使用有线网络而非 Wi-Fi。

**Q: Android/iOS 端无法控制对方？**
移动端目前主要作为被控端使用，控制功能（发送按键/鼠标）受平台限制较多，建议使用桌面端进行控制。

**Q: 如何彻底私有化部署？**
部署 `rustdesk-server` 镜像后，在两端设置 → 网络中填写私有服务器地址，并关闭"使用官方 rendezvous 服务器"选项即可。

**Q: 编译报错 "missing vcpkg"？**
确保 `VCPKG_ROOT` 环境变量正确指向 vcpkg 目录，并已执行 `vcpkg install libvpx libyuv opus aom`。

## 六、总结

RustDesk 凭借 Rust 带来的高性能和内存安全保证，加上 Flutter 的跨平台 UI 能力，构建了一个真正实用的远程桌面生态。它的优势在于：

- 🚀 **零配置**：下载即用，不绑账号
- 🔐 **隐私优先**：支持完全私有化部署，数据不过第三方
- 🌐 **真跨平台**：桌面五平台 + 移动端全覆盖
- 🛠️ **功能完整**：文件传输、剪贴板、TCP 隧道、音频一个不少

如果你在寻找 TeamViewer 的替代品，RustDesk 绝对值得一试。项目在 GitHub 上活跃度高，issue 响应快，有问题可以直接提 PR 或 Discussion。

> 项目地址：https://github.com/rustdesk/rustdesk
> 官方文档：https://rustdesk.com/docs/
