---
title: "OpenSEO：开源替代 Semrush/Ahrefs 的 AI 友好型 SEO 工具"
date: 2026-06-26
description: "OpenSEO 是一款开源 SEO 工具，旨在替代 Semrush 和 Ahrefs 等昂贵且臃肿的商业产品。它采用按量付费模式，支持 MCP 协议与 AI Agent 集成，内置关键词研究、排名追踪、域名分析、反链查询、站点审计等完整 SEO 工作流，并可自部署于 Docker 或 Cloudflare。"
author: "Cheman"
slug: open-seo
draft: false
categories: [技术, 开源]
tags: [SEO, 开源, AI, GitHub Trending, MCP]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenSEO**，这是一款面向"普通人"的开源 SEO 工具，定位是 Semrush 和 Ahrefs 的轻量替代方案，并按量付费，让你真正掌控成本。

## 一、项目概述

OpenSEO 由 [every-app](https://github.com/every-app) 团队维护，核心设计理念是：

> **Best-in-class MCP & AI Skills，现代简洁的 UI，无订阅制，自带 DataForSEO API 按量付费。**

主要解决的痛点：
- 商业 SEO 工具（Semrush、Ahrefs）月费高昂，对独立开发者和小型团队不友好
- 功能过于臃肿，实际常用的只有关键词研究、排名追踪等核心工作流
- 现有工具对 AI Agent 支持有限，无法与 Claude Code、Codex 等智能体无缝集成

**核心特性一览：**

| 特性 | 说明 |
|------|------|
| 🤖 AI 原生 | 内置 MCP Server，支持 Claude Code / Codex / Hermes 直接调用 |
| 💰 按量付费 | 工具本身免费，仅在使用 DataForSEO API 时产生费用 |
| 🐳 自部署 | 支持 Docker 本地部署和 Cloudflare Workers 云端部署 |
| 📊 完整工作流 | 关键词研究、排名追踪、域名分析、反链、站点审计、AI 品牌可见性 |
| 🧩 可扩展 | 提供 Agent Skills 机制，可自定义工作流 |

## 二、技术原理

### 架构设计

OpenSEO 采用 **Cloudflare Workers + D1 (SQLite)** 的全栈无服务器架构，前端基于 React + TanStack Router + Vite，后端逻辑运行在 Cloudflare Worker 中。

```
┌─────────────────────────────────────────────┐
│                Frontend (React SPA)         │
│  TanStack Router + React Query + Tailwind   │
└──────────────────────┬──────────────────────┘
                       │ Hono/TanStack Start API
┌──────────────────────▼──────────────────────┐
│           Cloudflare Worker (Hono)          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Auth     │  │ SEO API  │  │ MCP Srv  │ │
│  │BetterAuth│  │DataForSEO│  │  Server  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│         Cloudflare D1 (SQLite)              │
│  projects / keywords / rankings / users     │
└─────────────────────────────────────────────┘
```

### 核心技术栈

从 `package.json` 和配置文件可以清晰地看到技术选型：

**前端：**
- **React 19** + **TanStack Router** — 类型安全的文件路由
- **TanStack Query v5** — 服务端状态管理
- **Tailwind CSS v4** + **DaisyUI v5** — 样式系统
- **Recharts** — 图表渲染（排名趋势、关键词量等）
- **react-markdown + remark-gfm** — Markdown 渲染（用于 AI 回复展示）

**后端：**
- **Hono / TanStack Start** — 边缘运行时 API
- **Better Auth** — 认证系统（支持 Cloudflare Access 集成）
- **Drizzle ORM** — 类型安全的数据库访问层
- **DataForSEO REST API** — SEO 数据源（SERP、关键词、反链等）

**AI 集成：**
- **@modelcontextprotocol/sdk** — MCP Server 实现
- **ai-sdk (Vercel AI SDK)** — 对接 OpenRouter 多模型
- **@cloudflare/workers-oauth-provider** — OAuth 登录授权（用于 MCP 客户端认证）

### MCP Server 设计

OpenSEO 的 MCP Server 是其最核心的 AI 集成能力，允许任何兼容 MCP 的 AI Agent 直接调用 SEO 数据：

```typescript
// MCP Server 暴露的工具（从 README 推断）
tools: [
  "seo_keyword_research",     // 关键词研究
  "seo_serp_lookup",          // SERP 查询结果
  "seo_domain_compare",       // 域名对比
  "seo_backlinks_review",     // 反链分析
  // ...
]
```

接入方式极简（以 Claude Code 为例）：

```bash
# 托管版
claude mcp add --transport http --scope user openseo https://app.openseo.so/mcp

# 本地 Docker
claude mcp add --transport http --scope user openseo http://localhost:3001/mcp
```

### 数据库 Schema 设计

从 `drizzle-prod.config.ts` 可知使用 Drizzle ORM + D1（Cloudflare D1 兼容 SQLite）。项目通过 `pnpm auth:generate` 自动从 Better Auth 配置生成 `better-auth-schema.ts`，与 Drizzle schema 合并迁移，实现类型安全的数据库访问。

## 三、安装与快速开始

### 方式一：Docker 本地部署（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/every-app/open-seo.git
cd open-seo

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DATAFORSEO_API_KEY

# 3. 启动（自动拉取最新镜像）
docker compose up -d --pull always
```

启动后访问 `http://localhost:3001` 即可使用。

> **⚠️ 注意**：Docker 版本为单用户模式，无认证机制，仅限本地使用。如需对外提供服务，请使用 Cloudflare 部署方式。

### 方式二：Cloudflare Workers 部署（生产推荐）

点击一键部署按钮，或参考 [`docs/SELF_HOSTING_CLOUDFLARE.md`](https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE.md) 手动配置：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/every-app/open-seo)

