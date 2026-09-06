---
title: "mattpocock/skills：给 AI 编程助手装上「工程师大脑」"
date: 2026-09-06T09:04:00+08:00
description: "mattpocock/skills 是 TypeScript 大神 Matt Pocock 开源的 AI Agent 技能集，包含 grill-me、TDD、代码审查等 20+ 实战技能，旨在解决 AI 编程中的对齐偏差、冗余表达、代码质量和架构腐化四大痛点。"
author: "Cheman"
draft: false
tags: ["GitHub", "AI Agent", "Claude Code", "技能", "工程实践"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**mattpocock/skills**，这是 TypeScript 教育领域知名开发者 Matt Pocock 开源的一套 AI Agent 技能集，目前已斩获超 25 万 Star。

## 一、项目概述

mattpocock/skills 是一套为 Claude Code、Codex、Cursor 等 AI 编程助手设计的「工程技能包」。与 GSD、BMAD、Spec-Kit 等试图「接管整个流程」的方案不同，这套技能的设计哲学是**小而可组合**——每个技能只解决一个具体问题，开发者可以自由搭配、随意修改。

项目核心解决 AI 编程中的四大经典痛点：

1. **Agent 没理解需求就开干** → 用 `/grill-me` 或 `/grill-with-docs` 进行「拷问式」对齐
2. **Agent 表达冗余** → 通过构建共享语言（`CONTEXT.md`）压缩沟通成本
3. **代码跑不通** → 用 `/tdd` 驱动红-绿-重构循环
4. **代码变成泥球** → 用 `/improve-codebase-architecture` 定期扫描架构优化点

## 二、技术原理

### 设计哲学：用户调用 vs 模型调用

项目将技能分为两类：

- **User-invoked（用户调用）**：如 `/grill-me`、`/triage`、`/implement`，只能由用户主动触发，负责编排流程
- **Model-invoked（模型调用）**：如 `tdd`、`code-review`、`research`，可以被 Agent 根据任务自动调用，封装可复用的工程纪律

这种分层设计意味着用户调用技能可以编排模型调用技能，但不会互相嵌套调用，形成清晰的调用图。

### 核心技能：Grilling（拷问式对齐）

这是整个项目最核心的理念。引用《 pragmatic programmer 》中的话："没人确切知道自己想要什么"。`/grill-me` 和 `/grill-with-docs` 会在项目启动前对用户进行密集提问，直到设计树的每个分支都被解决。

`/grill-with-docs` 在拷问的同时还会：

- 构建 `CONTEXT.md` 域模型文档，建立项目专属术语表
- 生成 ADR（Architecture Decision Records）记录关键决策

效果示例：
- **改造前**：「课程里某个 section 里的 lesson 被'真实化'（即分配文件系统位置）时出问题」
- **改造后**：「materialization cascade 有问题」

术语压缩带来的是 Token 消耗降低、代码命名一致性提升、Agent 导航代码库效率提高。

### TDD 技能：红-绿-重构

```markdown
# /tdd 工作流
1. RED: 先写一个失败的测试
2. GREEN: 用最少代码让测试通过
3. REFACTOR: 在测试保护下重构
```

每个垂直切片（vertical slice）独立完成，保证 Agent 始终有反馈回路。

### 架构扫描：深度模块理论

`/improve-codebase-architecture` 基于 John Ousterhout 的「深度模块」理念——大量行为隐藏在简单接口背后。它会：

1. 扫描代码库寻找「深化机会」
2. 生成可视化 HTML 报告
3. 让用户选择一个进行拷问式细化

## 三、安装与快速开始

### 方式一：Claude Code 插件（托管模式）

```bash
claude plugins install mattpocock-skills
```

或在会话内：

```
/plugin install mattpocock-skills
```

这种方式以只读方式安装，作者更新时自动同步，适合「订阅」而非「分叉」的理念。

### 方式二：skills.sh 安装（可编辑模式）

```bash
npx skills@latest add mattpocock/skills
```

安装器会让你选择需要的技能和目标 Agent，技能文件直接写入项目目录，完全可编辑。**建议确保 `setup-matt-pocock-skills` 被选中**。

### 初始化配置

安装后在 Agent 中执行：

```
/setup-matt-pocock-skills
```

它会依次询问：
- 使用什么 Issue 追踪器（GitHub、Linear 或本地文件）
- Triage 时使用什么标签
- 文档保存位置

## 四、使用方法与实战

### 场景一：新功能开发

```
# 步骤 1: 拷问式对齐 + 域建模
/grill-with-docs

# 步骤 2: 生成 spec 并发布到 Issue 追踪器
/to-spec

# 步骤 3: 拆解为 tracer-bullet 票据
/to-tickets

# 步骤 4: 按 spec 实现，TDD 驱动
/implement

# 步骤 5: 提交前代码审查
/code-review
```

### 场景二：调试困难 Bug

```
/diagnosing-bugs
```

该技能封装了 disciplined 调试循环：构建能复现 Bug 的反馈回路 → 最小化复现 → 提出假设 → 插桩验证 → 修复 → 回归测试。

### 场景三：大型项目规划

```
/wayfinder
```

当工作量超过单个 Agent 会话容量时，Wayfinder 将工作分解为决策票据的共享地图，逐一解决直到路径清晰。

### 场景四：不确定用哪个技能

```
/ask-matt
```

这是一个路由技能，会根据当前情境推荐合适的技能或流程。

## 五、常见问题与解决方案

### Q1: 两种安装方式可以同时用吗？

**不建议。** Claude Code 插件和 skills.sh 安装会重复添加所有技能文件。选择一种即可：要自动更新选插件，要可定制选 skills.sh。

### Q2: 支持哪些 AI Agent？

- **Claude Code**：原生支持（插件市场直装）
- **Codex**：通过 skills.sh 安装
- **其他 Agent**：通过 skills.sh 安装，只要支持读取项目目录中的技能文件即可
- 原生 Codex 插件在路线图中（ADR #0002）

### Q3: 必须用 TDD 吗？

`/implement` 技能在「pre-agreed seams」处驱动 TDD，但不是强制所有代码都 TDD。你可以在 `/grill-with-docs` 阶段约定哪些部分走 TDD。

### Q4: 已有大型遗留代码库怎么办？

`/improve-codebase-architecture` 是扫描工具而非救援工具。它会在老代码库中找到真实的深化候选，但不会自动帮你解开泥球。建议每几天跑一次，逐个处理。

## 六、总结

mattpocock/skills 的核心洞察是：**AI 编程的瓶颈不在代码生成速度，而在工程纪律的保持**。通过将老牌工程实践（对齐、域建模、TDD、架构深化）封装为可复用的 Agent 技能，它让 AI 编程从「vibe coding」回归到「real engineering」。

项目本身的设计也很有意思——不试图接管你的流程，而是提供小而精的工具让你自由组合。这种哲学加上 Matt Pocock 在 TypeScript 社区的影响力，或许解释了为什么它能快速冲到 GitHub Trending 前列。

如果你正在用 Claude Code 或 Codex 做日常开发，这套技能值得一试。
