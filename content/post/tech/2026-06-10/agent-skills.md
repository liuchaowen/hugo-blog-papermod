---
title: "Agent Skills：为 AI 编码助手注入生产级工程规范"
date: 2026-06-10
description: "Addy Osmani 开源的 Agent Skills 项目为 AI 编码助手提供了 23 个生产级工程技能，涵盖从需求定义、任务规划、代码实现、测试验证到代码审查、部署上线的完整开发流程，帮助 AI 代理生成符合 Google 工程标准的生产质量代码。"
author: "Cheman"
slug: agent-skills
draft: false
categories: [技术, 开源, AI]
tags: [GitHub, 开源, AI, Agent, 工程规范, AddyOsmani]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Agent Skills**，这是 Addy Osmani 为 AI 编码助手精心打造的一套生产级工程技能包，能够让 AI 代理遵循资深工程师的工作流程来构建软件。

## 一、项目概述

Agent Skills 是一个开源项目，提供了一套完整的工程技能集合，专门用于指导 AI 编码代理（如 Claude Code、Cursor、GitHub Copilot 等）遵循生产级别的软件开发流程。

**核心定位：**
- 为 AI 代理提供结构化的工作流程，而非模糊的提示词
- 编码资深工程师的工程经验，形成可执行的技能规范
- 覆盖软件开发的完整生命周期：从需求定义到生产部署

**核心特性：**
1. **23 个专业技能**：涵盖 Define、Plan、Build、Verify、Review、Ship 六大阶段
2. **7 个斜杠命令**：`/spec`、`/plan`、`/build`、`/test`、`/review`、`/code-simplify`、`/ship`
3. **自动化触发**：根据当前工作内容自动激活相应技能
4. **多平台支持**：兼容 Claude Code、Cursor、Gemini CLI、Windsurf、GitHub Copilot 等主流 AI 编码工具
5. **反合理化机制**：每个技能都包含"常见借口 vs 反驳论据"表格，防止 AI 跳过关键步骤

**项目背景：**
AI 编码代理默认会选择最短路径完成任务，这通常意味着跳过需求文档、测试、安全审查和让软件可靠的关键实践。Agent Skills 通过结构化的工作流程，强制 AI 代理遵循与生产环境一致的工程规范。

## 二、技术原理

### 2.1 技能架构设计

Agent Skills 采用模块化设计，每个技能都是一个独立的工作流程：

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Guides agents through [task].│  │
│  │              Use when…                    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Overview         → What this skill does        │
│  When to Use      → Triggering conditions       │
│  Process          → Step-by-step workflow       │
│  Rationalizations → Excuses + rebuttals         │
│  Red Flags        → Signs something's wrong     │
│  Verification     → Evidence requirements       │
└─────────────────────────────────────────────────┘
```

**关键设计原则：**
- **流程而非散文**：技能是代理可执行的工作流程，而非参考文档
- **反合理化设计**：每个技能都包含常见借口表，防止代理"偷懒"
- **验证不可协商**：每个技能都以证据要求结束，禁止"看起来对了"这种模糊判断
- **渐进式披露**：SKILL.md 是入口，支持性参考文档按需加载，减少 token 消耗

### 2.2 核心技术栈

项目本身使用 Markdown 格式定义技能，技术栈非常轻量：

- **技能定义**：纯 Markdown 文件（SKILL.md）
- **命令集成**：Claude Code（`.claude/commands/`）、Gemini CLI（`.gemini/commands/`）
- **代理角色**：独立的 Markdown 文件定义专业审查角色
- **参考清单**：测试模式、安全检查、性能优化、无障碍访问等补充文档

### 2.3 工程文化嵌入

项目深度融入了 Google 工程文化的核心概念：

- **Hyrum's Law**（API 设计）：每个可观察的行为都会被依赖
- **Beyonce Rule**（测试）：如果没测试，就没用
- **Chesterton's Fence**（代码简化）：不理解原因前不要删除
- **Trunk-based 开发**（Git 工作流）：主干开发、原子提交
- **Shift Left**（CI/CD）：越早发现问题，修复成本越低
- **Code as Liability**（弃用与迁移）：代码是负债，不是资产

### 2.4 数据流分析

```
用户输入
  ↓
using-agent-skills（元技能）→ 识别任务类型
  ↓
