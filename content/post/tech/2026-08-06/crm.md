---
title: "Comp CRM：一个以 AI Agent 为核心的开源 CRM 系统"
date: 2026-08-06
description: "Comp CRM 是一个革命性的开源 CRM 系统，与传统 CRM 不同，它以 AI Agent 为核心设计理念。Agent 不是 CRM 的功能，CRM 只是 Agent 记录笔记的地方。基于 Vercel eve 框架构建，支持持久化会话、自主调度、沙箱执行，真正实现了自动化客户关系管理。"
author: "Cheman"
slug: crm
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "CRM", "AI Agent", "开源", "Vercel", "eve", "自动化"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Comp CRM**，一个以 AI Agent 为核心的开源 CRM 系统，颠覆了传统 CRM 的设计理念——Agent 不是功能，CRM 只是 Agent 记录笔记的地方。

## 一、项目概述

Comp CRM 是由 trycompai 团队开发的开源 CRM 系统，其核心创新在于"以 Agent 为产品"的设计理念。传统 CRM（包括所谓的 AI CRM）本质上是一个数据库加上表单，即便有 AI 也只是侧边栏的聊天框，真正的数据收集和整理工作仍需人工完成。

Comp CRM 完全反转了这个设计：

- **Agent 自主运行**：基于 Vercel eve 框架构建的持久化 Agent，拥有独立的部署、调度队列和工作预算
- **数据驱动决策**：Agent 根据证据强度自动填充字段，弱证据转为待人工确认的建议
- **完全自动化**：Agent 自己决定下一步看什么、何时跟进、何时停止，无需人工触发

核心特性：

1. **18 个专用工具**：`read_crm_history`、`search_crm`、`identify_contact`、`research_person`、`enrich_company`、`record_fact`、`schedule_recheck` 等
2. **4 个技能文件**：`evidence.md`、`identity-matching.md`、`data-boundaries.md`、`writing-a-brief.md`（Markdown 格式，版本化管理）
3. **自主调度系统**：`dispatch.ts` 基于 `FOR UPDATE SKIP LOCKED` 实现分布式任务队列
4. **安全沙箱**：无网络访问、无数据库连接，仅作为文本处理器
5. **可观测性**：每个 Contact/Company/Deal 都有 Agent 标签页，实时显示执行步骤和决策过程

## 二、技术原理

### 2.1 架构设计

Comp CRM 采用 Turborepo monorepo 架构，基于 Bun 运行时，部署在 Vercel 平台：

```
apps/
├── agent/        # 研究型 Agent（工具、技能、调度、沙箱）
├── app/          # Next.js 前端（:3000）
└── api/          # NestJS API（HTTP、认证、tRPC、Google 同步）（:3001）
packages/
├── db/           # Prisma schema、migrations、共享 Postgres client
├── auth/         # Better Auth 配置和登录白名单
├── ui/           # shadcn/ui 组件、Tailwind 主题
└── env/          # 根 .env 加载器
```

**三大核心原则**：

1. **智能永远在 Agent 层**：API 只负责报告事件，Agent 决定事件含义（防止逻辑分散导致的维护噩梦）
2. **UI 唯一来源**：`packages/ui` 是唯一的 UI 来源，调用点不允许覆盖样式
3. **无组织架构**：单租户设计，避免无意义的 `organizationId` 列和权限检查

### 2.2 Agent 核心机制

#### 持久化会话

基于 Vercel eve 框架的文件系统优先设计：

- **工具 = 文件**：每个工具是一个独立文件
- **技能 = Markdown 文件**：Agent 可读的 prose，版本化管理
- **调度 = 文件**：`dispatch.ts` 定义任务调度逻辑
- **运行时处理持久化**：会话可跨重部署存活，任务可从中断点恢复

```typescript
// lib/tasks.ts - 工作队列实现
export async function claimDue() {
  // FOR UPDATE SKIP LOCKED 确保多个 dispatcher 不冲突
  // 死亡的运行会在租约过期后释放行
  const result = await db.$queryRaw`
    SELECT * FROM tasks
    WHERE dueAt <= NOW() AND lease IS NULL
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `;
  // ...
}
```

#### 自主调度

Agent 的调度逻辑完全自主：

