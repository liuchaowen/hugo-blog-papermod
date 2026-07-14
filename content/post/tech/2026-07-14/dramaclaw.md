---
title: "DramaClaw：一个开源的工业化短剧生产流水线"
date: "2026-07-14"
description: "DramaClaw 是一款 source-available 的工业化短剧生产工具，支持从小说稿件解析、角色资产管理、分镜生成、配音合成到最终成片导出的全链路自动化。本文深入解析其架构设计与核心技术实现。"
author: "Cheman"
slug: dramaclaw
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI视频", "短剧", "生成式AI"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**DramaClaw**，一个将小说自动转化为短剧视频的工业化生产流水线，支持源码部署，用 Docker 即可一键启动。

## 一、项目概述

DramaClaw 是一款 source-available 的工业化短剧制作工具，核心理念是"把 Big Tech 才有的工业化产能，交到普通创作者手中"。它将短剧生产从稿件输入到最终成片的整个链路模块化，支持 Docker 一键部署，无需 GPU，即可在普通笔记本或 VPS 上运行。

**核心能力包括：**

- **小说解析与故事图谱**：将小说稿件解析为可查询的角色关系图谱和事件时间线
- **资产库管理**：统一管理角色、场景、道具和声音资产，确保跨集身份一致性
- **分集规划与节奏控制**：自动章节分段、节奏规划、多集弧线设计
- **剧本生成**：支持自适应、直译、舞台三种模式，带审核/修复循环
- **分镜与首帧图生成**：beat 驱动的风格化图像生成、网格拆分、图池选优
- **配音合成**：情感感知语音合成，支持多音色切换
- **视频合成与导出**：组装分集、导出视频 + 字幕文件及完整资产包
- **无限画布（Freezone）**：节点化可视化工作台，拖入资产生成图片/视频/音频，满意结果可回推主流水线
- **导演世界（Director World / 3GS）**：可取景的虚拟影棚，锁定空间结构、角色走位和摄像机放置，保证同一场景跨镜头一致性
- **Xia Director 智能体**：对话式导演助理，检查项目进度、推进任务、审计交付完整性
- **视觉风格模板**：上传参考图自动提取风格参数，应用到整个项目
- **任务中心**：后台生成任务的状态、进度、日志和取消/重试

## 二、技术原理

### 2.1 整体架构

DramaClaw 采用松耦合模块化设计，每个阶段都是独立的异步任务，有独立的界面。流水线支持顺序执行、跳过中间步骤、中途恢复，也支持接入自己的 orchestrator。

整体流程如下：

```
Ingest（输入）→ Plan（规划）→ Produce（生产）→ Deliver（交付）
```

各阶段之间通过文件系统（SQLite + 文件）存储状态，无须 Postgres、Redis、Celery 或 Ray，任务以内联进程方式运行，极大降低了部署复杂度。

### 2.2 核心模块

**Story Graph（故事图谱）**：基于 Cognee 将小说解析为结构化图谱，包含角色、关系、事件时间线，支持多集之间的角色一致性追踪。

**Freezone 无限画布**：节点化视觉工作台，主流水水线和画布探索以双轨方式并行运行。画布支持拖入资产直接生成候选内容，满意结果可 promoted 回主流水线。

**Director World（3GS）**：帧级可取景虚拟影棚技术，通过锁定空间结构、角色 blocking 和摄像机 placement，确保同一场景跨 shot 的一致性，原理类似 3D Gaussian Splatting 的场景表示，但做了影视制作层面的封装。

**Xia Director Agent**：基于 pydantic-ai 构建的 AI 导演智能体，通过对话式交互推进脚本/分镜任务，审计交付完整性，提供下一步建议。

### 2.3 技术栈

从 `pyproject.toml` 可以看到关键依赖：

```python
dependencies = [
    "pydantic-ai-slim[anthropic,google,openai,openrouter]==1.107.0",
    "openai>=2.0",
    "pydantic>=2.0",
    "fastapi>=0.128.0",
    "cognee==1.0.5",
    "litellm>=1.85.0.dev1",
    "edge-tts>=6.0.0",
    "dashscope>=1.0.0",
    "Pillow>=10.0.0",
    "python-docx>=1.1.0",
]
```

- **LLM 层**：通过 litellm 连接 OpenAI 兼容网关，支持 DramaClaw 官方 relay claw 或自建 BYO 网关，模型无关
- **图像生成**：gpt-image · nano-banana
- **视频生成**：Seedance 1.0/1.5/2.0 系列 · happyhorse
- **配音**：IndexTTS2 · Edge-TTS
- **故事图谱**：Cognee
- **后端 API**：FastAPI
- **任务运行**：in-process inline（无 Ray/Redis/Celery）

