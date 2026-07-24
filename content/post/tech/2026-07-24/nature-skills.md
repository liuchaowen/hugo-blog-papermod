---
title: "Nature Skills：面向全球学者的科研 Agent Skill 库"
date: 2026-07-24
description: "Nature Skills 是一个开源科研技能库，为 Claude Code、Codex、OpenClaw 等 AI Agent 提供 17 个可直接复用的科研技能，覆盖论文阅读、润色、PPT 生成、专利撰写、文献检索等场景，已获 Google DeepMind 借鉴。"
author: "Cheman"
slug: nature-skills
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["GitHub", "开源", "AI", "科研", "Claude", "Agent", "技能库"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Nature Skills**，这是一个面向全球 AI 学者收录可复用科研技能的开源 Skill 库，强调真实问题解决、可验证工作流与可直接使用的科研产物。更值得关注的是，项目创始人透露其设计已被 Google DeepMind 参考借鉴，推出了 Science Skills——这意味着中国开发者的原创思想正在反向影响国际顶尖 AI 团队。

## 一、项目概述

Nature Skills 由独立开发者 @袁一哲 发起和维护，当前收录 **17 个可安装技能**，全部围绕 `SKILL.md` 格式组织，可直接接入 Claude Code、Codex、OpenClaw、OpenCode、Hermes 等主流 AI Agent 框架。

**核心技能一览：**

| 技能 | 状态 | 用途 |
|------|------|------|
| nature-figure | Stable | Nature 风格投稿级科研图（Python/R，含 GPT Image 2 示意图生成） |
| nature-polishing | Stable | 学术文本润色与 Nature 风格英文改写 |
| nature-writing | Draft | Nature 风格摘要、引言、讨论章节起草 |
| nature-reviewer | Draft | 模拟审稿人输出三份 Reviewer Reports |
| nature-citation | Beta | CNS 系列支撑文献检索与 Zotero RDF 导出 |
| nature-reader | Beta | 中英文对照 Markdown 论文 reader |
| nature-response | Beta | 返修邮件解析 + 逐点回复 + 标红修改稿 |
| nature-paper2ppt | Beta | 论文 → 中文 PPT 文献汇报 deck |
| nature-paper-to-patent | Beta | 论文转中国发明专利草稿（附查新、技术交底书迭代） |
| nature-ref-verifier | Stable | 参考文献多源交叉验证（作者/标题/年份/页码） |
| nature-academic-search | Beta | 多源文献检索 + 引用核验 + 高影响力引用者画像 |
| nature-downloader | Beta | 图书馆资源入口 + CARSI + Web of Science PDF 获取 |
| nature-literature-pipeline | Stable | 每日文献自动发现 + 六维评分 + 本地归档 |
| nature-proposal-writer | Beta | proposal-first 科研写作状态机 |

**Google DeepMind 的认可**

创始人在 README 中透露了一个令人印象深刻的细节：Google DeepMind 在开发 Science Skills 时，参考了 Nature Skills 的引用体系、脚本思路以及技能设计哲学。作者坦言："当国外的顶尖 AI 机构开始从我们的工作中汲取灵感时，说明中国开发者的原创思想正在被世界看见。"

## 二、技术原理

### 2.1 Skill 架构设计

每个 Skill 以独立目录结构组织，包含：

```text
skills/nature-<topic>/
├── SKILL.md          # Agent 触发入口，含 frontmatter + 规则 + 工作流
├── README.md         # 面向人的中文说明
├── README_EN.md      # 英文镜像说明
├── manifest.yaml     # Router-style 技能路由配置
├── references/       # 模块化规则文件
├── static/           # 视觉资产
└── scripts/          # 可执行脚本
```

所有技能遵守五条核心设计原则：

1. **优先一手来源**：规则基于已发表 Nature 内容、官方期刊指南，而非泛泛审美偏好
2. **显式胜过隐式**：每条规则均附带理由说明
3. **感知上下文**：不同论文部分使用不同逻辑
4. **输出优先**：每个技能直接返回可粘贴文本、`.svg`、`.pptx`、`.docx` 等产物
5. **可扩展**：各技能自包含，新增技能不要求修改既有技能

### 2.2 安装机制

**Claude Code 安装（推荐）：**

```bash
# 稳定路径 clone
mkdir -p ~/ai-skills
git clone https://github.com/Yuan1z0825/nature-skills.git ~/ai-skills/nature-skills

# 创建 subagent wrapper
mkdir -p ~/.claude/agents
cat > ~/.claude/agents/nature-reader.md <<'EOF'
---
name: nature-reader
description: Use for Chinese-English paper reading and source-grounded notes.
---

When invoked, first read `~/ai-skills/nature-skills/skills/nature-reader/SKILL.md` and follow it strictly.
EOF
```

**Codex 安装：**

```bash
git clone https://github.com/Yuan1z0825/nature-skills.git
cd nature-skills
./scripts/update-codex-skills.sh --pull
```

**OpenClaw / OpenCode / Hermes：** 参考 [docs/open-source-agent-frameworks.md](https://github.com/Yuan1z0825/nature-skills/blob/main/docs/open-source-agent-frameworks.md)。

### 2.3 共享依赖机制

`skills/nature-shared/` 是供其他技能读取的共享支持包——安装 `nature-reader`、`nature-polishing` 等需要共享参考资料的技能时，需一并安装：

```bash
npx skills add Yuan1z0825/nature-skills --global --agent codex \
  --skill nature-reader --skill nature-shared --yes --copy
```

## 三、安装与快速开始

### 3.1 环境要求

- **Node.js 18+**（`npx skills` 安装方式）
- **Python 3**（部分技能脚本依赖，如 `nature-paper-to-patent`、`nature-academic-search`）
- 对应 Agent 运行时（Claude Code / Codex / OpenClaw）

### 3.2 一键全量安装

```bash
# 查看可安装技能列表
npx skills add Yuan1z0825/nature-skills --list

# 全量安装到 Codex
npx skills add Yuan1z0825/nature-skills --global --agent codex --skill '*' --yes --copy

# 验证安装结果
npx skills list --global --agent codex --json
```

### 3.3 最简使用示例

技能安装后，直接用自然语言描述任务：

| 需求 | 提示词 |
|------|--------|
| 读论文 / 中英文对照 | `把这篇 PDF 做成图文对应的中英文对照 Markdown reader。` |
| 生成文献汇报 PPT | `把这篇论文做成中文组会汇报 PPT，保留关键图件和来源标注。` |
| 润色论文段落 | `把这段中文改写成 Nature 风格英文，保持学术含义不变。` |
| 模拟预投稿评审 | `从 Nature 审稿人视角评估这篇稿件，给出三份 reviewer reports。` |
| 回复审稿意见 | `根据这封返修邮件，帮我写逐点回复、cover letter，并标出修改稿需要标红的位置。` |

## 四、使用方法与实战

### 4.1 nature-ref-verifier：参考文献自动校验

该技能提供多源交叉验证，逐字段对比作者/标题/年份/卷期/页码，自动标记：

- 卷年冲突（卷号与年份不匹配）
- 作者编造（虚构作者姓名）
- 页码偏差（非连续页码）
- DOI 格式错误

触发示例：

```text
verify refs — 用 nature-ref-verifier 校验这个文件夹里的所有参考文献。
```

### 4.2 nature-academic-search：多源文献检索

支持 PubMed、Scopus、ScienceDirect 等多源检索，可同时完成：

- 引用数与严格他引数统计
- 高影响力引用者画像（院士、Fellow、领域大牛识别）
- DOI 交叉核验
- 参考文献管理（ENW、RIS、Zotero RDF 导出）

需配置 `PUBMED_EMAIL` 环境变量；Scopus / ScienceDirect 等可选 provider 使用本机凭据，不要写入仓库文件。

### 4.3 nature-paper-to-patent：论文转专利

这是功能最为复杂的技能之一，支持：

1. **专利点挖掘**：从论文技术路线中自动提取可专利点
2. **中国发明专利草稿生成**：基于技术交底书
3. **查新检索**：国知局公布公告检索（需安装 Playwright Chromium）
4. **技术交底书迭代**：支持多轮优化

## 五、常见问题与解决方案

**Q1：npx skills 命令报错"command not found"？**

确保已安装 Node.js 18+，然后使用 `npx skills add` 而不是全局安装 CLI。

**Q2：部分技能提示缺少依赖？**

以下技能需要额外安装 Python 依赖：

```bash
# nature-paper-to-patent
python -m pip install -r skills/nature-paper-to-patent/requirements.txt
python -m pip install -r skills/nature-paper-to-patent/scripts/disclosure/requirements-cnipa.txt

# nature-academic-search
python -m pip install -r skills/nature-academic-search/mcp-server/requirements.txt

# 专利查新
python -m playwright install chromium
```

**Q3：Claude Code 中技能未生效？**

检查 wrapper 文件路径是否指向正确的 clone 目录；每次更新仓库后需重新开启会话使新技能生效。

**Q4：如何更新已有技能？**

```bash
# 只更新一个技能
npx skills update nature-reader --global --yes

# 更新当前项目中的所有技能
npx skills update --project --yes
```

## 六、总结

Nature Skills 最大的创新意义不在于单个工具的精妙，而在于它率先验证了一条路径：**把科研工作流封装为可复用的 Agent Skill，使 AI 能够像人类一样理解并执行完整的科研任务**。从论文阅读到专利撰写，从参考文献校验到审稿意见回复，这套体系覆盖了科研人日常最耗时的重复性工作。更值得关注的是，它已被 Google DeepMind 这样的顶级机构所借鉴，说明在 Agent 技能设计这个赛道上，中国开发者已经走在前面。

如果你正在使用 Claude Code、Codex 或 OpenClaw 做科研，不妨 clone 这个仓库试试——尤其是 `nature-reader`、`nature-polishing` 和 `nature-paper2ppt` 这几个 Stable 状态的技能，安装简单、开箱即用。
