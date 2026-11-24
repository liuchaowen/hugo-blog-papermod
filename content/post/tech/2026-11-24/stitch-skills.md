---
title: "Stitch Design Skills：把 AI 设计工具接进编码 Agent 的技能库"
date: "2026-11-24T20:15:00+08:00"
description: "Stitch Design Skills 是 Google Labs Code 开源的一套 Agent Skills 与插件集合，围绕 Google Stitch 的 MCP Server，把「生成设计稿 → 提取设计系统 → 产出 React/React Native 代码」串成可重复的流水线。本文拆解它的三层插件架构、Prompt 增强管线、AST 校验闭环与 Baton 循环，并给出各主流编码 Agent 的安装与实战用法。"
author: "Cheman"
slug: stitch-skills
github_repo: google-labs-code/stitch-skills
draft: false
tags: ["Stitch", "Agent Skills", "MCP", "Google Labs", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Stitch Design Skills**（`google-labs-code/stitch-skills`）。它把 Google Stitch 这个 AI 界面设计工具，包装成了一套能被 Codex、Claude Code、Cursor、Gemini CLI 等编码 Agent 直接加载的技能（Skills）与插件（Plugins）。当前仓库有 12,495 star、1,520 fork，主语言 TypeScript，Apache-2.0 协议，最新 release 为 `v1.0`，单日新增约 401 star。本文从架构原理到安装使用，带你完整过一遍。

## 一、项目概述

Stitch Design Skills 由 `google-labs-code` 组织开源，是一组面向 [Google Stitch](https://stitch.withgoogle.com) 的 Agent Skills 和插件集合，遵循 [Agent Skills](https://agentskills.io) 开放标准。它不是又一个 UI 生成模型，而是**给已经有推理能力的编码 Agent 装上一套"设计工种的标准作业程序"**：什么时候调用哪个 MCP 工具、prompt 该怎么写、生成完的 HTML 怎么下载、转成 React 后如何校验。

项目解决的是一段具体的断裂：Stitch 能在浏览器里把一句话变成设计稿，但设计稿落到代码库之间还有大量手工动作——导出 HTML、核对设计 token、拆组件、接路由、保持深色模式一致。这些动作单看都不难，难在每次都做对、每次结果一致。仓库的做法是把它们写成可执行、可校验的流程，交给 Agent 去跑。

核心特性可以概括为六点：

- **三组插件、十六个技能**：`stitch-design` 负责设计侧工作流，`stitch-build` 负责代码生成与构建，`stitch-utilities` 提供 prompt 增强、设计规范生成等辅助能力。
- **跨 Agent 兼容**：同一套技能目录可以装进 Codex、Antigravity、Gemini CLI、Claude Code、Cursor，OpenCode 走手动安装路径。
- **Prompt 增强管线**：把"做个好看的设置页"这类含糊描述，翻译成带平台、页面结构、组件拆解的专业 prompt。
- **设计系统项目级复用**：颜色、字体、圆角等 token 由 `manage-design-system` 统一注入，生成新屏幕时禁止重复声明。
- **AST 级代码校验**：自带 `validate.js`，用 SWC 解析 TSX，检查 Props 接口与硬编码色值，不靠模型自我保证。
- **Baton 循环**：`stitch-loop` 用一份 `.stitch/next-prompt.md` 在多次迭代之间传递"接力棒"，让 Agent 自主生成整站。

从成熟度看，仓库 2026 年 1 月创建，11 月 23 日仍有推送，迭代节奏稳定；license 为 Apache-2.0，可商用。README 里有一句需要留意的话：**This is not an officially supported Google product.** 它出自 Google Labs，但不属于官方支持产品，也不在 Google 开源漏洞奖励计划范围内。生产环境使用要有这个预期。

与"让 Agent 自由发挥写页面"的做法相比，这类项目的差异不在模型能力，而在**约束的位置**：把约束从 prompt 里的口头叮嘱，下沉到目录结构、脚本和校验器里。

## 二、技术原理

### 分层结构

整个仓库是"市场 → 插件 → 技能"三层，和 VS Code 的 extension marketplace 思路类似，只是装载对象换成了 Agent。

```text
stitch-skills/
├── .agents/plugins/marketplace.json   # 市场清单：声明 3 个插件及其本地路径
├── plugins/
│   ├── stitch-design/
│   │   ├── plugin.json                # 插件元数据（name/version/license/keywords）
│   │   └── skills/
│   │       ├── generate-design/
│   │       ├── code-to-design/
│   │       ├── manage-design-system/
│   │       ├── extract-design-md/
│   │       ├── extract-static-html/
│   │       └── upload-to-stitch/
│   ├── stitch-build/
│   │   └── skills/
│   │       ├── react-components/
│   │       ├── react-native/
│   │       ├── react-vite-dashboard/
│   │       ├── remotion/
│   │       └── shadcn-ui/
│   └── stitch-utilities/
│       └── skills/
│           ├── design-md/
│           ├── enhance-prompt/
│           ├── site-md/
│           ├── stitch-loop/
│           └── taste-design/
```

`marketplace.json` 里每个插件带一个 `policy` 字段，`installation: AVAILABLE` 表示可安装，`authentication: ON_INSTALL` 表示安装时触发认证——这套字段是 Codex 插件市场能直接读懂它、并弹出安装流程的原因。

### 技能包的四件套

每个技能目录都遵循同一套骨架，这不是随意约定，而是 Agent Skills 标准的"渐进式披露"（progressive disclosure）设计：

```text
skills/<skill-name>/
├── SKILL.md           # 任务说明与阶段门禁，唯一必读入口
├── scripts/           # 可执行脚本：下载、校验、上传
├── resources/         # 知识库：清单、模板、style-guide.json
└── examples/          # 黄金样例：可对照的正确输出
```

Agent 启动时只读 `SKILL.md` 的 front matter——`name` 和 `description` 决定它是否被召回；命中后才展开正文；正文里再按需引用 `references/` 与 `examples/`。以 `generate-design` 为例，它的头部是这样声明能力边界的：

```yaml
---
name: stitch::generate-design
description: >-
  Generate new screens from text prompts or images, edit existing screens
  with prompts and design system tokens, and generate design variants using
  Stitch MCP.
allowed-tools:
  - "stitch*:*"
  - "Bash"
  - "Read"
  - "Write"
  - "web_fetch"
---
```

`allowed-tools` 是一层容易被忽略的治理机制：`stitch*:*` 匹配任意前缀的 Stitch MCP 工具，`Bash`/`Read`/`Write` 给文件与命令能力，没有 `WebSearch`、没有任意网络写入。技能能做什么，在元数据里就写死了。

### 机制一：命名空间发现

MCP 工具在不同宿主里的前缀并不统一，可能是 `stitch:`、`stitch__`，也可能是别的。所以几乎所有技能的第一步都是同一句：先 `list_tools`，拿到真实前缀，再用 `[prefix]:get_screen` 这样的形式调用。这个设计牺牲了一次工具调用的开销，换来的是技能文本不必绑定某个宿主的命名习惯。

### 机制二：Prompt 增强管线

`generate-design` 强制在调用生成工具前跑一条四步管线：

1. **分析上下文**：用 `list_projects` 找 `projectId`，找不到就 `create_project`；用 `list_design_systems` 查项目是否已有设计系统。
2. **术语升级**：查 `references/design-mappings.md`，把"好看的头部"替换成"带玻璃拟态、居中 Logo 的吸顶导航栏"。
3. **结构化**：按固定模板输出——整体意图、`PLATFORM`、`PAGE STRUCTURE`（Header / Hero / Primary Content / Footer）。
4. **回显 AI 反馈**：把返回的 `outputComponents`（文字描述与建议）呈现给用户，而不是自己编一段总结。

其中最关键的取舍是**生成 prompt 里禁止出现颜色、字体、圆角**。原因写在 SKILL.md 的 CAUTION 块里：这些 token 已经由 `manage-design-system` 在项目级绑定，如果在 prompt 里再写一遍，会与项目主题冲突，产生"设计系统是蓝色、生成出来是紫色"的漂移。只有**编辑**已有屏幕时，才允许写十六进制色值做精确微调。

```json
{
  "projectId": "...",
  "prompt": "[Your Enhanced Prompt]",
  "designSystem": "assets/...",
  "deviceType": "DESKTOP"
}
```

`deviceType` 的可选值是 `MOBILE`、`DESKTOP`、`TABLET`，三个枚举，没有第四种。

### 机制三：AST 校验闭环

`stitch-build` 下的 `react-components` 是最能体现"不信任模型自觉"的一个技能。它把流程切成四个阶段，每阶段都有 GATE（门禁），Phase 1 不完成不许进 Phase 2。

生成结束后，校验不靠人眼，靠 `scripts/validate.js`：

```javascript
import swc from '@swc/core';

const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{3,8}\b/;

const ast = await swc.parse(code, { syntax: "typescript", tsx: true });
// 遍历 AST：
// - TsInterfaceDeclaration 且名称以 Props 结尾 → hasInterface = true
// - JSXAttribute 的 className 字符串里命中 HEX_COLOR_REGEX → 记一条 tailwindIssues
```

它检查两件事：每个组件（包括页面）是否有 `[ComponentName]Props` 接口；`className` 里是否出现硬编码色值。用 SWC 而不是正则扫全文，是因为注释和普通字符串里的 `#fff` 不该误报——只有真正进入 JSX 属性、进入 Tailwind 类名的色值才算违规。

配套的架构规则同样是硬约束：可复用 UI 模式必须拆到 `src/components/`，事件与业务逻辑进 `src/hooks/`，静态文案与图片地址进 `src/data/mockData.ts`，所有 `href="#"` 必须换成 React Router 的 `<Link>`。最后这条来自一个很具体的教训：Stitch 生成的底部导航用 `md:hidden`，桌面端根本看不见，如果 Logo 不可点击，用户就没有回首页的路径。

### 机制四：Baton 循环

`stitch-loop` 用"接力棒"解决多页站点生成中的上下文断裂。约定三个文件：

| 文件 | 作用 |
|---|---|
| `.stitch/SITE.md` | 站点宪法：愿景、Stitch Project ID、已有页面清单、路线图 |
| `.stitch/DESIGN.md` | 视觉规范：颜色、字体、间距、圆角、创意自由度 |
| `.stitch/next-prompt.md` | 接力棒：本次要生成哪个页面、完整 prompt |

每次迭代读棒、生成、集成到 `site/public/{page}.html`、修资源路径、接导航，然后**把下一棒写回文件**。Agent 之间不需要共享对话历史，状态全在磁盘上。这是把"长任务"降解成"一串短任务"的经典手法，代价是每轮都要重新读 SITE.md 与 DESIGN.md，token 成本上升。

### 为什么用 Markdown 而不是代码

整套流程完全可以用一个 TypeScript 编排器实现，但作者选择了 Markdown + 少量脚本。原因是宿主碎片化：Codex 的插件清单、Claude Code 的 skill 目录、Cursor 的 workspace 规则，格式都不一样，唯一共同的载体是自然语言。把流程写成 SKILL.md，一份内容可以在五个宿主里复用；把流程写成 SDK，就得维护五个适配层。脚本只保留那些"模型做不好"的部分——带重定向与 TLS 握手的下载、AST 解析、文件上传。

## 三、安装与快速开始

### 环境要求

- **Stitch MCP Server**：必须先按 [官方 MCP 设置文档](https://stitch.withgoogle.com/docs/mcp/setup/) 完成注册，拿到 MCP endpoint 与凭据。技能本身不含模型能力，没有这个 Server，装完也调不动。
- **Node.js 与 npx**：`npx plugins` / `npx skills` 两条安装路径都依赖它。
- **一个支持的编码 Agent**：Codex、Antigravity、Gemini CLI、Claude Code、Cursor，或手动安装的 OpenCode。

README 没有给出具体的 Node 版本下限，也没有列操作系统依赖，这里不替它编数字。按常规 LTS 版本准备即可，装不上时优先怀疑 Node 版本过旧。

### 方式一：安装完整插件（推荐）

Codex 用户先把仓库注册为插件市场，再按需装插件：

```bash
codex plugin marketplace add google-labs-code/stitch-skills --ref main \
  --sparse .agents/plugins \
  --sparse plugins/stitch-design \
  --sparse plugins/stitch-build \
  --sparse plugins/stitch-utilities
```

三个 `--sparse` 是可选项，作用是只检出这几个目录，克隆更快；去掉就会拉全仓库。仓库目前只有 `plugins/` 和 `.agents/` 两个主要目录，全量克隆也不算大，但 sparse 在 CI 里更稳。

不想用命令行，可以走 Codex UI：**Settings → Plugin Marketplaces → Add**，Source 填 `https://github.com/google-labs-code/stitch-skills`，Git ref 填 `main`，Sparse paths 选填 `.agents/plugins`、`plugins/stitch-design`、`plugins/stitch-build`、`plugins/stitch-utilities`。

市场注册完成后，三组插件可以任意组合安装：

- **`stitch-design`** — 设计工作流
- **`stitch-build`** — 代码与组件生成
- **`stitch-utilities`** — prompt 与规范辅助

### 方式二：按宿主安装

Claude Code 装到当前项目：

```bash
npx plugins add google-labs-code/stitch-skills --scope project --target claude-code
```

Cursor 装到当前工作区：

```bash
npx plugins add google-labs-code/stitch-skills --scope workspace --target cursor
```

`--scope` 决定落地位置，`--target` 决定目录布局。团队协作时用 `project`/`workspace` 而不是全局，技能会跟着仓库走，换机器不用重装。

### 方式三：OpenCode 手动安装

OpenCode 不认 `npx plugins` 和 `npx skills`，也不认 Codex/Claude 的市场布局，得手工放技能、手工配 MCP。

先复制需要的技能目录：

```bash
mkdir -p .opencode/skills
cp -R plugins/stitch-design/skills/generate-design .opencode/skills/generate-design
# 其他技能同理，逐个复制 plugins/*/skills/ 下的目录
```

OpenCode 也会扫描 `.claude/skills/` 和 `.agents/skills/`，已有这两个目录的可以省一步。要注意命名规则：OpenCode 要求 front matter 的 `name` 是小写 kebab-case，且与目录名一致。像 `stitch::generate-design` 这种带命名空间的名字，需要把 `name` 字段和文件夹一起改成 `generate-design`，否则加载不到。

然后在项目根目录的 `opencode.json`（或 `~/.config/opencode/opencode.json`）里加 MCP 条目：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "stitch": {
      "type": "remote",
      "url": "YOUR_STITCH_MCP_URL",
      "enabled": true
    }
  }
}
```

`YOUR_STITCH_MCP_URL` 换成 Stitch MCP 设置流程给出的 endpoint。另外，技能正文里写的工具名是 Claude/Codex 风格（`web_fetch`、`run_command`），在 OpenCode 里对应 `webfetch`、`bash`，需要按实际工具名替换。

### 方式四：只装单个技能

```bash
npx skills add google-labs-code/stitch-skills
```

按提示勾选需要的技能。README 对此有一句加粗警告：**技能之间存在依赖**，选择性安装必须把依赖一起装上。比如 `generate-design` 在没有设计系统时会转交给 `manage-design-system`，只装前者就会在第二步卡住。

### 验证安装

最直接的验证是让 Agent 列一次工具：

```text
list_tools
```

输出里应当出现带 `stitch` 前缀的条目，例如 `stitch:generate_screen_from_text`、`stitch:list_projects`。看到前缀就说明 MCP 通了；看不到就是 Server 没配好，先回去查认证，不要在技能层排查。

第二步验证技能是否被召回：对 Agent 说"列出你可用的 Stitch 技能"。能报出 `generate-design`、`react-components` 这些名字，说明 SKILL.md 的 `description` 已被索引。装完不生效，多数时候是目录层级多套了一层，Agent 只扫固定深度。

## 四、使用方法与实战

### 场景一：从一句话生成屏幕

不要在 prompt 里写颜色。下面这个例子来自 README 的示例话术：

```text
Make a browse tab for a mobile app for romance and date night ideas.
```

Agent 收到后不会直接调生成工具，而是先跑增强管线：查项目、查设计系统、把"browse tab"翻译成"带筛选 chips 的卡片瀑布流 + 底部 Tab 栏"，再补上 `PLATFORM: Mobile, Mobile-first` 和四段式页面结构，最后才发请求。生成结束，它会把 Stitch 返回的文字描述与改进建议原样呈现，并把 HTML 与截图下载到 `.stitch/designs/`。

编辑已有屏幕是另一条路径，此时允许精确色值：

```text
Edit the login screen to add a 'Remember Me' checkbox and change the button color to blue.
```

SKILL.md 对编辑的要求是"位置、视觉、结构"三件事说清楚，并且明确一条：除非布局从根本上错了，否则不要重新生成，走增量编辑。重新生成的代价是丢失此前所有微调。

### 场景二：把现有前端代码变成设计稿

`code-to-design` 干的是反向工程：从 React/Vue 代码里提取 HTML 结构、生成或复用设计系统、上传到指定项目。

```text
Upload the frontend code at `/path/to/dashboard` into a Stitch project named 'Dashboard-Migration-2026'.
```

链路里有两个配套技能：`extract-static-html` 负责把运行中的页面抓成自包含 HTML（CSS 与图片全部内联），`extract-design-md` 负责从源码里扫出设计系统写成 `.stitch/DESIGN.md`。后者按技术栈分了五份参考文档——`react-tailwind.md`、`vue.md`、`angular.md`、`svelte.md`、`plain-css.md`，Agent 按项目实际情况选一份读，而不是把五份全塞进上下文。

### 场景三：设计稿转 React 组件

这是整条链路里约束最密的一段。四阶段对应四类失败：

| 阶段 | 动作 | 对应的失败模式 |
|---|---|---|
| Phase 1 检索 | `list_tools` 找前缀 → `get_screen` 取每个屏幕 → `fetch-stitch.sh` 下载 → 看截图 | 直接读本地旧 HTML，拿到过期设计 |
| Phase 2 样式提取 | 从 HTML `<head>` 的 `tailwind.config` 抽 token，覆写 `resources/style-guide.json` | 沿用上一个项目的配色 |
| Phase 3 架构 | 拆组件、抽 hooks、数据外置、Props 接口、路由接线、深色模式 | 单文件巨石页、`href="#"` 死链 |
| Phase 4 执行 | `npm install` → 建 mockData → 套模板 → 接入口 → 校验 | 没编译就宣布完成 |

Phase 1 的下载必须走脚本，不能用手上的 `web_fetch`：

```bash
bash scripts/fetch-stitch.sh "[htmlCode.downloadUrl]" ".stitch/designs/{page}.html"
```

截图要先把宽度拼上去，否则拿到的是低清缩略图：

```bash
bash scripts/fetch-stitch.sh "[screenshot.downloadUrl]=w{width}" ".stitch/designs/{page}.png"
```

`fetch-stitch.sh` 本体只有一行有效逻辑，但这一行包含 `-L -f -sS --connect-timeout 10 --compressed`：跟随重定向、HTTP 错误返回非零、静默但保留错误、10 秒连接超时、压缩传输。SKILL.md 里点明了原因——Google Cloud Storage 域名上，Agent 内置的抓取工具经常失败，而这个脚本处理了必要的重定向与安全握手。

校验命令按文件跑，覆盖 `src/components/` 与 `src/pages/` 下所有 `.tsx`：

```bash
npm run validate <file_path>
npx tsc --noEmit
```

Phase 4 有一个值得称道的设计：跑校验脚本、起 dev server、做浏览器视觉审计，都必须**先问用户**。前三个阶段是"必须做"，第四阶段的验证是"可选且需授权"。这条边界划得很清醒——读文件、写代码是本地操作，起服务、开浏览器是环境副作用。

### 场景四：让 Agent 自己搭完整站点

`stitch-loop` 适合"给我一个五页作品集网站"这类任务。先准备三份文件，然后每一轮只做一页。

接力棒文件长这样：

```markdown
---
page: about
---
A page describing how jules.top tracking works.

**DESIGN SYSTEM (REQUIRED):**
[Copy from .stitch/DESIGN.md Section 6]

**Page Structure:**
1. Header with navigation
2. Explanation of tracking methodology
3. Footer with links
```

`page` 字段直接决定输出文件名，所以它必须和路由、导航项对齐。正文里的设计系统块是从 `DESIGN.md` 第 6 节复制的——这是唯一允许在 prompt 里出现设计规范的地方，因为 loop 走的是 HTML 直出，不经过项目级 design system 注入。

每次迭代的落点是 `site/public/{page}.html`，同时要修相对路径、把新页面挂进全局导航、保持页头页脚一致。如果装了 Chrome DevTools MCP，还可以加一步视觉比对：起 `npx serve site/public`，导航到新页面截图，和 Stitch 导出的截图对照，再关掉服务。

### 端到端演练：迁移一个 Dashboard

把上面的碎片拼起来，一次完整迁移是这样的：

1. `extract-design-md` 扫 `/src`，产出 `.stitch/DESIGN.md`，人工过一遍 token 是否合理。
2. `manage-design-system` 上传 `DESIGN.md`，在 Stitch 项目里生成主题。
3. `extract-static-html` 抓 `http://localhost:3000/dashboard`，得到自包含 HTML。
4. `upload-to-stitch` 把 HTML 推进项目 `projects/987654321`，作为重设计的基线。
5. `generate-design` 基于基线做三版变体，选一版定稿。
6. `react-components` 拉取全部屏幕，产出组件、hooks、mockData，跑 `validate` 与 `tsc`。
7. 人工接真实 API，替换 mockData，跑一遍深色模式与移动端。

第 7 步不要交给 Agent。接口契约、鉴权、错误态这些信息不在设计稿里，硬让模型猜只会产出看起来能跑、实际全是假数据的代码。

### 参数速查

| 参数/字段 | 取值 | 说明 |
|---|---|---|
| `deviceType` | `MOBILE` / `DESKTOP` / `TABLET` | 生成屏幕的目标设备 |
| `designSystem` | `assets/...` | 项目级设计系统 ID，查到才传 |
| `projectId` | 字符串 | 由 `list_projects` 或 `create_project` 获得 |
| `allowed-tools` | `stitch*:*`、`Bash`、`Read`、`Write`、`web_fetch` | 技能可用的工具白名单 |
| `page` | kebab-case 文件名 | Baton 文件里的页面标识，决定输出路径 |

## 五、常见问题与解决方案

**现象：Agent 说找不到 `generate_screen_from_text`。**
原因：Stitch MCP Server 没注册成功，或工具前缀与技能里写的不一致。
解决：先 `list_tools` 看真实前缀，再用 `[prefix]:generate_screen_from_text` 调用。列表里完全没有 stitch 相关条目，就回到 MCP 设置流程检查 endpoint 与凭据，技能层改什么都没用。

**现象：`npx plugins add` 执行成功，但 Agent 不加载技能。**
原因：目录层级不对，或 front matter 的 `name` 与目录名不匹配。
解决：确认技能落在宿主约定的扫描路径（`.claude/skills/`、`.opencode/skills/`、`.agents/skills/`）；OpenCode 下必须把 `stitch::generate-design` 改成 `generate-design`，文件夹同名。多套一层 `skills/skills/` 也会导致扫描不到。

**现象：下载 Stitch 的 HTML 或截图失败，报 TLS/SNI 错误或空文件。**
原因：资源在 Google Cloud Storage 上，Agent 内置抓取工具处理不了重定向与握手。
解决：改用技能自带的 `bash scripts/fetch-stitch.sh "<url>" "<output>"`，URL 一定要加引号。仍然失败就看 URL 是否过期——Stitch 的下载链接有时效。

**现象：截图分辨率很低，看不清细节。**
原因：Google CDN 默认返回缩略图。
解决：在截图 URL 后拼 `=w{width}`，`width` 取屏幕元数据里的真实宽度，再交给 `fetch-stitch.sh`。

**现象：`npm run validate` 报组件缺少 Props 接口。**
原因：校验器用 SWC 解析 AST，要求存在名称以 `Props` 结尾的 `TsInterfaceDeclaration`，且带 `Readonly`。
解决：给每个组件文件（页面也算）补一个 `Readonly<XxxProps>` 接口。这是最高频的失败项，`architecture-checklist.md` 里也单独列了。

**现象：校验报 `className` 里有硬编码颜色。**
原因：直接写了 `text-[#1a73e8]` 这类任意值，而不是用 `style-guide.json` 映射出的主题类。
解决：把颜色收进主题 token，组件里只写 `text-primary` 这类语义类。深色模式也要用 `dark:` 变体，而不是再写一套色值。

**现象：生成出来的界面配色和项目的设计系统不一致。**
原因：生成 prompt 里带了颜色、字体或圆角描述，与项目级 token 打架。
解决：生成类 prompt 只写布局、内容、结构；设计规范统一由 `manage-design-system` 在项目级注入。只有编辑单个屏幕时才允许写十六进制色值。

**现象：只装了 `generate-design`，跑到一半提示需要设计系统。**
原因：技能之间有依赖，`generate-design` 在项目没有设计系统时会转交 `manage-design-system`。
解决：按 README 的提醒，选择性安装时把依赖链一起装上；不确定就整组装 `stitch-design`。

**现象：技能要覆盖已有的 `.stitch/designs/*.html`，把手工改过的文件冲掉。**
原因：重新同步时没有确认本地文件状态。
解决：这是设计上的保护点——SKILL.md 明确要求 Agent 在发现本地文件已存在时**必须先问**是刷新还是复用。如果 Agent 没问就覆盖，说明它没遵守门禁，应该在会话里纠正，而不是事后从 git 恢复。

**现象：整页生成能跑，但 nav 点了没反应。**
原因：Stitch 导出的 HTML 里链接全是 `href="#"` 占位符。
解决：按 Phase 3 的规则，把所有 `href="#"` 换成 React Router 的 `<Link to="/route">`，底部导航与侧边栏都要接 `useLocation()` 做激活态。同时把顶栏 Logo 做成 `<Link to="/">`——底部导航在桌面端是 `md:hidden`，Logo 是唯一的回首页入口。

## 六、总结

Stitch Design Skills 值得看的地方，不是它能让 Agent 生成多漂亮的界面，而是它示范了**如何把一门手艺拆成 Agent 能稳定执行的工序**。SKILL.md 定义流程与门禁，`references/` 提供按需加载的知识，`scripts/` 兜住模型不擅长的脏活，`validate.js` 用 AST 做最终裁决。四层各司其职，没有一层在指望模型"这次一定听话"。

它适合谁：已经在用 Stitch 做设计探索、又需要把结果落进 React 或 React Native 代码库的团队；需要跨多个编码 Agent 统一工作流的平台团队；想研究 Agent Skills 工程化写法的开发者——这个仓库的目录约定和门禁设计，本身就是一份可抄的范本。

不太适合谁：没有配 Stitch MCP 的个人项目，装完也调不动；只需要一次性生成几个静态页面的场景，走 Baton 循环和四阶段校验属于过度工程；对 Google 官方支持有硬要求的合规环境，README 已声明它不是 officially supported product。

局限也明显：强依赖 Stitch 的 MCP 接口与返回结构，接口一变，多个技能要同步改；Baton 循环每轮重读 `SITE.md` 与 `DESIGN.md`，长站点的 token 成本不低；十六个技能的能力边界有重叠，新用户容易在"该用 `design-md` 还是 `extract-design-md`"之间迷路。

后续值得关注两个方向：一是 `stitch-build` 里 `react-vite-dashboard`、`remotion` 这类偏垂直的技能会不会继续扩张，形成"设计稿 → 特定技术栈"的矩阵；二是这套 SKILL.md 写法会不会被更多 MCP 生态的项目借鉴，变成 Agent 工具分发的通用形态。目前看，`v1.0` 的目录结构已经足够稳定，适合拿来当自己写技能时的参考骨架。

项目地址：<https://github.com/google-labs-code/stitch-skills>
