---
title: "Diagram Design：60 秒让 AI 画出贴合品牌的编辑级图表"
date: 2026-08-11
description: "cathrynlavery/diagram-design 是一个 Claude Code Skill，内置 27 种编辑级图表类型，并能在 60 秒内读取你的网站、把品牌色与字体自动映射到每一张图。本文解析它的架构设计、品牌 onboarding 流程、设计系统与实战用法。"
author: "Cheman"
slug: diagram-design
draft: false
categories: [开源, 技术]
tags: [GitHub, 开源, AI, Claude, 图表, 设计, Skill]
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

今天在 GitHub Trending 上看到一个有意思的项目：**diagram-design**。作者 Cathryn Lavery（BestSelf.co 创始人）做了一个 Claude Code Skill，专门用来生成"设计师不会嫌弃"的编辑级图表——27 种类型、三种视觉变体，并且能读取你的网站，在 60 秒内把品牌色与字体映射到每一张图里。

## 一、项目概述

**Diagram Design 想解决的问题很具体**：每次需要架构图、流程图、金字塔图时，向 AI 要一张图，得到的往往是千篇一律的圆角矩形，跟你自己网站的气质毫不沾边。要么在 Figma 里花 30 分钟手动调色，要么干脆放弃画图。

这个 Skill 的做法是：把图表当成"带品牌调性的编辑内容"来做，而不是"又一张 AI 生成的方块图"。

核心特性可以概括为四点：

- **27 种图表类型**：架构图、流程图、时序图、状态机、ER 图、时间线、泳道图、象限图、树、组织架构、维恩图、图层、金字塔、雷达图、Loop（飞轮）、甘特图、散点图、数据流向、Medallion 数仓分层、数据安全矩阵等，覆盖技术文档与商业表达的主流场景。
- **三种视觉变体**：每种图都提供 minimal light（浅色极简）、minimal dark（深色极简）、full-editorial（完整编辑版，带摘要卡片）三套，直接在浏览器打开，无构建步骤、无 JS、无外部图片。
- **60 秒品牌 onboarding**：Skill 读取你的网站首页，提取主色板与字体栈，映射成语义 token（paper / ink / muted / accent / link），让后续每张图都沿用你的品牌色。
- **自包含 HTML 交付**：图表以单文件 HTML 产出，可一键导出 SVG / PNG，用于 Figma、幻灯片或社交卡片。

> 项目对"质量"有一个反直觉的坚持：*最高质量的动作通常是删减*。每个节点都要"挣到自己的位置"，强调色只留给读者最先该看的 1–2 个东西，目标密度 4/10。

## 二、技术原理

### 渐进式披露（Progressive Disclosure）的架构

Skill 的目录结构刻意做"瘦身"：顶层 `SKILL.md` 只做索引——告诉 Claude 怎么选类型、去哪找细节；34 个 reference 文件（每个图表类型 / 原型 / 工具一个）只在真正用到时才被加载。

```text
diagram-design/
├── SKILL.md                         — 顶层：理念、选型指南、检查清单
├── references/                      — 仅在选择某类型/原型时加载
│   ├── style-guide.md               — 颜色 + 字体的唯一真源
│   ├── onboarding.md                — URL-to-tokens 流程
│   ├── type-architecture.md
│   ├── type-flowchart.md
│   ├── type-sequence.md
│   ├── primitive-annotation.md      — 斜体衬线编辑式旁注
│   ├── primitive-sketchy.md         — 手绘 SVG 滤镜变体
│   └── primitive-terminal.md        — 炭黑 CLI 窗口变体
├── assets/
│   ├── index.html                   — 在线画廊（浅/深/编辑三标签）
│   ├── template*.html               — 新建图表脚手架
│   └── example-<type>.html          — 3 变体 × 27 类型
└── docs/screenshots/                — README 中的配图
```

