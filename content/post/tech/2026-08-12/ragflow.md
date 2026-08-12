---
title: "RAGFlow：一个融合深度文档理解的开源 RAG 引擎"
date: 2026-08-12
description: "RAGFlow 是由 Infiniflow 团队开源的检索增强生成（RAG）引擎，通过深度文档理解与 Agent 能力融合，为大模型提供高质量的上下文层，支持无限 token 的精准检索。"
author: "Cheman"
slug: ragflow
draft: false
categories: ["技术", "开源"]
tags: ["RAG", "LLM", "开源", "Infiniflow", "RAGFlow", "Agent"]
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

今天在 GitHub Trending 上看到一个炙手可热的项目：**RAGFlow**，来自专注于向量检索与 RAG 基础设施的 Infiniflow 团队。RAGFlow 将深度文档理解与 Agent 能力相融合，主打"Quality in, quality out"理念——高质量文档理解带来高质量的 RAG 输出，GitHub Star 数已突破数万，是当前开源 RAG 领域的标杆项目。

## 一、项目概述

RAGFlow 的定位是一个**生产级 RAG（Retrieval-Augmented Generation）引擎**，核心目标是解决传统 RAG 方案中"garbage in, garbage out"的痛点。传统方案往往对文档做简单的规则分块（chunking），导致语义割裂和检索精度下降；RAGFlow 则通过深度文档理解（Deep Document Understanding）引擎，将非结构化文档的结构、标题层级、表格、图表等语义信息全部识别并保留下来。

### 核心特性一览

- **深度文档理解**：基于深度学习模型对 PDF、Word、Excel、图片、扫描件等复杂格式文档进行语义解析，识别标题层级、表格结构、图表内容，避免简单规则分块带来的信息损失。
- **Template-based Chunking（模板化分块）**：提供丰富的文档解析模板（论文、合同、手册、书籍等），分块过程可解释、可干预。
- **Grounded Citations（可溯源引用）**：生成答案时直接引用原文 chunk，降低幻觉风险，并提供可视化引用链路。
- **无限 Token 检索**：借助向量检索 + 重排序（rerank）技术，在海量文档中实现"大海捞针"式精准召回。
- **多数据源兼容**：原生支持 Word、Excel、PPT、PDF、TXT、图片、扫描件、结构化数据、网页等多种格式，以及 Confluence、S3、Notion、Discord、Google Drive 等外部数据源同步。
- **多 LLM + 多 Embedding**：支持 OpenAI GPT-5、DeepSeek v4、Gemini 3 Pro、Cohere、Mistral 等主流大模型，可自由切换 embedding 模型。
- **Agentic RAG 与 MCP 支持**：支持 MCP（Model Context Protocol）协议，可编排 Agent 工作流，实现复杂的多跳推理。

## 二、技术原理

### 2.1 系统架构

RAGFlow 的整体架构分为四大层次：

```
┌─────────────────────────────────────────────────────┐
│                  Web UI (React)                      │
├─────────────────────────────────────────────────────┤
│         Backend API Server (Go / Gin)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│  │  DeepDoc    │ │    RAG     │ │   Agent     │     │
│  │ (文档解析)  │ │ (检索召回)  │ │ (工作流编排) │     │
│  └─────────────┘ └─────────────┘ └─────────────┘     │
├─────────────────────────────────────────────────────┤
│  Elasticsearch / Infinity (全文+向量存储)              │
│  MySQL (元数据) │ MinIO (文件存储) │ Redis (缓存)     │
└─────────────────────────────────────────────────────┘
```

### 2.2 DeepDoc 深度文档理解

DeepDoc 是 RAGFlow 的核心文档解析模块，基于视觉语言模型（VLM）对 PDF 和图片进行版面分析（Layout Analysis），输出文档的语义结构树：

```python
# DeepDoc 解析后的文档结构（简化示意）
{
    "type": "document",
    "children": [
        {"type": "title", "level": 1, "text": "第一章 RAG 原理"},
        {"type": "paragraph", "text": "RAG 是..."},
        {"type": "table", "rows": [...], "header": [...]},
        {"type": "image", "caption": "架构图"},
    ]
}
```

