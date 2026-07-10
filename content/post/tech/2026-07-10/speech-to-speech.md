---
title: "Hugging Face Speech-to-Speech：一站式语音对话开源引擎"
date: "2026-07-10"
description: "Hugging Face 开源的 speech-to-speech 是一个模块化、低延迟的语音对话流水线，支持 VAD→STT→LLM→TTS 全链路，通过 OpenAI Realtime 协议暴露 WebSocket 接口，所有组件均可替换，支持本地和云端部署。"
author: "Cheman"
slug: speech-to-speech
draft: false
categories: [技术, 开源]
tags: [Hugging Face, 语音识别, TTS, 语音合成, Python, 开源, LLM]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Hugging Face speech-to-speech**，一个开源的模块化语音对话引擎，用 `pip install speech-to-speech` 装好后，三行代码就能跑起一个完整的语音 AI 助手。

## 一、项目概述

speech-to-speech 是 Hugging Face 开源的低延迟、模块化语音代理（Voice Agent）流水线，核心架构为四阶段串接：

| 阶段 | 功能 | 默认后端 |
|------|------|----------|
| **VAD**（Voice Activity Detection） | 语音活动检测、打断处理 | Silero VAD v5 |
| **STT**（Speech-to-Text） | 语音转文字 | Parakeet TDT 0.6B |
| **LLM**（Language Model） | 生成文本回复 | OpenAI Responses API |
| **TTS**（Text-to-Speech） | 文字转语音流式回传 | Qwen3-TTS |

该流水线以 **OpenAI Realtime 协议**对外暴露 WebSocket 接口（`ws://localhost:8765/v1/realtime`），任何兼容 OpenAI Realtime 的客户端均可直接连接。它已在生产环境中驱动了数千台 Reachy Mini 机器人的对话后端。

项目地址：[huggingface/speech-to-speech](https://github.com/huggingface/speech-to-speech)

## 二、技术原理

### 2.1 流水线架构

四个组件运行在独立线程中，通过队列（Queue）连接，实现全链路流式处理：

```python
# 核心四阶段流水线示意
VoiceActivityDetection(VAD)   # Silero VAD v5，检测语音边界
        ↓ Queue
SpeechToText(STT)            # Parakeet TDT，语音→文本
        ↓ Queue
LanguageModel(LLM)            # OpenAI 兼容 API，生成回复
        ↓ Queue
TextToSpeech(TTS)            # Qwen3-TTS，流式合成语音
```

关键设计原则：**每个阶段都有多个可插拔后端**。从 STT 到 LLM 再到 TTS，均可通过 CLI 参数自由组合。

### 2.2 OpenAI Realtime 协议兼容

服务端实现了 OpenAI Realtime 协议的核心事件集：

```python
# 入站事件
input_audio_buffer.append  # 客户端上传音频
session.update             # 配置会话参数（VAD、指令等）
conversation.item.create   # 创建对话项
response.create            # 创建回复
response.cancel            # 取消当前回复（打断）

# 出站事件
speech_start / speech_stop       # 语音边界事件
conversation.item.input_audio_transcript.completed  # 最终转写文本
response.text.delta / response.audio_transcript.delta  # 流式输出
response.done                   # 回复完成
```

代码位于 `src/speech_to_speech/api/openai_realtime/`，服务端以 FastAPI + Uvicorn 托管 WebSocket 端点。

### 2.3 打断机制（Turn-Taking）

通过 VAD（Silero VAD v5）检测静音间隙来判断用户是否已说完，同时 LLM 回复过程中的打断也通过 `response.cancel` 事件实现。这确保了多轮对话的自然轮转体验。

### 2.4 多后端 LLM 支持

LLM 是端到端延迟最高的部分，项目支持多种部署方式：

- **Transformers**：直接用 transformers 库在本地 CUDA/CPU 运行
- **mlx-lm**：Apple Silicon 上的本地推理
- **vLLM / llama.cpp**：自建推理服务器
- **OpenAI / HF Inference Providers / OpenRouter**：云端 API

两个 API 后端：`responses-api`（默认，对应 `/v1/responses`）和 `chat-completions`（对应 `/v1/chat/completions`）。

### 2.5 全本地部署示例

```bash
# Terminal 1: llama.cpp 托管 Gemma 4
llama-server -hf ggml-org/gemma-4-E4B-it-GGUF -np 2 -c 65536 -fa on --swa-full

# Terminal 2: speech-to-speech 指向本地 LLM
speech-to-speech \
    --stt parakeet-tdt \
    --llm_backend responses-api \
    --tts qwen3 \
    --model_name "ggml-org/gemma-4-E4B-it-GGUF" \
    --responses_api_base_url "http://127.0.0.1:8080/v1" \
    --responses_api_api_key "" \
    --responses_api_stream \
    --enable_live_transcription
```

STT 和 TTS 默认走本地 GGML 或 Apple MLX，无需 GPU。

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.10+
- 至少一个可用的 LLM 后端（OpenAI API、云端服务，或本地 llama.cpp/vLLM）
- 音频设备（麦克风 + 扬声器，或通过 WebSocket 远程连接）

### 3.2 最简安装（默认组合）

```bash
pip install speech-to-speech
export OPENAI_API_KEY=sk-...
speech-to-speech
```

这会自动使用：
- **Parakeet TDT** → 本地 STT（CUDA 或 nano-parakeet）
- **GPT-5.4-mini**（OpenAI Responses API）→ LLM
- **Qwen3-TTS**（GGML，非 macOS）→ 本地 TTS

服务启动后监听 `ws://localhost:8765/v1/realtime`。

### 3.3 Apple Silicon Mac 最优配置

```bash
speech-to-speech --local_mac_optimal_settings
```

自动配置 MPS 设备、Parakeet STT、MLX LM 和 Qwen3-TTS（mlx-audio 6bit 量化），开箱即用。

### 3.4 Docker 一键部署

```bash
docker compose up
```

自动启动 llama.cpp（Gemma 4）+ TCP Socket 服务端，并暴露 8080、12345、12346 端口。

### 3.5 可选后端安装

```bash
pip install "speech-to-speech[kokoro]"        # Kokoro-82M TTS
pip install "speech-to-speech[pocket]"        # Pocket TTS（支持语音克隆）
pip install "speech-to-speech[chattts]"       # ChatTTS
pip install "speech-to-speech[faster-whisper]" # Faster Whisper STT
pip install "speech-to-speech[paraformer]"     # Paraformer STT（中文友好）
```

## 四、使用方法与实战

### 4.1 客户端连接（Python）

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8765/v1",
    websocket_base_url="ws://localhost:8765/v1",
    api_key="not-needed",
)

