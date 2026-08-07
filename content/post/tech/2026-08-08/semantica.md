---
title: "Semantica：给 AI Agent 装上「可审计的大脑」——开源版 Palantir 的图原生上下文基础设施"
date: 2026-08-08
description: "深度解析 GitHub Trending 项目 Semantica：一个图原生、确定性、可自托管的 AI Agent 上下文与问责基础设施。涵盖 Context Graph、决策智能、W3C PROV-O 溯源、Rete/Datalog 推理引擎的架构原理、安装实战与常见问题排查。"
author: "Cheman"
slug: semantica
draft: false
categories: ["技术", "开源", "AI 基础设施"]
tags: ["Semantica", "知识图谱", "AI Agent", "GraphRAG", "决策智能", "RDF", "Neo4j", "Python", "可解释AI", "数据溯源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Semantica**（[semantica-agi/semantica](https://github.com/semantica-agi/semantica)），它给自己的定位相当大胆——「面向 AI Agent 的开源版 Palantir」，一个坐在你的 LLM、向量库和 Agent 框架**下面**的确定性基础设施层，让每一个 AI 决策都可追溯、可解释、可交给监管审计。

## 一、项目概述

### 它解决的到底是什么问题

现在绝大多数 AI Agent 的运行方式是：把文档切块 → 塞进向量库 → 检索相似片段 → 交给 LLM 生成答案。这套 RAG 流水线在「问答」场景里够用，但一旦进入**高风险、强监管**的领域就会立刻崩塌。

Semantica 的作者把这个痛点讲得很直白：

> Most AI agents act without a trail. They store embeddings, not meaning.
> （大多数 Agent 行动时不留痕迹。它们存的是嵌入向量，不是语义。）

举个具体场景：一个信贷审批 Agent 在今年 3 月批准了一笔贷款。9 个月后监管机构上门，问「为什么批？依据是什么？当时用了哪些数据？这个判断影响了后续哪些决策？」——如果你的系统里只有一堆 float32 向量和几行日志，这道题无解。在受监管行业，这不是「体验不好」，而是**合规敞口**。

Semantica 要做的，就是把这个缺失的那一层补上：**结构化的上下文图（Context Graph）+ 一等公民的决策记录 + 全链路溯源 + 确定性推理**。

### 核心特性

| 能力 | 说明 |
| --- | --- |
| **Context Graphs** | Agent 所知、所决、所推理的一切，都是可查询的图结构 |
| **Decision Intelligence** | 每个决策是一等对象：可追溯、可按判例检索、可因果链接 |
| **AI 治理与本体** | SHACL 约束、冲突检测、合规规则、OWL 生成、SKOS 词表管理 |
| **完整可审计性** | 每条事实带 W3C PROV-O 溯源，审计轨迹可导出为 JSON/CSV/RDF |
| **确定性推理** | 前向链推理、Rete 网络、Datalog、SPARQL，推理路径完全可解释 |
| **知识流水线** | 多源摄取 → 实体感知分块 → NER/关系/事件抽取 → 图构建，全程去重与溯源保留 |
| **企业数据平台** | 原生对接 Databricks（Unity Catalog + Delta Lake）与 Snowflake |
| **图分析** | 中心性、社区发现、链接预测、最短路径 |
| **多语图存储** | RDF（Oxigraph/Blazegraph/Jena/RDF4J）与 LPG（Neo4j/FalkorDB/Apache AGE/Neptune）双栈可换 |
| **开箱集成** | Agno 原生支持、完整 MCP Server、CLI、REST API、主流编辑器插件 |

有一点特别值得强调：**图构建、推理和溯源三条链路完全不依赖 LLM**。这意味着这部分输出是确定性的、可复现的，不会出现「同样的输入两次跑出不同结论」这种在合规场景下致命的问题。

### 和现有方案的定位差异

项目 README 里给了一张对比表，我觉得非常有信息量：

| | 向量库 + RAG | 纯 LLM 记忆 | **Semantica** |
| --- | --- | --- | --- |
| 召回方式 | 嵌入相似度 | Token 窗口 | 图遍历 + 语义检索 |
| 决策历史 | 不存储 | 不存储 | 一等可查询对象 |
| 溯源 | 无 | 无 | W3C PROV-O，链接到源 |
| 推理 | 无 | 黑箱 | 前向链 / Rete / Datalog / SPARQL |
| 冲突检测 | 静默覆盖 | 静默覆盖 | 检测、标记、消解 |
| 时间旅行 | 不支持 | 不支持 | 时间点图快照 |
| 合规导出 | 无 | 无 | PROV-O / SHACL / OWL / RDF |
| 实体消解 | 无 | 无 | 分块（Blocking）+ 语义去重 |
| 多 Agent 上下文 | 各存各的 | 各存各的 | 单一共享智能层 |

注意最后一行：多 Agent 场景下，传统做法是每个 Agent 一份独立记忆，彼此不通；Semantica 的思路是**所有 Agent 共享同一张上下文图**。这在做 Multi-Agent 编排时是一个结构性的差别。

## 二、技术原理

### 2.1 整体架构：一条完整的流水线，而非单个库

Semantica 不是「一个库套一个营销名词」，它的每一段都是独立可导入的模块：

```
Sources → Ingest → Parse → Normalize → Split → Extract → Conflict Detection → Deduplication
   → Knowledge Graph → [ Ontology · Reasoning · Provenance · Decisions ] → Enriched KG
   → Vector Store + Polyglot Graph Store (RDF & LPG) → Export / Visualize / REST · MCP · CLI
```

逐段拆解：

- **Ingest（摄取）**：文件、Web、数据库、企业数据平台（Databricks/Snowflake）、云盘（Google Drive、Elasticsearch）、流（Kafka、Kinesis）、Git、Email、MCP
- **Parse → Normalize → Split**：文档解析、文本/实体/日期归一化、**GraphRAG 原生的实体感知分块**
- **Extract → Conflict → Dedup**：NER、关系、事件、三元组抽取；冲突事实在合并前被标记并消解
- **Knowledge Graph**：`GraphBuilder` 构图，之上跑双时态事实与图分析
- **智能层**：SHACL/OWL 治理、Rete/Datalog/SPARQL 推理、PROV-O 血缘、一等决策记录
- **Storage**：多语存储，RDF 与 LPG 双栈，换后端不改业务代码
- **Outputs**：导出（RDF/OWL/Parquet/Cypher/JSON-LD）、可视化、REST/MCP/CLI 三种访问方式

### 2.2 核心抽象一：Context Graph

传统 RAG 回答的是「**什么最相似**」，Context Graph 回答的是「**什么与什么相连、为什么、如何相连**」。

```python
from semantica.context import ContextGraph, AgentContext
from semantica.vector_store import VectorStore

graph = ContextGraph(advanced_analytics=True)

# 带类型属性的节点
graph.add_node("acme_corp",    "Organization", name="Acme Corp", industry="SaaS")
graph.add_node("alice_chen",   "Person",       name="Alice Chen", role="CTO")
graph.add_node("contract_001", "Contract",     value=2_400_000, currency="USD")

# 带类型和元数据的边（额外 kwargs 自动成为边属性）
graph.add_edge("alice_chen", "acme_corp",    edge_type="works_for",  since="2019-03-01")
graph.add_edge("acme_corp",  "contract_001", edge_type="party_to",   signed="2024-01-15")

# BFS 遍历：从任意节点跳 N 跳
neighbors = graph.get_neighbors("acme_corp", hops=2)

# 时间点快照：图在过去任意日期的状态
snapshot  = graph.state_at("2024-01-01")

# AgentContext：面向 Agent 记忆工作流的高层 API
vs  = VectorStore(backend="faiss")
ctx = AgentContext(vector_store=vs, knowledge_graph=graph)
ctx.store("Alice approved the Acme renewal in Q1 2024", conversation_id="conv_001")
retrieved = ctx.retrieve("who approved the Acme contract?")
```

**为什么图优于纯嵌入？** 三点关键：

1. **遍历能找到嵌入找不到的连接**——比如「一个和某份合同隔了 3 跳的人」，语义上毫不相似，但结构上强相关；
2. **每个节点自带溯源**，永远能追问「这条信息从哪来」；
3. **冲突在污染知识库之前就被标记**，而不是像向量库那样静默覆盖。

再加上 `state_at()` 的时间点快照，可以在不重跑流水线的情况下**回放历史**。

### 2.3 核心抽象二：Decision Intelligence

这是我认为整个项目最有辨识度的设计。在 Semantica 里，一个决策**不是一行日志**，而是一个有完整生命周期的图节点：

```
record_decision()             → 存为带完整结构化上下文的图节点
add_causal_relationship()     → 链接上游成因与下游影响
find_similar_decisions()      → 跨全部历史决策的语义判例检索
trace_decision_chain()        → 回溯到根因的完整因果祖先链
analyze_decision_impact()     → 下游影响图：这个决策波及了什么
check_decision_rules()        → 针对可配置规则集的合规门禁
export / audit trail          → 导出 W3C PROV-O / CSV / JSON 供监管提交
```

来看一个完整的信贷审批因果链示例——这段代码几乎就是「合规可解释 AI」的最小可运行样本：

```python
from semantica.context import ContextGraph

graph = ContextGraph(advanced_analytics=True)

# 记录带完整结构化上下文的决策
app_id = graph.record_decision(
    category="credit_application",
    scenario="Personal loan, $85k income, 31% DTI, 3yr employment",
    reasoning="Income meets threshold; employment stable; no adverse credit events",
    outcome="proceed_to_underwriting",
    confidence=0.88,
    metadata={"applicant_id": "A-7291"},
)
uw_id = graph.record_decision(
    category="loan_underwriting",
    scenario="Underwriting review for A-7291",
    reasoning="DTI within policy; clean 36-month credit history",
    outcome="approved",
    confidence=0.94,
)
rate_id = graph.record_decision(
    category="interest_rate",
    scenario="Rate assignment for approved loan A-7291",
    reasoning="Prime + 2.4% based on risk tier B2",
    outcome="rate_set_8.9pct",
    confidence=0.99,
)

# 构建可审计的因果链
# relationship_type 只能是 CAUSED / INFLUENCED / PRECEDENT_FOR 三者之一
graph.add_causal_relationship(app_id, uw_id,   relationship_type="CAUSED")
graph.add_causal_relationship(uw_id,  rate_id, relationship_type="INFLUENCED")

# 查询这套「智能」
chain     = graph.trace_decision_chain(rate_id)       # 完整因果祖先
similar   = graph.find_similar_decisions("personal loan approval, 31% DTI", max_results=5)
impact    = graph.analyze_decision_impact(uw_id)      # 下游影响面
compliant = graph.check_decision_rules({"category": "loan_underwriting", "confidence": 0.94})
insights  = graph.get_decision_insights()
```

这里有个**极易踩坑的约束**要记住：`relationship_type` 是枚举，只接受 `CAUSED`、`INFLUENCED`、`PRECEDENT_FOR` 三个值，写别的会直接报错。

### 2.4 确定性推理引擎：Rete / Datalog / 可解释链

Semantica 的推理层不走 LLM，走的是经典的**规则引擎**路线。以 AML（反洗钱）规则为例：

```python
from semantica.reasoning import ReteEngine, Rule, Fact, RuleType

rete = ReteEngine()
rete.build_network([
    Rule(
        rule_id="aml_flag",
        name="Flag high-risk transactions",
        conditions=[
            {"field": "amount",  "operator": ">",  "value": 10_000},
            {"field": "country", "operator": "in", "value": ["IR", "KP", "SY"]},
        ],
        conclusion="flag_for_compliance_review",
        rule_type=RuleType.IMPLICATION,
    ),
    Rule(
        rule_id="velocity_check",
        name="Flag rapid sequential transfers",
        conditions=[
            {"field": "transfers_in_1h", "operator": ">", "value": 5},
            {"field": "total_amount",    "operator": ">", "value": 50_000},
        ],
        conclusion="flag_velocity_breach",
        rule_type=RuleType.IMPLICATION,
    ),
])

rete.add_fact(Fact("tx_001", "transaction", [{"amount": 15_000, "country": "IR"}]))
flagged = rete.match_patterns()
# → [{"rule": "aml_flag", "matched_facts": ["tx_001"], "conclusion": "flag_for_compliance_review"}]
```

> ⚠️ **官方明示的当前局限**：本版本 `ReteEngine` 的 alpha 节点条件匹配器「刻意做得比较简单」。在把 `match_patterns()` 的输出接进生产合规门禁之前，务必用你自己的真实规则集验证一遍；更精细的条件求值还在 roadmap 上。这种坦诚在开源项目里挺少见，也值得使用者警惕。

递归查询交给 Datalog：

```python
from semantica.reasoning import DatalogReasoner

engine = DatalogReasoner()
engine.add_fact("parent(tom, bob)")
engine.add_fact("parent(bob, ann)")
engine.add_fact("parent(ann, pat)")
engine.add_rule("ancestor(X, Y) :- parent(X, Y).")
engine.add_rule("ancestor(X, Z) :- parent(X, Y), ancestor(Y, Z).")
ancestors = engine.query("ancestor(tom, ?X)")
# → [{"X": "bob"}, {"X": "ann"}, {"X": "pat"}]
```

而「可解释」不是口号，是一个独立的 `ExplanationGenerator`，产出结构化的 `Explanation(conclusion, steps, justification)`：

```python
from semantica.reasoning import ExplanationGenerator, Reasoner

reasoner = Reasoner()
reasoner.add_fact("parent(tom, bob)")
reasoner.add_rule("ancestor(X, Y) :- parent(X, Y)")
result = reasoner.forward_chain()

explanation = ExplanationGenerator().generate_explanation(result)
```

### 2.5 GraphRAG 原生分块：为什么 `split` 值得单独看

普通 RAG 的 `chunk_size=1000, overlap=200` 递归切分，会把一个命名实体、一条三元组硬生生切成两半，导致后续 NER 和关系抽取质量断崖式下跌。Semantica 的 `semantica.split` 提供了**图感知**的切分策略：

```python
from semantica.split import TextSplitter, RelationAwareChunker

text = open("contracts/master_agreement.txt").read()

# 实体感知：绝不把命名实体切开（GraphRAG 关键）
chunks = TextSplitter(method="entity_aware", ner_method="llm", chunk_size=1000).split(text)

# 关系感知：保持 (主语, 谓语, 宾语) 三元组完整
chunks = RelationAwareChunker(chunk_size=1000, preserve_triplets=True).chunk(text)

# 图切分：用中心性寻找自然的社区边界
chunks = TextSplitter(method="graph_based", chunk_size=1000).split(text)

# 层级切分：section → paragraph → sentence
chunks = TextSplitter(method="hierarchical", levels=["section", "paragraph"]).split(text)
```

支持的方法完整清单：`recursive` · `token` · `sentence` · `paragraph` · `semantic_transformer` · `entity_aware` · `relation_aware` · `graph_based` · `ontology_aware` · `hierarchical` · `community_detection` · `centrality_based` · `llm`。

单就这个模块拆出来用在你现有的 RAG 里，都可能带来可观的召回质量提升。

### 2.6 数据流：一条声明式流水线串起全链路

`semantica.pipeline` 提供 DSL，把摄取、抽取、构图组合成可并行的声明式流水线：

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine

builder = PipelineBuilder()

# 注意：add_step() 返回的是 PipelineStep 而非 builder，所以不能链式调用
builder.add_step("ingest",      step_type="ingest",           source="./contracts/", recursive=True)
builder.add_step("extract",     step_type="ner_extract")
builder.add_step("relations",   step_type="relation_extract")
builder.add_step("build_kg",    step_type="kg_build",         merge_entities=True)
builder.add_step("deduplicate", step_type="deduplicate",      threshold=0.75)
builder.add_step("export",      step_type="export",           format="turtle", output="kg.ttl")

# 而 connect_steps() 和 set_parallelism() 返回 builder，可以链式
pipeline = (
    builder
    .connect_steps("ingest",      "extract")
    .connect_steps("extract",     "relations")
    .connect_steps("relations",   "build_kg")
    .connect_steps("build_kg",    "deduplicate")
    .connect_steps("deduplicate", "export")
    .set_parallelism(4)
    .build(name="contracts_pipeline")
)

engine = ExecutionEngine()
result = engine.execute_pipeline(pipeline)
```

这个 API 设计上的不一致（`add_step` 不返回 builder）是个已知的小坑，README 特意标注了，写代码时别习惯性写成一长串链式调用。

### 2.7 技术选型解读

几个选型上的取舍我觉得挺值得说：

- **不强绑 LLM**：图构建 / 推理 / 溯源三层零 LLM 依赖，换来确定性和可复现性，这是合规场景的硬需求；
- **多语存储（Polyglot）**：同时支持 RDF 三元组库（走 SPARQL over HTTP，核心只依赖 `requests`）和 LPG（走 Cypher）。学术/合规侧偏爱 RDF + W3C 标准，工程侧偏爱 Neo4j 生态，Semantica 两边都要，代价是抽象层更厚；
- **W3C 标准优先**：PROV-O、SHACL、OWL、SKOS 全套上，理由很实际——**监管机构认这些格式**，自造格式没人接受；
- **Python 3.8+ 宽兼容**：`pyproject.toml` 里 `requires-python = ">=3.8"`，分类器一路标到 3.12，Development Status 已经是 `5 - Production/Stable`，当前版本 `0.6.0`。

### 2.8 性能数据

README 给出的 v0.5.0 在 11.8 万节点生产图上的基准：

| 操作 | 优化前 | 优化后 | 提升 |
| --- | --- | --- | --- |
| 节点搜索（118k 节点） | 24 ms | 0.004 ms | **6,000×** |
| 嵌入缓存命中 | 冷加载 | 基于修订号的缓存 | **10×** 吞吐 |
| 语义去重 | 基线 | 优化候选生成 | **6.98×** |
| 候选生成 | 基线 | Blocking 策略 | **63.6%** |

需要客观看待：测试环境是 AMD EPYC + 64GB RAM，去重/候选生成的数字来自 CHANGELOG 的历史记录，而非自动化断言。想验证自己的数据，跑：

```bash
pytest tests/vector_store/test_performance_benchmarks.py -s
```

## 三、安装与快速开始

### 环境要求

- Python **3.8+**（推荐 3.11 / 3.12）
- 生产环境建议 Docker / Kubernetes 部署，而非本地 `pip install`

### 最小安装

```bash
pip install semantica           # 核心
pip install semantica[all]      # 全家桶
```

### 按需装可选依赖

Semantica 的 extras 划分得非常细，按你实际用到的后端装即可：

```bash
pip install semantica[agno]                  # Agno 多 Agent 集成
pip install semantica[llm-litellm]           # OpenAI/Anthropic/Gemini/Mistral/Groq/Ollama/DeepSeek 等
pip install semantica[graph-neo4j]           # Neo4j (LPG)
pip install semantica[graph-falkordb]        # FalkorDB (LPG)
pip install semantica[graph-apache-age]      # Apache AGE (LPG)
pip install semantica[graph-amazon-neptune]  # AWS Neptune (LPG)
pip install semantica[tripletstore-oxigraph] # 内嵌 RDF 存储（内存/磁盘）
pip install semantica[vectorstore-qdrant]    # Qdrant
pip install semantica[vectorstore-pinecone]  # Pinecone
pip install semantica[db-snowflake]          # Snowflake
pip install semantica[db-databricks]         # Databricks
pip install semantica[ingest-parquet]        # Parquet / PyArrow
pip install semantica[ingest-arrow]          # Arrow / Feather / IPC
pip install semantica[viz]                   # HTML 交互式可视化
pip install semantica[explorer]              # Knowledge Explorer 仪表盘
```

> 小提示：Blazegraph、Apache Jena、Eclipse RDF4J 这三个 RDF 三元组库**不需要额外 extras**，`semantica.triplet_store` 直接用核心依赖 `requests` 走 SPARQL over HTTP。

### 5 秒验证安装

```bash
semantica doctor
# Python 3.11.9         pass
# semantica 0.6.0       pass
# faiss vector store    pass
# Config file           pass    ~/.semantica/config.yaml
```

### 最简可运行示例

```python
from semantica.context import ContextGraph

graph = ContextGraph(advanced_analytics=True)

# 每个 Agent 决策都变成可查询、可审计的知识节点
decision_id = graph.record_decision(
    category="vendor_selection",
    scenario="Choose cloud provider for HIPAA workload",
    reasoning="AWS offers BAA, mature HIPAA tooling, and existing team expertise",
    outcome="selected_aws",
    confidence=0.93,
)

# 问「为什么会这样」，得到真正结构化的答案
chain     = graph.trace_decision_chain(decision_id)
similar   = graph.find_similar_decisions("cloud vendor", max_results=5)
impact    = graph.analyze_decision_impact(decision_id)
compliant = graph.check_decision_rules({"category": "vendor_selection"})
```

### 源码安装

```bash
git clone https://github.com/semantica-agi/semantica.git
cd semantica && pip install -e ".[dev]" && pytest tests/
```

### Docker 部署一瞥

项目的 `Dockerfile` 用了标准的两阶段构建，前端 Explorer 用 Node 构建，后端跑 uvicorn，且规规矩矩地创建了非 root 用户并配了 healthcheck：

```dockerfile
FROM node:26-alpine AS frontend-builder
WORKDIR /app/explorer
RUN npm ci && npm run build

FROM python:3.14-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    FALKORDB_HOST=falkordb FALKORDB_PORT=6379

RUN groupadd --system semantica \
    && useradd --system --gid semantica --home-dir /app --shell /usr/sbin/nologin semantica

RUN pip install --no-cache-dir ".[explorer]" && chown -R semantica:semantica /app
USER semantica
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import json, urllib.request; data=json.load(urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)); raise SystemExit(0 if data.get('status') == 'ok' else 1)"

