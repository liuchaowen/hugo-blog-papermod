---
title: "Ghost 开源项目架构解析：monorepo 工程化实践与依赖边界设计"
date: "2026-08-22"
description: "Ghost 是一个拥有 1 亿+下载量的专业开源出版平台，本文深入剖析其基于 pnpm + Nx 的 monorepo 工程架构，详解 shared/server/frontend 依赖边界、shade 设计系统分层以及 UMD 公开包的隔离机制。"
author: "Cheman"
slug: ghost
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, Node.js, CMS, Monorepo, 工程化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Ghost**，一款拥有超过 1 亿次下载量的专业开源出版平台，采用 Node.js 构建，是目前最流行的无头（Headless）CMS 之一。

## 一、项目概述

Ghost 由 Ghost Foundation 维护，核心定位是"专业出版平台"，旨在为独立博主和媒体机构提供一套完整的订阅、会员和内容变现解决方案。与 WordPress 相比，Ghost 更专注于内容创作体验和商业化能力，内置会员订阅、邮件通讯等功能，无需额外插件即可实现内容付费。

**核心特性：**
- 无头 CMS：前后端分离，支持通过 Content API 对接任意前端
- 内置会员系统：支持订阅制内容、会员等级和 Stripe 支付集成
- 开源免费：MIT 协议，可自行部署
- 主题系统：基于 Handlebars 模板引擎，支持自定义主题
- 现代化编辑器：集成 Koenig Lexical 富文本编辑器
- ActivityPub 支持：已开始探索去中心化社交协议

**技术栈：**
- 运行时：Node.js 22.23.1（要求精确版本）
- 包管理：pnpm 11.21.0（monorepo workspace）
- 任务编排：Nx 23.1.1
- 数据库：MySQL / SQLite（开发环境）
- 容器化：Docker Compose
- 代码质量：ESLint + Oxfmt + Vitest + dependency-cruiser

## 二、技术原理：monorepo 架构与依赖边界设计

Ghost 采用典型的 monorepo 架构，基于 pnpm workspace + Nx 构建。以下从源码文件深入分析其工程化设计。

### 2.1 包结构与 workspace 组织

Ghost 的 monorepo 包含以下主要包：

| 路径 | 说明 |
|------|------|
| `ghost/core/` | Ghost 主服务核心（server + shared + frontend） |
| `apps/shade/` | 设计系统基础层（shadcn/ui 风格组件库） |
| `apps/admin-x-framework/` | 管理后台 UI 框架层 |
| `apps/portal/` | 公开 UMD 包——访客注册/登录入口 |
| `apps/comments-ui/` | 公开评论组件 |
| `apps/signup-form/` | 订阅表单组件 |
| `apps/admin/` | 管理后台完整应用 |
| `@tryghost/*` | 内部共享包（workspace symlink） |

### 2.2 依赖边界规则（Dependency Boundaries）

Ghost 在 `ghost/core/.dependency-cruiser.cjs` 中定义了严格的架构边界规则，通过 `dependency-cruiser` 工具在 CI 中强制执行。以下逐一解析：

**规则一：shared 层不得依赖 server 或 frontend**

```
from: ghost/core/core/shared/
to: ghost/core/core/(server|frontend)/
→ ERROR
```

shared 层作为核心共享模块，必须保持零依赖纯净，任何业务逻辑都必须通过依赖注入的方式与具体层解耦。这保证了 shared 包可以在不引入业务代码的情况下被测试和复用。

**规则二：frontend 层禁止直接调用 server/models**

```javascript
// ghost/core/.dependency-cruiser.cjs
{
  name: 'frontend-not-server-models',
  comment: 'Invalid require of core/server/models from core/frontend. ' +
    'Fetch content through the public Content API (api.postsPublic / api.pagesPublic), ' +
    'injected via core/frontend/services/proxy — not the model layer directly.',
  severity: 'error',
  from: { path: '^ghost/core/core/frontend/' },
  to: { path: '^ghost/core/core/server/models/' },
}
```

