---
title: "freeAgentIdentity：本地化账号批量注册、登录恢复与资源池管理平台"
date: 2026-08-27
description: "freeAgentIdentity（aBaiAutoplus）是一个面向本地部署的账号注册、登录恢复、验活与资源池管理平台，采用 FastAPI 后端 + React 前端，将协议注册、浏览器注册、密码与 2FA、401 刷新、邮箱池与代理池串成一套可观察、可停止、可复用的任务流程。"
author: "Cheman"
slug: freeagentidentity
draft: false
categories: [技术, 自动化]
tags: [GitHub, 开源, 自动化, FastAPI, 账号管理]
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

今天在 GitHub Trending 上看到一个面向"账号全生命周期管理"的开源项目：**freeAgentIdentity**（项目内部代号 aBaiAutoplus）。它把账号注册、登录恢复、401 验活、邮箱池与代理池管理统一收口到一个本地可部署的 Web 平台中，对需要规模化、合规地管理自有账号的团队有一定参考价值。

## 一、项目概述

freeAgentIdentity 是一个**本地优先（Local-first）的账号管理控制台**，目标是把分散、易错的账号注册与维护动作，变成一套可观察、可中断、可复用的任务系统。它不依赖任何第三方云服务，所有凭据（邮箱密码、refresh token、Cookie、TOTP 密钥、代理凭据、API key）都只保存在本地 `.env`、数据库或 Secret 管理中。

核心能力可以归纳为四大块：

- **多模式注册**：支持协议注册（纯 HTTP 流程）、有头浏览器注册（Camoufox + VNC 可观察）、无头浏览器注册（批量并发 + 代理池 + 任务日志）。
- **401 验活与登录恢复**：一键并行检查账号存活，失活账号自动走协议登录流程刷新 access/refresh token。
- **邮箱池管理**：内置本地微软邮箱池、API 邮箱池、自有域名 IMAP 全收、自有域名 Inbucket 四种来源，按 atom 分配与租约机制防止冲突。
- **代理池管理**：对接 Mihomo 订阅，统一测速、切换节点、脉冲调度，避免单 IP 被封后无脑重试。

项目采用 **AGPL-3.0** 许可证，强调"生产环境请使用自己控制的邮箱、代理和服务配置"。

## 二、技术原理

### 架构设计

项目采用经典的前后端分离 + 任务编排架构，目录结构清晰地按"接口层 / 应用层 / 核心层 / 基础设施层 / 平台适配层"划分：

```text
api/                    FastAPI 路由：账号、任务、配置、邮箱、代理
application/            任务编排和应用服务
core/                   数据库、配置、凭据加密、邮箱抽象和通用逻辑
infrastructure/         repository、provider 定义和持久化实现
platforms/chatgpt/      协议注册、浏览器注册、验活、登录恢复和 2FA
frontend/               React + Vite 管理界面
```

后端入口 `main.py` 是一个标准的 FastAPI 应用，通过 `lifespan` 完成数据库初始化、平台与 provider 加载、后台调度器与任务运行时启动：

```python
@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(404, "API endpoint not found")
    return FileResponse(os.path.join(_static_dir, "index.html"))
```

这一处 SPA 回退把前端（构建产物放在 `static/`）和 `/api` 路由体系分离，属于典型的"FastAPI 同时托管 API 与静态前端"的部署形态。

### 核心技术栈与选型理由

从 `requirements.txt` 可以看出选型非常"实战向"：

- **`curl_cffi` / `tls-client`**：用于模拟真实浏览器 TLS 指纹，绕过 WAF / 风控，这是协议注册能跑通的关键。
- **`camoufox[geoip]`**：基于 Firefox 的anti-detection 浏览器，用于有头/无头浏览器注册与验活，规避自动化特征识别。
- **`patchright` / `playwright`**：Turnstile 验证码 Solver 的底层驱动。
- **`quart` + `rich`**：Solver 以子进程方式运行（`main.py` 中以 `--solver` 参数 spawn），用异步框架处理验证码识别。
- **`jwcrypto` / `cbor2` / `PyNaCl`**：凭据加密与 WebAuthn/设备绑定相关协议支撑。
- **`httpx[socks]`**：GoPay App 纯协议注册走 socks5h 代理过 WAF 的必需依赖（注释里特别点名缺了会报 `socks5h is not supported`）。

### 数据流分析

一次"协议注册 + 2FA 绑定"的端到端流程大致是：

1. 任务中心创建注册任务，指定数量、并发数、邮箱 provider、代理模式、脉冲探测参数。
2. 从**邮箱池**原子领取一个邮箱（使用次数计数），从**代理池**按健康节点分波分配 IP。
3. 走 HTTP 协议流程：注册 → 邮箱验证码处理 → 密码设置 → 凭据保存。
4. 注册成功后绑定并激活 TOTP 2FA，密码、TOTP 密钥与凭据一并持久化；**注册或绑定失败的账号绝不写入成功结果**，保证数据干净。
5. 邮箱租约"成功才提交、失败即释放"，避免邮箱被无效占用。

这种"邮箱池 + 代理池 + 任务编排 + 失败隔离"的组合，是它区别于普通脚本的核心设计。

## 三、安装与快速开始

