---
title: "OpenBot：让 AI 同事真正拥有自己的电脑"
date: "2026-08-26"
description: "OpenBot 是 CopilotKit 开源的一个 AI Agent 平台，每个 Bot 拥有独立计算机（真实浏览器+文件系统），通过 AG-UI 协议接入企业工作流，支持 LangGraph、Mastra、CrewAI 等主流框架，构建可审计的 AI 工作力。"
author: "Cheman"
slug: openbot
draft: false
categories: ["技术", "AI"]
tags: ["AI Agent", "开源", "AG-UI", "CopilotKit", "自动化"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenBot**，来自 CopilotKit——它让每个 AI Agent 拥有自己的专属电脑：一个真实的浏览器实例、自己的登录态、自己的文件系统，以及可精细控制的工具权限。

## 一、项目概述

OpenBot 是一个运行在自有基础设施中的 AI Agent 平台，与传统的 AI Assistant 不同，它为每个 Bot 分配独立资源：

- **独立浏览器**：每个 Bot 拥有自己的 Chromium 实例和独立的工作区目录
- **独立文件系统**：Bot 可以安装工具、处理文件，所有操作均通过统一网关并记录审计日志
- **CEL 策略引擎**：细粒度控制 Bot 的浏览器操作、文件访问和 MCP 工具调用，策略可检查 `tool.name`、`page.url`、`bot.id` 等字段
- **支持多种 Agent 框架**：内置的 Bot 基于 AG-UI 协议（开放协议），可以接入 LangGraph、Mastra、CrewAI、Pydantic AI、Google ADK 或手写 Agent

> 官网：[copilotkit.ai/openbot](https://copilotkit.ai/openbot)

## 二、架构设计

OpenBot 的核心是**网关（Gateway）**，它是 Bot 操作外部资源的唯一入口：

```
用户 → App (Port 3010) → Server API (Port 3001) 
                         ↓
                    Gateway (策略 + 审计)
                         ↓
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
   Agent-Computer   文件系统        MCP Server
   (浏览器+workspace)                  (如 Google Drive)
```

### 核心组件

| 服务 | 端口 | 职责 |
|------|------|------|
| `app` | 3010 | React/Vite 前端 UI |
| `server` | 3001 | Hono API、CopilotKit 运行时、认证、策略引擎、审计 |
| `agent-computer` | 4100 | Chromium 浏览器 + `/workspace` + 浏览器配置 |
| `agent-bot` | 4200 | 基于 AG-UI 的概念验证 Bot |
| `agent-langgraph` | 4201 | LangGraph AG-UI Bot |
| `supervisor` | 4500 | 为每个 Bot 创建独立容器（需要 Docker socket） |
| PostgreSQL + pgvector | 5432 | 产品数据、策略、审计、凭证、通道和组件元数据 |

### CEL 策略示例

```yaml
AGENT_COMPUTER_POLICY: |
  [
    { "action": "deny", "intent": "close tab" },
    { "action": "allow", "tool": "browser.navigate", "page": { "host": "*.google.com" } },
    { "action": "deny", "tool": "shell.exec", "command": ["rm", "-rf", "*"] },
    { "action": "allow", "tool": "shell.exec" }
  ]
```

## 三、快速开始

### 环境要求

- Docker（用于 PostgreSQL 和 Bot 容器）
- Bun 1.3+（运行 App 和 API Server）
- CopilotKit Intelligence 项目（可免费注册或自托管）
- 模型 API Key（OpenAI / Anthropic / Google）

### 安装步骤

```bash
# 1. 克隆并复制环境配置
git clone https://github.com/CopilotKit/OpenBot.git
cd OpenBot
cp .env.example .env

# 2. 获取 CopilotKit Intelligence 凭证
npx --yes copilotkit@latest login
npx --yes copilotkit@latest project select
npx --yes copilotkit@latest license --write
# 将 runtime key 填入 .env 的 INTELLIGENCE_API_KEY

# 3. 填入模型 Key（如 OPENAI_API_KEY）
# 生成加密密钥
openssl rand -base64 32

# 4. 安装并启动
bun install
bash scripts/start.sh
```

### Docker 单容器部署

```bash
docker build -t openbot .
docker run -p 3001:3001 --env-file .env \
  -e EMBEDDED_POSTGRES=on -v openbot-data:/var/lib/postgresql/data openbot
```

## 四、核心特性详解

### 1. 独立工作区与 Shell

Bot 不仅能操作浏览器，还可以在自己的 `/workspace` 中运行命令：

```bash
# Bot 可以在自己的容器中执行 shell
ls /workspace
npm install some-package
python process_data.py
```

所有 Shell 命令同样经过策略检查——可以完全禁止某些危险命令，或只允许特定工具。

### 2. 凭证安全

敏感信息（如 API Key、数据库凭证）通过 `/admin/credentials` 存储时**加密后写入数据库**，API 永不返回原始值，审计日志也只记录"请求了凭证"而非内容：

```bash
# 审计日志记录
{
  "action": "credential.requested",
  "credential_id": "xxx",
  "bot_id": "yyy",
  "timestamp": "..."
}
```

### 3. 支持 Bring Your Own Agent

任何符合 AG-UI 协议的 Agent 端点都可以接入：

```bash
# 在 /agents 页面配置
name: "My LangGraph Agent"
AG-UI endpoint: "https://my-agent.internal/api/ag-ui"
auth header: <write-only stored token>
```

### 4. 组件驱动的响应

Bot 不仅返回文字，还可以返回编译好的 React 组件：

```typescript
// 数据函数授权给组件
function getStockPrice(symbol: string): { price: number } {
  return { price: fetchPrice(symbol) };
}
```

## 五、常见问题与解决方案

**Q: Docker 启动失败，提示权限错误？**

确保 Docker socket 权限允许当前用户访问，或在单用户模式下运行（仅本地开发）：
```bash
OPENBOT_SINGLE_USER=true
```

**Q: 提示 "Missing policy" 阻止了正常操作？**

CEL 策略默认**fail closed**（无匹配规则则拒绝）。在 `AGENT_COMPUTER_POLICY` 中添加 catch-all 规则：
```yaml
{ "action": "allow", "tool": "browser.navigate" }
```

**Q: 如何让 Bot 使用企业 SSO 登录？**

配置 Google / Microsoft / Okta OAuth，或注册企业 SAML/OIDC 供应商。详见 Sign in 部分。

## 六、总结

OpenBot 提供了一个生产级的 AI Agent 平台思路：**每个 Bot 拥有独立计算资源 + 统一策略网关 + 完整审计链**。它的设计哲学——"网关是唯一入口、决策先于执行、记录不可绕过"——对于在企业环境中安全部署 AI Agent 具有重要参考价值。AG-UI 协议的开放性也让它能无缝接入现有的 Agent 生态，值得关注。
