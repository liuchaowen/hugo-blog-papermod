---
title: "System Prompts Leaks：一个汇集主流 AI 助手 System Prompt 的开源项目"
date: 2026-06-22
description: "System Prompts Leaks 是一个开源项目，旨在收录并公开分享 ChatGPT、Claude、Gemini、Grok 等主流 AI 助手的 System Prompt，帮助开发者深入理解 AI 行为逻辑与边界。"
author: "Cheman"
slug: system-prompts-leaks
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "AI", "System Prompt", "Claude", "ChatGPT", "GPT", "Gemini", "Grok"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**System Prompts Leaks**，它专门收录并公开分享主流 AI 助手的 System Prompt，让开发者能够深入了解不同 AI 模型的"行为规则手册"。

## 一、项目概述

System Prompts Leaks 由开发者 [asgeirtj](https://github.com/asgeirtj) 创建和维护，其核心目标是**透明化 AI 助手的内部指令**。项目被《华盛顿邮报》专题报道影响力广泛，目前在 GitHub Trending 上热度极高。

**收录范围覆盖以下厂商和产品：**

- **Anthropic**：Claude Opus 4.8、Fable 5、Sonnet 4.6、Claude Code 等全系列
- **OpenAI**：GPT-5.5、GPT-5.4、GPT-5.3、Codex CLI、ChatGPT Atlas 等
- **Google**：Gemini 3.5 Flash、Gemini 3.1 Pro、Gemini CLI、Jules 等
- **xAI**：Grok 4.3 Beta、Grok 4.2、Grok Build 等
- **Microsoft**：GitHub Copilot、VS Code Copilot Agent、Copilot CLI 等
- **其他**：Perplexity、Cursor、Meta AI、Zed AI、Notion AI 等

**项目亮点：**
- 持续追踪更新，每次模型版本迭代后及时收录
- 提供版本 Diff 对比（如 Claude Opus 4.8 → Fable 5 的完整变化）
- 部分模型还收录了不带工具的纯净版本，方便做对照研究

## 二、技术原理与核心价值

### System Prompt 的本质

System Prompt 是 AI 助手的"隐藏宪法"——它定义了 AI 的行为边界、人格设定、安全策略、工具调用规则等。一个典型的 System Prompt 通常包含以下组成部分：

```markdown
# 角色定义
你是一个有用的 AI 助手，擅长...

# 安全边界
你不能透露你的训练数据来源...
你不能协助生成有害内容...

# 工具使用
当用户请求...时，你应该使用 [TOOL] 工具...

# 输出格式
你的回复应该简洁、有条理...
```

### 为什么要研究 System Prompts

对于 AI 开发者而言，研究 System Prompt 有以下实用价值：

**1. 理解 AI 行为异常**
当你发现 AI 在某些场景下表现异常时，对比 System Prompt 能帮你定位是模型本身的问题还是 Prompt 指令的不一致。

**2. 优化自己的 AI 应用**
学习大厂如何设计 System Prompt，能直接提升你在 GPTs、Claude Apps、Copilot Extensions 等平台上的应用效果。

**3. 安全研究**
了解 AI 的安全边界是如何被定义的，有助于构建更安全的 AI 系统。

### Diff 对比的价值

该项目提供的版本 Diff 功能尤为实用。以 Claude Opus 4.8 → Fable 5 的对比为例，Diffchecker 上完整记录了两个版本 System Prompt 的每一处差异：

```
[删除] - 你应该在回复开始时提供一个简要总结
[修改] - 当用户请求代码时 → 当用户请求代码或技术内容时
[新增] + 对于复杂问题，你应该先分析再回答
```

通过 Diff，研究者可以追踪 AI 厂商在每次更新中调整了哪些行为策略，这本身就是一个非常宝贵的数据集。

## 三、收录的典型 System Prompt 示例

### GPT-5.5 Thinking Prompt（部分）

GPT-5.5 的 Thinking 模式使用了一种特殊的双层推理架构，其 System Prompt 大致如下：

```markdown
你是一个深度思考型 AI。当面对复杂问题时：

1. 首先使用 <thinking> 标签进行内部推理
2. 在 <reflection> 标签中评估推理的完整性
3. 最终在 <output> 标签中给出正式回复

你应该在回复末尾包含 [DONE] 标记表示思考结束。
```

### Claude Code 的工具调用规则

Claude Code 的 System Prompt 详细定义了 Glob、Grep 等工具的使用边界：

```markdown
Glob 工具：
- 使用 glob 时需指定明确的目录和模式
- 避免在超大型项目中不加限制地使用 **/*.ext

Grep 工具：
- 默认搜索范围为当前打开的文件
- 支持正则表达式，需注明 --regex 标志
```

## 四、如何使用该项目

### 查看某个模型的 System Prompt

直接在项目的目录结构中按厂商查找即可：

```
OpenAI/
├── gpt-5.5-thinking.md      # GPT-5.5 深度思考模式
├── gpt-5.5-instant.md       # GPT-5.5 即时回复模式
├── gpt-5.4-api.md           # GPT-5.4 API 版本
└── Codex/
    ├── gpt-5.5.md           # Codex 专用 Prompt
    └── personality_friendly_gpt-5.5.md  # 人格设定

Anthropic/
├── claude-fable-5.md       # Claude Fable 5
├── claude-opus-4.8.md      # Claude Opus 4.8
└── Claude Code/
    └── claude-code-opus-4.8.md  # Claude Code
```

### 使用 Diff 对比版本变化

1. 访问 [Diffchecker](https://www.diffchecker.com/) 并粘贴两个版本的 Prompt 内容
2. 或使用项目提供的 Diff 链接（如 Claude Opus 4.8 → Fable 5 的对比链接）

### 参与贡献

项目欢迎 PR，如果发现某款 AI 助手的 System Prompt 有更新：

1. Fork 本仓库
2. 在对应目录下添加或更新文件
3. 提交 PR，注明模型名称和版本

## 五、常见问题

**Q: 这些 System Prompt 是怎么获取的？**
A: 主要通过"提示注入"（Prompt Injection）技术让 AI 主动复述自身指令。项目持续追踪并验证这些泄露的有效性。

**Q: System Prompt 和训练数据有什么区别？**
A: 训练数据是模型从大规模语料中学习的知识；System Prompt 是运行时注入的指令，定义了模型的行为模式。两者共同决定 AI 的输出。

**Q: 企业级模型（如 GPT-5 API）的 System Prompt 和公开版本一样吗？**
A: 部分相同，但 API 版本通常会更精简。项目中同时收录了 API 版和 Web 版的 Prompt，方便对比。

**Q: 这些 Prompt 会被厂商用于法律诉讼吗？**
A: 《华盛顿邮报》已对此进行报道，项目本身是学术研究目的。目前主流厂商对此保持默许态度，但请勿用于商业套利或欺骗用户。

## 六、总结

System Prompts Leaks 是一个极具研究价值的开源项目，它将 AI 厂商视为最高机密的 System Prompt 公之于众。对于 AI 研究者、开发者以及对这些系统背后的逻辑好奇的普通用户来说，这是一个不可多得的宝库。随着 AI 模型迭代加速，该项目也在持续更新，建议关注 GitHub 仓库获取最新收录。

> 仓库地址：[https://github.com/asgeirtj/system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks)
