---
title: "Paperclip：用AI代理团队构建自主企业的开源编排平台"
date: 2026-08-10
description: "Paperclip是一个开源的AI代理编排平台，让用户能够像管理公司一样管理AI代理团队。通过组织架构、预算控制、治理审批和目标对齐，实现AI代理的自主协作，适合构建24/7自主运行的AI企业。"
author: "Cheman"
slug: paperclip
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["GitHub", "AI代理", "开源", "自动化", "企业工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Paperclip**，这是一个开源的AI代理编排平台，让用户能够像管理公司一样管理由多个AI代理组成的团队，实现自主企业的构建和运营。

## 一、项目概述

Paperclip 是一个 Node.js 服务器和 React UI，用于编排AI代理团队来运行业务。它的核心理念是：如果 OpenClaw 是一个"员工"，那么 Paperclip 就是"公司"。用户可以自带代理，分配目标，并从一个仪表板跟踪工作和成本。

**核心特性：**

- **AI代理团队管理**：支持OpenClaw、Claude Code、Codex、Cursor等多种代理运行时
- **组织架构与治理**：为AI代理建立角色、权限、汇报关系和预算控制
- **目标对齐**：每个任务都能追溯到公司使命，代理知道"做什么"和"为什么"
- **心跳机制**：代理按计划唤醒、检查工作并采取行动
- **成本控制**：每个代理有月度预算，超限时自动停止
- **多公司隔离**：一次部署可运行多个公司，完全数据隔离
- **移动端支持**：随时随地监控和管理自主业务

## 二、技术原理

### 2.1 架构设计

Paperclip 采用现代化的全栈架构，核心是一个完整的控制平面，而非简单的包装器：

```
┌──────────────────────────────────────────────────────────────┐
│                       PAPERCLIP SERVER                       │
│                                                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │Identity & │  │  Work &   │  │ Heartbeat │  │Governance │  │
│  │  Access   │  │   Tasks   │  │ Execution │  │& Approvals│  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
│                                                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Org Chart │  │Workspaces │  │  Plugins  │  │  Budget   │  │
│  │ & Agents  │  │ & Runtime │  │           │  │ & Costs   │  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 四大支柱系统

从源码结构可以看出，Paperclip 围绕四个核心支柱构建：

**1. 代理任务管理器**
- 任务、审批和审查门控
- 主动代理协作
- 可审计的例程和工作流
- 通过差异、截图和测试验证

**2. 代理组织架构**
- 混合人类+代理的组织架构
- 职责、委派、专业化
- 治理：谁能做什么
- 作用域密钥和公司边界

**3. 代理员工培训**
- Skill Studio 和组织级共享技能
- 评估和保存测试运行
- 主动学习循环和质量指标
- 代理绩效评估

**4. 代理操作系统**
- 跨提供商运行时：任何模型、任何代理
- 沙盒、集成和MCP服务器
- SSO、GRC、RBAC和成本控制
- 数据隐私、内部追踪收集

### 2.3 核心技术栈

从 `package.json` 可以看出项目的技术选型：

```json
{
  "name": "paperclip",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "packageManager": "pnpm@9.15.4",
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "vitest": "^4.1.10",
    "typescript": "^5.7.3"
  }
}
```

**关键技术栈：**
- **Node.js 20+**：现代化ES模块支持
- **TypeScript 5.7**：类型安全开发
- **Vitest 4.1**：快速单元测试框架
- **Playwright 1.61**：端到端浏览器测试
- **pnpm 9.15**：高效的包管理器

### 2.4 多适配器架构

从 `packages/adapters/` 目录结构可以看出，Paperclip 支持多种代理运行时：

```typescript
packages/adapters/
├── claude-local/        # Claude Code 本地适配器
├── codex-local/         # Codex 本地适配器
├── cursor-cloud/        # Cursor 云端适配器
├── cursor-local/        # Cursor 本地适配器
├── gemini-local/        # Gemini 本地适配器
├── grok-local/          # Grok 本地适配器
├── hermes/              # Hermes 适配器
├── hermes-gateway/      # Hermes 网关
├── openclaw-gateway/    # OpenClaw 网关
├── opencode-local/      # OpenCode 本地适配器
└── pi-local/            # PI 本地适配器
```

这种设计允许用户混合使用不同提供商的代理，只需实现标准的适配器接口即可接入。

### 2.5 心跳执行机制

心跳系统是 Paperclip 的核心创新，它允许代理按计划自动唤醒和工作：

```typescript
// 核心特性：
// 1. 数据库支持的唤醒队列，带合并
// 2. 预算检查
// 3. 工作区解析
// 4. 密钥注入
// 5. 技能加载
// 6. 适配器调用
// 7. 结构化日志、成本事件、会话状态
// 8. 自动恢复孤立运行
```

### 2.6 原子执行与持久化

从架构设计可以看出，Paperclip 解决了AI代理编排的关键难题：

```typescript
// 原子执行
- 任务检出和预算强制是原子的，避免重复工作和成本失控

