---
title: "Hiring Agent：基于 LLM 的开源简历评分系统，解析 PDF 并输出可解释评估报告"
date: 2026-06-24
description: "Hiring Agent 是 InterviewStreet 开源的简历评估工具，通过 LLM 解析 PDF 简历为结构化 JSON，结合 GitHub 开源贡献信号，输出带证据链的客观评分。支持 Ollama 本地模型和 Google Gemini，适用于技术招聘初筛场景。"
author: "Cheman"
slug: hiring-agent
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 技术, LLM, 招聘]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Hiring Agent**，一个基于 LLM 的简历到评分流水线，能够从 PDF 简历中提取结构化数据，结合 GitHub 技术信号，输出公平、可解释的评估结果。

## 一、项目概述

Hiring Agent 是由 HackerRank（InterviewStreet）团队开源的简历评估系统。它解决的核心问题是：**如何让简历筛选更客观、可解释、可复现**。

传统简历筛选依赖人工主观判断，容易引入偏见。Hiring Agent 将整个流程自动化：

1. **PDF 解析**：使用 PyMuPDF 将简历 PDF 转换为 Markdown 格式
2. **结构化提取**：通过 LLM（Ollama 本地模型或 Google Gemini）按章节提取 JSON Resume 标准格式
3. **GitHub 增强**：自动抓取候选人的 GitHub 公开仓库，评估开源贡献质量
4. **多维度评分**：输出包含 `open_source`、`self_projects`、`production`、`technical_skills` 四大维度的评分，附带证据链和扣分项

```
简历 PDF ──→ PyMuPDF 提取 ──→ LLM 结构化解析 ──→ GitHub 信号增强 ──→ 评估报告
```

核心特性：
- **完全本地化**：支持 Ollama，无需将敏感简历数据发送到第三方 API
- **可解释性**：每个评分维度都附带 evidence 字段，说明打分依据
- **公平性约束**：评估模板内置公平性规则，减少模型偏见
- **开发模式**：支持缓存中间结果、导出 CSV，方便迭代调优

## 二、技术原理

### 架构设计

项目采用模块化设计，核心模块职责清晰：

| 模块 | 职责 |
|------|------|
| `pymupdf_rag.py` | PDF 转 Markdown，保留标题、链接、表格结构 |
| `pdf.py` | 分章节调用 LLM，使用 Jinja 模板提取结构化数据 |
| `github.py` | 抓取 GitHub  Profile + Repos，LLM 筛选 Top 7 项目 |
| `evaluator.py` | 多维度评分，输出 EvaluationData（Pydantic 模型） |
| `score.py` | 编排端到端流程，支持 CSV 导出 |
| `models.py` | 全系统 Pydantic 数据模型 + LLM Provider 抽象 |

### 核心技术栈与选型理由

- **PyMuPDF**：PDF 解析速度快，能较好保留文档结构，比 pdfplumber 更轻量
- **Jinja2 模板**：将 Prompt 与代码解耦，方便针对不同章节定制提取指令
- **Pydantic v2**：用类型安全的模型定义 LLM 输出格式（`response_format: EvaluationData.model_json_schema()`）
- **Ollama**：本地 LLM 运行时，支持 `gemma3:4b` 等小模型，兼顾效果与隐私
- **Provider 抽象**：`LLMProvider` Protocol 统一 Ollama / Gemini 调用接口，切换模型无需改业务代码

### 关键算法与数据流

**1. PDF 分章节提取**

`pdf.py` 中的 `PDFHandler` 将简历按 6 个章节分别调用 LLM：

```python
sections = ["basics", "work", "education", "skills", "projects", "awards"]

for section_name in sections:
    section_data = self._extract_section_data(text_content, section_name)
    if section_data:
        complete_resume.update(section_data)
```

每个章节使用独立的 Jinja 模板（如 `prompts/templates/basics.jinja`），通过 `response_format` 约束输出为严格 JSON。

**2. GitHub 项目筛选**

`github.py` 抓取用户所有仓库后，通过 LLM 从中选择最具代表性的 7 个项目：

