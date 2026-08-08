---
title: "Talivia：开源收入优先分析平台，打通网站流量与营收数据"
date: 2026-08-08
description: "Talivia 是一款自托管的收入优先分析平台，整合网站分析、Session Replay、协作共享与 Stripe/LemonSqueezy 等多平台支付归因，帮助团队从流量到收入实现完整数据闭环。"
author: "Cheman"
slug: talivia
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "数据分析", "Next.js", "PostgreSQL"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Talivia**，一款收入优先（revenue-first）的自托管分析平台，将网站流量数据与 Stripe、LemonSqueezy 等支付渠道的营收数据打通，实现从访问到付费的完整归因链路。

## 一、项目概述

Talivia 是一个开源的产品分析和收入归因平台，核心特性包括：

- **网站分析**：页面访问量、访客行为、来源追踪等基础分析能力
- **Session Replay**：用户会话录制与回放，深入了解用户交互细节
- **多支付渠道归因**：支持 Stripe、LemonSqueezy、Polar、Dodo、Yolfi 及手动录入 API，实现订阅生命周期、退款、争议等全链路收入归因
- **协作与共享**：团队成员协作、数据共享与权限管理
- **AI Agent 支持**：提供 MCP 协议的 Agent Kit，支持 Codex、Claude Code、ChatGPT 等客户端集成

项目定位为"收入优先"，强调帮助团队将流量数据与真实营收挂钩，而非仅停留在 PV/UV 层面。

## 二、技术原理

### 架构设计

Talivia 采用前后端一体的 Next.js 全栈架构，核心架构要点：

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)              │
├─────────────────────────────────────────────────────────┤
│  Frontend (React 19)  │  API Routes  │  Tracker Script │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma)  │  ClickHouse  │  Redis (可选)   │
├─────────────────────────────────────────────────────────┤
│  Kafka (可选)  │  MaxMind GeoIP  │  支付 Webhooks      │
└─────────────────────────────────────────────────────────┘
```

从 `next.config.ts` 可见项目采用 Content Security Policy 头部保护，并对 tracker 脚本和 API 路由设置独立的 CORS 策略：

```typescript
const contentSecurityPolicy = `
  default-src 'self';
  img-src 'self' https: data:;
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https:;
  frame-src 'self';
  frame-ancestors 'self';
`;
```

### 核心技术栈

- **前端框架**：Next.js 16 + React 19，支持 Turbopack 加速开发
- **数据库**：PostgreSQL（业务数据）+ ClickHouse（事件分析，从依赖可见）
- **ORM**：Prisma 7.x，支持 adapter-pg 和 read-replicas 扩展
- **构建工具**：Rollup（tracker/recorder 脚本）+ tsup（组件库）
- **支付集成**：Stripe、LemonSqueezy、Polar、DodoPayments 等官方 SDK
- **会话录制**：基于 rrweb 2.0 alpha 版本实现 Session Replay
- **国际化**：next-intl 4.x 多语言支持

### 数据采集机制

项目通过独立的 tracker 脚本（`public/script.js`）采集用户行为数据：

```javascript
// rollup.tracker.config.js 定义了采集端点
replace({
  __COLLECT_API_HOST__: '',
  __COLLECT_API_ENDPOINT__: '/api/send',
  delimiters: ['', ''],
  preventAssignment: true,
})
```

tracker 脚本使用 Rollup 打包为 IIFE 格式，并经 terser 压缩后注入网站。

### 收入归因逻辑

支付 Webhook 从请求原始来源生成回调 URL，反向代理场景需正确转发 `Host` 和 `X-Forwarded-Proto` 头部。归因支持首次/末次触点（first-/last-touch attribution），并保留订阅生命周期事件。

## 三、安装与快速开始

### 环境要求

- Node.js 22 LTS 或 24 LTS
- pnpm 10.10.0+
- PostgreSQL 数据库（空库）

### 本地开发安装

```bash
# 克隆仓库
git clone https://github.com/talivia-group/talivia.git
cd talivia

