---
title: "Claude SEO：为 Claude Code 打造的开源 AI 搜索引擎优化技能"
date: 2026-07-23
description: "Claude SEO 是面向 Claude Code 的开源 SEO 分析插件，基于 25 个子技能与 18 个专家 Agent 并行审计技术 SEO、内容质量、结构化数据与 AI 搜索优化，并输出带可证伪性校验的优先级行动计划。"
author: "Cheman"
slug: claude-seo
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, SEO, Claude Code, AI搜索优化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Claude SEO**，一个为 Claude Code 打造的开源 SEO 分析技能，用 LLM 原生的并行审计把传统需要数小时的人工审计压缩到十几分钟，并且把每一条建议都绑定了可证伪的校验逻辑。

## 一、项目概述

Claude SEO 是一个开源（MIT）的 **Claude Code 插件**，本质是一套围绕 `/seo` 命令组织的 SEO 分析系统。它一次性编排 **25 个子技能（sub-skill）与 18 个专家 Agent**，从技术 SEO、内容质量（E-E-A-T）、Schema.org 结构化数据、AI 搜索优化（GEO/AEO）、本地 SEO、电商 SEO 到国际 SEO 全面覆盖。

与传统爬虫式审计工具不同，它的设计哲学是"AI 搜索优先 + 可证伪"：

- **AI 搜索优先**：紧跟 Google AI Optimization Guide，用基于问答的"可引用性评分"（citability）、`llms.txt` 一手证据、IPTC `TrainedAlgorithmicMedia` 标记等维度评估页面进入 AI Overview / AI Mode 的资格。
- **并行执行**：一次整站审计最多同时派出 15 个专家 Agent，把原本需要数小时的审计压缩到分钟级。
- **可证伪而非营销话术**：每条建议都附带"它所依赖的第一性原理观察""与其他建议的依赖关系""如何判断这条建议失败了"以及"先行指标"。

项目提供了两个版本：公开开源版 `AgriciDaniel/claude-seo`（MIT，无需会员，稳定可下载），以及社区私有镜像版（需 Skool 会员，提前体验新特性）。如果使用的是 Codex 而非 Claude Code，作者还提供了功能对等的 `Codex SEO` 移植版。

## 二、技术原理

### 架构：三层 + 自动发现

插件遵循 Anthropic 的 Agent Skills 标准，采用 **指令层 / 编排层 / 执行层** 三层架构。技能与 Agent 从 `skills/seo-*/` 和 `agents/seo-*.md` 中自动发现，无需手工注册。

编排器 `skills/seo/SKILL.md` 负责三件事：

1. **行业识别**：判断站点属于 SaaS、本地商家、电商、出版商还是代理商。
2. **并行分发**：最多同时派出 15 个审计 Agent。
3. **综合收敛**：通过 10 项原则的方法论框架合成最终行动计划。

```text
/seo audit example.com
        │
        ▼
   Orchestrator (skills/seo/SKILL.md)
        │  行业识别 → 并行分发 → 10 原则收敛
        ├──► seo-technical agent
        ├──► seo-content (E-E-A-T) agent
        ├──► seo-schema agent
        ├──► seo-geo agent
        └──► ...（最多 15 个并行）
        │
        ▼
   Scoring Engine → 优先级行动计划 (Markdown + PDF + JSON)
```

### 核心技术栈与选型理由

依赖在 `requirements.txt` 中做了**受限版本钉死 + 安全下限**，值得借鉴：

```text
# v2.0.0 Phase A：全量无头渲染
trafilatura>=2.0.0,<3.0.0    # 去样板正文抽取（SPA 安全）
htmldate>=1.9.0,<2.0.0       # 发布日期抽取，用于新鲜度信号
courlan>=1.3.0,<2.0.0        # trafilatura 的 URL 助手

# 报告生成
matplotlib>=3.8.0,<4.0.0     # 图表（PDF 报告，200 DPI）
weasyprint>=68.1,<70.0       # A4 排版 PDF
openpyxl>=3.1.5,<4.0.0       # Excel 导出
```

- **Playwright Chromium**：Phase A 引入共享渲染器 `scripts/render_page.py`，`--render auto` 模式会自动识别 Next.js / React / Vue / Nuxt / Astro 等 SPA 特征并切换到无头渲染，解决 v1.x 被 SPA 卡脖子的问题。
- **trafilatura + htmldate**：负责去噪的正文抽取与发布时间识别，支撑内容新鲜度信号。

### 方法论：10 原则四阶段

每次审计都走一遍 10 条原则，分四个阶段，每条建议都带四个字段：

| 阶段 | 原则 | 作用 |
|------|------|------|
| **PERCEIVE 感知** | OBSERVE（外部/内部）· LISTEN | 收集原始信号，审计自身假设，倾听 SERP 与社区真实声音 |
| **ANALYZE 分析** | THINK · CONNECT（横向/系统） | 还原第一性原理，寻找跨技能的非显性关联，排成依赖图 |
| **VALIDATE 验证** | FEEL · ACCEPT | 用体验、品牌调性、运营承载力压测，暴露可证伪性 |
| **ACT 行动** | CREATE · GROW | 交付产物，并为下一次审计设置反馈回路 |

### 数据流：Credential Tier 分层

Google 数据接入采用 **4 层凭证体系**，零密钥也能用：

| 层级 | 凭证 | 解锁的 API |
|------|------|-----------|
| 0 | 仅 API Key | PageSpeed Insights、CrUX、CrUX 历史（25 周趋势） |
| 1 | + OAuth / 服务账号 | + Search Console、Indexing API |
| 2 | + GA4 配置 | + GA4 自然流量、落地页、设备/国家分布 |
| 3 | + Ads 开发者令牌 | + Keyword Planner 搜索量/竞争度 |

