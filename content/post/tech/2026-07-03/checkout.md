---
title: "actions/checkout：GitHub Actions 官方代码检出 Action 深度解析"
date: 2026-07-03
description: "深入解析 GitHub Actions 官方 checkout action，介绍 v7 版本的安全增强、ESM 迁移、credential 存储改进等核心特性，以及实际使用示例和最佳实践。"
author: "Cheman"
slug: "checkout"
draft: false
categories: [技术, 开源]
tags: [GitHub, GitHub Actions, CI/CD, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**actions/checkout**，这是 GitHub Actions 官方提供的代码检出 Action，几乎所有 GitHub Actions 工作流都会用到它。

## 一、项目概述

`actions/checkout` 是 GitHub 官方维护的 GitHub Actions Action，用于将仓库代码检出到 Actions runner 的 `$GITHUB_WORKSPACE` 目录下。自 2019 年推出以来，它已成为 GitHub Actions 生态中最基础、使用最广泛的 Action 之一。

**核心功能：**
- 支持检出当前仓库或指定的远程仓库
- 支持指定分支、Tag 或 SHA
- 支持 Shallow clone（默认只获取触发事件的单个 commit）或完整历史
- 支持 Sparse checkout（部分检出）
- 支持 Submodule 递归检出
- 支持 SSH 密钥和 PAT 认证
- 自动配置 git 凭证，使后续 `git fetch/push` 命令可认证执行

**最新版本特性（v7）：**
- **安全增强**：默认拒绝在 `pull_request_target` 或 `workflow_run` 触发的工作流中检出 fork PR 代码，防止 "pwn request" 漏洞
- **ESM 迁移**：从 CommonJS 迁移到 ESM 模块系统，支持新版本 `@actions/*` 包
- **依赖更新**：更新直接和间接依赖，包含已知漏洞的安全修复

## 二、技术原理

### 架构设计

`actions/checkout` 的核心逻辑是用 TypeScript 编写的，通过 `@vercel/ncc` 打包成单个 JavaScript 文件分发。主要依赖以下官方 Actions 工具包：

- `@actions/core`：输入输出处理、日志输出
- `@actions/exec`：执行 git 命令
- `@actions/github`：GitHub API 交互
- `@actions/io`：文件系统操作
- `@actions/tool-cache`：工具缓存管理

### 核心执行流程

1. **授权配置**：根据输入的 `token`、`ssh-key` 或默认值，配置 git 的认证信息
2. **仓库克隆**：通过 `git clone` 或 REST API 下载文件（当 Git 版本低于 2.18 时降级到 API）
3. **引用检出**：根据 `ref` 输入切换到指定分支、Tag 或 SHA
4. **子模块处理**：根据 `submodules` 输入递归检出子模块
5. **凭证持久化**：将认证信息写入 git config（可通过 `persist-credentials: false` 禁用）

### 安全改进深度解析

v7 引入的 fork PR 安全检查是一个重要的安全特性。在 `pull_request_target` 和 `workflow_run` 触发的工作流中：

- 这些触发事件使用**基础仓库的 `GITHUB_TOKEN`、secrets 和 runner 访问权限**运行
- 如果工作流检出了 fork 的代码并执行（例如 `npm install` 运行 fork 的 `package.json` 中的恶意 preinstall 脚本），攻击者可以窃取基础仓库的 secrets
- 这种攻击被称为 **"pwn request"**

v7 默认拒绝此类检出，用户需要在明确了解风险后设置 `allow-unsafe-pr-checkout: true` 来显式选择加入。

### Credential 存储机制演进

v6 引入了一个重要的安全改进：将持久化的凭证从 `.git/config` 移动到 `$RUNNER_TEMP` 目录下的独立文件中。

**原因：**
- `.git/config` 可能被工作流中的其他工具意外暴露（例如，某些工具会读取并输出 git 配置）
- `$RUNNER_TEMP` 是 runner 的临时目录，工作流结束后自动清理，且其他容器动作需要 Actions Runner v2.329.0+ 才能访问

**实现方式：**
通过 git 的 `credential.helper` 配置，指向一个临时脚本，该脚本在需要时输出存储在临时文件中的 token。

## 三、安装与快速开始

### 环境要求

- Actions Runner 版本：
  - v7：建议使用最新版本（支持 Node 24 运行时）
  - v5+：需要 Runner v2.327.1+
  - v6（credential 安全特性）：需要 Runner v2.329.0+（用于 Docker 容器动作中的 git 命令）
- Node.js 运行时：v7 使用 `@actions/*` v3/v9 系列，需要 Node 24+

### 最简使用示例

在所有 GitHub Actions 工作流中，`actions/checkout` 通常是最先执行的步骤：

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm install
      - run: npm test
```

这个最简单的形式会：
1. 检出触发工作流的仓库的当前 ref
2. 只获取触发事件的单个 commit（`fetch-depth: 1`）
3. 使用内置的 `${{ github.token }}` 进行认证
4. 将凭证持久化到 git config，使后续的 `git` 命令可认证执行

## 四、使用方法与实战

### 场景 1：获取完整 Git 历史

默认情况下，`actions/checkout` 只获取触发事件的单个 commit。如果需要进行版本分析、生成 changelog 等操作，需要获取完整历史：

```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0
```

`fetch-depth: 0` 表示获取所有分支和标签的完整历史。

### 场景 2：Sparse Checkout（部分检出）

对于大型仓库，如果只需要部分文件，可以使用 sparse checkout 加速：

```yaml
# 只检出根目录文件
- uses: actions/checkout@v7
  with:
    sparse-checkout: .

# 只检出 .github 和 src 目录
- uses: actions/checkout@v7
  with:
    sparse-checkout: |
      .github
      src

# 只检出单个文件（需要禁用 cone mode）
- uses: actions/checkout@v7
  with:
    sparse-checkout: |
      README.md
    sparse-checkout-cone-mode: false
```

### 场景 3：检出其他仓库

在多仓库 monorepo 风格的 CI 中，可能需要检出多个仓库：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          path: main

      - uses: actions/checkout@v7
        with:
          repository: my-org/my-tools
          path: my-tools
```

如果其他仓库是私有的，需要提供 Personal Access Token：

```yaml
- uses: actions/checkout@v7
  with:
    repository: my-org/my-private-tools
    token: ${{ secrets.GH_PAT }}
    path: my-tools
```

### 场景 4：在 PR 工作流中提交代码

当需要在工作流中修改代码并提交时，需要检出 PR 的 HEAD commit（而不是 merge commit），并使用内置 token 进行 push：

```yaml
on: pull_request

jobs:
  auto-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ github.head_ref }}

      - run: npm run format

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Auto-format code"
          git push
```

### 场景 5：使用 SSH 密钥认证

对于企业环境或需要更细粒度权限控制的情况，可以使用 SSH 密钥：

```yaml
- uses: actions/checkout@v7
  with:
    ssh-key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh-known-hosts: github.com
```

## 五、常见问题与解决方案

### 问题 1：`fetch-depth: 1` 导致 `git log` 失败

**症状：** 工作流中执行 `git log` 或其他需要完整历史记录的 git 命令时失败。

**原因：** 默认 `fetch-depth: 1` 只获取单个 commit，没有完整的历史记录。

**解决方案：**
```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0  # 获取完整历史
```

### 问题 2：在 Docker 容器动作中 git 命令认证失败

**症状：** 在 Docker 容器动作中执行 `git push` 等命令时提示认证失败。

**原因：** v6 之后凭证存储在 `$RUNNER_TEMP`，而 Docker 容器默认无法访问宿主机的临时目录。

**解决方案：** 升级 Actions Runner 到 v2.329.0 或更高版本。

### 问题 3：`pull_request_target` 工作流中无法检出 fork PR 代码

**症状：** 升级到 v7 后，原本在 `pull_request_target` 工作流中检出 fork PR 代码的步骤失败。

**原因：** v7 默认禁止这种不安全的操作，防止 pwn request 攻击。

**解决方案（谨慎使用）：**
```yaml
- uses: actions/checkout@v7
  with:
    allow-unsafe-pr-checkout: true
```

**注意：** 启用前请仔细阅读 https://gh.io/securely-using-pull_request_target 了解安全风险。

### 问题 4：Windows runner 上路径长度限制

**症状：** 在 Windows runner 上检出包含深层目录的仓库时失败。

**解决方案：** 使用 `path` 输入将仓库检出到较短的路径：
```yaml
- uses: actions/checkout@v7
  with:
    path: repo
```

### 问题 5：Submodule 检出失败（SSH 密钥场景）

**症状：** 使用 `ssh-key` 输入时，递归检出子模块失败。

**原因：** SSH URL (`git@github.com:...`) 在没有显式提供 `ssh-key` 时会被自动转换为 HTTPS URL，但子模块配置中可能硬编码了 SSH URL。

**解决方案：** 确保子模块的 URL 配置与父仓库的认证方式一致，或显式配置 `ssh-key`。

## 六、总结

`actions/checkout` 作为 GitHub Actions 生态的基石，其稳定性和安全性至关重要。v7 版本的发布进一步强化了安全特性，默认阻止不安全的 fork PR 代码执行，并完成了 ESM 迁移以跟上 Node.js 生态的发展。

**关键要点：**
1. 几乎所有 GitHub Actions 工作流都需要 `actions/checkout` 作为第一步
2. v7 的安全改进是**破坏性变更**（默认行为改变），升级时需要注意
3. `fetch-depth: 0` 是获取完整 Git 历史的常用配置
4. Sparse checkout 可以显著加速大型仓库的 CI 流程
5. 在 Docker 容器中使用 git 命令需要 Runner v2.329.0+

随着 GitHub Actions 的普及，`actions/checkout` 也在不断演进，平衡易用性、性能和安全性。建议用户：
- 使用最新的 v7 版本以获得安全修复
- 明确配置 `fetch-depth` 以满足具体需求
- 谨慎使用 `pull_request_target` + fork PR 代码执行的组合
- 关注 [GitHub 官方博客](https://github.blog) 和 [release notes](https://github.com/actions/checkout/releases) 获取最新动态

**参考链接：**
- 仓库地址：https://github.com/actions/checkout
- 安全公告：https://gh.io/securely-using-pull_request_target
- Actions Runner 发布：https://github.com/actions/runner/releases
