---
title: "StemDeck: 完全本地化的音频人声伴奏分离工具"
date: "2026-08-31"
description: "StemDeck 是一款免费、开源的本地音频分离工具，支持将音乐拆分为人声、鼓点、贝斯、吉他、钢琴等6个音轨，全程离线运行，无需注册、无需上传、无需订阅。"
author: "Cheman"
slug: stemdeck
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "音频处理", "AI", "本地部署", "Demucs"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**StemDeck**，一款完全免费、本地运行的人声伴奏分离工具——拖入一首歌，几秒钟后就能得到人声、鼓组、贝斯、吉他、钢琴和其他声音这6条独立音轨，不需要注册账号、不需要上传到云端、不需要付费订阅。

## 一、项目概述

StemDeck 是一款基于 AI 的音频源分离（Audio Source Separation）桌面工具，由 [stemdeckapp/stemdeck](https://github.com/stemdeckapp/stemdeck) 开发。它的核心功能是把一整首音乐拆成多条独立音轨（Stems），让你可以对人声、伴奏、鼓组等进行单独处理。

**核心特性：**

- **6 轨分离**： vocals（人声）、drums（鼓组）、bass（贝斯）、guitar（吉他）、piano（钢琴）、other（其他），基于 Meta AI 开源的 Demucs `htdemucs_6s` 模型
- **本地推理**：所有分离过程在本地完成，音频文件从不离开你的电脑
- **零注册零订阅**：完全免费，不设使用配额或付费墙
- **多格式支持**：支持 MP3、WAV、FLAC、OGG、MP4、M4A 音频文件，也支持直接粘贴 YouTube 链接
- **DAW 风格混音台**：内置波形编辑器、循环标记、独奏/静音、总线导出，可直接预览和导出选中的音轨组合
- **跨平台**：提供 macOS（Apple Silicon / Intel）、Windows（CPU / NVIDIA CUDA）、Linux Docker，以及直接源码构建等多种安装方式

## 二、技术原理

### 2.1 核心分离引擎：Demucs

StemDeck 的音频分离底层依赖 Meta AI（Facebook Research）开源的 **Demucs** 模型，具体使用 `htdemucs_6s` 架构。这是目前开源社区中效果最均衡的6轨分离模型之一，核心是一个基于 CNN + Transformer 的深度神经网络。

从 `pyproject.toml` 中的依赖约束可以看出 StemDeck 对 Demucs 的版本管理非常严谨：

```toml
"demucs>=4.0.1,<4.1",
```

这里特意卡死了上限，因为 Demucs 4.1.0（2026-07-11）引入了一个新的 Rust/CMake 原生依赖 `sphn`，在 Intel macOS 平台上无法从预编译 wheel 安装，会触发从源码编译最终失败。所以项目稳定在 4.0.1 分支。

### 2.2 PyTorch 设备自动选择

StemDeck 在启动时自动检测最优计算设备：

```python
# 自动选择逻辑（简化）
if torch.cuda.is_available():
    device = "cuda"          # NVIDIA GPU，最快
elif torch.backends.mps.is_available():
    device = "mps"           # Apple Silicon GPU
else:
    device = "cpu"           # 兜底，速度较慢
```

Apple Silicon Mac 用户可以享受极快的本地推理速度，MPS（Metal Performance Shaders）后端在 M 系列芯片上有非常不错的表现。

### 2.3 音频分析与 BPM 检测

分离前的音频分析环节使用 **librosa** 进行 BPM 检测和调性分析：

```toml
"librosa>=0.10,<1",
"beat-this>=1.1",
"pyloudnorm>=0.1.1",
```

`librosa` 的节拍跟踪器用于估算 BPM，但文档中特别提到它对快节奏音乐（180 BPM 朋克）可能会折半报告为 90 BPM，因为其 120 BPM 的对数正态先验无法关闭。`beat-this` 是更精确的替代方案，权重模型在首次使用时通过 torch.hub 下载（~81 MB）。

响度测量遵循 **ITU-R BS.1770** 标准（通过 `pyloudnorm` 实现），给出 LUFS 积分响度和瞬时峰值 dBFS。

### 2.4 桌面应用架构：Tauri v2

StemDeck 的 macOS 和 Windows 桌面客户端使用 **Tauri v2** 构建。Tauri 是一个用 Rust 编写的轻量级框架，用系统原生 WebView 渲染前端，避免了 Electron 的臃肿体积。

```toml
# 前端技术栈（从 package.json 和 README 分析）
# - 纯原生 JavaScript，无框架，无构建步骤
# - Web Audio API 处理实时混音和 VU 表
# - Canvas 渲染波形（min/max 采样点绘制）
# - Playwright E2E 测试驱动 Chromium
```

值得注意的是，前端完全不使用任何现代前端框架（React/Vue 等），也没有 npm 构建步骤，代码直接运行。这种设计最大程度简化了维护和升级，也体现了项目对"简单即可靠"的追求。

### 2.5 后端 API 服务

StemDeck 同时提供纯 Python 服务端，适合 Linux 服务器或 Docker 部署：

```python
# 核心端点设计
POST /api/jobs              # 提交分离任务（URL 或文件上传）
GET  /api/jobs/{id}         # 查询任务状态
GET  /api/jobs/{id}/events  # SSE 流推送实时进度
GET  /api/jobs/{id}/stems/{name}.wav  # 下载单个音轨 WAV
GET  /api/jobs/{id}/video.mp4          # 混音导出为 MP4
POST /api/jobs/{id}/cancel  # 取消运行中的任务
```

后端使用 FastAPI + Uvicorn，通过 SSE（Server-Sent Events）向客户端推送分离进度（`Uploading...` → `Downloading...` → `Analyzing...` → `Separating...` → `Mixing tracks...`）。

## 三、安装与快速开始

### 3.1 macOS 一键安装（推荐）

从 [GitHub Releases](https://github.com/stemdeckapp/stemdeck/releases) 下载对应 DMG：

| 文件 | GPU 加速 | 适用芯片 |
|---|---|---|
| `StemDeck-macOS-arm64.dmg` | Apple Silicon (MPS) | M1 及以上 |
| `StemDeck-macOS-x64.dmg` | CPU only | Intel Mac |

首次启动会自动下载 Python 运行时（~500 MB）、FFmpeg 和 Demucs 模型（~170 MB），之后启动无需再次下载。macOS 遇到 Gatekeeper 拦截时，右键选择"打开"即可。

### 3.2 Windows 安装

从 Releases 下载压缩包：

| 文件 | GPU 加速 | 体积 |
|---|---|---|
| `StemDeck-Windows-x64.zip` | CPU only | ~700 MB |
| `StemDeck-Windows-x64.NVIDIA.zip` | NVIDIA CUDA | ~1.6 GB |

解压到任意目录即可运行，所有配置和数据文件都存放在解压目录下的 `data/` 文件夹中，完全可移植——复制整个文件夹到 U 盘也能正常工作。

### 3.3 Docker 部署（Linux 服务器）

```bash
# 基础运行
docker run -d --name stemdeck -p 8000:8000 \
  -v /path/to/jobs:/app/jobs \
  -v /path/to/cache:/cache \
  ghcr.io/stemdeckapp/stemdeck:edge

# 带 NVIDIA GPU 加速（需要 NVIDIA Container Toolkit）
docker run -d --name stemdeck -p 8000:8000 \
  --runtime=nvidia -e NVIDIA_VISIBLE_DEVICES=all \
  -v /path/to/jobs:/app/jobs \
  ghcr.io/stemdeckapp/stemdeck:edge
```

Docker 镜像预置了 CUDA 版本的 PyTorch，配合 NVIDIA GPU 可以获得极高的分离速度。

### 3.4 源码构建

```bash
# macOS / Linux（需 Python 3.12 + uv + ffmpeg）
git clone https://github.com/stemdeckapp/stemdeck && cd stemdeck
./run.sh setup      # 安装依赖
./run.sh start      # 启动服务

# Windows (PowerShell)
winget install astral-sh.uv
winget install Gyan.FFmpeg
git clone https://github.com/stemdeckapp/stemdeck stemdeck
cd stemdeck
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 四、使用方法与实战

### 4.1 基础用法：三步完成分离

1. **导入音频**：将音频文件（MP3/WAV/FLAC 等）拖入应用窗口，或粘贴 YouTube 链接
2. **选择音轨**：点击顶部音轨标签（chips），选择要分离出的音轨（默认全选6轨）
3. **开始处理**：点击 Process，等待分离完成

分离完成后，界面切换到"混音工作室"视图。左侧显示原始完整音轨（Original），右侧依次是分离出的各条音轨。

### 4.2 混音与导出

在混音工作室中：
- **M**：静音当前音轨
- **S**：独奏当前音轨（可多选叠加）
- **Monitor**：仅监听当前音轨，清除其他所有独奏
- **Volume Fader**：调节音轨音量，拖拽精细控制，双击重置为 0 dB
- **Download Mix**：导出选中的音轨混合为 WAV 文件

波形显示支持缩放、循环区间拖拽设定、`Space` 播放/暂停、`[` / `]` 快退/快进 5 秒。

### 4.3 YouTube 链接处理

粘贴 YouTube 视频 URL 后，StemDeck 会自动下载音频并进入分离流程。需要注意的是，YouTube 下载依赖 `yt-dlp`，如果遇到 `No supported JavaScript runtime` 警告，需要安装 Deno：

```bash
brew install deno  # macOS
```

### 4.4 环境变量配置

高级用户可通过环境变量精细控制行为：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `STEMDECK_DEMUCS_DEVICE` | auto | 强制设备：`cuda` / `mps` / `cpu` |
| `STEMDECK_DEMUCS_MODEL` | `htdemucs_6s` | 使用的 Demucs 模型 |
| `STEMDECK_MAX_DURATION_SEC` | `1200` | 最长处理时长（秒） |
| `STEMDECK_JOB_TTL_SECONDS` | `86400` | 任务目录自动清理时间 |

## 五、常见问题与解决方案

### Q1: 首次分离非常慢？

正常现象。首次运行时，StemDeck 需要从网上下载 Demucs `htdemucs_6s` 模型权重（约 170 MB），会显示在控制台日志中。下载完成后自动缓存，后续分离跳过此步骤。

### Q2: Demucs 跑在 CPU 上，没有 GPU 加速？

检查启动日志中 `device=` 的值：
- `device=mps`：Apple Silicon 正常工作
- `device=cuda`：NVIDIA GPU 正常工作
- `device=cpu`：未检测到 GPU，需确认驱动安装或 PyTorch 版本

对于 Apple Silicon，确保安装的是 ARM64 版本的 DMG（`arm64.dmg`），Intel 版本只能跑 CPU。

### Q3: Windows 版解压后无法运行？

确保解压路径不含中文字符或特殊空格。另外，如果系统没有安装 WebView2（Windows 11 自带，Windows 10 可能需要单独安装），Tauri 应用无法启动。

### Q4: 如何取消正在运行的任务？

分离过程中点击"Cancel"按钮，StemDeck 会立即终止 Demucs 子进程、删除未完成的任务目录并返回就绪状态，不会留下残留文件。

### Q5: 处理时长有限制吗？

默认最大处理时长为 1200 秒（20 分钟），超过此时长的音频会被拒绝。可以通过环境变量 `STEMDECK_MAX_DURATION_SEC` 调整上限。

## 六、总结

StemDeck 解决的是一个非常具体但需求量很大的痛点：**如何把一首歌的人声或伴奏单独提取出来**。传统方案要么需要付费云服务（Moises、LALAL.AI），要么需要复杂的命令行工具（Demucs 直接跑），而 StemDeck 把这两者用一种优雅的方式结合了——免费、本地、零门槛。

它的技术选型也很有章法：Demucs 4.0.1 的版本锁定、Tauri v2 的轻量化桌面壳、纯 JS 前端无构建依赖、环境变量全覆盖的配置体系——这些都是成熟工程思维的体现。如果你在做音乐制作、Karaoke 伴奏提取、AI 训练数据准备等场景，StemDeck 非常值得一试。

