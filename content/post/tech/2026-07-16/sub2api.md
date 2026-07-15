---
title: "Sub2API：把订阅额度做成 AI API 网关，统一管理 Claude / OpenAI / Gemini / Grok"
date: 2026-07-16
description: "Sub2API 是一个用 Go + Vue 构建的开源 AI API 网关，可将 Claude、OpenAI、Gemini、Grok 等订阅账号的额度聚合、按 token 计费并二次分发给团队或 SaaS。本文拆解其架构、调度与部署实战。"
author: "Cheman"
slug: sub2api
draft: false
categories: [技术, 开源]
tags: [GitHub, AI, API网关, 开源, 大模型]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Sub2API**，一个把各类 AI 产品订阅额度「二次分发」成标准 API 的网关平台。如果你手上有多个 Claude / OpenAI / Gemini / Grok 订阅，想把它们统一聚合、按 token 计费、分发给团队或做成小型 SaaS，这个项目值得花十分钟了解一下。

## 一、项目概述

Sub2API 的定位是 **AI API 网关平台（AI API Gateway）**，核心思路是：把上游 AI 产品的订阅账号（OAuth 订阅或 API Key）集中托管在平台侧，再由平台生成统一的 API Key 提供给下游客户端使用，平台负责鉴权、计费、负载均衡和请求转发。

它主要解决几类痛点：

- **额度碎片化**：同一个团队往往持有多个 Claude Pro / ChatGPT Plus / Grok 订阅，分散在各个账号里，难以统一利用。
- **计费不透明**：原生订阅无法做到 token 级用量追踪与成本分摊。
- **协作门槛高**：直接共享订阅账号既违反 ToS，也存在安全隐患。
- **缺乏调度能力**：多账号之间无法做负载均衡、并发控制和限流。

项目核心特性包括：

- **多账号管理**：支持多种上游账号类型（OAuth 订阅、API Key）。
- **API Key 分发**：为下游用户生成并管理 API Key。
- **精准计费**：token 级用量追踪与成本计算。
- **智能调度**：基于粘性会话（sticky session）的智能账号选择。
- **并发控制**：支持每用户、每账号的并发上限。
- **速率限制**：可配置请求级与 token 级限流。
- **内置支付**：集成易支付、支付宝、微信支付、Stripe，支持用户自助充值，无需额外部署支付服务。
- **管理后台**：基于 Web 的监控与管理界面。
- **外部系统集成**：可通过 iframe 嵌入工单等外部系统，扩展后台能力。

> ⚠️ **合规提示**：项目 README 明确声明，使用本项目可能违反 Anthropic 等上游服务商的条款，作者仅用于技术学习与研究，不对账号封禁、服务中断等后果负责。实际部署前请自行评估所在地区的合规风险。

## 二、技术原理

### 整体架构

Sub2API 采用前后端分离的全栈架构，技术栈如下：

| 组件 | 技术 |
|------|------|
| 后端 | Go 1.25.7、Gin、Ent（ORM） |
| 前端 | Vue 3.4+、Vite 5+、TailwindCSS |
| 数据库 | PostgreSQL 15+ |
| 缓存 / 队列 | Redis 7+ |

后端使用 **Gin** 作为 HTTP 框架，**Ent** 做数据建模与迁移；前端是 **Vue 3 + Vite** 的 SPA；PostgreSQL 负责持久化（用户、账号、分组、用量等），Redis 承担缓存、分布式锁与调度协调（例如 WebSocket 连接的全局并发上限就通过 Redis 租约实现）。

### 请求流转

一次典型的下游请求流程如下：

1. 客户端携带 Sub2API 分配的 `sk-` 开头的 API Key 请求网关，例如 `/v1/messages`、`/v1/chat/completions` 或 OpenAI Responses 系列的 `/v1/responses`。
2. 网关校验 API Key，定位到该 Key 所属的分组（group）。
3. **智能调度器**根据粘性会话策略，从分组内绑定的上游账号中挑选一个（同一会话尽量路由到同一账号，保证上下文连续）。
4. 网关将请求协议转换为上游所需格式后转发（例如把 Anthropic Messages 转换为 xAI Responses，或把请求转发到 `api.x.ai`）。
5. 上游响应返回后，网关按 token 用量记账，并将结果流式返回给客户端。

不同上游有各自的协议适配层：Claude/Anthropic、OpenAI、Gemini、Grok/xAI、Antigravity 都有专门的路由与转换逻辑。例如 Grok 的订阅账号会走 `cli-chat-proxy.grok.com/v1`，而 API Key 账号则走 `https://api.x.ai/v1`。

### 账号与计费模型

账号分两类：

