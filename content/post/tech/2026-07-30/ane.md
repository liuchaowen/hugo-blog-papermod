---
title: "ANE Training：在苹果神经引擎上训练神经网络的开源突破"
date: 2026-07-30
description: "ANE Training 是一个开源项目，通过逆向工程苹果私有 API，首次实现在 Apple Neural Engine (ANE) 上直接运行神经网络训练（前向+反向传播），支持 Stories110M 和 Qwen3-0.6B 等模型，INT8 量化可达 1.88 倍加速。"
author: "Cheman"
slug: ane
draft: false
categories: ["技术", "开源", "AI"]
tags: ["Apple Silicon", "ANE", "神经网络训练", "机器学习", "逆向工程"]
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

今天在 GitHub Trending 上看到一个令人兴奋的项目：**ANE Training**，它通过逆向工程苹果私有 API，首次实现在 Apple Neural Engine (ANE) 上直接运行神经网络训练（forward + backward pass），彻底绕过了 CoreML 仅支持推理的限制。

## 一、项目概述

ANE Training 是一个研究性质的开源项目，核心目标是证明在 Apple Neural Engine 上进行训练是可行的——瓶颈从来不是硬件能力，而是软件支持。

ANE 是苹果自研的神经网络加速器，在 M4 芯片上提供 **15.8 TFLOPS FP16** 的推理性能，但苹果官方并未开放其训练能力。该项目通过逆向 `_ANEClient`、`_ANECompiler` 等私有 API，绕过了这一限制，让 ANE 直接参与训练过程。

**核心特性：**
- 完全运行在 ANE 硬件上的前向传播和反向梯度计算（dx passes）
- Weight 梯度（dW）在 CPU 侧通过 Accelerate 框架的 cblas 计算
- 支持动态权重（无需每次重新编译 ANE 程序）
- INT8 W8A8 量化支持，最高带来 **1.88 倍**吞吐量提升
- 支持 GPU↔ANE 零拷贝流水线（GPU 预填充 + ANE 解码）
- 支持 Grouped-Query Attention (GQA)，适配 Qwen3 等现代模型架构

## 二、技术原理

### 2.1 核心架构：动态流水线

ANE Training 的关键创新在于"动态流水线"设计。传统方案中，神经网络权重作为常量编译进 ANE 程序，权重重就意味着重新编译（编译上限约 119 次/进程）。该项目将权重"打包"到空间维度（spatial dimension），让同一组 ANE 内核可以在不重新编译的情况下处理不同权重：

```objc
// 权重通过 IOSurface 共享内存传入，格式为 [1, channels, 1, spatial]
// 激活和权重打包进单一空间维度，内核内部再将其拆分
ANEIOSurfaceRef weightSurface = CreateWeightIOSurface(weights, channels, spatial);
ane_evaluate(handle, inputSurface, weightSurface, outputSurface);
```

### 2.2 私有 API 逆向

项目使用了三个核心私有 API：

| API | 作用 |
|-----|------|
| `_ANEClient` | ANE 客户端管理，创建和管理 ANE 请求 |
| `_ANECompiler` | 编译 MIL（Model Intermediate Language）程序为 ANE 可执行指令 |
| `_ANEInMemoryModelDescriptor` | 内存级编译，直接从 MIL 文本 + 权重 blob 生成 ANE 程序，无需写入磁盘 |

MIL 是 ANE 的中间表示，类似于编译器的前端 IR。项目动态生成 MIL 程序文本，描述卷积（线性层）、矩阵乘法（注意力机制）、Softmax、逐元素操作等计算图：

```objc
// MIL 程序片段示例：SDPA (Scaled Dot-Product Attention)
NSString *milProgram = @"
  input(%input: fp16[1, heads, seq, dim])
  matmul(%q: fp16, %k: fp16) -> %scores
  softmax(%scores) -> %attn
  matmul(%attn, %v: fp16) -> %output
  return %output
";
```

### 2.3 性能数据

**M4 芯片训练吞吐量实测：**

| 模型 | 参数量 | 架构 | ms/step |
|------|--------|------|---------|
| Stories110M | 109M | 12层 MHA | **91 ms** |
| Qwen3-0.6B | 596M | 28层 GQA | **412 ms** |

Stories110M 每层使用 6 个 ANE 内核（sdpaFwd、ffnFused、ffnBwdW2t、ffnBwdW13t、sdpaBwd1、sdpaBwd2）；Qwen3-0.6B 使用 10 个内核，因为 GQA 架构中 Q 和 KV 的维度不同，需要分离处理。

**INT8 W8A8 量化效果（M4, H16G）：**

| 配置 | FP16 | INT8 W8A8 | 加速比 |
|------|------|-----------|--------|
| 128×conv 512ch 64×64 | 18.6 TOPS, 14.8ms | 35.1 TOPS, 7.8ms | **1.88×** |

INT8 量化通过 `constexpr_affine_dequantize` 存储 int8 权重、`quantize`/`dequantize` 在层间切换，有效减少 L2 SRAM 带宽占用。

### 2.4 关键技术优化

