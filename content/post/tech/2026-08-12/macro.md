---
title: "Macro：一站式团队工作平台，邮件、消息、文档、任务、CRM 一体化管理"
date: 2026-08-12
description: "Macro 是由 macro-inc 打造的 all-in-one 工作操作系统，将邮件、消息、文档、任务、Agent、CRM 统一到一个极速界面，支持团队级记忆与 MCP 集成。"
author: "Cheman"
slug: macro
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "团队协作", "CRM", "Rust", "SolidJS"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Macro**，一个把邮件、消息、文档、任务、Agent、CRM 全整合在一起的工作平台，由 NYC 和 Toronto 团队用两年时间 dogfooding 后开源，技术栈为 SolidJS + Rust。

## 一、项目概述

Macro 的核心理念是：**公司需要变成一个"可计算"的系统**，而不是被各种工具割裂的信息孤岛。团队在之前创业过程中使用了 Slack、Linear、Notion、HubSpot 和 Superhuman，但随着团队规模扩大到 ~20 人，各自的工具越来越多，靠 MCP 和 Zapier 勉强粘合——问题是这些工具之间不共享上下文，信息无法互通。

Macro 的解法是：**从零重构整个工作软件**，每个模块（邮件、消息、文档、任务、CRM 等）既独立好用，又天然共享同一个后端和数据图谱。模块之间通过双向 `@mention` 链接，所有上下文都能追溯。

**核心特性一览：**

| 模块 | 功能亮点 |
|---|---|
| Macro Mail | 多账号 Gmail 统一收件箱，键盘快捷键，AI 辅助搜索附件 PDF |
| Messages | 频道消息，内联回复，后续折叠成线程，适合技术讨论 |
| Tasks | 与频道/邮件/Agent 深度集成的轻量任务，天然在工作流中产生 |
| Docs | CRDTs 实时协作的 Markdown 文档，支持 @link 万物 |
| Canvas | 2D 白板，嵌入 @link 到任务、文件、邮件 |
| Agents | 团队级记忆，整合所有工作上下文，MCP 开放 |
| CRM | 与邮件/消息同源的客户管理，避免 CRM 与现实脱节 |

项目目前完全开源（AGPLv3），不走 open core 模式，可自托管。

## 二、技术原理

### 2.1 架构概览

Macro 的项目结构清晰，采用 monorepo 组织：

```
macro/
├── apps/
│   ├── web/       # SolidJS 前端（浏览器 + Tauri 桌面端 + 移动端）
│   └── docs/      # 文档站点
├── services/      # 42 个可独立部署的后端服务
├── crates/        # 167 个 Rust 库
├── packages/      # 共享 TypeScript 包
├── infra/         # Pulumi 基础设施定义
├── docker/        # 本地 Compose 开发栈
└── tooling/       # 构建脚本和代码生成器
```

### 2.2 前端：SolidJS 极快渲染

前端基于 SolidJS 构建，相比 React 有更细粒度的响应式更新，运行时开销极低。从 `package.json` 可以看到大量使用 `bun` 作为包管理器，配合 TypeScript 强类型保障。

核心编辑器基于 Lexical（`@lexical/*` 系列包），这是一个由 Meta 开发的富文本编辑器框架，Macro 在其上构建了 Markdown 原生协作编辑能力，通过 CRDTs 实现实时多人协同。

### 2.3 后端：Rust 微服务集群

后端由 42 个独立部署的服务组成，分布在多个类别：

- **AI 服务**：`ai_projections_refresh_handler`、`document_cognition_service`
- **邮件服务**：`email_service`、`email_refresh_handler`、`email_suppression_handler`
- **GraphQL 网关**：`graphql_*` 系列（email、entity_mutation、notification 等）
- **存储服务**：`document_storage_service`、`sync-service`（Cloudflare Workers）
- **连接网关**：`connection_gateway`、`mcp_auth_proxy`、`mcp_service`

从 `Cargo.toml` 可以看到技术栈选型非常讲究：

```toml
# Web 框架
axum = { version = "0.8", features = ["tower-log"] }

# 异步运行时
tokio = { version = "1.43.0", features = ["macros", "rt-multi-thread"] }

# 数据库
sqlx = { version = "0.8.6", features = ["postgres", "runtime-tokio-rustls"] }
pgvector = { version = "0.4", features = ["postgres", "sqlx"] }  # 向量搜索

# AWS 服务
aws-sdk-s3 = "1.132.0"
aws-sdk-sesv2 = "1.118.0"  # 邮件发送
aws-sdk-sqs = "1.98.0"

# GraphQL
async-graphql = "7.2.1"

# 定时任务
cron = "0.16.0"

# 序列化
serde = { version = "1.0.214", features = ["derive"] }
serde_json = { version = "1.0.132" }
```

