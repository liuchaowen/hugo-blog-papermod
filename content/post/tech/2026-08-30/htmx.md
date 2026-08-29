---
title: "htmx：用 HTML 属性为网页注入 AJAX、WebSocket 与现代交互能力"
date: 2026-08-30
description: "htmx 是一款仅约 14KB、零依赖的 JavaScript 库，它让你直接在 HTML 属性中发起 AJAX、CSS 过渡、WebSocket 与 SSE 请求，从而用超文本的简洁语法构建现代交互式用户界面。本文从动机、技术原理、快速上手到实战与排错，系统梳理 htmx 的核心能力。"
author: "Cheman"
slug: htmx
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 前端, JavaScript, htmx]
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

今天在 GitHub Trending 上看到一个有意思的项目：**htmx**，一个宣称「high power tools for HTML」的极小体积库，它让前端开发者无需编写大量 JavaScript 就能获得现代 Web 应用的交互体验。

## 一、项目概述

htmx 是 intercooler.js 的继任者，其核心目标是「补全 HTML 作为超文本（hypertext）的能力」。传统 HTML 中，只有 `<a>` 和 `<form>` 能发起 HTTP 请求，只有 `click` 与 `submit` 事件能触发它们，且只能使用 GET 与 POST，并只能替换整屏内容。htmx 通过一组 `hx-*` 属性打破了这些「任意约束」。

项目的关键特性：

