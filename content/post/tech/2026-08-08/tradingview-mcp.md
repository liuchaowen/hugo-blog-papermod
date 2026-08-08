---
title: "tradingview-mcp：把 TradingView 行情、技术与回测能力接入任意 AI 助手的 37 工具 MCP 服务器"
date: 2026-08-08
description: "tradingview-mcp 是一个 MIT 协议的 MCP 服务器，为 Claude、ChatGPT、Cursor 等任意 MCP 客户端提供实时行情、30+ 技术指标、多交易所筛选器与 9 套回测策略，无需 TradingView 账号，自托管永久免费。"
author: "Cheman"
slug: tradingview-mcp
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, MCP, 量化交易, AI, TradingView]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个非常实用的项目：**tradingview-mcp**，它把 TradingView 的实时行情、技术分析与回测能力打包成一套 MCP 服务器，让你用一句自然语言就能让 Claude、ChatGPT、Cursor 或 Copilot 帮你做选股、看盘和策略回测。

## 一、项目概述

tradingview-mcp 由 Atila Ahmettaner 维护，是一个面向 **AI 助手**的行情与量化分析 MCP 服务器（Model Context Protocol）。它的核心价值在于：把原本要在 TradingView 网页/桌面端手动点的操作，变成 AI 助手可直接调用的 37 个工具。

项目解决的核心问题是：

- **AI 助手没有实时市场数据**：LLM 本身没有行情，调用 MCP 工具后，AI 可以拿到实时价格、技术指标、新闻与情绪。
- **回测门槛高**：写 Pine Script 或在 Jupyter 里手搓回测脚本动辄几小时，而本项目内置 9 套策略 + 前向验证（walk-forward），一句话即可跑完。
- **多客户端通用**：只要支持 MCP 协议的客户端都能用，无需为每个 AI 单独开发适配器。

核心特性一览（部分）：

- 实时行情覆盖股票、加密、外汇、期货，横跨 Binance、KuCoin、NASDAQ/NYSE、EGX、BIST 等交易所；
- 30+ 技术指标 + 自研 ±3 布林带评级；
- 内置 9 套回测策略，支持 1d / 1h 周期、完整成交日志与资金曲线；
- Reddit 情绪 + Yahoo/MarketWatch/CNBC 实时新闻；
- 结构化错误信封（error envelope），便于程序化分支处理；
- 自托管永久免费（MIT），也有托管版（pro.cryptosieve.com）免运维。

> 注意：项目与 TradingView Inc. 无任何关联，不登录、不爬取、不自动化 TradingView 会话，行情来自公开端点，因此**不需要 TradingView 账号或 API Key**。

## 二、技术原理

### 架构设计

