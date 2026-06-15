---
title: "Cua：构建、评估与部署计算机使用 Agent 的全栈平台"
date: 2026-06-16
description: "Cua 是一个开源全栈平台，提供沙箱环境、桌面驱动器、基准测试框架和 macOS 虚拟化，让 AI Agent 能够真正操作计算机——点击、输入、截图、完成任务。"
author: "Cheman"
slug: cua
draft: false
categories: ["技术", "开源"]
tags: ["AI Agent", "计算机使用", "RPA", "沙箱", "开源", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个势头非常猛的项目：**Cua**，一个为 AI Agent 提供计算机使用能力的全栈开源平台——从沙箱环境、桌面驱动到基准评测，一站式解决 Agent 操作电脑的所有难题。

## 一、项目概述

Cua（Computer Use Agent）由 TryCua 团队开发，是一个 Monorepo 风格的开源项目，核心目标是让 AI Agent 能够像人类一样操作计算机界面。项目覆盖了从底层虚拟化到上层评测的完整链路：

- **Cua Drivers**：后台驱动 macOS/Windows/Linux 桌面应用，Agent 操作不抢占鼠标焦点
- **Cua Sandbox**：统一的 API 管理任意 OS 的 VM 或容器沙箱（云端/本地）
- **Cua Bench**：标准化的计算机使用 Agent 评测框架，支持 OSWorld、ScreenSpot 等基准
- **Lume**：基于 Apple Virtualization.Framework 的 macOS 虚拟化方案

项目采用 MIT 协议开源，Python 3.12+ 驱动核心逻辑，Swift 实现桌面驱动层，支持 Claude Code、Cursor、Codex、OpenClaw 等主流 Agent 客户端。

## 二、技术原理

### 2.1 整体架构

Cua 采用分层架构设计：

```
┌─────────────────────────────────────┐
│  Agent (Claude/Cursor/Codex/...)    │
├─────────────────────────────────────┤
│  MCP Server / Python SDK            │
├─────────────────────────────────────┤
│  Cua Driver (Swift) / Cua Sandbox    │
├─────────────────────────────────────┤
│  OS (macOS / Windows / Linux)        │
├─────────────────────────────────────┤
│  Lume / QEMU 虚拟化层               │
└─────────────────────────────────────┘
```

上层通过 MCP（Model Context Protocol）协议与各种 AI Agent 框架对接，底层通过 Swift 的 Accessibility API 和 AXUIElement 框架实现桌面自动化，虚拟化层基于 Apple Virtualization.Framework 或 QEMU。

### 2.2 Cua Drivers：后台桌面驱动

Cua Drivers 的核心创新在于**后台操作**——Agent 可以在后台点击、输入、验证，不会抢占用户的鼠标和键盘焦点。从 `Package.swift` 可以看到，Swift 包分为两层：

- **CuaDriverCore**：纯系统框架依赖，提供无障碍访问（AX）、输入模拟、屏幕捕获、应用启动和录制等原语
- **CuaDriverServer**：基于 MCP Swift SDK 构建，将底层原语封装为 MCP 工具，供 Agent 调用

```swift
// Package.swift 中的包结构定义
.library(name: "CuaDriverCore", targets: ["CuaDriverCore"]),
.library(name: "CuaDriverServer", targets: ["CuaDriverServer"])
```

安装后一行命令即可接入 Claude Code：

```bash
claude mcp add --transport stdio cua-driver -- cua-driver mcp
```

### 2.3 Cua Sandbox：统一沙箱 API

Cua Sandbox 提供了一套与操作系统无关的统一 Python API：

```python
from cua import Sandbox, Image

async with Sandbox.ephemeral(Image.linux()) as sb:
    result = await sb.shell.run("echo hello")
    screenshot = await sb.screenshot()
    await sb.mouse.click(100, 200)
    await sb.keyboard.type("Hello from Cua!")
    await sb.mobile.gesture((100, 500), (100, 200))
```

关键设计点：
- **`ephemeral` 上下文管理器**：自动创建和销毁沙箱实例，确保资源回收
- **统一 Image 抽象**：`Image.linux()`、`Image.macos()`、`Image.windows()`、`Image.android()` 一套 API 搞定所有平台
- **双模式部署**：既支持 cua.ai 云端管理，也支持本地 QEMU 直接运行
- **BYOI 支持**：可导入自定义 `.qcow2` 和 `.iso` 镜像

### 2.4 Cua Bench：评测与 RL 环境

Cua Bench 解决了一个行业痛点：如何客观评估计算机使用 Agent 的能力。它集成了多个权威基准：

- **OSWorld**：真实软件环境中的多步骤任务
- **ScreenSpot**：GUI 元素定位准确率
- **Windows Arena**：Windows 平台操作评测
- 支持导出轨迹用于模型训练（RL）

```bash
cb run dataset datasets/cua-bench-basic --agent cua-agent --max-parallel 4
```

`--max-parallel 4` 参数支持并行执行，大幅提升评测效率。

### 2.5 Lume：macOS 虚拟化

Lume 利用 Apple Silicon 原生的 Virtualization.Framework 实现 macOS 和 Linux VM 管理：

```bash
lume run macos-sequoia-vanilla:latest
```

相比传统的 QEMU 方案，Lume 提供接近原生的性能。配套的 **Lumier** 组件还提供了 Docker 兼容接口，让习惯 Docker 工作流的用户可以无缝切换。

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.12+（核心功能要求）
- macOS 14+（Cua Drivers）
- Apple Silicon（Lume macOS 虚拟化）

### 3.2 安装 Cua Drivers

**macOS / Linux：**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/cua-driver/scripts/install.sh)"
```

**Windows (PowerShell)：**

```powershell
irm https://raw.githubusercontent.com/trycua/cua/main/libs/cua-driver/scripts/install.ps1 | iex
```

### 3.3 安装 Cua SDK

```bash
pip install cua
```

### 3.4 最简示例：让 Agent 在沙箱中执行命令

```python
import asyncio
from cua import Sandbox, Image