- **极小体积**：压缩后约 14KB（`~14k min.gz'd`），对 bundle 体积几乎零负担。
- **零依赖**：`package.json` 中没有任何运行时依赖，`license` 为宽松的 `0BSD`。
- **可扩展**：通过官方 [extensions](https://htmx.org/extensions)（如 `ws`、`sse`、`json-enc`、`class-tools` 等）扩展能力。
- **贴近 REST/HATEOAS 哲学**：以超文本而非 JSON API 作为状态载体，降低前后端耦合。

## 二、技术原理

### 超文本即应用状态

htmx 的设计哲学源自 Roy Fielding 的 REST 架构风格与 HATEOAS（超媒体作为应用状态引擎）。它认为「现代用户界面」本质上仍然是由服务器返回的 HTML 片段驱动的，而不是由前端框架在浏览器里重新组装的虚拟 DOM。

### 属性驱动的交互

htmx 的所有能力都通过 HTML 属性声明。最基础的几个：

- `hx-get` / `hx-post` / `hx-put` / `hx-delete` / `hx-patch`：指定请求方法与目标 URL。
- `hx-trigger`：声明触发请求的 event（如 `click`、`change`、`load`、`revealed` 等），支持轮询与事件过滤。
- `hx-target`：声明用响应内容替换哪个 DOM 元素，默认是当前元素。
- `hx-swap`：声明如何替换（如 `innerHTML`、`outerHTML`、`beforeend`、`afterend`、`delete` 等）。

其本质是一条规则：**「当用户触发某事件时，向某 URL 发起某请求，并用响应替换某元素」**。下面这段来自官方 README 的代码就是最直观的说明：

```html
<!-- 让一个按钮通过 AJAX POST 一次点击 -->
<button hx-post="/clicked" hx-swap="outerHTML">
  Click Me
</button>
```

它的语义是：当点击该按钮时，向 `/clicked` 发起 AJAX 请求，并用服务器返回的 HTML 整体替换这个按钮本身。

### 引擎与构建体系

从 `package.json` 可见，htmx 核心源码位于 `src/htmx.js`，以原生 JavaScript 编写，没有编译期框架。其构建与发布流程包括：

- `npm run dist`：执行 `scripts/dist.sh` 并通过 `tsc` 生成 ESM 类型声明（`dist/htmx.esm.d.ts`），支持 TypeScript 项目以 `allowJs` 方式类型检查（`types-check` 脚本）。
- `npm run web-types-generate`：为 JetBrains 系列 IDE 生成 `htmx.web-types.json`，提供属性自动补全。
- `main` 入口指向 `dist/htmx.esm.js`，`jsdelivr`/`unpkg` 字段指向 `dist/htmx.min.js`，便于 CDN 直引。

### 实时通信扩展

htmx 原生不支持 WebSocket/SSE，而是通过扩展实现。`package.json` 的 `ws-tests` 脚本中可见本地测试服务依赖 `ws` 与 `mock-socket`，对应官方 `ws` / `sse` 扩展：

- `ws` 扩展：`hx-ws="connect:/chat"` 建立 WebSocket 连接，用 `hx-ws="send"` 发送消息。
- `sse` 扩展：`hx-sse="connect:/stream"` 订阅 Server-Sent Events，实现服务端主动推送。

### 测试与质量保障

htmx 使用 Mocha + Chai + Sinon 的测试栈，通过 `@web/test-runner` 在真实浏览器（Chromium/Firefox/WebKit via Playwright）中运行；`mock-socket` 用于 mock AJAX/WebSocket。其 `test` 目录按 `attributes`、`core`、`ext`、`manual` 分层，并设有 `regressions.js` 回归用例，质量门槛较高（`test:ci` 需同时通过 lint、类型检查与全浏览器测试）。

## 三、安装与快速开始

### CDN 引入（最简易）

```html
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.10/dist/htmx.min.js"
        integrity="sha384-H5SrcfygHmAuTDZphMHqBJLc3FhssKjG7w/CeCpFReSfwBWDTKpkzPP8c+cLsK+V"
        crossorigin="anonymous"></script>
```

注意包名是 **`htmx.org`**，npm 上有一个旧的损坏包名为 `htmx`，请勿误装。

### npm 安装

```bash
npm install htmx.org --save
```

然后在入口处引入（ESM）：

```js
import 'htmx.org'
```

### 最简运行示例

```html
<button hx-post="/clicked" hx-swap="outerHTML">
  Click Me
</button>
```

服务端（以 Node 为例）只需返回一段 HTML：

```js
app.post('/clicked', (req, res) => {
  res.send('<button hx-post="/clicked" hx-swap="outerHTML">Clicked!</button>')
})
```

## 四、使用方法与实战

### 基础用法：行内编辑

```html
<div hx-get="/contact/1/edit" hx-trigger="click" hx-target="this" hx-swap="outerHTML">
  点击编辑联系人
</div>
```

点击后请求 `/contact/1/edit`，服务器返回编辑表单 HTML 并就地替换。

### 进阶用法：增量加载与轮询

```html
<!-- 滚动到底部自动加载更多 -->
<div hx-get="/contacts/2" hx-trigger="revealed" hx-swap="afterend">
  联系人列表
</div>

<!-- 每 2 秒轮询一次 -->
<div hx-get="/notifications" hx-trigger="every 2s" hx-swap="innerHTML">
  通知区
</div>
```

`hx-trigger` 支持丰富语法：`load`、`revealed`、`every Ns`、`click once`、`keyup changed` 等，可组合过滤条件。

### 实战：与 CSS 过渡结合

htmx 内置对 CSS 过渡的支持（`hx-swap` 配合 `settle`/`swap` 延迟），可在内容替换前后播放淡入淡出动画，无需手写 JS：

```html
<div class="fade" hx-get="/news" hx-trigger="load"
     hx-swap="innerHTML swap:0.5s settle:0.5s">
  加载中…
</div>
```

## 五、常见问题与解决方案

- **安装失败 / 引错包**：务必安装 `htmx.org` 而非损坏的旧包 `htmx`；CDN 引入时核对 `integrity` 哈希与版本号（当前 `2.0.10`）。
- **响应未替换预期元素**：检查 `hx-target`（默认是当前元素），必要时用 CSS 选择器或 `closest <selector>`、`next <selector>` 指定目标。
- **事件不触发**：确认 `hx-trigger` 拼写与事件名，轮询类需加 `every Ns`，初次加载可用 `load`。
- **历史/书签支持**：开启 `hx-push-url="true"` 可将交互同步到浏览器地址栏，配合 `hx-history-elt` 管理历史快照（见 `web-test-runner.config.mjs` 中的 `hx-history-elt` 用法）。
- **性能问题**：避免高频 `every` 轮询；列表增量加载优先用 `revealed` 懒加载，减少不必要的请求。

## 六、总结

htmx 用一组简洁的 HTML 属性，把 AJAX、CSS 过渡、WebSocket 与 SSE「还给了 HTML」，让服务端驱动超文本的前端范式重新焕发活力。它体积仅约 14KB、零依赖、可扩展，非常适合希望降低前端复杂度、偏好 HATEOAS 架构的团队。正如其俳句所言——「javascript fatigue / longing for a hypertext / already in hand」。

> 项目地址：<https://github.com/bigskysoftware/htmx> ｜ 文档：<https://htmx.org/docs>
