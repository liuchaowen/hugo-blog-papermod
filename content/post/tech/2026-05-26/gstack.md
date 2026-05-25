---
title: "gstack：Garry Tan 的 AI 驱动工程团队工作流"
date: 2026-05-26
draft: false
categories: [AI 编程, 开源工具]
tags: [AI, Claude, GitHub, YC, 生产力, 开源]
description: "深入解析 Garry Tan 的 gstack 项目——如何通过 23 个专业角色和 8 个强力工具，将 Claude Code 转变为虚拟工程团队，实现单人 810 倍生产力提升。"
author: "Cheman"
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

## 一、项目概述

**gstack** 是 Y Combinator CEO Garry Tan 开源的 AI 编程工作流系统。它不是一个简单的工具集合，而是一套完整的"AI 工程团队"方法论——将 Claude Code 转变为包含 23 个专业角色和 8 个强力工具的虚拟工程团队。

### 核心问题

Andrej Karpathy 在 2026 年 3 月提到："我从去年 12 月开始基本没写过一行代码。"这引发了一个问题：**一个人如何以 20 人的团队速度交付？**

Garry Tan 的答案是：**正确的工具链**。他使用 AI Agent，在过去 60 天内交付了 3 个生产级服务、40+ 功能特性（兼职工作，同时全职运营 YC）。按逻辑代码变更（排除 AI 膨胀的代码行）计算，他的 2026 年交付速度是 2013 年的 **~810 倍**（11,417 vs 14 逻辑行/天）。

### 核心特性

- **23 个专业角色**：从 CEO、工程师、设计师到 QA、安全官、发布工程师
- **完整的冲刺流程**：Think → Plan → Build → Review → Test → Ship → Reflect
- **跨 Agent 支持**：不仅支持 Claude Code，还支持 Codex、Cursor、OpenCode 等 10 种 AI 编程工具
- **真实的浏览器**：通过 CDP 协议控制 Chromium，实现真正的 E2E 测试
- **持久化记忆**：通过 GBrain 实现跨会话的知识积累

## 二、技术原理

### 架构设计

gstack 采用 **技能栈（Skill Stack）** 架构，每个技能对应一个专业角色：

```
office-hours (YC Office Hours)
    ↓ 输出设计文档
plan-ceo-review (CEO/Founder)
    ↓ 战略挑战
plan-eng-review (Eng Manager)
    ↓ 架构锁定
build (Implementation)
    ↓ 代码实现
review (Staff Engineer)
    ↓ 代码审查
qa (QA Lead)
    ↓ 浏览器测试
ship (Release Engineer)
    ↓ 发布
retro (Eng Manager)
    ↓ 复盘
```

每个技能读取前一个技能的输出，形成 **流水线式的工作流**。例如：
- `/office-hours` 生成的设计文档会被 `/plan-ceo-review` 自动读取
- `/plan-eng-review` 生成的测试计划会被 `/qa` 自动获取
- `/review` 发现的 bug 会被 `/ship` 验证是否已修复

### 核心技术栈

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **Bun** | 运行时 + 包管理器 | 快速启动、内置 TypeScript 支持 |
| **Playwright** | 浏览器自动化 | 稳定的 CDP 协议实现 |
| **Chrome DevTools Protocol** | 浏览器控制 | 真实浏览器环境，支持反爬虫 |
| **Puppeteer Core** | 备选浏览器控制 | 兼容性备选方案 |
| **Hugging Face Transformers** | 本地 ML 模型 | Prompt 注入检测 |

### 关键设计模式

#### 1. **域名技能系统（Domain Skills）**

gstack 引入了"域名技能"概念：Agent 在访问特定网站时，会自动加载该网站的注意事项。

```bash
$B domain-skill save
# 保存：LinkedIn 的 Apply 按钮在 iframe 中
# 下次访问 LinkedIn 时自动应用
```

实现机制：
- 技能存储在 per-project 的 learnings 文件中
- 经过 3 次成功使用后会提升为 active 状态
- 可通过 `$B domain-skill promote-to-global` 提升为全局技能

#### 2. **原始 CDP 逃逸舱（Raw CDP Escape Hatch）**

对于精选命令未覆盖的边缘情况，gstack 提供了原始 CDP 访问：

```bash
$B cdp <Domain.method>
# 例如：$B cdp Runtime.evaluate
```

安全机制：
- 默认拒绝模式（deny-default）
- 方法必须显式添加到 `browse/src/cdp-allowlist.ts`
- 两层互斥锁（two-tier mutex）序列化浏览器范围内的 CDP 调用
- 数据渗透方法的输出包裹在 UNTRUSTED 信封中

