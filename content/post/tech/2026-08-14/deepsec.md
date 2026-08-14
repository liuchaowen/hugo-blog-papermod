---
title: "DeepSec：Vercel 开源的 AI 驱动漏洞扫描器，专为大型代码库设计"
date: 2026-08-14
description: "DeepSec 是 Vercel Labs 开源的 Agent 驱动漏洞扫描器，支持在自有基础设施中运行，针对大型代码库进行深度安全审计，使用顶级 AI 模型在最思考级别下分析代码，可并行分布式执行、断点续传，帮助企业发现潜伏已久的隐蔽漏洞。"
author: "Cheman"
slug: deepsec
draft: false
categories: ["技术", "安全", "AI"]
tags: ["GitHub", "开源", "安全", "漏洞扫描", "AI", "Vercel", "代码审计"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**DeepSec**，这是 Vercel Labs 开源的 Agent 驱动漏洞扫描器，专门针对大型代码库设计，使用顶级 AI 模型进行深度安全审计，能在自有基础设施中运行——数据不出本地，安全可控。

## 一、项目概述

**DeepSec** 是一个基于 AI Agent 的漏洞扫描工具，核心定位是**发现潜伏已久的隐蔽漏洞**。与传统的静态分析工具（SAST）不同，DeepSec 不依赖预定义规则库，而是让 AI Agent 深入阅读代码、理解上下文、自主推理潜在的安全风险。

核心特性包括：

- **Agent 驱动深度审计**：使用最强模型（OpenAI、Anthropic 等）在最高思考级别下分析代码，扫描一个大型代码库可能花费数千甚至数万美元——但客户反馈，发现并修复那些原本会被遗漏的漏洞，这笔投入非常值得。
- **分布式并行执行**：大型 Monorepo 可将工作分发给多台 Worker 机器并行处理，大幅缩短扫描时间。
- **断点续传**：扫描被中断（Ctrl-C、网络断开、预算上限）后，重新运行同一命令即可从断点继续，跳过已分析的文件。
- **自有基础设施运行**：所有扫描在用户自己的环境中执行，代码不离开本地，支持 Vercel Sandbox 微 VM 隔离运行。
- **CI/PR 模式支持**：`process --diff` 可仅分析 PR 中变更的文件，作为代码合并前的安全门禁。

## 二、技术架构

DeepSec 采用 **Scanner → Processor → Triage → Revalidate** 四阶段流水线：

| 阶段 | 功能 | 成本 |
|------|------|------|
| `scan` | 正则匹配器快速扫描候选漏洞点 | 免费（无 AI 调用） |
| `process` | AI Agent 深度分析候选点，输出漏洞报告和建议 | 高（主要成本所在） |
| `triage` | 用较便宜模型对漏洞进行 P0/P1/P2 分级 | 低 |
| `revalidate` | 重新验证已有发现，检查是否已修复 | 中 |

### 2.1 核心工作流

```
npx deepsec init
    ↓
选择 AI 模型 + 支付方式（自有 API Key 或 Vercel AI Gateway）
    ↓
scan: 正则匹配器扫描候选点
    ↓
process: AI Agent 深度分析
    ↓
export: 导出 Markdown/JSON 报告
```

所有状态和发现都存储在仓库内的 `.deepsec/` 目录中，包括：

- `.deepsec/library.json`：项目镜像和扫描状态
- `.deepsec/node_modules/deepsec/SKILL.md`：Agent 可读的技能文档
- `.deepsec/findings/`：导出的漏洞报告

### 2.2 AI 提供商与凭证管理

默认使用 **Vercel AI Gateway**，无需单独申请各模型 API Key，一次接入即可使用 OpenAI、Anthropic、Google 等主流模型。

也支持自带密钥（BYOK）：

```bash
npx deepsec init --model-auth direct \
    --ai-provider openai \
    --ai-api-key-env OPENAI_API_KEY
```

安全设计：DeepSec **只存储环境变量名称**，不存储密钥本身。

### 2.3 分布式执行架构

对于超大型代码库，可使用 **Vercel Sandbox** 微 VM 进行分布式扫描：

```bash
pnpm deepsec sandbox process \
    --project-id my-app \
    --sandboxes 10 \
    --concurrency 4
```

本地工作树被打包上传（`.git` 目录排除），模型凭证保留在主机侧，仅在选定的出口主机注入——即使代码被上传，凭证也不会泄露到沙箱内。

## 三、安装与快速开始

### 环境要求

- Node.js ≥ 22
- pnpm 8.15+（推荐）或 npm

### 一键初始化

在要扫描的仓库根目录执行：

```bash
npx deepsec init
```

命令会引导你：

1. 选择 AI 模型（显示各模型的基准测试分数和价格）
2. 选择支付方式（自有 API Key 或 Vercel AI Gateway）
3. 自动扫描并分析代码库

可设置预算和时间上限：

```bash
npx deepsec init --max-cost-usd 100 --max-duration 2h
```

### 导出报告

扫描完成后：

```bash
cd .deepsec
pnpm deepsec export --format md-dir --out ./findings
```

报告以 Markdown 文件形式输出到 `findings/` 目录，每份报告包含漏洞描述、影响范围、修复建议。

## 四、使用方法与实战

### 4.1 基础扫描流程

```bash
# 首次初始化
npx deepsec init

# 后续增量扫描
cd .deepsec
pnpm deepsec scan          # 快速正则扫描（免费）
pnpm deepsec process       # AI 分析新候选点
pnpm deepsec revalidate    # 可选：重新验证已有发现
pnpm deepsec export --format md-dir --out ./findings
```

### 4.2 PR 模式：仅扫描变更

在 CI/CD 流水线中使用 `--diff` 参数，只分析本次 PR 中变更的文件：

```bash
pnpm deepsec process --diff main...feature-branch
```

这大大减少了 CI 场景下的成本和耗时。

### 4.3 分布式扫描大型 Monorepo

```bash
pnpm deepsec sandbox process \
    --project-id my-monorepo \
    --sandboxes 20 \
    --concurrency 8
```

工作会被分配到 20 个 Sandbox 微 VM 中并行执行，每个 VM 运行 8 个并发 Agent。

### 4.4 从 Coding Agent 调用

DeepSec 在初始化后会生成 Agent 可读的技能文档：

- `.deepsec/node_modules/deepsec/SKILL.md`
- `.deepsec/node_modules/deepsec/dist/docs/`

Coding Agent（如 Claude、Copilot）可以直接读取这些文档，理解项目结构后执行定向扫描。

## 五、常见问题与解决方案

**Q: 扫描中断后如何继续？**  
直接重新运行 `npx deepsec init` 或 `pnpm deepsec process`，DeepSec 会自动跳过已分析的文件，从断点继续。

**Q: API 配额用完了怎么办？**  
DeepSec 会优雅停止并告诉你需要在哪里充值。充值后重新运行同一命令即可继续。

**Q: 成本太高怎么办？**  
使用 `--max-cost-usd` 设置预算上限；先用 `scan` 命令进行免费的正则扫描，筛选出高风险文件后再用 `process` 进行 AI 分析；或者使用 `--thinking-level` 降低模型思考深度。

**Q: 如何避免 Prompt Injection 攻击？**  
DeepSec 自身的安全模型建议：在 Sandbox 中运行，模型凭证在沙箱外注入，沙箱内网络出口仅限 AI 提供商域名，即使恶意代码也无法外泄凭证。

**Q: 支持哪些编程语言？**  
DeepSec 不依赖语言特定的 AST 解析，而是让 AI 直接阅读源码，理论上支持所有语言。内置的正则匹配器主要覆盖常见的安全敏感模式（SQL 注入、XSS、命令注入等）。

## 六、总结

DeepSec 代表了漏洞扫描的一个新范式：**从规则驱动到 AI Agent 驱动**。它不是要取代传统 SAST 工具，而是填补后者难以覆盖的盲区——那些需要深度理解上下文、追踪跨文件数据流、推理业务逻辑漏洞的隐蔽问题。

对于拥有大型代码库、对安全有较高要求的企业或团队，DeepSec 提供了一个在自有基础设施中运行、支持分布式并行、可从断点恢复的完整解决方案。如果你正在寻找一款能够"深挖"代码库的 AI 安全审计工具，DeepSec 值得一试。

> GitHub 地址：https://github.com/vercel-labs/deepsec
