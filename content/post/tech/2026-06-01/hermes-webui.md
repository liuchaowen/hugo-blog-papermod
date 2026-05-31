---
title: "Hermes WebUI：为 Hermes Agent 打造的自托管 Web 界面"
date: 2026-06-01
description: "Hermes WebUI 是为 Hermes Agent 打造的自托管 Web 界面，提供与 CLI 完全一致的体验，支持多平台访问、持久化记忆、定时任务等特性，是 OpenClaw 的有力竞争者。"
author: "Cheman"
slug: hermes-webui
draft: false
categories: [开源项目, AI工具]
tags: [GitHub, 开源, AI Agent, WebUI, 自托管]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Hermes WebUI**，它是 [Hermes Agent](https://hermes-agent.nousresearch.com/) 的官方 Web 界面，让你可以在浏览器里使用这个强大的自托管 AI 助手。

## 一、项目概述

Hermes WebUI 是一个轻量级的深色主题 Web 应用，为 Hermes Agent 提供浏览器访问界面。它的设计目标是**与 CLI 体验保持 1:1 的完全一致**——终端里能做的，在 WebUI 里也都能做。

**核心特性：**
- 🖥️ **三栏布局**：左侧会话导航、中间聊天界面、右侧工作区文件浏览
- 🌐 **多平台访问**：支持 10+ 消息平台（Telegram、Discord、Slack、Signal 等）
- 🧠 **持久化记忆**：跨会话保留上下文，Agent 会记住你的项目和偏好
- ⏰ **自托管定时任务**：支持 cron 作业，离线时也能执行任务并推送结果
- 🔧 **自改进技能系统**：Agent 可以从经验中自动编写和保存技能
- 🔐 **自托管隐私**：对话、记忆、硬件都在你自己的服务器上

**与其他工具的对比：**

| 特性 | OpenClaw | Claude Code | Codex CLI | Hermes |
|---|---|---|---|---|
| 持久化记忆（自动） | 是 | 部分† | 部分 | 是 |
| 定时任务（自托管） | 是 | 否‡ | 否 | 是 |
| 消息平台访问 | 15+ | 部分 | 否 | 10+ |
| Web UI（自托管） | 仅仪表板 | 否 | 否 | 是 |
| 自改进技能 | 部分 | 否 | 否 | 是 |
| 开源 | 是 (MIT) | 否 | 是 | 是 |

† Claude Code 有 CLAUDE.md / MEMORY.md 项目上下文和滚动自动记忆，但不是完全自动的跨会话回忆  
‡ Claude Code 有云管理的定时任务（Anthropic 基础设施）和会话范围的 `/loop`；没有自托管的 cron

## 二、技术原理

### 架构设计

Hermes WebUI 采用**轻量级架构**，没有构建步骤、没有框架、没有打包器，只使用 Python 和原生 JS。

```
server.py              HTTP 路由和认证中间件 (~446 行)
api/
  config.py             # 配置发现、全局变量、模型检测 (~4139 行)
  models.py            # 会话模型和 CRUD (~1927 行)
  streaming.py         # SSE 引擎、run_agent、取消支持 (~4420 行)
  routes.py            # 所有 GET + POST 路由处理 (~9772 行)
  profiles.py          # 配置文件状态管理 (~1056 行)
static/
  index.html           # HTML 模板 (~1323 行)
  style.css            # CSS（含移动端响应式、主题）(~3767 行)
  ui.js                # DOM 助手、renderMd、工具卡片 (~7216 行)
  sessions.js          # 会话 CRUD、可折叠分组 (~3517 行)
  messages.js          # send()、SSE 处理、流式传输 (~2301 行)
  panels.js            # Cron、技能、记忆、配置面板 (~6480 行)
```

**关键技术选型：**
- **后端**：Python 3.12+（轻量级 HTTP 服务器，无框架依赖）
- **前端**：原生 JavaScript（无 React/Vue/Angular，避免构建步骤）
- **流式传输**：Server-Sent Events (SSE) 实现 token 实时流式输出
- **认证**：可选密码认证 + 可选 WebAuthn/Passkey 支持
- **状态管理**：SQLite 存储会话，JSON 文件存储配置和状态

### 数据流分析

```
用户输入
  ↓
浏览器 JS (messages.js)
  ↓ HTTP POST /api/chat/start
Python server.py (routes.py)
  ↓ 调用 streaming.py
Hermes Agent (run_agent.py)
  ↓ SSE 流式返回
streaming.py → routes.py → 浏览器
  ↓ 实时渲染
ui.js (markdown 渲染、代码高亮、Mermaid 图表)
```

**核心流式传输实现（streaming.py）：**
```python
# 简化的 SSE 流式传输逻辑
async def run_agent(user_message, session_id):
    # 1. 加载会话历史和配置
    session = load_session(session_id)
    config = load_config()
    
    # 2. 调用 Hermes Agent
    agent = AIAgent(config)
    
    # 3. 流式返回 token
    async for token in agent.generate_stream(user_message, session.history):
        yield f"data: {json.dumps({'token': token})}\n\n"
    
    # 4. 工具调用卡片
    for tool_call in agent.tool_calls:
        yield f"data: {json.dumps({'tool_call': tool_call})}\n\n"
```

## 三、安装与快速开始

### 环境要求
- Python 3.12+
- Hermes Agent（会自动检测或安装）
- 可选：Docker（容器化部署）

### 安装步骤

**方法一：一键引导脚本（推荐）**

```bash
git clone https://github.com/nesquena/hermes-webui.git hermes-webui
cd hermes-webui
python3 bootstrap.py
```

引导脚本会自动：
1. 检测 Hermes Agent，如果缺失则尝试官方安装器
2. 查找或创建 Python 虚拟环境并安装依赖
3. 启动 Web 服务器并等待 `/health` 健康检查
4. 自动打开浏览器（除非传入 `--no-browser`）
5. 在 WebUI 内启动首次运行向导

**方法二：Docker 部署（5 分钟快速启动）**

```bash
git clone https://github.com/nesquena/hermes-webui
cd hermes-webui
cp .env.docker.example .env
# 编辑 .env（如果你的主机 UID 不是 1000，例如 macOS 的 UID 从 501 开始）
docker compose up -d
# 打开 http://localhost:8787
```

启用密码保护（如果要将端口暴露到 127.0.0.1 之外）：
```bash
echo "HERMES_WEBUI_PASSWORD=设置一个强密码" >> .env
docker compose up -d --force-recreate
```

**方法三：手动启动**

```bash
cd /path/to/hermes-agent          # 或任何 sys.path 能找到 Hermes 模块的路径
HERMES_WEBUI_PORT=8787 venv/bin/python /path/to/hermes-webui/server.py
```

> **注意**：使用 Agent 的 venv Python（或任何已安装 Hermes Agent 依赖的 Python 环境）。系统 Python 会缺少 `openai`、`httpx` 等必需的包。

### 最简运行示例

```bash
# 1. 克隆仓库
git clone https://github.com/nesquena/hermes-webui.git
cd hermes-webui

# 2. 运行引导脚本（会自动处理所有依赖）
python3 bootstrap.py

# 3. 如果需要通过 SSH 隧道远程访问
ssh -N -L 8787:127.0.0.1:8787 user@your.server.com

# 4. 在本地浏览器打开
open http://localhost:8787
```

## 四、使用方法与实战

### 基础用法

**1. 聊天和 Agent 交互**
- 流式响应通过 SSE 实时显示（token 逐个出现）
- 支持多 Provider 模型（OpenAI、Anthropic、Google、DeepSeek、Nous Portal、OpenRouter 等）
- 发送消息时如果已有消息正在处理，会自动排队
- 内联编辑任何过去的用户消息并从该点重新生成

**2. 会话管理**
- 创建、重命名、复制、删除、按标题和消息内容搜索会话
- 会话操作（通过每行会话的 `⋯` 下拉菜单）——固定、移动到项目、归档、复制、删除
- 固定/加星标会话到侧边栏顶部（金色指示器）
- 会话项目——带颜色命名的组，用于组织会话
- 会话标签——在标题中添加 #tag 可获得彩色芯片和点击过滤

**3. 工作区文件浏览器**
- 目录树可展开/折叠（单击切换，双击导航）
- 面包屑导航，可点击路径段
- 预览文本、代码、Markdown（渲染）和图像内联
- 聊天链接使用 `workspace://path/to/file` 在右侧预览窗格中打开文件

### 进阶用法

**1. 配置文件（Profiles）**
- 作曲家页脚中的配置文件芯片——显示所有配置文件的下拉列表，包含网关状态和模型信息
- 网关状态点（绿色 = 正在运行）、模型信息、每个配置文件的技能计数
- 配置文件管理面板——从侧边栏创建、切换和删除配置文件
- 创建时克隆活动配置文件配置
- 可选创建时自定义端点字段——Base URL 和 API 密钥写入配置文件的 `config.yaml`

**2. 定时任务（Cron）**
- 查看、创建、编辑、运行、暂停/恢复、删除 cron 作业
- 运行历史记录
- 完成提醒（Toast 通知和未读徽章）

**3. 技能管理**
- 按类别列出所有技能、搜索、预览、创建/编辑/删除
- 链接文件查看器

**4. 记忆管理**
- 内联查看和编辑 MEMORY.md 和 USER.md

### 实际项目示例

**场景：使用 Hermes WebUI 管理开发项目**

```markdown
# 1. 创建项目并分配会话
在 WebUI 中：
- 点击侧边栏底部的"项目"图标
- 创建新项目 "MyApp 开发"
- 将相关会话移动到此项目

# 2. 使用工作区文件浏览器
- 在右侧面板中浏览项目文件
- 点击文件内联预览
- 使用 `workspace://path/to/file` 在聊天中引用文件

# 3. 设置定时任务
- 打开"任务"面板
- 创建 cron 作业："每天 09:00 检查 GitHub Issues"
- 结果会自动推送到 Telegram/Discord

# 4. 利用持久化记忆
- Hermes 会记住你的项目结构、编码偏好、常用命令
- 跨会话保留上下文，无需重复解释
```

**场景：通过 Tailscale 在手机上访问**

```bash
# 1. 在服务器和手机上安装 Tailscale
# 2. 启动 WebUI 监听所有接口
HERMES_WEBUI_HOST=0.0.0.0 HERMES_WEBUI_PASSWORD=你的密码 ./start.sh

# 3. 在手机浏览器中打开
http://<服务器 Tailscale IP>:8787

# 4. 添加到主屏幕获得类 App 体验
```

## 五、常见问题与解决方案

### 安装失败

**问题**：`bootstrap.py` 报错"Hermes Agent not found"

**解决方案**：
```bash
# 手动安装 Hermes Agent
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# 或者设置环境变量指定 Agent 目录
export HERMES_WEBUI_AGENT_DIR=/path/to/hermes-agent
python3 bootstrap.py
```

### 运行时错误

**问题**：`AIAgent not available` 错误

**原因**：Python 环境缺少 Hermes Agent 依赖

**解决方案**：
```bash
# 使用 Agent 的 venv Python 启动 WebUI
~/path/to/hermes-agent/venv/bin/python /path/to/hermes-webui/server.py

# 或者将 Agent 目录添加到 PYTHONPATH
export PYTHONPATH=/path/to/hermes-agent
python3 server.py
```

### 性能问题

**问题**：流式响应卡顿或延迟

**解决方案**：
- 检查网络连接（特别是使用 SSH 隧道时）
- 降低模型温度或尝试更轻量的模型
- 在设置中禁用不必要的 UI 动画

### 兼容性问题

**问题**：Windows 原生不支持 `bootstrap.py`

**解决方案**：
- 使用 WSL2（推荐）
- 或参考社区维护的原生 Windows 设置指南：[@markwang2658/hermes-windows-native-guide](https://github.com/markwang2658/hermes-windows-native-guide)

**问题**：Docker 部署时 `.env: permission denied`

**解决方案**：
```bash
# 在 .env 中设置
HERMES_SKIP_CHMOD=1
```

## 六、总结

Hermes WebUI 是一个**功能完整、架构清晰、易于部署**的自托管 AI Agent Web 界面。它的核心价值在于：

1. **完全 1:1 CLI 体验**：终端里能做的，在浏览器里也都能做
2. **自托管隐私**：对话、记忆、硬件都在你自己的服务器上
3. **持久化记忆**：跨会话保留上下文，Agent 会不断学习和改进
4. **多平台集成**：支持 10+ 消息平台，随时随地访问你的 Agent
5. **开源可扩展**：MIT 许可证，130+ 社区贡献者，活跃的开发社区

如果你正在寻找一个**可自托管的 AI Agent 解决方案**，或者想要一个**完整的 Web 界面**来管理你的 Hermes Agent，Hermes WebUI 绝对值得一试。

**相关链接：**
- GitHub 仓库：https://github.com/nesquena/hermes-webui
- Hermes Agent 官网：https://hermes-agent.nousresearch.com/
- 文档：https://github.com/nesquena/hermes-webui/tree/main/docs

> **P.S.** 如果你喜欢这个项目，不妨给它点个 ⭐️，让更多人发现这个优秀的开源项目！
