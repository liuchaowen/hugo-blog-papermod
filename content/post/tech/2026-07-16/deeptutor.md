---
title: "DeepTutor：把辅导、解题、出题与研究融进同一套 Agent 的终身学习工作台"
date: 2026-07-16
description: "DeepTutor 是港大 HKUDS 开源的 Agent 原生学习工作台，将聊天、解题、测验、深度研究、可视化与掌握度练习统一在一个可扩展系统中，支持多引擎 RAG 知识库、子智能体与伙伴（Partner）、可检视的个性化记忆，并可作为工具被其他 Agent 驱动。"
author: "Cheman"
slug: deeptutor
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI-Agent, RAG, 教育, LLM]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**HKUDS/DeepTutor**——一个把"辅导、解题、出题、研究、可视化、练习"全部塞进同一个 Agent 循环的终身学习工作台。它不是又一个聊天机器人，而是一整套可扩展的"学习操作系统"。

## 一、项目概述

DeepTutor 把自己定位为 **Agent 原生的学习工作空间（agent-native learning workspace）**。传统的教育/笔记工具往往是割裂的：聊天归聊天、出题归出题、知识库归知识库。DeepTutor 的反直觉做法是用**同一个 Agent Loop** 承载所有模式——Chat、Quiz、Research、Visualize、Solve、Mastery Path 都跑在一条推理链上，你切换的是"目标"而不是"引擎"，上下文始终跟随学习者迁移。

核心特性可以概括为：

- **一套运行时覆盖所有模式**：同一段线程里既能正常对话，也能调用工具、基于知识库检索、读取附件、生成图片、咨询子智能体、写入笔记，并在多轮之间保持连续上下文。
- **连通的学习上下文**：知识库、书籍、Co-Writer 草稿、笔记、题库、人格（Persona）和记忆（Memory）在所有工作流之间共享，而不是散落在孤立的工具里。
- **子智能体与伙伴（Partners）**：随时接入一个在线的 Claude Code / Codex / Partner（或导入它们过去的对话），并能在同一个"大脑"上运行持续在线的 IM 伙伴。
- **多引擎知识库**：在 LlamaIndex、PageIndex、GraphRAG、LightRAG 或可链接的 Obsidian 保险库之间做版本化的 RAG，并支持可插拔的文档解析引擎。
- **可扩展工具与技能**：内置工具、MCP 服务器、图像/视频/语音生成模型，以及来自 EduHub 社区的可安装技能。
- **可检视的记忆**：L1 原始轨迹、L2 表层摘要、L3 综合记忆三层结构让个性化"可见且可编辑"，并用记忆图谱把每条结论回溯到其证据来源。

项目基于 Python 3.11+ 与 Next.js 16，采用 Apache 2.0 许可，并配套了中、日、西、法、阿、俄、印、葡、泰、波等多语言 README 与 arXiv 论文（2604.26962），社区活跃度很高（Discord、飞书、微信群等）。

## 二、技术原理

### 统一的 Agent Loop

整套系统的灵魂是 Chat 里的那个"你真正在用的循环"。它的逻辑刻意保持简单：模型**按轮次思考**，在有需要时**调用工具**，观察返回结果，最后以一个不调用工具的消息收尾。

```
模型思考 → 调用工具(tool_call) → 观察结果(tool_result) → 继续思考 / 收尾消息(done)
```

其中 `ask_user` 是一个特殊工具：当模型不确定时，它可以暂停当前轮次，抛出一个结构化的澄清问题，**等你回答后再续上上下文**，而不是凭空猜测。

用户可开关的工具包括 `brainstorm`、`web_search`、`paper_search`、`reason`、`geogebra_analysis`，以及配置好对应生成模型后的 `imagegen` / `videogen`；而 `rag`、`read_source`、`read_memory`、`write_memory`、`read_skill`、`load_tools` 等则属于上下文工具，由系统按需注入。

### 多引擎 RAG 与解析管线

从 `pyproject.toml` 的依赖可以看到它的技术选型非常"工程化"：

- **检索后端**：`llama-index-vector-stores-faiss` + `faiss-cpu` 提供向量化 ANN 检索，替代了 LlamaIndex 默认的 `SimpleVectorStore`，在大型知识库上显著更快；
- **文档解析**：`PyMuPDF` / `pdfplumber` 做基础解析，`PyMuPDF4LLM` 提供轻量 Markdown 抽取，而重量级的 `mst/gn`（微软 GraphRAG）与 `HKUDS/LightRAG`（含 RAG-Anything 多模态解析，经 MinerU 转译）作为可选引擎按需安装；
- **后端框架**：`fastapi` + `uvicorn` 提供 API，`pydantic` / `pydantic-settings` 做配置与数据校验；
- **多用户**：`pocketbase` 提供隔离的多用户会话存储，支持 Mattermost、Discord、飞书、微信等 IM 渠道；
- **可组合性**：`mcp>=1.26` 作为 MCP 客户端，支撑延迟工具（deferred tools）与社区技能扩展。

值得注意的一处工程细节：依赖刻意把 `pdfplumber` 锁在 `<0.11.8`，因为 0.11.8+ 会把 `pdfminer.six` 钉死到某个版本，而与通过 RAG-Anything 引入的 `mineru` 冲突；GraphRAG / LightRAG 用 `python_version < '3.14'` 的 marker 隔离，避免在高版本 Python 上静默回退或降级。这种对依赖地狱的精细控制，正是长期维护型项目的标志。