前端渲染层被严格禁止直接访问数据模型层，所有数据必须通过公开的 Content API 获取。这一设计模拟了微服务中前后端通过 HTTP 接口通信的模式，即便在同一个代码仓库中也维持了服务边界的完整性。

**规则三：frontend 到 server 只能通过 proxy 代理**

```javascript
{
  name: 'frontend-to-server-via-proxy-only',
  from: { path: '^ghost/core/core/frontend/', pathNot: [...] },
  to: { path: '^ghost/core/core/server/' }
}
```

frontend 层通过 `core/frontend/services/proxy.js` 作为与 server 层通信的唯一通道。这是一个显式的"接缝（seam）"设计，将跨层调用收敛到唯一入口，便于后续维护和替换。

**规则四：apps 分层——shade 是最底层**

```
shade（设计系统基础组件）
  ↓
admin-x-framework（管理后台 UI 框架）
  ↓
admin / activitypub（具体功能应用）
```

```javascript
{ name: 'shade-is-leaf', from: '^apps/shade/', to: '^@tryghost/admin-x-framework' }
// shade 不得依赖 admin-x-framework（方向错误）
{ name: 'framework-not-feature-apps', from: '^apps/admin-x-framework/', to: '^@tryghost/activitypub' }
// admin-x-framework 不得依赖 feature apps
```

shade 作为底层设计系统，是所有上层 UI 的基础。这种"底层不得依赖上层"的规则防止了设计系统的逆向污染。

**规则五：公开 UMD 包与后台库隔离**

```javascript
{
  name: 'public-apps-not-admin-libs',
  from: { path: '^apps/(portal|comments-ui|signup-form|sodo-search|announcement-bar|admin-toolbar)/' },
  to: { path: '^@tryghost/(shade|admin-x-framework)' }
}
```

portal（访客订阅入口）、comments-ui（评论组件）等 UMD 包被打包成独立脚本嵌入网站页面，它们必须独立于管理后台库运行，防止后台代码泄露到访客侧。

### 2.3 pnpm hooks 与包发布管理

Ghost 使用 pnpm hooks 实现发布时的包体优化：

```javascript
// ghost/.pnpmfile.mjs
async function updateConfig(config) {
  const ignoredPackages = new Set(versioning.ignore ?? []);
  // 动态枚举所有 private 包，将其加入 changelog 忽略列表
  const files = await Array.fromAsync(glob(patterns, { exclude }));
  for (const file of files) {
    const pkg = JSON.parse(await readFile(file, 'utf-8'));
    if (pkg.private) ignoredPackages.add(pkg.name);
  }
  config.versioning = { ...config.versioning, ignore: Array.from(ignoredPackages) };
  return config;
}
```

`updateConfig` hook 在发布时自动扫描所有 `private: true` 的包，将其加入 Changesets 的忽略列表，避免 changelog 误将内部包版本变更暴露给消费者。

### 2.4 lint-staged 配置：多 Workspace 并行 ESLint

```javascript
// ghost/.lintstagedrc.cjs
'*.{js,ts,tsx,jsx,cjs}': (files) => {
  const groups = new Map();
  for (const file of files) {
    const workspace = findWorkspace(file); // 找到文件所属 workspace
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  }
  return [
    buildOxfmtCommand(files),  // 统一格式化
    ...[...groups.entries()].map(([workspace, wsFiles]) =>
      buildCommand(workspace, wsFiles)  // 按 workspace 分组 lint
    ),
  ];
}
```

lint-staged 会根据变更文件所属的 workspace 动态分组，先统一运行格式化（oxfmt），再按 workspace 分别执行 ESLint。这种"先格式化再 lint"的设计保证了风格统一的同时，lint 的错误信息不受格式问题干扰。

## 三、安装与快速开始

### 3.1 本地开发（推荐方式）

