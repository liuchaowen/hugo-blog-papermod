---
title: "Superpowers：让编程 Agent 拥有「超能力」的完整开发方法论"
date: 2026-05-05
draft: false
categories: [技术, AI工具]
tags: [AI, Agent, TDD, 开源项目, Claude, Cursor, 软件开发方法论]
description: "Superpowers 是一套专为编程 Agent 打造的完整软件开发方法论，通过可组合技能系统，让 AI 编码助手从「乱写代码」变成「有章法的工程师」。"
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

**Superpowers** 是由 Jesse Vincent（Prime Radiant）主导开发的一套面向编程 Agent 的完整软件开发方法论。它不是某个具体的工具库，而是一组「可组合技能（Composable Skills）」加上一套初始指令，让 Agent 在进入编码状态之前先遵循一套系统化的工程流程。

### 解决的核心问题

目前的 AI 编码助手普遍存在几个痛点：

1. **拿到需求就直接写代码** —— 没有充分理解问题就动手，导致方向偏差
2. **缺乏设计阶段** —— 没有规格说明（Spec）和实施方案，代码质量难以保障
3. **测试意识薄弱** —— 很少主动写测试，或先写代码再补测试
4. **无法长时间自主工作** —— 缺少计划约束，容易偏离方向

Superpowers 的核心思路是：**让 Agent 像一个训练有素的工程师一样工作** —— 先弄清问题，再出设计，再拆解任务，最后严格按 TDD 节奏推进。

### 核心特性

- **技能自动触发**：不需要手动调用，Agent 在每个阶段会自动检测并激活对应技能
- **多平台支持**：Claude Code、Codex CLI/App、Cursor、Gemini CLI、OpenCode、GitHub Copilot CLI 等
- **强制性工作流**：技能是「必须遵循」的约束，而非「建议」，确保 Agent 行为一致性
- **子 Agent 驱动开发**：支持将任务分发给多个子 Agent 并行推进，主 Agent 负责审查

---

## 二、技术原理

### 架构设计

Superpowers 的架构由两层组成：

```
┌─────────────────────────────────────────┐
│          初始指令层（Bootstrap）          │
│   Agent 启动后首先加载，确保技能被激活    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         技能库（Skills Library）          │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ brainstorming │ writing-plans │ TDD │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ subagent-driven-dev │ debugging │ ... │
│  └──────────┘ └──────────┘ └─────────┘ │
└─────────────────────────────────────────┘
```

每个技能是一个独立的 Markdown 指令文件，Agent 在执行特定阶段时读取对应技能文件，严格按照其中的步骤执行。

### 核心技术栈与选型理由

| 组件 | 技术选型 | 理由 |
|------|----------|------|
| 技能描述语言 | Markdown + 结构化指令 | 所有主流 Agent 均能解析自然语言指令 |
| 插件分发 | 各平台原生插件市场 | 最大化覆盖面，用户零配置安装 |
| 版本管理 | Git + 分支策略（main/dev） | 保证稳定性，贡献者可基于 dev 分支开发 |

### 关键技能详解

#### 1. `brainstorming`（头脑风暴）

激活时机：**Agent 即将写代码之前**

核心流程：
- 通过苏格拉底式提问，引导用户澄清真实需求
- 将设计文档分块展示，确保用户能逐段审阅
- 将最终设计保存为文档，作为后续规划的依据

```
用户：「帮我做个用户登录功能」
Agent（未激活技能）：直接开始写代码 ❌
Agent（激活技能）：
  → 问：你指的是本地认证还是 OAuth？
  → 问：需要支持哪些平台（Web/移动端）？
  → 问：有现有的用户数据库吗？
  → 展示设计摘要，等待确认 ✅
```

#### 2. `writing-plans`（编写实施计划）

激活时机：**设计已获批准**

将设计拆解为「一口能吃下」的任务块（每个任务 2-5 分钟工作量），每个任务包含：
- 精确的文件路径
- 完整的代码实现
- 验证步骤（如何确认任务完成）

#### 3. `test-driven-development`（测试驱动开发）

