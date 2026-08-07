---
title: "JiuwenSwarm：让多智能体协作真正跑起来的开源 Agent 系统"
date: 2026-08-08
description: "JiuwenSwarm 是 openJiuwen 团队开源的 Agent 系统，通过 Leader 编排 + 分布式智能体集群、Swarmflow 工作流、Skill 自进化与工具权限安全，让自然语言驱动的多智能体协作从 Demo 走向生产。支持单机到集群、浏览器/终端/IM 多入口接入。"
author: "Cheman"
slug: jiuwenswarm
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI Agent", "多智能体协作", "自动化"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**JiuwenSwarm**，一个把"多智能体协作"从 PPT 概念真正落成可执行系统的开源 Agent 框架——你用自然语言描述意图，它自动拆任务、组团队、调工具、交付结果。

## 一、项目概述

**JiuwenSwarm** 是 openJiuwen 团队开源的 Agent 系统，面向需要自动化复杂任务的开发者与团队。它的核心主张是：让多智能体协作真正 work，而不是停留在"几个 agent 互相喊话"的演示层面。

官方定位很明确——"Understands Your Intent, Evolves Autonomously"（理解你的意图，自主进化）。它具备几个关键能力：

- **多智能体协作（Multi-Agent Collaboration）**：由一个 Leader 负责把复杂任务拆解并组建团队，多个智能体按角色分工、动态协商，而不是单 agent 硬扛。
- **分布式智能体集群（Distributed Agent Swarm）**：Leader 与 Teammate 可以部署在不同进程甚至不同机器上，按规模协同。
- **Swarmflow 工作流**：用自然语言编排工作流，Leader 把任务分解成多阶段流水线，agent 在阶段之间交接。
- **Skill 自进化（Skill Self-Evolution）**：自动检测错误信号和用户不满，反过来优化 Skill 定义。
- **Skill Hub 共享**：能力资产一次构建、处处复用，通过 Swarm Skills Hub 搜索、安装、混搭、发布。
- **Auto Harness**：以评估驱动的方式端到端优化"harness"本身，在实践中学习改进，无需训练模型权重。
- **AI 基础设施兼容**：兼容华为云 MaaS、OpenAI 兼容 API、本地模型等主流平台。
- **工具权限与安全**：每一步都在你的掌控之下，工具执行前需审批，文件访问走白名单，敏感操作被拦截。

从 `pyproject.toml` 看，当前版本为 `0.2.4.beta4`，要求 Python `>=3.11,<3.14`，依赖中同时包含 `chromadb`、`pgvector`、`sqlite-vec`、`faiss-cpu` 等向量/检索引擎，以及 FastAPI、uvicorn 服务端栈，还有 Telegram/Discord/Slack/钉钉/企微等 IM SDK——定位是一个"能落地的协作运行时"，而非概念玩具。

## 二、技术原理

### 2.1 架构主线：Leader + Teammate

JiuwenSwarm 的协作模型是一个典型的"调度者—执行者"分层结构：

```
用户意图（自然语言）
        ↓
     Leader（编排者）
        ↓ 拆解复杂任务、组建团队、编排 Swarmflow
  ┌─────────┬─────────┬─────────┐
Teammate1  Teammate2  Teammate3  ...
  (专项)    (专项)    (专项)
        ↓ 动态协商 / 阶段交接
      结果汇总 → 交付
```

`pyproject.toml` 中暴露的入口脚本印证了这套架构分工：`jiuwenswarm`（主 CLI）、`jiuwenswarm-start`（启动服务）、`jiuwenswarm-agentserver`（`server.app_agentserver`，即智能体服务端）、`jiuwenswarm-gateway`（网关）、`jiuwenswarm-web`（Web 通道）。Leader 与 Teammate 通过 Agent Server + Gateway 解耦，因此可以跨进程、跨机器部署。

### 2.2 Swarmflow：自然语言编排流水线

Swarmflow 是它区别于普通多 agent 框架的关键。普通框架往往是"一个 prompt 调一群 agent"，而 Swarmflow 让 Leader 把任务分解为**多阶段工作流**，每个阶段由不同 agent 处理，并在阶段之间做 handoff（交接）。这对长链路任务（例如"调研新能源行业并产出分析报告"）尤其有价值——能避免单 agent 上下文爆炸，也能让每个阶段用最合适的工具/模型。

### 2.3 Skill 自进化与 Auto Harness

这是项目最具"自主进化"味道的部分：

- **Skill 自进化**：系统监听错误信号与用户满意度，自动回写并优化 Skill 定义。对团队而言，意味着"踩过的坑"会被沉淀进可复用能力，而不是每次重写。
- **Auto Harness**：以评估（evaluation）驱动的方式，端到端优化"harness"（编排与执行外壳）本身。它不碰模型权重，而是在"如何调度、如何组合工具、如何交接"这个层面持续学习改进——这恰好踩中了当下 agent 工程"调 prompt/调度比换模型更划算"的共识。

### 2.4 依赖选型透露的工程取向

从依赖清单能读出不少设计取舍：

- **内存与检索引擎齐备**：`chromadb`、`faiss-cpu`、`pgvector`、`sqlite-vec` 同时存在，说明其 Memory（记忆）与知识检索是核心模块，而非点缀。
- **服务端稳健**：`fastapi` + `uvicorn[standard]`，并引入 `opentelemetry`（api/sdk/otlp 三种 exporter），说明面向可观测的生产部署。
- **安全前置**：依赖里直接给已知 CVE 设了地板版本——`lxml>=6.1.0`（CVE-2026-41066 XXE）、`pillow>=12.2.0`（CVE-2026-40192 FITS gzip bomb DoS）、`python-multipart>=0.0.31`（CVE-2026-42561 解析 DoS）。这种"在依赖层面锁死漏洞版本"的做法，在开源 agent 项目里相当少见且专业。
- **HarmonyOS 适配**：专门提供 `harmony` 可选依赖组，剔除 C 扩展/系统依赖，做鸿蒙 PC 兼容——明显是面向国内多端场景的考量。

