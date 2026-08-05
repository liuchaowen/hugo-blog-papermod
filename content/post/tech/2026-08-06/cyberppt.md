---
title: "CyberPPT：把文档变成咨询级高保真 PPT 的 Codex Skill"
date: 2026-08-06
description: "CyberPPT 是一个 Codex Skill，能将文档、研究材料和业务数据转化为高密度、可编辑、咨询风格的 PowerPoint 演示文稿。本文解析其三段式强制流程、8 种视觉风格与 15 道质量门禁，看它如何解决 AI 做 PPT 常见的密度不足与还原失真问题。"
author: "Cheman"
slug: cyberppt
draft: false
categories: [技术, 开源, AI工具]
tags: [GitHub, 开源, AI, PPT, Codex, 自动化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**CyberPPT**，一个把文档、研究材料和业务数据转化为「咨询级、高密度、可编辑」PowerPoint 的 Codex Skill，核心思路不是套模板，而是先把素材变成可审计的证据链，再逐页还原蓝图。

## 一、项目概述

CyberPPT 是一个面向 **Codex** 的 Skill（技能包），目标是把杂乱的源材料——DOCX、PDF、TXT、XLSX、研究报告、业务数据——转成符合 MBB（麦肯锡/贝恩/BCG）标准的咨询风格 PPT。它明确把自己定位在「高信息密度」场景：行业研究、消费品分析、品牌战略、电商分析、用户研究、高管汇报、董事会材料、客户提案与项目复盘。

与之相对，它也划清了不擅长的边界：字少、低密度的演讲、个人风格表达、叙事分享、观点类 PPT——这类需求它直接不接。这种「只做一件事并做到位」的克制，正是它区别于一般「一句话生成 PPT」工具的关键。

项目核心一句话：**不是套模板，而是「源材料 → 可审计证据链 → SCR 论证 → 页面密度规划 → 视觉蓝图 → 严格门禁 → 可编辑 PPTX」的全流程方法论。**

## 二、技术原理

CyberPPT 的底层是一套被「门禁（Gate）」强制约束的方法论，整个流程被拆成四个阶段，且阶段之间不能跳。

### 1. 分析阶段：先建证据表，再谈结构

它第一步不是画页面，而是从源材料抽取「证据、事实、数字、判断、caveat（注意事项）」，建立一张 MBB 标准的证据表，并明确记录冲突、缺口与不确定项。随后做内容脑暴，比较 2-3 条故事线，收敛为 **SCR**（Situation-Complication-Resolution，情境-冲突-方案）叙事，再输出逐页大纲、图表计划、信息密度与组件清单。

这一步对应「Evidence Gate」和「Storyline Gate」：任何事实、数字、建议都必须能追溯到源材料，缺证据必须标记缺口或返工；且不能只交单版大纲。

### 2. 蓝图阶段：8 种风格 + 逐页 ImageGen 蓝图

蓝图阶段会先展示 8 种固定视觉风格（每种都有独立的 16:9 样张），用户选定后锁定「风格编号、色板、网格、标题层级、图表语言、页面密度」，然后为**全部页面**生成逐页 ImageGen 蓝图，用于锁定构图、层级、密度、色板和图表语言。

这里有个关键约束（Blueprint Gate）：蓝图未确认，不得进入 PPTX 生成；Style Gate 也要求必须展示 8 张独立样张，不能只用文字描述风格。

### 3. 还原阶段：可编辑层 vs 复杂视觉层

还原阶段按蓝图制作 PPTX，但刻意区分两层：
- **复杂视觉资产层**：曲线、异形边界、Ribbon、桑基图等难以编辑的视觉。
- **可编辑信息层**：主标题、正文、关键数字、图表标签、页脚、SO WHAT——这些必须用原生文本、形状、表格、图表、SVG path 或自定义几何重建，保证可编辑。

「复杂视觉保真 + 主要文字可编辑」的混合策略，正是它解决「AI 用图片糊弄、文字不可改」问题的核心。

### 4. 门禁机制：15 道硬关卡

CyberPPT 内置 15 道门禁，防止「文件生成了，但证据/密度/可编辑性/视觉还原不合格」。关键几道值得关注：

| 门禁 | 检查什么 |
|---|---|
| Reference Gate | 每阶段开始前是否读取对应 reference 文件 |
| Evidence Gate | 事实/数字/判断/建议是否可追溯源材料 |
| Density Gate | 每页是否有信息密度、组件清单、图表计划与 SO WHAT |
| Editable Layer Gate | 主标题/正文/关键数字/图表标签是否可编辑（图片化即失败） |
| Visual Semantics Gate | 图表语义、曲线、面板系统、视觉重心是否忠实蓝图 |
| Curve Trace Gate | 流线/弧线/异形边界/Ribbon/桑基图是否精确追踪 |
| Container Overflow Gate | 文字是否越过卡片、结论条、SO WHAT 或图表区 |
| Strict QA Gate | `validate_pptx.py --strict` 是否通过 |

核心原则：**`结构可编辑` 与 `视觉还原` 是同等硬门槛；`strict QA` 通过不等于视觉合格；ImageGen 蓝图是参考，不是最终背景。**

## 三、安装与快速开始

CyberPPT 以 Git 方式安装到 Codex 的 skills 目录，且目录名必须保持 `cyber-ppt`，根目录必须含 `SKILL.md`：

```powershell
# 安装
git clone https://github.com/crazyykhllc-bit/CyberPPT.git "$env:USERPROFILE\.codex\skills\cyber-ppt"

# 更新
cd "$env:USERPROFILE\.codex\skills\cyber-ppt"
git pull
```

环境要求：需要可用的 Codex 运行环境与对应的图像生成（ImageGen）能力。仓库内置 `scripts/validate_pptx.py` 用于最终校验。

## 四、使用方法与实战

正式做一份 PPT 必须走完三个阶段，且不可跳过：

**1. 资料分析。** 上传资料文档，明确告诉 Codex：「使用 XX 文件夹下的 CyberPPT 这个 skill，根据上传的文档做一份 PPT」，并补充要求。Codex 会自动分析并确认页数（也可手动指定），产出证据底稿。

**2. 选择风格和制作蓝图。** 从 8 种内置风格中选一种，进入蓝图流程，一次性产出全部页面的蓝图（此阶段仍不可编辑）。

**3. 生成可编辑的 PPT。** 逐页还原蓝图。官方特别强调：AI 注意力容易分散，若发现它在一次性「偷懒」只出骨架图，要立刻停下并要求「严格按照 Skill 逐页还原」。第 1-2 页通常最耗时也最容易出错，属于首次磨合的正常现象。

值得注意的是，作者建议的实用心态是 **「AI 搞定 90%，剩下 10% 自己改」**——最难的曲线图表和小图标偶尔会跑偏，用截图标箭头反馈即可，不必追求 100% 完美还原而耗尽 Token。

## 五、常见问题与解决方案

- **还原结果偷懒只出骨架图？** 立即停下，明确要求 Codex「严格按照 Skill 逐页还原」，不要让它一次性批量生成。
- **曲线图表 / 小图标跑偏？** 用截图标箭头指出偏差，让 Codex 精细还原；其余换行、字号问题可自行微调。
- **Strict QA 通过了但视觉不对？** 这是设计内的：strict QA 通过不等于视觉合格，需结合 Render QA 门禁逐页对照蓝图。
- **追求 100% 完美还原成本过高？** 接受 90% 由 AI 完成、10% 自行编辑的折中方案，否则直接交付蓝图即可。

## 六、总结

CyberPPT 把「AI 做 PPT」从一句咒语拉回到一套可审计、可门禁、可还原的工程方法：先用证据表兜住事实，再用 SCR 与密度规划兜住逻辑，最后用「可编辑层 + 复杂视觉层」的混合策略与 15 道门禁兜住交付质量。如果你常做行业研究、品牌战略、董事会材料这类高密度咨询汇报，它是一个值得放进 Codex skills 目录的利器。仓库采用 MIT 许可，欢迎克隆试用。
