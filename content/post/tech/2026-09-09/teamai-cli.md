---
title: "TeamAI 深度解析：用 Git 把团队的 Skills、规则与知识库同步到每一个 AI Agent"
date: 2026-09-09T20:04:00+08:00
description: "TeamAI 是腾讯开源的团队级 AI 协同 CLI，以 Git 为单一信源，把 Skills、规则、MCP、Hooks 与团队知识库统一分发到 Claude Code、Cursor、Codex 等主流 AI 编程工具，并支持经验自动沉淀与代码知识图谱检索。本文从架构到实战带你全面上手。"
author: "Cheman"
slug: teamai-cli
draft: false
categories: [开源, AI工具]
tags: [GitHub, 开源, AI, Claude Code, 团队协作, MCP]
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

今天在 GitHub Trending 上看到一个有意思的项目：**TeamAI（Tencent/teamai-cli）**。它想解决一个越来越现实的问题——当团队里每个人用着 Claude Code、Cursor、Codex 等不同的 AI 编程工具时，怎么让它们「按团队的方式工作」，并且共享同一套经验与知识，而不是让最佳实践随每一次会话消散。

## 一、项目概述

TeamAI 是腾讯开源的命令行工具（npm 全局安装，`teamai` 命令），官方口号是 **"Make Every Team AI Native"**。它的定位不是又一个 AI 编程助手，而是一个**团队级 AI 协同中台**：把团队的 Skills、规则（rules）、MCP 配置、Hooks、环境变量、Agent 定义乃至文化（culture）统一放在一个 Git 仓库里，再通过 `push → review & merge → pull` 的流转，分发到每个成员本地的各类 AI 工具中。

它要解决的核心痛点很清晰：

- **AI 工具孤岛**：同一个团队，有人用 Claude Code，有人用 Cursor，有人用 Codex，技能与规则无法复用。
- **经验随风飘散**：一次踩坑得来的最佳实践，只存在于某个人的某次对话里，没有沉淀进团队资产。
- **知识无法被召回**：新人/新会话无从得知「团队之前是怎么处理这类问题的」。

核心特性可以归纳为三块（官方称为三层架构）：

1. **Team Execution**——让每个 Agent 都按团队的方式工作（skills / rules / agents / hooks / MCP / env 的同步）。
2. **Team Context（beta）**——让每个 Agent 都「懂」团队（经验召回、学习沉淀、代码知识图谱、团队 Wiki）。
3. **Team Improvement（beta）**——让每一次执行都让团队更聪明（基于摩擦的分享、会话摘要、周报、看板）。

目前已支持的 Agent 非常广：Claude Code、Codex、Cursor、CodeBuddy、WorkBuddy、OpenCode、OpenClaw、Hermes、DeepSeek Harness、Qoder；Git 提供方覆盖 GitHub、GitLab、GitCode、CNB、TGit 及任意私有 Git 服务。

## 二、技术原理

### 2.1 三层架构与「单一信源」

TeamAI 的设计哲学很朴素：**Git 仓库就是团队 AI 能力的单一信源（Single Source of Truth）**。所有可被共享的资源都以约定好的目录结构存放在仓库中：

| 资源 | 仓库中的路径 | 说明 |
|------|--------------|------|
| Skills | `skills/<name>/SKILL.md` | 技能定义 |
| Rules | `rules/*.md` | 团队规则 |
| Docs | `docs/` | 基础项目文档（渐进式披露，非默认全量加载） |
| Agents | `agents/<name>.yaml` | 自定义 Agent |
| Culture | `culture.md` | 使命/价值观/工作原则，注入到每个 Agent 的 `CLAUDE.md`/`AGENTS.md` |
| CLAUDE.md | `claudemd/*.md` | 上下文文件 |
| Env | `env/` | 团队级环境变量与开关（**不要放密钥**） |
| Hooks | `hooks/hooks.yaml` | 生命周期钩子 |
| MCP | `mcp/mcp.yaml` | MCP 服务配置 |
| Packages | `teamai.yaml` | 当前支持 npm 包与 Claude Code 插件 |

当成员执行 `teamai pull` 时，CLI 会把这些资源「翻译」并注入到对应 Agent 的本地目录里——这正是它能跨这么多工具工作的原因：它不直接改 Agent 内核，而是把内容写到各工具约定的配置/技能目录。

### 2.2 工作流：push → review & merge → pull

```text
teamai push → 创建分支 + MR → 评审者 approve + merge
                                      ↓
         SessionStart hook → teamai pull → 同步到本地 AI 工具
```

管理员修改团队资源后 `teamai push` 会开一个 Merge Request，评审合并后，成员下一次会话启动时由 `SessionStart` hook 自动 `pull`，全程无需手动同步。这种「类 Git 协作」的治理模型，让 AI 能力的更新也走起了 Code Review。

