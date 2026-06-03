---
title: "Production Agentic RAG Course：从零构建生产级 RAG 系统的完整实战课程"
date: 2026-06-03
description: "一个从基础到高级的 RAG 系统实战课程，涵盖基础设施搭建、数据管道、关键词搜索、混合检索、LLM 集成、生产监控到智能体 RAG 的完整技术栈，采用 '先关键词后向量' 的专业路径，教你像大厂一样构建生产级 RAG 系统。"
author: "Cheman"
slug: production-agentic-rag-course
draft: false
categories: ["技术", "开源", "AI"]
tags: ["RAG", "LangGraph", "OpenSearch", "FastAPI", "LLM", "AI", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Production Agentic RAG Course**，这是一个从零开始构建生产级 RAG 系统的完整实战课程，采用"先关键词后向量"的专业路径，教你像大厂一样构建真正可用的 RAG 系统。

## 一、项目概述

Production Agentic RAG Course 是一个面向 AI/ML 工程师和软件开发者的实战课程，通过构建一个 **arXiv 论文研究助手** 项目，系统性地教授生产级 RAG 系统的完整技术栈。课程分为 7 周，从基础设施搭建到智能体 RAG，层层递进：

**核心特性：**
- 🏗️ **完整基础设施**：Docker Compose 编排 FastAPI、PostgreSQL、OpenSearch、Airflow、Ollama 等服务
- 📊 **数据管道自动化**：arXiv API 集成 + PDF 解析 + Airflow 工作流编排
- 🔍 **专业搜索路径**：BM25 关键词搜索 → 向量嵌入 → 混合检索（RRF 融合）
- 🤖 **完整 RAG 流程**：本地 LLM + 流式响应 + Gradio 界面
- 📈 **生产级监控**：Langfuse 追踪 + Redis 缓存（150-400x 性能提升）
- 🧠 **智能体 RAG**：LangGraph 工作流 + 文档评分 + 查询重写 + Telegram Bot

## 二、技术原理

### 架构设计

项目采用分层架构设计，从底层数据存储到上层智能体推理，构建了完整的技术栈：

```
┌─────────────────────────────────────────────────────┐
│              Week 7: Agentic RAG Layer              │
│    LangGraph 工作流 + 决策节点 + Telegram Bot       │
├─────────────────────────────────────────────────────┤
│              Week 6: Production Layer               │
│         Langfuse 追踪 + Redis 缓存优化              │
├─────────────────────────────────────────────────────┤
│              Week 5: LLM Integration Layer          │
│        Ollama 本地 LLM + 流式响应 + Gradio UI       │
├─────────────────────────────────────────────────────┤
│           Week 4: Hybrid Search Layer               │
│       智能分块 + Jina 嵌入 + RRF 混合检索           │
├─────────────────────────────────────────────────────┤
│          Week 3: Keyword Search Foundation          │
│          BM25 算法 + OpenSearch 索引管理            │
├─────────────────────────────────────────────────────┤
│            Week 2: Data Pipeline Layer              │
│      arXiv API + Docling PDF 解析 + Airflow DAG     │
├─────────────────────────────────────────────────────┤
│           Week 1: Infrastructure Layer              │
│   Docker + FastAPI + PostgreSQL + OpenSearch        │
└─────────────────────────────────────────────────────┘
```

### 核心技术栈与选型理由

**1. OpenSearch 作为搜索引擎**
```python
# src/services/opensearch/ - BM25 关键词搜索 + 向量检索
# 选型理由：开源、支持混合搜索、自带 Dashboard 可视化
```

**2. LangGraph 智能体编排**
```python
# src/services/agents/agentic_rag.py - 状态机工作流
# 核心节点：Guardrail → Retrieve → Grade → Rewrite → Generate
# 选型理由：显式状态管理、易于调试、支持复杂决策逻辑
```

**3. Docling 科学文档解析**
```python
# PDF 解析服务，专为学术论文优化
# 支持表格、公式、引用等复杂结构提取
```

**4. RRF (Reciprocal Rank Fusion) 混合检索**
```python
# 融合 BM25 和向量搜索结果
# RRF 公式：score = Σ 1/(k + rank_i)，k 通常为 60
```

### 关键设计模式

**智能体决策流程（Week 7）：**

```python
# LangGraph 工作流示例
def decide_to_generate(state):
    """
    决策节点：根据文档相关性决定下一步
    - 相关文档足够 → 生成回答
    - 相关文档不足 → 重写查询再次检索
    - 查询超出领域 → 返回默认回复
    """
    if state["domain_out_of_scope"]:
        return "fallback"
    elif state["relevant_doc_count"] >= threshold:
        return "generate"
    else:
        return "rewrite_query"
```

**缓存策略（Week 6）：**

```python
# Redis 缓存层
# 精确匹配缓存键 = query_hash + search_params_hash
# TTL 智能管理：热点查询长缓存，冷门查询短缓存
# 性能提升：150-400x（重复查询场景）
```

### 数据流分析

```
用户查询
    ↓
[Guardrail 节点] → 领域检测（防止幻觉）
    ↓
[Retrieve 节点] → OpenSearch 混合检索
    ↓
[Grade 节点] → 语义相关性评分
    ↓ (不足)
[Rewrite 节点] → 查询重写优化
    ↓ (足够)
[Generate 节点] → Ollama LLM 生成
    ↓
返回答案 + 推理过程追踪
```

## 三、安装与快速开始

### 环境要求

- **Docker Desktop**（含 Docker Compose）
- **Python 3.12+**
- **UV 包管理器**（[安装指南](https://docs.astral.sh/uv/getting-started/installation/)）
- **8GB+ RAM** 和 **20GB+ 可用磁盘空间**

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/jamwithai/production-agentic-rag-course
cd production-agentic-rag-course

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加必要的 API Key：
# - JINA_API_KEY（Week 4+ 必需，用于嵌入生成）
# - TELEGRAM_BOT_TOKEN（Week 7 可选，Telegram Bot 集成）
# - LANGFUSE_PUBLIC_KEY & SECRET_KEY（Week 6 可选，监控追踪）

# 3. 安装 Python 依赖
uv sync

# 4. 启动所有服务（首次启动约需 3-5 分钟）
docker compose up --build -d

# 5. 验证服务状态
curl http://localhost:8000/api/v1/health
```

### 服务端口映射

| 服务 | 端口 | 访问地址 | 用途 |
|------|------|----------|------|
| FastAPI | 8000 | http://localhost:8000/docs | API 文档与测试 |
| Gradio UI | 7861 | http://localhost:7861 | RAG 对话界面 |
| Langfuse | 3000 | http://localhost:3000 | 追踪监控 Dashboard |
| Airflow | 8080 | http://localhost:8080 | 工作流管理 |
| OpenSearch | 5601 | http://localhost:5601 | 搜索引擎 Dashboard |

## 四、使用方法与实战

### 基础用法：关键词搜索（Week 3）

```bash
# 使用 BM25 算法搜索论文
curl -X POST http://localhost:8000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning transformer",
    "size": 10,
    "filters": {
      "year": "2024"
    }
  }'
```

### 进阶用法：混合检索 RAG（Week 4-5）

```python
# 通过 Gradio 界面与 RAG 系统交互
# 1. 启动 Gradio
uv run python gradio_launcher.py

# 2. 访问 http://localhost:7861
# 3. 输入研究问题，例如："What are the latest advances in RAG systems?"
# 4. 系统会自动：
#    - 混合检索相关论文片段（BM25 + 向量）
#    - 使用本地 LLM 生成答案
#    - 流式输出，实时显示思考过程
```

### 智能体 RAG（Week 7）

```python
# Agentic RAG API 调用
curl -X POST http://localhost:8000/api/v1/agentic-ask \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare the performance of different RAG architectures",
    "enable_reasoning_trace": true
  }'

