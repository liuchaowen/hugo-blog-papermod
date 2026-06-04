---
title: "OpenClaw Windows Hub: 你的 Windows 系统托盘 AI 助手"
date: 2026-06-05
description: "一款专为 OpenClaw 打造的 Windows 系统托盘应用，支持 Quick Send、WebChat、节点控制等丰富功能，让 AI 助手时刻伴随你的桌面。"
author: "Cheman"
slug: openclaw-windows-node
draft: false
categories: ["技术", "开源"]
tags: ["OpenClaw", "Windows", "AI助手", "开源", "WinUI"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenClaw Windows Hub**，这是一款专为 [OpenClaw](https://openclaw.ai)（AI 个人助理）打造的原生 Windows 系统托盘应用。它将 AI 助手的能力无缝融入 Windows 桌面，让你随时随地通过托盘菜单与 AI 进行交互。

## 一、项目概述

OpenClaw Windows Hub 是 OpenClaw 在 Windows 平台上的 companions 套件，包含三个核心项目：

| 项目 | 说明 |
|------|------|
| **OpenClaw.Tray.WinUI** | WinUI 3 系统托盘应用，提供快速访问 OpenClaw 的界面 |
| **OpenClaw.Shared** | 共享的 Gateway 客户端库 |
| **OpenClaw.Cli** | CLI 验证工具，用于测试 WebSocket 连接 |

该项目的核心目标是让 Windows 用户能够像 macOS 用户一样，通过系统托盘便捷地访问 AI 助手功能。它采用现代化的 Windows 11 设计语言，支持深色/浅色模式，与系统主题完美融合。

### 主要特性

- 🦞 **龙虾主题图标** - 像素风格的状态指示图标
- 🎨 **现代 UI** - Windows 11 风格弹出菜单
- 💬 **快捷发送** - 支持全局热键 (Ctrl+Alt+Shift+C) 快速发送消息
- 🔄 **自动更新** - 从 GitHub Releases 自动下载更新
- 🌐 **嵌入式 Web 聊天** - 基于 WebView2 的聊天窗口
- 📊 **实时状态** - 会话、频道、使用量一目了然
- 🔔 **通知提示** - 可分类的 Windows 气泡通知

## 二、技术原理

### 2.1 架构设计

项目采用典型的客户端架构，通过 WebSocket 与 OpenClaw Gateway 进行通信：

```
┌─────────────────────────────────────────┐
│         OpenClaw.Tray.WinUI             │
│  ┌─────────────────────────────────┐   │
│  │     WinUI 3 Flyout Menu          │   │
│  │  - Status / Command Center      │   │
│  │  - Sessions / Usage            │   │
│  │  - Quick Send / Web Chat        │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│  ┌─────────────────────────────────┐   │
│  │   OpenClawGatewayClient         │   │
│  │   (WebSocket Client)             │   │
│  └─────────────────────────────────┘   │
└──────────────────│──────────────────────┘
                   │ WebSocket
                   ▼
┌───────────────────────────────────────��─┐
│         OpenClaw Gateway               │
│         (localhost:18789)               │
└─────────────────────────────────────────┘
```

### 2.2 核心技术栈

项目使用以下技术构建：

- **.NET 10.0** - 现代 .NET 运行时
- **WinUI 3** - Windows UI 框架，提供原生 Fluent Design
- **WebView2** - 嵌入式 Edge 浏览器，用于 Web 聊天
- **WebSocket** - 与 Gateway 的实时通信协议

在 `OpenClaw.Shared` 中，Gateway 客户端的实现核心如下：

```csharp
public class OpenClawGatewayClient
{
    private readonly ClientWebSocket _ws;
    
    public async Task ConnectAsync(string url, string token)
    {
        _ws = new ClientWebSocket();
        _ws.Options.SetRequestHeader("Authorization", $"Bearer {token}");
        await _ws.ConnectAsync(new Uri(url), CancellationToken.None);
    }
    
    public async Task SendAsync(JsonElement message)
    {
        var bytes = Encoding.UTF8.GetBytes(message.GetRawText());
        await _ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
```

### 2.3 节点模式（Node Mode）

除了基础的托盘功能，该项目还支持**节点模式**，允许你的 Windows PC 成为受 OpenClaw 控制的计算节点。这意味着 AI 可以在你的 Windows 机器上执行各种操作：

| 能力 | 命令 | 说明 |
|------|------|------|
| **系统** | `system.notify`, `system.run` | 显示通知、执行命令 |
| **画布** | `canvas.present`, `canvas.snapshot` | 控制 WebView2 窗口 |
| **屏幕** | `screen.snapshot`, `screen.record` | 截图和录屏 |
| **相机** | `camera.list`, `camera.snap` | 枚举摄像头、拍照 |
| **语音合成** | `tts.speak` | 文本转语音播放 |
| **设备信息** | `device.info`, `device.status` | 获取主机/应用元数据 |

节点的执行策略存储在 `%LOCALAPPDATA%\OpenClawTray\exec-policy.json`，允许用户细粒度地控制哪些命令可以被执行。

### 2.4 深度链接（Deep Links）

项目注册了 `openclaw://` URL scheme，支持多种快捷操作：

| 链接 | 功能 |
|------|------|
| `openclaw://settings` | 打开设置页面 |
| `openclaw://chat` | 打开聊天窗口 |
| `openclaw://commandcenter` | 打开诊断中心 |
| `openclaw://send?message=Hello` | 快捷发送消息 |

这些链接使得自动化和第三方集成成为可能。

## 三、安装与快速开始

### 3.1 环境要求

- Windows 10 (20H2+) 或 Windows 11
- .NET 10.0 SDK
- Windows 10 SDK（用于 WinUI 构建）
- WebView2 Runtime（Windows 11 已预装）

### 3.2 安装步骤

有两种方式可以获取该应用：

**方式一：下载安装包（推荐）**

直接下载最新的稳定版安装程序：

```powershell
# x64 架构
Invoke-WebRequest -Uri "https://github.com/openclaw/openclaw-windows-node/releases/latest/download/OpenClawCompanion-Setup-x64.exe" -OutFile "OpenClawCompanion-Setup-x64.exe"

# ARM64 架构
Invoke-WebItem "https://github.com/openclaw/openclaw-windows-node/releases/latest/download/OpenClawCompanion-Setup-arm64.exe" -OutFile "OpenClawCompanion-Setup-arm64.exe"
```

**方式二：手动构建**

```powershell
# 克隆仓库
git clone https://github.com/openclaw/openclaw-windows-node.git
cd openclaw-windows-node

# 检查前置条件
.\build.ps1 -CheckOnly

# 构建所有项目
.\build.ps1
```

### 3.3 首次运行

首次启动时，应用会引导你完成六步设置向导：

1. **欢迎页** - 介绍 OpenClaw 并开始设置流程
2. **连接** - 选择本地 Gateway、远程 Gateway 或稍后配置
3. **向导** - Gateway 驱动的配置步骤（AI 提供商、人格设置）
4. **权限** - 审核 Windows 系统权限
5. **聊天** - 与 AI 助手进行首次对��
6. **完成** - 显示可用功能摘要

## 四、使用方法与实战

### 4.1 快捷发送（Quick Send）

使用全局热键 **Ctrl+Alt+Shift+C** 快速调出发送窗口，无需点击托盘图标。这一功能特别适合需要频繁与 AI 交互的用户。

```powershell
# 热键触发后，输入消息并发送
# 消息会通过 Gateway 的 chat.send 方法送达
```

### 4.2 命令中心（Command Center）

命令中心是从托盘菜单访问的诊断面板，展示：

- Gateway 连接状态和频道健康状况
- 当前活动的会话列表
- 使用量和成本统计
- 节点清单和在线状态
- 最近的活性事件流

### 4.3 节点控制

从 macOS 或 Gateway 所在的机器可以远程控制 Windows 节点：

```bash
# 在 Gateway 所在机器执行
# 发送通知
openclaw nodes notify --node <device-id> --title "Hello" --body "From Mac!"

# 执行命令
openclaw nodes invoke --node <device-id> --command system.run --params '{"command":"Get-Process | Select -First 5","shell":"powershell","timeoutMs":10000}'

# 截取屏幕截图
openclaw nodes invoke --node <device-id> --command screen.snapshot --params '{"screenIndex":0,"format":"png"}'
```

### 4.4 语音合成

Windows 节点支持文本转语音功能：

```bash
openclaw nodes invoke --node <device-id> --command tts.speak --params '{"text":"你好，我是 OpenClaw","provider":"windows"}'
```

也可以使用 ElevenLabs（需在设置中配置 API Key）。

## 五、常见问题与解决方案

### 5.1 Quick Send 提示 "missing scope: operator.write"

这是因为令牌缺少 `operator.write` 作用域。解决方案：

1. 更新托盘应用使用的令牌，确保包含 `operator.write` 作用域
2. 在 Gateway 配置中重新生成包含该作用域的令牌

### 5.2 配对失败 / "NOT_PAIRED"

设备未被批准连接到 Gateway。解决方法：

```bash
openclaw devices list          # 查看设备列表
openclaw devices approve <id>  # 批准设备
```

### 5.3 构建失败：找不到 .NET SDK

确保已安装 .NET 10.0 SDK：

```powershell
# 检查安装的 .NET 版本
dotnet --list-sdks

# 如未安装，从以下地址下载：
# https://dotnet.microsoft.com/download/dotnet/10.0
```

### 5.4 WebView2 运行时错误

如果遇到 WebView2 相关错误，下载安装 WebView2 Runtime：

```
https://developer.microsoft.com/microsoft-edge/webview2
```

### 5.5 节点模式下命令执行被拒绝

检查节点上的执行策略配置：

```powershell
# 查看当前执行策略
openclaw nodes invoke --node <device-id> --command system.execApprovals.get

# 添加自定义规则
openclaw nodes invoke --node <device-id> --command system.execApprovals.set --params '{"rules":[{"pattern":"powershell.exe","action":"allow"},{"pattern":"*","action":"deny"}],"defaultAction":"deny"}'
```

## 六、总结

OpenClaw Windows Hub 为 Windows 用户带来了完整的 AI 助手体验，无论是作为日常的快捷发送工具，还是作为可编程的远程计算节点，都表现出色。项目采用现代化的技术栈和设计，体现了微软生态的最新实践。

如果你在使用 OpenClaw 作为个人 AI 助手，这款 Windows 托盘应用绝对值得一试。它不仅提供了便捷的交互方式，还通过节点模式扩展了 AI 的能力边界。