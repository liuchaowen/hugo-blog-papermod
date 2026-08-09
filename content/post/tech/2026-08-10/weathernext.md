---
title: "WeatherNext：Google DeepMind 的 AI 全球中短期天气预报模型"
date: 2026-08-10
description: "WeatherNext 2（WN2）是 Google DeepMind 发布的全球中短期大气与热带气旋 AI 预报模型，由 GraphCast、GenCast 演进而来，提供 0.25° 分辨率、可直接用 HRES 初始场驱动，并开放 Colab 演示、预训练权重与 Google Cloud 数据推送。本文解析其架构、使用方式与适用场景。"
author: "Cheman"
slug: weathernext
draft: false
categories: [技术, 开源]
tags: [AI, 天气预报, Google DeepMind, 机器学习, 气象]
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

今天在 GitHub Trending 上看到一个有意思的项目：**google-deepmind/weathernext**。它是 DeepMind 在气象领域的集大成之作，把 GraphCast、GenCast 两代经典模型统一收纳，并带来了全新的 WeatherNext 2 与 WeatherNext Cyclones 模型族。

## 一、项目概述

WeatherNext 是 Google DeepMind 与 Google Research 共同维护的天气预报模型代码仓库，核心包含 **WeatherNext 2（WN2）**——一个面向全球、中短期（medium-range）的大气与热带气旋预报模型。同时，仓库也保留了前代模型 **GraphCast**（确定性图神经网络预报）与 **GenCast**（扩散模型集合预报）的代码与文档。

它的定位并非"玩具 demo"，而是已经投入业务化运行的研究级系统：

- **WeatherNext 2**：0.25° 分辨率（约 30km），在 ECMWF HRES 数据上微调，可直接用业务化的 HRES 初始场驱动，而非依赖 ERA5 再分析数据。
- **WeatherNext Cyclones**：与 WN2 共用同一套算法，区别在于 WN2 额外预测 100m 风速；该变体在 2025 年大西洋飓风季中已实时运行，并被美国国家飓风中心（NHC）以 FNV3（后处理版 GDMI）的形式使用。

对不想自己跑模型的用户，DeepMind 还提供了多渠道数据推送：Google Cloud（Earth Engine / BigQuery / Vertex AI）、WeatherLab（含气旋路径）、以及 Open-Meteo API。

## 二、技术原理

### 架构演进：从图网络到统一框架

WeatherNext 家族的底层是**自回归滚动（autoregressive rollout）**预测：模型以上一时刻的大气状态作为输入，逐步预测未来若干步。仓库中的 `utils/` 目录提供了跨模型共享的基础设施，包括：

- 自回归 rollout 调度
- 输入数据归一化
- 图构建模块（graph building blocks）
- 损失计算
- 与 JAX 兼容的 xarray 工具

```python
# setup.py 中声明了核心依赖（节选）
install_requires=[
    "chex", "dm-haiku", "jax", "jraph",
    "xarray<=2026.2.0", "xarray_tensorstore",
    "dinosaur-dycore", "fiddle", "pyproj", "rtree",
]
```

可以看到整套实现重度依赖 **JAX + Haiku + Jraph**，这是 DeepMind 一贯的技术栈选择：JAX 提供函数式可微编程与 TPU 加速能力，Jraph 负责图神经网络构建，xarray 处理带坐标的多维气象数据。

### 模型权重与分辨率谱系

仓库提供多档预训练权重，分辨率统一为 0.25°（约 30km 网格），差异体现在训练数据截止时间与用途：

| 模型 | 分辨率 | 训练数据截止 | 说明 |
| --- | --- | --- | --- |
| WeatherNext2_\<2025 | 0.25° | 2024 | 业务化运行版，4 个 checkpoints |
| WeatherNextCyclones_\<2025 | 0.25° | 2024 | 2025 飓风季实时运行（FNV3） |
| WeatherNextCyclones_\<2024 | 0.25° | 2023 | 复现论文 2024 结果 |
| WeatherNextCyclones_\<2023 | 0.25° | 2022 | 复现论文 2023 结果 |
| WeatherNextCyclones_Mini_\<2024 | 1° | 2023 | 轻量版，适合单卡/GPU |

`Mini` 系列把分辨率降到 1°，显存与算力需求大幅降低，可在 P100 上推理，适合本地测试与教学；非 Mini 模型则需要 H100 级别的显存（建议 TPU v5p）。

