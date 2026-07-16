---
title: "Archify：用一句话在聊天里生成架构与技术流程图的开源 Agent Skill"
date: 2026-07-16
description: "Archify 是一个面向 Claude、Codex CLI 和 opencode 的 Agent Skill，能把对系统或流程的自然语言描述转换为自包含的 HTML 技术图表，支持架构图、工作流、时序图、数据流与生命周期图，并可一键切换暗色/亮色主题、复制到剪贴板或导出 4× 高清 PNG/JPEG/WebP/SVG。"
author: "Cheman"
slug: archify
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI工具, 架构设计, Agent]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Archify**——一个把「用大白话描述系统架构」直接变成精致技术图表的开源 Agent Skill。它不依赖庞大的图标库或绘图编辑器，生成的是零依赖、可分享的单个 HTML 文件，打开即可看、一键即可导出。

## 一、项目概述

Archify 是一个运行在 AI 编码 Agent 里的「技能（Skill）」，目前支持 Claude Code、Codex CLI 和 opencode。它的核心价值是：**把对系统或流程的英文描述，转换成排版精致、自包含的技术图表**。

它不是通用绘图编辑器，也不是 Mermaid 主题——它的定位非常明确：把技术意图变成「可沟通的产物」。一张图可以覆盖架构、工作流、时序、数据流、生命周期五种视图，并且都通过同一套「类型化 JSON 中间表示（JSON IR）」驱动渲染。

项目的关键特性可以归纳为几点：

- **无需设计能力**：用自然语言描述架构，Agent 负责排版、间距、路由和强调点。
- **五类技术图**：架构图、工作流、时序图、数据流图、生命周期图，覆盖 CI/CD、权限审批、调用链、数据血缘、状态机等场景。
- **内置主题切换**：暗色 / 亮色一键切换，且跨会话持久化。
- **复制到剪贴板**：一键把 PNG 复制到剪贴板，直接粘贴进 Slack / Notion / GitHub。
- **超清导出**：PNG / JPEG / WebP 以最高安全分辨率原生渲染（最高 4× 源分辨率，非简单放大模糊），SVG 则为真正的矢量。
- **SVG 跟随系统主题**：导出的 SVG 内嵌两套 CSS 变量 + `@media (prefers-color-scheme)`，扔进 README 就能随读者系统主题自动切换，不再需要用 `<picture>` 包两张 PNG。
- **内置校验回路**：渲染产物要经过 JSON Schema 校验、布局检查、HTML/SVG 产物检查，再做针对性迭代。
- **语义化技术标签**：把组件写成 `aws.lambda`、`postgres`、`redis`、`github-actions`、`openai` 等，Archify 会据此映射到正确的视觉分类，无需引入完整图标库。
- **自包含 HTML**：生成的文件零外部依赖，发给别人即可打开。
- **对话式迭代**：`add Redis`、`move auth to the left`、`use emerald for the API` 这类指令即可微调。

## 二、技术原理

Archify 的底层是一条「小而可审查（inspectable）」的渲染回路，而不是黑盒式地直接拼 SVG 字符串：

| 步骤 | 发生了什么 |
|---|---|
| **生成 JSON IR** | Agent 先产出一份类型化描述，而不是手写最终 SVG 标签 |
| **校验（Validate）** | 内置独立校验器检查 schema，无需安装运行时依赖 |
| **渲染（Render）** | 选定的渲染器产出 HTML / SVG 产物 |
| **检查（Check）** | 布局与产物检查，捕获非法坐标、畸形 SVG、危险路由 |
| **迭代（Iterate）** | 针对 JSON IR 做定向修改，无关结构保持稳定 |

得益于「类型化 JSON IR」，架构、工作流、时序、数据流、生命周期五类图都使用渲染器支持的结构化 schema。Agent 工作的重心从「画像素」变成了「做布局判断」——它负责决定层级、间距、连线走向和视觉强调，从而把图当成一种沟通语言来运用。

语义标签到视觉分类的映射是 Archify 的一大亮点，例如：

| 示例标签 | 分类 |
|---|---|
| `react`、`nextjs`、`ios`、`browser` | 前端 |
| `node`、`go-service`、`python-worker`、`api-gateway` | 后端 |
| `postgres`、`redis`、`s3`、`bigquery`、`snowflake` | 数据与存储 |
| `aws.lambda`、`gcp.pubsub`、`azure.functions`、`kubernetes` | 云与基础设施 |
| `auth0`、`oauth`、`vault`、`security-group` | 安全 |
| `kafka`、`rabbitmq`、`sqs`、`nats` | 消息 |
| `stripe`、`github-actions`、`openai`、`slack` | 外部系统 |

导出的 SVG 之所以能「跟随系统主题」，是因为产物里同时内置了暗、亮两套变量，并通过 `@media (prefers-color-scheme)` 触发切换。这也是它敢于宣称「README 里一张 SVG 就够了」的原因。

包内还附带了一个 CLI（`bin/archify.mjs`），暴露了与 Agent 同样的工作流，方便在不依赖 Agent 的情况下手动驱动或做 demo：

```bash
cd archify
node bin/archify.mjs doctor                      # 环境自检
node bin/archify.mjs demo /tmp/archify-demo      # 生成示例
node bin/archify.mjs render workflow examples/agent-tool-call.workflow.json /tmp/workflow.html
node bin/archify.mjs validate workflow examples/agent-tool-call.workflow.json --json
node bin/archify.mjs check /tmp/workflow.html
node bin/archify.mjs examples
```

## 三、安装与快速开始

