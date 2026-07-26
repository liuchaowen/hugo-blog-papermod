---
title: "PasarGuard：开源抗审查代理管理面板，统一管理 Xray 与 WireGuard"
date: 2026-07-27
description: "PasarGuard 是一个用 Python + React 构建的开源抗审查代理管理面板，支持 Xray-core 与 WireGuard，提供多用户/多入站管理、流量与到期限制、订阅链接与二维码分享、TLS/REALITY 等特性，适合自建节点与订阅管理。"
author: "Cheman"
slug: pasarguard
draft: false
categories: [开源, 技术]
tags: [GitHub, 开源, 代理, Xray, WireGuard, 自托管]
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

今天在 GitHub Trending 上看到一个有意思的项目：**PasarGuard**——一个主打「抗审查」的代理节点管理面板，用一套统一的 GUI 同时管理 Xray-core 和 WireGuard，适合需要自建、批量运营代理节点的场景。

## 一、项目概述

PasarGuard（全名 *Unified & Censorship-Resistant Proxy Management Solution*）是一个开源的代理管理工具，核心定位是「把成百上千个代理账户的管理变得直观、高效」。它并非某个单一协议客户端，而是一个**控制面（Control Plane）**：后端负责与 Xray-core / WireGuard 通信、下发配置、采集流量统计，前端负责可视化运维。

项目目前在主仓库 `PasarGuard/panel` 上已有约 2.4k Stars，技术栈为 **Python（后端）+ React.js（前端 dashboard）**，官方文档站为 `docs.pasarguard.org`，并提供 Telegram 社群与多语言（英 / 波斯 / 俄 / 简中）支持。

其核心特性可以归纳为三类：

- **协议与传输**：同时支持 Xray-core 与 WireGuard，单用户可配置多协议，支持 TLS 与 REALITY 等抗审查传输方式。
- **用户与入站管理**：单入站多用户、单端口多入站（基于 fallback）、流量/到期时间限制、周期性流量限额，以及基于 HWID 的硬件绑定访问控制。
- **订阅与分享**：生成兼容 V2ray / Clash / ClashMeta 的订阅链接，自动生成分享链接与二维码；自带系统监控与流量统计。

此外还提供可定制 Xray 配置、内置 Telegram Bot、命令行 CLI、多语言以及多管理员 + RBAC 权限体系。

## 二、技术原理

### 架构设计

PasarGuard 采用典型的前后端分离架构：

```
Dashboard (React)  ──HTTP(S)──▶  Backend (Python, FastAPI/ASGI)
                                        │
                                        ├──▶ Xray-core (进程管理 / 配置下发)
                                        └──▶ WireGuard (接口与密钥管理)
                                        │
                                        └──▶ Database (TimescaleDB / SQLite / MySQL / ...)
```

后端服务监听 `8000` 端口（从官方 Dockerfile 的 `EXPOSE 8000` 与 dashboard 访问路径 `https://DOMAIN:8000/dashboard/` 可印证），通过进程间控制把用户配置翻译为 Xray 的入站/出站规则或 WireGuard 接口配置，并周期性采集流量数据写入时序/关系型数据库。

### 数据库选型

PasarGuard 对多种数据库提供一等支持，安装时通过参数选择：

- **TimescaleDB（官方推荐）**：基于 PostgreSQL 的时序扩展，最契合流量统计这类时序写入场景。
- **PostgreSQL / MySQL / MariaDB**：通用关系型数据库。
- **SQLite**：零运维，适合单机、小规模或测试。

### 数据流分析

一次「创建用户 → 产生流量 → 统计展示」的链路大致是：

1. 管理员在 Dashboard 创建用户，后端写入用户表并生成对应的入站/协议配置；
2. Xray-core / WireGuard 按配置承接真实流量；
3. 后端采集各入站的上下行字节数，结合周期性限额与到期时间做校验；
4. Dashboard 拉取统计接口渲染图表，并可在超额/到期时自动停用账户。

### 关于我们抓取的仓库

本次 Trending 命中的是 `x4gKing/PasarGuard`，本质上是一个**面向 Railway 部署的 Docker 构建封装**，而非核心代码。它的 `Dockerfile` 很能说明其工程取舍：

```dockerfile
# 从源码新克隆 panel 仓库，并在 build 阶段用 bun 把前端 dashboard 构建为静态产物
RUN git clone --depth 1 https://github.com/PasarGuard/panel.git .
RUN cd dashboard && bun install --frozen-lockfile && cd .. && bash build_dashboard.sh

# 补丁 1：修复 main 分支中残留的 Python2 语法，否则 main.py 直接 SyntaxError 无法启动
RUN sed -i 's/except ValueError, socket.gaierror:/except (ValueError, socket.gaierror):/' main.py

# 补丁 2：强制监听 0.0.0.0，避免在无 SSL 时默认绑定 localhost 导致 Railway "Application failed to respond"
RUN sed -i 's/bind_args\["host"\] = ip/bind_args["host"] = server_settings.host/' main.py

# 构建期预拉取官方订阅模板页，避免运行期再下载 bun 导致 FileNotFoundError
RUN curl -fsSL -o /code/templates/subscription/index.html \
    https://github.com/PasarGuard/subscription-template/releases/latest/download/index.html
```

