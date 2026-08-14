---
title: "RVG Gateway：一款高性能多协议代理网关服务"
date: 2026-08-14
description: "RVG Gateway 是基于 FastAPI 构建的异步多协议代理网关，支持 VLESS、Trojan、Shadowsocks 和 MTProto 等协议，具备模块化设计、内置管理面板和自动化部署能力。"
author: "Cheman"
slug: rvg
draft: false
categories: [技术, 开源, 网络工具]
tags: [GitHub, 代理网关, FastAPI, 多协议, VPN, Python]
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

今天在 GitHub Trending 上看到一个有意思的项目：**RVG Gateway**，一款基于 FastAPI 构建的轻量级异步多协议代理网关，支持 VLESS、Trojan、Shadowsocks 和 MTProto 四种主流代理协议，并内置管理面板和自动化运维能力。

## 一、项目概述

RVG Gateway 是一个高性能、模块化的代理网关服务，核心定位是"一个入口，多种协议"。它将多种代理协议统一封装在单一的 HTTP/WebSocket 入口之后，简化了服务端的部署和运维复杂度。

### 核心特性

| 特性 | 说明 |
|------|------|
| 🔀 **多协议支持** | 同时支持 VLESS、Trojan、Shadowsocks、MTProto |
| 🌐 **XHTTP/WebSocket 传输** | 自定义传输层，便于穿透代理和 CDN |
| ⚙️ **内置管理面板** | 用户管理、服务状态监控、配置管理 |
| ☁️ **中央服务集成** | 自动注册实例、接收通知、Cloudflare Worker 支持 |
| 🔄 **自动更新** | 版本检查、自动升级、更新历史追踪 |
| 🤖 **Railway 自动化** | 自动创建 TCP Proxy 和域名 |

## 二、技术原理

### 架构设计

RVG 采用模块化的分层架构，核心组件包括：

```
RVG/
├── main.py           # FastAPI 核心，路由和 WebSocket 管理
├── pages.py          # 内嵌管理面板 UI
├── central.py        # 中央服务通信（Cloudflare Worker）
├── updater.py        # 自动更新系统
└── protocol/         # 协议实现模块
    ├── vless/        # VLESS 协议 + XHTTP/WebSocket
    ├── trojan/       # Trojan 协议
    ├── shadowsocks/  # Shadowsocks 协议
    └── mtproto/      # MTProto 协议
```

### 技术栈选型

项目采用现代化的异步 Python 技术栈：

- **FastAPI + Uvicorn**：高性能异步 Web 框架，配合 `uvloop` 和 `httptools` 提升性能
- **httpx**：支持 HTTP/2 的异步 HTTP 客户端
- **websockets**：WebSocket 协议支持，实现实时传输
- **cryptography**：协议加密和认证
- **aiofiles**：非阻塞文件 I/O

### 核心代码解析

#### 中央服务注册

`central.py` 实现了与 Cloudflare Worker 中央服务的通信：

```python
async def register_instance():
    if not CENTRAL_URL:
        return
    from main import AUTH, get_host
    from updater import get_current_version
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            await c.post(f"{CENTRAL_URL}/api/register", json={
                "domain": get_host(),
                "version": get_current_version(),
                "panel_password_hash": AUTH["password_hash"],
                "description": "RVG Gateway instance",
            })
    except Exception:
        pass
```

#### Railway TCP Proxy 自动化

`bottokentcpproxy.py` 通过 GraphQL API 自动创建 Railway TCP Proxy：

```python
async def _create_proxy(client: httpx.AsyncClient, token: str, service_id: str,
                         environment_id: str, application_port: int) -> dict:
    data = await _gql(client, token, MUTATION_CREATE, {
        "environmentId": environment_id,
        "serviceId": service_id,
        "applicationPort": application_port,
    })
    return data["tcpProxyCreate"]
```

