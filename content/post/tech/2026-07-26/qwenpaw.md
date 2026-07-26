---
title: "QwenPaw 深度解析：AgentScope 打造的个人 AI 助手工作站"
date: 2026-07-26
description: "QwenPaw 是 AgentScope 团队开源的本地优先个人 AI 助手，融合三层记忆、内核级沙箱、多智能体编排与全渠道触达，支持本地免费运行 QwenPaw-Flash 模型，把 Agent 真正装进你的设备。"
author: "Cheman"
slug: qwenpaw
draft: false
categories: [技术, 开源, AI]
tags: [GitHub, 开源, AI Agent, 本地部署, AgentScope]
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

**开篇引导段**（1-2句，介绍项目背景，不可跳过，不可出现 `#` 标题）：
今天在 GitHub Trending 上看到一个有意思的项目：**QwenPaw**（Qwen Personal Agent Workstation），一个由 AgentScope 团队打造、主打"本地优先、永不遗忘、随处可达"的个人 AI 助手工作站。它不只是一款聊天客户端，而是把 Agent OS 架构、本地推理与多渠道触达打包在一起的开源解决方案。

## 一、项目概述

QwenPaw 的全称是 *Qwen Personal Agent Workstation*——既取"千问"的聪明，也蕴含一只随时待命、有温度的"小爪子（Paw）"。它的核心主张可以概括为三点：

- **数据属于你**：支持完全本地部署，配置、记忆、技能全部留在你的机器上，没有第三方托管，没有数据上传。
- **能力靠 Skills 驱动**：内置定时任务、PDF/Office 处理、新闻摘要、文件读取等技能，也支持自定义技能与插件市场，可能性是开放式的。
- **随处可达**：同一套 Agent 实例可以同时在钉钉、飞书、企业微信、微信、Discord、Telegram、iMessage、QQ 等渠道在线，配合控制台、TUI 和桌面端直接访问。

从 `pyproject.toml` 的依赖也能看出它的野心：`agentscope==2.0.4.post1` 作为底座，外加上 `dingtalk-stream`、`lark-oapi`、`python-telegram-bot`、`slack-bolt`、`discord-py`、`twilio` 等一整套渠道 SDK，几乎覆盖了主流 IM 生态。

> 2026-07-24 发布的 **v2.0.1** 带来了 PawApp 小程序平台、用户可编辑的 Agent Modes、Oh-My-Paw 插件、ReMe 记忆增强与桌面端体验改进；而此前 **v2.0.0** 是一次基于 AgentScope 2.0 的彻底重写，引入了 Agent OS 架构、Loop Engineering、Scroll Context 与 ReMe v0.4.0 长程记忆。

## 二、技术原理

### 1. Agent OS：资源、治理与沙箱

v2.0.0 最关键的架构升级是 **Agent OS**。每个 Agent 由三根支柱支撑：

- **Resources（资源）**：透明地落在磁盘上，可审计、可备份；
- **Governance（治理）**：allow / deny / ask / sandbox 四种策略，对工具调用做精细管控；
- **Sandbox（沙箱）**：跨平台的内核级隔离，macOS 用 Seatbelt、Linux 用 Bubblewrap/Landlock、Windows 用 AppContainer。

### 2. 三层记忆与 Scroll Context

QwenPaw 强调"永不遗忘"，靠的是三层记忆：

1. **实时工作记忆**：当前对话的 live working context；
2. **完整逐字历史**：全量 verbatim history，老轮次被淘汰（evict）后仍然可被按需召回（recall on demand）；
3. **蒸馏知识**：从交互中提炼出的 distilled knowledge，形成长期语义记忆（ReMe）。

底层由 `reme-ai==0.4.1.3` 提供长程记忆能力。**Scroll Context** 机制让每一轮对话都被持久化，被淘汰的轮次通过索引保留、按需召回——官方强调"Nothing is summarized away"，即没有任何上下文被悄悄 summarizing 掉而丢失。

### 3. 安全四层

从 `security/tool_guard/rules`、`security/skill_scanner/rules` 等打包资源可见，QwenPaw 内置了四道安全防线：

| 层 | 机制 | 作用 |
| -- | ---- | ---- |
| Sandbox | 内核级执行隔离 | shell 命令在受限文件系统视图中运行 |
| Tool Guard | YAML 规则引擎 + `ShellEvasionGuardian` | 拦截命令注入、路径穿越、反弹 shell、混淆攻击；级别 STRICT/SMART/AUTO/OFF |
| File Guard | 独立于 Tool Guard | 阻止 Agent 访问 `~/.qwenpaw.secret/`、`~/.ssh` 等敏感目录 |
| Skill Scanner | 激活前扫描 | 检测 prompt injection、硬编码密钥、数据外泄（block/warn/off） |

### 4. 本地推理与 QwenPaw-Flash

QwenPaw 可以完全在本地运行大模型，无需 API Key。`pyproject.toml` 中 `transformers>=4.30.0`、`onnxruntime<1.24`、`huggingface_hub`、`modelscope` 等依赖支撑了本地推理。它提供 **QwenPaw-Flash** 系列——专为 Agent 场景训练的 2B / 4B / 9B 模型，提供 Q4/Q8 量化，可在 ModelScope 与 Hugging Face 获取。内置的 **QwenPaw Local**（基于 llama.cpp）在 Web UI 中一键下载，并能根据硬件给出量化建议；同时也兼容 Ollama、LM Studio 等 14+ 云厂商。

### 5. 多智能体与 ACP

