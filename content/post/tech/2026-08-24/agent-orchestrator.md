---
title: "Agent Orchestrator：统一编排 26 种编程 Agent 的桌面工作台"
date: 2026-08-24
description: "Agent Orchestrator 是一款本地桌面应用，为 AI 编程 Agent 提供统一的任务编排、隔离工作区、实时看板和 PR/CI/Review 全流程追踪，支持 Claude Code、Cursor、Aider 等 26 种主流编码 Agent 协同工作。"
author: "Cheman"
slug: agent-orchestrator
draft: false
categories: ["技术", "开源", "AI编程"]
tags: ["GitHub", "Agent", "AI编程", "开源", "多Agent协同"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Agent Orchestrator**，它为开发者在多 Agent 并行开发场景下提供了统一的项目编排与实时状态看板，解决了多终端、多分支、多浏览器标签页协同混乱的问题。

## 一、项目概述

Agent Orchestrator（简称 AO）是一个本地桌面工作台，专门为 **多编程 Agent 协同开发** 设计。它不是另一个 AI 编码工具，而是一个"元工具"——在 Claude Code、Cursor、Aider、GitHub Copilot 等 26 种编码 Agent 之上，提供项目级编排、任务隔离、实时监控和反馈闭环。

**核心问题：** 一个编码 Agent 可以处理一个任务，但当多个 Agent 同时在一个项目上工作时，就产生了新问题：
- 如何拆分任务、避免分支冲突？
- 如何给每个 Agent 提供正确的上下文？
- 如何追踪每个 Agent 的对话、终端、PR、CI、Review？
- 如何将失败的 CI 或 Review 反馈闭环给正确的 Agent？

AO 就是为解决这些问题而生的。

**核心特性：**

1. **Worker 隔离工作区**：每个任务拥有独立的 Agent 会话、Git 分支/worktree、浏览器 Profile
2. **Orchestrator 项目级规划**：在任务之上进行产品方向、技术策略、优先级规划，并自动拆解任务、派发 Worker
3. **实时 Kanban 看板**：从 Agent 活动、PR 状态、CI 结果、Review 反馈自动推导看板状态
4. **PR/CI/Review 一体化视图**：每个 Worker 卡片聚合 PR 摘要、CI 状态、Review 评论
5. **Agent 原生界面集成**：支持结构化 Chat 和 Agent 原生 TUI（如 Claude Code 的 terminal UI）

## 二、技术原理

### 架构设计

AO 采用 **Desktop App + Local Daemon** 架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop App (Electron)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Kanban UI  │  │ Worker View │  │ Orchestrator Chat  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Local Daemon (Go)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Agent Watcher│  │ Git CDC      │  │ State Derivation │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent CLIs   │  Git Repo  │  GitHub API  │  CI Systems    │
└─────────────────────────────────────────────────────────────┘
```

**关键组件：**

1. **Desktop App**：基于 Electron 构建，提供 Kanban、Worker 详情、Orchestrator 会话等 UI
2. **Local Daemon**：Go 后端守护进程，负责：
   - 监控 Agent 进程活动
   - Git 仓库变更捕获（CDC，Change Data Capture）
   - GitHub API 轮询 PR/CI/Review 状态
   - 状态推导与看板位置计算

### 核心技术栈

从 `package.json` 可见：

```json
{
  "name": "agent-orchestrator",
  "scripts": {
    "lint": "cd backend && go test ./... && golangci-lint run",
    "frontend:typecheck": "npm --prefix frontend run typecheck",
    "sqlc": "cd backend && sqlc generate",
    "api": "npm run api:spec && npm run api:ts"
  }
}
```

- **Backend**：Go + SQLC（SQL 代码生成）+ golangci-lint
- **Frontend**：TypeScript + Electron
- **API**：OpenAPI 规范，自动生成 TypeScript 类型

### 状态推导机制

AO 的核心创新在于 **状态推导** —— 从原始事实推导看板状态：

```go
// 伪代码示例：Worker 卡片位置推导
func DeriveWorkerStatus(worker Worker) KanbanColumn {
    if worker.PR == nil {
        return Working
    }
    if worker.PR.CIFailed {
        return NeedsYou
    }
    if worker.PR.HasReviewChangesRequested {
        return NeedsYou
    }
    if worker.PR.IsApproved && worker.PR.IsMergeable {
        return ReadyToMerge
    }
    if worker.PR.IsOpen {
        return InReview
    }
    if worker.PR.IsMerged {
        return ReadyToMerge // 保留可见直到归档
    }
    return Working
}
```

### Git Worktree 隔离

每个 Worker 在 Git-backed 模式下获得独立的 worktree：

```bash
# AO 自动管理
git worktree add .ao/worktrees/worker-123 -b feature/worker-123-task
```

这样多个 Agent 可以同时操作同一个仓库的不同 worktree，避免分支冲突和文件锁竞争。

## 三、安装与快速开始

### 环境要求

- macOS / Windows / Linux
- Git 已配置 SSH 或 HTTPS 认证
- 至少一个支持的编码 Agent CLI 已安装

### 安装步骤

**macOS (Apple Silicon):**
```bash
# 下载 DMG
curl -LO https://github.com/Untrivial-ai/agent-orchestrator/releases/latest/download/agent-orchestrator-darwin-arm64.dmg
# 安装
open agent-orchestrator-darwin-arm64.dmg
```

**Windows:**
```powershell
# 下载 EXE 安装程序
Invoke-WebRequest -Uri "https://github.com/Untrivial-ai/agent-orchestrator/releases/latest/download/agent-orchestrator-win32-x64.exe" -OutFile "agent-orchestrator.exe"
# 运行安装
.\agent-orchestrator.exe
```

**Linux (AppImage):**
```bash
curl -LO https://github.com/Untrivial-ai/agent-orchestrator/releases/latest/download/agent-orchestrator-linux-x64.AppImage
chmod +x agent-orchestrator-linux-x64.AppImage
./agent-orchestrator-linux-x64.AppImage
```

### 快速开始

1. **添加仓库**：打开 AO，选择本地 Git 仓库目录
2. **创建 Worker**：点击 "New task"，选择 Agent（如 Claude Code）、模型、描述任务
3. **开始工作**：AO 自动创建分支、worktree，启动 Agent CLI
4. **监控看板**：在 Kanban 查看所有 Worker 状态

## 四、使用方法与实战

### 场景一：直接派发单任务

适合任务目标明确的情况：

1. 点击 **New Task**
2. 描述任务结果（如 "Add user authentication with JWT"）
3. 选择 Agent（Claude Code / Cursor / Aider 等）
4. 选择模型（Claude 4 / GPT-4o 等）
5. 附加相关文件（可选）
6. 开始工作

Worker 拥有独立的：
- Chat 会话历史
- 终端（可 attach 到 Agent TUI）
- 文件变更视图
- 浏览器预览（用于 Web 开发）
- PR / CI / Review 状态

### 场景二：Orchestrator 规划并派发

适合模糊需求或大型重构：

1. 打开 **Orchestrator** 会话
2. 描述模糊目标（如 "Improve test coverage to 80%"）
3. Orchestrator 分析仓库、现有 Worker、PR 状态
4. 提出任务拆解方案
5. 确认后自动创建多个 Worker 并分配上下文

**Orchestrator vs Worker 分工：**

| Orchestrator | Worker |
|--------------|--------|
| 产品方向、技术策略 | 实现、测试、提交 |
| 任务拆解、优先级排序 | 单任务执行 |
| 跨任务协调 | 代码编写 |
| 反馈整合（CI/Review） | 响应反馈修改代码 |

### 场景三：Review 反馈闭环

当 CI 失败或 Review 请求变更时：

1. Kanban 自动将 Worker 移到 **Needs You** 列
2. 点击 Worker 查看具体错误
3. 直接在 Worker 会话中告诉 Agent： "Fix the failing test in auth_test.go"
4. Agent 在同一上下文中修复
5. PR 更新，CI 重新运行

**关键优势：** 反馈闭环到正确的 Agent，而不是在混乱的终端历史中搜索。

### 场景四：并行开发隔离

多个 Agent 同时工作：

```
Worker-1 (Claude Code): feature/user-auth
Worker-2 (Cursor): feature/payment-integration
Worker-3 (Aider): fix/memory-leak
```

每个 Worker 有独立的：
- Git worktree（物理隔离的代码目录）
- 浏览器 Profile（Cookie/Session 隔离）
- 终端会话

AO 自动监控所有 Worker，在 Kanban 展示全局状态。

## 五、常见问题与解决方案

### Q1：Agent CLI 未被检测到

**现象：** New Task 界面 Agent 列表为空或提示 "CLI not found"

**解决方案：**
```bash
# 检查 Agent CLI 是否在 PATH
which claude  # Claude Code
which cursor  # Cursor CLI
which aider   # Aider

# 如未找到，添加到 PATH
export PATH="$PATH:/path/to/agent-cli"
```

### Q2：Git worktree 创建失败

**现象：** Worker 启动失败，提示 "worktree add failed"

**原因：** 分支已存在或 worktree 目录冲突

**解决方案：**
```bash
# 手动清理 worktree
git worktree list
git worktree remove .ao/worktrees/worker-xxx

# 或删除分支
git branch -D feature/worker-xxx-task
```

### Q3：看板状态不更新

**现象：** PR 已合并但 Kanban 仍显示 InReview

**排查步骤：**
1. 检查 Daemon 是否运行：`ps aux | grep ao-daemon`
2. 检查 GitHub API 限流：`gh api rate_limit`
3. 重启 AO Desktop App

### Q4：多个 Worker 的浏览器预览冲突

**现象：** Worker A 登录后 Worker B 也显示已登录

**原因：** 未启用 Browser Profile 隔离

**解决方案：**
AO 默认为每个 Worker 创建独立浏览器 Profile。如仍冲突，检查：
```bash
# 查看浏览器 Profile 目录
ls ~/.ao/browser-profiles/
```

### Q5：Orchestrator 规划偏离实际

**现象：** 拆分的任务不合理或忽略现有 PR

**调优建议：**
1. 在 Orchestrator 会话中明确说明约束条件
2. 使用 "Consider existing PR #123" 提醒 Orchestrator
3. 手动调整任务派发（Orchestrator 提议后可编辑）

## 六、总结

Agent Orchestrator 不是要替代 Claude Code、Cursor 等 AI 编码工具，而是在它们之上构建一层 **项目级编排与监控**。如果你：

- 同时运行多个 Agent 处理不同任务
- 需要追踪每个任务的 PR/CI/Review 状态
- 希望反馈闭环到正确的 Agent
- 厌倦了在多个终端、浏览器标签页之间切换

那么 Agent Orchestrator 值得一试。开源免费，支持 macOS / Windows / Linux，本地运行，数据完全在你的掌控中。

**GitHub：** https://github.com/Untrivial-ai/agent-orchestrator

**文档：** https://aoagents.dev/docs

**Discord 社区：** https://discord.com/invite/UZv7JjxbwG
