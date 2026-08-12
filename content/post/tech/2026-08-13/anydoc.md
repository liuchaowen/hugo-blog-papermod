---
title: "anydoc：用 Rust 将任意文档一键转为干净 Markdown 的开源利器"
date: 2026-08-13
description: "anydoc 是 Firecrawl 团队开源的 Rust 库，支持 14 种文档格式（Word、Excel、PPT、PDF、RTF、EPUB 等）在单数字毫秒级转换为统一的 GitHub-Flavored Markdown，提供 Node.js、Python、WASM 多语言绑定，并可作为 Agent Skill 直接集成到 AI 编程助手中。"
author: "Cheman"
slug: anydoc
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "文档转换", "Markdown", "开源工具", "AI"]
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

今天在 GitHub Trending 上看到一个让人眼前一亮的项目：**anydoc**，一个由 Firecrawl 团队开源的 Rust 库，可以在单数字毫秒内将任意格式的办公文档（Word、Excel、PowerPoint、PDF、RTF、EPUB 等 14 种格式）转换为干净的 GitHub-Flavored Markdown，堪称 AI 时代文档预处理的终极武器。

## 一、项目概述

anydoc 解决了什么问题？当你需要让 AI 读取一份客户发来的 `.docx` 报告、工程师交接的 `.xlsx` 数据表，或者运营团队的 `.pptx` 方案时，传统方案要么依赖 LibreOffice 慢如蜗牛（median 1129ms），要么用 Pandoc 格式支持残缺（仅 5/14），再或者用 mammoth 这样只能处理单一格式的库拼凑一锅粥。

anydoc 的核心定位是：**一个库搞定所有格式，一个输出格式（GFM），速度还要快一个数量级**。它同时支持 14 种格式，覆盖 Word 全家桶、Excel 全家桶、PowerPoint 全家桶、OpenDocument、RTF、EPUB、CSV 和 PDF，且完全不依赖 ML 模型或外部服务——纯 Rust 实现，无网络请求，文件在本地处理。

## 二、技术原理与架构设计

### 2.1 统一文档模型

anydoc 的架构核心是一套跨格式统一的 Document Model。所有格式解析器（doc、docx、pptx、xlsx、odt、rtf、epub、csv、pdf）最终都输出同一个中间结构：

```
Document
├── blocks（段落、标题、列表、表格、块引用等）
├── inlines（粗体、斜体、链接、内联代码等）
├── footnotes（脚注 / 尾注）
└── assets（图片、嵌入对象，带媒体类型标签）
```

这一设计的关键价值在于：**Markdown 序列化器只需要写一份**。所有格式的输出 quirk 修复只需在一处进行，一个 bug fix 同时修复 docx、rtf、odt 等所有格式的输出质量。

### 2.2 内容级格式检测

anydoc 不依赖文件扩展名来判断格式，而是直接从文件内容中读取格式指纹：

| 格式 | 检测依据 |
|------|---------|
| PDF | PDF 文件头 `%PDF-x.y` |
| RTF | RTF 打开组 `\rtf` |
| Office Open XML (.docx/.pptx/.xlsx) | ZIP 包 mimetype |
| OLE 复合文档 (.doc/.ppt/.xls) | OLE 流名称 |
| CSV | 无内置标记 → 依赖扩展名或显式指定 |

```rust
// Rust 示例
let format = Format::from_bytes(&bytes);        // 内容检测
let format = Format::from_extension("pptm");   // 扩展名检测
let format = Format::from_path(Path::new("report.odt")); // 路径推断
```

### 2.3 PDF 处理

