---
title: "Google TimesFM：谷歌开源的时间序列基础模型"
date: 2026-06-18
description: "TimesFM 是 Google Research 开发的时间序列基础模型，支持 200M 参数、16K 上下文长度，可进行点预测和分位数预测，适用于金融、能源、零售等领域的时序预测任务。"
author: "Cheman"
slug: "timesfm"
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "时间序列", "深度学习", "Google", "基础模型"]
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

今天在 GitHub Trending 上看到一个重磅项目：**Google TimesFM**，Google Research 开源的时间序列基础模型，支持零样本时序预测，已经在 Google 内部多个产品中落地。

## 一、项目概述

TimesFM（Time Series Foundation Model）是 Google Research 开发的预训练时间序列基础模型，专为时间序列预测任务设计。该项目已于 ICML 2024 发表论文 [A decoder-only foundation model for time-series forecasting](https://arxiv.org/abs/2310.10688)。

核心特性：
- **Decoder-only 架构**：采用类似大语言模型的 decoder-only 架构处理时间序列
- **200M 参数**：TimesFM 2.5 将参数量从 500M 压缩至 200M，效率更高
- **16K 上下文长度**：支持最长 16384 的时间步输入，远超前代 2048
- **连续分位数预测**：通过可选的 30M 分位数头，支持最多 1000 步的连续分位数预测
- **多后端支持**：PyTorch 和 Flax（JAX）双后端，支持 GPU/TPU/Apple Silicon
- **企业级集成**：已集成到 BigQuery ML、Google Sheets 和 Vertex AI Model Garden

## 二、技术原理

### 架构设计

TimesFM 采用 **decoder-only Transformer 架构**，这与 GPT 系列的思路一致——通过自回归方式预测未来时间步。模型将时间序列视为一种"语言"，学习通用的时序模式，从而实现跨领域的零样本预测。

### 核心技术栈

从源码分析，TimesFM 的技术选型如下：

- **模型框架**：基于 HuggingFace Transformers，支持 `from_pretrained` 加载预训练权重
- **PyTorch 后端**：`torch>=2.0.0`，支持 `torch.set_float32_matmul_precision("high")` 加速
- **Flax 后端**：基于 JAX/Flax，支持 TPU 和 GPU 推理
- **XReg 协变量支持**：通过 `jax[cuda]` + `scikit-learn` 实现外部协变量输入
- **权重存储**：使用 `safetensors>=0.5.3` 安全序列化格式
- **微调支持**：通过 HuggingFace Transformers + PEFT（LoRA）实现高效微调

### 关键配置参数

从代码示例中可以提取核心预测配置：

```python
model.compile(
    timesfm.ForecastConfig(
        max_context=1024,           # 最大上下文长度
        max_horizon=256,            # 最大预测步长
        normalize_inputs=True,       # 输入归一化
        use_continuous_quantile_head=True,  # 启用连续分位数预测
        force_flip_invariance=True,   # 强制翻转不变性
        infer_is_positive=True,       # 推断值为正
        fix_quantile_crossing=True,   # 修复分位数交叉问题
    )
)
```

这些配置体现了 TimesFM 的设计哲学：**翻转不变性**（正向和负向序列应产生对称预测）、**输入归一化**（消除不同量纲的影响）、**分位数交叉修正**（确保分位数单调性）。

### 数据流分析

模型的推理流程为：
1. 输入原始时间序列数据（numpy array）
2. 内部归一化处理
3. Patch 化处理（将长序列切分为 patch）
4. Transformer encoder 处理
5. 自回归生成预测
6. 反归一化输出点预测和分位数预测

## 三、安装与快速开始

### 环境要求

- Python >= 3.10
- PyTorch >= 2.0.0（PyTorch 后端）或 JAX（Flax 后端）

### 安装方式

**推荐方式：通过 PyPI 安装**

```bash
# 使用 PyTorch 后端
pip install timesfm[torch]

# 使用 Flax 后端
pip install timesfm[flax]

# 需要 XReg 协变量支持
pip install timesfm[xreg]
```

**本地开发安装：**

```bash
git clone https://github.com/google-research/timesfm.git
cd timesfm
uv venv
source .venv/bin/activate
uv pip install -e .[torch]
```

### 最简运行示例

```python
import torch
import numpy as np
import timesfm

torch.set_float32_matmul_precision("high")

# 加载预训练模型（200M 参数版本）
model = timesfm.TimesFM_2p5_200M_torch.from_pretrained(
    "google/timesfm-2.5-200m-pytorch"
)

model.compile(
    timesfm.ForecastConfig(
        max_context=1024,
        max_horizon=256,
    )
)

# 对两条时序数据进行预测
point_forecast, quantile_forecast = model.forecast(
    horizon=12,
    inputs=[
        np.linspace(0, 1, 100),        # 线性序列
        np.sin(np.linspace(0, 20, 67)), # 正弦序列
    ],
)

print(point_forecast.shape)       # (2, 12) - 两条序列各12步点预测
print(quantile_forecast.shape)     # (2, 12, 10) - 包含均值+10个分位数
```

## 四、使用方法与实战

### 基础用法

模型的核心 API 非常简洁，`forecast()` 方法接收：
- `horizon`：预测步长
- `inputs`：时间序列列表（支持不同长度）

输出两个结果：
- `point_forecast`：点预测值，shape 为 `(batch, horizon)`
- `quantile_forecast`：分位数预测，shape 为 `(batch, horizon, 10)`，包含均值和第10到第90百分位数

### 进阶用法

**分位数预测**：启用 `use_continuous_quantile_head=True` 后，模型不仅输出点预测，还输出概率分布，适用于需要风险评估的场景（如金融风控、库存管理）。

**LoRA 微调**：项目提供了基于 HuggingFace PEFT 的微调示例，位于 `timesfm-forecasting/examples/finetuning/`，适合在特定领域数据上进一步优化。

**Agent 集成**：TimesFM 支持 Agent 调用模式，已提供 `AGENTS.md` 和 `SKILL.md`，可以通过 Vertex AI Model Garden 的 Docker化端点进行 agentic 调用。

### 实际应用场景

- **BigQuery ML**：企业级 SQL 查询，适合大规模时序预测
- **Google Sheets**：电子表格中的内置预测功能，适合日常数据预测
- **Vertex AI**：Docker 化端点，适合生产环境部署

## 五、常见问题与解决方案

### 安装问题

- **CUDA 版本不匹配**：PyTorch 和 JAX 的 CUDA 版本需要与系统 GPU 驱动匹配，建议参考官方安装指南选择对应版本
- **Apple Silicon 支持**：在 M 系列 Mac 上，PyTorch 使用 MPS 后端，JAX 需要单独配置

### 运行时问题

- **内存不足**：16K 上下文会占用大量显存，建议根据 GPU 显存合理设置 `max_context`（如 1024 或 2048）
- **分位数交叉**：理论上模型应保证分位数单调，但如果出现交叉，启用 `fix_quantile_crossing=True` 可自动修正

### 兼容性

- TimesFM 2.5 与 1.0/2.0 API 不完全兼容，旧版代码需迁移
- 可通过 `pip install timesfm==1.3.0` 安装旧版

## 六、总结

TimesFM 代表了时间序列预测领域的一个重要方向——将基础模型的理念引入时序分析。相比传统方法，它具备零样本跨域预测能力；相比其他时序大模型，它的 200M 参数量更加轻量，16K 上下文覆盖了大多数实际场景。作为 Google 内部已经在 BigQuery ML、Google Sheets 等产品中落地的模型，TimesFM 的工程成熟度值得信赖。对于从事金融预测、需求预测、异常检测等时序分析工作的开发者来说，这是一个值得关注和尝试的开源项目。

> 项目地址：[google-research/timesfm](https://github.com/google-research/timesfm)
