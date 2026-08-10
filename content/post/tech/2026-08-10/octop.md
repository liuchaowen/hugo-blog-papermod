---
title: "Octop：腾讯开源的自托管多用户 AI 助手平台"
date: 2026-08-10
description: "Octop 是腾讯云开源的自托管 AI 助手平台，支持多用户、多 Agent 架构，集成 Web Dashboard、CLI、IM 通道（飞书/钉钉/QQ/Discord/企业微信）和定时任务，所有数据本地存储，隐私安全有保障。"
author: "Cheman"
slug: octop
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI", "腾讯", "自托管", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Octop**，这是腾讯云开源的一款自托管 AI 助手平台，一句话概括它的核心价值——一个进程搞定 Web 控制台、CLI、IM 通道和定时任务，数据完全在本地，隐私零妥协。

## 一、项目概述

Octop 是面向家庭和小团队的自托管 AI 助手平台。它通过多 Agent 架构，为每个用户构建一个既独立又协作的智能环境。核心设计理念是：**所有对话、工作空间、凭证都保存在你自己的机器上**，同时让每个用户拥有一支可按场景切换的专业 Agent 团队。

**核心特性：**

- **多用户专家团队**：一个管理员账号，家庭成员共享；内置专家库，按场景切换不同专长的 Agent
- **MBTI 人格模板**：16 种人格模板 + 互动测验，让每个 Agent 拥有独特性格
- **安全内置**：JWT 多用户隔离、工具审批、Shell 命令防护、PII 脱敏
- **Connector 生态**：腾讯套件（文档、微博热点、新闻等）、OAuth 和 MCP 网关扩展资源边界
- **可插拔后端**：本地磁盘、Docker 容器、PostgreSQL 或 COS/S3
- **便携式记忆**：基于 harness-memory，记忆随工作空间迁移
- **ACP 双向集成**：`octop acp` 实现 IDE/终端 AI 集成
- **终端 AI+**：浏览器内交互式 Shell，AI 辅助命令执行
- **浏览器 AI+**：无头 Chromium 会话，支持 Web 自动化、截图、远程浏览
- **远程桌面**：Dashboard 实时屏幕和输入，支持 Linux/Windows/macOS

## 二、技术原理

### 架构设计

Octop 采用**单进程架构**，将 Web UI、IM 通道、定时任务统一路由到一个 `HarnessProcessor`。整个进程状态存储在 SQLite 数据库（WAL 模式），重启后从 `~/.octop/octop.db` 重建状态。

```
OctopServer
 ├─ SqlitePool               SQLite (WAL mode)
 ├─ SharedServices       DI root — every repo + config
 ├─ ExpertCatalog        scans agents/experts/library/ at boot
 ├─ UserManager
 │   └─ HarnessAgentManager (per user)
 │       └─ AgentRuntime (per agent)
 │           ├─ HarnessAgent      Agent runtime (harness-agent)
 │           ├─ HarnessProcessor  IM / UI / cron entry point
 │           ├─ ChannelManager    IM connections (harness-gateway)
 │           └─ CronManager       APScheduler
 └─ FastAPI app (uvicorn)
```

### 核心技术栈

| 层级 | 技术 |
|------|------|
| 语言 | Python 3.12+ |
| Web 框架 | FastAPI + uvicorn |
| Agent 运行时 | harness-agent |
| Gateway | harness-gateway |
| 控制平面 DB | SQLite (WAL) via aiosqlite |
| 前端 | React 18 + TypeScript + Vite + Ant Design |
| 调度 | APScheduler |
| ACP | agent-client-protocol |
| 构建/质量 | hatchling · ruff · mypy · pytest |

### Harness 组件栈

Octop 基于 Harness 系列运行时组合：

- **harness-agent**：Agent 运行时，负责模型路由、工具、技能、对话检查点
- **harness-gateway**：多平台 IM 通道桥接，将消息标准化为统一处理流水线
- **harness-memory**：分层召回 + 全文搜索，Agent 记忆随工作空间迁移
- **harness-browser**：基于 CDP 的浏览器自动化，支持持久化配置文件

