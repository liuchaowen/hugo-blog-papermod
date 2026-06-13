---
title: "Agency Agents：打造你的AI专属团队"
date: 2026-06-13
description: "一个开源的AI Agent集合项目，包含100多个专业角色定义，覆盖工程、设计、营销、安全等16个部门，支持Claude Code、Cursor、GitHub Copilot等主流工具集成，让你的AI助手拥有专业人格和交付能力。"
author: "Cheman"
slug: agency-agents
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "AI Agent", "开源项目", "多Agent系统", "提示工程"]
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

今天在 GitHub Trending 上看到一个非常有意思的项目：**Agency Agents**，它把AI角色定义做成了一个完整的"代理公司"，包含100多个专业Agent，每个都有独特的人格、工作流程和交付标准。

## 一、项目概述

Agency Agents 是一个开源的AI Agent角色集合项目，由 msitarzewski 团队开发并维护。与市面上常见的通用提示词模板不同，这个项目的核心理念是：**每个Agent都应该是一个专家，而不是一个泛泛的助手**。

项目核心特性：

- **16个专业部门**：工程、设计、付费媒体、销售、营销、产品、项目管理、测试、安全、支持、空间计算等
- **100+专业Agent**：前端开发者、后端架构师、UI设计师、增长黑客、渗透测试工程师、SRE等
- **人格驱动设计**：每个Agent都有独特的沟通风格、专业背景和工作方式
- **交付导向**：不是空谈，而是真正产出代码、文档、设计稿
- **多工具支持**：Claude Code、Cursor、GitHub Copilot、OpenCode、Windsurf、Kimi Code等

### 为什么这个项目值得关注？

传统的AI提示词往往过于通用，比如"帮我写一个React组件"这样的请求，AI可能会给你一个基础但不够专业的答案。而Agency Agents的做法是：让AI扮演一个真实的"前端开发者"角色，它不仅懂React，还了解性能优化、无障碍设计、测试驱动开发等专业领域。

## 二、技术原理

### 2.1 架构设计

Agency Agents 采用"Agent即服务"的架构理念：

```
┌─────────────────────────────────────────┐
│          The Agency (代理公司)           │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │Engineering│  │  Design  │  │ Sales  │ │
│  │ Division  │  │ Division │  │Division│ │
│  └──────────┘  └──────────┘  └────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Marketing│  │  Product │  │Testing │ │
│  │ Division  │  │ Division │  │Division│ │
│  └──────────┘  └──────────┘  └────────┘ │
│        ... 16个部门 ...                  │
└─────────────────────────────────────────┘
              ▼
    ┌─────────────────────┐
    │   Agent Definition   │
    │  - Identity & Traits │
    │  - Core Mission      │
    │  - Workflows         │
    │  - Deliverables      │
    │  - Success Metrics   │
    └─────────────────────┘
```

每个Agent的定义文件（Markdown格式）包含：

1. **身份特征**：我是谁，我的专业背景
2. **核心使命**：我解决什么问题
3. **工作流程**：我如何完成任务
4. **技术交付物**：代码示例、文档模板
5. **成功指标**：如何衡量我的工作质量

### 2.2 核心技术栈

- **Markdown格式定义**：易于阅读、编辑和版本控制
- **Shell脚本集成**：自动化安装和转换工具
- **多平台适配器**：针对不同AI工具的格式转换

以前端开发者Agent为例，其定义文件片段：

```markdown
# Frontend Developer

## Identity
You are a senior frontend engineer specializing in modern JavaScript frameworks.
You care about performance, accessibility, and developer experience.

## Core Mission
Transform design specs into production-ready, accessible web applications.

## Technical Expertise
- React 18+ with hooks, Suspense, Server Components
- Vue 3 Composition API
- TypeScript strict mode
- Tailwind CSS, CSS-in-JS
- Testing: Jest, React Testing Library, Cypress
```

### 2.3 设计模式

项目采用了几个关键的提示工程模式：

**1. 角色锚定（Role Anchoring）**

```python
# 不是：
"帮我优化这个React组件"

# 而是：
"作为Senior Frontend Developer，我将分析这个React组件的性能瓶颈，
从Core Web Vitals角度评估，并提供具体的优化方案..."
```

**2. 工作流驱动（Workflow-Driven）**

每个Agent都有明确的工作流程定义：

```markdown
## Workflow

1. **Discovery Phase**
   - Understand requirements
   - Identify stakeholders
   - Define success criteria

2. **Planning Phase**
   - Architecture decisions
   - Technology selection
   - Risk assessment

3. **Implementation Phase**
   - Write clean, tested code
   - Document decisions
   - Seek feedback

4. **Delivery Phase**
   - Deploy to staging
   - Monitor metrics
   - Iterate based on feedback
```

**3. 交付物模板（Deliverable Templates）**

以UI设计师Agent为例，它提供了实际的设计交付模板：

