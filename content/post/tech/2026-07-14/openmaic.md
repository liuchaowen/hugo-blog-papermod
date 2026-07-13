---
title: "OpenMAIC：用多智能体把任意主题一键变成沉浸式 AI 互动课堂"
date: 2026-07-14
description: "OpenMAIC（Open Multi-Agent Interactive Classroom）是清华 MAIC 团队开源的 AI 教学平台，基于 LangGraph 多智能体编排，把任意主题或文档一键生成幻灯片、测验、交互仿真与项目式学习，并由可语音、可画白板的 AI 老师和 AI 同学实时授课。本文拆解其架构、技术栈与快速上手。"
author: "Cheman"
slug: openmaic
draft: false
categories: [开源, 技术, AI]
tags: [GitHub Trending, 多智能体, AI教育, LLM, Next.js]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**OpenMAIC**（Open Multi-Agent Interactive Classroom），它用多智能体把任意主题或文档一键变成可语音、可交互的沉浸式 AI 课堂。相比传统 MOOC 的"看视频 + 做题"，它更像把一位 AI 老师和一群 AI 同学请进了你的浏览器。

## 一、项目概述

OpenMAIC 是清华大学 MAIC 团队开源的 AI 教学平台，核心目标是**把"被动观看"重构为"主动探索"**。你只需描述一个主题、或上传一份材料，平台就会通过多智能体编排，自动产出结构化的课堂内容，并由 AI 老师和 AI 同学以语音讲解、白板绘图、实时讨论的方式与你互动。

项目关键特性：

- **一键课程生成**：描述主题或附带资料，AI 在数分钟内搭建完整课程（两阶段：先出大纲，再出场景）。
- **多智能体课堂**：AI 老师与 AI 同学会讲课、讨论，并和你实时互动，包括圆桌辩论、Q&A、课堂讨论。
- **丰富的场景类型**：幻灯片（Slides）、测验（Quiz）、交互式 HTML 仿真（Interactive Simulation）、项目式学习（PBL）。
- **白板与 TTS**：智能体可以在共享白板上一步步推导公式、画流程图，并用语音讲解。
- **随处导出**：可下载可编辑的 `.pptx`、自包含的交互式 `.html`，以及用于备份/分享的课堂 ZIP（支持完全离线播放）。
- **OpenClaw 集成**：通过 `clawhub install openmaic`，可直接在飞书、Slack、Discord、Telegram 等 20+ 聊天应用中"说一句"就生成课堂。

项目已在 JCST'26 发表论文《From MOOC to MAIC: Reimagine Online Teaching and Learning through LLM-driven Agents》，并在 v0.3.0 中将许可证从 AGPL-3.0 改为更宽松的 **MIT**，允许免费商用。

## 二、技术原理

### 2.1 整体技术栈

从 `package.json`（v0.3.0）可见，项目采用现代前端 + 多智能体编排的组合：

- **前端**：Next.js 16、React 19、TypeScript 5、Tailwind CSS 4
- **多智能体编排**：LangGraph 1.1（`@langchain/langgraph`）、`@langchain/core`
- **LLM 抽象**：Vercel AI SDK（`ai` 6.x）及其 `@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/google`、`@ai-sdk/azure` 适配层
- **状态管理**：Zustand 5
- **渲染/可视化**：ECharts 6、KaTeX / Temml（公式）、`@xyflow/react`（编排可视化）、`motion`（动画）

### 2.2 四大核心引擎

README 的"Project Structure"明确列出了四个核心模块，这也是理解 OpenMAIC 架构的关键：

| 引擎 | 路径 | 职责 |
|------|------|------|
| 生成流水线 | `lib/generation/` | 两阶段：大纲生成 → 场景内容生成 |
| 多智能体编排 | `lib/orchestration/` | 基于 LangGraph 的状态机，管理智能体轮次与讨论 |
| 播放引擎 | `lib/playback/` | 驱动课堂播放与实时交互的状态机 |
| 动作引擎 | `lib/action/` | 执行 28+ 种动作类型（语音、白板绘制/文本/图形/图表、聚光、激光笔等） |

**生成流水线（两阶段）**是教学质量的基础：

| 阶段 | 发生的事 |
|------|----------|
| Outline（大纲） | AI 分析你的输入，生成结构化的课程大纲 |
| Scenes（场景） | 大纲每一项变成一个富场景——幻灯片、测验、交互模块或 PBL 活动 |

