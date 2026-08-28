---
title: "AgentConnect：把多个 AI 智能体接入团队工作流的开源平台"
date: 2026-08-28
description: "AgentConnect 是一个开源的多智能体协作平台，让 Claude Code、Codex、Grok、DeepSeek 等任意 ACP 兼容智能体在 Slack、Telegram、Discord、Lark 以及 GitHub/GitLab 中与团队并肩工作。本文从架构、核心特性、快速部署到实战用法，带你看懂这个项目。"
author: "Cheman"
slug: agentconnect
draft: false
categories: [开源, 技术]
tags: [GitHub, 开源, 多智能体, AI Agent]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AgentConnect**，一个开源的「多智能体协作」平台，让你把 Claude Code、Codex、Grok Build、DeepSeek、Pi 等任意 ACP 兼容智能体直接接入团队已经在用的 Slack、Telegram、Discord、Lark 以及 GitHub/GitLab 工作流中，智能体之间还能彼此调用、记住学到的东西。

## 一、项目概述

AgentConnect 的定位是「开源版的 Claude（原 Anthropic）多智能体协作方案」。它解决的核心痛点是：现在大多数 AI 智能体还停留在「个人工具」形态——跑在某一个人的终端里，队友看不到它在做什么、无法接管会话、无法 review 它的产出，它积累的上下文也只留在一台笔记本上。于是每个团队都在重复造同样的「胶水代码」：消息通道接入、定时任务、凭证管理、上下文拼接。

AgentConnect 把这些胶水代码变成了一个平台。你可以给每个智能体分配角色，让人和智能体在共享会话里协作；智能体之间可以互相调用、记忆学到的知识，工作可以从一条消息、一个 issue、一个 PR、一个 webhook 或定时任务开启。

核心能力：

- 跨平台工作：Slack / Telegram / Discord / Lark（飞书）以及 GitHub / GitLab。
- 多运行时并肩运行：Claude Code、Codex、Grok Build、DeepSeek、Pi 以及任意 ACP 兼容运行时。
- 自托管：Apache-2.0 协议，智能体执行与 workspace 都在你自己的环境里。

典型用例：

- 共同分诊 issue：人和智能体在同一个线程里调查，拉入专家智能体，从修复到验证全程可见。
- 跨受信任 workspace 的支持：在 Telegram 起一个支持会话，从受信任的 Slack workspace 拉入工程团队，再把结论回到原始会话。
- 周期性运营：从定时任务或 webhook 启动工作，把异常带入共享会话，保留人的决策可见。
- 保持私有 fork 同步：通过 GitHub 订阅上游变更，让智能体评估影响、准备并测试更新。
- 定制化代码评审：每个 PR 跑通用评审，只在需要时拉入架构/安全评审，每个评审可用自己的模型、指令、仓库访问、工具和沙箱策略。

## 二、技术原理

AgentConnect 采用分层架构，数据面与控制面分离。

| 组件 | 职责 |
| --- | --- |
| Daemon | 在 daemon 自有的 ACP 上运行被放置（placed）的智能体，拥有 workspace 与会话状态，维护直接的平台连接和定时任务，并直接发送模型提供方流量 |
| Relay（可选） | 接收基于回调的入口与 webchat，集中代理受管的 MCP 与 OpenConnector 访问，并直接把消息入口转发给所属的 daemon，不做持久化存储 |
| Control Plane + Web UI | 管理认证、配置、放置、权限、元数据和可观测性；只存储显式审批过的组织知识与技能修订，其余按需代理有界的 daemon 读取 |

关键设计：实时平台消息和 ACP 更新流始终留在 daemon/relay 的数据面。除显式审批的组织知识和有界的技能包外，Control Plane 只存协调元数据——不存消息体、附件字节、待定的 Dream 提案或 ACP 会话流。即使 Control Plane 暂时不可用，已建立的会话和 daemon 本地定时任务仍会继续，新指派与配置变更在重连后恢复。

从源码可以看到一些工程取舍：

