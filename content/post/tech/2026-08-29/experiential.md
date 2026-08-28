---
title: "Experiential：把生产流量变成专属路由器的开源 Agent 网关"
date: 2026-08-29
description: "Experiential 是 experientiallabs 开源的 Agent 工作流网关与路由器，用统一的 OpenAI 兼容 API 接管托管、BYOK 与本地模型，提供细粒度鉴权、预算控制，并能基于生产流量训练专属路由策略或微调模型。本文从架构、核心代码到实战部署深度拆解。"
author: "Cheman"
slug: experiential
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI Agent, LLM网关, 模型路由]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Experiential**，一个把“统一调度 + 权限管控 + 流量优化”打包成单个 OpenAI 兼容网关的开源工具。对于需要同时接入多家模型、又要对团队和 Agent 做成本与权限治理的团队，它给出了一个相当完整的答案。

## 一、项目概述

Experiential 的定位是「Agent 工作流的开源网关与路由器」，核心解决三件事：

1. **统一入口**：通过一个 OpenAI 兼容 API，同时调用托管模型、BYOK（Bring Your Own Key）模型和本地模型，无需在业务代码里维护多套 SDK。
2. **细粒度治理**：控制「哪些用户 / 哪些 Agent / 哪些用例」可以使用「哪些模型」，以及「最多能花多少钱」，把预算和权限下沉到网关层。
3. **流量反哺优化**：把真实生产流量作为遥测数据，反向训练出一个针对质量、速度、成本优化的专属路由器，甚至微调你拥有的开源模型。

从 `pyproject.toml` 的官方描述可见其野心：`Build simulations and optimize model routing from agent traces.`——它不只是转发请求，更把「从 trace 到优化」做成了闭环。

```toml
name = "experiential"
version = "0.7.0"
description = "Build simulations and optimize model routing from agent traces."
requires-python = ">=3.12"
```

典型的控制面能力包括：公共别名（如 `opus-5`）、身份（identity）、命令预算（`$50.00`）等，首次运行向导即可完成配置。

## 二、技术原理

### 2.1 整体架构：本地原生数据面 + Python 控制面

Experiential 采用「**原生编译数据面 + Python 控制面**」的混合架构。从依赖 `exp-gateway-native>=0.3.0,<0.4` 可以看出，网关的数据面（data plane）是一个用 Rust 编译的原生扩展，负责承载实际的高性能路由转发；而 Python 侧则负责 CLI、配置、遥测与路由编排。

```toml
dependencies = [
    "exp-gateway-native>=0.3.0,<0.4",  # compiled gateway data plane; checkouts build it via [tool.uv.sources]
    "filelock>=3.12",                  # 跨平台建议锁，保护就地编辑的持久化注册表
    "typer>=0.16",                     # CLI 框架
    "openai>=3.0,<4",                  # 公共路由 request/response 类型遵循官方 OpenAI schema
    "boto3>=1.35,<2",                  # Bedrock 适配器（懒加载）
    "google-auth>=2.35,<3",            # Vertex OAuth（懒加载）
]
```

值得注意的选型细节：

- **`click>=8.2` 的精确 pin**：注释明确写道，它锁了 `no_args_is_help` 语义（help 与 usage-error 都退出码 2，而 <8.2 会退出 0）。这是典型的「被旧版本坑过」后留下的防御性注释。
- **`filelock` 而非 `fcntl`**：跨平台建议锁，因为 Unix 专属的 `fcntl` 不是可移植边界，注册表需要在原地编辑且并发安全。
- **适配器懒加载**：Bedrock、Vertex 的云 SDK 导入被刻意延迟到适配器内部，避免无谓的依赖加载与冷启动膨胀。

### 2.2 构建系统的「一个包」纪律

`pyproject.toml` 透露出很强的工程克制：

```toml
[tool.hatch.build.targets.sdist]
include = [
    "/exp",
    "/assets",
    "docs/reference/gateway-architecture.md",
    "README.md", "LICENSE", "pyproject.toml", "conftest.py",
]
exclude = ["exp/runtime/gateway/native/target"]  # Rust 构建产物不进 wheel
```

Rust crate 的本地构建产物（`native/target`）永远不进 wheel，但源码作为普通包文件被纳入，既保证可复现的本地重编译，又避免发布体积失控。配置项 `[tool.uv.sources]` 只允许一条 path source，这正是 `AGENTS.md` 中「One package」约定的落地。

### 2.3 路由优化闭环：从 Trace 到模型

Experiential 把"优化"拆成两段清晰的工作流：

1. **`exp build <project>`**：加载你的 OpenTelemetry traces，在模拟环境中对候选路由器做评估与寻优。
2. **`exp optimize model <project>`**：把优化后的路由逻辑沉淀为可微调的开源模型（官方推荐配合 Tinker）。

```bash
# 从现有 agent traces 构建仿真并优化路由器
exp build support-agent

# 使用自有开源模型做有监督微调
exp optimize model support-agent
```

