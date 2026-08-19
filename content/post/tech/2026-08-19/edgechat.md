---
title: "EdgeChat：基于 Cloudflare 全家桶的现代团队聊天系统"
date: 2026-08-19
description: "EdgeChat 是一个完全部署在 Cloudflare 上的开源团队聊天系统，集账号体系、公开/私有群组、私信、实时 WebSocket 消息、AES-256-GCM 服务端加密、Telegram 双向桥接等功能于一体，零服务器运维，成本极低。"
author: "Cheman"
slug: edgechat
draft: false
categories: ["技术", "开源", "Cloudflare"]
tags: ["Cloudflare Workers", "Durable Objects", "Vue 3", "Hono", "团队协作", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**EdgeChat**，一个基于 Cloudflare 全家桶（Workers + Durable Objects + D1 + R2 + KV）打造的现代团队聊天系统，主打零服务器运维、在免费额度内即可跑起来。

## 一、项目概述

EdgeChat 目标非常明确——在 Cloudflare 生态里，用尽量低的运维成本，跑起一套能直接落地使用的站内 IM。它提供了完整的聊天功能集：

- **账号体系**：管理员创建用户，不开放自助注册，适合内部团队
- **公开/私有群组**：支持公开群组和私有群组两种模式
- **私信会话**：一对一私聊，消息加密存储
- **实时消息**：基于 Durable Objects WebSocket  hibernation 实现真正的实时推送
- **文件上传**：消息内支持附件，使用 Cloudflare R2 存储
- **AES-256-GCM 服务端加密**：新写入的消息正文和附件使用服务端加密，历史明文数据不做批量回填
- **Telegram 双向桥接**：管理员可将任意群组与 Telegram 群组绑定，通过 Bot 实现 EdgeChat ↔ Telegram 的消息双向实时转发，两侧成员无需切换应用
- **管理后台**：仪表盘、用户管理、注册邀请、网站设置
- **现代化界面**：Liquid Glass 风格，适配移动端

EdgeChat 还提供了在线 Demo（[edgechat-demo.wcjxxgaq.workers.dev](https://edgechat-demo.wcjxxgaq.workers.dev)），演示站在浏览器内存中模拟所有逻辑，不会访问正式 Worker 或写入任何数据。

## 二、技术原理

### 2.1 整体架构

EdgeChat 的前后端均部署在 Cloudflare 边缘网络上，充分利用 Cloudflare 的全球节点实现低延迟访问。

```
前端（Vue 3 + Vite）
    ↓ HTTP REST API / WebSocket
Cloudflare Workers（运行 Hono 框架）
    ↓                    ↓
Durable Objects（WS会话管理）  D1（关系数据）/ R2（文件）/ KV（会话/缓存）
```

### 2.2 实时消息：Durable Objects WebSocket  Hibernation

核心亮点是使用 **Durable Objects（DO）的 WebSocket Hibernation** 实现聊天室。每创建一个聊天房间，Cloudflare 会在最近的边缘节点启动一个 DO 实例，该实例维护所有到这个房间的 WebSocket 连接。Hibernation API 允许 DO 在没有活动连接时暂停，节省资源，有新消息时唤醒并广播。

// worker/src/do/chat-room.js（简化）
export class ChatRoom extends HibernatableWebSocket DurableObjects {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async webSocketMessage(peer, message) {
    const data = JSON.parse(message);
    if (data.type === 'chat') {
      const outbound = JSON.stringify({
        type: 'message',
        from: data.from,
        content: data.content,
        timestamp: Date.now()
      }});
      this.sessions.forEach(session => {
        session.getWebSocket(peer).send(outbound);
      }});
    }
  }
}

### 2.3 后端 API：Hono 框架

Worker 层使用 [Hono](https://hono.dev/) 框架，这是一个轻量、极速的边缘友好 Web 框架，兼容 Cloudflare Workers API。

// worker/src/index.js（简化）
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/*', cors());
app.post('/api/auth/login', async (c) => {{ /* 登录逻辑 */ }});
app.post('/api/chat/message', async (c) => {{ /* 消息入库 */ }});
app.get('/api/chat/history/:roomId', async (c) => {{ /* 历史消息分页 */ }});
app.post('/api/telegram/bridge', async (c) => {{ /* Telegram 消息转发 */ }});

export default {{
  fetch: app.fetch,
  scheduled: async (controller) => {{ /* Cron: 定时清理过期消息 */ }}
}};

### 2.4 数据存储

| 数据类型 | 存储方案 | 说明 |
|---------|---------|------|
| 用户/群组/消息元数据 | Cloudflare D1 | SQLite 边缘数据库，支持分片 |
| WebSocket 会话状态 | Durable Objects | 每个房间一个 DO 实例 |
| 临时会话令牌 | Cloudflare KV | 高性能键值缓存 |
| 上传的文件/附件 | Cloudflare R2 | S3 兼容的对象存储 |
| 加密密钥 | GitHub Actions Secrets（部署时注入） | 不在前端暴露 |

### 2.5 Telegram 桥接原理

Telegram 桥接是 EdgeChat 最具特色的功能。当管理员绑定群组后：

