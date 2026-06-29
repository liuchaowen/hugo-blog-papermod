---
title: "Logto：面向 SaaS 和 AI 应用的现代化开源身份认证基础设施"
date: 2026-06-29
description: "Logto 是一款开源的身份认证基础设施，专为 SaaS 和 AI 应用设计。它简化了 OIDC 和 OAuth 2.1 的复杂实现，提供多租户、企业级 SSO、RBAC 等功能，支持 30+ 框架 SDK，并原生适配 Model Context Protocol 和 AI Agent 架构。"
author: "Cheman"
slug: logto
draft: false
categories: [身份认证, 开源项目, SaaS]
tags: [GitHub, 开源, 身份认证, OIDC, OAuth, SaaS, AI]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Logto**，一款专为 SaaS 和 AI 应用打造的现代化开源身份认证基础设施。如果你曾经为 Auth0、Cognito 或 Firebase Auth 的复杂度、定价或锁定问题头疼过，Logto 可能会成为你的新选择。

## 一、项目概述

Logto 是一个基于 OpenID Connect (OIDC) 和 OAuth 2.1 标准的开源身份认证解决方案，旨在为 SaaS、AI 和 Agent 平台提供生产级的认证基础设施。它的核心定位是：

- **消除协议痛点**：将复杂的 OIDC 和 OAuth 2.1 协议封装成开发者友好的 API 和 SDK
- **开箱即用的多租户**：原生支持 SaaS 场景下的组织（Organization）和租户隔离
- **企业级能力**：内置企业 SSO、RBAC（基于角色的访问控制）、MFA（多因素认证）
- **AI 原生**：支持 Model Context Protocol (MCP) 和基于 Agent 的 AI 架构

项目采用 Monorepo 架构，使用 pnpm Workspaces 管理，核心组件包括：

| 组件 | 功能 |
|------|------|
| `packages/core` | 认证服务器核心，实现 OIDC/OAuth 协议 |
| `packages/console` | 管理控制台（React + Vite） |
| `packages/experience` | 用户登录体验 UI |
| `packages/cli` | 命令行工具，用于数据库迁移、连接器管理 |
| `packages/schemas` | 共享 TypeScript 类型定义和验证模式 |
| `packages/connectors` | 社交登录、邮件、短信等连接器 |

Logto 使用 **MPL-2.0 许可证**，属于弱 Copyleft，允许在闭源商业项目中使用，只需开放对 Logto 本身的修改。

## 二、技术原理

### 2.1 架构设计

Logto 采用前后端分离的微服务架构，整体分为三个平面：

```
┌─────────────────────────────────────────────────────────────┐
│                    Management Console (Admin)                │
│                   React + Vite + Tailwind CSS               │
└──────────────────────────┬──────────────────────────────────┘
                           │ tRPC / REST API
┌──────────────────────────┴──────────────────────────────────┐
│                    Logto Core (Auth Server)                  │
│  • OIDC Provider (OP)                                       │
│  • OAuth 2.1 Authorization Server                           │
│  • SAML IdP (Identity Provider)                              │
│  • Multi-tenancy & Organization Management                   │
│  • RBAC Engine                                              │
│  • User / Session / Token Management                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              Experience (User-facing UI)                     │
│  • Sign-in / Sign-up flows                                  │
│  • Social login integration                                 │
│  • MFA / Email verification                                 │
│  • Passwordless (Magic link, OTP)                           │
└─────────────────────────────────────────────────────────────┘
```

核心认证服务器基于 **Node.js + TypeScript + Koa** 构建，使用 `@logto/core` 包封装 OIDC 协议实现。数据存储层依赖 **PostgreSQL**，会话管理使用 Redis（可选）。

### 2.2 OIDC 协议实现深度解析

Logto 的 OIDC 实现遵循 `openid-connect-core-1_0` 规范，核心流程如下：

```typescript
// packages/core/src/oidc/routes/authorization.ts (概念性代码)
router.get('/oidc/auth', async (ctx) => {
  const { client_id, redirect_uri, scope, response_type } = ctx.query;
  
  // 1. 验证 Client 合法性
  const client = await validateClient(client_id, redirect_uri);
  
  // 2. 用户认证（跳转登录页 or 会话复用）
  const user = await authenticateUser(ctx);
  
  // 3. 授权确认（首次授权时显示 Consent 页面）
  const consent = await getOrCreateConsent(user.id, client.id, scope);
  
  // 4. 生成 Authorization Code
  const code = await issueAuthorizationCode({
    client, user, scope, ...
  });
  
  // 5. 重定向回 RP (Relying Party)
  ctx.redirect(`${redirect_uri}?code=${code}&state=${state}`);
});
```

