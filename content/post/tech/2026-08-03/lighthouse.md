---
title: "Lighthouse：经典游戏《班卓熊大冒险》的现代重生"
date: 2026-08-03
description: "Lighthouse 是 HarbourMasters 团队开发的《班卓熊大冒险》现代化移植项目，基于 libultraship 引擎重新编译，支持多平台运行、高分辨率渲染、MOD 扩展和自定义资源，让这款经典 N64 游戏在现代硬件上焕发新生。"
author: "Cheman"
slug: lighthouse
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "游戏开发", "N64", "逆向工程", "开源项目"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Lighthouse**，这是经典 N64 游戏《班卓熊大冒险》的现代化重新编译项目，让玩家能在现代硬件上以高画质重温这款经典之作。

## 一、项目概述

Lighthouse 是 HarbourMasters 团队开发的《班卓熊大冒险》现代化移植项目，类似于著名的 Ship of Harkinian（《塞尔达传说：时之笛》重编译项目）。项目通过逆向工程和重新编译技术，将原本只能在 N64 平台上运行的游戏，移植到 Windows、macOS、Linux 等现代平台。

### 核心特性

- **多平台支持**：Windows、macOS、Linux 全平台覆盖
- **现代渲染引擎**：支持 DirectX 11、OpenGL、Metal 三种图形后端
- **高分辨率渲染**：突破 N64 原生分辨率限制
- **MOD 支持**：支持 ROMhack、自定义资源包（.o2r/.otr 格式）
- **多语言支持**：通过不同区域的 ROM 实现多语言包
- **原生控制器支持**：自动识别主流手柄，内置按键映射工具

### 项目定位

这不是一个模拟器，而是通过逆向工程重新编译的"原生移植"。通过反编译 N64 游戏的二进制代码，将其转换为可读的 C 代码，再使用现代工具链重新编译，实现对原版游戏的完美还原，同时具备现代特性。

## 二、技术原理

### 架构设计

Lighthouse 基于 **libultraship** 引擎构建，这是一个专门用于 N64 游戏重编译的框架。整体架构分为三层：

```
┌─────────────────────────────────────┐
│         Game Layer (Banjo)          │  ← 游戏逻辑层
├─────────────────────────────────────┤
│       libultraship Engine            │  ← 引擎抽象层
├─────────────────────────────────────┤
│  Platform Layer (Windows/macOS/Linux)│  ← 平台适配层
└─────────────────────────────────────┘
```

**libultraship** 提供了 N64 硬件的软件抽象，包括：
- 图形渲染（Fast3D → OpenGL/DX11/Metal）
- 音频处理（N64 AI → 现代音频 API）
- 输入系统（Controller → SDL2）
- 文件系统（ROM → O2R/OTR 资源包）

### 核心技术栈

从 `CMakeLists.txt` 可以看出项目的构建体系：

```cmake
# 项目使用 CMake 构建系统
cmake_minimum_required(VERSION 3.26.0 FATAL_ERROR)
project(Lighthouse VERSION 1.0.0 LANGUAGES C CXX ASM)

# C++20 标准
set(CMAKE_CXX_STANDARD 20 CACHE STRING "The C++ standard to use")

# 依赖的关键库
vcpkg_install_packages(
    zlib bzip2 libzip libpng 
    sdl2 glew glfw3 
    nlohmann-json tinyxml2 spdlog 
    libogg libvorbis
)
```

**关键技术选型：**

1. **SDL2**：跨平台窗口创建、输入处理、音频播放
2. **OpenGL / DirectX 11 / Metal**：三种图形后端，适配不同平台
3. **spdlog**：现代 C++ 日志库
4. **nlohmann-json**：配置文件解析
5. **libogg / libvorbis**：Ogg Vorbis 音频解码

### 资源提取与打包

Lighthouse 不包含任何版权资产，用户需要提供合法的 N64 ROM。项目使用 **Torch** 工具提取和打包资源：

```cmake
# Torch 资产提取工具
ExternalProject_Add(TorchExternal
    SOURCE_DIR ${CMAKE_SOURCE_DIR}/Torch
    CMAKE_ARGS -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/Torch
)

# 提取 ROM 到 O2R 格式
add_custom_target(ExtractAssets
    DEPENDS TorchExternal
    COMMAND ${TORCH_EXECUTABLE} o2r baserom.z64
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "bk.o2r" "${CMAKE_BINARY_DIR}/bk.o2r"
)
```

**O2R/OTR 格式**：这是 libultraship 定义的资源包格式，将 N64 ROM 中的资产（纹理、模型、音频、关卡数据）提取并重新打包，支持压缩和加密。

### 图形渲染管线

从 N64 原生的 Fast3D 微码到现代图形 API 的转换：

