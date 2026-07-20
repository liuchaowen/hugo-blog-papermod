---
title: "Openship: 开源一键部署平台, 推代码即上线"
date: 2026-07-21
description: "Openship 是一款开源、自托管的部署平台, 内置 CI/CD, 支持任意技术栈, 提供桌面 App、Web 面板和 CLI 三种操作界面, 让部署像 git push 一样简单。"
author: "Cheman"
slug: openship
draft: false
categories: ["技术", "开源"]
tags: ["DevOps", "CI/CD", "开源", "部署", "Docker"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Openship**，一个开源、自托管的部署平台，核心理念是「推代码即上线」——零配置文件、零流水线、零 YAML，只需一个 `openship deploy` 命令即可完成构建、容器化、域名、SSL 全套上线流程。

## 一、项目概述

Openship 脱胎于现代开发团队对简化部署的强烈需求：传统 CI/CD 方案（GitHub Actions、Jenkins、GitLab CI）虽然强大，但配置门槛高、维护成本大，尤其对个人开发者和小型团队不友好。Openship 的定位是：**把 Fly.io 和 Railway 的体验带到自托管场景**，同时保留完全的控制权。

核心能力一览：

- **推代码即部署**：`openship init` 绑定项目，`openship deploy` 自动检测技术栈并完成全流程
- **内置 CI/CD**：支持预览环境、分支部署、滚动回滚
- **全栈支持**：Node.js、Python、Go、Rust、PHP、Ruby、Java、.NET、Docker Compose、Monorepo
- **数据库全家桶**：PostgreSQL、MySQL、MongoDB、Redis，开箱即用
- **基础设施全套**：Let's Encrypt 自动 SSL、边缘 CDN（S3 兼容存储）、内置 SMTP 邮件服务器、定时备份
- **三种操作界面**：桌面 App（Electron）、Web 面板、CLI；另有 REST API 和 MCP 协议，天然支持 AI Agent 集成
- **灵活部署**：可对接 Openship Cloud（托管服务），也可部署在任何 Linux VPS（DigitalOcean、Hetzner、Homelab 等）上

当前版本 0.2.0，采用 Apache 2.0 开源许可证，生产可用。

## 二、技术架构

### 技术栈选型

从项目源码结构来看，Openship 采用 **Bun + TypeScript** 构建工具链，使用 **Turbo Monorepo** 管理多包架构，核心仓库结构如下：

```
openship/
├── apps/
│   ├── api/          # 后端 REST API 服务
│   ├── dashboard/    # Next.js Web 管理面板
│   ├── desktop/      # Electron 桌面应用
│   ├── email/        # 内置邮件服务器
│   └── web/          # 官网前端
├── packages/
│   └── db/           # 数据库 Schema（Drizzle ORM）
└── scripts/
    └── release.ts    # 版本发布脚本
```

项目使用 **Bun** 作为首选运行时和包管理器（`packageManager: "bun@1.3.10"`），而 `devDependencies` 中仅引入了 Prettier、Turbo 和 TypeScript，依赖非常轻量。数据库层采用 **Drizzle ORM**，属于新一代类型安全、轻量级 ORM，比 Prisma 更接近 SQL 原生。

### 内置 CI/CD 工作流

Openship 的部署流程大致如下：

```bash
cd your-project
openship init         # 交互式绑定项目，生成 .openship/config.json
openship deploy       # 触发完整流水线
```

`deploy` 命令内部自动完成：

1. **环境检测**：读取 `package.json`、`Dockerfile`、语言特征文件，判断项目类型
2. **构建镜像**：根据检测结果生成或复用 Dockerfile，构建 OCI 镜像
3. **编排服务**：若项目依赖数据库或 Redis，自动注入 `docker-compose.yml`
4. **网络配置**：注册域名、申请 Let's Encrypt 证书，配置反向代理
5. **健康检查**：轮询 `/health` 端点，确认服务启动成功后返回

源码中的 monorepo workspaces 配置允许多个子项目并行构建，Turbo 的 `--filter` 机制可以精准控制只构建变更的部分，大幅提升 CI 效率。

### MCP 协议集成

MCP（Model Context Protocol）是 AI Agent 领域的开放协议，允许 AI 助手直接调用部署工具。结合 REST API，Openship 可以被 AI Agent 调用来实现「自然语言部署」——比如对 AI 说「帮我把这个 Node 项目部署到生产环境」，Agent 调用 Openship API 完成全部操作。

## 三、安装与快速开始

### 环境要求

- 操作系统：Linux（Ubuntu 20.04+、Debian 11+）、macOS
- Bun 运行时（npm i -g openship 会自动引导安装）
- Docker 和 Docker Compose（用于容器化部署）

### 安装方式一：Bun（一键推荐）

```bash
# 安装 Bun（如未安装）
curl -fsSL https://bun.sh/install | bash

# 安装 Openship CLI
npm i -g openship

# 或使用 Bun 直接安装
bun add -g openship
```

### 安装方式二：安装脚本（Linux/macOS）

```bash
curl -fsSL https://get.openship.io | sh
```

### 启动服务

```bash
openship up              # 安装为后台服务，开机自启
openship open            # 打开 Web 管理面板
openship stop            # 停止服务
openship up --foreground # 前台运行（调试模式）
```

### Docker Compose 部署

```bash
git clone https://github.com/oblien/openship.git
cd openship
cp .env.example .env
# 编辑 .env，填入必要配置（域名、邮箱等）
docker compose up -d
```

访问 `http://localhost:3000` 即可进入 Web 面板。

## 四、使用方法与实战

### 部署第一个项目

```bash
# 1. 在项目根目录初始化
cd my-awesome-project
openship init

# 2. 交互式配置（自动检测框架）
# ? Project name: my-awesome-project
# ? Port: 3000
# ? Health check path: /health

# 3. 一键部署
openship deploy

# 4. 查看实时日志
openship logs -f
```

### 预览环境与分支部署

Openship 原生支持预览环境（Preview Environments），每次在 Git 分支上推送代码会自动生成一个独立的预览 URL：

```bash
git checkout -b feature/new-login
git push origin feature/new-login
# Openship 自动分配 https://feature-new-login.preview.yourdomain.com
```

### 使用桌面 App

```bash
openship install  # 安装桌面应用（或从 openship.io 下载）
openship app      # 打开桌面 App
```

桌面 App 提供图形化界面，实时显示构建日志、容器状态、资源使用率，适合不熟悉命令行的用户。

## 五、常见问题与解决方案

**Q: `openship up` 报错 `command not found`？**

确保已将 Bun/npm 全局 bin 目录加入 PATH：

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Q: 部署 Node.js 项目时提示 `packageManager` 版本不匹配？**

Openship 对 Bun 有硬性依赖，确保本地安装 Bun 1.3.10 以上版本。也可通过 Docker 方式绕过本地环境限制。

**Q: SSL 证书申请失败？**

确保域名已正确解析到服务器 IP，且防火墙开放 80（Let's Encrypt 验证）和 443 端口。服务器时间需同步（NTP），否则 ACME 协议校验会失败。

**Q: 想在同一台服务器上部署多个项目？**

Openship 每个项目默认使用不同端口，通过内置反向代理统一对外提供服务。Docker 网络默认使用 `bridge` 模式，不同项目容器间网络隔离，安全可控。

**Q: Docker Compose 部署后 Web 面板无法访问？**

检查 `.env` 中 `APP_URL` 是否正确设置，并确认 `docker compose ps` 所有服务状态为 `healthy`。

## 六、总结

Openship 代表了「部署民主化」的一个新方向：把 Fly.io 的开箱即用体验与自托管的完全控制权结合，用零配置的方式降低了现代应用部署的门槛。它不是要替代 Kubernetes，而是填补了「Docker Compose 太手动、Jenkins 太重」之间的空白。

如果你厌倦了维护复杂的 CI/CD 流水线，或希望团队成员无需 DevOps 经验也能自主部署项目，Openship 值得一试。

> 项目地址：[https://github.com/oblien/openship](https://github.com/oblien/openship)  
> 官网：[https://openship.io](https://openship.io)