```python
prompt = template_manager.render_template(
    "github_project_selection", projects_data=projects_json
)
# LLM 返回精选的 7 个唯一项目
selected_projects = json.loads(response_text)
```

筛选逻辑考虑：
- `contributor_count > 1` 判定为开源贡献（`project_type: "open_source"`）
- 作者 commit 数阈值过滤
- 优先选择有实质贡献（非 fork 无改动）的仓库

**3. 评估模型**

`evaluator.py` 使用以下评分模板（`resume_evaluation_criteria.jinja`）：

```
scores:
  open_source: CategoryScore(score, max, evidence)
  self_projects: CategoryScore(score, max, evidence)
  production: CategoryScore(score, max, evidence)
  technical_skills: CategoryScore(score, max, evidence)
bonus_points: BonusPoints(total ≤ 20, breakdown)
deductions: Deductions(total, reasons)
```

评分范围：`[-20, 120]`，允许扣分但不至负分，鼓励全面评估。

### 数据流分析

```
score.py::main(resume.pdf)
  │
  ├─ PyMuPDF → Markdown 文本
  │     ↓
  ├─ PDFHandler.extract_json_from_pdf()
  │     → JSONResume (Pydantic)
  │     ↓
  ├─ github.py::fetch_and_display_github_info()
  │     → GitHubProfile + Top 7 Projects
  │     ↓
  └─ ResumeEvaluator.evaluate_resume(resume_text)
        → EvaluationData
        ↓
       stdout 输出报告 + CSV 追加（开发模式）
```

## 三、安装与快速开始

### 环境要求

- Python 3.11+（仓库 `.python-version` 锁定 3.11.13）
- 选择一种 LLM 后端：
  - **Ollama**（推荐，隐私友好）：安装后运行 `ollama serve`
  - **Google Gemini**：申请 API Key

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/interviewstreet/hiring-agent
cd hiring-agent

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# 选择 LLM 提供商：ollama 或 gemini
LLM_PROVIDER=ollama

# 模型名称（Ollama 需先 pull）
DEFAULT_MODEL=gemma3:4b

# 如果用 Gemini，填写 API Key
GEMINI_API_KEY=your_key_here

# GitHub Token（可选，提高 API 限流）
GITHUB_TOKEN=ghp_xxx
```

### 最简运行示例

```bash
# 下载 Ollama 模型（如果选择 Ollama）
ollama pull gemma3:4b

# 运行评估
python score.py /path/to/resume.pdf
```

输出示例：

```
✅ Found 8 repositories
📊 Project classification: 3 open source, 5 self projects
🤖 Using LLM to select top 5 projects from 8 repositories...
✅ LLM selected 7 unique top projects: hiring-agent, resume-parser, ...

==========
评估报告
==========

技术技能: 38/40
  证据: 候选人熟练掌握 Python、TypeScript，有 5 个生产项目...

开源贡献: 15/20
  证据: 在 3 个开源项目中有实质 commit，累计 127 contributions...

