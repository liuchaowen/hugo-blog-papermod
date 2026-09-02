---
title: "MiniMind：3块钱2小时，从零训练你自己的大语言模型"
date: 2026-09-02T12:04:00+08:00
description: "MiniMind 是一个从零开始的大语言模型全链路开源项目，仅用3块钱成本和2小时训练时间，即可训练出约64M参数的超小语言模型，覆盖预训练、SFT、LoRA、RLHF、Tool Use、Agentic RL等完整流程。"
author: "Cheman"
draft: false
tags: ["GitHub", "开源", "大语言模型", "LLM", "PyTorch", "AI训练"]
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

今天在 GitHub Trending 上看到一个硬核项目：**MiniMind**，它声称只需要3块钱、2小时，就能从零训练出一个26M~64M参数的小型大语言模型，覆盖从预训练到强化学习的全流程，所有核心算法纯 PyTorch 从零实现。

## 一、项目概述

MiniMind 由开发者 jingyaogong 开源，核心理念是"大道至简"。项目旨在完全从0开始，用极低的算力成本（约3元人民币）和极短的训练时间（约2小时，单卡3090），训练出规模约为64M的超小语言模型。

项目不只是训练一个能聊天的模型，而是覆盖了 LLM 的完整生命周期：

- **预训练（Pretrain）**：无监督学习语言规律与事实知识
- **监督微调（SFT）**：多轮对话、指令跟随、Tool Call 能力
- **LoRA 微调**：从零实现 LoRA，不依赖 peft 封装
- **RLHF（DPO）**：从零原生实现的偏好优化
- **RLAIF（PPO / GRPO / CISPO）**：强化学习从零实现
- **Tool Use & Agentic RL**：多轮工具调用场景下的强化学习
- **自适应思考与模型蒸馏**：支持 reasoning 标签与白盒蒸馏

当前主线 `minimind-3` 结构对齐 Qwen3 / Qwen3-MoE 生态，Dense 版本约64M参数，MoE版本约198M-A64M参数，兼容 transformers、llama.cpp、vllm、ollama 等主流推理框架。

## 二、技术原理

### 2.1 模型架构

MiniMind-3 采用 Transformer Decoder-Only 结构，核心设计选择包括：

- **预标准化（Pre-Norm）+ RMSNorm**：比传统 LayerNorm 更稳定，计算效率更高
- **SwiGLU 激活函数**：相比传统 ReLU/GELU，在同等参数量下表现更好
- **RoPE 旋转位置编码**：支持 YaRN 长文本外推，最大位置编码 32768
- **GQA 分组注意力**：`q_heads=8`、`kv_heads=4`，在效率和性能间取平衡

模型配置参数：

| 配置项 | minimind-3 | minimind-3-moe |
|--------|-----------|----------------|
| 参数量 | 64M | 198M-A64M |
| 词表大小 | 6,400 | 6,400 |
| 最大位置 | 32,768 | 32,768 |
| 层数 | 8 | 8 |
| 隐藏维度 | 768 | 768 |
| KV Heads | 4 | 4 |
| Q Heads | 8 | 8 |
| 类型 | Dense | 4 experts / top-1 |

关于参数选择的取舍，项目作者参考了 MobileLLM 的研究：在小模型区间，"深而窄"的结构通常优于"宽而浅"的结构。但当 `d_model < 512` 时，词嵌入维度过窄会带来明显劣势。最终选择 `dim=768, n_layers=8` 是训练效率、稳定性与效果之间的工程折中。

### 2.2 MoE 架构设计

MoE 版本在相同结构上扩展了前馈层，采用 `4 experts / top-1 routing` 配置，去除了 shared expert 设计（对齐 Qwen3-MoE 风格）。作者指出，增加 experts 数量后，原生 PyTorch 实现的调度开销会急剧上升，`4 experts / top-1` 是一个"甜点配置"，仅比 dense 模型慢约 50%。

### 2.3 Tokenizer 设计

