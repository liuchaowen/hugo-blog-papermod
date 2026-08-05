---
title: "用 ChatGPT 把长视频安全剪成 9:16 短影音：chatgpt-video-editing-skills 上手指南"
date: 2026-08-05
description: "chatgpt-video-editing-skills 是一套面向可操作本机文件的 AI Agent 的繁体中文 Skills，把环境检查与实际剪辑拆成两个 Skill，在保护原始素材、取得上传同意的前提下，把长视频做成 9:16 直式短影音。本文拆解它的分工与设计哲学。"
author: "Cheman"
slug: chatgpt-video-editing-skills
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, ChatGPT, 视频剪辑]
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

今天在 GitHub Trending 上看到一个有意思的项目：**chatgpt-video-editing-skills**，它把"环境安装/检查"和"实际剪辑"拆成两个 Skill，让 AI Agent 在保护原始素材、取得同意的前提下，把自己提供的影片做成直式短影音。下面拆解它的设计思路和落地方式。

## 一、项目概述

`chatgpt-video-editing-skills` 由 Jaycheng1103 维护，是一组给"能读写本机文件、能执行终端指令"的 AI Agent（如 ChatGPT 的 skills 运行环境）使用的繁体中文 Skills。它的目标很明确：协助你把一段长视频，安全地做成 60–90 秒、9:16 的繁体中文短影音（Reels / Shorts / 抖音竖屏）。

它最值得称道的是**安全与诚实**：不静默安装工具、不在预览核准前输出正式定稿、不把"计划/指令/未验证文件"说成"完成品"，一切以实际输出与 QA 证据为准。

核心特性可以归纳为三点：
- **职责分离**：环境准备（setup）与剪辑执行（editor）拆成两个独立 Skill，互不越界。
- **素材零破坏**：所有产物放在原始影片旁的 `edit/` 目录，原始文件不被覆盖、移动、重命名或删除。
- **同意优先**：上传云端转写、付费或输出正式档之前，必须先取得用户明确同意。

## 二、技术原理

### 两个 Skill 的分工

仓库把整套流程拆成两个 Skill，边界非常清晰：

| Skill | 用途 | 不会做的事 |
| --- | --- | --- |
| `chatgpt-video-editing-setup` | 检查、安装、修复或验证 video-use、FFmpeg、ffprobe、思源黑体 TW 字幕字体、ElevenLabs 凭证与可选的 HyperFrames 环境 | 不上传素材、不转写、不剪辑、不输出影片 |
| `chatgpt-short-video-editor` | 对用户提供影片执行逐字转写、剪辑策略、粗剪、字幕、预览、QA 与正式输出 | 不会静默安装工具，也不会在预览核准前输出正式定稿 |

这种"环境归环境、剪辑归剪辑"的切分，避免了 AI 在剪辑中途偷偷改系统环境带来的不可控风险。

### 八大步骤的数据流

剪辑 Skill 定义了严格的八个步骤，体现"先验证、后产出"的价值观：

1. **素材检查**：用 `ffprobe` 确认来源规格与可解码性，原始影片保持不变。
2. **逐字转写**：先取得文件级上传同意，再以 ElevenLabs Scribe v2 取得 word-level 时间码。
3. **内容整理**：找出 Hook、核心主线、可删内容与待确认信息。
4. **剪辑决策**：先提出 4–8 句白话策略，取得核准后才决定剪接点与创意元素。
5. **逐段粗剪**：依完整字词边界建立 EDL，保留 30–200ms 边界空间与约 30ms 音讯淡入淡出。
6. **转色／图卡／字幕**：只有技术必要或已核准时才调色；静态图卡用 Pillow，动画才用 HyperFrames，字幕以思源黑体 TW 最后合成。
7. **混音与完整预览**：先输出并检查一支完整 720p 预览。
8. **QA 与正式定稿**：预览明确核准后才输出 1080×1920 正式档，正式档仍需独立检查与完整解码，通过后才交付。

### 产物目录契约

所有新产物都落在 `edit/` 下，原始文件永远不动：

```text
edit/
├── project.md
├── transcripts/<source>.json
├── corrected-transcript.md
├── edl.json
├── master.srt
├── clips/
├── animations/slot_<id>/
├── qa/
├── preview.mp4
└── final.mp4
```

`final.mp4` 只有在「720p 预览获核准 → 渲染正式档 → 验证正式档 → 交付」这条链路全部走完，才会被视为可交付成片。

## 三、安装与快速开始

### 前置需求