#### 3. **连续检查点模式（Continuous Checkpoint Mode）**

设置 `gstack-config set checkpoint_mode continuous` 后，技能会在工作过程中自动提交，提交信息包含：
- `WIP:` 前缀
- 结构化 `[gstack-context]` 主体（决策、剩余工作、失败尝试）

恢复机制：
- `/context-restore` 读取这些提交来重建会话状态
- `/ship` 在 PR 前会 filter-squash WIP 提交（保留非 WIP 提交）

### 数据流分析

以"构建每日简报应用"为例：

```
用户输入："我想构建一个日历每日简报应用"
  ↓
/office-hours
  - 追问具体痛点（不是假设）
  - 挑战用户的问题框架
  - 提取 5 个用户未意识到的能力
  - 生成 3 种实现方案 + 工作量估算
  ↓ 输出：设计文档
/plan-ceo-review
  - 读取设计文档
  - 挑战范围（4 种模式：扩展/选择性扩展/保持范围/缩减）
  ↓ 输出：CEO 审查报告
/plan-eng-review
  - ASCII 图表（数据流、状态机、错误路径）
  - 测试矩阵、失败模式、安全考虑
  ↓ 输出：工程计划
用户批准计划，退出计划模式
  ↓
实现（~8 分钟，2,400 行代码，11 个文件）
  ↓
/review
  - [自动修复] 2 个问题
  - [询问] 竞态条件 → 用户批准修复
  ↓
/qa https://staging.myapp.com
  - 打开真实浏览器
  - 点击流程，发现并修复 bug
  ↓
/ship
  - 同步 main
  - 运行测试
  - 审计覆盖率
  - 推送，打开 PR
```

## 三、安装与快速开始

### 环境要求

- **Claude Code**（必需）
- **Git**（必需）
- **Bun** v1.0+（必需，用于运行时）
- **Node.js**（Windows 必需，Bun 在 Windows 上有 Playwright pipe transport bug）

### 安装步骤

#### 方式 1：快速安装（推荐）

打开 Claude Code，粘贴以下内容：

```
Install gstack: run `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` then add a "gstack" section to CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp__claude-in-chrome__* tools, and lists the available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /setup-gbrain, /retro, /investigate, /document-release, /document-generate, /codex, /cso, /autoplan, /plan-devex-review, /devex-review, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn. Then ask the user if they also want to add gstack to the current project so teammates get it.
```

Claude 会自动完成所有配置。

#### 方式 2：团队模式（推荐用于共享仓库）

在仓库内运行：

```bash
(cd ~/.claude/skills/gstack && ./setup --team) && ~/.claude/skills/gstack/bin/gstack-team-init required && git add .claude/ CLAUDE.md && git commit -m "require gstack for AI-assisted work"
```

优势：
- 无 vendored 文件
- 无版本漂移
- 无手动升级
- 每次 Claude Code 会话启动时自动检查更新（限流至 1 次/小时，网络故障安全，完全静默）

#### 方式 3：其他 AI Agent

gstack 支持 10 种 AI 编程工具：

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/gstack
cd ~/gstack && ./setup
```

或指定 Agent：

```bash
./setup --host codex    # OpenAI Codex CLI
./setup --host cursor    # Cursor
./setup --host opencode  # OpenCode
./setup --host factory   # Factory Droid
```

### 最简运行示例

安装完成后，运行以下命令体验完整流程：

```
/office-hours
# 描述你要构建的产品

/plan-ceo-review
# 对功能想法进行 CEO 审查

/review
# 审查任何有变更的分支

/qa
# 对 staging URL 进行 QA 测试
```

## 四、使用方法与实战

### 基础用法

#### 1. **产品探索：/office-hours**

这是起点。6 个强制问题会重新框架你的产品，然后再写代码。

```
你：我想构建一个日历每日简报应用。
Claude：[询问具体痛点——不是假设的例子]

你：多个 Google 日历，事件信息过时，位置错误。准备工作耗时太久，结果不够好...

