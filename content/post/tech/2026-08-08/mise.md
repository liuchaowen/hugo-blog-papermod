---
title: "mise：用一个 CLI 管理所有开发工具、环境变量和任务"
date: 2026-08-08
description: "mise（发音 /mɪz/，来自法语 mise-en-place）是一款用 Rust 编写的开发环境管理工具，一站式统一管理开发工具版本、环境变量和任务脚本，替代 asdf、direnv、make 等多种工具。"
author: "Cheman"
slug: mise
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "开发工具", "Rust"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**mise**，一个用 Rust 编写的一站式开发环境管理工具。它来自 [@jdx](https://github.com/jdx)（jdx.dev 作者），口号是"Dev tools, env vars, and tasks in one CLI"，一句话概括：一个工具替代 asdf + direnv + make + 各种 env 加载器。

## 一、项目概述

**mise** 的核心理念来自餐饮界的 "mise-en-place"——在烹饪前把所有食材和工具准备好，放在固定位置。应用到开发环境，就是**在每个项目目录下，用一个 `mise.toml` 文件声明项目所需的一切**：

- **工具版本**：Node.js、Python、Go、Rust、Terraform……数百种工具
- **环境变量**：项目级环境变量，支持 `.env` 文件
- **任务脚本**：Build、Test、Lint、Deploy 等任务定义与编排

赞助商包括 [37signals](https://37signals.com)（Basecamp / HEY 母公司），由 [Namespace](https://namespace.so) 提供 CI 支持。

### 核心特性

- **多后端支持**：内置 asdf、vfox、aqua 三大工具后端，覆盖 npm、pip、cargo、brew 等所有生态
- **零 Shim 设计**：调用 `which node` 直接返回真实路径，不需要 asdf 那样的 shell 垫片（shim），启动更快、调试更简单
- **全球速启**：`curl https://mise.run | sh` 一行安装，自动检测系统并配置 shell 钩子
- **任务编排**：支持任务依赖声明（`depends`），自动按拓扑顺序执行，支持 Terraform 等基础设施工具的 workspace 切换
- **CI 友好**：所有工具在 CI 环境中自动安装，无需预装任何运行时

## 二、技术原理

### 架构设计

mise 整体采用 Rust 编写，代码结构清晰，主仓库下有多个独立 crate：

| Crate | 职责 |
|---|---|
| `mise` (主) | CLI 入口、配置解析、任务执行 |
| `vfox` | 跨平台工具版本管理后端 |
| `aqua-registry` | aqua 包注册表集成 |
| `mise-interactive-config` | 交互式配置界面 |
| `mise-sigstore` | 构建产物签名验证 |
| `mise-cache-core` | 缓存抽象层 |

核心依赖包括 `tokio`（异步运行时）、`reqwest`（HTTP）、`toml_edit`（配置解析）、`clap`（CLI 参数解析），以及 `gix`（Git 操作）、`rattler`（Conda 包解析）等生态库。

###mise.toml 配置解析

项目根目录下的 `mise.toml` 是 mise 的配置核心，结构分为三大区块：

```toml
# 工具版本声明
[tools]
terraform = "1"
aws-cli = "2"
node = ["18", "20"]   # 支持多版本共存

# 环境变量（直接写在文件里）
[env]
TF_WORKSPACE = "development"
AWS_REGION = "us-west-2"
```

配置解析由 `toml_edit` 完成，保留了 TOML 的顺序语义（`preserve_order`），这对于需要控制工具安装顺序的场景很重要。

### 任务系统与依赖拓扑

任务定义支持 `depends` 声明，实现拓扑排序执行：

```toml
[tasks.validate]
description = "Validate AWS credentials and terraform config"
run = """
aws sts get-caller-identity
terraform validate
"""

[tasks.plan]
description = "Run terraform plan"
run = """
terraform init
terraform workspace select $TF_WORKSPACE
terraform plan
"""

[tasks.deploy]
description = "Deploy infrastructure"
depends = ["validate", "plan"]   # 依赖前两个任务完成后才执行
run = "terraform apply -auto-approve"
```

任务执行引擎基于 Rust 的 `async`/`await`，通过 `tokio` 协程调度实现并行依赖检查。

### 版本解析与多后端路由

工具版本的解析由 `versions` crate（semver 处理）和 `nodejs-semver`（Node.js 特殊语义）协作完成。安装时，mise 根据工具类型路由到对应后端：

```rust
// 从源码中的注册表枚举可见支持的后端类型
backends: &[
    RegistryBackend { full: "asdf", platforms: &[], options: &[] },
    RegistryBackend { full: "aqua", platforms: &[], options: &[] },
]
```

asdf 后端兼容 asdf 所有插件；aqua 后端则通过 vendored 的 aqua 标准注册表获得更快的安装速度（aqua 本身是 npm/pnpm 之后最快的 Node.js 包管理器，jdx 的另一个项目）。

## 三、安装与快速开始

### 环境要求

- macOS（Apple Silicon / Intel）、Linux（x86_64 / arm64）、Windows
- Rust 1.91+（如需从源码编译）
- 已安装 curl

### 一行安装

```bash
# Linux / macOS
curl https://mise.run | sh

# 验证安装
~/.local/bin/mise --version
```

### 配置 Shell 钩子

```bash
# Bash
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc

# Zsh
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc

# Fish
echo '~/.local/bin/mise activate fish | source' >> ~/.config/fish/config.fish

# PowerShell
echo '~/.local/bin/mise activate pwsh | Out-String | Invoke-Expression' >> ~/Documents/PowerShell/Microsoft.PowerShell_profile.ps1
```

### 最简使用示例

```bash
# 进入项目目录
cd my-project

# 指定工具版本（自动安装）
mise use node@20 python@3.12 terraform@1

# 执行命令（使用指定版本）
mise exec node@20 -- node -v
# → mise node@20.x.x ✓ installed
# → v20.x.x

# 全局安装（所有目录生效）
mise use --global node@22

# 运行项目任务
mise run build
```

## 四、使用方法与实战

### 实战：管理 Terraform 项目

```toml
# mise.toml
[tools]
terraform = "1"
aws-cli = "2"

[env]
TF_WORKSPACE = "development"
AWS_REGION = "us-west-2"
AWS_PROFILE = "dev"

[tasks.validate]
description = "Validate AWS credentials and terraform config"
run = """
aws sts get-caller-identity
terraform validate
"""

[tasks.plan]
description = "Run terraform plan"
run = """
terraform init
terraform workspace select $TF_WORKSPACE
terraform plan
"""

[tasks.deploy]
depends = ["validate", "plan"]
run = "terraform apply -auto-approve"
```

在 CI 环境中只需：

```bash
mise install   # 安装 mise.toml 中声明的所有工具
mise run deploy
```

无需在 CI 镜像中预装 Terraform 和 AWS CLI，mise 自动处理版本切换和环境准备。

### 进阶：环境变量与 .env 支持

```toml
# mise.toml
[env]
NODE_ENV = "production"
API_URL = "https://api.example.com"
```

或者从 `.env` 文件加载（mise 默认支持，额外自动注入）：

```bash
# .env 文件（mise 自动读取）
DATABASE_URL=postgres://...
SECRET_KEY=xxx
```

运行时所有环境变量自动注入，无需 `source .env`。

## 五、常见问题与解决方案

### Q: 安装后命令找不到（command not found）

确认 shell 钩子已正确添加并生效：
```bash
# 检查 mise 是否在 PATH 中
which mise

# 若未生效，重新 source shell 配置
source ~/.zshrc   # 或 ~/.bashrc
```

### Q: 特定工具安装失败

检查工具注册表是否包含该工具：
```bash
mise plugins list   # 查看已安装的插件
mise plugins install node   # 安装 node 插件（如缺少）
mise install         # 重新触发安装
```

### Q: 版本切换不生效

mise 通过目录级激活工作，确保每次 cd 进入项目目录后：
```bash
mise ls             # 查看当前目录的已配置工具版本
mise use node@18    # 重新指定版本
```

### Q: Windows 上行为差异

Windows 使用 `vfox` 后端（Rust 原生实现），而非 asdf。Docker 镜像中推荐使用官方提供的 Rust 基础镜像 + mise 的 Dockerfile 模板：

```dockerfile
FROM rust:1.97-slim
WORKDIR /mise
ENTRYPOINT ["mise"]
CMD ["--help"]
```

## 六、总结

mise 是近年来见过的最有野心的开发者工具之一——它不是又做一个 asdf，而是试图用 Rust 重写整个"开发环境准备"流程，将 asdf、direnv、make、powermanager 等多个工具的能力整合到一个轻量、快速、零依赖的二进制中。

其核心优势在于：**零 Shim 架构**（更快的启动速度）、**多后端融合**（asdf + vfox + aqua 三大生态通吃）、**任务编排**（原生支持依赖拓扑）、以及 **CI 友好**（一行安装所有工具）。

如果你厌倦了在每个新项目中反复配置 `.nvmrc`、`.python-version`、`.tool-versions` 和 `.env`，不妨试试 mise——把一切交给一个 `mise.toml`。
