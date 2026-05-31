---
title: "Supermemory：让 AI 拥有持久记忆的上下文引擎"
date: 2026-06-01
description: "Supermemory 是一款专为 AI 设计的状态级记忆与上下文层，支持多框架集成、RAG + Memory 混合搜索，在 LongMemEval、LoCoMo、ConvoMem 三大权威基准上均取得第一名的成绩。"
author: "Cheman"
slug: supermemory
draft: false
categories: [技术, 开源]
tags: [AI, 开源, 记忆引擎, RAG, GitHub]
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

Supermemory 是一款专为大语言模型（LLM）设计的记忆与上下文层，它能够自动从对话中提取关键信息、构建用户画像、处理知识更新与冲突，并智能遗忘过期内容，从而让 AI 在多轮对话中持续保持对用户的深度理解。今天在 GitHub Trending 上看到这个项目，发现它已在 LongMemEval、LoCoMo、ConvoMem 三大权威 AI 记忆基准上均取得了第一名，且已支持 OpenClaw、Claude Code、Cursor 等主流 AI 客户端。

## 一、项目概述

### 1.1 什么是 Supermemory

Supermemory 是 AI 的"记忆与上下文层"，它解决的核心痛点是：**AI 在每次新对话中都会遗忘之前的所有信息**。传统方案依赖 RAG（检索增强生成），但 RAG 检索的是文档块——无状态的、对所有人雷同的内容，无法捕捉用户个性化的偏好、正在进行的项目或历史讨论。

Supermemory 则从更深的层面构建记忆：
- 提取对话中的事实并持续追踪
- 理解知识的时序变化（例如"我刚搬到了旧金山"会覆盖"我住在纽约"）
- 自动遗忘过期信息（如"明天有考试"在日期过后自动失效）
- 构建用户画像（长期稳定的事实 + 最近动态上下文）

### 1.2 核心特性一览

| 特性 | 描述 |
|------|------|
| 🧠 **记忆引擎** | 从对话中自动提取事实，处理时序变化、矛盾和自动遗忘 |
| 👤 **用户画像** | 维护用户的稳定事实和动态上下文，一次调用约 50ms |
| 🔍 **混合搜索** | RAG + Memory 合二为一，知识库文档和个性化上下文同步检索 |
| 🔌 **连接器** | 支持 Google Drive、Gmail、Notion、OneDrive、GitHub，实时 Webhook 同步 |
| 📄 **多模态处理** | PDF、图片（OCR）、视频（转录）、代码（AST 感知分块）自动处理 |

### 1.3 基准测试表现

Supermemory 在三个主流 AI 记忆基准上均达到 SOTA：

| 基准 | 测试内容 | 结果 |
|------|----------|------|
| **LongMemEval** | 跨会话长期记忆与知识更新 | **81.6% — #1** |
| **LoCoMo** | 扩展对话中的事实回忆（单跳、多跳、时序、对抗） | **#1** |
| **ConvoMem** | 个性化与偏好学习 | **#1** |

同时项目方还开源了 **MemoryBench** 框架，用于对不同记忆解决方案进行标准化、可复现的基准对比。

## 二、技术原理

### 2.1 整体架构

Supermemory 的架构分为五层：

```
应用层 / AI 工具
        ↓
   Supermemory
        │
        ├── Memory Engine    提取事实、追踪更新、解决冲突、自动遗忘
        ├── User Profiles    静态事实 + 动态上下文，始终最新
        ├── Hybrid Search    RAG + Memory 一体化查询
        ├── Connectors       Google Drive / Gmail / Notion / GitHub 等实时同步
        └── File Processing  PDF、图片、视频、代码 → 可检索块
```

### 2.2 Memory 与 RAG 的区别

**Memory 不是 RAG。** RAG 检索的是文档块——无状态的、对所有人相同的结果。而 Supermemory 的 Memory 层追踪的是**关于用户的事实**，它理解"我刚搬到了旧金山"会覆盖"我住在纽约"，能够区分哪些是长期有效信息，哪些是临时上下文。

