---
title: "OpenJarvis：让个人 AI 真正运行在你的个人设备上"
date: 2026-08-03
description: "OpenJarvis 是斯坦福 Hazy Research 开源的本地优先（local-first）个人 AI 框架，用共享原语、以能耗/FLOPs/延迟/成本为第一约束的评测体系，以及基于本地轨迹的学习闭环，让人人都能在本地设备上构建默认离线运行、按需上云的个人智能体。"
author: "Cheman"
slug: openjarvis
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 人工智能, 本地部署, AI Agent]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenJarvis**，一句话概括它的核心价值——把"个人 AI"的智能重新放回你自己的设备里，默认本地运行，只在真正必要时才调用云端。

## 一、项目概述

个人 AI Agent 正快速普及，但绝大多数方案依然把"智能"路由到云端 API：你的"个人"AI，实际上依旧依赖别人的服务器。OpenJarvis 正是要打破这个局面——它是一个**本地优先（local-first）的个人 AI 框架**，由斯坦福 Hazy Research 与 Scaling Intelligence Lab 主导开发，出自 "Intelligence Per Watt"（每瓦智能）研究计划。

其团队此前的研究表明：本地语言模型已经能处理 88.7% 的单轮对话与推理请求，且从 2023 到 2025 年，智能效率提升了 5.3 倍。模型与硬件渐趋成熟，缺的是一套让本地优先个人 AI 真正落地的软件栈——OpenJarvis 就是这套栈。

它围绕三个核心思想构建：

- **共享原语（Shared Primitives）**：用于在端侧设备上构建 Agent 的基础构件；
- **以能效为第一约束的评测（Energy-aware Evaluations）**：把能耗、FLOPs、延迟、美元成本与准确率同等对待；
- **基于本地轨迹的学习闭环（Learning Loop）**：用本地 trace 数据持续改进模型。

其目标很清晰：构建默认本地运行、仅在必要时才上云的个人 AI Agent；同时它既可作为研究平台，也可作为本地 AI 的生产级底座，愿景对标 PyTorch 在深度学习中的地位。

## 二、技术原理

### 架构分层：执行模式 + 内置 Agent + 技能系统

OpenJarvis 把 Agent 抽象为三种执行模式：**on-demand（按需）**、**scheduled（定时）**、**continuous（持续）**，并在其上内置了八个 Agent：

| Agent | 执行模式 | 作用 |
|-------|----------|------|
| `morning_digest` | Scheduled | 聚合邮件、日历、健康、新闻的每日语音简报（含 TTS） |
| `deep_research` | On-demand | 跨网页与本地文档的多跳研究，带引用 |
| `monitor_operative` | Continuous | 长程监控，带记忆、压缩与检索 |
| `orchestrator` | On-demand | 多轮推理，自动选择工具 |
| `native_react` | On-demand | ReAct（Thought-Action-Observation）循环 |
| `operative` | Continuous | 带状态管理的持久自主 Agent |
| `native_openhands` | On-demand | CodeAct，生成并执行 Python 代码 |
| `simple` | On-demand | 单轮对话，无工具 |

### 共享原语与技能（Skills）体系

