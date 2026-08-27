---
title: "MailAccess：面向安全研究的自托管邮件情报 OSINT 平台"
date: 2026-08-28
description: "MailAccess 是一个 MIT 授权的开源 OSINT 平台，面向安全研究员与渗透测试人员，围绕邮箱地址聚合泄露库、社交网络、DNS 与开放互联网信号，输出统一的暴露评分与可导出结构化取证报告。"
author: "Cheman"
slug: mailaccess
draft: false
categories: [技术, 开源, 安全工具]
tags: [GitHub, 开源, OSINT, 安全, Python]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MailAccess**——一个自托管、可管道化的邮箱 OSINT 调查平台，能在获得授权的前提下把零散的公开信号汇总成一份可读的"暴露画像"。

## 一、项目概述

MailAccess 把自己定位为"面向邮箱地址调查的自托管 OSINT 平台"。它的核心工作流是：给定一个邮箱（或域名），在泄露数据库、社交网络、DNS 记录与开放互联网之间扇出查询，最终产出**统一暴露评分**（exposure score）与结构化发现结果，并支持导出或灌入 Maltego 继续分析。

目标用户明确写在 README 里：安全研究员、OSINT 分析师、以及**在授权范围内**作业的渗透测试人员。项目自带 `DISCLAIMER.md`，强调所有数据均来自公开来源，使用者需自行承担合法性责任。

它提供的能力可以概括为几个层面：

- **身份图谱（Identity Graph）**：用共享用户名、头像、显示名、泄露数据把不同平台的账号关联成一张图。
- **姓名共识引擎（Name Consensus Engine）**：把多个独立来源的名字信号综合为 `CONFIRMED / PROBABLE / POSSIBLE / UNKNOWN` 四档可信身份。
- **防御者简报（Defender's Brief）**：给安全管理员看的 30 秒风险摘要，带优先级发现与下一步动作。
- **域名邮箱收割（Domain Email Harvesting）**：在 Common Crawl、GitHub、CT 日志、注册局、密钥服务器、dork、员工页面与命名模式里发现组织邮箱。
- **深度泄露模式（Deep Breach Mode）**：针对最高严重度泄露语料探测账号存在风险。
- **凭据风险评分（Credential Risk Score）**：单独的 0–100 凭据暴露分档，带主要驱动因素与建议。
- **6 种导出格式**：JSON、CSV、PDF、Markdown、STIX 2.1、Maltego XML。

## 二、技术原理

### 架构与技术栈

从 `pyproject.toml` 可以还原出它的依赖骨架：后端是 **FastAPI + Uvicorn** 的异步 Web 服务，数据层用 **SQLAlchemy 2.0 + aiosqlite / asyncpg**（本地 SQLite 或 PostgreSQL），模型校验走 **Pydantic**，CLI 用 **Typer** 封装，终端渲染依赖 **Rich**。

```toml
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "sqlalchemy>=2.0",
    "aiosqlite>=0.20",
    "asyncpg>=0.29",
    "pydantic[email]>=2.0",
    "httpx>=0.27",
    "curl-cffi>=0.7",
    "dnspython>=2.6",
    "python-whois>=0.9",
    "stix2>=3.0",
    "holehe>=1.61",
    "user-scanner>=1.0",
    "typer[all]>=0.25.1",
    "rich>=13",
]
```

几个值得注意的选型：

- `curl-cffi` 而非普通 `requests`：它支持 impersonate 浏览器 TLS 指纹，用来绕过基于 JA3/JA4 的爬虫拦截，对 OSINT 类工具是刚需。
- `imagehash + Pillow`：用于头像指纹比对，是身份图谱里"同一人"关联的关键——靠图片哈希判断不同平台头像是否为同一张。
- `dnspython / python-whois`：承载 DNS 与 WHOIS 维度的情报。
- `stix2`：直接产出 STIX 2.1 这种威胁情报交换标准格式，说明它瞄准的是可以和 SIEM/威胁平台对接的正式工作流。
- `holehe / user-scanner`：这两个是现成的"邮箱是否注册某平台"检测库，被直接纳入依赖，对应"账号存在性"探测。

### 平台覆盖引擎

README 提到 2500+ 平台覆盖，底层是 **Maigret** 引擎，并叠加了 **Sherlock、Nexfil、Blackbird、WhatsMyName、Holehe、user-scanner**。打包配置里能看到一大堆站点数据文件被强制塞进 wheel：

```toml
[tool.hatch.build.targets.wheel.force-include]
"data/sherlock_sites.json"   = "data/sherlock_sites.json"
"data/wmn_sites.json"        = "data/wmn_sites.json"
"data/nexfil_sites.json"     = "data/nexfil_sites.json"
"data/breach_aliases.json"   = "data/breach_aliases.json"
```

`breach_aliases.json`、`common_names.json`、`disposable_domains.json` 这类数据文件，分别对应"姓名共识"对常见名的降权、"误报控制"（fp-control）里对一次性域名的过滤。

### 数据流

一次调查的简化链路是：

