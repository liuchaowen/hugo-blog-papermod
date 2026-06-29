---
title: "Council of High Intelligence：让 18 位 AI 智者为你的重要决策提供多元视角"
date: 2026-06-30
description: "一个基于多 LLM 提供者的 AI 智囊团工具，通过 18 个不同思维模式的 AI Agent 对你的关键决策进行结构化辩论和综合分析，支持 Claude、OpenAI、Gemini、Ollama 等多平台自动路由。"
author: "Cheman"
slug: council-of-high-intelligence
draft: false
categories: [AI工具, 开源项目]
tags: [AI, GitHub, 决策工具, 多模型, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Council of High Intelligence**，它构建了一个由 18 位不同思维模式的 AI Agent 组成的"智囊团"，能够对你的关键决策进行结构化辩论和深度分析。

## 一、项目概述

Council of High Intelligence 是一个创新的 AI 决策辅助工具，它模拟了"智囊团"的运作模式：当你面临难题时，不是询问单个 LLM，而是让 18 位具有不同思维范式、知识背景和思维风格的 AI Agent 同时进行独立分析、交叉质询，最终综合形成一份结构化的决策建议。

**核心特性：**
- **18 位专业 AI Agent**：涵盖亚里士多德、苏格拉底、孙武、阿达·洛芙莱斯、马库斯·奥勒留、费曼、林纳斯·托瓦兹等历史杰出人物的思维模式
- **多提供者自动路由**：支持 Claude、OpenAI、Gemini、Ollama、NVIDIA NIM、Cursor 等多种 LLM 提供者，自动分配成员到不同模型以避免"同质化思维"
- **三种审议模式**：完整模式（3 轮深度辩论）、快速模式（2 轮快速分析）、双人模式（2 位成员辩证对话）
- **防止群体思维机制**：异议配额、新颖性门控、反事实提示等机制确保真正的观点多样性
- **问题重构门控**：每位成员在分析前必须重新表述问题，尽早发现"错误的问题"

## 二、技术原理

### 2.1 架构设计

项目采用**技能（Skill）插件架构**，可以无缝集成到 Claude Code 和 OpenAI Codex 两大 AI 编程助手平台：

```
council-of-high-intelligence/
├── install.sh              # 一键安装脚本
├── skills/                 # Claude Code 技能定义
│   ├── council.aristotle.md
│   ├── council.socrates.md
│   └── ... (18 个 Agent)
├── codex-skills/          # Codex 技能定义
├── scripts/                # 路由与执行脚本
│   ├── council-simulation-checklist.sh
│   └── provider-routing.js
└── configs/               # 多提供者模型配置模板
```

### 2.2 核心算法与协议

**完整审议协议（7 步）：**
1. **提供者检测与路由**：自动检测可用的 LLM 提供者，将成员分配到不同模型
2. **问题重构门控**：每个成员重新表述问题 + 提供替代框架
3. **第一轮：独立分析（盲审）**：所有成员并行分析（最多 400 字）
4. **第二轮：交叉质询**：成员相互挑战（最多 300 字，必须涉及 2+ 其他成员）
5. **后轮次强制执行**：异议配额、新颖性门控、一致性检查、反递归
6. **第三轮：最终结晶**：100 字立场声明
7. ** verdict 综合**：以"未解决问题"和"建议后续步骤"开头

**防止群体思维的数学保证：**
- **异议配额**：如果 >70% 的成员过早达成一致，强制 2 位成员"钢铁人"对立观点
- **新颖性门控**：每位成员的最终立场必须包含至少 1 个其他成员未提及的新论点
- **反递归机制（"毒芹规则"）**：苏格拉底的质询被限制最多 2 轮，任何配对超过 2 条消息将被切断

### 2.3 多提供者自动路由算法

路由算法遵循以下优先级：
1. **极性对分离**（硬约束）：如苏格拉底（质疑）和费曼（重建）必须分配到不同提供者
2. **均匀分配**：成员均匀分布在所有可用提供者上
3. **提供者亲和性**：成员的 `provider_affinity` 配置作为决胜局
4. **自动回退**：如果任何提供者失败，自动回退到 Claude

**支持的提供者：**
| 提供者 | CLI | 执行方法 |
|----------|-----|-------------|
| Anthropic (Claude) | 原生 | subagent（始终可用） |
| OpenAI | `codex` | `codex exec` |
| Google | `gemini` | `gemini -p` |
| Ollama (本地) | `ollama` | `ollama run` |
| NVIDIA NIM | `NVIDIA_API_KEY` 环境变量 | `openai_compatible_api` |
| Cursor | `cursor-agent` | `cursor-agent -p` |

### 2.4 极性对设计

项目创新性地引入了**极性对（Polarity Pairs）**概念，确保成员之间的观点真正具有对抗性：

- **苏格拉底 vs 费曼**：自上而下摧毁 vs 自下而上重建
- **亚里士多德 vs 老子**：对一切进行分类 vs 结构本身就是问题
- **孙武 vs 奥勒留**：赢得外部游戏 vs 治理内部游戏
- **阿达 vs 马基雅维利**：形式纯粹性 vs 混乱的人性激励
- **托瓦兹 vs 瓦茨**：交付具体解决方案 vs 质疑问题是否存在

## 三、安装与快速开始

### 3.1 环境要求

**必需：**
- [Claude Code](https://claude.ai/claude-code) CLI（Claude 用户）
- [Codex](https://github.com/openai/codex)（Codex 技能用户）
- 客户端支持 Agent/子代理功能（默认启用）

**可选提供者（自动检测）：**
- OpenAI Codex CLI：`npm i -g @openai/codex`
- Google Gemini CLI：参见 [gemini-cli 仓库](https://github.com/google-gemini/gemini-cli)
- Ollama（本地模型）：从 ollama.com 安装
- Cursor CLI（GPT/Claude/Gemini/Grok 聚合器）：`curl https://cursor.com/install -fsS | bash`

### 3.2 安装步骤

**Claude Code 用户：**
```bash
git clone https://github.com/0xNyk/council-of-high-intelligence.git
cd council-of-high-intelligence
./install.sh
```

**Codex 用户：**
```bash
git clone https://github.com/0xNyk/council-of-high-intelligence.git
cd council-of-high-intelligence
./install.sh --codex
```

**仅安装 Codex 技能：**
```bash
./install.sh --codex-only
```

**自定义配置目录：**
```bash
./install.sh --claude-dir /path/to/.claude
./install.sh --codex-dir /path/to/.codex
```

**预览模式（不写入）：**
```bash
./install.sh --dry-run
```

安装完成后重启客户端即可使用。

### 3.3 最简运行示例

**Claude Code 中的基本用法：**
```
/council 我们是否应该开源我们的 Agent 框架？
/council --quick 我们是否应该在这里添加缓存？
/council --duo 我们应该使用微服务还是单体架构？
```

**指定领域三元组：**
```
/council --triad strategy 我们的竞争护城河是什么？
/council --triad shipping 我们今天应该发布吗？
```

## 四、使用方法与实战

### 4.1 三种审议模式

**完整模式（默认）：**
适合复杂、高风险的决策。进行 3 轮结构化审议：独立分析 → 交叉质询 → 最终立场。

```bash
/council 我们是否应该开源我们的 Agent 框架？
```

**快速模式（`--quick`）：**
适合较简单的决策。2 轮快速分析，无交叉质询。

```bash
/council --quick 我们是否应该在这里添加缓存？
/council --quick --triad shipping 我们今天应该发布吗？
```

**双人模式（`--duo`）：**
适合探索张力。2 位成员辩证对话。

```bash
/council --duo 我们应该使用微服务还是单体架构？
/council --duo --members torvalds,ada 这个抽象值得吗？
```

### 4.2 预定义三元组（Triads）

项目内置了 20 个领域特定的 3 成员组合，覆盖常见决策场景：

| 领域 | 三元组 | 理由 |
|--------|-------|-----------|
| `architecture` | Aristotle + Ada + Feynman | 分类 + 形式化 + 简单性测试 |
| `strategy` | Sun Tzu + Machiavelli + Aurelius | 地形 + 激励 + 道德基础 |
| `ethics` | Aurelius + Socrates + Lao Tzu | 责任 + 质疑 + 自然秩序 |
| `debugging` | Feynman + Socrates + Ada | 自下而上 + 假设测试 + 形式验证 |
| `shipping` | Torvalds + Musashi + Feynman | 实用主义 + 时机 + 第一性原理 |
| `ai` | Karpathy + Sutskever + Ada | 经验 ML + 扩展前沿 + 形式限制 |
| `decision` | Kahneman + Munger + Aurelius | 偏见检测 + 逆向 + 道德清晰 |

### 4.3 多提供者路由实战

当你安装了多个 LLM CLI 后，Council 会自动检测并分配成员到不同模型：

```bash
# 安装多个提供者
npm i -g @openai/codex          # OpenAI Codex
# 安装 Gemini CLI
# 安装 Ollama

# Council 自动路由
/council --triad decision 我们是否应该接受这次收购要约？
```

**路由标志：**
- `--no-auto-route`：禁用自动路由，使用纯 Claude 默认
- `--dry-route`：仅打印路由表，不运行智囊团
- `--models [path]`：使用 YAML 配置手动覆盖（参见 `configs/provider-model-slots.example.yaml`）

### 4.4 预建配置文件（Profiles）

项目提供了 3 种预配置的成员面板：

**`classic`（默认）：**
全部 18 位成员，附带上述领域三元组。适合广泛审议。

**`exploration-orthogonal`：**
12 位成员面板，用于发现和减少"未知的未知"：
- Socrates, Feynman, Sun Tzu, Machiavelli, Ada, Lao Tzu, Aurelius, Torvalds, Karpathy, Sutskever, Kahneman, Meadows
- 配置文件三元组：`unknowns`, `market-entry`, `system-design`, `reframing`, `ai-frontier`, `blind-spots`

**`execution-lean`：**
5 位成员面板，用于快速决策到行动：
- Torvalds, Feynman, Sun Tzu, Aurelius, Ada
- 配置文件三元组：`ship-now`, `launch-strategy`, `stability`

## 五、常见问题与解决方案

### 5.1 安装失败

**问题：** `./install.sh` 报错"Claude config directory not found"

**解决方案：**
- 确认 Claude Code 已安装并至少运行一次（会生成配置目录）
- 使用 `--claude-dir` 手动指定配置目录路径
- 检查 `~/.claude/` 或 `~/.config/claude/` 是否存在

### 5.2 技能未出现在 Claude Code 中

**问题：** 安装后 `/council` 命令无法识别

**解决方案：**
- 重启 Claude Code 客户端
- 检查技能文件是否正确安装到 Claude 配置目录的 `skills/` 子目录
- 运行 `./scripts/council-simulation-checklist.sh` 验证安装

### 5.3 多提供者路由不工作

**问题：** 所有成员都使用 Claude，没有路由到其他模型

**解决方案：**
- 确认其他提供者的 CLI 已正确安装（如 `codex`, `gemini`, `ollama`）
- 在终端中测试 CLI 是否可用（如 `codex --version`）
- 使用 `--dry-route` 标志查看路由表，确认提供者检测情况
- 检查环境变量（如 `NVIDIA_API_KEY`、`CURSOR_API_KEY`）是否已设置

### 5.4 NVIDIA NIM 配置

**问题：** 如何使用 NVIDIA NIM 的 130+ 开放权重模型？

**解决方案：**
1. 从 [build.nvidia.com](https://build.nvidia.com) 获取 API Key
2. 设置环境变量：`export NVIDIA_API_KEY=nvapi-...`
3. 无需安装 CLI 二进制文件，Council 会通过 OpenAI 兼容 API 调用
4. 免费层级：1,000 credits，40 RPM
5. 参考 `configs/provider-model-slots.nim.example.yaml` 配置席位分配

### 5.5 Cursor CLI 作为模型聚合器

**问题：** Cursor CLI 是什么？如何配置？

**解决方案：**
- Cursor CLI 是一个模型**聚合器**，通过一个 `cursor-agent` 二进制文件提供 GPT-5.x、Claude、Gemini 和 Grok 系列模型
- 安装：`curl https://cursor.com/install -fsS | bash`
- 认证：设置 `CURSOR_API_KEY` 或运行 `cursor-agent login`
- 调用方式：`cursor-agent -p --mode ask --model <id>`
- **重要**：因为 Cursor 可以提供 `claude-*` 模型，选择 **跨家族** Cursor 模型（如 `gpt-5.4-high`, `gemini-2.5-pro`, `grok-4`）以增加多样性
- 使用 `cursor-agent --list-models` 列出可用模型 ID

## 六、总结

Council of High Intelligence 通过创新性的"AI 智囊团"架构，解决了单一 LLM 回答缺乏多样性和深度的问题。其核心价值在于：

1. **真正的观点多样性**：通过极性对设计和多提供者路由，确保不同成员代表真正不同的思维方式，而非"同一模型换装"
2. **防止群体思维**：通过数学保证的异议配额、新颖性门控等机制，避免过早达成一致
3. **问题重构门控**：强制成员在分析前重新表述问题，尽早发现"错误的问题"
4. **透明的决策过程**：verdict 以"未解决问题"开头，诚实地展示智囊团的认知边界

项目采用 CC0 开源协议，支持 Claude Code 和 Codex 两大平台，安装简单，即装即用。如果你需要在关键决策中获得多维度的深度分析，Council of High Intelligence 绝对值得一试。

**资源链接：**
- GitHub 仓库：[https://github.com/0xNyk/council-of-high-intelligence](https://github.com/0xNyk/council-of-high-intelligence)
- 赞助支持：[Buy Me A Coffee](https://buymeacoffee.com/nyk_builderz)
- Solana 捐赠：`BYLu8XD8hGDUtdRBWpGWu5HKoiPrWqCxYFSh4oxXuvPg`
