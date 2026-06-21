---
title: "Cognee：开源 AI Agent 长期记忆平台实战解析"
date: 2026-06-22
description: "Cognee 通过统一摄取、向量+图混合检索与认知科学本体论，为 AI Agent 提供跨会话的持久记忆。本文覆盖架构原理、快速上手、实战示例与部署方案。"
author: "Cheman"
slug: cognee
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "Agent", "知识图谱", "记忆", "Python"]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**Cognee**，它主打“给 AI Agent 一个能长期记住并主动关联知识的自我托管记忆层”。一句话概括，就是想让 Agent 不再被上下文窗口限制，而是拥有一个可演进、可查询、可共享的知识库。

## 一、项目概述

Cognee 是一个面向 AI Agent 的开源长期记忆平台。它允许开发者把任意格式的数据（文档、网页、数据库、聊天记录等）导入系统，自动构建成本地托管的知识图谱，并为 Agent 提供跨会话的持久记忆能力。

传统 LLM 应用最大的瓶颈之一，是上下文窗口有限且每次对话从头开始。Cognee 试图解决三个核心问题：

- **上下文遗忘**：长对话或复杂任务中，模型只能看到最近几轮内容；
- **跨会话记忆缺失**：一次对话中学到的信息，下次无法直接复用；
- **数据孤岛**：企业知识分散在文档、数据库、工单、IM 中，Agent 难以统一利用。

Cognee 的核心特性包括：

- 统一数据摄取（Unified Ingestion）：支持 PDF、Markdown、网页、数据库、聊天记录等多种来源；
- 知识图谱 + 向量检索：结合图推理和语义向量，实现“按意思搜索”和“按关系连接”；
- 持久记忆与会话记忆：可区分长期知识图谱和临时会话缓存；
- 自托管与多后端：支持 SQLite、Postgres、Neo4j 等存储后端；
- 可观测与审计：内置 OTEL Collector、租户隔离、审计追踪；
- 插件生态：已提供 Claude Code、OpenClaw 等 IDE / Agent 插件。

## 二、技术原理

### 2.1 整体架构

Cognee 的 pipeline 可以抽象为四层：

1. **数据摄取层**：把多源异构数据加载、清洗、分块；
2. **表示层**：对文本做嵌入（embedding），并基于认知科学方法自动生成本体（ontology）；
3. **存储层**：同时维护向量索引（LanceDB 等）和知识图谱（NetworkX / Neo4j），两者互相补充；
4. **查询层**：根据用户查询自动选择最优检索策略（graph search、vector search 或 hybrid），返回带上下文的 recall 结果。

### 2.2 核心技术栈与选型

从 `pyproject.toml` 可以看到 Cognee 的依赖非常广泛：

- **Web / API**：FastAPI、Starlette、Uvicorn，用于暴露 REST API；
- **数据库**：SQLAlchemy、Alembic 做关系型 schema；Postgres + PGVector、Neo4j 做可选后端；
- **向量与图**：LanceDB、NetworkX、Neo4j，实现向量与图谱双引擎；
- **LLM 调用**：litellm + instructor，支持 OpenAI、Anthropic、Groq、Mistral、Ollama、Azure 等；
- **数据解析**：pypdf、unstructured、docling、nbformat，覆盖主流文档格式；
- **可观测性**：structlog、OpenTelemetry、Sentry、Langfuse，方便线上排错。

### 2.3 关键设计：session memory vs persistent memory

Cognee 区分了两种记忆：

- **session memory**：快速缓存，用于当前对话上下文，生命周期短，后台异步同步到图谱；
- **persistent memory**：写入知识图谱的长期记忆，跨会话可用，支持关系推理。

这种分层设计让 Agent 既能快速响应，又能把有价值的信息沉淀下来。Claude Code 插件的 hook 设计也体现了这一点：`SessionStart` 初始化记忆、`PostToolUse` 捕获动作、`SessionEnd` 把会话数据合并到永久图谱。

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.10 到 3.14（推荐用 `uv` 或 `poetry` 管理环境）；
- 至少一个 LLM API Key（OpenAI 默认，也支持其他 provider）；
- 可选：Docker / Docker Compose（用于运行 UI 或 MCP Server）。

### 3.2 安装

```bash
uv pip install cognee
```

或使用 pip：

```bash
pip install cognee
```

配置 LLM Key：

```bash
export LLM_API_KEY="sk-xxx"
```

也可以在项目根目录创建 `.env` 文件，按官方模板填写。

### 3.3 最简运行示例

