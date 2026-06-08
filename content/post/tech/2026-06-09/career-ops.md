---
title: "Career-Ops：AI 驱动的职业搜索系统，帮你筛选匹配度最高的职位"
date: 2026-06-09
description: "Career-Ops 是一个开源的 AI 驱动职业搜索工具，能够自动评估职位匹配度、生成定制化简历、扫描招聘门户，帮你从数百个职位中精准找到最值得申请的那一个。"
author: "Cheman"
slug: "career-ops-ai-job-search"
draft: false
categories: [技术, 开源]
tags: [AI, 求职, 自动化, Claude, 开源]
ShowToc: true
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

今天在 GitHub Trending 上看到一个有意思的项目：**Career-Ops**，这是一个把 AI Coding CLI（Claude Code、OpenCode、Gemini CLI 等）变成完整求职指挥中心的工具。作者用这个系统评估了 740+ 个职位，生成了 100+ 份定制化简历，最终成功拿到了 Head of Applied AI 的 offer。

## 一、项目概述

**Career-Ops** 不是一个"海投"工具，而是一个**过滤器**。它的核心理念是：

> 公司用 AI 筛选候选人，那我就用 AI 来**反向筛选**公司。

这个项目解决了求职者面临的核心痛点：

- **职位太多，无从筛选**：每天数百个职位发布，哪些值得申请？
- **简历定制太耗时**：每个职位都要调整简历，效率极低
- **申请进度难追踪**：用 Excel 表格管理，容易混乱
- **评估标准不清晰**：凭感觉判断匹配度，容易错过好机会或浪费时间

### 核心特性

| 特性 | 说明 |
|------|------|
| **自动评估** | 用 A-F 评分系统（10 个加权维度）评估职位匹配度 |
| **智能简历生成** | 根据 JD 自动生成 ATS 优化的 PDF 简历 |
| **门户扫描** | 自动扫描 Greenhouse、Ashby、Lever 等招聘平台 |
| **批量处理** | 用子代理并行评估 10+ 个职位 |
| **进度追踪** | 单一数据源，自动去重和健康检查 |
| **人机协同** | AI 评估和建议，你来决定是否申请 |

**重要提示**：系统强烈建议**不要申请评分低于 4.0/5 的职位**。你的时间很宝贵，招聘人员的时间也很宝贵。

## 二、技术原理

### 架构设计

```
你粘贴职位 URL 或描述
        │
        ▼
┌──────────────────┐
│  原型检测       │  分类：LLMOps / Agentic / PM / SA / FDE
│  (Archetype)   │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  A-F 评估       │  匹配度、差距、薪酬调研、STAR 故事
│  (读取 cv.md)   │
└────────┬─────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
 Report  PDF  Tracker
  .md   .pdf   .tsv
```

### 评估维度（6 大模块）

1. **Role Summary**：职位概要、原型分类、远程政策、公司规模
2. **CV Match**：匹配度评分（CV Match、North Star、Comp、Cultural、Red Flags）
3. **Level & Strategy**：级别判断、定位策略、薪资谈判空间
4. **Comp Research**：薪酬调研（内置_levels.fyi_ 数据）
5. **Personalization & Outreach**：定制化申请材料和 LinkedIn 挖掘
6. **Interview Preparation**：面试准备（公司研究、STAR+Reflection 故事库）

### 技术栈

- **Agent**：Claude Code（也支持 Gemini CLI、Codex、GitHub Copilot）
- **PDF 生成**：Playwright/Puppeteer + HTML 模板（Space Grotesk + DM Sans 字体）
- **扫描器**：Playwright + Greenhouse API + WebSearch
- **Dashboard**：Go + Bubble Tea + Lipgloss（Catppuccin Mocha 主题）
- **数据存储**：Markdown 表格 + YAML 配置 + TSV 批处理文件

### 关键技术亮点

#### 1. Machine Summary（机器可读摘要）

