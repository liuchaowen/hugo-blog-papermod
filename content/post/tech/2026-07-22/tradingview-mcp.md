---
title: "TradingView MCP：用 Claude Code 接管你本地的 TradingView 图表"
date: 2026-07-22
description: "tradesdontlie/tradingview-mcp 是一个通过 Chrome DevTools Protocol 把本地的 TradingView Desktop 暴露给 LLM 智能体的 MCP 服务，提供 78 个工具用于图表读取、Pine Script 开发、画线、告警与回放，全部数据本地处理、不连接 TradingView 服务器。"
author: "Cheman"
slug: tradingview-mcp
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, MCP, TradingView, 量化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**tradingview-mcp**，它把 TradingView Desktop 变成了可以被 Claude Code 直接操作的「图表外设」。一句话概括它的价值——让你本地的交易图表长出「眼睛和手」，由 AI 辅助做图表分析、Pine Script 开发与工作流自动化。

## 一、项目概述

[tradesdontlie/tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp) 是一个 **MCP（Model Context Protocol）桥接服务**，核心目标是把专业交易界面「可读化」给 LLM 智能体。它不是交易机器人，而是一层 **接口层（interface layer）**，让研究者与开发者能够探索「人类与 AI 如何在金融工作流中协作」这一开放研究问题。

项目明确定位为研究 / 教育用途，强调：

- **纯本地**：所有数据处理均在用户机器上完成，不向 TradingView 服务器发送、存储或再分发任何市场数据。
- **不越权**：不绕过任何付费墙或访问控制，只与「你已经本地运行、且已登录订阅」的 TradingView Desktop 交互。
- **非官方**：与 TradingView Inc. 无任何隶属或认可关系，通过 Electron 暴露的调试接口访问未公开的内部 API。

核心能力一览：

- **Pine Script 开发**：AI 辅助编写、注入、编译、调试并迭代脚本。
- **图表导航**：切换标的、周期、图表类型，按日期缩放，增删指标。
- **可视化分析**：读取指标数值、价格水平与注解。
- **图表绘制**：趋势线、水平线、矩形、文本注解。
- **告警管理**：创建、列举、删除价格告警。
- **回放练习**：逐根历史 K 线推演，练习进出场。
- **截图**：抓取图表状态供 AI 视觉分析。
- **多窗格布局**：2×2、3×1 等不同标的的网格。
- **流式监控**：以 JSONL 形式把本地图表状态推给监控脚本。
- **CLI 访问**：每个 MCP 工具都有对应的 `tv` 命令，输出 JSON 便于管道处理。

## 二、技术原理

### 架构与连接

整个链路非常简洁，关键在「只走本地、只走标准协议」：

```
Claude Code  ←→  MCP Server (stdio)  ←→  CDP (port 9222)  ←→  TradingView Desktop (Electron)
```

- **传输层**：MCP over stdio，提供 **78 个 MCP 工具**；同时提供 `tv` CLI（30 个命令、66 个子命令）。
- **连接层**：通过 **Chrome DevTools Protocol（CDP）** 连接本机 `localhost:9222`。CDP 是 Google 内置于所有 Chromium / Electron 应用（VS Code、Slack、Discord 皆同）的标准调试接口。
- **依赖极少**：除了 `@modelcontextprotocol/sdk` 与 `chrome-remote-interface` 之外再无其它运行时依赖。

### 调试端口如何开启

关键点在于 CDP 调试端口默认关闭，必须由用户 **显式开启**——通过一个标准的 Chromium 命令行参数：

```bash
/path/to/TradingView --remote-debugging-port=9222
```

项目在 macOS / Windows / Linux 下分别提供了 `launch_tv_debug_*.sh/.bat` 启动脚本，也提供 `tv_launch` 工具自动探测并启动。没有这一步，任何事都不会发生，因此「安全性」来自于这一刻意操作而非隐式行为。

### 上下文管理设计

最值得借鉴的是它对 **LLM 上下文消耗** 的工程化压缩。一个典型的「分析我的图表」流程，总上下文仅约 **5–10KB**，而非原始的 ~80KB。具体手段：

| 机制 | 实现方式 |
|------|----------|
| Pine 线 | 仅返回去重后的价格水平，而非每个 line 对象 |
| Pine 标签 | 每个 study 上限 50 个，仅文本+价格 |
| Pine 表格 | 预格式化为行字符串，去掉单元格元数据 |
| Pine 框 | 仅去重后的 `{high, low}` 区间 |
| OHLCV 摘要模式 | 仅统计值 + 最近 5 根，而非全部 |
| 指标输入 | 自动过滤加密/编码的 blob |
| `verbose: true` | 需要时传入任意 pine 工具拿原始数据（含 ID/颜色） |
| `study_filter` | 只针对单个指标，而非全量扫描 |

### 流式与去重

`tv stream` 命令通过 CDP 在本机实例上 **按固定间隔轮询**，并做 diff 去重，以 JSONL 形式输出到 stdout。整个过程 **不连接 TradingView 服务器**，数据不出本机。

## 三、安装与快速开始

### 环境要求

- **TradingView Desktop**（实时数据需付费订阅）
- **Node.js 18+**
- 支持 MCP 的 **Claude Code**（或任意终端用于 CLI）
- macOS / Windows / Linux 均可

