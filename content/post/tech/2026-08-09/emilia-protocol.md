---
title: "EMILIA Protocol：给智能体时代装上「安全带」的授权凭证协议"
date: 2026-08-09
description: "EMILIA 是一套 Apache-2.0 的开源协议与证据底座，在动作发生的那一刻证明「智能体即将执行的动作，正是某位具名人类所授权的动作」。本文从架构、技术原理、快速上手到形式化验证，拆解它如何用「收据（Receipt）」取代「决策日志」，为自主工作流提供可离线验证的授权证据。"
author: "Cheman"
slug: emilia-protocol
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI智能体, 安全, MCP, 授权]
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

今天在 GitHub Trending 上看到一个有意思的项目：**emiliaprotocol/emilia-protocol**，一句话概括——它是「智能体时代的汽车安全带」：在任何不可逆动作（转账、删库、部署、改权限）真正执行之前，先要求一张可被任何人离线验证的「授权收据」。

## 一、项目概述

过去五十年，软件安全回答的核心问题只有一个：**谁能进来？** 防火墙、OAuth、密码，本质都是在门口验证「人类身份」。但那个时代正在落幕——软件的主要使用者不再是人，而是自主 AI 智能体（Agent）。智能体会写代码、调工具、实时改变现实。一个糟糕的 prompt 就能让智能体清空生产数据库，或把钱汇到错误的账户。于是 CISO 们宁可把几十亿 AI 预算压住也不敢上线，因为合规团队回答不了一个问题：**「那次动作，到底是谁批准的？」**

EMILIA（**E**vidence-based **M**achine **I**ntent **L**edger for **I**ntelligent **A**gents，项目命名风格）要解决的正是「**动作发生那一刻的授权（authorization at the moment of action）**」：

> 如何证明「智能体即将做的事」，恰好是「某个具名人类所授权的那件事」——并且在它执行之前就完成证明？

它的核心信条是两张图：

- **Protocol proves. Gate prevents.** EMILIA Protocol 是 Apache-2.0 开源的「验证与证据底座」；EMILIA Gate 是其上商业化的「后果防火墙（Consequence Firewall）」，在受保护的执行器/系统边界上，于变更发生前拒绝动作、一次性消费已接受的授权、并留下他人可验证的证据。
- **No receipt, no irreversible action.** 没有有效 EMILIA 收据，工具就拒绝运行；即使运行了，任何人也能离线、无需信任任何第三方地验证「谁授权了 exactly 什么」。

仓库自述里一句点睛之笔：**Decision logs are testimony. EMILIA produces receipts.**（决策日志只是证言，EMILIA 产出的是收据。）

## 二、技术原理

### 2.1 四个「幕」：从拦截到收据

EMILIA 把一次受控执行拆成四幕，整个过程对智能体是「无感包裹」的（MCP-native、无需改写业务逻辑）：

```
  [ INTENT ]          [ DECISION ]           [ CEREMONY ]           [ RECEIPT ]
  智能体通过 MCP   策略绑定、哈希固定:   具名人类在自有设备      签名、可离线验证
  调用工具      →  allow /           →  对 EXACT 动作签名    →  的凭证。篡改它：
                   allow-with-signoff /    (passkey)。所见=所签。   构造上即失败。
                   deny (+observe 模式)
```

- **第一幕 · 拦截（MCP-native）。** 不改写任何代码，EMILIA 在 Model Context Protocol 边界处钩住工具调用——智能体想删文件或挪资金的那一刻，动作被「半空截停」。
- **第二幕 · 决策（策略绑定、确定性）。** 动作对照哈希固定的策略判定：`allow` / `allow-with-signoff` / `deny`。此外还有 **observe 模式**：对生产零改动，只报告「本会被拦下的动作」。确定性、可审计，不是黑盒风险评分。
- **第三幕 · 仪式（设备绑定的具名人类签核）。** 当策略要求人类介入时，EMILIA 运行一次 **WebAuthn/passkey 签核**，该签核绑定「确切动作」及其「确定性展示哈希」——即操作员自有设备上的 Face ID / Touch ID。「所见即所签（what you saw = what you signed）」。一条正确安装的保护路径无法跳过这场仪式。
- **第四幕 · 收据（证据）。** 产出一张**签名授权收据**，任何人都能用开源代码、离线、无后端、无厂商信任地验证。篡改它，验证在构造上即失败。核心无需区块链（可选公开时间戳锚定）。

