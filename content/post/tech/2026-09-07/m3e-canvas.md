---
title: "M3E Canvas：浏览器中绘制 Material 3 Expressive 界面并生成 AI 编程提示词"
date: 2026-09-07T08:04:00+08:00
description: "M3E Canvas 是一个开源的浏览器端设计工具，支持拖拽绘制 Material 3 Expressive 风格的界面原型，自动生成结构化提示词供 Claude Code、Codex 等 AI 编程工具使用，实现从设计到代码的无缝衔接。"
author: "Cheman"
draft: false
tags: ["Material 3", "设计工具", "AI编程", "前端开发", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**M3E Canvas**，一个在浏览器中绘制 Material 3 Expressive 界面原型并自动生成 AI 编程提示词的开源工具，让设计师和开发者能在几分钟内把想法变成可运行的代码。

## 一、项目概述

M3E Canvas 由 lnkiai 开发，是一个基于 Next.js 16 和 React 19 的纯前端应用。它的核心思路很简单：在浏览器里拖拽组件来搭建 Material 3 Expressive 风格的界面原型，然后一键将这些设计转化为自然语言提示词，直接喂给 Claude Code、Codex、Gemini CLI 或 Cursor 等 AI 编程工具。

项目当前的 Star 数已超过 4200，采用 MIT 许可证，完全免费且开源。它的定位非常明确——填补设计工具与 AI 代码生成之间的鸿沟，让"画个草图"变成"拿到一个能跑的应用"的流程尽可能短。

核心特性包括：

- **丰富的组件库**：按钮、图标按钮、FAB、拆分按钮、标签片、应用栏、导航栏、悬浮工具栏、标签页、搜索栏、卡片、列表、对话框、消息条、文本输入框等数十种组件，全部按 Material 3 Expressive 规范绘制
- **磁吸连接**：组件靠近时自动合并为相连组，圆角随之融合
- **多屏幕设计**：支持手机（412×892）和桌面（1280×800）两种尺寸，可在同一设计中混用
- **主题系统**：配色、形状、字体、动效四个维度可调，支持七套预设配色和动态配色
- **提示词输出**：设计转化为日/英/中/韩四语的自然语言提示词

## 二、技术原理

### 架构设计

M3E Canvas 采用静态导出架构，整个应用是一个纯前端实现，无需后端服务器：

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
};
```

通过 `output: "export"` 将 Next.js 应用静态导出到 `./out` 目录，可直接部署到 GitHub Pages 等静态托管平台。所有用户数据保存在浏览器 localStorage 中，设计文件不经过任何服务器。

### 技术栈与选型

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.3.4 | 应用框架，静态导出 |
| React | 19.2.8 | UI 渲染 |
| Motion | 13.1.1 | 动画引擎，驱动 M3 Expressive 弹簧动效 |
| Tailwind CSS | 4.x | 样式系统 |
| html-to-image | 1.11.13 | 屏幕截图导出 PNG |
| TypeScript | 7.x | 类型安全 |
| Vitest | 5.x | 单元测试 |

React 19 的选择值得关注——它利用了最新的 React 特性来优化渲染性能，特别是在大量拖拽组件和实时预览场景下。Motion 库（前身为 Framer Motion）负责 Material 3 Expressive 的弹簧动画系统，包括页面切换时的滑动、淡入和扩展效果。

### 磁吸连接机制

项目中最有趣的技术细节之一是磁吸连接（Magnetic Connections）。当两个按钮或列表项被拖拽到足够近的距离时，它们会自动合并为一个相连的组件组，相邻的圆角会平滑融合。这不是简单的视觉拼接，而是在数据模型层面将独立组件重组为结构化的连接组。

这种设计直接影响了提示词的生成质量——连接后的组件组在输出提示词时会被描述为一个整体，而不是两个独立的元素，让 AI 生成的代码布局更加准确。

### 提示词生成引擎

提示词生成是 M3E Canvas 的核心价值所在。设计完成后，整个画布上的所有组件、它们的属性、层级关系、屏幕间的导航逻辑，以及主题配置，都会被序列化为一段结构化的自然语言描述。

提示词包含的关键信息：

1. **组件清单**：每个屏幕上的所有组件及其属性（文字、图标、样式状态）
2. **布局关系**：组件间的叠放、并排、连接等空间关系
3. **导航流**：屏幕间的跳转目标和过渡动画方向
4. **主题参数**：配色方案、形状风格、字体选择和动效模式
5. **行为注释**：用户为每个组件添加的自定义行为说明
6. **目标平台**：Android（默认）或 Web，决定提示词要求的技术栈

以 Android 为目标时，提示词会要求使用 Jetpack Compose 和 Material 3 组件库；选择 Web 时，则对应 React 和 Material Web Components。

### 图层与编组系统

图层面板维护着每个屏幕的 z-order 信息，支持拖拽调整前后顺序。多选组件后可以编组，编组会保持内部的叠放关系并作为一个整体移动。这一设计确保了复杂界面在提示词中的布局描述不会走样——编组和叠放关系会被明确写入提示词，AI 生成的代码因此能更准确地还原设计意图。

## 三、安装与快速开始

### 环境要求

- Node.js 22.12.0+ 或 24.0.0+ 或 26.0.0+
- npm 或兼容的包管理器

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/lnkiai/m3e-canvas.git
cd m3e-canvas

# 安装依赖
npm install

# 启动开发服务器
npm run dev        # 访问 http://localhost:3000

# 或构建静态版本
npm run build      # 输出到 ./out 目录
```

