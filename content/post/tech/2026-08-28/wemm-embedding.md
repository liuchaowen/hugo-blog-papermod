---
title: "腾讯开源 WeMM-Embedding：统一多模态嵌入模型的新标杆"
date: 2026-08-28
description: "WeMM-Embedding 是腾讯微信团队推出的通用多模态嵌入模型，支持文本、图像、视频、视觉文档等多种输入，在 MMEB-v2 和 v3 基准测试中取得 SOTA 性能，提供 2B、4B、9B 三个规模，支持 Matryoshka 嵌套嵌入技术实现灵活的向量维度控制。"
author: "Cheman"
slug: wemm-embedding
draft: false
categories: ["技术", "AI", "多模态"]
tags: ["GitHub", "开源", "嵌入模型", "多模态", "腾讯", "向量检索"]
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

今天在 GitHub Trending 上看到一个值得关注的项目：**WeMM-Embedding**，这是腾讯微信团队开源的通用多模态嵌入模型，在多个基准测试中取得了领先性能。

## 一、项目概述

WeMM-Embedding 是由腾讯微信视觉团队开发的多模态嵌入模型家族，旨在为文本、图像、视频、视觉文档以及交错多模态输入提供统一的向量表示。该项目已在 MMEB-v2 和 MMEB-v3 等多个权威基准测试中取得了 SOTA（State-of-the-Art）性能。

### 核心特性

- **统一表示能力**：支持文本、图像、视频、视觉文档等多种输入类型的统一嵌入表示
- **多规模模型**：提供 2B、4B、9B 三个参数规模，满足不同场景需求
- **Matryoshka 嵌入**：支持嵌套嵌入技术，允许在多个维度（64-4096）灵活截断而不显著损失性能
- **工业级部署**：支持 vLLM 和 SGLang 两种主流推理框架

## 二、技术原理

### 架构设计

WeMM-Embedding 基于 Vision-Language Model（VLM）架构，通过专用的 `<embedding>` token 提取最后一层隐藏状态，经过 L2 归一化后得到最终嵌入向量。这种设计使得模型能够为任意多模态输入生成统一的向量表示。

### 核心技术栈

```
torch
transformers==5.2.0
qwen-vl-utils[decord]==0.0.14
sentence-transformers==5.7.0
accelerate>=1.1.0
```

项目推荐使用 `transformers==5.2.0` 以确保推理一致性和可重现性，因为新版本可能存在预处理行为差异。

### Matryoshka 嵌套嵌入技术

这是 WeMM-Embedding 的一大亮点。模型支持在多个预定义维度上截断嵌入向量，仅需重新归一化：

```python
# 截断到指定维度 d，然后重新归一化
embedding = torch.nn.functional.normalize(embedding[..., :d], dim=-1)
```

在 MMEB-v2 基准测试中，2B 模型在 256 维度下仍保留了 98.7% 的完整维度性能，这对于需要灵活向量维度的检索系统极具价值。

### 数据流分析

1. **输入预处理**：文本、图像、视频分别通过对应模态的预处理器
2. **统一编码**：所有模态输入经过 VLM 主干网络编码
3. **嵌入提取**：从 `<embedding>` token 位置提取隐藏状态
4. **归一化输出**：L2 归一化得到最终嵌入向量

## 三、安装与快速开始

### 环境要求

- Python 3.6+
- PyTorch（建议 CUDA 11.0+）
- transformers 5.2.0（固定版本）

### 安装步骤

```bash
git clone https://huggingface.co/tencent/WeMM-Embedding-2B
cd WeMM-Embedding-2B
pip install -r requirements.txt
```

### 最简运行示例

使用 Transformers 推理：

```bash
python examples/transformers_inference.py \
  --model tencent/WeMM-Embedding-2B \
  --image /path/to/image.jpg \
  --video /path/to/video.mp4 \
  --dimension 2048
```

使用 Sentence Transformers 推理：

```bash
python examples/sentence_transformers_inference.py \
  --model tencent/WeMM-Embedding-2B \
  --image /path/to/image.jpg \
  --video /path/to/video.mp4 \
  --dimension 2048
```

省略 `--dimension` 参数可获取完整维度的嵌入向量。

## 四、使用方法与实战

### 基础用法：文本嵌入

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('tencent/WeMM-Embedding-2B')

# 文本嵌入
texts = ["这是一段测试文本", "WeMM-Embedding 支持多模态"]
embeddings = model.encode(texts)
print(embeddings.shape)  # (2, 2048)
```

### 进阶用法：多模态检索

```python
from sentence_transformers import SentenceTransformer
import torch

model = SentenceTransformer('tencent/WeMM-Embedding-2B')

# 图像嵌入
image_emb = model.encode(['image.jpg'])

# 文本查询嵌入
query_emb = model.encode(["搜索关键词"])

# 计算相似度
similarity = torch.nn.functional.cosine_similarity(
    torch.tensor(image_emb), 
    torch.tensor(query_emb)
)
print(f"相似度: {similarity.item():.4f}")
```

### 工业级部署：vLLM 服务化

```bash
MODEL_PATH=tencent/WeMM-Embedding-2B

