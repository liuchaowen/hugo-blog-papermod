---
title: "Vibe-Trading: 一句话让你的 AI 秒变专业交易员"
date: 2026-06-04T12:00:00+08:00
draft: false
tags: ["AI", "量化交易", "开源", "Python", "交易机器人"]
categories: ["技术"]
keywords: ["AI交易", "量化交易", "Vibe-Trading", "多智能体", "回测", "MCP"]
description: "Vibe-Trading 是港大开源的 AI 交易智能体，一行命令即可完成从自然语言策略想法到回测报告的全流程，支持多智能体协作、MCP 协议和跨市场数据。"
author: "Chao"
summary: "Vibe-Trading 是香港大学开源的 AI 交易研究工作空间，支持自然语言驱动的策略生成、回测、多智能体研究和 Shadow Account 跟单。"
CoverImage: "https://github.com/HKUDS/Vibe-Trading/raw/main/assets/icon.png"
---

## 背景

[Vibe-Trading](https://github.com/HKUDS/Vibe-Trading) 是香港大学（HKUDS）团队开源的 AI 交易研究工作空间，只需一句话，就能把大语言模型变成能够自主完成市场研究、策略回测、风险分析的专业交易员。整个项目基于 Python 3.11+、FastAPI 后端和 React 19 前端构建，MIT 协议开源，目前在 GitHub Trending 榜上位居前列。

## 核心特性

### 一句话就能跑完整流程

安装只需一行 pip 命令：

```bash
pip install vibe-trading-ai
vibe-trading init
vibe-trading run -p "回测 BTC-USDT 的 20/50 日均线策略，2024 年全年，计算收益和最大回撤"
```

从自然语言指令出发，系统自动完成：数据获取 → 策略代码生成 → 回测执行 → 指标报告，全程无需手动干预。

### 多智能体团队作战

内置多套预置智能体团队，覆盖投资、量化、加密货币、宏观研究、风险管理等场景：

```bash
# 投资委员会辩论：判断 TSLA 当前是否值得买入
vibe-trading --swarm-run investment_committee '{"topic": "Is TSLA a buy at current levels?"}'

# 量化策略流水线：从选股到回测全自动
vibe-trading --swarm-run quant_strategy_desk '{"universe": "S&P 500", "horizon": "3 months"}'

# 加密货币研究：分析 ETH-USDT 资金费率、清算与流向
vibe-trading --swarm-run crypto_trading_desk '{"asset": "ETH-USDT", "timeframe": "1w"}'
```

### 跨市场数据与回测引擎

- 支持 A 股、港股、美股、数字货币期货、外汇等跨市场数据
- 内置 452 个预置 Alpha 因子库（Qlib 158 + Kakushadze 101 + GTJA 191 + FF5 + Carhart）
- 支持组合回测、数据验证和运行卡片导出

### Shadow Account 跟单模拟

Shadow Account 功能让你把真实交易记录导入系统，自动对比 AI 策略与实盘表现，诊断行为偏差和规则遗漏。

### 跨会话记忆

一次设置偏好后，后续所有研究任务自动记住，无需重复说明风险偏好、策略类型等前提条件。

### 多种接入方式

| 方式 | 说明 |
|------|------|
| **PyPI 一键安装** | 最快上手路径，pip install 后即可 CLI 使用 |
| **Docker** | 零本地配置，2 分钟启动 Web UI |
| **MCP 插件** | 对接 Claude Desktop、OpenClaw、Cursor 等 AI 工具 |
| **API Server** | 暴露 REST API，可集成到现有系统 |

导出格式支持 TradingView Pine Script、通达信（TDX）、MetaTrader 5，以及标准化的 MCP 工具接口。

## 快速上手

### 环境准备

- Python 3.11+（本地安装路径）
- 一个 LLM API Key（支持 OpenAI、Anthropic 等，也可本地跑 Ollama，无需 Key）

### 安装与启动

```bash
# 安装
pip install vibe-trading-ai

# 初始化配置（交互式设置 API Key 等）
vibe-trading init

# 启动 Web UI（FastAPI + React）
vibe-trading serve --port 8899

# 或者直接 CLI 运行
vibe-trading run -p "分析茅台当前的基本面和技术面"
```

### 上传文档分析

支持直接上传交易记录或研报：

```bash
vibe-trading --upload trades_export.csv
vibe-trading run -p "分析我的交易行为，识别偏差和错误模式"
```

## 技术架构

项目采用前后端分离设计：

- **后端**：FastAPI（Python 3.11+），负责 LLM 调用、数据获取、回测计算
- **前端**：React 19，提供交互式 Web UI
- **通信协议**：原生支持 MCP（Model Context Protocol），可作为 MCP Server 暴露工具给外部 AI Agent
- **Agent 框架**：支持 LangChain 等主流 Agent 框架
- **数据源**：集成 IBKR（Interactive Brokers）等主流券商数据接口

## 适用人群

- **个人投资者**：想用 AI 辅助做策略研究和回测，但没有编程背景
- **量化研究员**：需要一个快速验证想法、批量跑回测的基础设施
- **AI Agent 开发者**：需要一个开箱即用的交易工具集，通过 MCP 接入现有 AI 工作流
- **金融科技团队**：作为交易研究模块快速集成到现有平台

## 总结

Vibe-Trading 的核心价值在于**降低量化研究的门槛**：不需要搭建复杂的数据管道，不需要写大量胶水代码，只需要用自然语言描述你想做什么。它既可以当作独立的研究工具，也可以作为 AI Agent 的交易能力插件。对于想快速验证交易想法、或者想用 AI 辅助做系统化投资研究的个人和团队，这是一个值得关注的项目。

项目地址：[https://github.com/HKUDS/Vibe-Trading](https://github.com/HKUDS/Vibe-Trading)

---

*本文内容基于 GitHub Trending 2026-06-04 精选项目自动生成。*
