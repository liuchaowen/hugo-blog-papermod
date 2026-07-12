---
title: "dcg：一款防止 AI 编程助手误删代码的 Rust 安全钩子"
date: "2026-07-12"
description: "dcg（Destructive Command Guard）是一款高性能的 Rust 工具，通过预执行钩子拦截 AI 编程助手（Claude Code、Codex CLI、Cursor 等）的危险命令，防止意外删除代码。目前已支持 12+ 款主流 AI 编程工具，支持 Linux、macOS 和 Windows。"
author: "Cheman"
slug: destructive-command-guard
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "AI", "安全工具", "GitHub", "开源"]
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

今天在 GitHub Trending 上看到一个很有意思的安全工具：**dcg**（Destructive Command Guard）。用 Rust 编写，专门解决一个痛点问题——当 AI 编程助手帮你写代码时，一句 `rm -rf ./src` 或 `git reset --hard` 就可能让你的项目一夜回到解放前。

## 一、项目概述

[dcg](https://github.com/Dicklesworthstone/destructive_command_guard) 是一个高性能的 AI 编程助手预执行安全钩子，通过在命令实际执行前拦截危险操作来保护代码安全。项目目前已收获大量关注，Trending 热度居高不下。

**核心功能：**
- **命令拦截**：在危险命令执行前主动阻断，而非事后补救
- **多工具兼容**：支持 12+ 款主流 AI 编程助手
- **模块化 Pack 机制**：内置 50+ 规则包，覆盖 Git、文件系统、数据库、Docker、Kubernetes、云操作等场景
- **零误报设计**：智能识别安全命令变体（如允许 `git push --force-with-lease`，拦截 `git push --force`）
- **多平台支持**：Linux、macOS、Windows（WSL + 原生 PowerShell）

**支持 AI 编程助手列表：**

| 工具 | 支持方式 |
|------|---------|
| Claude Code | 原生 `~/.claude/hooks/` |
| Codex CLI 0.125.0+ | 原生 hooks |
| Gemini CLI | 原生 hooks |
| GitHub Copilot CLI | `~/.github-copilot-cli/hooks/` |
| VS Code Copilot Chat | Claude-hook 兼容层 |
| Cursor IDE | 插件 hooks |
| Hermes Agent | 原生 hooks |
| Grok (xAI) | 原生 `~/.grok/hooks/` + Claude 兼容层 |
| Antigravity CLI (agy) | `~/.gemini/config/hooks.json` |
| OpenCode | 社区插件 |
| Pi | 扩展配方 |
| Aider | Git hooks（有限） |
| Continue | 仅检测 |

## 二、技术原理

### 2.1 架构设计

dcg 使用 Rust 编写，核心依赖包括：

```toml
[dependencies]
fancy-regex = "0.18"        # 高性能正则匹配
regex = "1.10"              # RegexSet 多模式匹配
aho-corasick = "1.1"        # 多模式字符串快速过滤
ast-grep-core = "0.44"      # 基于 AST 的内容检测
fsqlite = "0.1.4"           # SQLite FTS5 全文搜索（历史记录）
tokio = { version = "1.52", features = ["rt-multi-thread"] }
rust-mcp-sdk = "0.9.0"      # MCP 协议支持
```

**关键架构亮点：**

1. **多层级检测引擎**：先用 Aho-Corasick 快速过滤已知危险关键词，再用 fancy-regex 做精确语义匹配，最后用 AST 分析 heredoc/inline-script 内的嵌套危险命令
2. **无锁决策日志**：通过 SQLite FTS5 记录每次决策，支持审计回溯
3. **模块化 Pack 系统**：每个规则包独立 YAML/JSON 定义，支持自定义扩展

### 2.2 命令分类策略

dcg 对命令安全性有精细的判断逻辑，以下是几个典型案例：

| 命令 | 拦截 | 原因 |
|------|------|------|
| `git reset --hard` | ✅ | 强制回退，丢弃工作目录所有更改 |
| `git reset --soft HEAD~1` | ❌ | 安全回退，不影响工作目录 |
| `git push --force` | ✅ | 强制推送，覆盖远程历史 |
| `git push --force-with-lease` | ❌ | 安全变体，有额外保护 |
| `git branch -D <branch>` | ✅ | 强制删除分支，可能丢失未合并提交 |
| `git branch -d <branch>` | ❌ | 仅删除已合并分支 |
| `rm -rf ./src` | ✅ | 递归强制删除 |
| `rm -rf /tmp/build-*` | ❌ | 临时目录允许清理 |

### 2.3 安装与核心钩子机制

安装后会向各 AI 工具的 hook 目录写入配置文件。以 Claude Code 为例，安装后生成 `~/.claude/hooks/dcg.toml`，内容包含执行路径和规则包引用。

核心执行流程：

```
用户输入命令 → AI 工具执行前触发 hook
  → dcg 接收命令 → 快速 Aho-Corasick 预检
    → RegexSet 精确匹配 → AST 内容深度分析（如需）
    → 决策（放行 / 拦截 / 请求确认）
      → 写入 fsqlite 审计日志
```

## 三、安装与快速开始

### 3.1 一键安装（推荐）

**Linux / macOS / WSL：**
```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/destructive_command_guard/main/install.sh" | bash -s -- --easy-mode
```

**Windows 原生（PowerShell）：**
```powershell
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/Dicklesworthstone/destructive_command_guard/main/install.ps1"))) -EasyMode -Verify
```

### 3.2 手动安装

```bash
# 下载对应平台二进制
curl -fsSL https://github.com/Dicklesworthstone/destructive_command_guard/releases/latest/download/dcg-x86_64-apple-darwin.tar.xz | tar -xJ

# 验证 SHA256
sha256sum dcg

# 放到 PATH 中
chmod +x dcg
sudo mv dcg /usr/local/bin/

# 安装 Claude Code 钩子
dcg install --claude
```

### 3.3 验证安装

```bash
dcg --version
dcg simulate "rm -rf /home/user/project"
# 输出: [BLOCKED] 此命令将被拦截并阻止执行
```

## 四、使用方法与实战

### 4.1 基础配置

默认配置已包含最常用规则包。如需定制，编辑 `~/.config/dcg/config.toml`：

```toml
[hooks]
enabled = true
verbose = true

# 危险命令的默认行为
default_action = "block"  # block | allow | confirm

[allowed_paths]
# 允许递归删除的路径（通配符）
temp_dirs = ["/tmp/*", "/var/tmp/*", "/Users/*/Library/Caches/*"]

[custom_packs]
# 加载自定义规则包
paths = ["/path/to/my-rules.yaml"]
```

### 4.2 自定义规则包

创建自定义 Pack（YAML 格式）：

```yaml
# my-project-guard.yaml
name: "my-project-guard"
description: "保护特定项目的安全规则"
version: "1.0"

rules:
  - id: "block-fmt"
    pattern: "rustfmt.*--emit=stdout"
    severity: "warn"
    message: "rustfmt --emit=stdout 会输出到 stdout 而非覆盖文件"

  - id: "block-prd-db"
    pattern: "mysql.*DROP DATABASE"
    severity: "block"
    message: "生产数据库 DROP 操作被拦截"

  - id: "allow-test-deploy"
    pattern: "kubectl.*deploy.*--namespace=test"
    severity: "allow"
```

加载自定义包：
```bash
dcg install --custom-pack ./my-project-guard.yaml
```

### 4.3 紧急逃生舱

当需要绕过拦截执行紧急操作时：

```bash
# 一次性放行（单次）
DCG_BYPASS=1 <危险命令>

# 生成一次性放行码（需要时从终端输入）
dcg get-bypass-code
# 输出: 8位一次性码（如 KS7F2R9P）

# 永久放行特定命令模式
echo "rm -rf /home/user/trash/*" >> ~/.config/dcg/permanent_allowlist.txt
```

### 4.4 查看拦截历史

```bash
# 查看最近拦截记录
dcg log --recent 20

# 导出完整审计日志（JSON）
dcg export --format json --since 2026-01-01

# 统计拦截类型分布
dcg stats --period 30d
```

## 五、常见问题与解决方案

**Q: `git branch -D` 为什么被拦截，但 `-d` 可以？**

`-d` 仅删除已合并到当前分支的分支，安全性高；`-D` 是强制删除，不检查合并状态，可能丢失未合并提交。

**Q: `git push --force-with-lease` 为什么允许？**

force-with-lease 会在远程有新提交时拒绝推送，防止覆盖他人的工作，比 `--force` 安全得多。

**Q: 误拦截了合法命令怎么办？**

在命令前加 `DCG_BYPASS=1` 一次性绕过，或将命令模式加入 `~/.config/dcg/permanent_allowlist.txt`。

**Q: 支持私有仓库的自定义规则吗？**

支持。创建私有 Pack YAML 文件，通过 `--custom-pack` 加载，可放在私有仓库中用 Git 管理。

**Q: 对性能有影响吗？**

几乎无感知。Aho-Corasick 预检在亚微秒级完成，大多数命令的决策延迟 < 1ms。

## 六、总结

dcg 解决了一个非常实际的问题：AI 编程助手虽然强大，但它们执行命令时缺乏对风险的判断能力，一旦收到 `rm -rf` 类的指令就会直接执行，后果往往是灾难性的。

dcg 用 Rust 实现了一个高性能的预执行钩子框架，内置 50+ 覆盖 Git、文件系统、数据库、云服务的规则包，支持 12+ 款主流 AI 编程工具，安装简单（一条命令），且提供精细的逃生机制保证紧急场景下不阻断正常工作流。

项目采用 MIT 许可，作者明确表示欢迎 Bug 报告但不接受直接 PR，倾向由 AI 工具评审后独立决定合并策略。如果你大量使用 AI 编程助手，这个工具值得在所有工作机器上安装。

> 项目地址：[https://github.com/Dicklesworthstone/destructive_command_guard](https://github.com/Dicklesworthstone/destructive_command_guard)
> 最新版本：v0.6.5（Rust 1.85+）
