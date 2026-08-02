---
title: "pdf-inspector: 极速 PDF 分类与文本提取，Rust 编写的本地智能解析库"
date: "2026-08-02"
description: "pdf-inspector 是 Firecrawl 开源的 Rust 库，能在 200ms 内完成 PDF 类型判定（文本型/扫描型/混合型），并直接输出结构化 Markdown。零 OCR、零云服务、多语言绑定，适合大规模文档处理流水线。"
author: "Cheman"
slug: pdf-inspector
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "PDF", "Python", "Node.js", "WASM", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**pdf-inspector**，来自 Firecrawl 团队——一个纯 Rust 编写的 PDF 智能解析库，能在毫秒级完成 PDF 类型判定与文本提取，完全不需要 OCR 或外部云服务。支持 Python、Node.js、WebAssembly 多端调用，是当前开源 PDF 解析领域的一匹黑马。

## 一、项目概述

**pdf-inspector** 解决的核心问题是：如何以极低成本从大量 PDF 中提取干净的文本内容。

根据 Firecrawl 的调研，约 **54%** 的 PDF 本身就是文本型（而非扫描件），这类文档完全不需要走 OCR 流程，但大多数解析库仍然会盲目调用云端 OCR 服务，造成巨大的成本和延迟浪费。pdf-inspector 通过快速的本地分类器，先判断 PDF 类型，再决定走哪条处理路径：

```
PDF 文档
  ├── 文本型 (TextBased)  → 本地提取 (~150ms)  → 结束
  ├── 扫描型 (Scanned)   → 发送到 OCR 服务 (~2-10s)  → 结束
  ├── 图片型 (ImageBased) → 发送到 OCR 服务
  └── 混合型 (Mixed)      → 部分本地 + 部分 OCR
```

### 核心特性一览

- **极速分类**：10-50ms 即可判断 PDF 类型（文本型/扫描型/图片型/混合型），返回置信度分数和逐页 OCR 路由建议
- **位置感知文本提取**：保留字体信息、X/Y 坐标，自动还原多栏排版的阅读顺序
- **Markdown 转换**：标题（H1-H4）、列表、代码块、表格、链接、加粗/斜体，全部自动识别
- **表格双模式检测**：基于 PDF 绘图操作的几何检测 + 基于文本对齐的启发式检测，双剑合璧
- **多语言支持**：CID 字体（Type0/Identity-H）解码，支持 UTF-16BE、UTF-8、Latin-1 编码
- **多端运行**：Python（PyO3）、Node.js（napi-rs）、浏览器 WebAssembly 三套绑定
- **纯 Rust**：无 ML 模型、无外部服务，仅依赖 `lopdf`，单文档只解析一次

## 二、技术原理

### 架构设计

pdf-inspector 的处理流程分为两个阶段：**检测（Detector）** 和 **提取（Extractor）**，文档对象只加载一次，两者共享内存避免重复 I/O。

```
PDF bytes
  │
  ├─► Detector（分类）
  │     └─ 扫描 xref 表 + content stream
  │         Tj/TJ 操作符存在？→ TextBased
  │         Do 操作符（图片）存在？→ ImageBased
  │
  └─► Extractor（提取）
        ├─ fonts        → 字体宽度、编码
        ├─ content_stream → PDF 操作符遍历 → TextItems + PdfRects
        ├─ xobjects     → 表单 XObject 文本
        ├─ links        → 超链接、AcroForm 字段
        └─ layout       → 多栏检测 → 行分组 → 阅读顺序
              ├─► tables   → 几何 + 启发式双检测
              └─► markdown → 字体统计 → 预处理 → 转换 → 后处理
```

### 扫描策略

源码中的 `ScanStrategy` 枚举控制分类扫描的行为：

| 策略 | 行为 | 适用场景 |
|---|---|---|
| `EarlyExit`（默认） | 扫描全部页，遇到第一个非文本页即停止 | 流水线快速路由文本型 PDF |
| `Full` | 完整扫描所有页 | 精确区分 Mixed 与 Scanned |
| `Sample(n)` | 均匀采样 n 页（首/中/末） | 超大 PDF，追求极致速度 |
| `Pages(vec)` | 仅扫描指定页码 | 调用方已知感兴趣页 |

从 `detector.rs` 中的关键逻辑可以看出，早停策略是通过遍历 `content_streams` 并检查 `is_text_based()` 来实现的——一旦发现图片型页面，立即返回 `ImageBased`，无需继续扫描剩余页。

### 基准测试结果

