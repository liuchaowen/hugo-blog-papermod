---
title: "DojoAgents：面向个人投资的全局市场 AI 智能体框架"
date: 2026-07-15
description: "DojoAgents 是 Alpha-Dojo 开源的面向个人投资的 AI 智能体框架，以 Loop-Driven 认知组合智能体为核心引擎，结合机构级四柱仪表盘、自动量化分析与多模态持仓诊断，把跨市场数据认知、策略推演与组合管理整合到一个自主推理循环中。"
author: "Cheman"
slug: dojoagents
draft: false
categories: [技术, 开源, AI]
tags: [GitHub, 开源, AI智能体, 量化投资, LLM]
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

今天在 GitHub Trending 上看到一个有意思的项目：**DojoAgents**，一个专门面向个人投资者的「全市场 AI 投研副驾」——它不只是一个看盘面板，而是一个真正驻扎在你持仓旁的自主推理智能体。

## 一、项目概述

DojoAgents 由 Alpha-Dojo 团队开源（Apache 2.0 协议），定位是「Full-Market AI Copilot for Personal Investment」。它的目标是弥合散户与机构级投研工具之间的鸿沟。与传统金融 AI 工具只做新闻摘要、单股解读或简单指标解读不同，DojoAgents 的核心是 **Loop-Driven Cognitive Portfolio Agent（循环驱动的认知组合智能体）**：一个驻扎在组合旁的自主推理引擎，能够跨市场认知数据、执行多步工具调用、推演策略。

从工程视角看，它包含几个关键部分：

- **核心引擎 Agent Loop**：负责多轮工具编排、上下文窗口压缩、以及防止「金融幻觉」的严格护栏（guardrails）。
- **四柱仪表盘（Four-Pillar Dashboard）**：开箱即用的机构级 React SPA，覆盖 Portfolio（净值/风险/仓位）、Markets（跨市场热力图）、Sectors（L1/L2/L3 行业分类与动量）、Equities（K 线/PE 带/财务/新闻）。
- **自主量化分析师（Autonomous Quant Analyst）**：基于多智能体协作，在后台自动做市场研究、板块轮动跟踪与风险暴露监控。
- **多模态持仓诊断**：上传一张持仓截图，即可识别 40+ 标的，按市场/行业/供应链重新分组并生成风险诊断。

## 二、技术原理

### 七层架构与 Agent Loop

DojoAgents 的架构自下而上分为七层：基础设施 → 数据 → 工具 → Agent Loop → 聊天网关 / Web 仪表盘 / CLI。真正的核心在 Agent Loop 引擎：它把一次用户提问（如「今天全球市场有什么值得关注的？」）拆解为「数据收集阶段 → 工具调用 → 结构化分析 → 结论」的多步循环。

```python
# pyproject.toml 中声明的关键运行时依赖（节选）
dependencies = [
    "openai>=1.20.0,<2",            # OpenAI 兼容的 LLM 调用
    "fastapi>=0.110.0,<0.112",      # 后端 API（仪表盘通过 OpenAI 兼容 chat API + SSE 通信）
    "uvicorn>=0.31.1,<0.33.0",      # ASGI 服务器
    "strands-agents",               # 智能体运行时
    "strands-agents-tools",
    "mcp>=1.26.0,<2",               # Model Context Protocol，工具接入
    "apscheduler>=3.10.0,<4",       # 定时任务（Cron 推送洞察）
    "pandas>=2.2.0,<3",             # 数据处理
    "pyarrow>=14.0.0",
    "dojosdk>=0.1.8",               # Alpha-Dojo 自研 SDK
    "exchange-calendars>=4,<5",     # 交易所日历
    "ddgs",                         # DuckDuckGo 搜索工具
    "pypdf>=5.0.0,<7",              # 多模态持仓截图/PDF 解析
]
```

从依赖可以看出几个选型要点：

1. **LLM 无关**：通过 OpenAI 兼容接口接入任意供应商（OpenAI / Anthropic / Gemini / 智谱 GLM / DeepSeek），也支持 Ollama、vLLM 等本地端点。
2. **MCP 原生**：工具层基于 MCP 协议构建，便于扩展自定义数据源与专有工具。
3. **定时引擎**：`apscheduler` 支撑 Cron 与 Gateway，把「自动洞察」解耦推送到聊天应用，不阻塞主推理循环。

### 认知分析的四维模型

Agent Loop 在组合感知推理下，围绕四个维度组织分析：

- **基本面数据认知**：抓取、结构化并交叉引用多市场原始数据（K 线、财务、新闻）。
- **高级逻辑分析**：解读估值带、动量指标与行业分类，揭示隐藏的市场机制。
- **跨市场策略推演**：构建宏观资产配置，并映射市场联动（例如自主推理「为何美股半导体软件下跌而 A 股上扬」）。
- **动态组合管理**：持续诊断风险暴露、监控净值曲线、评估业绩归因，辅助再平衡决策。

### Memory & SKILLS

DojoAgents 会**自动把成功的多步市场分析工作流蒸馏为可复用的程序化 SKILLS**，供后续执行调用——这是它区别于普通「提示词 + 工具」式 Agent 的关键：随使用而自我增强。

