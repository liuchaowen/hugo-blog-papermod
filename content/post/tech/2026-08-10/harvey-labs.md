---
title: "Harvey LAB: 首个AI法律智能体评测基准，1671个真实任务覆盖24个法律领域"
date: 2026-08-10
description: "Harvey LAB 是 Harvey AI 开源的法律智能体评测基准项目，提供1671个真实法律任务，覆盖24个法律实践领域和合同起草场景，采用MIT协议开源，旨在衡量大模型在现实法律工作中的实际能力。"
author: "Cheman"
slug: harvey-labs
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI", "法律科技", "LLM评测", "大模型"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Harvey LAB**，它是 Harvey AI 开源的首个法律智能体评测基准，提供1671个真实法律任务，覆盖24个法律领域和合同起草场景，MIT协议开源，旨在衡量大模型在现实法律工作中的实际能力。

## 一、项目概述

Harvey LAB（Legal Agent Benchmark）是一个开源项目，旨在对大语言模型（LLM）智能体在真实法律环境中的工作能力进行标准化评测。与传统基准测试不同，LAB 聚焦于实际法律工作场景，而非抽象的推理能力。

LAB 包含两个核心部分：

- **任务数据集（Tasks）**：包含智能体指令、相关文档和评分标准，每个任务都模拟真实法律场景
- **执行框架（Harness）**：用于运行智能体并评估其表现的完整工具链

LAB 持续迭代，不断扩充任务集和完善执行框架，目前已覆盖24个法律实践领域，任务总数达1671个。

## 二、技术原理与架构

### 核心架构

LAB 的架构分为以下几个层次：

**任务模型（Task Model）**：每个任务定义了一个具体的法律工作场景，包括输入文档、智能体指令和评分标准。任务以结构化格式存储，便于扩展。

**执行框架（Harness）**：负责加载任务、调用智能体API、收集执行结果，并调用评分器进行评估。框架内置了对主流模型提供商的适配器，包括：

```python
# pyproject.toml 中的依赖配置
dependencies = [
    "anthropic>=0.40.0",   # Claude 模型
    "openai>=1.50.0",      # GPT 系列
    "google-genai>=1.0.0", # Gemini 模型
    "mistralai>=2.0.0",    # Mistral 模型
]
```

**工具适配层（Adapters）**：框架抽象了不同模型提供商的API接口，支持统一调用。同时集成了文档处理工具：

```python
dependencies = [
    # 文档提取（read tool）
    "pdfplumber>=0.10.0",   # PDF 解析
    "openpyxl>=3.1.0",      # Excel 文档处理
    "markitdown>=0.1.0",    # 通用文档转换
    # 文档生成
    "python-docx>=1.1.0",   # Word 文档生成
    "python-pptx>=0.6.23",  # PPT 生成
]
```

**评分策略（Scoring Strategies）**：LAB 采用"All-Pass Rubric"评分策略，由 LLM 作为评判者，根据预定义的评分标准对智能体的输出进行多维度打分。

### 评测方法

项目文档中详细描述了其评测方法论（`docs/eval-strategies.md`），核心思路是：

1. **任务分解**：将复杂法律工作分解为可独立评测的子任务
2. **标准制定**：为每个任务编写详细的评分标准（Rubric）
3. **自动评分**：使用 LLM Judge 自动评估智能体输出，减少人工标注成本
4. **报告生成**：自动生成评测报告，支持不同模型之间的横向对比

## 三、安装与快速开始

### 环境要求

- Python >= 3.12, < 3.14
- pandoc CLI（用于文档格式转换）

```bash
# 安装 pandoc
brew install pandoc   # macOS
# 或
apt-get install pandoc  # Ubuntu/Debian
```

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/harveyai/harvey-labs.git
cd harvey-labs

