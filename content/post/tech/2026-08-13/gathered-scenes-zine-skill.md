---
title: "拾景zine：把普通照片蒸馏成值得停留的纸感海报"
date: 2026-08-13
description: "拾景zine（Gathered Scenes Zine）是 Zeejay0 为 Codex 编写的一组生图 Skill，先阅读照片中的主体、空间、色彩与情绪，再通过实景拼贴或影像蒸馏两条路径，把普通画面重新装订成一页有触感的纸刊作品。"
author: "Cheman"
slug: gathered-scenes-zine-skill
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI创作, Codex, 视觉设计]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**gathered-scenes-zine-skill**（拾景zine）。它不把照片当成等待套用的模板，而是先读懂画面，再决定如何把"这一刻"留在一张有纸感、有呼吸感的 poster 里。

## 一、项目概述

拾景zine 是一组为 Codex 编写的**生图 Skill**（视觉创作指令集），核心主张只有一句话：*照片提供事实，创作决定如何留下它。*

它面向的不是"一键滤镜"式用户，而是希望把日常随手拍变成**能独立成立的纸刊作品**的人——一张带着撕纸边缘、干墨质感与高纯度色彩结构的 A 面海报。项目收录两个互补的 Skill：

- **实景拼贴 · Gathered Scenes**（`scenes-gathered-zine-v1-3`）：保留原照片作为真实视觉锚点，让抽象形状、单一高纯度色彩与手撕纤维边缘向纸面延伸。
- **影像蒸馏 · Scene Distillation**（`scene-distillation-zine-v1-3`）：不在成品中保留原始照片，只提取语义核心、情绪张力与视觉隐喻，重新创作一件原创插画。

项目的视觉语言建立在五条原则之上：真景为锚、插画成场、色彩成结构、纸面会呼吸、边界有触感。这让它产出的作品即便不依赖原图，也始终有"现场"的底色。

## 二、技术原理

整套创作遵循统一的观察—转译流程，而不是套用固定模板：

```text
一张照片  →  阅读现场  →  提取关系  →  选择创作路径  →  重新装订成一页
```

具体分为五个阶段：

| 阶段 | 发生什么 |
| --- | --- |
| **01 · 观察** | 找到核心主体、空间关系、方向、重量与安静区域 |
| **02 · 取舍** | 保留让场景仍然成立的最少信息，移除无关细节 |
| **03 · 转译** | 将轮廓、路径、光影或情绪转为纸上形状与色彩结构 |
| **04 · 编排** | 让摄影、插画、文字、边界与留白形成清楚的观看路径 |
| **05 · 成页** | 输出一张平面、克制、有触感且能独立成立的纸刊作品 |

两条路径的本质差异在于**照片在成品中的角色**：

- 实景拼贴把"人物与海岸线的关系""桥上人群与水面倒影"等不可替代的现场关系保留为锚点，城市密度被压缩成印刷色场，石质轮廓穿过摄影、线描与撕纸边界。
- 影像蒸馏则先"舍弃照片本身"，只保留动作的张力（如挥手与远处石像之间尚未抵达的回应），并用品类极简的形与一枚高纯度色块建立视觉隐喻。

这种"先读后画"的结构，使 Skill 输出的不是随机装饰，而是有明确叙事重心的纸面编排——留白也参与叙事，复杂信息被压缩为少量清楚的形。

## 三、安装与快速开始

Skill 以普通仓库形式分发，安装即把对应目录复制到 Codex 的 Skills 目录：

```bash
git clone https://github.com/Zeejay0/gathered-scenes-zine-skill.git
mkdir -p ~/.codex/skills
cp -R gathered-scenes-zine-skill/skills/scenes-gathered-zine-v1-3 ~/.codex/skills/
cp -R gathered-scenes-zine-skill/skills/scene-distillation-zine-v1-3 ~/.codex/skills/
```

> 若复制后 Skill 没有立即出现，重启 Codex 即可刷新。

仓库结构清晰，每个 Skill 自带 `SKILL.md` 与 `agents/openai.yaml`：

```text
gathered-scenes-zine-skill/
├── README.md
├── README.en.md
├── assets/brand/
├── examples/            # 原始照片 → 观察记录 → 最终作品 档案
└── skills/
    ├── scenes-gathered-zine-v1-3/   # 实景拼贴
    └── scene-distillation-zine-v1-3/ # 影像蒸馏
```

## 四、使用方法与实战

使用流程只有三步：上传照片 → 选择路径 → 调用对应 Skill。

**实景拼贴**示例（保留原照片与现场身份）：

```text
用 $scenes-gathered-zine-v1-3 把这张照片做成一张拾景纸刊海报。
保留人物与海岸线的关系，文字用中文。
```

**影像蒸馏**示例（表达优先，不保留照片本身）：

```text
用 $scene-distillation-zine-v1-3 重新创作这张照片。
不要保留照片本身，让作品表达"靠近与错过"。
```

实战档案里给出的案例很有代表性：第比利斯远眺把教堂塔楼当锚点、将城市密度压成蓝色印刷场；冬日渡桥保留桥上人群与倒影，让横向行进成为整张作品的节奏；而"时间挥手回应"则舍掉照片、只留下一条黄色手势轨迹作为时间的隐喻。可见两个 Skill 都会返回简短的创作说明，便于复盘"保留了什么、舍弃了什么"。

## 五、常见问题与解决方案

- **Skill 安装后不显示**：多为 Codex 未刷新 Skills 索引，重启 Codex 通常即可解决。
- **照片隐私**：Skill 仅把用户上传的照片作为当前生成任务的参考，除非用户明确要求，不会浏览、分享、另行上传或保存原始照片；涉及敏感图片时应主动说明。
- **想保留更多现场细节**：优先选择"实景拼贴"路径，并显式告诉 Skill 需要保留的关系（如"保留人物与远方""文字用中文"），避免被压缩为抽象形。
- **想要独立原创插画而非照片海报**：选择"影像蒸馏"路径，并给出情绪方向（如"靠近与错过""雪的轻盈"），让成品脱离原图成为新作品。
- **商业化限制**：项目采用个人非商业许可证，禁止销售、收费生成、SaaS/API、代做及公司项目等商业用途，商业使用须事先获得作者明确授权。

## 六、总结

拾景zine 的价值不在"生成好看的图"，而在它把**观看**这件事前置到了生成之前：先辨认主体、空间、色彩与没说完的情绪，再决定保留真实现场还是蒸馏为新的纸上作品。两条路径（实景拼贴 / 影像蒸馏）恰好覆盖了"想留住现场"与"想重新想象"两种诉求，而统一的五阶段观察流程又保证了成品始终有克制、有触感、能独立成立。对喜欢把日常画面做成可分享纸感海报的创作者来说，这是一组值得一试的 Codex Skill。