激活对应技能（如 /spec、/build、/review）
  ↓
执行结构化工作流程（步骤 → 检查点 → 退出条件）
  ↓
验证证据（测试通过、构建输出、运行时数据）
  ↓
提交或继续下一阶段
```

## 三、安装与快速开始

### 3.1 环境要求

- 任意支持自定义指令或系统提示的 AI 编码工具
- Git（用于克隆仓库）
- 可选：SSH 密钥配置（用于通过 SSH 克隆）

### 3.2 安装步骤

**Claude Code（推荐）：**

```bash
# 方式一：Marketplace 安装（推荐）
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills

# 方式二：本地克隆
git clone https://github.com/addyosmani/agent-skills.git
claude --plugin-dir /path/to/agent-skills
```

> **注意**：如果遇到 SSH 错误，使用 HTTPS URL：
> ```bash
> /plugin marketplace add https://github.com/addyosmani/agent-skills.git
> /plugin install agent-skills@addy-agent-skills
> ```

**Cursor：**

将任意 `SKILL.md` 复制到 `.cursor/rules/`，或引用完整的 `skills/` 目录。

**Gemini CLI：**

```bash
# 从仓库安装
gemini skills install https://github.com/addyosmani/agent-skills.git --path skills

# 从本地克隆安装
gemini skills install ./agent-skills/skills/
```

**GitHub Copilot：**

将代理定义作为 Copilot 角色使用，将技能内容添加到 `.github/copilot-instructions.md`。

### 3.3 最简运行示例

安装完成后，在 Claude Code 中直接使用斜杠命令：

```
/spec 构建一个用户认证系统
```

Agent 会自动激活 `spec-driven-development` 技能，引导你完成需求定义、命令结构、代码风格、测试策略等 PRD 文档的编写。

## 四、使用方法与实战

### 4.1 基础用法：完整开发流程

Agent Skills 覆盖软件开发的六大阶段：

**Define 阶段（需求定义）：**
- `interview-me`：通过一对一提问提炼真实需求
- `idea-refine`：将模糊想法转化为具体方案
- `spec-driven-development`：编写完整的 PRD 文档

**Plan 阶段（任务规划）：**
- `planning-and-task-breakdown`：将需求分解为可验证的小任务

**Build 阶段（代码实现）：**
- `incremental-implementation`：增量式实现，每次只做一个垂直切片
- `test-driven-development`：红-绿-重构，测试驱动开发
- `context-engineering`：为代理提供正确的上下文信息
- `source-driven-development`：基于官方文档做技术决策
- `doubt-driven-development`：对抗性审查，防止错误决策
- `frontend-ui-engineering`：前端组件架构与无障碍访问
- `api-and-interface-design`：契约优先的 API 设计

**Verify 阶段（验证）：**
- `browser-testing-with-devtools`：使用 Chrome DevTools MCP 进行运行时验证
- `debugging-and-error-recovery`：五步分类法：复现 → 定位 → 简化 → 修复 → 防护

**Review 阶段（审查）：**
- `code-review-and-quality`：五轴代码审查，~100 行变更大小标准
- `code-simplification`：降低复杂度，保持行为不变
- `security-and-hardening`：OWASP Top 10 防护
- `performance-optimization`：Core Web Vitals 性能优化

**Ship 阶段（部署）：**
- `git-workflow-and-versioning`：主干开发、原子提交
- `ci-cd-and-automation`：质量门禁流水线
- `deprecation-and-migration`：代码弃用与迁移策略
- `documentation-and-adrs`：架构决策记录（ADR）
- `shipping-and-launch`：预发布检查清单、功能开关、分阶段滚动

### 4.2 进阶用法：自动化技能触发

除了使用斜杠命令，Agent Skills 还支持自动触发：

- 设计 API 时自动激活 `api-and-interface-design`
- 构建 UI 时自动激活 `frontend-ui-engineering`
- 处理用户输入时自动激活 `security-and-hardening`

这种自动化触发机制依赖于 `using-agent-skills` 元技能，它会根据当前任务自动映射到最合适的技能工作流程。

### 4.3 实际项目示例

**场景：构建一个 REST API**

```
用户：构建一个用户管理的 REST API

