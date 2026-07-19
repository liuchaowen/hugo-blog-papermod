---
title: "KTransformers：CPU-GPU 异构推理，让消费级硬件跑起超大 MoE 模型"
date: 2026-07-19
description: "KTransformers 是清华 MADSys 实验室开源的 CPU-GPU 异构大模型推理与微调框架，通过 AMX/AVX 加速、量化与专家调度，让 DeepSeek-R1/V3 等超大 MoE 模型在单张 24GB 显卡甚至纯 CPU 上高效运行，并提供与 LLaMA-Factory 集成的 SFT 微调能力。"
author: "Cheman"
slug: ktransformers
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, LLM推理, MoE, 量化, 大模型]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**KTransformers**（kvcache-ai/ktransformers）。它把"用消费级硬件跑起 DeepSeek-R1/V3 这类几百亿、上万亿参数的 MoE 大模型"从不可能变成了可复现的教程，核心思路是把 CPU 和 GPU 的算力拼接起来用。

## 一、项目概述

KTransformers 是清华大学 MADSys 实验室主导、Approaching.AI 与 9#AISoft 等共同参与的一个研究型项目，目标是**通过 CPU-GPU 异构计算，实现大语言模型的高效推理（Inference）与微调（SFT）**。

它最初因"单张 24GB 显卡 + 382GB 内存跑起 DeepSeek-R1/V3"而出圈，随后演化为今天以 `kt-kernel` 为核心的两条能力线：

- **Inference（推理）**：面向高性能异构服务的 kt-kernel，强调 CPU 端算子优化与 MoE 专家调度。
- **SFT（微调）**：KTransformers × LLaMA-Factory 集成，让超大 MoE 模型也能在有限显存下微调。

项目当前版本为 `0.6.3.post1`（见顶层的 `version.py`），主包 `ktransformers` 非常轻量，真正的运行时内核都在 `kt-kernel` 中。

```python
# ktransformers.py —— 顶层入口仅做版本与能力探测
def has_sft_support() -> bool:
    try:
        import kt_kernel.sft  # noqa: F401
    except Exception:
        return False
    return True
```

其定位不是"又一个推理引擎"，而是一套**把昂贵显存需求"卸载"到廉价 CPU 内存与磁盘**的工程方案，因此特别适合个人开发者、研究者和小团队。

## 二、技术原理

### CPU-GPU 异构与专家调度

MoE（混合专家）模型的显著特点是：每次推理只有少数"专家"被激活。KTransformers 的核心观察是——**把访问频繁的"热专家"放在 GPU，访问稀疏的"冷专家"卸载到 CPU/内存**，从而用很少的显存撬动超大规模权重。

它通过 **CPU-GPU Expert Scheduling（专家调度）**，结合 NUMA 感知的内存管理，让不同专家按热度分布在异构设备上。这也就是为什么 24GB 显存能跑原本需要数百 GB 显存的模型。

### AMX / AVX 加速与量化

CPU 端的算子性能是这套方案成立的前提。KTransformers 充分利用了 Intel 的硬件指令集：

- **AMX-INT8 / AMX-BF16**：在支持 AMX 的至强处理器上做 INT8/BF16 矩阵运算。
- **AVX512 / AVX2**：对不支持 AMX 的 CPU（甚至仅 AVX2 的型号）也提供后端。

权重侧支持 CPU 端 INT4/INT8 量化、GPU 端 GPTQ，以及 unsloth 的 1.58/2.51-bit 权重与 IQ1_S/FP8 混合权重。再配合 **FP8 GPU kernel**，DeepSeek-V3/R1 在 24GB 显存下即可获得更长上下文与更高吞吐。

### 原生精度与三层 Prefix Cache

除了量化，KTransformers 还支持 **Native BF16 和 FP8 per-channel 原生精度**，并在 v0.6 之前就实现了 **3 层（GPU-CPU-Disk）prefix cache 复用**——把前缀 KV 缓存按层级在不同存储介质间复用，显著降低重复前缀的推理成本。

### SFT：比 ZeRO-Offload 更快的微调

