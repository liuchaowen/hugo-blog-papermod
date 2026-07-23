---
title: "GEO Citation Lab：用可复查数据研究 AI 搜索如何引用与呈现实体"
date: 2026-07-23
description: "GEO Citation Lab 是一个面向 AI 搜索引用机制的公开实证研究工作台，整合跨平台引用实验与 CN-GEO 中文数据集，配套分析脚本与可视化报告，帮助研究者量化生成式搜索的信源选择、内容吸收与实体曝光。"
author: "Cheman"
slug: geo-citation-lab
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "GEO", "生成式搜索", "AI搜索", "开源数据集"]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**GEO Citation Lab**，它用可复查的实证数据，研究 AI 搜索（ChatGPT、Google Gemini、Perplexity 以及国内大模型）如何选择信源、吸收页面内容并呈现实体。

## 一、项目概述

GEO Citation Lab（Generative Engine Optimization Citation Lab）是一个面向"生成式引擎优化（GEO）/ 答案引擎优化（AEO）"的公开实证研究工作台。它把"AI 搜索的可见性"拆成一条可被观测、可复算的链路：

`提问 → 搜索触发 → 信源选择 → 内容吸收 → 实体曝光 → 跨平台与跨终端差异`

项目围绕两条研究主线展开，并整理了大量可直接分析的数据资产：

| 研究资产 | 当前规模 |
| --- | ---: |
| CN-GEO 原始引用记录 | 214,119 条 |
| 国内 AI 平台与终端代码 | 12 个 |
| 跨平台实验 Prompt | 602 条 |
| GEO / AEO / AI Search 论文 PDF | 54 篇 |

仓库核心解决的是"AI 搜索到底在引用谁、吸收了什么、又曝光了哪些实体"这一黑盒问题，所有结论都附带可查询的数据与可复现的分析脚本，而不是停留在定性描述。

## 二、技术原理

GEO Citation Lab 最有价值的部分，是把"引用"拆成了两个可分别测量的维度：

- **引用选择（Citation Selection）**：平台是否触发搜索、哪些信源进入了引用列表。
- **引用吸收（Citation Absorption）**：被引用的页面，在语言、证据、结构、事实层面对最终答案的参与程度。

### 跨平台引用实验

实验覆盖了 `602` 条受控 Prompt、`21,143` 条有效搜索层引用和 `23,745` 条 citation-level 特征记录，并从 `18,151` 个成功抓取的页面中提取了 `72` 维特征。基于这些数据，研究得出了几个关键发现：

1. **引用广度 ≠ 吸收深度**。Perplexity 与 Google 平均引用更多信源，ChatGPT 引用较少，但 ChatGPT 成功抓取的页面平均"引用影响力"更高。两者需要分别度量。
2. **内容匹配度、结构与证据密度与吸收深度相关**。高影响力页面通常更长、分段更清晰，且更频繁地包含定义、数字、对比与操作步骤；单纯使用 Q&A 格式并未表现出吸收优势。
3. 上述结论来自静态样本的描述性统计与相关性分析，并非因果结论。

对应论文：*From Citation Selection to Citation Absorption: A Measurement Framework for Generative Engine Optimization Across AI Search Platforms*（arXiv:2604.25707, 2026）。

### 中文生成式搜索与 CN-GEO

CN-GEO 是当前发布的重点数据集，包含 `214,119` 条原始引用记录、`64` 个 JSONL 分片、`9,878` 个规范信源与 `107,659` 个规范页面。仓库同时提供了标准 Parquet 表、自包含 DuckDB、页面特征、分析集市、质量报告与可视化报告。

该数据集基于 `WENDAOstudy/cn-geo-citation-dataset`（CC BY 4.0）整理，论文分析了**四个中文大模型产品的八个 Web / App 界面**，核心发现是：同一平台的不同终端（Web 与 App）的信源集合存在系统性差异，界面类型会影响跨平台比较——这意味着中文 GEO 研究中，Web 与 App 必须分开观察。

对应论文：*What Do Chinese-Language Generative Search Engines Cite and Surface? A Large-Scale Empirical Study*（arXiv:2607.15771, 2026）。

## 三、安装与快速开始

