---
title: "Claude Plugins Community：Anthropic 官方托管的 Claude Code 社区插件市场"
date: 2026-08-23
description: "Claude Plugins Community 是 Anthropic 官方维护的 Claude Code / Claude Cowork 社区插件市场只读镜像。所有插件均经过自动安全扫描与人工审核，开发者只需一条命令即可订阅整个市场并安装数百个社区插件，覆盖 DeFi、电商、API 安全、可访问性、团队协作等场景。"
author: "Cheman"
slug: claude-plugins-community
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["Claude Code", "Claude Plugins", "Anthropic", "开源", "AI", "插件市场", "GitHub"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Claude Plugins Community**，这是 Anthropic 官方维护的 Claude Code / Claude Cowork 社区插件市场——与其说它是一个"项目"，不如说它是一扇通往数百个社区插件的统一入口。

## 一、项目概述

**Claude Plugins Community**（仓库地址 `anthropics/claude-plugins-community`）本质上是 Anthropic 内部**社区插件市场（marketplace）的只读镜像**。它本身不包含任何业务代码，核心只有一份 `.claude-plugin/marketplace.json`——这份清单列出了当前所有可供安装的社区插件。

它的定位非常清晰：

- **官方背书的安全分发渠道**：每一个上架的插件都必须通过 [claude.ai](https://clau.de/plugin-directory-submission) 提交，经过**自动化安全扫描**与**人工审核**后才会被批准进入分发列表。
- **自动同步**：清单由 Anthropic 的内部审核流水线**每晚自动同步**更新，社区贡献者无需直接修改本仓库。
- **统一安装入口**：用户只需添加一次 marketplace，就能用一条命令安装市场里的任意插件，免去了逐个 clone、配置的负担。

与之配套的还有两个官方仓库：`anthropics/claude-plugins-official`（Anthropic 官方亲自维护的插件）与 `anthropics/knowledge-work-plugins`（面向特定角色的"知识工作"插件）。

## 二、技术原理

### 2.1 清单即目录：marketplace.json 的结构

整个市场的"数据库"就是一份 JSON。它的顶层结构非常克制：

```json
{
  "name": "claude-community",
  "owner": { "name": "Anthropic" },
  "renames": {
    "qodo-skills": "qodo",
    "wordpress-com": "build-with-wordpress",
    "auth0-sdks": "auth0",
    "twilio": "twilio-developer-kit"
  },
  "plugins": [ /* 数百个插件条目 */ ]
}
```

每个插件条目至少包含 `name`、`description`、`source` 和可选的 `homepage`：

```json
{
  "name": "0x",
  "description": "Guide developers through swapping ERC-20 tokens using the 0x API...",
  "source": {
    "source": "url",
    "url": "https://github.com/0xProject/0x-ai.git",
    "sha": "0167bbb411cc972b966127d23c23de801061fa99"
  },
  "homepage": "https://github.com/0xProject/0x-ai"
}
```

这里有两个值得注意的设计细节：

- **`source` 锁定到 commit SHA**：插件来源不是"某个 git 仓库的最新版本"，而是精确钉死到某一个 `sha`。这意味着即使上游插件更新，你的安装版本也不会在不知情的情况下被悄悄改变——这是插件体系里很关键的**可重现性与安全性**保障。
- **`renames` 字段**：当插件改名时，旧名会被映射到新名，保证老的调用方式（如 `auth0`）依然可用。

### 2.2 两种来源类型

从清单中可以看到插件来源主要分为两类：

| 来源类型 | 示例 | 说明 |
|---------|------|------|
| `url` | `0x`、`10x-team` | 指向某个 GitHub 仓库的特定 commit |
| `git-subdir` | `42crunch-api-security-testing` | 指向某个仓库的**子目录**与 tag/ref，适合单仓多插件的组织 |

这种"清单与实现分离"的架构，让 Anthropic 可以在一个受控的入口里聚合来自全球开发者、各不相同的插件仓库，而不必把所有代码都搬进同一个 repo。

### 2.3 审核流水线与只读约束

这是一个**只读镜像**：直接向本仓库提交的 Pull Request 会被自动关闭，所有变更都来自 Anthropic 内部审核流水线。这样的封闭写入路径，保证了进入市场的插件都经过了统一的安全基线检查——这正是"社区贡献 + 官方把关"模式的精髓。

## 三、安装与快速开始

### 环境要求

- 已安装并登录 **Claude Code**（或拥有 **Claude Cowork** 访问权限）
- 网络可访问 GitHub 与 Anthropic 插件分发服务

### Claude Code 中安装

只需两条命令即可订阅整个市场并安装任意插件：

```bash
# 1. 添加社区市场
claude plugin marketplace add anthropics/claude-plugins-community

# 2. 从市场中安装某个插件（注意 @claude-community 后缀）
claude plugin install 0x@claude-community
```

### Claude Cowork 中使用

如果你使用的是 Claude Cowork（Web 端协作产品），直接在 [claude.com/plugins](https://claude.com/plugins) 中浏览并安装即可，无需命令行。

### 如何知道有哪些插件？

清单里收录了数百个插件，覆盖场景极其广泛，例如：

- **`0x`**：引导开发者通过 0x API 在 20+ 条 EVM 链上完成 ERC-20 代币兑换，覆盖报价、授权、EIP-712 签名与交易提交。
- **`10x-shopping`**：把 Claude 接入 Shopify 全球商品目录的 AI 购物助手，用自然语言浏览商品、管理购物车并下单。
- **`10x-team`**：把一整个工程团队（CTO、架构师、安全、DevOps、SRE 等 12 个角色）封装成可编排的 Claude Code 技能。
- **`16minds`**：召唤 16 种人格类型的 Agent 对同一个话题进行辩论、评审或建议，避免单一 Agent 的"平均化"回答。
- **`42crunch-api-security-testing`**：在 Claude Code 里直接做 API 安全审计，检测 BOLA / BFLA 等 OWASP API 风险并提供 AI 辅助修复。
- **`a11y-fixer`**：扫描 HTML / JSX 中的可访问性（a11y）问题。

## 四、使用方法与实战

### 4.1 浏览与安装工作流

实际使用中，典型流程是"先找、后装、再调用"：

1. **浏览市场**：阅读 `marketplace.json` 或 [claude.com/plugins](https://claude.com/plugins)，找到契合的插件名（如 `a11y-fixer`）。
2. **安装**：`claude plugin install a11y-fixer@claude-community`。
3. **调用**：按插件文档触发对应命令（每个插件会自带它自己的命令与说明）。

由于插件来源被钉死到具体 commit，团队可以在 `marketplace.json` 里锁定一版已知良好的插件集合，把这份清单纳入自己的工程基线，做到"全组统一、可审计"的插件治理。

### 4.2 提交你自己的插件

如果你想贡献插件，流程是**单向**的：

```
在 clau.de/plugin-directory-submission 提交
   ↓
自动化安全扫描
   ↓
人工审核批准
   ↓
进入 marketplace.json，每日自动同步
```

注意：直接给这个仓库发 PR 是无效的——它会被自动关闭。所有入口都收敛到官方提交页面，这也是安全模型的一部分。

## 五、常见问题与解决方案

### Q1：安装插件时报找不到插件 / 名字错误？
插件名需带 `@claude-community` 后缀，例如 `0x@claude-community`。如果使用了旧名，可检查 `marketplace.json` 的 `renames` 字段——比如 `auth0`、`twilio-developer-kit`、`build-with-wordpress` 都是重命名后的规范名称。

### Q2：为什么直接向仓库提 PR 没反应？
因为这是**只读镜像**，所有变更来自内部审核流水线，直接 PR 会被自动关闭。正确路径是走 [clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission) 提交。

### Q3：插件会随着时间的推移自动更新吗？
不会。每个插件在清单里都钉死在某个 `sha`，只有上游重新提交并通过审核、清单被重新同步后才会变化。这对生产环境的稳定性是好事。

### Q4：Claude Code 和 Claude Cowork 的插件是同一套吗？
是的，本市场同时服务于两者；只是安装方式不同——Cowork 走 Web 端的 [claude.com/plugins](https://claude.com/plugins)，Code 走命令行 `claude plugin` 子命令。

## 六、总结

Claude Plugins Community 看似只是一个"清单文件"，但它背后是 Anthropic 为 Claude 生态搭建的一套**可信插件分发基础设施**：提交走统一审核、来源钉死到 commit、安装一条命令、同步全自动。对于想把 Claude Code 真正用进日常工作流的开发者来说，这是目前最省心、也最安全的插件获取入口。

如果你还没试过 Claude 插件体系，不妨从 `claude plugin marketplace add anthropics/claude-plugins-community` 开始，挑一两个贴合自己场景的插件装上体验。

> GitHub 地址：https://github.com/anthropics/claude-plugins-community
