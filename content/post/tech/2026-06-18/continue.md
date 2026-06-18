---
title: "Continue：开源编程代理的终章与遗产"
date: 2026-06-18
description: "Continue 是一款开源编程代理，提供 CLI、VS Code 扩展和 JetBrains 插件三种形态，在 AI 开发者工具领域开创先河，最终以 2.0.0 版本画上句号，移除了匿名遥测和认证模块，留下干净的代码遗产。"
author: "Cheman"
slug: continue
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI编程", "VS Code", "编程代理"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Continue**，它是一款开源编程代理（Coding Agent），以 CLI、VS Code 扩展和 JetBrains 插件三种形态服务开发者，在 AI 编程工具领域开创先河后，以最终版 2.0.0 完美谢幕。

## 一、项目概述

Continue 是由 Continue Dev, Inc. 开发的开源编程代理工具，旨在将 AI 深度融入开发者的日常工作流。项目以 Apache 2.0 协议开源，提供三种接入方式：

- **CLI**：命令行工具，适用于终端场景和自动化流水线
- **VS Code 扩展**：IDE 内集成，支持代码补全、对话、编辑等交互
- **JetBrains 插件**：面向 JetBrains 系列IDE的用户（官方推荐使用 CLI 替代）

值得注意的是，项目仓库已标记为 **read-only**，不再积极维护。2.0.0 是其最终版本，团队移除了匿名遥测和认证模块，修复了大量 Bug，交付了一个干净、完整的终版。

## 二、技术原理

### 架构设计

Continue 采用经典的扩展架构，核心代码与平台适配层分离：

```
continue/
├── core/          # 核心逻辑层
├── gui/           # 图形界面层
├── binary/        # 二进制构建
├── extensions/
│   ├── vscode/    # VS Code 扩展
│   ├── cli/       # 命令行工具
│   └── intellij/  # JetBrains 插件
```

这种分层设计使得核心 AI 逻辑只需编写一次，各平台扩展负责 UI 和宿主 API 适配。

### 核心技术栈

从 `package.json` 可以看出，项目基于 TypeScript 构建：

```json
{
  "devDependencies": {
    "typescript": "^5.6.3",
    "concurrently": "^9.1.2",
    "prettier": "^3.3.3",
    "husky": "^9.1.7",
    "lint-staged": "^15.5.2"
  },
  "dependencies": {
    "@ai-sdk/deepseek": "^2.0.20"
  }
}
```

关键选型：
- **TypeScript**：类型安全，适合多平台扩展开发
- **@ai-sdk/deepseek**：集成 DeepSeek AI 模型，提供代码理解和生成能力
- **Concurrently**：多进程并行编译，提升开发效率
- **Husky + lint-staged**：Git hooks 自动格式化，保障代码质量

### 设计模式

项目采用插件化架构，AI 能力通过 SDK 抽象层接入，支持切换不同的 AI 提供商。这种策略让用户可以自由选择模型，不受单一供应商锁定。

## 三、安装与快速开始

### 环境要求

- Node.js 18+
- VS Code 1.85+（使用扩展时）
- Git

### VS Code 扩展安装

```bash
# 通过 VS Code Marketplace 安装
code --install-extension Continue.continue
```

或直接在 VS Code 中搜索 "Continue" 并安装。

### CLI 安装

```bash
# npm 全局安装
npm install -g @continuedev/cli

# 启动交互式会话
continue
```

### 最简运行示例

安装 CLI 后，直接在项目目录中启动：

```bash
cd your-project
continue
```

CLI 会自动识别项目上下文，开始 AI 辅助编程会话。

## 四、使用方法与实战

### 基础用法

在 VS Code 中，Continue 提供：

1. **代码补全**：编辑时自动建议代码片段
2. **侧边栏对话**：与 AI 讨论代码逻辑和架构
3. **内联编辑**：选中代码后直接让 AI 修改

### 进阶用法

通过配置文件自定义 AI 行为：

```json
{
  "models": [
    {
      "title": "DeepSeek",
      "provider": "deepseek",
      "model": "deepseek-coder"
    }
  ],
  "allowAnonymousTelemetry": false
}
```

2.0.0 版本已默认移除遥测，无需手动配置。

### 实际项目示例

在重构场景中，Continue 可以：

- 分析整个文件上下文，理解依赖关系
- 按照项目代码风格生成新代码
- 逐函数解释代码逻辑，辅助代码审查

## 五、常见问题与解决方案

### 安装失败

**问题**：VS Code 扩展安装超时或失败。

**解决**：检查网络连接，或通过 OpenVSX Registry 安装：
```bash
code --install-extension Continue.continue --extensions-dir <本地路径>
```

### 运行时错误

**问题**：CLI 启动报错 `module not found`。

**解决**：确认 Node.js 版本 ≥ 18，重新安装：
```bash
npm install -g @continuedev/cli --force
```

### 兼容性

**问题**：项目不再维护，未来 VS Code 更新可能不兼容。

**解决**：2.0.0 是最终版本，建议关注社区 Fork。项目代码以 Apache 2.0 协议开放，可作为其他编程代理项目的基础。

## 六、总结

Continue 作为开源编程代理的先驱，为 AI 开发者工具领域留下了宝贵的遗产。其核心贡献包括：

1. **多平台统一架构**：核心逻辑与平台适配分离，一次开发多端运行
2. **开放模型接入**：支持多种 AI 提供商，避免供应商锁定
3. **干净的终版**：2.0.0 移除遥测和认证，交付纯粹的工具

虽然项目已停止维护，但其代码库和设计理念将继续影响后续的 AI 编程工具开发。对于想构建自己编程代理的开发者，Continue 的源码是绝佳的学习材料。