激活时机：**进入实施阶段**

强制遵循 RED-GREEN-REFACTOR 循环：
1. **RED**：先写一个失败的测试，运行并确认它失败
2. **GREEN**：写最少的代码让测试通过，运行并确认通过
3. **REFACTOR**：重构代码，保持测试通过

> 如果 Agent 在写测试之前写了功能代码，该技能会**强制删除**这些代码。

#### 4. `subagent-driven-development`（子 Agent 驱动开发）

激活时机：**计划已就绪，开始执行**

主 Agent 将每个任务分发给一个**全新的子 Agent**，子 Agent 完成后：
- 第一阶段审查：**规格符合性**（是否满足了任务要求）
- 第二阶段审查：**代码质量**（可读性、DRY、YAGNI）

两个阶段的审查均通过，才继续下一个任务。

#### 5. `systematic-debugging`（系统化调试）

激活时机：**遇到 Bug 或测试失败**

四阶段根因分析流程：
1. **复现**：找到最小化复现路径
2. **隔离**：定位是哪一层引入的问题
3. **根因 tracing**：沿着调用链找到根本原因
4. **防御性加固**：确保同类问题不再发生

---

## 三、安装与快速开始

### 支持的平台与安装方式

#### Claude Code

**方式一：官方插件市场**
```bash
/plugin install superpowers@claude-plugins-official
```

**方式二：Superpowers 自建市场**
```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

#### Cursor

在 Agent 聊天框中：
```
/add-plugin superpowers
```
或在插件市场中搜索 `superpowers`。

#### GitHub Copilot CLI

```bash
copilot plugin marketplace add obra/superpowers-marketplace
copilot plugin install superpowers@superpowers-marketplace
```

#### OpenCode

```
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md
```

#### 其他平台

| 平台 | 安装方式 |
|------|----------|
| Codex CLI | `/plugins` → 搜索 `superpowers` → 安装 |
| Codex App | 侧边栏 Plugins → 找到 Superpowers → 点击 `+` |
| Factory Droid | `droid plugin marketplace add https://github.com/obra/superpowers` |
| Gemini CLI | `gemini extensions install https://github.com/obra/superpowers` |

### 环境要求

- 已安装对应平台的 coding agent（Claude Code、Cursor 等）
- Agent 需支持插件/技能加载（大部分主流平台均已支持）

### 验证安装

安装完成后，启动 Agent 并输入一个编程任务，观察 Agent 是否**先提问**而不是直接写代码。如果先提问，说明 Superpowers 已激活。

---

## 四、使用方法与实战

### 基础用法：典型开发流程

下面用一个完整示例展示 Superpowers 如何改变 Agent 的行为。

**没有 Superpowers 时：**
```
用户：帮我写一个 REST API 服务
Agent：好的，这是代码...（直接输出）
```

**有 Superpowers 时：**
```
用户：帮我写一个 REST API 服务
Agent：在进入编码之前，我想先了解几个问题：
       1. 这个 API 的核心资源是什么？
       2. 需要支持哪些 HTTP 方法？
       3. 数据持久化方案有偏好吗？
       ...
       [用户回答后]
Agent：基于你的需求，我整理了一份设计摘要：
       - 技术栈：FastAPI + PostgreSQL
       - 资源：/api/v1/items
       - 支持：GET/POST/PUT/DELETE
       请确认或补充？
       [用户确认后]
Agent：接下来我会将实施计划拆解为以下任务：
       Task 1: 项目初始化和依赖安装（~3min）
       Task 2: 数据库模型定义（~4min）
       Task 3: GET /api/v1/items 接口（~5min）
       ...
       是否开始执行？
```

### 进阶用法：子 Agent 并行开发

当任务列表较长时，Superpowers 可以启动多个子 Agent 并行处理不同任务：

