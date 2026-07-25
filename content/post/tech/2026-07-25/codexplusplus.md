---
title: "Codex++：不改动 app.asar 的 Codex / ChatGPT 桌面端启动器与增强管家"
date: 2026-07-25
description: "Codex++ 是一个基于 Rust + Tauri 的 OpenAI Codex / ChatGPT 桌面端外部启动器，通过 CDP 协议与本地辅助服务实现供应商切换、协议转换与界面增强，不修改官方 app.asar，本文详解其架构、用法与实战。"
author: "Cheman"
slug: codexplusplus
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI工具, Codex, ChatGPT]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Codex++**，一个面向 OpenAI Codex / ChatGPT 桌面应用的外部启动器与增强管理工具。它最大的特点是「不修改官方 `app.asar`、不向安装目录写入补丁」，而是通过 Chromium DevTools Protocol（CDP）和本地辅助服务来实现供应商切换、协议转换与界面增强。

## 一、项目概述

Codex++ 的定位是 **OpenAI Codex / ChatGPT 桌面应用的外部启动器与管理工具**。简单来说，它在不触碰官方应用安装文件的前提下，给桌面端叠加了一层「供应商管理 + 协议转换 + 界面增强」的能力。

它主要解决几个痛点：

- **供应商锁定**：官方桌面端只能用官方账号，难以切换到自建 / 聚合 API。
- **配置不可见**：`config.toml`、`auth.json` 散落各处，难以统一管理和备份。
- **界面不可增强**：缺少插件市场、中文界面、会话批量管理等体验优化。

核心特性按模块划分如下：

| 模块 | 功能 |
| --- | --- |
| 供应商配置 | 官方登录、官方登录混入 API、纯 API、聚合供应商；Responses / Chat Completions；模型测试、Provider Doctor |
| 模型与上下文 | 每模型上下文窗口、自动压缩阈值、`model_catalog_json`、按供应商选择 MCP / Skill / Plugin |
| 会话管理 | 扫描本地会话、批量删除、Markdown 导出、Token 用量历史、Provider 元数据同步与备份 |
| Codex 增强 | 插件市场与模型白名单、粘贴修复、中文界面、快速启动、Goals、Stepwise、图片覆盖层 |
| 开发工作流 | 项目移动、Upstream worktree、线程 ID、Zed Remote 项目识别与打开 |
| 脚本与维护 | 用户脚本安装与启停、应用检测、Watcher、日志诊断、健康检查、Release 更新 |

技术栈上，Codex++ 使用 **Rust 1.85+** 编写核心逻辑，管理工具基于 **Tauri 2.x** 打包，前端用 Node / Vite 构建。

## 二、技术原理

### 架构设计

项目采用 Rust Workspace + Tauri 混合结构：

```text
apps/
  codex-plus-launcher/          静默启动入口
  codex-plus-manager/           Tauri 管理工具
assets/inject/
  renderer-inject.js            注入到 Codex 渲染端的增强脚本
crates/
  codex-plus-core/              启动、注入、配置、更新、安装、桥接等核心逻辑
  codex-plus-data/              会话数据、导出、Provider 同步
scripts/installer/
  windows/CodexPlusPlus.nsi     Windows NSIS 安装包
  macos/package-dmg.sh          macOS DMG 打包
```

从 `Cargo.toml` 可以看到清晰的 workspace 划分（edition 2024，AGPL-3.0-only 协议）：

```toml
[workspace]
resolver = "2"
members = [
  "crates/codex-plus-core",
  "crates/codex-plus-data",
  "apps/codex-plus-launcher",
  "apps/codex-plus-manager/src-tauri",
]

[workspace.package]
version = "1.2.42"
edition = "2024"
license = "AGPL-3.0-only"
```

依赖方面，核心选择了 `tokio`（异步运行时）、`tokio-tungstenite`（WebSocket，用于 CDP 通信）、`rusqlite`（bundled 编译，读写 Codex 本地会话数据库）、`reqwest`（rustls-tls + system-proxy，避免系统代理冲突）等，整体偏「本地优先、零外部服务依赖」。

### 核心机制：CDP 注入 + 本地辅助服务

Codex++ 不修改 `app.asar`，而是：

1. 由 **launcher** 静默启动官方桌面应用；
2. 通过 **CDP（Chromium DevTools Protocol）** 注入 `renderer-inject.js` 到 Codex 渲染端，实现界面增强（如中文界面、会话宽度恢复、插件市场解锁）；
3. 由 **本地辅助服务** 处理供应商配置、协议转换与数据读写，官方应用本体保持纯净。

### 协议转换：Chat Completions → Responses

Codex 内部使用 Responses 协议，而很多自定义供应商只提供 Chat Completions 接口。Codex++ 可在**本地代理层**将 Chat Completions 请求转换为 Responses 协议，让纯 API 供应商也能无缝接入。

### 供应商模式与认证边界

Codex++ 将不同来源的配置严格隔离，避免污染官方登录态：

| 模式 | 用途 | 认证边界 |
| --- | --- | --- |
| 官方登录 | 只使用 ChatGPT / Codex 官方账号 | 清理自定义 provider 与 API Key，保留官方登录状态 |
| 官方登录 + API | 保留官方账号与插件入口，请求走兼容 API | API Key 写入 provider bearer token，不写入纯 API 的 `auth.json` |
| 纯 API | 不依赖官方账号，完全使用自定义 Base URL / Key | 独立保存 `config.toml` 与 API Key，不混入官方认证 |
| 聚合供应商 | 在多个普通 API 供应商之间路由 | 支持故障转移、按会话 / 请求 / 权重轮转 |

