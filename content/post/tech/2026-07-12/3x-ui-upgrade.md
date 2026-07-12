---
title: "3x-ui-Upgrade：基于 Railway 单端口部署的代理面板方案"
date: 2026-07-12
description: "深入解析 x4gKing/3x-ui-Upgrade——一个把 Heimdall（3x-ui 改进版）面板与 Nginx 反代结合，在 Railway 上用单个端口同时承载管理面板、订阅与 VLESS/WebSocket 入站的开源部署方案。"
author: "Cheman"
slug: 3x-ui-upgrade
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 代理面板, Railway, 3x-ui, Xray, DevOps]
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

今天在 GitHub Trending 上看到一个有意思的项目：**3x-ui-Upgrade**，它把代理面板管理、订阅分发和节点入站整合到 Railway 平台分配的单个端口上，极大简化了自建代理服务的部署流程。

## 一、项目概述

**3x-ui-Upgrade** 是 `x4gKing` 维护的一套部署脚手架，核心思路是：在容器里同时运行 **Heimdall 面板**（即 `sh7CBAC` 对 3x-ui 的改进版本）和一个 **Nginx 反向代理**，让「管理面板」「订阅接口」「VLESS/WebSocket 入站」三者都通过 Railway 分配的**同一个端口**对外暴露。

这种「单端口」架构的意义在于：Railway 这类 PaaS 通常只对外暴露一个随机端口，而代理工具的面板、订阅和真实流量端口往往各不相同。传统做法需要多个端口或额外隧道，而本项目通过 Nginx 的 path 路由把三类流量收拢到一处，规避了端口限制。

核心特性：

- **单端口收敛**：面板（`/managepanel`）、订阅（`/sub`）、Xray 入站（`/cdn` 等 path）共用一个公网端口。
- **SQLite 默认存储**：开箱即用，无需额外数据库；仅当用户量极大时才建议切换 Postgres。
- **Railway 一键部署**：提供 `Dockerfile`，Railway 可直接从 GitHub 仓库构建。
- **自动拉取上游版本**：构建阶段自动下载最新的 Heimdall 二进制，无需手动更新。

## 二、技术原理

### 整体架构

```
          Railway 分配的唯一公网端口 (Target Port: 3000)
                         │
                         ▼
                   ┌───────────┐
                   │  Nginx     │  反向代理 / path 路由
                   │  :3000     │
                   └───────────┘
              ┌──────────┬────────────┬──────────┐
              ▼          ▼            ▼          ▼
        /managepanel  /sub      /cdn(其他path)  静态视图
              │          │            │
              ▼          ▼            ▼
        Heimdall   订阅接口      Xray-core
        面板进程   (面板提供)    (监听 8080)
```

Nginx 监听 `3000` 端口，根据请求路径把流量分发：管理后台、订阅链接走面板进程，真实代理流量（如 `/cdn`）转发到容器内部 Xray 监听的 `8080` 端口。由于 Railway 只把 `3000` 作为 Target Port 对外，所有对外访问都收敛到这一个口。

### Dockerfile 关键设计

```dockerfile
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl bash ca-certificates socat tzdata sqlite3 nginx gettext-base \
    && ln -sf /usr/share/zoneinfo/Asia/Tehran /etc/localtime \
    && rm -rf /var/lib/apt/lists/*

# 下载并安装 Heimdall (3x-ui 改进版) v1.2.0
RUN curl -L https://github.com/sh7CBAC/Heimdall/releases/download/v1.2.0/x-ui-linux-amd64.tar.gz \
    -o /tmp/x-ui.tar.gz \
    && tar -xzf /tmp/x-ui.tar.gz -C /usr/local/ \
    && rm /tmp/x-ui.tar.gz \
    && chmod +x /usr/local/x-ui/x-ui

RUN mkdir -p /etc/x-ui /var/log/x-ui

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh

RUN mkdir -p /usr/share/nginx/html/view
COPY sub-view.html /usr/share/nginx/html/view/index.html

CMD ["/start.sh"]
```

几个值得注意的点：

1. **构建期拉取二进制**：`curl` 在 `build` 阶段下载 Heimdall 的 `x-ui-linux-amd64.tar.gz` 并解压到 `/usr/local/`，意味着每次重新部署都会拿到最新的 v1.2.0，无需提交大体积二进制。
2. **模板化 Nginx 配置**：`nginx.conf.template` 用 `gettext-base` 提供的 `envsubst` 在启动时注入变量（典型如 Railway 分配的域名/端口），再由 `start.sh` 渲染成最终配置。
3. **时区固定**：镜像把时区硬编码为 `Asia/Tehran`，若部署在其它区域，建议改为本地时区以免日志时间错乱。
4. **数据目录**：`/etc/x-ui` 是面板的配置与数据库目录，也是后续做持久化挂载的关键路径。

### SQLite 的取舍

