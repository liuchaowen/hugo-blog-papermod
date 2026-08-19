---
title: "Humanizer：让 AI 生成的文本回归自然写作风格"
date: 2026-08-19
description: "Humanizer 是一个开源工具，通过识别并改写 AI 写作的 35 种常见模式，让文本从机器生成的痕迹中解放出来，保留作者的真实意图与个人风格。支持多种 Agent 安装方式，并提供写作样本匹配功能。"
author: "Cheman"
slug: humanizer
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI写作", "文本处理", "开源工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Humanizer**，它能把 AI 生成的文本改写成更自然的人类写作风格，同时保留原文的事实、含义和个人声音。

## 一、项目概述

Humanizer 是一个基于 Markdown 格式的技能（skill），专为各类 AI Agent 设计。它的核心目标是识别并改写那些听起来像是 AI 生成的文本，让写作回归自然。

### 核心特性

- **模式识别**：基于 Wikipedia 的 "Signs of AI writing" 页面，识别 35 种 AI 写作模式
- **事实保留**：改写过程中不创造事实、姓名、日期、引文或引用，所有细节必须来自原文或作者
- **风格匹配**：支持提供写作样本，改写后的文本会匹配样本的节奏、词汇选择和标点习惯
- **跨平台支持**：支持 Skills CLI、Claude Code 插件、Claude Desktop 手动安装等多种安装方式

## 二、技术原理

### 核心算法

Humanizer 的工作流程分为三步：

1. **初稿改写**：基于 35 种模式对原文进行初步改写
2. **模式检查**：检查初稿中是否仍残留 AI 写作模式，并验证是否改变了原文主张
3. **最终版本**：生成保留事实、风格自然的最终文本

### 35 种 AI 写作模式

这些模式分为四大类：

**内容模式**（6 种）：夸大重要性、堆砌名人背书、浅层 -ing 分析、营销语言、模糊来源、公式化挑战与展望

**语言语法模式**（7 种）：AI 高频词、回避 is/are、Not X but Y 句式、强制三连、更换名称与重复开头、虚假范围、被动语态

**风格模式**（16 种）：过度使用破折号、过多粗体、粗体小标题列表、标题大小写滥用、表情符号、弯引号、过多连字符词对、虚假深层真理、预告下一点、标题重复、描述旧版本、强制结尾句、公式化格言、虚假坦诚开头、回答未提出的异议、拒绝虚假替代方案

**聊天机器人模式**（3 种）：遗留的对话文本、知识限制声明、过度附和语气

**填充与模糊模式**（3 种）：填充短语、过多限定词、通用积极结尾

### 设计哲学

Wikipedia 对 AI 写作的核心观点是：

> "LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases."

Humanizer 的目标是打破这种统计最优性，让文本回归具体、真实、有个人风格的表达。

## 三、安装与快速开始

### 环境 Requirements

- Node.js 18+（使用 Skills CLI 安装）
- 或支持插件的 Agent（Claude Code、Claude Desktop 等）

### 安装步骤

**方式一：Skills CLI（推荐）**

```bash
# 全局安装
npx skills add blader/humanizer --global

# 更新
npx skills update humanizer --global

# 安装到所有支持的 Agent
npx skills add blader/humanizer --global --agent '*'
```

**方式二：Claude Code 插件**

```
/plugin marketplace add blader/humanizer
/plugin install humanizer@humanizer
```

运行：`/humanizer:humanizer`

**方式三：Claude Desktop 手动安装**

