---
title: "screenshot-to-code：用 AI 将截图、Figma 与录屏一键转换为可运行代码"
date: 2026-08-29
description: "screenshot-to-code 是一个开源 AI 工具，可以把截图、线框图、Figma 设计和网站录屏转换为干净、可运行的代码（HTML+Tailwind、React、Vue 等）。本文拆解其架构设计、技术栈选型、本地部署与实战用法。"
author: "Cheman"
slug: screenshot-to-code
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 前端, 自动化工具]
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

今天在 GitHub Trending 上看到一个有意思的项目：**screenshot-to-code**，它能用 AI 把一张截图、一份 Figma 设计稿，甚至一段网站录屏，直接变成可运行的真实代码。对于前端开发者和独立开发者来说，这几乎是"设计稿即生产环境"的终极形态。

## 一、项目概述

**screenshot-to-code** 由 abi 维护，核心理念非常直白：把视觉稿（截图、mockup、Figma、屏幕录制）喂给 AI，产出干净、可用的功能代码，而不是只能看不能用的静态图。

目前支持的目标技术栈相当全面：

- HTML + Tailwind
- HTML + CSS
- React + Tailwind
- Vue + Tailwind
- Bootstrap
- Ionic + Tailwind

默认接入的 AI 模型覆盖了当下主流厂商，质量与速度兼顾：

- **Gemini 3 Flash Preview / Gemini 3.1 Pro Preview** —— 项目推荐的"最佳模型"，同时负责从截图中提取真实素材（logo、图片）
- **GPT-5.5 / GPT-5.4 Mini** —— OpenAI 系的代码生成变体
- **Claude Opus 4.6 / Claude Opus 4.8** —— Anthropic 系的代码生成变体
- **z-image-turbo（经由 Replicate）** —— 专门用于图像生成

除了静态截图，它还支持"录屏转原型"：录制一个网站在实际运行中的交互过程，AI 会把它还原成一个可交互的功能性原型，这一点在 README 的动图示例里非常直观。

## 二、技术原理

从仓库结构（`package.json` 采用 pnpm workspaces）可以清楚看到，这是一个典型的前后端分离应用：

```json
{
  "name": "screenshot-to-code",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "workspaces": ["frontend", "backend"],
  "packageManager": "pnpm@10.32.1"
}
```

整体架构可以拆成三块：

**1. 前端（React + Vite）**
承载编辑器、预览窗口与设置面板。前端通过 WebSocket 与后端通信，地址由 `VITE_WS_BACKEND_URL` 控制，因此前后端可以分别部署到不同主机。

**2. 后端（FastAPI）**
接收截图/录屏，调用所选的大模型生成代码，并把结果回传前端。它还承担"素材提取"与"图像编辑"等增强能力——其中真实的 logo/图片提取依赖 Gemini，背景去除与图像生成依赖 Replicate。

**3. 截图预览（Playwright + Chromium）**
这是该项目很有巧思的一环：Agent 在生成页面后，会用无头 Chromium 把自己的成果渲染出来并"肉眼"自检。README 中称其为 **screenshot preview**，只要装了 Chromium（或使用了自带 Chromium 的 Docker 镜像），该能力会自动启用；缺失时则跳过，不影响主体功能。

**模型选择与数据流**
不同 API Key 解锁不同能力，文档用一张表做了清晰映射：

| Key | 必需？ | 解锁能力 |
|-----|--------|----------|
| `OPENAI_API_KEY` | 三选一 | GPT 代码生成变体 |
| `ANTHROPIC_API_KEY` | 三选一 | Claude 代码生成变体 |
| `GEMINI_API_KEY` | 三选一（强烈推荐） | Gemini 代码生成；从截图提取真实素材；视频模式必需 |
| `REPLICATE_API_KEY` | 强烈推荐 | 图像编辑、背景去除、图像生成 |

Key 越多，应用会在每次生成时自动挑选更强的模型组合；只有一个 Key 时，则仅使用该厂商的模型。视频模式（录屏转原型）要求必须配置 Gemini。

