---
title: "Cordis：面向时空可组合性的元框架"
date: "2026-08-15"
description: "cordiverse/cordis 是一个主打「时空可组合性（Spatiotemporal Composability）」的元框架，目前处于早期活跃开发阶段，API 尚不稳定。本文基于其仓库结构与工具链，解析其 monorepo 架构、构建体系与设计取向。"
author: "Cheman"
slug: cordis
draft: false
categories: ["技术", "开源", "框架"]
tags: ["GitHub", "开源", "TypeScript", "Cordis", "Koishi", "元框架", "Monorepo"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**cordiverse/cordis**，一个把自己定义为「时空可组合性的元框架（A Meta-Framework of Spatiotemporal Composability）」的新项目。它延续了 Koishi 生态中 `@cordisjs` 插件内核的基因，但把目光投向了更底层的「可组合性」范式。

## 一、项目概述

Cordis 当前仍处于**活跃开发初期**，README 中明确标注：

> Cordis is under active development. The API is not yet stable and may change without notice.

因此本项目目前更像是一份「编程范式宣言 + 工程骨架」，而非一个可稳定使用的成品库。其核心定位是：

- **元框架（Meta-Framework）**：不是直接解决某类业务问题，而是为「如何组合行为」提供一层抽象；
- **时空可组合性（Spatiotemporal Composability）**：强调组件在「空间维度（结构/依赖）」与「时间维度（生命周期/执行时序）」上都能被自由组合；
- 配套有学术论文 *A Programming Paradigm for Spatiotemporal Composability* 与入门文档 *cordis-primer*，说明作者试图为这套设计建立一套完整的方法论，而非仅凭直觉堆代码。

从命名与包结构看，Cordis 与 Koishi 使用的 `@cordisjs` 插件内核一脉相承——你可以把它理解为「下一代 Cordis」的雏形。

## 二、技术原理

### 2.1 包结构与模块映射

`package.json` 暴露了它采用 **Yarn 4 workspaces（monorepo）** 组织：

```json
{
  "name": "@root/cordis",
  "private": true,
  "type": "module",
  "packageManager": "yarn@4.14.1",
  "workspaces": ["external/*", "packages/*"],
  "license": "MIT"
}
```

`tsconfig.json` 中的 `paths` 映射揭示了内部模块划分：

```json
{
  "compilerOptions": {
    "paths": {
      "cordis": ["./packages/core/src"],
      "create-cordis": ["./packages/create/src"],
      "@cordisjs/plugin-*": ["./packages/*/src"],
      "@cordisjs/*": ["./packages/*/src"]
    }
  }
}
```

可以拆出三层：

- `packages/core` → `cordis`：框架内核，承载「可组合性」的核心抽象；
- `packages/create` → `create-cordis`：脚手架/初始化器，对应 `npm create cordis` 这类入口；
- `packages/*` → `@cordisjs/plugin-*`：插件包集合，沿用 Koishi 生态的插件命名习惯。

### 2.2 构建与测试工具链

Cordis 没有用常见的 `tsup`/`tsc` 直接构建，而是引入了 **yakumo** 这个一体化 monorepo 构建工具（出自同一生态）：

```json
{
  "scripts": {
    "build": "yarn yakumo esbuild && yarn yakumo tsc",
    "test": "yarn yakumo vitest --import tsx",
    "lint": "eslint --cache"
  }
}
```

构建分两步：`esbuild` 负责快速打包，`tsc` 负责类型产出；测试统一走 `vitest`，并通过 `--import tsx` 直接运行 TypeScript 源码。值得注意的是 `vitest.config.ts` 里启用了 Node 内部 API 与自定义 YAML 加载：

```ts
import { defineConfig } from 'vitest/config'
import unyaml from '@cordisjs/unyaml/vite'

export default defineConfig({
  plugins: [unyaml()],
  test: {
    pool: 'forks',
    execArgv: ['--expose-internals', '--import', 'tsx', '--import', '@cordisjs/unyaml'],
  },
})
```

`--expose-internals` 说明项目需要访问 Node.js 的内置/未公开 API（例如 `internalBinding`），这通常意味着它在做偏底层的运行时控制；`@cordisjs/unyaml` 则是配套的 YAML 解析插件，暗示「配置即 YAML」会是其一等公民。

### 2.3 「时空可组合性」的设计取向

结合上述线索可以推断 Cordis 的抽象方向：

- **空间维度**：通过 workspace + 插件包机制，组件以声明式依赖关系被「装配」进一个运行时容器（类似 Cordis 经典的 `Context` 依赖注入树）；
- **时间维度**：组件具备显式的生命周期与执行时序，可被组合、拦截、调度；
- **元框架定位**：把「组合规则」本身做成可编程的，让上层框架/应用复用同一套可组合性原语。

## 三、安装与快速开始

由于项目处于早期、未发布正式版本，官方暂未提供稳定的 npm 包。基于现有结构，开发者可以本地拉取源码进行体验：

**环境要求**

- Node.js（从 `@types/node: ^25` 推测需较新的 Node 版本，建议 20+）
- 启用 Corepack 以使用 Yarn 4

```bash
# 启用 Yarn 4（通过 Corepack）
corepack enable
corepack prepare yarn@4.14.1 --activate

# 克隆并安装
git clone https://github.com/cordiverse/cordis.git
cd cordis
yarn install

# 构建内核
yarn build

# 运行测试
yarn test
```

> ⚠️ 注意：API 尚不稳定，以上命令仅用于「参与开发/阅读源码」，请勿在生产中直接依赖。

## 四、使用方法与实战

在正式 API 落地前，最务实的「用法」是**研读范式论文与 primer 文档**，并顺着 monorepo 结构理解其抽象：

1. 先读 *cordis-primer* 文档，建立对「时空可组合性」心智模型；
2. 从 `packages/core/src` 入手，看 `cordis` 内核如何定义组合原语；
3. 参考 `@cordisjs/plugin-*` 包，理解插件是如何「被组合」进去的；
4. 用 `create-cordis` 脚手架尝试生成一个最小可运行骨架。

由于尚无稳定导出，这里不给出伪造的调用示例——误写 API 反而会误导读者。建议持续关注仓库更新，待 API 稳定后再做实战迁移。

## 五、常见问题与解决方案

- **Q：能直接 `npm i cordis` 使用吗？**
  A：目前不能。仓库为私有 monorepo（`"private": true`）且版本号 `0.0.0`，尚未发布到 npm 稳定通道，需从源码构建。

- **Q：为什么测试要 `--expose-internals`？**
  A：项目需要访问 Node.js 内部 API 来实现底层运行时控制，普通运行模式拿不到这些绑定，因此测试进程必须显式暴露内部接口。

- **Q：Yarn 4 安装报错 / 网络慢？**
  A：Yarn 4 默认走 PnP 或全局缓存，建议在项目根目录配置 `.yarnrc.yml`（如设置 `nodeLinker` 与国内镜像源）后再执行 `yarn install`。

- **Q：代码里大量 YAML 配置从哪来？**
  A：来自 `@cordisjs/unyaml` 这组自定义 YAML 解析，并在 Vite/Vitest 侧通过 `unyaml()` 插件接入，配置加载是框架设计的一环。

## 六、总结

**cordiverse/cordis** 是一个野心不小的早期项目：它不满足于做「又一个插件框架」，而是试图用「时空可组合性」这一编程范式，为组件的**结构组合**与**生命周期编排**提供统一抽象。从 monorepo 骨架、yakumo/tsx/vitest 工具链、YAML 一等公民等线索看，它延续并升级了 Koishi 生态 Cordis 内核的工程基因。

不过务必记住：**它现在还是 0.0.0、API 会变**。如果你想用它，最佳姿势是「读论文 + 跟源码 + 等稳定版」，而不是立刻搬进生产。对于关注下一代 JS 运行时组合范式的开发者，这是一个值得加星观望的仓库。

---

**参考链接**

- 仓库：<https://github.com/cordiverse/cordis>
- 论文：<https://github.com/cordiverse/paper>
- 入门文档：<https://deepseek-harness.github.io/deepseek-harness/reference/cordis-primer>
