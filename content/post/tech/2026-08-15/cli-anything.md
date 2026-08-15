---
title: "CLI-Anything：一行命令让任何软件变成 AI Agent 原生工具"
date: 2026-08-15
description: "HKUDS 出品的 CLI-Anything 用一条命令把任何带代码库的软件自动改造成 Agent 可驱动的命令行工具，通过七阶段流水线生成带 REPL、JSON 输出与完整测试的 Click CLI，并已覆盖 GIMP、Blender、LibreOffice 等 18+ 专业软件，2,461 项测试全部通过。"
author: "Cheman"
slug: cli-anything
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI Agent, CLI, 自动化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**HKUDS/CLI-Anything**，它的主张很直白——"今天软件服务人类，明天的用户是 Agent"，而它要做的就是一行命令把世界上任何软件都变成 AI 智能体可以直接调用的工具。

## 一、项目概述

CLI-Anything 是一个"让任意软件变得 Agent-native（智能体原生）"的方法论与工具集。它核心回答了一个长期痛点：**AI Agent 擅长推理，却不擅长操作真实的专业软件**。现有的解法要么是基于 UI 的截图+RPA 自动化（极其脆弱），要么是受限于官方 API（覆盖不到 90% 的功能），要么是重新实现一遍（丢失大量能力）。

CLI-Anything 的做法是：**给一个软件代码库或仓库地址，它就自动生成一套完整的命令行工具（CLI harness）**，让 Agent 通过结构化的文本命令，直接驱动真实的后端软件完成渲染、转换、编辑等任务——既不截图、也不重新造轮子。

项目目前已经在 GitHub 上开源（Apache 2.0），并附带一篇技术报告（arXiv:2606.03854）。它最大的底气来自一组数字：**覆盖 18+ 类专业软件、累计 2,461 项测试、100% 通过率**。被改造的软件清单里既有 GIMP、Blender、Inkscape、Audacity、Kdenlive 这类创意工具，也有 LibreOffice、OBS、Zoom、Ollama、ComfyUI、QGIS 等生产力与 AI 工具。

其核心特性可以概括为五点：

- **真实软件集成**：CLI 生成的是合法的项目文件（ODF、MLT XML、SVG 等），再委派给真实应用去渲染，而不是用 Pillow 假装 GIMP、用自写渲染器假装 Blender。
- **双交互模型**：每个 CLI 同时支持"有状态的 REPL"和"子命令脚本模式"，裸命令直接进 REPL。
- **一致的体验**：所有生成 CLI 共享统一的 REPL 外观（`repl_skin.py`），带品牌横幅、进度条、命令历史。
- **Agent 原生设计**：每个命令内置 `--json` 开关输出结构化数据，人类可读的表格则用于交互调试；Agent 通过标准 `--help` 与 `which` 自行发现能力。
- **零妥协依赖**：真实软件是硬要求，后端缺失时测试会直接失败而非跳过，确保能力真实可用。

## 二、技术原理

### 七阶段自动化流水线

CLI-Anything 把"从代码库到可发布 CLI"的全过程封装成一条命令 `/cli-anything <path-or-repo>`，背后是七阶段流水线：

1. **分析（Analyze）**——扫描源码，把 GUI 操作映射到底层 API；
2. **设计（Design）**——规划命令分组、状态模型、输出格式；
3. **实现（Implement）**——用 Python Click 构建 CLI，包含 REPL、JSON 输出、撤销/重做；
4. **规划测试（Plan Tests）**——生成 `TEST.md`，列出单元 + E2E 测试计划；
5. **写测试（Write Tests）**——实现完整测试套件；
6. **文档（Document）**——回填测试结果到 `TEST.md`；
7. **发布（Publish）**——生成 `setup.py` 并安装到 PATH。

它还提供 `/cli-anything:refine`（基于差距分析扩展覆盖）、`/cli-anything:test`、`/cli-anything:validate`（对照 `HARNESS.md` 规范校验）等辅助命令，整个方法论的"单一事实来源"就是仓库里的 `HARNESS.md` 这份 SOP。