这带来一个很实际的收益：**无论有多少类型，Claude 一次只读它需要的那一个**。比如你说"画个流程图"，它只加载 `SKILL.md` + `type-flowchart.md`；要做"终端窗口风"的图，才加载 `primitive-terminal.md`。要加第 28 种类型，只需丢一个 `type-<name>.md` 并在选型指南里接上，其余什么都不用改。

### 设计系统（Design System）

整套视觉由一套紧凑的规则约束，作者强调这些是"不可谈判"的，正是它们让图不显得"AI 生成"：

- 单一强调色，每张图 1–2 个焦点元素；
- 三族字体：Instrument Serif（标题 + 斜体旁注）、Geist Sans（节点名）、Geist Mono（技术子标签，如端口、URL、字段类型）；
- 1px 发丝边框、无阴影、最大圆角 10px；
- **所有坐标、宽度、间距都 4 的倍数**——这是消除"廉价感"的关键；
- 珊瑚色调的焦点节点把视线引向最重要的 1–2 个东西。

### 品牌 Onboarding：从网站 URL 到设计 token

这是项目最有意思的部分。流程如下：

```text
你:     "onboard diagram-design to https://yoursite.com"
Claude: → 抓取首页
        → 提取主色板 + 站点的字体栈
        → 把探测到的值映射到语义角色: paper, ink, muted, accent, link
        → 展示建议 diff
        → 将 token 写入 references/style-guide.md
你:     "yes, apply it"
```

映射关系是有"规则依据"的，而不是随便取色：

| 从站点探测到 | 变成 |
|---|---|
| `<body>` 背景色 | `paper` token |
| 主文本颜色 | `ink` token |
| 次要 / 说明文本 | `muted` token |
| 卡片 / 容器 | `paper-2` token |
| 最常用品牌色（CTA、链接、标题） | `accent` token |
| `<h1>` 字体族 | `title` 字体 |
| `<body>` 字体族 | `node-name` 字体 |
| `<code>` / `<pre>` 字体 | `sublabel` 字体 |

所有下游（27 种图、旁注原型、画廊）都读取**语义角色名**（如 `accent`），而不是硬编码的 `#eb6c36`——这让"换肤"变成改一个文件。

### 对比度自动校验

在写入 token 前，Skill 会自动做 **WCAG AA 对比度检查**（`ink` 覆盖在 `paper` 上）。如果你的品牌色在图表字号（9–12px）下对比度不达标，它会提议一个调整后的取值并解释原因。这是一个很"产品化"的细节。

### 原型与 2.0 的 Loop

除了 27 种图，Skill 还提供可组合的**原型（primitive）**：

- **Annotation callout**：斜体 Instrument Serif + 虚线贝塞尔引线，用于写在页边的编辑式旁注；
- **Sketchy filter**：SVG turbulence + displacement map 实现手绘感（适合随笔，不适合技术文档）；
- **Icon set**：55 个单色 IT / 云图标（取自 Tabler Icons 与 Simple Icons，分别 MIT / CC0），统一用 `currentColor` 继承编辑皮肤或你的品牌色。

2.0 新增的 **Loop** 是"带共享记忆中枢的飞轮"——围绕一个 hub 排布的站点 + 虚线写回（write-back），用来表达自我强化的循环。

## 三、安装与快速开始

### 方式一：克隆 + 软链（可自定义）

```bash
# 克隆仓库，再把内层 skill 软链到 Claude Code 的 skills 目录
git clone git@github.com:cathrynlavery/diagram-design.git ~/code/diagram-design
ln -s ~/code/diagram-design/skills/diagram-design ~/.claude/skills/diagram-design
```

真正的 Skill 在仓库内部的 `skills/diagram-design/`（同一棵树既可作为 Claude Code 插件、Codex 插件，也可作为独立 Skill）。软链让 Claude Code 指向这个内层目录。重启 Claude Code 后，Skill 以 `diagram-design` 注册，只要你让 Claude 画图就会激活。

### 方式二：作为插件安装（更快，但不可手改）

```text
# Claude Code
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design

# Codex
npx skills add https://github.com/cathrynlavery/diagram-design --skill diagram-design
```

