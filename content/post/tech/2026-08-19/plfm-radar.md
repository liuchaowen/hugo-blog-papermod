---
title: "AERIS-10：把 10.5GHz 相控阵雷达做成开源 DIY 套件"
date: 2026-08-19
description: "AERIS-10 是一个完全开源的 10.5GHz 脉冲线性调频（LFM）相控阵雷达系统，提供 3km 与 20km 两种版本，用 FPGA + STM32 + Python GUI 实现波束赋形、脉冲压缩与多普勒处理。本文拆解其架构、核心器件选型与信号处理流水线，看看一套可自己焊接的雷达到底能飞多高。"
author: "Cheman"
slug: plfm-radar
draft: false
categories: [开源硬件, 雷达技术]
tags: [GitHub, 开源, 雷达, 相控阵, SDR, FPGA]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AERIS-10（PLFM_RADAR）**，它把原本只存在于军工实验室和高端科研所的相控阵雷达，做成了一套「原理图、PCB、固件、软件全开源，还能自己买料焊接」的 DIY 套件。

## 一、项目概述

AERIS-10 是由 Nawfal Motii（ABAC INDUSTRY，起源于摩洛哥的一个小作坊）主导的开源雷达项目，目标是「让雷达技术民主化」。它采用 **10.5 GHz 脉冲线性调频（Pulse Linear Frequency Modulated, PLFM）** 体制，提供两个版本：

- **AERIS-10N（Nexus）**：3km 探测距离，配 8×16 贴片天线阵列。
- **AERIS-10E（Extended）**：20km 探测距离，配 32×16 介质填充缝隙波导阵列，并增加 16 路 10W GaN 功放板。

两个版本都支持 **±45° 方位/俯仰电子波束扫描**，外加步进电机实现 360° 机械扫描；板载 FPGA 负责脉冲压缩、多普勒 FFT、MTI（动目标显示）与 CFAR（恒虚警率）检测；STM32 负责电源时序、外设配置、GPS/IMU 融合；最上层则是一个带地图集成的 Python GUI。

项目的核心特性可以概括为：

- **软硬全开源**：硬件设计文档用 CERN-OHL-P（强化对高功率射频的物理硬件保护），软件/固件/FPGA 代码用 MIT 许可。
- **完全模块化**：电源管理板、频率合成板、主板、功放板各自独立，方便分步焊接与调试。
- **电子波束赋形**：通过 4 片 4 通道相移器（ADAR1000）驱动 16 个阵元。
- **完整信号处理链**：从 LFM 啁啾生成到 CFAR 检测，全部在板端闭环完成。

## 二、技术原理

### 系统架构与器件选型

AERIS-10 的主板把模拟射频、数字基带和可编程逻辑揉在一起，关键器件选型非常「ADI 全家桶」，几乎每一颗都有明确分工：

| 子系统 | 核心器件 | 作用 |
|--------|----------|------|
| 时钟发生 | AD9523-1 | 低抖动时钟，给 TX/RX 频率合成、DAC、ADC、FPGA 提供相位对齐的时钟参考 |
| 频率合成 | ADF4382 ×2 | 10.5GHz 本振，分别用于上/下变频 |
| 混频 | LTC5552 ×2 | 上变频与 IF 下变频 |
| 波束赋形 | ADAR1000 ×4（每片 4 通道） | 收发链路的相移控制，实现电子扫描 |
| 前端 | ADTR1107 ×16 | 既做 RX 低噪放，也做 TX 功率放大驱动 |
| 逻辑 | XC7A50T FPGA | 雷达信号处理主引擎 |
| 控制 | STM32F746xx | 电源时序、外设配置、GPS/IMU 接入 |

值得玩味的是 **STM32 对 16 路功放（PA）的精细化管理**：每路 PA 用 5mΩ 分流电阻 + INA241A3 电流检测放大器（×50）做 Idq 采样（ADS7830 读取），再用 DAC5578 做 Vg 闭环校准到目标静态电流——这意味着即便 16 路 GaN 功放一致性参差不齐，也能在开机时自动校准到统一工作点。Thermal 方面则用 ADS7830 读 8 个热敏电阻，任一通道超温即通过单个 GPIO（EN_DIS_COOLING）拉起散热风扇。

### FPGA 信号处理流水线

XC7A50T 是整机的「大脑」，承担从波形生成到检测的全部实时计算：

```
LFM Chirp 生成 (DAC)
   → 原始 ADC 数据读取
   → 混合式自动增益控制 AGC (FPGA/STM32/GUI 跨层闭环)
   → I/Q 基带下变频
   → 抽取与滤波 (CIC/FIR)
   → 前向 FFT
   → 脉冲压缩
   → 多普勒 / MTI / CFAR 处理
   → USB 接口上报
```

脉冲压缩（Pulse Compression）是 LFM 雷达的灵魂：发射宽脉冲保证平均功率，接收时通过匹配滤波把宽脉冲「压」成窄脉冲，从而在维持探测距离的同时获得高距离分辨率。MTI 通过滤除静止杂波（地物、建筑）凸显运动目标，CFAR 则在噪声基底上自适应设定门限，避免虚警率失控。

