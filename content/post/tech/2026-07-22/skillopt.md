---
title: "SkillOpt：用训练神经网络的思路优化 Agent 技能文档"
date: 2026-07-22
description: "微软开源的 SkillOpt 框架，将神经网络训练中的 epoch、batch、学习率、验证集等概念引入 Agent 技能文档优化，实现了在冻结模型权重的情况下持续提升 Agent 表现。"
author: "Cheman"
slug: skillopt
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "SkillOpt", "Agent", "技能优化", "微软", "LLM"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**SkillOpt**，微软开源的 Agent 技能优化框架，核心创新在于将神经网络训练的经典范式（epoch、batch、learning rate、validation gate）迁移到技能文档优化上，在不修改模型权重的前提下实现 Agent 能力的持续进化。

## 一、项目概述

SkillOpt 是微软研究院推出的 Agent 技能自进化框架。它的核心思想是将**技能文档视为可训练的状态**，通过结构化的训练循环（rollout → reflect → aggregate → select → update → evaluate）持续优化，就像训练神经网络一样——但全程不动模型权重。

### 解决的问题

传统 Agent 技能构建方式存在三大痛点：

1. **手工编写**：依赖专家经验，难以规模化，更新成本高
2. **一次性生成**：强 LLM 生成后不再迭代，无法从反馈中学习
3. **无约束自修订**：缺乏验证机制，容易退化而非进化

SkillOpt 用**可复现的优化流程**替代这些随意的方法，通过独立的优化器模型将评分的 rollouts 转化为对技能文档的有界编辑（add / delete / replace），并默认要求候选编辑必须在 held-out 验证集上严格提升分数才会被接受。

### 核心特性

- **类 NN 训练流程**：epoch、mini-batch、文本学习率预算、验证门控
- **零推理时开销**：最终产物是紧凑的 `best_skill.md`（通常 300-2000 tokens），部署时不增加额外模型调用
- **多后端支持**：OpenAI / Azure / Claude / Qwen / MiniMax，以及 Codex CLI、Claude Code CLI、Cursor 等执行环境
- **六个内置基准测试**：覆盖不同类型的 Agent 任务
- **WebUI 监控面板**：可选的 Gradio 可视化界面

### 实验成果

在 **52 个（模型 × 基准 × 执行环境）评估单元**中，SkillOpt 在**全部 52 个单元上都是最佳或并列最佳**。以 GPT-5.5 为例，相比无技能基线，平均准确率提升：

- 直接对话模式：**+23.5 分**
- Codex agentic loop 内：**+24.8 分**
- Claude Code 内：**+19.1 分**

优化后的技能文档还能跨模型规模迁移、跨执行环境迁移（Codex ↔ Claude Code）、跨相近基准迁移，无需重新优化。

## 二、技术原理

### 架构设计

SkillOpt 的核心是三层解耦：

```
┌─────────────────────────────────────────────────────┐
│                  Optimizer Model                    │
│    (独立模型，负责分析 rollouts 生成技能编辑)         │
└────────────────────┬────────────────────────────────┘
                     │ edits (add/delete/replace)
                     ▼
┌─────────────────────────────────────────────────────┐
│              Skill Document (可训练状态)             │
│    单个 Markdown 文件，300-2000 tokens              │
└────────────────────┬────────────────────────────────┘
                     │ read by
                     ▼
┌─────────────────────────────────────────────────────┐
│              Target Model (冻结权重)                 │
│    OpenAI/Claude/Qwen 等，推理时不调用优化器         │
└─────────────────────────────────────────────────────┘
```

### 训练循环详解

一次完整的训练迭代包含六个阶段：

```python
# 伪代码示意
for epoch in range(max_epochs):
    # 1. Rollout: 用当前技能在任务集上执行
    rollouts = execute_with_skill(skill_md, tasks)
    
    # 2. Reflect: 对每个 rollout 生成反思分析
    reflections = optimizer.reflect(rollouts)
    
    # 3. Aggregate: 聚合多个反思为编辑提案
    edits = optimizer.aggregate(reflections)
    
    # 4. Select: 验证门控筛选
    for edit in edits:
        candidate = apply_edit(skill_md, edit)
        if validate_on_heldout(candidate):
            skill_md = candidate  # 仅当验证集分数严格提升时接受
    
    # 5. Update: 更新拒绝缓冲区、学习率预算等
    update_rejection_buffer(rejected_edits)
    decay_textual_lr()
    
    # 6. Evaluate: 在验证集评估最终分数
    score = evaluate(skill_md, val_set)
```

### 关键机制

**1. 文本学习率预算**

不是数值学习率，而是对技能文档修改幅度的约束。例如"每次修改不超过 50 个 token"，防止剧烈震荡：

