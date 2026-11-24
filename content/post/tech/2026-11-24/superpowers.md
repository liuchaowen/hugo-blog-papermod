---
title: "Superpowers：给编码 Agent 装上完整软件开发方法论"
date: "2026-11-24T11:20:00+08:00"
description: "Superpowers 是 Jesse Vincent（Prime Radiant）开源的一套 Agent 技能框架与开发方法论，用 15 个可组合 skill 把头脑风暴、写计划、TDD、子代理开发和代码评审串成闭环。本文拆解它的注入机制与技能体系，并给出 Claude Code、Cursor、Codex、Gemini CLI 等主流 harness 的安装与实战用法。"
author: "Cheman"
slug: superpowers
github_repo: obra/superpowers
draft: false
tags: ["Superpowers", "AI Agent", "Claude Code", "TDD", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Superpowers**（`obra/superpowers`）。它解决的不是"Agent 会不会写代码"，而是"Agent 会不会按工程纪律写代码"——先问清需求，再出设计，再拆计划，再红绿重构，最后评审收尾。本文从架构原理到安装使用，带你完整过一遍。

项目由 Jesse Vincent 及 Prime Radiant 团队开源，采用 MIT License，主语言统计为 Shell，当前版本 `v7.0.2`，仓库创建于 2025 年 10 月 9 日，GitHub 上的 star 数已超过 32.5 万。它本身几乎不含"运行时代码"，核心资产是一批 Markdown 写成的 skill，以及把 skill 注入各家编码 Agent 的适配层。

## 一、项目概述

Superpowers 的定位可以一句话概括：**一套面向编码 Agent 的可组合技能库，加上一套强制它们按顺序使用的软件开发方法论**。装好之后，你不需要记住任何"魔法指令"，Agent 在识别到"要做一个功能"时，会自己退后一步，先问你想做什么、为什么做，而不是直接开写。

核心特性：

- **自动触发的技能体系**：每个 skill 都是一份带 YAML front matter 的 `SKILL.md`，`description` 字段就是触发条件，Agent 在动手前先做技能匹配。
- **完整的需求澄清流程**：`brainstorming` 会把模糊的口头需求逼成一份可评审的设计文档，分块展示，逐段确认。
- **计划可执行到"傻瓜级"**：`writing-plans` 产出的任务被拆到 2~5 分钟粒度，每个任务都写明精确文件路径、完整代码和验证步骤。
- **两种执行模式**：`subagent-driven-development`（每个任务派一个全新子代理 + 逐任务双阶段评审，最彻底）与 `executing-plans`（单上下文内联执行 + 最后整体评审，最省钱）。
- **强制 TDD**：`test-driven-development` 立下铁律——没有先失败的测试，就不许写生产代码；先写了就删掉重来。
- **系统化排障**：`systematic-debugging` 规定四阶段根因流程，禁止"猜一个修复试试"。
- **跨 harness 移植**：同一套 skill 同时支持 Claude Code、Codex CLI/App、Cursor、Gemini CLI、Copilot CLI、OpenCode、Kimi Code、Qwen Code、Devin、Factory Droid、Pi、Hermes、Muse、Antigravity 等十余种 Agent 运行环境。

成熟度方面，仓库活跃度很高（`pushed_at` 为 2026-11-03），有正式的 release 标签和版本递增脚本，插件清单分布在 `.claude-plugin/`、`.codex-plugin/`、`.cursor-plugin/`、`.gemini-extension.json`、`.kimi-plugin/`、`.opencode/`、`.pi/` 等目录中，说明它把"多端适配"当成一等公民在做，而不是事后补丁。

和常见的"提示词模板仓库"相比，差异在两点：一是它强调 **process skills 优先于 implementation skills**——先定方法，再谈实现；二是它把技能做成了**可被 Agent 自动检索的资产**，而不是需要用户手动复制粘贴的文本。

## 二、技术原理

### 2.1 整体架构

Superpowers 的结构非常轻：没有守护进程，没有数据库，没有自建推理服务。它由三层组成。

```
┌─────────────────────────────────────────────┐
│  Harness 适配层                              │
│  .claude-plugin / .codex-plugin / .pi / ... │
│  hooks.json → SessionStart 注入              │
└───────────────────┬─────────────────────────┘
                    │ 启动时写入上下文
┌───────────────────▼─────────────────────────┐
│  引导层 using-superpowers                    │
│  "有任何可能相关就必须调用 skill"             │
└───────────────────┬─────────────────────────┘
                    │ 按 description 匹配
┌───────────────────▼─────────────────────────┐
│  技能层 skills/*/SKILL.md（15 个）           │
│  流程技能 + 实现技能 + 元技能                 │
└─────────────────────────────────────────────┘
```

第一层负责"让 Agent 看得见技能"，第二层负责"让 Agent 愿意用技能"，第三层才是具体方法论。

### 2.2 启动注入：SessionStart Hook

这是整个系统能"自动生效"的关键。以 Claude Code 为例，`hooks/hooks.json` 注册了一个 `SessionStart` 钩子：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ]
  }
}
```

`matcher` 覆盖了三种时机：新会话启动、`/clear` 清空上下文、以及上下文压缩（compact）之后。第三种最容易被忽略——很多"技能用着用着就不灵了"的问题，本质是压缩把引导内容挤掉了，而 Superpowers 在压缩后会重新注入。

`hooks/session-start` 是一个 Bash 脚本，它做三件事：定位插件根目录、读取 `skills/using-superpowers/SKILL.md` 全文、把内容做 JSON 转义后包进 `<EXTREMELY_IMPORTANT>` 标签输出。脚本里有两处工程细节值得一读：

- 不用 `dirname`，而是用 `${0%[/\\]*}` 手写路径切分。原因是 Claude Code 的 `SessionStart:startup` 钩子可能在 `PATH` 尚未修复时执行（对应 issue anthropics/claude-code#43127）。
- 不用 `cat`、不用 `$(< file)` 子 shell、不用 `$(...)` 命令替换。注释写得很直白：每次 fork 在 Windows Git Bash 下要花几十毫秒，启动路径上不能这么花。

这类细节说明作者真的在 Windows、macOS、Linux 三端跑过，而不是只写了个 Linux 脚本就发版。

### 2.3 技能发现：description 即触发器

每个 `SKILL.md` 的头部是一段极短的 YAML：

```yaml
---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---
```

`description` 不是给人看的简介，是给模型看的**路由条件**。写得越具体，误触发越少。`brainstorming` 的 description 甚至直接写了"任何创造性工作之前必须使用"，并列举了软件、演讲、商业、装修等场景——这是在扩大召回面；而 `using-superpowers` 里专门放了一张"红旗思维"表格，逐条驳斥"这个太简单不用 skill""我先看看代码再说"之类的偷懒理由，属于在提示词层面做**反合理化**设计。

技能之间还有优先级规则：多个技能同时命中时，**流程技能先执行**（brainstorming、systematic-debugging），实现技能后执行。这条规则避免了"还没想清楚就调前端设计技能"的常见错误。

### 2.4 子代理驱动开发

`subagent-driven-development` 是整套方法论里最"重"的一环，也是最值得借鉴的设计。它的核心主张是：**不要用一个上下文干完所有任务**。

流程是：主代理读取计划 → 为每个任务派发一个全新的实现者子代理（附上精确指令与必要上下文，绝不继承主会话历史）→ 子代理实现、测试、提交、自审 → 主代理派发任务评审（先查是否符合规格，再查代码质量）→ 通过后进入下一任务 → 全部完成后做一次整分支广度评审。

这样做有三个直接收益：子代理上下文干净，不会被前面的试错污染；主代理的上下文被保留下来做协调，不会因为读了太多代码而爆掉；每个任务都有独立的质量闸门，问题在最小范围内被拦下。

配套的规则也很硬：任务之间**不许停下来问"要不要继续"**，遇到歧义要自己做裁决并记进 ledger（`Ruling: <决定> — <理由> — <错了的代价>`），只有四类事情可以中断——不可逆/破坏性操作、安全敏感动作、工作区之外的副作用（合并、推共享分支、发布）、以及计划烂到每条路都是猜。

同一份计划也可以用 `executing-plans` 内联执行：一个上下文做完所有任务，最后只做一次整体评审。官方明确说了取舍——子代理模式更彻底但更贵，内联模式便宜但风险集中。这个诚实的成本说明，比很多"全能框架"的营销话术可信。

### 2.5 为什么用 Markdown 而不是代码

整套方法论没有一行"调度代码"，全部是自然语言 + 少量 Mermaid/Graphviz 流程图。这是刻意的取舍：模型的能力边界在快速变化，用代码写死的流程很快会过时；而自然语言写的流程约束，模型自己就能理解、裁剪、组合。代价是**执行的一致性依赖模型自觉**，所以才有 `using-superpowers` 里那些近乎偏执的强制措辞，以及"违反字面就是违反精神"的声明。

## 三、安装与快速开始

Superpowers 按 harness 分别安装。如果你同时用多个 Agent，需要各装一次。

### 3.1 Claude Code（官方市场）

```bash
/plugin install superpowers@claude-plugins-official
```

如果官方市场不可用，可以走 Superpowers 自己的市场：

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### 3.2 Cursor

在 Cursor Agent 聊天里直接执行：

```text
/add-plugin superpowers
```

也可以在插件市场里搜索 "superpowers"。

### 3.3 Gemini CLI

```bash
gemini extensions install https://github.com/obra/superpowers
```

后续更新：

```bash
gemini extensions update superpowers
```

### 3.4 Codex CLI

打开插件搜索界面：

```bash
/plugins
```

搜索 `superpowers`，选择 `Install Plugin`。Codex App 用户则在侧边栏点 Plugins，在 Coding 分类里找到 Superpowers，点 `+` 按提示操作。

### 3.5 OpenCode

OpenCode 有独立的插件安装机制，即使你在别处装过也要单独装。直接对 Agent 说：

```text
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md
```

详细文档在 `docs/README.opencode.md`。

### 3.6 其他 harness（摘录）

| Harness | 安装命令 |
| --- | --- |
| Antigravity | `agy plugin install https://github.com/obra/superpowers` |
| Devin CLI | `devin plugins install obra/superpowers` |
| Factory Droid | `droid plugin marketplace add https://github.com/obra/superpowers` 后 `droid plugin install superpowers@superpowers` |
| GitHub Copilot CLI | `copilot plugin marketplace add obra/superpowers-marketplace` 后 `copilot plugin install superpowers@superpowers-marketplace` |
| Grok Build CLI | `grok plugin install superpowers@xai-official --trust` |
| Kimi Code | `/plugins install https://github.com/obra/superpowers` |
| Pi | `pi install git:github.com/obra/superpowers` |
| Qwen Code | `qwen extensions install obra/superpowers` |
| Hermes Agent | `hermes plugins install obra/superpowers --enable` |
| Muse | `muse plugins install ./superpowers` 后 `muse plugins approve superpowers` |