# 响应包含：
# - 最终答案
# - 推理过程追踪（决策节点、文档评分、查询重写历史）
# - 检索的文档片段及相关性评分
```

### Telegram Bot 集成

```bash
# 配置 Telegram Bot
# 1. 在 .env 中设置 TELEGRAM_BOT_TOKEN
# 2. 重启服务
docker compose restart

# 3. 在 Telegram 中搜索你的 Bot，发送消息即可与 RAG 系统对话
# 支持移动端访问，随时随地查询学术资料
```

## 五、常见问题与解决方案

### 安装失败

**问题：Docker 服务启动超时**
```bash
# 解决方案：检查资源分配
# Docker Desktop → Settings → Resources
# 建议配置：Memory 8GB+, CPUs 4+

# 完全重置
docker compose down -v  # 删除卷
docker compose up --build -d
```

**问题：Python 依赖安装失败**
```bash
# 使用 UV 的锁定文件确保一致性
uv sync --frozen

# 如果仍有问题，清理缓存
uv cache clean
uv sync
```

### 运行时错误

**问题：OpenSearch 连接被拒绝**
```bash
# 检查 OpenSearch 健康状态
curl http://localhost:9200/_cluster/health

# 如果无响应，查看日志
docker compose logs opensearch

# 常见原因：内存不足或端口冲突
# 确保端口 9200、5601 未被占用
lsof -i :9200
```

**问题：Ollama 模型下载慢**
```bash
# 预先拉取模型
ollama pull llama3.2