// 持久化代理状态
- 代理在心跳间恢复相同的任务上下文，而非从头开始

// 运行时技能注入
- 代理可在运行时学习Paperclip工作流和项目上下文

// 治理与回滚
- 审批门控被强制执行，配置变更被版本化，可安全回滚
```

## 三、安装与快速开始

### 3.1 环境要求

- **Node.js 20+**
- **pnpm 9.15+**

### 3.2 一键安装（推荐）

```bash
curl -fsSLO https://paperclip.ing/install.sh
curl -fsSLO https://paperclip.ing/install.sh.sha256
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum -c install.sh.sha256
else
  shasum -a 256 -c install.sh.sha256
fi
bash install.sh
```

安装脚本会：
1. 确保Node.js 20+可用
2. 在 `~/.paperclip/cli` 安装托管CLI
3. 启动交互式引导流程

### 3.3 快速体验（无需永久安装）

```bash
npx --registry https://registry.npmjs.org paperclipai onboard --yes
```

这会启动受信任的本地回环模式，适合首次体验。

### 3.4 手动安装（开发者）

```bash
git clone https://github.com/paperclipai/paperclip.git
cd paperclip
pnpm install
pnpm dev
```

服务器将在 `http://localhost:3100` 启动，自动创建嵌入式PostgreSQL数据库。

### 3.5 Docker部署

从 `Dockerfile` 可以看到，Paperclip 提供了生产级Docker镜像：

```dockerfile
# 基础镜像
FROM node:lts-trixie-slim AS base

# 安装必要工具
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates gosu curl gh git wget ripgrep python3 \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

# 构建阶段
FROM base AS build
WORKDIR /app
# ... 构建过程 ...

# 生产阶段
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3100

EXPOSE 3100
CMD ["node", "server/dist/index.js"]
```

**Docker快速启动：**

```bash
# 拉取并运行
docker run -d \
  -p 3100:3100 \
  -v paperclip-data:/paperclip \
  paperclipai/paperclip:latest
```

## 四、使用方法与实战

### 4.1 基础用法：定义目标并分配任务

Paperclip 的使用流程类似管理真实公司：

**Step 1: 定义目标**

```
"构建#1 AI笔记应用，达到100万美元MRR"
```

**Step 2: 组建团队**

为团队分配角色：
- CEO：战略决策
- CTO：技术架构
- 工程师：代码实现
- 设计师：产品设计
- 营销人员：市场推广

可以为任何角色选择任何提供商的代理。

**Step 3: 审批并运行**

审查策略，设置预算，点击启动，从仪表板监控进度。

### 4.2 进阶用法：多代理协调

从README可以看到一个典型场景：

```markdown
❌ 没有Paperclip：
- 20个Claude Code标签页打开，无法跟踪哪个做什么
- 重启后丢失所有内容
- 手动从多个地方收集上下文提醒代理

✅ 使用Paperclip：
- 任务基于票据系统，会话线程化，跨重启持久化
- 上下文从任务向上流经项目和公司目标
- 代理始终知道做什么和为什么
```

### 4.3 预算控制与治理

Paperclip 提供了企业级的治理能力：

```typescript
// 预算控制
- 每个代理月度预算
- 达到限制时自动停止
- 管理层通过预算进行优先级排序

// 治理
- 董事会审批工作流
- 执行策略带审查/审批阶段
- 决策追踪
- 预算硬停止
- 代理暂停/恢复/终止
- 完整审计日志
```

### 4.4 插件系统扩展

Paperclip 支持实例级插件系统：

```typescript
// 插件特性
- 进程外工作器
- 能力门控主机服务
- 作业调度
- 工具暴露
- UI贡献

// 示例插件
packages/plugins/
├── plugin-llm-wiki/              # LLM知识库插件
├── plugin-workspace-diff/        # 工作区差异插件
├── paperclip-plugin-fake-sandbox/ # 沙盒插件
└── sdk/                          # 插件SDK
```

### 4.5 实际项目示例：自主AI企业

从路线图可以看出，Paperclip 已实现的功能包括：