从 [Release](https://github.com/blader/humanizer/releases/latest) 下载 `humanizer-skill.zip` 并通过 GUI 上传。

**方式四：手动放置**

```bash
git clone https://github.com/blader/humanizer.git /path/to/your/skills/humanizer
```

### 最简运行示例

```
/humanizer

[paste your text here]
```

或直接提问：

```
Please humanize this text: [your text]
```

## 四、使用方法与实战

### 基础用法

最简单的方式是在斜杠命令后粘贴文本：

```
/humanizer

I recently spent five unforgettable days in Lisbon, and let me tell you — this city completely stole my heart.
```

Humanizer 会自动识别其中的 AI 写作模式并改写。

### 进阶用法：风格匹配

提供 2-3 段自己的写作样本，Humanizer 会匹配你的节奏、词汇和标点习惯：

```
/humanizer

Here's a sample of my writing for voice matching:
[paste 2-3 paragraphs of your own writing]

Now humanize this text:
[paste AI text to humanize]
```

### 实际项目示例

改写文件中的内容：

```
Humanize the prose in docs/launch-post.md
```

Humanizer 会读取文件并改写其中的散文部分。

### 改写效果对比

**AI 文本（Before）：**

> I recently spent five unforgettable days in Lisbon, and let me tell you — this city completely stole my heart. From the moment I arrived, I knew I was somewhere truly special. Nestled along the banks of the Tagus River, Lisbon stands as a vibrant testament to Portugal's enduring spirit...

**Humanized 文本（After）：**

> I spent five days in Lisbon last October and still have mixed feelings about it. Beautiful, yes. Also harder on the knees than anyone warned me. The hills are the whole story and somehow never make the brochures...

改写后的文本：
- 移除了 "unforgettable"、"stole my heart" 等夸张表达
- 删除了 "vibrant testament" 等模糊的营销语言
- 添加了具体细节（October、knees、brochures）
- 使用更自然的句子长度和节奏

## 五、常见问题与解决方案

### 安装问题

**Q: Claude Desktop 上传 zip 文件失败？**

A: 不要使用 GitHub 的 "Code > Download ZIP" 功能。该选项会下载包含符号链接的源码包，Claude Desktop 会拒绝。请使用 Release 页面的 `humanizer-skill.zip`，它包含单个常规文件。

**Q: Skills CLI 安装后 Agent 无法识别？**

A: 安装后需要重启 Agent 会话或重新加载技能。对于全局安装（`--global`），确保重启所有正在运行的 Agent。

### 运行时问题

**Q: 改写后的文本改变了原意？**

A: Humanizer 设计了事实检查步骤。如果发生这种情况，请检查原文是否存在模糊主张（如 "Experts believe..."），Humanizer 会删除无法验证的内容。

**Q: 文本中仍有 AI 痕迹？**

A: Humanizer 采用多轮改写，但仍可能遗漏某些模式。可以在改写后再次运行 `/humanizer`，或手动检查以下高频模式：
- "Additionally"、"Actually"、"Quietly" 等过渡词
- "Not just X, but Y" 句式
- 过度使用的破折号和粗体

**Q: 如何保留原文的专业术语？**

A: Humanizer 不会删除专业术语。如果被误改，可在写作样本中包含相关术语的用法示例，或在改写后手动调整。

### 性能与兼容性

**Q: 支持哪些语言？**

A: 模式库主要针对英语写作。中文等其他语言可能需要适配，目前不建议直接使用。

**Q: 对长文本的处理速度如何？**

A: Humanizer 使用 LLM 进行改写，速度取决于所用模型。建议将长文本分段处理，或使用支持更大上下文的模型。

**Q: 能否批量处理多个文件？**

A: 当前版本需要逐个文件调用。可通过脚本循环实现批量处理，但注意 API 调用成本。

## 六、总结

Humanizer 是一个实用的开源工具，它将 Wikipedia 社区总结的 AI 写作模式系统化，帮助创作者从 AI 生成的内容中解放出来。

它的核心价值在于：
- **系统性**：35 种模式覆盖内容、语法、风格、聊天机器人等多个维度
- **安全性**：改写过程不创造事实，保留原文的核心主张
- **灵活性**：支持多种安装方式和风格匹配功能

对于需要将 AI 辅助写作转化为个人风格表达的创作者，Humanizer 提供了一个可靠的起点。当然，最终的表达仍需创作者本人的判断与润色——这正是人类写作的不可替代之处。
