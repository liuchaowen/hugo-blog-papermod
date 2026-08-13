---
title: "watermarks-remover: 多厂商 AI 水印一键清除工具"
date: "2026-08-13"
description: "watermarks-remover 是一款纯 Python stdlib 实现的开源工具，支持同时去除 Claude、Gemini、OpenAI 等主流 AI 生成内容的水印标记，涵盖 Unicode 隐匿字符、C2PA 元数据、统计采样水印等多个层次，适用于文本、PNG、JPEG、SVG、PDF、DOCX 等多种文件格式。"
author: "Cheman"
slug: watermarks-remover
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "Python", "隐私"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**watermarks-remover**，一句话描述就是——一个纯 Python 标准库实现的多厂商 AI 水印清除工具，支持文本和文件的 Unicode 层、统计采样层、C2PA 元数据层等多层次水印去除。

## 一、项目概述

`watermarks-remover` 由开发者 [guillaumemeyer](https://github.com/guillaumemeyer/watermarks-remover) 开源，定位是帮助用户清除自己拥有内容的 AI 生成痕迹。它的核心目标并非"伪造人工创作"，而是**隐私与内容卫生**——当你拥有某段文本或文件的版权，却不想附带 AI  provenance 信息时，这个工具可以帮你处理。

项目覆盖的 AI 厂商和生态系统包括：

- **Claude**（Anthropic）
- **Gemini / SynthID-Text**（Google）
- **OpenAI** provenance surfaces
- **Open-LLM**（Kirchenbauer 风格水印等开源模型）

支持的输入格式覆盖文本层和文件层：

| 通道 | 覆盖内容 |
|------|----------|
| Unicode 隐匿字符层（Layer A） | 零宽字符、双向文本控制符、Tag 字符、特殊空格等 |
| 统计采样水印层（Layer B） | 基于 token 采样偏差的文本水印 |
| 文件元数据层 | C2PA / EXIF / XMP / Office 文档属性 |

支持的容器格式：PNG、JPEG、SVG、PDF、DOCX、ODT、HTML、Markdown。

最新版本为 **v0.3.2**，已在 GitHub 获得持续更新，聚焦安全加固和供应链加固。

## 二、技术原理

### 2.1 双层清除架构

watermarks-remover 采用业界标准的**双层水印模型**，这也是 [Institute of AI PM 指南](https://www.institutepm.com/knowledge-hub/ai-content-provenance-watermarking) 中推荐的分析框架：

- **Layer A（确定性清除）**：针对基于编辑手段注入的水印，通过正则和字符串操作直接移除 Unicode 零宽字符、Bidi 控制符、Tag 字符等。这类水印有确定性的检测和清除方法。

- **Layer B（统计采样水印）**：针对分布在 token 选择中的采样偏差信号。由于信号分散在全篇文字中，没有万能清除手段，工具采用**重写攻击**（paraphrase attack）——通过让非原厂商模型对文本进行大幅度改写来稀释水印信号。这也是文献中的标准攻击方式。

工具在文档中坦诚指出：Layer B 是 **best-effort** 的，代价是**内容质量退化**。如果你本来就打算用更弱的模型重写，那直接用弱模型生成内容反而更简单。

### 2.2 核心脚本设计

项目以纯 Python stdlib（3.10+）为主，核心脚本位于 `skills/remove-ai-marks/scripts/`：

**统一文件处理入口：**

```python
# 统一 inspect / clean
python3 scripts/inspect_file.py draft.md
python3 scripts/clean_file.py draft.md -o draft.cleaned.md
python3 scripts/clean_file.py photo.png -o photo.cleaned.png
```

**Layer A 文本检查与清除：**

```python
python3 scripts/inspect_text.py draft.md
python3 scripts/clean_text.py draft.md -o draft.cleaned.md --stats
```

**Layer B 重写（可选，需外部模型）：**

```python
# 默认仅打印 prompt（无需 API key）
python3 scripts/rewrite_text.py draft.md --backend print-prompt --strength paraphrase

# 可选接入 Ollama 本地模型
WATERMARKS_REWRITE_BACKEND=ollama WATERMARKS_REWRITE_MODEL=llama3.2 \
  python3 scripts/rewrite_text.py draft.md -o draft.rewritten.md
```

### 2.3 安全写入机制

v0.3.2 引入了**原子写入**（atomic write）机制，每次写入通过临时文件 + 重命名完成，拒绝符号链接目的地，防止预置符号链接攻击文件写入路径。同时通过 `RLIMIT_AS`/`RLIMIT_FSIZE` 对子进程（exiftool、c2patool、SynthID scorer）施加资源上限，防止恶意大文件耗尽系统资源。

```python
# 安全写入示例（项目实际使用）
def safe_write_bytes(path: Path, data: bytes):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_bytes(data)
    tmp.rename(path)  # atomic on POSIX
```

### 2.4 可选 SynthID 像素评分

工具支持对图像进行 **SynthID 置信度评分**（来自 Google DeepMind），但仅用于**检测/评分**，不执行像素级水印移除。这需要额外 checkout 外部项目 [`aloshdenny/reverse-SynthID`](https://github.com/aloshdenny/reverse-SynthID)，通过 `setup_synthid.sh` 引导安装 venv 依赖：

```bash
./skills/remove-ai-marks/scripts/setup_synthid.sh
REVERSE_SYNTHID_DIR=~/reverse-SynthID \
  ~/reverse-SynthID/.venv/bin/python scripts/inspect_image.py shot.png
```

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- 可选：`c2patool`（C2PA manifest 检查）
- 可选：`exiftool`（PDF 元数据清除首选）
- 可选：Ollama 或 OpenAI API key（Layer B 重写）

### 安装方式

**作为 Agent Skill 安装（推荐用于 AI Agent）：**

```bash
mkdir -p ~/.grok/skills
ln -sfn "$(pwd)/skills/remove-ai-marks" ~/.grok/skills/remove-ai-marks
```

调用方式：对话中直接说 `/remove-ai-marks` 或"清除 AI 水印"。

**作为独立脚本使用：**

```bash
git clone https://github.com/guillaumemeyer/watermarks-remover.git
cd watermarks-remover
SCRIPTS=skills/remove-ai-marks/scripts

# 快速体验
python3 "$SCRIPTS/clean_text.py" tests/fixtures/sample_watermarked.txt \
  -o /tmp/cleaned.txt --stats
```

**运行测试：**

```bash
python3 -m venv .venv && .venv/bin/pip install pytest
.venv/bin/python -m pytest
# 或快速冒烟测试
make smoke
```

## 四、使用方法与实战

### 4.1 文本 Layer A 清除

```bash
# 检查文本中的 AI 水印
python3 scripts/inspect_text.py article.md

# 清除并查看统计
python3 scripts/clean_text.py article.md -o article.cleaned.md --stats
```

### 4.2 文件元数据清除

```bash
# 图像（PNG/JPEG）
python3 scripts/clean_file.py photo.png -o photo.cleaned.png

# PDF（需要 exiftool）
python3 scripts/clean_file.py document.pdf -o document.cleaned.pdf

# Office 文档
python3 scripts/clean_file.py report.docx -o report.cleaned.docx
```

### 4.3 Layer B 统计水印重写

```bash
# humanize 强度：消除 AI 风格措辞
python3 scripts/rewrite_text.py article.md \
  --strength humanize \
  -o article.rewritten.md

# code 强度：针对代码注释和文档字符串
python3 scripts/rewrite_text.py src.py \
  --strength code \
  -o src.clean.py

# 自定义 temperature 和候选数量
python3 scripts/rewrite_text.py article.md \
  --temperature 0.9 \
  --candidates 5 \
  -o article.rewritten.md
```

## 五、常见问题与解决方案

**Q: Layer B 重写后内容质量下降明显？**  
这是不可避免的 trade-off。统计水印信号分布在 token 选择中，稀释信号需要实质性的词汇和句式改写。建议：如果你本来就打算用更弱的模型重写，直接生成即可，无需先让强模型生成再清除水印。

**Q: PDF 清除效果不理想？**  
PDF 元数据清除强烈依赖 `exiftool`。未安装 exiftool 时，PDF 清除会降级。如果需要干净的 PDF，建议安装：`brew install exiftool`（macOS）。

**Q: 如何避免重写时重新打上水印？**  
Layer B 应使用**非原厂商**模型重写。例如不要用 Claude 重写 Claude 生成的内容，这可能重新打上水印。项目推荐使用本地 open-weight 模型（Ollama）来避免这一问题。

**Q: C2PA 硬绑定能否被清除？**  
不能。C2PA 的内容签名绑定在内容本身（而非元数据），仅移除元数据无法解除硬绑定的 Content Credentials。工具会报告已移除元数据，但不保证解除内容层的 provenance 链接。

**Q: 项目支持 Docker 吗？**  
支持。SynthID scorer 有专用的 Dockerfile 构建：`make docker-synthid-build`。

## 六、总结

`watermarks-remover` 是一款定位清晰、技术实现扎实的 AI provenance 清理工具。它的双层架构（确定性 Layer A + 统计 Layer B）对应了当前 AI 水印的两大技术路线，文档也诚实地说明了 Layer B 的局限性和质量代价。对于需要处理自己拥有内容的水印/元数据问题的开发者或研究者，这是一个值得关注的实用工具。

项目地址：[github.com/guillaumemeyer/watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover)
