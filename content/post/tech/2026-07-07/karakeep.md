---
title: "Karakeep：一个带 AI 的极简「万物收藏」自托管书签应用"
date: 2026-07-07
description: "Karakeep（原 Hoarder）是一款以自托管为先的「收藏一切」书签管理应用，支持链接、图片、PDF、RSS 自动抓取，并内置基于 LLM 的自动标签与摘要、全文检索、OCR、规则引擎以及 iOS/Android/浏览器全平台客户端。本文从架构、技术栈、安装使用到常见问题进行深度解析。"
author: "Cheman"
slug: karakeep
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 自托管, AI, 书签]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Karakeep**（原名 Hoarder），一个面向「数据囤积者」的、带一点 AI 的自托管「万物收藏」应用。它想把链接、笔记、图片、PDF、RSS 统统收进一个能全文搜索、还能自动打标签的私人知识库。

## 一、项目概述

Karakeep 的定位是 **self-hostable bookmark-everything app**——把所有值得留存的东西集中到一个由你自己掌控的实例中。它的命名灵感来自阿拉伯语口语词「كراكيب」（karakeeb），意指抽屉里那堆看似杂乱、却总舍不得扔掉的零碎杂物，恰好契合「囤积者」的使用心理。

项目解决的核心痛点：

- 主流 read-it-later 应用（如 Pocket，已被 Mozilla 宣布关停）大多不开放自托管，数据不在自己手里；
- 纯笔记类工具（如 memos）缺少链接预览与自动分类，时间线里塞满链接却分不清哪个是哪个；
- 商业产品（如 mymind、Raindrop）要么收费、要么不可自托管。

核心特性一览：

- 🔗 收藏链接、笔记、图片、PDF，自动抓取标题/描述/封面图
- 📋 列表分类、多人协作、全文检索
- ✨ 基于 LLM 的自动打标与摘要（支持 Ollama 本地模型）
- 🤖 对 LLM Agent 友好（官方 CLI 与 agentic skills）
- ⚙️ 规则引擎、OCR、RSS 自动抓取、全页归档（monolith）、视频归档（yt-dlp）
- 🔌 Chrome / Firefox / Safari 插件、iOS / Android 客户端、REST API、SSO、多语言、暗色模式

## 二、技术原理

### 架构设计与技术栈

技术栈以 TypeScript 全栈为主，模块边界清晰：

- **Next.js（App Router）** 承载 Web 应用
- **Drizzle ORM** 负责数据库与迁移
- **NextAuth** 处理鉴权
- **tRPC** 完成客户端到服务端通信
- **Puppeteer** 抓取书签网页内容
- **OpenAI** 提供 AI 能力
- **Meilisearch** 支撑全文检索

从 `package.json` 的脚本可以窥见其 Monorepo 组织方式（采用 pnpm + turbo）：

```json
{
  "build": "turbo --no-daemon build",
  "dev": "turbo --no-daemon dev --parallel",
  "db:generate": "pnpm --filter @karakeep/db run generate",
  "db:migrate": "pnpm --filter @karakeep/db run migrate",
  "workers": "pnpm --filter @karakeep/workers run start",
  "web": "pnpm --filter @karakeep/web run dev"
}
```

工作区被拆分为 `@karakeep/db`、`@karakeep/web`、`@karakeep/workers`、`@karakeep/mobile` 等包，其中 **workers** 是后台任务中枢——链接抓取、OCR、LLM 摘要与打标、RSS 拉取、全页/视频归档等耗时操作都交给独立的 worker 异步处理，避免阻塞 Web 请求。

### 数据流分析

一次收藏的典型链路：

1. 用户通过浏览器插件 / API / 移动端提交一个 URL；
2. Web 端写入数据库并投递任务到消息队列；
3. `workers` 用 Puppeteer 渲染页面，抽取标题、描述、预览图；
4. 调用 LLM 生成摘要与标签（可走 OpenAI，也可走本地 Ollama）；
5. 可选：monolith 做全页静态归档防链接腐烂，yt-dlp 归档视频；
6. Meilisearch 索引全部内容，供全文检索；
7. OCR 流水线从图片中抽出文字一并入库。

