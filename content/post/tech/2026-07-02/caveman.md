---
title: "Caveman：让 AI 编程助手减少 75% 输出 Token 的 Claude Code 技能"
date: 2026-07-02
description: "Caveman 是一个 Claude Code 技能/插件，支持 30+ AI 编程助手，通过精简输出语言减少约 75% 的输出 Token，同时保持完整的技术准确性。本文深度解析其工作原理、安装方式、实际收益和技术实现。"
author: "Cheman"
slug: caveman
draft: false
categories: [AI工具, 开源项目]
tags: [Claude Code, AI编程, Token优化, 开源, GitHubTrending]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Caveman**，一个让 AI 编程助手像穴居人一样说话的技能——用最少的词表达最多的意思，实测减少约 75% 的输出 Token，同时保持完整的技术准确性。

## 一、项目概述

Caveman 是一个针对 Claude Code（也支持 Codex、Gemini、Cursor、Windsurf、Cline、Copilot 等 30+ AI 编程助手）的技能/插件。其核心理念是：**为什么用很多 Token 当很少就能搞定**（why use many token when few do trick）。

项目数据：
- **GitHub**: JuliusBrussee/caveman
- **Star 数**: 持续增长中
- **License**: MIT
- **支持代理**: 30+ AI 编程助手

### 核心特性

1. **输出压缩**：平均减少 65% 输出 Token（实测范围 22%-87%）
2. **技术准确性不变**：压缩的是表达方式，不是技术内容
3. **多语言支持**：保持用户语言，压缩的是风格而非语言本身
4. **多级别可选**：lite（去填充词）、full（默认穴居人风格）、ultra（电报风格）、wenyan（文言文，更短）
5. **生态完整**：包含 caveman-code（完整终端编程代理）、cavemem（跨代理记忆）、cavekit（规范驱动构建循环）等工具

## 二、技术原理

### 2.1 工作机制

Caveman 的核心是通过技能文件（SKILL.md）告诉 AI 代理：
1. 删除填充词（well、let me、I'd be happy to 等）
2. 保留实质内容
3. 使用片段式表达
4. 代码、命令、错误字符串保持原样

```bash
# 安装后，技能文件会被放入代理的技能目录
# Claude Code 示例
~/.claude/skills/caveman/SKILL.md

# 每次会话自动激活（Claude Code、Codex、Gemini 内置）
# 其他代理需要每次会话输入 /caveman 触发
```

### 2.2 Hook 架构

对于 Claude Code，Caveman 还会：
1. 写入一个微小的标志文件（flag file）
2. 代理每次会话读取标志文件
3. 从第一条消息开始就使用穴居人风格
4. 无需每次手动输入 `/caveman`

```javascript
// package.json 中的 bin 配置
{
  "bin": {
    "caveman": "./bin/install.js"
  }
}
```

### 2.3 输出对比

| 场景 | 正常 Claude | Caveman | 节省 |
|------|-----------|---------|------|
| 解释 React 重渲染 Bug | 1180 tokens | 159 tokens | 87% |
| 修复认证中间件 Token 过期 | 704 tokens | 121 tokens | 83% |
| 设置 PostgreSQL 连接池 | 2347 tokens | 380 tokens | 84% |
| 实现 React Error Boundary | 3454 tokens | 456 tokens | 87% |

**平均**: 1214 tokens → 294 tokens，**节省 65%**

### 2.4 caveman-compress 子技能

除了压缩输出，Caveman 还能压缩记忆文件（CLAUDE.md、项目笔记等）：

```bash
# 压缩记忆文件，每个会话都节省输入 Token
/caveman-compress CLAUDE.md
```

实测平均节省 46% 的输入 Token：

| 文件 | 原始 | 压缩后 | 节省 |
|------|------|--------|------|
| claude-md-preferences.md | 706 | 285 | 59.6% |
| project-notes.md | 1145 | 535 | 53.3% |
| claude-md-project.md | 1122 | 636 | 43.3% |

## 三、安装与快速开始

### 3.1 一键安装（推荐）

```bash
# macOS / Linux / WSL / Git Bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash

# Windows (PowerShell 5.1+)
irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
```

安装过程：
1. 检测所有已安装的 AI 编程助手
2. 为每个助手安装 Caveman 技能
3. 约 30 秒完成
4. 需要 Node.js ≥18

### 3.2 手动安装（特定助手）

```bash
# 仅安装到 Claude Code
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash -s -- --only claude

# 仅安装到 OpenClaw
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash -s -- --only openclaw
```

### 3.3 触发方式

- **自动激活**（Claude Code、Codex、Gemini）：安装后每次会话自动生效
- **命令触发**（其他代理）：输入 `/caveman` 或说 "talk like caveman"
- **停止**：说 "normal mode"

### 3.4 OpenClaw 特殊说明

对于 OpenClaw，安装会做两件事：

```bash
~/.openclaw/workspace/
├── skills/caveman/SKILL.md   ← 完整规则集，按需加载
└── SOUL.md                    ← <!-- caveman-begin --> ... <!-- caveman-end -->
                                  ↑ 自动注入每个回合
```

