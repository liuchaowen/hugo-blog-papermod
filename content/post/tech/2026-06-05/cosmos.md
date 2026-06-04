---
title: "NVIDIA Cosmos 3：统一物理AI的世界模型平台"
date: 2026-06-05
description: "NVIDIA Cosmos 3 是一个开放的世界模型、数据集和工具平台，通过统一的Mixture-of-Transformers架构处理语言、图像、视频、音频和动作序列，为机器人、自动驾驶和智能基础设施构建物理AI。"
author: "Cheman"
slug: "cosmos"
draft: false
categories: ["AI", "开源", "物理AI"]
tags: ["NVIDIA", "Cosmos", "物理AI", "世界模型", "多模态", "机器人"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**NVIDIA/Cosmos**，这是 NVIDIA 最新发布的世界模型平台，旨在通过统一的多模态架构为物理AI系统提供世界理解、生成和推理能力。

## 一、项目概述

NVIDIA Cosmos 3 是一个开放平台，包含世界模型、数据集和工具，使开发者能够为机器人、自动驾驶车辆、智能基础设施等构建物理AI系统。

**核心特性：**
- **统一架构**：基于 Mixture-of-Transformers (MoT) 架构，支持语言、图像、视频、音频和动作序列的联合处理与生成
- **双运行模式**：Reasoner（推理器）用于世界理解和决策，Generator（生成器）用于世界生成和模拟
- **多模态输入输出**：支持文本、视觉、声音、动作等多种模态的灵活组合
- **生产级部署**：提供 Diffusers、vLLM-Omni、vLLM 和 NIM 多种集成路径

**模型家族：**
- **Cosmos3-Nano** (16B)：紧凑型全模态世界模型
- **Cosmos3-Super** (64B)：前沿级全模态世界模型
- **专用变体**：Text2Image、Image2Video、Policy-DROID 等任务特定模型

## 二、技术原理

### 2.1 模型架构

Cosmos 3 基于统一的 **Mixture-of-Transformers (MoT)** 架构，结合了：
- **自回归Transformer**（AR）：用于推理任务，通过因果自注意力处理语言和视觉理解token
- **扩散Transformer**（DM）：用于多模态生成任务，通过全注意力对噪声图像、视频、音频和动作token进行去噪

两种模式共享相同的Transformer架构、多模态注意力层和统一的 **3D多维旋转位置嵌入（mRoPE）**，能够在图像、视频、音频流和动作轨迹上保持一致的时空推理能力。

```python
# 架构示意图（简化）
# Cosmos 3 的统一 MoT 架构
# - AR Path: 因果自注意力 → 文本/推理输出
# - DM Path: 全注意力去噪 → 图像/视频/音频/动作输出
# - Shared: mRoPE位置编码 + 多模态注意力层
```

### 2.2 关键技术创新

**1. 全模态统一建模**
- 单一模型支持视觉-语言理解、视频生成、世界模拟、世界-动作模型
- 输入-输出配置高度灵活，可处理 5 种模态的任意组合

**2. 动作建模能力**
- 支持前馈动态（Forward Dynamics）：根据动作预测未来状态
- 支持逆动力学（Inverse Dynamics）：根据视频推断动作轨迹
- 支持策略学习（Policy）：视觉-语言条件下的机器人控制

**3. 多分辨率与时序支持**
- 分辨率层级：256p、480p、720p
- 长宽比：16:9、4:3、1:1、3:4、9:16
- 帧率：10/16/24/30 FPS
- 帧数：5-300 帧

### 2.3 推理与生成流程

**Reasoner 模式（文本输出）：**
```python
# 消息格式遵循 Qwen3-VL 兼容约定
messages = [
    {"role": "system", "content": [{"type": "text", "text": "You are a helpful assistant."}]},
    {"role": "user", "content": [
        {"type": "video_url", "video_url": "https://example.com/video.mp4"},
        {"type": "text", "text": "List the notable events with approximate timestamps."}
    ]}
]
```

**Generator 模式（视觉/音频/动作输出）：**
```python
# Diffusers 示例：文本到视频生成
from diffusers import Cosmos3OmniPipeline

pipe = Cosmos3OmniPipeline.from_pretrained(
    "nvidia/Cosmos3-Nano",
    torch_dtype=torch.bfloat16,
    device_map="cuda",
)
result = pipe(
    prompt="A mobile robot navigates a warehouse aisle.",
    num_frames=189,
    height=720,
    width=1280,
    fps=24,
    num_inference_steps=35,
    guidance_scale=6.0,
)
```

## 三、安装与快速开始

### 3.1 环境要求

- **操作系统**：Linux
- **GPU架构**：NVIDIA Ampere、Hopper 或 Blackwell
- **CUDA版本**：13.0（推荐）或 12.8
- **Python版本**：3.13+（推荐）

### 3.2 安装方法

**方法一：使用 Diffusers（研究/开发）**

```bash
# 创建虚拟环境
uv venv --python 3.13 --seed --managed-python
source .venv/bin/activate

# 安装依赖（自动匹配CUDA版本）
uv pip install --torch-backend=auto   "diffusers @ git+https://github.com/huggingface/diffusers.git"   accelerate av cosmos_guardrail   huggingface_hub imageio imageio-ffmpeg   torch torchvision transformers
```

**方法二：使用 vLLM-Omni（生产部署）**

```bash
# Docker 方式（推荐）
docker run --runtime nvidia --gpus all   -v ~/.cache/huggingface:/root/.cache/huggingface   -v "$(pwd):/workspace"   -p 8000:8000   --ipc=host   vllm/vllm-omni:cosmos3   vllm serve nvidia/Cosmos3-Nano   --omni   --model-class-name Cosmos3OmniDiffusersPipeline   --allowed-local-media-path /   --port 8000   --init-timeout 1800
```

### 3.3 快速开始：文本生成视频

```python
import torch
from diffusers import Cosmos3OmniPipeline
from diffusers.utils import export_to_video

# 加载模型
pipe = Cosmos3OmniPipeline.from_pretrained(
    "nvidia/Cosmos3-Nano",
    torch_dtype=torch.bfloat16,
    device_map="cuda",
)

# 生成视频
result = pipe(
    prompt="A mobile robot navigates a warehouse aisle and stops at a shelf.",
    negative_prompt="",
    num_frames=189,
    height=720,
    width=1280,
    fps=24,
    num_inference_steps=35,
    guidance_scale=6.0,
    enable_sound=False,
)

# 保存视频
export_to_video(result.video, "cosmos3_t2v.mp4", fps=24)
```

## 四、使用方法与实战

### 4.1 Reasoner 模式：世界理解

**应用场景：**
- 视频描述：生成详细字幕
- 时序定位：事件检测、时间戳查询
- 具身推理：机器人下一步动作预测
- 物理常识：物理合理性判断

**示例：视频问答**

```python
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8000/v1", api_key="not-used")

response = client.chat.completions.create(
    model="nvidia/cosmos3-nano-reasoner",
    messages=[{
        "role": "user",
        "content": [
            {"type": "video_url", "video_url": {"url": "https://example.com/robot.mp4"}},
            {"type": "text", "text": "What will the robot do next?"}
        ]
    }],
    max_tokens=256,
)
```

### 4.2 Generator 模式：世界生成

**应用场景：**
- 文本到图像/视频：根据描述生成视觉内容
- 图像到视频：从起始帧生成动画
- 带声音的视频：同步生成视觉和音频
- 前馈动态：根据动作预测未来状态

**示例：图像到视频（机器人操作）**

```bash
curl -sS -X POST http://localhost:8000/v1/videos/sync   --form-string "prompt=Robot arm picks up a red block."   --form "input_reference=@start_frame.png"   --form-string "num_frames=189"   --form-string "fps=24"   -o robot_pick.mp4
```

### 4.3 动作建模：策略与动力学

**Forward Dynamics（前馈动态）：**
```python
# 输入：文本 + 视觉 + 动作 → 输出：未来状态视频
result = pipe(
    prompt="Predict next 5 seconds",
    image=current_frame,
    action=action_sequence,
    num_frames=120,
)
```

**Policy Learning（策略学习）：**
```python
# 输入：文本 + 视觉 → 输出：动作轨迹 + 滚动视频
# 适用于 DROID、UR、Fractal、Bridge 等机器人平台
```

### 4.4 生产部署：vLLM-Omni API

**文本到视频 API 调用：**

```bash
curl -sS -X POST http://localhost:8000/v1/videos/sync   --form-string "prompt=A small warehouse robot moves a blue box."   --form-string "size=1280x720"   --form-string "num_frames=189"   --form-string "fps=24"   --form-string "guidance_scale=6.0"   --form-string 'extra_params={"guardrails":false}'   -o output.mp4
```

## 五、常见问题与解决方案

### 5.1 安装问题

**Q: `torch.cuda.is_available()` 返回 `False`？**
```bash
# 原因：torch CUDA版本与系统驱动不匹配
# 解决：指定正确的CUDA后端
uv pip install --torch-backend=cu128 torch torchvision
```

**Q: 导入时提示 `libxcb.so.1: cannot open shared object file`？**
```bash
# 安装缺失的图形库
apt-get install -y libxcb1 libgl1 libglib2.0-0
```

**Q: `uv` 安装或同步报错？**
```bash
# 升级 uv 到 >= 0.11.3
uv self update
```

### 5.2 运行时错误

**Q: 生成视频时间过长？**
- 首次运行需要下载模型权重（Cosmos3-Nano ~16B参数）
- 扩散推理需要遍历所有去噪步骤，长步时间是正常的
- 使用 vLLM-Omni 可加速生产推理

**Q: 如何选择合适的并行策略？**
```bash
# Cosmos3-Super (64B) 需要模型并行
vllm serve nvidia/Cosmos3-Super   --tensor-parallel-size 4   --enable-layerwise-offload   --init-timeout 1800
```

### 5.3 性能优化

**Q: 如何减少显存占用？**
- 使用 `Cosmos3-Nano` 而非 `Cosmos3-Super`
- 降低分辨率（480p 或 256p）
- 减少帧数（如 5-60 帧）
- 启用 `--enable-layerwise-offload`（vLLM）

**Q: 如何提高生成速度？**
- 使用 vLLM-Omni 或 NIM 生产部署
- 减少 `num_inference_steps`（如 20-30）
- 使用 `Cosmos3-Nano` 进行快速原型

### 5.4 兼容性问题

**Q: 支持哪些机器人平台？**
- 单臂机器人：DROID、UR、Fractal、Bridge、UMI（10D）
- 双臂机器人：双 DROID 臂（20D）
- 人形机器人：AgiBot（29D）
- 自动驾驶：9D动作空间

## 六、总结

NVIDIA Cosmos 3 是一个里程碑式的物理AI平台，通过统一的多模态世界模型架构，实现了视觉理解、视频生成、动作预测和世界模拟的端到端融合。其核心优势包括：

1. **统一架构**：单一模型处理 5 种模态，避免了多模型pipeline的复杂性
2. **灵活部署**：从 Python 研究环境（Diffusers）到生产API（vLLM-Omni、NIM）
3. **物理AI优先**：原生支持机器人、自动驾驶等具身智能场景
4. **开源生态**：提供 Cosmos Framework、Cosmos Curator、Cosmos Evaluator 等工具链

**适用人群：**
- 机器人学研究者：利用世界模型和策略学习进行机器人控制
- 自动驾驶工程师：进行场景生成、前馈动态预测
- 多模态AI开发者：构建支持视觉-语言-动作的应用
- 物理模拟开发者：生成合成数据、进行策略学习

**项目资源：**
- GitHub：https://github.com/NVIDIA/cosmos
- 技术报告：https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf
- Hugging Face：https://huggingface.co/collections/nvidia/cosmos3
- Cosmos Framework：https://github.com/NVIDIA/cosmos-framework

Cosmos 3 的发布标志着物理AI从分散的单任务模型向统一的世界模型迈出了重要一步，值得从事机器人、自动驾驶和多模态AI的开发者深入研究与应用。