### 安装

```bash
git clone https://github.com/tradesdontlie/tradingview-mcp.git
cd tradingview-mcp
npm install
```

### 启动带 CDP 的 TradingView

```bash
# Mac
./scripts/launch_tv_debug_mac.sh

# Windows
scripts\launch_tv_debug.bat

# Linux
./scripts/launch_tv_debug_linux.sh
```

### 接入 Claude Code

在 MCP 配置（`~/.claude/.mcp.json` 或项目 `.mcp.json`）中加入：

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["/path/to/tradingview-mcp/src/server.js"]
    }
  }
}
```

随后让 Claude 执行 *"Use tv_health_check to verify TradingView is connected"* 即完成联通验证。

## 四、使用方法与实战

### CLI 速览

```bash
tv status                          # 检查连接
tv quote                           # 当前价格
tv symbol AAPL                     # 切换标的
tv ohlcv --summary                 # 价格摘要
tv screenshot -r chart             # 截图图表
tv pine compile                    # 编译 Pine Script
tv pane layout 2x2                 # 四图网格
tv pane symbol 1 ES1!              # 设置窗格标的
tv stream quote | jq '.close'      # 监控价格变化
```

### Claude 如何选工具

项目在 `CLAUDE.md` 中内置了一张完整的决策树，让模型知道何时调用哪个工具：

| 你说…… | Claude 使用 |
|--------|-------------|
| "我的图表上有什么？" | `chart_get_state` → `data_get_study_values` → `quote_get` |
| "显示了哪些价位？" | `data_get_pine_lines` → `data_get_pine_labels` |
| "读一下 session 表" | `data_get_pine_tables`（`study_filter`） |
| "做个完整分析" | `quote_get` → `data_get_study_values` → `data_get_pine_lines` → `data_get_pine_labels` → `data_get_pine_tables` → `data_get_ohlcv`(summary) → `capture_screenshot` |
| "切到 AAPL 日线" | `chart_set_symbol` → `chart_set_timeframe` |
| "写个 Pine Script" | `pine_set_source` → `pine_smart_compile` → `pine_get_errors` |
| "从 3 月 1 日回放" | `replay_start` → `replay_step` → `replay_trade` |
| "搞个四图网格" | `pane_set_layout` → 为每个窗格 `pane_set_symbol` |
| "在 24500 画线" | `draw_shape`(horizontal_line) |

### Pine Script 开发闭环

```text
1. pine_set_source   → 注入代码到编辑器
2. pine_smart_compile → 自动探测 + 编译检查
3. pine_get_errors   → 读取编译错误
4. pine_get_console  → 读取 log.info() 输出
5. pine_save         → 保存到 TradingView 云
```

### 实战：让 AI 辅助分析并标注关键位

一个典型工作流是：让 Claude 读取当前图表状态、提取支撑/阻力线，并以水平线形式把关键价位画回图上，再截图供你复核。所有读取都通过 `study_filter` 精确指向目标指标，避免上下文膨胀。

## 五、常见问题与解决方案

**Q1：连接失败，tv_status 提示找不到 TradingView。**
A：确认已用 `--remote-debugging-port=9222` 启动 Desktop，且调试端口开启。可先用 `tv_discover` 或 `tv_launch` 自动探测安装路径；macOS 默认位于 `/Applications/TradingView.app/Contents/MacOS/TradingView`。

**Q2：npm install 或运行报错 "X is not defined" 之类的运行时异常。**
A：仓库用 `eslint.config.mjs` 把 `no-undef` 设为 error，专门拦截重构后遗漏的改名调用点。运行 `npm run lint` 可在提交前静态捕获这类问题。

**Q3：TradingView 更新后工具突然失效。**
A：项目访问的是未公开的 Electron 内部接口，可能在任意更新中变动。若稳定性重要，建议 **锁定 TradingView Desktop 版本**；并避免依赖 `verbose` 模式下的内部 ID/颜色。

**Q4：上下文占用过高。**
A：始终对 pine 类工具使用 `study_filter` 指向单一指标；读取 K 线时优先 `summary: true`；复杂脚本 `pine_get_source` 可能超过 200KB，应避免不必要地全量读取。

**Q5：能否用它做量化交易或自动下单？**
A：不能。工具 **仅做图表交互，不执行真实交易**，也不做基于提取数据的自动/算法决策。详见仓库 Disclaimer 与项目定位——它是研究接口层，而非交易机器人。

## 六、总结

tradingview-mcp 把「AI 如何与专业金融界面协作」这个开放问题，落成了一个可运行、可复现、且 **安全和隐私边界清晰** 的工程样本：所有数据本地处理、调试端口需用户显式开启、明确不做交易与越权。其最亮眼的设计，是把 LLM 上下文消耗当作一等工程问题来对待——通过去重、摘要与 `study_filter`，把一次完整图表分析压到 5–10KB。

如果你本身就在用 TradingView Desktop + Claude Code，且想用自然语言驱动图表分析、Pine Script 迭代与回放练习，它是一个值得收藏的实验性项目；但请务必先评估使用方式是否符合 TradingView 的服务条款。

> 项目地址：<https://github.com/tradesdontlie/tradingview-mcp>
