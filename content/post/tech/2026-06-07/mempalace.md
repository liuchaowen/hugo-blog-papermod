---
title: "MemPalace：本地优先的 AI 记忆系统，96.6% 检索准确率无需 API 调用"
date: 2026-06-07
description: "MemPalace 是一款本地优先的 AI 记忆工具，通过语义搜索存储对话历史原文，支持可插拔后端（ChromaDB/Qdrant/pgvector），在 LongMemEval 基准上达到 96.6% R@5 检索准确率且无任何 API 调用。"
author: "Cheman"
slug: mempalace
draft: false
categories: [AI工具, 开源项目]
tags: [AI记忆, RAG, 本地化, ChromaDB, MCP, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MemPalace**，一个本地优先的 AI 记忆系统，能够实现 verbatim（逐字）存储并在无需任何 API 调用的情况下达到 96.6% 的检索召回率。

## 一、项目概述

MemPalace 是一个本地优先的 AI 记忆系统，专门设计用于存储和检索对话历史。与传统的 RAG（检索增强生成）系统不同，MemPalace **不进行总结、提取或改写**，而是完整保留原始对话内容，通过语义搜索进行检索。

**核心特性：**
- **Verbatim 存储**：完整保留原始对话文本，不做任何修改
- **结构化索引**：人员/项目成为 *wings*，主题成为 *rooms*，原始内容存储在 *drawers* 中
- **可插拔后端**：支持 ChromaDB（默认）、Qdrant、pgvector、SQLite 等多种向量存储
- **零 API 调用**：核心检索功能无需任何外部 API，完全本地运行
- **MCP 服务器**：提供 29 个 MCP 工具，可与 Claude Code、Gemini CLI 等工具集成

**性能表现（LongMemEval 基准）：**
- Raw 模式（无启发式、无 LLM）：**96.6% R@5**
- Hybrid v4（留出法 450 题）：**98.4% R@5**
- Hybrid v4 + LLM 重排序：**≥99% R@5**

## 二、技术原理

### 2.1 架构设计

MemPalace 采用模块化、可扩展的架构设计：

```
用户对话 → 挖掘 (mine) → 向量化 → 存储后端
                        ↓
                    元数据索引
                        ↓
查询请求 → 语义搜索 → 结果召回 → (可选) LLM 重排序
```

**核心概念：**
- **Palace（宫殿）**：顶级容器，对应一个完整的内存空间
- **Wing（侧厅）**：按人员或项目划分的命名空间
- **Room（房间）**：按主题组织的对话集合
- **Drawer（抽屉）**：存储原始对话文本的基本单元

这种分层结构设计使得搜索可以限定在特定范围内，而不是对整个语料库进行扁平化搜索。

### 2.2 存储后端抽象

MemPalace 定义了清晰的存储后端接口（`mempalace/backends/base.py`），支持多种向量数据库：

```python
class BaseBackend(ABC):
    @abstractmethod
    def add(self, drawers: list[Drawer]) -> None:
        """添加 drawers 到后端"""
    
    @abstractmethod
    def search(self, query: str, k: int = 5) -> list[tuple[Drawer, float]]:
        """语义搜索"""
    
    @abstractmethod
    def clear(self) -> None:
        """清空后端"""
```

**内置后端实现：**
1. **ChromaDB**（默认）：本地运行的轻量级向量数据库
2. **Qdrant**：通过 REST API 连接的高性能向量数据库
3. **pgvector**：基于 PostgreSQL 的向量扩展
4. **SQLite Exact**：本地精确向量检索（用于正确性验证）

### 2.3 嵌入模型

MemPalace 提供两种嵌入模型选择（通过 `python -m mempalace.onboarding` 配置）：

1. **embeddinggemma-300m**（默认，多语言）：
   - 大小：~300 MB
   - 支持：100+ 语言
   - 格式：ONNX 量化模型
   - 缓存路径：`~/.cache/huggingface/`

2. **all-MiniLM-L6-v2**（英文only）：
   - 大小：~30 MB
   - 支持：仅英文
   - 格式：ChromaDB 内置模型
   - 缓存路径：`~/.cache/chroma/`

嵌入模型在首次使用时惰性下载，不需要在安装时预先下载。

### 2.4 检索流程

**Raw 模式（96.6% R@5）：**
```
查询 → 向量化 → ChromaDB 语义搜索 → 返回 Top-K 结果
```

**Hybrid 模式（98.4% R@5）：**
```
查询 → 向量化 → ChromaDB 语义搜索
                ↓
      关键词增强（BM25风格）
                ↓
      时间邻近度增强
                ↓
      偏好模式提取
                ↓
      重新打分 → 返回 Top-K 结果
```

**LLM 重排序（≥99% R@5）：**
```
Hybrid 检索 Top-20 → LLM Reader 评估 → 选出最佳候选
```

## 三、安装与快速开始

### 3.1 安装方法

**推荐使用 `uv`（隔离环境）：**

```bash
# 安装到隔离环境，避免依赖冲突
uv tool install mempalace

# 初始化 palace
mempalace init ~/projects/myapp
```

**或使用 `pipx`（效果相同）：**

```bash
pipx install mempalace
```

**传统 `pip` 安装（需要在虚拟环境中）：**

```bash
python -m venv .venv && source .venv/bin/activate
pip install mempalace
```

### 3.2 Docker 部署

对于不想本地安装 Python 工具链的用户，可以使用 Docker 镜像：

```bash
# 构建镜像（CPU 版本，包含 extract + spellcheck 扩展）
docker build -t mempalace .

# 运行 MCP 服务器（注意 -i 标志，JSON-RPC 需要 stdin）
docker run -i --rm -v mempalace-data:/data mempalace

# 运行 CLI 命令（挂载要挖掘的主机目录）
docker run --rm -v mempalace-data:/data -v /path/to/project:/work mempalace mine /work
docker run --rm -v mempalace-data:/data mempalace search "why GraphQL"
```

**集成到 MCP 客户端（如 Claude Code）：**

```json
{
  "mcpServers": {
    "mempalace": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "mempalace-data:/data", "mempalace"]
    }
  }
}
```

### 3.3 快速开始

```bash
# 1. 挖掘项目文件到 palace
mempalace mine ~/projects/myapp

# 2. 挖掘 Claude Code 会话（按项目划分 wing）
mempalace mine ~/.claude/projects/ --mode convos

# 3. 搜索
mempalace search "why did we switch to GraphQL"

# 4. 为新会话加载上下文
mempalace wake-up
```

## 四、使用方法与实战

### 4.1 配置自动保存钩子

为了防止 Claude Code 会话在 30 天后过期（无自动保存钩子时），需要配置两个钩子：

**钩子 1：定期保存**
```bash
# 在 ~/.claude/settings.json 中添加
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "mempalace hook post-tool-use"
          }
        ]
      }
    ]
  }
}
```

**钩子 2：上下文压缩前保存**
```bash
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "mempalace hook pre-compact"
          }
        ]
      }
    ]
  }
}
```

### 4.2 使用不同存储后端

**使用 SQLite Exact 后端（本地无服务）：**
```bash
mempalace mine ~/projects/myapp --backend sqlite_exact
```

**使用 Qdrant 后端：**
```bash
export MEMPALACE_QDRANT_URL=http://localhost:6333
mempalace mine ~/projects/myapp --backend qdrant
```

**使用 pgvector 后端：**
```bash
# 需要先安装驱动
pip install mempalace[pgvector]

# 设置数据库连接
export MEMPALACE_PGVECTOR_DSN=postgresql://localhost:5432/mempalace
mempalace mine ~/projects/myapp --backend pgvector
```

### 4.3 知识图谱功能

MemPalace 包含时序实体关系图，支持有效性窗口：

```bash
# 添加实体关系
mempalace kg add "Alice" "works_at" "Acme Corp" --valid-from 2024-01-01

# 查询关系
mempalace kg query "Alice" --relation "works_at"

# 失效旧关系
mempalace kg invalidate "Alice" "works_at" "Acme Corp" --valid-to 2025-06-01

# 查看时间线
mempalace kg timeline "Alice"
```

### 4.4 Agent 日记系统

每个专业 Agent 在 palace 中拥有自己的 wing 和日记：

```bash
# 列出所有 Agent
mempalace list-agents

# Agent 写入日记
mempalace agent-log "code-reviewer" "Reviewed PR #1234, found 3 issues"

# 搜索 Agent 日记
mempalace search "code review" --wing "agent:code-reviewer"
```

### 4.5 消息级召回（Per-message Recall）

除了文件级 chunk，还可以存储每条消息：

```bash
# 扫描转录本目录，为每条消息创建 drawer
mempalace sweep ~/.claude/projects/

# 首次运行会存储每个 user/assistant 消息
# 幂等且可恢复：已处理的消息不会重复存储
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题：** `pip install mempalace` 失败，提示 PEP 668 错误

**解决方案：** 使用 `uv tool install` 或 `pipx install` 在隔离环境中安装，避免与系统 Python 包冲突。

```bash
# 推荐方法
uv tool install mempalace

# 或者
pipx install mempalace
```

### 5.2 Claude Code 会话过期

**问题：** Claude Code 会话在 30 天后过期，未保存历史记录

**解决方案：** 配置自动保存钩子（见 4.1 节），并备份现有 JSONL 转录本：

```bash
# 备份现有转录本
cp -r ~/.claude/projects/ ~/claude-projects-backup/

# 回填已有转录本
mempalace mine ~/.claude/projects/ --mode convos
```

快速设置清单：[Claude Code retention setup checklist](https://mempalaceofficial.com/guide/claude-code-retention.html)

### 5.3 嵌入模型下载失败

**问题：** 首次使用时嵌入模型下载失败或超时

**解决方案：** 手动下载模型并放置到缓存目录：

```bash
# embeddinggemma-300m 模型
# 从 HuggingFace 下载并放置到：
~/.cache/huggingface/hub/models--sentence-transformers--embeddinggemma-300m/

# all-MiniLM-L6-v2 模型
# ChromaDB 会自动下载到：
~/.cache/chroma/
```

或使用镜像源加速下载：
```bash
export HF_ENDPOINT=https://hf-mirror.com
mempalace onboarding  # 重新运行配置
```

### 5.4 检索结果不准确

**问题：** 搜索结果不相关或召回率低

**解决方案：**

1. **使用 Hybrid 模式**（需要重新训练或调整超参数）：
   ```bash
   # Hybrid v4 需要在留出集上调整超参数
   # 参考 benchmarks/BENCHMARKS.md
   ```

2. **增加检索数量然后使用 LLM 重排序**：
   ```bash
   mempalace search "query" --top-k 20 --rerank
   ```

3. **检查嵌入模型是否适合你的语言**：
   - 如果使用 all-MiniLM-L6-v2，仅支持英文
   - 多语言场景请切换到 embeddinggemma-300m

### 5.5 Docker 容器无法访问主机目录

**问题：** Docker 运行 mempalace 时无法访问主机上的项目文件

**解决方案：** 正确挂载主机目录到容器：

```bash
# -v /主机/绝对路径:/容器/路径
docker run --rm \
  -v mempalace-data:/data \
  -v /Users/chao/projects:/work \
  mempalace mine /work
```

### 5.6 存储后端连接失败

**问题：** 使用 Qdrant 或 pgvector 后端时连接失败

**解决方案：**

**Qdrant：**
```bash
# 检查 Qdrant 是否运行
curl http://localhost:6333/health

# 检查环境变量
echo $MEMPALACE_QDRANT_URL

# 检查 API key（如果设置了）
echo $MEMPALACE_QDRANT_API_KEY
```

**pgvector：**
```bash
# 检查 PostgreSQL 是否运行
pg_isready

# 检查数据库是否存在
psql -d mempalace -c "\dt"

# 检查 vector 扩展是否安装
psql -d mempalace -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## 六、总结

MemPalace 是一个设计优秀的本地优先 AI 记忆系统，其核心价值在于：

1. **隐私优先**：所有数据存储在本地，可选连接到自托管的向量数据库
2. **高性能**：96.6% 检索准确率无需任何 API 调用，Hybrid + LLM 重排序可达 ≥99%
3. **灵活可扩展**：可插拔后端设计，支持 ChromaDB、Qdrant、pgvector 等多种选择
4. **结构化组织**：Palace/Wing/Room/Drawer 分层结构使得记忆管理更加有序
5. **MCP 集成**：29 个 MCP 工具使其成为 AI 编码助手的有力补充

适用场景：
- 需要长期记忆的 AI 对话系统
- 本地文档/代码语义搜索
- Claude Code、Gemini CLI 等工具的记忆增强
- 对数据隐私有严格要求的企业环境

项目完全开源（MIT 许可证），活跃维护中（v3.4.0，2026 年 6 月），拥有详细的文档和基准测试方法论。对于需要本地化 AI 记忆解决方案的开发者和团队，MemPalace 是一个值得考虑的选择。

**官方资源：**
- GitHub：https://github.com/MemPalace/mempalace
- 文档：https://mempalaceofficial.com
- PyPI：https://pypi.org/project/mempalace/
- Discord：https://discord.com/invite/ycTQQCu6kn
