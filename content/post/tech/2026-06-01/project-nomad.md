---
title: "Project N.O.M.A.D.：离线的本地知识中心，一个 Docker 搞定一切"
date: 2026-06-01
description: "Project N.O.M.A.D. 是一款开源离线知识与教育服务器，基于 Docker 封装 Ollama AI 助手、Kiwix 离线百科、Kolibri 学习平台、ProtoMaps 离线地图等工具，一条命令完成部署，离线可用、零遥测，适合偏远地区、教育机构或隐私敏感场景。"
author: "Cheman"
slug: project-nomad
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, Docker, AI, 离线工具, 知识管理]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Project N.O.M.A.D.**（Node for Offline Media, Archives, and Data），一个自称「永不断线的知识服务器」的开源项目。它通过 Docker 把离线百科、AI 对话、教育平台、离线地图等工具打包在一起，部署完即可离线使用，非常适合没有稳定网络的环境。

## 一、项目概述

Project N.O.M.A.D. 定位为**离线优先的本地知识中心**，核心目标是让用户在断网环境下依然能访问 AI 助手、搜索 Wikipedia、下载离线地图、阅读电子书。

它并不是某个单一工具的封装，而是一个**容器编排管理平台（Command Center）**，通过 Docker Compose 协调多个子服务：

| 能力 | 底层工具 | 说明 |
|------|---------|------|
| AI 助手（支持 RAG） | Ollama + Qdrant | 本地大模型 + 向量语义搜索，支持文档上传 |
| 离线百科与电子书 | Kiwix | Wikipedia、医学参考、生存指南 |
| 在线教育平台 | Kolibri | Khan Academy 课程，支持进度跟踪和多用户 |
| 离线地图 | ProtoMaps（pmtiles） | 下载区域地图，搜索导航 |
| 数据工具 | CyberChef | 加密、编码、哈希、数据分析 |
| 笔记 | FlatNotes | 本地 Markdown 笔记 |
| 硬件跑分 | 内置 | 系统评分 + 社区排行榜 |

安装方式极其简单，一条命令搞定：

```bash
sudo apt-get update && \
sudo apt-get install -y curl && \
curl -fsSL https://raw.githubusercontent.com/Crosstalk-Solutions/project-nomad/refs/heads/main/install/install_nomad.sh \
  -o install_nomad.sh && \
sudo bash install_nomad.sh
```

安装完成后浏览器访问 `http://localhost:8080` 即可进入管理界面。

## 二、技术原理

### 2.1 整体架构

N.O.M.A.D. 的架构分为三层：

```
┌─────────────────────────────────────────┐
│           Command Center UI             │  ← Web 管理界面（Node.js + AdonisJS）
│           (localhost:8080)              │
├─────────────────────────────────────────┤
│      Docker / Docker Compose            │  ← 容器编排层，统一管理所有子服务
├──────────┬──────────┬───────┬───────────┤
│  Ollama  │  Qdrant  │ Kiwix │  Kolibri  │
│  (AI)    │ (向量库) │(百科) │  (教育)   │
└──────────┴──────────┴───────┴───────────┘
```

管理 UI 基于 Node.js 构建，Dockerfile 可见其多阶段构建配置：

```dockerfile
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y \
      bash curl graphicsmagick libvips-dev build-essential pciutils \
      && rm -rf /var/lib/apt/lists/*

# go-pmtiles（地图切片处理 CLI）
ARG PMTILES_VERSION=1.30.2
RUN curl -fsSL -o /tmp/go-pmtiles.tar.gz \
      "https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/..." \
    && tar -xzf go-pmtiles.tar.gz -C /usr/local/bin pmtiles
```

### 2.2 AI 助手的工作原理

N.O.M.A.D. 的 AI 功能基于 Ollama 提供本地 LLM 推理，默认支持在主机上运行 Ollama 服务。如果你想在另一台机器（比如带 GPU 的设备）上跑模型，只需在设置中填入远程 Ollama 或 OpenAI 兼容 API 的地址。

使用远程 Ollama 时，必须启动时设置 `OLLAMA_HOST=0.0.0.0` 让服务监听所有网络接口。

语义搜索部分依赖 Qdrant 向量数据库，当用户上传文档时，系统先将文档分块、向量化后存入 Qdrant，再在对话时进行相似度检索（RAG）。

```python
# 典型 RAG 流程（概念层面）
query_embedding = embed_model.encode(user_query)
results = qdrant.search(collection_name, query_embedding, top_k=5)
context = "\n".join([r.content for r in results])
final_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nUser: {user_query}"
```

### 2.3 离线地图的处理

项目使用了 `go-pmtiles` 工具处理离线地图瓦片数据。ProtoMaps 提供 `.pmtiles` 格式的全球地图数据，N.O.M.A.D. 通过 `pmtiles` CLI 提取特定区域的数据瓦片，供 ProtoMaps 前端展示。

### 2.4 数据安全设计

