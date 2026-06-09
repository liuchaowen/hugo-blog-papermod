---
title: "ESPectre：用 Wi-Fi 信号实现无摄像头人体感知，ESP32 成本仅 €10"
date: 2026-06-10
description: "ESPectre 是基于 Wi-Fi CSI（信道状态信息）的运动检测系统，无需摄像头和麦克风，仅用 €10 的 ESP32 设备即可实现人体感知，并原生接入 Home Assistant。"
author: "Cheman"
slug: espectre
draft: false
categories: [技术, 智能家居]
tags: [GitHub, 开源, ESP32, HomeAssistant, Wi-Fi, 传感器]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ESPectre**，它用 Wi-Fi 信号的微小变化来检测人体运动，不需要任何摄像头或麦克风，仅需一块 ~€10 的 ESP32 开发板，就能实现全屋无感人体感知，并原生接入 Home Assistant。

## 一、项目概述

ESPectre 是一个基于 **Wi-Fi CSI（Channel State Information，信道状态信息）** 的运动检测系统，由 Francesco Pace 开发，以 GPLv3 开源协议发布。

**核心能力一句话概括：** 通过分析 Wi-Fi 信号在空间中传播的微小扰动，判断是否有人体在移动，全程无需摄像头、麦克风或可穿戴设备。

| 特性 | 说明 |
|------|------|
| 感知方式 | Wi-Fi CSI 信号分析，无摄像头/麦克风 |
| 硬件成本 | ~€10（ESP32-S3/C6 开发板） |
| 平台集成 | 原生 ESPHome 组件，自动接入 Home Assistant |
| 隐私友好 | 不采集图像、声音或个人身份信息 |
| 穿墙能力 | 2.4GHz Wi-Fi 可穿透石膏板墙体 |
| 检测算法 | MVS（多变量统计）+ 实验性 ML 神经网络 |

项目采用**双平台策略**：
- **ESPectre**（本仓库）：面向终端用户，ESPHome 组件，开箱即用
- **Micro-ESPectre**（子目录）：面向研究者，Python/MicroPython 实现，用于快速算法验证

## 二、技术原理

### CSI 是什么？

CSI（Channel State Information）是 Wi-Fi 通信中 OFDM 子载波的幅度和相位信息。当有人在空气中移动时，身体会反射/衍射 Wi-Fi 信号，导致 CSI 数据发生可测量的变化——就像在手电筒前挥手能看到影子变化一样。

### 处理流水线

ESPectre 的信号处理流水线设计非常精细：

```
CSI 原始数据
  → Gain Lock（AGC/FFT 稳定，约 3 秒）
  → 自动校准（NBVI 算法选取最优 12 个子载波）
  → 自适应阈值（P95 × 1.1 或手动固定值）
  → Hampel 滤波（去除异常湍流）
  → 低通滤波（可选，降噪平滑）
  → 检测评估（MVS 或 ML 评分）
  → Hit 滤波（motion_on_hits / motion_off_hits）
  → Home Assistant 二进制传感器 + 运动评分
```

### 核心技术亮点

**1. NBVI 自动子载波选择**

系统启动时自动运行 NBVI（Normalized Band Variance Index）算法，从所有 Wi-Fi 子载波中选取稳定性最高、频谱多样性最好的 12 个非连续子载波，**零手动配置**，检测精度 F1 > 96%。

> ⚠️ MVS 模式下，设备启动后需保持房间静止 10 秒，让自动校准完成。ML 模式无需校准。

**2. 两种检测算法**

| 算法 | 特点 | 适用场景 |
|------|------|----------|
| MVS（多变量统计） | 成熟稳定，需校准 | 日常使用 |
| ML（神经网络） | 无需校准，实验性 | 新版尝鲜（`detection_algorithm: ml`） |

ML 检测器是一个轻量级 MLP 网络（9→32→16→1），直接在 ESP32 上实时推理。

**3. 双平台研发流**

```
Micro-ESPectre（Python 快速原型）
        ↓ 验证后的算法
ESPectre（C++ ESPHome 组件）
```

新算法先在 Micro-ESPectre 中用 Python 快速验证，再移植到 ESPectre 的 C++ 生产代码中。

## 三、安装与快速开始

### 硬件准备

- **ESP32 开发板**：推荐 ESP32-S3 或 ESP32-C6（CSI 支持最好），ESP32-C3 和原版 ESP32 也可用
- **2.4GHz Wi-Fi 路由器**：家中现有路由器即可
- **可选**：外接天线（IPEX 接口，提升信号接收）

### 软件依赖

- Home Assistant（运行在树莓派/PC/NAS 上）
- ESPHome（可集成在 Home Assistant 内或独立运行）

