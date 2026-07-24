---
title: "video-shotcraft：将 AI 变成影视级产品视频工作室"
date: 2026-07-24
description: "video-shotcraft 是一个基于 Remotion 的 AI Agent 技能，让 Claude Code 或 Codex 化身影视工作室，通过 106 个镜头配方卡、162 种风格和完整的「Ink Press」视频模板，轻松制作 Cinematic 产品宣传视频。"
author: "Cheman"
slug: video-shotcraft
draft: false
categories: ["技术", "开源"]
tags: ["Remotion", "AI", "视频生成", "产品视频", "开源", "React"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**video-shotcraft**，一个将 AI 编程助手直接变成影视级产品视频工作室的 Agent 技能。它基于 [Remotion](https://www.remotion.dev/) 构建，给 Claude Code 或 Codex 装备上 106 张镜头配方卡、162 种运动风格和一套可直接投产的产品宣传视频模板，只需描述你的产品，几分钟内就能生成一部带真实页面捕捉、2.5D 镜头运动、节拍同步剪辑和电影级特效的宣传片。

## 一、项目概述

**video-shotcraft** 由开发者 [Vincentwei1021](https://github.com/Vincentwei1021/video-shotcraft) 开源，是一个专为 AI 编程 Agent（Claude Code / Codex）设计的视频创作技能包。它的核心目标是：**让 AI 不是简单生成视频，而是按照专业的影视制作方法论来工作**——包括分镜策划、镜头实现、声音设计和最终品控。

### 核心特性

| 内容 | 数量 | 说明 |
| --- | --- | --- |
| 镜头配方卡（Shot Recipe Cards） | 106 张 | 包含目的、能量感、建议时长、参数、实现笔记和已知坑点 |
| 运动风格预览 | 162 种 | 可在 [在线 Gallery](https://vincentwei1021.github.io/video-shotcraft/) 搜索和预览 |
| Remotion 参考实现 | 全部 106 张 | 每个镜头卡都有调好 easing 和时序参数的 TSX 示例 |
| 完整视频模板 | 1 套 | Ink Press：36.2 秒、1920×1080、30fps、10 个镜头 |
| 通用组件与资产 | — | 2.5D 页面相机、字幕、闪切、数字滚动、SFX、截图脚本 |
| 生产方法论文档 | — | 截图、视觉方向、分镜、声音设计、节拍同步、最终 QA 全流程 |

项目的在线 Gallery 非常实用，可以按风格筛选、切换变体，并直接复制镜头卡名称供 AI 使用。

### 内置的 Ink Press 模板

项目自带一套经过验证的完整模板——**Ink Press**，36.2 秒、1920×1080、30fps、10 个镜头，采用纸-墨-琥珀色调，包含：

- 2.5D 真实页面相机运动
- 标题卡（Title Card）
- 过渡转场
- 全程固定的电影级 SFX 处理

作者做了一个 Demo——Gallery 38 秒 intro，本身就是用这个技能制作的。直接告诉 AI：`Use video-shotcraft to make a promo for my product with the Ink Press template.`，AI 会自动将你的产品截图、文案和品牌替换进去，复现同等质量的成片。

## 二、技术原理

### 架构设计

video-shotcraft 本质上是一套 **结构化镜头语言库 + Remotion 运行时**。整体架构分为三层：

```
┌─────────────────────────────────────────┐
│  Agent（Claude Code / Codex）            │  ← 理解自然语言需求，调度镜头卡
├─────────────────────────────────────────┤
│  Shot Recipe Cards（106 张）             │  ← 镜头配方：目的、参数、时序、已知坑点
│  + Sequences（序列结构）                 │  ← 可复用的全视频结构模式
├─────────────────────────────────────────┤
│  Remotion 运行时（TSX 组件）            │  ← 每个镜头卡的参考实现，含实际参数
└─────────────────────────────────────────┘
```

### 核心技术栈

- **[Remotion](https://github.com/remotion-dev/remotion)**：React 驱动的视频渲染框架，所有镜头卡都用 TypeScript/TSX 实现，确保参数可直接复制使用
- **React + TypeScript**：组件化封装 2.5D 相机、特效、字幕等原子能力
- **在线 Gallery**：静态站点展示所有 161 个运动预览，搜索/筛选/变体切换功能
- **截图脚本**（`assets/scripts/`）：自动化捕获目标产品页面资产

Remotion 采用特殊的许可证策略：个人和小团队免费，公司可能需要付费许可，使用前请注意阅读其 [LICENSE](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。

### 关键镜头配方结构

每张 Shot Recipe Card 的结构如下（以 `spotlight-hero-card` 为例）：

```typescript
// demos/spotlight-hero-card.tsx
import { AbsoluteFill } from "remotion";
import { spotlightHero } from "../assets/lib/spotlight";

export const SpotlightHeroCard: React.FC<{
  productImage: string;
  headline: string;
  duration?: number;
}> = ({ productImage, headline, duration = 60 }) => ({
  purpose: "High-impact product close-up with dramatic lighting",
  energy: "bold",         // bold | calm | dynamic | minimal
  duration,               // frames @ 30fps
  params: {
    lightColor: "#ffffff",
    shadowIntensity: 0.7,
    cameraEase: [0.25, 0.1, 0.25, 1],  // cubic-bezier
  },
  notes: "Avoid overexposure on reflective surfaces...",
});
```

AI 根据这段结构化描述，结合 Remotion 组件库组装出完整的视频序列。

### 2.5D 页面相机原理

项目的一大亮点是 2.5D 页面相机，能在产品截图上模拟真实的镜头运动：

```typescript
// assets/lib/camera-2d.ts
export const PageCamera: React.FC<{
  src: string;        // 截图 URL
  panX: number;       // 水平位移（百分比）
  panY: number;       // 垂直位移
  scale: number;      // 缩放倍数
  easing: number[];  // cubic-bezier 时序曲线
  duration: number;
}> = ({ src, panX, panY, scale, easing, duration }) => {
  // 使用 remotion 的 interpolate + useCurrentFrame 实现平滑运动
  const frame = useCurrentFrame();
  const transform = interpolate(frame, [0, duration], [
    `translate(0px, 0px) scale(1)`,
    `translate(${panX}px, ${panY}px) scale(${scale})`,
  ], { extrapolateRight: "clamp", easing: cubicBezier(...easing) });
  
  return (
    <div style={{ transform, overflow: "hidden" }}>
      <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};
```

### 节拍同步方法论

项目在 `references/music-beat-sync.md` 中详细记录了 BGM 节拍分析流程：通过音频波形分析定位节拍点（通常是 120BPM 的背景音乐），然后将镜头切换点精确对齐节拍，实现专业的「音乐卡点」效果。AI 在生成视频时会参考这一方法论自动安排镜头切换节奏。

## 三、安装与快速开始

### 环境要求

- Node.js 18+
- npm / yarn / pnpm
- Claude Code 或 Codex（或其他兼容 Agent）
- 可选：Remotion Studio（用于本地预览）

### 安装方式

**方式一：直接给 Agent 发链接（最简）**

在 Claude Code 或 Codex 中直接说：

```
Install this skill for me: https://github.com/Vincentwei1021/video-shotcraft
```

Agent 会自动克隆仓库并链接到 skills 目录。

**方式二：使用 skills CLI**

```bash
npx skills add Vincentwei1021/video-shotcraft
```

**方式三：手动安装**

```bash
git clone https://github.com/Vincentwei1021/video-shotcraft.git
cd video-shotcraft

# 链接到 Claude Code
ln -s "$(pwd)" ~/.claude/skills/video-shotcraft

# 或链接到 Codex
ln -s "$(pwd)" ~/.codex/skills/video-shotcraft
```

### 验证安装

```bash
# 查看技能目录结构
ls video-shotcraft/
# SKILL.md  references/  demos/  gallery/  template/  assets/
```

## 四、使用方法与实战

### 基础用法

安装完成后，直接用自然语言描述需求：

```
Use video-shotcraft to create a promo for my desktop product.
```

```
Use the deck-deal-flyin and row-embed shot cards to present this feature.
```

```
Design a product close-up inspired by spotlight-hero-card.
```

### 使用 Ink Press 模板（最可靠路径）

最快获得成品的方式——直接使用内置模板：

```
Use video-shotcraft to make a promo for my product with the Ink Press template.
```

AI 会自动将你的产品截图、App 截图、Logo、文案替换进模板，复现 Demo 中的同款质量。

### 进阶用法

**在 Gallery 挑选镜头卡**：先在 [Gallery](https://vincentwei1021.github.io/video-shotcraft/) 搜索满意的镜头效果，复制名称后再给 Agent：

```
Use video-shotcraft. Apply the deck-deal-flyin card for the feature reveal,
then row-embed for the detail shots. Style should match spotlight-hero.
```

**自定义模板**：参考 `template/` 目录的 Ink Press 实现，替换产品截图和文案：

```bash
cd video-shotcraft/template
# 替换 assets/ 下的产品截图
cp /your/product-shot.png assets/product.png
# 修改 content.json 中的文案
# 运行 Remotion 渲染
npx remotion render Scene out.mp4
```

### 完整制作流程

项目在 `references/pipeline.md` 中定义了端到端生产工作流：

```
1. Capture（截图）   → 用 assets/scripts/ 捕获产品页面资产
2. Visual Direction → 确定视觉风格（参考 shot cards 中的 aesthetic notes）
3. Storyboard       → 用 sequences/ 组合镜头卡，规划镜头顺序和时长
4. Implement        → Remotion 渲染每个镜头
5. Sound Design     → 选择 BGM，进行节拍同步（参考 music-beat-sync.md）
6. QA               → 对照 aesthetic-rules.md 做视觉品控
```

## 五、常见问题与解决方案

### Q1: Remotion 许可证需要付费吗？

Remotion 对个人和小团队免费。如果你在商业公司使用，建议查阅其 [官方许可证](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) 确认是否需要付费。

### Q2: 截图脚本无法捕获我的页面怎么办？

检查 `assets/scripts/` 中的截图脚本是否支持你的浏览器/系统。部分页面有反爬保护，可以手动截图后在 `assets/lib/` 中替换。

### Q3: 渲染出来的视频有内存溢出？

Remotion 渲染高分辨率（1920×1080）视频时内存消耗较大。建议：
- 分段渲染（每个镜头单独渲染后合并）
- 使用 `remotion render --序列` 时加上 `--concurrency=1` 减少内存占用
- 确保 Node.js 运行在 64 位模式下

### Q4: 如何让视频适配不同的分辨率？

Remotion 支持Composition 配置，可以在 `src/Root.tsx` 中注册多个不同分辨率的 Composition：

```typescript
const compositions = [
  { id: "1920x1080", width: 1920, height: 1080 },
  { id: "1080x1920", width: 1080, height: 1920 },  // 竖版
];
```

### Q5: AI 生成的视频风格不统一？

在使用 Agent 时，尽量在初始 prompt 中明确视觉风格关键词（如"纸-墨-琥珀色调"、"科技感深色主题"），并参考 `references/aesthetic-rules.md` 中的视觉 QA 标准给 AI 反馈。

## 六、总结

video-shotcraft 最有价值的地方不只是那 106 张镜头卡本身，而是**将专业影视制作方法论结构化封装为 AI 可理解的指令集**——从截图规范、视觉方向、分镜规划到节拍同步、QA 核查，每个环节都有文档和参数支撑。

对于需要批量制作产品视频的团队或个人开发者，这套工具链将**视频制作的成本从"专业团队数天"降低到"AI 驱动的分钟级"**，同时保持了相当的质量水准。特别是内置的 Ink Press 模板，几乎是开箱即用的最佳起点。

如果你对 AI + 视频创作感兴趣，或者正在探索 AI Agent 在创意领域的边界，video-shotcraft 绝对值得一试。
