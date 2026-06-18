---
title: "Skills For Real Engineers：Matt Pocock 的 AI 编程技能体系"
date: 2026-06-18
description: "深入解析 Matt Pocock 开源的 Skills 项目——一套专为 AI 编程时代设计的可组合 Agent 技能体系，解决 AI 编码中的对齐、冗余、调试与架构退化四大核心问题。"
author: "Cheman"
slug: "skills"
draft: false
categories: ["技术", "开源", "AI工程"]
tags: ["GitHub", "开源", "AI Agent", "Claude Code", "TDD", "软件工程"]
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

今天在 GitHub Trending 上看到一个很有深度的项目：**Skills For Real Engineers**，由知名 TypeScript 社区领袖 Matt Pocock 打造。这不是又一个"AI 编程提示词大全"，而是一套基于数十年软件工程经验的可组合 Agent 技能体系，帮助开发者在 AI 编码时代写出真正可维护的软件。

## 一、项目概述

**Skills For Real Engineers** 是一组精心设计的 AI Agent 技能（Skills），用于解决 Claude Code、Codex 等 AI 编程助手在日常工程中的核心痛点。与 GSD、BMAD、Spec-Kit 等框架不同，这些技能不会接管你的开发流程，而是小巧、可组合、适配任何模型，让开发者保持对过程的完全掌控。

项目目前在 GitHub 上已获得大量关注，Matt Pocock 的技术 Newsletter 订阅用户超过 60,000 人，可见其在开发者社区的影响力。

### 核心特性

- **小而可组合**：每个技能专注解决一个问题，可自由组合使用
- **模型无关**：适用于 Claude Code、Codex 及任何支持技能注入的 AI 编程代理
- **用户驱动与模型驱动分离**：用户手动调用的编排技能 vs. 模型自动触发的纪律性技能
- **工程根基**：基于《程序员修炼之道》《领域驱动设计》《极限编程》等经典著作的设计理念

## 二、技术原理

### 技能架构设计

项目采用两层分类架构：

**用户调用型技能（User-invoked）**——由开发者主动触发，负责编排工作流。例如 `/grill-me` 在开始编码前对需求进行深度追问，确保开发者和 AI 对目标完全对齐；`/to-prd` 将当前对话综合为 PRD 文档并发布到 Issue Tracker。

**模型调用型技能（Model-invoked）**——可由 AI 代理在合适时机自动触发，承载可复用的工程纪律。例如 `/tdd` 强制执行红-绿-重构循环；`/diagnosing-bugs` 提供系统化的调试流程。

这种分层设计确保了用户始终掌握流程控制权，同时 AI 能在执行层面自动遵循最佳实践。

### 四大核心问题的工程解法

项目围绕 AI 编程中的四个经典失败模式构建：

1. **对齐失败（"The Agent Didnt Do What I Want"）**：通过 `/grill-me` 和 `/grill-with-docs` 技能，在编码前进行深度质询会话，确保需求无歧义。

2. **冗余输出（"The Agent Is Way Too Verbose"）**：通过 `/grill-with-docs` 构建共享领域语言（Shared Language），生成 `CONTEXT.md` 文档，让 AI 使用项目统一术语，大幅减少 token 消耗和冗长表达。

3. **代码质量问题（"The Code Doesnt Work"）**：通过 `/tdd` 强制测试驱动开发循环，通过 `/diagnosing-bugs` 提供结构化调试方法论（复现→最小化→假设→插桩→修复→回归测试）。

4. **架构退化（"We Built A Ball Of Mud"）**：通过 `/improve-codebase-architecture` 定期扫描代码库深度化机会，生成可视化 HTML 报告，并通过 `/codebase-architecture` 技能在日常开发中维护模块深度设计。

### 共享领域语言（Shared Language）

这是项目中最核心的设计思想之一。受 Eric Evans《领域驱动设计》启发，`/grill-with-docs` 技能会帮助团队建立项目专属术语表，写入 `CONTEXT.md`。效果示例：

