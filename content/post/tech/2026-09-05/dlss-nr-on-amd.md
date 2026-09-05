---
title: "在 AMD 显卡上跑 DLSS 5 神经渲染：DLSS-NR-on-AMD 深度解析"
date: 2026-09-05T17:05:00+08:00
description: "DLSS-NR-on-AMD 项目让 AMD Radeon RX 9000/7000 系列显卡也能用上 NVIDIA DLSS 5 神经渲染技术，通过拦截 FSR API 实现 DLSS 替换，在赛博朋克 2077 等游戏中获得接近原生 DLSS 的画质提升。"
author: "Cheman"
draft: false
tags: ["DLSS", "AMD", "神经渲染", "游戏优化", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个引爆硬件圈的项目：**DLSS-NR-on-AMD**，它让 AMD 显卡用户也能体验到 NVIDIA DLSS 5 神经渲染技术的画质提升，堪称显卡跨品牌技术适配的典范。

## 一、项目概述

**DLSS-NR-on-AMD** 是由开发者 danielblnc 开发的一个开源工具，核心目标是在 AMD Radeon RX 9000（RDNA4）和 7000（RDNA3）系列显卡上运行 NVIDIA DLSS 5 神经渲染（Neural Rendering）技术。

### 核心特性

- **跨品牌 DLSS 支持**：在 AMD 显卡上实现 DLSS 5 神经渲染，打破 NVIDIA 独占
- **兼容广泛**：支持任何使用 FSR 的 DirectX 12 游戏
- **简单易用**：只需一个 exe 安装器 + DLSS DLL 文件即可完成配置
- **实时调整**：内置游戏内覆盖层，支持运行时参数调节
- **可逆安装**：支持随时更新或卸载，不留残留

项目在 GitHub 上迅速获得超过 500 颗 Star，反映了 AMD 玩家对 DLSS 技术的强烈需求。

## 二、技术原理

### 架构设计

这个项目的核心思路是 **API 拦截与替换**：

1. **目标 API**：游戏的 FSR（FidelityFX Super Resolution）调用接口
2. **替换内容**：将 FSR 的升采样逻辑替换为 DLSS 5 的神经渲染管线
3. **实现方式**：通过 DLL 注入和 API Hook，在游戏调用 FSR 时重定向到 DLSS 处理路径

### 核心技术栈

- **DirectX 12 拦截**：在 DX12 渲染管线中插入 DLSS 处理节点
- **DLL 代理**：使用 `nvngx_dlssnr.dll`（DLSS 5 神经渲染库）作为后端
- **安装器机制**：通过 `dlssnr_on_amd_setup.exe` 自动完成 DLL 部署和注册

### 关键技术细节

项目需要用户提供自己的 `nvngx_dlssnr.dll`（版本 310.8.0.0），这个 DLL 来自支持 DLSS 5 的游戏。项目本身**不包含任何 NVIDIA 代码**，只是做接口适配和调用转发。

### 数据流分析

```
游戏渲染管线
  │
  ├─ 游戏启用 FSR
  │
  ├─ DLSS-NR-on-AMD 拦截 FSR API 调用
  │
  ├─ 重定向到 nvngx_dlssnr.dll
  │    ├─ 神经网络推理（超分辨率）
  │    ├─ 光线重建（Ray Reconstruction）
  │    └─ 帧生成（Frame Generation）
  │
  └─ 输出渲染结果到游戏
```

### 性能表现

目前性能仍在优化中：在 RX 9070 XT 上 1080p 分辨率大约 31 FPS。开发者的目标是让性能达到 RTX 5070 Ti 的水平，每次更新都在持续改进。

## 三、安装与快速开始

### 环境要求

| 要求 | 详情 |
|------|------|
| 操作系统 | Windows 11 |
| 显卡 | AMD Radeon RX 9000 系列（已测试 9070 XT）或 RX 7000 系列 |
| 驱动 | Adrenalin 26.1.1 或更高版本 |
| 游戏要求 | DirectX 12 + FSR 支持 |
| 必备文件 | `nvngx_dlssnr.dll` v310.8.0.0（自备） |

### 安装步骤

1. **下载安装器**：从 GitHub Releases 页面获取 `dlssnr_on_amd_setup.exe`

2. **放置文件**：将安装器放到游戏 exe 所在目录（例如赛博朋克 2077 的 `bin\x64`）

3. **准备 DLSS DLL**：将 `nvngx_dlssnr.dll` 放在同一目录下

4. **运行安装器**：双击运行 `dlssnr_on_amd_setup.exe`，按提示操作

5. **启动游戏**：在游戏中**启用 FSR**（FSR 3/FSR 4 任意质量等级均可），按 **End** 键打开覆盖层确认 DLSS 已激活

### 卸载与更新

再次运行 `dlssnr_on_amd_setup.exe`，选择：
- **U** — 更新到新版本
- **R** — 移除安装

## 四、使用方法与实战

### 基础用法

安装完成后，在支持 FSR 的游戏中启用 FSR 即可自动激活 DLSS 神经渲染。按 **End** 键打开游戏内覆盖层：

| 覆盖层选项 | 说明 |
|-----------|------|
| Mode | 渲染模式：inline（内联）/ async（异步，仅照片模式） |
| Tone intensity | 色调强度调节 |
| Structure intensity | 结构强度调节 |
| Skin structure | 皮肤结构调节 |

使用方向键调整参数，Enter 键切换开关。

### 已测试游戏

- **Cyberpunk 2077**（赛博朋克 2077）— 主要测试平台
- **GTA V Enhanced**（GTA V 增强版）— 已验证可用

### 进阶场景

#### 在 RX 7000 系列上使用

RX 7000（RDNA3）理论上应该兼容，但开发者呼吁更多用户测试并反馈 `dlssnr_on_amd.log` 日志，以帮助改进兼容性。

#### 反作弊游戏注意事项

带反作弊系统的游戏会阻止 DLL 加载，因此**只能在反作弊关闭的游戏中使用**。这是目前的主要限制之一。

## 五、常见问题与解决方案

### Q: 安装后游戏没有变化？

确保已在游戏设置中**启用 FSR**。DLSS-NR-on-AMD 是通过替换 FSR 路径来工作的，如果 FSR 没开启，拦截不会生效。

### Q: 提示找不到 nvngx_dlssnr.dll？

需要从支持 DLSS 5 的游戏中获取该文件（版本 310.8.0.0）。项目本身不提供此 DLL，需用户自备。

### Q: RX 6000 或更老的显卡能用吗？

目前不支持。项目依赖 RDNA3/RDNA4 架构的特定硬件特性，老旧 GPU 架构不兼容。

### Q: 性能比原生 FSR 差？

DLSS 神经渲染的计算量更大，目前性能仍在优化中。开发者表示每次更新都在改进，目标是追平 RTX 5070 Ti 的表现。

### Q: Vulkan 游戏支持吗？

Vulkan 支持正在计划中，目前仅支持 DirectX 12。

## 六、总结

DLSS-NR-on-AMD 是一个极具技术勇气的开源项目，它打破了 DLSS 技术的硬件壁垒，让 AMD 显卡用户也能享受 NVIDIA 最新的神经渲染成果。虽然性能仍在优化、兼容性还需扩展，但项目展示了一种可行的跨品牌技术适配路径。

对于持有 RX 9000/7000 系列显卡的玩家来说，这无疑是提升游戏画质的一个值得尝试的方案。项目开源透明、安装简便、可逆操作，值得一试。

**项目地址**：[https://github.com/danielblnc/DLSS-NR-on-AMD](https://github.com/danielblnc/DLSS-NR-on-AMD)

**支持开发者**：[ko-fi.com/danielblnc](https://ko-fi.com/danielblnc)