### 3.7 验证安装

装完重启会话，然后随便说一句需求，比如 README 里给的验证用例：

```text
Let's make a react todo list
```

一个正常工作的安装，会在写任何代码之前先自动触发 `brainstorming`，开始问你"这个 todo list 给谁用、要解决什么问题"。如果你看到 Agent 直接开始 `npm create vite`，说明引导层没注入成功。

## 四、使用方法与实战

### 4.1 基本工作流

装好之后其实没有"使用方法"——技能是自动触发的。但了解它会走哪七步，能帮你判断 Agent 是不是跑偏了。

1. **brainstorming**：动手前激活，通过提问把真实意图挖出来，再复述给你纠正。小改动在对话里敲定，大项目产出书面设计文档。
2. **using-git-worktrees**：设计通过后激活，在新分支上建隔离工作区，跑项目初始化，确认测试基线是干净的。
3. **writing-plans**：把设计拆成 2~5 分钟粒度的任务，每个任务写清文件路径、完整代码、验证步骤。
4. **subagent-driven-development / executing-plans**：按计划执行，前者每任务一个新子代理 + 逐任务评审，后者内联执行 + 末尾整体评审。
5. **test-driven-development**：实现阶段强制 RED-GREEN-REFACTOR——先写失败测试、亲眼看它失败、写最小实现、看它通过、提交。
6. **requesting-code-review**：任务之间插入评审，按严重程度报告问题，Critical 级直接阻塞进度。
7. **finishing-a-development-branch**：任务完成后验证测试，给出合并/提 PR/保留/丢弃四个选项，清理 worktree。