这背后的核心洞察是：**生产流量本身就是最好的训练集**。与其手工写路由规则，不如让真实分布去反推最优策略。

### 2.4 遥测的隐私边界

项目默认开启匿名聚合的 PostHog 产品遥测，但明确承诺**绝不**包含 prompts、traces、actions、observations、paths、model names、credentials 或原始客户内容，且可在本地 `.exp/settings.toml` 关闭：

```bash
exp config telemetry status
exp config telemetry disable
exp config telemetry enable
```

## 三、安装与快速开始

### 3.1 环境要求

- Python >= 3.12（硬门槛，依赖大量 3.12 特性）
- `pip` 或 `uv` 安装；开发态还需 `maturin>=1.7` 编译原生扩展

### 3.2 安装

```bash
pip install experiential
exp
```

首次运行 `exp` 会启动设置向导：复用共享的 provider / model / reasoning-effort 选择器，持久化每个 provider 连接，然后给出公共别名、身份和 `$50.00` 命令预算的默认值，最后打印一次性密钥。

### 3.3 最简运行示例

启动本地 OpenAI 兼容网关（编译原生数据面在 loopback 上服务所有路由），随后即可像调 OpenAI 一样调用：

```bash
export EXP_GATEWAY_KEY=...
curl http://127.0.0.1:8000/v1/chat/completions \
  -H "Authorization: Bearer $EXP_GATEWAY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"opus-5","messages":[{"role":"user","content":"Help me"}]}'
```

若不想自建，官方托管网关在 `https://api.experientiallabs.ai/v1`，提供同样的 OpenAI 兼容（及 Anthropic Messages）API。

## 四、使用方法与实战

### 4.1 Python 侧加载专属路由器

训练好的项目路由器可作为一个官方 OpenAI client 直接加载，背后是它自己的私有网关：

```python
import exp

with exp.load_router("my-project") as client:
    response = client.chat.completions.create(
        model="my-project",
        messages=[{"role": "user", "content": "hello"}],
    )
```

### 4.2 把现有 Agent 流量接入

如果你只是想先跑通流程，官方提供了公开的 terminal-tasks OTLP 数据集：

```bash
curl -L -o traces.otel.jsonl \
  https://huggingface.co/datasets/experiential-labs/wmo-terminal-tasks-traces/resolve/540883e451dc13d34fb50fdd36b143cb0f1fb0db/traces.otel.jsonl
```

随后用 `exp build` 加载该 trace 文件，对路由器做仿真评估与寻优。

### 4.3 给 Coding Agent 一键接入

`SETUP.md` 提供了可直接丢给 Claude Code / Cursor / Codex 等编码 Agent 的复制粘贴式引导：上传 LLM traces 作为遥测、连接自有 provider keys（OpenAI、Anthropic、Gemini、Azure、Bedrock、Fireworks、OpenRouter）、用 `xpl_` 密钥发起首个 `/v1` 调用、最后把所有 Agent 重新指向网关。

## 五、常见问题与解决方案

**Q1：安装报 Python 版本不兼容？**
依赖 `requires-python >=3.12`，请先确认运行环境 Python 版本。可用 `pyenv` 或 `uv` 切到 3.12+。

**Q2：开发态编译原生扩展失败？**
原生数据面需要 `maturin>=1.7,<2`。在 dev 环境中执行 `uv sync --extra dev`，确保 Rust 工具链可用。

**Q3：测试里断言失败、出现 ANSI 颜色码？**
仓库 `conftest.py` 已处理此坑：在导入 `exp.cli.app` 之前 pop 掉 `FORCE_COLOR` / `CLICOLOR_FORCE`，否则 dev shell 注入的颜色码会污染 CliRunner 捕获。若你自建测试，记得同样在导入前清理这两个环境变量。

```python
import os
os.environ.pop("FORCE_COLOR", None)
os.environ.pop("CLICOLOR_FORCE", None)
```

**Q4：担心遥测泄露数据？**
默认遥测仅含匿名聚合指标，不含任何 prompt/trace/凭证/模型名。如仍不放心：`exp config telemetry disable` 即可在本地永久关闭。

**Q5：CLI 执行无参数时退出码异常？**
这是 `click<8.2` 的历史行为（help/usage-error 退出 0）。项目已 pin `click>=8.2` 修掉该语义，请勿降级。

## 六、总结

Experiential 的价值不在「又一个 LLM 网关」，而在于它把**统一接入、权限预算、流量反哺优化**三件事串成了闭环：用一份 OpenAI 兼容入口收敛多模型，用网关层做团队与 Agent 的治理，再让真实生产流量反向训练专属路由器甚至微调模型。结合 Rust 原生数据面的性能取向与相当严谨的 Python 工程纪律（精确依赖 pin、懒加载适配器、隐私友好的遥测边界），它适合正在为多条 Agent 工作流做模型治理与成本优化的团队重点关注。

> 仓库地址：<https://github.com/experientiallabs/experiential>
