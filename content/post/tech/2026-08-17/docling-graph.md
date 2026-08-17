---
title: "Docling Graph：将文档转化为结构化知识图谱的利器"
date: "2026-08-17"
description: "Docling Graph 是 IBM 开源的工具包，可将 PDF、图片等文档通过 LLM 或 VLM 提取为 Pydantic 对象，进而构建带 provenance 的有向知识图谱，支持化学、金融、法律等高精度领域。"
author: "Cheman"
slug: docling-graph
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "知识图谱", "LLM", "Pydantic", "文档处理", "Python"]
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

**开篇引导段**（1-2句，介绍项目背景，不可跳过，不可出现 `#` 标题）：
今天在 GitHub Trending 上看到一个很有意思的项目：**Docling Graph**，这是 IBM 开源的知识图谱构建工具，能够将 PDF、图片等文档通过 LLM 或 VLM 提取为结构化的 Pydantic 对象，并自动构建带溯源信息的有向知识图谱，特别适合化学、金融、法律等需要高精度实体关系的领域。

## 一、项目概述

Docling Graph 是由 IBM 团队开源的文档到知识图谱（Document → Knowledge Graph）转换工具。它的核心思路是：**先用 LLM/VLM 从文档中提取结构化实体和关系（Pydantic 对象），再将这些对象组装为 NetworkX 有向图**，而非依赖传统文本嵌入（text embedding）的近似匹配方式。

这一设计选择非常关键——在化学领域需要精确捕捉"化合物→反应→产物"的链条，在金融领域需要准确关联"公司→财务指标→时间"的关系，在法律领域则要求"条款→定义→引用"的严密逻辑。文本嵌入在这些场景下精度不足，而 Docling Graph 的 Pydantic 模板驱动方式可以做到逐字段验证、类型安全。

### 核心特性

- **多格式输入**：支持 PDF、图片、DocLang、Markdown、Office 文档等 Docling 格式
- **双后端提取**：支持 LLM（通过 LiteLLM 调用 OpenAI/Gemini/vLLM/Ollama 等）和 VLM（Docling 内置）两种提取路径
- **Pydantic 模板驱动**：用 Pydantic 模型定义提取 Schema，天然支持验证和类型提示
- **有向图输出**：提取结果自动构建为 NetworkX 有向图，带节点 ID、边关系和 provenance 元数据
- **多格式导出**：支持 CSV、Cypher（Neo4j）等图数据库友好格式，以及交互式 HTML 可视化
- **模板生成**：无需手写 Pydantic 模型，支持从示例文档或 OWL/RDFS 本体自动推断模板
- **零 LLM 代码生成**：模板生成过程完全确定性，不依赖 LLM 写代码，避免 hallucination

## 二、技术原理

### 2.1 整体架构

Docling Graph 的流水线分为四个阶段：

```
文档输入 → Docling 解析 → LLM/VLM 提取 → Pydantic 验证 → NetworkX 图构建 → 导出
```

**Stage 1 - 文档解析**：Docling 将 PDF、图片等转换为统一的中间表示（Docling Document），包含文本块、布局信息和bounding box几何数据。

**Stage 2 - Chunking & 上下文**：文档被分块（chunking），每块附带页码和位置信息，作为后续 provenance 的基础。

**Stage 3 - LLM 提取**：以 Pydantic 模板为 schema，LLM 从每个 chunk 中提取实体和关系。以下是一个典型的 Pydantic 模板：

```python
from pydantic import BaseModel, Field
from docling_graph.utils import edge

class Person(BaseModel):
    """人物实体，带稳定 ID"""
    model_config = {
        'is_entity': True,
        'graph_id_fields': ['last_name', 'date_of_birth']
    }
    
    first_name: str = Field(description="名")
    last_name: str = Field(description="姓")
    date_of_birth: str = Field(description="出生日期 YYYY-MM-DD")

class Organization(BaseModel):
    """组织实体"""
    model_config = {'is_entity': True}
    
    name: str = Field(description="组织名称")
    employees: list[Person] = edge("EMPLOYS", description="员工列表")
```

注意 `model_config` 中的 `'is_entity': True` 标记该模型为图中的实体节点，`graph_id_fields` 定义节点的稳定标识符，而 `edge()` 包装的关系字段自动生成为图的边。

**Stage 4 - 图构建**：Pydantic 对象被转换为 NetworkX 的 `DiGraph`，每个节点自带 `__provenance__` 属性，记录来源的 chunk 和页码：

```python
from docling_graph import run_pipeline, PipelineContext

config = {
    "source": "https://arxiv.org/pdf/2207.02720",
    "template": ScholarlyRheologyPaper,
    "backend": "llm",
    "inference": "remote",
    "provider_override": "mistral",
    "model_override": "mistral-medium-latest",
    "structured_output": True,
    "use_chunking": True,
}

context: PipelineContext = run_pipeline(config)
graph = context.knowledge_graph

print(f"Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")
# → Graph: 42 nodes, 67 edges
```

### 2.2 LiteLLM 统一推理层

Docling Graph 默认集成 LiteLLM，这意味着**一套代码可以无缝切换推理后端**：

| 后端类型 | 示例提供商 |
|---------|-----------|
| API 远程 | OpenAI, Gemini, Mistral, IBM watsonx |
| 本地推理 | vLLM, Ollama |

只需修改 `provider_override` 和 `model_override` 参数即可切换，无需改动业务逻辑。

### 2.3 Provenance 数据溯源

每个提取出的节点都带有确定性溯源属性，不依赖额外 LLM 调用：

