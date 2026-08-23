---
title: "BookOrbit：自托管的全格式电子书与有声书阅读管理平台"
date: 2026-08-24
description: "BookOrbit 是一个 AGPL 许可的自托管阅读平台，统一管理电子书、PDF、漫画与有声书，支持 Kobo、KOReader 与网页阅读器三方双向同步，并打通 Hardcover、Readwise、StoryGraph 等外部服务。"
author: "Cheman"
slug: bookorbit
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 自托管, 电子书, 阅读]
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

今天在 GitHub Trending 上看到一个有意思的项目：**BookOrbit**——一个把电子书、PDF、漫画、有声书统一收进自己服务器的自托管阅读平台，核心价值在于「读在哪里都能续上」。

## 一、项目概述

BookOrbit 是一个自托管的图书馆与阅读平台，覆盖电子书（EPUB、KEPUB、MOBI、AZW3、AZW、FB2）、PDF、漫画（CBZ、CBR、CB7）以及有声书（M4B、MP3、M4A、OPUS、OGG、FLAC）。它的定位很明确：把分散在不同设备、不同 App 里的「读书进度、高亮、笔记」收敛成一个你拥有完全控制权的中心。

围绕这个核心，它提供了一组相当完整的特性：

- **三端双向同步**：Kobo 设备、KOReader 与 BookOrbit 网页阅读器之间，进度、高亮、笔记双向流动，在任意一处合上，在另一处接着读。
- **14 个元数据提供商**：Google Books、Open Library、Amazon、Goodreads、Kobo、Hardcover、Audible、Audnexus、Libro.fm、iTunes，以及针对漫画的 ComicVine、轻小说的 RanobeDB、韩文与波兰语目录 Aladin / Lubimyczytać。
- **阅读统计与成就**：每日阅读时长、热力图、连读 streaks、年度目标、月度挑战，以及跨五个类别的 50+ 成就，还会通过「Reading DNA」从真实会话历史刻画阅读风格。
- **外部同步**：把状态/进度/评分推送到 Hardcover、The StoryGraph，把新增高亮与笔记推送到 Readwise；也可回拉 Hardcover 阅读历史补全条目。
- **多用户与 SSO**：细粒度权限 + 隔离的阅读数据，原生支持 Authentik、Keycloak、Authelia 的 OIDC。
- **内容投递**：OPDS、Send-to-Kindle 邮件投递、浏览器拖拽上传，以及 Book Dock 拖放文件夹的免值守导入。

## 二、技术原理

从仓库的 `package.json` 与 `Dockerfile` 可以看出，BookOrbit 是一个典型的 pnpm monorepo，前后端分离、统一打包进一个运行时镜像。

前端是 Vue（客户端代码位于 `client/`，文案走 Vue I18n，源语言键只维护在 `client/src/locales/en.json`），后端是 TypeScript（`server/`），打包产物通过 Docker 多阶段构建拼装。仓库对工程化非常讲究：`husky` + `lint-staged` 在提交时自动格式化，`commitlint` 强制 conventional commits（类型枚举含 `feat/fix/i18n/db/perf/refactor/security/...`），并通过 `semantic-release` 自动发版——注意它刻意把 GitHub Release 创建成 **Draft**，留给维护者补一段面向用户的 Highlights 再点发布：

```js
// release.config.js
plugins: [
  ["@semantic-release/github", { draftRelease: true }],
]
```

`Dockerfile` 本身也很有看头，是三段式多阶段构建：先 `client-builder` 用 `pnpm --filter client run build-only` 出前端，再 `server-builder` 用 `pnpm deploy --prod` 裁剪生产依赖并拷贝 `dist/`，最后 `runtime` 阶段基于 `node:26.7.0-alpine`。

几个值得注意的实现细节：

```dockerfile
# pnpm 11 默认 verifyDepsBeforeRun 为 install，会在每个阶段重新装依赖，
# 但各阶段只装了 frozen-lockfile 的过滤子集，重装既冗余又错误。
RUN pnpm --config.verify-deps-before-run=false --filter client run build-only
```

运行时镜像还内置了与「阅读器之外能力」相关的系统依赖：`poppler-utils`（PDF 文本提取）、`ffmpeg`（音频处理），以及一个 Python venv（`/opt/bookorbit-python`）专门跑 Kobo 的 cloudscraper。健康检查直连业务接口：

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "const p=process.env.PORT||3000;fetch('http://127.0.0.1:'+p+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
```

数据层用 PostgreSQL（从 `docker-compose` 的 `data/postgres` 与迁移目录 `server/src/db/migrations` 可见），书籍二进制与封面分别落在 `data/book-bucket` 和 `/data/covers`。存储路径通过 `.env` 的 `BOOKS_HOST_PATH` 与 `PUID/PGID` 控制，这是典型的 NAS 友好设计。

## 三、安装与快速开始

BookOrbit 的主推安装方式是 Docker Compose，全程约五分钟。

先拉取脚手架配置：

```bash
mkdir bookorbit && cd bookorbit
mkdir -p books data/app data/postgres
curl -fsSLo .env https://raw.githubusercontent.com/bookorbit/bookorbit/main/.env.example
curl -fsSLo docker-compose.yml https://raw.githubusercontent.com/bookorbit/bookorbit/main/docker-compose.yml
```

编辑 `.env`，至少设置以下必填项：

```dotenv
APP_URL=http://your-server-ip:3000   # 浏览器打开的地址
BOOKS_HOST_PATH=./books              # 书库文件所在目录

