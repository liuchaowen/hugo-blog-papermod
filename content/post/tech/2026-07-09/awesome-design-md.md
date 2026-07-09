---
title: "Awesome DESIGN.md：收集 73 个主流网站设计系统的 AI 友好文档库"
date: "2026-07-09"
description: "Awesome DESIGN.md 是 VoltAgent 团队维护的精选项目，收录了 73 个主流网站（涵盖 AI 平台、开发者工具、金融科技、汽车等）的 DESIGN.md 设计系统文档，让 AI 编码助手能生成与目标网站视觉一致的高质量 UI。"
author: "Cheman"
slug: awesome-design-md
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "设计系统", "UI生成", "VoltAgent"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Awesome DESIGN.md**，由 VoltAgent 团队维护，收录了 73 个主流网站的设计系统文档，让 AI 编码助手能直接「照着这个风格生成界面」。

## 一、项目概述

### 什么是 DESIGN.md？

DESIGN.md 是 Google Stitch 在 2025 年提出的新概念——一个纯文本设计系统文档，AI 代理（coding agent）读取后即可生成视觉一致的高质量 UI。它的本质就是一个 Markdown 文件，不需要 Figma 导出、不需要 JSON Schema、不需要任何特殊工具链，直接丢进项目根目录即可。

| 文件 | 谁来读 | 定义内容 |
|------|--------|----------|
| `AGENTS.md` | 编码代理（coding agents） | 如何构建项目 |
| `DESIGN.md` | 设计代理（design agents） | 项目应该如何呈现 |

### 收录范围

Awesome DESIGN.md 目前收录了 **73 个**来自不同领域的网站 DESIGN.md 文件：

- **AI & LLM 平台**：Claude、Cohere、ElevenLabs、xAI、Ollama、Runway 等
- **开发者工具**：Cursor、Expo、Lovable、Raycast、Superhuman、Vercel、Warp
- **后端 & DevOps**：ClickHouse、MongoDB、PostHog、Sanity、Sentry、Supabase
- **生产力 & SaaS**：Cal.com、Intercom、Linear、Mintlify、Notion、Resend
- **金融科技**：Binance、Coinbase、Stripe、Revolut、Wise
- **电商 & 零售**：Airbnb、Nike、Shopify、Starbucks
- **汽车**：BMW、Tesla、Ferrari、Lamborghini
- **复古 Web 系列**：甚至还有 1996 年的 Dell 和 2001 年的 Nintendo.com 的 DESIGN.md！

### 每个 DESIGN.md 包含什么

每个文件遵循 Google Stitch 规范，并扩展为 9 个标准章节：

| # | 章节 | 内容 |
|---|------|------|
| 1 | 视觉主题与氛围 | 整体调性、密度、设计哲学 |
| 2 | 色彩体系与角色 | 语义化颜色名称 + hex 值 + 功能定义 |
| 3 | 字体排版规范 | 字体族、完整层级表 |
| 4 | 组件样式 | 按钮、卡片、输入框、导航（含各状态） |
| 5 | 布局原则 | 间距体系、网格、留白策略 |
| 6 | 深度与层级 | 阴影系统、表面层级 |
| 7 | Do's and Don'ts | 设计护栏与反模式 |
| 8 | 响应式行为 | 断点、触控目标、折叠策略 |
| 9 | Agent 提示词指南 | 快速颜色对照、可直接使用的提示词 |

此外，每个网站还提供 `preview.html` 和 `preview-dark.html` 两个可视化预览文件，直接在浏览器中展示色板、字体层级、按钮样式、卡片组件。

## 二、技术原理

### 核心设计思路

Awesome DESIGN.md 的本质是一个**结构化设计知识库**，通过将网站的设计 token（颜色、字体、间距等）提取为文本，使 LLM 无需任何解析器就能理解和应用。

每个 DESIGN.md 的核心是语义化的色彩定义，例如 Stripe 的设计文档中会有：

```markdown
## Color Palette & Roles

### Primary Brand
- Stripe Purple: `#635BFF` — brand identity, primary CTAs
- Weight 300 elegance for text hierarchy

### Semantic Colors
- Success: `#31D0C6` — positive states
- Warning: `#FFB254` — attention states  
- Error: `#F51A42` — error states
```

这种语义化命名让 AI 在生成代码时能理解「这个紫色是品牌色，应该用于主按钮」，而不是机械地复制 hex 值。

### 文件结构

```text
VoltAgent/awesome-design-md/
├── CLAUDE.md          # 项目说明
├── CONTRIBUTING.md    # 贡献指南
├── LICENSE            # MIT
├── README.md
└── sites/
    ├── claude/
    │   ├── design.md          # 主设计文档
    │   ├── preview.html       # 亮色预览
    │   └── preview-dark.html  # 暗色预览
    ├── cursor/
    ├── stripe/
    ├── tesla/
    └── ... (73 个网站)
