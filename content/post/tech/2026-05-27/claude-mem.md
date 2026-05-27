---
title: "Claude-Mem：为 Claude Code 构建的持久化记忆压缩系统"
date: 2026-05-27
draft: false
categories: [AI工具, 开源项目]
tags: [Claude Code, AI Agent, 记忆系统, 开源, TypeScript]
description: "Claude-Mem 是一款为 Claude Code 打造的持久化记忆压缩系统，通过自动捕获工具使用观察、生成语义摘要，实现跨会话的上下文保持，让 AI 助手能够持续记忆项目知识。"
author: "Cheman"
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

## 一、项目概述

**Claude-Mem** 是一个为 Claude Code 构建的持久化记忆压缩系统，其核心目标是解决 AI 助手在会话结束后丢失上下文的问题。通过自动捕获工具使用观察、生成语义摘要，并使这些信息对未来会话可用，Claude-Mem 让 Claude 能够在会话结束后继续保持对项目知识的连续性。

### 核心特性

- **持久化记忆**：上下文在会话间持久保存
- **渐进式披露**：分层记忆检索，提供 token 成本可见性
- **基于技能的搜索**：使用 mem-search 技能通过自然语言查询项目历史
- **Web 查看器 UI**：实时记忆流，访问地址 http://localhost:37777
- **Claude Desktop 技能**：从 Claude Desktop 对话中搜索记忆
- **隐私控制**：使用 `<private>` 标签排除敏感内容存储
- **自动操作**：无需人工干预
- **引用支持**：通过 ID 引用过去的观察（可通过 http://localhost:37777/api/observation/{id} 访问）

## 二、技术原理

### 架构设计

Claude-Mem 采用多组件协同的架构设计：

1. **5 个生命周期钩子**：SessionStart、UserPromptSubmit、PostToolUse、Stop、SessionEnd
2. **智能安装器**：缓存依赖检查器（预钩子脚本，非常规生命周期钩子）
3. **Worker 服务**：端口 37777 上的 HTTP API，带 Web 查看器 UI 和 10 个搜索端点，由 Bun 管理
4. **SQLite 数据库**：存储会话、观察、摘要
5. **mem-search 技能**：支持自然语言查询，具有渐进式披露
6. **Chroma 向量数据库**：混合语义 + 关键词搜索，实现智能上下文检索

### 数据流分析

系统的工作流程如下：

```
用户提示 → PostToolUse 钩子捕获 → 观察生成 → SQLite 存储
                                        ↓
                                  语义摘要生成
                                        ↓
                                  向量化存储 (Chroma)
                                        ↓
未来会话 → SessionStart 钩子 → 记忆检索 → 上下文注入
```

### 核心技术栈

- **运行时**：Node.js 18+、Bun（进程管理）
- **数据库**：SQLite 3（FTS5 全文搜索）、Chroma（向量数据库）
- **语言**：TypeScript
- **AI 集成**：Claude Agent SDK、MCP (Model Context Protocol)
- **包管理器**：npm、npx

## 三、安装与快速开始

### 环境要求

- Node.js 18.0.0 或更高版本
- Claude Code 最新版本（支持插件）
- Bun（JavaScript 运行时和进程管理器，缺失时自动安装）
- uv（Python 包管理器，用于向量搜索，缺失时自动安装）
- SQLite 3（持久化存储，已捆绑）

### 安装步骤

最简单的方式是一键安装：

```bash
npx claude-mem install
```

对于 Gemini CLI（自动检测 `~/.gemini`）：

```bash
npx claude-mem install --ide gemini-cli
```

对于 OpenCode：

```bash
npx claude-mem install --ide opencode
```

或通过 Claude Code 插件市场安装：