MiniMind 使用自定义的 BPE + ByteLevel 分词器，词表仅 6,400 个 token。相比之下，Qwen2 为 151,643，Llama 3 为 128,000。这个极小的词表显著压缩了 embedding 层和输出层的参数占比（对小模型至关重要），虽然中文编解码效率略弱，但整体稳定可用。

### 2.4 训练算法从零实现

项目最硬核的地方在于：所有关键训练算法均使用 PyTorch 原生实现，不依赖第三方高层封装：

- **LoRA**：不使用 peft 库，从零实现低秩适配
- **DPO**：不使用 trl 库的 DPO Trainer，原生实现偏好优化
- **PPO/GRPO/CISPO**：强化学习算法从零实现
- **模型蒸馏**：白盒蒸馏原生实现

这意味着每一行训练代码都是可见、可改、可理解的。

### 2.5 核心代码示例

模型推理入口 `eval_llm.py` 的关键逻辑：

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from model.model_minimind import MiniMindConfig, MiniMindForCausalLM
from model.model_lora import *
from trainer.trainer_utils import setup_seed, get_model_params

def init_model(args):
    tokenizer = AutoTokenizer.from_pretrained(args.load_from)
    if 'model' in args.load_from:
        model = MiniMindForCausalLM(MiniMindConfig(
            hidden_size=args.hidden_size,
            num_hidden_layers=args.num_hidden_layers,
            use_moe=bool(args.use_moe),
            inference_rope_scaling=args.inference_rope_scaling
        ))
        moe_suffix = '_moe' if args.use_moe else ''
        ckp = f'./{args.save_dir}/{args.weight}_{args.hidden_size}{moe_suffix}.pth'
        model.load_state_dict(
            torch.load(ckp, map_location=args.device), strict=True
        )
        if args.lora_weight != 'None':
            apply_lora(model)
            load_lora(model, f'./{args.save_dir}/{args.lora_weight}_{args.hidden_size}.pth')
    else:
        model = AutoModelForCausalLM.from_pretrained(
            args.load_from, trust_remote_code=True
        )
    get_model_params(model, model.config)
    return model.half().eval().to(args.device), tokenizer
```

可以看到，模型支持两种加载方式：原生 PyTorch 权重和 Transformers 格式，同时支持动态加载 LoRA 权重。

## 三、安装与快速开始

### 3.1 环境要求

- Python >= 3.10
- PyTorch（建议支持 CUDA）
- 单卡 NVIDIA 3090（24GB）即可完成完整训练

### 3.2 安装步骤

```bash
# 克隆仓库
git clone --depth 1 https://github.com/jingyaogong/minimind
cd minimind

# 安装依赖（国内镜像加速）
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple
```

核心依赖包括 `torch`、`transformers==4.57.6`、`trl==0.13.0`、`streamlit`、`swanlab` 等。

### 3.3 下载预训练模型

```bash
# 方式1：ModelScope
modelscope download --model gongjy/minimind-3 --local_dir ./minimind-3

# 方式2：HuggingFace
git clone https://huggingface.co/jingyaogong/minimind-3
```

### 3.4 下载训练数据

从 ModelScope 或 HuggingFace 下载训练数据，放入 `./dataset/` 目录：

```bash
./dataset/
├── pretrain_t2t_mini.jsonl (1.2GB)  # 快速复现必选
├── sft_t2t_mini.jsonl (1.6GB)       # 快速复现必选
├── rlaif.jsonl (24MB)               # RLAIF训练
├── dpo.jsonl (53MB)                 # DPO训练
└── ...
```

## 四、使用方法与实战

### 4.1 CLI 推理

```bash
# 使用 Transformers 格式模型
python eval_llm.py --load_from ./minimind-3

# 使用 PyTorch 原生权重
python eval_llm.py --load_from ./model --weight full_sft
```

支持的关键参数包括 `--temperature`（生成温度）、`--top_p`（核采样阈值）、`--open_thinking`（自适应思考开关）、`--historys`（历史对话轮数）等。

### 4.2 WebUI 对话

```bash
# 需要先将模型文件夹复制到 scripts/ 目录
cp -r minimind-3 ./scripts/minimind-3
cd scripts && streamlit run web_demo.py
```

WebUI 支持思考链展示、工具选择和多轮 Tool Call。

### 4.3 第三方推理框架

```bash
# ollama
ollama run jingyaogong/minimind-3

