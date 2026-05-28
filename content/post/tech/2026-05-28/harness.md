---
title: "Harness：让 Claude Code 秒变多智能体协作工厂"
date: 2026-05-28
draft: false
categories: ["AI 编程", "开源工具"]
tags: ["Claude Code", "AI Agent", "多智能体", "自动化", "LLM"]
description: ""
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

**Harness** 是 revfactory 团队开源的 Claude Code 插件（Marketplace ID: `harness-marketplace`），它的核心定位是 **"Team-Architecture Factory"（智能体团队架构工厂）**。只需对 Claude Code 说一句「build a harness for this project」，它就能自动分析你的领域描述，把复杂任务分解为一组协调工作的专业智能体（Agent），并为它们生成配套的 Skills。

Harness 站在 Claude Code 生态的 **L3 Meta-Factory 层**，与同为 L3 的 [Archon](https://github.com/coleam00/Archon)（运行时配置工厂）属于相邻子层——Archon 生成确定性运行时配置，Harness 生成智能体团队架构，两者可以组合使用。

### 核心特性

- **6 种架构模式**：Pipeline（流水线）、Fan-out/Fan-in（并行分发）、Expert Pool（专家池）、Producer-Reviewer（生产-评审）、Supervisor（主管）、Hierarchical Delegation（层级委托）
- **Skill 自动生成**：基于渐进式披露（Progressive Disclosure）理念，自动生成包含主文件和引用的 Skills
- **团队协作编排**：智能体间消息传递、错误处理与协调协议
- **验证与测试**：触发验证、灰度测试、有无 Skill 对比实验

---

## 二、技术原理

### 2.1 架构分层与定位

Harness 的设计哲学遵循 Claude Code 生态的分层模型：

| 层级 | 定位 | 代表项目 |
|------|------|---------|
| L1 — 基础 | 单任务执行 | Claude Code 原生能力 |
| L2 — 跨 Harness | 跨工作流的标准化 | [ECC](https://github.com/affaan-m/everything-claude-code) |
| **L3 — Meta-Factory** | **生成其他 Harness 的工厂** | **Harness / Archon** |
| L4 — 生态协作 | 跨运行时协同 | meta-harness（Codex 移植版） |

Harness 专注文本到团队架构的转换，而不像 LangGraph 那样依赖状态图进行长时间运行的流程编排——它追求的是 Claude Code 原生、快速、即时生效的团队设计体验。

### 2.2 六种架构模式解析

每种模式对应不同的任务协调策略：

**Pipeline（流水线）**
适合顺序依赖任务——上一个智能体的输出是下一个的输入。比如：需求分析 → 代码生成 → 单元测试 → 文档撰写。

**Fan-out/Fan-in（并行分发）**
适合可并行分解的独立子任务。Supervisor 把任务分发到 N 个 Worker，等所有结果汇总后做最终整合。适合代码审查、性能分析、安全扫描等独立检查项。

**Expert Pool（专家池）**
动态选择最合适的专家智能体处理特定输入，无需固定顺序。适合多领域咨询类任务。

**Producer-Reviewer（生产-评审）**
最经典的 LLM 协作范式——Producer 生成内容，Reviewer 负责质量把关，形成自我改进循环。

**Supervisor（主管）**
中央协调者负责动态分发任务、监控进度、处理异常，适合复杂多阶段项目。

**Hierarchical Delegation（层级委托）**
上级智能体将任务递归委托给下级，下级还可以继续细分，适合大型复杂系统设计。

### 2.3 生成流程：从描述到可用团队

Harness 的执行分为 6 个阶段：

```
Phase 1: Domain Analysis（领域分析）
Phase 2: Team Architecture Design（团队架构设计，选择模式）
Phase 3: Agent Definition Generation（生成 .claude/agents/*.md）
Phase 4: Skill Generation（生成 .claude/skills/*/SKILL.md）
Phase 5: Integration & Orchestration（集成与编排配置）
Phase 6: Validation & Testing（验证与测试）
```

生成产物示例：

```text
your-project/
├── .claude/
│   ├── agents/
│   │   ├── analyst.md    # 分析智能体定义
│   │   ├── builder.md    # 构建智能体定义
│   │   └── qa.md         # QA 智能体定义
│   └── skills/
│       ├── analyze/
│       │   └── SKILL.md
│       └── build/
│           ├── SKILL.md
│           └── references/
```

### 2.4 性能数据

作者在 [claude-code-harness](https://github.com/revfactory/claude-code-harness) 仓库中进行了严格对照实验，覆盖 15 个软件工程任务：

| 指标 | 无 Harness | 有 Harness | 提升幅度 |
|------|:---------:|:---------:|:--------:|
| 平均质量得分 | 49.5 | 79.3 | **+60%** |
| 胜率（赢取无 Harness 基准） | — | 15/15 | **100%** |
| 输出方差 | — | — | **-32%** |

更值得关注的是：任务难度越高，Harness 提升越显著（Basic +23.8 → Advanced +29.6 → Expert +36.2），说明它尤其擅长处理复杂任务。

---

## 三、安装与快速开始

### 3.1 环境要求

- Claude Code 已安装并可运行
- 开启 Agent Teams 实验性功能：

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### 3.2 安装方式

**方式一：通过 Marketplace（推荐）**

```shell
# 添加 marketplace
/plugin marketplace add revfactory/harness

# 安装插件
/plugin install harness@harness-marketplace
```

**方式二：直接安装为全局 Skill**

```shell
cp -r skills/harness ~/.claude/skills/harness
```

### 3.3 最简运行示例

在 Claude Code 中，直接输入自然语言触发：

```
build a harness for deep research. I need an agent team that can investigate
any topic from multiple angles — web search, academic sources, community
sentiment — then cross-validate findings and produce a comprehensive report.
```

Harness 会自动分析领域 → 选择团队模式（Expert Pool + Producer-Reviewer）→ 生成 Agent 定义和 Skills → 输出可直接使用的配置文件。

---

## 四、使用方法与实战

### 4.1 典型应用场景

Harness 官网给出了 8 个开箱即用的提示词模板：

**全栈网站开发**

```
Build a harness for full-stack website development. The team should handle
design, frontend (React/Next.js), backend (API), and QA testing in a
coordinated pipeline from wireframe to deployment.
```

这会生成一个 Pipeline 架构：Designer → Frontend Dev → Backend Dev → QA Tester，由一个 Supervisor 协调整体流程。

**代码审查与重构**

```
Build a harness for comprehensive code review. I want parallel agents
checking architecture, security vulnerabilities, performance bottlenecks,
and code style — then merging all findings into a single report.
```

生成 Fan-out/Fan-in 架构：Review Supervisor 分发 4 个并行检查智能体（架构/安全/性能/风格），汇总后生成综合报告。

**技术文档自动生成**

```
Build a harness that generates API documentation from this codebase.
Agents should analyze endpoints, write descriptions, generate usage
examples, and review for completeness.
```

### 4.2 两种执行模式

| 模式 | 实现方式 | 适用场景 |
|------|---------|---------|
| **Agent Teams**（默认） | TeamCreate + SendMessage + TaskCreate | 2+ 智能体需要协作通信 |
| **Subagents** | 直接 Agent 工具调用 | 一次性任务，无智能体间通信需求 |

### 4.3 与生态邻居的协作

Harness 不孤立存在——它是 Claude Code 生态的一个层次，可与其他工具组合：

- **Harness + Archon**：用 Harness 设计架构，用 Archon 配置运行时（设计×部署）
- **Harness + wshobson/agents**：从 agent 目录中选取可用智能体作为团队成员
- **Harness + ECC**：Harness 生成的多个 Harness 通过 ECC 标准化技能和规则

---

## 五、常见问题与解决方案

**Q1：Harness 对所有任务都有提升吗？**
A：根据实验数据，简单任务提升较小（约 +23.8），复杂任务提升显著（Expert 级 +36.2）。基础 CRUD 类任务不建议使用，反而增加开销。

**Q2：生成的智能体团队会超出 Claude Code 的上下文限制吗？**
A：Harness 的 Skill 生成使用渐进式披露（Progressive Disclosure），主 SKILL.md 文件保持精简，详细参考文档作为独立引用文件，按需加载，降低上下文压力。

**Q3：如何自定义生成的 Agent 行为？**
A：直接编辑生成的 `.claude/agents/*.md` 文件，调整 system prompt 和工具权限。Harness 生成的只是起点，可以无限迭代定制。

**Q4：能否生成非英文的智能体？**
A：支持韩语（한국어）和日语（日本語）触发，Marketplace 页面有多语言 README。

---

## 六、总结

Harness 将 Claude Code 从单一智能体升级为可编排的多智能体团队协作平台，通过 6 种预定义架构模式把复杂任务的分解过程自动化。对于需要处理复杂软件工程任务的团队，它的 +60% 质量提升和 100% 胜率数据值得关注。如果你已在用 Claude Code，Harness 是目前最轻量、最原生的团队协作扩展方案——只需一句话，就能拥有一支完整的 AI 专家团队。