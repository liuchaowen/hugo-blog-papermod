---
title: "prompts.chat：从 Awesome ChatGPT Prompts 到全球最大开源提示词全栈平台"
date: 2026-09-03T19:04:00+08:00
description: "prompts.chat 是全球最大的开源 AI 提示词库，前身是 2022 年的 Awesome ChatGPT Prompts。本文从源码视角拆解它的技术栈、Next.js 16 架构、多语言与白标能力，以及 CLI / Claude Code 插件 / MCP 服务器等集成方式。"
author: "Cheman"
slug: prompts-chat
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 提示词, LLM]
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

今天在 GitHub Trending 上看到一个有意思的项目：**prompts.chat**——全球最大的开源 AI 提示词库，兼容 ChatGPT、Claude、Gemini、Llama、Mistral 等主流模型。它早已不只是「一个提示词列表」，而是一个完整的提示工程平台。

## 一、项目概述

prompts.chat 的前身是 2022 年 12 月创建的 **Awesome ChatGPT Prompts**，是世界上第一个提示词库。经过数年演进，它现在拥有 143k+ GitHub stars、GitHub Staff Pick 认证，并被 Forbes、Harvard、Columbia 等引用，提示词数据集在 Hugging Face 上成为「最受喜欢的数据集」。

它解决的核心问题是：**好提示词稀缺且分散**。项目把社区沉淀的高质量提示词集中、结构化、可检索，并围绕提示工程衍生出一整套生态：

