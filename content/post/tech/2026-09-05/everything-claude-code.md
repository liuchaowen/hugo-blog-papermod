---
title: "Everything Claude Code：一位 Anthropic 黑客松冠军的 Claude Code 配置全家桶"
date: 2026-09-05T23:10:00+08:00
description: "Everything Claude Code 是 Anthropic 黑客松冠军 Affaan Mustafa 开源的 Claude Code 配置合集，包含经过 10 个月以上生产环境打磨的 agents、skills、hooks、commands、rules 与 MCP 配置，覆盖 Token 优化、记忆持久化、验证循环与并行化等高级工程实践，支持 Windows、macOS、Linux 全平台。"
author: "Cheman"
draft: false
tags: ["Claude Code", "AI Agent", "开源", "开发者工具", "Prompt Engineering"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**WorldFlowAI/everything-claude-code**，它把一位 Anthropic 黑客松冠军在 10 个多月里高频日常使用、并跑通多个生产级产品沉淀下来的 Claude Code 配置，一次性开源了出来——不是零散技巧，而是一整套可直接落地的「配置工程」方法论。

## 一、项目概述

Everything Claude Code（原 `affaan-m/everything-claude-code`）的作者 Affaan Mustafa，曾用 Claude Code 完整构建了 `zenith.chat`，并在 2025 年 9 月的 **Anthropic x Forum Ventures 黑客松**中夺冠。这个仓库正是他这段时间「高强度、真实生产场景」下迭代出来的 Claude Code 配置全集。

它的核心定位是一份**生产就绪（production-ready）的 Claude Code 插件**，把日常最常被低估、却最能拉开效率差距的几类配置打包：

- **Agents（子代理）**：规划、架构、TDD、代码审查、安全审查、构建排错、E2E 测试、重构清理、文档同步。
- **Skills（技能）**：编码规范、前后端模式、持续学习、策略性压缩、TDD 工作流、安全审查、评估框架、验证循环。
- **Commands（斜杠命令）**：`/tdd`、`/plan`、`/e2e`、`/code-review`、`/build-fix`、`/refactor-clean`、`/learn`、`/checkpoint`、`/verify`、`/setup-pm`。
- **Rules（规则）**：安全、编码风格、测试、Git 工作流、子代理调度、性能。
- **Hooks（钩子）**：会话生命周期的记忆持久化、策略性上下文压缩。
- **MCP 配置**：GitHub、Supabase、Vercel、Railway 等开箱即用的服务器配置。

可以说，它把「如何让 Claude Code 既听话又专业」这件事，从玄学经验变成了一套可复制的工程资产。

## 二、技术原理

### 2.1 子代理（Agents）解决上下文隔离问题

仓库把不同职责拆给专门的子代理，例如代码审查代理：

```markdown
---
name: code-reviewer
description: Reviews code for quality, security, and maintainability
tools: Read, Grep, Glob, Bash
model: opus
---

You are a senior code reviewer...
```

通过限定 `tools` 与指定 `model`（如用 Opus 做审查、用更轻量的模型做简单任务），既保证专业能力，又控制 Token 消耗——这背后是「上下文问题（context problem）」的处理：把大任务拆给 scope 受限的子代理，主会话只保留编排信息。

### 2.2 钩子（Hooks）实现记忆持久化

最大的亮点之一，是用 Node.js 重写的跨平台钩子，在会话开始/结束、压缩前后自动保存与加载上下文：

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\.(ts|tsx|js|jsx)$\"",
  "hooks": [{
    "type": "command",
    "command": "#!/bin/bash\ngrep -n 'console\\.log' \"$file_path\" && echo '[Hook] Remove console.log' >&2"
  }]
}
```

配合 `session-start.js` / `session-end.js`，可以实现「跨会话自动记忆」；`evaluate-session.js` 则能从会话中自动提取可复用的模式，沉淀进 skills——这正是作者强调的 *Continuous Learning* 闭环。

### 2.3 验证循环（Verification Loop）与并行化

Longform 指南覆盖的工程实践包括：

- **Token 优化**：模型选择、系统提示瘦身、后台进程。
- **记忆持久化**：用 Hook 跨会话保存/加载上下文。
- **持续学习**：从会话中自动抽取模式，固化成 skill。
- **验证循环**：Checkpoint 式 vs 连续式评估，分级器（grader）类型，`pass@k` 指标。
- **并行化**：Git worktree 隔离、cascade 方法、何时扩实例。
- **子代理编排**：上下文隔离、迭代式检索模式。

### 2.4 包管理器自动探测（跨平台兼容）

新增的 `scripts/setup-package-manager.js` 按优先级自动探测 npm / pnpm / yarn / bun：

```bash
# 通过环境变量指定
export CLAUDE_PACKAGE_MANAGER=pnpm

