---
title: "shadcn/improve：让 AI Agent 自主审计代码库并生成可执行改进计划"
date: 2026-07-17
description: "improve 是一个基于 AI Agent 的代码库审计工具，能够自动分析任意代码库并生成结构化的可执行改进计划，让大型语言模型专注于高价值推理工作，而将具体执行交给更经济的模型完成。"
author: "Cheman"
slug: improve
draft: false
categories: ["技术", "AI工具"]
tags: ["AI", "GitHub Trending", "代码审计", "自动化", "Agent"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**shadcn/improve**——一个让 AI Agent 自动审计代码库并输出可执行改进计划的智能工具。它的核心理念很清晰：让最强的大模型做判断，把执行交给更经济的模型。

## 一、项目概述

**improve** 是一个基于 AI Agent 的代码库审计 Skill，由 shadcn（shadcn/ui 的作者）开发，通过 `npx skills add shadcn/improve` 即可安装到任意支持 Agent Skills 格式的 AI 助手中。

### 核心定位

这个项目解决了一个实际痛点：在真实代码库中，AI 代码修复往往陷入两个极端——要么 AI 自己动手改，改出问题；要么 AI 只提建议，执行时又丢了上下文。improve 的做法是**彻底解耦分析与执行**：自己只做审计员，规划员，审核员，**绝不碰源代码**。

### 主要特性

- **多维度审计**：并行扫描代码库，覆盖正确性、安全性、性能、测试覆盖率、技术债务、依赖管理、开发体验、文档和方向建议等 9 个维度
- **可执行计划生成**：每个发现自动生成结构化 plan 文件，包含精确文件路径、代码示例、验证命令和 STOP 条件
- **闭环执行**：内置 `execute` 命令将 plan 交给低成本子 Agent 执行，并自动审核执行结果
- **工作树隔离**：所有代码修改在独立的 Git worktree 中进行，不污染主分支，合并权始终在人类手中
- **增量审计**：`branch` 命令只审计当前分支的改动，适合 PR 前检查

## 二、技术原理

improve 的工作流分为四个阶段：**Recon（侦察）、Audit（审计）、Vet（审查）、Plan（规划）**。

### Recon 阶段

首先对整个代码库进行结构扫描，提取：

- 技术栈与依赖
- 代码规范（ESLint/Prettier 配置、命名约定）
- 构建/测试/检查命令（这些会成为后续 plan 中的"验证门"）
- 文档：ADR、PRD、CONTEXT.md、DESIGN.md 等，保证分析不脱离项目已有决策

```python
# 内部 Recon 流程伪代码
def recon(repo_path):
    stack = detect_stack(repo_path)           # Python? Node? Go?
    conventions = extract_conventions(repo_path)  # 规范列表
    gates = find_verification_commands(repo_path) # 测试/lint命令
    docs = ingest_design_docs(repo_path)       # 已有设计文档
    return RepoMap(stack, conventions, gates, docs)
```

### Audit 阶段

启动 9 个并行子 Agent，分别对不同维度进行深度扫描：

```python
# 九大审计维度
categories = [
    "correctness",   # 逻辑正确性
    "security",      # 安全性
    "perf",          # 性能
    "tests",         # 测试覆盖
    "tech-debt",     # 技术债务
    "deps",          # 依赖与迁移
    "dx",            # 开发体验
    "docs",          # 文档完整性
    "direction"      # 方向建议（需引用实际代码证据）
]
```

每个子 Agent 独立扫描并输出带证据的发现，格式为：

```markdown
| # | Finding                    | Category  | Effort | Confidence |
|---|----------------------------|-----------|--------|------------|
| 1 | O(n²) icon migration...    | perf      | S      | HIGH       |
```

### Vet 阶段

主 Agent 重新阅读每个发现引用的源码位置，自行核验——消除误报、修正错误归属，并给出拒绝理由（避免同一误报下次重复出现）。

### Plan 阶段

用户选择感兴趣的问题后，为每个问题生成独立 plan 文件：

```markdown
# Plan: 001-extract-shadow-config-resolution

**针对**: shadow-config 在 search.ts 和 view.ts 中重复定义

## 背景
当前 search.ts:31 存在 shadow-config 重复定义，已有代码示例...

## 步骤
1. 提取 shadow-config 到 `utils/shadow-config.ts`
2. 在 search.ts 和 view.ts 中替换为 import

## 验证门
\`\`\`bash
npm run lint
# 期望输出: 无错误
npm test
# 期望输出: 全部通过
\`\`\`

## STOP 条件
如果 search.ts 中存在其他对 shadow-config 的条件判断逻辑，
停止并报告，需要人工介入确认。
```

## 三、安装与快速开始

### 环境要求

- Node.js 16+
- 支持 Agent Skills 格式的 AI 助手（如支持 agentskills.io 规范的 Agent）

### 安装步骤

```bash
# 方式一：通过 npx 直接安装 Skill
npx skills add shadcn/improve

# 方式二：在支持 Agent Skills 的对话助手中使用
/improve  # 完整审计
/improve quick  # 快速扫描（只返回热点发现）
/improve deep  # 穷尽式审计（每个包、每个维度）
```

### 最简运行示例

```bash
# 在目标仓库中启动 AI 助手，执行完整审计
/improve

# 回复示例后，选择感兴趣的发现
plan 1, 3, 5

# 生成计划文件到 plans/ 目录
```

## 四、使用方法与进阶场景

### 基础用法

| 命令 | 用途 |
|------|------|
| `/improve` | 完整审计 → 优先级排序的发现表 |
| `/improve quick` | 快速扫描，只返回热点发现 |
| `/improve deep` | 穷尽式审计，覆盖每个包和维度 |

### 进阶用法

```bash
# 只审计当前分支改动（PR 前推荐）
/improve branch

# 安全专项审计（同样支持 perf / tests / bugs）
/improve security

# 功能方向建议（需引用代码证据）
/improve next

# 跳过审计，直接描述需求生成计划
/improve plan <描述你要做的事情>

# 审核并优化已有计划
/improve review-plan plans/001-fix-n-plus-one.md

# 执行计划并自动审核执行结果
/improve execute 001

# 清理计划积压：验证完成项、刷新过期项、解封阻塞项
/improve reconcile
```

### 与其他 Agent 协同工作

improve 生成的 plan 是纯 Markdown 文件，可被任意 Agent 或人类读取执行：

```bash
# 在其他 Agent 中执行已有计划
"implement plans/001-*.md"

# 或者让 improve 自己调度执行者
/improve execute 001
```

## 五、常见问题与解决方案

**improve 会修改我的源代码吗？**
不会。improve 有严格的硬规则：从不修改源代码，所有写操作只限于 `plans/` 目录。执行阶段在独立 Git worktree 中运行，合并权始终在人类手中。

**发现数量很多，如何处理？**
每个发现都有 Effort（工时）和 Confidence（置信度）标签，按 Impact / Effort 比值加权排序。最优先处理高置信度、低工时的发现。`reconcile` 命令会定期清理已完成和过期的发现。

**审计超时了怎么办？**
使用 `/improve quick` 做轻量级扫描，或使用 `/improve branch` 只审计当前分支的改动。

**方向建议（direction）发现缺乏实际意义怎么办？**
direction 类发现被要求必须引用代码库中的实际证据才会被采纳，否则会被 Vet 阶段拒绝，避免空泛的想法堆砌。

## 六、总结

**shadcn/improve** 是一个将 AI 代码审计流程工程化的优秀实践。它的最大价值不在于发现了多少 bug，而在于建立了**"分析 → 计划 → 执行 → 审核"**的闭环，让 AI 各司其职、各尽其用。对于维护中大型代码库的团队来说，这套机制可以让 AI 审计从一次性的玩具变成持续的质量保障基础设施，值得一试。