# 安装依赖（推荐使用 uv 或 pipx）
pip install uv
uv sync
```

### 快速开始示例

项目提供了完整的教程（`docs/tutorial.md`），以一个 M&A 数据室任务为例，演示端到端流程：

1. **环境设置**：配置模型 API 密钥和工具权限
2. **任务检查**：查看任务文档和评分标准
3. **运行智能体**：执行任务并收集结果
4. **评分与报告**：查看评分报告和对比仪表盘

```python
# 典型的任务执行流程
from harvey_labs import Task, Harness, Scorer

# 加载任务
task = Task.from_file("tasks/mna_data_room/task.yaml")

# 初始化框架
harness = Harness(provider="anthropic", model="claude-sonnet-4-20250514")

# 运行评测
result = harness.run(task)

# 评分
score = Scorer.evaluate(result)
print(f"最终得分: {score.summary()}")
```

## 四、使用方法与实战

### 基础用法

LAB 提供了两种主要使用方式：

**方式一：Python API**

```python
from harvey_labs import ModelAdapter

# 选择模型提供商
adapter = ModelAdapter(provider="openai", model="gpt-4o")

# 初始化 Harness
harness = Harness(adapter=adapter)

# 运行单个任务
result = harness.run_task("tasks/contract_review/task.yaml")
```

**方式二：命令行工具**

```bash
# 运行完整评测套件
harvey-lab run --provider anthropic --model claude-sonnet-4-20250514

# 运行特定任务
harvey-lab run --task tasks/mna_data_room/task.yaml

# 生成对比报告
harvey-lab compare --models gpt-4o claude-sonnet-4-20250514
```

### 进阶用法

**自定义任务**：在 `tasks/` 目录下创建新的任务文件夹，编写 `task.yaml` 即可定义新任务：

```yaml
# tasks/my_custom_task/task.yaml
name: my_custom_task
description: "自定义法律任务描述"
documents:
  - input.pdf
  - contract.docx
rubric: |
  ## 评分标准
  1. 准确性 (40%)
  2. 完整性 (30%)
  3. 专业性 (30%)
```

**模型适配器开发**：如需支持新的模型提供商，实现 `ModelAdapter` 接口即可：

```python
from harvey_labs import ModelAdapter

class MyCustomAdapter(ModelAdapter):
    def generate(self, prompt: str) -> str:
        # 实现自定义模型调用逻辑
        pass
```

## 五、常见问题与解决方案

**Q: 安装时报 `ModuleNotFoundError: No module named 'pandoc'`？**
A: 这是因为 pandoc 未安装。macOS 用户执行 `brew install pandoc`，Ubuntu/Debian 用户执行 `sudo apt-get install pandoc`。

**Q: 文档解析失败，报 `pdfplumber` 相关错误？**
A: 确保 PDF 文件可读，部分扫描版 PDF 需要先进行 OCR 处理。LAB 的 `pdfplumber` 依赖要求 Python 3.12+。

**Q: API 调用超限或报认证错误？**
A: 检查环境变量中的 API 密钥是否正确配置。不同模型提供商的密钥格式和认证方式不同，参考官方文档。

**Q: 评分结果与预期不符？**
A: LAB 的 LLM Judge 评分依赖模型能力，不同模型作为 Judge 时结果可能存在差异。建议使用同一 Judge 模型进行横向对比。

## 六、总结

Harvey LAB 为 AI 法律智能体的评测提供了标准化、可复现的基准测试框架，具有以下亮点：

- **真实场景**：1671个任务覆盖24个法律领域，模拟真实法律工作
- **开源透明**：MIT协议开源，评分标准和任务定义完全公开
- **多模型支持**：内置对 Claude、GPT、Gemini、Mistral 等主流模型的支持
- **自动化流程**：从任务执行到评分报告全流程自动化

如果你对 AI 在法律领域的应用感兴趣，或正在开发法律智能体产品，Harvey LAB 是值得关注的基准工具。

> 项目地址：[https://github.com/harveyai/harvey-labs](https://github.com/harveyai/harvey-labs)
> 官方博客：[Introducing Harvey's Legal Agent Benchmark](https://www.harvey.ai/blog/introducing-harveys-legal-agent-benchmark)
