---
title: "X4G：一个现代化的 VLESS 隧道网关，支持 WebSocket/XHTTP 与可视化管控面板"
date: 2026-07-12
description: "X4G 是一款开源的 VLESS 隧道网关项目，支持 WebSocket、XHTTP（packet-up/stream-up）多种传输协议，提供可视化仪表盘、Telegram 机器人管理和专业的订阅页面生成功能，部署简单，适合自建节点。"
author: "Cheman"
slug: x4g
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "VLESS", "代理", "网络工具", "XHTTP", "WebSocket"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**X4G**，一个现代化的 VLESS 隧道网关，支持 WebSocket、XHTTP（packet-up / stream-up）多种传输协议，并配备了可视化管理仪表盘和 Telegram 机器人，适合希望自建节点的用户快速部署和管理代理服务。

## 一、项目概述

X4G（X4G Gateway）是一个基于 VLESS 协议的隧道与代理管理平台，核心功能包括：

- **多协议支持**：VLESS over WebSocket、VLESS over XHTTP（packet-up 和 stream-up 两种模式），同时内置 HTTP Proxy
- **可视化仪表盘**：实时显示流量统计（每小时图表）、活跃连接数、运行日志和错误日志
- **Telegram 管理机器人**：无需打开 Web 面板，直接在 Telegram 中管理配置、创建链接、查看订阅
- **订阅页面生成**：支持生成带图形界面的公开订阅页面（支持密码保护），包含每个配置的 QR Code 和状态
- **精细化权限控制**：可对每个配置单独设置流量上限（KB/MB/GB）、带宽限速（Mbps）、并发 IP 数、过期时间

部署方式非常友好：Fork 仓库后在 Railway.app 上直接部署，支持 Volume 持久化存储配置数据。

## 二、技术原理

### 2.1 协议选择：WebSocket vs XHTTP

| 协议 | 特点 | 适用场景 |
|------|------|----------|
| `vless-ws` | 走标准 WebSocket，兼容性最好 | 常规环境、CDN 背后 |
| `xhttp-packet-up` | XHTTP 包上传模式，穿墙能力更强 | 高封锁环境 |
| `xhttp-stream-up` | XHTTP 流式上传，延迟更低 | 低延迟需求 |

核心传输层的选择直接影响节点的稳定性和速度，X4G 允许每个配置独立选择协议，灵活性很高。

### 2.2 uTLS 指纹伪装

X4G 支持为每个配置单独设置 uTLS 指纹（`chrome`、`firefox`、`safari`、`ios`、`android`、`edge` 等），通过模拟真实浏览器的 TLS 指纹来绕过深度包检测（DPI）。在高度封锁的网络环境下，配合 XHTTP 协议使用效果最佳。

### 2.3 数据持久化架构

X4G 将所有状态数据（包括配置、订阅分组、管理员密码、统计信息）写入 `x4g_state.json`，存储路径由 `DATA_DIR` 环境变量控制（默认 `/data`）。配合 Railway Volume 挂载，即使容器重建也能保留所有配置，这是生产级部署的关键设计。

### 2.4 Telegram Bot 架构

Telegram 机器人通过两个环境变量驱动：
- `TELEGRAM_BOT_TOKEN`：BotFather 创建的机器人 Token
- `TELEGRAM_ADMIN_IDS`：逗号分隔的数字用户 ID 白名单

机器人支持以向导式交互（Wizard）创建配置，全程无需接触 Web UI。

## 三、安装与快速开始

### 3.1 前提条件

- GitHub 账户
- Railway.app 账号（免费套餐即可）
- GitHub 上Fork本仓库

### 3.2 Railway 部署步骤

