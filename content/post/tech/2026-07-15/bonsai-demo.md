---
title: "Bonsai-demo：本地跑起 1-bit 与三值量化的前沿大模型"
date: 2026-07-15
description: "Bonsai-demo 是 PrismML 提供的开箱即用演示仓库，让你在 Mac、Linux/Windows（CUDA、Vulkan、ROCm）或 CPU 上本地运行 1-bit Bonsai 与 Ternary-Bonsai 大模型，默认即拉起 27B 视觉语言模型，支持推理、工具调用与超长上下文。"
author: "Cheman"
slug: bonsai-demo
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 大模型, 量化, llama.cpp]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**Bonsai-demo**——一个让你在本地机器上跑起极致低比特大模型的「一站式」演示仓库。它把模型下载、推理引擎编译、聊天服务器乃至 Agent 工具调用全部打包，两条命令就能在消费级设备上体验 1-bit / 三值量化的前沿模型。

## 一、项目概述

Bonsai-demo 是 PrismML 团队为 **Bonsai** 和 **Ternary-Bonsai** 系列语言模型打造的开箱即用演示工程。它解决的核心问题是：**如何在没有数据中心级 GPU 的前提下，把极低比特（1-bit、三值 ≈1.7-bit）的大模型跑起来**。

项目的两大模型家族：

- **Bonsai（1-bit）**：权重被压到约 1.125 bit/weight（打包后），极致小巧。例如 1-bit Bonsai-27B 甚至可以塞进一台现代 iPhone 而不需要内存卸载。
- **Ternary-Bonsai（三值）**：约 1.7 bit/weight，打包进 2-bit 以适配高速加速内核，是质量更高的默认选项。

两个家族均提供 **27B / 8B / 4B / 1.7B** 四种规模，其中 27B 是首批 **视觉-语言模型（VLM）**，支持看图、工具调用与推理（thinking）。

快速开始的「两条命令」范式：

```bash
git clone https://github.com/PrismML-Eng/Bonsai-demo.git
cd Bonsai-demo
./setup.sh          # 默认下载 Ternary-Bonsai-27B 并装好依赖
./scripts/start_llama_server.sh   # http://localhost:8080
```

## 二、技术原理

### 2.1 极低比特量化格式

Bonsai 的「魔法」在于激进的权重量化。README 中给出的内存对照表直观展示了压缩效果（以 27B 为例）：

| 模型 | 格式 | 权重占用 |
|---|---|---|
| Bonsai-27B (1-bit) | llama.cpp `Q1_0` | 3.53 GiB |
| Ternary-Bonsai-27B | llama.cpp `Q2_0` | 6.66 GiB |
| *参考：27B BF16* | GGUF BF16 | 47.73 GiB |
| *参考：27B "4-bit"* | llama.cpp `UD Q4_K_M` | 15.73 GiB |

可以看到，1-bit 版本相比 BF16 缩小了约 **13 倍**，即使相比常见的 4-bit 量化也小了将近 **4.5 倍**。

### 2.2 与 llama.cpp 主线的融合

两个格式正在并入上游 llama.cpp：

- **Q1_0（1-bit）** 已完全合并进上游，CPU / Metal / CUDA / Vulkan 开箱即用。
- **Q2_0（三值）** 已能在主线 CPU 与 Metal 上运行，Vulkan 在审核中，CUDA 在 review。

README 详细列出了三值 GGUF 的三种变体及各自应运行的环境：

| 文件 | 格式 | 运行位置 |
|------|------|----------|
| `*-Q2_0.gguf` | group size 128（本 demo 默认） | 本 demo / fork 二进制 |
| `*-Q2_0_g64.gguf` | group size 64（官方格式） | 主线 llama.cpp（CPU、Metal） |
| `*-PQ2_0.gguf` | 规划中 fork 格式 | 暂无 |

这意味着如果你想在**原生** llama.cpp（CPU 或 Metal）上跑小尺寸三值模型，应使用 group-64 的文件：

```bash
hf download prism-ml/Ternary-Bonsai-1.7B-gguf Ternary-Bonsai-1.7B-Q2_0_g64.gguf --local-dir models
```

### 2.3 超长上下文与 KV 缓存优化

27B 模型支持高达 **262,144 tokens** 的上下文。其混合注意力（hybrid attention）让 KV 缓存相对较小——FP16 KV 缓存每 token 约 64 KiB，100K 上下文约 6.3 GiB，多数消费设备即可承受。

开启可选的 **4-bit KV 缓存**（`BONSAI_KV4=1`）后，每 token 降至约 18 KiB，100K 上下文仅约 **1.8 GiB**，Ternary-Bonsai-27B 在 llama.cpp 上的峰值从 ~13.7 GiB 降到 ~9.2 GiB。

## 三、安装与快速开始

### 3.1 macOS / Linux

```bash
git clone https://github.com/PrismML-Eng/Bonsai-demo.git
cd Bonsai-demo

# 可选：选择模型尺寸 27B（默认）/ 8B / 4B / 1.7B
export BONSAI_MODEL=27B

# 设置 HuggingFace token（仅 27B 仓库私有期间需要）
export BONSAI_TOKEN="hf_your_token_here"

./setup.sh
```

### 3.2 Windows（PowerShell）

