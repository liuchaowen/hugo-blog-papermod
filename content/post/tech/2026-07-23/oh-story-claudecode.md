---
title: "oh-story-claudecode：把网文写作工业化的开源 AI Skill 包"
date: 2026-07-23
description: "oh-story-claudecode 是一套覆盖扫榜、拆文、写作、去 AI 味、封面生成全流程的网文写作 Skill 包，原生适配 Claude Code、OpenCode、OpenClaw、Codex 等多端 AI 编程环境，用文件系统把长篇设定、大纲、正文、追踪拆开维护，让 AI 也能稳定产出可商业化的网文。"
author: "Cheman"
slug: oh-story-claudecode
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 网文写作, AI, Skill]
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

**开篇引导段**（1-2句，介绍项目背景，不可跳过，不可出现 `#` 标题）：
今天在 GitHub Trending 上看到一个有意思的项目：**oh-story-claudecode**，它把专业网文作者的"扫榜—拆文—写作—去 AI 味"方法论打包成一套可复用的 AI Skill，让你在 Claude Code / OpenClaw 等环境里直接用自然语言开书、日更、审稿。

## 一、项目概述

`oh-story-claudecode`（作者 worldwonderer）是一套**网文写作 Skill 包**，覆盖长篇小说与短篇小说的完整生产链路：扫榜选材、拆文学习、商业化写作、去 AI 味、封面图生成。它的核心方法论可以浓缩成一句话：

> **套路 = 确定性的情绪满足**

围绕这条主线，项目提出专业作者的方法论三步走：

1. **扫榜**：分析热门榜单，洞察题材、人设、切入点。
2. **拆文**：拆解大纲节奏与剧情素材，建立个人模块库。
3. **商业化写作**：运用钩子、爽感、期待感等核心技巧。

整个工作流围绕四条线展开——爆款逆向、剧情模块化重组、上下文状态分层管理、人机协同。

**核心特性：**

- 内置 13 个 Skill（story-setup / story-long-write / story-short-analyze / story-deslop 等），覆盖从环境部署到定稿的全流程。
- 原生适配 7 类运行环境：Claude Code、OpenCode、ZCode、OpenClaw、Codex CLI、Reasonix、workbuddy；通用 Web AI 环境也能按 skills 路径使用。
- 由 7 个专业 Agent 协作（story-architect 用 Opus 做架构、narrative-writer 用 Sonnet 写正文、consistency-checker 用 Haiku 查一致性等），按需加载 100+ 份写作理论参考文件，不预占上下文。
- 部署后自动生效 7 个 Hook（会话开始/结束、上下文压缩前后、git commit 校验、写正文前的大纲守卫），把"先搭大纲再写正文"变成硬约束。

## 二、技术原理

### 架构设计：用文件系统取代"记忆"

长篇动辄几十万字、几百章，设定冲突、伏笔断线、时间线对不上——写到最后全靠记忆硬撑，迟早翻车。项目的核心洞察是：**对话只负责创作，不负责记忆**。因此用文件系统把不同维度拆开独立维护：

```
{书名}/
├── 设定/       世界观 / 角色 / 势力 / 关系 / 题材定位
├── 大纲/       大纲.md · 卷纲_第N卷.md · 细纲_第NNN章.md
├── 正文/       第NNN章_章名.md
├── 对标/       对标参考（从拆文库同步的结构化子目录）
├── 追踪/       上下文.md · 伏笔.md · 时间线.md · 角色状态.md
└── 参考资料/   story-researcher 输出的研究资料
```

`.active-book` 文件记录当前活跃书目的相对路径，Hook 和写作 Skill 据此定位当前项目。这种"分层追踪"让日更时能快速加载上下文，也便于在 compact（上下文压缩）前后用快照恢复状态。

### 多端适配的统一内核

v0.7.0 起，Hook 核统一到共享 node 核，并加了"六端 parity 锁"——保证 Claude Code、OpenCode、ZCode、OpenClaw、Codex、Reasonix 六端行为一致。`story-setup` 通过 `target_cli` 参数选择目标环境，把 skills、commands、hooks、agents 部署到对应目录（如 `.claude/`、` .codex/`、` .zcode/`、`skills/`），并安全合并已有配置。

### 去 AI 味闸口的机器化

v0.7.0 把"去 AI 味"做成确定性闸口：写后正文会自动扫描确定性毒句式；写下一章前新增"毒句式欠账门"——这是一个无状态、node 缺失放行的检查，并支持用 `<!-- 去味:跳过 -->` 显式豁免。这意味着去 AI 味从"主观感觉"变成了可复跑、可审计的 lint。

### 数据流

典型长篇小说创作数据流：

