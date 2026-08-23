---
title: "同花顺 Financial-API：面向 AI Agent 与量化研究的 A 股金融数据服务"
date: 2026-08-23
description: "HiThink-Tech/Financial-API 是同花顺官方维护的 A 股金融数据服务，通过统一 API Key 即可在 REST API、托管 MCP、CLI、Python SDK 与本地 DuckDB 之间自由切换，覆盖行情、财务、估值、集合竞价、龙虎榜等数据，特别适合 AI Agent、量化研究者与开发者接入。"
author: "Cheman"
slug: financial-api
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 金融数据, A股, 量化交易, AI Agent, MCP]
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

今天在 GitHub Trending 上看到一个有意思的项目：**同花顺金融数据服务（HiThink-Tech/Financial-API）**。它把同花顺官方的 A 股数据能力打包成一套统一的接入体系，让 AI Agent、量化研究者和应用开发者用同一个 API Key 就能拿到行情、财务、估值、集合竞价、龙虎榜等全维度数据。

## 一、项目概述

同花顺金融数据服务（项目内部代号 `hithink-finance`）由同花顺官方提供并维护，定位是"面向 AI Agent、量化研究者和应用开发者的 A 股金融数据服务"。它解决的核心痛点是：**金融数据散落在不同系统、接入方式割裂、Agent 难以稳定调用真实数据**。

该项目的最大特色是"一套数据、多种入口"。通过申请一个统一的 API Key，你可以：

- 查询 A 股最新行情、集合竞价、历史 K 线、财务报表、估值快照；
- 获取指数、板块、公募基金资料与净值、涨停跌停池、炸板池、连板天梯、个股异动、热榜和龙虎榜等特色数据；
- 把数据接入 AI 工具（Claude、Cursor、Windsurf 等）、Python 研究脚本、量化程序或业务系统。

数据能力的接入方式覆盖 API、MCP、CLI、Python SDK、本地 DuckDB 数据库和统一的 Agent Skill，构成了完整的"取数—研究—落地"闭环。

## 二、技术原理

### 统一 API Key 与多端共享

所有远端接入方式（REST API、MCP、CLI、Python 远端取数）共用同一个 API Key，推荐保存为用户级环境变量 `HITHINK_FINANCE_API_KEY`。Skill 也能读取用户级的 `credentials.env`，避免把密钥写入代码或日志。这套设计把"认证"从各个接入点中抽离出来，降低了多端切换的摩擦。

### 六类接入方式的职责划分

项目按使用场景把接入方式做了清晰切分，本质上是把"数据能力"与"执行环境"解耦：

| 接入方式 | 适用场景 | 技术形态 |
| --- | --- | --- |
| `hithink-finance` Skill | AI Agent 自动取数 | 统一的 Agent 说明书，自动在 API/MCP/CLI/SDK 间选型 |
| 托管 MCP | Claude、Cursor 等聊天工具 | 4 个 HTTP MCP 服务（a-share / a-share-index / meta / fund） |
| REST API | 网站、App、后台系统 | 标准 HTTP 接口，零语言依赖 |
| CLI | 终端批量查询、下载、导出 | Node.js 实现，整合远端取数、本地库、JSON 输出 |
| Python SDK | Notebook、研究脚本、二次开发 | `python/toolkit/fuyao` 远端 client + `marketdb` 本地库 |
| marketdb | 长期保存历史行情并用 SQL 研究 | 本地 DuckDB，自动初始化、增量同步、复权计算 |

### 大结果落盘与上下文控制

针对量化研究中"全市场、多年、多标的"的大批量数据，项目要求必须落盘，只在对话中返回文件路径、行数和摘要。这一设计既避免了 Agent 上下文膨胀，也降低了终端/日志泄露数据的风险——是典型的"AI 友好型"API 架构。

### 真实数据优先原则

README 中反复强调：请求未支持的数据（分钟 K、tick、海外行情、宏观、新闻研报原文等）时，应明确说明，**不使用模拟数据或静态示例冒充真实结果**。这种对数据真实性的刚性约束，对金融场景尤为关键。

## 三、安装与快速开始

### 1. 获取统一 API Key

