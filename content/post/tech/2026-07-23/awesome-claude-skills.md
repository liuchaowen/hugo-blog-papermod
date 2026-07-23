---
title: "Awesome Claude Skills：汇聚 1000+ 生产级 AI 技能的开源宝库"
date: "2026-07-23"
description: "Awesome Claude Skills 是 ComposioHQ 维护的超大规模 Claude AI 技能集合，涵盖文档处理、开发工具、数据分析、办公自动化等 12 大领域，支持 Claude.ai、Claude Code、Cursor、Gemini CLI 等主流 AI 平台。"
author: "Cheman"
slug: "awesome-claude-skills"
draft: false
categories: ["技术", "AI工具"]
tags: ["Claude", "AI Agent", "GitHub", "开源", "技能集合"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**awesome-claude-skills**，这是一个由 ComposioHQ 维护的 Claude AI 技能大百科，汇集了 1000+ 个生产级可用的 Claude Skills，覆盖从文档处理到企业自动化的全场景。

## 一、项目概述

Claude Skills 是 Anthropic 于 2025 年 10 月推出的可复用指令包格式，每个技能是一个文件夹，包含 `SKILL.md` 文件（YAML frontmatter + Markdown 指令），以及可选的脚本、模板和资源文件。2025 年 12 月，Anthropic 将其正式开源为开放标准，目前已被 Claude Code、Claude.ai、Claude API、OpenAI Codex、Cursor、Gemini CLI、Antigravity、Windsurf 等主流平台广泛支持。

awesome-claude-skills 的核心价值在于：

- **规模庞大**：收录 1000+ 生产级技能，覆盖 12 个大类
- **跨平台兼容**：一次编写，可在所有支持 Skills 的 AI 平台上使用
- **渐进加载**：会话启动时 AI 仅看到每个技能的名称和描述（约 100 tokens），只有当技能被判定相关时才加载完整 SKILL.md（通常 < 5000 tokens），真正实现"一个 agent 承载数百技能不撑爆上下文"
- **Composio 生态集成**：内置 connect-apps 插件，让 Claude 连接到 Gmail、Slack、GitHub、Notion 等 500+ 应用，执行真实操作（发邮件、创 issue、推送消息等）

## 二、技术原理

### Skills 的三层架构

Anthropic 将 Skills 与 MCP 做了清晰的职责划分：

| 层次 | 定位 | 职责 |
|------|------|------|
| **MCP** | 连接层 | 负责 agent 与外部系统的连接——认证、传输、工具发现 |
| **Tools** | 操作层 | agent 调用的具体函数（如 `send_email()`） |
| **Skills** | 行为层 | 定义工作流——做什么、按什么顺序、有什么护栏 |

生产环境中三层协同运行：MCP 提供访问通道，Tools 执行具体动作，Skills 控制行为逻辑。

### 标准技能目录结构

```
skill-name/
├── SKILL.md          # 必需：技能元数据与指令
├── scripts/          # 可选：辅助脚本
├── templates/        # 可选：文档模板
└── resources/        # 可选：参考文件
```

### SKILL.md 标准格式

```markdown
---
name: my-skill-name
description: 技能描述（会话启动时仅加载此处，约 100 tokens）
---

# My Skill Name

## When to Use This Skill
- 使用场景 1
- 使用场景 2

## Instructions
[详细指令]

## Examples
[实战示例]
```

## 三、收录的技能分类一览

### 文档处理

- **docx** — 创建、编辑、带批注的 Word 文档
- **pdf** — 提取 PDF 文本/表格/元数据，合并与标注
- **pptx** — 读取和生成 PPT 幻灯片
- **xlsx** — 电子表格操作：公式、图表、数据转换
- **Master Claude for Legal** — 面向法律团队的技能包，含 NDA 分类、多方版本差异、引用验证等

### 开发与代码工具

- **artifacts-builder** — 在 claude.ai 上构建复杂 React HTML 工件
- **aws-skills** — CDK 开发最佳实践、成本优化、Serverless 架构模式
- **great_cto** — 7 个专业子 agent（技术负责人、资深开发、QA、架构评审等），覆盖完整 SDLC 流程
- **MCP Builder** — 指南教程，指导用 Python/TypeScript 构建高质量 MCP 服务器
- **Playwright Browser Automation** — 模型调用的 Playwright 自动化测试
- **Skill Creator** — 创建有效 Claude Skills 的完整指南（本仓库的核心元技能）

### 数据与分析

- **recursive-research** — 递归式深度研究，支持 PhD 级别跨领域调研，含磁盘检查点容错
- **postgres** — 对 PostgreSQL 数据库执行安全的只读 SQL 查询
- **deep-research** — 用 Google Gemini Deep Research Agent 执行多步骤自主调研

### 生产力与协作

- **solo-skills** — 面向独立开发者的 7 个双语技能（英文+中文）：发推文、客户邮件、决策框架、项目复盘
- **n8n-skills** — 让 AI 直接理解和操作 n8n 工作流
- **tapestry** — 将相关文档互连并总结为知识网络

### Composio App Automation（78 个 SaaS 应用自动化）

通过 Rube MCP (Composio) 提供 78 个预建工作流技能，覆盖：

- **CRM**：Close、HubSpot、Pipedrive、Salesforce、Zoho CRM
- **项目管理**：Asana、Jira、Linear、Monday.com、Notion、ClickUp
- **通讯**：Slack、Telegram、WhatsApp、Discord、Microsoft Teams
- **代码与 DevOps**：GitHub、GitLab、Bitbucket、Vercel、Sentry、Datadog
- **邮件**：Gmail、Outlook、SendGrid、Postmark
- **数据分析**：Google Analytics、Mixpanel、PostHog、Amplitude
- **设计协作**：Figma、Canva、Miro、Webflow、Confluence

## 四、快速上手

### 方式一：通过 Claude.ai 使用

1. 在聊天界面点击技能图标（🧩）
2. 从市场添加技能或上传自定义技能
3. Claude 自动根据任务激活相关技能

### 方式二：通过 Claude Code 使用

```bash
# 1. 创建技能目录
mkdir -p ~/.config/claude-code/skills/

# 2. 安装技能
cp -r skill-name ~/.config/claude-code/skills/

# 3. 验证元数据
head ~/.config/claude-code/skills/skill-name/SKILL.md

# 4. 启动 Claude Code，技能自动加载
claude
```

### 方式三：通过 API 使用

```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    skills=["skill-id-here"],
    messages=[{"role": "user", "content": "Your prompt"}]
)
```

### 通过 Composio 连接 500+ 应用

```bash
# 1. 安装插件
claude --plugin-dir ./connect-apps-plugin

# 2. 运行设置
/connect-apps:setup

# 粘贴 API key（从 dashboard.composio.dev 免费获取）
```

配置完成后，Claude 就能操控 Gmail、Slack、GitHub、Notion 等 500+ 应用了。

## 五、常见问题

**Q: Skills 和 MCP 服务器有什么区别？**
MCP 定义的是 agent 如何连接外部系统（认证、传输、工具发现），Skills 定义的是 agent 连接成功后该怎么做——工作流逻辑、步骤顺序和护栏规则。两者是互补关系，不是替代关系。

**Q: 一个 agent 能加载多少个技能？**
由于 Skills 采用渐进加载机制（会话开始只加载元数据，必要时才加载完整内容），理论上可以承载数百甚至上千个技能而不影响上下文窗口。

**Q: Skills 是 Anthropic 独有的吗？**
不是。Skills 格式已于 2025 年 12 月正式开源为开放标准，得到了 OpenAI Codex、Cursor、Gemini CLI、Windsurf 等多个平台的支持。

**Q: 如何贡献新技能？**
在 GitHub 仓库中提交 PR，需遵循标准目录结构、通过跨平台测试，并提供清晰的文档说明。

## 六、总结

awesome-claude-skills 是一个极具工程价值的开源项目，它不仅是一个技能集合，更展示了 AI Agent 技能化的未来方向——将专业知识封装为可分发、可复用的指令包，让任何 AI 平台都能快速拥有垂直领域的深度能力。如果你正在构建 AI Agent 工作流，或希望 Claude 在专业领域表现更出色，这个项目值得深入研究。

GitHub 地址：[ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)
