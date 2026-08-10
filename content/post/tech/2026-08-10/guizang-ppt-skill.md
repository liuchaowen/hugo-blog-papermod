---
title: "Guizang PPT Skill：让 Claude Code / Codex 一键产出单文件 HTML 网页 PPT"
date: 2026-08-10
description: "Guizang PPT Skill 是一个面向 Claude Code / Codex 等 Agent 环境的网页 PPT 技能，能生成单文件 HTML 横向翻页 PPT、PPT 配图与多平台封面，并内置完整的排练与演讲者模式。本文拆解其双视觉系统、版式锁定机制与本地演讲者运行时。"
author: "Cheman"
slug: guizang-ppt-skill
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "Agent", "Claude Code", "Codex", "PPT", "HTML", "瑞士风"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Guizang PPT Skill**，它把"做一份好看的 PPT"这件事拆成了一套 Agent 能稳定执行的标准工作流，产出的是无需构建、浏览器直接打开的单文件 HTML 网页 PPT。

## 一、项目概述

**Guizang PPT Skill**（作者 op7418 / 歸藏）是一个适配 Claude Code、Codex 等 Agent 环境的网页 PPT 技能。它解决的核心问题是：当 AI Agent 需要为线下分享、产品发布、方法论演讲产出演示文稿时，Markdown 表现力不足，而传统 PPTX 又难以被 Agent 稳定读写与校验。

它的核心交付物是**单文件 HTML 横向翻页 PPT**，并额外覆盖三类衍生内容：

- **PPT 配图**：在 Codex 中调用 GPT-Image 2.0 / GPT-M 2.0 生成纪实照片、信息图、流程图、UI 情景图，并按模板比例插入。
- **多平台封面**：用同一套视觉规则生成公众号 21:9 头图、1:1 分享卡、小红书 3:4、视频号横版等封面。
- **演讲者模式**：双窗口观众屏、当前页/下一页 16:9 预览、演讲备注、计时排练、自动翻页、激光笔与现场故障恢复，全部在本地完成。

项目内置两套视觉系统：

- **Style A：电子杂志 × 电子墨水**。像 *Monocle* 贴上代码，适合叙事、观点、个人风格表达，提供 10 种布局与 5 套电子墨水主题。
- **Style B：瑞士国际主义**。网格至上、单一高饱和锚点色、直角发丝线、极致字号对比，适合事实、产品、分析表达，提供 22 种锁定版式与 4 套锚点色。

## 二、技术原理

### 2.1 为什么是单文件 HTML

项目的设计决策里有一条主线：**HTML / CSS 是文本，Agent 能直接读、改、验证**。相比 PPTX 二进制或富文本格式，文本化的 deck 有几个不可替代的优势：

1. **更适合 Agent 生成和修改**：Read / Edit / 校验都建立在纯文本之上，无需专门解析器。
2. **表现力比 Markdown 更高**：可做精细排版、空间定位、动画、交互与响应式封面。
3. **交付更轻**：单文件 HTML 可直接打开、演示、发送、截图，演讲者工具随文件一起交付。
4. **更容易做质量控制**：瑞士风可用脚本校验版式、图片槽位、标题对齐、危险 SVG，并在可用时用 Playwright 后验测量 overflow、底部空白与标题间距。
5. **更适合视觉内容链路**：同一套主题能覆盖 PPT、配图、封面与截图再设计。

### 2.2 双视觉系统与版式锁定

Style B 瑞士风不是"换一套 CSS"，而是一套更严格的版式系统，这也是它能用脚本做质量控制的根本原因：

- **22 个具名版式**：正文页只能从 `S01` 到 `S22` 中选择（Cover、Statement、KPI Tower、Loop Diagram、Duo Compare、Image Hero、Closing Manifesto 等），不能临时发明页面结构。
- **4 套锚点色**：克莱因蓝 IKB `#002FA7`、柠檬黄 `#FFD500`、柠檬绿 `#C5E803`、安全橙 `#FF6B35`，**不允许自定义 hex 值**。
- **网格锁定**：16 列 grid、直角色块、1px 发丝线、无阴影、无渐变、无圆角。
- **图片槽位绑定**：图片必须进入模板预留的 `data-image-slot`，主图按 21:9 或 16:10 生成。

对应有两套校验脚本，CI 会拦截漂移：

```bash
node scripts/validate-swiss-deck.mjs path/to/index.html
node scripts/validate-presenter-mode.mjs path/to/index.html --target-minutes 30
node scripts/check-presenter-runtime-sync.mjs
```

### 2.3 本地演讲者运行时

两套模板共享同一套演讲者运行时，点右下角 `P` 即可进入演讲者视图，浏览器会同时打开一个干净的观众屏。所有能力都在本地 HTML 和浏览器里完成，不依赖实时字幕、云端中继或 AI 教练服务：

