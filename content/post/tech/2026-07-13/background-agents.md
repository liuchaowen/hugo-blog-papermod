---
title: "Open-Inspect：开源背景编码代理系统，让 AI 替你做开发"
date: 2026-07-13
description: "Open-Inspect 是一个受 Ramp Inspect 启发的开源背景编码代理系统，支持多客户端接入（Web、Slack、GitHub、Linear）、并行子任务沙箱、完整开发环境，以及 PR 归属追溯。深度解析其架构设计与安全模型。"
author: "Cheman"
slug: background-agents
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 编程助手, Cloudflare, 架构设计]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Open-Inspect**，一个开源的背景编码代理系统，灵感直接来自 Ramp 内部使用的 Inspect 系统。它可以让你在后台运行 AI 编码任务，同时继续处理其他工作，并从 Web、Slack、GitHub PR、Linear Issues 等多个渠道发起任务。

## 一、项目概述

Open-Inspect 是一个托管式的后台编程代理，与传统在线 IDE 不同，它的核心理念是"后台作业"——你发起任务，AI 在沙箱中静默工作，完成后通过你指定的渠道推送结果。

核心特性包括：

- **后台运行**：AI 在独立沙箱中工作，你无需盯着界面等待
- **全开发环境**：Node.js、Python、git、浏览器自动化、VS Code 一应俱全
- **多渠道接入**：Web UI、Slack、GitHub PR 评论、Linear Issues、Webhooks 均可发起任务
- **多人协作**：多人可同时参与同一会话，commit 归属到各自的 GitHub 账号
- **定时自动化**：Cron 调度、Sentry 告警、Webhook 触发，支持多仓库并行 fan-out
- **多模型支持**：Anthropic Claude、OpenAI GPT 系列、OpenCode Zen（Kimi、Qwen 等）

## 二、技术原理

### 2.1 整体架构

系统分为**控制平面**和**数据平面**两部分：

```
控制平面（Cloudflare Workers + Durable Objects）
├── SQLite DB（会话状态）
├── WebSocket Hub（实时协作）
├── Event Stream（事件流）
└── GitHub Integration（凭证代理）

数据平面（沙箱后端）
└── Session Sandbox
    ├── Supervisor（任务协调）
    ├── OpenCode（AI 运行时）
    └── Bridge（与控制平面通信）
```

**控制平面**基于 Cloudflare Workers + Durable Objects 构建，每个会话对应一个 Durable Object，持有 SQLite 数据库和 WebSocket 连接。GitHub 操作通过共享 GitHub App 安装进行代理，凭证通过 git credential helper 按需向沙箱下发短时 Token。

**数据平面**是真正的执行环境，基于 Modal、Daytona、Vercel Sandbox 等多种沙箱后端之一运行。沙箱内预装了 Node.js 22、Python 3.12、Bun、git、GitHub CLI，以及用于 UI 验证的 headless Chromium。

### 2.2 Token 架构与安全模型

> **重要提示**：Open-Inspect **专为单租户部署设计**，适用于公司内部所有成员互信的场景。

Token 体系如下：

| Token 类型 | 用途 | 权限范围 |
|---|---|---|
| GitHub App Token | 代理 git clone/fetch/push | App 安装的所有仓库 |
| User OAuth Token | 创建 PR（确保归属） | 用户有写权限的仓库 |
| Sandbox Auth Token | 沙箱→控制平面 API 调用 | 单会话 |
| WebSocket Token | 实时协作认证 | 单会话 |

所有用户共享同一个 GitHub App 凭证，这意味着**系统无法在会话创建时验证用户对特定仓库的访问权限**。对于多租户场景，需要为每个租户单独安装 GitHub App 并在会话创建时进行权限校验。

部署建议：
- 在公司 SSO/VPN 后面部署
- GitHub App 仅安装在必要的仓库（而非"所有仓库"）
- 配置 `ALLOWED_GITHUB_ORGS` 限制可登录的 GitHub 组织成员

### 2.3 快速启动的秘密：多层预热

会话冷启动是个痛点，Open-Inspect 通过三层机制实现近乎即时的启动：

1. **文件系统快照**：每次 prompt 后保存沙箱状态，后续会话恢复而非重新 clone
2. **预构建镜像**：可按仓库或按"环境"（一组仓库 + 专属密钥）开关预构建镜像，每 30 分钟更新一次
3. **主动预热**：用户开始输入时沙箱就提前启动，敲完回车时已经就绪

### 2.4 子任务并行化

代理可以分解工作并并行启动子会话：

```typescript
// 父代理中并行启动多个子任务
await spawnTask({ description: "实现后端 API", repo: "backend" });
await spawnTask({ description: "写前端组件", repo: "frontend" });

// 父代理继续处理其他工作
const status = await getTaskStatus(childTaskId);
```

每个子任务在独立沙箱中运行，父代理在主沙箱继续工作，互不阻塞。

### 2.5 代码归属追溯

关键的安全设计：commit 归属到发起 prompt 的用户：

```typescript
// 每个 prompt 都附带用户身份
await configureGitIdentity({
  name: author.scmName,
  email: author.scmEmail,
});
// 此后该沙箱内所有 git 操作都会带上用户信息
```

对于使用 GitHub OAuth 登录的用户，PR 通过用户自己的 OAuth Token 创建，确保归属正确。

## 三、安装与快速开始

### 3.1 环境要求

