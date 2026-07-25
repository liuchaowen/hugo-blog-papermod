---
title: "Claude Scholar：面向 AI 科研人员的半自动化研究助理工作流"
date: 2026-07-26
description: "深度解析 GitHub Trending 项目 Claude Scholar：基于 Claude Code / Codex CLI / Kimi Code 的半自动化科研助理，覆盖文献综述、实验分析、论文写作、Rebuttal 全流程，含安装与实战指南。"
author: "Cheman"
slug: claude-scholar
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "Claude Code", "AI科研", "Agent", "学术写作"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Claude Scholar**，它把 Claude Code 等 AI 编程 CLI 改造成了一套面向计算机科学与 AI 研究者的"半自动化科研助理"，覆盖从选题、文献综述、实验分析到论文写作与审稿回复的完整科研生命周期。

## 一、项目概述

[Claude Scholar](https://github.com/Galaxy-Dawn/claude-scholar) 由 Galaxy-Dawn 开源（MIT 协议），本质上是一个**面向科研场景的 Agent 配置包**：它不是一个独立软件，而是一整套 skills（技能）、agents（子代理）、commands（斜杠命令）、hooks（钩子）和 rules（规则），安装到 Claude Code、Codex CLI、Kimi Code CLI 或 OpenCode 之后，让这些通用编程助手"变身"为懂科研流程的研究助理。

项目的核心定位非常克制——它**不是**试图取代研究者的"全自动科学家"，而是坚持一个理念：

> 人类决策留在中心，助理只负责加速外围工作流。

也就是说，哪个问题值得研究、哪些论文真正重要、哪些结果有说服力，这些判断仍由人来做；Claude Scholar 负责的是文献整理、笔记结构化、实验统计分析、报告生成、写作润色这些繁重且对结构敏感的部分。

**核心特性一览：**

- **多平台支持**：`main` 分支对应 Claude Code，另有 `codex`、`kimi`、`opencode` 三个分支分别适配 OpenAI Codex CLI、Kimi Code CLI 和 OpenCode
- **7 阶段科研工作流**：选题构思 → ML 项目开发 → 实验分析 → 论文写作 → 自审 → 投稿与 Rebuttal → 中稿后处理
- **40+ skills、14+ agents、30+ commands**：包括 `research-ideation`、`results-analysis`、`ml-paper-writing`、`nature-writing` 等
- **Zotero 集成**：通过 zotero-mcp 实现 DOI/arXiv 论文自动导入、文献集合管理、全文阅读
- **Obsidian 知识库**：以 vault 为核心的项目知识管理，按 `Sources / Knowledge / Experiments / Results / Writing / Daily / Maps` 分区路由
- **证据门控（Evidence Gate）**：通过 `research-contract.md` 约束证据记录与"结论晋升"，弱证据不能直接变成论文里的 claim

## 二、技术原理

### 架构设计：配置即产品

Claude Scholar 的架构思路值得所有做 Agent 应用的人参考——它完全构建在宿主 CLI 的扩展机制之上，自身没有任何运行时：

```text
~/.claude/
├── CLAUDE.md          # 精简核心指令（大文件被拆分为按需加载）
├── skills/            # 40+ 技能：按需触发的领域工作流
├── agents/            # 子代理：literature-reviewer、code-reviewer、paper-miner...
├── commands/          # 斜杠命令：/research-init、/analyze-results、/rebuttal...
├── hooks/             # Node.js 钩子：会话启动、技能强制评估、安全守卫
└── rules/             # 规则：编码风格、安全、实验可复现性
```

几个关键设计决策：

1. **精简常驻上下文**：2026 年 4 月的更新把庞大的常驻 `CLAUDE.md` 替换为紧凑核心指令，技能内容按需渐进加载（progressive disclosure），避免上下文浪费——这与 Anthropic 官方的 skills 设计哲学一致。

2. **跨平台 Hooks 用 Node.js 重写**：早期版本用 Shell 脚本，后来全部重写为 Node.js 以支持 Windows。`security-guard.js` 采用两级拦截（Block + Confirm），灾难性命令直接阻断，危险但合法的命令要求确认。

3. **证据门控的研究契约**：这是最有科研味道的设计。共享的 `research-contract.md` 定义了 Evidence Record（证据记录）、claim strength（结论强度）和 Claim Promotion Gate（结论晋升门）。论文笔记先进 `Sources/Papers`，只有通过验证的结论才能晋升到 `Knowledge` 或 `Writing` 目录——从机制上防止 AI 幻觉污染论文。

4. **安装器的状态管理**：`setup.sh` 是备份感知的增量更新器，会把被覆盖的文件备份到 `~/.claude/.claude-scholar-backups/<timestamp>/`，保留用户已有的 `CLAUDE.md`（仓库版本装为 `CLAUDE.scholar.md` 侧车文件），并写入 `.claude-scholar-install-state` 记录安装归属，卸载时只删除自己安装的文件，不猜测所有权。

### 核心工作流：可追溯的研究路径

Claude Scholar 把研究工作路由为一条可追溯的链路：

```text
question → evidence → experiment → analysis → claim → writing
```

每个阶段都要保留"已知什么、不确定什么、下一步决策是什么"。例如实验分析环节的 `results-analysis` skill 采用 **blocker-first 门控**：在产出任何结论前，先锁定分析单元、主指标、随机种子/折数、数据来源和比较族，然后才运行 t-test / ANOVA / Wilcoxon 等严格统计检验并生成真实的科学图表。

### 配套生态

作者还配套开源了两个 Python 包并封装为 `publication-chart-skill`：

- **pubfig**：出版级科学图表生成
- **pubtab**：出版级表格与 Excel↔LaTeX 工作流

写作侧则集成了 nature-skills 系列（`nature-writing` / `nature-polishing` / `nature-response` / `nature-data`），覆盖 Nature 风格的章节起草、润色、审稿回复和数据可用性声明。

## 三、安装与快速开始

### 环境要求

- [Claude Code](https://github.com/anthropics/claude-code)（或 Codex CLI / Kimi Code CLI / OpenCode，切换对应分支）
- Git；Windows 用户需在 Git Bash 或 WSL 中运行安装器
- 可选：Python + uv、Zotero + zotero-mcp、Obsidian

### 完整安装（推荐）

```bash
git clone https://github.com/Galaxy-Dawn/claude-scholar.git /tmp/claude-scholar
bash /tmp/claude-scholar/scripts/setup.sh
```

后续更新与卸载：

```bash
cd /tmp/claude-scholar
git pull --ff-only && bash scripts/setup.sh   # 更新
bash scripts/uninstall.sh                      # 安全卸载
```

### 最简安装（只装科研核心子集）

```bash
git clone https://github.com/Galaxy-Dawn/claude-scholar.git /tmp/claude-scholar
mkdir -p ~/.claude/hooks ~/.claude/skills
cp /tmp/claude-scholar/hooks/*.js ~/.claude/hooks/
cp -r /tmp/claude-scholar/skills/ml-paper-writing ~/.claude/skills/
cp -r /tmp/claude-scholar/skills/research-ideation ~/.claude/skills/
cp -r /tmp/claude-scholar/skills/results-analysis ~/.claude/skills/
cp -r /tmp/claude-scholar/skills/results-report ~/.claude/skills/
```

### 插件市场安装

```bash
/plugin marketplace add Galaxy-Dawn/claude-scholar
/plugin install claude-scholar@claude-scholar
```

注意：插件方式无法自动分发 rules，需要手动复制 `rules/*.md` 到 `~/.claude/rules/`。

### 最简运行示例

安装完成后直接用自然语言描述任务即可：

```text
帮我启动一个关于 [你的课题] 的研究，我需要基于文献的计划、
关键开放问题和下一步具体行动。
```

## 四、使用方法与实战

### 基础用法：四个典型起步场景

**1. 启动新课题** —— `/research-init` 会执行文献检索、Zotero 集合整理、生成研究问题卡片（含假设、证据需求、可证伪标准），只有证据门通过才起草 proposal。

**2. 综述 Zotero 文献集**：

```text
Review 我的 Zotero collection「brain foundation models」，
总结主要方向、研究空白和值得跟进的方向。
```

输出按主题分组的论文聚类、文献综合、gap 分析和候选研究方向。

**3. 分析实验结果** —— `/analyze-results` 采用 blocker-first 流程，先验证证据完整性，再跑严格分析，产出 `analysis-report.md`、`stats-appendix.md`、`figure-catalog.md` 和 `figures/` 目录。

**4. 起草论文章节或 Rebuttal** —— `/rebuttal` 把审稿意见分类为接受/辩护/澄清/补实验四种策略，生成带证据锚点的逐点回复，未解决的点显式标记而非掩盖。

### 进阶用法：Obsidian 项目知识库

用 `/kb-init` 在 vault 中初始化 `Research/{project-slug}/` 结构，之后：

```text
/kb-ingest    # 把新材料路由到 Sources 下正确的子目录
/kb-promote   # 把 Daily 笔记中的耐久内容晋升为正式笔记
/kb-lint      # 确定性健康检查，更新 _system/lint-report.md
/kb-sync      # 刷新 registry、索引、Daily 和绑定状态
```

笔记语言可按项目配置（`registry.yaml` 中设置 `note_language: "zh-CN"`），中英文标题在同步时互相兼容。

### 实战建议

- 从**一个具体任务**开始，不要一上来就要求"全部功能"
- 已有自己 `CLAUDE.md` 的用户，要手动合并 `CLAUDE.scholar.md` 中需要的部分——侧车文件**不会**自动生效
- Zotero 和 Obsidian 是可选的，但想要耐久的文献笔记和项目记忆时价值巨大

## 五、常见问题与解决方案

**Q1：安装后我原来的 CLAUDE.md 被覆盖了吗？**
不会。安装器会保留已有的 `~/.claude/CLAUDE.md`，仓库版本安装为 `CLAUDE.scholar.md`；`settings.json` 会备份为 `settings.json.bak`，且保留你的 API key、模型配置和已有 mcpServers。

**Q2：Windows 下安装失败？**
安装脚本是 Bash 脚本，必须在 Git Bash 或 WSL 中运行。Hooks 已全部重写为 Node.js，跨平台运行没有问题，但需要本机有 Node 环境。

**Q3：我用的是 Codex CLI / Kimi Code，装 main 分支不生效？**
`main` 分支只适配 Claude Code。Codex CLI 用户切换到 `codex` 分支（配 `config.toml`），Kimi Code 用户用 `kimi` 分支，OpenCode 用户用 `opencode` 分支。

**Q4：常驻 Hooks 会不会让会话变得很吵？**
早期版本确实有这个问题。近期更新已将 `skill-forced-eval` 改为 6 类分组的静默扫描模式，`session-start` 只显示 top 5，默认 hook 摘要也裁剪了临时文件噪音。若仍嫌多，可以选择性安装，跳过不需要的 hooks。

**Q5：AI 会不会把不可靠的文献结论写进我的论文？**
这正是证据门控要解决的问题：仅有摘要的论文和网页占位符源不能支撑耐久结论；claim 必须通过 Promotion Gate 才能进入 `Knowledge` 或 `Writing`；`citation-verification` skill 还会核对引用元数据与 claim-citation 对齐。当然，最终审核责任仍在人。

## 六、总结

Claude Scholar 是"Agent 配置工程"在垂直领域的一个优秀范本：它没有写一行运行时代码，纯靠 skills/agents/hooks/rules 的精心编排，就把通用编程 CLI 改造成了贴合科研流程的助理。其中最值得借鉴的是三点——**人类决策居中**的产品定位、**证据门控**防止幻觉污染产出的机制设计、以及**备份感知安装器 + 安装状态清单**的负责任分发方式。

如果你是 CS/AI 方向的研究者、研究工程师或研究生，日常在文献、代码、实验和论文之间来回切换，这个项目非常值得一试。项目地址：[github.com/Galaxy-Dawn/claude-scholar](https://github.com/Galaxy-Dawn/claude-scholar)。