```bash
# 1. 访问 https://railway.app，登录并点击 New Project
# 2. 选择 "Deploy from GitHub repo"
# 3. 选择 fork 后的 x4gKing/X4G 仓库
# Railway 会自动检测 Dockerfile 并完成构建部署

# 4. 部署完成后，在服务设置中启用 Public Domain
#    （Railway 会自动注入 RAILWAY_PUBLIC_DOMAIN 环境变量）

# 5. [重要] 添加 Volume
#    Settings → Volumes → 添加一个 Volume 并挂载到 /data 路径
#    这样配置数据才能持久保存
```

### 3.3 访问仪表盘

部署完成后，访问 `https://your-app.up.railway.app/dashboard`，使用默认密码 `X4GKING` 登录即可。

### 3.4 Telegram 机器人配置（可选）

在 Railway 环境变量中添加：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | 机器人 Token | `123456:ABC-DEF...` |
| `TELEGRAM_ADMIN_IDS` | 管理员 Telegram ID（数字） | `123456789` |

配置完成后，给机器人发 `/start` 即可开始管理。

## 四、使用方法与实战

### 4.1 创建第一个配置

通过仪表盘或 Telegram 机器人创建配置时，可设置以下参数：

```python
# 核心参数（以 Telegram Bot Wizard 为例）
label: "我的节点-香港"
protocol: vless-ws          # 选择协议：vless-ws / xhttp-packet-up / xhttp-stream-up
fingerprint: chrome         # TLS 指纹伪装
alpn: h2,http/1.1           # ALPN 协议列表
port: 443                   # 连接端口（1-65535）
traffic_limit: 50GB         # 流量上限（0=无限）
speed_limit: 100Mbps        # 带宽限速（0=无限）
ip_limit: 3                # 最大并发 IP 数（0=无限）
expiry_days: 30            # 过期天数（留空=永不过期）
```

### 4.2 生成订阅链接

在仪表盘的「订阅」区域，选择一个或多个配置组成订阅分组，X4G 会生成一个唯一个人订阅页面（如 `/p/{uuid_key}`），该页面包含：

- 每个配置的图形状态卡片
- 实时流量使用情况
- QR Code（可用于手机客户端扫码）
- 可选密码保护

订阅 URL 可直接导入 v2rayNG、NekoBox、Streisand 等主流客户端。

### 4.3 QR Code 快速分享

每个配置详情页都有一键生成 QR Code 的功能，适合快速在移动端分享连接信息，无需手动复制长链接。

## 五、常见问题与解决方案

**Q: 部署后访问仪表盘显示 502？**
检查 Railway 的 Public Domain 是否已启用，同时确认 `RAILWAY_PUBLIC_DOMAIN` 环境变量已正确注入。若仍有问题，查看 Railway 日志排查启动错误。

**Q: 重启后配置全部丢失？**
这是因为没有挂载 Volume。请在 Railway 服务设置中创建一个 Volume 并挂载到 `/data` 路径，这是数据持久化的唯一方式。

**Q: Telegram 机器人没有响应？**
确认 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_ADMIN_IDS` 两个环境变量都已正确设置且服务已重启。另外检查 ID 是否填写正确（必须是数字 ID，不是 @username）。

**Q: 节点速度慢或被墙？**
尝试将协议从 `vless-ws` 切换到 `xhttp-packet-up`，并将 uTLS 指纹改为 `chrome` 或 `randomized`，通常能显著改善稳定性。

**Q: 如何更改管理员密码？**
在 Railway 环境变量中设置 `ADMIN_PASSWORD` 为新密码，然后重启服务即可生效。

## 六、总结

X4G 是一个功能完整的 VLESS 节点管理解决方案，特别适合以下用户：
- 已有一定网络基础，希望自建节点而非购买商业服务
- 需要精细化管理多个配置（不同用户/不同限速）
- 希望用 Telegram 替代 Web UI 进行日常管理

其最大的亮点在于将协议选择灵活性（WS/XHTTP）、安全伪装（uTLS）、可视化管理、Telegram 机器人集成以及订阅页面生成整合在一个轻量级应用中，部署门槛低，功能覆盖面广，值得关注。
