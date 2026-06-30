---
title: "OmniRoute：聚合 236 个 AI 提供商的免费网关，每月 16 亿免费 Token"
date: 2026-06-30
description: "OmniRoute 是一款开源的 AI 网关，聚合了 236 个 AI 提供商（其中 50+ 免费），通过统一的 OpenAI 兼容端点为 Claude Code、Cursor、Cline 等 AI 编程工具提供免费或低成本的模型访问，并内置 RTK + Caveman 压缩技术可节省 15-95% 的 Token 消耗。"
author: "Cheman"
slug: "omniroute"
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI", "LLM", "Gateway", "免费资源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OmniRoute**，一个免费的 AI 网关，可以让你通过同一个端点访问 236 个 AI 提供商，其中 50+ 完全免费，每月聚合约 16 亿免费 Token。

## 一、项目概述

OmniRoute 是一个开源的 AI 路由网关，解决了 AI 编程工具用户面临的核心痛点：

- **API 成本高昂**：Claude、GPT、Gemini 等主流模型按 Token 计费，高频使用成本迅速累积
- **多提供商管理复杂**：每个 AI 工具需要单独配置不同的 API Key，且各家的 SDK、速率限制都不相同
- **免费额度分散**：虽然很多提供商提供免费层级（Free Tier），但分散在数十个平台，手动管理几乎不可能

**OmniRoute 的核心价值**：

1. **统一端点**：提供与 OpenAI API 完全兼容的端点，可直接接入 Claude Code、Cursor、Cline、GitHub Copilot 等工具
2. **免费聚合**：整合 40+ 提供商的免费层级，覆盖 500+ 模型，每月提供约 16 亿免费 Token（首月可达 21 亿，含注册奖励）
3. **智能路由**：支持 17 种路由策略，包括自动降级（Auto-fallback）、负载均衡、成本优化等
4. **Token 压缩**：内置 RTK（RocketTokenizer）+ Caveman 压缩算法，可节省 15-95% 的 Token 消耗

**项目亮点**：

- 📦 **开箱即用**：支持 npm 全局安装、Docker 部署、Electron 桌面应用、PWA 网页应用
- 🌐 **多语言支持**：README 提供 41+ 语言版本
- 🔒 **本地优先**：所有数据处理均在本地完成，支持完全离线运行
- 🔌 **完整 CLI + MCP/A2A**：提供命令行工具和 Model Context Protocol 集成
- 📊 **实时仪表盘**：内置 Dashboard，可实时查看免费额度使用情况、路由策略、Token 压缩比等指标

## 二、技术原理

### 架构设计

OmniRoute 采用前后端分离的架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    AI 编程工具层                              │
│  Claude Code / Cursor / Cline / Copilot / Antigravity       │
└────────────────────┬────────────────────────────────────────┘
                     │ OpenAI 兼容 API
┌────────────────────▼────────────────────────────────────────┐
│                  OmniRoute 网关层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 路由策略引擎  │  │ Token 压缩器 │  │ 免费额度管理  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 提供商适配层  │  │ 缓存层        │  │ 降级容错      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  236 个 AI 提供商                             │
│   Claude / GPT / Gemini / Meta / Mistral / ...              │
│   50+ 免费提供商 + 永久免费无限制提供商                       │
└─────────────────────────────────────────────────────────────┘
```

### 核心技术栈

根据 `package.json` 和源代码文件分析：

- **运行时**：Node.js >= 22.0.0（支持 24.x）
- **前端**：Next.js（孤立构建，通过 `build-next-isolated.mjs` 编译）
- **后端**：原生 Node.js + TypeScript
- **CLI**：支持作为全局 npm 包安装，提供 `omniroute` 和 `omniroute-reset-password` 命令
- **桌面应用**：Electron（跨平台桌面客户端）
- **PWA**：支持 Progressive Web App，可安装到手机/电脑
- **容器化**：提供 Dockerfile 和多阶段构建配置
- **测试**：Vitest（单元测试 + MCP 测试）
- **代码质量**：ESLint（含复杂度、SonarJS 插件）+ Prettier

### Token 压缩技术

OmniRoute 内置两套压缩算法：

1. **RTK（RocketTokenizer）**：
   - 通过智能分词和 Token 合并，减少冗余 Token
   - 对代码类 prompt 效果显著（可节省 30-60%）

2. **Caveman 压缩**：
   - 更激进的压缩策略，通过语义保留的精简算法
   - 极限情况下可节省 95% Token（适合草稿、原型生成场景）

用户可在配置中选择压缩级别，或让网关根据请求类型自动选择。

### 路由策略

OmniRoute 支持 17 种路由策略（Combos），其中旗舰策略是：

- **Auto-fallback（自动降级）**：当主模型速率限制或失败时，自动切换到备用模型
- **Cost-based（成本优先）**：优先路由到免费或低成本模型
- **Latency-based（延迟优先）**：选择响应最快的提供商
- **Round-robin（轮询）**：在多个提供商之间负载均衡

## 三、安装与快速开始

### 环境要求

- Node.js >= 22.0.0（不支持 23.x，支持 24.x）
- 或使用 Docker / Electron 桌面应用（无需 Node.js）

### 安装方式

**方式一：npm 全局安装（推荐）**

```bash
npm install -g omniroute
```

**方式二：Docker 部署**

```bash
docker pull diegosouzapw/omniroute
docker run -p 3000:3000 diegosouzapw/omniroute
```

**方式三：从源码构建**

```bash
git clone https://github.com/diegosouzapw/OmniRoute.git
cd OmniRoute
npm install
npm run build
npm run start
```

### 最简运行示例

安装完成后，启动 OmniRoute 网关：

```bash
omniroute
```

网关默认监听 `http://localhost:3000`，提供与 OpenAI API 完全兼容的端点。

