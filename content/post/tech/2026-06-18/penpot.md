---
title: penpot — 开源项目深度解析
date: '2026-06-18'
description: <imgwidth="100%"src="https://github.com/user-attachments/assets/da17b160-f289-436f-b140-972083a08602"/
author: Cheman
slug: penpot
draft: false
tags:
- GitHub Trending
- 开源
categories:
- 开源项目
- 技术博客
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

今天在 GitHub Trending 上看到一个有意思的项目：
**penpot**，这是一个开源项目

## 一、项目概述
<imgwidth="100%"src="https://github.com/user-attachments/assets/da17b160-f289-436f-b140-972083a08602"/

**GitHub：** https://github.com/penpot/penpot

## 二、核心特性
- 标准包管理，依赖安装简单
- README 文档完善，上手容易

## 三、技术实现
项目基于以下关键技术实现：

### 核心文件结构

| 文件 | 说明 |
|------|------|
| `package.json` | JSON · 0.7 KB |

### 核心代码示例

**package.json：**
```json
{
  "name": "penpot",
  "version": "1.20.0",
  "license": "MPL-2.0",
  "author": "Kaleidos INC Sucursal en España SL",
  "private": true,
  "packageManager": "pnpm@11.7.0+sha512.19cc852c120c7125760f2443ee6be0ca5b40f9f50598de1a09a1f177503e010e57c23c77646e01e761de59bf874fb22a3398c33ab9691fc13eb946b6f0f4d620",
  "repository": {
    "type": "git",
    "url": "https://github.com/penpot/penpot"
  },
  "type": "module",
  "scripts": {
    "lint": "./scripts/lint",
    "check-fmt": "./scripts/check-fmt",
    "fmt": "./scripts/fmt"
  },
  "devDependencies": {
    "@types/node": "^25.9.2",
    "esbuild": "^0.28.0",
    "mdts": "^0.20.3",
    "nrepl-client": "^0.3.0",
    "opencode-ai": "^1.17.0"
  }
}
```

## 四、快速开始

```bash
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
Copyright (c) KALEIDOS INC Sucursal en España SL
```

## 五、适用场景

- 开发者研究新技术栈和最佳实践
- 项目快速启动和原型开发
- 学习开源项目的设计思路和架构
- 集成到现有项目中作为依赖

## 六、总结
penpot 是 GitHub Trending 上的热门开源项目，
在技术社区具有较高影响力。
项目代码结构清晰，文档完善，适合深入学习和实际应用。

> 🔗 项目地址：https://github.com/penpot/penpot