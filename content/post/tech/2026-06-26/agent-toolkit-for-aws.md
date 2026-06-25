---
title: "AWS Agent Toolkit for AWS：让 AI 编码代理无缝玩转 AWS 全栈服务"
date: "2026-06-26"
description: "AWS 官方推出的 Agent Toolkit for AWS，为 Claude Code、Codex、Cursor、Kiro 等主流 AI 编码代理提供统一的 AWS 工具、知识和安全护栏，支持 300+ AWS 服务，覆盖构建、部署、监控全流程。"
author: "Cheman"
slug: "agent-toolkit-for-aws"
draft: false
categories: ["技术", "开源", "AI"]
tags: ["AWS", "AI Agent", "Claude Code", "Cursor", "MCP", "云计算"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**AWS Agent Toolkit for AWS**，这是 AWS 官方推出的重量级工具包，旨在给 AI 编码代理（Claude Code、Codex、Cursor、Kiro 等）装上"AWS 全技能"，让它们能够自主完成在 AWS 上的构建、部署和管理任务。项目甫一上线便登顶 Trending，足以说明 AI + 云基础设施这个组合有多火热。

## 一、项目概述

AWS Agent Toolkit for AWS 是 AWS Labs 早期 MCP 服务器和技能包的正式继承者。相比前辈，它带来了几个关键能力升级：

- **IAM 条件键区分代理行为**：可以编写仅适用于 AI 代理操作的 IAM 策略，即使底层 IAM 角色的权限更大，代理也只能执行受限操作
- **企业级可观测性**：每个请求都自动记录到 Amazon CloudWatch 指标和 AWS CloudTrail 审计日志
- **经过端到端评测的技能**：所有 Agent Skills 都经过严格评测，确保工作流能稳定完成
- **全 AWS API 覆盖**：通过单一认证端点访问 300+ AWS 服务

项目目前提供四类插件，覆盖从核心云操作到安全运维的完整场景：

| 插件 | 描述 |
|------|------|
| aws-core | 核心 AWS 技能，覆盖服务选型、CDK/CloudFormation、无服务器、容器、存储、可观测性、计费、SDK 使用和部署 |
| aws-agents | 基于 Amazon Bedrock 和 AgentCore 构建 AI Agent 的技能 |
| aws-data-analytics | 数据湖、分析和 ETL 工作流技能，覆盖 S3 Tables、AWS Glue 和 Athena |
| aws-agents-for-devsecops | 事件调查、代码审计、漏洞扫描、渗透测试等 DevSecOps 技能 |

## 二、技术架构与核心原理

### 2.1 AWS MCP Server：代理与 AWS 的桥梁

Agent Toolkit 的底层核心是 **AWS MCP Server**，它遵循 Model Context Protocol（MCP），为 AI 代理提供标准化的 AWS 访问接口。MCP Server 以托管服务的方式运行在 AWS 区域中（目前主要是 `us-east-1`），代理通过 MCP 协议与其通信。

MCP Server 提供四大类工具：

**Full AWS API Coverage（沙盒脚本执行）**
代理可以通过 MCP Server 在隔离的沙盒环境中执行 Python 脚本，完成复杂的多步骤操作，而无需直接在本地配置 AWS 凭证。

**Real-time Documentation Access（实时文档访问）**
代理可以实时搜索和检索最新的 AWS 文档、API 参考和服务能力说明，无需认证即可访问大量技术资料。

**Enterprise Controls（企业级管控）**
- CloudWatch 指标：每个 MCP 请求都会生成指标，便于监控代理活动
- CloudTrail 审计：所有操作均记录到 CloudTrail，满足合规需求
- IAM Context Keys：为代理专属策略提供细粒度控制

### 2.2 插件系统与技能包

Agent Toolkit 采用**插件（Plugin）+ 技能（Skill）**的双层架构：

```
Plugin = MCP Server 配置 + Agent Skills 的打包单元
Skill  = 精选的指令和参考资料包，按需加载
```

以 `aws-core` 插件为例，它将 AWS MCP Server 与一组预定义的 Agent Skills 打包，代理安装插件后即获得：
- 服务选型建议（什么场景用 ECS 还是 Lambda？）
- CDK/CloudFormation 模板生成
- SDK 使用最佳实践
- 部署流程指导

### 2.3 与 AWS Labs MCP 服务器的关系

AWS Labs 此前在 GitHub 上发布了多个独立的 MCP 服务器和技能包（如 `aws-mcp`、`bedrock-agent-core` 等）。Agent Toolkit 是这些工具的**统一升级版**，AWS 承诺逐步将 AWS Labs 中的优秀组件迁移到 Agent Toolkit 中，同时保持向后兼容。

## 三、安装与快速开始

### 3.1 环境要求

- 一个配置好凭证的 AWS 账户（API 调用和脚本执行需要；纯文档搜索和技能发现不需要）
- 对应的 AI 编码代理（Claude Code / Codex / Cursor / Kiro）

### 3.2 Claude Code 安装步骤

```bash
# 更新插件市场索引
/plugin marketplace update claude-plugins-official

# 安装 aws-core 插件（最核心、最推荐先装的）
/plugin install aws-core@claude-plugins-official

# 安装 aws-agents 插件（构建 AI Agent on AWS）
/plugin install aws-agents@claude-plugins-official

# 安装 aws-data-analytics 插件（数据湖和 ETL）
/plugin install aws-data-analytics@claude-plugins-official
```

安装完成后，Claude Code 就能通过 MCP Server 与 AWS 服务交互了。例如，让 Claude Code 帮你部署一个 S3 静态网站：

```bash
# 在 Claude Code 中直接对话
帮我用 CDK 创建一个 S3 静态网站托管桶，配置公共读权限和静态网站托管
```

Claude Code 会自动调用 AWS MCP Server 的工具链，完成 CDK 代码生成、合规检查和部署。

### 3.3 Cursor 安装步骤

1. 在 Cursor 中进入 **Settings → Plugins → Team Marketplaces → Add Marketplace**
2. 导入 `aws/agent-toolkit-for-aws` 仓库
3. 打开 **Plugins** 面板，安装 **aws-core** 插件（建议从这里开始）
4. 按需安装 **aws-agents** 和 **aws-data-analytics**

### 3.4 Kiro 安装步骤

编辑 `~/.kiro/settings/mcp.json`：

```json
{
  "mcpServers": {
    "aws": {
      "command": "uvx",
      "args": [
        "mcp-proxy-for-aws@1.6.2",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata",
        "AWS_REGION=us-west-2"
      ]
    }
  }
}
```

然后安装技能包：

```bash
npx skills add aws/agent-toolkit-for-aws/skills
```

> ⚠️ **版本固定建议**：建议在 `mcp-proxy-for-aws` 后锁定特定版本号（如 `@1.6.2`），以确保行为可重现，避免供应链风险。

## 四、使用方法与实战

### 4.1 场景一：用 Claude Code 快速部署 Serverless 应用

让 Claude Code 基于 aws-core 插件的能力，完成一个完整的 Lambda + API Gateway 部署：

```
帮我用 aws-core 创建一个基于 Lambda 和 API Gateway 的 REST API，
包含 GET /products 和 POST /products 两个端点，数据存储在 DynamoDB 中。
```

Claude Code 会：
1. 生成符合 AWS 最佳实践的 CDK 代码
2. 提示确认资源命名和 IAM 权限
3. 自动执行 `cdk deploy` 完成部署
4. 输出 API 端点 URL

### 4.2 场景二：数据分析工作流

使用 aws-data-analytics 插件进行 S3 数据湖的 ETL 分析：

```bash
# 在 Claude Code 中
/plugin install aws-data-analytics@claude-plugins-official

# 然后对话
帮我用 AWS Glue 创建一个 ETL job，从 s3://raw-bucket/ 读取 CSV 数据，
做清洗转换后写入 s3://processed-bucket/，最后用 Athena 建表查询
```

### 4.3 场景三：DevSecOps 安全扫描

使用 aws-agents-for-devsecops 插件进行代码安全审计：

```bash
# 添加到 Claude 插件市场
/plugin marketplace add aws/agent-toolkit-for-aws
/plugin install aws-agents-for-devsecops@claude-plugins-official

# 设置 AWS DevOps Agent
/aws-agents-for-devsecops:setup

# 运行安全扫描
帮我扫描这个仓库的代码漏洞，重点检查 SQL 注入和 S3 权限配置问题
```

## 五、常见问题与解决方案

### Q1：安装插件时提示 `Plugin not found`

这通常是因为本地插件市场索引过期。执行以下命令更新：

```bash
/plugin marketplace update claude-plugins-official
```

如果仍有问题，尝试手动添加仓库：

```bash
/plugin marketplace add aws/agent-toolkit-for-aws
```

### Q2：运行时报错 `Credentials not found`

文档搜索和技能发现**不需要** AWS 凭证。但执行写操作（如部署资源）需要有效的 AWS 凭证。确保：

```bash
# 检查凭证是否配置
aws configure

# 或使用 IAM Role（ECS/Lambda 环境）
aws sts get-caller-identity  # 验证身份
```

### Q3：API 调用报 403 Forbidden

检查 IAM 策略是否包含所需权限。Agent Toolkit 的一大优势是支持**代理专属 IAM 条件键**：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "*",
      "Condition": {
        "Bool": {
          "aws:MCP_Agent": "true"
        }
      }
    }
  ]
}
```

> 这里的 `aws:MCP_Agent: true` 条件键只有通过 MCP Server 的调用才会满足，普通的 CLI 操作不会触发。

### Q4：MCP Server 连接超时

如果 Agent 访问 MCP Server 超时，检查网络和区域配置：

```bash
# 确认 AWS 区域
aws configure get region

# MCP Server 目前主要在 us-east-1 运行，确保网络可访问
curl -s https://aws-mcp.us-east-1.api.aws/mcp
```

## 六、总结

AWS Agent Toolkit for AWS 是 AWS 面向 AI Agent 时代交出的一份重量级答卷。它通过统一的 MCP Server + 插件系统，让主流 AI 编码代理（Claude Code、Codex、Cursor、Kiro）都能原生支持 300+ AWS 服务，同时提供企业级的安全管控和审计能力。

对于开发者而言，这意味着可以在 AI 助手的辅助下，用自然语言完成 AWS 上的复杂运维任务——从 CDK 部署到数据湖 ETL，从安全扫描到渗透测试，Agent Toolkit 几乎覆盖了所有主流场景。

项目地址：[https://github.com/aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws)

官方文档：[https://docs.aws.amazon.com/agent-toolkit/latest/userguide/](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/)
