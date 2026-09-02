---
title: 'Atlas：给 AI 编程 Agent 装上版本控制，让每一行提交都说清"为什么"'
date: 2026-09-03T02:04:00+08:00
description: "Atlas 是一款面向 AI 编程 Agent 的源代码管理工具，将每个 Agent 会话记录为检查点，把提交、提示词、工具调用与推理过程串联起来，支持 Claude Code、Codex 多 Agent 并行与共享记忆。"
author: "Cheman"
draft: false
tags: [GitHub, 开源, AI, Agent, 开发工具]
categories: [技术, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Atlas**——它给"写代码的 AI Agent"做了一套专属的源代码管理（Source Control），让每一次 Agent 提交都能追根溯源：是谁（哪个 Agent）在什么提示词下、做了哪些工具调用、出于什么推理，最终落下了这几行代码。

## 一、项目概述

Atlas 的定位很新：当 Claude Code、Codex 这类编码 Agent 承担了越来越多的代码产出，团队却对"它们为什么这么改"几乎一无所知。Atlas 把每一次 Agent 运行都记录成一个**检查点（Checkpoint）**：提交（commit）被反向关联到产生它的会话（session），同时把提示词、工具调用、文件改动、推理过程一并保留下来，几个月后仍能查询。

核心特性可以归纳为五点：

- **每次提交都可解释**：一个检查点将 commit 关联回产生它的 session，提示词、工具调用、文件变更三者绑定在一起，可长期检索。
- **任意 Agent 并肩作战**：Claude Code、Codex、Atlas 自带的 Agent，乃至整个 ACP 注册表里的 Agent，都能在同一窗口、同一份代码库上并行运行；中途换 Agent 不必从头开始。
- **一份记忆，所有 Agent 共享**：Claude Code 做过的决策，会自动出现在 Codex 下一次的提示里。计划、文件改动、失败记录、架构笔记都会自动共享，并在本地按当前问题做语义匹配。
- **你的笔记就是 Agent 的上下文**：`.atlas/knowledge/` 下的 Markdown，加上你已有的 `CLAUDE.md`、`AGENTS.md`，会喂给项目里的每一个 Agent。
- **`@` 万物进提示**：文件、文件夹、符号、分支、提交、笔记、论文、过往 session，都会在提示发出前于本地解析。

隐私方面，Atlas 默认本地运行：代码、笔记、会话都留在你机器上；只有当你主动登录并创建组织时，才会同步到云端。

## 二、技术原理

Atlas 的底层是一套为 Agent 而生的运行时：Agent 运行时、共享记忆、会话历史是整款应用的地基。

### 2.1 Agent 的接入方式

Atlas 把你已有的 Agent 当作"原样运行"，只是丰富了它们看到的上下文：

- **Claude Code 与 Codex** 通过 [ACP（Agent Client Protocol）](https://github.com/zed-industries/agent-client-protocol) 作为外部子进程运行——这是目前使用最广、验证最多的路径。
- **Atlas 原生 Agent** 在进程内基于自研的 Rust Agent 框架（代号 Cersei）运行。
- 此外还能拉起 ACP 注册表中的任何 Agent（Cursor、OpenCode、Kilo Code 等），自动下载各自的官方二进制。

> 在提示词到达 Agent 之前，Atlas 会围绕它组装上下文，注入来源包括 `@` 提及、共享记忆、语义匹配、会话交接、以及你已经写好的知识笔记。

| 注入项 | 来源 | 时机 |
|---|---|---|
| `@` 提及 | 在提示发送前于 Rust 侧本地解析 | 每轮 |
| 共享 Agent 记忆 | 任意 Agent 写下的活动计划、决策、改动、失败、架构笔记 | 每轮 |
| 语义匹配 | 消息在本地做 embedding，与项目记忆索引匹配 | 每轮 |
| 会话交接 | 本项目的上一会话精编事实包 + 末尾片段（可来自不同 Agent） | 首条消息 |
| 你已写好的内容 | 知识笔记、`CLAUDE.md`、`AGENTS.md` 等折叠成统一索引 | 持续 |

值得注意的是：**embedding 在本地机器上运行，检索永不离开设备。**

### 2.2 检查点（Checkpoint）：让 commit 不再失忆

检查点回答的是"一个 commit 自己说不清的事"：哪个 session 产生了它、Agent 被要求做什么、做了哪些工具调用、改动背后的推理——全部绑在一起，而不是终端一滚就丢。

Atlas 把每个 Agent session 记录在本地的 `.atlas/sessions.db`，在写入磁盘前会先清洗敏感信息（secrets scrubbed）。无论你用任何工具提交（即使 Atlas 关着、在另一个编辑器里提交），该 commit 都会被反向关联回产生它的 session，成为检查点，而且链接在 rebase 和 amend 后依然存活。

技术上的精髓在于：**提交是被"观察"而非"拦截"的**。这意味着哪怕是从终端、另一个编辑器、或 Atlas 关闭时产出的 commit，依然能找到它对应的 session。链接通过 patch-id 协调（reconciliation）在 amend 和 rebase 后重新指向；当 squash 让链接变得真正含混时，它会选择"孤儿化（orphan）"而不是瞎猜。

### 2.3 共享记忆与本地优先

Atlas 采用 Rust 工作区（workspace）组织大量 crate，从 `atlas-git`、`atlas-gitdiff`、`atlas-checkpoint`、`atlas-memory`、`atlas-embed`（本地 embedding）到 `atlas-redact`（敏感信息清洗）一应俱全。以 `Cargo.toml` 的工作区片段为例：

```toml
[workspace]
resolver = "2"

members = [
  "crates/atlas-acp-thread",
  "crates/atlas-agent-manager",
  "crates/atlas-checkpoint",
  "crates/atlas-git",
  "crates/atlas-gitdiff",
  "crates/atlas-memory",
  "crates/atlas-embed",
  "crates/atlas-redact",
  # ... 其余成员
]
```

共享记忆是一套**本地语义索引**（本地 embedding + HNSW 检索），每个 Agent 都读写它。这套设计让"换 Agent 不丢上下文"成为可能：新 session 的第一条消息就带着上一会话的精编事实包与尾部片段。

本地优先还体现在安全细节上：

- 代码、笔记、会话都留在本地，运行 Agent 不上传任何东西；
- 敏感信息在**落盘前**就被清洗，而非上传前；
- 匿名用量统计默认开启，但只收集粗粒度元数据，从不收集代码或提示词。

## 三、安装与快速开始

Atlas 目前官方支持 **macOS**（提供 `.dmg` 安装包）。也可以从源码构建。

### 环境要求

- [Bun](https://bun.sh/)
- Rust（stable，通过 [rustup](https://rustup.rs/)）
- Xcode Command Line Tools
- 使用 Claude Code Agent 需安装 `claude` CLI 并加入 `PATH`；Atlas 原生 Agent 无需外部 CLI

### 从源码构建

```bash
git clone https://github.com/pacifio/atlas
cd atlas
bun install
bun run dev:app
```

首次 Rust 编译需要几分钟，之后只需数秒。`bun run dev` 可做纯前端迭代，但任何调用 `invoke()` 的路径都需要 `dev:app`。

生产构建：

```bash
bun run build:app       # 生成 .app bundle
bun run build:app:dmg   # 生成 .app + .dmg 安装包
```

> Linux 与 Windows 可基于同一套 Tauri 代码库构建，但官方尚未测试。

## 四、使用方法与实战

### 4.1 多 Agent 并行会话

在 Atlas 里，Claude Code、Codex 与 Atlas 原生 Agent 可**按 session 选择、跨标签页并行运行**；session 与标签页相互独立，切换标签页绝不会中断正在跑的任务。你可以对同一份代码库，让不同 Agent 各跑各的实验，再对比它们的检查点。

### 4.2 共享记忆跨 Agent 流动

关键在于：Claude Code 的记忆对 Codex 可见，反之亦然——单个 Agent 自己读不到对方的历史。Atlas 把决策、计划、文件改动、失败与架构笔记自动写入共享索引，下一个 Agent 的提示里就能看到。

### 4.3 `@` 提及与笔记即上下文

- `@` 一个 5000 行的文件，Atlas 发送的只是路径，Agent 按需读取，不会让一次提及霸占整个上下文窗口；
- `.atlas/knowledge/` 下的 Markdown、你已有的 `CLAUDE.md` / `AGENTS.md` 都会折叠成统一索引，喂给每个 Agent；
- 选择某个检查点后，可以直接"和它对话"，它会基于该 session 真实发生的内容作答，无需通读原始 transcript。本地模式完全离线，无需账号。

### 4.4 工作区能力一览

Atlas 不只是一个 Agent 外壳，还自带一整套工作区：CodeMirror 编辑器（带每项目状态恢复）、真实提交图（带泳道分配、stage/unstage/commit、分支操作、文件级 diff）、分块终端、`.atlas/knowledge/` 知识库、arXiv / Semantic Scholar 论文检索、原生 WebKit 浏览器视图，以及最多三栏可缩放的分屏视图与活动日志。

## 五、常见问题与解决方案

**Q1：非 macOS 平台能跑吗？**
目前官方仅支持 macOS 的 `.dmg`；Linux / Windows 可基于同一 Tauri 代码库构建，但未经验证，建议先在 macOS 上体验。

**Q2：会话记录会泄露密钥吗？**
不会。所有记录写入 `.atlas/sessions.db` 前先经过 `atlas-redact` 清洗敏感信息，本地存储本身不是泄露风险。这也是为什么 `atlas-checkpoint` 会用 `catch_unwind` 包裹 redact——一旦清洗 panic，也不会泄漏未清洗文本。

**Q3：在 Atlas 之外提交的代码还能关联吗？**
能。Atlas 是**观察** commit 而非拦截，从终端、其他编辑器、甚至 Atlas 关闭时产出的提交，都会被链接回对应 session。

**Q4：rebase / amend 后检查点会断吗？**
不会。链接通过 patch-id 在 amend 和 rebase 后重新指向；只有当 squash 让归属真正含混时，才会孤儿化而非猜测。

**Q5：担心数据上云？**
默认完全本地、离线可用，无需账号。账号是可选的——只有当你主动登录创建组织并开启同步，数据才会离开设备。匿名用量统计只收集粗粒度元数据。

## 六、总结

Atlas 给"AI 写代码"这件事补上了长期缺失的一块：可审计、可追溯、可共享。它不绑定某个特定 Agent，而是把 Claude Code、Codex、ACP 生态里的 Agent 都纳入同一套检查点与共享记忆体系，让你既能看清"谁改了什么、为什么改"，也能在 Agent 之间无缝接力。

对于已经在重度使用编码 Agent 的团队，Atlas 值得一试——尤其是当你受够了"commit 看懂了，但没人记得当初为什么要这么改"的时候。
