---
title: "阿里巴巴开源 Zvec：嵌入应用的高性能进程内向量数据库"
date: 2026-06-17
description: "Zvec 是阿里巴巴开源的轻量级进程内向量数据库，支持稠密与稀疏向量、全文检索、混合查询，毫秒级搜索数十亿向量，已在阿里集团生产环境大规模验证。"
author: "Cheman"
slug: "zvec"
draft: false
categories: ["开源", "数据库", "AI基础设施"]
tags: ["向量数据库", "阿里巴巴", "开源", "ANN", "全文检索", "Hybrid Search"]
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

今天在 GitHub Trending 上看到一个非常有实力的项目：**阿里巴巴开源的 Zvec**——一款嵌入应用内部的轻量级向量数据库，专为低延迟、高吞吐的相似性搜索场景设计，已经在阿里集团内部经受了大规模生产环境的考验。

## 一、项目概述

Zvec 的核心理念是**将向量数据库直接嵌入应用程序进程**，而不是作为独立服务部署。这种设计带来了几个关键优势：

- **零运维开销**：无需部署独立的数据库服务，没有网络通信开销，配置简单
- **极致低延迟**：进程内调用消除了网络往返时间，搜索延迟降至毫秒级
- **随处运行**：从 Jupyter Notebook 到边缘设备，只要你的代码能运行，Zvec 就能运行
- **数据持久化保障**：通过 WAL（Write-Ahead Logging）机制保证数据不会因进程崩溃或断电而丢失

在 v0.5.0（2026年6月12日发布）中，Zvec 引入了多项重量级更新，包括原生全文检索（FTS）、混合查询（Hybrid Retrieval）、DiskANN 磁盘索引，以及全新的 Go/Rust SDK，生态扩展非常迅速。

## 二、技术原理

### 2.1 架构设计

Zvec 采用 **C++17 内核 + 多语言绑定**的架构。核心向量引擎完全用 C++ 编写，上层通过 pybind11（Python）、N-API（Node.js）、cgo（Go）、FFI（Rust）等方式提供语言绑定。从 `CMakeLists.txt` 可以看出其构建体系的几个关键设计：

```cmake
cmake_minimum_required(VERSION 3.13)
project(zvec)
set(CC_CXX_STANDARD 17)

option(BUILD_ZVEC_SHARED "Build all-in-one C++ shared library libzvec" ON)
option(BUILD_PYTHON_BINDINGS "Build Python bindings using pybind11" OFF)
option(BUILD_C_BINDINGS "Build C bindings" ON)
```

架构分为三个核心层：
1. **libzvec_core**：底层数据结构与索引算法（HNSW、RaBitQ、DiskANN）
2. **libzvec**：完整的数据库功能层，包含集合管理、查询引擎、WAL 持久化
3. **语言绑定层**：各语言的 SDK 封装

### 2.2 索引引擎与向量算法

Zvec 支持多种向量索引类型，可根据场景在内存与磁盘之间灵活选择：

- **HNSW**：经典的内存型图索引，适合中小规模数据集，查询延迟极低
- **RaBitQ**：量化压缩索引，在 Linux x86_64 上支持 AVX2/AVX-512 SIMD 加速，显著降低内存占用：

```cmake
if(COMPILER_SUPPORTS_AVX2 OR COMPILER_SUPPORTS_AVX512)
    set(RABITQ_SUPPORTED ON)
    if(RABITQ_ENABLE_AVX512 AND COMPILER_SUPPORTS_AVX512)
        set(RABITQ_ARCH_FLAG "${MATH_RABITQ_ARCH_FLAG_AVX512}")
    endif()
endif()
```

- **DiskANN**：基于磁盘的索引（仅 Linux x86_64，需 libaio），将索引主体存储在磁盘上，大幅降低内存需求，适合十亿级向量的大规模场景：

```cmake
if(CMAKE_SYSTEM_NAME STREQUAL "Linux" AND CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64")
    set(DISKANN_SUPPORTED ON)
    add_definitions(-DDISKANN_SUPPORTED=1)
endif()
```

### 2.3 全文检索与混合查询

v0.5.0 引入的 FTS 功能非常值得关注。Zvec 支持对任意字符串字段附加全文索引，内置 **jieba 中文分词器**，分词字典会被打包到 Python wheel 中：

```cmake
install(FILES
    "${ZVEC_JIEBA_DICT_SRC}/jieba.dict.utf8"
    "${ZVEC_JIEBA_DICT_SRC}/hmm_model.utf8"
    DESTINATION ${ZVEC_PY_INSTALL_DIR}/zvec/data/jieba_dict)
```

混合查询（`MultiQuery`）可以在单次查询中同时融合稠密向量相似度、稀疏向量相似度、全文检索相关性和标量字段过滤，避免了传统方案中需要两次独立调用再合并结果的繁琐流程。

### 2.4 数据持久化与并发模型

