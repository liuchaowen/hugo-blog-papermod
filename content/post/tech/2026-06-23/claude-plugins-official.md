---
title: "Claude Code Plugins 官方插件目录：Claude Code 的插件生态系统"
date: 2026-06-23
description: "Anthropic 推出的 Claude Code 官方插件目录，为 Claude Code 提供标准化插件市场，支持 MCP 服务器集成、自定义命令和技能包，构建可扩展的 AI 编程助手生态。"
author: "Cheman"
slug: claude-plugins-official
draft: false
categories: ["AI", "开源工具", "开发工具"]
tags: ["Claude Code", "Anthropic", "MCP", "插件系统", "AI编程"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**claude-plugins-official**，Anthropic 官方推出的 Claude Code 插件目录，为 Claude Code 提供一个标准化的插件市场。

## 一、项目概述

**claude-plugins-official** 是 Anthropic 官方维护的 Claude Code 插件市场仓库，类似于 VS Code 的扩展商店或 npm registry 的定位。它为 Claude Code 用户提供了一个集中发现、安装和管理高质量插件的平台。

**核心特性：**

- **官方+社区双轨制**：`/plugins` 目录存放 Anthropic 内部维护的官方插件，`/external_plugins` 目录收录经过审核的第三方插件
- **标准化插件结构**：每个插件遵循统一的目录规范，包含元数据、MCP 配置、命令和技能定义
- **Skill-bundle 支持**：支持将不具备完整插件 manifest 的技能包直接注册为插件，降低贡献门槛
- **安全审核机制**：第三方插件需通过质量和安全标准审核才能被收录，降低用户使用风险

## 二、技术原理

### 插件架构设计

Claude Code 的插件系统采用基于 MCP（Model Context Protocol）的架构，每个插件可以包含以下组件：

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json      # 插件元数据（必需）
├── .mcp.json            # MCP 服务器配置（可选）
├── commands/            # 斜杠命令（可选）
├── agents/              # Agent 定义（可选）
├── skills/              # 技能定义（可选）
└── README.md            # 文档
```

**plugin.json** 是插件的核心配置文件，声明插件的名称、描述、作者、分类和来源。来源支持多种方式获取：

- **git-subdir**：从 Git 仓库的子目录获取插件代码
- 支持指定 ref（分支/标签）和 SHA，确保版本锁定和可复现性

### MCP 集成机制

通过 `.mcp.json` 配置文件，插件可以声明 MCP 服务器，使 Claude Code 能够通过标准化协议与外部工具和服务通信。这种设计将 AI 编程助手的能力边界从纯文本交互扩展到与开发工具链的深度集成。

### Skill-bundle 模式

对于不以插件形式发布的技能包（只有 `SKILL.md` 文件，没有 `.claude-plugin/plugin.json`），插件目录支持 **strict: false** 模式：

```json
{
  "name": "example-bundle",
  "strict": false,
  "skills": ["./skill-a", "./skill-b"],
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example-org/sdk.git",
    "path": "packages/agent-skills",
    "ref": "main",
    "sha": "<commit sha>"
  }
}
```

`skills` 数组中的每个路径可以跨多级目录，允许从一个大型 SDK 仓库中精准提取特定技能，灵活度非常高。

## 三、安装与快速开始

### 环境要求

- Claude Code CLI（最新版本）
- 网络访问权限（用于拉取插件源码）

### 安装插件

在 Claude Code 中直接运行：

```bash
/plugin install {plugin-name}@claude-plugins-official
```

或通过交互式界面浏览和安装：

```bash
/plugin > Discover
```

Claude Code 会自动从插件目录的源仓库拉取对应插件，完成注册和初始化。

### 提交插件

Anthropic 内部开发者可参考 `/plugins/example-plugin` 的参考实现。第三方开发者通过 [插件目录提交表单](https://clau.de/plugin-directory-submission) 提交插件，需满足质量和安全审核标准。

## 四、使用方法与实战

### 查找插件

克隆或浏览 claude-plugins-official 仓库：

```bash
git clone https://github.com/anthropics/claude-plugins-official.git
cd claude-plugins-official
```

- `/plugins` 目录下的官方插件经过 Anthropic 内部测试
- `/external_plugins` 目录下的社区插件附带独立 LICENSE 文件

### 插件开发

1. 参考示例插件 `/plugins/example-plugin` 的结构
2. 编写 `plugin.json` 元数据
3. 按需添加 MCP 服务器配置、命令和技能
4. 提交到仓库或通过提交表单申请收录

### Skill-bundle 贡献

如果你的项目已有 `SKILL.md` 文件但不想构建完整插件，可以采用 skill-bundle 模式，只需在插件目录的 manifest 中声明 `strict: false` 并列出技能路径即可。

## 五、常见问题与解决方案

**Q: 安装插件后没有生效？**
检查 Claude Code 版本是否支持插件系统。插件市场是较新的功能，确保已更新到最新版本。同时确认插件名称拼写正确，格式为 `{plugin-name}@claude-plugins-official`。

**Q: 第三方插件安全吗？**
Anthropic 在官方仓库中明确声明：不对第三方插件的 MCP 服务器、文件或其他软件进行控制，无法验证其行为和变更。安装前务必查看插件主页，评估可信度。

**Q: 如何更新已安装的插件？**
重新运行 `/plugin install {plugin-name}@claude-plugins-official` 即可拉取最新版本。由于插件源码通过 Git 管理并支持 SHA 锁定，版本回退也很方便。

**Q: 插件和 Skill 有什么区别？**
插件（Plugin）是完整的封装单元，包含 manifest、MCP 配置等；Skill 是更轻量的知识片段，通常只有一个 `SKILL.md` 文件。插件可以包含多个 Skill，Skill-bundle 模式则将多个 Skill 打包为插件。

## 六、总结

Claude Code Plugins 官方插件目录标志着 AI 编程助手生态走向成熟。通过标准化的插件结构和 MCP 协议集成，Claude Code 从一个独立的 AI 助手演进为一个可扩展的开发平台。双轨制（官方+社区）的设计既保证了核心插件的可靠性，又通过社区力量丰富了功能边界。对于开发者而言，这不仅降低了使用门槛，也开辟了为 Claude Code 贡献能力的途径。随着插件生态的发展，Claude Code 有望成为 AI 辅助编程领域的基础设施级平台。

项目地址：[anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