## 三、安装与快速开始

### 环境要求

- Python `>=3.11,<3.14`
- 一个可用的模型（必填，唯一不能跳过的配置）：华为云 MaaS、OpenAI、DeepSeek、DashScope、SiliconFlow、OpenRouter 等 OpenAI 兼容 API，或本地模型。

### 方式一：命令行（pip）

```bash
# 安装 JiuwenSwarm
pip install jiuwenswarm

# 国内镜像（推荐）
pip install jiuwenswarm -i https://pypi.tuna.tsinghua.edu.cn/simple

# 首次初始化
jiuwenswarm-init

# 启动（启动后访问 http://localhost:5173）
jiuwenswarm-start
```

若要用终端界面（TUI）：

```bash
pip install jiuwenswarm-tui -i https://pypi.tuna.tsinghua.edu.cn/simple
jiuwenswarm-tui
```

### 方式二：桌面一键安装

Windows 10/11、macOS（Intel/Apple Silicon）、鸿蒙 PC 均提供桌面版一键安装，无需配置环境，官网下载后跟着安装向导走即可。

### 方式三：源码安装

```bash
git clone https://github.com/openJiuwen-ai/jiuwenswarm.git
cd jiuwenswarm
uv venv
uv pip install -e .
```

## 四、使用方法与实战

### 4.1 配置模型

首次执行 `jiuwenswarm-start` 时会在 `~/.jiuwenswarm/config/config.yaml` 生成配置，改完保存即热加载（无需重启）。以 DeepSeek 为例：

```yaml
model_name: deepseek-v4-flash
api_base: https://api.deepseek.com
api_key: sk-your-api-key
model_provider: OpenAI
```

也可在 Web UI 的「More → Configuration」里直接配置。

### 4.2 两种空间与两种模式

工作台通过左上角选择器切换两个空间：

- **Work**：办公、协作与通用任务
- **Code**：在指定项目目录里查看/修改代码

聊天输入框旁的模式选择器决定执行方式：

| 模式 | 行为 | 适用 |
| --- | --- | --- |
| Agent 模式 | 单 agent 独立处理，支持任务规划与动态调整 | 日常问答、代码生成等多数任务 |
| Cluster 模式（默认） | 多智能体协作，Leader 编排多个专项 agent | 需要多角色协作的大型复杂任务 |

**Cluster 模式**示例输入：

```text
对新能汽车产业做深度调研，并产出一份分析报告。
```

**Agent 模式**示例输入：

```text
查一下北京今天的天气，并推荐 3 本关于人工智能的书。
```

在 IM 通道和 TUI 中，还可用 `/mode` 切换更细的子模式（`agent.plan`、`agent.fast`、`code.normal`、`code.team`、`team`）。

### 4.3 接入 IM 通道

在 Web UI 或 `config.yaml` 里 `enabled: true` 并填入对应平台凭据，就能在常用 IM 里与同一个 agent 对话：

- **国内**：小艺、飞书、钉钉、企业微信、个人微信
- **国际**：Telegram、Discord、Slack、WhatsApp

飞书、企微还额外支持数字人（Digital Avatar）能力。

### 4.4 实战：让集群帮你写行业报告

在 Cluster 模式下输入"调研 X 行业并产出报告"，Leader 会自动拆成多个阶段（资料检索 → 信息抽取 → 结构化写作 → 复核），由不同 Teammate 接力完成，最终结果回到对话里。配合 Skill Hub 里现成的调研/写作 Skill，可以做到"一次安装、反复复用"。

## 五、常见问题与解决方案

### Q1：必须配置模型吗？
是的，`pyproject.toml` 和文档都强调默认模型是唯一必填配置。不配模型，agent 无法推理。配置写入 `config.yaml` 后保存即热加载。

### Q：工具每次都要点审批，能不能关？
默认工具执行前需审批。如果你信任运行环境，可在「Tool Permissions & Security」里调整策略，放宽审批要求；同时文件访问走白名单、敏感操作被拦截，是内置的纵深防御。

### Q：Python 版本报错？
依赖明确 `requires-python = ">=3.11,<3.14"`。低于 3.11 或 ≥3.14 都会装不上，建议使用 `uv` 或 `pyenv` 锁定 3.11~3.13。

### Q：IM 通道连不上？
逐条核对：① `config.yaml` 中该通道 `enabled: true`；② 平台凭据（token/app secret）正确且未过期；③ 群聊场景通常需 @ 提及机器人才能触发。

### Q：想本地跑模型，怎么接？
只要暴露 OpenAI 兼容 API（api_base + api_key）即可，无论是本地推理框架还是华为云 MaaS 都能直接填进 `config.yaml`。

## 六、总结

JiuwenSwarm 的价值不在于"又做了一个 agent 框架"，而在于它把多智能体协作工程化里最难的几件事（编排、分布式协同、工作流交接、能力沉淀、安全管控）打包成了一个开箱即用的运行时。Swarmflow 的多阶段交接、Skill 自进化与 Auto Harness 的"编排自优化"，让它更像一个会越用越聪明的协作操作系统；而在依赖层面锁死 CVE、内置工具审批/白名单，则显示出面向真实部署的成熟度。

如果你正被"单 agent 上下文爆炸""多 agent 互相甩锅""能力无法复用"这些问题困扰，JiuwenSwarm 的 Leader/Teammate 分层 + Swarmflow + Skill Hub 设计，值得花一个下午clone 下来跑一遍。
