---
title: "Anthropic Skills：用文件夹教 Claude 专业技能的开源框架"
date: 2026-05-29
draft: false
categories: ["AI", "开源项目"]
tags: ["Claude", "Anthropic", "Agent", "Skills", "开源"]
description: ""
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
ShowRssButtonInSectionTerm: true
UseHugoToc: true
---

## 一、项目概述

**Anthropic Skills** 是 Anthropic 官方开源的技能（Skills）框架，旨在通过简单的文件夹结构为 Claude 提供专业任务能力。每个 Skill 是一个包含 `SKILL.md` 指令文件的独立文件夹，Claude 在运行时动态加载这些指令，从而在文档创建、数据分析、Web 测试等特定领域获得显著增强的表现。

核心特性包括：
- **零代码门槛**：只需创建一个包含 YAML frontmatter + Markdown 指令的 `SKILL.md` 文件即可定义技能
- **多平台支持**：同时适用于 Claude Code、Claude.ai 和 Claude API
- **即插即用的插件市场**：通过 Plugin marketplace 一键安装和分发技能
- **丰富示例**：涵盖创意设计、开发技术、企业沟通、文档处理四大领域

## 二、技术原理

### 2.1 技能定义规范

每个 Skill 的核心是 `SKILL.md` 文件，采用 YAML frontmatter + Markdown 正文的混合格式：

```yaml
---
name: my-skill-name
description: A clear description of what this skill does and when to use it
---

# My Skill Name

[Add your instructions here that Claude will follow when this skill is active]
```

frontmatter 仅需两个字段：`name`（唯一标识符，小写+连字符）和 `description`（功能描述与触发条件）。Markdown 正文部分则承载详细的执行指令、示例和约束。

### 2.2 动态加载机制

Claude 在对话过程中根据用户输入与 Skill 的 `description` 匹配，动态决定是否激活某个 Skill。这种按需加载的设计避免了上下文膨胀，同时确保专业指令在关键时刻生效。

### 2.3 插件市场架构

Skills 通过 Claude Code 的 Plugin marketplace 分发。仓库本身可注册为 marketplace：

```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

底层基于 Git 仓库的标准目录结构，无需额外的包管理器或注册中心。

### 2.4 开放协议设计

大部分 Skills 采用 Apache 2.0 开源协议，但核心文档处理技能（docx、pdf、pptx、xlsx）采用 source-available 协议——这反映了 Anthropic 在开放生态与商业产品之间的平衡策略。

## 三、安装与快速开始

### 环境要求

- Claude.ai 付费账户 或 Claude Code 或 Claude API 访问权限

### Claude Code 中使用

```bash
# 注册 marketplace
/plugin marketplace add anthropics/skills

# 安装文档技能集
/plugin install document-skills@anthropic-agent-skills

# 安装示例技能集
/plugin install example-skills@anthropic-agent-skills
```

安装后直接在对话中提及技能即可触发，例如：
> "Use the PDF skill to extract the form fields from `path/to/some-file.pdf`"

### Claude.ai 中使用

付费计划用户可直接上传自定义 Skill 或使用内置技能，参考官方文档 [Using skills in Claude](https://support.claude.com/en/articles/12512180-using-skills-in-claude)。

### Claude API 中使用

通过 [Skills API Quickstart](https://docs.claude.com/en/api/skills-guide#creating-a-skill) 接口上传和管理自定义技能。

## 四、使用方法与实战

### 4.1 技能分类概览

仓库中的技能分为四大类：

| 类别 | 示例 | 说明 |
|------|------|------|
| 创意与设计 | Art、Music、Design | 艺术创作、音乐生成、视觉设计 |
| 开发与技术 | Web App Testing、MCP Server | 自动化测试、MCP 服务生成 |
| 企业与沟通 | Communications、Branding | 企业沟通模板、品牌规范 |
| 文档处理 | docx、pdf、pptx、xlsx | 生产级文档创建与编辑 |

### 4.2 创建自定义 Skill

使用模板快速创建：

```bash
# 克隆模板
cp -r template/ my-custom-skill/
```

编辑 `SKILL.md`，定义清晰的触发条件和执行指令。关键原则：
- `description` 要足够具体，避免误触发
- 指令中包含具体示例和边界条件
- 考虑错误处理和回退策略

### 4.3 实战：企业品牌文档生成

假设需要让 Claude 按公司品牌规范生成文档，可创建一个 Skill 包含：
- 品牌色彩和字体规范
- 文档模板结构
- 术语表和写作风格指南
- Logo 使用规则

Claude 加载此 Skill 后，所有文档生成操作都会自动遵循这些规范。

## 五、常见问题与解决方案

**Q: 安装 Skill 后没有生效？**
确保 Skill 的 `description` 准确描述了触发场景，Claude 基于此字段进行匹配。过于宽泛或模糊的描述会导致匹配失败。

**Q: 自定义 Skill 与内置 Skill 冲突？**
同名 Skill 会产生冲突。建议为自定义 Skill 使用独特的前缀命名。

**Q: 文档处理技能是开源的吗？**
docx、pdf、pptx、xlsx 四个核心文档技能是 source-available（源码可见但非开源），仅供参考学习。其他示例技能均为 Apache 2.0。

**Q: 能否在团队中共享 Skills？**
可以通过 Git 仓库作为 Plugin marketplace 实现团队共享，团队成员只需添加同一个 marketplace 地址即可。

## 六、总结

Anthropic Skills 代表了一种轻量级但强大的 AI 能力扩展范式——用人类可读的 Markdown 指令而非代码来增强 AI 的专业能力。这种设计大幅降低了 AI 定制化的门槛，使非技术用户也能通过编写自然语言指令来"训练" Claude 完成特定任务。对于正在构建 AI Agent 的开发者而言，Skills 框架提供了一种优雅的提示工程标准化方案，值得深入研究和借鉴。

> 项目地址：[https://github.com/anthropics/skills](https://github.com/anthropics/skills)
