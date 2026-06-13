---
title: "AgentsView：一站式 AI 编程助手成本追踪与分析平台"
date: 2026-06-13
description: "AgentsView 是一款开源的 AI 编程助手成本追踪工具，支持 Claude Code、Cursor、Copilot 等 25+ 主流 AI 编程工具，提供本地化部署、实时成本统计、会话浏览与全文搜索功能，帮助开发者精准掌控 AI 编程开支。"
author: "Cheman"
slug: agentsview
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI工具", "成本追踪", "开源", "开发者工具"]
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
ShowRssButtonInSectionTermListTag: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个有意思的项目：**AgentsView**，它是一款专注于 AI 编程助手的成本追踪与分析平台，能够帮助开发者一站式管理所有 AI 编程工具的使用记录和成本开销。

## 一、项目概述

AgentsView 是一个开源的本地优先工具，用于浏览、搜索和追踪所有 AI 编程助手的成本。它的核心价值在于：

- **统一管理**：支持 Claude Code、Cursor、Copilot、Codex、Gemini CLI 等 25+ 主流 AI 编程工具
- **本地优先**：所有数据存储在本地 SQLite 数据库，无需账户，完全隐私
- **实时分析**：提供成本仪表盘、活动热力图、会话浏览器等可视化功能
- **高性能查询**：基于 SQLite FTS5 的全文搜索，比重新解析会话文件的工具快 100 倍以上

项目采用 Go + Svelte 技术栈开发，提供 CLI、Web UI 和桌面应用三种使用方式，支持 macOS、Linux 和 Windows 平台。

## 二、技术原理

### 2.1 架构设计

AgentsView 采用典型的三层架构：

```
前端（Svelte 5 SPA） ←→ Go HTTP Server ←→ SQLite/DuckDB/PostgreSQL
```

核心组件包括：

- **会话解析器（Parser）**：自动发现并解析各 AI 编程工具的会话目录
- **同步引擎（Sync）**：监控会话文件变化，实时同步到数据库
- **存储层（Store）**：抽象接口支持 SQLite、DuckDB、PostgreSQL 三种后端
- **Web Server**：基于 Huma v2 框架的 REST API + SSE 实时推送

### 2.2 多后端存储设计

项目巧妙地实现了存储后端的抽象：

```go
// 存储接口抽象
type Store interface {
    ListSessions(ctx context.Context, opts ListOptions) ([]Session, error)
    GetSession(ctx context.Context, id string) (*Session, error)
    GetMessages(ctx context.Context, sessionID string) ([]Message, error)
    // ...
}

// 三种后端实现
type SQLiteStore struct { ... }
type DuckDBStore struct { ... }
type PostgresStore struct { ... }
```

- **SQLite**：主存储，支持写入和 FTS5 全文搜索
- **DuckDB**：只读镜像，适合大数据量分析和 Quack 协议远程访问
- **PostgreSQL**：团队共享后端，支持多用户协作

### 2.3 成本计算引擎

成本追踪的核心是 LiteLLM 定价数据：

```go
// 成本计算逻辑
func (c *CostCalculator) Calculate(usage TokenUsage) float64 {
    inputCost := usage.InputTokens * c.inputPrice
    outputCost := usage.OutputTokens * c.outputPrice
    
    // 缓存令牌特殊处理
    cacheCreateCost := usage.CacheCreationTokens * c.cacheCreatePrice
    cacheReadCost := usage.CacheReadTokens * c.cacheReadPrice
    
    return inputCost + outputCost + cacheCreateCost + cacheReadCost
}
```

关键设计：

- 自动从 LiteLLM 获取最新定价，离线时使用内置缓存
- 支持 Prompt Caching 成本计算（Claude 特有）
- 按模型细分的成本明细，支持 `--breakdown` 参数

### 2.4 会话自动发现

项目通过环境变量配置各 AI 工具的会话目录：

```go
var agentPaths = map[string]string{
    "claude":     os.Getenv("CLAUDE_PROJECTS_DIR"),
    "cursor":     os.Getenv("CURSOR_PROJECTS_DIR"),
    "copilot":    os.Getenv("COPILOT_DIR"),
    "codex":      os.Getenv("CODEX_SESSIONS_DIR"),
    // ... 25+ agents
}
```

首次运行时自动扫描所有已配置目录，解析 JSON/JSONL 格式的会话文件，同步到本地数据库。

## 三、安装与快速开始

### 3.1 安装方式

**macOS / Linux（推荐）：**

```bash
curl -fsSL https://agentsview.io/install.sh | bash
```

**macOS Homebrew：**

```bash
brew install --cask agentsview
```

**Windows：**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://agentsview.io/install.ps1 | iex"
```

**Docker：**

```bash
docker run --rm -p 127.0.0.1:8080:8080 \
  -v agentsview-data:/data \
  -v "$HOME/.claude/projects:/agents/claude:ro" \
  -e CLAUDE_PROJECTS_DIR=/agents/claude \
  ghcr.io/kenn-io/agentsview:latest
