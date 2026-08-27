---
title: "Paperthin：让 AI Agent 学会克制的设计模式库"
date: 2026-08-27T20:01:00+08:00
draft: false
tags: ["AI", "Agent", "开源", "设计模式"]
categories: ["技术"]
slug: "paperthin"
description: "一个让 AI Agent 学会克制的设计模式库，通过 18+ 技能教 AI 做减法而非堆砌功能。"
---

> **一句话评价**：一个让 AI Agent 学会"少即是多"的技能库——它不是教 AI 做更多，而是教它不做什么。

<!--more-->

## 📌 项目概览

**Paperthin**（[LilMGenius/paperthin](https://github.com/LilMGenius/paperthin)）是一个面向 AI Coding Agent 的设计模式库，核心哲学只有一条：**大多数 agent 技能都是噪音，真正的智慧在于克制**。

目前已收录 **18+ 个技能**，覆盖四大维度：

| 维度 | 数量 | 关键词 |
|------|------|--------|
| depth/ 单artifact操作 | ~14个 | 重写、审查、验证、压缩 |
| breadth/ 多artifact审计 | 2个 | 单点真实源、升级 |
| coil/ 迭代周期管理 | 5个 | 计划、重启、复盘 |
| mesh/ 跨视角协作 | 1个 | 棱镜分光 |

## 🔑 核心设计原则

### 1. 做减法的工具

与大多数"给 agent 加功能"的思路相反，Paperthin 的每个技能都是**移除型**的：

- `re0`：不要打补丁，直接把 drifted artifact 重写成干净的 v0
- `debloat`：把臃肿内容压缩到"承载密度的极限"，删词不删规则
- `dedash`：去掉那些暴露"这是 AI 写的"连字符痕迹
- `detool`：把文档里的工具名词替换成机制名词，让内容真正跨平台

### 2. 质量门控而非功能叠加

```
模型越强 → 越需要约束
```

Paperthin 认为 agent 的真正瓶颈不是能力不足，而是**没有停下来审视自己**的机制：

- `readchk`：重述用户指令，确保真的读对了再动手
- `modelchk`：在做之前判断"这个任务需要多少算力"，避免杀鸡用牛刀
- `shower`：让 agent 用"陌生人视角"读自己的输出——因为你知道太多，大脑会悄悄填补漏洞
- `factchk`：验证任何"现实锚点"声明，防止"直觉是对的"这种错觉

### 3. 迭代学习的闭环

```
re0-plan → re0-loop → re0-memo → re0-work → catchup → nba
```

每个技能环环相扣，核心是把**经验教训保留下来**，让错误的版本死去、正确的版本复用。

## 🚀 快速上手

```bash
# 一键安装（支持任意 agent：Claude Code、Cursor、Copilot、OpenCode 等）
npx skills@latest add LilMGenius/paperthin --global --agent '*'

# 更新到最新技能目录
/re0-upgrade

# 使用某个技能（以 re0 为例）
/re0
```

## 💡 亮点技能推荐

### `autobahn` — 边界管控

将涉及安全/隐私/合规边界的任务**预先剔除**出主流程，让干净子 agent 全力跑剩余部分，同时保留完整的"剔除日志"。这个思路直接借鉴了 2026 年 Anthropic 暂停 Fable 5/Mythos 5 的教训。

### `prism` — 视角分光

把一个 artifact 同时用多个独立视角审视，返回**它们分歧的地方**，而不是求平均数。分歧才是价值所在。

### `mandela` — 评估审计

检查评测设计是否存在 8 种信息泄露模式——防止评分者、模型和设计者三方共同"记住"一个从未独立发生的结果。

## 🤔 适用人群

- **AI Agent 深度用户**：感觉自己的 agent 总在堆砌代码、越做越臃肿
- **AI 工程师/提示工程师**：想建立一套可复用的 agent 质量保障方法论
- **追求代码整洁的开发者**：`re0` 的 Boy Scout Rule + 主动重写，比传统 lint 更彻底

## 📊 现状

- GitHub：活跃维护中
- 安装量：快速增长中
- 多语言 README：已支持 11 种语言（含中文）

---

> **我的评价**：Paperthin 难得地抓住了 AI 编程的一个真实痛点——不是"能力不够"，而是"缺少刹车"。如果你用 AI 写代码越写越乱、越改越臃肿，试试 `re0`，你会回来感谢它的。

**仓库链接**：[github.com/LilMGenius/paperthin](https://github.com/LilMGenius/paperthin)
