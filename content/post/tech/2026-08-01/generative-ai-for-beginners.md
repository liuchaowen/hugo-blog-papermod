---
title: "微软 Generative AI for Beginners：用 21 节课带你从零入门生成式 AI 开发"
date: "2026-08-01"
description: "微软官方推出的 Generative AI for Beginners 开源课程，21 节系统性课程覆盖 LLM 基础、提示工程、RAG、Agent 开发等核心主题，配有 Python/TypeScript 双语言示例代码，适合想快速上手生成式 AI 开发的工程师。"
author: "Cheman"
slug: generative-ai-for-beginners
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "Generative AI", "大模型", "Microsoft"]
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

今天在 GitHub Trending 上看到一个重磅项目：**microsoft/generative-ai-for-beginners**，这是微软官方出品的一套完整的生成式 AI 开发课程，共 21 节，涵盖从 LLM 基础到 RAG、Agent、模型微调等几乎所有核心主题，配套 Python 和 TypeScript 双语言实战代码，非常适合想系统入门生成式 AI 的工程师。

## 一、项目概述

该项目是微软云倡导者（Cloud Advocates）团队维护的一套系统性课程，目标是让零基础学员在完成全部课程后，具备独立构建生成式 AI 应用的能力。课程经过多次迭代，当前为 **Version 3**，支持 50+ 语言翻译，包括中文简繁体。

**核心特点：**

