---
title: "RuView：用普通 WiFi 穿墙感知人体，ESP32+脉冲神经网络实现无摄像头空间智能"
date: 2026-06-11
description: "RuView 将普通 WiFi 路由器的无线电信号转化为空间感知能力，通过 ESP32 传感器和脉冲神经网络实现穿墙人体检测、呼吸心率监测、跌倒识别等，支持 Home Assistant、Apple Home 等智能家居生态，全部在边缘侧运行，无需云端和摄像头。"
author: "Cheman"
slug: ruview
draft: false
categories: [开源, 硬件, AI]
tags: [WiFi, ESP32, 边缘计算, 智能家居, CSI, 穿墙感知, GitHub Trending]
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
ShowRssButtonInSectionTerm: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个非常有科幻感的项目：**RuView**，它能把家里普通的 WiFi 路由器变成一个穿墙感知系统——无需摄像头、无需穿戴设备，仅靠无线电信号的反射就能检测人是否存在、测量呼吸心率、识别跌倒，甚至估计人体姿态。

## 一、项目概述

RuView（π RuView）是一个开源的 WiFi 感知平台，核心理念是：**你家里每个 WiFi 路由器都在不断发射无线电波，人在房间里的移动、呼吸甚至静坐都会对这些电波产生可测量的扰动**。RuView 通过 ESP32 传感器采集信道状态信息（CSI），再用预训练的小型神经网络将这些扰动转化为可操作的数据。

**核心能力包括：**

- **人体存在检测**：穿墙识别人数、进出追踪
- **生命体征监测**：无接触呼吸频率（6-30 BPM）和心率（40-120 BPM）
- **活动识别**：行走、坐下、手势、跌倒
- **17 关键点姿态估计**：在 MM-Fi 数据集上达到 82.69% torso-PCK@20，超越 MultiFormer 和 CSI2Pose
- **睡眠质量监测**：整夜睡眠阶段分类和呼吸暂停筛查
- **环境映射**：RF 指纹识别房间、检测家具移动

最令人印象深刻的是成本——每个传感器节点只需 **9 美元的 ESP32 板**，模型经 4-bit 量化后仅 **8 KB**，在树莓派上运行时间以微秒计。

## 二、技术原理

### 2.1 CSI 信号采集

WiFi 通信中的 CSI（Channel State Information）记录了每个子载波的幅度和相位信息。当信号在空间中传播并遇到人体时，反射、衍射和散射会导致 CSI 发生变化。ESP32-S3 的 CSI streaming 功能可以实时捕获这些变化。

```
// CSI 信号处理流程示意
原始 CSI → 去噪 → 子载波选择 → 相位unwrap →
带通滤波 → 特征提取 → 模型推理 → 语义状态输出
```

### 2.2 脉冲神经网络（SNN）

RuView 使用脉冲神经网络进行环境学习，**30 秒内即可适配新环境**。相比传统 ANN，SNN 在功耗和实时性上有天然优势，非常适合 ESP32 等边缘硬件。

### 2.3 多频率网格扫描

系统在 **6 个 WiFi 信道**上进行扫描，甚至可以利用邻居家的路由器作为额外的雷达信号源（"free radar illuminators"），显著提升了感知覆盖范围和精度。

### 2.4 密码学证明链

每条测量数据都通过 **Ed25519 见证链（witness chain）** 进行密码学签名，确保数据来源可信、不可篡改——这在安全监控场景中至关重要。

### 2.5 技术架构概览

```
ESP32 节点（$9/个）
  ├── CSI 采集 & 边缘推理（Rust 编写）
  ├── 6 信道多频扫描
  └── Ed25519 数据签名
        ↓ MQTT / Matter
Cognitum Seed（持久存储 + AI 集成）
  ├── 环境指纹库
  ├── SNN 在线学习
  └── 21 个实体/节点（11 原始信号 + 10 语义状态）
        ↓
智能家居平台
  ├── Home Assistant（MQTT）
  ├── Apple Home（HAP 1.1）
  ├── Google Home / Alexa（Matter）
  └── SmartThings
```

### 2.6 姿态估计模型

