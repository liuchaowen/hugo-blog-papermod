---
title: "OpenChamber：贯穿桌面、浏览器与移动端的开源 AI 编程工作台"
date: 2026-08-13
description: "OpenChamber 是基于 OpenCode 的开源 AI 编程工作台，支持桌面、Web、VS Code 与移动端多端协同，提供 Session Goals、Multi-run、Changes Walkthrough、Preview 与私有中继远程访问，让 Agent 编程全流程可控、可 Review、随处可续。"
author: "Cheman"
slug: openchamber
draft: false
categories: [技术, 开源, AI工具]
tags: [GitHub, 开源, AI编程, OpenCode, 开发工具]
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

今天在 GitHub Trending 上看到一个有意思的项目：**OpenChamber**，一个把 AI 编码工作的「前、中、后」全部收拢到同一个工作区的开源平台。它不重新造轮子去做 Agent 内核，而是把 OpenCode 当作底层引擎，在之上补齐调度、监督、评审与跨设备协同这一整层体验。

## 一、项目概述

OpenChamber 的定位是「run agent work, keep control, ship from anywhere」——在一个统一空间里下达 Agent 任务、理解它产生的改动、并推动这些改动走向发布。它最值得关注的点在于：**你的项目不会因为切换设备、关掉 App 或合上电脑而中断**。Agent 会话、目标进度、diff 评审状态都被持续保存，可以在桌面、Web、VS Code、iOS、Android 之间无缝续接。

从 README 中提炼的核心能力可以归为几条主线：

- **Session Goals（自动持续推进的目标）**：给会话设一个「终点」，OpenChamber 在每一轮之后检查结果，让 Agent 一直干到目标完成、被阻塞或触及你设定的上限为止。
- **Multi-run（多模型对照与融合）**：把同一个任务同时交给最多 5 个模型，各自独立会话（可选各自独立 worktree），对比产出后用 Fusion 把最强片段合并成新会话。
- **Changes Walkthrough（变更导览）**：把一大坨 diff 变成 AI 引导的「游览」，把相关改动分组、排序并解释它们如何拼装在一起。
- **Preview（贴着对话看运行中的应用）**：指着页面上的某个元素，把它的截图、样式、位置与浏览器报错一并发给 Agent。
- **GitHub 上下文贯通**：从 Issue / PR 直接起会话，把失败的检查或 Review 评论回灌给 Agent，再在 OpenChamber 内更新或合并 PR。
- **Private Relay（私有中继）**：用一次性二维码配对设备，走端到端加密连接，无需开端口、不暴露公网服务。

## 二、技术原理

### 架构总览

OpenChamber 是一个由 Bun 管理的 monorepo（`bun@1.3.14`），按运行时拆分成多个 workspace 包：`packages/ui`、`packages/web`、`packages/electron`（桌面）、`packages/vscode`、`packages/mobile`。核心思路是**用 Web 技术栈统一所有端**，桌面端由 Electron 封装，移动端由 Capacitor 类方案承载，Web/PWA 直接浏览器运行，VS Code 端则是扩展形态。

从 `package.json` 可以看到它的技术选型相当现代：

- **Agent 内核**：直接依赖 `@opencode-ai/sdk`（版本 `1.18.16`），即 OpenCode 的 SDK——README 明确说明项目「围绕 OpenCode 构建，且与该团队无隶属关系」。
- **前端框架**：React 19 + TypeScript 5.9，构建用 Vite 7，样式用 Tailwind CSS 4。
- **状态管理**：Zustand 5；UI 组件基于 `@base-ui/react`（Base UI）与 HeroUI（`@heroui/system` / `@heroui/theme`）。
- **编辑器能力**：CodeMirror 6 全家桶（含 cpp/go/python/rust/sql 等语言包），用于内联的代码查看与 diff 渲染。
- **终端**：`bun-pty` + `node-pty`，在会话中嵌入可交互终端。
- **服务端**：Express 5 作为 Web/PWA/CLI 模式下的本地服务；`@octokit/rest` 负责 GitHub 集成；`simple-git` 管理仓库操作。

### 构建与分包策略（从源码提取）

`vite.config.ts` 里有一段非常用心、带注释的 `manualChunks` 逻辑，值得单独讲——它解决的是「Hugo-lite 式」的懒加载坑：

```ts
manualChunks(id) {
  // 把 Vite 的运行时 helper 单独固定成稳定 chunk，
  // 否则 __vitePreload 会被 Rollup 塞进某个 vendor chunk，
  // 导致该 vendor（如 Shiki 核心 + 629KB oniguruma 引擎）被拖进启动图。
  if (id.includes('vite/preload-helper')) return 'vendor-vite-runtime'

  const lastNodeModules = id.lastIndexOf('node_modules/')
  const match = id.slice(lastNodeModules + 'node_modules/'.length)
  const segments = match.split('/')
  const packageName = match.startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0]

  // Shiki / CodeMirror legacy 是按需动态 import 的，强制合并成单 chunk
  // 会让首次语言请求下载全部语法（@shikijs/langs 原始 7.4MB）。
  if (packageName === '@shikijs/langs' || packageName === '@shikijs/themes') return undefined

  if (packageName === 'react') return 'vendor-react'
  if (packageName === '@opencode-ai/sdk') return 'vendor-opencode-sdk'
  // ...
}
```

这段逻辑透露出两个工程细节：一是 bun 的隔离安装会把依赖嵌套在 `node_modules/.bun/<pkg>@<ver>/node_modules/<pkg>`，所以 chunk 切分必须取**最后一个** `node_modules/` 段才是真实包名；二是刻意避免把按需加载的语法/主题包合并进首屏，保证「用到哪种语言才下载哪种」。

