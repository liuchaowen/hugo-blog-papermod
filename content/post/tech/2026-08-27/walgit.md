---
title: "WalGit：一个跑在对象存储前的单二进制 Git 服务器"
date: 2026-08-27
description: "WalGit 是 tobi 开源的单二进制 Git 服务器，用对象存储（S3/GCS）作为唯一真相源，以写前日志（WAL）+ 比较并交换（CAS）取代数据库与主从协商，让无状态、可横向扩展的 Git 托管在比仓库更小的机器上稳定运行。本文拆解其架构与关键技术。"
author: "Cheman"
slug: walgit
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, Rust, Git, 对象存储, 分布式系统]
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

今天在 GitHub Trending 上看到一个有意思的项目：**WalGit**，一句话描述它的核心价值——用一个二进制文件加上一个 S3/GCS 桶，就能跑起一套「无数据库、无主节点、无本地重要状态」的 Git 托管服务，而且能稳稳承载比运行机器还大的仓库。

## 一、项目概述

WalGit 是一个用 Rust 实现的 Git 服务器，目标是「**一个二进制文件 + 一个对象存储桶 = 一套 Git 托管**」。它不依赖数据库、不需要选主、也不在本地保存任何重要状态：任何运行 WalGit 的机器都只是个可随时丢弃的缓存，真正的仓库永远在对象存储桶里。

