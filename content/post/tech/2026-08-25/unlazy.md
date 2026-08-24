---
title: "unlazy：用可执行的验收闸门，给 AI Agent 的「敷衍式交付」上把锁"
date: 2026-08-25
description: "GitHub Trending 项目 unlazy 是一套面向 AI 编程 Agent 的「完成纪律」框架：先写验收账本、再执行可运行闸门、最后用证据说话。本文拆解其闸门契约、安全边界与并行编排设计，帮你根治 Agent 半成品交付。"
author: "Cheman"
slug: unlazy
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI Agent, 工程化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**unlazy**，它想解决的不是「让 Agent 写更多代码」，而是「让 Agent 真正把事做完、且只汇报证据支持的结论」。

## 一、项目概述

`unlazy` 是一套面向 AI 编程 Agent（Claude Code、Codex 等）的 **完成纪律（completion discipline）** 框架。它的核心主张很直白：在动手之前先写「验收账本（acceptance ledger）」，把每个待交付结果对应的**可执行检查（gate）**和**预期输出（expectation）**写清楚，执行后只报告证据能支撑的结论。

作者把这套方法称为 *"completion discipline for substantial AI-agent work, backed by runnable gates"*。

- **项目背景**：现实里，复杂 prompt 仍频繁出现「部分合规」「过早截断」「幻觉式总结」。unlazy 引用了多项研究（如 SlopCodeBench 显示最强 Agent 仅通过 14.8% 的 checkpoint）支撑这一痛点。
- **核心特性**：
  - 闸门契约（gate contract）：每个 gate 必须用真实命令 + 预期输出 + 证据指纹定义。
  - 安全边界：审批记录独立于仓库、私钥级隔离，fail-closed。
  - 并行编排：scoped pipeline + 租约协调，支持 `--jobs` 滚动执行。
  - 零运行时依赖：仅需 Node 16+，无第三方包。

## 二、技术原理

### 闸门契约（Gate Contract）

unlazy 的基石是一份结构化的验收账本。每个可执行闸门都必须包含 `CHECK:`（shell 命令）、`EXPECT:`（预期输出正则/文本）和 `EVIDENCE:`（执行证据）：

```markdown
# Gates: pricing behavior

- [ ] G1: pricing fixtures render the expected tiers
  CHECK: node scripts/verify-pricing.mjs
  EXPECT: pricing verification passed
  EVIDENCE: pending

- [ ] G2: checkout integration succeeds from its package
  CHECK: node scripts/verify-checkout.mjs
  EXPECT: checkout verification passed
  CWD: packages/checkout
  EVIDENCE: pending
```

一个闸门**只有在进程退出码为 0 且 EXPECT 匹配合并输出时**才算通过。证据会记录解析后的 shell、工作目录、退出码、PATH 指纹、匹配结果，以及成功输出的 SHA-256/字节数指纹——但**原始输出既不回显也不持久化**，只留指纹，避免噪声淹没结论。

解析器会拒绝以下账本：零闸门、重复 id、可运行闸门不完整、预期无效、以及缺少理由/未知 id 的「放弃（abandonment）」。

### 命令 Oracle 与审批模型

unlazy 把「该不该执行这条命令」抽象成一个**命令 Oracle**：

```text
node <path-to-skill>/scripts/gate-check.mjs --status GATES.md   # 永远不执行，只展示将解析的命令
node <path-to-skill>/scripts/gate-check.mjs GATES.md           # 普通模式：首次在陌生 Oracle 上只打印命令，不执行
node <path-to-skill>/scripts/gate-check.mjs --approve GATES.md  # 审批并运行账本
node <path-to-skill>/scripts/gate-check.mjs --reverify GATES.md # 重跑所有可运行闸门（含已完成的）
```

关键点：普通模式**不是**永久 dry-run。一旦该 Oracle 被明确审批，普通模式就会真正执行。审批即「同意（consent）」，而非沙箱——这是 unlazy 安全边界的诚实之处。

### 安全边界（Security Boundary）

审批记录默认存放在仓库之外的 `~/.unlazy/approved`，且强制满足：

- 规范目标必须位于被检查仓库之外（可用 `UNLAZY_APPROVAL_DIR` 另行指定，但须是 owner 私有真实目录）。
- 符号链接存储、被链接/替换/非私有的记录一律 **fail-closed**（关闭失败，而不是放行）。
- 每条记录绑定到绝对账本、gate、精确的 CHECK/EXPECT、解析后的 CWD/shell、超时、输出与正则限制、平台及完整继承的 PATH。
- 一旦修改任意绑定输入，必须重新审批。

需要强调的是：审批不哈希被调用的脚本、fixture、依赖等传递输入；`--status`/Stop 不重新校验旧证据。改变依赖后应重跑 `--reverify`。

### 并行编排（Orchestration & Parallel Work）

对于需要「新鲜上下文」的工作，unlazy 支持在 `.unlazy/<scope>/` 下创建作用域化流水线：

```text
.unlazy/<scope>/PLAN.md
.unlazy/<scope>/GATES.md
.unlazy/<scope>/gates/leaf-*.md
.unlazy/<scope>/gates/node-*.md
```

