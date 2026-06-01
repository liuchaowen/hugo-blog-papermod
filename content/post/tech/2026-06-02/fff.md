---
title: "FFF：为人类和 AI Agent 重新定义的极速文件搜索引擎"
date: 2026-06-02
description: "FFF 是一个 Rust 编写的文件搜索工具库，支持 MCP Server、Neovim 插件、Node SDK 和 C 语言库等多种接口。相比 ripgrep 和 fzf，它通过常驻内存索引、frecency 排序和抗拼写错误匹配，在重复搜索场景下实现亚 10ms 响应。"
author: "Cheman"
slug: "fff"
draft: false
categories: ["开源", "开发工具"]
tags: ["Rust", "文件搜索", "MCP", "Neovim", "ripgrep", "AI Agent"]
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

今天在 GitHub Trending 上看到一个非常有意思的项目：**fff**（dmtrKovalenko/fff），它是一个专为人类和 AI Agent 设计的文件搜索工具库，号称在重复搜索场景下比 ripgrep 快几个数量级，而且在路径匹配上支持拼写容错——终于不用因为少打一个字母就搜不到文件了。

## 一、项目概述

FFF（Fuzzy File Finder）的核心定位是一个**文件搜索库**，而非命令行工具。它最初作为 Neovim 插件诞生，后来发现 AI Agent 和代码编辑器同样需要精准、高速的文件搜索能力，于是演变成了一个多接口的搜索工具包。

核心特性包括：

- **抗拼写错误的路径和内容搜索**：基于 Smith-Waterman 和 SIMD 加速模糊匹配算法，即使拼错也能找到目标文件
- **Frecency 排序**：结合访问频率和最近访问时间，常用文件排名更靠前
- **后台文件监听**：索引随文件变动实时更新，无需手动刷新
- **轻量内存内容索引**：每个索引文件约 360 字节，10 万文件仅占 36MB
- **Git 状态感知**：自动标注 modified、staged、untracked 等状态
- **多接口支持**：Rust crate、C 库、Node/Bun SDK、MCP Server、Neovim 插件、Pi Agent 扩展

## 二、技术原理

### 架构设计

FFF 的整体架构由 Rust 核心引擎驱动，通过 C FFI 层向外暴露接口：

```
┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Neovim 插件  │  │ MCP Server│  │ Node SDK │  │  Pi 扩展  │  │  C ABI   │
└──────┬──────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │              │              │
       └──────────────┴──────────────┴──────────────┴──────────────┘
                                    │
                              ┌─────┴──────┐
                              │   fff-c    │  (C FFI / cdylib)
                              └─────┬──────┘
                    ┌────────┬───────┼───────┬────────┐
                    │  fff-  │ fff-  │ fff-  │  fff-   │
                    │ search │ grep  │ query │  core   │
                    └────────┴───────┴───────┴────────┘
```

### 核心技术栈与选型理由

从 `Cargo.toml` 可以看出 FFF 的关键依赖选型：

- **`regex`**：Rust 生态的标准正则引擎，与 ripgrep 使用相同的底层实现
- **`mimalloc`**：高性能内存分配器，显著减少内存碎片，提升缓存命中率
- **`heed`**：基于 LMDB 的嵌入式数据库，用于持久化 frecency 记录
- **`notify`**：文件系统监听库，驱动后台文件变更检测
- **`git2`**（vendored）：通过 libgit2 直接与 Git 交互，避免频繁 shell 调用
- **`rayon`**：数据并行计算框架，搜索流水线多线程化
- **`neo_frizbee`**：SIMD 加速模糊匹配库，用于路径搜索

编译配置上，FFF 使用了激进的优化策略：

```toml
[profile.release]
opt-level = 3
lto = "fat"        # 全程序链接时优化
codegen-units = 1   # 单 codegen unit，最大化优化
strip = true        # 剥离调试符号
```

### 关键算法与设计模式

**1. Frecency 排序系统**

Frecency = Frequency × Recency。每个索引文件维护一个访问分数和修改分数，搜索结果按综合评分排序。这在 `frecency` 模块中通过 `heed` 数据库持久化，支持跨会话记忆。

**2. 抗拼写错误匹配**

路径搜索使用基于 `neo_frizbee` 的 SIMD 加速模糊匹配，能容忍字符删除、交换和重排。内容搜索则提供三种模式切换：
- **Plain**：SIMD memmem 字面匹配，最快
- **Regex**：标准正则表达式
- **Fuzzy**：Smith-Waterman 逐行模糊评分

智能回退机制：当 plain 搜索返回零结果时，自动降级为 fuzzy 模式。

**3. 约束解析器**

`fff-query-parser` 支持丰富的搜索约束语法：
- Git 状态过滤：`git:modified`、`git:staged`
- 路径约束：`src/main.rs`、`test/`
- 排除模式：`!test/`、`!*.md`
- Glob 模式：`*.rs`、`**/*.{ts,tsx}`
- 可自由组合：`git:modified src/**/*.rs !src/**/mod.rs user controller`

**4. Arena 内存管理**

采用连续 arena 存储字符串块，显著减少内存碎片并提升 CPU 缓存命中率，配合 mimalloc 分配器实现高效内存使用。

### 数据流分析

搜索请求的完整数据流：

1. **约束解析**：`fff-query-parser` 解析查询字符串，提取路径约束、排除规则和搜索模式
2. **预过滤**：基于约束快速过滤候选文件集
3. **并行搜索**：`rayon` 多线程执行实际匹配（SIMD plain / regex / fuzzy）
4. **评分排序**：综合匹配分数、frecency 权重、Git 状态加成
5. **分页返回**：支持游标分页，跨调用保持状态

## 三、安装与快速开始

FFF 提供多种安装方式，根据使用场景选择：

