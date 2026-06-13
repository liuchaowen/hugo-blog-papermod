---
title: "fanqiang：全平台科学上网工具与教程合集"
date: 2026-06-14
description: "bannedbook/fanqiang 是 GitHub 上最全面的科学上网开源项目，涵盖 Windows、macOS、Linux、Android、iOS、路由器及游戏机等全平台翻墙工具与详细教程，集成 V2ray、Shadowsocks、Clash、Trojan 等多种协议。"
author: "Cheman"
slug: fanqiang
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "科学上网", "V2ray", "Shadowsocks", "Clash", "翻墙"]
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

今天在 GitHub Trending 上看到一个持续更新的开源项目：**bannedbook/fanqiang**，它堪称科学上网领域的"百科全书"，一站式收录了全平台翻墙工具与图文教程。

## 一、项目概述

**fanqiang** 是一个开源的科学上网工具与教程合集项目，目标是帮助用户在不同操作系统和设备上实现自由访问互联网。项目核心特性包括：

- **全平台覆盖**：Windows、macOS、Linux、Android、iOS/iPadOS、路由器（梅林/OpenWRT）、游戏机（PS4/PS5/Switch/Xbox/Apple TV）
- **多协议支持**：V2ray、Shadowsocks、ShadowsocksR、Trojan、Brook、Lightsocks、Goflyway、Daze、蓝灯、Psiphon 等
- **客户端教程齐全**：Clash for Windows、V2rayN、V2rayU、ClashX、Surge、Shadowrocket、Quantumult X 等主流客户端均有详细配置教程
- **ChromeGo 一键翻墙包**：集成多款翻墙工具的便携包，解压即用，内置免费服务器
- **自建服务器教程**：提供 V2ray 和 Shadowsocks 服务器搭建的简明教程
- **长期更新维护**：项目持续跟进网络环境变化，定期更新工具与节点信息

## 二、技术原理

### 架构设计

项目本身不提供单一工具的源码，而是一个**教程索引与工具集合框架**，其架构可概括为：

```
fanqiang/
├── android/          # 安卓翻墙教程
├── ios/              # iOS 翻墙教程
├── macos/            # macOS 翻墙教程
├── windows/          # Windows 翻墙教程
├── linux/            # Linux 翻墙教程
├── router/           # 路由器翻墙教程（梅林/OpenWRT）
├── game/             # 游戏机翻墙教程
├── v2ss/             # 自建 V2ray/SS 服务器教程
├── ChromeGoMac/      # Chrome 一键翻墙包 Mac 版
├── EdgeGo/           # Edge 一键翻墙包
├── FirefoxFqLinux/   # Firefox 翻墙包 Linux 版
└── fqnews2/          # 翻墙新闻安卓 APP
```

### 核心技术栈

项目涵盖的代理协议技术栈包括：

- **V2ray**：支持 VMess、VLESS 等协议，具有强大的路由功能和多入口多出口设计，是目前最主流的科学上网协议之一
- **Shadowsocks/SSR**：轻量级 SOCKS5 代理，SSR 在 SS 基础上增加了混淆和协议插件，增强抗检测能力
- **Trojan**：基于 TLS 的代理协议，流量特征模拟 HTTPS，隐蔽性极强
- **Clash**：支持 SS/V2ray/Trojan 多协议的规则型代理客户端，支持分流规则和订阅管理

### ChromeGo 一键翻墙包原理

ChromeGo 是项目中最具特色的一站式解决方案：

1. **多引擎并行**：集成 Goflyway、V2ray、Daze、SSR、Brook、Lightsocks、Trojan 等多个代理引擎
2. **内置免费服务器**：无需额外配置节点，解压即可使用
3. **自动调用 Chrome**：启动后自动打开 Chrome 浏览器并配置系统代理
4. **顺序尝试机制**：由于国内不同地区、不同运营商封锁策略差异，推荐按编号顺序依次尝试不同工具

## 三、安装与快速开始

### Chrome 一键翻墙包（Windows，最简方案）

