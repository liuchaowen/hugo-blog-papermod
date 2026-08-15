---
title: "OpenSandbox 开源解读：面向 AI 应用的通用沙箱平台，多语言 SDK 与 K8s 大规模调度"
date: 2026-08-16
description: "OpenSandbox 是 opensandbox-group 推出的通用沙箱平台，为 Coding Agent、GUI Agent、Agent 评估与 RL 训练等场景提供多语言 SDK、统一沙箱 API 与 Docker/Kubernetes 运行时，并内置强隔离、凭据保险库与网络出口管控。"
author: "Cheman"
slug: opensandbox
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 沙箱, 容器, Kubernetes]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenSandbox**，一个面向 AI 应用的通用沙箱平台，用统一的 API 把 Coding Agent、GUI Agent、Agent 评估到 RL 训练等多种场景的隔离执行环境标准化了。

## 一、项目概述

随着 Agent 类应用爆发，运行不可信代码的隔离环境成了刚需：Coding Agent 需要执行生成的脚本、GUI Agent 需要操控浏览器与桌面、Agent 评估要为每个 trial 拉起独立环境、RL 训练则要成千上万个并行沙箱。OpenSandbox 的定位正是这样一个**通用沙箱平台（general-purpose sandbox platform）**，它在三者之间架起统一抽象：

- **多语言 SDK**：覆盖 Python、Java/Kotlin、JavaScript/TypeScript、C#/.NET、Go，业务代码无需关心底层运行时；
- **统一沙箱 API**：以 Sandbox Protocol 定义生命周期管理与执行 API，可扩展自定义运行时；
- **Docker / Kubernetes 运行时**：本地用 Docker 快速验证，生产用 K8s 做大规模分布式调度。

官方还提供了 `osb` CLI、MCP Server，以及内置的命令、文件系统、Code Interpreter 三种开箱即用的沙箱环境。项目已入选 CNCF Landscape，并通过 OpenSSF Best Practices 认证，镜像使用 Cosign 无密钥签名并附带 provenance 证明。

## 二、技术原理

OpenSandbox 的核心是一套「协议 + 运行时 + 组件」的分层架构。

**Sandbox Protocol（沙箱协议）**：以 OpenAPI 形式定义两类接口——沙箱生命周期管理（创建/销毁/超时）与沙箱执行（命令运行、文件读写）。这正是「可扩展自定义运行时」的关键：只要实现协议，就能接入任意后端。

**Server（生命周期服务）**：基于 Python FastAPI 实现，负责沙箱的创建、调度与回收，支持 Docker 与 Kubernetes 两种运行时。本地一条命令即可拉起：

```bash
uvx opensandbox-server init-config ~/.sandbox.toml --example docker
uvx opensandbox-server
```

**Components（执行与网络组件）**：
- `execd`：沙箱内执行守护进程，承接命令与文件操作；
- `ingress`：统一入站网关，支持多路由策略；
- `egress`：出站网络管控，按沙箱粒度限制外联。

**强隔离**：支持 gVisor、Kata Containers、Firecracker microVM 等安全容器运行时，在沙箱负载与宿主机之间建立更强的隔离边界。

**凭据保险库（Credential Vault）**：向沙箱注入凭据用于出站请求，但真实密钥不暴露给工作负载——这解决了「Agent 需要调外部 API，但不能把密钥放进代码」的痛点。

**数据流**：业务侧 SDK 调用 → Server 校验协议 → 调度到 Docker/K8s 运行时 → 沙箱内 `execd` 执行命令/读写文件 → 结果经 ingress/egress 受控回流。Code Interpreter 在此基础上封装了 Python/多语言内核，把「执行一段代码」变成一次结构化调用。

## 三、安装与快速开始

环境要求：Docker（本地运行必需）+ Python 3.10+（示例与本地运行时必需）。

**安装 SDK（以 Python 为例）**：

```bash
pip install opensandbox
```

**安装 CLI**：

```bash
pip install opensandbox-cli
# 或
uv tool install opensandbox-cli
```

