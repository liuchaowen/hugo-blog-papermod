---
title: "M3E Canvas：在浏览器里拼装 Material 3 Expressive 界面，一键生成 AI 编程提示词"
date: 2026-09-07T13:10:00+08:00
description: "M3E Canvas 是一个开源的 Material 3 Expressive 界面设计工具，支持拖放组件、磁吸连接、屏幕导航、主题切换，并能将设计转化为自然语言提示词，配合 Claude Code、Cursor 等 AI 编程工具使用。"
author: "Cheman"
draft: false
tags: ["GitHub", "开源", "Material Design", "AI编程", "前端工具"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**M3E Canvas**，它让你在浏览器里拖拽拼装 Material 3 Expressive 风格的 App 界面，然后一键生成提示词，直接丢给 Claude Code、Cursor 等 AI 编程工具来生成真实代码。

## 一、项目概述

M3E Canvas 是一个纯前端的设计工具，核心解决的问题是：**从 UI 设计到 AI 代码生成之间的「提示词鸿沟」**。

传统流程中，你需要手写详细的 UI 描述才能让 AI 生成像样的界面。而 M3E Canvas 让你用拖拽的方式画出界面，它自动把你的设计转化成结构化的自然语言提示词——包括组件类型、布局关系、导航流、主题参数等。

核心特性：

- 拖放式 Material 3 Expressive 组件库（按钮、FAB、卡片、列表、对话框、导航栏等 30+ 种）
- 磁吸连接：组件靠近自动合并成组，圆角融合
- 多屏幕设计 + 点击/滑动导航流
- 四维主题系统（颜色、形状、字体、动效）
- 提示词输出支持日/英/中/韩四种语言
- 纯前端、无后端，数据存在 localStorage

## 二、技术原理

### 架构设计

M3E Canvas 是一个 **静态导出的 Next.js 应用**，无后端服务，所有数据存储在浏览器 localStorage 中。这意味着：

- 零部署成本：直接放在 GitHub Pages 上即可
- 隐私友好：用户的设计数据不离开浏览器
- 离线可用：加载后不依赖网络请求

从 `next.config.ts` 可以看到静态导出配置：

```typescript
const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
};
```

### 技术栈选型

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.3.4 | 应用框架（静态导出模式） |
| React | 19.2.8 | UI 渲染 |
| Tailwind CSS | 4.x | 样式系统 |
| Motion | 13.1.1 | 动画/过渡效果 |
| html-to-image | 1.11.13 | 屏幕截图导出 PNG |
| TypeScript | 7.x | 类型安全 |

### 核心设计思路

**1. 组件模型**

每个界面组件（Part）是一个独立对象，包含位置、尺寸、样式、行为注释等属性。组件可以：

- 自由拖拽定位
- 靠近时磁吸合并（按钮组、列表组）
- 设置点击/滑动导航目标
- 编组和层级管理

**2. 屏幕模型**

屏幕（Screen）是组件的容器，支持：

- 412×892 手机尺寸和 1280×800 桌面尺寸切换
- 同一设计混用两种尺寸
- 屏幕间导航关系（slide/fade/expand 过渡）

**3. 提示词生成引擎**

这是项目最核心的能力。它将画布上的视觉设计转化为结构化的自然语言描述：

- 遍历所有屏幕和组件
- 描述组件类型、文本、图标、样式
- 描述组件间的布局关系（叠放、并排、磁吸连接）
- 描述屏幕间的导航流和过渡动画
- 描述主题参数（配色方案、形状、字体、动效）
- 输出为目标平台（Android/Web）匹配合适技术栈的提示词

**4. 主题系统**

基于 Material 3 Expressive 的四轴设计：

- **颜色**：7 种预设 + 自定义种子色生成完整 M3 配色方案，支持浅色/深色、三档对比度、动态配色
- **形状**：全局圆角切换（方形/圆角/全圆）
- **字体**：Roboto / Roboto Flex / Roboto Serif / 系统字体
- **动效**：标准弹簧 vs 表现力弹簧方案

## 三、安装与快速开始

### 环境要求

- Node.js 22.12+ 或 24+ 或 26+
- npm

### 安装步骤

```bash
git clone https://github.com/lnkiai/m3e-canvas.git
cd m3e-canvas
npm install
npm run dev        # 访问 http://localhost:3000
```

### 构建静态站点

```bash
npm run build      # 输出到 ./out 目录
```

如果要部署在子路径下（如 GitHub Pages 项目站点），设置环境变量：

```bash
NEXT_PUBLIC_BASE_PATH=/your-repo npm run build
```

项目自带的 GitHub Actions 工作流（`.github/workflows/deploy.yml`）会在每次推送到 `main` 时自动构建并发布到 GitHub Pages。

## 四、使用方法与实战

### 基础用法：设计一个食谱 App

1. **打开画布**：访问 [在线 Demo](https://lnkiai.github.io/m3e-canvas/) 或本地 `npm run dev`
2. **添加屏幕**：点击添加按钮，创建 "首页"、"详情页"、"收藏页" 三个屏幕
3. **拖放组件**：从左侧组件面板拖入搜索栏、卡片、导航栏等
4. **设置导航**：点击搜索栏，设置目标屏幕为 "详情页"，过渡方式选 "slide from right"
5. **调整主题**：打开主题面板，选择配色方案和形状风格
6. **预览**：按 `P` 进入预览模式，点击组件测试导航流

### 进阶用法：生成提示词并交给 AI

1. **打开 Prompt 面板**：设计完成后，点击 Prompt 按钮
2. **选择语言和平台**：选择中文 + Android（或 Web）
3. **复制提示词**：面板会生成一段结构化的自然语言描述
4. **粘贴到 AI 工具**：把提示词粘贴到 Claude Code、Cursor、Gemini CLI 等工具中
5. **AI 生成代码**：AI 根据提示词生成完整的 App 代码

提示词示例（简化版）：

> 创建一个食谱 App，包含三个屏幕。首页有一个搜索栏（顶部）、一张今日推荐卡片（中间）、一个底部导航栏（三个 tab：首页、收藏、设置）。点击搜索栏跳转到详情页，slide from right 过渡。详情页有一张大图、标题、食材列表和步骤列表。主题使用紫色系配色，圆角风格，Roboto 字体...

### AI 辅助（可选）

支持接入 OpenAI、Claude、Gemini 或 DeepSeek 的 API，让 AI 帮你写组件的行为说明或屏幕描述。API Key 只保存在浏览器中，请求直接发送到服务商，无中间服务器。

## 五、常见问题与解决方案

### Q: 组件拖拽不精准？

A: 开启对齐辅助线（默认开启）。按住 `Ctrl` 拖拽可以临时关闭吸附和 4dp 网格。

### Q: 手机上能用吗？

A: 可以，但功能精简。手机上是单屏 + 按钮编辑器模式，完整的多屏设计请在桌面浏览器使用。

### Q: 数据会丢失吗？

A: 不会。所有内容自动保存在浏览器 localStorage 中。但清除浏览器数据会导致丢失，建议用分享链接备份。

### Q: 如何部署到自己的服务器？

A: `npm run build` 生成静态文件到 `out/` 目录，放到任意静态文件服务器即可。也可用 `npx serve out` 本地预览。

### Q: 支持自定义组件吗？

A: 目前组件库是固定的 Material 3 Expressive 风格。可以通过 PR 提交新组件请求，参见 CONTRIBUTING.md。

## 六、总结

M3E Canvas 填补了 UI 设计和 AI 代码生成之间的一个关键空白：**不需要手写冗长的设计文档，拖拽就能生成精准的 AI 编程提示词**。

对于经常用 Claude Code、Cursor 等 AI 编程工具的开发者来说，这是一个实用的「设计→提示词」桥梁。纯前端、零成本部署、支持四语言的特点让它几乎可以即开即用。如果你在做 Material Design 风格的 App 原型，值得一试。

项目地址：[https://github.com/lnkiai/m3e-canvas](https://github.com/lnkiai/m3e-canvas)

在线体验：[https://lnkiai.github.io/m3e-canvas/](https://lnkiai.github.io/m3e-canvas/)