```

### 生态工具：getdesign.md

项目还配套提供了一个网站 [getdesign.md](https://getdesign.md/)，可以：

- **浏览**：在线查看所有收录的 DESIGN.md 文件和预览
- **请求**：提交新网站的 DESIGN.md 请求（包含私密定制请求）

另有 [launchkit.getdesign.md](https://launchkit.getdesign.md/) 供 AI coding agent 和 web builder 集成使用。

## 三、安装与快速开始

### 环境要求

- 任意文本编辑器（VS Code、Obsidian 等）
- 可选：AI coding agent（如 Cursor、Claude Desktop）

### 使用方式一：直接下载

```bash
# Clone 仓库
git clone https://github.com/VoltAgent/awesome-design-md.git
cd awesome-design-md

# 查看所有收录的网站
ls sites/

# 打开某个网站的设计文档，例如 Figma
cat sites/figma/design.md
```

### 使用方式二：通过 getdesign.md 在线浏览

直接访问 [getdesign.md](https://getdesign.md/)，按分类浏览所有设计文档。

### 使用方式三：请求新的 DESIGN.md

如果目标网站不在收录列表中，访问 [getdesign.md/request](https://getdesign.md/request) 提交请求，支持公开收录和私密定制两种模式。

## 四、使用方法与实战

### 基础用法：让 AI 按设计文档生成 UI

以 Figma 的 DESIGN.md 为例，只需三步：

**第一步**：将 `DESIGN.md` 复制到你的项目根目录：

```bash
cp sites/figma/design.md ./my-project/
```

**第二步**：告诉你的 AI 编码助手：

> 「请参考项目根目录的 `DESIGN.md` 设计文档，生成一个展示 Figma 产品功能的页面。」

**第三步**：AI 会根据 DESIGN.md 中定义的：
- Figma 品牌紫蓝色 `#A259FF`
- Figma 字体规范（Product Sans / Font Family）
- 组件样式（按钮、卡片、导航栏）
- 间距与布局体系

生成与 Figma 官方视觉高度一致的 UI。

### 进阶用法：自定义混合

你也可以组合多个 DESIGN.md 的元素：

```markdown
> 请以 Stripe 的配色体系（`#635BFF` 品牌紫 + `#F6F9FC` 背景）为基础，
> 参照 Linear 的极简排版风格，
> 生成一个支付成功页面。
```

### 实际项目示例

社区中有开发者将此工具应用于：

1. **竞品分析**：提取竞品的设计 token，对比各平台的视觉策略
2. **设计系统迁移**：将 DESIGN.md 作为中间格式，实现 Figma → 代码的设计系统迁移
3. **AI 生成质量提升**：在 prompt 中加入 DESIGN.md 内容，显著提升 AI 生成 UI 的品牌一致性

## 五、常见问题与解决方案

**Q: 我的目标网站不在列表中，怎么办？**

A: 访问 [getdesign.md/request](https://getdesign.md/request) 提交请求，团队支持公开收录和私密定制两种交付模式。

**Q: DESIGN.md 和 Figma Design Token 有什么区别？**

A: DESIGN.md 是纯文本格式，无需任何特殊工具即可被 LLM 直接理解和应用；而 Figma Token 是 JSON 格式，需要额外的解析步骤。对于 AI coding agent 场景，Markdown 是 LLM 最擅长读取的格式。

**Q: 暗色模式的 preview.html 怎么使用？**

A: 直接在浏览器中打开 `preview-dark.html`，它展示了该网站在暗色表面下的设计系统表现，可作为暗色 UI 生成的参考标准。

**Q: 这些设计文档的版权问题？**

A: 项目在 MIT 协议下开源，DESIGN.md 文件中提取的设计 token（颜色 hex 值、字体名等）属于公开可见的 CSS 值，项目不声称对任何网站的视觉标识拥有所有权。

## 六、总结

Awesome DESIGN.md 解决了一个很实际的问题：AI 编码助手生成的 UI 往往缺乏品牌一致性，而传统的 Design Token 方案对 LLM 来说并不友好。通过将设计系统提炼为 LLM 友好的 Markdown 格式，它让「让 AI 照着某个网站的样子生成界面」变成了零门槛的操作。

目前收录了 73 个网站，覆盖 AI、开发者工具、金融、汽车等主流领域，且还在持续增长。如果你经常使用 AI coding agent 辅助开发，这个项目值得加入你的工具箱。
