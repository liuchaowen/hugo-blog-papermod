---
title: "Polymarket-5min-bot：Polymarket 5分钟预测市场套利机器人"
date: 2026-08-01
description: "一个用 Rust 编写的 Polymarket 加密货币涨跌预测市场套利机器人，通过监控订单簿实时发现 YES+NO 价差套利机会，支持自动化交易与风险控制。"
author: "Cheman"
slug: polymarket-5min-bot
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "区块链", "套利", "预测市场", "Polymarket"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Polymarket-5min-bot**，这是一个用 Rust 编写的 Polymarket 预测市场套利机器人，专门针对 5 分钟加密货币涨跌市场，通过实时监控 YES/NO 代币价差实现无风险套利。

## 一、项目概述

Polymarket-5min-bot 是一个针对 Polymarket 平台上加密货币"涨或跌"5 分钟预测市场的自动化套利工具。其核心原理在于：在预测市场中，同时持有等量的 YES 和 NO 代币可以在结算时兑换 1 USDC，因此当 `YES 最低卖价 + NO 最低卖价 < 1` 时，就存在套利空间。

### 核心特性

- **实时套利监控**：订阅 CLOB 订单簿，实时追踪 YES + NO 组合价格
- **自动化执行**：当价差达到阈值时自动买入 YES 和 NO，配置化控制滑点和仓位限制
- **风险控制**：支持最大敞口限制、定时合并、收市前自动平仓
- **多币种支持**：可配置监控 BTC、ETH、SOL、XRP 等多个交易对

## 二、技术原理

### 架构设计

项目采用 Rust 异步运行时 Tokio 构建高并发交易引擎，核心模块包括：

```
┌─────────────────────────────────────────────────────┐
│                  Main Event Loop                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Market     │  │  OrderBook  │  │  Arbitrage  │ │
│  │  Discovery  │──│  Monitor    │──│  Executor   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │                │                │         │
│         ▼                ▼                ▼         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Gamma API  │  │  CLOB WS    │  │  On-chain   │ │
│  │  (Markets)  │  │  (Orders)   │  │  Merge      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 核心技术栈

从 `Cargo.toml` 可以看出项目选型：

```toml
[dependencies]
polymarket-client-sdk = { version = "0.4.1", features = ["clob", "ctf", "data", "gamma", "ws", "tracing"] }
polymarket-client-sdk-v2 = { version = "0.6.0-canary.1", features = ["clob"] }
tokio = { version = "1.49", features = ["full"] }
alloy = { version = "1.3", features = ["signer-local", "signers", "providers", "contract"] }
ratatui = "0.29"
```

- **polymarket-client-sdk**：官方 SDK，提供 CLOB 交易、WebSocket 订阅、链上交互
- **tokio**：异步运行时，支持高并发订单监控和执行
- **alloy**：以太坊交互库，用于签名交易和合约调用
- **ratatui**：终端 UI，提供实时交易仪表盘

### 套利算法核心逻辑

```rust
// 简化的套利判断逻辑
fn check_arbitrage(yes_ask: Decimal, no_ask: Decimal, spread: Decimal) -> bool {
    yes_ask + no_ask <= Decimal::ONE - spread
}

// 执行套利：同时买入 YES 和 NO
async fn execute_arbitrage(&self, size: Decimal) -> Result<()> {
    let yes_order = Order::new(OrderSide::Buy, size, self.yes_price);
    let no_order = Order::new(OrderSide::Buy, size, self.no_price);
    
    // 并行下单
    let (yes_result, no_result) = tokio::join!(
        self.clob_client.place_order(yes_order),
        self.clob_client.place_order(no_order)
    );
    
    // 检查双方都成交
    match (yes_result, no_result) {
        (Ok(_), Ok(_)) => self.merge_tokens().await,
        _ => self.rollback().await,
    }
}
```

### 数据流分析

1. **市场发现**：通过 Gamma API 获取当前活跃的 5 分钟涨跌市场
2. **订单订阅**：通过 CLOB WebSocket 实时订阅 YES/NO 代币订单簿
3. **价差计算**：实时计算 `yes_best_ask + no_best_ask`，低于 `1 - spread` 时触发套利
4. **执行下单**：通过 CLOB API 同时买入 YES 和 NO
5. **链上合并**：调用 CTF Exchange 合约将 YES+NO 合并为 USDC

## 三、安装与快速开始

### 环境要求

- Rust 1.70+（推荐通过 rustup 安装）
- Polymarket 账户（需要私钥和 Proxy 地址）

### 方式一：使用预编译二进制

从 [Releases](https://github.com/crazygirl437/Polymarket-5min-bot/releases/tag/V.10) 下载对应平台的可执行文件：

```bash
# Linux / macOS
./polypulse

# Windows
polypulse.exe
```

### 方式二：从源码构建

```bash
git clone https://github.com/crazygirl437/Polymarket-5min-bot
cd Polymarket-5min-bot
cp .env.example .env
# 编辑 .env 填入私钥和配置
cargo run --release
```

### 必需配置项

```bash
# .env 核心配置
POLYMARKET_PRIVATE_KEY=your_private_key        # 签名私钥
POLYMARKET_PROXY_ADDRESS=0x...                  # Polymarket Settings 中的 Funder 地址
SIGNATURE_TYPE=Poly1271                         # 默认使用 V2 存款钱包签名

