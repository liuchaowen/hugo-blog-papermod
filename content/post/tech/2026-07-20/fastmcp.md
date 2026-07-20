---
title: "FastMCP：用 Python 快速构建生产级 MCP 服务端与客户端"
date: "2026-07-20"
description: "GitHub trending 项目 PrefectHQ/fastmcp 是 Model Context Protocol（MCP）的 Python 框架，只需几行代码即可构建 MCP 服务端、客户端和交互式 App，日下载量破百万，是目前最主流的 MCP 开发框架。"
author: "Cheman"
slug: fastmcp
draft: false
categories: ["技术", "开源", "AI"]
tags: ["MCP", "Model Context Protocol", "Python", "GitHub", "AI Agent", "LLM", "工具调用"]
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

今天在 GitHub Trending 上看到一个让人眼前一亮的项目：[PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp)，这是 Model Context Protocol（MCP）的 Python 框架，只需几行代码就能构建 MCP 服务端、客户端和交互式 App，目前日均下载量突破百万，是 MCP 生态中下载量最高的框架。

## 一、项目概述

[Model Context Protocol](https://modelcontextprotocol.io/)（MCP）是 Anthropic 在 2024 年推出的开放协议，旨在让大语言模型（LLM）安全可控地连接外部工具和数据源。MCP 的核心价值在于**标准化**：无论数据源是数据库、API 还是文件系统，LLM 通过同一套协议与它们通信，开发者只需实现一次，模型即可复用。

FastMCP 脱胎于 [Prefect](https://www.prefect.io/) 团队的生产实践，为 MCP 提供了一套 Pythonic 的开发框架。它有三大核心能力：

**Servers（服务端）**：将 Python 函数快速暴露为 MCP 工具、资源和提示词，声明式 API 自动处理 schema 生成、参数校验和文档注释。

**Clients（客户端）**：连接到任意 MCP 服务端（本地或远程），完整实现 MCP 协议栈，支持 stdio 和 HTTP/SSE 两种传输方式，无需关心握手和生命周期管理。

**Apps（交互式应用）**：在对话中直接渲染交互式 UI（表单、文件上传、下拉选择等），LLM 可以调用带 UI 的工具，结果以富组件形式展现，而非纯文本。

## 二、技术原理

### 2.1 声明式工具注册

FastMCP 的核心设计哲学是**最佳实践内置**。开发者只写业务逻辑，框架自动完成其余工作：

```python
from fastmcp import FastMCP

mcp = FastMCP("Demo 🚀")

@mcp.tool
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool
def query_users(limit: int = 10) -> list[dict]:
    """Query users from database"""
    return [{"id": i, "name": f"User {i}"} for i in range(limit)]

if __name__ == "__main__":
    mcp.run()
```

装饰器 `@mcp.tool` 会自动从函数签名和 docstring 提取工具的 JSON Schema，生成规范化的 MCP 响应，无需手动编写 `name`、`description`、`inputSchema`。

### 2.2 三层架构

从 `pyproject.toml` 可以看出项目采用 monorepo 结构，包含三个核心子包：

| 子包 | 职责 |
|------|------|
| `fastmcp` | 完整发行版，包含 server/client/apps 所有功能 |
| `fastmcp_slim` | 轻量版，仅含服务端核心（server + tools/resources/prompts），适合对包体积有要求的场景 |
| `fastmcp_remote` | 远程连接支持，处理 HTTP/SSE 传输层 |

```python
# pyproject.toml 核心依赖结构
[project]
name = "fastmcp"
requires-python = ">=3.10"   # Python 3.10+ 是硬性要求

[tool.uv.workspace]
members = ["fastmcp_slim", "fastmcp_remote"]  # uv workspace 管理多包
```

### 2.3 Apps：对话内交互式 UI

FastMCP Apps 允许 MCP 工具返回可交互的 UI 组件，直接渲染在 AI 对话界面中：

```python
@mcp.tool
def upload_file():
    """Upload a file with interactive UI"""
    return mcp.render_ui(
        component="file-upload",
        props={"accept": "image/*", "multiple": True}
    )
```

这解决了传统 MCP 工具只能返回文本的痛点，让 AI Agent 可以完成文件上传、参数选择等需要人类交互的任务。

### 2.4 Horizon：企业级 MCP 网关

FastMCP 团队同步推出了 [Prefect Horizon](https://www.prefect.io/horizon)，定位为企业级 MCP 网关，提供：

- 从 GitHub 一键部署 FastMCP 服务器，支持分支预览和秒级回滚
- 私有 MCP 工具注册表，统一管理企业所有 MCP 资源
- SSO 单点登录 + 工具级别 RBAC 权限控制
- 完整的 MCP 调用审计日志和可观测性

## 三、安装与快速开始

### 环境要求

- Python ≥ 3.10
- 推荐使用 [uv](https://docs.astral.sh/uv/) 包管理器（Astral 官方出品，比 pip 快 10-100 倍）

### 安装

```bash
# 方式一：uv（推荐，Prefect 官方推荐）
uv pip install fastmcp

# 方式二：pip
pip install fastmcp

# 完整功能版（含 Apps 支持）
uv pip install "fastmcp[apps]"

# 远程连接支持
uv pip install "fastmcp[openai]"   # OpenAI 模型
uv pip install "fastmcp[anthropic]" # Anthropic 模型
uv pip install "fastmcp[gemini]"    # Google Gemini
uv pip install "fastmcp[azure]"     # Azure OpenAI
```

> [!NOTE]
> 如果从 FastMCP 3.2 或更早版本通过 `pip install --upgrade` 升级后遇到 `import fastmcp` 报错，运行 `pip install --force-reinstall fastmcp` 即可解决（uv 用户不受影响）。

### 快速运行示例

```python
# 保存为 server.py
from fastmcp import FastMCP

mcp = FastMCP("My Assistant")

@mcp.tool
def get_weather(city: str) -> str:
    """Get current weather for a city"""
    return f"Weather in {city}: 22°C, sunny"

@mcp.resource
def user_guide() -> str:
    """User guide document"""
    return "Welcome to My Assistant!"

# 启动（默认 stdio 模式）
mcp.run()
```

## 四、使用方法与实战

### 4.1 连接到远程 MCP 服务端

使用 `fastmcp_remote` 包连接远程服务端：

```python
from fastmcp import Client

async with Client("https://api.example.com/mcp") as client:
    # 调用远程工具
    result = await client.call_tool("get_weather", {"city": "Shanghai"})
    print(result)

    # 读取远程资源
    users = await client.read_resource("users://all")
```

### 4.2 进阶：OAuth 认证

对于需要认证的 MCP 服务端，FastMCP 支持 OAuth 2.0 流程：

```python
from fastmcp import Client
from fastmcp.client.oauth import OAuthConfig

config = OAuthConfig(
    client_id="your_client_id",
    client_secret="your_client_secret",
    auth_url="https://auth.example.com/oauth/authorize",
    token_url="https://auth.example.com/oauth/token",
)

async with Client("https://api.example.com/mcp", auth=config) as client:
    result = await client.call_tool("secure_tool", {})
```

### 4.3 结合 LLM 使用

FastMMC 可以与各种 LLM Provider 无缝集成，构建完整的 Agent 应用：

```python
from fastmcp import Client, FastMCP

# 定义 MCP 工具集
mcp = FastMCP("Data Assistant")
@mcp.tool
def sql_query(query: str) -> str:
    """Execute SQL query"""
    return f"Query result for: {query}"

# 在 Agent 中使用
async def agent_loop(user_input: str):
    async with Client(mcp) as client:
        tools = client.list_tools()
        # 将 tools 注入 LLM prompt
        response = llm.complete(
            f"User: {user_input}\nAvailable tools: {tools}"
        )
        return response
```

## 五、常见问题与解决方案

**Q1：安装后 `import fastmcp` 报错怎么办？**
从旧版本（≤ 3.2）升级后若遇导入错误，运行 `pip install --force-reinstall fastmcp`。这是因为旧版包结构和新版不兼容，强制重装可解决。uv 用户无此问题。

**Q2：如何处理 MCP 服务端的连接超时？**
FastMCP 支持配置超时参数：
```python
async with Client(url, timeout=30.0) as client:
    ...
```

**Q3：Python 版本低于 3.10 无法使用？**
FastMCP 最低要求 Python 3.10。可使用 `pyenv` 或 `uv python pin 3.10` 管理多 Python 版本。

**Q4：Apps UI 不生效？**
确保安装了带 Apps 扩展的版本：`uv pip install "fastmcp[apps]"`，并确认你的 LLM Provider 支持渲染 App 组件。

**Q5：MCP 服务器部署到生产环境有什么推荐方案？**
推荐使用 Prefect Horizon 一键部署，支持 GitHub 集成、分支预览和环境变量管理，避免手动部署的运维负担。

## 六、总结

FastMCP 将 MCP 协议的开发门槛降到了最低：几行 Python 代码就能拥有一个完整、规范的生产级 MCP 服务端或客户端。它背后的 Prefect 团队将多年在数据编排领域积累的最佳实践——错误处理、超时控制、认证机制——全部内置进框架，让开发者专注于业务逻辑。

从生态角度看，FastMCP 已被整合进官方 MCP Python SDK，日均下载量破百万，是目前 MCP 生态中认可度最高的 Python 框架。如果你正在构建 AI Agent 或 LLM 应用，需要连接外部工具和数据，FastMCP 是值得优先考虑的选择。
