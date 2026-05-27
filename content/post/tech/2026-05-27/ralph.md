---
title: "Ralph：让 AI 编码工具自主循环跑完所有 PRD 任务的量产神器"
date: 2026-05-27T14:50:00+08:00
draft: false
tags: ["AI", "Agent", "Claude Code", "开源", "自动化"]
categories: ["技术博客", "AI工具"]
---

# Ralph：让 AI 编码工具自主循环跑完所有 PRD 任务的量产神器

## 一、项目概述

**Ralph**（https://github.com/snarktank/ralph）是一个开源的自主 AI Agent 循环工具，由 Ryan Carson 开发。它的核心思想是：**让 AI 编码工具（Amp 或 Claude Code）反复运行，直到所有 PRD（产品需求文档）条目全部完成**。

### 核心特性

- **自主循环**：AI 工具会反复执行，直到所有任务完成
- **新鲜上下文**：每次迭代都是全新的实例，避免上下文污染
- **记忆持久化**：通过 git 历史、`progress.txt` 和 `prd.json` 保持记忆
- **支持多工具**：Amp（默认）和 Claude Code 均支持
- **质量检查**：每次迭代后运行类型检查、测试等质量保证

## 二、技术原理

### 架构设计

Ralph 的核心是一个 bash 循环脚本（`ralph.sh`），它会：

1. 从 `prd.json` 中选取优先级最高且 `passes: false` 的 user story
2. 启动一个全新的 AI 实例（Amp 或 Claude Code）
3. AI 实现该 story
4. 运行质量检查（类型检查、测试）
5. 如果检查通过，提交代码，并将 `prd.json` 中该 story 标记为 `passes: true`
6. 将学习到的内容追加到 `progress.txt`
7. 重复上述步骤，直到所有 stories 都 `passes: true` 或达到最大迭代次数

### 关键技术点

#### 1. 每次迭代 = 新鲜上下文

这是 Ralph 最核心的设计思想。每个迭代启动一个**全新的 AI 实例**，只有以下记忆可以跨迭代保留：

- **Git 历史**：前序迭代的提交记录
- **`progress.txt`**：学习到的模式和注意事项
- **`prd.json`**：哪些 stories 已完成

这避免了单一上下文窗口被填满的问题，使得 Ralph 可以处理超过单个上下文窗口的大型功能。

#### 2. 小任务原则

每个 PRD 条目都应该足够小，能在一次上下文窗口内完成。如果任务太大，会导致：
- 上下文窗口被填满
- 生成的代码质量差
- 迭代失败

**合适的大小**：
- 添加一个数据库列和迁移
- 在现有页面添加 UI 组件
- 更新带有新逻辑的 server action
- 给列表添加过滤下拉框

**太大的任务（需要拆分）**：
- "构建整个仪表盘"
- "添加身份验证"
- "重构 API"

#### 3. AGENTS.md 更新至关重要

每次迭代后，Ralph 会更新相关的 `AGENTS.md` 文件。这很关键，因为：
- AI 编码工具会自动读取这些文件
- 未来的迭代（以及未来的人类开发者）会从发现的模式、陷阱和约定中受益

**应该添加到 AGENTS.md 的内容示例**：
- 发现的模式（"这个代码库对 Y 使用 X"）
- 陷阱（"更改 W 时不要忘记更新 Z"）
- 代码库的有用上下文（"设置面板在组件 X 中"）

#### 4. 反馈循环

Ralph 只有在存在反馈循环时才能工作：
- **类型检查**捕获类型错误
- **测试**验证行为
- **CI 必须保持绿色**（损坏的代码会在迭代间复合）

## 三、安装与快速开始

### 前提条件

