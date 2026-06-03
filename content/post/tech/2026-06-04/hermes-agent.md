---
title: "Hermes Agent：具备自我进化能力的开源 AI Agent 框架"
date: 2026-06-04
description: "深入解析 Nous Research 开发的 Hermes Agent，这是首个内置学习循环的 AI Agent 框架，支持技能自动创建、跨会话记忆、多平台部署，可运行在 5 美元 VPS 到 GPU 集群的任意环境。"
author: "Cheman"
slug: "hermes-agent"
draft: false
categories: ["AI Agent", "开源项目"]
tags: ["AI Agent", "开源", "Nous Research", "自我进化", "多平台"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Hermes Agent**，这是 Nous Research 开发的具备自我进化能力的 AI Agent 框架，它不仅是另一个聊天机器人，而是真正能够从经验中学习、改进自身技能的智能代理系统。

## 一、项目概述

Hermes Agent 是一个由 Nous Research 构建的自我进化 AI Agent 框架。与传统的静态 Agent 不同，Hermes Agent 具备真正的学习循环——它可以从经验中创建技能、在使用过程中改进技能、主动持久化知识、搜索历史对话，并在跨会话中建立对你的深度理解模型。

**核心特性：**

- **真正的学习循环**：Agent 自主策划记忆，定期触发学习 nudges，在复杂任务后自动创建技能
- **多平台部署**：支持 Telegram、Discord、Slack、WhatsApp、Signal 和 CLI，所有接口共享单一网关进程
- **灵活的模型选择**：支持 200+ 模型（Nous Portal、OpenRouter、OpenAI、NVIDIA NIM 等），通过 `hermes model` 一键切换
- **低成本运行**：可运行在 5 美元 VPS、GPU 集群或 Serverless 基础设施上，空闲时成本几乎为零
- **研究就绪**：支持批量轨迹生成和轨迹压缩，用于训练下一代工具调用模型

## 二、技术原理

### 2.1 架构设计

Hermes Agent 采用模块化架构，核心组件包括：

- **Agent Loop**：主事件循环，处理用户输入、工具调用、模型推理
- **Tool System**：40+ 内置工具，支持工具集（Toolset）系统，可按场景动态加载
- **Memory System**：基于 FTS5 的会话搜索 + LLM 摘要，实现跨会话记忆召回
- **Skills System**：兼容 agentskills.io 开放标准，支持技能自主创建和自改进
- **Terminal Backends**：六种终端后端（local、Docker、SSH、Singularity、Modal、Daytona）

### 2.2 核心技术栈

```python
# 核心依赖（来自 pyproject.toml）
dependencies = [
    "openai>=1.0.0",          # LLM API 兼容层
    "httpx",                    # 异步 HTTP 客户端
    "pydantic>=2.0.0",         # 数据验证与序列化
    "jeepney",                  # Linux D-Bus 集成（通知）
    "sounddevice", "soundfile", # 语音备忘录转录
    "playwright",               # 浏览器自动化
    "uv",                       # 高速 Python 包管理器
]
```

### 2.3 自我进化机制

Hermes Agent 的"自我进化"并非营销术语，而是基于以下技术实现：

1. **Skill Self-Improvement**：技能在使用过程中自动改进，通过 `self-improving` 技能分析失败原因并更新自身逻辑
2. **Autonomous Skill Creation**：复杂任务完成后，Agent 自主创建新技能以沉淀经验
3. **Periodic Nudges**：定期触发学习 nudges，提示 Agent 将重要信息持久化到记忆
4. **Cross-Session Search**：基于 FTS5 的会话搜索，配合 LLM 摘要，实现跨会话知识召回

### 2.4 数据流分析

```
用户输入
  ↓
Session Manager (会话管理)
  ↓
Agent Loop (主循环)
  ├─→ Memory Retrieval (记忆检索)
  ├─→ Model Inference (模型推理)
  ├─→ Tool Execution (工具执行)
  │   ├─→ Tool Result Caching (结果缓存)
  │   └─→ Skill Self-Improvement (技能自改进)
  └─→ Response Generation (响应生成)
  ↓
输出到平台（CLI / Telegram / Discord / ...）
  ↓
Memory Storage (记忆存储)
  ├─→ FTS5 Index (全文搜索索引)
  └─→ LLM Summarization (LLM 摘要)
```

## 三、安装与快速开始

### 3.1 环境要求

- **Linux / macOS / WSL2 / Termux**：支持 Bash 的环境
- **Windows**：原生 PowerShell 支持，或 WSL2
- **Python**：3.11+（安装脚本自动处理）
- **Node.js**：22 LTS（Docker 镜像自动打包）

### 3.2 安装步骤

**Linux / macOS / WSL2 / Termux：**

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

**Windows（原生，PowerShell）：**

```powershell
iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)
```

安装脚本会自动处理所有依赖：uv、Python 3.11、Node.js、ripgrep、ffmpeg，以及可移植的 Git Bash（MinGit）。

### 3.3 最简运行示例

```bash
source ~/.bashrc    # 重载 shell（或 source ~/.zshrc）
hermes              # 启动对话！
```

首次启动后，使用 `/model` 命令选择模型提供商和模型：

```bash
hermes model        # 选择 LLM 提供商和模型
hermes tools        # 配置启用的工具
hermes gateway      # 启动消息网关（Telegram、Discord 等）
```

## 四、使用方法与实战

### 4.1 基础用法

**CLI 交互：**

```bash
hermes              # 启动交互式 CLI
/new                # 开始新对话
/model openrouter:anthropic/claude-3.5-sonnet  # 切换模型
/skills             # 浏览技能
```

**消息平台（以 Telegram 为例）：**

```bash
hermes gateway setup    # 配置网关
hermes gateway start    # 启动网关
# 然后在 Telegram 中向 Bot 发送消息
```

### 4.2 进阶用法

**技能系统：**

```bash
/skills                  # 浏览已安装技能
/skills install <name>   # 安装新技能
/skills create           # 创建新技能
```

**Cron 调度：**

```bash
hermes cron add "0 9 * * *" "每日早上 9 点发送日报" --platform telegram
```

**子 Agent 并行化：**

```bash
# 在对话中
spawn 分析这个数据集并生成报告
# Agent 会创建子 Agent 并行处理
```

### 4.3 实际项目示例

**示例 1：自动化日报生成**

```
用户：每天早上 9 点自动生成昨天的工作总结并发送到 Telegram
Hermes：已创建定时任务，将使用你的工作记录生成总结...
```

**示例 2：代码库分析**

```
用户：分析这个 GitHub 仓库的技术栈和架构
Hermes：[调用 github-to-myblog 技能，生成深度技术博客]
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：安装脚本报错 `command not found: curl`

**原因**：系统缺少基础工具

**解决方案**：

```bash
# macOS
brew install curl

# Ubuntu / Debian
sudo apt-get install curl

# 然后重新运行安装脚本
```

### 5.2 运行时错误

**问题**：`hermes: command not found`

**原因**：Shell 未重载，或安装路径未加入 PATH

**解决方案**：

```bash
source ~/.bashrc    # 或 source ~/.zshrc
which hermes        # 验证路径
```

**问题**：模型调用报错 `Insufficient balance`

**原因**：API Key 余额不足，或模型选择错误

**解决方案**：

```bash
hermes model        # 重新选择模型
hermes portal status  # 检查 Nous Portal 订阅状态
```

### 5.3 性能问题

**问题**：响应速度慢

**原因**：模型推理时间长，或网络延迟高

**解决方案**：

- 切换至更快的模型（如 `openrouter:anthropic/claude-3.5-haiku`）
- 使用 Nous Portal（内置高速推理）
- 检查网络连接（特别是使用 OpenRouter 时）

### 5.4 兼容性问题

**问题**：Windows 原生安装后，某些工具无法使用

**原因**：部分工具依赖 POSIX 环境

**解决方案**：

- 使用 WSL2 运行 Hermes（完全兼容）
- 或等待原生 Windows 支持更新（项目活跃开发中）

## 六、总结

Hermes Agent 是一个技术深度与实用性兼备的开源 AI Agent 框架。其"自我进化"能力并非噱头，而是基于扎实的工程实现——从技能自改进到跨会话记忆，每一个特性都经过精心设计。

**适用场景：**

- 需要长期记忆和个性化的 AI 助手
- 希望在多个平台统一使用 Agent 的用户
- 对数据隐私有要求，需要自部署方案的团队
- AI Agent 研究者，需要可扩展的实验平台

**不适用场景：**

- 仅需要简单问答的用户（轻量级方案更合适）
- 无法自部署、依赖云服务的用户（虽然支持，但需要配置）

Hermes Agent 的出现标志着 AI Agent 从"工具"向"伙伴"的进化——它不仅能完成任务，还能从任务中学习，持续进化。对于技术爱好者和研究者来说，这是一个值得深入探索的项目。

**项目链接：**

- GitHub：https://github.com/NousResearch/hermes-agent
- 文档：https://hermes-agent.nousresearch.com/docs/
- Discord：https://discord.gg/NousResearch

---

*本文基于 Hermes Agent 官方 README 和源码分析撰写，技术细节仅供参考，请以官方文档为准。*
