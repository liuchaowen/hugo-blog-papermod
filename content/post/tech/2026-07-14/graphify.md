---
title: "Graphify：将代码库转化为可查询的知识图谱"
date: 2026-07-14
description: "Graphify 是一款 AI 编程助手技能，可将整个项目（代码、文档、PDF、图片、视频）映射为知识图谱。通过 tree-sitter AST 解析代码实现完全本地化处理，无需 LLM 即可构建代码关系图，支持 40+ 种编程语言。提供交互式 graph.html 可视化、graph.json 查询接口以及 explain、path、query 三种核心查询命令。"
author: "Cheman"
slug: graphify
draft: false
categories: ["开源工具", "知识图谱", "开发者工具"]
tags: ["GitHub", "知识图谱", "Tree-sitter", "AI编程助手", "代码分析"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Graphify**，一个将整个项目转化为可查询知识图谱的 AI 编程助手技能，让你可以像查数据库一样查询代码关系，而不是在文件海洋里 grep。

## 一、项目概述

Graphify 的核心价值是**将代码、文档、PDF、图片、视频等多模态内容映射为统一的知识图谱**，让你可以：

- **查询而非搜索**：不再需要在文件间跳转，直接对图谱提问
- **追踪关系路径**：找到两个概念之间的最短路径，理解依赖链条
- **可视化探索**：生成交互式 HTML 页面，点击节点、过滤、搜索

### 核心特性

| 特性 | 说明 |
|------|------|
| **本地优先** | 代码通过 tree-sitter AST 解析，无需 LLM，完全本地处理 |
| **40+ 语言支持** | Python、JavaScript、TypeScript、Go、Rust、Java、C/C++、Ruby、Kotlin 等 |
| **边可信度标签** | 每条关系标注 `EXTRACTED`（源码显式）或 `INFERRED`（推断） |
| **社区检测** | 使用 Leiden 算法自动识别子系统，无需 LLM 即可生成标签 |
| **God Nodes** | 自动识别高度连接的核心概念，揭示架构枢纽 |
| **多模态映射** | 文档、PDF、图片、视频也可映射到同一图谱（需配置 API） |

## 二、技术原理

### 2.1 架构设计

Graphify 的架构分为三层：

```
输入层（代码/文档/媒体）
       ↓
解析层（tree-sitter AST / LLM 语义解析）
       ↓
图谱层（NetworkX + 社区检测）
       ↓
输出层（graph.json / graph.html / GRAPH_REPORT.md）
```

**核心设计理念**：
- **代码确定性解析**：使用 tree-sitter 进行 AST 解析，零 LLM 消耗，结果可复现
- **语义增强**：仅对文档/媒体调用 LLM 做语义理解，代码部分完全本地化

### 2.2 核心技术栈

```toml
# pyproject.toml 核心依赖
dependencies = [
    "networkx>=3.4",        # 图数据结构与算法
    "numpy>=1.21",          # 数值计算（社区检测等）
    "rapidfuzz>=3.0",       # 模糊匹配（节点名称解析）
    "tree-sitter>=0.23",    # AST 解析框架
    "tree-sitter-python",   # 语言特定解析器
    "tree-sitter-javascript",
    "tree-sitter-typescript",
    "tree-sitter-go",
    "tree-sitter-rust",
    # ... 40+ 语言支持
]
```

### 2.3 关系类型与置信度

Graphify 从源码中提取的关系类型：

| 关系类型 | 说明 | 示例 |
|---------|------|------|
| `calls` | 函数调用 | `foo() --calls--> bar()` |
| `imports` | 模块导入 | `main.py --imports--> utils` |
| `inherits` | 类继承 | `Child --inherits--> Parent` |
| `mixes_in` | Mixin 组合 | `MyClass --mixes_in--> Logger` |
| `references` | 变量引用 | `func() --references--> ModelField` |

**置信度标签**：
- `EXTRACTED`：直接从源码解析（如 `import` 语句、函数调用）
- `INFERRED`：通过解析推断（如跨文件引用解析）

### 2.4 查询引擎

三种核心查询模式：

```bash
# 1. 解释单个概念
graphify explain "APIRouter"
# 输出：节点的源码位置、所属社区、连接列表

# 2. 路径查询
graphify path "FastAPI" "ModelField"
# 输出：最短路径的跳数和每跳的关系类型

# 3. 自然语言查询
graphify query "如何处理请求验证？"
# 输出：相关子图，用于进一步分析
```

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.10+
- 支持的 AI 编程助手：Claude Code、Cursor、Codex、Gemini CLI、GitHub Copilot 等 15+ 平台

### 3.2 安装步骤

```bash
# 方式一：使用 uv（推荐）
uv tool install graphifyy

# 方式二：使用 pipx
pipx install graphifyy

# 注册到 AI 助手
graphify install
```

### 3.3 最简运行示例

在 AI 助手中执行：

```
/graphify .
```

30 秒后生成三个文件：

```
graphify-out/
├── graph.html       # 浏览器打开，交互式图谱可视化
├── GRAPH_REPORT.md  # 关键概念、意外连接、建议问题
└── graph.json       # 完整图谱数据，可编程查询
```

## 四、使用方法与实战

### 4.1 基础用法：生成图谱

```bash
# 分析当前目录
graphify .

# 分析指定目录
graphify /path/to/project

# 输出到自定义位置
graphify . --output ./my-graph
```

### 4.2 进阶用法：查询图谱

**场景一：理解核心概念**

```bash
graphify explain "APIRouter"
```

输出示例：
```
Node: APIRouter
  Source:    routing.py L2210
  Community: 2
  Degree:    47

Connections (47):
  --> RequestValidationError [uses] [INFERRED]
  --> Dependant [uses] [INFERRED]
  --> .get() [method] [EXTRACTED]
  <-- __init__.py [imports] [EXTRACTED]
```

**场景二：追踪依赖链**

```bash
graphify path "FastAPI" "ModelField"
```

输出示例：
```
Shortest path (3 hops):
  FastAPI --uses--> DefaultPlaceholder <--references-- get_request_handler() --references--> ModelField
```

### 4.3 实际项目示例

以 FastAPI 代码库为例：

```bash
# 克隆 FastAPI
git clone https://github.com/tiangolo/fastapi
cd fastapi

# 生成图谱
graphify .

# 查询核心概念
graphify explain "FastAPI"
graphify path "FastAPI" "Request"
graphify query "路由如何注册？"
```

## 五、常见问题与解决方案

### Q1：安装失败，tree-sitter 编译错误

**原因**：tree-sitter 需要编译原生扩展，缺少编译工具链。

**解决方案**：
```bash
# macOS
xcode-select --install

# Linux
sudo apt-get install build-essential

# 重新安装
uv tool install graphifyy --force
```

### Q2：图谱生成后查询无结果

**原因**：节点名称未正确解析，或图谱为空。

**解决方案**：
1. 检查 `graph.json` 是否有内容
2. 使用 `graphify explain "exact_function_name"` 确认节点名称
3. 使用模糊匹配：`graphify explain "router"` 会列出相关节点

### Q3：图谱包含太多节点，难以理解

**原因**：大型项目生成的图谱节点过多。

**解决方案**：
1. 查看 `GRAPH_REPORT.md` 中的 "God Nodes" —— 高度连接的核心概念
2. 使用社区过滤：在 `graph.html` 中点击社区标签
3. 按目录分析：`graphify ./src/auth` 而非整个项目

### Q4：如何处理大型代码库？

**方案**：
```bash
# 限制文件数量
graphify . --max-files 100

# 只分析特定扩展名
graphify . --extensions .py,.ts
```

### Q5：图谱会发送代码到云端吗？

**答案**：**不会**。代码解析完全本地化，使用 tree-sitter AST。仅当处理文档、PDF、图片、视频时，才可能调用 LLM API（需要你配置密钥）。

## 六、性能基准

Graphify 在 LOCOMO 和 LongMemEval 基准测试中表现优异：

| 基准测试 | 指标 | Graphify | 对比系统 |
|---------|------|----------|---------|
| LOCOMO (n=300) | recall@10 | **0.497** | mem0: 0.048, supermemory: 0.149 |
| LongMemEval-S (n=50) | QA accuracy | **76%** | 与 dense RAG 持平 |
| 图谱构建 | LLM 消耗 | **0** | 大多数系统按 token 计费 |

**关键优势**：代码图谱构建零 LLM 消耗，大幅降低成本。

## 七、总结

Graphify 是一款**将代码转化为可查询知识图谱**的创新工具，核心价值在于：

1. **本地确定性**：代码通过 tree-sitter AST 解析，零 LLM 消耗，完全本地化
2. **关系透明**：每条边都有置信度标签，区分显式提取与推断
3. **查询驱动**：不再是 grep 搜索，而是图谱查询 —— `explain`、`path`、`query` 三种模式
4. **多模态统一**：代码、文档、PDF、图片、视频映射到同一图谱

如果你厌倦了在几十个文件中 `grep -r "function"`，试试 Graphify，用图谱的方式理解代码。一行命令 `/graphify .`，30 秒后你就能在浏览器里点击探索整个项目的知识图谱。