### 2.3 知识召回：BM25 + 图谱增强

Team Context 的召回基于 **BM25 + 图谱增强重排（graph-boost re-ranking）**。启用后，`teamai pull` 会把内置的 `teamai-recall` 子 Agent 部署到各工具的 `agents/` 目录；Agent 在任务前调用它，子 Agent 先做相关性预检（`teamai recall --check`），任务与团队知识无关时直接跳过检索，相关时再抽取关键词、执行检索、读取命中源文件并返回结构化摘要。

```bash
teamai recall enable     # 开启：部署 teamai-recall 子 Agent + 注入引导规则
teamai recall disable    # 关闭：移除子 Agent 与规则
teamai recall status     # 查看生效状态（团队默认 + 个人覆盖）
```

### 2.4 代码知识图谱：AST 轨道 + 启发式轨道

`teamai import` 能把源码仓库解析成结构化的知识图谱，存放在 `teamwiki/` 下，供召回做图谱增强：

```bash
teamai import --from-repo https://github.com/org/repo   # 导入单个仓库
teamai import --from-org myorg                          # 批量导入组织下所有仓库
teamai codebase --extract /path/to/repo                 # 本地抽取到 teamwiki/
teamai codebase --lint --output /path/to/repo           # 检查本地图谱健康度
```

图谱存储组件、接口、配置以及跨仓库的 import 边。边的来源有两条并行轨道，**AST 结果在重叠处优先**：