```powershell
git clone https://github.com/PrismML-Eng/Bonsai-demo.git
cd Bonsai-demo
$env:BONSAI_MODEL = "27B"
$env:BONSAI_TOKEN = "hf_your_token_here"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

### 3.3 setup.sh 到底做了什么

README 明确列出了脚本的八步流程，即便是全新机器也能一站搞定：

1. 检查/安装系统依赖（macOS 的 Xcode CLT、Linux 的 build-essential）
2. 安装 [uv](https://docs.astral.sh/uv/)（用户级 Python 包管理器）
3. 创建 venv 并 `uv sync`（cmake、ninja、huggingface-cli）
4. 从 HuggingFace 下载模型
5. 下载预编译二进制（或源码构建）
6. 从源码构建 MLX（仅 macOS）
7. 安装 Open WebUI（Agent 演示用，可用 `BONSAI_OPENWEBUI=0` 跳过）
8. 构建代码解释器 venv（`.venv-jupyter`）

重跑 `setup.sh` 是安全的——已完成的步骤会自动跳过。

## 四、使用方法与实战

### 4.1 命令行推理

```bash
# llama.cpp（Mac/Linux 自动识别平台）
./scripts/run_llama.sh -p "法国的首都是哪里？"

# 换用不同尺寸
BONSAI_MODEL=4B ./scripts/run_llama.sh -p "写一首关于盆景的俳句"

# MLX（Apple Silicon Mac）
source .venv/bin/activate
./scripts/run_mlx.sh -p "法国的首都是哪里？"
```

### 4.2 启动聊天服务器

```bash
./scripts/start_llama_server.sh   # http://localhost:8080
```

27B 是「思考模型」，默认开启 thinking。在聊天界面点消息框灯泡即可选择推理强度：Off / Low(512) / Medium(2048) / High(8192) / Max。对不支持指定推理强度的 API 客户端，可用 flag 全局限制：

```bash
./scripts/start_llama_server.sh --reasoning-budget 2048
```

### 4.3 视觉、工具调用与 MCP

27B 作为 VLM 支持多模态输入：在聊天界面上传图片（或 API 传 `image_url`），脚本会自动加载视觉投影器并对超大图降采样。它同时原生支持 OpenAI 风格 `tool_calls` 的完整往返，内置 MCP 客户端（预配置 Hugging Face + DeepWiki）。

### 4.4 Open WebUI 完整 Agent 演示

```bash
./scripts/start_openwebui.sh   # http://localhost:9090
```

这会拉起一个 ChatGPT 式界面：图文对话、实时工具调用、服务端代码解释器（绘图 + 行情数据），以及一个供调查用的隐藏销售数据库，全部自动配置好。

### 4.5 实验特性

- **投机解码**（`BONSAI_SPECULATIVE=1`）：27B 配对 dspark drafter，代码与推理解码约快 1.8–2 倍（CUDA）。
- **4-bit KV 缓存**（`BONSAI_KV4=1`）：超长上下文显存下降约 3.5 倍。

## 五、常见问题与解决方案

### 5.1 选择家族与尺寸

两个环境变量即可自由组合（默认 `Ternary-Bonsai-27B`）：

| 变量 | 默认值 | 可选值 | 作用 |
|------|--------|--------|------|
| `BONSAI_FAMILY` | `ternary` | `ternary`, `bonsai`, `all` | 模型家族 |
| `BONSAI_MODEL` | `27B` | `27B`, `8B`, `4B`, `1.7B`, `all` | 模型尺寸 |

```bash
BONSAI_FAMILY=bonsai ./setup.sh          # 1-bit Bonsai-27B
BONSAI_FAMILY=bonsai BONSAI_MODEL=4B ./setup.sh   # Bonsai-4B
BONSAI_FAMILY=all BONSAI_MODEL=all ./setup.sh     # 全矩阵（8 次下载）
```

### 5.2 CUDA 源码编译 OOM / 卡死

**现象**：`cmake --build` 卡住、系统无响应，或被 OOM 杀掉。
**原因**：编译 CUDA kernel 非常吃内存，低显存（<16 GB）机器并行编译会耗尽 VRAM/RAM。
**处理**：`build_cuda_linux.sh` 与 `build_cuda_windows.ps1` 会在构建前自动检测 VRAM，若 < 16 GB 则把并行度限制到 `-j 2`。仍有问题可手动进一步降低并行度或关闭其他 GPU 占用程序。

### 5.3 三值模型「加载失败 / 跑不起来」

**原因**：用了错误变体的 GGUF。group-128 的 `*-Q2_0.gguf` 只能在 fork 二进制里跑，主线 llama.cpp 需改用 group-64 的 `*-Q2_0_g64.gguf`。
**处理**：在 CPU/Metal 上跑小尺寸三值模型时，按前文用 `hf download` 拉取 `_g64` 文件。

### 5.4 27B 私有仓库拉不下来

需设置 `BONSAI_TOKEN`（HuggingFace 只读 token），仓库公开后该变量可移除。

## 六、总结

Bonsai-demo 把「极低比特大模型本地化」这件原本门槛很高的事，收敛成了两条命令：克隆仓库、跑 `setup.sh`，再起一个服务器就能拥有 27B 级视觉-语言模型的聊天、推理与工具调用能力。它的双格式（1-bit / 三值）策略、与 llama.cpp 主线的渐进融合、以及对 KV 缓存与投机解码的精细调校，都体现了在「极致压缩」与「可用质量」之间求平衡的工程取舍。对于想在自己笔记本上体验前沿量化模型、或研究低比特推理落地的开发者，这是一个相当值得把玩与拆解的仓库。

- 项目地址：<https://github.com/PrismML-Eng/Bonsai-demo>
- 模型合集：<https://huggingface.co/collections/prism-ml/bonsai-27b>