叶子（leaf）节点声明 `WAITING / READY / IN-FLIGHT / VERIFIED / ABANDONED` 状态；分支（node）声明 `OPEN / VERIFIED / ABANDONED`。只有在每个叶子声明并完成、互不相交、仓库相对的 `OWNS:` 路径并认领后，就绪叶子才可并行：

```text
node <path-to-skill>/scripts/gate-check.mjs --scope api --leaf leaf-1.2.1 --claim
```

`--jobs <N>`（1–64）是可选的独立检查滚动并发上限，默认按账本顺序串行。调度是滚动式的：某个已验证叶子解锁另一个时，立即启动新就绪叶子，无需等待无关工作。不可恢复的局部启动失败使用被审计的 `abandon --reason` 转换——绝不伪造句柄或删除状态。

此外还提供可选的 **Claude Code Stop hook**：当闸门未满足或启动波未完成时，返回 `decision: "block"`。连续 6 次 block 且无语义进展后，会话级进度守卫会释放。

## 三、安装与快速开始

### 环境要求

- Node 16 及以上（零第三方运行时依赖）。
- 支持 slash skill 的 Agent（Claude Code、Codex CLI 等）。

### 安装

通过官方 skills CLI 安装到受支持的 Agent：

```text
npx skills add Leonxlnx/unlazy
```

- 加 `-g` 做用户级安装，或 `--all` 安装到所有检测到的 Agent。
- 手动路径：Claude Code → `~/.claude/skills/unlazy`，Codex CLI → `~/.codex/skills/unlazy`。

### 最简运行示例

以一个独立任务为例，把模板复制到 `GATES.md`，替换占位符，然后**只检查不执行**：

```text
node <path-to-skill>/scripts/gate-check.mjs --status GATES.md
```

阅读每条命令和脚本后，审批并运行：

```text
node <path-to-skill>/scripts/gate-check.mjs --approve GATES.md
```

想完整验证所有闸门（包括已标记完成的），用 `--reverify`。

## 四、使用方法与实战

### 基础用法：写一份合格账本

好的闸门应当遵循以下原则（来自官方 gates 规范）：

- 读取被描述结果所指向的制品或服务（而不是凭标题臆测）。
- 在所有断言通过后打印一个「仅成功时」的标记。
- 用已知阳性对照做「反存在」检查。
- 测量**给定数字**，而不是把数字抄进 `EXPECT:`。
- 对后果严重的手动结果，按风险比例留证据。

### 进阶用法：作用域化并行

当任务足够大，先建作用域：

```text
.unlazy/api/PLAN.md
.unlazy/api/GATES.md
```

用 `--scope` 把多个账本和启动波一起规约：

```text
node <path-to-skill>/scripts/gate-check.mjs --scope api
```

只有每个 gate 都满足、每个波都完成时，才打印 `ALL MET`；被放弃的波仍是非成功的 `HANDOFF REQUIRED` 结果。

### 实战：接入 CI 与 Stop 守卫

仓库自带 `npm test` 跨多组确定性回归测试（run / dispatch / hardening / stress / lint / contract / self-check）。可选安装 Stop hook：

```text
node <path-to-skill>/scripts/install-hooks.mjs
node <path-to-skill>/scripts/install-hooks.mjs --uninstall
```

`--shared` 会写入绝对 Node 与 hook 脚本路径，`--global` 写入当前用户 Claude 设置；installer 会原子写入并保留 `<settings>.unlazy.bak` 备份。

## 五、常见问题与解决方案

**Q1：普通模式会不会意外执行命令？**
不会。在一个没有精确审批记录的新 Oracle 上，普通模式只打印解析后的命令、预期、工作目录、shell 和 PATH，不执行。但需注意：一旦该 Oracle 被审批，普通模式就能执行——它从不是「永久 dry-run」。

**Q2：审批就安全了吗？**
审批是「同意」而非「沙箱」。审批存储位于仓库之外的私有目录，但不哈希被调用的脚本与依赖；命令在环境文件系统、凭据、网络访问下运行。改变依赖后请务必 `--reverify`。

**Q3：Windows 上命令找不到 grep/tail/tr？**
unlazy 的 shell 解析顺序是 `--shell` → `UNLAZY_SHELL` → Node 平台默认 shell。从 Git Bash 启动能看到类 Unix 工具，从 PowerShell 启动则看不到；`--shell` 只改解释器、不安装外部程序。可移植示例应调用仓库自有的 Node 脚本。

**Q4：结果能证明Agent变强了吗？**
作者很克制：研究只支撑「显式结构能缓解失败模式」这一动机，**并不证明 unlazy 带来固定提升**。早期 README 提到的六次内部对比的原始产物不在仓库内，应视为历史设计输入而非基准保证。

## 六、总结

unlazy 的价值不在「又一套 Agent 脚手架」，而在于它把 AI 工程里最难的「完成度」问题，转化成了**可机器校验的结构**：先写账本、再跑闸门、只报证据。它的诚实（fail-closed、不哈希依赖、不夸研究结论）和克制（零依赖、Node 16、可审计 abandon）使其适合作为严肃 AI 工作流的底层纪律层。如果你受够了 Agent 的「半成品 + 自信总结」，值得把它接进自己的流水线里。
