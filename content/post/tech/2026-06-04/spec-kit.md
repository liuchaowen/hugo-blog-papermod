---
title: "Spec Kit：重新定义 AI 辅助开发——从 Vibe Coding 到 Spec-Driven Development"
date: 2026-06-04
description: "GitHub 开源的 Spec Kit 引入了 Spec-Driven Development（规范驱动开发）理念，通过先定义'做什么'再生成'怎么做'，让 AI 编程从随意的 vibe coding 转变为可预测、高质量的系统化开发流程。本文深度解析其核心设计、技术架构与实践价值。"
author: "Cheman"
slug: spec-kit
draft: false
categories: [AI 开发, 开源工具]
tags: [AI, GitHub, 开发工具, 规范驱动, Spec-Driven]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Spec Kit**，这是 GitHub 团队推出的一套开源工具链，试图解决当前 AI 编程助手"能写代码但缺乏系统性"的痛点——从随意的 vibe coding 转向可预测、可复现的规范驱动开发。

## 一、项目概述

**Spec Kit** 是由 GitHub 工程师（主要受 [John Lam](https://github.com/jflam) 的研究影响）开发的开源工具包，核心理念是 **Spec-Driven Development（规范驱动开发）**。它翻转了传统软件开发的逻辑：

> 传统模式：代码是核心，规范只是脚手架，写完就扔。
> Spec-Driven 模式：规范本身是可执行的，直接生成可用的实现，而非仅仅指导编码。

### 核心定位

Spec Kit 不是一个代码生成器，而是一个 **结构化开发流程框架**。它让你在用 AI 编程时，先系统地定义：

1. **项目宪法**（`constitution.md`）—— 项目的核心原则与治理规则
2. **功能规范**（`spec.md`）—— "做什么"和"为什么"，而非"怎么做"
3. **技术实现计划**（`plan.md`）—— 技术栈、架构选型
4. **任务分解**（`tasks.md`）—— 可顺序/并行执行的具体任务列表

然后通过 AI 编码助手（支持 30+ 工具）**按阶段执行**，而非一次性生成所有代码。

### 关键特性

- **支持 30+ AI 编码助手**：Claude Code、GitHub Copilot、Gemini CLI、Cursor、Codex、Qwen CLI 等，既支持 CLI 工具，也支持 IDE 插件
- **多阶段开发流程**：constitution → specify → plan → tasks → implement，每个阶段有明确产出
- **可扩展架构**：通过 Extensions（添加新能力）和 Presets（定制现有工作流）两套系统实现高度可定制
- **技术栈无关**：核心理念不绑定任何特定技术栈、编程语言或框架
- **CLI 工具 `specify`**：基于 Python（依赖 `uv` 或 `pipx`），提供项目初始化、扩展/预设管理、自更新等能力

## 二、技术原理

### 2.1 Spec-Driven Development 的核心设计

Spec Kit 的流程设计受到传统工程学科（如芯片设计、建筑工程）的启发：**规范先行，实现后置**。其技术原理可以从以下几个维度理解：

#### （1）多阶段逐步细化（Multi-step Refinement）

传统 AI 编程的典型问题是：**一次性提示 → 一次性代码**，缺乏迭代和结构。Spec Kit 将其拆解为 5 个阶段：

```
constitution（宪法/原则）
    ↓
specify（功能规范：What & Why）
    ↓
plan（技术计划：How & Stack）
    ↓
tasks（任务分解：Actionable Items）
    ↓
implement（执行实现）
```

每个阶段都有 **结构化模板** 和 **验证检查点**，AI 在每个阶段只需关注当前上下文，避免"上下文过大导致质量下降"。

#### （2）项目宪法（Constitution）作为治理层

`.specify/memory/constitution.md` 是整个项目的"宪法"，在所有后续阶段都会被 AI 读取并作为决策依据。例如：

```markdown
# Project Constitution

## Code Quality Principles
- All functions must have type hints (Python) or TypeScript types
- Test coverage must exceed 80% for core logic
- No hardcoded secrets; use environment variables

## Testing Standards
- Unit tests for all pure functions
- Integration tests for API endpoints
- E2E tests for critical user flows
```

这让 AI 在生成代码时有明确的"价值观约束"，而非每次都要重新提示。

#### （3）规范与实现的分离

`spec.md` 只描述功能和用户故事，不涉及技术栈：`spec.md` 示例（简化）

```markdown
## User Story 1: Create Task
As a user, I want to create a task so that I can track my work.

Acceptance Criteria:
- Title is required (1-200 characters)
- Description is optional
- Due date must be in the future
- Assignee must be a valid user

## User Story 2: Drag Task Between Columns
...
```

`plan.md` 才引入技术决策：

```markdown
## Tech Stack
- Backend: .NET Aspire + PostgreSQL
- Frontend: Blazor Server with drag-and-drop
- Realtime: SignalR

## Architecture
- Clean Architecture (Domain → Application → Infrastructure → UI)
- CQRS for task queries vs. commands
```

这种分离带来两个好处：
- 规范可以跨技术栈复用（同一功能规范可以用不同技术栈实现）
- AI 在生成代码时上下文更聚焦，减少冲突

### 2.2 `specify` CLI 的架构设计

`specify` 是用 **Python** 编写，遵循 [hatchling](https://hatch.pypa.io/) 构建系统，核心代码结构如下（基于 `pyproject.toml` 和模板结构）：

```
specify-cli/
├── src/specify_cli/          # 主包
│   ├── __init__.py
│   └── main.py               # Typer CLI 入口
├── templates/                 # 打包到 wheel 中的模板（运行时解压）
│   ├── commands/             # 斜杠命令的 prompt 模板
│   ├── scripts/bash/         # Unix 脚本
│   ├── scripts/powershell/   # Windows 脚本
│   └── *.md                  # 核心模板（constitution, spec, plan, checklist）
└── pyproject.toml
```

#### 关键设计决策

**1. 模板打包进 wheel（无需网络）**

`pyproject.toml` 中的 `[tool.hatch.build.targets.wheel.force-include]` 将所有模板文件打包到 `specify_cli/core_pack/` 下，使得 `specify init` 时可以直接从本地解压，无需访问网络（支持企业内网/离线环境）。

**2. 优先级解析系统（Override Stack）**

Spec Kit 的模板解析采用 **自上而下列表优先级**：

| 优先级 | 类型 | 路径 |
|--------|------|------|
| 1（最高） | 项目本地覆盖 | `.specify/templates/overrides/` |
| 2 | Presets（预设） | `.specify/presets/templates/` |
| 3 | Extensions（扩展） | `.specify/extensions/templates/` |
| 4（最低） | Spec Kit 核心 | `.specify/templates/` |

运行时，Spec Kit **从上到下查找第一个匹配项**，这意味着：
- 用户可以在单个项目中覆盖任何模板（无需写完整 Preset）
- 多个 Preset 可以堆叠（按优先级排序）
- 移除 Preset/Extension 时，下一个优先级自动生效（优雅降级）

**3. 安装时 vs 运行时**

- **Extensions/Presets 的命令文件**：在 `specify extension add` / `specify preset add` 时写入 AI 助手目录（如 `.claude/commands/`），之后每次调用 AI 时加载
- **模板覆盖**：在 **运行时** 动态解析（每次 AI 读取模板时都重新走优先级链）

这避免了"安装后修改不生效"的问题。

### 2.3 AI 编码助手集成机制

Spec Kit 支持两种集成模式（取决于 AI 工具的能力）：

#### 模式 A：Slash Commands（大多数工具）

将命令模板文件（如 `speckit.constitution.md`）放入 AI 工具的 commands 目录，用户可以通过 `/speckit.constitution` 调用。

例如，Claude Code 的集成流程：

```bash
specify init my-project --integration claude
# → 将 templates/commands/*.md 复制到 .claude/commands/
# → AI 读取这些文件作为 slash command 的 prompt
```

当用户在某阶段输入 `/speckit.plan` 时，AI 会：
1. 读取 `.claude/commands/speckit.plan.md`（包含指令模板）
2. 结合当前项目上下文（constitution.md, spec.md）
3. 生成 plan.md

#### 模式 B：Agent Skills Mode（支持 skills 的工具）

部分工具（如 Codex CLI）支持"技能模式"，通过 `--skills` 参数加载：

```bash
specify init my-project --integration codex --integration-options="--skills"
# → 安装为 Codex 的 skill，而非 slash command
```

在 Skills 模式下，触发方式变为 `$speckit-*` 而非 `/speckit.*`。

#### 多工具并行支持

Spec Kit 的一个核心优势是 **同一套规范可以在不同 AI 工具间切换**。因为你定义的是 `spec.md`、`plan.md` 这些 **工具无关的制品**，所以用 Claude Code 生成一次，后续可以用 Copilot 或 Gemini 继续开发。

## 三、安装与快速开始

### 3.1 环境要求

- **Python 3.11+**
- **uv**（推荐）或 **pipx**（用于安装 CLI 工具）
- Git
- 任意支持的 AI 编码助手

### 3.2 安装 Specify CLI

```bash
# 方式 1：使用 uv（推荐）
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.9.4.dev0

# 方式 2：使用 pipx
pipx install specify-cli --from git+https://github.com/github/spec-kit.git@v0.9.4.dev0
```

### 3.3 初始化项目

```bash
# 新建项目
specify init my-project --integration copilot
cd my-project

# 或在当前目录初始化
specify init --here --integration claude
```

交互式终端会提示选择 AI 编码助手类型。在非交互式环境（如 CI）中，需显式传递 `--integration`。

### 3.4 自管理（检查/升级）

```bash
# 检查是否有新版本（只读）
specify self check

# 预览升级（不实际执行）
specify self upgrade --dry-run

# 升级到最新稳定版
specify self upgrade

# 或固定到特定版本
specify self upgrade --tag v0.9.4.dev0
```

`specify self upgrade` 在底层根据安装方式自动选择：
- `uv tool` 安装 → 执行 `uv tool install specify-cli --force --from <git-ref>`
- `pipx` 安装 → 执行 `pipx upgrade specify-cli`

### 3.5 完整工作流示例

```bash
# Step 1: 启动 AI 编码助手，建立项目宪法
/speckit.constitution Create principles focused on code quality, testing standards, and performance.

# Step 2: 定义功能规范（只关注 What & Why）
/speckit.specify Build a Kanban board app where users can create tasks,
assign to team members, and drag tasks between columns (To Do, In Progress, Done).

# Step 3: 澄清规范（减少后续返工）
/speckit.clarify

# Step 4: 制定技术计划（引入技术栈）
/speckit.plan Use Vite + vanilla JS for frontend, Express + SQLite for backend.
Tasks are stored locally, no server required.

# Step 5: 生成任务分解
/speckit.tasks

# Step 6: 执行实现
/speckit.implement
```

## 四、使用方法与实战

### 4.1 场景 A：从零到一（Greenfield Development）

适用：全新项目，无遗留代码。

**实战案例：任务管理应用 Taskify**（来自官方文档）

```
specify init taskify --integration claude
cd taskify

# 在 Claude Code 中：
/speckit.constitution Focus on code quality, testing, UX consistency.

/speckit.specify Develop Taskify, a team productivity platform.
- 5 predefined users (1 PM + 4 engineers)
- 3 sample projects
- Kanban columns: To Do, In Progress, In Review, Done
- Drag-and-drop between columns
- Comments per task (unlimited, editable by author)
- Color-coding for current user's tasks
- No login for this phase

/speckit.plan Use .NET Aspire, PostgreSQL, Blazor Server,
REST API (projects, tasks, notifications), SignalR for realtime.

/speckit.tasks
/speckit.implement
```

### 4.2 场景 B：探索性并行实现（Creative Exploration）

适用：不确定最佳技术选型，想并行尝试多种方案。

Spec Kit 支持 **同一份 spec.md 用不同 plan.md 实现**。你可以：

1. 写完 `spec.md`（功能规范）
2. 创建分支 `plan-variant-a`，写 `plan.md`（技术栈 A）
3. 返回 main，创建分支 `plan-variant-b`，写 `plan.md`（技术栈 B）
4. 对比两个分支的实现结果

### 4.3 场景 C：迭代增强（Brownfield Enhancement）

适用：已有代码库，需要添加功能或现代化改造。

Spec Kit 同样适用，只需在 `specify init . --force` 在已有项目中初始化，然后在现有代码基础上运行 `/speckit.specify` 描述新功能。

### 4.4 扩展与预设

#### Extensions（扩展）—— 添加新能力

```bash
# 搜索可用扩展
specify extension search

# 安装扩展（如 Jira 集成）
specify extension add jira-integration
```

扩展可以引入全新命令。例如，一个"代码审查"扩展可能会添加 `/speckit.review` 命令。

#### Presets（预设）—— 定制现有工作流

```bash
# 搜索可用预设
specify preset search

# 安装预设（如符合企业合规的格式）
specify preset add enterprise-compliance
```

预设不改变可用命令，而是 **覆盖模板内容**。例如：
- 强制 spec 模板包含监管合规性章节
- 将任务模板改为 Agile Sprint 格式
- 本地化为其他语言（已有 [pirate-speak demo](https://github.com/mnriem/spec-kit-pirate-speak-preset-demo) 证明可定制性之深）

### 4.5 与 GitHub Issues 集成

生成任务列表后，可以将任务同步到 GitHub Issues：

```
/speckit.taskstoissues
```

这会将 `tasks.md` 中的每个任务转换为 GitHub Issue，便于项目管理和追踪。

## 五、常见问题与解决方案

### Q1: `specify init` 后 AI 助手找不到 `/speckit.*` 命令？

**可能原因：**
- 使用了不支持的 AI 助手（检查 [官方集成列表](https://github.github.io/spec-kit/reference/integrations.html)）
- 命令文件没有正确复制到助手目录

**解决方案：**

```bash
# 检查 .claude/commands/ 或其他对应目录是否存在
ls -la .claude/commands/

# 如果为空，重新运行（加 --force）
specify init --here --integration claude --force
```

### Q2: `specify self upgrade` 失败或超时？

**可能原因：**
- 网络访问 GitHub 受限
- 安装超时（默认无超时）

**解决方案：**

```bash
# 设置超时（秒）
export SPECIFY_UPGRADE_TIMEOUT_SECS=300
specify self upgrade

# 或离线安装（需提前下载 wheel）
uv tool install specify-cli --from ./specify_cli-0.9.4.dev0-py3-none-any.whl --force
```

### Q3: AI 生成的 plan.md 使用了过时技术栈？

**解决方案：** 使用 `/speckit.plan` 后，让 AI 对快速变化的库（如 .NET Aspire）做针对性研究：

```
I want you to go through the implementation plan and look for areas
that could benefit from additional research (e.g., .NET Aspire is rapidly changing).
Update the research.md with specific versions we should use,
and spawn parallel research tasks to clarify details from the web.
```

### Q4: 多个 Preset 冲突怎么办？

**解决方案：** Spec Kit 使用优先级系统，后安装的 Preset 优先级更高。可以用：

```bash
# 查看当前应用的模板来源
specify preset list --verbose

# 调整优先级或移除冲突 preset
specify preset remove <name>
```

### Q5: `speckit.implement` 执行到一半失败了？

**解决方案：** 任务是幂等的，可以重新运行：

```
/speckit.implement
```

CLI 会跳过已完成的任务（通过检查文件是否存在或内容是否符合预期）。如果问题持续，检查 `.specify/scripts/bash/common.sh` 中的日志。

### Q6: 可以在团队中共享 constitution 和 presets 吗？

**可以。** `.specify/memory/constitution.md` 和 `.specify/presets/` 都在版本控制中，提交到 Git 后，团队成员拉取即可获得相同的开发准则。

## 六、总结

**Spec Kit 的核心价值**不在于"让 AI 写代码"，而在于 **引入工程纪律到 AI 辅助开发流程中**。它通过：

1. **结构化分阶段流程**，避免一次性 prompt 导致的高质量但不可控的代码生成；
2. **项目宪法机制**，让 AI 在每一步都有明确的"价值观约束"；
3. **规范与实现解耦**，同一份功能规范可以用不同技术栈实现，保护业务知识资产；
4. **高度可扩展架构**，通过 Extensions 和 Presets 适应从个人项目到企业合规的各种场景；
5. **工具无关性**，规范制品（spec.md、plan.md 等）不绑定特定 AI 工具，随时可以切换。

**适用人群：**
- 正在使用 AI 编程助手但感觉输出质量不稳定的开发者
- 需要让 AI 生成"可维护代码"而非"一次性的脚本"的工程师
- 企业团队希望在 AI 辅助开发中引入统一标准和治理

**注意事项：**
- 学习曲线存在：需要理解每个阶段的产出和目的
- 初始设置成本较高（相比直接 vibe coding）
- 对于超小型项目（如脚本、原型），可能过度工程化

**项目状态：** 当前版本 `v0.9.4.dev0`，属于实验性阶段，但已具备可用核心功能。GitHub 官方团队正在持续迭代，社区扩展和预设生态也在成长中。

如果你厌倦了 AI 助手的"惊喜输出"，想要更可预测、更系统化的 AI 辅助开发体验，Spec Kit 值得一试。

**资源链接：**
- 官网文档：https://github.github.io/spec-kit/
- GitHub 仓库：https://github.com/github/spec-kit
- 视频概览：https://www.youtube.com/watch?v=a9eR1xsfvHg
- 社区扩展：https://github.github.io/spec-kit/community/extensions.html
