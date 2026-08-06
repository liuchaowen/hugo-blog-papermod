---
title: "Dashi PPT Skill：让 AI Agent 为你生成可编辑的专业 PPT"
date: 2026-08-06
description: "一个专为职场人打造的 PPT Skill，将文档交给 AI Agent 后即可生成带编辑控制台的网页版 PPT，支持 12 套视觉主题、1020 个版式页面，并可一键导出为可编辑的 PPTX 文件。"
author: "Cheman"
slug: dashi-ppt-skill
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["GitHub", "PPT", "AI", "Agent", "办公效率"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Dashi PPT Skill**，一个真正适合职场人的 PPT Skill——把文档丢给 AI Agent，生成的每一页都自带编辑控制台，不满意的地方直接在浏览器里改，改完还能一键导出成真实的、可编辑的 PPTX。

## 一、项目概述

Dashi PPT Skill 是一个面向 AI Agent 的 PPT 生成技能包，核心特性包括：

- **12 套内置视觉主题**：覆盖炫光科技风、轻拟态风、深色图谱风、高能增长风等多种风格
- **1020 个版式页面**：每套主题独立的页面结构和视觉语言，包含封面、目录、指标、趋势、对比、流程、风险等 20 种页面角色
- **丰富的图表与分析模型**：雷达图、瀑布图、矩形树图、漏斗图、热力图、桑基图、甘特图，以及 SWOT、波特五力、PEST、商业模式画布等分析模型
- **自带编辑控制台**：生成后可通过滑杆、开关、下拉控件调整布局、模块数量、配色、页面重点
- **一键导出**：支持 HTML 离线包 / PDF / 可编辑 PPTX 三种格式

该项目支持 Claude Code、Codex、豆包、Marvis、Workbuddy、Dumate、Qclaw 等多个 AI Agent 平台，适合行业研究、融资复盘、竞品分析、趋势报告、项目汇报等场景。

## 二、技术原理

### 架构设计

Dashi PPT Skill 的核心架构分为三层：

1. **内容结构化层**：将用户输入的文档（Word、Markdown、PDF 等）解析为结构化内容，提取标题、要点、数据等元素
2. **版式匹配层**：根据内容类型（封面、目录、指标、流程等）从 1020 个版式中选择合适的模板
3. **渲染与导出层**：HTML 渲染引擎生成带控制台的网页版 PPT，导出引擎将 HTML 转换为可编辑的 PPTX

```
用户文档 → 内容结构化 → 版式匹配 → HTML渲染 → 控制台嵌入
                                      ↓
                               导出引擎 → PPTX/PDF
```

### 核心技术栈

- **Node.js 20+**：运行时环境，npm 包管理
- **HTML/CSS/JavaScript**：网页版 PPT 的渲染技术，支持动画和交互
- **Chrome/Chromium/Edge**：导出 PPTX/PDF 时依赖浏览器渲染引擎
- **AGPL-3.0 开源协议**：核心框架开源，导出引擎为专有组件

### 关键设计模式

#### 1. 内容与表现分离

每个页面由 **版式 + 文案字段** 构成，Agent 可以直接读取、修改、校验 HTML 结构，实现：

```javascript
// 示例：修改页面标题
page.title = "2026年度市场分析报告";
page.layout = "cover-01";  // 切换封面版式
page.theme = "theme05";     // 切换主题
```

#### 2. 控制台驱动编辑

每个页面附带控制台，包含 20+ 维度的编辑控件：

```javascript
// 控制台参数示例
{
  layout: "card-3col",      // 布局类型
  moduleCount: 4,           // 模块数量
  focusPoint: "growth",     // 页面重点
  palette: "cool-blue",     // 配色方案
  transition: "fade"        // 翻页动画
}
```

#### 3. 渐进式导出

导出引擎逐节点还原 HTML 结构，保持文字可编辑：

- 文本元素 → PPTX 文本框
- 图表 → PPTX 原生图表
- 媒体槽 → 图片占位符

### 数据流分析

```
[用户输入] 
    ↓
[AI Agent 解析需求] → 生成结构化内容大纲
    ↓
[Skill 版式匹配] → 选择主题和版式组合
    ↓
[HTML 渲染] → 生成带控制台的网页 PPT
    ↓
[用户编辑] → 控制台调整/文字编辑/媒体替换
    ↓
[导出引擎] → PPTX/PDF/HTML 离线包
```

## 三、安装与快速开始

### 环境要求

- Node.js 20+
- npm
- Chrome / Chromium / Edge（用于导出 PPTX/PDF）

### 安装步骤

**一键安装/更新**：

```bash
npx dashi-ppt-skill@latest
```

国内网络使用镜像：

```bash
npx --registry=https://registry.npmmirror.com dashi-ppt-skill@latest
```

让 AI Agent 帮你安装：

```
帮我安装 skill：npx dashi-ppt-skill@latest
```

### 最简运行示例

安装完成后，将 SKILL.md 文件放置在 Agent 可访问的位置，然后：

```
帮我用这个 skill 把这份文档生成一份 10 页的 PPT，
主题是"2026年市场趋势分析"，风格选炫光科技风
```

Agent 会自动：
1. 读取 SKILL.md 了解生成规则
2. 解析文档内容
3. 选择合适的版式组合
4. 生成 HTML 文件并启动本地预览
5. 你可以在浏览器中编辑、导出

## 四、使用方法与实战

### 基础用法

**场景：制作一份融资路演 PPT**

```
文档内容：[粘贴商业计划书内容]
需求：生成一份 15 页的融资路演 PPT，
      风格选"高能增长风"，
      需要包含：市场规模、商业模式、财务预测、团队介绍
```

生成后：
- 点击任意文字就地编辑
- 拖动滑杆调整模块数量
- 一键切换布局和配色

### 进阶用法

#### 1. 换主题和配色

```
整套换成"深蓝杂志风"，配色换成冷色调
```

#### 2. 换图表类型

```
第三页的柱状图改成雷达图
```

#### 3. 调整页面重点

```
第五页的重点从"增长率"改成"市场份额"
```

#### 4. 替换图片

- 点击图片占位符
- 选择本地图片上传（自动压缩）
- 或拖拽图片到占位符

### 实际项目示例

**行业研究报告 PPT**：

```
文档：[2026年AI行业研究报告 PDF]
需求：生成一份 20 页的行业研究报告 PPT，
      风格选"色谱图表风"，
      需要包含：市场规模、竞争格局、技术趋势、投资建议
```

生成时间约 3-5 分钟，生成后：
- 左侧缩略图拖拽重排页面
- 顶栏进入放映模式
- 一键切换明暗主题

**竞品分析 PPT**：

```
文档：[竞品分析文档]
需求：生成一份 10 页的竞品分析 PPT，
      风格选"冷白调研风"，
      需要包含：产品对比、用户画像、SWOT 分析
```

SWOT 分析版式会自动生成四象限图，可以：
- 拖动滑杆调整每个象限的项目数量
- 点击文字编辑内容
- 一键导出 PPTX

## 五、常见问题与解决方案

### 安装失败

**问题**：`npm install` 超时或失败

**解决方案**：
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npx dashi-ppt-skill@latest
```

### 无法导出 PPTX

**问题**：点击导出按钮无响应

**解决方案**：
1. 确认已安装 Chrome / Chromium / Edge
2. 设置环境变量指定浏览器路径：
```bash
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### 生成速度慢

**问题**：生成 20 页 PPT 耗时过长

**解决方案**：
- 减少 token 消耗：先让 Agent 生成大纲，确认后再展开
- 分批生成：先生成前 10 页，再追加后 10 页
- 使用更快的模型：Claude Code / Codex 速度较快

### 图片不显示

**问题**：PPT 中的图片占位符无法填入图片

**解决方案**：
- 检查图片格式（支持 JPG/PNG/GIF/WebP）
- 图片大小限制：单张不超过 10MB
- 上传时自动压缩，无需手动处理

### 配色不满意

**问题**：预设配色都不喜欢

**解决方案**：
- 每套主题内有多个配色方案可切换
- 可通过控制台调整局部配色
- 不支持完全自定义，这是有意为之：稳定的产出比自由的选色更重要

## 六、总结

Dashi PPT Skill 是一个真正为职场人设计的 PPT 生成工具，核心优势在于：

1. **AI Agent 原生**：无缝集成 Claude Code、豆包、Qclaw 等主流 Agent 平台
2. **生成后可编辑**：不是"生成就结束"，而是"生成才开始"——控制台、文字编辑、媒体替换让 PPT 成为真正的交付物
3. **导出真实 PPTX**：不是截图拼接，而是逐节点还原的可编辑 PPTX
4. **丰富的版式库**：12 套主题、1020 个版式、8576 个可调控件，覆盖绝大多数职场场景

适合需要快速形成结构完整、视觉统一、还能继续改的演示文稿的场景。对于需要逐像素手工定制视觉的场景，建议使用专业设计工具。

项目开源协议为 AGPL-3.0，导出引擎为专有组件，可免费使用。如需商业授权，请联系作者。
