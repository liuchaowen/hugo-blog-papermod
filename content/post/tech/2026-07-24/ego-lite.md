---
title: "ego-lite：让你和 AI 代理并行浏览的智能浏览器"
date: 2026-07-24
description: "ego-lite 是一款专为人类与 AI 代理协同工作设计的 macOS 浏览器，突破性地实现了在同一浏览器内并行执行多个 AI 任务，同时不干扰用户的正常使用浏览体验。"
author: "Cheman"
slug: ego-lite
draft: false
categories: ["技术", "开源", "AI工具"]
tags: ["AI浏览器", "浏览器自动化", "开源", "macOS", "AI代理"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ego-lite**，它是一款专为人类与 AI 代理协同工作而设计的 macOS 浏览器，可以让用户和多个 AI 代理在同一浏览器中并行执行任务而互不干扰。

## 一、项目概述

ego-lite 由 [citrolabs](https://github.com/citrolabs) 开发，其核心理念是：现有浏览器自动化工具（如 browser-use、agent-browser）都需要一个"额外的"浏览器来驱动，登录状态迁移困难，用户和代理之间还会互相抢占标签页。ego-lite 从零设计为一颗"双人共享"的浏览器——无需额外配置，代理可以直接继承用户的真实登录状态和标签页。

**核心特性一览：**

- **并行 Spaces**：每个 AI 代理拥有完全隔离的独立 Space，可以同时运行多个任务而不互相冲突，用户的鼠标始终在用户自己手中
- **内核级页面快照**：通过内核级定制，提供市场上最高质量的页面 Snapshot，即使在复杂的嵌套 iframe 场景下也能可靠运行
- **ego-browser 技能层**：通过 `ego-browser` 将浏览器能力暴露为 JavaScript 函数（snapshot、fill、click、wait、navigate、capture），代理直接调用，复杂工作流/token 消耗大幅降低
- **Chrome 数据继承**：首次启动时支持一键迁移 Chrome 数据（登录信息、cookies、扩展、书签），AI 代理即刻拥有用户的工作环境
- **性能优势明显**：与 Vercel agent-browser 的对比基准测试显示，复杂任务快达 2.5 倍/token 消耗显著更少

## 二、技术原理

### 2.1 架构设计：Spaces 并行隔离

ego-lite 在同一浏览器进程中为每个代理分配独立的 **Space**，Space 之间完全隔离，共享底层渲染引擎但不共享 DOM 状态。这种设计让用户可以继续在前台正常使用浏览器，同时后台的多个代理在各自的 Space 中并行工作。

```
用户浏览器界面（前台）
├── 用户 Tabs ─────────── 你的标签页
└── Agent Spaces ───────── 代理的工作空间
    ├── Space 1 → Claude Code 助理
    ├── Space 2 → Codex 数据抓取
    └── Space N → 自定义任务...
```

### 2.2 ego-browser：JavaScript 函数调用模式

不同于传统的 CLI 调用方式（执行命令 → 读取输出 → 再执行命令），ego-lite 的 `ego-browser` 将浏览器能力封装为 JavaScript 函数，代理直接编写 JavaScript 片段调用这些工具，一次性在页面上执行完整的工作流。

```javascript
// ego-browser 示例：代理用 JavaScript 组合多步任务
const snapshot = await ego.snapshot(); // 获取高质量页面快照
const fillResult = await ego.fill('#search', 'keyword');
await ego.click('#submit');
await ego.wait(2000);
const result = await ego.snapshot(); // 完成后再次快照
```

这种"写代码驱动浏览器"的方式，减少了来回通信的开销，在复杂任务上提速最高达 2.5 倍。

### 2.3 内核级 Snapshot 机制

普通的浏览器自动化工具依赖 CDP（Chrome DevTools Protocol）来获取页面内容，但在嵌套 iframe、Shadow DOM 等复杂结构上容易失效。ego-lite 从渲染引擎内核层面定制 Snapshot 逻辑，确保在这些"其他工具容易卡住"的地方依然能获取完整准确的页面状态。

## 三、安装与快速开始

### 3.1 环境要求

- macOS（Apple Silicon 或 Intel）
- 首次启动需要网络连接以下载应用
- AI 代理需要支持调用 `ego-browser` 技能

### 3.2 安装步骤

**方式一：直接下载 macOS 应用（推荐）**

Apple Silicon：
```bash
# 点击下载或用浏览器打开链接
https://cdn.ego.app/channel/github_github_referral/setup/macos/arm64/egolite.dmg
```

Intel：
```bash
https://cdn.ego.app/channel/github_github_referral/setup/macos/x64/egolite.dmg
```

下载后打开 `.dmg` 文件并将应用拖入 Applications 即可完成安装。安装后会自动将 `ego-browser` 技能添加到系统技能目录。

**方式二：npx 快速安装（仅安装 ego-browser 技能）**

```bash
npx skills add citrolabs/ego-lite
```

首次运行任务时，代理会引导你完成 ego-lite 应用的安装。

### 3.3 Chrome 数据迁移

首次启动时，ego-lite 会询问是否迁移 Chrome 数据。如果选择"是"，以下数据会自动迁移：
- 登录信息与 cookies
- 已安装的扩展
- 书签

这意味着代理继承了你所有已登录的网站会话，无需重新认证。

### 3.4 最简运行示例

在支持 ego-browser 的 AI 代理 CLI 中，直接用自然语言描述任务：

```
ego-browser follow @ego_agent on x.com for me
```

代理会自动调用 `ego-browser` 技能，在独立的 Space 中完成任务，全程无需切换标签页或暂停你的工作。

## 四、使用方法与进阶技巧

### 4.1 基础用法：单任务自动化

```bash
ego-browser search "best open source AI tools 2024" on github.com
```

### 4.2 并行多任务：利用 Spaces

在同一个浏览器中并行执行多个任务：

```bash
# 启动三个并行 Space 任务
ego-browser "scrape pricing from competitor A"  # Space 1
ego-browser "scrape pricing from competitor B"  # Space 2  
ego-browser "scrape pricing from competitor C"  # Space 3
```

### 4.3 自定义 JavaScript 工具

代理可以编写自定义 JavaScript 来调用多个 ego 函数：

```javascript
// 批量操作示例
async function enrichLeads(leads) {
  const results = [];
  for (const lead of leads) {
    await ego.navigate(`https://${lead.website}`);
    await ego.wait(1000);
    const snap = await ego.snapshot();
    results.push({ ...lead, snapshot: snap });
  }
  return results;
}
```

### 4.4 接管与干预

用户可以随时接管任意一个正在运行的 Space：
- 查看 Space 状态
- 接管控制权手动操作
- 停止任务

## 五、常见问题与解决方案

### Q1: 安装后 ego-lite 无法启动？

**解决方案：**
1. 确认 macOS 版本（需要 macOS 11+）
2. 检查系统安全设置：系统偏好设置 → 安全性与隐私 → 允许 ego-lite
3. 尝试重新下载最新版本 `.dmg`

### Q2: ego-browser 技能未找到？

**解决方案：**
```bash
# 重新安装 ego-browser 技能
npx skills add citrolabs/ego-lite

