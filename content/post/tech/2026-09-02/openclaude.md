---
title: "OpenClaude：开源 coding-agent CLI，一个终端搞定所有大模型"
date: 2026-09-02T07:18:00+08:00
description: "OpenClaude 是一款开源的 coding-agent CLI 工具，支持 OpenAI、Claude、 Gemini、DeepSeek、Ollama 等 200+ 大模型，一个终端工作流集成 prompts、工具、agents、MCP、斜杠命令和流式输出。"
author: "Cheman"
draft: false
slug: openclaude
tags: ["开源", "CLI工具", "AI编程", "大模型", "Coding Agent"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenClaude**，一个开源的 coding-agent CLI，将 Claude Code 的核心能力开放给所有大模型提供商——OpenAI、Claude、Gemini、DeepSeek、Ollama 等 200+ 模型，一个终端搞定所有 AI 编程需求。

## 一、项目概述

OpenClaude 起源于 Claude Code 代码库，经社区大量改造后成为一个独立项目。它不是一个简单的模型包装器，而是一套完整的**终端优先 AI 编程工作流**，让开发者无论使用哪家大模型都能获得一致的 coding-agent 体验。

**核心特性一览：**

- **多模型统一入口**：通过 `/provider` 命令引导配置，保存多套 Provider Profile，任意切换模型后端
- **完整工具链**：Bash、文件读写/编辑、grep、glob、agents、tasks、MCP、斜杠命令
- **流式输出**：实时看到 token 输出和工具执行进度
- **对话恢复**：支持按 session ID 恢复历史对话，或 fork 新分支继续
- **后台任务**：`--bg` 模式运行长任务，`openclaude ps/logs/kill` 管理会话
- **像素风萌宠伴侣**：内置 pixel-art 英雄像素人，每按一次 Enter 就放大招（真有其事）
- **VS Code 扩展**：launch 集成、Provider 控制面板、内嵌聊天窗口

项目由 Gitlawb 维护，已获得 GitHub 200+ Stars，支持 npm 全局安装。

## 二、技术原理

### 2.1 架构设计

OpenClaude 的核心架构分为三层：

```
┌──────────────────────────────────────┐
│           CLI 入口 (bin/openclaude)   │
│   Node.js >= 22.0.0  / Bun 源码构建   │
├──────────────────────────────────────┤
│          核心运行时 (src/cli.mjs)    │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ │
│  │ Provider │ │ Tool     │ │Agent  │ │
│  │ Manager  │ │ Registry │ │Router │ │
│  └─────────┘ └──────────┘ └───────┘ │
├──────────────────────────────────────┤
│      模型适配层 (OpenAI-compatible)   │
│  OpenAI / Gemini / Bedrock / Ollama  │
└──────────────────────────────────────┘
```

**关键设计决策：**

1. **OpenAI 兼容协议为统一抽象层**：无论后端是 Gemini、Claude 还是 Ollama，统一走 OpenAI-compatible `/v1/chat/completions` 接口，大幅降低适配成本
2. **Provider Profile 机制**：用户通过 `/provider` 引导式配置，数据保存在 `~/.openclaude` 目录下的 JSON 文件中，支持多套配置快速切换
3. **MCP（Model Context Protocol）原生支持**：内置 `@modelcontextprotocol/sdk`，支持动态发现和加载 MCP 服务端点
4. **repo-map 代码库智能**：通过 PageRank 算法对仓库结构进行重要性排序，智能注入代码上下文到 LLM prompt

### 2.2 源码结构

```
src/
├── cli.mjs              # 主入口
├── query/               # 查询处理
├── services/api/        # API 调用层
│   ├── openaiShim/     # OpenAI 兼容适配器
│   └── ...
├── utils/               # 工具函数
│   ├── providerProfile.ts   # Provider 配置管理
│   ├── providerRecommendation.ts  # 模型推荐
│   └── context.ts       # 上下文管理
├── entrypoints/         # 入口脚本
│   └── sdk/            # SDK 导出
├── proto/              # gRPC 协议定义
└── web/                # Web 界面 (React)
```

核心依赖包括 `@anthropic-ai/sdk`（Anthropic 原生支持）、`@modelcontextprotocol/sdk`（MCP 协议）、`@orama/orama`（本地向量搜索，repo-map 功能）、`tree-sitter-wasms`（代码解析）、`web-tree-sitter`（Web 界面代码高亮）。

### 2.3 Docker 构建

项目提供两阶段 Docker 构建，确保镜像体积最小化：

```dockerfile
# 构建阶段
FROM node:22-slim AS build
WORKDIR /app
COPY package.json bun.lock .bun-version ./
RUN npm install -g "bun@$BUN_VERSION"
RUN bun install --frozen-lockfile
COPY src/ scripts/ bin/ tsconfig.json ./
RUN bun run build
RUN rm -rf node_modules && bun install --frozen-lockfile --production

# 运行阶段
FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist/cli.mjs dist/cli.mjs
COPY --from=build /app/bin/ bin/
COPY --from=build /app/node_modules/ node_modules/
RUN apt-get install -y git ripgrep
USER node
ENTRYPOINT ["node", "/app/bin/openclaude"]
```

### 2.4 多 Provider 路由策略

OpenClaude 支持 Agent 级别的模型路由，可在 `~/.openclaude/settings.json` 中配置：

```json
{
  "agentModels": {
    "explore": { "provider": "openai", "model": "gpt-4o" },
    "plan": { "provider": "anthropic", "model": "claude-3-5-sonnet" },
    "code-reviewer": { "provider": "deepseek", "model": "deepseek-coder" }
  }
}
```

配合 `maxSteps` 参数控制每个 agent 的最大工具调用次数，实现**成本优化**和**能力分层**。

## 三、安装与快速开始

### 3.1 环境要求

- **Node.js >= 22.0.0**（npm 安装和运行时必需）
- **Bun >= 1.3.13**（仅源码构建和本地开发需要）
- **ripgrep**（`rg`，系统全局安装，工具链依赖）
- **Git**（Docker 镜像已包含）

### 3.2 安装步骤

**npm 全局安装（推荐）：**

```bash
npm install -g @gitlawb/openclaude@latest
```

**Arch Linux（AUR）：**

```bash
paru -S openclaude
```

**验证安装：**

```bash
openclaude --version
```

### 3.3 快速开始

```bash
# 启动交互式对话
openclaude

# 设置 Provider（引导式配置，支持 30+ 模型商）
/provider

# GitHub Models 快速上手
/onboard-github

# 恢复历史对话
openclaude --resume <session-id>
openclaude --continue

# 后台任务
openclaude --bg "fix failing tests"
openclaude ps          # 列出所有后台会话
openclaude logs <name> # 查看日志
openclaude kill <name> # 终止会话
```

**环境变量快速配置（无需交互式设置）：**

```bash
# OpenAI
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o

# Ollama（本地）
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5-coder:7b
```

## 四、使用方法与实战

### 4.1 Provider 配置实战

OpenClaude 支持 30+ 模型提供商，以下是几种典型配置：

| 场景 | Provider | 配置要点 |
|------|----------|----------|
| OpenAI 官方 | OpenAI-compatible | `OPENAI_API_KEY` |
| 本地推理 | Ollama | `OPENAI_BASE_URL=http://localhost:11434/v1` |
| GitHub 模型 | GitHub OAuth | `/onboard-github` 交互引导 |
| 小米 MiMo | Xiaomi MiMo | `MIMO_API_KEY` at `https://mimo.mi.com` |
| DeepSeek | OpenRouter/DeepSeek | `OPENAI_BASE_URL` + `OPENAI_MODEL=deepseek-chat` |
| Anthropic Claude | Bedrock/Vertex | 环境变量配置云端凭证 |

### 4.2 MCP 集成

OpenClaude 内置 MCP SDK 支持，可连接任意 MCP 服务端点：

```bash
# MCP 服务端点配置（通过 settings.json 或环境变量）
export MCP_SERVERS='{"filesystem": {"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]}}'
```

### 4.3 Repo Map（代码库智能）

启用后，OpenClaude 自动生成仓库的结构化重要性地图：

```bash
export REPO_MAP=1
# 或在 OpenClaude 中运行
/repomap
```

使用 PageRank 算法对文件进行重要性排序，智能注入高频使用的模块上下文到 LLM prompt，显著提升**大仓库场景下的推理质量**。

### 4.4 像素风萌宠伴侣

```bash
/buddy              # 孵化像素小英雄
/buddy set robinhood  # 绿弓手 — 每次按 Enter 射箭
/buddy set ember      # 火龙 — 带真实热力梯度
/buddy set random     # 随机切换
/buddy mute           # 静音模式
```

> 需要终端至少 100 列宽，支持 `prefersReducedMotion` 降级。

## 五、常见问题与解决方案

### Q1: 安装后提示 `ripgrep not found`

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt-get install -y ripgrep

# 验证
rg --version
```

### Q2: 不同 Provider 的能力差异

OpenClaude 在不同 Provider 上行为存在差异：

- **Anthropic 特有功能**（如原生工具调用）在其他 Provider 上可能不可用
- 小型本地模型在**长多步工具流**中可能表现不稳定
- 部分 Provider 有输出 token 上限，OpenClaude 会自适应调整
- 小米 MiMo 目前不支持 `/usage` 使用量报告

### Q3: 无法读取 `.env` 文件

OpenClaude **不会自动加载项目 `.env` 文件**。推荐方式：

```bash
# 方式一：Provider 配置（推荐）
openclaude
/provider

# 方式二：环境变量
export OPENAI_API_KEY=sk-xxx
openclaude

# 方式三：启动时指定
openclaude --provider-env-file .env
```

### Q4: 克隆 Claude Code 配置后 OpenClaude 不可用

OpenClaude 使用独立配置目录 `~/.openclaude`，不读取 `~/.claude`。建议重新运行 `/provider` 配置，不要直接复制 `.claude` 目录下的凭证文件。

### Q5: Docker 中无法使用交互式 Provider 设置

Docker 镜像为无头模式，适合 CI/CD 集成。交互式配置请在宿主机完成，配置保存在 `~/.openclaude/settings.json`，挂载到容器内即可：

```bash
docker run -v ~/.openclaude:/home/node/.openclaude \
  ghcr.io/gitlawb/openclaude:latest
```

## 六、总结

OpenClaude 将 Claude Code 的编程体验从 Anthropic 独家生态中解放出来，通过 OpenAI 兼容协议作为统一抽象层，让开发者可以自由选择 200+ 大模型作为 coding-agent 的后端。无论是 OpenAI 的 GPT-4o、Gemini，还是本地运行的 Ollama（Llama/Qwen），都能在同一个终端工作流中获得一致的工具调用体验。

项目技术选型务实（TypeScript + Node.js/Bun + React），架构清晰，MCP 原生支持，repo-map 功能对大仓库场景尤为有价值。如果你正在寻找一个**跨模型的 AI 编程工具**，OpenClaude 值得一试。
