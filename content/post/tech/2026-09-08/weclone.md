---
title: "WeClone：用聊天记录微调 LLM，打造你的专属数字分身"
date: 2026-09-08T15:04:00+08:00
description: "WeClone 是一款开源的端到端数字分身解决方案，支持从 Telegram、微信等平台导出聊天记录，通过 LoRA 微调 Qwen2.5-VL 等大模型，部署到 Telegram、Discord 等聊天机器人，让你用真实对话数据训练出 speaking style 和你一模一样的 AI 分身。"
author: "Cheman"
draft: false
tags: ["WeClone", "LLM微调", "数字分身", "LoRA", "开源项目", "GitHub Trending"]
categories: ["AI", "开源项目"]
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

今天在 GitHub Trending 上看到一个非常有意思的项目：**WeClone**，它能用你自己的聊天记录微调大语言模型，打造一个说话风格和你一模一样的数字分身，18k+ Star 足以说明社区对这方向的热情。

## 一、项目概述

WeClone 是一个一站式数字分身解决方案，覆盖了从聊天数据导出、预处理、模型微调到部署上线的完整闭环。简单来说，你把和某人的聊天记录喂给它，它就能训练出一个"模仿那个人说话方式"的 AI 模型，然后部署到 Telegram、Discord 等聊天平台上。

核心特性包括：

- **端到端流程**：数据导出 → 预处理 → 模型训练 → 推理部署，一条龙搞定
- **多模态支持**：不仅支持文本对话，还能处理图片模态数据
- **隐私过滤**：内置 Microsoft Presidio 自动脱敏，去除电话号码、邮箱、IP 地址等敏感信息
- **多平台部署**：支持 Telegram、Discord、Slack，微信个人号也通过 openclaw-weixin 支持
- **本地化训练**：所有数据和模型都在本地，不会泄露

## 二、技术原理

### 技术栈选型

WeClone 的技术选型相当成熟和务实：

| 组件 | 选型 | 理由 |
|------|------|------|
| 基座模型 | Qwen2.5-VL-7B-Instruct | 支持视觉+语言多模态，中文能力强 |
| 微调框架 | LLaMA Factory | 成熟的 LoRA/SFT 训练框架，支持模型丰富 |
| 推理引擎 | vLLM | 高吞吐量推理，适合聊天场景 |
| 隐私脱敏 | Microsoft Presidio | 工业级 PII 检测与匿名化 |
| 环境管理 | uv | 极速 Python 包管理器 |
| 配置管理 | pyjson5 + omegaconf | 支持 JSONC 格式，注释友好 |

### LoRA 微调策略

WeClone 默认使用 LoRA（Low-Rank Adaptation）方法进行 SFT（Supervised Fine-Tuning），这是一种参数高效微调技术：

- **原理**：冻结原始模型权重，在旁路注入低秩矩阵进行训练
- **优势**：显存占用大幅降低，7B 模型仅需 16GB VRAM
- **灵活性**：支持切换到 QLoRA 进一步压缩到 6GB 甚至 4GB VRAM

从 `pyproject.toml` 可以看到关键依赖：

```toml
dependencies = [
  "llamafactory==0.9.4",        # 训练框架
  "vllm==0.10.0",                # 推理引擎（仅 Linux）
  "torch==2.7.1+cu126",          # PyTorch with CUDA 12.6
  "transformers==4.53.2",        # 模型加载
  "accelerate==1.7.0",           # 分布式训练加速
  "presidio_analyzer[transformers]", # 隐私脱敏
  "presidio_anonymizer",
]
```

### 数据处理流水线

数据处理是整个项目的核心环节，流程如下：

1. **数据导出**：从 Telegram Desktop 导出 JSON 格式聊天记录（含图片）
2. **数据清洗**：使用 Presidio 自动识别并去除 PII 信息
3. **格式转换**：将聊天记录转换为 instruction-response 格式的训练数据
4. **质量控制**：通过 `make_dataset_args` 配置筛选策略

项目提供了 `weclone-cli` 命令行工具统一管理整个流程：

```bash
# 数据预处理
weclone-cli make-dataset

# 单卡训练
weclone-cli train-sft

# 多卡训练（DeepSpeed）
deepspeed --num_gpus=4 weclone/train/train_sft.py

# 启动推理 API
weclone-cli server

# Web Demo 测试
weclone-cli webchat-demo
```

### 显存需求参考

