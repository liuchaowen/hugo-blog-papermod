---
title: "Astryx：Meta 开源的全面可定制设计系统"
date: "2026-07-01"
description: "Astryx 是 Meta 开源的企业级设计系统，基于 React 和 StyleX 构建，提供 150+ 可访问组件、品牌级主题系统和开箱即用模板，同时支持人类开发者和 AI 助手协同使用。"
author: "Cheman"
slug: "astryx"
draft: false
categories: ["技术", "前端"]
tags: ["React", "设计系统", "StyleX", "开源", "Meta"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Astryx**，Meta 开源的企业级设计系统，在公司内部打磨八年，现已全面公开。不同于传统设计系统的封闭架构，Astryx 真正做到了"全面可定制"——既能让设计师独立完成品牌定制，又不锁死开发者的技术选型自由。

## 一、项目概述

Astryx 起源于 Meta 内部，经过八年迭代，成为公司内部最大、最多人使用的设计系统，当前支撑着 **13,000+ 应用**。它不仅包含 150+ 可访问组件，还内置了品牌级主题系统、暗色模式、开箱即用模板和 CLI 工具链，形成一套完整的产品体系。

最核心的特点是**同时服务于人类开发者和 AI 助手**——API、文档和 CLI 从一开始就以"人机协同"为目标设计，很多让 AI 更顺手的改动同时也对人类开发者更友好。

## 二、技术原理与架构设计

### 技术栈选型

Astryx 基于以下核心技术构建：

- **React 19** + **TypeScript**：组件层完全拥抱最新 React 生态
- **StyleX**：原子化 CSS-in-JS 方案，作为样式创作语言
- **TypeScript ESLint** + **自定义插件**：严格的两层 linting 哲学（CI 严格模式 vs 本地推荐模式）
- **Vitest**：测试框架，配合 jsdom 环境

### 核心架构思想

Astryx 的架构哲学可以概括为四点：**开放内部、可组合、无锁定、人工Agent共用**。

**开放内部**意味着组件在最顶层 API 之外，还直接导出所有底层构建块。开发者可以直接使用最基础的组件片段，而不需要被封闭 API 限制：

```tsx
// 直接使用基础组件片段，不受顶层 API 限制
import { Button, Dialog, Tooltip } from '@astryxdesign/core';

// 需要更深层定制时，swizzle 命令将组件源码完整 eject 到项目中
// npx astryx swizzle Dialog --dest ./my-components
```

**无样式锁定**是另一个核心设计。StyleX 是 Astryx 的创作语言，但对使用者完全透明。你可以在 Astryx 组件上自由叠加任何 CSS 方案——Tailwind、CSS Modules 或原生 CSS：

```tsx
// 用 Tailwind 完全自定义 Astryx 组件样式
<Button className="bg-blue-500 hover:bg-blue-700 rounded-full px-6 py-3">
  Get Started
</Button>
```

**主题即 CSS 变量**：Astryx 的主题本质上是一组 CSS 自定义属性（CSS Custom Properties）的覆盖，无需 fork 代码或重写组件：

```tsx
// themes/theme-neutral 中定义的 CSS 变量
// 用户只需覆盖这些变量即可定制品牌风格
<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

### ESLint 两层 linting 哲学

从 `eslint.config.js` 可以看出 Astryx 的 lint 策略设计：

```javascript
const isStrictMode = process.env.ASTRYX_STRICT_LINT === '1' || process.env.CI === 'true';
const xdsConfig = isStrictMode ? xdsPlugin.configs.strict : xdsPlugin.configs.recommended;
const reactSeverity = isStrictMode ? 'error' : 'warn';
```

这种设计让本地开发更友好（warning 不阻断），CI 和 Agent 场景则严格报错，保证代码质量的同时不干扰开发体验。

### Monorepo 结构

```
apps/           # 示例应用、文档站点、Storybook
packages/       # 发布的 npm 包（core、cli、build、themes）
internal/      # 内部工具（测试工具、ESLint 插件、性能测试）
```

packages 目录下又细分为 `@astryxdesign/core`（组件和主题）、`@astryxdesign/cli`（CLI 工具）、`@astryxdesign/build`（StyleX 源码构建插件）和 `@astryxdesign/theme-*`（7 个主题包）。

## 三、安装与快速开始

### 环境要求

- Node.js（通过 pnpm 10 管理，通过 Corepack 自动启用）
- React 19+

### 安装步骤

```bash
# npm
npm install @astryxdesign/core @astryxdesign/theme-neutral
npm install -D @astryxdesign/cli

# pnpm（推荐，仓库使用 pnpm 10）
pnpm add @astryxdesign/core @astryxdesign/theme-neutral
pnpm add -D @astryxdesign/cli
```

最简配置只需 CSS 导入和主题 Provider，无需任何构建插件或 PostCSS 配置：

```tsx
// main.tsx 或 _app.tsx
import '@astryxdesign/core/styles.css';
import { ThemeProvider } from '@astryxdesign/core';
import { neutralTheme } from '@astryxdesign/theme-neutral';

export default function App() {
  return (
    <ThemeProvider theme={neutralTheme}>
      <YourApp />
    </ThemeProvider>
  );
}
```

### 使用 CLI 工具

建议在 `package.json` 中添加脚本以保证可靠访问：

```json
"scripts": {
  "astryx": "node node_modules/@astryxdesign/cli/bin/astryx.mjs"
}
```

然后即可使用：

```bash
# 列出所有可用组件
npm run astryx -- component --list

# 初始化新组件
npm run astryx -- component create MyButton

# 生成组件文档
npm run astryx -- docs --component Dialog
```

### 贡献者快速启动

```bash
# 启用 Corepack（自动安装正确的 pnpm 版本）
corepack enable

# 安装依赖
pnpm install
```

## 四、实战使用示例

### 基础组件使用

```tsx
import { Button, Dialog, Input } from '@astryxdesign/core';
import { useState } from 'react';

function ContactForm() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open Dialog
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Contact">
        <Input label="Email" type="email" placeholder="you@example.com" />
        <Button variant="primary" className="mt-4">
          Submit
        </Button>
      </Dialog>
    </div>
  );
}
```

### 品牌主题定制

```tsx
import { ThemeProvider } from '@astryxdesign/core';
import { butterTheme } from '@astryxdesign/theme-butter';