登录[同花顺金融数据服务官网](https://fuyao.aicubes.cn/)，在 [API Key 管理](https://fuyao.aicubes.cn/admin/)创建 Key。推荐保存为环境变量：

```bash
export HITHINK_FINANCE_API_KEY="你的_API_Key"
```

### 2. 安装 `hithink-finance` Skill（推荐优先）

Skill 是 Agent 使用本项目的统一入口，包含接入方式选择、API 契约镜像、安全合规要求等。优先通过 `npx skills add` 安装：

```bash
npx skills add HiThink-Tech/Financial-API --skill hithink-finance -g --yes
```

### 3. CLI 安装与验证

CLI 由 Node.js 实现，不依赖 Python 运行时，优先从 npm 安装（国内可用 npmmirror 镜像加速）：

```bash
npm install -g @hithink-tech/hithink-finance-cli

# 安全录入 API Key
hithink-finance auth login

# 查看当前版本支持的能力目录（机器可读 JSON）
hithink-finance capabilities --format json
```

### 4. Python SDK 安装

```bash
python -m pip install -e ./python
```

## 四、使用方法与实战

### 场景一：查询单只股票最新行情

先用标的检索把名称消歧为唯一 `thscode`（如贵州茅台 = `600519.SH`），再查行情。

通过 CLI：

```bash
# 根据代码或名称查找股票，确认唯一 thscode
hithink-finance symbol search --q 600519 --limit 5 --format json

# 查询最新行情
hithink-finance market snapshot --thscodes 600519.SH --format json
```

通过 REST API（任意语言均可）：

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH' \
  -H 'X-api-key: <API_KEY>'
```

### 场景二：让 Claude / Cursor 通过 MCP 直接取数

把以下 4 个托管端点配置到支持 MCP 的客户端（服务名用 `hithink-finance-*`）：

```json
{
  "mcpServers": {
    "hithink-finance-a-share": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    },
    "hithink-finance-a-share-index": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share-index",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    },
    "hithink-finance-meta": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/meta",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    },
    "hithink-finance-fund": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/fund",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    }
  }
}
```

四个服务分别覆盖：A 股行情/财务/特色数据、指数与板块、标的检索与能力发现、公募基金全维度数据。

### 场景三：在本地 DuckDB 中做历史研究

marketdb 会在本地构建并维护 DuckDB 数据库，适合长期保存历史行情并用 SQL 研究：

```bash
# 初始化本地数据库
python python/bootstrap.py

# 查询贵州茅台最近十个交易日的前复权收盘价
marketdb query \
  --json \
  --db data/market.duckdb \
  --sql "SELECT date, close
         FROM v_daily_qfq
         WHERE thscode='600519.SH'
         ORDER BY date DESC
         LIMIT 10"
```

### 场景四：查询上市公司财务数据

```bash
# 最近四期利润表
hithink-finance financials income --thscode 600519.SH --limit 4 --format json
```

## 五、常见问题与解决方案

**Q1：没有 API Key 能用吗？**
不能。所有远端方式都需要统一的 API Key，需先在官网注册并创建 Key，再配置为环境变量或凭据文件。

**Q2：npm 安装 CLI 慢或失败怎么办？**
国内用户可使用 npmmirror 镜像加速：`npm install -g @hithink-tech/hithink-finance-cli --registry=https://registry.npmmirror.com`。

**Q3：如何确认当前 CLI 支持哪些能力？**
运行 `hithink-finance capabilities --format json` 获取机器可读的能力目录；排查参数变化时再读取 MCP 的 `tools/list`。

**Q4：分钟 K、tick、海外行情查不到？**
这些数据目前不在公开能力范围内。项目明确要求：请求未支持的数据时应明确告知，不要使用模拟数据冒充真实结果。

**Q5：大批量数据把对话上下文撑爆了？**
全市场、多年、多标的等大数据必须落盘（用 CLI / Market Dumps），只在对话中返回文件路径、行数和摘要。

**Q6：API Key 安全如何保障？**
Key 只能通过安全输入、用户级环境变量、凭据文件、stdin 或系统凭据库传入；严禁写入代码、README、Issue、日志或 Git commit。

## 六、总结

同花顺 Financial-API 的核心价值在于"一套数据、六种入口"的统一设计：AI Agent 用 Skill 自动选型，聊天工具用 MCP 即插即用，业务系统用 REST 零依赖接入，终端批处理用 CLI，量化研究用 Python SDK，长期历史研究用本地 DuckDB。它对真实数据的刚性约束、对大结果的落盘规范、以及对密钥安全的严格要求，都体现出金融级数据服务的成熟度。如果你正在做 A 股相关的量化研究、AI 投研助手或金融数据看板，这个项目值得一试。

> 注：本项目提供金融数据访问与研究数据准备工具，不提供投资建议。金融分析结果需注明"非投资建议"。