- Node.js ≥ 22.0.0
- Wrangler（Cloudflare Workers CLI）
- 沙箱后端账号（Modal / Daytona / Vercel / OpenComputer 四选一）
- GitHub App（用于 git 操作）
- D1 数据库（Cloudflare D1，用于存储仓库级密钥）

### 3.2 获取项目

```bash
git clone https://github.com/ColeMurray/background-agents.git
cd background-agents
npm install
```

### 3.3 初始化配置

详细配置见 `docs/SETUP_GUIDE.md`，核心步骤：

```bash
# 1. 配置 Wrangler
cp packages/control-plane/wrangler.toml.example packages/control-plane/wrangler.toml
# 编辑 wrangler.toml，填入 D1 DATABASE ID、CLOUDflare Account ID

# 2. 部署控制平面
cd packages/control-plane
npx wrangler deploy

# 3. 配置环境变量
# 设置沙箱后端（MODAL_TOKEN / DAYTONA_API_KEY / VERVAL_TOKEN / OPENCOMPUTER_API_KEY）
# 设置 GitHub App 凭证
# 设置 OPENINSPECT_CONTROL_PLANE_URL
```

### 3.4 沙箱后端选择

Open-Inspect 支持四种沙箱后端，选择取决于你的需求：

| 后端 | 特点 |
|---|---|
| Modal | 冷启动快，支持 GPU |
| Daytona | 专注云端开发环境 |
| Vercel Sandbox | 与 Vercel 生态集成好 |
| OpenComputer | 开源沙箱方案 |

仓库内已包含各后端的部署配置，文档路径：`packages/<backend>-infra/`

## 四、使用方法与实战

### 4.1 Web UI 基础用法

部署完成后访问控制平面的 URL，进入 Web UI：

1. 点击 **New Session** 选择仓库（或多仓库）
2. 输入 prompt，如"帮我写一个用户注册接口"
3. AI 在沙箱中工作，实时流式输出到终端面板
4. 完成后来到 git panel，review 改动，一键提交 PR

### 4.2 Slack 协作

安装 Slack App 后，在任意频道 `@mention` 机器人即可启动任务：

```
/openinspect 帮我分析这个 PR 的测试覆盖率
```

结果以线程形式回复，包含终端输出和 PR 链接。

### 4.3 Linear Issue → 编程任务

在 Linear Issue 中 @mention agent 或直接分配，agent 会：
1. 拉取 Issue 描述
2. 创建沙箱会话
3. 完成开发后创建 PR
4. 在 Issue 中回写活动记录（进度更新、PR 链接）

### 4.4 定时自动化

在设置中创建 Cron 自动化任务：

```yaml
# 示例自动化配置
trigger:
  kind: cron
  schedule: "0 9 * * 1-5"  # 工作日早9点
repositories:
  - owner/repo
actions:
  - kind: analyze-and-pr
    prompt: "检查依赖是否有安全漏洞，更新到最新补丁版本"
```

每个仓库单独开一个会话处理，支持最多 10 个仓库并行 fan-out。连续失败 3 次自动暂停，等待人工介入。

### 4.5 环境（Environments）

将一组仓库 + 对应密钥保存为命名环境，之后可一键启动：

```typescript
// 创建环境
await environments.create({
  name: "fullstack-app",
  repositories: ["myorg/frontend", "myorg/backend", "myorg/shared"],
  secrets: {
    DATABASE_URL: "...",
    API_KEY: "..."
  },
  prebuiltImage: true  // 启用预构建加速
});

// 从环境启动会话
await sessions.create({ environment: "fullstack-app" });
```

## 五、常见问题与解决方案

**Q: 沙箱启动失败，提示 `Sandbox timeout`**
A: 检查沙箱后端账号余额和 API 权限。如果是 Modal，确认 Token 有足够配额；如果是 Daytona，确认企业账号已激活。对于冷启动，可以开启对应仓库的预构建镜像（Settings → Images）。

**Q: Git push 提示权限不足**
A: 确认 GitHub App 已安装到目标仓库，并且 App 的安装范围包含该仓库。注意系统不支持在会话创建时动态验证用户权限，需确保 App 安装范围与实际需要访问的仓库一致。

**Q: 如何限制用户只能访问特定仓库？**
A: 在部署时设置 `ALLOWED_GITHUB_ORGS` 环境变量，限制可登录的 GitHub 组织成员。另外在安装 GitHub App 时，选择"仅特定仓库"而非"所有仓库"。

**Q: commit 归属显示的是 bot 而非用户**
A: 这通常发生在用户使用 Google 等非 GitHub OAuth 方式登录时（此时没有 SCM Token），PR 回退到共享 GitHub App bot 账号。解决方案是要求团队成员统一使用 GitHub OAuth 登录。

**Q: 自动化任务触发后没反应**
A: 查看控制平面的 D1 数据库中该自动化的历史记录（runs），确认触发条件（cron / webhook / Sentry）配置正确，WebSocket 连接是否正常。

## 六、总结

Open-Inspect 将 Ramp 在内部实践验证过的背景代理方案开源，为开发者提供了一套完整的多渠道、多人协作 AI 编程基础设施。它在架构上兼顾了灵活性（多沙箱后端、多 AI 模型）和安全性（单租户约束、凭证隔离），特别适合团队内部希望将 AI 编程能力嵌入现有工作流的场景。

最大的亮点是**多客户端集成**——Slack / GitHub / Linear 的深度集成让 AI 编程不再是"打开网页，用聊天框打字"的单一体验，而是融入到团队日常协作的每个触点。如果你所在团队已经在使用这些工具，Open-Inspect 值得一试。
