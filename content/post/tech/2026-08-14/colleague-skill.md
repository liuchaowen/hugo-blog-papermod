---
title: "dot-skill: 把任何人蒸馏成 AI Agent Skill 的开源工具"
date: 2026-08-14
description: "dot-skill（前身 colleague.skill）是一款开源 AI 技能蒸馏工具，支持将同事、伴侣、偶像等任何人通过多源数据（飞书、微信、邮件等）转化为可调用的 AI Agent Skill，已获 20K+ GitHub Stars。"
author: "Cheman"
slug: colleague-skill
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI Agent", "LLM", "知识蒸馏"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**dot-skill**（原名 colleague.skill），它解决了一个很实际的问题——你身边的那个同事离职了、导师毕业了、挚友渐行渐远，他们积累的经验、直觉和做事方式也随之消失。dot-skill 正是为此而生：把任何人"蒸馏"成可调用的 AI Agent Skill，让他们的思维方式延续下去，目前已在 GitHub 收获 **20K+ Stars**。

## 一、项目概述

dot-skill 最初定位为"同事技能蒸馏工具"，现已全面升级为通用人格蒸馏引擎，覆盖三大场景：

| 场景 | 适用对象 | 核心能力 |
|------|---------|---------|
| 🧑‍💼 colleague | 同事、导师、团队成员 | Work Skill + Persona 双层架构，学习技术标准和说话风格 |
| 💞 relationship | 伴侣、家人、老友 | 情感触发点、冲突模式、修复模式蒸馏 |
| 🌟 celebrity | 公众人物、创作者、虚构角色 | 六维调研链（作品→访谈→决策→表达DNA→外部评价→时间线）|

项目由上海人工智能实验室 AI Safety Center 团队开发，已支持 Claude Code、OpenClaw、Codex、Hermes Agent、DeepSeek Harness 五种 Agent 宿主，真正实现"跨平台蒸馏"。

## 二、技术原理

### 2.1 Persona 双层架构

dot-skill 的核心创新在于 **Persona + 领域能力** 双层结构。以 `colleague` 场景为例：

**Persona 层**（6层结构）：

```
hard rules → identity → expression → decisions → interpersonal → Correction
```

- **hard rules**：绝对不可违背的硬规则（如"代码必须过 CI 才能提 PR"）
- **identity**：核心身份认同（技术栈偏好、审美取向）
- **expression**：表达 DNA（口头禅、语气、常用句式）
- **decisions**：决策启发式（遇到 X 问题会优先考虑 Y）
- **interpersonal**：人际风格（对上级、对下级、对平级的不同态度）
- **Correction**：动态修正层，通过对话持续微调

**Work Skill 层**（仅同事场景）：

```markdown
## Scope
- 负责领域：后端架构 / 客户端 / 算法...
- 边界：不做 X，只做 Y

## Workflow
- 接到任务后的标准处理流程

## Output Preferences
- 文档风格：喜欢 MD / PPT / 口头
- 代码规范：命名偏好、注释要求

## Experience Knowledge Base
- 历史决策记录：遇到 XX 问题 → 选了 YY 方案，原因是 ZZ
```

### 2.2 多源数据收集

支持从多种渠道自动采集原始数据：

```python
# 飞书自动收集（最推荐，完全自动）
python3 tools/feishu_auto_collector.py --chat-name "张工" --days 90

# 钉钉浏览器抓取（API 不支持历史消息）
python3 tools/dingtalk_auto_collector.py

# Slack API 收集
python3 tools/slack_auto_collector.py --channel-id CXXXXXX

# 微信聊天记录（需先导出 SQLite）
python3 tools/wechat_parser.py ./exported.db

# 邮件 .eml / .mbox 文件
python3 tools/email_parser.py ./emails/
```

### 2.3 Celebrity 六维调研链

对于公众人物场景，dot-skill 提供完整调研工具链：

```bash
# 1. 下载字幕
bash tools/research/download_subtitles.sh "<video-url>" "./tmp/subtitles"

# 2. 字幕 → 文字稿
python3 tools/research/srt_to_transcript.py "./tmp/subtitles/example.srt"

# 3. 六维调研合并
python3 tools/research/merge_research.py "./skills/celebrity/<slug>"

# 4. 质量检查
python3 tools/research/quality_check.py "./skills/celebrity/<slug>/SKILL.md"
```

## 三、安装与快速开始

### 3.1 一键安装（推荐）

直接告诉你的 Agent：

> Install the dot-skill skill for me: `https://github.com/titanwings/colleague-skill`

