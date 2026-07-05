---
title: "354 个生产级 Claude Code 技能包：覆盖 13 个 AI 编程工具的超全开源技能库"
date: 2026-07-05
description: "探索 alirezarezvani/claude-skills——最全面的开源 Claude Code 技能库，包含 354 个生产级技能、96 个智能体和 102 个命令，支持 Claude Code、OpenAI Codex、Gemini CLI 等 13 个 AI 编程工具。"
author: "Cheman"
slug: "claude-skills"
draft: false
categories: ["技术", "开源"]
tags: ["Claude Code", "AI 编程", "开源项目", "GitHub Trending", "技能库"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**claude-skills**，这是目前最全面的开源 Claude Code 技能库，包含 354 个生产级技能包，支持 13 个主流 AI 编程工具。

## 一、项目概述

**claude-skills** 是由 Alireza Rezvani 维护的超大型开源项目，提供 354 个生产级 Claude Code 技能、插件和智能体技能，覆盖 13 个 AI 编程工具。项目在 GitHub 上已获得 5200+ Stars，是目前最全面的 AI 编程代理技能库。

**核心数据：**
- 📦 354 个技能，覆盖 18 个专业领域
- 🤖 96 个智能体（Agents）
- 👤 7 个预配置人格（Personas）
- 🔧 102 个命令
- 🐍 593 个 Python CLI 工具（全部仅使用标准库，零依赖）
- 📚 711 个模板、清单和领域知识文件

**支持的工具：**
Claude Code · OpenAI Codex · Gemini CLI · OpenClaw · Hermes Agent · Mistral Vibe · Cursor · Aider · Windsurf · Kilo Code · OpenCode · Augment · Antigravity

## 二、技术原理

### 2.1 技能包结构

每个技能包是一个独立文件夹，包含以下标准结构：

```
skill-name/
├── SKILL.md          # 结构化指令、工作流和决策框架
├── scripts/          # Python CLI 工具（stdlib-only）
├── references/       # 模板、清单、领域知识文件
└── assets/           # 可选：附加资源
```

**SKILL.md** 采用 [agentskills.io](https://agentskills.io) 标准格式，包含 frontmatter 和结构化指令，使 AI 代理能够理解如何执行特定领域的任务。

### 2.2 多工具转换架构

项目内置 `scripts/convert.sh` 脚本，可将全部 354 个技能转换为 9 种 AI 编程工具的原生格式：

```bash
# 转换所有技能到所有工具格式（约 15 秒）
./scripts/convert.sh --tool all

# 安装到目标项目
./scripts/install.sh --tool cursor --target /path/to/project --force
```

转换映射表：

| 工具 | 目标格式 | 安装路径 |
|------|---------|---------|
| Cursor | `.mdc` rules | `.cursor/rules/` |
| Aider | `CONVENTIONS.md` | 项目根目录 |
| Kilo Code | `.kilocode/rules/` | `.kilocode/rules/` |
| Windsurf | `.windsurf/skills/` | `.windsurf/skills/` |
| OpenCode | `.opencode/skills/` | `.opencode/skills/` |
| Augment | `.augment/rules/` | `.augment/rules/` |
| Hermes Agent | `~/.hermes/skills/` | 需要运行同步脚本 |
| Mistral Vibe | `~/.vibe/skills/` | 需要运行安装脚本 |

### 2.3 零依赖 Python 工具链

项目包含 593 个 Python CLI 工具，全部仅使用 Python 标准库（`argparse`、`json`、`pathlib` 等），无需 `pip install` 任何依赖。

**示例工具：**

```python
# finance/saas-metrics-coach/scripts/metrics_calculator.py
# 计算 SaaS 核心指标：MRR、Churn Rate、LTV 等
python3 finance/saas-metrics-coach/scripts/metrics_calculator.py \
  --mrr 80000 --customers 200 --churned 3 --json
```

```python
# engineering/skill-security-auditor/scripts/skill_security_auditor.py
# 安全审计工具：扫描技能包中的恶意代码
python3 engineering/skill-security-auditor/scripts/skill_security_auditor.py /path/to/skill/
```

### 2.4 技能 / 智能体 / 人格的区别

| 类型 | 目的 | 范围 | 语气 | 示例 |
|------|------|------|------|------|
| **Skills** | 如何执行任务 | 单一领域 | 中性 | "按照这些步骤做 SEO" |
| **Agents** | 执行什么任务 | 单一领域 | 专业 | "运行安全审计" |
| **Personas** | 谁在思考 | 跨领域 | 人格驱动 | "像初创公司 CTO 一样思考" |

## 三、安装与快速开始

### 3.1 Claude Code（推荐）

```bash
# 添加市场
/plugin marketplace add alirezarezvani/claude-skills

# 按领域安装
/plugin install engineering-skills@claude-code-skills           # 24 个核心工程技能
/plugin install engineering-advanced-skills@claude-code-skills # 25 个 POWERFUL 级技能
/plugin install marketing-skills@claude-code-skills            # 43 个营销技能
/plugin install c-level-skills@claude-code-skills              # 28 个 C 级顾问技能

# 安装单个技能
/plugin install skill-security-auditor@claude-code-skills
/plugin install playwright-pro@claude-code-skills
/plugin install self-improving-agent@claude-code-skills
```

### 3.2 OpenAI Codex

```bash
npx agent-skills-cli add alirezarezvani/claude-skills --agent codex
```

### 3.3 OpenClaw

```bash
bash <(curl -s https://raw.githubusercontent.com/alirezarezvani/claude-skills/main/scripts/openclaw-install.sh)
```

### 3.4 Gemini CLI（新增）

```bash
git clone https://github.com/alirezarezvani/claude-skills.git
cd claude-skills
./scripts/gemini-install.sh

# 开始使用技能
> activate_skill(name="senior-architect")
```

### 3.5 手动安装

```bash
git clone https://github.com/alirezarezvani/claude-skills.git
# 复制任意技能文件夹到对应工具的技能目录
cp -r claude-skills/engineering/senior-architect ~/.claude/skills/
```

## 四、使用方法与实战

### 4.1 单人冲刺模式（Solo Sprint）

适合：副项目、MVP 构建、独立开发者

```text
第 1-2 周：startup-cto 人格 + aws-solution-architect + senior-frontend → 构建
第 3-4 周：growth-marketer 人格 + launch-strategy + copywriting + seo-audit → 准备发布
第 5-6 周：solo-founder 人格 + email-sequence + analytics-tracking → 发布并迭代
```

### 4.2 领域深度审查（Domain Deep-Dive）

适合：架构评审、合规审计

```text
使用 senior-architect 技能，审查我们的微服务架构，
识别前 3 个可扩展性风险。
```

### 4.3 多智能体交接（Multi-Agent Handoff）

适合：高风险决策、发布就绪检查

```text
使用 growth-marketer 技能生成落地页文案，
然后让 startup-cto 人格审查技术可行性和性能影响。
```

### 4.4 实战示例：架构评审

```text
Using the senior-architect skill, review our microservices architecture
and identify the top 3 scalability risks.
```

AI 会加载 `engineering/senior-architect/SKILL.md` 中的结构化指令，按照预定义的架构评审框架（包括性能、安全性、可维护性等维度）进行分析。

### 4.5 实战示例：内容创作

```text
Using the content-creator skill, write a blog post about AI-augmented
development. Optimize for SEO targeting "Claude Code tutorial".
```

AI 会加载内容创作工作流，包括关键词研究、结构化写作、SEO 优化等步骤。

## 五、常见问题与解决方案

### 5.1 安装失败

**问题：** `/plugin marketplace add` 命令无响应

**解决方案：**
1. 检查 Claude Code 版本是否支持插件市场
2. 手动克隆仓库：`git clone https://github.com/alirezarezvani/claude-skills.git`
3. 使用手动安装方式复制技能文件夹

### 5.2 技能不生效

**问题：** 安装后 AI 不识别技能

**解决方案：**
1. 确认技能安装在正确路径（如 `~/.claude/skills/`）
2. 重启 Claude Code 使技能生效
3. 检查 SKILL.md 格式是否符合 agentskills.io 标准

### 5.3 转换脚本执行失败

**问题：** `./scripts/convert.sh --tool all` 报错

**解决方案：**
1. 确认已安装 `bash` 和基本 Unix 工具
2. 检查脚本执行权限：`chmod +x scripts/convert.sh`
3. 查看具体错误信息，通常是缺少依赖工具（如 `sed`、`awk`）

### 5.4 Python 工具运行报错

**问题：** `ModuleNotFoundError: No module named 'xxx'`

**解决方案：**
- 项目所有 Python 工具均使用标准库，不应出现此错误
- 检查是否使用了正确的 Python 版本（需要 Python 3.6+）
- 确认运行命令格式正确：`python3 <path-to-script>.py [args]`

### 5.5 多工具格式不兼容

**问题：** 转换后的格式在目标工具中无法识别

**解决方案：**
1. 检查是否使用了最新版本的项目代码
2. 查看各工具的官方文档，确认技能文件放置路径
3. 对于 Hermes Agent 和 Mistral Vibe，需要运行专用同步脚本

## 六、核心技能亮点

### 6.1 POWERFUL 级技能（25 个高级技能）

| 技能 | 功能 |
|------|------|
| **agent-designer** | 多智能体编排、工具模式、性能评估 |
| **rag-architect** | RAG 管道构建器、分块优化、检索评估 |
| **mcp-server-builder** | 从 OpenAPI 规范构建 MCP 服务器 |
| **skill-security-auditor** | 🔒 安装前安全扫描，检测恶意代码 |
| **ci-cd-pipeline-builder** | 分析技术栈 → 生成 GitHub Actions / GitLab CI 配置 |
| **pr-review-expert** | 影响范围分析、安全扫描、覆盖率 delta |
| **tech-debt-tracker** | 代码库债务扫描器、优先级排序、趋势仪表板 |

### 6.2 C 级顾问技能（68 个）

覆盖完整 C 级高管团队：
- CEO、CTO、CFO、CMO、CRO、CPO、COO、CHRO、CISO、GC、CDO、CAIO、CCO、VPE
- 创始人模式代理
- 董事会会议支持
- 文化与协作框架

### 6.3 营销技能（48 个）

8 个专业 Pod：
- 内容营销
- SEO + AEO（`aeo` — E-E-A-T 审计，跨 5 个 LLM 的引用跟踪）
- 本地 SEO（`local-seo-manager` — GBP/NAP/Map-Pack）
- CRO（转化率优化）
- 渠道营销
- 增长营销
- 竞争情报
- 销售 + 上下文基础 + 编排路由器

### 6.4 安全审计技能

```bash
# 在安装任何第三方技能前运行安全审计
python3 engineering/skill-security-auditor/scripts/skill_security_auditor.py /path/to/skill/
```

扫描内容：
- 命令注入
- 代码执行
- 数据泄露
- 提示注入
- 依赖供应链风险
- 权限提升

返回 **PASS / WARN / FAIL** 及修复建议。

## 七、总结

**claude-skills** 是一个令人惊叹的开源项目，它将 AI 辅助编程从"通用对话"提升到"领域专家协作"的层次。354 个生产级技能包覆盖了从工程、产品、营销到 C 级决策的各个领域，真正实现了"给 AI 代理装上专业技能包"。

**项目亮点：**
1. **零依赖：** 全部 593 个 Python 工具仅使用标准库
2. **多工具支持：** 一套技能，13 个平台通用
3. **生产级质量：** 每个技能都经过实战验证
4. **活跃维护：** 持续更新，v2.9.0 新增研究操作域

如果你正在使用 Claude Code、OpenAI Codex 或任何支持的 AI 编程工具，强烈建议安装这个技能库。它不仅能显著提升 AI 辅助编程的专业度，还能让你学到大量领域最佳实践。

**资源链接：**
- GitHub: [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)
- 在线文档: [alirezarezvani.github.io/claude-skills](https://alirezarezvani.github.io/claude-skills/)
- 技能工厂: [Claude Code Skills & Agents Factory](https://github.com/alirezarezvani/claude-code-skills-agents-factory)

> **提示：** 安装后，尝试运行 `skill-security-auditor` 扫描你现有的技能包，确保没有安全风险！