### 架构：把"结构化接口"建到软件之上，而非替换它

设计原则里最重要的一句话是：**We build structured interfaces TO software, not replacements（我们构建"通往软件的结构化接口"，而不是替代品）**。典型的数据流是：

```
Agent 输入命令
   ↓
CLI 解析参数，生成合法的项目文件（ODF / MLT XML / SVG / MSCX…）
   ↓
委派真实后端执行（libreoffice --headless / blender --background / melt / sox…）
   ↓
读取真实产物，校验（magic bytes、ZIP 结构、像素分析、音频 RMS、时长）
   ↓
输出 JSON 或人类可读结果
```

这种"生成项目文件 → 调用真实引擎渲染"的模式，规避了 GUI 应用的一个经典坑——**渲染鸿沟（Rendering Gap）**：GUI 软件的效果是在渲染时才应用的，如果你的 CLI 只是改了工程文件却用了一个朴素导出工具，滤镜和特效会被静默丢弃。CLI-Anything 的解法是：原生渲染器 → 滤镜翻译 → 渲染脚本。

`HARNESS.md` 还总结了几条"血泪经验"：

- **永远用真软件**：CLI 必须调真实应用做渲染，绝不用替代品；
- **滤镜翻译**：在格式间映射效果（如 MLT → ffmpeg）时，注意重复滤镜合并、交错流顺序、参数空间差异、以及无法映射的效果；
- **时间码精度**：非整数帧率（29.97fps）会产生累积舍入误差，用 `round()` 而非 `int()`，测试中给 ±1 帧容差；
- **输出验证**：绝不要因为退出码为 0 就相信导出成功，要核验 magic bytes、OOXML/ZIP 结构、像素、音频 RMS、时长等。

### 平台无关与生态分发

CLI-Anything 以 Claude Code 插件形式首发，但设计上平台无关，目前已提供 OpenClaw、Codex、Hermes、Reasonix、OpenCode、Pi、Qodercli、GitHub Copilot CLI 等多种安装方式。每个生成的 CLI 还会在 `skills/cli-anything-<software>/SKILL.md` 处生成一份 `SKILL.md`，让其他 Agent 能通过 `npx skills add HKUDS/CLI-Anything` 直接发现并调用它。

配套的 **CLI-Hub** 是一个 PyPI 包（`pip install cli-anything-hub`），提供 `cli-hub list / search / info / install / update / uninstall / launch` 等命令，让 Agent 能自主发现、安装并使用所需的 CLI。

## 三、安装与快速开始

两种最常见的入门姿势：

**方式一：直接消费现成 CLI 生态（CLI-Hub）**

```bash
pip install cli-anything-hub

# 浏览、搜索、安装
cli-hub list
cli-hub search image
cli-hub install gimp
cli-hub info gimp
cli-hub launch gimp
```

**方式二：给自己装一个 Agent 插件，然后一行命令造 CLI（以 Claude Code 为例）**

```bash
# 添加市场并安装插件
/plugin marketplace add HKUDS/CLI-Anything
/plugin install cli-anything

# 给任意软件生成完整 CLI（支持本地路径或 GitHub 仓库）
/cli-anything ./gimp
/cli-anything https://github.com/blender/blender
```

环境要求：**Python 3.10+**，目标软件或其源码仓库可在本地或线上访问。部分 CLI 会包装真实桌面/后端软件（如 GIMP、Blender、LibreOffice），安装对应 CLI 后还需自行安装上游应用。

## 四、使用方法与实战

生成并安装后，使用方式完全一致。以 `cli-anything-libreoffice` 为例，创建一个 Writer 文档并导出真实 PDF：

```bash
# 安装到 PATH
cd libreoffice/agent-harness && pip install -e .
which cli-anything-libreoffice

# 新建文档并添加内容
cli-anything-libreoffice document new -o report.json --type writer
cli-anything-libreoffice --project report.json writer add-heading -t "Q1 Report" --level 1
cli-anything-libreoffice --project report.json writer add-table --rows 4 --cols 3

# 通过 LibreOffice 无头模式导出真实 PDF
cli-anything-libreoffice --project report.json export render output.pdf -p pdf --overwrite

# Agent 友好的 JSON 输出
cli-anything-libreoffice --json document info --project report.json
```