# 或修改 .env 使用更小的模型
OLLAMA_MODEL=llama3.2:1b
```

### 性能问题

**问题：首次查询响应慢**
```bash
# 这是正常现象，原因：
# 1. OpenSearch 索引预热
# 2. 模型加载到内存
# 3. JIT 编译优化

# 后续查询会显著加快
# 启用 Redis 缓存后，重复查询可达 150-400x 加速
```

**问题：内存占用过高**
```bash
# 限制 Docker 容器内存
# 在 docker-compose.yml 中添加：
services:
  ollama:
    deploy:
      resources:
        limits:
          memory: 4G
```

### 兼容性

**问题：Mac M1/M2 芯片兼容性**
```bash
# 确保 Docker Desktop 使用 arm64 架构
# 检查平台
docker compose config | grep platform

# 应显示：platform: linux/arm64
```

**问题：Windows WSL2 环境配置**
```bash
# 确保 WSL2 已正确安装 Docker Desktop
# 在 PowerShell 中验证：
wsl --list --verbose
# 应显示 Docker Desktop 相关发行版

# 网络问题：确保防火墙允许 Docker 端口
```

## 六、总结

Production Agentic RAG Course 是目前最全面的 RAG 系统实战课程之一，其核心价值在于：

**1. 专业路径设计**：遵循"先关键词后向量"的工业界最佳实践，而非大多数教程的"AI-first"误导路径。这种设计让你理解搜索的本质——关键词搜索是基础，向量搜索是增强。

**2. 完整技术栈覆盖**：从基础设施（Docker、FastAPI、PostgreSQL）到数据管道（Airflow、Docling），从搜索技术（OpenSearch、BM25、RRF）到智能体（LangGraph），每一步都有实战代码和详细文档。

**3. 生产级关注点**：课程不仅教你"如何工作"，更关注"如何在生产环境工作"——监控追踪（Langfuse）、性能优化（Redis 缓存）、错误处理、成本控制，这些都是企业级应用的必备能力。

**4. 智能体前沿探索**：Week 7 的 Agentic RAG 设计展示了 RAG 系统的未来方向——让系统具备推理、决策、自适应能力，而不仅仅是检索+生成的简单拼接。

**适合人群**：
- AI/ML 工程师：学习生产级 RAG 架构，超越玩具项目
- 软件工程师：构建端到端 AI 应用，掌握最佳实践
- 数据科学家：将 ML 模型落地为生产系统

项目采用 MIT 协议开源，所有代码、博客文章、Jupyter Notebook 均可免费使用。如果你正在寻找一个从零到生产的 RAG 系统学习路径，这个项目是目前最好的选择之一。

**GitHub 地址**：https://github.com/jamwithai/production-agentic-rag-course