两个 `sed` 补丁值得注意：它侧面反映出上游在跨 Python 版本演进时仍存在少量遗留语法，而 Railway 这类 PaaS 要求进程必须监听 `0.0.0.0` 才能被平台路由——这些都是「把开源项目塞进托管平台」时常见的坑。

## 三、安装与快速开始

### 方式一：官方一键脚本（推荐）

官方提供了按数据库区分的一行安装命令，文件落在 `/opt/pasarguard`，配置位于 `/opt/pasarguard/.env`：

```bash
# TimescaleDB（推荐）
sudo bash -c "$(curl -fsSL https://github.com/PasarGuard/scripts/raw/main/pasarguard.sh)" @ install --database timescaledb

# SQLite（最简，无需额外数据库）
sudo bash -c "$(curl -fsSL https://github.com/PasarGuard/scripts/raw/main/pasarguard.sh)" @ install

# 其他：mysql / mariadb / postgresql
sudo bash -c "$(curl -fsSL https://github.com/PasarGuard/scripts/raw/main/pasarguard.sh)" @ install --database mysql
```

### 方式二：Railway / Docker 部署

基于上面仓库的 Dockerfile，镜像在 build 阶段克隆 `panel`、用 bun 构建 dashboard、应用两个补丁、预下载订阅模板，最终以 `/start-railway.sh` 为入口、`EXPOSE 8000` 对外提供服务。

### 首次启动

安装后生成一次性 owner 配置密钥，并在 Dashboard 登录页使用：

```bash
# 生成 owner 临时密钥
pasarguard cli generate-temp-key
```

Dashboard 需要 SSL 证书（安全要求），通过域名访问：

```
https://YOUR_DOMAIN:8000/dashboard/
```

没有域名仅做测试时，可用 SSH 端口转发：

```bash
ssh -L 8000:localhost:8000 user@serverip
# 然后浏览器访问 http://localhost:8000/dashboard/
```

> 注意：SSH 转发仅用于测试，关闭终端即失效。

## 四、使用方法与实战

**1. 创建用户与配置协议**
在 Dashboard 中新建用户，选择 Xray（如 VLESS+Reality）或 WireGuard 入站，可在一个端口上叠加多个入站（利用 fallback），并为单用户绑定多协议。

**2. 设置限额**
为用户设定流量上限与到期时间，或配置「每日/每周」周期性限额；需要设备级管控时开启 HWID/设备数限制，实现硬件绑定。

**3. 分发订阅**
生成兼容 V2ray / Clash / ClashMeta 的订阅链接，Dashboard 会自动生成分享链接与二维码，用户导入客户端即可使用。

**4. 运维与监控**
通过内置图表查看流量统计与系统状态；需要自动化时调用 CLI 或 Telegram Bot 进行日常管理；多管理员场景下用 RBAC 做权限细分。

**实战示例（CLI 生成 owner 密钥）：**

```bash
pasarguard cli generate-temp-key
# 输出一次性密钥 → 在 https://YOUR_DOMAIN:8000/dashboard/ 登录页输入 → 创建 owner 账户
```

## 五、常见问题与解决方案

**Q1：Railway 部署报 "Application failed to respond"？**
A：这是进程只绑定了 `localhost` 导致平台无法路由。需确保监听 `0.0.0.0`（即上面 Dockerfile 的补丁 2），Railway 才能把外部流量转发到容器 `8000` 端口。

**Q2：build 阶段崩溃，提示 `FileNotFoundError: bun`？**
A：最终运行镜像未安装 bun，却尝试在运行时构建 dashboard。应在 build 阶段用 `bun install && build_dashboard.sh` 预生成静态产物（依赖 `subscription-template` 等），而非运行时构建。

**Q3：启动即 `SyntaxError`，main.py 完全无法运行？**
A：上游 `main` 分支曾残留 Python2 风格的多异常捕获 `except A, B:`。需改为 Python3 语法 `except (A, B):`（即补丁 1）。建议使用受支持的 Python 3.14 运行时。

**Q4：没有域名/SSL 证书怎么访问 Dashboard？**
A：用 `ssh -L 8000:localhost:8000 user@serverip` 做本地端口转发，浏览器访问 `http://localhost:8000/dashboard/`。生产环境仍应配置 SSL（官方文档有签发指南）。

**Q5：小规模自试用什么数据库？**
A：直接用 SQLite 安装（`@ install` 不带 `--database`），零运维；规模上来后再迁移到 TimescaleDB / PostgreSQL。

## 六、总结

PasarGuard 把「Xray-core + WireGuard」两套能力收敛到一个带 GUI、订阅分发、流量统计与 RBAC 的统一面板，降低了自建代理节点的运维门槛，对需要批量管理订阅、关注抗审查传输（TLS/REALITY）的用户很实用。本次 Trending 命中的 `x4gKing/PasarGuard` 则是一个聚焦 Railway/Docker 部署的构建封装，其 Dockerfile 里的两个 `sed` 补丁，恰好也提醒我们：把开源项目搬上托管平台时，Python 版本兼容与 `0.0.0.0` 绑定是绕不开的两道坎。