- **改造前**："There is a problem when a lesson inside a section of a course is made real (i.e. given a spot in the file system)"
- **改造后**："There is a problem with the materialization cascade"

共享语言不仅减少 AI 冗余输出，还带来连锁收益：变量/函数命名更一致、代码库更易导航、AI 思考消耗的 token 更少。

## 三、安装与快速开始

### 环境要求

- Node.js 18+ 及 npm
- 一个支持技能注入的 AI 编程代理（如 Claude Code）

### 安装步骤

```bash
# 使用 skills.sh 安装器
npx skills@latest add mattpocock/skills
```

安装后按提示选择要安装的技能和目标代理，**务必选择 `/setup-matt-pocock-skills`** 进行初始配置。

### 初始配置

在 AI 代理中运行 `/setup-matt-pocock-skills`，它会引导你完成：

1. 选择 Issue Tracker（GitHub / Linear / 本地文件）
2. 配置 Triage 标签体系（供 `/triage` 技能使用）
3. 设置文档存储路径

配置完成后即可开始使用全部技能。

## 四、使用方法与实战

### 日常开发工作流

一个典型的使用流程如下：

**1. 需求对齐阶段**

```
# 在 Claude Code 中输入
/grill-with-docs
```

AI 会开始深度追问你的需求，同时构建领域模型、更新 `CONTEXT.md` 和 ADR（架构决策记录）。

**2. 任务拆分阶段**

```
/to-issues
```

将 PRD 或需求拆分为独立的、可垂直切片的 Issue。

**3. 编码执行阶段**

AI 在编码时会自动触发 `/tdd`（红-绿-重构循环）和 `/codebase-design`（深度模块设计），无需手动干预。

**4. 定期架构维护**

```
/improve-codebase-architecture
```

每几天运行一次，扫描代码库中可以"加深"的模块，生成可视化报告后逐个改善。

### 生产力技能

除工程技能外，项目还提供通用生产力工具：

- `/handoff`：将当前对话压缩为交接文档，方便切换到另一个 Agent 会话继续
- `/teach`：多会话渐进式教学技能，以当前目录为教学工作空间
- `/ask-matt`：智能路由器，根据你的场景推荐最合适的技能

## 五、常见问题与解决方案

### 安装失败

如果 `npx skills@latest` 执行失败，确保 Node.js 版本 ≥ 18，可尝试 `npx --yes skills@latest add mattpocock/skills` 强制安装。

### 技能未生效

确认已在安装时选中目标代理，并且 `/setup-matt-pocock-skills` 初始配置已完成。部分技能依赖配置文件中的路径设置。

### 与现有框架的兼容性

Skills 项目设计为与任何模型配合使用。如果同时使用 GSD、BMAD 等框架，建议先评估是否有功能重叠，避免流程冲突。

### 文档维护

`CONTEXT.md` 和 ADR 文件需要在 `/grill-with-docs` 会话中持续更新。如果发现 AI 回答开始变得冗长或不准确，可能是领域文档过时，建议重新运行一次 grill 会话。

## 六、总结

Skills For Real Engineers 的核心理念非常清晰：**软件工程的基本原则在 AI 时代比以往更重要**。项目没有试图用新框架替代工程实践，而是将经典方法论（测试驱动开发、领域驱动设计、持续重构）封装为 AI 可执行的技能。

对于正在使用 AI 编程助手的开发者而言，这套技能体系提供了一条务实的中间道路——既不是放弃掌控的"全自动模式"，也不是完全手工的"拒绝 AI"，而是让 AI 在严格的工程纪律下发挥最大价值。正如 Matt Pocock 所引用的 Kent Beck 的话："每天都在投资系统设计。" 在 AI 加速编码的今天，这句话的意义比任何时候都更重大。

项目地址：[mattpocock/skills](https://github.com/mattpocock/skills)
