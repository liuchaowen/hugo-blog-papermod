---
title: "fireworks-tech-graph：用自然语言描述生成专业级技术图形的开源工具"
date: "2026-07-20"
description: "fireworks-tech-graph 是一款面向 AI Agent 的技术图表生成 Skill，支持用自然语言描述直接输出几何安全的 SVG、PNG、GIF 和离线 HTML，涵盖 12 种视觉风格与 14 类 UML 图，是技术文档写作和架构设计的效率利器。"
author: "Cheman"
slug: fireworks-tech-graph
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI工具", "图表生成", "SVG", "架构图", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**fireworks-tech-graph**，它是一个 AI Agent Skill，能用自然语言描述直接生成几何精准的 SVG 技术图、高分辨率 PNG、动画 GIF 和离线 HTML，完美解决了技术写作者和架构师"脑子里有画面但画不出来"的痛点。

## 一、项目概述

`fireworks-tech-graph` 是专门为 **Codex** 和 **Claude Code** 这两个 AI Agent 运行时设计的图表生成 Skill。开发者只需用自然语言描述想要的图表场景，就能获得经过几何验证的专业级图形输出。相比 Mermaid 和 draw.io，它的最大优势在于**无需编写 DSL 语法或手动操作 GUI**，真正做到了"说即所得"。

**核心特性一览：**
- **12 种视觉风格**：包括 Flat Icon、Dark Terminal、Blueprint、Notion Clean、Glassmorphism、Claude Official、OpenAI Official、Dark Luxury（AI 创作），以及 4 种工程语义风格（C4 Review Canvas、Cloud Fabric、Event Transit、Ops Pulse）
- **14 类 UML 图**：Class、Component、Deployment、Package、Composite Structure、Object、Use Case、Activity、State Machine、Sequence、Communication、Timing、Interaction Overview、ER Diagram 全部覆盖
- **几何安全路由**：确定性正交路由、自动避让、标签区域保护、跨桥跳跃检测，确保每条连接线都清晰美观
- **语义 GIF 动效**：接受生成的 SVG 输入，输出经过语义验证的 GIF 动画，连接线按语义顺序依次绘制
- **离线 HTML 导出**：一键生成带缩放、主题切换、源码复制和多分辨率下载的离线 HTML 文件
- **AI/Agent 领域内置模式**：Mem0、RAG、Agentic Search、Multi-Agent、Tool Call Flow 等模式开箱即用

## 二、技术原理

### 架构设计

项目遵循**代理驱动、边界验证反馈循环**的设计哲学，而非一次性生成。完整渲染流程如下：

```
自然语言 Prompt
  → 图表合约（Diagram Contract）
  → 语义 IR（Semantic IR）
  → 风格规格（Style Spec）
  → 路由规划（Route Planner）
  → SVG 构建
  → 结构验证（XML / 标记 / 几何 / 碰撞）
  → PNG 视觉回读
  → 定向修订
  → 验证通过 → 最终 SVG + PNG
```

五大设计原则保证了输出的可信赖性：

1. **评估而非断言**：完成状态必须有验证器和渲染证据支撑
2. **确定性检查优先**：XML 结构、路径几何、箭头-组件碰撞等优先于视觉判断
3. **感知验证其次**：PNG 回读检查裁剪、标签碰撞、层级、留白和路由质量
4. **定向修正**：每轮只改变诊断出的标签、坐标、路径或间距，再重新验证
5. **边界收敛**：视觉审查默认最多两轮定向修正，防止无限自我编辑循环

### 语义形状词汇表

项目定义了一套跨风格一致的语义形状系统：

| 概念 | 形状 |
|------|------|
| LLM / Model | 双边框圆角矩形 + ⚡ |
| Agent / Orchestrator | 六边形 |
| 向量数据库 | 带内环的圆柱体 |
| 图数据库 | 三圆簇 |
| Tool / Function | 带 ⚙ 的矩形 |
| 异步事件 | 水平管道/流 |
| 决策 | 菱形 |

### 箭头语义系统

颜色和虚线模式共同编码连接含义：

| 流类型 | 描边 | 虚线 | 含义 |
|--------|------|------|------|
| 主数据流 | 2px 实线 | — | 主请求/响应 |
| 控制/触发 | 1.5px 实线 | — | 系统 A 触发 B |
| 内存读取 | 1.5px 实线 | — | 从存储检索 |
| 内存写入 | 1.5px | `5,3` | 写入/存储操作 |
| 异步/事件 | 1.5px | `4,2` | 非阻塞 |
| 反馈/循环 | 1.5px 曲线 | — | 迭代推理 |

### 版本化图表 IR

项目采用 JSON Schema v1 作为中间表示层（IR），历史 JSON 格式会自动归一化到最新 schema，且在渲染前检查重复 ID、悬空引用、格式错误的路径点和无穷几何值，确保输入可靠性。

## 三、安装与快速开始

### 环境要求

- **Python 3.9+**（必需，核心脚本依赖）
- **cairosvg**（推荐，用于高质量 SVG→PNG 渲染）：`python3 -m pip install cairosvg`
- **rsvg-convert**（备选，系统包，CSS 支持较弱）
- **FFmpeg + Puppeteer**（可选，仅 SVG→GIF 动效导出需要）

### 安装 Skill

为 Codex 和 Claude Code 同时安装完整 Skill：