# Builder API（合并代币需要）
POLY_BUILDER_API_KEY=...
POLY_BUILDER_SECRET=...
POLY_BUILDER_PASSPHRASE=...
```

**获取私钥**：
- Email/Magic 注册：访问 [reveal.magic.link/polymarket](https://reveal.magic.link/polymarket)
- 浏览器钱包：导出 EOA 私钥

**获取 Proxy 地址**：登录 [polymarket.com/settings](https://polymarket.com/settings)，复制 Funder 地址

## 四、使用方法与实战

### 基础用法

启动后会显示 TUI 仪表盘：

```
┌──────────────────────────────────────────────────────────┐
│  Polymarket 5min Bot - Dashboard                         │
├──────────────────────────────────────────────────────────┤
│  BTC/USD  │  YES: 0.52  │  NO: 0.45  │  Spread: -3.0%    │
│  ETH/USD  │  YES: 0.48  │  NO: 0.49  │  Spread: -3.0%    │
├──────────────────────────────────────────────────────────┤
│  Positions: BTC YES=50, NO=50  │  PnL: +$2.50            │
│  Last Trade: 12:01:35 BTC arb @ 0.97                     │
└──────────────────────────────────────────────────────────┘
```

### 常用配置参数

```bash
# 监控币种（逗号分隔）
CRYPTO_SYMBOLS=btc,eth,sol,xrp

# 套利触发阈值（YES+NO <= 1-spread 时执行）
ARBITRAGE_EXECUTION_SPREAD=0.01

# 单笔最大交易金额
MAX_ORDER_SIZE_USDC=100.0

# 单轮最大敞口
RISK_MAX_EXPOSURE_USDC=1000.0

# 定时合并间隔（分钟，0=禁用）
MERGE_INTERVAL_MINUTES=5

# 收市前自动平仓（分钟，0=禁用）
WIND_DOWN_BEFORE_WINDOW_END_MINUTES=1
```

### 进阶策略：收市前自动平仓

```bash
# 在窗口结束前 1 分钟自动：
# 1. 取消未成交订单
# 2. 合并 YES+NO → USDC
# 3. 市价卖出单边持仓
WIND_DOWN_BEFORE_WINDOW_END_MINUTES=1
```

### 风险控制示例

```bash
# 最大敞口 $500，单笔 $50，阈值 2%
RISK_MAX_EXPOSURE_USDC=500.0
MAX_ORDER_SIZE_USDC=50.0
ARBITRAGE_EXECUTION_SPREAD=0.02

# 每 10 分钟强制合并持仓
MERGE_INTERVAL_MINUTES=10
```

## 五、常见问题与解决方案

### Q1: 订单失败提示 "please use the deposit wallet flow"

**原因**：签名类型配置错误

**解决**：将 `SIGNATURE_TYPE` 改为默认的 `Poly1271`：

```bash
SIGNATURE_TYPE=Poly1271
```

### Q2: 合并代币失败

**原因**：缺少 Builder API 凭证

**解决**：
1. 访问 Polymarket → Settings → Builder 获取 API Key/Secret/Passphrase
2. 配置 `.env`：

```bash
POLY_BUILDER_API_KEY=xxx
POLY_BUILDER_SECRET=xxx
POLY_BUILDER_PASSPHRASE=xxx
```

### Q3: 套利执行后仍有亏损

**可能原因**：
1. **滑点过大**：降低 `MAX_ORDER_SIZE_USDC`
2. **价差计算未考虑手续费**：提高 `ARBITRAGE_EXECUTION_SPREAD`
3. **单边成交失败**：启用 `WIND_DOWN` 自动处理单边持仓

### Q4: WebSocket 连接断开

**解决**：项目内置自动重连机制，检查网络代理配置：

```bash
# 如需代理
HTTPS_PROXY=http://127.0.0.1:7890
```

### Q5: 如何查看交易日志

```bash
# 启用 debug 日志
RUST_LOG=debug

# 查看实时日志
tail -f logs/polypulse.log
```

## 六、总结

Polymarket-5min-bot 展示了预测市场套利的完整技术实现，从市场发现、订单监控、套利执行到链上合并，每个环节都有清晰的模块化设计。项目使用 Rust 保证高性能和内存安全，通过异步编程实现多市场并行监控，结合 TUI 提供实时交易可视化。

**技术亮点**：
- 基于 YES+NO 代币定价理论的无风险套利策略
- 完整的风险控制体系（敞口限制、定时合并、收市平仓）
- 支持多种签名类型（EOA、Magic、Gnosis Safe）

**风险提示**：此机器人连接真实市场与资金，使用前请充分理解 Polymarket 规则和潜在风险，做好资金管理。

> 项目地址：[https://github.com/crazygirl437/Polymarket-5min-bot](https://github.com/crazygirl437/Polymarket-5min-bot)
