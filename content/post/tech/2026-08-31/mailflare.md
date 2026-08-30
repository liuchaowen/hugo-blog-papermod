---
title: "Mailflare：基于 Cloudflare 的自托管 AI 邮件收件箱"
date: 2026-08-31
description: "Mailflare 是一个运行在 Cloudflare 上的自托管邮件系统，借助 Workers、D1、R2、Durable Objects 和 Email Routing 实现自定义域名的收发信、实时通知与 AI 收件箱。本文从架构、技术栈、安装与实战角度深度拆解。"
author: "Cheman"
slug: mailflare
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, Cloudflare, 自托管, 邮件]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**Mailflare**，一个完全跑在 Cloudflare 上的自托管、AI 驱动的邮件收件箱，支持自定义域名收发信。它把 Cloudflare 的一整套 Serverless 原语（Workers、D1、R2、Durable Objects、Email Routing、Queues）串成了一套完整邮箱系统，几乎不依赖任何传统服务器。

## 一、项目概述

Mailflare 的定位是「自托管邮件客户端 + 域名邮箱管理后台」：你拥有自己的域名，把收发信能力托管在 Cloudflare，前端用类 Gmail 的网格视图管理收件箱、已发送、草稿、垃圾和垃圾箱。

核心能力包括：

- **域名接入**：通过 Cloudflare API 自动完成入站 Email Routing 的 DNS（MX/SPF/DKIM）与发信子域名的 DNS 设置，移除域名时自动清理对应路由规则与子域资源。
- **邮箱管理**：创建邮箱时自动写入 Cloudflare Email Routing 规则；提供网格视图、邮箱详情页、可编辑显示名。
- **完整文件夹体系**：收件箱、已发送、草稿、垃圾、垃圾箱，共用同一套邮件列表组件。
- **撰写体验**：弹窗式撰写器，自动保存草稿，可从草稿夹恢复续写。
- **附件支持**：入站/出站附件存于 R2，下载需鉴权。
- **实时性**：通过 WebSocket 在收到新邮件时即时推送通知并刷新未读计数。
- **搜索与统计**：搜索、过滤、更丰富的邮箱/文件夹计数。
- **对外 API**：出站发送 API、API Key、已读状态、垃圾/回收站移动、演示数据。

值得关注的是它的「Email agent」路线图（尚未完成）：意图分类、紧急度评分、实体抽取、待回复/等待对方/已处理等按动作状态组织的收件箱视图，以及需要人工批准的自动回复与转发。这正好契合其「AI 收件箱」的卖点。

## 二、技术原理

### 2.1 架构总览

Mailflare 本质上是一个 **Next.js 16 应用，经 OpenNext 编译为 Cloudflare Worker 运行**，并由一个 `worker.ts` 包装层接管邮件与队列事件。技术栈来自 `package.json`：

| 维度 | 选型 |
|------|------|
| 框架 | Next.js 16（`next.config.ts` 启用 `turbopack`） |
| 部署 | `@opennextjs/cloudflare` + Wrangler |
| 数据库 | Drizzle ORM + Cloudflare D1 |
| 对象存储 | Cloudflare R2（附件） |
| 实时 | Durable Objects（`RealtimeHub`）+ WebSocket |
| 异步 | Cloudflare Queues（入站/出站） |
| 解析 | `postal-mime`（入站 MIME），`mimetext`（出站） |
| 鉴权/UI | `bcryptjs`、`zod`、`@radix-ui/*`、`tailwindcss v4`、`@tanstack/react-query` |

### 2.2 收信链路（从 SMTP 到数据库）

Cloudflare Email Routing 把发往你域名的邮件转交到 Worker。关键在 `worker.ts` 的 `email()` 处理器：

```ts
async email(message: ForwardableEmailMessage, env: CloudflareEnv, ctx: ExecutionContext) {
  const decision = await resolveInboundAddress(getDb(env), message.to);
  if (!decision?.mailbox || decision.action !== "store") {
    message.setReject("Unknown recipient");
    return;
  }
  // 账户级转发（避免回环用 MAILFLARE_FORWARDED_HEADER 标记）
  const rawR2Key = await storeRawToR2(env, message.from, message.to, message.raw);
  const payload: InboundQueueMessage = {
    from: message.from, to: message.to, rawR2Key,
    headers: Object.fromEntries(message.headers),
  };
  await env.INBOUND_QUEUE.send(payload);
}
```

