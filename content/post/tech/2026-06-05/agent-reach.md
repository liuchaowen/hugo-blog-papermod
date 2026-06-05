---
title: "Agent-Reach：让 AI Agent 一键装上互联网能力"
date: "2026-06-05"
description: "Agent-Reach 是一个开源的 AI Agent 脚手架工具，通过一条命令即可为 Claude Code、OpenClaw、Cursor 等 Agent 安装 Twitter、Reddit、YouTube、B站、小红书等 10+ 平台的访问能力，所有工具均免费开源，无需付费 API Key。"
author: "Cheman"
slug: agent-reach
draft: false
categories: ["技术", "开源"]
tags: ["AI", "开源", "GitHub", "AI工具", "Agent", "自动化"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Agent-Reach**，它解决了一个很现实的问题——你的 AI Agent 能写代码、能改文档，但你想让它去网上搜条推文、看个 YouTube 视频，它就完全抓瞎了。这个项目就是来解决这个痛点的。

## 一、项目概述

**Agent-Reach** 是一个开源的 AI Agent 脚手架（scaffolding），目标是一句话让任何 AI Agent 获得 10+ 互联网平台的访问能力：

> 帮我安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md

安装完成后，Agent 就能直接读推特、搜 Reddit、看 YouTube/B站、刷小红书、访问任意网页……全部免费，不需要任何付费 API Key。

### 核心特性

- **零配置**：一条命令全自动安装，上游工具全部自动装好
- **完全免费**：所有依赖工具（yt-dlp、twitter-cli、rdt-cli 等）均为开源免费
- **隐私安全**：Cookie 只存在本地 `~/.agent-reach/config.yaml`，不上传不外传
- **持续更新**：平台封了有专人修，有新渠道随时加
- **兼容所有 Agent**：Claude Code、OpenClaw、Cursor、Windsurf……任何能跑命令行的 Agent 都能用
- **自带诊断**：`agent-reach doctor` 一条命令告诉你哪个渠道通、哪个不通

### 支持的平台一览

| 平台 | 装好即用 | 配置后解锁 |
|------|---------|-----------|
| 🌐 网页 | 阅读任意网页 | — |
| 📺 YouTube | 字幕提取 + 视频搜索 | — |
| 📡 RSS | 阅读任意 RSS/Atom 源 | — |
| 🔍 全网搜索 | — | AI 语义搜索（MCP，免费） |
| 📦 GitHub | 读公开仓库 + 搜索 | 私有仓库、Issue、PR |
| 🐦 Twitter/X | 读单条推文 | 搜索推文、发推 |
| 📺 B站 | 字幕提取 + 搜索 | 服务器访问 |
| 📖 Reddit | 搜索 + 读帖子（rdt-cli） | Cookie 认证增强 |
| 📕 小红书 | — | 搜索、阅读、发帖 |
| 🎵 抖音 | — | 视频解析、无水印下载 |
| 💼 LinkedIn | 读公开页面 | Profile 详情 |
| 💬 微信公众号 | 搜索 + 阅读全文 | — |
| 📰 微博 | 热搜、搜索、用户动态 | — |
| 📈 雪球 | 股票行情、热门帖子 | — |
| 🎙️ 小宇宙播客 | — | Whisper 转录 |

## 二、技术原理

### 架构设计：脚手架而非框架

Agent-Reach 的设计哲学非常清晰——**它是一个脚手架，不是一个框架**。安装完成后，Agent 直接调用上游工具，不再经过 Agent-Reach 的包装层。

```
channels/
├── web.py          → Jina Reader
├── twitter.py      → twitter-cli
├── youtube.py      → yt-dlp
├── github.py       → gh CLI
├── bilibili.py     → yt-dlp / bili-cli
├── reddit.py       → rdt-cli
├── xiaohongshu.py  → xhs-cli
├── douyin.py       → douyin-mcp-server
├── linkedin.py     → linkedin-scraper-mcp
├── wechat.py       → Exa + Camoufox
├── rss.py          → feedparser
├── exa_search.py  → mcporter MCP (Exa)
└── __init__.py     → doctor 检测
```

每个渠道文件只做一件事：`check()` 方法检测上游工具是否可用。实际读写搜索全部由 Agent 直接调用上游 CLI/MCP 完成。这种设计让每个组件完全可替换——不满意 Jina Reader？换成 Firecrawl 就行。

### 核心依赖选型

从 `pyproject.toml` 可以看到项目依赖：

```toml
dependencies = [
    "requests>=2.28",
    "feedparser>=6.0",
    "python-dotenv>=1.0",
    "loguru>=0.7",
    "pyyaml>=6.0",
    "rich>=13.0",
    "yt-dlp>=2024.0",
]
```

Python 版本要求 ≥3.10，使用 [Hatchling](https://hatch.pypa.io/) 作为构建后端。CLI 入口：

```toml
[project.scripts]
agent-reach = "agent_reach.cli:main"
```

安装后生成 `agent-reach` 命令，提供 `install`、`doctor`、`uninstall` 等子命令。

### Cookie 安全机制

对于需要认证的平台（Twitter、小红书），Cookie 存在 `~/.agent-reach/config.yaml`，文件权限 600（仅所有者可读写），不经过 Agent-Reach 服务层，直接由上游工具使用。README 特别提醒使用**专用小号**以防封号风险。

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- macOS / Linux（本工具主要面向开发者环境）

### 安装步骤

**第一步：给你的 Agent 发这句话**

```
帮我安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```

Agent 会自动完成：
1. `pip install agent-reach` 安装命令行工具
2. 安装系统依赖：Node.js、gh CLI、mcporter、twitter-cli、rdt-cli 等
3. 通过 MCP 接入 Exa 搜索引擎（免费，无需 Key）
4. 注册 `SKILL.md` 到 Agent 的 skills 目录
5. 运行 `agent-reach doctor` 检测环境状态

**OpenClaw 用户注意**：如果 Agent 无法执行命令，先开启 exec 权限：

```bash
openclaw config set tools.profile "coding"
```

### 安全模式（不自动改系统）

```bash
agent-reach install --env=auto --safe
```

安全模式下不会自动安装系统包，只告诉你需要什么。

### 卸载

```bash
agent-reach uninstall
```

## 四、使用方法与实战

安装完成后，直接用自然语言告诉 Agent 你想做什么：

| 你说的话 | Agent 实际调用的命令 |
|---------|-------------------|
| "帮我看看这个链接写了什么" | `curl https://r.jina.ai/URL` |
| "这个 GitHub 仓库是做什么的" | `gh repo view owner/repo` |
| "这个 YouTube 视频讲了什么" | `yt-dlp --dump-json URL` |
| "帮我看看这条推文" | `twitter tweet URL` |
| "搜一下 Reddit 上关于 xxx 的讨论" | `rdt search "xxx"` |
| "订阅这个 RSS 源" | `feedparser` 解析 |

### 高级配置

需要认证的平台，用 Cookie-Editor 浏览器插件导出 Cookie，发给 Agent 即可配置：

> 浏览器登录 → Cookie-Editor 导出 → 发给 Agent

比扫码更简单可靠。

## 五、常见问题与解决方案

**Q: 推特返回 403 或空结果？**

需要运行 `rdt login`（Reddit）或 `xhs login`（小红书）完成 Cookie 认证。Agent Reach 使用 Cookie 认证而非官方 API，完全免费但需要登录。

**Q: B站视频在海外服务器上无法访问？**

本地电脑不需要代理。只有部署在服务器上才需要代理（~$1/月），详见 README 的服务器配置说明。

**Q: 安装后 Agent 仍然无法执行命令？**

检查 OpenClaw 的 tools profile 设置，默认 `messaging` 模式无法执行 shell，需切换为 `coding` 模式。

**Q: 想用其他网页爬取工具替代 Jina Reader？**

修改 `channels/web.py`，将 `Jina Reader` 替换为 Firecrawl 或 Crawl4AI 等即可，架构完全解耦。

## 六、总结

Agent-Reach 解决的不是技术难题，而是工程上的重复劳动——每次给新 Agent 装环境，都要重新折腾 Twitter 怎么读、YouTube 字幕怎么取、小红书怎么爬。这种配置成本被它一句话就抹掉了。

**一句话：如果你经常用 AI Agent 处理需要访问互联网的任务，Star 一下这个项目，它能帮你省很多踩坑的时间。**

> ⭐ GitHub: https://github.com/Panniantong/Agent-Reach
