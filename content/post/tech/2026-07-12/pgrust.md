---
title: "pgrust: 用 Rust 从头重写 Postgres，已通过 46000+ 回归测试"
date: 2026-07-12
description: "pgrust 是一个用 Rust 从头重写 Postgres 的开源项目，目标兼容 Postgres 18.3，已通过超过 46000 条回归测试。它与 Postgres 磁盘兼容，可直接启动现有数据目录，并已在事务负载上比 Postgres 快 50%、分析负载上快约 300 倍。"
author: "Cheman"
slug: pgrust
draft: false
categories: ["技术", "数据库", "开源"]
tags: ["Rust", "Postgres", "数据库内核", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个令人振奋的项目：**pgrust**，一个用 Rust 完全重写 Postgres 的开源实现，目标是与 Postgres 18.3 高度兼容，并已在超过 46000 条回归测试中通过。该项目由 [malisper](https://github.com/malisper) 主导，其核心理念是：保留 Postgres 的外部行为不变，用 Rust 语言和 AI 辅助编程来解锁更深层的内核改动。

## 一、项目概述

pgrust 的定位并非简单的 Postgres 包装器或扩展，而是一次从零开始的完整重写。它有着清晰的技术目标：

- **100% 回归测试兼容**：pgrust 以 Postgres 自身的 46000+ 回归测试用例为 oracle，逐一验证兼容性。当前已非常接近目标。
- **磁盘兼容**：pgrust 可以直接使用现有的 Postgres 18.3 数据目录启动，无需数据迁移。
- **性能显著提升**：最新版本（尚未公开发布）采用**线程-per-连接**模型（而非 Postgres 原生的进程-per-连接），在事务负载上比 Postgres 快 50%，在分析型负载上快约 300 倍，clickbench 测试仅比 ClickHouse 慢 2 倍，项目方认为还有进一步超越的空间。
- **WebAssembly 演示**：官方提供了 [pgrust.com](https://pgrust.com) 在线体验，直接在浏览器里跑 Postgres。

### 关键里程碑

| 里程碑 | 状态 |
|--------|------|
| 46000+ 回归测试通过 | ✅ 已完成 |
| 磁盘兼容 Postgres 18.3 | ✅ 已完成 |
| 100% 回归测试通过 | 🚧 最新版本已达成，待发布 |
| 多线程内核 | 🚧 进行中 |
| 内置连接池 | 🚧 规划中 |

## 二、技术原理

### 架构设计

pgrust 选择了一条务实的路径：复刻 Postgres 的行为层，同时用 Rust 的现代系统编程能力重写底层实现。这种"外不变、内全新"的策略降低了迁移门槛——现有 Postgres 客户端、驱动和工具链可以无缝接入。

核心架构选择：

```rust
// 进程-per-连接 → 线程-per-连接
// 这是 pgrust 性能大幅提升的关键之一
// Postgres 每个连接 fork 一个进程，开销巨大
// pgrust 使用轻量级线程（goroutine 风格但用 Rust 实现）
```

### 技术栈

- **语言**：Rust（核心重写）
- **ICU 库**：`icu4c`（Unicode 国际化支持）
- **加密**：OpenSSL 3
- **数据库协议**：Postgres 18.3 wire protocol（完全兼容）
- **构建工具**：Cargo + vendored Postgres 18.3 共享资源

### 为什么用 Rust 重写 Postgres？

作者在博客中指出了 Postgres 当前面临的核心问题：庞大而古老的 C 代码库使得内部改动风险极高。pgrust 的思路是：

> 保持 Postgres 的外部行为不变，保持真实的 Postgres 测试作为 oracle，用 Rust + AI 辅助编程来探索更深入的服务端改动。

这种策略既保留了 Postgres 多年积累的工程智慧，又为性能优化和功能实验打开了大门。

## 三、安装与快速开始

### 环境要求

**macOS：**

```bash
brew install icu4c openssl@3 libpq

export LIBRARY_PATH="$(brew --prefix openssl@3)/lib:${LIBRARY_PATH:-}"
export PKG_CONFIG_PATH="$(brew --prefix openssl@3)/lib/pkgconfig:$(brew --prefix icu4c)/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
export PATH="$(brew --prefix libpq)/bin:$PATH"
```

**Debian/Ubuntu：**

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libicu-dev libssl-dev \
  libldap2-dev libpam0g-dev postgresql-client-18
```

### 编译构建

```bash
PGRUST_PGSHAREDIR="$PWD/vendor/postgres-18.3/share" \
cargo build --release --locked --bin postgres
```

### 初始化并运行

```bash
# 初始化数据目录
target/release/postgres --initdb \
  -D /tmp/pgrust-data \
  -L "$PWD/vendor/postgres-18.3/share" \
  --no-locale --encoding UTF8 -U postgres

# 启动服务（需要较大的栈空间）
ulimit -s 65520
RUST_MIN_STACK=33554432 target/release/postgres \
  -D /tmp/pgrust-data -F \
  -c listen_addresses= -k /tmp -p 5432 \
  -c io_method=sync -c max_stack_depth=60000

# 连接测试
psql -h /tmp -p 5432 -U postgres -d postgres \
  -c "select version(), 1 + 1 as two"
```

### Docker 快速体验

```bash
docker run -d --name pgrust -e POSTGRES_PASSWORD=secret malisper/pgrust:v0.1 \
  && until docker exec -e PGPASSWORD=secret pgrust \
       psql -h 127.0.0.1 -U postgres -c '\q' >/dev/null 2>&1; do sleep 1; done \
  && docker exec -it -e PGPASSWORD=secret pgrust \
       psql -h 127.0.0.1 -U postgres; docker rm -f pgrust
```

### 运行回归测试

```bash
PGRUST_BIN="$PWD/target/release/postgres" \
scripts/run-regression
```

该脚本使用 pgrust 自身的 `--initdb` 加上 vendored 的 Postgres 18.3 测试文件，自动运行全套回归测试套件。

## 四、Roadmap 与未来方向

pgrust 正在推进以下特性：

- **多线程 Postgres 内核**：当前已从进程-per-连接迁移到线程-per-连接
- **内置连接池**：减少应用层连接管理的复杂度
- **更好的 JSON 负载支持**：优化 JSON-heavy 工作负载性能
- **快速 Fork/Branch 工作流**：支持数据库的即时克隆和分支
- **存储实验**：包括 no-vacuum 设计，减少后台维护开销
- **运行时安全护栏**：对坏查询和 AI 生成的 SQL 进行运行时保护
- **更稳定的执行计划**：减少突然的执行计划切换导致的性能抖动

## 五、总结

pgrust 是数据库领域一次令人兴奋的实验。它不是在 Postgres 外面套壳，而是真正用现代语言重写核心，同时保持与现有 Postgres 生态的完全兼容。对于需要 Postgres 兼容性又追求更高性能的场景，pgrust 值得关注。

项目目前尚非生产就绪，但已展现出极高的技术完成度。关注项目进展或加入 [Discord](https://discord.gg/FZZ4dbdvwU) 获取最新动态，也可以订阅 [pgrust.com](https://pgrust.com/#updates) 获取邮件更新。
