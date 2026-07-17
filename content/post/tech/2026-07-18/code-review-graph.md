---
title: "code-review-graph：让 AI 代码审查节省 82 倍 Token 的知识图谱工具"
date: 2026-07-18
description: "一款基于 Tree-sitter 和 MCP 的本地知识图谱工具，通过结构化代码分析和增量更新，让 AI 代码审查的 Token 消耗降低 38-528 倍，支持 30+ 编程语言和 GitHub Action 集成。"
author: "Cheman"
slug: code-review-graph
draft: false
categories: ["开源工具", "AI开发"]
tags: ["GitHub", "开源", "代码审查", "知识图谱", "MCP", "Tree-sitter"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**code-review-graph**，它通过构建代码知识图谱，让 AI 代码审查的 Token 消耗降低 38-528 倍，彻底解决 AI 编码工具"盲目扫描整个代码库"的痛点。

## 一、项目概述

code-review-graph 是一个本地优先的知识图谱工具，专门为 AI 代码审查场景优化。它使用 Tree-sitter 解析代码结构，构建函数、类、导入、调用关系的图谱，并通过 MCP（Model Context Protocol）为 AI 助手提供精确的上下文，实现"只读相关代码"的智能审查。

**核心特性**：

- **Token 效率提升**：基准测试显示，中位数每问题 Token 减少 82 倍（范围 38x-528x）
- **Blast-Radius 分析**：自动追踪变更的影响范围（调用者、依赖者、测试）
- **增量更新**：文件变更时仅需 <2 秒重新索引
- **30+ 语言支持**：Python、JavaScript/TypeScript、Go、Rust、Java、C/C++、Ruby、PHP、Swift 等
- **MCP 集成**：提供 30 个工具和 5 个工作流模板，与 Claude Code、Cursor、Copilot 等无缝集成
- **GitHub Action**：CI/CD 中自动生成风险评分的 PR 审查评论

## 二、技术原理

### 架构设计

```
Repository → Tree-sitter Parser → SQLite Graph → Blast Radius → Minimal Review Set
```

项目采用三层架构：

1. **解析层**：Tree-sitter 解析源码为 AST，提取函数、类、导入、调用节点
2. **存储层**：SQLite 存储图谱（节点 + 边），支持关系查询和遍历
3. **查询层**：MCP 工具提供语义搜索、影响分析、社区检测等能力

### 核心技术栈

```toml
[project.dependencies]
mcp = ">=1.0.0,<2"                    # Model Context Protocol
fastmcp = ">=3.2.4,<4"                # MCP 服务器框架
tree-sitter = ">=0.23.0,<1"           # 语法解析
tree-sitter-language-pack = ">=0.3.0" # 多语言支持
networkx = ">=3.2,<4"                 # 图算法
watchdog = ">=4.0.0,<7"               # 文件监控
```

**关键设计决策**：

- **SQLite 本地存储**：零外部依赖，图谱数据完全本地化
- **SHA-256 增量检测**：通过文件哈希快速识别变更
- **Leiden 社区检测**：自动聚类相关代码模块

### Blast-Radius 算法

当文件变更时，算法执行三步追踪：

```python
# 伪代码示例
def compute_blast_radius(changed_file):
    # 1. 直接调用者
    callers = graph.find_callers(changed_file.functions)
    
    # 2. 传递依赖（深度可配置，默认 2 层）
    dependents = graph.bfs_traverse(callers, max_depth=2)
    
    # 3. 相关测试
    tests = graph.find_tests(changed_file.functions)
    
    return minimize_token_set(callers + dependents + tests)
```

基准测试显示，在 2900 文件项目中，变更仅触发 5 个文件重新解析，其余 2910 文件被跳过。

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- 推荐：[uv](https://docs.astral.sh/uv/)（MCP 配置自动使用 uvx）

### 安装步骤

```bash
# 方式一：pip 安装
pip install code-review-graph

# 方式二：pipx 安装（推荐，隔离环境）
pipx install code-review-graph

# 自动检测并配置所有支持的 AI 平台
code-review-graph install
```

`install` 命令会：

1. 检测已安装的 AI 编码工具（Claude Code、Cursor、Windsurf 等）
2. 写入正确的 MCP 配置
3. 安装平台原生钩子/技能
4. 注入图感知指令到平台规则

### 最简运行示例

```bash
# 在项目根目录执行
code-review-graph build   # 解析代码库，初始构建约 10 秒（500 文件）

# 然后在 AI 助手中询问
"Build the code review graph for this project"
```

## 四、使用方法与实战

### CLI 命令速查

```bash
# 核心命令
code-review-graph build              # 构建图谱
code-review-graph update             # 增量更新
code-review-graph status             # 图谱统计
code-review-graph watch              # 自动监控文件变更

# 分析命令
code-review-graph detect-changes --brief    # 风险面板 + Token 节省
code-review-graph visualize                 # 生成交互式 HTML 图谱
code-review-graph visualize --format graphml  # 导出 GraphML（Gephi）

# 多仓库管理
code-review-graph register <path>    # 注册仓库
code-review-graph daemon start       # 启动多仓库监控守护进程
```

### Token Savings 面板

```bash
code-review-graph detect-changes --brief
```

输出示例：

```
┌─────────────────────── Token Savings ────────────────────────┐
│ Full context would be:     12,921 tokens                     │
│ Graph context used:           762 tokens                     │
│ Saved:                     12,159 tokens (~94%)              │
│ Breakdown: Functions 244 · Tests 191 · Risk 244 · Other 83   │
└──────────────────────────────────────────────────────────────┘
```

### MCP 工具集成（30 个工具）

AI 助手自动使用的核心工具：

| 工具 | 功能 |
|------|------|
| `build_or_update_graph_tool` | 构建或增量更新图谱 |
| `get_impact_radius_tool` | 变更文件的 Blast Radius |
| `get_review_context_tool` | Token 优化的审查上下文 |
| `detect_changes_tool` | 风险评分的变更分析 |
| `semantic_search_nodes_tool` | 语义搜索代码实体 |
| `get_architecture_overview_tool` | 从社区结构生成架构概览 |

### GitHub Action 集成

```yaml
# .github/workflows/code-review-graph.yml
on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: tirth8205/code-review-graph@v2.3.6
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

每个 PR 自动生成粘性评论，包含风险评分的函数、受影响的执行流和测试缺口。

## 五、常见问题与解决方案

### 安装问题

**Q: pip/pipx 无法下载 hatchling**

可能是终端无法连接 PyPI（常见于 IDE 集成终端，VPN/代理问题）。

解决方案：

```bash
# 方式一：使用系统终端而非 IDE 终端
pipx install code-review-graph

# 方式二：使用 uv（不同的下载机制）
uv tool install code-review-graph
```

### 运行时错误

**Q: Windows 上 MCP 连接关闭错误**

配置文件中不要使用 `cmd /c` 包装，直接执行 `.exe`：

```json
{
  "code-review-graph": {
    "command": "C:\\path\\to\\venv\\Scripts\\code-review-graph.exe",
    "args": ["serve", "--repo", "C:\\path\\to\\project"],
    "env": { "PYTHONUTF8": "1" }
  }
}
```

### 性能问题

**Q: 小的单文件变更，图谱上下文反而更大**

这是正常的权衡：图谱提供的结构元数据（影响半径边 + 源码片段）超过简单 diff，但这是多文件分析的基础。

**Q: 搜索质量 MRR 0.35 是否太低？**

当前关键词搜索在大多数查询的前 4 个结果中找到正确结果，但排序需要改进。框架特定的命名模式（如 Express）可能导致 0 命中。

### 兼容性

**支持的平台**：Codex、Claude Code、CodeBuddy Code、Cursor、Windsurf、Zed、Continue、OpenCode、Antigravity、Gemini CLI、Qwen、Qoder、Kiro、GitHub Copilot、GitHub Copilot CLI

**支持的语言**：Python、JavaScript/TypeScript/TSX、Go、Rust、Java、C/C++、C#、Ruby、Kotlin、Swift、PHP、Scala、Solidity、Dart、R、Perl、Lua/Luau、Objective-C、Shell、Elixir、Zig、PowerShell、Julia、ReScript、GDScript、Nix、Verilog/SystemVerilog、SQL、Vue/Svelte SFC、Jupyter/Databricks notebooks、Perl XS

## 六、总结

code-review-graph 是一款解决 AI 代码审查核心痛点的工具：Token 浪费。通过结构化图谱 + 增量更新 + MCP 集成，它让 AI 助手"只读相关代码"，实现 38-528 倍的 Token 节省。

核心优势：

1. **本地优先**：零外部依赖，SQLite 存储无需云服务
2. **即装即用**：`pip install && code-review-graph install` 自动配置所有平台
3. **多平台支持**：覆盖主流 AI 编码工具和 30+ 编程语言
4. **CI/CD 集成**：GitHub Action 自动生成风险评分的 PR 审查

适合场景：中大型代码库、Monorepo、频繁 PR 审查、AI 辅助开发。不适合：小型项目、单文件简单变更。

官网：[code-review-graph.com](https://code-review-graph.com)
