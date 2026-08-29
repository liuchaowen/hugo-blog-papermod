---
title: "Terminal-Bench-Science：用科学任务基准评估 AI Agent 的研究能力"
date: "2026-08-29"
description: "Terminal-Bench-Science 是一个由 Stanford、Anthropic 等机构联合发布的 AI Agent 评测基准，涵盖生命、物理、地球、数学、工程五大科学领域 70+ 项专家策划的任务，帮助研究者和开发者量化 AI 在真实科研工作流中的表现。"
author: "Cheman"
slug: terminal-bench-science
draft: false
categories: ["技术", "AI", "开源"]
tags: ["AI Agent", "Benchmark", "科学研究", "大模型", "Harbor"]
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

今天在 GitHub Trending 上看到一个分量十足的项目：**Terminal-Bench-Science**，由 Harbor Framework 联合 Stanford、Anthropic、Allen Institute 等顶级机构发布，专门用来衡量 AI Agent 在真实科研工作流中的表现——一句话概括：**这是目前最接近真实科学家工作的 AI 评测基准**。

## 一、项目概述

Terminal-Bench-Science 是一个大规模科学社区协作项目，旨在为 AI Agent 提供真实、客观、可验证的科研任务评测环境。与传统的编程或数学评测不同，这里的每一项任务都由对应领域的科研人员亲自策划和审核，覆盖五大科学领域：

- **生命科学**（Life Sciences）
- **物理科学**（Physical Sciences）
- **地球科学**（Earth Sciences）
- **数学**（Mathematics）
- **工程学**（Engineering）

目前已收录 **70 个**专家策划的任务，并持续向 100+ 扩展。所有任务均要求 AI Agent 在沙箱终端环境中完成真实科研操作，结果可客观验证。项目由 Steven Dillmann（Stanford）、Sanmi Koyejo（Stanford）、Ludwig Schmidt（Stanford & Anthropic）等人主导，顾问团队包括 Sara Beery（MIT）、Emma Lundberg（Stanford）、Peter Clark（Allen Institute）等顶尖科学家。

项目采用 **Propose → Build → Review** 的三阶段贡献流程：
1. **Propose**：通过提案表单提交任务想法，接受专家反馈
2. **Build**：按 CONTRIBUTING.md 指南实现任务并提交 PR
3. **Review**：自动化检查 + 并行领域/技术审核 + 最终 bar-raiser 审批

> ⏰ **重要时间节点**：Terminal-Bench-Science 0.2 版本的投稿截止日期为 **2026 年 10 月 5 日**，有意贡献任务的科研人员需尽早提交。

## 二、技术原理

### 2.1 基准架构设计

Terminal-Bench-Science 基于 **Harbor Framework** 构建任务运行环境。Harbor 提供标准化的任务沙箱、Docker 容器化执行环境以及 oracle/nop 双重验证机制，确保每项任务都能在隔离、可复现的环境中运行。

核心设计理念：

```bash
# 安装 Harbor（推荐 uv 方式）
uv tool install "harbor[modal,daytona]"

# 运行基准测试（5 次 oracle 验证）
harbor run -d terminal-bench-science/terminal-bench-science@latest \
   -k 5 \
   --agent oracle \
   --n-concurrent 32 \
   --env modal
```

### 2.2 任务质量保障体系

每项提交的任务都必须通过多层自动化审核才能被接受：

**静态检查**：
- 路径验证、Dockerfile 语法检查、canary 冒烟测试
- 元数据完整性验证、测试引用检查

**实现rubric审查**：
```bash
harbor check  # 使用 39 项评分标准对任务实现进行自动打分
```

**相似度检测**：TF-IDF 算法检测重复任务，防止低质量重复提交。

**容器构建验证**：
- `oracle trial`：正确答案必须在容器中通过
- `nop trial`：空操作（不给 Agent 任何提示）必须失败，确保任务非平凡

**Agent对抗试验**：多 Agent 并行运行 + 作弊检测，防止通过 hack reward 机制绕过任务。

### 2.3 评测模型与 Agent

支持对接多种 Agent 和模型组合：

```bash
# 评测特定 Agent + 模型（如 Claude Code + Claude Opus 5）
harbor run -d terminal-bench-science/terminal-bench-science@latest \
   --agent claude-code \
   --model anthropic/claude-opus-5 \
   --ak reasoning_effort=max \
   --n-concurrent 32 \
   --env modal
```