- 多 workspace 多租户隔离：ESLint 配置里用 `no-restricted-syntax` 规则强制禁止 HTTP 表面与 daemon WS 表面出现「未加租户围栏」的读取（`*Unscoped`），必须走带 org 的围栏方法，对应 `docs/designs/org-scoped-data-layer.md §6`。
- 构建/发布流水线：release.config.js 里用 `tsdown` 把每个依赖内联进 `dist/`，发布到 npm 前把运行时依赖剥离到零，并通过发布前后脚本守卫避免「静默 externalize 导致 ERR_MODULE_NOT_FOUND」。

## 三、安装与快速开始

环境要求：

- 开发：Node >= 24.12.0，pnpm 11。
- 部署：Docker Compose 或 Kubernetes（官方 Helm chart）。

Docker 一键启动（Web 控制台、Control Plane、Relay、PostgreSQL）：

```bash
git clone https://github.com/agentconnect-md/agentconnect.git
cd agentconnect
docker compose up -d --pull always
```

打开 `http://localhost:3000`，在控制台添加一个 daemon，运行它生成的命令，创建你的第一个智能体。默认栈只监听 `127.0.0.1`，使用本地无认证模式用于评估。

Kubernetes 部署使用官方 Helm chart（版本号与 release 一致）：

```text
oci://ghcr.io/agentconnect-md/charts/agentconnect
```

集群安装分三步：创建 namespace 及其 secrets、写部署用的 values 文件、安装，详见 Kubernetes guide。

配置部署：Setup Server 运行在基础栈的 `http://localhost:8091`（始终 loopback），用于配置 Logto 浏览器认证、GitHub/Slack/Google/Lark 应用、登录方式和预设智能体行为。另外仓库自带一个 setup skill（`.claude/skills/agentconnect-setup`），Claude Code、Codex 等智能体可以直接接管交互式安装向导。

## 四、使用方法与实战

创建并使用一个智能体的最小流程：

1. 在控制台创建 agent，指定其 runtime、model、workspace、tools、sandbox 策略。
2. 把 agent 链接到某个平台的 bot（Slack / Telegram / Discord / Lark）或某个 GitHub/GitLab 仓库/工作流。
3. 在对应会话里 `@` 这个智能体，让它和队友一起工作；需要时可让它与别的智能体互相调用。
4. 给每个智能体自己的 memory 和 skills，并把经过评审的 Knowledge 发布出去，供所有智能体按需检索。

进阶用法：

- 自定义代码评审：给每个评审智能体配置独立模型与工具，基础评审覆盖所有 PR，架构/安全评审按需触发。
- 跨平台支持流转：Telegram 起会话、Slack 拉人、结论回原文，实现「受信任 workspace」间的协作。
- 私有 fork 同步：订阅上游 GitHub 变更，由智能体评估影响、准备更新并交团队 review。

## 五、常见问题与解决方案

- **Control Plane 挂了会怎样？** 已建立的会话和 daemon 本地定时任务继续运行，新指派与配置变更在重连后恢复——数据面与控制面分离带来的容错。
- **消息和附件存在哪？** Control Plane 只存协调元数据，不存消息体、附件字节或 ACP 会话流；实时消息留在 daemon/relay 数据面。
- **部署要不要公网？** 默认评估栈只监听 `127.0.0.1` 且无认证，生产部署需配置 Setup Server、公网 URL、Linux 沙箱、各 provider 应用与密钥。
- **Node 版本不够？** 开发依赖 Node >= 24.12.0 与 pnpm 11，低版本会报引擎错误，需先升级。
- **K8s 部署失败？** 不要照抄一行命令，严格按官方 K8s guide 三步走（namespace/secrets → values → install）。

## 六、总结

AgentConnect 把「多智能体如何与团队、与彼此协作」这块最难拼的图补上了：它用开源、自托管、ACP 兼容的方式，统一了消息通道、凭证、定时任务和上下文拼接这些「胶水」，让人和智能体、智能体和智能体在同一个工作流里并肩。如果你正在为团队搭建 AI 协作基础设施，或受够了重复造接入层轮子，这个项目值得 Star 并试跑一把。
