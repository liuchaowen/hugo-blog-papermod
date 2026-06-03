---
title: "Flowsint：开源 OSINT 图谱探索工具，让情报分析可视化"
date: 2026-06-03
description: "Flowsint 是一款基于图数据库的开源 OSINT 工具，支持域名、IP、社交媒体、加密货币等多维度情报关联探索，通过可视化图谱界面让调查分析变得直观高效。"
author: "Cheman"
slug: flowsint
draft: false
categories: ["开源工具", "安全研究"]
tags: ["OSINT", "图数据库", "开源情报", "GitHub", "Neo4j", "网络安全"]
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

今天在 GitHub Trending 上看到一个很有意思的开源安全项目：**Flowsint**，一款基于图数据库的 OSINT（开源情报）图谱探索工具，支持域名、IP、社交媒体、加密货币等多维度实体关联分析，所有数据完全本地存储，注重隐私保护。

## 一、项目概述

Flowsint 是一个开源的 OSINT 图探索工具，专为道德调查、透明度和验证而设计。它的核心理念是将各种网络实体（域名、IP地址、邮箱、社交媒体账号、加密货币钱包等）以图的方式组织起来，让调查者能直观地发现隐藏的关联关系。

**核心特性：**

- **图数据库驱动**：基于 Neo4j 图数据库存储实体关系，天然适合关联分析
- **丰富的 Enricher（增强器）**：内置 20+ 种数据增强模块，覆盖 DNS、WHOIS、社交、加密货币等领域
- **全本地部署**：所有数据存储在用户自己的机器上，无需依赖第三方云服务
- **现代化前端**：基于前端框架构建的交互式图谱界面，即使处理数千节点也不会卡顿
- **模块化架构**：后端拆分为 core、types、enrichers、api 四个独立模块，便于扩展

## 二、技术原理

### 架构设计

Flowsint 采用微服务式的模块化架构，各模块职责清晰：

```
flowsint-app (前端)
    ↓
flowsint-api (FastAPI 服务端)
    ↓
flowsint-core (编排器、Celery 任务、保险柜)
    ↓
flowsint-enrichers (增强器 & 工具)
    ↓
flowsint-types (类型定义)
```

- **flowsint-types**：基于 Pydantic 的类型定义层，定义了 Domain、IP、ASN、CIDR、Email、CryptoWallet 等所有数据模型
- **flowsint-core**：核心编排层，负责数据库连接（PostgreSQL + Neo4j）、认证授权、Celery 异步任务调度
- **flowsint-enrichers**：数据增强层，包含各类情报采集和处理模块
- **flowsint-api**：基于 FastAPI 的 REST API 层，提供实时事件流和图谱查询接口
- **flowsint-app**：前端应用，提供高性能图谱可视化

### 核心技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端 | 现代前端框架 + TypeScript |
| API | FastAPI + Uvicorn |
| 图数据库 | Neo4j |
| 关系数据库 | PostgreSQL |
| 任务队列 | Celery + Redis |
| 包管理 | Python (uv/poetry) + Node.js (yarn workspaces) |
| 容器化 | Docker Compose (dev/prod/deploy 三套配置) |

### 数据流分析

用户在前端发起查询 → API 层接收请求 → Core 编排器调度 → 对应 Enricher 执行数据采集 → 结果写入 Neo4j 图数据库 → 前端实时更新图谱。异步任务通过 Celery 处理，确保长时间运行的增强操作不阻塞前端。

## 三、安装与快速开始

### 环境要求

- Docker
- Make

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/reconurge/flowsint.git
cd flowsint

# 一键启动生产环境
make prod
```

启动后访问 [http://localhost:5173/register](http://localhost:5173/register) 创建账号即可使用，默认没有任何预设凭证。

### 开发模式

```bash
# 启动开发环境（含热重载）
make dev
```

开发模式会自动构建镜像、启动容器并打开浏览器。

## 四、使用方法与实战

### 域名调查流程

1. 输入一个目标域名作为起始节点
2. Flowsint 自动执行 DNS 解析、WHOIS 查询、子域名枚举
3. 图谱中展示域名与 IP、ASN、关联组织的连线
4. 点击节点可进一步触发社交搜索或历史记录查询

### 社交媒体关联

通过 Maigret 增强器，输入一个用户名即可在数百个社交平台上搜索，将发现的账号作为节点加入图谱，与其他实体建立关联。

### 加密货币追踪

输入钱包地址，自动拉取交易历史和关联的 NFT 资产，结合其他实体分析资金流向。

### N8n 集成

内置 N8n Connector 增强器，可将调查结果对接到自动化工作流中，实现情报采集的自动化。

## 五、常见问题与解决方案

**Docker 相关**

- 确保已安装 Docker 和 Docker Compose
- 如果端口冲突，修改 `docker-compose` 配置中的端口映射
- 开发环境需要 `make infra-dev` 先启动基础设施（PostgreSQL、Redis、Neo4j）

**数据库迁移**

```bash
# 开发环境 Neo4j 迁移
make migrate-dev

# PostgreSQL 迁移（Alembic）
make alembic-upgrade
```

**前端路由问题**

如果添加了新页面，需要重新生成路由文件：

```bash
make regenerate-router
```

**性能问题**

- Neo4j 图数据库能高效处理大量节点和关系
- 前端针对大规模图谱做了性能优化，数千节点仍可流畅操作
- 使用 Celery 异步处理耗时任务，避免阻塞

## 六、总结

Flowsint 将 OSINT 调查从传统的命令行工具提升到了可视化图谱交互的层次，模块化的设计让安全研究人员可以轻松开发自定义的增强器来扩展调查能力。全本地部署的设计理念也非常契合安全行业对数据隐私的要求。对于从事网络安全研究、威胁情报分析或调查新闻报道的人来说，这是一个值得关注和参与的开源项目。

> 项目地址：[https://github.com/reconurge/flowsint](https://github.com/reconurge/flowsint)
> 许可证：Apache-2.0
