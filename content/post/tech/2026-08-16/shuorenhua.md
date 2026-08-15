---
title: "说人话：一个专治中文 AI 腔的开源 skill"
date: 2026-08-16
description: "说人话（shuorenhua）是一款中文 AI 味清理工具，专治过度承接、工程师腔、翻译腔和无源权威铺垫，基于 103 条评测用例双模型盲测验证，零硬约束失败即可发布。"
author: "Cheman"
slug: shuorenhua
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI 写作", "自然语言处理"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**说人话（shuorenhua）**，一句话介绍：一个专门清理中文 AI 腔的开源 skill，改完你敢直接发。

## 一、项目概述

### 它是什么

`说人话` 专治那种"每个字都对，但一看就不是你写的"中文。它清理以下几类问题：

- **过度承接**：开头发奖状、结尾追着卖（"你说的很对""要不要我顺手把文档也整理了"）
- **工程师姿态腔**：`收口`、`兜住`、`落盘`、`稳稳兜住`
- **翻译腔与句式过满**：`基于……通过……来……`
- **无源权威铺垫**：`研究表明`、`业内人士认为`、`核心逻辑是先把流程跑通`
- **小红书/营销腔**：价值拔高、系统性升级、共同见证

与此同时，它锁住版本、命令、数字、责任归属和引用原文——改完事实不变，**不替你编新东西**。

### 核心数据

| 指标 | 数值 |
|------|------|
| 评测用例总数 | 103 条 |
| 中文短语规则 | 210+ |
| 英文短语规则 | 96 条 |
| 结构反模式 | 25 类 |
| 评测方法 | 双模型盲改写 + 交叉判分 |
| 当前版本 | v2.3.0 |
| 许可证 | MIT |

### 支持平台

