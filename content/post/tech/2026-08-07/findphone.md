---
title: "findphone: 用蓝牙信号强度在命令行里找丢失的苹果设备"
date: "2026-08-07"
description: "findphone 是一款 macOS 命令行工具，通过监测蓝牙 RSSI 信号强度，帮助你在室内定位附近的苹果设备。它不需要 Find My 网络，适用于 MDM 禁用 Find My 但设备仍在蓝牙范围内的场景，支持蜂鸣提示和地址脱敏。"
author: "Cheman"
slug: findphone
draft: false
categories: ["技术", "macOS", "开源"]
tags: ["macOS", "Swift", "蓝牙", "命令行工具", "GitHub开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**findphone**，一个用蓝牙信号强度在命令行里定位苹果设备的 macOS 工具，专为 Find My 无法使用但设备仍在蓝牙范围内的场景设计。

## 一、项目概述

`findphone` 由开发者 [ben-z](https://github.com/ben-z) 创建，解决了这样一个痛点：公司配发的 Mac/iPad 加入了 MDM 管理，Find My 功能被禁用，但设备明明就在附近（比如落在会议室的某个角落），却无法让设备发出声音来定位它。

它通过持续监测目标设备的蓝牙 RSSI（Received Signal Strength Indicator）值，转换成可读的信号强度条形图，让你「听着」接近目标：

- **survey 模式**（`findphone`）：扫描周围所有 Apple 设备，按信号强度排序
- **hunt 模式**（`findphone iphone`）：追踪指定设备，添加 `--sound` 参数后接近目标时发出加速的蜂鸣声，类似倒车雷达效果
- **列表模式**（`findphone --list`）：列出所有已配对设备的蓝牙地址

核心特性：
- 通用二进制（arm64 + x86_64），无需 Swift 环境即可运行
- 支持 `--redact` 脱敏模式，录制屏幕时自动屏蔽蓝牙地址和设备名
- 三种 RSSI 数据源自动降级，信号测量诚实可靠

## 二、技术原理

### 2.1 RSSI 信号强度数据源

findphone 的信号测量按质量从高到低依赖三个数据来源：

**① GATT 连接（最准确）**

一旦通过 BLE 连接到目标设备，调用 `readRSSI()` 每秒可获得约 3 次新鲜测量值。这是最可靠的数据源。

```swift
// 建立 GATT 连接后读取 RSSI
peripheral.readRSSI()
```

**② BLE 广告被动监听**

macOS 会被动接收附近 BLE 设备的广播包，从中解析设备名和 RSSI。但 Apple 设备大约每 15 分钟轮换一次广告地址，且只在部分广播包里包含设备名，因此数据稀疏。

**③ 经典蓝牙配对列表（最常用 fallback）**

通过 `system_profiler SPBluetoothDataType` 命令读取已配对设备的 RSSI：

```swift
let output = Process()
output.executableURL = URL(fileURLWithPath: "/usr/sbin/system_profiler")
output.arguments = ["SPBluetoothDataType", "-json"]
```

这里有一个关键陷阱：macOS 对这个值的刷新间隔是 3~12 秒，中间多次轮询返回的都是同一个缓存值。findphone 的做法是**仅在新值实际变化时才计入测量**，这解释了为什么报告的测量数远低于实际轮询频率——这是诚实的设计。

### 2.2 信号强度参考表

| dBm 值 | 粗略含义 |
|--------|---------|
| -45 及以上 | 伸手可及的距离 |
| -60 | 同一张桌子上 |
| -72 | 同一个房间里 |
| -85 | 较远，或有遮挡 |
| 更低 | 非常远或被屏蔽 |

### 2.3 Swift 构建方式

项目使用 Swift Package Manager 管理，核心 `Package.swift` 极为简洁：

```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "findphone",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "findphone", path: "Sources/findphone")
    ]
)
```

发布版本通过 CI 构建通用二进制（arm64 + x86_64），保证开箱即用。

## 三、安装与快速开始

### 环境要求

- macOS 13 (Ventura) 及以上
- 需授予蓝牙访问权限（首次运行时会提示）

### 安装步骤

从 [Releases](https://github.com/ben-z/findphone/releases) 下载通用二进制：

```bash
tar -xzf findphone-macos-universal.tar.gz
xattr -dr com.apple.quarantine findphone  # 清除下载 quarantine 标记
./findphone --help
```

### 从源码构建

```bash
git clone https://github.com/ben-z/findphone.git
cd findphone
swift build -c release
cp .build/release/findphone ~/bin/findphone
```

## 四、使用方法与实战

### 基础用法

```bash
# 扫描附近所有 Apple 设备（survey 模式）
findphone

# 追踪名为 "iphone" 的设备（hunt 模式）
findphone iphone

# 带声音的追踪模式，越近蜂鸣越快
findphone iphone --sound
```

### 录制屏幕时的安全模式

```bash
# 脱敏模式：屏蔽蓝牙地址，设备名用类别替代
findphone --redact
findphone iphone --redact --sound
```

### 信号强度解读实战

当你拿着 MacBook 在会议室里找 iPad 时：

```bash
findphone ipad --sound
# 输出示例：
# [████████░░] -45 dBm  ← 几乎贴在一起了
# [██████░░░░] -55 dBm  ← 同一张桌子
# [████░░░░░░] -68 dBm  ← 同房间，稍远
# [██░░░░░░░░] -82 dBm  ← 信号已经很弱
```

> ⚠️ 金属材质、墙壁和人体都会大幅衰减信号，所以金属文件柜里 2 米远的设备和开放空间里 15 米远的设备可能读数相同。**看趋势，不看单次读数**。

## 五、常见问题与解决方案

### Q1: 下载后提示「无法打开，因为无法验证开发者」
```bash
xattr -dr com.apple.quarantine findphone
```

### Q2: 运行提示「Bluetooth access denied」
前往 **系统设置 → 隐私与安全性 → 蓝牙**，为你的终端应用（如 Terminal 或 iTerm2）开启蓝牙权限。

### Q3: hunt 模式下设备信号突然消失（读数归零）
说明设备已超出蓝牙有效范围（约 10~20 米室内），或者设备的蓝牙被关闭了。findphone 在连接丢失时会停止蜂鸣，蜂鸣停止 ≠ 设备不在附近，而是「检测不到信号」。

### Q4: 配对列表里有设备但找不到
使用 `--list` 查看该设备的蓝牙地址是否稳定公共地址（不会轮换），地址不稳定的设备可能因地址变化而追踪失败。

### Q5: build 失败，提示找不到 swift
确保已安装 Xcode Command Line Tools：
```bash
xcode-select --install
```

## 六、总结

`findphone` 解决的是一个很垂直但真实存在的痛点：当你无法使用 Find My（比如 MDM 禁用），设备又在蓝牙可及的范围内时，它是目前最优雅的「盲找」方案。设计上有几个亮点值得关注：

1. **三种 RSSI 数据源自动降级**，确保在各种设备状态下都能工作
2. **对缓存数据的诚实处理**，避免测量数虚高
3. **脱敏模式的细致考量**，兼顾隐私安全和录制分享需求

如果你的工作环境中 macOS 设备被 MDM 管理，findphone 值得加入你的终端工具链。一个约 3MB 的通用二进制，无需任何依赖，一行命令就能开始「寻宝」。
