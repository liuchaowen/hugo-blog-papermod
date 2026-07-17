---
title: "EverOS：让 AI 代理拥有持久化记忆的开源框架"
date: 2026-07-17
description: "EverOS 是一个 Python 库和本地优先的 AI 记忆运行时，它以人类可读的 Markdown 文件为核心存储层，配合 SQLite 和 LanceDB 实现快速检索，赋予 AI 编码助手、App 和工作流跨越会话的持久记忆能力。"
author: "Cheman"
slug: everos
draft: false
categories: [AI, 开源, 技术]
tags: [AI Agent, 记忆系统, Python, 开源, LanceDB]
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

今天在 GitHub Trending 上看到一个有意思的项目：**EverOS**，一个为 AI 代理和开发者设计的本地优先记忆运行时——让你的 AI 工具从"每次都是陌生人"变成"永远记得你的老朋友"。

## 一、项目概述

EverOS 是由 EverMind AI 团队开源的 Python 库（v1.1.2，Apache-2.0 许可证），核心理念是：**用人类可读的 Markdown 文件作为记忆的权威来源**，再通过 SQLite 和 LanceDB 构建本地索引，实现高速检索与自我进化。

它解决了一个痛点：大多数 AI Agent 框架的记忆系统要么是黑盒数据库，要么是向量数据库里的 embeddings，出了问题你根本不知道记忆长什么样。EverOS 反其道而行——记忆就是 `.md` 文件，**你可以直接打开、编辑、对比**，Git 版本化管理也天然支持。

核心优势对比：

| 特性 | EverOS | 其他记忆库 |
|------|--------|-----------|
| 存储格式 | 人类可读的 `.md` 文件，可直接编辑 | 通常是 API、向量、图数据库状态 |
| 文件编辑 | 修改 `.md`，级联监听器自动同步 | 通常需要 SDK、API 或后端更新 |
| 本地依赖 | Markdown + SQLite + LanceDB，无需 MongoDB/ES/Redis | 通常依赖托管服务、向量库或服务器 |
| 追踪维度 | 用户轨迹 + 代理轨迹分离 | 通常围绕聊天历史、实体或检索记录 |
| 检索维度 | 支持 user_id / agent_id / app_id / project_id / session_id 正交检索 | 通常是 app/namespace/tenant 级别 |

## 二、技术原理与架构

EverOS 的架构由三层组成，各司其职：

### 2.1 存储层：Markdown 为核心

```
~/.everos/
├── episodes/       # 用户会话片段
│   └── {user_id}/{session_id}/
│       ├── YYYY-MM-DD-HHMMSS.md
│       └── ...
├── profile/        # 用户画像
│   └── {user_id}/
│       └── profile.md
├── cases/         # 代理案例
├── skills/        # 代理技能
└── wiki/          # 可编辑的知识库
```

每次向 `/api/v1/memory/add` 提交消息，EverOS 会：
1. **提取（Extraction）**：用 LLM 分析对话，抽取关键事实和意图
2. **写入（Write）**：生成结构化 Markdown 文件，同步写入 `~/.everos`
3. **索引（Index）**：后台更新 SQLite（标量过滤）和 LanceDB（向量 + BM25 混合检索）

### 2.2 检索层：LanceDB + SQLite 混合

```python
# 从 pyproject.toml 看依赖
"lancedb>=0.13.0",          # 向量 + BM25 + 标量过滤（Arrow 驱动）
"aiosqlite>=0.20.0",        # 异步 SQLite 驱动
"sqlmodel>=0.0.22",         # ORM（Pydantic + SQLAlchemy 2.0）
```

LanceDB 支持本地向量检索，无需任何外部服务。BM25 则由 jieba 提供中文分词能力。两者结合保证了语义相似度和关键词精确度的平衡。

### 2.3 反射机制（OME：Offline Memory Evolution）

EverOS 还有一个独特功能——离线记忆进化。间隔运行的后台任务会：
- 合并相似会话片段（episode clustering）
- 细化用户画像（profile refinement）
- 迭代代理技能（skill evolution）

这使得记忆系统不只是被动存储，还会主动整理和提升。

### 2.4 API 兼容性

