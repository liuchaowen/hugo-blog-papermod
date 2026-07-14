---
title: "Toonflow：AI 短剧漫剧一站式工作台，把小说秒变视频"
date: "2026-07-14"
description: "Toonflow 是一款开源 AI 短剧漫剧工具，通过决策层、执行层、监督层三层 Agent 协作，实现从小说文本到分镜、素材、视频的全流程自动化，支持本地部署与云端使用。"
author: "Cheman"
slug: toonflow-app
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI", "短剧", "TypeScript", "Node.js"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Toonflow**，一个面向短剧生产的 AI 工作台，主打"从文本到角色，从分镜到视频，0 门槛全流程 AI 化"，创作效率提升据说可达 10 倍以上。它不仅拿到了 Gitee GVP 认证，还在 AtomGit G-Star 排名靠前，开源社区活跃度相当可观。

## 一、项目概述

Toonflow 的定位是**一站式短剧漫剧工程平台**，围绕"策划 → 编剧 → 分镜 → 出片"构建完整闭环，并支持本地化、可编程、可持续迭代的生产流程。

其核心设计理念是**无限画布 + 三层 Agent 协作**：

- **无限画布生产工作台**：以类无限画布形式组织剧本、角色、分镜、素材与视频节点，支持自由编排、回溯与并行生产，打破线性步骤限制。
- **三层 Agent 协作体系**：决策层（Strategy Agent）负责任务拆解，执行层（Script Agent / Production Agent）负责内容生成，监督层（Review Agent）负责质量审阅与修订反馈，三者协同提升成片稳定性。
- **持久化 Agent 记忆**：基于本地 ONNX 向量检索的跨会话记忆系统，支持短期消息、长期摘要和语义召回，确保多轮创作连续性。

支持 8 种语言界面（简体中文、繁体中文、英文、泰语、越南语、日语、俄语等），国际化程度较高。

## 二、技术原理

### 技术栈一览

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js 23.11.1+ |
| 语言 | TypeScript 5.x |
| 后端框架 | Express 5 |
| 数据库 | SQLite（better-sqlite3 / knex） |
| AI 集成 | Vercel AI SDK（OpenAI / Anthropic / DeepSeek / 智谱 / 阿里通义等） |
| 本地推理 | @huggingface/transformers（ONNX） |
| 实时通信 | Socket.IO |
| 桌面客户端 | Electron 40 |
| 图像处理 | Sharp |
| 容器化 | Docker |

### 源码结构

```typescript
// src/routes/scriptAgent/ — 剧本 Agent 路由
export interface ScriptRequest {
  novelId: string;
  strategy?: string;
  language: string;
}

// src/agents/scriptAgent/ — 核心剧本生成逻辑
// src/agents/productionAgent/ — 分镜与视频节点编排
// src/lib/memory.ts — ONNX 向量记忆检索实现
```

### 可编程供应商系统

Toonflow 的一个亮点是**支持在设置中心直接编写供应商 TypeScript 逻辑并即时生效**，无需修改源码或重启应用：

```typescript
// 用户自定义供应商示例（数据来自 package.json）
const providers = {
  openai: { apiKey: 'sk-xxx', baseURL: 'https://api.openai.com/v1' },
  deepseek: { apiKey: 'sk-xxx', baseURL: 'https://api.deepseek.com' },
  // 可直接在 UI 中编辑即时生效
};
```

### 章节事件图谱驱动改编

项目引入了**事件图谱驱动改编**机制，自动提取原著章节事件并结构化存储，剧本改编时按事件图谱精准调用上下文，减少长文本信息丢失：

```typescript
// 核心数据结构
interface ChapterEvent {
  chapterId: string;
  eventType: 'conflict' | 'dialogue' | 'description' | 'climax';
  summary: string;
  characters: string[];
  relations: string[];
}
```

### Docker 部署入口

```dockerfile
FROM node:24-bookworm-slim
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com/
COPY . .
# 剥离 Electron 相关包，减小镜像体积
RUN node -e "..." && yarn install --frozen-lockfile
ENV NODE_ENV=dev
ENV PORT=10588
EXPOSE 10588
CMD ["yarn", "dev"]
```