```bash
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

### OpenClaw Gateway 安装

在 OpenClaw 网关上安装 claude-mem 作为持久化记忆插件：

```bash
curl -fsSL https://install.cmem.ai/openclaw.sh | bash
```

安装器会自动处理依赖、插件设置、AI 提供商配置、Worker 启动，以及可选的实时观察流推送到 Telegram、Discord、Slack 等。

## 四、使用方法与实战

### 基础用法

安装完成后，重启 Claude Code 或 Gemini CLI，系统会自动开始工作：

1. **自动捕获**：工具使用观察会自动被捕获和存储
2. **上下文注入**：新会话启动时，相关记忆会自动注入
3. **Web 查看器**：访问 http://localhost:37777 查看实时记忆流

### MCP 搜索工具

Claude-Mem 提供 4 个 MCP 工具，遵循 token 高效的 3 层工作流模式：

**3 层工作流：**

1. **`search`** - 获取紧凑索引和 ID（每个结果约 50-100 tokens）
2. **`timeline`** - 获取特定观察或相关查询的时序上下文
3. **`get_observations`** - 仅对过滤后的 ID 获取完整详情（每个结果约 500-1,000 tokens）

**使用示例：**

```typescript
// 步骤 1：搜索索引
search(query="authentication bug", type="bugfix", limit=10)

// 步骤 2：审查索引，识别相关 ID（例如 #123, #456）

// 步骤 3：获取完整详情
get_observations(ids=[123, 456])
```

通过先过滤再获取详情，可实现约 10 倍的 token 节省。

### 配置与模式

Claude-Mem 支持多种工作流模式和语言，通过 `CLAUDE_MEM_MODE` 设置控制：

```json
{
  "CLAUDE_MEM_MODE": "code--zh"
}
```

可用模式包括：
- `code`：默认英文模式
- `code--zh`：简体中文模式
- `code--ja`：日语模式

## 五、常见问题与解决方案

### 安装失败

**问题**：Windows 上出现 `npm : The term 'npm' is not recognized` 错误

**解决方案**：
1. 确保已安装 Node.js 和 npm 并添加到 PATH
2. 从 https://nodejs.org 下载最新的 Node.js 安装程序
3. 安装后重启终端

### Worker 服务未启动

**问题**：无法访问 Web 查看器 http://localhost:37777

**解决方案**：

```bash
# 检查 Worker 状态
bun ~/.claude/plugins/marketplaces/thedotmack/plugin/scripts/worker-service.cjs status

# 启动 Worker
bun ~/.claude/plugins/marketplaces/thedotmack/plugin/scripts/worker-service.cjs start

# 查看日志
npm run worker:logs
```

### 记忆未注入

**问题**：新会话没有注入之前的上下文

**解决方案**：
1. 检查 `~/.claude-mem/settings.json` 中的配置
2. 确认 `CLAUDE_MEM_MODE` 设置正确
3. 查看 Worker 日志确认观察是否被捕获

### 性能问题

**问题**：搜索或上下文注入缓慢

**解决方案**：
1. 使用 `search` 工具的过滤参数限制结果数量
2. 定期清理旧观察（通过 Web UI 或 API）
3. 考虑调整 `settings.json` 中的上下文注入设置

## 六、总结

Claude-Mem 是一个设计精良的持久化记忆系统，专门为 Claude Code 打造。它通过巧妙的钩子机制、高效的数据库设计和智能的上下文检索策略，实现了 AI 助手跨会话的知识保持。

**项目亮点**：
- 自动化程度高，安装后无需手动干预
- 支持多种 AI CLI 工具（Claude Code、Gemini CLI、OpenCode）
- 提供 Web UI 实时查看记忆流
- 灵活的 MCP 搜索工具，支持自然语言查询
- 注重隐私，支持敏感内容排除

**适用场景**：
- 长期项目开发，需要 AI 助手记住之前的决策和代码变更
- 团队协作，共享项目上下文
- 复杂问题调试，需要回溯历史观察

项目采用 Apache 2.0 许可证，代码托管在 GitHub：https://github.com/thedotmack/claude-mem

随着 AI Agent 的普及，持久化记忆将成为基础设施级别的需求。Claude-Mem 在这个方向上提供了有价值的探索和实践，值得关注和使用。
