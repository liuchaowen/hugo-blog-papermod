---
title: "OmniVoice：支持600+语言的零样本TTS语音克隆模型"
date: 2026-09-09T16:05:00+08:00
description: "OmniVoice 是 k2-fsa 团队开源的零样本多语言文本转语音模型，支持超过600种语言，基于扩散语言模型架构，支持语音克隆、语音设计和细粒度控制，推理速度 RTF 低至 0.025。"
author: "Cheman"
draft: false
tags: ["TTS", "语音克隆", "零样本学习", "扩散模型", "开源", "GitHub"]
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

今天在 GitHub Trending 上看到一个非常有技术深度的项目：**OmniVoice**，由 k2-fsa 团队开源的零样本多语言 TTS 模型，支持超过 600 种语言的语音克隆与合成，推理速度达到实时的 40 倍。

## 一、项目概述

OmniVoice 是一个大规模多语言零样本文本转语音（TTS）模型，支持超过 600 种语言——这是目前零样本 TTS 模型中覆盖语言最广的。项目基于一种新颖的**扩散语言模型风格架构**，能够生成高质量语音，同时保持优越的推理速度。

核心特性包括：

- **600+ 语言支持**：零样本 TTS 领域最广的语言覆盖范围
- **语音克隆**：从短参考音频克隆任意说话人声音
- **语音设计**：通过说话人属性（性别、年龄、音调、方言/口音、耳语等）控制生成声音
- **细粒度控制**：支持非语言符号（如 `[laughter]`）和拼音/音素发音纠正
- **快速推理**：RTF 低至 0.025（比实时快 40 倍）
- **扩散语言模型架构**：简洁、可扩展的设计，兼顾质量与速度

项目已在 HuggingFace 发布预训练模型和在线 Demo，并提供了 Google Colab 笔记本供快速体验。

## 二、技术原理

### 架构设计

OmniVoice 采用**扩散语言模型风格架构**（Diffusion Language Model-style Architecture），这是一种将扩散模型与语言模型范式融合的设计方案。传统 TTS 系统通常基于 Tacotron、FastSpeech 或 VITS 等架构，而 OmniVoice 选择了扩散模型路线，通过迭代去噪过程生成语音特征，再经由声码器转换为最终波形。

这种架构的优势在于：

1. **生成质量高**：扩散模型在生成质量和多样性上优于传统自回归模型
2. **推理速度快**：通过优化扩散步数（默认 32 步，可降至 16 步），RTF 可低至 0.025
3. **可扩展性强**：架构设计简洁清晰，支持多 GPU 批量推理和 FlashInfer 加速

### 核心技术栈

从 `pyproject.toml` 可以看出项目的技术选型：

```toml
dependencies = [
    "torch>=2.4",
    "torchaudio>=2.4",
    "transformers>=5.3.0",
    "accelerate",
    "pydub",
    "gradio",
    "tensorboardX",
    "webdataset",
    "numpy",
    "soundfile",
    "librosa",
]
```

- **PyTorch 2.4+**：深度学习框架，支持 NVIDIA GPU、Apple Silicon MPS、Intel Arc XPU 三种后端
- **Transformers 5.3+**：用于加载 Whisper ASR 模型（自动转录参考音频）
- **Accelerate**：多设备推理调度
- **Gradio**：Web Demo 界面
- **WebDataset**：训练数据加载

### 三种生成模式

OmniVoice 提供三种语音生成模式，统一通过 `model.generate()` API 调用：

**1. 语音克隆（Voice Cloning）**：提供参考音频和参考文本，模型提取说话人特征并克隆声音。支持自动转录（省略 `ref_text` 时用 Whisper ASR 自动识别）。

**2. 语音设计（Voice Design）**：通过属性描述（性别、年龄、音调、口音等）控制生成声音，无需参考音频。支持英语口音（American、British 等）和汉语方言（四川话、陕西话等）。

