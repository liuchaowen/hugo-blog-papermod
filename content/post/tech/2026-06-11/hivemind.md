---
title: "Hivemind：让所有 AI 编程代理共享一个大脑"
date: 2026-06-11
description: "Activeloop 开源的 Hivemind 为 Claude Code、OpenClaw、Codex、Cursor 等 AI 编程代理提供云端共享记忆，自动捕获会话轨迹、提炼可复用技能并在团队间实时传播，在 LoCoMo 基准上实现 25% 成本降低与 1.7 倍 token 节省。"
author: "Cheman"
slug: hivemind
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI Agent", "共享记忆", "Deeplake", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Hivemind**，它为团队中所有 AI 编程代理（Claude Code、OpenClaw、Codex、Cursor、Hermes、pi）提供云端共享记忆和技能传播能力——周一某个代理踩过的坑，周二全团队的代理都能自动避免。

## 一、项目概述

Hivemind 是由 Activeloop（Deeplake 开源团队，Y Combinator 孵化）开发的云端共享记忆系统，口号是 "One brain for all your agents"。它解决的核心问题是：**AI 编程代理之间是割裂的**——每个代理的会话独立，一个代理学到的经验无法传递给另一个，更无法跨团队成员共享。

核心能力包括：

- **会话捕获**：自动记录每次交互的 prompt、tool call、response 为结构化 trace
- **模式提炼（Skillify）**：后台 worker 从 trace 中挖掘重复模式，自动生成 `SKILL.md` 技能文件
- **混合检索**：支持 BM25 词法检索 + 语义向量检索，无 embedding 时自动降级为纯词法
- **实时传播**：提炼的技能在团队所有代理间实时同步，跨会话、跨代理、跨机器
- **虚拟文件系统**：拦截 `~/.deeplake/memory/` 路径的文件操作，底层由 SQL 驱动
- **自动摘要**：会话结束后后台 worker 生成 AI wiki 摘要，长会话每 50 条消息或 2 小时 checkpoint
- **代码库图谱**：从 trace 中构建实时代码依赖图（文件、符号、导入），搜索时沿实际遍历路径而非纯文本匹配

## 二、技术原理

### 架构设计

Hivemind 的核心循环是 **Capture → Codify → Propagate → Compound**：

1. **Capture**：每个代理的交互通过各自的集成机制（Marketplace Plugin / Hooks / Shell Hooks / Extension API）被捕获为结构化 trace，存储到 Deeplake 的 `sessions` 表
2. **Codify**：后台 Skillify Worker 在 Stop/SessionEnd 时触发，挖掘近期 trace，用 LLM 判断是否包含值得保留的模式，写入 `SKILL.md`
3. **Propagate**：提炼的技能在 SessionStart 时注入到所有代理的上下文中
4. **Compound**：团队积累越多，每个代理的起点越高

### 核心技术栈与选型

- **运行时**：Node.js >= 22，TypeScript，esbuild 打包
- **存储层**：Deeplake（基于 Deep Lake 的 tensor 格式存储），支持 SQL 查询
- **向量检索**：nomic-embed-text-v1.5 本地 embedding daemon（可选，约 600MB），768 维向量
- **构建系统**：tsc + esbuild，多入口打包（每个代理独立 bundle）
- **代理集成**：
  - Claude Code → Marketplace Plugin
  - OpenClaw → Native Extension（与 memory-core 共存，不抢占 memory slot）
  - Codex / Cursor → `hooks.json` 生命周期钩子
  - Hermes → Shell Hooks + MCP Server + Skill
  - pi → Extension API + AGENTS.md 注入

### 关键设计模式

**虚拟文件系统（VFS）**：Hivemind 拦截 `~/.deeplake/memory/` 路径的文件操作，底层映射到 SQL 表，支持 Goals、KPIs、Summaries 等结构化数据的存取，同时对上层暴露文件系统语义。

**跨代理编译时隔离**：OpenClaw bundle 通过 esbuild `define` 将 `process.env.HIVEMIND_*` 重写为 `globalThis.__hivemind_tuning__.*`，既满足 ClawHub 的 env-harvesting 扫描规则，又保留用户通过 `openclaw.json` 运行时调节的能力。Worker 入口在读取消调值前先从 config JSON 填充 tuning 对象。

**代码库图谱**：从 trace 中提取文件、符号、导入关系和实际遍历边，构建有向图。搜索时沿图遍历而非全文匹配，"where do we handle auth?" 能定位到团队代理实际操作过的文件。

### 数据流分析

```
Agent Session → Hook/Plugin Capture → sessions Table (Deeplake)
                                              ↓
                                    Skillify Worker (on Stop/SessionEnd)
                                              ↓
                                    SKILL.md → Propagate to all agents
                                              ↓
                                    SessionStart Injection → Agent Context
```

