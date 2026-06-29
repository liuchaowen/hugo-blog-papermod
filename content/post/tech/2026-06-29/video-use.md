---
title: "video-use: 用自然语言对话的方式编辑视频，100% 开源"
date: 2026-06-29
description: "video-use 是一个基于 Claude Code 的 AI 视频编辑工具，只需把原始素材丢进文件夹，用自然语言描述需求，就能获得剪辑好的 final.mp4。支持自动删除语气词、智能调色、音视频淡入淡出、字幕烧录和动态字幕生成，全程开源。"
author: "Cheman"
slug: video-use
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI", "视频编辑", "Claude", "LLM"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**video-use**，它让你直接用 Claude Code 对话的方式剪辑视频——把原始素材扔进文件夹，告诉 AI 你想要什么效果，它自动完成剪辑、输出 `final.mp4`，100% 开源。

## 一、项目概述

**video-use** 是 [browser-use](https://github.com/browser-use) 团队推出的 AI 视频编辑技能（Skill），核心思路是：**LLM 从不看视频，它只读文本**。整个剪辑流程通过两层文本抽象完成：

- **Layer 1 — 音频转录（始终加载）**：调用 ElevenLabs Scribe 对每个素材进行转录，得到逐词时间戳、说话人分离和音频事件（笑声、掌声等）。所有素材打包成约 12KB 的 `takes_packed.md`，LLM 的主要阅读视图。
- **Layer 2 — 可视化合成图（按需）**：`timeline_view` 在需要做决策时（模糊暂停、重复镜头对比等）才生成"时间线合成图"——包含缩略图条 + 声波图 + 词标签的 PNG，避免直接丢给 LLM 数万帧造成的 token 灾难。

这种思路和 browser-use 给 LLM 提供结构化 DOM 而非截图异曲同工：**用正确的抽象让 AI 高效工作**。

**核心功能列表：**

- 自动删除语气词（`umm`、`uh`）和静音片段
- 自动调色（暖色电影感 / 中性 / 自定义 ffmpeg 调色链）
- 30ms 音频淡入淡出，消除剪辑点爆音
- 烧录自定义字幕（默认 2 词大写格式）
- 通过 HyperFrames、Remotion、Manim 或 PIL 生成动态字幕叠加层
- **自我评估**：在每个剪辑点对渲染结果打分，不满意自动重剪（最多 3 轮）
- `project.md` 持久化会话记忆，下周继续编辑时 AI 直接承接上下文

## 二、技术原理

### 架构设计

video-use 的核心是一个**文本抽象 → LLM 推理 → EDL → 渲染 → 自我评估**的流水线：

```
转录 ──> 打包 ──> LLM 分析 ──> EDL（剪辑决策清单）──> 渲染 ──> 自我评估
                                                               │
                                                               └── 不满意？修复 + 重渲染（最多3次）
```

`EDL`（Edit Decision List）是整个系统的核心产物，由 LLM 根据转录文本分析后生成，描述每个片段的起止时间、过渡方式和理由。

### 核心技术栈

从 `pyproject.toml` 可以看出项目依赖：

```toml
[project]
requires-python = ">=3.10"
dependencies = [
    "requests",      # API 调用
    "librosa",       # 音频分析与处理
    "matplotlib",    # 时间线可视化（timeline_view）
    "pillow",        # 图片处理
    "numpy",         # 数值计算
]
```

外部依赖（需单独安装）：
- **ffmpeg**：音视频处理的核心引擎（必装）
- **yt-dlp**：可选，下载在线视频素材
- **ElevenLabs Scribe**：音频转录 API（需 API Key）

### 关键设计：为什么 LLM 不直接看视频

```
朴素方案：30,000 帧 × 1,500 tokens = 45M tokens 的噪声
video-use 方案：12KB 文本 + 按需生成的少量 PNG ≈ 几百 tokens
```

这个数字对比揭示了项目的核心洞察——**视频编辑的本质是决策，不是感知**。LLM 的强项是推理和决策，而非视频理解。因此团队选择用 Scribe 把视频"翻译"成文本，把剪辑变成一个文本推理任务。

### 自我评估循环

在每次渲染后，`timeline_view` 会对**渲染输出**的每个剪辑点进行检查：
- 是否有画面跳跃
- 是否有音频爆音
- 字幕是否被遮挡

只有通过自检的片段才会呈现给用户，否则进入修复重渲染循环（最多 3 次）。

## 三、安装与快速开始

### 环境要求

- Python >= 3.10
- macOS / Linux（含 ffmpeg）
- ElevenLabs API Key（[elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys) 获取）
- Claude Code / Codex / Hermes / OpenClaw 等 Agent 工具

### 自动安装（推荐）

将以下提示词粘贴到你的 Agent 中，它会自动完成克隆、依赖安装和技能注册：

```
Set up https://github.com/browser-use/video-use for me.

Read install.md first to install this repo, wire up ffmpeg, register the skill with whichever agent you're running under, and set up the ElevenLabs API key — ask me to paste it when you need it. Then read SKILL.md for daily usage, and always read helpers/ because that's where the editing scripts live. After install, don't transcribe anything on your own — just tell me it's ready and wait for me to drop footage into a folder.
```

### 手动安装

```bash
# 1. 克隆并链接到 Agent 的 skills 目录
git clone https://github.com/browser-use/video-use ~/Developer/video-use
ln -sfn ~/Developer/video-use ~/.claude/skills/video-use        # Claude Code
# ln -sfn ~/Developer/video-use ~/.codex/skills/video-use         # Codex

# 2. 安装依赖
cd ~/Developer/video-use
uv sync                         # 或: pip install -e .
brew install ffmpeg             # 必装
brew install yt-dlp             # 可选

# 3. 配置 ElevenLabs API Key
cp .env.example .env
$EDITOR .env                    # ELEVENLABS_API_KEY=...
```

### 快速使用

```bash
# 进入素材文件夹
cd /path/to/your/videos

# 启动 Agent
claude    # 或 codex、hermes 等

# 在 Agent 对话框中输入：
# > edit these into a launch video
```

Agent 会自动：盘点素材 → 提出剪辑策略 → 等待确认 → 执行剪辑 → 输出 `edit/final.mp4`。

## 四、使用方法与实战

### 基础用法

把原始素材扔进文件夹，直接告诉 AI 你想要什么：

```
> 把这段访谈剪成一条产品宣传片，去掉所有的语气词和停顿
> 把三个镜头素材拼接成一个 60 秒的开场视频
> 给这段教程视频加上字幕，调成电影感的暖色调
```

### 进阶用法：动画字幕叠加

安装动画依赖后，可利用 Remotion / Manim 生成动态字幕：

```bash
# 安装动画依赖
pip install video-use[animations]
# 或 uv sync --extra animations
```

然后在指令中指定动画风格：

```
> 剪辑成一条发布视频，字幕用 Remotion 动画，带有打字机效果
```

### 设计原则

项目作者定义了 5 条核心设计原则：

1. **文本优先，按需可视化**——不主动 dump 帧，文本是主界面
2. **音频为主，视觉服从**——剪辑点来自语音边界和静音间隙
3. **问 → 确认 → 执行 → 自评 → 持久化**——未经批准不动刀
4. **零内容类型预设**——先看再问后编辑
5. **12 条硬规则 + 艺术自由**——生产正确性不可妥协，艺术风格由你定

## 五、常见问题与解决方案

### 安装失败：ffmpeg 未找到

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# 验证
ffmpeg -version
```

### 转录报错：ElevenLabs API Key 无效

确保 `.env` 文件中 `ELEVENLABS_API_KEY=你的密钥` 正确无误，密钥可在 [elevenlabs.io](https://elevenlabs.io) 免费注册获取。

### 渲染后音频爆音

video-use 默认在每个剪辑点添加 30ms 音频淡入淡出。如果仍有爆音，可以在 `helpers/` 中调整 `audio_fade_duration` 参数。

### 自我评估循环次数过多

最多允许 3 轮自动修复。如果 3 轮后仍未通过，脚本会输出当前状态并等待手动干预。可以在 `SKILL.md` 中调整 `max_self_eval_attempts` 参数。

## 六、总结

**video-use** 提出了一个极具启发性的设计哲学：**让 LLM 做它擅长的事（推理和决策），而不是让它直接处理它不擅长的数据（视频帧）**。通过音频转录 + 可视化合成图两层抽象，它把视频编辑变成了一个纯文本推理任务，大幅降低了 token 消耗，同时保证了剪辑精度。

如果你经常需要剪辑视频但厌倦了Premiere 的复杂操作，或者想探索 AI 辅助创作的边界，video-use 值得一试。100% 开源，可以直接集成到你的 Claude Code / OpenClaw 工作流中。

> 🔗 项目地址：[github.com/browser-use/video-use](https://github.com/browser-use/video-use)