这是一个数据 / 研究型仓库，并非需要编译运行的代码库。最轻量的使用方式是不克隆完整仓库，直接访问在线资源。

### 只读结论（无需克隆）

- CN-GEO 在线分析报告：可直接在浏览器查看多维数据结论。
- 跨平台实验摘要（`01-geo-experiment-data-report/QUICK_REPORT.md`）。
- 54 篇论文导航（`02-geo-aeo-ai-search-papers/`）。

### 克隆并本地复算

```bash
# 克隆研究工作台
git clone https://github.com/yaojingang/geo-citation-lab.git
cd geo-citation-lab

# 进入 CN-GEO 数据目录查看说明与查询方式
ls 03-cn-geo-citation-dataset/
cat 03-cn-geo-citation-dataset/data/清洗后数据使用说明.md
```

数据集同时提供标准 Parquet 表与**自包含 DuckDB**文件，可零依赖地做本地查询：

```python
import duckdb

# 使用仓库自带的自包含 DuckDB 直接查询 CN-GEO
con = duckdb.connect("03-cn-geo-citation-dataset/data/cn_geo.duckdb")
rows = con.execute("""
    SELECT source_domain, COUNT(*) AS cnt
    FROM citations
    GROUP BY source_domain
    ORDER BY cnt DESC
    LIMIT 10;
""").fetchall()
print(rows)
```

## 四、使用方法与实战

### 1. 按研究目的选择入口

| 目的 | 入口 |
| --- | --- |
| 了解 GEO 研究结论 | CN-GEO 在线报告 · 跨平台实验摘要 |
| 使用数据或继续分析 | CN-GEO 数据集说明 · 清洗后数据使用说明 |
| 阅读论文或引用研究 | 两篇实证论文 · 54 篇论文导航 |
| 复查实验与处理方法 | 跨平台实验管线 · CN-GEO 构建脚本 |

### 2. 复算跨平台实验结论

跨平台实验的 Prompt、原始数据、管线与报告都保存在 `01-geo-experiment-data-report/`，处理脚本位于 `03-pipeline/`。研究者可以重跑管线，验证"引用选择 vs. 引用吸收"的测量框架是否稳健。

### 3. 用 CN-GEO 做信源生态分析

CN-GEO 提供了页面特征与分析集市，可以针对不同中文 AI 平台、不同终端（Web / App）分别统计信源分布与实体曝光，量化"跨界面一致性"问题。

## 五、常见问题与解决方案

**Q1：数据能直接用于商业或二次发布吗？**
A：不能一概而论。跨平台实验来自一次静态快照，没有为每条记录提供统一采集时间戳；CN-GEO 原始层也缺少完整回答、模型版本与采集时间。各目录采用各自的许可与口径，二次发布或商业使用前需逐一确认对应目录与原始材料的授权范围。

**Q2：为什么 CN-GEO 没有"品牌推荐率 / 严格引用排名"？**
A：因为原始数据缺少回答级信息（回答批次、模型版本等），只能直接研究来源覆盖与跨平台共识；趋势、情感、严格引用排名和品牌推荐率需要更多回答级数据支撑。

**Q3：引用数字时应该以哪个口径为准？**
A：不同论文、原始数据和清洗仓库采用各自的样本范围与处理口径，引用具体数字时请以对应论文或数据版本的说明（如 `数据集中文说明.md`、`quality_report.md`）为准。

**Q4：想补充论文或修正数据怎么办？**
A：可在仓库 Issues 中提交数据字段 / 清洗规则 / 报告口径问题、可复现的分析结果与修正建议，或推荐值得补充的 GEO / AEO / AI Search 论文。

## 六、总结

GEO Citation Lab 把一个长期被"黑盒化"的问题——AI 搜索到底引用了谁、吸收了什么、曝光了哪些实体——变成了一套**可观测、可查询、可复算**的实证基础设施。无论你是做 GEO 优化的从业者、研究生成式搜索的学者，还是想了解"为什么我的内容没被 AI 引用"的内容生产者，这个仓库提供的 21 万+ 条引用记录、602 条对照 Prompt 与 54 篇论文导航，都是一份难得的开放资源。建议从在线报告快速浏览结论，再按需克隆仓库复算数据。