Archify 通过开源的 [`skills` CLI](https://github.com/vercel-labs/skills) 安装。标准安装命令（全局安装）如下：

```bash
npx skills add tt-a1i/archify -g
```

不想永久安装、只体验一下的话，可以临时调用：

```bash
npx skills use tt-a1i/archify@archify --agent codex
```

把 `codex` 换成 `claude-code` 或 `opencode` 即可。安装完成后，直接对 Agent 说：

```text
Use archify to map this repository's runtime architecture.
```

它也支持手动安装：把 [`archify.zip`](https://github.com/tt-a1i/archify) 解压到对应 Agent 的 skills 目录即可，打包后的技能无需 `npm install`：

| 运行环境 | 安装位置 | 能力 |
|---|---|---|
| **Claude Code** | `~/.claude/skills/` 或 `.claude/skills/` | 完整渲染 + 校验流程 |
| **Codex CLI** | `~/.agents/skills/` 或 `.agents/skills/` | 完整渲染 + 校验流程 |
| **opencode** | `~/.config/opencode/skills/`、`.opencode/skills/` 或 `.agents/skills/` | 完整渲染 + 校验流程 |
| **Claude.ai** | 在 Settings → Capabilities → Skills 上传 `archify.zip` | 取决于沙箱是否有 Node.js |
| **Project Knowledge** | 把 `archify.zip` 上传到项目 | 仅提示驱动的架构模式 |

## 四、使用方法与实战

### 从一份概览开始

官方建议先从高层视图入手，而不是让一张图解释整个仓库。例如：

```text
Analyze this repository, then use archify to create a high-level runtime
architecture diagram. Show 8–12 core components, one primary request or
data path, external dependencies, and trust boundaries. Put supporting
detail in cards instead of adding more edges.
```

### 聚焦一条流程

针对具体流程时，把参与者、顺序、分支和异常讲清楚：

```text
Use archify to draw this login flow: Browser -> Web App -> API ->
JWT validation -> Redis session lookup -> PostgreSQL fallback.
Make the cache-miss path secondary.
```

### 选择视图类型

| 类型 | 适合回答的问题 | 提示里要包含 |
|---|---|---|
| **Architecture** | 组件、服务、存储、边界 | 范围、核心组件、主路径 |
| **Workflow** | CI/CD、审批、工具调用、runbook | 参与者、顺序、分支、异常 |
| **Sequence** | API 调用、缓存回退、鉴权、异步链路 | 调用方、被调方、返回、时序 |
| **Data Flow** | 管道、血缘、PII、下游消费者 | 源、转换、存储、边界 |
| **Lifecycle** | 状态机、重试、等待、终态 | 状态、事件、重试与取消路径 |

### 实战：CI/CD 工作流

```text
Draw a CI/CD workflow: pull request -> tests -> approval -> build image
-> staging -> smoke test -> production. Show rollback as a secondary failure path.
```

### 用输出物

生成的 HTML 在任意现代浏览器中打开，右上角控件提供：

- **Theme**：暗色 / 亮色切换，快捷键 <kbd>T</kbd>。
- **Export**：复制 PNG 或下载 PNG / JPEG / WebP / SVG，快捷键 <kbd>E</kbd>。

还支持一些 URL 参数：`?theme=light` / `?theme=dark` 强制初始主题，`?openExport=1` 加载时直接打开导出菜单。WebP 与剪贴板能力依赖浏览器支持；外部字体加载失败时 HTML 会回退到本地字体。

## 五、常见问题与解决方案

**Q：安装时报网络或命令找不到？**
A：确保本机已安装 Node.js（用于 `npx` 和包内 CLI），并确认 `npx skills` 能正常联网。手动安装时可改用解压 `archify.zip` 到对应 skills 目录的方式，无需 `npm install`。

**Q：导出的 SVG 在 README 里不跟随主题？**
A：确认你引用的是 Archify 导出的 SVG 本身，而不是一张 PNG。SVG 已内嵌两套变量与 `@media (prefers-color-scheme)`，只要作为 `.svg` 原样引入即可随读者系统主题切换，无需 `<picture>` 双图方案。

**Q：图太复杂、节点过多导致读不清？**
A：控制核心组件在 8–12 个，把实现细节放进「卡片（cards）」而非增加更多连线；优先画一条主路径，次要分支（如缓存 miss、回滚）后置呈现。

**Q：在 Claude.ai 沙箱里渲染不完整？**
A：Claude.ai 的渲染能力取决于沙箱是否提供 Node.js 访问。若需完整渲染 + 校验流程，建议在 Claude Code、Codex CLI 或 opencode 本地环境中使用。

**Q：超大图的导出被限制分辨率？**
A：栅格导出以最高「安全」分辨率原生渲染（最高 4×），超出浏览器画布上限的超大图会自动降档，以保证导出成功而非无限放大。

## 六、总结

Archify 把「用自然语言画技术图」做成了 Agent 工作流里一件顺手的事：类型化 JSON IR 负责结构化、内置校验回路保证产物可交付、自包含 HTML 让分享零门槛、暗亮双主题与 4× 高清导出则覆盖了从即时沟通（Slack / Notion）到文档沉淀（README / 博客 / Figma）的全链路需求。它明确不做通用编辑器、不做 Mermaid 主题、不提供托管分享，这种克制反而让它在「架构沟通」这一件事上打磨得很深。

如果你常在 review 代码或写技术方案时需要快速产出一张架构 / 流程图，把 Archify 装进 Claude Code 或 Codex CLI，用一句话让它「map this repository's runtime architecture」，往往会比临时手画省下不少时间。

> 项目地址：[github.com/tt-a1i/archify](https://github.com/tt-a1i/archify) ｜ 演示页：[tt-a1i.github.io/archify](https://tt-a1i.github.io/archify/)
