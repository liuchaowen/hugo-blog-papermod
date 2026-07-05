---
title: "MarketingSkills：为 AI Agent 打造的营销技能库"
date: 2026-07-05
description: "MarketingSkills 是一个面向 AI 编程代理的营销技能集合，涵盖 SEO、CRO、内容营销、付费广告、增长工程等领域，支持 Claude Code、Cursor、Windsurf 等主流 AI Agent，让 AI 助手具备专业的营销能力。"
author: "Cheman"
slug: marketingskills
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI Agent", "营销", "Marketing", "SaaS"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MarketingSkills**，一个专为 AI 编程代理打造的营销技能库，让你的 AI 助手从"能写代码"进化到"懂营销"。

## 一、项目概述

MarketingSkills 由营销专家 Corey Haines 开发，旨在让 Claude Code、Cursor、Windsurf 等 AI 编程代理具备专业的营销知识和工作流程。它是一系列 Markdown 格式的技能文件，当 AI Agent 检测到用户正在进行营销相关任务时，会自动加载对应的技能，应用最佳实践框架。

**核心价值**：
- **降低营销门槛**：技术人员无需深入学习营销理论，AI Agent 即可提供专业建议
- **标准化工作流程**：每个技能都包含经过验证的框架和检查清单
- **跨技能协同**：技能之间相互引用，形成完整的营销知识图谱

**项目特性**：
- 50+ 营销技能，覆盖 SEO、CRO、内容营销、付费广告、增长工程等领域
- 支持 Claude Code、OpenAI Codex、Cursor、Windsurf 等主流 AI Agent
- 技能间自动交叉引用，构建完整营销上下文
- 开源免费，支持自定义扩展

## 二、技术原理

### 架构设计

MarketingSkills 采用 **技能图谱（Skill Graph）** 架构，核心是 `product-marketing` 技能作为全局上下文，其他所有技能在执行前都会先读取它来理解产品、受众和定位信息。

```
                         ┌──────────────────────────────────────┐
                         │          product-marketing           │
                         │    (read by all other skills first)  │
                         └──────────────────┬───────────────────┘
                                            │
    ┌──────────────┬─────────────┬──────────┼─────────────┬──────────────┐
    ▼              ▼             ▼          ▼             ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  SEO &   │ │   CRO    │ │Content & │ │  Paid &  │ │ Growth & │
│ Content  │ │          │ │   Copy   │ │Measure   │ │ Retention│
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│seo-audit │ │cro       │ │copywrite │ │ads       │ │referrals │
│ai-seo    │ │signup    │ │copy-edit │ │ab-testing│ │free-tools│
│schema    │ │onboarding│ │cold-email│ │analytics │ │churn-prev│
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

这种设计的核心思想是：**营销不是孤立的任务，而是需要全局上下文的系统工程**。

### 技能规范与加载机制

技能文件遵循 [Agent Skills spec](https://agentskills.io) 规范，每个技能是一个包含以下结构的 Markdown 文件：

```markdown
---
name: cro
description: 当用户想要优化页面转化率时使用此技能...
---

# CRO 技能内容

## 前置检查
- [ ] 读取 product-marketing.md 获取产品上下文

## 核心框架
...

## 相关技能
- copywriting
- ab-testing
```

AI Agent 在运行时会：
1. 扫描 `.agents/skills/` 或 `.claude/skills/` 目录
2. 根据用户请求匹配技能描述
3. 加载匹配的技能并执行其中的指令

### 技能交叉引用机制

技能之间通过 **Related Skills** 部分建立依赖关系，例如 `copywriting` 技能会引用 `cro` 和 `ab-testing`，形成知识网络：

```python
# 技能依赖解析伪代码
def load_skill(skill_name):
    skill = read_markdown(f"skills/{skill_name}/SKILL.md")
    
    # 先加载 product-marketing 获取全局上下文
    if skill_name != "product-marketing":
        context = read_markdown("skills/product-marketing/SKILL.md")
        skill.context = parse_context(context)
    
    # 递归加载相关技能
    for related in skill.related_skills:
        skill.related[related] = load_skill(related)
    
    return skill
```

### 文件组织结构

```
marketingskills/
├── skills/
│   ├── product-marketing/
│   │   └── SKILL.md          # 全局产品上下文
│   ├── cro/
│   │   └── SKILL.md          # 转化率优化
│   ├── copywriting/
│   │   └── SKILL.md          # 文案写作
│   ├── seo-audit/
│   │   └── SKILL.md          # SEO 审计
│   └── ... (50+ skills)
├── README.md
└── CONTRIBUTING.md
```

## 三、安装与快速开始

### 环境要求

- Node.js 18+ (用于 npx)
- 或任意支持 Agent Skills spec 的 AI 编程工具

### 安装方式

**方式一：CLI 安装（推荐）**

```bash
# 安装所有技能
npx skills add coreyhaines31/marketingskills

# 安装特定技能
npx skills add coreyhaines31/marketingskills --skill cro copywriting seo-audit
```

**方式二：Claude Code 插件**

```bash
/plugin marketplace add coreyhaines31/marketingskills
/plugin install marketing-skills
```

**方式三：Git Submodule**

```bash
git submodule add https://github.com/coreyhaines31/marketingskills.git .agents/marketingskills
```

### 初始化产品上下文

首次使用时，需要创建产品营销上下文文件：

```bash
# 创建 .agents 目录
mkdir -p .agents

