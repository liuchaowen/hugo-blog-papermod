---
title: "OpenClaw Zero Token：零 API 密钥免费调用所有主流大模型"
date: "2026-08-05"
description: "OpenClaw Zero Token 是 OpenClaw 的一个 fork，专注于通过浏览器登录的方式彻底移除 API token 成本，支持 DeepSeek、Qwen、Kimi、Claude、ChatGPT、Gemini 等十余个主流模型。"
author: "Cheman"
slug: "openclaw-zero-token"
draft: false
categories: ["技术", "开源"]
tags: ["AI", "开源", "大模型", "OpenClaw", "工具调用"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenClaw Zero Token**，它通过驱动浏览器网页端 UI 的方式，彻底省去了购买 API 密钥的成本——只需浏览器登录一次，就能免费调用 DeepSeek、Qwen、Kimi、Claude、ChatGPT、Gemini 等十余个主流大模型。

## 一、项目概述

OpenClaw Zero Token 是 [OpenClaw](https://github.com/openclaw/openclaw) 的一个社区分支，核心理念是：**用浏览器替代 API，用登录替代付费**。项目将各个模型厂商的网页版作为后端，通过 Playwright CDP 拦截登录态（Cookie + Bearer Token），存入本地 `auth.json`，之后再调用模型厂商的内部 Web API 完成对话。

相比传统 API 调用的成本对比：

| 传统方式 | Zero Token 方式 |
|---|---|
| 购买 API 密钥 | **完全免费** |
| 按请求计费 | 无强制配额 |
| 需要信用卡 | 仅需浏览器登录 |
| API 密钥存在泄露风险 | 凭证仅存储在本地 |

支持的模型厂商（均已实测可用）：

- DeepSeek（deepseek-chat、deepseek-reasoner）
- Qwen 国际版 / 国内版（Qwen 3.5 Plus、Turbo）
- Kimi（Moonshot v1 8K / 32K / 128K）
- Claude Web（claude-sonnet-4-6、claude-opus-4-6、claude-haiku-4-6）
- ChatGPT Web（GPT-4、GPT-4 Turbo）
- Gemini Web（Gemini Pro、Ultra）
- Grok Web（Grok 1、Grok 2）
- 智谱 GLM（国内版 + 国际版）
- 小米 MiMo（MiMo 2.0、MiMo 2.5 Pro）
- Doubao（doubao-seed-2.0、doubao-pro）
- Manus API（免费配额）

## 二、技术原理

### 整体架构

```
┌────────────────────────────────────────────────────────────┐
│                    OpenClaw Zero Token                     │
├────────────────────────────────────────────────────────────┤
│  Web UI (Lit 3.x)  │  CLI/TUI  │  Gateway (Port API)  │ Channels │
│                     └───────────┴───────────────────┘        │
│                              │                               │
│                     ┌────────▼────────┐                     │
│                     │   Agent Core    │                     │
│                     │  (PI-AI Engine) │                     │
│                     └────────┬────────┘                     │
│                              │                               │
│  DeepSeek Web │ Qwen Web │ Kimi │ Claude Web │ ChatGPT ... │
└────────────────────────────────────────────────────────────┘
```

### 认证流程（以 DeepSeek 为例）

核心思路是"中间人攻击"——不破解任何加密协议，只在用户主动登录后抓取浏览器中已存在的凭证：

1. **启动浏览器**：通过 `start-chrome-debug.sh` 启动 Chrome 调试模式（CDP 端口 18892）
2. **用户登录**：在浏览器中打开 `chat.deepseek.com`，正常扫码/密码登录
3. **拦截凭证**：Playwright CDP 监听网络请求，从 Authorization Header 和 Cookie 中提取凭证
4. **持久化存储**：存入 `auth.json`（`{ cookie, bearer, userAgent }`），永不提交到 Git
5. **调用 Web API**：用存储的凭证直接调用 DeepSeek 的内部 Web API，绕过登录墙

关键源码位置在 `src/zero-token/providers/deepseek-web-auth.ts` 和 `src/zero-token/providers/deepseek-web-client.ts`。

### 工具调用（Tool Calling）

项目基于 [arXiv:2407.04997](https://arxiv.org/html/2407.04997v1) 实现了 **Prompt 注入式工具调用**：在用户消息包含工具相关关键词时，自动在 system prompt 中注入工具定义，让 Web 模型也能调用本地工具（`web_search`、`web_fetch`、`exec`、`read`、`write`、`message`）。

目前 11/13 个 Web 模型已验证支持工具调用：

| 模型 | 工具调用 | 聊天 | 备注 |
|---|---|---|---|
| DeepSeek | ✅ | ✅ | exec: 列出桌面文件 |
| Kimi | ✅ | ✅ | 全部 6 个工具已验证 |
| Claude | ✅ | ✅ | web_search 正常 |
| ChatGPT | ✅ | ✅ | web_search 正常 |
| Qwen CN/Web | ✅ | ✅ | web_search 正常 |
| Grok | ✅ | ✅ | web_search 正常 |
| Gemini | ✅ | ⚠️ | web_search 正常，DOM 轮询不稳定 |
| GLM | ✅ | ✅ | 工具调用和聊天均正常 |
| 小米 MiMo | ✅ | ✅ | web_search 正常 |

### AskOnce：一次提问，多模型并行回答

项目内置了一个"多模型广播"功能，发送一条消息给所有已配置的模型，实时展示各模型的回复对比，非常适合模型选型测试。

## 三、安装与快速开始

### 环境要求

- Node.js ≥ 22.12.0
- pnpm ≥ 9.0.0
- Chrome 浏览器（Chrome/Edge/QQ 浏览器均可）
- 系统：macOS、Linux 或 Windows WSL2

### 安装步骤

```bash
# 1. 克隆并构建
git clone https://github.com/linuxhsj/openclaw-zero-token.git
cd openclaw-zero-token
pnpm install && pnpm build && pnpm ui:build

# 2. 启动 Chrome 调试模式（保持此终端窗口打开）
./start-chrome-debug.sh

# 3. 在浏览器中登录各模型官网
# 打开的标签页中登录 DeepSeek、Qwen、Kimi、Claude、ChatGPT 等

# 4. 运行认证向导（选择 webauth 模式）
./onboard.sh webauth

# 5. 启动网关服务
./server.sh
```

服务启动后，打开 Web UI 地址即可开始聊天。日常使用时只需执行 `start-chrome-debug.sh` → `onboard.sh` → `server.sh` 三步。

### HTTP API 调用示例

```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-web/deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 模型切换

在聊天框中使用 `/model` 命令：

```bash
/model claude-web/claude-sonnet-4-6
/model doubao-web/doubao-seed-2.0
/model deepseek-web/deepseek-chat
```

查看所有可用模型：

```bash
/models
```

## 四、使用方法与实战

### Docker 部署

项目提供了完整的 Dockerfile，支持 Docker/Buildx/Podman：

```bash
# 普通镜像
docker build .

# Slim 镜像（更小）
docker build --build-arg OPENCLAW_VARIANT=slim .

# 预装 Chromium（避免每次启动时下载浏览器）
docker build --build-arg OPENCLAW_INSTALL_BROWSER=1 .

# 启用沙箱（需要 Docker CLI）
docker build --build-arg OPENCLAW_INSTALL_DOCKER_CLI=1 .
```

### 新增模型平台

扩展新的 Web 模型只需三步：

1. **认证模块** `src/zero-token/providers/{platform}-web-auth.ts`：自动化浏览器登录并捕获凭证
2. **API 客户端** `src/zero-token/providers/{platform}-web-client*.ts`：封装 Web API 调用逻辑
3. **流处理** `src/zero-token/streams/{platform}-web-stream.ts`：处理流式响应格式

## 五、常见问题与解决方案

**Q: 首次运行报错 `ERR_MODULE_NOT_FOUND`**
A: 执行完整重建：
```bash
rm -rf dist dist-runtime node_modules
pnpm install && pnpm build && pnpm ui:build
./server.sh restart
```

**Q: 提示缺少目录**
A: 使用内置 doctor 命令：
```bash
node dist/index.mjs doctor
```
会自动检查并创建缺失目录、修复权限问题、检测冲突的状态目录。

**Q: 提示未配置任何 provider**
A: 需要先运行 `./onboard.sh webauth` 配置至少一个模型账号，`/models` 命令才能显示可用模型。

**Q: Claude Web 模型切换后无法解析**
A: 建议使用完整模型 ID：`/model claude-web/claude-sonnet-4-6`，而非仅 `/model claude-web`。

**Q: Web 会话过期**
A: 当前版本需要定期重新登录。自动刷新 Web 会话是 Roadmap 中的计划功能。

## 六、总结

OpenClaw Zero Token 的思路非常巧妙——它不破解任何加密协议，也不违反平台 TOS（凭证由用户自己提供），却让每个人都能零成本使用所有主流大模型。对于个人学习、工具开发、模型评测等场景，这是一个非常实用的解决方案。

如果你有多个模型厂商的账号，又不想为每个平台付 API 费，这个项目值得一试。
