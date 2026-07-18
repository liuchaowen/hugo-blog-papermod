---
title: "Kimi CLI：月之暗面推出的终端 AI Agent，把 Shell、IDE 与 MCP 串成一条工作流"
date: 2026-07-19
description: "Kimi CLI 是 Moonshot AI 出品的终端 AI Agent，可读写代码、执行 Shell、抓取网页，并通过 ACP 接入 IDE、通过 MCP 接入工具生态。本文从源码剖析其架构、技术栈与实战用法。"
author: "Cheman"
slug: kimi-cli
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 终端, MCP, CLI]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Kimi CLI**——月之暗面（Moonshot AI）推出的终端 AI Agent，它能读写代码、执行 Shell 命令、检索并抓取网页，并在执行过程中自主规划与调整动作。

## 一、项目概述

Kimi CLI 是一个运行在终端里的 AI 智能体，定位类似于 Claude Code、Codex CLI、Gemini CLI，但深度集成了 Kimi 模型能力，面向真实的软件开发与终端操作场景：

- **编码代理**：阅读、编辑代码，执行 Shell 命令，自主规划多步任务。
- **内置 Shell 模式**：按 `Ctrl-X` 即可在 Agent 模式与 Shell 模式之间切换，无需离开 Kimi CLI 就能直接跑命令。
- **IDE 集成**：通过 ACP（Agent Client Protocol）被 Zed、JetBrains 等兼容编辑器挂载。
- **MCP 生态**：通过 `kimi mcp` 子命令接入任意 Model Context Protocol 工具服务器。
- **Shell 增强**：提供 `zsh-kimi-cli` 插件，让 Zsh 也具备 Agent 能力。

> ⚠️ 重要：Kimi CLI 正在演进为下一代的 **Kimi Code CLI**（`github.com/MoonshotAI/kimi-code`）。安装 Kimi Code CLI 会自动迁移你的配置与会话；原项目将逐步收尾，但文档与既有安装仍可用。新用户建议直接体验 Kimi Code CLI。

## 二、技术原理

### 技术栈与选型

从 `pyproject.toml` 可以看到，项目对依赖做了精细的版本锁定（当前版本 `1.49.0`，要求 `requires-python >= 3.12`）：

- **CLI 框架**：`typer` 提供子命令体系，`prompt-toolkit` 负责 TUI 交互，`rich` 负责富文本渲染。
- **并发与 IO**：`aiohttp` / `aiofiles` 异步网络与文件 IO，`httpx[socks]` 作为 HTTP 客户端。
- **数据建模**：`pydantic`，并对 `lxml`、`pillow`、`pyyaml` 等做了精确版本固定以保证二进制 wheels 可用。
- **底层能力**：`ripgrepy`（ripgrep 的 Python 封装）做代码搜索，`trafilatura` + `lxml` 做网页正文抽取。
- **协议层**：`agent-client-protocol`（ACP）、`fastmcp`（MCP）。
- **可视化**：FastAPI + uvicorn + websockets 提供 Web/Vis 后端，前端通过 `build-web` / `build-vis` 打包后嵌入包内。

### 架构设计

项目是一个 **uv 多包工作区**，主包 `kimi_cli` 与多个子包解耦：

```toml
[tool.uv.workspace]
members = [
    "packages/kosong",
    "packages/kaos",
    "packages/kimi-code",
    "sdks/kimi-sdk",
]
```

- **`kosong` / `pykaos`**：底层 Agent 调度与执行框架，是 Kimi CLI 的"引擎"。
- **`kimi-code` / `kimi-sdk`**：封装出的 CLI 入口与对外 SDK。

### 关键协议集成

**ACP（Agent Client Protocol）**：内置 `kimi acp` 子命令，作为 ACP agent server 对外暴露。接入 Zed / JetBrains 时，只需在编辑器配置里声明启动命令即可：

```json
{
  "agent_servers": {
    "Kimi CLI": {
      "type": "custom",
      "command": "kimi",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

> 注意：使用 ACP 客户端前，需先在终端运行 `kimi` 并执行 `/login` 完成登录。

**MCP（Model Context Protocol）**：通过 `kimi mcp` 子命令组统一管理 MCP server，支持 streamable HTTP（含 OAuth）与 stdio 两种 transport：

```sh
# 添加 streamable HTTP server（带 header）
kimi mcp add --transport http context7 https://mcp.context7.com/mcp \
  --header "CONTEXT7_API_KEY: ctx7sk-your-key"

