---
title: "X 算法开源：For You 推荐-feed 的技术架构深度解析"
date: 2026-09-08T11:04:00+08:00
description: "xAI 开源了 X (Twitter) For You 信息流的核心推荐算法，涵盖多动作预测模型 Phoenix、可见性过滤系统、SimClusters 聚类检索等关键组件。本文从源码角度深度解析其架构设计与工程实现。"
author: "Cheman"
draft: false
tags: ["GitHub", "开源", "推荐算法", "机器学习", "Transformer"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个重磅开源项目：**xai-org/x-algorithm**，这是 X（原 Twitter）For You 信息流推荐算法的核心代码仓库，Star 数已突破 32K。xAI 将这个决定数十亿用户每天看到什么内容的推荐系统完整公开，在推荐系统领域堪称里程碑式的事件。

## 一、项目概述

X 的 For You 信息流是用户打开 X 时看到的主时间线。这个开源仓库包含了该推荐系统的核心代码，从候选内容检索到排序、过滤的完整链路。

项目核心特性：

- **完整的推荐流水线**：从内容获取、候选检索、打分排序到可见性过滤，全链路开源
- **多动作预测模型 Phoenix**：基于 Transformer 的深度学习模型，预测用户对每条内容的多种交互概率
- **双路径架构**：内容理解（Labeling Path）与推荐请求（Request Path）分离运行
- **可见性过滤系统**：独立于排序的合规与安全过滤层
- **Rust + JAX 技术栈**：高性能服务层用 Rust，模型训练用 JAX

## 二、技术原理

### 2.1 系统架构：双路径设计

X 算法最核心的设计理念是将推荐系统拆分为两条独立路径：

**Request Path（请求路径）** — 每次用户刷新时执行：
1. **Query Hydration**：加载用户近期行为序列、关注列表、屏蔽列表等
2. **Candidate Sources**：并行查询 In-Network（Thunder）和 Out-of-Network（Phoenix retrieval + SimClusters）内容
3. **Candidate Hydration**：填充帖子文本、媒体、作者信息等
4. **Pre-Scoring Filters**：去重、时效过滤（48小时）、已读过滤等
5. **Scoring**：Phoenix 模型打分 + RankingScorer 加权求和 + VMRanker 重排
6. **Selection**：TopK 选择
7. **Post-Selection Filters**：可见性过滤、会话去重

**Labeling Path（标注路径）** — 持续运行，不阻塞请求：
1. **Content Understanding**：Grox 分类器、CLIP 嵌入、媒体模型等持续处理新内容
2. **Labeling Rules**：Scarecrow 规则引擎 + Botmaker 规则语言 + 滥用执法服务
3. **Storage**：标签写入存储，请求路径读取
4. **Visibility Filtering**：三级决策 — ALLOW / INTERSTITIAL / DROP

这种分离设计确保了推荐请求的低延迟（请求路径不跑重模型），同时内容理解可以离线深度处理。

### 2.2 Phoenix 模型：多动作 Transformer

Phoenix 是整个系统的核心排序模型，它不做单一的"相关性"打分，而是预测用户对每条内容采取每种动作的概率：

```rust
// 动作类型枚举（基于源码推断）
Engagement    // favorite, reply, repost, quote, share, share via DM, share via copy link
Clicks        // post click, profile click, link click, photo expand, video open, quoted post
Attention     // video quality view, dwell, dwell time, click dwell time, active seconds
Author        // follow author
Negative      // not interested, mute author, block author, report, not dwelled
```

最终分数的计算公式：

```
Final Score = Σ (weight_i × P(action_i))
```

正交互行为权重为正，负向行为权重为负。权重参数定义在 `home-mixer/params/param.rs` 中，完全公开。

**关键设计决策：候选隔离**

在 Transformer 推理时，候选帖子之间不能互相 attend，只能 attend 用户上下文。这确保了：
- 每条帖子的分数不依赖批次中的其他帖子
- 分数一致且可缓存
- 避免了"对比偏差"

**Hash-Based Embeddings**

检索和排序都使用多个哈希函数进行嵌入查找，无需维护词表，新帖子可以立即获得表示。这对于 X 这样高吞吐量的平台至关重要。

### 2.3 候选检索：三路并行

| 来源 | 组件 | 机制 |
|------|------|------|
| In-Network | Thunder | 内存中维护关注者最近帖子的缓存 |
| Out-of-Network | Phoenix Retrieval | 用户和帖子的向量嵌入，最近邻搜索 |
| Out-of-Network | SimClusters | 按用户互动模式聚类，基于簇相似性检索 |

### 2.4 可见性过滤：独立于排序

这是整个系统中最精妙的设计之一。排序决定顺序，可见性过滤决定能否展示。两者是完全不同的服务、不同的输入、不同的规则。

可见性过滤的决策树：

```
ALLOW         → 正常展示
INTERSTITIAL  → 插页警告（如成人/暴力内容），用户可点击穿过
DROP          → 不展示
```

规则执行有两个重要特性：
- **短路评估**：第一条返回 DROP 的规则即结束
- **非关注者增强**：对来自未关注账号的推荐内容执行更严格的规则（如高召回垃圾过滤），但同样的内容对关注者仍然可见

### 2.5 VMRanker：多样性重排

在 Phoenix 打分排序后，VMRanker 使用行列式点过程（DPP）对结果重排，在分数和内容多样性之间做权衡。这避免了信息流中出现多条相似内容的情况。

## 三、安装与快速开始

项目主要由 Rust 和 Python/JAX 组成。以 Phoenix 模型为例，仓库提供了完整的训练和推理代码：

```bash
# 克隆仓库
git clone https://github.com/xai-org/x-algorithm.git
cd x-algorithm/phoenix

# Phoenix 模型训练（使用合成数据）
# 需要安装 Rust 和 Python 环境
# 参考 phoenix/QUICKSTART.md

# 核心依赖：
# - Rust (Cargo workspace)
# - Python 3.10+
# - JAX (Google 的数值计算库)
# - pyproject.toml 中定义了完整的 Python 依赖
```

仓库包含了合成数据生成代码，可以端到端运行一个 Phoenix 模型的概念验证训练。

## 四、使用方法与实战

### 4.1 理解排序权重

排序权重定义在 `home-mixer/params/param.rs` 中。一个重要的澄清（来自官方更新日志）：

> 权重缩放的是**预测概率**（如 P(like)、P(report)），而不是原始交互计数。不能简单地认为"1 个 report 权重是 like 的 468 倍就意味着 1 个举报抵消 468 个点赞"。

### 4.2 排序后调整

在加权求和之后，还有三个调整步骤：

- **作者多样性**：同一作者的第一条帖子后，后续帖子乘以衰减因子，降到下限为止
- **非关注内容折扣**：未关注账号的帖子和回复/转发乘以小于 1 的因子
- **新作者加权**：曝光量低于阈值的作者内容被提升到目标位置

### 4.3 实验与配置

系统支持 A/B 实验，流量 10% 以上的实验在仓库中可见。可通过配置系统调整参数，无需改代码。生产默认值通过 cron 脚本同步到仓库。

### 4.4 Under the Hood 透明度工具

X 还推出了 [Under the Hood](https://x.com/i/under_the_hood) 工具，让用户可以看到自己账号和帖子上的可见性标签统计。配合开源代码，用户可以理解标签如何影响内容可见性。

## 五、常见问题与解决方案

### Q1: 为什么有些规则代码不在仓库中？

为防止系统被滥用，部分规则（如 Grox 的 LLM 提示词、部分 Botmaker 规则）未公开。但通过 Under the Hood 工具可以看到这些系统的输出标签。

### Q2: 这个代码能直接部署吗？

仓库中的代码可以审查和部分运行（如 Phoenix 训练），但完整部署需要 X 的内部基础设施（如 `xai_service_runner`、`xai_kafka` 等），这些不在仓库中。

### Q3: 巴西 2026 选举过滤是什么？

根据巴西选举法，For You 信息流对巴西用户运行 `Brazil2026ElectionFilter`，从被举报给选举法院的账号中移除内容（除非用户明确关注该账号）。这是开源带来的透明度体现。

### Q4: SimClusters 和 Phoenix Retrieval 有什么区别？

SimClusters 基于用户互动模式聚类（"喜欢 A 的人也喜欢 B"），Phoenix Retrieval 基于内容向量嵌入的相似性。两者并行查询，结果合并后统一排序。

## 六、总结

X 开源 For You 推荐算法是推荐系统领域的一次重要透明化实践。其架构设计有多个值得借鉴的亮点：

- **多动作预测**取代单一相关性分数，让推荐目标更显式可控
- **排序与可见性分离**，让安全合规逻辑独立演进
- **候选隔离**保证了打分的一致性和可缓存性
- **Hash-Based Embeddings**让新内容零延迟可表示
- **双路径架构**将实时请求与离线内容理解解耦

对于推荐系统工程师、ML 研究者和关注信息流透明度的人来说，这个仓库是一座金矿。xAI 承诺会持续更新，实验参数变更也会同步到仓库，值得长期关注。