这种「写入即入队、异步消费」的模式让前端响应迅速，也方便水平扩展 worker。

## 三、安装与快速开始

Karakeep 优先支持自托管，官方推荐 Docker 部署。

### 环境要求

- 一台可运行 Docker 的主机
- 可选：一个 OpenAI / 兼容 API 的 Key（用于 AI 打标与摘要），或本地 Ollama 实例
- 可选：Meilisearch（官方镜像已包含默认编排）

### 最简运行示例

克隆仓库后用 `docker compose` 一键拉起（官方提供了开箱即用的 compose 文件）：

```bash
git clone https://github.com/karakeep-app/karakeep.git
cd karakeep
cp .env.example .env
# 按需修改 .env：设置管理员账号、OpenAI Key、Meilisearch Master Key 等
docker compose up -d
```

启动后访问 `http://localhost:3000`，按引导创建账户即可。也可直接使用官方 Demo（https://try.karakeep.app，账号 `demo@karakeep.app` / 密码 `demodemo`，只读模式）先体验。

## 四、使用方法与实战

### 基础用法

- **浏览器插件收藏**：安装 Chrome / Firefox / Safari 扩展，浏览网页时一键收藏，自动带封面与描述；
- **列表与协作**：把书签归类到不同 List，可邀请他人在同一个 List 上协作；
- **全文搜索**：进入搜索框即可跨链接正文、笔记、PDF、OCR 文本检索；
- **RSS 自动囤积**：配置 RSS 源，新内容自动入库。

### 进阶用法

- **规则引擎**：用基于规则的条件自动执行管理动作，例如「标题含『论文』的链接自动打标 `paper` 并移入『学术』列表」。
- **本地 AI 隐私模式**：将 LLM 后端指向本地 Ollama，实现完全离线的自动摘要与标签，数据不出本机。
- **Agent / 自动化集成**：Karakeep 提供强大的 [CLI](https://docs.karakeep.app/integrations/command-line) 与 [官方 agentic skills](https://docs.karakeep.app/integrations/agentic-skills)，可被 LLM Agent（如 OpenClaw、Hermes）直接调用，把「收藏」变成可编排的工作流。
- **导入迁移**：支持从 Chrome、Pocket、Linkwarden、Omnivore、Tab Session Manager 导入；并通过 floccus 与浏览器书签双向同步。
- **高亮标注**：在收藏内容上做标记（highlight）并保存，便于后续回顾。

## 五、常见问题与解决方案

- **安装失败 / 容器起不来**：优先确认 `.env` 中 `MEILI_MASTER_KEY` 等必填项已设置，且 Docker 与 compose 版本满足要求；查看 `docker compose logs` 定位具体错误。
- **AI 打标/摘要不工作**：检查 `OPENAI_API_KEY` 是否正确，或 Ollama 服务是否可达、模型是否已拉取；网络受限环境建议走本地模型。
- **检索不到内容**：确认 Meilisearch 已正常运行且索引任务完成；刚收藏的内容需等待 worker 抓取与建索引。
- **抓取到的页面为空/样式错乱**：部分站点对 Puppeteer 有反爬或强依赖 JS，可开启 monolith 全页归档作为兜底存档。
- **性能问题**：书签量大时，全文检索性能主要取决于 Meilisearch；建议为 worker 分配独立资源，避免与 Web 争抢。
- **兼容性**：项目处于 heavy development 阶段（官方明确提示），配置项与 API 可能变动，升级时注意查阅 [migration 文档](https://docs.karakeep.app/)。

## 六、总结

Karakeep 把「自托管 + AI + 全平台客户端 + 自动化集成」揉进了一个干净的产品里，对既想要数据主权、又想要顺手体验的「囤积者」来说，几乎是当前开源书签管理器里少有的完整解。它既能用 OpenAI 享受强模型能力，也能用 Ollama 守住隐私底线，还能被 Agent 直接驱动——在「个人知识库 + AI 工作流」的语境下，值得一试。

> 仓库地址：https://github.com/karakeep-app/karakeep ｜ 许可证：AGPL-3.0