...
```

## 四、使用方法与实战

### 基础用法

评估单份简历：

```bash
python score.py data/resumes/alice.pdf
```

开启开发模式（缓存 + CSV 导出）：

```python
# config.py
DEVELOPMENT_MODE = True
```

运行后：
- 中间结果缓存到 `cache/` 目录（PDF 解析结果、GitHub API 响应）
- 评分结果追加到 `resume_evaluations.csv`

### 进阶用法

**1. 批量评估**

```bash
for pdf in data/resumes/*.pdf; do
    python score.py "$pdf"
done
```

**2. 切换 Gemini 模型**

```env
LLM_PROVIDER=gemini
DEFAULT_MODEL=gemini-2.5-pro
GEMINI_API_KEY=xxx
```

Gemini provider 内置指数退避重试（`GeminiProvider.chat()`），自动处理 `429 ResourceExhausted` 错误。

**3. 自定义评估维度**

编辑 `prompts/templates/resume_evaluation_criteria.jinja`，调整评分标准和权重。

### 实际项目示例

假设你要评估一批后端工程师候选人：

```bash
# 1. 将简历放入目录
ls data/resumes/
# alice.pdf  bob.pdf  charlie.pdf

# 2. 批量运行（开发模式开启，结果存入 CSV）
python score.py data/resumes/alice.pdf
python score.py data/resumes/bob.pdf
python score.py data/resumes/charlie.pdf

# 3. 查看汇总
cat resume_evaluations.csv
```

CSV 包含字段：`candidate_name, final_score, open_source_score, technical_skills_score, key_strengths, ...`

## 五、常见问题与解决方案

### 安装失败

**Q: `pip install -r requirements.txt` 报错，PyMuPDF 编译失败？**

A: PyMuPDF 提供预编译 wheel，确保 pip 版本 ≥ 21.0：

```bash
pip install --upgrade pip
pip install pymupdf
```

如果仍失败，使用 conda 安装：

```bash
conda install -c conda-forge pymupdf
```

### 运行时错误

**Q: Ollama 连接失败：`connection refused`？**

A: 确保 Ollama 服务在运行：

```bash
ollama serve &
# 或者检查是否已在后台运行
ps aux | grep ollama
```

**Q: Gemini API 报错 `429 Resource Exhausted`？**

A: Provider 已内置指数退避重试（最多 5 次，最大等待 120s）。如果频繁触发，考虑：
1. 降低 `temperature`（减少输出 token）
2. 申请更高配额
3. 切换回 Ollama 本地模型

**Q: GitHub API 限流：`X-RateLimit-Remaining: 0`？**

A: 设置 `GITHUB_TOKEN` 环境变量，将限流从 60次/小时 提升到 5000次/小时：

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### 性能问题

**Q: 评估一份简历需要 2-3 分钟，能加速吗？**

A: 几个优化方向：

1. **开启开发模式缓存**：`DEVELOPMENT_MODE = True`，第二次运行直接读缓存
2. **使用更小的模型**：`gemma3:1b` 比 `gemma3:4b` 快 3-4 倍
3. **减少 `max-files`**：如果是通过 `fetch_github.py` 调试，减少抓取文件数

**Q: LLM 响应慢？**

A: 调整 `MODEL_PARAMETERS` 中的 `temperature` 和 `top_p`，低温低随机性响应更快：

```python
"gemma3:4b": {"temperature": 0.0, "top_p": 0.5}  # 更快但可能缺乏多样性
```

### 兼容性

**Q: Python 3.13 能运行吗？**

A: 官方 `.python-version` 是 3.11.13，建议使用 3.11 或 3.12。3.13 可能存在依赖兼容问题。

**Q: Windows 上运行有问题吗？**

A: 可以运行，但需要注意：
- 虚拟环境激活命令不同：`.venv\Scripts\activate`
- 如果使用的 PowerShell，执行策略可能阻止脚本运行，需先执行：`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## 六、总结

Hiring Agent 是一个设计优雅、实用性强的开源项目。它通过 LLM 将主观的简历筛选过程标准化、可解释化，尤其适合技术团队搭建自动化初筛流程。

**亮点总结**：
1. **隐私优先**：Ollama 本地支持，简历数据不出本地
2. **可解释性**：每个评分都有 evidence 支撑，方便复盘和争议处理
3. **模块化**：Prompt 模板、Provider 抽象、Pydantic 模型三层解耦，易于扩展
4. **开发友好**：缓存 + CSV 导出，方便调优和批量处理

**适用场景**：
- 技术团队搭建简历初筛 pipeline
- 招聘平台做候选人与 JD 的匹配度预评估
- 个人开发者研究 LLM 结构化输出的最佳实践

项目目前由 HackerRank 团队维护，欢迎通过 [CONTRIBUTING.md](https://github.com/interviewstreet/hiring-agent/blob/master/CONTRIBUTING.md) 参与贡献。

---

**项目链接**：[interviewstreet/hiring-agent](https://github.com/interviewstreet/hiring-agent)

**License**：MIT
