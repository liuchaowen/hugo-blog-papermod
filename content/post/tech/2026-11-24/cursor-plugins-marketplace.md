---
title: "Cursor Plugins：157 个官方插件的开放市场，如何用一份 JSON 定义 AI 编码助手的全部能力"
date: "2026-11-24T14:00:00+08:00"
description: "Cursor 官方开源的插件市场仓库，用一套 JSON Schema 把 skills、rules、agents、commands、hooks 与 MCP server 打包成可安装的插件。本文拆解 marketplace/plugin 双层清单、变量注入与 hooks 循环机制，并给出从安装现成插件到自建插件的完整路径。"
author: "Cheman"
slug: cursor-plugins-marketplace
github_repo: cursor/plugins
draft: false
tags: ["Cursor", "AI Agent", "插件系统", "MCP", "TypeScript", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Cursor Plugins**（`cursor/plugins`）。它不是又一个提示词合集，而是把"AI 编码助手该怎么工作"这件事做成了可分发、可校验、可版本化的插件格式——157 个插件、两层 JSON 清单、一套 JSON Schema，外加一个跑在 CI 里的校验脚本。本文从仓库结构讲到 hooks 循环的实现，带你完整过一遍这套插件体系。

## 一、项目概述

`cursor/plugins` 是 Cursor 官方维护的插件仓库，仓库描述写得很直白：**Cursor plugin specification and official plugins**——它同时承担两个角色，一是插件规范（schema + 校验器），二是官方插件市场（marketplace）。

从抓取到的元数据看，项目创建于 2026 年 1 月 23 日，当前约 18.9k star、2k fork，主语言 TypeScript，最近一次推送就在今天凌晨。一个不到一年积累到这个量级的仓库，说明"给编码 agent 装插件"已经从极客玩法变成了日常需求。

### 仓库里到底有什么

打开根目录，第一眼看到的是一堆平级的插件目录，加上几个基础设施目录：

```
plugins/
├── .cursor-plugin/marketplace.json   # Cursor 侧市场索引
├── .claude-plugin/marketplace.json   # Claude 侧市场索引
├── schemas/                          # plugin.json / marketplace.json 的 JSON Schema
├── scripts/validate-plugins.mjs      # CI 用的校验器
├── .github/workflows/                # 校验流水线
├── create-plugin/  ralph-loop/  orchestrate/  thermos/  pstack/ ...
└── third_party/                      # 140 个第三方集成插件
```

按 `marketplace.json` 统计，当前共 **157 个插件**，其中 140 个位于 `third_party/`，剩下 17 个是 Cursor 自己或社区作者贡献的"方法论型"插件。这个比例很有意思：绝大多数插件不是"给 agent 加一个工具"，而是"给 agent 换一套工作方式"。

### 核心特性

- **双层清单（marketplace + plugin）**：市场只负责索引，插件自己带 `plugin.json` 声明元数据与组件路径，两者解耦。
- **五类组件统一打包**：`skills`、`rules`、`agents`、`commands`、`hooks` 都能在同一个插件里共存，用 glob 或路径声明。
- **MCP 一等公民**：`mcpServers` 字段可以直接指向 `mcp.json`，也可以内联写配置，支持 `${VAR}` 形式的环境变量注入。
- **变量即 Schema**：插件可以声明 `variables`，用 JSON Schema 描述用户需要填什么，客户端据此渲染配置界面并做校验。
- **多客户端版本门控**：`minClientVersions` 按客户端（`cursor`、`grokbot`）分别声明最低版本，甚至支持填 `"never"` 直接对某个客户端隐藏。
- **强校验**：`schemas/plugin.schema.json` 设了 `additionalProperties: false`，写错字段名不会静默失败，CI 直接报错。
- **CI 自动化**：PR 改动清单、schema 或脚本时自动跑 Ajv 校验、harness 树一致性检查与 pstack 脚本测试。

### 插件都在做什么

从 README 的插件表能看出几条清晰的产品线：

| 方向 | 代表插件 | 作用 |
|:--|:--|:--|
| 插件开发 | `create-plugin` | 脚手架 + 提交前质量检查 |
| 循环式开发 | `ralph-loop` | 同一提示词反复喂回，直到任务完成 |
| 云端并行 | `orchestrate` | 把大任务拆给多个 cloud agent |
| 代码审查 | `thermos`、`pr-review-canvas` | 深度审计、按重要性分组的 review 画布 |
| 知识沉淀 | `continual-learning`、`teaching` | 从对话记录增量更新 AGENTS.md |
| 文档与 SDK | `docs-canvas`、`cursor-sdk` | 文档画布、TypeScript SDK 集成指南 |
| 第三方集成 | `third_party/*` | GitHub、Salesforce、Zoom 这类 SaaS 连接器 |

值得注意的是 `third_party` 里大量条目（Gmail、Google Drive、Salesforce、QuickBooks……）本质上是 MCP server 的封装：插件不写业务逻辑，只负责把远端 MCP 端点、鉴权头和用户变量拼装好。这让"接一个 SaaS"从写代码变成了填配置。

### 成熟度判断

明确标注的 license 是 MIT，插件目录内多数附有独立 LICENSE。没有 release，也没有 tag，说明仓库走的是"主干即发布"的滚动模式：所有插件版本号写在各自的 `plugin.json` 里（例如 `create-plugin` 是 `1.0.0`），市场清单不锁定版本。好处是迭代快，代价是使用者拿到的永远是 `main` 上的最新态。

## 二、技术原理

这套体系最值得看的地方不是插件数量，而是它如何用很小的规范面撬动很大的能力面。整个架构可以分成四层：

```
┌─────────────────────────────────────────────┐
│ 客户端 (Cursor / Grok Bot)                   │
│  读取 marketplace.json → 展示 → 安装          │
└──────────────────┬──────────────────────────┘
                   │ 安装某个 plugin
┌──────────────────▼──────────────────────────┐
│ 插件清单 .cursor-plugin/plugin.json          │
│  元数据 + 组件路径 + variables + mcpServers   │
└──────────────────┬──────────────────────────┘
                   │ 按路径加载
┌──────────────────▼──────────────────────────┐
│ 组件层                                       │
│  skills/  rules/  agents/  commands/  hooks/ │
└──────────────────┬──────────────────────────┘
                   │ 运行时
┌──────────────────▼──────────────────────────┐
│ 执行层：文件读写 / shell / MCP 调用 / 子 agent │
└─────────────────────────────────────────────┘
```

### 机制一：两层清单，职责分离

市场清单 `marketplace.json` 只做三件事：声明自己是谁、列出插件条目、给每条一个 `source`。

```json
{
  "name": "cursor-plugins",
  "owner": { "name": "Cursor", "email": "plugins@cursor.com" },
  "metadata": {
    "description": "Official Cursor plugin marketplace: developer tools, framework rules, MCP integrations, and agent skills"
  },
  "plugins": [
    {
      "name": "create-plugin",
      "source": "create-plugin",
      "description": "Scaffold and validate new agent plugins."
    }
  ]
}
```

注意 `source` 的语义：schema 里写的是"相对市场根目录的路径**或远程 URL**"。也就是说这套格式天然支持联邦式市场——你完全可以维护一个只列自己团队插件的 `marketplace.json`，把 `source` 指向私有仓库，而不必把代码塞进官方仓库。

插件清单则是自描述的。以 `create-plugin` 为例：

```json
{
  "name": "create-plugin",
  "displayName": "Create Plugin",
  "version": "1.0.0",
  "description": "Scaffold and validate new agent plugins. Handles directory setup, manifest generation, and pre-submission quality checks for the marketplace.",
  "author": { "name": "Cursor", "email": "plugins@cursor.com" },
  "license": "MIT",
  "logo": "assets/avatar.png",
  "keywords": ["create-plugin", "cursor-plugin", "marketplace", "plugin-authoring"],
  "category": "developer-tools",
  "tags": ["meta", "authoring", "templates"],
  "skills": "./skills/",
  "rules": "./rules/",
  "agents": "./agents/"
}
```

`skills`、`rules`、`agents`、`commands` 的类型都是 `string | string[]`，既可以给目录，也可以给 glob。这一点设计得很实用：插件作者不必维护一份"文件清单"，新增一个 skill 只要放进目录就自动被发现，manifest 不会因为加文件而漂移。

而 `additionalProperties: false` 是这个 schema 里最狠的一刀。它意味着 `skill`（少了 s）、`mcpServer`（少了 s）这类拼写错误不会变成"配置被忽略"的灵异事件，而是在校验阶段就炸掉。对一个会被上百个贡献者提交的仓库来说，这是把 review 成本前移的关键。

### 机制二：variables —— 把配置界面交给 JSON Schema

第三方集成插件最麻烦的部分是鉴权：token 从哪来、缺了怎么办、怎么提示用户。这套规范的做法是把 `variables` 定义成一段 JSON Schema：

```json
{
  "variables": {
    "type": "object",
    "properties": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": {
        "type": "string",
        "title": "GitHub personal access token",
        "description": "Fine-grained or classic PAT from https://github.com/settings/tokens with the repo scopes you want the agent to use."
      }
    },
    "required": ["GITHUB_PERSONAL_ACCESS_TOKEN"]
  },
  "mcpServers": "./mcp.json"
}
```

客户端拿到这段 schema，就能自动渲染出一个带标题、带说明、带必填校验的表单，而不需要为每个插件写定制 UI。用户填完之后，值以环境变量形式注入到 MCP server 的配置里：

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

`${VAR}` 的替换发生在启动 MCP 连接之前，所以 token 不会出现在插件源码里，也不需要用户去改一个被 git 管理的文件。这是"配置即 schema、密钥即变量"的典型做法，比在 README 里写"请编辑 config.json 填入你的 token"要安全得多。

### 机制三：hooks —— 让 agent 自己把自己叫醒

`ralph-loop` 是整个仓库里最能说明"插件不只是提示词"的例子。它要实现的是 Geoffrey Huntley 提出的 Ralph Wiggum technique：**同一个提示词反复喂回，让 agent 看着自己上一轮的改动继续迭代，直到满足完成条件**。

实现只靠两个 hook：

```json
{
  "version": 1,
  "hooks": {
    "afterAgentResponse": [
      { "command": "./hooks/capture-response.sh" }
    ],
    "stop": [
      { "command": "./hooks/stop-hook.sh", "loop_limit": null }
    ]
  }
}
```

- `afterAgentResponse` 在每次模型回复后触发，扫描回复里有没有 `<promise>COMPLETE</promise>` 这样的完成标记；
- `stop` 在一轮结束时触发，如果没检测到 promise 且没到迭代上限，就把原始提示词作为 `followup_message` 发回去，开启下一轮。

状态放在 `.cursor/ralph/scratchpad.md`，用 YAML front matter 记录 `iteration`、`max_iterations`、`completion_promise`：

```markdown
---
iteration: 1
max_iterations: 20
completion_promise: "COMPLETE"
---

Build a REST API for todos with CRUD operations, input validation, and tests.
```

这个设计的精妙之处在于**它不依赖模型记住上下文**。每一轮都是新的一次调用，agent 通过工作区的文件系统和 git 历史看到自己上一轮做了什么——"prompt never changes. The code does."。换句话说，循环的连续性由磁盘保证，而不是由上下文窗口保证，这规避了长对话必然遇到的上下文膨胀与遗忘问题。

### 机制四：校验流水线

`scripts/validate-plugins.mjs` 做的事比想象中多。它不只是跑一遍 Ajv：

1. 用 `schemas/marketplace.schema.json` 校验市场清单；
2. 遍历每个条目，检查 `source` 目录存在、`.cursor-plugin/plugin.json` 存在、内容通过插件 schema；
3. 对 Claude 侧清单做同样的事，并额外校验 `name` 与 `.claude-plugin/plugin.json` 中的 `name` 一致；
4. **跨清单版本一致性检查**：同一个插件如果同时有 `.cursor-plugin/plugin.json`、`.claude-plugin/plugin.json` 和根级 `plugin.json`，所有出现的 `version` 必须相同，否则报错。

第 4 条是最容易踩的坑，也是这个仓库同时维护两套市场索引（Cursor 与 Claude）的必然代价。没有这个检查，一次版本号漏改就会导致两个客户端装到不同版本的插件，且症状极难复现。

CI 侧的门槛也设得克制而有效：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- name: Install dependencies
  run: npm install --no-save ajv ajv-formats fast-check@4.5.3
- name: Validate plugin definitions
  run: node scripts/validate-plugins.mjs
- name: Check generated pstack harness trees
  run: node scripts/generate-pstack-harness-trees.mjs --check
- name: Test pstack skill scripts
  run: node --disable-warning=ExperimentalWarning --test pstack/skills/*/scripts/test/*.test.ts
```

`--no-save` 说明这个仓库刻意不引入 `package.json` 和 lockfile：校验依赖是 CI 的临时产物，插件本身不该背 Node 依赖。对一仓库"配置 + Markdown"的项目而言，这是正确的取舍。

## 三、安装与快速开始

### 环境要求

- 一个支持插件的 Cursor 客户端。部分插件在 `plugin.json` 里声明了最低版本，例如 `third_party/github` 要求 `"cursor": "3.13.0"`。
- 如果要本地跑校验：Node.js 22（CI 用的版本），以及 `ajv`、`ajv-formats`。
- 如果要跑 `orchestrate` 这类云端编排插件：需要 `bun` 和 `CURSOR_API_KEY`。

### 安装现成插件

README 里所有插件统一用一条斜杠命令安装：

```
/add-plugin create-plugin
```

换成任意插件名即可，例如：

```
/add-plugin ralph-loop
/add-plugin third_party/github
```

安装后客户端会读取该插件 manifest 里声明的组件路径，按需加载 `skills`、`rules`、`agents`。带 `variables` 的插件会先弹出配置表单，填完才建立 MCP 连接。

### 本地校验一个插件仓库

想自己改插件或者提 PR，先在本地复现 CI：

```bash
git clone https://github.com/cursor/plugins.git
cd plugins
npm install --no-save ajv ajv-formats fast-check@4.5.3
node scripts/validate-plugins.mjs
```

全部通过时输出：

```
All plugins validated successfully.
```

失败时会逐条打印 `ERROR:` 前缀的问题，并以非零码退出，方便直接接进 pre-commit。

### 最小插件骨架

一个能被市场识别的插件，最小形态只需要两个文件：

```
my-plugin/
├── .cursor-plugin/
│   └── plugin.json
└── skills/
    └── my-skill/
        └── SKILL.md
```

`plugin.json` 里 `name` 是唯一必填字段，但实际提交时建议把元数据补齐：

```json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "0.1.0",
  "description": "What this plugin does in one sentence.",
  "author": { "name": "Your Name" },
  "license": "MIT",
  "skills": "./skills/"
}
```

`name` 必须满足 `^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$`——小写字母数字开头结尾，中间允许 `-` 和 `.`。`My_Plugin`、`my plugin`、`-my-plugin` 都会被 schema 拒绝。

然后在 `marketplace.json` 的 `plugins` 数组里加一条：

```json
{
  "name": "my-plugin",
  "source": "my-plugin",
  "description": "What this plugin does in one sentence."
}
```

保存后重新跑校验，通过即代表结构合法。

## 四、使用方法与实战

### 场景一：用 ralph-loop 把"测试全绿"变成可收敛的目标

这是仓库里最适合上手、也最能体现 agent 工作流差异的插件。安装后直接在对话里发起：

> Start a ralph loop: "Build a REST API for todos. CRUD operations, input validation, tests. Output COMPLETE when done." --completion-promise "COMPLETE" --max-iterations 50

两个参数的含义：

| 参数 | 作用 | 默认值 |
|:--|:--|:--|
| `--max-iterations <N>` | 达到 N 轮后强制停止 | 无限 |
| `--completion-promise <text>` | 触发完成的标记词 | 无 |

它会依次做这些事：写 `.cursor/ralph/scratchpad.md`、开始实现、跑测试、看到失败、修、再跑。每一轮的结束由 `stop` hook 拦截，判断是否该继续。

提示词的质量直接决定收敛速度。README 明确建议**写可验证的完成条件**，而不是"把它写好"：

```markdown
Build a REST API for todos.

When complete:
- All CRUD endpoints working
- Input validation in place
- Tests passing (coverage > 80%)
- Output: <promise>COMPLETE</promise>
```

还有一个容易被忽略的护栏：SKILL.md 里写死了"只有条件真的全部成立时才允许输出 `<promise>`"，并建议永远设置 `max_iterations`。原因是模型有动机用假 promise 逃离循环——这是把 agent 的激励结构写进规范的一个小样本。

### 场景二：给 agent 接上 GitHub，但不把 token 写进仓库

安装 `third_party/github` 后，客户端会要求填 `GITHUB_PERSONAL_ACCESS_TOKEN`。这个值通过 `variables` 的 schema 校验，最终以 `Authorization: Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}` 的形式注入到 `https://api.githubcopilot.com/mcp/` 的连接头里。

配置完成后，agent 就能在对话里直接操作仓库、issue、PR 和 Actions，而不需要你在 prompt 里粘贴任何凭据。想换 token 只改变量，不动插件。

如果连接失败，第一个要查的就是这个变量是否为空——`${VAR}` 未定义时，服务端收到的是 `Bearer ` 加空字符串，表现为 401 而不是"缺少配置"。

### 场景三：orchestrate 把大任务拆到云端并行

`orchestrate` 面向的是"一个 agent 干不完"的任务。前置条件是 `bun` 和 API key：

```bash
export CURSOR_API_KEY="cursor_..."
cd skills/orchestrate/scripts
bun install
```

然后从仓库根目录发起：

```bash
bun skills/orchestrate/scripts/cli.ts kickoff "<goal>" \
  [--repo <url>] [--ref main] [--model claude-opus-4-7] \
  [--slack-channel <id>] [--dispatcher-name "<first name>"]
```

CLI 会打印 `{ agentId, runId, status, url }`，之后由云端的 root planner 自驱：planner 发布任务，worker 完成后向上 handoff，脚本从磁盘和 git 里对账整棵树。README 特别说明这套设计"不依赖长驻 agent 状态"——收敛靠的是产物，不是会话。

Slack 集成是可选的。不设 `SLACK_BOT_TOKEN` 时脚本只打一行日志然后照常运行，正确性不受影响；要开的话需要 `chat:write`、`files:write`、`reactions:read`、`channels:history` 等 scope，其中 `reactions:read` 是用来监听 kickoff 消息上的 🚨（Andon）反应，实现"人工一键叫停"。

### 场景四：把校验接进自己的 CI

如果你的团队维护私有插件市场，可以直接复用这套 schema：

```bash
npm install --no-save ajv ajv-formats
node scripts/validate-plugins.mjs
```

三个断言值得抄进自己的流水线：目录存在、manifest 通过 schema、多份 manifest 版本一致。尤其是最后一条，它能挡住"改了 Cursor 侧忘了改 Claude 侧"这类只在特定客户端才暴露的问题。

### 组件类型速查

| 组件 | 目录约定 | 作用 | 加载方式 |
|:--|:--|:--|:--|
| `skills` | `skills/<name>/SKILL.md` | 教 agent 一套流程 | 按需触发或主动加载 |
| `rules` | `rules/*.mdc` | 常驻约束与规范 | 随会话注入 |
| `agents` | `agents/*.md` | 子 agent 定义 | 被主 agent 调用 |
| `commands` | `commands/*` | 斜杠命令 | 用户显式触发 |
| `hooks` | `hooks/hooks.json` | 生命周期钩子 | 事件驱动 |

这个划分回答了一个常见困惑：**同样是一段 Markdown，为什么有的放 skills 有的放 rules？** 区别在触发方式——rules 是"一直生效的背景约束"，skills 是"满足条件才加载的操作手册"，commands 是"人主动按下的按钮"。放错位置的直接后果是上下文被无谓占用，或者该生效的约束没生效。

## 五、常见问题与解决方案

**现象：`validate-plugins.mjs` 报 `must NOT have additional properties`。**
原因：`plugin.json` 或 `marketplace.json` 的 schema 都设了 `additionalProperties: false`，写了规范里不存在的字段。常见的是把 `mcpServers` 写成 `mcpServer`、把 `skills` 写成 `skill`，或者给 `author` 加了 `url` 字段（`author` 只允许 `name` 和 `email`）。
解决：对照 `schemas/plugin.schema.json` 的 `properties` 白名单逐字核对字段名；确实需要的新字段应先改 schema 再改清单。

**现象：插件名合法但校验失败，提示 pattern 不匹配。**
原因：`name` 的正则是 `^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$`，只允许小写字母、数字、`-`、`.`，且首尾必须是字母或数字。
解决：统一改成 kebab-case；下划线、大写、空格、首尾连字符都会被拒。

**现象：两个客户端装到的插件版本不一致。**
原因：仓库同时维护 `.cursor-plugin/plugin.json` 与 `.claude-plugin/plugin.json`，两边 `version` 没同步。校验脚本会对比所有存在的 manifest 版本，不一致直接失败。
解决：改版本时三处（含根级 `plugin.json`，若存在）一起改；把校验放进 pre-commit，别等 CI。

**现象：插件装上了但斜杠命令/技能不出现。**
原因：`plugin.json` 的 `skills`/`commands` 路径写错，或目录结构与声明不匹配。路径是相对插件根目录解析的，`./skills/` 和 `skills` 等价，但 `../skills` 会指到插件外面。
解决：确认 `source` 目录下确实存在声明的子目录；用 `node scripts/validate-plugins.mjs` 复现，它会先检查目录存在性。

**现象：MCP 工具调用返回 401。**
原因：`variables` 里声明的环境变量没填，`${VAR}` 替换成空串后仍会发出请求；也可能是 PAT 缺少所需 scope。
解决：检查插件配置里的变量是否为空；GitHub 场景下确认 PAT 具备目标仓库的 `repo` 权限。换 token 后需要重连 MCP。

**现象：插件在客户端里搜不到。**
原因：只建了插件目录，没在 `.cursor-plugin/marketplace.json` 的 `plugins` 数组里登记。市场是白名单式的，目录存在不等于可安装。
解决：补一条 `{ "name", "source", "description" }` 条目并重跑校验。

**现象：ralph-loop 停不下来。**
原因：没传 `--max-iterations`，且完成条件写得太模糊（如"make it good"），agent 无法判断何时该输出 promise，于是一直迭代。
解决：始终设置迭代上限；把完成条件写成可机械验证的断言（测试通过、lint 干净、特定命令退出码为 0）。

**现象：`orchestrate` 启动即失败。**
原因：缺 `bun`、缺 `CURSOR_API_KEY`，或 key 不是以 `cursor_` 开头。Slack 相关报错则是 scope 不足或 bot 未被邀请进私有频道。
解决：`bun --version` 确认运行时；`echo $CURSOR_API_KEY` 确认前缀；Slack 场景检查 `chat:write`、`files:write`、`channels:history` 是否齐全。未设 Slack token 时脚本会降级运行，不会因此失败。

**现象：CI 里校验过了，本地却过不了（或反之）。**
原因：CI 固定在 Node 22，且用 `npm install --no-save` 装的是当时最新的 `ajv`；本地 Node 版本或依赖版本不同，错误信息可能不一致。
解决：本地对齐 Node 22，并用与 workflow 相同的安装命令，避免版本漂移带来的假阳性。

## 六、总结

`cursor/plugins` 的价值不在"157 个插件"这个数字，而在于它把 agent 能力封装成了一件**有 schema、有校验、有版本、可联邦**的工程产物。两层清单解决了分发，`variables` 解决了配置与密钥，`hooks` 解决了循环与生命周期，CI 校验解决了多人协作下的一致性——四件事各自都不新鲜，但组合起来是一套相当完整的插件规范。

适合谁：想把团队工作流固化成可复用插件的工程团队；需要给编码 agent 接内部系统、又不想把 token 散落在配置文件里的人；以及想研究 agent 编排模式（循环、并行、审查）的开发者——`ralph-loop`、`orchestrate`、`thermos` 三个插件的源码就是很好的样本。

不适合谁：期待"装完就变强"的用户。这套东西的门槛在于你得先想清楚自己的工作流长什么样；插件只是把流程固化，不会替你设计流程。另外仓库没有 release 与 tag，追 `main` 意味着要接受随时变化，生产环境使用建议自行 fork 并锁定 commit。

值得关注的方向有两个：一是 `source` 支持远程 URL 后，私有市场与团队内分发会怎么演进；二是 `minClientVersions` 里的 `"never"` 开关——它暗示这套清单未来可能承载跨客户端的差异化投放，而不只是版本门控。

项目地址：<https://github.com/cursor/plugins>