with client.realtime.connect(model="local") as conn:
    conn.send({
        "type": "session.update",
        "session": {
            "type": "realtime",
            "instructions": "You are a helpful assistant.",
            "audio": {
                "input": {
                    "turn_detection": {
                        "type": "server_vad",
                        "interrupt_response": True,
                    }
                }
            },
        },
    })

    for event in conn:
        print(event.type)
```

### 4.2 多语言支持

```bash
# 自动检测语言，LLM 以检测到的语言回复
speech-to-speech \
    --stt parakeet-tdt \
    --language auto \
    --llm_backend mlx-lm \
    --model_name "mlx-community/Qwen3-4B-Instruct-2507-bf16" \
    --enable_lang_prompt
```

STT、LLM、TTS 三端均可独立配置语言支持，需确保三者都覆盖目标语言。

### 4.3 更换 TTS 声音（Pocket TTS 克隆）

```bash
speech-to-speech \
    --tts pocket \
    --pocket_tts_voice jean \
    --pocket_tts_device cpu
```

Pocket TTS 支持预设声音（jean、alba、marius 等），也支持自定义语音文件克隆。

## 五、常见问题与解决方案

**Q: Qwen3-TTS 在 Linux 上报错找不到 CUDA 运行时？**
> 默认 GGML 车轮针对 CUDA 12.8 编译。CUDA 13.x 安装 `qwentts-cpp-python==0.3.0+cu130`，CUDA 12.4 用 `+cu124`，纯 CPU 用 `+cpu`：
> ```bash
> pip install "qwentts-cpp-python==0.3.0+cu124" \
>   -f https://huggingface.co/datasets/andito/qwentts-cpp-python-wheels/tree/main/whl/cu124
> pip install speech-to-speech
> ```

**Q: DeepFilterNet 和 Pocket TTS 同时安装冲突？**
> DeepFilterNet 需要 `numpy<2`，而 Pocket TTS 需要 `numpy>=2`。二者互斥，需要哪个单独装哪个。

**Q: vLLM 工具调用（tool call）Streaming 不可靠？**
> 切换到 `chat-completions` 后端（`--llm_backend chat-completions`），并加 `--responses_api_reasoning_effort none` 关闭推理，可解决部分 vLLM 构建上的工具调用流式输出问题。详见 [#312](https://github.com/huggingface/speech-to-speech/issues/312)。

**Q: 小模型回复语言和用户提问不一致？**
> 加 `--enable_lang_prompt`，会在每次用户语音后追加"请用...语言回复"的指令，大幅改善小模型（4B 等）的多语言表现。

## 六、总结

speech-to-speech 真正有价值的地方在于它的**全链路模块化**和**协议兼容性**——VAD/STT/LLM/TTS 四个阶段均可按需替换，配合 OpenAI Realtime 协议，让开发者可以自由选择用 OpenAI 的云服务还是 llama.cpp 全本地部署同一个应用。对于想在本地跑一个可打断、带语音的 AI 助手的开发者来说，这个项目是目前最完整的开源方案之一。

> GitHub：[huggingface/speech-to-speech](https://github.com/huggingface/speech-to-speech)
