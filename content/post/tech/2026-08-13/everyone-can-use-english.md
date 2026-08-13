---
title: "Enjoy：AI 驱动的英语学习应用，让人人都能用英语"
date: "2026-08-13"
description: "Enjoy 是一款由 AI 驱动的英语学习应用，基于「一千小时」训练体系，提供网页版、浏览器插件和桌面客户端，支持视频、阅读、闪卡和课程等多种学习模式，帮助用户在真实语境中高效习得英语。"
author: "Cheman"
slug: everyone-can-use-english
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI", "英语学习", "开源", "React Native"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Enjoy**，一个由 AI 驱动的英语学习应用，喊出了「AI 是当今世界上最好的外语老师，Enjoy 做 AI 最好的助教」的口号，来自 zuodaoTech 团队，Star 数持续攀升。

## 一、项目概述

Enjoy 的定位非常清晰——用 AI 重构英语学习体验。它脱胎于「人人都能用英语」（2010）和「一千小时」（2024）两套成熟的学习方法论，将理论落地为可操作的产品。

**核心特性：**
- **网页版**：[enjoy.bot](https://enjoy.bot) 直接使用，无需安装
- **浏览器插件**：支持 YouTube 和 Netflix 视频实时翻译与学习，Chrome Web Store 可装
- **桌面客户端**：Electron 构建，即将发布，是对网页版的增强套壳
- **多模态学习**：视频沉浸、电子书精读、闪卡记忆、课程体系四大模块并行

项目采用 monorepo 架构，基于 Yarn 4.6.0 workspace，包含三个工作空间：

```json
{
  "workspaces": [
    "enjoy",        // 主应用
    "1000-hours",    // 文档站点
    "1000h-portal"  // 门户
  ]
}
```

## 二、技术原理

### 架构设计

Enjoy 是一个典型的前后端分离 monorepo 项目：

```
everyone-can-use-english/
├── enjoy/                 # 主应用（Electron + React Native）
├── 1000-hours/            # 文档站（Hugo / Next.js）
└── 1000h-portal/          # 官网门户
```

核心应用 `enjoy` 基于 React Native 构建，同时输出 web、iOS/Android 和桌面客户端，体现了「write once, run everywhere」的思路。浏览器插件则独立实现，通过 Chrome Extension API 注入到 YouTube/Netflix 页面。

### 核心技术栈

从 `package.json` 可以推断技术选型：

```json
{
  "engines": { "node": ">=20.0.0" },
  "packageManager": "yarn@4.6.0"
}
```

- **前端框架**：React + TypeScript（`.tsx` 文件结构）
- **桌面构建**：Electron（`yarn enjoy:package` / `yarn enjoy:make`）
- **发布流水线**：GitHub Actions（自动化测试 + Release 构建）
- **Monorepo 管理**：Yarn 4.6.0 Workspaces

CI/CD 流程中包含三条独立 workflow：
- `deploy-1000h.yml`：部署文档站
- `test-enjoy-app.yml`：单元和集成测试
- `release-enjoy-app.yml`：自动化发版

### AI 学习能力

Enjoy 的 AI 能力体现在几个层面：

1. **实时字幕与翻译**：在 YouTube/Netflix 视频上叠加 AI 生成的字幕，支持点击查词
2. **智能闪卡**：基于间隔重复（Spaced Repetition）算法，AI 分析学习数据生成个性化复习计划
3. **课程推荐**：根据用户水平和学习轨迹动态调整内容难度

## 三、安装与快速开始

### 环境要求

- Node.js ≥ 20.0.0
- Yarn 4.6.0（项目指定包管理器）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/ZuodaoTech/everyone-can-use-english.git
cd everyone-can-use-english

# 安装依赖（使用项目指定的 Yarn 版本）
corepack enable
yarn install
```

### 运行各模块

```bash
# 启动 Enjoy 主应用（开发模式）
yarn enjoy:dev

# 启动文档站
yarn docs:dev

# 运行测试
yarn enjoy:test

# 打包桌面应用
yarn enjoy:make
```

### 最简使用

不想折腾代码？直接访问 [https://enjoy.bot](https://enjoy.bot) 即可使用网页版，安装浏览器插件后可在 YouTube/Netflix 上边看边学。

## 四、使用方法与实战

### 视频学习模式

安装 Chrome 插件后，打开任意 YouTube 或 Netflix 视频，插件会自动注入学习界面：

- 实时双语字幕，可点击任意单词查看释义
- AI 生成的内容摘要和关键词
- 一键将陌生词汇加入闪卡复习库

### 电子书精读

在 enjoy.bot 的电子书模块，可以：
- 导入 EPUB 或直接阅读内置教材（《人人都能用英语》八章完整版）
- 高亮标注，AI 自动生成生词表
- 跟读打分，纠正发音

### 闪卡复习

基于间隔重复算法，闪卡会在遗忘曲线节点自动出现：
- 支持图片、音频、文本混合卡片
- AI 根据用户错误率动态调整复习频率

### 课程体系

Enjoy 内置了「一千小时」训练体系的完整课程：
- 语音塑造（美语音标全攻略）
- 大脑内部（语言习得机制）
- 自我训练（可操作的训练任务清单）

## 五、常见问题与解决方案

### 安装依赖失败

**问题**：`yarn install` 报 `Engines mismatch` 错误

**解决**：确保 Node.js 版本 ≥ 20，或使用 `corepack enable` 激活项目指定的 Yarn 版本

```bash
node --version  # 确认 >= 20.0.0
corepack enable
yarn --version  # 确认 >= 4.6.0
```

### 浏览器插件无法注入

**问题**：YouTube 页面上没有看到学习界面

**解决**：
1. 确认插件已从 Chrome Web Store 正确安装并启用
2. 检查页面是否为受支持的视频页面（非 Shorts 或直播）
3. 刷新页面或重新加载插件

### 桌面版打包失败

**问题**：`yarn enjoy:make` 报错

**解决**：确保系统安装了 Xcode Command Line Tools（macOS）或对应平台的构建工具链

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install build-essential
```

### AI 功能无法使用

Enjoy 的 AI 能力依赖后端服务，如果出现响应缓慢或不可用，可访问 [FAQ 文档](https://1000h.org/enjoy-app/faq.html) 获取排查指引。

## 六、总结

Enjoy 是一个将英语学习「方法论 + AI 产品」结合得相当扎实的开源项目。它背后有「人人都能用英语」十年积累的认知框架做支撑，同时用现代化的技术栈（Electron、React Native、TypeScript）将理念转化为可用的产品。

对于想系统学习英语的开发者来说，这既是一个学习工具，也是一个值得研究的开源样本——它的 monorepo 架构设计、Electron + React Native 跨端策略、以及 CI/CD 流水线配置，都值得借鉴。

如果你对 AI + 教育这个赛道感兴趣，Enjoy 的代码和文档都托管在 GitHub，不妨去看看他们是怎么把「一千小时」这套方法论工程化落地的。
