---
title: "Babysitter: 用代码定义 AI 工作流，让代理严格按流程执行"
date: 2026-06-01
description: "深入解析 Babylon 公司推出的 AI 代理编排框架 Babysitter，如何通过过程代码化、质量门禁、人为审批中断点等机制，确保 AI 代理严格按预期执行复杂任务。"
author: "Cheman"
slug: babysitter
draft: false
categories: ["技术", "开源"]
tags: ["AI", "代理", "编排", "Claude", "工作流"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**Babysitter**，它提出了一个极具挑战性的问题——如何让 AI 代理真正「听话」？在日常使用 Claude Code、Cursor 等 AI 编程工具时，你是否遇到过 AI 自作主张、跳过检查直接完成任务、或是在关键时刻失控的情况？Babysitter 通过将工作流定义为代码、引入强制质量门禁和人为审批中断点，让 AI 只能在预定义的边界内行事。

## 一、项目概述

Babysitter 是一个面向 AI 代理的工作流编排框架，其核心理念是「**强制服从**」（Enforce Obedience）。与传统 AI 辅助方式不同，Babysitter 将工作流定义为 JavaScript 代码而非配置或自然语言，AI 代理只能执行代码中明确允许的操作，任何超出边界的尝试都会被强制阻止。

项目的核心特性包括：

- **过程即代码**：工作流用 TypeScript/JavaScript 编写，AI 只能在代码定义的范围内行动
- **强制质量门禁**：任务完成后必须通过代码定义的检查才能继续，否则必须返工
- **人为审批中断点**：在关键节点暂停，等待人工确认后才能继续执行
- **事件溯源日志**：所有决策、任务、执行状态都记录在不可变的日志中，支持重放和审计
- **多 harness 支持**：兼容 Claude Code、Codex、Gemini CLI、Cursor 等多种 AI 编程工具

这种设计理念来源于一个现实痛点：当 AI 代理处理复杂任务时，它可能会「聪明地」绕过人类设定的约束，或者在未经批准的情况下做出关键决策。Babysitter 通过架构层面的强制约束，确保 AI 的每一步都在人类的掌控之中。

## 二、技术原理

### 2.1 核心架构

Babysitter 的架构可以分为三个层面：过程定义层、执行引擎层和日志层。

```
┌─────────────────────────────────────────────────────────────┐
│                    过程定义层 (Process)                     │
│                                                             │
│  async function process(inputs, ctx) {                    │
│    await ctx.task(plan, { ... });     ← 任务定义            │
│    await ctx.breakpoint({            ← 中断点定义          │
│      question: '确认此方案?'         │
│    });                                                      │
│    await ctx.task(impl, { ... });      ← 实现任务            │
│    const score = await ctx.task(v);  ← 质量验证            │
│    if (score < 80) await ctx.task(refine);                   │
│  }                                                          │
└────────────────────────��────────────────────────────────────┘
                           │
                           │ 强制执行
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  执行引擎层 (Enforcement)                    │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐      │
│  │ 强制停止 │───▶│ 过程检查器   │───▶│ 决策器    │      │
│  │ (hook)   │    │ (允许什么?)   │    │ (执行/阻止)│      │
│  └──────────┘    └──────────────┘    └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 记录
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    日志层 (Journal)                         │
│                                                             │
│  所有任务、中断点、决策 → 不可变日志 → 支持重放/审计        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 任务（Tasks）机制

任务是 Babysitter 中的基本执行单元。每个任务代表一个可执行的工作块，可以是代码审查、单元测试、构建、部署等任意操作。任务的定义在过程代码中以函数调用的形式呈现：

```javascript
await ctx.task(verify_code, {
  target: './src/auth.ts',
  criteria: ['无 console.log', '覆盖率 > 80%', '无安全漏洞']
});
```

执行引擎调用相应的 AI harness（如 Claude Code）来执行任务，并将结果返回给过程检查器。值得注意的是，任务不是「建议」，而是强制执行——如果 AI 在执行过程中越界，执行引擎会强制终止并记录违规行为。

### 2.3 质量门禁（Quality Gates）

质量门禁是代码定义的检查逻辑，用于验证任务输出的质量。与配置形式的检查不同，质量门禁是真正的代码逻辑，可以执行任意复杂的验证：

```javascript
const testResult = await ctx.task(run_tests, { 
  framework: 'vitest',
  coverage: true 
});

// 质量门禁：必须是真实的代码检查，不能跳过
if (testResult.coverage < 80) {
  await ctx.task(refine_coverage, {
    message: '测试覆盖率不足，需要补充测试用例'
  });
}
```

这种设计确保了质量检查不会被「聪明」的 AI 绕过。相比于简单的配置阈值，代码形式的质量门禁可以处理更复杂的业务逻辑，比如检查代码风格、安全漏洞、性能指标等。

### 2.4 中断点（Breakpoints）

中断点是 Babysitter 最具特色的机制之一——它在关键节点强制暂停，等待人工确认后才能继续。这与传统 IDE 的调试断点类似，但专为 AI 工作流设计：

```javascript
await ctx.task(plan_refinement, { ... });

// 强制中断，等待人类批准
await ctx.breakpoint({
  question: '请确认修复方案？同意请回复 y',
  timeout: 3600000  // 1小时超时
});

// 只有人类批准后才会继续执行后续任务
await ctx.task(apply_fix, { ... });
```

### 2.5 压缩子系统

Babysitter 还内置了一个四层的 Token 压缩子系统，可以减少 50-67% 的上下文使用量，同时保持 99% 的事实保留率：

| 层级 | 钩子 | 引擎 | 内容 | 压缩比 |
|------|------|------|------|--------|
| 1a | userPromptHook | 密度过滤器 | 用户提示 | ~29% |
| 1b | commandOutputHook | 命令压缩器 | Shell 输出 | ~47% |
| 2 | sdkContextHook | 句子提取器 | Agent 上下文 | ~87% |
| 3 | processLibraryCache | 句子提取器 | 库文件 | ~94% |

压缩功能默认开启，可以通过环境变量或配置文件禁用特定层级。

## 三、安装与快速开始

### 3.1 环境要求

- **Node.js**：20.0.0+（推荐 22.x LTS）
- **Claude Code**：最新版本（用于推荐的交互模式）
- **Git**：用于克隆（可选）

### 3.2 安装步骤

#### Claude Code 模式（推荐）

首先安装插件：

```bash
claude plugin marketplace add a5c-ai/babysitter
claude plugin install --scope user babysitter@a5c.ai
```

重启 Claude Code 后，输入 `/skills` 验证 babysit 命令可用。

#### 内部 Harness 模式（无需外部 AI）

如果不需要 AI 参与，可以直接使用内置的执行引擎：

```bash
npm install -g @a5c-ai/babysitter-sdk

# 运行过程定义
babysitter harness:call \
  --harness internal \
  --process .a5c/processes/my-process.js#process \
  --workspace .
```

### 3.3 快速开始

按照指引配置个人项目和项目级设置：

```bash
# 配置个人偏好
/babysitter:user-install

# 配置项目
/babysitter:project-install

# 诊断检查
/babysitter:doctor
```

启动一个最简单的任务：

```bash
claude "/babysitter:call 实现用户认证功能，使用 TDD 方式"
```

或者使用 autonomous 模式（无需中断确认）：

```bash
claude "/babysitter:yolo 实现分页功能"
```

## 四、使用方法与实战

### 4.1 选择执行模式

Babysitter 提供四种执行模式，适用于不同场景：

| 模式 | 命令 | 适用场景 |
|------|------|----------|
| Interactive | `/babysitter:call` | 学习、重要工作流、需要人类把关 |
| Autonomous | `/babysitter:yolo` | 信任的任务、完全自动化 |
| Planning | `/babysitter:plan` | 仅规划阶段，查看过程再执行 |
| Continuous | `/babysitter:forever` | 监控、定时任务、长期运行 |

### 4.2 实用命令

```bash
# 诊断运行健康状况
/babysitter:doctor

# 实时监控面板
/babysitter:observe

# 恢复中断的运行
/babysitter:resume --run-id <runId>

# 查看帮助和文档
/babysitter:help
```

### 4.3 管理运行

```bash
# 查看历史运行记录
babysitter harness:retrospect --all

# 清理旧运行（保留最近 7 天）
babysitter harness:cleanup --keep-days 7
```

### 4.4 故障排查

如果遇到连接超时或执行失败，可以使用 doctor 命令诊断：

```bash
babysitter harness:doctor --run-id <runId>
```

常见问题包括：API Key 配置错误、超时设置过短、网络连接问题等。

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：插件安装后 /skills 看不到 babysit 命令

**解决**：
1. 确认 Claude Code 已重启
2. 运行 `claude plugin list` 检查插件状态
3. 检查插件缓存目录权限

### 5.2 执行被阻断

**问题**：任务一直停在某个中断点无法继续

**解决**：
1. 检查是否有未处理的人为审批请求
2. 使用 `babysitter harness:resume` 恢复运行
3. 检查日志中的阻断原因

### 5.3 权限问题

**问题**：Non-root 用户无法安装全局 npm 包

**解决**：
```bash
mkdir -p ~/.npm-global
echo "prefix=~/.npm-global" > ~/.npmrc
export PATH="$HOME/.npm-global/bin:$PATH"
```

### 5.4 压缩效果不��想

**问题**：Token 使用量仍然很高

**解决**：
```bash
# 查看当前压缩配置
babysitter compression:config

# 关闭特定层级
babysitter compression:toggle sdkContextHook off
```

### 5.5 多 harness 切换

**问题**：想在同一个过程中使用不同的 AI 工具

**解决**：内部 harness 支持动态发现系统中安装的 harness：

```bash
# 查看可用的 harness
babysitter harness:discover

# 在代码中指定
await ctx.delegate(task, { harness: 'claude-code' });
```

## 六、总结

Babysitter 为我们提供了一种全新的 AI 代理治理思路——与其相信 AI 会「听话」，不如从架构层面强制它听话。通过将工作流定义为代码、引入质量门禁和人为审批中断点，它确保了 AI 在复杂任务中的每一步都在人类的掌控之中。

这种设计对于企业级 AI 应用尤其有价值：想象一下，如果 AI 要修改生产数据库、部署代码到正式环境、或者处理敏感数据，没有质量门禁和人为审批将是多么危险。Babysitter 让这些关键操作都必须经过明确的检查和确认，为 AI 的规模化应用提供了安全保障。

当然，这种强约束也带来了一定的灵活性代价——AI 不能「即兴发挥」了。但对于需要可靠性的场景，这种约束正是我们需要的。如果你也在寻找一种方式来更好地控制 AI 代理的行为，不妨试试 Babysitter。