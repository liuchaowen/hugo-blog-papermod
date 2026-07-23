---
title: "Repowise：为 AI 编程助手打造的代码库智能层，一次索引永久受益"
date: 2026-07-23
description: "Repowise 通过一次索引构建依赖图谱、Git 历史、架构决策和代码健康度，为 Claude Code、Cursor 等 AI 编程助手提供任务级 MCP 工具，减少 96% 的上下文加载 token，支持 16 种语言的深度解析，无需云端、本地运行、零 LLM 调用即可生成文档和重构计划。"
author: "Cheman"
slug: repowise
draft: false
categories: ["技术", "开源", "AI编程"]
tags: ["GitHub", "开源", "AI编程", "代码智能", "MCP", "代码健康度"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Repowise**，它通过构建代码库智能层，让 AI 编程助手不再每次都重新读取代码，而是直接使用预先计算好的答案，显著减少 token 消耗和工具调用次数。

## 一、项目概述

Repowise 是一个代码库智能层工具，旨在解决 AI 编程助手在处理大型代码库时的核心痛点——**每次任务都需要重新探索代码库**。传统 AI 助手（如 Claude Code、Cursor）在执行任务时，往往需要大量的 `grep`、`read`、`re-read` 操作来理解代码结构，这不仅消耗大量 token，还浪费时间在重复的探索上。

Repowise 的核心思路是：**将代码库的各种信息提前计算并索引，当 AI 助手需要时直接返回结果**。这包括：

- **依赖关系图谱**：16 种语言的完整调用关系图谱
- **Git 历史智能**：热点文件、变更频率、隐式耦合、巴士系数
- **自动生成文档**：每个模块和文件的 Wiki，随提交自动更新
- **架构决策记录**：从 8 个来源挖掘的架构决策，带证据链
- **代码健康度**：25 个确定性标记，无需 LLM 即可计算风险和重构建议

## 二、技术原理

### 架构设计

Repowise 的架构围绕**五层智能数据**构建，每一层都独立可查询：

```python
# 核心数据层（从 pyproject.toml 可见依赖关系）
dependencies = [
    # AST 解析层
    "tree-sitter>=0.23,<1",          # 多语言 AST 解析引擎
    "tree-sitter-python>=0.23,<1",
    "tree-sitter-typescript>=0.23,<1",
    # ... 支持 16 种语言的 tree-sitter 绑定
    
    # 依赖图谱层
    "networkx>=3.3,<4",              # 图计算库
    "scipy>=1.11,<2",                # 社区发现算法
    
    # 向量搜索层
    "lancedb>=0.12,<1",              # 纯 Python 向量数据库
    
    # 数据库层
    "sqlalchemy[asyncio]>=2.0,<3",   # 异步 ORM
    "aiosqlite>=0.20,<1",            # SQLite 异步驱动
]
```

### 核心技术栈与选型理由

1. **Tree-sitter 作为 AST 引擎**
   
   Tree-sitter 是一个高效的增量式解析器，支持 16 种编程语言的精确语法树解析。Repowise 利用它构建**三层调用解析**：
   - 文件级依赖
   - 符号级调用关系
   - 框架感知的特殊边（如路由→处理器）

2. **NetworkX + SciPy 构建图谱**
   
   使用 Leiden 社区发现算法识别代码模块的自然聚类，结合 PageRank 计算节点重要性。这支持：
   - **执行流追踪**：跨文件的调用链分析
   - **循环检测**：识别循环依赖
   - **影响范围计算**：修改某个符号会影响哪些文件

3. **LanceDB 作为向量数据库**
   
   选择 LanceDB 是因为它是一个**纯 Python wheel**，无需额外依赖，支持本地运行。这实现了：
   - 混合检索（全文 + 向量）
   - PageRank 偏置的搜索结果
   - 1-hop 图扩展的上下文增强

### 关键算法：确定性代码健康度评分

Repowise 的代码健康度评分基于 **25 个确定性标记**，完全无需 LLM 调用：

```python
# 从 README 中提到的标记类型
markers = [
    # 复杂度标记
    "McCabe complexity",        # 圈复杂度
    "brain methods",            # 大脑方法（过长过复杂的方法）
    "LCOM4 cohesion",          # 缺乏内聚度
    "god classes",             # 上帝类（过大过复杂的类）
    
    # Git 历史标记
    "change entropy",          # 变更熵（文件变更的混乱程度）
    "prior-defect history",    # 历史缺陷记录
    
    # 测试标记
    "untested hotspots",       # 未测试的热点代码
    
    # 性能标记
    "N+1 queries risk",        # N+1 查询风险（跨文件追踪）
    "I/O-in-loop risk",        # 循环中的 I/O 风险
]
```

**关键创新**：性能标记通过**跨文件调用图谱**检测，而非文件级静态分析。官方数据显示，文件级 linter 发现 0 个跨函数案例，而 Repowise 发现了 557 个。

### 数据流分析

```
源代码 → Tree-sitter AST → 符号表构建 → 调用关系提取
                                        ↓
Git 历史 ← Blame/Log ← 热点分析 ← 变更频率
                                        ↓
文档模板 ← 代码结构 ← Wiki 生成 ← 自动渲染
                                        ↓
架构决策 ← 证据链接 ← 决策挖掘 ← 规则匹配
                                        ↓
健康度 ← 标记计算 ← 评分模型 ← 权重校准
```

## 三、安装与快速开始

### 环境要求

- Python 3.11+
- Git（用于历史分析）
- 可选：LLM API Key（用于生成文档，**索引阶段无需**）

### 安装步骤

```bash
# 1. 通过 pip 安装（推荐）
pip install repowise

# 验证安装
repowise --version
```

### 最简运行示例

```bash
# 进入你的代码仓库
cd /path/to/your/repo

# 初始化索引（无需 API Key，纯本地）
repowise init --index-only -y

# 启动本地仪表板和 MCP 服务器
repowise serve
```

**执行过程**：
1. **扫描代码**：使用 Tree-sitter 解析所有支持的源文件
2. **构建图谱**：提取符号、构建调用关系、运行社区发现
3. **分析 Git**：计算热点、所有权、隐式耦合
4. **生成文档**：基于代码结构自动渲染 Wiki（无需 LLM）
5. **启动服务**：MCP 服务器监听本地端口，仪表板可在浏览器访问

**时间性能**：官方数据表示，在 3000 文件的仓库上，完整索引**低于 30 秒**。

## 四、使用方法与实战

### 基础用法：命令行工具

```bash
# 查看代码健康度 KPI
repowise health

# 获取重构建议（带具体计划）
repowise health --refactoring-targets

# 查看健康度趋势（识别退化）
repowise health --trend

# 评估变更风险（合并前检查）
repowise risk main..HEAD

# 查找未测试的代码热点
repowise impacted-tests

# 搜索代码库（混合检索）
repowise search "authentication flow"
```

### 进阶用法：MCP 工具集成

Repowise 提供 **10 个任务级 MCP 工具**，专为 AI 助手设计：

| 工具 | 用途 | 示例 |
|------|------|------|
| `get_overview()` | 项目架构概览 | "这个项目的主要模块是什么？" |
| `get_context(targets)` | 文件/模块/符号的上下文卡片 | "src/auth.py 的调用者和依赖" |
| `get_answer(question)` | 自然语言问答（带引用） | "为什么用 JWT 而不是 session？" |
| `get_risk(targets)` | 变更风险评估 | "修改这个函数会影响什么？" |
| `get_health(targets)` | 代码健康度详情 | "这个文件有什么问题？" |
| `get_dead_code()` | 死代码检测 | "哪些代码没有被使用？" |

**Claude Code 集成示例**：

```bash
# 安装 Repowise 插件
/plugin marketplace add repowise-dev/repowise
/plugin install repowise@repowise

# 或手动配置 MCP
claude mcp add repowise -- repowise mcp
```

然后在 Claude Code 中直接提问：

```
Use repowise get_context for src/api/handlers.py
```

Claude 会收到预计算的上下文卡片，包括：
- 文件摘要和签名
- 热点标记
- 调用者和被调用者
- 相关架构决策

### 实际项目示例：优化 Token 消耗

官方提供的对比数据（相同模型、相同测试环境）：

```
┌─────────────────┬──────────────┬──────────────┬─────────┐
│ 指标            │ 无 Repowise  │ 有 Repowise  │ 减少    │
├─────────────────┼──────────────┼──────────────┼─────────┤
│ 上下文 Token    │ 64,039       │ 2,391        │ -96%    │
│ 文件读取次数    │ ~50 次       │ ~5 次        │ -89%    │
│ 工具调用次数    │ ~30 次       │ ~9 次        │ -70%    │
└─────────────────┴──────────────┴──────────────┴─────────┘
```

**关键机制**：`distill` 命令可压缩命令输出，保留错误信息，减少 61%-89% 的 token：

```bash
# 压缩 pytest 输出（保留所有失败行）
repowise distill pytest          # 减少 61% token

# 压缩 git log（保留关键信息）
repowise distill git log -50     # 减少 89% token

# 查看节省统计
repowise saved
```

## 五、常见问题与解决方案

### 安装失败

**问题 1：Tree-sitter 语言包安装失败**

```bash
# 错误信息
ERROR: Failed building wheel for tree-sitter-python

# 解决方案：确保有编译工具链
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# Windows
# 需要安装 Visual Studio Build Tools
```

**问题 2：LanceDB 导入错误**

```bash
# 错误信息
ImportError: cannot import name 'lancedb'

# 解决方案：升级 pip
pip install --upgrade pip setuptools wheel
pip install lancedb>=0.12
```

### 运行时错误

**问题 1：Git 仓库检测失败**

```bash
# 错误信息
NotAGitRepositoryError: /path/to/repo is not a git repository

# 解决方案
cd /path/to/repo
git init  # 如果确实是新项目
# 或检查路径是否正确
```

**问题 2：MCP 服务器启动失败**

```bash
# 错误信息
OSError: [Errno 48] Address already in use

# 解决方案：更换端口
repowise serve --port 8080
```

### 性能问题

**问题 1：索引大型仓库耗时过长**

```python
# 解决方案：限制索引范围
# 在 .repowise.yaml 中配置
exclude:
  - "node_modules/**"
  - "vendor/**"
  - "*.min.js"
  - "dist/**"
```

**问题 2：内存占用过高**

```bash
# 解决方案：分批索引
repowise init --batch-size 500  # 每批处理 500 个文件
```

### 兼容性

**问题：我的语言不在支持列表中怎么办？**

Repowise 支持 16 种语言的完整解析，对于其他语言：
- **文件级分析**：仍然追踪 Git 历史、热点、所有权
- **符号级分析**：通过 Shell 脚本函数级符号
- **自定义语言**：通过添加 `.scm` 查询文件和配置项

```bash
# 添加新语言的步骤（从文档中提取）
# 1. 创建 tree-sitter 查询文件
# 2. 在配置中注册
# 无需修改解析核心代码
```

## 六、总结

Repowise 通过**一次索引、永久受益**的设计理念，解决了 AI 编程助手在大型代码库中的核心痛点：

1. **Token 效率提升**：减少 96% 的上下文加载 token，降低成本
2. **零 LLM 依赖**：核心功能（图谱、健康度、风险）完全本地、完全确定性
3. **多语言支持**：16 种语言的 AST 解析，覆盖主流技术栈
4. **实用性强**：提供 10 个任务级 MCP 工具，直接集成到现有工作流
5. **团队友好**：支持多仓库工作区、变更风险评分、免费 PR Bot

对于使用 Claude Code、Cursor、Codex CLI 等 AI 编程助手的开发者，Repowise 是一个值得尝试的效率倍增工具。通过提前计算代码库的各类智能信息，让 AI 助手从"每次探索"转变为"直接查询"，显著提升开发效率和代码质量。