Skills 是 OpenJarvis 的核心抽象之一——**每个技能本身就是一个工具**，Agent 从 catalog 中发现它们并按需调用。技能遵循 [agentskills.io](https://agentskills.io/specification) 开放标准，可从以下来源导入：

- **Hermes Agent**（约 150 个技能）
- **OpenClaw**（约 13,700 个社区技能）
- 任意 GitHub 仓库

这种"技能即工具"的设计，让 Agent 的能力可以像软件包一样被安装、同步、优化和基准测试：

```bash
# 从公共源安装技能
jarvis skill install hermes:arxiv
jarvis skill sync hermes --category research

# 用任意 Agent 调用技能
jarvis ask "Use the code-explainer skill to explain this Python code: for i in range(5): print(i*2)"

# 基于本地轨迹优化技能
jarvis optimize skills --policy dspy

# 基准测试技能影响
jarvis bench skills --max-samples 5 --seeds 42
```

### 以能效为第一约束的评测

从 `pyproject.toml` 的依赖设计可以看出框架对"生产级可观测性"的重视——它把评测、能耗、学习拆成大量可选依赖组：

```toml
energy-amd = ["amdsmi>=6.1"]
energy-apple = ["zeus-ml[apple]"]
energy-all = ["pynvml>=12.0", "amdsmi>=6.1", "zeus-ml[apple]"]
eval-wandb = ["wandb>=0.17"]
eval-sheets = ["gspread>=6.0", "google-auth>=2.0"]
learning-dspy = ["dspy>=2.6"]
learning-gepa = ["gepa>=0.1"]
```

`energy-*` 系列直接对接 NVIDIA（`pynvml`）、AMD（`amdsmi`）、Apple（`zeus-ml`）的硬件能耗接口；`learning-dspy` / `learning-gepa` 则对应 DSPy、GEPA 等优化策略——这意味着评测不只考虑准确率，还会把"每瓦智能"量化为一等公民。

### 多通道与多引擎的插件化设计

框架把推理后端、记忆、通道、沙箱都做成了可选 extras。例如推理引擎可切换 `inference-mlx`（Apple MLX）、`inference-vllm`、`inference-cloud`、`inference-google`、`inference-litellm` 等；通信通道覆盖 Telegram、Discord、Slack、Line、WhatsApp、XMPP、Twitch、Nostr 等近 20 种。这种组合式（composable）设计正是其"共享原语"理念在工程上的落地。

## 三、安装与快速开始

OpenJarvis 的安装尽量做到"一条命令"：每个安装脚本会一并处理 `uv`、Python venv、Ollama 与起步模型，宽带环境下约 3 分钟。

```bash
# macOS · Linux · WSL2
curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash

# Native Windows
irm https://open-jarvis.github.io/OpenJarvis/install.ps1 | iex

# 桌面 GUI：从 Releases 下载 .exe / .dmg / .deb / .rpm / .AppImage
```

安装完成后运行 `jarvis` 即可启动（Rust 扩展与更大模型会在后台继续下载，`jarvis doctor` 可查看状态）。若未激活虚拟环境，可在命令前加 `uv run` 或先 `source .venv/bin/activate`。

环境要求：Python >= 3.10 且 < 3.14（3.14 因缺失 Windows 预编译 numpy wheel 被暂时封顶）；Python 3.10–3.13 均已通过 classifiers 验证。

## 四、使用方法与实战

OpenJarvis 通过 **preset（预设）** 快速切换开箱即用的配置：

```bash
jarvis                          # 开始聊天（默认 chat-simple）
jarvis init --preset <name>     # 切换到某个起步配置
```

常用预设一览：

| 预设 | 作用 |
|------|------|
| `morning-digest-mac` / `morning-digest-linux` / `morning-digest-minimal` | 来自邮件、日历、健康、新闻的语音每日简报 |
| `deep-research` | 跨索引文档、带引用的多跳研究 |
| `code-assistant` | 具备代码执行、文件 I/O 与 shell 访问的 Agent |
| `scheduled-monitor` | 带记忆、按计划的持久 Agent |
| `chat-simple` | 轻量对话，无工具 |

一个完整的"晨间简报"实战示例：

```bash
jarvis init --preset morning-digest-mac
jarvis connect gdrive          # 一次 OAuth 同时覆盖 Gmail / Calendar / Tasks
jarvis digest --fresh          # 生成并播放你的第一份简报
```

对于开发者，贡献者模式基于 `uv` + `maturin`（含 Rust 扩展）构建：

```bash
git clone https://github.com/open-jarvis/OpenJarvis.git
cd OpenJarvis
uv sync --extra dev
uv run pre-commit install
uv run pytest tests/ -v
```

`Makefile` 还镜像了 CI 流程，让本地 `make test` 与 GitHub Actions 保持一致。

## 五、常见问题与解决方案

**1. 安装卡在 Rust 扩展 / 大模型下载**
安装脚本完成后，`jarvis` 即可使用；Rust 扩展与更大模型会在后台异步下载。用 `jarvis doctor` 查看下载进度与状态，无需等待完成再使用基础功能。

**2. Python 3.14 上依赖解析失败**
`pyproject.toml` 显式将 `requires-python` 限制在 `<3.14`，因为 numpy 2.2.x 在 Windows 上无 cp314 预编译 wheel，会导致源码编译失败。请使用 Python 3.10–3.13。

**3. 无法连接 Google 等外部服务**
通道类扩展（如 `channel-gmail`）需要对应的 API 凭据。以 `jarvis connect gdrive` 为例，一次 OAuth 即可同时授权 Gmail / Calendar / Tasks，按提示完成授权即可。

**4. 评测/学习相关命令报错**
`energy-*`、`eval-wandb`、`learning-dspy` 等属于可选 extras，未 `uv sync --extra` 安装时对应命令不可用。按需在 `pyproject.toml` 中补齐对应 extra 再执行。

**5. 本地模型推理性能不足**
按需启用对应推理后端：Apple 芯片用 `inference-mlx`，NVIDIA 用 `inference-vllm`；并通过 `energy-*` 依赖组监控能耗/延迟，找到能效与准确率的平衡点。

## 六、总结

OpenJarvis 不是一个又一个"套壳云端 API"的 Agent 框架，而是试图把个人 AI 的**主权**交还给用户：默认本地运行、以能效为第一约束、用本地数据自我进化。它背后有斯坦福顶级实验室的研究支撑与清晰的论文/榜单/路线图体系，工程上又以"共享原语 + 技能即工具 + 可选 extras"的组合式设计为开发者留足扩展空间。

如果你相信"个人 AI 应当跑在个人设备上"，OpenJarvis 值得 clone 下来亲自跑一遍——尤其适合想要把邮件、日历、健康、研究自动化，却又不希望数据全部外泄到云端的场景。

> 项目地址：[github.com/open-jarvis/OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
> 文档：[open-jarvis.github.io/OpenJarvis](https://open-jarvis.github.io/OpenJarvis/)
> 论文：[arXiv 2605.17172](https://arxiv.org/abs/2605.17172)
