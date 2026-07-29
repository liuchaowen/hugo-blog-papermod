---
title: "FAROS：开源 AutoResearch 运行时，让 AI 自己搞定科研全流程"
date: "2026-07-29"
description: "FAROS（Foundation AutoResearch Operating System）是一个基于 Blueprint 蓝图驱动的开源 AutoResearch 运行时，支持从「idea → experiment → paper → review」全链路自动化，Python 3.11+ 即可运行。"
author: "Cheman"
slug: faros
draft: false
categories: ["AI", "开源", "机器学习"]
tags: ["AutoResearch", "AI科研", "LLM", "自动化研究", "Python"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**FAROS（Foundation AutoResearch Operating System）**——一个 Blueprint 蓝图驱动的 AutoResearch 运行时，能让 AI 从「想 idea」一直做到「生成论文并模拟审稿」，一句话总结：**给 AI 配备一套可配置的科研流水线**。

## 一、项目概述

### 1.1 它是什么

FAROS 不是一个固定死的 AI 科学家 Agent，而是一套**可扩展的研究工作流运行时**。它通过四个核心抽象来组织整个研究过程：

| 抽象层 | 职责 |
|--------|------|
| **Blueprint** | 定义工作流图谱、约束条件、输出契约和验证要求 |
| **Capability** | 实现具体可执行的研究步骤（如 idea 精炼、实验编排、论文起草、模拟审稿） |
| **Profile** | 将 Blueprint 绑定到具体的执行策略 |
| **Provider** | 为 Capability 提供实际引擎（可以是 LLM、工具、API 或人工审核） |

### 1.2 核心特性

- **可插拔 Provider 体系**：当前版本内置 `FAROS-LLM`（基于 LLM），但运行时架构支持未来接入其他 Provider 而无需重写编排层
- **完整 LLM 研究链路**：`idea → experiment → paper → review` 四阶段流水线开箱即用
- **Artifact 与 Memory 持久化**：文件驱动的运行记录、事件日志和研究成果存储
- **Venue-aware LaTeX 论文生成**：支持 ICML、NeurIPS、ICLR、ACL 等多种顶会格式，编译失败时自动降级为可预览 PDF
- **Plan 模式**：不实际执行，仅规划，方便预览研究路径

### 1.3 当前发布状态

当前版本为 **1.1.0-rc1**，已是一个可运行的 AutoResearch 运行时基线，但尚未包含完整 DAG 调度、并行编排和跨域 Provider 生态。

## 二、技术原理

### 2.1 运行时架构

```
backend/app/
  faros/           # 核心运行时：蓝图加载、能力注册、Profile 绑定、编排执行
    api/           # RESTful API 端点
    blueprints/    # 蓝图定义（当前内置 ml_paper）
    capabilities/  # 能力实现（idea_refinement、experiment、paper_drafting、reviewer_simulation）
    loaders/       # 蓝图与 Profile 加载器
    memory/        # 研究记忆持久化
    models/        # 数据模型
    profiles/      # 执行策略配置
    providers/     # Provider 注册中心（LLM、工具等）
    registry/      # 全局注册表
    runtime/       # 核心编排引擎
    verification/  # 基线验证
  modules/         # 领域模块（idea、code、paper、review、platform）
```

运行时将已有领域模块（`idea`、`code`、`paper`、`review`）通过 **Capability Adapter** 接入，而不是替换它们，这保证了存量投入的最大复用。

### 2.2 四阶段流水线

**Stage 1 — Idea Refinement**

```python
# 触发 idea 精炼能力
idea_refinement_capability.execute(
    seed_query="Improve CPU efficiency in LLM workflows",
    paper_type="system"
)
# 输出：ranked_idea_candidates → selected_candidate
```

**Stage 2 — Experiment**

生成代码项目脚手架和实验元数据记录，为 LLM 研究领域提供标准化的实验工作空间。

**Stage 3 — Paper Drafting**

根据选定的目标会议（venue）选择对应 LaTeX 模板，生成完整论文源码：

```python
# Venue-aware LaTeX 编译
latex_project = paper_drafting_capability.execute(
    venue="icml",          # icml | neurips | iclr | acl | generic
    paper_type="research"
)
# 支持 latexmk 优先编译，失败时降级为简化 PDF 渲染
```

**Stage 4 — Reviewer Simulation**

```python
# 模拟同行评审
review_report = reviewer_simulation_capability.execute(
    paper_artifacts=latex_project.output,
    strictness="medium"
)
# 输出结构化评审 + 可操作的 follow-up items
```

### 2.3 Provider 配置机制

Provider 配置从两级加载：
1. 环境变量（`backend/app/core/settings.py` 中定义）
2. 运行时持久化配置（`backend/data/provider_config.json`）

当前支持 `minimax` 等 LLM Provider，支持多 Provider 切换而不影响 Capability 层。

## 三、安装与快速开始

### 3.1 环境要求

- **Python** `3.11+` 或 `3.12`
- **Node.js** `18+`
- **LaTeX**：`latexmk` + `pdflatex`（用于生成符合会议格式的论文 PDF）
- 一个配置好的 LLM Provider（API Key 通过环境变量注入）

### 3.2 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8005 --reload
```

### 3.3 启动前端（可选）

```bash
cd frontend
npm install
npm run dev
```

### 3.4 Plan 模式体验（无需真实 LLM）

```bash
curl -X POST http://127.0.0.1:8005/api/faros/runs \
  -H 'Content-Type: application/json' \
  -d '{
    "blueprintId": "ml_paper",
    "profileId": "faros_llm",
    "executionMode": "plan",
    "inputs": {
      "seedQuery": "Improve CPU efficiency in LLM workflows",
      "paperType": "system",
      "targetVenue": "generic"
    }
  }'
