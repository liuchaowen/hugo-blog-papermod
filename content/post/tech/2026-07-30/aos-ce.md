---
title: "AOS Community Edition：为智能体打造的可审计、可组合开源操作系统"
date: 2026-07-30
description: "AOS Community Edition（unicity-aos/aos-ce）是一套面向智能体的开源操作系统，提供可检视、可组合的运行时环境、aos CLI、HTTP API、约 21 个内置 Capsule 与 Unicity 审计能力。本文从架构、技术栈到安装实战进行深度拆解。"
author: "Cheman"
slug: aos-ce
draft: false
categories: [技术, 开源, AI]
tags: [GitHub, 开源, AI, Agent, 操作系统]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AOS Community Edition**——一个为智能体（Agent）设计的开源操作系统，目标是给开发者一个「可检视、可组合」的运行时环境。它不止是一套 SDK，而是把 CLI、HTTP API、首方 Capsule、模型/提供方接入与审计能力打包成一个完整的「操作系统」形态。

## 一、项目概述

AOS（Unicity Agent Operating System）Community Edition 把自己定位为「运行智能体及其原生软件的操作系统」。它的产品面（product surface）由官方统一持有，包含几个核心部分：

- **`aos` CLI**：统一的命令行入口，覆盖初始化、状态查询、升级、MCP 服务等；
- **HTTP API**：基于 Rust + Axum 的常驻服务，供上层应用调用；
- **发行版（distributions）与首方 Capsule**：约 21 个开箱即用的生产级胶囊（capsule），在 `~/.aos` 下按产品版本固定安装；
- **模型与提供方体验**：统一接入 Codex、Claude、Grok 等客户端；
- **Unicity Audit**：内建的审计能力，保证动作可溯源。

仓库的工作区布局清晰划分了职责：

```text
crates/       Product CLI, HTTP API, control client, and shared product code
capsules/     First-party production capsules
distros/      Community distribution manifests and release metadata
docs/         Product and operator documentation
```

核心理念是：**Capsule 是通用的用户态积木**，使用者可以把它们组合成 harness（执行框架）、meta-harness（元框架）、connector、service 等系统；而 Forge 工具链则让一个「全新的智能体」能够检视运行中的系统、学习 Capsule 模型、发现真实能力缺口，并构建、验证一个最小权限的 Capsule。

## 二、技术原理

### 2.1 架构分层：产品态 vs 运行时态

AOS 明确区分了「产品根（product root）」与「运行时根（runtime root）」。产品端只接管一部分命令边界（`init`、`status`、`migrate`、`update`、`distro`、`mcp`、`daemon`、`serve-health`），其余运行时根直接由 AOS CLI 透传：

```sh
# 产品端接管的命令
aos status
aos status --json
aos --principal codex-code mcp serve
aos daemon foreground --workspace /workspace

# 其余命令直接走 AOS CLI
aos doctor
aos capsule build
```

当 AOS 接管某个 root（如 `status`、`init`）时，会用产品实现替换底层同名命令，因此完整可用面始终是 `aos <verb>`。发布校验会比较「被锁定的运行时」公开命令清单与 AOS 分类后的 root 契约，**一个新的运行时 verb 没有显式的 inherit-or-own 决策就无法进入产品发布**。这种「命令边界契约」设计，保证了扩展行为可预期、可审计。

### 2.2 安全与供应链：fail-closed 的发布闸门

AOS 对分发态与升级态有强约束。每次发布都会附带 checksums、Sigstore 签名包、GitHub build-provenance 证明，以及 `runtime-compatibility.toml`（锁定确切的运行时版本与 WIT commit）。在 tag 发布前，两个机器可读的闸门必须同时为 true：

- **runtime-compatibility 闸门**：运行时版本与 WIT 提交必须匹配；
- **upgrade / self-heal 闸门**：候选版本必须保留一个冻结的 standalone-home 克隆，并以新生成的运行时协调状态成功启动，才会被批准。

此外，直接安装默认解析签名后的 `stable` 通道，也可选择 `dev` / `nightly` / 精确版本，**但在签名元数据真正发布之前一律 fail-closed（失败即关闭）**。

### 2.3 关键技术栈（来自 Cargo.toml）

仓库是一个 Rust workspace（resolver = "3"），关键依赖透露了它的工程取向：

```toml
astrid-sdk  = { version = "=0.7.1",  features = ["derive"] }
astrid-core = "=0.10.4"
astrid-uplink = "=0.10.4"
axum = "0.8"          # HTTP API 服务
blake3 = "1.8.5"      # 内容寻址 / 完整性校验
clap  = { version = "4.6", features = ["derive"] }  # CLI
tokio = { version = "1", features = ["...", "rt", "process", "net"] }  # 异步运行时
toml  = "0.8"
uuid  = { version = "1.22", features = ["rng-getrandom", "serde", "v4"] }
```

值得注意的 release profile 完全是「安全 + 体积」导向：

```toml
[profile.release]
opt-level = "z"      # 以体积最小化为优化目标
lto = true
codegen-units = 1
strip = true
panic = "abort"      # 异常直接中止，避免 unwind 带来的不确定性
```

`blake3` 的引入与发布时的 checksums / Sigstore 证明相呼应，说明整个系统对「内容完整性」有一致的设计。

### 2.4 约 21 个 Capsule 的拼装模型