设计上非常「Serverless 友好」：**邮件原始内容先落 R2（避免队列体积爆炸），只把引用 key 投入 `INBOUND_QUEUE`**，随后由 `queue()` 处理器异步解析入库，失败则 `msg.retry({ delaySeconds: 10 })` 退避重试。出站发送走 `OUTBOUND_QUEUE` 同一条 `queue()` 分支，靠 `isInboundQueueMessage` 区分消息类型。

### 2.3 实时推送

`/api/realtime` 端点把 WebSocket 升级请求路由到 `RealtimeHub` Durable Object（按 `user.id` 命名空间隔离）：

```ts
if (url.pathname === "/api/realtime") {
  const user = await getUserFromSession(env, getSessionTokenFromRequest(request));
  if (!user || user.disabled) return new Response("Unauthorized", { status: 401 });
  const hub = env.REALTIME.getByName(user.id);
  return hub.fetch(new Request("https://mailflare-realtime/connect", request));
}
```

入库完成后由 Durable Object 主动推送，未读计数无需轮询；连接中断时客户端自动重连并退化为较慢的定时刷新。

### 2.4 域名 API 直通 Cloudflare

Mailflare 的域名不是「仅后台配置」，而是在你增删域名时**真正调用 Cloudflare API**：

- `GET /zones/{zone_id}/email/routing/dns` 查询路由 DNS 状态
- `POST /zones/{zone_id}/email/routing/dns` 启用入站路由 + MX/SPF/DKIM
- `POST /zones/{zone_id}/email/sending/subdomains` 开通子域发信并配置 DNS

因此它对运行期 token 有明确权限要求：`Zone Read`、`Email Routing Edit`、`Email Sending Edit`、`Email Routing Rules Write`。

## 三、安装与快速开始

### 3.1 本地开发

```bash
cp .dev.vars.example .dev.vars
# 填入 CF_TOKEN（建议 scope token），可选 CF_AID
# 若用旧版 Global API Key，则填 CF_API_KEY + CF_EMAIL

npm install
npm run db:migrate:local   # 本地 D1 迁移
npm run dev                # 启动 Next.js 开发服务器
```

首次访问 `/setup` 会检查 Cloudflare 运行时配置并在绑定的 D1 为空时初始化表结构；也可手动灌演示数据：

```bash
curl -X POST http://localhost:3000/api/seed
```

### 3.2 一键部署到 Cloudflare

Mailflare 提供「Deploy to Cloudflare」按钮，部署流会读取 `wrangler.jsonc`、自动预置 Worker 绑定、按 `.dev.vars.example` 提示填值、执行 D1 迁移、构建 OpenNext Worker 并发布。注意 `wrangler.jsonc` 需提交，但 `.dev.vars` 切勿提交。

运行期需配置的关键变量：

- `CF_TOKEN`：运行期 Cloudflare API token（与部署/构建 token 相互独立）。
- `CF_EMAIL_WORKER_NAME`：必须**精确等于**部署后的 Worker 名称，否则创建邮箱路由规则会失败（新版已改为缺失即明确报错，而非静默默认 `mailflare`）。
- `GITHUB_UPDATE_TOKEN` / `GITHUB_UPDATE_REF`：仅管理员「Update Mailflare」按钮需要，用于派发 `.github/workflows/update.yml` 拉取上游更新。

手动部署则为 `npm run deploy`（OpenNext 构建 + Wrangler 上传），其 `worker.ts` 包装层额外导出 `RealtimeHub` 与 `DatabaseBackupWorkflow`。

## 四、使用方法与实战

### 4.1 附件收发

后台撰写器支持最多 10 个附件，单文件 10 MB、合计 20 MB 上限；元数据入 D1，内容入 R2。出站 `POST /api/v1/send` 也接受 JSON 附件：

```json
{
  "from": "support@example.com",
  "to": "user@example.net",
  "subject": "Report",
  "text": "Attached.",
  "attachments": [
    { "filename": "report.pdf", "type": "application/pdf", "contentBase64": "<base64>" }
  ]
}
```