凭证全部存放在 `~/.config/claude-seo/` 下（权限 `0o600`），不入库、不外传。

## 三、安装与快速开始

### 插件安装（Claude Code 1.0.33+，最快捷）

```bash
# 一次性添加市场，再安装插件
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
/seo setup
```

`/seo setup` 会在 Claude 的持久化插件数据里创建隔离 Python 环境并安装 Playwright Chromium，`/seo doctor` 可随时检查就绪状态，不污染全局 Python 与 PATH。

### 手动安装（Unix / macOS）

```bash
git clone --depth 1 https://github.com/AgriciDaniel/claude-seo.git
bash claude-seo/install.sh
```

Windows（PowerShell）同样提供 `install.ps1`。作者有意用 `git clone` 而非 `irm | iex`，正是因为 Claude Code 自身的供应链安全护栏会把后者标记为风险——clone 方式可在运行前先人工审阅脚本。

### 最简运行示例

```bash
# 进入 Claude Code
claude

# 整站审计：并行子 Agent 产出优先级行动计划
/seo audit https://example.com

# 单页深度分析
/seo page https://example.com/about

# 结构化数据审计
/seo schema https://example.com

# AI 搜索优化（GEO）
/seo geo https://example.com
```

## 四、使用方法与实战

插件共提供 **32 个用户可直接调用的 `/seo` 命令**，覆盖编排器、子技能与 8 个 MCP 扩展。几个高频实战场景：

**场景 1：SEO 代理商带 10 个客户站**
用每周一早晨的 `/seo audit` 取代季度"深度审计"仪式，交付客户健康评分邮件的时间从 4 小时降到 12 分钟，覆盖频率从季度提升到周级而无需多计费。漂移基线（drift baseline）还能捕捉两次审计间的回归。

**场景 2：50 人 SaaS 公司的内部 SEO 负责人**
每次季度业务复盘前 24 小时跑 `/seo audit`，在 CMO 于董事会上质问"为什么自然流量掉了"之前，先抓出平台 UI 埋掉的问题：程序化页面的 canonical 链断裂、Google 2025 年 6 月废弃潮后的 schema 失效、侵蚀 SERP→AI Overview 的 AI 可引用性缺口。

**场景 3：自由 SEO 顾问接新客户**
在 discovery 电话里直接跑 `/seo audit`，用真实的 0-100 评分、3 条优先级关键发现加每条建议的可证伪校验，当场锁定合作范围，而不是"我先看看再回来找你"。

**进阶：集成 MCP 扩展**
插件核心不依赖任何外部服务，但可选挂载 8 个 MCP 服务器解锁实时数据：Ahrefs（反向链接）、SE Ranking（跨 ChatGPT/Gemini/Perplexity 的 AI 声量）、Profound（LLM 引用追踪）、Bing Webmaster + IndexNow、Unlighthouse（多页 Lighthouse）、DataForSEO、Firecrawl、Banana（AI 配图）。

**AI 搜索优化的三个反共识结论**
`seo-geo` 基于一手证据重构了三个流行误区：

- `llms.txt` 当前**不是**引用杠杆；
- 内容分块（chunking）对 AI 引用**并非必需**；
- AI 专属关键词改写**没必要**，因为同义词理解已足够。

这与 Google 官方"AI Overview / AI Mode 与传统搜索共用同一套排名系统，资格地板就是正常索引"的立场一致。

## 五、常见问题与解决方案

**Q：没有 Google API 密钥能用吗？**
可以。零密钥即可运行，Tier 0 仅用 PageSpeed Insights 与 CrUX 历史。但若不配置 Tier 1-3，Core Web Vitals 仅为实验室估算，索引状态只能由页面级信号推断。

**Q：对单页应用（Next.js / React / Vue）有效吗？**
有效。v2 Phase A 引入了共享无头渲染器（`render_page.py --mode auto`），自动探测空 `<div id="root">` 壳层并切换渲染。已知边界：依赖滚动位置或交互后才加载的内容仍可能产生噪声，官方建议用 `seo-visual` 子 Agent 的 Playwright 快照做交叉核对。

**Q：和 Screaming Frog / Ahrefs 有什么区别？**
定位不同：Screaming Frog 长于链接图级深爬，Ahrefs 强在自有反向链接索引；Claude SEO 不试图替代它们，反而通过 MCP 扩展接入 Ahrefs。它的优势在于 LLM 原生对话式工作流、建议可证伪性、MIT 开源零按域计费、以及紧跟 Google 一手指南的 AI 搜索优化。

**Q：安装时供应链安全如何保证？**
插件坚持 `git clone` 审阅式安装，拒绝 `irm | iex`；v2.2.x 还修复了 SSRF 权威混淆绕过、将 Google API Key 移入 `X-Goog-Api-Key` 头、加入 secret 扫描 CI 门禁，`url_safety` 套件单是 SSRF 与 DNS 重绑定绕过就跑了 91 个用例。

## 六、总结

Claude SEO 把"SEO 审计"从一份静态的 PDF 发现清单，重塑成 Claude Code 里可对话、可迭代、可证伪的并行工作流。它最大价值不在于又多了一个爬虫，而在于：**AI 搜索优先的视角**、**每条建议都带失败判据的可证伪性**，以及**MIT 开源、数据不离本机、零按域计费**的透明度。

如果你已经是 Claude Code 用户，且手上跑着 5 个以上站点，把它接入日常工作流几乎零成本——一次 `/seo audit` 就能在十几分钟内得到一份带优先级的行动清单。对于想深入理解 AI 时代 SEO 方法论的人，其 10 原则框架与一手证据驱动的 GEO 立场，也值得单独研读。

> 仓库地址：https://github.com/AgriciDaniel/claude-seo （MIT 协议，欢迎社区贡献）
