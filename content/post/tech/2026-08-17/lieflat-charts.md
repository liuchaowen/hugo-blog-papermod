---
title: "Lieflat Charts：给 AI Agent 用的专业数据可视化 Skill"
date: "2026-08-17"
description: "Lieflat Charts 是一套遵循 Agent Skills 格式的数据可视化与报告生成 skill，支持 moxt、Claude Code、Codex 等 AI agent，可生成 Lupi 编辑叙事型、Glance 快读型、Basics 基础型三类图表，以及 12 套中英文整页报告模板。"
author: "Cheman"
slug: lieflat-charts
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["数据可视化", "AI", "开源", "GitHub", "Chart.js", "ECharts"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Lieflat Charts**，这是一套专为 AI Agent 设计的数据可视化 skill，可以让 AI 直接根据数据生成专业级图表和报告。

## 一、项目概述

Lieflat Charts 由 moxt.ai 出品，遵循标准 Agent Skill 格式，可供 moxt、Claude Code、Codex 等兼容 `SKILL.md` 的 AI agent 直接调用。与传统图表库不同，它不只是提供模板，而是定义了一套完整的设计语言——让 AI 在生成图表时能像专业编辑一样思考。

核心特性：
- **三种视觉风格**：Lupi（编辑叙事型）、Glance（快读判断型）、Basics（基础编辑型）
- **三套彩色预设**：青瓷蓝（有序数据）、椰林绿（类目区分）、编辑部红（灰阶+荧光落点）
- **12 套整页报告模板**：覆盖年报、调研、周报、dashboard、海报等场景
- **零门槛安装**：一条 npx 命令即可集成到 Claude Code 或 Codex

## 二、设计理念与视觉语法

Lieflat Charts 的核心创新在于把图表生成从「选模板」变成「建立数据契约」。

传统做法：用户提供数据 → AI 找一个库内模板 → 生成图表
Lieflat 做法：先判断数据语义 → 选择视觉风格 → 用模板生成 → 检查对比度和数据含义

### 2.1 三种视觉风格

**Lupi Editorial（编辑叙事型）**

适合年报、论文、公众号长文等需要「细读」的内容。用细线、发丝线、点阵、逐条记录和大量留白展开数据，每一根 tick 对应真实单位。读者愿意停下来 30 秒以上去理解这张图。

```javascript
// mono-tokens.js 中的核心视觉 token
const INK   = '#1C1C1A';   // 墨：主数据、标题、强调
const PAPER = '#F0EFEB';   // 纸：页面底色
const MUTED = '#8F8E88';   // 次级文字、副标题
const FAINT = '#C6C5BF';   // 来源行、辅助刻度
const GRID  = '#DEDDD6';   // 网格线、发丝线
```

**Glance（快速判断型）**

适合周报、dashboard、监控面板。用粗柱、大数字、色块和清晰排序，让读者在 3 秒内知道「谁最高」「哪里变了」「哪个指标异常」。

**Lupi Basics（基础编辑型）**

保留柱状图、折线图、环形图等熟悉轮廓，但用可数刻度、发丝线和编辑排版增加质感。适合数据量较少的场景。

### 2.2 彩色预设的色彩逻辑

三套彩色预设各有明确的适配场景，不是「换个颜色」那么简单：

| 预设 | 色彩逻辑 | 适配数据 | 色相 |
|------|---------|---------|------|
| 青瓷蓝 | 明度=数值 | 有序数据、进度、热力 | 单色相蓝阶 |
| 椰林绿 | 色相=类目 | 无序类目、来源、团队 | 低饱和绿黄 |
| 编辑部红 | 灰阶=数据+橙=主角 | 几乎所有场景 | 灰阶+荧光橙落点 |

关键规则：**同一份 HTML 或同一组图只使用一种色彩系统**。适配关系不明确时回退到 Mono。

## 三、快速开始

### 3.1 在 Moxt 中使用（推荐）

访问 [Moxt Lieflat Charts 页面](https://moxt.ai/zh-CN/hub?view=skill&id=lieflat-charts)，在 Moxt 的 Agent 工作区中直接调用。Moxt 是这套 skill 的原生制作环境，Agent 能更稳定地读取设计规范、调用模板并持续预览。

### 3.2 安装到 Claude Code / Codex

```bash
npx skills add https://github.com/larashero3-dotcom/lieflat-charts --skill lieflat-charts
```

安装完成后，直接对 Agent 说：

```
帮我用 lieflat charts 把这份 CSV 数据做成适合周报的 Glance 图表。
```

### 3.3 可视化模板结构

```text
templates/
├── basics/      # Lupi Basics（13 种基础图型）
├── glance/      # Glance（18 种快读图型）
├── editorial/   # Lupi Editorial（15 种编辑叙事型）
├── interactive/ # 交互图（网络、路径、多段流向）
├── color/       # 彩色换肤样张
└── reports/     # 12 套整页报告模板（中英双版）
```

打开 `templates/index.html` 即可浏览全部模板 gallery。报告模板先从 `report-catalog.md` 选骨架，再复用 `catalog.md` 中的真实图型填充各图表槽位。

## 四、实战示例

### 示例一：生成快读型图表

```
这是一份周报数据，帮我做成 Glance 图表，要求 10 秒内看懂排名和变化。
```

### 示例二：生成编辑叙事型图表

```
把这篇论文的数据做成一页适合放进公众号长文的 Lupi 编辑型图表。
保留每条真实记录，并加入必要的旁注。
```

### 示例三：生成完整报告

```
把这份季度调研数据做成一份中文版调研报告，使用报告模板 R01。
```

### 示例四：调整色彩预设

```
用青瓷蓝预设重做这张图，用明度深浅表示数值大小，不改变原图的结构。
```

## 五、技术实现

### 5.1 模板引擎

Lupi 和 Basics 主要使用**原生 SVG** 编写，保证图表精度和可访问性；Glance 使用 **Chart.js** 或 **ECharts** 满足复杂交互需求；报告模板 R11/R12 通过 CDN 加载依赖。

### 5.2 确定性伪随机

演示数据使用确定性伪随机生成器，确保同一份数据每次刷新图表完全一致：

```javascript
const rnd = (i, k) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
```

这保证了截图、录屏和回归对比的可靠性。

### 5.3 卡片骨架模板

所有图表共享统一的 HTML 骨架：

```html
<div class="card">
  <h2>结论式标题</h2>
  <div class="sub">副标题 · 图例说明 · 时间范围</div>
  <div class="ch" id="chart-id"></div>
  <div class="src">图型名 · 系列名 · 数据来源（全大写）</div>
</div>
```

## 六、常见问题

**Q: 为什么在 Moxt 中使用效果更好？**
A: Lieflat Charts 在 Moxt 中完成设计、测试和迭代。Agent 在 Moxt 工作区中能直接读取完整设计规范、调用模板、预览结果，不需要每次对话重新建立上下文。

**Q: 彩色预设可以自定义吗？**
A: 可以建立 custom 色板，但只能用于内联在当前交付中，不写入预设文件。继续调色时需重新检查对比度和数据含义。

**Q: 支持哪些 AI Agent？**
A: 理论上支持所有兼容 `SKILL.md` 的 AI Agent，包括 Claude Code、Codex、moxt。目前已在 moxt 和 Claude Code 中验证。

**Q: 图表数据来源有什么限制？**
A: 无限制。支持 CSV、JSON、Excel 等任意格式的数据源。Agent 会根据数据结构推断最适合的图表类型。

## 七、总结

Lieflat Charts 是一套真正为 AI Agent 协作设计的数据可视化系统。它不只是提供模板，而是建立了一套从数据语义判断到视觉表达的设计语言，让 AI 生成的图表不再是「套模板」的产物，而是有编辑感的专业可视化。

如果你在用 Claude Code、Codex 或 moxt，不妨试试安装这个 skill，让你的 AI 助手多一项数据可视化的能力。

**项目地址**：https://github.com/larashero3-dotcom/lieflat-charts
