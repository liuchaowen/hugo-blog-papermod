---
title: "Agent Plugins 1.0.0：中立开放的 AI Agent 插件打包标准"
date: 2026-08-09
description: "Agent Plugins 是一套厂商中立、开放可移植的 AI Agent 插件打包规范，定义了一套用于封装 Agent Skills 与 MCP Server 的便携包格式。本文解析其包结构、plugin.json 清单、技能发现机制与标准化价值。"
author: "Cheman"
slug: agent-plugins-spec
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI Agent, MCP, 插件标准]
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

今天在 GitHub Trending 上看到一个有意思的项目：**agentplugins/agent-plugins-spec**，它试图为「如何把可复用的 AI Agent 能力打包成可分发插件」给出一套厂商中立的标准答案。

## 一、项目概述

**Agent Plugins** 是一套开放、厂商中立（vendor-neutral）的标准，目标是把「能够扩展 AI Agent 的可复用组件」打包成可分发（distributable）的插件。随着 Agent 生态爆发，同一个 Skill 或 MCP Server 往往要在不同宿主（Claude、Cursor、各类 Agent 框架）之间反复移植，但各家对「插件长什么样、怎么发现、怎么加载」的定义各不相同，导致大量重复造轮子与碎片化。

Agent Plugins 规范的核心主张是：**定义一套可移植的包格式（portable package format）**，统一封装两类主流扩展——

- **Agent Skills**：以自然语言提示 + 指令形式存在的能力模块（本质就是一份 `SKILL.md`）；
- **MCP Servers**：通过 Model Context Protocol 暴露工具/资源的服务端。

当前已发布 **Specification 1.0.0** 正式版本，配套还提供了插件清单 schema、MCP 配置 schema、技术章程（Technical Charter）与未来规划文档。

核心特性可以概括为三点：

1. **中立性**：不绑定任何特定厂商或运行时，客户端如何把 Skill 暴露给模型由宿主自行决定；
2. **可移植性**：一个目录即一个插件，靠约定式结构即可被任意兼容客户端发现；
3. **可验证性**：通过 JSON Schema 对 `plugin.json` 与 `mcp` 配置进行校验，降低出错概率。

## 二、技术原理

### 2.1 包结构约定

最小的可用插件就是一个包含一个 Skill 的目录：

```text
hello-plugin/
├── plugin.json
└── skills/
    └── greet/
        └── SKILL.md
```

整个插件以「目录」为基本单元，无需打包成压缩文件即可被识别——这对本地开发、版本管理与 Git 分发都极为友好。

### 2.2 插件清单 plugin.json

`plugin.json` 是插件的入口清单，最精简形态只需声明 `$schema` 与 `name`：

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "$schema 指向官方发布的 1.0.0 插件 schema，编辑器可获得自动补全与校验"
  "name": "hello-plugin"
}
```

其中 `$schema` 字段是规范设计的关键：它把清单文件锚定到特定版本的 JSON Schema，任何兼容客户端或 IDE 都能据此校验插件合法性，避免「字段拼错导致静默失败」。

### 2.3 技能发现机制

Skill 以 `skills/<skill-name>/SKILL.md` 的约定路径存放，文件头是标准 YAML frontmatter：

```markdown
---
name: greet
description: Greet the user and offer help.
---

Greet the user and offer help.
```

客户端加载插件的流程被规范明确为两步：

1. 读取根目录的 `plugin.json` 识别这是一个插件；
2. 遍历 `skills/` 目录，发现并解析每个 `SKILL.md`。

注意规范刻意**不规定**客户端如何把这些 Skill 呈现给用户或模型——加载策略、触发方式、UI 入口都留给宿主实现，从而最大化兼容性。

### 2.4 MCP 配置标准化

除 Skill 外，规范还定义了 `mcp.schema.json`，统一描述插件内含的 MCP Server 启动配置（命令、参数、环境变量等）。这意味着一个插件可以同一份声明同时携带「提示型 Skill」与「工具型 MCP Server」，宿主按需启用。

## 三、安装与快速开始

Agent Plugins 本身是一套**规范**而非运行时，因此「安装」指的是让一个兼容客户端识别你的插件目录。最简实践如下。

**环境要求**：任意支持 Agent Plugins 规范的客户端（或你自己实现的加载器）。

**创建最小插件**：

```bash
mkdir -p hello-plugin/skills/greet
```

写入 `hello-plugin/plugin.json`：

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "hello-plugin"
}
```

写入 `hello-plugin/skills/greet/SKILL.md`：

```markdown
---
name: greet
description: Greet the user and offer help.
---

Greet the user and offer help.
```

**最简运行示例**：将上述目录交给兼容客户端，客户端读 `plugin.json` → 发现 `skills/greet/SKILL.md` → 注册 `greet` 技能。无需构建、无需注册中心。

## 四、使用方法与实战

### 4.1 基础用法：组合多个 Skill

一个插件可包含多个 Skill，目录即命名空间：

```text
my-plugin/
├── plugin.json
└── skills/
    ├── greet/SKILL.md
    └── summarize/SKILL.md
```

### 4.2 进阶用法：携带 MCP Server

借助 `mcp.schema.json`，插件可声明工具服务。典型 `plugin.json` 扩展示意：

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "toolkit-plugin",
  "mcp": {
    "command": "npx",
    "args": ["-y", "@my-org/mcp-server"],
    "env": { "API_KEY": "${PLUGIN_API_KEY}" }
  }
}
```

宿主据此拉起 MCP Server，使插件同时具备「提示指令 + 真实工具调用」双重能力。

### 4.3 实际项目示例

假设你要封装一套「内部知识库问答」能力，可发布为一个插件：

- `skills/answer/SKILL.md`：指导模型何时检索、如何引用来源；
- `mcp` 配置：指向部署好的检索服务；
- `plugin.json`：声明名称与 schema 版本。

团队成员克隆仓库即获得完整能力包，无需逐条复制提示词或手动配置 MCP。

## 五、常见问题与解决方案

**Q1：没有 `plugin.json` 还能被识别吗？**
不能。规范以 `plugin.json` 作为插件身份入口，缺失则该目录不被视为插件。

**Q2：Skill 的 `name` 必须与目录名一致吗？**
`SKILL.md` frontmatter 中的 `name` 是技能的规范名，目录名是物理路径；建议保持一致以避免歧义，但加载逻辑以 frontmatter 为准。

**Q3：换了 schema 版本会怎样？**
`$schema` 锚定具体版本（如 `1.0.0`），跨版本时客户端应按对应 schema 校验，避免用新规范解析旧插件产生误判。

**Q4：客户端必须支持 MCP 吗？**
不必。规范允许客户端仅实现 Skill 子集；只含 Skill 的插件在所有兼容客户端均可工作，MCP 部分由支持的宿主启用。

**Q5：和各家私有插件格式冲突吗？**
Agent Plugins 刻意保持中立、只定义包格式与发现机制，不抢占宿主的加载/触发策略，因此可作为「底层公约数」与厂商格式共存或互相转换。

## 六、总结

Agent Plugins 1.0.0 用极简的目录约定 + 版本化 JSON Schema，把「AI Agent 能力如何打包、分发、发现」这件本应标准化的事正式落地为开放规范。它不取代宿主运行时的创新，而是提供一层可移植的语义底座——让一个 Skill 或 MCP Server 能像容器镜像一样，在任意兼容环境中被一致地加载。对正在构建 Agent 平台、插件市场或内部能力库的团队而言，这是一个值得跟进的事实标准雏形。