每个评估报告末尾都有一个 YAML 格式的 Machine Summary，方便其他脚本解析：

```yaml
company: "Anthropic"
role: "Senior AI Engineer"
score: 4.4
legitimacy_tier: "High Confidence"
archetype: "AI Platform / LLMOps Engineer"
final_decision: "Apply"
hard_stops: []
soft_gaps:
  - "No direct healthcare domain experience"
top_strengths:
  - "Production evaluation pipelines"
risk_level: "Medium"
confidence: "High"
next_action: "Follow up with tailored CV"
```

#### 2. 拒绝模式分析（Rejection Pattern Detector）

内置 `analyze-patterns.mjs` 脚本，可以分析你的申请历史，找出：

- **地理限制 blocker**（如 "US-only"）
- **技术栈不匹配**（如要求 TypeScript 但你主要用 Python）
- **级别不匹配**（如要求是 Staff 级别但你资历不够）

然后根据这些数据给出建议：

- 调整 `portals.yml` 中的过滤条件
- 设置最低评分阈值（如只申请 3.5 分以上的职位）
- 重点关注转化率最高的原型（Archetype）

#### 3. 生命周期检查（Liveness Check）

内置 Playwright 脚本来检查职位是否仍然有效：

- 检测 "Job is no longer available" 等硬编码模式
- 检查页面是否有"Apply"按钮
- 自动过滤过期职位，避免浪费时间

## 三、安装与快速开始

### 环境要求

- **Node.js ≥ 18**
- **Playwright**（用于 PDF 生成）
- **Git**

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/santifer/career-ops.git
cd career-ops && npm install

# 2. 安装 Playwright Chromium（PDF 生成必需）
npx playwright install chromium

# 3. 检查环境
npm run doctor

# 4. 配置
cp config/profile.example.yml config/profile.yml  # 编辑你的个人信息
cp templates/portals.example.yml portals.yml       # 自定义目标公司

# 5. 添加你的简历
# 在项目根目录创建 cv.md，写入你的简历（Markdown 格式）

# 6. 用 Claude 定制系统
claude   # 在这个目录下打开 Claude Code

# 然后让 Claude 帮你定制系统：
# "把原型改成后端工程角色"
# "把这些公司添加到 portals.yml"
# "用我粘贴的简历更新我的 profile"
```

### 最简运行示例

```bash
# 方式 1：粘贴职位 URL（全自动）
/career-ops "https://jobs.ashbyhq.com/anthropic/senior-ai-engineer"

# 方式 2：粘贴职位描述
/career-ops "We are looking for a Senior AI Engineer..."

# 方式 3：扫描门户
/career-ops scan

# 方式 4：生成 PDF 简历
/career-ops pdf