# vllm
vllm serve /path/to/model --served-model-name "minimind"
```

### 4.4 完整训练流程

**第一步：预训练（必须）**

```bash
cd trainer && python train_pretrain.py
# 多卡训练
torchrun --nproc_per_node 1 train_pretrain.py
```

预训练阶段让模型从海量文本中学习语言规律和事实知识，输出 `pretrain_768.pth` 权重。

**第二步：监督微调（必须）**

```bash
cd trainer && python train_full_sft.py
```

SFT 阶段让模型适应多轮对话格式，学习 user/assistant/system/tool 角色结构，当前主线数据已混入 Tool Call 样本。

**第三步：强化学习（可选）**

```bash
# DPO
python train_dpo.py
# PPO/GRPO/CISPO
python train_rlhf.py --algorithm grpo
# Agentic RL
python train_agent.py
```

### 4.5 训练成本估算

| 模型 | 预训练 | SFT | 总成本 |
|------|--------|-----|--------|
| minimind-3 (64M) | ≈1.21h / ≈1.57￥ | ≈1.10h / ≈1.43￥ | ≈3.0￥ |
| minimind-3-moe (198M) | ≈1.69h / ≈2.20￥ | ≈1.54h / ≈2.00￥ | ≈4.2￥ |

以上为单卡 3090 跑 1 epoch 的估算值。

### 4.6 断点续训

所有训练脚本支持检查点保存与恢复：

```bash
python train_pretrain.py --from_resume 1
python train_full_sft.py --from_resume 1
```

支持跨 GPU 数量恢复，wandb/SwanLab 训练记录自动连续。

## 五、常见问题与解决方案

### 5.1 CUDA 不可用

确认 PyTorch 已正确安装 CUDA 支持：

```python
import torch
print(torch.cuda.is_available())
```

如果不可用，可以选择 CPU 或 MPS 后端运行，但训练速度会有显著差异。

### 5.2 显存不足

- 减小 `max_seq_len` 参数（如从 768 降到 512）
- 使用 `pretrain_t2t_mini` 和 `sft_t2t_mini` 数据集
- 尝试更小的模型配置（如 `dim=512`）

### 5.3 训练中断后恢复

使用 `--from_resume 1` 参数，检查点文件保存在 `./checkpoints/` 目录下，支持自动恢复训练进度。

### 5.4 词表大小选择的权衡

MiniMind 选择 6,400 的极小词表是为了压缩 embedding 参数占比。对于 64M 的小模型来说，如果词表像 Qwen2 那样达到 15 万，embedding 层就会占据大部分参数，反而影响模型容量。虽然中文编解码效率略低，但整体稳定性没有明显问题。

### 5.5 MoE 训练比 Dense 慢

这是预期行为。原生 PyTorch 实现的 MoE 缺少 kernel-fused 优化，`4 experts / top-1` 配置约比 Dense 慢 50%。如需更快推理，建议转换为 llama.cpp 或 vllm 格式。

## 六、总结

MiniMind 是一个难得的 LLM 全链路教学与实践项目。它的价值不在于模型效果有多强，而在于把大语言模型从预训练到强化学习的每一个环节都拆解成可读、可改、可理解的代码。对于想真正理解 LLM 内部机制的开发者来说，用3块钱、2小时亲手训练一个完整的小模型，远比调 API 调参更有启发。

项目所有核心算法从零实现、完整训练数据开源、兼容主流推理生态，加上从 Dense 到 MoE、从基础对话到 Agentic RL 的全覆盖，使其成为当前最完整的 LLM 从零入门开源项目之一。

> 项目地址：[https://github.com/jingyaogong/minimind](https://github.com/jingyaogong/minimind)
> 在线体验：[ModelScope 创空间](https://www.modelscope.cn/studios/gongjy/MiniMind)