Supermemory 默认同时运行两者（混合模式），用户既能从知识库文档中检索，也能获得个性化的上下文记忆。

### 2.3 自动遗忘机制

Supermemory 内置智能遗忘策略：
- **时间过期**：临时事实（如"明天有考试"）在指定日期后自动失效
- **矛盾解决**：新信息自动覆盖旧信息（如搬家后更新地址）
- **噪声过滤**：无关对话内容不会被永久存储

### 2.4 技术栈

从 `package.json` 可以看出项目采用了现代化的技术选型：

- **运行时**：Node.js >= 20
- **包管理器**：Bun 1.3.6（Turborepo 单仓管理）
- **核心依赖**：
  - `ai` SDK（Vercel AI SDK 生态）
  - `drizzle-orm` + `postgres`（数据库层）
  - `hono`（轻量高性能 Web 框架）
  - `@anthropic-ai/sdk` / `@ai-sdk/openai` / `@ai-sdk/google` 等多模型支持
- **认证**：`better-auth`（现代化认证方案）
- **监控**：Sentry（错误追踪 + SourceMap 上传）

## 三、安装与快速开始

### 3.1 消费者用户：给你的 AI 加记忆（无需代码）

**方式一：通过 MCP（推荐）**

```bash
npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client claude --oauth=yes
```

将 `claude` 替换为你的客户端：`cursor`、`windsurf`、`vscode` 等。

**方式二：手动配置 MCP**

在 AI 客户端的 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp"
    }
  }
}
```

或使用 API Key：

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "Authorization": "Bearer sm_your_api_key_here"
      }
    }
  }
}
```

安装后，AI 自动获得以下工具能力：

| 工具 | 功能 |
|------|------|
| `memory` | 保存或遗忘信息，AI 在发现值得记忆的内容时自动调用 |
| `recall` | 按查询搜索记忆，返回相关记忆 + 用户画像摘要 |
| `context` | 在对话开始时注入完整用户画像（偏好、最近活动） |

### 3.2 开发者用户：通过 API 构建

**Node.js / Bun 环境**

```bash
npm install supermemory    # 或: bun add supermemory
```

```typescript
import Supermemory from "supermemory";

const client = new Supermemory();

// 存储对话内容
await client.add({
  content: "用户喜欢 TypeScript，偏爱函数式编程风格",
  containerTag: "user_123",
});

// 获取用户画像 + 相关记忆（一次调用）
const { profile, searchResults } = await client.profile({
  containerTag: "user_123",
  q: "用户偏好什么编程风格？",
});

// profile.static  → 长期事实：["喜欢 TypeScript", "偏爱函数式编程"]
// profile.dynamic → 最近动态：["正在做 API 集成"]
// searchResults   → 按相似度排序的相关记忆
```

**Python 环境**

```bash
pip install supermemory
```

```python
from supermemory import Supermemory

client = Supermemory()

client.add(
    content="用户喜欢 TypeScript，偏爱函数式编程风格",
    container_tag="user_123"
)

result = client.profile(container_tag="user_123", q="编程风格")
print(result.profile.static)   # 长期事实
print(result.profile.dynamic)  # 最近动态
```

### 3.3 OpenClaw 用户专属插件

