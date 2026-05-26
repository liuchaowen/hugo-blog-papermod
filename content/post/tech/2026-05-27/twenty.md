---
title: "Twenty：可代码化定制的企业级开源 CRM 平台技术深度解析"
date: 2026-05-27
draft: false
categories: [开源项目, CRM]
tags: [TypeScript, React, NestJS, CRM, 开源, GitHub Trending]
description: "深入解析 Twenty 开源 CRM 的架构设计、技术栈选型与技术实现细节"
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
ShowRssButtonInSectionTermList: true
UseHugoToc: true
---

## 一、项目概述

**Twenty** 是一个开源的现代化 CRM（客户关系管理）平台，定位为"技术团队构建、发布和版本控制 CRM 的首选方案"。与传统 CRM 不同，Twenty 允许开发者将 CRM 配置作为代码来管理，实现与现有技术栈的无缝集成。

**核心特性：**
- **应用化扩展**：通过 Twenty CLI 脚手架创建自定义应用，支持对象定义、字段配置、视图定制等
- **版本控制**：支持将 CRM 配置作为代码进行版本管理，实现 DevOps 流程集成
- **现代技术栈**：基于 TypeScript 全栈开发，前端 React + 后端 NestJS 的经典组合
- **AI 集成**：内置 AI Agent 和聊天功能，支持智能化客户关系管理
- **灵活部署**：支持 Cloud 托管、自托管（Docker Compose）和本地开发

**解决的核心问题：**
传统 CRM 系统通常存在定制困难、扩展性差、与现有技术栈集成复杂等问题。Twenty 通过将 CRM 配置代码化，让开发团队可以使用熟悉的工具链（Git、CI/CD、代码审查等）来管理 CRM 定制，大幅降低了定制成本和维护难度。

## 二、技术原理

### 2.1 架构设计

Twenty 采用 **Monorepo** 架构管理多个子项目，使用 **Nx** 作为构建系统，核心包包括：

- `twenty-server`：后端服务，基于 NestJS 框架
- `twenty-front`：前端应用，基于 React 构建
- `twenty-ui`：共享 UI 组件库
- `twenty-shared`：前后端共享类型和工具
- `twenty-sdk`：客户端 SDK
- `twenty-cli`：命令行工具，用于应用脚手架和发布

### 2.2 核心技术栈与选型理由

**后端技术栈：**
- **NestJS**：提供模块化、依赖注入等企业级特性，便于构建可维护的大型应用
- **PostgreSQL**：关系型数据库，适合 CRM 的复杂数据关系管理
- **Redis**：用于缓存和 BullMQ 消息队列，支持异步任务处理
- **BullMQ**：基于 Redis 的任务队列，处理后台任务（如邮件发送、数据同步等）

**前端技术栈：**
- **React 18**：主流前端框架，生态丰富
- **Jotai**：轻量级状态管理库，API 简洁，适合中型应用
- **Linaria**：零运行时 CSS-in-JS 方案，编译时提取样式，性能优秀
- **Lingui**：国际化库，支持编译时优化

**构建与工具链：**
- **Nx**：Monorepo 管理工具，提供增量构建、任务编排等能力
- **TypeScript 5.9.2**：类型安全，提升代码可维护性
- **Yarn 4.13.0**：支持 Plug'n'Play 和 Patches，依赖管理更可靠

### 2.3 关键设计模式

**1. 应用化扩展机制**

Twenty 的核心设计理念是"App as Code"。开发者可以通过 `create-twenty-app` 脚手架创建应用，定义自定义对象、字段和视图：

```typescript
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  nameSingular: 'deal',
  namePlural: 'deals',
  labelSingular: 'Deal',
  labelPlural: 'Deals',
  fields: [
    { name: 'name', label: 'Name', type: FieldType.TEXT },
    { name: 'amount', label: 'Amount', type: FieldType.CURRENCY },
    { name: 'closeDate', label: 'Close Date', type: FieldType.DATE_TIME },
  ],
});
```

这种设计模式借鉴了 Infrastructure as Code (IaC) 的思想，将 CRM 配置代码化，实现版本控制和自动化部署。

**2. 模块化 Monorepo 设计**

从 `package.json` 的 `workspaces` 配置可以看出，Twenty 将功能划分为 20+ 个独立包：

