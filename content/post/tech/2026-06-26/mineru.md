---
title: "MinerU：高精度文档解析引擎，一键转换 PDF/DOCX/PPTX/XLSX 为 Markdown"
date: 2026-06-26
description: "MinerU 是 OpenDataLab 开源的高精度文档解析引擎，支持 PDF、DOCX、PPTX、XLSX 和图片等多种格式，一键转换为结构化 Markdown/JSON。VLM+OCR 双引擎架构，支持 109 种语言 OCR，专为 LLM/RAG/Agent 工作流设计。"
author: "Cheman"
slug: mineru
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["GitHub", "开源", "文档解析", "OCR", "VLM", "RAG", "MinerU"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MinerU**，一个高精度文档解析引擎，能将 PDF、DOCX、PPTX、XLSX 和图片等格式一键转换为结构化的 Markdown 和 JSON，非常适合 LLM、RAG 和 Agent 工作流使用。

## 一、项目概述

MinerU 是 OpenDataLab 团队开源的文档解析工具，专注于将各种文档格式转换为机器可读的结构化数据。该项目诞生于 InternLM 大模型预训练过程，旨在解决科学文献中的符号转换问题。

### 核心特性

- **多格式支持**：原生支持 PDF、DOCX、PPTX、XLSX 和图片输入
- **高精度转换**：公式转 LaTeX、表格转 HTML，保持原始文档结构
- **VLM + OCR 双引擎**：支持 109 种语言 OCR 识别
- **智能布局处理**：自动去除页眉页脚、页码，保持语义连贯
- **多种输出格式**：Markdown、JSON、多模态中间格式
- **灵活部署**：支持 CPU/GPU 加速，提供 CLI、API、WebUI 多种使用方式

### 技术指标

在 OmniDocBench v1.6 基准测试中：
- `pipeline` 后端准确率：86.47
- `hybrid` 后端（high 模式）：95.39
- `vlm` 后端：95.30

## 二、技术原理

### 架构设计

MinerU 采用模块化架构设计，主要包含三大解析后端：

```
┌─────────────────────────────────────────────────────┐
│                    MinerU Core                       │
├─────────────────────────────────────────────────────┤
│  pipeline    │  hybrid-engine  │  vlm-engine        │
│  (OCR为主)   │  (混合引擎)      │  (VLM为主)         │
├─────────────────────────────────────────────────────┤
│  mineru-api  │  mineru-router │  CLI / Gradio      │
└─────────────────────────────────────────────────────┘
```

### 核心技术栈

**1. PDF 处理层**
- `pypdfium2`：高性能 PDF 渲染
- `pdftext`：文本提取
- `pypdf`：PDF 操作

**2. OCR 引擎**
- `PaddleOCR`：开源 OCR 框架
- 支持 109 种语言识别
- PP-OCRv6 模型（3.4 版本升级）

**3. VLM 模型**
- `MinerU2.5-Pro-2605-1.2B`：最新视觉语言模型
- 支持图像和图表解析
- 跨页表格合并、断行段落合并

**4. 文档解析**
- `python-docx`：DOCX 处理
- `pypptx-with-oxml`：PPTX 解析
- `openpyxl`：XLSX 处理

### 核心代码示例

从 `pyproject.toml` 可以看出项目依赖结构：

```toml
[project]
name = "mineru"
requires-python = ">=3.10,<3.14"

dependencies = [
    "click>=8.1.7",           # CLI 框架
    "pypdfium2>=4.30.0",      # PDF 渲染
    "pypdf>=5.6.0",           # PDF 操作
    "opencv-python>=4.11.0",  # 图像处理
    "transformers>=4.57.3",   # VLM 模型
    "fastapi",                # API 服务
    # ... 更多依赖
]
```

### 解析流程

```python
# 简化的解析流程（概念性代码）
def parse_document(input_path, output_path, backend="pipeline"):
    # 1. 文档预处理
    doc = load_document(input_path)
    
    # 2. 布局分析
    layout = analyze_layout(doc)
    
    # 3. 内容提取（根据后端选择）
    if backend == "pipeline":
        # OCR + 规则引擎
        content = pipeline_extract(doc, layout)
    elif backend == "vlm":
        # VLM 模型推理
        content = vlm_extract(doc, layout)
    elif backend == "hybrid":
        # 混合引擎：OCR + VLM
        content = hybrid_extract(doc, layout)
    
    # 4. 后处理（格式转换）
    markdown = convert_to_markdown(content)
    
    # 5. 输出结果
    save_output(markdown, output_path)
```

## 三、安装与快速开始

### 环境要求

| 解析后端 | pipeline | hybrid-engine | vlm-engine |
|---------|----------|---------------|------------|
| **操作系统** | Linux/Windows/macOS | Linux/Windows/macOS | Linux/Windows/macOS |
| **纯 CPU 支持** | ✅ | ❌ | ❌ |
| **最小显存** | 4GB | 8GB | 8GB |
| **最小内存** | 16GB | 32GB（推荐） | 32GB（推荐） |
| **Python 版本** | 3.10-3.13 | 3.10-3.13 | 3.10-3.13 |

### 安装方式

**方式一：pip 安装（推荐）**

```bash
pip install --upgrade pip
pip install uv
uv pip install -U "mineru[all]"
```

**方式二：源码安装**

```bash
git clone https://github.com/opendatalab/MinerU.git
cd MinerU
uv pip install -e .[all]
```

**方式三：Docker 部署**

```bash
# Linux / Windows (WSL2)
docker pull opendatalab/mineru:latest
```

### 最简运行示例

```bash
# GPU 环境（默认）
mineru -p input.pdf -o output/

# 纯 CPU 环境
mineru -p input.pdf -o output/ -b pipeline

# 指定文件或目录
mineru -p ./documents/ -o ./parsed/
```

## 四、使用方法与实战

### CLI 命令详解

```bash
# 基础用法
mineru -p <input_path> -o <output_path> [options]

# 参数说明
-p, --path       输入文件或目录（支持 PDF/DOCX/PPTX/XLSX/图片）
-o, --output     输出目录
-b, --backend    解析后端：pipeline | vlm | hybrid（默认：自动选择）
--lang           OCR 语言（默认：ch）
--method         解析方法：auto | txt | ocr
```

### API 服务

**启动 API 服务**

```bash
# 启动本地 API 服务
mineru-api --host 0.0.0.0 --port 8000

# 多 GPU 部署（使用 router）
mineru-router --config config.yaml
```

**API 调用示例**

```python
import requests

# 同步解析
url = "http://localhost:8000/file_parse"
files = {"file": open("document.pdf", "rb")}
response = requests.post(url, files=files)

# 异步任务
url = "http://localhost:8000/tasks"
response = requests.post(url, files=files)
task_id = response.json()["task_id"]

# 查询任务状态
status_url = f"http://localhost:8000/tasks/{task_id}"
status = requests.get(status_url).json()
```

### Gradio WebUI

```bash
mineru-gradio --server-name 0.0.0.0 --server-port 7860
```

### Python SDK

```python
from mineru import DocumentParser

# 初始化解析器
parser = DocumentParser(backend="pipeline")

# 解析文档
result = parser.parse("document.pdf")

# 获取 Markdown
markdown = result.to_markdown()

# 获取 JSON
json_data = result.to_json()

# 保存结果
result.save("output/")
```

### 实际项目示例：RAG 集成

```python
from mineru import DocumentParser
from langchain.text_splitter import MarkdownHeaderTextSplitter

# 1. 解析文档
parser = DocumentParser(backend="hybrid")
result = parser.parse("research_paper.pdf")
markdown_text = result.to_markdown()

# 2. 按标题分割
splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "header1"),
        ("##", "header2"),
        ("###", "header3"),
    ]
)
chunks = splitter.split_text(markdown_text)

# 3. 向量化并存储（接入向量数据库）
# ... 你的 RAG 流程
```

## 五、常见问题与解决方案

### Q1：安装后 CUDA 加速不可用（Windows）

**原因**：Windows 上 CUDA 依赖安装路径问题

**解决方案**：
```bash
# 参考 Windows CUDA 加速 FAQ
https://opendatalab.github.io/MinerU/faq/#windows-cuda-acceleration

# 或使用 Docker 部署
docker run --gpus all opendatalab/mineru:latest
```

### Q2：OCR 识别准确率不高

**解决方案**：
```bash
# 方案 1：升级到 VLM 后端
mineru -p input.pdf -o output/ -b vlm

# 方案 2：指定 OCR 语言
mineru -p input.pdf -o output/ --lang ch+en

# 方案 3：使用 hybrid 后端（兼顾准确率和速度）
mineru -p input.pdf -o output/ -b hybrid
```

### Q3：长文档解析内存溢出

**解决方案**：
```bash
# 3.0 版本已优化长文档处理，自动使用滑动窗口
# 确保使用最新版本
pip install -U "mineru[all]"

# 手动分段处理
# 3.0 版本已支持流式写入，无需手动分割
```

### Q4：解析速度慢

**优化方案**：
```bash
# 方案 1：使用 pipeline 后端（最快，准确率略低）
mineru -p input.pdf -o output/ -b pipeline

# 方案 2：hybrid 后端使用 medium 模式（3.3 新增）
# 速度提升 35%-220%，准确率仅下降 0.13
mineru -p input.pdf -o output/ -b hybrid --effort medium

# 方案 3：多 GPU 并行
mineru-router --config multi_gpu.yaml
```

### Q5：输出 Markdown 格式混乱

**排查步骤**：
1. 检查原文档是否有复杂布局（多栏、跨页表格）
2. 尝试使用 `vlm` 或 `hybrid` 后端
3. 查看 `layout.json` 中间文件，确认布局分析结果
4. 提交 issue 并附上样例文档

### Q6：Docker 部署后无法访问

**解决方案**：
```bash
# 确保端口映射正确
docker run -p 8000:8000 opendatalab/mineru:latest

# 检查防火墙设置
# macOS: 系统偏好设置 → 安全性与隐私 → 防火墙
# Linux: sudo ufw allow 8000
```

## 六、版本更新亮点

### 3.4 版本（2026/06/18）

- **OCR 模型升级至 PP-OCRv6**：准确率提升约 11%
- **OCR 处理速度提升 100%**：优化推理和处理流水线
- **模型下载体验优化**：自动源选择、本地缓存复用

### 3.3 版本（2026/06/11）

- **新增 `effort` 参数**：`medium` 模式速度提升 35%-220%
- **VLM 模型升级**：`MinerU2.5-Pro-2605-1.2B`
- **原生多语言 OCR 支持**：减少语言参数配置

### 3.1.0 版本（2026/04/18）

- **许可证升级**：从 AGPLv3 迁移到 MinerU Open Source License（基于 Apache 2.0）
- **全格式支持**：新增 PPTX、XLSX 原生解析
- **VLM 模型升级**：支持图像和图表解析

### 3.0.0 版本（2026/03/29）

- **原生 DOCX 解析**：无需转 PDF，速度提升数十倍
- **pipeline 后端准确率达 86.2**：超越上一代 VLM
- **API/CLI/Router 架构升级**：支持异步任务、多 GPU 部署

## 七、总结

MinerU 是一个功能强大、设计精良的文档解析工具，特别适合需要将非结构化文档转换为结构化数据的场景。无论是构建 RAG 系统、训练 LLM，还是自动化文档处理流程，MinerU 都能提供高质量的解析结果。

**推荐使用场景**：
- RAG 知识库构建
- LLM 预训练数据准备
- 自动化文档处理流水线
- 科学文献数字化

**项目地址**：https://github.com/opendatalab/MinerU

**在线体验**：https://mineru.net

**文档**：https://opendatalab.github.io/MinerU/
