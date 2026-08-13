---
title: "Nasiko：一个开源的 AI Agent 控制平面，一键部署任何 A2A 智能体"
date: 2026-08-13
description: "Nasiko 是由 Nasiko-Labs 开发的开源 AI Agent 控制平面，通过单一二进制程序为所有 Agent 提供路由、工具访问、密钥管理与可观测性，彻底解决多 Agent 协作时的运维难题。"
author: "Cheman"
slug: nasiko
draft: false
categories: ["AI", "开源", "技术"]
tags: ["AI Agent", "A2A协议", "Rust", "开源", "智能体"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Nasiko**，它是一个开源的 AI Agent 控制平面，用一个命令就能部署任何符合 A2A 协议的智能体，同时提供路由、工具访问、密钥管理和完整的可观测性支持。

## 一、项目概述

随着 AI Agent 应用场景的扩展，管理多个 Agent 之间的协作很快就会变成一场运维噩梦：谁调用谁、每个 Agent 持有哪些密钥、某次调用花了多少 token、为什么失败了…… Nasiko 正是为解决这些问题而生。

**核心能力一览：**

- **A2A 协议兼容**：支持 Python、Rust、Go、TypeScript 等任何语言实现了 HTTP 服务器的 Agent，`nasiko deploy` 一键构建、推送并运行。
- **三层路由引擎**：通过 embedding 相似度初筛 → 对话上下文重排序 → LLM 最终精选的三阶段管道，自动为查询匹配合适的 Agent，调用方无需了解整个 Agent 集群。
- **统一 TLS 入口**：服务器终止 TLS、认证每个请求、代理所有 Agent 间通信，所有节点从不暴露在公网，每个代理跳转都是限速、ACL 和链路追踪的检查点。
- **MCP Gateway**：通过一个永久 URL 为每个 Agent 提供经权限过滤的 Composio 工具包和通用 MCP 服务器统一视图，Agent 本身永不持有底层凭证。
- **LLM Router**：Agent 获取 `OPENAI_BASE_URL` 和临时 Nasiko 身份令牌，路由器在服务端解析真实 Provider/模型/密钥并翻译请求，Agent 及其日志永不暴露真实 API Key。
- **完整可观测性**：每次调度和代理跳转都发出真实的 OTel Span，多 Agent 交互全程一条 Trace，token 消耗与成本自动从 `gen_ai.*` 属性中提取。
- **流控守卫**：基于 Redis 的级联限制（深度、扇出、token 预算、超时、循环检测）可在 Agent 间互相调用的失控循环演变成故障前将其阻断。
- **密钥加密存储**：每个 Agent 的密钥使用 AES-256-GCM 静态加密，仅在部署时注入容器。
- **访问控制**：用户→Agent 所有权/授权和 Agent→Agent 白名单相互独立地控制每次代理调用。
- **嵌入式 OCI Registry**：`nasiko push`/`nasiko deploy` 直接将镜像发往自托管的 S3 后端 Registry，支持层去重。

## 二、技术架构与原理

### 2.1 整体架构

Nasiko 的设计哲学是"**没有单独的网关进程**"——所有 Agent 间调用都通过服务器反向代理，服务器是实施流控、ACL 和可观测性的唯一检查点。持久化状态存放在 Postgres、Redis 和 S3 中。

```
Client / CLI ───────► │         nasiko-server           │
                       │  CORS · tracing · auth · rate  │
                       │  ├─ API routes                 │
                       │  ├─ Routing engine (三层路由)  │
                       │  ├─ MCP Gateway                │
                       │  ├─ LLM Router                 │
                       │  ├─ Embedded OCI registry     │
                       │  └─ Embedded UI               │
                       └────────────────┬──────────────┘
                                          │ 仅代理 A2A 调用
                                          ▼
                         Agent containers (Docker runtime)
```

### 2.2 核心技术栈

Nasiko 全部使用 Rust 编写，关键依赖包括：

| 组件 | 技术选型 | 选型理由 |
|------|----------|----------|
| Web 框架 | Axum 0.8 | 高性能、类型安全、async |
| ORM / 数据库 | sqlx 0.8 | 编译时检查 SQL、同步/异步统一 |
| HTTP 客户端 | reqwest | 统一 HTTP 调用 |
| CLI | Clap 4 | 声明式 CLI、类型安全 |
| 容器运行时 | bollard (Docker) | Rust 原生 Docker API |
| 可观测性 | OpenTelemetry | 业界标准追踪协议 |
| AWS 存储 | aws-sdk-s3 | S3 兼容对象存储 |

从 `Cargo.toml` 可以看出，项目采用了 **workspace 多 crate 结构**，各模块职责清晰分离：

```toml
# orchestrator/ 路由引擎：语义 Agent 选择
# mcp-gateway/   MCP 网关：工具聚合、权限过滤
# llm-router/     LLM 路由器：Provider 无感的 OpenAI 兼容出口
# oci/            内嵌 OCI Distribution v2 Registry（S3 后端）
# flow/           流控守卫：防级联 DoS
# secrets/        AES-256-GCM 加密存储
# runtime/        ContainerRuntime trait + DockerRuntime (bollard)
# auth/           JWT 登录、RBAC 钩子
# agent-proxy/    Agent ID → 运行时容器端点解析
```

### 2.3 三层路由引擎详解

这是 Nasiko 最核心的创新点。当外部请求进来时，路由引擎按以下顺序处理：

```rust
// orchestrator/src/lib.rs (概念示例)
pub struct RoutingEngine {
    embedding_model: EmbeddingModel,
    reranker: RerankerModel,
    llm_selector: LLM,
}

impl RoutingEngine {
    pub async fn route(&self, query: &str, ctx: &ConversationCtx)
        -> AgentId
    {
        // Stage 1: embedding 相似度初筛
        let shortlist = self.embedding_model
            .top_k(query, k=20)
            .await?;

        // Stage 2: 对话上下文重排序
        let reranked = self.reranker
            .rerank(query, &shortlist, ctx)
            .await?;

        // Stage 3: LLM 最终精选
        let selected = self.llm_selector
            .pick_one(query, &reranked)
            .await?;

        Ok(selected)
    }
}
```

这种设计的优势在于：调用方完全不需要了解集群中有哪些 Agent，系统自动根据语义匹配合适的 Agent，支持动态扩缩容。

### 2.4 MCP Gateway 的权限模型

MCP Gateway 为每个 Agent 提供独立的工具视图，权限过滤在网关层完成：

```rust
// mcp-gateway/src/connector.rs (概念)
pub struct AgentToolScope {
    agent_id: AgentId,
    allowed_tools: Vec<ToolId>,    // 白名单
    denied_tools: Vec<ToolId>,     // 黑名单（优先级更高）
    rate_limit: RateLimit,
}

impl MCPGateway {
    pub fn tools_call(
        &self,
        agent: &AgentId,
        request: ToolsCallRequest,
    ) -> Result<ToolsCallResponse> {
        // 权限检查
        let scope = self.get_agent_scope(agent)?;
        ensure!(scope.allowed_tools.contains(&request.tool_id))?;
        ensure!(!scope.denied_tools.contains(&request.tool_id))?;
        // 限速检查
        self.rate_limiter.check(agent, &request.tool_id)?;
        // 代理调用
        self.forward_to_mcp_server(request).await
    }
}
```

### 2.5 LLM Router 的密钥安全机制

Agent 永远不直接持有真实 Provider 的 API Key，而是通过 LLM Router 间接访问：

```
Agent 代码                          Nasiko Server
   │                                    │
   ├─ env: OPENAI_BASE_URL=localhost   │
   ├─ env: NASIKO_TOKEN=<临时令牌>      │
   │                                    │
   ├─ HTTP POST /v1/chat/completions    ├─ 验证令牌
   │  (携带 nasiko-token header)        ├─ 解析实际模型
   │                                    ├─ 用真实 OPENAI_API_KEY 转发
   │                                    └─ 响应翻译后返回
   │
   └─ 收到 OpenAI 兼容响应              └─ 真实密钥从不暴露给 Agent
```

这样即使用户日志被泄露，攻击者也拿不到真实的 API Key。

## 三、安装与快速开始

### 3.1 环境要求

- Docker（或 Podman）
- Rust 工具链（通过 [rustup](https://rustup.rs) 安装 stable 版本）
- `just` 命令行工具：`cargo install just`

### 3.2 快速启动（5 步完成）

```bash
# Step 1: 启动基础设施（Postgres + Redis + MinIO）
just infra

# Step 2: 配置环境变量
cp oss/server/.env.example oss/server/.env
# 编辑 oss/server/.env，至少设置 OPENAI_API_KEY 和 SECRETS_ENCRYPTION_KEY

# Step 3: 启动平台（一键启动 infra + OSS server）
just run-stack
# 服务器监听 :9090，是唯一的 TLS 终止入口

# Step 4: 安装 CLI 并部署 Agent
cargo build --release -p nasiko
sudo cp target/release/nasiko /usr/local/bin/

nasiko connect http://localhost:9090
nasiko login
nasiko new openai my-agent && cd my-agent
nasiko deploy .

# Step 5: 开始对话
nasiko chat "Hello"
```

### 3.3 关键环境变量

| 变量 | 用途 | 必填 |
|------|------|------|
| `DATABASE_URL` | Postgres 连接 | ✅ |
| `REDIS_URL` | Redis 连接 | ✅ |
| `S3_*` | OCI Registry 对象存储 | ✅ |
| `SECRETS_ENCRYPTION_KEY` | 密钥加密密钥（Base64, 32字节） | ✅ |
| `OPENAI_API_KEY` | LLM Provider | 推荐 |
| `FLOW_MAX_DEPTH` | 最大 Agent 调用深度 | 可选 |
| `FLOW_MAX_FAN_OUT` | 最大扇出数 | 可选 |

## 四、使用方法与实战

### 4.1 CLI 核心命令一览

| 命令 | 作用 |
|------|------|
| `nasiko up/down` | 启停本地 Nasiko 栈 |
| `nasiko connect <url>` | 注册控制平面并切换 |
| `nasiko login` | 认证到当前集群 |
| `nasiko new [template] [name]` | 脚手架新建 Agent 项目 |
| `nasiko build / run` | 本地构建 / 构建并运行 Agent |
| `nasiko deploy <image>` | 构建、推送并部署到集群 |
| `nasiko upload [source]` | 上传源码（无需本地 Docker） |
| `nasiko ps` | 列出运行中的 Agent |
| `nasiko logs <agent> -f` | 实时查看并跟踪 Agent 日志 |
| `nasiko chat <agent>` | 交互式或一次性 A2A 对话 |
| `nasiko scale <agent> <n>` | 将 Agent 扩缩容到 N 副本 |
| `nasiko secrets set` | 配置加密的 Agent 密钥 |
| `nasiko mcp` | 管理 MCP Gateway 连接器和工具权限 |

### 4.2 Agent 扩展实战：以 GitHub Import 为例

Nasiko 支持从 GitHub 直接导入源码并构建部署：

```bash
# 一行命令完成：拉取源码 → 构建 Docker 镜像 → 部署运行
nasiko upload https://github.com/my-org/my-agent
nasiko chat "my-agent"
```

### 4.3 MCP 工具接入实战

通过 MCP Gateway 接入 Composio 工具包：

```bash
# 配置 MCP 连接器（以 Composio 为例）
nasiko mcp add composio --api-key <your-key>

# 配置哪些 Agent 有权访问哪些工具
nasiko mcp grant my-agent "github.*" --tools "github.create_issue,github.list_repos"

# Agent 现在可以通过标准 MCP 协议调用工具了
nasiko chat "my-agent" "帮我创建一个 GitHub Issue"
```

## 五、常见问题与解决方案

### Q1: `nasiko deploy` 报 Docker 权限错误

**原因**：当前用户不在 Docker 用户组中。

**解决：**
```bash
# 方法一：将用户加入 docker 组（需重新登录）
sudo usermod -aG docker $USER
newgrp docker

# 方法二：使用 Podman 替代 Docker
export AGENT_RUNTIME=podman
nasiko deploy .
```

### Q2: 启动时报 `SECRETS_ENCRYPTION_KEY not set`

**原因**：生产环境必须设置加密密钥。

**解决：**
```bash
# 生成一个 32 字节 Base64 编码的密钥
openssl rand -base64 32

# 将其写入 .env
echo "SECRETS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> oss/server/.env
```

### Q3: 多 Agent 调用超过 `FLOW_MAX_DEPTH` 被拦截

**原因**：流控守卫检测到调用链过深或形成循环。

**解决：** 在 `.env` 中调高限制，或在代码中避免不必要的深度调用链：
```bash
export FLOW_MAX_DEPTH=10
export FLOW_MAX_FAN_OUT=5
export FLOW_TIMEOUT_SECS=120
```

### Q4: LLM Router 报 `model not found`

**原因**：`ROUTER_MODEL` 设置的模型在配置的 Provider 中不可用。

**解决：** 检查 Provider API 支持的模型列表，或在 `.env` 中设置与 Provider 匹配的模型名：
```bash
export ROUTER_MODEL=gpt-4o
export EMBEDDING_MODEL=text-embedding-3-small
```

### Q5: 嵌入式 OCI Registry 推送失败

**原因**：MinIO/S3 配置不正确或存储空间不足。

**解决：**
```bash
# 检查 .env 中 S3 配置是否正确
# 确保 MinIO 容器正常运行
docker ps | grep minio

# 查看 MinIO 控制台确认 bucket 存在
open http://localhost:9001
```

## 六、总结

Nasiko 解决了一个非常实在的问题：当你的 AI 应用从单 Agent 扩展到多 Agent 协作时，运维复杂度会急剧上升，而 Nasiko 用一个精心设计的三层路由引擎 + 统一代理入口 + 嵌入式 OCI Registry + 完整的可观测性，让多 Agent 系统的运维变得像单 Agent 一样简单。

项目代码质量很高（Rust 实现、零 Clippy 警告、完整的 OTel 集成），架构设计也非常清晰，非常值得作为学习多 Agent 系统架构的参考项目。如果你正在构建 AI Agent 应用，不妨试试 Nasiko，一个命令就能体验到完整的多 Agent 协作平台。
