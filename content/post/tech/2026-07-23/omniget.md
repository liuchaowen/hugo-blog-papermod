---
title: "OmniGet：一款支持 1800+ 站点的全能开源下载器"
date: 2026-07-23
description: "OmniGet 是一款跨平台开源桌面应用，一站式下载 Udemy 在线课程、YouTube/B站视频、音乐、电子书，支持 1800+ 站点，全程无需命令行，GitHub 开源免费。"
author: "Cheman"
slug: omniget
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "下载工具", "Tauri", "Rust", "Svelte"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OmniGet**，一款开源全能下载器，一口气支持 Udemy 在线课程、YouTube/B站/TikTok 视频、音乐、电子书，以及 1800+ 各类站点，跨 Windows/macOS/Linux 全平台，无需任何命令行操作。

## 一、项目概述

OmniGet 是一个用 **Tauri + Svelte + Rust** 构建的跨平台桌面应用，底层封装了 yt-dlp 作为通用下载引擎，同时为大型平台（YouTube、Bilibili、Udemy 等）实现了原生提取器。它最大的特点是**一站式解决所有下载需求**，无需在多个工具之间切换。

核心功能一览：

- **在线课程**：完整下载 Udemy、Hotmart、Kiwify、Skool、Teachable 等平台整门课程（含附件 PDF），并可在应用内边看边做时间戳笔记
- **视频/音频**：YouTube、Instagram、TikTok、Twitter/X、Reddit、Bilibili 等，支持选择画质或纯音频（MP3/FLAC/Opus 等）
- **电子书与漫画**：内置 PDF/EPUB 阅读器，支持高亮、书签和专注模式
- **音乐库**：本地音乐管理，自动拉取封面和歌词，支持连接 Spotify/SoundCloud/Qobuz 等流媒体播放列表
- **全局快捷键**：`Ctrl+Shift+D`（Windows/Linux）或 `Cmd+Shift+D`（macOS），复制任意链接后按一下就自动开始下载，无需打开窗口
- **Bilibili 深度支持**：登录账号后解锁 4K、HDR、Hi-Res 无损音频、杜比全景声，以及弹幕（XML/ASS/JSON）和多种 URL 类型
- **Telegram 机器人 / 浏览器扩展 / P2P 传输** 等附加功能

开源免费，基于 **GPL-3.0** 许可证，不收集任何遥测数据。

## 二、技术原理

### 架构设计

OmniGet 的技术栈选型非常有意思：前端用 **Svelte + SvelteKit**（SPA 模式），后端用 **Rust + Tauri**，底层依赖 **yt-dlp** + **FFmpeg**。

从 `package.json` 可以看出，前端大量使用现代 Web 技术：Tiptap（富文本编辑器）、Markmap（思维导图）、Cytoscape（知识图谱）、Vidstack（视频播放器）、HLSS.js 等。Tauri 作为桥接层，通过 `@tauri-apps/api` 与 Rust 后端通信，完成文件读写、进程管理、剪贴板访问等系统级操作。

