---
title: "LongCat-Video：美团开源的 136 亿参数视频生成基础模型"
date: "2026-07-31"
description: "LongCat-Video 是美团长猫团队开源的 136 亿参数视频生成基础模型，统—支持文生视频、图生视频和视频续写三大任务，在长视频生成和高效推理方面表现优异。"
author: "Cheman"
slug: longcat-video
draft: false
categories: ["技术", "开源"]
tags: ["视频生成", "扩散模型", "开源", "美团", "AI"]
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

今天在 GitHub Trending 上看到一个重量级的开源项目：**LongCat-Video**，来自美团长猫团队，是一个拥有 136 亿参数的视频生成基础模型，统—支持文生视频（T2V）、图生视频（I2V）和视频续写三大任务。

## 一、项目概述

LongCat-Video 由美团长猫团队开源，发布于 2025 年 10 月，2026 年 5 月又发布了升级版 LongCat-Video-Avatar-1.5，支持音频驱动的人物视频生成。

### 核心特性

- **统一多任务架构**：一个模型同时支持 T2V、I2V、Video Continuation，无需多个专用模型
- **长视频生成**：原生在 Video Continuation 任务上预训练，可生成分钟级长视频，不出现色彩漂移或质量下降
- **高效推理**：采用时空级联生成策略 + Block Sparse Attention，720p 30fps 视频分钟级出图
- **多奖励强化学习**：通过 GRPO（Group Relative Policy Optimization）多奖励优化，在内部和公开基准上均达到与商业方案相当的性能
- **Avatar 能力**：支持单音频/多音频驱动的虚拟人物动画，支持唇形同步、视频续写

## 二、技术原理

### 模型架构

LongCat-Video 基于 Diffusion Transformer（DiT）架构，参数量 13.6B。核心技术选型：

- **UMT5 Encoder**：文本编码器，用于理解文本 prompt
- **Custom VAE**：视频压缩自编码器，用于潜空间压缩
- **Flow Matching**：采用流匹配替代传统 DDPM，提升生成效率
- **Flash Attention 2/3**：加速注意力计算，支持 xformers 可选

核心配置文件（`weights/LongCat-Video/dit/config.json`）中已默认启用 Flash Attention-2，可切换为 Flash Attention-3 或 xformers。

### 长视频生成策略

模型原生在 Video Continuation 任务上预训练，通过粗到细（Coarse-to-Fine）的时空级联生成策略，在时间和空间两个维度逐步提升分辨率和质量：

```python
# 单 GPU 推理示例
torchrun run_demo_long_video.py --checkpoint_dir=./weights/LongCat-Video --enable_compile

# 多 GPU 并行（context parallel）
torchrun --nproc_per_node=2 run_demo_long_video.py \
    --context_parallel_size=2 \
    --checkpoint_dir=./weights/LongCat-Video \
    --enable_compile
```

### 多奖励 GRPO 训练

LongCat-Video 采用 GRPO（Group Relative Policy Optimization）进行多奖励强化学习优化，综合考虑文本对齐、视觉质量、运动质量等多个维度，在内部基准和公开基准上均取得与 Veo3、PixVerse-V5 等商业方案相当的综合评分。

### Avatar 音频驱动原理

LongCat-Video-Avatar-1.5 使用 Whisper-Large-V3 作为音频编码器（相比 v1.0 的 Wav2Vec2 大幅提升唇形同步精度），通过以下流程生成音频驱动视频：

1. 语音分离：从原始音频提取人声（使用 Kim_Vocal_2 ONNX 模型）
2. 音频特征提取：将音频转换为 Embedding 序列
3. 音频-视频联合生成：DiT 同时接收文本、音频、参考图像/视频信息，生成连贯视频

## 三、安装与快速开始

### 环境要求

- Python 3.10
- CUDA 12.4 + PyTorch 2.6.0
- 至少 24GB 显存（推荐 40GB+）
- 多 GPU 推荐使用 NCCL 分布式

### 安装步骤

```shell
# 克隆仓库
git clone --single-branch --branch main https://github.com/meituan-longcat/LongCat-Video
cd LongCat-Video

# 创建 conda 环境
conda create -n longcat-video python=3.10
conda activate longcat-video

# 安装 PyTorch
pip install torch==2.6.0+cu124 torchvision==0.21.0+cu124 torchaudio==2.6.0 \
    --index-url https://download.pytorch.org/whl/cu124

# 安装 Flash Attention
pip install ninja psutil packaging
pip install flash_attn==2.7.4.post1

# 安装其他依赖
pip install -r requirements.txt

# 下载模型权重
pip install "huggingface_hub[cli]"
huggingface-cli download meituan-longcat/LongCat-Video --local-dir ./weights/LongCat-Video
```

### 快速推理示例

```shell
# 文生视频（单 GPU）
torchrun run_demo_text_to_video.py --checkpoint_dir=./weights/LongCat-Video --enable_compile

# 图生视频（单 GPU）
torchrun run_demo_image_to_video.py --checkpoint_dir=./weights/LongCat-Video --enable_compile

# 视频续写
torchrun run_demo_video_continuation.py --checkpoint_dir=./weights/LongCat-Video --enable_compile

# Avatar 音频驱动（1.5 版本，8 步蒸馏加速）
torchrun --nproc_per_node=2 \
    run_demo_avatar_single_audio_to_video.py \
    --context_parallel_size=2 \
    --checkpoint_dir=./weights/LongCat-Video-Avatar-1.5 \
    --stage_1=at2v \
    --input_json=assets/avatar/single_example_1.json \
    --use_distill \
    --model_type=avatar-v1.5 \
    --use_int8
```

## 四、使用方法与实战

### Streamlit 可视化界面

项目提供了 Streamlit 交互界面，无需命令行即可体验：

```shell
streamlit run ./run_streamlit.py --server.fileWatcherType none --server.headless=false
```

### Avatar 使用技巧

根据项目文档，以下技巧可显著提升 Avatar 生成质量：

- **唇形同步**：Audio CFG 值控制在 3~5 效果最佳
- **Prompt 优化**：使用更长、更描述性的提示词，包含人物外观、动作、场景上下文
- **减少重复动作**：设置 `--ref_img_index` 在 0~24 区间，或增大 `--mask_frame_range`
- **双人物视频**（1.5 版本）：合并模式需要等长双音频，拼接模式支持不等长输入
- **INT8 量化**：添加 `--use_int8` 可降低显存占用，仅支持 avatar-v1.5

### 性能数据参考

| 评测维度 | Veo3 | PixVerse-V5 | Wan 2.2-T2V-14B | **LongCat-Video** |
|---------|------|-------------|-----------------|-------------------|
| 文本对齐 | 3.99 | 3.81 | 3.70 | **3.76** |
| 视觉质量 | 3.23 | 3.13 | 3.26 | **3.25** |
| 运动质量 | 3.86 | 3.81 | 3.78 | **3.74** |
| 综合质量 | 3.48 | 3.36 | 3.35 | **3.38** |

## 五、社区与生态

- **VIPShop CacheDiT**：已提供完整缓存加速支持（ DBCache + TaylorSeer），实现约 1.7 倍加速且精度损失极小
- **HuggingFace**：模型权重和在线 Demo 均可访问
- **ModelScope**：国内镜像可用

## 六、总结

LongCat-Video 作为美团开源的首个视频生成基础模型，在 13.6B 参数规模下实现了与商业方案相当的生成质量，尤其在长视频生成方面具有原生优势。结合 LongCat-Video-Avatar-1.5 的音频驱动能力，该项目为 AI 视频创作提供了完整且可落地的开源解决方案，值得关注和深入研究。
