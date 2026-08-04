---
title: "Open Science：本地优先、模型无关的开源 AI 科研工作台"
date: 2026-08-05
description: "Open Science 是 aipoch 开源的本地优先、模型无关的 AI 科研工作台，主打可复现的科学发现：项目/会话管理、产物溯源、18 项科研技能与 24 个数据连接器，基于 Electron + React + ACP Agent 运行时。"
author: "Cheman"
slug: open-science
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 科研, Electron, 可复现]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Open Science（aipoch/open-science）**——一个本地优先、模型无关、可自托管的开源 AI 科研工作台，核心目标是让科学发现变得「可复现」。

## 一、项目概述

Open Science 是一个面向研究人员的桌面应用，运行在用户自有的电脑（macOS / Windows / Linux）上。它的定位不是又一个聊天界面，而是一个把「任务 → 代码 → 数据 → 产物 → 证据」串在同一条可审计链路上的科研工作台。

它的核心价值主张可以概括为四点：

- **Local-first（本地优先）**：项目、会话、文件、设置与凭据默认全部存在本地，只有用户显式配置或批准的外部调用才会离开本机。
- **Model-agnostic（模型无关）**：可接内置云厂商、自定义网关，或直接复用已有的 Claude / Codex 订阅登录。
- **Reproducible（可复现）**：每个生成的产物都是不可变、带校验和的版本，并附带可追溯的「溯源（Provenance）」证据。
- **Self-hosted / Open（自托管与开源）**：Apache-2.0 许可，无席位授权费，只为你选用的模型或算力付费。

最新版本为 **v0.10.1（2026-08-04 发布）**，新增了「把会话分支到新会话」、按关键词搜索 GitHub 技能、专家技能包导入/导出，以及把超大文件排除在模型上下文之外等能力。

## 二、技术原理

### 架构总览

从代码组织与 `package.json` 看，Open Science 是一个标准的 **Electron + React + TypeScript** 应用，配合 **Prisma / SQLite** 做本地持久化，并通过 **ACP（Agent Client Protocol）** 驱动 Agent 运行时：

```json
"dependencies": {
  "@agentclientprotocol/claude-agent-acp": "^0.60.0",
  "@agentclientprotocol/sdk": "^1.2.1",
  "@prisma/client": "^6.19.3",
  "@modelcontextprotocol/sdk": "^1.29.0",
  "electron-updater": "^6.3.9"
}
```

它同时暴露三种交互形态：桌面 GUI、本地 Web（绑定 `127.0.0.1` 的 localhost Web UI，可经 Remote.It 做移动端远程访问），以及无头 CLI / 零依赖 Node.js SDK——三者共用同一个本地守护进程、项目、会话、凭据与权限模型。

### 构建与渲染配置

渲染层用 `vite` + `@vitejs/plugin-react` + `@tailwindcss/vite` 构建，`electron.vite.config.ts` 里有一处值得注意的细节：对 `.claude/` 目录做了 watch 忽略，避免 AI 工作树（git worktree）触发无谓的热更新扫描：

```ts
renderer: {
  optimizeDeps: { force: true },
  server: {
    watch: { ignored: ['**/.claude/**'] }
  },
  plugins: [fileViewerRenderers({ formats: ['xls', 'xlsx'], inject: false }), react(), tailwindcss()]
}
```

### 产物溯源（Provenance）—— 核心设计

Open Science 最区别于普通「AI 助手」的设计，是**不可变产物版本 + 可验证溯源**。

- 每个生成的报告、表格、图片都作为「不可变、带校验和的版本」存储。
- 其 **Provenance 视图**会展示 Open Science 在创建时*能够验证*的证据：生产者代码与执行历史、引用的输入、观测到的环境清单、产生该结果的会话分支，以及版本级评审结论。
- 对于它*无法验证*的证据，会明确标注为「不可用」，而不是猜测填充。

这意味着探索一条不同假设（在旧消息上改 prompt 派生新分支）时，不会模糊掉原始结果的记录——溯源始终绑定到「产生该产物版本的精确分支」。

### 多后端与多模型

Agent 后端是可切换的（`Settings` 中可安装、切换、移除 app 管理的运行时，无需 Node/npm/管理员密码）。模型选择由「所选 Agent 后端支持的 API 协议」决定，连接前会做校验——这是它「显式兼容」设计原则的体现：把 endpoint 要求暴露给用户，而不是把每个 API 协议当成可互换的黑盒。

当前内置云厂商覆盖了 OpenAI、Anthropic、Grok、DeepSeek、智谱 GLM、Kimi、MiniMax、阶跃 StepFun、小米 MIMO、SenseNova、火山方舟、阿里百炼，以及 OpenRouter 聚合网关等。

## 三、安装与快速开始

### 1. 下载安装包