入站 MIME 附件由 `postal-mime` 自动抽取，下载需校验所属邮箱权限。

### 4.2 自动更新与备份

- **更新**：管理员面板的「Update Mailflare」按钮派发 GitHub Actions，从 `hieunc229/mailflare` 拉取最新代码、合并、应用待执行 D1 迁移并推送；版本比对后才允许点击。
- **备份**：依赖 `DATABASE_BACKUP_WORKFLOW` 绑定，需要 `CF_AID` 与 `D1_DATABASE_ID`；配置了 `D1_BACKUP_TOKEN` 则优先用它（否则复用 `CF_TOKEN`），两者都需具备导出 D1 的权限。

### 4.3 实战示例：自定义域名邮箱

1. 在 Cloudflare 拥有一枚域名（zone apex 或其子域）。
2. 部署后于 `/setup` 完成首跑配置。
3. 通过 `GET/POST /api/domains` 添加域名 → Mailflare 自动打通入站路由与发信子域 DNS。
4. 创建 `hello@example.com` 邮箱 → 自动写入 Email Routing 规则指向 `CF_EMAIL_WORKER_NAME`。
5. 用浏览器登录收件箱，收到邮件时 WebSocket 即时弹窗提醒。

## 五、常见问题与解决方案

**Q1：部署成功但 onboarding 报 Cloudflare API 403 / code 9109 Invalid access token**
一键部署按钮能完成 Worker 部署，却不会给 Mailflare 创建运行期 `CF_TOKEN`。需到 Cloudflare 后台手动创建带 `Zone Read`、`Email Routing Edit`、`Email Sending Edit`、`Email Routing Rules Write` 的 token，并以 secret 形式填入。校验：

```bash
curl "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer <CF_TOKEN>"
# 期望返回 "success": true, "status": "active"
```

注意：`CF_TOKEN` 只填 token 密文，不要带 `Bearer`、不要用 token ID、不要把 Global API Key 塞进去。

**Q2：调用 `/zones/{zone_id}/email/routing/dns` 返回 403 / code 10000**
token 权限不足。账户级至少需 `Email Sending:Edit`、`DNS Settings:Edit`、`Email Routing Addresses:Edit`；区域级需 `DNS Settings:Edit`、`Email Routing Rules:Edit`、`Zone Settings:Edit`、`DNS:Edit`。

**Q3：D1 部署报 `database could not be found [code: 7404]`**
`wrangler.jsonc` 里提交了他人账户的 `database_id`。D1 数据库 ID 是账户相关的，本项目 `DB` 绑定只声明 `database_name`，让 Wrangler 为新账户自动预置。删掉提交的 `database_id` 即可。

**Q4：重命名 Worker 后规则/绑定对不上**
Cloudflare 服务绑定要求字面量名称严格一致。需同步修改 `wrangler.jsonc` 中的 `name`、`services[].service`（`WORKER_SELF_REFERENCE`）、`CF_EMAIL_WORKER_NAME`，保证三者相同。

**Q5：备份页提示绑定缺失**
`DATABASE_BACKUP_WORKFLOW` 未预置。用 `npm run deploy` 完整部署 Worker（而非仅 `next dev` 或纯源码更新），才能确保新绑定被创建。

## 六、总结

Mailflare 展示了一种相当「现代」的自托管思路：把邮件这种传统重服务，完全拆解为 Cloudflare 的 Serverless 原语——Workers 承载应用、D1 存元数据、R2 存附件、Queues 做异步管道、Durable Objects 做实时中枢，并用 Email Routing 直接接管 SMTP 入站。它极大降低了自建域名邮箱的运维成本，同时把域名 DNS 的繁琐配置收敛进一个 API 调用。

当然，它目前仍是早期版本（v0.2.0），且涉及 Cloudflare 权限、D1 备份、账号转发等诸多细节，部署链路对 token 与绑定名称一致性要求较高；路线路中的「AI 收件箱 / 邮件智能体」也还停留在规划阶段。如果你本就重度使用 Cloudflare、又想拥有完全自控的域名邮箱，Mailflare 值得一试；若追求开箱即用，则建议等其 AI agent 路线进一步落地。

- 项目地址：https://github.com/hieunc229/mailflare