| 平台 | 安装方式 |
|------|----------|
| Claude Code | `/plugin marketplace add MrGeDiao/shuorenhua` |
| Codex | `codex exec -C . "读取 ./SKILL.md，按规则改写……"` |
| Cursor / Windsurf | 见 `install/cursor.md` |
| ChatGPT / Custom GPT | [说人话 GPT](https://chatgpt.com/g/g-6a5829b1163481919e1e45851f6bc709-shuo-ren-hua)（Plus/Pro 直接用） |
| 其他 agent CLI | `npx skills add MrGeDiao/shuorenhua` |

## 二、技术原理

### 核心设计原则：先保信息，再谈风格

项目文档中明确了一条核心原则：

> 先保信息，再谈风格。

这是 `说人话` 区别于大多数"去 AI 味"工具的关键——它不是见词就替换，而是先划保护片段，再按模式改写。

### 六步改写流程

项目源码中定义了一套固定的六步流程：

```
1. 判场景：chat / status / docs / public-writing
2. 划保护片段：数字、版本、命令、路径、报错先锁住，记事实关系账本
3. 判命中强度（Tier 1/2/3）+ 定力度（minimal/standard/aggressive）+ scope（structural/bounded/in-place）
4. 先按模式改，词表只兜底
5. 保真回读：事实、术语、语域、保护片段逐项过
6. Residual Audit：仍有残味才做第二遍，只允许轻量修正
```

### 保护片段机制

以下内容在改写前被锁定，不得改变：

- **数字 + 修饰对象**：`p95 从 480ms 降到 160ms` 不能概括成"明显降低"
- **关系不许改写**：`展示了云原生架构的潜力` 不能改成 `采用了云原生架构`
- **时间跨度**：`未来十年` 不能缩成"未来几年"
- **缺信息不编**：原文没给数据，输出可以更短，但不补数字或来源

源码中每个保护规则都有对应的评测用例编号（SF-07、SF-08、SF-46 等），保证改写行为可验证。

### 场景与力度矩阵

项目将文本分为四个场景，每个场景有独立的默认力度和改写策略：

```python
# 场景配置示意（来自项目文档）
scenarios = {
    "chat":       {"强度": "轻", "目标": "只砍明显套话，不把聊天改成公文"},
    "status":     {"强度": "中", "目标": "保留动作、状态、阻塞点和下一步"},
    "docs":       {"强度": "中", "目标": "技术表达优先，二次回读更保守"},
    "public-writing": {"强度": "重", "目标": "全规则扫描，触发 Scene Packs"},
}
```

长文另外引入了 `scope` 概念，控制"删不删整句"：

| scope | 行为 | 适用场景 |
|-------|------|----------|
| `structural` | 自由删并重排 | 短文、明确要重写 |
| `bounded`（长文默认） | 整句空话列"建议删除清单"，删多少你拍板 | public-writing 长文 |
| `in-place` | 一句都不删，只句内降调 | 明确要求完全原样 |

## 三、安装与快速开始

### Claude Code（一句话装完）

在 Claude Code 对话里运行：

```
/plugin marketplace add MrGeDiao/shuorenhua
/plugin install shuorenhua@shuorenhua
```

装好后，直接说"把这段去 AI 味"，自动触发。

### ChatGPT（零安装先试）

直接访问 [说人话 GPT](https://chatgpt.com/g/g-6a5829b1163481919e1e45851f6bc709-shuo-ren-hua)，贴文本就能改，什么都不用装。

### OpenClaw / Cursor / Windsurf

详见项目 `install/` 目录下的对应文档：

```bash
# OpenClaw 安装示例
npx skills add MrGeDiao/shuorenhua
```

### 只想标注，不想改写

指令里加一句：`按 annotation mode 只标注不改写`。它会逐条标问题族，文本本身没什么可写的会标成`材料不足`，直说删完还剩什么——不拿换说法把篇幅填回去。

## 四、使用方法与实战

### 场景一：聊天答疑改写

**改写前（AI 腔满满）：**

> 你说的很对，这个问题一针见血。一句话总结：核心逻辑是先把流程跑通，再谈优化。我可以直接给你一版绝对没问题的最终方案，已经测试通过了，稳得很。要不要我顺手把文档也整理了？你一句话的事。

**改写后（干净利落）：**

> 对，问题就在这：先把流程跑通，再谈优化。方案我发你。文档要不要一起弄？

### 场景二：Release Note 改写

**改写前（发布会宣言）：**

> ## v1.8.0 Release Highlights
> 本次版本是一次面向真实场景的系统性升级。我们不仅全面优化了改写体验，更通过全新的能力矩阵稳稳兜住了用户在 README、release note、论坛长帖和 issue 回复里的核心表达诉求。

**改写后（变更清单式）：**

> ## v1.8.0
> - 新增 `references/scene-packs.md`，覆盖 README、release note、forum post 和 issue reply
> - `evals/benchmark.md` 增加 8 条 scene pack 回归用例
> - `evals/real-samples.md` 增加 4 条整段样本
>
> 这版不做 Voice Calibration；相关方向推迟到 v1.9 评估。

### 场景三：数字保真（反面教材 vs 正确示范）

**改写前：**

> 本次优化在性能方面取得了显著成效，有效改善了接口响应问题，p95 延迟从 480ms 降到 160ms，充分体现了团队持续优化的能力。

**改坏示范（数字没了）：**

> 这次优化明显降低了接口延迟。

**正确改法（数字保留）：**

> 这次优化把接口 p95 延迟从 480ms 降到 160ms。

## 五、常见问题与解决方案

### Q: 这是不是用来骗 AI 检测器的？

不是。目标是减少模板感、表演感和语域漂移，让文本更自然、更可发布，不是绕过检测。检测器靠的是统计特征，风格改写靠的是语感——两者不是同一个问题。

### Q: 英文能不能用？

可以，但这是中文优先项目。英文支持主要用于清理常见英文套话和中英混写里的模板感。

### Q: 会不会把技术文档改坏？

正常不会按聊天口吻去改技术文档。`docs`、`status` 场景有更保守的保护策略，命令、路径、版本、报错和指标优先保真。

### Q: 改完还有 AI 味怎么办？

"去掉明显套路"不等于"拥有具体作者的个人表达"。当前版本擅长清理模板感和表演感，还不负责拟合某个具体人的长期写作习惯——这是下一代的方向。

### Q: 如何贡献新的评测用例？

用 [bad case 模板](https://github.com/MrGeDiao/shuorenhua/blob/master/.github/ISSUE_TEMPLATE/bad-case.md) 提交。请先脱敏，不要贴未授权私聊全文、密钥、内部链接或真实个人身份信息。

## 六、总结

`说人话` 是一款目标非常清晰的中文 AI 味清理工具：它不负责让你写得更有文采，只负责把明显是"AI 写的"那层皮剥掉，同时保证事实、数字、责任归属一个都不动。

核心优势在于：

1. **有评测集保障**：103 条用例覆盖 210+ 中文短语，双模型盲测，硬约束失败 0 才发布
2. **保护合同明确**：哪些能改、哪些不能改，有据可查，评测可验证
3. **场景细分做得到位**：聊天、技术状态同步、文档、公开长文各有不同策略
4. **长文不缩水**：通过 scope 机制控制删改力度，长文不会越改越短

如果你经常用 AI 写中文，又不想发出去被说"一眼 AI"，这个 skill 值得一试。

**GitHub 仓库**：https://github.com/MrGeDiao/shuorenhua