## 三、安装与快速开始

最快的体验方式是官方托管的 [screenshottocode.com](https://screenshottocode.com)，无需任何本地环境。如果想自托管或参与贡献，有两种路径。

**Docker（最简本地部署）**

```bash
echo "OPENAI_API_KEY=sk-your-key" > .env
docker-compose up -d --build
```

启动后访问 http://localhost:5173 即可。注意：Docker 方式不支持二次开发，文件改动不会触发重建。

**本地源码运行**

后端用 Poetry 管理依赖，并需要 Chromium 供预览工具使用：

```bash
cd backend
echo "OPENAI_API_KEY=sk-your-key" > .env
echo "ANTHROPIC_API_KEY=your-key" >> .env
echo "GEMINI_API_KEY=your-key" >> .env
echo "REPLICATE_API_KEY=r8_your-key" >> .env
poetry install
# Linux 下可顺带安装系统依赖：poetry run playwright install --with-deps chromium
poetry run playwright install chromium
poetry env activate
poetry run uvicorn main:app --reload --port 7001
```

前端则用 pnpm：

```bash
cd frontend
pnpm install
pnpm dev
```

打开 http://localhost:5173 使用。若想让前端连接其它端口的后端，在 `frontend/.env.local` 中调整 `VITE_WS_BACKEND_URL` 与 `VITE_HTTP_BACKEND_URL` 即可。

## 四、使用方法与实战

最小可用流程：准备一张截图或设计稿 → 在界面上传 → 选择目标技术栈与模型 → AI 生成代码 → 预览窗口实时查看结果 → 导出到项目。

实战中几个值得注意的点：

- **Key 的灵活配置**：除在 `backend/.env` 写入外，OpenAI / Anthropic / Gemini 的 Key 也能在设置对话框（加载应用后点击齿轮图标）里直接填写；但 **Replicate 必须在 `backend/.env` 中以 `REPLICATE_API_KEY` 配置**。设置面板会显示当前后端是否启用了 screenshot preview。
- **多模型对比**：由于支持多家模型，同一张稿子可以换模型反复生成、横向对比还原度，挑出最贴合的一个。
- **真实案例**：README 展示了 NYTimes、Instagram、Hacker News 等站点的"原图 vs 复刻"对比，复刻稿在布局与视觉上还原度相当高，足以作为真实项目起步的脚手架。

## 五、常见问题与解决方案

基于对配置项与错误处理的梳理，部署时高频问题如下：

**1. 后端启动报错 / 配置失败**
优先参考 README 指向的 Troubleshooting 与 issue 排查；确认至少一个 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` 已正确写入后端 `.env`。

**2. 无法直接访问 OpenAI API**
可配置代理：在 `backend/.env` 设置 `OPENAI_BASE_URL`，或在设置面板里直接填带 `v1` 路径的地址，例如 `https://xxx.xxxxx.xxx/v1`；必要时配合 VPN。

**3. Windows 下 `.env` 出现 UTF-8 错误**
用 Notepad++ 打开 `.env`，在「编码」中改为 UTF-8 保存即可。

**4. screenshot preview 不可用**
该能力依赖 Chromium。本地需执行 `poetry run playwright install chromium`（Linux 加 `--with-deps`），Docker 镜像已自带；缺失时应用会自动跳过，不影响代码生成本身。

**5. 想换后端连接地址**
在 `frontend/.env.local` 配置 `VITE_HTTP_BACKEND_URL` 与 `VITE_WS_BACKEND_URL`，例如 `VITE_HTTP_BACKEND_URL=http://124.10.20.1:7001`。

## 六、总结

screenshot-to-code 把"设计即代码"推向了一个真正可用的阶段：它不只是截图转 HTML，而是覆盖 React/Vue 等现代栈、支持真实素材提取、图像生成，甚至能把网站录屏还原成交互原型，并用无头浏览器做自我校验。配合 Docker 一键部署和灵活的多模型接入，无论是快速做原型、复刻竞品界面，还是给内部工具搭脚手架，都是一个值得放进工具箱的开源项目。
