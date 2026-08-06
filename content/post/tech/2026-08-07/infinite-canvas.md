---
title: "无限画布（infinite-canvas）：一站式 AI 图片创作工作台"
date: 2026-08-07
description: "infinite-canvas 是一款面向图片创作的开源工作台，将画布编排、AI 生图、参考图编辑、对话助手、提示词库与素材沉淀融为一体，适合视觉方案的探索与连续迭代。"
author: "Cheman"
slug: infinite-canvas
draft: false
categories: ["技术", "AI", "开源"]
tags: ["AI", "开源", "图片生成", "无限画布", "Vite", "React"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**无限画布（infinite-canvas）**，它把画布编排、AI 图片生成、参考图编辑、对话助手、提示词库和素材沉淀全部塞进同一个浏览器界面，让创作者可以在一个地方完成从灵感构思到图片输出的完整闭环。

## 一、项目概述

infinite-canvas 是一款面向 AI 图片创作场景的开源工作台，核心思路是用"无限画布"承载所有创作节点——每个节点可以是图片生成结果、参考图、文字描述，也可以是 AI 对话助手。项目由国内开发者 [@basketikun](https://github.com/basketikun) 创建，目前处于活跃开发阶段。

核心特性包括：

- **无限画布**：支持多画布项目管理，节点拖拽、缩放、连线，小地图导航，撤销/重做，导入导出 JSON
- **AI 生图**：浏览器前台直连用户自配的 OpenAI 兼容接口（Base URL + API Key），支持文生图、图生图、参考图编辑
- **画布助手**：选中任意节点，围绕该节点及其上游节点发起 AI 对话，生图结果自动插回画布
- **本地 Agent**：通过 MCP 协议连接 Codex / Claude Code，让 AI Agent 直接操控当前画布
- **插件系统**：支持从 URL 动态安装/更新/卸载远程节点插件，提供 TypeScript SDK 自行开发
- **提示词库**：内置对接多个 GitHub 开源提示词项目，缓存至 IndexedDB，免去重复搜索

> ⚠️ 项目目前处于开发阶段，不保证历史数据兼容，建议有长期使用需求的用户自行 fork 维护。

技术栈选型：前端基于 **Vite 7** + **React** + **React Router 7**，通过 `bun` 作为包管理器和运行时，利用 Docker Compose 一键部署，生产镜像使用 nginx 提供静态服务。

## 二、技术原理

### 2.1 整体架构

项目采用典型的前后分离架构，前端为单页应用（SPA），AI 请求完全由浏览器前台直连用户配置的 API 接口，服务端仅负责静态资源托管。

```
Browser (React SPA)
  ├── Canvas Editor     → 画布编辑器（拖拽/缩放/连线）
  ├── AI Gateway         → 调用用户配置的 OpenAI 兼容接口
  ├── IndexedDB         → 本地存储（API Key、画布数据、提示词缓存）
  └── MCP Client        → 连接本地 Canvas Agent（Codex/Claude Code）
```

### 2.2 Docker 两阶段构建

项目 Dockerfile 展示了典型的多阶段构建策略：

```dockerfile
# 第一阶段：构建 Vite 前端产物
FROM oven/bun:1.3.13 AS web-build
WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN bun install
COPY VERSION /app/VERSION
COPY CHANGELOG.md /app/CHANGELOG.md
COPY web ./
RUN bun run build

# 第二阶段：运行镜像仅启动 nginx 静态服务
FROM nginx:1.27-alpine
COPY --from=web-build /app/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

这种设计确保运行时镜像极小（alpine + nginx ~10MB），构建工具链不进入生产层，同时 AI 请求完全不经过服务端，保护用户 API Key 的隐私。

### 2.3 Canvas 数据模型

画布的核心数据结构围绕"节点"和"连接"展开。节点代表画布上的一个元素（图片/文字/AI 结果），连线表示节点间的引用关系。选中节点后，画布助手会基于当前节点及其直接上游节点构造上下文，发送给 AI 进行对话或生图。

### 2.4 MCP 集成原理

MCP（Model Context Protocol）允许外部 AI Agent 以标准化方式操作画布。本地 Canvas Agent 作为中间层接收 Agent 指令，将操作转化为画布 API 调用。例如 Agent 说"在画布上生成一张赛博朋克风格的城市夜景"，Canvas Agent 通过 MCP 接口解析意图，调用生图接口，结果再插回画布作为新节点。

## 三、安装与快速开始

### 3.1 环境要求

- 浏览器（Chrome/Edge/Firefox 最新版，推荐 Chrome）
- 可选的 API Key：OpenAI 兼容接口（OpenAI、Azure OpenAI、任意 OpenAI 兼容中转站均可）

### 3.2 方式一：Docker 一键运行（推荐）

```bash
git clone git@github.com:basketikun/infinite-canvas.git
cd infinite-canvas
docker compose up -d
# 访问 http://localhost:3000
```

首次打开后进入右上角设置，填入 OpenAI 兼容的 `Base URL` 和 `API Key`。

### 3.3 方式二：本地开发

```bash
git clone git@github.com:basketikun/infinite-canvas.git
cd infinite-canvas/web
bun install
bun run dev
# 访问 http://localhost:5173
```

### 3.4 自定义生图接口

如果默认的 OpenAI 接口调用方式与你的中转站不兼容，可在设置中自定义生图/视频的调用脚本，项目提供了灵活适配各类中转站与自建服务的接口层。

## 四、使用方法与实战

### 4.1 基础工作流

1. **创建画布**：点击新建画布，开始一个创作项目
2. **添加节点**：从工具栏拖入文字节点，描述你的创作需求
3. **调用 AI 生图**：选中文字节点，点击画布助手的"文生图"按钮，选择模型和参数，等待结果返回并自动插入画布
4. **参考图编辑**：将一张参考图拖入画布，选中后调用"图生图"，输入新的提示词，AI 以参考图为底图生成新图
5. **节点连线**：用连线将多个节点串联，构造有向无环图（DAG），方便追踪创作路径
6. **导出**：通过小地图查看全局，用导出功能将画布数据保存为 JSON

### 4.2 画布助手实战

画布助手是整个工具的核心亮点。当你选中一个节点时，助手会：
- 读取当前节点的完整上下文（文字描述 + 图片内容 + 上游依赖）
- 将上下文组装为 prompt，发送给 AI
- 支持多轮对话，生图结果直接插回画布作为新节点

这种"围绕节点创作"的范式，非常适合需要反复迭代、对比多个生成结果的场景。

### 4.3 本地 Agent 集成

如果你配置了 Codex App 插件，安装后会：
1. 自动注册 MCP 接口
2. 尝试连接本地 Canvas Agent
3. 之后就可以用自然语言让 Agent 帮你操作画布了

## 五、常见问题与解决方案

**Q: 首次打开报 API 连接失败？**  
A: 确保在设置中正确填入了 `Base URL`（注意末尾不要带 `/v1` 以外的路径）和 `API Key`，且你的 API 提供商支持对应的模型端点。

**Q: Docker 部署后无法访问？**  
A: 检查 `docker compose ps` 确认容器状态，运行 `docker compose logs -f` 查看 nginx 启动日志，确认端口 3000 未被占用。

**Q: 生图结果质量不佳？**  
A: 尝试使用参考图编辑模式（上传一张质量较高的底图），或在提示词中加入更多细节描述（光线、构图、风格关键词）。

**Q: 如何备份画布数据？**  
A: 所有数据默认保存在浏览器 IndexedDB 中，可在画布菜单中使用导出功能将整个画布导出为 JSON 文件，下次通过导入功能恢复。

**Q: MCP 连接不上本地 Agent？**  
A: 确认 Codex App 已安装并运行，且浏览器允许本地连接。Windows 用户可能需要额外配置网络策略。

## 六、总结

infinite-canvas 最大的价值在于**将 AI 创作的全链路收敛到一个视觉化界面**——无需在多个工具之间来回切换，所有上下文、迭代历史和素材都可以在同一张画布上追溯。对于需要反复调试提示词、对比多版本生成结果的创作者来说，这套工作流相当高效。

随着 AI 生图模型的持续进化和 MCP 生态的成熟，类似 infinite-canvas 这样的"AI Native 创作工作台"很可能会成为越来越多创作者的主力工具。如果你对 AI 图片创作有兴趣，不妨 clone 下来体验一下。
