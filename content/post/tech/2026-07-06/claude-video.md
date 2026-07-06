---
title: "Claude Video: 让 AI 真正「看懂」视频的开源神器"
date: "2026-07-06"
description: "Claude Video 是一个让 Claude 能够观看和分析任何视频的 Claude Code 插件，支持 YouTube、Loom、TikTok 等平台，通过字幕提取 + 关键帧截取 + Whisper 转录三重能力，让 AI 真正理解视频内容而非仅凭标题猜测。"
author: "Cheman"
slug: "claude-video"
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["Claude", "AI", "视频分析", "开源项目", "多模态"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Claude Video**，它解决了一个长期困扰 AI 助手的问题——如何让 AI 真正「看懂」视频，而不只是根据标题猜测内容。

## 一、项目概述

Claude Video（`bradautomates/claude-video`）是一个 Claude Code 的插件（Plugin），通过 `/watch` 命令赋予 Claude 观看和分析任何视频的能力。项目支持 YouTube、Loom、TikTok、X（Twitter）、Instagram 等几乎所有 `yt-dlp` 支持的平台，同时也能处理本地视频文件（`.mp4`、`.mov`、`.mkv`、`.webm`）。

### 核心能力

- **免费字幕优先**：优先提取平台原生字幕（免费、快速），无需 API Key
- **Whisper 转录兜底**：无字幕视频自动调用 Whisper（Groq 免费额度或 OpenAI）生成时间戳转录
- **智能帧提取**：支持 `efficient`（快速关键帧）、`balanced`（场景感知）、`token-burner`（完整覆盖）三种模式
- **帧去重优化**：自动去除视觉上几乎相同的重复帧，节省 token 消耗
- **跨平台兼容**：Claude Code、Codex、Cursor、Copilot、Gemini CLI 等 50+ Agent 平台通用

## 二、技术原理

### 整体架构

```
用户提问 → /watch <URL/路径> <问题>
    ↓
yt-dlp 检查字幕 → 有字幕？→ 直接提取 VTT/SRT
    ↓ 无字幕
下载视频 → ffmpeg 按场景/关键帧提取 JPEG
    ↓
转录：Whisper（Groq/OpenAI）→ 带时间戳的文本
    ↓
将帧路径（含 t=MM:SS）+ 转录文本交给 Claude
    ↓
Claude Read 每个帧图像 → 结合音频内容回答
```

### 字幕提取策略

```python
# transcribe.py 核心逻辑（简化）
def get_transcript(url, detail):
    # 优先尝试 yt-dlp 原生字幕（免费）
    captions = yt_dlp.extract_captions(url)
    if captions:
        return parse_vtt(captions)  # 免费、快速
    
    # 无字幕时，降级到 Whisper 转录
    audio = download_audio(url)
    return whisper_transcribe(audio)  # 需要 API Key
```

### 帧提取的三种模式

| 模式 | 引擎 | 帧数上限 | 适用场景 |
|------|------|---------|---------|
| `transcript` | 无 | 0帧 | 已知视频有字幕，零 token 开销 |
| `efficient` | ffmpeg keyframe | 50帧 | 快速扫描，静态内容为主 |
| `balanced` | ffmpeg scene-change | 100帧 | 平衡覆盖（**默认**） |
| `token-burner` | ffmpeg scene-change | 无上限 | 长视频完整覆盖 |

### 帧去重算法

```python
# frames.py 核心逻辑
def dedup_frames(frames, threshold=2.0):
    """
    1. 每帧缩放到 16×16 灰度缩略图
    2. 计算当前帧与上一「保留帧」的 MAD（平均绝对差）
    3. MAD <= threshold → 近似重复 → 丢弃
    4. MAD > threshold → 保留，成为新的参考帧
    """
    kept = []
    last_kept = None
    for frame in frames:
        thumb = ffmpeg_scale_gray(frame, 16)
        if last_kept is None or mad(thumb, last_kept) > threshold:
            kept.append(frame)
            last_kept = thumb
    return kept
```

### 帧预算机制（防止 token 爆炸）

视频越长，每秒允许的帧数越少（自动档）：

| 视频时长 | 默认帧预算 | 说明 |
|---------|-----------|------|
| ≤ 30 秒 | ~30 帧 | 密集覆盖 |
| 30 秒 ~ 1 分钟 | ~40 帧 | 密集覆盖 |
| 1 ~ 3 分钟 | ~60 帧 | 舒适 |
| 3 ~ 10 分钟 | ~80 帧 | 稀疏扫描 |
| > 10 分钟 | 100 帧（capped） | 建议用 `--start`/`--end` 聚焦 |

## 三、安装与快速开始

### 安装（Claude Code）

```bash
/plugin marketplace add bradautomates/claude-video
/plugin install watch@claude-video
```

### 安装（Codex / Cursor / Copilot / Gemini CLI 等）

```bash
npx skills add bradautomates/claude-video -g   # -g 全局安装
```

### 安装（Claude.ai 网页）

1. 下载 [`watch.skill`](https://github.com/bradautomates/claude-video/releases/latest)
2. Settings → Capabilities → Skills → `+` → 拖入文件
3. 开启「Code execution and file creation」

### 首次运行

首次执行 `/watch` 时，脚本会自动检测 `ffmpeg` 和 `yt-dlp` 是否安装，缺失时：

- **macOS**：自动执行 `brew install ffmpeg yt-dlp`
- **Linux**：打印 `apt` / `dnf` / `pipx` 安装命令
- **Windows**：打印 `winget` / `pip` 命令

Whisper API Key（非必须，仅无字幕视频需要）：
```bash
# 自动创建配置文件
GROQ_API_KEY=你的Groq密钥   # 推荐，免费额度充足
# 或
OPENAI_API_KEY=你的OpenAI密钥
```

## 四、使用方法与实战

### 基础用法

```bash
# 问视频里 30 秒时发生了什么
/watch https://youtu.be/dQw4w9WgXcQ "what happens at the 30 second mark?"

# 总结视频内容
/watch https://youtu.be/xxx "summarize this"

# 分析本地录屏
/watch ~/Downloads/screen-recording.mov "when does the UI break?"

# 提取关键要点（去营销化）
/watch https://youtu.be/launch-video "what's actually new — skip the hype"
```

### 聚焦特定片段（推荐节省 token）

```bash
# 只分析 2:15 到 2:45 这 30 秒
/watch https://youtu.be/abc --start 2:15 --end 2:45

# 也可以用时间戳标注
/watch https://youtu.be/abc --timestamps 0:30,1:15,2:00,3:30
```

### 调整清晰度

```bash
# 需要看清屏幕文字？提高分辨率
/watch video.mp4 --resolution 1024 "what code is shown?"

# 快速扫描，不需要逐帧分析
/watch video.mp4 --detail efficient "get the gist"
```

### 常用参数一览

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--detail` | 帧提取模式 | `balanced` |
| `--start` / `--end` | 聚焦时间段 | 全部 |
| `--timestamps` | 指定关键帧时间点 | — |
| `--max-frames` | 手动限制帧数 | auto |
| `--resolution` | 帧宽（px） | 512 |
| `--no-whisper` | 禁用转录，字幕视频专用 | — |
| `--no-dedup` | 保留所有帧（关闭去重） | 去重开启 |

## 五、常见问题与解决方案

**Q: 视频很长，`/watch` 给的回答不够深入？**
> 长视频（>10 分钟）在 `balanced` 模式下帧覆盖率会变稀疏。建议用 `--start`/`--end` 聚焦到感兴趣的片段，同样 token 预算下密度更高。

**Q: Whisper 转录需要 API Key 吗？**
> 不是必须的。`yt-dlp` 会优先提取 YouTube 等平台的原生字幕（免费），Whisper 只在无字幕视频（如本地文件、TikTok、部分 Vimeo）时才触发。Groq 的 `whisper-large-v3` 有免费额度，推荐优先使用。

**Q: 提取帧很慢怎么办？**
> 对于静态内容多的视频（如屏幕录制），用 `--detail efficient` 只提取关键帧，比 `balanced` 快 40 倍。如果视频有字幕，`--detail transcript` 只需 4.5 秒（完全不下载视频），直接拿字幕回答。

**Q: 画面几乎不变，但 token 消耗很高？**
> 脚本默认开启帧去重（`dedup`）。如果发现仍有大量相似帧被保留，可以用 `--no-dedup` 关闭去重来诊断，或者手动指定 `--start`/`--end` 聚焦变化最多的段落。

**Q: 安装后提示缺少 `ffmpeg` 或 `yt-dlp`？**
> macOS 上运行 `/watch` 首次会自动引导安装；Linux/Windows 手动执行：
> ```bash
> # Linux
> sudo apt install ffmpeg yt-dlp   # 或 pipx install yt-dlp
> # Windows
> winget install ffmpeg yt-dlp
> ```

## 六、总结

Claude Video 补全了 AI「看视频」这一能力缺口。与其让 Claude 靠视频标题和描述瞎猜内容，不如直接喂给它画面和音频。它的字幕优先策略非常聪明——大多数公开视频都有免费字幕可用，只有真正需要时才会触发付费的 Whisper API。

对于需要频繁分析视频内容的开发者、内容创作者和技术写作者来说，这个工具将视频从「不可搜索的媒体」变成了「可结构化分析的数据源」。无论是分析竞品宣传片、诊断 bug 录屏、还是将技术分享视频转化为可搜索笔记，Claude Video 都是一个值得加入工作流的利器。

---