项目支持两种模式的域名过滤：
- **Blacklist 模式**：排除已知域名，接受其他任意域名
- **Whitelist 模式**：仅接受用户指定的目标域名

### 并发控制与限流处理

代理创建过程采用并发批处理策略，并内置指数退避处理 Railway 的速率限制：

```python
if any_rate_limited:
    backoff = min(MAX_BACKOFF, max(1.0, backoff * 1.7))
    await asyncio.sleep(backoff)
else:
    backoff = DELAY_SEC
```

## 三、安装与快速开始

### 环境要求

- Python 3.11+
- pip 包管理器

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/arvin341az-glitch/RVG.git
cd RVG

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
export DATA_DIR=/data
export SECRET_KEY=your-secret-key
export CENTRAL_URL=https://your-worker.workers.dev

# 启动服务
python main.py
```

### Docker 部署

项目支持容器化部署，可直接在 Railway 或其他云平台运行。

## 四、使用方法与实战

### 基础配置

通过环境变量进行配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATA_DIR` | 数据存储目录 | `/data` |
| `SECRET_KEY` | 服务密钥 | - |
| `CENTRAL_URL` | 中央服务地址 | - |
| `UPDATE_MANIFEST_URL` | 更新清单 URL | - |
| `RAILWAY_SERVICE_ID` | Railway 服务 ID | - |
| `RAILWAY_ENVIRONMENT_ID` | Railway 环境 ID | - |

### 管理面板功能

内置 Web 管理面板提供：

1. **用户管理**：添加/删除用户，配置协议参数
2. **服务状态**：实时查看连接数、流量统计
3. **配置管理**：动态修改协议配置
4. **更新管理**：一键升级到最新版本

### Railway 自动化脚本

#### 批量创建域名

```python
from botgeneratedomin import start_job

# 创建 10 个随机域名
start_job(
    token="your-railway-token",
    application_port=443,
    target_count=10
)
```

#### 创建指定域名

```python
from bottokentcpproxy import start_job

# Whitelist 模式，仅搜索特定域名
start_job(
    token="your-railway-token",
    application_port=443,
    mode="whitelist",
    target_domains=["desired-domain.proxy.rlwy.net"]
)
```

## 五、常见问题与解决方案

### 1. Railway Token 认证失败

**原因**：Token 无效或权限不足

**解决**：
- 确认 Token 来自 Railway 项目成员
- 检查 Token 是否有 `service:read` 和 `tcpProxy:create` 权限

### 2. 域名创建超时

**原因**：Railway API 速率限制

**解决**：
- 降低并发数：设置环境变量 `BOT_TCP_PROXY_CONCURRENCY=4`
- 增加延迟：设置 `BOT_TCP_PROXY_DELAY=1`

### 3. 管理面板无法访问

**原因**：端口未正确配置或防火墙拦截

**解决**：
- 确认服务监听端口正确
- 检查云平台安全组规则

### 4. 协议连接失败

**原因**：客户端配置与服务端不匹配

**解决**：
- 确认协议类型（VLESS/Trojan/SS）一致
- 检查 WebSocket/XHTTP 传输配置
- 验证用户凭证是否正确

### 5. 自动更新失败

**原因**：网络问题或 Manifest 文件不可达

**解决**：
- 检查 `UPDATE_MANIFEST_URL` 是否可访问
- 手动下载更新包覆盖安装

## 六、总结

RVG Gateway 是一个设计精良的多协议代理网关解决方案，其核心优势在于：

1. **协议统一**：四种主流协议统一入口，简化客户端配置
2. **模块化设计**：协议实现独立封装，便于扩展新协议
3. **运维自动化**：Railway 集成实现一键部署和域名管理
4. **生产就绪**：内置管理面板、监控、自动更新等企业级特性

对于需要搭建私有代理服务或学习代理协议实现的开发者来说，RVG Gateway 是一个值得深入研究的开源项目。其 FastAPI 异步架构和模块化设计思路，对于构建高性能网络服务有很好的参考价值。
