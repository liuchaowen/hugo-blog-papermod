---
title: "olmOCR：基于视觉语言模型的开源 PDF 文档 OCR 工具包"
date: 2026-07-01
description: "olmOCR 是由 Allen Institute for Artificial Intelligence (AI2) 开发的开源 OCR 工具包，使用 7B 参数的视觉语言模型将 PDF、PNG、JPEG 等文档转换为干净的 Markdown 格式，支持公式、表格、手写识别，自动去除页眉页脚，处理多列布局和复杂格式。"
author: "Cheman"
slug: olmocr
draft: false
categories: [技术, 开源]
tags: [GitHub, OCR, 视觉语言模型, AI2, PDF处理]
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

**开篇引导段**：
今天在 GitHub Trending 上看到一个有意思的项目：**olmOCR**，这是由艾伦人工智能研究所（AI2）开发的开源 OCR 工具包，能够利用 7B 参数的视觉语言模型（VLM）将 PDF、PNG、JPEG 等基于图像的文档格式转换为干净的 Markdown 纯文本，在 olmOCR-Bench 基准测试中达到 82.4 分，性能超越 Mistral OCR API 和 Marker 等商业/开源方案。

## 一、项目概述

olmOCR 是一个高效、高质量的 OCR 工具包，专门设计用于将 PDF 和其他基于图像的文档格式转换为可读的纯文本格式。该项目由 Allen Institute for Artificial Intelligence (AI2) 开发，基于 Apache 2.0 开源协议发布。

**核心特性**：
- 支持将 PDF、PNG、JPEG 文档转换为干净的 Markdown 格式
- 支持公式、表格、手写体和复杂格式识别
- 自动移除页眉和页脚
- 即使存在图片、多列布局和插入内容，也能按自然阅读顺序转换文本
- 高效经济：每百万页转换成本低于 200 美元
- 基于 7B 参数的视觉语言模型（需要 GPU 支持）

**最新版本**：v0.4.0（2025年10月21日发布），引入了 RL 训练并使用合成数据，在 olmOCR-Bench 上提升了约 4 分。

## 二、技术原理

### 2.1 架构设计

olmOCR 的核心是基于视觉语言模型（Vision Language Model）的文档理解管道。其架构主要包含以下几个组件：

1. **PDF 渲染模块**：使用 `pypdf`、`pypdfium2` 进行 PDF 页面渲染，将每一页转换为图像
2. **视觉语言模型推理**：使用 vLLM 或 SGLang 作为推理引擎，加载 7B 参数的 olmOCR 模型
3. **后处理模块**：使用 `ftfy`、`bleach`、`markdownify` 等工具清理和格式化输出
4. **工作队列管理**：支持本地文件系统或 AWS S3 作为工作空间，实现多节点并行处理

### 2.2 核心技术栈与选型理由

```python
# 核心依赖（来自 pyproject.toml）
dependencies = [
  "cached-path",        # 高效缓存远程文件
  "smart_open",         # 支持 S3、HTTP 等多种存储后端
  "pypdf>=5.2.0",      # PDF 解析
  "pypdfium2",         # PDF 渲染为像素图
  "cryptography",       # 处理加密 PDF
  "lingua-language-detector",  # 语言检测
  "Pillow",            # 图像处理
  "ftfy",              # 修复 Unicode 文本问题
  "bleach",             # 清理 HTML/Markdown
  "markdown2",          # Markdown 处理
  "markdownify",        # HTML 转 Markdown
  "filelock",           # 文件锁，支持多进程
  "orjson",             # 高性能 JSON 解析
  "requests",
  "zstandard",          # 压缩支持
  "boto3",              # AWS S3 支持
  "httpx",              # 异步 HTTP 客户端
]
```

**GPU 推理依赖**：
- `torch>=2.7.0`
- `transformers==4.57.3`
- `vllm==0.11.2`（默认推理引擎）

**选型理由**：
- **vLLM**：提供高性能的 LLM 推理服务，支持 FP8 量化，显著降低显存占用并提高推理速度
- **7B 参数模型**：在性能和资源消耗之间取得良好平衡，可在消费级 GPU（如 RTX 4090）上运行
- **Dolma 格式**：使用 AI2 的 Dolma 格式存储中间结果，便于大规模数据处理

### 2.3 关键算法与数据处理流程

olmOCR 的数据处理流程如下：

```python
# 来自 pipeline.py 的核心逻辑（简化版）
def process_pdf(pdf_path, model, workspace):
    # 1. 渲染 PDF 页面为图像
    images = render_pdf_to_images(pdf_path)
    
    # 2. 将图像分组（pages_per_group）
    groups = group_images(images, pages_per_group=10)
    
    # 3. 使用 VLM 对每个组进行推理
    for group in groups:
        result = model.infer(group)  # 调用 vLLM 服务
        
        # 4. 后处理：清理文本、移除页眉页脚、重建阅读顺序
        cleaned = postprocess(result)
        
        # 5. 保存为 Dolma 格式和 Markdown 格式
        save_to_dolma(cleaned, workspace)
        if markdown:
            save_to_markdown(cleaned, workspace)
```