- **AST 轨道**（TypeScript/JavaScript、Python、Go）：用 WASM 版 [tree-sitter](https://tree-sitter.github.io/) 解析 `import`/`require`、调用点、TS `implements` 子句，生成带置信度权重的 `DEPENDS_ON` / `REFERENCES` / `IMPLEMENTS` 边（打标 `code-ast`）。
- **启发式轨道**（全语言，含 Java/Rust）：基于正则的抽取（打标 `code-heuristic`），覆盖 AST 轨道不支持的语言。

WASM 解析器是纯 JavaScript 依赖，**无需本地原生工具链**。若加载失败会回退到启发式轨道并记录 `AST_UNAVAILABLE` 缺口；也可设 `TEAMAI_SKIP_AST=1` 强制只用启发式。

### 2.5 「摩擦」驱动的自动经验沉淀

这是 TeamAI 最有意思的设计之一。会话结束时，`Stop` hook 会按 **friction（摩擦）** 给会话打分——你打断了 AI、纠正了它、拒绝了某次工具调用，或 AI 反复重试失败的工具，都会贡献分数。一次漫长但顺利的会话（很多工具调用、零摩擦）不会触发；一次你真正和问题「搏斗」过的会话才会。

```text
[teamai] This session may contain a problem worth documenting: you interrupted the AI twice, the AI retried failing tools 8 times.

Task: Fix duplicate project-level Hook injection

Consider running /teamai-share-learnings to summarize what you learned and share it with your team.
```

随后 `/teamai-share-learnings` 技能会把会话总结成一份学习文档直接推送到团队仓库。每个会话最多提示一次；团队可在 `teamai.yaml` 里用 `sharing.contributeHint.enabled: false` 关掉提示而保留其余 Stop hook 逻辑。

## 三、安装与快速开始

### 环境要求

- **Node.js 20+**（构建配置 `tsup.config.ts` 中 `target: 'node20'`，`package.json` 里 `@types/node` 为 `^20.17.0`）。
- 一个团队共享的 Git 仓库（GitHub / GitLab / GitCode / CNB / TGit 或私有 Git 服务），并**授予成员写权限**。

### 安装

```bash
npm install -g teamai-cli
```

当前发布版本为 `0.22.0`，采用 ESM 构建（`"type": "module"`，入口 `dist/index.js`）。

### 团队管理员 / 单人用户

新建一个共享经验仓库，**给成员授予写权限**，然后：

```bash
teamai init https://github.com/yourorg/yourrepo
```

若还没有团队仓库，可以从预置了生产级 skills / rules / 评审 Agent 的模板起步：浏览 [teamai-hub](https://github.com/teamai-hub) 组织，点击 **Use this template** 后用 `teamai init` 初始化。

### 团队成员

```bash
# 项目级初始化（默认，资源装在项目目录下）
cd /path/to/my-project
teamai init https://github.com/yourorg/yourrepo

# 用户级初始化（资源装在 ~/ 下）
teamai init https://github.com/yourorg/yourrepo --scope user
```

初始化完成后，**每一次 AI 会话都会自动拉取管理员发布的最新 skills / rules 等 Harness 更新**，无需手动同步。

## 四、使用方法与实战

### 基础命令

| 命令 | 作用 |
|------|------|
| `teamai init` | 初始化：OAuth 登录、关联仓库、注册成员、注入 hooks |
| `teamai pull` | 拉取团队资源并注入本地 AI 工具 |
| `teamai push` | 把本地资源推到分支并开 Merge Request |
| `teamai status` | 显示本地与团队仓库的差异 |
| `teamai doctor` | 诊断配置问题 |

### 分发控制：roles / tags / source

这是「千人千面」的关键，管理员配置一次，所有成员 `pull` 即生效：

- **Roles**（`teamai roles`）：定义「角色 → 命名空间」映射，让每个成员只同步自己角色需要的 skills。
- **Tags**（`teamai tags`）：给 skills / rules 打标签，成员按标签订阅。
- **Sources**（`teamai source`）：订阅额外的技能仓库——其他团队的公开仓库，或组织内的共享/公开仓库，订阅后自动同步。

### 经验分享实战

会话中踩到坑后，直接运行：

```bash
/teamai-share-learnings   # 在 Agent 内触发，总结并推送到团队仓库
teamai contribute         # 等价 CLI 入口，分享会话经验
```

### 知识召回实战

开启召回后，可以像搜索团队大脑一样检索：

```bash
$ teamai recall "port conflict"
[1/2] MR review caught a port-conflict bug ★1 [user]
Author: member-a | Score: 18.5 | Tags: troubleshooting, networking

[2/2] Deployment configuration best practices [project]
Author: member-b | Score: 12.0 | Tags: deploy, config
Matched: conflict | Missing: port
```

命中若来自代码页，结果会带 `Sources:` 行，直接列出相关源文件路径，让 Agent 不必重新探索仓库。

### 代码图谱实战

```bash
teamai import --from-org myorg          # 批量把组织下所有仓库导入知识图谱
teamai codebase --extract /path/to/repo # 本地抽取
teamai codebase --lint /path/to/repo     # 体检图谱质量
```

### 团队改进分析

| 命令 | 作用 |
|------|------|
| `teamai digest` | 生成周报：token 用量、对话量、干预率 |
| `teamai session save` | 记录隐私脱敏的会话摘要（`--push` 喂给 digest） |
| `teamai dashboard` | Web 看板：成员实时编码状态、干预次数、token 用量、KB 健康度 |
| `teamai recall maintenance --prune --dry-run` | 预览：归档低置信学习、标记过时 skills/rules/docs |

## 五、常见问题与解决方案

**Q1：全局安装失败 / 命令找不到 `teamai`**
- 确认 Node 版本 ≥ 20（`node -v`）。`tsup` 的 target 是 `node20`，低版本可能构建/运行异常。
- 用 `npm root -g` 确认全局 bin 已在 `PATH`；macOS 上若用 nvm/gvm 管理 Node，注意 shell 初始化脚本导致的 `PATH` 问题（例如某些环境会报 `GVM_ROOT not set`）。

**Q2：初始化后本地 AI 工具没有同步到最新资源**
- 检查 `SessionStart` hook 是否被正确注入（`teamai doctor` 可诊断）。
- 确认成员对团队仓库有**写权限**（README 明确要求 grant write access），否则 push/merge 流转无法闭环。
- 手动执行 `teamai pull` 验证，再用 `teamai status` 看本地与仓库差异。

**Q3：知识召回（`teamai recall`）没有结果**
- 召回默认关闭，需显式 `teamai recall enable`。
- 子 Agent 会先做相关性预检，与团队知识无关的任务会直接跳过检索，这是预期行为。
- 确认团队仓库里已有 learnings / teamwiki 等被索引的内容。

**Q4：AST 解析不可用**
- 设 `TEAMAI_SKIP_AST=1` 强制走启发式轨道；若仍异常，系统会记录 `AST_UNAVAILABLE` 缺口，不影响整体抽取。

**Q5：私有 Git 服务认证失败**
- 通过 `teamai init <url>` 时走 OAuth 登录；私有服务请确保凭据/SSH 已配置且网络可达。

## 六、总结

TeamAI 的价值不在于「又做了一个 AI 工具」，而在于它把**团队 AI 能力治理**这件事用最朴素的方式落了地：Git 仓库做单一信源、MR 做变更评审、hooks 做自动同步，再叠加经验自动沉淀与代码知识图谱。对那些已经重度依赖多个 AI 编程工具、却苦于「最佳实践无法复用、踩坑经验留不住」的团队，它几乎是一个零侵入的增强层。

值得注意的点：Team Context 与 Team Improvement 目前仍是 **beta**，召回默认关闭、需要显式开启；`Models` 也尚未对所有 provider 实现。但即便只看已经稳定的 Team Execution 层，它已经能显著降低团队内 AI 工具的「配置漂移」。如果你正打算让团队真正 AI Native，TeamAI 是个值得一试的起点。
