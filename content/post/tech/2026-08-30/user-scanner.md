---
title: "User Scanner：465+ 扫描向量的 2-in-1 邮箱与用户名 OSINT 情报套件"
date: 2026-08-30
description: "kaifcodec/user-scanner 是一个集邮箱与用户名情报于一体的 OSINT 侦察套件，覆盖 465+ 扫描向量、支持跨扫描枢转、Hudson Rock 泄密情报查询、MCP 服务与多格式报告导出。本文从架构、技术原理到实战用法进行深度拆解。"
author: "Cheman"
slug: user-scanner
draft: false
categories: [安全, 开源]
tags: [GitHub, OSINT, 开源, 网络安全, Python]
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

今天在 GitHub Trending 上看到一个很有意思的开源项目：**User Scanner**——一个集"邮箱情报"与"用户名情报"于一体的 2-in-1 OSINT 侦察套件。它能在几秒内映射目标数字足迹、分析行为、提取用户名全量元数据并验证账号注册情况，对安全研究、威胁情报与防御性 OSINT 极具价值。

## 一、项目概述

User Scanner 由 `kaifcodec` 维护，当前版本 `1.5.1.1`，是一个用 Python 编写、面向命令行的开源情报（OSINT）工具。它把"用户名是否存在于某平台"与"邮箱注册了哪些账号"这两类传统上分散的侦察动作整合为一个引擎。

核心定位：
- **2-in-1 情报套件**：同时支持 Username OSINT 与 Email OSINT。
- **465+ 扫描向量**：其中 175+ 为邮箱集成站点，290+ 为用户名平台。
- **深度数字足迹映射**：不只是"有没有"，还分析目标兴趣、行为、社交关联。
- **元数据抓取**：头像、简介、粉丝数、UID、卖家状态、账号属性等。

核心特性一览：
- 🔎 深层次的邮箱与用户名 OSINT，跨 465+ 平台。
- 👤 丰富的元数据抓取（头像、简介、粉丝数、UID、卖家状态等）。
- 🔀 跨扫描枢转（Cross-Scan & Pivot）引擎，自动从初始扫描中挖掘关联账号与邮箱并多轮侦察。
- 🤖 原生 MCP（Model Context Protocol）服务，可接入 Claude Desktop、Cursor、Antigravity 等 AI Agent 做自主侦察。
- 🛡️ Hudson Rock 信息窃取器泄密情报查询（`--hudson`）。
- ⚡ 基于 `httpx` + `curl_cffi` 的高并发引擎，带 TLS 指纹伪装。
- 🔀 通配符用户名变体/别名生成，捕获 typo-squatting（域名抢注/用户名抢注）。
- 📂 自动导出 PDF（含头像）、JSON、CSV。
- 🌐 高级代理枢转，协议自动检测（`http` / `socks5`）+ 扫描前健康检查。
- 🎨 自适应终端 UI，动态进度与分类网格。

## 二、技术原理

### 架构设计

从 `pyproject.toml` 的入口声明可以看出，项目由 `user_scanner` 包构成，提供两条命令：

```toml
[project.scripts]
user-scanner = "user_scanner.__main__:main"
user-scanner-mcp = "user_scanner.mcp.server:main"
```

- `user-scanner`：主 CLI 入口（`__main__.main`）。
- `user-scanner-mcp`：MCP 服务入口（`mcp.server.main`），通过 stdio 与 AI 客户端通信。

### 核心技术栈与选型理由

依赖非常克制，聚焦于"高性能异步网络 + 富文本终端"：

```toml
dependencies = [
  "httpx[http2]>=0.27,<0.29",   # 异步 HTTP，支持 HTTP/2
  "socksio>=1.0,<2",            # SOCKS 代理支持
  "colorama>=0.4,<1",           # 跨平台终端着色
  "curl_cffi>=0.7,<1",          # 带 TLS/JA3 指纹伪装的请求库
  "rich>=13.0.0"                # 终端富文本 UI
]
```

选型要点：
- **`httpx`**：异步高并发的基础，配合 `socksio` 实现代理转发。
- **`curl_cffi`**：这是"指纹对抗"的关键——它使用 curl 底层并允许伪装 TLS 指纹（JA3），降低被目标站点风控识别为脚本的概率。
- **`rich`**：构建自适应终端 UI 与分类网格。

可选依赖按场景拆分（体现良好工程实践）：

