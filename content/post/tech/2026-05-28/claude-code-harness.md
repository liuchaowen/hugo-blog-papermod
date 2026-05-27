---
title: "Claude Code Harness：让 Claude Code 工作有迹可循的工程化框架"
date: 2026-05-28
draft: false
categories: [技术, AI工具, 工程化]
tags: [Claude Code, AI辅助开发, 开源, Go, 工程化]
description: "Claude Code Harness 为 Claude Code 提供了一套纪律化的交付循环，通过 5 个动词技能（Plan、Work、Review、Sync、Release）将散乱的 Agent 工作转化为可追踪、可验证、可发布的工程流程。"
author: "Cheman"
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

## 一、项目概述

**Claude Code Harness** 是一个为 Claude Code 打造的 disciplined delivery loop（纪律化交付循环）。它的核心目标是解决一个日益严重的问题：

> Claude Code 很强，但原始的 Agent 工作容易漂移——计划活在聊天记录里，测试变成可选项，审查来得太晚，发布证据每次都要靠记忆重新构建。

Harness 将这种散乱的工作方式转变为一个可重复的执行路径：

1. **写规格和计划**（Spec & Plan）
2. **只实现已批准的切片**（Implement Approved Slice）
3. **验证结果**（Verify Result）
4. **独立审查**（Independent Review）
5. **打包证据用于 PR 或发布**（Package Evidence）

### 核心特性

- **5 个动词技能**：`/harness-plan`、`/harness-work`、`/harness-review`、`/harness-sync`、`/harness-release`，保持接口面小而清晰
- **Go 原生核心**：核心引擎用 Go 编写，无需 Node.js 依赖
- **多工具兼容**：支持 Claude Code（官方支持）、Codex CLI（内部兼容）、OpenCode（内部兼容），Cursor / GitHub Copilot CLI 为候选路径
- **计划验证机制**：非平凡计划会记录 `team_validation_mode`，并通过 team/sub-agent 或 manual-pass 视角验证 spec/Plans 一致性、记忆复用、产品适配、安全适配和实操性
- **证据驱动**：未观察到的数据标记为 `unknown`，而非被静默编造

## 二、技术原理

### 架构设计

Harness 的核心架构围绕 **source-of-truth loop**（真相源循环）构建：

```
Investigate → Plan → Work → Review → PR → Release
     ↓          ↓       ↓        ↓        ↓        ↓
  Evidence   spec.md  Code    Verdict   Evidence  Tag/Release
  & Unknowns Plans.md & Tests (Blocker)  Pack     Artifacts
```

关键设计决策：

1. **spec.md + Plans.md 作为真相源**：所有工作基于这两个文件，Agent 未见过的数据保持 `unknown` 状态
2. **计划门控**：用户批准或修正生成的合同后，执行才能继续
3. **TDD 强制**：当任务要求时，测试驱动开发是强制性的
4. **独立审查**：`/harness-review` 与实现分离，重大发现会阻塞完成
5. **发布前哨**：`/harness-release` 只在实现和审查完成后检查发布就绪状态

### 核心技术栈与选型理由

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **Go** | 核心 guardrail 引擎 | 原生性能、单二进制分发、无运行时依赖 |
| **Bash Scripts** | 工具适配层（Codex/OpenCode） | 最小侵入性，兼容现有工具链 |
| **Claude Plugin Marketplace** | Claude Code 集成 | 原生集成，用户体验一致 |
| **Markdown** | 计划、规格、证据存储 | 人类可读、版本可控、工具可解析 |

Go 原生核心是一个关键选型：它意味着用户不需要安装 Node.js 就能使用 Harness 的 guardrail 引擎。这对于需要在 CI/CD 环境中运行 guardrail 的团队尤其有价值。

### 关键算法/设计模式

#### 1. 计划验证模式

非平凡计划会触发 `team_validation_mode`，通过多个视角验证计划：

- **spec/Plans 一致性**：规格和计划是否对齐？
- **记忆复用**：是否复用了之前的记忆？
- **产品适配**：计划是否符合产品目标？
- **安全适配**：是否有安全风险？
- **实操性**：计划是否实际可行？