## 三、安装与快速开始

### 环境要求

- Python >= 3.11
- Node.js >= 18、npm >= 9（前端构建）
- 一个 LLM API Key（OpenAI / Gemini / Anthropic 等）

### 核心安装

官方强烈推荐使用 `uv` 做依赖管理。普通用户推荐 PyPI 直接安装（无需克隆或构建前端）：

```bash
# macOS / Linux
uv venv && source .venv/bin/activate
uv pip install dojoagents
```

安装后直接跳到「启动服务」。开发者可从源码安装（editable 模式，改动即时生效）：

```bash
uv venv && source .venv/bin/activate
uv pip install -e ".[dev]"
```

### 构建仪表盘（仅源码安装需要）

```bash
cd dojoagents/dashboard/web
npm install
npm run build
```

### 启动服务

```bash
dojoagents dashboard --host 127.0.0.1 --port 8765
```

浏览器打开 `http://127.0.0.1:8765/` 即可进入个人金融指挥中心。

### 配置 LLM 引擎（应用内）

仪表盘启动后点击设置图标，通过图形界面安全配置大模型：

- **内置预设**：OpenAI、Anthropic、Google Gemini、智谱 GLM、DeepSeek。
- **本地/自定义端点**：覆盖 Base URL，连接 Ollama / llama.cpp / vLLM。
- **安全存储**：所有 API Key 与端点设置写入本地 `~/.dojo/agents.yaml`。

## 四、使用方法与实战

### 1. 每日市场概览

提问「今天全球市场有什么值得关注的？」，DojoAgents 进入数据收集阶段，调用全球市场、行业、个股工具，拉取 A 股/美股/港股的异动、强度排名、涨跌、成交量与板块分布。过程中可展开任意中间步骤，查看调用了哪些工具、引用了哪些数据、分析如何推进。

### 2. 新闻冲击分析

以「Meta 出售算力——哪些美股与 A 股标的可能受影响？」为例，DojoAgents 先把问题分解，再通过市场、新闻、公司、行业工具收集数据：Meta 的价格行为、相关标题、市场表现，以及美股科技、AI 算力链、半导体、云、广告科技等细分板块。

### 3. 截图式持仓诊断（多模态）

上传一张含 40+ 持仓（覆盖 A 股、美股、ETF）的截图，DojoAgents 识别每个持仓，按市场/行业/供应链重新分组，生成风险诊断——标记过度集中、重叠暴露与防御资产不足。即便有 40+ 标的，许多头寸其实押注同一主题，半导体/AI 算力/成长股的整体回撤可能拖累整个组合。

### 4. 推荐组合的模拟跟踪

诊断后会给出后续策略（削减重复持仓、保留核心标的、优化美股配置、降低弱势暴露、增配公用事业与消费必需品等防御资产）。你批准后，它可生成新的关注组合并在仪表盘持续跟踪。

## 五、常见问题与解决方案

**Q1：pip/uv 安装时版本冲突或安装失败？**
`pyproject.toml` 对大量依赖做了上界约束（如 `openai<2`、`fastapi<0.112`）。遇到冲突请用官方推荐的 `uv` 建独立虚拟环境，避免污染系统 Python；必要时指定 `uv pip install -e ".[dev]"` 锁定 dev 依赖。

**Q2：仪表盘打不开 / 前端空白？**
源码安装必须先在 `dojoagents/dashboard/web` 执行 `npm install && npm run build`；PyPI 安装包已内置 `web/dist`，无需构建。确认启动日志监听 `127.0.0.1:8765` 且未被防火墙拦截。

**Q3：LLM 调用报错或无响应？**
检查设置中配置的 Provider 与 API Key 是否正确，Base URL 是否适配（第三方兼容端点需显式覆盖）。API Key 存储在本地 `~/.dojo/agents.yaml`，注意不要提交到 Git。

**Q4：多模态截图诊断识别不准？**
依赖 `pypdf` 等做图像/PDF 解析，清晰度与表格规整度会影响识别。尽量提供高分辨率、列名清晰的持仓截图，并人工复核识别结果。

**Q5：定时推送（Cron/Gateway）不触发？**
`apscheduler` 驱动的计划任务依赖进程常驻；若进程退出则任务不执行。确保服务持续运行，并按文档配置 Slack/Telegram/Discord/飞书/微信/邮件等网关。

## 六、总结

DojoAgents 把「Agent Loop 推理引擎 + 机构级仪表盘 + 多模态诊断 + 自主量化」打包成一个面向个人投资者的开源框架，其最大亮点在于 Loop-Driven 的组合感知推理与可自我蒸馏复用的 SKILLS 机制。对于想用 LLM 做跨市场投研、但又不希望把持仓数据交给第三方的开发者，它提供了一个本地优先、隐私可控、可扩展的参考实现。

> ⚠️ **免责声明**：该项目仅用于教育、研究与演示，不构成投资建议。金融交易存在显著风险，所有数据与分析仅供参考，使用者需自行承担决策责任。

**项目地址**：https://github.com/Alpha-Dojo/DojoAgents
