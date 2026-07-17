---
title: "Anthropic cwc-workshops：跟着官方学用 Claude 构建生产级智能体"
date: 2026-07-17
description: "anthropics/cwc-workshops 是 Anthropic 官方「Code with Claude」工作坊的开放材料，包含 9 个可动手运行的实验，覆盖模型选型、多智能体编排、Skills 与 MCP、记忆系统、Eval 驱动开发等核心主题，手把手教你从会用 Claude 进阶到能构建生产级 Agent 系统。"
author: "Cheman"
slug: cwc-workshops
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, Claude, Agent, Anthropic, AI]
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

**今天在 GitHub Trending 上看到一个有意思的项目：[anthropics/cwc-workshops](https://github.com/anthropics/cwc-workshops)**，这是 Anthropic 官方「Code with Claude」系列工作坊的开放材料。它不像普通 README 那样只讲概念，而是提供 9 个真实可跑的动手实验，带你从「会用 Claude」一路进阶到「能构建生产级 Agent 系统」。仓库注明 Not maintained and not accepting contributions，属于一次性公开的教学资产，但内容密度极高，值得反复研读。

## 一、项目概述

cwc-workshops 是 Anthropic 在内部「Code with Claude」工作坊中使用的全部材料集合，目标是把一线构建 Agent 的经验沉淀成可教学的实验。每个 Workshop 聚焦一个独立的工程主题，配套可运行代码与练习，整体覆盖了当前 Agent 工程最关键的几条主线：

- **模型选型（rightmodel）**：用 Claude Code SKILL 审计 LLM 评测套件，并在不同模型与推理参数（extended thinking、effort）上做扫描，找到质量/美元、质量/秒的最优配置。
- **多智能体分解（agent-decomposition）**：把一个 400 行的巨型 prompt「库存 Agent」拆成 skills + 代码执行 + callable_agents，跑在 Claude Managed Agents 上，并用 eval 验证每一步。
- **人机协作产品流（how-we-claude-code）**：三阶段走查 AI 辅助的产品工作流——访谈到规格、四套发散式静态 HTML 设计探索、再到组件能吐出机器可读 DOM 契约的 Vite + React 应用，让 Agent/CI 能在运行时验证 UI。
- **首个 Managed Agent（ship-your-first-managed-agent）**：一个 Streamlit 事故看板 + 离线 SRE Agent 聊天面板，你只需在 `agent.py` 里实现 7 个小函数（每个都是一次 Managed Agents API 调用），就能让它 grep 7 万行日志、调你的本地工具、定位问题 commit。
- **Agent 对战（agent-battle）**：45 分钟竞赛，配置一个 Claude Managed Agent（system prompt、skills、MCP servers、model）来驱动本地游戏 bot，谁钻石多谁赢、token 少打破平局，配 `--eval` 探针循环约 30 秒就能验证配置改动。
- **会记忆的 Agent（agents-that-remember）**：从一个跨会话明显「失忆」的 Agent 起步，逐层加入记忆原语——跨会话持久化的 memory store，再到 Dreaming Service 整合历史 transcript，45 分钟内完成「金鱼变同事」。
- **Eval 驱动开发（eval-driven-agent-development）**：把生成 PPTX 的 Managed Agent 迭代过 6 个变体（朴素→视觉→排版→配色→密度→QA-loop），用两层 grader（程序化的 `.pptx` XML 指标 + LLM-as-judge 对渲染页评审）打分，让每次 prompt 改动都可度量而非凭感觉。
- **生产级 Agent（production-ready-agent）**：「Deal Desk」——多智能体并购研究团队的聊天优先 UI，协调器并行派出 4 个研究子 Agent，从 memory store 读历史交易经验，经 MCP 连 Linear，边流式事件边产出有评级的投资 thesis。
- **研究台（research-desk）**：自托管 Next.js 控制台背后的 SEC 文件研究台，从裸 Agent 起步，再把它（版本化升级）提升为「研究主管」，通过自定义工具为每个标的派发分析师会话，配子 Agent 专家、edgartools Skill、结果评级记分卡、共享 memory store 与周报部署。

许可协议为 Apache License 2.0（仓库自带 LICENSE），可自由学习与二次开发。

## 二、技术原理

这套材料背后贯穿了几个 Agent 工程的核心设计范式，理解它们比记住某个 Workshop 更重要。

**1. Skills + MCP + callable_agents 的分层编排。** 在 agent-decomposition 中，巨型 prompt 被拆解为可被复用的 Skills（封装特定能力的可调用单元）、代码执行（把不确定逻辑交给确定性程序）与 callable_agents（把一个子任务委托给另一个受管 Agent）。这种分层让「单 prompt 巨兽」变成可测试、可组合的组件系统。

**2. Managed Agents 作为运行时底座。** 多个 Workshop（ship-your-first-managed-agent、agent-battle、eval-driven-agent-development、production-ready-agent、research-desk）都跑在 Claude Managed Agents 上。Managed Agent 提供会话沙箱、工具调用、并行子 Agent 派发与事件流，是「生产级」的关键抽象。

**3. 记忆的双层结构。** agents-that-remember 揭示了记忆并非单一概念：底层是跨会话持久化的 memory store（保存事实与状态），上层是 Dreaming Service（在后台整合历史 transcript，把零散记忆提炼为可复用经验）。这正是从「金鱼」到「同事」的跃迁路径。

**4. Eval 闭环驱动迭代。** rightmodel 与 eval-driven-agent-development 都在强调同一件事：没有评测就没有工程。前者扫描模型与参数空间，后者用两层 grader 对生成产物做程序化 + 语义双重打分，让每次改动都有量化反馈。

## 三、安装与快速开始

仓库本身是材料集合，每个 Workshop 是独立子目录，自带说明与代码。克隆后进入对应目录即可：

```bash
# 克隆仓库
git clone https://github.com/anthropics/cwc-workshops.git
cd cwc-workshops

# 进入某个具体工作坊（例如「Ship Your First Managed Agent」）
cd ship-your-first-managed-agent
cat README.md   # 阅读该 Workshop 的前置条件与步骤
```

**通用前置要求**（各 Workshop 略有差异）：

- 有效的 Claude API / Claude Managed Agents 访问权限
- 本地 Python 环境（多数实验使用 Streamlit、Vite/React 或纯 Python）
- 相应 API Key / Token（如涉及 MCP 连接本地工具或 Linear 等外部服务）
- 部分实验需要先部署 Claude Managed Agents 运行环境

> 注意：仓库明确标注 **Not maintained and not accepting contributions**，因此不会收到官方更新或 PR 合并，建议 fork 到自己的账号后再做修改。

## 四、使用方法与实战

以两个最具代表性的 Workshop 为例说明实战路径：

**实战一：用 rightmodel 做模型选型扫描。** 该 Workshop 提供一个 Claude Code SKILL，会对你的 LLM eval 套件做审计，然后自动在不同模型、extended thinking、effort 参数组合上 sweep，输出「质量/美元」与「质量/秒」的权衡曲线。对预算敏感或延迟敏感的业务，这是把「选哪个模型」从玄学变成数据的直接手段。

**实战二：从 0 到 1 交付你的首个 Managed Agent。** ship-your-first-managed-agent 用一个 Streamlit 事故看板降低门槛：你只需在 `agent.py` 里补齐 7 个小函数，每个函数对应一次 Managed Agents API 调用。完成后 Agent 能在自己的沙箱里 grep 7 万行日志、调用你的本地工具、甚至指出「坏掉的那个 commit」——非常适合作为理解 Managed Agents 编程模型的第一个练手项目。

更多进阶玩法（多智能体协调、记忆整合、Eval 打分、SEC 研究台）建议在掌握前两个后再逐个攻破，难度与收益都随顺序递增。

## 五、常见问题与解决方案

- **API 限流 / 认证失败**：多数 Workshop 依赖 Claude API 或 Managed Agents 权限。确认 API Key 已正确注入环境变量，私有或高频场景可传入 `--token` 提升限流上限。
- **MCP 本地工具连不上**：agent-battle、production-ready-agent 等需要本地 MCP server。检查 server 进程已启动、端口/路径配置与 Workshop 文档一致，再运行 `--eval` 探针快速验证。
- **子 Agent 不产出预期结果**：优先回到 eval 闭环——用 rightmodel 复核模型与参数选择，用 eval-driven-agent-development 的两层 grader 定位是程序化指标问题还是语义质量问题。
- **仓库不更新 / 无法提 PR**：这是预期行为（Not maintained）。需要改动请先 fork，并在自己仓库内维护。
- **运行环境依赖冲突**：各 Workshop 独立成目录，建议为不同实验使用独立的 Python venv / Node 环境，避免依赖互相污染。

## 六、总结

cwc-workshops 是少见的「官方一线经验直接开源」的 Agent 工程教材：它不堆砌概念，而是用 9 个可运行实验，把模型选型、多智能体编排、Skills/MCP、记忆系统和 Eval 驱动开发串成一条完整的学习路径。无论你是想系统补齐 Agent 工程方法论，还是找一组高质量的练手项目，这套材料都值得 clone 下来逐个工作坊走一遍。唯一需要注意的是它已声明不再维护，记得 fork 自留以便持续打磨。

> 仓库地址：[https://github.com/anthropics/cwc-workshops](https://github.com/anthropics/cwc-workshops) ｜ 许可：Apache License 2.0
