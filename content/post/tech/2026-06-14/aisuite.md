---
title: "aisuite：统一调用多家 LLM 的轻量级 Python 库（by Andrew Ng）"
date: 2026-06-14
description: "介绍 Andrew Ng 开源的 aisuite 项目——一个轻量级 Python 库，提供统一的 Chat Completions API 和 Agents API，支持 OpenAI、Anthropic、Google 等多家 LLM 提供商，并可基于 MCP 协议扩展工具。"
author: "Cheman"
slug: aisuite
draft: false
categories: [技术, 开源]
tags: [LLM, Python, 开源, AI, Andrew Ng]
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

今天在 GitHub Trending 上看到一个有意思的项目：**aisuite**，由 Andrew Ng 主导开源。它解决了一个在 LLM 应用开发中非常真实的痛点：各家 API 接口不统一、切换模型要改大量代码。

## 一、项目概述

**aisuite** 是一个轻量级 Python 库，为 LLM 应用开发提供两层抽象：

- **Chat Completions API**：统一的 OpenAI 风格接口，覆盖 OpenAI、Anthropic、Google、Mistral、Hugging Face、AWS、Cohere、Ollama、OpenRouter 等主流提供商，切换模型只需改一个字符串。
- **Agents API**：在底层之上提供工具调用（Tool Calling）、工具包（Toolkits）和 MCP 协议支持，可直接让模型执行 Python 函数、读写文件、运行 Shell 命令。

项目同时包含一个实战级桌面应用 **OpenCoworker**（源代码在 `platform/` 目录下），可作为基于 aisuite 构建 Agent  harness 的参考实现。

核心特性一览：

| 特性 | 说明 |
|------|------|
| 统一模型名格式 | `<provider>:<model-name>`，如 `openai:gpt-4o` |
| 零改动切换提供商 | 改一个字符串即可切换底层模型 |
| 原生 Tool Calling | 直接传入 Python 函数，aisuite 自动生成 schema 并执行 |
| Agents API | 声明式 Agent + Runner，内置文件/git/Shell 工具包 |
| MCP 原生支持 | 兼容 Model Context Protocol，可接入任意 MCP Server |
| 多后端支持 | 云服务 + 本地（Ollama）均可 |

## 二、技术原理

### 架构分层

```
┌───────────────────────────────────────────────┐
│                 OpenCoworker                  │  Agent 应用层
├───────────────────────────────────────────────┤
│        Agents API  ·  Toolkits  ·  MCP        │   Agent 构建层
├───────────────────────────────────────────────┤
│             Chat Completions API              │   统一 API 层
├────────┬───────────┬────────┬────────┬────────┤
│ OpenAI │ Anthropic │ Google │ Ollama │ Others │  提供商适配层
└────────┴───────────┴────────┴────────┴────────┘
```

### 提供商适配机制

aisuite 通过一套约定优于配置的机制实现提供商的即插即用。新增提供商只需遵循命名规范：

```python
# providers/openai_provider.py
class OpenaiProvider(BaseProvider):
    def chat_completions_create(self, model, messages, **kwargs):
        # 将统一参数转换为 OpenAI SDK 的调用格式
        ...
```

模块文件命名为 `<provider>_provider.py`，类名命名为 `<Provider>Provider`，系统会自动发现并加载，无需注册代码。

### Tool Calling 执行循环

当设置 `max_turns` 参数时，aisuite 内部维护一个多轮对话循环：

1. 将用户消息发给模型
2. 若模型返回工具调用请求，执行对应 Python 函数
3. 将函数返回值追加到消息列表
4. 再次调用模型，直至模型输出最终回复或达到 `max_turns` 上限

完整的交互历史保存在 `response.choices[0].intermediate_messages` 中，方便序列化后继续对话。

### Agents API 与 Toolkits

Agents API 提供了更接近生产级 Agent 框架的抽象：

```python
agent = Agent(
    name="repo-helper",
    model="anthropic:claude-sonnet-4-6",
    instructions="You are a careful repo assistant.",
    tools=[*ai.toolkits.files(root="."), *ai.toolkits.git(root=".")],
)
```

内置工具包：
- `ai.toolkits.files(root)`：沙箱化文件系统读写
- `ai.toolkits.git(root)`：在指定目录执行 git 命令
- `ai.toolkits.shell(root)`：受控 Shell 执行

### MCP 集成

aisuite 原生支持 Model Context Protocol（需安装 `pip install 'aisuite[mcp]'`），可将任意 MCP Server 的工具直接注入模型上下文：

```python
tools=[{
    "type": "mcp",
    "name": "filesystem",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
}]
```

对于需要复用、安全过滤或工具名前缀隔离的场景，可使用 `MCPClient` 进行显式管理。

## 三、安装与快速开始

### 安装

```bash
# 仅安装基础包（不含任何提供商 SDK）
pip install aisuite

# 安装时一并安装指定提供商的 SDK
pip install 'aisuite[anthropic]'
pip install 'aisuite[openai]'

# 安装所有提供商 SDK
pip install 'aisuite[all]'

# 含 MCP 支持
pip install 'aisuite[mcp]'
```

### 最简示例：跨提供商对话

