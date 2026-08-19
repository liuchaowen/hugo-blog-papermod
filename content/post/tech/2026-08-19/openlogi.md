---
title: "OpenLogi：用 Rust 重写 Logitech Options+，本地优先的罗技鼠标驱动替代方案"
date: 2026-08-19
description: "OpenLogi 是一个用 Rust 编写的 Logitech Options+ 本地替代方案，支持 Bolt/Unifying 接收器、蓝牙直连和 USB 有线设备，提供按键重映射、DPI 调节、SmartShift 滚轮控制和 RGB 灯光配置，无需账户、无遥测、跨平台支持 macOS/Linux/Windows。"
author: "Cheman"
slug: openlogi
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "Logitech", "HID++", "驱动", "开源", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenLogi**，一个用 Rust 重写的 Logitech Options+ 替代方案，让你的罗技鼠标完全摆脱官方驱动的束缚。

## 一、项目概述

OpenLogi 是一个本地优先的 Logitech HID++ 设备管理工具，通过 Logi Bolt 和 Unifying 接收器、蓝牙直连或 USB 有线连接与罗技外设通信，提供按键重映射、DPI 调节、SmartShift 滚轮控制、RGB 键盘灯光等功能，完全无需 Logitech 账户、无需云同步、无遥测数据上传。

### 核心特性

- **跨平台支持**：macOS、Linux、Windows 三平台原生支持，其中 Linux 是一等公民（evdev/uinput hook、udev 规则、systemd 用户单元）
- **纯本地配置**：所有绑定配置保存在一个 TOML 文件中，可读、可 diff、可版本控制
- **无 Electron 臃肿**：Rust + GPUI 原生 GUI，轻量无臃肿
- **手势按钮自定义**：在手势按钮、中键、后退/前进键上均可设置方向滑动手势
- **应用级配置切换**：根据当前焦点应用自动切换按键配置

## 二、技术原理

### 架构设计

OpenLogi 采用三层架构：

```
┌─────────────────┐
│  OpenLogi GUI   │  ← GPUI 桌面应用，交互式鼠标图示、按键选择器
│   (IPC Client)  │
└────────┬────────┘
         │ IPC (Unix Socket / Named Pipe)
┌────────▼────────┐
│  OpenLogi Agent │  ← 后台服务，持有输入钩子和所有设备 I/O
└────────┬────────┘
         │ HID++
┌────────▼────────┐
│  Logitech HID++ │  ← Bolt/Unifying 接收器、蓝牙、USB 设备
└─────────────────┘
```

GUI 是纯 IPC 客户端，启动时会自动拉起 Agent。CLI 用于无头环境设备清单查看和诊断。

### 核心技术栈

从 `Cargo.toml` 可以看到项目的技术选型：

```toml
[workspace.package]
version = "0.7.1"
edition = "2024"
rust-version = "1.96"

[workspace.dependencies]
# HID 设备通信
async-hid = "0.5.2"
# 跨平台 IPC
interprocess = { version = "2", features = ["tokio"] }
# RPC 传输层
tarpc = { version = "0.38", features = ["serde1", "serde-transport", "serde-transport-bincode", "tokio1"] }
# GUI 框架
gpui = { git = "https://github.com/zed-industries/zed" }
gpui-component = { git = "https://github.com/longbridge/gpui-component", rev = "031555662e99a1b5a549990b47f246d475b8288a" }
```

- **HID++ 协议实现**：`openlogi-hidpp` crate 是基于 `hidpp` crate (0BSD 许可) 的分支，实现了完整的 HID++ 协议栈
- **跨平台 IPC**：使用 `interprocess` 实现 Unix domain socket（Unix）和命名管道（Windows）
- **GUI 框架**：采用 Zed 编辑器的 GPUI 框架，原生高性能渲染

### HID++ 协议命令

OpenLogi 通过 HID++ 协议直接与设备通信：

| 功能 | HID++ 命令 |
|------|-----------|
| DPI 控制 | `0x2201` |
| SmartShift 滚轮 | `0x2111` |
| 滚动反转 | `0x2121` |
| RGB 键盘灯光 | `0x8070` / `0x8080` |

### 输入钩子机制

不同平台使用不同的输入拦截方式：

- **macOS**：通过 `objc2-app-kit` 和 `objc2-foundation` 实现 CGEvent 钩子
- **Linux**：使用 `evdev` 读取原始输入事件，通过 `uinput` 注入合成事件
- **Windows**：`WH_MOUSE_LL` 低级鼠标钩子 + `SendInput` 合成

