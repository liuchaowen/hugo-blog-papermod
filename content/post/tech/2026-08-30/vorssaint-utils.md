---
title: "Vorssaint：一个菜单栏图标，取代一打付费 macOS 效率工具"
date: 2026-08-30
description: "Vorssaint 是一款 GPL 开源、本地优先的 macOS 菜单栏效率套件，用一个图标整合了按应用音量、系统监视器、窗口管理、剪贴板历史、文本片段、截图录屏等数十项原本需要分别付费购买的 Mac 工具，全程无账户、无遥测、无订阅。"
author: "Cheman"
slug: vorssaint-utils
draft: false
categories: [技术, 开源, macOS]
tags: [GitHub, 开源, macOS, Swift, 效率工具]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Vorssaint**，它用桌面上一个菜单栏图标，把 Mac 用户通常要一个一个付费购买的效率工具全部整合到了一起，而且完全免费、开源、本地运行。

## 一、项目概述

Vorssaint 的定位非常清晰：*One menu bar icon doing the job of a dozen paid Mac apps*（一个菜单栏图标，干完一打付费 Mac 应用干的活）。它把 Mac 上最常被单独购买的实用功能——按应用音量、系统监视、窗口吸附、Dock 预览、剪贴板历史、文本片段、文件暂存、卸载清理等——收敛到一个常驻菜单栏的程序里，并且强调三个原则：免费、开源、一切都在你的 Mac 上本地运行。

项目从首次提交到冲上 GitHub Trending 前三、登顶 Swift 语言榜单只用了三天，后续每个版本也由社区 issue 和 PR 推动。仓库主体使用 **Swift** 编写，构建系统采用 Swift Package Manager（`Package.swift` 声明了 `macOS 14+` 平台目标与一个系统库封装 `VMStatisticsCompat`，用于补齐虚拟机统计相关的兼容性），官方构建使用 Apple Developer ID 签名并经过 notarize，因此 macOS 能直接打开且权限在更新后得以保留。

核心特性可以归纳为几条主线：

- **声音**：按应用音量混音、按应用输出路由、输出切换、麦克风工具、屏蔽连接耳机时 Music 自动播放。
- **系统感知**：系统监视器（CPU/GPU/内存/温度/风扇曲线）、菜单栏读数、网络速率与测速、告警通知。
- **窗口与 Dock**：增强型 App 切换器、窗口布局吸附、Dock 预览与点击行为、最大化不新建 Space、关闭即退出。
- **键鼠**：文本片段（snippet）、平滑滚动、焦点跟随鼠标、滚轮方向反转、侧键映射、Super 键、去抖。
- **剪贴板/文件/链接**：剪贴板历史、定时清空、纯文本粘贴、文件暂存 Shelf、Finder 快捷键、Clean URL、磁盘镜像安装器。
- **日常工具**：命令栏（Command Bar）、快捷面板、快捷开关、径向菜单、截图/录屏/取色/识屏、便签、应用更新、清理器、卸载器、媒体工具、Homebrew 管理器、清洁模式。
- **能源与显示**：保持唤醒、显示器亮度/独立开关、XDR 额外亮度、睡眠时关蓝牙。

值得一提的是它的模块化治理：所有功能按「整块功能」安装/卸载，被卸载的功能会从整个 App 里消失并停止加载，不占 CPU、内存和电量；设置可导出为文件并在新 Mac 上导入，App 还能独立于系统保持浅色或深色，并支持十余种语言。

## 二、技术原理

### 架构与构建

从源码布局看，Vorssaint 是一个典型的 Swift 可执行目标工程，入口在 `Sources/Vorssaint`，并依赖一个系统库封装 target `VMStatisticsCompat`：

```swift
// swift-tools-version:5.9
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Vorssaint

import PackageDescription

let package = Package(
    name: "Vorssaint",
    platforms: [.macOS(.v14)],
    targets: [
        .systemLibrary(
            name: "VMStatisticsCompat",
            path: "Sources/VMStatisticsCompat"
        ),
        .executableTarget(
            name: "Vorssaint",
            dependencies: ["VMStatisticsCompat"],
            path: "Sources/Vorssaint"
        )
    ]
)
```

`VMStatisticsCompat` 的存在说明项目需要对 macOS 底层 `vm_statistics` 等系统统计 API 做一层兼容性封装，以适配不同系统版本的内存/虚拟机统计字段差异。构建只需 Xcode Command Line Tools，提供 `build.sh`（编译、生成图标、组装签名包）与 `build.sh --install`（安装并启动）。

### 权限最小化与本地优先

Vorssaint 的隐私模型是其工程亮点。它把每一项 macOS 权限都用「Plain words」解释清楚，并明确标注「被谁使用、没有它会怎样」：

| 权限 | 被使用方 | 缺失后果 |
|---|---|---|
| 辅助功能 Accessibility | 切换器、Dock、窗口控制、鼠标键盘、片段、剪切粘贴 | 相关功能关闭 |
| 屏幕录制 | 窗口预览、截图、识屏、录屏 | 捕获不可用 |
| 系统音频录制 | 按应用音量、输出路由 | 退回到系统默认音频 |
| 麦克风 | 录屏可选音轨 | 无声录制 |
| 通知 | 唤醒/电池/监视/更新告警 | App 静默 |
| 完全磁盘访问（可选） | 更深清理与卸载扫描 | 仅扫描可达位置 |
| 管理员（一次性可选） | 无密码合盖唤醒 | 每次需密码 |
| 自动化 Automation | Finder 剪切粘贴、卸载、清废纸篓、Homebrew 交接 | 首次触发时向 macOS 申请 |

