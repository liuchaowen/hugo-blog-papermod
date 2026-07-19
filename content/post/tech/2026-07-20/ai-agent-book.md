---
title: "深入理解 AI Agent：设计原理与工程实践 — 开源书+配套代码全解读"
date: "2026-07-20"
description: "GitHub trending 项目 bojieli/ai-agent-book 是一款完全开源的 AI Agent 系统性教程，以「Agent = LLM + 上下文 + 工具」为核心公式，涵盖 10 章内容与完整配套代码，适合想深入掌握 Agent 核心工程能力的开发者。"
author: "Cheman"
slug: ai-agent-book
draft: false
categories: ["技术", "开源", "AI"]
tags: ["AI Agent", "LLM", "GitHub", "开源", "上下文工程", "工具调用", "多Agent"]
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

今天在 GitHub Trending 上看到一个让人眼前一亮的项目：[bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book)，这是一本完全开源的《深入理解 AI Agent：设计原理与工程实践》书籍，作者是李博杰。全书围绕核心公式 **Agent = LLM + 上下文 + 工具** 展开，十章内容覆盖从基础概念到前沿实践的完整学习路径，配套代码可直接运行，中英双语 PDF 也一并开源。

## 一、项目概述

本项目的核心目标是把 AI Agent 的工程实践讲透。与市面上大多数停留在概念层的文章不同，这本书的特点在于：

**理论与工程并重**：每章都配有可直接运行的配套实验代码，覆盖从环境搭建到完整项目的全流程。例如第 1 章通过寻宝游戏对比传统 RL 与 LLM 上下文学习的样本效率，第 2 章实现 KV Cache 友好的上下文设计并量化其对延迟的影响。

**完整的学习体系**：全书分 10 章，层层递进：
- 第 1–2 章打牢基础：Agent 基础概念、上下文工程（提示工程、上下文压缩、系统提示优化）
- 第 3 章构建记忆系统：用户记忆、RAG、向量检索、知识图谱
- 第 4 章深入工具设计：MCP 协议、感知/执行/协作三类工具
- 第 5–6 章聚焦 Coding 与评估：代码生成 Agent、评测框架与指标体系
- 第 7–10 章前沿进阶：模型后训练、自我进化、多模态交互、多 Agent 协作

**完全开源透明**：Apache 2.0 许可证，书籍正文（Markdown 格式）、配图生成脚本、配套代码全部开源，PDF 可直接下载，还提供英文和泰米尔语社区翻译版本。

## 二、核心技术亮点

### 2.1 核心公式：Agent = LLM + 上下文 + 工具

作者提炼出的核心公式简洁而有力：**Agent = LLM + 上下文 + 工具**。三个组件相互依存：
- **LLM** 是推理引擎，负责决策和生成
- **上下文**（Context）是能力的上限，决定了 Agent 能"看到"什么、记住什么
- **工具**（Tools）是 Agent 的双手，让它能够真正影响世界

这个公式的价值在于它把 Agent 系统的设计问题分解为三个可独立优化的维度，却又强调整体协同。

### 2.2 上下文工程：从提示词到 KV Cache

第 2 章的上下文工程是全书最硬核的章节之一，涵盖了：

- **KV Cache 友好设计**：演示不同上下文管理模式如何破坏缓存效率，正确的设计如何显著降低延迟和成本
- **上下文压缩**：摘要、关键信息提取、语义压缩等多种策略的对比实验
- **提示注入攻防**：3 种攻击场景 × 4 种防御配置的对照实验，直观展示逐层叠加防御后注入成功率如何下降
- **Agent Skills 渐进式披露**：Agent 启动时只加载薄目录，按需逐层加载完整 Skill，解决上下文长度限制下的信息密度问题

```python
# Agent Skills 渐进式披露示例（简化）
skill_directory = load("skill_index薄目录.json")  # 只加载索引
identified_skills = agent.identify_required_skills(task)
for skill in identified_skills:
    skill_detail = load(f"skills/{skill}/full_definition.json")  # 按需加载
    agent.integrate_skill(skill_detail)
```

