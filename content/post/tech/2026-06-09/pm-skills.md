---
title: "PM Skills Marketplace：为 AI 助手打造的产品经理技能包"
date: 2026-06-09
description: "PM Skills Marketplace 是一套面向产品经理的 AI 技能包，包含 68 个 PM 技能和 42 个链式工作流，覆盖发现、策略、执行、发布、增长等 9 大插件，兼容 Claude Code、Cowork、Codex CLI 等主流 AI 编程助手。"
author: "Cheman"
slug: pm-skills
draft: false
categories: ["开源", "AI工具"]
tags: ["GitHub", "开源", "产品经理", "AI", "Claude", "技能包"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**PM Skills Marketplace**，这是一套为 Claude Code、Cowork 等 AI 助手设计的产品经理技能包，将 Teresa Torres、Marty Cagan 等的产品方法论编码为 AI 可复用的技能和工作流。

## 一、项目概述

**PM Skills Marketplace** 是一个开源的 AI 技能市场，为产品经理提供结构化的 AI 工作流。与通用 AI 聊天不同，它将经过验证的 PM 框架（如 Continuous Discovery、Jobs to be Done、Lean Canvas 等）编码为可执行的技能（Skills）和命令（Commands）。

**核心数据：**
- 68 个 PM 技能（Skills）
- 42 个链式工作流（Commands）
- 9 个插件（Plugins）覆盖产品全生命周期

**项目解决的痛点：** 通用 AI 只能生成文本，而 PM Skills 赋予 AI 结构化的产品管理框架，让 AI 能够引导产品经理完成发现、策略、执行等标准化流程，而非仅仅输出非结构化的建议。

**兼容平台：**
- Claude Code（CLI）
- Claude Cowork（推荐非开发者使用）
- Codex CLI（OpenAI）
- Gemini CLI、OpenCode、Cursor、Kiro（仅技能，无命令）

## 二、技术原理

### 架构设计

项目采用 **插件化架构**，每个插件（Plugin）是一组相关技能和命令的集合：

```
pm-skills/
├── pm-product-discovery/     # 产品发现插件
│   ├── skills/               # 技能目录
│   │   ├── brainstorm-ideas-existing/SKILL.md
│   │   ├── identify-assumptions-existing/SKILL.md
│   │   └── ...
│   ├── commands/             # 命令目录
│   │   ├── discover.md
│   │   └── brainstorm.md
│   └── .claude-plugin/
│       └── plugin.json       # 插件清单
├── pm-product-strategy/      # 产品策略插件
└── ...
```

### 核心概念

**1. Skills（技能）**
- 独立的领域知识模块或分析框架
- 可被多个 Commands 共享
- 自动加载（当对话相关时）或强制加载（`/plugin-name:skill-name`）

**2. Commands（命令）**
- 用户触发的端到端工作流（通过 `/command-name` 调用）
- 链式调用多个 Skills
- 设计为客户旅程式流转（一个命令完成后建议下一个命令）

**3. Plugins（插件）**
- 相关 Skills 和 Commands 的可安装包
- 覆盖一个 PM 领域（如发现、策略、执行等）

### 技能文件格式

每个 Skill 使用 YAML frontmatter + Markdown 内容：

```markdown
---
name: identify-assumptions-existing
description: >
  识别现有产品的风险假设，覆盖 Value、Usability、Viability、Feasibility 四个维度。
triggers:
  - "风险假设"
  - "assumption mapping"
  - "假设映射"
---

# Identify Assumptions (Existing Product)

## Context
现有产品已有用户，假设围绕"新增功能或改进"展开...

## Framework
1. Value Assumptions（价值假设）
2. Usability Assumptions（可用性假设）
...
```

### 数据流

```
用户输入 → Claude Code/Cowork 读取 plugin.json
       ↓
    加载相关插件
       ↓
    用户调用 /command-name
       ↓
   命令链式调用多个 Skills
       ↓
   Skill 引导用户完成结构化流程
       ↓
   输出结构化产物（PRD、策略文档、OKRs 等）
```

## 三、安装与快速开始

### 方式一：Claude Cowork（推荐）

1. 打开 **Customize**（左下角）
2. 进入 **Browse plugins** → **Personal** → **+**
3. 选择 **Add marketplace from GitHub**
4. 输入：`phuryn/pm-skills`

安装完成后，所有 9 个插件会自动加载。

### 方式二：Claude Code（CLI）

```bash
# Step 1: 添加市场
claude plugin marketplace add phuryn/pm-skills

# Step 2: 安装插件（可选择部分安装）
claude plugin install pm-toolkit@pm-skills
claude plugin install pm-product-strategy@pm-skills
claude plugin install pm-product-discovery@pm-skills
# ... 安装其他插件
```

### 方式三：Codex CLI（OpenAI）

```bash
# Codex 读取与 Claude Code 相同的插件市场文件
codex plugin marketplace add phuryn/pm-skills
codex plugin add pm-toolkit@pm-skills
# ...
```

> **注意：** Codex 不支持 `/slash` 命令，需要通过自然语言描述工作流步骤。

### 快速验证

安装完成后，在 Claude Code 中测试：

```
/discover AI 驱动的会议总结工具，面向远程团队
```

Claude 会引导你完成：头脑风暴 → 假设识别 → 优先级排序 → 实验设计。

## 四、使用方法与实战

### 场景一：新产品发现

**目标：** 验证一个 AI 写作助手idea

```
/discover AI writing assistant for non-native English speakers
```

**执行流程：**
1. **头脑风暴想法**（`brainstorm-ideas-new` skill）
   - 多视角分析（PM、设计师、工程师）
   - 输出 5-8 个想法变体

2. **识别假设**（`identify-assumptions-new` skill）
   - 8 个风险类别：Value、Usability、Viability、Feasibility、GTM、Strategy、Team、Legal
   - 输出假设矩阵

3. **优先级排序**（`prioritize-assumptions` skill）
   - Impact × Risk 矩阵
   - 输出优先级列表和实验建议

4. **设计实验**（`brainstorm-experiments-new` skill）
   - 基于 Alberto Savoia 的 Pretotype 方法
   - 输出最小成本验证方案

### 场景二：编写 PRD

```
/write-prd 智能通知系统，减少告警疲劳
```

Claude 会引导你完成 8 个部分的 PRD 模板：
- 背景与问题陈述
- 目标与成功指标
- 用户故事
- 功能需求
- 非功能需求
- 发布标准
- 风险与缓解
- 时间线

### 场景三：制定产品策略

```
/strategy B2B 项目管理工具，面向创意机构
```

输出 9 节产品策略画布：
1. 产品愿景
2. 目标用户
3. 核心价值主张
4. 竞争定位
5. 商业模式
6. 盈利策略
7. 增长策略
8. 护城河
9. 风险评估

### 场景四：OKR 规划

```
/plan-okrs 我们的目标是提升企业版用户的留存率
```

Claude 会：
1. 定义公司级目标
2. 分解为团队级 OKRs
3. 确保对齐和可衡量性
4. 输出符合 INVEST 标准的 Key Results

## 五、常见问题与解决方案

### 问题 1：Claude Code 找不到安装的插件

**原因：** 插件未正确注册到 Claude Code 的插件市场。

**解决方案：**
```bash
# 检查市场是否已添加
claude plugin marketplace list

# 如果缺失，重新添加
claude plugin marketplace add phuryn/pm-skills

# 检查已安装的插件
claude plugin list
```

### 问题 2：Skills 不自动加载

**原因：** Claude 未能识别上下文触发。

**解决方案：**
- 使用强制加载语法：`/pm-product-discovery:identify-assumptions-existing`
- 或者简化：`/identify-assumptions-existing`（Claude 会自动添加前缀）

### 问题 3：Codex CLI 无法使用 `/slash` 命令

**原因：** Codex 插件不支持命令暴露（这是 Claude Code 的专属特性）。

**解决方案：**
- 使用自然语言描述工作流步骤
- 或者让 Codex 将常用命令转换为 Codex Skills：
  ```
  Read the command files in the pm-execution plugin and create 
  equivalent Codex skills for the workflows I use most often.
  ```

### 问题 4：Windows 上 Cowork 不稳定

**原因：** Claude Cowork 的 VM 服务未自动启动。

**解决方案：**
使用 PowerShell 创建计划任务监控服务（项目 README 中有完整脚本）：

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "..."
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 1) ...
Register-ScheduledTask -TaskName "CoworkVMServiceMonitor" ...
```

### 问题 5：如何只安装部分插件（而非全部 9 个）

**解决方案：**
```bash
# Claude Code
claude plugin install pm-toolkit@pm-skills  # 只安装工具包插件

# Codex CLI
codex plugin add pm-data-analytics@pm-skills  # 只安装数据分析插件
```

## 六、总结

**PM Skills Marketplace** 是一个非常有价值的开源项目，它填补了"通用 AI"和"结构化产品管理流程"之间的空白。通过将 Teresa Torres 的 Continuous Discovery、Marty Cagan 的 INSPIRED 方法论、Alberto Savoia 的 Pretotype 等经典框架编码为 AI 可执行的技能，它让产品经理能够：

1. **获得结构化的引导**，而非非结构化的文本生成
2. **复用经过验证的框架**，而非从零开始设计流程
3. **在多个 AI 平台间迁移**（Claude、Codex、Gemini 等）

**适用人群：**
- 希望用 AI 提升工作效率的产品经理
- 需要结构化产品方法论的初创团队
- 希望将产品流程标准化的组织

**项目亮点：**
- 完全开源（MIT License）
- 基于经典产品管理著作（Torres、Cagan、Savoia 等）
- 多平台兼容
- 持续更新（跟随 AI 能力和产品实践演进）

**GitHub 仓库：** [phuryn/pm-skills](https://github.com/phuryn/pm-skills)

如果你觉得这个项目对你有帮助，别忘了给个 ⭐！