```json
"workspaces": {
  "packages": [
    "packages/twenty-front",
    "packages/twenty-server",
    "packages/twenty-emails",
    "packages/twenty-ui",
    // ... 更多包
  ]
}
```

这种设计的优势：
- **职责分离**：每个包职责单一，便于独立开发和测试
- **依赖共享**：通过 `twenty-shared` 共享类型定义和工具函数
- **增量构建**：Nx 可以智能识别受影响的包，只重新构建必要的部分

**3. 测试策略**

从 `jest.preset.js` 可以看到，Twenty 使用 Jest 作为测试框架，并针对 Lingui 的模块解析问题进行了特殊处理：

```javascript
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Override the new testEnvironmentOptions added in @nx/jest 22.3.3
  // which breaks Lingui's module resolution
  testEnvironmentOptions: {},
};
```

### 2.4 数据流分析

典型的 Twenty 应用数据流：

1. **客户端请求** → React 前端通过 `twenty-sdk` 发送 GraphQL 请求
2. **API Gateway** → NestJS 后端接收请求，进行认证和授权
3. **业务逻辑层** → 调用相应的 Service 处理业务逻辑
4. **数据访问层** → TypeORM 与 PostgreSQL 交互
5. **异步任务** → 通过 BullMQ 将耗时任务（如发送邮件）推入 Redis 队列
6. **响应返回** → 数据经过 DTO 转换后返回给客户端

## 三、安装与快速开始

### 3.1 环境要求

- **Node.js**：^24.5.0（从 `engines` 字段可知）
- **Yarn**：>=4.0.2（必须使用 Yarn，禁止使用 npm）
- **PostgreSQL**：关系型数据库
- **Redis**：缓存和消息队列

### 3.2 安装步骤

**方式一：Cloud 托管（推荐）**

访问 [twenty.com](https://twenty.com) 注册账号，一键创建 Workspace，无需任何基础设施配置。

**方式二：本地开发环境**

```bash
# 1. 克隆仓库
git clone https://github.com/twentyhq/twenty.git
cd twenty

# 2. 安装依赖（必须使用 Yarn）
yarn install

# 3. 启动开发服务器
yarn start
```

`yarn start` 会并发启动前端和后端服务，并通过 `wait-on` 等待后端就绪后启动 Worker。

**方式三：Docker Compose 自托管**

参考[官方文档](https://docs.twenty.com/developers/self-host/capabilities/docker-compose)使用 Docker Compose 部署完整环境。

### 3.3 最简运行示例

创建并发布一个简单的 Twenty 应用：

```bash
# 1. 脚手架创建应用
npx create-twenty-app my-app

# 2. 定义对象（编辑 src/main.ts）
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  nameSingular: 'contact',
  namePlural: 'contacts',
  labelSingular: 'Contact',
  labelPlural: 'Contacts',
  fields: [
    { name: 'firstName', label: 'First Name', type: FieldType.TEXT },
    { name: 'email', label: 'Email', type: FieldType.TEXT },
  ],
});

# 3. 发布到 Workspace
npx twenty app:publish --private
```

## 四、使用方法与实战

### 4.1 基础用法

**1. 管理客户数据**

Twenty 提供标准化的 CRM 功能：
- **Companies**（公司管理）：记录客户公司信息
- **People**（联系人管理）：管理客户联系人
- **Deals**（商机管理）：跟踪销售机会
- **Tasks**（任务管理）：安排跟进任务

**2. 自定义视图**

用户可以通过拖拽方式自定义列表视图、看板视图、日历视图等，满足不同业务场景需求。

**3. AI 辅助**

Twenty 内置 AI Agent，可以：
- 自动提取邮件中的联系人信息
- 智能推荐下一步行动
- 生成邮件回复草稿

### 4.2 进阶用法

**1. 应用开发**

通过 Twenty CLI 开发自定义应用，扩展 CRM 功能：

```typescript
// 定义自定义对象
export default defineObject({
  nameSingular: 'project',
  namePlural: 'projects',
  fields: [
    { name: 'name', label: 'Project Name', type: FieldType.TEXT },
    { name: 'status', label: 'Status', type: FieldType.SELECT, options: ['active', 'completed'] },
  ],
});

// 自定义视图
import { defineView } from 'twenty-sdk/define';

export default defineView({
  objectName: 'project',
  type: 'table',
  columns: ['name', 'status', 'createdAt'],
});
```

**2. 版本控制集成**

将 CRM 配置纳入 Git 管理：

```bash
# 导出当前配置
npx twenty config:export > config.json

# 提交到 Git
git add config.json
git commit -m "Update CRM configuration"
git push

# 在其他环境导入配置
npx twenty config:import < config.json
```

**3. Webhook 集成**

Twenty 支持 Webhook，可以与其他系统（如 ERP、邮件营销工具）实时同步数据。

### 4.3 实际项目示例

**场景：销售团队 CRM 定制**

某 B2B 销售团队需要定制 CRM 来跟踪复杂的销售流程：

1. **定义自定义对象**：`Deal`（商机）、`Contact`（联系人）、`Activity`（活动记录）
2. **添加自定义字段**：`Deal` 对象添加 `Contract Value`（合同金额）、`Expected Close Date`（预计成交日期）
3. **创建自定义视图**：看板视图按销售阶段分组，表格视图显示关键指标
4. **集成邮件系统**：通过 Webhook 将邮件往来记录自动同步到 Activity
5. **AI 辅助**：AI Agent 自动分析邮件内容，推荐下一步行动（如"发送报价单"）

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：`yarn install` 失败，提示 Node.js 版本不匹配

**原因**：Twenty 要求 Node.js ^24.5.0，当前版本不符合要求

**解决方案**：
```bash
# 使用 nvm 安装正确版本
nvm install 24.5.0
nvm use 24.5.0
```

从 `yarn.config.cjs` 可以看到，Twenty 在 `constraints` 中强制检查 Node.js 版本：

```javascript
const requiredNodeVersion = rootWorkspace.manifest.engines?.node;
const currentNodeVersion = process.version;
if (!semver.satisfies(currentNodeVersion, requiredNodeVersion)) {
  throw new Error(
    `Node version ${currentNodeVersion} doesn't match the required version, please use ${requiredNodeVersion}`,
  );
}
```

### 5.2 运行时错误

**问题**：Jest 测试失败，提示 Lingui 模块解析错误

**原因**：@nx/jest 22.3.3+ 添加了 `testEnvironmentOptions`，破坏了 Lingui 的模块解析

**解决方案**：
在 `jest.preset.js` 中覆盖配置（已完成）：

```javascript
module.exports = {
  ...nxPreset,
  testEnvironmentOptions: {},
};
```

### 5.3 性能问题

**问题**：Monorepo 构建缓慢

**原因**：Nx 默认全量构建，未利用增量构建能力

**解决方案**：
```bash
# 只构建受影响的包
npx nx run-many -t build --base=main