### 环境要求

- Python 3.11+
- Node.js 18+ 与 npm
- Chromium / Camoufox 运行依赖（浏览器注册或验活时需要）
- Mihomo（使用代理池时需要）

### 本地运行

```bash
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt

cd frontend
npm ci
npm run build
cd ..

python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

浏览器访问 `http://127.0.0.1:8000` 即可。前端开发模式：

```bash
cd frontend
npm run dev
```

### Docker

```bash
docker compose up --build
```

官方 `Dockerfile` 采用多阶段构建：先用 `node:20-slim` 构建前端，再用 `python:3.12-slim` 装后端与浏览器（Chromium、Camoufox、`patchright/playwright` 浏览器），并内置 Xvfb + x11vnc + noVNC 以支持有头模式可视化，暴露 `8000`（API）、`6080`、`8889`（VNC/noVNC）端口。

### 基本配置

```bash
cp .env.example .env
```

至少设置一个随机的 `APP_PASSWORD`，再在管理界面配置：注册邮箱 provider、验证码 provider、Mihomo 订阅或动态代理 API、默认注册/执行方式、数据库与加密密钥。

```env
APP_PASSWORD=<请使用密码管理器生成的随机值>
ACCOUNT_MANAGER_DATABASE_URL=sqlite:///./data/account_manager.db
BACKGROUND_JOBS_ENABLED=0
APP_RUNTIME_MODE=desktop
```

## 四、使用方法与实战

### 基础用法：创建一次注册任务

在任务中心设置注册数量、并发数、邮箱 provider、代理模式与脉冲探测参数后提交。任务日志实时滚动展示，页面刷新后可恢复任务状态，也可随时从界面停止任务。

### 进阶用法：401 验活与登录恢复

账号列表会显示 access token / refresh token 状态和 401 状态。一键创建 **401 验活任务**：

- 先用 Camoufox **并行**检查账号存活；
- 失活账号再进入协议登录流程获取新的 access token；
- 协议恢复使用已保存的邮箱、密码与 TOTP 2FA，必要时读取新的邮箱验证码；
- 成功后更新 access/refresh token 与账号状态，失败原因写入任务日志，方便续处理。

### 资源池实战：邮箱与代理

- **邮箱池**：支持本地微软邮箱池（Microsoft Graph 读验证码、按使用次数原子分配）、API 邮箱池（每行一个邮箱 + 验证码 API）、自有域名 IMAP 全收、自有域名 Inbucket，并提供总量/已用/已耗尽/预留等统计。
- **代理池**：管理 Mihomo 订阅并同步节点，查看延迟、存活、UDP 状态；支持脉冲调度——按健康节点分波并发，节点异常或 IP 被封时暂停分配并定时探测恢复。

账号列表支持搜索、分页、只看有 refresh token、查看 401 状态与存活率，并一键复制账号、密码、TOTP 与 2FA 查看链接，便于后续登录或导出。

## 五、常见问题与解决方案

**Q：Windows 下启动报 `UnicodeEncodeError`（中文乱码）？**
A：项目已在 `main.py` 启动时强制把 stdout/stderr 设为 UTF-8（`errors="replace"`），并设置 `PYTHONUTF8=1`，确保子进程也用 UTF-8；正常情况下不会崩溃。若仍遇到，检查终端编码。

**Q：浏览器注册时卡白屏 / TLS 报错？**
A：多为代理被封或节点异常。项目用脉冲调度在节点异常时暂停分配并定时探测恢复；可切换 Mihomo 当前节点或改用本机直连排查。日志中可关注 `profile 已启动`、`支付页面 readyState`、`ERR_`、`白屏`、`TLS` 等关键事件。

**Q：邮箱验证码收不到？**
A：先确认邮箱池来源配置正确（本地微软 / API / IMAP / Inbucket），并检查是否邮箱已耗尽或租约未释放。注册失败会自动释放邮箱租约，成功才提交使用记录。

**Q：Docker 构建慢 / 浏览器下载失败？**
A：Dockerfile 会执行 `playwright install chromium` 与 `python -m camoufox fetch`，需要稳定网络。可提前在镜像外准备好浏览器缓存，或分阶段构建。

**Q：敏感凭据如何安全保存？**
A：邮箱密码、refresh token、Cookie、TOTP 密钥、代理凭据与第三方 API key 只放在本地 `.env`、数据库或 Secret 管理中，不要提交到 Git；生产环境请使用自己控制的邮箱、代理与服务配置，并定期备份数据库和加密密钥。

## 六、总结

freeAgentIdentity 的价值不在于"帮你注册账号"这一动作本身，而在于它把**账号全生命周期**抽象成了一套工程化的任务系统：分层的代码架构、可替换的 provider 抽象、邮箱/代理双池的资源治理、以及失败隔离与可恢复的任务编排。对于需要规模化、本地化、合规管理自有账号的场景，这种"可观察、可停止、可复用"的设计思路值得借鉴。

当然，AGPL-3.0 的强 copyleft 与项目本身的用途，决定了它在生产落地时必须配合**你完全控制的邮箱、代理与服务配置**，并严格遵守相关平台的服务条款。

> 项目地址：<https://github.com/asz798838958/freeAgentIdentity>