- **21 节系统课程**：每节课独立成篇，包含视频讲解、图文教程和实战代码
- **双语言支持**：Python + TypeScript 代码示例，覆盖 Azure OpenAI、OpenAI API、Microsoft Foundry Models、Foundry Local 等多种接入方式
- **零门槛入门**：提供完整的 [Course Setup 课程](https://github.com/microsoft/generative-ai-for-beginners/tree/main/00-course-setup)，手把手指导环境配置
- **多端兼容**：代码可在云端 API 和本地离线运行，Foundry Local 支持完全离线部署

## 二、课程体系详解

课程分为 **Learn**（理论讲解）和 **Build**（动手实战）两大类，以下是完整课程地图：

| 阶段 | 课程 | 主题 | 类型 |
|------|------|------|------|
| 基础 | 00 | 开发环境配置 | Setup |
| 基础 | 01 | 生成式 AI 与 LLM 入门 | Learn |
| 基础 | 02 | 主流 LLM 对比与选型 | Learn |
| 基础 | 03 | 负责任地使用生成式 AI | Learn |
| 进阶 | 04 | 提示工程基础 | Learn |
| 进阶 | 05 | 高级提示工程技巧 | Learn |
| 实战 | 06 | 文本生成应用开发 | Build |
| 实战 | 07 | 聊天应用开发 | Build |
| 实战 | 08 | 向量数据库与搜索应用 | Build |
| 实战 | 09 | 图像生成应用 | Build |
| 实战 | 10 | 低代码 AI 应用 | Build |
| 进阶 | 11 | Function Calling 集成 | Build |
| 设计 | 12 | AI 应用 UX 设计原则 | Learn |
| 安全 | 13 | AI 应用安全防护 | Learn |
| 工程 | 14 | LLM 全生命周期与 LLMOps | Learn |
| RAG | 15 | RAG 与向量数据库实战 | Build |
| 开源 | 16 | Hugging Face 开源模型 | Build |
| Agent | 17 | AI Agent 框架开发 | Build |
| 微调 | 18 | LLM 微调技术详解 | Learn |
| SLM | 19 | 小语言模型（SLM）开发 | Learn |
| 商业 | 20 | Mistral 模型家族 | Learn |
| 商业 | 21 | Meta 模型家族 | Learn |

## 三、技术原理与核心概念

### 3.1 LLM 工作原理

课程从源头讲解大语言模型的核心机制：Transformer 架构、自注意力机制（Self-Attention）、Token 化与 Embedding。以第 2 课的 LLM 对比为例，课程对比了 GPT-4、Claude、Llama 等模型的特性，帮助开发者理解不同模型在上下文长度、推理能力、成本和合规性上的差异，从而做出正确的模型选型。

### 3.2 RAG 架构实战

第 15 课深入讲解了 RAG（检索增强生成）的完整实现路径：

```python
# RAG 核心流程（简化示例）
from openai import OpenAI
import faiss
import numpy as np

# 1. 文档向量化
client = OpenAI()
docs = load_documents("knowledge_base/")
embeddings = [client.embeddings.create(
    input=doc, model="text-embedding-3-small"
).data[0].embedding for doc in docs]

# 2. 构建 FAISS 索引
dimension = len(embeddings[0])
index = faiss.IndexFlatL2(dimension)
index.add(np.array(embeddings).astype('float32'))

# 3. 检索 + 生成
query_embedding = client.embeddings.create(
    input=query, model="text-embedding-3-small"
).data[0].embedding
_, indices = index.search(np.array([query_embedding]).astype('float32'), k=3)
context = "\n".join([docs[i] for i in indices[0]])
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": f"{context}\n\n问题: {query}"}]
)
```

### 3.3 AI Agent 框架

第 17 课介绍了 AI Agent 的构建范式，包括 ReAct（Reasoning + Acting）模式、多步骤任务规划、工具调用（Tool Use）等核心概念，配套代码展示如何用 LangChain 或 Microsoft AI Agents SDK 实现自主决策的 Agent。

## 四、安装与快速开始

### 环境要求

- Python 3.10+ 或 Node.js 18+
- GitHub 账号（用于 Fork 仓库）
- Azure OpenAI / OpenAI API 密钥（或 Microsoft Foundry Models 访问权限）

### 安装步骤

```bash
# 方式一：克隆完整仓库（含翻译，体积较大）
git clone https://github.com/microsoft/generative-ai-for-beginners.git
cd generative-ai-for-beginners

# 方式二：稀疏克隆（排除翻译，加速下载，推荐）
git clone --filter=blob:none --sparse https://github.com/microsoft/generative-ai-for-beginners.git
cd generative-ai-for-beginners
git sparse-checkout set --no-cone '/*' '!translations' '!translated_images'

# 安装 Python 依赖
pip install -r requirements.txt

# 安装 Node.js 依赖（如使用 TypeScript）
npm install
```

### 运行第一个示例

```bash
# 进入文本生成应用课程目录
cd 06-text-generation-apps

# 复制环境变量配置
cp .env.example .env
# 编辑 .env，填入你的 API 密钥
# AZURE_OPENAI_API_KEY=your-key-here

# 运行 Python 示例
python python/app.py
```

## 五、常见问题与解决方案

**Q: 克隆仓库下载太慢怎么办？**
使用稀疏克隆（sparse checkout）排除 50+ 语言翻译文件，可将下载体积从数 GB 压缩到几十 MB，详见项目 README 中的命令。

**Q: Azure OpenAI 和 OpenAI API 都有哪些课程支持？**
课程设计为双后端兼容，大部分 Build 类课程支持在 `AZURE_OPENAI_API_KEY` 和 `OPENAI_API_KEY` 之间二选一，只需在 `.env` 中配置对应密钥即可。

**Q: 没有云端 API 资源，能离线学习吗？**
可以。项目支持 [Foundry Local](https://foundrylocal.ai/)，可在本地设备完全离线运行模型，无需云订阅。但性能取决于本地硬件配置。

**Q: TypeScript 示例运行报错？**
确保 Node.js 版本 >= 18，并执行 `npm install` 安装依赖后运行。

## 六、总结

`microsoft/generative-ai-for-beginners` 是目前最系统、最权威的生成式 AI 免费课程之一。相比零散的文章和视频，它提供了完整的知识图谱：从 LLM 原理、提示工程，到 RAG、Agent、微调，覆盖了生成式 AI 应用开发的全链路技能。课程代码质量高，更新活跃（Version 3 刚发布），强烈推荐每一位想进入 AI 应用开发领域的工程师收藏学习。
