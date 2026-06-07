---
title: "AiToEarn：一人公司的AI内容营销自动化利器"
date: 2026-06-07
description: "AiToEarn 是一个面向 OPC（一人公司）的 AI 内容营销智能体平台，支持一键分发到抖音、小红书、TikTok、YouTube 等 10+ 主流平台，帮助创作者实现内容变现全流程自动化。"
author: "Cheman"
slug: aitoearn
draft: false
categories: ["技术", "开源"]
tags: ["AI", "内容营销", "自动化", "开源", "GitHub"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AiToEarn**，这是一个专为一人公司（OPC）打造的 AI 内容营销智能体平台，能够帮助创作者实现内容生成、分发、变现的全流程自动化。

## 一、项目概述

AiToEarn 是一个开源的 AI 内容营销自动化平台，围绕内容创作者的完整变现链路，提供四大核心 Agent 能力：

- **💰 Monetize（内容赚钱）**：创作者可以在平台出售内容以完成商家的推广任务，支持 CPS、CPE、CPM 三种结算模式
- **📢 Publish（内容发布）**：一键将内容分发到全球 10+ 主流平台，包括抖音、小红书、快手、B站、视频号、TikTok、YouTube、Facebook、Instagram、Threads、X（Twitter）、Pinterest、LinkedIn
- **💬 Engage（内容互动）**：通过浏览器插件实现自动化互动运营，支持自动点赞、收藏、关注、AI 智能回复评论
- **🎨 Create（内容创作）**：Agent 自动调用视频生成模型（Grok、Veo、Seedance 等）、视频翻译、剪辑模块，一站式完成视频制作

项目地址：[https://github.com/yikart/AiToEarn](https://github.com/yikart/AiToEarn)

## 二、技术原理

### 架构设计

AiToEarn 采用前后端分离架构，主要包含以下模块：

```
project/
├── aitoearn-backend/    # 后端服务（Nx monorepo）
│   ├── apps/aitoearn-ai/     # AI 服务
│   └── apps/aitoearn-server/ # API 服务器
├── aitoearn-web/        # 前端 Web 应用
└── AttAiToEarn/         # Electron 桌面客户端
```

### 核心技术栈

- **前端**：基于 Electron 构建桌面应用，支持跨平台（Windows/macOS/Linux）
- **后端**：使用 Nx monorepo 管理，支持 pnpm 作为包管理器
- **AI 模型集成**：支持 Nano Banana Pro、HappyHorse 1.0、Seedance 2.0 等图片/视频生成模型
- **协议支持**：提供 MCP（Model Context Protocol）协议，可在 Claude、Cursor 等 AI 助手中直接使用

### 数据存储

项目使用 Docker Compose 一键部署，内置 MongoDB 和 Redis 服务：

```yaml
# docker-compose.yml 核心配置
services:
  aitoearn-server:
    depends_on:
      - mongodb
      - redis
```

### Relay 机制

为了简化 OAuth 授权流程，AiToEarn 提供了 Relay 服务配置：

```yaml
RELAY_SERVER_URL: https://aitoearn.ai/api
RELAY_API_KEY: 你的API-Key
RELAY_CALLBACK_URL: http://localhost:8080/api/plat/relay-callback
```

通过 Relay，用户可以直接借用官方的开发者凭据完成各平台的 OAuth 授权，无需自行申请开发者账号。

## 三、安装与快速开始

### 方式一：网页直接使用（最简单）

- 中国用户：[https://aitoearn.cn](https://aitoearn.cn/)
- 国际用户：[https://aitoearn.ai](https://aitoearn.ai/)

### 方式二：Docker 一键部署

```bash
# 克隆仓库
git clone https://github.com/yikart/AiToEarn.git
cd AiToEarn

# 启动服务
docker compose up -d
```

启动后访问 [http://localhost:8080](http://localhost:8080) 即可使用。

### 方式三：在 Claude / Cursor 中使用

在 `claude_desktop_config.json` 中添加 MCP 配置：

```json
{
  "mcpServers": {
    "aitoearn": {
      "type": "http",
      "url": "https://aitoearn.ai/api/unified/mcp",
      "headers": {
        "x-api-key": "你的API-Key"
      }
    }
  }
}
```

### 方式四：在 OpenClaw（龙虾）中使用

```bash
npx -y @aitoearn/openclaw-plugin-cli
```

首次运行会引导选择环境并输入 API Key。

## 四、使用方法与实战

### 获取 API Key

1. 打开 [aitoearn.cn](https://aitoearn.cn/) 或 [aitoearn.ai](https://aitoearn.ai/)
2. 注册并登录
3. 点击左侧菜单「设置」
4. 在「API Key」中点击创建，复制生成的 Key

### 内容发布实战

AiToEarn 支持「日历排期」功能，像排日程一样统一规划所有平台的内容发布时间：

```markdown
# 支持的平台
抖音、小红书、快手、B站、视频号、微信公众号、
TikTok、YouTube、Facebook、Instagram、Threads、X、Pinterest、LinkedIn
```

### 内容创作实战

Agent 自动调用以下模块完成内容制作：

- **视频生成**：Grok、Veo、Seedance 等模型
- **视频翻译**：自动翻译字幕和配音
- **视频剪辑**：自动剪辑、合成
- **图片生成**：Nano Banana 等顶级图片模型
- **批量生成**：支持并行生成多条内容，适合矩阵账号运营

### 内容互动实战

通过浏览器插件，可以实现：

```javascript
// 自动化操作
- 自动点赞、收藏、关注
- 批量高效运营

// AI 智能回复
- 调用大模型生成针对性回复
- 评论挖掘：识别"求链接""怎么购买"等高转化信号
- 品牌监测：实时追踪品牌讨论
```

## 五、常见问题与解决方案

### Q1: Docker 部署时 MongoDB 连接失败

检查 Docker 服务是否正常运行：

```bash
docker compose ps
docker compose logs mongodb
```

### Q2: OAuth 授权失败

确保 Relay 配置正确，环境与 API Key 匹配：

- 中国版 Key 使用 `https://aitoearn.cn/api`
- 国际版 Key 使用 `https://aitoearn.ai/api`

环境和 Key 不匹配会导致 401 错误。

### Q3: Electron 编译失败

better-sqlite3 需要本地编译环境：

```bash
npm run rebuild
```

确保已安装 node-gyp 和 Python。

### Q4: MCP 连接超时

检查网络连接，国际版可能需要科学上网。也可以使用中国版服务：

```json
{
  "url": "https://aitoearn.cn/api/unified/mcp"
}
```

## 六、总结

AiToEarn 是一个面向一人公司和独立创作者的内容营销自动化平台，通过四大 Agent 能力（Monetize、Publish、Engage、Create）覆盖了内容变现的完整链路。项目开源且提供多种部署方式，支持 Docker 一键部署、MCP 协议集成、OpenClaw 插件等多种使用方式。对于希望在多个平台同时运营内容、实现自动化内容生成和分发的创作者来说，这是一个值得尝试的工具。

项目正在积极迭代，最近更新了 HappyHorse 1.0 和 Seedance 2.0 模型支持，增强了视频/图文草稿批量生成能力。如果你对内容营销自动化感兴趣，不妨亲自体验一下。
