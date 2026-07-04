---
title: ".NET Agent Skills：微软官方出品的 AI 编程代理技能库"
date: 2026-07-05
description: "微软 .NET 团队推出的 Agent Skills 技能库，为 Copilot CLI、Claude Code、Cursor 等 AI 编程工具提供了一套完整的 .NET 开发技能集合，涵盖从基础开发到高级场景的全面支持。"
author: "Cheman"
slug: "skills"
draft: false
categories: ["技术", "开源"]
tags: [".NET", "AI", "Agent", "GitHub", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**dotnet/skills**，这是微软 .NET 团队官方维护的 Agent Skills 技能库，为各类 AI 编程助手提供了一套标准化、高质量的 .NET 开发技能集合。

## 一、项目概述

dotnet/skills 是微软 .NET 团队精心策划的核心技能与自定义代理集合，专为 AI 编程代理（Coding Agents）设计。随着 AI 辅助编程工具的普及，如何让 AI 更好地理解和使用 .NET 生态成为一个关键问题，而这个项目正是为此而生。

**核心特性：**

- **标准化技能规范**：遵循 [agentskills.io](https://agentskills.io) 开放标准，确保技能在不同 AI 工具间的可移植性
- **全面的技能覆盖**：从基础的 C# LSP 集成到高级的 AI/ML 集成，覆盖 .NET 开发的全生命周期
- **多平台支持**：同时支持 Copilot CLI、Claude Code、Cursor、Codex CLI 等主流 AI 编程工具
- **持续集成保障**：通过 Dashboard 实时监控各技能的准确性和效率评分

**包含的技能插件：**

| 插件 | 描述 |
|------|------|
| dotnet | C# 语言服务器 (LSP) 集成和基础 .NET 开发技能 |
| dotnet-advanced | 特殊场景下的 .NET 任务处理技能 |
| dotnet-data | .NET 数据访问和 Entity Framework 相关技能 |
| dotnet-diag | .NET 性能调查、调试和事件分析技能 |
| dotnet-msbuild | 全面的 MSBuild 和 .NET 构建技能 |
| dotnet-nuget | NuGet 和 .NET 包管理技能 |
| dotnet-upgrade | .NET 项目跨框架版本迁移和升级技能 |
| dotnet-maui | .NET MAUI 开发技能 |
| dotnet-ai | .NET 的 AI 和 ML 技能（LLM 集成、RAG、MCP 等） |
| dotnet-template-engine | .NET 模板引擎技能 |
| dotnet-test | .NET 测试运行、生成、分析和改进技能 |
| dotnet-test-migration | .NET 测试框架和平台迁移技能 |
| dotnet-aspnetcore | ASP.NET Core Web 开发技能 |
| dotnet-blazor | Blazor 开发技能 |
| dotnet11 | .NET 11 新 API 和语言特性技能 |

## 二、技术原理

### 架构设计

dotnet/skills 采用了**插件化、模块化的架构设计**。每个技能插件都是独立的，可以单独安装和使用。这种设计带来了几个关键优势：

1. **按需加载**：AI 工具可以根据任务需求只加载相关技能，减少上下文占用
2. **独立更新**：每个插件可以独立版本化和更新，不影响其他技能
3. **标准化接口**：所有技能遵循统一的 Agent Skills 标准，确保互操作性

### Agent Skills 标准

项目遵循 [agentskills.io](https://agentskills.io) 开放标准，该标准定义了：

- **技能描述格式**：统一的元数据格式，描述技能的功能、依赖和使用方式
- **工具调用协议**：标准化的工具发现和调用机制
- **上下文管理**：如何高效地管理和传递技能相关的上下文信息

### 核心技术栈

- **C# / .NET**：技能本身针对 .NET 生态设计
- **LSP (Language Server Protocol)**：dotnet 插件集成了 C# LSP，为 AI 提供精确的代码理解和重构能力
- **MCP (Model Context Protocol)**：dotnet-ai 插件支持 MCP，实现 AI 与外部工具的标准化集成
- **ML.NET**：dotnet-ai 插件涵盖使用 ML.NET 进行经典机器学习的技能

### 数据流分析

当一个 AI 编程助手使用这些技能时，典型的数据流如下：

1. **技能发现**：AI 工具通过标准化接口发现可用的技能
2. **上下文注入**：相关技能的说明和示例被注入到 AI 的上下文中
3. **任务执行**：AI 根据用户需求调用相应的技能工具
4. **结果反馈**：技能执行结果返回给 AI，用于后续推理或展示给用户

## 三、安装与快速开始

### 环境要求

- 已安装支持的 AI 编程工具之一（Copilot CLI / Claude Code / Cursor / Codex CLI）
- 对应工具的插件/技能功能已启用

### Copilot CLI / Claude Code 安装

```bash
# 1. 启动 Copilot CLI 或 Claude Code

# 2. 添加 marketplace
/plugin marketplace add dotnet/skills

# 3. 安装指定插件（以 dotnet 为例）
/plugin install dotnet@dotnet-agent-skills

# 4. 重启以加载新插件

# 5. 查看可用技能
/skills

# 6. 查看可用代理
/agents

# 7. 按需更新插件
/plugin update dotnet@dotnet-agent-skills
```

### VS Code / VS Code Insiders (预览版)

在 `settings.json` 中添加以下配置：

```jsonc
{
  "chat.plugins.enabled": true,
  "chat.plugins.marketplaces": ["dotnet/skills"]
}
```

配置完成后，在 Copilot Chat 中输入 `/plugins` 或在扩展中使用 `@agentPlugins` 过滤器来浏览和安装插件。

### Cursor

Cursor 用户可以直接在 marketplace 面板中搜索 `.NET`，或访问 [cursor.com/marketplace](https://cursor.com/marketplace) 浏览和安装插件。

本地开发时，可以将本地 checkout 链接到 Cursor：

```bash
# 将本地 checkout 复制到 Cursor 插件目录
cp -r /path/to/local/skills ~/.cursor/plugins/local/dotnet-agent-skills

# 重启 Cursor 或运行 Developer: Reload Window
```

### Codex CLI

Codex CLI v0.121.0+ 支持插件 marketplace：

```bash
# 1. 添加 marketplace
codex plugin marketplace add dotnet/skills

# 2. 启动 Codex 并打开插件浏览器
/plugins

# 3. 浏览 dotnet-agent-skills 标签并安装所需插件

# 4. 按需更新
codex plugin marketplace upgrade dotnet-agent-skills
```

也可以安装单个技能：

```bash
skill-installer install https://github.com/dotnet/skills/tree/main/plugins/dotnet/skills/<skill-name>
```

## 四、使用方法与实战

### 基础用法：使用 dotnet 插件进行 C# 开发

安装 dotnet 插件后，AI 工具将获得以下能力：

- C# 代码补全和重构（通过 LSP 集成）
- .NET CLI 命令的高级封装
- 项目文件分析和修改
- NuGet 包管理

**示例对话：**

```
用户：帮我创建一个新的 ASP.NET Core Web API 项目，使用最小 API 模式
AI：[调用 dotnet 插件，执行 dotnet new webapi -minimal]
```

### 进阶用法：使用 dotnet-ai 插件集成 LLM

dotnet-ai 插件提供了 AI 和 ML 技能，包括：

- LLM 集成（OpenAI、Azure AI 等）
- Agentic 工作流设计
- RAG (检索增强生成) 管道
- MCP 集成
- 使用 ML.NET 的经典机器学习

**示例：构建一个 RAG 管道**

```
用户：帮我设计一个使用 EF Core 和 Semantic Kernel 的 RAG 系统
AI：[调用 dotnet-ai 和 dotnet-data 插件，生成代码架构]
```

### 实际项目示例：迁移测试框架

使用 dotnet-test-migration 插件可以自动化测试框架迁移：

- MSTest 和 xUnit 版本升级
- xUnit 到 MSTest 的转换
- VSTest 到 Microsoft.Testing.Platform 的迁移

```bash
# AI 可以自动执行以下任务：
# 1. 分析现有测试项目
# 2. 生成迁移计划
# 3. 执行代码转换
# 4. 运行测试验证
```

## 五、常见问题与解决方案

### 安装失败

**问题**：执行 `/plugin install` 时提示找不到插件或 marketplace。

**解决方案**：
1. 确认已正确添加 marketplace：`/plugin marketplace add dotnet/skills`
2. 检查 AI 工具版本是否支持插件功能
3. 查看 [dotnet/skills 的 Dashboard](https://dotnet.github.io/skills/) 确认插件状态

### 技能不生效

**问题**：安装插件后，AI 工具没有使用相关技能。

**解决方案**：
1. 确认已重启 AI 工具以加载新插件
2. 使用 `/skills` 命令确认技能已加载
3. 检查技能的触发条件，确保在相关上下文中使用

### 兼容性问题

**问题**：某些技能在特定 AI 工具上不工作。

**解决方案**：
1. 查看技能的文档，确认支持的工具范围
2. 检查是否缺少依赖（如 .NET SDK 版本）
3. 在 GitHub 仓库提交 Issue 反馈问题

### 性能问题

**问题**：加载过多技能导致 AI 工具响应变慢。

**解决方案**：
1. 只安装需要的技能插件，避免全量安装
2. 使用插件的依赖分析功能，了解技能间的依赖关系
3. 定期清理不再使用的技能

## 六、总结

dotnet/skills 是微软 .NET 团队在 AI 编程时代的重要布局，通过标准化的 Agent Skills 规范，为 AI 编程助手提供了深度理解和使用 .NET 生态的能力。其价值体现在：

1. **降低 AI 使用 .NET 的门槛**：AI 不再需要"猜测".NET 的最佳实践，而是直接获得官方认证的技能
2. **提升开发效率**：从项目创建、编码、测试到部署，全流程的 AI 辅助
3. **保证质量**：由 .NET 团队维护，确保技能与最新 .NET 特性同步
4. **开放标准**：基于 agentskills.io 标准，技能可以在不同 AI 工具间复用

对于 .NET 开发者而言，这意味着你可以更信任 AI 工具生成的 .NET 代码；对于 AI 工具开发者而言，这是一个优秀的学习范例，展示了如何为特定技术栈构建高质量的技能库。

随着 AI 编程工具的进一步普及，类似 dotnet/skills 这样的官方技能库将成为开发者工具链中不可或缺的一部分。

**项目链接**：https://github.com/dotnet/skills