**最小运行示例**（创建沙箱并执行命令）：

```bash
osb config init
osb config set connection.domain localhost:8080
osb config set connection.protocol http
osb config set connection.api_key <your-api-key>
osb sandbox create --image python:3.12 --timeout 30m -o json
osb command run <sandbox-id> -o raw -- python -c "print(1 + 1)"
```

## 四、使用方法与实战

**1. Code Interpreter：在沙箱里跑代码**

```python
import asyncio
from datetime import timedelta

from code_interpreter import CodeInterpreter, SupportedLanguage
from opensandbox import Sandbox
from opensandbox.models import WriteEntry

async def main() -> None:
    sandbox = await Sandbox.create(
        "opensandbox/code-interpreter:v1.1.0",
        entrypoint=["/opt/code-interpreter/code-interpreter.sh"],
        env={"PYTHON_VERSION": "3.11"},
        timeout=timedelta(minutes=10),
    )

    async with sandbox:
        execution = await sandbox.commands.run("echo 'Hello OpenSandbox!'")
        print(execution.logs.stdout[0].text)

        await sandbox.files.write_files([
            WriteEntry(path="/tmp/hello.txt", data="Hello World", mode=644)
        ])
        content = await sandbox.files.read_file("/tmp/hello.txt")
        print(f"Content: {content}")

        interpreter = await CodeInterpreter.create(sandbox)
        result = await interpreter.codes.run(
            "result = 2 + 2\nresult",
            language=SupportedLanguage.PYTHON,
        )
        print(result.result[0].text)  # 4

    await sandbox.kill()

if __name__ == "__main__":
    asyncio.run(main())
```

**2. MCP Server：把沙箱能力交给 Claude Code / Cursor**

```bash
pip install opensandbox-mcp
opensandbox-mcp --domain localhost:8080 --protocol http
```

stdio 配置：

```json
{
  "mcpServers": {
    "opensandbox": {
      "command": "opensandbox-mcp",
      "args": ["--domain", "localhost:8080", "--protocol", "http"]
    }
  }
}
```

**3. 真实场景**：官方 `examples/` 覆盖了 Claude Code、Gemini CLI、OpenAI Codex、Qwen Code、Kimi CLI 等 Coding Agent 接入，以及 Chrome/VNC、Playwright、桌面环境、VS Code Web、Harbor 评估等 GUI 与训练负载，可直接复用。

## 五、常见问题与解决方案

- **本地起不来**：先确认 Docker 已安装且守护进程在运行，`uvx opensandbox-server` 依赖 Docker 运行时；`connection.domain` 默认指向 `localhost:8080`，需与 server 监听地址一致。
- **API Key 校验失败**：CLI 通过 `osb config set connection.api_key` 注入，`opensandbox-mcp` 则需保证 server 与 client 使用同一套鉴权配置。
- **凭据泄露风险**：切勿把真实密钥写进沙箱代码，改用 Credential Vault 注入，并配合 egress 出口管控限制沙箱可访问的域名。
- **生产镜像供应链安全**：发布镜像以 Cosign 无密钥签名并带 provenance，生产环境应**按 digest 固定版本**，并参考 release-verification 指南校验 GitHub Actions 身份后再部署。
- **大规模调度性能**：单机 Docker 适合验证，分布式/高并发（如 RL 训练）切换到 Kubernetes 运行时，按沙箱粒度做调度。

## 六、总结

OpenSandbox 把「为 AI 应用跑隔离代码」这件重复且高风险的事，收敛成了一套协议清晰、SDK 齐全、运行时可伸缩的平台：对开发者是统一的 `sandbox.commands.run` / `files` API，对平台方是 Docker 到 K8s 的弹性调度，对安全是 gVisor/Firecracker 强隔离 + 凭据保险库 + 出口管控的组合拳。如果你正在做 Coding Agent、Agent 评估或 RL 训练，值得直接拿官方 examples 跑一遍。

> 项目地址：https://github.com/opensandbox-group/OpenSandbox