```toml
[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "pytest-anyio", "anyio[trio]"]
pdf = ["reportlab>=4.0.0", "pillow>=10.0.0", "svglib>=1.5.0"]
mcp = ["mcp>=1.2.0,<2"]
```

- `pdf`：报告导出（PDF 含头像，需要 PIL 与 svglib 处理图片/SVG）。
- `mcp`：AI Agent 集成。

### 数据流分析

库模式（Library Mode）给出了引擎的核心调用范式：

```python
import asyncio
from user_scanner.core import engine
from user_scanner.email_scan.shopping import etsy

async def main():
    # Engine 校验目标并针对模块返回 Result 对象
    result = await engine.check(etsy, "test@gmail.com")
    print(result.to_json())

asyncio.run(main())
```

关键抽象：
1. **`engine.check(module, target)`**：传入一个"扫描模块"（如 `etsy`）与目标，返回结构化 `Result`。
2. **模块分层**：模块按领域组织，例如 `user_scanner.email_scan.shopping` 表示"邮箱扫描 → 电商类"。
3. **`Result.to_json()`**：结果天然可序列化为 JSON，便于管道集成。

这意味着每个平台是一个独立的"可插拔模块"，新平台只需实现统一的 `check` 接口，这符合 README 中"欢迎社区贡献新扫描模块"的扩展模型。

### Cross-Scan 枢转引擎

这是本项目的差异化亮点。普通扫描只回答"某平台上有没有这个账号"，而 Cross-Scan 会从初始命中结果中**挖掘暴露的 handle、资料链接、二级邮箱**，并自动在多平台间多轮（multi-pass）侦察：

| 枢转方向 | 挖掘内容 |
| :--- | :--- |
| `-e` → **username** | 邮箱注册资料页暴露的 handle / 社交链接 |
| `-u` → **username** | 目标社交档案中公布的二级别名 |
| `-u` → **email** | 目标档案页公开的邮箱地址 |
| `-e` → **email** | 初始邮箱资料暴露的二级地址 |

控制参数示例：

```bash
user-scanner -u johndoe --cross-scan --cross-depth 2        # 跟踪两跳深的链接
user-scanner -e johndoe@gmail.com --cross-scan --cross-links verified  # 仅平台已验证链接
```

### MCP 服务（AI Agent 集成）

`user-scanner-mcp` 以 stdio 启动，向 AI 客户端暴露三类工具：

| 工具 | 说明 | 能力 |
| :--- | :--- | :--- |
| `scan_username` | 跨平台深度用户名 OSINT 与画像富化 | 定向扫描、递归 `cross_scan`、代理注入 |
| `scan_email` | 跨平台深度邮箱验证与账号发现 | 目标范围、自动链接枢转 |
| `list_available_modules` | 动态目录与模块发现 | 让 Agent 动态查询全部支持平台 |

客户端配置（如 `claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "user-scanner": {
      "command": "user-scanner-mcp"
    }
  }
}
```

## 三、安装与快速开始

### 环境要求
- Python `>=3.10`（见 `requires-python`）。
- 推荐 pip 21+ 以便使用 `pip install "pkg[extra]"`。

### 安装方式

**1. PyPI（推荐）**

```bash
python3 -m pip install --upgrade pip
pip install user-scanner

# 可选：安装带 MCP Server 支持的版本（供 AI Agent 使用）
pip install "user-scanner[mcp]"
```

**2. 虚拟环境**

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install user-scanner
```

**3. Nix（Linux & macOS，免安装即跑）**

```bash
nix run github:kaifcodec/user-scanner/main -- --help
nix shell github:kaifcodec/user-scanner/main
```

### 最简运行示例

```bash
user-scanner -u johndoe             # 单用户名扫描
user-scanner -e johndoe@gmail.com   # 单邮箱扫描
```

## 四、使用方法与实战

### 1. 基础扫描

```bash
user-scanner -u johndoe             # 用户名全平台扫描
user-scanner -e johndoe@gmail.com   # 邮箱注册核查
```

### 2. 跨扫描枢转情报

邮箱扫描只能证明账号存在，往往不直接暴露 handle。`--cross-scan` 从目标资料中挖掘暴露的 handle、资料链接、二级邮箱，并自动跨平台多轮侦察：

```bash
user-scanner -u johndoe --cross-scan
user-scanner -e johndoe@gmail.com --cross-scan
user-scanner -u johndoe --cross-scan --cross-depth 2        # 两跳深
```

### 3. Hudson Rock 信息窃取器泄密情报

判断目标用户名/邮箱是否出现在 infostealer 恶意软件感染日志中（高优先级威胁关联）：

```bash
user-scanner -u johndoe --hudson
user-scanner -e johndoe@gmail.com --hudson
```

### 4. 定向分类与模块扫描

```bash
user-scanner -u johndoe -c dev            # 仅开发者平台
user-scanner -e johndoe@gmail.com -m github   # 单模块核查
user-scanner -u johndoe -m github,instagram   # 逗号分隔多模块