它直接落地了 Cursor 在 [*Git at any scale*](https://cursor.com/blog/git-at-any-scale) 中提出的「Continuity」架构（文章被原样保留在 `docs/reference/` 中），并补上了「在比仓库还小的机器上托管单体仓库（monorepo）」所必需的能力。

开箱即用的能力包括：

- 智能 HTTP（v0/v2）的 fetch 与 push
- `bundle-uri` 克隆——以静态文件方式分发全新克隆与增量追平
- Git LFS
- 带浏览功能的 Web UI 与 JSON API（附带零依赖 SDK）
- 每仓库的 push 策略（保护分支、组、仅快进等）
- Webhook 事件桥
- 可横向扩展到「比机器还大的仓库」

最极简的部署就是三步：写一份配置、起一个二进制、push 一个尚不存在的仓库名（会自动创建）：

```sh
# 1. 一个桶 + 一份配置
cat > walgit.toml <<'EOF'
[server]
listen = "0.0.0.0:8080"
public_url = "https://git.example.com"
auto_create_on_push = true
[server.auth]
mode = "token"
anonymous_read = false
tokens = [{ principal = "me", token_env = "WALGIT_TOKEN_ME", write = true }]
[store]
backend = "s3"
bucket = "my-walgit"
[store.s3]
endpoint = "https://s3.us-east-1.amazonaws.com"
region = "us-east-1"
EOF

# 2. 启动
WALGIT_TOKEN_ME=$(openssl rand -hex 24) walgit serve --config walgit.toml

# 3. 向一个不存在的名字 push，仓库即被创建
git -c http.extraHeader="Authorization: Bearer $WALGIT_TOKEN_ME" \
  push https://git.example.com/acme/app.git main
```

多台机器指向同一个桶，就能一致地服务同一批仓库，中间没有任何需要协调的状态；把它们全部杀掉，你只会丢掉一点「温热」，别的什么都不会丢。

## 二、技术原理

### 为什么是这个形态

Git 是分布式的，但托管它之所以痛苦，根源几乎都在一件事上：**packfile（打包文件）**。仓库里的一切都被压缩成巨大的二进制包，布局以「尽量小」为目标，而不是「按顺序读」——每次 Git 操作都是对数 GB 数据的随机游走。在笔记本上（文件在 page cache 里）这没问题，但一旦走网络文件系统就会灾难性变慢，这也是「把仓库扔到 NFS 上」在每家大厂都失败的原因。

GitHub 的 Spokes 用「真实仓库留在本地 NVMe、由上游 `git` 干活、在 packfile 层面做强一致复制」扛住了规模，代价是跨固定副本集的三阶段提交、一张把每个仓库映射到机器的数据库，以及一整支「宠物」机队。

Continuity 的洞见改变了经济账：**把对象存储里的写前日志（WAL）变成唯一的真相源，把每个磁盘上的仓库都变成缓存**。一次 push 作为不可变对象存入桶中，只有当一个极小的 manifest 通过**比较并交换（CAS）**被改写时才对外可见。这个 CAS *就是*共识——没有选举、没有法定人数、没有主节点。任何一个实例都可以接收 push；两个并发的实例不可能同时获胜。一份从没见过某仓库的副本，读一下日志就有了。读取天然一致，因为每次读都先问桶「有没有变化」（条件 GET，通常是 304）。压缩由持有租约的一方做一次并写回日志，于是副本下载的是已压缩的包，而不是自己重新打包。

### 桶里到底存了什么

仓库在桶里本质上就是一条 WAL，路径在 `repos/<owner>/<repo>/` 之下：

- `manifest.pb`：极小，通过 CAS 改写——记录 head 序号、当前 pack 集合、checkpoint 指针、设置，**这是唯一的线性化点**
- `log/<seq>.pb`：不可变日志条目（PUSH、COMPACT、CHECKPOINT、SETTINGS）
- `wal/<checksum>.pack|.idx|.rev|.bitmap|.commit-graph`：内容寻址的不可变 pack 及其伴随文件
- `checkpoints/<seq>/`：折叠后的 ref 快照 + pack 清单，冷启动 = 快照 + 尾部日志
- `bundles/`、`leases/`（带 TTL 的 CAS，唯一的跨实例互斥原语）、`policy.json`、`lfs/objects/`、`events/cursor.json`

### 一次 push 与一次 read 的协议

**Push**：WalGit 的 `receive-pack` 在临时目录里 `git index-pack --fix-thin --rev-index` 索引 pack，校验连通性与策略，把 `pack ∥ idx ∥ 日志条目` 上传，然后 CAS 改写 manifest。如果拿到 412（并发冲突），就重读、重新校验每个 ref 的旧值并重试。对同一仓库同一实例上的并发 push 会被**组提交**进同一次 CAS。客户端只有在桶真正写成功后才会看到 `ok`。

**Read**：一次对 manifest 的条件 GET；304 就用本地副本服务，200 就应用新条目。应用什么取决于请求需要什么：

- **refs**：快照 + 日志 → `packed-refs`，无需 pack（用于广告、API、bundle 列表）
- **serve**：按本机容量持有的 pack 集合（小 pack 与 history pack 在本地，过大的 base 走 range 读取）
- **full**：全部本地，用于 repack
- **objects**：remote reader，用于在放不下的仓库上支撑 Web UI

pack 下载跑在独立运行时上，绝不阻塞 refs 请求。

### 小机器托管大仓库的三个关键增量

WalGit 在 Continuity 基础上补的正是「单体仓库跑在小机器上」需要的：

1. **remote reader**（HTTP range 请求）：为 pack 永远放不进实例的仓库提供 refs 与网页服务
2. **history pack**：commit 和 tree 留在本地，blob 留在桶里
3. **bundle-uri**：把克隆字节量移出服务器——全新克隆和增量追平都是桶或 CDN 直接分发的静态文件

## 三、安装与快速开始

### 环境要求

- Rust（见 `rust-toolchain.toml`，要求 1.90+）
- `protoc`
- Node 24 + pnpm（仅构建 Web UI 时需要）
- 一个 S3 兼容桶或 GCS 桶

### 构建方式（任选其一）

```sh
# 方式 A：构建 Web UI + CLI
just web-build && cargo build --release -p walgit-cli

# 方式 B：Nix
nix build .#walgit

# 方式 C：容器
podman build -t walgit -f Containerfile .
```

### 单机最快跑起来

```sh
# 用 rustfs  启一个本地 S3 存储
just dev-store
./target/release/walgit-server --config walgit.standalone.toml
open https://walgit.localhost:8080/
```

`walgit.standalone.toml` 是单机型（自签 TLS + rustfs + 全角色），建议从这里起步；`walgit.example.toml` 则是每个配置项带默认值与注释的参考。

## 四、使用方法与实战

### 三种认证模式

| 模式 | 谁能进 | git 如何认证 |
|---|---|---|
| `none` | 人人都是可写的 `anon`——仅用于 loopback 实验 | 无 |
| `token` | 配置里的静态 `tokens`（`token_env` 从环境变量读密钥） | `Authorization: Bearer <token>`，或把 token 当 HTTP Basic 密码 |
| `oidc` | 任意 OpenID Connect 发行方（Google、Entra、Okta、Auth0、Keycloak、Dex、GitLab…） | 浏览器登录一次后签发的 **walgit access token**（HMAC 无状态，旋转 `session_secret` 即全部吊销） |

### 开发者一键接入

任何开发者机器都能用一条幂等命令完成接入：

```sh
sh -c "$(curl -fsSL 'https://git.example.com/services/public/install.sh')"
```

它会把 token 存进只有用户可读的文件、安装一个极小的 git credential helper（git ≥ 2.46，对 `get` 返回 `authtype=Bearer`，真遇到 401 时 `erase` token 并告知去哪领新的），并打开 `transfer.bundleURI`。`?repo=owner/name` 即可紧随其后完成克隆。

### 角色拆分与放置策略

`server.roles` 支持：`serve`（git/API/UI/bundles/LFS）、`maintain`（checkpoint/bundle/压缩/fsck 修复）、`events`（webhook 桥）。留空 = 全角色。多机时，用 placement glob 把单体仓库放到带 SSD 的机器（`cache.mode = "disk"`），其余放小机器，前面按 `/<owner>/<repo>` 路由即可——任何数量的 `serve` 主机可指向同一桶，每个仓库指定一个 maintainer，就完成了。

测试与质量门也是成型工程化的：

```sh
just test      # 快速密封层（<1min）：单元 + 快速集成，内存存储 + 真实 git
just e2e       # 对真实服务器跑 git（~20s）
just warnings  # 全 target 零 rustc 警告
just ci        # 以上全部
cargo test -p walgit-server --test sim   # 故障注入模拟（崩溃、分区、陈旧读）
just test-s3   # 对本地 rustfs 跑存储契约
```

## 五、常见问题与解决方案

**Q1：push 提示 412 / 并发冲突失败？**
这是 CAS 共识的正常表现，而非故障。manifest 改写发生冲突时，服务器会重读并重新校验每个 ref 的旧值后重试；正常情况下客户端最终会看到成功。无需人工介入。

**Q2：单机内存/磁盘放不下大仓库怎么办？**
这正是 WalGit 的设计目标。通过 `placement` 配置把大仓库放到带 SSD 的 `serve` 主机（`cache.mode = "disk"`），blob 走 history pack 留在桶里，冷数据经 remote reader 以 range 读；克隆字节则完全由 bundle-uri 的静态文件承担，服务器不传输 pack 主体。

**Q3：如何做 TLS / 大文件下载的字节卸载？**
WalGit 自身可终结 TLS（`walgit.standalone.toml` 即自签）。前面再放一层 nginx（`deploy/nginx.conf.example`）可做公共 TLS、按凭据的 `auth_request`，以及字节卸载：服务器用 `X-Accel-Redirect` 回答 bundle/LFS 下载，由 nginx 直接从桶流式读取并缓存对象。

**Q4：OIDC 登录后所有 token 突然失效？**
WalGit 的 access token 是 HMAC 无状态的（`session_secret` 签名）。一旦轮换 `session_secret`，所有已签发 token 立即失效。若需让现有 token 继续可用，不要轮换该密钥。

**Q5：跨实例会不会数据不一致？**
不会。每次读都先向桶做条件 GET 重新校验，没有「最终一致」的窗口；本地磁盘与内存都只是缓存，桶才是仓库本身。

## 六、总结

WalGit 的优雅之处在于它把「Git 托管」这个历来需要数据库 + 主从 + 宠物机队才能扛住的难题，重新表述成了「对象存储 + 一条 WAL + 一次 CAS」：**manifest 的 CAS 是唯一的提交点，之前不可见、之后幂等且可重放**。配合 bundle-uri、remote reader、history pack 三项增量，它把这套架构真正落到了「小机器托管超大仓库」的单体仓库场景里。

值得记住的几条不变式：

- 不可变对象按内容寻址；除 manifest、bundle 列表与 lease 外，没有任何东西被覆盖
- 本地磁盘是缓存，内存是缓存，桶才是仓库
- 放置是配置出来、而非推断出来的；refs 级读取处处可用，对象级工作只在被放置处运行
- 任何慢操作都是带 id、日志与进度流的「task」，对 git（sideband 2）与浏览器（SSE）都有叙述

如果你正被「Git 服务太重、存储成本太高、扩展太疼」困扰，WalGit 的 `AGENTS.md`（完整架构与运维手册）和 `docs/ROUNDTRIPS.md`（以「到桶的往返次数」为成本模型的协议评审）值得一读。项目采用 MIT 许可，仓库地址：<https://github.com/tobi/walgit>。
