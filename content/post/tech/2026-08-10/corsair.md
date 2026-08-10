---
title: "Corsair：为 AI Agent 构建安全集成层，让应用连接既强大又可控"
date: 2026-08-10
description: "Corsair 是一个统一的 Agent 集成层，为 AI Agent 提供安全的第三方应用连接能力。通过权限控制、凭证隔离和多租户支持，让 Agent 在访问 Gmail、GitHub、Slack 等应用时既高效又安全。"
author: "Cheman"
slug: corsair
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "Agent", "AI安全", "MCP", "集成层"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Corsair**，它为 AI Agent 提供了一个统一的集成层，让 Agent 可以安全地连接各种第三方应用，而不会暴露敏感凭证。

## 一、项目概述

Corsair 是一个专为 AI Agent 设计的统一集成层。它的核心理念是：**让 Agent 拥有强大的应用连接能力，同时让开发者对权限和凭证保持完全控制**。

### 解决的问题

现代 AI Agent 能力越来越强，但给它"所有应用的钥匙"却让人不安。一个被误解的指令可能让 Agent 发送不该发的邮件、删除重要文件或泄露敏感数据。Corsair 通过以下方式解决这个问题：

- **凭证隔离**：Agent 永远看不到 API 密钥和凭证
- **权限控制**：细粒度的操作审批机制
- **多租户支持**：企业级的多租户隔离能力

### 核心特性

1. **统一接口**：连接 Corsair 实例后，Agent 立即获得所有集成的访问能力
2. **MCP 兼容**：可作为 MCP (Model Context Protocol) 服务器接入任意 Agent
3. **四种权限模式**：open、cautious、strict、readonly，灵活控制 Agent 行为
4. **签名验证的 Webhook**：每个插件自带类型安全的 webhook 处理器
5. **多租户架构**：租户间凭证、数据、权限完全隔离

## 二、技术原理

### 架构设计

Corsair 采用**插件化架构**，核心是一个轻量级的协调层，具体的应用集成通过插件实现：

```typescript
import { github } from '@corsair-dev/github';
import { slack } from '@corsair-dev/slack';
import { createCorsair } from 'corsair/core';

const corsair = createCorsair({
  multiTenancy: true,
  plugins: [slack(), github()],
});
```

这种设计让 Corsair 具有极强的扩展性——新增一个集成只需开发对应插件，核心层无需修改。

### 凭证隔离机制

Corsair 使用**信封加密 (Envelope Encryption)** 保护凭证：

```
用户控制的 KEK (Key Encryption Key)
    ↓ 加密
每个租户的 DEK (Data Encryption Key)
    ↓ 加密
实际的 API Secrets
```

Agent 发起调用时，Corsair 内部解析凭证，Agent 只看到方法名和返回结果。这种方式确保：

- Agent 无法读取、日志记录或窃取凭证
- 凭证存储在加密数据库中，即使数据库泄露也无法解密
- 支持用户自行管理密钥（跳过内置密钥管理器）

### 权限请求流程

当 Agent 尝试执行敏感操作时（如发送邮件），Corsair 会拦截并创建权限请求：

```
Agent: 我已起草邮件，此操作需要您的审批。

  ⚠️ gmail: messages.post
     To: sarah@corsair.dev
     Subject: "Q1 Numbers"
     
     Hi Sarah, attached is the breakdown...

  审批链接: https://somepubliclink.com/review/a8f2c1
  链接 10 分钟后过期
```

关键设计：**权限请求存储在 Agent 无法访问的数据库中**，只有用户批准后才会执行操作。

### 多租户隔离

启用多租户模式后，每个租户获得：

- 独立的凭证存储
- 独立的数据存储
- 独立的权限评估

```typescript
const client = corsair.withTenant('org-456');
await client.slack.api.messages.post({ 
  channel: '#alerts', 
  text: 'Deploy complete.' 
});
```

租户 ID 通过 `withTenant()` 方法注入，后续调用自动隔离到该租户上下文。

## 三、安装与快速开始

