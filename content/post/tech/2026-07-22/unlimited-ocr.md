---
title: "百度开源 Unlimited-OCR：一键搞定任意长度文档的高精度 OCR 模型"
date: "2026-07-22"
description: "Unlimited-OCR 是百度开源的多格式文档 OCR 模型，支持单图、PDF、多页文档的端到端识别，基于 Transformers/vLLM/SGLang 推理，一键输出结构化文本。"
author: "Cheman"
slug: unlimited-ocr
draft: false
categories: [技术, 开源]
tags: [GitHub, OCR, 深度学习, 百度, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Unlimited-OCR**，这是百度开源的一个通用文档 OCR 模型，能够对任意长度、任意版面的文档图片或 PDF 进行端到端的文字识别和结构化解析，一句话概括就是——把 OCR 做到了真正的"无限长"。

## 一、项目概述

Unlimited-OCR 由百度团队开源，是继 DeepSeek-OCR 之后的又一次重磅升级。项目目标非常明确：**突破传统 OCR 对文档长度的限制，实现一次性（One-shot）长文本感知解析**。

### 核心特性

- **无限长度支持**：通过滑动窗口 + 动态分辨率机制，支持超长文档一次性解析，无需切分后再拼接
- **多模态融合**：基于 Vision-Language Model（VLM）架构，结合 OCR 专项优化，文字识别精度高
- **多格式兼容**：支持单张图片、多图批量、PDF 直接解析，覆盖日常办公绝大多数场景
- **多种推理后端**：官方提供 Transformers 原生推理、vLLM 高并发推理、SGLang 部署方案
- **丰富的生态集成**：已支持 ModelScope、Hugging Face、Baidu Cloud 等主流平台
- **开源可商用**：代码和模型权重均已开源，有完整 arXiv 论文支撑

## 二、技术原理

### 架构设计

Unlimited-OCR 采用了 Vision-Language Model 作为基础架构，模型输入为文档图片或 PDF 页面，输出为结构化的文本内容。其核心设计理念在于：

1. **动态分辨率编码**：文档图片首先经过动态分辨率处理，在保持文字细节的同时控制 token 序列长度
2. **No-Repeat NGram 解码**：通过自定义 Logit Processor 避免模型在长序列输出中重复生成同一文本片段，确保输出的完整性和可读性
3. **多页关联解析**（Multi-page）：多页文档之间通过上下文窗口保持关联，实现跨页面的语义一致性

### 两种推理模式

根据不同的图片尺寸和场景，Unlimited-OCR 提供了两种配置：

| 模式 | base_size | image_size | crop_mode | 适用场景 |
|------|-----------|------------|-----------|----------|
| gundam | 1024 | 640 | True | 单图文档，通用推荐 |
| base | 1024 | 1024 | False | 单图或 PDF 多页 |

### 核心推理代码

以下是使用 Transformers 进行单图推理的示例代码：

```python
import os
import torch
from transformers import AutoModel, AutoTokenizer

model_name = 'baidu/Unlimited-OCR'

tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
model = AutoModel.from_pretrained(
    model_name,
    trust_remote_code=True,
    use_safetensors=True,
    torch_dtype=torch.bfloat16,
)
model = model.eval().cuda()

# 单图推理 - gundam 模式
model.infer(
    tokenizer,
    prompt='<image>document parsing.',
    image_file='your_image.jpg',
    output_path='your/output/dir',
    base_size=1024, image_size=640, crop_mode=True,
    max_length=32768,
    no_repeat_ngram_size=35, ngram_window=128,
    save_results=True,
)
```

对于 PDF 文档，项目提供了完整的 PDF 转图片 + 多页推理流程：

```python
import tempfile, fitz

def pdf_to_images(pdf_path, dpi=300):
    doc = fitz.open(pdf_path)
    tmp_dir = tempfile.mkdtemp(prefix='pdf_ocr_')
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    paths = []
    for i, page in enumerate(doc):
        out = os.path.join(tmp_dir, f'page_{i+1:04d}.png')
        page.get_pixmap(matrix=mat).save(out)
        paths.append(out)
    doc.close()
    return paths

model.infer_multi(
    tokenizer,
    prompt='<image>Multi page parsing.',
    image_files=pdf_to_images('your_doc.pdf', dpi=300),
    output_path='your/output/dir',
    image_size=1024,
    max_length=32768,
    no_repeat_ngram_size=35, ngram_window=1024,
    save_results=True,
)
```

### SGLang 高并发推理

如果需要处理大量文档，SGLang 后端是更高效的选择。启动 SGLang 服务器：

```shell
python -m sglang.launch_server \
    --model baidu/Unlimited-OCR \
    --served-model-name Unlimited-OCR \
    --attention-backend fa3 \
    --page-size 1 \
    --mem-fraction-static 0.8 \
    --context-length 32768 \
    --enable-custom-logit-processor \
    --host 0.0.0.0 \
    --port 10000
```

批量并发推理：

```shell
# 图片目录批量处理
python infer.py \
    --image_dir ./examples/images \
    --output_dir ./outputs \
    --concurrency 8 \
    --image_mode gundam

# PDF 批量处理
python infer.py \
    --pdf ./examples/document.pdf \
    --output_dir ./outputs \
    --concurrency 8 \
    --image_mode gundam
```

## 三、安装与快速开始

### 环境要求

- Python 3.12.3+
- CUDA 12.9（推荐）
- 至少 16GB 显存（推荐 24GB+ 以获得最佳性能）

### 依赖安装

```bash
pip install torch==2.10.0 torchvision==0.25.0
pip install transformers==4.57.1 Pillow==12.1.1
pip install einops==0.8.2 addict==2.4.0 easydict==1.13
pip install pymupdf==1.27.2.2  # PDF 处理
```

### 模型下载

```python
# Hugging Face
model_name = 'baidu/Unlimited-OCR'
# 自动从 Hugging Face 下载模型权重

# 或使用 ModelScope
# https://modelscope.cn/models/PaddlePaddle/Unlimited-OCR

# 或使用 vLLM Docker 镜像
# docker pull vllm/vllm-openai:unlimited-ocr
```

## 四、使用方法与实战

### 基础用法

最简单的使用方式，通过 Transformers 直接对一张文档图片进行 OCR：

```python
from transformers import AutoModel, AutoTokenizer

model = AutoModel.from_pretrained(
    'baidu/Unlimited-OCR',
    trust_remote_code=True,
    torch_dtype=torch.bfloat16,
).cuda().eval()

tokenizer = AutoTokenizer.from_pretrained(
    'baidu/Unlimited-OCR',
    trust_remote_code=True,
)

model.infer(
    tokenizer,
    prompt='<image>document parsing.',
    image_file='receipt.jpg',
    output_path='./output',
    image_size=640,
    save_results=True,
)
```

### vLLM 高并发部署

对于企业级应用，推荐使用 vLLM 部署以获得高吞吐：

```bash
# 拉取官方 Docker 镜像
docker pull vllm/vllm-openai:unlimited-ocr

# 启动服务
docker run -p 8000:8000 \
    --gpus all \
    vllm/vllm-openai:unlimited-ocr \
    --model baidu/Unlimited-OCR
```

vLLM 提供 OpenAI 兼容 API，可直接用标准 OpenAI Client 调用。

### 实战：批量处理合同文档

假设有一批 PDF 合同需要 OCR 提取文本，使用 SGLang 批量推理最为高效：

```python
import os
from concurrent.futures import ThreadPoolExecutor
from your_infer_module import model, tokenizer, pdf_to_images

pdf_dir = './contracts/'
output_dir = './contract_texts/'

os.makedirs(output_dir, exist_ok=True)

for pdf_file in os.listdir(pdf_dir):
    if not pdf_file.endswith('.pdf'):
        continue
    pdf_path = os.path.join(pdf_dir, pdf_file)
    image_files = pdf_to_images(pdf_path, dpi=300)

    result = model.infer_multi(
        tokenizer,
        prompt='<image>Extract all text content from this contract page.',
        image_files=image_files,
        output_path=output_dir,
        image_size=1024,
        save_results=True,
    )
    print(f"Processed: {pdf_file}")
```

## 五、常见问题与解决方案

### Q1: 显存不足（OOM）

**问题**：在处理高分辨率文档时出现 CUDA OOM。

**解决**：
- 降低 `image_size` 参数（如从 1024 降到 640）
- 使用 `gundam` 模式代替 `base` 模式，减少单次处理的 token 数量
- 减少 `max_length` 参数

### Q2: 模型加载失败，trust_remote_code 报错

**问题**：`trust_remote_code=True` 是必填项，部分旧版本 transformers 不支持。

**解决**：
```bash
pip install --upgrade transformers>=4.57.1
```

### Q3: PDF 转图片质量差

**问题**：OCR 识别率低，往往是 PDF 渲染分辨率不够。

**解决**：提高 `dpi` 参数，建议 300 DPI 以上：
```python
pdf_to_images('doc.pdf', dpi=400)  # 从默认 300 提升到 400
```

### Q4: 输出文本有大量重复片段

**问题**：长文本解码过程中出现重复生成。

**解决**：Unlimited-OCR 内置了 No-Repeat NGram 解码器，确保在 `infer` 或 `infer_multi` 时传入正确的 `no_repeat_ngram_size` 和 `ngram_window` 参数（默认分别为 35 和 128/1024），不要随意调小。

### Q5: vLLM 或 SGLang 服务启动失败

**问题**：自定义 Logit Processor 不兼容。

**解决**：确保使用官方推荐的版本组合：
- vLLM：使用官方提供的 `vllm/vllm-openai:unlimited-ocr` 镜像
- SGLang：参考项目 recipes 中的版本锁定说明

## 六、总结

Unlimited-OCR 解决了传统 OCR 方案的两大痛点：文档长度限制和版面适应性差。它通过 VLM 架构和精心设计的解码策略，实现了真正意义上的"无限长"文档解析，且支持图片、PDF、多页文档等多种输入形式。配合 Transformers、vLLM、SGLang 三套推理后端，无论是个体开发者还是企业用户，都能找到合适的部署方案。

如果你有文档数字化、合同 OCR、PDF 文本提取等需求，Unlimited-OCR 绝对值得一试。项目已在 GitHub 开源，模型托管于 Hugging Face、ModelScope 和 Baidu Cloud，上手门槛很低。

> **GitHub 地址**：https://github.com/baidu/Unlimited-OCR
> **Hugging Face**：https://huggingface.co/baidu/Unlimited-OCR
> **arXiv 论文**：https://arxiv.org/abs/2606.23050