### 三层记忆与记忆图谱

个性化不只是"记住你说过什么"。DeepTutor 把记忆拆成：

- **L1 轨迹（traces）**：原始交互链路，可审计；
- **L2 表层摘要（surface summaries）**：对交互的归纳；
- **L3 综合（synthesis）**：跨会话的长期画像。

再加上一张**记忆图谱**，把每一个结论/说法都回溯到其证据，让"为什么 AI 会这么建议我"变得透明且可编辑。

## 三、安装与快速开始

DeepTutor 提供四条安装路径，最推荐的是 **PyPI 安装**（完整本地 Web 应用 + CLI，无需 clone）：

```bash
mkdir -p my-deeptutor && cd my-deeptutor
pip install -U deeptutor
deeptutor init   # 提示端口 + LLM 供应商 + 可选 embedding
deeptutor start  # 启动后端 + 前端，保持终端打开
```

`deeptutor init` 会交互式询问后端端口（默认 `8001`）、前端端口（默认 `3782`）、LLM 供应商 / base URL / API key / 模型，以及一个可选的 embedding 供应商（用于知识库 / RAG）。启动后浏览器打开终端打印的地址（默认 http://127.0.0.1:3782）即可。

环境要求：**Python 3.11+** 与 **Node.js 20+**（PyPI 包会 spawn 打包好的 Next.js standalone server）。若从源码开发，则建议 Node.js 22 LTS 以对齐 CI 与 Docker。

## 四、使用方法与实战

### Web 应用：一条线程走天下

日常主要入口是 Chat、Partners、My Agents、Co-Writer、Book、Knowledge Center、Learning Space、Memory 与 Settings。在 Chat 里，同一段线程就能完成：正常对话 → 调用工具 → 基于选中知识库检索 → 读附件 → 生成图片 → 咨询子智能体 → 写笔记，且跨轮次上下文不丢。

### CLI：Agent 原生接口

一个 `deeptutor` 二进制，两种方式进入：给人的**交互式 REPL**，以及给其它 Agent 的**结构化 JSON**。能力、工具、知识库完全一致。

```bash
deeptutor chat                                              # 交互式 REPL
deeptutor chat --capability deep_solve --kb my-kb --tool rag
deeptutor run chat "解释傅里叶变换" --tool rag --kb textbook
deeptutor run deep_research "调研 2026 年 RAG 论文" \
  --config mode=report --config depth=standard
```

### 让另一个 Agent 来驱动它

这是它最"原教旨"的设计——**DeepTutor 生来就是要被另一个 Agent 操作的**。在任意 `run` 后加上 `--format json`，每一轮会以 **NDJSON（每行一个事件：`content` / `tool_call` / `tool_result` / `done` …）** 流式输出，其它 Agent 可把它当作一个工具来调用。这让它天然适配多智能体编排场景。

### 实战示例：基于私有教材出题与练习

```bash
# 1. 建一个知识库（RAG）并喂入教材
deeptutor kb create textbook
deeptutor kb ingest textbook ./math-textbook.pdf

# 2. 基于该知识库出题
deeptutor run quiz "围绕第三章出 5 道选择题" --kb textbook --tool rag

# 3. 进入掌握度练习路径
deeptutor run mastery_path "复习傅里叶级数" --kb textbook
```

## 五、常见问题与解决方案

- **安装失败 / 依赖冲突**：GraphRAG、LightRAG 等重量级引擎会经 MinerU 拉入 `pdfminer.six` 等会冲突的依赖，项目已用版本锁与 `python_version` marker 隔离；若仍冲突，建议用虚拟环境或 conda 安装，并避免一把梭 `pip install deeptutor[all]`。
- **知识库检索不准 / 极小时库检索不到**：v1.4.13 起已修复极小知识库的可靠检索；确认文档并非处于 `error` 状态（v1.5.1 起可单独删除失败文档，无需删库重建）。
- **多用户部署隔离问题**：PocketBase 会话默认按用户隔离（v1.4.12+），启用多用户前先规划 `DEEPTUTOR_HOME` 与数据目录布局。
- **容器启动异常**：v1.4.13 起支持 rootless Podman 干净启动；若用 Docker，参考官方多阶段 Dockerfile（同时打包 FastAPI 后端与 Next.js 前端）。
- **IM 渠道（飞书/微信/微信/Mattermost）接入**：属 Partner 渠道能力，需按各平台 SDK 配置；非管理员用户默认 deny-by-default 的 MCP 工具权限（v1.4.10+）。

## 六、总结

DeepTutor 的野心不在于"又一个更聪明的辅导 AI"，而在于**把学习这件事的所有环节收敛到一个可扩展、可检视、可被其它 Agent 编排的系统里**。统一的 Agent Loop、多引擎可插拔 RAG、三层可追溯记忆，以及"生来就可被 Agent 驱动"的 CLI/JSON 接口，让它既适合个人学习者打造私有的终身学习伙伴，也适合团队把教育能力嵌入更大的智能体工作流。如果你想看看"以 Agent 为中心"的学习工具长什么样，它值得一键 `pip install`。

> 项目地址：https://github.com/HKUDS/DeepTutor
