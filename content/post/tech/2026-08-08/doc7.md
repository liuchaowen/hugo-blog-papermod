---
title: "doc7：用本地视觉语言模型把任意文档转成 AI 可读的 Markdown"
date: "2026-08-08"
description: "doc7 是一款开源文档转换工具，通过本地部署的视觉语言模型（VLM）将 PDF、Office 文件、扫描件、图片等任意格式文档转换为结构化 Markdown，无需云 API，按页计费彻底成为历史。"
author: "Cheman"
slug: doc7
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "文档处理", "Go", "VLM", "Markdown"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**doc7**，它能把 PDF、Office 文件、扫描件、截图、图表、公式乃至整个文档目录直接转换为 AI 可读的 Markdown——用的是你自己的本地视觉语言模型，无 API 按页计费，无文档解析服务商绑定。

## 一、项目概述

doc7 是一个用 Go 编写的开源文档转换工具，核心思路非常直接：**把文档渲染成页面图片，再让视觉语言模型理解整页内容，输出结构化 Markdown**。与传统的 OCR + 解析器管道不同，它不依赖格式特异的文本提取逻辑，任何视觉上能看到的元素——文字、表格、公式、图表关系、UI 状态——都以统一的方式被理解。

核心特性一览：

- **单一管道处理所有格式**：PDF、DOCX/PPTX/XLSX、扫描件、图片（PNG/JPEG/WebP/TIFF 等）、EPUB、HTML、EML、MSG、Jupyter Notebook，一个模型理解所有
- **本地 VLM，不按页收费**：连接 LM Studio 或 Ollama 的本地视觉模型（qwen3.5 系列即可），无限页转换，零边际成本
- **多端使用**：CLI 交互界面、批量处理、MCP 工具（AI 助手集成）、Go SDK、异步 HTTP 服务
- **精确值校验**：对含嵌入文本层的 PDF 可选开启 `--text-grounding`，提取数值和代码后让模型二次确认，减少幻觉
- **断点续传**：长文档失败页可单独重试，不重新处理已成功的页面
- **Benchmark 实测领先**：用 qwen3.5-9b 模型在 Attention Is All You Need 论文截图和视觉报告两个测试集上，doc7 拿到了 15/15 全对，MarkItDown + OCR 9/15，Docling 标准管道仅 3/15

## 二、技术原理

### 2.1 整体架构

doc7 的转换链路拆解为三个阶段：**渲染 → VLM 理解 → Markdown 输出**。

```
输入文件 → [MuPDF/LibreOffice/Chrome] 渲染为页面图片
         → [OpenAI 兼容 VLM API] 全页视觉理解
         → [Markdown 组装] 单文件 + 分页 JSON + 元数据
```

源码 `api.go` 中的核心函数签名清晰展示了这一设计：

```go
// doc7/api.go
func Convert(ctx context.Context, inputPath string, options Options) (Summary, error) {
    value, err := extract.Run(ctx, inputPath, extract.Options{
        OutputDir: options.OutputDir,
        Render: render.Options{
            OutputDir: options.OutputDir,
            DPI:       options.DPI,
            KeepImages: options.KeepImages,
        },
        VLMConfig: vlmConfig(options.Provider, options.BaseURL,
                              options.Model, options.APIKey, ...),
    })
    return summaryFromInternal(value), publicError(err)
}
```

`render` 包负责把不同格式文档渲染为图像；`vlm` 包负责与视觉语言模型通信；`extract` 包负责流程编排与结果组装。三者完全解耦，这也是为什么它能支持 CLI、SDK、HTTP 服务和 MCP 多种入口。

### 2.2 视觉理解的优势

传统解析器（MarkItDown、Docling 等）对每种格式有一套专用的解析逻辑：PDF 用文本层提取、Office 文件用 OOXML 解析、表格用专门的表格检测模型。doc7 彻底放弃这条路，只做一件事：**把页面渲染出来，让 VLM 看图说话**。

这样做有几个直接好处：

1. **格式无关**：新增格式只需加一个渲染器，理解层代码完全不用改
2. **复杂布局天然处理**：跨列表格、图文混排、手写公式、截图中的图表——模型能理解空间关系，规则解析器很难
3. **代码示例中的 Benchmark 结果**：Raster-only（无文本层）的 PDF，doc7 依然能提取 Attention 论文的 Figure 2 结构图中的有序关系和公式，而基于文本提取的工具对此无能为力

### 2.3 上下文窗口保护机制

VLM 的上下文窗口有限，当请求图片 + 提示词超出限制时，doc7 有两层保护：

```go
// 超出上下文窗口时自动降分辨率重试，默认最多降 2 次
// 降至 720 像素长边仍未成功 → 标记该页失败，不写截断内容
```

源码中的关键逻辑：

```go
// doc7/internal/vlm/config.go
Config struct {
    MaxTokens         int  // 默认 8192
    ContextFallbacks  int  // 默认 2 次降分辨率
    MinImageDimension int  // 最低 720px
}
```

### 2.4 Docker 部署的全套依赖

doc7 的 Dockerfile 打包了所有运行时依赖：

```dockerfile
# doc7/Dockerfile
FROM debian:bookworm-slim
RUN apt-get install -y \
    chromium \          # HTML/SVG/EPUB/EML/MSG 渲染
    libreoffice \      # Office 文件渲染
    mupdf-tools \      # PDF 渲染
    fonts-noto-cjk     # CJK 字体支持
```

