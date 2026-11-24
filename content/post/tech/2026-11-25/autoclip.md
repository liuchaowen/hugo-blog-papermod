---
title: "AutoClip：本地优先的开源 AI 视频切片工具，把长视频一键剪成可发布短视频"
date: "2026-11-25T01:00:00+08:00"
description: "AutoClip 是一个 MIT 协议的开源 AI 视频剪辑桌面工具，能把播客、访谈、课程和直播回放自动切成竖版短视频，内置字幕、封面与发布文案生成。本文从六步流水线架构、模型提供商抽象、OBS 直播回放接入讲到桌面端、CLI、MCP 与 Docker 的完整上手方式。"
author: "Cheman"
slug: autoclip
github_repo: zhouxiaoka/autoclip
draft: false
tags: ["AutoClip", "AI视频剪辑", "开源", "GitHub Trending", "MCP", "FFmpeg"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AutoClip**（`zhouxiaoka/autoclip`）。它解决的是内容创作者最枯燥的一段体力活——把一两小时的长视频翻来覆去地看，挑出十几个可能爆的片段，再逐个裁切、加字幕、做封面、写文案。AutoClip 把这条链路压缩成"丢进一个链接，点一下生成"。项目用 Python + React + Tauri 写成，MIT 协议，截至 2026-11-24 抓取时已有 15,188 个 star、2,258 个 fork，最新 release 为 v1.6.0。

## 一、项目概述

AutoClip 的自我定位是"open-source, local-first AI clipping"：面向播客（podcast）、访谈（interview）、课程和游戏直播回放，自动找到长视频里信息密度最高的段落，裁成 9:16 竖版或保留 16:9 横版，烧入字幕，生成封面与发布文案，最后导出到抖音、小红书、TikTok、Instagram Reels、YouTube Shorts、B 站等平台。

它有几个和"云端剪辑 SaaS"明显不同的设计取向：

- **本地优先（local-first）**：切片、裁切、渲染全部在本机用 FFmpeg 完成，不上传整段视频、不排云端队列，也没有订阅费。云端只在你主动选择云模型时接收转写文本或抽帧图片。
- **自带模型或完全离线**：可以填自己的 API Key 走 DashScope、OpenAI、Gemini、DeepSeek、Kimi、GLM、Grok 等服务，也可以接本机 **Ollama / LM Studio**，配合 **Whisper / SenseVoice** 做语音转写，全程不联网。
- **四种入口共用一条流水线**：桌面应用、命令行 `autoclip`、MCP server（给 Claude Code、Codex、Cursor、OpenCode 等 agent 用）、Docker 自托管 Web 版，产物目录和 SQLite 记录完全一致——CLI 剪出来的片子，打开桌面端首页就能看到。
- **直播回放也能自动出片**：v1.6 新增 Live Replay，支持 OBS Studio、Twitch、YouTube、Kick、Discord 和本地录像六种来源；通过 OBS WebSocket 监听下播事件，自动把刚录完的文件排队切片。
- **多平台成品套件**：同一条素材可以一次生成多个平台的版本，附带封面、标题、正文文案，`--export-kits` 还能打包成 ZIP。
- **13 种语言界面**：桌面 UI、托盘菜单和文档覆盖简体中文、繁体中文、日语、韩语、西班牙语、葡萄牙语、俄语、法语、印尼语、土耳其语、越南语、德语等，字幕还支持阿拉伯语 RTL。

从成熟度看，这不是一个周末 demo：仓库有完整的 `backend/`（FastAPI + Celery + SQLAlchemy）、`frontend/`（React）、`src-tauri/`（Rust 桌面壳）、`docs/`（上百份设计与验收文档）、`skills/`（agent skill）和 `mcpb/`（MCP 打包）。作者在 README 里说明项目由个人维护（maintained solo），回复是异步的，但这套工程结构和 CI 构建流程已经相当产品化。

和同类工具相比，AutoClip 的差异不在"AI 剪得有多神"，而在**工程闭环**：它把"选段—转写—重构画幅—字幕—封面—文案—发布"当成一条可重试、可观测、可被 agent 调用的流水线来做，而不是一个只能手动点的图形界面。

## 二、技术原理

### 2.1 整体架构

仓库的架构文档给出的分层很清晰，可以概括成下面这张图：

```
┌──────────────────────────────────────────────────────────┐
│  客户端层                                                 │
│  Tauri 桌面壳(React + Rust) │ Web UI(React) │ CLI │ MCP   │
└───────────────┬──────────────────────────────────────────┘
                │ HTTP / WebSocket / stdio(JSON-RPC)
┌───────────────▼──────────────────────────────────────────┐
│  FastAPI 后端（backend/api, backend/services）            │
│  项目管理 · 任务编排 · 进度推送 · 发布 · 设置             │
└───────┬───────────────────────────────┬──────────────────┘
        │                               │
┌───────▼──────────────┐      ┌─────────▼──────────────────┐
│ Celery + Redis 队列   │      │ SQLite（projects/clips/    │
│ 长任务异步执行        │      │ collections/tasks/accounts）│
└───────┬──────────────┘      └────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────┐
│ 处理流水线（backend/pipeline）                            │
│ step1_outline → step2_timeline → step3_scoring           │
│ → step4_title → step5_clustering → step6_video           │
│                                                          │
│ 依赖：FFmpeg（裁切/渲染）· yt-dlp（下载）· Whisper/      │
│ SenseVoice/FunASR（转写）· LLM Provider（选段/文案）     │
└──────────────────────────────────────────────────────────┘
```

数据落盘遵循"项目目录 + 输出目录"的约定：每个项目在 `data/projects/{project_id}/` 下按阶段保存中间产物（原始视频、大纲、时间轴、评分、标题、聚类、成片元数据），最终视频放在 `output/clips/{project_id}` 与 `output/collections/{project_id}`。数据库只存索引和状态，元数据以 JSON 形式跟文件放在一起，处理完成后同步回 SQLite——这样即使数据库损坏，也能靠文件系统重建。

### 2.2 六步流水线

`backend/pipeline/` 下的模块名就是流水线的阶段名，顺序执行：

1. **step1_outline**：对长内容做整体结构梳理，把视频切成语义段落，形成"大纲"。这一步决定了后面分析的基本粒度。
2. **step2_timeline**：为每个段落建立时间轴信息，对齐字幕时间码与画面区间。源码里专门的 `weak_local_timeline.py` 说明它对本地小模型产出的弱时间轴做了兜底。
3. **step3_scoring**：按"可独立成片、信息完整、有情绪或观点钩子"这类标准打分，输出 0–1 的分数和理由。默认阈值 0.7，可以用 `--min-score` 覆盖；README 明确建议"切片为 0 先试 0.5"。
4. **step4_title**：给候选片段生成标题，仓库有独立的 `TITLE_TEMPLATE_IMPLEMENTATION.md` 描述模板机制。
5. **step5_clustering**：把主题相近的片段聚成合集（collection），也可以只出单条切片。`PROCESSING_MAX_CLIPS_PER_COLLECTION` 默认 5。
6. **step6_video**：调用 FFmpeg 完成裁切、画幅重构、字幕烧录、片头片尾与封面合成，产出最终文件。

整条链路按 `PROCESSING_CHUNK_SIZE=5000` 分块喂给模型，`PROCESSING_MAX_RETRIES=3` 控制重试。为什么要分块？因为两三个小时的字幕全文会直接撞上上下文上限，而按块打分还能让失败重试只影响单块，不必整片重跑。

### 2.3 字幕优先，ASR 兜底

这套工具的质量上限很大程度上取决于字幕。AutoClip 的策略是分层降级：

- 源视频自带字幕（YouTube 的 caption、B 站的 CC 字幕等）时直接抓取，最快也最准；
- 没有字幕就下载音轨，用本地 **faster-whisper** 或 **SenseVoice** 转写，仓库里 `sensevoice_runtime.py`、`sensevoice_worker.py`、`sensevoice_alignment.py` 一整套文件说明它做了模型运行时隔离和时间对齐；
- 也可以选云 ASR（例如阿里云百炼），按量计费换取速度。

README 的 benchmark 正好能说明这个差距：同样在 Apple Silicon 上出一版 10 条切片，带现成字幕的 1 小时 43 分英文访谈（Jensen Huang → 小红书）耗时 **7.5 分钟**，LLM 成本约 **¥0.09**；而没有字幕的 2 小时 52 分中文对谈（TIM × 罗永浩 → 抖音）走本地 Whisper，耗时 **29.5 分钟**，LLM 成本约 **¥0.20**。注意这只是 LLM 费用估算，不含云 ASR 与 AI 生图。

中文满屏字幕按两行分页，这个细节在 `docs/CLI_AND_MCP.md` 里有明确说明——竖屏短字幕如果一行塞太长，移动端会直接糊成一条。

### 2.4 竖版重构与人物取景

把 16:9 访谈裁成 9:16 不是简单居中裁一刀。AutoClip 会做人脸/人物跟踪，让画面跟着说话人移动，并提供三种竖版版式：`auto`、`interview`、`podcast`。默认映射是抖音、小红书用访谈式，TikTok、Reels、Shorts 用播客式；手动选择只改变竖版布局，语言跟着平台走，横版仍保持 16:9。

降级规则写得很克制：没有可用的人物轨迹，或原片字幕所在区域不能被裁掉时，保留完整画面而不是硬裁。这个取舍很实际——宁可上下留黑边，也不要切掉半张脸或半行字幕。

### 2.5 模型提供商抽象层

`backend/core/` 下关于模型的模块密度惊人：`llm_manager.py`、`llm_providers.py`、`llm_retry.py`、`llm_stream.py`、`llm_degrade.py`、`llm_telemetry.py`、`llm_usage.py`、`model_registry.py`、`model_recovery.py`、`provider_quality.py`……

这套设计的核心是**统一成 OpenAI 兼容协议**：`env.example` 里列出 `dashscope | openai | gemini | deepseek | seed | kimi | glm | grok | infistar | api88 | apimart | ollama | lmstudio`，非 OpenAI 官方的服务通过 `OPENAI_BASE_URL` 指过去，例如智谱 `https://open.bigmodel.cn/api/paas/v4`、DeepSeek `https://api.deepseek.com/v1`、火山方舟 `https://ark.cn-beijing.volces.com/api/v3`、Ollama `http://localhost:11434/v1`。这样新增一家供应商往往只是加一条 preset，而不用改流水线。

对本地模型还有单独的降级与质量评估逻辑（`provider_quality.py`、`weak_local_timeline.py`），承认 3B/7B 级别的本地模型在时间轴和结构化输出上会翻车，于是用校验、重试、模板约束去兜。

### 2.6 OBS 直播回放的接入设计

v1.6 最有意思的部分是 Live Replay。它的实现不是"监听文件夹里最新的 mp4"，而是走 OBS WebSocket 协议：

```
OBS Studio ──WebSocket 5.x(默认 4455)──► AutoClip 本地后端
   Hello → Identify → Identified
   订阅 Outputs 事件
   StreamStateChanged / RecordStateChanged
        │
        ├─ 推流 STOPPED + 录像 STOPPED + 唯一 outputPath
        ▼
   文件门槛检查（普通文件/大小稳定/可解码/有视频轨）
        ▼
   原子建项目 → 排队 → 复用 Studio 流水线
```

技术文档里把各种边界情况列成了表：先停录后下播、先下播后停录、录像暂停、推流重连、WebSocket 断线、OBS 重启、应用重启、分卷录像……只有"完整单文件且只属于一场直播"才自动处理，有歧义就保留手动入口。裁剪时如果起止偏移在 1 秒内，直接按关键帧做 `-c copy` 无损流拷贝；关键帧跨度太大才回退重编码。

更细的是**付费防重**：以场次、素材版本、分析阶段、分块、参数版本为唯一键，发送前先写"调用意图 + 预算预留"，服务商支持幂等键就按契约恢复；"已发送但结果未知"标记为待确认并冻结该步，禁止超时自动重发。这是被真实账单教育过的设计。

### 2.7 CLI / MCP 为什么能不出 FastAPI

`docs/CLI_AND_MCP.md` 提到，CLI 和桌面 Studio 共用 `backend/services/quick_output_runner.py`，旧切片入口共用 `local_runner.py`：不启动 FastAPI、不启动 Celery，直接在当前进程里跑 `SimplePipelineAdapter`。产物目录、metadata、SQLite 记录与桌面端一致。MCP 则是在这层之上包一个 stdio server（`backend/mcp_server.py`），把"开始任务"和"查询状态"拆成两个工具，避免 agent 长时间阻塞。

## 三、安装与快速开始

### 3.1 三条路线怎么选

| 使用场景 | 推荐方式 | 环境要求 |
| :--- | :--- | :--- |
| 普通用户，想直接用 | 下载 Releases 里的 `.dmg` / `-setup.exe` | Apple Silicon macOS 或 Windows 10/11 x64，Python 与 FFmpeg 已打包 |
| AI agent / CLI / MCP | `uvx autoclip-mcp` 或 `npx skills add zhouxiaoka/autoclip` | Python 3.10+（推荐 3.11）与 FFmpeg |
| 自托管 / Linux / Intel Mac | `docker compose up -d --build` | Docker 与 Compose v2 |

### 3.2 桌面端

1. 从 [GitHub Releases](https://github.com/zhouxiaoka/autoclip/releases/latest) 下载最新安装包：Apple Silicon macOS 用 `aarch64.dmg`，Windows 用 `x64-setup.exe`。便携版 Python 和 FFmpeg 已内置。
2. 打开 **Settings**，选择一个云提供商（或启动 Ollama / LM Studio），测试连接并保存；也可以点 **Try the built-in example**，不填任何 Key 先跑一遍。
3. 粘贴视频链接、拖入文件，或切到 **Live Replay** 连接 OBS / 导入直播录像，选好目标平台，点 **Generate**。

README 特别说明：安装包由 GitHub Actions 的 `Desktop Build` 流水线公开构建，附带 `build-provenance.json` 做 SHA-256 校验；代码签名和 Apple 公证仍在 issue #119 跟踪中，所以 macOS 首次打开可能需要在"隐私与安全性"里手动放行。

### 3.3 CLI 与 MCP

```bash
uvx autoclip-mcp
npx skills add zhouxiaoka/autoclip

autoclip --version
autoclip produce talk.mp4 --srt talk.srt --platform tiktok --portrait-style podcast --json
autoclip outputs PROJECT_ID --export-kits
```

`uvx autoclip-mcp` 会安装 PyPI 上的 `autoclip-mcp` 包并运行 MCP 入口，包里的 CLI 命令仍叫 `autoclip`。

如果要从源码装：

```bash
git clone https://github.com/zhouxiaoka/autoclip.git && cd autoclip
python3 -m venv venv && source venv/bin/activate
python -m pip install -r requirements.txt
python -m pip install --no-deps .
autoclip --version
```

不装包也能跑：在仓库根目录执行 `python -m backend.cli ...`。

装完先体检：

```bash
autoclip doctor
# 数据目录 ~/Library/Application Support/AutoClip · Python 3.11.9
# ✓ ffmpeg   /opt/homebrew/bin/ffmpeg
# ✓ whisper  faster-whisper 已安装
# ✓ 模型     ollama · qwen2.5:7b · http://localhost:11434/v1
```

### 3.4 Docker 自托管

```bash
git clone https://github.com/zhouxiaoka/autoclip.git
cd autoclip
cp env.example .env
mkdir -p data logs uploads
docker compose up -d --build
```

Web UI 在 `http://localhost:3000`，API 文档在 `http://localhost:8000/docs`。`env.example` 里至少要改 `LLM_PROVIDER` 和对应的 `API_*_KEY`，否则分析阶段会连不上模型。

## 四、使用方法与实战

### 4.1 一键出片：CLI

最常用的命令是 `produce`，它会等制作和自动封面任务都完成再返回：

```bash
autoclip produce talk.mp4 --srt talk.srt --platform douyin --platform youtube_shorts --json
autoclip produce talk.mp4 --platform douyin --portrait-style podcast --json
```

返回的 JSON 包含每个版本的 `video_path`、`cover_path`、`post`（发布文案）和 `kit_path`。终态有三种：`completed`、`partial`（部分版本失败，成功的仍保留）、`failed`（退出码 1；参数错误退出码 2）。

`--timeout` 只停止进度等待，不会取消渲染，CLI 会等后台线程安全收尾。需要真正可取消的后台任务，用 MCP 的 `cancel_job`。

保存的成品可以用 `outputs` 重新导出，不会再次调用模型：

```bash
autoclip outputs PROJECT_ID --export-kits
```

### 4.2 平台与版式参数

支持的平台 ID：

| 平台 | ID | 默认竖版版式 |
| :--- | :--- | :--- |
| 抖音 | `douyin` | 访谈式 |
| 小红书 | `xiaohongshu` | 访谈式 |
| B 站 | `bilibili` | 按横版/竖版规则 |
| TikTok | `tiktok` | 播客式 |
| Instagram Reels | `instagram_reels`（别名 `reels`） | 播客式 |
| YouTube Shorts | `youtube_shorts`（别名 `shorts`） | 播客式 |
| YouTube 长视频 | `youtube_long` | 仅生成 ≥180 秒片段 |

`--portrait-style` 可选 `auto` / `interview` / `podcast`。注意版式只影响竖版布局，语言跟随平台：中文平台出中文字幕，英文平台出英文，横版固定 16:9。

### 4.3 给 agent 用：MCP

MCP 把任务拆成"提交"和"轮询"两步，适合不能长时间阻塞的客户端：

```json
{"source":"/absolute/path/talk.mp4","srt_path":"/absolute/path/talk.srt","platforms":["douyin","youtube_shorts"],"portrait_style":"podcast"}
```

把这段传给 `start_quick_output`，拿到 `project_id`，再用 `get_quick_output_status` 查询：

```json
{"project_id":"返回的ID","export_kits":true}
```

状态里统一带 `progress`、`stage`、`eta`、`poll_after_sec`，按 `poll_after_sec` 的间隔再查即可。没有任务记录时是 `unknown`，工作进程已经退出是 `interrupted`——注意 `interrupted` 不等于失败，已完成的视频仍然可以取回。

打开 `mcp_v2_tools`（默认开启）后，还会多出 `list_styles` 和 `cancel_job`；想关掉可以设 `AUTOCLIP_FLAGS=mcp_v2_tools=off`。

### 4.4 模板风格

`produce --template` 与 `start_quick_output` 的 `template` 支持五种：`editorial`（杂志风）、`street`（街头快剪）、`news`（新闻）、`cinema`（电影）、`classic`（经典）。

这里有个容易踩的点：**不同入口的默认值不一样**。桌面导入页默认杂志风，CLI 和 MCP 不带参数时默认经典。文档解释了原因——脚本和 agent 更看重"升级前后结果一致"，而经典风格不依赖按需安装的高级包装组件。

### 4.5 端到端演练：两小时播客出三平台

假设你有一期 1 小时 50 分的访谈，已经拿到 `talk.srt`，想同时发抖音、小红书和 YouTube Shorts：

```bash
# 1. 先确认环境和模型
autoclip doctor

# 2. 出片（默认经典风格，竖版让平台决定）
autoclip produce talk.mp4 \
  --srt talk.srt \
  --platform douyin \
  --platform xiaohongshu \
  --platform youtube_shorts \
  --json

# 3. 拿到 project_id 后检查产物
autoclip show PROJECT_ID

# 4. 导出发布套件（视频 + 封面 + 文案 ZIP）
autoclip outputs PROJECT_ID --export-kits
```

如果出来的片段不理想，先调阈值再换模型：

```bash
autoclip run talk.mp4 --srt talk.srt --min-score 0.5
```

`--min-score` 覆盖 step3 的评分阈值（0–1，默认 0.7）。切片数量为 0 时，文档的第一建议就是降到 0.5。

### 4.6 发布到平台

B 站走内置的 `bilibili_publisher.py`，需要登录态；海外平台走 Upload-Post：

```bash
autoclip publish PROJECT_ID --clip 2 --platform tiktok --platform youtube --wait
autoclip publish --list-profiles
```

`--api-key` 在 `publish` 子命令里指的是 Upload-Post 的 Key，和模型用的 `AUTOCLIP_API_KEY` 不是一回事，这点很容易混。

### 4.7 关键环境变量

| 变量 | 作用 | 默认/示例 |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | 选择模型提供商 | `dashscope` |
| `API_DASHSCOPE_API_KEY` | 对应提供商的 Key | 需自行填写 |
| `OPENAI_BASE_URL` | OpenAI 兼容接口地址 | 留空走官方 |
| `API_MODEL_NAME` | 模型名 | `qwen-plus` |
| `API_TIMEOUT` | 单次请求超时（秒） | `30` |
| `PROCESSING_CHUNK_SIZE` | 字幕分块大小 | `5000` |
| `PROCESSING_MIN_SCORE_THRESHOLD` | 选段评分阈值 | `0.7` |
| `PROCESSING_MAX_CLIPS_PER_COLLECTION` | 每个合集最大切片数 | `5` |
| `PROCESSING_MAX_RETRIES` | 失败重试次数 | `3` |
| `AUTOCLIP_YT_SUBTITLE_LANGS` | YouTube 字幕语言优先级 | `zh-Hans,zh,en` |
| `AUTOCLIP_DATA_DIR` | 独立数据目录 | 桌面默认目录 |

做 demo 或跑批时建议用 `--data-dir` / `AUTOCLIP_DATA_DIR` 指到独立目录，避免污染正式项目库；独立目录需要自己的模型配置，不会读取另一个目录里的密钥。

## 五、常见问题与解决方案

**1. 运行 `autoclip` 报找不到 ffmpeg**

- 现象：`doctor` 里 ffmpeg 一项打叉，或流水线在 step6 渲染阶段失败。
- 原因：AutoClip 的所有裁切、拼接、字幕烧录都依赖系统 FFmpeg，CLI/Docker 模式不捆绑。
- 解决：macOS `brew install ffmpeg`，Debian/Ubuntu `apt install ffmpeg`，Windows 用 winget 或从官网下载后加入 PATH；装完重跑 `autoclip doctor` 确认。

**2. 长视频一条切片都没生成**

- 现象：任务 `completed`，但 `clips` 为空。
- 原因：评分阈值过高、字幕缺失导致模型没有可用输入、模型连接失败，或素材超过平台时长限制。
- 解决：先把 `--min-score` 降到 0.5；确认 `--srt` 是否存在或本地 Whisper 是否装好；`autoclip doctor --provider <name>` 检查模型连通性；看失败阶段日志（数据目录下 `logs/cli.log`，加 `-v` 打到终端）。

**3. `youtube_long` 平台导出失败**

- 现象：选 `youtube_long` 后提示长度不足。
- 原因：README 明确写了 YouTube 长视频当前只生成至少 180 秒的完整片段。
- 解决：短素材改用 `youtube_shorts`、`tiktok` 或 `bilibili`。

**4. Docker 起来后 3000 端口打不开**

- 现象：容器在跑，浏览器连不上，或上传目录写入失败。
- 原因：宿主机端口被占、`.env` 没复制、`data/logs/uploads` 目录不存在导致 bind mount 失败。
- 解决：按 README 的三条命令先 `cp env.example .env` 再 `mkdir -p data logs uploads`，然后 `docker compose up -d --build`；权限和自定义 origin 见 `docs/DOCKER.en.md`。

**5. 云端模型 401 / 404 / 超时**

- 现象：设置页"测试连接"失败，或分析阶段整片报错。
- 原因：Key 与 provider 不匹配、Base URL 填错（例如国内站 Key 用了国际站地址）、模型名不存在、超时太短。
- 解决：核对 `LLM_PROVIDER` 与 `API_*_KEY` 的对应关系；阿里云国际站要设 `DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`；适当调大 `API_TIMEOUT`；本地模型确认 Ollama 在 `11434` 监听。

**6. YouTube 字幕下载频繁 429**

- 现象：批量处理 YouTube 视频时字幕抓取失败。
- 原因：一次请求的语言列表过长，触发限流。
- 解决：收紧 `AUTOCLIP_YT_SUBTITLE_LANGS`（默认 `zh-Hans,zh,en`），必要时设 `AUTOCLIP_YT_CLIENT` 换 player client 兜底；仍失败就先下载视频再用本地 Whisper。

**7. OBS 下播后没有自动出片**

- 现象：直播结束了，项目列表里没有新项目。
- 原因：自动出片默认关闭；OBS WebSocket 版本低于 5.5 无法检测录像分卷；只录屏不推流、或录像在断线/应用退出期间完成，都不会自动派发；多文件/分卷/归属不清的场次会被跳过。
- 解决：在"设置 → 应用 → OBS Studio"里显式开启并完成模型预检；确认 OBS 版本与 4455 端口；错过的场次用手动导入；分卷录像首版要求单文件。

**8. MCP 任务查询返回 `interrupted`**

- 现象：`get_quick_output_status` 显示进程已不在。
- 原因：MCP server 在制作完成前退出，或任务被 `cancel_job` 取消。
- 解决：保持 MCP 服务运行到终态；已完成的视频仍可取回；被取消的任务状态是 `cancelled`，成片保留，临时文件已清理。

**9. macOS 提示"无法验证开发者"**

- 现象：首次打开 `.dmg` 被 Gatekeeper 拦下。
- 原因：代码签名与 Apple 公证尚未完成，README 指向 issue #119。
- 解决：在"系统设置 → 隐私与安全性"里选择"仍要打开"，或从源码自行构建。

## 六、总结

AutoClip 值得关注的地方，不是"AI 会剪视频"这个已经被说了无数遍的概念，而是它把长视频再加工做成了一条**可本地运行、可被 agent 调用、可审计成本**的工程流水线。字幕优先 + ASR 兜底解决了输入质量，六步流水线把"选段"拆成可评分的结构化问题，模型提供商抽象层让云端和本地模型能自由替换，OBS WebSocket 那一套又把"直播结束"变成了可靠的触发信号。

它适合谁？做播客/访谈/课程切条的内容团队、需要批量产出竖版素材的运营、想把剪辑接进自己 agent 工作流的技术人，以及在意素材不出本机的用户。不太适合追求电影级手工调色和复杂多轨合成的专业剪辑——AutoClip 的目标是"快速产出可发布的 80 分成品"，不是替代 Premiere 或 DaVinci。

局限也很清楚：选段质量强依赖字幕和模型能力，游戏高光这类弱口播场景仍在迭代（技术文档自己承认两小时以上的长直播尚未充分验证）；安装包未签名、单人维护、issue 响应是异步的。但以 MIT 协议、15k star 和这套文档密度来看，它已经是"本地优先 AI 剪辑"这个方向上少有的完整实现。

项目地址：<https://github.com/zhouxiaoka/autoclip>
