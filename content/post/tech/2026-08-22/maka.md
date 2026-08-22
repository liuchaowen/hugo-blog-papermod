---
title: "Apache Maka：本地优先的 AI Agent 工作空间"
date: "2026-08-22"
description: "Maka 是 Apache 基金会推出的本地优先 AI Agent 工作空间，通过 Runtime Event Log 作为核心抽象，实现会话、UI 与模型上下文的所有投影，支撑 Desktop、TUI、CLI 和 Eval 多入口。"
author: "Cheman"
slug: maka
draft: false
categories: [AI, 开源]
tags: [AI Agent, Apache, 开源, LLM, 本地优先]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Apache Maka**，它是 Apache 基金会孵化的本地优先 AI Agent 工作空间，强调数据主权与可恢复的执行事实，而非仅仅是问答助手。

## 一、项目概述

Maka 不只是一个聊天机器人，而是一个受控权限驱动的 AI Agent 运行环境。它的核心理念是：

- **Local-first**：会话、设置和运行记录默认保存在本地，用户自行选择模型连接方式（云 API、本地模型或兼容网关）。
- **Log is the Runtime**：模型消息、Tool Calls、Tool Results 以及终止事实全部写入 Runtime Event Log。会话、UI、模型上下文和恢复都是从该日志的投影。
- **Context is not history**：Tool Result 剪枝和 LLM Compaction 改变了下一次推理看到的内容，但不把记录的证据当作可丢弃的上下文。
- **单一执行权威**：Runtime Host 统一管理 Session、Turn、Agent 生命周期、续约、工具和事件。

当前支持 macOS Apple Silicon（Electron + React Desktop）、终端 TUI/CLI、Eval 基准测试等入口。

## 二、技术原理

### 核心架构

Maka 的后端骨架如下：

```text
Desktop / TUI / CLI → Runtime Host → SessionManager → AgentRun
                                             ↓
                         Model + Tool Runtime → Runtime Event Log
                                             ↓
                              Context / Session / UI projections
```

`runtime.sqlite` 是唯一的操作权威，负责存储 RuntimeEvents、会话元数据、消息历史、Agent Graph 控制状态、工作流状态、用量、Artifact 等。Artifact 字节本身存储在 `artifacts/` 目录下。

### 本地工具集

Runtime 提供以下内置工具：

- **Read**：读取文件内容，支持大文件截断
- **Write**：创建或覆盖文件，自动创建父目录
- **Edit**：精确文本替换
- **Bash**：执行 Shell 命令（PTY 支持 TTY 交互）
- **Glob / Grep**：项目文件搜索（需安装 `ripgrep`）

工具通过权限引擎（Permission Policy）管控，Renderer 层不接触明文凭证。

### 会话恢复与续约

`MAKA_RUNTIME_SAFE_BOUNDARY_RESUME=1` 环境变量开启安全续约：Desktop 的"Safe resume"按钮、CLI/TUI 的 `/resume` 命令以及 Desktop 启动自动续约都会触发。Phase 2 提供持久化的写侧边界与 fail-closed 续约，Phase 3 仍未实现，模糊的工具副作用会被暂存而非重试。

### Monorepo 结构

```text
apps/desktop/       Electron 主进程 / preload / React renderer
packages/core/      Sessions、Events、Permissions、Connections 纯合约
packages/storage/   SQLite 运营状态、配置与载荷存储
packages/runtime/   AgentRun、模型适配器、工具、上下文与恢复
packages/eval/      实验单元、尝试、结果与执行器/主体适配器
packages/cli/       TUI 与非交互 CLI
packages/ui/        对话、Markdown、Artifact 与 UI 原语
```

所有包统一使用 `npm@11`，Node.js 要求 ≥22.19.0。

## 三、安装与快速开始

### 环境要求

- Node.js ≥ 22.19.0（CI 使用 Node.js 24）
- npm（lockfile 和脚本基于 npm）
- Git
- `ripgrep`（`brew install ripgrep`），用于 Runtime 的 Grep 工具

### 下载 Desktop（macOS Apple Silicon）

从 [GitHub Releases](https://github.com/apache/maka/releases/latest) 下载 `Maka-<version>-mac-arm64.dmg`，拖入 Applications，安装 `ripgrep`，启动后进入 `Settings → Models` 配置模型连接即可使用。

### 源码开发

```sh
git clone https://github.com/apache/maka.git
cd maka
npm ci
npm run dev         # HMR 热更新开发
# 或 npm run dev:full  # 构建后再启动 Electron
```

### CLI 入口

```sh
npm run build
npm run cli:dev                    # 启动 TUI
npm run cli:dev -- run "Summarize this repository"
```

## 四、使用方法与实战

### Desktop 工作流

1. 打开 Maka，进入 `Settings → Models` 添加 API、本地模型或网关连接
2. 设置默认模型，返回工作区开始任务
3. 创建会话后，可搜索、重试、重新生成或从某一 Turn 创建分支

会话状态分为三类：**已配置**（Configured）、**可发送**（Send-ready）和**实验性**（Experimental），未接入 Runtime 的账户流不会显示为可用模型。

### Graph 执行模式

TUI 支持 `/graph on` 开启 Graph 模式：

```sh
npm run cli:dev -- run --graph "实现两个独立 slice，整合后审查结果"
```

Graph 操作符使用隔离的 Git worktree 执行，因此源项目必须是一个干净的 Git worktree。

### Eval 基准测试

```sh
maka eval run <spec> --out <directory>
```

声明式多臂实验展开为 `任务 × 重复次数 × 主体` 的单元格网格，每个单元格有一次不可变尝试机会。

## 五、常见问题与解决方案

**Q：启动 Desktop 报错 "ripgrep not found"？**  
A：运行 `brew install ripgrep`，确保 `rg` 在 PATH 中。

**Q：Credential 相关警告？**  
A：`credential-vault.json` 存储在明文本地文件，依赖 OS 账户边界保护。确保目录权限为 `0700`，文件权限为 `0600`。

**Q：Legacy 会话历史丢失？**  
A：此版本不导入旧的 `File/JSONL` 记录 authority。有历史会话的用户需重新认证。

**Q：Windows 预览版无法运行？**  
A：Windows 签名预览版尚未正式支持，SmartScreen 提示正常，需 SHA-256 校验后再运行。

## 六、总结

Apache Maka 为 AI Agent 提供了一个真正以本地数据主权为核心的设计思路——不是把 LLM 当 API 调用，而是通过 Runtime Event Log 让每一次工具调用、每一个模型推理都变成可追溯、可恢复、可审计的事实。对于需要深度集成本地工具生态（文件系统、Shell、Git）的 Agent 场景，Maka 的架构值得深入研究。
