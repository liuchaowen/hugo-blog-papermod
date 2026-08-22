---
title: "ARC-AGI 任务生成器 arc-task-gen：用分布匹配构建「防污染」的私有评测集"
date: 2026-08-23
description: "arc-task-gen 是 Pathway 开源的 ARC-AGI-1 任务生成器，通过对齐官方评测集分布并做三重新颖性过滤，自动批量产出模型不可能提前见过的私有推理任务，用于客观评估前沿模型的真实小样本推理能力。"
author: "Cheman"
slug: arc-task-gen
draft: false
categories: ["技术", "AI", "开源"]
tags: ["GitHub", "开源", "AI", "ARC-AGI", "模型评测", "Pathway", "Benchmark"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ARC-AGI-1 Task Generator（arc-task-gen）**。它解决了一个越来越尖锐的问题——当公开评测集本身可能已经被「喂」进了模型的训练语料，我们该怎么客观地衡量一个前沿模型的真实推理能力？这个工具给出的答案是：自动批量生成与官方评测集「分布一致、内容全新」的私有 ARC-AGI-1 风格任务。

## 一、项目概述

**ARC-AGI**（Abstract and Reasoning Corpus，抽象与推理语料库）是 François Chollet 设计的一套衡量「小样本规则归纳 / 流体智力」的基准，由一个个网格变换谜题组成。公开评测集共 400 题，但业内普遍怀疑它已出现在网页爬取的训练语料中——于是高分可能来自「背过答案」而非真正推理。

arc-task-gen 的核心价值，就是生成一批**私有、分布匹配、规则全新**的任务，让模型不可能提前见过，从而把「公开榜分数」与「全新任务分数」对照，拆出「真推理能力」与「训练期先验熟悉度」。

- 由 **Pathway** 团队发布，伴随论文 **BDH-CQ**（一种带循环潜在推理的模型）。150M 参数的 BDH-CQ 在公开 ARC-AGI-1 上达到 **29.5% pass@2**，单题推理成本仅 **$0.0007**，比 GPT-5.6 Luna (Low) 便宜约 **11 倍**。
- 结果由《Attention Is All You Need》合著者 Łukasz Kaiser 等人独立复现，强调评测与基准鲁棒性。

核心特性：

- 严格对齐官方评测集分布（网格尺寸、颜色数、训练/测试对数）
- 三维新颖性过滤：去重 + 与官方题相似度过滤 + 结构合法性校验
- 可对接**任意 OpenAI 兼容端点**（OpenAI / vLLM / Ollama / LM Studio）
- 输出标准 ARC 格式 `{"train": [...], "test": [...]}`，可直接喂给现有 ARC 评测框架

## 二、技术原理

### 2.1 为什么需要「分布匹配」而非随机生成

不能把网格尺寸、颜色数、对数这些属性独立随机抽样——否则会出现「2×2 网格却要容纳 9 种颜色」「3×3 画布放 7 对样本」这种现实中不存在的组合。源码 `sample_joint_slots` 的做法是：从**同一个**真实 eval task 整体抽样一个 slot（rows / cols / colors / n_train / n_test / anchor），从而保住这些属性之间的**自然协方差**。

```python
def sample_joint_slots(eval_tasks: dict, n: int) -> list:
    task_ids = list(eval_tasks.keys())
    slots = []
    for _ in range(n):
        anchor_id = random.choice(task_ids)
        task = eval_tasks[anchor_id]

        # 网格尺寸只从 INPUT 网格抽：slot 设的是 input 目标，
        # 输出尺寸是模型「发明」的规则的涌现结果，事先不可控。
        input_grids, colors = [], set()
        for pair in task["train"] + task["test"]:
            for field in ("input", "output"):
                g = pair.get(field)
                if not g:
                    continue
                if field == "input":
                    input_grids.append((len(g), len(g[0])))
                for row in g:
                    colors.update(v for v in row if v != 0)

        rows, cols = random.choice(input_grids)
        slots.append({
            "rows": rows,
            "cols": cols,
            "colors": len(colors),
            "n_train": len(task["train"]),
            "n_test": len(task["test"]),
            "anchor": anchor_id,
        })
    return slots
```

### 2.2 新颖性过滤：嵌入余弦相似度

生成后，用 `text-embedding-3-small` 给每个任务的自然语言规则描述做嵌入，L2 归一化后余弦相似度退化为一次矩阵乘法（相似度矩阵 = 归一化矩阵 @ 归一化矩阵.T），整张两两相似度矩阵一次 BLAS 算出，无需逐个重算范数。

阈值校准非常讲究，全部基于官方集**自身结构**的实证分布：

- **去重阈值 `DEDUP_THRESHOLD = 0.80`**：同一批生成任务之间，相似度超过即视为近重复，用并查集合并成簇。
- **官方相似度阈值 `EVAL_SIMILARITY_THRESHOLD = 0.92`**：与官方评测集对比，只有「近乎逐字一致」的规则才拦截——因为与官方题「主题重叠」是允许的，真正要防的是复制。

注释里给出的校准依据：官方评测集中「真正不同」的两题最近邻相似度中位数 **0.760**、p95 **0.879**、最大 **0.912**。若设 0.85 会误删合理的全新题；0.92 恰好高于观测最大值。

```python
def _unit_rows(vectors) -> "np.ndarray":
    """L2 归一化；归一化后余弦相似度 = 点积，相似度矩阵一次 matmul 完成。"""
    m = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(m, axis=1, keepdims=True)
    np.maximum(norms, 1e-12, out=norms)     # 防护零向量
    return m / norms

def _embed(texts: list) -> "np.ndarray":
    resp = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    ordered = [e.embedding for e in sorted(resp.data, key=lambda x: x.index)]
    return _unit_rows(ordered)

def find_duplicate_clusters(descriptions: dict, threshold: float = DEDUP_THRESHOLD) -> list:
    task_ids = list(descriptions.keys())
    if len(task_ids) < 2:
        return []
    m = _embed([descriptions[tid] or "no description" for tid in task_ids])
    sim = m @ m.T                       # 全 pairwise 余弦矩阵
    pairs = np.argwhere(np.triu(sim, k=1) >= threshold)
    # 用并查集把 >= threshold 的 pair 并入同一簇，返回 size >= 2 的组
    ...
```

### 2.3 收敛循环（convergence loop）

以往「串行两阶段」过滤会互相破坏保证：去重替换出来的题没做官方相似度检查，官方相似度替换出来的题没去做重检查。arc-task-gen 把两种过滤**合并到同一轮**：每轮同时算去重簇 + 官方相似度，取其并集删除，再补生成。循环里有三个关键设计：

- **槽位回收（slot recycling）**：被删任务的 slot 会被回收而非重新随机抽样。因为删除与 slot 属性相关（可聚类的主题常来自特定 anchor），重抽会让幸存者分布偏移、偏离目标分布；回收把 slot 分布钉死在首轮抽样上。
- **避免列表（avoidance list）**：把每轮所有「已生成过（无论保留或删除）」的规则描述喂给生成模型，明确要求其发明的机制不能与列表中任何一条雷同。eval 官方描述**绝不**放进生成提示词，以免泄漏评测集。
- **停滞检测（stall detection）**：移除数本应几何式衰减；若连续若干轮移除数不降，说明某 slot 反复生成进同一簇，提前停止以省 API 成本。

### 2.4 分布一致性校验（sanity check）

`run_sanity_check` 对比生成集与官方集的输入面积均值/中位、行列均值、训练对数众数、单测试对占比（≥80% 判 PASS）。整体**只校验输入维度**——因为输出尺寸是模型所发明规则的涌现属性，刻意不约束，否则会得到一个无法归因的复合指标。

## 三、安装与快速开始

环境要求：Python 3，依赖 `httpx`、`numpy`、`openai`、`matplotlib`；支持任意 OpenAI 兼容端点。

```bash
git clone https://github.com/pathwaycom/arc-task-gen.git
cd arc-task-gen
pip install httpx numpy openai matplotlib   # 按源码实际依赖安装
```

配置环境变量（生成模型与嵌入模型均可替换成本地端点）：

```bash
export OPENAI_API_KEY=sk-xxx                  # 本地服务可填任意占位符
export OPENAI_BASE_URL=http://localhost:8000/v1   # 可选：vLLM / Ollama / LM Studio
export ARCGEN_MODEL=gpt-5.6                   # 生成模型（默认 gpt-5.6）
export ARCGEN_EMBED_MODEL=text-embedding-3-small   # 新颖性过滤用的 embedding 模型
```

## 四、使用方法与实战

### 4.1 生成私有任务集

```bash
python generate_tasks.py --n 32
```

首次运行会自动下载 400 题 ARC-AGI-1 官方评测集并缓存（Apache 2.0，来自 fchollet/ARC-AGI）。生成目录结构：

```
data/generations/gen_YYYYMMDD_HHMMSS/
├── tasks.json          # 全部任务（标准 ARC {"train":[],"test":[]} 结构）
├── sanity_check.json   # 分布对比 + 规则描述 + 每轮过滤历史
└── separated/          # 每题一个 JSON，可直接进 ARC 测试界面
```

### 4.2 构建官方题描述缓存（启用官方相似度过滤）

```bash
python describe_eval_tasks.py        # 全量 400 题，结果缓存到 data/arc_agi_eval_descriptions.json
```

这一步用 LLM 把官方每题规则写成 1–2 句自然语言并缓存，供 `generate_tasks.py` 做跨集相似度过滤。若缓存缺失，脚本会跳过该检查并打印 WARNING——所以想开启官方相似度过滤，需先跑这一步。

### 4.3 可视化任务

```bash
python render.py data/generations/gen_xxx/ --out images/
```

每题渲染成一张 PNG：每个 train / test pair 占一行，左 input 右 output，test pair 用红色标签区分，方便人工抽检生成质量。

### 4.4 评测你的模型

`tasks.json` 是标准 ARC 格式，任何 ARC harness 都能直接消费——给模型看 train pairs，让它推 test output 即可。项目刻意把「给模型打分」留在 scope 之外，因为 `tasks.json` 已能被现有框架无缝加载。

## 五、常见问题与解决方案

### Q1：运行报 `HTTPSConnectionPool ... Read timed out`？

抓取流程里就出现过 `github.com` 超时、自动回退 OSS Insight 兜底的情况，说明网络不稳时工具链有降级逻辑。本地生成任务本身不依赖 GitHub，但若首次下载官方评测集（codeload.github.com）超时，可手动下载 fchollet/ARC-AGI 的 tar.gz 解压到 `data/` 对应位置。

### Q2：生成任务数少于目标 N？

可能 API 失败超过 `MAX_RETRIES`（默认 3）轮，或收敛循环因停滞检测提前停止。脚本会打印 WARNING 并给出实际数量，可增大 `--max-rounds` 或检查 API 限流配置。

### Q3：官方相似度检查被跳过？

提示 `WARNING: data/arc_agi_eval_descriptions.json not found — skipping eval similarity check. Run describe_eval_tasks.py first`。先跑 `describe_eval_tasks.py` 生成描述缓存即可开启。

### Q4：输出尺寸与目标不符 / sanity check 报 WARN？

这是正常的——输出尺寸是模型所发明规则的涌现属性，脚本刻意只对「输入维度」做分布校验。WARN 表示偏离官方集 >40%，可检查锚点覆盖率，或调大 N 让统计更稳。

## 六、总结

arc-task-gen 把「评测集污染」这个悬在 ARC-AGI、乃至所有公开基准头上的问题，做成了一套工程化、可复现、分布对齐的解法。它的亮点不只是「能生成题」，更在于背后那套严谨的统计校准（阈值不是拍脑袋，而是基于官方集自身结构的实证分布定出来的）和收敛设计（槽位回收、避免列表、停滞检测）。如果你正在做模型评测、基准构建，或关心「agent 到底能不能真正推理」，这个仓库的 `generate_tasks.py` 单文件就值得反复读。