- **OAuth 订阅账号**：使用 PKCE 授权码流程，无需在代码或配置中提交任何私钥。默认 client 信息可全部通过环境变量覆盖。
- **API Key 账号**：直接填写上游 base_url 和 key 即可。

计费是 **token 级** 的：每次成功后按上游返回的用量信息记账。对于 xAI 这类「配额被动」的提供商，Sub2API 不会凭空编造订阅额度，而是记录上游在成功或限流响应中下发的白名单限流头；在拿到首个可用上游响应之前，后台会把配额显示为 unknown，但仍展示本地用量统计。

### 调度与容错

调度器对上游错误有清晰的分级处理：

- `401`：暂时把凭证失效的账号移出调度池。
- `403`：当作权限 / 权益失败，而不是陷入 token 刷新的死循环。
- `429`：依据 `Retry-After` 或短暂冷却，把账号暂时移出调度。

WebSocket 方面，`gateway.openai_ws` 通过 Redis 的 60 秒租约（每 20 秒续租）协调全局客户端连接数上限，避免单机超出配额。

### 安全设计

配置项里提供了多层安全开关：

- `cors.allowed_origins`：CORS 白名单。
- `security.url_allowlist`：上游 / 价格 / CRS 主机白名单。
- `security.response_headers`：可配置响应头过滤。
- `security.csp`：Content-Security-Policy 控制。
- `billing.circuit_breaker`：计费异常时 fail-closed。
- `turnstile.required`：release 模式下强制人机校验。
- `server.trusted_proxies`：启用 `X-Forwarded-For` 解析。

值得注意的是，当关闭 URL 校验（`security.url_allowlist.enabled=false`）时，系统默认**允许 HTTP URL**（开发便利模式）。生产环境务必显式收紧为 HTTPS-only：

```yaml
security:
  url_allowlist:
    enabled: false          # 关闭白名单校验
    allow_insecure_http: false   # 生产务必设为 false，仅允许 HTTPS
```

### 构建方式

从 Dockerfile 可以看出，项目采用多阶段构建：先构建 Vue 前端，再把 `dist` 嵌入 Go 后端（需要 `-tags embed`），最终生成基于 Alpine 的精简镜像，以非 root 用户运行，并带 `/health` 健康检查：

```dockerfile
# Stage 2 编译后端（必须嵌入前端）
RUN CGO_ENABLED=0 GOOS=linux go build \
    -tags embed \
    -ldflags="-s -w -X main.Version=${VERSION_VALUE} ..." \
    -trimpath -o /app/sub2api ./cmd/server
```

## 三、安装与快速开始

Sub2API 提供四种部署方式，最常用的是前两种。

### 方式一：一键脚本安装（推荐给裸机）

前置条件：Linux（amd64/arm64）、PostgreSQL 15+、Redis 7+、root 权限。

```bash
curl -sSL https://raw.githubusercontent.com/Wei-Shaw/sub2api/main/deploy/install.sh | sudo bash
sudo systemctl start sub2api
sudo systemctl enable sub2api
# 浏览器打开 http://YOUR_SERVER_IP:8080 进入设置向导
```

脚本会下载最新 Release、安装到 `/opt/sub2api`、创建 systemd 服务并初始化系统用户。后续升级可直接在管理后台点击左上角「Check for Updates」。

### 方式二：Docker Compose（推荐，含 PG/Redis）

前置条件：Docker 20.10+、Docker Compose v2+。

```bash
mkdir -p sub2api-deploy && cd sub2api-deploy
curl -sSL https://raw.githubusercontent.com/Wei-Shaw/sub2api/main/deploy/docker-deploy.sh | bash
docker compose up -d
docker compose logs -f sub2api
```

自动化脚本会下载 `docker-compose.local.yml`（落盘为 `docker-compose.yml`）与 `.env.example`，并用 `openssl rand` 自动生成 `JWT_SECRET`、`TOTP_ENCRYPTION_KEY`、`POSTGRES_PASSWORD` 等安全凭证，同时创建本地数据目录，便于备份与迁移。

### 方式三 / 四：Apple container 与源码构建

Apple 芯片 Mac（macOS 26）可用 `./apple-container.sh` 跑完整栈；源码构建则需 Go 1.21+、Node 18+，前端用 pnpm 构建后，后端以 `-tags embed` 编译：

```bash
cd frontend && pnpm install && pnpm run build
cd ../backend
VERSION="$(./scripts/resolve-version.sh)"
go build -tags embed -ldflags="-X main.Version=${VERSION}" -o sub2api ./cmd/server
```

> 注意：`-tags embed` 会把前端打包进二进制；不带该 flag 时二进制不会对外提供前端 UI。

## 四、使用方法与实战

### 创建管理员账号