```

### 3.5 验证安装

```bash
bash scripts/check_release.sh
```

## 四、API 接口一览

| 端点 | 用途 |
|------|------|
| `GET /api/system/health` | 后端健康检查 |
| `GET /api/system/version` | 发布元数据（含 `llm.configured` 状态） |
| `GET /api/faros/blueprints` | 列出可用蓝图 |
| `GET /api/faros/profiles` | 列出可用 Profile |
| `GET /api/faros/capabilities` | 列出注册的能力和 Provider |
| `POST /api/faros/runs` | 创建一次 FAROS Run |
| `GET /api/faros/runs/{run_id}/artifacts` | 查看运行产物 |

## 五、常见问题

**Q: 启动后 `/api/system/version` 显示 `llm.configured=false` 怎么办？**

确保环境变量中配置了有效的 LLM API Key，具体配置项参考 `backend/app/core/settings.py` 中的 Provider 相关环境变量定义。

**Q: 论文 PDF 编译失败怎么解决？**

确认系统中已安装 `texlive`（含 `latexmk` 和 `pdflatex`）。若 LaTeX 环境不可用，后端会自动降级为简化 PDF 渲染，不影响流程继续。

**Q: 如何切换不同的 LLM Provider？**

在 `backend/data/provider_config.json` 中修改 `ACTIVE_PROVIDER_NAME`，或在环境变量中设置 `ACTIVE_PROVIDER_NAME`。

**Q: 前端端口不对？**

前端辅助脚本读取 `FRONTEND_PORT` 环境变量，而非 CLI 的 `--port` 参数，请注意区分。

**Q: 如何扩展新的研究领域（不限于 LLM）？**

新增一个 Provider 实现（接入新的引擎），然后在新的 Blueprint 中组合已有的 Capability。运行时架构已为跨域扩展预留了接口。

## 六、总结

FAROS 的核心价值在于将**研究自动化**从「固定死的产品逻辑」提升为「可配置的运行时」。它用 Blueprint 定义工作流、用 Capability 封装原子研究步骤、用 Profile 绑定执行策略、用 Provider 注入不同引擎——这套分层设计让整个系统在扩展性上远胜于传统的单 Agent 方案。

当前 1.1.0-rc1 已具备完整可用的 LLM 研究流水线，是 AI 辅助科研领域值得关注的新尝试。如果你对 AutoResearch 感兴趣，不妨 clone 下来用 Plan 模式跑一遍，直观感受它的设计思路。

> GitHub 地址：[OpenNSWM-Lab/FAROS](https://github.com/OpenNSWM-Lab/FAROS)
