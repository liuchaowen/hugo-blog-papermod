---
title: "Apache Cassandra：面向云原生时代的高性能分布式数据库"
date: 2026-07-27
description: "Apache Cassandra 是一款高度可扩展的分布式 NoSQL 数据库，采用去中心化架构，支持多数据中心复制与线性扩展。本文深入解析其核心架构、技术原理及实战用法。"
author: "Cheman"
slug: cassandra
draft: false
categories: [技术, 开源, 数据库]
tags: [Apache, Cassandra, NoSQL, 分布式数据库, 高可用]
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

今天在 GitHub Trending 上看到一个经典而持续活跃的项目：**Apache Cassandra**，一款被无数大型互联网企业生产验证过的高度可扩展分布式 NoSQL 数据库。

## 一、项目概述

Apache Cassandra 由 Facebook 于 2008 年开源，2010 年成为 Apache 顶级项目，至今在 GitHub 上持续维护活跃。它是一个**分区行存储数据库（Partitioned Row Store）**，核心设计目标包括：

- **去中心化架构（Decentralized）**：无单点故障，每个节点对等
- **线性扩展（Linear Scalability）**：新增节点即可线性提升吞吐
- **多数据中心支持（Multi-Datacenter）**：支持跨机房、跨地域复制
- **高可用+最终一致性**：配置副本因子，实现任意节点故障不宕机

Cassandra 采用类 SQL 的查询语言 **CQL（Cassandra Query Language）**，对熟悉关系型数据库的开发者极为友好，同时摒弃了 JOIN 和子查询，专注于极致的写入性能。

## 二、技术原理

### 2.1 分区与副本机制

Cassandra 的数据按 **Partition Key** 分布在集群中，每条数据根据 partitioner（默认 Murmur3）计算 hash 值，映射到环（Ring）上的节点。一致性级别（Consistency Level）控制读写需要多少副本确认：

```python
# CQL 建表示例：定义 partition key
CREATE KEYSPACE mykeyspace
WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3};

USE mykeyspace;
CREATE TABLE users (
    user_id varchar PRIMARY KEY,
    first varchar,
    last varchar,
    age int
);
```

### 2.2 数据复制策略

Cassandra 支持两种复制策略：
- **SimpleStrategy**：单数据中心，简单哈希分配
- **NetworkTopologyStrategy**：多数据中心，可为每个 DC 配置不同副本数

### 2.3 写路径（Write Path）

Cassandra 的写入极为高效，写操作直接追加到 **MemTable**（内存表），同时顺序写入 **CommitLog**（保证持久化），由后台定期刷盘到 **SSTable**（排序字符串表）。

### 2.4 读取路径（Read Path）

读取时，Cassandra 从 MemTable 和多个 SSTable 中合并数据，通过 **Bloom Filter** 快速定位可能包含目标 Partition 的 SSTable，再结合 **Compaction** 策略合并重复数据。

### 2.5 核心依赖

Cassandra 基于 Java 构建，支持 Java 17+；CQL shell（cqlsh）依赖 Python 3.8+。

```bash
# 查看支持的 Java 版本（参考 build.xml 中 java.supported）
# 查看 cqlsh 支持的 Python 版本（参考 bin/cqlsh 中 is_supported_version 函数）
```

## 三、安装与快速开始

### 3.1 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Java | 17+（推荐） |
| Python | 3.8+（用于 cqlsh） |
| 内存 | 推荐 8GB+ |

### 3.2 快速启动

```bash
# 1. 下载并解压
tar -zxvf apache-cassandra-$VERSION.tar.gz
cd apache-cassandra-$VERSION

# 2. 启动单节点集群（前台运行，Ctrl+C 停止）
bin/cassandra -f

# 3. 新开终端，连接 cqlsh
bin/cqlsh
```

连接成功后会看到类似输出：

```
Connected to Test Cluster at localhost:9160.
[cqlsh 6.3.0 | Cassandra 7.0-SNAPSHOT | CQL spec 3.4.8 | Native protocol v5]
cqlsh>
```

### 3.3 Docker 快速体验

```bash
docker pull cassandra:latest
docker run --name cassandra -d -p 9042:9042 cassandra:latest
docker exec -it cassandra cqlsh
```