```cpp
// 原版 N64 使用 Fast3D 微码
add_compile_definitions(
    F3DEX_GBI=1        // Fast3D 显示列表
    GBI_FLOATS=1       // 浮点数支持
)

// 现代渲染后端选择
// Windows: DirectX 11 (id=1) 或 OpenGL (id=2)
// macOS: Metal (id=3) 或 OpenGL (id=2)
// Linux: OpenGL (id=2)
```

**渲染流程：**
1. N64 Display List → Fast3D 解析器
2. 顶点数据转换为现代顶点缓冲区
3. 纹理从 N64 TMEM 格式解码为 PNG/BC7
4. 通过 OpenGL/DX11/Metal 提交到 GPU

### 语言包系统

一个巧妙的设计：利用不同区域的 ROM 作为语言包：

```markdown
# 语言包支持
- PAL ROM：支持英语、法语、德语
- NTSC-J ROM：支持日语
- NTSC-U ROM：美版英语（基准）
```

用户可以加载多个 ROM，Lighthouse 自动提取对应语言的文本和音频资源，实现无缝切换。

## 三、安装与快速开始

### 环境要求

- **操作系统**：Windows 10+ / macOS 10.15+ / Ubuntu 20.04+
- **GPU**：支持 OpenGL 3.3 / DirectX 11 / Metal 的显卡
- **存储空间**：约 200MB（不含 ROM）
- **必需资源**：合法的《班卓熊大冒险》N64 ROM（.z64 格式）

### 安装步骤

#### 1. 验证 ROM

Lighthouse 支持以下 ROM 版本：

| 文件名 | 区域 | SHA-1 校验码 |
|--------|------|--------------|
| baserom.us.v10.z64 | 北美 v1.0 | `1fe1632098865f639e22c11b9a81ee8f29c75d7a` |
| baserom.us.v11.z64 | 北美 v1.1 | `ded6ee166e740ad1bc810fd678a84b48e245ab80` |
| baserom.jp.z64 | 日本 | `90726d7e7cd5bf6cdfd38f45c9acbf4d45bd9fd8` |
| baserom.pal.z64 | 欧洲 | `bb359a75941df74bf7290212c89fbc6e2c5601fe` |