### 2.2 EP 技术栈与核心对象

仓库把能力组织为 EP 栈，每层各司其职：

| 层 | 职责 |
|---|---|
| **EP Eye** | 观察并分类智能体行为（OBSERVE → SHADOW → ENFORCE） |
| **EP Handshake** | 带 7 属性绑定的密码学同意仪式 |
| **EP Signoff** | 具名人类所有权——WebAuthn/passkey Class A，设备绑定；高风险动作支持**多方法定（M-of-N/有序，即双人规则）** |
| **EP Commit** | 原子的、不可变的动作收尾，收据以 Merkle 链串联 |

EP 标准化了三个可互操作对象，任何符合实现都能产出与验证：

- **Trust Receipt（信任收据）**：授权事件的可携带、签名记录——「发生了什么」。
- **Trust Profile（信任画像）**：可观测信任状态的标准化摘要——「已知什么」。
- **Trust Decision（信任决策）**：带理由与申诉路径的策略评估结果——「现在该做什么」。

EP Extensions（Handshake、Signoff、Commit、Delegation）在需要约束执行的系统上提供更强保障；其上才是商业化的 Gate 与 Assurance Plane 产品层。

### 2.3 离线、无密钥即可跑的最小闭环

仓库强调「冷启动」体验——每个 demo 都完整跑通「被拒 → 具名人类签署确切动作 → 工具运行 → 伪造收据被拒」的整条回路，全程离线、无 API key、无账号：

```bash
node examples/mcp/payment-server.mjs    # release_payment  — 无收据则拒绝
node examples/mcp/github-admin.mjs      # delete_repo      — 无收据则拒绝
node examples/mcp/prod-deploy.mjs       # deploy_production — 无收据则拒绝
```

更深的组合 demo 会经 Gate 真实的「有界能力路径」执行一次 CAID 绑定的委托支付，再离线验证签名执行证书：

```bash
npm run demo:receipt-program
```

注意它**刻意不含区块链或模拟零知识证明**。

### 2.4 形式化验证与证据工程

这不是「架构宣称」，而是「可执行的工程证据」。仓库当前状态：

- 解析 **35 条安全声明，覆盖 255 个哈希证据文件**；
- 在**两个组合的 Dolev-Yao 模型上验证 20 个 Tamarin 引理**（17 个 all-traces 义务 + 3 个 exists-trace 可达性见证）；
- 保留 **8 个刻意弱化的变体**，当承载性检查被移除时会产生具体攻击轨迹；
- 跨语言验证器（JS / Python / Go）在对抗性一致性向量上「口径一致」；另有外部从规范实现的 Rust 验证器通过固定的 16-suite/164-vector 包与 359-case 敌意测试；
- 整体 **8,659+ 自动化测试，跨 509+ 文件**；生产 JS/JSDoc 以 TypeScript `checkJs` 编译器检查。

可以本地跑一条聚焦的 Gate 路径证明：

```bash
npm run proof:gate:reference
```

## 三、安装与快速开始

EMILIA 提供多种入口，零配置即可试跑。30 秒离线签发一张收据：

```bash
# 离线签发一张收据——无需 API key、无需后端
npx @emilia-protocol/issue demo
```

把它接到 Claude / Cursor / Cline：

```bash
npx -y @emilia-protocol/mcp-server
```

针对你声明的工具面做一轮干跑（dry run），再生成可评审的集成文件：

```bash
npx @emilia-protocol/scan protect ./tools.json
npx @emilia-protocol/scan protect ./tools.json --apply
node emilia/verify-setup.mjs
```

SDK 双语言分发：

```bash
pip install langchain-emilia   # PyPI
npm install @emilia-protocol/verify  # npm
```

## 四、使用方法与实战

### 4.1 给任意 LangChain 工具包一层 Gate

用 `langchain-emilia` 把任意破坏性工具裹上 EP 闸门，不可逆调用即获得密码学强化的、映射到 NIST AI RMF 的「批准+证据」层：

```python
# langchain-emilia —— 用 EP gate 包裹任意 LangChain 工具
from langchain_emilia import EmiliaGateClient

gate = EmiliaGateClient(base_url="https://www.emiliaprotocol.ai", api_key="...")
safe_tool = gate.wrap(your_destructive_tool)
```

### 4.2 开发者楔子：一个不可逆 MCP 工具的包装器

