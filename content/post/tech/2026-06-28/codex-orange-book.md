---
title: "Codex 橙皮书：从入门到实战的全链路 AI 编程指南"
date: 2026-06-28
description: "一份非官方的开源 Codex 使用手册，系统讲解 OpenAI Codex 的四大入口、安装配置、核心功能与实战案例，帮助开发者从零上手 AI 编程 Agent。"
author: "Cheman"
slug: codex-orange-book
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "Codex", "AI编程", "OpenAI", "开发工具"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**Codex 橙皮书**，一份从安装到实战案例的全链路 Codex 使用指南，以开源 PDF 和 Markdown 形式呈现，系统梳理了 OpenAI Codex 从基础认知到高级工程应用的完整知识体系。

## 一、项目概述

Codex 橙皮书由社区开发者 **bozhouDev** 维护，定位为非官方的开源学习资料，旨在帮助开发者从零上手 OpenAI Codex。项目以 Markdown 原稿和 PDF 格式双渠道发布，支持在线阅读和下载，内容持续更新。

项目核心价值在于它系统性地回答了三个问题：
- **Codex 是什么**——不只是一款"AI 写代码工具"，而是一个面向真实软件工程任务的 coding agent
- **怎么用 Codex**——覆盖 App、CLI、IDE Extension、Web 四大入口的安装与配置
- **怎么用好 Codex**——从自动化到插件、Skill、MCP，再到完整的工作流与实战案例

截至 2026 年 6 月 28 日，项目在 GitHub 上已获得 **2224 颗星**，反映了开发者社区对系统性 Codex 实践指南的旺盛需求。

## 二、技术原理

### 2.1 Codex 的定位进化

项目开篇用四阶段归纳了 AI 编程工具的演变，帮助读者从历史视角理解 Codex 的独特价值：

| 时代 | 代表工具 | 核心能力 |
|------|----------|----------|
| 2021：代码补全时代 | Copilot | 根据上文补代码，像更聪明的输入法 |
| 2022：对话时代 | ChatGPT | 问答形式辅助编程，需要手动搬运上下文 |
| 2023-2024：项目协作时代 | Cursor | 进入编辑器，看到文件，跨文件修改 |
| 2025：工程 Agent 时代 | Codex | 读项目、修 bug、加功能、跑命令、看 diff、整理 PR |

Codex 的定位是"可以被交代任务的工程执行者"，而非单纯的代码生成器。它能够**读取项目文件 → 理解上下文 → 制定计划 → 修改代码 → 运行命令 → 检查结果 → 输出可 review 的改动**，形成完整的工程执行闭环。

### 2.2 四大入口架构

Codex 提供四种使用入口，分别面向不同场景：

1. **Codex App（桌面版）**：提供完整的图形界面，支持多线程（thread）、项目化管理、review pane 和 diff 审查，包含权限控制（sandbox）和模型选择。适合新手和日常开发。
2. **Codex CLI**：命令行版本，提供终端命令和斜杠命令两套操作体系，支持 `--sandbox` 权限分级（read-only / workspace-write / danger-full-access）、`exec` 非交互模式、`sandbox` 沙盒机制和 `resume` 会话恢复。
3. **Codex IDE Extension**：嵌入 VS Code / Cursor / Windsurf 等编辑器，在侧边栏直接使用，支持代码选择、上下文件感知和云端任务委托。
4. **Codex Web / Cloud**：网页端，连接 GitHub 仓库在云端执行任务，生成 PR 供 review，适合团队协作和后台任务。

### 2.3 权限与安全保障

Codex 引入了 **Sandbox（沙盒）** 概念作为核心安全机制：

- **read-only**：只能读文件，不能修改
- **workspace-write**：可在指定项目目录内读写
- **danger-full-access**：放开所有限制

配合三级审批策略（请求批准 / 替我审批 / 完全访问权限），Codex 在灵活性与安全性之间取得了平衡——这是 Agent 化编程工具的一个关键设计模式。

### 2.4 与竞品的定位差异

项目详细对比了 Codex 与 ChatGPT、Cursor、Claude Code 的差异：

- **ChatGPT vs Codex**：前者是"顾问"，后者是"实习生"——ChatGPT 回答问题，Codex 执行任务
- **Cursor vs Codex**：前者是"AI 编辑器"，后者是"工程 Agent"——Cursor 陪你写，Codex 帮你跑完整任务
- **Claude Code vs Codex**：前者是"终端里的长期工程搭档"，后者是"OpenAI 生态里的多端工程 Agent"——Claude Code 偏终端深度协作，Codex 偏多端联动任务执行

## 三、安装与快速开始

### 3.1 Codex App（新手推荐）

**macOS 安装：**
```bash
# 确认芯片类型（Apple Silicon / Intel）
# 从 Codex 官方页面下载对应版本
# 拖入 Applications 文件夹即可
```