**初始管理员账号只能通过首次运行时的设置向导创建**（访问 `http://<host>:8080`）。一个常见坑：如果你在启动前手动创建了 `config.yaml`，服务器会检测到已有配置而跳过向导，直接进入正常模式且 `users` 表为空，导致首次登录报 `invalid email or password`。

解决方案是临时把 `config.yaml` 移走，让向导生成它：

```bash
mv config.yaml config.yaml.bak
./sub2api        # 向导运行并写入全新 config.yaml
# Ctrl+C 停止后恢复你的配置
mv config.yaml.bak config.yaml
./sub2api        # 用刚创建的管理员登录
```

### 添加上游账号并分发 Key

1. 在后台添加上游账号（如 Claude OAuth、OpenAI、Gemini、Grok 或 Antigravity），完成授权或填写 Key。
2. 创建一个分组（group），把账号绑定进去。
3. 为该分组生成 Sub2API API Key（`sk-` 前缀）。
4. 在用户的 API Key 页面点击「Use Key」，选择对应客户端（如 Claude CLI / Grok CLI）即可一键生成配置文件。

### 客户端接入示例

以 Claude Code 接入 Antigravity 账号为例：

```bash
export ANTHROPIC_BASE_URL="http://localhost:8080/antigravity"
export ANTHROPIC_AUTH_TOKEN="sk-xxx"
```

Grok CLI 则把 Sub2API 的 URL（以 `/v1` 结尾）填进 `~/.grok/config.toml`：

```toml
[model."grok"]
model = "grok-4.5"
base_url = "https://your-sub2api.example.com/v1"
name = "Grok 4.5"
api_key = "sk-your-sub2api-key"
api_backend = "responses"
```

### 实战场景：聚合团队订阅供 Claude Code 使用

假设你和同事各有一个 Claude Pro 订阅，可以：

- 在后台分别添加两个 Claude OAuth 订阅账号；
- 建一个分组并把两个账号绑进去，开启智能调度；
- 生成一把 `sk-` Key 分发给团队；
- 所有人用同一把 Key 配置 Claude Code，网关自动在两端订阅间做负载均衡与粘性会话。

### 其他实用配置

- **Simple Mode**：个人 / 内部团队可用 `RUN_MODE=simple` 隐藏 SaaS 相关功能并跳过计费流程；生产环境需同时设置 `SIMPLE_MODE_CONFIRM=true` 才允许启动。
- **Nginx 反代**：用 Nginx 给 Sub2API 做反代时，务必在 `http` 块加 `underscores_in_headers on;`，否则含下划线的头（如 `session_id`）会被丢弃，破坏粘性会话路由。

## 五、常见问题与解决方案

**首次登录提示 `invalid email or password`**
原因多是 `config.yaml` 已存在导致设置向导被跳过。按上文「创建管理员账号」把 `config.yaml` 临时移走，让向导跑一次即可。

**生产环境如何避免明文传输风险**
默认关闭 URL 校验时会允许 HTTP。生产务必设置 `SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP=false`（或等价 YAML），仅允许 HTTPS，并对网络层做出口白名单与 TLS-only 加固。

**Nginx 下粘性会话失效 / 多账号路由错乱**
在 Nginx `http` 块加入 `underscores_in_headers on;`。

**Grok OAuth 凭证过期**
后台提供了 `POST /api/v1/admin/grok/oauth/refresh-token` 等端点用于校验或刷新 refresh token，也可在管理界面直接重新授权。

**Sora 相关功能不可用**
README 明确说明 Sora 功能因上游集成与媒体投递的技术问题暂时不可用，请勿在生产依赖；相关配置键已保留但暂未生效。

**如何升级**
Docker 部署：`docker compose -f docker-compose.local.yml pull && docker compose -f docker-compose.local.yml up -d`。二进制部署：后台「Check for Updates」一键升级并支持回滚。

## 六、总结

Sub2API 是一个定位清晰、工程完成度很高的开源 AI API 网关：用 **Go + Vue 全栈 + Ent + Redis** 实现了多上游协议转换、token 级计费、粘性会话调度和分布式并发控制，部署上也覆盖了脚本、Docker Compose、Apple container 与源码构建四种路径，还内置了支付与管理后台，对想做内部额度聚合或小团队 SaaS 的开发者非常友好。

它的技术亮点在于把「订阅账号」抽象成可统一调度的上游资源，并用 Redis 协调全局配额与并发；上手门槛也不高，一条 `docker compose up -d` 就能跑起来。需要提醒的是，项目本身带有 ToS 与合规风险提示，生产使用前请务必自行评估风险。项目以 **LGPL-3.0** 协议开源，感兴趣的读者可以到 [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api) 进一步研究源码。
