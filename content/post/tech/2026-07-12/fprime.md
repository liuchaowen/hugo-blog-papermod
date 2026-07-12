---
title: "F Prime：NASA 开源的航天飞行软件框架，让小卫星也能拥有「大脑」"
date: "2026-07-12"
description: "F Prime 是 NASA JPL 开发的开源飞行软件框架，专为 CubeSat、SmallSat 及小型航天器设计，提供组件化架构、C++ 运行时、建模工具和完整测试体系，大幅降低航天嵌入式软件开发门槛。"
author: "Cheman"
slug: fprime
draft: false
categories: ["技术", "开源", "航天"]
tags: ["NASA", "开源", "飞行软件", "嵌入式", "C++", "航天"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**F Prime**，NASA JPL 出品的开源飞行软件框架，专为小卫星、立方星和航天仪器打造——让嵌入式航天软件的开发变得像搭积木一样高效。

## 一、项目概述

F´（F Prime）是由 NASA 喷气推进实验室（JPL）开发的组件化飞行软件框架，已在多个真实航天任务中经过飞行验证。项目最初针对小规模航天系统（CubeSat、SmallSat、仪器载荷），但其设计理念同样适用于其他嵌入式场景。

**核心能力一览：**

- **组件化架构**：将飞行软件拆分为离散的、接口明确的组件，降低耦合度
- **C++ 运行时框架**：提供消息队列、线程管理等核心能力，开箱即用
- **建模工具**：通过图形化方式描述组件和连接，自动生成代码
- **组件库**：持续增长的即用型组件集合，避免重复造轮子
- **测试工具链**：支持单元测试和集成测试，覆盖软件全生命周期

## 二、技术原理

### 2.1 组件驱动架构

F Prime 的核心是组件（Component）。每个组件拥有：
- **输入端口（Input Ports）**：接收外部消息
- **输出端口（Output Ports）**：发送消息给其他组件
- ** Commands**：远程调用接口
- ** Events**：记录状态变化
- ** Telemetry（Telemetry）**：遥测数据通道

这种设计借鉴了 NASA 数十年的航天软件工程经验，通过严格的接口定义实现组件间的解耦，使测试可以独立进行。

### 2.2 C++ 运行时

核心运行时基于标准 C++，依赖极为轻量。从 `CMakeLists.txt` 可以看出其编译策略：

```cmake
cmake_minimum_required(VERSION 3.18)
project(FPrime C CXX)

add_compile_options(
    $<$<COMPILE_LANGUAGE:CXX>:-Wold-style-cast>
    -pedantic
    -Wall
    -Wextra
    -Wconversion
    -Wdouble-promotion
    -Wshadow
    -Werror
    -Wno-unused-parameter
    -Wno-vla
)
```

编译选项极为严格（`-Werror` 开启），保证了代码质量。`-Wno-unused-parameter` 和 `-Wno-vla` 是为特定工程需求所做的务实取舍。

### 2.3 FPP 建模语言

F Prime 使用 FPP（ F Prime PorT）领域特定语言描述组件规格：

```fpp
module MyComponent {
    @ Input port for receiving data
    port DataIn

    @ Output port for sending result
    port ResultOut

    @ Command to start processing
    async command START(opArg: U32)

    @ Telemetry channel
    telemetry PacketSize: U32 id 10
}
```

通过 FPP 文件，建模工具自动生成 C++ 骨架代码，开发者只需填充业务逻辑。

## 三、安装与快速开始

### 3.1 环境要求

- Linux / macOS / Windows + WSL
- Python 3.10+（含 venv 和 pip）
- Git
- Clang 或 GCC/G++ 编译器

```bash
# 验证环境
python --version    # ≥ 3.10
g++ --version
git --version
```

### 3.2 一键安装

```bash
pip install fprime-bootstrap
```

### 3.3 创建第一个项目

```bash
fprime-bootstrap project
```

项目初始化后，会自动生成标准 F Prime 项目结构，包含：
- `F Prime.cmake`：CMake 构建配置
- `Components/`：组件目录
- `Top/`：系统顶层配置
- `test/`：测试代码

### 3.4 运行 HelloWorld 教程

参考官方 [HelloWorld 教程](https://fprime.jpl.nasa.gov/latest/tutorials-hello-world/docs/hello-world/)，从零开始完整走一遍组件开发流程。

## 四、使用方法与实战

### 4.1 开发工作流

```
FPP 建模 → 代码生成 → 实现业务逻辑 → 单元测试 → 集成测试 → 部署
```

### 4.2 常用命令

```bash
# 构建项目
fprime-util generate
fprime-util build

# 运行单元测试
fprime-util test

# 运行 GDS（地面数据系统）可视化界面
fprime-gds
```

### 4.3 已有组件生态

F Prime 社区（fprime-community）维护了大量第三方组件，覆盖通信、姿态控制、电源管理等领域，无需从零开发。

## 五、常见问题与解决方案

**Q：macOS 上编译报错找不到 clang？**
A：安装 Xcode Command Line Tools：`xcode-select --install`，或手动安装 Homebrew 版 gcc/g++ 并设置 `CC`/`CXX` 环境变量。

**Q：Python 依赖安装失败（Python 3.13+）？**
A：requirements.txt 中有条件依赖 `legacy-cgi`：`legacy-cgi==2.6.1; python_version >= "3.13"`，确保 pip 已是最新版本：`pip install --upgrade pip`。

**Q：fprime-bootstrap 命令找不到？**
A：确保虚拟环境已激活，或使用 `python -m fprime_bootstrap` 替代直接命令调用。

**Q：Windows 下无法构建？**
A：F Prime 官方推荐使用 **WSL（Windows Subsystem for Linux）**，原生 Windows 构建支持有限。

**Q：CMake 版本过低？**
A：`cmake_minimum_required(VERSION 3.18)` 要求 CMake ≥ 3.18，Ubuntu 22.04 以下用户需手动升级 CMake。

## 六、总结

F Prime 将 NASA 数十年航天软件工程积累凝结为一个开源框架，对于想进入航天嵌入式领域或开发高可靠性嵌入式系统的开发者来说，是一个极佳的学习和实践起点。其组件化思想、严格的代码质量控制和完整的工具链，即便在航天以外的嵌入式领域也极具参考价值。

如果你的下一个项目需要可靠的嵌入式架构，不妨先从 HelloWorld 教程开始感受 F Prime 的设计哲学。

---

**项目地址：** [https://github.com/nasa/fprime](https://github.com/nasa/fprime)  
**官方文档：** [https://fprime.jpl.nasa.gov](https://fprime.jpl.nasa.gov/)