```markdown
## Design Deliverable Template

### Component Specification
- **Name**: [Component Name]
- **Purpose**: [What problem it solves]
- **States**: Default, Hover, Active, Disabled, Loading, Error
- **Accessibility**: ARIA labels, keyboard navigation

### Design Tokens
- Colors: primary, secondary, surface, error, success
- Typography: heading, body, caption
- Spacing: xs, sm, md, lg, xl
- Shadows: subtle, medium, strong
```

## 三、安装与快速开始

### 3.1 环境要求

- Bash shell（macOS/Linux）
- Git
- 一个支持的AI工具（Claude Code、Cursor等）

### 3.2 安装步骤

**方式一：一键安装（推荐）**

```bash
# 克隆仓库
git clone https://github.com/msitarzewski/agency-agents.git
cd agency-agents

# 使用交互式向导安装
./scripts/install.sh

# 或指定工具和部门
./scripts/install.sh --tool claude-code --division engineering,design
```

**方式二：手动安装**

```bash
# 只安装前端开发者Agent
cp engineering/engineering-frontend-developer.md ~/.claude/agents/

# 安装整个工程部门
cp engineering/*.md ~/.claude/agents/
```

**方式三：多工具集成**

```bash
# 生成所有工具的集成文件
./scripts/convert.sh

# 安装到Cursor
./scripts/install.sh --tool cursor

# 安装到GitHub Copilot
./scripts/install.sh --tool copilot

# 安装到OpenCode
./scripts/install.sh --tool opencode --division engineering --dry-run
```

### 3.3 最简运行示例

安装完成后，在Claude Code中激活Agent：

```
用户：Hey Claude，激活Frontend Developer模式，
帮我构建一个响应式的导航组件。

Claude：好的，我已激活Frontend Developer Agent。
作为Senior Frontend Engineer，我将：
1. 分析组件需求和无障碍要求
2. 设计组件API和状态管理
3. 编写React + TypeScript实现
4. 添加单元测试和Storybook文档
...
```

## 四、使用方法与实战

### 4.1 基础用法：单一Agent调用

**场景：构建安全的API端点**

```
激活Backend Architect Agent，
设计一个用户认证API，要求：
- JWT token认证
- 刷新token机制
- 速率限制
- 审计日志
```

Backend Architect会提供：

1. 架构图和决策记录（ADR）
2. API规范（OpenAPI格式）
3. 数据库迁移脚本
4. 实现代码（带错误处理）
5. 安全检查清单

### 4.2 进阶用法：多Agent协作

**场景：完整的产品开发流程**

```bash
# 步骤1：需求分析
激活Product Manager Agent
→ 输出PRD、用户故事、优先级矩阵

# 步骤2：技术设计
激活Software Architect Agent
→ 输出系统架构图、技术选型文档

# 步骤3：并行开发
激活Frontend Developer Agent + Backend Architect Agent
→ 前后端代码、API契约

# 步骤4：质量保证
激活Code Reviewer Agent + Testing Agent
→ Code Review报告、测试覆盖率报告

# 步骤5：部署上线
激活DevOps Automator Agent
→ CI/CD配置、监控仪表板
```

### 4.3 实际项目示例：从零搭建电商后台

以下是一个真实的多Agent协作流程：

**阶段一：需求与设计（1-2天）**

```markdown
1. UX Researcher Agent
   - 用户访谈脚本
   - 痛点分析报告
   - 用户旅程地图

2. UI Designer Agent
   - 设计系统（颜色、字体、间距）
   - 核心页面线框图
   - 高保真原型

3. Software Architect Agent
   - 技术栈决策：Next.js + tRPC + Prisma + PostgreSQL
   - 数据库Schema设计
   - API架构设计
```

**阶段二：开发与测试（3-5天）**

```markdown
1. Frontend Developer Agent
   - React组件库
   - 状态管理（Zustand）
   - 表单验证（React Hook Form + Zod）

2. Backend Architect Agent
   - tRPC路由实现
   - 数据库迁移脚本
   - Redis缓存策略

3. Security Architect Agent
   - 认证授权实现（NextAuth.js）
   - 安全审计日志
   - CSP配置

4. Testing Agent
   - Vitest单元测试
   - Playwright E2E测试
   - 测试覆盖率报告（92%）
```

**阶段三：部署与监控（1天）**

```markdown
1. DevOps Automator Agent
   - Docker配置
   - GitHub Actions CI/CD
   - Vercel部署配置

2. SRE Agent
   - 监控仪表板（Sentry + Vercel Analytics）
   - 告警规则配置
   - SLO定义（99.9%可用性）
```

## 五、常见问题与解决方案

### 5.1 安装问题

**问题：OpenCode安装时Agent数量超限**

```
错误：OpenCode only registers ~119 agents, 
remaining agents are silently dropped.
```

**解决方案**：

```bash
# 只安装特定部门
./scripts/install.sh --tool opencode --division engineering,security

# 或使用--dry-run预览
./scripts/install.sh --tool opencode --division engineering --dry-run
```

**问题：权限不足**

```bash
chmod +x scripts/install.sh scripts/convert.sh
```

