---
title: "last30days-skill：基于真实用户互动的多源AI研究引擎"
date: 2026-06-05
description: "一个能够并行搜索 Reddit、X、YouTube、TikTok、Polymarket 等多个平台的 AI Agent 技能，通过用户点赞、评论、资金投注等真实互动数据对信息评分，生成基于\"人民搜索\"而非\"编辑搜索\"的深度研究报告。"
author: "Cheman"
slug: last30days-skill
draft: false
categories: [技术, AI工具]
tags: [GitHub, 开源, AI Agent, 搜索, Claude Code]
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

今天在 GitHub Trending 上看到一个有意思的项目：**last30days-skill**，它是一个 AI Agent 驱动的多源搜索引擎，评分依据不是编辑意志，而是点赞、评论和真金白银的预测市场赔率。

## 一、项目概述

**last30days-skill** 是一个为 Claude Code、Codex、Cursor、Copilot、Gemini CLI 等 50+ AI Agent 宿主提供的研究技能。它的核心理念是：

> Google 聚合的是编辑内容，而 /last30days 搜索的是真实的人。

该项目由 @mvanhorn 开发，目前在 GitHub Trending 日榜排名第一，已通过 Agent Skills 市场支持所有主流 AI 编程助手。

### 核心特性

- **多平台并行搜索**：同时搜索 Reddit、X、YouTube、TikTok、Instagram Reels、Hacker News、Polymarket、GitHub、Digg、Threads、Pinterest、Bluesky、Perplexity 等 14+ 平台
- **真实用户互动评分**：通过点赞数、评论数、Upvote 数、预测市场赔率等真实互动数据对搜索结果评分
- **智能实体解析**：v3 引擎能够理解搜索主题，自动解析相关人物、子版块、GitHub 仓库等（例如搜索 "OpenClaw" 会自动解析 @steipete、r/openclaw、r/ClaudeCode 等）
- **跨源聚类合并**：同一故事在 Reddit、X、YouTube 出现时，会自动合并为一个聚类，而非显示三个独立条目
- **Best Takes 精选**：v3 新增幽默/智慧/病毒性评分，在研究报告末尾附上社区最精彩的一线评论

## 二、技术原理

### 架构设计

该项目采用 **Python + Node.js 混合架构**：

- **Python 引擎**（v3）：负责多源搜索、实体解析、结果评分、聚类合并、合成生成
- **Node.js  vendor**（内置）：提供 X/Twitter 搜索能力（通过 Bird 客户端）
- **Agent Skills 接口层**：通过 `SKILL.md` 定义标准技能规范，兼容 50+ AI Agent 宿主

### 核心技术栈

| 技术 | 用途 |
|------|------|
| Python 3.12+ | 主引擎（搜索、评分、合成） |
| yt-dlp | YouTube 转录文本提取 |
| Node.js (vendor) | X/Twitter 搜索（Bird 客户端） |
| ScrapeCreators API | TikTok、Instagram、Threads、Pinterest 数据 |
| OpenRouter API | Perplexity Sonar 搜索（可选） |
| SQLite | 趋势监控数据存储（可选） |
| pyproject.toml | 依赖管理（零依赖设计） |

### 数据流动

```
用户输入主题
    ↓
[智能实体解析] → 解析人物、仓库、子版块、哈希标签
    ↓
[多平台并行搜索] → Reddit、X、YouTube、TikTok、Polymarket...
    ↓
[互动数据评分] → Upvotes、Likes、Views、Odds
    ↓
[跨源聚类合并] → 同一故事合并
    ↓
[AI 合成引擎] → 生成结构化报告 + 引用标注
    ↓
输出：Markdown / HTML 简报
```

### 关键技术亮点

1. **免费 Reddit 评论**：通过公开 JSON API 获取帖子和热门评论及点赞数，无需 API Key
2. **YouTube 转录文本搜索**：将 45 分钟深度视频中的 5 句关键引用提取出来
3. **Polymarket 赔率接入**：不是观点，是真实资金背后的概率（例如"Kanye 是否会再次发推？" 86% 概率）
4. **单遍比较搜索**："CLI vs MCP" 只需一次传递即可完成双向实体感知子查询，从 12+ 分钟降至 3 分钟
5. **GitHub 人物模式**：当主题是人时，引擎从关键词搜索切换到作者范围查询（例如 `/last30days Peter Steinberger --github-user=steipete` 显示 22 个 PR、85% 合并率）

## 三、安装与快速开始

### 安装方式

**Claude Code（推荐）**：
```bash
/plugin marketplace add mvanhorn/last30days-skill
/plugin install last30days
```

**Codex、Cursor、Copilot、Gemini CLI 等 Agent Skills 宿主**：
```bash
npx skills add mvanhorn/last30days-skill -g
```

**OpenClaw**：
```bash
clawhub install last30days-official
```