Zvec 通过 WAL 实现持久化——所有写操作先写入日志，再应用到内存索引。即使进程意外终止，重启后也能从 WAL 恢复数据。并发模型上，Zvec 支持多进程同时读取同一集合，写操作保持单进程独占。

## 三、安装与快速开始

### 环境要求

- **Python**：3.10 ~ 3.14
- **Node.js**：支持主流 LTS 版本
- **操作系统**：Linux（x86_64/ARM64）、macOS（ARM64）、Windows（x86_64）

### 安装

Python 安装一行命令搞定：

```bash
pip install zvec
```

Node.js 同样简洁：

```bash
npm install @zvec/zvec
```

还提供 Go、Rust、Dart/Flutter 官方 SDK。

### 最简示例

```python
import zvec

# 定义集合 Schema（含一个 4 维浮点向量字段）
schema = zvec.CollectionSchema(
    name="example",
    vectors=zvec.VectorSchema("embedding", zvec.DataType.VECTOR_FP32, 4),
)

# 创建并打开集合
collection = zvec.create_and_open(path="./zvec_example", schema=schema)

# 插入文档
collection.insert([
    zvec.Doc(id="doc_1", vectors={"embedding": [0.1, 0.2, 0.3, 0.4]}),
    zvec.Doc(id="doc_2", vectors={"embedding": [0.2, 0.3, 0.4, 0.1]}),
])

# 向量相似度搜索
results = collection.query(
    zvec.VectorQuery("embedding", vector=[0.4, 0.3, 0.3, 0.1]),
    topk=10
)
print(results)
```

整个流程只有定义 Schema → 插入数据 → 查询三步，无需配置服务器、连接字符串或任何外部依赖。

## 四、使用方法与实战

### 4.1 多向量与多索引

Zvec 支持在同一集合中创建多个向量字段，每个字段可以独立选择索引类型：

```python
schema = zvec.CollectionSchema(
    name="multimodal",
    vectors={
        "dense": zvec.VectorSchema("dense", zvec.DataType.VECTOR_FP32, 768),
        "sparse": zvec.VectorSchema("sparse", zvec.DataType.VECTOR_SPARSE),
    },
)
```

这在多模态检索场景中非常实用——例如同时用 CLIP 图像嵌入和 BM25 文本嵌入进行联合检索。

### 4.2 全文检索实战

```python
schema = zvec.CollectionSchema(
    name="articles",
    vectors=zvec.VectorSchema("embedding", zvec.DataType.VECTOR_FP32, 768),
    fields=[
        zvec.FieldSchema("title", zvec.DataType.STRING),
        zvec.FieldSchema("content", zvec.DataType.STRING),
    ],
)
```

中文全文检索开箱即用，内置 jieba 分词，无需额外配置。

### 4.3 混合查询

```python
results = collection.query(
    zvec.MultiQuery(
        vector=zvec.VectorQuery("embedding", vector=query_vec, topk=10),
        text=zvec.TextQuery("content", query="机器学习入门", topk=10),
        filter=zvec.Filter("category == 'tech'"),
    )
)
```

### 4.4 Zvec Studio

官方还提供了 [Zvec Studio](https://github.com/zvec-ai/zvec-studio) 可视化工具，可以直观地浏览数据、调试查询，无需编写任何代码。

## 五、常见问题与解决方案

### Q1：DiskANN 在 macOS 上为什么不可用？

DiskANN 依赖 Linux 特有的 libaio 异步 I/O 库，目前仅在 Linux x86_64 上构建。在 macOS 或 ARM64 Linux 上，建议使用 HNSW 或 RaBitQ 索引作为替代。

### Q2：RaBitQ 需要什么 CPU 支持？

RaBitQ 依赖 AVX2 或 AVX-512 SIMD 指令集。在 ARM64（如 Apple Silicon）和未检测到这些指令集的 x86 平台上会自动禁用。

### Q3：多进程写冲突怎么办？

Zvec 的设计是单进程写、多进程读。如果需要多写入者，需要在应用层引入分布式锁或消息队列进行协调。

### Q4：如何选择索引类型？

- **数据量 < 百万级**：HNSW，查询最快
- **数据量百万~十亿，内存有限**：RaBitQ（需 AVX2/AVX-512）或 DiskANN
- **数据量 > 十亿级**：DiskANN（仅 Linux x86_64）

## 六、总结

Zvec 在"进程内向量数据库"这个细分领域做得非常扎实：C++ 内核保证性能、多语言 SDK 保证易用性、WAL 保证可靠性。v0.5.0 带来的全文检索和混合查询能力使其从纯粹的向量搜索工具升级为全能型的嵌入式搜索引擎。对于不想维护独立向量数据库服务、追求极致查询延迟、或者在边缘设备上运行向量检索的开发者来说，Zvec 是一个值得认真考虑的选择。

> 项目地址：[https://github.com/alibaba/zvec](https://github.com/alibaba/zvec) | 文档：[https://zvec.org](https://zvec.org) | 许可证：Apache 2.0
