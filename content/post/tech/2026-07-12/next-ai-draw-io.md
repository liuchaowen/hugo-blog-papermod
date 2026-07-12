---
title: "Next AI Draw.io：用自然语言对话式创建 draw.io 图表的开源神器"
date: "2026-07-12"
description: "Next AI Draw.io 是一款将大语言模型与 draw.io 深度集成的开源图表工具，通过自然语言对话即可生成、编辑云架构图、流程图、技术架构图，支持 MCP 协议接入 Claude Desktop。"
author: "Cheman"
slug: next-ai-draw-io
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "Next.js", "图表", "draw.io", "MCP"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Next AI Draw.io**，它将大语言模型与经典的 draw.io 图表深度融合，让用户只需用自然语言描述，就能生成专业的技术架构图、流程图、云架构图，支持动画连接线、PDF 文档图解，甚至可以作为 MCP 服务接入 Claude Desktop。

## 一、项目概述

[DayuanJiang/next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io) 是一个基于 **Next.js 16 + React 19** 构建的 Web 应用，核心依赖是 [Vercel AI SDK](https://github.com/vercel/ai) 和 [react-drawio](https://github.com/fhollenbach/react-drawio)。它通过 LLM 理解用户的自然语言指令，直接生成 draw.io 的 XML 图表描述，实时渲染在浏览器中。

**核心功能亮点：**
- **对话式图表生成**：用自然语言描述需求，AI 自动生成图表
- **图片/PDF 图解复制**：上传已有图表或 PDF 文档，AI 自动理解并重建图表
- **云架构专项支持**：内置 AWS、Azure、GCP 的云服务 logo 标注，Claude 系列模型对此优化
- **动画连接线**：支持动态箭头和连接线，让图表更生动
- **版本历史**：每次 AI 编辑都会记录版本，可随时回滚
- **MCP 协议接入**：配置后可直接在 Claude Desktop、Cursor、VS Code 中召唤 AI 画图
- **多平台桌面应用**：提供 Windows/macOS/Linux 原生桌面版

## 二、技术架构

### 核心技术栈

```json
{
  "framework": "Next.js 16 (App Router, Turbopack)",
  "ui": "React 19",
  "ai": "Vercel AI SDK (ai@6.0.1 + @ai-sdk/*)",
  "diagram": "react-drawio + @xmldom/xmldom",
  "repair": "jsonrepair (修复 LLM 输出的 XML)",
  "css": "Tailwind CSS 4",
  "telemetry": "Langfuse (AI 调用追踪)",
  "desktop": "Electron 39"
}
```

### AI 多 Provider 架构

项目支持**十余种 AI Provider**，核心通过 Vercel AI SDK 的统一接口封装：

```typescript
// packages 示例（以 Anthropic 为例）
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

// 管理员可在后台配置多模型混用
const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  prompt: "生成一个 RAG 架构的 draw.io 图",
  // AI SDK 自动处理流式输出和 Provider 路由
})
```

支持的 Provider 一览：ByteDance Doubao、AWS Bedrock、OpenAI、Anthropic、Google AI (Gemini)、Azure OpenAI、Ollama、DeepSeek、SiliconFlow、ModelScope、Vercel AI Gateway 等。

### MCP Server 接入方式

项目提供了标准的 MCP Server 包，可一键接入 AI 客户端：

```json
{
  "mcpServers": {
    "drawio": {
      "command": "npx",
      "args": ["@next-ai-drawio/mcp-server@latest"]
    }
  }
}
```

```bash
# 接入 Claude Code CLI
claude mcp add drawio -- npx @next-ai-drawio/mcp-server@latest
```

接入后直接用自然语言让 AI 在浏览器中画图：

> "Create a flowchart showing user authentication with login, MFA, and session management"

### Dockerfile 多阶段构建

项目提供了生产级 Dockerfile，使用多阶段构建将 Next.js 应用打包为 Standalone 模式：

```dockerfile
# Stage 1: 安装依赖
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN npm install

# Stage 2: 构建
FROM node:24-alpine AS builder
COPY --from=deps /app/node_modules ./node_modules
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build  # 输出 standalone 产物

# Stage 3: 生产运行
FROM node:24-alpine AS runner
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
```

### Langfuse 可观测性

```typescript
// instrumentation.ts - AI 调用追踪
const langfuseSpanProcessor = new LangfuseSpanProcessor({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL,
  shouldExportSpan: ({ otelSpan }) => {
    // 只追踪 AI SDK 相关调用（ai.*）和管理端聊天（chat）
    return otelSpan.name === "chat" || otelSpan.name.startsWith("ai.")
  },
})
```

## 三、安装与快速开始

### 在线体验（无需安装）

访问官方 Demo：[https://next-ai-drawio.jiang.jp](https://next-ai-drawio.jiang.jp)，点击 Settings 配置自己的 API Key 即可绕过演示站点的限流。

### 本地部署

```bash
git clone https://github.com/DayuanJiang/next-ai-draw-io
cd next-ai-draw-io
npm install
cp env.example .env.local
# 编辑 .env.local 填入你的 API Key
npm run dev
# 访问 http://localhost:6002
```

### Docker 部署

```bash
docker build -t next-ai-drawio .
docker run -p 3000:3000 next-ai-drawio
```

### 一键部署到各大平台

- **Vercel**（推荐）：[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDayuanJiang%2Fnext-ai-draw-io)
- **Tencent EdgeOne Pages**：一键部署并获赠 DeepSeek 免费 Token 额度
- **Cloudflare Workers**：详见 [Cloudflare 部署指南](./docs/en/cloudflare-deploy.md)

## 四、使用方法与实战

### 基础用法：自然语言画图

在对话框中直接描述你想要的图表：

```
Give me an animated connector diagram of transformer's architecture.
```

AI 会自动生成包含动态连接线的 Transformer 架构图，支持 SVG 导出。

### 云架构图：AWS/GCP/Azure

```
Generate authentication process using React with AWS. Use Serverless architecture.
```

Claude 系列模型内置了 AWS/Azure/GCP 云服务的 Logo 数据，生成的图表会自动标注对应服务的图标，效果专业。

### 文档图解：上传 PDF 生成图表

支持直接上传 PDF 文档或文本文件，AI 提取内容后自动生成对应图表，适合将技术白皮书、架构文档可视化。

### 接入 Claude Desktop

```json
// ~/.claude/settings.json (macOS) 或对应平台配置
{
  "mcpServers": {
    "drawio": {
      "command": "npx",
      "args": ["@next-ai-drawio/mcp-server@latest"]
    }
  }
}
```

配置完成后，在 Claude Code 中直接说"画一个用户注册登录的流程图"，浏览器会自动打开并展示生成的图表。

## 五、常见问题与解决方案

### API Key 配置不生效？
检查 `.env.local` 中的变量名是否与 [AI Provider 配置指南](./docs/en/ai-providers.md) 一致，敏感 Key 不要加 `NEXT_PUBLIC_` 前缀（服务端才需要）。

### 生成图表 XML 格式错误？
项目内置 `jsonrepair` 自动修复 LLM 输出的 XML，偶发格式问题可尝试更换模型（推荐 Claude Sonnet 4.5 / GPT-5.1 / Gemini 3 Pro / DeepSeek V3.2）。

### 云架构图 logo 丢失？
目前只有 `claude` 系列模型内置了 AWS/GCP/Azure Logo，其他模型生成的图表需手动替换为对应 SVG 图标。

### 演示站点访问受限？
申请一个 [Volcengine ARK](https://www.volcengine.com/activity/codingplan) 账号，可获得 50 万免费 Token 用于 Doubao 模型，绕过演示站限流。

## 六、总结

Next AI Draw.io 填补了"AI 绘图"与"专业图表"之间的鸿沟——它不是又一个玩具式的 SVG 生成器，而是真正可以用于生产环境（文档、演示、技术博客）的图表工具。其 MCP 协议接入能力让它可以无缝融入 AI Coding 工作流，工程师只需动嘴就能得到精准的技术架构图。技术选型上，Vercel AI SDK 的多 Provider 抽象层设计非常优雅，便于后续扩展新模型，值得借鉴。