# 使用 Nx Cloud 分布式构建
npx nx run-many -t build --distribute-on=5
```

### 5.4 兼容性问题

**问题**：Yarn 版本不兼容

**原因**：Twenty 使用 Yarn 4.13.0（Berry），与 Yarn 1.x 不兼容

**解决方案**：
```bash
# 启用 Corepack（Node.js 自带的包管理器管理器）
corepack enable
corepack prepare yarn@4.13.0 --activate
```

## 六、总结

**Twenty** 是一个极具创新性的开源 CRM 项目，其核心价值在于：

1. **代码化配置**：将 CRM 定制从"点击配置"升级为"代码配置"，实现版本控制、代码审查、CI/CD 等现代化开发流程

2. **现代技术栈**：TypeScript 全栈 + React/NestJS + Nx Monorepo，保证了代码的可维护性和扩展性

3. **应用化扩展**：通过 Twenty CLI 和 SDK，开发者可以快速构建和发布自定义应用，满足个性化需求

4. **活跃社区**：项目在 GitHub 上获得大量 Star，Discord 社区活跃，文档完善

**适用场景：**
- 技术团队希望将 CRM 纳入现有技术栈和 DevOps 流程
- 需要高度定制化的 CRM 解决方案
- 希望避免传统 CRM 的供应商锁定和高昂定制成本

**未来展望：**
随着低代码/无代码平台的兴起，Twenty 的"App as Code"理念具有前瞻性。未来可能会看到更多企业采用类似的代码化配置方案，实现业务系统的灵活定制和高效管理。

**项目链接：**
- GitHub：https://github.com/twentyhq/twenty
- 官网：https://twenty.com
- 文档：https://docs.twenty.com
- Discord：https://discord.gg/cx5n4Jzs57
