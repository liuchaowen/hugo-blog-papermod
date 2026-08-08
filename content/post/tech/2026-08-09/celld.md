---
title: "celld：Deno 官方开源的自托管分布式 Durable Objects 运行时"
date: "2026-08-09"
description: "celld 是 Deno 官方开源的 daemon，可将 Cloudflare Workers 和 Durable Objects 运行在你自己的机器上。每个对象都是一个独立的 SQLite 数据库，通过 S3 兼容存储桶实现去中心化协调，无需控制平面或共识协议。"
author: "Cheman"
slug: celld
draft: false
categories: ["技术", "开源"]
tags: ["Deno", "分布式系统", "Durable Objects", "Cloudflare Workers", "SQLite", "Rust"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**celld**，来自 Deno 官方团队——一个可以让 Cloudflare Workers 和 Durable Objects 运行在你自己的基础设施上的开源 daemon。每个对象天然是一个独立的 SQLite 数据库，通过 S3 兼容存储桶实现节点协调，既没有控制平面，也不需要共识协议。

## 一、项目概述

celld（Cell Daemon）由 Deno Land 官方团队开源，定位是 **Self-hosted, distributed Durable Objects**。它的核心思路非常优雅：

- **每个 Cell（对象） = 一个 SQLite 数据库**：应用天然按对象分片，彻底消除了共享数据库的竞争问题和故障爆炸半径。
- **S3 作为唯一的协调层**：所有节点通过同一个 S3 存储桶读写部署对象、Cell 状态和租约记录，无需任何注册中心或服务发现。
- **对象存储 CAS（Compare-And-Swap）保证唯一所有权**：同一时刻只有一个节点拥有某个 Cell，不依赖成员协议、故障检测器或共识服务。
- **节点可随时替换**：持久化真相在 S3 存储桶中，节点是无状态的。

从架构上看，celld 非常适合需要强隔离性的多租户场景，或是想摆脱云厂商锁定、但在本地运行 Workers 逻辑的团队。

## 二、技术原理

### 2.1 核心架构

celld 节点内部嵌入了 **V8 JavaScript 引擎**和 **Wrangler 运行时**，可以直接执行 Workers 代码包。节点之间没有直接的 RPC，而是通过 S3 存储桶中的租约记录（lease）来协调所有权。

```toml
# crates/celld/protocol.rs 中定义的核心协议对象
# 每个 cell 的状态和租约信息都存储在 S3 中
[deployments]
deployment_objects = "Versioned object-storage protocol in crates/celld/protocol.rs"
```

Fleet（集群）中的第一个节点会在存储桶中创建 `fleet/peer-auth.json`，后续所有节点间的 HTTP 请求都经过 **HMAC 认证、时钟界限校验和重放保护**，这在部署文档中被反复强调：S3 存储桶和凭证就是集群管理员权限。

### 2.2 节点租约与故障恢复

当一个节点宕机时，其持有的 Cell 租约会自动过期，其他节点可以通过相同的 S3 协议重新获取该 Cell 的所有权，并从存储桶中恢复该 SQLite 数据库文件继续执行。

```sh
# 通过 celld diagnose 命令查看集群状态
celld diagnose --bucket s3://my-cells-bucket
```

celld 在压力下（内存、CPU、Cell 数量达到水位线）会执行以下策略：

- **Durably replicate + fence** 最久未使用的空闲 Cell
- **Publish them as unowned**，不重置其 epoch
- **拒绝获取新的 unowned Cell**，直到低水位线到达

关键设计：活跃有工作或持有 WebSocket 连接的 Cell 不会被驱逐。

### 2.3 构建优化

从 `Cargo.toml` 可以看出项目的性能优化策略：

```toml
# 发布的优化配置：Fat LTO + Panic=Abort + Strip
[profile.release]
lto = "fat"
codegen-units = 1
opt-level = "s"  # 权衡 binary size
panic = "abort"
strip = true
```

开发循环使用 `lab` profile，继承 release 的大部分优化但关闭 fat LTO，保持增量编译加速。

### 2.4 Docker 构建

Dockerfile 采用了多阶段构建：

```dockerfile
FROM rust:1.97.1-bookworm AS build
ARG CELLD_PROFILE=release
RUN cargo build --profile "${CELLD_PROFILE}" --locked -p celld

FROM build AS test
RUN cargo test --release --locked && cargo clippy --release --locked -- -D warnings
```

测试阶段在构建阶段之后执行，任何引擎测试或 lint 失败都会阻断发布流程。

## 三、安装与快速开始

### 3.1 环境要求

- Linux x86-64 或 ARM64（Docker 支持）
- S3 兼容存储桶（支持 R2、MinIO、COS 等）
- AWS 标准凭证（环境变量或 `~/.aws/credentials`）
- Worker 项目需要 `esbuild` 在 PATH 中

### 3.2 一键安装

```sh
curl -fsSL https://celld.dev/install.sh | sh
# 安装后验证
celld --version
```

安装脚本会从 GitHub 下载经过 **GH Attestation 可验证 provenance** 的发布版本，确保二进制来源可信。

### 3.3 Docker 快速运行

```sh
docker volume create celld-state

docker run --rm --network host \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_SESSION_TOKEN \
  -e CELLD_WATCH=/var/lib/celld/state \
  -v celld-state:/var/lib/celld \
  ghcr.io/denoland/celld \
  --bucket s3://my-cells-bucket \
  --endpoint https://ACCOUNT.r2.cloudflarestorage.com \
  --region auto \
  --listen 0.0.0.0:8080 \
  --advertise node-a.internal:8080
```

### 3.4 本地二进制运行

```sh
# 部署 Worker 项目
celld deploy . --bucket s3://my-cells-bucket

# 启动节点
celld \
  --bucket s3://my-cells-bucket \
  --listen 0.0.0.0:8080 \
  --advertise 10.0.0.12:8080
```

## 四、使用方法与实战

### 4.1 部署 Worker 项目

celld 接受标准 Wrangler 配置的子集，可以共部署静态资源：

```sh
celld deploy ./my-worker \
  --bucket s3://my-cells-bucket \
  --endpoint https://ACCOUNT.r2.cloudflarestorage.com \
  --region auto
```

### 4.2 集群水位线管理

在高负载场景下设置 Cell 数量限制：

```sh
CELLD_MAX_RESIDENT_CELLS=1000 \
CELLD_RESIDENT_LOW_WATER=800 \
celld --bucket s3://my-cells-bucket --listen 0.0.0.0:8080 \
  --advertise node-a.internal:8080
```

Linux 额外支持进程内存和 CPU 触发：

```sh
CELLD_MAX_RSS_MB=2048 CELLD_MAX_CPU_PERCENT=80 celld ...
```

### 4.3 网络安全注意事项

官方明确要求：节点间的 HTTP 通信**不终止 TLS**。所有 advertises 地址必须位于可信私有网络，或通过 WireGuard / Tailscale 等加密覆盖层暴露。直接暴露公网 IP 会被拒绝（除非明确传入 `--unsafe-public-advertise`）。

## 五、常见问题与解决方案

**Q: 部署 Worker 时报 `esbuild not found`？**  
确保 `esbuild` 在 PATH 中。如果只部署纯静态资源则无需 esbuild。

**Q: 节点之间无法互相发现？**  
检查所有节点的 `--advertise` 地址是否可互相访问，且在私有网络或加密隧道内。celld 拒绝不可达或公网不安全的 advertise 地址。

**Q: 存储桶访问报 403 错误？**  
确认节点进程持有对存储桶的读写权限（CELLD_WATCH 目录对应权限），且节点使用相同的 S3 端点和凭证。

**Q: Cell 状态丢失？**  
celld 的设计原则是 S3 为持久化真相来源。如果节点在 Cell 未完全持久化时崩溃，该 Cell 的租约会在 TTL 后过期，其他节点会接管并从最后一次持久化的状态恢复。

**Q: 贡献代码被拒绝 PR？**  
celld 明确禁用 Pull Requests——原因是 AI 工具发送的大规模低上下文 PR 对维护者的时间消耗大于节省。有意贡献者需要先理解代码，发送 git format-patch 到 `ry@deno.com`，并签署 CLA。

## 六、总结

celld 带来了一个非常有趣的基础设施思路：用**对象存储的 CAS** 替代传统共识协议，实现去中心化的分布式 Durable Objects。对比传统的共享数据库方案，它从根本上消除了竞争和故障爆炸半径；对比 Kubernetes StatefulSet 等方案，它无需控制平面，运维更简单。Rust + V8 + SQLite 的技术栈保证了高性能和强隔离性。

对于想在本地或私有云运行 Cloudflare Workers 逻辑、摆脱平台锁定的团队，celld 是一个值得关注的项目。了解更多可以访问 [celld.dev](https://celld.dev) 或阅读官方文档。
