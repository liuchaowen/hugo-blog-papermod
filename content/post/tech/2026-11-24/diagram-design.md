---
title: "Diagram Design：让 AI 画出一张设计师不会嫌弃的架构图"
date: "2026-11-24T18:00:00+08:00"
description: "Diagram Design 是一个面向 AI 编码代理的 Agent Skill，用 52 种图表类型把自然语言变成自包含的 HTML + 内联 SVG 文件。它不谈自动化布局，谈的是编辑级品味：单一强调色、1px 发丝线、4px 网格、零阴影，还能从你的网站抽取品牌色与字体。"
author: "Cheman"
slug: diagram-design
github_repo: cathrynlavery/diagram-design
draft: false
tags: ["diagram-design", "Agent Skills", "Claude Code", "SVG", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Diagram Design**（`cathrynlavery/diagram-design`）。它解决的不是"怎么把方框连起来"这个老问题，而是"为什么 AI 画的图一眼就能看出是 AI 画的"。项目用一套 Agent Skill 的形式，把 52 种图表类型和一份被写死的编辑设计规范交给 Claude Code、Codex、Cursor、GitHub Copilot 等代理，产出的是单文件 HTML + 内联 SVG，可以直接双击打开。当前仓库约 7.1 万 star、4765 fork，MIT 协议，主语言 HTML 与 Python。

## 一、项目概述

Diagram Design 的作者是 Cathryn Lavery（LittleMight 创始人，写 littlemight.com 的博客）。她在 README 里给了一个很具体的动机：每次写文章需要配图，让 Claude 画出来的都是"通用圆角方框"，和站点其余部分毫无关系；要么花半小时跟 Figma 搏斗，要么干脆放弃配图。模型其实已经理解了内容，缺的是**品味**——于是她把品味写了下来。

这个"写下来的品味"最终变成了一份 `style-guide.md`：一个强调色只给一到两个焦点元素、1px 发丝线、零阴影、所有坐标必须落在 4px 网格上。

核心特性可以概括成几条：

- **52 种图表类型**：架构图、架构差异图、IT 现状图、流程图、时序图、状态机、ER 图、泳道图、象限图、雷达图、飞轮、树形、组织架构、层叠、爆炸轴测图、轴测平面图、Venn、金字塔/漏斗、矩形树图、瀑布图、桑基图、鱼骨图、Wardley Map、看板、用户旅程、服务蓝图、部署图、依赖图、UML 类图、故事地图、数据库 Schema、SBGN、需求追溯、事件建模、关键路径网络……类型表覆盖面相当宽，而且每种类型都有对应的 `type-*.md` 规范文件。
- **单文件交付**：一个 `.html` 里包含全部 CSS 和内联 SVG，没有构建步骤、没有 JavaScript（动画变体除外）、没有外部图片依赖。
- **三种变体**：每种图都有 minimal light、minimal dark、full-editorial 三套静态版本，另有可选的 sketchy（手绘滤镜）和 terminal（终端窗口）变体。
- **品牌抽取**：给它一个网址，它会抓取首页的主色板与字体栈，映射成 `paper` / `ink` / `muted` / `accent` / `link` 五个语义角色，写进风格指南。之后每一张图都自动使用你的品牌色。
- **反向导入**：draw.io、Mermaid、Excalidraw、PlantUML 的存量图可以"重画"，而不是"转换"。
- **可访问性内建**：每个模板的 SVG 都带 `role="img"`、可解析的 `aria-labelledby`，`<title>` 必须是首个子元素。
- **跨宿主**：Claude Code、Claude Desktop、Codex、Cursor、Cline、Gemini CLI、Windsurf、Amp、Zed、Warp、Roo、Kilo、GitHub Copilot、Factory Droid、Qoder、Pi、Kiro、OpenCode 都有各自的安装路径。

和 Mermaid / PlantUML 相比，差异不是"谁更强"，而是定位不同。README 里那张对比表说得很直白：Mermaid 你写文本、布局自动、输出是可 diff 的文本；draw.io 你手动拖拽、输出是可编辑画布；Diagram Design 你描述给代理、代理在 4px 网格上摆位、输出是一个可以直接发布的 HTML 文件。

作者自己也没有回避缺点：输出质量取决于你用的模型，同一个提示两次可能布局不同；产物不是可编辑的源格式，没法在 PR 里 diff，也没有画布可以拖动。所以她的结论是——**如果图要跟着 Git 每周变化，Mermaid 仍然更合适；Diagram Design 是给"这张图我要发出去"的场景用的。**

## 二、技术原理

### 2.1 分层：Skill 作为路由层，而不是代码库

这个项目最值得借鉴的地方，是它的组织方式。它不是一个 npm 包、不是 Python 库，而是一个"给代理看的说明书 + 素材库"。整个仓库的目录结构就是围绕这一点设计的：

```
diagram-design/
├── .claude-plugin/            # Claude 插件清单
├── .codex-plugin/             # Codex 插件清单
├── .factory-plugin/           # Factory Droid marketplace
├── .qoder-plugin/             # Qoder 原生插件清单
├── commands/                  # 斜杠命令定义（export/import/profile/doctor）
├── prompts/                   # Pi 的 prompt 模板
└── skills/diagram-design/
    ├── SKILL.md               # 哲学、选型、检查清单
    ├── references/            # 按需加载：风格指南 + 52 个 type-*.md
    ├── scripts/               # 四个 extractor + export + self_check
    └── assets/                # 模板、示例、图标库、gallery
```

关键在于 `SKILL.md` 里写明的"渐进式披露"（progressive disclosure）：代理启动时只看到技能名和一行描述；命中请求后加载 `SKILL.md`；真正要画流程图时，才去读 `references/type-flowchart.md`。如果这张图涉及行为语义（比如排队、限流、权限边界），会先读 `semantic-patterns.md` 再选视觉类型；只有明确要求动画时才读 `animation.md`。

这套设计的收益很实际：52 种类型不会一次性塞爆上下文。加一个新类型，其他部分完全不用改。

README 里有一张"什么请求加载什么"的对照表，可以当成上下文预算的说明书：

| 你的请求 | 代理加载 |
|---|---|
| 画个流程图 | `SKILL.md` + `type-flowchart.md` |
| 画架构图 | `SKILL.md` + `type-architecture.md` |
| 展示迁移中增删改动了什么 | `SKILL.md` + `type-architecture-delta.md` |
| 把设备拆开看内部 | `SKILL.md` + `type-exploded.md` |
| 对比两条策略请求为什么结果不同 | `semantic-patterns.md` + `type-flowchart.md` |
| 给这张图加动画 | 前序选择 + `animation.md` |
| 用我的品牌色 | `onboarding.md` + `style-guide.md` |

### 2.2 语义模式先于视觉类型

一般图表工具的第一问是"你要什么图"。Diagram Design 的第一问是"这张图要表达的行为是什么"。

`SKILL.md` 定义了几种可路由的语义模式，每种模式绑定一个最近的视觉类型：

- **Fan-in 队列 / 瓶颈**（扇入、队列深度、有限容量）→ Data flow
- **带语义槽位的阶段框架**（每阶段重复 Question / Input / Governance / Output）→ Process
- **非结构化输入变成结构化产物** → Data flow
- **成对的策略评估轨迹**（需要 pass/fail/skipped/not-reached 和首次分歧点）→ Flowchart
- **安全铺装路**（信任边界 + 允许/禁止的入口与部署路径）→ Architecture
- **按执行位置分组的控制项**（治理目录）→ Layer stack
- **补偿性安全层**（前一层缺口由后一层补，残余风险逐层传递）→ Layer stack
- **可追溯的块级分解**（层级化、可按 ID 寻址、每块有 I/O 与约束）→ Tree
- **生命周期阶段图**（一个主体经过阶段、等待、重试、取消与终态）→ State Machine

模式的职责是定义"语义原语和更紧的预算"，类型的职责是"布局语法"。这个切分很聪明：它让"该画什么"和"怎么摆"解耦，也让代理在动手前必须先做一次判断，而不是条件反射地画方框。

### 2.3 设计系统：把品味变成可执行的 token

真正的差异点在 `references/style-guide.md`。它是颜色、字体、间距的唯一真相来源，其他所有 `type-*.md` 里只允许写语义角色名（`accent`），不允许出现十六进制值。

默认皮肤是一套冷调编辑配色：

| 角色 | 用途 | 浅色默认值 |
|---|---|---|
| `paper` | 页面背景、默认节点填充 | `#f5f5f5`（white-smoke） |
| `paper-2` | 图表容器背景、次级填充 | `#ececec` |
| `ink` | 主文字、主描边 | `#2d3142`（jet-black） |
| `muted` | 次级文字、默认箭头 | `#4f5d75`（blue-slate） |
| `soft` | 子标签、边界标签 | `#5a6580` |
| `accent` | 焦点元素，每图最多 1–2 个 | `#bf4520`（burnt-tangerine） |
| `link` | HTTP/API 调用、外部箭头 | `#2e5aa8` |

这里有一个值得单独说的细节：品牌的原子橘色（atomic-tangerine）在 `paper` 上的对比度只有 2.86:1，太淡，做箭头或标签都读不清。所以皮肤用的是同色相压暗后的 `#bf4520`，刚好过 4.5:1。这种"为了可用性而偏离品牌原色"的决定，被明确写进了文档，并且由 `scripts/verify-contrast.py` 在 CI 里强制校验——浅色皮肤下 `accent` 4.71:1、`soft` 5.34:1、`link` 6.13:1、`muted` 6.11:1。对比度不是设计建议，是构建门禁。

排版只有三套字体，各司其职：

- **Instrument Serif**：页面 H1 与斜体批注（editorial callout）
- **Geist sans**：节点名称，600 字重，12px
- **Geist Mono**：端口、协议、URL、字段类型等"技术内容"，9px 子标签

规则里有一条反复强调的红线：**Mono 只用于技术内容，绝不能当作"开发者感"的全局字体，也永远不用 JetBrains Mono。** 这条规则本身就是在对抗 AI 生成图的典型套路。

结构几何统一落在 4px 网格上：节点原点、宽高、间距、内边距都必须能被 4 整除。这条是硬规则，README 里称之为"让图不像 AI 生成的"关键。描边 1px（`stroke-thin` 0.8、`stroke-strong` 1.2），圆角 `radius-sm` 4 / `radius-md` 6 / `radius-lg` 8，最大不超过 10，**任何元素都不许有阴影**。

### 2.4 复杂度预算与连接线六条铁律

`SKILL.md` 给单张图定了明确的预算上限：

| 限制项 | 规则 |
|---|---|
| 最大节点数 | 9 |
| 最大箭头/迁移数 | 12 |
| 最大强调元素 | 2 |
| 最大批注 | 2 |
| 动画（可选） | 8 步、12 个标记项、2 个同时项 |

超过就拆成"总览 + 细节"两张。这个数字看着保守，但它直接决定了图的可读性——作者的判断是"超过 9 个节点，它大概是两张图"。

连接线另有六条不可协商的规则，每一条都由脚本校验：

1. **只走正交**。不同轴的节点之间必须用 `r=8` 的圆角直角折线（紧凑布局最低 `r=6`）；只有两端共享 x 或 y 时才允许直线。斜线直接判失败。
2. **标签留白**。每个箭头标签（最多 14 字符、全大写、居中在本段上）必须压在不透明的遮罩矩形上，与描边保持 6–10px 可见间距，且只能贴在垂直段旁边，绝不能压在线上。
3. **不许重叠**。平行线路至少偏移 12px；单点交叉用 bridge/hop 处理。
4. **扇出挂点均分**。同一条边上的多个连接点按 `L * k / (N + 1)` 分布，彼此至少 12px（小方框 8px）。
5. **不许从非端点方框背后穿过**。必须绕行；只有在几何上无法避免时才允许，且要用 `4,3` 虚线、标签放在可见端、中间方框不加箭头。
6. **遮罩先于节点**。标签遮罩不能盖住后画的节点；从安装目录跑 `python3 scripts/verify_geometry.py <file>` 可以验证。

这六条是"AI 画的图为什么丑"的正面回答：斜线、压线标签、交叉路径、挤在一起的挂点——都是自动化布局最容易犯的错。

### 2.5 品牌抽取与对比度契约

`onboarding.md` 描述了一条从 URL 到 token 的流水线：抓首页 → 提取主色板与字体栈 → 映射到语义角色 → 展示待应用的 diff → 写入 `references/style-guide.md`。

映射规则是固定的：

| 从站点检测到 | 变成 |
|---|---|
| `<body>` 背景色 | `paper` |
| 主文字色 | `ink` |
| 次级/说明文字 | `muted` |
| 卡片或容器 | `paper-2` |
| 使用最多的品牌色（CTA、链接、标题） | `accent` |
| `<h1>` 字体族 | `title` 字体 |
| `<body>` 字体族 | `node-name` 字体 |
| `<code>` / `<pre>` 字体 | `sublabel` 字体 |

写 token 之前会先校验 WCAG AA：`ink` 压在 `paper` 上是否达标。如果品牌色在 9–12px 的图表尺寸下不够看，它会提出一个调整值并解释原因。品牌匹配还会产出一张"保真收据"（fidelity receipt）：采样了哪些 URL、每个角色用了什么确切颜色、字体族与字重、字体来源地址、以及任何降级。公开站点的字体直接用，渲染后验证，而不是悄悄替换成系统字体。

如果是多客户场景，可以把一次品牌匹配存成命名 profile，然后在项目根放一个 `.diagram-design` 标记文件：

```text
profile: acme
```

标记项目会直接读 `~/.diagram-design/profiles/acme.md`，于是并行工作区可以用不同品牌，而不会互相覆盖共享安装里的 `style-guide.md`。profile 库在 Claude Code、Codex、Factory Droid、Pi 之间是共用的。

### 2.6 校验链条

项目的 CI 门禁值得一提，因为它解释了"品味"怎么被工程化：

- `scripts/lint-skin.py`：色板、字体、可访问性、单文件安全性
- `scripts/lint-render.py`：用 Chromium 真实渲染后检查布局
- `scripts/verify-docs-sync.py`：路由表、gallery、README、类型数量是否一致
- `scripts/verify-geometry.py`：标签、连接线、挂点的几何检查
- `scripts/verify-contrast.py`：每个 token 在自己皮肤背景上的 WCAG 比值
- `skills/diagram-design/scripts/self_check.py`：可访问 SVG 契约、单文件安全、内容是否越出 viewBox、动画基础

每次 PR 都会在 Linux、Windows、macOS 上跑一遍。一个"设计品味"项目能做到这个程度，说明作者确实把它当成基础设施在做。

## 三、安装与快速开始

### 3.1 环境要求

核心产物是纯静态 HTML，所以**看图不需要任何运行时**。以下能力按需：

- 任意现代浏览器（Chrome / Firefox / Safari / Edge）
- Node.js：仅当使用 `npx skills add` 这条通用安装路径
- Python 3：仅当使用仓库内的脚本（导入器、导出器、自检）
- Playwright + Chromium：仅当需要导出 PNG

### 3.2 通用安装（任意支持 Agent Skills 的宿主）

README 给出的首选命令，逐字如下：

```bash
npx skills add cathrynlavery/diagram-design
```

这个 CLI 会解析仓库、识别 `skills/diagram-design/SKILL.md`，并把整个技能（`references/`、`assets/`、`scripts/`）装进你选择的每个宿主根目录，包括 Cursor 的 `~/.cursor/skills/`。

当选择的根目录解析出多个 skills 目录时，CLI 会问你安装方式，并推荐 **Symlink**：一份规范副本，链接进每个根，后续更新一次到位。想要每个宿主独立副本就加 `--copy`。只解析出单一目录时会直接复制，因为此时区别没有意义。Windows 没开开发者模式时符号链接不可用，CLI 会退回复制并告诉你复制了哪些根。

这条路径是独立安装，**不会跟随 marketplace 自动更新**，需要手动拉取：

```bash
npx skills update diagram-design
```

### 3.3 Claude Code

想拿到更新和斜杠命令，用插件市场：

```text
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

装完之后建议打开自动更新：运行 `/plugin`，进 **Marketplaces**，选中 **diagram-design**，选择 **Enable auto-update**。Claude Code 对第三方 marketplace 默认关闭自动更新；打开后它会在启动后于后台刷新 marketplace 与已安装插件。提示时运行 `/reload-plugins`，或等下一次会话加载。

### 3.4 Codex / GitHub Copilot / Factory Droid / Pi

四个宿主各自一条命令：

```bash
# Codex
codex plugin marketplace add cathrynlavery/diagram-design
codex plugin add diagram-design@diagram-design

# GitHub Copilot
copilot plugin marketplace add cathrynlavery/diagram-design
copilot plugin install diagram-design@diagram-design

# Factory Droid
droid plugin marketplace add https://github.com/cathrynlavery/diagram-design
droid plugin install diagram-design@diagram-design --scope user

# Pi
pi install https://github.com/cathrynlavery/diagram-design
```

Codex 在启动时刷新 Git marketplace；想立刻拉取就运行 `codex plugin marketplace upgrade diagram-design` 再开新会话。Copilot 装完用 `copilot skill list`（交互会话里是 `/skills`）确认发现成功。Droid 按 commit 追踪 Git 插件而不是清单里的显示版本。Pi 装完要在已开会话里运行 `/reload`，并用 `/skill:diagram-design` 可以显式调用；Pi 的 Git 安装故意不锁版本，因为 Pi 没有自动包刷新，需要 `pi update --extensions` 手动拉更新。

### 3.5 Claude Desktop：文件数超限的绕法

Claude Desktop 的技能上传拒绝超过 200 个文件的 ZIP，所以完整的 `skills/diagram-design/` 树不能直接导入。从检出目录构建一个有界的 ZIP：

```bash
python3 scripts/build-claude-skill-zip.py
```

产物是 `dist/diagram-design-claude-skill.zip`（已在 gitignore 中）。在 Claude Desktop 里打开 **Customize → Skills**，选择 **Upload a skill**，选中这个文件。压缩包顶层是 `diagram-design/` 目录，`SKILL.md` 在根上；它包含 references、打包脚本、模板和默认浅色示例，但不含 gallery 页面，也不含网站与 CI 用的 dark / full / animated 变体。

### 3.6 最小验证：打开 gallery

```bash
# macOS
open skills/diagram-design/assets/index.html

# Linux
xdg-open skills/diagram-design/assets/index.html
```

浏览器里会看到 52 种图的索引页，每种都带 light / dark / full-editorial 三个标签。每种类型有一个编号 01 到 52，变体和示例沿用同一编号加字母。

也可以直接从模板起步：

```bash
cp skills/diagram-design/assets/template.html my-diagram.html        # minimal light
cp skills/diagram-design/assets/template-full.html my-diagram.html   # editorial with summary cards
cp skills/diagram-design/assets/template-motion.html my-diagram.html # optional accessible motion
```

预期结果：双击 `my-diagram.html`，浏览器里出现一张带标题和发丝线边框的图，**不需要本地服务器**，因为 CSS 与 SVG 全部内联。唯一的外部请求是 Google Fonts 的样式表。

## 四、使用方法与实战

### 4.1 用自然语言提需求

README 开头给的四个例子，基本覆盖了日常用法：

- "Make me an architecture diagram of my app: frontend, backend, database, Redis cache."
- "I need a quadrant showing Q2 projects by impact vs effort."
- "Give me a sequence of a bearer call with token refresh on 401."
- "Onboard diagram-design to https://yoursite.com"

代理的行为约定是：先选类型、口述计划（类型、尺寸预设、会因为复杂度预算砍掉什么），然后才渲染。如果用户在线，这一步允许被打断；如果不在线，就按假设继续并在交付物旁边注明。

### 4.2 品牌化：让图长成你站点的样子

开箱即用的是黑 + 橘的编辑配色，截个图就能用。但花六十秒做一次 onboarding 会好很多：

```
You:     "onboard diagram-design to https://yoursite.com"
Agent:   → fetches the homepage
         → extracts the dominant palette + font stack
         → maps detected values to semantic roles:
             paper, ink, muted, accent, link
         → shows a proposed diff
         → writes your tokens to references/style-guide.md
You:     "yes, apply it"
```

不想自动抽取也可以手改 `skills/diagram-design/references/style-guide.md` 里的表格。所有下游——每一张图、批注原语、gallery——都只读语义角色名（`accent`，而不是某个 hex 值）。

还有一个"首次运行门禁"：在项目里第一次用这个技能时，如果 `style-guide.md` 还是出厂默认值（`paper #f5f5f5`、`ink #2d3142`、`accent #bf4520`），代理必须停下来问：

> *"This is your first diagram in this project and the style guide is still default. Customize now? Options: (a) website URL, (b) installed skill, (c) local folder/design-system, (d) paste tokens, (e) keep default, (f) load saved profile."*

这个设计有点反直觉——大多数工具恨不得你不做配置就直接用。但对"品牌一致性"这个目标来说，静默输出默认皮肤才是真正的失败。

### 4.3 导入存量图：重画，不是转换

如果手上已经有 draw.io、Mermaid、Excalidraw、PlantUML 的图，可以指给代理，让它按这套设计系统**重画**：内容不变，尺寸随目的地走。

```bash
/diagram-design:import-drawio platform.drawio
/diagram-design:import-drawio platform.drawio --size=slide-16x9 --detail=simplified --audience=executive
/diagram-design:import-drawio platform.drawio --detail=faithful --format=png --page=all
/diagram-design:import-mermaid README.md --diagram=all
/diagram-design:import-mermaid architecture.mmd --size=slide-16x9 --detail=simplified
/diagram-design:import-excalidraw whiteboard.excalidraw --size=slide-16x9 --detail=simplified
/diagram-design:import-plantuml sequence.puml
/diagram-design:import-plantuml classes.puml --size=slide-16x9 --detail=simplified
```

支持的输入格式比较宽：draw.io 读 `.drawio`、`.drawio.xml`、内嵌图的 `.drawio.png`、`.drawio.svg`，包括在编辑器里看起来像 base64 乱码的压缩负载；Mermaid 读 `.mmd`、`.mermaid`，以及 Markdown 里一个或多个 `mermaid` 围栏块，UTF-8 文件可以带 BOM；Excalidraw 读 `.excalidraw` 与 `.excalidraw.json` 场景文件（**不读** `.excalidraw.png` / `.excalidraw.svg` 导出件）；PlantUML 读 `.puml`、`.plantuml`、`.pu` 和 Markdown 里的 `plantuml` / `puml` 块，但**只支持时序图与类图**。解析纯文本，不渲染、不执行 JavaScript、不开浏览器、不联网、不跑 PlantUML 运行时、不跟随点击目标。

四个调节旋钮（dials）是这套流程的核心。同一个源文件，三种不同的图，差别全在这里：

| 旋钮 | 选项 | 改变什么 |
|---|---|---|
| **Format** | `html` · `svg` · `png` · `html+png` | 交付格式。SVG 给 Figma，PNG 给幻灯片，HTML 给网页 |
| **Size** | `doc-inline` · `doc-wide` · `slide-16x9` · `slide-4x3` · `social-og` · `social-square` · `print-a4-landscape` · `print-a3-landscape` · `print-letter-landscape` · `fit` | `viewBox` **和字号梯度**。投到幻灯片上的节点名是 16px，不是 12px |
| **Detail** | `faithful`（≤24 节点，分区）· `balanced`（≤12）· `simplified`（≤7） | 源图能活下来多少，走固定降级阶梯：先装饰，再重复项，再叶子簇，最后基础设施 |
| **Audience** | `engineer` · `mixed` · `executive` | 只管**措辞**，不管数量。`Auth Service / JWT · RS256 · :8443` → `Auth Service / token check` → `Sign-in` |

每次导入都以一张"保真台账"结束，列出合并、折叠、丢弃了什么：

```
Detail: balanced · 12 source nodes → 8 drawn
Collapsed: "Token valid?" decision → edge label on Gateway → Auth
Dropped:   1 sticky note ("legacy path, to be retired"), unconnected in source
Kept in full: the request path (Web/Mobile → Gateway → Orders → Postgres)
```

永远不带过来的：源图或渲染器的坐标、源色板、源字体、draw.io 的斜线连接器、Mermaid 的自动布局、Excalidraw 的手绘几何、PlantUML 的 skinparams。永远保留下来的：组件、关系、分组、方向。

### 4.4 导出 SVG / PNG

图默认是自包含 HTML，但要交给 Figma、幻灯片或社交卡片时，可以只导出图本身：

```text
# Pi
/export-diagram path/to/diagram.html
/export-diagram path/to/diagram.html --svg-only
/export-diagram path/to/diagram.html --png-only --scale=3
/export-diagram path/to/diagram.html --registry

# Claude Code
/diagram-design:export-diagram path/to/diagram.html
/diagram-design:export-diagram path/to/diagram.html --svg-only
/diagram-design:export-diagram path/to/diagram.html --png-only --scale=3
/diagram-design:export-diagram path/to/diagram.html --registry
```

SVG 导出会抽取 `<svg>` 节点并注入 Google Fonts，让它在浏览器、Figma、Illustrator 里都能独立渲染；加 `--system-fonts` 可以跳过字体导入，做成离线文件。PNG 通过 Playwright 以 2× 光栅化，一次性准备：

```bash
pip install playwright && playwright install chromium
```

两种格式都只导出图本身——`-full` 变体里的编辑卡片与页头不会包含在内。想要整页编辑排版的截图，用浏览器打印成 PDF 或整页截图。

`--registry` 是给"可追溯块级分解"模式用的：除了图片，还会输出 `<basename>.registry.json`，把每个块的 `data-block-*` 元数据投影成结构化 JSON。

### 4.5 可选动画

动画默认关闭（`none`），并且**不构成新的视觉类型**。`animation.md` 定义了 `reveal`、`step`、`loop` 三种模式，要求有完整的静态首帧、确定性时序、可用时提供控制器。`prefers-reduced-motion` 下显示完整静态帧并隐藏/禁用播放控件。动画 HTML 必须逐字使用 `template-motion.html` 里那个审核过的控制器——任意或修改过的内联脚本、远程资源、CSS import、可执行 HTML 属性都会被拒绝。

### 4.6 一个端到端场景

假设要给一篇讲"订单服务重构"的文章配图，流程大致是这样：

1. 在项目根放 `.diagram-design`，内容为 `profile: acme`，避免每张图都重新品牌化。
2. 对代理说："帮我画一张订单服务的架构图，节点是 Web、API Gateway、Orders、Postgres、Redis、Stripe；把 Orders 和 Postgres 作为焦点。doc-inline，HTML 格式。"
3. 代理先回一句计划：类型 Architecture，尺寸 `doc-inline`，复杂度预算会砍掉监控与日志两个节点（因为它们不承载这段叙述）。
4. 渲染成 `docs/diagrams/order-service.html`，双击可看。
5. 跑自检：`python3 skills/diagram-design/scripts/self_check.py docs/diagrams/order-service.html`，期望输出 `OK`；要额外确认离线可用就加 `--offline`，它会因为还留着 Google Fonts 链接而失败。
6. 要放进公众号或幻灯片，再 `/diagram-design:export-diagram docs/diagrams/order-service.html --png-only --scale=2`。

整个过程没有打开过 Figma，也没有手写过一行 SVG。

## 五、常见问题与解决方案

**现象：`npx skills add` 装完，代理还是不认识这个技能。**
原因：多个宿主同时扫描了原生根和 `.agents/skills/`，或者安装根不是当前会话读取的目录。
解决：只保留一个发现根。用 `npx skills add` 时选 Symlink，保证所有根指向同一份规范副本；Claude Code 用 `/reload-plugins`，Pi 用 `/reload`，Codex 用 `codex plugin marketplace upgrade diagram-design` 后开新会话。

**现象：Claude Desktop 上传 ZIP 报错。**
原因：Desktop 的技能上传拒绝超过 200 个文件的压缩包，完整技能树超限。
解决：在检出目录跑 `python3 scripts/build-claude-skill-zip.py`，上传 `dist/diagram-design-claude-skill.zip`。这个包已经剔除了 gallery 页面与 dark/full/animated 变体。

**现象：marketplace 装了但一直不更新。**
原因：Claude Code 对第三方 marketplace 默认关闭自动更新；`npx skills add` 的独立安装也不跟随 marketplace。
解决：Claude Code 里 `/plugin` → Marketplaces → diagram-design → Enable auto-update；独立安装用 `npx skills update diagram-design`。

**现象：`/export-diagram --png-only` 失败。**
原因：PNG 走 Playwright，需要 Chromium 与浏览器二进制。
解决：`pip install playwright && playwright install chromium`。也可以先问代理"run diagram-design doctor"（或 `/doctor`），它会诊断环境但不安装任何包。

**现象：导出的 SVG 在别的机器上字体变了。**
原因：SVG 导出默认注入 Google Fonts；离线环境或内网机器拿不到样式表。
解决：加 `--system-fonts`，并用 `python3 scripts/self_check.py --offline <file>` 验证。想在无网络下仍保留编辑字体，就在本机装 Instrument Serif、Geist、Geist Mono（三者都是 SIL OFL），字体栈会优先命中本地字体。

**现象：同一段提示，两次生成的布局不一样。**
原因：README 明确承认这是真实缺点——输出质量取决于模型，布局有随机性。
解决：把关键约束写进提示（节点清单、焦点、尺寸预设），并要求代理在画之前先口述计划。真要稳定可 diff 的图，回到 Mermaid。

**现象：图里的中文/韩文标签溢出方框。**
原因：Geist 与 Instrument Serif 不含 CJK 字形，宽度预算按字符算是 1em/全角字符，而按"文字系统"粗略估算会漏掉数字、点号。
解决：给 `<text>` 元素扩展字体栈，例如 `'Geist', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif`；标题用 `'Instrument Serif', 'Noto Serif TC', serif`。中文与韩文有 12px 字号下限，放不下就删字，不要缩字号；子标签保持拉丁字母，因为 9px 的 CJK mono 不可读。

**现象：`self_check.py` 报内容越出 viewBox。**
原因：标签宽度超出计算值，或 `min-width` 与 viewBox 宽度不一致；后者还会导致手机上整页横向滚动。
解决：按字符逐个累计宽度（宽字符 1em，拉丁字符 0.60em sans / 0.62em mono），加上内边距后向上取整到 4 的倍数。同时确认 `min-width` 等于 viewBox 宽度，并把 SVG 放进局部的 `overflow-x: auto` 容器。

**现象：`verify_geometry.py` 报错但肉眼看不出问题。**
原因：几何问题常常在缩略图上不可见，比如两条线共享挂点、标签遮罩被后画的节点裁掉。
解决：相信脚本而不是眼睛。按六条连接线规则重构——改流向、重新分组、缩短标签、合并平行边，而不是微调坐标。

**现象：`droid` / `codex` 装了插件但版本没变。**
原因：Droid 按 commit 追踪 Git 插件，不看清单里的显示版本；Codex 只在启动时刷新 marketplace。
解决：Droid 用 `droid plugin marketplace update diagram-design` 再 `droid plugin update diagram-design@diagram-design --scope user`；Codex 用 `codex plugin marketplace upgrade diagram-design`。两者都需要开新会话。

## 六、总结

Diagram Design 值得看的地方，不是"又一个 AI 画图工具"，而是它把"设计品味"当成可执行的规格来写：语义角色替代十六进制、4px 网格、单一强调色、零阴影、九节点预算、六条连接线铁律，每一条都能被脚本验证。这套东西交给代理，产出的图第一次看起来像是有人做过决定，而不是默认样式的堆叠。

它适合谁：写博客、写文档、做汇报，需要一张"要发出去"的图，又不愿意为它打开 Figma 的人；以及需要多客户品牌切换的团队——profile + 标记文件那套设计相当实用。

它不适合谁：图要跟着 Git 每周变化、需要在 PR 里 diff 的团队，Mermaid 仍然是更对的选择；需要精确可编辑画布的协作场景，draw.io 依然无可替代；只想要一张临时草图的人，直接写段话可能更快。

局限也很清楚：产物不是源格式，改图得重新描述或手改 SVG；布局有随机性，输出质量取决于模型；52 种类型意味着选择成本，虽然语义模式那层路由已经缓解了不少。

一个 7.1 万 star 的项目，本质上是把"审美的判断"翻译成了"可以被 lint 的规则"。这件事本身，比它画出来的任何一张图都更值得借鉴。

- 仓库：<https://github.com/cathrynlavery/diagram-design>
- 官网：<https://diagramdesign.dev>
- 在线 Gallery：<https://cathrynlavery.github.io/diagram-design/>
