---
title: "OOMWOO：用树莓派和 ROS2 自己造一台扫地机器人"
date: "2026-08-07"
description: "OOMWOO 是一个完全开源的扫地机器人项目，基于树莓派、ROS2、3D 打印和 Home Assistant 构建，支持 2D LiDAR 自主导航，完全本地运行无需云端，真正做到可 hack、可修复、可升级。"
author: "Cheman"
slug: oomwoo
draft: false
categories: ["技术", "机器人", "开源"]
tags: ["ROS2", "扫地机器人", "开源硬件", "树莓派", "3D打印", "Home Assistant"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OOMWOO**，一个完全开源、可自己动手打造的扫地机器人——用树莓派 + 3D 打印 + ROS2 构建，支持本地运行不依赖任何云服务。

## 一、项目概述

OOMWOO（名字是一个 180° 旋转后仍然对称的旋转对称字）是一个开源家庭扫地机器人项目，目标是：

- **可负担**：使用常见的树莓派 CM4/CM5 作为主控，成本可控
- **完全开源**：硬件（3D 打印文件）、软件（ROS2）、固件（STM32 MCU）全部开源
- **本地运行**：日常功能不依赖任何云端，真正去中心化
- **Home Assistant 原生集成**：开箱即用的本地智能家居控制
- **可 hack**：模块化架构，支持自由扩展和二次开发

### 核心特性一览

| 特性 | 说明 |
|------|------|
| 主控 | 树莓派 CM4 / CM5 |
| 运动控制 | STM32G070 MCU + FreeRTOS |
| 导航 | ROS2 + Nav2 + 2D LiDAR SLAM |
| 通信 | 自定义串口协议（MCU ↔ 主控） |
| 地图构建 | 自主 SLAM 覆盖率清洁 |
| 仿真 | Gazebo + ROS2 全套仿真环境 |
| 控制 | Home Assistant 本地集成 |
| 3D 打印 | 全部外壳零件可 3D 打印 |

### 当前开发状态

项目处于早期开发阶段，预计 2026 年秋季发布第一版构建说明。目前已有：

- ROS2 软件开发环境和 Gazebo 仿真环境可用
- ROS2 URDF + Gazebo 仿真包
- 临时占位机器人（Proscenic M6 Pro）已接入 ROS2 可用
- BOM（物料清单）草稿版已发布
- 社区模块化贡献机制已建立

## 二、技术架构

### 整体架构

OOMWOO 采用典型的分布式机器人架构，CPU（树莓派）和 MCU（STM32）通过自定义串口协议通信：

```
┌──────────────────────────────────────────────┐
│         树莓派 CM4/CM5 (ROS2)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Nav2    │ │  SLAM    │ │ Home Assist. │  │
│  │  导航规划 │ │  地图构建 │ │  本地控制    │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│              ↑ 自定义串口协议                  │
└──────────────│───────────────────────────────┘
               │
┌──────────────│───────────────────────────────┐
│   STM32G070 MCU (FreeRTOS + Arduino API)    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │
│  │ 电机驱动│ │ 传感器  │ │ 充电管理│ │ 安全   │ │
│  │ PWM速度 │ │ LiDAR  │ │ 4S2P   │ │ 看门狗  │ │
│  └────────┘ └────────┘ └────────┘ └───────┘ │
└──────────────────────────────────────────────┘
```

### I/O 主板设计（KiCad + JLCPCB）

I/O 主板承担关键的实时安全功能：

- **电机驱动接口**：支持带编码器的直流电机
- **LiDAR 接口**：2D LiDAR 专用接头
- **IMU 接口**：惯性测量单元
- **MIPI 摄像头接口**：用于 v2 版本的障碍物识别
- **4S2P 锂电池充电管理**
- **STM32G070 MCU**：运行 FreeRTOS，上层是 Arduino 风格 API，底层是 HAL + ISR 实时安全核心
- **安全看门狗**：任何 ROS2 节点崩溃/挂起，MCU 立即停止机器人

### ROS2 软件栈

核心依赖（已实现 2GB RAM 目标）：

```yaml
# 关键 ROS2 包依赖（模块化组合）
- nav2_bringup        # 导航2 导航栈
- slam_toolbox       # SLAM 地图构建
- ros2_controllers   # 机器人控制器
- ros2_action         # 动作服务器（清洁任务）
```

Node 组合策略：用 `ros2 component load` 动态组合节点，精简内存占用。已实测将 ROS2/Nav2/SLAM 压入 2GB RAM 以内。

### 仿真环境

OOMWOO 提供完整的 Gazebo 仿真：

```bash
# 安装仿真环境（参考 oomwoo-install）
git clone https://github.com/makerspet/oomwoo-install
cd oomwoo-install
./install.sh simulation

# 运行仿真
ros2 launch oomwoo_one gazebo.launch.py
```

URDF + Gazebo 仿真贡献模块已在社区开放，多名贡献者正在完善物理模型。

### 社区模块化贡献机制

OOMWOO 采用了非常创新的并行贡献模式——将整个项目拆分为多个独立模块，贡献者在自己的仓库开发，通过短 PR 链接回主项目：

| 模块 | 状态 | 说明 |
|------|------|------|
| URDF + Gazebo sim | 进行中 | 仿真物理模型 |
| 覆盖率清洁 + SLAM 建图 | 进行中 | 边清洁边建图 |
| 自动清洁（已知地图） | 进行中 | 基于已有地图规划路径 |
| AMCL 定位 + 导航 | 进行中 | 已知地图重定位 |
| 自主回充循环 | 待开始 | 精确对接充电桩 |
| 障碍物识别（v2） | 待开始 | 摄像头 + ToF 低于 LiDAR 的障碍 |
| 内存优化 | **已完成** | 达成 2GB 目标 |

## 三、安装与快速开始

### 环境要求

- Ubuntu 22.04 + ROS2 Humble
- 树莓派 CM4 或 CM5（推荐 CM5，2GB+ RAM）
- 2D LiDAR（如 RPLIDAR A1/A3 或 similar）
- 3D 打印机（零件发布后）
- 至少 8GB microSD 卡

### 软件安装（树莓派或仿真）

```bash
# 克隆安装脚本
git clone https://github.com/makerspet/oomwoo-install
cd oomwoo-install

# 全量安装（机器人 + 仿真）
./install.sh full

# 仅安装仿真
./install.sh simulation
```

### ROS2 环境初始化

```bash
# 加载 ROS2 环境
source /opt/ros/humble/setup.bash
source ~/oomwoo_ws/install/setup.bash

# 启动 Nav2 导航
ros2 launch nav2_bringup bringup_launch.py \
  params_file:=~/oomwoo_ws/src/oomwoo_one/config/nav2_params.yaml
```

### 在 Gazebo 中运行仿真

```bash
# 启动 Gazebo 仿真
ros2 launch oomwoo_one gazebo.launch.py

# 在 RViz 中查看
ros2 run rviz2 rviz2 -d ~/oomwoo_ws/src/oomwoo_one/config/oomwoo.rviz
```

## 四、实战：让机器人在仿真中走一圈

### 步骤 1：启动仿真

```bash
ros2 launch oomwoo_one gazebo.launch.py
```

### 步骤 2：打开 SLAM 建图

```bash
ros2 launch slam_toolbox online_async_launch.py \
  params_file:=~/oomwoo_ws/src/oomwoo_one/config/slam_params.yaml
```

### 步骤 3：遥控探索建图

```bash
# 启动键盘控制
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

移动机器人探索房间，SLAM 自动构建地图。

### 步骤 4：保存地图

```bash
ros2 run nav2_map_server map_saver_cli -f ~/map
```

### 步骤 5：启动自主导航清洁

```bash
# 启动 Nav2 导航
ros2 launch nav2_bringup bringup_launch.py \
  map:=$HOME/map.yaml

# 发送自主清洁目标
ros2 action send_goal /clean_coverage nav2_msgs/action/Coverage \
  "{area: 'full_room'}"
```

## 五、常见问题与解决方案

### Q1：ROS2 节点内存占用过高怎么办？

OOMWOO 已实现 2GB RAM 目标，核心方法：

- 用 `ros2 component load` 动态组合节点，减少进程开销
- 移除 Gazebo 和桌面 UI（仿真外环境不需要）
- 用 Rust 重写部分性能关键模块

参考贡献模块 `compute-benchmark` 的配置：`contributions/compute-benchmark`

### Q2：LiDAR 数据丢帧或噪声大？

- 检查 USB 串口权限：`sudo chmod 666 /dev/ttyUSB0`
- 确认 LiDAR 供电充足（部分 USB 供电不足，需外接 5V）
- 在 `slam_params.yaml` 中调高扫描匹配阈值

### Q3：导航时机器人原地转圈不移动？

- 检查 `cmd_vel` 话题是否收到数据
- 验证电机编码器反馈正常：`ros2 topic echo /wheel/encoder`
- 确认 Nav2 的 `controller_server` 参数中机器人最大速度配置正确

### Q4：无法连接到 Home Assistant？

- 确认 MQTT broker 运行正常：`mosquitto -d`
- 检查 Home Assistant 中 OOMWOO 集成配置，MQTT discovery 是否开启
- 查看 ROS2 侧 MQTT 桥接日志：`ros2 run mqtt_bridge mqtt_bridge`

### Q5：构建固件时 STM32CubeIDE 报错？

- 确认安装 STM32CubeProgrammer
- 检查 MCU 型号选择是否正确（项目使用 STM32G070RB）
- 参考 `oomwoo-io-firmware` 仓库中的 `CONTRIBUTING.md`

## 六、与同类开源项目对比

| 项目 | 平台 | 云端依赖 | ROS2 | DIY 硬件 | 成熟度 |
|------|------|---------|------|---------|--------|
| **OOMWOO** | 树莓派 | 无 | ✅ | ✅ 3D打印 | 早期 |
| **Valetudo** | 商业机 | 无 | ❌ | ❌ 固件替换 | 成熟 |
| **Open Mower** | 树莓派 | 可选 | ✅ | ✅ | 成熟 |
| **真空Tiger** | 商业机 | 未知 | ⚠️ 部分 | ❌ | 实验性 |

OOMWOO 的差异化在于：**完全白盒 + ROS2 原生 + 社区模块化并行开发**，是唯一一个同时满足"自己造"和"完整 ROS2"的开源扫地机器人项目。

## 七、总结

OOMWOO 是一个野心勃勃且路线清晰的开源机器人项目，用树莓派 + ROS2 + 3D 打印把"自己造一台扫地机器人"这件事变得触手可及。它最大的创新不仅在技术，更在社区协作模式——模块化并行贡献让任何人都可以零门槛切入自己感兴趣的子系统。

项目目前处于早期开发阶段，2026 年秋季会出第一版构建说明。如果你对机器人、ROS2、嵌入式开发感兴趣，现在正是介入的好时机——参与一个开源扫地机器人的从零搭建，机会难得。

**项目地址**：[https://github.com/makerspet/oomwoo](https://github.com/makerspet/oomwoo)