验证方法：访问 [ROM Hash Calculator](https://www.romhacking.net/hash/) 上传 ROM 文件，核对 SHA-1 值。

#### 2. 格式转换（如需要）

如果 ROM 是 `.n64` 格式，需转换为 `.z64`：

```bash
# 使用 Byte Swapper 工具
# 下载地址: https://hack64.net/tools/swapper.php
```

#### 3. 下载 Lighthouse

从 [Releases 页面](https://github.com/HarbourMasters/Lighthouse/releases) 下载对应平台的压缩包。

#### 4. 首次运行

**Windows：**
```bash
# 解压所有文件到同一目录
unzip Lighthouse-windows.zip
# 运行 lighthouse.exe，选择 ROM 文件
./lighthouse.exe
```

**macOS：**
```bash
# 解压后运行
./lighthouse
# 首次可能需要授权：系统偏好设置 → 安全性与隐私 → 允许运行
```

**Linux：**
```bash
# 添加执行权限
chmod +x lighthouse.appimage
# 运行并选择 ROM
./lighthouse.appimage
```

首次启动时，Lighthouse 会自动从 ROM 中提取资源并生成 `bk.o2r` 文件，约需 1-2 分钟。

### 最简运行示例

成功启动后，你会看到：

```
✓ 资源提取完成：bk.o2r (约 64MB)
✓ 图形后端：Metal (macOS) / DirectX 11 (Windows) / OpenGL (Linux)
✓ 音频设备检测成功
✓ 控制器检测：DualSense / Xbox Controller / 键盘
```

## 四、使用方法与实战

### 基础操作配置

#### 键盘默认映射

| N64 按键 | 键盘映射 |
|----------|----------|
| A 键 | X |
| B 键 | C |
| Z 键 | Z |
| Start | Space |
| 摇杆 | WASD |
| C 键组 | 方向键 |
| 方向键 | TFGH |

#### 快捷键

| 组合键 | 功能 |
|--------|------|
| ESC | 切换菜单栏 |
| Ctrl+R | 重置游戏 |
| F11 | 全屏切换 |
| Tab | 切换资源包 |

### 进阶功能

#### 1. MOD 管理

Lighthouse 支持加载自定义 MOD：

```bash
# MOD 存放目录
Lighthouse/
├── mods/
│   ├── custom-models.otr
│   ├── hd-textures.o2r
│   └── romhack-patch.o2r
└── bk.o2r
```

**安装 MOD：**
1. 下载 `.o2r` 或 `.otr` 格式的 MOD 文件
2. 放入 `mods` 文件夹
3. 启动游戏，在 Settings → Romhacks 中启用

#### 2. 语言包切换

使用多区域 ROM 实现多语言：

```
1. 启动 Lighthouse，打开菜单（ESC）
2. 进入 General → Languages
3. 选择 "Extract Language Pack from ROM"
4. 选择 PAL 或 NTSC-J ROM
5. 等待提取完成，在语言下拉菜单切换
```

支持语言：英语、法语、德语、日语

#### 3. 图形后端切换

遇到渲染问题时，可以切换图形 API：

**方法一：图形界面**
```
Settings → Graphics → Backend
选择 OpenGL / DirectX 11 / Metal
重启游戏
```

**方法二：配置文件**
```json
// lighthouse.cfg.json
{
  "Backend": {
    "id": 2,          // 1=DX11, 2=OpenGL, 3=Metal
    "Name": "OpenGL"
  }
}
```

#### 4. 自定义手柄映射

如果手柄未被识别：

```
1. Settings → Controller → Configure
2. 点击 "Create New Mapping"
3. 按提示依次按下对应的按键
4. 保存配置文件（自动保存到 assets/）
```

### 实际项目示例：安装 HD 材质包

```bash
# 1. 下载社区 HD 材质包（.otr 格式）
wget https://example.com/bk-hd-textures.otr

# 2. 移动到 mods 目录
mv bk-hd-textures.otr Lighthouse/mods/

# 3. 启动游戏
./lighthouse

# 4. 游戏内按 Tab 切换到 HD 材质
# 或在 Settings → Mods 中启用
```

## 五、常见问题与解决方案

### Q1: 提示 "ROM 不兼容"

**原因**：ROM 校验失败，可能是不支持的版本或损坏。

**解决方案**：
```bash
# 重新校验 ROM
1. 使用 SHA-1 工具检查文件哈希
2. 确保是美版 v1.0 或 v1.1（推荐 v1.0）
3. 如是 .n64 格式，用 Byte Swapper 转换为 .z64
```

### Q2: 游戏启动后黑屏

**可能原因与解决方案**：

**原因 A：图形后端不兼容**
```json
// 编辑 lighthouse.cfg.json，切换到 OpenGL
{
  "Backend": {"id": 2, "Name": "OpenGL"}
}
```

**原因 B：显卡驱动过旧**
```
# Windows: 更新到最新 DirectX 运行时
# macOS: 确保系统版本 ≥ 10.15
# Linux: 更新显卡驱动，安装 vulkan-tools
```

### Q3: 音频卡顿或无声

**解决方案**：
```
1. 检查音频输出设备是否被占用
2. 尝试切换音频后端（Settings → Audio）
3. Linux 用户确保安装了 libogg、libvorbis：
   sudo apt install libogg0 libvorbis0a
```

### Q4: 控制器无法识别

**解决方案**：
```
1. 确保手柄已连接并被系统识别
   - Windows：控制面板 → 设备和打印机 → 游戏控制器
   - macOS：系统信息 → USB
   - Linux：ls /dev/input/js*

2. 使用内置映射工具创建自定义配置
   Settings → Controller → Configure → Create New Mapping

3. 某些手柄可能需要安装驱动（如 8BitDo）
```

### Q5: 性能问题：帧率低

**优化方案**：
```
1. 降低内部分辨率倍数（Settings → Graphics → Resolution）
2. 关闭抗锯齿和滤镜
3. 禁用后台应用释放 CPU/GPU 资源
4. 笔记本电脑用户：确保使用独显而非核显
```

### Q6: 如何卸载或重置？

**完全清除**：
```bash
# Windows/macOS/Linux
删除 Lighthouse 文件夹即可
# 配置文件和数据不写入系统目录

# 如需重新提取资源
删除 bk.o2r 文件，再次启动会自动提取
```

## 六、总结

Lighthouse 项目展示了游戏逆向工程与现代移植技术的成熟应用。通过 **libultraship 引擎**，开发者能够将 N64 时代的经典游戏带到现代平台，不仅完美还原原版体验，还提供了高分辨率、MOD 支持、多语言等现代化特性。

**项目亮点总结：**

1. **技术深度**：从 N64 微码到现代图形 API 的完整转换链路
2. **架构优雅**：三层架构（游戏层、引擎层、平台层）清晰解耦
3. **用户友好**：图形界面配置、自动资源提取、跨平台一致性体验
4. **社区生态**：支持 ROMhack、自定义资源，为二次创作提供便利

这类"重编译移植"项目代表了游戏保存的新方向——不是模拟硬件，而是让游戏本身在现代环境中重生。对于开发者而言，Lighthouse 的代码结构、构建系统、跨平台适配方案都是极佳的学习素材。

**推荐人群：**
- 怀旧玩家：重温《班卓熊大冒险》经典关卡
- 游戏开发者：学习 N64 游戏架构与现代移植技术
- MOD 创作者：基于 O2R 格式开发自定义内容
- 逆向工程爱好者：研究 libultraship 引擎实现

GitHub 地址：[https://github.com/HarbourMasters/Lighthouse](https://github.com/HarbourMasters/Lighthouse)
