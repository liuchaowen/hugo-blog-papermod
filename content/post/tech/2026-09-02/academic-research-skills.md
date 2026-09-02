---
title: "Academic Research Skills：把 Claude Code 变成覆盖学术研究全流程的 AI 副驾驶"
date: 2026-09-02T11:04:00+08:00
description: "Academic Research Skills (ARS) 是一套为 Claude Code 打造的学术研究技能套件，用 Deep Research、Academic Paper、Reviewer 与 Pipeline 四个技能把文献调研、论文写作、同行评审到投稿的全流程串联起来，并以强制性的完整性校验门（integrity gate）对抗 AI 幻觉与学术不端。"
author: "Cheman"
draft: false
tags: [GitHub, 开源, Claude Code, 学术研究, AI 工具, 提示工程]
categories: [技术, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Academic Research Skills（简称 ARS）**，一套为 Claude Code 打造的学术研究技能套件，把从文献调研、论文写作、同行评审到投稿回复的全流程都用 AI 串了起来。它最打动我的不是"自动化写论文"，而是它把"AI 只能当副驾驶、人必须握方向盘"这件事做进了一套可执行的工程约束里。

## 一、项目概述

ARS 的作者是 Cheng-I Wu（吳政宜），以 CC BY-NC 4.0 协议开源，当前版本已迭代到 v3.21.1。它定位非常明确：**AI 是你的副驾驶（copilot），不是驾驶员（pilot）**。这个工具不会替你写论文，而是接管那些真正消耗脑力的脏活——找文献、格式化引用、核对数据、检查逻辑一致性——让你把精力留给定义问题、选择方法、解读数据和写那句"我认为……"。

它的核心理念是"human-in-the-loop（人在环中）而非全自动"。作者引用了多项 2026 年的研究作为设计依据：

- **Lu et al. (Nature, 2026)** 的 *The AI Scientist* 是首个通过顶会盲审的自主 AI 研究系统，但其 Limitations 章节枚举了所有全自动流水线的通病：实现 bug、结果幻觉、抄近路、把 bug 美化成洞见、伪造方法、frame-lock（框架锁定）、引用幻觉。
- **Zhao et al. (2026)** 审计了 arXiv/bioRxiv/SSRN/PMC 上 2.5M 篇论文的 1.11 亿条参考文献，保守估计 2025 年 alone 就有 **146,932 条幻觉引用**。
- **Ren et al. (2026)** 的综述指出，发现型智能体很难自己验证新颖性、正确性和可复现性，往往会利用弱代理指标，并在证据薄弱时放大错误信息。

ARS 的设计前提正是：**被 AI 增强的人类研究者，比单独的人或单独的 AI 都更能规避这些失败模式**。

整套套件由四个技能（skill）组成，覆盖了学术研究的主干：

- **Deep Research**：13 个 agent 的调研团队，支持 Socratic 引导、PRISMA 系统综述、意图识别、对话健康度监控、可选的跨模型验证、Semantic Scholar API 核对。
- **Academic Paper**：12 个 agent 的论文写作流水线，含风格校准（Style Calibration）、写作质量检查、LaTeX 硬化、可视化、修订辅导、引用转换、防泄漏协议、VLM 图件核对。
- **Academic Paper Reviewer**：7 个 agent 的多视角同行评审（Journal-Fit Reviewer + 3 个动态审稿人 + Devil's Advocate），基于准则的、证据锚定的叙述性判断。
- **Academic Pipeline**：10 阶段编排器，串联上述能力，并内置自适应的检查点、声明验证、材料护照（Material Passport）与强制性完整性校验。

## 二、技术原理

### 2.1 架构：四件套 + 10 阶段流水线

ARS 不是单个 prompt，而是一组**有契约（contract）的技能集合**。每个技能都声明自己的 `data_access_level`（`raw`/`redacted`/`verified_only`，由 `scripts/check_data_access_level.py` 强制执行）、`task_type`（`open-ended` 或 `outcome-gradable`）、支持的引用格式（APA 7.0、Chicago、MLA、IEEE、Vancouver）与论文结构（IMRaD、主题综述、理论分析、案例研究、政策简报、会议论文）。

Academic Pipeline 是总编排器，把一次完整写作拆成约 10 个阶段，其中几个关键节点尤其值得关注：

- **Stage 1 RESEARCH**：产出 RQ Brief（研究问题简报）+ Methodology Blueprint（方法蓝图），并在 Intake 时**强制声明**本篇是否带实验支撑的声明（`experiment_intake_declaration`，fail-closed）。
- **Stage 2 WRITE**：基于 Stage 1 的蓝图写作，支持中途接入配套的 Experiment Agent 跑真实实验。
- **Stage 2.5 / 4.5 完整性校验门（integrity gate）**：**强制性、不可绕过**的两道关口，运行一个 7 模式阻断式检查清单，核对引用存在性、声明—来源一致性、报告方法、图/表保真度、过程/包合规性。任何绕过都会被记录理由并进入 Stage 6 汇总。
- **Stage 3 / 3' 同行评审与重审**：多 agent 审稿面板 + 魔鬼代言人（Devil's Advocate）+ 修订可追溯矩阵（R&R Traceability Matrix）。
- **Stage 6 Process Summary**：自动产出 6 维度协作质量评估（1–100 分）的过程记录。

### 2.2 对抗幻觉的三道防线

这是 ARS 最有技术含量的部分，也是它区别于"AI 润色/降重工具"的根本：

**第一道：引用定位锚（locator anchors）+ 声明审计。** 从 v3.7.3 起，每一条引用都携带一个三层定位锚（locator anchor）；v3.8 进一步提供可选的审计开关 `ARS_CLAIM_AUDIT=1`，它会**真的去抓取被引源**，逐条对照锚点判断声明是否成立，并定义了 5 个 HIGH-WARN 类（claim-not-supported、negative-constraint-violation、fabricated-reference、anchorless、constraint-violation-uncited），在格式化终端的硬门处直接拒绝输出。

**第二道：跨模型盲校验（cross-model verification）。** 通过 `ARS_CROSS_MODEL` 开启，以及机器稳定的 `[CROSS-MODEL-HANDOFF v1]` 信封（`scripts/cross_model_handoff.py` 用规范性 Python 语法钉死 owner→dispatcher→owner 的盲检查点传输），避免"验证 AI 和生成 AI 共用同一认知框架"导致的 frame-lock。

**第三道：模型分层（model tiering）与材料护照。** `ARS_MODEL_TIERING` 可让执行型 agent 降一档（economy）、判断型 agent（完整性门、终稿评审）升到前沿档（quality-boost）。材料护照上的 `repro_lock` 子块记录实验来源，但不声称 LLM 输出字节级可复现——这种"诚实的边界声明"贯穿整个项目。

### 2.3 从 prompt 工程里挖出来的结构性限制

作者在一篇反思文中发现三个 prompt 工程救不了的 structural 问题，并据此改了 ARS：

- **Frame-lock**：让 AI 对自己的论点做魔鬼辩论，它四轮都在你设定的框里打转，从不质疑"我们讨论的是不是正确的问题"。
- **Sycophancy under pushback（被反驳就谄媚）**：你一挑战，它就过快让步，把"用户固执"误读成"攻击是错的"。
- **Intent misdetection（意图误判）**：苏格拉底导师分不清"用户想深度探讨"和"用户想要一份 RQ 简报"。

对应解法：**让步阈值协议（Concession Threshold Protocol）** 要求 Devil's Advocate 在回应前给每条反驳打 1–5 分，仅当 ≥4 才允许让步，且禁止连续让步、追踪让步率；**意图检测层（Intent Detection Layer）** 在对话开始区分探索型 vs 目标型，探索型禁用自动收敛、把轮次上限提到 60；**对话健康指示器（Dialogue Health Indicator）** 每 5 轮静默自检"持续附和/回避冲突/过早收敛"三个维度，一旦检测到附和模式就自动注入挑战性问题（对用户不可见，防止被博弈）。

## 三、安装与快速开始

ARS 对 Claude Code CLI / VS Code / JetBrains（v3.7.0+）提供**插件式安装，30 秒搞定**：

```text
/plugin marketplace add Imbad0202/academic-research-skills
/plugin install academic-research-skills
```

安装后跑一个 `/ars-plan`，描述你正在写的论文，ARS 就会用苏格拉底式对话帮你梳理章节结构；想快速试单条命令，可以 `/ars-lit-review "你的主题"`。

前置要求：

- 安装最新版 Claude Code（插件打包需要较新版本）；
- 导出 `ANTHROPIC_API_KEY`；
- 可选：Pandoc（生成 DOCX）、tectonic + 思源宋体（生成 APA 7.0 PDF），纯 Markdown 输出不需要这些；
- 可选（真实 Python）：核心的 research / write / review 三个技能是纯 prompt 驱动、不需要 Python；只有少数 opt-in 功能（如 PreToolUse 写范围守护、修订补丁模式、`/ars-cache-invalidate` 等命令）会调用 Python。Windows 上 `python3` 常被 Microsoft Store 占位程序占用，需从 python.org 或 `winget` 装真 Python，并配合 Git Bash 才能跑 `.sh` 启动器——否则守护会静默失效，核心技能不受影响。

如果你用 Pi 或 Codex CLI，也有对应的封装分发版（`pi install git:github.com/Imbad0202/academic-research-skills` 与 `academic-research-skills-codex`）。

## 四、使用方法与实战

ARS 的使用以自然语言驱动，几个技能各自提供多模式（mode）。下面是一些典型入口：

**Deep Research（8 种模式）**

```text
"Research the impact of AI on higher education"   → full 模式（完整调研）
"Do a systematic review on X with PRISMA"         → systematic-review 模式
"Guide my research on X"                          → socratic 模式（引导式）
"Fact-check these claims"                         → fact-check 模式
"Compare these papers in WHY/HOW/WHAT format"     → three-way-scan 模式
```

**Academic Paper（11 种模式）**

```text
"Write a paper on X"                       → full 模式
"Guide me through writing a paper"         → plan 模式（引导式）
"I have a draft, here are reviewer comments" → revision 模式
"Convert citations to IEEE"                → format-convert 模式
"Audit my rebuttal draft against reviews"  → rebuttal-audit 模式
```

**Academic Paper Reviewer（6 种模式）**

```text
"Review this paper"                  → full 模式（Journal-Fit + R1/R2/R3 + Devil's Advocate）
"Verify the revisions"               → re-review 模式
"Calibrate this reviewer against my gold set" → calibration 模式
```

**Academic Pipeline（总编排）**

```text
"I want to write a complete research paper"  → 从 Stage 1 跑完整流水线
"I already have a paper, review it"          → 从 Stage 2.5 中段切入（先校验完整性）
"I received reviewer comments"               → 从 Stage 4 中段切入
```

一个真实案例：官方 showcase 给出一次完整 10 阶段跑出的产物——中英文 APA 7.0 终稿、Stage 2.5 完整性报告（抓出 15 条伪造引用 + 3 处统计错误）、Stage 4.5 终稿报告（确认零回归）、三轮同行评审与作者逐条回复、以及发布后独立全引用审计（发现前 3 轮完整性检查漏掉的 21/68 处问题）。这恰好印证了项目反复强调的"诚实边界"：**ARS 能大幅降低但无法根除不端，一致性编造的内容仍可能蒙混过关**——所以它把"人必须在环中"做成了工程强制，而不是道德倡议。

## 五、常见问题与解决方案

**Q1：装完插件，跑 `/ars-plan` 没反应 / 技能不激活？**
A：触发词（Trigger Keywords）默认只列了英文与繁体中文。虽然 Socratic / Plan 模式用意图检测、理论上支持任意语言，但"是否激活技能"仍依赖关键词匹配。简体中文用户可去每个 `SKILL.md` 的 `### Trigger Keywords` 段补上中文关键词提升命中率；稳妥起见直接用英文指令（如 `Write a paper on X`）启动。

**Q2：想用中文写作，输出却是英文？**
A：ARS 默认"用户写中文→繁体中文，写英文→英文"，并支持中英双语摘要。若你用简体中文、希望输出简体，确认你安装的是含 `README.zh-CN.md` 的中文分支/版本，并以简体中文指令交互；部分模式仍以繁体为中文默认。

**Q3：跨模型验证 / 声明审计要钱吗、安全吗？**
A：`ARS_CROSS_MODEL` 与 `ARS_CLAIM_AUDIT=1` 都是可选开关，会发起额外的模型调用（成本上升）以及去抓取被引源的联网请求。项目在 `docs/DATA_FLOWS.md` 列明了"什么数据离开本机、什么本地缓存、多久、如何关闭"，对隐私敏感的用户应先读该文档并选择性关闭对应路径。

**Q4：Windows 上 PreToolUse 写范围守护报一堆错？**
A：守护启动器是 POSIX shell 脚本、经 `bash` 调用，Windows 需 Git Bash 才能跑；没有 Git Bash 时 Claude Code 回退到 PowerShell、无法跑 `.sh`，守护失效且每次调用打一条错误日志。装 Git Bash 即可让守护干净降级；它本就是可选项、从不阻断你的写入，只是日志噪音问题。

**Q5：跑流水线要花多少钱？**
A：官方 `docs/PERFORMANCE.md` 给出估算——一篇约 15,000 词的论文全流水线约 **$4–6**，并建议 Claude Code 开 Auto 模式、Agent Team 可选。成本主要来自多 agent 与可选跨模型调用。

**Q6：它能保证我的论文不被撤稿吗？**
A：不能，也不声称能。ARS 校验的是稿件与所报告的过程（引用真实性、声明—来源一致性、方法报告、图/表保真度等），不验证实验是否真的做过、原始数据是否真实、结果是否可复现。它的定位是"降低失败概率的副驾驶"，最终责任与判断仍在你。

## 六、总结

ARS 给我最大的启发不是"AI 能写论文"，而是它把 **AI 的结构性局限（frame-lock、谄媚、幻觉）当成一等公民去工程化治理**——让步阈值协议、对话健康度自检、引用定位锚、强制完整性门、跨模型盲校验，每一个都是为了"让局限可见、可管理"而不是假装不存在。它反复强调的"诚实边界"也值得所有做 AI 科研工具的人借鉴：能力声明要对齐证据，未被验证的好处一律不声称。

如果你正用 Claude Code 做学术写作，ARS 是少数把"人在环中"做成可执行约束、而不是口号的套件。30 秒装好，从 `/ars-plan` 起步，让 AI 接管脏活、你守住方向盘——这大概就是它想传递的研究姿势。

> 项目地址：[github.com/Imbad0202/academic-research-skills](https://github.com/Imbad0202/academic-research-skills)（CC BY-NC 4.0，作者 Cheng-I Wu）

