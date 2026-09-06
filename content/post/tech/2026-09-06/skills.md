---
title: "openai/skills：Agent Skills 官方技能库，从入门到迁移 Plugins"
date: 2026-09-06T23:05:00+08:00
description: "openai/skills 是 OpenAI 官方的 Agent Skills 技能仓库，定义了 AI Agent 可发现、可复用的能力封装格式，Codex 通过 system/curated/experimental 三级目录与 $skill-installer 安装技能。仓库现已弃用并迁移至 openai/plugins，本文详解其结构、用法与迁移路径。"
author: "Cheman"
draft: false
tags: ["GitHub", "OpenAI", "Codex", "AI Agent", "技能"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**openai/skills**，这是 OpenAI 官方的 Agent Skills 技能目录仓库，用于为 Codex 等 AI Agent 打包可复用的能力，不过仓库头部已挂出弃用声明，正在向 openai/plugins 迁移。

## 一、项目概述

openai/skills 解决的核心问题是：**如何把"一次性提示词"升级为"可复用、可分发的能力包"**。它提出的 Agent Skills 格式，本质上是"文件夹 = 一个技能"——文件夹里装着指令、脚本和资源，AI Agent 可以在需要时自行发现并使用，从而实现"写一次、处处用"（Write once, use everywhere）。

仓库本身是 Codex 的技能目录（catalog），按成熟度分为三档：

- **`.system`**：随最新版 Codex 自动内置安装，开箱即用；
- **`.curated`**：官方精选技能，按名称即可安装；
- **`.experimental`**：实验性技能，需要指定技能目录或 GitHub 目录 URL 安装。

> ⚠️ **重要提示**：仓库 README 顶部明确标注 **This repository is deprecated**。当前 Codex 的 skill 与 plugin 示例已迁移到 [openai/plugins](https://github.com/openai/plugins)；如需为 Codex 编写自定义技能，官方指引也移到了 [Build plugins](https://developers.openai.com/codex/plugins/build) 文档（其中包含创建纯技能（skill-only）插件的说明）。因此阅读本仓库时，建议把它当作"Agent Skills 概念的起源与格式参考"，新项目直接基于 Plugins 仓库。

## 二、技术原理

### 2.1 Agent Skills 的封装模型

一个技能就是一个普通文件夹，内部可包含：

```text
my-skill/
├── SKILL.md          # 技能的说明文档：何时触发、如何使用
├── scripts/          # 可执行脚本
└── resources/        # 参考资源、模板等
```

这套设计的关键在于"**可发现性（discoverability）**"：技能不依赖用户手动记得加载，而是由 Agent 在任务上下文中自主发现匹配的技能并调用。目录结构即元数据，无需额外的注册中心。

### 2.2 目录分级与安装机制

仓库通过目录层级表达技能的"信任与成熟度"：

| 目录 | 定位 | 安装方式 |
|------|------|----------|
| `skills/.system` | 系统级，官方维护 | Codex 最新版自动安装 |
| `skills/.curated` | 精选技能 | `$skill-installer <名称>`，默认从该目录取 |
| `skills/.experimental` | 实验技能 | 需指定文件夹名或 GitHub 目录 URL |

`$skill-installer` 是 Codex 内置的安装命令，它支持三种寻址方式：按名称（默认 `.curated`）、按实验目录名、按 GitHub 目录 URL——把"技能分发"做成了类似包管理器的人机对话体验。

### 2.3 开放标准与生态

仓库文档同时指向 [agentskills.io](https://agentskills.io)（Agent Skills 开放标准）和 Codex 官方文档中的 using / create-skill 指南。这种"目录仓库 + 开放标准 + 内置安装器"的组合，让技能格式得以跨工具传播——如今 SKILL.md 式的技能封装已被大量 AI 编程与 Agent 工具采纳，本仓库正是这一形态的早期范本之一。

## 三、安装与快速开始

**环境要求**：安装了最新版 Codex 的开发环境即可，`skills/.system` 中的技能无需手动安装。

**安装精选技能**（按名称，默认从 `.curated` 拉取）：

```text
$skill-installer gh-address-comments
```

**安装实验性技能**（指定文件夹名）：

```text
$skill-installer install the create-plan skill from the .experimental folder
```

**或直接给目录 URL**：

```text
$skill-installer install https://github.com/openai/skills/tree/main/skills/.experimental/create-plan
```

安装完成后，**重启 Codex** 以加载新技能。

## 四、使用方法与实战

### 4.1 自定义技能的三种来源

- **直接用官方仓库**：`.system` 技能零配置生效，适合官方最佳实践场景；
- **按需安装精选/实验技能**：适合验证某个工作流（如代码评审、计划生成）是否适合自己；
- **自建技能**：参照官方 [create-skill](https://developers.openai.com/codex/skills/create-skill) 文档，按"说明 + 脚本 + 资源"的目录结构组织，License 按需放入技能目录内的 `LICENSE.txt`。

### 4.2 迁移到 Plugins 时代的建议

由于仓库已弃用，新项目应遵循：

1. **找示例**：前往 [openai/plugins](https://github.com/openai/plugins) 获取最新的 Codex skill 与 plugin 示例；
2. **自建技能**：阅读 [Build plugins](https://developers.openai.com/codex/plugins/build) 指南，其中包含 skill-only 插件的创建步骤；
3. **沿用格式思维**：无论叫 skill 还是 plugin，"指令 + 脚本 + 资源"的文件夹封装思想仍然成立，迁移成本主要是目录约定与清单（manifest）格式的调整。

## 五、常见问题与解决方案

**Q1：仓库显示 deprecated，还能用 `$skill-installer` 安装里面的技能吗？**
能用，但官方不再更新。长期维护建议迁移到 openai/plugins 或自建技能仓库。

**Q2：安装后 Codex 提示找不到技能？**
技能安装后需要**重启 Codex** 才会被扫描加载；若仍无效，确认使用的是最新版 Codex（`.system` 技能依赖版本内置）。

**Q3：`$skill-installer` 按名称安装失败？**
按名称安装默认只从 `skills/.curated` 查找。实验性技能必须指定文件夹名或提供完整的 GitHub 目录 URL。

**Q4：技能可以商用或修改吗？**
每个技能目录内自带 `LICENSE.txt`，使用前以该技能自身的许可证为准——这也是"技能内嵌许可证"这一设计的原因。

**Q5：`.system` 技能能卸载吗？**
官方设计为随版本内置，一般不建议卸载；如确需禁用可关注 Codex 的配置项，或改用自定义技能目录自行管理。

## 六、总结

openai/skills 的价值不在于它本身还能用多久，而在于它**定义了 Agent Skills 的封装与分发范式**：文件夹即技能、按成熟度分级、内置安装器、开放标准跟进。即便仓库现已弃用并迁移到 openai/plugins，这套"写一次、处处用"的思维已经沉淀为 AI Agent 生态的通用语言。对于开发者，值得做的不是继续依赖这个仓库，而是理解其设计哲学，然后到 Plugins 时代的新仓库里继续实践。
