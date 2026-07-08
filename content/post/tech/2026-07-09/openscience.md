---
title: "OpenScience：会读文献、写代码、跑实验并自动成文的开源科研工作台"
date: 2026-07-09
description: "OpenScience 是开源的科研 AI 工作台，在浏览器中跑完整个科研闭环：读文献、提假设、写并运行代码、调取 30+ 科研数据库、最终自动产出论文，兼容任意前沿/开源大模型。"
author: "Cheman"
slug: openscience
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["OpenScience", "AI Agent", "科研自动化", "LLM", "开源"]
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

今天在 GitHub 上看到一个热度飙升、俨然冲上 Trending 的开源项目：**OpenScience**——一个把"科研闭环"完整搬进浏览器的 AI 工作台。你给它一个目标，它会读相关论文、形成假设、写并运行代码、在真实算力上做实验、查询主流科研数据库，最后把结果整理成文稿。

## 一、项目概述

OpenScience 的定位是 **AI workbench for scientific research**。它不像传统科研辅助工具只做文献检索或单点计算，而是把一个称职的研究合作者会做的事串成一条连续的工作流：

- **Literature review → Hypothesis → Code → Experiment → Analysis → Write-up**，一个会话内闭环完成；
- **研究智能体**：默认 `research` 智能体，外加 `biology`、`physics`、`ml` 三个专科智能体，并配有批判（critique）与文献综述子智能体，以及一个只读的 `plan` 模式；
- **290+ 技能包**：覆盖训练（DeepSpeed、PEFT、TRL）、评估、数据集处理、分子与临床生物学、化学信息学、论文与 LaTeX、图表，以及云算力（Modal、Tinker 等）；
- **科研数据库即工具**：UniProt、PDB、Ensembl、ChEMBL、PubChem、arXiv、OpenAlex、Semantic Scholar 等约 30 个数据库可直接被智能体查询；
- **真实工作区**：浏览器 UI 内含文件树、编辑器、终端、会话历史，并能内联渲染分子、结构、基因组与图表；
- **可扩展**：LSP 集成、MCP 服务器、插件、自定义智能体与命令、TypeScript SDK。

最重要的是，它**模型无关、开源、本地优先**：用你自己的 API Key 对接 Anthropic、OpenAI、Google 等数十家供应商，无需注册账号；也可接入 Synthetic Sciences 的托管平台 Atlas（可选，不强制）。

## 二、技术原理

### 2.1 系统形态：本地优先的三层结构

当你运行 `openscience`，CLI 会启动一个本地服务器并在浏览器打开工作区，所有组件都跑在你的机器上：

```
  Browser workspace  (frontend/workspace, SolidJS)
        |  HTTP + SSE, localhost only
        v
  Local server       (backend/cli/src/server)
        |
        +--  Agent runtime      sessions, message loop, model routing
        +--  Tool layer         shell, edit, LSP, MCP, science connectors
        +--  Skills             bundled and user-installed skill packs
        +--  Providers          Anthropic, OpenAI, Google, and 75+ more
        |
        +--  Atlas client       optional: managed models, wallet, graph
```

服务器只绑定 `127.0.0.1`，并强制校验 Host 与 Origin 白名单——**没有远程模式**，从网络边界上就杜绝了外部访问。

### 2.2 后端：Bun + TypeScript 编译为单文件原生二进制

`backend/cli` 是一个 Bun + TypeScript 应用，会按平台编译成**单一原生二进制**：

