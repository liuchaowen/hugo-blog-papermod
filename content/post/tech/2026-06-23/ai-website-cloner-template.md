---
title: "AI Website Cloner Template：用 AI 编程助手一键克隆任意网站"
date: 2026-06-23
description: "一个强大的 Next.js 模板项目，配合 Claude Code 等 AI 编程助手，可以逆向工程任意网站，自动提取设计令牌、资源，并重建为现代化的 Next.js 代码库。支持平台迁移、丢失源码恢复、技术学习等多种场景。"
author: "Cheman"
slug: ai-website-cloner-template
draft: false
categories: ["技术", "开源", "前端"]
tags: ["GitHub", "Next.js", "AI", "Claude Code", "网站克隆", "逆向工程"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AI Website Cloner Template**，它能让你用 AI 编程助手（推荐 Claude Code）一键克隆任意网站，将其重构为现代化的 Next.js 项目。

## 一、项目概述

AI Website Cloner Template 是一个可复用的 Next.js 模板，专为 AI 编程助手设计。它的核心能力是：**输入任意网站 URL，AI 会自动分析网站结构、提取设计令牌和资源、编写组件规格，最终重建出功能完整的 Next.js 代码库**。

核心特性：
- **多 AI 助手支持**：推荐 Claude Code（Opus 4.7），同时支持 Codex CLI、Cursor、Windsurf、Gemini CLI、GitHub Copilot 等 12+ 主流 AI 编程工具
- **全流程自动化**：从截图、设计令牌提取、资源下载，到组件规格编写、并行构建、最终组装
- **现代技术栈**：Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **并行构建架构**：使用 git worktree 为每个组件/区块分配独立的构建代理，显著提升克隆效率

适用场景：
- 平台迁移：从 WordPress/Webflow/Squarespace 迁移到 Next.js
- 源码丢失恢复：网站在线但代码丢失，通过克隆重建现代代码库
- 技术学习：解构生产级网站的布局、动画、响应式实现方式

## 二、技术原理

### 架构设计

项目的核心是一个多阶段流水线 `/clone-website`，运行在 AI 编程助手内部：

```
Reconnaissance → Foundation → Component Specs → Parallel Build → Assembly & QA
```

**1. Reconnaissance（侦察阶段）**
- 自动截图目标网站
- 提取设计令牌（颜色、字体、间距、阴影等）
- 交互扫描：滚动、点击、悬停、响应式断点

**2. Foundation（基础建设）**
- 更新全局字体、颜色配置
- 下载所有静态资源（图片、视频、图标）
- 配置 Tailwind CSS v4 的 oklch 设计令牌

**3. Component Specs（组件规格）**
- 为每个区块编写详细的规格文件（`docs/research/components/`）
- 包含精确的 `getComputedStyle()` 计算值、交互状态、响应式断点

**4. Parallel Build（并行构建）**
- 使用 git worktree 为每个组件创建独立工作树
- 派发多个构建代理并行工作
- 每个代理接收完整的组件规格，无需猜测

**5. Assembly & QA（组装与质检）**
- 合并所有 worktree
- 连接页面路由
- 运行视觉差异对比

### 核心技术栈

```json
{
  "dependencies": {
    "next": "16.2.1",
    "react": "19.2.4",
    "shadcn": "^4.1.0",
    "tailwindcss": "^4",
    "lucide-react": "^1.6.0"
  }
}
```

- **Next.js 16 App Router**：服务端渲染 + 静态生成混合模式
- **React 19**：最新的并发特性与 Server Components
- **Tailwind CSS v4**：使用 oklch 色彩空间的设计令牌
- **shadcn/ui**：基于 Radix primitives 的无障碍组件库

### 关键实现细节

项目使用单一源文件驱动多平台支持：

| 配置源 | 生成目标 |
|--------|----------|
| `AGENTS.md` | 所有 AI 助手的项目指令 |
| `.claude/skills/clone-website/SKILL.md` | `/clone-website` 技能定义 |

同步命令：
```bash
bash scripts/sync-agent-rules.sh  # 同步 AGENTS.md 到各平台
node scripts/sync-skills.mjs      # 同步技能定义到各平台
```

## 三、安装与快速开始

### 环境要求

- Node.js 24+
- 任意支持的 AI 编程助手（推荐 Claude Code）

### 安装步骤

**重要：使用 GitHub 的 "Use this template" 功能创建你自己的仓库副本，不要直接 clone 原模板。**

```bash
# 1. 在 GitHub 页面点击 "Use this template" → "Create a new repository"

# 2. Clone 你自己的仓库
git clone https://github.com/YOUR-USERNAME/YOUR-NEW-REPOSITORY.git
cd YOUR-NEW-REPOSITORY

# 3. 安装依赖
npm install

# 4. 启动 AI 助手（推荐 Claude Code）
claude --chrome

# 5. 运行克隆技能
/clone-website https://example.com
```

### Docker 部署

项目提供多阶段 Dockerfile，支持 standalone 输出：

```bash
docker compose up app --build      # 构建并运行生产镜像
docker compose up dev --build      # 开发模式（端口 3001）
```

Dockerfile 使用 Node.js 24.14.1-slim 基础镜像，通过 cache mount 优化依赖安装速度。

## 四、使用方法与实战

### 基础用法

```bash
# 克隆单个网站
/clone-website https://target-site.com

# 克隆多个页面
/clone-website https://site.com/page1 https://site.com/page2
```

AI 助手会自动：
1. 打开 Chrome 访问目标网站
2. 截图并分析 DOM 结构
3. 提取所有设计令牌和资源
4. 生成组件规格文件
5. 并行构建各区块
6. 组装并运行视觉对比

### 进阶用法

**自定义设计令牌**

克隆完成后，可修改 `src/app/globals.css` 中的 oklch 变量：

```css
:root {
  --primary: oklch(0.6 0.2 250);
  --secondary: oklch(0.8 0.1 180);
}
```

**保留原始图标**

克隆过程中会提取 SVG 图标到 `src/components/icons.tsx`：

```tsx
export const IconName = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    {/* 提取的 SVG path */}
  </svg>
);
```

**查看组件规格**

所有规格文件存放在 `docs/research/components/`，包含：
- 精确的 CSS 计算值
- 交互状态定义（hover、focus、active）
- 响应式断点规则
- 多语言内容占位

### 实际项目示例

项目提供了一个完整的演示视频，展示了从输入 URL 到生成完整 Next.js 代码的全过程：

[观看演示视频](https://youtu.be/O669pVZ_qr0)

## 五、常见问题与解决方案

### 安装失败

**问题：`npm install` 报错 "No matching version found"**

解决方案：确保 Node.js 版本 ≥ 24。检查方式：

```bash
node -v  # 应输出 v24.x.x 或更高
```

**问题：Tailwind CSS v4 配置不生效**

解决方案：确保使用 `@tailwindcss/postcss` 插件，检查 `postcss.config.mjs`：

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### 运行时错误

**问题：`/clone-website` 命令不存在**

解决方案：确保在项目根目录运行 AI 助手，且已正确安装依赖。Claude Code 会自动读取 `CLAUDE.md` 配置。

**问题：Chrome 无法启动**

解决方案：Claude Code 需要配合 Chrome 使用，确保已安装 Chrome 或使用 `--chrome` 参数：

```bash
claude --chrome
```

### 性能问题

**问题：克隆大型网站耗时过长**

解决方案：
1. 使用 `--max-files` 参数限制抓取文件数
2. 只克隆关键页面，而非全站
3. 使用并行构建（项目默认启用）

### 兼容性

**问题：生成的代码与原网站差异较大**

解决方案：
1. 检查 `docs/research/components/` 中的规格文件是否完整
2. 手动调整设计令牌
3. 使用视觉对比工具（项目内置）定位差异

## 六、总结

AI Website Cloner Template 展示了 AI 辅助编程的强大能力：**将"看懂网站 → 写代码"的整个过程自动化**。对于开发者来说，它不仅是迁移工具，更是学习现代前端架构的绝佳案例。

项目的技术亮点：
- **并行构建架构**：git worktree + 多代理协作
- **精确提取**：`getComputedStyle()` 获取真实 CSS 值
- **跨平台支持**：单一源文件驱动多 AI 助手
- **现代技术栈**：Next.js 16 + React 19 + Tailwind v4

**许可证**：MIT

**GitHub**：https://github.com/JCodesMore/ai-website-cloner-template
