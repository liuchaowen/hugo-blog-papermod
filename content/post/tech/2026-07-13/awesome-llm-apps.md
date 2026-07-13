---
title: "Awesome LLM Apps：100+ 开箱即用的 AI Agent 与 RAG 应用模板合集"
date: 2026-07-13
description: "Awesome LLM Apps 是由 Shubham Saboo 维护的 LLM 应用模板库，收录 100+ 可本地运行的 AI Agent、RAG、语音与多智能体项目，3 条命令即可跑起来，模型无关、Apache-2.0 协议。"
author: "Cheman"
slug: awesome-llm-apps
draft: false
categories: ["开源", "AI"]
tags: ["LLM", "Agent", "RAG", "GitHub", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Awesome LLM Apps**，它把「AI Agent / RAG 应用到底该怎么搭」这件最耗时的事，整理成了一份 100+ 可运行模板的"菜谱"——clone 下来、装依赖、跑起来，三步就能看到效果。

## 一、项目概述

**Awesome LLM Apps** 是一个由 Shubham Saboo 主导、社区共建的 LLM 应用模板库，目标是"你不必每次启动新项目都从零重写一遍 RAG 管线、Agent 循环或 MCP 集成"。它的核心理念是 **hand-built, not curated（亲手打造而非简单汇编）**：每个模板都是原创、端到端测试过、自包含可运行的完整源码，而不是从各处扒来的代码片段。

项目覆盖的现代 AI 技术栈非常完整，分为 15 个大类：

- 🧩 **Agent Skills**：给编码 Agent 装新能力的"技能包"，一行命令安装、自然语言调用
- 🌱 **Starter AI Agents**：单文件 Agent，仅需一个 API Key 即可运行
- 🚀 **Advanced AI Agents**：带工具、记忆、多步推理的生产级 Agent
- 🛰️ **Always-on Agents**：按计划或事件常驻运行的后台 Agent
- 🤝 **Multi-agent Teams**：多 Agent 协作完成复杂跨域任务
- 🗣️ **Voice AI Agents**：基于实时语音 API 的语音进出 Agent
- 🖼️ **Generative UI / Agentic Frontends**：能渲染交互式 UI 组件的 Agent
- ♾️ **MCP AI Agents**：通过 Model Context Protocol 连接外部工具
- 📀 **RAG 系列**：从基础链到 Agentic、多源、多模态检索增强生成
- 💾 **带记忆的 LLM 应用**、💬 **Chat with X**、🎯 **LLM 优化工具**、🔧 **微调教程**、🧑‍🏫 **框架速成课**

关键特性可以概括为几点：

1. **开箱即跑**：每个模板都经过端到端测试，不会出现 `requirements.txt` 裂掉或"脚手架自己想办法"的尴尬。
2. **模型无关**：Claude、Gemini、GPT、Llama、Qwen、xAI 之间切换只需改一处配置。
3. **配套教程**：每个精选模板在 Unwind AI 上都有免费的 Step-by-Step 教程。
4. **完全免费**：Apache-2.0 协议，可 fork、可商用、无注册墙、无遥测。

## 二、技术原理

从 README 透露的架构信息看，这套模板库并不是"一个框架"，而是 **一套风格统一、约定一致的脚手架集合**。理解它的设计，可以从三个层面入手。

### 1. 分层组织：从 Starter 到 Advanced 的能力梯度

模板按"能力复杂度"分层，而不是按"业务领域"分层。最底层是 `starter_ai_agents/`——单文件、零状态、只依赖一个 LLM SDK 的 Agent，例如一个旅行规划 Agent：

```bash
git clone https://github.com/Shubhamsaboo/awesome-llm-apps.git
cd awesome-llm-apps/starter_ai_agents/ai_travel_agent
pip install -r requirements.txt
streamlit run travel_agent.py
```

往上则是 `advanced_ai_agents/`，引入 **工具调用（tool use）、记忆（memory）、多步推理（multi-step reasoning）**，再往上则是 `multi_agent_apps/agent_teams/` 的多 Agent 协作。这种分层让新手能从"3 条命令跑通一个 Agent"平滑过渡到生产级架构。

### 2. Provider-Agnostic：配置驱动的模型抽象

整个库贯穿"模型无关"原则。所有模板都不会把某个厂商 SDK 写死，而是通过配置层切换底层模型。README 明确列出的支持对象包括 Claude、Gemini、OpenAI、xAI、Qwen、Llama。这意味着同一套 Agent 逻辑，换一家 API 只改配置即可，工程上大幅降低了"厂商锁定"风险。

### 3. 两大现代范式全覆盖：Agent Skills 与 MCP

- **Agent Skills**：把可复用能力封装成"技能包"，兼容 Claude Code、Codex、Cursor 等编码 Agent，一行命令安装、自然语言使用。例如"Project Graveyard Skill"会扫描你所有被放弃的副业项目，分析它们为什么死掉，并帮你挑出值得回去做完的那一个。
- **MCP（Model Context Protocol）Agents**：通过标准协议把 Agent 连到外部工具与数据——Browser MCP、GitHub MCP、Notion MCP、Travel Planner MCP，以及 Multi-MCP Agent Router（把请求路由到合适的 MCP 服务）。

RAG 部分则覆盖了当前主流形态：基础链（RAG Chain）、Corrective RAG（CRAG）、Agentic RAG（带推理的检索）、Hybrid Search、Knowledge Graph RAG、Vision RAG、Local RAG 等，几乎是一张"RAG 全家福"。

## 三、安装与快速开始

项目本身是纯模板库，无需"安装"，直接 clone 即可。以最经典的旅行 Agent 为例：

```bash
# 1. 克隆仓库
git clone https://github.com/Shubhamsaboo/awesome-llm-apps.git

# 2. 进入某个模板目录
cd awesome-llm-apps/starter_ai_agents/ai_travel_agent

# 3. 安装依赖
pip install -r requirements.txt

# 4. 运行（多数模板基于 Streamlit）
streamlit run travel_agent.py
```

通用前置要求：

- Python 3.9+
- 一个 LLM 提供方的 API Key（Claude / Gemini / OpenAI / xAI / Qwen 等任一）
- 把 Key 配置到对应模板的环境变量或配置文件中（具体见各模板 README）

最简运行示例就是上面那段——**30 秒跑通第一个 Agent**。

## 四、使用方法与实战

### 基础用法：挑模板、改配置、跑起来

最直接的用法是"找最近的模板改"。例如想做一个带记忆的客服聊天机器人，可以直接打开 `advanced_llm_apps/llm_apps_with_memory_tutorials/` 下任意一个，替换成自己的知识源与模型 Key 即可。

### 进阶用法：组合范式搭建复杂系统

当你需要生产级能力时，可以从多个分类组合：

- 做 **多 Agent 协作**：参考 `agent_teams/` 下的竞品情报、财务、法务、招聘团队模板，学习如何拆分角色、定义交接（handoff）。
- 做 **语音交互**：从 `voice_ai_agents/` 起步，例如用 Gemini Live + ADK 搭建保险理赔实时语音接入团队。
- 做 **可交互前端**：用 `generative_ui_agents/` 让 Agent 直接渲染表单、卡片、图表，而不仅是输出文本。
- 接 **外部工具**：通过 `mcp_ai_agents/` 把 GitHub、Notion、浏览器变成 Agent 的工具。

### 实际项目示例

本月"Featured"里值得关注的几个实战模板：

| 模板 | 能力 | 技术栈 |
|---|---|---|
| Project Graveyard Skill | 扫描废弃副业项目并分析死因 | Agent Skill · 本地运行 |
| Always-on HN Briefing Agent | 定时爬取 HN、过滤 AI Agent 信号生成日报 | ADK + Agent Runtime |
| Insurance Claim Live Agent Team | Gemini Live 实时语音理赔接入 | Voice + ADK |
| AI Home Renovation Agent | 照片 → AI 重设计 | Vision + 多 Agent |
| Self-Improving Agent Skills | 用 Gemini+ADK 自动优化 Agent 技能 | Agent Skills + ADK |

## 五、常见问题与解决方案

基于模板库"开箱即跑"的设计目标，以及 LLM 应用常见的踩坑点，整理以下 FAQ：

**1. 装完依赖运行报缺包 / ImportError？**
各模板自带独立的 `requirements.txt`，且经过端到端测试。优先确认 `cd` 进了正确的模板子目录再 `pip install -r requirements.txt`；建议用虚拟环境（venv / conda）隔离，避免与全局包冲突。

**2. 运行后模型无响应 / 401 报错？**
这是 API Key 未配置或配置错误所致。检查对应模板的环境变量或配置文件是否填了有效的 Key，并确认所选厂商在 README 支持列表（Claude / Gemini / OpenAI / xAI / Qwen / Llama）内。

**3. 想换模型（如从 OpenAI 换到 Gemini）怎么改？**
利用模板的"模型无关"设计，只改配置层选择模型的字段即可，无需改动 Agent 逻辑。具体字段名参考各模板 README。

**4. 对成本 / Token 敏感怎么办？**
项目内置 LLM 优化工具：`toonify_token_optimization`（用 TOON 格式降低 30–60% API 成本）、`headroom_context_optimization`（降低 50–90% 成本），可直接复用到自己的项目。

**5. 模板太多不知从哪下手？**
新手建议从 `starter_ai_agents/` 单文件 Agent 起步；有基础后再看 `advanced_ai_agents/`；需要框架深度可看 `ai_agent_framework_crash_course/`（Google ADK、OpenAI Agents SDK 速成）。

## 六、总结

**Awesome LLM Apps** 的价值不在于"又一份 awesome-list"，而在于它把 LLM 应用的**工程实践沉淀成了可运行、可 fork、可商用的模板集**——覆盖从单文件 Starter 到多 Agent 团队、从 RAG 到语音、从 MCP 到 Agent Skills 的完整现代技术栈，且模型无关、Apache-2.0 自由使用。如果你正准备动手做一个 AI 应用，先把这份"菜谱"翻一遍，很可能能省下从零搭脚手架的数天时间。仓库目前已登上 Trendshift 推荐，值得 ⭐star 以便追踪后续新模板掉落。

> 项目地址：<https://github.com/Shubhamsaboo/awesome-llm-apps>