语义检索路径：

```
User Query → BM25 Lexical + nomic-embed Semantic → Hybrid Rank → Top-K Results
```

## 三、安装与快速开始

### 环境要求

- Node.js >= 22.0.0
- 支持的代理：Claude Code、OpenClaw、Codex、Cursor 1.7+、Hermes Agent、pi

### 安装步骤

一条命令安装，自动检测本机所有支持的代理：

```bash
npm install -g @deeplake/hivemind && hivemind install
```

安装器会自动检测本机代理、配置钩子、弹出浏览器登录。安装后重启代理即可生效。

**CI/Headless 环境**使用 API Token：

```bash
HIVEMIND_TOKEN=<your-token> hivemind install
```

**仅安装特定代理**：

```bash
hivemind install --only claude    # 或 cursor / codex / claw / hermes / pi
```

**检查安装状态**：

```bash
hivemind status
```

### 最简运行示例

安装后无需额外配置，代理会话中的交互自动被捕获。在代理中自然语言搜索：

```
"What was the team working on yesterday?"
"Search traces for authentication bugs we've solved"
```

## 四、使用方法与实战

### 基础用法：自然语言搜索

在任意已集成的代理中直接用自然语言查询团队历史：

```
"What did we decide about the API design?"
"Show me skills my team has codified for handling migrations"
```

### 进阶用法：Skillify 技能提炼

```bash
# 查看当前提炼范围与状态
hivemind skillify

# 设置提炼范围：仅自己 or 整个团队
hivemind skillify scope me
hivemind skillify scope team

# 拉取队友的技能到本地
hivemind skillify pull

# 移除已拉取的技能
hivemind skillify unpull
```

提炼频率可通过 `HIVEMIND_SKILLIFY_EVERY_N_TURNS` 环境变量调节（默认 20 轮对话触发一次）。

### 团队规则管理

跨代理共享团队规则，在 SessionStart 时注入：

```bash
hivemind rules add "no DROP TABLE on prod credentials"
hivemind rules list
hivemind rules edit <rule-id> "updated rule text"
hivemind rules done <rule-id>    # 标记关闭
```

### Goals + KPIs 跟踪

```bash
hivemind goal add "ship the search bar"
hivemind goal list --mine
hivemind goal progress <goal_id> in_progress
hivemind goal done <goal_id>
```

### 隐私控制

临时禁用捕获：

```bash
HIVEMIND_CAPTURE=false claude
```

开启调试日志：

```bash
HIVEMIND_DEBUG=1 claude
```

## 五、常见问题与解决方案

### 安装失败：Node.js 版本不足

Hivemind 要求 Node.js >= 22.0.0。使用 `node -v` 检查版本，通过 nvm 或 fnm 升级：

```bash
nvm install 22 && nvm use 22
```

### OpenClaw 下 Hivemind 响应慢

Hivemind 每轮会产生多次小 tool call，使用大推理模型（如 Opus）会明显卡顿。推荐设置默认模型为 Haiku：

```bash
# 直接编辑 ~/.openclaw/openclaw.json
# 将 agents.defaults.model 设为 "anthropic/claude-haiku-4-5-20251001"
```

### 语义搜索不工作

语义搜索依赖 nomic-embed-text-v1.5 本地 embedding daemon（约 600MB），默认未启用。无 embedding 时搜索自动降级为 BM25 词法检索。启用：

```bash
hivemind embeddings install
# 或安装时一并启用
hivemind install --with-embeddings
```

### Codex 首次启动钩子未生效

Codex 会显示 "Hooks need review" 提示，必须选择 **"Trust all and continue"**（选项 2），否则钩子不会运行。

### BYOC 自有云存储配置

Hivemind 默认使用 Deeplake Cloud，但支持 GCS、Azure Blob、S3 等自有存储：

```bash
# 参考官方文档配置
# GCS: https://docs.deeplake.ai/latest/guide/gcs/
# Azure: https://docs.deeplake.ai/latest/guide/azure/
# S3: 需联系团队开通
```

## 六、总结

Hivemind 解决了一个真实且日益迫切的问题：AI 编程代理的团队级知识共享。通过自动捕获会话轨迹、提炼可复用技能、实时传播到所有代理，它让团队的 AI 辅助能力随使用时间持续复合增长，而非每次会话从零开始。在 LoCoMo 基准测试中，共享记忆使成本降低 25%、token 消耗减少 1.7 倍、对话轮次减少 31%，数据证明了"集体记忆"的实际价值。对使用多个 AI 编程代理的团队来说，这是一个值得尝试的基础设施级工具。

**项目地址**：[https://github.com/activeloopai/hivemind](https://github.com/activeloopai/hivemind)