`capsules/` 目录下是一组职责单一的胶囊，例如：`capsule-agents`、`capsule-context-engine`、`capsule-forge`、`capsule-fs`、`capsule-identity`、`capsule-memory`、`capsule-mcp`、`capsule-openai` / `capsule-openai-compat`、`capsule-router`、`capsule-session`、`capsule-shell`、`capsule-skills`、`capsule-system`、`capsule-users` 等。它们共同构成「用户态世界」：指令、记忆、技能、harness 代码、工具、capsule、trace、评估都是可改进的对象。

## 三、安装与快速开始

AOS 提供了官方安装器，会安装 `aos` 产品命令、被锁定的运行时，以及在 `~/.aos` 下由本源码树构建出的确切 21 个 Community Edition Capsule：

```sh
curl --proto '=https' --tlsv1.2 -fsSL https://aos.unicity.ai/install.sh | sh
aos init
```

`aos init`（含 `aos init --offline`）会从本地、按产品版本固定的 Capsule 资源中完成配置；重复运行安装器则执行一次「协调式产品升级」，不会重写独立的运行时安装。

最简运行示例——启动守护进程并暴露 MCP 边缘：

```sh
# 查看系统状态
aos status --json

# 以前台方式运行持久化守护进程（Unix 上会用 bundled daemon 替换自身进程）
aos daemon foreground --workspace /workspace

# 为某个客户端提供 MCP 服务
aos --principal codex-code mcp serve
```

## 四、使用方法与实战

### 4.1 MCP 边缘与审批桥（approval bridge）

`aos mcp serve` 是 Codex、Claude、Grok 共享的产品边缘。当客户端支持 MCP form elicitation 时，会持续展示自己的受限审批表单；当不支持时，默认的 `--interaction auto` 会调用本地 AOS 决策面：macOS 上的 AppKit、Windows 原生对话框或 Linux 上的 Pinentry。也可以用 `--interaction client|native|deny` 显式指定策略：

```sh
aos --principal codex-code mcp serve --interaction auto
```

安全上的一个关键约束是：**本地桥只接受单个布尔值或固定的 AOS 审批枚举**，绝不收集任意字符串、密码形态字段或 URL 形态的诱导输入。这在「让 Agent 替你点确认」的场景里把攻击面压到了最小。

### 4.2 在 AOS 上构建（Forge + meta-harness）

Community Edition 随附 Forge 作为 OS 构建工具链：一个全新智能体可以检视运行中的系统、学习 Capsule 模型、识别真实能力缺口，并构建、验证一个最小权限 Capsule。Forge 还会安装 `meta-harness` 技能，教智能体把指令、记忆、技能、harness 代码、工具、capsule、trace、评估当作「可改进的用户态世界」来治理。

### 4.3 主体隔离与运行时导入

AOS 支持以「主体（principal）」为单位做隔离，让已认证的 operator 与目标环境解耦：

```sh
# 为目标主体 alice 初始化，operator 与 alice 的认证上下文分离
aos --principal operator init --target-principal alice
```

也可以从已有的独立运行时安装中，按白名单拷贝兼容状态而不改动源：

```sh
aos <import 命令>   # 见 docs/runtime-migration.md 的精确白名单与完整性校验
```

本发行版将分发态固定为 Unicity CE；如需其它分发，需使用独立的 `astrid` 安装与运行时 home。Homebrew 安装通过 `aos update` 升级，所有通道在签名元数据发布前 fail-closed。

## 五、常见问题与解决方案

**Q1：安装脚本超时或网络受限？**
可用 `aos init --offline` 从本地、按产品版本固定的 Capsule 资源完成配置，前提是安装器已经把资源落到 `~/.aos`。

**Q2：`aos mcp serve` 弹出审批框太频繁？**
客户端若支持 MCP form elicitation，会复用自身表单；否则用 `--interaction` 显式选择 `client`/`native`/`deny`，避免默认 `auto` 在不同平台调用不同本地决策面造成的差异。

**Q3：能否把已有的运行时状态迁移进来？**
可以。`aos` CLI 能按白名单从独立运行时安装拷贝兼容状态而不改动源（详见 `docs/runtime-migration.md` 的 allowlist、完整性校验与恢复行为）。

**Q4：升级会破坏现有环境吗？**
不会。重复运行安装器是「协调式升级」；发布闸门要求候选版本保留冻结的 standalone-home 克隆并能以新协调状态成功启动，才被批准发布。

**Q5：想用非 Unicity CE 的分发？**
本发行版固定为 Unicity CE；其它分发需使用独立的 `astrid` 安装与运行时 home。

## 六、总结

AOS Community Edition 的价值不在于「又一个 Agent 框架」，而在于它把**运行时、命令边界契约、供应链签名、审计与最小权限 Capsule 模型**统一到一个 OS 形态里。对希望自建可控、可检视智能体基础设施的团队来说，它提供了一条从 `aos init` 到 `forge` 构建自有 Capsule 的完整路径；而 fail-closed 的发布闸门与受限的审批桥，则把「让 Agent 拥有权限」这件事的安全兜底做在了系统层面。如果你正在评估把 Agent 能力下沉为可信基础设施，AOS CE 值得在 Trending 列表里被认真看一眼。

> 项目地址：https://github.com/unicity-aos/aos-ce
