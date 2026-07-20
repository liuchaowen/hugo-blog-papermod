---
title: "SkillHub：一个企业级开源 Agent 技能仓库，让团队共享 AI 能力"
date: 2026-07-20
description: "SkillHub 是科大讯飞开源的企业级 Agent 技能注册与分发平台，支持自托管、语义化版本、团队命名空间、RBAC 权限管理，配合 CLI 一键安装 / 搜索 / 发布技能，适合在企业防火墙内搭建私有 AI 技能市场。"
author: "Cheman"
slug: skillhub
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI Agent", "SkillHub", "Spring Boot", "React"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**SkillHub**，来自科大讯飞（iFlytek）——一个企业级的开源 Agent 技能注册与分发平台，专为在企业防火墙内搭建私有 AI 技能市场而设计，支持发布、搜索、版本化管理、一键安装 AI Skill，让团队成员可以像用 npm 一样用 AI 能力。

## 一、项目概述

SkillHub 的定位是 **私有化的 Agent Skill Registry**，类似 npm、Docker Hub，但面向 AI Agent 技能包。它的核心目标是：

- **团队私有化部署**：数据主权完全在企业手中，部署在自己的基础设施上。
- **技能发布与版本管理**：上传 Skill 包，支持语义化版本（semver）、标签（beta/stable）、自动追踪 latest。
- **发现与搜索**：全文搜索 + 按命名空间、下载量、评分、时间过滤。
- **治理与审核**：团队管理员审核命名空间内技能，平台管理员把关推送到全局作用域，所有操作均有审计日志。
- **社交功能**：Star、评分、下载计数，构建组织内的最佳实践社区。

### 技术亮点速览

| 特性 | 说明 |
|------|------|
| 部署模式 | 自托管，支持本地文件系统（开发）和 S3/MinIO（生产） |
| 命名空间 | Team Namespace + Global Namespace，RBAC 权限分层 |
| CLI 工具 | `@astron-team/skillhub`，npm 全局安装，天然兼容 OpenClaw |
| 存储 | PostgreSQL 16 + Redis 7 + S3/MinIO |
| 前端 | React 19 + TypeScript + Vite + TanStack Router |
| 后端 | Spring Boot 3.2.3 + Java 21，Maven 多模块 Clean Architecture |
| 监控 | Prometheus + Grafana 监控栈开箱即用 |
| i18n | i18next 多语言支持 |

## 二、架构设计

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Web UI    │     │  CLI Tools  │     │  REST API    │
│  (React 19) │     │             │     │              │
└──────┬──────┘     └──────┬──────┘     └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Nginx     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Spring Boot │  Auth · RBAC · Core Services
                    │   (Java 21) │  OAuth2 · API Tokens · Audit
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼───┐  ┌─────▼────┐  ┌────▼────┐
       │PostgreSQL│  │  Redis   │  │ Storage │
       │    16    │  │    7     │  │ S3/MinIO│
       └──────────┘  └──────────┘  └─────────┘
```

**后端模块划分（多模块 Maven）：**
- `skillhub-app`：应用启动入口
- `skillhub-domain`：领域模型与核心业务逻辑
- `skillhub-auth`：认证授权（OAuth2、API Token、Mock Auth）
- `skillhub-search`：全文搜索服务
- `skillhub-storage`：存储抽象层（Local / S3 / MinIO）
- `skillhub-infra`：基础设施（数据库迁移 Flyway、监控等）

## 三、安装与快速开始

### 前置依赖

- Docker & Docker Compose
- Java 21+（本地后端开发）
- Node.js / pnpm（本地前端开发）

### 一键启动完整本地环境

```bash
rm -rf /tmp/skillhub-runtime
curl -fsSL https://imageless.oss-cn-beijing.aliyuncs.com/runtime.sh | sh -s -- up
```

一条命令拉起 Web UI（`http://localhost:3000`）和 Backend API（`http://localhost:8080`），默认使用 mock 认证用户：
- `local-user`：普通发布和命名空间操作
- `local-admin`：拥有 `SUPER_ADMIN` 权限，可操作审核和管理流程

本地开发启动完整环境（含安全扫描器）：

```bash
make dev-all
```