FastAPI 驱动的服务端完全兼容 OpenAI 协议：

```python
# EverOS 端点（来自 README）
POST /api/v1/memory/add      # 添加记忆
POST /api/v1/memory/flush    # 强制触发提取
POST /api/v1/memory/search   # 语义检索
```

支持 OpenRouter / vLLM / Ollama / DeepInfra 等 OpenAI 兼容后端，通过 `.env` 配置即可切换。

## 三、安装与快速开始

### 环境要求

- Python 3.12+
- API 密钥（可选，`everos demo` 演示模式无需密钥）

### 安装

```bash
uv pip install everos
# 或：pip install everos
```

### 体验演示（无需 API 密钥）

```bash
everos demo
```

这个命令会打开一个全屏 TUI（终端 UI），用动画展示"记忆球"从对话 → 记忆 → 检索 → 来源证明 → 彩屑的全流程。

### 完整使用流程

```bash
# 1. 初始化配置
everos init

# 2. 启动服务器
everos server start

# 3. 健康检查
curl http://127.0.0.1:8000/health
# → {"status":"ok"}

# 4. 添加一段记忆
TS=$(($(date +%s)*1000))
curl -X POST http://127.0.0.1:8000/api/v1/memory/add \
  -H 'Content-Type: application/json' \
  -d "{
    \"session_id\": \"demo-001\",
    \"app_id\": \"default\",
    \"project_id\": \"default\",
    \"messages\": [
      {\"sender_id\": \"alice\", \"role\": \"user\", \"timestamp\": $TS, \"content\": \"我喜欢在春天去优胜美地攀岩。\"}
    ]
  }"

# 5. 搜索记忆
curl -X POST http://127.0.0.1:8000/api/v1/memory/search \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "alice", "app_id": "default", "project_id": "default", "query": "我喜欢在哪里攀岩？", "top_k": 5}'
```

### 开发者模式

```bash
git clone https://github.com/EverMind-AI/EverOS.git
cd EverOS
uv sync
source .venv/bin/activate
everos demo --plain
make test
```

## 四、使用场景与生态集成

EverOS 不仅仅是个人记忆工具，它已形成一个完整的生态系统：

- **Reunite**：用 EverOS 连接走失儿童的记忆
- **Hive Orchestrator**：浏览器原生的多 Agent 协作框架
- **EverMem MCP**：AI 编码助手的通用长期记忆层（支持 Claude Code、Codex 等）
- **MemoCare**：阿尔茨海默症记忆辅助
- **Rokid 智能眼镜**：连接现实设备的持久记忆

在工具层面，EverOS 还提供了：
- Claude Code 插件（自动保存和检索历史上下文）
- Live2D 角色 + 记忆（TEN Framework 集成）
- 记忆图谱可视化（Web 端演示）

## 五、常见问题

**Q: 需要配置哪些 API 密钥？**
A: 完整功能需要 OpenRouter（LLM）和 DeepInfra（Embedding/Rerank）密钥。但 `everos demo` 演示模式无需任何密钥即可体验。

**Q: 是否支持中文？**
A: 支持。BM25 检索层内置 jieba 中文分词，Markdown 文件本身无语言限制。

**Q: 数据存储在哪里？**
A: 本地 `~/.everos/` 目录，无云端依赖。LanceDB 和 SQLite 索引也在本地。

**Q: 与 LangChain Memory 的区别是什么？**
A: LangChain Memory 通常基于向量存储，EverOS 以 Markdown 为事实来源、可直接阅读编辑，更适合需要透明性和 Git 版本化的场景。

## 六、总结

EverOS 是一个设计思路非常清晰的项目——**记忆的本质是信息，信息应该以人类可读的格式存储**。在这个基础上再构建向量检索和离线进化，兼顾了可用性和深度。

如果你正在构建 AI 编码助手、多 Agent 系统、或者任何需要跨会话记忆的应用，EverOS 值得一试。轻量、本地优先、Markdown 优先的设计理念，让它既易于集成，又足够透明。

GitHub：[EverMind-AI/EverOS](https://github.com/EverMind-AI/EverOS)  
官网：[evermind.ai](https://evermind.ai)