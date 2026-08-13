---
title: "holaOS：一个让你和AI代理共享工作空间的本地优先操作系统"
date: 2026-08-14
description: "holaOS 是一个本地优先的桌面操作系统，让你可以在同一个工作空间中运行任意 AI 代理（Claude Code、Codex 等），共享内存、工具和文件，支持内置前沿模型或自带 API Key。"
author: "Cheman"
slug: holaos
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["GitHub", "开源", "AI代理", "Electron", "TypeScript", "本地优先"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**holaOS**，一个本地优先的桌面操作系统，让你和多个 AI 代理在同一个工作空间中协作，共享内存、工具和应用。

## 一、项目概述

### 项目定位

holaOS 是一个创新性的桌面应用，核心理念是"一个工作空间，任意代理"。它解决了当前 AI 代理生态中的一个关键痛点：不同代理之间无法共享上下文、工具和工作流。通过 holaOS，你可以在同一个环境中运行 Claude Code、Codex 或内置的 holaOS 代理，它们共享相同的内存、工具和技能。

### 核心特性

1. **多代理并行运行**：支持 Claude Code、Codex、holaOS 内置代理同时运行，无需切换环境
2. **统一共享内存**：所有代理共享同一份上下文和项目历史，存储为本地可读可编辑的纯文本文件
3. **灵活的模型选择**：内置 Kimi K3、GLM 5.2、GPT 5.6、Claude Opus 5 等前沿模型，也支持自带 OpenAI/Anthropic API Key
4. **HolaApps 生态**：应用市场中的应用以真实交互界面的形式与代理并排显示，而非纯聊天文本
5. **丰富的集成能力**：支持 Gmail、Notion、Slack、GitHub 等 50+ 服务的 OAuth 一键连接，以及 MCP 服务器扩展

## 二、技术原理

### 架构设计

holaOS 基于 Electron 构建跨平台桌面应用，采用 TypeScript 作为主要开发语言。从 `package.json` 可以看出项目采用 monorepo 结构，使用 Bun 作为包管理器，Turbo 作为构建工具：

```json
{
  "name": "hola-boss-oss",
  "packageManager": "bun@1.3.6",
  "workspaces": [
    "apps/*",
    "packages/*",
    "runtime/api-server",
    "runtime/channel-gateway",
    "runtime/harness-host",
    "runtime/harnesses",
    "runtime/state-store"
  ]
}
```

项目核心模块包括：

- **Runtime 层**：API Server、State Store、Harness Host、Channel Gateway
- **Apps 层**：桌面应用、文档站点
- **SDK 层**：App SDK 用于构建 HolaApps

### 本地优先内存系统

内存系统是 holaOS 的核心创新点。所有上下文、偏好和项目历史存储在本地文件中，采用结构化和嵌入式的存储方式：

- **持久化存储**：使用 better-sqlite3（trustedDependencies 中可见）进行本地数据库管理
- **可读可编辑**：用户可以直接查看和修改内存文件
- **跨代理共享**：所有代理实例共享同一内存实例，避免重复初始化

### HolaApps 架构

HolaApps 是 holaOS 的独特应用模型。每个应用都是一个真实的交互界面（如 Notion、浏览器），通过 App SDK 构建：

```bash
npm run sdk:app-sdk:build  # 构建 App SDK
npm run sdk:app-sdk:codegen  # 代码生成
```

应用可以：
- 作为独立窗口与代理并排显示
- 被 AI 代理直接驱动操作
- 通过 MCP 服务器扩展功能

### 多代理调度机制

项目提供了多种运行时管理脚本：

```bash
npm run runtime:start:isolated  # 隔离模式启动
npm run runtime:harness-host:build  # 构建代理运行环境
npm run runtime:state-store:build  # 构建状态存储
```

这表明 holaOS 使用隔离的 Harness 机制来运行不同代理，确保安全性和独立性，同时通过 State Store 共享状态。

## 三、安装与快速开始

### 一键安装（推荐）

对于 macOS、Linux 或 WSL 环境，使用官方安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/holaboss-ai/holaOS/refs/heads/main/scripts/install.sh | bash -s -- --launch
```

该脚本会自动：
1. 安装 Git 和 Node.js 24.14.1（如果缺失）
2. 克隆仓库到 `~/holaboss-ai`
3. 安装依赖并准备运行时
4. 启动桌面应用

### 手动安装

如果希望控制每个步骤：

```bash
# 1. 克隆仓库
git clone https://github.com/holaboss-ai/holaOS.git
cd holaOS

# 2. 安装依赖
npm run desktop:install

# 3. 创建环境文件
cp apps/desktop/.env.example apps/desktop/.env

# 4. 准备本地运行时
npm run desktop:prepare-runtime:local

# 5. 类型检查（可选）
npm run desktop:typecheck

# 6. 启动开发模式
npm run desktop:dev
```

### 环境要求

- Node.js（推荐 24.14.1+）
- Bun 1.3.6+
- 支持平台：macOS（Apple Silicon + Intel）、Windows、Linux

## 四、使用方法与实战

### 基础用法：启动并连接代理

1. 启动 holaOS 桌面应用
2. 登录账户（内置模型无需 API Key）
3. 选择要运行的代理（Claude Code、Codex 或 holaOS 内置）
4. 开始对话，代理自动共享内存和工具

### 进阶用法：自带 API Key

如果你更倾向使用自己的 OpenAI 或 Anthropic 账户：

1. 打开设置面板
2. 进入"模型配置"
3. 添加你的 API Key
4. 选择对应模型运行

这样计费走你自己的账户，而非 holaOS 计划。

### HolaApps 实战

从内置市场安装应用：

1. 打开工作区内的应用市场
2. 浏览或搜索应用（如 Notion、浏览器）
3. 一键安装
4. 应用会在代理旁边打开，可被代理直接操作

你还可以创建自定义 HolaApp：

```bash
# 指向任意 URL 和 MCP 服务器
# 应用运行在本地，完全由你控制
```

### 自动化与调度

holaOS 支持定时任务和触发器：

- 设置定时摘要报告
- 配置监控任务
- 自动生成并归档文件

## 五、常见问题与解决方案

### 安装失败

**问题**：一键安装脚本报错"command not found"

**解决方案**：确保系统已安装 curl 和 bash。macOS/Linux 通常已预装。WSL 用户需先安装基础工具：

```bash
sudo apt update && sudo apt install curl -y
```

**问题**：`npm run desktop:dev` 报错 Electron 无法打开

**解决方案**：运行验证步骤后按提示操作：

```bash
npm run desktop:typecheck
npm run desktop:prepare-runtime:local
```

如果仍有问题，检查 `.env` 文件配置是否正确。

### 运行时错误

**问题**：代理无法连接或响应缓慢

**解决方案**：
1. 检查网络连接
2. 如果使用 BYOK，确认 API Key 有效且有余额
3. 查看运行时日志：

```bash
npm run runtime:logs
```

**问题**：内存不持久化或丢失

**解决方案**：运行内存清理和评估：

```bash
npm run memory:cleanup
npm run memory:eval
```

### 性能问题

**问题**：应用启动慢或卡顿

**解决方案**：
1. 清理旧的构建产物：

```bash
npm run desktop:clean
npm run runtime:clean
```

2. 重新准备运行时：

```bash
npm run desktop:prepare-runtime:local
```

### 兼容性

**问题**：Windows 上 SQLite 原生模块构建失败

**解决方案**：重新构建 SQLite：

```bash
npm run runtime:rebuild-sqlite
```

**问题**：macOS Apple Silicon 上原生模块报错

**解决方案**：确保使用 Rosetta 兼容或原生 ARM 版本。项目已支持 Apple Silicon。

## 六、总结

holaOS 是一个极具创新性的本地优先 AI 工作空间。它通过统一的内存系统、灵活的模型选择和独特的 HolaApps 架构，解决了多代理协作的核心痛点。对于需要同时使用多个 AI 工具的开发者，holaOS 提供了一个"一次配置，全局共享"的高效解决方案。

项目采用 Modified Apache 2.0 许可证，支持自托管和企业部署。如果你正在寻找一个能整合多个 AI 代理的统一工作空间，holaOS 值得一试。

**项目地址**：https://github.com/holaboss-ai/holaOS
