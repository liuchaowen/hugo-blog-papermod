---
title: "agent-device：让 AI 编程代理在真实设备上验证应用变更"
date: 2026-08-04
description: "agent-device 是一个跨平台的 AI 代理自动化 CLI 工具，支持 iOS、Android、tvOS、macOS、Linux 和 Web 应用。它让编程代理能够检查、控制和验证应用，保存证据供审查，并支持工作流回放。"
author: "Cheman"
slug: agent-device
draft: false
categories: ["技术", "开源", "AI", "移动开发"]
tags: ["GitHub", "开源", "AI", "自动化", "移动测试", "agent-device", "Callstack"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**agent-device**，一个让 AI 编程代理在真实设备上自动验证应用变更的跨平台 CLI 工具，由 React Native 技术栈维护者 Callstack 团队打造。

## 一、项目概述

### 项目是什么

`agent-device` 是一个命令行工具，让编程代理能够检查、控制和验证运行中的应用程序，并保存证据供审查。它支持 iOS、Android、tvOS、Android TV、Amazon Vega OS TV、Web、macOS 和 Linux 等多平台。

### 解决什么问题

传统的自动化测试工具（如 Appium、Detox）需要预先编写测试脚本，维护成本高且缺乏灵活性。`agent-device` 采用 **inspect-act-verify** 流程，让 AI 代理能够：

- **实时检查应用状态**：通过无障碍树快照、元素引用、选择器等读取应用界面
- **执行 UI 操作**：点击、填写、滚动、手势、等待、断言状态、处理警报
- **诊断失败原因**：截图、视频、日志、性能数据、崩溃详情
- **重复工作流**：保存成功的步骤为 `.ad` 脚本，用于本地或 CI 回放

### 核心特性

1. **跨平台支持**：iOS、Android、TV 平台、Web、macOS、Linux
2. **Token 效率优化**：使用无障碍树快照，比截图更高效
3. **会话管理**：维护设备状态会话，支持多次交互
4. **证据收集**：截图、视频、日志、性能分析、网络数据
5. **工作流回放**：录制操作脚本，支持 CI/CD 集成
6. **MCP 协议支持**：可作为 Model Context Protocol 服务器使用

## 二、技术原理

### 架构设计

`agent-device` 采用 **会话驱动架构**，每个设备会话维护独立的设备状态：

```
┌─────────────┐      命令      ┌──────────────┐
│   AI 代理    │ ──────────────> │ agent-device │
│ (Claude 等) │ <────────────── │     CLI      │
└─────────────┘     结果/证据    └──────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │  XCTest  │        │   ADB    │        │  AT-SPI  │
              │  (iOS)   │        │ (Android)│        │ (Linux)  │
              └──────────┘        └──────────┘        └──────────┘
```

**核心组件**：

- **CLI 入口** (`src/bin.ts`)：解析命令，管理会话
- **设备提供者**：各平台的底层驱动（XCTest、ADB、AT-SPI）
- **快照引擎**：提取无障碍树，生成高效的元素引用
- **证据管理器**：截图、录屏、日志收集

### 核心技术栈与选型理由

从 `package.json` 可以看出项目技术栈：

```json
{
  "engines": { "node": ">=22.12" },
  "dependencies": {
    "@limrun/api": "^0.24.5",  // 远程执行支持
    "pngjs": "^7.0.0",         // 截图处理
    "yaml": "^2.9.0"           // Maestro YAML 导出
  }
}
```

**选型理由**：

1. **Node.js 22.12+**：使用最新的 ES 模块和类型剥离特性，减少构建开销
2. **TypeScript 7.0.2**：利用 `erasableSyntaxOnly` 和 `rewriteRelativeImportExtensions` 提升编译性能
3. **Vitest 4.1.8**：快速单元测试，支持覆盖率阈值强制（statements: 78%, lines: 80%）
4. **pnpm 11.17.0**：高效的 monorepo 依赖管理

### 关键设计模式

#### 1. 引用生命周期管理

```bash
# 获取快照
agent-device snapshot -i
# @e2 [button] "Add"

# 使用引用执行操作
agent-device press @e2 --settle
# diff 显示 UI 变化后的新引用
```

**设计要点**：
- 引用仅在**最新输出中有效**
- `--settle` 标志等待 UI 稳定后返回 diff
- 避免引用过期导致的误操作

#### 2. 批量命令执行

从源码 `src/sdk/batch.ts` 可以看到，支持批量提交命令减少往返：

```typescript
// 批量执行示例
await batch.run([
  { kind: 'press', ref: '@e2' },
  { kind: 'fill', ref: '@e7', value: 'Ada' },
  { kind: 'screenshot', path: './evidence.png' }
]);
```

#### 3. 工作流录制与回放

```bash
# 录制会话
agent-device record session.ad

# 回放
agent-device test session.ad --platform ios
```

`session.ad` 文件是 JSONL 格式的命令序列，支持：
- **精确回放**：包括等待时间和断言
- **Maestro 导出**：转换为 Maestro YAML 格式
- **CI 集成**：在 GitHub Actions、EAS Workflows 中使用

### 数据流分析

**典型代理交互流程**：

```
1. agent-device open Contacts --platform ios
   ↓ 创建会话，启动应用
   
2. agent-device snapshot -i
   ↓ 提取无障碍树 → {"@e2": {"type": "button", "text": "Add"}}
   
3. AI 代理分析快照，决定操作
   ↓ agent-device press @e2 --settle
   
4. UI 更新，返回 diff
   ↓ {"added": ["@e7"], "removed": [], "changed": []}
   
5. 代理继续操作或收集证据
   ↓ agent-device screenshot ./proof.png
   
6. agent-device close
   ↓ 关闭会话，保存日志
```

## 三、安装与快速开始

### 环境要求

- **Node.js 22.12+**（Web 自动化需要 Node.js 24+）
- **目标设备**：
  - iOS：Xcode 命令行工具、模拟器或真机
  - Android：Android SDK、ADB、模拟器或真机
  - macOS：Swift 工具链
  - Linux：AT-SPI 支持

### 安装步骤

```bash
# 全局安装
npm install -g agent-device@latest

# 检查环境
agent-device doctor

# 查看工作流指南
agent-device help workflow
```

`agent-device doctor` 会检查：
- Node.js 版本
- 平台工具链（Xcode、Android SDK）
- 设备连接状态

### 最简运行示例

在 iOS 模拟器的联系人应用中添加联系人：

```bash
# 1. 启动会话
agent-device open Contacts --platform ios

# 2. 检查界面
agent-device snapshot -i
# 输出：@e2 [button] "Add"

# 3. 点击添加按钮
agent-device press @e2 --settle

# 4. 填写表单
agent-device fill @e7 "Ada" --settle  # @e7 是 First name 字段

# 5. 截图保存证据
agent-device screenshot ./contact-form.png

# 6. 关闭会话
agent-device close
```

## 四、使用方法与实战

### 基础用法

#### 1. 应用生命周期管理

```bash
# 打开应用
agent-device open com.example.app --platform android

# 查询应用状态
agent-device query app-state

# 关闭应用
agent-device terminate com.example.app
```

#### 2. 元素查找与操作

```bash
# 通过选择器查找
agent-device find '[data-testid="submit-button"]' --platform web

# 通过引用操作
agent-device press @e15
agent-device fill @e20 "test@example.com"

# 滚动操作
agent-device scroll down --distance 500

# 手势操作
agent-device gesture swipe --direction up --distance 300
```

#### 3. 状态断言

```bash
# 断言元素存在
agent-device assert exists @e10

# 断言文本内容
agent-device assert text @e10 "Expected Text"

# 断言元素可见
agent-device assert visible @e10
```

### 进阶用法

#### 1. React Native 组件树分析

对于 React Native 应用，可以直接检查组件树：

```bash
agent-device inspect react-tree --out react-tree.json
```

输出包含组件层级、props、state 等调试信息。

#### 2. 性能分析

```bash
# 记录性能样本
agent-device profile start

# 执行操作
agent-device press @e5 --settle

# 停止并导出
agent-device profile stop --out profile.cpuprofile
```

可导入 Chrome DevTools 或 React Native Debugger 分析。

#### 3. 网络流量监控

```bash
# 开始监控
agent-device network start

# 执行操作
agent-device fill @e10 "search term"
agent-device press @e11

# 导出流量
agent-device network stop --out network.har
```

### 实际项目示例

#### EAS Workflows 集成

```yaml
# .eas/workflows/agent-qa-mobile.yml
name: AI QA Agent
on:
  pull_request:
jobs:
  qa:
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g agent-device@latest
      - run: agent-device test ./e2e/checkout-flow.ad --platform ios
      - uses: actions/upload-artifact@v4
        with:
          path: ./artifacts/
```

#### 本地开发工作流

```bash
# 开发时代理自动测试
# 1. 录制正常流程
agent-device record login-flow.ad
# 执行操作...

# 2. 代码修改后自动回放
agent-device test login-flow.ad --platform android

# 3. 失败时查看证据
ls ./artifacts/
```

## 五、常见问题与解决方案

### 安装失败

**问题 1：Node.js 版本不满足**

```bash
# 检查版本
node --version  # 需要 >= 22.12

# 升级 Node.js
nvm install 22
nvm use 22
```

**问题 2：iOS 工具链缺失**

```bash
# 安装 Xcode 命令行工具
xcode-select --install

# 重新运行检查
agent-device doctor
```

### 运行时错误

**问题 1：找不到设备**

```bash
# iOS 模拟器
xcrun simctl list devices

# Android 设备
adb devices

# 如果为空，启动模拟器
# iOS: open -a Simulator
# Android: emulator -avd <avd_name>
```

**问题 2：引用过期**

```
Error: Element @e10 not found in current snapshot
```

**解决方案**：
- 只使用**最新输出**中的引用
- 操作后使用 `--settle` 等待 UI 稳定
- 如果 diff 未显示所需元素，重新执行 `snapshot`

**问题 3：权限不足**

```
Error: Permission denied for <operation>
```

**解决方案**：
- macOS：在"系统偏好设置 → 安全性与隐私"中授权 Terminal
- iOS 真机：在设置中信任开发者证书
- Android：启用 USB 调试和"允许模拟位置"

### 性能问题

**问题 1：快照太慢**

**优化方案**：
- 使用 `-i` 标志仅返回引用，减少数据量
- 避免不必要的快照，优先使用 diff
- 对于复杂 UI，设置 `--max-depth` 限制深度

**问题 2：回放不稳定**

**优化方案**：
- 在录制时使用 `--settle` 等待 UI 稳定
- 增加等待时间：`agent-device wait 2000`
- 使用选择器而非引用，提高容错性

### 兼容性

**问题：支持哪些应用类型？**

从项目文档和源码可以看出：

| 平台 | 原生应用 | React Native | Expo | Flutter | Web |
|------|---------|--------------|------|---------|-----|
| iOS | ✅ | ✅ | ✅ | ✅ | - |
| Android | ✅ | ✅ | ✅ | ✅ | - |
| macOS | ✅ | ✅ | - | - | - |
| Linux | ✅ | - | - | - | - |
| Web | - | - | - | - | ✅ |

**注意**：
- TV 平台（tvOS、Android TV）支持正在完善
- Amazon Vega OS 仅支持 Vega Virtual Device (VVD)
- Web 平台通过内置 `agent-browser` 支持

## 六、总结

`agent-device` 是一个面向 AI 编程代理的跨平台自动化工具，通过 **inspect-act-verify** 流程让代理能够在真实设备上验证代码变更。它的核心价值在于：

1. **Token 高效**：使用无障碍树快照而非截图，减少 AI 处理开销
2. **跨平台统一**：一套 CLI 支持移动端、桌面端、Web 端
3. **CI/CD 友好**：工作流录制回放，无缝集成到自动化流水线
4. **证据驱动**：自动收集截图、日志、性能数据，便于问题定位

对于团队而言，`agent-device` 可以：
- **加速 PR 验证**：代理自动测试 UI 变更
- **降低测试维护成本**：无需编写大量测试脚本
- **提升代码质量**：每个 PR 都有真实的设备验证证据

对于个人开发者，它提供了：
- **快速原型验证**：在开发时即时检查 UI 效果
- **调试辅助**：自动收集性能、网络、崩溃信息
- **自动化脚本**：录制重复操作，一键回放

项目由 Callstack 团队维护（React Navigation、React Native Testing Library 等知名库的作者），已有 Shopify、Expensify 等公司在生产环境中使用，代码质量有保障。

如果你正在寻找一个能让 AI 代理"看见"并"操作"应用的工具，`agent-device` 是目前最成熟的开源方案之一。
