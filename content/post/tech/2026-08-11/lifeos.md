---
title: "LifeOS：一个把 AI 变成你专属生活操作系统的新项目"
date: "2026-08-11"
description: "LifeOS 是由 Daniel Miessler 推出的 AI 驱动个人操作系统，通过持久记忆、自定义技能、智能路由和自我进化机制，让 AI 真正了解你、记住你、帮助你从现状走向理想状态。支持 TypeScript + Bun，构建在通用原语之上，跨 Claude Code、Cursor 等主流 AI 编码助手运行。"
author: "Cheman"
slug: lifeos
draft: false
categories: ["AI", "开源", "效率工具"]
tags: ["AI", "LifeOS", "Claude Code", "个人生产力", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**LifeOS**，它给自己的定位是"The AI-Powered Life Operating System"——用 AI 把你的生活和工作串成一个真正懂你的操作系统。

## 一、项目概述

LifeOS 来自安全圈知名博主 Daniel Miessler（他也是开源项目 [Fabric](https://github.com/danielmiessler/fabric) 的作者），核心理念非常清晰：

> 移动你从 **Current State（现状）** 到 **Ideal State（理想状态）**，最终追求 **Euphoric Surprise（惊喜结果）**。

与其说 LifeOS 是一个工具，不如说它是一套**让 AI 真正拥有你上下文的架构**。它解决的是这个痛点：每次跟 AI 对话都要重新解释"我是谁、我要做什么"，AI 根本无法积累对你的理解。LifeOS 通过以下组件改变了这一点：

- **Cortex（记忆系统）**：热层记忆 + 知识图谱（人物/公司/想法/研究），跨 session 持久化，每次对话都比上一次更懂你
- **DA（数字分身）**：持久化的身份层，包含 PRINCIPAL_IDENTITY + DA_IDENTITY，让 AI 有角色感
- **The Algorithm**：七阶段问题解决循环（OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN），带有 E1–E5 复杂度分层，AI 会根据任务难度自动选择合适的推理深度
- **ISA System**：Ideal State Artifact，一种结构化文档格式，12 个章节、5 种身份视角，让目标描述精确可追踪
- **Pulse**：统一守护进程（端口 31337），集成语音、Hook、任务调度、生命仪表盘、Wiki API，可选接入 Telegram/iMessage
- **Skills**：49 个内置技能（研究、安全、写作、绘画等），安装时一次性打包，AI 原生调用

## 二、技术原理

### 架构设计

LifeOS 构建在**通用原语**之上，而非绑定某一特定 AI 平台。它的核心抽象包括：

```typescript
// 核心原语：Hook 系统 — 生命周期事件拦截
// 事件类型: session_start, before_response, after_tool, session_end

// 核心原语：Skills — 自包含能力包
// 目录结构: SKILL.md + Workflows + Tools

// 核心原语：Context Files — 结构化记忆存储
// 类型: WORK, KNOWLEDGE, LEARNING, RELATIONSHIP, OBSERVABILITY, STATE
```

项目本身是 **TypeScript + Bash**，运行依赖 **Bun**（安装页面：https://ourlifeos.ai/install.sh）。代码通过 Hook、Skills、Context 文件和 Agent 路由四个通用原语实现跨平台能力。

### 安装机制

LifeOS 的安装方式非常 AI 原生：

```bash
# 方法一：丢给 AI 完成（推荐）
# 把这句话发给 Claude Code / Cursor / Codex：
Read https://ourlifeos.ai/install and install LifeOS for me.

# 方法二：终端一行命令
curl -fsSL https://ourlifeos.ai/install.sh | bash
```

安装器是 AI 读的（读取 ourlifeos.ai/install 页面），不是硬编码的安装脚本——这意味着安装流程本身也在随着文档进化。

### The Algorithm 核心逻辑

v8.4.0 版本的 Algorithm 是这样的循环：

```
Input → OBSERVE（收集现状）→ THINK（分析）→ PLAN（计划）
→ BUILD（执行）→ VERIFY（验证）→ LEARN（学习）
→ Output + ISA 记录
```

复杂度分层（E1–E5）决定 AI 在每一步投入多少计算资源——简单任务走 E1，复杂架构决策走 E5，**自动适应**，无需手动指定。

## 三、安装与快速开始

### 环境要求

- 一个支持 AI 编码的终端环境：**Claude Code**（最推荐）、Cursor、Codex 等
- [Bun](https://bun.sh) 已安装
- 网络连接（用于拉取安装包）

### 安装步骤

```bash
# 1. 安装 Bun（如未安装）
curl -fsSL https://bun.sh/install | bash

# 2. 把安装任务丢给 AI
# 复制这句话 → 粘贴到 Claude Code：
Read https://ourlifeos.ai/install and install LifeOS for me.

# 或者直接终端运行
curl -fsSL https://ourlifeos.ai/install.sh | bash
```

安装完成后，运行 `bun LIFEOS/TOOLS/Doctor.ts` 可以诊断系统状态，查看各可选能力（语音、Pulse、Hook 等）的实时状态和修复命令。

### 最简运行示例

```bash
# 启动 LifeOS
bun LIFEOS/main.ts

# 或者通过 Claude Code 启动并带上 LifeOS 上下文
claude --append-system-prompt-file ~/.claude/LifeOS/system/doctrine.md
```

## 四、使用方法与实战

### 基础用法

安装完成后，AI 会自动加载你的 LifeOS 上下文：

```
你：帮我研究一下 RAG 技术在客服场景的应用
AI：✅ 加载 LifeOS → 开始 OBSERVE 阶段...
    [自动查询网络，整理 RAG 现状，形成知识图谱写入 Cortex]
```

### 进阶用法：TELOS 框架

LifeOS 内置了一个个人目标追踪框架 **TELOS**，用于结构化描述你的生活各维度：

```
T - Temperament（气质/性格）
E - Education（教育背景）
L - Life（生活方式）
O - Occupation（职业）
S - Social（社交关系）
```

通过 `/interview` 命令可以引导 AI 完成 TELOS 初始化，之后所有对话都会自动引用这些上下文。

### 实际项目示例

假设你是一位独立开发者：

```bash
你：我想在三个月内推出一个 AI 写作工具 MVP

LifeOS：
→ OBSERVE：当前技能栈（TypeScript/Bun）、时间资源、现有代码资产
→ THINK：MVP 核心功能优先级排序
→ PLAN：生成 ISA（Ideal State Artifact）
    - 当前状态：想法阶段，无代码
    - 理想状态：可用的 AI 写作工具，100 用户
    - 路径：产品设计 → 技术选型 → 核心功能 → 发布
→ BUILD：自动生成代码框架、集成 LifeOS Skills（研究/写作/安全）
→ VERIFY：检查与 ISA 的偏差
→ LEARN：记录本次决策，供下次参考
```

## 五、常见问题与解决方案

**Q: 安装后 AI 不加载 LifeOS 上下文？**
检查 `~/.claude` 目录下是否存在 `LifeOS/` 目录，以及 `~/.claude/settings.json` 中是否正确引用了 `--append-system-prompt-file`。运行 `bun LIFEOS/TOOLS/Doctor.ts` 可一键诊断。

**Q: Pulse（守护进程）启动失败？**
确认端口 31337 未被占用：`lsof -i :31337`。同时检查 Bun 版本是否 ≥ 1.0：`bun --version`。

**Q: 升级后出了问题怎么回退？**
升级前务必备份：`cp -r ~/.claude ~/.claude-backup-$(date +%Y%m%d)`。LifeOS 的 `USER/` 目录是安装器禁区，你的自定义内容不会被覆盖。也可随时从备份恢复。

**Q: 支持本地模型（Ollama）吗？**
这是 Roadmap 中的功能，暂未上线。当前推荐使用 Claude Code 配合 Claude 模型。

**Q: 与 Fabric 有什么区别？**
[Fabric](https://github.com/danielmiessler/fabric) 是 AI 提示词集合，专注"**问什么**"；LifeOS 是 AI 操作系统的基础设施，专注"**怎么运作**"。两者互补，Fabric 的模式可以集成进 LifeOS 的 Skills 中。

## 六、总结

LifeOS 是一个真正有野心的项目——它不只是在 AI 之上加了一层，而是重新思考了"AI 应该怎么认识你"这个根本问题。通过持久记忆、目标追踪、自我进化和通用原语设计，它让 AI 从一个"用完即忘的工具"变成了一个"越来越懂你的搭档"。

如果你经常用 Claude Code 或类似的 AI 编程助手，LifeOS 值得一试——尤其是当你发现自己经常在重复解释背景信息时，它可能就是你要的那个解决方案。

> 🔗 项目地址：https://github.com/danielmiessler/LifeOS  
> 🌐 官网：https://ourlifeos.ai  
> 📖 文档：https://docs.ourlifeos.ai
