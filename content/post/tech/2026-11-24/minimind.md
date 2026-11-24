---
title: "MiniMind：3 块钱、2 小时，从零训出你自己的 64M 大模型"
date: "2026-11-24T13:00:00+08:00"
description: "MiniMind 是一个用 PyTorch 原生实现的大语言模型全流程开源项目，仅需约 3 元算力成本、2 小时即可从零训练出 64M 参数的对话模型。本文拆解它的 Transformer/MoE 结构、Pretrain→SFT→RL 训练链路，并给出可复现的安装、训练与部署步骤。"
author: "Cheman"
slug: minimind
github_repo: jingyaogong/minimind
draft: false
tags: ["MiniMind", "LLM", "PyTorch", "从零训练", "开源", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MiniMind**（`jingyaogong/minimind`）。它想解决的问题很直接——不用 `transformers`、`trl`、`peft` 这些高度封装的训练框架，只用 PyTorch 原生算子，从零写出一个 64M 参数的语言模型，并把预训练、SFT、LoRA、DPO、PPO/GRPO/CISPO、Agentic RL、蒸馏的完整链路全部开源。按作者给出的实测口径，单张 3090 上跑完 1 个 epoch 约 2 小时、算力成本约 3 元人民币。

本文按项目结构、训练原理、安装复现、实战用法、常见坑的顺序完整过一遍，所有命令与参数均来自仓库 README 与源码，未做任何“美化”。

## 一、项目概述

MiniMind 由 GitHub 用户 `jingyaogong` 开源，采用 Apache-2.0 协议，主语言 Python。抓取时的元数据是：约 **69,626 star**、**9,093 fork**，默认分支 `master`，最新 release 标签为 `v2`，仓库仍在高频更新。项目的自我定位不是“又一个模型权重”，而是一套**可复现、可理解、可扩展的 LLM 教学与实验工程**。

它的规模有多小？README 给了一个直观对比：主线最小版本体积约为 GPT-3 的 **1/2700**。参数量 64M，意味着它能在消费级单卡上完整走完训练流程，而不是只能做推理或 LoRA 微调。

核心特性可以归纳为六条：

- **全流程从零实现**：Tokenizer 训练、Pretrain、SFT、LoRA、DPO、PPO/GRPO/CISPO、Tool Use、Agentic RL、自适应思考、白盒/黑盒蒸馏，全部有对应脚本。
- **不依赖高层封装**：核心算法用 PyTorch 原生代码写，注意力、RMSNorm、RoPE、MoE 路由、LoRA 低秩分支、GRPO 优势归一化都能逐行读。
- **结构对齐主流生态**：`minimind-3` 主线向 `Qwen3 / Qwen3-MoE` 靠拢，方便转换到 `transformers`、`llama.cpp`、`vllm`、`ollama`。
- **数据全开源**：预训练、SFT、DPO、RLAIF、Agentic RL 数据都给了下载地址，且已做清洗、去重与模板统一。
- **训练成本极低**：单卡 3090 上 `pretrain_t2t_mini` + `sft_t2t_mini` 一个 epoch 约 2.31 小时、约 3.0 元，可得到 `minimind-3 Zero` 对话模型。
- **可对外服务**：自带兼容 OpenAI API 协议的极简服务端与 Streamlit WebUI，支持 `reasoning_content`、`tool_calls`、`open_thinking`。

已发布模型覆盖多个尺寸，主线是 2026-04-01 的 `minimind-3`：

| 模型 | 参数量 | Release |
|------|--------|---------|
| minimind-3 | 64M | 2026.04.01 |
| minimind-3-moe | 198M-A64M | 2026.04.01 |
| minimind2-small | 26M | 2025.04.26 |
| minimind2-moe | 145M | 2025.04.26 |
| minimind2 | 104M | 2025.04.26 |
| minimind-v1-small | 26M | 2024.08.28 |
| minimind-v1-moe | 4×26M | 2024.09.17 |
| minimind-v1 | 108M | 2024.09.01 |

和多数“LLM 教程”相比，它最大的差异在于**不把训练包装成黑盒**。很多项目十几行代码就能完成“加载模型 + 加载数据 + 推理 + 强化学习”，效率很高，但读者看不到底层发生了什么；MiniMind 反过来，宁可代码长一点、慢一点，也要把每一步摊开。这也是它更适合作为入门教材而非生产框架的原因。

## 二、技术原理

### 2.1 整体结构

`minimind-3` 是标准的 Decoder-Only Transformer，数据流非常干净：

```text
文本
 └─> minimind_tokenizer (BPE + ByteLevel, vocab=6400)
      └─> Embedding (6400 × 768, 与 lm_head 权重共享)
           └─> 8 × MiniMindBlock
                ├─ RMSNorm (Pre-Norm)
                ├─ Self-Attention (GQA: 8 Q heads / 4 KV heads, head_dim=96)
                │    ├─ q_norm / k_norm (对每个 head 做 RMSNorm)
                │    └─ RoPE (+ YaRN 外推)
                └─ RMSNorm → FeedForward (SwiGLU)
                     └─ Dense: gate/up/down, intermediate=2432
                        或 MoE: 4 experts / top-1 routing
           └─> Final RMSNorm → lm_head → logits
```

关键配置如下（来自 `model/model_minimind.py` 的 `MiniMindConfig` 默认值与 README 参数表）：

| Model | params | vocab | max_pos | rope_theta | layers | d_model | kv_heads | q_heads |
|-------|--------|-------|---------|------------|--------|---------|----------|---------|
| minimind-3 | 64M | 6400 | 32768 | 1e6 | 8 | 768 | 4 | 8 |
| minimind-3-moe | 198M-A64M | 6400 | 32768 | 1e6 | 8 | 768 | 4 | 8 |

几个设计选择值得单独说：

**Pre-Norm + RMSNorm。** 每个子层先归一化再进残差，训练更稳定，是小模型少层数下的常规选择。RMSNorm 只做均方根缩放、不减均值，计算量比 LayerNorm 小。

**SwiGLU 前馈。** `down_proj(act(gate_proj(x)) * up_proj(x))`，三矩阵结构，在同等参数量下通常比 ReLU MLP 表现更好。默认 `intermediate_size = ceil(hidden_size * π / 64) * 64`，768 维下算出来是 2432。

**GQA + QK-Norm。** 8 个查询头、4 个 KV 头，`head_dim = 768 / 8 = 96`，推理时 KV Cache 只占 MHA 的一半。注意力前对 `q`、`k` 按 head 维度做 RMSNorm，这是 Qwen3 系列的做法，能缓解低精度训练时的数值爆炸。

**RoPE + YaRN。** `max_position_embeddings=32768`、`rope_theta=1e6`。开启 `inference_rope_scaling` 后走 YaRN：`original_max_position_embeddings=2048`、`factor=16`、`beta_fast=32`、`beta_slow=1`。实现上按频率维度做线性 ramp，对低频分量按 `1/factor` 压缩，从而在**不重新训练**的情况下把上下文扩到 2048 以上。

**权重共享。** `tie_word_embeddings=True`，输入 Embedding 和输出投影共用一份 6400×768 的矩阵。对 64M 这个量级，这一项能省下相当比例的参数量。

### 2.2 MoE 版本做了什么

`minimind-3-moe` 把 FFN 换成 `MOEFeedForward`：一个 `Linear(768, 4)` 的路由门控 + 4 个独立 SwiGLU 专家，每个 token 只激活 top-1。总参数 198M，激活参数约 64M。

实现里有两个细节：

- **top-1 的直通梯度**：当 `num_experts_per_tok=1` 时，前向权重被显式置为 1.0，用 `top1 - top1.detach() + 1.0` 让梯度仍然能回传到门控。这样单专家路由不会因为权重恒等而失去学习信号。
- **负载均衡辅助损失**：`load = one_hot(topk_idx).mean(0)`，与平均门控概率相乘后乘以 `num_experts * router_aux_loss_coef`（默认 `5e-4`），避免所有 token 挤到同一个专家。

README 也坦白了 MoE 的代价：原生 PyTorch 实现下，token 要先按专家分桶、再分别 forward，kernel 启停与调度开销很重，`4 experts / top-1` 这个“甜点配置”大约比同尺寸 dense 慢 **50%**。这与“MoE 推理更快”的直觉相反，但在没有 fused kernel 的教学实现里是合理的折中。

### 2.3 训练链路

项目把 LLM 的一生拆成了可独立运行的阶段：

```text
Tokenizer 训练
   ↓
Pretrain（next token prediction，学语言规律与世界知识）
   ↓
Full SFT（多轮对话 + 思考标签 + Tool Call 混合）
   ├─> LoRA（垂域 / 自我认知，低成本适配）
   ├─> DPO（离线偏好对齐，chosen vs rejected）
   └─> RLAIF（在线采样）
        ├─> PPO（Actor + Critic + GAE）
        ├─> GRPO（组内相对优势，去掉 Critic）
        ├─> CISPO（ratio 裁剪但保留梯度路径）
        └─> Agentic RL（多轮 Tool-Use，延迟奖励）
   ↓
蒸馏（黑盒 CE / 白盒 CE + KL）
```

README 用统一视角解释了这些 PO 算法：它们都在优化

$$\mathcal{J}_{PO} = \mathbb{E}\left[\Phi(r_t, A_t) - h(\mathrm{KL}_t)\right]$$

差别只在三个组件怎么定义：

| 算法 | 策略项 | 优势项 | 正则项 | 模型数 |
|------|--------|--------|--------|--------|
| DPO | $\log r_w - \log r_l$ | 无显式优势 | 隐含在 β | 1（前向 2） |
| PPO | $\min(r_t A_t,\ \mathrm{clip}(r_t) A_t)$ | Critic / GAE | β·KL | 2 |
| GRPO | 同上 | 组内归一化 $(R-\mu)/\sigma$ | β·KL | 1 |
| CISPO | $\mathrm{clip}(r,0,\varepsilon)\cdot A_t\cdot\log\pi$ | 组内归一化 | β·KL | 1 |

这个视角比逐个背公式有用得多：DPO 是离线偏好对比，PPO 是在线 + Critic，GRPO 用组内均值替代 Critic，CISPO 则修掉了 PPO/GRPO 里“ratio 被裁剪后梯度直接断掉”的问题——ratio 只作为裁剪后的权重，`log π` 仍然保留梯度路径。

### 2.4 模板与数据格式

`minimind-3` 把“是否显式思考”和“是否调用工具”下沉到了 `chat_template` 层，而不是单独训一个 reason 模型：

- `open_thinking=0`：注入空的 `<think>\n\n</think>`，模型倾向直接回答；
- `open_thinking=1`：预填 `<think>` 起始标签，模型继续输出思考过程；
- Tool Call 统一展开为 `<tool_call>{"name": ..., "arguments": {...}}</tool_call>` 与 `<tool_response>{...}</tool_response>`。

SFT 数据是标准 JSONL，一条多轮对话长这样：

```jsonl
{"conversations": [
  {"role": "user", "content": "你好"},
  {"role": "assistant", "content": "你好！"}
]}
```

带工具的样本把 `tools` 挂在 `system` 消息上，`tool_calls` 挂在 `assistant` 消息上：

```jsonl
{"conversations": [
  {"role": "system", "content": "# Tools ...", "tools": "[...]"},
  {"role": "user", "content": "帮我算一下 256 乘以 37 等于多少"},
  {"role": "assistant", "content": "", "tool_calls": "[{\"name\":\"calculate_math\",\"arguments\":{\"expression\":\"256 * 37\"}}]"},
  {"role": "tool", "content": "{\"result\":\"9472\"}"},
  {"role": "assistant", "content": "256 乘以 37 等于 9472。"}
]}
```

预训练数据则简单到只有一行 `text`：

```jsonl
{"text": "Transformer 通过自注意力机制建模上下文关系，是现代大语言模型的重要基础结构。"}
```

这种“统一成 jsonl、免预处理”的取舍牺牲了一点训练速度（README 提到 2024-09-27 曾为此放弃 `.bin` 预处理），换来的是数据替换成本极低——想换领域，只要按同样格式准备文件即可。

## 三、安装与快速开始

### 3.1 环境要求

作者的参考环境是：Ubuntu 20.04、CUDA 12.2、Python 3.10.16、NVIDIA RTX 3090 (24GB) × 8、128GB 内存。单卡 3090 足以跑完主线的小数据组合；没有 CUDA 时也可以退到 CPU 或 MPS，但训练速度会差很多。

先确认 PyTorch 能用 GPU：

```python
import torch
print(torch.cuda.is_available())
```

如果输出 `False`，需要按 [torch_stable](https://download.pytorch.org/whl/torch_stable.html) 选对应 CUDA 版本重装，而不是硬着头皮往下跑。

### 3.2 克隆与安装依赖

```bash
git clone --depth 1 https://github.com/jingyaogong/minimind
cd minimind && pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple
```

### 3.3 只做推理：三步跑通

下载官方权重（两种方式选其一，都在项目根目录执行）：

```bash
# 方式1：ModelScope
modelscope download --model gongjy/minimind-3 --local_dir ./minimind-3

# 方式2：HuggingFace
git clone https://huggingface.co/jingyaogong/minimind-3
```

命令行推理：

```bash
# Transformers 格式
python eval_llm.py --load_from ./minimind-3

# 或原生 PyTorch 权重（确保 ./out 下有对应文件）
python eval_llm.py --load_from ./model --weight full_sft
```

启动后是交互式问答，输入问题即出结果。README 里给了一段 Zero 模型的样例输出，可以看到基础对话能力已经具备，但事实性仍然有限——这是 64M 参数 + 2 小时训练的合理预期。

想要网页界面：

```bash
# 需 python>=3.10，且 pip install streamlit
# 必须先把 transformers 格式模型目录复制到 ./scripts/ 下
cp -r minimind-3 ./scripts/minimind-3
cd scripts && streamlit run web_demo.py
```

脚本会自动扫描 `./scripts/` 下包含权重文件的子目录，找不到就报错，这是最常见的 WebUI 启动失败原因。

### 3.4 从零训练：最小复现路径

先从 [ModelScope](https://www.modelscope.cn/datasets/gongjy/minimind_dataset/files) 或 [HuggingFace](https://huggingface.co/datasets/jingyaogong/minimind_dataset/tree/main) 下载数据，放进 `./dataset`。最快复现只需要两个文件：

```text
./dataset/
├── pretrain_t2t_mini.jsonl   (1.2GB)
└── sft_t2t_mini.jsonl        (1.6GB)
```

然后依次跑预训练和指令微调（**必须在 `trainer` 目录下执行**，脚本默认数据路径是 `../dataset/...`）：

```bash
cd trainer && python train_pretrain.py
cd trainer && python train_full_sft.py
```

权重默认落在 `../out/`，命名分别是 `pretrain_768.pth` 和 `full_sft_768.pth`（`768` 是 hidden_size）。测试自己训出来的模型：

```bash
python eval_llm.py --weight full_sft
```

按 README 的单卡 3090 估算，这两步合计约 **2.31 小时、3.0 元**，产出就是 `minimind-3 Zero`。想要更好的效果，把 `pretrain_t2t.jsonl`（10GB）和 `sft_t2t.jsonl`（14GB）换上即可，但训练时间会显著上升。

## 四、使用方法与实战

### 4.1 用 LoRA 做垂域适配

全参微调对 64M 模型并不贵，但如果只想注入一小块能力（医疗问答、自我认知），LoRA 更省事。准备 `./dataset/lora_xxx.jsonl`，格式与 SFT 一致：

```jsonl
{"conversations": [{"role": "user", "content": "你叫什么名字？"}, {"role": "assistant", "content": "您好，我名叫 MiniMind，是由 Jingyao Gong 开发的人工智能助手。"}]}
```

训练与推理：

```bash
cd trainer && python train_lora.py

# 注意：--weight 必须与训练时使用的基础模型一致
python eval_llm.py --weight full_sft --lora_weight lora_identity
```

LoRA 分支是手写的，不依赖 `peft`。训练完可以用 `scripts/convert_model.py` 里的 `convert_merge_base_lora` 把基座与 LoRA 权重合并成一份完整模型：

```bash
cd scripts && python convert_model.py
```

合并后再导出成 Transformers 格式，就能直接喂给 `vllm` 或 `ollama`，不必每次加载两份权重。

### 4.2 验证 Tool Call 能力

`toolcall` 数据已经混进 `sft_t2t` 主线，默认 `full_sft` 就具备基础调用能力，不需要额外训一轮。验证脚本：

```bash
python eval_toolcall.py --weight full_sft
```

预期输出形态（来自 README 示例）：

```text
💬: 现在几点了？
🧠: <tool_call>{"name": "get_current_time", "arguments": {"timezone": "Asia/Shanghai"}}</tool_call>
📞 [Tool Calling]: get_current_time
✅ [Tool Called]: {"datetime": "2026-03-15 17:18:22", "timezone": "Asia/Shanghai"}
🧠: 现在是2026年3月15日17时18分22秒。
```

需要提醒的是，这批工具数据主要由 `qwen3-4b` 采样约 10 万条构成，覆盖约 10 个模拟工具（时间、数学、天气等），**泛化能力有限**。它证明的是“模型学会了调用格式与决策流程”，不是“能操作任意 API”。

### 4.3 起一个 OpenAI 兼容服务

```bash
cd scripts && python serve_openai_api.py --load_from ../minimind-3
```

脚本的 `--load_from` 默认是 `../model`（原生 PyTorch 权重），指向其他路径时按 Transformers 格式加载，所以这里直接传下载好的模型目录。默认监听 `0.0.0.0:8998`，还支持 `--weight`、`--lora_weight`、`--max_seq_len`（默认 8192）、`--use_moe`、`--inference_rope_scaling` 等参数。客户端按标准 OpenAI SDK 调用：

```python
from openai import OpenAI

client = OpenAI(api_key="sk-123", base_url="http://localhost:8998/v1")

resp = client.chat.completions.create(
    model="minimind",
    messages=[{"role": "user", "content": "你是谁？"}],
    extra_body={"chat_template_kwargs": {"open_thinking": True}},
)
print(resp.choices[0].message.content)
```

`extra_body` 里的 `open_thinking` 就是思考开关；返回体里会带 `reasoning_content` 与 `tool_calls` 字段。这样可以直接接 FastGPT、Open-WebUI 这类只认 OpenAI 协议的 Chat UI。

### 4.4 多卡、续训与可视化

有 N 张卡时用 `torchrun` 启动 DDP：

```bash
torchrun --nproc_per_node N train_xxx.py
```

训练中断是常态，所有脚本都支持检查点续训：

```bash
python train_full_sft.py --from_resume 1
```

检查点保存在 `./checkpoints/`，命名形如 `full_sft_512_resume.pth`，包含模型、优化器与训练进度，支持跨不同 GPU 数量恢复，也会自动接上同一个 wandb run。

可视化方面，2025 年 6 月后国内网络通常无法直连 WandB，项目默认转向 [SwanLab](https://swanlab.cn/)，接口基本兼容——多数情况下把 `import wandb` 换成 `import swanlab as wandb` 即可。

### 4.5 关键训练参数

以 `train_pretrain.py` 与 `train_full_sft.py` 的 argparse 定义为准，常用的几个：

| 参数 | pretrain 默认 | SFT 默认 | 说明 |
|------|---------------|----------|------|
| `--epochs` | 2 | 2 | 训练轮数 |
| `--batch_size` | 32 | 16 | 单卡 batch size |
| `--learning_rate` | 5e-4 | 1e-5 | 初始学习率 |
| `--max_seq_len` | 340 | 768 | 最大截断长度（token） |
| `--accumulation_steps` | 8 | 1 | 梯度累积步数 |
| `--save_interval` | 1000 | 1000 | 权重保存间隔（步） |
| `--use_moe` | 0 | 0 | 是否启用 MoE |
| `--data_path` | `../dataset/pretrain_t2t_mini.jsonl` | `../dataset/sft_t2t_mini.jsonl` | 数据路径 |
| `--from_weight` | `none` | `pretrain` | 基于哪个权重继续 |
| `--from_resume` | 0 | 0 | 是否自动续训 |
| `--use_compile` | 0 | 0 | 是否 `torch.compile` 加速 |

`max_seq_len` 指的是 token 数，不是字符数。项目 tokenizer 在中文上大约 1.5~1.7 字符/token，英文 4~5 字符/token，换算时别搞混。README 建议 `pretrain_t2t_mini` 用 768 左右、`pretrain_t2t` 用 380 左右，本质是在 padding 浪费与语义截断之间找平衡。

### 4.6 一个端到端场景：给自己训一个"能查时间"的小助手

把上面的步骤串起来，一条可执行的路径是：

1. 下载 `pretrain_t2t_mini.jsonl` 与 `sft_t2t_mini.jsonl` 到 `./dataset`；
2. `cd trainer && python train_pretrain.py`，得到 `pretrain_768.pth`；
3. `python train_full_sft.py`，得到 `full_sft_768.pth`；
4. `python eval_toolcall.py --weight full_sft` 验证工具调用是否成型；
5. `cd scripts && python serve_openai_api.py --load_from ../minimind-3` 起服务，接进自己的前端或 IM 机器人。

如果希望它在特定工具上更稳，可以基于 `agent_rl.jsonl` 跑一轮 `train_agent.py`：

```bash
python train_agent.py
```

这个脚本支持多轮 rollout 与延迟奖励，reward 由「答案命中 + 工具合法性 + 格式闭合 + Reward Model 分数 - 未完成惩罚」联合构成。README 给出了 20 道数学 ToolUse 题的对比：`full_sft` 12/20（60%），`agent` 17/20（85%）。同一份材料也明确说了代价——agent 权重在开放问答上的事实性与稳定性会下降，这是典型的“对齐税”。

## 五、常见问题与解决方案

**现象：`torch.cuda.is_available()` 返回 False。**
原因：安装的 PyTorch 是 CPU 版，或 CUDA 版本与驱动不匹配。
解决：按 [torch_stable](https://download.pytorch.org/whl/torch_stable.html) 对照 CUDA 版本重装；确认无误后再跑训练脚本，否则会静默退回 CPU，慢到无法接受。

**现象：`streamlit run web_demo.py` 启动后报错找不到模型。**
原因：`web_demo.py` 只扫描 `./scripts/` 下包含权重文件的子目录，不会去项目根目录找。
解决：先把 Transformers 格式模型复制过去，例如 `cp -r minimind-3 ./scripts/minimind-3`，再在 `scripts` 目录内启动。

**现象：训练一开始就报数据文件不存在。**
原因：脚本默认 `data_path` 是相对路径 `../dataset/...`，在项目根目录执行会解析错。
解决：先 `cd trainer` 再执行；或显式传 `--data_path /abs/path/to/xxx.jsonl`。

**现象：显存 OOM。**
原因：`batch_size` 与 `max_seq_len` 组合超出显存，SFT 默认 768 长度比 pretrain 的 340 更吃显存。
解决：优先降 `batch_size`，再用 `--accumulation_steps` 补回等效批量；其次降 `max_seq_len`；确认 `--dtype bfloat16`（默认值）未被改成 fp32。24GB 的 3090 跑 mini 组合是够的，跑 14GB 的完整 SFT 数据才需要更谨慎。

**现象：训练到一半断电/被抢占，进度全丢。**
原因：没有开启检查点恢复。
解决：加 `--from_resume 1`，脚本会从 `./checkpoints/<权重名>_<维度>_resume.pth` 恢复模型、优化器与步数，并支持跨 GPU 数量继续。

**现象：`--use_wandb` 卡住或超时。**
原因：2025 年 6 月后国内网络通常无法直连 WandB。
解决：改用 SwanLab，把 `import wandb` 替换为 `import swanlab as wandb`，其余调用基本不用改。

**现象：同时开 Tool Call 和 `open_thinking=1`，模型不输出思考过程。**
原因：README 明确说明，当前训练数据缺少“reasoning 与 tool call 同时存在”的联合蒸馏样本，模型还没学会两种能力协同。
解决：这是已知的能力边界，不是配置错误。需要的话得自己构造联合样本做增量 SFT，而不是调参。

**现象：MoE 版本训练比 dense 还慢。**
原因：原生 PyTorch 实现按专家分桶再 forward，kernel 启停与调度开销大；`4 experts / top-1` 约比 dense 慢 50%。
解决：这是教学实现的固有折中。要提速得换 fused MoE 算子（Triton 自定义 kernel、DeepSpeed-MoE、Megatron-LM 等），但那会牺牲“纯原生、可读”的定位。

**现象：加载 2025-04-26 之前的旧权重报错。**
原因：该版本为兼容 `llama.cpp`/`vllm` 重构了参数命名与位置编码，旧模型不能直接加载；`minimind-v1` 全系列已下线。
解决：使用对应历史 commit 的代码，或直接换用 `minimind-3` 的新权重。README 说明旧模型经过权重映射 + QKVO 校准微调才恢复到新结构，自己手工映射成本很高。

**现象：LoRA 推理效果异常。**
原因：`--weight` 指定的基础模型与 `train_lora.py` 训练时用的不一致，或 `--lora_rank` 与训练时不同。
解决：保持 `--weight full_sft`（或训练时实际用的权重）与 `--lora_rank`（默认 16）一致，再加载 `--lora_weight`。

## 六、总结

MiniMind 的价值不在“能打榜”，而在**把 LLM 的每一层都摊开给你看**。64M 参数、8 层、768 维、6400 词表，单卡 3090 两小时、三块钱就能完整走一遍 Pretrain → SFT → RL，这个门槛低到足以让任何有显卡的人亲手做一次“从 0 到 1”。

它适合三类人：想理解 Transformer 与 RL 后训练细节的学生、需要一套可改可调试教学代码的讲师、以及想在自己的小数据集上快速验证想法（比如垂域 LoRA、Tool Use 数据配比）的工程师。它不适合指望开箱即用做生产问答的人——64M 的事实性与泛化能力有限，README 自己也如实展示了幻觉与重复问题。

几个值得继续关注的方向：`minimind-3` 已把结构对齐到 Qwen3 生态，转换到 `llama.cpp`/`vllm`/`ollama` 的路径是通的；Agentic RL 的 rollout 解耦（支持 sglang 作为生成后端）已经把“训推分离”的最小骨架搭起来；此外还有视觉分支 MiniMind-V、多模态 MiniMind-O、扩散语言模型 dLM 与线性注意力版本在 Discussion 里推进。

项目地址：<https://github.com/jingyaogong/minimind>
