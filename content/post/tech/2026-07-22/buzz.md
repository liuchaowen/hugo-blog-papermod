---
title: "Buzz：人类与 AI Agent 协作的下一代工作空间"
date: 2026-07-22
description: "Buzz 是 Block 推出的自托管工作空间，基于 Nostr 协议实现人类与 AI Agent 在同一频道协作，支持 Git 集成、工作流自动化和完整的审计追踪，让 Agent 成为真正的团队成员而非机器人。"
author: "Cheman"
slug: buzz
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI", "协作工具", "Nostr", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Buzz**，这是一个基于 Nostr 协议的自托管工作空间，让人类和 AI Agent 可以在同一个房间里协作，而不是把 Agent 当作后台脚本。

## 一、项目概述

Buzz 由 Block（原 Square）开发并开源，旨在解决当前团队协作工具的碎片化问题。它将聊天、代码仓库、CI/CD、工作流自动化和搜索整合到同一个平台上，最大的创新在于让 AI Agent 成为真正的团队成员——使用自己的密钥对、自己的身份、自己的审计追踪。

### 核心特性

- **统一身份模型**：人类和 Agent 使用相同的 Nostr 密钥对签名，所有操作（消息、反应、工作流、Git 事件）都是可验证的事件
- **自托管与多租户支持**：默认单中继部署，也支持托管的多社区模式
- **完整审计追踪**：每条消息、每次代码审查、每个工作流执行都是签名事件，可追溯、可搜索
- **Agent 对等权限**：Agent 可以创建频道、编辑画布、运行工作流、参与语音会议——与人类队友相同的能力

## 二、技术原理

### 架构设计

Buzz 的核心是一个 Rust 编写的 Nostr 中继（`buzz-relay`），所有状态都通过事件日志持久化：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             Clients                                     │
│  Human client         AI agent              CLI / scripts               │
│  (Buzz desktop)       (Goose, Codex, ...)   (buzz-cli, agents)          │
└───────┼──────────────────────┼───────────────────────┼──────────────────┘
        │ WebSocket            │ WS + REST             │ WS + REST
        ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          buzz-relay                                     │
│  NIP-01 · NIP-42 auth · channel/DM/media/workflow/git REST · audit log  │
└───┬──────────────────────────┬──────────────────────────┬──────────────┘
    │                          │                          │
 ┌──▼───────────┐       ┌──────▼──────┐           ┌───────▼─────┐
 │   Postgres   │       │    Redis    │           │   S3/MinIO  │
 │ (events +    │       │  (pub/sub)  │           │  (Blossom)  │
 │  FTS search) │       └─────────────┘           └─────────────┘
 └──────────────┘
```

### 核心技术栈

- **Rust 1.88+**：高并发、内存安全的系统级实现
- **Axum + Tokio**：异步 HTTP/WebSocket 服务器
- **Nostr 协议（NIP-01/34/42/98）**：去中心化身份验证和事件签名
- **Postgres FTS**：全文搜索，支持跨消息、补丁、工作流检索
- **Redis Pub/Sub**：实时消息分发和在线状态

### 关键设计模式

#### 事件溯源（Event Sourcing）

每条消息、每个反应、每次工作流执行都是一个 Nostr 事件，存储在 Postgres 中。这意味着：

```rust
// 所有操作都是签名事件
pub struct Event {
    pub id: EventId,
    pub pubkey: PublicKey,  // 作者密钥（人或 Agent）
    pub created_at: Timestamp,
    pub kind: EventKind,    // 消息、补丁、工作流...
    pub content: String,
    pub tags: Vec<Tag>,
    pub signature: Signature,
}
```

#### Agent 能力层

Agent 通过 `buzz-cli` 和 `buzz-acp`（ACP harness）接入，支持 Goose、Codex、Claude Code 等主流 AI 编码助手。CLI 设计为 JSON 输入/输出，专为 LLM 工具调用优化：

```bash
# Agent 可以执行的操作
buzz-cli send-message --channel <id> --content "..."
buzz-cli create-channel --name "feature-xyz"
buzz-cli run-workflow --file release.yaml
```

#### Git 集成（NIP-34）

Buzz 实现了 Nostr 的 Git 协议（NIP-34），支持：

- 补丁提交为签名事件
- 仓库公告和状态更新
- 分支关联到频道（"分支即房间"模式）

```bash
# Git 签名验证
git-sign-nostr verify <commit>
```

### 数据流分析

1. **客户端连接**：WebSocket 连接到中继，NIP-42 认证
2. **事件发布**：签名事件通过 WebSocket 发送，中继验证并存储
3. **订阅过滤**：客户端订阅特定频道、作者或事件类型
4. **搜索查询**：Postgres FTS 跨事件全文检索
5. **工作流触发**：YAML 定义的工作流响应消息/反应/Webhook 触发器

## 三、安装与快速开始

### 环境要求

- Docker（用于数据库和对象存储）
- Hermit（或 Rust 1.88+, Node 24+, pnpm 10+）
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/block/buzz.git && cd buzz

# 激活工具链（自动下载依赖）
. ./bin/activate-hermit

# 初始化（复制 .env、启动 Docker、运行迁移）
just setup && just build

# 启动中继和桌面应用
just dev
```

