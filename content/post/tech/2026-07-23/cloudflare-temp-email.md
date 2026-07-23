---
title: "Cloudflare 临时邮箱：零成本搭建私有临时邮件服务"
date: "2026-07-23"
description: "cloudflare_temp_email 是一个基于 Cloudflare Workers + D1 + Pages 搭建的临时邮箱服务，完全免费、功能完整，支持邮件收发、AI 验证码识别、SMTP/IMAP 代理、社区 Telegram Bot 等，适合个人隐私保护和开发测试场景。"
author: "Cheman"
slug: cloudflare-temp-email
draft: false
categories: ["技术", "开源"]
tags: ["Cloudflare", "开源", "临时邮箱", "Privacy", "Rust WASM"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**cloudflare_temp_email**，一个基于 Cloudflare 全家桶零成本搭建的临时邮箱服务，支持邮件收发、AI 识别验证码、SMTP/IMAP 代理和 Telegram Bot，功能完整到可以直接商用。

## 一、项目概述

[dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 是一个完全开源的临时（一次性）邮箱服务，核心卖点是**零成本 + 高可用**——依托 Cloudflare 的免费额度（D1 数据库、Workers、Pages、KV、R2 等），一个人人可以免费部署的临时邮箱平台就此诞生。

**核心特性一览：**

- **完全免费**：基于 Cloudflare 免费服务，零云服务账单
- **高性能邮件解析**：Rust WASM 邮件解析引擎，解析速度和覆盖率远超 Node.js 方案
- **AI 验证码识别**：集成 Cloudflare Workers AI，自动提取邮件中的验证码、认证链接等关键信息
- **完整用户体系**：注册登录、OAuth2（GitHub/Authentik）、Passkey 无密码登录
- **SMTP / IMAP 代理**：Python 版 SMTP Proxy Server，支持外部邮件客户端收发
- **Telegram Bot 集成**：消息推送、Telegram Bot 小程序
- **多语言 UI**：前后台均支持多语言，响应式设计，移动端友好
- **Agent 友好**：内置 [cf-temp-mail-agent-mail](skills/cf-temp-mail-agent-mail/SKILL.md) Skill，AI Agent 可直接消费邮箱
- **移动端管理**：社区 Android 客户端 [CloudMail](https://github.com/Lur1N77777/CloudMail)，Expo / React Native 开发

## 二、技术原理

### 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                         用户端                               │
│                    Vue 3 (Cloudflare Pages)                  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP / API
┌──────────────────────────▼───────────────────────────────────┐
│                    Cloudflare Workers                         │
│                      (TypeScript)                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ 邮件处理 API │  │ 用户管理模块  │  │ Workers AI (AI识别)   │  │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘  │
└────┬─────────────┬──────────────┬───────────────────────────────┘
     │             │              │
┌────▼────┐ ┌─────▼─────┐ ┌──────▼──────┐
│ Cloudflare │ │  Cloudflare  │ │  Cloudflare   │
│    D1     │ │    KV      │ │     R2       │
│ (SQLite)  │ │  (邮件缓存) │ │  (附件存储)  │
└───────────┘ └───────────┘ └──────────────┘
                           │
                  ┌────────▼────────┐
                  │ Cloudflare Email │
                  │     Routing      │
                  │  (邮件转发入站)   │
                  └─────────────────┘
```

### Rust WASM 邮件解析

项目使用 [mail-parser-wasm](https://github.com/nicoPass/mail-parser-wasm) 实现高性能邮件解析，编译为 WebAssembly 后在 Workers 中运行：

```rust
// rust/src/lib.rs - 邮件解析核心
use mail_parser::MessageParser;

pub fn parse_email(raw: &[u8]) -> ParsedEmail {
    let message = MessageParser::default()
        .parse(raw)
        .unwrap();
    ParsedEmail {
        from: message.from().map(|f| f.address()),
        subject: message.subject().map(|s| s.to_string()),
        body_text: message.body_text(0),
        body_html: message.body_html(0),
        attachments: message.attachments().map(|a| Attachment {
            filename: a.filename().map(|f| f.to_string()),
            content_type: a.content_type().to_string(),
            size: a.contents().len(),
        }).collect(),
    }
}
```

对比 Node.js 的 `mailparser` 库，Rust WASM 在复杂邮件（如多层嵌套 MIME、畸形编码）的解析成功率上优势明显，项目 README 明确指出「node 的解析模块解析邮件失败的邮件，rust wasm 也能解析成功」。

### Cloudflare D1 数据库

D1 是 Cloudflare 的 SQLite 数据库服务，Workers 中直接通过 SQL 操作：

```typescript
// workers/src/db.ts
const stmt = env.DB.prepare(
  'SELECT * FROM emails WHERE address = ? ORDER BY created_at DESC'
);
const { results } = await stmt.bind(userAddress).all();
```

D1 免费额度为 5GB 存储、无限数据库数量，对于个人临时邮箱服务完全够用。

### Workers AI 验证码识别

集成 Cloudflare Workers AI 自动提取邮件内容中的验证码：

```typescript
// workers/src/ai.ts
const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
  messages: [
    {
      role: 'system',
      content: '从邮件中提取验证码，格式为纯数字或字母，' +
        '如果没有验证码返回"无"。只返回验证码本身，不要其他文字。'
    },
    { role: 'user', content: emailBody }
  ]
});
```

## 三、安装与快速开始

### 方式一：一键部署到 Cloudflare

点击下方按钮即可自动部署前后端到 Cloudflare：

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://temp-mail-docs.awsl.uk/zh/guide/actions/github-action.html)

### 方式二：GitHub Action 自动部署

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

详细文档参考：[部署文档](https://temp-mail-docs.awsl.uk/zh/guide/actions/github-action.html)

### 方式三：本地手动部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 克隆项目
git clone https://github.com/dreamhunter2333/cloudflare_temp_email.git
cd cloudflare_temp_email

# 安装依赖
npm install
cd workers && npm install && cd ..
cd frontend && npm install && cd ..

# 配置 Cloudflare D1 数据库
wrangler d1 create temp-email-db
# 将返回的 database_id 填入 wrangler.toml

# 初始化数据库
wrangler d1 execute temp-email-db --file=./workers/schema.sql

# 部署
wrangler deploy
```

### 环境要求

- Node.js 18+
- npm / pnpm
- Cloudflare 账号（免费即可）
- GitHub 账号（可选，用于 OAuth 登录）

## 四、使用方法与实战

### 基础使用

1. 访问部署好的前端页面（如 [mail.awsl.uk](https://mail.awsl.uk/)）
2. 自动生成一个随机临时邮箱地址
3. 用该地址注册网站或接收验证码
4. 刷新页面查看收到的邮件
5. AI 自动提取验证码并高亮显示

### SMTP 代理发送邮件

项目提供 Python 版 SMTP/IMAP Proxy，可在本地运行：

```bash
# 安装 SMTP Proxy
pip install cloudflare-temp-email[smtp]

# 配置
export SMTP_PROXY_URL="https://your-worker.workers.dev"
export SMTP_PROXY_TOKEN="your-token"

# 启动 SMTP 服务
smtp-proxy --port 2525
```

之后配置邮件客户端（如 Thunderbird）连接 `localhost:2525` 即可通过临时邮箱发送邮件。

### Telegram Bot 推送

配置 Bot Token 后，收到新邮件会自动推送到 Telegram：

```bash
# 在 Cloudflare Workers 环境变量中配置
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

### AI Agent 集成

通过内置 Skill，AI Agent 可直接使用临时邮箱：

```bash
# 集成 cf-temp-mail-agent-mail skill
# Agent 只需调用 skill，即可：
# 1. 创建临时邮箱
# 2. 等待指定邮件到达
# 3. 提取验证码
# 全程无需人工干预
```

## 五、常见问题与解决方案

### Q: Resend 域名验证失败？

在 Resend 添加 MX 记录时，如果域名解析托管在三级域名（如 `a.b.com`），需要**删除 Resend 默认生成的 name 中的二级域名前缀** `b`，否则会变成 `a.b.b.com`。

验证命令：
```bash
nslookup -qt="mx" your-domain.com 1.1.1.1
```

### Q: D1 数据库免费额度用完了怎么办？

D1 免费额度为 5GB，对于个人使用完全足够。如需更大容量可升级到 D1 Paid plan（$5/月起）。

### Q: 如何防止垃圾邮件滥用？

项目内置了：
- Cloudflare Turnstile 人机验证
- 限流配置（Rate Limiting）
- 黑白名单配置
- 定时清理功能（支持多种清理策略）

### Q: 附件存储空间不足？

支持切换到 Cloudflare R2 或外部 S3 兼容存储：
```bash
# 配置 R2
R2_BUCKET=your-bucket
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
```

## 六、总结

cloudflare_temp_email 是一个完成度极高的开源临时邮箱解决方案，将 Cloudflare 的免费生态用到极致：**Workers 作为后端、D1 作为数据库、Pages 托管前端、Email Routing 处理入站邮件、Rust WASM 提供极速邮件解析**，整套架构几乎没有额外的云服务成本。

亮点总结：
- 🆓 **零成本**：Cloudflare 免费额度全覆盖
- 🤖 **AI 加持**：Workers AI 自动识别验证码和重要链接
- 📦 **功能完整**：收发邮件、SMTP/IMAP、移动端管理、Telegram Bot
- 🔒 **隐私优先**：完全自托管，数据在自己手中
- 🛠️ **易于部署**：GitHub Action + 一键按钮，最快 5 分钟上线

如果你需要保护个人隐私、需要一个临时收件地址、或者想为 AI Agent 提供邮件能力，这个项目值得一试。

**在线体验：** [https://mail.awsl.uk/](https://mail.awsl.uk/)
**项目地址：** [https://github.com/dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email)
**文档站点：** [https://temp-mail-docs.awsl.uk](https://temp-mail-docs.awsl.uk)