在 [opendataloader-bench](https://github.com/opendataloader-project/opendataloader-bench) 基准集（200 份 PDF，OCR 禁用）上，pdf-inspector 交出了令人印象深刻的数据：

| 引擎 | 综合分 | 阅读顺序 | 表格检测 | 标题检测 | 速度（200份） |
|---|---|---|---|---|---|
| **pdf-inspector** | **0.875** | **0.915** | **0.814** | 0.788 | **0.470s** |
| liteparse | 0.873 | 0.913 | 0.693 | 0.811 | 0.750s |
| opendataloader | 0.831 | 0.902 | 0.489 | 0.739 | 2.569s |
| pymupdf4llm | 0.735 | 0.886 | 0.401 | 0.424 | 17.117s |

pdf-inspector 在综合分、阅读顺序、表格检测三个维度均为第一梯队，速度更是以 0.470s 遥遥领先第二名 liteparse 的 0.750s。

### Markdown 转换细节

Markdown 转换模块的检测逻辑非常精细，部分关键规则如下：

- **标题层级**：按正文字体大小为基准，将不同字号（0.5pt 聚类）映射到 H1-H4
- **代码块**：识别等宽字体（Courier, Consolas, Monaco, Menlo, Fira Code, JetBrains Mono）并结合关键词检测
- **表格**：联合-find 算法做矩形检测 + 文本对齐启发式，双重保险
- **连字符合并**：自动还原跨行断词（如 `auto- \nmatic` → `automatic`）

## 三、安装与快速开始

### Python

```bash
pip install maturin
maturin develop --release

python
>>> import pdf_inspector
>>> result = pdf_inspector.process_pdf("document.pdf")
>>> print(result.pdf_type)   # "text_based"
>>> print(result.markdown)
```

### Node.js

```bash
npm install @firecrawl/pdf-inspector

node
>>> const { processPdf } = require('@firecrawl/pdf-inspector');
>>> const result = processPdf(require('fs').readFileSync('document.pdf'));
>>> console.log(result.pdfType);   // "TextBased"
>>> console.log(result.markdown);
```

### 浏览器 WebAssembly

```bash
npm install @firecrawl/pdf-inspector-wasm
```

```javascript
import init, { processPdf } from '@firecrawl/pdf-inspector-wasm';
await init();
const response = await fetch('/document.pdf');
const pdf = new Uint8Array(await response.arrayBuffer());
const result = processPdf(pdf);
console.log(result.pdfType, result.markdown);
```

### Rust / CLI

```bash
cargo install pdf-inspector

# PDF 转 Markdown
pdf2md document.pdf

# 仅分类检测
detect-pdf document.pdf --json

# 带布局分析
detect-pdf document.pdf --analyze --json
```

## 四、使用方法与实战

### 智能流水线路由

这是 pdf-inspector 最典型的使用场景——构建一个智能 PDF 处理流水线：

```python
import pdf_inspector

def process_document(pdf_path):
    result = pdf_inspector.process_pdf(pdf_path)
    
    if result.pdf_type == "text_based" and result.confidence > 0.8:
        # 高置信文本型 → 直接本地提取，成本极低
        return {
            "type": "text",
            "markdown": result.markdown,
            "source": "local"
        }
    else:
        # 其他类型 → 走 OCR 服务（如 Tesseract/云 OCR）
        return {
            "type": result.pdf_type,
            "markdown": call_ocr_service(pdf_path),
            "source": "ocr"
        }
```

### 指定页码范围提取

```python
# 只提取特定页面
result = pdf_inspector.process_pdf(
    "document.pdf",
    scan_strategy="Pages",
    pages=[1, 3, 5, 7]  # 1-indexed
)
```

### CLI 管道使用

```bash
# 批量转换，加页码标记
find ./reports -name "*.pdf" | xargs -I {} pdf2md {} --pages --compact > combined.md

# 输出为 JSON，方便程序处理
pdf2md document.pdf --json | jq '.tables'
```

## 五、常见问题与解决方案

**Q: 安装 Python 版时报错 ` maturin not found`？**
A: 先安装 maturin：`pip install maturin`，再执行 `maturin develop --release`。注意 maturin 要求本地有 Rust 工具链（`rustc`）。

**Q: 提取的 Markdown 中表格错位或行列混淆？**
A: 表格检测依赖 PDF 内部的绘图操作符（`m`, `re`, `l` 等），部分 PDF 缺少精确的位置信息。可尝试 `detect-pdf document.pdf --analyze --json` 查看检测到的表格边框坐标，手动确认是否为 PDF 本身数据质量问题。

**Q: 提取结果出现乱码（尤其是中文）？**
A: pdf-inspector 对 CID 字体有 ToUnicode CMap 解码支持，但部分使用非标准编码的老旧 PDF 会触发"编码问题检测"机制。检测结果中会有 `encoding_issues` 字段，提示你是否需要降级到 OCR 处理。

**Q: 浏览器 WASM 版本无法加载大文件？**
A: WebAssembly 版本将 CMaps 数据内嵌进二进制，文件体积约增加 5MB。建议对超大 PDF（>50MB）使用服务端 Python/Node 版本处理。

**Q: 如何与其他 PDF 库对比性能？**
A: 项目提供了[配对基准测试工具](docs/benchmarking.md)，可在相同基准集上对比两个本地构建的速度和准确率。

## 六、总结

pdf-inspector 的定位非常清晰——做一个**本地优先的 PDF 智能解析底座**。它不追求替代所有 PDF 解析场景，而是专注于"先分类再路由"这个核心决策点，将大部分无需 OCR 的文本型 PDF 拦截在本地处理，既快又省。对需要处理大量文档（RPA、OCR 预处理、文档数字化）的开发者而言，这个库值得加入工具箱。

GitHub 仓库：[https://github.com/firecrawl/pdf-inspector](https://github.com/firecrawl/pdf-inspector)
