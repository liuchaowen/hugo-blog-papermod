---
title: "sepia：基于叙事架构层面的 AI 去痕写作技能"
date: 2026-09-04T23:10:00+08:00
description: "sepia 是一个 Agent Skill，从叙事架构层面修复 AI 写作痕迹，支持 fiction 和专业文档两大类，覆盖 Claude Code、Codex、Grok Build、Antigravity 四大平台。"
author: "Cheman"
draft: false
tags: ["AI写作", "Agent Skill", "去AI化", "GitHub Trending", "开源"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个非常有意思的项目：**sepia**，它不是又一个在词句层面"润色"AI 文本的工具，而是从叙事架构层面解决 AI 写作的"识别痕迹"问题。

## 一、项目概述

sepia 是一个遵循 Agent Skills 标准的便携式写作技能（Skill），任何支持该标准的 AI Agent 都可以加载它。它支持 Claude Code、Codex、Grok Build、Antigravity 四大平台的原生插件安装，同时通过 Skills CLI 支持 77+ 个 Agent。

核心定位：**De-AI writing at the layer that actually gives AI away**——在真正暴露 AI 身份的那个层面进行去痕。

项目提供四个核心操作：

| 操作 | 含义 |
|---|---|
| write | 创建新文本 |
| review | 诊断但不修改 |
| refactor | 最小化原地编辑 |
| recreate | 从原始事实和意图完全重写 |

另外还有一个 `hemingway` 操作，内置海明威风格的声音配置文件。

## 二、技术原理

### 2.1 为什么不是另一个"humanizer"

市面上流行的 AI 去痕工具大多在词句层面操作——替换措辞、调整句式。但 StoryScope 研究（Russell et al., 2026，基于 61,608 篇故事、人类 + 5 个前沿 LLM）发现了一个关键事实：

> 仅使用**叙事结构特征**的分类器，检测 AI 小说的准确率达到 93.2% macro-F1；而编辑表面风格几乎不动这个数字（95.5% → 93.9%）。

也就是说，真正暴露 AI 的不是用词，而是**叙事架构**：主题由叙述者直接解释、单一因果链、情感仅通过身体感受表达、没有真实世界引用、线性时间线、结尾靠主角成长和接受来收束。

### 2.2 三层修订协议

sepia 将这些研究发现转化为针对小说的三层修订协议：

**第一层（叙事架构）**：停止解释主题、松散因果链、后置揭示、混合情感模式、稀疏角色网络、命名真实事物。

**第二层（话语流）**：去模板化段落-提问序列、修复故事中段塌陷、变化节奏和位置。

**第三层（表面风格）**：经典层面——陈词滥调、句式模板、词汇、语域。

### 2.3 专业文档的差异化处理

专业文档的失败模式不同。研究指向：无信息填充物、本该下判断却在模糊、聊天机器人残留、忽视场合的语域、盖戳般的格式。每种文档类型在共享清单之上叠加专属规则：

| 领域 | 核心规则 |
|---|---|
| 发布说明 | 用户影响优先，每条声明附产物，无营销膨胀 |
| PR/Issue 回复 | 先回答，引用 `file:line`，无反射式赞美 |
| 事后复盘 | 对人无责，对机制无情；时间戳、死胡同、行动项 |
| 工单 | 标题=结果，可测试的验收标准 |
| 技术文章 | 从问题开始，一个真实的死胡同，一个承诺的观点 |

### 2.4 校准哲学

贯穿始终的原则：**校准到人类分布，而不是反转 AI 分布。** 人类处于适度值；一个应用了每条规则的故事反而会成为新指纹。技能每次选择 3-5 个动作并留有余地。

### 2.5 30 特征诊断体系

sepia 内置 30 个特征的诊断评分卡（rubric），以及两层模型指纹：

- **叙事层**：StoryScope 测量的各模型（Claude、GPT、Gemini、DeepSeek、Kimi）叙事特征
- **句子层**：来自各厂商自身提示词指南的句子级特征

当已知写作或执行模型时，针对性应用对应指纹。

## 三、安装与快速开始

### 3.1 通过 Skills CLI 安装（77+ Agent 通用）

```bash
# 全局安装（用户级别）
npx skills add Nanako0129/sepia -g

# 更新
npx skills update sepia -g

# 卸载
npx skills remove sepia -g
```

### 3.2 Claude Code 原生安装

```bash
claude plugin marketplace add Nanako0129/sepia
claude plugin install sepia@sepia --scope user
```

### 3.3 Codex 原生安装

```bash
codex plugin marketplace add Nanako0129/sepia
codex plugin add sepia@sepia
```

### 3.4 Grok Build 原生安装

```bash
grok plugin install Nanako0129/sepia --trust
```

### 3.5 Antigravity 安装

```bash
agy plugin install https://github.com/Nanako0129/sepia
```

## 四、使用方法与实战

### 4.1 小说创作

使用 `write` 操作创建新小说文本：

```
/sepia-write
```

sepia 会从叙事架构层开始，选择 3-5 个修订动作，而非全面应用所有规则。

### 4.2 诊断现有文本

使用 `review` 操作只诊断不修改：

```
/sepia-review
```

输出 30 特征诊断报告，标出叙事架构层面的 AI 痕迹。

### 4.3 最小化编辑

使用 `refactor` 操作进行最小化原地编辑：

```
/sepia-refactor
```

只修改诊断发现的关键问题，保留原文风格。

### 4.4 完全重写

使用 `recreate` 操作从原始事实和意图完全重写：

```
/sepia-recreate
```

### 4.5 海明威声音（实验性）

v0.4.0 起支持声音技能叠加。内置海明威配置文件：

```
/sepia-hemingway
```

应用冰山省略（小说）和 Kansas City Star 规则（专业文档），每个动作可追溯到原始来源。

## 五、常见问题与解决方案

### 5.1 安装后找不到命令

确认安装范围选择了 **User**（用户级别），而非 Project。如果使用 Skills CLI，需要加 `-g` 参数。

### 5.2 不同平台的行为一致性

sepia 的核心是唯一的 `SKILL.md` 文件，不存在平台分支。但各平台的运行时行为可能略有差异——skill 本身是纯 Markdown，遵循 Agent Skills 标准。

### 5.3 声音技能叠加的注意事项

声音技能是可选功能，需要显式声明。sepia 的架构决策优先，声音的动作选择性地应用（每篇 3-5 个特征动作）。在专业文档场景中，语域仍由场合决定。

### 5.4 与传统 humanizer 的区别

传统 humanizer 在第三层（表面风格）操作。sepia 从第一层（叙事架构）开始，这是 StoryScope 研究证明的真正检测层。如果只做表面润色，AI 检测准确率几乎不变。

## 六、总结

sepia 的价值在于它不是凭直觉设计的——每一条规则都来自可追溯的研究证据，从 StoryScope 的 61,608 篇故事数据集到十二项相关研究。它解决了一个被广泛忽视的问题：AI 写作的暴露点不在词句，而在叙事架构。通过将研究发现转化为可执行的三层修订协议，并支持四大主流 Agent 平台和 77+ 个 Agent 的通用安装，sepia 为 AI 辅助写作提供了一个有研究支撑的去痕框架。对于需要 AI 辅助写作但又希望保持人类叙事质感的人来说，这是一个值得关注的项目。

**项目地址**：[https://github.com/Nanako0129/sepia](https://github.com/Nanako0129/sepia)
