---
title: "Wigolo：让 AI 代理本地上网搜索，无需 API Key 的 Web 智能工具"
date: "2026-07-19"
description: "Wigolo 是一款面向 AI 代理的本地优先 Web 智能 MCP 服务器，提供搜索、抓取、爬取、提取等 10 种工具，无需任何 API Key，数据全程留在本地。"
author: "Cheman"
slug: wigolo
draft: false
categories: ["技术", "开源"]
tags: ["MCP", "AI Agent", "Web 爬虫", "本地优先", "Node.js"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Wigolo**，一款本地优先的 Web 智能工具，专门为 AI 代理设计——无需 API Key，数据不离开本地，让你的 AI 编程助手（Claude Code、Cursor、Codex 等）直接上网搜索、抓取、提取信息。

## 一、项目概述

Wigolo 是一个 Node.js ≥ 20 的 MCP（Model Context Protocol）服务器，核心使命是：**让 AI 代理拥有完整的 Web 能力，同时保持数据隐私和零成本**。

### 核心特性

- **零 API Key**：搜索、抓取、提取等核心功能完全免费，数据缓存在本地 `~/.wigolo/`
- **10 种工具**：search、fetch、crawl、extract、cache、find_similar、research、agent、diff、watch
- **多框架支持**：LangChain、CrewAI、LlamaIndex、Vercel AI SDK 均已集成
- **本地 ML**：排序模型和向量嵌入模型运行在本地，无需云端
- **多传输方式**：MCP over stdio、REST API、TypeScript/Python SDK

### 支持的 AI 代理

Claude Code、Cursor、Codex、Gemini CLI、VS Code、Windsurf、Zed、Antigravity，以及任何 MCP 客户端。

## 二、技术原理

### 架构设计

Wigolo 采用单进程 Node.js 架构，通过 MCP 协议（JSON-RPC over stdio）与 AI 代理通信。所有重型计算模块（浏览器引擎、ML 模型）采用惰性加载，不用不付费。

```
AI Agent (MCP/REST/SDK)
      ↓
Wigolo Core (Node.js)
      ↓
┌─────────────────────────────────┐
│         工具层 (Tool Layer)     │
│  search │ fetch │ crawl │ extract│
│  cache  │research│ agent │ diff │
└─────────────────────────────────┘
      ↓
 Fetch Router → 浏览器引擎（Playwright）
 Search Core  → 18 个搜索引擎 → 排序融合 → ML 重排
 Local Cache  → SQLite + sqlite-vec 向量索引
 On-device ML → FastEmbed 向量模型
```

### 核心技术栈

| 组件 | 技术选型 | 作用 |
|------|---------|------|
| 浏览器引擎 | Playwright | JavaScript 渲染页面的抓取 |
| 向量索引 | sqlite-vec | 本地语义搜索 |
| 关系存储 | better-sqlite3 | 缓存元数据 |
| 内容提取 | @mozilla/readability + turndown | HTML → Markdown |
| 嵌入模型 | @huggingface/transformers / FastEmbed | 本地向量计算 |
| MCP 协议 | @modelcontextprotocol/sdk | 与 AI 代理通信 |

### 搜索结果质量保证

Wigolo 每个搜索结果都附带**可解释的评分分解**和**字节级溯源**：

```json
{
  "title": "PostgreSQL 逻辑复制文档",
  "url": "https://www.postgresql.org/docs/... ",
  "excerpt": "Logical replication is a method...",
  "citation_id": "src-1",
  "source_span": { "start": 1042, "end": 1305 },
  "evidence_score": {
    "final": 0.86,
    "semantic": 0.91,
    "lexical": 0.78,
    "engine_consensus": 3
  }
}
```

弱结果会被自己的评分系统标记为垃圾结果，失败引擎也会在输出中报告——AI 永远知道自己站在什么数据上。

### 分层获取策略（Tiered Fetch Router）

Wigolo 的 fetch 工具根据页面特征自动选择最优策略：

1. **HTTP 直接获取** → 静态页面
2. **Linkedom 轻量解析** → 简单 SPA
3. **Playwright 浏览器渲染** → 复杂 SPA / 反爬保护页面

系统会**学习每个域名的最优策略**，用 `wigolo tune list` 可以查看学到什么：

```bash
# 检查各组件健康状态
npx wigolo doctor
```

## 三、安装与快速开始

### 环境要求

- Node.js ≥ 20
- ~1.5 GB 空闲磁盘（浏览器引擎 + ML 模型）

### 一键安装

为你的 AI 代理自动配置 Wigolo（MCP 配置写入 + 初始化一步完成）：

```bash
# 安装到 Claude Code
npx wigolo init --agents=claude-code

# 安装到多个代理
npx wigolo init --agents=cursor,vscode,zed

# 无交互静默安装（CI/脚本环境）
npx wigolo init --agents=claude-code --no-interactive
```

init 完成后会自动：
- 下载浏览器引擎
- 下载本地 ML 模型
- 写入 MCP 配置文件
- 运行健康检查并报告结果

### 验证安装

```bash
npx wigolo doctor
```

卸载：

```bash
npx wigolo config --uninstall --yes
```

### 可选：配置 LLM 提升研究质量

搜索、抓取、缓存是 100% 无 Key 的。但如果想要 `research`（AI 合成研究）和 `agent`（自主搜集循环）输出质量更高，需要一个 LLM 来写有引用的综合报告：

```bash
export WIGOLO_LLM_PROVIDER=gemini
export GEMINI_API_KEY=<你的免费 key，aistudio.google.com/apikey 申请>
```

支持提供商：`anthropic`、`openai`、`groq`、本地 `ollama`。

## 四、使用方法与实战

### 基础用法

**终端直接搜索：**

```bash
wigolo search "local first web scraping" --json
```

**交互式 Shell（NDJSON 管道）：**

```bash
wigolo shell
```

### 作为 MCP 工具调用

Claude Code、Cursor 等代理通过 MCP 协议直接调用，工具会自动选择最优策略：

```bash
# 搜索示例（代理中）
# 调用 search 工具，fan-out 到 18 个引擎并行搜索
# 结果包含评分、引用 ID、字节溯源

# 抓取单个页面
# 调用 fetch 工具，自动检测 SPA → 触发 Playwright 渲染
# 返回干净 Markdown + 元数据 + 链接

# 整站爬取
# 调用 crawl 工具，支持 BFS/DFS/sitemap 策略
# 自动尊重 robots.txt、按域名限速、去重
```

### REST API 方式

```bash
# 启动 REST 服务器（默认 127.0.0.1:3333）
wigolo serve

# curl 调用搜索
curl -X POST http://127.0.0.1:3333/v1/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"local-first software","max_results":5}'
```

### TypeScript SDK

```typescript
import { createLocalClient } from 'wigolo-sdk/local';

const { client, close } = await createLocalClient();
const res = await client.search({ query: 'local-first web search', max_results: 5 });
console.log(res.results.map(r => r.title));
await close();
```

### Python SDK

```python
from wigolo import local_client

with local_client() as client:
    res = client.search(query="local-first web search", max_results=5)
    for r in res["results"]:
        print(r["title"], r["url"])
```

### 框架集成

```typescript
// LangChain
import { wigolo_tools } from 'wigolo-langchain';

// CrewAI
import { wigolo_tools } from 'wigolo-crewai';

// LlamaIndex（作为 RAG Retriever）
import { WigoloReader } from 'wigolo-llamaindex';
```

### Docker 部署

```bash
# MCP stdio 方式（挂载数据卷持久化缓存）
docker run -i --rm -v wigolo-data:/data ghcr.io/knockoutez/wigolo

# REST 服务器方式（远程访问需要 Token）
docker run -p 3333:3333 -v wigolo-data:/data \
  -e WIGOLO_API_TOKEN=your-secret-token \
  ghcr.io/knockoutez/wigolo serve --host 0.0.0.0
```

## 五、常见问题与解决方案

**Q：安装需要 1.5GB 磁盘，是什么？**
A：主要是 Playwright 浏览器引擎 + 本地向量/排序模型。磁盘便宜，按量付费的 API Key 不便宜。

**Q：免费？那维护资金从哪来？**
A：AGPL-3.0 协议保护开源属性，接受 GitHub Star、Buy Me a Coffee 捐赠。永远不会有付费版或 meter。

**Q：与 Tavily、Exa、Firecrawl 相比有什么优势？**
A：对比表格如下。核心差异在于：**完全本地、数据不离机、零 API 成本**，且每个结果都附带可解释的评分和字节级溯源，而非黑盒分数。

| 特性 | Wigolo | Firecrawl | Exa | Tavily |
|------|:------:|:---------:|:---:|:------:|
| 多引擎搜索 | ✅ | ✅ | ✅ | ✅ |
| 抓取+结构化提取 | ✅ | ✅ | ✅ | ✅ |
| 字节级溯源 | ✅ | — | — | — |
| 本地持久缓存 | ✅ | — | — | — |
| 无 API Key | ✅ | — | — | — |
| 完全本地数据 | ✅ | — | — | — |

**Q：搜索质量能比肩付费服务吗？**
A：README 中有一个 Claude Fable 5 驱动的四工具实测（Live 查询，不是 leaderboard），Wigolo 与 Exa、Tavily 在核心答案上达到了相同质量，且 Wigolo 额外提供了评分分解和失败报告。建议自己跑一个对比测试。

**Q：Docker 方式没有 API Key，能抓取反爬保护页面吗？**
A：可以，但数据中心 IP 更容易被反爬墙拦截（家庭宽带 IP 更友好）。Wigolo 会将这类失败标记为 `blocked_by_challenge`，而不是把挑战页内容伪装成真实数据。

**Q：Windows/Mac/Linux 都能用吗？**
A：都能用，npm 全平台支持。Homebrew、`curl | sh`、单文件 binary 等渠道也有提供。

## 六、总结

Wigolo 解决了一个很实在的问题：AI 代理需要上网搜索、抓取页面，但付费 API 有 meter、免费 API 有 Key。本地优先的方案从根本上绕过了这个矛盾——模型和数据都在本地，核心搜索走公开引擎的直连适配器，不产生任何第三方费用。

对于日常在本地工作的 AI 编码助手来说，Wigolo 是一个值得加入工具箱的选择。安装简单（MCP 配置一行命令搞定），工具链完整（从搜索到研究到监控），且完全透明——每个结果都有评分依据，失败也有标签说明。

如果你也想让 Claude Code / Cursor / Windsurf 直接上网探索，可以试试：

```bash
npx wigolo init --agents=claude-code
```
