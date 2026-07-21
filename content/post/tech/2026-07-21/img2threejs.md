---
title: "img2threejs: 一张图片重建可交互的 Three.js 3D 模型"
date: 2026-07-21
description: "img2threejs 是一个 AI 驱动的 3D 重建工具，只需提供一张物体参考图，即可自动生成代码级的 Three.js 模型，支持硬表面物体和角色两类重建路径，带有动画层级和交互能力。"
author: "Cheman"
slug: img2threejs
draft: false
categories: ["技术", "开源", "前端"]
tags: ["Three.js", "AI", "3D建模", "TypeScript", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**img2threejs**，它能根据一张普通图片，用 AI 自动重建出可交互的 Three.js 3D 模型——不是生成 mesh 文件，而是直接输出 TypeScript 代码。

## 一、项目概述

**img2threejs** 是一个基于 AI Agent 的 3D 重建流水线，核心思路是"代码优先"而非"模型优先"。传统 3D 重建依赖 photogrammetry 或 mesh 提取，而 img2threejs 走的是**程序化建模（Procedural Modeling）**路线：你给它一张图，它用 Claude Code / Codex 等 Agent 的视觉能力分析物体结构，然后逐步生成 Three.js 几何体代码，最终输出一个 `THREE.Group` 工厂函数。

### 核心特性

- **代码级输出**：生成的不是一个二进制 mesh 文件，而是一段 TypeScript 代码，可 diff、可版本控制、易于修改
- **分步生成（Build Passes）**：严格按 `blockout → structural → form-refinement → material → surface → lighting → interaction → optimization` 的顺序分阶段生成，每阶段都有视觉对比审核
- **两类重建路径**：
  - **硬表面物体（Hard-surface Object）**：如耳机盒、枪械、工具等有明确几何结构的物体
  - **角色（Character）**：基于解剖学比例模板的人形重建路径（v1.2 起支持）
- **Token 高效**：大量验证、门控、截图对比等机械工作由 Python 脚本处理，AI Token 只用于视觉判断和代码生成
- **零依赖**：脚本全部是纯 Python 3.10 标准库，无需 pip 安装任何包

## 二、技术原理

### 流水线架构

项目采用"脚本门控 + Agent 视觉判断"的混合架构。流程如下：

```
参考图 → 探针检测(suitability gate) → 预评估(class, complexity, quality contract)
→ 编写 ObjectSculptSpec → 严格质量门控 → 分步生成 Three.js 代码
→ 浏览器渲染 + 截图对比 → Agent 视觉评分 → 通过则解锁下一阶段
```

核心脚本位于 `forge/` 目录下：

| 脚本 | 作用 |
|---|---|
| `stage1_intake/probe_image.py` | 检查图片元数据，判定是否适合 3D 重建 |
| `stage2_spec/new_pre_spec_assessment.py` | 分类（object/character/hybrid）、评估复杂度、生成质量契约 |
| `stage2_spec/new_sculpt_spec.py` | 根据评估结果编写 ObjectSculptSpec JSON |
| `stage2_spec/validate_sculpt_spec.py --strict-quality` | 严格质量门控，浅层 spec 一律拦截 |
| `stage3_build/generate_threejs_factory.py` | 为当前解锁的 pass 生成 Three.js 工厂代码 |
| `stage4_review/make_comparison_sheet.py` | 打包一张参考图 vs 渲染图的对比图供 Agent 审核 |
| `stage4_review/append_review.py` | 记录每轮审核的评分、决策和证据 |

### 质量门控机制

img2threejs 有一套严格的门控体系，这是它区别于简单"贴图生成 3D"方案的关键：

1. **Suitability Gate**：判断这张图是否具备 3D 重建的基础条件
2. **Strict-quality Gate**：在生成任何代码之前，ObjectSculptSpec 必须足够详细——复合物体不允许用单根 spec 糊弄
3. **Screenshot Feedback**：每个 pass 的"继续"必须有渲染图 + 对比图 + Agent 视觉评分达标
4. **Attachment Correctness**：子部件（把手、肢干等）必须声明如何连接到父级，杜绝"漂浮"现象
5. **Runtime Hierarchy**：最终模型通过 `root.userData.sculptRuntime` 暴露节点、插座、碰撞体和销毁分组，保证动画就绪

### 材质与光照

材质走独立 PBR 通道（roughness / metalness / normal / emissive），光照使用真实灯光而非"把颜色直接贴到粗糙度通道"这种偷懒做法。代码生成器每次只输出当前解锁 pass 的内容，不重复生成已完成的部分。

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- Node.js / npm（用于运行 Three.js 演示）
- Claude Code / Codex / OpenCode 等支持 Agent 视觉的工具
- （可选）GitHub Personal Access Token（私有仓库或提高 API 限流）

### 安装步骤

```bash
# 克隆到 skills 目录
git clone https://github.com/hoainho/img2threejs.git ~/.claude/skills/img2threejs
```

### 最简运行

在 Claude Code 中附加一张物体图片，然后运行：

```
/img2threejs Rebuild this object as a Three.js model, keep the proportions, angles, and colours.
```

Agent 会自动执行完整的流水线：验证 → 写 Spec → 分步生成 → 渲染对比 → 视觉审核，直到模型达到质量阈值。

也可以直接用脚本手动跑各阶段：

```bash
# Stage 1: 探针
python3 forge/stage1_intake/probe_image.py your-image.png

# Stage 2: 预评估
python3 forge/stage2_spec/new_pre_spec_assessment.py "MyObject" --image your-image.png --out assessment.json

# Stage 3: 写 Spec
python3 forge/stage2_spec/new_sculpt_spec.py "MyObject" --image your-image.png --assessment assessment.json --out spec.json

# 质量门控
python3 forge/stage2_spec/validate_sculpt_spec.py spec.json --strict-quality

# Stage 4: 生成代码
python3 forge/stage3_build/generate_threejs_factory.py spec.json --out src/createMyObjectModel.ts
```

## 四、使用方法与实战

### 硬表面物体示例

以索尼 WF-1000XM3 耳机盒为例，项目 showcase 中提供了[完整的在线演示](https://hoainho.github.io/img2threejs-showcase/#/demo/sony-wf1000xm3)。流水线会依次重建：

1. **Blockout**：盒体大轮廓（尺寸和比例正确）
2. **Structural**：充电仓开盖铰链、耳机槽位
3. **Form Refinement**：圆角、Type-C 接口凹槽、指示灯开孔
4. **Material**：主体磨砂塑料、耳塞软胶反光、金属充电触点
5. **Surface**：logo 浮雕、缝隙线、CMF 色彩差异
6. **Lighting**：环境光 + 柔光箱方向光
7. **Interaction**：旋转轨道控制
8. **Optimization**：合并几何体减少 draw call

### Character 重建（人形角色）

对于角色图像，流水线会先调用 `stage1_intake/extract_landmarks.py` 标注解剖学地标（头部比例单元、眼距、肩宽等），然后走 anatomy-aware track。v1.3 规划了 likeness maximization 路径，用投影将参考图映射到参数化模板上，并给出逐区域置信度报告。

### 调试技巧

- 某个 pass 评分不通过时，Agent 会选择 `refine-spec`（改规范）或 `refine-code`（改代码），不会盲目重跑
- 查看 `forge/stage4_review/` 下的历史审核记录，了解每个 pass 的决策依据
- `--strict-quality` 是关键flag，不加的话会放过大量浅层 spec

## 五、常见问题与解决方案

**Q: probe_image.py 报错 "image too small"**
A: 分辨率至少 512x512，建议 1024x1024 以上。截图尽量干净背景、高对比度。

**Q: strict-quality 门控一直拦截 spec**
A: 说明当前 spec 深度不够。需要补充更多 detail inventory，特别是 identity-defining 的细节（倒角、螺丝、凹槽、刻线等），参考 `grimoire/intake/detail_inventory.md` 的 taxonomy。

**Q: 生成的角色模型不像本人**
A: 单张图片本身无法保证 100% 相似度，流水线会给出逐区域置信度，低于阈值的区域会提示补充更多视角。v1.3 的 likeness maximization 路径会有所改善。

**Q: 浏览器渲染截图空白**
A: 检查 Three.js 版本兼容性，确保 `three` 包已正确 import。某些几何体构造方式在新版 Three.js 有 breaking change。

**Q: 代码生成超时**
A: 降低 pass 复杂度，把细节拆分到多个 pass。也可以调低视觉评分的阈值（在 `_shared/feature_acceptance_policy.py` 中）。

## 六、总结

img2threejs 真正有意思的地方在于它重新定义了"AI 3D 重建"的边界——不是追求生成一个模糊的 mesh，而是**用代码精确描述几何结构**，同时靠 Agent 视觉保证了重建质量。对于需要程序化 3D 模型（比如游戏资产批量生成、产品原型可视化、数据可视化图表 3D 化）的开发者来说，这个工具链非常值得一试。目前 v1.2 已支持角色重建，v1.3 的 likeness maximization 和 v1.4 的动画 rigging 也在路线图上。