生产部署推荐配置 `--public-url`，确保 CLI 安装命令和 Agent 配置说明中的 URL 正确：

```bash
curl -fsSL https://imageless.oss-cn-beijing.aliyuncs.com/runtime.sh | sh -s -- \
  up --public-url https://skillhub.your-company.com
```

### CLI 安装与使用

```bash
# 全局安装 CLI
npm install -g @astron-team/skillhub

# 登录（指定私有注册地址）
skillhub login --token sk_xxx --registry https://skill.xfyun.cn

# 搜索技能
skillhub search pdf

# 安装技能到指定 Agent
skillhub install pdf-parser --agent codex

# 列出已安装技能
skillhub list
```

**与 OpenClaw 集成**（指定安装目录，兼容所有 CLI Coding Agent）：

```bash
npx clawhub search email
npx clawhub install my-skill
npx clawhub install my-namespace--my-skill
npx clawhub --dir ~/.claude/skills install my-skill
```

## 四、使用方法与实战

### 发布技能包

```bash
# 发布到全局命名空间
npx clawhub publish ./my-skill --slug my-skill --version 1.0.0

# 发布到团队命名空间
npx clawhub publish ./my-skill --slug my-space--my-skill --version 1.0.0
```

`namespace--skill-slug` 是 SkillHub 的规范 slug 格式，例如 `my-team--pdf-parser`。

### 团队命名空间与权限

团队管理员（Owner/Admin/Member）在自己的命名空间内管理技能发布和成员，平台管理员（Platform Admin）审核推送到全局作用域的技能。所有治理操作都有完整的审计日志（Audit Log），满足合规要求。

### 自定义存储后端（生产环境）

默认使用本地文件系统，开发测试够用。生产环境切换到 S3/MinIO：

```bash
# 在 .env.release 中配置
SKILLHUB_STORAGE_S3_BUCKET=skillhub-packages
SKILLHUB_STORAGE_S3_REGION=cn-beijing
SKILLHUB_STORAGE_S3_ACCESS_KEY=xxx
SKILLHUB_STORAGE_S3_SECRET_KEY=xxx
```

## 五、常见问题与解决方案

### Maven 依赖下载超时（国内开发者）

```bash
# 配置阿里云 Maven 镜像
# ~/.m2/settings.xml
<mirrors>
  <mirror>
    <id>aliyun</id>
    <mirrorOf>*</mirrorOf>
    <url>https://maven.aliyun.com/repository/public</url>
  </mirror>
</mirrors>
```

详见 [本地开发指南](https://iflytek.github.io/skillhub/quickstart.html#本地开发)。

### 8080 端口被占用

```bash
# 检查占用进程
lsof -i :8080
# 杀掉或修改 .env 中的 SKILLHUB_SERVER_PORT
```

### GHCR 镜像拉取失败（私有包）

如果 GitHub Container Registry 是私有仓库，先登录：

```bash
docker login ghcr.io
docker compose --env-file .env.release -f compose.release.yml up -d
```

### 后端启动后一直不 ready

1. 检查 `server.log` 日志
2. 确认 Java 版本 ≥ 21：`java -version`
3. 确认 Maven 依赖完整（阿里云镜像配置好后重试）
4. 重置依赖环境：`make dev-all-reset`

### 生产部署密码强度不足

`validate-release-config.sh` 会拒绝默认弱密码。部署前必须修改 bootstrap admin 密码：

```bash
BOOTSTRAP_ADMIN_PASSWORD=YourStr0ngP@ssword make validate-release-config
docker compose --env-file .env.release -f compose.release.yml up -d
```

## 六、总结

SkillHub 填补了企业在 AI Agent 时代构建私有技能生态的空白——用 Docker Compose 一键部署、用 CLI 一行命令安装、用命名空间和 RBAC 实现权限管控、用审计日志满足合规。对于正在推进 AI 落地的企业和团队，这是一个值得关注的开源基础设施选择。

**相关链接：**
- GitHub：https://github.com/iflytek/skillhub
- 官方文档：https://iflytek.github.io/skillhub/
- 开发者文档（ZRead）：https://zread.ai/iflytek/skillhub
- OpenClaw 集成指南：https://github.com/iflytek/skillhub/blob/main/docs/openclaw-integration.md