## 三、安装与快速开始

### 环境要求

- Node.js 23.11.1+（云服务器部署推荐 24.x）
- 内存 2GB+
- 大语言模型 API 接口地址
- 视频生成服务接口（Sora / 豆包等）
- 图片生成模型服务接口

### 下载安装（桌面客户端）

直接下载对应平台的 Release 安装包（Windows / Linux / macOS 均已支持）：

> 首次登录账号：`admin`，密码：`admin123`

macOS 用户需在「设置 → 隐私与安全性」中允许运行，参考 [知乎文档](https://www.zhihu.com/question/433389276)。

### Docker 本地构建

```bash
git clone https://github.com/HBAI-Ltd/Toonflow-app.git
cd Toonflow-app
yarn docker:local
# 或手动构建
docker build -t toonflow .
docker run -d -p 10588:10588 -v $(pwd)/data:/app/data toonflow
# 访问 http://localhost:10588/web/index.html
```

### 云服务器部署（PM2）

```bash
# 安装 Node.js 24.x
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 24
npm install -g yarn pm2

# 克隆并构建
git clone https://gitee.com/HBAI-Ltd/Toonflow-app.git  # 国内推荐
cd Toonflow-app
yarn install && yarn build

# 启动
pm2 start pm2.json
pm2 startup && pm2 save
```

## 四、使用方法与实战

### 标准工作流

1. **配置模型**：在设置中心填写文本模型、图像模型、视频模型的 API 地址和密钥。
2. **新建项目**：导入小说原著，执行章节事件提取，Toonflow 自动生成事件图谱。
3. **剧本生成**：由 ScriptAgent 基于事件图谱生成故事骨架、改编策略与结构化剧本，支持多语言输出。
4. **分镜编排**：切换到 ProductionAgent，在无限画布中组织分镜、素材与视频节点。
5. **视频导出**：对分镜图精调后回流工作台，完成视频拼接与导出。

### Demo 成本参考

使用 Toonflow 制作一段约 2 分钟的 AI 短剧（原始素材 3 分钟），各模型花费明细：

| 模型类型 | 费用 |
|----------|------|
| 语言模型 | 约 ¥10 |
| 视频模型（全量生成） | 约 ¥120 |
| 图片模型 | 不足 ¥1 |
| **合计** | **约 ¥130** |

### 云端免部署方案

官方与**智星云**合作提供商用镜像，开箱即用，无需手动部署 GPU 服务器，官方提供图文部署教程。

## 五、常见问题与解决方案

**Q: macOS 打开应用提示无法验证开发者？**  
A: 前往「系统设置 → 隐私与安全性」，点击"仍要打开"。参考 [知乎文档](https://www.zhihu.com/question/433389276)。

**Q: 首次登录提示模型供应商未配置？**  
A: 在设置中心的「模型服务」页面，填写文本/图像/视频模型的 API 密钥和请求地址，保存后点击空白处确认。

**Q: Docker 构建失败？**  
A: 确保 Docker 版本 >= 20.10，网络畅通。若使用国内网络，建议在 Dockerfile 中配置 `registry.npmmirror.com` 镜像。

**Q: 视频生成时间过长？**  
A: 视频模型耗时与分辨率直接相关，建议在模型服务中降低输出分辨率以加快生成速度。

**Q: 云服务器端口无法访问？**  
A: 检查服务器防火墙和安全组规则，确认 10588 端口已开放。

## 六、总结

Toonflow 是一个将 AI 能力深度整合进短剧生产全链路的开源工具，核心价值在于**三层 Agent 协作体系**和**事件图谱驱动改编**机制——前者保证了生成的稳定性，后者解决了长文本改编中的上下文丢失问题。技术栈选型务实（TypeScript + Express + SQLite），部署方式灵活（桌面客户端 / Docker / 云服务器），且支持多供应商 AI 模型接入，私有化门槛不高。如果你对 AI 视频创作感兴趣，或正在寻找小说影视化的自动化方案，Toonflow 值得一试。

> GitHub：https://github.com/HBAI-Ltd/Toonflow-app  
> 官网：https://toonflow.ai
