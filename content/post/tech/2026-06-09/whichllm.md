---
title: "whichllm：智能推荐适合你硬件的本地 LLM 模型"
date: 2026-06-09
description: "whichllm 是一款智能命令行工具，能够自动检测你的 GPU/CPU/RAM 配置，从 HuggingFace 上筛选出最适合你硬件的大语言模型，并提供性能预估、硬件规划、一键运行等强大功能。"
author: "Cheman"
slug: whichllm
draft: false
categories: [技术, 开源]
tags: [LLM, 本地模型, GPU, HuggingFace, Python, CLI]
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

今天在 GitHub Trending 上看到一个有意思的项目：**whichllm**，这是一款能够自动检测你的硬件配置并推荐最适合的本地大语言模型的智能工具，解决了"我的硬件能跑哪个模型"和"能跑的模型中哪个最好"两大核心问题。

## 一、项目概述

**whichllm** 是一个 Python 编写的命令行工具，它能够：

1. **自动检测硬件**：识别 NVIDIA/AMD GPU、Apple Silicon、CPU 核心数、RAM 等配置
2. **智能排名模型**：从 HuggingFace 抓取模型数据，基于基准测试分数、硬件适配度、推理速度等多维度进行综合评分
3. **提供实用功能**：硬件模拟、模型规划、一键运行、代码生成等

### 核心特性

- **证据驱动排名**：整合 LiveBench、Artificial Analysis、Aider、Chatbot Arena ELO 等多个权威基准测试数据
- **速度预估**：基于 GPU 带宽、量化方式、后端性能等因素预估推理速度（tok/s）
- **硬件感知**：支持 NVIDIA、AMD、Apple Silicon、CPU-only 等多种硬件配置
- **实时数据**：直接从 HuggingFace API 获取模型数据，保持数据新鲜度
- **脚本友好**：支持 JSON 输出，便于与其他工具集成

## 二、技术原理

### 2.1 数据流水线

whichllm 的数据处理流程分为三个关键步骤：

**1. 模型抓取**
- 从 HuggingFace API 获取热门模型（按下载量和新近更新排序）
- 单独查询 GGUF 格式模型以提高覆盖率
- 支持视觉模型（`image-text-to-text` 任务类型）

**2. 基准测试整合**
- **当前层级**：LiveBench、Artificial Analysis Index、Aider 等实时数据
- **冻结层级**：Open LLM Leaderboard v2、Chatbot Arena ELO 等稳定数据
- 不同层级设置不同的过期时间，避免过时数据影响排名

**3. 证据置信度系统**

| 证据级别 | 说明 | 置信度系数 |
|---------|------|-----------|
| `direct` | 精确模型 ID 匹配 | 1.0 |
| `variant` | 后缀移除或 Instruct 变体 | 0.85 |
| `base_model` | 基于 cardData 的基础模型 | 0.78 |
| `line_interp` | 模型家族内的大小感知插值 | 0.65 |
| `self_reported` | 上传者声称的评估结果 | 0.55 |

### 2.2 排名引擎

排名引擎是 whichllm 的核心，它由多个模块组成：

**硬件检测**（ `hardware/detector.py`）
- NVIDIA：通过 `nvidia-ml-py` 获取 GPU 信息
- AMD：通过 `dbgpu/ROCm` 检测 Linux 环境下的 AMD GPU
- Apple Silicon：通过 Metal 框架检测
- CPU：检测核心数、AVX 支持等

**VRAM 估算**（ `engine/vram.py`）
```
VRAM = 模型权重 + KV Cache + 激活内存 + 框架开销（约 500MB）
```

**兼容性判断**（ `engine/compatibility.py`）
- 全 GPU 加载
- 部分卸载（partial offload）
- 仅 CPU 模式

**速度预估**（ `engine/performance.py`）
```
tok/s = (GPU 内存带宽 × 量化效率 × 后端因子) / (模型参数量 × 每权重字节数)
```

**评分算法**（ `engine/ranker.py`）
- 基准测试质量（核心）：合并多个权威测试，按来源置信度加权
- 模型大小（最高 35 分）：使用 `log2` 缩放的世界知识代理（MoE 使用总参数量）
- 量化方式（乘法惩罚）：低比特量化会乘以惩罚系数
- 证据置信度（×0.55–1.0）
- 运行适配度（×0.50–1.0）：部分卸载 ×0.72，仅 CPU ×0.50
- 速度（-8 到 +8）：可用性门控
- 来源信任度（-5 到 +5）：官方组织奖励，已知重新打包者惩罚
- 流行度（决胜局）：下载量/点赞数

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.11+
- 推荐通过 `uv` 安装（更快的依赖解析）

### 3.2 安装方式

**方式一：一键运行（推荐）**
```bash
uvx whichllm@latest
```

**方式二：模拟硬件（购前测试）**
```bash
uvx whichllm@latest --gpu "RTX 4090"
```

**方式三：正式安装**
```bash
# 使用 uv
uv tool install whichllm
uv tool upgrade whichllm  # 更新

# 使用 Homebrew
brew install andyyyy64/whichllm/whichllm

# 使用 pip
pip install whichllm
```