Claude：我要挑战这个问题的框架。你说"每日简报应用"，但你实际描述的是一个个人首席助理 AI。
[提取 5 个你未意识到的能力]
[挑战 4 个前提——你同意、不同意或调整]
[生成 3 种实现方案 + 工作量估算]
建议：明天交付最窄的楔子，从真实使用中学习。完整愿景是 3 个月的项目——从真正可用的每日简报开始。
[写入设计文档 → 自动供下游技能使用]
```

#### 2. **计划审查：/plan-ceo-review**

读取设计文档，挑战范围，运行 10 节审查。

四种模式：
- **Expansion**：扩展范围，探索 10 星产品
- **Selective Expansion**：选择性扩展
- **Hold Scope**：保持范围
- **Reduction**：缩减范围

#### 3. **工程审查：/plan-eng-review**

锁定架构、数据流、图表、边界情况和测试。强制将隐藏的假设公开。

输出包含：
- ASCII 图表（数据流、状态机、错误路径）
- 测试矩阵
- 失败模式
- 安全考虑

#### 4. **代码审查：/review**

发现通过 CI 但在生产环境中爆炸的 bug。

```
/review
[自动修复] 2 个问题。
[询问] 竞态条件 → 你批准修复。
```

#### 5. **QA 测试：/qa**

测试你的应用，发现 bug，用原子提交修复，重新验证。

```
/qa https://staging.myapp.com
[打开真实浏览器]
[点击流程]
[发现并修复 bug]
[自动生成回归测试]
```

#### 6. **发布：/ship**

同步 main，运行测试，审计覆盖率，推送，打开 PR。

```
/ship
Tests: 42 → 51 (+9 新测试)
PR: github.com/you/app/pull/42
```

### 进阶用法

#### 1. **设计探索：/design-shotgun**

"展示选项。"生成 4-6 个 AI 模型变体，在浏览器中打开比较板，收集你的反馈，迭代。

品味记忆（Taste Memory）会在几轮后启动，开始偏向你实际选择的内容。

#### 2. **生产 HTML：/design-html**

将模型（来自 `/design-shotgun`、CEO 计划、设计审查或只是描述）转换为生产质量的 HTML/CSS。

特性：
- 使用 Pretext 进行计算文本布局
- 文本在调整大小时实际重排
- 高度根据内容调整
- 布局是动态的
- 30KB 开销，零依赖
- 检测你的框架（React、Svelte、Vue）并输出正确格式

#### 3. **安全审计：/cso**

OWASP Top 10 + STRIDE 威胁模型。

零噪声：
- 17 个误报排除
- 8/10+ 置信度门控
- 独立发现验证
- 每个发现包含具体的利用场景

#### 4. **多 Agent 协调：/pair-agent**

与任何 AI Agent 共享你的浏览器。

```bash
/pair-agent
# 选择你的 Agent
# GStack Browser 窗口打开
# 打印指令块
# 粘贴到另一个 Agent 的聊天中
```

安全特性：
- 作用域令牌
- 标签页隔离
- 速率限制
- 活动归因

#### 5. **持久化记忆：GBrain**

GBrain 是 AI Agent 的持久化知识库。

```bash
/setup-gbrain
```

四种路径：
1. **Supabase，现有 URL**——你的云 Agent 已配置 brain
2. **Supabase，自动配置**——粘贴 Supabase Personal Access Token
3. **PGLite 本地**——零账户，零网络，~30 秒
4. **远程 gbrain MCP**——brain 在另一台机器上运行

### 实际项目示例

#### 示例 1：构建通知功能

```
你：构建一个通知功能。
Claude：加载 gstack。运行 /autoplan。

[/autoplan 自动运行]
[office-hours → plan-ceo-review → plan-eng-review]
[输出完整计划]

你：批准计划。实施。
Claude：[实现计划] [运行 /ship]
```

#### 示例 2：安全审计

```
你：对这个仓库运行安全审计。
Claude：加载 gstack。运行 /cso。

[/cso 运行 OWASP Top 10 + STRIDE]
[输出威胁模型]
[每个发现包含利用场景]
```

#### 示例 3：调试生产问题

```
你：生产环境出现异常行为。
Claude：加载 gstack。运行 /investigate。