**多智能体编排**用 LangGraph 把"谁发言、何时发言、讨论如何收敛"建模成有向图（director graph）；**播放引擎**则把课程从 `idle → playing → live` 推进；**动作引擎**负责把"老师画一条抛物线"这样的语义动作，翻译成白板上的 SVG 绘制指令 + 聚光特效 + 语音合成调用。

### 2.3 安全边界：Access Code 的中间件校验

当多人共享部署时，OpenMAIC 支持用 `ACCESS_CODE` 给站点加一道密码。其 `middleware.ts` 用 Edge 兼容的 Web Crypto API 做 **HMAC-SHA256 签名校验**，而非简单地判断 cookie 是否存在：

```ts
async function verifyToken(token: string, accessCode: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(accessCode),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = bufToHex(await crypto.subtle.sign('HMAC', key, encode(timestamp)));

  // 定长比较，避免时序侧信道
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
```

中间件对所有 `/api/*` 路由（白名单除外）强制要求有效签名，页面请求则放行由前端弹窗处理，兼顾了安全性与体验。

### 2.4 构建与运行时隔离

`next.config.ts` 中有一处值得注意的工程细节：部分 agent 包在运行时用**动态 `import(specifier)`** 懒加载 `node:fs/os/path`，以避免破坏浏览器/Vite 构建。Webpack 无法静态分析这种动态导入，因此在服务端将其标记为外部包原生加载：

```ts
serverExternalPackages: ['@earendil-works/pi-ai', '@earendil-works/pi-agent-core'],
```

此外，项目对 `lib/choreography`（共享编排规范）等模块用 ESLint **机器强制**了包边界——禁止出现 `@/` 宿主路径别名字符串，禁止引入 React/DOM/动画运行时，从而保证"课堂视频导出器"能在纯 Node 环境中解释编排时间线。这种"用 lint 守架构边界"的做法，对大型 AI 应用非常有借鉴意义。

## 三、安装与快速开始

### 3.1 环境要求

- **Node.js** >= 20
- **pnpm** >= 10

### 3.2 本地启动

```bash
git clone https://github.com/THU-MAIC/OpenMAIC.git
cd OpenMAIC
pnpm install
```

复制环境变量模板并填入至少一个 LLM 提供商的 Key：

```bash
cp .env.example .env.local
```

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

随后启动开发服务器：

```bash
pnpm dev
```

打开 **http://localhost:3000** 即可开始学习。生产构建：

```bash
pnpm build && pnpm start
```

### 3.3 支持的模型提供商

OpenMAIC 的抽象层支持广泛：OpenAI、Azure OpenAI、Anthropic、Google Gemini、DeepSeek、Qwen、Kimi、MiniMax、Grok (xAI)、OpenRouter、Doubao、腾讯混元/TokenHub、小米 MiMo、智谱 GLM、Ollama（本地），以及 **Lemonade**（本地 LLM/图像/TTS/ASR，无需 API Key）。你也可以用任意 OpenAI 兼容 API。官方推荐默认模型为 **Gemini 3 Flash**（质量与速度的平衡），追求最高质量可换 Gemini 3.1 Pro：

```env
DEFAULT_MODEL=google:gemini-3-flash-preview
```

## 四、使用方法与实战

### 4.1 一句话生成课堂

进入首页后，直接描述你想学的内容，例如：

- "用 30 分钟从零教我 Python"
- "怎么玩桌游阿瓦隆（Avalon）"
- "分析智谱和 MiniMax 的股价"
- "拆解最新的 DeepSeek 论文"

AI 会自动走完"大纲 → 场景"两阶段，并产出带语音讲解、聚光灯与激光笔动画的幻灯片。

### 4.2 Deep Interactive Mode（深度互动模式）

除了标准模式快速生成内容，Deep Interactive Mode 进一步提供五类可动手探索的交互式 UI：

- **🌐 3D 可视化**：把抽象结构三维化，更直观
- **⚙️ 仿真**：过程模拟与实验环境，观察动态变化
- **🎮 游戏**：知识小游戏，强化记忆
- **🧭 思维导图**：结构化组织知识，搭建概念框架
- **💻 在线编程**：浏览器内写代码并即时运行

