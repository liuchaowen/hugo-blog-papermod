---
title: "Headunit Revived：把 Android 平板变成 Android Auto 车机屏幕"
date: "2026-06-25"
description: "Headunit Revived 是一款开源 Android 应用，可以将 Android 平板或手机变成 Android Auto 的接收端，支持有线 USB 和无线 Wi-Fi 两种连接方式，让旧平板焕发车机新生。"
author: "Cheman"
slug: headunit-revived
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "Android", "Android Auto", "车联网"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Headunit Revived**，它可以将任意 Android 平板或手机"变身"为 Android Auto 的车机大屏，无需购买专用车机，一句话总结——**用开源方案把平板装进车里**。

## 一、项目概述

Headunit Revived 最早基于 Michael Reid 的原始 [headunit](https://github.com/mikereidis/headunit) 项目，由社区接手并持续维护至今（最新版本 3.0.1）。项目解决了安卓生态中一个经典痛点：Android Auto 默认只能在车机或特定设备上运行，而很多车主手里有闲置的 Android 平板，想把它们利用起来充当车机屏幕却苦于没有官方支持。

### 核心特性一览

- **有线 USB 连接**：即插即用，连接稳定，适合对延迟敏感的场景
- **无线 Wi-Fi 连接**：支持传统 Wireless Launcher、Native Headunit Server，以及推荐的 **Wireless Helper** 伴侣应用，可实现自动发现和连接
- **Android Auto 全功能**：支持导航（Google Maps、Waze）、音乐（Spotify、YouTube Music）、语音助手等完整 Android Auto 功能
- **竖屏/横屏双模式**：支持横屏（车机主流）和竖屏（平板仪表盘）两种布局
- **高度可定制**：DPI 分辨率、码率、编码器、UI 缩放、键盘映射、夜间模式等丰富配置
- **多设备蓝牙支持**：可同时连接多个蓝牙设备，支持方向盘按键映射和旋钮控制
- **自动化集成**：支持 Tasker、MacroDroid 等自动化工具，以及 ADB Intent 触发无线连接

## 二、技术原理

### 整体架构

Headunit Revived 本质上是一个 **Android Auto 协议客户端（Headunit Desktop Protocol, HDP）**。Android Auto 在车机上运行时，实际上手机作为"投射端"（Projection Provider），车机作为"接收端"（Headunit），两者通过 USB 或 Wi-Fi 传输音视频流和触控事件。

```
[Android 手机]  --USB/Wi-Fi-->  [Android 平板运行 Headunit Revived]  --HDMI/屏幕-->  [车机显示屏]
   (投射端)                      (接收端/HDP Client)                        (输出设备)
```

### 核心技术实现

**1. 通信协议层**

项目内部实现了 Android Auto HDP 协议的核心握手流程，包括：
- USB 或 TCP Socket 建立连接
- SSL/TLS 加密通道建立（项目在 3.0.0 中重构了 SSL 库，提升稳定性和可维护性）
- 音视频编解码协商（支持 H.264、H.265 视频编码）
- 触控和音频双向交互

**2. 视频解码与渲染**

```java
// TextureView 渲染模式（v1.10.0 起成为默认渲染器）
// 相比 SurfaceView 有更好的设备兼容性
TextureView textureView = new TextureView(context);
textureView.setSurfaceTextureListener(new SurfaceTextureListener() {
    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
        // 初始化视频解码器，投射内容渲染到平板屏幕
        videoDecoder.init(surface, width, height);
    }
});
```

项目支持两种渲染模式：`TextureView`（默认，兼容性更好）和 `GLES20` 渲染器（v1.9.0 引入，修复了部分老旧车机的黑屏/花屏问题）。

**3. 音频路由**

音频处理是项目中最复杂的一环。Android Auto 要求音频必须路由到 Headunit 端而非手机端。v1.14.1 版本引入的 `MediaSession` 机制彻底解决了音频路由问题：

```java
// MediaSession 初始化（v1.14.1+）
MediaSessionCompat mediaSession = new MediaSessionCompat(context, "HeadunitRevived");
mediaSession.setCallback(new MediaSessionCompat.Callback() {
    @Override
    public boolean onMediaButtonEvent(Intent mediaButtonEvent) {
        // 将媒体按键事件转发给 Android Auto
        forwardToAndroidAuto(mediaButtonEvent);
        return true;
    }
});
mediaSession.setActive(true);
```

项目还实现了独立的音频缓冲区（Audio Buffer）和音频混流器（Audio Mixer，v2.3.1 引入），解决了部分设备上的音频卡顿问题。

**4. 无线连接核心**

无线模式的核心依赖 Android Auto 内置的 Headunit Server。项目支持三种无线方式：

- **Native Headunit Server**：调用手机内置的 Android Auto 开发者设置中的 Headunit Server（仅部分设备支持）
- **Wireless Launcher**：第三方应用（如 Emil Borconi 的 Wi-Fi Launcher）
- **Wireless Helper（推荐）**：社区开发的配套应用，支持 NSD/mDNS 自动发现、Wi-Fi Direct 自动连接和蓝牙自动启动，是目前最可靠的无线方案

**5. 连接稳定性保障**

项目在多年迭代中积累了丰富的稳定性保障机制：

```java
// USB 软重置逻辑（v1.14.1+）
// 遇到 USB 假死时自动恢复，无需用户手动拔插
if (usbConnection.isStalled()) {
    usbConnection.softReset(); // 保持 8 秒重置窗口，处理 USB Dongle 重启
    reconnectWithBackoff();
}
```

CommManager 重构（v2.0.0）是项目的重要里程碑，将连接核心完全重写，引入了协程（Kotlin Coroutines）管理，显著提升了握手速度和异常恢复能力。

## 三、安装与快速开始

### 环境要求

- **Headunit 端（平板）**：Android 5.0（API 21）及以上，推荐 Android 10+
- **手机端（投射端）**：Android 5.0 及以上，安装有 Android Auto 应用
- USB 线（建议 USB-A to USB-A 或 USB-A to USB-C，视设备接口而定）

### 安装步骤

**方式一：从 Google Play 安装（推荐）**

直接在 Headunit 平板上安装 [Headunit Revived](https://play.google.com/store/apps/details?id=com.andrerinas.headunitrevived) 和配套的 [Wireless Helper](https://play.google.com/store/apps/details?id=com.andrerinas.wirelesshelper) 应用。

**方式二：从 GitHub Release 下载 APK**

```bash
# 克隆仓库
git clone https://github.com/andreknieriem/headunit-revived.git
cd headunit-revived

# 编译 Release 版本
# 需要配置 keystore（详见 CONTRIBUTING 文档）
./gradlew assembleRelease
```

### 有线连接快速开始

1. 用 USB 线连接手机和平板
2. 在平板上打开 Headunit Revived，点击 **USB** 按钮
3. 在列表中找到你的手机，点击右侧按钮允许连接
4. 从列表中选择你的手机，等待 Android Auto 启动

### 无线连接快速开始（推荐 Wireless Helper）

1. 在平板上打开 Headunit Revived，进入设置
2. 将 **Wireless Mode** 设置为 **Helper Mode**
3. 确保平板和手机在同一 Wi-Fi 网络（或开启手机热点）
4. 在手机上打开 Wireless Helper 应用，点击开始
5. Headunit Revived 自动发现平板并建立连接

### ADB 手动触发无线连接（高级用户）

```bash
# 通过 ADB 触发无线连接
adb shell am start -a android.intent.action.VIEW \
    -d "headunit://connect?ip=192.168.1.25"
```

这对于 Tasker、MacroDroid 等自动化工具集成非常有用。

## 四、使用方法与实战

### 基础配置建议

**首次设置推荐使用自动优化向导**

Headunit Revived 内置了 Auto-Optimization Wizard，会根据你的平板硬件自动推荐最佳分辨率、DPI 和编码器设置。建议首次使用时直接运行向导：

> Settings → Auto-Optimization Wizard → Run

**分辨率与 DPI 调整**

如果在 Android Auto 中发现 Google Maps 在竖屏模式下触控异常，尝试将 DPI 调低到 200 以下（推荐 190），可以恢复触控功能。

### 方向盘/按键映射

Headunit Revived 支持配置方向盘按键和旋钮：

1. 进入 **Settings → Keymap**
2. 使用内置的 **Key-Sniffer** 实时捕获按键事件
3. 将捕获到的按键映射到 Android Auto 的对应操作（Dpad、媒体控制等）

```json
// keymap 配置示例（基于社区贡献的 Rotary Knob 支持）
{
  "key_map": [
    {"android_keycode": 66, "aa_action": "dpad_center"},  // 旋钮按压 → 确认
    {"android_keycode": 20, "aa_action": "dpad_down"},    // 旋钮下转 → 向下
    {"android_keycode": 19, "aa_action": "dpad_up"}       // 旋钮上转 → 向上
  ]
}
```

### 多设备蓝牙自动连接

v2.3.1 引入了多设备蓝牙自动连接功能，对于有多辆车或多个平板的用户非常实用。可以在设置中保存多个蓝牙设备，切换时自动重连。

### 音频混流（Audio Mixer）

v2.3.1 新增的 Audio Mixer 可以同时混合多个音频轨，适合需要在导航播报的同时保持音乐播放的场景。

### Tasker 集成示例

在 Tasker 中创建一个自动化任务，实现上车自动连接：

```
触发条件: 蓝牙连接到车载音响
操作:
  1. Launch App: Headunit Revived
  2. Wait: 3 seconds
  3. ADB Intent: headunit://connect?ip=<平板IP>
```

## 五、常见问题与解决方案

### Q1: Google Maps 在竖屏模式下无法触控

**原因**：竖屏模式下 Google Maps 的触控区域坐标映射有问题。

**解决方案**：进入设置，将 **Pixel Density (DPI)** 调低到 **200 以下**（推荐 190），重启应用。

### Q2: 无线连接频繁掉线

**原因**：手机上的 Wi-Fi Assistant 或网络自动切换功能会在检测到"无互联网"时断开连接。

**解决方案**：
- 在手机 Wi-Fi 设置中关闭 **Wi-Fi Assistant** 和 **Switch between networks**
- 同时检查手机省电策略，确保 Headunit Revived 相关进程不被后台杀掉
- 推荐使用 **Wireless Helper** 模式，比传统无线模式稳定得多

### Q3: Android 10 及以下无法自动触发无线投射

**原因**：Android Auto 从 16.4 版本起在 Android 10 及以下禁用了自动无线投射启动。

**解决方案**：
- 使用 **Wireless Helper** 模式绕过限制
- 或者手动开启手机上的 Android Auto 内置 Headunit Server，然后通过 Wi-Fi 模式（回环地址 127.0.0.1）连接

### Q4: 音频从手机扬声器播放而非平板

**原因**：音频路由未正确设置，MediaSession 未获得音频焦点。

**解决方案**：v1.14.1 及以上版本已彻底修复此问题。如果仍有问题，检查平板是否有多媒体音量，尝试在设置中启用 **Static Audio Focus Toggle**。

### Q5: USB 连接时随机断开

**解决方案**：
- v3.0.1 增强了 USB 工作流，减少了随机断开
- 如果问题持续，尝试更换 USB 线（推荐带数据线的 USB-A to USB-A 或高质量数据线）
- 检查手机的 Host Mode 是否正确开启

## 六、总结

Headunit Revived 是 Android Auto 开源生态中最成熟、维护最活跃的第三方车机替代方案。它不仅复活了原始 headunit 项目的生命力，更通过持续迭代引入了竖屏模式、Wi-Fi Direct、自动优化向导、音频混流等大量实用功能。项目在 GitHub 上拥有活跃的社区，贡献者涵盖全球多国语言本地化团队。

如果你手头有闲置的 Android 平板，不妨试试 Headunit Revived——用它做车机大屏，导航、音乐、语音助手一个不落，比大多数原厂车机的体验还要流畅。

> 📦 GitHub 地址：[andreknieriem/headunit-revived](https://github.com/andreknieriem/headunit-revived)
> 📱 Google Play：[Headunit Revived](https://play.google.com/store/apps/details?id=com.andrerinas.headunitrevived)
> 📖 详细文档：[项目 Wiki](https://github.com/andreknieriem/headunit-revived/wiki)