关键点在第 5 步的措辞：**"看它失败"不是形式主义**。官方原话是"如果你没有亲眼看测试失败，你就不知道它测的是不是对的东西"。所以它会要求你先跑一次确认红灯，而不是写完测试直接假定它有效。

### 4.2 一个端到端场景

假设你要给现有项目加一个"导出 CSV"的功能，对话大致会这样展开：

```text
你：给报表页加个导出 CSV 的按钮。

Agent：（触发 brainstorming）
在动手前我想确认几件事：这个 CSV 主要给谁用——运营自己拉数据，
还是要交给外部客户？如果是后者，列名和编码可能要考虑 Excel 兼容。
另外报表页现在有分页，导出的是当前页还是全部数据？
```

你回答之后，它会复述一遍理解、给出两三种实现路径让你选，然后写设计文档。设计通过后，`writing-plans` 会把工作拆成类似这样的任务：

```markdown
### Task 3: 实现 CSV 序列化函数

**Files:**
- Create: `src/lib/csv.ts`
- Test: `src/lib/csv.test.ts`

- [ ] 写失败测试：字段含逗号时应加引号
- [ ] 运行 `npm test csv`，确认失败
- [ ] 实现最小序列化逻辑
- [ ] 再跑，确认通过
- [ ] 提交
```

