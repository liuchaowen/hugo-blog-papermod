---
title: "Claude-BugHunter: 让 Claude Code 变身漏洞猎手的 82 个技能包"
date: 2026-08-12
description: "Claude-BugHunter 是一个为 Claude Code 打造的漏洞挖掘与红队技能包，包含 82 个技能、15 个斜杠命令，覆盖 Web 安全、API 测试、企业身份平台、GraphQL、OAuth 等 24 个漏洞类别的 681 个公开 HackerOne 报告模式，让 AI 助手从通用聊天机器人变身为专业安全研究员。"
author: "Cheman"
slug: claude-bughunter
draft: false
categories: ["安全", "AI", "开源"]
tags: ["安全", "AI", "Claude", "漏洞挖掘", "红队", "GitHub"]
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

今天在 GitHub Trending 上看到一个让人眼前一亮的项目：**Claude-BugHunter**，一个将 Claude Code 直接武装成专业漏洞猎手和红队操作员的技能包。82 个技能、681 个公开报告模式——这不只是一个工具集，更像是一位经验丰富的安全研究员的思维框架被编码进了 AI。

## 一、项目概述

**Claude-BugHunter** 是由安全研究员 Sachin Sharma（[elementalsouls](https://github.com/elementalsouls)）打造的一个 Claude Code 技能插件，安装后 Claude Code 不再只是问答机器人，而是像一个资深漏洞猎人一样工作。

核心数据一览：
- **82 个技能**（Skills），按主题自动加载，无需记忆命令名称
- **15 个斜杠命令**（Slash Commands），如 `/hunt`、`/recon`、`/report`
- **681 个公开 HackerOne 报告**提炼出的检测模式
- **24 个核心漏洞类别**的 payload 和绕过表
- 支持四大 Agent 框架：**Claude Code · OpenCode · Codex CLI · Hermes Agent**

项目还内置了企业级身份与基础设施攻击矩阵，覆盖 M365/Entra、Okta、vCenter、SSL-VPN 设备等主流企业平台的最新 CVE 链。

安装方式简洁到极致，提供了插件式（推荐）和拷贝式两种路径，前者一行命令搞定，后者适合离线场景：

```text
# 插件方式（推荐）
/plugin marketplace add elementalsouls/Claude-BugHunter
/plugin install claude-bughunter@elementalsouls
```

安装完成后，直接用自然语言描述你的测试目标，相关技能就会自动加载——完全不需要记忆任何命令。

## 二、技术原理

### 技能自动加载机制

Claude-BugHunter 的核心哲学是"**描述即加载**"。当你描述一个测试场景时，系统会自动匹配最相关的技能：

```
> Testing acme.com — an in-scope HackerOne target. Run recon and rank the surface.

  ⟳ loading skills: web2-recon, offensive-osint, bb-methodology …
    → subdomain enum (subfinder + crt.sh) … 47 hosts
    → live hosts (httpx) … 12 · tech fingerprint … 6 distinct stacks
    → ranked surface: api.acme.com (GraphQL, introspection ON)
```

这种自动路由背后依赖的是 Claude Code 的 Skill 格式——所有技能都是标准化的 `SKILL.md` 文件，每个技能描述自己的触发场景和功能，Claude Code 根据对话上下文自动选择合适的技能。

### 六阶段非线性和工作流

项目采用 **recon → map & rank → hunt → validate → report** 的六阶段工作流，并且允许非线性推进（根据实际发现随时跳转阶段）。这个框架通过 `/hunt` 命令和 `cbh` CLI 驱动：

```bash
# cbh CLI — 终端原生运行器
pipx install git+https://github.com/elementalsouls/Claude-BugHunter.git
cbh engage acme.com
```

核心是 **7-Question Gate**（七问门控）：在提交任何漏洞前，必须通过这个门控验证合法性、在 scope 范围内、影响可复现——这是一个质量保障机制，类似于资深猎手的自查清单。

### 技能分层架构

技能分为四层，每层解决不同阶段的问题：

| 层级 | 技能类型 | 说明 |
|------|---------|------|
| **Think** | 方法论 | `bb-methodology` + `redteam-mindset`：五阶段非线性和工作流、批判性思维框架 |
| **Hunt Webapps** | 检测技能 | 48 个 `hunt-*` 技能，覆盖 XSS、SQLi、SSRF、IDOR、OAuth 等 |
| **Hit Perimeter** | 平台链 | M365/Entra、Okta、vCenter、SSL-VPN 等企业平台的 CVE 链 |
| **Ship It** | 报告技能 | `triage-validation` + `evidence-hygiene`：VRT 感知分级、证据脱敏 |

### 报告与合规性保障

项目内置 Bugcrowd（H1 VRT 感知）、HackerOne、Intigriti、Immunefi 等多个平台的报告模板，并在提交前自动执行 PII 脱敏检查，防止证据截图泄露敏感信息。这是真实渗透测试和漏洞赏金项目中非常重要但经常被忽视的环节。

`cbh` CLI 工具（`pyproject.toml` 中定义）提供了完整的终端原生工作流：

```python
# pyproject.toml — CLI 入口
[project.scripts]
cbh = "cbh.cli:main"

[project]
name = "claude-bughunter"
version = "2.1.0"
requires-python = ">=3.9"
```

CLI 不依赖任何外部 HTTP 库（`requests` 是可选的，`cbh` 优先使用 `urllib`），确保在任何环境下都能运行。

## 三、安装与快速开始

### 环境要求

- Python 3.9+
- Git（用于克隆仓库）
- Claude Code / OpenCode / Codex CLI / Hermes Agent（至少一个）

### 安装步骤

**方式 A — 插件安装（推荐，最快）：**

```bash
/plugin marketplace add elementalsouls/Claude-BugHunter
/plugin install claude-bughunter@elementalsouls
```

**方式 B — 拷贝安装（适合离线或多框架场景）：**

```bash
git clone https://github.com/elementalsouls/Claude-BugHunter.git
cd Claude-BugHunter

# macOS / Linux
bash scripts/install.sh

# Windows
pwsh ./scripts/install.ps1
```

`--all` 参数同时安装到所有支持的 Agent 框架路径：

```bash
# 安装到所有四个框架 + Burp MCP 集成
bash scripts/install.sh --all --burp-mcp
```

### 快速验证

```text
> I'm testing api.target.com (HackerOne in-scope). It uses GraphQL with introspection enabled.
  What endpoints might be exploitable?

  ⟳ loading skills: hunt-graphql, hunt-api-misconfig, bb-methodology …
    → GraphQL introspection analysis …
    → potential misconfigs: query depth limit OFF, batch queries ON
    → next: want me to test batch query DoS and introspection data exposure?
```

## 四、使用方法与实战

### 基础用法：Bug Bounty 场景

```text
> I'm hunting on HackerOne. Target is a fintech SaaS with GraphQL API.
  Recon first, then rank the attack surface.

  ⟳ loading skills: web2-recon, offensive-osint, bb-methodology, hunt-graphql
    → subdomain enum (subfinder + crt.sh + amass) … 89 hosts
    → live hosts (httpx) … 23 · tech fingerprint … 9 stacks
    → ranked surface:
       api.fintech.target.com (GraphQL, introspection ON) ← start here
       auth.fintech.target.com (OAuth 2.0 + PKCE)           ← hunt-oauth
       cdn.fintech.target.com (AWS CloudFront)              ← lower priority
```

### 高级用法：外部红队场景

针对企业基础设施（M365、Okta、vCenter）的 CVE 链：

```text
> We have valid credentials for a target's Okta tenant. 
  What post-auth attack surface should we prioritize?

  ⟳ loading skills: okta-attack, cloud-iam-deep, redteam-mindset
    → MFA bypass vectors (Okta MFA bypass via API)
    → privilege escalation paths (admin role assignment)
    → session token manipulation (Okta API token reuse)
    → O365/Entra escalation chain available after Okta compromise
```

### 报告生成

```text
> Generate a H1-format report for an IDOR I found in /api/v2/users/{id}/profile
  The user's PII was exposed without authentication.

  ⟳ loading skills: triage-validation, bugcrowd-reporting, evidence-hygiene
    → severity assessment: CVSS 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)
    → VRT mapping: server-side-security-misconfiguration → programmatic-access
    → PII check: no PII in evidence ✓
    → report draft ready for review
```

## 五、常见问题与解决方案

### Q1: Claude 拒绝执行某些安全测试请求？

Anthropic 模型对高风险网络安全操作有内置安全策略。如果你正在进行授权的安全评估，可以申请加入 [Cyber Verification Program (CVP)](https://claude.com/form/cyber-use-case)，模型会相应调整策略。描述工作时使用防御性措辞（如"安全审计"、"检查代码安全漏洞"）也能帮助模型正确理解上下文。

### Q2: 技能没有自动加载怎么办？

检查是否正确安装了插件。使用 `/plugin list` 查看已安装插件，或手动加载技能：

```bash
# 手动加载特定技能
/skill claude-bughunter:hunt-graphql
```

### Q3: `cbh` CLI 报错 `ModuleNotFoundError`？

确保 Python 版本 ≥ 3.9：

```bash
python3 --version  # 应该是 3.9+
pipx install git+https://github.com/elementalsouls/Claude-BugHunter.git
```

### Q4: 企业平台 CVE 数据过时？

CVE 覆盖会定期更新（路线图中计划按季度刷新企业 VPN CVE 矩阵）。你也可以手动更新 `docs/cve-coverage.md` 或使用 `docs/automation/cve-refresh.yml.template` 自动化刷新。

### Q5: 技能与 Claude-OSINT 冲突？

Claude-BugHunter 和 [Claude-OSINT](https://github.com/elementalsouls/Claude-OSINT) 是配套项目，前者覆盖渗透测试阶段，后者覆盖侦察阶段。两个项目的 `install.sh` 都维护一个安装清单，重复的技能不会被覆盖，安装两者是安全的。

## 六、总结

Claude-BugHunter 解决了一个很实际的问题：大多数 AI 安全工具要么太通用（只有一个"安全"提示词），要么太碎片化（需要手动管理几十个参考文档）。这个技能包通过将真实漏洞赏金和红队经验编码为可自动加载的技能，让 Claude Code 真正成为一个可扩展的漏洞猎手助手。

对于 Bug Bounty 猎人来说，681 个真实报告提炼出的 payload 和绕过表是极其宝贵的知识库；对于企业安全团队来说，覆盖 M365/Entra、Okta、vCenter 等主流平台的攻击链提供了急需的外部攻击面视角。MIT + CC BY 4.0 双许可证也意味着可以自由地在此基础上构建自己的工具集。

如果你对 AI 辅助安全测试感兴趣，这个项目值得深入研究——尤其是它与 Burp Suite MCP 的集成，以及 `/hunt` 命令驱动的结构化渗透测试工作流。

> 项目地址：[https://github.com/elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter)
> 姊妹项目：[Claude-OSINT](https://github.com/elementalsouls/Claude-OSINT)（侦察阶段配套工具）