**Windows 安装：**
- 从 Codex 官方页面进入 Microsoft Store
- 点击「获取」安装
- 登录 ChatGPT 账号

**第一次使用流程：**
1. 登录 ChatGPT
2. 选择一个练习项目目录
3. 新建一个 thread（对话）
4. 输入任务让 Codex 执行
5. 使用 review pane 查看 diff，检查改动

### 3.2 Codex CLI

```bash
# 使用 npm 安装
npm install -g @openai/codex

# 或使用 Homebrew（macOS）
brew install --cask codex

# 启动
cd your-project
codex

# 一次性执行任务
codex exec "请检查当前项目结构"
```

### 3.3 推荐新手工作流

1. `cd 项目目录` → 进入项目文件夹
2. `git status` → 查看当前项目状态
3. `codex` → 启动 Codex CLI
4. `/plan` → 复杂任务先让 Codex 出方案
5. 输入具体任务 → 让 Codex 开始工作
6. `/diff` → 查看改动
7. 验证结果 → 满意后 git commit

## 四、使用方法与实战

### 4.1 核心功能详解

**Thread（对话线程）**：Codex App 中一个项目可开多个 thread，每个 thread 对应一个独立任务，避免上下文混乱。

**Review Pane**：任务完成后系统展示的"改动审查区"，以 diff 形式显示新增（绿色）和删除（红色）代码，支持逐行评论反馈。

**自动化**：Codex 可配置定期执行的任务，实现"AI 值班工程师"——平时不打扰，有问题时提醒，简单问题自动修，复杂问题走审批。

**插件（Plugin）**：扩展 Codex 能力的安装包，支持 Chrome 浏览器操作、GitHub 仓库管理、Figma 设计稿转代码、文档生成、视频制作等。

**Skill**：固定工作方法，将同类任务的标准流程打包复用。例如"写 README" skill 每次按固定模板输出。

**MCP（Model Context Protocol）**：连接外部工具和数据的标准接口，Codex 通过 MCP 可以操作数据库、文档、API 等。

### 4.2 标准化工作流

项目提出了清晰的任务执行方法论：

**小任务推荐流程：**
1. 读项目（理解上下文）
2. 出方案（计划模式）
3. 只改一个模块
4. 跑测试验证
5. 看 diff 确认
6. 没问题再继续

**适用 Codex 的任务特征：** 目标明确、范围可控、上下文清楚、结果可验证、失败可回滚、风险可接受。

**不适合直接用 Codex 的场景：** 生产数据库操作、支付核心逻辑、权限安全模块、大规模架构迁移、无备份的重要项目。

### 4.3 实战案例

项目包含 5 个完整的实战案例，涵盖：
- 宠物零食售卖前端页面
- 功能优化与页面增强
- 管理后台开发
- 招商 PPT 制作
- 宣传视频制作

## 五、常见问题与解决方案

### 5.1 安装与启动问题

- **command not found**：CLI 未加入 PATH，重开终端或重新安装
- **npm 安装失败**：先检查 `node -v` 和 `npm -v`，确认 Node.js 环境正常
- **Windows 安装后找不到命令**：关闭 PowerShell 重新打开，刷新环境变量

### 5.2 登录问题

- **浏览器未自动打开**：使用 `codex login --device-auth` 设备码登录
- **登录状态异常**：运行 `codex login status` 检查
- **账号切换**：先 `codex logout`，再重新登录

### 5.3 权限与沙盒

- **Codex 一直等待**：查看终端是否在等待 approval（权限批准）
- **不能联网**：沙盒默认限制联网，手动批准即可
- **改坏了代码**：使用 `git diff` 检查，必要时 `git revert`

### 5.4 模型与额度

- **额度消耗快**：小任务用低/中推理，不要所有任务都开最高推理
- **任务变慢**：降低推理强度或缩小任务范围
- **模型不可见**：取决于套餐、地区、版本和模型目录，使用当前可选模型即可

## 六、总结

Codex 橙皮书的价值不仅在于它是一本安装手册，更在于它系统性地提炼了 AI 编程 Agent 时代的**最佳实践方法论**。

从技术角度看，项目清晰区分了 Codex 的四个入口及其适用场景，详细解读了 Sandbox 权限模型、Thread 任务管理机制、Plugin/Skill/MCP 三层扩展能力。从工程实践角度看，它给出了从"先读项目再动手"到"先计划再执行"的标准化工作流，以及"任务越清楚，Codex 越稳定"的核心原则。

项目持续更新于 GitHub，支持在线阅读和 PDF 下载，适合所有希望系统性上手 Codex 的开发者——无论你是完全没用过 Codex 的新手，还是想对比 Cursor、Claude Code 工作流的资深开发者。

> 参考链接：[Codex 橙皮书仓库](https://github.com/bozhouDev/codex-orange-book) | [在线阅读](https://vink567.github.io/codex-orange-book/)
