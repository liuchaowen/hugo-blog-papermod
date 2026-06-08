---
title: "Tolaria：开源跨平台的 Markdown 知识库管理工具"
date: 2026-06-08T10:00:00+08:00
draft: false
tags: ["开源", "知识管理", "Markdown", "Tauri", "桌面应用"]
categories: ["技术"]
---

# Tolaria：开源跨平台的 Markdown 知识库管理工具

## 项目简介

[Tolaria](https://github.com/refactoringhq/tolaria) 是一款支持 macOS、Windows 和 Linux 的桌面应用程序，专门用于管理 **Markdown 知识库**。无论是构建第二大脑、管理个人知识，还是为 AI 整理公司文档，Tolaria 都能胜任。

项目作者 Luca 使用它管理超过 10,000 条笔记，涵盖 [Refactoring](https://refactoring.fm/) 工作成果、个人日志和第二大脑知识。

## 核心特性

### 📑 文件优先（Files-first）
所有笔记都是纯 Markdown 文件，具有高度可移植性，可与任何编辑器配合使用，无需导出步骤。数据属于用户，而不属于任何应用。

### 🔌 Git 优先（Git-first）
每个知识库都是一个 Git 仓库。你可以获得完整的版本历史记录，能够使用任何 Git 远程仓库，且零依赖 Tolaria 服务器。

### 🛜 离线优先，零锁定
无需账户、订阅或云依赖。知识库完全离线工作，且永远如此。如果停止使用的 Tolaria，不会丢失任何数据。

### 🔬 开源
Tolaria 是免费的开源软件。作者为自己和分享给他人的目的构建了此工具。

### 📋 基于标准
笔记是带有 YAML frontmatter 的 Markdown 文件，无专有格式，无锁定数据。

### 🔍 类型作为视角，而非模式
Tolaria 中的类型只是导航辅助，而非强制机制。没有必填字段，没有验证，只有有助于查找笔记的分类。

### 🪄 AI 优先，但不仅限于 AI
文件知识库与 AI 代理配合得非常好，但你可以自由使用任何想要的工具。支持 Claude Code、Codex CLI 和 Gemini CLI 设置路径。

### ⌨️ 键盘优先
Tolaria 专为希望尽可能使用键盘的高级用户设计。

## 技术栈

Tolaria 基于以下技术构建：
- **Tauri** - 跨平台桌面应用框架
- **React** - UI 框架
- **TypeScript** - 类型安全的 JavaScript
- **BlockNote** - Markdown 编辑器
- **Mantine** - UI 组件库

## 安装方式

### Homebrew（macOS）
```bash
brew install --cask tolaria
```

### 下载发布版本
从 [最新发布页面](https://refactoringhq.github.io/tolaria/download/) 下载适用于 macOS、Windows 或 Linux 的安装包。

## 快速开始

首次打开 Tolaria 时，你可以克隆 [入门知识库](https://github.com/refactoringhq/tolaria-getting-started)，其中包含了整个应用的使用演练。

公共用户文档位于 `site/` 目录中，并发布到 GitHub Pages。建议从 [安装 Tolaria](https://github.com/refactoringhq/tolaria/blob/main/site/start/install.md) 开始，然后查看 [首次启动](https://github.com/refactoringhq/tolaria/blob/main/site/start/first-launch.md)。

## 本地开发

如果你想在本地运行或贡献代码，请参考 [入门指南](https://github.com/refactoringhq/tolaria/blob/main/docs/GETTING-STARTED.md)。

### 前置要求
- Node.js 20+
- pnpm 8+
- Rust stable
- macOS 或 Linux（用于开发）

### 快速启动
```bash
pnpm install
pnpm dev
```

在浏览器中打开 `http://localhost:5173` 查看基于浏览器的模拟模式，或使用以下命令运行原生桌面应用：

```bash
pnpm tauri dev
```

## 文档资源

- 📐 [ARCHITECTURE.md](https://github.com/refactoringhq/tolaria/blob/main/docs/ARCHITECTURE.md) - 系统设计、技术栈、数据流
- 🧩 [ABSTRACTIONS.md](https://github.com/refactoringhq/tolaria/blob/main/docs/ABSTRACTIONS.md) - 核心抽象和模型
- 🚀 [GETTING-STARTED.md](https://github.com/refactoringhq/tolaria/blob/main/docs/GETTING-STARTED.md) - 如何浏览代码库
- 📚 [ADRs](https://github.com/refactoringhq/tolaria/tree/main/docs/adr) - 架构决策记录

## 视频演练

- [如何组织我的 Tolaria 工作区](https://www.loom.com/share/bb3aaffa238b4be0bd62e4464bca2528)
- [我的收件箱工作流](https://www.loom.com/share/dffda263317b4fa8b47b59cdf9330571)
- [如何保存网络资源到 Tolaria](https://www.loom.com/share/8a3c1776f801402ebbf4d7b0f31e9882)

## 开源协议

Tolaria 采用 AGPL-3.0-or-later 协议开源。Tolaria 名称和徽标仍受项目商标政策保护。

## 相关资源

- GitHub 仓库：[refactoringhq/tolaria](https://github.com/refactoringhq/tolaria)
- 作者：[Luca Ronin](http://x.com/lucaronin)
- Newsletter：[Refactoring.fm](https://refactoring.fm/)

---

Tolaria 是一个真正以用户数据主权为核心的知识管理工具，值得所有重视数据自由和隐私的技术工作者尝试。