### 数据位置

```text
Codex 配置：    ~/.codex/config.toml
Codex 登录状态：~/.codex/auth.json
Codex 本地数据库：~/.codex/sqlite/*.db （旧版回退 ~/.codex/state_5.sqlite）
Codex++ 状态与日志：~/.codex-session-delete/
Provider 同步备份：  ~/.codex/backups_state/provider-sync
```

## 三、安装与快速开始

### 环境要求

- Windows / macOS（Intel x64 与 Apple Silicon arm64 均提供安装包）
- 若要自行编译：Rust 1.85+、Node（用于管理工具前端）、Tauri 2.x 工具链

### 从 Release 安装

从 [GitHub Releases](https://github.com/BigPizzaV3/CodexPlusPlus/releases) 下载对应安装包：

- Windows：`CodexPlusPlus-*-windows-x64-setup.exe`
- macOS Intel：`CodexPlusPlus-*-macos-x64.dmg`
- macOS Apple Silicon：`CodexPlusPlus-*-macos-arm64.dmg`

安装后会有两个入口：

- **`Codex++`**：静默启动官方桌面应用，并加载已保存的供应商配置与增强功能。
- **`Codex++ 管理工具`**：管理供应商、模型、工具插件、会话、增强功能、脚本、更新和诊断。

### 首次使用建议流程

1. 打开「管理工具」，确认应用路径与运行状态；
2. 配置供应商与增强功能；
3. 从 `Codex++` 入口启动官方应用。

macOS 上 DMG 会安装 `/Applications/Codex++.app` 与 `/Applications/Codex++ 管理工具.app`；Windows 安装包会创建桌面与开始菜单快捷方式。

### 自编译检查（可选）

```bash
# 前端检查
cd apps/codex-plus-manager
npm ci
npm run check
npm run vite:build

# Rust 检查
cd ../..
cargo fmt --all -- --check
cargo test
cargo build --release
```

## 四、使用方法与实战

### 实战一：纯 API 供应商配置

在管理工具中选择「纯 API」模式，填写自定义 Base URL 与 Key。该模式会把 `config.toml` 与 API Key **独立保存**，不会混入官方登录态，适合只走自有中转 / 聚合接口的场景。每个供应商可单独配置：

- Responses 或 Chat Completions 协议；
- 模型列表、测试模型、User-Agent；
- 上下文窗口（支持 `1M` / `200K` / 纯数字）与自动压缩阈值；
- 该供应商启用的 MCP Server、Skill 和 Plugin。

Codex++ 会生成独立的 `model_catalog_json`，让 Codex 按当前模型使用对应上下文窗口。

### 实战二：聚合供应商路由

在「聚合供应商」模式下，可在多个普通 API 供应商之间路由，支持**故障转移、按会话轮转、按请求轮转、权重轮转**，提升可用性。切换供应商时 Codex++ 会先保存当前配置，再写入目标配置，避免中途状态损坏。

### 实战三：会话批量管理

利用会话管理模块，可以扫描本地会话、批量删除、导出 Markdown、查看 Token 用量历史，并把 Provider 元数据同步备份到 `~/.codex/backups_state/provider-sync`。所有界面增强都可在「Codex 增强」总开关下单独关闭——关闭后 Codex++ 仍可作为供应商与启动管理工具使用。

### 实战四：Upstream worktree

Codex++ 的 Upstream worktree 等价于先更新远端分支再创建 worktree：

```bash
git worktree add -b <new-branch> <worktree-path> upstream/<base-branch>
```

新 worktree 从最新远端跟踪分支开始，而不是从当前会话的本地 HEAD 开始。若无法安全识别原生表单，可在菜单中手动填写仓库路径、分支名、worktree 路径、remote 与 base branch。

## 五、常见问题与解决方案

**Q1：Codex++ 菜单没出现？**
确认是从 `Codex++` 入口启动，而不是直接打开官方应用；随后在管理工具的「安装维护」和「关于」页检查应用路径、启动状态与诊断日志。

**Q2：切换供应商后请求失败？**
先在供应商详情中运行模型测试或 Provider Doctor，确认协议、Base URL、Key 与测试模型匹配。注意纯 API 与官方混入模式使用不同的认证位置，不要手工复制两种模式的 `auth.json`。

**Q3：macOS 提示「已损坏，无法打开」？**
未签名 / 未公证的安装包会被 Gatekeeper 拦截，可在终端执行：

```bash
sudo xattr -rd com.apple.quarantine /Applications/Codex++\ 管理工具.app
sudo xattr -rd com.apple.quarantine /Applications/Codex++.app
```

执行后重新打开即可。

**Q4：Upstream worktree 与 Codex 原生创建有何区别？**
Codex++ 版从最新远端跟踪分支开始，原生版从本地当前 HEAD 开始，适合需要基于最新上游开新分支的协作场景。

## 六、总结

Codex++ 是一个**非侵入式**、功能密度很高的 Codex / ChatGPT 桌面端增强方案：它坚持不修改官方 `app.asar`，通过 CDP 注入 + 本地服务的方式叠加供应商管理、协议转换和界面增强，并用 Rust + Tauri 保证了本地运行的安全与轻量。项目以 **AGPL-3.0-only** 开源，适合希望摆脱官方桌面端供应商锁定、又不想动安装文件的高级用户与开发者。如果你经常在多供应商、多模型之间切换，或需要更顺手的会话管理，Codex++ 值得一试。