// 让 Astryx 组件呈现黄油色调的品牌风格
function App() {
  return (
    <ThemeProvider theme={butterTheme}>
      <YourApp />
    </ThemeProvider>
  );
}
```

Astryx 提供了七个预设主题：`neutral`、`butter`、`chocolate`、`matcha`、`stone`、`gothic`、`y2k`，同时支持通过覆盖 CSS 变量完全自定义。

### 与 Tailwind 混合使用

```tsx
// Astryx 处理基础样式，Tailwind 处理特殊定制
<div className="flex flex-col gap-4">
  <Button className="w-full md:w-auto">Full width on mobile</Button>
  <Button variant="secondary" className="hidden md:block">
    Visible on desktop only
  </Button>
</div>
```

## 五、常见问题与解决方案

### Q1: 安装后组件样式未生效？

检查是否正确导入了 CSS 文件：

```tsx
// ✅ 正确
import '@astryxdesign/core/styles.css';

// ❌ 忘记导入 CSS
import { Button } from '@astryxdesign/core'; // 只有 JS，无样式
```

### Q2: ESLint 报错 `copyright-header`？

所有源文件必须包含 Meta 版权声明头。`eslint.config.js` 中的 `'@astryx/copyright-header': 'error'` 规则会强制执行此要求：

```javascript
// Copyright (c) Meta Platforms, Inc. and affiliates.
```

### Q3: CLI 命令找不到？

将以下脚本添加到 `package.json` 以避免路径解析问题：

```json
"scripts": {
  "astryx": "node node_modules/@astryxdesign/cli/bin/astryx.mjs"
}
```

然后使用 `npm run astryx -- <args>` 而非直接调用 `astryx`。

### Q4: 如何深度定制单个组件？

使用 `swizzle` 命令将组件源码完全弹出到本地项目：

```bash
npm run astryx -- swizzle Dialog --dest ./src/custom/Dialog
```

之后即可完全拥有该组件的源码，自行修改样式和行为。

### Q5: React Compiler 报错？

Astryx 启用了 React Compiler（`react-compiler/react-compiler`），需要确保代码符合 React Compiler 的规范。遇到错误时，检查是否有不必要的副作用被放入了渲染函数中。

## 六、总结

Astryx 的最大价值在于它重新思考了"设计系统"这个概念——不再是一套封闭的组件库，而是一个**开放的、可组合的、以协作为核心的系统**。八年内部打磨的沉淀体现在每一个设计决策里：两层 linting 哲学、人机协同的工具链、无锁定的主题系统，以及开放组件内部的设计。

对于正在构建中后台系统或产品设计规范的团队，Astryx 是一个值得深入研究的对象。哪怕不直接使用其组件，它的架构思路和工程实践（特别是 monorepo 管理、主题系统设计、ESLint 策略）也能带来不少启发。

项目地址：https://github.com/facebook/astryx