- 不是固定 cron 表达式（如"每 N 分钟检查前 10 个联系人"）
- Agent 主动调用 `schedule_recheck` 工具并说明原因
- 原因会显示给销售代表，避免无意义的默认行为

```typescript
// 示例：Agent 决定何时重新检查
await schedule_recheck({
  contactId: "xxx",
  reason: "上次尝试联系未响应，14天后重新评估",
  dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
});
```

#### 证据驱动的数据填充

Agent 遵循的核心规则：**永远不猜测人员信息**

- 工具只报告观测到的证据（如 `crm.signature-block`、`github.account-identity`）
- 不接受置信度分数（防止模型自评偏差）
- 强证据直接写入记录，弱证据转为待人工确认的建议
- 错误的客户信息比空白字段更糟糕（无法辨别真假）

### 2.3 安全沙箱设计

沙箱遵循"拒绝所有出站"原则：

```bash
# 沙箱特性
- 无网络访问（deny-all egress）
- 无数据库连接（永不提供 DATABASE_URL）
- 仅作为文本处理器（bash、grep、glob、/workspace）
```

**为什么这样设计？**

- `web_fetch` 在应用运行时执行
- `web_search` 在模型提供商执行
- 沙箱的唯一路径是通过 shell 命令泄露客户邮件内容
- 无凭据 + 无出站 = 无数据泄露风险

### 2.4 外部数据源集成

所有外部数据源都是可选的：

```
[agent] on   LinkedIn (RAPIDAPI_KEY)
[agent] off  Web research (PERPLEXITY_API_KEY)
[agent] off  Company brand data (Settings → General)
```

- **零 API Key 也能运行**：`read_crm_history` 读取自有邮件线程、会议、签名块（免费且最可靠）
- **动态感知能力**：每个会话开始时告知 Agent 当前可用的数据源
- **公司品牌数据**：通过 Context 获取 logo、颜色、行业信息（UI 中配置，无需重新部署）

## 三、安装与快速开始

### 3.1 环境要求

- **Bun**：JavaScript 运行时和包管理器
- **Docker**：本地 Postgres 数据库

### 3.2 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/trycompai/crm.git && cd crm

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入以下四个必需值：
# - BETTER_AUTH_SECRET=$(openssl rand -base64 32)
# - ALLOWED_SIGN_IN=<你的邮箱域名或邮箱地址>
# - GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET

# 3. 安装依赖
bun install

# 4. 启动 Postgres
docker compose up -d

# 5. 应用数据库迁移
bun run db:deploy

# 6. （可选）填充演示数据
bun run db:seed

# 7. 启动开发服务器
bun run dev
```

访问 `http://localhost:3000`（前端）和 `http://localhost:3001`（API）。

### 3.3 Google OAuth 配置

