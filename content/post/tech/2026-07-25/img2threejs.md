---
title: "img2threejs：将一张图片重建为可交互的 Three.js 3D 模型"
date: "2026-07-25"
description: "img2threejs 是一个 AI Agent 驱动的图片转 3D 模型工具，通过多阶段渐进式管线将单张参考图重建为代码生成的 Three.js 程序化模型，支持动画骨骼、可交互关节，代码可审计、模型可 diff。"
author: "Cheman"
slug: img2threejs
draft: false
categories: ["技术", "开源", "AI"]
tags: ["Three.js", "AI", "3D", "GitHub Trending", "开源"]
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
ShowWordLength: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个有意思的项目：**img2threejs**，它能将任意物体的参考图片通过 AI Agent 重建为一段 TypeScript 代码，运行后在浏览器中渲染出可 360° 交互的 Three.js 3D 模型——不是笨重的 mesh 文件，而是精炼的程序化建模代码，token 效率极高。

## 一、项目概述

img2threejs 解决了一个长期痛点：如何把一张产品图或照片快速变成可嵌入网页的 3D 模型？传统方案（Photogrammetry、MeshLab 提取、商业 DCC 工具）要么需要几十张图片、要么依赖厚重软件、要么导出的资产无法动画。img2threejs 的答案是：**纯代码生成 + AI 视觉把关**，你在 Claude Code 或 OpenCode 里发一条指令，它就帮你一步步雕出来。

核心特性：
- **单图输入**：只需一张参考图，无需多视角
- **程序化建模**：输出的是 TypeScript `THREE.Group` 工厂函数，而非二进制 mesh
- **多阶段管线**：blockout → structural → form → material → surface → lighting → interaction → optimization，每步由 AI 视觉审核
- **动作就绪**：模型暴露 `root.userData.sculptRuntime`（pivots、sockets、colliders），可直接接动画系统
- **严格质量门**：detailInventory 枚举所有细节特征，AI 视觉打分低于阈值就拒绝进入下一阶段
- **角色管线**：v1.2 新增人形角色生成器，基于解剖学比例模板

Live Demo Gallery 中展示了索尼耳机、猎枪、士巴茵斧、哆啦A梦小屋、战车、皇冠宝箱等十多个模型，全部是代码生成、浏览器内运行。

## 二、技术原理

### 2.1 分阶段渐进生成管线

```
Reference image
    ↓
Probe（图像元数据检查） + Suitability Gate
    ↓
Pre-Spec Assessment（分类：object/character/hybrid，复杂度评分，质量契约）
    ↓
Author ObjectSculptSpec（组件树、材质、重复系统、socket）
    ↓
Strict-Quality Gate（规格不够深则打回重写）
    ↓
Locked Build Pass（每个 pass 只生成当前解锁部分）
    ↓
Render + Screenshot + Comparison Sheet
    ↓
Agent Vision Review（AI 视觉打分）
    ↓
Self-Correction（refine-spec / refine-code）→ 循环或继续
    ↓
Animation-Ready Three.js Model
```

核心设计哲学：**脚本做确定性的校验和编排，AI 只在最需要判断力的地方出手**（看渲染对比图决定 pass/fail）。

### 2.2 detailInventory 质量门

在代码生成前，AI 必须枚举对象的"身份定义细节"——高光/倒角/螺丝/雕刻线/磨损等。每一项必须映射到具体组件或材质条目，否则被质量门拦住。这从根本上避免了"生成的模型缺少关键细节但 AI 自以为通过"的问题。

关键数据结构（`ObjectSculptSpec` 的一部分）：
```json
{
  "detailInventory": [
    { "id": "gloss_surface", "zone": "lid_top", "threshold": 0.8 },
    { "id": "bevel_edge", "zone": "rim", "threshold": 0.75 },
    { "id": "screw_fastener", "zone": "back_panel", "threshold": 0.9 }
  ]
}
```

### 2.3 Three.js 程序化建模模式

生成的工厂函数模式：
```typescript
export function createLootChestModel(
  spec: ObjectSculptSpec,
  options?: ModelOptions
): THREE.Group {
  const root = new THREE.Group();
  root.userData.sculptRuntime = {
    pivots: [],
    sockets: [],
    colliders: [],
    destructionGroups: []
  };

  // blockout pass
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  );
  root.add(box);

  // structural pass → adds bevel geometry
  // material pass → PBR from extract_pbr_evidence
  // ... each pass is isolated and reviewable
  return root;
}
```

这种结构让每个 pass 的输出完全独立，AI 只需关注当前这一个 pass 的渲染质量，而非整段代码的累计效果。

### 2.4 Token 高效性

