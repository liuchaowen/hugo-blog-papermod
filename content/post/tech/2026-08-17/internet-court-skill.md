---
title: "Internet Court Skill：为 AI Agent 经济打造的开放纠纷裁技能"
date: "2026-08-17"
description: "Internet Court 是一个开源 Agent 技能，将碎片化的 Agent 间交易协议栈（六层标准）统一封装，并独家加入纠纷裁审层，让 AI Agent 在无人值守的情况下也能安全交易、放心协作。"
author: "Cheman"
slug: internet-court-skill
draft: false
categories: ["技术", "开源", "AI Agent"]
tags: ["GitHub", "开源", "AI Agent", "智能合约", "Web3", "Agentic Commerce"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Internet Court Skill**，它是一个专为 AI Agent 间商业交易设计的开源技能包，旨在解决一个核心问题——当两个 AI Agent 在没有人类介入的情况下达成交易后，如果出了问题该怎么办。

## 一、项目概述

**Internet Court** 不是一个单独的产品，而是一个**开放技能（skill）**——将 AI Agent 经济中从发现、谈判、签约、支付到纠纷裁定的六大协议层统一封装，让 Agent 只需加载一个技能，就能完成整个交易生命周期的协作。

### 核心问题

当前 AI Agent 之间的交易依赖多个独立协议，每个协议都只处理"一切顺利"的场景。一旦纠纷发生，所有层都会把问题推给下一层，最终无人负责。Internet Court 的解决思路是：**在合同签订时，预先约定好如果出问题谁来裁判**——这个预判机制（adjudication）才是把"交易"变成"经济"的关键。

### 发起方阵容

这是一个由 **GenLayer、MetaMask、OKX、NEAR、Starknet、x402、0G Labs、ZKsync、Nansen、Kleros、Privy** 等 26 家机构组成的联盟共同构建的开放标准，每个成员的核心协议都直接嵌入技能中。

## 二、技术原理与架构

### 六层协议栈

Internet Court skill 将整个 Agent 商业交易链路分为六层：

| # | 层级 | 核心协议 | 说明 |
|---|---|---|---|
| 1 | 发现、身份与声誉 | ERC-8004, ERC-7857 | 链上 Agent 注册与信任评分 |
| 2 | 谈判 | A2A (Agent-to-Agent) | 多 Agent 工作流编排 |
| 3 | 合同与义务 | ERC-7710, ERC-8183, Arkhai | 自然语言协议 + Git Escrow |
| 4 | 支付与托管 | x402, MPP, APP | 微支付、代理支付、聚合支付 |
| 5 | 执行层 | 计算/数据/价值轨道 | 0G Compute、NEAR、Solana、Heurist 等 |
| 6 | 验证与纠纷 | GenLayer, Kleros, UMA | **Internet Court 独家掌握的层** |

### 纠纷裁定机制（Adjudication）

当一笔交易触发争议时，Agent 会根据预先在合同中写明的仲裁规则，将争议提交给选定的裁定者（GenLayer 的乐观仲裁、Kleros 的法庭众裁或 UMA 的代币加权投票）。这个裁定结果再触发第 4 层的资金释放或退款操作。

### 源码结构

```
SKILL.md                            # 主技能入口，按需路由到子技能
integrations/                       # Internet Court 自研的连接器
vendored/                           # 90 个来自各协议官方的技能副本（不可变）
  ├── genlayerlabs/                 # GenLayer 官方技能（5个）
  ├── metamask/                     # MetaMask 智能账号套件
  ├── okx/                          # OKX OnchainOS 技能（9个）
  ├── starknet/                     # Starknet 全套技能
  └── ...
skills-lock.json                    # 每个 vendored 技能的哈希 + 来源 + 更新命令
```

**vendored 的意义**：技能引用的是上游官方技能的固定副本（附哈希校验），而不是实时拉取。这样做的好处是——即使上游仓库被删除或篡改，Internet Court 技能中的协议内容依然稳定可用。

## 三、安装与快速开始

### 安装方式（任选其一）

```bash
# OpenClaw
openclaw skills install git:internet-court/internet-court-skill

# Claude Code
/plugin marketplace add internet-court/internet-court-skill
/plugin install internet-court@internet-court

# npx
npx skills add internet-court/internet-court-skill

# 手动克隆
git clone https://github.com/internet-court/internet-court-skill ~/.claude/skills/internet-court
```

### 安装后验证

加载技能后，给 Agent 一个任务即可开始。例如：

```
"我想让两个 Agent 通过 Internet Court 技能签订一份代码审核合同，预付 0.1 USDC，成功后释放，失败则裁定退款。"
```

主技能（`SKILL.md`）会根据需求动态路由到对应的子技能（支付层、合同层或裁定层）。

## 四、使用方法与实战

### 场景一：Agent 间微支付

通过 `coinbase/agentic-wallet`（x402 标准）实现按调用付费：

```json
{
  "skill": "coinbase/agentic-wallet",
  "action": "pay",
  "to": "agent-0x123...",
  "amount": "0.001",
  "currency": "USDC",
  "x402": true
}
```

### 场景二：Git Escrow 合同

通过 `arkhai-io/git-commit-trading`，两个 Agent 可以用 Git commit 哈希作为履约凭证：

```json
{
  "skill": "arkhai/git-commit-trading",
  "buyer": "agent-a",
  "seller": "agent-b",
  "commit_hash": "abc123...",
  "escrow_amount": "1.0",
  "currency": "USDC",
  "adjudicator": "genlayer"
}
```

如果 `agent-b` 未在约定时间提交正确的 commit，GenLayer 裁定后资金自动退回 `agent-a`。

### 场景三：多协议串联

最完整的场景——用 Internet Court 技能串联六层：

1. **A2A 协议**（OpenServ）发起谈判 → 2. **ERC-7710** 签署合同 → 3. **x402** 预付托管 → 4. **NEAR** 执行计算 → 5. **GenLayer** 验证结果 → 6. 如有争议 → 裁定并释放/退款

整个流程由一个技能统一编排，无需 Agent 手动管理各层 API。

## 五、常见问题

**Q: 仲裁裁定需要多久？**
A: 取决于选定的裁定者。GenLayer 通常在几分钟内完成乐观仲裁（Optimate），Kleros 众裁可能需要数天。

**Q: 如果上游 vendored 技能更新了，Internet Court 会同步吗？**
A: 不会自动同步——vendored 技能是固定快照，通过 `skills-lock.json` 管理更新，需手动执行 `git pull` 和哈希校验后更新。

**Q: 支持哪些链上资产？**
A: USDC 为主（托管于合约），部分技能支持 ETH、DAI 及各链原生代币（通过 OKX、Solana、Starknet 技能层）。

**Q: 没有 GitHub Token 能否使用？**
A: 可以，但读取私有仓库内容会受限。公开仓库无需 Token。

## 六、总结

Internet Court 最大的价值，是把 AI Agent 经济中最脆弱的一环——**纠纷处理**——变成了一个可编程、可嵌入的标准件。对于开发者而言，它意味着：不需要自己实现一套完整的交易仲裁逻辑，加载这个技能就够了。对于整个 Agent 经济而言，它提供了一种让机器之间也能建立"信任"的方式。

如果你正在构建多 Agent 协作系统、或希望自己的 Agent 能与其他 Agent 安全地交易，Internet Court 是目前最完整的开源技能包——26 家机构的共识背书，加上 90+ 已有协议的强强联合，值得关注和试用。

**GitHub 地址**: [internet-court/internet-court-skill](https://github.com/internet-court/internet-court-skill)