### 容器化与远程访问

`Dockerfile` 用多阶段构建：基于 `oven/bun` 装依赖、构建 Web，再切到运行时镜像，里面预装 `git`、`openssh-client`、`python3`、`nodejs` 等基础设施，并通过 npm 全局安装 `opencode-ai`。值得注意的是它把镜像内的 `bun` 用户（UID 1000）改名为 `openchamber`，以保证挂载的 1000:1000 卷所有权正确；同时内置 `cloudflared` 二进制用于 Private Relay / 隧道：

```dockerfile
COPY --from=cloudflare/cloudflared@sha256:6d91c121b803126f7a5344005d17a9324788fc09... /usr/local/bin/cloudflared
```

### 数据流：从指令到可发布改动

一条典型的链路是：用户在任意端创建会话并指定 Session Goal → OpenCode SDK 驱动编码 Agent 在 worktree/分支上工作 → 每轮结束 OpenChamber 校验 Goal 状态 → 产出 diff 后通过 Changes Walkthrough 把改动讲清楚 → 用户在 Preview 中贴元素反馈 → 通过 Octokit 把上下文同步到 GitHub Issue/PR → 最终在 OpenChamber 内完成合并/发布。整条链路的状态都保存在本地工作区（`.openchamber`），因此「关掉 App 也不丢进度」。

## 三、安装与快速开始

OpenChamber 对几个环境有硬性要求：**Node.js 22+**（CLI/Web 与 VS Code 端），桌面端则从 GitHub Releases 下载，已内置匹配的 OpenCode CLI。

**桌面端（macOS / Windows / Linux）**

```bash
# Linux AppImage 需 FUSE；无 FUSE 时用环境变量绕过
chmod +x OpenChamber-*.AppImage
./OpenChamber-*.AppImage
```

**CLI / Web / PWA（需先装好 OpenCode CLI）**

```bash
curl -fsSL https://raw.githubusercontent.com/openchamber/openchamber/main/scripts/install.sh | bash
openchamber --ui-password be-creative-here
```

常用运维命令：

```bash
openchamber status
openchamber connect-url --qr
openchamber tunnel start --provider cloudflare --mode quick --qr
openchamber startup enable
openchamber logs
openchamber stop
openchamber update
```

> 注意：OpenChamber 默认只绑定 localhost。只在可信网络用 `--lan`，并务必用 `--ui-password` 保护浏览器访问。

## 四、使用方法与实战

**1. 给 Agent 设一个会自己跑完的目标（Session Goals）**
不要把任务拆成一次次「再改改」，而是直接给终点：让 OpenChamber 在每轮后自检，直到目标达成。关掉电脑它也会在后台继续推进。

**2. 多模型对照择优（Multi-run）**
同个需求并行丢给最多 5 个模型，各自独立会话与 worktree，肉眼对比实现差异，再用 Fusion 把各路最强片段合成一个最优会话。

**3. 把大 diff 变成可讲清楚的变更（Changes Walkthrough）**
面对几百行的 PR，让 AI 把相关编辑分组、按合理顺序串成「游览路线」，新人 onboarding 或 code review 时尤其省事。

**4. 贴着真实页面调（Preview）**
在对话旁打开运行中的应用，指着一个按钮把截图 + 样式 + 位置 + 控制台报错一起发给 Agent，告别「那个东西那里」式的描述模糊。

**5. 从 GitHub Issue/PR 起步并回到 GitHub**
会话直接带 Issue/PR 上下文启动，把失败的 CI 或 Review 评论回灌给 Agent 修正，最后在 OpenChamber 内更新甚至合并 PR。

## 五、常见问题与解决方案

**Linux AppImage 启动报缺少 FUSE？**
镜像依赖 `libfuse.so.2`。若系统未装，用 `APPIMAGE_EXTRACT_AND_RUN=1 ./OpenChamber-*.AppImage` 解包运行。

**CLI 安装后命令找不到 / Node 版本不符？**
CLI/Web 与 VS Code 端要求 Node.js ≥ 22，且依赖本机 `opencode` CLI。先确认 `node -v`，再单独安装 OpenCode。

**`http-proxy` 出现 `util._extend` 弃用告警？**
仓库里 `fix-deprecation.js` 会在 `postinstall` 阶段把 `util._extend` 自动 patch 成 `Object.assign`，并兼容 bun 的 `.bun` 嵌套安装路径；若你用非 bun 安装环境，可手动跑一次该脚本。

**远程访问要不要开端口？**
不需要。用 Private Relay（一次性二维码 + 端到端加密）即可，也支持 LAN/VPN、Cloudflare/Ngrok 隧道与 SSH。公网暴露务必配合 `--ui-password`。

**局域网/公网访问安全吗？**
默认仅 localhost。启用 `--lan` 只在可信网络，且始终用 `--ui-password` 保护浏览器入口；自建反向代理参见官方 `REVERSE_PROXY.md`。

## 六、总结

OpenChamber 的价值不在于「又一个写代码的 Agent」，而在于它把 Agent 编程真正当成一件**有始有终的工程事务**来打磨：目标自动闭环、多模型对照融合、diff 可讲解、运行态可贴着看、GitHub 上下文贯通、跨设备续接、远程访问零端口。它基于成熟的 OpenCode，又补齐了工作流这一层，是「让 AI 写出能发版的东西」这条路上相当实用的一站式工作台。如果你已经在用 OpenCode 或正想把 Agent 编程纳入团队协作，值得一试。

- 项目地址：https://github.com/openchamber/openchamber
- 许可证：MIT
