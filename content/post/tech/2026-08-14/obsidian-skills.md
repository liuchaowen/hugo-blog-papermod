---
title: "Obsidian Skills：让 AI Agent 原生理解你的笔记"
date: "2026-08-14"
description: "kepano 开源了一套基于 Agent Skills 规范的 Obsidian 工具包，包含 Markdown 编辑、Bases 查询、JSON Canvas 绘制等技能，让 Claude Code、Codex、OpenCode 等主流 AI Agent 都能原生理解 Obsidian 笔记语法，大幅提升 AI 辅助写作与知识管理的效率。"
author: "Cheman"
slug: obsidian-skills
draft: false
categories: ["技术", "开源", "AI"]
tags: ["Obsidian", "AI Agent", "GitHub", "知识管理", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Obsidian Skills**，它为 Obsidian 笔记生态引入了一套标准化的 AI Agent 技能体系，让主流 AI 编程工具（Claude Code、Codex、OpenCode）都能原生理解 Obsidian 的各种专有语法，堪称笔记界的"AI 插件市场"。

## 一、项目概述

Obsidian Skills 是由 kepano（Obsidian 前核心开发者）主导的开源项目，遵循 [Agent Skills Specification](https://agentskills.io/specification) 规范编写。该项目包含 5 个核心技能，覆盖 Obsidian 笔记编辑的各个场景：

| 技能名 | 描述 |
|--------|------|
| [obsidian-markdown](skills/obsidian-markdown) | 创建和编辑 Obsidian Flavored Markdown，支持 wikilinks、embeds、callouts、properties 等语法 |
| [obsidian-bases](skills/obsidian-bases) | 创建和编辑 Obsidian Bases，支持视图、过滤器、公式和汇总 |
| [json-canvas](skills/json-canvas) | 创建和编辑 JSON Canvas 文件，支持节点、边、分组和连接 |
| [obsidian-cli](skills/obsidian-cli) | 通过 Obsidian CLI 与笔记库交互，支持插件和主题开发 |
| [defuddle](skills/defuddle) | 使用 Defuddle 从网页提取干净 Markdown，去除干扰内容以节省 token |

这套技能体系的核心价值在于：**让 AI 真正读懂 Obsidian 的专有格式**，而不是把它当成普通 Markdown 处理。以往 AI 生成的内容往往缺乏对 `![[双向链接]]`、`> [!tip]` callouts、`property` 语法等的正确理解，现在这些问题从根本上得到了解决。

## 二、技术原理

### 2.1 Agent Skills 规范

项目基于 [agentskills.io](https://agentskills.io/specification) 规范，每个技能都是一个独立的 `SKILL.md` 文件，包含：

```markdown
---
name: obsidian-markdown
description: >
  Create and edit Obsidian Flavored Markdown (.md) with wikilinks,
  embeds, callouts, properties, and other Obsidian-specific syntax
---

# Obsidian Markdown Skill

## Overview
[技能使用说明和示例]

## Syntax Reference
[Obsidian 特有的语法规范]

## Examples
[代码示例]
```

这种基于 Markdown 的技能定义方式，天然具有很好的可读性和跨平台兼容性，任何支持 Markdown 的编辑器都可以阅读和编辑技能文件。

### 2.2 多 Agent 平台兼容

项目针对三大主流 AI Agent 平台提供了不同的集成方式：

**Claude Code** — 通过 `/.claude` 文件夹加载：
```bash
# 将 skills 内容复制到 Obsidian vault 的 .claude 目录
cp -r skills/ /path/to/vault/.claude/
```

**Codex** — 复制到 `~/.codex/skills`：
```bash
cp -r skills/ ~/.codex/skills/
```

**OpenCode** — 克隆到 `~/.opencode/skills/`：
```bash
git clone https://github.com/kepano/obsidian-skills.git \
    ~/.opencode/skills/obsidian-skills
```

OpenCode 最为优雅——它会自动扫描 `~/.opencode/skills/` 下所有 `SKILL.md` 文件，无需任何配置文件改动，重启后即可使用。

### 2.3 obsidian-markdown 技能详解

以最核心的 `obsidian-markdown` 技能为例，其 SKILL.md 定义了以下 Obsidian 特有语法：

**Callouts（提示块）**：
```
> [!note]
> 这是一个笔记提示块
```

**属性（Properties/YAML frontmatter）**：
```yaml
---
uid: 20240101
tags:
  - 笔记
  - AI
---

# 页面标题
```

**Wikilinks 和 Embeds**：
```
[[Obsidian 技巧]]           # 双向链接
![[另一条笔记]]             # 嵌入另一条笔记
![[另一条笔记#小节]]        # 嵌入特定小节
```

**属性表格**：
```yaml
属性:
  - 属性名:: 值
```

这些语法在普通 Markdown 工具中会直接显示为原始文本，但在 Obsidian 中会被正确渲染为高亮块、双向链接、嵌入内容等丰富形式。AI 学会识别这些语法后，生成的内容可以直接在 Obsidian 中原生渲染。

## 三、安装与快速开始

### 3.1 通过 Obsidian 插件安装（推荐）

Obsidian 官方已支持 Skills 插件：

```
/plugin marketplace add kepano/obsidian-skills
/plugin install obsidian@obsidian-skills
```

### 3.2 通过 npx 安装

```bash
npx skills add https://github.com/kepano/obsidian-skills
```

### 3.3 手动安装（以 OpenCode 为例）

```bash
# 克隆完整仓库（注意不要只复制 skills/ 子目录）
git clone https://github.com/kepano/obsidian-skills.git \
    ~/.opencode/skills/obsidian-skills

# 重启 OpenCode，技能自动生效
```

### 3.4 最简示例

安装完成后，在 Obsidian vault 中让 AI 助手帮你写笔记：

> **用户**：帮我创建一个关于 TypeScript 泛型的笔记，包含 wikilinks 链接到"类型系统"页面

AI 生成的笔记会直接包含正确的 `[[类型系统]]` 语法，在 Obsidian 中渲染为可点击的双向链接。

## 四、使用场景与实战

### 4.1 AI 辅助知识整理

传统 AI 写作工具生成的 Markdown 不支持 Obsidian 语法，复制到 Obsidian 后需要手动改格式。有了 Obsidian Skills，AI 可以直接：
- 生成带 callouts 的笔记：`> [!tip]`、 `> [!warning]`
- 正确使用 wikilinks 和 embeds
- 维护笔记属性（uid、tags、aliases）

### 4.2 插件开发辅助

通过 `obsidian-cli` 技能，AI 可以直接与 Obsidian vault 交互：
```bash
obsidian sync          # 同步笔记库
obsidian publish       # 发布笔记
obsidian plugin dev    # 插件开发
```

这意味着可以用自然语言指挥 AI 完成插件的创建、调试和测试。

### 4.3 从网页提取干净内容

`defuddle` 技能封装了同名工具，能从任意网页提取干净的 Markdown 内容，去除广告、导航栏、弹窗等干扰元素。结合 Obsidian 的 clipper 功能，可以高效构建个人知识库。

### 4.4 绘制可视化笔记

`json-canvas` 技能让 AI 能够生成 JSON Canvas 文件，实现笔记间的可视化连接：
```json
{
  "nodes": [
    { "id": "node1", "type": "text", "text": "核心概念" },
    { "id": "node2", "type": "text", "text": "相关笔记" }
  ],
  "edges": [
    { "id": "e1", "fromNode": "node1", "toNode": "node2" }
  ]
}
```

## 五、常见问题与解决方案

**Q：OpenCode 没有自动发现技能怎么办？**
A：确认克隆路径为 `~/.opencode/skills/obsidian-skills/skills/<skill-name>/SKILL.md`，不要只复制内层 `skills/` 目录。

**Q：Claude Code 提示找不到技能？**
A：检查 `.claude` 文件夹是否在 Obsidian vault 根目录下，并且权限正确。

**Q：Obsidian CLI 无法连接？**
A：确保 Obsidian 已开启 "Community Plugins" 并安装了对应的 CLI 插件，然后通过 `obsidian-cli` 技能中的配置进行连接。

**Q：生成的 callouts 没有正确渲染？**
A：确认 Obsidian 版本 >= 1.4.0，旧版本不支持 callouts 语法。

## 六、总结

Obsidian Skills 填补了 AI Agent 与 Obsidian 笔记生态之间的鸿沟。对于 Obsidian 重度用户而言，这意味着 AI 终于能"说 Obsidian 的话"了——双向链接、属性语法、callouts、Canvas 绘图等特性不再需要手动调整，AI 生成的内容可以直接在 Obsidian 中原生使用。如果你同时使用 Obsidian 和 AI 编程工具，这套技能库值得第一时间装上。