### 5.2 使用问题

**问题：Agent响应不够专业**

原因：可能是激活方式不正确，或Agent未被正确加载。

解决方案：

```
# 在Claude Code中明确指定Agent文件
使用 ~/.claude/agents/engineering-frontend-developer.md 中的定义，
帮我优化这个React组件...
```

**问题：多个Agent冲突**

当多个Agent的建议不一致时：

```markdown
# 解决方案：引入Reality Checker Agent
作为Reality Checker，我需要审核Frontend Developer和
Backend Architect的建议，识别：
1. 技术可行性
2. 时间成本
3. 维护成本
4. 最佳实践对齐
```

### 5.3 性能优化

**问题：响应速度慢**

优化建议：

1. **精简Agent定义**：只包含必要的上下文
2. **按需加载**：不安装所有部门，只安装需要的
3. **工作流拆分**：复杂任务分解为多个小任务

**示例：优化前端开发Agent的提示词**

```markdown
# 不要一次性加载所有信息
- ❌ 加载整个React生态系统知识
- ✅ 只加载当前任务相关的模式

# 使用渐进式上下文
- 第一轮：理解需求
- 第二轮：设计方案
- 第三轮：实现代码
```

## 六、项目亮点与启示

### 6.1 核心创新点

**1. 从"工具"到"团队"的转变**

传统AI助手是工具思维："我需要一个工具帮我写代码"
Agency Agents是团队思维："我需要一个前端专家加入我的团队"

**2. 人格化设计的价值**

每个Agent都有独特的"性格"：

- Frontend Developer：注重性能和用户体验，说话简洁专业
- Growth Hacker：充满好奇心，喜欢实验和数据
- Security Architect：谨慎保守，总是考虑最坏情况
- Whimsy Injector：活泼有趣，总想加点"惊喜"元素

这种人格化设计让交互更自然，也让Agent的建议更符合专业角色的思维方式。

**3. 交付导向而非对话导向**

很多提示词项目停留在"对话"层面，而Agency Agents强调"交付"：

```markdown
## Code Reviewer Agent的交付物

✅ Code Review报告（Markdown格式）
✅ 安全问题清单（带严重程度评级）
✅ 性能优化建议（带基准测试代码）
✅ 重构建议（带代码diff）
✅ 最佳实践对齐检查
```

### 6.2 实际应用场景

**场景一：初创公司MVP开发**

```bash
# 只需要3个Agent
1. Rapid Prototyper Agent → 快速验证想法
2. Frontend Developer Agent → 打磨UI
3. Backend Architect Agent → 稳固后端

# 1-2周内交付MVP
```

**场景二：企业级项目重构**

```bash
# 需要6-8个Agent协作
1. Software Architect Agent → 制定重构策略
2. Code Reviewer Agent → 评估现有代码
3. Database Optimizer Agent → 优化查询
4. Security Architect Agent → 安全加固
5. SRE Agent → 可观测性提升
6. Technical Writer Agent → 文档迁移
```

**场景三：个人学习与技能提升**

```markdown
# 作为学习者，你可以：
1. 激活Senior Developer Agent
2. 提交你的代码请求Review
3. Agent会像真实的高级工程师一样，
   指出问题、解释原理、提供改进方案

# 这就像有一个24/7的导师
```

### 6.3 对开发者的启示

**1. 提示词工程的核心是"角色定义"**

不是告诉AI"做什么"，而是告诉AI"你是谁"：

```markdown
# 低效的提示词
"帮我优化这个函数的性能"

# 高效的角色定义
"作为Performance Optimization Specialist，
我将：
1. 分析时间复杂度和空间复杂度
2. 识别性能瓶颈
3. 提供具体优化方案（算法改进/缓存策略/并行化）
4. 提供基准测试代码验证优化效果"
```

**2. 可复用性是关键**

Agency Agents把提示词变成了可复用的"资产"：

- 版本控制：跟踪每个Agent的演进
- 模块化组合：根据项目需求组合不同Agent
- 社区贡献：开源模式让最佳实践快速传播

**3. 多Agent系统是未来趋势**

单个AI模型的能力有限，但多个专业化Agent协作可以：

- 覆盖更广的知识领域
- 提供更深入的专家级建议
- 模拟真实团队的工作流程

## 七、总结

Agency Agents 代表了AI Agent开发的一个重要方向：**从通用助手到专业团队的演进**。它不仅仅是一个提示词集合，更是一套完整的"AI团队管理"方法论。

项目地址：[https://github.com/msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)

如果你正在寻找提升AI协作效率的方法，或者想了解如何构建专业的多Agent系统，这个项目绝对值得深入研究。它不仅提供了100多个现成的Agent模板，更重要的是展示了一种新的思维方式：**把AI当作你的专业团队，而不是一个万能工具**。

---

*本文基于 GitHub Trending 项目 [agency-agents](https://github.com/msitarzewski/agency-agents) 编写，项目遵循 MIT 开源协议。*