# 配置环境变量
cp .env.example .env
openssl rand -hex 32  # 生成 APP_SECRET

# 编辑 .env 文件
# DATABASE_URL=postgresql://user:password@localhost:5432/talivia
# APP_SECRET=<刚才生成的随机值>

# 安装依赖并初始化数据库
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm dev
```

访问 `http://localhost:3000`，默认管理员账号：
- 用户名：`admin`
- 密码：`admin`

**安全提示**：首次登录后立即在 Settings → Account 修改密码。

### Docker 部署

```bash
cp .env.example .env
openssl rand -hex 32  # APP_SECRET

# 启动服务
docker compose up --build -d
docker compose ps
```

Docker 容器启动时会自动执行数据库迁移。

## 四、使用方法与实战

### 基础用法：创建网站并嵌入追踪代码

1. 登录后创建网站，复制追踪代码片段
2. 将代码嵌入目标网站的 `<head>` 或 `<body>` 底部
3. 访问网站确认仪表盘有数据上报
4. 可选：在网站设置中启用 Session Replay

### 进阶用法：接入支付归因

在 **Website settings → Payments** 中连接支付渠道：

- Stripe：配置 Webhook Secret，自动同步订阅事件
- LemonSqueezy：支持订阅生命周期、退款、争议追踪
- 手动录入 API：适用于自定义支付流程

支付 Webhook URL 格式：
```
https://your-domain.com/api/webhooks/{provider}
```

### AI Agent 集成

Talivia 提供 MCP 协议的 Agent Kit，支持 AI 编程助手自动配置追踪代码：

```bash
# 本地运行 Agent Kit
npx -y @talivia/agent mcp

# 或连接云端 MCP 端点（需 Talivia Cloud）
# https://talivia.com/mcp
```

Agent Kit 可帮助：
- 自动生成框架特定的追踪代码集成方案
- 验证实时分析事件
- 连接访问与支付归因

## 五、常见问题与解决方案

### 数据库迁移失败

**问题**：`prisma migrate deploy` 报错

**解决**：
- 确保 PostgreSQL 数据库为空库（基线迁移仅支持空库）
- 检查 `DATABASE_URL` 格式是否正确
- 从托管数据库迁移需通过逻辑备份恢复后执行增量迁移

### 追踪脚本加载失败

**问题**：浏览器控制台报 `script.js` 加载错误

**解决**：
- 检查 CSP 配置是否允许 `script-src 'self'`
- 确认 `next.config.ts` 中 tracker 脚本的 CORS 头部配置
- 生产环境需正确设置 `__COLLECT_API_HOST__`

### 支付 Webhook 未触发

**问题**：Stripe/LemonSqueezy 事件未同步

**解决**：
- 反向代理场景需转发 `Host` 和 `X-Forwarded-Proto` 头部
- 检查支付平台 Webhook 配置是否指向正确 URL
- 查看日志确认 Webhook 请求是否到达 `/api/webhooks/{provider}`

### Session Replay 录制不完整

**问题**：回放视频缺少部分交互

**解决**：
- 检查 `rrweb` 版本兼容性（项目使用 2.0 alpha）
- 确认网站 CSP 允许 `script-src 'unsafe-eval'`
- 部分框架（如 Next.js 动态路由）需额外配置 recorder 脚本

## 六、总结

Talivia 作为一款收入优先的分析平台，最大价值在于打通"流量→行为→收入"的数据闭环。对于 SaaS、独立开发者或付费内容团队而言，无需在 Google Analytics 和 Stripe Dashboard 之间手动对账，直接在 Talivia 中看到每个访问来源的真实 ROI。

技术选型上，Next.js 全栈架构 + PostgreSQL/ClickHouse 双数据库设计，既保证开发效率又满足事件分析的规模需求。开源版本支持自托管，Cloud 版本则提供更多集成（Google Search Console、社交媒体提及等），适合不同规模的团队按需选择。
