---
title: "Modly：用开源 AI 模型在本地把图片变成 3D 模型"
date: 2026-08-14
description: "Modly 是一款跨平台桌面应用，基于开源 AI 模型（Hunyuan3D 2、Trellis2 等）实现在本地 GPU 上将任意图片转换为 3D mesh，全程离线运行，数据不离开设备。"
author: "Cheman"
slug: modly
draft: false
categories: ["技术", "开源", "AI"]
tags: ["3D生成", "开源", "AI", "图像处理", "Electron"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Modly**，一款完全本地运行的开源 AI 图像转 3D mesh 工具，基于开源模型，无需联网，数据始终留在本地。

## 一、项目概述

Modly 是由 Lightning Pixel 开发的一款跨平台（Windows / Linux / Apple Silicon macOS）桌面应用，核心功能是将任意图片通过 AI 模型生成 3D mesh（.glb 等格式），整个推理过程在本地 GPU 上完成。

**核心特性：**
- 纯本地运行，不上传任何数据到云端
- 支持多款开源 3D 生成模型（官方维护的扩展体系）
- 可视化工作流编辑器（基于 React Flow / @xyflow/react），支持将多个处理节点串联成完整流水线
- 内置模型平滑与减面（Decimate）工具，优化生成结果的网格质量
- 集成 AI Agent CLI，支持自动化脚本和 Agent 调用
- 跨平台打包（NSIS / DMG / AppImage）

支持的官方扩展模型包括：

| 模型 | 说明 |
|------|------|
| Hunyuan3D 2 Mini | 腾讯混元 3D Mini 版，轻量快速 |
| Hunyuan3D 2 Mini Turbo | Turbo 加速版 |
| Hunyuan3D 2 Mini Fast | 极致轻量版 |
| TripoSG | TripoSG 高质量网格生成 |
| Trellis2 GGUF | Trellis2 GGUF 量化版 |

## 二、技术架构

Modly 采用 **Electron + React** 前端 + **Python FastAPI** 后端的经典混合架构，打包时将 Python 运行时一并嵌入应用，实现真正的开箱即用。

### 前端技术栈

前端基于 `electron-vite` 构建，使用 React 18 + TypeScript，配合以下核心依赖：

```json
// package.json 关键依赖（前端）
"dependencies": {
  "@react-three/drei": "^9.120.0",
  "@react-three/fiber": "^8.17.10",
  "@react-three/postprocessing": "^2.19.1",
  "@xyflow/react": "^12.10.2",
  "three": "^0.171.0",
  "three-mesh-bvh": "^0.9.9",
  "zustand": "^5.0.3"
}
```

- **React Three Fiber** (`@react-three/fiber`)：Three.js 的 React 渲染器，负责 3D 场景的交互与渲染，支持高斯 splatting（`@mkkellogg/gaussian-splats-3d`）等高级可视化效果。
- **React Flow** (`@xyflow/react`)：可视化工作流编辑器，用户可以在界面上拖拽连线，将"图片 → 生成 Mesh → 加入场景"等节点串联成完整的处理流水线。
- **Zustand**：轻量级状态管理，用于跨组件共享应用状态。

前端使用 Tailwind CSS 构建 UI，主题色以紫色（`accent: #7c3aed`）为主，深色风格（Surface 500 = `#111113`）。

```javascript
// tailwind.config.js 颜色主题
colors: {
  surface: { 50: '#f4f4f5', 200: '#27272a', 400: '#18181b', 500: '#111113' },
  accent:  { DEFAULT: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' }
}
```

### 后端技术栈

Python 后端基于 FastAPI，负责实际的 AI 推理。打包时通过 `scripts/download-python-embed.js` 嵌入 Python 嵌入式运行时（Python Embeddable Package），无需用户单独安装 Python 环境。

```
api/
├── .venv/          # Python 虚拟环境（含 requirements.txt）
└── requirements.txt
```

### electron-vite 配置

项目使用 `electron-vite` 统一管理主进程（main）、预加载脚本（preload）和渲染进程（renderer），并通过 `externalizeDepsPlugin()` 自动将 Node 依赖 external 化，减少打包体积：

```typescript
// electron.vite.config.ts（核心配置）
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: resolve('electron/main/index.ts') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: resolve('electron/preload/index.ts') } }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: { '@': resolve('src'), '@areas': resolve('src/areas'), '@shared': resolve('src/shared') }
    }
  }
})
```

### 扩展系统架构

Modly 的扩展系统支持外部 GitHub 仓库安装模型和处理节点。每个扩展包含 `manifest.json` 和对应的运行时入口文件。用户在应用的"Models"页面输入扩展仓库 URL 即可下载安装，扩展节点会自动出现在工作流编辑器中。

## 三、安装与快速开始

### 下载安装包（推荐普通用户）

直接前往 [Releases 页面](https://github.com/lightningpixel/modly/releases/latest) 下载对应平台的安装程序（Windows NSIS / macOS DMG / Linux AppImage）。

### 从源码运行（开发者）

```bash
# 1. 安装 Node 依赖
npm install

# 2. 配置 Python 后端
cd api
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. 开发模式启动
npm run dev
```

### 打包应用

```bash
# 全平台
npm run build && npm run prepare-resources && electron-builder

# 仅 macOS Apple Silicon
npm run package:mac
```

> ⚠️ macOS 版仅支持 Apple Silicon（M 系列芯片），不支持 Intel Mac。

## 四、使用方法与实战

### 基本工作流

1. 切换到 **Workflows** 标签，新建工作流：拖入 `Image` → `Generate Mesh` → `Add to Scene` 三个节点，用连线将它们串联。
2. 在 **Generate** 标签下，选中工作流，点击 **Generate 3D Model** 开始生成。
3. 打开 **Settings/Logs/Errors** 面板可实时查看推理日志和错误信息。

### 安装扩展模型

1. 进入 **Models** 页面，点击 **Install from GitHub**。
2. 输入扩展仓库的 HTTPS URL（如 `https://github.com/lightningpixel/modly-hunyuan3d-mini-extension`）。
3. 安装完成后，如需模型节点，还需下载对应模型文件。

### Modly CLI 用法

Modly 提供了一个纯标准库（stdlib-only）的 Python CLI，允许 Agent 和脚本无需 UI 即可调用 Modly 的推理能力：

```bash
# 健康检查
python tools/modly-cli/agent.py health

# 查看可用模型
python tools/modly-cli/agent.py model list

# 从图片生成 3D mesh
python tools/modly-cli/agent.py generate --image ./input.png --output ./export.glb
```

CLI 还会将 `workflow-run status <run_id>` 等恢复元数据一并写入 JSON 响应，方便脚本做容错重试。

## 五、常见问题与解决方案

**Q: macOS 版本无法运行？**  
A: Modly 的 macOS 包仅针对 Apple Silicon（M1/M2/M3）编译，Intel Mac 用户需要从源码构建，或等待社区支持。

**Q: 模型下载速度慢？**  
A: 扩展模型从 Hugging Face 或 GitHub LFS 下载，可挂代理或手动下载后放到应用数据目录。

**Q: 推理报 OOM（显存不足）？**  
A: 尝试选择更轻量的模型变体（如 Hunyuan3D 2 Mini Fast），或在设置中降低推理分辨率。

**Q: 工作流节点连线后没有输出？**  
A: 检查节点间连线是否完整（每个节点必须同时有输入和输出连接），Modly 会在对应节点旁边显示内联警告或 Toast 提示，而非直接清空当前视图。

**Q: 如何用 CLI 批量处理？**  
A: 可结合 `workflow-run` 的 JSON 输出做循环调用，注意处理 `workflow-run cancel` 和 `workflow-run status` 状态查询以实现可靠的批处理脚本。

## 六、总结

Modly 展现了开源 AI 在 3D 内容生成领域的实用化潜力——通过将混元 3D、Trellis2 等开源模型与 Electron 桌面应用结合，让普通用户在本地消费级 GPU 上就能完成"照片→3D 模型"的转换，全程不依赖云服务和付费 API。扩展系统和工作流编辑器的设计也为未来引入更多模型和处理节点提供了优雅的扩展路径。如果你对本地 AI 3D 生成感兴趣，不妨从 Releases 页面下载体验一下。
