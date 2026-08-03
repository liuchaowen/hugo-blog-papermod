---
title: "LiveKit Agents：构建实时多模态语音 AI Agent 的 Python 框架"
date: "2026-08-04"
description: "LiveKit Agents 是一个开源 Python 框架，专为构建实时、可编程的语音 AI Agent 而设计，支持多模态交互、MCP 工具调用和内置测试框架。"
author: "Cheman"
slug: agents
draft: false
categories: ["技术", "开源"]
tags: ["Python", "WebRTC", "语音AI", "LiveKit", "Agent", "MCP", "AI"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**LiveKit Agents**，一个专为构建实时、可编程语音 AI Agent 打造的 Python 开源框架，底层基于 LiveKit 自研的 WebRTC 媒体服务器，支持多模态交互（看、听、理解）和电话 PSTN 接入。

## 一、项目概述

LiveKit Agents 是 LiveKit 生态系统中的一员，定位是让开发者像写普通 Python 代码一样，轻松构建具有生产级质量的实时语音 AI Agent。

**核心特性：**
- **多模态语音交互**：端到端支持 STT（语音识别）→ LLM（推理）→ TTS（语音合成）完整链路，Agent 能看、能听、能理解
- **灵活模型集成**：内置 LiveKit Inference 统一推理 API，也支持直连 OpenAI、Deepgram、Cartesia 等主流供应商插件
- **原生 MCP 支持**：一行代码即可接入 MCP Server 提供的工具生态
- **内置 VAD 与语义打断**：使用 Transformer 模型进行语义级打断，比传统静音检测更精准
- **电话集成**：内置 SIP Trunk 支持，可拨打或接听真实电话号码
- **内置测试框架**：提供基于 pytest 的 Agent 测试方案，支持 LLM Judge 自动化评测
- **全栈开源**：Agent 框架本身、LiveKit Server、媒体服务器全部开源，支持完全自托管

## 二、核心概念与架构

LiveKit Agents 的核心抽象非常清晰，围绕以下几个概念展开：

- **Agent**：基于 LLM 的应用，定义 Agent 的指令（instructions）和工具集（tools）
- **AgentSession**：管理用户交互的核心容器，持有 VAD/STT/LLM/TTS 实例，协调整个对话流程
- **JobContext / Job Harlan**：类似 Web 服务器的请求上下文，入口函数通过 `@server.rtc_session()` 装饰器注册
- **AgentServer**：主进程，负责任务调度和 Agent 启动

其架构设计融合了 Web 服务器的编程模型——开发者不需要了解 WebRTC 的底层细节，只需定义 `entrypoint` 入口函数即可：

```python
from livekit.agents import Agent, AgentSession, JobContext, cli, function_tool, inference

@function_tool
async def lookup_weather(context: RunContext, location: str):
    """查询天气信息"""
    return {"weather": "sunny", "temperature": 70}

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        vad=inference.VAD(),  # 语音活动检测
        stt=inference.STT("deepgram/nova-3", language="multi"),
        llm=inference.LLM("google/gemma-4-31b-it"),
        tts=inference.TTS("cartesia/sonic-3", voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"),
    )

    agent = Agent(
        instructions="You are a friendly voice assistant built by LiveKit.",
        tools=[lookup_weather],
    )

    await session.start(agent=agent, room=ctx.room)
    await session.generate_reply(instructions="greet the user and ask about their day")

if __name__ == "__main__":
    cli.run_app(server)
```

整个架构将 VAD、STT、LLM、TTS 四大组件通过 AgentSession 串联——VAD 检测用户何时说话完毕，STT 把语音转文字，LLM 推理生成回复，TTS 将回复转为语音，通过 WebRTC 实时推送给客户端。开发者只需声明组件实例和 Agent 逻辑，其余交给框架。

## 三、MCP 工具集成与多 Agent 协作

LiveKit Agents 提供了优雅的 MCP 支持，集成 MCP Server 提供的工具只需一行代码：

```python
# 在初始化 Agent 时声明 MCP 服务器地址即可自动发现和调用工具
agent = Agent(
    instructions="你是一个助手，可以使用 MCP 工具",
    mcp_agent=mcp.MCPAgent(...)  # 接入 MCP Server
)
```

对于多 Agent 协作场景，框架支持 Agent 之间的交接（handoff），一个 Agent 可以将对话主动转交给另一个 Agent：

```python
class IntroAgent(Agent):
    async def on_enter(self):
        self.session.generate_reply(instructions="greet the user and gather information")

    @function_tool
    async def information_gathered(self, context: RunContext, name: str, location: str):
        """收集完信息后交接给故事 Agent"""
        context.userdata.name = name
        context.userdata.location = location
        story_agent = StoryAgent(name, location)
        return story_agent, "Let's start the story!"
```

这种设计使得复杂对话流程（客服 → 销售 → 专家）的编排变得极为自然，每个 Agent 专注自己的领域逻辑，通过工具调用完成跨 Agent 协作。

## 四、内置测试框架与质量保障

对于 LLM 应用而言，非确定性行为是最大的测试挑战。LiveKit Agents 提供了一套基于 pytest 的测试方案：

```python
@pytest.mark.asyncio
async def test_no_availability() -> None:
    llm = google.LLM()
    async with AgentSession(llm=llm) as sess:
        await sess.start(MyAgent())
        result = await sess.run(user_input="Hello, I need to place an order.")
        result.expect.skip_next_event_if(type="message", role="assistant")
        result.expect.next_event().is_function_call(name="start_order")
        result.expect.next_event().is_function_call_output()
        # 用 LLM 作为 Judge 评判 Agent 行为是否符合预期
        await result.expect.next_event().is_message(role="assistant").judge(
            llm, intent="assistant should be asking the user what they would like"
        )
```

测试框架提供了基于事件的断言 API（`expect.next_event()`），结合 LLM Judge，可以对 Agent 的行为进行语义级验证——这在传统单元测试框架中是无法实现的。

## 五、部署与运行模式

LiveKit Agents 支持三种运行模式，适应不同的开发阶段：

```bash
# 终端模拟模式，无需外部服务依赖，本地快速验证
python myagent.py console

# 开发模式，热重载 + 连接到 LiveKit Cloud 或自托管服务器
python myagent.py dev

# 生产模式，进程级优化，支持多并发 Agent
python myagent.py start
```

生产部署需要配置 `LIVEKIT_URL`、`LIVEKIT_API_KEY` 和 `LIVEKIT_API_SECRET` 三个环境变量，可通过 LiveKit Cloud 获取或自建 LiveKit Server。

## 六、应用场景与生态

LiveKit Agents 的典型应用场景包括：

- **语音客服/销售助手**：接听来电，理解意图，调用后端工具，完成订单或预约
- **AI 陪练/面试官**：模拟真实对话场景，收集用户反馈并打分
- **视频问诊 AI 助手**：结合 Gemini Live 支持视觉理解，能看到患者发送的图片或视频
- **电话呼出机器人**：主动外呼通知、提醒、调研
- **开发者工具**：通过自然语言查询数据库、搜索代码库、执行操作

其生态极为丰富——支持 50+ 语音/AI 供应商插件，客户端 SDK 覆盖 Browser、iOS、Android、Flutter、Unity、Rust、C++ 等所有主流平台，形成了从服务端到客户端的完整开源技术栈。

## 七、快速开始

```bash
# 安装核心包 + 常用插件（OpenAI + Deepgram 语音识别 + Cartesia 语音合成）
pip install "livekit-agents[openai,deepgram,cartesia]"

# 编写 Agent 代码后，本地终端验证
python myagent.py console

# 环境变量准备好后，连接 LiveKit Cloud 开发调试
LIVEKIT_URL=wss://your-livekit-cloud.livekit.cloud \
LIVEKIT_API_KEY=your_api_key \
LIVEKIT_API_SECRET=your_secret \
python myagent.py dev
```

LiveKit 还提供了 [Agents Playground](https://agents-playground.livekit.io/) 在线体验，以及 React、SwiftUI、Android Compose 等多平台 UI 组件库，开发者可以快速搭建完整的语音 AI 应用。

## 八、总结

LiveKit Agents 最大的价值在于**降低实时语音 AI 的开发门槛**——它将 WebRTC、STT/TTS、LLM 调用、VAD 打断、MCP 工具这些复杂能力整合成一套统一、Pythonic 的 API，开发者无需理解底层协议细节，只需关注业务逻辑。同时，其开源策略（整个技术栈完全开源，支持自托管）和丰富的生态插件，让生产级部署成为可能。如果你正在构建需要语音交互的 AI 应用，LiveKit Agents 是一个值得关注的选择。
