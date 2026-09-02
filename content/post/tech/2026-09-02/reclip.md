---
title: "ReClip：基于 yt-dlp 的自托管视频/音频下载器，自带极简 Web UI"
date: 2026-09-02T13:04:00+08:00
description: "ReClip 是一个自托管的开源视频/音频下载器，基于 yt-dlp 与 ffmpeg 构建，支持 YouTube、TikTok、Instagram 等 1000+ 站点，提供无需打包的纯前端 Web UI，后端仅约 150 行 Flask 代码，可一键将链接下载为 MP4 或 MP3。"
author: "Cheman"
draft: false
tags: [GitHub, 开源, yt-dlp, 下载工具, Python, Flask]
categories: [技术, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ReClip**——一个自托管的开源视频/音频下载器，粘贴链接即可通过干净的 Web 界面把 YouTube、TikTok、Instagram 等内容下载为 MP4 或 MP3。它本质上是给强大的命令行工具 `yt-dlp` 套了一层友好的网页外壳。

## 一、项目概述

ReClip 的核心定位是「个人自托管」的媒体下载中台。它不依赖任何前端框架、没有构建步骤，整个后端只是单个 `app.py`（约 150 行 Flask 代码），却完整实现了「粘贴链接 → 获取信息 → 选择清晰度 → 下载」的闭环。

主要特性：

- **海量站点支持**：底层直接复用 [yt-dlp](https://github.com/yt-dlp/yt-dlp)，因此支持其官方清单里列出的 1000+ 站点，包括 YouTube、TikTok、Instagram、Twitter/X、Reddit、Facebook、Vimeo、Twitch、SoundCloud 等。
- **双模式输出**：可下载为 **MP4**（视频）或抽取 **MP3**（音频）。
- **清晰度/分辨率选择器**：自动从 `yt-dlp` 返回的格式中提取每个分辨率的最优档位。
- **批量下载**：一次粘贴多个 URL，支持自动去重。
- **极简 UI**：原生 HTML/CSS/JS 单文件，响应式，开箱即用。
- **极少的依赖**：运行时仅依赖 `Flask` 与 `yt-dlp` 两个 Python 包，外加系统侧的 `ffmpeg`。

## 二、技术原理

### 架构设计

ReClip 采用最经典的「Flask 后端 + 原生前端」B/S 架构，所有耗时操作放在后台线程中执行，避免阻塞 HTTP 请求：

- 后端 `app.py`：暴露 `/api/info`、`/api/playlist`、`/api/download`、`/api/status/<job_id>`、`/api/file/<job_id>` 等 REST 接口，并通过 `threading` 异步执行 `yt-dlp` 子进程。
- 前端 `index.html`：单文件 Vanilla JS，轮询 `/api/status` 获取任务进度，完成后触发文件下载。
- 下载引擎：`yt-dlp` + `ffmpeg`，通过 `subprocess` 调用。

### 任务模型与并发下载

核心思路是「任务即 Job」。每次点击下载都会生成一个 `job_id`，后台线程独立执行，HTTP 接口只做状态查询：

```python
@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.json
    url = data.get("url", "").strip()
    format_choice = data.get("format", "video")
    format_id = data.get("format_id")
    title = data.get("title", "")

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    job_id = uuid.uuid4().hex[:10]
    jobs[job_id] = {"status": "downloading", "url": url, "title": title}

    thread = threading.Thread(target=run_download, args=(job_id, url, format_choice, format_id))
    thread.daemon = True
    thread.start()

    return jsonify({"job_id": job_id})
```

`run_download` 根据 `format_choice` 拼装 `yt-dlp` 命令——音频模式加 `-x --audio-format mp3`，视频模式则按 `format_id` 合并 `bestvideo+bestaudio`，输出统一封装为 `mp4`：

```python
cmd = ["yt-dlp", "--no-playlist", "-o", out_template]

if format_choice == "audio":
    cmd += ["-x", "--audio-format", "mp3"]
elif format_id:
    cmd += ["-f", f"{format_id}+bestaudio/best", "--merge-output-format", "mp4"]
else:
    cmd += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]
```

### 信息解析与清晰度提取

`/api/info` 调用 `yt-dlp -j` 拿到 JSON，再按「每个分辨率只保留码率最高的一档」做去重，生成前端下拉选项：

```python
best_by_height = {}
for f in info.get("formats", []):
    height = f.get("height")
    if height and f.get("vcodec", "none") != "none":
        tbr = f.get("tbr") or 0
        if height not in best_by_height or tbr > (best_by_height[height].get("tbr") or 0):
            best_by_height[height] = f
```

由于 `yt-dlp` 某些提取器在 `--no-playlist` 下仍可能打印多行 JSON，作者还专门写了 `parse_ytdlp_json` 逐行解析、只取第一条有效对象，规避 `json.loads` 的 `Extra data` 报错——这正是从真实踩坑中沉淀的细节。

### 批量去重

对于播放列表/批量场景，`/api/playlist` 使用 `--flat-playlist -J` 先扁平化拿到子视频 URL 列表，配合前端对重复 URL 的过滤，实现「粘贴一堆链接，自动去重后逐个抓取」。

## 三、安装与快速开始

环境要求：Python 3.8+，系统已安装 `ffmpeg`，以及 `yt-dlp`。

**方式一：本地脚本（macOS / Linux）**

```bash
brew install yt-dlp ffmpeg    # 或 apt install ffmpeg && pip install yt-dlp
git clone https://github.com/averygan/reclip.git
cd reclip
./reclip.sh
```

启动后访问 **http://localhost:8899**。

**方式二：Docker（推荐，零环境依赖）**

```bash
docker build -t reclip .
docker run -p 8899:8899 reclip
```

Dockerfile 基于 `python:3.12-slim`，预装 `ffmpeg` 并以非 root 用户 `reclip` 运行，同时用 `gunicorn` 托管（`-w 1 --threads 4 --timeout 600`），更贴近生产部署。生产环境若需外网访问，可加一层反向代理并关闭 `HOST=127.0.0.1` 的默认绑定。

## 四、使用方法与实战

1. 在输入框粘贴一个或多个视频 URL（每行一个，自动去重）。
2. 选择 **MP4**（视频）或 **MP3**（音频）。
3. 点击 **Fetch**，加载标题、缩略图与可选清晰度。
4. 在可用清晰度中挑选（如 1080p / 720p）。
5. 点击单个视频的 **Download**，或一键 **Download All**。

**实战示例**：想把一段 YouTube 教程转成可离线听的 MP3。粘贴链接 → 选 MP3 → Fetch → Download，后端线程会调用：

```bash
yt-dlp --no-playlist -x --audio-format mp3 -o "<job_id>.%(ext)s" "<url>"
```

完成后前端轮询到 `status=done`，直接以下载附件形式拿回带标题的文件名（标题会被清洗掉 `\/:*?"<>|` 等非法字符，并截断到 100 字）。

## 五、常见问题与解决方案

- **启动报「yt-dlp / ffmpeg 找不到」**：本地模式需提前 `brew install yt-dlp ffmpeg`（或 `pip install yt-dlp`）。Docker 镜像已内置 `ffmpeg`，但仍需 `pip` 侧能拉到 `yt-dlp`；Dockerfile 把用户级 `--user` 安装路径前置到 `PATH`，确保容器启动时 `yt-dlp` 的自动更新生效。
- **Fetch 超时或返回错误**：`/api/info` 有 60s 超时，少数站点或网络抖动会失败。可重试，或在服务器上先手动跑一次 `yt-dlp -j <url>` 验证连通性。
- **下载卡在 downloading 不结束**：`run_download` 设置了 300s（5 分钟）超时，超时会标记 `error: Download timed out`；超大视频可考虑放宽 `subprocess.run(..., timeout=300)` 的阈值。
- **端口被占用 / 只监听本机**：默认 `HOST=127.0.0.1`、`PORT=8899`。要对外暴露需设置环境变量 `HOST=0.0.0.0` 并配合反向代理，切勿直接裸奔到公网（见下方安全提示）。
- **只下到音频却想要视频、或反之**：确认前端选的是 MP4 还是 MP3；后端正是按 `format_choice` 决定加不加 `-x`，选择错误会直接导致产物类型不符。

## 六、总结

ReClip 的价值在于「用极小的代码量把专业工具民主化」：150 行 Flask + 一个原生 HTML 文件，就把 `yt-dlp` 的能力包装成了家人也能用的网页。它适合想自建媒体下载服务的个人玩家，Docker 一键起、依赖极少、源码易读易改。

当然也要注意两点：**一是合规**——项目明确声明仅供个人使用，请遵守平台 ToS 与版权法；**二是安全**——默认只监听 `127.0.0.1`，如需远程访问务必加鉴权与 HTTPS，避免成为开放下载代理。总体而言，是一个干净、克制、值得收藏的「小而美」开源项目。
