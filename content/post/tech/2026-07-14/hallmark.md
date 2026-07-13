---
title: "Hallmark：让 AI 生成的设计拒绝「AI 味」的设计技能"
date: 2026-07-14
description: "Hallmark 是 Together AI 推出的一个面向 Claude Code、Cursor 和 Codex 的设计技能，它通过 20 套主题、四种动词与 57 项「AI 味」检测关卡，让大模型生成的 UI 看起来像人工打磨而非模板套壳。本文解析其架构、用法与安装方式。"
author: "Cheman"
slug: hallmark
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 设计, Claude Code]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Hallmark**，一个由 Together AI 打造、专为 AI 编程助手（Claude Code / Cursor / Codex）设计的设计技能，核心价值是用一套「反 AI 套路」的规则集，让生成的前端界面看起来像出自人类设计师之手，而不是千篇一律的模板套壳。

## 一、项目概述

`Nutlope/hallmark`（v1.1.0，MIT 协议）本质上是一个 **design skill**——它不是运行时库，而是一套放进 AI 编码助手「技能目录」里的行为规则与参考资料。当助手接到「做一个落地页 / 后台 / 产品站」这类需求时，Hallmark 会接管视觉决策，目标是让两个不同需求生成的页面「像两个不同站点」，而不是同一套模板换了个配色。

它对外暴露四个动词（verb）：

| 动词 | 作用 |
| --- | --- |
| *(default)* | 全新构建 UI：挑选宏观结构、套用规则集、发出前跑 slop 测试 |
| `hallmark audit <target>` | 对照反模式给既有代码打分，只给问题清单，不改代码 |
| `hallmark redesign <target>` | 丢弃结构、保留文案与信息架构与品牌，用不同的「指纹」重建 |
| `hallmark study <截图\|URL>` | 提取你欣赏的设计的「DNA」（宏观结构、字体配对、色彩锚点），拒绝像素级克隆与付费模板，可选导出可移植的 `design.md` |

核心卖点可以浓缩为三点：**20 套主题（theme）**、**57 项 slop-test 关卡**，以及**发出前的自我批评（pre-emit self-critique）**。

## 二、技术原理

### 宏观结构优先于模板

Hallmark 的思路是先为需求「选宏观结构（macrostructure）」，再披上主题外衣。这意味着它不从 `navbar + hero + features + footer` 这种固定骨架出发，而是根据 brief 决定页面骨架。每个生成结果会在 CSS 注释里盖上一个 macrostructure 标记，便于追溯「这次到底选了哪套结构」。

### 20 套主题 + Custom 分支

内置 20 套主题覆盖了从极简 SaaS、大气旅行站到噪点印刷（Riso）等多种气质。当出现「现有目录主题都装不下」的创意需求时，Hallmark 会切到 **Custom** 分支，从调色板、字体到布局重新量身设计——协议写在 `skills/hallmark/references/custom-theme.md`，且对普通需求永远保持「安静的分支」，不会污染常规生成。

### 57 项 slop-test 关卡

这是它拒绝「AI 味」的关键。Hallmark 在交付前会跑过 57 项反模式关卡（中心对齐大段正文、假渐变光斑、毫无理由的圆角玻璃拟态、emoji 堆砌等典型 LLM 默认套路都在此列），任何一项不通过都会被拒收重做。再叠加一轮 **pre-emit self-critique**，模型在吐出最终代码前先自我审视，主动规避被训练数据「带偏」的 on-distribution 默认值。

### DNA 提取而非像素克隆

`hallmark study` 提取的是设计「DNA」——宏观结构、字体配对、色彩锚点，并明确拒绝像素级克隆与付费模板。它还能导出一份可移植的 `design.md`，方便把风格交接给其它 AI 工具复用。

## 三、安装与快速开始

环境要求极低：只要你的编码助手支持 skill 目录即可。

```bash
npx skills add nutlope/hallmark
```

随时重跑即可更新。也可以手动把 `SKILL.md` 与 `references/` 复制到对应目录：

- **Claude Code**：`~/.claude/skills/hallmark/`
- **Cursor**：`.cursor/rules/hallmark.mdc`（放 `SKILL.md` 正文，不要 frontmatter）
- **Codex**：`~/.codex/skills/hallmark/`（个人）或 `.codex/skills/hallmark/`（项目级）

安装后本地预览生成站点：

```bash
python3 -m http.server --directory site 4173
```

## 四、使用方法与实战

最常见的用法是直接描述需求，让默认动词构建新 UI：

> 帮我做一个 sourdough（酸面包）教学 App 的落地页

Hallmark 会自行挑选主题（如 Hum）、结构，并在交付前跑完整 slop 测试。若要诊断现有页面：

```bash
hallmark audit ./my-landing-page
```

想彻底换气质但保留内容：

```bash
hallmark redesign ./my-landing-page
```

想把欣赏的某个设计风格「学」成可复用规则：

```bash
hallmark study https://example.com/some-nice-site
```

仓库 `site/_tests/` 与官网 usehallmark.com 提供了一整套真实示例（Bubble 酸面包 App、Distil 抽取 API、Cold Snap 唱片厂牌、Cinder AI 推理工具等），可以从它们反推 Hallmark 在不同 brief 下的决策差异。

## 五、常见问题与解决方案

**Q：安装后助手没生效？**
A：确认 skill 目录路径正确（Claude Code 用 `~/.claude/skills/`，Cursor 用 `.mdc` 规则文件且不含 frontmatter），并重跑 `npx skills add` 更新。

**Q：生成结果还是有点「模板感」？**
A：先用 `hallmark audit` 看它打出的 punch list，定位被触发的反模式；若需求本身创意性很强，可尝试用更具体的 brief 触发 Custom 分支。

**Q：能复用我喜欢的某个站点风格吗？**
A：用 `hallmark study <URL|截图>` 提取 DNA，它拒绝像素克隆，只会抽象出结构/字体/配色，并可选导出 `design.md` 交给其它工具。

**Q：支持哪些编码助手？**
A：官方明确支持 Claude Code、Cursor、Codex；其它支持自定义 skill/rule 的助手可通过复制 `SKILL.md` + `references/` 适配。

## 六、总结

Hallmark 的聪明之处在于：它不试图让 AI「画得更漂亮」，而是用规则集和大量反模式关卡，把 AI 最容易滑入的「默认审美」硬拽回来。对常年被「AI 生成感」劝退、又想用编码助手提速前端的开发者来说，这是一个值得塞进工具链的小而锋利的技能——尤其那句「两个不同 brief 像两个不同站点，而不是同一模板的换色」的承诺，恰恰戳中了当前 AI 生成 UI 最大的痛点。
