---
title: "Learn Harness Engineering：如何构建让 AI 编码 Agent 稳定可靠工作的环境"
date: 2026-08-20
description: "Learn Harness Engineering 是一门关于 AI 编码 Agent 环境工程的实战课程，涵盖 14 节讲座、8 个项目，教你从零构建包含指令系统、状态管理、验证机制和生命周期控制的完整 Harness，引用 OpenAI 与 Anthropic 官方工程实践。"
author: "Cheman"
slug: learn-harness-engineering
draft: false
categories: ["技术", "开源"]
tags: ["AI", "Agent", "Harness Engineering", "GitHub Trending", "Claude Code"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Learn Harness Engineering**，一门专门教你如何为 AI 编码 Agent 构建稳定工作环境的实战课程，引用了 OpenAI 与 Anthropic 的官方工程实践。

## 一、项目概述

`learn-harness-engineering` 是由 walkinglabs 团队维护的开源课程，核心理念用一句话概括：**最强大的模型，在没有合适环境的情况下，依然会在真实工程任务中失败**。

Anthropic 曾做过一个对照实验：同一模型（Opus 4.5）、同一任务（"build a 2D retro game editor"），无 Harness 时花费 \$9 在 20 分钟内产出无法运行的产品；有完整 Harness（planner + generator + evaluator）时花费 \$200 在 6 小时内产出了真正可玩的游戏。模型没变，Harness 决定了结果。

课程包含：

- **14 节深度讲座**：从"为什么强模型依然失败"到"图工程（Graph Engineering）"，循序渐进
- **8 个实战项目**：围绕同一个 Electron 桌面知识库 App，渐进式构建完整 Harness
- **15 种语言**：覆盖中英日韩法德俄等主流语言
- **MIT 许可证**，完全开源

## 二、技术原理：Harness 的五大子系统

课程提炼出一套通用的五子系统 Harness 框架：

```
┌────────────────────────────────────────────────────────────────┐
│                          THE HARNESS                           │
│                                                                │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│   │ Instructions │  │    State     │  │   Verification     │   │
│   │              │  │              │  │                    │   │
│   │ AGENTS.md    │  │ progress.md  │  │ tests + lint       │   │
│   │ CLAUDE.md    │  │ feature_list │  │ type-check         │   │
│   │ feature_list │  │ git log      │  │ smoke runs         │   │
│   │ docs/        │  │ session hand │  │ e2e pipeline       │   │
│   └──────────────┘  └──────────────┘  └────────────────────┘   │
│                                                                │
│   ┌──────────────┐  ┌──────────────────────────────────────┐   │
│   │    Scope     │  │         Session Lifecycle            │   │
│   │              │  │                                      │   │
│   │ one feature  │  │ init.sh at start                     │   │
│   │ at a time    │  │ clean-state checklist at end         │   │
│   │ definition   │  │ handoff note for next session        │   │
│   │ of done      │  │ commit only when safe to resume      │   │
│   └──────────────┘  └──────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

**各子系统职责：**

| 子系统 | 职责 | 典型文件 |
|--------|------|---------|
| Instructions | 告诉 Agent 按什么顺序做什么 | AGENTS.md, CLAUDE.md |
| State | 持久化进度，跨 session 连续 | progress.md, feature_list.json |
| Verification | 只有测试通过才算完成 | tests, lint, type-check |
| Scope | 一次只做一个功能，避免过度扩展 | feature_list.json（机器可读） |
| Lifecycle | 初始化 → 执行 → 清理 → 交接 | init.sh, handoff note |

课程中特别强调了**渐进式指令披露（Progressive Disclosure）**的原则：不要把整个说明写在一个巨大文件里，而是按需让 Agent 分层读取。

## 三、Agent 会话生命周期

课程定义了一个结构化的 Agent 会话生命周期，这是 Harness 落地的核心框架：

```text
START
  1. 读取 AGENTS.md / CLAUDE.md
  2. 运行 init.sh（安装 + 验证 + 健康检查）
  3. 读取 progress.md（上次做了什么）
  4. 读取 feature_list.json（功能列表与状态）
  5. 检查 git log（近期变更）

SELECT
  6. 挑选一个未完成的功能
  7. 仅专注该功能

EXECUTE
  8. 实现功能
  9. 运行验证（测试、lint、类型检查）
  10. 验证失败 → 修复后重跑
  11. 验证通过 → 记录证据

WRAP UP
  12. 更新 progress.md
  13. 更新 feature_list.json
  14. 记录遗留问题
  15. 仅在安全时 commit
  16. 为下次会话留下干净的启动路径
```

关键洞察：**没有 Harness 的 Step 9 = "Agent 觉得看起来没问题"；有 Harness 的 Step 9 = "测试通过、lint 干净、类型检查无误"**。

## 四、快速上手：从 4 个文件开始

不需要学完全部 14 节课程，立即改善 Agent 表现的方法是：在项目根目录加入这 4 个文件：

```text
YOUR PROJECT ROOT
├── AGENTS.md              ← Agent 的操作手册
├── init.sh                ← 初始化脚本（安装+验证+启动）
├── feature_list.json      ← 机器可读的功能范围定义
├── claude-progress.md     ← 跨 session 进度日志
└── src/                   ← 实际代码
```

`init.sh` 的典型结构：

```bash
#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install

echo "=== Verifying environment ==="
npm run lint
npm run type-check
npm test

echo "=== Environment ready ==="
```

项目提供了[中文资源库](https://walkinglabs.github.io/learn-harness-engineering/zh/resources/)可直接下载模板。

## 五、课程进阶：从 Loop 工程到 Graph 工程

课程在 2026 年 8 月新增了**前沿 Harness 设计拆解**章节，深入分析四大顶级产品的 Harness 架构：

- **Pi**：最小内核 + 可编程扩展 + 上下文工程
- **Claude Code**：四层记忆、五级压缩、Hook 机制、子 Agent 隔离
- **Codex**：repo 作为唯一真相来源，AGENTS.md 作为目录页，工作树隔离
- **DeepSeek**："一切皆插件"、能力接缝设计、事件管道

**Loop 工程**（Lecture 13）教你从手动驾驶走向自动化循环：目标循环（goal loop）、定时循环（timer loop）、制造者-检查者分离（maker-checker）。

**Graph 工程**（Lecture 14）进一步指出：**当任务需要专业分工、并行处理、共享状态、验证和恢复时，它已经不再是循环，而是一个图**。一个节点 = 一个循环；多条边 = 状态路由和条件回滚。

## 六、总结

`learn-harness-engineering` 是目前最系统化、最贴近工业实践的 AI Agent 环境工程课程。它的核心价值不在于教你写更好的提示词，而在于告诉你：**Agent 的可靠性不是模型决定的，而是 Harness 设计的**。

课程难度适中，适合已使用 Claude Code / Codex 等编码 Agent、想要提升稳定性和工程质量的开发者，以及需要系统性理解 Harness 设计的技术负责人。

GitHub：https://github.com/walkinglabs/learn-harness-engineering  
文档站：https://walkinglabs.github.io/learn-harness-engineering/
