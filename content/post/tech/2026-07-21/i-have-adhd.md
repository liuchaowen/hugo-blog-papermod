---
title: "i-have-adhd：让 AI 助手直击重点，告别冗长废话"
date: 2026-07-21
description: "一个专为 Claude Code 和 Codex 设计的输出风格插件，通过 10 条简单规则让 AI 助手优先输出行动指令而非冗长铺垫，显著提升 ADHD 用户及所有追求效率的开发者体验。"
author: "Cheman"
slug: i-have-adhd
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI工具", "效率提升", "Claude", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**i-have-adhd**，它通过 10 条简单规则改造 AI 助手的输出风格，让回答直击重点、行动优先，不再被冗长的"Great question!"和"Hope this helps!"淹没。

## 一、项目概述

**i-have-adhd** 是一个面向 Claude Code 和 Codex 等 AI 编程助手的技能插件。它解决了一个普遍痛点：AI 助手往往习惯于先铺垫背景、再绕圈子，最后才给出答案。对于注意力难以长时间集中的用户（如 ADHD 患者），或者任何追求高效沟通的开发者，这种输出方式都是负担。

**核心特性：**
- **行动优先**：首句就是下一步行动，而非背景介绍
- **步骤编号**：多步任务清晰列出，一目了然
- **无废话结尾**：去掉"Hope this helps!"等无意义客套
- **状态重述**：每轮对话都明确当前进度，减少认知负担
- **具体时间估算**：用"3分钟"而非"一会儿"，帮助用户规划

## 二、技术原理

### 架构设计

项目采用轻量级的技能注入架构。核心是一个 `SKILL.md` 文件，包含 10 条输出格式规则。当用户触发 `/i-have-adhd` 命令时，AI 助手读取这些规则并调整其输出风格。

```
i-have-adhd/
├── SKILL.md          # 核心规则定义
├── INSTALL.md        # 多平台安装指南
├── logo.png          # 项目图标
└── LICENSE           # MIT 许可证
```

### 核心规则（10 条精要）

1. **Lead with the next action** — 首句即行动
2. **Number multi-step tasks** — 多步任务编号
3. **End with one concrete next step** — 结尾给出明确下一步
4. **Suppress tangents** — 抑制跑题
5. **Restate state every turn** — 每轮重述当前状态
6. **Specific time estimates** — 具体时间估算（分钟而非模糊词）
7. **Make wins visible** — 让进展可见
8. **Matter-of-fact errors** — 客观陈述错误，不加情绪
9. **Cap lists at 5 items** — 列表限制 5 项以内
10. **No preamble. No recap. No closers** — 无开场白、无复述、无结尾客套

### 输出对比示例

**改造前（传统 AI 风格）：**

> Great question! Let me think about this. Your auth flow has a few moving pieces: the middleware, the token verification, and the cookie handling. Looking at `src/auth.ts`, the `verifyToken` function (around lines 42-58) seems to be using an older `jsonwebtoken` API. One approach would be to update the package and rewrite that function. After making the change, you'd want to run the auth tests to confirm nothing breaks. By the way, you might also want to look at your dependency versions overall. Hope this helps! Let me know if you want to dig deeper.

**改造后（i-have-adhd 风格）：**

> Run `npm install jsonwebtoken@latest`, then edit `src/auth.ts:42`.
>
> 1. Open `src/auth.ts`
> 2. Replace `verifyToken` (lines 42–58) with the snippet below
> 3. Run `npm test -- auth.spec.ts`
>
> Next: paste the first failing line if any test fails.

可以看出，改造后的输出直接给出命令、具体行号、操作步骤，没有任何多余信息。

### 设计思想

项目的规则基于《The Adult ADHD Tool Kit》（J. Russell Ramsay & Anthony L. Rostain）一书，但针对 AI 输出进行了改编。核心思想是：

- **降低认知负荷**：用户不需要从长文中提取关键信息
- **明确行动路径**：每步都清晰可见，减少决策疲劳
- **减少时间焦虑**：具体时间估算帮助用户规划

## 三、安装与快速开始

### 环境要求

- Claude Code CLI 或 Codex CLI
- Git（用于插件市场操作）

### Claude Code 安装

