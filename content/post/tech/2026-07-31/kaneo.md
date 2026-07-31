---
title: "Kaneo：极简主义自托管项目管理平台"
date: "2026-07-31"
description: "Kaneo 是一款以「少即是多」为理念的开源自托管项目管理工具，主打纯净界面、自我托管、数据自主和极致性能，采用 Hono + PostgreSQL 技术栈，支持 Docker 一键部署和 Kubernetes Helm 安装。"
author: "Cheman"
slug: kaneo
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "项目管理", "Self-hosted", "Docker"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Kaneo**，它是一款以「less is more」为核心原则的开源自托管项目管理平台，旨在打造一个「隐形」的工具——不干扰你的工作流，而是放大它。

## 一、项目概述

大多数项目管理工具的问题不在于功能太少，而是**功能太多**。每一次多余的弹窗、每一个不必要的按钮、每一条复杂的流程，都在把团队从真正重要的事情上拉开。Kaneo 的设计哲学是：**最好的工具应该是隐形的**。

**核心特性：**
- **纯净界面**：只展示与工作相关的内容，剔除所有干扰
- **自托管**：数据完全掌握在自己手中，不依赖第三方云服务
- **极致性能**：真正快的体验，而非宣传噱头
- **开源 MIT 许可**：可自由使用、修改和分发
- **一键部署**：通过 `drim` CLI 或 Docker Compose 快速启动

## 二、技术架构

### 核心技术栈

从 `package.json` 可以看出 Kaneo 的技术选型：

- **后端框架**：Hono —— 轻量、高性能的 Node.js Web 框架，支持任意运行部署环境
- **数据库**：PostgreSQL 16（Alpine 镜像，体积更小）
- **包管理器**：pnpm 10.32.1（高效的项目管理）
- **构建工具**：Turbo（Monorepo 构建系统）
- **开发工具**：Biome（快速代码格式化/检查）、TypeScript 5.8.3（类型安全）
- **质量保障**：commitlint + husky（Git hooks 规范化提交）

```json
{
  "dependencies": {
    "dotenv-mono": "^1.5.1"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.4",
    "esbuild": "0.28.1",
    "turbo": "^2.10.5",
    "typescript": "5.8.3"
  }
}
```

### 安全依赖覆盖

值得注意的是，项目大量使用 `pnpm.overrides` 来统一锁定依赖版本，防止供应链攻击（supply chain attack），这是生产级开源项目应有的安全实践：

```json
"pnpm": {
  "overrides": {
    "hono": ">=4.12.25",
    "esbuild": "0.28.1",
    "lodash": "4.18.0",
    "ws": ">=8.20.1",
    "next": ">=15.5.18 <16.0.0 || >=16.2.6"
  }
}
```

### Monorepo 架构

项目采用 Monorepo 结构，通过 Turbo 统一管理多个子包（API、Web 等），实现了构建缓存和增量构建。

## 三、安装与快速开始

### 方式一：drim 一键部署（推荐）

```bash
curl -fsSL https://assets.kaneo.app/install.sh | sh
drim setup
```

一条命令完成所有配置：自动 HTTPS、数据库初始化、全服务配置。

### 方式二：Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env_file:
      - .env
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kaneo -d kaneo"]
      interval: 10s
      timeout: 5s
      retries: 5

  kaneo:
    image: ghcr.io/usekaneo/kaneo:latest
    ports:
      - "5173:5173"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

配置步骤：
1. 复制 `.env.sample` 到 `.env`
2. 设置 `POSTGRES_PASSWORD=<密码>`
3. 生成密钥：`openssl rand -hex 32`，填入 `AUTH_SECRET`
4. 启动：`docker compose up -d`
5. 访问 [http://localhost:5173](http://localhost:5173)

### 方式三：Kubernetes Helm

```bash
# 查看 Helm chart 文档
# ./charts/kaneo/README.md
```

生产环境部署支持 TLS 配置和完整的环境变量管理。

## 四、开发环境搭建

```bash
# 克隆项目
git clone https://github.com/usekaneo/kaneo.git
cd kaneo

# 安装依赖
pnpm install

# 创建 .env 配置文件
# 详见 ENVIRONMENT_SETUP.md

# 启动开发服务器
pnpm dev
```

开发过程中使用 Husky + commitlint 确保提交信息符合 Conventional Commits 规范。

## 五、K8s 生产部署要点

- 提供官方 Helm Chart，支持生产级 TLS 配置
- 建议使用独立 PostgreSQL 实例或云数据库服务
- 环境变量需仔细配置 API 和 Web 服务的各项参数
- 官方文档 [kaneo.app/docs/core](https://kaneo.app/docs/core) 有详细的故障排查指南

## 六、总结

Kaneo 代表了一种项目管理工具的新思路：**不是功能堆砌，而是精准克制**。如果你受够了 Jira 的沉重、Notion 的臃肿、Trello 的简陋，Kaneo 值得一试——纯净、开源、自托管，极简而不简陋。

GitHub：[https://github.com/usekaneo/kaneo](https://github.com/usekaneo/kaneo)
官方文档：[https://kaneo.app/docs/core](https://kaneo.app/docs/core)
