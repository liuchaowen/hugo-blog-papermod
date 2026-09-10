---
title: "ArmorPaint：用 Haxe 打造的跨平台 GPU 3D PBR 纹理绘制引擎"
date: 2026-09-10T21:05:00+08:00
description: "ArmorPaint 是一个基于 Haxe 与 Kha 构建的开源 3D PBR 纹理绘制软件，支持 Windows、Linux、macOS、iOS、Android 与 WASM。本文深入解析它的 GPU 渲染管线、Haxe 跨平台架构、节点式材质系统与编译工作流，并给出从源码构建到实战绘制的完整指南。"
author: "Cheman"
slug: armorpaint
draft: false
tags: ["ArmorPaint", "Haxe", "Kha", "3D纹理绘制", "PBR", "GPU渲染", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ArmorPaint**，一个用 Haxe 写成的跨平台 3D PBR 纹理绘制软件——拖入模型就能直接在 GPU 上刷贴图，并且能编译到桌面、移动端甚至浏览器。它把自己定位成"开源的 Substance Painter 替代品"，值得认真拆一拆。

## 一、项目概述

ArmorPaint 是 [armory3d](https://github.com/armory3d) 团队（同时也是开源 3D 引擎 Armory3D 的维护者）推出的一款**独立 PBR 纹理绘制工具**。它的核心目标很明确：让艺术家把已经展好 UV 的 3D 模型拖进窗口，就能像 Photoshop 一样在模型表面绘制 PBR 材质，并实时看到最终的光照效果。

它解决的核心痛点是：传统贴图绘制流程需要在 3D 软件、图像软件之间反复横跳，而 ArmorPaint 把"模型预览 + 图层化绘制 + 节点材质 + 烘焙"全部塞进一个轻量、可移植的程序里。

核心特性一览：

- **物理渲染（PBR）驱动**：基于金属度/粗糙度工作流，绘制即所见即所得。
- **图层系统**：像图像编辑器一样管理材质图层，支持非破坏性叠加。
- **节点式材质编辑**：通过节点图构建程序化材质，而非只画死纹理。
- **跨平台**：Windows / Linux / macOS，实验性支持 iOS、Android 与 WASM（浏览器）。
- **可移植**：桌面版免安装，解压即用。
- **源码开放、二进制收费**：仓库面向开发者，稳定版二进制通过付费分发来反哺项目。

## 二、技术原理

### 2.1 为什么选择 Haxe + Kha

ArmorPaint 最特别的地方，是它没有选择 C++ 或 Rust，而是用了 **Haxe** 这门语言，底层依托 **[Kha](https://kha.tech/)** 多媒体框架。这套选择的理由非常工程化：

Haxe 可以**编译为多种目标语言**——C++（桌面/移动）、JavaScript（WASM / 浏览器）、C#、Python 等。Kha 则在 Haxe 之上封装了跨平台的图形、音频、输入与文件系统抽象。两者结合，意味着**同一份游戏/图形代码，只需切换编译目标，就能跑到完全不同的平台上**。ArmorPaint 正是靠这套组合，用一份 Haxe 代码库同时交付桌面、移动端和 Web 版本。

从 README 的构建矩阵就能看出这套架构的威力——同一个 `make` 工具，通过不同 `--target` 参数产出截然不同的产物：

```bash
# 桌面端（生成 Visual Studio / Xcode 工程）
../base/make

# Android
../base/make --target android

# iOS
../base/make --target ios

# WebAssembly（浏览器）
../base/make --target wasm --compile --embed
```

### 2.2 GPU 驱动的绘制管线

ArmorPaint 的绘制过程**完全跑在 GPU 上**，性能主要取决于显卡。官方给出的参考是：

- 4K 绘制最低需要 Intel HD4000 级别的核显；
- 16K 绘制推荐 NVIDIA RTX 2080 / 8GB 显存或更强。

这背后的数据流大致是：用户在视口落笔 → 笔刷事件被转换成绘制指令 → 通过渲染目标（Render Target）把颜色/法线/粗糙度等通道写入对应的纹理层 → 着色器实时合成并显示在视口。由于所有通道都在显存里做离屏渲染，所以大分辨率下的瓶颈几乎完全落在显存带宽与填充率上。

### 2.3 数据资产与工程文件

ArmorPaint 使用自定义的 `.arm` 工程格式，把**网格、图层、材质、笔刷**全部打包进去，并可选地把外部纹理也一并内嵌：

- 保存工程：`Ctrl + S` 写入 `.arm`
- 开启 `File - Pack Assets` 后，外部贴图会被打包进工程文件，方便迁移

导出纹理时，它内置了多套通道打包预设，直接对齐主流引擎：

- `Generic`：导出独立 PBR 贴图
- `Unreal`：打包为 *occlusion-roughness-metallic*
- `Unity`：打包为 *metallic-occlusion-smoothness*
- `Minecraft`：打包为 *metallic-emission-roughness*

这种"一次绘制、多引擎导出"的设计，体现了它作为管线中间件的定位。

## 三、安装与快速开始

### 3.1 使用官方二进制（推荐普通用户）

Windows 10+ / Linux / macOS（Apple Silicon）都有现成构建，桌面版**免安装**，解压即运行：

- Windows：运行 `ArmorPaint.exe`（若被 SmartScreen 拦截，选 `More Info - Run Anyway`）
- Linux：终端里执行 `./ArmorPaint`
- macOS：运行 `ArmorPaint.app`

二进制通过付费渠道（Itch / Gumroad）分发，用于支撑项目开发；仓库内的源码则对所有人开放。

### 3.2 从源码构建（开发者）

如果你要编译 git 版本，需要准备编译器工具链：Windows 用 Visual Studio + clang tools，Linux 用 clang + 依赖，macOS/iOS 用 Xcode，Android 用 Android Studio，另外需要安装 `git`。

```bash
git clone https://github.com/armory3d/armorpaint
cd armorpaint/paint
```

**Windows (x64):**
```bash
..\base\make
# 打开生成的工程 build\ArmorPaint.sln 进行构建
```

**Linux (x64):**
```bash
../base/make --run
```

**macOS (arm64):**
```bash
../base/make
# 打开 build/ArmorPaint.xcodeproj 进行构建
```

**WASM:**
```bash
../base/make --target wasm --compile --embed
```

### 3.3 一个实用细节：`#embed` 与数据内嵌

README 里提到一个很"新潮"的构建能力：嵌入数据文件需要支持 C23 `#embed` 的编译器（clang 19+）：

```bash
../base/make --embed
```

`#embed` 是 C23 引入的标准特性，允许在编译期把二进制资源直接嵌入可执行文件，从而省去运行时读取外部资源的开销——对需要把大量笔刷、预设、图标打进单文件的桌面应用来说非常合适。

## 四、使用方法与实战

### 4.1 导入模型

把展好 UV 的 `.obj` 文件直接拖进视口即可替换当前模型，单文件最大支持约 4GB；此外还支持 `.fbx`、`.blend`、`.stl`、`.gltf`、`.glb`。导入时可以在对话框里：

- 用 `Split By - UDIM Tile` 把模型按 UDIM 分块解析；
- 开启 `Apply Skinning` 加载 fbx/glb 的动画帧。

导入后还能在 `Meshes` 标签页里做一系列网格处理：重算法线（`Calculate Normals`）、调整 up 轴（`Rotate`）、几何归位（`Geometry to Origin`）、应用置换（`Apply Displacement`）、自动展开 UV（`UV Unwrap`），甚至内置了一个简易的 UV 编辑器。

### 4.2 导入材质与纹理

- 把一整个 PBR 贴图**文件夹**拖进视口，ArmorPaint 会根据文件后缀自动识别通道并组装成材质；
- 拖入 `.jpg/.png/.tga/.bmp/.gif/.psd/.hdr/.svg/.exr/.tif` 等图像到节点编辑器，会生成一个 `Image` 节点。

### 4.3 绘制与视口操作

基本操作上手即会：

- 鼠标左键 / 数位笔：绘制
- `Alt` + 左键：旋转视角
- `Alt` + 中键：平移
- `Alt` + 右键 / 滚轮：缩放

键位可以在 `Preferences - Keymap` 里改成 **Blender 预设**，这对从 Blender 迁移过来的用户非常友好。

### 4.4 导出与通道打包

导出纹理走 `File - Export - Textures...`，可设置分辨率、色深（8/16/32bit）与格式（8 位色深下用 `.png`/`.jpg`，高动态范围用 `.exr`）。如果多个物体要共用一张贴图，可以在 `Atlases` 标签页把它们编入同一个 atlas，导出时每个 atlas 写一套纹理。

## 五、常见问题与解决方案

**Q1：首次运行被系统拦截？**
Windows 会弹"未识别的应用"提示，选 `More Info - Run Anyway` 即可；Linux 下若双击没反应，需要在解压目录的终端里执行 `./ArmorPaint`。

**Q2：绘制卡顿 / 大分辨率下掉帧？**
绘制全程在 GPU 上进行，性能主要由显卡决定。可以到 `Preferences` 里调低视口分辨率或相关画质选项；16K 纹理对显存压力极大，建议 RTX 2080/8GB 及以上。

**Q3：改了 UV 之后贴图对不上？**
这是个高频坑——一旦在 ArmorPaint 里修改了 UV，就必须把**修改后的网格一起导出**（`File - Export - Mesh...`），否则外部管线里的 UV 与贴图会错位。

**Q4：模型改动后想重新加载？**
使用 `File - Reimport Mesh` / `Reimport Textures` 可以直接重新读取资产，无需重建工程。

**Q5：想用更多模型或图像格式？**
在 `Preferences - Plugins` 里可启用额外格式支持插件，按需加载。

## 六、总结

ArmorPaint 的价值不只是"开源版 Substance Painter"，它更是一个**用 Haxe + Kha 把一套代码编译到六大平台**的工程范本：桌面端用 C++ 后端追求性能，Web 端编译成 WASM 直接在浏览器里跑 GPU 绘制。它的可移植性、GPU 驱动的绘制管线、以及对多引擎导出预设的原生支持，都说明它是一个认真做管线的项目。

如果你在做游戏美术管线、想找一个可定制、可审计、可自托管编译的纹理绘制工具，或者单纯想研究"一份 Haxe 代码如何跨平台跑图形应用"，ArmorPaint 都很值得 star 一下。

- 项目地址：<https://github.com/armory3d/armorpaint>
- 官方网站与手册：<https://armorpaint.org>
