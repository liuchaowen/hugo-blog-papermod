---
title: "Diffusion Studio Editor：用 JSX 代码驱动、为 Agent 而生的专业视频编辑器"
date: 2026-08-29
description: "Diffusion Studio Editor 是一个开源视频编辑器，以 SolidJS 模块作为文档源，通过 JSX 声明式地编写视频合成、剪辑与生成式素材，并提供 dapi CLI 让 AI Agent 直接观看、理解并剪辑素材。本文解析其架构、技术原理与实战用法。"
author: "Cheman"
slug: editor
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 视频编辑, SolidJS, AI Agent, 生成式]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Diffusion Studio Editor**——一个把视频编辑器和代码编辑器合二为一的开源工具，号称"为 Agent 打造的的专业视频编辑器"。它最大的反直觉之处在于：视频工程文档不是二进制工程文件，而是一堆 SolidJS 模块，**改代码画布实时重绘，拖画布代码同步回写**。

## 一、项目概述

Diffusion Studio Editor（仓库 `diffusionstudio/editor`，Y Combinator F24 团队出品，MPL-2.0 许可证）是一个开源视频编辑器，核心理念是：**用 SolidJS 模块作为文档源（document source）**。你可以把它理解为"一个 IDE，但它渲染的不是文本，而是一块视频画布"。

这种双向绑定是它的灵魂：

- 在画布上编辑，改动会落回代码；
- 编辑代码，画布会重新绘制。

这意味着视频剪辑第一次拥有了"可版本化、可程序化、可被 Agent 驱动"的工程形态。项目面向的典型场景包括：

- **视频剪辑**：把原始素材剪成一个成片；
- **动态图形（Motion Graphics）**：讲解动画、宣传片、片头；
- **生成式素材**：在代码里声明图像、视频、配音，并合成到时间轴上；
- **切片（Clipping）**：从长视频中截取高光，重新排版成社媒竖版；
- **视频理解**：生成摘要、场景检索、带时间戳的引用。

桌面端应用内置一个命令行，让 Agent 能够"观看并倾听"你的素材，并在时间轴上完成剪辑。

## 二、技术原理

### 2.1 文档即 JSX 合成树

项目的本质是"合成即代码（compositions as code）"。一个工程就是一个文件夹的 JSX 文件：`dapi open <dir>` 打开一次，之后编辑文件、保存即重新编译入口文件并挂载进编辑器的 ECS（Entity-Component-System）。

每个元素都带一个 `id`，这就是"写回（write-back）"定位目标的依据——画布上拖动的矩形、时间轴上修剪的片段、重新输入的文字行，都会作为该元素的一个 prop 落回当初产生它的代码处。

根节点是一个 `<stage>`，每个你剪出来的画面帧对应一个 `<scene>`：

```tsx
import { For } from "solid-js";
import { generate } from "@diffusionstudio/jsx";

const hero = generate.image({ prompt: "A neon city at night, cinematic", aspectRatio: "16:9" });
const motion = generate.video({ prompt: "slow camera push-in", startFrame: hero, duration: 5 });

const TITLES = [
  { text: "The Grid", start: 0, end: 2.5 },
  { text: "Neon Nights", start: 2.5, end: 5 },
];

export default function Project() {
  return (
    <stage camera={[0.3, 0, 0, 0.3, 85, 150]}>
      <scene name="Intro" width={1920} height={1080} fill="black" active>
        <video src={motion} start={0} end={5} width={1920} height={1080} />
        <For each={TITLES}>
          {(t) => (
            <text
              width={1920}
              height={1080}
              textAlign="center"
              textBaseline="middle"
              fontSize={128}
              color="#FFFFFF"
              start={t.start}
              end={t.end}
            >
              {t.text}
            </text>
          )}
        </For>
      </scene>
    </stage>
  );
}
```

注意这里 `generate.image` / `generate.video` 这样的生成式 API：素材是"声明出来"的，渲染时再真正生成。挂载（mount）产生的任何产物都仍是编辑器里的一等公民节点，因此一个人可以从 UI 上精确接手脚本停下的地方——这正是代码与画布双向同步的工程基础。

### 2.2 仓库分层架构

从 `package.json` 的 workspaces 与文档中的仓库布局，可以看到清晰的 monorepo 划分：

