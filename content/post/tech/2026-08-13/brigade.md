---
title: "Brigade：把你自己的「AI 军团」搬回家——自托管的多智能体操作系统"
date: 2026-08-13
description: "Brigade 是一个完全自托管的个人 AI Agent 生态：一套共享长期记忆（Tideline）的智能体「军团」，支持真实组织架构成员协作、跨模型无缝切换、1000+ 应用连接器与多消息渠道，所有密钥与数据都留在你自己的机器上。"
author: "Cheman"
slug: brigade
draft: false
categories: [技术, 开源]
tags: [GitHub, AI Agent, 开源, 自托管, 多智能体]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**Brigade**——一句话概括，它是一个「企业级底座、向所有人开放」的个人智能体生态，让你在自己的机器上养一支会共享记忆、能互相委派任务的 AI 军团。

## 一、项目概述

Brigade 的定位不是「又一个聊天机器人」，而是**一套你自托管的个人智能体操作系统**。它的核心主张是：把多个 AI Agent 组织成一支有真实「组织架构（org chart）」的团队，它们共享一条长期记忆 *Tideline*，彼此可以委派任务、可以中途切换模型而不丢失上下文，并能直接操作你已经在用的 1000+ 应用。

几个关键特征：

- **生态系统，而非单一 App**：同一支团队可从终端、WhatsApp、Telegram、Slack、Discord、iMessage、BlueBubbles，甚至你的手表、Meta 智能眼镜和 Meta Quest 触达。
- **数据主权**：没有账号、没有中间 SaaS。安装后所有内容都在你自己的 `~/.brigade/` 目录里，密钥以 `0600` 权限本地存储，`rm -rf ~/.brigade` 即可彻底清空。
- **同一套代码跑在树莓派或服务器上**：默认是轻量文件系统安装，需要时可切换到自托管的 Convex 数据库。
- **任意模型**：Claude、GPT、Gemini、Llama，或本地 Ollama 随便带；敏感操作需你审批，密钥和数据不出本机，无遥测。

> One owner, a whole crew — 一个所有者，一整支团队：多个智能体通过真实组织架构协调，全部运行在**你**控制的硬件与存储上。

## 二、技术原理

### 网关 + 瘦客户端的架构

Brigade 是一个二进制文件，既能作为**网关（gateway）**——持有全部状态、长期运行的进程，也能作为附着其上的**瘦客户端**。整体结构如下：

```
            ┌─────────────────────────── ~/.brigade/ ───────────────────────────┐
            │  config · per-agent workspaces · sessions (JSONL) · memory · cron  │
            └───────────────────────────────────────────────────────────────────┘
                                          ▲
                                          │ reads/writes (filesystem OR Convex)
                        ┌─────────────────┴─────────────────┐
   brigade tui ──ws──▶  │            GATEWAY  :7777          │  ◀──ws── brigade connect
   brigade chat         │  per-turn agent loop · routing    │
   WhatsApp·Telegram ──▶│  tools · sub-agents · supervisor  │◀──────── cron jobs
   MCP client ─stdio──▶ │  (brigade mcp → memory server)    │
                        └───────────────────────────────────┘
```

这里有三条设计要点值得展开：

1. **客户端都很瘦。** TUI（`brigade`/`brigade tui`）、`brigade connect` 以及各渠道适配器都是网关的 WebSocket 客户端；状态只存在于网关，客户端只是镜像。断线、走开、稍后重连，你的智能体仍在跑。
2. **一次只处理一轮（one turn at a time）。** 每条消息都经过一个有韧性的 Agent 循环：解析会话 → 组装系统提示（人设 + 技能 + 组织上下文）→ 流式调用模型 → 工具调用经过审批与所有权守卫 → 持久化转录 → 回复。
3. **从任何入口进来都一样。** WhatsApp 消息和 TUI 按键走的是同一条路由管线，被解析成 `(agent, session)` 对，因此某个渠道的对话绝不会串进另一个上下文。

