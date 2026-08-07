---
title: "FreeLLMAPI：一个 API 聚合 29 家免费大模型，月均 40 亿 Token 随便用"
date: "2026-08-08"
description: "FreeLLMAPI 将 Google Groq、Cerebras、Mistral、Cohere 等 29 家平台的免费额度聚合为一个 OpenAI 兼容接口，自动路由、智能切换，让 Claude Code、Codex CLI 等主流 Coding Agent 无缝接入。"
author: "Cheman"
slug: freellmapi
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI", "大模型", "API", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**FreeLLMAPI**，它将 29 家 AI 平台的免费配额聚合为一个 OpenAI 兼容的本地 API，每月提供约 **40 亿 Token** 的免费推理额度，一个 endpoint 全部搞定。

## 一、项目概述

### 核心问题

每个 AI 厂商都有免费 tier——但堆在一起就成了噩梦：29 个 SDK、29 套限流规则、29 个可能出错的地方。FreeLLMAPI 的思路很简单：**把这些免费额度当成一个虚拟的超大模型池，用一个统一的 `/v1` 接口暴露出来。**

### 支持的提供商

支持的免费提供商包括：

- **推理加速**：Groq、Cerebras
- **通用大模型**：Google AI、Mistral、Cohere、OpenRouter
- **国产模型**：Z.ai (Zhipu)、ModelScope（Qwen3、DeepSeek V4、GLM-5）
- **HuggingFace 部署**：多个模型 endpoint
- **云平台**：Cloudflare Workers AI、NVIDIA NIM
- **自定义端点**：支持接入任何 OpenAI 兼容接口（llama.cpp、LM Studio、vLLM、Ollama）

### 核心技术特性

- **OpenAI 兼容接口**：完整支持 `/v1/chat/completions`、`/v1/responses`、`/v1/completions`、`/v1/images/generations`、`/v1/audio/speech`、`/v1/embeddings`，流式和非流式均支持
- **Anthropic Messages API**：`/v1/messages` 走 Anthropic 原生协议，Claude Code 和官方 Anthropic SDK 可直接接入
- **六种路由策略**：根据速度、能力、可靠性实时打分，自动选择最优模型，遇到 429/5xx 自动切换到下一个
- **Fusion 多模型合成**：请求 `fusion` 虚拟模型，并行调用多个免费模型，由 Judge 模型综合输出
- **工具调用 & 结构化输出**：OpenAI 风格 `tools` 跨提供商透传，甚至能挽救 provider 不支持的纯文本工具调用
- **自更新模型目录**：每天两次从 freellmapi.co 拉取签名目录，新模型、quota 变更、兼容性修复自动生效，无需 `git pull`
- **密钥加密存储**：Provider 密钥用 AES-256-GCM 加密存储在 SQLite 中，内存解密，应用只看到一个 `freellmapi-...` 统一 Token
- **MCP Server**：Agents 可通过 `/mcp` 接口查询可用模型、Provider 健康状态和路由策略
- **60 语言 Dashboard**：React 管理面板，支持 60 种语言，RTL 语言自动翻转布局

## 二、技术原理

### 架构设计

项目采用 Node.js monorepo 架构，Workspace 包含四个包：

```
shared/      # 共享类型定义和工具函数
server/      # 核心路由引擎 + API 服务器
client/      # React Dashboard（Vite 构建）
cli/         # freellmapi 命令行工具（setup-claude 等）
```

Dockerfile 采用多阶段构建：
- `deps` 阶段：安装依赖（含 `better-sqlite3` 编译）
- `build` 阶段：运行 `npm run build` 编译所有包
- `runtime` 阶段：复制编译产物，使用 `node:20-bookworm-slim` 运行时镜像

```dockerfile
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/client/dist ./client/dist
CMD ["node", "server/dist/index.js"]
```

### 路由引擎核心逻辑

路由器的核心是根据六种策略为每个模型打分，选取最高分且未超限流的模型执行请求。请求流程如下：

1. **模型评分**：根据速度、能力、可靠性实时打分排序
2. **健康检查**：检查模型对应 Provider 的密钥是否有效
3. **限流判断**：检查 RPM/RPD/TPM/TPD 是否在配额内
4. **执行请求**：调用 Provider API
5. **容错切换**：遇到 429/5xx，将该密钥 cooldown，切换到下一个模型重试