插件系统（Courses、Telegram、Convert 等）基于 Rust 动态库，通过 `omniget-plugin-sdk` 实现（位于 `src-tauri/omniget-plugin-sdk`），支持第三方插件开发，架构参考了 [plugin development guide](https://github.com/tonhowtf/omniget-plugin-template)。

### 下载链路解析

OmniGet 的下载链路大致如下：

```
用户粘贴链接
    ↓
Rust 后端解析 URL → 识别平台
    ↓
大平台（YouTube/Bilibili/Udemy）→ 原生提取器
通用站点               → yt-dlp
    ↓
下载队列 + 断点续传 + 速率估算
    ↓
文件写入磁盘 → 可选调用 FFmpeg 转码/合并
```

速度估算来自下载器本身的实时反馈（而非伪造的百分比），即使未知文件大小或直播流也能准确显示剩余时间。

### 构建依赖

从 `vite.config.js` 可以看到构建时的一些关键配置：

```javascript
optimizeDeps: {
  exclude: [
    "@kookyleo/plantuml-little-web",
    "@kookyleo/graphviz-anywhere-web",
  ],
},
worker: { format: "es" },  // Vite 6 要求 ES 格式以避免代码分割构建报错
```

这说明 OmniGet 的笔记和知识图谱功能重度依赖 WASM 模块，并且构建配置针对 Vite 6 的新行为做了适配。

## 三、安装与快速开始

### 下载安装

直接前往 [GitHub Releases](https://github.com/tonhowtf/omniget/releases/latest) 下载对应平台版本：

| 平台 | 安装方式 |
|------|---------|
| Windows | 下载 `.exe`，双击即用（便携模式支持 USB 运行） |
| macOS | 下载 `.dmg`，拖入 Applications |
| Linux | `flatpak install wtf.tonho.omniget` 或下载 bundle |

> ⚠️ **macOS 首次运行注意**：由于未使用付费签名证书，macOS Gatekeeper 会阻止首次启动。打开终端运行：
> ```bash
> xattr -cr /Applications/omniget.app
> codesign --force --deep --sign - /Applications/omniget.app
> ```
> 之后正常打开即可，只需执行一次。

### 源码编译

需要 Rust、Node.js 18+ 和 pnpm：

```bash
git clone https://github.com/tonhowtf/omniget.git
cd omniget
pnpm install
pnpm tauri dev          # 开发模式
pnpm tauri build        # 生产构建
```

Linux 额外依赖：

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

## 四、使用方法与实战

### 最简使用：一键下载

复制任意链接（如某个 B站视频链接），按全局快捷键 `Ctrl+Shift+D`，OmniGet 静默读取剪贴板并自动开始下载，文件直接落入你的下载文件夹。

### 下载整门 Udemy 课程

1. 在 OmniGet 内登录 Udemy 账号
2. 粘贴课程页面链接
3. OmniGet 自动识别并解析全部课时（含附件 PDF）
4. 点击下载，整门课程一次性入库
5. 在应用内的播放器中观看，支持时间戳笔记和书签续播

### Bilibili 高质量下载（需登录）

1. 登录你的 B站账号（设置 → 账号 → 登录）
2. OmniGet 通过官方 API 拉取你的会员权益
3. 下载时选择 4K/HDR/Dolby Vision/Hi-Res 无损音频

### 音乐库管理

1. 设置 → 音乐 → 添加本地音乐文件夹
2. OmniGet 自动扫描、读取 ID3 标签、拉取专辑封面和歌词
3. 播放列表支持本地文件和 Spotify/Qobuz/Last.fm 流媒体账号同步

### 字幕处理

- 自动下载可用字幕（内嵌或独立文件）
- 如无字幕，自动用 Whisper 生成
- Subtitle Workshop 支持 SRT/VTT/ASS 格式编辑、时间轴同步、AI 翻译

## 五、常见问题与解决方案

**Q: macOS 打不开，显示"无法验证开发者"？**  
A: 见上方「macOS 首次运行注意」，运行两个 Terminal 命令即可，永久解决。

**Q: 提示"需要登录"却下载失败？**  
A: 部分平台（Udemy、Hotmart、Bilibili 高质量）需要账号 Cookie 或登录授权。OmniGet 支持在设置中填入 cookies，或在应用内完成平台登录。

**Q: 下载速度慢或卡住？**  
A: OmniGet 的速度估算是实时反馈的，如果确实卡住通常是网络限速或源站问题。可以尝试：切换下载时段、更换网络，或在设置中调整线程数。

**Q: 如何便携运行（放在 U 盘里）？**  
A: 在 `.exe` 同目录创建一个空的 `portable.txt` 文件，OmniGet 会将所有数据（配置、数据库、插件）写入同目录的 `data` 文件夹，完全不触碰系统目录。

**Q: 占用空间太大？**  
A: 下载完成后可在设置中清理缓存、插件旧版本和不完整的分块文件。

## 六、总结

OmniGet 解决了一个真实的痛点：互联网上的内容散布在无数平台和工具中，而它用一个安静的桌面应用把这些全部收拢——不用记命令、不用装 Python、不用找各种 GUI 包装器。底层依托 Rust + Tauri 保证了性能和安全，前端 Svelte 的响应式设计让交互足够流畅，加上插件化架构和 1800+ 站点的覆盖，这个项目在开源下载器领域几乎是独一份的存在。如果你经常需要从各平台获取视频、课程或音频内容，OmniGet 值得一试。

---

> 项目地址：[tonhowtf/omniget](https://github.com/tonhowtf/omniget)  
> 许可证：GPL-3.0 | 完全免费开源
