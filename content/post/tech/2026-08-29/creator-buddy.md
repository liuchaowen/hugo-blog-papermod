---
title: "Creator Buddy：面向内容创作者的全栈 Skill 工具箱"
date: 2026-08-29
description: "基于开放 Agent Skills 协议，为公众号、小红书、视频创作者提供从选题、情报到成品产出的全流程工具集，覆盖定位装修、爆款分析、长短视频创作等完整链路。"
author: "Cheman"
slug: creator-buddy
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "内容创作", "AI Agent", "自媒体工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Creator Buddy**，一套面向内容创作者的全栈 Skill 工具箱，覆盖公众号、小红书、视频三大平台的创作全流程——从平台情报（搜热点、挖爆款、看评论）到成品产出（起标题、写正文、做配图、剪视频）。

## 一、项目概述

Creator Buddy 是一个基于开放 Agent Skills 协议构建的内容创作工具集，旨在帮助内容创作者、运营和自媒体作者完成从选题到成品的全链路工作。它不是简单的"一键起号"工具，而是通过真实平台数据和内容驱动，让创作者一步步做出能发的东西。

### 核心特性

- **三大平台覆盖**：公众号、小红书、视频全流程支持
- **情报驱动创作**：先拉取平台真实内容和数据，再基于语境生成选题
- **全链路工具**：从账号定位、爆款分析到文章撰写、视频剪辑完整覆盖
- **开放协议支持**：兼容 Claude Code、Codex、Cursor、OpenClaw 等 9+ runtime
- **本地优先架构**：凭据不入库，需要登录态的访问只在本机完成

## 二、技术原理

### 架构设计

Creator Buddy 采用模块化 Skill 架构，三大板块独立运作：

```text
gzh-Skills/     公众号工作流
xhs-Skills/     小红书工作流
video-Skills/   视频工作流
```

每个板块由多个独立 Skill 组成，每个 Skill 包含：
- `SKILL.md`：技能描述与使用指南
- `scripts/`：可执行脚本
- `references/`：参考资料

### 核心技术栈

- **平台访问层**：Redfox、Agent Reach、OpenCLI、bili-cli、公开 API
- **数据处理**：去重、排序、评分、结构化报告生成
- **内容生成**：Codex 内置出图模型、本地确定性渲染
- **协议支持**：Agent Skills Standard（vercel-labs/skills）

### 工作流程

情报侧与产出侧分离：

```python
# 情报侧：读取公开内容 → 结构化报告 → 选题方向
情报流程 = {
    "数据源": ["公开页面", "第三方API", "本地只读CLI"],
    "处理": ["去重", "排序", "评分"],
    "输出": "结构化报告"
}

# 产出侧：选题 → 标题/正文/配图/视频
产出流程 = {
    "输入": "选题 + 平台语境",
    "输出": ["标题", "正文", "配图", "排版", "视频"]
}
```

### 数据流分析

以小红书爆款检测为例：

```python
# 伪代码示例：小红书热门笔记抓取
def fetch_xhs_hot_notes(keywords, days=7):
    # 1. Agent Reach 优先访问
    notes = agent_reach_search(keywords, days)

    # 2. Guaikei API 兜底
    if not notes:
        notes = guaikei_api_search(
            token=os.getenv("GUAIKEI_API_TOKEN"),
            keywords=keywords
        )

    # 3. 去重排序
    unique_notes = deduplicate(notes)
    ranked = sort_by_engagement(unique_notes)

    return ranked[:10]  # 返回 Top 10
```

### 风控机制

```python
# 安全访问约束
SECURITY_RULES = {
    "只读公开数据": True,
    "不做账号动作": ["发帖", "点赞", "评论", "关注"],
    "不绕过限制": ["验证码", "登录", "付费墙"],
    "凭据不入库": True,
    "低频使用": "小批量、低并发、按需采样"
}
```

## 三、安装与快速开始

### 环境要求

- Python 3.7+
- 兼容的 Agent Runtime（Claude Code / Codex / Cursor / OpenClaw 等）
- 可选：GitHub Personal Access Token（提高限流）

### 安装方式

**方式一：一行命令安装（推荐）**

```bash
# 跨 runtime 自动识别
npx skills add SpaceZephyr/creator-buddy

# 或指定 runtime
npx skills add SpaceZephyr/creator-buddy -a codex
npx skills add SpaceZephyr/creator-buddy -a claude-code
```

**方式二：手动安装**

```bash
git clone https://github.com/SpaceZephyr/creator-buddy.git
# 复制所需 skill 目录到你的 runtime skills 目录
```

### 最简运行示例

```text
# 在 Agent 中直接使用自然语言
帮我搜一下小红书最近 Codex 的热门笔记
查一下公众号里 AI Agent 相关爆款
这篇文章帮我起 10 个爆款标题
把这段内容做成公众号配图
```

## 四、使用方法与实战

### 公众号工作流

**账号定位与装修：**

