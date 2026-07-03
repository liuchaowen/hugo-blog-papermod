---
title: "Agent Skills：给 AI Agent 装上可插拔的技能卡"
date: "2026-07-03"
description: "Agent Skills 是一个轻量级的开放标准，通过 SKILL.md 文件为 AI Agent 打包专业知识和工作流程，使其获得领域专长、复用跨产品技能。让 Agent 从通用走向专业化，像搭积木一样扩展能力边界。"
author: "Cheman"
slug: agentskills
draft: false
categories: ["AI", "开源", "技术"]
tags: ["AI Agent", "Agent Skills", "Anthropic", "SKILL.md", "插件系统"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Agent Skills**，一个让 AI Agent 获得可插拔专业能力的开放标准。它将技能封装为包含 `SKILL.md` 的文件夹，Agent 按需加载，实现了知识与工具的模块化复用。

## 一、项目概述

**Agent Skills** 起源于 Anthropic，最初是给 Claude 等 AI Agent 扩展能力的一种规范，现已演进为开放的行业标准。其核心理念很简单：**技能即文件夹，SKILL.md 即能力说明**。

一个标准 Skill 的结构如下：

```
my-skill/
├── SKILL.md          # 必选：元数据 + 操作指令
├── scripts/          # 可选：可执行代码
├── references/       # 可选：参考资料
├── assets/           # 可选：模板、资源
└── ...
```

该格式已被众多 AI 工具和 Agent 客户端支持，包括 OpenClaw、Claude Code 等。这意味着你在一个平台编写的 Skill，可以无缝迁移到另一个平台使用。

**Agent Skills 解决的核心问题：**
- **领域专长缺失**：通用 Agent 缺乏垂直行业的专业知识，Skill 将专家知识打包成可复用的指令集
- **工作流不一致**：将多步骤任务固化为标准流程，保证执行的一致性和可审计性
- **跨产品复用难**：Skill 以文件夹为单位版本化管理，一次编写，任意兼容平台加载

## 二、技术原理

### 渐进式披露（Progressive Disclosure）

Agent Skills 的加载机制采用**渐进式披露**策略，分三阶段进行：

**1. Discovery（发现阶段）**
Agent 启动时只加载每个 Skill 的 `name` 和 `description`，无需读取完整内容就知道什么时候该调用哪个 Skill。这个阶段上下文占用极小。

**2. Activation（激活阶段）**
当任务描述匹配某个 Skill 的 `description` 时，Agent 读取完整的 `SKILL.md` 内容，将其加载到当前对话上下文中。此时 Skill 的所有指令、脚本路径、参考资料路径均可被访问。

**3. Execution（执行阶段）**
Agent 遵循 `SKILL.md` 中的指令执行任务，必要时调用 `scripts/` 目录下的脚本或读取 `references/` 中的参考文档。

这一机制背后的设计哲学是：**不要让 Agent 记住所有技能，只需让它知道"技能在哪里、需要时能获取"**。

### SKILL.md 规范

`SKILL.md` 是 Skill 的核心，至少包含以下字段：

```markdown
---
name: skill-name
description: 技能描述（用于 Agent 匹配）
---

# 技能名称

## 触发条件
什么情况下调用此技能？

## 操作步骤
1. 第一步
2. 第二步
...

## 注意事项
常见陷阱和最佳实践
```

Anthropic 官方在 [GitHub/anthropics/skills](https://github.com/anthropics/skills) 仓库中提供了大量示例 Skill，涵盖代码审查、文档生成、数据分析等多个领域。

### 多客户端支持

Agent Skills 的客户端列表（[agentskills.io/clients](https://agentskills.io/clients)）涵盖了主流的 AI 工具。这种开放性是该标准最重要的竞争优势——它不依附于任何单一厂商，而是以协作文档和开放规范为核心，形成生态系统。

## 三、安装与快速开始

### 环境要求

- 支持 SKILL.md 解析的 AI Agent 客户端（如 OpenClaw、Claude Code 等）
- 可选：`scripts/` 目录下脚本所需的运行时环境（Node.js、Python3 等）

### 创建你的第一个 Skill

**Step 1：** 在 Skill 目录下创建文件夹

```bash
mkdir -p ~/my-first-skill
```

**Step 2：** 创建 `SKILL.md`

```markdown
---
name: code-review
description: 对提交代码进行系统性审查，输出结构化评审意见
---

# 代码审查技能

## 触发条件
用户发送代码片段、PR 链接或仓库地址并要求"review"或"审查"。

## 审查流程

### 1. 理解代码意图
- 阅读代码整体结构
- 确认核心逻辑和数据流

### 2. 质量检查
- 检查命名规范
- 检查是否有潜在 bug（空指针、内存泄漏、并发问题）
- 检查错误处理是否完善

### 3. 输出评审报告
按以下格式输出：
```
## ✅ 优点
- ...

## ⚠️ 改进建议
- ...

## 🔴 严重问题
- ...
```
```

**Step 3：** 在 Agent 客户端中加载

将 Skill 文件夹路径注册到 Agent 客户端配置中，即可开始使用。

## 四、使用方法与进阶

### 基础用法

最直接的使用方式是将专业领域的标准操作流程打包成 Skill。例如法律团队可以将合同审查流程写成 Skill，产品团队可以将需求分析流程写成 Skill。

### 进阶：带脚本的 Skill

Skill 不仅仅是文本指令，还可以嵌入可执行脚本：

```
legal-review/
├── SKILL.md
├── scripts/
│   ├── extract_clauses.py   # 从 PDF 提取合同条款
│   └── check_compliance.sh  # 合规性检查
└── references/
    └── clause_templates.md  # 条款模板参考
```

Agent 在执行过程中可调用这些脚本，实现**指令 + 代码**的混合能力扩展。

### Skill 组合

多个 Skill 可以协同工作，形成更复杂的 Agent 工作流。例如：

- `research-skill` → 收集行业信息
- `write-outline-skill` → 生成文章大纲
- `write-article-skill` → 撰写完整文章

这三个 Skill 组合在一起，就构成了一个完整的 AI 写作流水线。

## 五、常见问题与解决方案

**Q1：Skill 的 `description` 应该如何写才能被准确触发？**
A：`description` 应当描述**使用场景**而非功能列表。例如 "帮我写合同" 而非 "合同生成器"。Agent 通过自然语言匹配来决定是否激活 Skill，场景化的描述更易被触发。

**Q2：一个 Skill 太大，超过了 Agent 的上下文限制怎么办？**
A：将 Skill 拆分为多个子 Skill，通过渐进式激活来使用。另外，`references/` 目录下的文档不会直接加载到上下文中，只有执行时按需读取，不会占用上下文空间。

**Q3：不同客户端的 Skill 格式不完全兼容怎么办？**
A：Anthropic 维护的 [Agent Skills 规范](https://agentskills.io/specification) 是参考标准，各客户端应尽量遵循。当前主流客户端的兼容性较好，建议在选用前查阅客户端的 Skill 支持说明。

**Q4：如何管理 Skill 的版本？**
A：由于 Skill 本质上是文件夹，推荐使用 Git 进行版本管理。将 Skill 仓库化，每次更新通过 PR 审查，可以保证 Skill 质量并追踪变更历史。

## 六、总结

**Agent Skills** 代表了一种 AI 能力扩展的新范式：从"把所有知识塞进模型"转向"把知识存在外部，按需加载"。这种解耦思路让专业知识的积累不再依赖于模型重训练，而是通过 Skill 的编写、分享和复用来完成。

对于个人用户，它可以让你把重复性的复杂任务固化为可信赖的 Skill；对于团队，它可以沉淀集体智慧，形成组织级的 AI 工作流。标准是开放的，生态是丰富的——这是 Agent Skills 最值得关注的地方。

如果你有想让 AI 完成的特定任务，不妨先思考：**能否把它写成一份 SKILL.md？**

---

> 项目地址：[https://github.com/agentskills/agentskills](https://github.com/agentskills/agentskills)  
> 官方网站：[https://agentskills.io](https://agentskills.io)