CMD ["python", "-m", "uvicorn", "semantica.explorer.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

从 `FALKORDB_HOST` 的默认值可以看出，官方推荐的容器化组合是 **Semantica + FalkorDB**。生产部署记得设置 `SEMANTICA_SECRET_KEY`，并把图存储和向量存储指向持久化后端。

## 四、使用方法与实战

### 4.1 基础：多源摄取

```python
from semantica.ingest import FileIngestor, WebIngestor, ParquetIngestor, DBIngestor

# 整目录合同（PDF/DOCX/HTML/TXT）
docs = FileIngestor().ingest_directory("./contracts/", recursive=True)

# 遵守 robots.txt 的 Web 摄取
pages = WebIngestor().ingest_url("https://example.com/reports/annual-2024.html")

# Parquet（Snappy 压缩）
records = ParquetIngestor().ingest("./data/transactions.parquet")

# SQL 数据库，指定拉哪些表
rows = DBIngestor().ingest_database(
    connection_string="postgresql://user:pass@localhost/mydb",
    include_tables=["customer_events"],
    max_rows_per_table=50_000,
)
```

企业湖仓直连（**带血缘**，不用先导出 CSV 这一跳）：

```python
from semantica.ingest import DatabricksIngestor, SnowflakeIngestor

databricks = DatabricksIngestor(
    host="https://adb-xxx.azuredatabricks.net",
    token="dapi-xxxxxxxx",              # 或用 client_id/client_secret 走 OAuth M2M
    http_path="/sql/1.0/warehouses/xxxxxxxx",
    catalog="main",
)
customers     = databricks.ingest_table("customers", limit=10_000)
sales         = databricks.ingest_query("SELECT * FROM sales WHERE region = 'EMEA'")
table_lineage = databricks.get_table_lineage("customers", catalog="main", schema="default")

snowflake = SnowflakeIngestor(
    account="myaccount", user="myuser", password="mypassword",
    warehouse="COMPUTE_WH", database="MYDB",
)
orders = snowflake.ingest_table("ORDERS", limit=10_000)
```

> 🔐 **安全提醒**：生产代码里**绝不要硬编码** `token` / `password` / `private_key`，走环境变量（如 `DATABRICKS_TOKEN`、`SNOWFLAKE_PASSWORD`）或密钥管理服务。

### 4.2 进阶：一次性抽取实体、关系、事件、三元组

```python
from semantica.semantic_extract import (
    NamedEntityRecognizer, RelationExtractor, EventDetector, TripletExtractor,
)

text = """
Anthropic CEO Dario Amodei announced a $7.3B Series E funding round in partnership
with Google and Spark Capital, valuing the company at $61.5B as of Q4 2024.
"""

ner = NamedEntityRecognizer(confidence_threshold=0.7)
entities = ner.extract_entities(text)
# → [Entity(name="Dario Amodei", type="PERSON"), Entity(name="Anthropic", type="ORG"), ...]

relations = RelationExtractor(confidence_threshold=0.6, bidirectional=True) \
    .extract_relations(text, entities=entities)
# → [Relation(subject="Dario Amodei", predicate="ceo_of", object="Anthropic"), ...]

events = EventDetector(extract_participants=True, extract_time=True).detect_events(text)
# → [Event(type="FUNDING", participants=["Anthropic","Google","Spark Capital"], ...)]

triplets = TripletExtractor(include_temporal=True, include_provenance=True).extract_triplets(text)
```

⚠️ 批处理是 `ner.process_batch([...])`，**不是** facade 类上的 `extract_entities_batch`——这是个很容易猜错的 API 名。

### 4.3 图分析与双时态事实

```python
from semantica.ingest import FileIngestor
from semantica.kg import (
    GraphBuilder, GraphAnalyzer, CentralityCalculator,
    CommunityDetector, PathFinder, LinkPredictor, BiTemporalFact,
)
from datetime import datetime

sources = FileIngestor().ingest_directory("./contracts/", recursive=True)
kg = GraphBuilder(merge_entities=True, enable_temporal=True).build(sources)

analysis    = GraphAnalyzer().analyze_graph(kg)
degree      = CentralityCalculator().calculate_degree_centrality(kg)   # 最核心的实体
communities = CommunityDetector().detect_communities(kg, method="louvain")
path        = PathFinder().find_shortest_path(kg, "alice_chen", "contract_001")
predictions = LinkPredictor().predict_links(kg, top_k=10)

# 双时态：有效时间（世界上何时为真）与记录时间（你何时知道）互相独立
fact = BiTemporalFact(
    valid_from=datetime(2024, 3, 1),
    valid_until=datetime(2025, 1, 1),
    recorded_at=datetime(2024, 3, 5),
)
```

双时态这个设计在金融和医疗场景里价值极大：「客户 3 月 1 日就换了住址，但我们 3 月 5 日才录入」——这两个时间轴分开，才能正确回答「在 3 月 3 日那一刻，系统认为的地址是什么」这类审计问题。

### 4.4 实战范例：为一次受监管决策生成审计轨迹

这是项目的旗舰模式——记录因果决策链、为每个实体挂溯源、导出监管可接受的审计轨迹。以药物相互作用检查为例：

```python
from semantica.context import ContextGraph
from semantica.provenance import ProvenanceManager
from semantica.export import RDFExporter

graph = ContextGraph(advanced_analytics=True)
prov  = ProvenanceManager(storage_path="./audit.db")

# 1. 记录决策链
d1 = graph.record_decision(
    category="drug_interaction_check",
    scenario="Patient P-4821: warfarin + amiodarone co-prescribed",
    reasoning="Amiodarone potentiates warfarin's anticoagulant effect",
    outcome="flag_for_review", confidence=0.91,
)
d2 = graph.record_decision(
    category="dosage_adjustment",
    scenario="INR monitoring plan for P-4821",
    reasoning="Reduce warfarin dose per interaction severity; recheck INR in 5 days",
    outcome="dose_reduced_30pct", confidence=0.87,
)
graph.add_causal_relationship(d1, d2, relationship_type="CAUSED")

# 2. 为每个实体挂溯源
prov.track_entity(
    "patient_P4821",
    source="ehr/medication_orders_2024.json",
    metadata={"extractor": "NamedEntityRecognizer"},
)

# 3. 导出 W3C PROV-O 供监管提交
#    注意：RDFExporter 期望 {"entities": [...], "relationships": [...]}，
#    而 ContextGraph.to_dict() 给的是 {"nodes": [...], "edges": [...]}，需要先映射
graph_dict = graph.to_dict()
kg = {
    "entities": [
        {"id": n["id"], "type": n["type"], "text": n["content"]}
        for n in graph_dict["nodes"]
    ],
    "relationships": [
        {"source_id": e["source"], "target_id": e["target"], "type": e["type"]}
        for e in graph_dict["edges"]
    ],
}
RDFExporter().export(kg, "audit_trail.ttl", format="turtle")
```

**第 3 步的形状映射是最容易翻车的地方**：`to_dict()` 输出的 `nodes/edges` 和 `RDFExporter` 期望的 `entities/relationships` 键名不一致，必须手动转一层。这个坑 README 里专门用注释标出来了。

### 4.5 向量检索：决策感知的混合检索

```python
from semantica.vector_store import VectorStore, HybridSearch

# inmemory 后端下 HybridSearch 与 explain_decision() 都开箱可用
# 规模上来后换成 qdrant / weaviate / milvus / pinecone / pgvector / faiss，API 完全一致
vs = VectorStore(backend="inmemory", dimension=1536)

vs.store_decision(
    scenario="Personal loan A-7291, $85k income, 31% DTI, 3yr employment",
    outcome="approved", confidence=0.94, category="loan_underwriting",
)

results = vs.search(query="personal loan approval with low DTI", limit=10)

# 稠密 + 稀疏一次检索，RRF 融合
hits = HybridSearch(vector_store=vs).search("high-risk transactions 2024")

# 解释某条决策为什么被检索出来
explanation = vs.explain_decision(results[0]["id"])
```

### 4.6 CLI：终端里跑完整条链路

CLI 随包安装，无需单独装：

```bash
semantica         # 启动仪表盘
semantica doctor  # 健康检查
semantica --help  # 完整分组命令参考
```

命令分组覆盖全流程：`ingest` · `parse` · `extract` · `kg` · `reason` · `decision` · `temporal` · `provenance` · `ontology` · `embed` · `deduplicate` · `validate` · `export` · `visualize` · `pipeline` · `server` · `explorer` · `mcp` · `doctor` · `shell` · `init` · `watch`。

### 4.7 生态集成

原生插件包覆盖 Claude Code、Cursor、Codex CLI、Windsurf、Cline、Continue、VS Code 和 **OpenClaw**；此外提供完整 MCP Server（任何 MCP 客户端可接）、REST API，以及 Agno 的一等支持用于多 Agent 共享上下文。LLM 侧通过 `semantica.llms` + LiteLLM 打通 OpenAI、Anthropic、Gemini、Mistral、Llama、Groq、Cohere、Azure、Bedrock、Ollama、DeepSeek、HuggingFace。

## 五、常见问题与解决方案

### Q1：`pip install semantica` 成功，但 import 某个模块报 `ModuleNotFoundError`

**原因**：Semantica 核心包刻意做薄，绝大多数后端能力都在 extras 里。

**解决**：对照报错模块装对应 extras。例如用 Neo4j 报错就装 `semantica[graph-neo4j]`，用 Parquet 就装 `semantica[ingest-parquet]`。图省事可以直接 `pip install semantica[all]`，但会拉进大量不需要的依赖。

另有一类特例：**DuckDB、Elasticsearch、Google Drive、HuggingFace、MongoDB、Pandas 这几个 Ingestor 虽然已经随包发布，但尚未从顶层 `semantica.ingest` 命名空间重新导出**，必须直接从子模块导入：

```python
# ❌ 这样会 ImportError
# from semantica.ingest import DuckDBIngestor

# ✅ 正确写法
from semantica.ingest.duckdb_ingestor import DuckDBIngestor
```

### Q2：`add_causal_relationship()` 报参数非法

`relationship_type` 只接受 `CAUSED`、`INFLUENCED`、`PRECEDENT_FOR` 三个枚举值。想表达「A 是 B 的先例」用 `PRECEDENT_FOR`，想表达弱相关用 `INFLUENCED`，不要自造字符串。

### Q3：`RDFExporter().export()` 报 KeyError

见 §4.4。`ContextGraph.to_dict()` 返回 `{"nodes": [...], "edges": [...]}`，而 `RDFExporter` 期望 `{"entities": [...], "relationships": [...]}`。两者字段名也不同（`n["content"]` → `text`，`e["source"]` → `source_id`）。必须手动映射，直接传 `to_dict()` 结果必然报错。

### Q4：`ner.extract_entities_batch()` 找不到方法

批处理入口是 `ner.process_batch([...])`。facade 类上没有 `extract_entities_batch`。

### Q5：`PipelineBuilder` 链式调用报 `AttributeError`

`add_step()` 返回的是新建的 `PipelineStep` 对象，**不是** builder，所以不能链式；而 `connect_steps()` 和 `set_parallelism()` 返回 builder，可以链式。混用会直接报错，写法参见 §2.6。

### Q6：Rete 引擎的匹配结果和预期不符

这是**官方承认的已知局限**：本版本 alpha 节点的条件匹配器实现较简单。建议做法：

1. 先用你的真实规则集和真实事实跑一遍 `match_patterns()`，人工核对；
2. 在合规门禁前加一层业务侧二次校验；
3. 复杂条件优先考虑用 Datalog 或 SPARQL 表达，而不是硬堆 Rete 规则。

### Q7：性能达不到 README 宣称的数字

README 的基准是 AMD EPYC + 64GB RAM、11.8 万节点的生产图，且部分数字来自 CHANGELOG 历史记录而非自动化断言。影响因素包括硬件、数据集拓扑、后端选择（inmemory vs 远程 Qdrant 差异巨大）。想量化自己的环境，跑：

```bash
pytest tests/vector_store/test_performance_benchmarks.py -s
```

### Q8：生产环境怎么部署才对

不要在生产用本地 `pip install`。官方建议：

1. 用 Docker / Kubernetes；
2. 设置 `SEMANTICA_SECRET_KEY`；
3. 配置**持久化** LPG 图存储（Neo4j / FalkorDB / Apache AGE / AWS Neptune）和/或 RDF 三元组库（Blazegraph / Jena / RDF4J）；
4. 向量存储指向托管后端（Qdrant / Pinecone），不要用 `inmemory`；
5. 完整部署拓扑见仓库 `ARCHITECTURE.md`。

### Q9：Python 版本兼容性

`requires-python = ">=3.8"`，分类器标注到 3.12。虽然 3.8 声明兼容，但考虑到部分依赖（尤其是向量库和 Arrow 生态）对新版本更友好，实际建议用 **3.11 或 3.12**。官方 Dockerfile 的 runtime 基础镜像用的是 `python:3.14-slim`。

## 六、总结

Semantica 让我想起一个反复出现的行业规律：**当某类能力从「炫技」走向「生产」，缺的往往不是模型，而是基础设施**。

从 2023 年的「能不能跑通」，到 2024–2025 年的「能不能稳定跑」，再到现在的「能不能对结果负责」，AI Agent 领域正在完成这个转折。Semantica 押注的正是第三个阶段——它不和你的 LLM、向量库、Agent 框架抢位置，而是坐在它们下面，补上**决策记录、因果推理、溯源血缘、本体治理、冲突检测和审计轨迹**这一整层。

**它适合谁：**

- 做**受监管行业**（金融、医疗、法律、政务、国防）AI 落地，必须回答「为什么这么判」的团队；
- 需要把 Databricks / Snowflake 里的表变成**带血缘的治理型知识图谱**，且不愿把数据导给第三方 SaaS 的数据平台团队；
- 在搭 **GraphRAG** 而不满足于向量检索，需要实体感知分块和真正图谱构建的知识工程师；
- 做**多 Agent 编排**，希望所有 Agent 共享同一份带溯源的上下文，而不是各存各的记忆的平台团队。

**它现在还不适合谁：**

- 只是想做个简单文档问答的小项目——这套体系的复杂度和你的收益不成正比；
- 需要开箱即用生产级 Rete 合规门禁的团队——官方已明示当前条件匹配器较简单，需要自行验证加固；
- 抵触 W3C 语义网技术栈（RDF/OWL/SHACL/SPARQL）的团队——这套东西学习曲线确实陡。

即便你暂时不打算整体引入，我也强烈建议单独看两个模块：`semantica.split` 的图感知分块策略，和 `semantica.context` 的决策记录建模。前者可以直接嫁接到你现有的 RAG 提升召回质量，后者则提供了一个「如何把 AI 决策变成可审计资产」的极好参考范式。

MIT 协议、可自托管、零厂商锁定、当前版本 0.6.0 且已标注 Production/Stable。对于一个刚上 Trending 的项目来说，工程完成度相当能打。

**项目地址**：<https://github.com/semantica-agi/semantica>
**官方文档**：<https://docs.getsemantica.ai/>
**PyPI**：<https://pypi.org/project/semantica/>