部署要点：
1. 在 Cloudflare Dashboard 创建 D1 数据库，执行 `pnpm db:migrate:prod`
2. 设置 `DATAFORSEO_API_KEY` 环境变量（Base64 编码的 `login:password`）
3. 配置 Cloudflare Access（可选，用于团队多用户认证）

### DataForSEO API Key 配置

OpenSEO 本身免费，但依赖 DataForSEO 提供数据。获取方式：

```bash
# 1. 访问 https://app.dataforseo.com/api-access 申请 API 凭证
# 2. 将 login:password 进行 Base64 编码
printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64
# 3. 将输出填入 .env 的 DATAFORSEO_API_KEY
```

新账号赠送 **$1 免费额度**，充值最低 **$50**，按需使用。

## 四、使用方法与实战

### Agent Skills 工作流

OpenSEO 提供了一套预置的 Agent Skills，可直接让 AI Agent 执行 SEO 任务：

```bash
# 安装所有 OpenSEO Skills 到 Claude Code
npx skills add every-app/open-seo --skill '*' --agent claude-code

# 安装到 Codex
npx skills add every-app/open-seo --skill '*' --agent codex
```

可用 Skills：

| Skill | 功能 |
|-------|------|
| `seo-project-setup` | 初始化项目配置 |
| `seo-coach` | SEO 顾问，回答 SEO 问题 |
| `keyword-research` | 关键词研究与聚类 |
| `keyword-clustering` | 关键词分组 |
| `competitive-landscape` | 竞争格局分析 |
| `competitor-analysis` | 竞品分析 |
| `link-prospecting` | 外链机会挖掘 |

从 `/seo-project-setup` 开始，Agent 会引导你完成项目配置。

### MCP 实战示例

在 Claude Code 中连接 OpenSEO MCP 后，可以直接对话完成 SEO 任务：

```
用户：帮我研究 "open source seo tools" 这个关键词，分析搜索量和相关词

→ Agent 通过 MCP 调用 openseo.keyword_research
→ 返回搜索量、CPC、竞争度、相关关键词列表
→ 自动生成关键词聚类建议
```

### 核心工作流详解

**① 关键词研究**
输入种子词，获取搜索量、CPC、竞争难度，支持 150/300/500 条结果返回。默认返回 150 条，成本约 **$0.035/次**。

**② 排名追踪**
设置关键词 + 设备（桌面/移动），系统定期抓取 SERP 排名。50 关键词 + 移动端 + 5 页深度，成本约 **$2/月**。

**③ 域名分析**
输入竞品域名，获取其 Top 200 排名关键词，成本约 **$0.04/次**。

**④ 反链分析**
查询指向某域名/URL 的反向链接，需 DataForSEO Backlinks 套餐（$100/月起）。

**⑤ AI 品牌可见性**
检测你的品牌在 ChatGPT / Google AI Overview 中被提及的情况，每次查询约 **$0.85**。

## 五、常见问题与解决方案

### 安装部署类

**Q: Docker 启动时端口冲突**
```bash
# 修改 compose.yaml 中的端口映射，或设置 PORT 环境变量
PORT=3010 docker compose up -d
```

**Q: DataForSEO API 调用返回 401**
检查 `.env` 中 `DATAFORSEO_API_KEY` 是否为正确的 Base64 编码格式：
```bash
# 验证编码是否正确
echo 'YOUR_LOGIN:YOUR_PASSWORD' | base64
```

**Q: Cloudflare Workers 部署后 D1 数据库报错**
确认 `wrangler.toml` 中 `D1_DATABASE` 的 `database_id` 和 `account_id` 与 Cloudflare Dashboard 中的一致，然后重新执行：
```bash
pnpm db:migrate:prod
```

### 使用成本类

**Q: 用一次会不会很贵？**
OpenSEO 自身完全免费。以典型使用量估算：
- 100 次关键词研究（150 条结果）= **$3.50**
- 100 次域名分析 = **$4.01**
- 50 关键词排名追踪（月度）= **~$2**

**Q: 新账号如何免费试用？**
DataForSEO 新账号赠送 **$1 免费额度**，可直接测试，无需充值。

### 技术集成类

**Q: MCP Server 连接失败**
确认 OpenSEO 实例已启动，且 MCP URL 路径正确（含 `/mcp` 后缀）：
```bash
# 测试 MCP 端点是否可达
curl -I https://app.openseo.so/mcp
```

**Q: Agent Skills 安装后不生效**
确认 Skills 已安装到正确的目录：
```bash
# Claude Code
ls ~/.claude/skills/

# Codex
ls ~/.codex/skills/
```

## 六、总结

OpenSEO 的最大价值在于：**把昂贵的商业 SEO 工具"降维"成了可按量付费的开源基础设施**，同时原生支持 MCP 协议，让 SEO 工作流真正融入 AI 编程助手的日常。

**适合人群：**
- 独立开发者 / 小型团队，希望以最低成本使用专业 SEO 工具
- AI Agent 重度用户，希望将 SEO 数据查询集成到 Claude Code / Codex 工作流
- 对数据隐私有要求，希望自部署 SEO 工具的团队

**项目状态：**
当前版本 `v0.0.21`，活跃开发中。Roadmap 包括 Google Search Console 集成、Local SEO、多项目支持等。社区活跃，欢迎贡献。

> **相关链接：**
> - GitHub：https://github.com/every-app/open-seo
> - 在线托管版：https://openseo.so
> - Discord 社区：https://discord.gg/c9uGs3cFXr
