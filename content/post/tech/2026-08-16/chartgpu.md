---
title: "ChartGPU：一个基于 WebGPU 的高性能图表渲染库"
date: 2026-08-16
description: "ChartGPU 是一个基于 WebGPU 的高性能图表渲染库，支持百万级数据点实时流式更新、多图表共享 GPU 设备、2D/3D 图表渲染，零 npm 运行时依赖，MIT 协议开源。"
author: "Cheman"
slug: chartgpu
draft: false
categories: ["技术", "开源", "前端"]
tags: ["WebGPU", "图表", "数据可视化", "TypeScript", "前端性能"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ChartGPU**，一个基于 WebGPU 的高性能图表渲染库，宣称可以处理百万级数据点的实时流式渲染，而且**零 npm 运行时依赖**。

## 一、项目概述

ChartGPU 由 ChartGPU 团队开发和维护，定位是替代传统的 Canvas2D / WebGL 图表方案，用 WebGPU 的原生计算和渲染能力换取更高的数据吞吐量和更流畅的交互体验。

**核心特性：**

- **纯 WebGPU 渲染**：不降级到 WebGL 或 Canvas2D，专注挖掘 GPU 并行能力
- **百万级数据点**：支持千万级 float64 数据序列，配合 LTTB 等采样算法
- **实时流式更新**：通过 `appendData` API 追加数据，支持环形缓冲区（maxPoints）实现 FIFO 流出效果
- **多图表共享 GPU 设备**：一个 `GPUDevice` + `pipelineCache` 可驱动多个图表，zoom 同步只需 `connectCharts`
- **2D + 3D 全覆盖**：支持 line / area / bar / scatter / pie / candlestick / heatmap / band / errorBar，以及 `cartesian3d` 坐标系的 `pointCloud3d` 和 `surface3d`
- **零运行时依赖**：MIT 协议，商业可用

支持的图表类型一览：

| 类别 | 类型 |
|------|------|
| 笛卡尔系 | line, area, bar, scatter, pie |
| 金融 | candlestick, ohlc |
| 科学可视化 | heatmap, band, errorBar, impulse |
| 变体 | step line/area, stacked mountain, scatter density |
| 3D | pointCloud3d, surface3d |

## 二、技术原理

### 2.1 架构设计

ChartGPU 的核心架构基于 WebGPU 的 Compute Pipeline 和 Render Pipeline 分离设计。从源码文件结构可以看出：

```
src/
  index.ts              ← 统一导出 API
  chart/                ← 图表核心
  series/               ← 各类型数据序列实现
  gpu/                  ← WebGPU 底层封装（device, pipeline cache）
  data/                 ← 数据存储、采样、环形缓冲
  interaction/          ← zoom/pan/annotations
```

**入口流程：**

```ts
import { ChartGPU } from '@chartgpu/chartgpu';

// 检测 WebGPU 支持
if (!navigator.gpu) {
  throw new Error('WebGPU not available');
}

// 创建独立图表
const chart = await ChartGPU.create(el, {
  series: [{
    type: 'line',
    data: {
      x: new Float64Array([0, 1, 2]),
      y: new Float64Array([1, 3, 2]),
    },
  }],
});
```

**多图表共享设备模式（≥3 图表推荐）：**

```ts
import { ChartGPU, createPipelineCache, connectCharts } from '@chartgpu/chartgpu';

const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
const device = await adapter.requestDevice();
const pipelineCache = createPipelineCache(device);
const ctx = { adapter, device, pipelineCache };

const a = await ChartGPU.create(document.getElementById('a')!, { /* series */ }, ctx);
const b = await ChartGPU.create(document.getElementById('b')!, { /* series */ }, ctx);
const c = await ChartGPU.create(document.getElementById('c')!, { /* series */ }, ctx);

// 跨图表 zoom 同步
connectCharts([a, b, c], { syncZoom: true });
```

`pipelineCache` 缓存了 WebGPU Shader Module 和 Pipeline 对象，避免重复编译，是多图表共享设备时性能优异的关键。

### 2.2 数据流与采样

ChartGPU 在数据处理上做了精细的分层：

**CPU 端采样**：LTTB（ Largest Triangle Three Buckets）采样在 CPU 侧执行，减少传输到 GPU 的顶点数；也支持 min/max 采样保留极值。

**GPU 端下采样**：对于 `eligible line series`，下采样直接在 GPU 着色器中完成，充分利用 GPU 并行能力。

**环形缓冲区（流式数据）**：

```ts
// 追加数据，maxPoints 限制最大点数，超出则 FIFO 丢弃旧数据
const x = new Float64Array([3, 4, 5]);
const y = new Float64Array([2.5, 2.1, 2.8]);
chart.appendData(0, { x, y }, { maxPoints: 50_000 });
```

3D 图表（heatmap、surface3D）使用专用的 `updateHeatmap` / `updateSurface3D` API 而非全量 option 重写，减少 GC 压力。

### 2.3 性能优化策略

从 `package.json` 的测试用例命名可以看出 ChartGPU 对性能的重视程度：

- `acceptance:sampling-config` — 采样配置验证
- `acceptance:auto-scroll-policy` — 实时滚动策略
- `acceptance:auto-scroll-zoom-sync` — 滚动与缩放联动
- `benchmark:render` — 渲染性能基准测试
- `benchmark:baseline:compare` — 与 ECharts 等库的对标测试

性能文档（[chartgpu.io/docs/performance](https://chartgpu.io/docs/performance/)）详细覆盖了：密度控制、采样策略、多图表 GPU 共享、外部渲染模式（`setRenderMode('external')` + 手动 `renderFrame()`）。

## 三、安装与快速开始

**环境要求：**

- Node.js / Bun
- 支持 WebGPU 的浏览器（Chrome/Edge 113+、Safari 18+、Firefox 145+ macOS / 114+ Windows）

**安装：**

```bash
npm install @chartgpu/chartgpu
# 或者 unscoped 版本
npm install chartgpu
# React 绑定
npm install chartgpu-react @chartgpu/chartgpu
```

**本地示例：**

```bash
npm install
npm run dev
# 访问 http://localhost:5173/examples 查看所有示例
```

## 四、使用方法与实战

### 4.1 基础折线图

```ts
const chart = await ChartGPU.create(document.getElementById('chart')!, {
  series: [{
    type: 'line',
    data: {
      x: new Float64Array([0, 1, 2, 3, 4]),
      y: new Float64Array([1, 3, 2, 5, 4]),
    },
  }],
});
```

### 4.2 实时数据流

模拟股价实时推送：

```ts
setInterval(() => {
  const now = Date.now() / 1000;
  chart.appendData(0, {
    x: new Float64Array([now]),
    y: new Float64Array([Math.random() * 100]),
  }, { maxPoints: 500 });
}, 100);
```

### 4.3 金融 K 线图

```ts
const chart = await ChartGPU.create(el, {
  series: [{
    type: 'candlestick',
    data: { x, open, high, low, close },
  }],
});
```

### 4.4 主题定制

内置 dark / light / custom 主题：

```ts
await ChartGPU.create(el, {
  theme: 'dark',
  series: [/* ... */],
});
```

详细主题配置： [chartgpu.io/docs/theming](https://chartgpu.io/docs/theming/)

## 五、常见问题

**Q: 浏览器不支持 WebGPU 怎么办？**

> ChartGPU 不提供 WebGL/Canvas 降级方案。建议在应用层通过 `navigator.gpu` 检测，不可用时展示友好的兜底提示，而不是留白画布。

**Q: 多图表共享设备有什么注意事项？**

> 推荐在 ≥3 个图表时使用共享设备模式，少于 3 个时独立设备反而更简单。共享设备时，图表销毁不会销毁共享的 `GPUDevice`。

**Q: 数据量特别大时如何优化？**

> 1. 优先使用 Float64Array 列式数据（比对象数组内存效率高）
> 2. 开启 LTTB 采样或 GPU 端下采样
> 3. 多图表共享 GPU 设备减少上下文切换开销
> 4. 参考官方 [Performance 指南](https://chartgpu.io/docs/performance/)

**Q: React 生态有官方集成吗？**

> 有，官方维护了 `chartgpu-react` 包（`npm i chartgpu-react @chartgpu/chartgpu`）。

## 六、总结

ChartGPU 是一个面向未来的图表库，选择 WebGPU 而不是成熟的 WebGL/Canvas 方案，意味着它押注的是浏览器图形计算的下一站。对于需要处理**超大数据量**（百万级点以上）、**高刷新率实时流**、**多图表联动**的可视化场景，ChartGPU 的技术选型非常精准。零依赖 + MIT 协议也让它适合嵌入任何商业项目。

如果你正在构建数据监控大盘、实时交易界面或科学可视化平台，ChartGPU 值得一试。

> 🌐 官网 & 演示：[chartgpu.io](https://chartgpu.io)
> 📖 文档：[chartgpu.io/docs](https://chartgpu.io/docs/)
> ⭐ GitHub：[github.com/ChartGPU/ChartGPU](https://github.com/ChartGPU/ChartGPU)