| 方法 | 精度 | 7B | 14B | 70B |
|------|------|-----|------|------|
| Full (bf16) | 16bit | 60GB | 120GB | 600GB |
| LoRA | 16bit | 16GB | 32GB | 160GB |
| QLoRA | 4bit | 6GB | 12GB | 48GB |
| QLoRA | 2bit | 4GB | 8GB | 24GB |

> 项目作者建议：7B 模型效果一般，14B 以上参数才能呈现较好的分身效果。

## 三、安装与快速开始

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/xming521/WeClone.git && cd WeClone

# 使用 uv 创建虚拟环境（需要 Python 3.12）
uv venv .venv --python=3.12
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
uv pip install --group main -e .

# 复制配置模板
cp examples/tg.template.jsonc settings.jsonc
```

### 下载模型

```bash
git lfs install
git clone https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct models/Qwen2.5-VL-7B-Instruct
```

### 准备数据

1. 打开 Telegram Desktop → 进入聊天 → 右上角菜单 → Export chat history
2. 格式选择 JSON，消息类型勾选 Photos
3. 将导出的 `ChatExport_*` 文件夹放入 `./dataset/telegram` 目录

### 训练与部署

```bash
# 处理数据
weclone-cli make-dataset

# 开始微调
weclone-cli train-sft

# 启动推理服务
weclone-cli server

# 测试效果
weclone-cli test-model
```

## 四、部署到聊天机器人

### 通过 AstrBot 部署

AstrBot 是一个多平台 LLM 聊天机器人框架，支持 Discord、Telegram、Slack 等平台：

1. 部署 AstrBot 并配置消息平台
2. 运行 `weclone-cli server` 启动 API
3. 在 AstrBot 中添加 OpenAI 类型服务提供者
4. API Base URL 填写 WeClone 地址（如 `http://172.17.0.1:8005/v1`）
5. 模型名填 `gpt-3.5-turbo`，API Key 任意填写
6. 关闭所有工具插件（`/tool off_all`），否则微调效果不可见

### 通过 LangBot 部署

LangBot 是另一个开源 LLM 聊天机器人平台，连接流程类似：

1. 部署 LangBot
2. 添加机器人（支持 Discord、Telegram、Slack、飞书）
3. 启动 WeClone API 服务
4. 在 LangBot 模型页面添加 OpenAI 类型模型，请求 URL 指向 WeClone

## 五、常见问题与解决方案

### Q: 训练效果不好，分身不像本人？

模型效果取决于三个因素：
- **模型大小**：7B 效果一般，建议使用 14B 以上
- **数据量**：聊天记录太少会导致过拟合或学不到风格
- **数据质量**：确保导出的对话有足够的多轮交互

### Q: Windows 环境无法运行？

项目未在 Windows 上严格测试，建议使用 WSL 作为运行环境。vLLM 仅支持 Linux，Windows 上推理部分可能不可用。

### Q: VRAM 不够怎么办？

切换到 QLoRA 方式，4bit 量化下 7B 模型仅需 6GB VRAM：

```jsonc
// settings.jsonc 中修改
"quantization_bit": 4
```

### Q: 如何保护隐私安全？

- 项目默认使用 Presidio 自动去除电话、邮箱、IP 等 PII 信息
- `settings.jsonc` 中的 `blocked_words` 可手动添加需要过滤的词
- 所有训练和推理都在本地进行，数据不上传

### Q: 支持微信聊天记录吗？

当前版本主要支持 Telegram 数据源。微信个人号可通过 openclaw-weixin 部署，但数据导出部分仍在完善中。WhatsApp、Discord、Slack 数据源标记为"开发中"。

## 六、总结

WeClone 做了一件很有想象力的事——把"数字永生"这个概念变成了可操作的开源工具。从技术角度看，它巧妙地组合了 LLaMA Factory 的训练能力、vLLM 的推理性能、Presidio 的隐私保护，形成了一个完整且可复现的流水线。

项目仍有明显的发展空间：数据源平台覆盖不足（仅 Telegram 完全可用）、7B 模型效果有限、Windows 支持缺失。但 18k+ Star 和活跃的社区迭代速度说明这个方向击中了很多人的真实需求——谁不想拥有一个"说话像自己"的 AI 分身呢？

如果你有 GPU 和足够的聊天数据，WeClone 值得一试。只需几行命令，你就能训练出一个"懂你"的 AI。
