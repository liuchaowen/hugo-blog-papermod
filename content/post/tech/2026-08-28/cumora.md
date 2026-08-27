---
title: "Cumora：让 AI 智能体成为团队一等公民的跨平台协作工具"
date: 2026-08-28
description: "Cumora 是一个跨平台团队聊天工具，把 AI 智能体当作与人类同等的成员：共享同一个通讯录、群聊、看板与日历，支持云端托管或 Bring Your Own Agent 本地运行，并通过 seen-cursor 门控与原子化任务抢占实现多智能体无冲突协作。"
author: "Cheman"
slug: cumora
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI Agent, 协作, 多智能体]
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

**开篇引导段**
今天在 GitHub Trending 上看到一个有意思的项目：**Cumora**（yetone/cumora），它重新定义了「团队聊天」——在这里 AI 智能体不是被 `@` 一下才回话的工具，而是与人类共享同一份通讯录、同一场群聊、同一块看板和日历的「一等公民」。

## 一、项目概述

Cumora 的核心理念写在它的副标题里：**Where agent teams gather.**（智能体团队聚集的地方）。它把 AI 智能体与人类放在完全相同的地位上：

- 共享同一个**通讯录、私信（DM）、群聊、看板（Kanban）和日历**；
- 智能体不是被「戳一下才回答」，而是**持有角色人设与记忆**，会主动认领任务、彼此协调而不互相踩踏；
- 能**收发真实邮件**，运行在 Cumora 云端，也可以运行在你自己的机器上。

它同时提供两条「大脑」路径，这是它区别于其他 AI 聊天产品的关键：

- **Cumora Cloud**：每个智能体跑在一个托管的多副本 Pod 里，基于 OpenAI Responses API 执行多跳工具调用循环（bash、文件、浏览器、邮件、记忆、技能等）。
- **BYOA（Bring Your Own Agent）**：用 `npx cumora agent computer` 把你的 Mac / VPS 接进来，智能体的「大脑」直接变成你本地的 **Claude Code、Codex、Grok Build、Cursor Agent、OpenCode 或 pi** CLI，密钥永远不经过 Cumora 服务器。

项目当前版本 `0.6.0`，采用 **MIT** 许可证，前端覆盖 Electron 桌面端、PWA、iOS（TestFlight 公测）、Android（需自行构建），定位是一个真正能落地的「人机混合团队」工作空间。

## 二、技术原理

### 2.1 整体架构

从仓库 README 给出的架构图可以清晰看到分层：

```
 Electron / PWA / iOS / Android         ┌─────────────────┐
 ┌──────────────────┐   HTTP / WS       │   App workers   │──▶ OpenAI (Responses API)
 │    React UI      │ ◀───────────────▶ │  Express + ws   │──▶ Resend (email out)
 └──────────────────┘                   │    (any N)      │──▶ APNs / FCM (push)
                                        └───┬────────┬────┘
 Cloudflare Workers                         │        │ kubectl
 ┌─────────────────┐   webhooks / R2   ┌────▼───┐ ┌──▼──────────────┐
 │ email-gate      │ ────────────────▶ │Postgres│ │ Agent pods (K8s)│
 │ r2-gate (CDN)   │                   │ Redis  │ │ or BYOA daemons │
 └─────────────────┘                   └────────┘ └─────────────────┘
```

- **前端（`src/`）**：纯 UI 层，React 18 + Vite + TypeScript + Tailwind，在 `desktop/`、`mobile/`、`web/`、`admin/` 之上复用同一套组件。
- **后端（`server/`）**：无状态 Node 服务，Express + `ws`，以 Postgres 为唯一事实源（pg 连接池 + Drizzle schema），Redis 负责 pub/sub 扇出与在线状态。任意数量的实例在负载均衡之后都能通过 Redis 总线保持同步。
- **智能体运行时**：云端智能体活在每代理一个的 Kubernetes Pod 里（由 server 通过 `kubectl` 编排，Go FUSE 驱动挂载其服务端工作区）；BYOA 智能体则活在你运行 daemon 的地方。二者都通过同一套 `cumora` CLI 协议作用于世界，且**每一次 LLM 调用（无论云端还是 BYOA）都会落入同一张 `llm_calls` 成本账本**。

### 2.2 多智能体「不互相踩踏」的协调机制

同一个房间里多个智能体最容易出问题的就是「冲突」。Cumora 在服务端做了三层防御（源码中的 `docs/COORDINATION.md` 有详细设计笔记）：

1. **seen-cursor 新鲜度门控**：一个过期的回复会被 **HOLD 住**，并把它之后更新的消息展示给它，让它重新决策，避免基于旧上下文做出错误动作。
2. **原子化任务抢占**：对真实的工作单元（如看板卡片）做原子认领，保证同一时刻只有一个智能体/人类在占用。
3. **小模型分流门控（triage gate）**：用一个「小大脑」先挡在「大大脑」前面，过滤掉不值得消耗昂贵模型的请求。

这种「先把协作做对，再谈能力」的设计，是这个项目最值得细读的部分。

### 2.3 关键配置与依赖选型

从 `package.json` 能看到清晰的技术取向：协作编辑用 Yjs + Tiptap（`y-protocols`、`@tiptap/extension-collaboration`），实时通信走 `ws` + `ioredis` + `pg`，桌面端用 `electron`（含 `electron-updater` 自动更新），移动端用 Capacitor（`@capacitor/ios`、`@capacitor/android`），整体 TypeScript 严格模式 + Biome 做 lint/format。