# 或全局/项目级配置
node scripts/setup-package-manager.js --global pnpm
node scripts/setup-package-manager.js --project bun

# 探测当前设置
node scripts/setup-package-manager.js --detect
```

探测顺序为：环境变量 → 项目 `.claude/package-manager.json` → `package.json#packageManager` → Lock 文件 → 全局配置 → 兜底取第一个可用。

## 三、安装与快速开始

### 方式一：作为插件安装（推荐）

```bash
# 把本仓库添加为 marketplace
/plugin marketplace add affaan-m/everything-claude-code

# 安装插件
/plugin install everything-claude-code@everything-claude-code
```

也可以直接改 `~/.claude/settings.json`：

```json
{
  "extraKnownMarketplaces": {
    "everything-claude-code": {
      "source": { "source": "github", "repo": "affaan-m/everything-claude-code" }
    }
  },
  "enabledPlugins": {
    "everything-claude-code@everything-claude-code": true
  }
}
```

### 方式二：手动安装

```bash
git clone https://github.com/affaan-m/everything-claude-code.git

# 复制 agents / rules / commands / skills
cp everything-claude-code/agents/*.md ~/.claude/agents/
cp everything-claude-code/rules/*.md  ~/.claude/rules/
cp everything-claude-code/commands/*.md ~/.claude/commands/
cp -r everything-claude-code/skills/* ~/.claude/skills/
```

再把 `hooks/hooks.json` 合并进 `~/.claude/settings.json`，并从 `mcp-configs/mcp-servers.json` 拷贝所需 MCP（记得把 `YOUR_*_HERE` 替换为真实 API Key）。

> 跨平台支持：所有 hooks 与脚本已用 Node.js 重写，完整支持 Windows、macOS、Linux。

## 四、使用方法与实战

安装后即可在 Claude Code 里直接调用斜杠命令，例如进入 TDD 节奏：

```bash
/tdd          # 测试驱动开发：先写失败测试（RED），最小实现（GREEN），再重构（IMPROVE）
/plan         # 让 planner 代理做功能实现规划
/code-review  # 调用资深 reviewer 做质量与安全审查
/verify       # 跑验证循环
/learn        # 会话中途抽取可复用模式，固化为 skill
```

典型工作流：先用 `/plan` 拆解需求 → 用 `/tdd` 推进实现 → 用 `/code-review` 与 `/security-review` 把关 → 用 `/checkpoint` 保存验证状态，配合记忆 Hook 让下次会话无缝续上。

仓库还附带两套指南（README 顶部有入口）：**Shorthand Guide**（安装、基础、理念，建议先读）与 **Longform Guide**（Token 优化、记忆持久化、评估、并行化的深度讲解）。

## 五、常见问题与解决方案

**1. 装了插件后上下文窗口被吃光？**
作者明确提醒：**不要一次性启用所有 MCP**。200k 的上下文在工具过多时可能缩水到 70k。经验法则：配置 20–30 个 MCP，但单项目启用 **少于 10 个**，活跃工具 **少于 80 个**，用 `disabledMcpServers` 关掉不用的。

**2. 手动安装后命令不生效？**
确认 `commands/*.md` 已复制到 `~/.claude/commands/`，且 `hooks.json` 已正确合并进 `settings.json`（注意 JSON 层级，避免覆盖已有配置）。

**3. MCP 连不上？**
检查 `mcp-servers.json` 中的 `YOUR_*_HERE` 占位符是否已替换为真实 Key，并确认对应服务（GitHub / Supabase 等）的访问权限。

**4. 配置水土不服？**
这些配置是为作者自己的工作流打磨的。建议：先保留共鸣部分 → 按自己的技术栈修改 → 删掉不用的 → 补上自己的模式，不要全盘照搬。

**5. 跨平台脚本报错？**
确认本机有 Node.js 运行环境；若仍异常，可用 `--detect` 检查包管理器探测结果，或用 `--global/--project` 显式指定。

## 六、总结

Everything Claude Code 的价值不在「又多了一个 prompt 合集」，而在于它把**配置即工程资产**这件事讲透了：用 agents 隔离上下文、用 hooks 实现记忆与持续学习、用 verification loop 保证质量、用并行化放大吞吐。无论你是刚上手 Claude Code，还是已经在生产中重度使用，这套经过黑客松冠军实战检验的配置，都值得 clone 下来逐模块借鉴、再长成自己的版本。

> 仓库地址：<https://github.com/WorldFlowAI/everything-claude-code> ｜ License：MIT（可自由使用、修改，欢迎回馈社区）。
