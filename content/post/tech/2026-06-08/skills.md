---
title: "Google Skills：为 AI Agent 打造的技能库，覆盖全栈 Google Cloud 技术栈"
date: 2026-06-08
description: "Google 官方开源的 Agent Skills 仓库，提供了一系列针对 Google 产品和技术的标准化技能包，包括 Gemini API、BigQuery、Cloud Run、GKE 等核心云服务的深度集成能力，帮助开发者快速为 AI Agent 赋予 Google Cloud 生态系统能力。"
author: "Cheman"
slug: skills
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, Google Cloud, Agent]
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

今天在 GitHub Trending 上看到一个有意思的项目：**google/skills**，这是一个为 AI Agent 提供标准化技能包的官方仓库，让 Agent 能够轻松掌握 Google Cloud 的全栈技术能力。

## 一、项目概述

**google/skills** 是 Google 官方维护的 [Agent Skills](https://agentskills.io/home) 仓库，提供了一系列针对 Google 产品和技术的标准化技能包。这些技能包可以被 AI Agent 直接调用，快速赋予 Agent 操作 Google Cloud 服务的能力。

**核心特性：**

- **官方支持**：由 Google 官方维护，保证与 Google Cloud 服务的深度集成
- **模块化设计**：每个技能包独立封装，可按需选择和安装
- **全覆盖技术栈**：从基础的 Cloud Run、BigQuery 到高级的 Gemini API、AlloyDB 等
- **简单易用**：通过 `npx skills add google/skills` 一键安装所需技能
- **Well-Architected Framework**：提供 Google Cloud 架构最佳实践的技能包（安全性、可靠性、成本优化等）

## 二、技术原理

### 2.1 Agent Skills 架构设计

Agent Skills 采用模块化、可组合的设计理念。每个技能包包含：

- **Markdown 文档**：详细描述技能的使用方法、API 调用示例
- **配置文件**：定义技能的依赖、权限、输入输出格式
- **代码示例**：提供实际可运行的代码片段

技能包通过标准化的目录结构组织：

```bash
skills/
├── cloud/
│   ├── gemini-api/          # Gemini API 技能
│   ├── bigquery-basics/     # BigQuery 基础技能
│   ├── cloud-run-basics/    # Cloud Run 基础技能
│   └── ...
└── README.md
```

### 2.2 核心技术栈与选型理由

- **Markdown 作为技能定义语言**：易于阅读、编写和维护，支持丰富的格式化
- **npx 作为分发工具**：利用 npm 生态系统，实现一键安装和版本管理
- **AgentSkills.io 平台**：提供技能的发现、安装和管理能力

### 2.3 数据流分析

```
用户 Agent → npx skills add google/skills → 选择技能 → 安装到 Agent 环境
                                                ↓
                                        Agent 调用技能 → 访问 Google Cloud API → 返回结果
```

## 三、安装与快速开始

### 3.1 环境要求

- Node.js 14+ （用于运行 `npx` 命令）
- Google Cloud 账号和项目
- 相应的 Google Cloud API 已启用

### 3.2 安装步骤

**方式一：交互式安装（推荐）**

```bash
npx skills add google/skills
```

运行后会出现交互式界面，让你选择需要安装的技能包。

**方式二：直接安装特定技能**

如果需要安装特定技能，可以直接指定路径：

```bash
npx skills add google/skills/skills/cloud/bigquery-basics
```

### 3.3 最简运行示例

安装完成后，Agent 可以通过以下方式调用技能：

```javascript
// 示例：使用 BigQuery 技能查询数据
const result = await agent.useSkill('bigquery-basics', {
  query: 'SELECT * FROM `my-project.my_dataset.my_table` LIMIT 10'
});
```

## 四、使用方法与实战

### 4.1 基础用法

以 **BigQuery Basics** 技能为例，Agent 可以：

1. **执行 SQL 查询**

```sql
-- 技能包提供的示例查询
SELECT
  name,
  COUNT(*) as visit_count
FROM `bigquery-public-data.google_analytics_sample.ga_sessions_*`
WHERE _TABLE_SUFFIX BETWEEN '20230101' AND '20230131'
GROUP BY name
ORDER BY visit_count DESC
LIMIT 10
```

2. **创建数据集和表**

```javascript
// 使用技能创建数据集
await agent.useSkill('bigquery-basics', {
  action: 'create_dataset',
  datasetId: 'my_new_dataset',
  location: 'US'
});
```

### 4.2 进阶用法

**Google Cloud Well-Architected Framework 技能**

这些技能包提供了 Google Cloud 架构最佳实践：

- **Security（安全性）**：IAM 配置、密钥管理、VPC 安全策略
- **Reliability（可靠性）**：高可用架构、灾难恢复、监控告警
- **Cost Optimization（成本优化）**：资源优化、预算告警、闲置资源清理
- **Operational Excellence（运营卓越）**：CI/CD、自动化运维、SLO 管理
- **Performance Optimization（性能优化）**：性能调优、负载测试、缓存策略
- **Sustainability（可持续性）**：碳足迹优化、绿色计算

**示例：使用 Security 技能检查 IAM 配置**

```javascript
const securityIssues = await agent.useSkill(
  'google-cloud-waf-security',
  {
    action: 'check_iam_policies',
    projectId: 'my-project'
  }
);
```

### 4.3 实际项目示例

**场景：构建一个基于 Gemini API 的数据分析 Agent**

```javascript
// 1. 安装所需技能
// npx skills add google/skills/skills/cloud/gemini-api
// npx skills add google/skills/skills/cloud/bigquery-basics

// 2. Agent 使用 Gemini API 技能
const analysis = await agent.useSkill('gemini-api', {
  model: 'gemini-pro',
  prompt: '分析以下销售数据并给出洞察：' + salesData
});

// 3. 将结果存储到 BigQuery
await agent.useSkill('bigquery-basics', {
  action: 'insert_rows',
  datasetId: 'analytics',
  tableId: 'insights',
  rows: [{ insight: analysis, timestamp: new Date() }]
});
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：运行 `npx skills add google/skills` 时报错

**解决方案**：
- 检查 Node.js 版本是否 >= 14
- 清除 npx 缓存：`npx clear-npx-cache`
- 使用管理员权限运行命令

### 5.2 运行时错误

**问题**：Agent 调用技能时出现权限错误

**解决方案**：
- 确保已配置 Google Cloud 认证（运行 `gcloud auth application-default login`）
- 检查服务账号是否具有相应的 IAM 角色
- 验证所需的 Google Cloud API 已启用

### 5.3 性能问题

**问题**：技能执行缓慢

**解决方案**：
- 检查网络连接（特别是访问 Google Cloud API）
- 使用连接池和缓存机制
- 对于 BigQuery 等查询服务，优化 SQL 语句和表结构

### 5.4 兼容性

**问题**：技能与特定版本的 Agent 框架不兼容

**解决方案**：
- 查看技能包的 `README.md` 了解兼容性要求
- 提交 Issue 到 [GitHub Issue Tracker](https://github.com/google/skills/issues)
- 考虑 fork 技能包并进行定制化修改

## 六、总结

**google/skills** 是一个非常有价值的项目，它为 AI Agent 提供了标准化、模块化的 Google Cloud 技能包，大大降低了 Agent 集成 Google 生态系统的门槛。

**项目亮点：**

1. **官方背书**：Google 官方维护，保证质量和持续更新
2. **全面覆盖**：从基础服务到高级架构实践，应有尽有
3. **易于扩展**：基于 Markdown 的技能定义，方便社区贡献
4. **生产就绪**：包含 Well-Architected Framework，帮助构建企业级应用

对于正在构建 AI Agent 或需要集成 Google Cloud 服务的开发者来说，这个仓库绝对值得深入研究和应用。未来，随着 Agent Skills 生态的成熟，我们有理由相信这种模块化的技能包模式将成为 AI Agent 开发的标准范式。

**GitHub 仓库**：https://github.com/google/skills

> 本文已发布到我的 Hugo 博客，欢迎访问和交流！
