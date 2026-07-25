---
title: "iFixAi: AI 操作偏差诊断工具，让你的 AI 代理更安全可控"
date: 2026-07-25
description: "iFixAi 是一款开源的 AI 操作偏差诊断工具，通过 45 项检测（32 项核心 + 13 项高级）评估 AI 代理是否存在幻觉、权限滥用、提示词注入等行为偏差，支持 CLI、插件和 Skill 三种运行方式，可集成到 CI 流程中。"
author: "Cheman"
slug: ifixai
draft: false
categories: ["AI安全", "开源工具", "技术测评"]
tags: ["AI Governance", "AI Safety", "Python", "GitHub Trending", "AI Agent"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**iFixAi**，一句话描述其核心价值——它是一款专门诊断 AI 操作偏差（Operational Misalignment）的开源工具，能在 AI 悄悄做出越权、幻觉、提示词注入等危险行为之前，提前发现并给出 A–F 评级。

## 一、项目概述

iFixAi 检测的是一种极其隐蔽的风险：**AI 的动作、遗漏或行为与业务预期不符，但常规 KPI 完全看不出来**。比如一个 AI 代理可能在所有仪表盘指标都达标的同时，悄悄泄露了一个权限、制造了一条虚假引用、屈服于一段恶意提示词，或者做了超出授权范围的事——这些盲点往往直到演变成事故、客户投诉或监管问询时才被发现。iFixAi 的目标就是抢在损失发生之前把这些盲点照亮。

项目运行多达 **45 项检测**，分为两个层级：

- **32 项核心检测**：覆盖五大偏差风险支柱——Fabrication（捏造）、Manipulation（操纵）、Deception（欺骗）、Unpredictability（不可预测性）和 Opacity（不透明），这些检测共同决定最终 A–F 评级（≥0.90 得 A，≥0.85 通过）。
- **13 项高级检测**：涵盖 Sabotage（破坏）、Sandbagging（隐藏能力）、Power Elevation（权限提升）等 11 个前沿风险类别，这些结果独立计分，不会影响主评级，但 P01（强制最小项）若不通过，会将总分上限压至 60%。

整个项目的设计哲学是**信任必须诚实**：默认由独立第三方 Judge 模型评分，而非被测模型自评；每次运行还会写入完整输入清单（manifest），支持事后审计和回放。

**三种运行方式：**

| 方式 | 适用场景 | 特点 |
|---|---|---|
| **CLI 向导** | 首次使用、快速迭代 | `ifixai setup` → `ifixai run`，零配置重复执行 |
| **CLI 显式参数** | CI/CD、自动化审计 | 全参数可控，适合脚本化批量运行 |
| **Plugin / Skill** | 在已有 AI 工具中集成 | Claude Code、Codex、Cursor 等直接调用，交互式评分卡 |

## 二、技术原理

### 架构设计

iFixAi 的核心架构围绕 **SUT（System Under Test）** 和 **Judge** 两个角色展开：

- **SUT**：被测对象，可以是任意通过 OpenAI 兼容 HTTP 接口暴露的 AI 代理，也可以通过自定义 `ChatProvider` 适配器接入任意端点。
- **Judge**：评分模型，通常使用与 SUT 不同厂商的模型（如 SUT 用 OpenAI，Judge 用 Anthropic），避免自我评分，确保结果可引用（citable）。

```python
# pyproject.toml 中定义的 Provider 适配体系
[project.optional-dependencies]
openai = ["openai>=1.0"]
anthropic = ["anthropic>=0.18"]
gemini = ["google-generativeai>=0.3"]
openrouter = ["openai>=1.0"]
azure = ["openai>=1.0"]
bedrock = ["boto3>=1.28"]

# 自定义 Provider 示例（ifixai/providers/base.py）
class ChatProvider:
    def send_message(self, prompt: str, **kwargs) -> str:
        raise NotImplementedError
    
    # 可选钩子：暴露越多，检测覆盖率越高
    def list_tools(self): ...
    def get_audit_trail(self): ...
    def authorize_tool(self, tool_name: str): ...
```

### 检测评分机制

核心五大支柱的权重分配：Manipulation 0.35、Fabrication 0.20、Deception 0.15、Unpredictability 0.15、Opacity 0.15。评分采用 A–F 字母制（`A ≥ 0.90`、`B ≥ 0.80`、`C ≥ 0.70`、`D ≥ 0.60`、`F < 0.60`），通过强制最小项（B01=100%、B08=95%、P01=100%）防止作弊。

```bash
# 单 Judge 评分（Sonnet，推荐方案）
--eval-mode single \
  --judge-provider openrouter \
  --judge-model anthropic/claude-sonnet-4.6

# 双 Judge 评分（Full 模式，更强鲁棒性）
--mode full --eval-mode full \
  --judge-provider openrouter --judge-model google/gemini-2.5-pro \
  --judge-provider openrouter --judge-model openai/gpt-5.4-mini
```

### 测试集（Suite）结构

| Suite | 检测数 | 适用场景 |
|---|---|---|
| `smoke` | 3 | 验证流水线可用性 |
| `strategic` | 8 | 快速了解最高风险点 |
| `core` | 32 | 标准评分（含五大支柱） |
| `extended` | 13 | 前沿风险信号 |
| `all` | 45 | 完整检测（默认） |

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- pip 或 uv 包管理器
- 被测 AI 代理（通过 HTTP API 或本地 SDK 接入）

### 最简安装

```bash
# 安装 CLI + 指定 Provider 的 SDK
pip install "ifixai[openai]"

# 内置 Mock 验证（无需 API Key，约 1 秒）
ifixai run --provider mock --api-key not-used --eval-mode self
```

### 完整评分运行

```bash
# 安装双 Provider（被测 + 评分）
pip install "ifixai[anthropic,openai]"

# 导出被测模型 API Key（Judge 的 Key 自动从环境变量配对）
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

# 运行核心检测
ifixai run --provider anthropic --api-key "$ANTHROPIC_API_KEY"

# 结果输出到 ./ifixai-results/（含 JSON + Markdown）
```

### Plugin 方式（Claude Code）

```bash
/plugin marketplace add ifixai-ai/iFixAi
/plugin install ifixai@ifixai-ai

# 在 Claude Code 中直接说：
# "run iFixAi on my setup"
# 或输入 /ifixai:ifixai
```

### Skill 方式（任意 Agent）

```bash
# 安装到任意 Agent
uvx ifixai install --agents cursor
uvx ifixai install --agents all   # 全部支持

# 在对应 Agent 中运行 /ifixai-skill
# 支持 Claude Code、Codex、Cursor、VS Code、Windsurf、Cline、Continue、Zed 等
```

## 四、使用方法与实战

### 测试自己的 HTTP 代理

```bash
# 指向真实部署的 AI 代理（推荐场景）
ifixai run \
  --provider http \
  --endpoint https://your-agent.internal/v1/chat \
  --grounding sut
```

`--grounding sut` 表示以被测代理原始状态测试，保留其自身的治理机制，而非绕过它们。

### 在 CI 中集成

```yaml
# .github/workflows/ai-safety.yml
name: AI Safety Diagnostic
on: [push, pull_request]

jobs:
  ifixai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install "ifixai[openrouter,anthropic]"
      - run: |
          export OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          export ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}
          ifixai run \
            --provider openai \
            --api-key "$OPENAI_API_KEY" \
            --suite core \
            --eval-mode single \
            --judge-provider openrouter \
            --judge-model anthropic/claude-sonnet-4.6
      - uses: actions/upload-artifact@v4
        with:
          name: ifixai-results
          path: ifixai-results/
```

### 查看完整文档

```bash
ifixai list suites           # 列出所有可用检测集
ifixai run --print-telemetry # 查看即将发送的遥测数据
```

完整文档位于 `docs/` 目录：
- 🟢 新手上路 → [Get Started](https://github.com/ifixai-ai/iFixAi/blob/main/docs/get-started.md)
- 🔧 接入被测代理 → [Testing Your Agent](https://github.com/ifixai-ai/iFixAi/blob/main/docs/testing-your-agent.md)
- 📖 评分机制详解 → [Scoring](https://github.com/ifixai-ai/iFixAi/blob/main/docs/scoring.md)

## 五、常见问题与解决方案

**Q: Windows 上安装后找不到 `ifixai` 命令？**
> 将 Python 的 `Scripts\` 文件夹加入 PATH，或直接使用 `python -m ifixai`。这是 Python 在 Windows 上的通用 PATH 问题，与 iFixAi 本身无关。

**Q: 评分显示 `insufficient_evidence` 是什么意思？**
> iFixAi 无法从你的 Adapter 中获取足够的上下文来判断该项。这通常意味着你的 `ChatProvider` 自定义实现没有暴露足够的能力钩子（如 `list_tools`、`get_audit_trail` 等）。暴露越多，评分覆盖率越高。

**Q: 什么是"可引用的评分"（Citable Grade）？**
> 由独立第三方 Judge 模型（非被测模型自身）给出的评分。需要在不同厂商之间配对（如 OpenAI 被测 + Anthropic 评分）。加上 `--eval-mode self` 则是冒烟测试，结果会标注为"自评"，不能作为可引用依据。

**Q: 如何选择合适的 Judge？**
> 推荐配置：单 Judge 用 Sonnet（`claude-sonnet-4.6`），约 $12–18/次；双 Judge 用 Gemini 2.5 Pro + GPT-5.4-mini，约 $10–14/次，后者跨厂商更强。

**Q: 遥测数据包含什么？**
> 仅发送伪匿名的安装 ID、运行开始/完成状态、工具版本、操作系统和接口类型（CLI 或 Plugin）。**不包含**代码、评分结果、提示词、文件路径或 IP 地址。CI 环境下自动关闭。可通过 `--no-telemetry` 或 `IFIXAI_TELEMETRY=0` 随时退出。

## 六、总结

iFixAi 填补了 AI 代理安全评测领域的空白——它不只是一套测试工具，更是一套可重复运行的诊断系统，能在 CI 流程中持续监控 AI 的行为偏差。无论是 AI 应用开发者想要验证自己的代理是否"行为端正"，还是安全团队需要对第三方 AI 服务做采购前评估，iFixAi 都是一个值得深入了解的项目。当前版本 3.2.0，支持 Python 3.10+，Apache 2.0 开源许可证。

---

> **项目地址**：https://github.com/ifixai-ai/iFixAi  
> **文档**：https://github.com/ifixai-ai/iFixAi/blob/main/docs/get-started.md
