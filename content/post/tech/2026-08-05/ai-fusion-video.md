---
title: "融光：Agent 驱动的视频创作平台，剧本到成片一站式搞定"
date: 2026-08-05
description: "融光（ai-fusion-video）是一款面向视频创作者的 Agent 驱动创作平台，将项目、剧本、分镜、素材及图片与视频生成整合在统一工作区，基于 Java 21 + Spring Boot 3.5 + Next.js 16 构建，支持 Docker 一键部署。"
author: "Cheman"
slug: ai-fusion-video
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI视频", "Agent", "Spring Boot", "开源", "视频创作"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**融光（ai-fusion-video）**，一个将 AI Agent 直接融入视频创作工作流的全栈平台——从剧本、分镜到图片视频生成，全部在一个界面里搞定。

## 一、项目概述

融光是一款面向专业视频创作者的 Agent 驱动创作平台，核心理念是把 AI 能力无缝嵌入视频生产的每一个环节。项目包含 Java 后端（`ai-fusion-video/`）和 Next.js 前端（`ai-fusion-video-web/`），支持 Docker Compose 一键部署，开源协议为 MIT License。

核心功能模块如下：

| 模块 | 能力 |
|---|---|
| 项目与团队 | 管理创作项目、成员和协作角色 |
| 剧本创作 | 按分集/场景组织剧本，向 Agent 注入项目上下文 |
| 分镜制作 | 整理分镜、编辑镜头内容、关联参考素材和生成结果 |
| 图片与视频 | 文本/参考图生成图片与视频，实时跟踪后台任务 |
| 素材管理 | 统一管理项目级可复用图片、视频资源 |
| Agent 工作区 | 流式对话、多模态上下文（图片/视频/音频/文件）、工具权限控制 |
| 模型与存储 | 集中配置文本、图片、视频模型，兼容本地或 S3 存储 |

## 二、技术原理

### 整体架构

融光采用典型的 BFF（Backend For Frontend）前后端分离架构：

```
浏览器 (Next.js 16)
    ↓ HTTPS
Nginx（统一入口，反向代理）
    ├── /api/**   →  Java 后端（:18080）
    └── /media/** →  Java 后端（:18080）

Java 后端（Spring Boot 3.5）
    ├── Spring Security（认证授权）
    ├── Spring AI（Agent 推理核心）
    ├── AgentScope（多 Agent 编排）
    ├── MyBatis-Plus（数据持久化）
    ├── MySQL 8（主数据库）
    ├── Redis（缓存 / 会话）
    └── FFmpeg（视频合成与媒体探测）

对象存储（S3 兼容）/ 本地磁盘（媒体文件）
```

### Agent 工作区核心

Agent 工作区是融光最核心的差异化能力。用户可以在对话中上传图片、视频、音频和文件，Agent 结合这些多模态上下文持续推理，并调用内置工具完成任务。

Agent 运行时基于 **AgentScope** 框架，支持：
- **Skill**：预定义技能扩展（类似 OpenAI 的 Actions）
- **MCP（Model Context Protocol）**：标准化的上下文协议
- **子 Agent**：复杂任务分解为多 Agent 协作

关键特性：
- **流式输出**：推理过程、工具调用状态、任务进度实时展示在界面
- **会话持久化**：对话历史与运行状态自动保存，重启不丢失
- **按会话配置模型**：不同会话可以使用不同的模型能力和工具权限

### 模型接入层

融光在"系统设置"中统一管理模型配置，无需将密钥写入源码。支持的模型服务：

| 类型 | 支持的服务商 |
|---|---|
| 文本对话 | OpenAI 兼容接口、Anthropic Claude、Gemini、DashScope（阿里）、Ollama |
| 图片生成 | 多种支持的图片生成服务（按服务商能力选用） |
| 视频生成 | 多种视频生成服务（按服务商能力选用） |

具体可用模型取决于服务商的账号权限和接口配额。

### 存储层设计

媒体素材支持三种存储方式：

```yaml
# application-local.yaml 中的存储配置
storage:
  type: local | s3   # 本地磁盘 或 S3 兼容对象存储

# S3 示例
s3:
  endpoint: https://your-s3-endpoint.com
  bucket: your-bucket
  access-key: ${AWS_ACCESS_KEY}
  secret-key: ${AWS_SECRET_KEY}
```

Agent 工作区同样支持数据库、本地磁盘和对象存储三种方式，适合从本地开发到云端生产的不同场景。

## 三、安装与快速开始

### 环境要求

- **JDK 21**
- **Node.js 20 + pnpm 10**
- **Docker Desktop**（启动 MySQL 和 Redis）
- **FFmpeg + FFprobe**（视频合成与媒体探测）