**3. 自动语音（Auto Voice）**：模型自动选择声音，无需任何参考或指令。

### 语音克隆 Prompt 复用

一个实用的设计是**语音克隆 Prompt 持久化**：

```python
# 首次使用：编码参考音频并保存
prompt = model.create_voice_clone_prompt(
    ref_audio="ref.wav", ref_text="Transcription of the reference audio."
)
prompt.save("my_voice.pt")

# 后续会话：直接加载，跳过音频加载和自动转录
from omnivoice import VoiceClonePrompt
prompt = VoiceClonePrompt.load("my_voice.pt")
audio = model.generate(text="Hello again!", voice_clone_prompt=prompt)
```

这种设计避免了每次推理都重复处理参考音频，特别适合需要反复使用同一声音的场景。

### FlashInfer 加速

项目集成了 FlashInfer 内核加速，可实现 **2-2.9 倍无损加速**：

| 批次大小 | 基线 RTF | FlashInfer RTF | 加速比 |
|---------|---------|---------------|-------|
| 1 | 0.0899 | 0.0430 | 2.1x |
| 1 + CUDA Graph | — | 0.0367 | 2.4x |
| 4 | 0.0331 | 0.0152 | 2.2x |
| 8 | 0.0298 | 0.0115 | 2.6x |

加速手段包括：序列打包（CFG cond/uncond 对）、融合 RMSNorm/RoPE/GEMM 内核、可选 CUDA Graphs。单流场景推荐启用 CUDA Graphs，批次 ≥4 时普通 FlashInfer 路径已是最优。

## 三、安装与快速开始

### 环境要求

- Python ≥ 3.10
- PyTorch ≥ 2.4（支持 NVIDIA GPU、Apple Silicon、Intel Arc GPU）

### 安装步骤

**Step 1**：安装 PyTorch（按平台选择）

```bash
# NVIDIA GPU (CUDA 12.8)
pip install torch==2.8.0+cu128 torchaudio==2.8.0+cu128 \
    --extra-index-url https://download.pytorch.org/whl/cu128

# Apple Silicon
pip install torch==2.8.0 torchaudio==2.8.0

# Intel Arc GPU (XPU)
pip install torch torchaudio \
    --index-url https://pytorch-extension.intel.com/release-whl/stable/xpu/us/
```

**Step 2**：安装 OmniVoice

```bash
# PyPI 稳定版
pip install omnivoice

# 或从 GitHub 源码安装
pip install git+https://github.com/k2-fsa/OmniVoice.git
```

### 快速体验

无需写代码，三种方式快速体验：

```bash
# 本地 Web UI
omnivoice-demo --ip 0.0.0.0 --port 8001
```

