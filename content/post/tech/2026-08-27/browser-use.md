---
title: "Browser Use：让 AI 真正操控浏览器的开源利器"
date: "2026-08-27"
description: "Browser Use 是一个开源的 AI 浏览器自动化框架，让大语言模型通过自然语言指令控制浏览器完成复杂任务，如填表、数据抓取、内容提取等，支持 OpenAI、Anthropic、Google 等多模型。"
author: "Cheman"
slug: browser-use
draft: false
categories: ["技术", "开源"]
tags: ["AI", "浏览器自动化", "Python", "开源", "大模型"]
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

今天在 GitHub Trending 上看到一个让人眼前一亮的项目：**Browser Use**，它能让 AI 智能体像真人一样操控浏览器——打开网页、点击按钮、输入文字、填写表单，真正实现"用自然语言指挥浏览器干活"。在 Odysseys 基准测试中，它以 **87.4%** 的平均得分位居第一，超越了 OpenAI、Anthropic、Google 和 Microsoft 的同类方案。

## 一、项目概述

Browser Use 由 Magnus Müller 和 Gregor Zunic 开发，是一个将大语言模型（LLM）与浏览器自动化深度融合的开源框架。与传统的 Selenium/Playwright 不同，它不需要你写代码去定位元素——只需用自然语言描述任务，AI 就能理解页面结构、自主规划操作步骤并执行。

**核心特性：**

- **自然语言驱动**：用一句话描述任务，AI 自动完成复杂的多步骤浏览器操作
- **多模型支持**：内置优化的 `ChatBrowserUse` 模型，也可接入 OpenAI GPT、Claude、Gemini、Ollama 等
- **MCP 协议集成**：支持 Model Context Protocol，可与 Claude Code、Cursor、OpenClaw 等 AI Agent 无缝对接
- **云端/本地双模式**：本地开源版免费使用，云端版提供更强能力（代理轮换、CAPTCHA 解决、规模化运行）
- **100+ 真实任务基准第一**：在 Odysseys 200 步长视野任务中达到 87.4% 平均准确率

## 二、技术原理

### 2.1 整体架构

Browser Use 的核心思路是**将浏览器操作封装为 LLM 可理解的 Action 空间**。Agent 接收到任务后，会：

1. **视觉 + DOM 分析**：利用 Playwright 获取页面截图和 DOM 树结构
2. **LLM 推理决策**：将页面信息发送给 LLM，LLM 决定下一步操作（如"点击登录按钮"、"在搜索框输入 XXX"）
3. **Action 执行**：通过 CDP（Chrome DevTools Protocol）执行决策的操作
4. **循环迭代**：重复步骤 1-3 直到任务完成

```python
import asyncio
from browser_use import Agent, ChatBrowserUse

async def main():
    agent = Agent(
        task="Find the number of stars of the browser-use repo",
        llm=ChatBrowserUse(model='openai/gpt-5.5'),
    )
    history = await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
```

### 2.2 关键依赖

从 `pyproject.toml` 可以看出核心技术栈：

| 依赖 | 作用 |
|------|------|
| `cdp-use==1.4.5` | Chrome DevTools Protocol 底层通信 |
| `playwright` | 浏览器控制（由 `browser-use-core` 提供） |
| `openai` / `anthropic` / `google-genai` | 多 LLM 提供商接入 |
| `mcp==1.26.0` | MCP 协议支持 |
| `pypdf` / `python-docx` | 文档内容提取 |
| `markdownify` | 页面文本提取 |

### 2.3 Agent 执行流程源码解析

从项目结构来看，`Agent` 是核心类，内部通过 `AgentHistory` 管理执行状态。关键流程在 `browser_use/agent/` 目录下：

```
browser_use/
├── agent/
│   ├── system_prompts/   # Agent 系统提示词（定义可用 Action）
│   └── *.py              # Agent 状态管理、决策循环
├── llm/                  # LLM 适配器（OpenAI/Claude/Gemini/Ollama）
├── browser/              # 浏览器会话管理
└── controller/           # Action 控制器（点击、输入、滚动等）
```

系统提示词中预定义了 Agent 可执行的 Action 集合（如 `click`、`type`、`go_to_url`、`extract_content` 等），LLM 在每轮推理时从这些 Action 中选择最合适的一个。