### 在线体验

不想本地安装的话，直接访问官方在线版即可：https://lnkiai.github.io/m3e-canvas/

## 四、使用方法与实战

### 基础用法：搭建一个食谱应用

1. **添加屏幕**：点击画布添加新屏幕，命名为 "食谱列表" 和 "食谱详情"
2. **拖入组件**：从左侧组件面板拖入应用栏、搜索栏、卡片列表到 "食谱列表" 屏幕
3. **设置导航**：给卡片设置点击目标为 "食谱详情"，选择 "slide from right" 过渡
4. **调整主题**：在主题面板选择配色预设，切换形状和字体
5. **预览**：按 P 键进入预览模式，点击卡片验证导航效果
6. **生成提示词**：打开提示词面板，选择中文和 Android 目标，复制生成的提示词

### 进阶：连接 AI 编程工具

将复制的提示词粘贴到 Claude Code 或 Codex 中：

```
请根据以下设计描述创建一个 Android 应用：
[这里是 M3E Canvas 生成的提示词]
使用 Jetpack Compose 和 Material 3 组件库实现。
```

AI 工具会根据提示词中的组件清单、布局关系、导航流和主题参数生成完整的代码。

### AI 辅助填写行为说明

M3E Canvas 内置了可选的 AI 辅助功能，支持 OpenAI、Claude、Gemini 和 DeepSeek。填入自己的 API Key 后，模型可以用当前界面语言帮你为组件撰写行为说明或屏幕描述。密钥仅保存在浏览器中，请求直接发送给服务商，无中间服务器。

### 分享与协作

- **分享链接**：复制一个能在他人画布上直接打开你设计的链接
- **AI 草图指令**：复制给 Claude Code / Codex 的指令，代理会读取 `agent.md` 文件、根据描述自动绘制草图并以链接形式回复

## 五、常见问题与解决方案

### Q: 组件拖拽后位置不准确？

M3E Canvas 有 4dp 网格对齐和辅助线。如果需要自由移动，按住 Ctrl 键拖拽可以暂时关闭吸附。也可以使用"整理"按钮一键将栏贴到边缘、FAB 放到角落、相邻组件自动连接。

### Q: 提示词太长怎么办？

可以选择只导出单个屏幕的提示词，而不是整个设计。在提示词面板切换到 "当前屏幕" 模式即可。

### Q: 数据保存在哪里？

所有设计数据保存在浏览器 localStorage 中，不会上传到任何服务器。这意味着清除浏览器数据会丢失设计文件，建议定期使用分享链接功能备份。

### Q: 手机上能用吗？

手机上可用但功能受限——只有一个固定屏幕和按钮编辑器。完整的多屏幕编辑功能需要桌面浏览器。

### Q: 如何部署到子路径？

如果部署到 GitHub Pages 项目站点等子路径下，需要在构建时设置环境变量：

```bash
NEXT_PUBLIC_BASE_PATH=/your-repo npm run build
```

`.github/workflows/deploy.yml` 已自动处理这一步。

## 六、总结

M3E Canvas 解决了一个很实际的问题：从设计到 AI 代码生成之间的信息传递损耗。传统流程中，设计师画好原型后需要写大量的文字描述来告诉开发者每个组件的行为和关系；而 M3E Canvas 把这些信息直接编码在可视化设计工具中，一键输出结构化的提示词。

对于使用 Claude Code、Codex 等 AI 编程工具的开发者来说，这个工具能显著提升"从想法到代码"的效率。它不是替代 Figma 等专业设计工具，而是专门为 AI 编程工作流优化的轻量级设计工具——快速画、快速看、快速生成提示词、快速得到代码。

项目基于 Next.js 16 + React 19 的纯前端架构，零后端依赖，部署简单，MIT 开源，值得关注和尝试。