RuView 发布在 Hugging Face 上的 [`wifi-densepose-pretrained`](https://huggingface.co/ruvnet/wifi-densepose-pretrained) 模型包含一个 128 维对比编码器，v2 编码器在 held-out 数据上实现了 **82.3% 的时间三元组准确率**。姿态估计模块 `cog-pose-estimation` 在 Pi 5 上冷启动仅需 **8.4 ms**。

## 三、安装与快速开始

### 3.1 环境要求

- ESP32-S3 开发板（推荐，支持 CSI streaming）
- Cognitum Seed 或树莓派（可选，用于中枢推理）
- Rust 1.85+（编译固件）
- Docker（可选，运行中枢服务）

### 3.2 快速启动（Docker 方式）

```bash
# 拉取多架构镜像（支持 amd64 和 arm64）
docker pull ruvnet/wifi-densepose:latest

# 启动服务
docker run -d \
  --name ruview \
  -p 8080:8080 \
  ruvnet/wifi-densepose:latest
```

### 3.3 接入 Home Assistant

```bash
# 启动时添加 MQTT 标志即可自动发布到 HA
docker run -d \
  --name ruview-ha \
  -e MQTT_HOST=homeassistant.local \
  -e MQTT_PORT=1883 \
  -p 8080:8080 \
  ruvnet/wifi-densepose:latest --mqtt
```

系统会自动发布 21 个实体，包括原始 CSI 信号和推断的语义状态（有人在睡觉、可能遇险、房间活跃、老年人异常静止、会议进行中等）。

### 3.4 ESP32 固件烧录

```bash
# 克隆仓库
git clone https://github.com/ruvnet/RuView.git
cd RuView/firmware

# 使用 espflash 烧录
espflash flash --monitor
```

## 四、使用方法与实战

### 4.1 呼吸与心率监测

系统通过 CSI 相位信号的带通滤波实现生命体征提取：

- **呼吸率**：0.1–0.5 Hz 带通滤波 + 相位方差 + 过零 BPM 检测
- **心率**：0.8–2.0 Hz 带通滤波 + 过零 BPM 检测

无需接触身体，人在床上睡觉时也能实时监测。

### 4.2 跌倒检测

```rust
// 跌倒检测算法核心逻辑
// 相位加速度阈值 + 3 帧去抖 + 5 秒冷却
fn detect_fall(phase_acc: f32) -> bool {
    phase_acc > FALL_THRESHOLD && debounce_frames >= 3
}
```

检测延迟低于 **200ms**，在老年人看护场景中非常关键。

### 4.3 多人计数

使用自适应 P95 归一化 + 运行时可调去重因子（`/api/v1/config/dedup-factor`），还提供 6 个专用计数器 Cog：区域占用、电梯计数、队列长度、客流统计等。

### 4.4 语义状态输出

每个节点输出 10 种推断的语义状态，可直接用于自动化规则：

| 语义状态 | 用途 |
|---------|------|
| `someone-sleeping` | 自动关闭灯光 |
| `possible-distress` | 触发紧急通知 |
| `elderly-inactivity-anomaly` | 长者安全看护 |
| `meeting-in-progress` | 会议室状态指示 |
| `bathroom-occupied` | 卫生间占用提示 |
| `fall-risk-elevated` | 跌倒风险预警 |

### 4.5 Apple Home / Siri 语音集成

作为 HAP 1.1 桥接设备接入 Apple Home 后，可以直接用 Siri 语音查询：

> "Siri，卧室有人吗？"  
> "Siri，客厅的心率是多少？"

无需编写自定义 Skill，开箱即用。

## 五、常见问题与解决方案

### 5.1 检测精度不够

- 确保 ESP32 节点与目标之间有足够的 WiFi 反射路径
- 运行 30 秒环境校准让 SNN 适配当前房间
- 尝试多节点部署，利用多频率网格扫描提升覆盖

### 5.2 MQTT 连接失败

- 检查 Home Assistant 的 MQTT broker 是否已启动
- 确认网络防火墙允许 MQTT 端口（默认 1883）
- 验证 MQTT 凭证配置

### 5.3 ESP32 固件编译错误

- 确保使用 Rust 1.85 或更高版本
- 安装 `espflash` 工具：`cargo install espflash`
- 检查目标芯片是否为 ESP32-S3（CSI streaming 需要此型号）

### 5.4 隐私担忧

- 所有数据处理在边缘侧完成，**不依赖云端**
- 无摄像头，不采集图像
- 数据签名链确保来源可审计

## 六、总结

RuView 展示了一个令人兴奋的方向：**将无处不在的 WiFi 信号转化为空间感知能力**。它不需要昂贵的专用硬件（9 美元 ESP32 即可），不需要摄像头（保护隐私），不需要云端（数据本地处理），却能实现穿墙人体检测、生命体征监测和姿态估计。

项目代码质量很高——1463 个测试通过、Rust 编写核心模块、完整的 ADR（架构决策记录）文档、Docker 多架构支持。对于智能家居爱好者、IoT 开发者和安全监控场景来说，这是一个非常值得关注和尝试的开源项目。

**项目地址**：[https://github.com/ruvnet/RuView](https://github.com/ruvnet/RuView)