这意味着用 Docker 运行时不依赖宿主机上的 LibreOffice 或 Chromium，只需一个模型 API 地址即可。

## 三、安装与快速开始

### 3.1 安装 CLI

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/magicrew/doc7/main/scripts/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/magicrew/doc7/main/scripts/install.ps1 | iex
```

或直接下载 release 包解压后运行。

### 3.2 配置本地模型

首次运行会自动发现本地 LM Studio 或 Ollama，用户选择模型后保存配置：

```bash
# 手动配置
doc7 setup config --base-url http://127.0.0.1:1234/v1 --model qwen3.5-9b

# 查看当前配置
doc7 config show
```

支持任何 OpenAI 兼容端点（本地/私有部署均可），API Key 通过环境变量或交互式安全输入，不写入配置文件。

### 3.3 最简转换示例

```bash
# 单文件转换
doc7 read report.pdf -o report-doc7

# 批量目录
doc7 read ./documents -o ./knowledge

# 管道输出（可配合其他工具）
doc7 read report.pdf --stdout > report.md

# 远程 URL 直转
doc7 read https://example.com/report.pdf -o ./report-doc7
```

### 3.4 Docker 部署

```bash
export DOC7_MODEL=qwen3.5-0.8b
export DOC7_SERVER_TOKEN=your-secure-token
docker compose up
# 服务地址：http://127.0.0.1:8787
curl -F file=@report.pdf http://127.0.0.1:8787/v1/jobs
```

Docker 镜像中 LM Studio 的默认地址为 `host.docker.internal:1234`，开箱即用。

## 四、使用方法与进阶技巧

### 4.1 断点续传

长文档转换中偶有页面失败，只需：

```bash
doc7 read report.pdf -o report-doc7 --resume
```

doc7 会自动找到失败的页面，仅重试这些页，已成功的页面保持字节级一致。

### 4.2 指定页面范围

```bash
# 只转换第 5 和第 7 页
doc7 read report.pdf -o report-pages-5-7 --pages 5,7

# 第 10-12 页
doc7 read report.pdf -o report-pages-10-12 --pages 10-12
```

### 4.3 AI 聊天交互

```bash
# 直接聊天
doc7 chat "你好，介绍一下自己"

# 带文档的对话（模型可调用 convert_document 工具）
doc7 chat "把 report.pdf 转成可搜索的 Markdown"
```

模型通过 OpenAI Tool Calling 决定是否调用文档转换工具，工具集受限且有目录白名单，安全边界明确。

### 4.4 MCP 集成

在 Claude Desktop 或 Cursor 的 MCP 配置中加入：

```json
{
  "mcpServers": {
    "doc7": {
      "command": "/usr/local/bin/doc7",
      "args": ["mcp"],
      "env": {
        "DOC7_BASE_URL": "http://127.0.0.1:1234/v1",
        "DOC7_MODEL": "qwen3.5-4b"
      }
    }
  }
}
```

AI 助手即可直接调用 `convert_to_markdown` 工具处理用户上传的文档。

### 4.5 精确值校验

对含嵌入文本层的 PDF（而非扫描件），开启文字锚定：

```bash
doc7 read report.pdf --text-grounding
```

这会让模型对比视觉理解结果和嵌入文本层的精确数值，减少表格数字的幻觉错误。

## 五、常见问题与解决方案

### Q1: 首次运行报模型连接失败？

```bash
# 先验证模型服务是否运行
doc7 doctor --check-model

# 或手动指定端点
doc7 config set base_url http://127.0.0.1:1234/v1
doc7 config set model qwen3.5-9b
```

确保 LM Studio/Ollama 已加载一个视觉模型（Qwen2-VL、llama3.2-vision 等），非视觉模型无法处理图像输入。

### Q2: macOS 下载 release 后无法运行？

浏览器下载的包可能被附加了隔离属性：

```bash
xattr -dr com.apple.quarantine ~/Downloads/doc7-darwin-arm64
```

### Q3: 长 PDF 大量页面失败？

尝试更大的上下文窗口模型（如 qwen2.5-vl 系列），或降低 DPI：

```bash
doc7 read long-report.pdf -o out --dpi 150
```

DPI 降低减少图片 token 数，但可能影响小字体识别精度。

### Q4: Docker 容器中无法连接宿主机模型？

宿主机必须监听 `0.0.0.0` 而非 `127.0.0.1`，因为从容器内部看宿主机 IP 是 `host.docker.internal`：

```bash
# LM Studio / Ollama 配置
# 确保监听地址为 0.0.0.0:1234
```

### Q5: 转换结果中有表格合并错乱？

这通常是模型输出的 Markdown 表格格式不够规范，可结合 `--text-grounding`（若文件有文本层）或者使用更大尺寸的模型重试。

## 六、总结

doc7 的核心价值在于**重新定义了文档转 Markdown 这件事的成本结构**：传统方案按 API 调用或页数计费，文档量大时成本线性增长；doc7 把模型推理成本固定在你已有的硬件上，边际成本趋近于电费。

对于 RAG 系统搭建者、AI 应用开发者和文档密集型团队，这个工具值得放进工具箱。尤其是它对 Raster-only PDF 和复杂视觉文档的理解能力，是传统文本提取方案难以企及的。有本地 GPU 或统一内存充裕的 Mac 的开发者，可以零成本跑通整个流程。

GitHub 地址：[https://github.com/magicrew/doc7](https://github.com/magicrew/doc7)
