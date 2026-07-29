---
title: "Nowhere：一个端口同时支持 TCP 与 UDP 传输的开源中继工具"
date: "2026-07-29"
description: "Nowhere 是一个用 Rust 编写的加密中继工具，通过单一服务端口同时支持 TLS/TCP 和 QUIC/UDP 两种传输方式，并允许上传和下载方向独立选择不同传输载体。"
author: "Cheman"
slug: nowhere
draft: false
categories: ["技术", "开源", "网络"]
tags: ["Rust", "网络编程", "QUIC", "TLS", "开源", "代理工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Nowhere**，一个用 Rust 编写的加密中继工具，核心亮点在于——在同一服务端口上同时支持 TLS/TCP 和 QUIC/UDP 两种传输方式，并且**上传和下载方向可以独立选择不同的传输载体**。

## 一、项目概述

Nowhere（GitHub：[NodePassProject/Nowhere](https://github.com/NodePassProject/Nowhere)）将 TLS/TCP 和 QUIC/UDP 整合到单一服务端口，共享同一套监听地址、证书凭证和生命周期管理。其核心设计哲学是**方向解耦**：传统代理工具的上下行必须使用同一种传输协议，而 Nowhere 允许上传（up）和下载（down）方向分别选择最优载体。

### 核心特性一览

- **单一服务端口**：TLS/TCP 与 QUIC/UDP 共用同一端口，简化运维
- **方向独立选择**：上行/下行可分别选择 TCP 或 UDP，灵活适配不同网络环境
- **高效数据路径**：32 字节连接认证帧 + 5 字节流头，协议开销极低
- **热路径优化**：零拷贝解码、可复用缓冲区、预热 TLS 通道
- **生产级功能**：方向限速、SOCKS5 出站、证书热重载、优雅关闭

## 二、技术原理

### 架构设计：Portal 与 Vector 双组件

Nowhere 包含两个核心组件：

- **`portal://`**：部署在服务端，接受加密载体并转发到目标端点
- **`vector://`**：部署在客户端，连接 Portal 并暴露本地 SOCKS5 代理

```
Client (Vector)                          Server (Portal)
     │                                        │
     │  TLS/TCP 或 QUIC/UDP 连接              │
     │ ─────────────────────────────────────► │
     │                                        │
     │  SOCKS5 本地代理                        │
     ▼                                        ▼
[本地应用]                              [目标服务]
```

### 传输方向矩阵

通过 Vector 的 `up` 和 `down` 参数独立选择上下行载体：

| 向量模式 | 上传 | 下载 |
|---------|------|------|
| `tcp/tcp` | TLS/TCP | TLS/TCP |
| `tcp/udp` | TLS/TCP | QUIC/UDP |
| `udp/tcp` | QUIC/UDP | TLS/TCP |
| `udp/udp` | QUIC/UDP | QUIC/UDP |

当 `net=mix`（默认）时，同一端口同时接受 TCP 和 UDP 载体；`net=tcp` 或 `net=udp` 可限制为单一协议。

### QUIC 与 TLS 承载机制

- **TCP 流量**：QUIC 载体通过双向流（bidirectional stream）传输
- **UDP 流量**：
  - TLS/TCP 载体使用长度前缀的 UoT（UDP over TLS/TCP）封装
  - QUIC 载体使用原生 DATAGRAM 帧

### 源码解读：Cargo.toml 依赖栈

```toml
[dependencies]
quinn = { version = "0.11.9", default-features = false, features = ["bloom", "log", "runtime-tokio", "rustls-ring"] }
rustls = { version = "0.23", default-features = false, features = ["ring", "std"] }
tokio = { version = "1.48", features = ["macros", "rt-multi-thread", "net", "io-util", "time", "sync", "signal"] }
```

选用 `quinn`（QUIC 协议栈）+ `rustls`（TLS 实现）+ `tokio`（异步运行时），均为 Rust 生态中经过大量生产验证的库。

### 连接认证机制

认证通过 TLS Exporter 绑定到每个 TLS 或 QUIC 连接：

```rust
// 认证帧结构（32 字节）
// 由 HMAC-SHA256 保护，确保会话不被劫持
```

多个流和 UDP 流共享一个 QUIC 连接，`tcp/tcp` 模式则维护一个 TLS 预热连接池（warm pool），减少握手延迟。

## 三、安装与快速开始

### 环境要求

- Rust 工具链（stable，Edition 2024）
- Linux/macOS/Windows

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/NodePassProject/Nowhere.git
cd Nowhere

# 编译发布版本
cargo build --release --locked
```

### 最简运行示例

**1. 启动本地 Portal**（监听 `127.0.0.1:2077`）：

```bash
./target/release/nowhere 'portal://change-me@127.0.0.1:2077'
```

**2. 启动 Vector**（上下行均使用 TLS/TCP，预热 5 条连接）：

```bash
./target/release/nowhere \
  'vector://change-me@127.0.0.1:2077?up=tcp&down=tcp&pool=5&socks=127.0.0.1:1080'
```

**3. 混合模式**（上行 QUIC/UDP，下行 TLS/TCP）：

```bash
./target/release/nowhere \
  'vector://change-me@127.0.0.1:2077?up=udp&down=tcp&socks=127.0.0.1:1080'
```

本地示例中省略了 `sni` 参数（禁用了证书验证）。在公网部署时，需安装 CA 信任的证书或使用证书固定（`pin`）：

```bash
# 使用 CA 证书并启用严格验证
nowhere 'portal://change-me@:2077?tls=2&crt=/etc/nowhere/cert.pem&key=/etc/nowhere/key.pem'
nowhere 'vector://change-me@relay.example:2077?sni=relay.example&socks=127.0.0.1:1080'

# 使用证书固定（优先级高于 SNI 验证）
nowhere 'vector://change-me@relay.example:2077?pin=<CERT_SHA256>&socks=127.0.0.1:1080'
```

## 四、使用方法与进阶配置

### 基础用法

Vector 启动后会在本地 `socks` 参数指定地址暴露 SOCKS5 代理，可直接在浏览器或命令行工具中配置使用：

```bash
# curl 通过 SOCKS5 代理访问
curl -x socks5://127.0.0.1:1080 https://example.com

# 浏览器配置 SOCKS5 代理
# 127.0.0.1:1080
```

### 方向选择策略

不同网络环境下上下行载体选择建议：

- **高延迟高丢包上行环境**（如卫星链路）：`up=tcp` + `down=udp`，下行走 QUIC/UDP 利用其丢包恢复能力
- **对称优质网络**：`udp/udp` 最大化 QUIC 性能
- **企业防火墙限制**：`tcp/tcp` 确保全链路可通

### 配置参考

| 参数 | 说明 | 示例 |
|------|------|------|
| `up` | 上行载体 | `tcp` / `udp` |
| `down` | 下行载体 | `tcp` / `udp` |
| `pool` | TLS 预热连接数 | `5` |
| `socks` | 本地 SOCKS5 监听地址 | `127.0.0.1:1080` |
| `sni` | 服务器 SNI 名称 | `relay.example` |
| `pin` | 证书 SHA256 指纹 | `abc123...` |
| `net` | 协议限制 | `mix` / `tcp` / `udp` |
| `tls` | TLS 验证级别 | `0`（跳过）/ `1`（可选）/ `2`（必须）|

## 五、常见问题与解决方案

### Q1: 连接建立失败，提示 `TLS handshake timeout`

检查服务端 Portal 是否正常运行，以及防火墙是否放行了对应端口。公网部署时确认证书路径正确：

```bash
# 验证证书文件可读
ls -la /etc/nowhere/cert.pem /etc/nowhere/key.pem
```

### Q2: Vector 无法连接，但 Portal 运行正常

本地示例中默认 `sni` 未设置，若服务端启用了严格证书验证，需配置 `pin`（证书指纹）或 `sni`：

```bash
# 从 Portal 输出中获取 CERT_SHA256
# 在 Vector 端添加 pin 参数
nowhere 'vector://...@relay.example:2077?pin=<CERT_SHA256>&socks=127.0.0.1:1080'
```

### Q3: UDP 流量无法通过

确认系统内核支持 UDP，且 `net=mix` 或 `net=udp` 模式下服务端未限制 UDP。QUIC 依赖 UDP 端口，确保防火墙放行目标 UDP 端口。

### Q4: 性能不如预期

- 调整 `pool` 参数增加预热连接数，减少首次连接握手延迟
- 对于 UDP 优先场景，确认客户端和服务端均使用 `udp` 方向

## 六、总结

Nowhere 的设计思路非常有创意——通过将传输层的"方向"维度解耦出来，让上下行可以独立选择最优载体，这在跨运营商、跨国或混合网络环境下有很强的实用价值。代码层面选用 Rust + Quinn + Rustls 的组合，在保证内存安全的同时实现了极低的协议开销，适合对性能和安全性都有较高要求的场景。

目前项目采用 GPLv3 开源协议，如果你对 QUIC、TLS 或现代网络代理架构感兴趣，这个项目值得研究。