| 路径 | 包名 | 职责 |
| --- | --- | --- |
| `apps/web` | `@diffusionstudio/web` | 编辑器 UI（Solid + Vite） |
| `apps/desktop` | `@diffusionstudio/desktop` | 承载编辑器的 Electron 外壳 |
| `apps/cli` | `@diffusionstudio/cli` | 驱动应用的 `dapi` CLI |
| `packages/runtime` | `@diffusionstudio/runtime` | 无头编辑器运行时：koota 世界、traits、actions、systems、媒体解码、capture（无 DOM、无 Solid） |
| `packages/reconciler` | `@diffusionstudio/reconciler` | 编译项目 bundle，通过 Solid 通用渲染器把元素树调和（reconcile）到运行时实体 |
| `packages/jsx` | `@diffusionstudio/jsx` | 创作 API：元素词表、类型、生成式素材（`generate.*`） |
| `packages/assets` | `@diffusionstudio/assets` | 工程资产库：`assets.yml` 清单、内容哈希、探测、解析 |
| `packages/encoder` | `@diffusionstudio/encoder` | 基于运行时世界的离线音视频/图像编码（mediabunny） |
| `packages/koota-solid` | `@diffusionstudio/koota-solid` | koota 的 Solid 绑定，移植自 `@koota/react` |

技术选型上有几个值得玩味的点：

- **SolidJS 而非 React**：Solid 的细粒度响应式与编译期 JSX 转换，天然适合"代码即文档、保存即重编译挂载"的模式；reconciler 借用了 Solid 的通用渲染器来把元素树映射到 ECS 实体。
- **koota**：一个 ECS 世界系统，作为编辑器的状态核心；UI、CLI、无头运行时都围绕同一个世界运转，从而保证画布、时间轴、代码三处状态一致。
- **运行时无 DOM / 无 Solid**：`packages/runtime` 拆出纯逻辑层，使得无头渲染、capture、编码可以在不依赖浏览器环境的情况下进行。

### 2.3 dapi：让 Agent "看见并听见"素材

剪辑的前提是理解素材。CLI 自带一套让 Agent 处理它"看不了"的媒体的检查工具：

```sh
dapi media probe clip.mp4                                # 容器 + 编码元数据，类似 ffprobe
dapi media grab clip.mp4 -t 0 12 45                      # 解码帧为 PNG
dapi media filmstrip clip.mp4                            # 视频帧网格
dapi media waveform track.mp3                            # 音频波形，标记静音段
dapi media transcribe interview.wav                      # 带时间轴的逐词转录
dapi media listen interview.mp4 -p "what is said in the intro?"   # 调用多模态模型提问
dapi capture intro -t 0 2 4                              # 按场景 id 渲染某次导出会产生的帧
```

约定贯穿始终：单个结果是一个 JSON 值，集合是 JSON Lines，错误走 stderr 且退出码为 `1`——一切都为管道（pipe）、grep、程序化驱动而设计。这让 Agent 能够在"看不见画面"的情况下，依据帧、波形、转录和模型问答来决策剪辑点。

## 三、安装与快速开始

环境要求：**Node 20+** 与 npm。

```sh
git clone https://github.com/diffusionstudio/editor.git
cd editor
npm install

cp apps/web/.env.example apps/web/.env   # 必需：没有它应用跑不起来

npm run dev
```

把 `dapi` 放到 PATH（macOS/Homebrew 布局；其它环境自行调整 link 目标）：

```sh
npm run symlink:create --workspace=@diffusionstudio/cli
```

该链接指向 CLI 的构建产物，而 `npm run dev:desktop` 每次启动都会刷新，因此链接的 `dapi` 始终运行最新代码。

提交 PR 前需通过类型检查与 lint：

```sh
npm run check    # 所有 workspace 类型检查
npm run lint     # 所有 workspace lint
```

## 四、使用方法与实战

### 4.1 与 Agent 协作：安装 skill

可在 Claude Code、Codex、Cursor、Copilot 或 Gemini CLI 中使用。全局安装一次 skill：

```sh
npx skills add diffusionstudio/skills
```

`/editor` 是你会用到的主要 skill，用自然语言描述需求即可，背后是驱动应用的 `dapi` CLI。

### 4.2 实战提示词示例

**动态图形**：