入口 shim 也很有讲究——`bin` 文件故意做得很小，真正的逻辑在 `dist/entry.js`。它要做的第一件事是**拒绝不支持的 Node 版本**（Pi SDK 用到 22.12+ 的 `using`/`AsyncDisposable`），避免 Node 18/20 在远离根源的地方抛出令人摸不着头脑的 `SyntaxError`：

```js
const MIN_NODE = { major: 22, minor: 12 };

function ensureSupportedNodeVersion() {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(process.versions.node);
  if (!m) return;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (
    major > MIN_NODE.major ||
    (major === MIN_NODE.major && minor >= MIN_NODE.minor)
  ) {
    return;
  }
  process.stderr.write(
    `brigade requires Node ${MIN_NODE.major}.${MIN_NODE.minor} or newer ...`
  );
  process.exit(1);
}
```

### Tideline：长期记忆引擎

记忆是 Brigade 的看家本领。`facts.jsonl` 中的每个事实都打上 **origin（来源）** 标签——所有者 vs. 渠道同伴，从而同伴的事实永远不会泄漏进你的上下文。事实分三档**衰减（decay）**，写入时去重，背后还有一个**来源写入门（provenance write-gate）**，阻止不可信来源覆盖你的身份/偏好。

在此之上，Tideline 引擎还提供：

- **混合召回（hybrid recall）**：BM25 关键词 + 无模型向量通道；
- **类型化链接图**与**夜间反思/整合（reflect & consolidate）**；
- **自动召回**：每轮之前只注入来源匹配的事实。

### Carrow：跨模型连续性

`/model`、`/provider` 切换之所以无缝，靠的是 Carrow——它把完整转录搬移到新模型（同一个会话），**重新锚定思维层级**（目标支持推理时保留、对非推理模型强制关闭、对纯推理模型调高），并清洗掉下一个提供商会拒绝的厂商特定推理块。它支持**中途切换**（中止在跑的任务，在新模型上重放你上一条消息）和**下一轮切换**。

## 三、安装与快速开始

最省事的方式（macOS/Linux，会自动装好 Node 22.12+ 再装 Brigade，无需 sudo）：

```bash
# macOS / Linux
curl -fsSL https://brigade.spinabot.com/install.sh | sh
# 或直接从 GitHub 安装：
curl -fsSL https://raw.githubusercontent.com/spinabot/brigade/main/packaging/install/install.sh | sh
```

```powershell
# Windows (PowerShell)
irm https://brigade.spinabot.com/install.ps1 | iex
```

如果已经在 Node 22.12+ 上，直接从 npm 装：

```bash
npm i -g @spinabot/brigade
```

> 遇到 `EACCES` / 权限拒绝？不要 `sudo`。用上面的 `curl … | sh` 安装器（它会建立私有、用户拥有的运行时，无需 root），或把 npm 指到用户可写前缀：`npm config set prefix ~/.npm-global`，再把 `~/.npm-global/bin` 加进 `PATH`。

然后启动引导（onboarding）：

```bash
brigade
```

## 四、使用方法与实战

引导向导会带你走完五步：**(0) 存储模式**（文件系统或自托管 Convex）、**(1) 选提供商**（Anthropic、OpenAI、Gemini、OpenRouter、Ollama 等）、**(2) 连接**（粘贴 API key、用 Claude/ChatGPT/Copilot 订阅登录、复用 Claude Code / Codex CLI 登录，或连本地 Ollama）、**(3) 选默认模型**、**(4) 选 Web 搜索后端**。

三步跑起你的团队：

```bash
# 1. 初始化：选提供商、粘贴 key、选模型
brigade onboard

# 2. 启动常驻网关：团队、渠道、cron 任务都在这里
brigade gateway run

# 3. 与团队聊天
brigade tui
```

几个实用的入口：

```bash
brigade agent -m "summarize ~/today.md"   # 一次性调用，不进 TUI
brigade connect                            # 附着客户端到运行中的网关
brigade doctor                             # 健康检查
```

### 进阶用法速览