```

### 3.2 快速启动

```bash
# 启动 Web UI
agentsview serve

# 查看每日成本摘要
agentsview usage daily

# 按模型细分成本
agentsview usage daily --breakdown

# JSON 输出（用于脚本）
agentsview usage daily --all --json
```

首次运行会自动发现所有支持的 AI 编程工具会话，同步完成后自动打开 `http://127.0.0.1:8080`。

## 四、使用方法与实战

### 4.1 成本追踪

**每日成本概览：**

```bash
agentsview usage daily
```

输出示例：

```
Date        Input      Output    Cache    Cost (USD)
2026-06-13  1.2M       340K      890K     $12.45
2026-06-12  980K       290K      720K     $10.23
2026-06-11  1.5M       420K      1.1M     $15.67
```

**按模型细分：**

```bash
agentsview usage daily --breakdown
```

**筛选特定工具和日期：**

```bash
agentsview usage daily --agent claude --since 2026-06-01
```

**状态栏集成：**

```bash
# 一行摘要，适合 shell prompt
agentsview usage statusline
```

### 4.2 会话浏览与搜索

Web UI 提供强大的会话管理功能：

- **全文搜索**：基于 FTS5，支持中英文混合搜索
- **活动热力图**：可视化编程活动分布
- **Token 使用仪表盘**：每会话、每模型的成本明细
- **实时更新**：通过 SSE 监听活跃会话的变化
- **键盘导航**：`j`/`k` 切换会话，`Cmd+K` 全局搜索，`?` 查看快捷键

### 4.3 PostgreSQL 团队共享

对于团队协作场景，可配置 PostgreSQL 后端：

```bash
# 配置 PostgreSQL 连接
export AGENTSVIEW_PG_URL="postgres://user:pass@host:5432/agentsview"

# 推送本地数据
agentsview pg push

# 从 PostgreSQL 启动只读 Web UI
agentsview pg serve
```

**自动同步守护进程：**

```bash
# 后台自动推送
agentsview pg push --watch --debounce 1m
```

### 4.4 DuckDB 分析镜像

适合大数据量离线分析：

```bash
# 同步到 DuckDB
agentsview duckdb push

# 从 DuckDB 启动只读服务
agentsview duckdb serve

# 通过 Quack 协议远程访问
agentsview duckdb quack serve --token "$QUACK_TOKEN"
```

## 五、常见问题与解决方案

### 5.1 远程访问 403 Forbidden

**问题**：通过 SSH 端口转发或远程开发环境访问时，API 返回 403。

**原因**：服务端验证 `Host` 头防止 DNS 重绑定攻击。

**解决方案**：

```bash
# 指定浏览器访问的 URL
agentsview serve --public-url http://127.0.0.1:18080

# 或信任多个来源
agentsview serve --public-origin https://workspace.exe.dev
```

### 5.2 Antigravity CLI 加密会话无法读取

**问题**：旧版 Antigravity CLI 使用 AES-GCM 加密的 `.pb` 文件。

**解决方案**：

```bash
# 安装解密工具
go install github.com/mjacobs/agy-reader@latest

# 同步生成 sidecar 文件
agy-reader --sync

# 或持续监听
agy-reader --watch
```

### 5.3 Docker 容器无法发现某些 Agent

**问题**：容器化部署后，部分 AI 编程工具未出现在 UI。

**原因**：容器无法访问宿主机会话目录。

**解决方案**：

```bash
docker run --rm -p 127.0.0.1:8080:8080 \
  -v agentsview-data:/data \
  -v "$HOME/.claude/projects:/agents/claude:ro" \
  -v "$HOME/.cursor/projects:/agents/cursor:ro" \
  -e CLAUDE_PROJECTS_DIR=/agents/claude \
  -e CURSOR_PROJECTS_DIR=/agents/cursor \
  ghcr.io/kenn-io/agentsview:latest
```

### 5.4 隐私与数据安全

**Q: 数据是否会上传到云端？**

不会。所有会话数据存储在本地 SQLite 数据库，服务默认绑定 `127.0.0.1`。

**Q: 遥测数据包含什么？**

仅包含应用版本、操作系统、CPU 架构等匿名信息，不含会话内容、项目路径或账户信息。

**禁用遥测：**

```bash
export AGENTSVIEW_TELEMETRY_ENABLED=0
```

## 六、总结

AgentsView 是一款设计精良、功能完善的 AI 编程助手成本追踪工具。它通过本地优先的架构、多后端存储支持和强大的搜索分析能力，帮助开发者精准掌控 AI 编程开支。

核心优势：

- **广覆盖**：支持 25+ 主流 AI 编程工具
- **高性能**：SQLite FTS5 全文搜索，查询速度比同类工具快 100 倍
- **多部署**：CLI、Web、桌面、Docker 四种部署方式
- **可扩展**：支持 PostgreSQL 团队共享和 DuckDB 分析镜像

对于使用多个 AI 编程工具的开发者，AgentsView 是一款不可多得的效率提升工具。项目开源在 GitHub（kenn-io/agentsview），欢迎 Star 和贡献代码。
