---
title: "Photo Abstract Editorial：将照片转化为摄影与抽象记忆面板的编辑作品"
date: "2026-08-13"
description: "Photo Abstract Editorial 是一个开源 Codex Skill，能够将任意照片转化为「原始摄影区 + 抽象记忆面板 + 诗意英文标题」的竖向编辑作品，保留照片真实内容的同时，从空间关系、构图节奏和色彩关系中提炼出极简抽象面板。"
author: "Cheman"
slug: photo-abstract-editorial
draft: false
categories: ["AI", "开源", "图像处理"]
tags: ["GitHub", "AI Art", "图像生成", "Codex Skill", "Prompt Engineering"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Photo Abstract Editorial**，它是一个将照片转化为「原始摄影区 + 抽象记忆面板 + 诗意英文标题」的竖向编辑作品的 Codex Skill——保留照片的真实内容，并仅从照片本身提炼空间关系、构图节奏和色彩关系；它不是滤镜、照片重画或风格迁移。

## 一、项目概述

Photo Abstract Editorial 由开发者 **ZzzLc0405** 创建，是一个专注于「图像再创作」的 Prompt Engineering 项目。它的核心思路非常清晰：**上传一张照片 → AI 生成一张由「真实摄影区」和「抽象记忆面板」组成的竖版编辑图**。

### 核心特性

- **双区结构**：成品图分为上下或左右两部分，上部/左侧保留原图摄影区域，下部/右侧为由原图关系推导出的极简抽象面板
- **诗意英文标题**：成品中包含一个原创英文标题（可选副标题），增强作品的叙事感
- **内容溯源原则**：抽象面板中的每个重要元素都能追溯到原照片中真实存在的空间、色彩或结构事实，确保抽象不脱离现实
- **双语言 Prompt**：Skill 提供了完整的中英文两版提示词，方便不同语言背景的用户使用

### 项目结构

```
photo-abstract-editorial/
├── SKILL.md                          # Skill 工作流程与约束
├── agents/openai.yaml                # Codex 界面元数据
├── references/
│   ├── photo-abstract-editorial-prompt.zh-CN.md  # 中文版完整提示词
│   └── photo-abstract-editorial-prompt.en.md     # 英文版完整提示词
└── assets/examples/                 # 示例图片（5张）
```

## 二、技术原理

### 核心设计理念：关系优先于形象

与常见的图像滤镜或风格迁移不同，Photo Abstract Editorial 遵循两条核心设计原则：

1. **上传照片始终是唯一内容来源**：照片区域不应被重画、扩展或改写，保持100%的真实性
2. **抽象面板完全从照片关系中推导**：每个色块、线条、形状都与原图的空间布局、色彩分布或构图节奏一一对应

这种「抽象来自照片关系」的方法论借鉴了现代抽象艺术的核心思想——塞尚、康定斯基以来的「从具象中提炼本质关系」传统，在 AI 图像生成领域找到了新的表达路径。

### 抽象形式的选择

Skill 允许混合使用以下抽象形式：

- **色块（Color Blocks）**：从照片主色调中提取的大面积色域
- **柔和有机质量（Soft Organic Masses）**：从照片轮廓中提炼的流动形状
- **弧形笔触（Arc Strokes）**：从照片线条中抽象出的曲线语言
- **短条（Short Bars）**：从照片结构中提取的节奏单元
- **层叠色带（Layered Color Bands）**：从照片纵深关系中抽象出的平行层次
- **简化建筑质量（Simplified Architectural Qualities）**：从照片空间结构中提炼的几何语言
- **细线（Fine Lines）**：从照片细节中提取的精致线条
- **点状标记（Dot Marks）**：从照片质感中抽象出的点阵语言

### Prompt 工程的关键技巧

Skill 的提示词设计包含以下关键技巧：

- **色彩提取策略**：从原图中提取5-7种主色，映射到抽象面板的调色板
- **构图比例控制**：定义摄影区与抽象区的比例（如 1:1、4:3 等）
- **材质约束**：明确抽象面板使用何种材质语言（油画、版画、矢量图形等）
- **情绪映射**：将照片传达的情绪通过抽象语言的密度、对比度、色温来表达

## 三、安装与快速开始

### 环境要求

- [Codex](https://codex.ai/) 账号（支持 AI 图像生成能力）
- 或者支持图像生成的 AI 对话平台（如 Claude、DALL-E 等，需将提示词适配到对应平台）

### 安装步骤

**方法一：直接作为 Codex Skill 使用（推荐）**

1. 将整个 `photo-abstract-editorial` 文件夹复制到你的 Codex skills 目录，例如：
   ```bash
   git clone https://github.com/ZzzLc0405/photo-abstract-editorial.git
   mv photo-abstract-editorial ~/.codex/skills/
   ```
2. 开启新的 Codex 对话，上传一张希望处理的照片
3. 直接提出需求：
   > 使用 `photo-abstract-editorial` 将这张照片制作成摄影与抽象面板组合的编辑作品

**方法二：直接使用 Prompt 文件**

如果你不使用 Codex，可以直接打开以下文件获取完整提示词：

- 中文版：`references/photo-abstract-editorial-prompt.zh-CN.md`
- 英文版：`references/photo-abstract-editorial-prompt.en.md`

将这些提示词复制到支持图像生成的 AI 平台（如 Midjourney、DALL-E、Stable Diffusion）即可使用。

## 四、使用方法与实战

### 基础用法

1. 拍摄或选择一张照片（原图需为本人拍摄，尊重版权）
2. 上传到支持 AI 图像生成的平台
3. 粘贴 Skill 提供的完整提示词
4. 根据需要调整以下参数：

| 可调整参数 | 说明 | 默认值 |
|-----------|------|--------|
| 照片与面板比例 | 摄影区与抽象区的高度占比 | 1:1 |
| 颜色 | 可修改象牙色面板背景、照片提取色的饱和度 | 5-7色 |
| 抽象形式 | 从8种形式中选择或组合 | 色块 + 弧形笔触 |
| 抽象程度 | 从「关系优先」到「保留身份特征」 | 中等 |
| 标题 | 英文标题，是否加副标题 | 英文标题 |

### 进阶用法：版式定制

```markdown
# 定制示例1：横向大幅版式
照片:面板 = 3:1
抽象形式: 细线 + 层叠色带
色温: 暖色
标题: 长标题，带副标题

# 定制示例2：竖向密集版式
照片:面板 = 1:2
抽象形式: 简化建筑质量 + 点状标记
色温: 冷色
标题: 短标题，无副标题
```

### 实际项目示例

以一张城市建筑照片为例：

1. 原图：城市天际线，日落时分
2. 抽象面板推导：
   - 色块：天空的橙红色→暖调色带；建筑的灰蓝色→垂直细线
   - 构图节奏：天际线的起伏→波浪形色带
   - 空间关系：前景建筑剪影→底部黑色块
3. 最终成品：上方保留完整的城市天际线照片，下方是由橙红色波浪色带 + 灰蓝色垂直细线 + 底部黑色块组成的抽象记忆面板，整体传达「现代都市在黄昏中的宁静与张力」的情绪

## 五、常见问题与解决方案

**Q: 抽象面板和原图完全没关系怎么办？**
A: 检查 Prompt 中的色彩提取部分是否正确指向了原图，确保「每个抽象元素都能追溯到原照片中真实存在的空间、色彩或结构事实」这一原则被严格执行。可以在 Prompt 中加入更具体的原图描述词。

**Q: 生成结果不满意，如何调整？**
A: 优先调整「抽象程度」参数（向「保留身份特征」方向调整），让 AI 在抽象时有更多具象线索可以参考；同时可以尝试不同的「抽象形式」组合。

**Q: 是否支持批量处理？**
A: Codex Skill 本身为单次交互设计。如需批量处理，可将 Prompt 封装为 API 调用，配合脚本批量执行。但需注意版权问题，确保原图均为本人拍摄。

**Q: 生成的编辑作品可以商用吗？**
A: 根据项目 README 声明：**仅限个人、教育和非商业用途**。商业使用需提前获得作者授权。使用时请注明来源并 @AM.（作者）。

## 六、总结

Photo Abstract Editorial 提供了一种独特的图像创作方法论——它不追求让 AI「画一张好看的图」，而是让 AI「翻译一张照片」，将照片中的空间、色彩、构图关系「转译」为抽象语言。这种「关系优先」的思路让它的输出既保留了摄影的真实性，又获得了抽象艺术的表达自由度。

如果你对 Prompt Engineering、AI 图像创作或摄影艺术感兴趣，这个项目值得深入研究；即便不直接在 Codex 中使用，参考其提示词的设计思路也能为其他图像生成场景带来启发。

> ⚠️ **使用提醒**：本 Skill 生成的编辑作品仅供个人、教育用途，商业使用需联系作者授权。原图请使用本人拍摄的照片，尊重版权。
