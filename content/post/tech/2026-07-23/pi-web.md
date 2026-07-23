---
title: "Pi Web：为 pi 编程 agent 打造的浏览器工作空间"
date: "2026-07-23"
description: "Pi Web 是一个本地 Web UI，为 pi 编程 agent 提供浏览器端会话浏览、实时聊天、模型配置、技能管理和项目文件预览能力，让终端开发者也能享受图形化协作体验。"
author: "Cheman"
slug: pi-web
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI 编程", "Web UI", "Node.js"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Pi Web**，它为 `pi` 编程 agent 提供了一个完整的浏览器图形化工作空间，让原本在终端中运行的 AI 编程助手拥有了可交互的 Web 界面。

## 一、项目概述

Pi Web 是 [pi coding agent](https://github.com/badlogic/pi-mono) 的官方 Web 前端，由同一作者维护。它通过读取本地 pi 会话文件，将原本晦涩的终端输出转化为结构化的 Markdown 和可视化界面，主要解决以下几个痛点：

- **历史会话回溯困难**：编程 agent 往往产生大量长会话，终端翻页查找历史操作非常低效。Pi Web 提供项目维度的会话树，按时间轴清晰组织。
- **终端信息密度低**：结构化的工具调用、代码片段、文件预览在终端中展示受限，Web UI 则可以充分利用浏览器的能力。
- **配置操作繁琐**：模型切换、API Key 管理、技能开关等操作以往都需要修改配置文件，现在在 UI 中即可完成。
- **分支/分支探索受限**：想尝试不同的解决方向？在 UI 中可以 fork 会话、切换 Git worktree，比在终端里操作更直观。

核心特性一览：

| 功能 | 说明 |
|------|------|
| 会话浏览器 | 按项目、会话时间轴组织，可 fork、删除、导出 HTML |
| 实时聊天 | SSE 驱动，支持图片拖拽、工具调用实时渲染 |
| 文件预览 | 源码、diff、图片、音频、PDF、DOCX 等多种格式 |
| 模型配置 | 图形化管理 `models.json`，支持模型测试 |
| 技能管理 | Web UI 管理 pi agent 的 skills 安装与开关 |
| Git worktree | 侧边栏直接切换工作目录对应的 worktree |

## 二、技术原理

### 2.1 整体架构

Pi Web 基于 **Next.js 16 + React 19** 构建，采用 App Router 架构。服务端通过 Node.js 运行 pi agent 并暴露 SSE 端点，浏览器端实时消费事件并渲染聊天界面。

关键依赖：

```json
"dependencies": {
  "next": "16.2.9",
  "react": "^19.2.4",
  "@earendil-works/pi-agent-core": "^0.81.0",
  "@earendil-works/pi-ai": "^0.81.0",
  "@earendil-works/pi-coding-agent": "^0.81.0"
}
```

服务端核心 API 路由位于 `app/api/`：

```
api/agent/        — 创建并驱动 AgentSession，暴露 SSE 事件
api/auth/        — OAuth 和 API Key 管理
api/files/       — 文件列表、读取、预览、监听
api/sessions/    — 会话读取、重命名、删除、上下文获取、HTML 导出
api/models/      — 可用模型、默认模型、thinking 级别
api/models-config/ — 读写 models.json 和模型测试
api/skills/      — 技能列表、搜索、安装、启用/禁用
```

### 2.2 SSE 实时通信

聊天窗口通过 **Server-Sent Events（SSE）** 实现服务端推送，浏览器端在 `hooks/useAgentSession.ts` 中维护状态机：

```typescript
// 状态机核心逻辑（简化）
type SessionState = 'idle' | 'connecting' | 'connected' | 'streaming' | 'done';

function handleSSEMessage(event: MessageEvent) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case 'tool_call':
      renderToolCall(data.payload);   // 渲染工具调用块
      break;
    case 'tool_result':
      renderToolResult(data.payload); // 渲染工具返回
      break;
    case 'message':
      appendMarkdown(data.content);   // 追加 Markdown 消息
      break;
    case 'done':
      setState('done');
      break;
  }
}
```

### 2.3 会话文件解析

Pi Web 的会话数据存储在 `~/.pi/agent/sessions/` 目录下，按工作目录编码后组织：

```
~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl
```

`lib/session-reader.ts` 负责解析 `.jsonl` 文件和分支上下文：

```typescript
// 路径编码（lib/file-paths.ts）
import { encodePath } from '@/lib/file-paths';

const sessionDir = path.join(
  process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), '.pi/agent/sessions'),
  encodePath(projectPath)
);
// 结果如：~/.pi/agent/sessions/github_2Fpi-web/1749998400000_a1b2c3d4.jsonl
```

会话 fork 和分支：

- **Fork**：创建新的 `.jsonl` 文件（完全独立的会话链）
- **Edit from here**：在同一会话文件内创建分支（共享历史，新增路径）

### 2.4 HTTP 代理与安全

`lib/http-dispatcher.ts` 在服务端自动注入 `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY` 环境变量，确保 pi agent 在服务端调用大模型 API 时也能走用户配置的代理：

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { configureHttpDispatcher } = await import('@/lib/http-dispatcher');
  configureHttpDispatcher();
}
```

文件访问由 `lib/file-access.ts` 做安全边界限制，文件浏览和预览被限定在选定项目和会话中实际出现的工作目录内。

## 三、安装与快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn
- 已安装 pi coding agent（读取 `~/.pi/agent/sessions`）

### 安装方式

**方式一：直接运行（推荐，无需安装）**

```bash
npx @agegr/pi-web@latest
```

**方式二：全局安装**

```bash
npm install -g @agegr/pi-web
pi-web
```

服务启动后自动打开浏览器，访问 [http://localhost:30141](http://localhost:30141)。

### 常用参数

```bash
pi-web --port 8080              # 自定义端口
pi-web --hostname 127.0.0.1     # 仅本地访问
pi-web -p 8080 -H 127.0.0.1     # 组合使用
pi-web --no-open                # 不自动打开浏览器