- **子智能体（Sub-agents）**：`spawn_agent`（单个）与 `spawn_agents`（并行扇出），默认深度上限 3、子节点上限 5，带中止级联（abort cascade）与完成桥（completion bridge）。
- **组织层级（Org / Pride）**：在 `cfg.org` 里定义成员、部门、汇报线；A2A 策略从图谱推导，决定谁可以联系谁。用 `brigade org show` / `explain` / `doctor` 检视，或用 `org` 工具渲染一张 🦁 Pride 组织图。
- **渠道**：WhatsApp（Baileys，扫码配对）、Telegram（Bot API，内联按钮审批）、Slack（Socket Mode）、Discord、iMessage（via `imsg` CLI）、BlueBubbles（macOS server）—— 同一套带接入控制、去重、中止触发、审批路由的入站管线。
- **连接器（Composio）**：`composio` 工具带来 1000+ 应用连接器（Gmail、Slack、GitHub、Notion、Calendar、Linear…），托管 OAuth。注意要用 **PLATFORM key（以 `ak_` 开头）**，不是「FOR YOU」的消费者 key（`ck_`），后者会被拒绝。
- **文档与媒体**：`analyze_media` 读懂 PDF（文本或扫描件）、Office、图片、音频、视频；`make_document` / `edit_document` 就地创建与编辑 Word/Excel/PowerPoint/PDF。
- **MCP**：`brigade mcp` 把你的长期记忆以 add/search/context 工具暴露给任意 MCP 客户端（stdio，owner 绑定）。

### 一个好玩的新特性

v1.9.0 引入了 **B³ — Brigade Bloody Benchmark**：一条命令把你的团队「丢去喂狼」——暴露到公网，让陌生人在凌晨三点随便戳你的智能体，活下来才算真发货。

```bash
brigade bloody benchmark   # 把团队丢到开放网络，无保护
brigade expose             # 安全暴露（带隐形密钥，401 拒之门外）
brigade expose stop        # 收手
```

底层其实很温顺：边缘 HTTPS、无账号、无配置。默认用 Cloudflare，或自带 relay（`bore` · `frp` · `sish`，都是开源的）。一条隐形密钥随行——你从来看不到它，蹭门的撞上 `401` 直接「失血而亡」。

## 五、常见问题与解决方案

**Q：安装报 `EACCES` / permission denied？**
A：Node 的全局目录需要管理员权限。不要 `sudo`。用 `curl … | sh` 安装器，或 `npm config set prefix ~/.npm-global` 后把 `~/.npm-global/bin` 加进 `PATH`。

**Q：Node 报 `SyntaxError`（奇怪的语法错误）？**
A：你大概率在用 Node 18/20。Brigade 要求 Node 22.12+（Pi SDK 用到 `using`/`AsyncDisposable`）。在 nvm 上：`nvm install 22` 然后 `nvm use 22`。

**Q：Composio 报 key 被拒？**
A：Brigade 用的是 Composio **SDK**，需要 **PLATFORM key（`ak_` 开头）**，不是「FOR YOU」的消费者 key（`ck_`）。在 dashboard.composio.dev 把左上角模式切到 PLATFORM，Settings → API Keys 复制 `ak_…` 即可。

**Q：怎么让网关开机自启？**
A：跑 `brigade gateway install`（安装 launchd / systemd / Task Scheduler 服务）。网关本身有心跳文件 + 进程外 supervisor，事件循环卡死会自动重启。

**Q：担心被蹭门 / 需要远程访问？**
A：默认网关无认证、仅 localhost。需要的话用 `brigade gateway token new` 加访问令牌，之后每次连接都要带有效令牌，支持多令牌（每设备一个，可单独吊销）。

**Q：如何彻底清除？**
A：`rm -rf ~/.brigade` 即可干净抹除一切。

## 六、总结

在「AI Agent 平台」大多走向托管 SaaS 的当下，Brigade 反其道而行：它把企业级的控制力与数据主权交回你手里，同时不牺牲能力——长记忆、真·组织架构成员协作、跨模型连续性、1000+ 连接器、多消息渠道，一套代码跑在树莓派或服务器上。如果你想要一个**数据完全归自己、又能真正干活**的个人 AI 军团，Brigade 值得一试。

> 项目地址：https://github.com/spinabot/brigade
