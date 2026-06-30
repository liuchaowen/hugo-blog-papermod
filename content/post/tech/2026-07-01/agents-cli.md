---
title: "Google agents-cli：让编程助手成为 Google Cloud Agent 专家"
date: 2026-07-01
description: "google/agents-cli 为编程助手提供构建、部署和评估 ADK agent 的技能和命令，支持 Antigravity CLI、Claude Code、Codex 等主流编程助手，实现企业级 Agent 的全生命周期管理。"
author: "Cheman"
slug: "agents-cli"
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "Google Cloud", "Agent"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**agents-cli**，这是一个让你的编程助手（如 Claude Code、Codex）成为 Google Cloud Agent 平台专家的工具。它提供了一套完整的 CLI 命令和技能包，让编程助手能够构建、评估、部署和发布企业级 Agent。

## 一、项目概述

**agents-cli** 是 Google 推出的用于构建 Gemini Enterprise Agent Platform 上 Agent 的 CLI 和技能工具包。它的核心理念是：**将你喜欢的编程助手转变为构建和部署 Google Cloud 上 Agent 的专家**。

### 核心功能

- **Agent 技能包**：为编程助手提供专业的 Agent 开发知识
- **CLI 工具**：提供完整的 Agent 生命周期管理命令
- **多编程助手支持**：无缝集成 Antigravity CLI、Claude Code、Codex 等
- **企业级部署**：支持部署到 Agent Runtime、Cloud Run、GKE 等 Google Cloud 服务

### 解决的问题

在传统的 Agent 开发流程中，开发者需要：
1. 学习 ADK（Agent Development Kit）的 API
2. 掌握 Google Cloud 的各种服务配置
3. 编写评估和部署脚本
4. 配置 CI/CD 流水线

**agents-cli** 通过为编程助手提供预训练的技能包，让编程助手自动处理这些复杂任务，开发者只需专注于业务逻辑。

## 二、技术原理

### 架构设计

agents-cli 构建在 Google Cloud Agent Stack 之上：

```
┌─────────────────────────────────────────────────────────┐
│          Programming Agent (Claude Code/Codex)          │
│                    ↑ 使用 skills                        │
├─────────────────────────────────────────────────────────┤
│                  agents-cli (CLI + Skills)              │
│  ├─ google-agents-cli-workflow   (开发流程)           │
│  ├─ google-agents-cli-adk-code   (ADK Python API)      │
│  ├─ google-agents-cli-scaffold   (项目脚手架)          │
│  ├─ google-agents-cli-eval       (评估方法论)          │
│  ├─ google-agents-cli-deploy     (部署)                │
│  ├─ google-agents-cli-publish    (发布)                │
│  └─ google-agents-cli-observability (可观测性)         │
├─────────────────────────────────────────────────────────┤
│              ADK (Agent Development Kit)                 │
├─────────────────────────────────────────────────────────┤
│        Google Cloud (Agent Runtime/Cloud Run/GKE)       │
└─────────────────────────────────────────────────────────┘
```

### 核心技术栈

- **Python 3.11+**：CLI 和技能包的实现语言
- **ADK (Agent Development Kit)**：Google 的 Agent 框架
- **uvx**：用于快速安装和运行 CLI
- **npx**：用于安装技能包到编程助手

### 技能包设计

技能包是 agents-cli 的核心创新，它采用 **skills** 规范，为编程助手提供结构化知识：

| 技能包 | 功能 |
|--------|------|
| `google-agents-cli-workflow` | 开发生命周期、代码保留规则、模型选择 |
| `google-agents-cli-adk-code` | ADK Python API — agents、tools、编排、callbacks、state |
| `google-agents-cli-scaffold` | 项目脚手架 — create、enhance、upgrade |
| `google-agents-cli-eval` | 评估方法论 — metrics、datasets、LLM-as-judge、adaptive rubrics |
| `google-agents-cli-deploy` | 部署 — Agent Runtime、Cloud Run、GKE、CI/CD、secrets |
| `google-agents-cli-publish` | Gemini Enterprise 注册 |
| `google-agents-cli-observability` | 可观测性 — Cloud Trace、logging、第三方集成 |

### 数据流分析

典型的 Agent 开发流程：

1. **脚手架生成**：`agents-cli scaffold <name>` → 生成项目结构
2. **开发辅助**：编程助手使用技能包中的知识编写 Agent 代码
3. **本地测试**：`agents-cli run "prompt"` → 运行 Agent
4. **评估**：`agents-cli eval generate` + `agents-cli eval grade` → 生成评估报表
5. **部署**：`agents-cli deploy` → 部署到 Google Cloud
6. **发布**：`agents-cli publish gemini-enterprise` → 注册到 Gemini Enterprise

## 三、安装与快速开始

### 环境要求

