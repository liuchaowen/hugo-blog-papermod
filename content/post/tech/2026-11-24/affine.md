---
title: "AFFiNE：把 Notion 和 Miro 揉进一块画布的本地优先知识库"
date: "2026-11-24T23:00:00+08:00"
description: "AFFiNE 是一个隐私优先、本地优先的开源知识库，把文档、白板、数据库和多维表格融合在同一块无界画布上。本文从 BlockSuite 块模型、Yjs/y-octo CRDT、NBStore 多层存储讲到 Docker 自托管与源码构建，带你完整跑通这个 7.7 万 star 的 Notion + Miro 替代方案。"
author: "Cheman"
slug: affine
github_repo: toeverything/AFFiNE
draft: false
tags: ["AFFiNE", "TypeScript", "Rust", "CRDT", "知识库", "GitHub Trending"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AFFiNE**（`toeverything/AFFiNE`）。它想做的事很直接——把 Notion 的文档、数据库和 Miro 的无界白板塞进同一个工作区，同时坚持本地优先（local-first）和可自托管。项目目前约 7.7 万 star、5 685 个 fork，主语言是 TypeScript，核心数据层则大量使用 Rust。本文从架构原理一路讲到 Docker 部署和源码构建，带你完整过一遍。

## 一、项目概述

AFFiNE 由 toeverything 团队开源，官方给自己的定位是 "a next-gen knowledge base that brings planning, sorting and creating all together"。README 里的说法更直白：一个隐私优先、本地优先、开箱即用的 Notion & Miro 替代品，面向"创意密度很高"的人。

它要解决的核心痛点，是传统知识工具把"写"和"画"割裂了：文档工具擅长结构化文本，白板工具擅长空间化思考，数据库工具擅长组织信息，但三者之间的内容很难自由流动。AFFiNE 的做法是让文档和白板共享同一套块（block）模型——同一篇内容，既可以用页面模式阅读，也可以切到无界画布（edgeless canvas）上自由摆放。

核心特性可以归纳为六条：

- **文档与白板真正融合**：富文本、便签、嵌入网页、多视图数据库、链接页面、形状、幻灯片都能作为块放到无界画布上，不是两个独立产品拼起来的。
- **多模态 AI 助手**：AFFiNE AI 支持把大纲转成演示文稿、把文章总结成思维导图、整理任务清单，也能用自然语言直接生成原型页面。
- **本地优先**：数据默认落在你自己的磁盘上，不依赖云端也能打开和编辑；联网后再做实时同步与多人协作。
- **跨平台客户端**：Web、Electron 桌面端、iOS/Android 移动端共用一套前端代码与编辑器内核。
- **可自托管**：官方提供 Docker 镜像与 compose 编排，社区版（CE）在 MIT 许可下可免费自托管，也能 fork 后自行改造。
- **开放的编辑器内核**：底层编辑器 BlockSuite 独立开源，第三方块和插件体系在规划中。

从成熟度看，这个项目已经不是玩具：仓库创建于 2022 年 7 月底，最新 release 为 `v0.27.4`，默认开发分支是 `canary`，最近一次推送就在 2026 年 11 月 24 日，日增 star 约 589。许可证方面，仓库同时带有 `LICENSE` 与 `LICENSE-MIT` 两个文件，README 明确说明社区版（Community Edition）采用 MIT 许可；企业版（Enterprise Edition）尚未发布，会包含白标、SSO、高级审计等能力。

和 Notion、Miro 的差异不只在功能清单上。Notion 和 Miro 都是闭源 SaaS，数据放在厂商云端，插件能力受限；AFFiNE 把"数据主权"和"可扩展的块模型"当成第一性原则，代价则是部署和同步链路更复杂——这也是本文后面要重点拆的部分。

## 二、技术原理

### 2.1 整体架构

AFFiNE 是一个典型的 Yarn workspaces 单仓库（monorepo），顶层按"运行位置"而不是"技术栈"划分：

```text
AFFiNE/
├── packages/
│   ├── frontend/          # 所有跑在客户端里的代码
│   │   ├── apps/          # web / electron / mobile / admin 等入口
│   │   ├── core/          # 业务核心：模块、路由、命令、组件
│   │   ├── component/     # 独立 UI 组件库
│   │   ├── native/        # NAPI-RS 原生模块（Node 侧）
│   │   └── electron-api/  # 主进程与渲染进程之间的 API 契约
│   ├── backend/
│   │   ├── server/        # @affine/server，GraphQL + 同步服务
│   │   └── native/        # 服务端原生依赖
│   └── common/            # 同构代码与基础库
│       ├── infra/         # 依赖注入 / 生命周期基础设施
│       ├── nbstore/       # 文档与 Blob 的分层存储抽象
│       └── theme/         # 主题
├── blocksuite/            # 开源协作编辑器内核
│   ├── framework/         # 块模型、文档、事件
│   ├── affine/            # AFFiNE 侧的具体块实现
│   └── data-view/         # 多维表格视图
├── tools/                 # 构建、CI、代码生成工具
└── tests/                 # Playwright E2E 与集成测试
```

这个划分带来一个好处：`packages/common` 和 `blocksuite` 里的代码不关心自己跑在浏览器、Electron 还是 Node 里，平台差异被收敛到 `apps/` 和 `native/`。坏处是依赖图很深，首次 `yarn install` 和原生模块编译都比较重。

### 2.2 块模型：文档与白板共享同一棵块树

AFFiNE 的编辑器内核是 BlockSuite。它把一篇文档建模成一棵块树（block tree），每个块有唯一的 `id`、类型（paragraph、heading、image、database、shape……）和属性（props）。页面模式和无界画布模式并不是两份数据，而是同一棵块树的两种渲染方式：

- 页面模式按线性顺序排版，适合阅读和写作；
- 无界画布模式给每个块附加平面坐标和层级，按空间位置渲染，适合头脑风暴和演示。

这就是 README 里"docs and whiteboard are now fully merged"的技术含义。传统产品通常需要"把文档转成白板"或"把白板嵌入文档"，转换过程会丢结构；AFFiNE 里不存在转换，只存在视图切换。

块模型还带来组合能力：数据库块（database block）本身是一个容器，内部可以嵌套其他块；`data-view` 则负责把同一批记录渲染成表格、看板、日历等不同视图。所以"多维表格"在 AFFiNE 里不是独立应用，而是块树上的一个节点。

### 2.3 本地优先：CRDT + 分层存储

本地优先（local-first）是 AFFiNE 最核心的工程约束，它由三层机制共同实现。

**第一层是 CRDT 数据结构。** AFFiNE 使用 Yjs 作为协作数据模型，每个文档对应一个 Y.Doc。CRDT（Conflict-free Replicated Data Type，无冲突可复制数据类型）的特点是：多个副本可以离线各自修改，重新连上后合并结果与操作顺序无关，不会产生"最后写入者覆盖一切"的数据丢失。前端依赖里能直接看到 `yjs ^13.6.27` 和 `y-protocols ^1.0.6`。

**第二层是原生 CRDT 实现 y-octo。** 纯 JavaScript 的 Yjs 在超大文档和移动端上会有性能压力，teomething 因此用 Rust 写了 y-octo——README 的描述是"native, high-performance, thread-safe YJS CRDT implementation"，作为客户端与服务端实现本地优先的底层引擎。它通过 NAPI-RS 编译成 Node 原生模块，这正是构建时必须执行 `yarn affine @affine/native build` 的原因。

**第三层是 NBStore 的分层存储抽象。** `@affine/nbstore` 把"文档二进制"和"附件 Blob"拆成两类存储，再用 `SpaceStorage` 组合起来。README 给出的最小用法是：

```ts
import { IndexedDBDocStorage } from '@affine/nbstore/idb';

const storage = new IndexedDBDocStorage({
  peer: 'local',
  spaceId: 'my-new-workspace',
});

await storage.connect();
const doc = await storage.getDoc('my-first-doc');
```

需要同时管理文档和图片时，把多个存储塞进同一个 `SpaceStorage`：

```ts
import { SpaceStorage } from '@affine/nbstore';
import { IndexedDBDocStorage } from '@affine/nbstore/idb';
import { SqliteBlobStorage } from '@affine/nbstore/sqlite';

const storage = new SpaceStorage([
  new IndexedDBDocStorage({}),
  new SqliteBlobStorage({}),
]);

await storage.connect();
await storage.get('doc').pushDocUpdate({
  docId: 'my-first-doc',
  bin: new Uint8Array(),
  editor: 'me',
});
await storage.tryGet('blob')?.get('img');
```

这段设计的关键在于"存储是同构的"。Web 端用 IndexedDB，桌面端用 SQLite，云端可以换成远端实现，而上层业务代码只面对 `SpaceStorage` 接口。README 还提供了 Worker 版本 `SpaceStorageWorkerClient`，把存储操作挪到 Web Worker，避免大文档读写阻塞 UI 线程。

### 2.4 前端模块化：工作区插件与依赖注入

`packages/frontend/core/src/modules` 下有 80 多个模块目录，从 `workspace`、`workspace-engine`、`storage`、`doc`、`editor`，到 `ai-button`、`cloud`、`permissions`、`share-doc`、`journal`、`tag`。官方教程给出的设计原则是：

> Each workspace plugin has its state and is isolated from other workspace plugins. The workspace plugin is responsible for its own state management, data persistence, synchronization, data backup and recovery.

翻译过来就是：每个工作区插件状态隔离，并自己负责状态管理、持久化、同步、备份与恢复。模块之间不直接互相 import 具体实现，而是通过 `@toeverything/infra` 提供的依赖注入与生命周期容器装配。这样同一套业务代码可以跑在 Web、Electron 和移动端，只替换平台相关的 service 实现。

状态层用的是 Jotai（`jotai ^2.10.3`、`jotai-scope ^0.7.2`）配合 React 19；跨进程通信用 `async-call-rpc`，Electron 主进程与渲染进程之间通过 `@affine/electron-api` 定义类型安全的 RPC 契约。UI 层则是 React 19 + vanilla-extract + Radix UI，图表用 Recharts，代码高亮用 Shiki，数学公式用 KaTeX，流程图用 Mermaid——这些都是 `@affine/core` 依赖里能查到的真实选型。

### 2.5 服务端与同步

自托管场景下，AFFiNE 服务端不是一个单体进程就完事。官方 compose 定义了四个服务：

- `affine`：主服务，镜像 `ghcr.io/toeverything/affine:stable`，暴露 3010 端口；
- `affine_migration`：一次性迁移任务，启动命令是 `node ./scripts/self-host-predeploy.js`；
- `redis`：缓存与实时协作的 pub/sub；
- `postgres`：主数据库，镜像为 `pgvector/pgvector:pg16`。

主服务通过 `DATABASE_URL=postgresql://affine@postgres:5432/affine` 连接 Postgres，通过 `REDIS_SERVER_HOST=redis` 连接 Redis，并用 `DEPLOYMENT_TYPE=selfhosted` 声明部署形态。`depends_on` 里用了 `condition: service_healthy` 和 `service_completed_successfully`，保证数据库就绪、迁移跑完之后主服务才启动——这是自托管能否一次成功的关键细节。

数据库用 pgvector 而不是官方 Postgres 镜像，说明服务端需要向量检索能力，对应配置里的 `indexer`（索引器）和 `workspace-indexer-embedding` 模块。默认配置 `config.example.json` 把索引器设为开启，并指定 `provider.type` 为 `embedded`，也就是用内置的嵌入实现，不强制依赖外部向量服务。

### 2.6 设计取舍

这套架构的取舍很明显。选择 CRDT 而不是 OT（Operational Transformation），换来离线编辑和端到端最终一致，代价是文档元数据会随编辑历史增长，需要服务端做压缩和快照；选择 Rust 写 CRDT 和数据库，换来性能和跨端一致性，代价是构建链多了一整套 Rust 工具链；选择单仓库，换来跨端代码复用，代价是新贡献者的上手成本。

## 三、安装与快速开始

AFFiNE 有三条上手路径：直接用官方托管版、Docker 自托管、从源码构建。前两条适合使用者，第三条适合开发者。

### 3.1 环境要求

从源码构建需要 Node.js 与 Rust 两套工具链：

- Node.js：`.nvmrc` 固定为 `22.23.4`，`package.json` 的 `engines` 要求 `>=22.12.0 <23.0.0`；
- Yarn：4.x，由 `packageManager` 字段固定为 `yarn@4.18.0`，必须通过 Corepack 启用，Yarn 1 不可用；
- Rust：通过 rustup 安装，具体版本由仓库根目录的 `rust-toolchain.toml` 固定，首次在仓库内构建时自动安装。

### 3.2 Docker 自托管

仓库的 `.docker/selfhost/` 目录已经给出完整的 compose 编排和配置模板。基本流程是克隆仓库、准备配置目录、启动编排：

```bash
git clone https://github.com/toeverything/AFFiNE
cd AFFiNE/.docker/selfhost

mkdir -p config
cp config.example.json config/config.json

docker compose up -d
```

compose 会把宿主机的 `./config` 挂载到容器内的 `/root/.affine/config`，把 `./data/storage` 挂载到 `/root/.affine/storage`，所以配置和数据都留在仓库目录下，升级镜像不会丢。启动完成后访问 `http://localhost:3010`。

最小配置只需要关心三块：

```json
{
  "deployment": { "type": "selfhosted" },
  "server": { "name": "AFFiNE Self Hosted Server" },
  "indexer": { "enabled": true, "provider.type": "embedded" }
}
```

`deployment.type` 必须是 `selfhosted`，否则服务端会按云端模式做校验；`indexer` 控制全文与语义索引，关掉它搜索能力会退化。

### 3.3 从源码构建 Web 端

```bash
git clone https://github.com/toeverything/AFFiNE
cd AFFiNE

corepack enable
yarn install
yarn affine @affine/native build

yarn dev
```

`yarn install` 的 `postinstall` 会自动执行 `yarn affine init` 和 `yarn husky`，初始化工作区并安装 git hooks。`yarn affine @affine/native build` 会编译 `packages/frontend/native` 并用 NAPI-RS 生成 Node 绑定，第一次执行耗时较长。

`yarn dev` 会提示选择要运行的包，选 `@affine/web`，然后打开 `http://localhost:8080`。也可以用 `-p` 跳过交互：

```bash
yarn dev -p @affine/web
```

只跑 Web 端时，工作区数据存在浏览器本地，足够做编辑器和 UI 开发。要调试账号、同步、协作、AI 这些云端能力，还需要把服务端跑起来。

### 3.4 本地跑服务端

服务端依赖 Postgres、Redis 和 Mailhog，仓库提供了 dev 版 compose：

```bash
cp ./.docker/dev/compose.yml.example ./.docker/dev/compose.yml
cp ./.docker/dev/.env.example ./.docker/dev/.env

docker compose -f ./.docker/dev/compose.yml up
```

然后编译服务端原生模块、准备环境变量、初始化数据库：

```bash
yarn affine @affine/server-native build

cp packages/backend/server/.env.example packages/backend/server/.env
yarn affine server init

yarn affine server dev
```

`server init` 在有新迁移时需要重新执行。服务端启动后会创建三个测试账号：`dev@affine.pro / dev`（最多 3 名成员）、`pro@affine.pro / pro`（最多 10 名成员）、`team@affine.pro / team`（自带一个 Team Workspace）。前端仍然用 `yarn dev` 启动，用这些账号登录即可联调。

### 3.5 验证

- Web 端开发服务器：`http://localhost:8080` 能打开编辑器并新建文档；
- 自托管服务：`http://localhost:3010` 能打开登录页，`docker compose ps` 中四个服务状态正常；
- 单元测试：`yarn test`（Vitest）；
- 类型检查：`yarn typecheck`；
- 代码检查：`yarn lint`（oxlint + oxfmt）。

## 四、使用方法与实战

### 4.1 用一个工作区串起文档、白板与数据库

AFFiNE 的日常使用围绕"工作区（workspace）"展开。一个典型的内容生产流程是：

1. 在页面模式里写需求文档，用标题块搭建大纲；
2. 插入数据库块，把需求拆成条目，切换到看板视图排优先级；
3. 把整篇文档切到无界画布模式，把关键段落、便签和流程图铺开，做评审；
4. 用 AFFiNE AI 把大纲转成幻灯片，或者把长文压缩成思维导图。

因为三种形态共享块树，第 3 步不会产生"另一份副本"，第 4 步的 AI 输出也可以直接作为新块插回原文档。这是它和"Notion + 独立白板工具"组合使用最大的体验差异。

### 4.2 自托管配置进阶

`config.json` 的完整字段由 `schema.json` 约束，仓库里的 `config.example.json` 只是最小示例。实际部署时最常调整的是服务名、索引器和存储路径。可以用环境变量覆盖部分行为，compose 里已经给出三个关键变量：

| 变量 | 示例值 | 作用 |
| --- | --- | --- |
| `REDIS_SERVER_HOST` | `redis` | Redis 主机名，实时协作与缓存依赖 |
| `DATABASE_URL` | `postgresql://affine@postgres:5432/affine` | Postgres 连接串 |
| `DEPLOYMENT_TYPE` | `selfhosted` | 部署形态，影响服务端校验逻辑 |

数据卷对应关系也要记清楚：`./data/storage` 存文档与附件，`./data/postgres` 存数据库。备份时这两个目录一起打包，只备份 Postgres 会丢掉 Blob。

升级镜像的标准动作是拉新镜像后重启，迁移服务会自动执行 `self-host-predeploy.js`：

```bash
docker compose pull
docker compose up -d
```

### 4.3 在业务代码里直接使用 NBStore

如果你要基于 AFFiNE 做二次开发，NBStore 是最值得先读的包，因为它把"文档从哪来、存到哪去"抽象干净了。除了前面展示的 `IndexedDBDocStorage` 和 `SpaceStorage`，它还支持把存储放到 Worker 里：

```ts
import { SpaceStorageWorkerClient } from '@affine/nbstore/op';
import { IndexedDBDocStorage } from '@affine/nbstore/idb';

const client = new SpaceStorageWorkerClient();
client.addStorage(IndexedDBDocStorage, {
  peer: 'local',
  spaceType: 'workspace',
  spaceId: 'my-new-workspace',
});

await client.connect();
await client.call('pushDocUpdate', {
  docId: 'my-first-doc',
  bin: new Uint8Array(),
  editor: 'me',
});
```

注意 `addStorage` 的配置必须是可结构化克隆（structure-cloneable）的类型，因为它要跨线程传递；调用未注册的操作会直接抛错，例如 `Handler for operation [listHistory] is not registered.`。这条约束在写自定义存储时很容易踩。

### 4.4 多端调试

`yarn dev` 支持的目标不止 Web：

```bash
yarn dev -p @affine/electron
yarn dev -p @affine/mobile
yarn dev -p @affine/admin
```

桌面端构建细节在 `docs/building-desktop-client-app.md`，移动端有 `@affine/ios` 和 `@affine/android` 两个目标。E2E 测试按套件拆分，跑之前先装浏览器：

```bash
npx playwright install
yarn workspace @affine-test/affine-local e2e
```

`affine-local` 不需要服务端；`affine-cloud`、`affine-cloud-copilot`、`affine-desktop-cloud` 需要本地服务端配合。

### 4.5 一个端到端的团队自托管场景

假设要给一个 8 人小组搭内部知识库：

1. 找一台 4C8G 的 Linux 机器，装好 Docker 与 Compose；
2. 克隆仓库，只保留 `.docker/selfhost` 目录，把 `config/config.json` 里的 `server.name` 改成团队名；
3. `docker compose up -d`，确认 `affine_postgres`、`affine_redis` 健康，`affine_migration_job` 退出码为 0；
4. 在反向代理上把 443 转发到 3010，配置好 TLS；
5. 团队成员注册后，用工作区权限模块控制读写；
6. 每天定时备份 `data/storage` 与 `data/postgres`。

这套流程不需要改一行代码，也不需要外部对象存储。如果团队要接入 SSO 或审计日志，那就属于尚未发布的企业版能力，社区版需要自己改。

## 五、常见问题与解决方案

**现象：`yarn install` 报 Node 或 Yarn 版本不匹配。**
原因：Node 不在 22.12.0～22.x 区间，或者 `yarn -v` 输出的是 1.x。解决：用 `fnm use --install-if-missing` 或 `nvm install && nvm use` 切换到 `.nvmrc` 指定的版本；执行 `corepack enable`，确认 `yarn -v` 打印 4.x。

**现象：macOS 上 `yarn affine @affine/native build` 编译失败。**
原因：PATH 里的 `strip` 来自 binutils，而不是系统自带版本。解决：调整 PATH 让系统 `strip` 优先，官方讨论区 issue #2840 有详细说明。

**现象：Windows 上克隆或安装时报 `EPERM: operation not permitted, symlink`。**
原因：仓库使用了符号链接，Windows 默认禁止普通用户创建 symlink。解决：开启开发者模式，然后用管理员权限执行 `git config --global core.symlinks true` 再克隆。

**现象：拉取最新 `canary` 后应用启动不了。**
原因：依赖或 Rust 绑定已经变化，旧的 `node_modules` 和原生模块不匹配。解决：重新执行 `yarn install` 和 `yarn affine @affine/native build`；涉及服务端时再补一次 `yarn affine @affine/server-native build`。

**现象：Playwright 报找不到浏览器。**
原因：只装了 npm 包，没下载浏览器二进制。解决：执行 `npx playwright install`。

**现象：PR 的 `license/cla` 检查一直是红的。**
原因：CLA 要求 PR 里每一个 commit author 都签署协议，且 commit 邮箱必须绑定到对应 GitHub 账号。解决：打开 `https://cla-assistant.io/toeverything/AFFiNE` 签署，用 `git log --format='%an %ae'` 核对邮箱，必要时改写 commit 身份后强推。

**现象：自托管升级后 Postgres 起不来。**
原因：AFFiNE 0.20 起默认数据库镜像从 `postgres:16` 换成了 `pgvector/pgvector:pg16`，旧数据目录的主版本不匹配。解决：把 compose 里的镜像 tag 改成与现有数据目录一致的主版本，或先导出数据再初始化新库。

**现象：自托管主服务反复重启，日志提示连不上数据库。**
原因：`affine` 依赖 `postgres` 健康检查和迁移任务完成，若迁移失败，主服务不会启动。解决：先看 `docker compose logs affine_migration`，确认 `DATABASE_URL` 与 Postgres 服务名一致；再确认 `data/postgres` 目录权限可写。这类问题在自定义网络或改了服务名时最常见。

**现象：端口 3010 被占用。**
原因：宿主机已有同端口服务，或上一次的容器没清理干净。解决：`docker compose down` 后改用 `'3010:3010'` 之外的本机端口映射；同时确认没有残留的 `affine_server` 容器。

## 六、总结

AFFiNE 值得关注的地方，不是"又一个 Notion 替代品"这个标签，而是它真的把文档、白板和数据库统一到了一套块模型上，并且用 CRDT + Rust 把本地优先做成了架构底座而不是营销词。7.7 万 star、持续日更的 `canary` 分支、完整的自托管编排，说明它已经过了"demo 很好看"的阶段。

它适合三类人：想要数据自主权的团队、需要把写作和空间化思考放在一起的创作者、想研究现代协作编辑器架构的开发者。不太适合只想要一个轻量笔记应用的人——Node 22 + Rust + Yarn 4 的构建链和四服务自托管编排，对个人用户来说偏重；企业级的 SSO、审计能力也还没随社区版提供。

后续值得盯的方向有三个：BlockSuite 的第三方块与插件体系能否真正落地、y-octo 在超大文档上的表现、以及服务端索引器从 embedded 走向可插拔向量库的进度。如果你在做知识管理或协作编辑相关产品，这个仓库的 `packages/common/nbstore` 和 `blocksuite/framework` 两层，值得单独花时间读。

项目地址：<https://github.com/toeverything/AFFiNE>
