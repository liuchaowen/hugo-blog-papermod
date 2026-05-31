---
title: "stable-worldmodel：世界模型研究的可复现平台"
date: 2026-05-31
description: "stable-worldmodel 是一个面向世界模型研究的统一平台，提供数据收集、训练和模型预测控制评估的标准化接口，支持多种环境和基线实现，大幅提升研究代码的可复现性。"
author: "Cheman"
slug: stable-worldmodel
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 世界模型, 强化学习, PyTorch]
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

今天在 GitHub Trending 上看到一个有意思的项目：**stable-worldmodel**，这是一个为世界模型研究提供可复现评估的平台，统一了数据收集、训练和评估流程。

## 一、项目概述

**stable-worldmodel** 是由 Galilai Group 开发的开源项目，旨在为世界模型研究提供一个统一的、可复现的实验平台。世界模型（World Model）是强化学习中的一个核心概念，它让智能体能够学习环境的内部表示，从而进行规划和决策。

**核心特性：**
- 统一的三个阶段接口：数据收集、训练、模型预测控制评估
- 支持多种标准化环境（DeepMind Control Suite、Gymnasium、Atari 等）
- 内置常见基线实现和规划求解器
- 多种数据格式支持（LanceDB、HDF5、Video、LeRobot）
- 丰富的视觉和物理变异因子，便于评估泛化能力

**解决的问题：**
世界模型研究缺乏统一的标准化平台，不同研究使用的环境、数据格式和评估方法各不相同，导致结果难以复现和比较。stable-worldmodel 通过提供统一接口和标准化环境，解决了这个痛点。

## 二、技术原理

### 架构设计

stable-worldmodel 采用模块化设计，核心架构分为三层：

1. **环境层（Envs）**：统一封装多种环境，提供 Gymnasium 接口
2. **数据层（Data）**：支持多种数据格式，提供统一的数据加载和转换接口
3. **求解器层（Solver）**：实现多种规划求解器，用于模型预测控制评估

```python
import stable_worldmodel as swm
from stable_worldmodel.policy import WorldModelPolicy, PlanConfig
from stable_worldmodel.solver import CEMSolver

# 1. 收集数据集
world = swm.World("swm/PushT-v1", num_envs=8)
world.set_policy(your_expert_policy)
world.collect("data/pusht_demo.lance", episodes=100, seed=0)

# 2. 加载数据并训练世界模型
dataset = swm.data.load_dataset("data/pusht_demo.lance", num_steps=16)
world_model = ...  # 你的模型

# 3. 使用模型预测控制评估
solver = CEMSolver(model=world_model, num_samples=300)
policy = WorldModelPolicy(solver=solver, config=PlanConfig(horizon=10))

world.set_policy(policy)
results = world.evaluate(episodes=50)
print(f"Success Rate: {results['success_rate']:.1f}%")
```

### 核心技术栈

- **PyTorch**：深度学习框架
- **LanceDB**：高效数据存储和检索
- **Gymnasium**：标准化环境接口
- **Hydra**：配置管理
- **WandB**：实验跟踪

### 数据流分析

stable-worldmodel 的数据流设计非常灵活，支持多种格式：

| 格式 | 磁盘布局 | 适用场景 |
|------|---------|---------|
| `lance` | LanceDB 表（episode 连续扁平行） | 默认格式 — 支持追加，快速索引读取 |
| `hdf5` | 单个 `.h5` 文件（每列一个数据集） | 可移植的单文件工件 |
| `folder` | `.npz` 列 + 每步一张 JPEG | 检查、部分键流读取 |
| `video` | `.npz` 列 + 每 episode 一个 MP4 | 长 episode，紧凑图像存储 |
| `lerobot` | `lerobot://<repo_id>`（只读适配器） | 直接在 LeRobot Hub 数据集上训练/评估 |

性能对比（基于 PushT 数据集）：
- **吞吐量**：LanceDB 本地无缓存可达 4814.8 samples/s，远超 HDF5 的 1416.1 samples/s
- **存储大小**：Video 格式仅 496.29 MB，而 HDF5 需要 43.12 GB

## 三、安装与快速开始

### 环境要求

- Python >= 3.10
- PyTorch
- 推荐使用 `uv` 进行依赖管理

### 安装步骤

从 PyPI 安装：

```bash
pip install stable-worldmodel            # 仅基础功能
pip install 'stable-worldmodel[all]'     # + 训练、环境、数据格式
```

从源码安装（开发模式）：

```bash
git clone https://github.com/galilai-group/stable-worldmodel
cd stable-worldmodel
uv venv --python=3.10 && source .venv/bin/activate
uv sync --extra all --group dev
```

数据集和检查点存储在 `$STABLEWM_HOME`（默认为 `~/.stable_worldmodel/`）。

### 最简运行示例

```python
import stable_worldmodel as swm

# 创建环境
world = swm.World("swm/PushT-v1", num_envs=8)

# 使用随机策略收集数据
import gymnasium as gym
world.set_policy(lambda obs: gym.spaces.unflatten(env.action_space, np.random.randn()))

# 收集数据
world.collect("data/pusht_demo.lance", episodes=100, seed=0)

# 加载数据集
dataset = swm.data.load_dataset("data/pusht_demo.lance", num_steps=16)
print(f"Dataset size: {len(dataset)}")
```

## 四、使用方法与实战