### 快速部署步骤

**1. 获取 ESPectre ESPHome 组件**

在 ESPHome 配置中添加外部组件依赖，具体参考 [SETUP.md](https://github.com/francescopace/espectre/blob/main/SETUP.md)。

**2. 编写 YAML 配置**

```yaml
esphome:
  name: espectre-living-room
  platformio_options:
    board: esp32-s3-devkitc-1

wifi:
  ssid: "你的 Wi-Fi 名称"
  password: "你的 Wi-Fi 密码"

# ESPectre 组件配置
espectre:
  detection_algorithm: mvs   # 或 ml
  segmentation_threshold: 0.5
  evaluation_interval: 50
  motion_on_hits: 3
  motion_off_hits: 10
```

**3. 刷写固件**

通过 ESPHome Dashboard 一键编译并刷写到 ESP32 设备。

**4. 接入 Home Assistant**

设备启动后，Home Assistant 会自动发现并添加以下实体：
- `binary_sensor.espectre_motion`：运动检测二进制传感器
- `sensor.espectre_movement_score`：运动强度评分（0-100）
- `number.espectre_threshold`：可调阈值（数字实体）

总耗时约 10-15 分钟，全程无需编程。

## 四、使用方法与实战

### 传感器放置建议

| 距离路由器 | 信号质量 | 推荐度 |
|-----------|---------|--------|
| < 2m | 过强，多径效应弱 | ❌ 太近 |
| 3-8m | 强，多径丰富 | ✅ **最佳** |
| > 10-15m | 弱，噪声大 | ❌ 太远 |

**放置技巧：**
- 高度：离地 1-1.5 米（桌面高度）
- 避开金属障碍物（冰箱、金属柜）
- 不需要与路由器直视，Wi-Fi 可绕射

### 实用场景

- **家庭安防**：离家时有人进入立即告警
- **老人看护**：监测活动状态，检测跌倒或长时间无活动
- **智能节能**：有人时才开灯/开空调，无人自动关闭
- **儿童监护**：夜间离开卧室时发送提醒
- **区域温控**：仅对有人区域进行供暖/制冷

### 多房间部署

每个房间放置一个 ESP32 传感器，所有设备通过 ESPHome Native API 自动接入 Home Assistant，实现全屋覆盖。单个传感器覆盖约 50㎡。

## 五、常见问题与解决方案

**Q：需要改造路由器吗？**
A：完全不需要。ESP32 只是"监听" Wi-Fi 信号，不改变路由器任何配置。

**Q：检测准确度如何？**
A：准确度高度依赖环境，需合理调参。影响因素包括房间布局、墙体材质、家具摆放、与路由器距离（最佳 3-8m）、干扰水平等。通过调节 `segmentation_threshold` 可优化灵敏度。

**Q：能区分人和宠物吗？**
A：当前系统是 2 状态模型（静止/运动），不区分人、宠物或其他移动物体。如需分类能力，需训练专门的 AI 模型（项目 Roadmap 中已规划）。

**Q：隐私安全吗？**
A：系统只采集 Wi-Fi 信号的物理特征（子载波幅度/相位），不采集图像、声音或个人身份信息。但需注意：CSI 数据仍可用于非 consent 监控，使用者需确保获得被监测人员的明确同意，遵守当地隐私法规（如欧盟 GDPR）。

**Q：ML 模式和 MVS 模式怎么选？**
A：MVS 模式成熟稳定，启动后需 10 秒静止校准；ML 模式无需校准，但基于神经网络，仍是实验性功能，欢迎反馈。

**Q：功耗如何？**
A：持续工作典型功耗约 500mW。固件支持电源优化，可实现深度睡眠模式以支持电池供电部署（需自定义修改代码）。

## 六、总结

ESPectre 是一个非常巧妙的项目，它把 Wi-Fi 芯片原本用于通信的 CSI 数据"另作他用"，实现了低成本的穿墙人体感知。几个亮点：

1. **隐私优先**：无摄像头、无麦克风，只分析信号物理特征
2. **成本极低**：€10 硬件 + 全免费开源软件
3. **集成顺畅**：原生 ESPHome 组件，Home Assistant 自动发现
4. **算法扎实**：NBVI 自动校准 + MVS/ML 双算法，F1 > 96%
5. **研发友好**：双平台策略，算法快速验证后再投产

项目目前正在向 ML 方向演进，未来计划支持手势识别、人类活动识别（跌倒检测等）、人数统计和 3D 室内定位，值得持续关注。

- GitHub：https://github.com/francescopace/espectre
- 文档：https://github.com/francescopace/espectre/blob/main/SETUP.md
- 作者：Francesco Pace
