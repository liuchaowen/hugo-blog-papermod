---
title: "Castor：终端驱动的智能电视视频推送利器"
date: 2026-07-21
description: "Castor 是一款终端视频推送工具，通过 headless Chrome 提取网页视频流、ffmpeg 转码后直接推送到 DLNA/UPnP 电视，无需遥控器，适合开发者和技术用户。"
author: "Cheman"
slug: castor
draft: false
categories: ["技术", "开源"]
tags: ["Go", "DLNA", "智能电视", "视频流", "开源工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Castor**，一款完全在终端运行的视频推送工具——只需一条命令，就能把任意网页视频或直播流以最高画质投射到智能电视上，绕过 Smart TV 自带的种种限制。

## 一、项目概述

Castor 解决的核心问题是：**Smart TV 无法随意投射任意网页视频，而屏幕镜像延迟高、画质差**。它的工作方式非常直接——在终端指定一个网页地址，它会自动启动 headless Chrome 访问该页面，通过 Chrome DevTools Protocol 抓取网络请求中的视频流，然后实时转码推送至 DLNA/UPnP 设备。

主要特性包括：

- **无代理流媒体推送**：通过 headless Chrome 提取真实视频流，支持 HLS、MP4 等格式
- **实时转码**：使用 ffmpeg 按电视支持的格式重新编码，支持 VA-API（Linux Intel）、VideoToolbox（macOS）等硬件加速
- **DLNA/UPnP 全兼容**：支持 Samsung、LG、Sony Bravia、Panasonic、VIZIO 等几乎所有近十年出厂的智能电视
- **TMDB/IMDB 一键搜索**：配置 TMDB API 后，可直接在终端搜索电影/剧集并投射
- **自动字幕烧录**：集成 whisper.cpp，支持 AI 生成字幕并烧入视频流
- **完全本地化**：不托管任何内容，只负责在你授权的设备和来源之间做"管道"

## 二、技术原理

### 2.1 整体架构

Castor 的工作链路分为三个阶段：

1. **设备发现**：通过 SSDP（简单服务发现协议）扫描局域网内的 DLNA/UPnP MediaRenderer 设备
2. **视频提取**：启动 headless Chrome，访问目标页面，利用 Chrome DevTools Protocol 监控网络请求，定位到最大的视频资源 URL
3. **转码推送**：调用 ffprobe 探测视频格式，若电视不支持则用 ffmpeg 转码，最后通过 DLNA 协议将视频流推送到目标设备

```
castor cast player https://example.com/video
         ↓
  headless Chrome 访问页面
         ↓
  Chrome DevTools Protocol 抓包
         ↓
  找到视频 URL (HLS/MP4)
         ↓
  ffprobe 探测格式
         ↓
  ffmpeg 转码（如需要）
         ↓
  DLNA/UPnP 推流到 TV
```

### 2.2 核心源码结构

项目使用 Go 1.26+ 开发，主入口在 `main.go`，核心逻辑分布在 `cmd` 子包中。视频提取部分依赖 `chromedp`（Go 语言的 Chrome DevTools Protocol 客户端库），设备发现则使用 `goupnp` 库实现 UPnP 发现协议。

关键依赖一览：

```go
github.com/chromedp/chromedp        // headless Chrome 控制
github.com/huin/goupnp              // DLNA/UPnP 设备发现
github.com/ggerganov/whisper.cpp    // 字幕语音识别（本地运行）
github.com/charmbracelet/bubbletea  // TUI 界面
github.com/urfave/cli/v3            // CLI 参数解析
```

### 2.3 流提取策略

Castor 的视频提取逻辑非常巧妙——它并不依赖特定的视频标签或播放器 API，而是模拟用户的点击行为：先点击页面主播放按钮，如果视频嵌套在 iframe 中，则自动向内层 iframe 导航，再次尝试点击。这种方式对大多数支持自动播放的视频网站都有效，但确实无法绕过 DRM 保护。

```go
// 简化的提取策略伪代码
steps := []Action{
    ClickPlayButton,      // 首次点击页面上的播放元素
    NavigateIntoIframe,   // 进入最外层 iframe
    ClickPlayButton,     // 再次尝试播放
}
```

### 2.4 转码与硬件加速

当电视不支持源视频的编码格式时，Castor 会启动 ffmpeg 进行实时转码。转码策略优先使用硬件加速：

```yaml
resolver:
  max_height: 2160  # 设置为电视物理分辨率，4K 电视可传 4K 源流
```

Linux 下使用 VA-API（Intel 集成显卡），macOS 下使用 VideoToolbox，均衡失败后回退到软件编码 `libx264`。对于完全兼容的视频（H.264 编码在电视支持的 Profile/Level 范围内），Castor 直接进行流复制（stream copy），CPU 占用几乎为零。

## 三、安装与快速开始

### 环境要求

- **Chrome/Chromium**（用于 headless 视频提取）
- **ffmpeg + ffprobe**（转码与格式探测）
- **macOS / Linux**（终端运行环境，macOS 推荐原生安装，Docker 方式仅适用于 Linux）

### 安装步骤

**macOS（Homebrew）：**

```sh
brew install --cask stupside/tap/castor
```

**Linux Docker（需要 `--network host`）：**

```sh
docker run --rm --network host ghcr.io/stupside/castor:latest scan
```

**从源码编译（需要 Go 1.26+ 和 cmake）：**

```sh
git clone --recurse-submodules https://github.com/stupside/castor.git
cd castor
make
```

> 注意：whisper.cpp 的 Go 绑定使用 CGO 构建，需要先通过 cmake 编译 `libwhisper.a`，因此普通的 `go install` 无法使用。

### 快速配置

首次使用前，先扫描局域网内的电视设备：

```sh
castor scan
```

将目标电视名称写入 `config.yaml`：

```yaml
device:
  name: "Living Room TV"
  type: dlna
```

### 最简运行示例

推送一个正在播放视频的网页：

```sh
castor cast player https://example.com/watch/video-id
```

搜索电影并投射（需配置 TMDB API）：

```sh
castor cast movie tt12300742
```

## 四、使用方法与进阶配置

### 4.1 配置自定义视频源

Castor 默认不内置任何视频源，用户需要自己配置授权的视频网站。配置文件结构如下：

```yaml
sources:
  - proxies: ["https://your-source.example"]
    templates:
      movie: "/embed/movie/{itemID}"
      episode: "/embed/tv/{itemID}/{season}-{episode}"
```

### 4.2 自动字幕烧录

启用 whisper 语音识别并烧录字幕：

```yaml
whisper:
  enable: true
  # language: "en"  # 默认英语
  # model_path: ""  # 默认使用 ggml-tiny.en，自动下载
```

### 4.3 环境变量配置敏感信息

敏感配置（如 TMDB API Key）建议放在 `config.local.yaml`（已加入 `.gitignore`）或通过环境变量传入：

```yaml
# config.yaml（公开）
device:
  name: "Living Room TV"
  type: dlna

# config.local.yaml（保密）
tmdb:
  api_key: "YOUR_TMDB_API_KEY"
```

## 五、常见问题与解决方案

**Q: `scan` 命令找不到电视？**
确保电视和电脑在同一局域网内，且电视的 DLNA/UPnP 功能已开启。部分 Docker 环境（macOS/Windows）无法使用 `--network host`，只能在 Linux 原生运行。

**Q: 推送后电视显示不支持该格式？**
检查 `config.yaml` 中 `resolver.max_height` 是否超过电视支持的分辨率，适当降低或设置与电视物理分辨率一致的值。

**Q: whisper 字幕识别速度慢？**
默认使用 `ggml-tiny.en` 模型（~75MB），兼顾速度和精度。如需更高精度可切换到 larger 模型，但实时性会下降。

**Q: macOS 原生安装后 Chrome 相关功能不工作？**
确保 Chrome/Chromium 在系统 PATH 中，或通过 `CASTOR_BROWSER__CHROME_PATH` 环境变量指定路径。

## 六、总结

Castor 是一款将"终端极客精神"发挥到极致的工具——用纯命令行方式解决了智能电视视频投射的痛点，架构清晰（Chrome 提取 + ffmpeg 转码 + DLNA 推送），扩展性强（自定义源、字幕识别），非常适合有技术背景的用户搭建本地媒体流环境。如果你厌倦了电视上繁琐的投屏操作，Castor 值得一试。

**GitHub 仓库**：https://github.com/stupside/castor
