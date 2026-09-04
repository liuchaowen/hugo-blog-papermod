---
title: "Miles：面向大规模模型后训练的企业级强化学习框架"
date: 2026-09-04T21:04:00+08:00
description: "Miles 是 Radixark 开源、基于 SGLang + Megatron-LM 的企业级强化学习后训练框架，支持全异步 RL、低精度训练、P2P 秒级权重同步与 MoE 路由对齐，可在千卡集群上训练万亿参数模型。"
author: "Cheman"
draft: false
tags: [强化学习, 大模型后训练, SGLang, Megatron-LM, GitHub Trending, 开源]
categories: [技术, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Miles**，一句话概括它的价值——把强化学习从「实验室玩具」升级为能在千卡集群上稳定对齐万亿参数模型的「生产级后训练底座」。

## 一、项目概述

Miles 是一个高性能、企业级就绪的强化学习（RL）框架，专门服务于**大规模模型的后训练（post-training）**。它的定位很明确：不是又一个 PPO 教学实现，而是能跑在真实生产环境、面向 DeepSeek-V4、Kimi-K3 这类前沿模型的训练系统。

核心设计是「分工协作」：

- **Rollout 侧**：用 [SGLang](https://github.com/sgl-project/sglang) 做高吞吐推理，负责采样（生成轨迹）。
- **Training 侧**：用 [Megatron-LM](https://github.com/NVIDIA/Megatron-LM) 做可扩展训练，负责梯度更新。
- **可选的 PyTorch FSDP2 后端**：如果你只想直接训练 HuggingFace 原生实现，而不想引入 Megatron 的并行体系，Miles 也提供支持。

Miles 从 [slime](https://github.com/THUDM/slime) fork 而来，并整合了 SGLang、Megatron-LM 与 [torch_memory_saver](https://github.com/fzyzcjy/torch_memory_saver)。它的 slogan 很俏皮：*"A journey of a thousand miles begins with a single rollout."*

**核心特性速览：**

- 完全异步 RL（rollout 与 training worker 解耦，可配 on-/off-policy 调度）
- 快速 Agentic rollout（多轮 agent 任务，基于 router 分发）
- 秒级权重更新（P2P RDMA 快路径，万亿参数模型如 Kimi-K2.6 也能在环内秒达）
- 低精度训练（MXFP8、NVFP4、FP8、INT4 QAT、BF16、FP16）
- LoRA / multi-LoRA（少量 GPU 训前沿模型，adapter 直接回灌 SGLang）
- Token-in-token-out（TITO）消除 detokenize/retokenize 往返
- Rollout Routing Replay（R3）消除 MoE 路由错位
- 容错（SGLang 引擎挂了就地恢复，不重启不暂停）

## 二、技术原理

### 2.1 异步训练循环：rollout 与 training 解耦

Miles 最值得一读的是它的**异步驱动** `train_async.py`。与同步版 `train.py` 不同，异步驱动把「生成下一条轨迹」和「训练当前批次」重叠起来，用 `eager_create_task` 提前预热下一轮 rollout：

```python
# async train loop.
rollout_data_next_future = await eager_create_task(prepare_and_generate(args.start_rollout_id))
for rollout_id in range(args.start_rollout_id, args.num_rollout):
    # Sync the last generation
    if rollout_data_next_future is not None:
        rollout_data_curr_ref = await rollout_data_next_future

    # Start the next rollout early.
    if rollout_id + 1 < args.num_rollout:
        rollout_data_next_future = await eager_create_task(prepare_and_generate(rollout_id + 1))

    if args.use_critic:
        values = await critic_model.train(rollout_id, rollout_data_curr_ref)
        ...
    else:
        await actor_model.train(rollout_id, rollout_data_curr_ref)
    remove_rollout_data_refs(args, rollout_data_curr_ref)
```

关键点在第 8–11 行：在消费当前 rollout 数据的同时，早已把下一条轨迹的生成以 `asyncio.Task` 形式挂起。当训练 worker 算梯度时，SGLang 引擎在并行产出新样本——这就是「bubble 更少」的来源。同步版 `train.py` 则是串行 `prepare_rollout → get → train` 的朴素循环。

权重更新被刻意放到同步点之外：

```python
if (rollout_id + 1) % args.update_weights_interval == 0:
    # sync generate before update weights to prevent update weight in the middle of generation
    rollout_data_curr_ref = (await x) if (x := rollout_data_next_future) is not None else None
    rollout_data_next_future = None
    await update_weights(actor_model, rollout_executor, rollout_id=rollout_id)
```

注意那段注释：更新权重前必须先 `sync generate`，防止「生成进行到一半时权重被换掉」导致样本与策略不一致——这是异步 RL 正确性里最容易踩的坑。

### 2.2 权重秒级同步：P2P RDMA

`update_weights` 是 rollout 与 training 之间的桥梁。Miles 提供 P2P RDMA 作为 disaggregated 部署的快路径，让新权重在环内几秒到达推理引擎。对于万亿参数模型，传统「存盘→加载」式权重同步是不可接受的，P2P 点对点传输把延迟压到秒级。

### 2.3 正确性保障：TITO 与 R3

- **TITO（Token-in-token-out）**：rollout 与 training 之间全程 token 流转，不做 detokenize/retokenize 往返。对多轮 agent、黑盒 harness 都能用，避免 tokenizer 往返引入的精度损失。
- **R3（Rollout Routing Replay）**：rollout 阶段记录的 MoE 专家路由，在 trainer 的 forward 中**重放**，消除「推理路由」与「训练路由」不一致导致的训练不稳定。计算与通信 overlap，尽可能压低成本。

### 2.4 低精度与 LoRA

Miles 提供数值稳定的低精度 RL recipe，让 MXFP8 / NVFP4 训练不轻易发散；同时支持 LoRA / multi-LoRA，用少量 GPU 训前沿模型，训好的 adapter 直接加载回 SGLang 做 rollout。多 LoRA 由 `train_multi_lora_async.py` 驱动，内部 `MultiLoRAController` 通过 HTTP API 动态注册 / 退役 adapter。

### 2.5 支持的算法与硬件

- **算法**：GRPO、GSPO、PPO、REINFORCE++（RL），外加 SFT、on-policy distillation。
- **硬件**：NVIDIA GB300/GB200/B300/B200/H200/H100/A100；AMD MI300X/MI325/MI350/MI355X（ROCm）。
- **Day-0 模型**：DeepSeek-V4、Kimi-K3、GLM-5.2、Inkling、Nemotron 等发布即支持。

## 三、安装与快速开始

Miles 依赖 SGLang 与 Megatron-LM，推荐用官方容器镜像（每种 GPU 有对应镜像）。从 `requirements.txt` 可见依赖面很广：Ray 做分布式调度、sglang-router 做 rollout 分发、wandb / tensorboard 做追踪、polars 做采样回放编解码、safetensors 做 wire codec、torchft-nightly 做容错。

```bash
# 1. 拉取镜像并进入容器（以 NVIDIA 为例）
#    见 https://miles.radixark.com/docs/getting-started/installation

# 2. 安装 Python 包（>=3.10）
pip install -e .

# 3. 可选 extras
pip install -e ".[fsdp]"        # FSDP2 后端
pip install -e ".[dashboard]"   # FastAPI + Prometheus 仪表盘
pip install -e ".[e2b]"         # E2B sandbox 后端
```

`setup.py` 里 `python_requires=">=3.10"`，并声明了 `NVIDIA CUDA` 与 `Distributed Computing` 的 classifier，明确这是 GPU 分布式场景下的工具。

## 四、使用方法与实战

最简单的入口是同步驱动 `train.py`：

```bash
python train.py \
  --actor-model-path <hf_or_ckpt> \
  --rollout-engine sglang \
  --num-rollout 100 \
  --algorithm grpo \
  --save-interval 10
```

要榨干集群吞吐，用异步驱动：

```bash
python train_async.py \
  --fully-async \
  --actor-model-path <hf_or_ckpt> \
  --update-weights-interval 2 \
  --eval-interval 20
```

对于 coding / computer-use agent 的后训练，Miles 通过连接器接入 Harbor、HUD、NeMo Gym、OpenEnv、Verifiers 等环境，任务沙箱跑在 AgentENV、Daytona、E2B 或 Modal 上。多 LoRA 训练则：

```bash
python train_multi_lora_async.py \
  --multi-lora-n-adapters 4 \
  --multi-lora-adapters "math:/path/a.yaml" "code:/path/b.yaml" \
  --sglang-router-ip 10.0.0.1 --sglang-router-port 30000
```

训练过程中可挂 `api_server`（`--api-server-port`）实时查看，`mini_ft_controller` 负责小步容错微调，`check_weight_update_equal` 能比对训练/推理权重是否一致，是排查「训推不一致」的利器。

## 五、常见问题与解决方案

**Q1：异步训练训不稳 / 奖励不收敛**
先确认 `update_weights_interval` 与 on/off-policy 调度是否合理；Miles 默认把权重更新放在生成同步点之外，若你自定义了更新节奏，务必保证更新前 `sync generate`（见 2.1），否则样本与策略错位会直接拖垮收敛。

**Q2：训练权重与推理引擎对不上**
开启 `--check-weight_update_equal`，它会比对训练侧与 SGLang 侧权重（允许 `--check-weight-update-allow-quant-error` 容忍量化误差），并用 `--check-weight-update-skip-list` 跳过无需比对的层。

**Q3：MoE 大模型训练发散**
优先启用 R3（Rollout Routing Replay）——在 trainer forward 中重放 rollout 阶段记录的专家路由，消除路由错位。低精度训练建议沿用 Miles 配套的数值稳定 recipe。

**Q4：SGLang 引擎崩溃导致整个 run 重来**
Miles 内置容错：引擎挂掉后**就地恢复并继续**，不重启不暂停。若用 ROCm / AMD 卡，确认对应镜像与 `torchft-nightly` 版本匹配（`requirements.txt` 中 `torchft-nightly==2026.4.3` 为 Linux x86_64 限定）。

**Q5：显存峰值爆卡**
用 `--offload-train` / `--offload-rollout` 卸载，或 `--colocate-memory-peak-device gpu` 把峰值压到 GPU（注意它要求同时 offload train 与 rollout、不支持 critic、且只支持全参训练）。

## 六、总结

Miles 把「大规模 RL 后训练」这件事的工程复杂度拆成了清晰的几层：SGLang 扛 rollout、Megatron-LM 扛 training、异步循环扛吞吐、P2P RDMA 扛权重同步、TITO/R3 扛正确性。它不是给初学者练手的玩具，而是面向 DeepSeek-V4、Kimi 这种前沿模型、能在真实千卡集群上 day-0 跟进的生产框架。

如果你的场景是「对齐一个大模型」或「训一个 coding/computer-use agent」，Miles 值得作为 RL 后训练底座认真评估；如果只是想跑通一个 PPO demo，它偏重的依赖与分布式假设可能略显沉重。仓库地址：[radixark/miles](https://github.com/radixark/miles)，配套文档与实战 blog 都已齐全。
