---
title: "MiroFish：用群体智能引擎预测万物的数字推演实验室"
date: 2026-08-08
description: "MiroFish 是一个简洁通用的群体智能引擎，通过提取现实世界的种子信息（突发新闻、政策草案、金融信号等），自动构建高保真平行数字世界，让数千个具有独立人格、长期记忆和行为逻辑的智能体在其中自由交互与社会化演进，帮你推演未来。"
author: "Cheman"
slug: mirofish
draft: false
categories: ["技术", "AI", "开源"]
tags: ["AI", "群体智能", "多智能体", "模拟推演", "LLM"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MiroFish**，一个简洁通用的群体智能引擎，能够"预测万物"——只需上传种子材料（数据分析报告或有趣的小说故事），用自然语言描述预测需求，就能获得详细的预测报告和一个可深度交互的高保真数字世界。

## 一、项目概述

MiroFish 是由盛趣游戏孵化的下一代 AI 预测引擎，核心技术是多智能体（Multi-Agent）系统。它的核心理念是：**在数字沙盒中彩排未来，在无数次模拟中赢得决策**。

用户只需做两件事：
1. **上传种子材料**：数据分析报告、突发新闻、政策草案，或一本小说的前 80 回
2. **用自然语言描述预测需求**：比如"预测这条政策推出后的舆论走向"

MiroFish 会返回：
- 一份详细的**预测报告**
- 一个可深度交互的**高保真数字世界**，你可以与其中的任意智能体对话

### 核心特性

- **多智能体平行推演**：数千个具有独立人格、长期记忆的智能体同时在数字世界中交互
- **GraphRAG 图谱增强**：自动构建实体关系图谱，为智能体注入背景知识
- **动态时间记忆更新**：随时间推移，智能体的记忆和行为逻辑持续演进
- **零风险决策 rehearsal**：宏观层面是政策制定者的推演实验室，微观层面是个人用户的创意沙盒
- **深度交互**：推演结束后可与任意智能体对话，甚至与 ReportAgent 互动追问细节

## 二、技术原理

### 架构设计

MiroFish 的技术栈非常清晰：**前端 Node.js + 后端 Python**，支持 Docker 一键部署。

```
Graph Building → Environment Setup → Simulation → Report Generation → Deep Interaction
```

**1. Graph Building（图谱构建）**
从种子材料中提取关键实体与关系，构建 GraphRAG 知识图谱，作为所有智能体的共同知识背景。

**2. Environment Setup（环境配置）**
- 实体关系提取
- 人格画像生成（Persona）
- Agent 行为逻辑配置注入

**3. Simulation（平行模拟）**
- 双平台并行模拟（前端 + 后端）
- 自动解析预测需求，动态注入变量
- 实时更新每个智能体的时序记忆

**4. Report Generation（报告生成）**
ReportAgent 配备丰富的工具集，可深度查询推演后的世界状态，生成结构化预测报告。

### 核心技术栈

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | Node.js 18+ + React | 用户交互界面 |
| 后端 | Python ≥3.11, ≤3.12 | 核心推理与模拟引擎 |
| Python 包管理 | **uv** | 快速的 Python 包管理器 |
| LLM | OpenAI SDK 兼容接口 | 推荐阿里云通义 Qwen-plus（Bailian 平台） |
| 长期记忆 | Zep Cloud | 智能体记忆管理 |
| 底层模拟引擎 | OASIS | CAMEL-AI 开源的智能体社交模拟框架 |
| 部署 | Docker Compose | 一键部署前后端服务 |

### 关键源码结构

从项目源码中可以看到，核心模拟逻辑通过 Python 后端实现：

```python
# backend/pyproject.toml 中定义的依赖包含：
# - fastapi（API 层）
# - openai（LLM 调用）
# - zepython（Zep 记忆集成）
# - camel（CAMEL 多智能体框架）
```

前端以 React 构建，服务于交互体验：

```json
// package.json 核心脚本
{
  "dev": "concurrently --kill-others -n \"backend,frontend\" -c \"green,cyan\" \"npm run backend\" \"npm run frontend\"",
  "backend": "cd backend && uv run python run.py",
  "frontend": "cd frontend && npm run dev"
}
```

## 三、安装与快速开始

### 环境要求

| 工具 | 版本要求 |
|------|---------|
| Node.js | 18+ |
| Python | ≥3.11, ≤3.12 |
| uv | Latest |

### 一键安装（推荐）

```bash
# 克隆项目
git clone https://github.com/666ghj/MiroFish.git
cd MiroFish

# 复制环境变量模板
cp .env.example .env
# 编辑 .env，填入 LLM_API_KEY 和 ZEP_API_KEY

# 一键安装所有依赖（Node + Python）
npm run setup:all
```

### 启动服务

```bash
npm run dev
```

启动后访问：
- 前端界面：http://localhost:3000
- 后端 API：http://localhost:5001

### Docker 部署

```bash
# 配置好 .env 后
docker compose up -d
```

## 四、使用方法与实战

### 基础用法

1. 打开前端界面（http://localhost:3000）
2. 上传种子材料（文本或报告）
3. 用自然语言描述你的预测目标
4. 点击开始模拟，等待 ReportAgent 生成报告
5. 阅读预测报告，与感兴趣的角色智能体继续对话

### 进阶用法

- **自定义 Agent 人格**：在配置文件中调整每个 Agent 的行为参数
- **注入动态变量**：在模拟过程中从"上帝视角"实时注入新变量，观察预测轨迹变化
- **深度追问**：与 ReportAgent 对话，针对报告中的任意结论追问细节和证据

### 项目自带演示案例

MiroFish 在 README 中提供了两个精彩的演示视频：

- **武汉大学舆情模拟**：模拟一条突发新闻在网络上的传播与演化
- **红楼梦丢失结局推演**：基于前 80 回数十万字文本，推演林黛玉、薛宝钗等角色的后续命运

## 五、常见问题与解决方案

**Q: npm run setup:all 报错，Python 依赖安装失败？**
确保 Python 版本在 3.11~3.12 范围内，并安装最新版的 `uv`：
```bash
pip install uv
```

**Q: 模拟过程中 LLM API 调用频繁报 429 限流错误？**
推荐使用阿里云 Bailian 平台的 Qwen-plus 模型，并在 `.env` 中配置 API Key；简单场景每月免费额度足够使用。

**Q: Docker 部署后前端 / 后端端口无法访问？**
检查 `.env` 是否在项目根目录下，Docker Compose 默认映射 `3000`（前端）和 `5001`（后端）端口。

**Q: 如何与模拟世界中的特定智能体对话？**
在 ReportAgent 生成报告后，界面会列出所有参与模拟的智能体，点击任意一个即可发起对话。

## 六、总结

MiroFish 是一个极具想象力的开源项目，它将多智能体模拟与 LLM 结合，让"预测未来"从抽象概念变成了可操作的数字推演工具。无论是政策推演、舆情预测还是文学推续，MiroFish 都展现了群体智能在复杂系统建模上的独特优势。盛趣游戏的技术孵化背景加上 CAMEL-AI 的开源底座，让这个项目在技术深度和工程成熟度上都值得信赖。

如果你对 AI 模拟、多智能体系统或 LLM 应用感兴趣，MiroFish 是一个值得深入研究的优质项目。

> 🔗 GitHub: https://github.com/666ghj/MiroFish  
> 🐳 Docker: https://hub.docker.com/（构建中）