在实际源码中，Logto 使用 `oidc-provider` 库作为底层 OIDC 实现，并在此基础上扩展了：

- **自定义 Grant Type**：支持 `urn:ietf:params:oauth:grant-type:token-exchange`（用于 Agent/API 场景）
- **Organization-aware Scopes**：将 `organization_id` 和 `organization_roles` 注入 ID Token
- **Dynamic Client Registration**：支持通过 API 动态注册 OAuth Client

### 2.3 多租户与 Organization 设计

Logto 的多租户模型采用 **Organization** 作为核心抽象：

```
Tenant (Logto 层面)
  └── Organization (客户层面的租户)
        ├── Members (用户-组织关联)
        ├── Organization Roles (组织内角色)
        ├── Branding (组织级 UI 定制)
        └── SSO Connectors (组织级 IdP 配置)
```

关键数据模型（`packages/schemas/src/models/gen/tables.ts` 中生成）：

```sql
-- Organization 表（简化）
CREATE TABLE organizations (
  id VARCHAR(21) PRIMARY KEY,
  tenant_id VARCHAR(21) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  branding JSONB,  -- Logo, colors, favicon
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户-组织关联
CREATE TABLE organization_members (
  id VARCHAR(21) PRIMARY KEY,
  organization_id VARCHAR(21) REFERENCES organizations(id),
  user_id VARCHAR(21) REFERENCES users(id),
  roles VARCHAR(21)[],  -- 组织角色数组
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

这种设计的优势在于：
1. 一个用户在多个 Organization 中可以有不同的角色
2. 每个 Organization 可以独立配置品牌（Logo、主题色）
3. 支持 JIT (Just-In-Time)  provisioning：用户首次通过 SSO 登录时自动创建成员关系

### 2.4 RBAC 引擎

Logto 的 RBAC 分为两个层级：

- **系统级 RBAC**：管理 Logto 控制台权限（如：谁能创建应用、谁能查看 Audit Log）
- **应用级 RBAC**：管理你的应用/API 的资源访问权限

应用级 RBAC 的核心概念：

```
Resource (资源) → Scope (权限范围) → Role (角色) → User/Organization
```

示例：定义一个 `read:order` 的 Scope，分配给 `admin` 角色，然后将 `admin` 角色分配给用户。

在 Token 端点，Logto 会根据用户的角色动态计算 Scope：

```typescript
// 概念代码：生成 Access Token 时注入权限
async function issueAccessToken(userId, clientId, organizationId) {
  const roles = await getUserRolesInOrganization(userId, organizationId);
  const scopes = roles.flatMap(role => role.scopes.map(s => s.name));
  
  return signJWT({
    sub: userId,
    aud: clientId,
    scope: scopes.join(' '),  // "read:order write:order"
    organization_id: organizationId,
  });
}
```

### 2.5 AI/Agent 场景支持

Logto 在 README 中特别强调了 **Model Context Protocol (MCP)** 和 **Agent-based AI** 的支持。这是通过以下机制实现的：

1. **Machine-to-Machine (M2M) 认证**：为 AI Agent 颁发长期有效的 Access Token
2. **Token Exchange Grant**：Agent 可以用自己的 Token 换取用户授权的 Token（模拟用户操作）
3. **细粒度 Scope**：为每个 Agent 分配最小必要权限

```typescript
// Agent 使用 Token Exchange 模拟用户
const response = await fetch('https://auth.example.com/oidc/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: agentAccessToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    actor_token: userConsentToken,  // 用户授权
    scope: 'read:profile write:order',
  }),
});
```

## 三、安装与快速开始

### 3.1 环境要求

- **Node.js**: ^22.14.0（必须 22.x 以上）
- **PostgreSQL**: 14+（用于持久化存储）
- **pnpm**: ^9.0.0 || ^10.0.0（包管理器）
- **Redis**: 可选（用于会话缓存，生产环境推荐）

### 3.2 使用 Docker Compose 快速启动

最适合快速体验的方式：

```bash
# 下载 docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/logto-io/logto/HEAD/docker-compose.yml | \
  docker compose -p logto -f - up

# 访问 http://localhost:3001 完成初始化设置
```

Docker Compose 会启动三个服务：

```yaml
# docker-compose.yml（简化）
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: logto

  redis:
    image: redis:7-alpine

  logto:
    image: svhd/logto:latest
    depends_on: [postgres, redis]
    ports:
      - "3001:3001"
      - "3002:3002"  # Management Console
    environment:
      DB_URL: postgresql://postgres:password@postgres:5432/logto
      REDIS_URL: redis://redis:6379