商业化的切入点是「包一个不可逆 MCP 工具」。自述给出的心智模型很直接：扫描（`npx @emilia-protocol/scan`）→ 保护一个特权 MCP 工具调用 → $25K 试点。仓库里 `examples/mcp/` 下就放了 `payment-server` / `github-admin` / `prod-deploy` 三个最小可跑示例，分别对应「汇款、删库、生产部署」三类典型不可逆动作。

### 4.3 企业侧：把不可预测的智能体变成可审计基建

平台级转型都会铸造新的安全原语：Web 有 **SSL**，云有 **Okta/IAM**，智能体经济需要**动作级信任（action-level trust）**。EMILIA 的托管 Gate 与 Assurance Plane 在开放标准之上叠加行业策略包、observe 模式试点与可审计证据包，逐原语映射到 NIST AI RMF、EU AI Act、SOC 2 CC6/7。

首个付费市场是「付款方 AI 辅助的不良医疗必要性判定」，并立下一条安全红线：**无有效持证审查证据，不得做出不良判定**；缺失证据须路由到合法人工审查或患者保护性兜底，而非作为拒付 medically necessary 照护的授权。

### 4.4 标准工作：IETF 个人草案组合

EMILIA Protocol 开源（Apache-2.0），标准工作以一组独立的 Internet-Draft 发表。规范的「四文档展示面」：

1. **Authorization Receipts-10**：定义动作绑定的批准证据档案（当前发布修订 -10，标准轨道候选个人提交）。
2. **Human Authorization Binding-00**：把具名人类授权产物绑定进相邻宿主记录。
3. **Authority Introduction-03**：建立依赖方固定的信任根与有界权威。
4. **Authorization Evidence Chain-05**：评估「原生验证、动作匹配的证据」是否满足依赖方要求，返回 `SATISFIED` / `UNSATISFIED`，**绝不**返回 `AUTHORIZED`。

> 已发布的 Internet-Draft 不是 RFC、不是被采纳的工作组条目、也不是 IETF 背书；Datatracker 才是修订与状态的权威来源。

## 五、常见问题与解决方案

**Q1：EMILIA 是 OAuth/OIDC 的替代品吗？**
不是。OAuth/OIDC 回答「你是谁（who are you）」，EMILIA 回答「这个确切动作是谁批准的（who approved this exact action）」。二者互补，EMILIA 不是身份系统。

**Q2：它依赖区块链吗？**
不依赖。收据（Receipt）才是主角，可选的公开时间戳锚定只是脚注。核心验证全程离线、无需后端。

**Q3：observe 模式会改动生产环境吗？**
不会。observe 模式对生产零改动，只报告「本会被拦下的动作」，常用于试点前的风险可见化。

**Q4：本地 `proof:gate:reference` 跑通，能证明生产已落地吗？**
不能。该命令用生成密钥、内存状态、mock provider 跑本地示例，是「有用的本地证明」，而**不是**真实人类、外部银行、生产部署或端到端生产集成的证据。生产需要持久溯源账本、共享原子消费存储、固定密钥，以及覆盖每条通往真实凭据路径的包装器。

**Q5：跨语言验证器一致，是否等同独立实现级别的确证？**
不完全。JS/Python/Go 三套同队参考实现在 21 套件 331 向量上一致，是「同一团队多端口的一致性检查」，而非清洁室独立实现。外部 Rust 实现通过固定包与敌意测试，但其构建证据仍是实现者自签，严格清洁室验收仍待独立第三方背书清单。

## 六、总结

EMILIA Protocol 把「授权」从「进门时验证身份」推进到「动作发生时验证意图」：用一张可离线验证、可篡改即失效的**签名收据**，替代那种「事后谁都说不清」的决策日志。它定位清晰——是智能体经济的「安全带」而非「锁」：不替你做决定，只在不可逆动作真正落下前，逼出一个可证明、可审计、可归属的「谁批准了 exactly 什么」。

工程上它罕见地把「可执行的证据」做成了卖点：35 条安全声明、20 个 Tamarin 引理、8,659+ 测试、跨语言一致性验证，外加零配置即可跑的离线 demo 与 MCP 集成。无论你是被「跑偏的智能体循环、API 超支、误删数据」吓退的开发者，还是卡在合规关、手握 AI 预算却不敢花的企业，EMILIA 都值得作为「动作级信任」的参考底座去试用。

> 项目地址：https://github.com/emiliaprotocol/emilia-protocol （Apache-2.0）