```bash
# 1. 安装 Ghost CLI
npm install ghost-cli -g

# 2. 本地快速安装（推荐）
ghost install local

# 3. 或使用 Docker 开发环境
git clone https://github.com/TryGhost/Ghost.git
cd Ghost
pnpm install
pnpm dev
```

### 3.2 生产环境部署

```bash
# 一键安装（含自动 SSL 配置）
ghost install

# 生产环境需要准备：
# - Ubuntu 20.04+ 或类似发行版
# - MySQL 5.7+ 或 MariaDB 10.4+
# - Nginx
# - Node.js 22.x
# - Let's Encrypt（自动申请 SSL 证书）
```

### 3.3 monorepo 开发环境（参与源码开发）

```bash
git clone https://github.com/TryGhost/Ghost.git
cd Ghost
pnpm install
git submodule update --init --recursive
git config --local blame.ignoreRevsFile .git-blame-ignore-revs
pnpm dev
```

Ghost 的 monorepo 开发基于 Docker Compose：Nx 编排构建任务，Docker 容器提供 MySQL 等运行时服务。开发体验高度自动化。

## 四、使用方法与实战

### 4.1 Content API 调用示例

Ghost 提供公开的 Content API，适合构建静态站点或 SPA：

```javascript
// 获取所有已发布文章
const response = await fetch('https://your-ghost-site.com/ghost/api/content/posts/?key=your_content_api_key');
const { posts } = await response.json();

// 通过 Admin API 创建文章（需要认证）
const adminResponse = await fetch('https://your-ghost-site.com/ghost/api/admin/posts/', {
  method: 'POST',
  headers: {
    'Authorization': 'Ghost ${adminApiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    posts: [{
      title: '我的第一篇文章',
      html: '<p>Hello World</p>',
      tags: ['技术'],
      status: 'published'
    }]
  })
});
```

### 4.2 主题开发

Ghost 主题基于 Handlebars 模板语言，目录结构：

```
my-theme/
├── package.json
├── index.hbs          # 首页
├── post.hbs           # 文章页
├── page.hbs           # 页面模板
├── tag.hbs            # 标签归档页
├── assets/
│   ├── css/
│   └── js/
└── partials/          # 可复用组件
    ├── header.hbs
    └── footer.hbs
```

## 五、常见问题与解决方案

**Q: ghost install local 报 MySQL 连接错误？**
Ghost 5.x 默认使用 SQLite 作为本地数据库，无需单独安装 MySQL。若使用 `ghost install local` 仍报错，检查是否之前有残留的 MySQL 配置：`ghost uninstall` 后重新安装。

**Q: pnpm install 失败，报 node 版本不匹配？**
Ghost 要求 Node.js 22.23.1（精确版本），建议使用 `nvm` 或 `fnm` 管理 Node 版本：
```bash
fnm install 22.23.1
fnm use 22.23.1
```

**Q: dependency-cruiser 边界规则报错，如何定位？**
在 CI 中使用 `pnpm lint:boundaries` 可以直接看到违规路径：
```bash
pnpm depcruise ghost/core/core apps --config .dependency-cruiser.cjs
```
输出会清晰标注违反哪条规则、从哪个文件指向了哪个目标文件。

**Q: monorepo 中某个 app 构建卡住？**
Nx 有缓存机制，清理缓存：
```bash
npx nx reset
pnpm nx run-many -t build
```

## 六、总结

Ghost 项目的工程化水平令人印象深刻。其 monorepo 架构通过 pnpm workspace + Nx + dependency-cruiser 实现了三件事：**严格的依赖边界**（shared/server/frontend 分离）、**高效的多包协作**（lint-staged 分组并行）、**可靠的质量门禁**（CI 中强制执行架构规则）。

对于 Node.js 后端项目，Ghost 的架构设计提供了极佳的参考范式——即便团队规模不大，通过清晰的层次划分和自动化工具约束，也能在单体仓库中保持代码的长期可维护性。如果你需要一套专业级的内容平台方案，Ghost 绝对值得一试。
