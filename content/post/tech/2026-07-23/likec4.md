---
title: "LikeC4：用代码绘制软件架构图的利器"
date: "2026-07-23"
description: "LikeC4 是一款受 C4 Model 启发的软件架构建模语言，通过自定义 DSL 描述系统架构，自动生成美观、实时更新的架构图。本文深入解析其设计理念、核心特性和实战用法。"
author: "Cheman"
slug: likec4
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "架构图", "DSL", "C4Model", "LikeC4"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**LikeC4**，一款用代码描述软件架构并自动生成实时更新架构图的开源工具。它受经典 C4 Model 和 Structurizr DSL 启发，但在灵活性上更进一步——允许你完全自定义符号系统、元素类型和任意层级的嵌套结构，打造真正贴合团队需求的架构视图。

## 一、项目概述

LikeC4 的核心定位是"**架构即代码（Architecture as a Code）**"——用声明式的领域特定语言（DSL）描述软件系统，然后自动生成高质量的架构图。与 PlantUML、Mermaid 等传统方案相比，LikeC4 的最大差异在于**模型与视图分离**的设计哲学：你在 LikeC4 中定义的是抽象的架构模型，而具体的图表样式、布局和细节由视图层独立控制，同一个模型可以生成多种不同视角的图。

### 核心特性

- **自定义符号系统**：不强制使用 C4 的标准 Person/System/Container/Component 四层，你可以定义自己的元素类型、图标和关系类型。
- **多视图输出**：同一模型可生成多种图表——系统上下文图、容器图、组件图、部署图等。
- **实时预览**：内置 CLI 和 VS Code 插件，支持边写边看图的即时反馈。
- **代码溯源**：图表直接来源于代码描述，架构变更后图自动同步，解决了"架构文档过时"的长期痛点。
- **导出多格式**：支持 PNG、SVG、图片等多种导出格式，方便嵌入文档或幻灯片。
- **MCP 集成**：提供 Model Context Protocol 工具，可在 AI 编程工作流中调用。

### 技术栈

LikeC4 采用 **monorepo + TypeScript + pnpm** 管理，当前版本 v1.59.1，依赖 Node.js ≥22.22.3。项目包含 18 个独立包：

| 核心包 | 用途 |
|--------|------|
| `@likec4/core` | LikeC4 语言解析核心 |
| `@likec4/layouts` | 图表布局算法 |
| `@likec4/diagram` | 图表渲染引擎 |
| `@likec4/language-server` | LSP 实现（代码补全、跳转） |
| `@likec4/vscode` | VS Code 插件 |
| `@likec4/mcp` | MCP 协议集成 |
| `likec4-spa` | 在线预览页面（React） |

构建依赖 Graphviz（用于图形布局）和 Playwright（用于 E2E 测试截图）。

## 二、技术原理

### DSL 语言设计

LikeC4 的 DSL 语法简洁直观，以一个典型的微服务系统为例：

```likec4
model {
  user = person "用户" {
    this -> webapp "使用"
  }
  webapp = container "Web应用" {
    api = component "REST API"
    ui = component "前端界面"
    this -> api "调用"
    ui -> api "调用"
  }
  backend = container "后端服务" {
    svc = component "业务服务"
    db = database "数据库"
    svc -> db "读写"
  }
}

views {
  view of user {
    auto layout
    title "系统上下文"
  }
  
  view of webapp {
    auto layout
    title "容器图"
  }
}
```

这种 DSL 的设计优势在于：**开发者不需要了解图形渲染的细节，只需关注架构语义**。`auto layout` 指令让 LikeC4 自动计算最优节点位置，底层由 Graphviz 的 dot 算法提供支持。

### 模型-视图分离架构

LikeC4 将处理流程分为三个阶段：

1. **解析阶段（Parsing）**：将 LikeC4 DSL 源码解析为 AST，再转换为标准化的**抽象模型**（包含元素、关系、视图定义）。
2. **布局阶段（Layout）**：对每个视图，根据布局算法（如层次布局、力导向布局）计算节点坐标。
3. **渲染阶段（Rendering）**：基于布局结果，通过 SVG/Canvas 渲染最终图形。Dockerfile 显示底层依赖 Playwright 做浏览器渲染。

```
源码 (.likec4) → AST → 抽象模型 → 布局算法 → 渲染引擎 → SVG/PNG
```

### Graphviz 集成

LikeC4 的布局引擎深度依赖 Graphviz。Dockerfile 中构建了自定义 Graphviz 镜像，因为官方没有提供最新版本的预编译二进制。Graphviz 的 dot 语言负责计算层次图的拓扑排序和边路由，这正是 LikeC4 自动布局的技术基础。

### VS Code 插件工作原理

`@likec4/vscode` 插件集成了语言服务器（LSP），提供：
- 语法高亮与错误提示
- 自动补全（元素名、关系类型）
- 悬停文档
- 实时预览面板（边写边看图）

插件通过 WebSocket 与 `likec4-spa` 通信，后者负责图表渲染和预览。

## 三、安装与快速开始

### 环境要求

- Node.js ≥ 22.22.3（推荐使用 nvm 管理）
- Graphviz（可选，无 Graphviz 时部分布局功能受限）
- VS Code（可选，用于插件体验）

### 安装方式

```bash
# 全局安装 CLI
npm install -g likec4

# 或使用 npx 直接运行
npx likec4 start

# 使用 Docker（推荐，无需手动安装依赖）
docker run -p 5173:5173 -v $(pwd):/data likec4/likec4
```

### 快速开始

**方式一：使用在线模板（无需本地安装）**

