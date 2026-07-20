---
title: "WrenAI：用上下文层让 AI Agents 真正读懂你的业务数据"
date: "2026-07-20"
description: "WrenAI 是一个开源的生成式 BI 引擎，通过可版本化、可审查的上下文层，让 AI Agents 能够生成、部署和治理 BI 报表，解决了传统 AI 生成 SQL 准确率低、业务语义缺失的核心难题。"
author: "Cheman"
slug: wrenai
draft: false
categories: ["技术", "开源", "AI"]
tags: ["AI", "BI", "GitHub", "开源", "大模型"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**WrenAI**，它是目前最完整的开源生成式 BI 引擎，让 AI Agents 能够基于可信的上下文层生成、部署和治理 BI 报表，真正把业务语义带进 SQL 生成的过程。

## 一、项目概述

WrenAI 由 Canner 团队打造，核心定位是 **Open-source GenBI Engine**——为 AI Agents 提供可信的业务上下文，让它们生成的不是"看起来对的 SQL"，而是"真正符合业务定义的 SQL"。

**核心能力三连：**

- **Generate（生成）**：Agent 把业务问题转化为受治理的 SQL 和图表，基于 MDL（Modeling Definition Language）语义层做规划，支持 22+ 数据源dry-plan 验证，防止生成错误答案。
- **Deploy（部署）**：一句命令 `wren genbi deploy`，把分析结果打包成可交互的浏览器端仪表盘，部署到 Vercel 或 Cloudflare Pages，拿到一个可分享的 URL。
- **Know（治理）**：所有业务语义、定义、示例都存在版本化的 `instructions.md`、MDL 文件和 LanceDB 记忆索引中，可 Review、可 Git 管理，不再被锁在某个厂商的 UI 里。

## 二、技术原理

### 架构设计

WrenAI 的架构分为三层：

```
┌─────────────────────────────────────────────┐
│         AI Agents (Claude Code, Cursor…)     │
├─────────────────────────────────────────────┤
│  Wren GenBI Engine                          │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Generate  │ │  Deploy   │ │    Know    │  │
│  │ (SQL+Chart)│ │(Dashboard)│ │ (Context)  │  │
│  └──────────┘ └──────────┘ └────────────┘  │
├─────────────────────────────────────────────┤
│  wren-core (Rust / Apache DataFusion)       │
│  22+ Data Source Connectors                 │
└─────────────────────────────────────────────┘
```

### MDL 语义建模语言

MDL（Modeling Definition Language）是 WrenAI 的核心抽象层，用 JSON 定义数据模型、列、关系、视图、Cube、指标和访问控制：

```json
{
  "models": [{
    "name": "orders",
    "columns": [
      { "name": "order_id", "type": "STRING" },
      { "name": "customer_id", "type": "STRING" },
      { "name": "amount", "type": "DOUBLE", "description": "不含税金额" },
      { "name": "created_at", "type": "TIMESTAMP" }
    ]
  }],
  "relationships": [
    { "models": ["orders", "customers"], "type": "many_to_one" }
  ],
  "metrics": [
    { "name": "total_revenue", "expression": "SUM(orders.amount)" }
  ]
}
```

通过 MDL，Agent 不再只能看到冷冰冰的数据库 schema，而是能看到每个字段的业务含义、计量单位和有效关联关系。

### WASM 驱动的无服务器 BI

GenBI 仪表盘前端由 `wren-core-wasm` 驱动，整个 BI 计算在浏览器端执行，不需要后端服务器。这使得 Agent 可以在 CI/CD 流水线里直接生成和部署 BI 页面：

```bash
wren genbi build --project ./my-wren-project
wren genbi deploy --platform vercel  # 自动部署到 Vercel
```

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- Git
- AI Agent（Claude Code / Cursor / Cline / Codex 等，支持 MCP）

### 安装步骤

```bash
# 1. 安装核心 CLI（含 DuckDB）
pip install wrenai

# 国内用户建议使用清华镜像
pip install wrenai -i https://pypi.tuna.tsinghua.edu.cn/simple

# 2. 为你的 AI Agent 安装 discovery stub
npx skills add Canner/WrenAI
# 自动检测 Claude Code、Cursor、Cline 等环境并配置

# 3. 在项目目录中让 Agent 接管设置
# "Use Wren to set up my Postgres database."
```

### 最简运行示例

```bash
# 查询（Generate 模式）
wren query --sql 'SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id LIMIT 10'

# 自然语言驱动（让 Agent 自动生成 SQL）
wren ask "who are our top 10 customers by sales this quarter?"

# 生成并部署 BI 仪表盘
wren ask "turn that into an interactive dashboard and deploy to Vercel"
```

## 四、使用方法与实战

### 基础用法：让 Agent 读懂你的数据库

```bash
# 告诉 Agent
"Use Wren to set up my Postgres database."

# Agent 自动执行：
# 1. wren skills get onboarding  获取引导工作流
# 2. 检测环境，创建连接配置
# 3. 写入 MDL 文件，构建语义层
# 4. 执行第一次查询验证
```

### 进阶用法：注入业务上下文

业务定义往往存在于数据库 schema 之外——Excel 文档、业务规则文档、内部 wiki。WrenAI 支持将这些知识注入到项目中：

```bash
wren skills get enrich-context
# grill 模式：一问一答，逐步构建业务语义
# auto-pilot 模式：Agent 扫描项目 raw/ 目录，自动建议写入 MDL 和 instructions.md
```

### Agent SDK 集成

WrenAI 提供了 LangChain 和 Pydantic 集成，方便开发者将语义层能力嵌入自己的 AI 应用：

```python
from wren_langchain import WrenAIChain

chain = WrenAIChain(
    llm=your_llm,
    project_path="./my-wren-project"
)
result = chain.run("展示本季度销售额最高的 5 个产品类别")
```

## 五、常见问题与解决方案

**Q: pip install 速度慢或超时怎么办？**
国内用户添加清华 PyPI 镜像即可。如果 HuggingFace 模型下载超时，设置 `export HF_ENDPOINT=https://hf-mirror.com`。

**Q: Agent 生成的 SQL 仍然不正确？**
运行 `wren query --dry-plan` 做 dry-plan 验证，或补充 `instructions.md` 中的业务规则定义，教会 Agent 哪些 join 是合法的、哪些聚合单位是正确的。

**Q: 想连接的数据源不在支持列表中？**
WrenAI 提供了[三层次接器生态计划](https://github.com/Canner/WrenAI/blob/main/docs/contributing-a-connector.md)：官方维护、社区认证、社区自建，按需选择或贡献自己的接器。

**Q: 生成的 BI 仪表盘加载很慢？**
`wren-core-wasm` 在浏览器端执行查询，大数据量场景建议在 MDL 中配置聚合视图（pre-aggregations），减少实时计算量。

## 六、总结

WrenAI 解决了 AI + BI 落地的关键瓶颈：**上下文可信度**。传统方案里 Agent 靠"感觉"写 SQL，靠 Prompt 硬塞业务规则；WrenAI 则把业务语义变成可版本化、可审查、可复用的基础设施，让 AI 生成的 BI 真正可信赖。如果你正在构建 AI 数据分析能力，WrenAI 是目前开源世界里路径最完整的选择。