user-scanner -lu     # 列出用户名分类与模块网格
user-scanner -le     # 列出邮箱分类与模块网格
```

### 5. 批量文件扫描

```bash
user-scanner -uf usernames.txt   # 批量用户名（每行一个）
user-scanner -ef emails.txt      # 批量邮箱
```

### 6. 报告导出、选项与代理

```bash
# 导出 PDF / JSON / CSV
user-scanner -u johndoe -f pdf -o report.pdf
user-scanner -u johndoe -f json -o results.json

# 详细 URL 报告 + 显示全部结果（含未命中）
user-scanner -u johndoe -v --all

# 代理轮换 + 扫描前健康检查
user-scanner -u johndoe -P proxies.txt --validate-proxies
```

### 7. AI Agent 集成（MCP Server）

```bash
user-scanner-mcp          # 通过 stdio 启动 MCP 服务
user-scanner-mcp -v       # 开启 stderr 详细日志
```

### 8. Python 库模式（嵌入自有脚本）

```python
import asyncio
from user_scanner.core import engine
from user_scanner.email_scan.shopping import etsy

async def main():
    result = await engine.check(etsy, "test@gmail.com")
    print(result.to_json())

asyncio.run(main())
```

## 五、常见问题与解决方案

**Q1：安装时依赖冲突 / `httpx` 版本锁死？**
项目锁定 `httpx[http2]>=0.27,<0.29` 与 `curl_cffi>=0.7,<1`。若环境中已有其他包占用范围外版本，建议用独立虚拟环境（`python3 -m venv .venv`）隔离安装，避免版本冲突。

**Q2：扫描结果不稳定 / 频繁被风控？**
启用代理轮换并先做健康检查：`user-scanner -u TARGET -P proxies.txt --validate-proxies`。`curl_cffi` 的 TLS 指纹伪装可进一步降低被识别概率。

**Q3：MCP 服务启动后 AI 客户端连不上？**
确认已 `pip install "user-scanner[mcp]"`（否则 `user-scanner-mcp` 命令不存在），并在客户端配置中使用 `command: "user-scanner-mcp"`（stdio 模式，无需额外 host/port）。

**Q4：PDF 报告导出失败？**
PDF 导出依赖可选组 `pdf`（`reportlab` + `pillow` + `svglib`）。未安装会出现缺模块错误，补装即可：`pip install "user-scanner[pdf]"`。

**Q5：部分平台误报 / 漏报？**
OSINT 平台常改认证流程。可加 `-v --all` 查看详细命中 URL 自行核验；社区亦欢迎按统一 `engine.check` 接口贡献新模块。

## 六、总结

User Scanner 把"用户名侦察"和"邮箱侦察"这两类高频 OSINT 动作收敛进一个高并发、可扩展、还能被 AI Agent 直接调用的引擎。其亮点在于 **Cross-Scan 枢转**（从初始命中自动多轮挖掘关联账号/邮箱）、**Hudson Rock 泄密情报**接入，以及 **MCP 服务**对自动化侦察的友好支持；而精简的依赖与清晰的插件化模块接口（`engine.check(module, target)`）也让二次开发与社区扩充变得低成本。

> ⚠️ 项目声明：该工具仅用于教育、授权安全研究与防御性 OSINT 调查；请务必在合法合规前提下使用，开发者不对任何滥用或法律后果负责。

如果你是安全研究员、威胁情报分析师，或正在构建自动化侦察流水线，User Scanner 值得加入你的武器库。

- 仓库地址：https://github.com/kaifcodec/user-scanner
- 文档中心：`docs/` 目录（FLAGS / CROSS_SCAN / PATTERNS / USAGE / PROXIES / EXAMPLES）
