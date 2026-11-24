---
title: "Ghost Downloader 3：一个 Python 写的全协议下载器，如何做到不合并分块也能跑满带宽"
date: "2026-11-25T00:10:00+08:00"
description: "Ghost Downloader 3 是 XiaoYouChR 开源的跨平台下载器，用 Python + PySide6 覆盖 HTTP、BT、FTP、M3U8、MPEG-DASH、eD2k 与视频站点解析。本文拆解它的引擎分层、解析器分派链、分块直写磁盘的实现，并给出 CLI 与 aria2 RPC 的实战用法。"
author: "Cheman"
slug: ghost-downloader-3
github_repo: XiaoYouChR/Ghost-Downloader-3
draft: false
tags: ["Ghost Downloader", "Python", "PySide6", "下载器", "开源", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Ghost Downloader 3**（`XiaoYouChR/Ghost-Downloader-3`）。它把一个下载器该有的东西几乎全塞进了同一个应用：HTTP、Magnet/BT、FTP、M3U8、MPEG-DASH、eD2k，外加 YouTube、Bilibili、GitHub、HuggingFace 的专门加速通道，还用 Python + PySide6 做成了 Windows / macOS / Linux / Android 四端原生界面。截至抓取时它有 17,088 star、1,034 fork，GPL-3.0 协议，最新 release 是 v4.5.11。

一个 Python 写的 GUI 下载器能拿到这个量级的关注，光靠"功能多"解释不了。真正值得看的是它的工程取舍：分块下载不落临时文件、不做事后合并；解析器按内容二次分派；UI 线程、事件循环线程、JVM 线程各有明确归属。本文按项目概述、技术原理、安装、实战、踩坑的顺序完整过一遍。

## 一、项目概述

Ghost Downloader 3 的作者是 XiaoYouChR。项目 2023 年 8 月创建，最初只是帮一位 B 站 UP 主管理资源的小工具，后来逐步长成一个覆盖桌面三平台加 Android 的下载管理器，并且把引擎层抽出来复用到了移动端。

它的核心特性可以概括成六条：

- **全协议覆盖**：`HTTP`、`Magnet/BT`、`FTP`、`M3U8`、`MPEG-DASH`、`eD2k` 全部内置，不需要外挂另一个下载工具。
- **站点级解析**：YouTube、Bilibili 支持清晰度选择、字幕、播放列表与分 P；GitHub、HuggingFace 走镜像加速。
- **浏览器接管**：配套扩展会在页面视频旁挂下载按钮，弹窗列出页面内所有媒体资源，桌面端通过本地端口无缝接手任务，登录态随请求头一起带过去。
- **分块直写**：多连接分块下载，每块用 `pwrite` 直接写到目标文件的对应偏移，结束后不需要合并文件。
- **可控可编排**：提供 aria2 兼容的 JSON-RPC 接口，第三方工具可以直接把任务投给它；下载途中还能改 URL、请求头、代理。
- **插件化 Feature Packs**：协议和站点能力都做成了 `features/` 下的独立 pack，每个 pack 自带清单、依赖版本与最低主程序版本要求。

定位上它更像"桌面端的下载中枢"，而不是某个协议的专用客户端。和 Motrix、Gopeed 这类同样走 aria2/多协议路线的项目相比，Ghost Downloader 3 的差异点在于把解析、嗅探、录制（Android 端可直接录 live M3U8 流）和 UI 全部自己做完了，不依赖外部二进制做主力下载。

## 二、技术原理

### 2.1 引擎分层：一个 Engine 组合所有服务

桌面端的入口是 `Ghost-Downloader-3.py`，真正的装配点在 `app/engine.py`。`Engine` 的构造函数把下面这些服务串起来：

```text
Engine
├── CoroutineRunner        asyncio 事件循环的宿主
├── TaskService            任务生命周期、落盘、断点续传、校验
├── CategoryService        按规则归类下载目录
├── SpeedMeter             全局与单任务速度采样
├── RuntimeStatusService   运行时（ffmpeg / yt-dlp 等）安装状态
├── FeatureService         加载 features/ 下的 pack，维护解析器链
├── BrowserService         浏览器扩展的 WebSocket 服务
├── PortListener × 2       浏览器扩展端口 + aria2 RPC 端口
├── Aria2RpcService        aria2 JSON-RPC 兼容层
└── NameConflictQueue      重名文件的串行决策队列
```

启动顺序也很直白：`resumeSaved()` 恢复上次未完成的任务，`featureService.activate()` 激活所有 pack，然后两个 `PortListener` 分别监听浏览器扩展端口（默认 14370）和 aria2 RPC 端口。停止时反向执行，并且 `flush()` 调用了两次——一次在停任务后，一次在停监听后，保证退出瞬间产生的状态也能落到 `tasks.jsonl`。

任务状态本身是追加写的 JSONL（`APP_DATA_DIR/tasks.jsonl`），而不是每改一次进度就重写整个 JSON。下载进度是高频变化的数据，用行式追加 + 定期刷盘的代价远小于全量序列化。

### 2.2 线程归属：D 拥有状态，L 拥有 socket，J 只准走 request

这是整个项目最值得抄的一条设计，记录在 `docs/adr/0012-thread-ownership.md` 里。

- **D 线程**（Dispatcher，桌面端是 Qt 主线程，Android 上是 loop 线程）拥有全部服务状态，配置写入 `cfg.set` 只允许在 D 上发生。
- **L 线程**（loop）拥有 socket、连接和协程，所有网络 I/O 都在这里。
- **J 线程**（Android 的 JVM 线程）不拥有任何状态，所有 engine 调用只能经 `request` 这一个入口切到 D。

ADR 里写得很清楚：de-Qt 之后出现过"bind 在 D、close 在 L、JVM 线程直接改 `_sessions` 和 `TaskService`"的混乱，稳定性明显下降。他们考虑过给每个 engine 方法加线程切换装饰器，也考虑过给服务加锁，最后都否掉了——前者漏一个方法就是一个竞态，后者锁住的是症状，而且 Qt 的 Signal 同步 emit 会把锁带进 View 和其他服务。

这个取舍的代价是：engine 方法不能在 L 上再阻塞等 L，需要等待的逻辑必须写成 `async`。收益是状态所有权单一，不需要靠锁去猜。

### 2.3 解析器分派链：先选站，再按内容认领

下载器最容易写崩的地方是"一个 URL 到底该谁处理"。`download.aspx?file=x` 这种链接，后缀看不出是 zip 还是种子，只有发一次请求看到响应头和文件名才知道。

Ghost Downloader 3 的方案在 ADR 0025 里：来源解析器（`HttpParser`、`GitHubParser`）先 `probe`，把探测到的 `RemoteFile`（名字、大小、是否支持 Range、Content-Type）填进 `TaskOptions.file`，然后经 `parser.delegate` 再分派一次；格式解析器（zip、torrent、m3u8…）按文件名后缀和 Content-Type 认领，没人认领或认领后解析失败，就回落到普通文件下载。

解析器按 `priority` 升序排列，`GitHubParser` 的优先级是 75，排在格式解析器之前——这样 GitHub 上的 zip、种子、m3u8 会先选站（决定走 github.com 还是镜像），再按内容类型交给对应的 pack。反过来"格式优先"就认不出没有后缀的链接。

同一份 ADR 还定义了 Relink 的语义：Relink 是"同一个文件换一个新地址"，不是"重新下一个文件"。新链接解析出的 Task 要交给原 Task 的 `relink` 校验，只有 `HttpTask`、`ZipTask`、`FFmpegTask` 实现了这个方法，种类不合或内容不一致一律拒绝。这解释了为什么它敢让你在下载途中改 URL。

### 2.4 分块下载：pwrite 直写 + 慢块动态分裂

README 里那句 "Smart chunking without file merging" 是字面意思。`features/http_pack/task.py` 里，每个 subworker 拿到自己负责的字节区间，收到数据后直接：

```python
pwrite(fd, chunk, subworker.position)
subworker.receivedBytes += len(chunk)
self._reportSpeed(len(chunk))
await self._waitForSpeedLimit()
```

`pwrite` 带偏移写，多个协程并发写同一个 fd 的不同区间，互不覆盖。因为没有"每块一个临时文件"的步骤，自然也就不存在下载完成后拼接文件的 I/O 峰值——这是它对机械硬盘和大文件场景最实在的优化。

更细的一层是自动加速：当任务只有一个 subworker 且服务器支持 Range 时，会调用 `_splitSlowest(self.subworkerCount)` 把最慢的连接一分为二，再起一个协程接着下。默认分块数是 `preBlockNum = 8`，配置范围 1~256（`app/config/cfg.py`）。分块不是越多越好，连接数上去之后服务端限速、TLS 握手开销、磁盘随机写都会反噬，所以它把上限和默认值都留在了配置里，而不是硬编码一个很大的数。

配套的两个细节：`_waitForSpeedLimit()` 在每次写入后检查限速开关（ADR 0001 专门讨论了"限速启用标志"该独立于限速值存在，否则用户把限速设成 0 就再也开不回来了）；`ftruncate` 在非 Range 分支里把文件截断到实际收到的字节数，避免预分配留下的空洞。

### 2.5 Feature Packs：协议即插件

`features/` 下目前有 14 个 pack：`http_pack`、`bittorrent_pack`、`ftp_pack`、`m3u8_pack`、`ed2k_pack`、`yt_dlp_pack`、`bili_pack`、`github_pack`、`huggingface_pack`、`ffmpeg_pack`、`zip_pack`、`arxiv_pack`、`jack_yao`、`wrapped_link_pack`。

每个 pack 有 `manifest.toml`，声明入口、类名、依赖、自身版本和 `gdMinVersion`（最低主程序版本）。比如 http_pack 的清单是：

```toml
[pack]
entry = "pack.py"
class = "HttpPack"
dependencies = []
version = "1.2.2"
gdMinVersion = "4.5.0"
```

`FeatureService.load()` 从 `FEATURES_DIR` 扫出所有 pack，注册解析器、配置页、文件关联和 URI scheme。这意味着新增一个协议不需要动主程序，写一个 pack 就行；也意味着 pack 可以独立于主程序演进，只要不突破 `gdMinVersion`。

底层引擎基本是"能用成熟库就不自己造"：BT 用 `libtorrent`，FTP 用 `aioftp`，M3U8 解析用 `m3u8` + `N_m3u8DL-RE`，DASH 用 `mpegdash`，视频站点用 `yt-dlp`（库模式，配合 `wreq` 的 TLS 指纹模拟），eD2k 用同作者的 `Kelpie`（ADR 0018 记录了从 goed2kd 切换过来的原因）。HTTP 客户端 `wreq` 负责真实浏览器的 TLS 指纹，这也是它能过一部分反爬校验的原因。

## 三、安装与快速开始

### 3.1 平台要求

官方给出的支持矩阵（来自 README）：

| 平台 | 最低版本 | 架构 |
|:--|:--|:--|
| Windows | 10+ | x86_64 / arm64 |
| macOS | 13.0+ | x86_64 / arm64 |
| Linux | glibc 2.35+ | x86_64 / arm64 |
| Android | 9.0+ | arm64-v8a |

有一个硬约束要注意：**Qt 6.6+ 不再支持没有 AVX 指令集的 CPU**。老机器上装完打不开，多半是这个原因，不是包坏了。

### 3.2 安装方式

普通用户直接去 Releases 下对应平台的安装包：

```text
https://github.com/XiaoYouChR/Ghost-Downloader-3/releases/latest
```

Arch Linux 用户可以用社区维护的 AUR 包（维护者 @zxp19821005）：

```bash
yay -S ghost-downloader-bin
# 或者跟踪 git 版本
yay -S ghost-downloader-git
```

### 3.3 从源码运行

源码运行要求 Python **3.13+**（`pyproject.toml` 里 `requires-python = ">=3.13"`），包管理用 `uv`。仓库根目录执行：

```bash
uv run Ghost-Downloader-3.py ghd --help
```

这条命令同时验证了两件事：依赖装齐了，且 CLI 入口可用。GUI 则直接运行 `Ghost-Downloader-3.py`。

依赖里值得注意的几个：`pyside6~=6.10.3`、`pyside6-fluent-widgets>=1.11.3`（项目用的是作者自己 fork 的版本，`[tool.uv.sources]` 指向 `XiaoYouChR/PyQt-Fluent-Widgets` 的 main 分支）、`libtorrent>=2.1.1`、`wreq>=0.12.0`、`uvloop`（非 Windows）/`winloop`（Windows）。

### 3.4 CLI 的最小可用路径

`ghd` 不是装完就有的，要先在应用里打开 **Settings → Command Line Tool** 安装。装好后：

```bash
# 只探测，不建任务
ghd probe "https://example.com/a.torrent"

# 只下种子里的第 0 和第 3 个文件，输出到 ./downloads
ghd add "https://example.com/a.torrent" --select 0,3 -o ./downloads

# 阻塞等待完成
ghd wait tsk_0123
```

`ghd` 的输出契约写得很清楚：stdout 永远是一个 JSON 对象，成功是 `{"result": ...}`，失败是 `{"error": {"code", "message"}}`；退出码 0 成功、1 操作失败、2 用法错误。脚本里直接 `jq` 取 `taskId` 就行，不用解析人类可读文本。

## 四、使用方法与实战

### 4.1 CLI 命令全表

| 命令 | 作用 |
|:--|:--|
| `ghd probe <url>` | 预览 URL 的文件名、大小、包含文件，不建任务 |
| `ghd add <url>...` | 添加并启动任务，打印 taskId |
| `ghd tasks` | 列出任务，`-s/--status` 可按状态过滤 |
| `ghd task <taskId>` | 查看单个任务及文件列表 |
| `ghd pause <taskId>...` | 暂停 |
| `ghd start <taskId>...` | 恢复暂停或失败的任务 |
| `ghd remove <taskId>...` | 移除任务并删除未完成文件 |
| `ghd wait <taskId>...` | 阻塞到任务停止，全部完成才退出 0 |

`add` 还有几个实用参数：`--name` 指定文件名（仅单 URL）、`-H 'Referer: https://example.com/'` 追加请求头（可重复）、`--conflict keep|overwrite` 控制重名策略。

### 4.2 实战一：只下种子里的某几个文件

影视资源包动辄几十 GB，但你可能只要其中两集。先 probe 看索引：

```bash
ghd probe "https://example.com/show.torrent"
```

输出的 `files` 数组里每项带 `index`、`path`、`fileSize`、`isSelected`。确认索引后：

```bash
ghd add "https://example.com/show.torrent" --select 0,3 -o /data/downloads
# {"result": {"taskId": "tsk_0123", ...}}
```

这个能力来自 ADR 0008 的 flag-based file selection：选中状态是文件上的一个标志位，不是另建一张选择表，所以 probe 和 add 之间不需要保持会话。

### 4.3 实战二：把浏览器里的视频交给桌面端

装好配套扩展后，页面上的视频旁边会出现下载按钮，扩展弹窗会列出当前页所有媒体资源。它和桌面端的通信走本地 WebSocket，端口默认 14370，支持自动选端口（`shouldAutoSelectBrowserPort`，候选端口列表在 `browser_service.py` 的 `CANDIDATE_PORTS` 里）。

关键设计是认证态传递：扩展把当前页面的请求头（Cookie、Referer、User-Agent）一起送过来，桌面端用同一套头去请求，所以需要登录的资源不会因为换了客户端就 403。对于浏览器已经给出名字和大小、且明确支持 Range 的资源，桌面端不再重复 `probe`，直接构造 `RemoteFile` 走内容分派；不支持 Range 的一次性链接则按普通文件处理，避免多一次请求把链接耗掉。

### 4.4 实战三：用 aria2 RPC 接入现有工具链

如果你已经有基于 aria2 的下载面板或脚本，可以不改代码直接切过来。Ghost Downloader 3 实现了 aria2 兼容的 JSON-RPC（`app/services/aria2_rpc.py`），支持 HTTP 与 WebSocket 两种传输，单请求上限 2 MB，未授权请求会延迟 1 秒再拒。

调用方式和 aria2 一致：

```bash
curl -s http://127.0.0.1:<rpc端口>/jsonrpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "aria2.addUri",
    "params": [["https://example.com/file.iso"], {"dir": "/data/downloads"}]
  }'
```

RPC 端口在设置里配置（`isAria2RpcEnabled` / `aria2RpcPort`），默认不开，需要手动启用。对 CI 或 NAS 场景来说，这比再跑一个 aria2 容器省事。

### 4.5 关键配置项

配置文件由 `QConfig` 管理，下面这些是实际会影响下载行为的：

| 配置键 | 默认值 | 范围/说明 |
|:--|:--|:--|
| `preBlockNum` | 8 | 1~256，预分块数 |
| `maxTaskNum` | 3 | 1~10，同时下载任务数 |
| `autoSpeedUp` | True | 慢连接自动分裂加速 |
| `isSpeedLimitEnabled` | False | 限速总开关，独立于限速值 |
| `speedLimitation` | — | 全局限速值 |
| `shouldVerifySsl` | False | 改后需重启 |
| `proxyServer` | Auto | 支持自定义代理 |
| `nameConflict` | — | keepBoth / overwrite / ask |
| `browserExtensionPort` | 14370 | 1024~65535 |
| `shouldPreserveLastModified` | False | 保留服务端 Last-Modified |

`shouldVerifySsl` 默认是 `False`，这是为了兼容自签证书的镜像站，但在公共网络上建议打开。`nameConflict` 的三种策略在 ADR 0014 里有解释：判断重名以磁盘上的实际文件为准，不看内存里的任务表，因为用户可能在文件管理器里手动改过名字。

## 五、常见问题与解决方案

**现象：安装包能启动，但界面一片空白或直接闪退。**
原因：CPU 不支持 AVX 指令集，而 Qt 6.6+ 的预编译包默认要求 AVX。解决：换一台支持 AVX 的机器，或从源码针对本机指令集自行构建；ARM 设备请确认下载的是 arm64 包而不是 x86_64。

**现象：Linux 上提示 `GLIBC_2.35 not found`。**
原因：发行版太老（如 Ubuntu 20.04、CentOS 7），glibc 版本低于要求。解决：升级到 Ubuntu 22.04+/Debian 12+ 一类系统，或用容器/Flatpak 方案；不要试图替换系统 glibc，会把系统搞坏。

**现象：设置了限速，之后想取消却取消不掉。**
原因：这是一类经典设计陷阱——把"是否限速"和"限速值"混成一个字段，限速值设成 0 就等于关闭，但 UI 上又需要一个开关。项目用独立的 `isSpeedLimitEnabled` 标志解决了这个问题（ADR 0001）。解决：在设置里关掉限速开关，而不是把速度改成 0。

**现象：下载同名文件时任务直接失败，或旧文件被覆盖。**
原因：`nameConflict` 策略设成了 `overwrite`，且目标文件不可删除（权限不足或正被占用）。此时 `TaskStore.add()` 会把策略降级为 `keepBoth` 并重命名为 `name(1).ext`，但如果连重命名都失败就会报错。解决：检查目标目录写权限；重要文件保持默认的 `keepBoth`。

**现象：浏览器扩展连不上桌面端。**
原因：端口被占用，或扩展与应用的配对 token 不一致。解决：确认 `browserExtensionPort`（默认 14370）没有被其他程序占用；打开"自动选择端口"让它在候选端口里重试；在扩展里重新配对一次。企业网络下还要注意本机防火墙是否拦截了 loopback 以外的绑定。

**现象：Linux 上自动更新失败。**
原因：安装目录不可写（比如装在 `/opt` 且属主是 root）。ADR 0037 明确只对可写目录做自更新。解决：改用用户目录安装、AUR 包或手动下载新版本；AUR 用户交给包管理器升级。

**现象：想给某个语言补翻译，提了 PR 却被关闭。**
原因：项目规定 Crowdin 是唯一的翻译写入方（ADR 0035），不接受直接改翻译文件的 PR。解决：去 Crowdin 项目翻译；新语言需要桌面端文案翻译率达到 60% 才会进应用，未翻译部分回退英文。

**现象：M3U8 下载完只有视频没有字幕。**
原因：字幕在 HLS 里是独立的 WebVTT/ASS 轨道，不是视频分片的一部分。ADR 0036 规定字幕作为旁挂文件保存。解决：在任务详情里确认字幕轨道已勾选；如果需要内嵌，再用 ffmpeg pack 做一次封装。

**现象：任务下载到一半，改了 URL 结果报错。**
原因：Relink 只接受"同一个文件的新地址"，新链接解析出的文件大小或类型不一致会被拒绝（ADR 0025）。解决：确认新地址指向同一份资源；换了文件就新建任务。

## 六、总结

Ghost Downloader 3 是个少见的"工程细节比功能列表更值得读"的项目。它的功能覆盖面确实夸张——六种协议加四类站点解析，一个应用顶掉一堆工具——但真正撑住这个覆盖面的是三件事：解析器按内容二次分派的链式设计、`pwrite` 直写避免合并的 I/O 模型、以及 D/L/J 三线程的严格状态归属。

适合谁：需要在一个界面里同时处理 HTTP、BT、流媒体和网盘直链的桌面用户；想把下载能力嵌进自己工具链、又不想额外跑 aria2 的开发者；以及想学 Python 异步 + Qt 混合架构怎么写才不烂的人。

不适合谁：只下单个小文件、不需要 GUI 的场景，`curl` 更省事；对 CPU 指令集有硬约束的老机器；以及需要企业级分布式下载调度的场景，它不是这个定位。

局限也要说清楚：插件 API 目前还没公开（Roadmap 里明确列为待办，Feature Packs 能用但接口仍在稳定中）；移动端引擎复用但客户端不开源；翻译流程锁死在 Crowdin，社区贡献路径比一般项目窄。

值得关注的方向是 Feature Packs 的 API 公开——一旦稳定，这个项目就从"一个下载器"变成"一个可扩展的下载平台"，那才是它架构真正押注的地方。

项目地址：<https://github.com/XiaoYouChR/Ghost-Downloader-3>