接着 `using-git-worktrees` 会建一个独立 worktree，`subagent-driven-development` 派子代理逐任务实现并评审。整个过程你可能几十分钟不需要介入——README 里说"Agent 自主工作几个小时不偏离计划"并不罕见。

### 4.3 常用进阶配置

| 配置项 | 作用 | 说明 |
| --- | --- | --- |
| `SUPERPOWERS_DISABLE_TELEMETRY` | 关闭可视化伴随功能的遥测 | 设为任意真值即可；同时尊重 Claude Code 的 `DISABLE_TELEMETRY` 与 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` |
| 计划保存路径 | 覆盖默认计划位置 | 默认 `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`，用户偏好优先 |
| `skills/writing-skills/SKILL.md` | 自定义新技能的规范 | 新增/修改技能必须按此流程并做行为测试 |
| `scripts/bump-version.sh` | 版本同步 | 版本号记录在 `.version-bump.json`，脚本负责同步各处清单 |

计划文件的头部是固定格式，包含 Goal、Architecture、Tech Stack、Spec 路径和 Global Constraints。这个设计有实际用途：执行阶段的代理是全新上下文，它只能靠这份文档理解"为什么这么做"，所以 Spec 必须随计划一起走。

### 4.4 出问题时怎么排查

Superpowers 自己带了一个诊断技能。当某个会话表现异常——技能该触发没触发、Agent 无视计划、重复劳动、token 烧得离谱——直接说：

```text
figure out what went wrong with superpowers in this session
```

它会调用 `diagnosing-superpowers`，读取会话记录，给出带行号证据的复盘，必要时打包一份脱敏的问题包用于提 issue。要查历史会话就带上 id：

```text
figure out what went wrong with superpowers in session <id>
```

这相当于给 Agent 工作流本身装了一个"黑匣子"，思路挺对——方法论系统最难的就是"它到底有没有按规矩执行"。

## 五、常见问题与解决方案

**现象：装完插件，Agent 还是直接开始写代码。**
原因：引导层没注入，或者会话是在安装之前启动的。解决：重启会话（Claude Code 里 `/clear` 也会重新触发 `SessionStart`）；再用 `Let's make a react todo list` 验证是否会先触发 brainstorming。