### Docker Compose 一键部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/Stonewuu/ai-fusion-video.git
cd ai-fusion-video

# 复制环境配置
cp .env.example .env

# 启动全部服务
docker compose up -d
```

> ⚠️ **公网部署前**：务必通过 `.env` 修改 `MYSQL_ROOT_PASSWORD` 和 `REDIS_PASSWORD`，防止数据库被恶意访问。

启动后访问 **http://localhost:8080**，按初始化向导创建管理员账号即可。

查看服务状态：
```bash
docker compose ps
docker compose logs -f backend   # 跟踪后端日志
```

### 前后端独立部署

需要前后端使用不同域名时：
```env
# .env 中配置
PUBLIC_API_URL=https://api.example.com
CORS_ALLOWED_ORIGIN_PATTERNS=https://app.example.com
FRONTEND_PORT=3000
BACKEND_PORT=18080
```

然后执行：
```bash
docker compose -f docker-compose.yml -f docker-compose.separated.yml up -d
```

独立部署需要自行为前后端配置 HTTPS 反向代理，并在"系统设置 > 通用"中填入公网地址。

### 本地源码开发

```bash
# 1. 启动中间件（MySQL + Redis）
cd ai-fusion-video
docker compose -f docker-compose-middleware.yml up -d

# 2. 启动后端
./mvnw spring-boot:run

# 3. 另开终端，启动前端
cd ai-fusion-video-web
pnpm install
pnpm dev
```

本地服务端口：

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:18080 |
| Swagger UI | http://localhost:18080/swagger-ui.html |
| MySQL | localhost:43306 |
| Redis | localhost:46379 |

## 四、使用方法与实战

### 创建一个视频项目

1. 登录后创建"新项目"，填写项目名称和描述
2. 邀请团队成员，分配角色（管理员/编辑/查看者）
3. 进入项目，开始创作

### 用 Agent 辅助剧本创作

在剧本模块中，按分集和场景组织内容。编写剧本时，点击"交给 Agent"，系统会将当前剧本内容、项目上下文一并发送给 Agent，辅助生成、润色或扩展剧本。

### 分镜制作与素材生成

从剧本整理分镜后，为每个镜头：
1. 编写镜头描述和参考素材
2. 在 Agent 工作区中输入提示词，生成图片或视频
3. 将生成结果关联到对应镜头
4. 完成后，使用 FFmpeg 将所有镜头合成为完整视频

### 配置自定义模型

进入"系统设置 > 模型"，添加服务商 API Key 和接口地址。Agent 对话和图片/视频生成模块将自动使用已配置的模型。

## 五、常见问题与解决方案

### 1. Docker 启动后前端无法访问

检查 Nginx 是否正常：
```bash
docker compose logs nginx
```

确认 `.env` 中 `APP_PORT` 与 `docker-compose.yml` 中端口映射一致。

### 2. Agent 生成速度慢

- 确认使用的是流式接口（大多数服务商流式调用响应更快）
- 检查网络到模型服务商的延迟
- 在 Agent 设置中降低单次回复的最大 token 数

### 3. FFmpeg 路径问题

本地开发时，如 FFmpeg 不在默认路径，通过环境变量指定：
```bash
export VIDEO_COMPOSE_FFMPEG_PATH=/usr/local/bin/ffmpeg
export VIDEO_COMPOSE_FFPROBE_PATH=/usr/local/bin/ffprobe
```

### 4. 视频生成任务卡住

Agent 工作区的任务状态会实时展示。如果长时间无响应，检查：
- 模型服务商账号余额/配额
- S3 存储桶是否有写入权限
- 后端日志中是否有错误信息：`docker compose logs backend`

### 5. 如何让 AI 模型读取公网素材？

云端图片或视频生成模型无法访问本地 `localhost` 或局域网资源。解决方案：
- 将素材上传到公网对象存储（阿里云 OSS、七牛云等）
- 在"系统设置 > 通用"中配置"后端资源公网地址"
- 使用公网可达的 URL 作为参考素材

## 六、总结

融光（ai-fusion-video）的核心价值在于**将 AI Agent 的推理能力与视频创作的完整流程深度融合**。从剧本到分镜，从素材生成到视频合成，创作者无需在多个工具之间反复跳转，Agent 上下文始终保持对当前项目的理解，大幅提升创作效率。

技术层面，Java 21 + Spring Boot 3.5 的后端保证了生产级的稳定性，AgentScope 框架为多 Agent 协作提供了坚实基础，Next.js 16 + Tailwind CSS 4 带来了现代化的前端体验，Docker Compose 一键部署则让部署门槛降到了最低。

如果你正在做 AI 视频生成相关的工具链开发，或者需要一个内部视频创作管理平台，融光是非常值得研究参考的开源项目。
