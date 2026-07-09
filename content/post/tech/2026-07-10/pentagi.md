---
title: "PentAGI：用 AI Agent 打造全自动渗透测试平台"
date: "2026-07-10"
description: "PentAGI 是一款基于大语言模型的自主渗透测试平台，通过 AI Agent 协调 20+ 专业安全工具，在 Docker 沙盒中自动完成信息收集、漏洞发现到报告生成的完整渗透测试流程。"
author: "Cheman"
slug: pentagi
draft: false
categories: ["安全", "AI", "开源"]
tags: ["渗透测试", "AI Agent", "安全工具", "大语言模型", "Docker"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**PentAGI**，一个将 AI Agent 能力与专业渗透测试工具链深度融合的全自动安全测试平台——它不是简单地调用几个命令行工具，而是真正用 LLM 来规划、协调和执行渗透测试全流程。

## 一、项目概述

PentAGI 全称 **Penetration testing Artificial General Intelligence**，定位是 AI 驱动的自主渗透测试系统。与传统的自动化扫描工具（如 Nessus、AWVS）不同，PentAGI 的核心是一个 LLM-powered Agent，它能够理解测试目标、自动拆解渗透步骤，并调用专业工具执行，最后生成详细漏洞报告。

核心特性包括：

- **AI Agent 驱动**：由大语言模型规划渗透路径，支持任务监控和智能规划
- **20+ 专业安全工具集成**：内置 nmap、metasploit、sqlmap、dirb 等主流工具
- **沙盒隔离**：所有操作在 Docker 环境中完全隔离，安全可控
- **多 LLM 提供者支持**：OpenAI、Anthropic、Google Gemini、Ollama、DeepSeek、Qwen、Kimi 等十余种模型
- **知识图谱集成**：基于 Graphiti + Neo4j 的语义关系追踪，积累每次测试的上下文
- **持久化存储**：PostgreSQL + pgvector 存储命令历史和向量嵌入
- **详细报告生成**：支持 Web、Markdown、PDF 格式的漏洞报告输出

## 二、技术架构

### 整体架构

PentAGI 采用微服务架构，通过 Docker Compose 一键部署。核心组件包括：

```
PentAGI System
├── AI Agent（LLM 驱动，负责任务规划与工具调度）
├── Docker Agent（根据任务类型自动选择/构建沙盒镜像）
├── LLM Provider（支持 10+ 主流模型 + OpenRouter 等聚合器）
├── Search Systems（Tavily、Perplexity、DuckDuckGo、Sploitus 等）
├── Knowledge Graph（Neo4j + Graphiti，存储渗透测试语义关系）
├── Monitoring（Langfuse 观测 LLM 调用，Grafana/Prometheus 监控系统）
└── Persistence（PostgreSQL + pgvector，向量存储 + 关系数据）
```

### Agent 监督机制

PentAGI 提供了高级的 Agent 监督（Agent Supervision）功能，这是区别于普通 AI 助手的重要特性：

```python
# 伪代码：Agent 监督逻辑
class AgentSupervisor:
    def __init__(self, agent, monitor_config):
        self.agent = agent
        self.monitor = ExecutionMonitor(monitor_config)
        self.task_planner = IntelligentTaskPlanner()

    def execute_task(self, objective):
        # 1. 将目标拆解为子任务
        sub_tasks = self.task_planner.decompose(objective)

        # 2. 逐个执行并监控
        for task in sub_tasks:
            result = self.agent.execute(task)
            if not self.monitor.is_safe(result):
                self.agent.halt()
                yield "任务被监督机制中断"
            yield result
```

这意味着即使 Agent 规划出错误的攻击路径，监督层也能及时干预，避免对目标系统造成不必要的破坏。

### 工具调用机制

PentAGI 内置 `ftester`（Function Tester）模块用于测试 LLM 工具调用的准确性：

```bash
# 测试 LLM Agent 的函数调用能力
python3 ftester.py --suite security_tests

# 验证 LLM 对渗透测试工具描述的理解
python3 ftester.py --validate-tool-descriptions
```

## 三、快速开始

### 环境要求

- Docker & Docker Compose
- 至少 4GB RAM（推荐 8GB+）
- 10GB+ 可用磁盘空间
- 至少一个 LLM Provider（本地 Ollama 或云端 API Key）

### 一键部署

```bash
# 克隆仓库
git clone https://github.com/vxcontrol/pentagi.git
cd pentagi

# 启动（首次会自动拉取镜像，约 5-10 分钟）
docker compose up -d

# 访问 Web UI
open http://localhost:8080
```

### 配置 LLM 提供者

PentAGI 支持非常灵活的 LLM 配置方式。以本地 Ollama 为例：

```yaml
# config/llm.yaml
provider: ollama
model: qwen2.5-coder:14b
base_url: http://localhost:11434
```

云端 API 配置（以 OpenAI 为例）：

```yaml
provider: openai
model: gpt-4o
api_key: ${OPENAI_API_KEY}
```

### 发起第一次渗透测试

1. 登录 Web UI，输入目标地址（如 `http://testphp.vulnweb.com`）
2. 选择测试范围和深度级别
3. 点击 "Start Pentest"，Agent 自动开始工作
4. 在 Dashboard 实时观察渗透进展
5. 测试完成后下载报告

## 四、使用方法与实战

### 基础用法

PentAGI 的核心使用场景是针对一个未知目标进行黑盒渗透测试。典型流程：

```bash
# 通过 API 发起测试
curl -X POST http://localhost:8080/api/v1/pentest \
  -H "Authorization: Bearer <token>" \
  -d '{
    "target": "https://example.com",
    "scope": "full",
    "monitor_execution": true
  }'
```

### 知识图谱的妙用

PentAGI 最有价值的设计之一是知识图谱。它会在每次渗透测试中：

- 记录每个发现的关系（IP → 子域名 → 服务 → 漏洞）
- 将渗透成果持久化，供后续测试参考
- 支持语义查询："列出所有 SQL 注入漏洞的利用路径"

```cypher
// 查询所有与 SQL 注入相关的节点和关系
MATCH (v:Vulnerability)-[r]-(n)
WHERE v.type CONTAINS 'sql_injection'
RETURN v, r, n
```

### 与专业工具的集成

PentAGI 并不是从零实现所有安全工具，而是聪明地做了工具编排：

| 阶段 | 调用的专业工具 |
|------|---------------|
| 信息收集 | nmap, amass, subfinder |
| Web 扫描 | sqlmap, dirb, nikto |
| 漏洞利用 | metasploit, hydra |
| 报告生成 | 自研 Markdown/PDF 渲染器 |

## 五、常见问题

**Q: Docker 镜像拉取失败怎么办？**

PentAGI 依赖多个镜像（PostgreSQL、Neo4j、各种工具镜像），建议配置国内 Docker 镜像加速：

```json
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
```

**Q: 使用本地模型（如 Ollama）效果如何？**

PentAGI 官方推荐使用 GPT-4o 或 Claude-3.5 等强模型。如果用 Ollama，建议选择 Qwen2.5-Coder-14B 及以上规模。弱模型可能出现规划错误，需要开启执行监控（`monitor_execution: true`）。

**Q: 如何查看 LLM 调用日志？**

PentAGI 集成了 Langfuse，访问 `http://localhost:3000`（默认）可查看每次 LLM 调用的输入输出、Token 消耗和延迟。

**Q: 报告能导出哪些格式？**

当前支持 Web 在线浏览、复制到剪贴板、Markdown 下载和 PDF 下载。JSON 格式的报告导出不在当前支持范围内（项目文档已明确说明）。

## 六、总结

PentAGI 代表了 AI + 安全测试深度融合的趋势——它不是要取代安全工程师，而是将渗透测试中重复性最高的信息收集和工具调度工作交给 AI Agent，让安全研究员专注于漏洞分析和利用策略的设计。如果你对 AI Agent 在安全领域的应用感兴趣，或者需要一个可扩展的自动化渗透测试平台，PentAGI 值得一试。

GitHub 地址：[https://github.com/vxcontrol/pentagi](https://github.com/vxcontrol/pentagi)