### 2.4 模型无关设计

DramaClaw 的一大亮点是**彻底解耦模型层**：所有文本/图像/视频/语音模型均通过统一的 OpenAI-compatible 网关接入，不绑定任何单一供应商。官方提供了 `relayclaw.cdnfg.com` 网关，用户也可以自建 BYO 端点。

Docker 部署后只需在 Settings → Model Config 填入 DC Key，即可开箱即用，无须手动映射模型名。

## 三、安装与快速开始

### 3.1 环境要求

| 项目 | 要求 |
|------|------|
| CPU/RAM | ≥ 2 vCPU / 4 GB（不含模型推理） |
| GPU | 标准流水线不需要；仅 world 额外特性（3GS）需要 GPU + CUDA |
| 磁盘 | 几 GB 存放图片和生成的媒体/状态 |
| 操作系统 | macOS（Apple Silicon/Intel）、Windows（Docker Desktop + WSL2）、Linux |
| Docker | Docker + `docker compose` |
| 端口 | 8080（Web UI）、8780（REST API）、3000（自托管模式捆绑网关） |

### 3.2 Docker 一键启动（推荐）

```bash
git clone https://github.com/dramaclaw/dramaclaw.git
cd dramaclaw

cp .env.example .env
# 编辑 .env，设置 PROMPT_EXPORT_PASSWORD

docker compose up -d --build
```

或者一行启动（利用 GitHub Release 的多架构镜像）：

```bash
curl -LO https://raw.githubusercontent.com/dramaclaw/dramaclaw/main/docker-compose.release.yml
docker compose -f docker-compose.release.yml up -d
```

启动后访问 <http://localhost:8080>，在 **Settings → Model Config → Official** 填入 DC Key 即可。

### 3.3 本地开发模式（uv + Python）

```bash
git clone https://github.com/dramaclaw/dramaclaw.git
cd dramaclaw

uv sync
cp .env.example .env && $EDITOR .env

uv run novelvideo api --port 8780
```

## 四、核心功能实战

### 4.1 短剧制作完整流程

1. **导入小说稿件** → DramaClaw 自动解析为角色图谱和事件时间线
2. **规划分集** → 系统自动分段、规划节奏，支持多集弧线
3. **生成剧本** → 支持多种模式，可逐集审核/修复
4. **生成角色资产** → 统一生成角色肖像和分集变体，存入资产库
5. **生成分镜和首帧图** → beat 驱动的风格化图像生成
6. **配音合成** → 情感感知语音，支持多音色
7. **视频合成导出** → 组装分集，导出视频 + SRT 字幕

### 4.2 Freezone 无限画布

在画布中拖入角色资产，可直接生成候选图片/视频，满意的结果一键回推主流水线，实现主流程与探索双轨并行。

### 4.3 导演世界（Director World）

为每场戏建立可取景的 3D 空间锁定，确保同一场景的多个 shot 之间空间一致性，无需人工反复对齐。

## 五、与其他平台的对比

DramaClaw 的独特优势在于**源码开放 + 全链路覆盖**：

| 能力 | DramaClaw | 竞品 |
|------|:---------:|------|
| 分镜预览（脚本→分镜） | ✅ | ◐~✅ |
| 交互式系列（多集/分支/IP） | ✅ | ◐~✅ |
| 资产库（角色/场景/道具/声音） | ✅ | ❌~◐ |
| 场景一致性（变体/360°/多态） | ✅ | ❌ |
| 导演世界（3D 影棚/取景/摄像机） | ✅ | ❌ |
| 最终交付（多shot/字幕/资产包） | ✅ | ✅~○ |
| 团队协作（共享/角色/任务/成本） | ✅ | ◐~✅ |
| 无限画布（节点化探索） | ✅ | ✅ |
| **双轨并行（主流程+画布探索）** | ✅ | ❌ |
| 源码可用（自托管/分支/定制） | ✅ | ❌ |

> 竞品包括 L\*TV、R\*Hub、T\*Now、S\*ko 等主流平台，DramaClaw 是目前**唯一**同时具备源码可用和双轨并行能力的工业化短剧制作工具。

## 六、总结

DramaClaw 是一个令人眼前一亮的开源项目，它把 AI 视频生成从"单点能力"升级为"工业化流水线"，让独立创作者也能拥有接近 Big Tech 的内容产能。源码开放、模型无关、Docker 一键部署，是今年值得关注的 AI 开源项目之一。

项目采用 **Elastic License 2.0**，可自由使用、修改和再分发，唯一限制是不能将软件作为托管服务转售。

GitHub：<https://github.com/dramaclaw/dramaclaw>  
官网：<https://dramaclaw.ai>