```python
import cognee
import asyncio

async def main():
    # 写入长期记忆（自动完成 add + cognify + improve）
    await cognee.remember("Cognee 能把文档变成 Agent 的长期记忆。")

    # 写入会话记忆
    await cognee.remember("用户喜欢详细解释。", session_id="chat_1")

    # 自动路由查询
    results = await cognee.recall("Cognee 是做什么的？")
    for result in results:
        print(result)

    # 先查会话记忆，再 fall back 到图谱
    results = await cognee.recall("用户喜欢什么？", session_id="chat_1")
    for result in results:
        print(result)

    # 清空指定数据集
    await cognee.forget(dataset="main_dataset")

if __name__ == "__main__":
    asyncio.run(main())
```

## 四、使用方法与实战

### 4.1 使用 CLI

```bash
# 记住一条知识
cognee-cli remember "Cognee 能把文档变成 Agent 的长期记忆。"

# 查询
cognee-cli recall "Cognee 是做什么的？"

# 清除
cognee-cli forget --all

# 启动本地 UI（需要 Docker）
cognee-cli -ui
```

### 4.2 Docker 部署

Cognee 提供了官方镜像 `cognee/cognee` 和 `cognee/cognee-mcp`。最快捷的方式是 Docker Compose：

```bash
cp .env.template .env
# 编辑 .env，设置 LLM_API_KEY

# 启动 API Server
docker compose up

# 可选：同时启动前端、MCP Server、Postgres、Neo4j
docker compose --profile ui --profile mcp --profile postgres --profile neo4j up
```

Dockerfile 中使用了 `uv` 构建多阶段镜像，启用 bytecode 编译以提升容器冷启动速度，并且通过 `UV_LINK_MODE=copy` 避免挂载卷时的链接问题。

### 4.3 实战场景 1：客服 Agent 记忆客户历史

```python
# 目标：根据客户历史数据解决 billing 问题
await cognee.remember(
    "用户反馈发票金额不对，之前两次类似 billing 问题都由支付与发票系统同步延迟导致。"
)

results = await cognee.recall("用户发票金额异常的原因")
# Agent 可以基于 recall 结果给出：
# "我找到 2 个上个月已解决的类似 billing 案例，原因都是支付与发票系统同步延迟。"
```

### 4.4 实战场景 2：SQL Copilot 专家知识蒸馏

Cognee 可以保存资深分析师的 SQL 模式、schema 结构和成功案例。当新人分析师提问时，系统检索相似 schema 与历史优秀 SQL，自动适配并返回解释。

```python
await cognee.remember("资深分析师计算留存率的 SQL 模板 ...")

results = await cognee.recall("如何计算客户留存率")
# 结果包含：匹配到的专家 SQL、对应 schema、执行说明
```

### 4.5 与 Claude Code / OpenClaw 集成

Cognee 提供了 Claude Code 插件和 OpenClaw 插件。安装后，Agent 的每次工具调用、用户提示、上下文压缩都会被捕获并写入 Cognee，实现真正的“跨会话记忆”。

```bash
# Claude Code
claude --plugin-dir ./cognee-integrations/integrations/claude-code

# 或连接到 Cognee Cloud
export COGNEE_SERVICE_URL="https://your-instance.cognee.ai"
export COGNEE_API_KEY="ck_..."
```

## 五、常见问题与解决方案

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 运行时报 `LLM_API_KEY` 缺失 | 环境变量未设置 | `export LLM_API_KEY="..."` 或创建 `.env` |
| `cognee-cli -ui` 启动失败 | 没有 Docker 环境 | 安装 Docker Desktop、Colima 或其他 OCI 运行时 |
| 安装时出现 Python 版本错误 | 使用了 3.9 或 3.15 | 切换到 Python 3.10–3.14 |
| 图谱构建速度慢 | 文档大、embedding 模型慢 | 调小 chunk size、使用本地 fastembed、异步批量处理 |
| 向量检索结果不准确 | embedding 模型与任务不匹配 | 在配置中切换 embedding provider 或微调模型 |
| 多用户场景数据混淆 | 未启用租户隔离 | 查看用户/权限模块配置，启用 dataset/tenant 隔离 |

## 六、总结

Cognee 把“长期记忆”从 Prompt 工程里抽离出来，变成了一套可自托管、可演进、可观测的知识基础设施。它不只是给 LLM 加个向量库，而是让 Agent 真正把数据“记住”并能跨会话、跨文档、跨 Agent 地关联和利用。如果你的项目需要构建“企业大脑”或“个人知识助理”，Cognee 值得作为底层记忆层优先考虑。