vllm serve "$MODEL_PATH" \
  --runner pooling \
  --chat-template "$MODEL_PATH/embedding_chat_template.jinja"
```

SGLang 部署：

```bash
MODEL_PATH=tencent/WeMM-Embedding-2B

# 应用视频补丁
python scripts/patch_sglang_video.py

# 启动服务
python -m sglang.launch_server \
  --model-path "$MODEL_PATH" \
  --is-embedding \
  --enable-precise-embedding-interpolation
```

### 实际项目示例：多模态搜索引擎

结合 WeMM-Embedding 和向量数据库（如 Milvus、Faiss）构建多模态检索系统：

```python
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# 加载模型
model = SentenceTransformer('tencent/WeMM-Embedding-2B')

# 构建索引（假设已有图像库）
image_paths = ["img1.jpg", "img2.jpg", "img3.jpg"]
image_embeddings = model.encode(image_paths)

# 创建 FAISS 索引
dimension = 2048
index = faiss.IndexFlatIP(dimension)
index.add(image_embeddings.astype('float32'))

# 查询
query = "搜索描述文本"
query_emb = model.encode([query]).astype('float32')

# 检索 Top-K
k = 3
distances, indices = index.search(query_emb, k)
print(f"最相似的 {k} 张图片索引: {indices}")
```

## 五、常见问题与解决方案

### 安装失败

**问题**：transformers 版本冲突

```bash
ERROR: Cannot install transformers==5.2.0 because it conflicts with other packages
```

**解决方案**：创建独立虚拟环境

```bash
conda create -n wemm python=3.10
conda activate wemm
pip install transformers==5.2.0
```

### 运行时错误

**问题**：CUDA 内存不足

```python
RuntimeError: CUDA out of memory
```

**解决方案**：
1. 使用更小的模型（2B 而非 9B）
2. 降低批处理大小
3. 使用 Matryoshka 截断到更小维度

```python
# 使用 256 维度减少内存占用
embedding = model.encode(texts, dimension=256)
```

### 性能优化

**问题**：推理速度慢

**解决方案**：
1. 使用 vLLM 或 SGLang 服务化部署
2. 启用批处理推理
3. 使用 FP16 或 INT8 量化

```python
# 模型加载时指定精度
model = SentenceTransformer('tencent/WeMM-Embedding-2B', device='cuda', trust_remote_code=True)
model.half()  # FP16
```

### 兼容性问题

**问题**：音频输入不支持

目前 WeMM-Embedding 不支持音频输入，仅支持：
- 文本
- 图像
- 视频
- 视觉文档（PDF 扫描件等）
- 交错多模态输入

如需音频嵌入，建议搭配专用音频模型（如 CLAP）使用。

## 六、性能基准

### MMEB-v2（78 数据集）

| 模型 | 规模 | 平均分 | 图像 | 视频 | 视觉文档 |
|------|------|--------|------|------|----------|
| VLM2Vec | 2B | 47.8 | 59.7 | 29.0 | 44.0 |
| Qwen3-VL-Embedding | 2B | 73.2 | 75.0 | 61.9 | 79.2 |
| **WeMM-Embedding** | **2B** | **77.9** | **79.6** | **70.8** | **80.7** |
| **WeMM-Embedding** | **4B** | **79.2** | **80.8** | **72.1** | **82.0** |
| **WeMM-Embedding** | **9B** | **80.6** | **81.9** | **74.3** | **83.3** |

WeMM-Embedding 在所有规模上均显著超越同级别竞争对手，尤其在视频任务上优势明显（70.8 vs 61.9）。

### MMEB-v3（190 任务全基准）

| 模型 | 规模 | V3-All | 文本 | Agent | MCMR |
|------|------|--------|------|-------|------|
| Qwen3-VL-Embedding | 2B | 50.9 | 39.2 | 39.3 | 42.0 |
| **WeMM-Embedding** | **2B** | **56.0** | **45.3** | **45.1** | **42.5** |
| **WeMM-Embedding** | **9B** | **59.5** | **48.8** | **51.0** | **49.3** |

MMEB-v3 扩展到 190 个任务，涵盖文本、Agent、多模态检索等场景，WeMM-Embedding 依然保持领先。

## 七、总结

WeMM-Embedding 作为腾讯微信团队的开源力作，在多模态嵌入领域树立了新的标杆：

1. **统一性强**：一套模型覆盖文本、图像、视频、视觉文档等多种输入
2. **性能优异**：在 MMEB-v2/v3 基准测试中全面领先同级别模型
3. **部署友好**：支持 vLLM、SGLang、Sentence Transformers 多种推理方式
4. **灵活性高**：Matryoshka 嵌入技术允许按需调整向量维度

对于构建多模态检索系统、跨模态语义搜索、RAG 应用等场景，WeMM-Embedding 是一个值得尝试的选择。项目已在 Hugging Face 开源，可直接下载使用。

**项目地址**：[https://github.com/Tencent/WeMM-Embedding](https://github.com/Tencent/WeMM-Embedding)  
**Hugging Face**：[https://huggingface.co/collections/tencent/wemm-embedding](https://huggingface.co/collections/tencent/wemm-embedding)  
**技术报告**：[https://arxiv.org/abs/2608.24053](https://arxiv.org/abs/2608.24053)
