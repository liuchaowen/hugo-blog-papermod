---
title: "SharpEmu — 一个实验性的 PlayStation 5 模拟器"
date: 2026-07-15
description: SharpEmu 是一个从零开发的实验性 PlayStation 5 模拟器，基于 C#/.NET SDK，已能加载真实游戏 eboot.bin 文件并部分运行《恶魔之魂》等游戏。
author: Cheman
slug: sharpemu
draft: false
tags:
  - GitHub Trending
  - C#
categories:
  - 开源项目
  - 技术博客
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

今天在 GitHub Trending 上看到一个有意思的项目：

**SharpEmu**，一个从零开发的实验性 PlayStation 5 模拟器

## 一、项目概述

SharpEmu 是一个从零开发的实验性 PlayStation 5 模拟器，基于 C#/.NET SDK，目前处于早期开发阶段。项目主要面向研究与教育目的，不含商业目标，也不支持盗版。

目前模拟器已能加载真实游戏的 `eboot.bin` 文件、执行原生 CPU 指令，并部分处理内核相关功能。部分游戏（如《恶魔之魂》）已能进入视频输出阶段，Shader 资源也已支持向 SPIR-V/Vulkan 格式转换。

**GitHub：** https://github.com/par274/sharpemu  
**语言：** C#

## 二、核心特性

- 基于 C# 从零开发的 PlayStation 5 模拟器
- 支持加载真实游戏的 eboot.bin / .elf 文件
- 已适配《恶魔之魂 重制版》《寂静岭：短影》《Poppy Playtime》等游戏
- Shader 资源支持 SPIR-V/Vulkan 转换
- 项目纯为研究与教育目的，无商业目标
- 跨平台支持（Windows/Linux/macOS，初期主力开发 Windows）

## 三、技术实现

项目基于 .NET SDK 开发，采用模块化架构，核心技术点包括：

| 组件 | 说明 |
|------|------|
| eboot.bin 加载器 | 解析 PS5 可执行文件格式 |
| CPU 指令执行器 | 原生指令执行引擎 |
| 内核模块加载 | 加载 prx / sys_module |
| AMPR / Fiber | PS5 地址空间管理 |
| PlayGo 场景 | 游戏分块加载机制 |
| SPIR-V 转换 | Shader 编译到 Vulkan |

### 快速开始

```bash
# 1. 安装 .NET SDK
# 2. 克隆项目
git clone https://github.com/par274/sharpemu.git
# 3. 编译
dotnet build
# 4. 运行 GUI
dotnet run
```

```powershell
# 或命令行方式
.\SharpEmu "eboot.bin" 2>&1 | Tee-Object -FilePath "log.txt"
```

## 四、适用场景

- 研究与学习游戏主机架构与逆向工程技术
- 了解 PlayStation 5 系统内部实现原理
- 参与开源模拟器项目的开发与社区贡献
- 学习 C# 在系统级编程和模拟器开发中的应用

## 五、总结

SharpEmu 是 GitHub Trending 上的热门开源 PlayStation 5 模拟器项目，采用 C# 从零开发，目前处于早期实验阶段。项目架构清晰、社区活跃，已在《恶魔之魂》《寂静岭》等游戏中取得了实质性进展，值得持续关注。

> 🔗 项目地址：https://github.com/par274/sharpemu
