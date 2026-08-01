---
title: "gh-stack：用一条命令管理 GitHub 堆叠式 PR，把大改动拆成可评审的小 PR"
date: 2026-08-01
description: "gh-stack 是 GitHub 官方推出的 gh CLI 扩展，专用于管理堆叠式（stacked）分支与 Pull Request。本文深入解析其架构设计、核心命令与实战工作流，帮助你把动辄上千行的大型 PR 拆分成彼此依赖、易于评审的小 PR。"
author: "Cheman"
slug: gh-stack
draft: false
categories: [开源, 工具]
tags: [GitHub, 开源, Git, CLI, 效率工具]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**github/gh-stack**，这是 GitHub 官方为 `gh` CLI 打造的扩展，一句话概括它的价值——把"一个巨大的 PR"变成"一串彼此堆叠、逐层可评审的小 PR"。

## 一、项目概述

在真实工程中，一个功能往往涉及多个相互依赖的改动层：认证层、接口层、前端层……如果把这些改动全部塞进一个 PR，评审者需要一次性理解上千行 diff，很容易出现"看不懂就 approve"或"拖很久不 review"的情况。

`gh stack` 给出的解法叫**堆叠式 PR（Stacked PRs）**：把大改动拆成一条「分支链」，每一层只构建在它下面那一层之上，并各自开一个 PR，且每个 PR 的 base 自动指向下层分支。这样评审者每次只需 review 某一层的增量 diff。

```text
frontend      → PR #3 (base: api-endpoints) ← 顶层
api-endpoints → PR #2 (base: auth-layer)
auth-layer    → PR #1 (base: main)          ← 底层
─────────────
main (trunk)
```

核心特性：

- **自动化繁琐流程**：创建分支、级联 rebase、设置正确的 PR base、在层级间导航，全部由命令完成。
- **本地元数据追踪**：栈信息存放在 `.git/gh-stack`（JSON，不进仓库），rebase 中断状态单独存于 `.git/gh-stack-rebase-state`。
- **AI Agent 集成**：官方直接提供 `gh skill install github/gh-stack`，让 AI 编程助手也懂怎么用堆叠 PR。
- **终端自适应主题**：交互界面与彩色输出会根据终端背景自动调整配色，深浅色主题都可读。

## 二、技术原理

### 栈的模型

一个**栈（stack）**是一组有序分支，每个分支都构建在它下面那个分支之上。最靠近 trunk 的分支是**底层（bottom）**，最远离 trunk 的是**顶层（top）**。导航命令遵循"远离 trunk 为 up、靠近 trunk 为 down"的直觉模型：`up` 向上移动、`down` 向下移动、`top`/`bottom` 跳跃到两端。

### 提交元数据与 rerere

`gh stack init` 会**自动启用 `git rerere`**，让冲突解决方案在多次 rebase 之间被"记住"，这是堆叠式工作流能顺畅级联 rebase 的关键。栈的元数据以 JSON 形式写入 `.git/gh-stack`，与代码仓库分离，避免污染提交历史。

从源码结构看，项目基于 Go 实现，使用 `cli/cli/v2`、`cli/go-gh/v2` 访问 GitHub API，并经 `cli/shurcooL-graphql` 调用 GraphQL 来管理 Stack 对象；交互界面则使用 charmbracelet 的 bubbletea/lipgloss/glamour 全家桶构建 TUI。

### 级联 rebase 的数据流

`gh stack rebase` 的核心逻辑是：先 `fetch` 远端，再确保栈中每个分支的提交历史都包含上一层的 tip，然后从 trunk 向上依次 rebase。如果某一层的 PR 已被合并，rebase 会自动切换到 `--onto` 模式，把提交正确重放到合并目标之上。冲突时整个操作暂停，给出带行号的冲突文件清单，解决后 `git add` 再 `--continue`；`--abort` 则把全部分支恢复到 rebase 前状态。

## 三、安装与快速开始

### 环境要求

