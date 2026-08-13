---
title: "Needle 2：一个 14MB 的设备端工具调用模型，45M 参数跑满本地场景"
date: 2026-08-13
description: "Needle 2 是 Cactus Compute 开源的 45M 参数工具调用模型，仅 14MB 大小、28MB 内存即可完整运行，支持函数调用、设备控制、结构化数据提取，体积比同类小 5-70 倍。"
author: "Cheman"
slug: needle
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "模型压缩", "工具调用"]
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

今天在 GitHub Trending 上看到一个令人印象深刻的项目：**Needle 2**，一个仅 14MB 的开源工具调用模型，45M 参数，在约 28MB 内存中即可完成完整会话，比同类小模型（FunctionGemma 270M、LFM2.5 230M、Apple FM）体积缩小 5 到 70 倍，且精度不相上下。

## 一、项目概述

Needle 2 是 Cactus Compute 团队开源的设备端工具调用基础模型，核心定位是：**让 AI 函数调用能力真正跑在本地设备上**，而不依赖任何网络请求。它基于团队提出的 Simple Attention Network 架构，量化压缩至 CQ2-bit，最终打包成单文件 `.cact` 引擎。

核心特性如下：

- **极小体积**：权重仅 14MB，推理全程约 28MB RAM，适合手机、边缘设备
- **自包含引擎**：权重直接内嵌，无需下载额外模型文件，推理过程零网络
- **结构化输出**：工具调用直接返回 JSON，通过字节级 Grammar 约束保证输出合法
- **置信度门控**：每个响应附带校准置信分数，高于阈值执行，低于阈值escalate
- **工具检索**：工具目录大时，内置检索头只返回 top-5 相关工具，Grammar 只约束该子集
- **内存有界**：256-token 滑动窗口 + 工具固定为 KV sinks，长对话内存不膨胀
- **LoRA 微调**：可低成本微调，导出仍是单文件 `.cact`，无需重建推理引擎

## 二、技术原理

### Simple Attention Network 架构

Needle 2 的核心创新在于 Simple Attention Network（SAN），这是一种面向小模型的高效设计。与传统 Transformer 不同，SAN 用 Hadamard MLP 替代 FFN，引入 GQA 注意力、engram 键值记忆和多 lane 超连接：

每个 Block 的更新规则为：
- x̂ 是四个残差流的 RMS-normalised 展平
- H 是 Walsh-Hadamard 变换（固定矩阵，n log n 时间应用，无权重）
- (kₜ, vₜ) 从哈希 n-gram 表中提取
- P 是路由逻辑 A 的双重随机归一化，通过 Sinkhorn 迭代计算
- 所有 σ-gate 和 a, b, g 均为学习到的、输入依赖的参数

```python
# SAN Block 的示意逻辑（伪代码）
def san_block(x, kv_engram, routing_logits):
    x_norm = rms_norm(flatten_residual_streams(x))
    hadamard_out = H @ x_norm          # Walsh-Hadamard 变换，无权重
    kv = lookup_ngram_table(kv_engram) # engram 记忆查询
    routing = sinkhorn_iteration(routing_logits)  # 双重随机归一化
    x_new = sandwich_norm(hadamard_out + attention(routing, kv))
    return gated_activation(x_new)
```

Attention 和 MLP 残差均经过 sandwich-norm 和门控，engram 位置在两层触发，解码由声明 schema 编译的字节级 Grammar 约束。

### CQ2-bit 量化与权重打包

模型权重被量化至 CQ2-bit（Custom Quantization 2-bit），并直接打包进推理引擎。无需单独管理 `.bin` 或 `.safetensors` 文件，推理时直接加载：

```python
import needle

# 推理引擎自动从 Hugging Face 下载并缓存一次
agent = needle.Needle(tools=[my_tool])
response = agent.run("query with tool calls")
```

整个推理链路的内存占用始终控制在 ~28MB，与对话历史长度无关（滑动窗口机制保证）。

### Grammar 约束解码

工具调用返回的 JSON 格式完全由 Grammar 约束，不是"尽量生成合法 JSON"，而是"只能生成合法 JSON"：

```python
from typing import Annotated
import needle

@needle.tool
def send_money(
    amount: Annotated[float, needle.Field(gt=0, le=10000)],
    to: Annotated[str, needle.Field(pattern=r"^@[a-z0-9_]+$")],
    memo: Annotated[str, needle.Field(max_length=80)] = "",
):
    """Send money to a handle."""
    return {"sent": amount, "to": to}
```

`Field` 支持 `description`、`enum`、`ge`/`le`/`gt`/`lt`、`pattern`、`min_length`/`max_length`、`min_items`/`max_items` 等约束，全部编译进 Grammar，模型解码时只能输出满足约束的 token。

### 置信度门控机制

每个响应包含 `confidence` 字段，取以下两个信号的最小值：

1. **后验头（Post-hoc Head）**：对完整 prompt + 生成的调用进行评分
2. **解码概率（Decode Probability）**：调用 token 本身的生成概率

```json
{
  "type": "call",
  "success": true,
  "confidence": 0.94,
  "function_calls": [{"name": "set_lights", "arguments": {"room": "living room", "on": true, "brightness": 30}}],
  "reasoning": "'living room' -> room; 'dim' -> on true, brightness 30"
}
```

