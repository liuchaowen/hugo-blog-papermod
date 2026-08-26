---
title: "Garden Skills：为 AI 编程 Agent 打造的生产级技能集合"
date: 2026-08-26
description: "Garden Skills 是由 ConardLi 开源的一套面向 Claude Code、Cursor、Codex 等 AI 编程 Agent 的生产级技能集合，涵盖网页演示、前端设计、图像生成、知识库检索和文章编辑五大核心领域，每个技能都附带完整的 SKILL.md 规范、主题模板和实战案例。"
author: "Cheman"
slug: garden-skills
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "Agent Skills", "Claude Code", "Cursor", "AI编程"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Garden Skills**，一套专为 AI 编程 Agent 打造的生产级技能集合，让 Claude Code、Cursor、Codex 等工具获得网页演示、前端设计、图像生成、知识库检索和文章编辑五大核心能力。

## 一、项目概述

Garden Skills 是 ConardLi 开源的一套 **Agent Skills 集合**，专为 Claude Code、Cursor、Codex 等 AI 编程 Agent 设计。每个 Skill 都是一个自包含的文件夹，包含 `SKILL.md`（YAML frontmatter + 指令）、参考文档、脚本和资源文件。

项目目前包含 5 个核心技能：

| 技能名称 | 领域 | 核心能力 |
|---------|------|---------|
| `web-video-presentation` | 网页视频/演示 | 将脚本、文章、课程转化为 16:9 网页演示，支持 23 种主题 |
| `web-design-engineer` | 设计/前端 | 网页、落地页、仪表盘、交互原型、HTML 幻灯片、动画 |
| `gpt-image-2` | 图像生成 | 海报、UI 模型、产品视觉、信息图、技术图表、漫画等 |
| `kb-retriever` | 知识库检索 | 从本地 `knowledge/` 目录检索 Markdown/PDF/Excel 文件 |
| `beautiful-article` | 文章编辑 | URL/PDF/DOCX/Markdown → 精美可分享的文章（HTML/PDF） |

**核心特性**：

- **生产级质量**：每个技能都经过实战验证，附带丰富的参考文档和模板
- **跨 Agent 兼容**：支持 Claude Code、Cursor、Codex、Gemini CLI、OpenCode 等多种 Agent
- **灵活安装**：支持 `npx skills` CLI、Claude Code 插件市场、GitHub Releases 下载等多种方式

## 二、技术原理

### 架构设计