```python
node = graph.nodes["Person/Max_Mustermann/1985-03-15"]
print(node["__provenance__"])
# → Provenance {
#     chunk_id: "chunk_003",
#     page: 2,
#     bbox: BBox(l=100, t=200, r=400, b=300),
#     source: "arxiv_pdf_2207.02720"
#   }
```

这在需要验证 AI 提取结果或做错误溯源的场景下非常有用。

### 2.4 图融合与导出

多个知识图谱可以通过 CLI 合并（完全确定性、无 LLM 调用），合并结果支持多种导出格式：

```bash
# 导出为 CSV
docling-graph export graph.dg --format csv --output ./exports/

# 导出为 Cypher（Neo4j 兼容）
docling-graph export graph.dg --format cypher --output ./exports/

# 交互式 HTML 可视化
docling-graph inspect outputs/
```

## 三、安装与快速开始

### 环境要求

- Python 3.10 ~ 3.13
- 可选 GPU（用于 vLLM 本地推理）

### 安装

```bash
# 核心包（含 LiteLLM）
pip install docling-graph

# VLM 后端支持
pip install "docling-graph[vlm]"

# 模板生成额外依赖（OWL/RDFS 本体解析）
pip install "docling-graph[templategen]"

# Amazon Bedrock 支持
pip install "docling-graph[bedrock]"
```

### 初始化配置

```bash
docling-graph init
# 会在当前目录生成 .env.example，复制为 .env 后填入 API Key
```

### 最简运行示例（CLI）

```bash
docling-graph convert "https://arxiv.org/pdf/2207.02720" \
    --template "docs.examples.templates.rheology_research.ScholarlyRheologyPaper" \
    --processing-mode "many-to-one" \
    --extraction-contract "dense" \
    --debug
```

## 四、使用方法与实战

### 4.1 从头编写 Pydantic 模板

这是最灵活的方式，适合已知数据结构的专业文档：

```python
from docling_graph import run_pipeline
from pydantic import BaseModel, Field
from docling_graph.utils import edge

class ChemicalCompound(BaseModel):
    model_config = {'is_entity': True}
    name: str = Field(description="化合物名称")
    formula: str = Field(description="化学式")

class Reaction(BaseModel):
    model_config = {'is_entity': True}
    name: str = Field(description="反应名称")
    reactants: list[ChemicalCompound] = edge("REACTS_WITH")
    products: list[ChemicalCompound] = edge("PRODUCES")
    temperature: str = Field(description="反应温度")
```

### 4.2 从文档自动推断模板

不想手写模板？可以用 `from-docs` 命令让 LLM 从示例文档中归纳：

```bash
docling-graph template from-docs invoice1.pdf invoice2.pdf \
    --output templates/invoices.py \
    --name InvoiceDocument \
    --trial-run
```

提取结果会写入 `templates/invoices.py`，同时生成一个 `invoices.spec.yaml` 规范文件——修改 YAML 后重新渲染即可，无需改动 Python 代码。

### 4.3 从本体（Ontology）编译模板

已有 OWL/RDFS/SKOS 本体或 LinkML Schema 的话，可以完全不经 LLM 生成模板：

```bash
docling-graph template from-ontology schema.ttl \
    --root ex:InsurancePolicy \
    -o templates/policy.py

# 验证模板质量
docling-graph template lint templates.invoices.InvoiceDocument
```

### 4.4 Dense 提取模式

对于复杂文档（如多表格、多章节的科研论文），推荐使用 `--extraction-contract dense`（骨架→血肉两步提取），显著提升提取质量：

```bash
docling-graph convert paper.pdf \
    --template MyTemplate \
    --extraction-contract dense \
    --processing-mode "many-to-one"
```

## 五、常见问题与解决方案

### Q1: 安装后报 `ImportError: cannot import name 'BaseContext' from 'docling.datamodel.base_context'`

确保 Docling 版本符合要求，Docling Graph 依赖 `docling>=2.105.0`：

```bash
pip install "docling>=2.105.0,<3.0.0" --upgrade
```

### Q2: LLM 提取结果为空或不完整

- 检查 API Key 配置是否正确（`.env` 文件）
- 尝试切换 `provider_override`（例如从 `openai` 切到 `mistral`）
- 对于复杂文档，开启 `--extraction-contract dense` 模式

### Q3: 图融合（merge）结果不符合预期

图融合是完全确定性的，不依赖 LLM。如果结果有问题，检查：
- 待合并图的 schema 是否兼容（模板字段是否一致）
- 使用 `--debug` 查看融合中间步骤

### Q4: vLLM 本地推理显存不足

减少 chunk size 或降低 `max_tokens` 参数。也可以改用 Ollama（对显存要求更低）：

```python
"provider_override": "ollama",
"model_override": "llama3",
```

### Q5: 处理大 PDF（>100页）速度慢

- 启用 `docling-serve` 远程服务分担文档转换开销
- 减少 `--max-chunk-size` 以增加并行度

## 六、总结

Docling Graph 解决了 AI 文档处理领域的一个关键痛点：**如何在不依赖不可靠的文本嵌入情况下，从非结构化文档中提取精确的实体关系**。它的 Pydantic 模板驱动方法将 schema 约束引入提取过程，配合 NetworkX 的图结构输出，为知识图谱构建提供了从文档解析到图存储的完整闭环。

对于需要构建领域知识图谱（RAG、知识库、问答系统）的开发者来说，Docling Graph 是一个值得深入探索的工具——尤其是它支持的模板自动生成和多种导出格式，能够显著降低从零构建知识图谱的门槛。

**项目地址**：https://github.com/docling-project/docling-graph
