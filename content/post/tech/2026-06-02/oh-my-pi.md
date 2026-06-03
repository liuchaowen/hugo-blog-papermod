---
title: "oh-my-pi：把 IDE 能力接入编码智能体的终极方案"
date: 2026-06-02
description: "深入解析 oh-my‑pi（omp）——一个将 LSP、DAP、真实浏览器和文件系统全部接入编码智能体的开源项目。基于 Pi 构建，内置 32 种工具、支持 40+ AI 提供商，用 ~27k 行 Rust 实现核心引擎，让智能体真正「懂」你的代码库。"
author: "Cheman"
slug: "oh-my-pi"
draft: false
categories: ["开源项目"]
tags: ["GitHub", "开源", "IDE", "AI Agent", "Rust"]
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

今天在 GitHub Trending看到的这个项目让我眼前一亮：**oh‑my‑pi**（简称 **omp**）——它不是一个「套壳」的 AI  助手，而是把 **IDE  的核心能力（LSP、DAP、Git）直接焊进了智能体的工具链**，让模型真正能「理解」你的代码库。

##  一、项目概述

**omphan**p (@can1357) pi-monoMario ZechnerPi）的一个激进分支——目标不是做一个「聊天机器人」，而是做一个 **coding agent withthe IDEwiredin**（官方 Hero文案）。它的核心承诺是：

> The most capable agent surface that ships.… Every tool,_benchmaxxed_.

从数据上看确实有点东西：

|指标|数值|
|---|---|
|AI模型提供商|40+ |
||具数 |32 |
||LSP操作 |13 |
||DAPdebug操作 |27 |
||Rust心代码行数 |~27000 |

它天生多运行时：**macOS · Linux· Windows**，支持 **Bun**、**npm**、**PowerShell*一键安装；

```bashcurl -fsSL https://omp.sh# macOS / Linux brew install omp# Bun推荐bun install -g @oh.my.pi/pi-coding-agentirm https://omp.sh# Windows PowerShell```

##   二、技术原理

###   2.1 Rust crates ——不 fork不走弯路

其他智能体大量 `ch`ild_process.spawn() `r`g``grep``findBash；但 omp选择用 **Rust重写所有这些热点路径**：

```textcrates/
├── pi.natives# N-API addon聚合层（cdylib）
├── pi.shell#内嵌 Bashbrush-shell） +PTY管理├── pi ast # tree sitter摘要器 + ast grep└── iso #工作区隔离后端（APFSClonebtrfs reflink……```这样做的好处：
1.**零fork开销**：ripgrep/glob/find全部_in-process_
2.**Stateful Bash**：brush会话可跨多次调用生存3. **NAPI接口**：Node.ts调用者无需感知 Rust边界###  2.2 Hashline ——用内容哈希做编辑锚点

传统 SEd/ASTedit最大的问题是：「模型生成的 patch经常因为空白符或上下文偏移而 fail」。omp引入 *hashline*：

```typescript//读取时生成锚点readFileWithAnchors(filePath)//编辑时引用锚点而不是行号editWithAnchor({ anchorHash 'xxh64::1234abcd'newText '...'})```

带来的benchmark提升非常夸张：

|> Model |> Before |> After ||
> GrokCode Fast ||6%|68% |>|+10x|
>MiniMax|||Passrate ×20|>|

###    2.3 LSP / DAP直通——编辑器级别理解能力大多数agent只能看文件内容，**omphan*p*直接接入 Language Server Protocol**：

```typescript//伪代码示意agent.onUserRequest(async()=>{const symbols = await lsp 'gopls'.documentSymbol({ uri 'file://main.go'})const refs = await lsp ''references({ uri ...range ... })//甚至 rename跨文件await lsp 'pyright'.rename({ newName 'formatBytesV2'})
})
```

这意味着：
-
 -
-
 ###  三、安装与快速开始


 ```bash #克隆并构建 nativesgit clone https://github.com/can1357comphsopress.gitcd omphpmake build-natives #需要Rustnightly + Bun##测试 CLI./dist/cli.js --help ```

如果你只是想试用（不用源码）：

`` bash#全局安装npm i -g @oh my comppi-coding-agentomb --versionomb --help ```

第一次运行会引导你登录主流供应商之一Anthropic ortalCpenAIortalGitHub Copilot OAauthDev）。

###   四、使用方法与实战


####   4.mini实战：让 omp帮我重构一个 Go项目```


 Let's say你有一个 GoWeb服务 main go ，想让它使用 dependency injection框架 go wire**。你可以：

1 .打开终端 → ``omb chat`
2 .告诉它：`Refactor main.go to use Uber''s dig container instead of manual wire`
3 .如果点了 ``[Preview]`` →你会看到所有 diff预览→ `[Accept]`即写入磁盘


背后的工具调用链大致是：

 read main goparse ASTdetect dependenciescall `lsp renameacrossPKGgenerate new fileswire_gen gowrite & format```

####    4.browser控制——不只是无头 Chrome别的agent可能让你装seleniumomphanpt提供真实 CDPStealth模式默认开启)：

 ``typescriptawait tools browser launch ({ headlesstrue stealthrue })await toolsbrowser open ({ url : ''https //news.ycombinator.com'})const links = await tools browser querySelectorAll ({ selector '''athing > .titleline > a'' }) ``



 ##五、常见问题与解决方案


 ###Q1build natives失败 macOS上遇到 clang↑ armored>` error missingbr>`?


 ```bashbrewinstall llvmexport PATH="/opt/homebrew/s=true"export CC=clang++ CXX=clang v ++ ```or直接使用 Bunmanagednatives跳过本地编译：`bun install --ignore-scripts`

 ###Q APT地下载 still超慢？设置 GHProxy镜像加速：


 ```bashgit config --global url."https //ghproxy.com/"https://github.com.insteadOf ```## Q100%cpucryptsetup?哦那是 brush-shell在初始化 job control表……可以限制 parallel并发度：`OMP_BRUSH_MAX_JOBS=4omb ...`

 ##六总结如果你已经厌倦了那些只能 「`read file`」「`runShellCommandile」的弱鸡agent。**试试omp**。它有：
-
-
-
-> Project Homepage:** [](https ://comp slash )> GitHub:** [](https ://github.can357 omphp)>)Discord:* *(ht tps :discord gg /**