这种模式借鉴了多层次验证的思想，避免单一视角的盲点。

#### 2. 证据打包模式

`/harness-release` 不会盲目打包，而是检查：

- 发布就绪状态
- CHANGELOG/tag 边界
- 实现和审查完成后的证据完整性

这确保了 "PR ready" 不等于 "release ready"。

#### 3. 迁移报告模式

`bin/harness doctor --migration-report` 不会删除任何数据，而是盘点：

- 旧插件缓存
- 重复 Codex skills
- 旧 symlinks
- OpenCode 备份路径
- harness-mem 状态

这种模式让用户在清理前先了解现状，避免误删。

### 数据流分析

以 `/harness-plan` 为例：

1. 用户输入自然语言请求（如 "Improve the README onboarding flow"）
2. Harness 调用 Claude Code 生成 `spec.md` 和 `Plans.md` 草稿
3. 如果是非平凡计划，触发 `team_validation_mode`
4. 用户批准或修正合同
5. 合同成为真相源，后续工作基于此执行

整个流程中，数据流向是：

```
User Input → Harness → spec.md + Plans.md → Approval → Work Execution
                ↓                                  ↑
           Validation Report                   Approved Contract
```

## 三、安装与快速开始

### 环境要求

- **Claude Code v2.1+**（官方支持路径）
- 具有写权限的项目仓库
- **无需 Node.js**（Go 原生核心）
- 可选：[harness-mem](https://github.com/Chachamaru127/harness-mem)（跨会话记忆）

### 安装步骤

#### Claude Code 快速路径（30 秒安装）

```bash
claude
/plugin marketplace add Chachamaru127/claude-code-harness
/plugin install claude-code-harness@claude-code-harness-marketplace
/harness-setup
```

#### 其他工具路径

| 工具 | 安装命令 |
|------|----------|
| Codex CLI | `scripts/setup-codex.sh --user` |
| OpenCode | `scripts/setup-opencode.sh` |

### 最简运行示例

安装完成后，运行一个小请求测试：

```bash
/harness-plan Improve the README onboarding flow
```

Harness 会为你生成 `spec.md` 和 `Plans.md` 草稿，你只需批准或修正。

然后执行最小的批准任务：

```bash
/harness-work 1.1.1
```

最后运行审查：

```bash
/harness-review
```

## 四、使用方法与实战

### 基础用法

#### 1. 规划阶段

```bash
/harness-plan Add user authentication with JWT
```

Harness 会生成：

- `spec.md`：包含范围、验收标准、依赖、未知项、停止条件
- `Plans.md`：任务切片和执行顺序

你的工作不是手写计划，而是在执行前批准或修正生成的合同。

#### 2. 工作阶段

```bash
# 执行单个任务
/harness-work 1.1.1

# 执行已批准计划的全部任务
/harness-work all
```

`/harness-work` 会：

- 只实现已批准的切片
- 在需要时添加测试
- 运行验证
- 保持工作在计划范围内

#### 3. 审查阶段

```bash
/harness-review
```

独立的审查分离了实现和审查角色，重大发现会阻塞完成。

#### 4. 发布阶段

```bash
/harness-release
```

`/harness-release` 会检查发布就绪状态、CHANGELOG/tag 边界，并打包证据。

### 进阶用法

#### Breezing（团队执行模式）

对于更大的任务列表，Harness 支持 Planner/Critic/Worker 风格的团队执行。

这仍然受计划质量和审查的约束。

#### Codex 伴生审查

通过 `scripts/codex-companion.sh`，Harness 支持 schema 支持的 Codex 第二意见。

注意：原始的 `codex exec` 不是 Harness 伴生路径。

#### OpenCode 引导

`scripts/setup-opencode.sh` 会将 Harness 引导镜像到 OpenCode 兼容的界面。

注意：不声称真实的运行时 parity。

#### harness-mem（可选）

配置 [harness-mem](https://github.com/Chachamaru127/harness-mem) 后，Harness 支持跨会话的项目范围记忆和召回。

清除记忆仍然是显式的。

### 实际项目示例

假设你要为一个 Express.js 项目添加 JWT 认证：

1. **规划**：

```bash
/harness-plan Add JWT authentication middleware to Express.js app
```

Harness 生成 `spec.md`：

```markdown
# Spec: JWT Authentication

## Scope
- Add JWT middleware for protected routes
- Create login endpoint that returns JWT
- Add refresh token mechanism

## Acceptance Criteria
- [ ] Unauthenticated requests return 401
- [ ] Valid JWT allows access
- [ ] Expired JWT returns 403
- [ ] Refresh token rotates properly

## Unknowns
- Secret storage mechanism (env vars? Vault?)
- Token expiration time (default 1h?)

## Stop Conditions
- All acceptance criteria verified
- No major security findings in review
```

2. **工作**：

```bash
/harness-work all
```

Harness 实现切片，添加测试，运行验证。

3. **审查**：

```bash
/harness-review
```

独立审查可能发现：secret 应该存在环境变量中，而不是硬编码。

4. **修复和发布**：

根据审查反馈修复，然后：

```bash
/harness-release
```

## 五、常见问题与解决方案

### 安装失败

**问题**：`/plugin install` 失败，提示兼容性问题。

**解决方案**：
- 检查 Claude Code 版本是否为 v2.1+
- 运行 `bin/harness doctor --migration-report` 检查环境
- 查看 [Claude Code Compatibility](docs/CLAUDE_CODE_COMPATIBILITY.md) 文档

### 运行时错误

**问题**：`/harness-plan` 生成的计划不实用。

**解决方案**：
- 提供更具体的自然语言请求
- 手动修正生成的 `spec.md` 和 `Plans.md`
- 检查 `team_validation_mode` 是否启用（非平凡计划）

### 性能问题

**问题**：Harness 运行缓慢。

**解决方案**：
- Go 原生核心应该很快，检查是否有网络请求阻塞
- 减少 `harness-mem` 的召回范围
- 检查是否启用了不必要的验证步骤

### 兼容性问题

**问题**：在 Codex CLI 中使用 Harness 时功能受限。

**解决方案**：
- Codex CLI 是 `internal-compatible` 状态，不是所有功能都支持
- 避免使用 `raw codex exec` 作为 Harness 伴生路径
- 使用 `scripts/codex-companion.sh` 进行 schema 支持的伴生审查

**问题**：从旧版本迁移时担心数据丢失。

**解决方案**：
- 运行 `bin/harness doctor --migration-report` 先盘点现状
- 报告不会删除任何数据
- 根据报告手动清理或保留

## 六、总结

Claude Code Harness 填补了 Claude Code 强大能力与工程化纪律之间的空白。通过 5 个动词技能和 Go 原生核心，它将散乱的 Agent 工作转化为可追踪、可验证、可发布的工程流程。

**适用场景**：
- 需要让 Claude Code 工作有迹可循的个人或团队
- 希望在 CI/CD 中运行 guardrail 的项目
- 需要跨会话记忆和证据打包的复杂项目

**不适用场景**：
- 期望 "一键完成所有事情" 的用户（Harness 需要人工门控）
- 不使用 Claude Code 或兼容工具的用户
- 期望所有工具（Cursor、Copilot 等）都获得官方支持的用户

Harness 的哲学是：**你的工作不是手写计划，而是在执行前批准或修正生成的合同**。这种方式既保持了 Agent 的灵活性，又引入了工程化的纪律。

项目地址：<https://github.com/Chachamaru127/claude-code-harness>

## 参考资源

- [Tool-first onboarding](docs/onboarding/index.md) - 根据工具选择入门路径
- [Install routes](docs/onboarding/install.md) - 每工具的安装和支持等级边界
- [Migration check](docs/onboarding/migration.md) - 现有用户的影响、兼容性和回滚路径
- [Capability matrix](docs/tool-capability-matrix.md) - 支持、内部兼容、候选和不支持的宿主声明
- [Hardening parity](docs/hardening-parity.md) - Claude hooks 和 Codex gates 之间的运行时安全差异
