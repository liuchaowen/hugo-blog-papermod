---
title: "Skills Manager：一个 App 统一管理 52 款 AI 编程助手的 Skills"
date: 2026-08-17
description: "Skills Manager 是一款用 Tauri 2 + React 19 + Rust 打造的桌面应用，把散落在 Claude Code、Cursor、Codex、OpenClaw 等 52 款 AI 编程工具里的 skills 收敛到一个统一中心库，支持市场安装、预设编排、多工具同步与 Git 备份多端同步。"
author: "Cheman"
slug: skills-manager
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 工具]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Skills Manager**——一个把 AI 编程助手的 skills 从"各自为政"收敛成"集中管理"的桌面应用。如果你同时在 Claude Code、Cursor、Codex、OpenClaw 里折腾 skills，这个小工具很可能就是根治混乱的那把钥匙。

## 一、项目概述

Skills Manager 的定位很清晰：**One app to manage AI agent skills across all your coding tools**（用一个应用管理所有编程工具里的 AI Agent skills）。随着 Claude Code、Cursor、Codex、Gemini CLI、OpenClaw 等 Agent 工具爆发式增长，每个工具都维护着自己独立的 `skills/` 目录，用户被迫在多个路径之间手动复制、同步、更新 skill，极易产生版本错乱和心智负担。

Skills Manager 的核心特性可以概括为以下几点：