# 添加 OAuth 授权
kimi mcp add --transport http --auth oauth linear https://mcp.linear.app/mcp

# 添加 stdio server
kimi mcp add --transport stdio chrome-devtools -- npx chrome-devtools-mcp@latest

kimi mcp list   # 列出已添加的 server
kimi mcp remove chrome-devtools
```

也支持临时用 `--mcp-config-file` 加载标准 MCP 配置：

```sh
kimi --mcp-config-file /path/to/mcp.json
```

### 数据流

```
用户输入 → TUI(prompt-toolkit) → Agent 调度(kosong/pykaos)
        → 工具执行(shell / 文件读写 / MCP / 网页抓取)
        → 流式结果(streamingjson) → rich 终端渲染
```

## 三、安装与快速开始

**环境要求**：Python `>= 3.12`。

**方式一：从 PyPI 安装**

```sh
pip install kimi-cli
```

**方式二：从源码开发**

```sh
git clone https://github.com/MoonshotAI/kimi-cli.git
cd kimi-cli
make prepare   # 同步所有工作区包依赖并安装 git hooks
```

**最简运行**

```sh
kimi           # 启动 Kimi CLI
/login         # 在会话内完成登录（ACP 客户端接入前必需）
```

启动后即可用自然语言描述任务；按 `Ctrl-X` 可在 Agent 与 Shell 模式间切换，直接执行 shell 命令。

## 四、使用方法与实战

### 基础用法

直接在会话中描述需求，例如"为这个函数补单元测试""把这段同步代码改成异步"。Kimi CLI 会自主规划、读改代码并执行命令验证。

### 接入 IDE（Zed / JetBrains）

先在终端 `/login`，再把上面的 ACP 配置写入 `~/.config/zed/settings.json` 或 `~/.jetbrains/acp.json`，之后即可在编辑器的 Agent 面板创建 Kimi CLI 会话。

### 接入 MCP 工具

如接入 `context7`（代码文档检索）与 `linear`（项目管理），参考上文 `kimi mcp add` 示例；接入后 Agent 可直接调用这些工具。

### Zsh 集成

```sh
git clone https://github.com/MoonshotAI/zsh-kimi-cli.git \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/kimi-cli
```

在 `~/.zshrc` 的 `plugins` 中加入 `kimi-cli`，重启 Zsh 后按 `Ctrl-X` 即可切换到 Agent 模式。

### 开发命令速查

```sh
uv run kimi            # 本地运行
make format            # 格式化
make check             # lint + 类型检查（ruff + pyright + ty）
make test              # 跑测试
make build-bin         # 用 PyInstaller 构建独立可执行文件
```

## 五、常见问题与解决方案

- **内置 shell 的 `cd` 暂不支持**：`shell-mode` 下仍无法用内置 `cd` 切换目录（官方 NOTE 已说明），需要切换目录时可走系统 shell 或让 Agent 用绝对路径执行。
- **Python 3.14 依赖约束**：在 `pyproject.toml` 中，`batrachian-toad`（经 notify-py）会把 `loguru` 上限到 `<= 0.6.0`，因此 `loguru` 固定为 `>=0.6.0,<0.8`，在 3.14+ 环境务必保留该约束。
- **ACP 接入前务必 `/login`**：编辑器侧挂不上 Kimi CLI 时，先确认已在终端完成登录。
- **构建需要 Node.js / npm**：`make build`、`build-web`、`build-vis` 会调用 `npm` 打包前端并嵌入包内；CI 或纯 Python 环境需先装好 Node。
- **安装失败**：优先确认 Python 版本 `>= 3.12`，并建议使用 `uv` 管理环境（`uv sync --frozen --all-extras --all-packages`）以避免依赖解析问题。

## 六、总结

Kimi CLI 是 Kimi 模型在终端侧的官方 Agent 实现，核心思路是把 **Agent + Shell + IDE（ACP）+ 工具生态（MCP）** 收敛到一个可组合的工作流里：既能当编码代理用，也能当增强型 shell 用，还能源生接入编辑器和外部工具。

不过要注意，官方已明确该项目正向 **Kimi Code CLI**（`MoonshotAI/kimi-code`）演进，配置与会话会自动迁移。如果你还没用过，建议直接上手 Kimi Code CLI；而 Kimi CLI 的源码（尤其是 `kosong` / `pykaos` 调度框架与 ACP/MCP 接入设计）仍是非常好的"终端 AI Agent"学习样本。

> 项目地址：<https://github.com/MoonshotAI/kimi-cli>