这套结构树直接驱动后续的语义分块——不再依赖固定字符数的滑动窗口，而是按语义单元切分，最大限度保留文档的内在逻辑。

### 2.3 检索召回流程

RAGFlow 的检索链路为**多路召回 + 融合排序**：

1. **Query Processing**：用户问题经过意图识别、关键词抽取、扩展后，同时进入多个检索通道。
2. **Vector Retrieval**：基于 embedding 模型将 query 和文档 chunk 向量化，在 Elasticsearch/Infinity 中做 ANN 近似最近邻检索。
3. **Keyword Retrieval**：BM25 等稀疏检索补充精确关键词匹配。
4. **Reranking**：使用交叉编码器（cross-encoder）对候选 chunk 做精细重排序，取 Top-K 送入 LLM。
5. **Grounded Generation**：LLM 在生成答案时同时引用 reranked chunk，输出带 citation 的结果。

### 2.4 Agentic RAG 工作流

RAGFlow 支持通过可视化界面编排 Agent 工作流，每个节点可以是：

- **检索节点**：配置检索策略（向量/关键词/混合）
- **LLM 节点**：选择模型、提示词模板
- **代码执行节点**：Python/JavaScript sandbox 执行
- **MCP 节点**：调用外部 MCP 工具（如 Web Search、Database Query）

```python
# RAGFlow Agent 工作流编排示例（简化）
workflow = {
    "nodes": [
        {"id": "retrieve", "type": "retrieval", "config": {"top_k": 10}},
        {"id": "rewrite",  "type": "llm",       "config": {"model": "gpt-5", "prompt": "rewrite query"}},
        {"id": "answer",   "type": "llm",       "config": {"model": "deepseek-v4", "prompt": "answer with citations"}},
    ],
    "edges": [
        {"from": "retrieve", "to": "answer"},
        {"from": "rewrite",  "to": "retrieve"},
    ]
}
```

### 2.5 依赖技术栈

从 `pyproject.toml` 可以看到 RAGFlow 依赖极为丰富：

| 模块 | 技术选型 | 作用 |
|------|----------|------|
| Web | React + TypeScript | 前端界面 |
| API | Go + Gin | 高性能 REST/gRPC API |
| 文档解析 | DeepDoc (自研) | 深度文档理解 |
| 向量检索 | Elasticsearch / Infinity | ANN 向量搜索 |
| 对象存储 | MinIO | 文件存储 |
| Python SDK | ragflow_sdk | Python API 调用 |

核心 Python 依赖涵盖：全文检索（Elasticsearch-DSL、OpenSearch）、向量 embedding（VoyageAI、Cohere）、大模型调用（litellm、anthropic、google-genai）、代码执行（gVisor sandbox）、RAG 框架（LangGraph、LangChain）。

## 三、安装与快速开始

### 环境要求

- CPU ≥ 4 核，RAM ≥ 16 GB，Disk ≥ 50 GB
- Docker ≥ 24.0.0，Docker Compose ≥ v2.26.1
- Python ≥ 3.13
- gVisor（仅使用代码执行沙箱功能时需要）

### Docker 一键部署

```bash
# 克隆代码
git clone https://github.com/infiniflow/ragflow.git
cd ragflow/docker

# 切换到最新稳定版
git checkout v0.26.4

# CPU 模式启动（DeepDoc 使用 CPU 加速）
docker compose -f docker-compose.yml up -d

# GPU 模式（如需加速 DeepDoc）
# sed -i '1i DEVICE=gpu' .env
# docker compose -f docker-compose.yml up -d
```

启动后检查容器状态：

```bash
docker logs -f docker-ragflow-cpu-1
```

看到以下输出表示启动成功：

```
      ____   ___    ______ ______ __
     / __ \ /   |  / ____// ____// /____  _      __
    / /_/ // /| | / / __ / /_   / // __ \| | /| / /
   / _, _// ___ |/ /_/ // __/  / // /_/ /| |/ |/ /
  /_/ |_|/_/  |_|\____//_/    /_/ \____/ |__/|__/

   * Running on all addresses (0.0.0.0)
```

