---
title: "transcribe.cpp：基于 GGML 的 C/C++ 语音识别推理引擎"
date: 2026-07-21
description: "transcribe.cpp 是一个基于 ggml 运行时的 C/C++ 语音识别推理库，支持 Metal/Vulkan/CUDA 多后端加速，涵盖 16 个模型家族、60+ 变体，兼容 Whisper、Parakeet、Canary 等主流 STT 模型。"
author: "Cheman"
slug: transcribe-cpp
draft: false
categories: ["技术", "开源"]
tags: ["语音识别", "STT", "ggml", "C++", "机器学习"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**transcribe.cpp**，一个基于 ggml 运行时的 C/C++ 语音识别推理库，支持 Metal、Vulkan、CUDA 多后端 GPU 加速，兼容 16 个模型家族、60+ 变体，堪称语音识别领域的"llama.cpp"。

## 一、项目概述

transcribe.cpp 由 [handy-computer](https://github.com/handy-computer) 开发，旨在将各类主流语音识别（STT / Speech-to-Text）模型以 GGUF 格式跑在 ggml 运行时上，提供极致高效的本地推理能力。项目受到了 Mozilla AI & BiR Program 的支持，并获得 Hugging Face、Modal 和 Blacksmith 的赞助。

### 核心特性

- **多后端 GPU 加速**：Metal（Apple Silicon）、Vulkan（Linux/Windows）、CUDA（NVIDIA），以及 tinyBLAS 加速的纯 CPU 路径
- **16 个模型家族、60+ 变体**：Whisper、Parakeet、Canary、Moonshine、Qwen3-ASR 等，覆盖英文、中文、医学等专业场景
- **流式与非流式推理**：支持 streaming 和 batch 两种模式
- **GGUF 格式统一管理**：所有预编译 GGUF 模型托管在 Hugging Face [handy-computer](https://huggingface.co/handy-computer) 空间，每个模型都经过 WER（词错误率）验证
- **多语言绑定**：Python、TypeScript、Rust、Swift 官方 binding
- **MIT 许可证**，可自由嵌入商业项目

### 支持的模型家族

| 模型家族 | 简介 | 规模 |
|---|---|---|
| Parakeet (NVIDIA) | TDT/RNN-T/CTC，10 个变体 | 110M–1.1B |
| Canary | 英语/多语言 ASR | 180M–1B |
| Whisper | OpenAI Whisper 系列 | tiny ~ large-v3-turbo |
| Moonshine | 快速流式识别 | tiny/base/stream |
| Qwen3-ASR | 阿里 Qwen3 语音模型 | 0.6B/1.7B |
| SenseVoice | 阿里 FunAudioLM 系列 | small |
| Voxtral | Audio-LLM（含翻译） | mini-3B / small-24B |
| Granite Speech 4/4.1 | IBM Granite 系列 | 1B~2B+ |
| MOSS Transcribe-Diarize | 中英 ASR + 说话人分离 | - |
| MedASR | 英文医学听写 | Conformer+CTC |

## 二、技术原理

### 架构设计

transcribe.cpp 的架构参考了 llama.cpp 的成功经验：以 GGUF（Generic Gradient Unquantized Format）作为统一的模型格式，以 ggml（现在合并到 llama.cpp 生态）作为张量计算内核，通过 CMake 构建系统实现跨平台编译。

整体架构分为三层：

```
┌─────────────────────────────────────────────┐
│  公开 C API  (include/transcribe.h)          │  ← 单一头文件，对外接口
├─────────────────────────────────────────────┤
│  C++ 实现层 (src/arch/<model>/)             │  ← 各模型家族的具体实现
│  ggml 张量计算 (ggml/src/)                  │
├─────────────────────────────────────────────┤
│  后端适配层                                  │
│  ├─ Metal 后端 (Apple Silicon GPU)          │
│  ├─ Vulkan 后端 (通用 GPU)                   │
│  ├─ CUDA 后端 (NVIDIA GPU)                   │
│  └─ tinyBLAS/CPU 后端                        │
└─────────────────────────────────────────────┘
```

### 构建系统

CMakeLists.txt 的设计非常精妙，体现了工程化思维的深度：

**版本管理**：项目版本定义在 `include/transcribe.h` 中，CMake 通过正则表达式解析头文件中的 `TRANSCRIBE_VERSION_MAJOR/MINOR/PATCH` 宏，确保版本号单一数据源：

```cmake
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/include/transcribe.h" _transcribe_header)
string(REGEX MATCH "define +TRANSCRIBE_VERSION_MAJOR +([0-9]+)" _ "${_transcribe_header}")
set(TRANSCRIBE_VERSION_MAJOR "${CMAKE_MATCH_1}")
```

**Apple Silicon 自动检测**：

```cmake
set(TRANSCRIBE_IS_APPLE_SILICON OFF)
if(APPLE AND CMAKE_SYSTEM_PROCESSOR MATCHES "arm64|aarch64")
    set(TRANSCRIBE_IS_APPLE_SILICON ON)
endif()
# Metal 后端在 Apple Silicon 上默认开启
option(TRANSCRIBE_METAL "Enable Metal backend" ${TRANSCRIBE_IS_APPLE_SILICON})
```

**tinyBLAS 加速**：项目默认启用 Justine Tunney 的 llamafile_sgemm 内核，相比纯标量路径，CPU 端编码速度提升约 29%（q8_0 GEMM），且 WER 完全等价：

```cmake
# tinyBLAS (Justine Tunney's llamafile_sgemm CPU kernels): ~29% faster encoder on
# CPU (q8_0 GEMM), numerically WER-equivalent.
set(GGML_LLAMAFILE ON CACHE BOOL "" FORCE)
```

### 量化工具

`transcribe-quantize` 工具支持将 F32 GGUF 模型量化到多种精度，支持的预设包括：`F16`、`Q8_0`、`Q6_K`、`Q5_K_M`、`Q4_K_M`，满足不同场景对体积和精度的权衡需求。

### 动态后端模块（高级特性）

当 `TRANSCRIBE_GGML_BACKEND_DL=ON` 且 `TRANSCRIBE_BUILD_SHARED=ON` 时，每个计算后端（CPU 各 ISA tier、Vulkan、CUDA）会被编译为独立的动态库（`.so`/`.dylib`/`.dll`），运行时通过 `transcribe_init_backends()` 自动扫描加载，无 GPU 驱动时自动降级到 CPU，完全静默失败。

## 三、安装与快速开始

### 环境要求

- CMake ≥ 3.16
- C/C++ 编译器（Clang 或 GCC）
- 可选：CUDA Toolkit（NVIDIA GPU）、Vulkan SDK（Linux/Windows GPU）

### 构建（Apple Silicon Mac）

```bash
git clone https://github.com/handy-computer/transcribe.cpp
cd transcribe.cpp
cmake -B build
cmake --build build
# Metal 自动启用，无需额外配置
```

### 构建（Linux/Windows + Vulkan）

```bash
# Ubuntu/Debian
sudo apt install build-essential cmake libvulkan-dev glslc libopenblas-dev

cmake -B build -DTRANSCRIBE_VULKAN=ON
cmake --build build
```

### 构建（NVIDIA GPU + CUDA）

```bash
cmake -B build -DTRANSCRIBE_CUDA=ON
cmake --build build
```

### 下载模型并运行

```bash
# 从 Hugging Face 下载 GGUF 模型（以 Parakeet 为例）
# 模型详情见 https://huggingface.co/handy-computer

build/bin/transcribe-cli -m models/parakeet-tdt-0.6b-v2/parakeet-tdt-0.6b-v2-F32.gguf samples/jfk.wav
```

音频格式要求：**16 kHz 单声道 WAV**，其他格式需转换：

```bash
ffmpeg -i input.mp3 -ar 16000 -ac 1 output.wav
```

## 四、Python 快速上手

### 安装

```bash
pip install transcribe-cpp
```

### 使用

```python
from transcribe_cpp import Transcriber

# 加载 GGUF 模型
model_path = "path/to/model.gguf"
transcriber = Transcriber(model_path)

# 转写
result = transcriber.transcribe("audio.wav")
print(result.text)
print(f"语言: {result.language}, 置信度: {result.confidence:.2f}")

# 流式转写
for segment in transcriber.transcribe_streaming("live.wav", stream=True):
    print(f"[{segment.start:.2f}s - {segment.end:.2f}s] {segment.text}")
```

### 构建量化版本

```bash
# 克隆项目
git clone https://github.com/handy-computer/transcribe.cpp
cd transcribe.cpp

# 安装 uv（用于 NeMo 转换）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 将 Parakeet 模型转换为 GGUF（Q4_K_M 量化）
uv run --project scripts/envs/parakeet scripts/convert-parakeet.py nvidia/parakeet-tdt-0.6b-v2

# 量化
./build/bin/transcribe-quantize \
  models/parakeet-tdt-0.6b-v2/parakeet-tdt-0.6b-v2-F32.gguf \
  models/parakeet-tdt-0.6b-v2/parakeet-tdt-0.6b-v2-Q4_K_M.gguf \
  --quant Q4_K_M
```

## 五、常见问题与解决方案

### Q1：Mac 上 Metal 后端未生效？

检查是否在 Apple Silicon 机器上运行，以及 CMake 是否正确检测了 ARM 架构：

```bash
cmake -B build -DTRANSCRIBE_METAL=ON -DGGML_NATIVE=OFF
cmake --build build
```

> 注意：`GGML_NATIVE=OFF` 是官方 macOS wheel 的推荐配置，避免机器调优导致跨机器兼容性问题。

### Q2：Vulkan 找不到驱动？

Linux 上需要安装 Vulkan loader 和 ICD（Installable Client Driver）：

```bash
# NVIDIA
sudo apt install nvidia-vulkan-icd libvulkan-dev

# Intel / AMD
sudo apt install mesa-vulkan-drivers libvulkan-dev
```

Vulkan 模块不存在时会自动降级到 CPU，不影响运行。

### Q3：Windows 构建失败（MAX_PATH 限制）？

CMakeLists.txt 中已内置解决方案，将 ExternalProject 路径重定向到扁平结构 `<build>/e/src/`：

```powershell
cmake -B build -DTRANSCRIBE_VULKAN=ON
cmake --build build --config Release
```

### Q4：WER 测试不通过？

确保使用了正确的参考实现版本：

```bash
# 设置模型路径后运行测试
TRANSCRIBE_PARAKEET_GGUF=path/to/model.gguf ctest --test-dir build
```

所有官方发布的模型均经过 WER 验证，如有回归会立即修复。

### Q5：多语言模型选择困难？

| 场景 | 推荐模型 |
|---|---|
| 英文转写（速度优先） | Whisper tiny/en |
| 英文转写（质量优先） | Whisper large-v3-turbo |
| 中英双语 | MOSS Transcribe-Diarize |
| 医学听写 | MedASR |
| 实时流式 | Moonshine Streaming / Voxtral Realtime |
| 多语言会议 | Nemotron 3.5 ASR Streaming（40 locales） |

## 六、总结

transcribe.cpp 将 llama.cpp 的成功模式复制到了语音识别领域——用 GGUF 统一模型格式、用 ggml 提供高效张量计算、多后端无缝切换——再加上 16 个模型家族、60+ 变体的广泛覆盖，以及 Python/TypeScript/Rust/Swift 的官方 binding，真正做到了"一个库搞定所有主流 STT 模型"。

如果你需要在本地高效运行语音识别（无论是 Whisper、Parakeet 还是国产 SenseVoice），又希望避免 Python GIL 和云端 API 的延迟与成本，transcribe.cpp 值得一试。MIT 许可证也意味着它可以自由集成到任何商业产品中。
