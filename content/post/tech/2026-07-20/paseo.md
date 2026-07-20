---
title: "Paseo：一个接口掌控所有 AI 编程 Agent（Claude Code / Codex / Copilot）"
date: "2026-07-20"
description: "Paseo 是一个开源的本地 AI 编程 Agent 编排工具，通过统一接口同时管理 Claude Code、Codex、GitHub Copilot、OpenCode、Pi 等多种 Agent，支持跨设备控制与语音交互，隐私优先，无遥测无强制登录。"
author: "Cheman"
slug: paseo
draft: false
categories: ["技术", "开源"]
tags: ["AI", "编程工具", "开源", "Claude", "GitHub Copilot"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Paseo**，一个本地 AI 编程 Agent 编排工具，可以用同一个界面同时管理 Claude Code、Codex、GitHub Copilot、OpenCode 和 Pi 五种主流 AI 编程 Agent，跨设备控制、语音交互、隐私优先——听起来像是给 AI 编程装上了一个「指挥中心」。

## 一、项目概述

### 1.1 是什么

Paseo 的核心定位是**本地 AI 编程 Agent 的统一编排层**。它不自己写代码，而是充当调度者，让你用同一套命令和界面，同时或交替驱动多个不同提供商的 AI Agent。

典型使用场景：
- 用 Claude 规划架构，Codex 负责实现细节
- 手机上用语音口述任务，电脑上 Agent 在后台跑
- 给同一个任务同时跑多个 Agent，对比结果

### 1.2 核心特性

| 特性 | 说明 |
|------|------|
| **自托管** | Agent 运行在本地机器上，使用本地开发环境和配置，无数据泄露风险 |
| **多 Provider** | 统一接口管理 Claude Code、Codex、Copilot、OpenCode、Pi |
| **语音控制** | 语音模式下可以直接说话指挥 Agent，双手解放 |
| **跨设备** | iOS、Android、桌面、Web、CLI 均可连接同一守护进程 |
| **隐私优先** | 零遥测、无强制登录 |

### 1.3 基本架构

Paseo 采用经典的**守护进程（Daemon）+ 客户端（Client）** 架构：

```
┌─────────────────────────────────────────┐
│          Paseo Daemon (localhost)       │
│  ┌─────────────────────────────────┐    │
│  │   Agent Process Orchestration   │    │
│  │   WebSocket API                 │    │
│  │   MCP Server                    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
         ↕ WebSocket (本地/远程)
    ┌────┴────┬────────┬────────┐
   CLI    Desktop   Mobile   Web
```

守护进程通过 WebSocket API 对外暴露服务，客户端（桌面/移动/Web/CLI）均通过这个 API 与守护进程通信，支持本地直连或远程 Relay 穿透。

## 二、技术原理

### 2.1 Monorepo 结构

Paseo 使用 npm workspaces 组织 monorepo，packages 目录下包含多个独立子包：

```
packages/
├── server/      # 守护进程（Agent 编排、WebSocket API、MCP Server）
├── cli/         # 命令行工具
├── app/         # Expo 移动端应用（iOS/Android/Web）
├── desktop/     # Electron 桌面端
├── relay/       # 远程连接中继服务（Go 实现）
├── protocol/    # 共享协议定义
├── client/      # 统一 WebSocket 客户端库
├── highlight/   # 代码高亮组件
├── website/     # 文档和营销网站
└── expo-two-way-audio/  # 双向语音支持
```

各子包独立构建、独立发布，通过 `protocol` 包共享类型定义，保证前后端通信协议的一致性。

### 2.2 Agent 编排核心

Server 包负责最核心的 Agent 生命周期管理。启动时，Daemon 扫描本地已安装的 Agent CLI（Claude Code、Codex 等），建立进程池：

```javascript
// packages/server/src/agent-manager.ts（推断逻辑）
class AgentManager {
  async spawnAgent(provider: string, credentials: Credentials) {
    const agentProcess = spawn(agentBinaries[provider], ['--api-key', credentials.key], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...agentEnv }
    });
    return new AgentInstance(agentProcess);
  }
}
```

每个 Agent 实例通过 stdin/stdout 管道与 Daemon 通信，Daemon 负责：
- 转发任务指令
- 收集 Agent 输出流
- 管理 Agent 生命周期
- 处理多 Agent 并行协调

### 2.3 MCP Server 集成

Paseo Daemon 内置 MCP（Model Context Protocol）服务器，Agent 可以通过 MCP 调用 Paseo 提供的能力，例如查询其他 Agent 的运行状态、在 Agent 间传递上下文：

```javascript
// packages/server/src/mcp/server.ts
export function createMCPServer(agentManager: AgentManager) {
  return new SSEServerTransport('session', {
    // MCP 协议处理
    // 工具: list_agents, send_task, get_agent_output, ...
  });
}
```

### 2.4 Relay 远程穿透

packages/relay 用 Go 编写，提供远程设备穿透能力。部署后，手机等外网设备通过 Relay 中转 WebSocket 流量，访问本地局域网内的 Daemon，实现真正的跨设备无缝协作。

## 三、安装与快速开始

### 3.1 环境要求

- Node.js 18+
- 至少安装一种 Agent CLI：Claude Code / Codex / GitHub Copilot CLI / OpenCode / Pi
- 各 Agent 已配置好 API 凭证

### 3.2 桌面应用（推荐）

```bash
# 直接下载对应平台安装包
# https://paseo.sh/download
# 或从 GitHub Releases 获取：
# https://github.com/getpaseo/paseo/releases/latest
```

安装后打开应用，Daemon 自动启动，无需额外配置。

### 3.3 CLI 模式

```bash
# 安装 CLI
npm install -g @getpaseo/cli

# 启动（显示 QR 码，移动设备扫码连接）
paseo

# 在指定 Provider 上运行任务
paseo run --provider claude/opus-4 "实现用户认证模块"
paseo run --provider codex/gpt-5.4 --worktree feature-x "实现功能 X"
```

### 3.4 Docker 部署

```bash
docker run -d --name paseo \
  -p 6767:6767 \
  -e PASEO_PASSWORD=change-me \
  -v "$PWD/paseo-home:/home/paseo" \
  -v "$PWD:/workspace" \
  ghcr.io/getpaseo/paseo:latest
```

启动后访问 `http://localhost:6767` 即可使用 Web UI。

### 3.5 编译服务器

```bash
# 克隆项目
git clone https://github.com/getpaseo/paseo.git && cd paseo

# 安装依赖
npm install

# 开发模式（仅启动服务器）
npm run dev

# 编译所有包
npm run build
```

## 四、使用方法与实战

### 4.1 基础操作

```bash
# 列出当前运行中的所有 Agent
paseo ls

# 附加到运行中的 Agent，实时查看输出
paseo attach <agent-id>

# 向运行中的 Agent 发送后续任务
paseo send <agent-id> "再补充一下测试用例"
```

### 4.2 Skill 系统

Paseo 提供了多个内置 Skill，帮助 Agent 之间协同工作：

```bash
# 安装 Paseo Skill
npx skills add getpaseo/paseo

# 在 Agent 对话中可用以下 Skill：
# /paseo-handoff    — 在不同 Agent 之间交接任务
# /paseo-loop       — 让 Agent 循环执行直到满足验收标准
# /paseo-advisor   — 启动顾问 Agent 提供第二意见
# /paseo-committee  — 组建两个对立的 Agent 委员会做根因分析
```

实际场景示例——用 `/paseo-handoff` 实现 Agent 协作：
1. Claude 负责架构设计和详细规划
2. 规划完成后，通过 `/paseo-handoff` 将上下文交接给 Codex
3. Codex 在 Claude 的规划基础上实现代码

### 4.3 跨设备协作

手机扫码配对后，在手机上可以直接：
- 语音输入任务指令
- 监控 Agent 运行进度
- 随时发送新的任务

设备间的配对通过 Settings → Host → Connections → Pair a device 完成。

## 五、常见问题与解决方案

### 5.1 Agent CLI 未找到

Paseo 依赖本地已安装的 Agent CLI，如果提示找不到：
- 确认对应 CLI 已正确安装并配置了 API Key
- Claude Code 需要在本地完成 `claude code` 初始化配置
- Copilot CLI 需要 `gh copilot alias --setup` 配置别名

### 5.2 远程连接失败

手机无法连接桌面 Daemon 时：
- 确认手机和电脑在同一网络，或已配置 Relay 中继
- 检查 Daemon 端口（默认 6767）未被防火墙拦截
- 查看 Daemon 日志：`paseo logs`（CLI 模式）

### 5.3 语音模式无响应

语音功能依赖麦克风权限：
- iOS/Android：确认应用已授予麦克风权限
- 桌面端：确认系统隐私设置允许应用访问麦克风

### 5.4 Agent 输出乱码或中断

Agent 进程异常退出时，Daemon 会自动重连。若频繁中断：
- 检查 API Key 配额是否耗尽
- 增加 Agent 进程的内存限制
- 查看具体 Agent 的错误日志：`paseo attach <agent-id>`

## 六、总结

Paseo 是一个把「多 Agent 协作」这件事做到极致的开源工具。它的核心价值不在于替代某个 AI 编程工具，而在于**统一入口、消除切换成本**，让你可以在不同场景下自由选择最合适的 Agent，甚至让多个 Agent 同时为一个复杂任务协作。

隐私优先的设计理念也很值得关注——所有 Agent 运行在本地，数据不出机器，在当前各家 AI 工具云端化的趋势下，这种路线显得格外有诚意。如果你同时在用多个 AI 编程工具，Paseo 值得一试。

> 项目地址：[github.com/getpaseo/paseo](https://github.com/getpaseo/paseo)  
> 官网：[paseo.sh](https://paseo.sh)