**关键技术点**：
- **自然阅读顺序重建**：通过视觉语言模型理解页面布局，正确处理多列、图文混排等复杂场景
- **页眉页脚去除**：模型在训练时学习识别并忽略页眉页脚内容
- **公式和表格识别**：利用 VLM 的视觉理解能力，准确识别数学公式和表格结构

### 2.4 训练方法

olmOCR 模型的训练包含以下几个阶段（根据 GitHub 仓库中的代码）：

1. **监督微调（SFT）**：使用 `olmocr/train/train.py`，基于 Qwen2.5-VL 架构进行微调
2. **强化学习（RL）**：使用 `olmocr/train/grpo_train.py`，通过 GRPO（Group Relative Policy Optimization）算法进行强化学习，提升 OCR 质量
3. **合成数据生成**：使用 `olmocr/synth/mine_html_templates.py` 生成合成训练数据

**技术报告**：
- v1: [arXiv:2502.18443](https://arxiv.org/abs/2502.18443)
- v2: [arXiv:2510.19817](https://arxiv.org/abs/2510.19817)（引入 RL 训练）

## 三、安装与快速开始

### 3.1 系统依赖

需要安装 poppler-utils 和额外字体（用于渲染 PDF 图像）：

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install poppler-utils ttf-mscorefonts-installer msttcorefonts fonts-crosextra-caladea fonts-crosextra-carlito gsfonts lcdf-typetools
```

### 3.2 Python 安装

推荐使用干净的 conda 环境：

```bash
conda create -n olmocr python=3.11
conda activate olmocr
```

**选项 1：远程推理（轻量级）**

如果计划使用 `--server` 标志连接远程 vLLM 服务器，安装基础包：

```bash
pip install olmocr
```

**选项 2：本地 GPU 推理**

要求：
- 最近的 NVIDIA GPU（已在 RTX 4090、L40S、A100、H100 上测试），至少 12 GB GPU 显存
- 30GB 可用磁盘空间

```bash
pip install olmocr[gpu] --extra-index-url https://download.pytorch.org/whl/cu128

# 推荐：安装 flashinfer 以加速 GPU 推理
pip install https://download.pytorch.org/whl/cu128/flashinfer/flashinfer_python-0.2.5%2Bcu128torch2.7-cp38-abi3-linux_x86_64.whl
```

### 3.3 快速开始

**转换单个 PDF（本地 GPU）**：

```bash
# 下载示例 PDF
curl -o olmocr-sample.pdf https://olmocr.allenai.org/papers/olmocr_3pg_sample.pdf

# 转换为 Markdown
olmocr ./localworkspace --markdown --pdfs olmocr-sample.pdf
```

**转换图像文件**：

```bash
olmocr ./localworkspace --markdown --pdfs random_page.png
```

**转换多个 PDF**：

```bash
olmocr ./localworkspace --markdown --pdfs tests/gnarly_pdfs/*.pdf
```

**使用远程推理服务器**：

```bash
olmocr ./localworkspace --server http://remote-server:8000/v1 --model allenai/olmOCR-2-7B-1025-FP8 --markdown --pdfs *.pdf
```

### 3.4 Docker 使用

拉取 Docker 镜像（包含模型，约 30GB）：

```bash
docker pull alleninstituteforai/olmocr:latest-with-model
```

处理当前目录中的 PDF：

```bash
docker run --gpus all \
  -v $(pwd):/workspace \
  alleninstituteforai/olmocr:latest-with-model \
  -c "olmocr /workspace/output --markdown --pdfs /workspace/sample.pdf"
```

## 四、使用方法与实战

### 4.1 基础用法

转换后的结果将存储在 `./localworkspace/markdown/` 目录下（使用 `--markdown` 标志时）。

```bash
# 查看转换结果
cat localworkspace/markdown/olmocr-sample.md
```

输出示例：

```markdown
nolmOCR: Unlocking Trillions of Tokens in PDFs with Vision Language Models
...
```

### 4.2 使用外部推理提供商

olmOCR 支持连接任何实现 OpenAI API 的推理平台。已验证的外部提供商包括：

| 提供商 | $/1M 输入 token | $/1M 输出 token | 示例命令 |
|--------|-----------------|-----------------|----------|
| Cirrascale | $0.07 | $0.15 | `olmocr ./workspace --server https://ai2endpoints.cirrascale.ai/api --api_key sk-XXXXXXX --workers 1 --max_concurrent_requests 20 --model olmOCR-2-7B-1025 --pdfs tests/gnarly_pdfs/*.pdf` |
| DeepInfra | $0.09 | $0.19 | `olmocr ./workspace --server https://api.deepinfra.com/v1/openai --api_key DfXXXXXXX --workers 1 --max_concurrent_requests 20 --model allenai/olmOCR-2-7B-1025 --pdfs tests/gnarly_pdfs/*.pdf` |
| Parasail | $0.10 | $0.20 | `olmocr ./workspace --server https://api.parasail.io/v1 --api_key psk-XXXXX --workers 1 --max_concurrent_requests 20 --model allenai/olmOCR-2-7B-1025 --pdfs tests/gnarly_pdfs/*.pdf` |

**轻量级安装（仅远程推理）**：

```bash
pip install olmocr  # 不安装 GPU 依赖
```

### 4.3 多节点/集群使用

如果需要使用多个节点并行转换数百万个 PDF，olmOCR 支持从 AWS S3 读取 PDF 并使用 AWS S3 输出桶协调工作。

**启动第一个工作节点**：

```bash
olmocr s3://my_s3_bucket/pdfworkspaces/exampleworkspace --pdfs s3://my_s3_bucket/jakep/gnarly_pdfs/*.pdf
```

**后续工作节点**：

```bash
olmocr s3://my_s3_bucket/pdfworkspaces/exampleworkspace
```

它们将自动从同一个工作空间队列中获取任务。

### 4.4 实战示例：批量处理学术论文

假设您有一个包含数百篇学术论文 PDF 的目录，需要提取文本内容进行分析：

```bash
# 创建输出目录
mkdir -p ./arxiv_papers/markdown

# 批量转换（使用 GPU）
olmocr ./arxiv_papers --markdown --pdfs ./arxiv_pdfs/*.pdf --workers 4

# 转换完成后，所有 Markdown 文件将保存在 ./arxiv_papers/markdown/ 中
```

**提示**：如果遇到 "too many open files" 错误，请更新 ulimit：

```bash
ulimit -n 65536
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：`pip install olmocr[gpu]` 失败，提示 CUDA 版本不匹配。

**解决方案**：
- 确保安装了正确版本的 PyTorch（支持 CUDA 12.8）
- 使用 `--extra-index-url https://download.pytorch.org/whl/cu128` 指定 CUDA 12.8 的 PyTorch 版本
- 检查 NVIDIA 驱动版本是否支持 CUDA 12.8

**问题**：缺少系统依赖（如 `poppler-utils`）。

**解决方案**：
```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils

# macOS
brew install poppler
```

### 5.2 运行时错误

**问题**：`RuntimeError: CUDA out of memory`

**解决方案**：
- 降低 `--gpu-memory-utilization`（默认 0.9）
- 减小 `--max_model_len`（默认 16384）
- 使用 FP8 量化模型（`allenai/olmOCR-2-7B-1025-FP8`）
- 减少 `--workers` 数量

**问题**：转换后的 Markdown 格式不正确或丢失内容。

**解决方案**：
- 检查输入 PDF 是否为扫描版（图像型 PDF），olmOCR 主要针对此类 PDF 优化
- 对于原生数字 PDF（包含可选文本层），可以尝试先使用 `pypdf` 提取文本，仅在提取失败时回退到 olmOCR
- 查看 [olmOCR-Bench](https://github.com/allenai/olmocr/tree/main/olmocr/bench) 了解模型在不同类型文档上的性能

### 5.3 性能问题

**问题**：推理速度慢。

**解决方案**：
- 使用 vLLM 替代 SGLang（v0.1.75 之后默认使用 vLLM）
- 安装 `flashinfer` 加速推理
- 使用 FP8 量化模型（`allenai/olmOCR-2-7B-1025-FP8`）
- 增加 `--tensor-parallel-size` 和 `--data-parallel-size` 以利用多 GPU

**问题**：处理大量 PDF 时效率低。

**解决方案**：
- 使用 AWS S3 工作空间和多个工作节点实现并行处理
- 调整 `--pages_per_group` 以平衡批处理大小和延迟
- 使用 `--workers` 参数增加并行度

### 5.4 兼容性问题

**问题**：某些 PDF 无法正确转换（如加密 PDF、损坏的 PDF）。

**解决方案**：
- 对于加密 PDF，提供密码：`olmocr ... --pdf_password <password>`
- 对于损坏的 PDF，尝试使用 `pypdf` 修复或使用其他工具预处理
- 查看 [filter.py](https://github.com/allenai/olmocr/blob/main/olmocr/filter/filter.py) 了解 olmOCR 的过滤逻辑

## 六、总结

olmOCR 是一个功能强大、高效且高质量的开源 OCR 工具包，特别适合需要处理大量 PDF 文档的研究人员和开发者。其主要优势包括：

1. **高性能**：基于 7B 参数的视觉语言模型，在 olmOCR-Bench 上达到 82.4 分，超越许多商业和开源方案
2. **经济性**：每百万页转换成本低于 200 美元，适合大规模部署
3. **灵活性**：支持本地 GPU 推理、远程推理服务器、多节点集群等多种部署方式
4. **开发生态**：提供训练代码、基准测试套件、Docker 镜像等完整工具链

**适用场景**：
- 学术论文批量处理
- 历史文档数字化
- 企业文档管理系统
- 大规模语料库构建

**项目资源**：
- GitHub: https://github.com/allenai/olmocr
- 在线演示: https://olmocr.allenai.org/
- 技术报告 v1: https://arxiv.org/abs/2502.18443
- 技术报告 v2: https://arxiv.org/abs/2510.19817
- Discord 社区: https://discord.gg/sZq3jTNVNG

如果您正在寻找一个开源、高性能、易于部署的 OCR 解决方案，olmOCR 绝对值得一试！