### 2.4 自定义工具扩展

可以通过装饰器为 Agent 添加自定义工具：

```python
from browser_use import Tools

tools = Tools()

@tools.action(description='Description of what this tool does.')
def custom_tool(param: str) -> str:
    return f"Result: {param}"

agent = Agent(
    task="Your task",
    llm=llm,
    browser=browser,
    tools=tools,
)
```

## 三、安装与快速开始

### 3.1 环境要求

- Python >= 3.11（推荐 3.12）
- Chrome/Chromium 浏览器
- LLM API Key（OpenAI / Anthropic / Google 等）

### 3.2 安装步骤

```bash
# 使用 uv 安装（推荐）
uv add browser-use

# 或使用 pip
pip install browser-use
```

### 3.3 最简运行示例

```python
# .env
BROWSER_USE_API_KEY=your-key
# GOOGLE_API_KEY=your-key
# ANTHROPIC_API_KEY=your-key

# main.py
import asyncio
from browser_use import Agent, ChatBrowserUse

async def main():
    agent = Agent(
        task="Fill in this job application with my resume and information.",
        llm=ChatBrowserUse(model='openai/gpt-5.5'),
    )
    await agent.run()

asyncio.run(main())
```

### 3.4 Docker 部署

项目提供了完整的 Dockerfile，支持多架构（linux/amd64, linux/arm64）构建：

```bash
git clone https://github.com/browser-use/browser-use.git && cd browser-use
docker build . -t browseruse --no-cache
docker run -v "$PWD/data":/data browseruse
```

## 四、使用方法与实战

### 4.1 基础用法场景

**场景一：表单自动填写**
```python
agent = Agent(
    task="Fill in this job application with my resume and information.",
    llm=ChatBrowserUse(model='bu-2-0-mini-preview'),
)
```

**场景二：数据提取与导出**
```python
agent = Agent(
    task="Extract structured data about my followers and export it as a CSV.",
    llm=llm,
)
```

**场景三：多步骤信息搜集**
```python
agent = Agent(
    task="Compare these three laptops and give me a table with prices.",
    llm=llm,
)
```

### 4.2 与 AI Agent 集成（MCP）

Browser Use 还提供了 MCP Server，可以让 Claude Code、Cursor、OpenClaw 等 AI Agent 直接"操控浏览器"：

```text
Install or upgrade browser-use to the latest stable version with uv using Python 3.12, run `browser-use skill install` to register the skill, and connect it to my browser.
```

### 4.3 认证与会话管理

- **复用 Chrome 配置**：使用真实浏览器 Profile，保持登录状态
- **临时邮箱**：配合 AgentMail 使用临时账号
- **远程浏览器同步**：`profile-use` 工具可同步本地 Chrome 配置到云端浏览器

## 五、常见问题与解决方案

**Q: 安装后运行报错找不到浏览器？**
确保已安装 Chromium：`playwright install chromium`，或使用 Docker 镜像（已内置）。

**Q: 如何选择最佳模型？**
项目优化了 `ChatBrowserUse` 模型专用于浏览器自动化任务，速度比其他模型快 3-5 倍，且精度更高。私有模型中，Claude Sonnet 和 GPT-5 表现也不错。

**Q: 云端版和开源版有什么区别？**
开源版免费、本地运行、自行管理浏览器指纹。云端版提供更强的隐匿性（代理轮换、CAPTCHA 解决）、规模化并行执行和持久化文件系统。

**Q: 如何提升大规模任务稳定性？**
生产环境建议使用云端 API，避免本地 Chrome 内存问题。可参考官方[生产部署指南](https://docs.browser-use.com/cloud/agent/scripts)。

## 六、总结

Browser Use 真正做到了"让 AI 操控浏览器像真人一样"，它在 Odysseys 基准上 87.4% 的准确率也证明了技术实力。对于需要自动化网页操作、数据采集、批量表单填写等重复性工作的场景，它提供了一套优雅的自然语言解决方案。更难得的是，项目完全开源，你可以在本地免费使用，也可以接入云端获得更强能力。

**项目地址**：https://github.com/browser-use/browser-use
**文档**：https://docs.browser-use.com
