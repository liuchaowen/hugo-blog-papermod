---
title: "LLM Wiki：让大模型自动为你构建个人知识库的桌面应用"
date: 2026-07-16
description: "LLM Wiki 是由 nashsu 基于 Karpathy 提出的 LLM Wiki 模式实现的跨平台桌面应用，用 Tauri v2 + React 19 构建。它不再每次查询都从头检索，而是让大模型渐进式地解析你的文档、生成结构化 Wiki、维护知识图谱，并把知识沉淀为持久可复用的个人知识库。"
author: "Cheman"
slug: llm-wiki
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 技术, LLM, AI工具]
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

今天在 GitHub Trending 上看到一个有意思的项目：**LLM Wiki**，它把 Karpathy 提出的"用大模型渐进式构建个人知识库"模式，变成了一个开箱即用的跨平台桌面应用——你扔进文档，它自动生成结构化、可互链的 Wiki。

## 一、项目概述

传统 RAG（检索增强生成）的思路是"每次提问都临时检索、即时拼装答案"，问题很明显：知识没有被真正沉淀，重复提问反复消耗 token，且缺乏结构化的全局视角。LLM Wiki 反其道而行——它借鉴 Andrej Karpathy 在 [llm-wiki.md](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 中描述的模式，让 LLM **增量式地构建并长期维护一个持久化的 Wiki**。知识被一次性编译、持续更新，而不是每次查询都重新推导。

项目由 nash_su 实现并持续维护，核心定位是：

- **自构建的个人知识库**：LLM 读取文档 → 解析实体/概念 → 生成可互链的 Wiki 页面 → 持续保持最新。
- **跨平台桌面应用**：基于 Tauri v2，原生支持 macOS / Windows / Linux，提供三栏式（知识树 / 对话 / 预览）交互界面。
- **兼容 Obsidian**：生成的 Wiki 目录本身就是一个标准 Obsidian 仓库，可直接用 Obsidian 打开浏览。

核心特性非常多，几个最值得关注的：

- **两步链式思考（Chain-of-Thought）摄入**：LLM 先"分析"原文、再"生成" Wiki 页面，每页都带 `sources: []` 来源追溯，并配合 SHA256 增量缓存跳过未改动文件。
- **多模态图片摄入**：从 PDF 抽取内嵌图片，用视觉模型生成事实性 caption，并在图感知搜索中提供灯箱预览与"跳转到来源"。
- **4 信号知识图谱 + Louvain 社区发现**：用直接链接、来源重叠、Adamic-Adar、类型亲和 4 种信号计算相关性，并自动聚类发现知识社群、给出"意外连接"与"知识盲区"洞察。
- **Rust 后端 Agent 与本地 MCP 服务**：内置 `127.0.0.1:19828` 的 JSON API 与 MCP Server，可让 Claude Code / Codex 等外部 Agent 一键接入你的知识库。

## 二、技术原理

### 2.1 三层架构与三大操作

LLM Wiki 忠实沿用了 Karpathy 的原始设计——三层架构与三大操作：

- **三层架构**：`Raw Sources`（不可变原始资料）→ `Wiki`（LLM 生成）→ `Schema`（规则与配置）。
- **三大操作**：**Ingest**（摄入）、**Query**（查询）、**Lint**（校验）。
- `index.md` 作为内容目录与 LLM 导航入口，`log.md` 作为可解析的操作日志，页面间用 `[[wikilink]]` 互链，每页带 YAML frontmatter。

同时项目新增了一个关键文件 `purpose.md`——它定义了"**这个 Wiki 为什么存在**"（目标、关键问题、研究范围、演进中的论点），LLM 在每次摄入与查询时都会读取它来获取方向性上下文，与定义"结构规则"的 `schema.md` 形成互补。

### 2.2 两步 Chain-of-Thought 摄入

原始模式是"LLM 边读边写"的单步过程，质量不稳定。LLM Wiki 拆成两次顺序的 LLM 调用：

```
Step 1 (Analysis): LLM 读取源码 → 结构化分析
  - 关键实体、概念、论点
  - 与现有 Wiki 内容的连接
  - 与已有知识的矛盾 / 张力
  - 对 Wiki 结构的建议

Step 2 (Generation): LLM 基于分析 → 生成 Wiki 文件
  - 带 frontmatter（type, title, sources[]）的来源摘要
  - 实体页、概念页（含交叉引用）
  - 更新的 index.md / log.md / overview.md
  - 需人工判断的 Review 项
  - 供 Deep Research 使用的搜索查询
```

在单步之上还叠加了大量工程增强：SHA256 增量缓存（内容哈希后跳过未变文件）、持久化摄入队列（串行处理、崩溃可恢复、失败自动重试 3 次）、递归文件夹导入、来源文件夹自动监听（外部增删自动同步生命周期）等。

### 2.3 4 信号相关性模型

知识图谱的相关性并非简单数链接数，而是用 4 个加权信号综合计算：

| 信号 | 权重 | 说明 |
|--------|--------|-------------|
| 直接链接 | ×3.0 | 通过 `[[wikilinks]]` 互链的页面 |
| 来源重叠 | ×4.0 | 共享同一原始来源（frontmatter `sources[]`）的页面 |
| Adamic-Adar | ×1.5 | 拥有共同邻居（按邻居度加权）的页面 |
| 类型亲和 | ×1.0 | 同类型页面（entity↔entity、concept↔concept）加成 |

图谱可视化基于 sigma.js + graphology + ForceAtlas2，节点按类型或社区着色，边粗细按相关性权重（绿强灰弱）。在此基础上，Louvain 算法自动发现知识社群并给出"内聚度"评分（内聚度 < 0.15 的稀疏社群会被标记告警）。

### 2.4 多阶段检索管线 + 预算控制

查询不再是"LLM 读几页"那么简单，而是四阶段管线（向量语义检索为可选项）：

```
Phase 1: 分词搜索（英文分词去停用词 / 中文 CJK 二元分词，标题命中 +10）
Phase 1.5: 向量语义搜索（可选，LanceDB + 任意 OpenAI 兼容 embedding 端点）
Phase 2: 图谱扩展（Top 结果作种子，4 信号相关性 + 2 跳遍历）
Phase 3: 预算控制（上下文窗口 4K → 1M，按 60/20/5/15 分配 wiki/历史/index/系统）
Phase 4: 上下文拼装（按编号全文注入，要求 LLM 以 [1][2] 引用）
```

向量搜索默认关闭，开启后整体召回率从 **58.2% 提升到 71.4%**（benchmark）。

### 2.5 技术栈

| 层 | 技术 |
|-------|-----------|
| 桌面 | Tauri v2（Rust 后端） |
| 前端 | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS v4 |
| 编辑器 | Milkdown（基于 ProseMirror 的所见即所得） |
| 图谱 | sigma.js + graphology + ForceAtlas2 |
| 检索 | 分词搜索 + 图谱相关性 + 可选向量（LanceDB） |
| 向量库 | LanceDB（Rust 嵌入式，可选） |
| PDF | pdf-extract + 可选 MinerU 云端解析 |
| Office | docx-rs + calamine |
| i18n | react-i18next |
| 状态 | Zustand |

从 `package.json` 也能印证这套选型：React 19、`@milkdown/kit`、`graphology` / `graphology-communities-louvain`、`mermaid`、`katex`、`@tauri-apps/api` 等依赖一应俱全，Vite 配置中固定端口 1420 并显式忽略 `src-tauri` 监听，典型的 Tauri 开发布局。

## 三、安装与快速开始

### 3.1 环境要求

- Node.js 20+
- Rust 1.70+

### 3.2 预编译二进制（推荐）

直接从 [Releases](https://github.com/nashsu/llm_wiki/releases) 下载：

- **macOS**：`.dmg`（Apple Silicon + Intel）
- **Windows**：`.msi`
- **Linux**：`.deb` / `.AppImage`

### 3.3 从源码构建

```bash
git clone https://github.com/nashsu/llm_wiki.git
cd llm_wiki
npm install
npm run tauri dev      # 开发模式
npm run tauri build    # 生产构建
```

### 3.4 Chrome 扩展（Web Clipper）

1. 打开 `chrome://extensions`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择仓库内的 `extension/` 目录

## 四、使用方法与实战

### 4.1 极简上手流程

1. 启动应用 → 新建项目（选择模板：研究 / 阅读 / 个人成长 / 商业 / 通用）
2. 进入 **Settings** → 配置你的 LLM 提供方（API Key + 模型）
3. （可选）在 Settings 中配置 Web Search 提供方与来源文件夹自动监听
4. 进入 **Sources** → 导入文档（PDF / DOCX / MD 等）
5. 观察 **Activity Panel**，LLM 会自动构建 Wiki 页面
6. 用 **Chat** 查询你的知识库
7. 浏览 **Knowledge Graph** 查看连接关系
8. 在 **Review** 中处理需要人工判断的项
9. 定期运行 **Lint** 维护 Wiki 健康度

### 4.2 把自己的 Agent 接进来（一条命令）

LLM Wiki 内置本地 HTTP API（`http://127.0.0.1:19828`，token 保护、仅限本机）与 MCP Server，外部工具可混合检索、读文件、遍历图谱、重扫来源。官方还提供了一个现成的 Agent Skill：

```bash
npx skills add https://github.com/nashsu/llm_wiki_skill.git --skill llm-wiki
```

安装后，Claude Code / Codex 即可用诸如"我的知识库里关于 X 说了什么""搜索知识库中的 Y""展示节点 Z 的邻居"等提示词，直接与你本地运行的 App 对话——默认只读，并会引用 Wiki 页面路径以便你在应用内核验。

### 4.3 多级文档格式支持

| 格式 | 解析方式 |
|--------|--------|
| PDF | 内置 pdf-extract（Rust，带缓存）；复杂排版可切换 MinerU 云端解析 |
| DOCX | docx-rs（标题、粗斜体、列表、表格 → 结构化 Markdown） |
| PPTX | ZIP + XML 逐页抽取 |
| XLSX/XLS/ODS | calamine（正确单元格类型、多表、Markdown 表格） |
| 图片 / 音视频 | 原生预览与播放 |
| 网页剪辑 | Readability.js + Turndown.js → 干净 Markdown |

## 五、常见问题与解决方案

**Q1：PDF 解析出现表格/公式错乱？**
内置解析器对复杂排版支持有限。可在设置中开启可选 **MinerU 云端解析**（支持表格、公式、密集排版）；若 MinerU 失败会自动回退到内置解析器。敏感文档建议保留内置解析器。

**Q2：向量搜索开启了但没效果 / 不生效？**
向量检索默认**关闭**。需在 Settings 中独立配置 embedding 端点、API Key 与模型。注意它要求**任意 OpenAI 兼容的 `/v1/embeddings` 端点**，配置后新页面会自动嵌入。

**Q3：摄入中途崩溃 / 文件卡住？**
得益于**持久化摄入队列**：队列落盘、重启可恢复，失败任务自动重试最多 3 次。可在 Activity Panel 对卡住的任务点"取消 / 重试"。

**Q4：上下文窗口不够 / 回答不全面？**
在 Settings 中通过滑块把上下文窗口从默认 4K 调到更高（最高 1M），预算会按 60/20/5/15 比例分配给 Wiki 页面 / 聊天历史 / index / 系统提示词，页面按检索+图谱综合相关性排序注入。

**Q5：CLAUDE/Codex 连不上本地 API？**
API 默认 `127.0.0.1` 且仅本机可达，需在 Settings → API + MCP 中**启用 API 并生成 token**；MCP 客户端配置可在同一页面一键复制（构建后含本机真实路径）。

## 六、总结

LLM Wiki 的价值在于它把"用 LLM 管知识"从一篇抽象的设计模式 gist，落地成了一个**真正可用、可持续维护**的桌面产品：两步 Chain-of-Thought 摄入保证质量，4 信号知识图谱 + Louvain 社区发现让知识"连得起来、看得见盲区"，Rust 后端 Agent 与本地 MCP 又把知识库变成了可被其他 AI 工具调用的能力。对苦于文档散落、RAG 来回折腾的人来说，它是一个值得一试的"知识中枢"。

> 项目基于 GPL-3.0 开源，仓库地址：<https://github.com/nashsu/llm_wiki>
