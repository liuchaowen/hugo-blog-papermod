---
title: "Anthropic Cybersecurity Skills: AI 智能体的网络安全技能库"
date: 2026-05-25
draft: false
categories: ["技术"]
tags: ["AI", "安全", "导航", "人工智能", "nav"]
description: ""
author: "Cheman"
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

## 一、项目概述

**Anthropic Cybersecurity Skills** 是一个面向 AI 智能体的网络安全技能库，收录了 **754 个生产级安全技能**，覆盖 **26 个安全领域**，同时映射到五大行业框架：MITRE ATT&CK、NIST CSF 2.0、MITRE ATLAS、MITRE D3FEND 和 NIST AI RMF。

这个项目解决的核心问题是：初级安全分析师知道如何用 Volatility3 分析内存转储、如何检测 Kerberoasting 攻击，但 **AI 智能体不知道**——除非你把这些技能注入给它。

## 二、核心特性

### 2.1 五大框架全覆盖

这是目前唯一一个同时映射五大框架的开源技能库：

| 框架 | 版本 | 覆盖范围 |
|------|------|----------|
| MITRE ATT&CK | v18 | 14 tactics，200+ techniques |
| NIST CSF 2.0 | 2.0 | 6 functions，22 categories |
| MITRE ATLAS | v5.4 | 16 tactics，84 techniques（AI对抗） |
| MITRE D3FEND | v1.3 | 7 categories，267 techniques |
| NIST AI RMF | 1.0 | 4 functions，72 subcategories |

一个技能同时满足五个框架的合规要求，例如 `analyzing-network-traffic-of-malware` 技能映射如下：

| ATT&CK | NIST CSF | ATLAS | D3FEND | AI RMF |
|--------|---------|-------|--------|--------|
| T1071 | DE.CM | AML.T0047 | D3-NTA | MEASURE-2.6 |

### 2.2 26 个安全领域覆盖

涵盖云安全、威胁狩猎、恶意软件分析、数字取证、API 安全、容器安全、OT/ICS 安全等主流领域，其中云安全（60个技能）和威胁狩猎（55个技能）是技能最密集的方向。

### 2.3 AI 原生架构设计

每个技能的前matter 仅占 ~30 tokens，完整加载 ~500–2,000 tokens，支持渐进式披露。AI 智能体可以先扫描全部 754 个技能的前matter 快速定位相关技能，再按需加载完整工作流。

```yaml
# 技能 YAML 前matter 示例
---
name: performing-memory-forensics-with-volatility3
description: >-
  Analyze memory dumps to extract running processes, network connections,
  injected code, and malware artifacts using the Volatility3 framework.
domain: cybersecurity
subdomain: digital-forensics
tags: [forensics, memory-analysis, volatility3, incident-response, dfir]
atlas_techniques: [AML.T0047]
d3fend_techniques: [D3-MA, D3-PSMD]
nist_ai_rmf: [MEASURE-2.6]
nist_csf: [DE.CM-01, RS.AN-03]
version: "1.2"
```

### 2.4 多平台兼容

支持 Claude Code、GitHub Copilot、Cursor、OpenAI Codex CLI、Gemini CLI 等主流 AI 代码助手和 CLI 工具，以及 LangChain、CrewAI、AutoGen 等 Agent 框架。

## 三、快速开始

```bash
# 推荐方式：npx 安装
npx skills add mukul975/Anthropic-Cybersecurity-Skills

# 或者 Git 克隆
git clone https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git
cd Anthropic-Cybersecurity-Skills
```

## 四、工作原理

AI 智能体使用技能的典型流程：

```
用户提示："分析这个内存转储文件中的凭证窃取行为"

智能体内部流程：
1. 扫描 754 个技能前matter（每个 ~30 tokens）
   → 筛选出 12 个相关技能
2. 加载 Top 3 匹配技能：
   • performing-memory-forensics-with-volatility3
   • hunting-for-credential-dumping-lsass
   • analyzing-windows-event-logs-for-credential-access
3. 按步骤执行工作流
   → 运行 Volatility3 插件，检查 LSASS 访问模式
4. 验证结果并映射到 ATT&CK T1003（凭证转储）
```

## 五、MITRE ATT&CK 覆盖详情

项目覆盖全部 14 个企业战术，其中 Initial Access、Execution、Persistence、Privilege Escalation、Defense Evasion、Credential Access、Lateral Movement、Command and Control、Exfiltration、Impact 等战术达到 **Strong** 覆盖级别。

> **注意：** ATT&CK v19 将于 2026 年 4 月 28 日发布，将 Defense Evasion (TA0005) 拆分为 Stealth 和 Impair Defenses 两个新战术，技能映射将在后续版本更新。

## 六、框架深度解析

### 6.1 MITRE ATLAS — AI/ML 对抗威胁

ATLAS v5.4 新增了 2025 年底以来的智能体 AI 攻击向量，包括：AI 智能体上下文投毒、工具调用滥用、MCP 服务器入侵和恶意智能体部署等技能映射。

### 6.2 MITRE D3FEND — 防御对抗措施

D3FEND 是 NSA 资助的知识图谱，包含 267 个防御技术，覆盖 Model、Harden、Detect、Isolate、Deceive、Evict、Restore 七个战术类别。使用 D3FEND 标签的技能可以让 AI 智能体为检测到的威胁推荐具体的防御对策。

### 6.3 NIST AI RMF — AI 风险管理

AI RMF 定义了 Govern、Map、Measure、Manage 四个核心功能，结合 GenAI Profile (AI 600-1) 的 12 个风险类别（幻觉、数据隐私、提示注入、供应链风险等），为 AI 系统提供全面的风险管理框架。

## 七、总结

Anthropic Cybersecurity Skills 将资深安全分析师的经验转化为 AI 智能体可调用的结构化工作流，弥合了 AI 能力与网络安全实战需求之间的鸿沟。754 个技能覆盖了从威胁情报、渗透测试到事件响应的完整安全生命周期，适合安全研究人员、企业安全团队以及构建 AI 安全智能体的开发者使用。

---

**项目地址：** https://github.com/mukul975/Anthropic-Cybersecurity-Skills