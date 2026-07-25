---
title: "BitChat：蓝牙Mesh+Nostr协议的去中心化P2P聊天应用"
date: "2026-07-25"
description: "BitChat 是一款创新的去中心化即时通讯应用，融合蓝牙Mesh离线网络与 Nostr 互联网协议，无需账户、电话号码或中心服务器，实现真正的隐私优先通信。"
author: "Cheman"
slug: bitchat
draft: false
categories: ["技术", "开源", "隐私通信"]
tags: ["GitHub", "去中心化", "蓝牙Mesh", "Nostr", "P2P", "隐私保护", "iOS", "macOS"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**BitChat**，它是一款去中心化的点对点聊天应用，同时利用蓝牙 Mesh 网络实现离线通信和 Nostr 协议实现全球互通，全程无需账户、电话号码和中心服务器，是真正的"隐私优先"通讯工具。

## 一、项目概述

BitChat 由 permissionlesstech 团队开发，核心目标是打造一个**不受中心化服务器约束**的通讯工具。它的最大亮点是**双传输层架构**：

- **蓝牙 Mesh 网络**：设备之间通过蓝牙低功耗（BLE）直连，支持最多 7 跳的多跳中继，在无网络环境下依然可以通信
- **Nostr 协议**：基于互联网的中继网络，支持全球范围内的消息传递，覆盖 290+ 中继节点

此外，BitChat 还引入了基于地理位置的聊天室（Geohash 坐标），用户可以根据所在街区、城市甚至国家加入对应的讨论频道。

## 二、技术原理

### 2.1 双传输层架构

BitChat 的核心创新在于同时支持两套互补的传输层：

```
设备A ← Bluetooth Mesh (最多7跳) → 设备B (离线场景)
设备A ← Nostr Relay Network → 全球任意设备 (互联网场景)
```

**传输选择策略**：

1. **蓝牙优先**：当目标设备在蓝牙范围内时，直接建立 Noise 加密会话，速度最快、隐私性最强
2. **Nostr 兜底**：蓝牙不可用时，使用接收方的 Nostr 公钥通过 NIP-17 协议加密传输
3. **智能队列**：若两者均不可用，消息进入队列，等待连接恢复后自动投递

### 2.2 蓝牙 Mesh 网络

蓝牙 Mesh 层的关键设计：

- **多跳中继**：消息可通过中间设备转发，最多支持 7 跳，覆盖范围远超单设备蓝牙距离
- **Noise Protocol 加密**：每次会话使用前向保密（Forward Secrecy）的端到端加密
- **二进制协议**：针对 BLE 限制优化的紧凑数据包格式，降低带宽消耗
- **自适应功耗**：电池优化的占空比调度，延长移动设备续航

源码中的包定义体现了这一设计：

```swift
// Package.swift 依赖配置
dependencies: [
    .package(path: "localPackages/Arti"),        // Tor 网络
    .package(path: "localPackages/BitFoundation"),// 基础库
    .package(path: "localPackages/BitLogger"),    // 日志系统
    .package(url: "https://github.com/21-DOT-DEV/swift-secp256k1", exact: "0.21.1")
]
```

BitChat 使用纯 Swift 构建，依赖 BitFoundation 提供加密和基础能力，集成 secp256k1 实现椭圆曲线密钥交换。

### 2.3 Nostr 协议层

Nostr 层实现了基于地理坐标的聊天室系统：

- **Geohash 精度分级**：
  - `block #dr5rsj7`（7位）：街道级别
  - `neighborhood #dr5rs`（6位）：社区/城区
  - `city #dr5r`（5位）：城市级别
  - `province #dr`（4位）：省/州级别

- **临时密钥**：每个地理区域使用一次性临时密钥，保护位置隐私
- **NIP-17 协议**：Gift-wrapped 私聊方案，外层信封隐藏实际接收者

### 2.4 安全与隐私

| 特性 | 实现方式 |
|------|---------|
| 无账户体系 | 仅用临时密钥，无持久标识符 |
| 端到端加密 | Mesh 用 Noise，Nostr 用 NIP-17 |
| 前向保密 | 每次会话刷新密钥 |
| 紧急擦除 | 三击清除所有数据 |
| 消息压缩 | LZ4 压缩减少传输体积 |

## 三、安装与快速开始

### 3.1 环境要求

- **macOS**：安装 Xcode 或 `just` 构建工具
- **iOS**：需要 Xcode + 开发者证书 + 配置好的 Bundle ID

### 3.2 macOS 快速启动（推荐）

```bash
# 安装 just 构建工具
brew install just

# 克隆项目
git clone https://github.com/permissionlesstech/bitchat.git
cd bitchat

# 一键运行
just run

# 清理环境（恢复初始状态）
just clean
```

### 3.3 iOS 安装步骤

```bash
cd bitchat

# 1. 复制本地配置模板
cp Configs/Local.xcconfig.example Configs/Local.xcconfig

# 2. 填入你的 Apple Developer Team ID
# 编辑 Configs/Local.xcconfig，设置 TEAM_ID

# 3. 配置 Entitlements（需手动替换 bundle identifier）
# 搜索替换 group.chat.bitchat 为 group.chat.bitchat.<你的TeamID>

# 4. 用 Xcode 打开并运行
open bitchat.xcodeproj
```

## 四、使用方法与实战

### 4.1 加入频道

BitChat 使用类 IRC 的命令风格：

```
# 加入本地蓝牙频道（无需网络）
/join mesh #bluetooth

# 加入地理频道（需要网络）
/join block #dr5rsj7     # 精确到街道
/join neighborhood #dr5rs # 社区级别
/join city #dr5r         # 城市级别
```

### 4.2 私聊

```
# 给指定用户发私信
/msg <npub或公钥> <消息内容>

# 查看当前在线用户
/who

# 发送随机动作
/slap <用户名>
```

### 4.3 离线场景实战

BitChat 在以下场景中尤为有价值：

- **抗议/集会活动**：无需蜂窝网络或WiFi，通过蓝牙Mesh组织人员
- **自然灾害**：基站瘫痪时仍可保持局部通信
- **偏远地区**：无网络覆盖的野外环境
- **隐私敏感场景**：无需注册，任何人都可以匿名使用

## 五、常见问题与解决方案

**Q1: macOS 上 `just run` 报编译错误？**
> 确保 Xcode Command Line Tools 已安装：`xcode-select --install`，同时确保 macOS 版本 ≥ 13。

**Q2: iOS 上搜索不到蓝牙设备？**
> 确认 App 已授予蓝牙权限（首次启动时会弹窗请求），以及目标设备已开启蓝牙且在可视范围内。

**Q3: Nostr 私聊消息对方收不到？**
> 检查网络连接状态，Nostr 层依赖互联网。消息会进入队列，待连接恢复后自动发送。

**Q4: 如何彻底清除所有数据？**
> 在 App 内连续三击屏幕任意位置，即可触发紧急擦除，删除所有本地数据。

**Q5: iOS 和 macOS 可以互聊吗？**
> 可以，同一 Nostr 公钥体系下，跨平台消息互通无忧。

## 六、总结

BitChat 展示了去中心化通信的另一种可能——**不依赖任何中心化基础设施**，蓝牙 Mesh 解决本地离线场景，Nostr 协议解决全球互联场景，中间用智能路由串联。它的技术选型（Swift + Noise Protocol + NIP-17）务实高效，项目已开源并发布到公共领域（Public Domain），适合对隐私通信有兴趣的开发者研究学习。

目前项目已有 iOS/macOS 原生 App，感兴趣的朋友可以到 [GitHub 仓库](https://github.com/permissionlesstech/bitchat) 了解详情，或直接在 [App Store](https://apps.apple.com/us/app/bitchat-mesh/id6748219622) 下载体验。