```bash
# 添加插件市场
claude plugin marketplace add ayghri/i-have-adhd

# 安装插件
claude plugin install i-have-adhd@i-have-adhd
```

安装后，在对话中输入 `/i-have-adhd` 即可触发。无需本地克隆仓库，Claude Code 会自动拉取并保持更新。

### Codex 安装

```bash
# 添加插件市场
codex plugin marketplace add ayghri/i-have-adhd --ref main

# 安装插件
codex plugin add i-have-adhd@i-have-adhd
```

在 Codex 中，可以通过 `$i-have-adhd` 显式调用，或在 Codex 判断任务适合时自动应用。

### 其他 AI 助手

项目提供了通用安装指南，详见 `INSTALL.md`。核心是将 `SKILL.md` 内容注入到助手的提示词或技能系统中。

## 四、使用方法与实战

### 基础用法

安装后，在 Claude Code 或 Codex 中：

1. **显式触发**：输入 `/i-have-adhd` 或 `$i-have-adhd`
2. **隐式应用**：对于 Codex，当任务需要清晰步骤时自动应用

### 实战场景

**场景一：重构代码**

```text
用户: 重构这个 auth 模块
AI (i-have-adhd): 
Edit `src/auth.ts:42-58` first.

1. Replace `verifyToken` with the new async version
2. Update imports at line 5
3. Run `npm test`

Next: paste the test output if any fail.
```

**场景二：调试错误**

```text
用户: 报错了：TypeError: Cannot read property 'map' of undefined
AI (i-have-adhd):
Check `data` before mapping in `src/components/List.tsx:23`.

1. Add `if (!data) return null` before the map call
2. Reload the page

Time: 2 minutes.
```

**场景三：学习新技术**

```text
用户: 教我用 React Hooks
AI (i-have-adhd):
Start with `useState` in a new file.

1. Create `src/Counter.tsx`
2. Add the snippet below
3. Run `npm start`

Next: tell me what you see in the browser.
```

### 自定义规则

项目支持 Fork 后自定义：

```bash
# Fork 仓库到你的账号
# 编辑 skills/i-have-adhd/SKILL.md
# 安装你的 Fork
claude plugin marketplace add <your-username>/i-have-adhd
```

你可以根据自己的偏好调整规则，例如：
- 更严格：禁止所有背景信息
- 更宽松：允许简短的上下文说明
- 特定语言：针对中文输出的规则调整

## 五、常见问题与解决方案

### Q1: 安装后没有生效？

**原因**：可能未正确触发插件。  
**解决**：确保输入 `/i-have-adhd`（Claude Code）或 `$i-have-adhd`（Codex）。检查插件列表：`claude plugin list` 或 `codex plugin list`。

### Q2: 输出仍然很啰嗦？

**原因**：某些任务可能未触发技能，或 AI 判断需要更多上下文。  
**解决**：显式触发命令，或在提示词中强调"使用 i-have-adhd 风格"。

### Q3: 与其他技能冲突？

**原因**：多个技能可能同时生效，导致输出风格混合。  
**解决**：优先级管理或临时禁用其他技能。

### Q4: 时间估算不准确？

**原因**：AI 的估算基于经验，可能与实际偏差较大。  
**解决**：将估算作为参考，实际操作时记录真实时间，逐步校准。

### Q5: 不使用 Claude Code/Codex 怎么办？

**解决**：将 `SKILL.md` 内容复制到你的提示词系统中，或通过 API 在 system prompt 中注入规则。

## 六、总结

**i-have-adhd** 用极简的设计解决了一个普遍问题：AI 助手的输出风格不够高效。它通过 10 条清晰的规则，强制 AI 直击重点、行动优先，让用户（尤其是 ADHD 用户）能够快速获取信息并采取行动，而不是在长篇大论中迷失。

项目的价值不仅在于规则本身，更在于它展示了一种可行的方法：通过结构化的提示词工程，我们可以定制 AI 的行为模式，使其更符合特定用户群体的需求。这种"技能插件化"的思路，值得更多工具和场景借鉴。

如果你也被 AI 的啰嗦困扰，不妨试试这个小而美的工具——它可能不是银弹，但至少能让你的下一次对话少一句"Hope this helps!"。