支持的模型包括 Anthropic Claude 系列、OpenAI GPT 系列、Google Gemini 等，评测结果公开在 [Leaderboard](https://terminal-bench-science.ai/) 上。

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.10+
- Docker（用于容器化任务执行）
- 推荐运行环境：**Modal** 或 **Daytona**（Harbor 原生支持）

### 3.2 安装步骤

```bash
# 方式一：uv（推荐）
uv tool install "harbor[modal,daytona]"

# 方式二：pip
pip install "harbor[modal,daytona]"

# 验证安装
harbor --version
```

### 3.3 下载基准数据集

```bash
# 通过 Harbor Hub 下载最新版本
harbor pull terminal-bench-science/terminal-bench-science@latest
```

### 3.4 运行 Oracle 验证

```bash
# 在你的沙箱环境中验证所有任务可解
harbor run -d terminal-bench-science/terminal-bench-science@latest \
   -k 5 \
   --agent oracle \
   --env modal

# 查看评测结果
harbor report terminal-bench-science
```

## 四、使用方法与实战

### 4.1 贡献新任务

如果你是在某个科学领域有实际研究经验的科研人员，可以通过以下步骤贡献任务：

**Step 1：提交提案**

通过 [Airtable 提案表单](https://airtable.com/appzZC5gEHrXSfNNw/pagjgS95lAQ5FVJxt/form) 提交任务想法，说明任务的科学背景、验证方式和难度预期。提案会经过专家评审，获得初步认可后再进入实现阶段。

**Step 2：实现任务**

按照 [CONTRIBUTING.md](https://github.com/harbor-framework/terminal-bench-science/blob/main/CONTRIBUTING.md) 的详细指南实现任务。任务需要包含：
- 明确的终端操作指令
- 可验证的成功标准
- Dockerfile 化的执行环境
- 完整的测试用例

**Step 3：提交 PR**

打开 Pull Request，系统会自动触发 CI 审核流水线（静态检查 → rubric review → 相似度检测 → Docker 构建验证 → Agent trial）。

### 4.2 评测自己的 Agent

```bash
# 评测 Claude Code Agent 在科学任务上的表现
harbor run -d terminal-bench-science/terminal-bench-science@latest \
   --agent claude-code \
   --model anthropic/claude-opus-5 \
   --n-concurrent 16 \
   --env modal

# 导出评测报告
harbor export --format json --output report.json
```

### 4.3 追踪任务状态

所有提案、PR 和审核状态都公开在 [Task Dashboard](https://stevendillmann.github.io/tb-science-task-dashboard/?stage=2nd) 上，任何人都可以查看当前进展和开放贡献的领域缺口。

## 五、常见问题与解决方案

**Q：任务运行时提示 "oracle flaky"，验证不稳定怎么办？**
A：Oracle 本身设计为运行 5 次取多数结果。如果频繁 flake，建议检查你的沙箱环境资源是否充足，或在 [GitHub Issues](https://github.com/harbor-framework/terminal-bench-science/issues) 反馈环境兼容性问题。

**Q：贡献任务时不确定难度是否合适？**
A：参考 [Task Proposal Rubric](https://github.com/harbor-framework/terminal-bench-science/blob/main/TASK_PROPOSAL_RUBRIC.md) 中的 LLM 评分标准，任务应具有真实的科学价值、明确的验证方式，且对前沿 AI Agent 具有一定挑战性。

**Q：Harbor 安装失败怎么解决？**
A：确保 Python 版本 ≥ 3.10。如果使用 pip 安装失败，尝试先升级 pip：`pip install --upgrade pip`，然后再安装 harbor。

**Q：任务被 similarity check 拦截，提示重复怎么办？**
A：TF-IDF 相似度检测会扫描现有任务库，如果你的任务与已有任务高度重叠，需要调整任务场景或验证方式使其与现有任务有足够区分度。

**Q：Docker 构建失败如何调试？**
A：本地运行 `docker build -t <image-name> .` 逐步排查 Dockerfile 问题，Harbor 的 CI 流水线日志也会给出具体失败原因（通常是依赖未安装或路径错误）。

## 六、总结

Terminal-Bench-Science 的出现填补了 AI Agent 在真实科研场景下评测的空白。与此前以编程题为主的 Agent 评测不同，它直接将 AI 放入生命、物理、地球、数学、工程五大科学领域的真实工作流中，由领域专家策划任务、把关质量，结果具有很高的参考价值。

从生态角度看，这个项目也是一个很好的示范：**让科学家来决定 AI 需要完成什么任务，而不是让 AI 公司单方面定义"智能"的标准**。如果你在某个科学领域有深入的研究经验，完全可以通过贡献任务的方式直接参与 AI 评测标准的制定。

项目已获得 Anthropic、Google、Moonshot AI、SpaceX AI 等多家机构的 API 算力支持，v0.1.0 已发布并配有正式 DOI（`10.5281/zenodo.22110254`），适合学术引用。感兴趣的读者可以从安装 Harbor 开始，体验评测自己 Agent 的科研能力。
