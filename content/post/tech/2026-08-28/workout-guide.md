---
title: "开源健身插画库 workout-guide：302 个动作逐帧 SVG 与框架无关 npm 包解析"
date: 2026-08-28
description: "workout-guide 是 Bryl Lim 维护的开源健身动作插画库，包含 302 个动作、每个动作 3 帧共 906 张透明 SVG，并提供类型安全的框架无关 npm 包与可搜索静态画廊。本文解析其 monorepo 架构、资源生成管线与集成方式。"
author: "Cheman"
slug: workout-guide
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 健身, TypeScript, npm, SVG]
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

今天在 GitHub Trending 上看到一个有意思的项目：**workout-guide**，一个开源的健身动作插画库——它把 302 个训练动作做成逐帧 SVG，并配上类型安全的 npm 包和可搜索的静态画廊，开发者可以直接在 App、网页或训练课件里引用标准的动作示意。

## 一、项目概述

**workout-guide** 是一套开放的「运动插画 + 数据」资源库，核心价值可以概括为三点：

- **302 个动作、每动作 3 帧**：每个动作提供 3 张一致的连续帧，共 906 张透明 512 × 512 SVG，可循环播放形成动作动画，直观展示「起始 → 过程 → 还原」的姿态变化。
- **框架无关的 typed npm 包**：发布为 `@bryllim/workout-guide`，原生支持 TypeScript，不绑定任何前端框架（Web、React Native、Node 均可直接引用）。
- **可搜索的静态画廊**：基于 Astro 构建的画廊站点，支持按部位、器械等条件检索动作，并配套图文版《训练指南》。

项目的原始姿态素材来自 [Everkinetic](https://github.com/everkinetic/data)（CC BY-SA 4.0），作者 [Bryl Lim](https://bryllim.com) 在其基础上补充了更多动作与动画帧、对资源做了归一化、整理了结构化元数据与包 API，并产出了文档画廊。因此项目采用「代码 MIT / 视觉素材 CC BY-SA 4.0」的双许可策略，二次分发视觉素材时需保留署名。

> 在线资源：画廊 `https://bryllim.github.io/workout-guide/` · 指南 `https://bryllim.github.io/workout-guide/guide/` · npm `https://www.npmjs.com/package/@bryllim/workout-guide`

## 二、技术原理

### 架构：npm-workspace monorepo

从根目录 `package.json` 可以看到，这是一个标准的 npm workspaces 单体仓库：

```json
"workspaces": [
  "apps/site",
  "packages/workout-guide"
]
```

三个核心目录职责清晰：

- `packages/workout-guide`：包 API、规范化清单（canonical manifest），以及全部 906 张透明 512×512 SVG（PNG 源文件保留以兼容旧环境）。
- `apps/site`：Astro 落地页、画廊、动作详情页与《指南》。
- `scripts`：确定性的目录导入与校验工具，保证资源可复现构建。

### 资源生成管线

906 这个数字本身就是设计结果的体现：`302 个动作 × 3 帧`。图片链路依赖一组现代工具把 PNG 源图转成生产可用的矢量资源：

- **potrace**（`assets:vectorize`）：把位图描摹成矢量路径。
- **svgo**（`assets:vectorize` 链）：压缩、优化 SVG。
- **sharp**：统一缩放到 512×512 并做透明通道处理。

之所以做成「3 帧而非单图」，是为了让前端只需循环切换 `frame 1/2/3` 即可呈现动作过程，无需额外动图格式或视频。

### 类型安全、框架无关的数据层

包 API 以纯函数暴露，导航入口就是 `getExercise` / `searchExercises` / `getAssetUrl`：

```ts
import { getExercise, searchExercises, getAssetUrl } from '@bryllim/workout-guide';

const pushUp = getExercise('push-up');
const bodyweightChest = searchExercises('chest', { equipment: 'bodyweight' });
const firstFrame = getAssetUrl('push-up', 1);
```

配合 `tsconfig.json` 的 `strict: true`，所有查询与资源 URL 都带类型；资源既可经 API 取 URL，也支持直接 `import` 资源文件，文档里还给出了 React Native 的 `require()` 集成示例——这正是「框架无关」的含义：不预设你的运行环境。

工程侧的质量门也很完整：`npm run check` 是一条组合流水线，依次执行目录校验、类型检查、Lint、单测与构建；`vitest` 负责包单测，`@playwright/test` + `@axe-core/playwright` 负责端到端与无障碍校验，并覆盖桌面 Chromium 与移动 Safari 两种环境。

## 三、安装与快速开始

直接使用预发布包：

```sh
npm install @bryllim/workout-guide
```

注意运行环境要求：仓库 `engines` 声明 `node >= 24`，且依赖 TypeScript 6.x 等较新工具链，建议使用新版 Node。

若要本地构建/预览整个项目（含画廊与指南）：

```sh
npm install
npm run check   # 校验目录 + 类型 + lint + 单测 + 构建
npm run dev     # 本地启动 Astro 站点
```

## 四、使用方法与实战

**基础用法**：按 slug 取出一个动作，读取其元数据与帧信息。

```ts
import { getExercise } from '@bryllim/workout-guide';

const ex = getExercise('push-up');
console.log(ex.name, ex.frames); // 动作名 + 帧列表
```

**带过滤的检索**：`searchExercises` 支持按部位、器械等条件筛选，适合做「胸肌自重复合训练」这类动态列表。

```ts
import { searchExercises } from '@bryllim/workout-guide';

const list = searchExercises('chest', { equipment: 'bodyweight' });
```

**取资源 URL**：通过 `getAssetUrl(name, frameIndex)` 拿到指定帧，循环 1→2→3 即可在 UI 上播放动作动画。

```ts
import { getAssetUrl } from '@bryllim/workout-guide';

const frame1 = getAssetUrl('push-up', 1);
const frame2 = getAssetUrl('push-up', 2);
const frame3 = getAssetUrl('push-up', 3);
```

在 React Native 里则可按文档走 `require()` 直接打包进原生包；更多集成模式（直接资源导入、RN 示例）见仓库的 [integration guide](https://bryllim.github.io/workout-guide/guide/)。典型落地场景：训练 App 的动作演示、健身房官网动作库、私教课件中的标准姿态插图。

## 五、常见问题与解决方案

- **Node 版本不达标**：报错多在安装/构建阶段。请升级到 Node ≥ 24（项目显式声明 `engines.node >= 24`），否则 TS 6 相关特性与脚本可能跑不起来。
- **二次分发素材要注意署名**：代码与文档是 MIT，但视觉素材为 CC BY-SA 4.0。在自有产品里使用 SVG 时，需保留 Everkinetic 与 Bryl Lim 的署名（见 `ATTRIBUTION.md`）。
- **只要 SVG、不要 PNG？** 仓库为兼容保留 PNG 源，但你可只引用 512×512 透明 SVG，体积更小、可无损缩放。
- **如何重新生成目录**：维护者可用兼容的来源导出，通过 `npm run catalog:import -- /path/to/source` 重新生成规范化清单与资源；日常校验则跑 `npm run catalog:validate`。

## 六、总结

**workout-guide** 把「健身动作插画」这件常被做成一次性位图的小事，做成了一个可检索、可复现、可集成的开源资源层：逐帧 SVG 解决动画演示，typed 框架无关 npm 包解决跨端复用，Astro 画廊与指南解决「人怎么找、怎么用」。对需要标准动作示意的运动类 App、网站或课件来说，它比自己手绘图标省心得多；若你只想要数据层的检索能力，`@bryllim/workout-guide` 一个依赖即可接入。
