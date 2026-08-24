---
title: "Mercury Agent Skills：为AI智能体打造的开源技能库"
date: 2026-08-24
description: "Mercury Agent Skills 是一个开源的 AI 智能体技能库，包含 132 个经过精心策划的 SKILL.md 配置文件，覆盖开发、AI/ML、后端、前端、DevOps 等 23 个类别，兼容所有主流 Agent 运行时。"
author: "Cheman"
slug: mercury-agent-skills
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI", "Agent", "技能库", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Mercury Agent Skills**，一个专为 AI 智能体设计的开源技能库，提供 132 个即插即用的 SKILL.md 配置文件，让你的 AI 助手瞬间获得专业能力。

## 一、项目概述

Mercury Agent Skills 是由 Cosmic Stack Labs 维护的开源项目，旨在解决 AI Agent 能力碎片化的问题。它提供了一个统一的技能描述格式（`SKILL.md`），使得同一个技能文件可以在不同的 Agent 运行时之间无缝迁移。

**核心价值：**

- **统一格式**：一个 `SKILL.md` 文件兼容所有主流 Agent（Mercury、Claude Code、Codex CLI、OpenClaw、Hermes、Cursor、Gemini CLI）
- **精心策划**：132 个技能全部手工编写，基于真实工作流，拒绝 AI 生成的重复内容
- **易于发现**：提供 Web 界面 [skills.mercuryagent.sh](https://skills.mercuryagent.sh)，支持全文搜索、分类浏览、热度排行榜
- **一键安装**：通过 CLI 命令快速安装，支持原子写入、版本锁定、失败回滚

**技能覆盖领域：**

| 类别 | 技能数 | 内容概览 |
|------|--------|----------|
| Development | 16 | Clean code、代码审查、调试、测试、架构决策记录 |
| AI & ML | 11 | Prompt 工程、Agent 健康、记忆、委托、Token 预算 |
| Backend | 9 | API 设计、Node.js、Python、数据库、微服务 |
| Frontend | 8 | React、Next.js、Tailwind、状态管理、性能优化 |
| DevOps | 7 | Docker、CI/CD、Kubernetes、Terraform、监控 |
| Automation | 11 | 截图、工作流、Shell 脚本、Web 爬虫、Twitter 自动化 |
| Media Download | 6 | yt-dlp 封装、音频提取、批量下载、平台适配 |

## 二、技术原理

### 2.1 技能文件结构

每个技能都是一个独立的 `SKILL.md` 文件，采用 YAML frontmatter + Markdown 正文格式：

```yaml
---
name: skill-name
description: 'What this skill does and when to use it'
metadata:
  author: cosmicstack-labs
  version: 1.0.0
  category: development
  tags: [clean-code, refactoring, best-practices]
---

# Skill Name

Full instructions, frameworks, scoring rubrics, and actionable guidance.
```

**设计理念：**

- **极简主义**：单个 Markdown 文件，无需额外依赖或构建工具
- **自描述**：YAML frontmatter 提供元数据，正文提供完整指令
- **可移植**：任何能解析 Markdown 的 Agent 都能读取技能定义

### 2.2 安装机制

通过 Mercury CLI 安装技能时，系统会执行以下步骤：

```bash
# 列出可用技能
mercury skills search "react patterns"

# 安装单个技能
mercury skills install frontend/react-patterns

# 批量安装
mercury skills install ai-ml/prompt-engineering devops/docker security/threat-modeling
```

安装后的文件会被写入 Agent 的技能目录：

| Agent | 技能目录路径 |
|-------|-------------|
| Mercury | `~/.mercury/skills/` |
| Claude Code | `.claude/skills/` |
| Codex CLI | `.codex/skills/` |
| OpenClaw | `.openclaw/skills/` |
| Hermes | `.hermes/skills/` |
| Cursor | `.cursor/skills/` |

### 2.3 Web 注册表架构

[skills.mercuryagent.sh](https://skills.mercuryagent.sh) 提供了完整的 Web 界面和 API：

- **前端**：Next.js 应用，支持全文搜索、分类过滤、热度排序
- **API**：公开 JSON Feed（`/api/feed.json`）和单个技能详情（`/api/skills/<category>/<slug>`）
- **自动化同步**：每小时从 GitHub 仓库拉取最新内容，无需手动更新

### 2.4 贡献流程

项目采用 PR 驱动的内容更新机制：

1. 作者按照 [CONTRIBUTING.md](./CONTRIBUTING.md) 标准编写技能
2. 提交 Pull Request 到主仓库
3. 合并后一小时内自动同步到 Web 注册表

## 三、安装与快速开始

### 3.1 环境要求

- Node.js >= 16.0.0
- 支持 `SKILL.md` 格式的 Agent 运行时（Mercury、Claude Code 等）

### 3.2 安装 Mercury Agent（推荐）

```bash
# 全局安装 Mercury Agent
npm install -g @cosmicstack/mercury-agent

# 搜索技能
mercury skills search "prompt engineering"

# 安装技能
mercury skills install ai-ml/prompt-engineering

# 查看已安装技能
mercury skills list
```

### 3.3 其他 Agent 安装方式

**Claude Code：**

```bash
# 克隆仓库
git clone https://github.com/cosmicstack-labs/mercury-agent-skills.git

# 复制技能到 Claude Code 目录
cp -r mercury-agent-skills/categories/ai-ml/prompt-engineering .claude/skills/
```

**OpenClaw：**

```bash
# 复制到 OpenClaw 技能目录
cp -r mercury-agent-skills/categories/ai-ml/prompt-engineering ~/.openclaw/skills/
```

## 四、使用方法与实战

### 4.1 基础用法：安装单个技能

假设你正在开发一个需要处理用户认证的 Node.js 后端服务：

```bash
# 搜索认证相关技能
mercury skills search "auth"

# 安装认证技能
mercury skills install backend/auth

# Mercury Agent 会自动加载该技能
# 在对话中直接引用："请按照 auth 技能帮我设计用户认证系统"
```

### 4.2 进阶用法：批量安装技能组合

为全栈开发项目安装推荐的技能集：

```bash
# 安装开发流程全链路技能
mercury skills install \
  development/clean-code \
  development/code-review \
  development/testing \
  backend/nodejs \
  frontend/react \
  devops/docker
```

### 4.3 实际项目示例：AI Agent 开发

在构建一个具备记忆和委托能力的 AI Agent 时：

```bash
# 安装 AI/ML 相关技能
mercury skills install \
  ai-ml/prompt-engineering \
  ai-ml/agent-health \
  ai-ml/memory \
  ai-ml/delegation

# 查看技能内容
cat ~/.mercury/skills/ai-ml/memory/SKILL.md
```

技能文件会指导 Agent 如何：
- 设计持久化记忆架构
- 实现上下文窗口管理
- 处理跨会话信息检索
- 优化 Token 使用效率

## 五、常见问题与解决方案

### 5.1 安装失败：网络超时

**问题：** `mercury skills install` 命令卡住或报网络错误。

**解决方案：**

```bash
# 方案 1：使用代理
export HTTP_PROXY=http://localhost:7890
export HTTPS_PROXY=http://localhost:7890
mercury skills install ai-ml/prompt-engineering

# 方案 2：直接克隆仓库
git clone https://github.com/cosmicstack-labs/mercury-agent-skills.git
cp -r mercury-agent-skills/categories/ai-ml/prompt-engineering ~/.mercury/skills/
```

### 5.2 技能未生效

**问题：** 安装技能后，Agent 行为没有变化。

**排查步骤：**

1. **检查文件路径**：确认技能文件在正确目录下
   ```bash
   ls ~/.mercury/skills/ai-ml/prompt-engineering/SKILL.md
   ```

2. **重启 Agent**：某些 Agent 需要重启才能重新加载技能
   ```bash
   mercury restart
   ```

3. **验证文件格式**：检查 `SKILL.md` 是否包含有效的 YAML frontmatter
   ```bash
   head -n 10 ~/.mercury/skills/ai-ml/prompt-engineering/SKILL.md
   ```

### 5.3 技能冲突

**问题：** 多个技能对同一任务给出不同指令。

**解决方案：**

- Mercury Agent 按照技能加载顺序应用，后加载的技能优先级更高
- 使用显式引用：在对话中明确指定使用哪个技能（"请按照 auth 技能..."）
- 检查技能元数据中的 `tags` 和 `description`，避免功能重叠

### 5.4 自定义技能

**问题：** 现有技能不满足需求，如何创建自定义技能？

**步骤：**

1. 参考现有技能的格式：
   ```bash
   cat ~/.mercury/skills/development/clean-code/SKILL.md
   ```

2. 创建新技能文件：
   ```bash
   mkdir -p ~/.mercury/skills/custom/my-skill
   nano ~/.mercury/skills/custom/my-skill/SKILL.md
   ```

3. 按照 [CONTRIBUTING.md](https://github.com/cosmicstack-labs/mercury-agent-skills/blob/main/CONTRIBUTING.md) 标准编写

4. 贡献回社区：提交 PR 到主仓库

## 六、总结

Mercury Agent Skills 项目的核心贡献在于**统一了 AI Agent 的技能描述格式**，打破了不同 Agent 运行时之间的壁垒。无论是 Mercury、Claude Code、OpenClaw 还是其他 Agent，都可以通过读取同一个 `SKILL.md` 文件获得专业能力。

对于开发者而言，这意味着：
- **一次编写，处处可用**：技能文件可以在不同项目、不同团队、不同 Agent 间复用
- **快速迭代**：通过 Web 注册表发现新技能，通过 CLI 一键安装
- **社区驱动**：贡献技能，参与生态建设

对于企业用户而言：
- **标准化**：统一的技能格式降低了团队协作和知识沉淀成本
- **可控性**：可以 fork 仓库，在内网搭建私有注册表
- **审计友好**：每个技能都是纯文本 Markdown，便于审查和版本控制

项目地址：[github.com/cosmicstack-labs/mercury-agent-skills](https://github.com/cosmicstack-labs/mercury-agent-skills)

技能浏览：[skills.mercuryagent.sh](https://skills.mercuryagent.sh)

Mercury Agent：[mercuryagent.sh](https://mercuryagent.sh)
