---
title: "Fastpotify：用 Rust 写的轻量 Spotify 客户端，内存占用仅官方四分之一"
date: 2026-09-02T14:04:00+08:00
description: "Fastpotify 是一个用 Rust 和 egui 构建的原生 Spotify 客户端，通过 librespot 播放音乐，内存仅 100-250MB，支持 Spotify Connect、Winamp 皮肤、MilkDrop 可视化效果，跨平台运行。"
author: "Cheman"
draft: false
tags: ["Rust", "Spotify", "librespot", "egui", "开源", "GitHub"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Fastpotify**，一个用 Rust 写的原生 Spotify 客户端，内存占用仅 100-250MB，而官方桌面客户端常常吃掉 600MB 到 1GB 以上。

## 一、项目概述

Fastpotify 是一个基于 Rust 构建的轻量级 Spotify 桌面客户端，核心目标是**原生、快速、低资源占用**。它不依赖任何浏览器引擎（不像官方客户端基于 Electron/Chromium），而是使用 [egui](https://github.com/emilk/egui) 这个即时模式 GUI 框架来渲染界面，通过 [librespot](https://github.com/librespot-org/librespot) 实现 Spotify 协议层面的音频播放。

**核心数据对比：**

| 指标 | Fastpotify | 官方 Spotify 桌面端 |
|------|-----------|-------------------|
| 内存占用 | 100-250 MB | 600 MB - 1 GB+ |
| 启动时间 | < 1 秒 | 数秒 |
| 底层技术 | Rust + egui | Electron/Chromium |
| 浏览器引擎 | 无 | 有 |

项目支持 Linux、macOS、Windows 三大平台，近期在 GitHub 上迅速获得近 1600 颗 Star，当前版本为 0.5.0-rc2。

## 二、技术原理

### 架构设计

Fastpotify 的架构清晰地分为几个层次：

- **`src/player.rs`**：librespot 播放层，负责音频混音和 Spotify Connect 状态管理
- **`src/api/`**：Web API 会话管理，包括共享和个人 API 的路由、并发控制和限流处理
- **`src/backend.rs`**：tokio 异步运行时和通道通信
- **`src/images.rs`**：专辑封面加载、缓存和主色调提取
- **`src/app.rs` / `src/model.rs` / `src/ui/`**：应用状态、导航和视图层
- **`src/mpris.rs`**：Linux 媒体控制（MPRIS 协议）

### 核心技术栈与选型理由

**1. egui —— 即时模式 GUI**

egui 采用即时模式（immediate-mode）渲染，每帧重新绘制整个界面。这意味着不需要保留 DOM 树或 widget 树，内存开销极小。对于音乐播放器这种界面元素不算特别多的应用来说，egui 是性价比极高的选择：

```rust
// Cargo.toml 中的依赖配置
eframe = { version = "0.36", default-features = false, features = ["glow", "default_fonts", "links", "wayland", "x11", "persistence"] }
egui = "0.36"
```

注意它关闭了默认特性，只启用了 `glow`（OpenGL 后端）而非 `wgpu`，因为 2D 音乐客户端不需要 wgpu 的重量级图形管线，这进一步减小了二进制体积和依赖树。

**2. librespot —— 开源 Spotify 协议实现**

librespot 是一个逆向工程的 Spotify 客户端协议库，Fastpotify 使用它来实现：

- 音频播放（支持最高 320kbps）
- Spotify Connect 设备功能
- 无缝播放（gapless playback）
- 音量标准化

```rust
librespot-core = { version = "0.8", default-features = false, features = ["rustls-tls-native-roots"] }
librespot-playback = { version = "0.8", default-features = false, features = ["rodio-backend", "rustls-tls-native-roots"] }
librespot-connect = { version = "0.8", default-features = false }
librespot-metadata = { version = "0.8", default-features = false }
```

全部使用 `rustls` 而非 OpenSSL，确保跨平台编译无需额外系统依赖。

**3. 自定义音频 Sink**

值得注意的是，Fastpotify 没有直接使用 librespot 的 rodio 后端输出，而是自己实现了一个 Sink（`src/sink.rs`）。原因是 librespot 的 rodio 后端在设备打开失败时会 `unwrap` panic，在 release 构建中直接 abort。自定义 Sink 让错误处理更优雅：

```rust
// 使用与 librespot 相同版本的 rodio 和 cpal，不引入额外编译
rodio = { version = "0.21", default-features = false, features = ["playback"] }
cpal = "0.16"
```

**4. Winamp 迷你播放器与 MilkDrop 可视化**

Fastpotify 内置了一个 Winamp 风格的迷你播放器（`Ctrl+M` 打开），支持经典 `.wsz` 皮肤格式，甚至可以从 [Winamp Skin Museum](https://skins.webamp.org) 拖拽皮肤到窗口中加载。这通过 `image` crate 解析 BMP 位图实现：

```rust
image = { version = "0.25", default-features = false, features = ["jpeg", "png", "bmp"] }
flate2 = "1"  // 解压 .wsz（实为 zip）
tiny-skia = "0.11"  // 无抗锯齿填充字形轮廓
```

MilkDrop 可视化效果通过 [projectM](https://github.com/projectM-visualizer/projectm) 实现，以子进程方式运行（因为 winit 只允许每进程一个事件循环）：

```rust
projectm-sys = { version = "1.2.2", default-features = false, features = ["static"], optional = true }
winit = { version = "0.30", optional = true }
glutin = { version = "0.32", optional = true }
```

### 数据流分析

整个应用的数据流可以概括为：

1. **用户操作** → egui 事件 → `app.rs` 状态更新
2. **状态变更** → tokio channel → `backend.rs` 异步任务
3. **API 请求** → `api/` 模块 → Spotify Web API / librespot
4. **音频播放** → librespot → 自定义 Sink → rodio → cpal → 系统音频
5. **设备发现** → mDNS (`mdns-sd`) → 网络上的 Spotify Connect 设备

### 安全性设计

登录采用 Authorization Code with PKCE 流程，Fastpotify 永远不会看到用户密码。Refresh token 存储在平台状态目录中（如 Linux 的 `~/.local/state/fastpotify`）。本地播放需要额外的一次性浏览器授权（Spotify 将流媒体权限与库访问权限分开管理）。

## 三、安装与快速开始

### macOS（Homebrew）

```bash
brew install --cask crmne/tap/fastpotify
```

### Arch Linux（AUR）

```bash
yay -S fastpotify-bin      # 预编译二进制
yay -S fastpotify          # 从源码编译 release
yay -S fastpotify-git      # 最新 commit 构建
```

### 从源码编译

需要 Rust 1.95 或更新版本：

```bash
git clone https://github.com/crmne/fastpotify.git
cd fastpotify
cargo install --path .
```

如果不想要 MilkDrop 可视化（可以省去 CMake、C++ 编译器和 libclang 依赖）：

```bash
cargo install --path . --no-default-features
```

Linux 上还需要音频和窗口系统开发包：

```bash
# Arch
sudo pacman -S --needed alsa-lib libpulse libxkbcommon wayland cmake clang

# Debian/Ubuntu
sudo apt install libasound2-dev libpulse-dev libxkbcommon-dev libwayland-dev \
    cmake clang libclang-dev
```

### 登录

1. 点击 **Sign in with Spotify**
2. 浏览器打开 Spotify 授权页面（PKCE 流程）
3. 授权后自动返回应用
4. 如需在本机播放音乐，需要 Spotify Premium 并完成一次额外的播放授权

## 四、使用方法与实战

### 基础操作

Fastpotify 提供完整的 Spotify 功能：

- **播放控制**：播放/暂停、上一首/下一首、拖动进度条、音量
- **设备切换**：通过设备选择器将播放转移到其他 Spotify Connect 设备
- **库浏览**：播放列表、喜欢的歌曲、专辑、关注的艺术家、播客
- **搜索**：跨歌曲、艺术家、专辑、播放列表、播客搜索
- **首页**：为你推荐、最近播放、热门艺术家和歌曲

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放/暂停 |
| `Ctrl+←/→` | 上一首/下一首 |
| `Shift+←/→` | 快进/快退 10 秒 |
| `Ctrl+↑/↓` | 音量 |
| `Ctrl+F` 或 `/` | 搜索 |
| `Ctrl+M` | Winamp 迷你播放器 |
| `Ctrl+Shift+K` | MilkDrop 可视化 |
| `Ctrl+,` | 设置 |
| `Ctrl+/` 或 `?` | 查看所有快捷键 |

macOS 上 `Cmd` 替代 `Ctrl`。

### 命令行控制

在 macOS 和 Windows 上，Fastpotify 提供了子命令来控制已运行的实例：

```bash
fastpotify play-pause           # 播放/暂停
fastpotify next                 # 下一首
fastpotify volume 40            # 设置音量到 40%
fastpotify now-playing          # 显示当前播放
fastpotify now-playing --raw    # TSV 格式输出，适合脚本
fastpotify devices              # 列出 Spotify Connect 设备
fastpotify play-uri spotify:playlist:37i9...  # 播放指定 URI
```

Linux 上则通过 MPRIS 协议支持 `playerctl`：

```bash
playerctl --player=fastpotify play-pause
```

### 设置与配置

设置存储在单一 JSON 文件中（Linux: `~/.config/fastpotify/settings.json`），包括：

- Connect 设备名称
- 音频比特率（最高 320kbps）
- 音量标准化
- 无缝播放
- 音频后端选择（Linux: PulseAudio/PipeWire 或 ALSA）
- 音频缓存大小
- 主题（亮色/暗色/跟随系统）
- 专辑封面取色功能开关
- Winamp 皮肤和尺寸

## 五、常见问题与解决方案

### Q: 免费 Spotify 账户可以使用吗？

可以浏览和搜索，但**无法播放音乐**。播放功能需要 Spotify Premium，这是 Spotify 协议层面的限制，不是 Fastpotify 的限制。

### Q: 会被封号吗？

根据项目说明，目前没有因使用 Fastpotify 或其他基于 librespot 的 Premium 客户端而导致封号的案例。Fastpotify 不去除广告、不翻录曲目、不操纵流媒体数据，DRM 保持完整。被封案例通常涉及破解免费账户广告去除、曲目翻录等行为。

### Q: 编译失败怎么办？

MilkDrop 依赖 libprojectM，需要 CMake、C++ 编译器和 libclang。如果不想安装这些工具：

```bash
cargo install --path . --no-default-features
```

### Q: 中文/日文/韩文显示为方框？

Linux 上需要安装 CJK 字体：

```bash
# Arch
sudo pacman -S noto-fonts noto-fonts-cjk

# Debian/Ubuntu
sudo apt install fonts-noto fonts-noto-cjk
```

macOS 和 Windows 自带常见字体，通常不会有此问题。

### Q: 关闭窗口后音乐停止了？

默认行为是关闭窗口时最小化到系统托盘，音乐继续播放。如果发现音乐停止，检查设置中是否将关闭按钮设为退出。macOS 上可以通过 Dock 图标重新打开窗口。

## 六、总结

Fastpotify 展示了 Rust 在桌面应用开发中的潜力：用 egui 的即时模式 GUI 替代 Electron，用 librespot 实现 Spotify 协议，最终做到内存占用仅官方客户端的四分之一，启动时间不到一秒。项目还加入了不少有趣的特性——Winamp 皮肤支持和 MilkDrop 可视化效果——让这个"现代"客户端带上了复古的浪漫。

对于追求轻量级桌面体验、或者对 Rust 系统编程感兴趣的开发者来说，Fastpotify 的源码值得一读，特别是它的自定义音频 Sink 实现、双 API 会话路由（共享 + 个人 Spotify Development Mode app）、以及将 MilkDrop 作为子进程运行的架构设计。

**项目地址：** [https://github.com/crmne/fastpotify](https://github.com/crmne/fastpotify)

**官网：** [https://fastpotify.rocks/](https://fastpotify.rocks/)

**许可证：** MIT