1. 输入邮箱/域名 → 身份图谱初始化。
2. 扇出：同步启动社交平台模块、泄露查询、DNS/WHOIS、域名收割等 64 个模块。
3. 聚合：用用户名/头像哈希/显示名做聚类，构建身份图谱。
4. 评分：姓名共识引擎给出身份可信档；凭据风险评分给出 0–100 暴露分。
5. 产出：生成 Defender's Brief + 结构化报告，可经 REST/WebSocket 读取，也可导出为 6 种格式。

身份图谱可在 Web 端 `/investigation/:id/graph` 查看，或通过 `GET /api/report/{id}/graph` 拉取。

## 三、安装与快速开始

最轻量的方式是用 pip 安装后直接调查一个邮箱：

```bash
pip install mailaccess
mailaccess investigate you@example.com
```

CLI 设计为**每次调查自动启动并关停后端**，省去常驻进程的心智负担。当你需要常驻服务时，用 `mailaccess serve`；想要可选的 spaCy 姓名分类能力时，装扩展：

```bash
mailaccess[ml]    # 可选：基于 spaCy 的姓名分类
mailaccess pdf    # 可选：weasyprint 导出 PDF
```

也可以走 Docker 自托管完整 Web 栈：

```bash
git clone https://github.com/KatrielMoses/MailAccess
cd MailAccess
make dev          # 开发环境，热重载
# 或
make prod         # 生产环境（前面需自行挂 Nginx/Caddy/Traefik 做 SSL 终止）
```

> ⚠️ `Makefile` 里明确提醒：生产部署**必须**在前面放反向代理做 TLS 终止，因为该 Compose 不含 K8s、CI/CD 或 SSL 终结。`.env` 里的 `POSTGRES_ENABLED=true` 会激活 PostgreSQL profile。

环境要求：Python **3.11+**（badge 标注），`pyproject.toml` 的 `requires-python` 为 `>=3.10`。

## 四、使用方法与实战

### 基础调查

```bash
# 调查一个邮箱，结果直接在终端打印
mailaccess investigate you@example.com

# 导出为 PDF 报告
mailaccess investigate you@example.com -o report.pdf
```

### 域名邮箱收割

```bash
mailaccess harvest-emails --domain company.com
mailaccess harvest-emails --domain company.com --export harvest.csv
```

这一步会在 Common Crawl、GitHub、CT 日志、注册局、密钥服务器、dork、员工页面与命名模式里扫出组织邮箱，适合红队 Recon 或防御侧发现暴露面。

### 密钥与模块管理

```bash
mailaccess keys set HIBP_API_KEY your-key   # 写入 HIBP 等 API key
mailaccess keys list                        # 查看已配置密钥
mailaccess modules                           # 列出 64 个已启用模块
```

大多数模块**零密钥即可运行**，可选密钥（如 HIBP）只是解锁更多覆盖。

### 管道化与集成

支持 stdin、JSONL 管道与 CI 集成，也能对接 Maltego、Slack、Discord 与通用 webhook。例如把结果以 STIX 2.1 喂给威胁平台，或以 Maltego XML 继续扩线，是它区别于一次性脚本的核心价值。不想要 Defender's Brief 时用 `--no-brief` 抑制。

## 五、常见问题与解决方案

**安装失败 / 编译依赖报错**
建议用 Python 3.11+ 的干净虚拟环境安装；`weasyprint` 导出 PDF 需要系统级 Cairo/Pango 库，单独装 `mailaccess[pdf]` 前先确认系统依赖。可选的 spaCy 模型体积较大，按需安装 `[ml]` 即可。

**需要覆盖更多平台但默认没查到**
通过 `mailaccess keys set` 补上可选 API key，并阅读 `docs/api-keys.md`；自建模块可参考 `docs/modules.md` 的模块参考与查找（findings）schema。

**误报：常见名被误判为同一个人**
这是 OSINT 工具的通病。MailAccess 在 `docs/fp-control.md` 提供了常见名降权、一次性域名过滤、聚类阈值与健康度/评分控制，必要时结合 `common_names.json`、`disposable_domains.json` 调参。

**生产部署 TLS / 端口暴露**
`make prod` 不会处理 SSL，务必在前面加 Nginx/Caddy/Traefik 做反向代理；生产环境建议开启 PostgreSQL（设 `POSTGRES_ENABLED=true`）而非默认 SQLite。

**查询被限流或拦截**
依赖 `curl-cffi` 做浏览器指纹模拟仍可能被风控。可利用 `.env` 配置代理/Tor（见 `docs/self-hosting.md`），并对大批量调查做限速，避免触发目标站封禁。

## 六、总结

MailAccess 把"邮箱调查"这件原本需要手工拼装一堆工具的事，整合成一个带身份图谱、姓名共识引擎、防御者简报和 6 种标准化导出的自托管平台。它的技术选型（FastAPI 异步栈、curl-cffi 指纹模拟、图像哈希关联、STIX/Maltego 互通）都指向**可被正式安全流程采纳**的定位，而不是玩具脚本。需要提醒的是：能力越强越要守住授权边界，使用前务必读完 `DISCLAIMER.md`，仅在合法授权范围内使用。

- 项目地址：<https://github.com/KatrielMoses/MailAccess>
- PyPI：`pip install mailaccess`
- 许可证：MIT