```bash
# 定位分析
python3 gzh-Skills/gzh-positioning/scripts/positioning.py \
  --industry "AI编程" \
  --target-audience "开发者"

# 爆款文章分析
python3 gzh-Skills/baokuan-article-analysis/scripts/daily_sector_trends.py \
  --sector "AI Coding=Codex,Claude Code,AI编程" \
  --days 7 \
  --output-dir ./reports
```

**长文写作：**

```text
用户 ❯ 帮我写一篇关于 Claude Code 的长文，用访谈写法
助手 ❯ 已选择访谈写法，生成 3000 字长文，包含：
      - 六个路由选项（访谈/大纲/续写/整合/破题/重写）
      - 成稿质检（结构/逻辑/可读性）
      - 字数校验（微信字数限制）
```

### 小红书工作流

**起号全流程（10 个环节）：**

```text
用户 ❯ 帮我起一个小红书账号，做 AI 编程方向
助手 ❯ 已启动 space-xhs-buddy 总控台，当前状态：
      [1/10] 定位分析 → 卡点：未明确人设
      建议：选择「技术实践者」或「效率工具控」人设
```

**爆款笔记生成：**

```text
用户 ❯ 帮我写一篇 Codex 使用教程笔记
助手 ❯ 已生成：
      - 15 个爆款标题候选（评分排序）
      - 7 种笔记类型路由（教程/测评/干货/…）
      - 发布前 14 项体检（字数/标签/封面合规）
```

### 视频工作流

**从想法到成片：**

```bash
# 总控调度
用户 ❯ 帮我把这条口播视频从头做到发
助手 ❯ 已启动 space-video 总控，流程：
      [1/6] 选题 → 已完成（参考视频去水印）
      [2/6] 脚本 → 正在生成（精确到秒分镜）
      [3/6] 剪辑 → 待执行（删前保后 + 风险分层）
      ...
```

**字幕提取：**

```python
# 从视频链接提取字幕
python3 video-Skills/space-video-transcript/scripts/transcript.py \
  --url "https://www.youtube.com/watch?v=xxx" \
  --output-format "markdown+srt"
```

**B-roll 生成：**

```text
用户 ❯ 把这篇文章做成一支手绘图解 B-roll
助手 ❯ 已完成：
      - 抽取 5 张配图 → 拆成 8 帧分镜
      - 逐帧生成手绘线稿静帧
      - Seedance 手绘生长动效
      - 输出：broll_final.mp4（4:3，48s）
```

### 进阶用法：跨平台监控

```bash
# 全域内容搜索（小红书/B站/抖音）
python3 gzh-Skills/global-content-search/scripts/search.py \
  --platforms "xhs,bilibili,douyin" \
  --keywords "Claude Code,AI编程" \
  --days 7 \
  --output ./reports/cross_platform.json
```

## 五、常见问题与解决方案

### 安装失败

**问题 1：npx 命令不存在**

```bash
# 解决方案：安装 Node.js
brew install node  # macOS
# 或访问 https://nodejs.org 下载安装
```

**问题 2：runtime 不识别 skill**

```bash
# 检查 skill 目录是否正确
ls -la ~/.claude-code/skills/creator-buddy
ls -la ~/.codex/skills/creator-buddy

# 手动指定 runtime
npx skills add SpaceZephyr/creator-buddy -a claude-code
```

### 运行时错误

**问题 3：小红书搜索返回空**

```python
# 原因：缺少 GUAIKEI_API_TOKEN
# 解决方案：配置环境变量
export GUAIKEI_API_TOKEN="your_token_here"

# 或在 .env 文件中配置
echo "GUAIKEI_API_TOKEN=your_token" >> ~/.env
```

**问题 4：B站视频提取失败**

```bash
# 安装 bili-cli
pip install bili-cli

# 检查安装
bili-cli --version
```

### 性能问题

**问题 5：搜索速度慢**

```python
# 优化方案：减少并发、缩小时间范围
python3 scripts/search.py \
  --days 3 \          # 缩短到 3 天
  --limit 20 \        # 限制结果数
  --no-concurrent     # 关闭并发
```

### 兼容性问题

**问题 6：Hermes Agent 不支持**

```text
# 当前支持列表
✓ Claude Code
✓ Codex
✓ Cursor
✓ OpenClaw
✓ Hermes Agent
✓ CodeBuddy
✓ Workbuddy
✓ Gemini CLI
✓ OpenCode

# 不在列表？手动复制 SKILL.md 内容到对话
```

## 六、总结

Creator Buddy 是目前最全面的内容创作 Skill 工具箱，其核心价值在于：

1. **真实数据驱动**：不是让 AI 凭空编选题，而是先拉取平台真实内容和数据
2. **全链路覆盖**：从定位、选题、写作到配图、视频、发布完整流程
3. **开放协议支持**：兼容 9+ 主流 Agent runtime，跨平台可用
4. **安全可控**：本地优先、凭据不入库、只读公开数据、低频使用

对于公众号作者、小红书运营、视频创作者、自媒体团队来说，这是一个值得深入使用的生产力工具。项目仍在快速迭代中，建议 star 关注更新。
