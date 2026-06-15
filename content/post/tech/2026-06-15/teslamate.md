---
title: "TeslaMate：开源自托管 Tesla 数据记录与可视化平台"
date: 2026-06-15
description: "TeslaMate 是一款用 Elixir 编写的开源自托管 Tesla 数据记录工具，支持高精度行程记录、Postgres 存储、Grafana 可视化及 MQTT 集成，是 Tesla 车主进行车辆数据分析的最佳选择。"
author: "Cheman"
slug: teslamate
draft: false
categories: [技术, 开源]
tags: [Tesla, Elixir, 自托管, 数据可视化, GitHub Trending]
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

今天在 GitHub Trending 上看到一个有意思的项目：**TeslaMate**，这是一款专为 Tesla 车主设计的开源自托管数据记录与可视化平台，让你完全掌控自己的车辆数据。

## 一、项目概述

TeslaMate 是一个功能强大的自托管 Tesla 数据记录工具，由 Adrian Kumpf 发起，现由 teslamate-org 组织维护。项目采用 Elixir 编写，使用 Postgres 数据库存储数据，通过 Grafana 提供可视化分析能力，并将车辆数据发布到本地 MQTT Broker。

**核心特性：**
- 高精度行程数据记录
- 无额外 vampire drain：车辆尽快进入睡眠状态
- 自动地址解析
- 轻松集成 Home Assistant（通过 MQTT）
- 支持地理围栏自定义位置
- 支持单个 Tesla 账户下的多辆车辆
- 充电成本追踪
- 支持从 TeslaFi 和 tesla-apiscraper 导入数据
- 可自定义主题模式（浅色/深色/系统默认）

## 二、技术原理

### 技术栈选型

| 组件 | 技术 | 选型理由 |
|------|------|---------|
| 后端语言 | Elixir | 高并发、容错、适合长连接场景 |
| 数据库 | PostgreSQL | 成熟稳定，支持复杂查询和时序数据 |
| 可视化 | Grafana | 开源、强大的数据可视化平台 |
| 消息队列 | MQTT | 轻量级 IoT 协议，适合车辆数据传输 |
| 容器化 | Docker | 简化部署，一键启动 |

### 架构设计

TeslaMate 采用模块化设计，主要组件包括：

1. **TeslaMate Core（Elixir Application）**：负责与 Tesla API 通信，获取车辆数据并存储到 Postgres
2. **Postgres Database**：持久化存储所有车辆数据
3. **Grafana**：提供预置 Dashboard，可视化分析车辆数据
4. **MQTT Broker**：将车辆数据实时发布，供 Home Assistant 等系统集成

### 数据流分析

```
Tesla API → TeslaMate (Elixir) → PostgreSQL
             ↓
          MQTT Broker → Home Assistant / Node-RED / Telegram
             ↓
          Grafana ← PostgreSQL
```

核心代码（取自 `Dockerfile`）：
```dockerfile
FROM elixir:1.19.5-otp-28 AS builder
# 安装 Node.js 用于前端资源编译
RUN mix local.rebar --force && mix local.hex --force
# 编译 Assets 和 Release
RUN mix assets.deploy && mix compile
```

## 三、安装与快速开始

### 环境要求

- Docker & Docker Compose（推荐方式）
- 或：Erlang/Elixir 运行环境 + PostgreSQL + Grafana

### 安装步骤（Docker Compose）

1. 创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  teslamate:
    image: teslamate/teslamate:latest
    restart: always
    environment:
      - DATABASE_HOST=db
      - DATABASE_USER=teslamate
      - DATABASE_PASS=password
      - DATABASE_NAME=teslamate
      - MQTT_HOST=mqtt
      - TESLA_USERNAME=your@email.com
      - TESLA_PASSWORD=your_password
      - ENCRYPTION_KEY=your_32_byte_key_here!!
    ports:
      - 4000:4000
    depends_on:
      - db
      - mqtt

  db:
    image: postgres:15
    restart: always
    environment:
      - POSTGRES_USER=teslamate
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=teslamate
    volumes:
      - teslamate-db:/var/lib/postgresql/data

  grafana:
    image: teslamate/grafana:latest
    restart: always
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
    ports:
      - 3000:3000
    depends_on:
      - db

  mqtt:
    image: eclipse-mosquitto:2
    restart: always
    ports:
      - 1883:1883