Garden Skills 遵循 [Agent Skills 规范](https://agentskills.io)，每个技能的目录结构如下：

```
<skill-name>/
├── SKILL.md      # 必需：触发条件 + 执行指令
├── README.md     # 人类可读文档
├── references/   # 可选：按需加载的扩展文档
├── scripts/      # 可选：确定性执行脚本
└── assets/       # 可选：模板、字体、图标
```

`SKILL.md` 的 `description` 字段是 Agent 决定是否激活该技能的契约：

```yaml
---
name: web-design-engineer
description: >
  Use this skill whenever the user's request involves a visual, interactive, 
  or front-end deliverable...
---
```

### 核心技术栈

| 技能 | 核心技术 |
|------|---------|
| `web-video-presentation` | Vite + React + TypeScript，支持 TTS（MiniMax、OpenAI、ElevenLabs 等） |
| `web-design-engineer` | HTML/CSS/JavaScript/React，25 种风格配方（Linear、Aesop、Bloomberg 等） |
| `gpt-image-2` | GPT Image 2 API，18 种视觉类别、79 个提示词模板 |
| `kb-retriever` | 分层索引、`grep`、`pdftotext`、`pdfplumber`、`pandas` |
| `beautiful-article` | Reacticle 组件协议，10 种文章类型、11 种作者主题 |

### 关键设计模式

**1. 硬协作检查点**

`web-video-presentation` 和 `beautiful-article` 都采用"硬检查点"模式：在脚本、主题、大纲、实现模式等关键决策点暂停，等待用户确认，避免 Agent 静默选择错误路径。

**2. 主题令牌架构**

`web-video-presentation` 内置 23 种主题，每种主题都是一套设计签名——编辑风格、终端风格、工程图纸、瑞士国际风格等。主题通过令牌（Token）驱动，而非 CSS 文件。

**3. 可插拔 TTS**

视频演示技能支持多种 TTS 提供商：内置 MiniMax `mmx-cli` 和 OpenAI TTS，同时提供 ElevenLabs / edge-tts / Azure / Google Cloud / macOS `say` 的即用代码片段。

**4. Reacticle 组件协议**

`beautiful-article` 使用语义优先的组件协议：`Hero / Lead / Section / Quote / Callout / Image / Formula / CodeBlock / Table` 等，底层 React 库在 [`ConardLi/reacticle`](https://github.com/ConardLi/reacticle)。

## 三、安装与快速开始

### 方式 A：`npx skills` CLI（推荐）

```bash
# 安装所有技能（最新版）
npx skills add ConardLi/garden-skills

# 安装单个技能
npx skills add ConardLi/garden-skills -s web-design-engineer

# 全局安装（~/.skills）
npx skills add ConardLi/garden-skills -s gpt-image-2 --global
```

### 方式 B：Claude Code 插件市场

```bash
/plugin marketplace add ConardLi/garden-skills
/plugin install presentation-skills@garden-skills
/plugin install web-design-skills@garden-skills
```

### 方式 C：固定版本（CI/生产环境）

```bash
SKILL=web-design-engineer
VERSION=1.3.0

curl -fsSL -o "${SKILL}.zip" \
  "https://github.com/ConardLi/garden-skills/releases/download/${SKILL}-v${VERSION}/${SKILL}-${VERSION}.zip"

# 校验 SHA256
curl -fsSL -o "${SKILL}.zip.sha256" \
  "https://github.com/ConardLi/garden-skills/releases/download/${SKILL}-v${VERSION}/${SKILL}-${VERSION}.zip.sha256"
shasum -a 256 -c "${SKILL}.zip.sha256"

# 解压到 Agent 技能目录
unzip -q "${SKILL}.zip" -d .claude/skills/
```

## 四、使用方法与实战

### 示例 1：网页视频演示

```bash
# 用户请求
"帮我把这篇技术文章转成网页演示，可以录屏当视频用"

# Agent 激活 web-video-presentation 技能后：
# 1. 将文章转为解说脚本
# 2. 映射脚本节拍到全屏场景
# 3. 在关键检查点暂停等待确认
# 4. 生成 1920×1080 的 Vite + React 项目
# 5. 可选：合成解说音频
```

内置主题示例：`creative-voltage`（创意演讲）、`blueprint`（技术架构）、`swiss-ikb`（数据报告）、`chalk-garden`（科普讲解）。

### 示例 2：前端设计

```bash
# 用户请求
"帮我做一个产品落地页，风格参考 Linear"

# Agent 激活 web-design-engineer 技能后：
# 1. 分析需求，输出 Design Read（差异度、动效、密度、资源依赖、品牌保真度）
# 2. 从 25 种风格配方中选择 `linear`
# 3. 声明设计系统（配色、排版、签名动作、反模式）
# 4. 构建完整体验
# 5. 验证结果
```

风格配方包括：`aesop`（药妆页面）、`muji-kenya-hara`（物件目录）、`monocle-magazine`（杂志内容）、`stripe-press`（书籍详情）、`bloomberg-terminal`（交易仪表盘）、`tufte-dataink`（数据叙事）等。

### 示例 3：图像生成

```bash
# 用户请求
"帮我生成一张产品海报"

# Agent 激活 gpt-image-2 技能后：
# 1. 检测运行模式（本地 Garden / 主机原生委托 / 仅顾问）
# 2. 从 79 个提示词模板中选择合适的类别
# 3. 生成并保存到 garden-gpt-image-2/ 目录
```

支持的视觉类别：海报、UI 模型、产品视觉、信息图、学术图表、技术架构图、漫画、头像、故事板、品牌板等。

### 示例 4：知识库检索

```bash
# 用户请求
"帮我从本地文档里找关于 API 认证的信息"

# Agent 激活 kb-retriever 技能后：
# 1. 导航分层 data_structure.md 索引文件
# 2. 精确关键词搜索 + 局部窗口读取
# 3. 处理 PDF/Excel 文件（使用参考文档中的方法）
# 4. 返回带来源的答案
```

### 示例 5：精美文章

```bash
# 用户请求
"把这个 PDF 转成一篇精美的技术文章"

# Agent 激活 beautiful-article 技能后：
# 1. 选择文章类型（长文/教程/报告/解释器/对话/评论/随笔/简报/视觉论文）
# 2. 选择作者主题（tufte/press/bayer/bodoni/vignelli/sottsass 等）
# 3. 在三个硬检查点暂停等待确认
# 4. 输出自包含的 HTML 文件（可选 PDF）
```

## 五、常见问题与解决方案

### 安装问题

**Q: `npx skills` 报错 `command not found`**

A: 确保 Node.js 版本 ≥ 20，并已安装 npm。`npx` 会自动下载 `skills` CLI。

**Q: Claude Code 插件市场无法访问**

A: 使用方式 C（GitHub Releases 下载固定版本 .zip），解压到 `.claude/skills/` 目录。

### 兼容性问题

**Q: 我的 Agent 不在支持列表里怎么办**

A: 只要你的 Agent 支持 `SKILL.md` 格式，复制技能文件夹到 Agent 扫描的目录即可。参考 [agentskills.io](https://agentskills.io) 规范。

**Q: 技能与我的项目现有配置冲突**

A: 每个 Skill 都是独立的文件夹，不会修改项目配置。如需自定义，可 fork 技能后修改 `SKILL.md`。

### 使用问题

**Q: 生成的网页在 Windows 上中文乱码**

A: `web-video-presentation` 生成的 HTML 默认 UTF-8，确保文本编辑器和浏览器编码设置正确。

**Q: 图像生成质量不满意**

A: `gpt-image-2` 技能的 `references/` 目录包含 18 种视觉类别、79 个结构化提示词模板，参考这些模板优化提示词。

**Q: 知识库检索结果不准确**

A: 确保 `knowledge/` 目录下有正确的 `data_structure.md` 分层索引文件。`kb-retriever` 最多执行 5 轮搜索，可通过优化索引结构提升准确性。

## 六、总结

Garden Skills 是目前最完善的 Agent Skills 集合之一，覆盖了 AI 编程 Agent 最常用的五大能力领域。每个技能都经过生产环境验证，附带丰富的参考文档、主题模板和实战案例。

**推荐使用场景**：

- 需要将技术文章/脚本转化为网页演示或视频
- 需要生成高质量前端设计（落地页、仪表盘、交互原型）
- 需要生成图像（海报、UI 模型、产品视觉、技术图表）
- 需要从本地知识库检索信息
- 需要将任意素材转化为精美文章

项目开源地址：[https://github.com/ConardLi/garden-skills](https://github.com/ConardLi/garden-skills)
