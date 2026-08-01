---
title: "Voice-Pro：集语音识别、翻译与声音克隆于一体的开源配音神器"
date: 2026-08-02
description: "Voice-Pro 是基于 Whisper、F5-TTS、Edge-TTS 等开源模型打造的本地化 AI 配音工作流，一站式完成 YouTube 下载、人声分离、语音识别、翻译与多语言 TTS，是 ElevenLabs 的开源替代方案。"
author: "Cheman"
slug: voice-pro
draft: false
categories: [开源, 工具]
tags: [GitHub, 开源, AI, 语音处理, TTS, Whisper]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Voice-Pro**，它是一个把 YouTube 下载、人声分离、语音识别、翻译和语音合成打包进同一个 WebUI 的本地化 AI 配音工作流，可以理解为 ElevenLabs 的开源、可离线替代方案。

## 一、项目概述

Voice-Pro 是 ABUS（韩国团队）开源的 AI 多媒体处理软件，核心目标是降低多语言内容创作的门槛。它面向播客主、视频创作者、研究人员以及需要跨语言本地化的专业人士，把过去需要多个工具拼接的流水线收敛成一个应用：

- **顶级语音识别（ASR）**：支持 `Whisper`、`Faster-Whisper`、`Whisper-Timestamped`，覆盖 100+ 语言。
- **零样本声音克隆（Voice Cloning）**：基于 `F5-TTS`、`E2-TTS`、`CosyVoice`（含 Fun-CosyVoice3，支持韩语等 9 种语言）。
- **多语言语音合成（TTS）**：`Edge-TTS`（100+ 语言、400+ 音色）、`kokoro`（HuggingFace TTS Arena 排名第二），可选接入 Azure TTS。
- **YouTube 处理与音频提取**：基于 `yt-dlp`。
- **即时翻译**：`Deep-Translator` 覆盖 100+ 语言，可选 Azure Translator。

值得注意的是，团队在 3.2 版本后已将所有代码开源、完全免费，并明确表示因 WeConnect 项目开发，Voice-Pro 目前暂停更新（但仍可自由分发与修改）。

## 二、技术原理

### 架构与启动流程

整个应用采用「一键引导 + uv 锁定环境」的架构。`one_click.py` 中的 `OneClick` 类负责环境校验、修复与启动，关键设计是：所有依赖都装在项目内的 `installer_files/` 目录中，不污染系统 Python。

```python
class OneClick():
    install_dir = os.environ.get('INSTALL_DIR', os.path.join(script_dir, "installer_files"))
    env_path = os.environ.get('UV_PROJECT_ENVIRONMENT', os.path.join(script_dir, "installer_files", "env"))
    app_model_path = os.path.join(script_dir, "model")

    @classmethod
    def gpu_choice(cls):
        # GPU_CHOICE env var > choice saved by start/update scripts > CPU
        choice = os.environ.get("GPU_CHOICE", "").upper()
        if not choice:
            saved = os.path.join(cls.install_dir, "gpu_choice.txt")
            if os.path.exists(saved):
                choice = open(saved).read().strip().upper()
        return choice if choice in ("G", "C") else "C"
```

GPU/CPU 的自动探测逻辑如上：优先读环境变量 `GPU_CHOICE`，其次读启动脚本写入的 `gpu_choice.txt`，默认回退到 CPU。

### 依赖管理与版本锁定

v4.0 最大的工程改进是把安装器从 Miniconda/pip 迁移到 **uv**，通过提交的 `uv.lock` 实现完全可复现的安装：

```toml
[project]
name = "voice-pro"
version = "4.0.0"
requires-python = ">=3.12,<3.13"

dependencies = [
    "openai-whisper==20250625",
    "faster-whisper==1.2.1",
    "whisper-timestamped==1.15.9",
    "gradio==6.20.0",
    "edge-tts>=7.2.8",
    "f5-tts==1.1.21",
    "kokoro==0.9.4",
    "spacy>=3.8,<3.9",
    "demucs==4.0.1",
    "yt-dlp>=2025.9.26",
]

[project.optional-dependencies]
gpu = ["torch==2.8.0", "torchvision==0.23.0", "torchaudio==2.8.0", "onnxruntime-gpu==1.26.0"]
cpu = ["torch==2.8.0", "torchvision==0.23.0", "torchaudio==2.8.0"]
```

技术栈选型上有几个值得关注的细节：

- **运行时升级到 Python 3.12 + Torch 2.8.0+cu128**，支持 RTX 50 系显卡；移除了对 CUDA Toolkit 与 Visual Studio Build Tools 的依赖，PyTorch 自带 CUDA runtime，所有依赖以预编译 wheel 形式分发。
- **WhisperX 被移除**：其 `huggingface-hub<1.0` 的版本钉死阻碍了 Gradio 6 升级，旧配置自动回退到 faster-whisper。
- **CosyVoice 改为 vendored 打包**，避免上游 API 漂移，并针对 `transformers==5.13.0` 打了两处 Qwen 行为补丁，否则 CosyVoice2/3 会静默合成错误内容。
- **pyopenjtalk 替换为 pyopenjtalk-plus**：前者仅 sdist 且需 MSVC+CMake 编译，后者提供预编译 wheel，解决了 misaki[ja] 在 Windows 上的构建难题。

### 数据流

一次典型的「视频→多语言配音」流程：

