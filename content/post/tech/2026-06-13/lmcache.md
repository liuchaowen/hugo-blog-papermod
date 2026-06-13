---
title: "LMCache：LLM 推理的 KV Cache 管理层，让 GPU 显存压力骤降"
date: 2026-06-13
description: "LMCache 是一个 vendor-neutral 的 KV Cache 管理层，可将 GPU 中的 KV Cache 卸载至 CPU/SSD/Redis 等存储，支持跨请求/会话/引擎复用，显著降低 TTFT、提升吞吐，尤其适合长上下文 Agentic 和多轮对话场景。"
author: "Cheman"
slug: lmcache
draft: false
categories: [技术, 开源]
tags: [GitHub, LLM, 推理优化, KV Cache, 开源]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**LMCache**，一个 KV Cache 管理中间层，能够把 GPU 显存里的中间结果持久化出来复用，显著降低 TTFT（首 Token 延迟）和提升吞吐，特别适合长上下文和多轮 Agentic 场景。

## 一、项目概述

LMCache 定位为 **LLM 推理的服务层基础设施**，核心思路是把 KV Cache 从"推理引擎的临时状态"转化为"可持久化存储、可跨引擎复用、可观测、可变换的 AI 原生知识"。

项目主要特点：

- **引擎无关**：以独立 Daemon 进程运行，即使推理引擎崩溃，KV Cache 也不会丢失（无 Fate-sharing）
- **多级持久化卸载**：支持 GPU → CPU RAM → 本地 SSD → 远程后端（Redis/Valkey/S3/Mooncake 等）的分层存储
- **生产级可观测性**：内置请求级/Token 级 Prefix Cache 命中率、生命周期、性能诊断等指标
- **跨引擎集成**：已与 vLLM、NVIDIA Dynamo、SGLang、TGI 等主流推理框架深度集成
- **PD 分离**：支持 Prefill-Decode 分离架构，通过 NVLink/RDMA/TCP 传输 KV Cache
- **硬件广泛支持**：CUDA、ROCm（AMD MI300X）、Intel SYCL、MUSA 多硬件后端

## 二、技术原理

### 2.1 架构设计

LMCache 采用 **Daemon + Plugin** 架构：

```
┌─────────────────────────────────────────────────────────┐
│                    LLM Serving Engine                   │
│         (vLLM / Dynamo / SGLang / TGI / ...)            │
└──────────────────────┬──────────────────────────────────┘
                       │  LMCache Connector
┌──────────────────────▼──────────────────────────────────┐
│                 LMCache Daemon                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Storage Mgr │  │  KV Transforms│  │ Observability │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘ │
│         │                │                   │          │
│  ┌──────▼────────────────▼───────────────────▼───────┐ │
│  │           Storage Backend Interface               │ │
│  │  (CPU RAM / SSD / Redis / Mooncake / S3 / ...)   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

核心源码在 `lmcache/v1/` 目录下，包含存储管理、连接器、Serde（序列化/反序列化）等核心模块。

### 2.2 持久化 KV Cache 的关键技术

**Tiered Storage**：KV Cache 从 GPU 显存卸载到分层存储（CPU RAM → SSD → Remote），通过 LRU/TTL 策略管理各层容量。

**Non-prefix KV Reuse**：基于 **CacheBlend** 论文（EuroSys 2025），不仅复用前缀，还能在 Prompt 任意位置复用 KV Cache，对不能命中的 Token 用 CacheBlend 选择性重计算来保证生成质量。

**Serde Interface**：统一的序列化/反序列化接口，支持自定义压缩、Token Dropping 等变换策略：

```python
# Serde 接口示意（基于 README 中描述的 pluggable interface）
class KVSerde:
    def serialize(self, kv_cache) -> bytes:
        ...

    def deserialize(self, data: bytes) -> kv_cache:
        ...
```

### 2.3 多硬件后端编译

LMCache 的 GPU 扩展通过 PyTorch C++ Extension 编译，支持多种后端：

```python
# setup.py 核心逻辑（简化）
ext_modules = []

if not NO_NATIVE_EXT:
    # 纯 C++ 通用扩展
    ext_modules.extend(_common_cpp_extensions())

    # GPU 后端（互斥，只能选一）
    if BUILD_WITH_SYCL:
        ext_modules.extend(sycl_extension())    # Intel XPU
    elif BUILD_WITH_HIP:
        ext_modules.extend(rocm_extension())    # AMD ROCm
    elif BUILD_WITH_MUSA:
        ext_modules.extend(musa_extension())    # 摩尔线程
    else:
        ext_modules.extend(cuda_extension())    # NVIDIA CUDA
```

CUDA 架构支持范围非常广：`7.5 (T4) → 12.0 (RTX 50)`，确保各类 GPU 均能受益。

## 三、安装与快速开始

### 环境要求

- Python >= 3.10, < 3.14
- PyTorch 2.11.0
- CUDA 12.9+ 或 ROCm / SYCL / MUSA 环境

### 最简安装

```bash
pip install lmcache
```

从源码编译（启用全部 GPU 扩展）：

```bash
git clone https://github.com/LMCache/LMCache.git
cd LMCache
pip install -e . --no-build-isolation
```

### 快速上手

安装完成后，有三个命令行工具可用：

```bash
# 启动 LMCache Server（管理 KV Cache 的 Daemon 进程）
lmcache_server

# 启动 LMCache Controller（API 服务）
lmcache_controller

# CLI 工具
lmcache --help
```

配合 vLLM 使用示例：

```bash
pip install lmcache vllm
# vLLM 会自动通过 connector 与 LMCache Daemon 通信
```

更多配置和部署方案请参考 [官方文档](https://docs.lmcache.ai/)。

## 四、生态与合作伙伴

LMCache 已深度融入 LLM 推理生态，是 **PyTorch Foundation** 官方项目：

- 🔥 **NVIDIA Dynamo**：官方集成，加速 LLM 推理
- 🔥 **vLLM v1**：多模态 KV Cache 加速（GPT-4o、Llama 等）
- 🔥 **AMD MI300X**：Agentic Workload 基准测试，性能显著提升
- **CoreWeave + Cohere**：生产级部署案例
- **Redis**：KV Cache + Redis 组合，降低推理成本
- **Mooncake / InfiniStore**：高性能 KV 传输后端
- **S3 兼容对象存储**：低成本海量 KV Cache 存储

2026 年 GTC 也有相关展示，已成为分布式推理领域的基础设施层。

## 五、总结

LMCache 填补了 LLM 推理中 **KV Cache 无法复用** 的关键空白——它通过标准化的 Daemon + 插件架构，将 KV Cache 管理从推理引擎中解耦出来，既保证了稳定性（引擎崩溃不影响 Cache），又实现了跨请求、跨会话、跨引擎的复用。结合 CacheBlend 等学术研究成果，在长上下文 RAG 和多轮 Agentic 场景中有着明显的性能优势。

如果你正在做 LLM 推理优化，或需要处理长上下文场景，LMCache 是一个值得深入了解的项目。

> **项目地址**：https://github.com/LMCache/LMCache
> **官方文档**：https://docs.lmcache.ai/
> **博客**（含深度技术文章）：https://blog.lmcache.ai/