```yaml
# 配置示例
textual_lr:
  max_tokens_per_edit: 50
  decay_rate: 0.9  # 每个 epoch 衰减
```

**2. 拒绝编辑缓冲区**

被验证门控拒绝的编辑会被记录，后续聚合时会参考这些"失败经验"避免重复：

```python
# skillopt/optimizer/buffer.py (简化示意)
class RejectionBuffer:
    def __init__(self, max_size: int = 100):
        self.buffer = []
    
    def add(self, edit: Edit, reason: str):
        self.buffer.append((edit, reason, time.time()))
    
    def get_similar_rejections(self, edit: Edit) -> List[str]:
        # 基于语义相似度检索历史拒绝
        return [r for (e, r, _) in self.buffer 
                if similarity(e, edit) > threshold]
```

**3. 验证门控（Validation Gate）**

这是 SkillOpt 区别于无约束自修订的关键。每个候选编辑必须在一个 held-out 验证集上证明其价值：

```python
def validate_on_heldout(candidate_skill: str) -> bool:
    # 在验证集上执行（不用于训练）
    val_rollouts = execute_with_skill(
        candidate_skill, 
        validation_tasks  # held-out
    )
    new_score = compute_score(val_rollouts)
    
    # 严格提升才接受
    return new_score > current_best_score
```

**4. Epoch-wise 慢速/元更新**

类似深度学习中的 learning rate warmup 和 cosine decay，SkillOpt 在 epoch 层面控制更新节奏：

- 前期：较激进的探索
- 中期：收敛
- 后期：仅做微调

### 数据流分析

```
原始任务集
    │
    ├─► 训练集 (70%) ─► Rollout ─► Reflect ─► Aggregate ─► Edits
    │                                                      │
    │                                                      ▼
    │                                              Validation Gate
    │                                                      │
    └─► 验证集 (30%) ◄────────────────────────────────────┘
                                    │
                                    ▼
                           接受/拒绝决策
                                    │
                                    ▼
                           更新 best_skill.md
```

### SkillOpt-Sleep：夜间离线自进化

v0.2.0 新增的 `skillopt-sleep` CLI 实现了"睡眠进化"模式：

```bash
skillopt-sleep \
    --history-dir ~/.claude/sessions \
    --skill-out ./evolved_skill.md \
    --validator bench:searchqa
```

流程：

1. **Harvest**：从历史会话中提取任务-结果对
2. **Mine**：识别高频失败模式
3. **Replay**：在优化器中重放
4. **Consolidate**：通过验证门控的编辑合并到技能文档

这让本地编码 Agent（Claude Code / Codex / Copilot）能在夜间自主进化技能。

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- 已配置目标模型 API Key（OpenAI / Azure / Claude 等）

### 安装

```bash
pip install skillopt
```

可选依赖：

```bash
# Claude 后端
pip install "skillopt[claude]"

# WebUI 监控面板
pip install "skillopt[webui]"

# 完整安装
pip install "skillopt[all]"
```

### 最简运行示例

**1. 准备配置文件**

```yaml
# config.yaml
model:
  backend: openai_chat
  name: gpt-4.1

optimizer:
  backend: openai_chat
  name: gpt-4.1

benchmark: searchqa

training:
  epochs: 5
  batch_size: 10
  textual_lr: 50  # 每次编辑最多 50 tokens
```

**2. 启动训练**

```bash
skillopt-train --config config.yaml
```

**3. 评估结果**

```bash
skillopt-eval \
    --skill ./outputs/best_skill.md \
    --benchmark searchqa \
    --model gpt-4.1
```

训练完成后，`best_skill.md` 就是优化后的技能文档，可以直接用于生产环境。

## 四、使用方法与实战

### 基础用法：训练自定义技能

假设你想为某个特定任务优化技能：

```bash
# 1. 创建自定义基准目录
mkdir -p my_benchmark
cd my_benchmark

# 2. 编写数据加载器
cat > loader.py << 'EOF'
import json
from typing import List, Dict

def load_tasks(split: str = "train") -> List[Dict]:
    with open(f"data/{split}.json") as f:
        return json.load(f)
EOF

# 3. 编写评分函数
cat > scorer.py << 'EOF'
def score_rollout(task: dict, response: str) -> float:
    # 你的评分逻辑
    expected = task["expected_answer"]
    if expected.lower() in response.lower():
        return 1.0
    return 0.0
EOF

# 4. 运行训练
skillopt-train \
    --benchmark my_benchmark \
    --epochs 10 \
    --output ./my_skill.md
```

### 进阶用法：多后端训练

同时使用多个模型作为目标模型：

