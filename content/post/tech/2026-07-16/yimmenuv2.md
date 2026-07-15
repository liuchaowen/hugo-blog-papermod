---
title: "YimMenuV2：面向 GTA 5 Enhanced 的实验性注入式菜单框架"
date: 2026-07-16
description: "YimMenuV2 是 GitHub Trending 上的开源项目，一个为 GTA 5: Enhanced 打造的实验性注入式菜单框架。本文从 CMake 工程结构、C++23 特性、LuaJIT 脚本化、MinHook 钩取与 ImGui 渲染等技术角度，拆解其架构设计与快速上手方式。"
author: "Cheman"
slug: yimmenuv2
draft: false
categories: [技术, 开源, 游戏逆向]
tags: [GTA5, 游戏逆向, C++, LuaJIT, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**YimMenuV2**，一个为 GTA 5: Enhanced（增强版）打造的实验性注入式菜单框架。它并不只是“外挂工具”，更是一个用现代 C++23 构建、可脚本化扩展的游戏内存修改与界面注入工程，值得从工程化角度一探究竟。

## 一、项目概述

YimMenuV2 是 YimMenu 团队推出的第二代菜单项目，目标是为 GTA 5 的 Enhanced 版本提供一个**模块化、可扩展、注重性能与易用性**的注入式运行环境。用户通过外部注入器将编译好的 `YimMenuV2.dll` 注入到游戏进程，在游戏主菜单界面唤起一个基于 ImGui 的悬浮操作面板，从而对游戏运行时的内存、状态与行为进行读取与修改。

核心特性可归纳为四点：

- **现代 C++ 基座**：全面采用 C++23 标准，配合预编译头（PCH）提升编译速度。
- **脚本化扩展**：内置 LuaJIT，允许用 Lua 编写扩展逻辑，降低二次开发门槛。
- **轻量界面**：基于 Dear ImGui 绘制零侵入式悬浮菜单，开箱即用。
- **模块化依赖**：通过 CMake 统一管理 AsyncLogger、MinHook、nlohmann_json 等第三方库。

## 二、技术原理

### 工程结构与编译系统

整个项目以 CMake 作为构建系统，最低要求 `cmake_minimum_required(VERSION 3.20.x)`，并支持交叉编译（通过 `cmake/cross-compile.cmake`）。核心工程声明如下：

```cmake
project(YimMenuV2 VERSION 0.0.1 DESCRIPTION "A new base using new C++ features optimised for speed and ease of use")

# libs
include(cmake/async-logger.cmake)
include(cmake/imgui.cmake)
include(cmake/json.cmake)
include(cmake/minhook.cmake)
include(cmake/luajit.cmake)
```

源码采用递归收集策略，统一将 `src` 目录下的 `.hpp` / `.cpp` 纳入构建：

```cmake
set(SRC_DIR "${PROJECT_SOURCE_DIR}/src")
file(GLOB_RECURSE SRC_FILES
    "${SRC_DIR}/**.hpp"
    "${SRC_DIR}/**.cpp"
)
add_library(${PROJECT_NAME} MODULE ${SRC_FILES})
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 23)
```

值得注意的几点：

1. **产出物是 `MODULE` 动态库（DLL）**，这正是“注入式”形态——它不以独立进程运行，而是被加载到 GTA 5 进程空间中，与其共享地址空间，从而直接读写游戏内存。
2. **预编译头优化**：`target_precompile_headers(${PROJECT_NAME} PUBLIC "${SRC_DIR}/common.hpp")` 将公共头文件 `common.hpp` 预编译，缩短巨型工程迭代编译时间。
3. **编译宏约束**：`_CRT_SECURE_NO_WARNINGS`、`WIN32_LEAN_AND_MEAN`、`NOMINMAX` 是典型 Windows 原生开发的“去噪音”配置，避免 CRT 安全告警与 Windows.h 宏污染。

### 核心技术栈与选型理由

从链接的库可以反推其技术职责划分：

| 依赖 | 作用 |
| --- | --- |
| **ImGui** + `d3dcompiler` / `dwmapi` / `gdi32` | 绘制悬浮 UI，借助 DWM/GDI 实现覆盖层渲染 |
| **MinHook** | 运行时函数钩取（inline hook），劫持游戏关键调用 |
| **nlohmann_json** | 配置与数据的序列化/反序列化 |
| **LuaJIT** | 嵌入式脚本引擎，支撑可热更新的扩展逻辑 |
| **AsyncLogger** | 异步日志，避免 I/O 阻塞游戏主线程 |
| **dbghelp** | 符号/调试辅助 |

`target_link_libraries` 中有一段条件分支尤为精妙：

```cmake
$<IF:$<BOOL:${CROSSCOMPILE}>,d3dcompiler_47,d3dcompiler>
```

这是在交叉编译（非原生 Windows 工具链）时链接 `d3dcompiler_47.lib`，原生编译时则链接系统 `d3dcompiler.lib`，体现了工程对多工具链环境的兼容设计。

### 数据流分析

YimMenuV2 的运行数据流大致为：

1. 注入器将 `YimMenuV2.dll` 载入 GTA 5 进程 → DllMain / 模块入口初始化各子系统；
2. LuaJIT 加载脚本扩展，ImGui 初始化覆盖层；
3. MinHook 在游戏关键函数处安插钩子，拦截并改写运行时行为；
4. 用户在 ImGui 面板中操作 → 触发 Lua/原生逻辑 → 通过内存读写或钩子改写入游戏状态；
5. AsyncLogger 异步落盘运行日志，dbghelp 在异常时辅助定位。

## 三、安装与快速开始

### 环境要求

- Windows 平台 + Rockstar / Steam / Epic 版 GTA 5: Enhanced
- 一个 DLL 注入器（官方推荐 [Xenos Injector](https://www.unknowncheats.me/forum/general-programming-and-reversing/124013-xenos-injector-v2-3-2-a.html)）
- 可选但强烈建议：[FSL（本地 GTAO 存档）](https://www.unknowncheats.me/forum/grand-theft-auto-v/616977-fsl-local-gtao-saves.html)

### 安装步骤

1. 下载最新版 **FSL**，将 `version.dll` 放入 GTA V 根目录（用于把账号存档重定向到本地磁盘，提升账号安全）；
2. 从 [GitHub Releases (nightly)](https://github.com/YimMenu/YimMenuV2/releases/tag/nightly) 下载 YimMenuV2；
3. 下载注入器（如 Xenos）；
4. 打开 Rockstar Launcher，选中 GTA 5 Enhanced，在设置中**关闭 BattlEye**（Steam / Epic 版本需额外加 `-nobattleye` 启动参数）；
5. 启动游戏，在主菜单界面用注入器将 `YimMenuV2.dll` 注入。

### 唤起菜单

按 **`INSERT`** 键或 **`Ctrl + \`** 即可打开操作面板。

## 四、使用方法与实战

基础用法就是从面板中按需开启各项功能。进阶玩家可以通过 LuaJIT 脚本编写自定义逻辑：项目在 CMake 中直接纳入 `luajit` 源树（`cmake/luajit.cmake`），意味着脚本扩展与核心代码共享同一进程上下文，可深度调用内部接口。

实战注意点：

- **FSL 与存档隔离**：FSL 会把账号存档重定向到本地文件，使用 FSL 期间产生的进度，只有在 FSL 启用时才可见。若想完全脱离 FSL，也可不使用它，但不推荐。
- **移除 FSL 后游戏无法启动**：这是已知问题，删除 `Documents/GTAV Enhanced/Profiles` 目录即可修复。

## 五、常见问题与解决方案

**1. 每隔五分钟就被公共战局踢出（desync）？**
项目目前**没有 BattlEye 绕过**，正规主机方会因心跳（heartbeat）失败最终将你移除。现阶段除使用真正的（私有）绕过方案外，无解。

**2. 移除 FSL 后所有进度消失？**
FSL 将存档重定向到本地磁盘，因此用 FSL 时的进度仅在 FSL 启用时可见。若不想如此，可不用 FSL（但不推荐）。

**3. 移除 FSL 后游戏无法启动？**
删除 `Documents/GTAV Enhanced/Profiles` 目录即可解决。

**4. 注入失败 / 菜单不弹出？**
确认已正确关闭 BattlEye（Rockstar 设置内关闭，Steam/Epic 加 `-nobattleye`），并在**主菜单界面**而非加载中注入。

## 六、总结

YimMenuV2 把一个“游戏菜单”做成了工程化的现代 C++ 项目：C++23 基座、CMake 统一依赖、LuaJIT 脚本化、ImGui 覆盖层与 MinHook 运行时钩取各司其职，模块边界清晰。无论你是对 Windows 注入技术、图形覆盖层渲染，还是对大型 C++ 工程的构建系统感兴趣，它都提供了一个可阅读、可编译、可扩展的实战样本。当然，任何内存修改类工具都伴随账号与合规风险，使用前务必了解所在平台的规则与责任边界。