对比传统方案（反复让 AI 读取完整模型代码、像素级评分），img2threejs 的 token 节省来自：
- 确定性脚本处理校验/门控/截图/对比图打包，AI 只做视觉判断
- 每个 pass 只生成当前解锁部分，无冗余重写
- 失败前置（strict-quality gate 在代码生成前就拦截浅规格）

详见 `docs/TOKEN_COST.md` 的分阶段 token 消耗分析。

## 三、安装与快速开始

### 环境要求

- Python 3.10+（纯标准库，无任何 pip 依赖）
- Node.js / npm（运行 Three.js 演示）
- Claude Code / Codex / OpenCode（运行 Agent 管线）

### 安装

```bash
# 克隆技能到你的 skills 目录
git clone https://github.com/hoainho/img2threejs.git ~/.claude/skills/img2threejs
```

### 使用流程

在 Claude Code 中，附加或指向一张物体图片，然后：

```
/img2threejs Rebuild this object as a Three.js model, keep the proportions, angles, and colours.
```

AI 会按管线逐步验证、生成、渲染、对比，直到视觉评分达标。

### 手动脚本（可选）

```bash
# Stage 1: 探测图像
python3 forge/stage1_intake/probe_image.py <image>

# Stage 2: 预评估
python3 forge/stage2_spec/new_pre_spec_assessment.py "ObjectName" --image <image> --out assessment.json

# Stage 3: 生成规格
python3 forge/stage2_spec/new_sculpt_spec.py "ObjectName" --image <image> --assessment assessment.json --out spec.json

# Stage 4: 严格质量验证
python3 forge/stage2_spec/validate_sculpt_spec.py spec.json --strict-quality

# Stage 5: 生成 Three.js 工厂
python3 forge/stage3_build/generate_threejs_factory.py spec.json --out src/createObjectModel.ts
```

## 四、使用方法与实战

### 4.1 硬表面物体（推荐起点）

索尼 WF-1000XM3 耳机的生成过程：
1. 上传耳机 + 充电盒参考图
2. detailInventory 枚举：高光面板、磨砂质感、USB-C 接口、铰链
3. 各 pass 逐步渲染对比，AI 视觉审核
4. 最终生成含铰链 pivot、充电盒闭合动画骨架的模型代码

在线体验：https://hoainho.github.io/img2threejs-showcase/#/demo/sony-wf1000xm3

### 4.2 人形角色（v1.2+）

人物重建路由：解剖学比例头单元、面部地标、姿态检测。流程：
1. `build_detail_inventory.py` 将参考图分区，构建 detailInventory
2. `extract_landmarks.py` 叠加地标网格，生成解剖学块
3. `solve_camera_pose.py` 相机匹配渲染角度
4. 渐进 pass 生成 SkinnedMesh-ready 模型

### 4.3 最大相似度模式（v1.3 规划）

单图无法保证 100% 相似度，投影优先路径会：
- 从图像地标拟合参数化模板
- 去光照、相机匹配、投影纹理
- 报告每区域置信度，低于阈值时请求更多视角

## 五、常见问题

**Q: 单张图生成效果不如多视角重建？**
A: 是的，img2threejs 明确承认这一局限。背面/遮挡面通过镜像可见面推断，非精确几何。对于硬表面物体效果最好，人物偏风格化重建。

**Q: 生成代码报错 `THREE is not defined`？**
A: 确保目标环境已 `import * as THREE from 'three'`。工厂函数本身不含 Three.js import，依赖调用方注入。

**Q: 质量门一直拒绝，说 detailInventory 不完整？**
A: 这是设计行为。重新审视物体，枚举出所有视觉上可分辨的小细节（倒角、缝隙、螺丝、磨损），直到 detailInventory 能覆盖参考图的所有特征区域。

**Q: 硬表面物体生成失真？**
A: 检查参考图分辨率和光照均匀度。img2threejs 依赖 AI 视觉审核，图像质量直接影响输出质量。

**Q: 如何自定义材质？**
A: `createObjectModel.ts` 接受 `options` 参数覆盖材质属性，或直接编辑生成的 TypeScript 中的 `MeshStandardMaterial` / `MeshPhysicalMaterial` 参数。

## 六、总结

img2threejs 代表了一种全新的 3D 资产生成范式：**不是 AI 直接"画出"模型，而是 AI 做视觉把关、脚本做工程编排，最终产出的是完全可控的程序化建模代码**。这种设计让它在 token 效率、代码可审计性、动画就绪度上远胜于传统 mesh 导出方案。如果你需要为网页、产品展示或游戏快速原型化 3D 模型，这个工具值得关注。

- GitHub：https://github.com/img2threejs/img2threejs
- Live Demo：https://hoainho.github.io/img2threejs-showcase/
