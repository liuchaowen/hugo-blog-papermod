---
title: "OpenHuman：一个本地优先、会记住一切的 AI 个人超智能"
date: 2026-07-27
description: "OpenHuman 是 tinyhumansai 开源的个人 AI 超智能项目，集持久记忆、多智能体编排与深度研究于一体，本地优先且重视隐私。本文从架构、核心技术栈与实战角度深入剖析这个项目。"
author: "Cheman"
slug: openhuman
draft: false
categories: [开源, AI]
tags: [GitHub, 开源, AI Agent, Rust, 本地优先]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenHuman**，一个把你「记忆、编排、研究」三件事打包在一起的本地优先个人 AI 超智能。它号称安装后几分钟就能比你更懂你的工作栈，而不是像大多数 Agent 那样冷启动、要养几周才有点用。

## 一、项目概述

OpenHuman 把自己定义成三件事的组合体，而这三点恰好是多数助手做不到的：

- **一个大脑（The brain）**：在本地构建对你世界的持久记忆，把你的邮件、日历、代码仓库、文档、聊天全部压缩成可打分的 Markdown 树，存进 SQLite，并镜像成一个 Karpathy 风格的 Obsidian 知识库，你可以直接打开、编辑。
- **一个编排器（The orchestrator）**：在耐久的图（graph）上调度一支 Agent 舰队，而不是「一个循环里跑一个 Agent」。
- **一个深度研究员（The deep researcher）**：在你还没问完之前，就先扫一遍你的数据和整个网络。

值得一提的背景：项目上线一周内，OpenHuman 连续 9 天登顶 GitHub Trending 日榜。它目前处于 Early Beta，采用 GNU 许可证，核心用 Rust 编写，桌面端基于 Tauri，当前版本 `0.63.1`。

## 二、技术原理

### 2.1 记忆系统：Memory Tree + Obsidian Wiki

OpenHuman 的记忆不是「向量汤」黑盒，而是把你的数据压缩成**打分过的 Markdown 树**存进本地 SQLite，并镜像成一个 Obsidian vault。每隔 20 分钟，auto-fetch 就把你的 Gmail、Notion、GitHub、Slack 等数据拉到本地喂给这个大脑。

从 Cargo.toml 可以看到，内存引擎基于自家的 `tinycortex` crate（feature 含 `git-diff`、`persona`、`sync`），并通过 git2（vendored libgit2，不依赖系统 git）做变更账本——快照即提交、检查点即标签、diff 即 git tree diff。这意味着记忆是有版本、可回溯的。

### 2.2 编排器：耐久图 + 检查点

编排层跑在开源的 `tinyagents` 框架上（Rust 版 LangGraph/LangChain 风格）：耐久状态图（durable state graph）、Agent 循环 harness、模型/工具注册表。关键设计是**检查点图运行**——卡住的 Agent 会被引导，被 halt 的会返回根因，每次运行都能带着真实的每调用成本回放。

更进一步的「分脑」架构：一个快速的反射 Agent 负责分流进来的请求，一个深度推理核心把活儿委派给 worker 舰队，由潜意识（subconscious）在后台驱动。

### 2.3 TokenJuice：让大脑用得起

一个这么大的大脑如果每次都把原始工具输出灌进模型，成本会爆掉。OpenHuman 用 `tinyjuice`（TokenJuice 压缩引擎）在工具输出进入模型之前先做压缩——**同样的信息，token 最多减少 80%**。技术上它支持 tree-sitter 的 AST 感知压缩（Rust/TS/Python 语法），也可回退到花括号深度的启发式算法。

### 2.4 工作流与 Agent 经济

- **Workflows**：灵感来自 n8n / Zapier，但由 Agent 替你生成。你提出一个自动化需求，它用 `tinyflows`（类型化节点图引擎）画出一张图，你在可视化 canvas 上审查后保存；保存后的工作流是耐久的、触发驱动的、需要审批才执行副作用。
- **Agent 经济**：每个实例在 tiny.place 上有一个 `@handle`，Agent 之间用 Signal 协议端到端加密互相编排，并支持 x402 USDC 赏金与交易，密钥永不落盘。

### 2.5 多链钱包与本地优先

Cargo.toml 里能看到一整套 Web3 栈：`bitcoin`（P2WPKH PSBT）、`ed25519-dalek`（Solana）、`ethers`（EVM）、`coins-bip39`（助记词派生）。配合 `x402` 协议，OpenHuman 把「机器对机器付费」也内建进了编排能力。

隐私方面，它默认就在本地加密数据、用 OS keyring 存密钥，并提供 **Privacy Mode**——在 Rust 核心层强制「不离开本机的推理」，一键切换即可。

### 2.6 编译时特性门控

