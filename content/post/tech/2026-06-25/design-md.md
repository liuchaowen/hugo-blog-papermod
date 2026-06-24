---
title: "DESIGN.md：让 AI 编码助手理解你的设计系统"
date: 2026-06-25
description: "Google Labs 推出的 DESIGN.md 是一种用于向 AI 编码代理描述视觉识别的格式规范，通过机器可读的设计 Token 和人工可读的设计原理，让 AI 生成符合设计系统的 UI 代码。"
author: "Cheman"
slug: "design-md"
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 设计系统, Google]
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

今天在 GitHub Trending 上看到一个有意思的项目：**google-labs-code/design.md**，它试图解决一个非常前沿的问题——如何让 AI 编码助手真正理解并应用人类的设计系统。

## 一、项目概述

DESIGN.md 是 Google Labs 推出的一个格式规范，用于向 AI 编码代理（如 Claude、GPT、Cursor 等）描述视觉识别系统。它的核心思想是：将设计系统以结构化的方式写入一个 `DESIGN.md` 文件，AI 读取后即可生成符合该设计系统的 UI 代码。

**核心特性：**
- 结合机器可读的设计 Token（YAML front matter）和人工可读的设计原理（Markdown 正文）
- 提供 CLI 工具进行格式验证、版本对比和 Token 导出
- 内置 WCAG 对比度检查，确保生成的设计符合无障碍标准
- 支持与 Tailwind CSS、W3C Design Tokens 等格式互操作

## 二、技术原理

### 2.1 文件结构设计

DESIGN.md 的创新之处在于它用一套文件同时服务两种消费者：

| 层级 | 格式 | 消费者 | 作用 |
|:-----|:-----|:-------|:------|
| YAML front matter | 机器可读 | AI 编码代理 | 提供精确的设计 Token 值 |
| Markdown 正文 | 人工可读 | 人类设计师/开发者 | 解释设计决策的原因和应用方式 |

```md
---
name: Heritage
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
  body-md:
    fontFamily: Public Sans
    fontSize: 1rem
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
---

## Overview

Architectural Minimalism meets Journalistic Gravitas...
```

Token 提供规范值，正文提供应用上下文——AI 同时获得"是什么"和"怎么用"。

### 2.2 Token 类型系统

DESIGN.md 定义了一套类型安全的 Token 系统：

| 类型 | 格式 | 示例 |
|:-----|:-----|:------|
| Color | 任意 CSS 颜色 | `"#1A1C1E"`, `"oklch(62% 0.18 250)"`, `"rgb(26,28,30)"` |
| Dimension | 数字 + 单位 | `48px`, `-0.02em`, `1.5rem` |
| Token Reference | `{path.to.token}` | `{colors.primary}`, `{rounded.sm}` |
| Typography | 对象 | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` 等 |

Token 之间支持引用，形成依赖图：

```yaml
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 12px
```

### 2.3 Linter 架构

CLI 内置的 linter 运行 9 条规则，每条规则产生固定严重级别的结果：

| 规则 | 严重级别 | 检查内容 |
|:-----|:---------|:----------|
| `broken-ref` | error | Token 引用 `{colors.primary}` 无法解析 |
| `missing-primary` | warning | 定义了颜色但没有 `primary` |
| `contrast-ratio` | warning | 组件 `backgroundColor`/`textColor` 对比度低于 WCAG AA（4.5:1）|
| `orphaned-tokens` | warning | 定义了但未被任何组件引用的颜色 Token |
| `token-summary` | info | 各 Section 定义的 Token 数量汇总 |
| `missing-typography` | warning | 定义了颜色但没有字体 Token |

Linter 既可 CLI 调用，也可作为 TypeScript 库引入：

```typescript
import { lint } from '@google/design.md/linter';

const report = lint(markdownString);
console.log(report.findings);       // Finding[]
console.log(report.summary);        // { errors, warnings, info }
console.log(report.designSystem);   // 解析后的 DesignSystemState
```

### 2.4 导出管道

`export` 命令将 DESIGN.md Token 转换为其他格式：

```
DESIGN.md ──export──▶ Tailwind v3 JSON config
            ├──export──▶ Tailwind v4 CSS theme
            └──export──▶ W3C DTCG tokens.json
```

Tailwind v4 导出使用 CSS 自定义属性命名空间（`--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--spacing-*`），与 Tailwind v4 的 `@theme` 块无缝集成。

## 三、安装与快速开始

### 3.1 安装 CLI

```bash
# 标准安装
npm install @google/design.md

# Windows 用户需要引号包裹包名（PowerShell 中 @ 会被特殊处理）
npm install "@google/design.md"

# 或直接用 npx 运行（无需安装）
npx @google/design.md lint DESIGN.md
```

> **Windows 注意事项：** 直接运行 `npx @google/design.md lint DESIGN.md` 在 Windows 上可能因 `.md` 后缀与系统 Markdown 文件关联冲突而无输出。此时应使用 `designmd` 别名：
> ```bash
> npx -p @google/design.md designmd lint DESIGN.md
> ```

### 3.2 第一个 DESIGN.md

在项目根目录创建 `DESIGN.md`：

```md
---
name: MyApp Design System
colors:
  primary: "#0055FF"
  secondary: "#6C7278"
  neutral: "#F7F5F2"
typography:
  heading:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 700
  body:
    fontFamily: Inter
    fontSize: 1rem
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: 12px
---

## Overview

Clean, modern SaaS aesthetic with strong visual hierarchy...

## Colors