```markdown
✅ 已实现：
- 插件系统
- OpenClaw代理员工
- 公司导入/导出
- AGENTS.md配置
- 技能管理器和技能商店
- 定期例程
- 更好的预算管理
- 代理审查和审批
- 多人类用户
- 云/沙盒代理
- 工件和工作产品
- 深度规划
- 强制结果
- MCP工具网关
- 密钥管理器
- 自愈运行

⚪ 计划中：
- 记忆/知识
- 最大化模式
- 工作队列
- 自组织
- 自动组织学习
- CEO聊天
- 桌面应用
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题1：E404错误 - paperclipai包未找到**

**原因：** 如果使用私有npm仓库（如GitHub Packages），npx可能从私有仓库解析而非公共仓库。

**解决方案：**

```bash
# 强制使用公共npm仓库
npx --registry https://registry.npmjs.org paperclipai onboard --yes

# 或检查当前仓库
npm config get registry
```

**问题2：Node.js版本过低**

**解决方案：**

```bash
# 检查Node.js版本
node --version

# 需要Node.js 20+，使用nvm升级
nvm install 20
nvm use 20
```

### 5.2 运行时错误

**问题1：数据库连接失败**

**原因：** Paperclip使用嵌入式PostgreSQL，可能需要特定权限。

**解决方案：**

```bash
# 确保数据目录有正确权限
mkdir -p ~/.paperclip/data
chmod 755 ~/.paperclip/data

# 或使用外部PostgreSQL
export DATABASE_URL="postgresql://user:pass@host:5432/paperclip"
pnpm dev
```

**问题2：端口3100已被占用**

**解决方案：**

```bash
# 查找占用端口的进程
lsof -i :3100

# 或使用其他端口
export PORT=3200
pnpm dev
```

### 5.3 性能问题

**问题1：多个代理运行缓慢**

**原因：** 资源竞争或预算检查过于频繁。

**解决方案：**

```typescript
// 调整心跳频率
// 在配置中设置合理的cron表达式
{
  "routines": {
    "schedule": "0 */2 * * * *",  // 每2小时一次
    "concurrency": 3               // 限制并发数
  }
}
```

**问题2：成本控制失效**

**解决方案：**

```typescript
// 确保预算策略正确配置
{
  "budgets": {
    "warning_threshold": 0.8,  // 80%警告
    "hard_stop": true,         // 硬停止
    "auto_pause": true         // 自动暂停代理
  }
}
```

### 5.4 兼容性

**问题1：特定代理适配器不工作**

**解决方案：**

```typescript
// 检查适配器状态
// 从packages/adapters/目录可以看到支持的代理
// 如果代理未列出，可以自己实现适配器接口

// 适配器接口示例（推断）
interface AgentAdapter {
  async heartbeat(context: RunContext): Promise<RunResult>;
  async checkHealth(): Promise<boolean>;
  async initialize(config: AgentConfig): Promise<void>;
}
```

**问题2：与现有工具集成**

**解决方案：**

```markdown
Paperclip不是替代品，而是编排层：

❌ 不是聊天机器人 → 代理有工作，没有聊天窗口
❌ 不是代理框架 → 不告诉你如何构建代理
❌ 不是工作流构建器 → 模拟公司，而非拖拽管道
❌ 不是提示管理器 → 代理自带提示、模型和运行时

✅ 使用场景：
- 协调多个不同代理（OpenClaw、Codex、Claude、Cursor）
- 运行20+个Claude Code终端
- 需要24/7自主运行
- 需要成本监控和预算强制
```

## 六、总结

Paperclip 是一个创新的开源平台，它将AI代理编排提升到了企业管理的层面。通过组织架构、预算控制、治理审批和目标对齐，Paperclip 让用户能够构建和运营由AI代理组成的自主企业。

**核心优势：**

1. **真正的编排**：不是简单的代理包装，而是完整的控制平面，包含身份、工作、心跳、治理、组织架构、预算等系统
2. **多代理协调**：支持OpenClaw、Claude Code、Codex、Cursor等多种代理运行时，可以混合使用不同提供商
3. **企业级治理**：预算控制、审批工作流、审计日志、多公司隔离，适合生产环境
4. **技术深度**：原子执行、持久化状态、运行时技能注入、治理回滚等解决了AI代理编排的关键难题
5. **开源可控**：MIT许可，自托管，无需Paperclip账户

**适用场景：**

- 想构建自主AI企业的创业者
- 协调多个不同代理的团队
- 有20+个Claude Code终端打开的开发者
- 需要24/7自主运行代理的场景
- 需要监控成本和强制预算的项目
- 想从手机管理自主业务的用户

**项目活跃度：**

从路线图可以看出，Paperclip 团队正在积极开发，已实现大部分核心功能，计划中的功能包括记忆/知识、自组织、CEO聊天等，显示了项目的长期愿景。

对于想探索AI代理协作和自主企业的开发者，Paperclip 提供了一个完整的、生产就绪的解决方案，值得深入研究和实践。
