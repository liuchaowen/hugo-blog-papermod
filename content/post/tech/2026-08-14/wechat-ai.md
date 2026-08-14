---
title: "WeChat-AI：自托管微信角色扮演机器人，支持 iLink 多节点部署"
date: "2026-08-14"
description: "WeChat-AI 是一个基于腾讯 iLink 协议的开源微信角色扮演机器人，支持 LINUX DO OAuth 登录、远端 Redis 存储、Chatflow 可视化编排，并可通过 Cloudflare Worker 实现多节点负载均衡部署。"
author: "Cheman"
slug: "wechat-ai"
draft: false
categories: ["技术", "开源"]
tags: ["微信", "iLink", "AI", "开源", "Docker", "Redis"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**WeChat-AI**，一个自托管的微信角色扮演对话服务，通过腾讯 iLink 协议直连微信，配合 Redis 实现分布式多节点部署，同时支持 LINUX DO OAuth 做用户鉴权，整体架构设计相当工程化。

## 一、项目概述

WeChat-AI 的核心目标是在微信生态内实现 AI 角色扮演机器人托管。用户通过 LINUX DO OAuth 登录后，可以在用户中心扫码绑定自己的微信机器人、分配人设（persona），然后通过微信内 `@用户名` 的方式发起对话请求，对端用户回复 `/同意` 后即可建立双向消息中继，由大语言模型生成回复并通过 iLink 协议推送回微信。

**核心功能一览：**

- **LINUX DO OAuth 登录**：同时支持普通用户和管理员两种角色登录，管理员拥有完整后台权限
- **多 Bot 管理**：一个用户可添加多个微信机器人，每个机器人可独立分配人设
- **P2P 对话中继**：微信内通过 @提及 发起对话请求，对方同意后双向中继消息
- **表情包广场**：用户可投稿表情包，支持图片恶意检测，审核后公开
- **Chatflow 可视化编排**：通过 `/chatflow` 进入编辑器，人设支持 prompt 模式或 chatflow 模式
- **入站图片理解**：开启 `VISION_ENABLED` 后可处理用户发送的图片
- **入站语音转写**：利用微信自带的语音转文字能力，默认开启
- **OTA 增量更新**：支持文件差量更新 + 自动重启，降低升级成本

## 二、技术原理

### 2.1 整体架构

项目采用典型的前后端分离 + 消息中间件架构：

```
微信用户 ──► 腾讯 iLink ──► WeChat-AI 多节点（收消息 / 人设+记忆 / LLM / 回消息）
                                            ↑
                                        共享 Redis（Upstash）
浏览器 ──► Cloudflare Worker（主域名 LB）──► Node-1 … Node-N
```

微信用户的消息经 iLink 协议送达服务端节点，节点从 Redis 中读取 Bot Token 和人设配置，调用 OpenAI 兼容的 LLM 生成回复，最后通过 iLink 发送回微信。浏览器端所有请求统一经由 Cloudflare Worker 进行负载均衡分发，各节点运行同一 Docker 镜像，共享同一个 Upstash Redis 实例。

### 2.2 iLink 协议适配

iLink 是腾讯内部的 IM 协议，项目中封装在 `packages/ilink` 包中，通过 HTTP 客户端与腾讯 iLink 服务交互。核心能力包括：

- `getconfig`：获取 Bot 配置，包含接收消息的回调地址等
- `sendmsg`：发送文字消息
- `sendtyping`：发送输入状态指示（typing indicator）
- `sendimage`：通过 iLink CDN 发送图片（表情包）

项目文档明确指出，iLink 协议以实测为准，字段可能随时变更，适配层代码需保持与上游同步。

### 2.3 多节点与负载均衡

每个节点运行相同的 Docker 镜像，通过环境变量 `REDIS_URL` 连接 Upstash Redis，Bot Token 和用户数据均存储在 Redis 中。Cloudflare Worker（`cloudflare-worker/`）作为唯一入口，负责：

- **健康检查**：探测各节点的可用性
- **轮询分流**：将请求均匀分配到健康节点
- **跨域隔离**：源站 IP 仅保存在 Worker 的环境变量中，对外不可见

这种设计使得新增节点只需在 Worker 的 `ORIGINS` 数组中追加地址，无需修改任何业务代码。

### 2.4 Chatflow 编排引擎

Chatflow 是项目的一大亮点。它在 `packages/core` 中实现了一个可视化编排引擎，人设（persona）不再局限于固定 Prompt，而是可以：

- 通过 DAG（有向无环图）定义对话流程节点
- 每个节点可以是 LLM 调用、工具调用、条件分支等
- 支持多轮对话状态管理

编辑界面通过 `/chatflow` 路由访问，提供可视化的拖拽编排体验。

### 2.5 关键技术栈

- **运行时**：Node.js 22，使用 TypeScript 开发，通过 `tsx` 在生产环境直接运行 TS
- **包管理**：pnpm 11.15.0，Workspace 模式管理多包项目
- **存储**：Upstash Redis（Serverless Redis，支持 `rediss://` 加密连接）
- **AI**：OpenAI 兼容接口，支持用户自定义模型和联网搜索（经 HuggingFace 工具网关出站）
- **部署**：Docker + Docker Compose，Cloudflare Worker 做 LB
- **鉴权**：LINUX DO OAuth 2.0

## 三、安装与快速开始

### 3.1 环境要求

- Node.js ≥ 20
- pnpm ≥ 11
- Docker & Docker Compose（生产部署）
- Upstash Redis 账户（项目默认使用 `rediss://` 加密连接）
- LINUX DO 开发者 OAuth 应用
- 腾讯 iLink 机器人凭证

### 3.2 本地开发

```bash
# 克隆项目
git clone https://github.com/SMNETSTUDIO/WeChat-AI.git
cd WeChat-AI

# 安装依赖
pnpm install

# 复制环境变量模板
cp .env.example .env
# 编辑 .env，填入以下必填项：
# REDIS_URL          — Upstash Redis 连接地址（rediss://...）
# LLM_API_KEY        — LLM 平台 API Key
# LINUXDO_CLIENT_ID  — LINUX DO OAuth Client ID
# LINUXDO_CLIENT_SECRET
# LINUXDO_ADMIN_IDS  — 管理员 UID，逗号分隔

# 初始化数据库（创建默认人设和配置）
pnpm db:seed

# 运行诊断检查
pnpm diag

# 启动开发服务器
pnpm dev
```

本地开发启动后访问 `http://localhost:8787` 即可看到落地页，`/app` 为用户中心，`/admin` 为管理后台。

### 3.3 Docker 一键部署

```bash
# 配置好 .env 后
docker compose up -d --build
```

生产环境推荐使用 Docker Compose，文档参考 `docs/docker.md`。

### 3.4 多节点部署

每台服务器运行同一个 Docker 镜像，共享同一个 Upstash Redis，然后在 Cloudflare Worker 的 `ORIGINS` 中追加节点地址即可。Worker 的 `main` 分支代码示例：

```javascript
const ORIGINS = [
  'https://node1.example.com',
  'https://node2.example.com',
  // 新增节点只需追加一行
];
```

## 四、使用方法与实战

### 4.1 用户端流程

1. 访问 `/app`，使用 LINUX DO 账号登录
2. 在用户中心扫码添加自己的微信机器人
3. 为机器人分配人设（支持 prompt 或 chatflow 模式）
4. 审核通过的私聊用户
5. 在微信中找到该机器人，`@用户名` 发起对话
6. 对方回复 `/同意` 建立连接，此后双方消息实时中继

### 4.2 管理员操作

管理后台（`/admin`）提供：

| 功能 | 说明 |
|------|------|
| 数据面板 | 实时统计消息量、Token 消耗、在线用户数 |
| Token 用量 | 按用户/Bot 查看日消耗报表 |
| 用户与机器人 | 管理用户、Bot 的启用/禁用状态 |
| 部署节点 | 查看各节点健康状态 |
| 表情包审核 | 审核用户提交的表情包，过滤恶意图 |
| 增量更新 | 上传通道包，触发所有节点 OTA |

### 4.3 自定义模型配置

在 `.env` 中指定 `LLM_API_KEY` 即可接入 OpenAI 兼容的任意模型。若需要联网搜索能力，需额外部署 `huggingface/wechat-ai-tools`，并配置：

```
TOOLS_BASE_URL=https://your-huggingface-tools.hf.space
TOOLS_API_KEY=your-hf-token
```

用户还可以在个人设置中自定义使用的模型名称。

### 4.4 表情包使用

主人预先在管理后台的表情包广场上传表情，配置表情 slug 后，LLM 生成回复时引用该 slug，系统自动通过 iLink CDN 发送对应图片。

## 五、常见问题与解决方案

**Q: iLink 消息发送失败怎么办？**
iLink 协议字段可能随腾讯服务更新，建议定期检查 `packages/ilink` 的更新。同时确认 Bot Token 有效且未过期。

**Q: Docker 部署后健康检查失败？**
确认环境变量 `WECHAT_AI_PORT=8787` 与容器暴露端口一致，健康检查端点为 `/health`。

**Q: 多节点部署后消息丢失？**
检查各节点 `REDIS_URL` 是否指向同一个 Upstash 实例，并确认 Cloudflare Worker 的健康检查路径可达。

**Q: 如何开启图片理解？**
在 `.env` 中设置 `VISION_ENABLED=true`，注意这需要一个人设模型具备视觉能力。

**Q: 角色扮演内容隐私问题？**
所有对话内容经 LLM API 出站传输，请评估 Upstash Redis 和 LLM 提供商的隐私政策后使用。

## 六、总结

WeChat-AI 是一个工程化程度相当高的开源项目，架构设计充分考虑了分布式部署、高可用和可扩展性。iLink 协议适配层、Redis 分布式存储、Chatflow 可视化编排以及 Cloudflare Worker 负载均衡的组合，使得这套系统既适合个人极客自建，也具备生产级别的扩展能力。如果你对微信机器人开发、LLM 应用编排或分布式 IM 中继感兴趣，这个项目值得深入研究。