> 区别：插件方式装在插件缓存里，对 `references/style-guide.md` 的手改不会随更新保留；如果你打算手工定制风格指南，用克隆方式。

### 打开画廊

```bash
open ~/.claude/skills/diagram-design/assets/index.html
```

浏览器里即可切换 light / dark / full-editorial 标签，翻看全部 27 种图。

## 四、使用方法与实战

### 自然语言驱动

在 Claude Code 里直接开口即可，它会自动选类型、构建 HTML 并保存：

```text
"Make me an architecture diagram of my app: frontend, backend, database, Redis cache."
"I need a quadrant showing Q2 projects by impact vs effort."
"Give me a sequence of a bearer call with token refresh on 401."
```

时序图的分支刷新用到了组合片段（combined-fragment）语法，仓库里的 `assets/example-sequence-oauth.html` 给出了 bearer + ALT 刷新的参考实现。

### 从模板起步

```bash
cp assets/template.html my-diagram.html        # minimal light
cp assets/template-full.html my-diagram.html   # editorial + 摘要卡片
```

### 导出为 PNG / SVG

图表以自包含 HTML 交付，但可导出图本体（不含编辑卡片）用于 Figma / 幻灯片：

```text
/diagram-design:export path/to/diagram.html
/diagram-design:export path/to/diagram.html --svg-only
/diagram-design:export path/to/diagram.html --png-only --scale=3
```

- **SVG**：抽取 `<svg>` 节点并注入 Google Fonts，可独立在浏览器、Figma、Illustrator 中渲染；
- **PNG**：默认 Playwright 2× 栅格化，一次性准备：`pip install playwright && playwright install chromium`。

若要截图完整编辑布局，用浏览器的打印到 PDF 或整页截图即可。

## 五、常见问题与解决方案

**Q1：首次使用被卡住，提示"风格指南还是默认的"？**
这是设计的 **first-run gate**：Skill 不会把默认皮肤的图悄悄塞进一个"本该有品牌"的项目。首次在新项目里画图时，它会检查 `style-guide.md` 是否被定制过；若没有，会问你要"跑 onboarding / 手动贴 token / 用默认继续"。解决办法就是按需选择其一。

**Q2：网站提取出的颜色对比度不达标？**
Skill 会在写 token 前自动做 WCAG AA 校验。若你的品牌色在小字号下不达标，它会主动提议调整后的取值并解释原因。你可以接受建议值，或回到 `style-guide.md` 手动设置。

**Q3：导出 PNG 报错 / 没反应？**
PNG 导出依赖 Playwright 无头浏览器，需先 `pip install playwright && playwright install chromium`。只想拿矢量图的话，用 `--svg-only` 可绕过浏览器。

**Q4：想完全自定义风格怎么办？**
直接打开 `skills/diagram-design/references/style-guide.md` 编辑那张 token 表即可。所有下游都读语义角色名，改一处全局生效。插件安装方式下请改用克隆方式，否则改动会被插件更新覆盖。

**Q5：提交新示例前怎么自检？**
仓库提供 `python3 scripts/lint-skin.py <your-new-example.html>` 做皮肤 lint；全仓基线检查 `python3 scripts/lint-skin.py --all --baseline` 必须保持绿色。

## 六、总结

`diagram-design` 把"让 AI 画图"从"生成一个还行的方块图"升级成了"产出有品牌调性、有编辑审美的图表系统"。它真正的巧思不在于 27 种类型的数量，而在于**渐进式披露的架构**（保持上下文精简）、**语义化的设计 token**（让品牌换肤只需改一处）、以及**URL-to-token 的 onboarding + WCAG 自动校验**（把"像不像我的站"这件事工程化了）。

如果你日常写技术博客、产品文档或创业复盘，经常需要"一张能直接用的好图"，这个 Skill 值得一试——尤其当你受够了 Figma 里 30 分钟的配色拉锯战。

> 项目地址：https://github.com/cathrynlavery/diagram-design