anydoc 内置集成 [pdf-inspector](https://github.com/firecrawl/pdf-inspector)，无需 OCR 服务即可提取文本型 PDF 的内容。扫描版（图片型）PDF 则无法处理，此时推荐配合 Firecrawl Parse 的 OCR API。

### 2.4 基准测试结果

在 100 份真实文档、14 种格式的盲测中，由 Claude Sonnet 5 评分，anydoc 在质量和速度上均大幅领先：

| 指标 | anydoc | 第二名 |
|------|--------|--------|
| 支持格式数 | **14/14** | 12/14（LibreOffice） |
| 中位转换时间 | **4.4ms** | 52.5ms（mammoth） |
| 综合得分 | **81** | 70（mammoth） |
| 每格式得分 | **全格式第一** | — |

## 三、安装与快速开始

### 3.1 多语言环境安装

**Rust（本地库）：**

```bash
cargo add anydoc
```

**Node.js：**

```bash
npm install @firecrawl/anydoc
```

**Python：**

```bash
pip install firecrawl-anydoc
```

**浏览器 / WebAssembly：**

```bash
npm install @firecrawl/anydoc-wasm
```

### 3.2 CLI 快速上手

无需安装，直接用 `npx` 调用（首次自动下载预编译二进制）：

```bash
# 标准用法：文件转 Markdown
npx @firecrawl/anydoc report.docx

# 输出到文件
npx @firecrawl/anydoc slides.pptx -o slides.md

# 支持 stdin 管道
cat data.csv | npx @firecrawl/anydoc - --format csv
```

### 3.3 各语言代码示例

**Node.js：**

```javascript
import { toMarkdown } from '@firecrawl/anydoc';

const markdown = await toMarkdown('report.docx');
console.log(markdown);
```

**Python：**

```python
import anydoc

markdown = anydoc.to_markdown("report.docx")
print(markdown)
```

**Rust：**

```rust
use anydoc::{to_markdown, to_document, ConvertError};

let markdown = anydoc::to_markdown("report.docx")?;
let document = anydoc::to_document(&bytes)?;
```

## 四、使用方法与实战

### 4.1 基础文档转换

```bash
# 批量转换一个目录（需配合 shell 循环）
for f in *.docx; do npx @firecrawl/anydoc "$f" -o "${f%.docx}.md"; done
```

### 4.2 作为 AI Agent Skill 使用

anydoc 还发布了官方的 Agent Skill，让 AI 编程助手直接可以读取用户的办公文档：

```bash
npx skills add firecrawl/anydoc
```

安装后，Claude Code、Codex、Cursor、OpenCode 等兼容 Agent Skill 的 AI 编程助手在遇到 `.docx`、`.xlsx`、`.pptx` 等文件时，可以直接调用 anydoc 提取内容，无需人工干预。

### 4.3 错误处理

anydoc 的错误类型经过精心设计，区分了"无法转换"和"转换失败"：

```rust
match anydoc::to_markdown(path) {
    Ok(markdown) => Some(markdown),
    // 格式不支持或加密文件 → 跳过，记录日志
    Err(error @ (ConvertError::Encrypted | ConvertError::Unsupported(_))) => {
        unconverted.push((path, error));
        None
    }
    // 格式损坏 → 视为严重错误，终止流程
    Err(error) => return Err(error),
}
```

| 错误类型 | 含义 | 处理建议 |
|---------|------|---------|
| `Unsupported` | 未知格式或图片型 PDF | 跳过 |
| `Encrypted` | 加密 / 密码保护 | 跳过 |
| `Malformed` | 结构损坏，无法提取有意义内容 | 严重错误 |
| `ResourceLimit` | 超过解压 / 嵌套 / 节点数安全限制 | 严重错误 |
| `Io` | 文件无法读取 | 检查路径权限 |

## 五、常见问题

**Q：anydoc 和 Pandoc 相比有什么优势？**
A：Pandoc 仅支持 5/14 种格式，且在各项格式评分中均低于 anydoc（综合得分 56 vs 81）。此外，anydoc 的中位转换速度（4.4ms）比 Pandoc（102ms）快约 23 倍。

**Q：可以处理中文文档吗？**
A：可以。anydoc 使用 `encoding_rs` 处理字符编码，完整支持 UTF-8、GBK、Big5 等常见编码，中文文档内容转换后保留完整。

**Q：扫描版 PDF 能处理吗？**
A：纯文本型 PDF 可以直接处理。扫描版（图片型）PDF 无法提取文字，需要配合 OCR 服务（如 Firecrawl Parse 的 OCR API）使用。

**Q：文件扩展名被改错的情况下能检测到正确格式吗？**
A：可以。由于 anydoc 使用内容级格式检测（见 2.2 节），文件扩展名错误或缺失不影响正确识别，但 CSV 格式因为没有内容级标记，仍然依赖扩展名或显式指定。

**Q：处理大文件（如几百 MB 的 Excel）会怎样？**
A：anydoc 设置了固定的安全限制（解压大小、嵌套深度、节点数），超过限制时返回 `ResourceLimit` 错误，避免内存耗尽。

## 六、总结

anydoc 是目前文档转 Markdown 领域最全面、最快速的解决方案——14 种格式全覆盖、单数字毫秒级速度、纯本地 Rust 实现、多语言 SDK 支持，并可作为 Agent Skill 直接集成进 AI 工作流。如果你正在构建 AI 文档处理 pipeline、RAG 数据预处理系统或 AI 编程助手的内容读取能力，anydoc 值得优先考虑。

**GitHub 仓库：** [https://github.com/firecrawl/anydoc](https://github.com/firecrawl/anydoc)  
**在线体验：** [https://firecrawl.github.io/anydoc/](https://firecrawl.github.io/anydoc/)（WebAssembly 版本，完全本地处理）
