---
title: "Free Claude Code：用本地代理让 Claude Code 和 Codex 畅连所有 AI 提供商"
date: 2026-07-13
description: "Free Claude Code 是一个开源本地代理工具，将 Claude Code 和 Codex 与 OpenAI 兼容的 AI 提供商桥接起来，支持 NVIDIA NIM、OpenRouter、Gemini、DeepSeek 等 24+ 云端及本地模型，让你在不花一分钱的情况下自由使用最强 AI 编程助手。"
author: "Cheman"
slug: free-claude-code
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "Claude Code", "Codex", "AI", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Free Claude Code**，它是一个本地代理工具，可以将 Claude Code 和 Codex 与任何 OpenAI 兼容的 AI 提供商连接起来，支持 24+ 云端及本地模型——换句话说，你不需要给 Anthropic 或 OpenAI 付费，就能用上最强 AI 编程助手。

## 一、项目概述

Claude Code 和 Codex CLI 是目前最强的 AI 编程工具，但两者都依赖官方付费 API（Anthropic 的 Claude API 和 OpenAI 的 GPT 模型）。对于想节省成本、或者希望灵活切换模型的开发者来说，这是一道门槛。

Free Claude Code（以下简称 FCC）解决了这个问题：它通过一个本地 HTTP 代理，将 Claude Code 和 Codex 的请求路由到任意 OpenAI 兼容的第三方提供商，从而绕过官方 API 的绑定。

核心特性一览：

- 支持 **24+ 云端和本地模型提供商**
- Claude Code 和 Codex 原生 `/model` 选择器完全可用
- 支持按流量级别（Opus/Sonnet/Haiku）分别路由到不同模型
- 提供本地管理 Admin UI（浏览器界面配置）
- 支持 VS Code、JetBrains 插件集成
- 可选 Discord / Telegram 机器人扩展，支持语音笔记转录

## 二、技术原理

### 架构设计

FCC 本质是一个运行在本地（默认 `127.0.0.1:8082`）的 FastAPI 服务器，充当 Claude Code/Codex 与外部 AI 提供商之间的协议翻译层。

从 `pyproject.toml` 可以看出核心技术栈：

- **Python 3.14**：项目明确要求 3.14 及以上
- **FastAPI**：HTTP 代理核心框架
- **uvicorn**：ASGI 服务器
- **httpx[socks]**：支持 SOCKS 代理的 HTTP 客户端
- **openai**：OpenAI 兼容 API 调用
- **pydantic**：配置和数据校验
- **loguru**：结构化日志

CLI 入口点设计非常清晰：

```toml
[project.scripts]
fcc-server  = "free_claude_code.cli.entrypoints:serve"   # 启动代理服务器
fcc-claude  = "free_claude_code.cli.launchers.claude:launch"   # 启动 Claude Code
fcc-codex   = "free_claude_code.cli.launchers.codex:launch"    # 启动 Codex
```

### 支持的 AI 提供商

项目支持的提供商非常广泛，几乎涵盖了主流的云端和本地方案：

| 类型 | 提供商 | 代表模型 |
|---|---|---|
| 云端 | NVIDIA NIM | nemotron-3-super-120b |
| 云端 | OpenRouter | openrouter/free |
| 云端 | Google AI Studio | gemini-3.1-flash-lite |
| 云端 | DeepSeek | deepseek-chat |
| 云端 | Mistral | devstral-small-latest |
| 云端 | Groq | llama-3.3-70b-versatile |
| 云端 | Cerebras | gpt-oss-120b |
| 云端 | Kimi（月之暗面）| kimi-k2.5 |
| 本地 | LM Studio | 任意本地模型 |
| 本地 | llama.cpp | 任意本地模型 |
| 本地 | Ollama | 任意本地模型 |

Claude Code 和 Codex 都使用 OpenAI 兼容的 `/v1/chat/completions` 接口格式，而各提供商的 API 恰好也大多遵循此标准，FCC 只需做请求转发和响应透传即可。