volumes:
  teslamate-db:
```

2. 启动服务：

```bash
docker-compose up -d
```

3. 访问 Web 界面：`http://localhost:4000`

### 最简运行示例

```bash
# 克隆项目
git clone https://github.com/teslamate-org/teslamate.git
cd teslamate

# 使用 Docker Compose 启动
docker-compose up -d

# 查看日志
docker-compose logs -f teslamate
```

## 四、使用方法与实战

### 基础用法

1. **首次配置**：访问 `http://localhost:4000`，输入 Tesla 账户凭据（存储在本地数据库，使用 AES 加密）
2. **查看行程**：在 Web 界面查看所有行程记录，包括路线、能耗、速度等
3. **充电分析**：查看充电历史、成本统计和电池健康趋势

### 进阶用法

#### 集成 Home Assistant

通过 MQTT 将车辆数据接入 Home Assistant：

```yaml
# configuration.yaml
mqtt:
  sensor:
    - name: "Tesla Battery Level"
      state_topic: "teslamate/cars/1/battery_level"
      unit_of_measurement: "%"
```

#### 地理围栏

在 Web 界面创建自定义位置（如"家"、"公司"），系统会自动识别并标注行程起止点。

#### 导入历史数据

支持从 TeslaFi 导入历史数据：

```bash
# 在 Settings → Import 页面上传 TeslaFi 导出文件
```

### 实战场景

**场景一：监控 vampire drain**
通过 Grafana 的 "Vampire Drain" Dashboard，分析车辆静置时的电量损耗，优化充电策略。

**场景二：充电成本优化**
记录每次充电的电量和成本，结合电价时段数据，找出最经济的充电时间。

## 五、常见问题与解决方案

### 安装失败

**问题**：Docker 容器无法启动，报错 `Database connection refused`

**解决方案**：
- 检查 `DATABASE_HOST` 是否设置为 `db`（Docker Compose 服务名）
- 确认 PostgreSQL 容器已启动：`docker-compose ps db`
- 查看数据库日志：`docker-compose logs db`

### 运行时错误

**问题**：Web 界面显示 "Vehicle is asleep"，无法获取数据

**解决方案**：
- TeslaMate 会在车辆唤醒后自动获取数据
- 可手动唤醒车辆：在 Tesla App 中打开空调或发送远程指令
- 检查 `ENCRYPTION_KEY` 是否设置正确（必须恰好 32 字节）

### 性能问题

**问题**：Grafana Dashboard 加载缓慢

**解决方案**：
- 为 PostgreSQL 添加索引（项目已内置）
- 增加 Grafana 查询超时时间
- 限制查询时间范围（如最近 6 个月）

### 兼容性问题

**问题**：Tesla API 更新后无法获取数据

**解决方案**：
- 更新到最新版本：`docker-compose pull && docker-compose up -d`
- 查看项目 Issues：https://github.com/teslamate-org/teslamate/issues
- TeslaMate 社区通常会在 Tesla API 变化后快速修复

## 六、总结

TeslaMate 是一款功能全面、技术栈现代的开源 Tesla 数据记录工具。其 Elixir + Postgres + Grafana 的架构设计既保证了高并发性能，又提供了强大的数据分析能力。对于有自托管需求的 Tesla 车主来说，TeslaMate 是绝佳选择。

**项目亮点：**
- 完全自托管，数据掌控在自己手中
- AGPLv3 开源协议，代码透明可审计
- 丰富的 Grafana Dashboard，数据可视化开箱即用
- 活跃的社区和持续的维护更新

**相关链接：**
- GitHub：https://github.com/teslamate-org/teslamate
- 官方文档：https://docs.teslamate.org
- Docker Hub：https://hub.docker.com/r/teslamate/teslamate