### 2.3 记忆系统：从扁平文本到知识图谱

第 3 章展示了构建 Agent 记忆系统的完整演进路径：

- **基础用户记忆**：长期记住用户偏好，支持跨会话服务
- **向量检索**：稠密嵌入（ANNOY/HNSW）vs 稀疏嵌入（BM25）的对比实现
- **混合检索 + 神经重排序**：融合多种检索策略，通过消融研究展示优势互补
- **结构化索引**：RAPTOR 递归抽象树 vs GraphRAG 知识图谱，对比知识内在层次的组织方式
- **Agentic RAG**：ReAct 循环主导的迭代式检索，复杂司法问答场景下显著优于传统 RAG

```python
# Agentic RAG 迭代检索循环
for step in range(max_steps):
    context = retrieve_context(query, memory)
    response = llm.generate(query, context)
    action = llm.decide_action(response)
    if action == "finish":
        return response
    query = action.execute()  # 继续查询
```

### 2.4 多 Agent 协作：群体智能超越个体

第 10 章探讨多 Agent 系统，从共享上下文到完全不共享上下文的多种协作模式，以及 Agent 社会中涌现的集体行为（斯坦福 AI 小镇）。

## 三、配套代码实战

### 3.1 环境准备

克隆仓库：
```bash
git clone https://github.com/bojieli/ai-agent-book.git
cd ai-agent-book
```

安装依赖（以第 1 章 context 实验为例）：
```bash
cd chapter1/context
pip install -r requirements.txt
export API_KEY="your-siliconflow-or-kimi-api-key"
python main.py
```

大部分项目支持 SiliconFlow Qwen、字节 Doubao、月之暗面 Kimi 等多个 LLM 提供商，可灵活切换。

### 3.2 可独立运行的项目推荐

| 实验 | 章节 | 亮点 |
| --- | --- | --- |
| `chapter1/learning-from-experience` | 第 1 章 | 对比 RL vs LLM 样本效率 |
| `chapter2/prompt-injection` | 第 2 章 | 提示注入攻防对照实验 |
| `chapter3/agentic-rag` | 第 3 章 | 迭代式 RAG 完整实现 |
| `chapter5/coding-agent` | 第 5 章 | 生产级 Coding Agent |
| `chapter9/voice-streaming` | 第 9 章 | 全双工流式语音交互 |

### 3.3 编译电子书（可选）

如果想自己编译 PDF，需要安装 pandoc、xelatex 和 ElegantBook 文档类：
```bash
cd book && bash build_pdf.sh
```

## 四、常见问题

**Q：需要什么样的硬件配置？**
A：大多数实验只需要能运行 Python 的电脑 + LLM API Key（可使用 SiliconFlow 等国内平台）。训练类实验（如第 7 章部分）才需要 GPU。

**Q：所有项目都可以直接运行吗？**
A：标注 ✅ 的项目可独立运行；标注 📖 的为复现指南类，需额外获取外部仓库；标注 🚧 的目前仅有设计文档。

**Q：如何获取外部仓库？**
A：仓库 README 末尾附录提供了完整的克隆命令、GitHub 地址和书中验证过的 commit 版本。

**Q：PDF 下载慢怎么办？**
A：book 目录下的 `build_pdf.sh` 可以从 Markdown 源文件自行编译，或者使用 GitHub Actions 构建的 Release 资源。

## 五、总结

`bojieli/ai-agent-book` 是目前中文互联网上为数不多的、真正从工程视角系统性讲解 AI Agent 的开源教程。它的价值不只是内容本身——配套代码全部可运行、实验设计精心、消融研究有深度，非常适合作为 AI Agent 领域的系统性学习资料。强烈推荐想深入理解 Agent 工程实践的开发者一读。

> 📖 书籍地址：[https://github.com/bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book)
> 📄 许可证：Apache License 2.0