## 三、安装与快速开始

### 前置要求

**重要**：安装前必须先退出 Logitech Options+，因为两者会争抢 HID++ 设备访问权。

### macOS

```bash
# Homebrew 安装（推荐）
brew install --cask openlogi

# 或下载 DMG
# https://github.com/AprilNEA/OpenLogi/releases/latest
```

要求 macOS 13+。

### Linux

```bash
# Debian / Ubuntu
sudo dpkg -i openlogi_*.deb

# Fedora / RHEL
sudo rpm -i openlogi-*.rpm

# Arch Linux
sudo pacman -U openlogi-*.pkg.tar.zst

# 启用 agent 服务
systemctl --user enable --now openlogi-agent.service
```

Linux 包会自动安装 udev 规则，赋予用户对 `/dev/hidraw*`、`/dev/uinput` 的访问权限。

### Windows

下载 `.msi` 安装包或 `.zip` 便携版。便携版需保持 `OpenLogi.exe` 和 `openlogi-agent.exe` 在同一目录。

## 四、使用方法与实战

### GUI 界面

OpenLogi GUI 提供直观的设备管理界面：

1. **设备轮播**：自动发现已配对的 Bolt/Unifying 接收器和蓝牙设备
2. **交互式鼠标图示**：点击鼠标不同部位配置按键功能
3. **DPI 预设**：创建多档 DPI 预设并一键切换
4. **SmartShift 面板**：调节滚轮自由滚动模式和灵敏度阈值
5. **应用配置切换**：根据焦点应用自动加载不同按键配置

### CLI 使用

```bash
# 列出所有设备
openlogi list

# 预取设备资源（离线使用）
openlogi asset-sync

# HID++ 诊断
openlogi diagnostics --device <device-id>
```

### TOML 配置示例

所有配置保存在 `~/.config/openlogi/config.toml`：

```toml
[devices."MX Master 3"]
dpi_preset = 1

[[devices."MX Master 3".buttons.thumb]]
action = "Gesture"
bindings = { up = "MissionControl", down = "AppExpose", left = "Back", right = "Forward" }

[profiles."VS Code"]
device = "MX Master 3"
dpi_preset = 2
```

### 自定义键盘快捷键

在 TOML 中定义自定义动作：

```toml
[actions.copy]
type = "KeySequence"
keys = ["Ctrl", "C"]

[actions.paste]
type = "KeySequence"
keys = ["Ctrl", "V"]
```

## 五、常见问题与解决方案

### 设备无法发现

**问题**：运行 `openlogi list` 或 GUI 无法发现设备。

**解决方案**：
- 确认已退出 Logitech Options+
- Linux 用户检查 udev 规则是否安装：`ls /etc/udev/rules.d/ | grep openlogi`
- macOS 用户检查辅助功能权限：系统偏好设置 → 安全性与隐私 → 辅助功能

### 按键重映射不生效

**问题**：配置了按键重映射但没有效果。

**解决方案**：
- 确认 agent 服务正在运行（`systemctl --user status openlogi-agent.service`）
- 检查配置文件语法：`openlogi config check`
- macOS/Linux 确认输入权限已授予

### DPI 切换失败

**问题**：DPI 预设切换无响应。

**解决方案**：
- 某些设备不支持 DPI 命令（`0x2201`），运行 `openlogi diagnostics` 检查设备能力
- 确认设备通过接收器或 USB 连接，蓝牙直连可能限制 HID++ 功能

### 性能问题

**问题**：使用中感觉延迟或卡顿。

**解决方案**：
- Linux 用户检查 `evdev` 设备权限和 `uinput` 模块
- 尝试禁用不必要的应用配置切换
- 查看日志排查问题：`journalctl --user -u openlogi-agent -f`

## 六、总结

OpenLogi 是一个理念先进、工程扎实的开源项目，它证明了即使是硬件驱动这类"系统级"软件，也可以用 Rust 重写并获得更好的性能、安全性和跨平台支持。对于罗技鼠标用户来说，这是一个摆脱官方臃肿软件、重获设备控制权的绝佳选择。项目活跃开发中，支持 20 种语言界面，社区贡献者正在持续完善 Windows 移植和新增功能。

如果你厌倦了 Logitech Options+ 的云账户和遥测追踪，不妨试试这个轻量、本地优先的替代方案。
