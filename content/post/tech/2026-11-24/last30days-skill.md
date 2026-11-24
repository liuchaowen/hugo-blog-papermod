---
title: "last30days：把 Reddit、X、YouTube、Polymarket 串成一个 AI 研究员（v4.6.0）"
date: "2026-11-24T19:00:00+08:00"
description: "last30days 是一个给 AI Agent 用的开源研究技能：它并行搜索 Reddit、X、YouTube、TikTok、Hacker News、Polymarket、GitHub 等 20 多个来源，按真实用户参与度打分、聚类并由模型综合成一份带引用的简报。本文拆解它的流水线架构、跨平台归一化与 RRF 融合机制，并给出完整安装与实战用法。"
author: "Cheman"
slug: last30days-skill
github_repo: mvanhorn/last30days-skill
draft: false
tags: ["last30days", "AI Agent", "Agent Skills", "深度研究", "Python", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**last30days**（`mvanhorn/last30days-skill`）。它做的事情听起来有点反常识——不是再做一个更好的搜索引擎，而是让 AI Agent 同时钻进 Reddit、X、YouTube、TikTok、Hacker News、Polymarket 这十几个互相隔离的平台，把"真人用注意力投票"的结果捞出来，再综合成一份可以引用的简报。项目用 Python 编写，MIT 协议，当前版本 v4.6.0，仓库已有 73,768 star、6,510 fork。本文从架构原理到安装使用，带你完整过一遍。

## 一、项目概述

`last30days` 的定位可以一句话概括：**给 AI Agent 装一个"过去 30 天真实世界发生了什么"的检索层**。

它的出发点在 README 里写得很直白：Google 聚合的是编辑和 SEO 的结果，而 Reddit 的赞、X 的转发、YouTube 的完播、Polymarket 的真金白银下注，是普通人用注意力和钱包投出来的票。这些数据分散在各自的高墙花园里，每家都有自己的 API、自己的 token、自己的鉴权方式，没有任何单一模型能同时看到全部。作者的解法不是造一个更大的爬虫，而是"bring your own keys"——你带上自己的密钥和浏览器会话，Agent 就能把十几个来源一次性铺开、互相打分、告诉你什么才是真正重要的。

核心特性可以列成这几条：

- **零配置起步**：Reddit（含评论）、Hacker News、Polymarket、GitHub 开箱即用，主题是公司时还会自动读专利 filings 和招聘页，全部不需要任何 key。
- **真实参与度而非 AI 估计**：Reddit 结果会回查官方 `.json` 接口拿真实 upvote、评论数、upvote ratio 和 Top 10 评论；X 走 vendored 的 Bird 客户端或 xAI API，likes/reposts 都是原始数据。
- **跨平台统一打分**：不同平台的量纲差异极大（Reddit 两千赞 vs YouTube 三万播放），引擎用 log1p 压缩加平台参考值归一化后再融合排序。
- **同一事件合并**：Reddit 上宣布、X 上争论、TikTok 上讨论票价的三条内容会被聚成一个 cluster，而不是三条独立结果。
- **Secret Signals（v4 新增）**：读公司的美国专利 filings 和自家招聘页，只标记"与公司一贯路线不符"或"尚未发布"的条目，作为"它接下来要做什么"的前置信号。
- **可引用的细节**：最佳评论单独成行、Polymarket 赔率一行、上市公司股价对比标普 500 一行，方便直接摘进报告。
- **多宿主打包**：同一份技能同时提供 Claude Code 插件、Grok 插件、Agent Skills（`npx skills`）、claude.ai 上传包、Claude Desktop 的 `.mcpb`、OpenClaw 的 clawhub 包。

从成熟度看，这不是一个周末玩具：仓库创建于 2026 年 1 月 23 日，十个月冲到 7 万多 star，`skills/last30days/scripts/lib/` 下已经有 130 多个 Python 模块，涵盖各平台适配器、规划器、融合排序、聚类去重、事实核验、渲染输出等完整分层。作者在 README 里也标了 "GitHub Trending #1 Repository Of The Day"。

和同类工具的差异在于**它不假装自己是搜索引擎**。它更像一个"研究流水线"：检索、归一化、打分、聚类、核验由本地 Python 引擎完成，最后的叙述交给宿主 Agent 的模型。这个分工是理解整个项目的关键。

## 二、技术原理

### 整体架构

项目的物理结构本身就是分层的：

```
last30days-skill/
├── SKILL.md                      # 根技能说明（宿主读取的入口）
├── skills/last30days/
│   ├── SKILL.md                  # 运行时技能契约（v4.6.0，命令与行为的 source of truth）
│   ├── references/               # 按意图路由的参考文档（研究、发现、对比、招聘信号…）
│   └── scripts/
│       ├── last30days.py         # CLI 主入口
│       ├── watchlist.py          # 定时监控
│       ├── briefing.py           # 日报/周报
│       └── lib/                  # 130+ 模块的引擎
├── .claude-plugin/ .codex-plugin/ .grok-plugin/ .github/ mcp/
└── docs/ CONFIGURATION.md CHANGELOG.md
```

运行时的数据流大致是这样：

```
用户: /last30days "某个话题"
        │
        ▼
  ┌───────────────┐
  │ 意图解析/规划  │  planner.py + resolve.py
  │ 实体解析       │  人物→X handle/GitHub；公司→官网/股票代码/子版块
  └───────┬───────┘
          ▼
  ┌───────────────────────────────────────────┐
  │ 并行 fan-out（各来源独立超时、独立失败）    │
  │ reddit  hackernews  x  youtube  tiktok     │
  │ polymarket  github  arxiv  jobs  patents…  │
  └───────┬───────────────────────────────────┘
          ▼
  normalize → filter → 参与度打分 → 加权 RRF 融合
          ▼
  dedupe（同源近重复）→ cluster（MMR 选代表）
          ▼
  freshness 事实核验（对可验证声明回源重取）
          ▼
  render（compact/json/md/html）→ 交给宿主模型综合
```

`SKILL.md` 里的 Reference routing 表值得注意：它不是把所有文档一次性塞给模型，而是按意图路由——做发现模式读 `discovery.md`，做对比读 `comparison.md`，要机器可读 JSON 读 `agent-mode.md`，查招聘信号读 `hiring-signals.md`。这是一个很务实的上下文预算设计：技能说明只保留"什么时候读哪份文档"的路由表，细节按需加载。

### 机制一：来源适配器 + 并行抓取

每个平台在 `lib/` 下都有独立模块（`reddit*.py` 就有 search/enrich/hydrate/session/listing 等七个），统一归一到 v3 的通用 item 模型（`normalize.py`）。抓取层用 `ThreadPoolExecutor` 并发，`fanout.py` 里明确写了设计取舍：多实体 fan-out 时单个实体的失败只记录并丢弃，"主主题跑完，整轮就活着"。这解释了为什么它在只配了部分 key 的情况下依然可用——缺的来源降级，不拖垮全局。

Reddit 这条链路最能体现"真实数据"的执念：先用搜索拿到线程 URL，再逐个请求 `https://reddit.com/r/{sub}/comments/{id}/{slug}/.json` 补齐 score、评论数、upvote ratio、Top 10 评论文本和真实 `created_utc`。所以报告里的"569 upvotes"不是模型编的，是接口返回的。

X 有两个后端，优先级写死在代码里：Node 可用且存在 `AUTH_TOKEN` / `CT0` 时走仓库内置的 Bird 客户端（免费、无弹窗、环境变量鉴权）；否则用 `XAI_API_KEY` 走 xAI 的 `x_search`；两者都没有就整段跳过 X，而不是伪造。

### 机制二：跨平台参与度归一化

这是整个项目最容易被忽略、却最影响结果质量的部分。不同平台的数字不可直接比较：Reddit 的 2000 赞已经是爆款，YouTube 的 30000 播放只是普通视频。`signals.py` 的做法是：

1. 对所有计数取 `log1p`，把长尾压平；
2. 给每个平台一个"高分参考值" `_VOTE_LOG_REFERENCE`，Reddit 是 7.6（约 `log1p(2000)`）、Hacker News 6.2（约 `log1p(500)`）、YouTube/TikTok 10.3（约 `log1p(30000)`）、X/Instagram/Bluesky 9.2（约 `log1p(10000)`）；
3. 平台内部再按字段加权。比如 Reddit 是 `0.50×score + 0.35×comments + 0.05×(ratio×10) + 0.10×top_comment`，YouTube 是 `0.45×views + 0.32×likes + 0.13×comments + 0.10×top_comment`。

注意那条 10% 的 `top_comment` 配额：它让"评论区里被顶到最高的一句话"也能抬高整条内容的权重。作者在注释里写得很清楚，这是为了让"被众人喜欢的评论"像 YouTube/TikTok 一样参与排序。这种细节是拍脑袋写不出来的，只能是长期调参的结果。

### 机制三：加权 RRF 融合与时间窗纪律

多个子查询 × 多个来源会产生几十条排序流，`fusion.py` 用加权 reciprocal rank fusion 合并，平滑常数取标准值 `RRF_K = 60`（Cormack et al. 2009）。RRF 的好处是不依赖各来源分值的绝对尺度，只看名次，天然适合这种异构检索场景。

更值得学的是排序键里的第一项：

```python
return (
    1 if schema.candidate_out_of_window(c) else 0,   # 窗口外永远排在窗口内之后
    -c.rrf_score,
    -c.local_relevance,
    -c.freshness,
    ...
)
```

注释写得很硬气："一份'过去 30 天'的简报如果把九个月前的视频排在第一，就违背了自己的契约。"所以窗口外证据不是被删掉，而是被强制降级——它会出现在结果里，但永远压不过窗口内的内容。这是把产品承诺写进排序函数，比写在文档里靠谱。

### 机制四：去重、聚类与 MMR 选代表

`dedupe.py` 负责同源近重复（同一篇文章被多次提交、同一线程的不同 URL 形态），`cluster.py` 负责跨源聚类。候选先按 `final_score` 排序，但选 cluster 代表时用的是 MMR（Maximal Marginal Relevance），`diversity_lambda = 0.75`：

```
score = 0.75 × final_score − 0.25 × 与已选代表的最大相似度 × 100
```

也就是"相关性占七成半，新颖性占两成半"，每个 cluster 最多选 3 个代表。这样避免一份报告里出现五条说法一样的 Reddit 帖，同时又不至于为了多样性把最相关的证据挤掉。

### 机制五：事实核验与隐私边界

`freshness.py` 的模块注释是 "Deterministic, source-grounded act-time freshness verification"。它把结果里可机器验证的声明抽成 `Claim`（带 source_url、source_timestamp、datum_kind、datum_key、original_value），在出报告前回源重取一次，防止引用过期的赞数或赔率。这比"让模型自己检查一下"要可靠得多，因为核验过程是确定性的、可复现的。

隐私设计也值得一提：默认全部在本机跑，数据只发给你主动调用的那些搜索 API。只有当你配置了 reasoning provider（`OPENAI_API_KEY`、`XAI_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY` 等）时，引擎才会把主题和检索片段发过去做相关性重排；不配 key 就退回本地打分模型，不外发。`LAST30DAYS_STORE=1` 打开的 SQLite 存储也只写本地 `research.db`。

## 三、安装与快速开始

### 环境要求

- **Python 3.12+**（引擎硬性要求，Claude Desktop 的 `.mcpb` 包也复用它）
- **Node.js**（X 搜索用的内置 Bird 客户端需要）
- 可选：`yt-dlp`（YouTube 字幕/评论）、`pdftotext`（本地 PDF 语料）、`arxiv-pp-cli` / `techmeme-pp-cli` / `yahoo-finance-pp-cli`（首次运行 setup 会自动装）

### 安装方式

Claude Code（推荐，marketplace 会自动更新）：

```bash
/plugin marketplace add mvanhorn/last30days-skill
/plugin install last30days
```

Codex、Cursor、Copilot、Gemini CLI 等 50 多个 Agent Skills 宿主：

```bash
npx skills add mvanhorn/last30days-skill -g
```

`-g` 表示装到用户目录、所有项目可用；去掉则是项目内 `./.skills/`。想指定宿主：

```bash
npx skills add mvanhorn/last30days-skill -g -a codex
npx skills add mvanhorn/last30days-skill -g -a cursor
```

OpenClaw 用户：

```bash
clawhub install last30days-official
```

手动安装（开发者模式，符号链接跟随工作区改动）：

```bash
git clone https://github.com/mvanhorn/last30days-skill.git
ln -s "$(pwd)/last30days-skill/skills/last30days" ~/.claude/skills/last30days
```

### 第一次运行

装完直接给话题就行：

```
/last30days AI coding agents
```

零配置状态下 Reddit、HN、Polymarket、GitHub 立刻可用；跑完一次后 setup wizard 会在 30 秒内引导你补齐 X、YouTube、TikTok、arXiv、Techmeme 等来源。

想在跑之前看清它会读什么、写什么、用什么浏览器 cookie，用 preflight：

```bash
python3 skills/last30days/scripts/last30days.py --preflight
```

它会打印配置来源、浏览器 cookie 计划、计划写入的路径、可选命令，**不读 cookie、不写文件、不启动研究**。这是一个很克制的设计，适合在别人的机器上或者 CI 里先做一次体检。

不经过宿主、直接用引擎跑（脚本和 cron 场景）：

```bash
python3 skills/last30days/scripts/last30days.py "AI coding agents" --emit=json
```

`--emit` 支持 `compact` / `json` / `context` / `md` / `html` / `brief`。要稳定契约就用 `json`，需要未版本化的内部结构才加 `--json-profile=raw`。

### 验证

```bash
python3 skills/last30days/scripts/last30days.py --diagnose
```

会打印各 provider 和来源的可用性。返回的简报里如果 Reddit 条目带真实 upvote 数和评论摘录、Polymarket 条目带赔率，说明主链路是通的。

## 四、使用方法与实战

### 场景一：会前人物尽调

```
/last30days Peter Steinberger
```

这是 README 里的第一个例子。你明天要见一个人，Google 给你的是 2023 年的 LinkedIn，而这个命令给你的是"这个月他在干什么"：加入了 OpenAI 的 Codex 团队、在跟 Anthropic 禁第三方 agent 的政策较劲、GitHub 上 23 个 PR、85% 合并率、在做跨设备 agent 控制的 LobsterOS，以及 r/ClaudeCode 上一条 569 赞的争论帖。这些内容散落在 X、Reddit、YouTube 字幕和 GitHub commit 里，没有一条在 Google 首页。

引擎在这一步做的事情是实体解析：`person.py` + `resolve.py` 会找出这个人的 X handle（包括小号）、相关 GitHub 仓库、相关 subreddit、YouTube 频道，然后并行铺开。

### 场景二：看一家公司在发布前在做什么

```
/last30days Apple
```

v4 的两个 Secret Signal 会在这里生效：

- **Patent Secret Signals**：读当月的美国专利 filings，只标记"不符合公司一贯风格"或"描述了尚未发布/宣布的东西"的申请；
- **Jobs Page Secret Signals**：直接读公司自己的招聘页（Workday、Apple、Amazon、Google、Microsoft、Netflix、Oracle 等），把"会暴露下一步"的岗位挑出来。

README 给的例子是：一个 director 岗位在测试"请求是否触发经由合作方 API 和金融系统完成的交易"，读起来像是为"能帮你下单的助手"做质量把关；专利则是在房间照片里点一下设备就能改变其状态。这种信号的价值不在于确定性，而在于它比新闻早。

只想看招聘信号，加参数：

```
/last30days Apple --hiring-signals
```

### 场景三：发现模式（不知道话题，只知道领域）

```
/last30days what's exploding in AI agents?
```

这时候技能切到 discovery 模式：扫 Reddit 分类列表、HN 的 front/best、Digg 的故事流、以及已鉴权的 X；由宿主模型做提名判断（命名、去垃圾、判断内容价值）并写出播客/X 文章角度，最后给你 5–10 个按速度排序的话题，每个都带跨来源数字、momentum 标签和一条可直接执行的 `/last30days "<topic>"` 后续命令。

在 cron 或脚本里直接调引擎的一击式版本（确定性话题名，不生成角度）：

```bash
python3 skills/last30days/scripts/last30days.py --discover "AI agents"
```

注意 discovery 与位置参数主题、`--drill` 互斥。

### 场景四：工具横向对比

```
/last30days OpenClaw vs Hermes vs Paperclip
```

对比模式下，`fanout.py` 会为主主题和每个对比实体各跑一次，`ThreadPoolExecutor` 并行，产出并排表格（架构、记忆、安全、适用场景）。README 里那句 "These aren't competitors, they're layers" 就是这种横向拆解的结果。star 数是走 GitHub API 实时拉的，不是抄博客。

### 参数速查

| 参数 | 作用 |
|------|------|
| `--quick` | 低延迟档，Reddit 取 15–25 线程，90s 超时 |
| `--deep` | 高召回档，Reddit 取 70–100 线程，180s 超时 |
| `--emit=json` | 输出稳定版本的机器可读结构，适合脚本 |
| `--save-dir <path>` | 指定本次结果的保存目录 |
| `--output <file>` | 指定精确输出路径（格式由 `--emit` 决定） |
| `--save-suffix=<name>` | 同一主题多版本共存（比如按客户区分） |
| `--search <sources>` | 逗号分隔，显式指定来源，如 `--search xhs` |
| `--store` | 把结果持久化进本地 SQLite，供趋势监控 |
| `--corpus` | 把本地 Markdown/文本（装了 `pdftotext` 则含 PDF）纳入检索 |
| `--no-browser-cookies` | 禁用浏览器 cookie 读取 |
| `--preflight` | 只打印计划，不执行、不写盘 |

### 结果保存在哪

默认 `LAST30DAYS_MEMORY_DIR` 指向 `~/Documents/Last30Days/`（Windows 是 `C:\Users\<you>\Documents\Last30Days\`）。每次 `--save-dir` 运行产出 `<slug>-raw[-suffix].md`。要改就设环境变量，或者单次用 `--save-dir`。

### 把一次性研究变成趋势监控

这是我觉得最实用的组合。先开存储：

```bash
python3 skills/last30days/scripts/last30days.py "AI coding agents" --store
```

然后用 `watchlist.py` 做定时跑（新发现可以推 Slack / webhook），用 `briefing.py` 出日/周摘要。知识库还能反向使用：

```bash
python3 skills/last30days/scripts/last30days.py library search "MCP servers"
```

离线、确定性地在你保存过的简报里检索，按主题和日期分组；新跑一个话题时，如果历史研究有重叠，报告里会自动出现一段 "From your library"。不想要这个被动上下文就设 `LAST30DAYS_LIBRARY_CONTEXT=off`。

想做可订阅的研究库，用 `library feed` 生成 `index.html` + 本地 Atom `feed.xml`，把输出目录丢到 GitHub Pages 之类的静态托管上即可。`--publish` 是显式 opt-in，而且默认公开，用之前想清楚。

## 五、常见问题与解决方案

**现象：运行时报 Python 版本不满足。**
原因：引擎要求 Python 3.12+，Claude Desktop 的 `.mcpb` 包也复用本机解释器。解决：装 3.12 及以上（Windows 从 python.org 装），并确保 PATH 里 `python3` 指向它；preflight 会打印一个校验过的 `LAST30DAYS_PYTHON=...` 赋值行，后续命令带上它就不会跑错解释器。

**现象：Claude Code 里 `/last30days` 出现两个条目。**
原因：Claude Code 不会跨安装方式去重，marketplace 插件和 `npx skills` 的副本会同时注册。解决：一台机器只用一种安装方式；要换就先把旧的卸掉。

**现象：claude.ai 网页版上传了 skill 但跑不起来。**
原因：网页端需要先开启 "Code execution and file creation" 能力，否则技能没有执行环境。解决：在 Capabilities 里打开后再用。

**现象：结果里完全没有 X 的内容。**
原因：X 需要三选一的凭据——官方 `X_BEARER_TOKEN`、浏览器登录 x.com 后的会话（`AUTH_TOKEN`/`CT0`），或 `XQUIK_API_KEY` / `XAI_API_KEY`；都没有时代码会整段跳过 X，而不是降级返回空壳。解决：登录 x.com 后重跑，或配一个 key；也可以用 `--diagnose` 确认走的是哪个后端。

**现象：YouTube 只有标题，没有字幕金句。**
原因：字幕抓取依赖 `yt-dlp`。解决：`brew install yt-dlp`（Linux 用发行版包管理器），再跑一次。

**现象：TikTok / Instagram 结果很少，也没有评论。**
原因：这两个平台需要 ScrapeCreators key（有 10,000 次免费额度）；没有 key 时会退回 `yt-dlp` 尽力而为，结果更少且没有评论。解决：配 `SCRAPECREATORS_API_KEY`，或者接受降级结果。

**现象：报告里出现了明显超过 30 天的旧内容。**
原因：这是有意的设计。窗口外证据不会被删除，但在排序键里被强制降到所有窗口内证据之后（见 `fusion.py` 的 `candidate_out_of_window`）。解决：不用处理；如果你完全不想看到，缩短查询或换更具体的话题词。

**现象：担心研究内容被发到第三方。**
原因：只有配置了 reasoning provider 时，主题和检索片段才会发给它做重排；`--store` 的 SQLite 也只在本地。解决：不配任何推理 key，引擎会退回本地打分；或者用 `--no-browser-cookies` 加上不配 key 的纯免费来源组合。

**现象：Windows 上 Claude Desktop 装 `.mcpb` 失败。**
原因：README 明确写了 Windows 支持暂缓，等 per-platform manifest entry points 理顺。解决：Windows 上用 Agent Skills 路线（`npx skills add`）或 WSL，Desktop 扩展等后续版本。

**现象：找不到保存的研究文件。**
原因：默认目录是 `~/Documents/Last30Days/`，但 `--output` 会覆盖成精确路径，`--save-dir` 又会改变整个目录。解决：先跑 `--preflight` 看 "planned writes"，或者显式指定 `--save-dir`。

## 六、总结

`last30days` 值得看的地方不在"它接了 20 多个数据源"这个数量，而在它把"什么算重要"这件事工程化了：真实参与度回查、跨平台 log1p 归一化、RRF 融合、时间窗硬约束、MMR 去重、声明级事实核验，每一层都有明确的取舍和注释。它没有试图用一个模型吞下所有平台，而是承认平台是隔离的，用"自带密钥 + 本地流水线 + 宿主模型综合"的方式把它们桥起来。

适合谁：需要做人物/公司/产品尽调的销售、投资、内容创作者；想给自己的 Agent 加一个"最近 30 天真实舆论"工具的开发者；以及想研究多源检索融合怎么落地的人——`lib/` 里那套打分和聚类代码本身就很有参考价值。

不适合谁：想要开箱即用、不愿配任何 key 又要全平台覆盖的人（免费层只有 Reddit/HN/Polymarket/GitHub 等）；对"研究内容可能发给推理 provider"零容忍、又不愿意关掉重排的人；以及期待它给出确定性结论的人——它给的是带出处的证据面，判断仍然要你自己做。

项目地址：<https://github.com/mvanhorn/last30days-skill>，MIT 协议，v4.6.0。