### MCP Server（推荐 AI Agent 用户）

Linux / macOS 一行安装：

```bash
curl -L https://dmtrkovalenko.dev/install-fff-mcp.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/dmtrKovalenko/fff.nvim/main/install-mcp.ps1 | iex
```

安装完成后，在 Claude Code、Codex、Cursor 等 MCP 客户端中配置即可使用 `ffgrep`、`fffind`、`fff-multi-grep` 三个工具。

### Neovim 插件

使用 lazy.nvim：

```lua
{
  'dmtrKovalenko/fff.nvim',
  build = function()
    require("fff.download").download_or_build_binary()
  end,
  opts = {
    debug = { enabled = true, show_scores = true },
  },
  lazy = false,
  keys = {
    { "ff", function() require('fff').find_files() end, desc = 'FFFind files' },
    { "fg", function() require('fff').live_grep() end, desc = 'LiFFFe grep' },
    { "fz", function() require('fff').live_grep({ grep = { modes = { 'fuzzy', 'plain' } } }) end,
      desc = 'Live fffuzy grep' },
  },
}
```

### Node.js SDK

```bash
npm install @ff-labs/fff-node
```

```typescript
import { FileFinder } from "@ff-labs/fff-node";

const finder = FileFinder.create({ basePath: process.cwd(), aiMode: true });
if (!finder.ok) throw new Error(finder.error);
await finder.value.waitForScan(10_000);

// 文件搜索（支持模糊拼写容错）
const files = finder.value.fileSearch("incognito profile", { pageSize: 20 });

// 内容搜索
const hits = finder.value.grep("GetOffTheRecordProfile", {
  mode: "plain",
  smartCase: true,
  beforeContext: 1,
  afterContext: 1,
});

finder.value.destroy();
```

### Rust crate

```toml
[dependencies]
fff-search = "0.6"
```

### C 库

```bash
make build-c-lib
sudo make install
```

## 四、使用方法与实战

### Neovim 中的搜索

安装后，`ff` 打开文件搜索、`fg` 打开内容搜索。支持实时切换搜索模式（plain / regex / fuzzy），用 `<S-Tab>` 循环切换。

约束语法的实际应用示例：

```
# 只搜索修改过的 Rust 文件，排除测试目录
git:modified **/*.rs !test/ handler

# 在特定文件中搜索
src/main.rs main loop

# 多条件组合
git:modified src/**/*.rs !src/**/mod.rs user controller
```

### MCP Server 为 AI Agent 赋能

连接 MCP Server 后，AI Agent 可以直接使用 `ffgrep` 和 `fffind` 工具进行文件搜索。相比内置搜索，FFF 的优势在于：

- **更少的 grep 轮次**：一次搜索就能返回精准结果
- **更少的 token 浪费**：frecency 排序让相关文件排在前面
- **更快的响应**：常驻进程避免每次 fork 的开销

在项目的 `CLAUDE.md` 中添加以下指令即可引导 Agent 优先使用 FFF：

```markdown
For any file search or grep in the current git-indexed directory, use fff tools.
```

### Pi Agent 扩展

三种运行模式可按需切换：
- `tools-and-ui`（默认）：注入 fff 工具 + 替换编辑器自动补全
- `tools-only`：仅注入工具，保留原生编辑器体验
- `override`：完全替换 pi 内置的 grep/find 工具

## 五、常见问题与解决方案

**Q：FFF 和 ripgrep/fzf 有什么区别？什么时候该用哪个？**

A：ripgrep 是一次性搜索的王者，从终端跑一次 `rg` 仍然是最佳选择。FFF 的优势在**重复搜索场景**——编辑器、IDE 扩展、AI Agent 等需要多次搜索同一仓库的场景。在 Chromium（50 万文件）上，每次 ripgrep 调用需要 3-9 秒，而 FFF 的后续查询均在 10ms 以内。fzf 是纯匹配过滤工具，缺乏 frecency 排序和 Git 状态感知。

**Q：内存占用会不会很大？**

A：FFF 确实需要常驻内存，但实际占用可控。1.4 万文件的仓库约 26MB，10 万文件约 36MB（内容索引），Chromium 级别的超大型仓库约几百 MB。有趣的是，相比频繁调用 ripgrep 产生的内存峰值总和，FFF 的常驻内存实际上更省。

**Q：如何调整搜索结果的排序？**

A：FFF 综合匹配分数、frecency 权重和 Git 状态进行排序。频繁打开的文件会自然排在前面。可通过 `debug.enabled = true` 查看每个文件的详细评分明细。

**Q：Git push 认证问题**

A：如果使用 SSH 方式推送，确保已配置 SSH key。FFF 本身不涉及 Git push，但 Neovim 插件的 Git 状态感知依赖 `git2` 库。

**Q：如何在 CI 环境中使用？**

A：Cargo.toml 中已配置 `ci` profile，使用 `lto = "thin"` 替代 `fat`，避免交叉编译时的 CPU 特性检测问题。

## 六、总结

FFF 是一个设计思路非常清晰的项目：**把 ripgrep 的单次搜索优势，转化为常驻进程的重复搜索优势**。通过 Rust 核心引擎 + C FFI 的分层架构，它优雅地支持了从终端工具到 AI Agent 的多种使用场景。

对于开发者而言，Neovim 插件提供了比 Telescope/fzf-lua 更智能的搜索体验。对于 AI Agent 生态，MCP Server 让 Claude Code、Cursor 等工具获得了更快更准的文件搜索能力。如果你在大型代码库中频繁搜索，或者正在构建需要文件搜索能力的 AI 工具，FFF 值得重点关注。

项目地址：[github.com/dmtrKovalenko/fff](https://github.com/dmtrKovalenko/fff)