### 基础用法

**1. 环境列表和变异因子**

```bash
# 列出所有注册的环境
swm envs

# 查看环境的变异因子
swm fovs PushT-v1
```

stable-worldmodel 的一大特色是提供丰富的**变异因子**（Factors of Variation），包括光照、纹理、动力学、形态等可独立控制的视觉和物理参数，方便评估分布偏移下的零样本泛化能力。

**2. 数据集管理**

```bash
# 列出缓存的数据集
swm datasets

# 检查特定数据集
swm inspect pusht_expert_train

# 转换数据集格式
swm convert pusht_expert_train --dest-format video
```

**3. 训练基线模型**

项目提供了常见基线的参考实现：

- `scripts/train/lewm.py`：实现 [LeWM](https://le-wm.github.io/)
- `scripts/train/prejepa.py`：复现 [DINO-WM](https://arxiv.org/abs/2411.04983)

### 进阶用法

**自定义环境**

添加新环境只需遵循 Gymnasium 接口：

```python
from gymnasium import Env, spaces
import numpy as np

class MyCustomEnv(Env):
    def __init__(self):
        super().__init__()
        self.action_space = spaces.Box(low=-1, high=1, shape=(2,))
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(64,))
    
    def reset(self, seed=None):
        # 初始化环境
        return self._get_obs(), {}
    
    def step(self, action):
        # 执行动作
        obs = self._get_obs()
        reward = 0
        terminated = False
        return obs, reward, terminated, False, {}
    
    def _get_obs(self):
        return np.random.randn(64)

# 注册环境
swm.register_env("MyCustomEnv-v0", MyCustomEnv)
```

**自定义求解器**

实现自定义规划求解器：

```python
from stable_worldmodel.solver import BaseSolver

class MyCustomSolver(BaseSolver):
    def __init__(self, model, **kwargs):
        super().__init__(model)
        self.kwargs = kwargs
    
    def solve(self, initial_state, goal_state, horizon):
        # 实现你的规划算法
        actions = np.random.randn(horizon, self.action_dim)
        return actions

# 使用自定义求解器
solver = MyCustomSolver(model=world_model, num_samples=100)
policy = WorldModelPolicy(solver=solver, config=PlanConfig(horizon=10))
```

### 实际项目示例

**复现 DINO-WM**

```bash
# 训练 DINO-WM 模型
python scripts/train/prejepa.py \
    --config configs/dinowm_pusht.yaml \
    --data_path data/pusht_demo.lance \
    --output_dir checkpoints/dinowm_pusht
```

**评估世界模型**

```python
from stable_worldmodel.policy import WorldModelPolicy, PlanConfig
from stable_worldmodel.solver import CEMSolver

# 加载训练好的模型
world_model = load_checkpoint("checkpoints/my_model.pt")

# 创建求解器
solver = CEMSolver(model=world_model, num_samples=300)

# 创建策略
policy = WorldModelPolicy(solver=solver, config=PlanConfig(horizon=10))

# 评估
world = swm.World("swm/PushT-v1", num_envs=8)
world.set_policy(policy)
results = world.evaluate(episodes=50)

print(f"Success Rate: {results['success_rate']:.1f}%")
print(f"Average Return: {results['average_return']:.2f}")
```

## 五、常见问题与解决方案

### 安装失败

**问题**：`pip install stable-worldmodel[all]` 失败

**解决方案**：
1. 确保 Python 版本 >= 3.10
2. 安装 PyTorch 之前先安装 PyTorch：`pip install torch torchvision`
3. 使用 `uv` 进行依赖管理：`uv sync --extra all --group dev`

### 运行时错误

**问题**：`ModuleNotFoundError: No module named 'dm_control'`

**解决方案**：
```bash
pip install 'stable-worldmodel[env]'
```

**问题**：数据集加载失败

**解决方案**：
1. 检查数据集路径是否正确
2. 确认数据集格式是否支持
3. 使用 `swm inspect <dataset_name>` 检查数据集

### 性能问题

**问题**：训练速度慢

**解决方案**：
1. 使用 LanceDB 格式存储数据（性能最优）
2. 增加 `num_envs` 进行并行数据收集
3. 使用 GPU 进行训练

### 兼容性问题

**问题**：LeRobot 数据集支持失败

**解决方案**：
- LeRobot 支持需要 Python 3.12+：`pip install 'stable-worldmodel[lerobot]'`
- 确保 Python 版本符合要求

## 六、总结

**stable-worldmodel** 为世界模型研究提供了一个统一、可复现的实验平台，极大地降低了研究门槛，提升了代码的可复现性。其核心优势包括：

1. **统一接口**：标准化数据收集、训练和评估流程
2. **丰富环境**：支持多种标准化环境，内置变异因子
3. **灵活数据格式**：支持 LanceDB、HDF5、Video 等多种格式
4. **基线实现**：提供常见方法的参考实现，便于对比
5. **活跃开发**：来自顶级研究机构的维护，持续更新

如果你是世界模型研究方向的研究者或工程师，stable-worldmodel 绝对值得一试。它不仅能加速你的研究进程，还能提升实验结果的可信度和可复现性。

项目地址：<https://github.com/galilai-group/stable-worldmodel>

论文地址：<https://arxiv.org/abs/2605.21800>

文档地址：<https://galilai-group.github.io/stable-worldmodel/>