```python
# 这是 Superpowers 内部调度逻辑的概念示意
# 实际由 Agent 自然语言指令驱动，无需用户手写代码

tasks = load_plan("implementation-plan.md")
for task in tasks:
    subagent = spawn_subagent(task)
    result = subagent.run()
    review_stage_1 = check_spec_compliance(result, task)
    review_stage_2 = check_code_quality(result)
    if review_stage_1.passed and review_stage_2.passed:
        commit_and_continue(result)
    else:
        request_revision(result, reviews)
```

### 实际项目示例

假设你要开发一个 **Markdown 到 HTML 转换器**：

**Step 1: Brainstorming（设计阶段）**
Agent 会引导你明确：
- 支持的 Markdown 语法范围（GFM？表格？脚注？）
- 输出格式（纯 HTML？支持 CSS 框架？）
- 性能要求（大文件处理？流式转换？）

**Step 2: Writing Plans（计划阶段）**
生成的任务列表类似：
```
Task 1: 项目脚手架 + 解析器骨架（~5min）
Task 2: 内联语法解析：bold/italic/code（~8min）
Task 3: 块级语法解析：heading/codeblock/quote（~10min）
Task 4: GFM 扩展：表格/删除线（~12min）
Task 5: HTML 渲染器（~8min）
Task 6: 集成测试（~5min）
```

**Step 3: Subagent-Driven Development（执行阶段）**
每个任务由一个子 Agent 完成，主 Agent 做两级审查。

---

## 五、常见问题与解决方案

### 安装失败

**问题**：在 Claude Code 中执行 `/plugin install` 后报错「marketplace not found」。

**解决方案**：
- 确认 Claude Code 版本 ≥ 支持插件的版本（检查官方发行日志）
- 尝试先添加市场再安装：
  ```bash
  /plugin marketplace add obra/superpowers-marketplace
  ```

### Agent 没有激活技能

**问题**：安装后 Agent 仍然直接写代码，没有先提问。

**解决方案**：
- 确认插件已启用（部分平台需要手动启用已安装的插件）
- 尝试重启 Agent 会话
- 检查是否使用了多个 coding agent，Superpowers 需要**分别在每个 agent 中安装**

### 子 Agent 偏离计划

**问题**：子 Agent 在执行任务时修改了不相关的文件。

**解决方案**：
- 这是 `subagent-driven-development` 技能的两级审查要捕获的问题
- 如果审查未捕获，可以在 `writing-plans` 阶段将任务拆得更小、更精确
- 也可以在技能配置中加强约束（需修改技能 Markdown 文件）

### 测试驱动开发过于严格

**问题**：Agent 删除了我手写的功能代码（因为在测试之前写的）。

**解决方案**：
- 这是 TDD 技能的 intentional behavior（刻意设计的行为）
- 如果你希望保留现有代码，可以在对话中明确告诉 Agent：「这段代码是预先存在的，不是 Agent 写的，请保留并补测试」
- 或者，在非 TDD 场景下，可以临时禁用 `test-driven-development` 技能

---

## 六、总结

Superpowers 本质上是一套「**让 AI Agent 像优秀工程师一样思考**」的约束系统。它不依赖任何特定的模型能力，而是通过结构化的技能指令，将软件工程的最佳实践「编译」成 Agent 能理解和执行的自然语言步骤。

**最打动我的几点：**

1. **强制性优于建议性** —— 技能是「必须遵循」而不是「可以参考」，这确保了 Agent 行为的一致性，尤其在长会话中不会「忘记」流程。

2. **两级审查设计** —— 子 Agent 的输出先查「是否做对了事」（规格符合性），再查「是否做好了事」（代码质量），这个顺序很巧妙。

3. **平台无关** —— 通过 Markdown 技能文件 + 各平台插件机制实现，不绑定任何一家模型或 IDE。

对于经常使用 AI 编码助手的开发者，Superpowers 值得一试——它不会让 Agent 变得更「聪明」，但会让 Agent 变得更「专业」。

**相关链接：**
- 项目地址：https://github.com/obra/superpowers
- 发布公告：https://blog.fsck.com/2025/10/09/superpowers/
- Discord 社区：https://discord.gg/35wsABTejz
- Prime Radiant：https://primeradiant.com
