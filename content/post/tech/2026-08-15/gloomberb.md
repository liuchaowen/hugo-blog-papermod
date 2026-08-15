---
title: "Gloomberb：开源全键盘驱动金融终端，一站式搞定投资研究"
date: "2026-08-15"
description: "Gloomberb 是一款开源键盘驱动金融终端，同时提供桌面应用和 TUI 界面，支持股票查询、图表分析、组合管理、宏观数据监控和 AI 筛选器，覆盖 macOS、Linux、Windows 全平台。"
author: "Cheman"
slug: gloomberb
draft: false
categories: ["技术", "开源"]
tags: ["终端", "金融", "开源", "TUI", "投资工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Gloomberb**，一款开源全键盘驱动金融终端，同时提供桌面应用和 TUI 界面，让投资者在终端里完成从股票研究到组合管理的全流程操作。

## 一、项目概述

Gloomberb 是一个跨平台开源金融终端项目，定位为 Bloomberg Terminal 的轻量开源替代品。项目采用 TypeScript/React 开发，同时提供两种使用方式：

- **桌面应用**：面向 macOS 和 Windows 的原生窗口应用，支持弹出窗格、OS 快捷键和自动更新
- **TUI（终端用户界面）**：面向 macOS、Linux、Windows 的终端界面，支持键盘快捷键工作流，适合 SSH 远程和脚本自动化场景

两者共享同一套命令语言、插件系统和数据层功能。

**核心功能一览：**

- 公司研究：行情报价、图表、财务报表、SEC 文件、机构持仓、内幕交易、期权数据、分析师评级
- 市场跟踪：热点新闻、板块行情、全球指数、外汇、恐惧贪婪指数、收益日历
- 组合管理：手动组合、电子表格导入、经纪商直连（IBKR）、价格预警、笔记
- AI 工具：AI 选股器、Gloom Cloud Chat
- 宏观数据：FRED 经济指标、收益率曲线、国会交易披露、Polymarket 预测市场
- 插件系统：一切皆为插件，支持从 GitHub 安装第三方插件

项目当前版本 0.10.4，代码完全开源，采用 MIT 许可证。

## 二、技术架构

### 2.1 技术栈与选型

从 `package.json` 可以看到项目核心依赖：

- **渲染层**：`react@19` + `react-dom@19`，使用 `@opentui/react` 提供跨平台 UI 组件
- **布局引擎**：基于 OpenTUI（见 `electrobun.config.ts` 中的 `defaultRenderer` 配置），支持 native（macOS）和 CEF（Windows）两种渲染模式
- **构建工具**：`electrobun`（自研构建工具，支持 macOS dmg 打包、Windows exe 安装包、自动签名公证）
- **数据层**：`rxjs` 处理响应式数据流，`typebox` 定义类型安全的 API schema
- **图表**：原生 Canvas 渲染（无外部图表库依赖），支持蜡烛图、线图、面积图、柱状图等
- **运行时**：Bun 作为首选运行时，同时兼容 Node.js

核心依赖亮点：

```json
"dependencies": {
  "@opentui/react": "^0.3.2",
  "web-tree-sitter": "0.25.10",
  "youtubei.js": "17.0.1",
  "hls.js": "1.6.13",
  "@earendil-works/pi-agent-core": "0.81.1",
  "@earendil-works/pi-ai": "0.81.1"
}
```

- `web-tree-sitter`：代码解析引擎，可用于语法高亮和代码分析
- `youtubei.js`：YouTube 数据提取（支持视频播放和数据抓取）
- `hls.js`：直播流媒体播放（用于 Bloomberg、CNBC 电视直播）
- `pi-agent-core/pi-ai`：AI Agent 能力，支撑 AI 选股和 Gloom Cloud Chat

### 2.2 插件系统架构

从 `electrobun.config.ts` 和代码结构来看，Gloomberb 的插件系统是其最具扩展性的设计。所有功能（行情、图表、组合、经纪商、AI 等）均以插件形式存在：

```typescript
const config: ElectrobunConfig = {
  app: {
    name: "Gloomberb",
    identifier: "com.vincelwt.gloomberb",
    version: pkg.version,
  },
  build: {
    bun: {
      entrypoint: "src/renderers/electrobun/bun/index.ts",
      sourcemap: "external",
    },
    mac: {
      codesign: true,      // macOS 代码签名
      notarize: true,      // Apple 公证
      createDmg: true,    // dmg 安装包
    },
    win: {
      bundleCEF: true,    // Windows 打包 Chromium Embedded Framework
      defaultRenderer: "cef",
    },
  },
  release: {
    baseUrl: "https://github.com/gloom-sh/gloomberb/releases/latest/download",
    generatePatch: true,
  },
};
```

插件通过 `gloomberb install <user/repo>` 命令直接从 GitHub 安装，通过 `gloomberb remove <name>` 移除，核心插件覆盖公司研究、市场概览、组合管理和 AI 四大领域。

### 2.3 国际化（i18n）设计

项目内置六种语言支持（英文、西班牙语、简体中文、繁体中文、日语、韩语），实现方式非常务实：

- **自动检测**：`LANG` / `LC_ALL` 环境变量自动匹配
- **即时切换**：在命令栏输入 `LANG zh-CN` 无需重启
- **优雅降级**：缺失翻译自动回退到英文，不影响界面显示
- **宽字符处理**：CJK 字符和 grapheme clusters 使用自定义 `format.ts` 模块按终端显示单元格宽度精确测量

翻译字典按原始英文 UI 文本为 key 存储在 `src/i18n` 目录，追加语言只需新增语言文件，无需改动核心代码。

## 三、安装与快速开始

### 3.1 macOS 安装（推荐桌面应用）

```bash
# 通过 Homebrew 安装桌面版
brew install --cask vincelwt/tap/gloomberb

# 或通过官方脚本安装
curl -fsSL gloomberb.com/install | bash
```

### 3.2 Linux TUI 安装

```bash
# 安装独立 TUI 二进制（无桌面依赖）
curl -fsSL gloomberb.com/install | bash
# 安装到 ~/.local/bin
```

### 3.3 Windows 安装

从 GitHub Releases 下载安装包：

```powershell
# 直接下载 exe 安装包
curl -fsSL https://github.com/gloom-sh/gloomberb/releases/latest/download/stable-win-x64-GloomberbSetup.exe
```

或在已有 Bun 环境时通过 npm 安装 TUI：

```powershell
bun install -g gloomberb
gloomberb
```

### 3.4 Bun 全局安装（任意平台）

```bash
bun install -g gloomberb
gloomberb
```

安装后运行 `gloomberb` 启动 TUI，`gloomberb launch-ui` 明确启动桌面 UI。

## 四、使用方法与实战

### 4.1 基础操作

进入应用后，按 `Ctrl+P` 打开命令模式，输入以下命令：

| 命令 | 功能 |
|------|------|
| `DES AAPL` | 苹果公司详细信息 |
| `GP NVDA` | 英伟达股价图表 |
| `TOP` | 市场热点新闻 |
| `HM` | 标的市场热力图 |
| `PF` | 组合和工作列表 |
| `KELLY AAPL` | Kelly 法则仓位计算 |

按 `` ` `` 可直接打开股票代码搜索，输入 `q` 退出。

### 4.2 图表作曲器

Gloomberb 的图表功能支持在同一视图中混合多个不同数据源的序列：

```
G AAPL:price, MSFT:revenue, FRED:CPIAUCSL
```

这行命令会在同一时间轴上叠加显示苹果股价、微软营收和 CPI 数据，完全不同的数据频率（股价日频 vs 财报季频 vs 宏观月频）通过 as-of 对齐自动处理。

支持的技术指标：成交量、SMA、EMA、布林带、RSI、MACD。

### 4.3 组合与持仓管理

```bash
gloomberb portfolio       # 管理本地组合
gloomberb broker ibkr    # 连接 IBKR 经纪商
gloomberb watchlist      # 管理关注列表
gloomberb alerts         # 设置价格预警
gloomberb notes          # 投资笔记
```

数据支持 `--json`、`--csv`、`--ndjson` 输出格式，方便对接自动化脚本或数据管道。

### 4.4 AI 筛选器

```bash
# 在命令模式中输入
AI <prompt>  # 例：AI 找出市盈率低于15的科技股
```

调用配置的 AI Provider 对市场数据进行语义化筛选，返回符合条件的标的列表。

## 五、常见问题与解决方案

### Q1: Linux 桌面应用无法运行？

当前 Linux 仅支持 TUI 终端模式，桌面应用尚未发布。推荐使用 `curl -fsSL gloomberb.com/install | bash` 安装 TUI，或在支持 Bun 的环境中通过 `bun install -g gloomberb` 安装。

### Q2: macOS 上 TUI 界面显示异常？

文档推荐使用 Kitty 兼容终端（Ghostty、Kitty、WezTerm）以获得最佳渲染效果，尤其是直播 TV 功能需要 `mpv` 并启用 Kitty video output。

### Q3: GitHub API 限流导致数据获取失败？

Gloomberb 支持配置 GitHub Personal Access Token 提升 API 限额。对于行情数据，可通过 `gloomberb provider status` 查看各数据 provider 状态。

### Q4: 命令输出格式？

默认输出人类可读格式。自动化场景下使用 `--json`/`--csv`/`--ndjson` 标志切换结构化输出。

### Q5: 中文界面支持？

支持。按 `Ctrl+P` 输入 `LANG zh-CN` 即可切换到简体中文，或设置 `GLOOMBERB_LANG=zh-CN` 环境变量。

## 六、总结

Gloomberb 是一款定位清晰的金融终端开源项目，它将 Bloomberg Terminal 的核心能力以轻量化的方式带入终端，同时通过插件系统和 AI 能力构建了可持续扩展的生态。对于习惯键盘操作、追求效率和透明度的投资者来说，它是一个非常值得关注的工具——完全开源、数据可控、跨平台统一体验。
