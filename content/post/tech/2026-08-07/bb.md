---
title: "bb：一个可以自我控制的智能 IDE，让你的编码代理协同作战"
date: 2026-08-07
description: "bb 是一个智能 IDE，支持多个编码代理协同工作，可通过桌面应用、Web 应用、CLI 和 HTTP API 控制。它采用线程式工作流，支持实时查看、随时干预和代理间交接。"
author: "Cheman"
slug: bb
draft: false
categories: ["技术", "开源工具"]
tags: ["IDE", "AI代理", "GitHub", "开源", "开发工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**bb**，这是一个可以自我控制的智能 IDE，让你能够无缝地协调多个编码代理共同工作。

## 一、项目概述

bb 是一个**智能 IDE（Agentic IDE）**，其核心特点是"可以控制自己"。它允许用户无缝协调多个编码代理协同工作，并通过编程方式使用 bb 本身。无论是桌面应用、Web 应用、命令行工具还是 HTTP API，都是驱动 bb 的第一类方式。

**核心特性：**

- **多代理协同**：支持将多个编码代理无缝编排在一起，让它们协同工作
- **自我控制**：bb 可以通过编程方式驱动自身，实现自动化工作流
- **线程式工作流**：所有工作都在线程中运行，可以实时查看、随时干预，或交接给其他代理
- **多种访问方式**：桌面应用、Web 应用、CLI 和 HTTP API 都是第一类接口
- **实时协作**：支持多个设备和代理之间的无缝交接

项目目前处于活跃开发阶段，核心架构稳定，但工作流和界面仍在快速演进。

## 二、技术原理

### 架构设计

bb 采用了**分层架构设计**，核心组件包括：

1. **App 层**（Vite 应用）：提供用户界面
2. **Server 层**（独立服务器）：处理业务逻辑和 API
3. **Host Daemon 层**：守护进程，负责系统级操作
4. **CLI 层**：命令行接口

这种分离式设计使得每个组件都可以独立运行和重启，便于开发调试：

```bash
# 应用层热重载
pnpm dev

# 仅重启服务器
pnpm dev:restart-server

# 仅重启守护进程
pnpm dev:restart-host-daemon
```

### 核心技术栈

- **Node.js >= 22.19.0**：使用最新的 JavaScript 运行时
- **Vite**：前端构建工具，支持热重载
- **Electron**：桌面应用封装
- **TypeScript 6/7**：使用最新的 TypeScript 版本
- **Vitest**：测试框架
- **Turbo**：Monorepo 构建工具
- **SQLite (better-sqlite3)**：本地数据存储
- **Zod 4.3.6**：数据验证

### 关键设计模式

#### 1. 源码条件解析（Source Condition）

bb 在整个项目中使用了 `source` 条件来确保在开发和测试时直接引用源码而非构建产物：

```typescript
// vitest.shared.ts
export function defineWorkspaceTestConfig(
  config: ViteUserConfig,
): ViteUserConfig {
  return mergeConfig(
    {
      resolve: {
        conditions: ["source"],
      },
      ssr: {
        resolve: {
          conditions: ["source"],
          externalConditions: ["source"],
        },
      },
    },
    config,
  );
}
```

这种设计确保了开发时的模块解析正确性，避免了构建产物的干扰。

#### 2. 异步优先原则

项目通过 ESLint 规则强制禁止使用同步的子进程 API：

```javascript
// eslint.config.mjs
const noBlockingChildProcessRules = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "node:child_process",
          importNames: ["spawnSync", "execSync", "execFileSync"],
          message:
            "Use async child_process APIs instead of blocking sync variants.",
        },
      ],
    },
  ],
};
```

这确保了所有 I/O 操作都是异步的，避免阻塞事件循环。

#### 3. 服务器-工作空间隔离

服务器层被严格限制直接访问工作空间文件系统，所有操作必须通过守护进程命令完成：

```javascript
const serverNoWorkspaceAccessRules = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "@bb/host-workspace",
          message:
            "Server must not access workspaces directly. Use daemon commands instead.",
        },
        {
          name: "node:fs",
          message:
            "Server must not use node:fs. Use daemon commands for workspace access.",
        },
      ],
    },
  ],
};
```

这种架构边界保证了当守护进程运行在远程主机时，系统仍然能正常工作。

### 数据流分析

工作流的核心是**线程（Thread）**概念：

1. **线程创建**：用户或代理发起任务，创建新的工作线程
2. **实时执行**：线程中的任务实时执行，用户可以查看进度
3. **干预点**：在任意时刻，用户可以暂停、修改或接管线程
4. **代理交接**：线程可以从一个代理交接给另一个代理
5. **多设备同步**：通过数据目录同步，支持多设备访问

每个 checkout 实例都有独立的数据目录：
```
~/.bb-dev/<checkout-instance>/
```

## 三、安装与快速开始

### 环境要求

- **操作系统**：
  - macOS Apple Silicon (arm64)：原生支持桌面应用
  - macOS Intel / Linux：通过 `npx` 运行
  - Windows：需要 WSL2（原生 PowerShell/CMD 不支持）
- **Node.js**：>= 22.19.0
- **包管理器**：pnpm 9.15.0

### 安装步骤

#### 方式一：桌面应用（推荐）

从 GitHub Releases 下载最新的桌面应用：

```bash
# 下载地址
https://github.com/get-bb/bb/releases/tag/desktop-latest
```

桌面应用目前仅支持 macOS Apple Silicon。Intel Mac 和 Linux 用户请使用 `npx` 方式。

#### 方式二：npx 运行（跨平台）

```bash
# 运行最新稳定版
npx bb-app@latest

# 运行最新开发版（Nightly）
npx bb-app@nightly
```

然后打开浏览器访问 `http://localhost:38886`。

#### 方式三：从源码构建

```bash
# 克隆仓库
git clone https://github.com/ymichael/bb.git
cd bb

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start
```

### 最简运行示例

```bash
# 1. 安装并运行
npx bb-app@latest

# 2. 打开浏览器
open http://localhost:38886

# 3. 配置你的 AI 提供商 CLI（如 Claude、OpenAI）
# bb 会自动检测已认证的提供商 CLI

# 4. 创建你的第一个线程，开始编码！
```

## 四、使用方法与实战

### 基础用法

#### 1. 创建工作线程

在 bb 中，所有工作都在**线程**中进行。每个线程代表一个独立的任务或工作流：

```bash
# 通过 CLI 创建线程
npx bb-app@latest

# 或使用桌面应用，点击"New Thread"
```

#### 2. 实时查看与干预

线程执行过程中，你可以：

- 实时查看代理的操作步骤
- 在任意时刻暂停线程
- 修改代理的指令
- 接管代理的操作
- 将线程交接给另一个代理

#### 3. 多代理协同

bb 的核心优势是**多代理编排**：

```bash
# 示例：让代理 A 完成代码编写，代理 B 进行代码审查
# 1. 创建线程，分配给代理 A
# 2. 代理 A 完成编写
# 3. 将线程交接给代理 B 进行审查
# 4. 代理 B 提出修改建议
# 5. 交接回代理 A 进行修改
```

### 进阶用法

#### 1. 远程访问

bb 支持从其他机器访问（如通过 Tailscale）：

```bash
# 启动开发服务器
pnpm dev

# 从其他机器访问
http://<remote-host-or-tailscale-ip>:<app-port>
```

开发服务器绑定所有网络接口，支持远程连接。

#### 2. 多实例并行

bb 支持多个实例并行运行：

```bash
# Stable 版本
npx bb-app@latest

# Nightly 版本（独立应用标识，黄色图标）
# 下载自：https://github.com/get-bb/bb/releases/tag/desktop-nightly

# 源码开发实例
pnpm dev
```

每个实例都有独立的数据目录，不会相互干扰。

#### 3. 数据管理

```bash
# 清除生产实例数据
pnpm reset

# 清除开发实例数据
pnpm reset:dev

# 清除所有实例数据
pnpm reset:all
```

#### 4. 遥测控制

bb 默认发送匿名使用遥测，帮助团队了解采用情况：

```bash
# 禁用遥测
BB_TELEMETRY=false npx bb-app@latest
```

遥测数据包括：
- 应用启动次数
- 线程创建计数
- 用户消息计数

**隐私保护**：不收集用户信息、主机名、项目路径、工作空间或消息内容。识别使用随机安装 ID。

### 实际项目示例

#### 场景：多代理协作重构代码库

```bash
# 步骤 1：启动 bb
npx bb-app@latest

# 步骤 2：创建重构线程
# 提示：请分析 src/utils 目录，识别重构机会

# 步骤 3：查看代理 A 的分析结果
# - 识别出 5 个重复的辅助函数
# - 发现 3 个过时的依赖

# 步骤 4：干预并调整方向
# 提示：优先处理重复函数，使用 Extract Class 模式

# 步骤 5：交接给代理 B 进行测试
# 提示：为重构后的代码编写单元测试

# 步骤 6：审查测试覆盖率，确认满足要求

# 步骤 7：提交代码（自动通过 Git 集成完成）
```

## 五、常见问题与解决方案

### 安装失败

#### 问题：`Could not locate the bindings file`

**原因**：原生模块（如 `better-sqlite3`）的二进制文件缺失，通常是因为 `npm` 配置了 `ignore-scripts=true`。

**解决方案**：

```bash
# 方法 1：临时允许安装脚本
npm_config_ignore_scripts=false npx bb-app@latest

# 方法 2：全局安装
npm_config_ignore_scripts=false npm install -g bb-app
bb-app
```

#### 问题：Node.js 版本不兼容

**原因**：bb 要求 Node.js >= 22.19.0。

**解决方案**：

```bash
# 使用 nvm 切换版本
nvm install 22
nvm use 22

# 或使用 nvm-sh
nvm install-latest-npm
```

### 运行时错误

#### 问题：Windows 原生不支持

**原因**：bb 目前不支持 Windows 原生 PowerShell 和 CMD。

**解决方案**：

```bash
# 1. 安装 WSL2
wsl --install

# 2. 在 WSL2 中运行 bb
wsl
npx bb-app@latest
```

#### 问题：端口冲突

**原因**：默认端口 38886 被占用。

**解决方案**：

```bash
# bb 会自动选择可用端口，查看启动日志获取实际端口
# 或手动停止占用端口的进程
lsof -i :38886
kill -9 <PID>
```

### 性能问题

#### 问题：首次启动较慢

**原因**：npx 需要下载包，原生模块需要编译。

**解决方案**：

```bash
# 使用全局安装避免重复下载
npm_config_ignore_scripts=false npm install -g bb-app
bb-app
```

#### 问题：内存占用高

**原因**：多个代理线程同时运行。

**解决方案**：

```bash
# 重置数据目录，清除旧线程
pnpm reset

# 或手动删除数据目录
rm -rf ~/.bb-dev/*
```

### 兼容性问题

#### 问题：Provider CLI 未检测到

**原因**：AI 提供商 CLI 未正确配置或认证。

**解决方案**：

```bash
# 确保 Claude CLI 已安装并认证
claude auth status

# 或配置 OpenAI CLI
openai auth status
```

#### 问题：Git 操作失败

**原因**：Git 未配置认证或 SSH。

**解决方案**：

```bash
# 配置 Git 用户信息
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 配置 SSH 密钥
ssh-keygen -t ed25519 -C "your@email.com"
ssh-add ~/.ssh/id_ed25519

# 测试连接
ssh -T git@github.com
```

## 六、总结

bb 代表了 IDE 的未来方向：**智能、协同、可控**。它不仅是一个代码编辑器，更是一个可以自我控制的智能代理平台。

**核心价值：**

1. **多代理协同**：无缝编排多个 AI 编码代理，各司其职
2. **自我驱动**：bb 可以通过 API 驱动自身，实现自动化工作流
3. **实时干预**：随时查看、暂停、修改或接管线程执行
4. **灵活访问**：桌面应用、Web、CLI、HTTP API 多种方式任选
5. **架构优雅**：分层设计、异步优先、严格边界控制

对于追求效率的开发者，bb 提供了一种全新的编码范式：**让 AI 代理成为你的编码伙伴，而不是工具**。从代码生成、审查、测试到重构，整个流程都可以在 bb 中无缝完成。

项目仍在快速演进中，核心架构稳定，值得关注和尝试。如果你正在寻找一个能够理解你的编码意图、并与其他 AI 工具无缝集成的 IDE，bb 绝对是一个值得深入探索的选择。

GitHub 地址：https://github.com/ymichael/bb