```text
/editor Create a ~20-second promo for vercel-labs/native in Vercel's presentation style.
Research its official website, GitHub, and brand guidelines; use authentic assets and
verified product features, with crisp typography, polished motion, and a strong final CTA.
```

**视频剪辑**：

```text
/editor edit the footage in /path/to/folder
/editor turn this footage into a polished YouTube video. Add readable captions and an
attention-grabbing graphic in the opening to give viewers a strong visual hook.
```

**切片（Clipping）**：

```text
/editor Can you pull the best 30-second moment from https://youtu.be/MtQ0qxyf-Ds
and make a vertical version for social?
```

**视频理解与推理**：

```text
/watch In three bullets, explain what starts the conflict. Include timestamps.
https://youtu.be/aqz-KE-bpKQ
```

### 4.3 常用 dapi 命令速查

| 命令 | 用途 |
| --- | --- |
| `dapi open` | 启动应用并打开（或创建）工程文件夹 |
| `dapi context` | 应用状态摘要 |
| `dapi capture` | 渲染某场景的帧（联系表或逐位置 PNG） |
| `dapi check` | 检查节点的子树结构错误（黑帧空隙、永不显示节点、失败源）并报告统计 |
| `dapi media …` | 按 id 或路径检查文件：`probe`/`grab`/`filmstrip`/`waveform`/`transcribe`/`listen` |
| `dapi models` / `dapi voices` / `dapi fonts` | 发现生成模型、语音、本地字体 |
| `dapi screenshot` / `dapi logs` | 应用本身：截窗口、读控制台 |
| `dapi fetch` | 从 yt/tt/ig 下载视频 |
| `dapi whoami` | 当前认证账号 |
| `dapi report` | 通过 `gh` 把诊断打包成 GitHub issue 报告 bug |

`dapi fetch` 还能直接从 YouTube / TikTok / Instagram 拉取视频，配合 `dapi media transcribe` 与 `listen`，构成"下载 → 转录 → 理解 → 剪辑 → 导出"的完整 Agent 工作流。

## 五、常见问题与解决方案

**Q1：克隆后 `npm run dev` 启动报错 / 应用打不开？**
A：文档明确说明必须准备好环境变量：`cp apps/web/.env.example apps/web/.env`，否则应用无法运行。这是最常见的"漏配"。

**Q2：提交 PR 前类型检查或 lint 失败？**
A：依次运行 `npm run check` 与 `npm run lint` 跑通所有 workspace；`check` 还会对 `examples` 目录做 `tsc --noEmit`，注意示例工程也要通过。

**Q3：本地 `dapi` 命令不是最新代码？**
A：确保已执行 `npm run symlink:create --workspace=@diffusionstudio/cli`，且日常用 `npm run dev:desktop` 启动（它会刷新 CLI 构建），链接的 `dapi` 才会指向最新产物。

**Q4：CLI 报错但看不出原因？**
A：所有错误走 stderr 且退出码为 `1`，建议把 stdout/stderr 分开捕获，或用 `dapi check` 检查子树的结构错误（黑帧空隙、永不显示节点、失败源）。

**Q5：生成式素材（图像/视频）不出现？**
A：确认使用 `generate.*` API 声明的素材已正确作为节点挂载；挂载产物才是编辑器一等公民，纯字符串不会进入时间轴。

## 六、总结

Diffusion Studio Editor 的价值不在于"又一个 GUI 视频剪辑器"，而在于它把**视频工程变成了代码工程**：SolidJS 模块即文档、ECS（koota）即状态核心、保存即重编译挂载即双向同步。再叠加 `dapi` CLI 对媒体的探测/转录/问答能力，它真正把"Agent 剪辑视频"从演示变成了可管道化、可程序化的日常工具。

对开发者而言，它适合想把成片纳入 Git 版本管理、用代码生成动态图形与生成式素材、或搭建自动化剪辑流水线的场景；对团队而言，`npx skills add diffusionstudio/skills` 一行即可把剪辑能力交给 AI 助手。如果你正寻找"代码与画布双向驱动"的视频创作方式，这个项目值得一试。

- GitHub：`https://github.com/diffusionstudio/editor`
- 文档：CLI 参考、JSX 参考、Examples（均位于仓库 `reference/` 与 `examples/`）
- 协议：MPL-2.0（桌面端品牌素材除外，版权归 Diffusion Studio Inc.）