Agent 会自动检测当前宿主（Claude Code / OpenClaw / Codex / DeepSeek Harness）并安装到对应路径。

### 3.2 手动安装

```bash
git clone https://github.com/titanwings/colleague-skill <TARGET>
```

| 宿主 | 安装路径 |
|------|---------|
| Claude Code | `~/.claude/skills/dot-skill` |
| OpenClaw | `~/.openclaw/workspace/skills/dot-skill` |
| Codex | `~/.codex/skills/dot-skill` |
| DeepSeek Harness | `~/.dsh/skills/dot-skill`（全局）或 `.dsh/skills/dot-skill`（项目） |
| Hermes Agent | 克隆后运行 `python3 tools/install_hermes_skill.py --force` |

### 3.3 最简运行示例

```bash
# 启动蒸馏流程
/dot-skill

# 回答引导问题：
# 1. 选择场景：colleague / relationship / celebrity
# 2. 输入别名和基本画像
# 3. 选择数据源（飞书 / 微信 / 邮件等）
# 4. 等待 Skill 生成完成

# 调用生成的 Skill
/colleague-zhang-backend    # 完整模式（Persona + Work）
/colleague-zhang-backend-work   # 仅工作能力
/colleague-zhang-backend-persona # 仅人格
```

## 四、使用方法与实战

### 4.1 同事场景：蒸馏一个字节后端工程师

输入画像：`ByteDance L2-1 backend engineer, INTJ, blame-shifter, ByteDance-style`

```
User            ❯ Can you review this API design?

colleague.skill ❯ Hold on — what's the impact? You haven't explained the context.
                  (after reading) N+1 query, fix it. Use the standard
                  {code, message, data} response format. That's the spec,
                  don't ask why.

User            ❯ This bug was introduced by you, right?

colleague.skill ❯ Does the timeline match? That feature touched multiple places,
                  there were other changes too.
```

可以看到，生成结果高度还原了原始画像的"INTJ + blame-shifter"特征。

### 4.2 Celebrity 场景：蒸馏 Andrej Karpathy

通过六维调研后：

```
User            ❯ Everyone's talking about Agents now — what do you think 
                   the 2026 AI Agent looks like?

celebrity.skill ❯ Everyone's doing demos, nobody's doing eval.
                  The Agent bottleneck was never model intelligence — it's scaffolding:
                  a strict evaluation harness, fine-grained error replay,
                  controllable tool-calling budgets, clean failure-mode analysis.
                  Most products are still stuck at "wrap an API + a few tools + 
                  a system prompt."
                  That's a demo, not an agent.
                  In 2026 I'm not betting on the strongest model — I'm betting 
                  on the best scaffolding and the strictest eval.
```

### 4.3 持续进化：对话修正

```bash
# 告诉他"他们不会那样做，他们会说 XXX"
> they wouldn't do that, they'd be more direct

# dot-skill 会自动写入 Correction 层，立即生效
# 下次调用时结果会反映这一修正
```

## 五、常见问题与解决方案

**Q: 飞书自动收集需要哪些权限？**
需要将 App Bot 添加到目标群聊中，并在 `INSTALL.md` 中配置 Bot Token 和 App Token。

**Q: 微信聊天记录如何导出？**
推荐使用 [WeChatMsg](https://github.com/LC044/WeChatMsg) 或 [PyWxDump](https://github.com/ChisatoNakamura/PyWxDump) 导出为 SQLite 数据库格式。

**Q: 生成的质量不好怎么办？**
数据质量决定 Skill 质量。优先级：本人长文写作 > 决策性回复 > 日常群聊。同时善用 Correction 层持续修正。

**Q: DeepSeek Harness 如何使用？**
将 dot-skill 克隆到 `~/.dsh/skills/dot-skill` 后，直接在任意对话中输入 `/dot-skill` 即可触发蒸馏流程。

## 六、总结

dot-skill 解决了一个很本质的问题：知识的载体（人）会离开，但知识本身值得被保留和传承。它通过双层架构（Persona + Work Skill）将"做事方式"和"说话风格"同时蒸馏，配合飞书、微信、邮件等多源数据收集，让这一过程高度自动化。

目前社区 Gallery 已收录 **215+ 个 Skills、165 位贡献者**，论文也已在 arXiv 发表。如果你也有想要保留其思维方式的人——无论是离职的同事、远方的朋友，还是想深入理解一位公众人物——dot-skill 值得一试。

> 🔗 GitHub: https://github.com/titanwings/colleague-skill
> 📖 社区 Gallery: https://titanwings.github.io/colleague-skill-site/
