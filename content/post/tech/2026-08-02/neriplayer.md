---
title: "NeriPlayer：一个功能强大的多源音频播放器"
date: 2026-08-02
description: "NeriPlayer 是一个基于 Jetpack Compose 和 Media3 的原生 Android 音频播放器，支持网易云音乐、Bilibili、YouTube Music 多源播放，本地优先数据管理，以及 GitHub/WebDAV 同步，为音乐爱好者提供极致的播放体验。"
author: "Cheman"
slug: neriplayer
draft: false
categories: [技术, 开源]
tags: [Android, 音乐播放器, Jetpack Compose, Media3, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**NeriPlayer**，这是一个把多源在线播放、本地管理、歌词体验和自建同步做进原生 Android 的音频播放器，采用 Jetpack Compose + Media3 架构，为用户提供极致的音乐播放体验。

## 一、项目概述

NeriPlayer 是一个原生 Android 音频播放器，不构建公共云端服务，而是在用户具备第三方平台账号能力的前提下，整合网易云音乐、Bilibili 与 YouTube Music 的在线内容，并提供本地播放、下载、缓存、歌单管理和多种同步/备份能力。

### 核心定位

- **账号即能力**：通过第三方平台授权启用搜索、播放、歌单和收藏夹访问
- **本地优先**：播放缓存、下载文件、歌单、历史记录、设置与授权信息默认保存在设备本地
- **可选同步**：可将歌单、收藏、最近播放和播放统计同步到用户自己的 GitHub 仓库或 WebDAV 远端文件
- **尊重隐私与账号安全**：数据写入用户自己控制的 GitHub/WebDAV 远端，而不是上传到中心化服务

### 主要特性

- 🎧 多源探索与播放：支持网易云音乐、Bilibili、YouTube Music 与本地音频播放
- 🧠 Media3 播放核心：PlayerManager 管理音源解析、队列、随机/循环、状态恢复、失败重试
- 🔁 网易云自动换源：无权限或试听片段时，自动匹配 Bilibili 音源兜底
- 💾 可配置流媒体缓存：使用 SimpleCache + LRU 缓存音频，默认上限 1 GB
- ⬇️ 应用内下载与管理：支持多平台音频下载，保存歌词、封面、元数据和音频标签
- ☁️ GitHub / WebDAV 同步：可选同步本地歌单、收藏歌单、最近播放和播放统计
- 🌈 个性化与主题：支持自动/浅色/深色模式、动态取色、UI 缩放、自定义背景图

## 二、技术原理

### 架构设计

项目采用 **单 Activity + Compose 架构**，MainActivity 是唯一对外入口，UI 由 Compose NavHost、动态底栏、Mini Player 与 Now Playing 覆盖层组织。

#### 启动与恢复链路

正常启动流程为 `Loading -> Disclaimer -> Onboarding -> Main`；如果上次启动发生崩溃或系统 ANR，会先进入 `Safe Mode`。

#### 模块结构

- `:app`：主 Android 应用
- `:ksp-annotations` / `:ksp-processor`：设置项自动登记与生成
- `:accompanist-lyrics-core` / `:accompanist-lyrics-ui`：歌词解析与 Compose 歌词 UI 子模块
- `build-logic`：统一 Gradle convention plugin
- `np-submodule/NeriPlayer-LTW`：一起听 Cloudflare Workers 服务端

### 核心技术栈

- **构建配置**：compileSdk = 37, targetSdk = 36, minSdk = 28
- **语言与工具**：Java 17 / Kotlin JVM 17, NDK 27.0.12077973, CMake 3.28.0+
- **播放核心**：Media3 ExoPlayer，由 PlayerManager 统一管理
- **UI 框架**：Jetpack Compose，支持平板/横屏自适应布局

### 关键技术实现

#### 多源播放机制

PlayerManager 负责音源解析、队列和失败恢复；网易云不可播、无直链或只返回试听片段时，会先尝试音质降级，再由 PlayerManagerNeteaseAutoSourceSwitch 按歌名、歌手和时长评分自动匹配 Bilibili 音源兜底。

#### YouTube 取流多级回退

登录态会保留有效身份 Cookie，并与匿名 visitor 分别维护 bootstrap 和 PoToken 会话；Cookie 轮换、签名/n 参数、player.js 和挑战结果会优先复用缓存，失效的 player.js 或被 CDN 拒绝的直链会进入 EJS/HLS 回退。

#### GLSL/AGSL 高性能流体背景

播放页动态背景由 BgEffectPainter 加载 `assets/shaders/hyper_background_effect.glsl` 并通过 RuntimeShader 逐帧渲染；shader 内部基于封面取色、动态色块和轻量颗粒噪声生成流体背景，并接入 uMusicLevel / uBeat 做音频响应。

#### USB 独占播放

支持 UAC1.0 和兼容 UAC2.0 Type I PCM 的 USB DAC 设备，支持设备选择、采样率/位深/缓冲策略、32-bit PCM、PCM float 软件转换、后台运行提醒、UAC2 时钟拓扑与显式反馈端点解析。

### 数据流分析

#### 本地优先数据管理

- 播放缓存、下载文件、歌单、历史记录、设置保存在设备本地
- NetworkStatusMonitor 基于系统默认网络承载自动识别脱机状态
- offlineCachedImageRequest 会在脱机时阻断远程图片请求并优先使用缓存

#### 去中心化同步

- GitHub/WebDAV 同步只在用户自己的远端保存歌单、收藏、最近播放和播放统计等元数据
- PlaybackStatsRepository 按歌曲稳定身份记录播放次数、收听时长、最近播放和每日桶
- 播放和流量统计采用延迟批量写入，在关键生命周期阶段 flush

## 三、安装与快速开始

### 环境要求

- Android 9 (API 28) 及以上设备
- 推荐使用 arm64-v8a 版本（大部分现代手机）
- 老旧 32 位设备请选择 armeabi-v7a 版本
- x86 / x86_64 主要用于模拟器、英特尔设备或 Chromebook

### 安装步骤

#### 方式一：下载 Release 版本（推荐）

1. 前往 [GitHub Releases](https://github.com/cwuom/NeriPlayer/releases)
2. 根据设备架构选择对应 APK
3. 安装并启动应用
4. 首次启动时阅读免责声明并完成启动引导

#### 方式二：下载 CI 版本

1. 前往 [GitHub Actions](https://github.com/cwuom/NeriPlayer/actions) 下载最近成功构建的 Artifacts
2. 或访问 [NeriPlayer CI Builds](https://t.me/neriplayer_ci) Telegram 频道

#### 方式三：本地构建

```bash
# 克隆仓库并初始化子模块
git clone --recursive https://github.com/cwuom/NeriPlayer.git
cd NeriPlayer

# 使用 Android Studio 打开项目并同步依赖

# 构建调试版
./gradlew :app:assembleDebug

# 安装 APK
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 最简运行示例

首次启动流程：

1. 阅读并同意免责声明
2. 完成启动引导（Android 13+ 会申请通知权限）
3. 选择音乐平台并登录（网易云 / Bilibili / YouTube Music）
4. 开始搜索和播放音乐

如需调试工具，在设置页连续点击 **版本号** 7 次启用开发者模式，底栏会出现独立 Debug 页面。

## 四、使用方法与实战

### 基础用法

#### 音乐搜索与播放

- 在 Explore 页面使用网易云 / Bilibili / YouTube Music 按平台独立搜索
- 点击歌曲即可播放，支持查看歌词、封面和元数据
- Mini Player 支持横向滑动切换上一首/下一首

#### 歌单管理

- Library 提供本地、收藏、网易云、YouTube Music、Bilibili 等入口
- 本地页支持歌单/歌手切换、搜索、歌手排序
- 支持创建、重命名、删除、排序普通本地歌单

#### 下载管理

- 支持多平台音频下载，默认下载并发为 6（可在设置中调整，最高 8）
- 下载队列会持久化，应用重启后可恢复未完成任务
- 支持自定义下载目录和文件名模板

### 进阶用法

#### GitHub / WebDAV 同步

1. 在设置中配置 GitHub 仓库或 WebDAV 服务器
2. 选择要同步的内容：歌单、收藏、最近播放、播放统计
3. 手动或自动触发同步
4. 数据保存在用户自己的远端，完全掌控

#### 一起听功能

1. 创建房间或加入他人房间
2. 通过 WebSocket 实时同步播放状态
3. 支持房主/听众权限、成员控制、循环/随机模式同步
4. 支持邀请链接和深链加入

#### 歌词体验

- 支持逐词/逐字高亮、翻译歌词、音译显示、歌词偏移
- 支持悬浮歌词、状态栏歌词、SuperLyric、蓝牙歌词
- 支持歌词卡片生成和分享

### 实际项目示例

#### 场景一：多平台音乐管理

用户在网易云音乐有收藏歌单，在 Bilibili 有订阅收藏夹，通过 NeriPlayer 可以：

1. 登录网易云和Bilibili 账号
2. 在 Library 中查看两个平台的歌单
3. 统一管理播放列表
4. 支持跨平台搜索同一首歌曲

#### 场景二：离线播放

1. 下载喜欢的歌曲到本地
2. 在脱机模式下仍可播放已下载音频
3. 自动使用本地缓存和下载文件
4. 网络恢复后自动同步播放统计

#### 场景三：自定义音效

1. 在播放页打开音效控制面板
2. 调节倍速、音调、均衡器
3. 开启响度均衡、声道平衡
4. 使用 USB 独占播放获得更高音质

## 五、常见问题与解决方案

### 安装失败

**问题**：APK 安装失败，提示"未安装应用"

**解决方案**：
- 检查是否开启了"允许安装未知来源应用"
- 卸载旧版本后再安装新版本
- 确认下载的是正确架构的 APK（arm64-v8a）

### 运行时错误

**问题**：播放失败或卡顿

**解决方案**：
- 检查网络连接状态
- 尝试切换音源（网易云 → Bilibili）
- 清理应用缓存后重试
- 查看开发者模式中的日志

**问题**：登录失败

**解决方案**：
- 使用二维码登录（网易云/Bilibili）
- 检查账号是否被封禁或限制
- 尝试使用网页登录兜底

### 性能问题

**问题**：应用卡顿或内存占用高

**解决方案**：
- 清理音频缓存和图片缓存
- 减少下载并发数
- 关闭高级模糊效果
- 关闭歌词模糊效果

**问题**：耗电快

**解决方案**：
- 关闭后台播放
- 减少同步频率
- 使用本地文件而非在线流媒体

### 兼容性

**问题**：某些设备上功能不可用

**解决方案**：
- Android 13+ 才支持 RuntimeShader 动态背景
- Android 12+ 才支持封面模糊
- 部分 USB DAC 设备需要开启兼容性开关
- 魅族状态栏歌词仅部分设备可用

**问题**：歌词显示异常

**解决方案**：
- 手动编辑歌词偏移
- 检查歌词文件格式（LRC/TXT）
- 尝试使用其他歌词源（LRCLIB）

## 六、总结

NeriPlayer 是一个功能强大、设计精良的 Android 音频播放器，它突破了传统音乐应用的限制，实现了多平台整合、本地优先、隐私保护的完美结合。项目采用现代化的 Jetpack Compose + Media3 架构，代码质量高，功能完善，适合学习 Android 高级开发和音乐播放器实现。

**项目亮点**：
- 多源播放不是简单入口堆叠，而是智能换源和失败恢复机制
- 本地优先设计理念，脱机体验完善
- 丰富的歌词体验和个性化选项
- 完整的同步和备份能力
- USB 独占播放支持高解析度输出

**适用场景**：
- 多平台音乐爱好者统一管理播放列表
- 注重隐私的用户自建同步服务
- 追求高音质的音频发烧友
- 学习 Android 高级开发的开发者

项目持续迭代中，欢迎关注 [GitHub 仓库](https://github.com/cwuom/NeriPlayer) 获取最新更新。