async def main():
    async with Sandbox.ephemeral(Image.linux()) as sb:
        result = await sb.shell.run("uname -a")
        print(result)
        screenshot = await sb.screenshot()
        # screenshot 是屏幕截图，可传给视觉模型分析

asyncio.run(main())
```

## 四、使用方法与实战

### 4.1 集成到 Claude Code

这是目前最主流的用法——让 Claude Code 通过 MCP 直接驱动你的桌面：

```bash
claude mcp add --transport stdio cua-driver -- cua-driver mcp
```

添加后，Claude Code 就获得了"看屏幕、点鼠标、敲键盘"的能力，可以帮你操作任意原生桌面应用。

### 4.2 构建 Agent：自定义工作流

基于 `cua-agent` SDK 可以构建更复杂的 Agent 工作流，组合使用 shell 执行、屏幕识别、鼠标点击、键盘输入等原语：

```python
from cua import Sandbox, Image

async with Sandbox.ephemeral(Image.macos()) as sb:
    # 打开一个应用
    await sb.shell.run("open -a Safari")
    # 截图分析当前状态
    await sb.screenshot()
    # 点击特定位置
    await sb.mouse.click(500, 300)
    # 输入文本
    await sb.keyboard.type("github.com/trycua/cua")
    await sb.keyboard.press("return")
```

### 4.3 运行基准评测

```bash
# 创建基础镜像
cb image create linux-docker

# 运行评测
cb run dataset datasets/cua-bench-basic --agent cua-agent --max-parallel 4
```

评测结果可以导出为标准格式，用于模型对比或论文引用。项目还提供了 [cuabench.ai](https://cuabench.ai/) 在线排行榜。

### 4.4 本地部署 macOS 沙箱

```bash
# 安装 Lume
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"

# 启动 macOS 虚拟机
lume run macos-sequoia-vanilla:latest
```

配合 Dockerfile 中提到的 `host.docker.internal:7777` 架构，Docker 容器内的 Agent 可以通过网络连接到宿主机运行的 Lume VM。

## 五、常见问题与解决方案

### 5.1 Cua Drivers 安装后 MCP 连接失败

检查 cua-driver 是否正确加入 PATH，手动验证：

```bash
cua-driver mcp
```

如果出现系统权限弹窗，需要在 macOS 的「隐私与安全性」设置中授予辅助功能权限。

### 5.2 Python 版本不兼容

从 `pyproject.toml` 可以看到项目要求 `>=3.12, <3.14`：

```toml
requires-python = "<3.14,>=3.12"
```

如果使用 uv 管理依赖（项目推荐），确保 `uv` 已安装并指向正确的 Python 版本。

### 5.3 Linux 后台驱动不稳定

README 明确标注 Linux 支持为 **pre-release** 阶段，平台测试仍在进行中。如遇问题建议通过 [GitHub Issues](https://github.com/trycua/cua/issues) 反馈或加入 [Discord 社区](https://discord.gg/mVnXXpdE85) 讨论。

### 5.4 SPM 依赖解析失败

由于项目使用 `cua-driver-v*` 格式的 tag 而非标准 semver，Swift Package Manager 无法自动解析版本。需要通过 revision 指定：

```swift
.package(url: "https://github.com/trycua/cua.git", .revision("cua-driver-v0.1.0"))
```

### 5.5 沙箱启动超时

本地 QEMU 模式下首次拉取镜像可能较慢。建议先用 `cua.ai` 云端模式验证功能，再切换到本地 QEMU 环境。

## 六、总结

Cua 是目前计算机使用 Agent 领域最全面的开源方案之一。它最突出的优势在于**全栈覆盖**——从底层虚拟化（Lume）、桌面自动化驱动（Cua Drivers）、沙箱管理（Cua Sandbox）到评测基准（Cua Bench），形成了一个完整闭环。

对于开发者来说，Cua 的 MCP 协议集成设计使其能无缝接入现有的 AI 编码工具链；对于研究者来说，Cua Bench 提供了标准化的评测环境和轨迹导出能力，降低了计算机使用 Agent 研究的门槛。如果你正在构建或评估能操作计算机的 AI Agent，Cua 是一个值得深入研究的平台。

项目地址：[https://github.com/trycua/cua](https://github.com/trycua/cua)