整个 crate 用 feature 做精细的编译裁剪（如 `http-server`、`voice`、`flows`、`web3`、`channels`）。例如去掉 `http-server` 的 slim/headless 构建会丢掉 axum + socketioxide，核心继续跑后台服务但不绑定端口；`tui` 关掉则丢掉 ratatui/crossterm。这样既保证桌面端功能完整，也支持嵌入式/headless 部署。

## 三、安装与快速开始

下载安装包最直接：从 [tinyhumans.ai/openhuman](https://tinyhumans.ai/openhuman) 或 [GitHub Releases](https://github.com/tinyhumansai/openhuman/releases/latest) 页面获取。

终端安装（Homebrew、Debian/Ubuntu `.deb`、AUR、安装脚本）见仓库 `INSTALL.md`。

如果从源码构建，准备清单包括：Git、Node.js 24+、pnpm 10.10.0、Rust 1.93.0（`rustfmt` + `clippy`）、CMake、Ninja、ripgrep，以及平台桌面构建依赖。然后：

```bash
git clone --recurse-submodules https://github.com/tinyhumansai/openhuman
cd openhuman
git submodule update --init --recursive   # 拉取 vendored 的 tinyagents/tinyflows 等
pnpm install
pnpm dev                                   # 仅 Web UI
pnpm --filter openhuman-app dev:app        # 桌面 shell
```

提交前的检查：`pnpm typecheck`、`pnpm format:check`、`cargo check -p openhuman --lib`。

## 四、使用方法与实战

### 4.1 几分钟建立上下文

大多数 Agent 是冷启动的，OpenHuman 则跳过等待：连接账号 → 让 auto-fetch 以 20 分钟为周期把数据拉到本地 → Memory Tree 把它们压缩成 Markdown，存进 Karpathy 风格的 Obsidian wiki。一次同步后，Agent 就拥有了你的收件箱、日历、仓库、文档、消息的（压缩）全貌。

如果你已经在其他 Coding Agent 上自托管了 `agentmemory`，OpenHuman 还能通过设置 `config.toml` 中的 `memory.backend = "agentmemory"` 直接复用同一份耐久存储，同时驱动 Claude Code、Cursor、Codex、OpenCode。

### 4.2 让 Agent 替你画工作流

直接说「帮我把每周一的日报自动汇总并发到 Slack」，Agent 会提出一张 `tinyflows` 图，你在 canvas 上审查节点与触发条件后保存；之后它按 schedule / webhook / 频道事件自动触发，重启也不丢，副作用操作走审批闸门。

### 4.3 深度研究与会议代理

- **SuperContext**：在你发出第一条消息前，研究侦察兵就先扫一遍你的记忆和文件，杜绝冷启动。
- **Meeting Agents**：能带着「脸和声音」加入 Meet、Zoom、Teams、Webex，自动从日历加入、实时转写、按名字应答，并归档带行动项的摘要。
- **原生语音**：进程内 Whisper（`whisper-rs`）做 STT，配合 `cpal` 音频探测，无需外部服务。

## 五、常见问题与解决方案

- **构建失败 / 链接错误**：多数来自子模块未初始化。务必先 `git submodule update --init --recursive`，再 `pnpm install`，否则 vendored 的 Tauri/CEF 源码缺失。
- **Windows MSVC 链接报错（LNK2038 CRT 不匹配）**：官方已对 `whisper-rs-sys` 打 fork（`config.static_crt(true)`）。若自行构建遇到，确认用的是仓库 patch 后的版本。
- **内存暴涨（HTML 解析）**：项目在 `Cargo.toml` 注释里专门记录过——早期用 `html2md` 在嵌套表格邮件上峰值堆到 ~894MB。现已改用线性时间标签/实体剥离（`fast_html_to_text`），并优先用邮件的 `text/plain` 部分。若你处理富格式邮件仍卡顿，检查是否走了纯文本 MIME。
- **隐私顾虑**：打开 **Privacy Mode** 即可强制所有推理不离开本机（在 Rust 核心层强制）。
- **成本焦虑**：开启 TokenJuice 后工具输出压缩最高省 80% token；模型路由（model routing）按工作负载自动选最合适的 LLM，单订阅覆盖本地 AI 与云端。

## 六、总结

OpenHuman 的野心很大：它想做的不只是一个聊天机器人，而是一个**编排器 + 记忆体 + 研究员**三位一体的个人超智能。它的几个差异化设计值得关注——本地优先的持久记忆（Memory Tree + Obsidian）、基于耐久图的 Agent 编排、TokenJuice 成本压缩、可视化且可审批的工作流，以及内建的隐私模式与多链 Agent 经济。

当然，项目明确标注自己是 Early Beta、仍在快速演进，对比表里那些「🚀」评级也建议以各自官方文档为准。但作为一个把「让 Agent 真正懂你」这件事工程化、并且坚持开源（GNU）与本地优先方向的项目，它值得持续关注。

> 仓库地址：[github.com/tinyhumansai/openhuman](https://github.com/tinyhumansai/openhuman)