1. 技能文件放到 `~/.openclaw/workspace/skills/caveman/SKILL.md`
2. 在 `SOUL.md` 中追加标记块，OpenClaw 会将 SOUL.md 注入每个回合

## 四、使用方法与实战

### 4.1 基础命令

```bash
# 压缩输出（默认 full 级别）
/caveman

# 指定级别
/caveman lite    # 去填充词，保持相对完整
/caveman full    # 默认穴居人风格
/caveman ultra   # 电报风格，极简
/caveman wenyan  # 文言文，更短

# 生成 Conventional Commit 消息
/caveman-commit

# 一行 PR 评论
/caveman-review

# 查看 Token 使用统计
/caveman-stats

# 压缩记忆文件
/caveman-compress <file>
```

### 4.2 实际示例

**场景 1：解释 React 重渲染问题**

正常 Claude（69 tokens）：
> "The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle. When you pass an inline object as a prop, React's shallow comparison sees it as a different object every time, which triggers a re-render. I'd recommend using useMemo to memoize the object."

Caveman Claude（19 tokens）：
> "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."

**场景 2：修复认证中间件**

正常 Claude：
> "Sure! I'd be happy to help you with that. The issue you're experiencing is most likely caused by your authentication middleware not properly validating the token expiry. Let me take a look and suggest a fix."

Caveman Claude：
> "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"

### 4.3 多语言支持

Caveman 保持用户的语言，压缩的是风格而非语言：

```bash
# 葡萄牙语示例
"Novo ref de objeto cada render. Prop inline = novo ref = re-render. Envolva com `useMemo`."

# 代码、命令、错误字符串保持原样
# 仅压缩自然语言部分
```

### 4.4 MCP 中间件

Caveman 还提供 MCP 中间件 `caveman-shrink`，可以压缩任何 MCP 服务器的工具描述：

```bash
npm install -g caveman-shrink
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：安装脚本报错 "Node not found"

**解决方案**：
1. 确认 Node.js ≥18 已安装：`node --version`
2. 未安装则先安装 Node.js：https://nodejs.org/
3. Windows 用户需使用 PowerShell 5.1+

### 5.2 代理未生效

**问题**：安装后输入 `/caveman` 无反应

**解决方案**：
1. 打开代理，输入："Read CLAUDE.md and INSTALL.md, install caveman for me."
2. 代理会自行修复大脑（自动安装）
3. 或参考 INSTALL.md 手动安装

### 5.3 Token 节省不如预期

**问题**：实测 Token 节省低于 65%

**解决方案**：
1. 尝试更高级别：`/caveman ultra` 或 `/caveman wenyan`
2. 使用 `caveman-compress` 压缩记忆文件
3. 注意：Caveman 仅压缩输出 Token，思考/推理 Token 不受影响

### 5.4 技术准确性下降

**问题**：压缩后回答不准确

**解决方案**：
1. Caveman 设计原则是保持技术准确性
2. 如果出现准确性下降，可能是级别过高导致
3. 降级使用：`/caveman lite` 或 `/caveman full`
4. 参考论文："Brevity Constraints Reverse Performance Hierarchies in Language Models"（2026 年 3 月），适度简洁反而提高准确性 26 点

### 5.5 OpenClaw 安装后未自动生效

**问题**：OpenClaw 中仍需手动输入 `/caveman`

**解决方案**：
1. 确认 `SOUL.md` 中包含 `<!-- caveman-begin -->` 标记块
2. 如果没有，重新运行安装命令并指定 `--only openclaw`
3. 查看 `~/.openclaw/workspace/skills/caveman/SKILL.md` 是否存在

## 六、总结

Caveman 是一个巧妙的工具，它通过一个简单的理念——**让 AI 少说废话，多讲重点**——实现了显著的 Token 节省（平均 65%，最高 87%）。

**核心优势**：
1. **成本低**：一键安装，30 秒搞定
2. **收益大**：每次会话都节省 Token，累积效果明显
3. **准确性不变**：压缩的是表达方式，不是技术内容
4. **生态完整**：从输出压缩到记忆压缩，从单一技能到完整代理

**适用场景**：
- 频繁使用 AI 编程助手的开发者
- 对 Token 消耗敏感的用户（API 调用、订阅额度）
- 希望提高 AI 对话效率的团队

**项目生态**：
- caveman（本项目）：输出压缩
- caveman-code：完整终端编程代理，比 Codex 节省约 2× Token
- cavemem：跨代理记忆
- cavekit：规范驱动构建循环
- cavegemma：基于 Caveman 配对数据微调的 Gemma 4 31B 模型

一句话总结：**Caveman 让 AI 编程助手的大脑保持强大，但让它的嘴巴变小**。如果你每天都在和 AI 助手对话，这个工具能为你节省大量 Token 和时间。

---

**参考链接**：
- GitHub: https://github.com/JuliusBrussee/caveman
- 安装文档: INSTALL.md
- 贡献指南: CONTRIBUTING.md
- 维护者指南: CLAUDE.md
- 基准测试数据: benchmarks/
- 评估工具: evals/