Heimdall 默认使用 SQLite，配置文件与用户数据落在 `/etc/x-ui`。对于个人或小团队（几十到几百用户）完全够用，且省去了维护 Postgres 的复杂度。当并发用户规模很大时，README 建议自行改造 `Dockerfile` 与 `start.sh` 接入 Postgres——当前版本**仅支持 SQLite**。

## 三、安装与快速开始

### 环境要求

- 一个 GitHub 账号与一个 [Railway](https://railway.app) 账号。
- 新建一个公开（或私有）仓库，把三个核心文件放在根目录：`Dockerfile`、`nginx.conf.template`、`start.sh`。

### 在 Railway 上部署

1. **New Project → Deploy from GitHub repo**，选择你的仓库。
2. Railway 会自动识别 `Dockerfile` 并构建；构建时会自动下载最新版 Heimdall。
3. 部署完成后，进入 **Settings → Networking**，点击 **Generate Domain** 生成域名。
4. 确认 **Target Port 设为 3000**（因为 Nginx 监听的就是这个端口）。

构建完成后，你就拥有了一个形如 `https://<你的域名>.up.railway.app` 的访问入口。

## 四、使用方法与实战

### 首次登录面板

访问：

```
https://<你的域名>.up.railway.app/managepanel/
```

默认用户名 / 密码为 `admin` / `admin`，**登录后请立即在面板设置中修改**。

### 创建入站（Inbound）

在面板中新建一个入站，参数如下：

| 字段 | 取值 |
|---|---|
| Protocol | VLESS |
| **Listen Port** | **`8080`**（固定值，不要改） |
| Listen IP | 留空或 `0.0.0.0` |
| Network | `ws` |
| Security | `none` |
| Path | 任意路径，例如 `/cdn` |

注意：监听端口固定为 `8080` 是容器内部约定，对外仍由 Nginx 的 `3000` 端口统一收口，二者不冲突。

### 生成客户端链接

基于上面设置的 path（示例为 `/cdn`），客户端链接形如：

```
vless://UUID@<你的域名>.up.railway.app:443?encryption=none&security=tls&sni=<你的域名>.up.railway.app&fp=chrome&type=ws&host=<你的域名>.up.railway.app&path=%2Fcdn#MyConfig
```

其中 `UUID` 由面板生成，`security=tls` 复用 Railway 域名的 HTTPS 证书，对外表现为标准 443 TLS 流量。

### 订阅链接

订阅接口自动挂载在同一域名下：

```
https://<你的域名>.up.railway.app/sub/USER_SUB_ID
```

把该链接导入支持订阅的客户端，即可自动同步节点列表。

### 快速自检

```text
https://<你的域名>.up.railway.app/managepanel/   ← 应显示登录面板
https://<你的域名>.up.railway.app/cdn            ← 应返回 "Bad Request"（说明已到达 Xray）
```

`/cdn` 返回 `Bad Request` 是预期行为，代表 Nginx 已把请求成功转发到 Xray，只是缺少合法的 WebSocket 握手头。

## 五、常见问题与解决方案

**1. 重新部署后面板数据丢失**
面板的用户、入站等配置默认写在容器临时文件系统中，每次 Redeploy 会被重置。解决：在 Railway 的 **Volumes** 中把卷挂载到 `/etc/x-ui`，持久化数据库与配置。

**2. 页面无法访问 / 一直超时**
检查 Railway **Networking** 的 Target Port 是否为 `3000`；若误设为 `8080` 或 `3000` 以外的端口，公网流量无法进入 Nginx。

**3. 客户端连接失败、提示路径错误**
确认入站 Path（如 `/cdn`）与客户端链接里的 `path=%2Fcdn` 完全一致，且 `type=ws`、`security=tls` 等参数匹配。

**4. 用户量很大时性能吃紧**
当前版本仅支持 SQLite。README 明确说明：需要高并发时应自行改造 `Dockerfile` 与 `start.sh` 接入 Postgres，并在构建阶段安装/连接数据库。

**5. 时区日志对不上**
镜像默认时区为 `Asia/Tehran`，如需本地时间，修改 Dockerfile 中的 `ln -sf` 行再重新部署。

## 六、总结

**3x-ui-Upgrade** 的价值不在「重新造轮子」，而在用一套轻量的 `Dockerfile + Nginx 模板`把成熟的 3x-ui/Heimdall 面板「压」进 Railway 的单端口模型里。对于想快速在 PaaS 上跑起一个带 Web 管理界面的代理服务的用户，它把原本繁琐的多端口、多隧道配置收敛为「建仓 → 连 Railway → 设 3000 端口」三步，配合 SQLite 开箱即用，部署成本极低。

当然它也有边界：SQLite 默认存储意味着大规模并发需要自行迁移到 Postgres，且数据持久化依赖手动挂载 Volume。把它当作个人/小团队的轻量自建方案非常合适；若要做成多用户 SaaS 级服务，则需要按 README 指引做进一步改造。