```

### 3.3 本地开发环境搭建

如果你想参与贡献或深度定制：

```bash
# 1. Fork & Clone 仓库
git clone https://github.com/logto-io/logto.git
cd logto

# 2. 安装依赖（使用 pnpm）
pnpm install

# 3. 配置环境变量
cp .env.example .env

# 4. 启动 PostgreSQL 和 Redis（本地或 Docker）
# 确保 .env 中的 DB_URL 和 REDIS_URL 正确

# 5. 运行数据库迁移
pnpm cli db migrate

# 6. 启动开发服务器
pnpm dev
```

启动后：
- **Core (Auth Server)**: http://localhost:3001
- **Management Console**: http://localhost:3002
- **Experience (Login Page)**: http://localhost:3001/experience

### 3.4 使用 Logto Cloud（最快）

如果不想自己运维，可以直接使用官方云服务：

```
https://cloud.logto.io/?sign_up=true
```

免费套餐包含：
- 每月 5,000 活跃用户
- 3 个应用
- 社区支持

## 四、使用方法与实战

### 4.1 在 Next.js 应用中集成 Logto

以 Next.js App Router 为例，展示完整的集成流程：

**Step 1: 在 Logto Console 创建应用**

1. 登录 http://localhost:3002
2. 点击「Applications」→「Create Application」
3. 选择「Next.js (App Router)」
4. 配置 Redirect URI：`http://localhost:3000/callback`
5. 记录 `App ID` 和 `App Secret`

**Step 2: 安装 Logto SDK**

```bash
pnpm add @logto/next
```

**Step 3: 配置 Logto Client**

```typescript
// app/logto.ts
import { UserScope, LogtoNextConfig } from '@logto/next';

export const logtoConfig: LogtoNextConfig = {
  appId: process.env.LOGTO_APP_ID!,
  appSecret: process.env.LOGTO_APP_SECRET!,
  endpoint: 'http://localhost:3001',
  baseUrl: 'http://localhost:3000',
  cookieSecret: 'your-cookie-secret-32-chars-minimum',
  cookieSecure: process.env.NODE_ENV === 'production',
  scopes: [
    UserScope.Email,
    UserScope.Phone,
    UserScope.Profile,
    UserScope.Organizations,  // 如果需要多租户
  ],
};
```

**Step 4: 实现登录/登出路由**

```typescript
// app/api/sign-in/route.ts
import { getLogtoContext, signIn } from '@logto/next/server-actions';
import { logtoConfig } from '@/app/logto';
import { redirect } from 'next/navigation';

export async function GET() {
  await signIn(logtoConfig);
  redirect('/');
}
```

```typescript
// app/api/callback/route.ts
import { handleSignIn } from '@logto/next/server-actions';
import { logtoConfig } from '@/app/logto';

export async function GET(request: Request) {
  const url = new URL(request.url);
  await handleSignIn(logtoConfig, url.searchParams.toString());
  redirect('/dashboard');
}
```

**Step 5: 在页面中获取用户信息**

```typescript
// app/dashboard/page.tsx
import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '@/app/logto';

export default async function DashboardPage() {
  const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

  if (!isAuthenticated) {
    redirect('/');
  }

  return (
    <div>
      <h1>欢迎，{claims?.username}！</h1>
      <p>邮箱：{claims?.email}</p>
      <p>组织：{claims?.organizations?.join(', ')}</p>
    </div>
  );
}
```

### 4.2 配置社交登录（以 Google 为例）

Logto 通过 **Connector** 机制支持社交登录：

1. 在 Google Cloud Console 创建 OAuth 2.0 Client
2. 在 Logto Console →「Connectors」→「Add Connector」→ 选择「Google」
3. 填入 `Client ID` 和 `Client Secret`
4. 启用 Connector

用户现在可以在登录页看到 Google 按钮，点击后跳转 Google 授权。

### 4.3 多租户场景：Organization 实战

假设你在构建一个 SaaS 平台，每个企业客户是一个 Organization：

```typescript
// 1. 创建 Organization（通过 Management API）
await fetch('https://your-logto-endpoint/api/organizations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${managementApiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Acme Corp',
    description: 'Acme Corporation Tenant',
    branding: {
      logoUrl: 'https://acme.com/logo.png',
      primaryColor: '#1a73e8',
    },
  }),
});

// 2. 邀请用户加入 Organization
await fetch(`/api/organizations/{org_id}/members`, {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@acme.com',
    roleNames: ['admin'],
  }),
});

// 3. 用户登录时选择 Organization
// Logto Experience UI 会自动显示用户的 Organization 列表
```