### 概率化预报

WN2 背后的技术报告《Skillful joint probabilistic weather forecasting from marginals》（arXiv:2506.10772）指出，模型从边缘分布出发实现联合概率化天气预报，相比纯确定性输出更利于风险评估。Cyclones 相关论文则发表在 *Nature*（doi:10.1038/s41586-026-10953-2）。

## 三、安装与快速开始

### 环境要求

- Python 3.10 / 3.11
- 建议 TPU（实现已针对 TPU 优化）；GPU 需切换 attention 实现
- 非 Mini 模型需 H100 显存；Mini 模型可在 P100 上运行

### 安装

> ⚠️ 这是研究代码，以"现状"提供，API 不保证稳定，建议固定到某个 release 版本。

```bash
pip install git+https://github.com/google-deepmind/weathernext.git@v0.3.0
```

预训练权重与示例数据位于 Google Cloud Bucket（`dm_graphcast`），需自行下载后使用。

### 最简运行：Colab 交互式 Demo

最友好的入口是官方 Colab Notebook（默认运行 WeatherNext Cyclones Mini，推荐 `v5e-1` 免费运行时）：

```bash
# 直接打开 Colab
https://colab.research.google.com/github/google-deepmind/weathernext/blob/master/docs/weathernext2/wn2_demo.ipynb
```

在 Notebook 中你将学到：自动加载权重、载入初始场（如 HRES）、初始化 WN2（FGN）架构、执行自回归 rollout、可视化温度/风速/位势高度，以及用内置 tracker 提取气旋路径、计算训练损失并做梯度更新。

## 四、使用方法与实战

### 从 HRES 初始场初始化

业务化版本的关键优势在于：它不再依赖 ERA5 再分析，而是直接用 ECMWF HRES 的 T+0 分析场作为初始条件，因此与实际业务预报链路对齐，延迟更低。训练微调数据可通过 WeatherBench2 的 HRES 数据集获取。

### 完整训练数据来源

若要复现完整训练，需要下载 ECMWF 的 **ERA5** 数据集（建议经 WeatherBench2 以 Zarr 格式访问），相关数据集可能受独立条款约束，使用前需自行确认合规。

### 气旋追踪实战

运行 Cyclones 模型后，可对模型输出直接调用内置 tracker 得到气旋路径（track data），这是它与普通预报模型最大的差异化能力——把"预报"延伸到"路径追踪"，对飓风季预警有直接价值。

## 五、常见问题与解决方案

**Q：跑模型提示显存不足（OOM）？**
A：非 Mini 模型需要 H100 级别显存。本地测试请优先使用 `WeatherNextCyclones_Mini_<2024`（1° 分辨率），可在 P100 上推理；或在 Colab 中选用 `v5e-1` 运行时跑 Mini 版。

**Q：GPU 上运行报错？**
A：代码默认针对 TPU 优化，在 GPU 上需按 Demo Notebook 切换 attention 实现。

**Q：如何获取预训练权重？**
A：权重托管在 Google Cloud Bucket `dm_graphcast`，需自行下载，README 中给出了浏览器入口链接。

**Q：pip 安装后依赖冲突？**
A：注意 `xarray<=2026.2.0` 的上限约束，以及 `gdm-xarray-jax` 从特定 git tag 安装，建议固定 release 版本（如 `@v0.3.0`）以避免破坏性更新。

**Q：结果能用于官方气象预警吗？**
A：不能。仓库明确声明这是实验性研究项目，未与任何政府气象机构合作或背书，**不可替代官方预警、警报或通知**，使用前需自行评估风险。

## 六、总结

WeatherNext 是 DeepMind 把多年气象 AI 积累（GraphCast → GenCast → WN2）统一收敛的集大成仓库：0.25° 全球分辨率、可直接吃 HRES 初始场、提供从 Colab 一键体验到业务级权重的完整链路，并额外在热带气旋追踪上做出了 Nature 级别的研究成果。对个人研究者，最务实的入口是用 Colab 跑通 Mini 版；对工程团队，则可经由 Google Cloud 直接订阅每日数据推送。值得提醒的是，它始终定位为研究代码，落地到真实业务决策前请务必结合官方气象机构的权威信息。

> 仓库地址：https://github.com/google-deepmind/weathernext