### 环境要求

- Node.js 18+
- pnpm 10+（推荐）
- TypeScript 5.0+

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/corsairdev/corsair.git
cd corsair

# 安装依赖
pnpm install

# 构建
pnpm build
```

### 最简运行示例

```typescript
import { createCorsair } from 'corsair/core';
import { gmail } from '@corsair-dev/gmail';
import { github } from '@corsair-dev/github';

// 创建 Corsair 实例
const corsair = createCorsair({
  plugins: [gmail(), github()],
});

// Agent 通过 MCP 调用
// 或在代码中直接使用
const result = await corsair.github.api.repos.get({
  owner: 'corsairdev',
  repo: 'corsair'
});
```

## 四、使用方法与实战

### 权限模式配置

每种集成可独立配置权限模式：

| 模式 | 读取 | 写入 | 破坏性操作 | 适用场景 |
|------|------|------|------------|----------|
| open | ✓ 立即执行 | ✓ 立即执行 | ✓ 立即执行 | 高信任的只读服务 |
| cautious | ✓ 立即执行 | ✓ 立即执行 | 需审批 | **推荐默认** |
| strict | ✓ 立即执行 | 需审批 | 阻止 | 生产环境关键服务 |
| readonly | ✓ 立即执行 | 阻止 | 阻止 | 只读访问场景 |

也可以针对特定端点覆盖权限：

```typescript
// Slack 设为 open，但发送消息需审批
const slackPlugin = slack({
  permissions: {
    mode: 'open',
    overrides: {
      'messages.post': 'strict'
    }
  }
});
```

### Webhook 处理

所有插件自带类型安全的 webhook 处理器：

```typescript
import { processWebhook } from 'corsair';

app.post('/webhooks', async (req, res) => {
  const webhook = await processWebhook(corsair, req.headers, req.body);
  return res.json(webhook.response);
});
```

Webhook 自动验证签名，所有集成共用单一端点。

### 与 Agent 集成

Corsair 作为 MCP 服务器运行，可接入任何支持 MCP 的 Agent：

1. 配置 Agent 的 MCP 连接指向 Corsair 实例
2. Agent 自动获得所有已配置集成的工具调用能力
3. 敏感操作触发权限请求，等待用户审批

## 五、常见问题与解决方案

### Q: 凭证存储在哪里？

存储在加密数据库中，使用信封加密。用户控制的 KEK 加密每个租户的 DEK，DEK 再加密实际密钥。也可以自行管理密钥，跳过内置密钥管理器。

### Q: Agent 能看到我的 API 密钥吗？

不能。Agent 只能看到方法名和调用结果。凭证由 Corsair 内部在调用时解析，Agent 无法读取、日志记录或导出凭证。

### Q: 拒绝审批后会发生什么？

操作被丢弃，不会发送、创建或修改任何内容。Agent 可以修正参数后重新请求审批。

### Q: 能同时使用多个租户吗？

可以。设置 `multiTenancy: true`，每个租户获得隔离的凭证、数据存储和权限评估。

### Q: 能与直接 SDK 调用并存吗？

可以。Corsair 是一个库，在需要权限层和密钥管理的地方使用，需要自定义逻辑时可直接使用底层 SDK。

### Q: Agent 能绕过权限请求吗？

不能。权限请求存储在 Agent 无法访问的数据库中，只有该数据库行被设为 `approved` 后才能继续执行。

## 六、总结

Corsair 解决了 AI Agent 集成的核心矛盾：**既要让 Agent 有能力，又要让它守规矩**。通过凭证隔离、细粒度权限控制和多租户架构，Corsair 让开发者放心地把"应用钥匙"交给 Agent，同时保留对敏感操作的完全控制。

项目采用 TypeScript 编写，插件化架构易于扩展，支持 MCP 协议可接入任意 Agent。对于正在构建 Agent 应用的团队，Corsair 值得作为集成层的基础设施考虑。

项目地址：[https://github.com/corsairdev/corsair](https://github.com/corsairdev/corsair)
