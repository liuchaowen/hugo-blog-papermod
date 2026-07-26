---
title: "BrainPilot：一个用 Agent 自动化脑科学研究的开源平台"
date: 2026-07-26
description: "BrainPilot 是 NeuroAIHub 开源的多智能体脑科学研究平台，基于 PI Agent 协调 Librarian、Experimentalist、Engineer、Writer、Auditor 等专业智能体，通过 Graph of Trace 可视化全流程，支持文献综述、实验设计、数据分析、报告撰写和科学审计。"
author: "Cheman"
slug: brainpilot
draft: false
categories: ["技术", "AI", "神经科学"]
tags: ["AI", "Agent", "脑科学", "神经科学", "开源", "多智能体"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**BrainPilot**，一个开源的多智能体脑科学研究平台，让 AI Agent 真正介入科学工作流——从文献综述、实验设计、数据分析到报告撰写和科学审计，全程可控、可回溯。

## 一、项目概述

BrainPilot 由 NeuroAIHub 团队开发，是一款"人在回路"（Human-in-the-Loop）的 Agentic 脑科学研究系统。它的核心思路是：一位 PI Agent（首席研究员智能体）作为协调者，与多类专业智能体协作，共同完成一个完整的科研周期。

**核心智能体角色：**

| 智能体 | 职能 |
|--------|------|
| PI Agent | 理解用户问题、规划任务、协调各专业智能体 |
| Librarian | 文献检索、论文查找、知识点抽取 |
| Experimentalist | 实验设计、数据处理、统计分析 |
| Engineer | 代码执行、环境配置、计算资源管理 |
| Writer | 报告撰写、图表生成、论文润色 |
| Auditor | 质疑证据链、检查引用、识别幻觉风险 |

项目在 WAIC 2026 "Intelligence in the Physical World" 论坛上演示，配套论文已发表于 arXiv（arXiv:2607.15079），并在 ACL 2026 发表了 Graph of Trace 可视化技术（ACL-Demo 2026）。

**研究案例（真实数据验证）：**
- **RSC 空间编码**：双光子钙成像分析，贝叶斯解码 MAE = 16.8 cm
- **小鼠视觉层级**：58 个 Allen Neuropixels sessions，功能指标与解剖层级正相关
- **fMRI 疼痛连接组**：279 脑区签名，AUC = 0.793（疼痛预测）
- **EEG 运动想象解码**：BCI Competition IV 2a 数据集，7/9 被试超越 EEGNet

## 二、技术原理

### 2.1 系统架构

BrainPilot 是一个 TypeScript/Node.js monorepo，包含 8 个包：

```
@brainpilot/protocol   — zod 定义的 AG-UI 事件和领域类型
@brainpilot/runtime    — Pi SDK 编排、Session 管理、MCP 桥接
@brainpilot/backend-core — Hono REST + SSE 服务
@brainpilot/web       — React/Vite SPA（AG-UI 消费者）
@brainpilot/app        — brainpilot / bnpt 本地启动 CLI
@brainpilot/skills     — 内置技能库（72 个领域技能）
@brainpilot/client-cli — 头端验证客户端
@brainpilot/docs       — 公共文档站
```

运行时基于 Pi SDK，通过 Hono 提供 REST 和 SSE 接口，前端为 React SPA。

### 2.2 Graph of Trace（GoT）

BrainPilot 的核心创新之一是 Graph of Trace——将每个科研会话表示为一张可检视的有向图，节点代表任务结构、Agent 动作、证据和决策点，边代表它们之间的流向。这一机制在 ACL 2026 Demo 中发表。

### 2.3 内置技能库（Skills）

BrainPilot 内置了 72 个经过验证的领域技能，分布在 21 个类别中：

- 认知心理学、神经影像学（fMRI、EEG）
- 计算神经科学、细胞分子神经科学
- 文献数据库（PubMed、arXiv、Europe PMC、OpenAlex）
- 临床神经心理学、发展认知等

技能通过 Pi 原生技能管道加载，无需额外配置——Agent 在需要时按需读取 `SKILL.md`，实现渐进式信息披露（Progressive Disclosure）。

### 2.4 本地知识库管道

支持本地构建 RAG 知识库：
```bash
# 放入 PDF → 构建向量数据库
python KnowledgeBase/scripts/build_kb.py
```
使用 bge-m3 嵌入 + bge-reranker-v2-m3 重排序，模型全在本地运行，隐私安全。

## 三、安装与快速开始

### 环境要求
- **Node.js ≥ 22**
- 模型 API Key（或使用 `BP_MOCK=1` 模拟模式）

### 一键安装启动
```bash
npm install -g @brainpilot/app
brainpilot up
```
启动后打开终端打印的本地 URL 即可使用。CLI 简写为 `bnpt`。

### Mock 模式（无 API Key 测试）
```bash
BP_MOCK=1 brainpilot up
```

### 命令行初始化
```bash
brainpilot init --api-key <key> --base-url https://your-gateway.example.com/api --model your_model_name
```

### Docker 部署
```bash
git clone https://github.com/NeuroAIHub/BrainPilot.git
cd BrainPilot
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY
docker compose up -d --build
```
访问 http://localhost:9001 即可。

### 从源码构建
```bash
git clone https://github.com/NeuroAIHub/BrainPilot.git
cd BrainPilot
npm install
npm run build
npm run bp -- up
```

## 四、使用方法与实战

### 4.1 MCP 工具集成

BrainPilot 支持通过 MCP（Model Context Protocol）接入外部工具。在 `Settings → MCP` 中配置后，工具以 `mcp__<server>__<tool>` 命名空间暴露给 Agent。

```json
// mcp_servers.json 示例
{
  "mcpServers": {
    "fs": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    },
    "tavily": {
      "type": "http",
      "url": "https://your-tavily-endpoint.com/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

### 4.2 构建本地知识库

将领域论文 PDF 放入 `KnowledgeBase/source/pdf/`，然后在 UI 中点击 **Settings → Knowledge Base → Build Knowledge Base**，Agent 即获得 `get_domain_knowledge_local` 和 `search_papers_local` 两个工具。

### 4.3 典型研究工作流示例

用户（研究者）提出问题：
> "帮我分析 RSC 空间编码相关的最新文献，并设计一个双光子钙成像的实验方案"

BrainPilot 自动完成：
1. **Librarian** 检索 arXiv/PubMed → 抽取核心发现
2. **PI Agent** 整合信息 → 制定研究计划
3. **Experimentalist** 设计实验参数（视野大小、光学切片参数等）
4. **Auditor** 检查假设链是否成立、引用是否充分
5. 整个过程记录到 Graph of Trace，可检视每一步决策依据

### 4.4 AI Agent 部署 BrainPilot

如果你使用 Claude Code 或 OpenAI Codex，可以让 AI Agent 直接帮你安装：
```text
Globally install the @brainpilot/app npm package, then run brainpilot up and give me the URL to open.
```

README 甚至提到 OpenClaw 也可以直接驱动 BrainPilot。

## 五、常见问题与解决方案

**Q: `npm install -g` 报错，权限不足？**
```bash
sudo npm install -g @brainpilot/app
# 或使用 npx 绕过全局安装
npx -y @brainpilot/app up
```

**Q: Docker 模式下 Agent 无响应？**
检查 `.env` 中 `ANTHROPIC_API_KEY` 是否正确配置，或尝试 `BP_MOCK=1` 先验证基础功能。

**Q: MCP 工具连接失败？**
确认 `mcp_servers.json` 语法正确，HTTP 端点需支持 CORS，且在 `Settings → MCP` 中已启用对应服务器。

**Q: 技能库内容有误差？**
README 明确说明部分技能由 AI 从文献或代码库中提取，使用前需验证参数和引用准确性。

**Q: 内存不足？**
Docker 模式下可通过 `BP_MEM_LIMIT_MB` 设置容器内存上限，建议不低于 2 GB。

## 六、总结

BrainPilot 代表了 AI Agent 在科学研究领域的一个务实方向——不是取代研究者，而是用专业智能体分担文献检索、实验设计、数据分析等证据密集型任务，让研究者专注于创造性判断和核心科学问题。其 Graph of Trace 机制让整个过程透明可审计，内置的 72 个领域技能库覆盖了从细胞到认知的完整神经科学方法论。如果你做脑科学研究或认知神经科学相关的工作，BrainPilot 值得关注。
