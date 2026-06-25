---
title: "Page Agent — 运行在网页里的 GUI Agent，用自然语言控制 Web 界面"
date: 2026-06-26
description: "阿里巴巴开源的 Page Agent 是一个纯客户端运行的 GUI Agent，无需浏览器扩展或服务端自动化，直接用 JavaScript 注入即可让自然语言操控网页 UI，适合 SaaS AI Copilot、智能表单填充等场景。"
author: "Cheman"
slug: page-agent
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, LLM, Web自动化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Page Agent**，它是"活在网页里的 GUI Agent"——不需要浏览器扩展、不需要 Python 后端、不需要无头浏览器，只需一段 JavaScript 就能让自然语言直接操控网页界面。

## 一、项目概述

**Page Agent**[^1] 是阿里巴巴开源的一个客户端侧 Web UI 自动化 Agent，核心理念是：

> The GUI Agent Living in Your Webpage. Control web interfaces with natural language.

与传统 Web 自动化工具（如 Playwright、Selenium）的本质区别：

| 维度 | 传统方案 | Page Agent |
|------|---------|------------|
| 运行位置 | 服务端/本地脚本 | 网页内部（纯 JS） |
| 依赖 | 浏览器驱动/扩展 | 无（仅 script 标签） |
| 多模态 | 常需截图+视觉模型 | 纯 DOM 文本分析 |
| 集成成本 | 高（需后端改造） | 极低（一行 script） |
| LLM | 通常服务端调用 | 支持自定义（BYO LLM） |

**核心使用场景：**
- **SaaS AI Copilot** — 在产品中嵌入 AI 助手，无需重写后端
- **智能表单填充** — 把 20 次点击变成一句话
- **无障碍访问** — 用自然语言/语音控制任何 Web 应用
- **多页面 Agent** — 通过 Chrome 扩展跨越 Tab 边界
- **MCP Server** — 让外部 Agent 客户端控制浏览器

## 二、技术原理

### 架构设计

Page Agent 采用 **Monorepo（npm workspaces）** 架构，核心包分工如下：

```
packages/
├── page-controller/   # DOM 操控层（点击、输入、滚动等）
├── llms/              # LLM 调用封装（支持 OpenAI 兼容接口）
├── core/              # 核心 Agent 逻辑（规划 + 执行循环）
├── page-agent/        # 主包，对外暴露 PageAgent 类
├── ui/                # 内置聊天 UI 组件
├── extension/         # Chrome 扩展（多页面任务）
└── mcp/               # MCP Server（Beta）
```

### 核心技术：基于文本的 DOM 操控

与传统视觉方案（截图 + GPT-4V）不同，Page Agent **完全基于 DOM 文本分析**：

1. **DOM 序列化**：将页面 DOM 树转换为结构化文本描述（类似 `browser-use` 的方案）
2. **动作规划**：将用户指令发给 LLM，LLM 返回下一步动作（点击哪个元素、输入什么内容）
3. **动作执行**：`page-controller` 包在页面内直接执行 DOM 操作
4. **循环迭代**：观察执行结果，规划下一步，直到任务完成

这种方式的好处是：
- 不需要截图，省去视觉模型的成本和延迟
- 不需要特殊权限（截图需要 `tabs.captureVisibleTab` 等）
- 对网络环境要求更低（纯文本 token 比图片小得多）

### 与 browser-use 的关系

项目在 LICENSE 中明确说明，DOM 处理组件和 prompt 派生自 [browser-use](https://github.com/browser-use/browser-use)：

> DOM processing components and prompt are derived from browser-use.
> PageAgent is designed for client-side web enhancement, not server-side automation.

关键区别：browser-use 是 **服务端 Python 自动化**，Page Agent 是 **客户端 JS 增强**。

### 类型安全与工程质量

从 `package.json` 和 `tsconfig` 可以看出项目对 TypeScript 类型检查的要求：

```json
"scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.typecheck.json && tsc --noEmit -p packages/extension/tsconfig.json"
}
```

ESLint 配置中虽然关闭了大量 `@typescript-eslint` 规则（为了开发效率），但保留了 `typecheck` 脚本作为 CI 门禁，这是一个务实的工程实践。

## 三、安装与快速开始

### 方式一：一行脚本接入（最快）

使用官方提供的免费测试 LLM（仅评估用途）：

```html
<script src="https://cdn.jsdelivr.net/npm/page-agent@1.10.0/dist/iife/page-agent.demo.js" crossorigin="true"></script>
```

国内镜像：

```html
<script src="https://registry.npmmirror.com/page-agent/1.10.0/files/dist/iife/page-agent.demo.js" crossorigin="true"></script>
```

加载后页面会自动出现 Demo Agent 聊天界面。

> ⚠️ 该 Demo CDN 使用免费测试 LLM API，仅用于技术评估。

### 方式二：NPM 安装（生产推荐）

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'qwen3.5-plus',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'YOUR_API_KEY',
    language: 'zh-CN',  // 支持中文指令
})

