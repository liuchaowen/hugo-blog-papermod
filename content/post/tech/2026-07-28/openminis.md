---
title: "OpenMinis：把最强 AI Agent 跑在你的 iPhone 本地"
date: "2026-07-28"
description: "OpenMinis 是一款开源的本地 AI Agent 应用，可运行于 iOS 和 Android，将 Claude、GPT、Gemini 等主流模型引入原生移动端，并内置 Linux 沙箱、设备深度集成与可扩展技能系统。"
author: "Cheman"
slug: openminis
draft: false
categories: ["技术", "开源", "AI"]
tags: ["AI Agent", "iOS", "Android", "开源", "本地运行"]
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

今天在 GitHub Trending 上看到一个让人眼前一亮的项目：**OpenMinis**——一款将顶级 AI 模型（Claude、GPT、Gemini 等）完整跑在 iOS/Android 本地的私人 AI Agent 应用，内置真实 Linux 沙箱、支持健康/日历/相册等系统级集成，完全免费开源。

## 一、项目概述

OpenMinis 的核心定位是"私人本地 AI Agent"。它不是又一个 ChatGPT 套壳，而是一个完整的 Agent 运行时：

- **Bring Your Own Model**：用户自备 API Key（Anthropic/OpenAI/Google），完全私有，数据不离开设备
- **真实 Linux Shell**：通过 iSH（iOS）或 PRoot（Android）在设备上运行一个完整的 Alpine Linux 环境，Agent 可以安装包、执行脚本、操作真实文件系统
- **深度系统集成**：健康数据、日历、提醒事项、联系人、HomeKit、蓝牙、剪贴板、媒体等系统能力全部暴露给 Agent 作为工具调用
- **浏览器自动化**：Agent 可以代表用户在网页上执行操作
- **可扩展 Skills**：支持 Skills 技能包系统，skills built for Claude / Codex / OpenClaw 大多可以直接运行
- **持久记忆**：跨会话的持久记忆能力
- **多工作空间**：通过 `minis://workspace/` 组织不同工作上下文

项目已获得 MacStories、知乎、小众软件（Appinn）等知名科技媒体的深度报道，被称为"可能是 iOS 端最强 AI Agent"。

## 二、技术原理

### 沙箱架构

OpenMinis 的核心技术亮点是在 iOS/Android 上构建一个可信的 Linux 运行时：

```sh
# iOS 端：基于 iSH 的 ARM64 分支
git clone --recurse-submodules https://github.com/OpenMinis/OpenMinis.git
cd OpenMinis
./deps/build_lame.sh && ./deps/build_ffmpeg.sh
./deps/build_ish.sh && ./deps/prepare_alpine_rootfs.sh
open src/ios/Minis.xcodeproj

# Android 端：基于 PRoot 的 user-space chroot
./deps/build_proot.sh && ./scripts/prepare_android_sandbox.sh
cd src/android && ./gradlew :app:assembleDebug
```

iSH（iSH-App/ish）是一个在 iOS 上模拟 Linux x86/ARM64 用户模式的开源项目，OpenMinis 使用了自己的 ARM64 分支。Android 端则通过 PRoot 实现无根 rootfs 挂载。两者之上均运行 Alpine Linux minirootfs，构建脚本在 `deps/` 目录下。

### 源码目录结构

```
src/ios/          iOS 原生 App（Swift / SwiftUI），含 Share Extension、Widget、File Provider
src/android/      Android 原生 App（Kotlin / Compose），含 JNI native 代码
src/shared/       跨平台共享资源
deps/             原生依赖构建脚本（LAME、FFmpeg、iSH/PRoot、Alpine rootfs 等）
docs/specs/       架构与接口规范
scripts/          rootfs 准备及开发者工具
```

### 设备集成层

Agent 通过原生 offload 机制访问系统级能力，而非依赖沙箱内的模拟层。例如 Apple Health 的写入通过 Swift 原生桥接实现，确保数据准确性和权限合规。

### 媒体处理

内置 FFmpeg（LGPL）+ LAME，支持音频转码；中文分词使用 cppjieba（MIT）；数学渲染使用 KaTeX。完整第三方依赖清单见 `THIRD_PARTY_LICENSES.md`。

## 三、安装与快速开始

### 方式一：直接安装（推荐）