QwenPaw 支持派生子智能体（sub-agent），每个子 Agent 拥有独立的记忆与技能；跨系统编排则依靠 **Agent Communication Protocol（ACP）**。依赖中的 `agent-client-protocol>=0.9.0,<0.11.0` 正是协议中立的连接层（MCP / A2A / ACP）的实现基础。

## 三、安装与快速开始

### 环境要求

- Python >= 3.11 且 < 3.14
- 如需 Web UI，需构建前端资源（源码安装时）

### 方式一：pip 安装（推荐自管 Python 的用户）

```bash
pip install qwenpaw
qwenpaw init --defaults
qwenpaw app
```

随后在浏览器打开 **http://127.0.0.1:8088/** 进入控制台配置模型。

### 方式二：一键脚本（零 Python 配置）

```bash
# macOS / Linux
curl -fsSL https://qwenpaw.agentscope.io/install.sh | bash

# Windows (PowerShell)
irm https://qwenpaw.agentscope.io/install.ps1 | iex
```

脚本会自动下载 `uv`、创建虚拟环境并安装全部依赖（含 Node.js 与前端资源）。

### 方式三：Docker

```bash
docker pull agentscope/qwenpaw:latest
docker run -p 127.0.0.1:8088:8088 \
  -v qwenpaw-data:/app/working \
  -v qwenpaw-secrets:/app/working.secret \
  -v qwenpaw-backups:/app/working.backups \
  agentscope/qwenpaw:latest
```

配置、记忆、技能存于 `qwenpaw-data` 卷，API Key 存于 `qwenpaw-secrets` 卷。

### 方式四：从源码构建

```bash
git clone https://github.com/agentscope-ai/QwenPaw.git
cd QwenPaw
cd console && npm ci && npm run build && cd ..
mkdir -p src/qwenpaw/console
cp -R console/dist/. src/qwenpaw/console/
pip install -e .
```

## 四、使用方法与实战

### 1. 控制台与渠道接入

运行 `qwenpaw app` 后，在 **Settings → Models** 配置云厂商（DashScope/Qwen、OpenAI、Anthropic、Gemini、DeepSeek 等）或本地模型。想接入 IM 渠道，按文档在各渠道后台配置回调，同一 Agent 即可多渠道同时在线。

### 2. 终端 TUI

偏爱命令行的用户可以直接运行 `qwenpaw` 打开全屏 TUI，它与控制台、IM 渠道驱动的是**同一个** Agent——共享记忆、技能、MCP 与会话：

```bash
qwenpaw                     # 与当前 Agent 对话
qwenpaw tui --resume <id>   # 恢复上次会话
qwenpaw .                   # 在当前仓库以 Coding Mode 启动
```

TUI 基于 `textual>=8.2.8` 实现流式 Markdown 渲染，并修复了中文输入法在多码点 Kitty "associated text" 解析下的转义泄漏问题（Textualize/textual#6592）。

### 3. Coding Mode

内置三栏 Web IDE（文件树、diff 预览、聊天），并集成了 `python-lsp-server` 作为零配置 Python LSP 回退，以及 `ast-grep-cli` 做多语言 AST 模式匹配（`ast_search`）。这让它不只是"聊天"，而是能读、改写、审查、测试项目代码的协作环境。

### 4. Skills、插件与 MCP

通过 Skills 扩展能力（调度、文档、浏览器、新闻等），插件架构配 marketplace，MCP 则用于接入外部工具。可以把内置能力、插件与定时任务组合成贴合自身需求的 Workflow。

### 5. 定时与自动化

依赖中 `apscheduler>=3.11.2,<4` 提供调度能力。可设置周期性任务——新闻摘要、报告生成、多渠道广播——全部按你的时间表自动跑。

## 五、常见问题与解决方案

**Q1：本地运行需要 API Key 吗？**
不需要。只要使用 QwenPaw Local / Ollama / LM Studio 等本地后端，就无需任何 API Key。只有使用云端 LLM API（如 DashScope、OpenAI）才必须配置 Key。

**Q2：Docker 内访问宿主机上的 Ollama 失败？**
容器内 `localhost` 指向容器自身。解决方案：加 `--add-host=host.docker.internal:host-gateway`，并在 Settings → Models 把 Base URL 改为 `http://host.docker.internal:11434`（Ollama）或 `http://host.docker.internal:1234/v1`（LM Studio）；Linux 也可直接用 `--network=host`。

**Q3：Windows 企业版 LTSC 安装脚本无法写入 Path？**
受限安全策略下 PowerShell 可能进入 Constrained Language Mode。需手动把 `uv` 路径与 `%USERPROFILE%\.qwenpaw\bin` 加入系统 Path 环境变量（系统属性 → 高级 → 环境变量）。

**Q4：macOS 打开桌面版提示"无法验证开发者"？**
右键（Control+点击）App → 打开 → 再次点击"打开"即可；或在 系统设置 → 隐私与安全性 中点击"仍要打开"。

**Q5：如何把模型上下文调长？**
使用 Ollama 时建议设置上下文长度 ≥ 32k，以支撑长程记忆与复杂任务。

## 六、总结

QwenPaw 的价值不在于"又一个聊天机器人"，而在于它把**本地优先的隐私取向、Agent OS 级别的治理与沙箱、扎实的长程记忆、以及跨渠道的触达**整合到一个 Apache 2.0 开源项目里。对在意数据主权、又想要一套可编排、可扩展的个人 Agent 工作站的开发者来说，它值得一试——`pip install qwenpaw` 之后，你的"小爪子"就能在本地跑起来了。

> 项目地址：<https://github.com/agentscope-ai/QwenPaw> ｜ 文档：<https://qwenpaw.agentscope.io/>