await agent.execute('点击登录按钮')
```

### 方式三：Chrome 扩展（多页面任务）

适用于需要跨 Tab 操作的场景（如"在 Google 搜索某个内容，然后打开第一个结果并提交表单"）：

```bash
npm run dev:ext
# 然后在 Chrome 加载扩展
```

## 四、使用方法与实战

### 基础用法：编程式调用

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'gpt-4o',
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'sk-...',
    language: 'en-US',
})

// 执行单个指令
await agent.execute('Fill in the email field with test@example.com')

// 执行多步任务
await agent.execute('Search for "Page Agent" on GitHub, then star the repo')
```

### 进阶用法：自定义 LLM 接入

Page Agent 支持任何 OpenAI 兼容接口，这意味着可以接入：

- OpenAI / Azure OpenAI
- 阿里云百炼（DashScope）
- 深度求索（DeepSeek）
- 本地 Ollama（`baseURL: 'http://localhost:11434/v1'`）

```javascript
const agent = new PageAgent({
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: 'sk-...',
    language: 'zh-CN',
    // 可选：自定义系统提示
    systemPrompt: '你是一个专业的 Web 自动化助手...',
})
```

### 实际场景：SaaS 产品内嵌 AI Copilot

只需在产品中引入 script，即可为用户提供自然语言操作能力：

```html
<script>
window.addEventListener('load', () => {
    const agent = new window.PageAgent({
        model: 'your-model',
        baseURL: 'your-api-endpoint',
        apiKey: 'your-key',
        // 不自动弹出 UI，手动控制
        autoInit: false,
    })
    // 绑定到产品的"AI 助手"按钮
    document.getElementById('ai-btn').onclick = () => agent.execute('Help me...')
})
</script>
```

## 五、常见问题与解决方案

### Q1：Demo CDN 的免费 LLM 能用在生产环境吗？

**不能。** 官方明确说明该 Demo API 仅用于技术评估，生产环境请使用自己的 LLM API Key。

### Q2：Page Agent 能做到跨域操作吗？

纯脚本模式受同源策略限制，只能操作当前页面。跨页面/跨域需要配合 **Chrome 扩展** 使用。

### Q3：支持哪些 LLM？

任何 OpenAI 兼容 API 都支持。官方测试过：GPT-4o、Qwen 3.5+、DeepSeek V3。

### Q4：和服务端的 Playwright 自动化相比有什么优势？

| 场景 | 推荐方案 |
|------|---------|
| 需要后端定时爬取数据 | Playwright |
| SaaS 产品内嵌 AI 助手 | Page Agent |
| 需要用户实时交互 | Page Agent |
| 需要绕过反爬机制 | Playwright |

### Q5：TypeScript 类型支持如何？

项目使用 `tseslint.configs.recommendedTypeChecked` + `strictTypeChecked`，类型覆盖率较高。Monorepo 各子包均有独立的 `tsconfig.json`。

## 六、总结

Page Agent 最大的创新点在于**把 GUI Agent 从服务端搬到了客户端**——这让 Web 应用的 AI 化改造成本从"重写后端"降到"加一行 script"，对于想快速给产品加上 AI Copilot 的团队来说，是一个非常务实的选择。

项目目前 v1.10.0，MIT 协议，由阿里巴巴团队维护。如果你正在做 SaaS 产品的 AI 化，或者需要一个轻量的 Web 自动化方案，值得一试。

**相关链接：**
- GitHub：https://github.com/alibaba/page-agent
- 在线 Demo：https://alibaba.github.io/page-agent/
- 文档：https://alibaba.github.io/page-agent/docs/introduction/overview

[^1]: Page Agent 的 DOM 处理组件派生自 browser-use 项目，遵循 MIT 协议。项目明确不接受完全由 AI/Bot 生成的 PR。