1. 访问 [Google Cloud Console](https://console.cloud.cloud.google.com/apis/credentials)
2. 创建 OAuth 客户端 ID（Web 应用类型）
3. 添加授权重定向 URI：`http://localhost:3001/api/auth/callback/google`
4. 启用 Gmail API 和 Calendar API
5. 复制 Client ID 和 Secret 到 `.env`

**白名单配置示例**：

```bash
ALLOWED_SIGN_IN="acme.com"                       # 允许整个域名
ALLOWED_SIGN_IN="acme.com,contractor@gmail.com"  # 域名 + 外部邮箱
ALLOWED_SIGN_IN="you@gmail.com"                  # 单人安装
```

## 四、使用方法与实战

### 4.1 基础用法

#### 查看 Agent 工作过程

每个 Contact、Company、Deal 都有 **Agent** 标签页：

- 实时显示执行步骤
- 显示被丢弃的线索及原因
- Agent 无法决策时的问题提示

```typescript
// 启用 Agent 对话（需在两个进程中设置相同的 AGENT_BRIDGE_SECRET）
AGENT_BRIDGE_SECRET=your-secret
```

#### Agent 自主运行示例

Agent 基于工作队列自主运行：

```typescript
// dispatch.ts - 调度器
export default defineSchedule({
  name: "dispatch",
  schedule: "*/5 * * * *", // 每 5 分钟
  async run() {
    const tasks = await claimDue();
    for (const task of tasks) {
      // 启动独立会话处理每个任务
      await startSession(task);
    }
  },
});
```

### 4.2 进阶用法

#### 添加自定义工具

在 `apps/agent/tools/` 下创建新文件：

```typescript
// my_custom_tool.ts
import { defineTool } from "eve";

export default defineTool({
  name: "my_custom_tool",
  description: "执行自定义数据收集",
  async run({ param }) {
    // 工具实现
    return { result: "..." };
  },
});
```

#### 配置外部数据源

```bash
# .env 中添加
PERPLEXITY_API_KEY=xxx     # Web 研究（带引用）
RAPIDAPI_KEY=xxx           # LinkedIn 身份识别
```

Agent 会在启动时显示可用能力：

```
[agent] on   LinkedIn (RAPIDAPI_KEY)
[agent] on   Web research (PERPLEXITY_API_KEY)
```

#### 自定义技能文件

在 `apps/agent/skills/` 下创建 Markdown 文件：

```markdown
<!-- custom_research.md -->
# 自定义研究流程

当遇到以下情况时：
1. 先检查 GitHub 账号
2. 再检查 LinkedIn 资料
3. 最后检查公司官网
...
```

### 4.3 实际项目示例

#### 场景：自动填充联系人信息

1. Agent 从邮件签名块中提取姓名、职位、公司
2. 在 LinkedIn 上验证身份（如配置了 RAPIDAPI_KEY）
3. 在 GitHub 上查找开源项目（如公开）
4. 根据证据强度决定写入记录或创建待确认建议

#### 场景：定期重新评估联系人

```typescript
// Agent 自动调度
await schedule_recheck({
  contactId: "contact_123",
  reason: "客户上次表示 30 天后可能有新需求",
  dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题：`bun install` 报错**

- 确保使用 Bun 1.3.12 或更高版本
- 检查网络连接（中国大陆可能需要配置镜像）

**问题：`docker compose up -d` 失败**

- 确保已安装 Docker Desktop
- 检查 5432 端口是否被占用（`lsof -i :5432`）

### 5.2 运行时错误

**问题：登录失败（Redirect Loop）**

- 检查 `BETTER_AUTH_SECRET` 在 app 和 api 中是否一致
- 检查 `API_URL` 和 `APP_URL` 配置是否正确

**问题：Agent 标签页显示"未配置"**

- 在 app 和 api 进程中设置相同的 `AGENT_BRIDGE_SECRET`
- 重启两个进程

**问题：Google 同步不工作**

- 确保 `CRON_SECRET` 已设置
- 配置定时任务访问 `POST /internal/sync/google`

### 5.3 性能问题

**问题：Agent 响应慢**

- 检查数据源 API Key 是否有效（Perplexity、RapidAPI）
- 配置 `REDIS_URL` 启用共享缓存（无 Redis 时使用内存缓存）

**问题：数据库查询慢**

- 确保使用了 Neon 或其他高性能 Postgres 服务
- 检查 Prisma 查询是否需要优化

### 5.4 兼容性

**支持的平台**：

- Node.js 22+ 或 Bun 1.3.12+
- Postgres（推荐 Neon）
- Vercel（生产环境）或 Docker（本地开发）

**不支持**：

- Windows 原生环境（需使用 WSL 或 Docker）
- Node.js 22 以下版本

## 六、总结

Comp CRM 代表了 CRM 系统的下一个发展方向：从"数据库 + 表单"到"Agent + 笔记"。其核心创新在于：

1. **Agent 即产品**：自动化不是附加功能，而是系统核心
2. **证据驱动**：不猜测、不自评，只记录观测到的证据
3. **安全优先**：沙箱无网络、无数据库，彻底防止数据泄露
4. **高度可扩展**：基于 eve 框架的文件系统设计，工具、技能、调度都是文件
5. **真正的自主运行**：Agent 自己决定何时、如何工作，无需人工触发

对于希望构建智能 CRM 或学习 Agent 架构的开发者，Comp CRM 提供了完整的参考实现。其基于 Vercel eve 框架的设计，也为构建其他类型的自主 Agent 系统提供了范例。

项目地址：[https://github.com/trycompai/crm](https://github.com/trycompai/crm)