[/investigate 系统根源调试]
[铁律：没有调查就没有修复]
[追踪数据流]
[测试假设]
[3 次失败修复后停止]
```

## 五、常见问题与解决方案

### 安装失败

#### 问题：技能未显示

**原因**：CLAUDE.md 中缺少 gstack 部分。

**解决方案**：手动添加到项目的 CLAUDE.md：

```markdown
## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /browse, /open-gstack-browser, /qa, /qa-only, /design-review,
/setup-browser-cookies, /setup-deploy, /setup-gbrain, /sync-gbrain, /retro, /investigate,
/document-release, /document-generate, /codex, /cso, /autoplan, /pair-agent, /careful, /freeze,
/guard, /unfreeze, /gstack-upgrade, /learn.
```

#### 问题：Windows 上使用问题

**原因**：Bun 在 Windows 上有 Playwright pipe transport bug。

**解决方案**：
1. 安装 Node.js（除了 Bun）
2. 确保 `bun` 和 `node` 都在 PATH 中
3. 浏览服务器会自动回退到 Node.js

#### 问题：Codex 说"Skipped loading skill(s) due to invalid SKILL.md"

**原因**：Codex 技能描述过时。

**解决方案**：

```bash
cd ~/.codex/skills/gstack && git pull && ./setup --host codex
# 或对于 repo-local 安装：
cd "$(readlink -f .agents/skills/gstack)" && git pull && ./setup --host codex
```

### 运行时错误

#### 问题：/browse 失败

**原因**：依赖未安装或构建未运行。

**解决方案**：

```bash
cd ~/.claude/skills/gstack && bun install && bun run build
```

#### 问题：Stale install

**原因**：gstack 仓库过时。

**解决方案**：

```bash
/gstack-upgrade
# 或在 ~/.gstack/config.yaml 中设置 auto_upgrade: true
```

#### 问题：Claude 说它看不到技能

**原因**：项目的 CLAUDE.md 缺少 gstack 部分。

**解决方案**：确保 CLAUDE.md 有 gstack 部分（见上面的"技能未显示"解决方案）。

### 性能问题

#### 问题：浏览器自动化慢

**原因**：默认配置可能不是最优的。

**解决方案**：
1. 使用 GStack Browser（`/open-gstack-browser`）获得更快的性能
2. 确保使用 Bun 而不是 Node.js（除非在 Windows 上）
3. 检查网络连接（ngrok 隧道可能引入延迟）

#### 问题：Git 操作慢

**原因**：大文件或网络延迟。

**解决方案**：
1. 使用 SSH 而不是 HTTPS 进行 Git 操作
2. 配置 Git 代理（如果在企业网络中）
3. 使用 `git gc` 清理本地仓库

### 兼容性问题

#### 问题：与其他技能包冲突

**原因**：命令名称冲突。

**解决方案**：

```bash
cd ~/.claude/skills/gstack && ./setup --prefix
# 从 /qa 切换到 /gstack-qa
```

#### 问题：Claude Code 版本不兼容

**原因**：gstack 需要特定版本的 Claude Code。

**解决方案**：
1. 更新 Claude Code 到最新版本
2. 检查 gstack 的 package.json 中的 engines 字段
3. 如果需要，降级 gstack 到兼容版本

## 六、总结

gstack 不仅仅是一个工具集合，它是一套完整的 **AI 驱动的工程方法论**。通过将专业角色、强制流程和安全机制结合在一起，gstack 让单个开发者能够以团队的速度交付生产级软件。

### 核心价值

1. **生产力提升**：Garry Tan 的案例显示，合理使用 AI 工具可以实现 810 倍的生产力提升（按逻辑代码变更计算）。

2. **流程保障**：从 Think → Plan → Build → Review → Test → Ship → Reflect 的完整流程，确保每个环节都有专业角色把关。

3. **跨工具兼容**：不仅支持 Claude Code，还支持 10 种主流 AI 编程工具，真正的工具无关。

4. **安全第一**：内置 OWASP Top 10 + STRIDE 威胁模型、Prompt 注入检测、原始 CDP 访问控制等安全机制。

5. **持久化记忆**：通过 GBrain 实现跨会话的知识积累，让 Agent 越来越了解你的项目。

### 适用人群

- **创始人和 CEO**——尤其是仍想交付代码的技术创始人
- **首次使用 Claude Code 的用户**——结构化的角色而不是空白提示
- **技术主管和资深工程师**——每个 PR 的严格审查、QA 和发布自动化

### 未来展望

随着 AI Agent 能力的不断提升，gstack 所代表的"AI 工程团队"模式将会越来越成熟。我们可以期待：

1. **更多的专业角色**：随着 AI 能力的提升，会有更多细分的专业角色加入。
2. **更好的协作机制**：多 Agent 协调、跨会话记忆共享等能力会不断增强。
3. **更深的项目理解**：通过 GBrain 等工具，Agent 会越来越了解项目的上下文和历史。
4. **更广的工具支持**：会有更多的 AI 编程工具被集成到 gstack 生态中。

gstack 是一个活生生的证明：**AI 不是取代开发者，而是让开发者变得更强大**。通过这个开源项目，Garry Tan 不仅分享了他的工作流，更为整个行业展示了"AI 原生软件开发"的未来形态。

---

**项目链接**：
- GitHub：https://github.com/garrytan/gstack
- 文档：https://github.com/garrytan/gstack/tree/main/docs
- 许可证：MIT（免费，永久免费）

**引用**：
> "The difference isn't who typed it, it's what shipped." —— Garry Tan

这句话完美地总结了 gstack 的哲学：**重要的不是谁写的代码，而是交付了什么**。在 AI 时代，开发者应该从"代码实现者"转变为"产品交付者"，而 gstack 正是实现这一转变的强大工具。