- **iOS**：App Store 下载，或加入 TestFlight 抢先体验（最新修复和新功能优先发布于此）
  - [App Store](https://apps.apple.com/app/id6759188481)
  - [TestFlight Beta](https://testflight.apple.com/join/3BdkA5c3)
- **Android**：从 GitHub Releases 下载最新 APK
  - [Releases 页面](https://github.com/OpenMinis/OpenMinis/releases)

### 方式二：从源码构建

> 源码构建需要：macOS + Xcode（iOS）、Android Studio + NDK r28+（Android）

```sh
# 通用前置
git clone --recurse-submodules https://github.com/OpenMinis/OpenMinis.git
cd OpenMinis

# iOS 构建
./deps/build_lame.sh && ./deps/build_ffmpeg.sh
./deps/build_ish.sh && ./deps/prepare_alpine_rootfs.sh
open src/ios/Minis.xcodeproj

# Android 构建
./deps/build_proot.sh && ./scripts/prepare_android_sandbox.sh
cd src/android && ./gradlew :app:assembleDebug
```

## 四、使用方法与实战

### 基础配置

首次启动后，在设置中添加你的 API Key（支持 Anthropic Claude、OpenAI GPT、Google Gemini 等），Agent 即可在本地设备上调用所选模型。

### 典型使用场景

| 场景 | 操作方式 |
|------|---------|
| 拍照记录饮食营养 | 让 Agent 识别照片中的菜品，估算热量并写入 Apple Health |
| 早间 X 动态摘要 | Shortcuts 触发 Agent 获取 X timeline，合成语音播报 |
| Telegram 群消息 → 任务 | 拉取 Telegram 群消息，提取 Bug 和 Action Item 去重后写入 Apple Reminders |
| Obsidian 笔记管理 | 挂载 Obsidian vault，Agent 可研究、整理并直接写回 Markdown 笔记 |
| 分享到日历 | 通过 iOS Share Sheet 将网页或消息发送给 Agent，自动创建含时间和地点的日历事件 |

### Skills 扩展

OpenMinis 支持加载 `SKILL.md` 技能包（与 Claude/OpenClaw 生态高度兼容）。社区维护的技能集涵盖 TTS、搜索、媒体下载、健康分析、云 API 等领域：

- **直接可用**：Claude/OpenClaw 生态的现成 Skills
- **运行更佳**：专门适配了 OpenMinis 工具系统的 Skills（可访问 Linux shell、设备集成和 native offload）

项目地址：[OpenMinis/MinisSkills](https://github.com/OpenMinis/MinisSkills)

更多用户实践案例：[OpenMinis/AwesomeMinis](https://github.com/OpenMinis/AwesomeMinis)

## 五、常见问题与解决方案

**Q: App Store 版本更新慢怎么办？**
加入 TestFlight 测试计划，新版本修复和功能会优先在 TestFlight 发布，比 App Store 快一拍。

**Q: iOS 沙箱性能如何？**
iSH 在 ARM64 设备上有专门优化，常规命令（如 `pip install`、`node`）响应速度可接受；重度计算任务建议在桌面环境完成。

**Q: 数据真的完全本地处理吗？**
API 调用（Claude/GPT/Gemini）的网络请求仍然经过互联网，但用户数据不会主动上传——所有设备集成（健康、日历等）数据均在本地处理，不经过第三方服务器。

**Q: 从源码构建失败？**
参考 `BUILDING.md` 的工具链要求章节，iOS 需要 Xcode + 正确顺序的依赖编译（FFmpeg 依赖 LAME），Android 需要 NDK r28 及以上版本。

**Q: Android APK 无法安装？**
需开启"允许安装未知来源应用"，部分设备还需禁用 Play Protect。

## 六、总结

OpenMinis 代表了移动端 AI Agent 的一种激进路径：**把 Agent 的"大脑"（模型）和"手脚"（系统集成）都跑在用户自己掌心的设备上**。它不仅是一个技术 demo，更是一个真正可以融入日常的数字助手——从记录饮食、管理笔记，到自动化工作流，都可以在不离开手机的情况下完成。

开源、完全免费、支持主流模型，加上深度系统集成能力，让它成为了 iOS/Android 上最具可玩性的开源 AI Agent 项目之一。如果你对本地 AI Agent 感兴趣，或者想要一个真正私有、不依赖云端的 AI 助手，值得一试。

> 官方网站：[openminis.app](https://openminis.app)
> 项目地址：[github.com/OpenMinis/OpenMinis](https://github.com/OpenMinis/OpenMinis)
