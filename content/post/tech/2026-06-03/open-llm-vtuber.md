---
title: "Open-LLM-VTuber：开源离线运行的 AI 虚拟伴侣，支持语音对话与 Live2D 形象"
date: 2026-06-03
description: "Open-LLM-VTuber 是一个支持实时语音对话、视觉感知和 Live2D 虚拟形象的 AI 伴侣项目，可完全离线运行，跨平台兼容 macOS/Linux/Windows，支持桌面宠物模式与丰富的 LLM/TTS/ASR 后端。"
author: "Cheman"
slug: open-llm-vtuber
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "Live2D", "语音交互", "虚拟伴侣"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**Open-LLM-VTuber**，它让你能在本地运行一个带有 Live2D 虚拟形象的 AI 语音伴侣，完全离线、跨平台，还能变成桌面宠物陪在你身边。

## 一、项目概述

Open-LLM-VTuber 是一个开源的语音交互 AI 伴侣项目，核心亮点在于：不仅支持**实时语音对话**和**视觉感知**，还配备了生动的 **Live2D 虚拟形象**，所有功能都可以完全离线运行在你的电脑上。

你可以把它当作个人的 AI 伴侣——无论是虚拟女友、男友、可爱宠物还是其他角色，它都能满足。项目完整支持 Windows、macOS 和 Linux，并提供网页版和桌面客户端两种使用模式，其中桌面客户端特别支持**透明背景桌面宠物模式**，让 AI 伴侣可以出现在屏幕任何位置。

### 核心特性一览

- 🖥️ 跨平台支持（macOS/Linux/Windows），支持 NVIDIA 和非 NVIDIA GPU
- 🔒 完全离线运行，对话数据保留在本地
- 🎯 丰富的交互：视觉感知、语音打断、触摸反馈、Live2D 表情、AI 主动说话
- 💻 网页版 + 桌面客户端，桌面宠物模式支持透明背景和全局置顶
- 🧠 大量模型后端：Ollama、OpenAI、Gemini、Claude、DeepSeek 等
- 🎙️ 多种 ASR/TTS 方案：sherpa-onnx、Whisper、Edge TTS、CosyVoice 等
- 🔧 高度可定制的角色外观、声音和人设

## 二、技术原理

### 架构设计

项目采用 **模块化架构**，核心分为以下几个层：

1. **前端层**：基于 Web 技术的 Live2D 渲染 + 音频采集/播放，通过 WebSocket 与后端通信
2. **后端服务层**：FastAPI + Uvicorn 提供的 WebSocket 服务器，协调各模块
3. **AI 管道层**：ASR（语音识别）→ LLM（大语言模型推理）→ TTS（语音合成）的完整管道
4. **Agent 层**：灵活的 Agent 实现，可继承接口集成 HumeAI EVI、Mem0 等架构

从 `run_server.py` 可以看到服务器启动流程：

```python
# 加载配置
config: Config = validate_config(read_yaml("conf.yaml"))
server_config = config.system_config

# 初始化 WebSocket 服务器
server = WebSocketServer(config=config)

# 异步初始化上下文
asyncio.run(server.initialize())

# 启动 Uvicorn
uvicorn.run(app=server.app, host=server_config.host, port=server_config.port)
```

### 核心技术栈

| 模块 | 技术选型 |
|------|----------|
| 后端框架 | FastAPI + Uvicorn + WebSocket |
| LLM 推理 | Ollama / OpenAI API / GGUF / vLLM |
| 语音识别 | sherpa-onnx / Faster-Whisper / FunASR |
| 语音合成 | sherpa-onnx / MeloTTS / GPTSoVITS / Edge TTS / CosyVoice |
| 前端渲染 | Live2D + WebSocket 客户端 |
| 包管理 | uv + pyproject.toml |
| 桌面客户端 | 透明背景窗口 + 全局置顶 |

### 数据流分析

语音交互的完整数据流：

```
麦克风音频 → ASR 模块（语音转文字）→ LLM 模块（生成回复）
    ↓                                        ↓
 语音打断检测                           内心想法 + 口头回复
    ↓                                        ↓
 回调处理                          TTS 模块（文字转语音）→ 扬声器
                                              ↓
                                    Live2D 表情映射 → 形象动画
```

### 关键设计模式

项目使用了**策略模式**来支持多种 AI 后端的灵活切换。通过配置文件 `conf.yaml` 即可在不同 LLM/ASR/TTS 实现间切换，无需修改代码。Agent 接口的设计也遵循开闭原则——继承并实现 `Agent` 接口即可集成新的 Agent 架构。