或访问 [HuggingFace Space](https://huggingface.co/spaces/k2-fsa/OmniVoice) 在线体验，也可在 Google Colab 中运行。

> 国内用户如遇 HuggingFace 连接问题，可设置镜像：`export HF_ENDPOINT="https://hf-mirror.com"`

## 四、使用方法与实战

### 语音克隆实战

```python
from omnivoice import OmniVoice
import soundfile as sf
import torch

# 加载模型
model = OmniVoice.from_pretrained(
    "k2-fsa/OmniVoice",
    device_map="cuda:0",
    dtype=torch.float16
)
# Apple Silicon 用户：device_map="mps"
# Intel Arc GPU 用户：device_map="xpu"

# 语音克隆
audio = model.generate(
    text="你好，这是一个零样本语音克隆的测试。",
    ref_audio="ref.wav",
    ref_text="这是参考音频的转录文本。",
)
# 返回 np.ndarray 列表，24kHz 采样率

sf.write("output.wav", audio[0], 24000)
```

如果不提供 `ref_text`，模型会自动使用 Whisper ASR 转录参考音频。可通过 `asr_model_name` 指定本地 Whisper 模型，通过 `asr_device` 指定 ASR 运行设备。

### 语音设计实战

```python
# 通过属性描述生成语音
audio = model.generate(
    text="Hello, this is a test of voice design.",
    instruct="female, low pitch, british accent",
)
```

支持的属性维度：

| 属性 | 可选值 |
|------|-------|
| gender | male / female |
| age | child → elderly |
| pitch | very low → very high |
| style | whisper |
| English accent | American, British, ... |
| Chinese dialect | 四川话, 陕西话, ... |

### 非语言符号与发音纠正

```python
# 插入笑声等非语言符号
audio = model.generate(
    text="[laughter] You really got me. I didn't see that coming at all."
)

# 中文拼音纠正（多音字）
audio = model.generate(
    text="这批货物打ZHE2出售后他严重SHE2本了，再也经不起ZHE1腾了。"
)

# 英文音素纠正
audio = model.generate(
    text="He plays the [B EY1 S] guitar while catching a [B AE1 S] fish."
)
```

支持的非语言符号包括：`[laughter]`、`[sigh]`、`[confirmation-en]`、`[question-en]`、`[surprise-ah]`、`[surprise-oh]`、`[surprise-wa]` 等。

### 命令行批量推理

```bash
# 单条推理
omnivoice-infer \
    --model k2-fsa/OmniVoice \
    --text "This is a test for text to speech." \
    --ref_audio ref.wav \
    --output hello.wav

# 批量推理（支持多 GPU 分发）
omnivoice-infer-batch \
    --model k2-fsa/OmniVoice \
    --test_list test.jsonl \
    --res_dir results/ \
    --batch_size 8 \
    --enable_flashinfer true
```

批量推理的 JSONL 格式：

```json
{"id": "sample_001", "text": "Hello world", "ref_audio": "/path/to/ref.wav", "ref_text": "Reference transcript", "instruct": "female, british accent", "language_id": "en", "duration": 10.0, "speed": 1.0}
```

只有 `id` 和 `text` 是必填字段。

## 五、常见问题与解决方案

### 1. HuggingFace 模型下载失败

国内访问 HuggingFace 可能超时。设置镜像：

```bash
export HF_ENDPOINT="https://hf-mirror.com"
```

### 2. 参考音频选择建议

- 使用 **3-10 秒**的参考音频片段
- 过长的音频会降低推理速度并可能影响克隆质量
- 同语言参考音频发音更标准；跨语言克隆会带有参考音频语言的口音

### 3. 数字读法不正确

阿拉伯数字默认可能逐位读取。启用文本归一化：

```python
audio = model.generate(text="I have 2345 apples.", normalize_text=True)
```

需要安装额外依赖：`pip install "omnivoice[tn]"`（基于 WeTextProcessing）。macOS Apple Silicon 上 `pynini` 无预编译 wheel，需通过 conda 安装：`conda install -c conda-forge pynini`。

### 4. Apple Silicon 性能优化

使用 `device_map="mps"` 调用 Metal Performance Shaders。注意 `flash_attn` 在 MPS 上不可用，模型会自动回退到 SDPA。

### 5. 语音设计模式不稳定

语音设计主要在中英文数据上训练，对低资源语言可能产生不稳定结果。如需高质量输出，优先使用语音克隆模式。

## 六、总结

OmniVoice 在多语言 TTS 领域树立了新的标杆——600+ 语言覆盖、零样本语音克隆、扩散语言模型架构、RTF 0.025 的推理速度，加上 FlashInfer 加速和 Prompt 持久化等工程化设计，使其既能用于研究探索，也具备生产部署的实用性。项目支持 NVIDIA、Apple Silicon、Intel Arc 三大硬件平台，安装门槛低，API 设计统一清晰，是目前开源 TTS 生态中最值得关注的项目之一。

**项目地址**：[https://github.com/k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice)

**论文**：[arXiv:2604.00688](https://arxiv.org/abs/2604.00688)

**在线体验**：[HuggingFace Space](https://huggingface.co/spaces/k2-fsa/OmniVoice)
