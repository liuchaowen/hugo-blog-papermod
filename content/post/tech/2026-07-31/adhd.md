---
title: "ADHD：让 AI 编程代理突破「思维定势」的开源技能"
date: "2026-07-31"
description: "ADHD 是一个为 AI 编程代理设计的开源技能，通过并行发散思考和独立评分机制，让 AI 在设计决策、模糊调试、API 命名等任务上显著提升创意广度和陷阱检测能力。"
author: "Cheman"
slug: adhd
draft: false
categories: ["技术", "开源", "AI 编程"]
tags: ["GitHub", "AI Agent", "开源", "Claude Code", "思维框架"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ADHD — a skill for coding agents**，它解决的是一个很实际的问题——大语言模型在编程时容易「过早收敛」，一旦给出了第一个方案，后续思考就被锚定住了，难以探索更多可能性。

## 一、项目概述

**ADHD** 是由 Udit Akhouri 开发的一个 AI 编程代理技能，核心定位是解决 LLM 在生成式推理中的「过早收敛」（Premature Convergence）问题。它借鉴了人类神经多样性中 ADHD（注意力缺陷多动障碍）的特质——思维在多个方向上同时发散——将这一特性工程化为一套可量化的双阶段推理框架。

该项目的核心特点：

- **generator-critic 硬分离**：生成器和评分器是两次完全独立的 LLM 调用，中间有「硬墙」阻断，不允许在生成阶段就自我评判，从架构上杜绝了锚定效应
- **多认知框架并行发散**：一次生成 N 个隔离的思考分支，每个分支拥有不同的认知「框架」（如经济激励、感知扭曲、集体智慧等），框架之间完全隔离，零共享上下文
- **陷阱检测能力大幅提升**：独立评分器专门负责识别「看起来对但实际有坑」的想法，实验数据显示陷阱检测得分提升 **5.2 倍**（9.50 vs 1.83）

已在多个开源项目中正式集成，包括 repowire、mstack、zk-flow-oss 等，并被 The New Stack 专题报道。

## 二、技术原理

### 2.1 为什么传统 CoT 和 ToT 也会过早收敛？

**Chain-of-Thought**（思维链）的问题在于：它锚定在第一个说出口的答案上，后续推理都是在第一个答案的框架里修修补补。

**Tree-of-Thought**（思维树）虽然做了分支搜索，但因为所有分支共享同一个上下文树，锚定效应仍然会跨分支传递——你在分支 A 里看到分支 B 说了什么，就会不由自主地受影响。

ADHD 的诊断是：**这是一个架构问题，而不是提示词问题**。

### 2.2 双阶段架构

```
阶段一：Diverge（发散）
  1. 从预定义库中选择 N 个认知框架（默认 6 个）
  2. 为每个框架启动独立的 LLM Agent
  3. 每个 Agent 收到：问题 + 框架视角 + 禁止评价的系统提示
  4. N 个分支完全隔离运行，结果互不可见

阶段二：Focus（聚焦）
  1. 收集所有分支的想法（30+ 个）
  2. 独立 Critic Agent 评分：新颖性、可行性、与问题的契合度
  3. 标记陷阱并给出原因（如：「流式令牌逆序——会让 UI 体验很差」）
  4. 聚类相似想法
  5. 深化 Top-K 幸存者，给出具体步骤和风险
```

关键源码片段（TypeScript）：

```typescript
import { run, renderText } from "adhd-agent";

const result = await run({
  problem: "How should we shard this queue under bursty load?",
  framesPerRun: 5,
  topK: 3
});

console.log(result.shortlist);         // 精选想法列表
console.log(result.nonObviousPick);   // 最反直觉但最有力的方案
console.log(result.traps);            // 被识别的陷阱
console.log(result.clusters);         // 按角度聚类的结果
```

### 2.3 15 种认知框架

ADHD 内置了 15 种认知框架，覆盖不同思维方式：

| 框架 | 典型视角 |
|------|----------|
| economic-incentive | 成本与收益分析 |
| async-control-surface | 异步控制流设计 |
| gamification | 游戏化激励机制 |
| perceptual-distortion | 感知与 UX 失真 |
| collective-intelligence | 群体智慧视角 |
| redundancy-race | 冗余与竞态分析 |
| new-grad / archeologist | 新手视角 / 考古视角 |
| security-researcher | 安全研究员视角 |
| on-call-at-3am | 值夜班工程师视角 |

开发者也可以自定义框架并贡献到社区。

## 三、安装与快速开始

### 3.1 安装

一行命令，自动识别你的代理工具（Claude Code、Cursor、Cline、Windsurf 等）：

```bash
npx skills add UditAkhourii/adhd
```

也可以通过 npm 全局安装 CLI：

```bash
npm install -g adhd-agent
```

### 3.2 快速使用

安装后在支持的代理中调用：

```bash
# Claude Code / 其他代理
/adhd "design a rate limiter that survives a leader election"

/adhd "name this function" --frames 3 --ideas 8 --top 2
```

### 3.3 作为库使用

```typescript
import { run, renderText } from "adhd-agent";

const result = await run({
  problem: "design a rate limiter",
  framesPerRun: 5,  // 并行框架数量
  topK: 3           // 深化 Top-K 想法
});

console.log(renderText(result));
```

## 四、使用场景与实战效果

### 4.1 什么时候用 ADHD？

项目文档明确推荐的使用场景：

- **设计决策**：给出几个方案/思路（「give me a few ways to…」）
- **模糊调试**：问题描述不清、方向不明
- **命名**：函数名、变量名、API 命名
- **API 表面设计**：接口设计选型
- **策略规划**：技术路线选择

**不推荐使用的场景**：简单的事实查询、有标准答案的问题、精确计算类任务。

### 4.2 实验数据

在 6 个开放式工程问题上，独立 LLM 评委（持怀疑态度的高级工程师视角）对 ADHD 和单次生成基线的评分（0-10）：

| 维度 | ADHD | 基线 | 提升 |
|------|-----:|-----:|-----:|
| 思考广度 | **9.00** | 4.83 | +4.17 |
| 新颖性 | **7.83** | 2.67 | +5.17 |
| 陷阱检测 | **9.50** | 1.83 | +7.67 |
| 可操作性 | **9.50** | 6.50 | +3.00 |
| 对工程师有用程度 | 7.67 | 6.83 | +0.83 |

最大亮点是**陷阱检测**，提升 5.2 倍——基线方法几乎不会主动识别「看起来有道理但实际是坑」的想法，而 ADHD 能系统性地发现并警告它们。

### 4.3 真实案例对比

以「设计一个 LLM CLI 超时重试策略」为例：

**基线回答**：给出教科书式的渐进超时 + 指数退避重试方案，最终推荐 15s 首 token 超时、30s 间隔超时、90s 绝对超时——Google SRE Book 第 22 章的标准答案。**缺陷**：没有识别陷阱，没有考虑「用户可能想直接取消」或「慢模型可能本身就是错误选择」。

**ADHD 回答**：同时发散 6 个框架，产生 30+ 个想法，聚类后包括经济激励、异步控制面、游戏化等多个角度。输出了 20 个陷阱警告，其中包括：*「流式令牌逆序显示」*和*「耐心-代币计费」*这两个看起来有道理但实际有问题的想法。最反直觉的pick：*「rage-quit = 即时中止 + 切换到更便宜的 Haiku 级模型」*——这个方案基线完全没有考虑。

## 五、常见问题

**Q：运行 ADHD 会增加多少时间和成本？**
A：单次调用 ADHD 相比单次生成约增加 2.3× 时间和 1.9× token 消耗（约 1.9 倍）。但因为陷阱在规划阶段就被识别，避免了后期返工，实际项目效率整体提升。

**Q：支持哪些编程语言？**
A：作为 Claude Agent SDK 上的技能，TypeScript/JavaScript 项目原生支持。CLI 和库也支持 Python 等语言通过子进程调用。

**Q：和 CoT、ToT 的本质区别是什么？**
A：三个关键架构差异——(1) 生成阶段禁止评价，从架构上消除自我锚定；(2) 框架选择与最终决策完全解耦；(3) 独立 Critic 不是提示词技巧，是物理上分离的 LLM 调用。

## 六、总结

ADHD 是一个兼具学术深度和工程实用性的 AI 推理增强框架。它将「思维发散」从一个模糊的概念工程化为可配置、可测量、可复现的双阶段流程。在需要创意和策略的设计类任务上，它能显著提升 AI 输出的广度、新颖性和安全性。如果你经常感觉 AI 给出的第一个答案「差点意思」但又说不清哪里不对，ADHD 或许正是你需要的工具。

**项目地址**：https://github.com/UditAkhourii/adhd

**预印论文**：https://adhdstack.github.io/