JSON 模式下返回结构化数据，便于 Agent 消费：

```json
{
  "name": "Q1 Report",
  "type": "writer",
  "pages": 1,
  "elements": 2,
  "modified": true
}
```

裸命令则进入 REPL 交互模式，带统一风格的品牌横幅与上下文提示符：

```
$ cli-anything-blender
╔══════════════════════════════════════════╗
║       cli-anything-blender v1.0.0        ║
║     Blender CLI for AI Agents            ║
╚══════════════════════════════════════════╝

blender> scene new --name ProductShot
✓ Created scene: ProductShot
blender[ProductShot]> object add-mesh --type cube --location 0 0 1
✓ Added mesh: Cube at (0, 0, 1)
blender[ProductShot]> render execute --output render.png --engine CYCLES
✓ Rendered: render.png (1920×1080, 2.3 MB) via blender --background
```

官方还展示了多个惊艳的实战 Demo：FreeCAD 在"预览 + 实时预览 + 轨迹回放"三件套驱动下搭出好奇号火星车；Blender 在真实预览循环里长出硬表面轨道中继无人机；Draw.io 用纯 CLI 画出完整 HTTPS 握手时序图；甚至让 Agent 实机驾驶一个正在运行的 ArcGIS Pro 会话做地图制图。

运行测试也很简单，推荐用强制安装模式做校验：

```bash
cd <software>/agent-harness
CLI_ANYTHING_FORCE_INSTALLED=1 python3 -m pytest cli_anything/<software>/tests/ -v -s
```

## 五、常见问题与解决方案

**生成的 CLI 跑不起来 / 找不到命令（`command not found`）**
先在 harness 目录执行 `pip install -e .`，再用 `which cli-anything-<software>` 确认已进 PATH。Windows 上若报 `cygpath: command not found`，需安装 Git for Windows 或改用 WSL，因为 Claude Code 在 Windows 通过 `bash` 执行命令。

**`Unknown skill: cli-anything`（插件相关）**
说明插件未正确加载，按序排查：`/reload-plugins` → `/help cli-anything` 验证 → 必要时重新执行 `/plugin marketplace add` 与 `/plugin install cli-anything`。老版本若 `/cli-anything` 不被识别，可尝试遗留形式 `/cli-anything:cli-anything`。

**导出成功但效果缺失 / 文件"看着对其实错"**
这正是 Rendering Gap。务必走"原生渲染器"路径而非朴素导出工具；并加上输出验证（magic bytes、ZIP/OOXML 结构、像素/音频/时长校验），别只信退出码 0。

**一次性生成覆盖不全**
单条 `/cli-anything` 往往无法覆盖全部能力，需反复跑 `/cli-anything:refine`（可带聚焦方向，如 `"batch processing and filters"`）做增量、非破坏式的覆盖扩展。

**对模型与源码有要求**
项目依赖前沿大模型（如 Claude Opus/Sonnet、GPT-5.x）才能稳定生成；弱模型产出的 CLI 可能需大量人工修正。同时流水线基于源码分析，目标若只有需反编译的二进制，覆盖率会显著下降。

## 六、总结

CLI-Anything 给"Agent 如何使用真实世界软件"这个问题，提供了一个务实且优雅的答案：**不去模拟软件，而是为软件生成一套 Agent 原生的结构化接口**。七阶段流水线 + `HARNESS.md` 方法论保证了可复制性，统一 REPL/`--json` 设计保证了 Agent 的可消费性，而对真实后端的零妥协与 2,461 项全通过的测试，则保证了它不是玩具。对于想让自己的工具、内部系统或服务被 AI 智能体驱动的开发者来说，这一个命令、一条流水线，值得放进工具箱。
