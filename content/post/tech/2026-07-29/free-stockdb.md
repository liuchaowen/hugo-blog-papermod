---
title: "free-stockdb：一个本地量化数据引擎，让 A 股全市场回测从 10 天压缩到 30 分钟"
date: 2026-07-29
description: "free-stockdb 是一款面向 A 股日 K、分钟 K 与 ETF 数据的本地量化引擎，通过增量同步、Zstd 压缩存储、内置 39 种技术指标和 5 种指数计算，实现全市场 7000+ 股票分钟线回测从 10 个工作日压缩到 30 分钟内完成。"
author: "Cheman"
slug: free-stockdb
draft: false
categories: ["量化投资", "开源工具", "Python"]
tags: ["量化", "A股", "本地数据", "回测", "Python", "C++"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**free-stockdb**，一个面向 A 股本地量化数据的引擎。它解决了一个很痛的问题——全市场回测时，数据工程（下载、清洗、复权、入库、优化）往往占掉 10-15 个工作日，而 free-stockdb 把这个过程压缩到 30 分钟内。

## 一、项目概述

**free-stockdb** 是由开发者 `hello245m` 构建的本地量化数据与计算引擎，专注于 A 股日 K、分钟 K 与 ETF 分钟、tick 级数据的本地化管理。它的核心理念是：**数据本地落盘，研究不再依赖远程接口**。

核心特性一览：

- **本地优先**：数据在用户磁盘，查询、计算、回测完全离线运行，不受 API 限流影响
- **增量同步**：只处理变化数据，支持断点续传
- **Zstd 压缩存储**：比 CSV/MySQL 小 3 倍以上
- **39 种技术指标 + 5 种指数**：MA、EMA、MACD、KDJ、BOLL 等，内置 Rust 计算核心，比 pandas 快 3 倍
- **五种调用方式**：Python SDK、HTTP API、Excel/WPS 宏、HTML 页面、AI MCP 协议

支持的数据频率：日线、周线、月线、1/5/15/30 分钟 K 线，以及 tick 级数据（按需）。

## 二、技术原理

### 架构设计

整个系统分为三层：**同步层 → 数据层 → 查询计算层**。

```
[数据源 sync_url.txt] 
      ↓ 增量同步、Zstd压缩、SHA-256校验
[本地 ./data 目录 — C++ 时序数据服务]
      ↓ 
[Python SDK / HTTP API / Excel / HTML / MCP]
```

同步层负责从 `sync_url.txt` 配置的数据源拉取历史和增量数据，完成解压、校验、入库。数据层采用定制 C++ 时序引擎，存储于本地文件，不依赖 MySQL 等外部数据库。查询计算层则通过 Python SDK、HTTP API、Excel 插件或 MCP 协议对外提供服务。

### 核心源码结构

C++ 源码位于 `cpp/` 目录，构建系统使用 CMake：

```bash
cmake -S cpp -B cpp/build
cmake --build cpp/build --config Release
```

依赖包括 CMake 3.14+、C++17 编译器、libcurl 和 OpenSSL 开发包。Windows 用户直接使用 Releases 中的预编译包即可（仅 2.2MB）。

### 批量数据查询接口

`get_data()` 是最核心的查询函数，支持全市场、多频率、任意时间范围的批量数据拉取：

```python
result = get_data(
    code=7000_codes,           # 7000+ 股票 / ETF
    start=any_start,            # 任意开始时间
    end=any_end,                # 任意结束时间
    frequency=any_frequency,    # 分钟 / 日 / 周 / 月
    fq=any_fq,                  # 前复权 / 后复权 / 不复权
    fields=any_fields,          # 任意单多字段筛选
    as_df=False/True            # 返回 list / dict / DataFrame
)
```

### 内置指标计算

`zb.get()` 是批量技术指标计算接口，内置 39 种指标，覆盖趋势、震荡、通道、量价等类别：

```python
result = zb.get(
    name="ma,kdj,macd",        # 指标名称
    codes=7000_codes,           # 单股 / 批量 / 全市场
    start=any_start,
    end=any_end,
    frequency=any_frequency,
    fq=any_fq,
    n=["5,10,20", None, "12,26,9"],  # 每个指标独立参数
    cross="with_value"          # 原始值 / 金叉信号 / 二者同时
)
```

值得注意的是，计算核心用 Rust 实现，在全市场 7000+ 股票的场景下比 pandas 方案快约 3 倍，**数秒即可完成**。

### 板块双向查询

`bk.get()` 用于股票代码与申万一/二/三级行业、1200+ 概念板块之间的双向映射查询：

```python
result = bk.get(
    x=code_or_board_or_codes,    # 股票代码 / 板块名称或代码 / 批量
    category=0-3,                # 概念板块 / 申万一级 / 申万二级 / 申万三级
    fields="code,name,symbols"   # 任意单多字段
)
```

### HTTP API 方式调用

不需要 Python 环境时，可通过 HTTP 接口查询本地数据：

```
http://127.0.0.1:7899/?cmd=get&t=日线&code=000001.SZ&start=2025-01-01&end=2025-07-01
```

服务默认监听 `127.0.0.1:7899`，不会主动暴露到公网。

## 三、安装与快速开始

### 环境要求

| 项目 | 最低配置 | 推荐配置 |
|---|---|---|
| 磁盘空间 | 约 5GB（仅日线） | 约 20GB（含全量分钟线） |
| 内存 | 2GB | 8GB+ |
| 操作系统 | Windows 7+ | Windows 10+ |

### 安装步骤

**第一步：下载发行包**

从 [Releases](https://github.com/hello245m/free-stockdb/releases) 下载 Windows 压缩包（如 `free-stockdb-windows-v0.2.1-more-power.zip`）。

**第二步：运行数据更新工具**

解压后双击数据更新工具，同步历史数据到 `./data` 目录。首次同步会从数据源拉取全量历史数据，通过 Zstd 压缩传输，增量同步支持断点续传。

**第三步：启动数据服务**

双击 `stockdb.exe`（仅 2.2MB），服务监听 `127.0.0.1:7899`。

**第四步：开始研究**

```python
from stockdb import get_data, zb, bk

# 查询全市场日线数据
data = get_data(code=7000, start="2020-01-01", end="2026-07-01", frequency="日线")
print(data)

# 计算 MACD 金叉信号
signals = zb.get(name="macd", codes="000001.SZ", frequency="日线", cross="cross")
```

## 四、使用方法与实战

### 场景一：全市场选股策略回测

传统方案需要逐股调用远程 API，全市场分钟线回测实测需要 3-5 天。使用 free-stockdb：

```python
# 一次性拉取全市场日线数据
all_data = get_data(code=7000, start="2020-01-01", frequency="日线")

# 全市场批量计算 39 种指标，数秒完成
indicators = zb.get(
    name="ma,macd,kdj,boll",
    codes=7000,
    start="2020-01-01",
    frequency="日线",
    cross="cross"
)

# 基于板块筛选
tech_board = bk.get(x="半导体", category=1)  # 申万一级行业
```

整个过程在本地完成，无 API 调用次数限制。

### 场景二：AI 辅助量化分析

通过 MCP 协议，Claude、Cursor、Windsurf 等 AI 工具可直接连接本地数据服务：

```python
# 在 AI 工具中调用 MCP
result = await get_data_async(code="000001.SZ", frequency="日线", fq="前复权")
```

数据查询和计算完全在本地进行，AI 不会接触原始数据源，隐私和合规性都有保障。

### 场景三：Excel / WPS 联动

使用 Excel 宏直接调用本地数据，适合非编程背景的分析师：

```
=StockDB_GetData("日线", "000001.SZ", "2025-01-01", "2025-07-01")
```

## 五、常见问题与解决方案

**Q：数据同步失败怎么办？**

检查 `sync_url.txt` 配置的数据源地址是否可用，确保网络畅通。同步器会在写入前校验 SHA-256，若文件损坏会自动重新下载。可使用断点续传模式恢复中断的同步。

**Q：内存不够用怎么处理全市场数据？**

分批查询是有效方案——按板块或市值分组获取数据。推荐配置 8GB+ 内存，实际内存占用取决于同时加载的股票数量和数据频率。

**Q：如何切换数据源？**

编辑 `sync_url.txt`，填入自己的同步节点、内网服务器或网络共享目录地址。也支持 `file://` 协议加载本地已归档的数据快照。

**Q：复权数据是否准确？**

本地数据保留不复权行情与复权因子，查询时按需返回前复权、后复权或不复权结果。可通过本地接口抽样检查复权因子和公司行为日期，或自行校验数据质量。

**Q：支持 Linux 和 macOS 吗？**

目前主要提供 Windows 版本（v0.2.1），macOS 和 Linux 版本已在开发中，预计近期发布。

## 六、总结

free-stockdb 的最大价值在于**重新定义了量化研究的数据工程范式**——它不是又一个 Python 库，而是一套完整的数据基础设施。将数据同步、存储、查询、计算全部本地化后，策略研究员终于可以把全部精力放在策略本身，而不是花 10 天时间去折腾数据。

对于有全市场回测需求、追求研究效率的个人投资者和量化爱好者来说，这个项目值得关注。开源地址在 [hello245m/free-stockdb](https://github.com/hello245m/free-stockdb)，预编译包仅 2.2MB，建议下载体验一下。
