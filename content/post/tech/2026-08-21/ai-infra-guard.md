---
title: "腾讯开源 AI-Infra-Guard：一站式 AI 红队安全检测平台"
date: 2026-08-21
description: "AI-Infra-Guard（简称 A.I.G）是腾讯朱雀实验室开源的一站式 AI 红队安全检测平台，整合 AI 基础设施漏洞扫描、MCP Server 与 Agent Skills 扫描、越狱评估等能力，覆盖 2000+ CVE 规则与 9 类 Skills 安全风险，帮助个人与企业自查 AI 系统安全。"
author: "Cheman"
slug: ai-infra-guard
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI安全, 红队, 腾讯]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**Tencent/AI-Infra-Guard**（简称 A.I.G），它是由腾讯朱雀实验室开源的一站式 AI 红队安全检测平台，把过去分散的 AI 安全自查能力整合成了一个开箱即用的工具箱。

## 一、项目概述

随着大模型、Agent、MCP（Model Context Protocol）在企业内部快速落地，AI 基础设施的攻击面也在急剧扩大：一个暴露在局域网里的 vLLM/Ollama 实例、一个被注入恶意指令的 Agent Skill、一个工具投毒（Tool Poisoning）的 MCP Server，都可能成为突破口。

A.I.G 的定位正是 **AI 红队（Red Teaming）平台**，面向企业或个人做 AI 安全风险的自我体检。它整合了以下核心能力：

- **ClawScan（OpenClaw 安全扫描）**：一键评估 OpenClaw 的不安全配置、Skill 风险、CVE 漏洞与隐私泄露。
- **Agent Scan**：多 Agent 自动化扫描框架，评估 Dify、Coze 等平台上 Agent 工作流的安全性。
- **MCP Server & Agent Skills 扫描**：覆盖 14 大类安全风险，支持从源码和远程 URL 两种方式扫描。
- **AI 基础设施漏洞扫描**：精准识别 100+ AI 框架组件（Ollama、ComfyUI、vLLM、n8n、Triton 等），覆盖 2000+ 已知 CVE。
- **越狱评估（Jailbreak Evaluation）**：用多轮攻击方法（Many-Shot、PAIR、GOAT、ActorAttack 等）测试模型鲁棒性。
- **模型与 API 中继检查器**：模型指纹识别、Claude 签名校验、中继黑盒审计等。

项目基于 Apache 2.0 协议完全免费开源，最新版本（v4.5.2）已将漏洞库扩展到 2000+ CVE 规则，并新增了 `.pyc` 字节码绕过检测、字符集走私（charset smuggling）防御等能力。

## 二、技术原理

### 架构与核心技术栈

从仓库的 `Dockerfile` 与 `go.mod` 可以看出，A.I.G 是一个典型的 **前后端分离 + 容器化** 架构：

- **前端**：Node 22 + pnpm 构建（静态产物 `dist/` 会被拷贝到 Go 二进制的 `static` 目录中嵌入）。
- **后端**：Go 1.23.2 编写，使用 `gin` 提供 HTTP/WebSocket 服务，用 `glebarez/sqlite`（纯 Go SQLite）做任务存储，任务数据通过 GORM 持久化。
- **Python 侧能力**：Agent Scan、`api_checker` 等模块用 Python 实现，通过 `uv` 管理依赖，由 Go 主进程以子进程方式调用。
- **安全探测能力**：后端大量使用 `projectdiscovery` 家族库（`fastdialer`、`rawhttp`、`retryablehttp-go` 等）做网络指纹探测与漏洞匹配，MCP 相关能力基于 `mark3labs/mcp-go`。

Dockerfile 的关键阶段如下：

```
# 先构建前端，再把 dist 嵌入 Go 二进制
COPY --from=frontend-builder /app/frontend/dist/ ./common/websocket/static/

# 最终运行镜像：Python 3.12 Alpine + 编译好的 Go 二进制
FROM python:3.12-alpine
COPY --from=builder /app/ai-infra-guard .
COPY ./agent-scan /app/agent-scan
RUN cd /app/agent-scan && /usr/local/bin/uv sync --no-dev
```

### 漏洞匹配机制

AI 基础设施漏洞扫描的核心思路是 **「指纹识别 + 规则匹配」**：

1. **指纹识别（Fingerprint）**：通过主动探测目标服务的 HTTP 响应、特定路径、版本头等信息，判断其运行的组件与版本（如 vLLM 的 `/v1/models` 接口、Ollama 的 `/api/version`）。
2. **规则匹配（Vuln Rules）**：将识别出的「组件 + 版本」与 `data/vuln/` 目录下的 YAML 漏洞规则做匹配，命中已知 CVE 后给出严重等级与修复链接。

社区可以通过向 `data/fingerprints/`、`data/vuln/`、`data/mcp/`、`data/eval` 提交 YAML 规则来扩展检测能力，这正是它「插件化」架构的基石。

### Skills 安全风险分类

`aig-skill-scan`（Skill 安全审计工具）的风险分类对齐了 SkillTrustBench 的 T01–T09 体系，覆盖五个层级：

| 层级 | 风险 |
|:----|:----|
| A · 指令与记忆 | T01 指令劫持、T02 记忆投毒 |
| B · 代码执行 | T03 远程载荷下载执行、T04 内嵌恶意代码 |
| C · 系统权限 | T05 权限提升与未授权访问、T06 系统持久化 |
| D · 工具链与依赖 | T07 工具劫持与欺骗、T08 不安全依赖 |
| E · 代码质量 | T09 不安全编码实践 |