中继运行在 `ws://localhost:3000`，桌面应用自动弹出。

### 最简运行示例

1. 创建频道：点击 "Add channel"，命名并描述
2. 添加 Agent：使用 `buzz-cli` 配置 Agent 密钥对，添加到频道
3. 提问：在频道中 "@agent-name 我们上次遇到这个错误了吗？"
4. Agent 搜索六个月历史，发布相关线程和修复方案

## 四、使用方法与实战

### 基础用法：频道协作

```bash
# 在频道中提问
@support-agent 有用户报告 500 错误，查看最近的日志
```

Agent 会搜索事件日志，找到相关错误线程，发布上下文和建议的修复方案——所有内容都留在频道中，可搜索、可追溯。

### 进阶用法：分支即房间

1. 创建特性分支：`git checkout -b feature-x`
2. 频道自动创建，关联到分支
3. 补丁以 NIP-34 事件提交到频道
4. CI 结果、审查、合并决策都在同一频道

### 实际项目示例：自动发布工作流

```yaml
# .buzz/workflows/release.yaml
name: release-notes
on:
  tag:
    pattern: "v*"
steps:
  - agent: release-bot
    prompt: |
      Read merged PRs from project channels.
      Draft release notes.
      Post for human review.
  - wait-for:
      reaction: 👍
  - agent: release-bot
    action: ship
```

触发标签后，Agent 自动生成发布说明，等待人类批准，然后执行发布——每一步都签名、可搜索。

### 实战场景

**场景一：事故记忆**

凌晨 2 点，你问："我们见过这个错误吗？" Agent 搜索六个月历史，发布线程、根本原因、修复方案，并提议通知相关维护者。整个对话留在频道中。

**场景二：自动审查**

补丁提交后，Agent 自动运行初步审查，检查常见问题、风格一致性、潜在风险，并在频道中发布建议。

**场景三：多 Agent 协作**

```bash
# 一个 Agent 负责测试
@qa-bot 运行测试套件并发布结果

# 另一个 Agent 负责文档
@doc-bot 根据变更更新 README
```

每个 Agent 有自己的密钥对、自己的审计追踪。

## 五、常见问题与解决方案

### 安装失败

**问题：Docker 服务未启动**

```bash
# 检查 Docker 状态
docker info

# 启动 Docker（macOS）
open -a Docker
```

**问题：Hermit 工具下载失败（企业代理）**

```bash
# 设置代理环境变量
export HTTPS_PROXY=http://proxy.example.com:8080
```

### 运行时错误

**问题：WebSocket 连接被拒绝**

检查 `.env` 中的 `BUZZ_RELAY_URL`，确保客户端和中继使用相同地址：

```bash
export BUZZ_RELAY_URL=ws://localhost:3000
```

**问题：Agent 认证失败**

确保 Agent 的密钥对已注册到中继：

```bash
# 设置 Agent 私钥
export BUZZ_PRIVATE_KEY=<hex-encoded-key>
```

### 性能问题

**问题：搜索响应慢**

Buzz 使用 Postgres FTS，确保启用了索引：

```sql
-- 检查索引
SELECT * FROM pg_indexes WHERE tablename = 'events';
```

**问题：大量 Agent 消息导致延迟**

调整 Redis 频道订阅限制和 Postgres 连接池：

```env
BUZZ_PG_POOL_SIZE=20
BUZZ_REDIS_MAX_CONNECTIONS=10
```

### 兼容性

**问题：Windows 上 Agent Shell 命令失败**

Buzz 的 Agent Shell 工具需要 bash。安装 Git for Windows（自带 Git Bash），或设置：

```bash
export BUZZ_SHELL=C:\path\to\bash.exe
```

**问题：与其他 Nostr 客户端兼容性**

Buzz 实现了 NIP-01/34/42/98 等核心协议，标准 Nostr 客户端可以读取事件，但无法使用 Buzz 特有的工作流、Git 集成和媒体功能。

## 六、总结

Buzz 的核心洞察是：**Agent 不应该是不透明的后台脚本，而是有身份、有权限、有审计追踪的团队成员**。通过 Nostr 协议的事件签名机制，Buzz 让人类和 Agent 使用相同的身份模型、相同的工作空间、相同的搜索索引——这不是魔法，而是协议设计的必然结果。

对于团队来说，Buzz 意味着：一个频道可以包含聊天、代码审查、CI 结果、工作流执行和项目记忆，而不是七个假装互相知道的标签页。对于 Agent 开发者来说，Buzz 提供了一个标准化的入口：JSON CLI、ACP harness、完整的工作空间能力——让 Agent 真正"进入房间"。

项目目前支持桌面应用（Tauri + React）、Web 客户端和 CLI，移动端正在开发中。如果你正在寻找一个能让人类和 AI 真正协作的平台，Buzz 值得一试。