访问 [https://template.likec4.dev/view/index](https://template.likec4.dev/view/index)，在浏览器中编辑 LikeC4 DSL，实时预览架构图，导出为图片。

**方式二：本地项目**

```bash
# 克隆模板仓库
npx degit likec4/template my-arch
cd my-arch

# 安装依赖
npm install

# 启动实时预览（http://localhost:5173）
npm run dev
```

**方式三：VS Code 插件**

1. 在 VS Code 扩展商店搜索 "LikeC4"，安装官方插件
2. 新建 `.likec4` 文件
3. 按 `Cmd/Ctrl + Shift + V` 打开预览面板

### Hello World 示例

创建一个 `system.likec4` 文件：

```likec4
model {
  user = person "终端用户"
  service = container "API 服务" {
    handler = component "请求处理器"
  }
  db = database "PostgreSQL"
  
  user -> service "HTTPS 请求"
  handler -> db "SQL 查询"
}

views {
  view of user {
    auto layout
    title "最简示例"
  }
}
```

运行 `npx likec4 start`，访问预览页面即可看到自动生成的架构图。

## 四、使用方法与实战

### 自定义元素类型

LikeC4 支持超越 C4 标准四层自定义元素类型。例如，描述一个 AI Agent 系统：

```likec4
model {
  user = person "用户"
  agent = container "AI Agent" {
    planner = component "规划器 (Planner)"
    executor = component "执行器 (Executor)"
    memory = component "记忆模块 (Memory)"
    
    planner -> memory "存储经验"
    planner -> executor "下发任务"
  }
  tools = container "外部工具" {
    search = component "搜索 API"
    calc = component "计算器"
  }
  
  user -> agent "自然语言指令"
  executor -> tools "调用工具"
}

styles {
  element "AI Agent" {
    color: #4A90E2
    style: bold
  }
}
```

### 与现有代码库集成

如果你想在已有项目中引入 LikeC4，可以：

1. **独立建模文件**：在项目中新建 `docs/architecture.likec4`，与业务代码分离。
2. **嵌入代码注释**：通过解析代码中的 LikeC4 注释，生成关联架构图。
3. **MCP 工具调用**：在 AI 编程助手（如 Cursor、Cline）中集成 LikeC4 MCP 工具，实时查询架构信息：

```bash
# 配置 MCP（参考 @likec4/mcp 文档）
```

### 导出与嵌入

```bash
# 导出为 SVG
likec4 export --format svg --output ./diagrams/

# 导出为 PNG
likec4 export --format png --output ./diagrams/

# 生成 PDF
likec4 export --format pdf --output ./diagrams/
```

生成的图片可无缝嵌入 Confluence、Notion、GitBook 等文档系统。

### CI/CD 集成

在 CI 流水线中自动生成架构图，确保文档与代码同步：

```yaml
# .github/workflows/arch-doc.yml
- name: Generate Architecture Diagrams
  run: |
    npx likec4 export --format png --output docs/diagrams/
    
- name: Commit diagrams
  run: |
    git config user.name "CI Bot"
    git add docs/diagrams/
    git diff --staged --exit-code || git commit -m "docs: auto-update architecture diagrams"
    git push
```

## 五、常见问题与解决方案

### Q1: 安装后运行 `likec4 start` 报错 "Graphviz not found"

**原因**：LikeC4 的自动布局依赖 Graphviz，未安装时会降级为简单布局，效果可能不理想。

**解决**：
```bash
# macOS
brew install graphviz

# Ubuntu/Debian
sudo apt-get install graphviz

# Windows (使用 WSL 或 Scoop)
scoop install graphviz
```

### Q2: Docker 镜像启动后预览页面空白

**原因**：通常是由于 Docker 容器内 Graphviz 渲染服务未正常启动。

**解决**：
```bash
# 验证 Graphviz 可用
docker run --rm likec4/likec4 dot -V

# 如仍有问题，尝试挂载本地缓存
docker run -p 5173:5173 -v $(pwd):/data \
  -v ~/.cache/likec4:/root/.cache/likec4 \
  likec4/likec4
```

### Q3: VS Code 插件预览不更新

**原因**：LSP 服务进程可能卡死。

**解决**：在 VS Code 中执行 `Cmd/Ctrl + Shift + P` → "Developer: Reload Window"，或手动重启 LSP 服务。

### Q4: 导出 PNG 分辨率过低

LikeC4 默认按屏幕分辨率渲染。如需高分辨率输出：
```bash
likec4 export --format png --scale 2 --output ./diagrams/
```
`--scale 2` 表示 2x 缩放，适合打印和幻灯片使用。

### Q5: 私有仓库如何接入 LikeC4？

LikeC4 的 MCP 工具支持 GitHub Personal Access Token 认证，可在 `~/.config/likec4/config.json` 中配置：

```json
{
  "github": {
    "token": "ghp_xxxx"
  }
}
```

## 六、总结

LikeC4 为"架构即代码"理念提供了一个**真正可落地**的工具链。相比 PlantUML，它更现代、更灵活；相比 Structurizr DSL，它的门槛更低、生态更丰富（VS Code 插件、在线 Playground、Docker 一键部署）。其模型-视图分离的设计使得同一架构模型可以服务于技术评审、团队沟通、文档维护等多个场景，从根本上解决了"架构图总是过时"的痛点。

如果你正在维护一个中型以上的系统，或者希望用更低成本建立团队共享的架构知识库，LikeC4 值得一试。从安装到跑通第一个示例不超过 5 分钟，**上手成本极低，天花板却很高**。
