---
title: "EmDash：用 Astro + Cloudflare 重写 WordPress 的现代 CMS"
date: 2026-08-27
description: "EmDash 是基于 Astro 与 Cloudflare 的全栈 TypeScript CMS，借鉴 WordPress 的插件生态与后台体验，却以无服务器、类型安全的架构重建，并用沙箱化 Worker 隔离解决插件安全隐患。"
author: "Cheman"
slug: emdash
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 技术, Astro, Cloudflare, CMS]
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

今天在 GitHub Trending 上看到一个有意思的项目：**EmDash（emdash-cms/emdash）**，一个用 Astro 和 Cloudflare 从零重建、专为解决 WordPress 时代痛点而生的全栈 TypeScript CMS。

## 一、项目概述

EmDash 将自己定位为「WordPress 的现代重写版本」：它保留了让 WordPress 占据统治地位的核心优势——可扩展性、顺手的后台体验、繁荣的插件生态——但把这些能力建立在无服务器（serverless）、类型安全（type-safe）的现代基础之上。

项目的核心主张很清晰：

- **沙箱化插件**：插件运行在隔离的 Worker 沙箱中，每个插件需要声明能力清单（capability manifest），从根本上解决了 WordPress 插件「一损俱损」的安全问题。
- **结构化内容**：不把内容存成序列化 HTML，而是使用 [Portable Text](https://www.portabletext.org/) 这种结构化 JSON 格式，让内容天然解耦于展示层。
- **为 Agent 而生**：内置 MCP Server，让 Claude、ChatGPT 等 AI 工具可以直接操作站点；同时提供 agent skills 与 CLI，支持 AI 辅助开发插件与主题。
- **随处可运行**：通过 Kysely（SQL）和 S3 API（存储）等可移植抽象，既能跑在 Cloudflare（D1 + R2 + Workers）上，也能跑在任意带 SQLite 的 Node.js 服务器上。

仓库是一个 pnpm monorepo，作者为 Matt Kane，采用 MIT 许可证，目前处于 **beta preview** 阶段。

## 二、技术原理

### 架构设计

EmDash 本质上是一个 **Astro 集成（integration）**。把它加进 `astro.config.mjs`，你就得到了一整套 CMS 能力：后台面板、REST API、鉴权、媒体库与插件系统。

```typescript
// astro.config.mjs
import emdash from "emdash/astro";
import { d1 } from "emdash/db";

export default defineConfig({
	integrations: [emdash({ database: d1() })],
});
```

内容类型（content type）定义在**数据库**里，而非写死在代码中。非开发人员可以通过后台 UI 创建和修改集合（collection），每个集合会对应一张真实的 SQL 表，并带有类型化的列。开发者则可以从实时 schema 生成 TypeScript 类型：

```bash
npx emdash types
```

查询内容时直接使用 Astro 的 Live Collections，无需额外构建步骤，也无需单独的 API 层：

```astro
---
import { getEmDashCollection } from "emdash";
const { entries: posts } = await getEmDashCollection("posts");
---

{posts.map((post) => <article>{post.data.title}</article>)}
```

### 沙箱化插件：用最小权限取代「全量信任」

WordPress 插件默认拥有数据库、文件系统和用户数据的完整访问权，一个漏洞插件就能拖垮整站。EmDash 反其道而行：插件通过 Cloudflare 的 Dynamic Worker Loaders 运行在隔离的 Worker 沙箱中，每个插件必须声明自己需要的能力。

```typescript
export default () =>
	definePlugin({
		id: "notify-on-publish",
		capabilities: ["read:content", "email:send"],
		hooks: {
			"content:afterSave": async (event, ctx) => {
				if (event.content.status !== "published") return;
				await ctx.email.send({
					to: "editors@example.com",
					subject: `New post: ${event.content.title}`,
				});
			},
		},
	});
```

上面这个插件声明了 `read:content` 与 `email:send` 两项能力，那么它**只能**做这两件事，多一分都不行。这种能力清单（capability manifest）模型，正是现代最小权限原则（least privilege）在 CMS 插件体系中的落地。

### 结构化内容：Portable Text 取代 DOM 耦合

WordPress 把富文本存成嵌在注释里的 HTML，导致内容与 DOM 表示强绑定。EmDash 改用 Portable Text——一种结构化的 JSON 格式。内容可以原样渲染成网页、移动 App、邮件或 API 响应，而不必先解析 HTML。富文本编辑基于 TipTap，存储层则是 Portable Text。

### 可移植平台抽象

| 层 | Cloudflare | 同样支持 |
| --- | --- | --- |
| 数据库 | D1 | SQLite、Turso/libSQL、PostgreSQL |
| 存储 | R2 | AWS S3、任意 S3 兼容服务、本地文件系统 |
| 会话 | KV | Redis、基于文件 |
| 插件 | Worker isolates（沙箱） | 进程内（安全模式） |

这种分层抽象让 EmDash「在 Cloudflare 上跑得最好，但并不被它锁死」。

## 三、安装与快速开始

环境要求：**Node.js ≥ 22**，以及 pnpm 11+（仓库通过 `packageManager` 字段锁定）。

最快捷的开始方式是用官方脚手架：

```bash
npm create emdash@latest
```

或者一键部署到自己的 Cloudflare 账号（需 Dynamic Workers，目前仅付费账号可用，起步 $5/月；也可注释掉 `wrangler.jsonc` 中的 `worker_loaders` 块来关闭插件）。

如果想本地体验 Demo（Node.js + SQLite，无需 Cloudflare 账号）：

```bash
git clone https://github.com/emdash-cms/emdash.git && cd emdash
pnpm install
pnpm build

# 运行 demo（Node.js + SQLite）
pnpm --filter emdash-demo seed
pnpm --filter emdash-demo dev
```

随后打开后台：<http://localhost:4321/_emdash/admin>。

官方还提供了三套起步模板：**Blog**（经典博客，含侧边栏、搜索、RSS）、**Marketing**（转化导向落地页）、**Portfolio**（作品集），均支持深色/浅色模式。

## 四、使用方法与实战

### 定义内容集合与类型

内容模型由数据库驱动。在后台用可视化 schema builder 创建集合后，通过一条命令即可生成对应的 TypeScript 类型，获得端到端的类型安全：

```bash
npx emdash types
```

### Agent 工作流：让 AI 直接管站点

EmDash 面向 AI 工具做了原生支持：

- **内置 MCP Server**：Claude、ChatGPT 等可直接与站点交互（读取/发布内容、管理 schema）。
- **Agent Skills**：提供用于 AI 辅助开发插件与主题的能力文件。
- **CLI 程序化管理**：让 agent 以编程方式管理内容与 schema。

例如，用前文示例的 `notify-on-publish` 插件，当文章状态变为 `published` 时自动给编辑发邮件——整个过程由能力清单约束，不会越权访问数据库或文件系统。

### 从 WordPress 迁移

EmDash 提供 WordPress 导入向导，支持从 WXR 导出、WordPress REST API 或 WordPress.com 导入文章、页面、媒体与分类法；还附带 `gutenberg-to-portable-text` 工具把古腾堡块转换为 Portable Text，并提供 agent skills 帮助移植插件和主题。

## 五、常见问题与解决方案

**Q1：插件无法运行 / 沙箱报错？**
EmDash 的安全沙箱依赖 Cloudflare 的 Dynamic Workers，目前仅付费账号可用（起步 $5/月）。若暂时不想付费，可注释掉 `wrangler.jsonc` 中的 `worker_loaders` 块，插件会退回到进程内的安全模式（in-process safe mode）。

**Q2：npm 安装/构建报 native 依赖错误？**
仓库的 Dockerfile 注释指出，`better-sqlite3` 在无法命中 GitHub Releases 预编译二进制时，会回退到从源码编译，这需要 `python3`、`make`、`g++`。在精简镜像或离线环境中需提前安装该工具链。

**Q3：内容类型改了，前端类型不同步？**
记得在后台修改 schema 后重新运行 `npx emdash types` 生成 TypeScript 类型；前端通过 `getEmDashCollection` 读取的集合字段以生成的类型为准。

**Q4：想跑本地 Demo 但不想配 Cloudflare？**
直接用 `pnpm --filter emdash-demo seed && pnpm --filter emdash-demo dev`，Demo 使用 Node.js + SQLite，无需任何 Cloudflare 账号即可体验完整后台。

**Q5：需要多语言/国际化？**
仓库内置 Lingui（含 pseudo locale 用于暴露未包裹文案）与 Lunaria（文档翻译状态追踪），后台支持多语言消息目录。

## 六、总结

EmDash 是一次有意思的「考古翻新」：它承认 WordPress 在产品设计上的成功，却拒绝继承它时代的技术包袱——PHP 与 JS 双栈、插件全权限、HTML 耦合内容。通过 Astro 集成、Cloudflare 无服务器底座、Worker 沙箱插件与 Portable Text 结构化内容，它把安全性、类型安全和可移植性做成了一等公民。

对于一个仍在 beta preview 阶段的项目，它已经给出了相当完整的蓝图：可视化 schema、MCP Server、WordPress 迁移路径、三套模板。如果你既想要 WordPress 那样顺手的内容管理能力，又不想被它的安全与运维噩梦捆绑，EmDash 值得加入观察列表。

> 仓库地址：<https://github.com/emdash-cms/emdash>
> 文档：<https://docs.emdashcms.com/>