**现象：长会话跑到后半程，技能突然不灵了。**
原因：上下文压缩把引导内容挤掉了。Claude Code 的 hook matcher 包含 `compact`，压缩后会重新注入；但 Hermes Agent 没有 post-compaction hook，官方明确说明"第一轮之后发生压缩的长会话会丢失引导"。解决：Hermes 用户遇到技能不触发，直接开新会话。

**现象：在 OpenCode 里装过，换到 Claude Code 还要再装一次？**
原因：各 harness 的插件机制互相独立，Superpowers 是按 harness 分别打包的。解决：每个用到的 harness 各装一次，不要指望共享。

**现象：Windows 下会话启动报错或钩子没执行。**
原因：`SessionStart:startup` 可能在 `PATH` 尚未修复时运行（anthropics/claude-code#43127），早期脚本用 `dirname`/`cat` 会失败。解决：项目已在 `session-start` 中改为纯 Bash 内建实现；若你用的是旧版本，更新到 `v7.0.2` 或更新。

**现象：Git Bash 下启动明显变慢。**
原因：每次命令替换和管道都会 fork，Windows 上单次 fork 几十毫秒，多个钩子叠加就可观。解决：同上，新版本已消除启动路径上的 fork；不要自行在 `session-start` 里加 `$(...)`。

**现象：想让 Agent 跳过 brainstorming 直接写。**
原因：这是设计上不鼓励的路径，但确实有合理场景（明确的小改动、一次性脚本）。解决：在指令里显式说明"这是小改动，跳过设计直接做"，用户指令优先级高于技能；或直接给出足够具体的需求，让 brainstorming 判定"信息已完备"从而快速通过。

**现象：想给项目贡献一个新 skill，PR 被拒。**
原因：维护者明确表示**一般不接受新技能贡献**，且任何技能改动必须同时兼容所有支持的 Agent。此外不接受"别人提了 issue、你让 Agent 自动生成修复"的 PR。解决：先在已有 issue 下补充你的复现报告，按 `skills/writing-skills/SKILL.md` 的流程做行为测试，等维护者明确要求再提 PR。

**现象：担心遥测泄露项目信息。**
原因：brainstorming 的可视化伴随功能会从官网加载 logo，请求里带 Superpowers 版本号。解决：官方说明该请求不含项目、提示词或 Agent 信息；如需彻底关闭，设 `SUPERPOWERS_DISABLE_TELEMETRY`。

## 六、总结

Superpowers 值得关注的地方，不是它"让 Agent 更聪明"，而是它把**软件工程里那些人类常偷懒的环节**——问清需求、写设计、拆任务、先写测试、逐任务评审——变成了 Agent 无法绕开的流程约束。它的实现极轻（Markdown + 一个启动钩子），但约束很硬（铁律、红旗清单、评审闸门），这种"轻实现 + 硬约束"的组合是它最值得借鉴的设计。

适合谁：已经在用 Claude Code、Cursor、Codex 等 Agent 做真实项目、并且被"Agent 写完一坨不可维护代码"折磨过的开发者；需要把 Agent 纳入团队工程规范的团队。不太适合：只想让 Agent 快速生成一次性脚本的人——完整流程在这种场景下确实是负担，而且官方也不掩饰这一点，专门提供了 `executing-plans` 这种便宜路径。

局限也明显：执行一致性最终仍依赖模型是否"愿意"遵守技能描述，跨 harness 的行为差异需要各自适配，而且技能本身的质量只能靠 eval 和行为测试兜底，没有形式化保证。但作为一套把方法论产品化的尝试，它目前是这个方向上做得最系统的开源项目之一。

项目地址：<https://github.com/obra/superpowers>