- 能读写本机文件并执行终端机指令的相容 Agent。
- Git、Python 与 [uv](https://docs.astral.sh/uv/)。
- FFmpeg 与 ffprobe。
- [video-use](https://github.com/browser-use/video-use) 完整 Repo（剪辑辅助程式位于其中）。
- 思源黑体 TW 子集 OTF（Regular 与 Bold），供繁体中文 subtitle 烧录，采用 SIL Open Font License 1.1。
- ElevenLabs Scribe v2 凭证与可用额度，提供 word-level 时间码。
- Pillow 用于简单静态信息卡。
- HyperFrames 仅在选择 HTML/CSS/GSAP 动画时为可选需求（需 Node.js 22+ 与 Bun）。

### 快速安装

交互式安装（建议）：

```sh
npx skills add Jaycheng1103/chatgpt-video-editing-skills --full-depth
```

一次安装全部 Skills 到所有侦测到的 Agent：

```sh
npx skills add Jaycheng1103/chatgpt-video-editing-skills --all --full-depth
```

只安装单一 Skill：

```sh
# 环境设定
npx skills add Jaycheng1103/chatgpt-video-editing-skills --skill chatgpt-video-editing-setup --full-depth

# 剪辑
npx skills add Jaycheng1103/chatgpt-video-editing-skills --skill chatgpt-short-video-editor --full-depth
```

也可以手动 clone 后从本机安装：

```sh
git clone https://github.com/Jaycheng1103/chatgpt-video-editing-skills.git
cd chatgpt-video-editing-skills
npx skills add . --full-depth
```

更新与移除：

```sh
npx skills update chatgpt-video-editing-setup chatgpt-short-video-editor
npx skills remove chatgpt-video-editing-setup chatgpt-short-video-editor
```

## 四、使用方法与实战

### 第一次使用：先检查环境

不要一上来就剪。先用 setup Skill 做检查：

> 请使用 `chatgpt-video-editing-setup` 检查我的短影音剪辑环境。先只做检查并列出需要的变更，等我确认后再安装；不要上传或转写任何媒体。

### 环境通过后开始剪辑

> 请使用 `chatgpt-short-video-editor`，把 `/完整/路径/原始影片.mov` 剪成 60–90 秒、9:16 的繁体中文 Reels。先完成素材检查、逐字转写与内容整理，再用 4–8 句提出剪辑策略，等我确认后才开始剪。

这一步的关键是：Agent 必须先给你一份白话策略并等核准，而不是直接动手剪。

### 一个完整的实战顺序

1. Agent 用 `ffprobe` 检查原始影片规格，原始档不动。
2. 取得你的上传同意 → 调用 ElevenLabs Scribe v2 转写，拿到 word-level 时间码。
3. 整理出 Hook、主线、可删内容，提出 4–8 句剪辑策略等你确认。
4. 依字词边界做粗剪（EDL），保留边界空间与音讯淡入淡出。
5. 静态图卡用 Pillow，必要动画才上 HyperFrames，字幕最后以思源黑体 TW 合成。
6. 输出 720p 完整预览 → 你核准 → 渲染 1080×1920 正式档 → 验证正式档 → 交付。

## 五、常见问题与解决方案

**Q：Agent 说找不到 FFmpeg、ffprobe、video-use、字幕字体或凭证？**
改用 `chatgpt-video-editing-setup`。它先检查、再列出需你核准的变更；若既有 Repo 有未提交修改，它会停下来，不会直接 pull、reset 或覆盖；既有字体档也不会被重新下载或覆盖。

**Q：没有 ElevenLabs 额度，或不愿上传素材？**
完整精度流程以 Scribe v2 为主。你可以明确要求本机 Whisper 降級方案，但要接受较低信心的时间码与额外边界 QA；Agent 不应默默切换。

**Q：已经看到指令、转写文字或预览，为什么还没算完成？**
指令不等于已执行，画面不等于完整 QA，预览也不等于正式交付。正确顺序是：完整预览检查 → 你核准预览 → 渲染正式档 → 验证正式档 → 交付。

**Q：想加动画、B-roll、音乐或 CTA？**
请在剪辑策略阶段提出或核准，这些都是 opt-in 创意决策，不是预设自动加入。简单静态图卡优先用 Pillow；只有已核准的 HTML/CSS/GSAP 动画才需要 HyperFrames。

## 六、总结

`chatgpt-video-editing-skills` 的价值不只是"让 AI 剪视频"，而是给 AI 剪辑套上了一层**可审计的安全护栏**：环境检查与剪辑执行分离、原始素材只读不碰、上传/付费/定稿前必须取得明确同意、并以实际预览与 QA 证据作为完成标准。如果你也想把长视频交给 AI 做成竖屏短影音，又担心它乱装工具或误删素材，这套 Skills 值得一试。