### 处理流水线分层

整个系统按「波形→变频→波束→信号处理→系统管理→可视化」六层展开：

1. **波形生成**：DAC 产生 LFM 啁啾信号。
2. **上/下变频**：LTC5552 完成频率搬移。
3. **波束赋形**：ADAR1000 控制 16 阵元相位。
4. **FPGA 信号处理**：原始采集 → I/Q 下变频 → 抽取滤波 → 脉冲压缩 → 多普勒/MTI/CFAR。
5. **STM32 系统管理**：电源时序、外设配置、GPS/IMU、步进电机。
6. **Python GUI 可视化**：实时目标绘制、地图集成、雷达控制。

GPS 模块（UM982）用于 GUI 地图居中和每次探测的坐标打标，GY-85 IMU 负责俯仰/横滚姿态校正，让移动平台上的目标坐标依然准确。

## 三、安装与快速开始

### 环境要求

- 雷达原理基础认知
- PCB 焊接与装配经验（硬件构建）
- Python 3.8+（GUI 软件）
- Vivado 等 FPGA 开发工具（如需修改信号处理）

### 硬件装配步骤

仓库遵循「干净根目录」策略，生成物按类型归位（`docs/` 放发布报告、`5_Simulations/generated/` 放仿真产物、`9_Firmware/9_2_FPGA/reports/` 放 FPGA 产物），源码结构清晰：

1. **下单 PCB**：生产文件位于 `/4_Schematics and Boards Layout/4_7_Production Files`。
2. **采购元件**：BOM/CPL 文件同目录提供。
3. **装配**：结合 `/4_6_Schematics` 原理图与 4_7 生产文件焊接（目前暂无独立装配手册）。
4. **天线**：按目标版本选对应阵列文件。
5. **外壳**：机械图纸位于 `/8_Utils/Mechanical_Drawings`。

软件侧仅 `pyproject.toml` 可见（其余 GUI 在 V7 PyQt6 / V65 Tk 分支维护），其依赖组暴露了工程气质：

```toml
[dependency-groups]
dev = [
    "ruff>=0.5", "pytest>=8",
    "numpy>=1.26", "h5py>=3.10",
]
```

Ruff 的 lint 规则（B/SIM/ARG/ERA/A/BLE/RET 等）明显是「防 LLM 生成垃圾代码」的配置——禁用裸 except、未使用参数、注释掉的备选方案、print 调试残留，对一个主打「可被社区 fork 修改」的项目来说相当务实。

## 四、使用方法与实战

### 最简运行思路

装配完成上电后，STM32 先做电源时序（按 Power Management Excel 中的顺序），再初始化时钟发生器、两路 ADF4382、四路 ADAR1000，然后 FPGA 接管。用户通过 Python GUI：

- 设置扫描扇区与波束指向角（±45° 电子 + 360° 机械）
- 实时查看目标在地图上的回波点
- 调整脉冲参数、观察脉冲压缩与多普勒处理结果

### 进阶方向

仓库明确欢迎以下贡献，也暗示了实战中最稀缺的能力：

- **射频工程师**：评审天线设计、优化阵列性能
- **FPGA 开发者**：优化信号处理流水线（如把 CIC/FIR 抽取率、FFT 点数调优）
- **软件开发者**：增强 Python GUI 与 SDK
- **Beta 测试者**：高校研究者、无人机初创、资深 maker

## 五、常见问题与解决方案

- **装配类失败**：缺少独立装配手册——建议严格对照 `/4_6_Schematics` 原理图逐项焊接，并优先用 3km 的 AERIS-10N（8×16 贴片阵列）版本试手，难度低于 32×16 波导版。
- **16 路功放一致性差**：项目已用 Idq 采样 + Vg 闭环校准在开机时统一工作点；若某路过热，EN_DIS_COOLING 会自动启风扇，排查时先看 8 路热敏电阻读数。
- **波束指向不准**：移动平台需依赖 GY-85 IMU 做俯仰/横滚校正，固定部署则靠 UM982 GPS 做地图居中，两者未正确接入会导致坐标偏移。
- **高功率射频合规**：硬件采用 CERN-OHL-P（而非最初 MIT）正是因为物理硬件需要更强的责任限定与专利保护，改造/销售时务必保留原始版权声明并以相同许可分发修改。

## 六、总结

AERIS-10 最让人兴奋的不是「参数多漂亮」，而是它把一套相当完整的相控阵雷达——从 10.5GHz 频率合成、ADAR1000 波束赋形、XC7A50T 实时脉冲压缩，到 STM32 电源/外设管理、Python 地图 GUI——全部摊开给你看、给你改。对高校雷达教学、无人机避障/感知、以及想亲手理解「雷达到底怎么工作」的工程师，它是一份罕见的开源教材。项目仍在 Alpha、部分功能 WIP，但 19,000 star 已经说明：工程师想「自己造」，而不是只「买现成的」。
