---
title: "pi-computer-use：让 AI Agent 操控 macOS 和 Windows 桌面应用的 Pi 扩展"
date: 2026-07-16
description: "pi-computer-use 是一个 Pi Agent 扩展，让 AI 能够观察和控制 macOS 14+ 与 Windows 桌面应用。通过 Accessibility API 和 CDP，它提供 find_roots、observe_ui、act_ui 等工具，使 Agent 在没有 API 或 MCP 时也能操作正常桌面软件。"
author: "Cheman"
slug: pi-computer-use
draft: false
categories: ["技术", "开源"]
tags: ["AI", "Agent", "macOS", "Windows", "桌面自动化", "Pi", "Computer Use"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**pi-computer-use**，它是一个 Pi Agent 扩展，可以让 AI 直接操控 macOS 和 Windows 的桌面应用程序——点击按钮、读取文本、填写表单，就像真人坐在电脑前操作一样。

## 一、项目概述

`pi-computer-use` 的核心定位非常清晰：当目标应用没有可用的 API、没有 MCP 服务器时，AI Agent 依然可以通过操作系统提供的无障碍（Accessibility）接口和 Chrome DevTools Protocol（CDP）来观察界面、执行操作。

### 核心能力

- **跨平台支持**：macOS 14+ 和 Windows 均有原生实现
- **视觉化感知**：Agent 能"看到"应用窗口内的按钮、文本和控件
- **精确操控**：点击、输入、滚动、等待 UI 变化
- **Pi 生态集成**：作为 `@injaneity/pi-computer-use` NPM 包分发，一行命令安装

### 技术栈

| 平台 | 底层实现 |
|------|---------|
| macOS | Swift 原生桥接 + TCC 无障碍权限 |
| Windows | Rust 编写桥接 + Win32 Accessibility API |
| 核心逻辑 | TypeScript（ESNext，strict 模式） |

从 `package.json` 可以看到，Node.js 最低版本要求为 **20.6.0**，采用了纯 ESM 模块，TypeScript 配置为严格模式，`skipLibCheck` 开启以兼容构建产物。

## 二、技术原理与核心架构

### 设计哲学

项目在 `package.json` 中明确指出：

> `pi-computer-use` is not a replacement for app APIs or MCP servers. If an app has a reliable direct integration, use that first.

这说明它是一种**兜底方案**：当 API 不可用时才诉诸 GUI 自动化。架构层面围绕两个核心原则设计：

1. **不可变状态快照**：每次 UI 观察结果是不可变的快照，基于此做决策
2. **多根并行**：独立窗口/标签页各自有独立的观察树，可并行操作

### 主要工具（Tools）

项目定义了 8 个核心工具，在 `docs/usage.md` 中有详细说明：

```bash
find_roots      # 查找当前所有打开的应用程序和窗口
observe_ui      # 获取窗口内可见界面的结构化快照
search_ui       # 在快照中搜索特定文本、按钮或控件
expand_ui       # 深入查看某个区域的更多细节
inspect_ui      # 高精度检查 UI 元素（可理解为"放大镜"）
act_ui          # 执行操作：点击、输入、滚动、按键
read_text       # 从界面中读取文本内容
wait_for        # 等待特定 UI 状态出现（轮询 + 超时）
```

### macOS 权限模型

macOS 平台使用 Swift 编写的桥接程序，需要用户授权两类系统权限：

- **Accessibility（无障碍）**：用于读取和控制 UI 元素
- **Screen Recording（屏幕录制）**：用于截图和观察界面

安装流程中，桥接程序会引导用户到系统设置中开启对应开关。Pi 的 setup 流程会先注册 helper app，所以两个权限面板中应该都能看到该应用的身影。

### `act_ui` 的安全机制

从 `package.json` 的开发状态描述中可以看出，`act_ui` 做了相当多的安全考量：

- 接受一个或多个意图步骤（intent steps），保持焦点跨依赖输入
- 验证操作是否成功送达
- 失败后安全恢复
- 只存储一个完整的成功后续状态
- 状态变化置信度高时返回精简 diff

## 三、安装与快速开始

### 环境要求

- **macOS**：14 (Sonoma) 或更新版本
- **Windows**：可交互的桌面会话（非无头环境）
- **Node.js**：>= 20.6.0
- **Pi Agent**：已安装并完成平台设置流程

### 安装步骤

**第一步：安装 NPM 包**

```bash
pi install npm:@injaneity/pi-computer-use
```

**第二步：完成平台设置**

启动 Pi Agent，按提示完成平台设置流程（macOS 上会引导授权权限）。

**第三步：手动确认权限（macOS）**

将以下应用添加到系统辅助功能和白名单：

```text
/Applications/pi-computer-use.app
```

在 **系统设置 → 隐私与安全性 → 辅助功能** 和 **屏幕录制** 中找到它并开启开关。

**第四步：验证安装**

在 Pi Agent 中输入：

```
/computer-use
```

即可查看当前配置来源和状态。

## 四、使用方法与实战

### 基础用法示例

在 Pi Agent 中使用自然语言：

> "打开 Safari，搜索 OpenAI 官网，然后截图"

Pi Agent 会自动调用：
1. `find_roots` → 找到 Safari 窗口
2. `observe_ui` → 了解搜索框位置
3. `act_ui(click, search_box)` → 点击搜索框
4. `act_ui(type, "OpenAI")` → 输入文字
5. `act_ui(click, search_button)` → 点击搜索
6. `wait_for` → 等待页面加载完成

### 进阶用法：表单自动化

```javascript
// Pi Agent 中的高级操作序列
await act_ui([
  { action: "click", target: "username_field" },
  { action: "wait_for", condition: "field_focused" },
  { action: "type", text: "user@example.com" },
  { action: "press", key: "Tab" },
  { action: "wait_for", condition: "password_focused" },
  { action: "type", text: "secure_password" },
  { action: "click", target: "submit_button" },
]);
```

### 与 MCP 的对比

| 维度 | MCP Server | pi-computer-use |
|------|-----------|----------------|
| 交互方式 | API 调用 | GUI 操控 |
| 速度 | 快（毫秒级） | 慢（秒级） | 
| 可靠性 | 高（结构化数据） | 中（依赖 UI 稳定性）|
| 适用场景 | 有 API 的应用 | 无 API 的遗留软件 |
| 依赖 | 无障碍权限 | 不需要 |

## 五、常见问题与解决方案

### Q1: macOS 提示"无法控制其他应用"？

这是最常见的问题。请确认：

1. `pi-computer-use.app` 已在 **系统设置 → 隐私与安全性 → 辅助功能** 中开启
2. 屏幕录制权限也已授权
3. 点击 "Recheck" 重新检测权限状态

### Q2: Windows 上操作没有反应？

Windows 支持依赖交互式桌面会话，确保：

- 不是无头（headless）环境
- Agent 运行在有桌面上下文的用户账户下
- Windows 端的 CDP 端点可用

### Q3: `act_ui` 返回操作超时？

检查目标窗口是否仍然存在，使用 `find_roots` 确认应用还在运行。某些动画或过渡效果可能导致 UI 状态判断延迟，可以增加 `wait_for` 的等待时间。

### Q4: Node 版本过低？

```bash
node --version  # 确认 >= 20.6.0
# 推荐使用 nvm 切换版本：
nvm install 20
nvm use 20
```

## 六、总结

`pi-computer-use` 是 AI Agent 桌面操控领域的一个轻量、务实的设计方案。它没有试图替代所有 API，而是在 API 不可用时提供了一种可靠的后备手段。借助不可变快照的多根架构和精心设计的安全恢复机制，Agent 在操作复杂桌面应用时具备良好的稳定性。

对于构建**多步骤桌面自动化流程**（比如自动填表、自动测试、跨应用数据迁移）的开发者来说，这个项目值得深入研究。其 Swift + Rust 的跨平台桥接实现也是一个了解桌面无障碍 API 的好样本。

---

> 📦 NPM 包：`@injaneity/pi-computer-use`  
> 🌐 GitHub：https://github.com/injaneity/pi-computer-use  
> 📄 许可：MIT  