# AI 会引导你填写产品信息
# 生成 .agents/product-marketing.md
```

`product-marketing.md` 示例：

```markdown
# Product Marketing Context

## Product
- **Name**: YourSaaS
- **Tagline**: AI-powered marketing automation
- **Target Audience**: B2B SaaS founders, marketing teams

## Value Proposition
Automate repetitive marketing tasks with AI, save 10+ hours per week.

## Key Features
- AI content generation
- Automated email sequences
- Analytics dashboard
```

## 四、使用方法与实战

### 基础用法

安装后，直接向 AI Agent 提出营销需求，它会自动匹配并加载相应技能：

```
用户: "帮我优化这个落地页的转化率"
AI: [自动加载 cro 技能]
    → 先读取 product-marketing.md
    → 应用 CRO 框架分析页面
    → 输出优化建议

用户: "写一段产品介绍文案"
AI: [自动加载 copywriting 技能]
    → 基于产品上下文生成文案
    → 引用 CRO 原则优化转化元素
```

### 进阶用法：技能协同

多个技能会自动协同工作。例如当你请求"创建一个冷邮件序列"时：

```
AI 执行流程:
1. 加载 cold-email 技能
2. 读取 product-marketing.md 获取产品定位
3. 引用 copywriting 技能优化邮件文案
4. 应用 revops 技能设置邮件触发流程
5. 输出完整的冷邮件序列 + 配置建议
```

### 实战案例：SaaS 产品营销

假设你正在为一个 SaaS 产品制定营销计划：

```
用户: "我需要为新上线的 SaaS 产品制定营销计划"

AI 执行:
1. 加载 marketing-plan 技能
2. 引导用户填写 product-marketing.md
3. 基于 marketing-ideas 技能生成策略建议
4. 引用 pricing 技能制定定价策略
5. 应用 launch 技能规划发布流程
6. 输出完整营销计划文档
```

### 技能分类一览

| 类别 | 技能示例 | 应用场景 |
|------|----------|----------|
| **转化优化** | cro, signup, onboarding, popups | 优化落地页、注册流程、激活率 |
| **内容营销** | copywriting, emails, social, cold-email | 撰写文案、邮件序列、社媒内容 |
| **SEO & 发现** | seo-audit, ai-seo, programmatic-seo, schema | 技术 SEO、AI 搜索优化、结构化数据 |
| **付费增长** | ads, ad-creative, ab-testing, analytics | 广告投放、A/B 测试、数据追踪 |
| **增长工程** | referrals, free-tools, co-marketing | 推荐系统、免费工具、联合营销 |
| **战略规划** | marketing-ideas, marketing-psychology, pricing | 营销创意、心理学策略、定价模型 |

## 五、常见问题与解决方案

### Q1: 安装后 AI 没有自动加载技能

**原因**：AI Agent 可能没有正确配置技能目录路径。

**解决方案**：
```bash
# 确认技能安装位置
ls -la .agents/skills/

# Claude Code 用户检查
ls -la .claude/skills/

# 如果技能在 .agents/ 但 AI 未识别，创建符号链接
ln -s .agents/skills .claude/skills
```

### Q2: 技能加载后输出不符合预期

**原因**：缺少 `product-marketing.md` 产品上下文文件。

**解决方案**：
```bash
# 创建产品上下文文件
mkdir -p .agents
# 然后让 AI 引导你填写产品信息
```

**上下文文件模板**：
```markdown
# Product Marketing Context

## Product
- Name: [产品名]
- Tagline: [一句话描述]
- Target Audience: [目标用户]

## Value Proposition
[核心价值主张]

## Key Competitors
[主要竞争对手]

## Pricing
[定价策略]
```

### Q3: 从 v1.x 升级后出现重复技能

**原因**：v2.0 重命名了 17 个技能，旧文件夹未自动清理。

**解决方案**：
```bash
# 清理旧技能文件夹
cd .agents/skills/
rm -rf page-cro form-cro ab-test-setup analytics-tracking \
       aso-audit competitor-alternatives email-sequence \
       free-tool-strategy launch-strategy onboarding-cro \
       paid-ads paywall-upgrade-cro popup-cro pricing-strategy \
       product-marketing-context referral-program schema-markup \
       signup-flow-cro social-content

# 重新安装 v2.0 技能
npx skills add coreyhaines31/marketingskills
```

### Q4: 如何自定义技能？

**方案**：Fork 仓库后修改技能内容：

```bash
# Fork 项目到自己的 GitHub
# 克隆到本地
git clone https://github.com/YOUR_USERNAME/marketingskills.git

# 修改技能内容
vim marketingskills/skills/cro/SKILL.md

# 在项目中使用自定义版本
npx skills add YOUR_USERNAME/marketingskills
```

## 六、总结

MarketingSkills 是一个开创性的项目，它将专业营销知识封装成 AI Agent 可直接使用的技能文件。对于技术人员来说，这意味着你可以让 AI 编程助手不仅仅是"写代码"，还能"懂营销"；对于营销人员来说，这是一套经过实战验证的营销框架集合，可以作为工作检查清单和灵感来源。

项目的核心价值在于：
1. **知识工程化**：将隐性营销知识转化为显性的、可执行的技能文件
2. **跨技能协同**：通过技能图谱实现营销任务的端到端自动化
3. **持续迭代**：开源社区驱动，不断新增和优化营销技能

如果你正在构建 SaaS 产品，或者希望让 AI 助手具备更强的营销能力，MarketingSkills 是一个值得深入研究和应用的工具库。