1. EdgeChat 消息通过 Telegram Bot API 推送到 Telegram 群
2. Telegram Bot 接收群消息，通过 Telegram Bot API 反向推送回 EdgeChat
3. 两条通路同时工作，实现**双向无缝同步**

```
EdgeChat 用户A → EdgeChat Worker → Telegram Bot API → Telegram 群
Telegram 群消息 → Telegram Bot → EdgeChat Worker → EdgeChat 用户B
```

## 三、安装与快速开始

### 3.1 环境要求

- Node.js ≥ 18
- Cloudflare 账号（免费额度足够个人/小团队使用）
- Wrangler CLI：`npm install -g wrangler`

### 3.2 GitHub Actions 自动部署（推荐）

1. Fork [aozorae/Edgechat](https://github.com/aozorae/Edgechat)
2. 在 Cloudflare Dashboard 创建以下资源并记录 ID：
   - D1 数据库：`wrangler d1 create cfchat-db`
   - R2 Bucket：`wrangler r2 bucket create cfchat-files`
   - KV Namespace：`wrangler kv:namespace create SESSIONS`
3. 在 GitHub 仓库 Settings → Secrets 中配置：
   - `CLOUDFLARE_API_TOKEN`（需要 Account Permissions: Workers, D1, R2, KV）
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_D1_DATABASE_ID`
   - `CLOUDFLARE_R2_BUCKET_NAME`
   - `CLOUDFLARE_KV_NAMESPACE_ID`
4. 推送代码或手动触发 GitHub Actions `Deploy Worker` workflow

详细文档：[https://echat.azora.top/guide/actions-deploy.html](https://echat.azora.top/guide/actions-deploy.html)

### 3.3 本地开发

```bash
git clone https://github.com/aozorae/Edgechat.git
cd Edgechat
npm install

# 前端开发（热重载）
npm run dev:frontend

# 本地部署测试
npm run deploy
```

### 3.4 Docker 本地运行

```bash
docker build -t edgechat .
docker run -p 8787:8787 edgechat
```

## 四、使用方法与实战

### 4.1 创建群组

管理员登录后，在管理后台创建公开群组或私有群组。公开群组对所有用户可见，私有群组需要邀请链接才能加入。

### 4.2 Telegram 桥接配置

1. 在 Telegram Bot Father 创建一个 Bot，记录 Token
2. 将 Bot 加入目标 Telegram 群组，并授予管理员权限
3. 在 EdgeChat 管理后台，进入目标群组设置 → Telegram 桥接，填入 Bot Token
4. 配置完成后，两侧消息即可双向实时同步

### 4.3 Telegram Bot 的使用技巧

- 通过 `/status` 命令查看桥接状态
- 管理员可在任意一端撤回消息
- 消息会标注来源（EdgeChat / Telegram）

## 五、常见问题与解决方案

### Q: 部署到 Workers 后访问报 403/404？
检查 `wrangler.toml` 中的 `compatibility_date` 和 Worker 名称是否与 Cloudflare Dashboard 中一致，同时确认 D1、R2、KV 的 bindings 名称正确。

### Q: WebSocket 连接不稳定？
 Durable Objects 的可用性取决于节点健康状态。在 Cloudflare Dashboard → Durable Objects 查看各实例状态。如果频繁断开，检查是否触发了 DO 的 CPU 时间限制。

### Q: 文件上传失败？
确认 R2 Bucket 的权限正确配置，且 `CLOUDFLARE_R2_BUCKET_NAME` 与实际 Bucket 名称完全一致（R2 Bucket 名称不支持修改）。

### Q: 消息加密后如何解密？
加密密钥由 GitHub Actions 在部署时注入 Worker Secrets，存储在 Worker 运行环境变量中。解密逻辑仅在服务端执行，管理员后台不提供消息正文查看入口以保护隐私。

### Q: 如何迁移已有数据？
目前项目不提供自动化迁移工具。历史数据需要手动通过 D1 API 导入，同时注意加密密钥环的兼容性问题。

## 六、总结

EdgeChat 是一个值得关注的项目，它将整套 IM 系统压缩到 Cloudflare 的免费/低价 Serverless 生态中，零运维、开箱即用，尤其适合：小型团队/工作室内部沟通、追求数据完全自主的技术团队、以及希望在 Telegram 生态和独立 IM 之间架桥的场景。

当然它也有局限——Durable Objects 的 Stateful 特性意味着每个活跃房间都对应一个常驻 DO 实例，高并发场景下成本会比无状态 Worker 更高；数据加密目前是服务端加密而非端到端加密，不适合极度敏感的通讯场景。

如果你正在寻找一套轻量、免费、易部署的团队 IM 方案，EdgeChat 值得一试。

> 项目地址：[https://github.com/aozorae/Edgechat](https://github.com/aozorae/Edgechat)  
> 在线 Demo：[https://edgechat-demo.wcjxxgaq.workers.dev](https://edgechat-demo.wcjxxgaq.workers.dev)  
> 官方文档：[https://echat.azora.top/](https://echat.azora.top/)