打开 [latest release](https://github.com/aipoch/open-science/releases/latest)，展开 **Assets**，按平台选择：

| 平台 | 安装包 |
| --- | --- |
| macOS Apple Silicon（M1+） | macOS DMG（ARM64） |
| macOS Intel | macOS DMG（x64） |
| Windows x64 | Windows x64 installer |
| Linux x64 | AppImage 或 Debian 包 |

### 2. 首次启动的五步引导

1. **Environment**：检查兼容性、应用存储、安全凭据存储与网络访问。
2. **Agent runtime**：选择并准备 Claude Code / OpenCode / Codex（app 托管运行时可免 Node 安装）。
3. **Model provider**：连接并测试所选模型（内置厂商、自定义网关，或 Claude/Codex 订阅登录）。
4. **Notebook runtime**（可选）：准备 app 托管的 Python / R，或注册已有的解释器。
5. **Data location**：选择大文件、notebook、上传与环境的存储位置。

### 3. 从源码开发

```bash
git clone https://github.com/aipoch/open-science.git
cd open-science
npm install      # 自动生成 Prisma client 并安装 Electron 原生依赖
npm run dev      # 启动 Electron 主进程 / preload，打开桌面应用
```

开发数据隔离在 `~/.open-science-project` 下。常用脚本：`npm run lint`、`npm run typecheck`、`npm test`、`npm run build:mac|win|linux`。

## 四、使用方法与实战

### 启动一个研究项目

1. 点击 **New project**，给定稳定的研究名称与可选描述。
2. 开一个 session，用自然语言描述目标、输入数据、约束、期望输出与校验方式。
3. 附上源文件，选择已验证模型，并选择审批模式（`Ask for approval` / `Auto-approve edits` / `Full access`）。
4. 发送任务后，在预览面板检查 agent 的工具活动、审批敏感操作、打开生成的产物。
5. 想换方向时，编辑一条早期消息并在新分支重新发送；用消息修订控件在两条路径间切换。

### 用 CLI 做无头自动化

安装后可在 `Settings → General → Command line tool` 一键装好 `open-science` 命令，无需开浏览器即可提交任务：

```bash
# 后台启动本地服务
open-science start --no-open

# 创建项目并运行一个文献综述任务，等待完成
open-science project create "Systematic review"
open-science run --project "Systematic review" \
  --prompt-file ./task.md \
  --approval-profile auto \
  --skill literature-review \
  --wait --json

# 下载生成的产物
open-science artifacts list <session-id> --json
open-science artifacts download <artifact-id> --output ./report.md
```

### 在远程 HPC 集群上跑任务

启用 **Remote Compute (SSH)** 技能（`Settings → Skills`），在 `Settings → Compute` 注册集群，会话中用 `/remote-compute-ssh` 选择该技能。它负责主机注册、SSH 短命令与全异步作业提交——作业完成时应用会自动开启一个分析回合，你无需自己写轮询循环。

### 技能与连接器生态

- **18 个精选科研技能**：AlphaFold2、Boltz、Borzoi、Chai-1、DiffDock、ESM-2、ESMFold2、Evo 2、ProteinMPNN、scGPT、scvi-tools、SolvableMPNN，以及 Literature Review、Indication Dossier、OpenFold3、LigandMPNN、Remote Compute（SSH）等；也支持创建个人技能、导入 GitHub 上的 `SKILL.md` / ZIP / `.skill` 包。
- **24 个内置科研连接器**：Literature Graph、PubMed、bioRxiv、Genes & Ontologies、Genomes、BioMart、Variants、Clinical Genomics、Structures & Interactions、ChEMBL、ZINC、Clinical Trials、Drug Regulatory 等，全部置于权限系统之下，支持 `Always allow` / `Ask each time` / `Block`。

## 五、常见问题与解决方案

- **首次启动 `Continue` 按钮是灰的？** 当前步骤尚未满足条件：修复标记为 `Action needed` 的环境行、安装/修复所选 Agent 运行时，或校验模型提供商连接。`Continue` 出现前，所有必需的环境与 Agent 运行时检查必须通过、模型连接必须成功。
- **模型连接测试失败？** 检查 API Key 是否缺字符/空格、Base URL 与区域是否正确、是否使用了厂商精确 model ID，并确认网络访问与账户余额。Claude 订阅则重试共享浏览器登录或刷新隔离的 `claude setup-token` 凭据。
- **需要 API Key 吗？** 复用已有订阅登录（Claude 共享/隔离登录，或 Codex 后端的 ChatGPT/Codex 登录）则不需要；内置云厂商与自定义网关仍需要各自的 Key。
- **研究数据会离开本机吗？** 项目、会话、文件、设置与凭据默认存本地；但发给模型请求、联网搜索或连接器调用的内容仍会发往你选定的外部服务，运行前请审阅敏感输入与厂商策略。
- **如何确认某个结果的来源？** 打开生成的产物 → 选择 **Provenance** → 选版本，即可查看内容指纹、可验证的生产者代码、执行历史、输入引用、环境清单、产生会话上下文与评审证据；无法验证的部分会被标注为「不可用」。

## 六、总结

Open Science 不是「套壳聊天框」，而是围绕**持久化项目、真实执行、文件与产物管理、可审阅工具活动**组织起来的科研工作台。它在「AI 帮科研提速」与「科研必须可复现、可审计」之间做了一个明确的工程取舍：本地优先保住数据所有权，不可变产物 + 溯源视图保住可复现性，多后端多模型保住选择自由，而 18 项技能 + 24 个连接器则把「让 agent 真正去查、去算、去跑」落到实处。

如果你做生物信息、计算化学或任何需要把「分析过程」和「结论」一并留存的研究，它值得一试——毕竟它是 Apache-2.0、无席位费，且能在你自己的电脑上完整运行。⭐ 觉得有用，不妨去 GitHub 给个 star。