- **Channel-first CPU 布局**：匹配 ANE IOSurface 的 `[1, C, 1, S]` 格式，消除所有 transpose 开销
- **vDSP 矢量化 RMSNorm**：比 naive 实现快 10 倍（6.7ms → 0.7ms）
- **GCD 异步 cblas 重叠**：dW 梯度矩阵乘法与 ANE 前向传播并行执行
- **延迟 cblas wait**：等待操作推迟到下一步前向传播内部，最大化流水线重叠度
- **ANE RMSNorm 融合**：将 RMSNorm 作为 MIL 操作融合进前向内核
- **Forward Taps**：Q、K、V、注意力分数和隐藏状态通过 concat 输出暴露，避免 CPU 重新计算
- **`exec()` 重启机制**：绕过 ANE 编译器约 119 次/进程的编译上限，通过进程重启恢复检查点继续训练

## 三、安装与快速开始

### 3.1 环境要求

- macOS 15+（已测试于 M4）
- Apple Silicon（M 系列芯片）
- Xcode 命令行工具

**注意：** 此项目使用私有、未公开记录的苹果 API，不在公共稳定性保证范围内，macOS 更新可能导致功能失效。

### 3.2 安装步骤

```bash
# 克隆仓库
git clone https://github.com/maderix/ANE.git
cd ANE

# 动态流水线（推荐方式）
cd training/training_dynamic

# 编译 Stories110M 模型（12层 MHA, 109M 参数）
make MODEL=stories110m

# 或者编译 Qwen3-0.6B 模型（28层 GQA, 596M 参数）
make MODEL=qwen3_06b
```

### 3.3 下载训练数据

```bash
cd training
bash download_data.sh
```

需要预分词（pre-tokenized）的 TinyStories 数据集。

### 3.4 开始训练

```bash
# 从随机初始化开始训练
./train --scratch

# 从检查点恢复训练
./train --resume
```

实时训练仪表盘（dashboard）可通过 `python3 dashboard.py` 启动。

## 四、使用方法与实战

### 4.1 基础训练流程

动态训练循环由 `train.m` 驱动，核心流程：

1. **初始化 ANE 运行时**：加载私有 API，建立与 ANE 的通信
2. **构建 MIL 程序**：根据模型配置生成对应的内核描述
3. **训练循环**：
   - 前向传播（ANE）→ 计算损失（CPU）→ 反向传播（ANE）→ 更新权重（CPU）
   - 每步通过 IOSurface 传递权重，避免重新编译
4. **检查点保存**：定期将权重状态写入磁盘，可通过 `exec()` 重启恢复

### 4.2 INT8 量化训练

```bash
# 使用 INT8 量化编译 benchmark
xcrun clang -O2 -fobjc-arc \
  -framework Foundation -framework IOSurface -ldl \
  -o ane_int8_bench ane_int8_bench.m

./ane_int8_bench
```

量化后 ANE L2 SRAM 带宽需求减半，吞吐量提升 1.88 倍，适合资源受限场景。

### 4.3 GPU↔ANE 混合推理流水线

```bash
# GPU 预填充 + ANE 解码（适合长序列推理）
./gpu_prefill_ane_decode
```

GPU 处理预填充阶段的长上下文，ANE 负责高效的逐 token 解码，两者通过 IOSurface 零拷贝共享数据：

| 模型 | GPU Prefill | ANE Decode | 总耗时 |
|------|-------------|------------|--------|
| Stories110M | 6.7ms | 1.9ms | 8.8ms |
| Qwen3-0.6B | 9.7ms | 2.3ms | 12.0ms |

## 五、常见问题与解决方案

**Q1: 编译时报错 `undefined symbol _ANEClient`？**
> ANE 私有 API 通过 `objc_msgSend` 运行时动态解析，需确保 macOS 15+ 和 Apple Silicon 环境。低版本系统或 Intel Mac 不支持。

**Q2: 训练时利用率很低（~5-9%）？**
> 这是当前版本的已知限制。许多逐元素操作（如 Softmax、SiLU）仍在 CPU 执行。可以通过融合更多操作到 MIL 内核来改善，作者正在持续优化。

**Q3: 出现 `0x1d` 错误？**
> ANE 对单次请求有单一输入约束。如果需要多输入，需将多个输入打包到空间维度中。

**Q4: 训练中途崩溃？**
> ANE 编译器存在资源泄漏，累积约 119 次编译后会耗尽资源。脚本通过 `exec()` 重启进程并从检查点恢复来解决这个问题。

**Q5: 能训练更大的模型吗？**
> 目前受限于 ANE SRAM 大小和单次编译的模型规模限制。 Stories110M (109M) 和 Qwen3-0.6B (596M) 已验证可行，更大规模模型是未来研究方向。

## 六、总结

ANE Training 是一个令人印象深刻的逆向工程研究项目，它用实际代码证明了 Apple Neural Engine 的训练潜力——AN E不仅仅是推理加速器，在正确的软件条件下同样可以运行完整的反向传播训练流程。虽然目前利用率仍偏低（5-9%），且依赖私有 API 存在版本兼容风险，但它为端侧 AI 训练开辟了一条全新的技术路径。随着对 MIL 编译器的深入理解和更多优化，这个方向的上限值得期待。

项目采用 MIT 许可证，欢迎 fork 和社区共建。详细研究背景可参考作者的三篇系列文章：
- [Part 1: Reverse Engineering](https://maderix.substack.com/p/inside-the-m4-apple-neural-engine)
- [Part 2: Benchmarks](https://maderix.substack.com/p/inside-the-m4-apple-neural-engine-615)
- [Part 3: Training](https://maderix.substack.com/p/inside-the-m4-apple-neural-engine-c8b)
