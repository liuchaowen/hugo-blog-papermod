---
title: "Google Stitch Design Skills：用 Agent Skills 标准把设计稿变成可落地的生产代码"
date: 2026-07-11
description: "Google Labs 开源的 Stitch Design Skills 是一套遵循 Agent Skills 开放标准的技能与插件集合，面向 Google Stitch 设计平台，可让 Codex、Claude Code、Cursor 等编码智能体完成从设计生成、代码转换到视频走查的全流程，打通设计与工程之间的最后一公里。"
author: "Cheman"
slug: stitch-skills
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 设计工具, Google]
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

今天在 GitHub Trending 上看到一个有意思的项目：**google-labs-code/stitch-skills**，它把 Google Stitch 的设计能力封装成一套可复用的 Agent Skills，让编码智能体真正做到"设计即代码"。

## 一、项目概述

Stitch Design Skills 是 Google Labs 推出的一套面向 [Google Stitch](https://stitch.withgoogle.com) 的 Agent Skills 与插件集合，遵循 [Agent Skills](https://agentskills.io) 开放标准。它兼容 Codex、Antigravity、Gemini CLI、Claude Code、Cursor 等主流编码智能体，核心目标是把"设计"这一环节无缝接入智能体工作流。

项目本身并非一个独立应用，而是一个**技能分发仓库**。它把围绕 Stitch 的高频设计任务拆解为一组结构化的 Skill，并按职责划分为三大插件：

- **`stitch-design`**：核心设计工作流（生成、转化、上传、设计系统管理）
- **`stitch-build`**：从设计到代码的生成与构建（React / React Native / Remotion / shadcn-ui）
- **`stitch-utilities`**：设计辅助工具（提示词增强、规范生成、多页站点循环生成）

每个 Skill 都遵循统一的 Agent Skills 文件结构：

```text
skills/<skill-name>/
├── SKILL.md           — 智能体的"任务控制中心"
├── scripts/           — 可执行校验脚本（验证与网络）
├── resources/         — 知识库（检查清单与风格指南）
└── examples/          — 语法正确的"黄金标准"参考
```

## 二、技术原理

### Agent Skills 开放标准

整套体系建立在 Agent Skills 开放标准之上——每个能力都是一个自描述目录，其中 `SKILL.md` 是智能体理解"何时以及如何使用该技能"的入口，而 `scripts/`、`resources/`、`examples/` 则分别提供可执行约束、知识沉淀和范例，从而保证智能体调用时行为稳定、结果可验证。

### 三层插件架构与职责分离

```text
plugins/
├── stitch-design/          — 核心设计工作流
│   └── skills/
│       ├── code-to-design/      # 代码 → Stitch 设计
│       ├── generate-design/     # 文本/图片 → 设计稿
│       ├── manage-design-system/# 设计系统管理
│       ├── extract-design-md/   # 从源码提取 DESIGN.md
│       ├── extract-static-html/ # 提取静态 HTML 快照
│       └── upload-to-stitch/    # 本地资源上传 Stitch
├── stitch-build/           — 代码生成与构建
│   └── skills/
│       ├── react-components/    # Stitch → React 组件系统
│       ├── react-native/        # Stitch → React Native
│       ├── remotion/            # 生成走查视频
│       └── shadcn-ui/           # shadcn/ui 集成
└── stitch-utilities/       — 设计辅助工具
    └── skills/
        ├── design-md/           # 生成 DESIGN.md
        ├── enhance-prompt/      # 提示词增强
        ├── stitch-loop/         # 单提示词生成多页站点
        └── taste-design/        # 生成"反模板感"高级规范
```

### 数据流向：从设计到生产代码

典型工作流是一个闭环：用户用 `generate-design` 从文本/图片生成屏幕，或用 `code-to-design` 把现有前端代码回灌为 Stitch 设计；再通过 `manage-design-system` 套用统一设计系统；最后由 `stitch-build` 下的 `react-components` / `react-native` 将设计稿转换为带设计令牌（design token）一致性的生产组件。整个链路依赖 **Stitch MCP 服务**在智能体环境中运行，实现设计数据与代码之间的双向同步（如 `sync` 到 Stitch 项目的最新变更）。

## 三、安装与快速开始

### 环境要求

- 一个支持插件的编码智能体（Codex / Claude Code / Cursor 等）
- 已配置并运行 **Stitch MCP Server**（参考 [Stitch MCP Setup](https://stitch.withgoogle.com/docs/mcp/setup/)）
- `npx` 环境（用于 `plugins` / `skills` CLI）

### 方式一：安装整组插件（推荐）

以 Codex 为例，添加市场并按需稀疏检出：

```bash
codex plugin marketplace add google-labs-code/stitch-skills --ref main \
  --sparse .agents/plugins \
  --sparse plugins/stitch-design \
  --sparse plugins/stitch-build \
  --sparse plugins/stitch-utilities
```

Claude Code 与 Cursor 则通过 `npx` 安装到当前项目/工作区：

```bash
# Claude Code
npx plugins add google-labs-code/stitch-skills --scope project --target claude-code

# Cursor
npx plugins add google-labs-code/stitch-skills --scope workspace --target cursor
```

### 方式二：按需安装单个 Skill

```bash
npx skills add google-labs-code/stitch-skills
```

> ⚠️ 注意：Skill 之间存在依赖关系，选择性安装时需确保包含其全部依赖。

## 四、使用方法与实战

**从零生成设计稿**

> "为一个约会灵感 App 做一个浏览页。"

智能体会调用 `stitch::generate-design` 在 Stitch 中生成屏幕，并支持编辑与变体生成（如"生成 3 个深色高密度首页变体"）。

**现有代码回灌设计**

> "把 `/path/to/dashboard` 的前端代码上传到名为 'Dashboard-Migration-2026' 的 Stitch 项目。"

这会走 `code-to-design` 流程：HTML 提取 + 设计系统对齐 + 上传。

**设计转生产组件**

> "把 Stitch 项目 `projects/123` 的所有屏幕转换为 React 组件，并保证设计令牌一致性。"

`stitch::react-components` 会产出带自动校验的 React 组件系统；`stitch::react-native` 则面向移动端生成带 StyleSheet 与平台适配的组件。

**快速走查视频**

> "为 Stitch 项目 `projects/456` 生成一段走查视频。"

`remotion` 会基于设计稿用 Remotion 渲染带平滑过渡与缩放的演示视频。

## 五、常见问题与解决方案

**安装后技能不生效？**
确认已按 [Stitch MCP Setup](https://stitch.withgoogle.com/docs/mcp/setup/) 注册并启动 Stitch MCP Server，且配置好环境变量与凭证——这是所有 Skill 运行的前置依赖。

**选择性安装后报错缺失依赖？**
Stitch Design Skills 存在相互依赖，请使用 `npx skills --help` 查看依赖说明，确保安装时包含所需依赖，或改用插件整组安装。

**克隆仓库太慢？**
在 Codex 中使用 `--sparse` 参数仅检出所需路径（如 `plugins/stitch-design`），可显著加快 clone 速度；省略则拉取全量仓库。

**生成结果"模板感"重？**
可调用 `stitch::taste-design` 生成强制执行高级排版与色彩校准的 DESIGN.md，从规范层面抑制千篇一律的通用 UI。

## 六、总结

`stitch-skills` 的价值在于用**开放标准 + 插件化**的方式，把 Google Stitch 的设计能力标准化为智能体可直接调用的技能，覆盖"生成设计 → 管理设计系统 → 导出生产代码 → 产出走查视频"的完整链路。对希望在 AI 工作流中打通设计与工程、减少"设计稿到代码"割裂的团队来说，是一套值得关注的官方实验性工具集。

> 注：该项目为 Google 实验性项目，非官方支持产品，也不适用于 Google 开源漏洞奖励计划。
