---
title: "Harper：轻量级隐私优先的英语语法检查器"
date: 2026-07-24
description: "Harper 是由 Automattic 开源的英语语法检查工具，完全本地运行无需联网，内存占用仅为 LanguageTool 的 1/50，毫秒级响应，支持 WebAssembly、Obsidian 插件和多编辑器集成。"
author: "Cheman"
slug: harper
draft: false
categories: ["技术", "开源工具"]
tags: ["GitHub", "开源", "语法检查", "Rust", "隐私保护", "开发者工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Harper**，一个由 WordPress 母公司 Automattic 开源的英语语法检查器，主打轻量、快速和完全本地化运行，解决了 Grammarly 和 LanguageTool 的痛点。

## 一、项目概述

Harper 是一个用 Rust 编写的英语语法检查器，设计目标是"刚刚好"——既不过度干预也不隐私泄露。项目解决了现有语法检查工具的核心问题：

- **Grammarly 痛点**：昂贵、过度干预、建议缺乏上下文、隐私噩梦（所有内容上传云端）、网络延迟导致修订体验差
- **LanguageTool 痛点**：内存占用巨大（需要约 16GB 的 n-gram 数据集）、处理中等文档需要数秒

Harper 的核心优势：

- **毫秒级响应**：处理文档仅需毫秒级时间
- **超低内存占用**：仅为 LanguageTool 的 1/50
- **完全隐私**：所有处理本地完成，无需联网
- **极小体积**：小到可以通过 WebAssembly 加载
- **多平台支持**：VS Code、Neovim、Helix、Emacs、Zed、Obsidian 等

目前仅支持英语，但核心架构可扩展支持其他语言。

## 二、技术原理

### 2.1 架构设计

Harper 采用模块化的 Rust Workspace 架构，从 `Cargo.toml` 可以看出其组件化设计：

```toml
[workspace]
members = [
  "harper-cli",           # 命令行工具
  "harper-core",          # 核心语法引擎
  "harper-ls",            # LSP 服务器
  "harper-wasm",          # WebAssembly 绑定
  "harper-tree-sitter",   # Tree-sitter 解析
  "harper-html",          # HTML 支持
  "harper-typst",         # Typst 格式支持
  "harper-python",        # Python 文件支持
  "harper-tex",           # LaTeX 支持
  "harper-thesaurus",     # 同义词库
  "harper-desktop/src-tauri",  # 桌面应用
  "harper-git-commit/"    # Git commit 消息检查
]
```

这种设计允许：
- **独立部署**：`harper-ls` 可作为独立 LSP 服务器
- **Web 集成**：`harper-wasm` 支持浏览器端运行
- **编辑器中立**：通过 LSP 协议支持任意编辑器

### 2.2 核心技术栈

1. **Rust 语言**：零成本抽象、内存安全、高性能
2. **Tree-sitter**：增量解析，支持多种编程语言和标记语言
3. **WebAssembly**：支持浏览器端运行，官方网站 writewithharper.com 直接使用
4. **LSP（Language Server Protocol）**：标准化编辑器集成

### 2.3 性能优化策略

从 Dockerfile 可以看出构建流程的优化：

```dockerfile
# Release profile with debug info
[profile.release]
opt-level = 3
panic = "abort"
lto = "fat"  # 链接时优化
```

关键优化点：
- **LTO（Link Time Optimization）**：跨 crate 优化，减少最终二进制大小
- **Panic = abort**：移除 panic unwinding 代码，减小体积
- **测试时优化**：`opt-level = 1` 加速测试运行

### 2.4 数据流分析

```
用户输入文本
    ↓
Tree-sitter 增量解析
    ↓
harper-core 语法分析引擎
    ↓
规则匹配（拼写、语法、风格）
    ↓
生成建议列表
    ↓
LSP/WebAssembly 界面呈现
```

完全本地化处理流程确保：
1. 零网络延迟
2. 完全隐私保护
3. 可预测的性能

## 三、安装与快速开始

### 3.1 环境要求

- Rust 1.70+（从源码构建）
- 或直接下载预编译二进制

### 3.2 安装方式

**方式一：预编译二进制（推荐）**

从 [GitHub Releases](https://github.com/Automattic/harper/releases) 下载对应平台二进制文件。

**方式二：Cargo 安装**

```bash
cargo install harper-ls
```

**方式三：npm 安装（JavaScript 项目）**

```bash
npm install harper.js
```

### 3.3 最简运行示例

**命令行使用：**

```bash
# 检查文件
harper-cli check your-document.md

# 实时监控模式
harper-cli watch your-document.md
```

**Neovim 集成（使用 nvim-lspconfig）：**

```lua
local lspconfig = require('lspconfig')
lspconfig.harper_ls.setup({})
```

**VS Code 集成：**

安装 [Harper 扩展](https://marketplace.visualstudio.com/items?itemName=elijah-potter.harper) 即可。

## 四、使用方法与实战

### 4.1 基础用法

**在 Markdown 文件中使用：**

```markdown
<!-- harper 会自动检查以下内容 -->
This is a exemple of a misspelled word.
^
建议: example
```

**在代码注释中检查：**

Harper 支持 Tree-sitter 解析，可检查多种编程语言的注释：

```python
def calculate_sum(a, b):
    """
    Calcualtes the sum of two numbers.
    """
    return a + b
```

Harper 会识别 `Calcualtes` 拼写错误并建议 `Calculates`。

### 4.2 进阶用法

**自定义规则配置：**

创建 `.harper.toml` 文件：

```toml
[lint]
# 禁用特定规则
disabled_rules = ["PassiveVoice", "OxfordComma"]

# 自定义词典
custom_words = ["automattic", "linter"]
```

**集成到 CI/CD 流程：**

```bash
# 在 CI 中检查文档
harper-cli check docs/*.md --format json > harper-report.json
```

**Obsidian 插件使用：**

1. 在 Obsidian 社区插件市场搜索 "Harper"
2. 安装并启用
3. 打开任意 Markdown 笔记，语法错误会实时标记

### 4.3 实际项目示例

**在 Hugo 博客中使用：**

```bash
# 检查所有博客文章
find content/post -name "*.md" -exec harper-cli check {} \;
```

**在 Git Hooks 中集成：**

```bash
# .git/hooks/pre-commit
#!/bin/bash
harper-cli check $(git diff --cached --name-only --diff-filter=ACM | grep '\.md$')
if [ $? -ne 0 ]; then
    echo "Grammar issues found. Please fix before commit."
    exit 1
fi
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题：编译失败 "linker 'cc' not found"**

解决方案：安装系统编译工具链

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install build-essential
```

**问题：wasm-pack 未找到**

解决方案：

```bash
cargo install wasm-pack
```

### 5.2 运行时错误

**问题：LSP 服务器未启动**

检查 Neovim LSP 配置：

```lua
-- 添加调试信息
:lua print(vim.inspect(lspconfig.active_clients()))
```

确保 `harper-ls` 在 PATH 中：

```bash
which harper-ls
```

**问题：内存占用异常**

Harper 本身内存占用极低（< 100MB），如发现异常：

1. 检查处理的文档大小
2. 确认没有其他插件冲突
3. 提交 issue 到 GitHub Issues

### 5.3 性能问题

**问题：处理大文件慢**

从项目 README 可知，Harper 团队将长 lint 时间视为 bug：

- 创建 issue 并附上文件大小和耗时
- 临时方案：分段检查

```bash
# 分批处理大文件
split -l 1000 large-file.md chunk-
harper-cli check chunk-*
```

### 5.4 兼容性问题

**问题：Obsidian 插件无法加载**

确保：
1. Obsidian 版本 >= 1.0
2. 已关闭"安全模式"
3. 插件权限已授予

**问题：与 Grammarly 扩展冲突**

解决方案：
- 禁用 Grammarly 扩展（Harper 已提供完整替代）
- 或在特定文件类型中仅启用一个

## 六、总结

Harper 是一个定位精准的开源语法检查工具，填补了 Grammarly（昂贵、隐私问题）和 LanguageTool（资源占用大）之间的空白。其 Rust + LSP + WebAssembly 的技术栈设计，使其在保持高性能的同时，实现了跨平台、多编辑器支持。

**核心价值：**
- **隐私优先**：完全本地处理，适合处理敏感文档
- **性能卓越**：毫秒级响应，内存占用极低
- **开发者友好**：通过 LSP 协议集成到主流编辑器
- **开源可控**：可自定义规则、贡献新语言支持

**适用场景：**
- 技术文档编写（Markdown、代码注释）
- 学术写作（LaTeX 支持）
- 博客创作（Hugo、Jekyll 等）
- Obsidian 知识库管理

对于注重隐私、追求性能的开发者和写作者，Harper 是一个值得尝试的 Grammarly 替代方案。

> GitHub 仓库：https://github.com/Automattic/harper
> 官网：https://writewithharper.com
> Discord 社区：https://discord.com/invite/JBqcAaKrzQ
