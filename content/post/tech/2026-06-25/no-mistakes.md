---
title: "no-mistakes：一个 Git AI 审核门卫，让每次 PR 都干净体面"
date: "2026-06-25"
description: "no-mistakes 是一个 Git 本地代理工具，在推送到远程之前运行 AI 驱动的自动化审核流水线，自动修复安全问题、格式化代码、生成规范 PR，解决了 AI 编程助手容易「污染」代码库的痛点。"
author: "Cheman"
slug: no-mistakes
draft: false
categories: ["技术", "开源"]
tags: ["Git", "AI", "DevOps", "GitHub", "编程工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**no-mistakes**，它给 Git 加了一个本地"门卫"——推送到 `no-mistakes` 远程代理而非直接推送到 `origin`，所有提交会先经过 AI 驱动的审核流水线，review、test、docs、lint 全部通过后才会真正 push 并自动打开 PR。AI 编程助手满天飞的时代，这个工具解决了一个真实痛点：代码确实跑通了，但 CI 飘红、PR 描述混乱、安全漏洞被合入。

## 一、项目概述

`no-mistakes` 是一个开源的 Git 本地代理（git remote proxy），由 kunchenguid 开发，定位是"AI 编程时代的 PR 质量守护者"。核心思路很简单：在你的本地 Git 工作流和真实远程仓库之间插入一个可丢弃的 worktree，在那个隔离环境里运行完整的 AI 审核流程，全部通过后才放行。

**核心特性：**

- **非阻塞运行**：审核在独立的 disposable worktree 中进行，不影响你当前的开发分支，随时可以继续写代码
- **兼容主流 AI 编程助手**：支持 `claude`、`codex`、`rovodev`、`opencode`、`pi` 以及 `acp:<target>` 等后端
- **Agent 原生集成**：为 AI 编程 Agent 提供 `/no-mistakes` 指令，让 Agent 执行任务后自动 gate 审核
- **人类保持掌控**：所有需要人工判断的 findings 都会停下来等你决定：自动修复、还是人工处理
- **一键开 PR**：流水线全部通过后，自动推送到目标仓库并打开干净的 PR，CI 失败还会自动尝试修复

> 📌 **一句话总结**：`git push no-mistakes` = 推送 → AI 审核 → 自动修复 → 干净 PR，全程无需手动干预。

## 二、技术原理

### 2.1 架构设计

`no-mistakes` 的架构分为两层：

**Gate（门卫层）**：在用户 `git push no-mistakes` 时触发，本质上是一个本地 git remote。Gate 会在一个临时 disposable worktree 中拉取分支，然后启动 Pipeline。

**Pipeline（流水线层）**：Gate 拉起的后端审核流程，包含多个步骤：

```
your branch
    │  git push no-mistakes
    ▼
┌──────────────────────────────────────────────┐
│  disposable worktree — your work stays put  │
│  review → test → docs → lint → push → PR → CI│
└──────────────────────────────────────────────┘
    │  every check green
    ▼
clean PR, opened for you
```

每个步骤独立通过或停止并抛出 finding。机械性修复（如代码格式化、依赖锁定）自动应用；涉及代码意图的 findings 才会提交给人类判断。

### 2.2 核心技术栈

从 `go.mod` 和源码文件分析，`no-mistakes` 的技术选型非常务实：

- **语言**：Go 1.25+，编译型语言确保跨平台二进制分发的便捷性（支持 macOS/Linux/Windows 三平台，amd64/arm64 四架构）
- **TUI 界面**：使用 `charmbracelet/bubbletea` 构建交互式终端界面，提供 `no-mistakes` 命令行 TUI，支持渐进式操作引导
- **数据存储**：使用 `modernc.org/sqlite` 存储流水线运行状态，支持 daemon 模式长期运行
- **Agent 集成**：通过 `/no-mistakes` agent skill 指令与 Claude Code 等 AI 编程助手无缝集成，内部调用 `no-mistakes axi` 非交互式引擎
- **发布管理**：集成 release-please，所有 release 均以 **draft** 形式创建，二进制文件和校验和全部上传后才标记为 prerelease，最后手动 promote 到 latest，完全避免了半发布状态

### 2.3 关键源码解析

从测试文件中可以一窥项目的工程严谨度：

**Pipeline 签名验证（`no-mistakes-required.yml`）**

Pipeline 运行完成后会在 PR description 中插入一个签名标记：

```yaml
# GitHub Actions workflow 验证这个标记是否存在
- name: Check no-mistakes signature
  run: |
    echo "$PR_BODY" | grep -q "Updates from \[git push no-mistakes\]" || exit 1
```

这个设计确保只有真正经过 `no-mistakes` 审核的 PR 才能通过 CI gate。PR body 通过环境变量 `PR_BODY` 传递（而非直接插值），防止 shell 注入攻击：

```yaml
env:
  PR_BODY: ${{ github.event.pull_request.body }}
run: |
  echo "$PR_BODY" | grep ...
```

**Release 分阶段发布**

从 `release.yml` 分析，项目的发布流程采用了严格的阶段性 gate：

```yaml
# 1. release-please 创建 draft release
# 2. build-and-upload 等待 release_created == 'true' 才运行
# 3. checksums 校验所有二进制包的完整性
# 4. finalize 只有在所有资产任务成功后，才将 draft 改为 prerelease
```

这样做的好处是永远不会有"部分资产缺失却被标记为最新版本"的风险。

## 三、安装与快速开始

### 环境要求

- macOS / Linux / Windows
- 已安装 Git
- 需要推送到 GitHub 的话，需要配置 SSH key 或 GitHub Token

### 安装步骤

**macOS / Linux 一键安装：**

```bash
curl -fsSL https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh | sh
```

**Go 安装（开发者或需要自定义构建的用户）：**

```bash
go install github.com/kunchenguid/no-mistakes@latest
```

**Windows PowerShell 安装：**

```powershell
irm https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.ps1 | iex
```

### 快速开始

**第一步：初始化**

```bash
no-mistakes init
# ✓ Gate initialized
#   repo  /Users/you/src/my-repo
#   gate  no-mistakes → /Users/you/.no-mistakes/repos/abc123def456.git
#   remote  git@github.com:you/my-repo.git
#   skill  /no-mistakes installed for agents at user level
```

**第二步：切换分支并工作**

```bash
git checkout my-branch
# 在分支上做你的开发工作...
```

**第三步：通过 Gate 推送**

```bash
git push no-mistakes
# * Pipeline started
# Run no-mistakes to review.
```

**第四步：查看审核结果（TUI 模式）**

```bash
no-mistakes
# 打开 TUI，展示当前运行状态，逐一处理 findings
```

**第五步：自动开 PR**

所有检查通过后，Gate 自动将分支推送到目标仓库并打开 PR，无需手动 `git push origin`。

## 四、使用方法与实战

### 4.1 基础用法

**为已有分支开启审核：**

```bash
git checkout feature-branch
git push no-mistakes
```

Pipeline 会在 disposable worktree 中启动，不影响你的当前工作。

**完全自动化（无需确认）：**

```bash
no-mistakes -y
```

加 `-y` 参数跳过所有人工确认，自动完成创建分支→commit→推送→审核→开 PR 的全流程。

### 4.2 AI 编程助手集成

对于使用 Claude Code 或其他 AI 编程 Agent 的开发者，`/no-mistakes` 技能让你的 Agent 可以"边干活边自审"：

```bash
# 让 Agent 完成任务并自动 gate 审核
/no-mistakes 实现用户登录模块

# 或者 gate 已有的 commit
git commit -m "feat: add login module"
/no-mistakes
```

Agent 会自动运行完整流水线，安全修复自动应用，需要判断的内容才会中断询问人类。

### 4.3 Fork 贡献工作流

向开源项目贡献 PR 时，保持 `origin` 指向你的 fork，用 `--fork-url` 初始化：

```bash
no-mistakes init --fork-url git@github.com:you/fork.git
```

这样审核流程仍然有效，最终 PR 会提交到上游仓库。

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：curl 脚本下载失败或权限错误

**解决方案**：确保网络畅通，或手动下载 release 包：

```bash
# 手动下载最新 release
curl -LO https://github.com/kunchenguid/no-mistakes/releases/latest/download/no-mistakes-darwin-arm64.tar.gz
tar -xzf no-mistakes-darwin-arm64.tar.gz
install -m 755 no-mistakes ~/.local/bin/no-mistakes
```

### 5.2 Pipeline 长时间运行

**问题**：`no-mistakes` 运行后没有响应

**解决方案**：`no-mistakes` 后台运行 daemon 模式，查看实时日志：

```bash
no-mistakes daemon logs
```

### 5.3 审核结果被误判

**问题**：某些 findings 判定不准确

**解决方案**：TUI 界面支持对每个 finding 选择：approve（批准自动修复）、fix（手动修复）、skip（跳过），完全由你掌控最终决策。

### 5.4 Windows 平台兼容性

**问题**：PowerShell 安装脚本报错

**解决方案**：确保使用管理员权限的 PowerShell：

```powershell
Start-Process powershell -Verb RunAs -ArgumentList '-c', 'irm https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.ps1 | iex'
```

## 六、总结

`no-mistakes` 的价值主张非常清晰：AI 编程时代，写代码的门槛降了，但代码质量的责任反而更重了。它通过一个轻量的 Git 代理层，将"写完代码→跑 CI→修问题"这个被动循环，转变为主动的"推送前先过审"前置把关。对于个人开发者，它省去了反复修 CI 的时间；对于团队，它让 PR review 聚焦在代码意图而非格式、拼写、安全漏洞等机械性问题上。

最值得关注的是它的工程严谨度：从 draft release 的分阶段发布、到 PR body 通过环境变量隔离防止注入、再到 worktree 的完全隔离设计——这是一个认真做产品的开源项目，而非一个 demo 级别的玩具。如果你经常在 AI 辅助下写代码，强烈推荐试试这个"让 AI 编程体面化"的工具。