- **统一技能库（Unified skill library）**：支持从 Git 仓库、本地文件夹、`.zip` / `.skill` 归档包，或直接对接 [skills.sh](https://skills.sh) 市场安装技能，全部汇聚到默认位于 `~/.skills-manager` 的中心仓库。
- **市场 + AI 搜索**：内置热门 skills 浏览、关键词搜索，并可用 API Key 开启 SkillsMP AI 语义搜索。
- **预设（Presets）**：把一组 skills 打包成命名预设，一键在当前 Agent 作用域内整体启停。
- **全局 / 项目 / 链接三类工作区**：分别管理"每个 Agent 的全局 skills""项目本地的 skills"以及"任意外接目录的 skills 根"。
- **多工具同步**：通过软链（symlink）或复制（copy）把 skill 一键同步到 52 款受支持工具。
- **备份与多端同步**：用 Git 仓库（推荐 GitHub 私有库）做版本化备份，多设备自动合并、互不冲突。

## 二、技术原理

### 架构分层

从 `README` 的技术栈表与源码可清晰看出，项目采用经典的 **Tauri 2 桌面壳 + Rust 后端 + React 前端** 架构：

| 层 | 技术 |
|----|------|
| 前端 | React 19、TypeScript、Vite、Tailwind CSS |
| 桌面壳 | Tauri 2 |
| 后端 | Rust |
| 存储 | SQLite（`rusqlite`） |
| 国际化 | react-i18next |

`package.json` 中 `version` 为 `1.34.2`，依赖里能看到 `@tauri-apps/api`、`@tauri-apps/plugin-opener`、`@tauri-apps/plugin-updater` 等 Tauri 官方插件，以及 `@dnd-kit/core`、`@hello-pangea/dnd` 负责库内的拖拽排序，`lucide-react` 提供图标，`react-markdown` + `remark-gfm` 用于 skills 预览渲染。

### 核心概念：四类工作区

理解 Skills Manager 的关键在于它的四个抽象：

- **Presets（预设）**：命名的 skill 集合，激活即把全部 skills 复制到选中的 agents；这是**一次性复制**而非实时同步。
- **Global Workspace（全局工作区）**：每个 Agent 拥有自己的全局 skills 目录（如 Claude Code 的 `~/.claude/skills/`），页面会列出该目录下的全部内容，**包括未经过 Skills Manager 安装的 skills**，保证视图与 Agent 真实所见一致。
- **Project Workspaces（项目工作区）**：管理项目内局部 skills（如 `<project>/.claude/skills/`），仅对该项目生效。
- **Tags（标签）**：用于分组与过滤，并支持 `Untagged` 过滤快速找出遗漏标签的 skills。

### 存储与同步引擎

SQLite 数据库（`rusqlite`）只保存**元数据**——skills、标签、预设、各 Agent 的启停开关。真正的 skill 文件才是同步的"真相来源"，数据库可在需要时从 skill 文件重建。这一点从 `README` 的"Disconnecting"与"备份"章节可以印证：备份进 Git 的是 skills 文件本身，数据库并不入库。

多端同步的合并策略是**skill 维度（per-skill）**而非逐行文本合并：A 机器重命名、B 机器改内容，二者能干净合并；若同一 skill 被两边同时编辑，其余 skills 照常同步，冲突的那一个保留本地版本并进入"Needs attention"，由用户选择 keep mine / use remote / keep both，且每次操作前都会打安全快照——做到了"冲突永不阻塞、永不静默覆盖"。

### Agent 友好的 CLI

仓库内置一个与桌面应用共用同一套 Rust 核心的 CLI，二者走同一个 SQLite 库、中心库与同步引擎。例如安装并部署到多个 Agent：

```bash
# 安装到中心库（默认仅入库，不同步到 Agent）
npm run cli -- skills install https://github.com/foo/bar.git

# 同时部署到 claude_code 与 codex 两个 Agent
npm run cli -- skills deploy <ref> --agent claude_code --agent codex
```

CLI 还支持 `skills search`（对接 skills.sh 市场，无需 API Key）、`skills update --all`、`presets deploy`、`git` 命令组等，方便脚本与 CI 调用，并带 `--json` 输出与 `--skills-root` 直接操作克隆/导出的 skills 仓库。

## 三、安装与快速开始

### 桌面应用

访问 [skillsmanager.dev](https://skillsmanager.dev) 下载对应平台的安装包（macOS 自 v1.29.0 起已用 Apple Developer ID 签名并公证，可正常打开；Windows 与 Linux 同样提供官方构建）。

### 从源码构建

```bash
# 前置：Node.js 18+ / Rust 工具链 / Tauri 系统级依赖
npm install
npm run tauri:dev      # 开发模式启动桌面应用
npm run tauri:build    # 打包桌面应用
npm run cli:build      # 构建 CLI
```

### 最简上手流程

1. 从本地文件夹、Git 仓库、归档包或市场安装 skills（有 SkillsMP API Key 可开启 AI 搜索）。
2. 侧边栏打开 **Global Workspace**，选择某个 Agent（如 Claude Code）。
3. 点击 **Preset** 胶囊整体激活，或点 **+ Add Skills** 从库里挑选并就地勾选目标 Agent。
4. 管理项目内 skills 时打开 **Project Workspace**，复用同样的预设逻辑。
5. 在 **Settings** 配置 Agent 路径、自定义工具、主题、语言、代理与 Git 偏好。
6. 需要历史或多机同步时，打开 **Backup**，点击 **Sign in with GitHub** 即可自动备份与跨端同步。

## 四、使用方法与实战

### 场景一：把一套前端 skills 同时铺到多个 Agent

```bash
# 先建立预设
npm run cli -- presets create "Web Dev" --description "Frontend work"

# 把 react-best-practices 加入预设（仅改组织，不动 Agent 文件）
npm run cli -- presets add-skill "Web Dev" vercel-labs/agent-skills@react-best-practices

# 一次性部署到 codex
npm run cli -- presets deploy "Web Dev" --agent codex
```

### 场景二：把已经散落在 `~/.claude/skills/` 的 skills 收编进中心库

```bash
npm run cli -- skills adopt ~/.claude/skills   # 先 dry-run 确认，再去掉 --dry-run 执行
```

"adopt" 不会移动文件，而是让 Skills Manager 接管既有目录，使其进入统一视图受管。

### 场景三：多机同步与冲突处理

在一台新机器首次启动、库为空时，会询问"全新开始 / 从备份恢复"。接入同一私有 Git 仓库后：本地改动在停止编辑约两分钟后后台自动 commit + push，其他设备的更新会自动合并回推；遇到真冲突时，卡片上会出现 **Needs attention** 徽标，点开即可三选一，且每次选择前都有安全快照可回退。

### 场景四：给自建工具接入管理

在 **Settings → Custom tools** 里添加带自定义 skills 目录的 Agent（或直接覆盖内置工具的默认路径），之后该工具的 skills 即可用完全相同的卡片、预设、同步逻辑来管理。已开箱支持 52 款 Agent，包括 Claude Code、Codex、Cursor、GitHub Copilot、Gemini CLI、OpenCode、OpenClaw、Cline、Roo Code、Kiro CLI、Qwen Code、Warp 等。

## 五、常见问题与解决方案

- **macOS 首次打开被杀：App can't be opened / "Apple could not verify..."**  
  v1.29.0 之后已签名公证不会再出现；若停留在 v1.28.5 及更早版本，升级即可。旧版在 macOS 15 上点 **Done** 后到 **系统设置 → 隐私与安全性 → 仍要打开**；更早版本可运行 `xattr -cr /Applications/skills-manager.app` 解决。升级到公证版本后 macOS 可能因签名变更重新询问读取 keychain，选 **Always Allow** 即可，之后更新不再询问。

- **CLI 与桌面应用并发使用状态不同步？**  
  二者共享同一 SQLite 库与仓库锁。CLI 改完元数据或部署后，若桌面应用当时处于挂起状态，手动触发一次刷新即可（文件监视器通常会在 CLI 变更后自动刷新）。

- **更新后某些路径丢失（held_back_removals）？**  
  CLI 的 `skills update` 是整文件夹替换：若新版缺少当前存在的某些路径，CLI 不会擅自删除，而是标记为 `held_back_removals` 交由人工确认，只有桌面应用才会继续推进。

- **超过 100MB 的 skills 无法备份？**  
  这是预期行为：大于 100MB 的 skills 自动留本地、不进备份，并在 Backup 页面标注，避免私有仓库被撑爆。

- **GitHub 登录与 Token 安全？**  
  登录采用 8 位设备流（device flow）为你在 GitHub 创建私有 `skills-manager-backup` 仓库；Token 仅存于系统钥匙串，绝不写入文件或仓库配置。不放心也可用 Settings 的 Git Sync Configuration 粘贴任意 Git URL（HTTPS+PAT / SSH / 自托管）。

## 六、总结

Skills Manager 解决的是 AI Agent 时代的"技能碎片化"痛点：它用一个 Tauri + Rust + React 的轻量桌面壳，把分散在数十款工具里的 skills 抽象成"中心库 + 预设 + 三类工作区"，再通过 per-skill 的 Git 合并引擎实现安全的多端同步。对重度使用多个编程 Agent、又苦于 skills 版本与同步混乱的开发者来说，它基本是即装即用的"整理中枢"；而对自动化场景，内置的 `--json` CLI 也足以接入脚本与流水线。项目采用 MIT 协议，源码开放，值得一试。

> 仓库地址：[github.com/xingkongliang/skills-manager](https://github.com/xingkongliang/skills-manager)　·　官网：[skillsmanager.dev](https://skillsmanager.dev)