产品侧只需设定一个阈值，高于阈值执行调用，低于阈值路由到更大的模型或人工处理。

## 三、安装与快速开始

### 环境要求

- Python >= 3.9
- 硬件：任意支持 Python 的设备（推荐 256MB+ RAM）

### 安装

```bash
pip install cactus-needle
```

推理引擎首次运行时自动从 Hugging Face 下载并缓存，后续无需网络。

### 最简运行示例

```python
import needle

@needle.tool
def get_weather(city: str):
    """Get the current weather for a city."""
    return {"city": city, "temp_c": 27, "sky": "clear"}

agent = needle.Needle(tools=[get_weather])
result = agent.run("what's it like in Lagos right now?")
print(result["results"])
# [{'city': 'Lagos', 'temp_c': 27, 'sky': 'clear'}]
```

## 四、使用方法与实战

### 基础用法：装饰器自动 schema

用 `@needle.tool` 装饰函数，签名提供参数类型，docstring 提供工具描述：

```python
from typing import Literal

@needle.tool
def set_thermostat(temperature: int, mode: Literal["heat", "cool", "auto"] = "auto"):
    """Set the thermostat.

    Args:
        temperature: target temperature in Celsius
        mode: heating strategy to use
    """
    return {"temperature": temperature, "mode": mode}

agent = needle.Needle(tools=[set_thermostat])
agent.run("make it 21 and cool the room")
```

### 进阶用法：Grammar 约束与提取

通过 `needle.Field` 精细约束每个参数的值域：

```python
from pydantic import BaseModel
import needle

# 结构化数据提取：声明 schema，模型输出即为提取结果
invoice_schema = [{
    "name": "invoice",
    "description": "A purchase receipt",
    "parameters": {
        "type": "object",
        "properties": {
            "merchant": {"type": "string"},
            "total": {"type": "number"},
            "currency": {"type": "string"},
        },
        "required": ["merchant", "total"],
    },
}]

agent = needle.Needle(tools=invoice_schema)
response = agent.complete("Invoice from Acme Corp, $1,200.00, due 2026-09-01")
print(response["function_calls"])
# [{"name": "invoice", "arguments": {"merchant": "Acme Corp", "total": 1200.0}}]
```

### LoRA 微调

```bash
# Step 1: 合成数据（可选）
export OPENROUTER_API_KEY=sk-or-...
needle generate-data --tools my_tools.json --num-samples 500 --output data.jsonl

# Step 2: LoRA 微调
needle finetune data.jsonl --epochs 3 --generate 300 --lora-rank 16

# Step 3: 构建调优 .cact 文件
needle build checkpoints/needle2.pkl --lora checkpoints/needle_lora.pkl --out my_needle.cact

# Step 4: 运行调优模型
agent = needle.Needle(weights="my_needle.cact", tools=[...])
```

### 工具检索（大量工具场景）

当声明超过 5 个工具时，内置检索头自动介入，每轮只将 top-5 相关工具放入 context：

```python
agent = needle.Needle(tools=many_tools, tool_index_path="tools.idx")
# 首次运行嵌入所有工具 schema 到 disk
# 后续运行加载索引，避免重复嵌入
```

## 五、常见问题与解决方案

### Q1: 推理速度如何？
Needle 2 在普通 CPU 上约 850 tokens/秒解码速度（无 GPU）。在手机级别设备上完全可用，具体性能取决于设备算力。

### Q2: 如何处理 off-topic 请求？
模型会对无法由声明工具满足的请求返回空调用 `{"function_calls": []}`，产品侧可以据此路由到更大模型或人工处理，无需额外提示词工程。

### Q3: 模型能生成自由文本吗？
**不能**。Needle 2 的设计哲学是纯工具调用——所有输出都是结构化 JSON 调用，无自由文本生成。如果想获取最终答案，需要在工具执行后将结果反馈给模型，由模型继续推理。

### Q4: 如何确保参数约束的可靠性？
Grammar 约束在解码层面强制执行，模型**只能**生成满足所有 `Field` 约束的 token。这意味着 `gt=0`、`le=10000`、`pattern=...` 等约束是数学保证，不是提示词诱导。

### Q5: 调优后模型是否需要重新编译引擎？
**不需要**。`.cact` 文件与推理引擎解耦，调优后的权重仍以 `.cact` 格式分发，引擎无需任何改动。

## 六、总结

Needle 2 用 14MB 的体积和 45M 的参数量，在工具调用这个垂直场景做到了相当不错的精度水准，填补了"能跑在小设备上的小模型"这一空白。其 Grammar 约束解码和置信度门控两项设计尤其值得借鉴——前者解决了结构化输出的可靠性问题，后者解决了何时该信任模型的问题。对于需要在本地设备上运行 AI 能力（函数调用、设备控制、结构化提取）的开发者，Needle 2 值得一试。

> 项目地址：[https://github.com/cactus-compute/needle](https://github.com/cactus-compute/needle)  
> 模型权重：[https://huggingface.co/Cactus-Compute/needle2](https://huggingface.co/Cactus-Compute/needle2)