微调侧通过与 LLaMA-Factory 集成，在有限 GPU 内存下完成超大 MoE 的训练。官方基准显示：相比 ZeRO-Offload 有 **6-12 倍**的训练加速，且 CPU 内存占用约为旧路径的一半。

## 三、安装与快速开始

### 推理（kt-kernel）

```bash
cd kt-kernel
pip install .
```

### 微调（SFT，可选依赖）

```bash
pip install "ktransformers[sft]"
```

或直接通过 setup 的 extras 安装：

```bash
# setup.py 定义的可选依赖
# ktransformers[sft]  -> transformers-kt + accelerate-kt
# ktransformers[sglang] -> sglang-kt
pip install "ktransformers[sft]"
```

`pyproject.toml` 中要求 Python ≥ 3.11，且仅声明 `kt-kernel` 为核心依赖，把可选能力都收进 extras，安装非常干净。

## 四、使用方法与实战

### 推理：异构专家放置

最典型的使用场景是大 MoE 模型的 CPU-GPU 混合推理，以及接入 SGLang 做生产级服务。官方给出的性能示例：

| 模型 | 硬件配置 | 总吞吐 | 输出吞吐 |
|------|----------|--------|----------|
| DeepSeek-R1-0528 (FP8) | 8×L20 GPU + Xeon Gold 6454S | 227.85 tokens/s | 87.58 tokens/s（8 路并发）|

### 微调：与 LLaMA-Factory 联动

```bash
cd /path/to/LLaMA-Factory
pip install -e .
pip install -r requirements/ktransformers.txt
CUDA_VISIBLE_DEVICES=0,1,2,3 accelerate launch \
  --config_file examples/ktransformers/accelerate/fsdp2_kt_int8.yaml \
  src/train.py \
  examples/ktransformers/train_lora/qwen3_5moe_lora_sft_kt.yaml
```

官方在 4×RTX 4090 上微调 DeepSeek-V3/R1 达到约 3.7 it/s，1×RTX 4090 微调 Qwen3-30B-A3B 达到 8+ it/s。

### 极速跟进新模型

KTransformers 对新模型支持非常快（"Day0 Support"），已覆盖 MiniMax-M3、GLM-5.2、DeepSeek-V4-Flash、Kimi-K2.5、Qwen3-Next 等，并支持 Ascend NPU、Intel Arc、ROCm（AMD）等多后端。

## 五、常见问题与解决方案

**Q1：没有支持 AMX 的至强 CPU 还能用吗？**
可以。项目自 v0.6.1 起支持 **AVX2-only** CPU 后端，普通桌面 CPU 也能跑 kt-kernel 推理，只是吞吐会低一些。

**Q2：显存仍然不够怎么办？**
分层卸载是关键：把冷专家与权重进一步卸载到 CPU 内存甚至磁盘。早期版本曾把 DeepSeek-V2 所需显存从 21GB 降到 11GB；24GB 显存即可跑 DeepSeek-V3/R1 并支持更长上下文。

**Q3：SFT 提示缺少模块？**
需在安装时显式带上 `sft` extras（`pip install "ktransformers[sft]"`），否则 `kt_kernel.sft` 不可导入，`has_sft_support()` 会返回 `False`。

**Q4：想接入生产服务框架？**
KTransformers 提供了干净的 Python API 以便集成进 **SGLang** 等框架，并有清晰的多并发（multi-concurrency）与多 GPU 教程。

## 六、总结

KTransformers 的价值在于把"大模型推理/微调"的硬件门槛大幅拉低：通过 **CPU-GPU 异构 + 专家调度 + 量化/原生精度 + 分层缓存** 的组合拳，让消费级显卡甚至纯 CPU 也能跑起 DeepSeek-R1/V3 级别的超大 MoE 模型，并配套了与 LLaMA-Factory 联动的微调能力。如果你手头显存有限又想本地体验或微调前沿大模型，这是一个值得收藏并动手试一下的项目。

> 项目地址：https://github.com/kvcache-ai/ktransformers
> 相关论文：KTransformers（SOSP 2025，ACM SIGOPS）