```
/story-setup（部署 hooks/agents/AGENTS）
   → /story-long-scan（扫榜选材）
   → /story-long-analyze（拆文，产出 节奏.md / 情绪模块.md / 文风.md）
   → /story-long-write 日更（读 对标/{书名}/剧情 消费拆文资产）
   → /story-deslop（去 AI 味 lint）
   → /story-review（4 Agent 多视角审稿）
```

## 三、安装与快速开始

**方式一：直接让 AI 装**

对 Claude Code / OpenCode / ZCode / OpenClaw / Codex 等环境说：

```
安装这个 skill https://github.com/worldwonderer/oh-story-claudecode
```

**方式二：命令行（npx）**

```bash
npx skills add worldwonderer/oh-story-claudecode -y -g
```

`-g` 全局安装，所有目录可用；去掉 `-g` 只装到当前目录。更新时重新执行同一条命令即可。

> **注意**：Codex 在 Windows 上需要 git 开启 `core.symlinks=true`，否则 symlink 失效；ZCode 的 Hook 依赖 PATH 中的 `node`。

**最简运行示例：**

```bash
# 1. 在写作项目根部署环境（会写入 hooks / agents / AGENTS）
/story-setup

# 2. 新开（或刷新）会话，让 custom agent 注册生效
# 3. 直接开书
/story-long-write 日更
```

部署后判断 Agent 是否生效：新会话里跑 `/story-review`，报告头是 `Effective Mode: full/lean` 即注册成功；是 `Fallback: ... -> solo` 说明当前运行时未暴露该 agent。

## 四、使用方法与实战

**自然语言即可触发**：

- 「帮我开书」→ `story-long-write`
- 「这篇太 AI 了」→ `story-deslop`
- 「把我的书导进来」→ `story-import`
- 「沈栀现在什么状态」→ 自动 spawn `story-explorer` agent

**导入续写实战**：如果你已经写了一部分小说，推荐先 `/story-setup` 部署，再 `/story-import` 把已发布章节（如第 1–20 章、约 3.7 万字）逆向重建为可续写的工程，最后 `/story-long-write 写第21章` 无缝接上。逐章提取的"事件/角色/设定/伏笔/时间线"会反推成续写 bible。

**拆文实战**：用 `/story-long-analyze` 深度模式分析《盘龙》前 23 章，会自动产出 `文风.md`、`节奏.md`、`情绪模块.md`、角色档案、剧情线等结构化资产；下游日更写作会从 `对标/{书名}/剧情/` 读取这些素材，避免文风、节奏、情绪模块偏离对标书。

## 五、常见问题与解决方案

**Q1：部署后新 Skill 没出现？**
新开 OpenClaw / Claude Code 会话，或等待 watcher 刷新。`story-setup` 把 skills 复制到项目 `skills/`，需要重新加载会话才能发现。

**Q2：升级后 hooks / agents 没同步？**
每版变更见 `CHANGELOG.md`。如果项目已跑过 `/story-setup`，建议在项目根重跑一次以同步 hooks / agents / references，并新开会话。

**Q3：某些运行时没有 custom agents / PreCompact？**
ZCode 3.3.4、OpenClaw Phase 1、Reasonix Phase 1、generic 路径默认走 skills + solo fallback；相关流程会明确降级为 solo/direct，compact 后由 `SessionStart` 恢复上下文，不影响基本写作。

**Q4：去 AI 味的外部检测（如朱雀）怎么用？**
`story-deslop` 的本地检查是写作 lint：blocking 只限确定性句式/标点问题；朱雀等外部检测只作自测参考，不替代人工读感。

**Q5：多 Agent 协作前必须要部署吗？**
是的——7 个专业 agent 由 `/story-setup` 写入项目 `.claude/agents/` 或 `.codex/agents/*.toml`。Claude Code / Codex 在会话启动时更稳定地注册 custom agent，所以"先部署、再新开会话"是关键步骤。

## 六、总结

`oh-story-claudecode` 把原本高度依赖个人经验的网文生产，拆成了可复用、可审计、可协作的标准化流程，并用文件系统 + Hook + 多 Agent 的方式解决了 AI 写长文最头疼的"遗忘"和"跑偏"问题。它对多端 AI 编程环境的统一适配也做得相当扎实。如果你正用 Claude Code / OpenClaw 之类工具做内容创作，这套 Skill 包值得一试——作者甚至说"这套 skill 现在能让我度过找工作的过渡期"，是个有真实产出的项目。

- GitHub：<https://github.com/worldwonderer/oh-story-claudecode>
- 交流：Telegram 群 <https://t.me/ohstoryclaudecode> / GitHub Discussions