## 三、安装与快速开始

### 环境要求

- Python 3.10 - 3.12
- uv（Python 包管理器）
- ffmpeg（音频处理依赖）
- 可选：NVIDIA GPU（加速推理）

### 安装步骤

```bash
# 克隆仓库（含子模块）
git clone --recurse-submodules https://github.com/Open-LLM-VTuber/Open-LLM-VTuber.git
cd Open-LLM-VTuber

# 安装依赖
uv sync

# 复制并编辑配置文件
cp conf.yaml.example conf.yaml
# 编辑 conf.yaml 配置你的 LLM/ASR/TTS 后端

# 启动服务器
uv run run_server.py
```

启动后打开浏览器访问 `http://localhost:12393` 即可开始对话。

### 最简运行示例

使用 Ollama + Edge TTS 的离线方案：

1. 先安装并启动 Ollama，拉取一个模型：`ollama pull llama3`
2. 在 `conf.yaml` 中配置 LLM 为 Ollama，TTS 为 Edge TTS
3. 运行 `uv run run_server.py`

## 四、使用方法与实战

### 基础用法：语音对话

打开网页后，点击麦克风按钮即可开始语音对话。AI 会实时识别你的语音，生成回复并语音播报，同时 Live2D 形象会根据情绪做出表情变化。

### 进阶：视觉感知

启用摄像头或屏幕共享后，AI 可以"看到"你或你的屏幕内容，实现更丰富的交互场景：

```yaml
# conf.yaml 中启用视觉感知
vision:
  enable: true
  model: "openai"  # 使用支持视觉的模型
```

### 进阶：桌面宠物模式

桌面客户端支持切换为透明背景的桌面宠物，AI 伴侣可以在屏幕任意位置陪伴你：

- 支持透明背景、全局置顶
- 可设置鼠标点击穿透
- 拖拽 AI 伴侣到屏幕任意位置

### 定制你的角色

通过修改配置和导入自定义 Live2D 模型来定制角色：

```yaml
# 定制角色人设
system_prompt: |
  你是一个温柔可爱的猫娘助手，说话时会加上"喵~"

# 导入自定义 Live2D 模型
# 将模型文件放入指定目录即可
```

### TTS 翻译功能

一个有趣的功能：你可以用中文聊天，但让 AI 用日语声音说话：

```yaml
tts:
  translate_audio: true
  target_language: "ja"
```

## 五、常见问题与解决方案

### Q: 远程访问时麦克风无法使用？

浏览器要求安全上下文（HTTPS 或 localhost）才能使用麦克风。如果需要从其他设备访问，必须配置 HTTPS 反向代理。

**解决方案**：使用 Nginx/Caddy 配置 HTTPS 反向代理，或者仅在 localhost 访问。

### Q: 从 v1.0.0 之前版本升级失败？

v1.0.0 有破坏性变更，`conf.yaml` 不兼容，大部分依赖需要用 `uv` 重新安装。

**解决方案**：建议重新部署，参考最新的部署指南。升级可尝试 `uv run update.py`，但不保证兼容。

### Q: 桌面宠物模式在某些窗口管理器下异常？

Linux 下部分窗口管理器对透明背景和全局置顶支持不完善。

**解决方案**：优先使用 KDE Plasma 或 GNOME，或切换回网页版使用。

### Q: GPU 加速在 macOS 上效果如何？

macOS 上部分组件支持 GPU 加速（通过 Metal），但不如 NVIDIA CUDA 加速效果明显。

**解决方案**：使用支持 Apple Silicon 优化的模型（如 sherpa-onnx），或通过云 API 卸载计算密集型任务。

### Q: AI 会听到自己说话产生回声吗？

不会。项目实现了**无需耳机的语音打断**功能，AI 在播放语音时会自动屏蔽自身音频输入。

## 六、总结

Open-LLM-VTuber 是目前功能最全面的开源 AI 虚拟伴侣项目之一。它把 Live2D 形象渲染、实时语音交互、视觉感知、大语言模型推理等多个复杂模块优雅地整合在一起，同时保持了高度的可定制性和离线运行能力。无论你是想拥有一个桌面上的 AI 伙伴，还是研究多模态 AI 交互的技术方案，这个项目都值得深入探索。

项目目前正在规划 v2.0 的完全重写，感兴趣的开发者可以加入 Zulip 社区参与讨论。

🔗 项目地址：https://github.com/Open-LLM-VTuber/Open-LLM-VTuber