# 方式 5：批量评估
/career-ops batch
```

## 四、使用方法与实战

### 基础用法

#### 1. 评估单个职位

```bash
# 在 Claude Code 中运行
/career-ops "https://jobs.ashbyhq.com/openai/staff-ai-engineer"
```

Claude 会自动：

1. 用 Playwright 抓取职位描述
2. 读取你的 `cv.md`
3. 生成 6 大模块的评估报告（`reports/001-openai-2026-06-09.md`）
4. 给出 A-F 评分和最终建议（Apply / Skip）
5. 如果评分 ≥ 4.0，自动生成定制化 PDF 简历

#### 2. 查看申请进度

```bash
# 在 Claude Code 中运行
/career-ops tracker
```

会显示一个 Markdown 表格：

```markdown
| # | Fecha | Empresa | Rol | Score | Status | PDF | Report | Notas |
|---|--------|---------|-----|-------|--------|-----|--------|-------|
| 1 | 2026-06-01 | Anthropic | Senior AI Engineer | 4.4 | Evaluada | ❌ | [1](reports/001-anthropic-2026-06-01.md) | |
| 2 | 2026-06-03 | OpenAI | Staff AI Engineer | 3.8 | Aplicada | ✅ | [2](reports/002-openai-2026-06-03.md) | |
```

#### 3. 扫描目标公司

```bash
# 在 Claude Code 中运行
/career-ops scan
```

系统会扫描 `portals.yml` 中配置的 45+ 家公司（Anthropic、OpenAI、Retool 等），自动发现新职位并添加到 `pipeline.md`。

### 进阶用法

#### 1. 批量评估

```bash
# 在 Claude Code 中运行
/career-ops batch
```

系统会：

1. 读取 `pipeline.md` 中的所有待评估职位
2. 用 `claude -p` 启动多个子代理并行评估
3. 每个子代理生成一个 TSV 文件（`batch/tracker-additions/*.tsv`）
4. 运行 `npm run merge` 合并到 `applications.md`

#### 2. 生成 ATS 优化的 PDF 简历

```bash
# 在 Claude Code 中运行
/career-ops pdf
```

系统会：

1. 读取评估报告中的关键词
2. 将这些关键词注入到 HTML 简历模板中
3. 用 Playwright 生成 PDF（使用 Space Grotesk + DM Sans 字体）
4. 保存到 `output/` 目录

**ATS 兼容性处理**：

- 自动将 em-dash（—）转换为 ASCII 连字符（-）
- 将智能引号（" "）转换为普通引号（" "）
- 将零宽字符移除
- 确保 PDF 文本可以被 ATS 系统正确提取

#### 3. 面试准备

评估报告中的 **Block F（Interview Preparation）** 会自动生成：

- **公司研究**：产品、竞争对手、最近新闻
- **STAR+Reflection 故事库**：从你的经历中积累 5-10 个通用故事
- **谈判脚本**：薪资谈判框架、地区折扣反驳、竞争 offer 杠杆

### 实际项目示例

假设你正在申请 **Anthropic 的 Senior AI Engineer** 职位：

1. **粘贴职位 URL**：

   ```bash
   /career-ops "https://jobs.ashbyhq.com/anthropic/senior-ai-engineer"
   ```

2. **Claude 生成评估报告**（`reports/001-anthropic-2026-06-09.md`）：

   ```markdown
   ## A. Role Summary
   | Field | Value |
   |-------|-------|
   | Archetype | AI Platform / LLMOps Engineer |
   | Seniority | Senior |
   | Remote | Global remote |
   | Team size | 50-100 |
   | Comp | $180-250k + equity |
   | Domain | AI Safety |
   
   ## B. CV Match
   | Dimension | Score |
   |-----------|-------|
   | CV Match | 4.5/5 |
   | North Star | 4.2/5 |
   | Comp | 4.0/5 |
   | Cultural | 4.8/5 |
   | Red Flags | 0 |
   
   **Global Score: 4.4/5**
   
   ## C. Level & Strategy
   - Your profile: Principal Engineer (IC4-IC5)
   - Role level: Senior (IC3-IC4)
   - Strategy: Emphasize technical leadership and production experience
   
   ## F. Interview Preparation
   - Company research: Anthropic is focused on AI safety...
   - STAR story #1: "Tell me about a time you shipped a complex system..."
   - Negotiation script: "Based on levels.fyi, Senior AI Engineer at Anthropic..."
   ```

3. **生成定制化 PDF 简历**：

   Claude 会自动调整你的简历，突出与 Anthropic 职位相关的经验（如 LLM 训练、AI 安全、生产部署等）。

4. **更新 Tracker**：

   ```markdown
   | 1 | 2026-06-09 | Anthropic | Senior AI Engineer | 4.4 | Evaluada | ❌ | [1](reports/001-anthropic-2026-06-09.md) | |
   ```

## 五、常见问题与解决方案

### 安装失败

**问题**：`npm install` 失败，提示 `playwright` 安装错误。

**解决方案**：

```bash
# 清理缓存并重试
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 如果 Playwright 安装失败，手动安装 Chromium
npx playwright install chromium --with-deps
```

### 运行时错误

**问题**：运行 `/career-ops` 时，Claude 报错 `cv.md not found`。

**解决方案**：

确保在 `career-ops/` 项目根目录下创建 `cv.md` 文件，并写入你的简历（Markdown 格式）。可以参考 `examples/` 目录下的示例。

### PDF 生成失败

**问题**：运行 `/career-ops pdf` 时，Playwright 报错 `Chromium executable not found`。

**解决方案**：

```bash
# 重新安装 Playwright Chromium
npx playwright install chromium

# 验证安装
node -e "const { chromium } = require('playwright'); console.log(chromium.executablePath());"
```

### 性能问题

**问题**：批量评估时，运行时间太长（> 30 分钟）。

**解决方案**：

1. **减少并行数**：编辑 `batch/batch-runner.sh`，将并发数从 10 降低到 5
2. **只评估高分职位**：在 `cv.md` 中明确你的偏好，让 Claude 在评估时更激进地过滤低分职位
3. **使用 Gemini CLI**：如果你有 Gemini API Key，可以用 Gemini 替代 Claude 进行批量评估（免费额度更高）

### 兼容性问题

**问题**：生成的 PDF 在某些 ATS 系统中显示乱码。

**解决方案**：

系统已经内置了 ATS 兼容性处理（`generate-pdf.mjs` 中的 `normalizeTextForATS()` 函数），会自动：

- 将 em-dash（—）转换为 ASCII 连字符（-）
- 将智能引号（" "）转换为普通引号（" "）
- 移除零宽字符

如果还有问题，可以手动检查生成的 HTML 文件（`templates/cv-template.html`），确保没有特殊 Unicode 字符。

## 六、总结

**Career-Ops** 是一个强大且实用的开源工具，特别适合以下人群：

- **技术求职者**：尤其是工程师、产品经理、解决方案架构师等
- **批量申请者**：需要同时申请多个职位，时间紧张
- **数据驱动决策者**：希望通过结构化评估来提高申请成功率

### 优点

- ✅ **开源免费**：MIT 协议，可以随意修改和分发
- ✅ **多 AI 支持**：Claude、Gemini、Codex、GitHub Copilot 都能用
- ✅ **高度可定制**：所有提示词、评分权重、原型定义都可以改
- ✅ **实战验证**：作者用这个系统成功拿到了 Head of Applied AI 的 offer

### 缺点

- ❌ **学习曲线陡峭**：需要熟悉 Claude Code、Playwright、Markdown 等工具
- ❌ **初始配置耗时**：第一次使用需要填写 `cv.md`、`profile.yml`、`portals.yml`
- ❌ **依赖 AI 质量**：评估结果的好坏取决于你的 `cv.md` 写得够不够详细

### 最佳实践

1. **不要急于申请**：前几次评估可能不准确，因为系统还不了解你。花时间完善 `cv.md` 和 `article-digest.md`
2. **设置评分阈值**：根据 `analyze-patterns.mjs` 的输出，设置合理的最低评分阈值（如 3.5/5）
3. **定期同步**：运行 `npm run sync-check` 确保 `cv.md`、`profile.yml`、`_shared.md` 之间的一致性
4. **加入社区**：[Discord 社区](https://discord.gg/8pRpHETxa4)有很多实用技巧和案例分享

### 资源链接

- **GitHub 仓库**：https://github.com/santifer/career-ops
- **作者网站**：https://santifer.io
- **案例研究**：https://santifer.io/career-ops-system
- **Discord 社区**：https://discord.gg/8pRpHETxa4

---

**个人评价**：这是一个非常实用的工具，尤其是对于那些需要批量申请职位的人。它不会帮你"海投"，而是帮你精准筛选最值得申请的职位，并为每个职位生成定制化简历。如果你正在找工作，或者准备跳槽，强烈建议试一试。