## 四、使用方法与实战

### 4.1 基本 CRUD 操作

```sql
-- 创建 Keyspace
CREATE KEYSPACE myapp
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE myapp;

-- 建表
CREATE TABLE orders (
    order_id varchar PRIMARY KEY,
    user_id varchar,
    amount decimal,
    status varchar,
    created_at timestamp
);

-- 写入数据
INSERT INTO orders (order_id, user_id, amount, status, created_at)
VALUES ('ord_001', 'user_123', 299.00, 'pending', toTimestamp(now()));

-- 批量写入
BEGIN BATCH
  INSERT INTO orders (order_id, user_id, amount, status) VALUES ('ord_002', 'user_456', 150.00, 'paid');
  INSERT INTO orders (order_id, user_id, amount, status) VALUES ('ord_003', 'user_789', 89.50, 'shipped');
APPLY BATCH;

-- 查询
SELECT * FROM orders WHERE order_id = 'ord_001';
SELECT * FROM orders WHERE user_id = 'user_123' ORDER BY created_at DESC;

-- 更新
UPDATE orders SET status = 'delivered' WHERE order_id = 'ord_001';

-- TTL 示例（数据 1 天后自动过期）
INSERT INTO orders (order_id, user_id, amount, status)
VALUES ('ord_tmp', 'user_999', 10.00, 'temp') USING TTL 86400;
```

### 4.2 高级特性

```sql
-- 集合类型（Set/List/Map）
CREATE TABLE user_profiles (
    user_id varchar PRIMARY KEY,
    name varchar,
    emails set<varchar>,
    phone_numbers list<varchar>,
    attributes map<varchar, varchar>
);

INSERT INTO user_profiles (user_id, name, emails, phone_numbers, attributes)
VALUES ('u001', 'Alice', {'alice@example.com'}, ['13800001111'], {'city': 'Shanghai', 'level': 'gold'});

-- 计数器（Counter）
CREATE TABLE page_views (
    page_url varchar PRIMARY KEY,
    view_count counter
);

UPDATE page_views SET view_count = view_count + 1 WHERE page_url = '/blog/cassandra';
```

### 4.3 Java 客户端连接

```java
import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.*;

try (CqlSession session = CqlSession.builder()
        .withNodeContactPoints("localhost")
        .withKeyspace("myapp")
        .build()) {

    PreparedStatement ps = session.prepare(
        "INSERT INTO orders (order_id, user_id, amount, status) VALUES (?, ?, ?, ?)"
    );

    session.execute(ps.bind("ord_010", "user_200", 499.0, "paid"));
    System.out.println("写入成功");
}
```

## 五、常见问题与解决方案

**Q1：启动报错 `Cassandra daemon is not running`？**
检查 Java 版本是否满足要求（Java 17+），确认 `$JAVA_HOME` 已正确设置。

**Q2：cqlsh 连接失败？**
确认 Cassandra 进程正常运行（`ps aux | grep cassandra`），端口 9042 未被占用：修改 `conf/cassandra.yaml` 中的 `native_transport_port`。

**Q3：数据不一致如何排查？**
使用 `nodetool repair` 触发一致性修复；查看 `system.log` 定位网络分区或节点宕机原因。

**Q4：如何调整副本数？**
修改 keyspace 复制策略后，需要逐节点运行 `nodetool rebuild` 确保数据完整同步。

**Q5：Compaction 策略如何选择？**
- **STCS（SizeTieredCompactionStrategy）**：适合写入为主、读取较少的场景
- **LCS（LeveledCompactionStrategy）**：适合读多写少、需要稳定读取延迟的场景
- **TWCS（TimeWindowCompactionStrategy）**：适合 TTL 数据和时间序列数据

## 六、总结

Apache Cassandra 以其去中心化架构、线性扩展能力和成熟的生产实践，成为处理海量数据写入场景的首选分布式数据库之一。如果你需要构建跨数据中心、零单点故障的高可用系统，Cassandra 依然是目前最值得深入学习的开源方案之一。

> 官方文档：https://cassandra.apache.org/doc/latest/
> Slack 社区：`#cassandra`（ASF Slack）