- 已安装 [GitHub CLI](https://cli.github.com/)（`gh`），版本 **v2.0+**

### 安装

```sh
gh extension install github/gh-stack
```

### 最简运行示例

```sh
# 新建一个栈（创建并切出第一个分支）
gh stack init

# 在第一个分支上写代码、提交……

# 在其上追加一个分支
gh stack add api-endpoints
# 写代码、提交……

# 一次性推送所有分支
gh stack push

# 查看当前栈
gh stack view

# 提交整条栈为一组 PR
gh stack submit
```

## 四、使用方法与实战

### 基础用法：命名分支

```sh
gh stack init            # 交互式，提示输入分支名
gh stack add api-routes  # 在顶层之上新建并切出 api-routes
gh stack submit          # 为每个分支创建 PR 并链接成 Stack
```

### 进阶用法：极简工作流（-Am 一步到位）

不想反复敲 `git add`、`git commit`、起分支名？用 `-Am` 把"暂存 + 提交 + 建分支"折叠成一条命令。当分支尚无提交时，`add -Am` 直接在当前分支提交；一旦分支已有提交，则自动按 `日期+slug` 格式（如 `03-24-add_login`）生成新分支。

```sh
gh stack init auth
gh stack add -Am "Auth middleware"   # auth 无提交 → 直接落在此分支
gh stack add -Am "API routes"        # 生成新分支并 checkout 后提交
gh stack add -Am "Frontend components"
gh stack submit                      # 推送并创建整条 Stack
```

### 实战：评审返工后的级联同步

当评审在底层 PR 提出修改，典型闭环如下：

```sh
gh stack bottom    # 跳到底层分支
# 修改代码并 commit
gh stack rebase   # 把上层分支级联 rebase 到底层修复之上
gh stack push     # 强制（with-lease）推送到远端
gh stack sync     # 拉取/合并/推送/同步 PR 状态，必要时用 --prune 清理已合并分支
```

### 导航与别名

在栈的层级间穿梭无需记住分支名：

```sh
gh stack up        # 上移一层
gh stack up 3      # 上移三层
gh stack down      # 下移一层
gh stack top       # 跳到顶层
gh stack trunk     # 跳回 trunk（如 main）
gh stack switch    # 交互式选择器
gh stack alias     # 安装 gs 别名，之后可写 gs push / gs view
```

## 五、常见问题与解决方案

**Q1：安装扩展提示找不到 `gh` 或版本过低？**
需要 GitHub CLI v2.0+。先升级 `gh`（各平台用对应包管理器），再执行 `gh extension install github/gh-stack`。

**Q2：级联 rebase 出现冲突，如何收场？**
命令会打印带行号的冲突文件。在对应文件里解决冲突后 `git add <file>`，再执行 `gh stack rebase --continue`。若想放弃整次 rebase，用 `gh stack rebase --abort`，所有分支恢复到操作前状态。

**Q3：`sync` 时提示栈已"分叉（diverged）"？**
说明你在本地加了分支，而 GitHub 上的同一栈也加了别的 PR，双方互不为前缀。交互终端会提供三选项：以远端为准、删除 GitHub 上的栈、或取消。非交互（如 CI）环境会直接中止 sync 而不推送，需要你手动 `unstack` 后重建。

**Q4：合并 PR 用哪种方式？**
`gh stack merge` 支持 `merge`/`squash`/`rebase` 三种方法，可用 `--merge-method` 或 `--squash`/`--rebase` 简写；加 `-y` 可跳过确认。若 base 分支启用了 merge queue，栈会被加入队列，此时方法选择会被忽略。

**Q5：栈的本地元数据会污染仓库吗？**
不会。栈信息仅存于 `.git/gh-stack`，rebase 中断状态存于 `.git/gh-stack-rebase-state`，均不进入提交历史，纯属本地追踪。

## 六、总结

`gh-stack` 把"堆叠式 PR"这套在大型仓库里早已被验证的工程实践，封装成了开箱即用的 `gh` 扩展：从 `init` / `add` 建栈，到 `rebase` / `sync` 维护，再到 `submit` / `merge` 收尾，配合自动化的 rerere 与正确 base 链接，让大改动也能被分层、可评审、易合并。对于经常需要拆功能、做 code review 的团队，以及希望让 AI 编程助手按规范提交 PR 的开发者，这是一个值得加入工具箱的项目。

> 项目地址：[github/gh-stack](https://github.com/github/gh-stack) · 安装：`gh extension install github/gh-stack`