### 数据流分析

从 pyproject.toml 可以看到核心依赖：

```python
dependencies = [
    "fastapi>=0.110",
    "uvicorn[standard]>=0.27",
    "pydantic>=2.6,<2.14",
    "langchain-core>=1.4.8",
    "click>=8.1",
    "apscheduler>=3.10,<4",
    "pyjwt>=2.8",
    "orcakit-harness-agent[all]>=0.9.19",
    "harness-memory>=0.9.5",
    "harness-gateway>=0.9.1",
    "harness-browser>=0.7.4",
    "playwright>=1.40",
    "mcp>=1.9,<2",
]
```

设计亮点：
- **无外部消息队列**：所有表面（Web UI、IM、cron）通过单一 `HarnessProcessor` 路由
- **重启安全**：进程重启后从数据库重建完整状态
- **MCP 支持**：内置 MCP 网关扩展资源边界

## 三、安装与快速开始

### 环境要求

- **macOS / Linux / Windows**
- 无需预装 Python，安装器使用 [uv](https://docs.astral.sh/uv/) 在隔离 venv 中部署 Python 3.12

### 安装方式

**macOS / Linux — 一行安装（推荐）：**

```bash
curl -fsSL https://finnie-1258344699.cos.ap-guangzhou.myqcloud.com/octop/install.sh | bash
```

**Windows (PowerShell)：**

```powershell
irm https://finnie-1258344699.cos.ap-guangzhou.myqcloud.com/octop/install.ps1 | iex
```

安装后打开新终端或重新加载 shell：

```bash
source ~/.zshrc   # Zsh
# 或
source ~/.bashrc  # Bash
```

**可选组件：**

```bash
# 浏览器自动化 (Playwright Chromium)
curl -fsSL https://finnie-1258344699.cos.ap-guangzhou.myqcloud.com/octop/install.sh | bash -s -- --extras browser

# 飞书通道支持
curl -fsSL https://finnie-1258344699.cos.ap-guangzhou.myqcloud.com/octop/install.sh | bash -s -- --extras channels-feishu
```

**PyPI 安装（已有 Python 环境）：**

```bash
pip install octop
# 可选: pip install "octop[browser]"
```

### 初始化与运行

```bash
# 初始化：创建数据库、JWT 密钥、首个管理员账号
octop init

# 前台运行（API + Web Dashboard）
octop run

# 自定义 host / port
octop run --host 0.0.0.0 --port 8088

# 注册为系统服务 (systemd / launchd / Windows service)
octop service start
```

打开 **http://127.0.0.1:8088**，默认账号密码 `admin` / `octop`（登录后立即修改）。

### Docker 部署

```bash
# 构建并启动
docker compose -f docker/docker-compose.yml up -d

# 手动构建
bash docker/docker_build.sh
docker run -d \
  -p 8088:8088 \
  -v octop-data:/data/.octop \
  -e HOME=/data \
  -e OCTOP_DEFAULT_PASSWORD=changeme \
  octop:latest
```

## 四、使用方法与实战

### 基础用法

**Web Dashboard** 功能模块：

- **Chat**：与 Agent 实时对话
- **Agents**：创建 Agent、选择专家/MBTI 人格、配置 Provider
- **Connectors**：OAuth 应用和 MCP 网关
- **Channels**：IM 平台配置
- **Cron**：可视化定时任务管理
- **ACP**：配置外部编码 Agent Runner
- **Settings**：用户、安全、TLS、系统设置

**CLI 命令：**

```bash
# 查看模型配置
octop models
octop provider list

# IM 通道管理
octop channel list
octop channel install

# 技能管理（按 Agent）
octop skills list --agent main

# 定时任务
octop cron list
octop cron create --help

# 用户管理（管理员）
octop user list
```

### 进阶用法

**ACP (Agent Client Protocol) 双向集成：**

1. **入站** — 外部工具使用你的 Octop Agent：
   ```bash
   octop acp --agent main   # stdio ACP server for Zed, OpenCode, …
   ```

2. **出站** — Octop 委托给外部编码 Agent：
   - Dashboard → ACP (`/acp`) 配置 Runner（全局按用户）
   - 按 Agent 启用 `acp_runner`，在对话中委托

内置 Runner 包括 OpenCode、CodeBuddy、Claude Code、Codex。

### 支持的 IM 通道

| 通道 | 凭证 |
|------|------|
| **飞书** | App ID, App Secret |
| **钉钉** | App Key, App Secret |
| **QQ** | Bot AppID, Token |
| **Discord** | Bot Token |
| **企业微信** | Corp ID, Agent Secret |
| **Web Dashboard** | 默认启用 |

### 支持的 LLM Provider

OpenAI 兼容 API、DashScope（通义千问）、Ollama 及其他预设 — 在 Dashboard 或通过 `octop provider` 配置。

## 五、常见问题与解决方案

### 安装失败

**问题**：安装脚本执行失败，提示网络错误。

**解决**：
- 检查网络连接，确保能访问 `finnie-1258344699.cos.ap-guangzhou.myqcloud.com`
- 使用 `--mirror` 参数指定镜像源
- 或直接通过 PyPI 安装：`pip install octop`

**问题**：Windows 安装后 `octop` 命令未找到。

**解决**：
- 重新打开 PowerShell 或 CMD 窗口
- 检查 `~/.octop/bin` 是否在 PATH 中

### 运行时错误

**问题**：启动时报端口占用。

**解决**：
```bash
octop run --port 8089   # 使用其他端口
```

**问题**：数据库锁定错误。

**解决**：
- 确保没有其他 Octop 进程在运行
- 检查 `~/.octop/octop.db` 权限

**问题**：Playwright 浏览器未安装。

**解决**：
```bash
# 安装浏览器自动化组件
curl -fsSL https://finnie-1258344699.cos.ap-guangzhou.myqcloud.com/octop/install.sh | bash -s -- --extras browser
# 或
pip install "octop[browser]"
playwright install chromium
```

### 性能问题

**问题**：响应缓慢。

**解决**：
- 检查 LLM Provider 配置，确保 API 延迟合理
- 对于本地模型，确保硬件资源充足
- 检查 SQLite WAL 模式是否正常工作

**问题**：内存占用高。

**解决**：
- 限制活跃 Agent 数量
- 检查是否有长时间运行的对话未释放

### 兼容性

**问题**：Python 版本不兼容。

**解决**：
- 确保使用 Python 3.12+
- 推荐使用官方安装脚本，它会自动配置隔离环境

**问题**：与现有 Python 环境冲突。

**解决**：
- 使用安装脚本的隔离环境（`~/.octop/venv`）
- 或使用 Docker 部署

## 六、总结

Octop 作为腾讯云开源的自托管 AI 助手平台，其最大亮点在于**单进程架构**与**多用户多 Agent** 的完美结合。通过将 Web Dashboard、CLI、IM 通道、定时任务统一在一个进程中，配合 SQLite 数据库的 WAL 模式，实现了重启即恢复的轻量化部署体验。

对于注重隐私的个人和小团队，Octop 提供了一套完整的解决方案：数据完全本地化、支持多种 LLM Provider、内置丰富的 IM 通道集成、ACP 双向 IDE 集成、以及浏览器和终端 AI 辅助。MBTI 人格模板和专家库让每个 Agent 都能拥有独特的"性格"和专业领域，这对于需要多场景切换的用户尤为实用。

项目代码质量也有保障：使用 Ruff + mypy + pytest 的标准工具链，严格的类型检查，以及完善的 Makefile 构建系统。如果你正在寻找一个可以完全掌控的 AI 助手平台，Octop 值得一试。

GitHub: https://github.com/TencentCloud/Octop
