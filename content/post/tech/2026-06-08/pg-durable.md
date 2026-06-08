---
title: "pg_durable：在 PostgreSQL 内实现持久化工作流编排"
date: 2026-06-08
description: "微软开源的 pg_durable 扩展将持久化执行模式带入 PostgreSQL，用 SQL DSL 定义工作流步骤，自动检查点恢复，无需外部编排服务。"
author: "Cheman"
slug: "pg-durable"
draft: false
categories: ["技术", "开源"]
tags: ["PostgreSQL", "Rust", "持久化执行", "工作流编排", "开源项目", "微软"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**pg_durable**，微软开源的一个 PostgreSQL 扩展，让你直接在 SQL 中定义持久化工作流——崩溃自动恢复、步骤自动检查点，不再需要外部的 Temporal 或 Airflow。

## 一、项目概述

**pg_durable** 是微软开发的一个 PostgreSQL 扩展，核心目标是将**持久化执行（Durable Execution）**模式引入数据库内部。它允许开发者用纯 SQL DSL 定义由多个步骤组成的工作流图，运行时自动在每个步骤之间进行持久化检查点（checkpoint），即使数据库崩溃、重启或某个步骤失败，也能从上一个检查点恢复执行，无需手动重建状态。

### 核心特性

- **持久化**：函数状态持久化到 PostgreSQL，可从崩溃、重启和故障转移中恢复
- **SQL 原生**：使用可组合的操作符（`~>`、`|=>`）在 SQL 中定义工作流
- **数据库感知**：内置调度、条件分支、并行执行等一等原语
- **零基础设施**：作为 PostgreSQL 扩展运行，无需 Redis、Temporal 或任何外部服务

### 适用场景

- 向量嵌入流水线：分块 → 调用嵌入 API → 写入 pgvector
- 数据摄取管道：暂存 → 去重 → 转换 → 发布大批量数据
- 定时维护任务：检测膨胀 → 通知 → 等待审批 → 执行后续操作
- 扇出聚合：并行执行独立查询 → 合并结果
- 外部 API 工作流：从 SQL 直接调用 HTTP 端点进行数据丰富、分类

## 二、技术原理

### 架构设计

pg_durable 的整体架构分为三层，全部运行在 PostgreSQL 进程内部：

```
┌──────────────────────────────────────────────────────┐
│                   PostgreSQL                         │
│  ┌────────────────────────────────────────────────┐  │
│  │         pg_durable extension (pgrx)            │  │
│  │  SQL DSL: 'sql' |=> 'name' ~> 'sql2'           │  │
│  │  Background Worker                              │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  duroxide (编排运行时)                    │  │  │
│  │  │  ┌────────────────────────────────────┐  │  │  │
│  │  │  │  duroxide-pg (状态持久化层)        │  │  │  │
│  │  │  └────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
│  Schemas: df.* (DSL图) | duroxide.* (运行时状态)    │
└──────────────────────────────────────────────────────┘
```

### 核心技术栈

| 组件 | 技术 | 作用 |
|------|------|------|
| 扩展框架 | [pgrx](https://github.com/pgcentralfoundation/pgrx) 0.16.1 | Rust 编写 PostgreSQL 扩展的框架 |
| 编排运行时 | [duroxide](https://github.com/microsoft/duroxide) | 持久化任务编排引擎，提供确定性回放、检查点、子编排和定时器 |
| 状态存储 | [duroxide-pg](https://github.com/microsoft/duroxide-pg) | 基于 PostgreSQL 的状态提供者，将运行时状态持久化到 `duroxide.*` schema |
| HTTP 客户端 | reqwest 0.12 | 支持 `df.http()` 从 SQL 步骤中发起 HTTP 请求 |
| Cron 解析 | cron 0.13 | 支持 `wait_for_schedule` 实现定时调度 |

### SQL DSL 设计

pg_durable 提供了一套精心设计的 SQL DSL 操作符，核心包括：

- `|=>`：管道操作符，将前一步骤的输出作为命名参数传递给下一步骤
- `~>`：序列操作符，按顺序执行步骤但不传递输出
- `df.if()`：条件分支
- `df.join()`：并行扇出后的结果聚合
- `df.loop()`：循环执行
- `df.http()`：从 SQL 发起 HTTP 请求

以下是一个典型的工作流定义，展示了数据处理管道的写法：

```sql
-- 持久化函数：分批处理未处理文档
SELECT df.start(
    'SELECT id FROM documents WHERE processed = false LIMIT 100' |=> 'batch'
    ~> 'UPDATE documents SET processed = true WHERE id = ANY($batch)'
);
```

这里 `'SELECT id FROM documents ...'` 的查询结果被命名为 `batch`，然后通过 `$batch` 引用在后续步骤中使用。

### 检查点与恢复机制

pg_durable 的核心价值在于其检查点机制。当工作流执行时：

1. `df.start()` 创建一个工作流实例，返回实例 ID
2. 后台 Worker 逐步执行每个 SQL 步骤
3. 每个步骤成功完成后，状态被持久化到 `duroxide.*` schema
4. 如果 PostgreSQL 在步骤之间崩溃，重启后 Worker 从最后一个检查点恢复
5. 用户可以通过 `df.instances` 表查询运行状态和结果

这解决了传统方案的核心痛点——长事务持有锁、WAL 膨胀、失败后需要手动清理和不确定的回放。

### 权限与安全模型

pg_durable 采用了严格的权限设计：

- `CREATE EXTENSION` **不会**向 PUBLIC 授予任何权限
- 管理员必须通过 `df.grant_usage('app_role')` 显式授权
- 行级安全（RLS）确保每个用户只能查看和管理自己的实例
- 后台 Worker 角色必须是 superuser（用于绕过 RLS 管理所有用户的实例）
- `df.vars` 使用每用户作用域，避免变量命名冲突

```sql
-- 创建共享角色并授权
CREATE ROLE pg_durable_user NOLOGIN;
SELECT df.grant_usage('pg_durable_user');

-- 应用角色继承权限
GRANT pg_durable_user TO app_backend, etl_service;
```

## 三、安装与快速开始

### 环境要求

- PostgreSQL 17 或 18
- Rust（nightly 版本）
- cargo-pgrx 0.16.1

### 方式一：Debian 包安装（推荐生产环境）

从 GitHub Releases 下载对应版本的 `.deb` 包：

```bash
# 安装 Debian 包
sudo dpkg -i pg-durable-postgresql-17_0.2.2-1_amd64.deb
```

然后在 PostgreSQL 配置中添加：

```ini
# postgresql.conf
shared_preload_libraries = 'pg_durable'
pg_durable.database = 'postgres'
```

重启 PostgreSQL 后创建扩展：

```sql
CREATE EXTENSION pg_durable;
```

### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/microsoft/pg_durable.git
cd pg_durable

# 使用预配置脚本（会自动安装依赖、构建并初始化 PostgreSQL）
./scripts/pg-start.sh

# 连接到本地实例
~/.pgrx/17.*/pgrx-install/bin/psql -h localhost -p 28817 -d postgres
```

### 方式三：Docker

```bash
# 构建镜像
docker build --platform linux/amd64 -t pg_durable:latest .

# 运行容器
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres pg_durable:latest
```

### 方式四：GitHub Codespace

主分支已预构建 PostgreSQL 17 并安装好扩展，直接启动即可：

```bash
./scripts/pg-start.sh
~/.pgrx/17.*/pgrx-install/bin/psql -h localhost -p 28817 -d postgres
```

## 四、使用方法与实战

### 基础用法：数据处理管道

```sql
-- 简单的两步工作流：查询 + 更新
SELECT df.start(
    'SELECT id FROM documents WHERE processed = false LIMIT 100' |=> 'batch'
    ~> 'UPDATE documents SET processed = true WHERE id = ANY($batch)'
);
```

### 进阶用法：并行查询聚合

```sql
-- 扇出：并行执行多个独立查询，然后聚合结果
SELECT df.start(
    df.join(
        'SELECT count(*) FROM users' |=> 'user_count',
        'SELECT count(*) FROM orders' |=> 'order_count',
        'SELECT sum(amount) FROM orders' |=> 'total_revenue'
    ) ~> $$
        INSERT INTO dashboard_summary (user_count, order_count, total_revenue)
        VALUES ($user_count, $order_count, $total_revenue)
        ON CONFLICT (date) DO UPDATE SET
            user_count = EXCLUDED.user_count,
            order_count = EXCLUDED.order_count,
            total_revenue = EXCLUDED.total_revenue
    $$
);
```

### 实战：带条件分支的工作流

```sql
-- 根据条件执行不同的处理逻辑
SELECT df.start(
    'SELECT status, id FROM jobs WHERE next_run <= now() LIMIT 10' |=> 'job'
    ~> df.if(
        '$job.status = ''active''' ~> 'CALL process_active_job($job.id)',
        '$job.status = ''pending''' ~> 'CALL process_pending_job($job.id)'
    )
);
```

### 实战：外部 API 调用

```sql
-- 从 SQL 中调用外部 HTTP API 进行数据丰富
SELECT df.start(
    'SELECT id, content FROM articles WHERE enriched = false LIMIT 50' |=> 'article'
    ~> 'SELECT df.http(''POST'', ''https://api.example.com/classify'', 
         json_build_object(''text'', $article.content))' |=> 'result'
    ~> $$
        UPDATE articles 
        SET category = ($result)->>'category',
            enriched = true
        WHERE id = $article.id
    $$
);
```

### 查询工作流状态

```sql
-- 查看所有工作流实例
SELECT id, status, submitted_at, updated_at FROM df.instances ORDER BY submitted_at DESC;

-- 查看实例的执行节点
SELECT * FROM df.nodes WHERE instance_id = '<instance_id>';
```

## 五、常见问题与解决方案

### 安装失败：pgrx 版本不匹配

pg_durable 要求 cargo-pgrx 0.16.1 的精确版本，安装时注意使用 `--locked` 标志：

```bash
cargo install cargo-pgrx --version 0.16.1 --locked
```

### 运行时错误：扩展未加载

确保 `shared_preload_libraries` 中包含 `pg_durable`，并且已重启 PostgreSQL。扩展作为后台 Worker 运行，必须通过预加载库启动。

### 升级后权限丢失

执行 `ALTER EXTENSION pg_durable UPDATE` 后，需要重新运行权限授予：

```sql
-- 升级后重新授权
SELECT df.grant_usage('app_role');
```

这是因为 `GRANT EXECUTE ON ALL FUNCTIONS` 只对已存在的函数生效，升级引入的新函数需要单独授权。

### 性能注意事项

- pg_durable 不适合亚毫秒级同步请求处理场景
- 每个工作流步骤之间会有检查点持久化开销，适合长时间运行的后台任务
- 如果工作流只需要单条 SQL 语句就能完成，直接使用普通 SQL 即可，无需引入 pg_durable

### 不适用的场景

- 任务已经是单条 `INSERT ... SELECT` 或普通 SQL 语句
- 需要任意应用逻辑（无法映射到 SQL 步骤、分支、循环或 HTTP 调用）
- 无法在 PostgreSQL 环境中安装扩展或运行后台 Worker
- 工作流主要在 PostgreSQL 之外，跨多个异构系统

## 六、总结

pg_durable 代表了一种有趣的技术趋势——**将计算推向数据**。传统的持久化执行方案（Temporal、Airflow、Step Functions）都是在应用层实现，需要额外的基础设施来协调与数据库的交互。pg_durable 反其道而行，将工作流编排直接嵌入 PostgreSQL，利用数据库本身的持久化能力作为工作流状态的保证。

对于已经在 PostgreSQL 上存储大量状态的后端和数据工程团队来说，pg_durable 提供了一种优雅的替代方案：不再需要在 cron 任务、消息队列、状态表和外部编排器之间进行胶水编程，只需用 SQL 定义工作流，其余交给扩展处理。当前项目处于 Preview 阶段，支持 PostgreSQL 17 和 18，采用 PostgreSQL License 开源。