- 安装并认证以下 AI 编码工具之一：
  - [Amp CLI](https://ampcode.com)（默认）
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- 安装 `jq` (`brew install jq` on macOS)
- 为你的项目准备一个 git 仓库

### 安装方式

#### 方式一：复制到你的项目

```bash
# 从你的项目根目录
mkdir -p scripts/ralph
cp /path/to/ralph/ralph.sh scripts/ralph/

# 为你选择的 AI 工具复制 prompt 模板：
cp /path/to/ralph/prompt.md scripts/ralph/prompt.md    # For Amp
# 或者
cp /path/to/ralph/CLAUDE.md scripts/ralph/CLAUDE.md    # For Claude Code

chmod +x scripts/ralph/ralph.sh
```

#### 方式二：全局安装技能（Amp）

```bash
cp -r skills/prd ~/.config/amp/skills/
cp -r skills/ralph ~/.config/amp/skills/
```

#### 方式三：作为 Claude Code Marketplace 使用

```bash
/plugin marketplace add snarktank/ralph
/plugin install ralph-skills@ralph-marketplace
```

安装后可用的技能：
- `/prd` - 生成产品需求文档
- `/ralph` - 将 PRD 转换为 prd.json 格式

## 四、使用方法与实战

### 完整工作流

#### 第 1 步：创建 PRD

```
Load the prd skill and create a PRD for [your feature description]
```

回答澄清问题。技能会将输出保存到 `tasks/prd-[feature-name].md`。

#### 第 2 步：将 PRD 转换为 Ralph 格式

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

这会创建 `prd.json`，其中包含为自主执行结构化的 user stories。

#### 第 3 步：运行 Ralph

```bash
# 使用 Amp（默认）
./scripts/ralph/ralph.sh [max_iterations]

# 使用 Claude Code
./scripts/ralph/ralph.sh --tool claude [max_iterations]
```

Ralph 会创建功能分支，选取最高优先级未完成的 story，实现它，运行质量检查，提交后更新 `prd.json`，并将学习到的内容追加到 `progress.txt`。循环直到所有 stories 通过或达到最大迭代次数。

### 配置 Amp 自动切换（推荐）

添加到 `~/.config/amp/settings.json`：

```json
{
  "amp.experimental.autoHandoff": { "context": 90 }
}
```

这会在上下文填满时启用自动切换，允许 Ralph 处理超过单个上下文窗口的大型 stories。

## 五、常见问题与解决方案

### 安装失败

**问题**：`jq` 未安装  
**解决**：`brew install jq` (macOS) 或 `apt-get install jq` (Ubuntu)

**问题**：AI 工具未认证  
**解决**：确保 Amp 或 Claude Code 已安装并认证

### 运行时错误

**问题**：迭代次数用尽但任务未完成  
**解决**：
- 将大任务拆分为更小的 stories
- 增加 `max_iterations` 参数
- 检查 `progress.txt` 看是否有学习到的模式

**问题**：代码损坏导致 CI 失败  
**解决**：
- 确保质量检查命令正确配置
- 检查 `AGENTS.md` 是否包含项目约定
- 手动修复损坏的代码，然后在 `prd.json` 中标记为 `passes: true`

### 兼容性

**问题**：与我的项目结构不兼容  
**解决**：
- 自定义 `prompt.md` 或 `CLAUDE.md` 以匹配你的项目约定
- 添加项目特定的质量检查命令
- 在 `AGENTS.md` 中包含代码库约定

## 六、总结

Ralph 是一个巧妙的工具，它解决了 AI 辅助编码的一个核心问题：**上下文窗口限制**。通过每次迭代使用全新的 AI 实例，并通过 git 历史、`progress.txt` 和 `prd.json` 保持记忆，Ralph 可以处理超过单个上下文窗口的大型功能。

### 适用场景

✅ **适合**：
- 有详细 PRD 的中型功能
- 可以拆分为小任务的复杂功能
- 需要多次迭代才能完成的任务

❌ **不适合**：
- 一次性小型修复（直接用 AI 工具即可）
- 没有清晰 PRD 的 exploratory 工作
- 需要人类创意或审美的设计工作

### 最佳实践

1. **写好 PRD**：详细的 PRD 是成功的关键
2. **拆分任务**：每个 story 应该足够小，能在一次上下文窗口内完成
3. **保持 CI 绿色**：损坏的代码会在迭代间复合
4. **更新 AGENTS.md**：将学习到的模式记录下来，帮助未来的迭代
5. **使用反馈循环**：类型检查、测试、浏览器验证都是宝贵的反馈

---

*稳定可靠低价的AI中转站：[X API](https://api.aiseo.one/register?channel=c_vazajkop)*