### 4.4 RBAC 实战：保护 API 路由

```typescript
// Next.js Middleware：验证 Access Token 和 Scope
import { verifyToken } from '@logto/next/middleware';

export async function middleware(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await verifyToken(token, {
    issuer: 'http://localhost:3001',
    audience: 'https://api.yourapp.com',
  });

  // 检查 Scope
  const scopes = payload.scope?.split(' ') || [];
  if (!scopes.includes('read:order')) {
    return new Response('Forbidden', { status: 403 });
  }

  // 检查 Organization
  if (payload.organization_id !== request.headers.get('X-Org-Id')) {
    return new Response('Invalid Organization', { status: 403 });
  }

  return NextResponse.next();
}
```

## 五、常见问题与解决方案

### Q1: `pnpm install` 时报错 `Only pnpm is allowed`

Logto 在 `package.json` 的 `preinstall` 脚本中强制使用 pnpm：

```json
"preinstall": "npx only-allow pnpm"
```

**解决方案**：安装 pnpm 并重新运行

```bash
npm install -g pnpm@^10.0.0
pnpm install
```

### Q2: 数据库迁移失败：`database schema mismatch`

通常发生在升级 Logto 版本后：

```bash
# 查看待执行的迁移脚本
pnpm cli db alteration list

# 执行迁移
pnpm cli db alter --revision <target_revision>
```

**注意**：生产环境迁移前务必备份数据库！

### Q3: OIDC 回调地址不匹配

错误信息：`redirect_uri_mismatch`

**原因**：Logto 对 Redirect URI 进行精确匹配（包括尾斜杠）

**解决方案**：
1. 在 Console → Application → Settings 中，确保 `Redirect URIs` 和 `Post Sign-out Redirect URIs` 配置完全一致
2. 开发环境中，同时添加 `http://localhost:3000/callback` 和 `http://127.0.0.1:3000/callback`

### Q4: 生产环境性能优化

Logto Core 默认使用内存会话存储，生产环境需要配置 Redis：

```env
# .env
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-redis-password

# 可选：会话 TTL（秒）
SESSION_TTL_IN_SECONDS=86400
```

另外，PostgreSQL 连接池也需要调整：

```env
DB_URL=postgresql://user:pass@host:5432/logto?pool_max=20&pool_idle_timeout=30000
```

### Q5: 自定义登录页 UI

Logto Experience 使用 **React + Tailwind CSS** 构建，支持通过 Console 自定义：

1. 进入 Console →「Sign-in Experience」→「Branding」
2. 上传 Logo、配置主色调、自定义 CSS

如果需要更深度的定制（如自定义注册流程），可以使用 **Logto Experience Override**：

```typescript
// packages/experience 中可以通过环境变量注入自定义组件
// 具体参考官方文档：https://docs.logto.io/customization/override-experience
```

## 六、总结

Logto 是一款非常有潜力的开源身份认证解决方案，尤其适合以下场景：

| 场景 | 推荐指数 | 理由 |
|------|---------|------|
| SaaS 多租户应用 | ⭐⭐⭐⭐⭐ | 原生 Organization 支持，开箱即用 |
| 需要企业 SSO | ⭐⭐⭐⭐⭐ | 内置 SAML、OIDC IdP 连接器 |
| AI/Agent 应用 | ⭐⭐⭐⭐ | 支持 MCP，Token Exchange Grant |
| 移动端应用 | ⭐⭐⭐⭐ | 提供 React Native、Flutter SDK |
| 传统 Web 应用 | ⭐⭐⭐ | 功能完善，但竞争者有 Auth0 等 |

**优势**：
- 开源免费，无用户数限制
- 协议实现完整（OIDC、OAuth 2.1、SAML）
- 多租户和 RBAC 设计优秀
- SDK 覆盖广（30+ 框架）
- AI/Agent 场景前瞻性支持

**劣势**：
- 社区生态相比 Auth0 仍有差距
- 文档部分高级功能描述不够详细
- 国内网络环境下，Logto Cloud 访问可能不稳定

总体而言，如果你正在构建 SaaS 或 AI 应用，并且希望拥有认证基础设施的完全控制权，Logto 是一个值得深入研究的选择。

**项目链接**：
- GitHub: https://github.com/logto-io/logto
- 官网: https://logto.io
- 文档: https://docs.logto.io
- Cloud: https://cloud.logto.io

---

*本文基于 Logto v1.x 源码分析，具体实现可能随版本演进发生变化。建议结合官方文档和实际代码进行验证。*