整个服务是一个基于 [FastMCP](https://modelcontextprotocol.com/) 的 Python 服务，对外暴露标准 MCP 协议（stdio / streamable-http）。从 README 的架构图与服务入口可以归纳出分层结构：

```
AI Client (Claude/ChatGPT/Cursor)
        │  MCP (stdio / http)
        ▼
tradingview-mcp server  (FastMCP)
   ├─ Technical Analysis  → tradingview-ta / tradingview-screener
   ├─ Yahoo Finance       → yahoo_price / market_snapshot (httpx async)
   ├─ Backtesting Engine  → pandas 计算 Sharpe/Calmar/Equity
   ├─ Sentiment & News     → Reddit + Marketaux / RSS
   └─ Resilience Layer     → retry + TTL cache + throttle
        │
        ▼
  公开市场数据端点 (Yahoo / TradingView / 交易所)
```

### 核心技术栈与选型理由

从 `pyproject.toml` 可以看到精确的依赖约束，作者的注释揭示了不少工程取舍：

```toml
dependencies = [
  "feedparser>=6.0.12",
  "httpx>=0.27",
  # 下限 1.14.0：server.py 用 from __future__ import annotations，
  # 注解以字符串形式传给 FastMCP。<=1.13.x 的 Tool.from_function
  # 会对字符串注解调用 issubclass 而崩溃，导致所有工具注册失败。
  "mcp[cli]>=1.14.0,<2",
  "requests>=2.32",
  # 锁定 ==3.0.0：3.2.0 会让空 Query() 默认走股票预设过滤，
  # 静默返回 0 行，破坏 crypto/futures 筛选。
  "tradingview-screener==3.0.0",
  "tradingview-ta>=3.3.0",
]
```

几个值得学习的点：

1. **`mcp[cli]>=1.14.0,<2`**：上限排除 2.x 是因为 2.x 移除了 `mcp.server.fastmcp` 模块；下限 1.14.0 是因为 `from __future__ import annotations` 让注解变成字符串，旧版 `Tool.from_function` 会 `issubclass()` 崩溃。这是典型的「依赖边界由运行时行为而非语义化版本决定」。
2. **`tradingview-screener==3.0.0` 锁版本**：上游 3.2.0 的默认预设会静默吞掉加密/期货扫描结果，因此必须 pin。注释还特意说明 Docker 构建用 `uv pip install --system .` 会忽略 `uv.lock`，所以开放区间会让重建漂移出 bug。
3. **Python 范围 `>=3.10,<3.14`**：因为 3.14 缺少预编译 pandas wheel，Windows 上 `uvx` 首次安装会回退源码构建导致超时（见 FAQ）。

### 关键设计：异步热路径与并发限流

在 May 2026 的更新中，作者对 7 个高流量工具（`yahoo_price`、`top_gainers`、`multi_timeframe_analysis`、`combined_analysis` 等）做了异步化。FastMCP 对同步工具是串行跑在事件循环上的，改成 `async def` 后能真正实现服务端内并发：

- `yahoo_price` / `stock_extended_hours` 用 `httpx.AsyncClient` 做真·非阻塞 I/O；
- 对仍依赖同步库（`tradingview_ta`、`tradingview-screener`、`feedparser`）的工具，用 `asyncio.to_thread` 卸载到线程池；
- `combined_analysis` 把 3 个子调用用 `asyncio.gather` 扇出，墙钟时间约提升 3×。

同时引入 **TA 限流层**：默认并发上限 4、启动间隔 ≥0.8s，防止 `combined_analysis` / `multi_timeframe_analysis` 的并行突发撞上 TradingView 的空响应限流悬崖，可通过环境变量调参。

### 数据流的韧性：重试 + TTL 缓存 + 错误信封

`screener` 提供方加了「自动重试 + 60 秒 TTL 缓存」，消除了 `combined_analysis` 上的瞬时 `Expecting value` JSON 解析错误。更重要的是**结构化错误信封**：

```json
{"error": {"code": "ALL_BATCHES_FAILED",
           "message": "All 5 batches failed; first error: JSONDecodeError(...)",
           "batches_attempted": 5, "batches_failed": 5,
           "first_error": "...", "retryable": true}}
```

这让调用方（人或程序）能区分「今天没信号」与「上游限流」，并据 `retryable` 决定是否等待重试。覆盖的工具包括 `top_gainers`、`bollinger_scan`、`volume_breakout_scanner` 等。

## 三、安装与快速开始

项目提供两种运行方式，37 个工具完全相同：自托管（免费）与托管版（按月付费、免运维）。

**方式一：pip 安装（最简）**

```bash
pip install tradingview-mcp-server
```

**方式二：从源码运行（uv）**

```bash
git clone https://github.com/atilaahmettaner/tradingview-mcp
cd tradingview-mcp
uv run tradingview-mcp
```

**接入 Claude Desktop**（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "/Users/YOUR_USERNAME/.local/bin/uvx",
      "args": ["--from", "tradingview-mcp-server", "tradingview-mcp"]
    }
  }
}
```

> macOS 的 GUI 应用（如 Claude Desktop）可能找不到 `~/.local/bin`，务必用 `uvx` 的**完整路径**。

**可选：情绪/新闻所需的免费 Marketaux Key**

```bash
export MARKETAUX_API_TOKEN=your_token_here   # 可选，免费 100 次/天
```

不填则 `financial_news` / `market_sentiment` 返回友好的「未配置」提示，其余工具照常工作。

## 四、使用方法与实战

配置好之后，直接对 AI 说自然语言即可：

```text
Show today's top crypto gainers on Binance
Run a full technical analysis of NVDA
What's the multi-timeframe read on gold?
Backtest an RSI strategy on BTC on the daily timeframe
```

**回测引擎示例** —— 一句话对比 9 套策略：

```text
Compare all 9 strategies on MSFT for 2 years
→ #1 triple_ema:        +15.1% | Sharpe:  0.0 | WR: 100%
→ #2 keltner_breakout:  +14.3% | Sharpe:  4.7 | WR:  40%
→ #3 bollinger:         +12.2% | Sharpe:  4.1 | WR:  64%
→ Buy & Hold:            -2.1%
```

9 套策略包括：`rsi`、`bollinger`、`macd`、`ema_cross`、`supertrend`、`donchian`，以及新增的 `rsi_pullback`（上升趋势中低吸）、`keltner_breakout`（ATR 归一化突破）、`triple_ema`（EMA 交叉 + SMA200 趋势过滤）。指标含胜率、总收益、Sharpe、Calmar、最大回撤、盈利因子、期望收益，并模拟真实手续费与滑点。

**前向验证（防过拟合）**：

```text
Run walk-forward backtest on supertrend for SPY
→ Verdict: ROBUST (avg robustness 0.92) | OOS return +8.5%
```

`walk_forward_backtest_strategy` 做 train/test 切分并给出 ROBUST / MODERATE / WEAK / OVERFITTED 判定，比单纯回测更可信。

**OpenClaw 集成**：项目还提供 SKILL.md + trading.py 包，可经 OpenClaw 网关把服务接到 Telegram / WhatsApp / Discord 等 20+ 聊天平台，无需 MCP 协议，直接 Python import 调用。

## 五、常见问题与解决方案

**Q1：Windows 首次启动报 `MCP error -32001: Request timed out`？**
原因：Python 3.14 尚未被支持，`uvx` 首次创建虚拟环境安装依赖时，MCP 栈的某些原生依赖没有 3.14 预编译 wheel，回退源码构建导致超时。
修复：在配置里把 `uvx` 固定到 3.13：

```json
{"mcpServers": {"tradingview": {
  "command": "uvx",
  "args": ["--python", "3.13", "--from", "tradingview-mcp-server", "tradingview-mcp"]
}}}
```

或先 `uv tool install --python 3.13 tradingview-mcp-server` 预热缓存。

**Q2：macOS 上 Claude Desktop 报 `command not found`？**
GUI 应用的 PATH 不含 `~/.local/bin`，需用 `uvx` 完整路径（见上文配置）。

**Q3：回测/筛选偶发 `Expecting value` 或空结果？**
这是上游 screener 的瞬时抖动。Resilience 层已加重试 + 60s TTL 缓存兜底；若为限流，错误信封 `retryable:true`，等待后重试即可。

**Q4：新闻/情绪工具返回 count: 0？**
旧版 Reuters RSS 已 deprecated，现已切换到 Yahoo/MarketWatch/CNBC，并需配置免费的 `MARKETAUX_API_TOKEN` 才启用 `financial_news` / `market_sentiment`。

## 六、总结

tradingview-mcp 把一个原本分散、高门槛的「行情 + 技术面 + 回测」工作流，用 MCP 协议封装成了 AI 助手开箱即用的 37 个工具，对量化爱好者、独立开发者和想用自然语言做市场研究的用户都非常有价值。其依赖约束的精细注释、异步热路径改造、结构化错误信封与防过拟合的前向验证，也体现出相当成熟的工程素养。自托管 MIT 永久免费，值得一试。

> ⚠️ 免责声明：本项目仅用于教育与研究，不构成任何投资建议。交易有风险，决策需自行负责。