在 SkillTrustBench 基准上，A.I.G 使用 Claude Opus 4.6 等模型时 F1 可达 **0.9848**，能力已达到实用级别。

## 三、安装与快速开始

### 方式一：Docker 一键部署（推荐）

要求 Docker 20.10+，内存 4GB+、磁盘 10GB+：

```bash
git clone https://github.com/Tencent/AI-Infra-Guard.git
cd AI-Infra-Guard
# Docker Compose V2 请把 docker-compose 换成 docker compose
docker-compose -f docker-compose.images.yml up -d
```

启动后访问 Web 界面：`http://localhost:8088`。

### 方式二：一键安装脚本

```bash
# 自动安装 Docker 并启动 A.I.G
curl https://raw.githubusercontent.com/Tencent/AI-Infra-Guard/refs/heads/main/docker.sh | bash
```

### 方式三：从源码构建

```bash
git clone https://github.com/Tencent/AI-Infra-Guard.git
cd AI-Infra-Guard
docker-compose up -d
```

### 独立 CLI：Skills 安全审计

如果你只想把 Skill 扫描嵌入 CI/CD，可以直接装 Python 包：

```bash
pip install aig-skill-scan

# 通过环境变量设置 LLM API Key
export LLM_API_KEY="your-api-key"

# 扫描本地 Skill 项目目录
aig-skill-scan --repo /path/to/your/skill \
           -m deepseek-v4-flash \
           --language en \
           -o result.json
```

> ⚠️ 注意：A.I.G 目前**没有鉴权机制**，定位为企业内网或个人使用，**切勿部署在公网**。

## 四、使用方法与实战

### 实战一：扫描本地 vLLM 实例

1. 正常启动 vLLM：`python -m vllm.entrypoints.api_server --model meta-llama/...`
2. 在 A.I.G Web UI 点击「AI 基础设施安全扫描 / AI Infra Scan」
3. 填入目标地址，例如本地实例填 `http://127.0.0.1:8000`
4. 点击「Start Scan」，A.I.G 会自动指纹识别并匹配 2000+ CVE
5. 查看报告：组件版本、命中漏洞、严重等级与修复链接

目标可以是单台主机、多个 IP（每行一个）、CIDR（`192.168.1.0/24`）或范围（`10.0.0.1-10.0.0.20`）。

### 实战二：扫描 MCP Server 与 Agent Skills

无需运行实例，直接填入**远程 URL**（如 `https://github.com/user/mcp-server`）或**上传本地源码压缩包**即可进行检测，覆盖 14 大类安全风险。

### 实战三：越狱评估

在「设置 → 模型配置」中配置目标 LLM 的 API 端点（base URL + API key），选择数据集后启动评估，即可获得跨模型对比的鲁棒性报告。

### 在 OpenClaw 中直接使用

也可以通过 `aig-scanner` skill 在 OpenClaw 对话里直接调用 A.I.G：

```bash
clawhub install aig-scanner
```

随后配置 `AIG_BASE_URL` 指向你运行的 A.I.G 服务即可。

## 五、常见问题与解决方案

**Q1：Docker 部署后访问 `http://localhost:8088` 打不开？**
确认 `docker-compose.images.yml` 是否正确启动（`docker ps` 查看容器状态），并检查宿主机 8088 端口是否被占用或防火墙拦截。容器内健康检查依赖 `pgrep ai-infra-guard`，若进程异常退出需查看 `docker logs`。

**Q2：`aig-skill-scan` 提示缺少 API Key？**
Skill 扫描依赖 LLM 做语义判断，需通过 `export LLM_API_KEY="..."` 设置密钥，并用 `-m` 指定可用模型（如 `deepseek-v4-flash`、`glm-5.1` 等）。

**Q3：能扫描的目标有哪些限制？**
AI 基础设施漏洞扫描的目标是**正在运行的 AI 服务网络地址**（如 `http://127.0.0.1:8000`），不是 GitHub 地址或源码路径；而 MCP/Skills 扫描才支持源码和远程 URL。

**Q4：性能与兼容性如何？**
A.I.G 提供 Docker 镜像，支持 Linux / macOS / Windows，并通过 `data/fingerprints`、`data/vuln` 的 YAML 规则实现插件化扩展。漏洞库随版本持续更新（v4.5.2 已含 2000+ CVE 规则），建议定期拉取新镜像以覆盖最新漏洞。

**Q5：能否上公网？**
不能。项目当前**无鉴权**，设计用于内网或个人环境，暴露在公网会带来自身安全风险。

## 六、总结

A.I.G（AI-Infra-Guard）把碎片化的 AI 安全自查能力——基础设施漏洞扫描、MCP/Skills 风险检测、Agent 红队评估、越狱测试——整合成了一个免费开源、可容器化部署的一站式平台。对于正在规模化落地大模型与 Agent 的团队，它是一把非常有价值的「安全体检利器」，既能快速发现暴露在网内的高危组件与 CVE，也能在 CI/CD 中把关 Skill 与 MCP 的供应链安全。如果你关心 AI 系统的攻防边界，这个项目值得 Star 并实际跑一跑。

- 项目地址：<https://github.com/Tencent/AI-Infra-Guard>
- 在线文档：<https://tencent.github.io/AI-Infra-Guard/>