### 模型分级路由

FCC 支持通过环境变量设置不同级别的 fallback 模型：

```bash
MODEL=open_router/openrouter/free        # 全局默认
MODEL_OPUS=nvidia_nim/moonshotai/kimi-k2.6   # Opus 级专用
MODEL_SONNET=open_router/openrouter/free  # Sonnet 级专用
MODEL_HAIKU=lmstudio/qwen3.5-coder       # Haiku 级专用
```

这意味着当你用 `/model` 切换到 Opus 级别时，流量会自动路由到你配置的高配模型。

## 三、安装与快速开始

### 环境要求

- Python 3.14+
- Node.js（仅在需要 Claude Code/Codex 本身时需要）
- uv 包管理器（安装脚本会自动安装）

### 一键安装

macOS / Linux：

```bash
curl -fsSL "https://github.com/Alishahryar1/free-claude-code/blob/main/scripts/install.sh?raw=1" | sh
```

Windows PowerShell：

```powershell
irm "https://github.com/Alishahryar1/free-claude-code/blob/main/scripts/install.ps1?raw=1" | iex
```

安装脚本会自动安装 uv、Python 3.14 和 Claude Code/Codex（如未安装）。

### 启动并配置

第一步，启动服务器：

```bash
fcc-server
```

服务器日志会显示 Admin UI 地址：

```
INFO:     Admin UI: http://127.0.0.1:8082/admin (local-only)
```

第二步，打开 Admin UI，选择提供商并填入 API Key，然后点击 **Validate** → **Apply**。以 NVIDIA NIM 为例，只需三步：获取 API Key → 粘贴 → 验证。

第三步，直接运行：

```bash
fcc-claude    # 使用 Claude Code
fcc-codex     # 使用 Codex
```

## 四、编辑器集成

### VS Code + Claude Code

安装 Claude Code VS Code 扩展后，在设置中配置环境变量：

```json
"claudeCode.environmentVariables": [
  { "name": "ANTHROPIC_BASE_URL", "value": "http://localhost:8082" },
  { "name": "ANTHROPIC_AUTH_TOKEN", "value": "freecc" },
  { "name": "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "value": "1" }
]
```

重载扩展后，Claude Code VS Code 插件会直接连到 FCC 代理，与在终端中使用 `fcc-claude` 效果完全一致。

### JetBrains IDE + Claude ACP

在 `~/.jetbrains/acp.json`（macOS/Linux）或对应路径（Windows）中配置环境变量，同样指向 `localhost:8082` 即可。

### Discord / Telegram 扩展

在 Admin UI → Messaging 中配置后，FCC 还能作为 Discord 机器人或 Telegram 机器人使用，支持 `/stop` 和 `/clear` 命令，并可开启语音笔记转录功能（支持 NVIDIA NIM 或本地 Whisper）。

## 五、常见问题

**Q: FCC 支持中文模型吗？**

支持。Kimi（`kimi/kimi-k2.5`）和 MiniMax（`minimax/MiniMax-M3`）均已列入支持的提供商列表。

**Q: 使用本地模型（如 LM Studio）需要额外配置吗？**

只需确保 LM Studio 启动了本地服务器（默认 `localhost:1234`），FCC 会自动发现并连接。

**Q: 如果所有提供商的 API 都用完了怎么办？**

FCC 本身不存储任何 API Key，也不会缓存请求，你可以随时切换到其他提供商，或者改用完全本地化的 Ollama/llama.cpp 方案。

## 六、总结

Free Claude Code 是一个极具工程巧思的开源项目：它没有重新造轮子，而是巧妙地利用 Claude Code 和 Codex 对 OpenAI 兼容接口的原生支持，架起一座桥，让最强 AI 编程工具与所有 OpenAI 兼容模型自由互联。如果你对 AI 编程工具感兴趣、又想避免官方 API 的绑定和高昂费用，FCC 值得一试。
