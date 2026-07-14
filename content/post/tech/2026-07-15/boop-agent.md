---
title: "Boop：基于 iMessage 的个人 AI 助手，无需 API Key 即可运行 Claude 或 Codex"
date: 2026-07-15
description: "Boop 是一个开源的 iMessage 个人 AI 助手，支持 Claude Code 或 Codex/ChatGPT 订阅认证，无需额外 API Key。内置分层记忆、自动化任务、Composio 集成（Gmail、Slack、GitHub 等 1000+ 工具），可选本地浏览器控制和 Apple 数据源，适合个人使用和二次开发。"
author: "Cheman"
slug: boop-agent
draft: false
categories: ["技术", "开源", "AI", "Agent"]
tags: ["GitHub", "开源", "AI助手", "iMessage", "Claude", "Codex", "自动化", "Composio"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Boop**，一个基于 iMessage 的个人 AI 助手框架，核心亮点是直接使用 Claude Code 或 Codex 订阅认证，无需购买额外 API Key 即可运行。

## 一、项目概述

Boop 是一个 iMessage 驱动的个人 AI 助手架构，你只需通过短信与 AI 交互，就能完成邮件处理、日程查询、代码辅助、自动化提醒等任务。项目支持两种运行时：

- **Claude 运行时**：基于 Claude Agent SDK，使用你的 Claude Code 订阅认证
- **Codex 运行时**：基于本地 `codex app-server`，使用 ChatGPT/Codex 订阅认证

核心特性包括：

- **iMessage 双向通信**：通过 Sendblue 实现短信收发，支持打字提示、去重、签名验证
- **调度器 + 执行器架构**：交互代理（dispatcher）负责对话决策，执行代理（executor）负责具体任务，职责分离
- **分层记忆系统**：短时/长时/永久记忆，支持向量检索（Voyage/OpenAI 嵌入或本地 BGE-large）
- **自动化任务**：支持自然语言定义周期任务（如"每天早上 8 点总结我的日历"），结果推送到 iMessage
- **Composio 集成**：一个 API Key 解锁 1000+ 工具（Gmail、Slack、GitHub、Linear、Notion 等）
- **本地浏览器控制**（可选）：Patchright 驱动的 Chrome profile，支持登录态复用和可视化操作
- **本地 Apple 数据源**（可选，仅 Mac）：读取本地 iMessage、Apple Notes、Apple Reminders
- **调试仪表盘**：React + Vite 实时展示对话、代理执行、记忆图谱、自动化任务、连接状态

## 二、技术原理

### 2.1 架构设计

整体采用 **调度器 + 执行器** 分离架构，交互代理只负责对话和决策，执行代理负责具体任务，保证职责单一：

```
iMessage → Sendblue webhook → Interaction agent (dispatcher)
                                      │
                                      ├─ recall / write_memory
                                      ├─ spawn_agent(task, integrations)
                                      │
                                      ▼
                              Execution agent + integrations
                                      │
                                      ▼
                                   Memory (Convex)
```

核心组件：

- **Interaction Agent**（`server/interaction-agent.ts`）：前端门面，处理消息、召回记忆、创建自动化、决策是否 spawn 子代理
- **Execution Agent**（`server/execution-agent.ts`）：任务执行器，加载指定的 Composio 工具集，返回精确答案
- **Memory**（`server/memory/`）：三层记忆（short/long/permanent），后置提取、衰减、清理，存储在 Convex
- **Automations**（`server/automations.ts`）：轮询到期任务，spawn 执行代理运行，推送结果到用户
- **Integrations**：Composio 提供的第三方工具集，通过 MCP 协议封装，按需加载

### 2.2 运行时适配

Boop 支持双运行时，通过 `BOOP_RUNTIME` 环境变量切换：

**Claude 运行时**（默认）：
- 使用 `@anthropic-ai/claude-agent-sdk`
- 从 Claude Code 登录态读取认证信息
- 支持 `claude-sonnet-4-6`、`claude-opus-4` 等模型
- 通过 `createSdkMcpServer` 将 Composio 工具封装为 MCP server

**Codex 运行时**：
- 使用本地 `codex app-server`（需先运行 `codex login`）
- 支持 `gpt-5.5` 等模型（通过 `BOOP_CODEX_MODEL` 配置）
- 运行时工具通过 Boop 的动态适配器提供

### 2.3 记忆系统设计

三层记忆结构：

1. **Short Memory**：临时对话上下文，快速衰减
2. **Long Memory**：持久化记忆，向量检索
3. **Permanent Memory**：关键事实（用户偏好、重要配置）

技术细节：

- **向量检索**：支持 Voyage/OpenAI 嵌入，或本地 BGE-large（~1.3GB，需下载）
- **后置提取**：每轮对话结束后自动提取结构化记忆
- **记忆合并**：每日运行三方对抗式流水线（proposer → adversary → judge），合并重复、解决矛盾、清理噪声
- **存储**：Convex 实时数据库，支持订阅更新

### 2.4 Composio 集成机制

Boop 通过 Composio 统一管理第三方集成：

```typescript
// 伪代码示例
composio.create(BOOP_USER, { toolkits: ["gmail"] })
  .then(session => session.tools())
  .then(tools => createSdkMcpServer({ name: "gmail", tools }))
```

关键特性：

- **按需加载**：每次 spawn 子代理时只加载指定的工具集（如 `integrations: ["gmail", "slack"]`）
- **OAuth 托管**：Composio 托管 OAuth 应用，自动处理 token 刷新
- **多账户支持**：一个工具集可连接多个账户（工作邮箱 + 个人邮箱）
- **身份解析**：连接卡片显示通过工具自身 API 解析的账户身份

### 2.5 本地浏览器控制（可选）

当启用 Local browser use 时，Boop 使用 Patchright 驱动持久化 Chrome profile：

```typescript
// browser/launcher.ts 核心逻辑
const browser = await patchright.launch({
  channel: 'chrome',
  userDataDir: BOOP_BROWSER_PROFILE_DIR,
  headless: !BOOP_BROWSER_SHOW_UI,
  args: BOOP_BROWSER_EXTRA_ARGS
});
```

适用场景：

- 需要登录态的网站（无 API 可用）
- 视觉化浏览器工作流
- 反爬虫敏感页面

安全设计：

- 浏览器控制路由仅限 `localhost`，公共隧道流量拒绝访问
- 不存储第三方密码或 OAuth token
- `browser_fill` 工具在日志中自动脱敏输入值

## 三、安装与快速开始

### 3.1 环境要求

必需服务：

| 服务 | 用途 | 免费方案 |
|------|------|----------|
| Claude Code 或 Codex | AI 运行时 | 需订阅 |
| Sendblue | iMessage 桥接 | 免费计划（Agent 专用） |
| Convex | 数据库 | 免费层足够 |
| Composio（可选） | 第三方集成 | 免费层覆盖个人使用 |
| ngrok 或类似隧道 | 暴露本地端口 | 免费层可用（URL 会变） |

### 3.2 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/raroque/boop-agent.git
cd boop-agent
npm install

# 2. 安装运行时（二选一）
npm install -g @anthropic-ai/claude-code
claude  # 登录，然后 Ctrl-C 退出
# 或
npm install -g @openai/codex
codex login

# 3. 交互式配置（生成 .env.local，创建 Convex 部署）
npm run setup

# 4. 安装 ngrok（如未安装）
brew install ngrok  # macOS
# 或从 https://ngrok.com/download 下载
ngrok config add-authtoken <your-token>

# 5. 启动全部服务（server + Convex + debug UI + ngrok）
npm run dev
```

启动后会看到类似输出：

```
════════════════════════════════════════════════════════════════════
  Boop is ready — ngrok tunnel is live.

  🐶 Debug dashboard (click me):   http://localhost:5173
  🌐 Public URL:                   https://abc123.ngrok-free.app
  📮 Sendblue webhook (inbound):   https://abc123.ngrok-free.app/sendblue/webhook
  📱 Text this Sendblue number:    <sendblue-number>  (from a DIFFERENT phone)
════════════════════════════════════════════════════════════════════
```

从**另一台手机**发送短信到 Sendblue 号码，即可开始对话。

### 3.3 桌面应用（可选）

Boop 提供独立桌面应用，可从 Dock 启动：

```bash
# 配置、构建并安装到 /Applications
npm run desktop:setup
```

桌面应用将运行时数据存储在 `~/Library/Application Support/Boop/runtime`，保持应用包清洁。

## 四、使用方法与实战

### 4.1 基础对话

通过 iMessage 与 Boop 对话，体验类似与人聊天：

```
用户：今天日历上有什么安排？
Boop：轻松的一天，只有下午 2 点和 Sarah 的会议...

用户：帮我给 team@company.com 发邮件，主题是"项目进度更新"
Boop：我已经准备好草稿，确认发送吗？
    [草稿预览]
用户：确认
Boop：邮件已发送。
```

### 4.2 自动化任务

通过自然语言创建周期任务：

```
用户：每天早上 8 点总结我的日历并推送到这里
Boop：已创建自动化任务，明天 8:00 开始执行。
```

在调试仪表盘的 Automations 标签查看执行历史和状态。

### 4.3 启用第三方集成

1. 获取 Composio API Key：[app.composio.dev/developers](https://app.composio.dev/developers)
2. 添加到 `.env.local`：
   ```
   COMPOSIO_API_KEY=sk-comp-...
   ```
3. 打开调试仪表盘 → Connections 标签
4. 点击工具集旁的 **Connect**，完成 OAuth 授权
5. 立即可用，无需重启

### 4.4 本地浏览器控制（可选）

适用于需要登录态或视觉化操作的场景：

1. 调试仪表盘 → Settings → Local browser use
2. 启用 Local browser use
3. 选择是否显示浏览器 UI（headless 模式）
4. 点击 Install Patchright browser（首次使用）
5. 启用 Spawn login instance 以支持手动登录交接

## 五、常见问题与解决方案

### 5.1 安装与配置

**Q: `VITE_CONVEX_URL is not set` 错误？**
A: 运行 `npx convex dev` 手动部署 Convex 函数，确保 `.env.local` 中有 `VITE_CONVEX_URL`。

**Q: "Could not find public function for X:Y" 错误？**
A: `.env.local` 中的 `CONVEX_DEPLOYMENT` 和 `VITE_CONVEX_URL` 指向不同项目。确保 URL 名称与部署名称匹配，重新运行 `npm run setup` 会自动同步。

**Q: Claude SDK 提示无凭据？**
A: 运行 `claude` 一次并登录，或在 `.env.local` 中设置 `ANTHROPIC_API_KEY`。

**Q: Codex 提示无凭据？**
A: 运行 `codex login`，或设置 `BOOP_CODEX_AUTH_HOME` 指向包含 `auth.json` 的 Codex home。

### 5.2 Sendblue 相关

**Q: 代理不回复消息？**
A:
- 检查服务器运行状态：`curl http://localhost:3456/health`
- 检查 Sendblue webhook 是否指向 `<public-url>/sendblue/webhook`
- 查看服务器日志中的 `[sendblue]` 和 `[interaction]` 消息

**Q: "Cannot send messages to self" 或 "missing required parameter: from_number"？**
A: `SENDBLUE_FROM_NUMBER` 被错误设置为个人手机号。运行 `npm run sendblue:sync` 自动从 Sendblue CLI 拉取正确号码。

**Q: 文本停止到达？**
A: 运行 `npm run sendblue:webhook:check` 检查 webhook 注册状态是否与活动隧道匹配。

### 5.3 集成与浏览器

**Q: 代理回复但无法使用集成？**
A:
- 检查 `.env.local` 中有 `COMPOSIO_API_KEY`
- 检查 Connections 标签中工具集显示为 **Connected**
- 查看服务器日志中的 `[composio] registered ...` 和 `[integrations] unknown integration: ...`

**Q: 代理说 Local browser use is off？**
A: 在调试仪表盘 → Settings → Local browser use 中启用。未启用时代理看不到 `browser` 集成。

**Q: 浏览器启动失败？**
A: 在 Settings → Local browser use 中点击 Install Patchright browser，然后重新尝试 Launch。

### 5.4 性能与成本

**Q: Token 使用量如何追踪？**
A: 每次 LLM 调用都写入 `usageRecords` 表，包含运行时、模型、token 计数、缓存计数和成本。调试仪表盘显示实时使用统计。

**Q: 如何防止失控使用？**
A: Boop 当前未设置 `maxTurns` 或 `maxBudgetUsd` 硬限制，但：
- 每个任务作用域紧凑（dispatcher spawn 时指定任务字符串和小工具集）
- 15 分钟心跳机制标记长时间运行代理为 `failed` 并中止
- 实践中执行代理通常在 60 秒内完成

## 六、总结

Boop 是一个设计精良的个人 AI 助手框架，核心优势在于：

1. **零额外 API 成本**：直接使用 Claude Code 或 Codex 订阅认证
2. **架构清晰**：dispatcher + executor 分离，职责单一，易于扩展
3. **集成丰富**：Composio 一键解锁 1000+ 工具，无需逐个对接 OAuth
4. **记忆完善**：三层记忆 + 向量检索 + 每日合并，适合长期使用
5. **可扩展性强**：支持自定义 MCP 服务器、本地浏览器、Apple 数据源

项目定位为"模板而非成品"，作者明确表示这是为个人使用构建的架构，开源供他人学习和定制。适合想要构建个人 AI 助手、学习 Agent 架构、或需要 iMessage 集成的开发者。

**注意事项**：
- 不适合高吞吐量生产环境（无硬限制）
- 安全性和成本控制需自行负责
- 适合技术用户二次开发，非开箱即用产品

如果你正在寻找一个轻量级、可定制的个人 AI 助手框架，Boop 是一个很好的起点。