```bash
npx -y skills@1.5.17 add \
  yizhiyanhua-ai/fireworks-tech-graph/skills/fireworks-tech-graph \
  --agent codex claude-code -g -y --copy
```

或使用 Git 方式可编辑安装：

```bash
# 为 Codex
mkdir -p ~/.agents/skills
git clone https://github.com/yizhiyanhua-ai/fireworks-tech-graph.git ~/.agents/skills/fireworks-tech-graph

# 为 Claude Code
mkdir -p ~/.claude/skills
git clone https://github.com/yizhiyanhua-ai/fireworks-tech-graph.git ~/.claude/skills/fireworks-tech-graph
```

安装完成后重启 Agent 运行时即可发现 Skill。

### 验证安装

```bash
SKILL_ROOT="${CLAUDE_SKILL_DIR:-$HOME/.claude/skills/fireworks-tech-graph}"
python3 "$SKILL_ROOT/scripts/fireworks.py" doctor
```

## 四、使用方法与实战

### 基础用法

在 Claude Code 或 Codex 中直接发送自然语言描述即可：

```
Draw a RAG pipeline flowchart
```
```
Generate a Mem0 memory architecture diagram with vector store and graph DB
```
```
Draw a microservices architecture diagram, style 3 (blueprint)
```

### 指定风格与输出路径

```
Generate a multi-agent collaboration diagram --style glassmorphism --output ~/Desktop/
```

### 使用 Unified CLI

安装后也可通过命令行直接使用：

```bash
SKILL_ROOT="${CLAUDE_SKILL_DIR:-$HOME/.agents/skills/fireworks-tech-graph}"

# 健康检查
python3 "$SKILL_ROOT/scripts/fireworks.py" doctor

# 验证图表
python3 "$SKILL_ROOT/scripts/fireworks.py" validate architecture "$SKILL_ROOT/fixtures/api-flow-style7.json"

# 渲染图表
python3 "$SKILL_ROOT/scripts/fireworks.py" render architecture "$SKILL_ROOT/fixtures/api-flow-style7.json" diagram.svg --report layout.json

# 检查 SVG
python3 "$SKILL_ROOT/scripts/fireworks.py" check diagram.svg

# 导出离线 HTML
python3 "$SKILL_ROOT/scripts/fireworks.py" export-html diagram.svg diagram.html --title "Agent Runtime Architecture"

# 生成 GIF 动效
python3 "$SKILL_ROOT/scripts/fireworks.py" animate diagram.svg diagram.gif
```

### 风格选择速查表

| 场景 | 推荐风格 |
|------|---------|
| AI/Agent 系统架构 | Style 2 (Dark Terminal) 或 Style 5 (Glassmorphism) |
| 内存架构图 | Style 3 (Blueprint) |
| 云原生部署 | Style 10 (Cloud Fabric) |
| 事件流 / Kafka | Style 11 (Event Transit) |
| SRE / 可用性分析 | Style 12 (Ops Pulse) |
| C4 架构评审 | Style 9 (C4 Review Canvas) |
| GitHub README 配图 | Style 2 (Dark Terminal) |
| 博客文章配图 | Style 1 (Flat Icon) |

### 生成 GIF 动效的触发词

以下任一表述均可触发 GIF 生成：
- "Generate a GIF" / "Animate this diagram"
- "生成 GIF" / "制作 GIF" / "让这张图动起来"
- "把 SVG 转成 GIF"

默认参数：960px 宽、5.75 秒、20fps、115 帧，连接线在前 36 帧绘制完成后保持 2 秒流动动画再重置。

## 五、常见问题与解决方案

**Q: PNG 导出后为空白或全黑？**
A: 可能是 SVG 中含有 `@import url()` 外部字体引用，cairosvg 和 rsvg 无法抓取外部资源。解决方案：移除 `@import`，改用系统字体栈。

**Q: 图表内容被截断？**
A: ViewBox 的高度设置不够。增大 `viewBox="0 0 960 <height>"` 中的高度值。

**Q: 如何获得最高质量的 PNG？**
A: 安装 Puppeteer 依赖，使用 `scripts/svg2png.js` 脚本路径渲染，而非 cairosvg。参考 `references/png-export.md`。

**Q: 能生成中文标签的图表吗？**
A: 支持自然语言中文描述作为 prompt 输入，SVG 中的文字标签取决于使用的字体是否包含对应 Unicode 字符。建议在 SVG 生成后手动替换标签文字。

**Q: GitHub Trending 上这个项目为什么值得关注？**
A: 它将 AI Agent 的自然语言理解能力与工程级图表生成质量结合，在 AI/Agent 开发工具领域填补了"描述即所得"图表的空白，尤其适合技术博客写作、架构文档和演示材料制作。

## 六、总结

`fireworks-tech-graph` 是一个定位清晰、工程扎实的 AI Agent 图表 Skill。它的核心价值在于：将技术图表生成从"手动画图/写 DSL"的繁琐中解放出来，同时通过几何验证和视觉回读保证了输出质量。对于需要频繁产出技术文档、架构图和流程图的技术写作者和开发者来说，这是一个值得纳入工作流的效率工具。

- GitHub 地址：https://github.com/yizhiyanhua-ai/fireworks-tech-graph
- 支持 Codex 和 Claude Code，即装即用
- MIT 许可证，代码完全开源
