---
title: "Wardrobe：用 AI 把衣服装进你的数字衣橱"
date: 2026-07-19
description: "Wardrobe 是一款本地优先的 AI 衣橱管理工具，通过 OpenAI 多模态模型自动识别照片中的衣物、提取商品级抠图，并生成模特穿搭预览图，让你的衣橱管理、穿搭灵感生成全部在本地完成。"
author: "Cheman"
slug: wardrobe
draft: false
categories: ["技术", "AI"]
tags: ["GitHub", "开源", "AI", "衣橱管理", "OpenAI", "gpt-image"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Wardrobe**，它用 AI 把现实中的衣服"装进"你的数字衣橱，并自动生成穿搭灵感——全部在本地运行，数据不离开你的电脑。

## 一、项目概述

**Wardrobe** 是一个基于 OpenAI 的本地优先衣橱管理工具，核心思路非常清晰：

- 上传一张或多张穿搭照片，AI 自动识别图中所有衣物
- 对每件衣物生成干净的商品级抠图（Product Cutout）
- 可选：生成模特上身预览图（Editorial Preview）
- 所有原始图片、处理结果、生成的图像统一存在本地 `data/` 目录，数据完全私有

项目用 React + Vite 构建，依赖 OpenAI Responses API（gpt-5.4-mini 视觉识别）和 Images API（gpt-image-2 生成抠图），整体技术栈现代、轻量，Node 22+ 即可运行。

## 二、技术原理

### 2.1 整体架构

Wardrobe 的处理流程分为三层：

```
用户上传照片
    ↓
OpenAI Responses API (gpt-5.4-mini)
  → 检测图中每件衣物 + 位置坐标
    ↓
OpenAI Images API (gpt-image-2)
  → 逐件生成抠图 + 可选模特上身图
    ↓
本地存储 (data/library.json / data/imported/)
```

核心逻辑集中在 `scripts/import-job-api.mjs`，它是 Vite 的一个插件，暴露了一个 `/api/wardrobe-import` 接口供前端调用。

### 2.2 衣物识别与抠图

关键代码片段来自 README 中的 Codex 技能说明，导入流程如下：

1. **检测衣物**：`gpt-5.4-mini` 视觉模型接收用户照片，返回 JSON 描述图中所有衣物及其位置
2. **提取抠图**：将每件衣物单独裁剪后发给 `gpt-image-2`，指令为生成干净背景的抠图
3. **模特上身**（可选）：额外调用 `gpt-image-2`，将模型参考图（`data/model-reference.png`）与衣物合成上身预览

配置文件 `package.json` 中的关键依赖：

```json
{{json}}
"dependencies": {
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "sharp": "^0.34.5",
  "vite": "6.4.3"
}
{{/json}}
```

`sharp` 用于服务端图像处理（缩放、格式转换），确保生成的图片在各种设备上都能快速加载。

### 2.3 Codex Agent 技能设计

项目还内置了两个 Codex Skills（AI Agent 指令集），让 AI Agent 也能帮人管理衣橱：

- **import-clothes**：接收照片文件夹，自动识别、抠图、导入 `data/library.json`
- **generate-outfits**：根据已有衣橱生成指定数量的穿搭方案，并生成模特效果图

这种"工具+Agent"的组合设计很有参考价值——工具负责执行，Agent 负责规划和审核。

## 三、安装与快速开始

### 环境要求

- Node.js 22+
- OpenAI API Key（项目支持 gpt-5.4-mini 和 gpt-image-2）

### 安装步骤

```bash
git clone https://github.com/tandpfun/wardrobe.git
cd wardrobe
npm install
cp .env.example .env
```

在 `.env` 中填入：

```bash
OPENAI_API_KEY=sk-你的密钥
```

准备一张个人模特参考图：

```bash
mkdir -p data
# 将你的正面照放入 data/model-reference.png
```

启动：

```bash
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173) 即可使用。

> ⚠️ 导入功能需要先配置 `OPENAI_API_KEY` 并放入 `data/model-reference.png`，否则导入按钮不可用。

## 四、使用方法与实战

### 4.1 通过 Web UI 管理衣橱

1. **导入衣物**：点击"Import"，上传一张穿搭照片（支持拖拽、粘贴、从剪贴板导入）
2. **审核抠图**：AI 生成的每件衣物抠图会逐张展示，点击 ✅ 确认或 🔄 重新生成
3. **浏览衣橱**：所有已导入的衣物以网格形式展示在 Gallery 页面
4. **生成穿搭**：切换到 Outfit 页面，AI 根据衣橱内容生成穿搭灵感并展示模特效果图

### 4.2 通过 Codex Agent 批量导入

如果你在 VS Code 中使用 [Codex CLI](https://github.com/openai/codex)，打开项目后直接说：

```
$import-clothes
Import the clothes from ~/Pictures/outfits, create modeled photos, and add them to this wardrobe.
```

Agent 会自动读取照片、逐件识别、生成抠图，审核通过后写入 `data/library.json`。

生成穿搭灵感：

```
$generate-outfits
Create 5 modeled outfit ideas from my wardrobe.
```

### 4.3 数据存储结构

```
data/
├── library.json          # 衣橱元数据（衣物名称、路径、标签）
├── model-reference.png  # 模特参考图
└── imported/            # 导入的原始照片和生成图
```

所有数据都在本地，不用担心隐私问题。

## 五、常见问题与解决方案

### Q1：npm install 报错 node 版本不支持？
Wardrobe 要求 Node.js 22+，旧版本用户建议使用 [nvm](https://github.com/nvm-sh/nvm) 切换：
```bash
nvm install 22
nvm use 22
```

### Q2：导入功能按钮是灰的？
检查两点：
1. `.env` 中是否正确配置了 `OPENAI_API_KEY`
2. `data/model-reference.png` 是否存在且为 PNG 格式

### Q3：生成的模特效果图不像自己？
模型参考图的拍摄质量直接影响生成效果，建议：
- 正面、纯色背景、光线均匀
- 穿贴身衣物（避免遮挡身体轮廓）
- 尺寸不低于 512×512

### Q4：API 调用报 429 Rate Limit？
OpenAI 对 `gpt-image-2` 有并发限制，Wardrobe 默认是串行处理。如果需要加速，可以在 `vite.config.mjs` 中自行实现带重试的队列机制。

## 六、总结

Wardrobe 是一个将 AI 视觉能力落地的优秀案例——它不追求大而全，而是专注于"衣橱管理"这一个场景，把每个环节（识别→抠图→合成→存储）都做得很顺滑。本地优先的设计让它在隐私敏感的场景下非常有竞争力。

如果你对 AI + 时尚/穿搭方向感兴趣，这个项目的 Codex Skills 设计、多模态 API 串联、以及 Vite 插件架构都值得借鉴。