然后访问 `http://<服务器IP>`（默认端口 80）即可打开 RAGFlow Web 界面。

### 配置 LLM API Key

在 `docker/service_conf.yaml.template` 中选择 LLM 厂商并填入 API Key：

```yaml
user_default_llm: openai   # 或 deepseek / gemini / cohere
```

## 四、使用方法与实战

### 4.1 创建知识库

1. 登录后点击 **Knowledge Base** → **Create**。
2. 上传文档（支持 PDF、DOCX、XLSX、图片等），RAGFlow 自动调用 DeepDoc 解析文档结构。
3. 选择 **Chunking Template**（如"论文""合同""通用文档"），或自定义分块策略。
4. 配置 **Embedding Model**（如 voyage-3）和 **LLM**。
5. 点击 **Confirm & Process**，等待解析完成。

### 4.2 发起问答

1. 在 **Chat** 页面创建新对话，关联已构建的知识库。
2. 输入问题，RAGFlow 自动完成多路检索 → 重排序 → LLM 生成。
3. 答案右侧展示 **Grounded Citations**，点击可直接跳转到原文 chunk。

### 4.3 构建 Agent 工作流

对于复杂场景（如"先检索，再推理，再检索"的多跳问题）：

1. 进入 **Agent** → **Create**。
2. 在画布上拖拽节点，连接检索、LLM、代码执行等模块。
3. 配置节点参数（如 top_k、temperature、prompt template）。
4. 保存并测试，查看中间步骤的检索结果。

### 4.4 切换文档引擎

默认使用 Elasticsearch，如需更高性能可切换到 Infiniflow 自研的 **Infinity** 向量数据库：

```bash
# 编辑 docker/.env
DOC_ENGINE=infinity

# 重启容器
docker compose -f docker-compose.yml down -v
docker compose -f docker-compose.yml up -d
```

## 五、常见问题与解决方案

**Q1：Docker 启动后浏览器提示"network abnormal"？**

这是因为 RAGFlow 尚未完成初始化即被访问。务必执行 `docker logs -f docker-ragflow-cpu-1` 确认出现 `* Running on all addresses` 后再登录，或等待约 2~3 分钟初始化完成。

**Q2：上传文档后解析失败或解析质量差？**

- 检查文档是否为扫描件（无文字层），建议先通过 OCR 处理或使用 RAGFlow 内置的图片理解能力。
- 确认 DeepDoc 服务（`docker-ragflow-cpu-1`）正常运行，未报 OOM 错误——建议分配至少 8 GB 内存给该容器。

**Q3：检索结果不准确，答非所问？**

- 调整 **Retrieval Settings** 中的 top_k（增加候选数量）和 similarity_threshold（降低阈值）。
- 尝试开启 **Query Rewrite**，让 LLM 先将用户问题改写为更适合检索的形式。
- 检查 embedding 模型选择——某些垂直领域（如法律、医疗）建议使用领域适配的 embedding 模型。

**Q4：如何切换 Infinity 向量数据库以提升检索性能？**

参见上方"切换文档引擎"一节。注意切换时会清空现有数据（`-v` 参数），务必提前备份。

**Q5：ARM64 平台（如 M1/M2 Mac）无法拉取 Docker 镜像？**

所有 Docker 镜像均为 x86 平台构建。ARM64 用户需参考 [官方构建指南](https://ragflow.io/docs/dev/build_docker_image) 从源码构建镜像。

## 六、总结

RAGFlow 最大的创新在于将**深度文档理解**作为 RAG 流水线的入口，把"garbage in, garbage out"从源头堵住。相比单纯优化检索算法的方案，它在文档解析层就建立了语义结构认知，再配合 Agent 工作流编排和多路召回重排序，实现了从文档到高质量答案的端到端优化。对于企业级知识库、合同分析、学术文献问答等场景，RAGFlow 提供了开箱即用且高度可定制的解决方案。

⭐ 如果觉得有帮助，欢迎 Star 支持：[https://github.com/infiniflow/ragflow](https://github.com/infiniflow/ragflow)
