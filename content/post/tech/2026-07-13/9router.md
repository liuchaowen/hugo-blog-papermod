---
title: "9Router: 用 RTK Token 节省 + 自动Fallback 打通所有 AI 编程工具"
date: 2026-07-13
description: "9Router 是一个开源的 AI 路由器，支持 40+ AI 服务商、100+ 模型，可自动压缩 tool_result 节省 20-40% tokens，并实现订阅→低价→免费的三级自动切换，是 Claude Code、Cursor、OpenClaw 等编程工具的完美伴侣。"
author: "Cheman"
slug: 9router
draft: false
categories: [技术, 开源, AI工具]
tags: [AI, Claude, Cursor, OpenClaw, GitHub, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**9Router**，一个免费的 AI 路由器与 Token 节省器，连接 Claude Code、Cursor、OpenClaw 等主流编程工具，自动路由到 40+ AI 服务商和 100+ 模型，配合 RTK（Result Token Keeper）技术可将每次请求的 tokens 消耗压缩 20-40%，同时实现订阅→低价→免费三级自动 Fallback，号称"永不停止编码、永不超预算"。

## 一、项目概述

9Router 本质上是一个运行在本地的 OpenAI 兼容 API 代理网关。它监听 `http://localhost:20128/v1`，对所有发往该端点的请求进行智能路由、格式转换和 Token 压缩，再转发给上游真实 AI 提供商。

**核心解决的问题：**

- ❌ 订阅额度每月用不完就过期浪费
- ❌ Rate Limit（速率限制）在你编码时突然中断
- ❌ Tool 输出（git diff、grep、ls 等）消耗大量 Token
- ❌ 各家 API 价格昂贵，月费 $20-50
- ❌ 需要手动切换提供商，流程繁琐

**9Router 的核心能力：**

- ✅ **RTK Token Saver** — 自动压缩 tool_result 内容，单次请求节省 20-40% tokens
- ✅ **额度最大化** — 追踪配额，月底前用尽每个提供商的额度
- ✅ **Auto Fallback** — 订阅耗尽 → 低价模型 → 免费模型，全程零停机
- ✅ **多账号轮询** — 同一提供商可配置多个账号，轮询使用均摊额度
- ✅ **全工具兼容** — Claude Code、Codex、Cursor、Cline、OpenClaw、Copilot 通吃

## 二、技术原理

### 2.1 架构设计

```
┌─────────────┐
│  Your CLI   │  (Claude Code, Codex, OpenClaw, Cursor, Cline...)
│   Tool      │
└──────┬──────┘
       │ http://localhost:20128/v1
       ↓
┌─────────────────────────────────────────────┐
│           9Router (Smart Router)            │
│  • RTK Token Saver (cut tool_result tokens) │
│  • Format translation (OpenAI ↔ Claude)     │
│  • Quota tracking                           │
│  • Auto token refresh                       │
└──────┬──────────────────────────────────────┘
       │
       ├─→ [Tier 1: SUBSCRIPTION] Claude Code, Codex, GitHub Copilot
       │   ↓ quota exhausted
       ├─→ [Tier 2: CHEAP] GLM ($0.6/1M), MiniMax ($0.2/1M)
       │   ↓ budget limit
       └─→ [Tier 3: FREE] Kiro, OpenCode Free, Vertex ($300 credits)
```

这是一个典型的**反向代理 + 智能路由**架构。9Router 以 Next.js 应用运行，暴露两个关键端口：

- `http://localhost:20128/dashboard` — Web 可视化控制台（配置提供商、管理 API Key、查看用量）
- `http://localhost:20128/v1` — OpenAI 兼容 API 端点（Claude Code、Cursor 等工具通过此端点接入）

### 2.2 RTK Token Saver 原理

RTK（Result Token Keeper）是 9Router 最核心的创新。它通过以下策略压缩 tool_result 体积：

**工具输出压缩策略：**

```javascript
// RTK 核心逻辑示意（简化）
function compressToolResult(toolResult) {
  switch (toolResult.type) {
    case 'file_path':        // ls/dir 输出 → 只保留文件名，去掉权限/大小
      return extractFileNames(toolResult.content)
    case 'search_content':   // grep/ripgrep → 去重行、折叠重复行
      return deduplicateAndCompress(toolResult.content)
    case 'git_diff':         // git diff → 过滤无变化行
      return filterUnchangedLines(toolResult.content)
    case 'edit':             // 保持原样
      return toolResult.content
  }
}
```

实际使用中，Claude Code 的每次 `ToolUse` 返回结果中包含大量元数据（行号、空格、路径信息等），RTK 自动清洗这些冗余内容，将原始 Token 消耗降低 20-40%，对于高频率调用工具的编码场景效果尤为显著。

### 2.3 格式转换层（OpenAI ↔ Claude）

Claude 使用 `anthropic/messages` 接口格式，而 Claude Code 等工具原生使用 OpenAI `chat/completions` 格式。9Router 内置格式翻译器：

```
OpenAI format: { model: "gpt-4", messages: [...] }
       ↓
9Router 格式转换层
       ↓
Claude format: { model: "claude-sonnet-4", messages: [...] }
```

用户只需在 Claude Code 等工具中配置：

```
Endpoint: http://localhost:20128/v1
API Key: [从 Dashboard 复制]
Model: kr/claude-sonnet-4.5
```

### 2.4 Dockerfile 解析

项目提供多阶段构建的 Dockerfile，生产镜像约 200MB：

```dockerfile
# 构建阶段
FROM node:22-alpine AS builder
RUN npm install && npm run build

# 运行阶段
FROM node:22-alpine AS runner
WORKDIR /app
ENV PORT=20128
ENV HOSTNAME=0.0.0.0
# 使用独立 MITM 进程处理请求
COPY --from=builder /app/src/mitm ./src/mitm
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "custom-server.js"]
```

## 三、安装与快速开始

### 3.1 最简安装（npm 全局包）

```bash
# 一行命令完成安装并启动
npm install -g 9router
9router
```

执行后 Dashboard 自动在 `http://localhost:20128` 打开。

### 3.2 Docker 部署（适合服务器/Hugging Face）

```bash
# 从 GitHub Container Registry 拉取
docker pull ghcr.io/decolua/9router:latest

# 运行
docker run -d \
  -p 20128:20128 \
  -v ~/9router-data:/app/data \
  ghcr.io/decolua/9router:latest
```

### 3.3 从源码运行（开发者模式）

```bash
git clone https://github.com/decolua/9router.git
cd 9router
cp .env.example .env
npm install

# 开发模式（热重载）
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev

# 生产构建
npm run build
PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start
```

### 3.4 连接免费提供商（无需注册）

Dashboard → **Providers** → 连接以下任意一个：

- **Kiro AI** — 免费 Claude 模型，无限使用（推荐）
- **OpenCode Free** — 无需认证，直接可用

## 四、使用方法与实战

### 4.1 Claude Code 配置

在 Claude Code 的配置中填写：

```json
{
  "apiKey": "your-9router-api-key-from-dashboard",
  "baseUrl": "http://localhost:20128/v1",
  "model": "kr/claude-sonnet-4.5"
}
```

### 4.2 OpenClaw / Cline 配置

同样填入 `http://localhost:20128/v1` 作为 base URL，API Key 从 Dashboard 获取，模型选择 `kr/claude-sonnet-4.5`。

### 4.3 多账号轮询配置

在同一 Provider 下添加多个 API Key，9Router 会自动轮询：

```json
{
  "provider": "openai",
  "accounts": [
    { "apiKey": "sk-xxx-1", "weight": 1 },
    { "apiKey": "sk-xxx-2", "weight": 1 }
  ],
  "strategy": "round-robin"
}
```

### 4.4 三级 Fallback 配置示例

```json
{
  "tiers": [
    { "provider": "anthropic", "model": "claude-sonnet-4", "priority": 1 },
    { "provider": "zhipu", "model": "glm-4", "priority": 2 },
    { "provider": "kiro", "model": "claude-sonnet-4-free", "priority": 3 }
  ]
}
```

## 五、常见问题与解决方案

**Q: 安装后 Dashboard 打不开？**  
检查端口 20128 是否被占用：`lsof -i :20128`，或通过环境变量 `PORT=其他端口` 更换。

**Q: RTK Token Saver 对所有工具输出都有效吗？**  
不是。RTK 主要优化文件列表（ls）、搜索结果（grep）、Git diff 等结构化输出，对纯文本对话内容影响很小。实测编码场景（高工具调用频率）节省效果最明显。

**Q: 如何在 Hugging Face 上免费部署 9Router？**  
项目支持 Docker 部署，Hugging Face Spaces 提供免费 Docker 支持，适合不想本地运行或需要远程访问的用户。

**Q: 免费模型有速率限制吗？**  
不同提供商限制不同。Kiro AI 提供较宽松的免费额度，OpenCode Free 无需认证，具体以各平台政策为准。

**Q: 是否支持本地模型（如 Ollama）？**  
支持。9Router 兼容 OpenAI 格式，本地 Ollama 通过 `http://localhost:11434/v1` 接入即可作为 Fallback 备选。

## 六、总结

9Router 是一个非常实用的 AI 编程工具基础设施项目。它解决的核心矛盾是：**开发者想用最强的模型coding，但模型贵、有速率限制**。通过 RTK Token Saver + 三级 Auto Fallback 组合拳，9Router 让用户用最少的成本、最稳定的方式持续使用 AI 编程工具。

亮点总结：
- **零成本上手**：npm 一键安装，无需注册任何账号
- **Token 节省实测 20-40%**：对高频工具调用场景效果显著
- **全工具兼容**：Claude Code、OpenClaw、Codex、Cursor、Cline 通吃
- **100+ 模型可选**：从 Claude 到 GLM 到 Kiro，任君挑选

如果你受够了 Rate Limit 和高昂 API 费用，不妨试试 9Router。

> 🔗 项目地址：[https://github.com/decolua/9router](https://github.com/decolua/9router)  
> 🌐 官网：[https://9router.com](https://9router.com)  
> 📦 npm：`npm install -g 9router`