服务间通信通过 `bebop`（高效二进制序列化协议）结合 Axum 的 HTTP 接口，以及 Cloudflare Workers 中的 `worker = "0.8.1"` 运行时。

### 2.4 数据层：双向关联图谱

Macro 的核心创新在于**双向图谱设计**。每个对象（邮件、任务、文档、客户）都可以 @mention 另一个对象，系统自动维护双向链接。这意味着：

- 从一封客户邮件 → 看到关联的任务 → 看到对应的 PR → 看到最终的代码提交
- 从一个 Deal 记录 → 查看所有相关消息、邮件、任务和文档
- 从一个文档 → 找到所有引用它的邮件和任务

数据持久化使用 PostgreSQL + pgvector（向量搜索），支持自然语言语义搜索。同步服务部署在 Cloudflare Workers 上，通过 `worker-zr` 处理边缘计算。

### 2.5 AI 与 Agent 集成

```bash
# 通过 MCP 将 Claude Code 等 Agent 接入 Macro
claude mcp add --transport http macro https://mcp-server.macro.com/mcp
```

Macro 为 Agent 提供近乎 100% 的工具覆盖（通过 MCP），Agent 可以直接读写邮件、创建任务、编辑文档，且没有速率限制。团队记忆（Team Memory）每天定时汇总所有上下文，生成一份结构化的 markdown 记忆文件，供 Agent 调用。

## 三、安装与快速开始

### 环境要求

- macOS/Linux（桌面端支持 Tauri）
- Nix（推荐）或 Bun + Rust 工具链

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/macro-inc/macro.git
cd macro

# 进入开发环境（Nix 自动安装 Rust、Bun、sqlx 等依赖）
nix develop

# 启动本地完整栈（后端服务 + 前端 + 数据库）
just run_local
```

启动后前端 URL 会打印到终端。常用命令：

```bash
just check          # TypeScript 类型检查
just clippy         # Rust 代码 lint
cargo test          # 完整测试套件
cargo test -p email_service  # 单个服务测试
```

### 使用托管版

直接访问 [macro.com/app](https://macro.com/app)，用 Google 账号注册，15 分钟内可完成初始配置。

## 四、使用方法与实战

### 4.1 邮件 + CRM 联动

在 Macro Mail 中，只需 `@mention` 一个联系人或公司，即可自动建立双向关联：

```
@tim@acme.com - 询问合同签署进度
```

这条消息自动链接到 `tim@acme.com` 的联系人记录，同时也出现在对应的 Deal 频道中。团队成员无需打开 HubSpot，从消息列表就能看到所有上下文。

### 4.2 频道驱动的工作流

任务不再是独立于对话的"孤岛"——在频道讨论中可以直接创建任务：

```
在 #engineering 频道：
"我们决定优化登录流程的并发处理"
→ 按 `c t` 快速创建任务，自动关联到当前频道和这条讨论消息
```

任务 → PR → 代码提交，全部可追溯，不需要来回切换工具。

### 4.3 Agent 辅助开发

```bash
# 将 Claude Code Agent 接入 Macro 工作区
claude mcp add --transport http macro https://mcp-server.macro.com/mcp
```

接入后，Agent 可以：
- 搜索团队所有邮件和文档中的技术讨论
- 根据上下文创建并分配任务给工程师
- 读取并更新 CRM 记录
- 维护团队知识库文档（如每日 Pool Games 排行榜）

## 五、常见问题与解决方案

**Q: 支持自托管吗？**
A: 支持。Macro 完全开源（AGPLv3），可在自己的基础设施上部署。托管版提供 SOC 2 Type II 认证，无数据保留（模型提供商不保留数据）。

**Q: 移动端体验如何？**
A: 目前已有 iOS App，Android 端 Web 版可用，原生 App 即将推出。

**Q: 离线编辑支持吗？**
A: 支持。Docs 模块基于 CRDTs 构建，支持离线编辑和冲突解决。

**Q: 与 Notion/Slack/Linear/HubSpot 相比优势在哪里？**
A: Macro 不是简单拼接多个工具，而是**单一数据库 + 双向图谱**。信息在工具之间天然关联，不需要手动同步或依赖 Zapier。

**Q: 如何接入其他 AI 模型？**
A: Macro 支持 OpenAI、Google、Anthropic 等多模型选择，通过模型选择器自由切换，Agent 调用无速率限制。

## 六、总结

Macro 是一个野心勃勃的项目，试图用一个系统替代整个 SaaS 工具链。它的技术选型也非常有品味：SolidJS 前端保证流畅体验，Rust 后端保证高性能和可靠性，CRDTs 保证协作一致性。双向图谱设计解决了"公司不可计算"的根本问题，让团队上下文真正互联互通。

如果你受够了在多个工具之间来回跳转，或者希望 AI Agent 能真正了解团队正在做什么，Macro 值得一试。开源 + 可自托管的方案在企业级工具中相当难得。