Fusion 模式会并行调用多个 diverse 模型，由 Judge 模型综合输出最终答案。

### 密钥加密

所有 Provider 密钥在 SQLite 中按 `(platform, model, key)` 维度分别计数限流，用 AES-256-GCM 加密存储，每次请求时内存解密，进程退出后密钥不落地。

## 三、安装与快速开始

### 环境要求

- Node.js >= 20.18.0，npm >= 10.0.0
- Docker（推荐，一行命令搞定）
- 各 Provider 的 API Key（在 Dashboard 中添加）

### 最简安装（Docker 一键）

```bash
curl -fsSL https://freellmapi.co/install.sh | bash
```

安装脚本会：
1. 创建 `~/freellmapi` 目录
2. 生成加密密钥写入 `.env`
3. 拉取 Docker 镜像并启动
4. 开放 http://localhost:3001

### 桌面应用

macOS 用户可直接下载 `FreeLLMAPI-x.x.x.dmg` 安装包，安装后在菜单栏运行，支持实时请求统计的 Glass 风格弹窗。

## 四、使用方法与实战

### Python 调用示例

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3001/v1",
    api_key="freellmapi-your-unified-key",
)

resp = client.chat.completions.create(
    model="auto",  # 自动选择最优模型，或指定 "auto:fast", "auto:smart"
    messages=[{"role": "user", "content": "用一句话概括深度学习的历史"}],
)
print(resp.choices[0].message.content)
print("路由至:", resp.headers.get("x-routed-via"))
```

### 配置 Claude Code

```bash
npx freellmapi setup-claude --url http://localhost:3001 --api-key <your-unified-key>
```

每个 setup 命令都支持 `--dry-run`，执行前先备份现有配置，合并而非覆盖。

### 配置 Zed / JetBrains AI（Ollama 模拟模式）

通过 `setup-opencode` 或配置 Ollama 兼容端点，让 Zed 和 JetBrains AI 也能使用本地免费模型池。

### 支持的 Coding Agent 列表

| Agent | 命令 | 端点 |
|---|---|---|
| Claude Code | `setup-claude` | root |
| Codex CLI | `setup-codex` | `/v1` |
| Cline / Roo Code | `setup-roo` | `/v1` |
| Continue | `setup-continue` | `/v1` |
| Aider | `setup-aider` | `/v1` |
| Goose | `setup-goose` | `/v1` |
| Cursor | `setup-cursor` guide | 公开 URL |

## 五、常见问题与解决方案

### Q: 响应速度不稳定？
**A**: 使用 `auto:fast` 策略优先选择 Groq、Cerebras 等低延迟模型；或配置 named profile 专门针对速度调优。

### Q: 某个模型今天突然报错 429？
**A**: 路由器会自动在 30s~5min 后冷却该密钥并切换到下一个模型，无需人工干预。如果频繁触发，说明该 Provider 免费额度已耗尽，等 UTC 次日重置即可。

### Q: 如何接入自己的 Ollama 或 LM Studio？
**A**: 在 Dashboard → Keys → Custom Provider，填入任意 OpenAI 兼容端点 URL，路由器会将其纳入统一路由链。

### Q: 密钥安全性如何保障？
**A**: 密钥以 AES-256-GCM 加密存在 SQLite 中，内存解密后即销毁。应用只持有统一的 `freellmapi-xxx` Token，永不暴露 Provider 密钥。

### Q: 模型目录更新需要手动操作吗？
**A**: 免费版路由器每天自动从 freellmapi.co 拉取签名目录；Premium（$19/年）提供更实时（每 2 小时）的签名目录推送，包含最新免费模型和 quota 变更。

## 六、总结

FreeLLMAPI 的定位非常清晰：**不是替代付费 API，而是把 29 家平台的免费额度变成一个可用的、稳定的基础设施。** 对于个人开发者在本地跑 Coding Agent、原型验证或学习研究来说，这是一个相当务实的方案。

它的优势在于：开箱即用的 OpenAI 兼容层、自动容错路由、多 Agent 一键配置，以及无需维护的模型目录更新机制。如果你正好有多个平台的免费 Key 躺在那里吃灰，这个项目值得一试。
