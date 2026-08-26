---
title: "Scientific Agent Skills 详解：163 个开箱即用的科研 Agent Skills，让你的 AI 变身「桌面科研科学家」"
date: 2026-08-27
description: "K-Dense-AI 开源的 scientific-agent-skills 收录 163 个面向生物、化学、医学、材料等科学领域的 Agent Skills，统一接入 100+ 数据库，让你的 AI 智能体几分钟内胜任多步科研工作流。"
author: "Cheman"
slug: scientific-agent-skills
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, Agent, 科研, 生物医药]
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

今天在 GitHub Trending 上看到一个有意思的项目：**K-Dense-AI/scientific-agent-skills**，一套面向科研的智能体技能合集——它把数十个科学领域的专业工作流直接「喂」给支持 Agent Skills 标准的 AI 智能体，让普通的编码助手变身桌面上的「科研科学家」。

## 一、项目概述

**Scientific Agent Skills** 是 K-Dense 团队维护的开源仓库（MIT 协议，当前版本 v2.64.0），提供 **163 个「Agent Skills」**——每一项技能都是一份带 `SKILL.md` 的文档化工作流，让 Cursor、Claude Code、Codex、Google Antigravity、Gemini CLI 等支持开放 [Agent Skills](https://agentskills.io/) 标准的智能体能可靠地执行科研任务。

它解决的核心痛点是：AI 智能体虽然能「自己调用任意 Python 包或 API」，但「知道怎么调、调得对、还带溯源与边界」往往需要做大量文档调研与试错。该仓库把这些领域的「容器化、版本感知、带验证与出处」的技能预先打包，显著降低踩坑成本。

核心特性一览：

- **163 个科学/研究技能**，覆盖生物信息、化学信息、药物发现、蛋白质组、临床研究、医疗 AI、机器学习、材料科学、物理天文、工程仿真、地理空间、实验室自动化、科研写作等 16+ 大类。
- **100+ 科学/金融数据库**：统一的 `database-lookup` 技能提供确定性、带出处（provenance-rich）的访问入口，覆盖 PubChem、ChEMBL、UniProt、COSMIC、ClinicalTrials.gov、FRED、USPTO 等 78+ 公共数据库；另有 BioServices（~40 个生物信息服务）、BioPython（经 Entrez 的 39 个 NCBI 子库）、gget（20+ 基因组库）等多数据库包。
- **70+ 优化 Python 包工作流**：对 RDKit、Scanpy、PyTorch Lightning、scikit-learn、PyTDC、pydicom、pymatgen、Qiskit、OpenMM/MDAnalysis、scVelo、TimesFM 等给出带版本约束的「更强、更安全」的使用指引。
- **9 个科学平台集成**：Benchling、DNAnexus、LatchBio、OMERO、Protocols.io、Open Notebook、Ginkgo Cloud Lab、LabArchives、Opentrons。
- **质量保障**：每个带 `scripts/` 的技能都随附 `tests/` 测试套件，CI 会在每次 PR 中校验仓库级结构契约（frontmatter、链接解析、脚本解析、`--help` 行为），并跑安全扫描（security-scan / skill-tests 工作流）。

> 兼容性提示：仓库同时是便携的 [Agent Plugins](https://agent-plugins.org/) 包（`plugin.json` + `skills/`），plugin 客户端可一次性加载整个合集。从 v2.43.0 起，技能目录由 `scientific-skills/` 改为 `skills/`，以对齐 GitHub CLI 期望的布局。

## 二、技术原理

**能力声明即技能。** 每个技能以一份 `SKILL.md` 为核心，包含 frontmatter 元数据 + 指令 + 示例，可选地附带 `scripts/`（可执行脚本）与 `tests/`（测试）。智能体宿主会从配置的技能路径中发现并加载相关技能——它本身不限制智能体用哪个包，技能只是「预先写好、经过评审的起点」。

**双标准支持。** 仓库遵循开放的 Agent Skills 标准（agentskills.io），同时可作为 Agent Plugins 包整体加载；这种「既能单技能按需取用，也能整包托管」的设计，让它几乎能接入任何现代 AI 编码宿主。

**安全与可维护性内建。** 仓库内 `scan_skills.py`、`scan_pr_skills.py` 两个脚本为安全扫描所用：`scan_skills.py` 全量扫描所有技能并产出人读 + 机读两份报告，`scan_pr_skills.py` 只扫描 PR 中变更的技能子集并发 PR 评论，二者与 GitHub Actions 中的 `security-scan` 工作流联动。CI 还会用 `--fail-on SEVERITY` 之类的阈值阻断高风险提交，确保「新增带 `scripts/` 的技能必须自带测试」。

**数据库访问的确定性范式。** 统一的 `database-lookup` 技能强调「确定性 + 带溯源」的查询，避免 AI 在数据库 schema 与限流细节上自由发挥；BioServices / BioPython / gget 等多数据库包则把分散的服务聚合成一个稳定的调用面。

## 三、安装与快速开始

**前置条件：** 一个支持 Agent Skills 的宿主（Cursor / Claude Code / Codex / Gemini CLI / Google Antigravity 等），以及 Python 环境（官方推荐用 [uv](https://github.com/astral-sh/uv) 管理依赖）。

安装 uv（按 README 的 Prerequisites）：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

三种安装方式：

**方式 1：npx（受支持宿主一行安装）**

```bash
npx skills add K-Dense-AI/scientific-agent-skills
```

这是面向 Claude Code、Claude Cowork、Codex、Gemini CLI、Google Antigravity、Cursor 等的标准化安装器。

**方式 2：GitHub CLI（`gh skill`，需 gh v2.90.0+）**

```bash
# 交互式浏览并安装
gh skill install K-Dense-AI/scientific-agent-skills

# 只安装某个具体技能
gh skill install K-Dense-AI/scientific-agent-skills scanpy

# 指定目标宿主
gh skill install K-Dense-AI/scientific-agent-skills --agent cursor
gh skill install K-Dense-AI/scientific-agent-skills --agent claude-code
```

**方式 3：Agent Plugins（Cursor / Codex 等 plugin 客户端）**

直接把整个 `plugin.json` 包作为插件加载即可。

其他宿主（如 OpenClaw、NemoClaw、Pi、Hermes 等）按各自文档，将 `skills/` 目录复制到宿主的技能路径即可开始使用。

## 四、使用方法与实战

安装完成后，你只需用自然语言描述目标，并提示智能体「尽可能使用你拥有的技能」，即可触发多步编排。下面是 README 中的真实示例。

**药物发现流水线（Drug Discovery Pipeline）**

目标：为临床前肺癌研究筛选 EGFR 抑制剂候选。

> Use available skills you have access to whenever possible. Query ChEMBL for EGFR inhibitors (IC50 < 50nM), analyze structure-activity relationships with RDKit, generate improved analogs with datamol, perform virtual screening with DiffDock against AlphaFold EGFR structure, search PubMed for resistance mechanisms, check COSMIC for mutations, and create visualizations and a comprehensive report.

涉及技能：`database-lookup`、`rdkit`、`datamol`、`diffdock`、`paper-lookup`、`scientific-visualization`。

**单细胞 RNA-seq 分析**

> Use available skills you have access to whenever possible. Load 10X dataset with Scanpy, perform QC and doublet removal, integrate with Cellxgene Census data, identify cell types using NCBI Gene markers, run differential expression with PyDESeq2, infer gene regulatory networks with Arboreto, enrich pathways via Reactome/KEGG, and identify therapeutic targets with Open Targets.

涉及技能：`scanpy`、`cellxgene-census`、`database-lookup`、`pydeseq2`、`arboreto`。

**进阶玩法：** 仓库还给出多组学标志物发现（RNA-seq + 蛋白质组 + 代谢组整合）、虚拟筛选战役（ZINC 检索 → RDKit 过滤 → DiffDock 对接 → DeepChem 排序 → PubChem/USPTO 查供应与专利 → MedChem/molfeat 优化）、系统生物学网络分析等示例。此外，[Skills 101](https://youtu.be/lVZbHiwzMEg) 视频演示如何从零写、测、打包一个新技能，配合 `autoskill` 还能从你自己的工作流派生出可复用技能。

## 五、常见问题与解决方案

以下基于 README 的 Troubleshooting / FAQ 整理：

- **技能不加载**：确认技能文件夹位于正确目录、每个技能目录都含 `SKILL.md`、复制后重启你的智能体/IDE；在 Cursor 中到 Settings → Rules 确认技能被发现。
- **缺少 Python 依赖**：查看对应技能的 `SKILL.md` 列出的所需包，用 `uv pip install package-name` 安装。
- **API 限流**：很多数据库有速率限制，参考具体库文档，并考虑加缓存或批量请求。
- **认证错误**：部分服务需要 API key，检查技能 `SKILL.md` 的认证配置，确认凭据与权限无误。
- **示例过时**：通过 GitHub Issues 反馈，并查阅官方包文档以获取最新语法。
- **`gh skill install` 或文档链接 `scientific-skills/` 失败（v2.43.0+）**：技能已迁移到 `skills/` 目录，需把手动复制路径、书签、引用中的 `scientific-skills/<name>` 更新为 `skills/<name>`，拉取最新 release 后重跑安装命令。

## 六、总结

**Scientific Agent Skills** 是目前面向 AI 科研工作流最完整的开放技能库之一：163 个带测试与溯源的技能 + 100+ 数据库的统一入口，让任何支持 Agent Skills 标准的智能体在几分钟内化身「桌面科研科学家」。无论你是生物、化学、医学、材料还是数据科学从业者，抑或想自建领域技能的开源贡献者，都值得把它接入你的编码助手并 star 这个项目——它把「AI 辅助科研」从一次性 prompt 升级成了可复用、可审计、可协作的能力基础设施。