1. 确保已安装 Google Chrome 浏览器
2. 从项目 Wiki 下载 Chrome 一键翻墙包
3. 解压到**不含中文和空格**的目录路径
4. 按编号顺序双击运行，从 `0.xx` 开始尝试

### macOS 使用 ClashX

1. 从项目 `macos/ClashX.md` 获取下载链接
2. 安装 ClashX 并导入订阅
3. 设置为系统代理，选择节点即可

### 自建 V2ray 服务器

参考项目 `v2ss/` 目录下的简明教程，核心步骤：

```bash
# 一键安装 V2ray
bash <(curl -s -L https://raw.githubusercontent.com/v2fly/fhs-install-v2ray/master/install-release.sh)

# 编辑配置文件
vim /usr/local/etc/v2ray/config.json

# 启动服务
systemctl start v2ray
```

## 四、使用方法与实战

### Windows 平台推荐方案

| 客户端 | 协议支持 | 适用场景 |
|--------|----------|----------|
| Clash for Windows | SS/V2ray/Trojan | 日常浏览，规则分流 |
| V2rayN | VMess/VLESS/Trojan | 需要灵活协议切换 |
| SSTap | SS/SSR | 游戏加速，全局代理 |

### iOS 平台推荐方案

| 客户端 | 特点 | 备注 |
|--------|------|------|
| Shadowrocket | 功能全面，支持多协议 | 需美区 Apple ID 购买 |
| Quantumult X | 脚本能力强，适合进阶用户 | 需美区 Apple ID 购买 |
| Surge | 规则精细，调试友好 | 价格较高 |

项目还提供了**注册美区 Apple ID**的详细教程（`ios/AppleID.md`），以及通过电脑局域网共享翻墙给 iPhone 的方案（`ios/fqByLan.md`），为不愿购买付费 APP 的用户提供替代方案。

### 路由器翻墙

- **梅林固件**：通过 `router/Merlin.md` 教程，安装科学上网插件实现全屋设备透明代理
- **OpenWRT**：通过 `router/OpenWRT.md` 教程，安装 PassWall 或 ShadowSocksR Plus+ 实现旁路由翻墙

## 五、常见问题与解决方案

### Q1：Chrome 一键翻墙包无法启动？

- 确认已安装 Chrome 浏览器且为默认浏览器
- 确认解压路径不含中文和空格
- **不要在压缩包内直接运行**，必须先解压
- 以管理员身份运行

### Q2：某个工具连接失败？

由于各地区网络封锁策略不同，部分工具可能在特定地区不可用。建议按编号顺序依次尝试所有工具，找到当前网络环境下可用的方案。

### Q3：iOS 设备如何免费翻墙？

可通过 Mac 电脑的 ClashX Pro 开启局域网共享代理（参考 `ios/fqByLan.md`），或利用 Mac 作为旁路由给 iPhone 提供网络（参考游戏机相关教程中的旁路由方案）。

### Q4：自建服务器速度慢？

- 选择距离较近的服务器区域（如香港、日本、新加坡）
- 确认服务器带宽充足
- 尝试开启 V2ray 的 mKCP 或 WebSocket + TLS 传输方式
- 考虑使用 CDN 中转隐藏真实 IP

### Q5：游戏机如何翻墙加速？

项目提供了多种方案：
- Windows 热点共享（`game/` 目录下 Windows 共享 WiFi 教程）
- Mac 旁路由方案（ClashX Pro 作为网关）
- SSTap / Netch 游戏加速器

## 六、总结

bannedbook/fanqiang 是目前 GitHub 上最全面的科学上网开源教程合集，覆盖从入门到进阶的全链路需求：零基础用户可以使用 ChromeGo 一键翻墙包快速上手，中级用户可以选择各平台客户端配合订阅使用，高级用户则可以自建服务器实现完全自主可控的网络访问。项目长期更新维护，紧跟网络环境变化，是值得收藏的实用开源项目。

> 项目地址：[https://github.com/bannedbook/fanqiang](https://github.com/bannedbook/fanqiang)
