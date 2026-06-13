---
title: "SkillSpector：NVIDIA 开源 AI Agent 技能安全扫描工具"
date: 2026-06-14
description: "SkillSpector 是 NVIDIA 开源的安全扫描工具，专门检测 AI Agent 技能（如 Claude Code、Cursor）中的漏洞、恶意模式和供应链风险，支持 64 种漏洞模式，涵盖提示注入、权限提升等 16 大类别。"
author: "Cheman"
slug: skillspector
draft: false
categories: ["技术", "开源", "安全"]
tags: ["AI Agent", "安全扫描", "NVIDIA", "开源", "网络安全"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**SkillSpector**，来自 NVIDIA 的官方开源安全扫描工具，专门解决 AI Agent 技能的安全隐患问题。

## 一、项目概述

AI Agent 技能（Claude Code、Codex CLI、Cursor 使用的 SKILL.md）以隐式信任的方式执行，缺乏充分的安全审查。研究数据显示，**26.1% 的技能存在安全漏洞，5.2% 表现出明显的恶意意图**，而包含可执行脚本的技能漏洞率更是高达 2.12 倍。

SkillSpector 正是为回答"这个技能安全吗？"而生的工具。

**核心特性：**

- 支持 Git 仓库、URL、ZIP 文件、本地目录、单文件多种输入格式
- 内置 **64 种漏洞模式**，覆盖 **16 大类别**：提示注入、数据外泄、权限提升、供应链攻击、过度授权、输出处理、系统提示泄露、内存污染、工具滥用、恶意 Agent 等
- 两阶段检测：快速静态分析 + 可选 LLM 语义评估
- 实时漏洞查询：通过 OSV.dev API 拉取 CVE 数据，支持离线自动降级
- 多种输出格式：终端美化、JSON、Markdown、SARIF
- 风险评分 0–100 分制，带严重级别标签和明确处置建议

## 二、技术原理

### 架构设计

SkillSpector 基于 **LangGraph** 构建两阶段检测管道：

```python
from skillspector import graph

result = graph.invoke({
    "input_path": "/path/to/skill",
    "output_format": "json",
    "use_llm": True,
})

print(f"Risk Score: {result['risk_score']}/100")
print(f"Severity: {result['risk_severity']}")
```

**Stage 1 静态分析**涵盖 11 种分析器：

- 正则模式匹配（覆盖 16 类漏洞模式）
- AST 行为分析（检测 `exec()`、`eval()`、`subprocess` 等危险调用）
- OSV.dev 实时 CVE 查询（依赖已知漏洞检测）
- YARA 签名匹配（恶意软件、webshell、加密挖矿工具）

**Stage 2 LLM 语义分析**（可选）：

- 结合上下文评估意图，过滤误报，提升精度至约 87%
- 内置反越狱保护，防止恶意技能反过来污染分析器

### 核心依赖栈

项目使用 Python 3.12+，关键依赖包括：

- `langgraph` ≥ 1.0.10 — 工作流编排
- `openai` ≥ 2.25.0 — LLM 调用
- `yara-python` ≥ 4.5.0 — 二进制签名匹配
- `httpx` ≥ 0.28.0 — HTTP 客户端（OSV.dev 查询）
- `pydantic` ≥ 2.12.0 — 数据建模

### 风险评分算法

| 级别 | 加分 | 严重程度 | 建议 |
|------|------|----------|------|
| CRITICAL | +50 分 | DO NOT INSTALL | 禁止安装 |
| HIGH | +25 分 | DO NOT INSTALL | 不建议安装 |
| MEDIUM | +10 分 | CAUTION | 谨慎使用 |
| LOW | +5 分 | SAFE | 可安全使用 |

可执行脚本乘以 1.3x 倍率。

## 三、安装与快速开始

### 环境要求

- Python 3.12 或 3.13
- 可选：uv 包管理器（推荐）或 pip
- 可选：Docker（无需安装 Python）
- 可选：LLM API 密钥（用于语义分析）

### 方式一：pip/uv 安装

```bash
git clone https://github.com/NVIDIA/skillspector.git
cd skillspector
uv venv .venv && source .venv/bin/activate
# 或：python3 -m venv .venv && source .venv/bin/activate

make install          # 生产安装
# make install-dev    # 含开发依赖
```

### 方式二：Docker（零 Python 依赖）

```bash
# 构建镜像
make docker-build
# 或：docker build -t skillspector .

# 扫描本地目录（纯静态分析）
docker run --rm -v "$PWD:/scan" skillspector scan ./my-skill/ --no-llm

# 带 LLM 语义分析
docker run --rm \
  -v "$PWD:/scan" \
  --env-file .env \
  skillspector scan ./my-skill/
```

`.env` 文件示例：

```bash
SKILLSPECTOR_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## 四、使用方法与实战

### 基础用法

```bash
# 扫描本地技能目录
skillspector scan ./my-skill/

# 扫描单个 SKILL.md 文件
skillspector scan ./SKILL.md

# 扫描 Git 仓库
skillspector scan https://github.com/user/my-skill

# 扫描 ZIP 文件
skillspector scan ./my-skill.zip
```

### 输出格式切换

```bash
# 终端美化输出（默认）
skillspector scan ./my-skill/

# JSON 输出（程序化处理）
skillspector scan ./my-skill/ --format json --output report.json

# Markdown 输出（生成文档）
skillspector scan ./my-skill/ --format markdown --output report.md

# SARIF 输出（CI/CD 集成）
skillspector scan ./my-skill/ --format sarif --output report.sarif
```

### LLM 分析配置

支持多个 LLM 提供商，通过环境变量切换：

```bash
# OpenAI（默认模型 gpt-5.4）
export SKILLSPECTOR_PROVIDER=openai
export OPENAI_API_KEY=sk-...

# Anthropic（默认 claude-opus-4-6）
export SKILLSPECTOR_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# NVIDIA build.nvidia.com（默认 deepseek-ai/deepseek-v4-flash）
export SKILLSPECTOR_PROVIDER=nv_build
export NVIDIA_INFERENCE_KEY=nvapi-...

# 跳过 LLM，仅静态分析（更快）
skillspector scan ./my-skill/ --no-llm
```

### 实战示例：扫描可疑技能

```bash
# 克隆可疑技能
git clone https://github.com/example/suspicious-skill.git

# 快速静态扫描
skillspector scan ./suspicious-skill/ --no-llm

# 带 LLM 深度分析（推荐）
skillspector scan ./suspicious-skill/ --format json --output scan_result.json
```

典型输出示例：

```
 SkillSpector Security Report  v2.0.0

Skill: suspicious-skill
Scanned: 2026-01-29 10:30:00 UTC

        Risk Assessment
 Metric          Value
 Score           78/100
 Severity        HIGH
 Recommendation  DO NOT INSTALL

Issues (2)

  HIGH: Env Variable Harvesting (E2)
    Location: scripts/sync.py:23
    Confidence: 94%

  HIGH: External Transmission (E1)
    Location: scripts/sync.py:45
    Confidence: 89%
```

## 五、常见问题与解决方案

**Q1：安装时提示 `yara-python` 编译失败？**
yara-python 需要 yara 库和编译工具。在 macOS 上可尝试：`brew install yara`，然后 `pip install yara-python`。

**Q2：OSV.dev 查询超时？**
Tool 内置 1 小时内存缓存，同时在网络不可达时自动切换到内置静态漏洞列表（覆盖主流 CVE），不影响本地分析。

**Q3：Docker 扫描时文件权限问题？**
Docker 容器以 root 运行，默认对挂载目录有读写权限。若需以当前用户运行，可添加 `--user $(id -u):$(id -g)` 参数。

**Q4：LLM 分析提示 API 限流？**
切换 Provider 或在环境变量中设置 `SKILLSPECTOR_LOG_LEVEL=INFO` 查看详细日志。可使用本地 Ollama 绕过 API 限制：

```bash
export SKILLSPECTOR_PROVIDER=openai
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_API_KEY=ollama
export SKILLSPECTOR_MODEL=llama3.1:8b
```

**Q5：如何批量扫描多个技能？**
结合 find 命令和脚本循环处理：

```bash
find ./skills/ -name "SKILL.md" -exec skillspector scan {} \; > scan_report.txt
```

## 六、总结

SkillSpector 填补了 AI Agent 技能生态的安全盲区——从提示注入到供应链攻击，从 AST 行为分析到 LLM 语义评估，提供了目前最完整的技能安全扫描方案。随着 AI Agent 工具越来越普及，这类工具的重要性只会日益凸显。建议所有使用 AI Agent 技能的同学都把它加入安全工具箱，在安装任何第三方技能前先跑一遍扫描。