这种「权限与功能一一对应、授予后可提示撤销」的设计，把 macOS 沙盒时代的权限治理做成了产品体验，降低了用户对后台窥探的顾虑。

### 数据流与本地性

仓库明确的网络边界是：只有你能看到的操作才会触网——更新检查、网速测试、Homebrew 操作、临时截图/录屏链接、以及你显式发送的反馈；没有账户、没有分析、没有追踪。命令栏还会「学习你最常用的项」，但「忘记你输入到栏里的所有内容」，把模型状态严格限定在本地。

## 三、安装与快速开始

**环境要求**：Apple Silicon 芯片的 Mac，macOS 14 Sonoma 及以上。

使用 Homebrew 一键安装：

```sh
brew install --cask vorssaint
```

或前往 [releases 页面](https://github.com/vorssaintapp/vorssaint-utils/releases) 下载磁盘镜像，把 Vorssaint 拖入「应用程序」即可。首次启动提供三个一键捆绑包（Essentials / Windows / Battery and quiet）以及可视化功能选择器，仅请求所选功能所需的权限。

完全卸载：

```sh
brew uninstall --cask vorssaint
# 连同设置与权限一并移除：
./Tools/uninstall.sh
```

自行构建：

```sh
git clone https://github.com/vorssaintapp/vorssaint-utils.git
cd vorssaint-utils
./build.sh            # 编译、生成图标、组装签名包
./build.sh --install  # 同上并安装启动
```

## 四、使用方法与实战

### 基础用法

启动后，菜单栏出现一个图标，点击展开分区面板（混音器、系统、控制、工具等）。最常用的几组快捷键：

- **命令栏 Command Bar**：一个全局快捷键唤出输入框，可运行任意 Vorssaint 动作、打开 App、切换窗口、插入片段、粘贴剪贴板历史、做计算/单位换算/日期换算，甚至直接调用当前 App 菜单里的命令。`⌘K` 在行上对 App 执行退出/重启/强制退出/送往卸载器。
- **窗口布局**：把当前窗口吸附到半屏、三分之一、六分之一、角落或居中，可最大化（带/不带边距）或移到上一/下一显示器，各自绑定快捷键，并能逐步回退最近布局；开启边缘吸附后拖标题栏到屏幕边角即实时预览。
- **剪贴板历史**：本地保存文本、图片与文件，支持置顶收藏、搜索、快速粘贴与按需预览。

### 进阶用法

- **文本片段**：输入短触发词即刻展开为完整文本，支持剪贴板变量以及任意格式的日期时间；可整理进文件夹，从光标处直接插入。
- **径向菜单 Radial menu**：按住快捷键或任意额外鼠标键，在指针周围弹出常用动作轮盘（App、文件、链接、键组合、媒体、快捷开关、Vorssaint 工具），可建多套配置切换布局、配色、快捷键与鼠标触发。
- **截图与录屏**：同一选择器集成截图、录屏、识屏、取色；录屏支持系统声与麦克风分轨，编辑器可裁剪、平滑指针、自动缩放、加文字与背景，并导出视频/GIF 或本地压缩后分享临时链接。
- **权限体检**：设置里的权限页会提示某项已授予权限「已无任何功能需要」，并给一键撤销入口，避免权限长期闲置被滥用。

### 实战示例

想要「连接耳机时自动把 Music 静音、并把音乐走扬声器、会议走耳机」：

1. 在声音 → 按应用输出，把音乐路由到扬声器、通话类 App 路由到耳机；
2. 开启音乐拦截器，阻止耳机连接时 Music 自动弹出；
3. 在输出切换里设置快捷键循环切换预设输出，耳机断开时自动降音量。

三步即可在系统音频层完成原本需要多个付费 App 才能拼出的体验。

## 五、常见问题与解决方案

- **首次启动被拦截 / 权限不生效**：macOS 可能拦截未经验证的构建，需到「系统设置 → 隐私与安全性」允许；辅助功能/屏幕录制等权限需手动在设置里打开并重启相关功能。详见 [troubleshooting 指南](https://github.com/vorssaintapp/vorssaint-utils/blob/main/docs/TROUBLESHOOTING.md)。
- **缩略图只显示图标不显示画面**：通常是屏幕录制权限未授予或授予后未对对应功能生效，重新授权并重启 App 即可。
- **性能或耗电担忧**：进入设置把不用的整块功能卸载，对应模块即停止加载；每个功能还带「能耗徽章」标明开启时保活了什么，便于按需取舍。
- **兼容性**：仅支持 Apple Silicon 与 macOS 14+，Intel Mac 或更低系统版本无法运行。
- **Git 推送/Hook 冲突**：自行构建与官方构建共用源码，但官方构建只来自维护者；GPL 覆盖源码，而 Vorssaint 名称、图标与外观受 [TRADEMARKS.md](https://github.com/vorssaintapp/vorssaint-utils/blob/main/TRADEMARKS.md) 约束，fork 需使用自有标识。

## 六、总结

Vorssaint 的价值不在某一项单点功能有多强，而在于把 Mac 效率工具「碎片化付费」的现状重新收敛到一个本地优先、权限透明、可自由增删的开源套件里。对追求一站式体验又不想被订阅和遥测绑定的 Mac 用户，它几乎是菜单栏里值得长期占据的一个位置。项目采用 GPL-3.0-or-later 开源，源码可在 [GitHub](https://github.com/vorssaintapp/vorssaint-utils) 自由查阅与构建；如果你也觉得它值得常驻菜单栏，点个 star 或请维护者喝杯咖啡都是对本地优先软件的实在支持。