- **当前页与下一页**：上下排列并保持 `16:9`，小屏等比缩放不裁切。
- **结构化备注**：每页目的、讲述要点、转场必填；互动、语气、翻页时机等仅在大纲提供时显示。
- **排练与计时**：记录每页实际时长与整场汇总，数据存本地，不做 AI 评分。
- **现场工具**：激光笔、圈选、一键黑/白屏、冻结观众屏，并在观众窗口关闭时明确显示"未连接"。

常用快捷键：`← / →` 翻页，`G` 宫格，`L` 激光笔，`C` 圈选，`B / W` 黑屏或白屏，`F` 冻结观众屏。

## 三、安装与快速开始

### 环境要求

- 一个能读写文件并执行 shell 命令的 AI Agent（Claude Code / Codex / Cursor 等）
- 浏览器（用于预览与演讲者模式）

### 一行命令安装（推荐）

```bash
npx skills add https://github.com/op7418/guizang-ppt-skill --skill guizang-ppt-skill
```

### 手动克隆

```bash
git clone https://github.com/op7418/guizang-ppt-skill.git ~/.claude/skills/guizang-ppt-skill
```

安装后验证目录应包含 `SKILL.md`、`assets/`、`references/` 三项：

```bash
ls ~/.claude/skills/guizang-ppt-skill/
```

直接对 Agent 说即可触发，例如：

```text
帮我基于这篇文章做一份瑞士风 PPT，控制在 7 页左右，需要 2-3 张配图。
```

## 四、使用方法与实战

### 4.1 结构化工作流

Skill 本身是分步引导的标准流程，Agent 会逐步推进：

1. **选择风格** — Style A 电子杂志风，或 Style B 瑞士国际主义。
2. **需求澄清** — 7 问清单：风格、受众、时长、素材、图片/截图需求、主题色、硬约束。
3. **拷贝模板** — Style A 用 `assets/template.html`，Style B 用 `assets/template-swiss.html`。
4. **填充内容** — 先做主题节奏表，再从对应 layout 骨架里挑、粘、改文案。
5. **可选配图** — 在 Codex 中询问是否用 GPT-Image 2.0 / GPT-M 2.0 生成配图并按页面比例插入。
6. **生成演讲备注** — 从大纲提取每页目的、讲述要点、转场和计划时长，未提供的信息不猜测。
7. **自检** — 对照 `references/checklist.md`，P0 级问题必须全过；瑞士风和演讲模式分别运行对应校验器。
8. **预览** — 浏览器直接打开。
9. **排练 / 演讲** — 按右下角 `P` 进入演讲者模式。
10. **迭代** — 根据排练结果调整内容、字号、高度和间距。

### 4.2 多平台封面生成

基于同一份内容可生成典型规格封面，原则是只用少量关键词、视觉重心落在大标题上：

- **公众号头图**：21:9，主标题优先，边缘保留视觉锚点。
- **公众号分享卡**：1:1，与头图共用主题色与视觉元素。
- **小红书封面 / 轮播**：3:4，大标题优先，多张时统一字号节奏。
- **视频号 / 横版封面**：16:9，标题 + 副标题 + 单一视觉焦点。

### 4.3 示例请求

```text
帮我基于这篇文章生成一份 8 页左右的瑞士风 PPT，需要 3 张配图，图片比例跟模板槽位匹配。
帮我把这个产品分析文档做成电子杂志风 PPT，重点突出观点和叙事节奏。
基于这份 PPT 的主题，做两张封面：公众号 21:9 头图和 1:1 分享卡，视觉保持一致。
把这些产品截图重新设计成统一的 16:10 PPT 配图，保留关键信息，不要画页脚和标题。
```

## 五、常见问题与解决方案

### Q1：普通 Chatbot 能用吗？
不推荐。没有文件系统和浏览器预览时，很难稳定生成完整 deck。项目设计面向 Claude Code / Codex / Cursor 等有 shell 权限的本地 Agent。

### Q2：能导出 PPTX 吗？
当前核心交付是 HTML，可用浏览器演示、截图或录屏。若确需 PPTX，建议把 HTML 页面作为视觉稿再转换，这并非主流程。

### Q3：为什么不允许自定义颜色？
重点是稳定产出。自由选色很容易破坏整体风格，所以只允许从预设主题里选（Style A 5 套、Style B 4 套锚点色）。

### Q4：Codex 配图是必须的吗？
不是。没有配图也能生成 PPT，配图流程只在需要照片、信息图、UI 情景图或封面时使用。

### Q5：演讲者模式需要联网或额外服务吗？
不需要。双窗口同步、备注、计时、排练、自动翻页和标注都在本地浏览器完成，不提供实时字幕或 AI 评分。

## 六、总结

Guizang PPT Skill 的价值不只是"生成 PPT"，而是把一套经过线下分享反复打磨的设计经验，固化成了 Agent 可复用的结构化工作流。它对版式的严格锁定（尤其是瑞士风的 22 个具名版式 + 脚本校验）和本地演讲者运行时，让"AI 做 PPT"从随机发挥走向稳定交付。对想在 Agent 时代批量产出高质量演示物料的个人或小团队来说，这是一个值得直接装上的技能。

> 项目地址：[github.com/op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)，许可证 AGPL-3.0。