- Python 3.11+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- [Node.js](https://nodejs.org/en/download)

### 安装方式

**完整安装（推荐）**：

```bash
uvx google-agents-cli setup
```

此命令会：
1. 安装 `google-agents-cli` PyPI 包
2. 将技能包安装到检测到的编程助手
3. 配置认证信息

**仅安装技能包**（让编程助手自己处理其余部分）：

```bash
npx skills add google/agents-cli
```

### 快速开始

#### 1. 打开编程助手

启动你喜欢的编程助手：
- [Antigravity CLI](https://antigravity.google/)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Codex](https://github.com/openai/codex)

#### 2. 构建第一个 Agent

向编程助手描述你的需求，例如：

> "使用 agents-cli 构建一个 caveman 风格的 Agent，能够将冗长的文本压缩成简洁的技术性咕噜声"

编程助手会：
1. 使用 `agents-cli scaffold` 创建项目
2. 根据技能包中的 ADK 知识编写代码
3. 配置评估数据集
4. 准备部署配置

#### 3. 查看文档

完整教程：[Quickstart Tutorial](https://google.github.io/agents-cli/guide/quickstart-tutorial/)

## 四、使用方法与实战

### 基础用法

#### 创建新项目

```bash
# 使用 CLI 直接创建
agents-cli scaffold my-agent

# 或让编程助手创建
# （向编程助手说："使用 agents-cli 创建一个名为 my-agent 的 Agent 项目"）
```

#### 运行 Agent

```bash
# 单次提示运行
agents-cli run "帮我总结这篇文章的要点"

# 交互式运行（由编程助手启动）
```

#### 代码质量检查

```bash
agents-cli lint
```

### 进阶用法

#### 评估 Agent

```bash
# 1. 生成评估轨迹
agents-cli eval generate --dataset eval_cases.json

# 2. 评分
agents-cli eval grade --traces traces.json

# 3. 比较两次评估结果
agents-cli eval compare --baseline v1.json --candidate v2.json

# 4. 分析失败模式
agents-cli eval analyze --grades grades.json
```

#### 部署到 Google Cloud

```bash
# 部署到 Agent Runtime（推荐）
agents-cli deploy

# 部署到 Cloud Run
agents-cli deploy --target cloud-run

# 部署到 GKE
agents-cli deploy --target gke
```

#### 配置 CI/CD

```bash
# 配置单机项目基础设施
agents-cli infra single-project

# 配置 CI/CD 流水线 + staging/prod 基础设施
agents-cli infra cicd
```

### 实际项目示例

**示例 1：构建 RAG Agent**

```bash
# 1. 创建项目
agents-cli scaffold rag-agent

# 2. 配置数据存储
agents-cli infra datastore

# 3. 运行数据注入
agents-cli data-ingestion --source docs/

# 4. 部署
agents-cli deploy
```

**示例 2：优化 Agent 提示词**

```bash
# 使用评估数据自动优化提示词
agents-cli eval optimize --dataset eval_cases.json --metric accuracy
```

## 五、常见问题与解决方案

### 安装失败

**问题**：`uvx google-agents-cli setup` 失败

**解决方案**：
1. 检查 Python 版本（需要 3.11+）
2. 确认 `uv` 已正确安装：`uv --version`
3. 尝试使用 `pip install google-agents-cli` 手动安装

### 认证问题

**问题**：`agents-cli login` 失败

**解决方案**：
1. 本地开发可使用 [AI Studio API key](https://aistudio.google.com/apikey)
2. 部署需要 Google Cloud 认证：`gcloud auth login`
3. 检查认证状态：`agents-cli login --status`

### 编程助手未检测到技能包

**问题**：编程助手无法识别 agents-cli 技能

**解决方案**：
1. 手动更新技能包：`agents-cli update`
2. 检查编程助手的技能目录配置
3. 重启编程助手

### 评估失败

**问题**：`agents-cli eval generate` 报错

**解决方案**：
1. 检查数据集格式（需要 JSON 格式）
2. 确认 ADK 代码无误：`agents-cli lint`
3. 查看详细日志：`agents-cli eval generate --verbose`

### 部署权限问题

**问题**：`agents-cli deploy` 报权限错误

**解决方案**：
1. 确认 Google Cloud 项目已创建
2. 配置应用默认凭证：`gcloud auth application-default login`
3. 检查 IAM 权限

## 六、总结

**agents-cli** 是一个创新性的工具，它巧妙地利用了编程助手的能力，将其转化为 Google Cloud Agent 平台的专家。通过提供结构化的技能包和完整的 CLI 命令，它大大降低了企业级 Agent 的开发门槛。

**核心优势**：
1. **降低学习成本**：无需深入学习 ADK 和 Google Cloud 服务
2. **提高开发效率**：编程助手自动处理重复性任务
3. **企业级支持**：内置评估、部署、可观测性支持
4. **开放生态**：支持多种编程助手

**适用场景**：
- 企业正在使用 Google Cloud，需要快速构建 Agent
- 希望利用编程助手提高开发效率
- 需要完整的 Agent 生命周期管理（开发、评估、部署、监控）

**项目资源**：
- GitHub：https://github.com/google/agents-cli
- 文档：https://google.github.io/agents-cli/
- PyPI：https://pypi.org/project/google-agents-cli/
- 问题反馈：https://github.com/google/agents-cli/issues

如果你正在构建企业级 Agent，或者希望将现有 Agent 部署到 Google Cloud，agents-cli 绝对值得一试！