The palette is rooted in a vibrant blue primary...
```

### 3.3 验证

```bash
npx @google/design.md lint DESIGN.md
```

输出结构化 JSON：

```json
{
  "findings": [
    {
      "severity": "warning",
      "path": "components.button-primary",
      "message": "textColor (#ffffff) on backgroundColor (#0055FF) has contrast ratio 4.52:1 — passes WCAG AA."
    }
  ],
  "summary": { "errors": 0, "warnings": 0, "info": 2 }
}
```

## 四、使用方法与实战

### 4.1 与 AI 编码代理配合

将 `DESIGN.md` 放在项目根目录，AI 代理（如 Cursor、GitHub Copilot、Claude Code）会自动读取并应用设计 Token：

```typescript
// AI 读取 DESIGN.md 后生成的代码会自动使用 Token 值
// 而非硬编码随意的颜色和字体
const buttonStyle = {
  backgroundColor: '#0055FF',   // from colors.primary
  color: '#ffffff',
  borderRadius: '4px',          // from rounded.sm
  padding: '12px',             // from components.button-primary.padding
  fontFamily: 'Inter',          // from typography.body.fontFamily
};
```

**实际效果对比：**

| 场景 | 无 DESIGN.md | 有 DESIGN.md |
|:-----|:-------------|:-------------|
| AI 生成按钮 | 随机颜色，每次不同 | 始终使用 `colors.primary` |
| 多次迭代 | 设计逐渐漂移 | Token 约束，风格一致 |
| 新组件 | 需要反复提示设计规则 | 自动遵循已有 Token |

### 4.2 版本对比（diff）

当设计系统演进时，用 `diff` 命令检测 Token 级变更：

```bash
npx @google/design.md diff DESIGN.md DESIGN-v2.md
```

```json
{
  "tokens": {
    "colors": { "added": ["accent"], "removed": [], "modified": ["tertiary"] },
    "typography": { "added": [], "removed": [], "modified": [] }
  },
  "regression": false
}
```

这在设计系统重构或升级时非常有用——可以像代码 PR 一样 Review 设计变更。

### 4.3 导出到 Tailwind

```bash
# Tailwind v3 — 生成 theme.extend 配置对象
npx @google/design.md export --format json-tailwind DESIGN.md > tailwind.theme.json

# Tailwind v4 — 生成 @theme CSS 块
npx @google/design.md export --format css-tailwind DESIGN.md > theme.css
```

`theme.css` 内容示例：

```css
@theme {
  --color-primary: #0055FF;
  --color-secondary: #6C7278;
  --color-neutral: #F7F5F2;
  --font-heading: Inter;
  --font-body: Inter;
  --radius-sm: 4px;
  --radius-md: 8px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
}
```

### 4.4 导出到 W3C DTCG 格式

```bash
npx @google/design.md export --format dtcg DESIGN.md > tokens.json
```

生成的 `tokens.json` 符合 [W3C Design Tokens Format Module](https://tr.designtokens.org/format/)，可导入 Figma、Sketch 等设计工具。

## 五、常见问题与解决方案

### Q1: Windows 上运行 `npx @google/design.md` 没输出？

**A:** 这是 Windows 的 `.md` 文件关联与 npm 的 bin 名称冲突导致的。使用 `designmd` 别名：

```bash
npx -p @google/design.md designmd lint DESIGN.md
```

在 `package.json` scripts 中也应使用 `designmd`：

```json
{
  "scripts": {
    "design:lint": "designmd lint DESIGN.md"
  }
}
```

### Q2: npm install 报错 `ENOVERSIONS`？

**A:** 这意味着 npm 没有查询公共注册表。检查配置：

```bash
npm config get registry
# 正常应返回: https://registry.npmjs.org/
```

如果返回的是内部镜像或私有注册表，需要临时切换：

```bash
npm config set registry https://registry.npmjs.org/
npm cache clean --force
npm install @google/design.md
```

### Q3: lint 报错 `broken-ref`？

**A:** Token 引用 `{colors.primary}` 找不到对应定义。检查：
1. YAML front matter 中的 Token 名称拼写
2. 引用路径是否正确（如 `{colors.primary}` vs `{color.primary}`）
3. 被引用的 Token 是否确实定义在 YAML 中

### Q4: lint 警告 `contrast-ratio`？

**A:** 某个组件的 `backgroundColor` 和 `textColor` 对比度低于 WCAG AA 标准（4.5:1）。解决方法：
1. 调整颜色使对比度达标
2. 或用较大的字体（18pt 以上或 14pt 粗体）可放宽至 3:1

### Q5: 如何在 CI 中集成 DESIGN.md lint？

**A:** 在 CI 配置中添加 lint 步骤，`lint` 命令在发现 error 级别问题时退出码为 1：

```yaml
# .github/workflows/design-lint.yml
- name: Lint DESIGN.md
  run: npx @google/design.md lint DESIGN.md
```

## 六、总结

DESIGN.md 是一个非常巧妙的桥接方案——它用一套人类和 AI 都能理解的格式，将设计系统"编程化"，让 AI 编码代理能够生成符合品牌规范的 UI 代码。

它的价值在于：
1. **设计即代码**——设计系统可以像代码一样版本管理、Code Review、CI 检查
2. **AI 对齐**——给 AI 提供精确的设计约束，减少反复提示的成本
3. **格式互通**——通过 export 管道对接 Tailwind、Figma 等现有工具链

目前项目处于 `alpha` 阶段，规范和 CLI 还在活跃开发中，但核心思路已经非常清晰。对于正在探索 AI 辅助开发工作流的团队，DESIGN.md 值得一试。

**资源链接：**
- GitHub: https://github.com/google-labs-code/design.md
- npm: https://www.npmjs.com/package/@google/design.md
- 规范文档: [docs/spec.md](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)