**claude.ai（网页版）**：
1. [下载 `last30days.skill`](https://github.com/mvanhorn/last30days-skill/releases/latest/download/last30days.skill)
2. 进入 [claude.ai 设置 > 功能 > 技能](https://claude.ai/settings/capabilities)
3. 点击技能面板中的 `+` 按钮，拖入文件

### 环境要求

- Python >= 3.12
- Node.js（内置 vendor Bird 客户端）
- yt-dlp（可选，用于 YouTube 转录）
- ScrapeCreators API Key（可选，用于 TikTok/Instagram/Threads/Pinterest）
- OpenRouter API Key（可选，用于 Perplexity Sonar 搜索）

### 最简运行示例

**Claude Code 中**：
```
/last30days Peter Steinberger
```

**自然语言模式**：
```
/last30days OpenClaw, give me a shareable HTML brief
```

**输出示例**：
- 加入 OpenAI Codex 团队
- 正在对抗 Anthropic 对第三方 Agent 的禁令
- GitHub 上 23 个 PR，85% 合并率
- 正在构建跨设备 Agent 控制系统 "LobsterOS"
- r/ClaudeCode 热议："英雄还是难以忍受？" (227 upvotes)

## 四、使用方法与实战

### 场景 1：会前调研

```
/last30days Peter Steinberger
```

获取对方过去 30 天的真实动态：
- 最新职业动向（加入 OpenAI Codex）
- GitHub 活跃度（PR 数量、合并率）
- 社区讨论热度（Reddit 投票数）
- 争议点（Anthropic 禁令讨论）

### 场景 2：竞品对比

```
/last30days OpenClaw vs Hermes vs Paperclip
```

自动发现竞品并生成对比表：
- OpenClaw = 执行器（351K GitHub stars，已上线）
- Hermes = 自我改进大脑（31K stars）
- Paperclip = 组织架构（49K stars）
- 架构、内存、安全性、最佳用途对比表

### 场景 3：热点事件追踪

```
/last30days Kanye West
```

聚合多平台信息：
- UK 签证被拒
- Wireless Festival 取消
- BULLY 专辑 Billboard #2
- Fantano 结束"Yay 休假"进行评测（653K 观看）
- Polymarket："Kanye 会再次发推吗？" 86% 概率

### 场景 4：生成可分享的 HTML 简报

```
/last30days OpenClaw --emit=html
```

生成自包含、深色模式、可打印的 HTML 文件：
- 内联 CSS，无 JavaScript
- 系统字体回退（Inter、JetBrains Mono）
- 可离线使用
- 可拖入 Slack / Email / Notion

### 场景 5：ELI5 模式（通俗解释）

```
/last30days Arizona Basketball
```

然后说：
```
eli5 on
```

输出变为：
> "Arizona 靠身体对抗取胜"  
> 而非："Arizona 的 Identity 是油漆区得分（50%+ 命中率，全国第 9）"

## 五、常见问题与解决方案

### 安装失败

**问题**：`npx skills add` 报错 "No compatible harness found"

**解决方案**：
- 确认已安装 Node.js 18+
- 手动指定宿主：```npx skills add mvanhorn/last30days-skill -g -a claude-code```

### Reddit 评论无法获取

**问题**：只有帖子标题，没有评论内容

**解决方案**：
- 检查网络连接（Reddit JSON API 可能被墙）
- 尝试设置代理：```export HTTPS_PROXY=http://proxy:port```

### YouTube 转录提取失败

**问题**：```ERROR: Unable to extract transcript```

**解决方案**：
- 更新 yt-dlp：```brew upgrade yt-dlp```
- 部分视频无字幕，引擎会自动跳过

### ScrapeCreators API 费用超预期

**问题**：TikTok/Instagram 搜索产生大量 API 调用

**解决方案**：
- 默认不启用，需手动设置 `SCRAPECREATORS_API_KEY`
- 使用 `EXCLUDE_SOURCES=tiktok,instagram,threads` 排除特定源
- YouTube 评论和 TikTok 评论需显式启用（每个视频额外 ScrapeCreators 调用）

### Git 推送失败（OpenClaw 集成）

**问题**：```git push``` 失败，提示认证错误

**解决方案**：
- 配置 SSH Key：```ssh-keygen -t ed25519 -C "your_email@example.com"```
- 或配置 Personal Access Token
- 检查远程仓库 URL：```git remote -v```

### 搜索结果不包含 X / Twitter

**问题**：`/last30days` 输出中没有 X 帖子

**解决方案**：
- 在任意浏览器中登录 x.com
- 运行一次 `/last30days`，触发设置向导
- 或手动设置 Cookie：```export TWITTER_COOKIES="..."```

## 六、总结

**last30days-skill** 是一个开创性的 AI Agent 技能，它从根本上改变了我们获取信息的方式：

1. **从"编辑搜索"到"人民搜索"**：通过真实互动数据评分，而非 SEO 优化内容
2. **打破平台壁垒**：单个 AI Agent 现在可以同时搜索 14+ 个平台，无需每个平台单独 API
3. **深度而非广度**：不是标题和链接，而是完整转录文本、热门评论、预测市场赔率
4. **智能实体解析**：v3 引擎理解你的搜索主题，自动找到相关人物、社区、仓库
5. **开源且免费**：MIT 协议，无追踪，无分析，研究结果保留在本地

**适用人群**：
- 销售/会前调研（了解客户最近 30 天动态）
- 竞品分析（自动发现竞品并生成对比）
- 热点追踪（聚合多平台观点）
- 旅游规划（获取最新等待时间、闭园信息）
- AI 研究者（了解社区最新 Prompt 技巧）

**项目数据**：
- GitHub Stars：Trending #1（2026-06-05）
- 测试覆盖：1,012 个测试通过
- 支持宿主：50+ Agent Skills 宿主
- 开源协议：MIT
- 活跃维护：v3.3.1（2026 年 6 月）

如果你想在会议前真正了解一个人，在构建产品前了解社区痛点，在做决策前了解真实世界动态，**last30days-skill** 是你不可或缺的 AI 研究助手。

**项目链接**：[https://github.com/mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)
