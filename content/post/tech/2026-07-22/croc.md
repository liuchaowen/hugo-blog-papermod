---
title: "croc：一行命令在任意两台电脑间安全传输文件"
date: "2026-07-22"
description: "croc 是一款简洁安全的命令行文件传输工具，支持任意两台电脑间直接传输文件/文件夹，基于 PAKE 端到端加密，无需公网 IP 或端口转发，跨平台支持 Windows、Linux、macOS。"
author: "Cheman"
slug: croc
draft: false
categories: ["技术", "开源"]
tags: ["Go", "文件传输", "端到端加密", "命令行工具", "开源"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**croc**，一句话描述它的核心价值——任意两台电脑之间，无需公网 IP、无需配置端口转发，只需一条命令就能安全传输文件。

## 一、项目概述

[croc](https://github.com/schollz/croc) 是一款用 Go 语言编写的命令行文件传输工具，最大的特点是**极简 + 安全**。它最大的竞争对手是 [magic-wormhole](https://github.com/magic-wormhole/magic-wormhole)，但 croc 在功能丰富度和跨平台体验上更胜一筹。

核心特性一览：

- **任意两台电脑直传**：借助公共 relay 服务器，无需配置路由器或内网穿透
- **端到端加密**：使用 PAKE（Password-Authenticated Key Agreement）协议，传输内容全程加密，relay 服务器也无法窥探
- **跨平台**：Windows、Linux、macOS、Android 全覆盖，甚至还有 F-Droid 上的 GUI 客户端
- **断点续传**：传输中断后可恢复，无需重头来
- **多文件/文件夹传输**：一次可传输多个文件或整个目录
- **IPv6-first**：优先使用 IPv6，IPv4 作为 fallback
- **支持代理**：可搭配 Tor 等 SOCKS5 代理使用

## 二、技术原理

### 2.1 整体架构

croc 的架构分为客户端和 relay 服务器两部分：

```
发送方 (Sender)  ──TCP──▶  relay  ──TCP──▶  接收方 (Receiver)
        │                                  │
        └────────  PAKE 密钥协商 ──────────┘
```

中继 relay 服务器默认托管在 `croc.schollz.com`，也支持自建。传输过程分两阶段：

1. **控制通道建立**：发送方和接收方通过 relay 交换元信息（文件名、文件大小、校验和）
2. **数据传输**：内容通过 relay 或直连（同一局域网内自动直连）传输

### 2.2 PAKE 端到端加密原理

croc 使用 [PAKE（Password-Authenticated Key Agreement）](https://en.wikipedia.org/wiki/Password-authenticated_key_agreement) 协议实现端到端加密，其核心优势在于：**即使有人在传输过程中截获了 code phrase（一次性验证码），也无法解密文件内容**。

具体流程（以发送方为例，`main.go` 调用 `cli.Run()`）：

```go
// 发送方生成 PAKE 会话
pake := pake.NewPAKE(pake.SupportedCurves[0])
err := pake.Init(password, nil)
clientHello := pake.GetPublicKey()

// 接收方收到后初始化自己的 PAKE 并返回公钥
receiverPake := pake.NewPAKE(pake.SupportedCurves[0])
receiverPake.Init(password, nil)
serverHello := receiverPake.GetPublicKey()

// 双方各自计算共享密钥（无需传输私钥）
senderSecret := pake.Process(serverHello)
receiverSecret := receiverPake.Process(clientHello)
// senderSecret == receiverSecret
```

依赖 `github.com/schollz/pake/v3` 实现，密钥协商完成后，后续所有文件数据均使用该密钥加密（AES-GCM）。

### 2.3 源码结构一览

```
src/
├── cli/           # 命令行交互层
├── utils/         # 工具函数
├── relay/         # 中继服务器实现
└── models/        # 数据模型
```

客户端入口在 `main.go`，核心业务逻辑在 `src/cli/`。relay 服务器使用 Go 标准库的 TCP 多端口监听（9009-9013），`Dockerfile` 中清晰展示了部署方式：

```dockerfile
EXPOSE 9009
EXPOSE 9010
EXPOSE 9011
EXPOSE 9012
EXPOSE 9013
```

## 三、安装与快速开始

### 3.1 环境要求

- Go 1.22+（从源码构建）
- 或直接下载对应平台的二进制文件

### 3.2 一键安装（Linux/macOS）

```bash
curl https://getcroc.schollz.com | bash
```

### 3.3 macOS 使用 Homebrew

```bash
brew install croc
```

### 3.4 Windows

```bash
scoop install croc
# 或
choco install croc
# 或
winget install schollz.croc
```

### 3.5 从源码构建

```bash
go install github.com/schollz/croc/v10@latest
```

### 3.6 Docker 运行 relay

```bash
docker run -d -p 9009-9013:9009-9013 -e CROC_PASS='YOURPASSWORD' docker.io/schollz/croc
```

## 四、使用方法与实战

### 4.1 最简用法：发送单个文件

**发送方：**

```bash
croc send /path/to/file.tar.gz
# 输出：
# Sending 'file.tar.gz' (1.2 GB)
# Code is: swift-pony-joey
```

**接收方（任意一台联网电脑）：**

```bash
croc swift-pony-joey
# 文件自动下载到当前目录
```

整个过程只需要一个 6 位以上的 code phrase，非常适合手机和电脑之间、或者两台远程服务器之间传文件。

### 4.2 发送文件夹

```bash
croc send ./my-project-folder
```

### 4.3 发送文本内容（URL、代码片段）

```bash
croc send --text "https://github.com/schollz/croc"
```

### 4.4 自定义 code phrase（方便记忆）

```bash
croc send --code mysecret /path/to/file
```

### 4.5 显示二维码（手机扫码接收）

```bash
croc send --qr ./photo.jpg
```

### 4.6 通过代理传输（Tor）

```bash
croc --socks5 "127.0.0.1:9050" send SOMEFILE
```

### 4.7 Linux/macOS 安全模式（防止命令行泄露 code）

由于 Linux/macOS 上进程名在 `/proc` 中可见，croc 默认将 code phrase 放入环境变量传递：

```bash
CROC_SECRET="swift-pony-joey" croc
```

首次安装后可永久开启：

```bash
croc --classic
```

## 五、常见问题与解决方案

**Q1: 传输速度慢？**
确保两端网络环境良好。croc 默认通过 relay 中转，同一局域网内会自动直连（速度更快）。也可以自建 relay 放在同区域服务器上：`croc --relay "your-relay.com:9009" send file`

**Q2: 连接失败、relay 不可用？**
公共 relay `croc.schollz.com` 有时会限流或不可达。可以自建 relay，或使用 `--relay` 指定其他 relay 地址。Docker 部署一条命令搞定（见上方）。

**Q3: 传输大文件（> 2GB）？**
完全支持，croc 支持断点续传，即使中途中断也不需要从头传输。

**Q4: 如何确保传输安全？**
croc 使用 PAKE 端到端加密，code phrase 只用于密钥协商，不会直接传输密钥。即使 relay 服务器被攻击者控制，也无法解密内容。唯一需要注意的是：**code phrase 不要通过同一网络通道传输**，建议用手机短信、即时通讯等带外方式分享 code。

**Q5: 想用自己喜欢的 relay？**
```bash
# 自建 relay
croc relay

# 发送时指定 relay
croc --relay "myrelay.example.com:9009" send file
```

## 六、总结

croc 解决了一个非常具体但高频的痛点：**两台没有配置任何网络的电脑之间，如何安全地传一个大文件？** 它用极简的用户体验（一个 code 走天下）和扎实的加密技术（PAKE 端到端加密）给出了漂亮答案。如果你经常需要在不同设备间传文件、又不想借助微信/QQ/网盘这些"大厂"方案，croc 值得一试。

项目地址：[https://github.com/schollz/croc](https://github.com/schollz/croc)