- `src/index.ts` 注册 CLI 命令并启动进程；不带子命令运行 `openscience` 即打开工作区（`src/cli/cmd/web.ts`）；
- `src/server` 是一个 **Hono** 服务器，托管内嵌的工作区 UI，暴露会话与工具 API，并通过 **SSE** 把事件流式推回浏览器；
- `src/session` 是智能体运行时：消息循环、工具分发、上下文压缩（compaction）、溯源（provenance），以及在收尾时运行一个可选的"盲审"关卡（blind reviewer gate）；
- `src/agent` 持有智能体注册表与提示词，默认 `research`，`biology`/`physics`/`ml` 为专科，`plan` 为只读模式；
- `src/provider` 对**每一次请求**单独路由模型，模型定义来自 [models.dev](https://models.dev)，会在本地缓存并以内置快照兜底；
- `src/tool` 与 `src/science` 实现智能体可调用的工具：shell、编辑器、LSP 桥、MCP 客户端，以及一系列科研数据库连接器。

这种"**按请求路由模型**"的设计很关键——你可以在不同供应商甚至本地模型之间切换，而不必改动任何其他代码。

### 2.3 提示词双层架构

提示词分两层拼装：

1. **供应商级系统提示**：由所选模型决定（`src/session/system.ts`）；
2. **智能体级工作流提示**：按智能体名注入（`src/session/prompt.ts`）。

两者叠加，既保证模型能力的正确引导，又保证不同研究领域（生物/物理/机器学习）有专属的工作流。

### 2.4 技能即指令包

技能（Skills）是智能体按需加载的指令包（`src/skill`）。发布版本会从 Atlas 技能索引拉取目录并缓存；从源码运行则直接加载内置的 `skills/` 树。少量系统技能（例如 `initialize-atlas-graph`）被内嵌以保证可解析。

## 三、安装与快速开始

### 3.1 环境要求

- Node.js 环境（使用 npm 全局安装或 `npx`）；
- 若要从源码开发，需要 **Bun 1.3+**。

### 3.2 安装并打开工作区

```bash
# 全局安装，命令即为 openscience
npm install -g @synsci/openscience
openscience
```

不想全局安装，也可以一步到位：

```bash
npx synsci
```

`openscience` 会在浏览器打开工作区。首次运行会有简短的初始化引导你选择模型供电方式：Atlas 托管模型、自带供应商 Key，或跳过先用免费 demo 模型。各平台二进制也随 [GitHub Releases](https://github.com/synthetic-sciences/OpenScience/releases) 提供。

### 3.3 配置 API Key 并启动

```bash
# 设置任意供应商的 Key
export ANTHROPIC_API_KEY=sk-ant-...
openscience
```

Key 始终留在本地机器，请求直接发往供应商。也可以用 `openscience keys add` 在终端存储 Key，或从 Credentials 面板添加，再在模型选择器里挑选模型。要打开某个具体项目的会话：

```bash
openscience ~/code/my-project
```

## 四、使用方法与实战

### 4.1 研究与专科智能体

默认 `research` 智能体走完整科研闭环；遇到生物/物理/机器学习课题时，可切换到对应的专科智能体，它们携带领域专属技能与提示词。需要只规划不动手时，用只读的 `plan` 模式。

### 4.2 把科研数据库当工具用

智能体可以直接查询约 30 个科研数据库。例如在分子生物学方向，可让 OpenScience 连 UniProt 取蛋白序列、连 PDB 取结构、连 ChEMBL 做化合物检索，并把结果喂给后续的分析代码——整个过程对智能体是"透明"的工具调用，无需你手动复制粘贴。

### 4.3 Atlas 托管平台（可选）

```bash
openscience login     # 连接 Atlas 账号
openscience wallet    # 查看余额与充值
```

Atlas 提供精选的前沿模型（按预付费钱包计费，免逐家配置 Key）、持久化科研图谱与云算力。OpenScience 与 Atlas 协作但**从不强依赖**；自带 Key 的使用永远免费、不被设限。用 `openscience status` 查看当前连接，`openscience logout` 断开。

### 4.4 配置文件

全局配置位于 `~/.config/openscience/openscience.json`，项目级配置位于仓库根的 `openscience.json` 或 `.openscience/` 目录。自定义智能体、命令、工具、插件与主题都从这些目录加载。

```json
{
  "provider": "anthropic",
  "model": "claude-opus-4",
  "workspace": {
    "bind": "127.0.0.1",
    "port": 0
  }
}
```

## 五、常见问题与解决方案

### 5.1 "代理没有被沙箱隔离"——安全边界要自己把控

官方明确提醒：**智能体不在沙箱中运行**。权限系统只是让你"知晓"智能体在做什么，并非隔离边界。若需要隔离，请在容器或虚拟机中运行。此外，供应商与同步凭据会从子进程环境中过滤，并在输出中脱敏。

> 实践建议：在 Docker 或 VM 里跑 `openscience`，把数据卷挂进去，既享受自动化又保留隔离。

### 5.2 模型路由 / Key 相关问题

- **没有可用模型**：先 `openscience keys add` 添加 Key，或在初始化时选择免费 demo 模型；
- **想换模型但代码不动**：得益于"按请求路由"，直接用模型选择器切换即可；
- **离线 / 私有模型**：`src/provider` 支持本地模型，配置好端点即可。

### 5.3 端口与远程访问

服务器只绑定 `127.0.0.1` 且校验 Host/Origin，**不要试图把它暴露到公网**。如需远程访问，请用 SSH 端口转发或反向代理，而不是改 Binding 地址。

### 5.4 性能与上下文

长会话会触发 `src/session` 的上下文压缩（compaction）以控制 token 消耗；若做重型实验，优先用 Atlas 云算力或本地 GPU 资源，避免把大计算压在笔记本上。

## 六、总结

OpenScience 把"读文献—提假设—写代码—跑实验—出文稿"的科研闭环，折叠进一个本地优先、模型无关、开源可扩展的浏览器工作台。它的工程亮点很清晰：**Hono + Bun 编译的单文件二进制、SSE 流式、按请求路由模型、双层提示词、290+ 技能与 30+ 科研数据库连接器**。对于做机器学习、生物、物理、化学研究的工程师与科学家，它是一个值得放进工具箱的"AI 研究合作者"。

> 项目地址：[github.com/synthetic-sciences/openscience](https://github.com/synthetic-sciences/openscience) ｜ 协议：Apache 2.0 ｜ 文档：openscience.sh/docs