# 环境变量方式
PORT=8080 pi-web
PI_WEB_NO_OPEN=1 pi-web        # 适合后台运行
```

### 代理配置（可选）

如果需要通过代理访问模型 API（常见于国内环境），启动时设置环境变量：

```bash
# macOS / Linux
HTTP_PROXY=http://127.0.0.1:7890 \
HTTPS_PROXY=http://127.0.0.1:7890 \
NO_PROXY=localhost,127.0.0.1 \
npx @agegr/pi-web@latest

# Windows PowerShell
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:NO_PROXY = "localhost,127.0.0.1"
npx @agegr/pi-web@latest
```

### 本地开发

```bash
git clone https://github.com/agegr/pi-web.git
cd pi-web
npm install
npm run dev
# 本地开发服务器：http://localhost:30141
```

代码检查：

```bash
node_modules/.bin/tsc --noEmit  # TypeScript 类型检查
npm run lint                      # ESLint 检查
```

## 四、使用方法与实战

### 4.1 会话浏览与管理

启动后，左侧边栏会展示 `~/.pi/agent/sessions` 中的历史会话，按项目分组。选中一个会话后，右侧聊天区域会加载完整对话历史，包含工具调用和结果。

**Fork 会话**：想尝试不同的解决方向？点击会话的 fork 按钮，系统会创建一个新的独立会话文件，历史对话完全保留，但后续操作互不影响。

**Edit from here**：在同一会话内从某条消息继续，但分叉出另一条路径，适合"先试试这个方案，不行再回退"的场景。

### 4.2 实时协作

在聊天窗口输入框中键入指令，pi agent 会通过 SSE 实时推送处理过程，包括思考链路（thinking）、工具调用、工具结果等，每一步都在浏览器中清晰呈现。

### 4.3 文件浏览与预览

左侧文件树可以浏览当前项目结构，点击任意文件可在右侧预览区直接查看。支持格式：

- 源码文件（语法高亮）
- 图片（直接渲染）
- PDF（可翻页预览）
- DOCX（mammoth.js 转换渲染）
- Markdown（结构化渲染）
- Mermaid 图表（实时渲染）

### 4.4 Git worktree 切换

在会话侧边栏顶部选择 Git worktree，系统会自动切换文件浏览和 agent 工作目录的上下文。对于同时维护多个分支的开发者，这个功能非常实用——无需在终端里频繁 `git checkout`，在 UI 中点击即可。

### 4.5 模型与技能管理

顶部状态栏显示当前会话的上下文用量、费用和压缩状态。点击模型配置图标可以：

- 切换默认模型
- 管理 API Key（auth 面板）
- 测试模型响应
- 开启/关闭 thinking 层级

技能面板（Skills Config）允许在不修改配置文件的情况下，通过 UI 安装、启用或禁用 pi agent 的各类技能插件。

## 五、常见问题与解决方案

**Q: 启动后浏览器没有自动打开？**
> 确保系统有默认浏览器。如果使用无头环境或 SSH 远程连接，使用 `pi-web --no-open` 手动访问 http://localhost:30141。

**Q: 会话文件没有出现在侧边栏？**
> 检查 pi agent 是否已运行并产生了会话文件。Pi Web 默认读取 `~/.pi/agent/sessions/`，可通过设置 `PI_CODING_AGENT_DIR` 环境变量指向其他目录。

**Q: 文件预览区一片空白？**
> 文件访问被限定在当前项目和会话中出现的工作目录范围内，如果文件不在这些路径下则无法预览。这是有意设计的安全边界。

**Q: 模型 API 请求失败？**
> 检查是否需要配置代理。如果通过公司网络或在国内使用大模型 API，通常需要设置 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量（如上所示）。

**Q: 想切换到其他 pi agent 目录？**
> 在启动前设置 `PI_CODING_AGENT_DIR`，例如 `PI_CODING_AGENT_DIR=/path/to/other/pi npx @agegr/pi-web@latest`。

**Q: TypeScript 类型检查报错？**
> 运行 `node_modules/.bin/tsc --noEmit` 查看具体错误。本地开发时 Next.js dev server 通常可以正常热加载，dev 模式下的类型提示依赖 IDE。

## 六、总结

Pi Web 为命令行原生的 pi 编程 agent 补全了图形化这一环——它不改变 agent 本身的能力，而是将终端中难以驾驭的长会话、复杂工具调用和配置管理，转化为了一个浏览器中直观可操作的工作空间。如果你已经在使用 pi coding agent，Pi Web 是一个值得一试的配套工具；如果你还没有用过 pi，它也提供了一个低门槛的入口，让你可以在浏览器里直接体验 AI 编程的魅力。

项目地址：[https://github.com/agegr/pi-web](https://github.com/agegr/pi-web)
