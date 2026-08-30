---
title: "Microduck RL：800g 双足机器人的 Sim2Real 强化学习训练框架"
date: 2026-08-31
description: "Microduck RL 是 Pollen Robotics 开源的强化学习训练框架，基于 MuJoCo Warp 和 PPO 算法，专门为 Microduck 这款约 800g、25cm 高的双足机器人打造 Sim2Real 迁移管道。"
author: "Cheman"
slug: microduck-rl
draft: false
categories: ["技术", "机器人", "强化学习"]
tags: ["强化学习", "机器人", "Sim2Real", "MuJoCo", "双足机器人", "Python"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Microduck RL**，一个面向微型双足机器人的强化学习训练框架，由 Pollen Robotics 开源。它基于 MuJoCo Warp 和 PPO 算法，为仅 800g、25cm 高的 Microduck 双足机器人打造了完整的 Sim2Real 迁移流水线，支持策略训练、ONNX 导出和真机部署。

## 一、项目概述

Microduck RL 的核心目标是解决微型双足机器人的 Sim2Real 迁移问题。相比大型人形机器人，Microduck 的 14 个伺服关节（左右腿各 5 个，颈部 4 个）使用的 Dynamixel XL330 舵机体积微小，力矩受限， actuator 建模精度直接决定了 Sim2Real 的效果。

项目主要特性：

- **完整的训练环境**：基于 mjlab（MuJoCo Warp）实现，支持 Velocity、StandUp、SitStand、Roulade、RollerSkating 等多种任务
- **BAM 致动器建模**：引入 Rhoban 的 BAM（Better Actuator Models）精确模拟电压控制、Coulomb/Stribeck 摩擦等物理特性
- **齿隙（Backlash）仿真**：对每个关节的齿轮间隙（±1°）建模，训练出对机械公差鲁棒的策略
- **ONNX 策略导出**：训练完成的策略一键导出为 ONNX，部署到真机运行时无需任何修改
- **域随机化**：对电池电压、压降、命令延迟、摩擦力等参数进行随机化，增强策略泛化能力

任务列表中，最核心的是 `Mjlab-Velocity-Flat-MicroDuck`（速度跟踪），而 `Mjlab-VelStand` 将行走和摔倒恢复融合为一个策略，`Mjlab-Roulade` 则实现了前滚翻后双脚落地的技巧动作。

## 二、技术原理

### 2.1 整体架构

Microduck RL 的技术栈极为精简：

```
microduck_rl/
├── src/mjlab_microduck/
│   ├── robot/microduck/          # MJCF 机器人模型
│   ├── actuator/                 # BAM 致动器 + 摩擦 + 齿隙建模
│   └── tasks/                    # 任务定义、奖励函数、观测接口
├── train_cli.py                  # 训练入口（调用 rsl_rl + PPO）
└── scripts/export.py             # ONNX 导出脚本
```

训练依赖 `mjlab`（封装了 MuJoCo Warp + rsl_rl 的 PPO 实现），推理只需 `onnxruntime`。

### 2.2 致动器建模：Sim2Real 差距的核心

在微型舵机领域，actuator 建模是 Sim2Real 的最大瓶颈。Microduck RL 弃用了简单的 PD 控制，完整引入了 BAM 模型：

```python
# src/mjlab_microduck/actuator/friction_dr_bam.py
# 使用电压控制律 + Coulomb/Stribeck 摩擦 + 负载依赖摩擦
from bam.model import BamActuator

actuator = BamActuator(
    motor_type="xl330",
    voltage_control=True,      # 电压模式，非电流模式
    back_emf=True,             # 反电动势
    coulomb_friction=True,     # Coulomb 摩擦
    stribeck_friction=True,    # Stribeck 静摩擦
)
```

观测接口读取的是编码器端位置（即舵机输出轴位置，经过齿隙传递后），这样仿真和真机的传感器数据在物理意义上完全对齐，无需额外的标定偏移。

### 2.3 齿隙建模

每个主任务都有一个 Backlash 变体，齿隙被建模为串联的无驱动铰链：

```xml
<!-- robot_walk_backlash.xml 片段 -->
<joint name="passive_left_hip_yaw_backlash" type="hinge" />
<!-- 主关节位置 = 电机位置 + 齿隙铰链偏移 -->
<!-- joint_pos 观测 = servo_qpos + backlash_qpos -->
```

这确保了 ONNX 导出的观测维度（61维）与基础任务完全一致，真机运行时无需修改固件。

### 2.4 统一观测接口与策略热切换

最巧妙的设计是所有任务共享同一个 61 维观测向量：

```python
# 观测结构（14 伺服关节共享）
actor_obs = [
    14 * joint_pos,    # 关节位置（经过齿隙处理）
    14 * joint_vel,    # 关节速度
    14 * joint_torque, # 关节力矩
    3  * gravity,      # 重力方向（IMU）
    2  * base_vel,     # 基座速度
    # 命令向量（策略热切换的关键）
    3  * twist_cmd,    # 线速度 + 角速度命令
    4  * head_pose,    # 头部姿态命令
    6  * body_pose,    # 身体姿态命令
]
```

`scripts/infer_policy.py` 演示了热切换机制：

```bash
uv run scripts/infer_policy.py \
    --walking walk.onnx \
    --standing stand.onnx \
    --sitstand sitstand.onnx \
    --roulade roulade.onnx \
    --new-cmd-obs
```

在任意时刻，运行时可以无缝切换行走、站立、坐下、前滚翻等策略，因为它们共享完全相同的观测接口。

### 2.5 奖励函数设计

从 `src/mjlab_microduck/tasks/mdp.py` 可以看到，奖励函数遵循分层设计原则：

```python
def compute_reward(self):
    # 任务目标奖励（主要驱动）
    track_reward = self._velocity_tracking_reward()
    
    # 姿态正则化（防止关节奇异）
    posture_reward = self._posture_reward()
    
    # 能耗惩罚（减少高能耗动作）
    energy_penalty = -0.01 * sum(abs(joint_torque))
    
    # 摔倒惩罚（快速重置）
    fall_penalty = -10.0 if self._is_fallen() else 0.0
    
    return track_reward + posture_reward + energy_penalty + fall_penalty
```

关键设计原则：任务奖励占主导，摔倒惩罚足够大以确保策略学会避免摔倒，姿态和能耗作为辅助正则项。

## 三、安装与快速开始

### 3.1 环境要求

- **GPU**：训练必须在 CUDA GPU 上进行（mjlab 通过 MuJoCo Warp 调用 GPU 物理计算）
- **Python**：3.12（bam 包依赖限制）
- **包管理器**：uv（Astral 出品的极速 Python 包管理器）
- **ARM 设备注意**：在 DGX Spark / GB10 / Jetson 等 ARM 设备上，首次 `uv sync` 需要约 2GB 的 CUDA wheels，建议设置超时：

```bash
export UV_HTTP_TIMEOUT=600
```

### 3.2 安装

```bash
git clone https://github.com/pollen-robotics/microduck_rl
cd microduck_rl
uv sync
```

### 3.3 训练（GPU）

```bash
# 训练行走策略（4096 并行环境，约 1-2 小时出一个可用的步态）
uv run train Mjlab-Velocity-Flat-MicroDuck --env.scene.num-envs 4096

# 从检查点恢复
uv run train Mjlab-Velocity-Flat-MicroDuck \
    --agent.run-name resume \
    --agent.load-checkpoint model_29999.pt \
    --agent.resume True
```

### 3.4 导出 ONNX

```bash
uv run scripts/export.py Mjlab-Velocity-Flat-MicroDuck \
    --wandb-run-path <entity/project/run_id>
```

导出的 ONNX 文件内嵌了观测归一化器，因此**必须使用 export.py 导出的 ONNX**，不要手动转换检查点文件。

### 3.5 无 GPU 训练（Hugging Face Jobs）

项目支持将训练任务提交到 Hugging Face Jobs，利用免费的 GPU 时间：

```bash
uv run train Mjlab-Velocity-Flat-MicroDuck --hf-jobs
```

详见 `scripts/hf/README.md`。

## 四、使用方法与实战

### 4.1 仿真中推理策略

训练完成后，用键盘实时控制机器人：

```bash
# 下载训练好的策略（从 wandb 或本地 output 目录）
uv run scripts/infer_policy.py --walking output.onnx
```

键盘控制：`WASD` 控制速度，`G` 地面拾取，`Y` 坐下/站立，`R` 前滚翻，`K/L` 踢球。可加 `--debug` 查看详细调试信息，`--record` 录制视频。

### 4.2 策略热切换演示

真机的核心能力——运行时无缝切换不同策略：

```bash
uv run scripts/infer_policy.py \
    --walking walk.onnx \
    --standing stand.onnx \
    --sitstand sitstand.onnx \
    --roulade roulade.onnx \
    --new-cmd-obs
```

这模拟了真机运行时的策略管理逻辑：行走中遇到障碍时立即切换到站立策略，遇到地面物品时切换到拾取策略。

### 4.3 齿隙鲁棒性训练

如果机器人关节存在个体差异或长期使用磨损导致齿隙增大，可以训练 Backlash 变体：

```bash
# 在 ±1° 齿隙下训练策略
uv run train Mjlab-Velocity-Flat-Backlash-MicroDuck
```

导出的 ONNX 与基础任务完全兼容，固件无需修改。

## 五、常见问题与解决方案

**Q1：首次 `uv sync` 超时中断？**
ARM 设备首次下载 CUDA wheels 约 2GB，建议设置 `UV_HTTP_TIMEOUT=600`，然后重新运行 `uv sync`。

**Q2：`torch.cuda.device_count() == 0` 导致训练崩溃？**
ARM Linux 设备（DGX Spark / GB10）的 PyPI torch 预编译包是 CPU only。需要配置 `torch` 从 PyTorch CUDA 索引获取 aarch64 GPU 轮，pyproject.toml 中已配置 `pytorch-cu129` 索引源。

**Q3：训练出来的策略在真机上表现不佳？**
确保使用 `scripts/export.py` 导出的 ONNX（内嵌归一化器）。如果策略只在仿真中有效但在真机上摔倒，检查是否在训练中启用了足够的域随机化参数（`ENABLE_*` 开关）。

**Q4：观测维度不匹配的错误？**
ONNX 导出时使用了固定的观测归一化器，部署时的观测归一化必须与训练时一致。如果修改了环境配置（关节数量、命令维度），需要重新训练和导出策略。

**Q5：多策略热切换时响应延迟高？**
真机的策略切换延迟取决于观测接口的响应速度，确保固件端的观测发布频率（50Hz）与训练时的频率一致。

## 六、总结

Microduck RL 的价值不仅在于它为一款微型双足机器人提供了可用的 RL 训练框架，更在于它展示了 Sim2Real 在资源受限场景下的最佳实践：精确的致动器建模（而非简单的 PD 控制）才是缩小 Sim2Real 差距的关键。通过 BAM 模型、齿隙仿真、统一观测接口和 ONNX 导出这四层设计，项目将仿真中的策略训练和真机部署无缝衔接，真正做到了"训练即部署"。

如果你对双足机器人的强化学习感兴趣，或者正在为小型化机器人设计 Sim2Real 迁移方案，Microduck RL 是一个值得深入研究的参考实现。
