---
title: "nihaisha：用 AI Agent 技能把倪海厦中医课程变成可检索、可追溯的学习助手"
date: "2026-07-13"
description: "nihaisha 是一个将倪海厦中医课程体系蒸馏成 AI Agent Skill 的开源项目，支持按症状、方剂、穴位、课程模块检索，配有 2986 张截图证据和 3003 张 PDF 页级证据，学习中医经典不再无从下手。"
author: "Cheman"
slug: "nihaisha-nishi-tcm"
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "AI Agent", "中医", "知识蒸馏", "倪海厦", "Agent Skill"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**nihaisha**，它把倪海厦中医课程整理成可检索、可追溯、有安全边界的 AI Agent Skill，让 AI 助手也能成为学习经方和针灸的得力工具。

## 一、项目概述

nihaisha 的核心思路来自作者维护的 [lineage-skill](https://github.com/JuneYaooo/lineage-skill) 方法论——将高密度课程材料蒸馏成可溯源、可迁移、可产出的 Agent Skill。项目作者的父亲正在系统学习倪师课程，而作者本人有计算机背景，顺势将这套方法迁移过来，既帮家人整理学习资料，也开源希望惠及更多中医学习者。

项目涵盖的课程模块极为全面：

| 模块 | 截图证据 |
|---|---|
| 伤寒论 | 649 张 |
| 金匮要略 | 656 张 |
| 针灸课程 | 501 张 |
| 黄帝内经 | 272 张 |
| 天纪 | 527 张 |
| 神农本草 | 127 张 |
| 仲景心法、临床案例、八纲辨证等 | 88+33+37+28 张 |

已接入 **11 个可抽取文本的 PDF 来源**、**3003 张页级证据卡**和 **6 个模块术语索引**，所有证据均可按方名、穴位、课次、病机或古籍关键词追溯。

## 二、技术原理

### 2.1 课程蒸馏方法

lineage-skill 的核心方法是将多模态课程资料（视频、音频、板书、讲稿）经过整理和标注后，转化为结构化的 Agent Skill 文件，包括：

- **SKILL.md**：任务描述、能力边界和核心提示词
- **references/**：按模块组织的 Markdown 资料（伤寒、金匮、针灸、内经等）
- **references/screenshot-evidence.md**：截图证据索引，对应仓库内 WebP 图片
- **references/pdf-evidence/**：PDF 页级证据卡，可溯源至原始古籍页码

### 2.2 多入口检索设计

项目设计了多个检索入口，适应不同用户提问方式：

**白话问题入口**：将"感冒怕冷""手脚冷""拉肚子"等日常症状转化为课程里的分水岭问题：

```text
用 nihaisha 按白话解释：为什么有的人感冒怕冷无汗，有的人怕风有汗？
```

**六经与方证导航**：按六经、症状、方剂和传变逻辑整理《伤寒论》核心内容：

```text
用 nihaisha 帮我整理太阳中风和太阳伤寒的区别。
```

**截图证据检索**：按课程模块、关键词、方名、穴位、课次或时间点检索截图证据：

```text
用 nihaisha 找小柴胡汤相关的板书截图证据。
```

**PDF 溯源证据**：按课程模块、术语、方名、穴名或古籍关键词追溯课程校对 PDF：

```text
用 nihaisha 找天纪里命宫、四化相关板书证据。
```

### 2.3 安全边界设计

项目内置严格的安全边界——默认作为课程学习与中医理论整理，**不做个人诊断、处方或剂量指导**。对于附子类、四逆汤辈、大承气汤等高风险内容，明确提示应立即咨询合格医生或急诊处理。

## 三、安装与快速开始

### 3.1 安装步骤

将以下 prompt 丢给 AI 助手即可安装：

```text
帮我安装 nihaisha skill：
https://github.com/JuneYaooo/nihaisha-nishi-tcm
```

AI 会自动 clone 仓库并将 skill 目录安装到对应的 skills 目录，然后重启 agent 使 skill 元数据重新加载。

### 3.2 快速使用示例

安装完成后，直接用自然语言提问：

```text
用 nihaisha 查桂枝汤、麻黄汤、葛根汤的方证分水岭。
```

```text
用 nihaisha 整理针灸课程里任督二脉和常用急救穴位。
```

```text
用 nihaisha 查金匮里胸痹、水气、痰饮相关课程脉络。
```

截图索引优先返回仓库内 `assets/screenshots/...` 相对路径；PDF 证据引用格式为 `pdf-evidence:<doc_id>#p<page>`。

## 四、当前覆盖范围

**已整理截图证据**：针灸课程、黄帝内经、神农本草、伤寒论、金匮要略、仲景心法、临床案例、八纲辨证、扶阳论坛、易筋经、天纪，共 11 个模块。

**已整理文字资料**：针灸大成笔记、黄帝内经笔记、神农本草笔记、伤寒论笔记、金匮要略笔记、倪师音频合集、梁冬对话倪师、斯坦福大学演讲等。

**已整理 PDF 证据层**：3003 张页级证据卡，覆盖伤寒、金匮、仲景心法、针灸、黄帝内经、神农本草等课程校对范围，所有术语、方名、穴名均经岐黄圣贤智慧组刘德毅医生（Dee Liu）协助校对。

## 五、常见问题

**Q：niihaisha 能帮我开方或诊断吗？**
A：不能。项目明确声明不提供个人诊断、处方、剂量或自我用药建议。真实健康问题请线下咨询合格医师。

**Q：课程截图太多，加载会很慢吗？**
A：所有截图均已压缩为 WebP 格式存储在仓库内，引用时以相对路径返回，不会导致 token 爆炸。

**Q：如何参与共建？**
A：欢迎通过 issue、PR 或社群反馈协助修正术语误差、方名/穴名/药名勘误、古籍出处核对、截图或 PDF 证据补充。扫码可加入微信交流群。

## 六、总结

nihaisha 是一个将倪海厦老师十余年中医课程体系工程化整理的创新尝试，通过 Agent Skill 的形式让 AI 助手具备中医课程检索能力，2986 张截图证据和 3003 张 PDF 页级证据的接入，使学习者可以真正做到"按证据溯源、按模块学习"。如果你或家人正在学习倪海厦课程，或对知识蒸馏在中医教育中的应用感兴趣，这个项目值得深入研究。

> 📢 项目持续维护中，欢迎中医师、中医学习者、AI 从业者共同参与。详细版权说明和使用边界请参考 [USE_AND_RISK_NOTICE.md](https://github.com/JuneYaooo/nihaisha-nishi-tcm/blob/main/docs/USE_AND_RISK_NOTICE.md)。