# 或手动指定路径
ego-browser setup https://github.com/citrolabs/ego-lite
```

### Q3: 代理无法继承 Chrome 登录状态？

**解决方案：**
首次启动时确保选择"迁移 Chrome 数据"。如果已跳过，可以在设置中手动触发数据迁移：
- 打开 ego-lite 设置 → 数据 → 从 Chrome 导入

### Q4: 页面快照不完整（嵌套 iframe 丢失）？

这是普通浏览器自动化工具的常见问题，ego-lite 通过内核级定制解决了这一问题。如果仍有快照不完整的情况，可以在 GitHub Issues 中反馈具体网站地址。

### Q5: 多个 Space 任务之间数据是否共享？

不共享。每个 Space 有独立的浏览器上下文，cookies、localStorage 完全隔离。如果需要在任务之间共享数据，建议通过外部存储（如 JSON 文件）传递。

## 六、ego-lite vs 主流替代方案

| 能力对比 | ego-lite | Browser-Use | agent-browser (Vercel) | ChatGPT Atlas | Perplexity Comet |
|---|:---:|:---:|:---:|:---:|:---:|
| 多任务并行 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 可复用技能积累 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 继承 Chrome 数据 | ✅ | ❌ | ❌ | ✅ | ✅ |
| 独立工作空间 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 压缩语义输入 | ✅ | ❌ | ✅ | ❌ | ❌ |
| 外部代理可驱动 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 数据本地存储 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 零登录摩擦 | ✅ | ❌ | ❌ | ✅ | ✅ |
| 日常可用浏览器 | ✅ | ❌ | ❌ | ✅ | ✅ |
| 免费使用 | ✅ | ✅ | ✅ | ❌ | ❌ |

可以看到，ego-lite 是唯一同时具备"多任务并行"和"日常可用浏览器"特性的方案，且完全免费。

## 七、总结

ego-lite 解决了 AI 浏览器自动化领域的一个核心矛盾：用户需要一个"可以正常使用"的浏览器，而代理需要一个"可以代为操作"的浏览器。以往的工具只能二选一，或者勉强让两者共享同一个充满摩擦的环境。

ego-lite 的设计哲学是：**一个浏览器，两种体验**——前台是你熟悉的一切，后台是代理的并行工坊。如果你经常需要用 AI 代理处理网页任务，ego-lite 值得一试。

- GitHub 地址：[https://github.com/citrolabs/ego-lite](https://github.com/citrolabs/ego-lite)
- 官方文档：[https://lite.ego.app/document/](https://lite.ego.app/document/)
- Discord 社区：[https://discord.gg/5eGZVvHbTq](https://discord.gg/5eGZVvHbTq)
