---
title: "HumanLayer Skills：让 Claude Code 拥有专业领域技能的扩展技能集"
date: 2026-09-05T20:04:00+08:00
description: "HumanLayer 开源的 skills 项目为 Claude Code 提供了一套可插拔的专业领域技能包，覆盖 CLAUDE.md 优化、React 类型收窄、Agentic 循环构建和控制回路设计等场景，通过简单的 npx 命令即可安装并在对话中以 /skill 形式调用。"
author: "Cheman"
draft: false
tags: ["Claude Code", "AI Agent", "开源", "开发者工具", "HumanLayer"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**HumanLayer/skills**，它为 Claude Code 提供了一套模块化的专业领域技能扩展包——用一条 npx 命令安装，在对话中以 `/skill` 调用的方式让 Claude Code 瞬间拥有特定场景的专业知识与操作能力。

## 一、项目概述

HumanLayer 是一个专注于 AI Agent 基础设施的开源团队，其 `skills` 仓库汇集了一系列可直接用于 Claude Code 的技能包，核心理念是：**让 AI 在特定垂直场景下具备经过验证的最佳实践，而不是每次都从零开始**。

目前仓库公开了五个技能：

| 技能名 | 用途 | 调用的斜杠命令 |
|---|---|---|
| `improve-claude-md` | 优化 CLAUDE.md 指令质量 | `/improve-claude-md` |
| `narrow-react-prop-types` | 收窄 React Props 类型到实际代码路径 | `/narrow-react-prop-types` |
| `build-iterated-agentic-loop` | 构建本地技能 + 迭代式 Agent 循环 | `/build-iterated-agentic-loop` |
| `design-control-loop` | 访谈式设计 Agentic 控制回路 | `/design-control-loop` |
| `show-me` | 用图表和 HTML 可视化解释主题 | `/show-me` |

所有技能的共同特点是**开箱即用、场景明确、输出可验证**，适合在已有 Claude Code 集成的项目中快速提升 AI 的专业能力。

## 二、技术原理

### 2.1 Claude Code 技能系统的工作机制

Claude Code 支持通过项目根目录的 `CLAUDE.md` 文件向 AI 提供持久化的上下文指令。HumanLayer 的技能本质上是一组经过测试的 CLAUDE.md 片段与配套脚本，通过 Claude Code 的 `/` 斜杠命令接口注入到当前对话中。

当你在项目里安装了某个技能（如 `improve-claude-md`），技能会修改或追加项目的 `CLAUDE.md` 内容，引入针对该场景的指令规则。以 `improve-claude-md` 为例，它的核心思路是利用 Claude Code 支持的 **`# IMPORTANT if` 条件块**（一种基于任务类型动态注入指令的机制），让 CLAUDE.md 中的规则只在特定场景下激活，从而减少规则噪音、提升指令遵循率。

Claude Code 的 `# IMPORTANT if` 块语法大致如下：

```
# IMPORTANT if: 你正在修改或审查前端代码
- 优先关注组件的 TypeScript 类型覆盖率
- 避免在 JSX 中使用 any 类型
```

HumanLayer 的 `improve-claude-md` 技能会自动扫描你现有的 CLAUDE.md，找出可以改造为 `IMPORTANT if` 结构的指令块，并将其改写，从而让 AI 在正确的上下文中激活对应的规则。

### 2.2 迭代式 Agentic 循环的构建思路

`build-iterated-agentic-loop` 技能解决的核心问题是：如何让 Claude Code 成为一个能够**自我改进的编码 Agent**。

其技术路径是：
1. **构建本地 Skill**：将当前项目的最佳实践封装为一个本地 Claude Code Skill（一个包含指令模板和上下文的目录结构）。
2. **生成 GitHub Actions 工作流**：编写一个定时或触发式的 CI 流程，让 Agent 定期扫描代码库、执行自检任务、生成改进建议并提交 PR。
3. **维护 Memory 文件**：在项目中维护一个结构化的记忆文件，记录 Agent 在过去循环中学到的上下文知识，避免每次循环都丢失状态。

整个架构借鉴了"观测-决策-执行"的控制论模型，Agent 在每次循环中：
- **感知（Sensing）**：扫描代码变更、测试结果、lint 输出
- **决策（Decision）**：基于规则和历史记忆判断需要改进的点
- **执行（Actuation）**：生成代码变更或提交记录

### 2.3 控制回路设计框架

`design-control-loop` 技能采用了更系统的控制论方法来指导 AI 的行为。其将代码库中的 Agent 行为建模为四个标准组件：

- **Sensor（传感器）**：检测环境状态变化的组件，对应代码库中的监控点（如 CI 失败、依赖告警、性能回归）
- **Controller（控制器）**：基于感知数据做出决策的逻辑，对应 AI 的判断规则和优先级
- **Actuator（执行器）**：实际改变代码或状态的组件，对应 AI 执行的 git 操作、文件写入等
- **Disturbances（扰动）**：影响系统正常运行的外部因素，如依赖升级、团队协作冲突等

通过访谈式对话，AI 会帮助用户识别当前代码库中这四个组件的现状，并生成对应的实现代码和定时调度配置。

## 三、安装与快速开始

### 3.1 前置要求

- Node.js 22 及以上（用于运行 `npx`）
- 已安装 Claude Code CLI（`npm install -g @anthropic-ai/claude-code` 或通过官方渠道安装）
- Git（用于版本管理）

### 3.2 安装步骤

安装整个技能集合：

```bash
npx skills add humanlayer/skills
```

安装单个技能（以 `improve-claude-md` 为例）：

```bash
npx skills add humanlayer/skills --skill improve-claude-md
```

安装后，Claude Code 会自动识别新安装的斜杠命令，可直接通过 `/improve-claude-md` 等方式调用。

### 3.3 验证安装

在任意 Claude Code 对话中输入 `/skills list`（如果支持）或直接运行 `/improve-claude-md`，若 AI 正常响应技能引导信息，则说明安装成功。

## 四、使用方法与实战

### 4.1 优化项目 CLAUDE.md

在已有 CLAUDE.md 的项目中运行：

```
/improve-claude-md
```

AI 会分析现有指令，使用 `<important if>` 条件块重写 CLAUDE.md，使其在正确的上下文场景下激活对应规则。适用于 CLAUDE.md 变得冗长、指令相互冲突的场景。

### 4.2 收窄 React Props 类型

在 TypeScript + React 项目中运行：

```
/narrow-react-prop-types
```

AI 会扫描组件文件，将过于宽泛的 Props 类型（如 `any`、泛型 `T extends object`）收窄为只覆盖实际代码路径中出现的具体子集。这对于减少类型逃逸、提升类型安全有显著效果。

### 4.3 构建迭代式 Agentic 循环

```
/build-iterated-agentic-loop
```

AI 会通过一系列问题了解你的代码库结构、技术栈和团队工作流，然后生成：
- 一个本地 Skill 目录（包含该项目的专属指令模板）
- `.github/workflows/coding-agent.yml` 文件（定时运行的自检 Agent）
- `memory/agent-memory.md`（结构化的 Agent 记忆文件）

生成后，你可以手动触发第一次 Agent 循环，观察其对代码库的分析结果，再决定是否启用自动调度。

### 4.4 设计控制回路

```
/design-control-loop
```

AI 会以访谈形式提问，例如：
- "代码库目前有哪些关键的监控点？"
- "Agent 在失败后应该如何恢复？"
- "你希望每天、每周分别运行哪些检查？"

基于回答，AI 生成传感器、控制器、执行器的实现代码和 GitHub Actions 配置。

### 4.5 可视化解释（show-me）

```
/show-me [你想了解的概念]
```

AI 生成一个自包含的 HTML 页面，内含 ASCII 图、代码形状草图和简洁的结构化说明，适合在技术分享或调试时快速可视化复杂概念。

## 五、常见问题与解决方案

### Q1: npx skills add 报 `command not found`

确保 Node.js 版本 >= 22，可通过 `node --version` 确认。如版本过低，使用 `nvm install 22 && nvm use 22` 升级。

### Q2: 技能安装后 /skill 命令不识别

Claude Code 需要重启才能加载新技能。退出当前对话，重新启动 Claude Code 即可。若持续不生效，检查 Claude Code 版本是否过旧（建议 >= 1.0）。

### Q3: improve-claude-md 改变了我的 CLAUDE.md，但效果不理想

`improve-claude-md` 生成的结果是基于启发式规则推断的，不保证在所有项目上都最优。建议先用 `git diff` 查看改动，确认后再提交。如需回滚，运行 `git checkout CLAUDE.md` 即可。

### Q4: build-iterated-agentic-loop 生成的工作流在 GitHub Actions 中报错

常见原因：工作流文件中的 PAT（Personal Access Token）权限不足。进入 GitHub 仓库 Settings → Actions → Workflow permissions，确保"Read and write permissions"已开启。

### Q5: show-me 生成的 HTML 页面无法在本地打开

`show-me` 生成的 HTML 是纯前端文件，无需服务器。直接在浏览器中打开生成的 `.html` 文件即可。如遇 CSP 问题，是浏览器安全策略限制，不影响展示内容本身。

## 六、总结

HumanLayer/skills 是一套务实、高效的 Claude Code 技能扩展方案。它的价值不在于引入全新的 AI 能力，而在于**把业界验证过的最佳实践封装成可复用的模块**，让开发者在不同项目中快速获得针对性的专业辅助。无论是想改善 CLAUDE.md 的指令质量，还是构建一个能够自我改进的代码审查 Agent，这套技能集都提供了经过思考的实现路径。

推荐在个人项目或团队 Playground 中先安装 `show-me` 和 `improve-claude-md` 体验一下，感受一下 Claude Code "技能觉醒" 后的变化。
