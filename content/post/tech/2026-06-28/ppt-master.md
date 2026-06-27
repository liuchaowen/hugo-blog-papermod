---
title: "PPT Master: 用 AI 从任意文档生成原生可编辑的 PPTX"
date: 2026-06-28
description: "PPT Master 是一个开源 AI 演示文稿工具，可以在任何 AI IDE 中运行，将 PDF、DOCX、图片等文档直接转换为真正的 PowerPoint 文件，所有元素均可逐个编辑，彻底告别图片拼接式 PPT。"
author: "Cheman"
slug: ppt-master
draft: false
categories: [技术, 开源]
tags: [GitHub, AI, PPT, Python, 开源工具]
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

今天在 GitHub Trending 上看到一个有意思的项目：**PPT Master**，它能通过 AI 直接从任意文档（PDF、DOCX、图片等）生成真正的 PowerPoint 文件——不是图片拼接，而是每个元素都可以在 PowerPoint 中直接编辑的原生 DrawingML 图形。

## 一、项目概述

PPT Master 是一个开源的 AI 演示文稿生成工作流，核心设计理念是：**AI 生成的 PPT 必须是真正可编辑的 PowerPoint，而不是一张张打包进 PPTX 的图片**。

**核心特性：**

- **原生可编辑**：输出的每一个文本框、图形、图表都是 PowerPoint 原生 DrawingML 对象，而非嵌入的图片
- **透明成本**：工具本身完全免费，唯一的消耗是你使用的 AI 模型配额
- **数据本地化**：文件不需要上传到任何第三方服务器，AI 模型调用之外全程本地运行
- **不锁定平台**：支持 Claude Code、Cursor、VS Code Copilot 等主流 AI IDE，支持 Claude、GPT、Gemini、Kimi 等多种模型
- **模板复用**：可传入已有的 `.pptx` 模板，让 AI 填充新内容，保持品牌设计一致
- **自动生成旁白**：配合 `gpt-image-2` 等模型，还能生成幻灯片语音旁白

作者 Hugo He 本身是一位 CPA / CPV / 投资咨询工程师，日常工作中需要审阅和修改大量演示文稿，这个工具源于他"让 AI 生成的 PPT 能够在 PowerPoint 里直接改"的实际需求。

## 二、技术原理

### 架构设计

PPT Master 的本质是一个**结构化工作流（skill/harness）**，而非独立的应用程序。它运行在具有 agent 能力的 AI IDE 中，充当 AI 与 PowerPoint 生成引擎之间的协调层。

```
用户输入（文档 / 文本）
       ↓
   AI IDE Agent
   （Claude Code / Cursor / etc.）
       ↓
  PPT Master 工作流
  （skill/SKILL.md 定义流程）
       ↓
┌─────────────────────────┐
│   内容解析 & 布局规划    │
│   视觉设计 & SVG 生成    │
│   PPTX 导出（python-pptx）│
└─────────────────────────┘
       ↓
  输出：.pptx 文件
```

### 核心技术栈

| 组件 | 技术选型 | 作用 |
|------|---------|------|
| Python 3.10+ | 运行时 | 核心依赖 |
| `python-pptx` | PPTX 生成 | 构建原生 DrawingML 形状 |
| SVG 渲染 | 视觉元素 | 生成图标、装饰图形 |
| AI 模型 | 内容理解 + 设计规划 | 核心智能层 |
| `gpt-image-2`（可选） | 图片生成 | 生成幻灯片封面等配图 |
| Pexels/Pixabay API（可选） | 图库搜索 | 提供高质量免版权图片 |

### 质量天花板

作者在 README 中特别指出：

> PPT Master is a harness, not a complete agent. `harness + model = agent` — the tool owns the workflow; the model sets the ceiling.

这意味着输出的质量上限取决于所选 AI 模型的能力。推荐使用 **Claude Opus（约 1M token 上下文）配合 `gpt-image-2`**，可达到官方示例中的设计水准；Gemini 3.5 Flash 则是当前性价比最优的选择。

### 图片获取策略

PPT Master 提供了两条图片获取路径：

