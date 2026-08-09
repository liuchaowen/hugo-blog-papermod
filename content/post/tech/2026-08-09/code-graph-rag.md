---
title: "Code-Graph-RAG：用知识图谱 + RAG 彻底搞懂你的代码库"
date: "2026-08-09"
description: "Code-Graph-RAG 是一款开源的多语言代码库 RAG 工具，基于 Tree-sitter 解析代码 AST，构建到 Memgraph 图数据库中，再用自然语言驱动 AI 查询、编辑和优化代码，支持 12 种编程语言。"
author: "Cheman"
slug: "code-graph-rag"
draft: false
categories: ["技术", "开源", "AI"]
tags: ["RAG", "知识图谱", "Tree-sitter", "Memgraph", "代码分析", "AI编程"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Code-Graph-RAG**，它把 RAG（检索增强生成）的思路用到了代码库理解上——用 Tree-sitter 解析多语言源码，构建知识图谱存入 Memgraph，再用自然语言提问，AI 直接给出基于真实代码结构的答案。

## 一、项目概述

Code-Graph-RAG 的核心思路非常清晰：把代码库变成一张**可查询的图**。它的工作分为两个部分：

1. **多语言解析器**：用 Tree-sitter 扫描源码，提取函数、类、方法、模块及其关系，统一存入 Memgraph 图数据库。
2. **RAG 查询系统**（`codebase_rag/`）：将自然语言转成 Cypher 查询语句，从图中检索匹配代码，再由 AI 生成回答或直接编辑代码。

```python
# 核心架构伪代码
Source Code -> Tree-sitter Parser -> AST Analysis -> Memgraph Knowledge Graph
                                                        |
User Query -> AI Model (Cypher Gen) -> Cypher Query -> Graph Results -> Response
```

项目支持 **Python、TypeScript、TSX、JavaScript、Rust、Go、Java、C、C++、C#、PHP、Lua、Dart** 共 12 种语言，Scala 正在开发中，Ruby 通过 ast-grep 模式文件也获得了一定的结构支持。

## 二、技术原理

### 2.1 统一图谱Schema

Code-Graph-RAG 的关键创新在于**语言无关的统一图谱Schema**——无论源码是 Python 还是 Rust，存入图中的节点类型都是相同的：Module、Function、Class、Method、Import。这使得跨语言查询成为可能。

从源码中可以看到，其图谱Schema定义了以下核心节点关系：

```python
# 节点类型（统一抽象）
CLASS, FUNCTION, METHOD, MODULE, FILE

# 边类型（关系）
DEFINES, IMPORTS, CALLS, INHERITS_FROM, HAS_TYPE, CONTAINS
```

### 2.2 Tree-sitter 多语言解析

每个语言对应一个 Tree-sitter Grammar，项目通过 `load_parsers()` 加载各语言的解析器：

```python
from codebase_rag.parser_loader import load_parsers
from codebase_rag.graph_updater import GraphUpdater

# 解析并入库
updater = GraphUpdater(ingestor, repo_path, parsers, queries)
updater.run()  # 初始全量扫描
```

解析结果直接转成 Cypher 语句写入 Memgraph：

```cypher
// 示例：创建函数节点
CREATE (f:Function {
  name: "process_file",
  file_path: "/src/utils.py",
  start_line: 10,
  end_line: 25,
  language: "Python"
})
```

### 2.3 自然语言 → Cypher 查询

RAG 系统的核心在于将用户问题转为图查询语句。通过 pydantic-ai 驱动 AI 模型，生成对应的 Cypher 查询：

```python
from codebase_rag.services.graph_service import MemgraphIngestor

# 用户问："找出所有没有单元测试的公开函数"
# AI 生成 Cypher：
# MATCH (f:Function) WHERE f.is_public = true
# AND NOT EXISTS((f)-[:TESTED_BY]->())
# RETURN f.name, f.file_path
```

### 2.4 实时文件监控与图谱更新

`realtime_updater.py` 是另一个亮点——用 `watchdog` 监控源码目录变化，混合防抖策略（Debounce + MaxWait）避免频繁触发图更新：

```python
class CodeChangeEventHandler(FileSystemEventHandler):
    def dispatch(self, event: FileSystemEvent) -> None:
        # 防抖策略：等待静默期后处理，或超过最大等待时间立即处理
        # 变化 → 删除旧节点 → 重新解析 → 重新计算CALLS边 → 落库
```

整个更新链路是**事务性**的，通过 `_update_lock` 串行化，防止并发更新导致边丢失。

## 三、安装与快速开始

### 环境要求

- Python 3.12+
- Docker（运行 Memgraph 图数据库）
- `cmake`、`ripgrep`

### 安装步骤

```bash
# 推荐用 uv 安装（包含所有语言解析器和向量搜索依赖）
uv tool install "code-graph-rag[treesitter-full,semantic]"

# 或用 pipx
pipx install "code-graph-rag[treesitter-full,semantic]"

# 启动内置 Memgraph + Qdrant（无需手动写 compose）
cgr daemon up
```

### 最简运行示例

```bash
# 解析代码库，构建知识图谱
cgr start --repo-path /path/to/your/project --update-graph

# 进入交互式查询
cgr start --repo-path /path/to/your/project
# > 列出所有公共函数
# > 找出可能导致内存泄漏的代码
# > 为这个函数添加单元测试
```

## 四、使用方法与实战

### 4.1 MCP Server 模式

Code-Graph-RAG 还能作为 MCP Server 运行，让 Claude Code 等 MCP 客户端直接查询和编辑本地代码库：

```bash
# 以 MCP Server 模式启动
code-graph-rag mcp-server

# 配置 Claude Desktop 的 mcp.json:
# {
#   "mcpServers": {
#     "code-graph-rag": {
#       "command": "code-graph-rag",
#       "args": ["mcp-server"]
#     }
#   }
# }
```

### 4.2 AST 结构化搜索与替换

通过 ast-grep，项目支持基于 AST 模式的结构化搜索和替换——比正则表达式精确得多：

```bash
# 搜索所有使用了未关闭文件句柄的代码
cgr search --pattern 'with open($F) as $F: ... $F.close()'

# 批量替换所有同步文件操作为异步版本
cgr replace --pattern 'json.load($F)' --replacement 'await json.load($F)'
```

### 4.3 数据流追踪

新增的 `FLOWS_TO` 污点分析边可以追踪变量从赋值 → 函数调用 → I/O 操作的完整数据流，覆盖 C#、Java、C、Go 等语言：

```cypher
// 追踪用户输入如何流向后端
MATCH (src:Function)-[:FLOWS_TO*1..5]->(sink:Function {name: "execute_query"})
WHERE src.name CONTAINS "user_input"
RETURN src.name, sink.name
```

### 4.4 死代码检测

通过从入口点出发遍历 CALLS 边，找出从未被引用的函数：

```bash
cgr find-dead-code --entry-points "main.py,__init__.py"
```

## 五、常见问题与解决方案

### Q1: 启动 `cgr daemon up` 报 Docker 连接错误？

确保 Docker Desktop 已启动并运行：

```bash
docker ps  # 验证 Docker 是否可用
cgr daemon up  # 重试
```

### Q2: 某些语言的语法没有被正确识别？

检查是否安装了对应语言的 Tree-sitter Grammar：

```bash
# 查看已安装的语言
cgr status --languages

# 安装缺失语言
uv tool install "code-graph-rag[treesitter-full]"
```

### Q3: 大量文件时图谱构建非常慢？

Memgraph 的批量写入效率可通过调整 `batch_size` 优化：

```bash
cgr start --repo-path /path/to/repo --update-graph --batch-size 5000
```

### Q4: 实时监控更新时图谱出现不一致？

`realtime_updater` 使用事务锁防止并发写入，但如果仍有问题，可以先清理再重建：

```bash
# 清理图谱（慎用，会删除所有项目数据）
cgr start --repo-path /path/to/repo --clean
cgr start --repo-path /path/to/repo --update-graph
```

## 六、总结

Code-Graph-RAG 巧妙地将**代码结构分析**和**知识图谱**结合起来，解决了传统代码搜索依赖关键词匹配的问题——它真正理解了代码的语义结构。通过 Tree-sitter 的 AST 解析能力，无论代码库有多复杂，都能抽取出函数、类、模块的统一表示，存入 Memgraph 后用 Cypher 查询，再结合 RAG 生成答案，整个流程非常优雅。

如果你的团队维护着大型多语言代码库，或者需要 AI 工具能够**精准理解代码结构**而非靠猜测回答问题，Code-Graph-RAG 值得一试。

---

**相关链接：**

- GitHub: [vitali87/code-graph-rag](https://github.com/vitali87/code-graph-rag)
- PyPI: [code-graph-rag](https://pypi.org/project/code-graph-rag/)
- 官方文档: [code-graph-rag.com](https://code-graph-rag.com)