### 配置 AI 编程工具

以 **Claude Code** 为例，在配置文件中设置：

```json
{
  "openai_api_base": "http://localhost:3000/v1",
  "openai_api_key": "omniroute-free"
}
```

对于 **Cursor / Cline / Copilot**，同样在各自的 API 配置中填入上述端点。

OmniRoute 会自动：
1. 从免费提供商池中选择可用模型
2. 在速率限制接近时自动切换
3. 对请求进行 Token 压缩（若启用）

## 四、使用方法与实战

### 基础用法

**查看免费额度仪表盘**：

浏览器访问 `http://localhost:3000/dashboard/free-tiers`，实时查看：

- 各提供商的免费额度余量
- 速率限制重置时间
- 已使用 Token 统计

**切换路由策略**：

通过 CLI 或配置文件选择路由策略：

```bash
omniroute config set routing.strategy auto-fallback
```

### 进阶用法

**1. 配置多个 API Key（混合免费与付费）**

在 `.env` 文件中配置：

```env
# 免费提供商（无需 Key）
OMNIROUTE_FREE_TIER_ONLY=true

# 或混合配置
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

OmniRoute 会优先使用免费额度，耗尽后自动切换到付费 Key。

**2. 启用 Token 压缩**

在配置中启用：

```bash
omniroute config set compression.enabled true
omniroute config set compression.level medium
```

**3. 自定义路由规则**

通过 CLI 创建自定义路由组合：

```bash
omniroute combo create my-strategy \
  --primary "claude-3.5-sonnet" \
  --fallback "gpt-4o-mini" \
  --free-only
```

### 实际项目示例

**场景：使用 Claude Code 进行全天编码**

传统方式：Claude 3.5 Sonnet 按 Token 计费，一天可能花费 $10-30。

使用 OmniRoute：
1. 接入免费 Claude（通过 OpenRouter 或其他免费提供商）
2. 启用 RTK 压缩，Token 消耗减少 40%
3. 当免费额度用尽，自动降级到 GPT-4o-mini 免费版
4. 实际花费：**$0**（完全使用免费额度）

## 五、常见问题与解决方案

### 安装失败

**问题**：npm 安装时提示 Node.js 版本不匹配。

**解决方案**：OmniRoute 要求 Node.js >= 22.0.0，且不支持 23.x。请使用 nvm 安装正确版本：

```bash
nvm install 22
nvm use 22
```

### 运行时错误

**问题**：网关启动后，AI 工具连接失败。

**解决方案**：
1. 检查端口占用：`lsof -i :3000`
2. 查看日志：`omniroute logs`
3. 确认防火墙允许本地回环连接

### 免费额度快速耗尽

**问题**：免费 Token 用得很快。

**解决方案**：
1. 启用 Token 压缩（可节省 15-95%）
2. 在仪表盘中查看哪些模型消耗最快，调整路由策略
3. 注册各提供商的免费账号（首月可获得额外额度，从 16 亿/月提升到 21 亿）

### 兼容性问题

**问题**：某些 AI 工具的特定功能无法使用。

**解决方案**：OmniRoute 提供"透传模式"，可在配置中针对特定工具禁用路由：

```bash
omniroute config set passthrough.tools "cursor-proprietary-feature"
```

## 六、总结

OmniRoute 是一款极具实用价值的开源 AI 网关，特别适合：

- **高频使用 AI 编程工具的开发者**：通过免费额度和 Token 压缩，可节省大量成本
- **需要多模型切换的团队**：统一管理多个 AI 提供商，避免为每个工具单独配置
- **对隐私有要求的用户**：本地运行，数据不出境

**项目优势**：

1. **真正的免费**：聚合的免费额度高达 16 亿 Token/月，对个人开发者完全够用
2. **技术先进**：Token 压缩、智能路由、自动降级等特性都是生产级实现
3. **生态完整**：支持 CLI、MCP、Docker、Electron、PWA，覆盖所有使用场景
4. **活跃维护**：版本号已达 3.8.42，社区活跃（Discord、Telegram、WhatsApp）

**注意事项**：

- 免费额度有速率限制，高并发场景需配置多个账号或混合付费 Key
- Token 压缩可能影响输出质量（尤其是激进压缩），需根据场景调整
- 项目相对年轻（虽然版本号高），生产环境使用建议先测试

总体而言，OmniRoute 为 AI 编程工具用户提供了一个"永远不停工"的解决方案，值得尝试。

**项目链接**：

- GitHub：https://github.com/diegosouzapw/OmniRoute
- 官网：https://omniroute.online
- npm：https://www.npmjs.com/package/omniroute
- Docker Hub：https://hub.docker.com/r/diegosouzapw/omniroute