N.O.M.A.D. 的设计哲学是**零遥测**——项目明确声明没有任何内置的数据上报机制。网络连接仅在安装阶段和用户主动下载资源时才会被使用，日常运行时完全离线可用。

不过需要注意的是，当前版本**没有内置认证机制**，N.O.M.A.D. 官方不建议将其直接暴露到公网。如果需要在多人环境中使用，建议通过防火墙或网络层来控制访问。

## 三、安装与快速开始

### 环境要求

**最低配置（仅管理平台）**
- CPU：2 GHz 双核
- 内存：4 GB
- 存储：5 GB 可用空间
- 系统：Debian 系（推荐 Ubuntu）

**推荐配置（运行 AI 模型）**
- CPU：AMD Ryzen 7 / Intel Core i7 或更高
- 内存：32 GB
- 显卡：NVIDIA RTX 3060 及以上（显存越大能跑的模型越大）
- 存储：250 GB SSD

### 详细安装步骤（Ubuntu）

```bash
# 1. 安装基础依赖
sudo apt-get update
sudo apt-get install -y curl docker.io docker-compose

# 2. 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/Crosstalk-Solutions/project-nomad/refs/heads/main/install/install_nomad.sh \
  -o install_nomad.sh
sudo bash install_nomad.sh

# 3. 访问管理界面
# 浏览器打开 http://localhost:8080
```

### 使用 Docker Compose 手动部署（高级用户）

如果你希望对服务有更多控制权，可以手动编写 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  command-center:
    image: crosstalksolutions/project-nomad:latest
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - OLLAMA_HOST=http://ollama:11434
```

启动：`docker compose up -d`

## 四、使用方法与实战

### 4.1 首次配置

安装完成后，打开 `http://localhost:8080`，使用 Setup Wizard 进行首次配置。向导会引导你选择需要安装哪些工具集（AI、教育、地图等），并提供内容集合推荐。

### 4.2 使用 AI 助手

进入 AI Assistant 页面，可选择本地 Ollama 模型（如 LLaMA 3、Mistral 等），也支持接入 OpenAI 兼容 API。

上传文档功能支持 PDF、TXT 等格式，系统会自动分块、向量化存储在 Qdrant 中。在对话时，AI 会先检索相关文档片段，再生成回答。

### 4.3 下载离线地图

进入 Maps 页面，选择需要的区域（如某个省份或城市），系统会下载对应的 `.pmtiles` 文件供离线使用。下载后的地图完全可在断网状态下访问。

### 4.4 管理 Helper Scripts

安装后，所有脚本位于 `/opt/project-nomad` 目录：

```bash
# 启动所有容器
sudo bash /opt/project-nomad/start_nomad.sh

# 停止所有容器
sudo bash /opt/project-nomad/stop_nomad.sh

# 更新 Command Center（不更新应用容器）
sudo bash /opt/project-nomad/update_nomad.sh

# 卸载
curl -fsSL https://raw.githubusercontent.com/Crosstalk-Solutions/project-nomad/refs/heads/main/install/uninstall_nomad.sh \
  -o uninstall_nomad.sh && sudo bash uninstall_nomad.sh
```

## 五、常见问题与解决方案

**Q：安装脚本报错 `permission denied`？**  
确保以 root 权限运行安装脚本，N.O.M.A.D. 需要 sudo 权限来安装 Docker 容器和系统依赖。

**Q：AI 助手无法启动，显示 Ollama 连接失败？**  
检查 Ollama 是否在正确的主机上运行。如果 Ollama 在另一台机器，确保启动时设置了 `OLLAMA_HOST=0.0.0.0`，并在 N.O.M.A.D. 设置中填入完整 URL（包含端口）。

**Q：Kiwix 无法下载离线百科？**  
确认安装时网络连接正常，Kiwix 数据包通常较大（如英语 Wikipedia 全量约 90GB），需要耐心等待。

**Q：如何让其他设备访问 N.O.M.A.D.？**  
在同一局域网内，直接访问 `http://设备IP:8080` 即可。不建议将服务直接暴露到公网，可使用 VPN 或 SSH 隧道访问。

**Q：内存不够，想关闭 AI 功能？**  
可以通过管理界面卸载 AI Assistant 组件，N.O.M.A.D. 的基础管理平台本身只需 4GB 内存即可运行。

## 六、总结

Project N.O.M.A.D. 是一个非常务实的离线工具集。它没有追求「再造一个新 AI」，而是在已有成熟开源工具（Ollama、Kiwix、Kolibri）的基础上做了一层易用的管理 UI，大幅降低了部署门槛。

它的核心价值在于**网络依赖的极简化**：安装完成后完全离线运行，特别适合：
- **偏远地区或欠发达地区**的教育与信息获取
- **隐私敏感**不希望数据上云的场景
- **野外作业、应急响应**等需要快速部署知识系统的场合

项目代码结构清晰，Dockerfile 规范，如果你对某个子工具的原理感兴趣，可以直接去看对应仓库的实现。整体而言，这是一个工程完成度相当高的开源项目，值得关注。