Supermemory 官方为 OpenClaw 开发了专属插件，可在 [supermemoryai/openclaw-supermemory](https://github.com/supermemoryai/openclaw-supermemory) 获取源码，安装后 AI 助手自动拥有持久记忆能力。

## 四、使用方法与实战

### 4.1 混合搜索实战

Supermemory 的搜索默认是混合模式，同时检索 RAG 知识库和个人记忆：

```typescript
// 混合搜索（默认）— RAG + Memory 一次完成
const results = await client.search.memories({
  q: "如何部署？",
  containerTag: "user_123",
  searchMode: "hybrid",
});
// 返回：部署相关文档（RAG）+ 用户个人部署偏好（Memory）

// 仅搜索记忆
const results = await client.search.memories({
  q: "用户偏好",
  containerTag: "user_123",
  searchMode: "memories",
});
```

### 4.2 框架集成

Supermemory 提供了主流 AI 框架的集成工具，开箱即用：

```typescript
// Vercel AI SDK
import { withSupermemory } from "@supermemory/tools/ai-sdk";
const model = withSupermemory(openai("gpt-4o"), { 
  containerTag: "user_123", 
  customId: "conv-1" 
});

// Mastra
import { withSupermemory } from "@supermemory/tools/mastra";
const agent = new Agent(withSupermemory(config, "user-123", { mode: "full" }));
```

支持列表：Vercel AI SDK、LangChain、LangGraph、OpenAI Agents SDK、Mastra、Agno、Claude Memory Tool、n8n。

### 4.3 连接器配置

连接外部数据源，自动同步到知识库：

```typescript
await client.connectors.add({
  provider: "github",       // google-drive | gmail | notion | onedrive | github
  webhookUrl: "https://your-webhook-handler.com/sync",
});
```

配置完成后，外部数据（如 GitHub Issue、Notion 文档、Gmail 邮件）会自动被处理、分块和索引，无需手动操作。

### 4.4 用户画像注入系统提示词

传统方案需要手动维护用户信息，Supermemory 只需一次调用即可获取完整画像：

```typescript
const { profile } = await client.profile({ containerTag: "user_123" });

// profile.static  → ["某公司高级工程师", "偏好暗色模式", "使用 Vim"]
// profile.dynamic → ["正在做权限迁移", "调试限流问题"]

// 注入到系统提示词
const systemPrompt = `
当前用户：${profile.static.join(", ")}
最近动态：${profile.dynamic.join(", ")}
`;
```

## 五、常见问题

### Q1: 支持哪些 AI 客户端？

官方支持：Claude Desktop、Cursor、Windsurf、VS Code、Claude Code、OpenCode、OpenClaw、Hermes。MCP 服务器已开源，也可接入其他支持 MCP 的客户端。

### Q2: 是否需要配置向量数据库？

不需要。Supermemory 封装了完整的嵌入管道、分块策略和向量检索逻辑，开发者只需调用 API，无需关心底层基础设施。

### Q3: 数据隐私如何保障？

Supermemory 提供自托管方案，企业可将服务部署在自己的基础设施上，数据完全自主控制。消费版数据存储在 Supermemory 云端，但支持 API Key 认证和数据隔离。

### Q4: 与 Mem0、Zep 等同类方案相比有什么优势？

主要优势在于三点：
1. **端到端 SOTA 基准表现**：LongMemEval、LoCoMo、ConvoMem 三个基准全部第一
2. **Memory + RAG 一体化**：不需要分别部署两套系统
3. **零配置 API**：无需管理向量数据库、嵌入管道、分块策略

### Q5: 如何评估其他记忆方案与 Supermemory 的差距？

使用 MemoryBench 框架进行标准化对比：

```bash
bun run src/index.ts run -p supermemory -b longmemeval -j gpt-4o -r my-run
```

该命令自动完成评估流程并输出对比报告。

## 六、总结

Supermemory 为 AI 应用提供了一个完整的记忆与上下文层，其核心理念是将 AI 的"记忆"从无差别的文档检索提升为真正理解用户的个性化知识图谱。在三大权威基准上取得 SOTA 成绩，加上对主流 AI 客户端和框架的广泛支持，使其成为当前最具竞争力的 AI 记忆解决方案之一。无论是普通用户为 AI 助手添加持久记忆，还是开发者将记忆能力集成到自己的 AI 产品中，Supermemory 都提供了简洁高效的路径。