POSTGRES_PASSWORD=         # 数据库密码           openssl rand -hex 24
JWT_SECRET=                # 登录令牌签名         openssl rand -hex 32
SETUP_BOOTSTRAP_TOKEN=     # 一次性初始化向导令牌 openssl rand -hex 16
```

> 在 NAS 或书库目录属主不是 UID 1000 的机器上，务必把 `PUID` / `PGID` 设成实际属主（用 `id -u` / `id -g` 查）。配置错是首次扫描报权限错误最常见的原因。

最后启动并完成初始化：

```bash
docker compose up -d
```

打开 `http://your-server-ip:3000`，用 `SETUP_BOOTSTRAP_TOKEN` 走完初始化向导即可。可选 `LIBRARY_BROWSE_ROOT=/books` 让目录选择器从 `/books` 起步而非根目录。完整指南（反代、NAS 权限、外置数据库、环境变量参考）见官方 `bookorbit.app/installation`。

## 四、使用方法与实战

**三方同步是最强的卖点。** 以 KOReader 为例，BookOrbit 提供了官方插件：在设置里创建 KOReader 凭据并下载插件，解压后把 `bookorbit.koplugin` 拷到设备的 `koreader/plugins/`，重启 KOReader 打开任意书，用「Tools > BookOrbit Sync」连接即可。下载包已预置你的服务器地址与凭据，设备上无需手填。连接后，进度与批注双向同步，还能在设备内直接浏览、搜索、下载书库。

**元数据与整理。** 多书库用各自文件夹 + 自定义扫描规则 + 格式优先级隔离；14 个元数据提供商自动补全信息，封面单独从 iTunes / DuckDuckGo / AudiobookCovers 取；用「Smart Scopes」和「Collections」把收藏做成策展列表与基于规则的动态筛选。

**高亮与笔记。** 网页阅读器、KOReader、Kobo 的高亮合并进同一个可搜索中心，按颜色、样式、来源过滤，可导出 Markdown / CSV / JSON。

**对接外部生态。** 把阅读状态、进度、评分推到 Hardcover（可配置触发条件）、The StoryGraph，把新增高亮/笔记实时推到 Readwise；也能从 Audiobookshelf、Calibre-Web Automated 一次性迁移历史数据。

**投递。** 通过 OPDS 喂给兼容 App，用 Send-to-Kindle 邮件直送，或浏览器拖拽上传；`Book Dock` 拖放文件夹则实现免值守导入。

## 五、常见问题与解决方案

- **首次扫描报权限错误**：几乎都是 `BOOKS_HOST_PATH` 属主不是容器内的 UID 1000。在 NAS 上设 `PUID` / `PGID` 与书库真实属主一致，或用 `id -u` / `id -g` 核对。
- **OIDC 登录不通**：确认 Authentik / Keycloak / Authelia 回调地址写的是 `APP_URL` 而非 `localhost`；多用户隔离依赖 OIDC 提供的主体身份。
- **Kobo 抓取失败**：运行时依赖一个 Python venv（`KOBO_CLOUDSCRAPER_PYTHON`）跑 cloudscraper，若自行改过镜像基础或删了 `python3`，Kobo 云抓取会失效。
- **迁移自 Audiobookshelf / Calibre-Web Automated**：官方提供了专门的迁移指南（`docs/AUDIOBOOKSHELF_MIGRATION.md` 与 `docs/CALIBRE_WEB_AUTOMATED_MIGRATION.md`）；Calibre 那条要求源是「停止态快照」，别在源库仍在写入时迁移。
- **想贡献翻译**：文案走 Crowdin，PR 里只动 `en.json` 的 Vue I18n 键，未翻译的键会回退英文直到 Crowdin 出翻译。

## 六、总结

BookOrbit 把「自托管 + 多端同步 + 丰富元数据 + 外部生态打通」做成了一个开箱即用、且工程化极其扎实的项目：AGPL v3 许可、Docker 一键起、OIDC 多用户、14 个元数据源、Kobo/KOReader/网页三向同步。如果你受够了书散落在各设备、进度对不齐、又不想把阅读数据交给第三方，它是一个值得认真自托管的候选。仓库还贴心地提供了在线 Demo，想先体验再安装完全可行。