```python
import aisuite as ai

client = ai.Client()

models = [
    "openai:gpt-4o",
    "anthropic:claude-3-5-sonnet-20240620"
]

messages = [
    {"role": "system", "content": "请用海盗英语回复。"},
    {"role": "user", "content": "给我讲个笑话。"},
]

for model in models:
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.75
    )
    print(f"[{model}]\n{response.choices[0].message.content}\n")
```

切换模型只需将 `"openai:gpt-4o"` 改为 `"google:gemini-pro"` 即可，无需改动任何调用代码。

## 四、使用方法与实战

### Tool Calling 实战

```python
def get_weather(city: str, date: str):
    """获取指定城市某天的天气。

    Args:
        city (str): 城市名称
        date (str): 日期，格式 YYYY-MM-DD
    """
    # 实际场景中这里会调用天气 API
    return f"{city} 在 {date} 的天气：晴，26°C"

client = ai.Client()
response = client.chat.completions.create(
    model="openai:gpt-4o",
    messages=[{"role": "user", "content": "北京明天适合爬山吗？"}],
    tools=[get_weather],
    max_turns=3   # 最多 3 轮工具调用循环
)
print(response.choices[0].message.content)
```

### Agents API 实战：代码仓库助手

```python
import aisuite as ai
from aisuite import Agent, Runner

agent = Agent(
    name="repo-analyzer",
    model="anthropic:claude-sonnet-4-6",
    instructions="你是一个代码分析助手，只能通过工具获取信息，不要猜测。",
    tools=[*ai.toolkits.files(root="."), *ai.toolkits.git(root=".")],
)

result = Runner.run(
    agent,
    "最近一次 commit 改了哪些文件？用中文总结改动意图（3 条要点）"
)
print(result.final_output)
```

### Tool Policies：控制工具执行权限

生产环境中通常需要对工具调用进行治理，aisuite 内置了多种策略：

```python
from aisuite.agents.policies import RequireApprovalPolicy

agent = Agent(
    name="safe-agent",
    model="openai:gpt-4o",
    tools=[*ai.toolkits.shell(root=".")],
    # 所有 Shell 工具调用前需人工确认
    tool_policy=RequireApprovalPolicy(tools=["shell.*"])
)
```

也支持 allow/deny list 和自定义 callable 策略函数。

### 状态持久化：跨进程继续对话

```python
from aisuite.agents.state import FileStateStore

store = FileStateStore(path="./agent_runs.json")
agent = Agent(name="persistent-agent", model="openai:gpt-4o", state_store=store)

# 第一次运行
result1 = Runner.run(agent, "帮我分析这个项目")

# 序列化状态后，可在另一个进程/请求中恢复并继续
Runner.run(agent, "接着刚才的分析，补充性能优化建议")
```

## 五、常见问题与解决方案

### Q1：安装后导入报错 `ModuleNotFoundError: No module named 'anthropic'`

**原因**：`pip install aisuite` 只安装基础包，不包含任何提供商的 SDK。
**解决**：按需安装对应 extra，如 `pip install 'aisuite[anthropic]'`，或一次性安装全部：`pip install 'aisuite[all]'`。

### Q2：`max_turns` 用完了但模型还没给出最终答案怎么办？

**原因**：复杂任务可能需要更多轮工具调用。
**解决**：增大 `max_turns` 参数，或检查工具函数实现是否有 bug 导致模型无法获得有效返回。可打印 `response.choices[0].intermediate_messages` 调试每轮交互。

### Q3：本地模型（Ollama）如何接入？

**解决**：aisuite 通过 OpenAI 兼容接口支持 Ollama，安装 `pip install 'aisuite[ollama]'` 后使用 `ollama:model-name` 格式：

```python
client.chat.completions.create(
    model="ollama:llama3",
    messages=[{"role": "user", "content": "Hello"}]
)
```

确保 Ollama 服务已在本地运行（`ollama serve`）。

### Q4：MCP Server 调用时报错 `npx: command not found`

**原因**：使用 MCP 工具时需要系统已安装 Node.js 和 npx。
**解决**：安装 Node.js（含 npx），或使用已安装 MCP Server 的 Python 包替代。

### Q5：如何查看 Agent 的完整执行追踪？

**解决**：aisuite 内置 Artifacts & Tracing 机制，可在 `Runner.run` 时传入 `tracing=True`，或在 Agent 配置中指定 tracing backend，捕获每次工具调用、模型响应和最终产出。

## 六、总结

aisuite 的核心价值在于**降低 LLM 应用的多提供商切换成本**，同时提供从简单补全到生产级 Agent 的渐进式抽象。对于需要在多个 LLM 之间做 A/B 测试、或希望规避单一提供商锁定风险的团队，这是一个非常实用的基础库。

亮点总结：

- **统一接口设计**简洁直观，学习成本低，切换成本几乎为零
- **Tool Calling 抽象**相当优雅，直接传 Python 函数即可，无需手写 JSON schema
- **Agents API** 提供了策略、状态存储、追踪等生产特性，不是"玩具级"抽象
- **MCP 原生支持**使其可以无缝接入日益增长的 MCP 工具生态
- Andrew Ng 亲自背书，社区活跃度值得期待

项目地址：https://github.com/andrewyng/aisuite
