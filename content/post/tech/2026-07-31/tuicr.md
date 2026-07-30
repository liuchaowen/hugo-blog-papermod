---
title: "tuicr：在终端里像 GitHub PR 一样做代码审查的 Rust TUI 神器"
date: 2026-07-31
description: "tuicr 是一款用 Rust 编写的终端代码审查工具，提供 GitHub 风格连续 diff、Vim 键位、行级评论，并可一键将审查结果推送到 GitHub/GitLab 或导出给 AI 编程助手。"
author: "Cheman"
slug: tuicr
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "TUI", "代码审查", "GitHub", "开发工具", "命令行"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**[tuicr](https://github.com/agavra/tuicr)**（发音"tweaker"），一个带 Vim 键位的终端代码审查 TUI，让你在命令行里获得 GitHub PR 级别的审查体验，还能把审查结果直接推送到 GitHub/GitLab，或者导出为结构化 Markdown 喂给 AI 编程助手。在 AI 大量生成代码的时代，这类"人审 AI 代码"的工具正变得越来越重要。

## 一、项目概述

tuicr 是一款用 Rust 编写的单二进制终端代码审查工具，它把 GitHub Pull Request 的审查体验完整搬进了终端：

- **GitHub 风格连续 diff**：所有变更文件在一个流里连续滚动浏览，而不是逐个文件切换；
- **PR 式多级评论**：支持行级、行范围、文件级、审查级四种粒度的评论；
- **审查进度追踪**：按文件或按 hunk 标记"已审查"，且跨会话持久化——中途退出下次继续；
- **三种导出目标**：将真实 Review 推送到 GitHub 或 GitLab、复制结构化 Markdown 到剪贴板、或通过 stdout 管道输出；
- **多 VCS 支持**：兼容 git、jj（Jujutsu）和 Mercurial，可审查未提交变更、commit 范围、任意 GitHub PR 或 GitLab MR。

它在 Cargo.toml 中的自我定位一语中的：

> Review AI-generated diffs like a GitHub pull request, right from your terminal.

对比同类工具（hunk、lumen、`gh pr review`），tuicr 是唯一同时具备完整 Vim 键位模型、GitHub/GitLab 双端行内评论推送、以及 Agent 友好 Markdown 导出的单二进制方案。

## 二、技术原理

### 2.1 核心技术栈

从 `Cargo.toml` 可以看到清晰的技术选型：

```toml
[dependencies]
# TUI 框架
ratatui = { version = "0.30", features = ["unstable-rendered-line-info"] }
crossterm = "0.29"

# Vim 模态编辑引擎（评论输入框，opt-in）
edtui = { version = "0.11", default-features = false }

# Git 操作
git2 = { version = "0.20", default-features = false }

# 语法高亮
syntect = "5.2"
two-face = { version = "0.5", features = ["syntect-default-fancy"] }
```

几个值得注意的选型细节：

- **ratatui + `unstable-rendered-line-info`**：这个不稳定 feature 暴露了 `Paragraph::line_count`，tuicr 用它借助 ratatui 自身的折行引擎测量每行折行后的高度，从而让逐行 diff 背景色和覆盖层与实际渲染文本**像素级对齐**——这是很多 TUI diff 工具做不好的细节；
- **edtui 只当"引擎"用**：评论框的 Vim 模态编辑（`comment_vim` 配置项）复用了 edtui 的编辑模型和输入引擎，但渲染完全自绘，禁用了其 widget/剪贴板/语法功能，保持 UI 一致性；
- **git2 而非 shell 出 git**：通过 libgit2 绑定直接操作仓库，diff 解析不依赖外部命令；jj 和 Mercurial 则通过命令行适配；
- **syntect + two-face**：提供 Sublime 级语法高亮，配合 `terminal-colorsaurus` 检测终端背景色自动适配明暗主题。

### 2.2 自更新机制的工程细节

`tuicr update` 是一个小而精的设计。它会检测当前可执行文件由哪个包管理器"拥有"（Homebrew/Cargo/Mise/Nix profile），然后调用对应管理器更新；如果是安装脚本或手动下载的二进制，则从 GitHub Release 拉取匹配资产，**经 SHA-256 校验后原地替换**：

```toml
self-replace = "1.5"   # 安全替换正在运行的可执行文件
semver = "1"           # 按 SemVer 规则比较版本
sha2 = "0.10"          # 校验 GitHub 的 SHA-256 摘要
```

### 2.3 持久化审查会话与库 API

tuicr 把审查会话持久化为本地文件，并在此之上暴露了 Rust 库 API（`ReviewStore`），第三方工具可以列出会话、加载会话、用与 TUI 相同的插入原语添加评论：

```rust
use tuicr::{AddCommentRequest, CommentTarget, CommentType, LineSide, ReviewStore};

let store = ReviewStore::new();
let sessions = store.list_sessions_for_repo("/path/to/repo")?;
let session = &sessions[0].session_ref;

store.add_comment(
    session,
    AddCommentRequest {
        target: CommentTarget::Line {
            path: "src/main.rs".into(),
            line: 42,
            side: LineSide::New,
        },
        content: "Handle the empty case here.".into(),
        comment_type: CommentType::from_id("issue"),
    },
)?;
```

TUI 在审查目标激活时即创建会话文件，配合 `review_watch_interval_ms` 轮询机制，协作工具（比如你的 AI Agent）可以**实时**向正在进行的审查注入评论。

## 三、安装与快速开始

### 环境要求

- macOS / Linux / Windows 终端环境
- 推送 GitHub Review 需要已认证的 `gh` CLI；推送 GitLab 需要 `glab`
- 从源码构建需要 Rust 工具链（edition 2024）

### 安装

```bash
# 一键脚本
curl -fsSL tuicr.dev/install.sh | sh

# Homebrew
brew install agavra/tap/tuicr

# Cargo
cargo install tuicr

# Nix
nix run github:agavra/tuicr
```

### 最简运行

```bash
cd your-repo
tuicr            # 打开 commit 选择器
tuicr -w         # 直接审查未提交的变更
```

进入 TUI 后：`j`/`k` 上下移动，`c` 添加行评论，`y` 复制审查结果，`:submit` 推送到 GitHub/GitLab。

## 四、使用方法与实战

### 基础用法

```bash
tuicr -w                    # 审查工作区未提交变更
tuicr -r main..HEAD         # 审查 commit 范围
tuicr pr 125                # 审查 GitHub PR #125
tuicr mr 125                # 审查 GitLab MR #125
tuicr --stdout > review.md  # 审查结果输出到文件
tuicr review list           # 列出已保存的本地审查会话
```

### 核心键位

| 键 | 动作 |
|---|---|
| `j` / `k` | 上下移动 |
| `Ctrl-d` / `Ctrl-u` | 半页翻滚 |
| `{` / `}` | 上/下一个文件 |
| `[` / `]` | 上/下一个 hunk |
| `c` / `C` | 行评论 / 文件评论 |
| `v` / `V` | 可视模式（范围评论） |
| `r` / `R` | 标记文件 / hunk 已审查 |
| `e` | 在 `$EDITOR` 打开当前文件 |
| `y` | 复制审查到剪贴板 |
| `:submit` | 推送 Review 到 GitHub/GitLab |

### 实战：审查 AI 生成的代码

这是 tuicr 最典型的场景。让 Claude/Codex/Cursor 写完代码后：

```bash
tuicr -w
```

逐 hunk 审查，用 `c` 在有问题的行留下评论，按 `y` 复制出结构化 Markdown：

```markdown
I reviewed your code and have the following comments. Please address them.

1. `src/auth.rs` - Consider adding unit tests
2. `src/auth.rs:42` - Magic number should be a named constant
3. `src/auth.rs:50-55` - This block could be refactored
```

直接粘贴回 AI 助手，每条评论都带文件/行号锚点，Agent 可以精确定位修改。项目还附带了 Agent Skill，支持让 Agent 在 tmux/Zellij 分屏中主动打开 tuicr 请求人工审查。

### 进阶：自定义评论类型与主题

`~/.config/tuicr/config.toml`：

```toml
theme = "catppuccin-mocha"
diff_view = "side-by-side"   # 或 "unified"
comment_vim = true            # 评论框启用 Vim 模态编辑

[[comment_types]]
id = "issue"
color = "red"
definition = "must fix before merge"

[[comment_types]]
id = "nit"
color = "yellow"
definition = "optional style suggestion"
```

内置 20+ 主题（catppuccin、gruvbox、nord、tokyo-night 等），也支持自定义主题和 `.tmTheme` 语法配色。

### 进阶：增量审查 PR

再次打开审查过的 GitHub PR / GitLab MR 时，tuicr 会**预选上次已提交 Review 之后的新 commit**，已覆盖的 commit 标记 `✓`——增量审查体验和 GitHub 网页版的 "changes since last review" 一致。

## 五、常见问题与解决方案

**1. `:submit` 推送 GitHub 失败？**
需要 `gh` CLI 已认证且对目标仓库有权限，先执行 `gh auth login` 并确认 `gh auth status` 正常。

**2. GitLab "Request changes" 报错？**
GitLab 侧要求你的账号是该 MR 的指定 Reviewer 才能 Request changes；另外 Draft Review 是 GitHub 独有的，GitLab 只支持 Comment/Approve/Request changes。自建实例的配置见项目 `docs/GITLAB.md`。

**3. 剪贴板复制失败（Linux）？**
tuicr 使用 arboard 并启用了 `wayland-data-control`，支持 Wayland；X11 下需要 xclip 等基础剪贴板支持。无图形环境时可改用 `tuicr --stdout | xclip`。

**4. diff 里全是空白符噪音？**
配置里设 `ignore_whitespace = true`，本地 VCS diff 将忽略所有空白差异。

**5. 想让某些文件不出现在审查里？**
使用 `.tuicrignore` 文件（语法同 `.gitignore`，基于 ignore crate），排除 lock 文件、生成代码等。

**6. `tuicr update` 无法更新？**
如果是 `nix run` 临时运行的实例则本身没有安装，需 `nix profile install github:agavra/tuicr`；Homebrew/Mise/Nix 的版本锁定请用各自包管理器的 pin 工作流。

## 六、总结

tuicr 把"代码审查"这个长期被锁在网页里的工作流彻底终端化了：Vim 键位 + 连续 diff + 多级评论 + 持久化会话，覆盖 git/jj/hg 三种 VCS，一个静态二进制搞定。更有前瞻性的是它对 AI 工作流的原生支持——结构化 Markdown 导出、Review CLI、Rust 库 API 和 Agent Skill，让"AI 写代码、人来把关、评论回流给 AI 修改"形成闭环。如果你每天都在审查 AI 生成的 diff，或者只是厌倦了在浏览器里点来点去做 Review，这个项目非常值得一试。

项目地址：[https://github.com/agavra/tuicr](https://github.com/agavra/tuicr)