`vite.config.ts` 里还专门处理了 Yjs / ProseMirror 家族的「多实例」陷阱——通过 `resolve.dedupe` 与 `optimizeDeps.include` 强制所有 Tiptap 扩展共享同一个 Yjs 模块实例，避免编辑器崩溃。

## 三、安装与快速开始

本地运行只需要 **Postgres** 和 **Redis**（用 Homebrew 服务即可），外加一个 OpenAI Key：

```bash
# 1. 建库
createdb -h localhost cumora
export OPENAI_API_KEY=sk-...

# 2. 安装根目录 + Email Worker 依赖
npm run setup

# 3. 同时启动 Vite 渲染器(:5180) 与 API 服务(:5181)
npm run dev:all
```

随后打开 `http://localhost:5180`（PWA 模式），或 `npm run electron:dev` 启动桌面窗口。Schema 会在启动时幂等创建，空库会种入一个起始团队（6 个智能体、3 个人类、9 场对话），且**零消息**——聊天气泡里出现的一切都是实时生成的。

环境变量中 `OPENAI_API_KEY` 是唯一硬性要求，其余都有合理本地默认值：

| 变量 | 默认值 |
|------|--------|
| `DATABASE_URL` | `postgres://$USER@localhost:5432/cumora` |
| `REDIS_URL` | `redis://localhost:6379` |
| `OPENAI_MODEL` / `OPENAI_MODEL_SUPPORT` | 大/小大脑模型 |
| `PORT` | `5181` |

OAuth 登录、Resend + Cloudflare 邮件路由、R2 存储/CDN、APNs/FCM 推送、sub2api 按用户 LLM 网关、waitlist/邀请、指标等可选功能组，均在 `.env.example` 与 `server/src/env.ts` 内联文档。

## 四、使用方法与实战

### 4.1 云端智能体：开箱即用

建好团队后，起始团队默认包含四个智能体（见 `scripts-gen-starter-avatars.mjs` 中的 `STARTERS`）：

- **Atlas**（Researcher）：连接别人忽略的线索，引用来源，倾向「让我查一下」而非自信猜测。
- **Iris**（Designer）：品味强、措辞软，能一句话讲清正误差异，反对丢意义的设计但会带替代方案。
- **Bram**（Engineer）：厌恶模糊 spec 和伪复杂的搬运，用权衡说话。
- **Nova**（PM）：让团队不卡住，命名「漂移」、在没有人拍板时提议一个并问「有异议吗？」。

直接在同一群聊里 `@` 它们，或让它们自主认领看板任务即可。

### 4.2 BYOA：把本地 Agent 接进来

如果你想让智能体用你自己的 Claude Code / Codex / Cursor Agent 作为大脑：

```bash
# 在你的 Mac / VPS 上
npx cumora agent computer
```

服务端通过 `cumora` CLI 协议与本地 daemon 通信，provider 密钥只留在你本地，**Cumora 服务器永远看不到**。这对注重数据主权的团队非常关键。

### 4.3 真实邮件能力

每个智能体都拥有真实邮箱（`docs/email.md`）：Resend 对外发信，Cloudflare Email Worker 收信。这意味着智能体可以真正「代表团队」对外沟通，而不只是聊天框里的文字。

## 五、常见问题与解决方案

**Q1：启动时连不上数据库 / Redis？**
A：确认已 `createdb cumora` 且本地有 Redis 服务在跑。Homebrew 下可用 `brew services start postgresql redis`；默认连接串走 `localhost`，如不同请在 `.env` 覆盖 `DATABASE_URL` / `REDIS_URL`。

**Q2：没有 OpenAI Key 能跑吗？**
A：不能——`OPENAI_API_KEY` 是唯一硬性要求。其余环境变量缺失时要么用默认值，要么软禁用对应功能组。

**Q3：想用本地其他模型大脑（非 OpenAI）？**
A：走 BYOA 路径即可。`npx cumora agent computer` 把本地的 Claude Code / Codex / Grok Build / Cursor Agent / OpenCode / pi CLI 作为智能体大脑，不再依赖 OpenAI Responses API。

**Q4：多智能体在同一房间会打架、重复干活吗？**
A：服务端的 seen-cursor 新鲜度门控会把过期回复 HOLD 并重喂新消息；对工作单元做原子认领；小模型分流门控挡在贵重大模型前。详见 `docs/COORDINATION.md`。

**Q5：iOS 推送收不到横幅？**
A：这是真实踩过的坑——`capacitor.config.ts` 里曾把 `handleApplicationNotifications` 设为 `false`，导致前台推送不弹横幅且点击链路中断；保持默认 `true` 让 Capacitor 自己持有 `UNUserNotificationCenter` 委托即可恢复。

**Q6：编辑器偶发崩溃报 "Yjs was already imported"？**
A：曾因 `@tiptap/extension-table` 引入导致依赖优化器把 Yjs 拆成多个 chunk 实例。当前已通过 `vite.config.ts` 的 `resolve.dedupe` + `optimizeDeps.include` 强制单实例修复。

## 六、总结

Cumora 的野心不在于「再做一个 AI 聊天框」，而在于把智能体真正**组织**成一个团队：共享上下文、共享任务、共享对外通道，同时用扎实的工程手段（Redis 总线同步、原子任务抢占、新鲜度门控、BYOA 数据主权）解决多智能体协作中最棘手的冲突与信任问题。它是目前少见的、既给出完整架构又坚持 MIT 开源的「人机混合团队」基础设施。如果你正在探索多智能体落地、或想给团队装一套「AI 同事」，这个项目值得 clone 下来跑一遍。

> 仓库地址：https://github.com/yetone/cumora ｜ 官网：https://cumora.ai
