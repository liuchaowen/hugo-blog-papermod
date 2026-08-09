---
title: "OneStep4.0：在 Android 上重现「一步」多窗口交互的桌面容器"
date: 2026-08-10
description: "OneStep4.0 是一款面向 Android Root 与系统特权环境的多应用桌面容器，通过 VirtualDisplay + SurfaceView 技术，在无自由窗口模式的设备上实现主窗口 + 多侧边窗口的多任务交互，并支持 Magisk / KSU 两种刷入方式。"
author: "Cheman"
slug: onestep4
draft: false
categories: ["技术", "开源", "Android"]
tags: ["Android", "Root", "Magisk", "多窗口", "桌面容器", "开源项目"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OneStep4.0**，它是一款面向 Android Root 与系统特权环境的多应用桌面容器，旨在复刻当年锤子手机「一步（One Step）」的多窗口交互体验——在同一个工作区里同时容纳一个主窗口和多个侧边小窗，无需依赖 Android 系统的自由窗口（Freeform）模式。

## 一、项目概述

OneStep4.0 由 **SangLuoCN** 开发，当前版本 1.0.5，License 为 Apache-2.0。项目核心目标是让用户在没有系统级自由窗口支持的 Android 设备上，也能拥有类似「主屏 + 侧边栏」的多任务桌面体验。

**支持的系统与环境：**

| 手机系统 | Android 版本 | Root 方案 | 状态 |
| --- | ---: | --- | :---: |
| ColorOS 16 | 16 | KSU / ReSukiSU / Magisk | ✅ 可用 |
| HyperOS 3 | 16 | KSU | ✅ 可用 |
| ZUXOS | 15 | Magisk | ✅ 可用 |
| 星云 AIOS | 16 | KSU | ✅ 可用 |
| 类原生 | 14 | Magisk | ✅ 可用 |

**核心特性一览：**

- **主侧多窗口**：一个主窗口 + 3 至 6 个侧边小窗口，支持快速打开、切换和关闭应用
- **智能窗口分配**：侧屏有空位时将原主屏应用移入侧屏，窗口占满后在主屏替换应用
- **流畅切换动画**：应用移入侧屏缩小过渡，替换主屏时原应用渐隐、新应用放大出现
- **内置桌面**：可从系统已安装的桌面应用里选择，Home 返回时直接显示当前所选桌面
- **顶部快捷区**：可翻页的应用快捷栏、媒体播放控制和高德导航信息
- **一步设置**：设置页可在主屏和侧屏之间切换，并保持页面状态
- **自定义布局**：可调整桌面图标排列、侧屏数量、顶部栏尺寸、角落触发区域和灵敏度
- **工作区背景**：支持选择自定义背景并同步系统壁纸

## 二、技术原理

### 2.1 整体架构

OneStep4.0 的架构分为三层：

```
┌─────────────────────────────────────┐
│         UI 层（Jetpack Compose）     │  ← 主窗口、侧边小窗、顶部栏
├─────────────────────────────────────┤
│       窗口管理引擎（WindowManager）    │  ← SurfaceView 生命周期、焦点管理
├─────────────────────────────────────┤
│    虚拟显示层（VirtualDisplay + SurfaceView）│  ← 承载第三方应用画面
└─────────────────────────────────────┘
```

### 2.2 虚拟显示技术

在无自由窗口模式的设备上，OneStep4.0 使用 `VirtualDisplay + SurfaceView` 方案来承载第三方应用：

```java
// 核心：创建虚拟显示
VirtualDisplay virtualDisplay = windowManager.createVirtualDisplay(
    "OneStep4_Container",       // 显示名称
    screenWidth, screenHeight,   // 分辨率
    displayMetrics.densityDpi,   // 密度
    surface,                     // SurfaceView 的 Surface
    DISPLAY_FLAG_OWN_CONTENT_ONLY
);

// 将虚拟显示 ID 分配给目标应用进程
ActivityManagerNative.getDefault().set锁屏应用进程();
```

关键点在于：应用画面通过 `SurfaceView` 渲染到 UI 层，同时触摸事件、输入法和焦点需要准确路由到对应的虚拟显示实例。

### 2.3 权限与 Root 策略

根据 README 说明，项目支持两种权限路径：

1. **系统任务嵌入（优先）**：利用系统宿主（SystemServer）的 `ActivityTaskManager` 直接嵌入任务栈，无需自行管理 VirtualDisplay
2. **通用 Root 环境**：通过 `VirtualDisplay + SurfaceView` 承载，并将触摸和输入法准确路由

> **注意：** 容器内运行第三方应用需要 Root/SU、Magisk 特权模块、平台签名或等效的系统级任务嵌入权限。仅以普通 APK 安装时，Android 不会授予项目所需的签名级权限。

### 2.4 Magisk / KSU 刷入机制

项目以 Magisk / KSU 模块形式分发，模块包结构：

```
META-INF/com/google/android/updater-script   ← 刷机脚本
system/
  bin/onestep4d                               ← 主守护进程
  etc/init/onestep4.rc                        ← init.rc 启动配置
  app/OneStep4/OneStep4.apk                   ← 主 APK
```

刷入模块后，系统启动时通过 `init.rc` 拉起 `onestep4d` 守护进程，由其统一管理窗口生命周期。

## 三、安装与快速开始

### 环境要求

- Android 7.0+（API 24）
- 已 Root：Magisk（推荐）或 KernelSU（KSU）
- 设备需支持 1080p+ 分辨率

### Magisk 刷入步骤

1. 在 Magisk Manager 中下载最新版本的 OneStep4.0 模块（`.zip`）
2. 进入 Magisk Manager → 模块 → 从本地安装，选择下载的 `.zip` 文件
3. 刷入完成后**重启设备**
4. 打开 OneStep4.0，并授权 Root 权限；若未弹出授权提示，请在 Magisk 中手动授权
5. 授权完成后即可正常使用

### KSU（元模块）刷入步骤

1. 刷入 KSU 元模块（KiuiSU 或 APatch 等兼容层）
2. 刷入 OneStep4.0 的 KSU 专用模块
3. 重启设备
4. **重要：** 打开 OneStep4.0 前，先在 KSU 应用中手动授予 Root 权限。若未授权就打开应用，可能出现黑屏；此时手动授权后，清除应用后台重新打开即可

## 四、使用方法与实战

### 4.1 首次配置

首次进入应用后，建议按以下顺序配置：

1. **授权 Root**：弹出 Root 授权申请时点击允许
2. **选择内置桌面**：在设置中选择一个系统桌面作为 Home 出口
3. **调整侧边窗口数量**：根据屏幕大小，建议设置为 3-4 个侧边窗口
4. **设置角落触发区**：调整四角触发区域大小和灵敏度，方便快速呼出

### 4.2 日常使用

- 从主屏幕拖动应用图标到角落触发区 → 应用在侧边窗口中打开
- 点击侧边窗口 → 切换为主窗口显示
- 从主屏幕拖动应用到侧边窗口区域 → 将主屏应用移入侧边
- 从顶部向下滑动 → 展开快捷应用栏和媒体控制

### 4.3 自定义配置示例

```json
// 应用内配置文件（内部数据结构，非用户直接编辑）
{
  "mainWindow": {
    "width": "match_parent",
    "height": "match_parent"
  },
  "sideWindows": {
    "count": 4,
    "position": "right",
    "width": "280dp"
  },
  "topBar": {
    "height": "56dp",
    "showMediaControl": true,
    "showNavigation": true
  }
}
```

## 五、常见问题与解决方案

**Q1：打开应用后黑屏？**
A：在 KSU 环境下，若未提前授予 Root 权限，打开应用可能黑屏。解决方法：先在 KSU 中手动授权，然后清除 OneStep4.0 后台后重新打开。

**Q2：侧边窗口内应用无法输入文字？**
A：确认应用已获得输入法权限。OneStep4.0 会自动管理焦点和输入法路由，但部分系统输入法需要在设置中手动授予「显示在其他应用之上」的权限。

**Q3：设备不支持 Magisk / KSU，还能使用吗？**
A：不可以。项目核心依赖 Root 环境提供的特权权限，普通 APK 安装方式无法获取所需签名级权限，功能将不可用。

**Q4：刷入后系统无法启动怎么办？**
A：进入 recovery 或通过 Magisk Manager 禁用 OneStep4.0 模块后重启，再查看设备是否支持对应版本的模块。

**Q5：侧边窗口显示模糊或不清晰？**
A：检查 `VirtualDisplay` 分辨率设置与设备屏幕密度是否匹配，可在设置中调整「显示缩放」或重新设置侧边窗口的显示缩放比例。

## 六、总结

OneStep4.0 是一个非常有意思的 Android 桌面容器项目，它不依赖系统自由窗口 API，而是通过 `VirtualDisplay + SurfaceView` + Root 特权的方式，在任何已 Root 的 Android 设备上实现「主屏 + 侧边栏」的多任务体验。项目代码结构清晰，对 Magisk / KSU 双模块生态的适配也很完善。

如果你怀念当年锤子手机「一步」的多窗口交互，或者希望在 Android 平板上大屏多任务，OneStep4.0 值得一试。

> 📦 GitHub：[SangLuoCN/OneStep4](https://github.com/SangLuoCN/OneStep4)
> 📺 Bilibili 演示：[BV17b3Y6QE4D](https://www.bilibili.com/video/BV17b3Y6QE4D)
> 💬 内测反馈群：1081638982