- **提示词浏览**：[prompts.chat/prompts](https://prompts.chat/prompts)，数据以 `prompts.csv` / `PROMPTS.md` 及 Hugging Face 数据集三种形式同步开放。
- **交互式提示工程书**：25+ 章节，覆盖链式思维、少样本学习、AI Agent 等进阶技巧。
- **儿童提示游戏**：[prompts.chat/kids](https://prompts.chat/kids)，面向 8-14 岁孩子的游戏化 AI 沟通教学。
- **自托管能力**：支持白标（white-label）、自定义主题与鉴权，一键部署私有提示词库。
- **多端集成**：CLI、Claude Code 插件、MCP 服务器。

许可证采用**双授权**：源码与站点内容走 MIT，而提示词数据（`prompts.csv`、`PROMPTS.md`、用户提交）以 CC0 1.0 贡献至公有领域——这意味着你可以自由地把提示词用在自己的产品中。

## 二、技术原理

从 `package.json` 与配置文件可以看出，它是一个标准的 **Next.js 16 App Router** 全栈应用（内部代号 `prompts.chat-v2`）。

### 核心技术栈

| 维度 | 选型 |
|------|------|
| 框架 | Next.js `^16.0.10`（App Router）+ React `19.2.0` + TypeScript |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss`）+ `tailwind-merge`、`clsx` |
| 内容 | MDX（`@next/mdx`、`@mdx-js/react`）+ `react-markdown` |
| 国际化 | `next-intl`，支持 15 种语言（含 `zh`） |
| 数据层 | Prisma `^6.19` + PostgreSQL |
| 鉴权 | `next-auth@5 beta` + `@auth/prisma-adapter`（GitHub / Google / Apple） |
| 可观测 | Sentry（`@sentry/nextjs`） |
| 构建 | React Compiler 开启，standalone 输出用于 Docker |

### 架构与设计模式

`next.config.ts` 体现了几个值得注意的工程决策：

```ts
const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  reactCompiler: true,
  output: "standalone",
  webpack: (config) => {
    config.module.rules.push({
      resourceQuery: /raw/,
      type: "asset/source",
    });
    return config;
  },
};
```

- **React Compiler** 默认开启，用编译期自动记忆化替代手写 `useMemo`/`useCallback`，显著降低心智负担。
- **`output: "standalone"`** 配合 Docker 部署，产物自包含，启动快、镜像小。
- **`resourceQuery: /raw/`** 让 `.md`/`.csv` 等文件可「原样 import」，提示词数据因此能直接打包进前端。

多语言并非简单字符串映射，而是在 `prompts.config.ts` 中集中声明：

```ts
i18n: {
  locales: ["en", "tr", "es", "zh", "ja", "ar", "pt", "fr", "it", "de", "nl", "ko", "ru", "he", "el", "az", "fa"],
  defaultLocale: "en",
},
```

### 声明式配置与白标能力

整个站点的「可变部分」被收敛到 `prompts.config.ts` 的 `defineConfig`，涵盖 `branding`、`theme`、`auth`、`features`、`homepage` 五大块。例如切换白标只需一个开关：

```ts
const useCloneBranding = false;

export default defineConfig({
  branding: {
    name: "prompts.chat",
    logo: "/logo.svg",
    appStoreUrl: "https://apps.apple.com/tr/app/prompts-chat/id6756895736",
  },
  theme: {
    radius: "sm",
    variant: "default",
    colors: { primary: "#6366f1" },
  },
  auth: { providers: ["github", "google", "apple"], allowRegistration: false },
  features: {
    privatePrompts: true,
    changeRequests: true,
    categories: true,
    tags: true,
    aiSearch: true,    // 需要 OPENAI_API_KEY
    aiGeneration: true,
    mcp: true,
    comments: true,
  },
});
```

`useCloneBranding` 为 `true` 时会隐藏 prompts.chat 官方品牌、改用你自己的品牌——这就是「自托管私有提示词库」的关键。

### MCP 与插件集成

prompts.chat 把自身暴露为 **MCP（Model Context Protocol）服务器**，让任意支持 MCP 的 AI 工具直接调用提示词：

```json
{
  "mcpServers": {
    "prompts.chat": {
      "url": "https://prompts.chat/api/mcp"
    }
  }
}
```

本地运行则用 `npx` 拉起一个 stdio 版 MCP server：

```json
{
  "mcpServers": {
    "prompts.chat": {
      "command": "npx",
      "args": ["-y", "prompts.chat", "mcp"]
    }
  }
}
```

## 三、安装与快速开始

自托管有两种方式。最省事的是脚手架：

```bash
npx prompts.chat new my-prompt-library
cd my-prompt-library
```

或者从源码克隆并跑初始化向导：

```bash
git clone https://github.com/f/prompts.chat.git
cd prompts.chat
npm install && npm run setup
```

环境要求（来自 `package.json` 的 `engines` 与依赖）：

- **Node.js 24.x**
- **PostgreSQL**（推荐 Neon 托管数据库）
- 需要配置 `DATABASE_URL` 与 `NEXTAUTH_SECRET` 等环境变量

`npm run setup` 会启动向导，依次配置品牌、主题、鉴权（GitHub / Google / Azure AD）与功能开关。数据库迁移与种子由 `npm run db:setup`（Prisma generate + migrate + seed）完成。构建脚本也会先生成 Prisma 客户端：

```json
"build": "prisma generate && next build"
```

## 四、使用方法与实战

日常使用 prompts.chat 并不需要部署，它提供了三条轻量集成路径：

**1. CLI（最快）：**

```bash
npx prompts.chat
```

**2. Claude Code 插件：**

```
/plugin marketplace add f/prompts.chat
/plugin install prompts.chat@prompts.chat
```

安装后可在 Claude Code 里直接检索、插入社区提示词。

**3. MCP 服务器（见上文）：** 在任意 MCP 客户端（Cursor、Windsurf、Cline 等）配置远程或本地 server，AI 即可在对话中按需调用提示词库。

**贡献提示词**也极简：在 [prompts.chat/prompts/new](https://prompts.chat/prompts/new) 提交，数据会自动同步回仓库与 Hugging Face 数据集。

如果你想系统学提示工程，推荐它的交互式书籍（25+ 章节，从基础到链式思维、少样本、AI Agent）和面向孩子的游戏化教程 [prompts.chat/kids](https://prompts.chat/kids)——后者用解谜与故事教 8-14 岁孩子如何与 AI 沟通。

## 五、常见问题与解决方案

**Q1：本地 `npm run dev` 报 Node 版本不兼容？**
A：项目 `engines` 明确锁定 `node: "24.x"`，请使用 Node 24 及以上版本（推荐 nvm 切换）。

**Q2：自托管后页面空白 / 提示词不显示？**
A：多半是数据库未初始化。先执行 `npm run db:setup`（含 migrate + seed），并确保 `DATABASE_URL` 指向可用的 PostgreSQL 实例。

**Q3：启用 AI 搜索 / AI 生成没反应？**
A：`aiSearch` 与 `aiGeneration` 特性依赖 `OPENAI_API_KEY` 环境变量，未配置时相关功能会被静默禁用。

**Q4：Sentry 在本地疯狂报错？**
A：`sentry.*.config.ts` 中 `enabled: process.env.NODE_ENV === "production"`，开发环境已自动关闭，无需手动处理；生产环境才会上报。

**Q5：我能把提示词用到商业产品里吗？**
A：可以。源码是 MIT，但**提示词内容**走 CC0（公有领域），可自由商用；唯一需要留意的是站点/官方品牌素材受 MIT 约束，白标部署时建议开启 `useCloneBranding`。

**Q6：Docker 部署推荐配置？**
A：构建使用 `output: "standalone"`，配合官方 `DOCKER.md` 指南，用 `next start` 运行 standalone 产物即可，数据库建议外挂 Neon 等托管 PG。

## 六、总结

prompts.chat 的演进路径很具代表性：从一份「Awesome 列表」成长为带数据库、鉴权、多语言、白标与 MCP 接口的全栈 Next.js 16 应用。它把提示词这一「软知识」做成了可检索、可贡献、可集成、可自托管的开放基础设施，双许可证（MIT + CC0）又扫清了商用顾虑。

如果你在做 AI 应用、写 Agent，或者想搭一个团队内部的提示词库，prompts.chat 无论作为「现成数据源」还是「自托管模板」都值得收藏。顺便一提，它本身就是用 Windsurf 和 Devin 构建的——一个被 AI 工具链催生、又反哺 AI 工具链的活样本。

> 项目地址：[github.com/f/prompts.chat](https://github.com/f/prompts.chat) ｜ 在线体验：[prompts.chat](https://prompts.chat)