AI 老师还能主动操作这些 UI 来引导你——高亮重点区域、设置条件、给出提示，并在恰当时机把注意力引向关键点。

### 4.3 项目式学习（PBL）

选择角色后，与 AI 智能体在结构化项目上协作，按里程碑和交付物推进，适合职业/专业技能训练。v0.3.0 还引入了 PBL v2 + 课堂 UI、可选的阶段级模型路由，以及 `@openmaic/*` SDK 家族（DSL / renderer / importer 已发布到 npm）。

### 4.4 从聊天应用里生成课堂（OpenClaw）

如果你用 OpenClaw，只需：

```bash
clawhub install openmaic
```

然后告诉助手"教我量子物理"即可。支持两种模式：

- **Hosted 模式**：在 [open.maic.chat](https://open.maic.chat/) 领取 access code，零本地配置。
- **Self-hosted 模式**：技能会一步步引导你 clone、配置、启动。

每一步都会先征求你的确认，没有黑盒自动化。

### 4.5 导出与离线播放

| 格式 | 说明 |
|------|------|
| PowerPoint (.pptx) | 带图片、图表、LaTeX 公式的可编辑幻灯片 |
| Interactive HTML | 含交互仿真的自包含网页 |
| Classroom ZIP | 完整课堂导出（课程结构 + 媒体），用于备份或分享 |

特别地，导出 `.maic.zip` 或资源包时，OpenMAIC 会把交互场景引用的外部资源（KaTeX、Three.js、`three/addons`、Tailwind CDN、Google 字体、图片）内联为 `data:` URI，使得导入到内网/离线实例后可**完全离线播放**，无需再访问公共 CDN。

## 五、常见问题与解决方案

**Q1：安装失败 / `pnpm install` 报错？**
确保 Node >= 20、pnpm >= 10。`postinstall` 会自动构建 `mathml2omml`、`pptxgenjs` 及 `@openmaic/*` 等 workspace 包；如原生编译失败，注意 README 在 Dockerfile 中要求 `python3 build-base g++ cairo-dev pango-dev` 等系统依赖（本地裸装同样需要这些图形/原生库）。

**Q2：课堂生成卡住或模型无响应？**
确认 `.env.local` 中至少配置了一个可用的 LLM Key，且 `DEFAULT_MODEL` 指向的提供商已正确填写 Base URL / 部署名（如 Azure 需 `AZURE_OPENAI_BASE_URL` 与 `AZURE_OPENAI_MODELS`）。

**Q3：想本地离线、不依赖外部 API？**
可使用 **Ollama**（本地模型）或 **Lemonade**（本地 LLM/图像/TTS/ASR，无需 Key），分别通过 provider 配置或 `LEMONADE_BASE_URL=http://localhost:13305/v1` 接入。

**Q4：TTS 想要特定/克隆音色？**
OpenMAIC 支持 VoxCPM2 自托管 TTS 与语音克隆，可在 Settings → TTS → VoxCPM2 选择 Auto / Prompt / Clone 三种音色模式；也可接入任意自定义 TTS/ASR 提供商。

**Q5：共享部署如何防止未授权访问？**
设置 `ACCESS_CODE`，中间件会以 HMAC 签名校验所有 API 路由（见上文 2.3）；页面访问由前端密码弹窗处理。

**Q6：导出PPT里公式/图表不正确？**
项目对 MathML → Office Math 使用 `packages/mathml2omml`（LGPL-3.0），对 PPT 生成使用定制版 `pptxgenjs`；确保 postinstall 已成功构建这些包。

## 六、总结

OpenMAIC 把"LLM 驱动的多智能体"真正落到了**教学场景的端到端体验**上：从两阶段生成流水线、LangGraph 编排、到白板/语音/交互仿真的一整套动作引擎，工程完成度很高，且通过 ESLint 机器强制包边界、HMAC 鉴权等细节体现了工业级思考。MIT 许可证 + 一键 Vercel/Docker 部署 + OpenClaw 集成，让它既适合个人学习，也适合团队快速搭建内部培训平台。如果你正在关注 AI 教育或想用一个"开箱即用的多智能体编排范例"，这个项目值得 star 并深入读其源码。

> 项目地址：<https://github.com/THU-MAIC/OpenMAIC>
