---
title: "Shittim-Server：一个 Blue Archive 私服的 C# 实现"
date: "2026-07-30"
description: "Shittim-Server 是 Neoexm 用 C# 和 ASP.NET Core .NET 10 实现的功能完整的 Blue Archive 私服，支持 Nexon/IAS/IMS 登录流程、MX 游戏协议加解密、SQLite 持久化，适合二次元游戏逆向和私服研究。"
author: "Cheman"
slug: shittim-server
draft: false
categories: ["技术", "开源", "游戏"]
tags: ["Blue Archive", "私服", "C#", "ASP.NET Core", ".NET 10", "逆向工程"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Shittim-Server**，一个用 C# 和 ASP.NET Core (.NET 10) 实现的 Blue Archive 功能完整的私服，支持官方 Nexon 登录流程、MX 游戏协议加解密和 SQLite 持久化，非常适合游戏逆向爱好者和私服研究者参考。

## 一、项目概述

Blue Archive 是由 Nexon 旗下 MX Studio 开发的一款二次元手游，日服由 iOS/Android 发行，国际服由 NEXON Company 提供。Shittim-Server 的目标是复刻游戏服务端的核心功能，让玩家可以在私人服务器上体验完整游戏内容。

核心特性包括：

- **多方式登录支持**：兼容 Nexon / IAS / IMS 三种登录协议，覆盖国际服和日服
- **MX 协议实现**：完整处理客户端与服务端之间的二进制协议包，含自定义加密/解密逻辑
- **HAR 日志记录**：内置 HTTP Archive 日志能力，方便抓包分析和流量调试
- **MITMProxy 集成**：借助 mitmproxy 进行流量拦截和处理，解密游戏加密通信
- **跨平台依赖**：使用 PowerShell 一键启动脚本，Windows 友好

技术栈方面，项目选型极为清晰：ASP.NET Core 作为高性能 HTTP 服务器，C# 作为游戏逻辑层主语言，SQLite 提供轻量数据持久化mitmproxy + Python 组合处理加密中间人。

## 二、技术原理

### 2.1 认证与登录流程

Blue Archive 客户端通过 HTTPS 与上游认证服务器通信，Shittim-Server 完整模拟了这一流程。以 `autorun.ps1` 启动后，ASP.NET Core 服务监听 `http://localhost:5000`，mitmproxy 拦截游戏流量并重定向至本地服务端。

登录流程简析如下：

```
客户端 → mitmproxy → Shittim-Server (ASP.NET Core :5000)
         ↓
    SQLite 数据库查询账户
         ↓
    返回登录票据 (Ticket) + 游戏服务器地址
```

核心在于 `Login` 接口模拟——私服需要返回一个与原版兼容的 session token 格式，客户端才能进入主界面。

### 2.2 MX 协议与数据包加解密

Blue Archive 使用二进制协议，数据包通常经过 AES 或自定义 RC4 变种加密。Shittim-Server 在源码中实现了 `PacketEncryption` 和 `PacketDecryption` 模块（基于反射和运行时 hook，非明文可见），结合 mitmproxy 的 TLS 解密能力，完整还原数据包内容。

项目结构中关键文件：

| 文件 | 作用 |
|------|------|
| `autorun.ps1` | 一键启动引导脚本，串联 .NET 服务 + mitmproxy |
| `packet/` | MX 协议编解码核心逻辑 |
| `auth/` | 三种登录协议 (Nexon/IAS/IMS) 的认证适配 |
| `database/` | SQLite schema 与账户 CRUD |

### 2.3 mitmproxy 中间人架构

私服与原版游戏最大区别在于网络层透明代理：mitmproxy 作为反向代理在本地 8080 端口监听，将目标域名请求转发到 Shittim-Server。由于 HTTPS 加密，客户端需安装 mitmproxy CA 证书至系统信任根（Windows 下需 Local Machine 级别安装，否则 Steam 版 Blue Archive 不会生效）。

```
[Blue Archive Steam 客户端]
        ↓ HTTPS
[mitmproxy :8080] → 解密 → [Shittim-Server :5000]
        ↓              ↓
    web UI (:8081)   SQLite DB
```

`autorun.ps1` 脚本在启动时自动检查 .NET SDK 和 mitmproxy 是否在 PATH 中，缺失则给出明确指引，最大限度降低入门门槛。

## 三、安装与快速开始

### 环境要求

- **.NET 10 SDK**（建议通过 [dotnet-install.ps1](https://docs.microsoft.com/zh-cn/dotnet/core/tools/dotnet-install-script) 安装）
- **Blue Archive Steam 版本**（客户端）
- **Python 3.8+** 与 mitmproxy（含 `mitmweb`，需在 PATH 中）
- **Windows 系统**（脚本为 PowerShell，目前主要面向 Windows）

### 安装步骤

**Step 1 — 安装 mitmproxy CA 证书（一次性）**

```powershell
# 启动 mitmproxy
mitmweb

# 系统代理设置 → 启用 127.0.0.1:8080
# 浏览器访问 http://mitm.it → 下载 Windows 证书
# 双击证书 → 证书导入向导 → 存储位置选"本地计算机"
# → 放入受信任的根证书颁发机构
```

**Step 2 — 克隆项目并启动**

```powershell
git clone https://github.com/Neoexm/Shittim-Server.git
cd Shittim-Server

# 一键启动（自动检查依赖）
.\autorun.ps1
```

启动成功后，终端显示 ASP.NET Core 服务和 mitmproxy 的状态信息。

**Step 3 — 进入游戏**

Steam 启动 Blue Archive，客户端在登录界面输入任意账号（私服模式通常绕过注册），即可进入游戏主界面。

## 四、常见问题与解决方案

**Q1: `autorun.ps1` 报错"找不到 mitmweb"**

确保 mitmproxy 已安装且 `mitmweb` 在系统 PATH 中。独立安装：
```powershell
pip install mitmproxy
```
或从 [mitmproxy.org](https://mitmproxy.org) 下载 Windows 二进制包。

**Q2: 游戏连接超时，无法登录**

检查三点：① mitmproxy 是否在 8080 端口正常监听；② mitmproxy CA 证书是否已装入"本地计算机"级信任根（非当前用户）；③ ASP.NET Core 服务是否在 5000 端口成功启动。

**Q3: .NET 10 SDK 未找到**

项目要求 .NET 10，若未正式发布则可能需要安装预览版：
```powershell
# 安装 .NET 10 Preview
dotnet-install.ps1 -Channel 10.0 -Install
```

**Q4: 数据包仍加密，无法分析**

确保客户端正确安装了 mitmproxy CA 证书，且浏览器/游戏走的是 mitmproxy 代理。若是 Steam 启动的游戏，需确认系统代理覆盖了所有流量。

## 五、总结

Shittim-Server 是一个高质量的 Blue Archive 私服实现，展现了游戏逆向工程在 .NET 生态中的典型实践：ASP.NET Core 高性能 HTTP 服务层、C# 二进制协议编解码、带 MITM 的 TLS 中间人架构，以及 SQLite 轻量持久化。对于想学习游戏协议逆向或二次元私服架构的开发者而言，这是一个非常值得研究的上游项目。

> ⚠️ **免责声明**：本项目仅供教育和研究目的，与 Nexon 或 Blue Archive 官方无任何关联。