代理（激活 using-agent-skills）：
  检测到任务类型：API 开发
  推荐技能：/spec → /plan → /build → /test → /review → /ship

步骤 1：/spec
  生成 PRD：端点定义、请求/响应格式、错误处理、认证方式

步骤 2：/plan
  分解任务：
  - Task 1: 数据库模型（User、Profile）
  - Task 2: GET /users 端点
  - Task 3: POST /users 端点
  - Task 4: 认证中间件
  - Task 5: 单元测试

步骤 3：/build（增量实现）
  实现 Task 1 → 测试 → 提交
  实现 Task 2 → 测试 → 提交
  ...

步骤 4：/review
  五轴审查：正确性、可读性、测试覆盖、性能、安全

步骤 5：/ship
  预发布检查 → 功能开关 → 分阶段滚动
```

### 4.4 专业代理角色

项目还提供了三个预配置的专业审查角色：

| 代理角色 | 职责 | 视角 |
|---------|------|------|
| code-reviewer | 资深工程师 | " staff 工程师会批准这个吗？"标准 |
| test-engineer | QA 专家 | 测试策略、覆盖分析、Prove-It 模式 |
| security-auditor | 安全工程师 | 漏洞检测、威胁建模、OWASP 评估 |

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：Claude Code Marketplace 安装时出现 SSH 错误。

**解决方案**：
```bash
# 使用 HTTPS URL 而非 SSH
/plugin marketplace add https://github.com/addyosmani/agent-skills.git
/plugin install agent-skills@addy-agent-skills
```

或配置 SSH 密钥：https://docs.github.com/en/authentication/connecting-to-github-with-ssh/

### 5.2 技能未自动触发

**问题**：期望技能自动触发，但没有生效。

**解决方案**：
- 检查是否使用了支持自动触发的平台（Claude Code 支持最好）
- 尝试使用明确的斜杠命令，如 `/spec`、`/build`
- 检查 `.claude/commands/` 目录是否正确安装

### 5.3 代理跳过技能步骤

**问题**：AI 代理试图跳过测试、代码审查等步骤。

**解决方案**：
- Agent Skills 的每个技能都包含"反合理化"表格，明确列出常见借口和反驳论据
- 如果代理仍然跳过步骤，在提示词中明确要求："必须完成技能的所有验证步骤，不得跳过"

### 5.4 与现有工作流的冲突

**问题**：Agent Skills 的工作流程与团队现有流程不匹配。

**解决方案**：
- 技能是可定制的 Markdown 文件，可以根据团队需求修改
- 参考 `docs/skill-anatomy.md` 了解技能格式规范
- 提交 Pull Request 贡献团队定制版本

### 5.5 Token 消耗过高

**问题**：加载所有技能导致 Token 消耗过大。

**解决方案**：
- Agent Skills 采用"渐进式披露"设计，只加载当前需要的技能
- 使用 `using-agent-skills` 元技能自动选择相关技能
- 避免一次性将所有 SKILL.md 内容都粘贴到上下文中

## 六、总结

Agent Skills 是一个极具价值的开源项目，它解决了 AI 编码代理的一个核心问题：**如何将资深工程师的工程判断编码为可执行的工作流程**。

**核心亮点：**
1. **生产级工程规范**：不是简单的提示词集合，而是融入了 Google 工程文化的系统化技能包
2. **完整生命周期覆盖**：从需求定义到生产部署的 23 个技能，形成完整的开发闭环
3. **反合理化机制**：巧妙地在每个技能中加入"借口 vs 反驳"表格，有效防止 AI 代理"偷懒"
4. **多平台兼容**：支持 Claude Code、Cursor、GitHub Copilot 等主流 AI 编码工具
5. **开源可扩展**：MIT 协议，技能格式透明，方便团队定制

**适用场景：**
- 希望提升 AI 编码质量的工程师
- 需要规范化 AI 辅助开发流程的团队
- 对生产级代码质量有要求的项目

如果你正在使用 AI 编码助手，但发现生成的代码质量不稳定、缺少测试、忽视安全规范，那么 Agent Skills 绝对值得一试。它不仅能提升代码质量，更能帮助你建立系统化的 AI 辅助开发流程。

项目 GitHub 地址：https://github.com/addyosmani/agent-skills

（注：本文由 AI 根据项目 README 自动生成，已人工审核）
