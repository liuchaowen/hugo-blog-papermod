---
title: "AG Kit：为 AI Agent 工程化而生的 Antigravity 开发工具包"
date: "2026-07-27"
description: "AG Kit 是一个以 Google Antigravity 为核心运行时的 AI Agent 工程化工具包，提供了规则、技能、专家 Agent、工作流、持久化记忆、MCP 集成、原生安全钩子等一站式解决方案。"
author: "Cheman"
slug: ag-kit
draft: false
categories: ["技术", "开源", "AI"]
tags: ["AI", "Agent", "Antigravity", "GitHub Trending", "工程化"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**AG Kit**，它是一个以 Google Antigravity 为核心运行时的 AI Agent 工程化工具包，将 AI Agent 的开发从「调 prompt 碰运气」推进到「工程化管理」的新阶段。

## 一、项目概述

AG Kit 的核心目标是为 AI Agent 的开发、协作、安全和部署提供一套完整的工程化基础设施。它不是另一个 LLM API 封装库，而是一套面向团队协作的 Agent 开发框架。

项目的主要特性包括：

- **20 个专家 Agent 角色**：内置了涵盖规划、编码、调试、部署等场景的专家角色定义，通过智能路由分发任务
- **47 个技能模块**：渐进式的领域知识库和可执行验证助手，覆盖从开发到生产的全流程
- **13 个可复用工作流**：通过 slash command（如 `/plan`、`/orchestrate`、`/deploy`）驱动标准化操作流程
- **6 条全局规则**：涵盖路由、安全、设计和编码约束的规则引擎
- **持久化记忆系统**：`.agents/memory/` 目录存储项目规范、决策历史和偏好设置，解决长对话上下文丢失问题
- **MCP 集成**：Model Context Protocol 的完整实现，支持工作区配置和显式备份同步
- **原生安全钩子**：通过 `PreToolUse` 拦截高危命令，防止误删系统关键文件

从架构上看，AG Kit 与传统的 Agent 框架（如 LangChain、AutoGen）最大的区别在于：**它不绑定具体的 LLM 提供商**，而是围绕 Antigravity 运行时构建了一套可插拔的插件体系，任何支持 Antigravity 协议的工具都可以接入。

## 二、技术原理

### 2.1 工作区契约（Workspace Contract）

AG Kit 的核心设计理念是「工作区即代码」。安装 AG Kit 后，项目根目录会生成一个完整的 `.agents/` 工作区契约：

```
.agents/
├── rules/          # 6 条全局规则
├── skills/         # 47 个技能模块
├── workflows/      # 13 个工作流
├── agents/         # 20 个专家 Agent 定义
├── memory/         # 持久化记忆存储
└── hooks.json      # Antigravity 安全钩子配置
```

这个目录结构本身就是项目规范的一部分，团队成员克隆仓库后，Antigravity 会自动加载这些配置，保证所有人使用同一套 Agent 行为标准。

### 2.2 原生安全钩子机制

AG Kit 实现了一个细粒度的 `PreToolUse` 安全钩子，通过 `.agents/hooks.json` 注册到 Antigravity：

```json
{
  "enabled": true,
  "PreToolUse": [
    {
      "matcher": "run_command",
      "command": "node .agents/hooks/validate-tool-call.mjs",
      "timeout": 10
    }
  ]
}
```

验证脚本 `.agents/hooks/validate-tool-call.mjs` 会拦截所有 `run_command` 调用，检查命令模式。当前版本内置的防护规则包括：

- 拦截 `rm -rf /` 类根文件系统删除
- 拦截 `mkfs`/`dd` 类磁盘格式化操作
- 允许正常的项目清理（如 `rm -rf dist/` 或 `node_modules/`）

这个安全机制是「窄而深」的——只封堵最危险的行为模式，而不试图做全面的权限控制。AG Kit 的文档明确指出，它不能替代 Antigravity 原生的权限体系、workspace trust、沙箱隔离或人工审批。

### 2.3 插件打包与分发

AG Kit 支持将整个 `.agents/` 工作区打包为 Antigravity 插件：

```bash
npm run build:antigravity-plugin
```

打包产物 `dist/antigravity-plugin/` 包含所有 Agent、技能、工作流、规则，以及 `PLUGIN_CONTENTS.json`（SHA-256 内容清单）。通过 Antigravity CLI 安装后，插件内容会被复制到 Antigravity 的插件目录，实现跨项目的 Agent 配置复用。

### 2.4 MCP 同步机制

AG Kit 提供了 MCP 配置的版本化管理能力：

```bash
node .agents/hooks/sync-mcp.mjs --check          # 检查 MCP 计划
node .agents/hooks/sync-mcp.mjs --apply --target suite  # 应用到指定目标
```

同步脚本会读取 `.agents/mcp/` 目录的配置，检查目标 MCP 配置文件的差异，并在覆盖前创建带时间戳的备份文件。

## 三、安装与快速开始

### 环境要求

- **Node.js 22+**：仓库级别的 Antigravity 工具链需要
- **Python 3.10+**：AG Kit 验证器和辅助脚本需要
- **Git**：用于安全更新和回滚
- **Google Antigravity 工作区**：核心运行时

### 安装步骤

方式一（推荐，初始化到项目）：

```bash
npx @vudovn/ag-kit init
```

方式二（全局安装 CLI）：

```bash
npm install -g @vudovn/ag-kit
ag-kit init
```

### 验证工作区

安装后，运行以下检查确认配置正确：

```bash
npm run check:agents          # 验证 .agents/ 目录结构
npm run check:antigravity     # 验证 Antigravity 集成
npm run test:antigravity      # 运行 Antigravity 测试
```

严格模式检查（所有占位符配置完成后使用）：

```bash
node .agents/hooks/antigravity-doctor.mjs --strict
```

### 安全钩子验证（无实际破坏）

```bash
printf '%s' '{"tool_args":{"command":"rm -rf /"}}' \
  | node .agents/hooks/validate-tool-call.mjs
# 期望输出：非零退出码 + "BLOCKED by AG Kit"
```

## 四、使用方法与实战

### 4.1 日常工作流

团队成员克隆仓库并完成初始化后，以下 slash command 直接可用：

| 命令 | 用途 |
| --- | --- |
| `/plan` | 创建详细的实施计划和检查清单 |
| `/coordinate` | 并行执行可拆分的研究或评审任务，再汇总 |
| `/create` | 结构化地创建新功能或应用，含多道质量门 |
| `/debug` | 基于证据的根因分析 |
| `/deploy` | 执行生产部署前检查和部署工作流 |
| `/orchestrate` | 计划→审批→分发→验证的完整编排流程 |
| `/remember` | 将重要信息持久化到项目记忆系统 |

### 4.2 安全更新与回滚

AG Kit 的更新机制是合并感知的，会自动保留用户修改的文件：

```bash
ag-kit update --dry-run          # 预览更新计划
ag-kit update                    # 安全合并并创建备份
ag-kit update --strategy replace # 强制全量替换（仍会备份）
ag-kit rollback                  # 回滚到最新备份
```

备份文件存储在 `.ag-kit-backups/` 目录，更新元数据记录在 `.agents/.ag-kit/` 中。

### 4.3 MCP 配置管理

假设你在 `.agents/mcp/` 中定义了 MCP 服务器配置，可以用以下命令应用：

```bash
# 检查配置计划
node .agents/hooks/sync-mcp.mjs --print

# 应用到 Antigravity Suite
node .agents/hooks/sync-mcp.mjs --apply --target suite

# 强制覆盖已存在的同名配置
node .agents/hooks/sync-mcp.mjs --apply --target cli --force
```

## 五、常见问题与解决方案

**Q: `check:antigravity` 报 API Key 警告**
A: 默认的 MCP 示例配置中包含占位符 `YOUR_API_KEY`，doctor 脚本会如实报告警告。替换所有占位符后再运行 `--strict` 模式即可。

**Q: `.agents/` 目录是否需要提交到 Git？**
A: AG Kit 文档建议**不要**将 `.agents/` 加入 `.gitignore`。如果不想让 Antigravity 索引某些内容，可以将目录添加到 `.git/info/exclude`（Git 独有，不影响共享的 `.gitignore`）。

**Q: 安全钩子会不会影响正常的删除操作？**
A: 不会。钩子只拦截根文件系统级别的危险操作，正常的项目内删除（如 `rm -rf dist/`）不受影响。

**Q: 如何临时禁用安全钩子进行诊断？**
A: 将 `.agents/hooks.json` 中的 `"enabled"` 设为 `false`，然后重新打开工作区。诊断完成后记得恢复，不要删除 Antigravity 原生的权限控制。

**Q: 插件安装和仓库原生 `.agents/` 哪个优先级更高？**
A: 仓库原生的 `.agents/` 是项目开发的真实来源，插件安装是可选的扩展手段。两者可以共存，但建议以仓库原生配置为基准。

## 六、总结

AG Kit 的出现代表了 AI Agent 开发从「单兵调优」向「团队工程化」的转变。通过将 Agent 的行为规范、技能、工作流、安全规则全部版本化管理，它让多个开发者可以在同一套 Agent 标准下协作，同时通过 MCP 和插件机制保持了良好的扩展性。

如果你已经在使用 Google Antigravity，或者希望为团队建立一套可复用的 Agent 开发规范，AG Kit 是一个值得关注的项目。它目前仍处于活跃开发阶段，GitHub 上提供了完整的文档和迁移指南，值得深入研究。
