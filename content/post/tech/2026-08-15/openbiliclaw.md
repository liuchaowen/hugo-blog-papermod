---
title: "OpenBiliClaw：本地运行的跨平台个性化内容推荐 Agent"
date: "2026-08-15"
description: "OpenBiliClaw 是一个本地运行的跨平台内容推荐 AI Agent，支持 B 站、小红书、抖音、YouTube、X、知乎等 12 个平台，通过构建五层心理画像主动破除信息茧房，数据 100% 留在本地 SQLite。"
author: "Cheman"
slug: openbiliclaw
draft: false
categories: ["AI", "开源", "推荐系统"]
tags: ["AI Agent", "推荐系统", "个性化", "跨平台", "本地优先", "Python"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenBiliClaw**，一个本地运行的跨平台内容推荐 AI Agent——先深度理解你，再带着对你的理解主动跨平台搜寻你会喜欢的内容，支持 B 站、小红书、抖音、YouTube、X、知乎、Reddit 等 12 个平台，数据 100% 留在本地。

## 一、项目概述

现代推荐系统本质上是"中间商"——平台站在海量内容和海量用户之间做匹配分发，权重由平台决定，优化目标是留存和变现，用户满意度只是手段而非目的。结果是推荐越来越像你已经看过的东西，信息茧房越裹越紧。而且每个平台都是一座孤岛，你在 B 站看了三年机械键盘，小红书完全不知道。

**OpenBiliClaw 反过来。** 它是一个本地运行的 AI Agent，先深度理解用户，再根据理解跨平台主动探索内容，从 B 站起步，现已扩展为通用跨平台方案：

- **本地优先**：核心行为、推荐和对话数据存在本地 SQLite，不上云
- **跨平台覆盖**：B 站 · 小红书 · 抖音 · YouTube · X · 知乎 · Reddit · Linux.do · Bangumi · V2EX · 微博 · 开放 Web
- **可调教**：喜欢/不感兴趣、聊天反馈都会持续更新画像
- **多种接入方式**：Chrome 插件、桌面 Web 界面（`/web`）、移动端 Web（`/m`）、Flutter 原生 App（独立仓库）、DeepSeek Harness 插件

## 二、技术原理

### 2.1 五层心理画像系统

OpenBiliClaw 的核心是一个五层灵魂画像引擎，逐层抽象用户心理特征：

```
事件层（Events）→ 偏好层（Preferences）→ 觉察层（Awareness）→ 洞察层（Insights）→ 灵魂层（Soul）
```

这不是简单的标签系统，而是通过 LLM 从用户行为和对话中持续提炼深层心理需求，理解的是"你这个人"，不只是"你的点击记录"。例如：一个关注机械表的人可能也会喜欢建筑美学，一个看量子物理科普的人可能对哲学感兴趣——系统用心理学桥接逻辑主动出击。

### 2.2 主动探索 vs 被动匹配

传统协同过滤只推荐"从这条路径走过的人最终都去了哪里"的内容，无法推给你"没人从这条路径走过"的内容。OpenBiliClaw 的探索策略则不同：基于对你的理解主动猜测可能感兴趣但从未接触过的领域，猜对了升级为正式兴趣，猜错了安静退出，不打扰用户。

### 2.3 架构设计

```
┌──────────────────────────────────────────────────────┐
│                    Chrome 插件                         │
│   （平台交互 · Cookie 同步 · 平台任务调度）            │
└──────────────────┬───────────────────────────────────┘
                   │  HTTP / WebSocket
┌──────────────────▼───────────────────────────────────┐
│              本地 FastAPI 后端（:8420）                │
│  ┌──────────────┬────────────────────────────────┐   │
│  │  画像引擎   │  跨平台内容发现引擎              │   │
│  │  Profile    │  Discovery                      │   │
│  └──────┬──────┴──────────────┬─────────────────┘   │
│         │                      │                      │
│  ┌──────▼──────────────────────▼───────────────┐     │
│  │              LLM 层                         │     │
│  │  （OpenAI / Anthropic / Gemini / 本地 Ollama）│     │
│  └────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────┐     │
│  │          本地 SQLite 数据库                  │     │
│  │   信号 · 画像 · 推荐 · 配置 · 缓存           │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

后端基于 FastAPI + Pydantic v2，依赖管理使用 `pyproject.toml`（Hatch 构建系统），版本 0.3.205：

```toml
# 核心依赖（pyproject.toml）
dependencies = [
    "httpx[socks]>=0.27",
    "scrapetube>=2.1",          # YouTube 抓取
    "yt-dlp>=2024.1.0",        # 多平台视频下载/元数据
    "bilibili-api-python>=16",  # B 站 API
    "openai>=1.0",
    "anthropic>=0.40",
    "google-genai>=1.66",
    "websockets>=13",           # 实时推送
    "Pillow>=10.0",
    "fastapi>=0.115",
    "rich>=13",
    "typer>=0.12",
    "pydantic>=2.0",
    "apscheduler>=3.10",
    "uvicorn>=0.32",
]
```

### 2.4 容器化部署

项目提供了多架构 Docker 镜像（linux/amd64、linux/arm64、linux/arm/v7），可在树莓派、Mac M 系列、x86 Linux、Windows Docker Desktop 上无缝运行：

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN python -c "..." \
    && pip install -r /tmp/requirements.txt
COPY README.md config.example.toml ./
COPY src ./src
RUN pip install --no-deps .
EXPOSE 8420
CMD ["python", "-m", "openbiliclaw.docker_runtime", "serve-api", "--host", "0.0.0.0", "--port", "8420"]
```

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.11+
- Docker（可选，用于容器化部署）
- Chrome 浏览器（安装插件）

### 3.2 最简安装（桌面安装包）

1. 从 [Latest Release](https://github.com/whiteguo233/OpenBiliClaw/releases/latest) 下载桌面安装包（macOS `.dmg` / Windows `.exe`）
2. 安装后自动在菜单栏/托盘运行，无需手动启动后端
3. 从 Chrome 应用商店安装 [浏览器插件](https://chromewebstore.google.com/detail/cdfjfkdjjhdaccbldipkjhpibnfbiamg)

### 3.3 AI 助手部署后端

把下面这句话粘给 Claude Code / Codex CLI / Cursor 等 AI 编程助手即可自动部署：

> 请按照 https://raw.githubusercontent.com/whiteguo233/OpenBiliClaw/main/docs/agent-install.md 的说明帮我部署 OpenBiliClaw 后端（务必用 Bash 的 curl 下载这个文档，不要用 WebFetch）

### 3.4 Docker 部署

```bash
# 多架构镜像一行启动
docker run -d \
  --name openbiliclaw \
  -p 8420:8420 \
  -v ~/.openbiliclaw:/data \
  ghcr.io/whiteguo233/openbiliclaw:latest
```

### 3.5 连接来源并初始化

1. 在浏览器登录 [B 站](https://www.bilibili.com)（默认初始化来源），或改选其他平台
2. 打开 `http://127.0.0.1:8420/web` 访问桌面端界面
3. 手机扫码访问 `http://<电脑局域网IP>:8420/m/`（移动端 Web）

## 四、使用方法与实战

### 4.1 智能推荐

系统基于画像主动推送内容，每条推荐都附带"像朋友一样"的推荐理由，而非简单的"猜你喜欢"：

```python
# 推荐请求（内部逻辑示意）
async def generate_recommendation(user_profile: Profile, platforms: list[str]) -> list[ContentItem]:
    # 1. 基于画像生成探索意图
    intent = profile_engine.generate_exploration_intent(user_profile)
    # 2. 跨平台并行发现
    results = await asyncio.gather(
        *[platform.discover(intent) for platform in platforms]
    )
    # 3. LLM 排序并生成推荐理由
    ranked = llm.rank_and_explain(user_profile, flatten(results))
    return ranked
```

### 4.2 对话调教

通过自然语言对话持续更新画像：

```
用户：我最近对东方美学很感兴趣
系统：好的，已记录。你的画像新增「东方美学」这一探索方向，
     我会主动在 B 站、知乎、小红书等平台为你发现相关内容。
```

### 4.3 反馈机制

- 👍 喜欢 / 👎 不感兴趣：直接影响后续推荐
- 收藏 / 稍后再看 / 30 天历史：全部保留在本地

## 五、常见问题与解决方案

**Q: 首次启动后端连接失败？**
确保端口 8420 未被占用，后端支持 `--host` 和 `--port` 参数自定义：
```bash
openbiliclaw serve-api --host 0.0.0.0 --port 8420
```

**Q: 推荐质量不高？**
画像需要时间积累。初期多通过对话和反馈（喜欢/不感兴趣）调教，系统会在 1-2 周后显著提升推荐精准度。

**Q: 如何更换 LLM 提供商？**
配置文件支持 OpenAI / Anthropic / Google Gemini / 本地 Ollama，修改 `config.toml` 中的 `llm.backend` 字段即可。

**Q: Docker 部署内存占用高？**
精简版安装包首次启动会自动下载 bge-m3 向量模型（~1GB），如网络条件允许可选择 `-with-embedding` 完整版离线运行。

**Q: 想接入更多平台？**
项目采用插件化架构，新平台接入可参考现有平台实现（位于 `src/openbiliclaw/sources/`）。

## 六、总结

OpenBiliClaw 是一次对"推荐系统权力关系"的翻转实验——不是让平台决定你看什么，而是让 AI Agent 基于对你的理解主动去找。12 个平台的数据汇聚在一个本地 SQLite 中，用心理学画像而非协同过滤来破茧，全程无需上云。这个思路本身，比项目本身更值得关注。