1. **AI 生成**（需配置 `IMAGE_BACKEND` + 对应 API Key）：调用 `gpt-image-2` 等模型自动生成配图
2. **网络图库搜索**：零配置可用 Openverse / Wikimedia Commons；配置 `PEXELS_API_KEY` 或 `PIXABAY_API_KEY` 可获得更高质量的商业图库资源

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- 一个具有 agent 能力的 AI IDE（推荐 Claude Code 或 Cursor）
- 一个 AI 模型的 API Key（Claude / GPT / Gemini 等）

### 安装步骤

```bash
# 方式一：下载 ZIP（无需 Git）
# GitHub 页面 → Code → Download ZIP，解压即可

# 方式二：Git clone
git clone https://github.com/hugohe3/ppt-master.git
cd ppt-master

# 安装依赖（唯一必需步骤）
pip install -r requirements.txt
```

> Windows 用户建议阅读 [docs/windows-installation.md](https://github.com/hugohe3/ppt-master/blob/main/docs/windows-installation.md) 获得详细的分步指引。

### 最简运行示例

1. 将源文件（PDF、DOCX 等）放入 `projects/` 目录
2. 在 AI IDE 中打开项目，告诉 AI：

```
请用 projects/report.pdf 制作一个 PPT，主题是季度报告
```

3. AI 会先确认设计规范（模板/比例/页数等），确认后自动完成全流程
4. 输出文件保存至 `exports/<name>_<timestamp>.pptx`

## 四、使用方法与实战

### 基础用法

**直接粘贴文本内容：**

```
你：请把以下内容做成 PPT：[粘贴文本内容]
```

**使用已有模板填充新内容：**

将你的 `.pptx` 模板文件路径发给 AI：

```
你：请用 templates/brand-deck.pptx 填充 projects/q3-report/sources/report.pdf 的内容
```

### 进阶用法

**生成带旁白的演示文稿：**

```
你：基于 projects/talk.md 制作一个 15 页的 PPT，并在每张幻灯片中添加语音旁白
```

**调整画布格式：**

PPT Master 支持多种画布格式（16:9 演示、小红书笔记、微信公众号封面等），在设计确认阶段告诉 AI 你需要的格式即可。

## 五、常见问题与解决方案

**Q: AI 生成的 PPT 效果不好怎么办？**
A: PPT Master 是 harness（工具），model 是 agent（大脑）。效果上限由模型决定。升级模型（如从 GPT-4o 换成 Claude Opus）+ 配合 `gpt-image-2` 图片生成，效果会显著提升。不要因为模型能力不足而否定工具本身。

**Q: 安装时报错 `Module not found`？**
A: 确保已执行 `pip install -r requirements.txt`，且使用的是 Python 3.10+ 环境。可用 `python3 --version` 确认版本。

**Q: 导出的 PPTX 打开是空白或格式错乱？**
A: 检查使用的 Office 版本是否在 2016 以上（不支持 Office 2013 及更早版本）。另确认 AI 选择的模型是否上下文窗口足够大（建议 200k+ tokens）。

**Q: 如何使用自定义模板？**
A: 在 AI IDE 中将你的 `.pptx` 文件路径发给 AI，并明确说明"用这个模板"或"填充这个模板"。AI 会保留模板中的版式、配色、字体，只替换文字和数据内容。

**Q: 图片质量参差不齐？**
A: 配置 Pexels/Pixabay API Key（免费额度足够个人使用），图片质量会大幅提升。参考 [docs/getting-started.md](https://github.com/hugohe3/ppt-master/blob/main/docs/getting-started.md) 中的 `.env` 配置说明。

## 六、总结

PPT Master 解决了一个非常具体的痛点：现有 AI PPT 工具要么输出图片式"假 PPT"，要么需要昂贵的专属订阅。PPT Master 通过**工作流+harness**的方式，将 AI 的内容理解能力与原生 PPTX 生成能力解耦，让你用自己信任的 AI 模型、自己的 PowerPoint，做真正可编辑的演示文稿。

唯一需要注意的是，这个工具的使用效果高度依赖 AI 模型的能力——花时间学习工作流、用更强的模型，产出质量会明显更好。如果你对演示文稿有较高要求，又恰好已经在用 Claude Code 或 Cursor，这绝对是一个值得一试的组合。

**GitHub 地址：** https://github.com/hugohe3/ppt-master  
**官方示例：** https://hugohe3.github.io/ppt-master/  
**作者网站：** https://www.hehugo.com/