```yaml
# multi_backend.yaml
targets:
  - backend: openai_chat
    name: gpt-4.1
  - backend: claude_chat
    name: claude-3.7-sonnet
  - backend: qwen_chat
    name: qwen-2.5-72b

optimizer:
  backend: openai_chat
  name: gpt-4.1

training:
  epochs: 5
  validation_split: 0.3
```

```bash
skillopt-train --config multi_backend.yaml
```

训练会为每个目标模型生成独立的优化技能，同时验证跨模型迁移性。

### 实际项目示例：集成到 Claude Code

SkillOpt 提供了 Claude Code 的集成适配器：

```bash
# 安装 Claude 后端
pip install "skillopt[claude]"

# 使用 SkillOpt-Sleep 夜间进化
skillopt-sleep \
    --history-dir ~/.claude-code/sessions \
    --skill-out ~/.claude-code/skills/optimized.md \
    --validator bench:searchqa \
    --epochs 3
```

然后在 Claude Code 配置中引用优化后的技能：

```yaml
# ~/.claude-code/config.yaml
skills:
  - path: ./skills/optimized.md
    enabled: true
```

### 启动 WebUI 监控

```bash
pip install "skillopt[webui]"
python -m skillopt_webui.app --port 7860
```

访问 `http://localhost:7860` 可以实时查看：

- 每个 epoch 的验证分数曲线
- 编辑接受/拒绝统计
- 技能文档的版本历史
- Rollout 详情分析

## 五、常见问题与解决方案

### Q1: 训练时出现 API 限流

**症状**：

```
openai.RateLimitError: Rate limit exceeded for gpt-4.1
```

**解决方案**：

```yaml
# config.yaml 中增加重试配置
api:
  retry:
    max_attempts: 5
    backoff_factor: 2.0  # 指数退避
```

或使用本地模型后端（如 Qwen via vLLM）：

```yaml
model:
  backend: qwen_chat
  endpoint: http://localhost:8000/v1
```

### Q2: 验证门控总是拒绝编辑

**症状**：

```
[epoch 3] Rejected 15/15 edits, no improvement on validation set
```

**可能原因**：

1. 验证集与训练集分布差异过大
2. 初始技能已经接近最优
3. 文本学习率过大导致震荡

**解决方案**：

```yaml
# 调整配置
training:
  textual_lr: 20  # 减小每次编辑幅度
  validation_split: 0.2  # 增加训练数据
  
  # 放宽验证条件（不推荐，仅用于调试）
  validation:
    accept_threshold: 0  # 非负提升即可接受
```

### Q3: 生成的技能文档过长

**症状**：

```
best_skill.md: 5,000 tokens (超出预期)
```

**解决方案**：

```yaml
optimizer:
  constraints:
    max_skill_tokens: 1500  # 硬限制
    compression_prompt: |
      你必须在保持效果的前提下精简技能文档，
      当前长度：{current}，目标长度：{target}
```

### Q4: 如何评估技能迁移性？

**方案**：使用跨基准评估模式

```bash
# 在 SearchQA 上训练
skillopt-train --benchmark searchqa --output ./skill.md

# 在其他基准测试
skillopt-eval --skill ./skill.md --benchmark webshop
skillopt-eval --skill ./skill.md --benchmark alfworld
```

论文实验显示，在 SearchQA 上优化的技能能迁移到 WebShop（+12.3 分）和 ALFWorld（+8.7 分）。

### Q5: Windows 环境路径问题

**症状**：

```
FileNotFoundError: skill\\best_skill.md (路径分隔符错误)
```

**解决方案**：

v0.2.0 已修复 Windows 路径兼容性问题。确保使用最新版本：

```bash
pip install --upgrade skillopt
```

如仍有问题，使用 `pathlib` 兼容路径：

```python
from pathlib import Path
config["output"]["skill_path"] = str(Path("outputs") / "best_skill.md")
```

## 六、总结

SkillOpt 的核心贡献是把**神经网络训练的严谨性**带入了 Agent 技能优化领域：

1. **可复现**：验证门控、学习率预算、拒绝缓冲区确保训练稳定
2. **零推理开销**：优化产物是紧凑的 Markdown 文件，不影响部署
3. **可迁移**：跨模型、跨环境、跨任务的迁移能力
4. **可扩展**：模块化设计，易于添加新后端和新基准

对于正在构建 Agent 应用的团队，SkillOpt 提供了一条从"手写技能"到"数据驱动优化"的升级路径。特别是 `skillopt-sleep` 的夜间自进化模式，让本地编码助手能够持续从自身经验中学习。

**项目地址**：https://github.com/microsoft/SkillOpt  
**论文**：https://arxiv.org/abs/2605.23904  
**文档**：https://microsoft.github.io/SkillOpt/