### 3.3 最简运行示例

```bash
# 自动检测硬件并推荐最佳模型
whichllm

# 模拟特定 GPU
whichllm --gpu "RTX 4090"

# 仅使用 CPU
whichllm --cpu-only

# 输出 JSON 格式
whichllm --top 1 --json
```

## 四、使用方法与实战

### 4.1 基础用法

**查看硬件信息**
```bash
whichllm hardware
```

**获取推荐模型**
```bash
# 默认推荐前 10 个
whichllm

# 推荐前 20 个
whichllm --top 20

# 指定量化方式
whichllm --quant Q4_K_M

# 最低速度要求
whichllm --min-speed 30
```

**JSON 输出（脚本集成）**
```bash
whichllm --top 1 --json | jq
```

### 4.2 进阶用法

**硬件规划**
```bash
# 查看运行某个模型需要什么 GPU
whichllm plan "llama 3 70b"
whichllm plan "Qwen2.5-72B" --quant Q8_0
```

**升级对比**
```bash
# 对比不同 GPU 的性能
whichllm upgrade "RTX 4090" "RTX 5090" "H100"
```

**一键运行**
```bash
# 下载并运行最佳模型
whichllm run

# 运行指定模型
whichllm run "qwen 2.5 1.5b gguf"
```

**生成代码片段**
```bash
# 生成 Python 代码
whichllm snippet "qwen 7b"
```

### 4.3 实际项目示例

**示例 1：选择本地聊天模型**

假设我们想选择一个适合 RTX 4090 (24GB VRAM) 的本地聊天模型：

```bash
uvx whichllm@latest --gpu "RTX 4090" --top 5
```

输出示例：
```
#1  Qwen/Qwen3.6-27B     27.8B  Q5_K_M   score 92.8    27 t/s
#2  Qwen/Qwen3-32B       32.0B  Q4_K_M   score 83.0    31 t/s
#3  Qwen/Qwen3-30B-A3B   30.0B  Q5_K_M   score 82.7   102 t/s
```

whichllm 推荐 Qwen3.6-27B 而非更大的 Qwen3-32B，因为前者在基准测试中表现更好且是更新的一代。

**示例 2：购前硬件规划**

打算购买 RTX 5060 (16GB) 笔记本，想了解能运行哪些模型：

```bash
uvx whichllm@latest --gpu "RTX 5060 16"
```

**示例 3：与 Ollama 集成**

```bash
# 获取最佳模型 ID
MODEL_ID=$(whichllm --top 1 --json | jq -r '.models[0].model_id')

# 映射到 Ollama 模型名（需要手动映射）
ollama run $MODEL_ID
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：`pip install whichllm` 失败，提示 nvidia-ml-py 安装错误。

**解决方案**：
- 如果没有 NVIDIA GPU，可以使用 `--no-deps` 跳过 nvidia-ml-py 安装
- 或者使用 `uvx whichllm@latest` 一键运行，无需安装

### 5.2 运行时错误

**问题**：检测到错误的 GPU 信息。

**解决方案**：
- 更新显卡驱动
- 使用 `--gpu` 参数手动指定 GPU 型号
- 检查 `nvidia-smi` 是否正常工作（NVIDIA GPU）

**问题**：模型推荐结果不符合预期。

**解决方案**：
- 使用 `--refresh` 强制刷新缓存
- 检查网络连接，确保能访问 HuggingFace API
- 使用 `--evidence strict` 仅显示有直接基准测试数据的模型

### 5.3 性能问题

**问题**：推理速度预估不准确。

**说明**：速度预估基于理论计算，实际速度受多种因素影响：
- 后端实现（llama.cpp vs transformers）
- 系统负载
- 内存带宽实际利用率

可以使用 `whichllm run` 实际运行模型来获得真实速度。

### 5.4 兼容性问题

**问题**：Apple Silicon 或 CPU-only 模式下可选模型较少。

**说明**：这两种模式为了稳定性，仅推荐 GGUF 格式模型。如果需要更多选择，可以考虑：
- 使用 Ollama 等工具运行其他格式模型
- 在具有 NVIDIA GPU 的机器上使用

## 六、总结

**whichllm** 是一款设计精良的工具，它解决了本地 LLM 部署中的核心痛点：

1. **智能推荐**：不仅考虑"能不能跑"，更考虑"哪个最好"
2. **证据驱动**：基于真实基准测试数据，而非简单的尺寸启发式
3. **硬件感知**：深度理解不同硬件的特性，提供精准的 VRAM 和速度预估
4. **实用功能**：从硬件规划到一键运行，覆盖完整工作流

对于有本地运行 LLM 需求的开发者，whichllm 是一个值得收藏的工具。它既能帮助新手快速找到适合的模型，也能帮助老手进行硬件规划和性能对比。

**项目链接**：
- GitHub：https://github.com/Andyyyy64/whichllm
- PyPI：https://pypi.org/project/whichllm/

**适用场景**：
- 想本地运行 LLM 但不确定选择哪个模型
- 计划购买新 GPU，想了解能运行哪些模型
- 需要快速测试不同模型的性能
- 希望在脚本中集成模型选择逻辑
