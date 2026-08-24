---
title: "Awesome DSH Plugin：DeepSeek Harness 插件生态精选"
date: 2026-08-24
description: "Awesome DSH Plugin 是 DeepSeek Harness (DSH) 插件生态的精选列表，收录了社区开发的各类插件，涵盖 UI 增强、主题外观、模型提供商、工具扩展等多个类别，支持一键安装和即插即用。"
author: "Cheman"
slug: awesome-dsh-plugin
draft: false
categories: ["技术", "开源"]
tags: ["DeepSeek", "DSH", "插件", "AI", "开源生态"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Awesome DSH Plugin**，这是 DeepSeek Harness 的插件生态精选列表，收录了数十款社区插件，让用户可以像安装浏览器扩展一样扩展 AI 编码助手的能力。

## 一、项目概述

### 什么是 DeepSeek Harness？

DeepSeek Harness（简称 DSH）是 DeepSeek 开源的一套 Agent 框架，提供了一个可运行的编码代理（支持 Web UI 和无头模式）。其核心理念是 **"一切皆插件"**：模型、工具、沙箱、会话存储、UI，甚至 Agent 循环本身都是可替换的插件。

这意味着你可以：
- 用不同的模型提供商替换默认模型
- 添加自定义工具和能力
- 改变 UI 外观和交互方式
- 扩展沙箱、存储等底层组件

### Awesome DSH Plugin 的定位

Awesome DSH Plugin 是 DSH 插件生态的精选目录，收录了所有通过 `dsh plugin add` 命令可安装的社区插件。每个插件都遵循官方协议，声明 `dsh.bundle` 清单文件，确保一键安装、即插即用。

## 二、插件分类概览

该项目将收录的插件分为多个类别：

| 类别 | 说明 |
|------|------|
| **UI Enhancements** | UI 增强类，如状态栏动画、命令面板、任务看板 |
| **Themes & Appearance** | 主题和外观定制 |
| **Models & Providers** | 模型和提供商扩展 |
| **Tools & Capabilities** | 工具和能力扩展 |
| **Browser & Web** | 浏览器和网络相关功能 |
| **Voice & Audio** | 语音和音频功能 |
| **Skills** | 技能模块扩展 |
| **Workflow & Automation** | 工作流和自动化 |
| **Git & Code Review** | Git 和代码审查增强 |
| **Notifications & Integrations** | 通知和第三方集成 |
| **Security & Permissions** | 安全和权限管理 |

### 精选插件示例

**UI 增强：**
- `dsh-spotlight`：键盘优先的命令面板，快速执行各种操作
- `dsh-status-rotator`：将 "Deep diving..." 状态替换为有趣的梗短语
- `dph-taskboard`：侧边栏任务看板，支持拖拽管理会话

**工具扩展：**
- `dsh-find-plugin`：让 Agent 帮你找到合适的插件
- `dsh-file-mentions`：回复中的文件路径可点击，支持打开和定位

**插件市场：**
- `dsh-market`：内置的插件市场，一站式浏览、安装、升级所有插件

## 三、安装与使用

### 安装插件市场（推荐）

最简单的方式是安装 `dsh-market` 插件，获得图形化的插件浏览和一键安装体验：

```bash
dsh plugin --profile web add dshmarket
```

安装后，在设置页面可以看到插件市场界面，支持分类筛选、搜索、一键安装和升级。

### 直接安装插件

如果你知道插件名称，可以直接通过命令安装：

```bash
# 安装命令面板
dsh plugin add dsh-spotlight

# 安装任务看板
dsh plugin add dph-taskboard
```

### 使用插件发现工具

安装 `dsh-find-plugin` 后，可以直接在对话中让 Agent 帮你找到合适的插件：

```bash
dsh plugin --profile web add dsh-find-plugin
```

然后在对话中提问："我需要一个能管理任务的插件"或"有没有主题相关的插件？"

## 四、插件开发与贡献

如果你想开发自己的 DSH 插件，需要遵循以下规范：

### 清单文件

每个插件必须在根目录声明 `dsh.bundle` 清单文件，定义插件元数据、入口点、依赖关系等。

### 安装协议

插件必须支持 `dsh plugin add` 命令安装，这是收录到 Awesome DSH Plugin 的基本要求。

### 贡献流程

1. Fork awesome-dsh-plugin 仓库
2. 按照模板格式添加你的插件条目
3. 提交 PR，等待审核

审核标准很简单：插件能正常安装、功能与描述一致、项目持续维护即可。

## 五、安全注意事项

⚠️ **重要提醒**：安装插件意味着在你的机器上运行第三方代码，插件拥有与你相同的权限，可以：
- 读取你的文件
- 使用你的凭据
- 访问网络

建议：
1. 安装前检查插件源码
2. 在不存储敏感密钥的环境中测试新插件
3. 只安装可信来源的插件

## 六、总结

Awesome DSH Plugin 是 DeepSeek Harness 生态的重要资源，它展示了插件化架构的强大之处：通过社区贡献，DSH 可以不断扩展能力，适应各种使用场景。无论你是想增强 UI、集成新工具、还是定制工作流，这个列表都能帮你找到合适的插件。

如果你正在使用 DeepSeek Harness，不妨先安装 `dsh-market` 插件，一站式浏览整个插件生态。