1. `yt-dlp` 下载 YouTube 视频并提取音频；
2. `Demucs`（`MDX-Net`）做人声/伴奏分离，得到干净语音；
3. Whisper 系列做语音识别，生成带时间戳的字幕（SRT/ASS/SSA）；
4. `Deep-Translator`（或 Azure Translator）翻译为目標语言；
5. F5-TTS / CosyVoice / Edge-TTS 基于参考音色合成目标语言语音；
6. 混流输出 WAV / FLAC / MP3，并内嵌多语字幕轨道。

启动脚本 `start-voice.py` 中显式提前加载 `torch` 与 `pyarrow.dataset`，以固定 Windows 下 DLL 加载顺序，避免 gradio→torch→pyarrow.dataset 顺序导致的原生崩溃——这是实战中踩过的坑。

## 三、安装与快速开始

### 环境要求

- **OS**：Windows 10/11（64 位）为主，Linux、Mac（Apple Silicon）亦可（官方主要验证 Windows + NVIDIA GPU）。
- **GPU**：NVIDIA，驱动 ≥ 570（建议），支持 RTX 50 系；无需单独安装 CUDA Toolkit。
- **VRAM**：4GB+（8GB+ 更佳）；**RAM**：4GB+；**存储**：20GB+ 空闲空间。

### 安装步骤

```bash
# 1. 获取代码
git clone https://github.com/abus-aikorea/voice-pro.git
cd voice-pro

# 2. 初始化环境（需管理员权限，可选）
configure.bat      # Windows；Mac/Linux 用 configure.sh

# 3. 启动（首次会下载 uv + Python 3.12 并安装依赖，随后下载约 10GB 模型）
start.bat          # Mac/Linux 用 start.sh
```

`start.bat` 首次运行会：自动下载 uv 与 Python 3.12 并按 lockfile 安装依赖（分钟级），随后下载 AI 模型（约 10GB，这是最慢的一步）。GPU/CPU 自动探测，可用 `GPU_CHOICE` 环境变量覆盖（`G`=NVIDIA，`C`=CPU）。

> 提示：绝大多数问题可通过删除 `installer_files` 文件夹后重跑 `start.bat` 解决（干净重装只需几分钟，`model/` 中的模型会被保留）。

## 四、使用方法与实战

WebUI 主要分为四个标签页：

- **Dubbing Studio（配音工作室）**：一站式中枢，集成下载、降噪、字幕、翻译、TTS，支持所有 ffmpeg 兼容格式，输出 WAV/FLAC/MP3。
- **Whisper Caption**：字幕专用，90+ 语言，视频内嵌字幕显示，支持词级高亮与降噪。
- **Translate**：100+ 语言翻译，支持字幕文件（ASS/SSA/SRT），实时语音识别与翻译。
- **Speech Generation**：Edge-TTS、F5-TTS、CosyVoice、kokoro 任选，适合做名人音色播客与多语言内容。

例如，想把一段英文播客配音成韩文：在 Dubbing Studio 导入音频/视频 → Whisper 识别生成英文字幕 → 翻译为韩文 → 在 Speech Generation 选 CosyVoice 的 Fun-CosyVoice3-0.5B（含韩语）做零样本克隆合成 → 导出带韩文字幕的音视频。

### 可选：接入 Azure 提升质量

默认使用免费服务（Google 端点的 Deep-Translator + Edge-TTS）。若有自己的 Azure 订阅，可复制 `.env.example` 为 `.env` 并填入密钥，重启后自动切换到 Azure Translator 与 Azure-TTS，规避企业网络对免费端点的限速/封禁：

```ini
# Azure Speech Service (TTS)
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=eastus

# Azure Translator Service
AZURE_TRANSLATOR_KEY=your_azure_translator_key_here
AZURE_TRANSLATOR_ENDPOINT=https://your-translator-resource.cognitiveservices.azure.com/
AZURE_TRANSLATOR_REGION=eastus
```

## 五、常见问题与解决方案

- **浏览器未自动打开**：关闭 Windows 命令窗口后重跑 `start.bat`；或直接访问命令窗口显示的地址（如 `http://127.0.0.1:7870`）。
- **CUDA 显存不足（OOM）**：在任务管理器查看 GPU 占用；将 Denoise 级别调为 0 或 1（级别 2 需 ≥8GB 显存）；Compute Type 改为 int 量化类型以降低显存占用。
- **字幕质量不佳**：更大 Whisper 模型通常更好（large > medium > small > base > tiny）；float 计算类型质量更好但更耗显存；提高 Denoise 级别可在背景音重时提取更干净的人声（但不保证总是更好）。
- **安装/依赖异常**：删除 `installer_files` 后重跑启动脚本；`update.bat` 可按 lockfile 精确重建 Python 环境（很快）。`.env` 切勿提交到版本库，含私钥。
- **网络限速导致翻译失败**：v4.0 已对免费 Google 端点做退避重试，失败行会保留原文并给出告警，必要时切换 Azure Translator。

## 六、总结

Voice-Pro 把一整套「下载→分离→识别→翻译→合成」的 AI 配音流水线收敛进一个本地、免费、可离线运行的 WebUI，对需要多语言内容本地化的创作者非常友好。虽然团队目前因 WeConnect 项目暂停更新，但已开源全部代码，技术栈也紧跟前沿（uv 锁环境、Gradio 6、Torch 2.8、F5-TTS 1.1、Fun-CosyVoice3）。如果你的工作流涉及字幕生成、跨语言配音或声音克隆，它值得作为 ElevenLabs 之外的开源候选方案一试。

> 项目地址：<https://github.com/abus-aikorea/voice-pro>
