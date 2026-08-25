---
title: "no-ai-slop: 一键清除写作中的 20+ 种 AI 套话套路"
date: 2026-08-25
description: "no-ai-slop 是一款开源 AI 写作清洗工具，能够识别并移除 20 余种常见 AI 套话模式（如「It's not X. It's Y.」「What nobody tells you」等），在保留个人写作风格的同时让文字更干净、更真实。"
author: "Cheman"
slug: no-ai-slop
draft: false
categories: ["技术", "开源", "AI 工具"]
tags: ["GitHub", "AI", "写作工具", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**no-ai-slop**，一句话介绍它的核心价值——帮助你在保留个人写作声音的前提下，清除 AI 生成的套路化表达，让文字回归真实。

## 一、项目概述

AI 写作工具让内容生产变得前所未有的高效，但同时也带来了一个问题：所有 AI 生成的内容都在趋向同质化。GPT、Claude 等大模型在生成文本时，会不断重复使用一系列经过"优化"的表达模式，比如：

- **二元对比**："It's not X. It's Y."
- **伪洞察开场**："What nobody tells you is…"
- **戏剧性碎片句**："That's it. That's the whole thing."
- **假深刻结尾**："The future isn't coming. It's already here."
- **重要性感 puffery**："marks a pivotal moment"

这些表达单独看都没问题，但当它们成为所有 AI 内容的标配时，读者的体验就会变得千篇一律——你甚至不用读完全文，只要扫一眼就能猜出 AI 写的。

**no-ai-slop** 正是来解决这个问题的。它由 AI 开发者 [petergyang](https://github.com/petergyang) 创建，本质上是一套写作风格规则库，能够：

1. **检测套话**：识别文本中的 20+ 种 AI 套路模式
2. **清洗文字**：移除这些套路，同时保留你原本的表达习惯
3. **透明报告**：告诉你具体改了什么，而不是黑盒修改

## 二、技术原理

no-ai-slop 的核心是一套结构化的写作规则，分为两大模块：

### 2.1 套话模式库（SKILL.md）

项目定义了 20+ 种需要检测的模式：

```markdown
# Binary contrasts（二元对比）
"It's not X. It's Y."

# Throat-clearing openers（冗余开场白）
"Here's the thing," "Let me be clear"

# Faux-insight setups（伪洞察）
"What nobody tells you," "The part everyone misses"

# Colon reveals（冒号揭示）
"The best part: it learns."

# Dramatic fragments（戏剧性碎片句）
"That's it. That's the whole thing."

# Superficial analysis（表面分析）
"highlighting the team's commitment to innovation"

# Importance puffery（重要性夸张）
"marks a pivotal moment," "a testament to"

# Weasel attribution（模糊归因）
"experts agree," "studies show"

# Synonym cycling（同义词循环）
"The agent handles your email. The assistant drafts replies."

# Fake-profound endings（假深刻结尾）
"The future isn't coming. It's already here."
```

### 2.2 评估框架（eval.md）

除了模式匹配，项目还包含一套评估框架，检查写作的基本功：

- **主动语态优先**：被动语态往往降低表达力度
- **以结论开篇**：在适合的场景下，直接给结论而非铺垫
- **具体 > 抽象**：用实例和数据替代空泛描述
- **理清复杂句**：将嵌套过深的复合句拆解

这种"规则 + 评估"的双层设计，使得工具既能精准识别套话，又不会误伤真正有价值的个人表达。

## 三、安装与快速开始

### 3.1 安装方式

最简单的方式是将以下命令粘贴到 ChatGPT、Claude Code、Codex 等 AI 编程工具中：

```text
Install the /no-ai-slop skill globally from https://github.com/petergyang/no-ai-slop
```

或者使用 `npx` 安装：

```sh
npx skills add petergyang/no-ai-slop --skill no-ai-slop --global --yes
```

### 3.2 基础用法

**清洗写作**：

```text
/no-ai-slop (你的写作内容)
```

工具会移除 AI 套话模式，保留你的个人声音，并列出所有修改内容。

**检测套话**：

```text
/no-ai-slop is this slop? (你的写作内容)
```

只报告检测到的套话模式，不做修改，适合用来学习识别套话。

**讽刺生成**（纯娱乐）：

```text
Draft an AI slop post about (topic)
```

生成一段"标准"的 AI 套话内容，用于对比学习。

## 四、使用场景与实战

### 4.1 内容创作者的文案清洗

写完 AI 辅助的文章后，用 `/no-ai-slop` 清洗一遍，去掉那些一眼假的套路表达：

> **Before：** "In today's rapidly evolving digital landscape, it's not about the technology itself. It's about how we leverage it to transform our workflows. What nobody tells you is that the real magic lies in the small details."
>
> **After：** "The real value of this tool is in how it handles the small, tedious details in your workflow."

### 4.2 技术文档的 AI 辅助写作

用 AI 生成技术文档草稿后，用套话检测模式过一遍：

- 检查是否有模糊归因（"experts agree"）
- 检查是否有表面化分析（"highlighting the team's commitment"）
- 用具体的技术细节替换空泛描述

### 4.3 个人风格保护

no-ai-slop 最大的亮点是它**不会抹平个人声音**。与普通的 AI 文本改写工具不同，它专注于移除那些"大家都用"的模式，而不会改动你原本的表达节奏、用词习惯和幽默感。

## 五、常见问题

**Q: 会不会把我的文字改得面目全非？**

不会。工具只移除它识别出的 20+ 种标准化模式，不会触碰其他表达。如果检测结果不准确，可以用"检测"模式手动审查每一条修改。

**Q: 支持中文写作吗？**

项目的模式库目前以英文为主，但二元对比、戏剧性碎片句、假深刻结尾等模式在中文 AI 写作中同样常见，可以作为参考框架使用。

**Q: 如何自定义规则？**

项目的 [SKILL.md](https://github.com/petergyang/no-ai-slop/blob/main/skills/no-ai-slop/SKILL.md) 包含完整的规则说明，用户可以 fork 项目后自行添加/修改检测模式。

## 六、总结

no-ai-slop 是一个非常实用的 AI 写作辅助工具，它不追求"让 AI 写得更好"，而是专注于"让 AI 写得不像 AI"。在 AI 内容爆炸的时代，这种"反 AI 化"的工具反而显得弥足珍贵——它帮助写作者在效率与个性之间找到更好的平衡点。

如果你经常用 AI 辅助写作，不妨试试这个工具，看看你的文字里藏着多少"大家都在用"的套路。

> **项目地址**：https://github.com/petergyang/no-ai-slop
