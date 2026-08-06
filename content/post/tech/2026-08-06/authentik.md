---
title: "Authentik：一个开源的身份认证中台，支持 SSO/SAML/OIDC/LDAP/RADIUS"
date: 2026-08-06
description: "Authentik 是一个用 Python（Rust）构建的开源身份提供商（IdP），支持 SAML、OAuth2/OIDC、LDAP、RADIUS 等全部主流认证协议，提供可视化的应用管理与细粒度权限控制，可替代 Okta、Auth0、Entra ID 等商业方案，自托管部署从个人实验室到生产集群均可覆盖。"
author: "Cheman"
slug: authentik
draft: false
categories: ["技术", "开源", "安全"]
tags: ["身份认证", "SSO", "SAML", "OAuth2", "OIDC", "LDAP", "RADIUS", "开源", "Python", "Rust"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Authentik**，这是一个用 Python（Rust）构建的开源身份提供商（IdP），一句话概括它的核心价值——用开源的方式，自托管一个完整的身份认证中台，支持 SSO/SAML/OIDC/LDAP/RADIUS 全部主流协议，从个人实验室到生产级集群均可部署，是 Okta、Auth0、Entra ID、Ping Identity 的有力开源替代方案。

## 一、项目概述

**Authentik** 的定位非常清晰：做一个功能完备、可自托管的现代化身份认证平台。区别于 Keycloak 偏向开发者工具的定位，Authentik 更强调**企业级管理体验**——可视化界面、细粒度策略引擎、Outpost 代理架构，以及对非标准协议（如 RADIUS、LDAP）的原生支持。

核心功能包括：

- **全协议覆盖**：SAML 2.0、OAuth2/OIDC、LDAP、RADIUS、SCIM 2.0，一个平台搞定所有身份认证场景。
- **内置应用代理（Proxy Outpost）**：无需应用本身支持 SSO，只需在 Authentik 端配置好域名和认证策略，Outpost 自动完成登录跳转和 Token 注入，支持 Cookie/Session 模式。
- **多租户隔离**：通过 django-tenants 实现多租户数据隔离，适合 MSP（托管安全服务商）或企业内部多团队隔离场景。
- **LDAP/RADIUS Outpost**：Go 编写的轻量 Outpost 进程，部署在网络可达 LDAP/RADIUS 服务的节点上，将传统企业认证协议接入 Authentik 体系。
- **Enterprise 版本**：Authentik 还提供商业版 Enterprise Edition，支持更大规模的部署和 SLA 保证，文档中明确将其定位为 Okta/Auth0/Entra ID 的直接替代。
- **安装方式多样**：官方提供 Docker Compose（推荐小规模/测试）、Kubernetes Helm Chart（生产推荐）、AWS CloudFormation（AWS 原生部署）和 DigitalOcean Marketplace 一键部署，覆盖主流部署场景。

## 二、技术架构

Authentik 的架构设计是其最值得研究的部分。项目采用**多语言混合**构建，核心引擎是 Python（Django），Web UI 是 TypeScript，前端使用 Lit 框架，而 Outpost 组件则分别用 Go 和 Rust 编写。这种设计不是炫技，而是根据各层需求选择最合适的技术：

| 组件 | 语言/框架 | 职责 |
|------|----------|------|
| Core | Python 3.14 / Django 5.2.17 | API、策略引擎、多租户、LDAP 后端 |
| Outpost（Proxy） | Rust（axum + hyper + tokio） | HTTP 反向代理、Cookie 注入、Session 管理 |
| Outpost（LDAP/RADIUS） | Go 1.26（gorilla/mux + ldap） | LDAP 目录服务代理、RADIUS AAA |
| Web UI | TypeScript（Lit Web Components） | 管理后台 UI、Reactivity 组件 |
| 数据库 | PostgreSQL | 全量数据存储，支持 GeoIP、ASN 扩展 |
| 缓存/消息队列 | dramatiq-postgres、Django Channels | 异步任务与 WebSocket 通知 |

### 2.1 核心引擎（Python/Django）

Django 项目配置在 `authentik/` 目录下，关键配置通过环境变量注入：

```python
# authentik/root/settings.py 中的关键依赖
AUTHENTIK = {
    'default_backchannel': 'authentik.backchannels.dramatiq.DramatiqBackchannel',
    'tenants__enabled': True,          # 多租户支持
}
```

从 `pyproject.toml` 中可以看到 Authentik 的核心 Python 依赖：

```toml
dependencies = [
    "django==5.2.17",
    "djangorestframework==3.17.1",
    "django-tenants==3.10.2",          # 多租户
    "django-pgtrigger==4.17.0",       # PostgreSQL 触发器
    "django-postgres-extra==2.0.9",   # PostgreSQL 高级特性
    "channels==4.3.2",                 # WebSocket 支持
    "structlog==26.1.0",              # 结构化日志
    "argon2-cffi==25.1.0",            # 密码哈希
    "fido2==2.2.1",                  # WebAuthn/FIDO2
    "cryptography==50.0.0",
    "defusedxml==0.7.1",            # XML 解析（防 XXE）
    "xmlsec==1.3.17",               # SAML XML 签名
    "jwcrypto==1.5.8",             # JWT 处理
    "ldap3==2.9.1",                # LDAP 客户端
    "python-kadmin-rs==0.7.2",     # Kerberos 扩展
    "gssapi==1.11.1",             # Kerberos GSSAPI
    "django-filter==26.1",       # DRF 过滤
    "drf-spectacular==0.29.0",   # OpenAPI 文档
    "prometheus-client==1.x",    # 监控埋点
]
```

策略引擎（Policies）通过 Django 信号系统驱动，核心模块包括：

- `authentik.policies.password`：密码强度策略（集成 zxcvbn）
- `authentik.policies.expression`：Python 表达式策略（可写任意逻辑）
- `authentik.policies.geoip`：基于地理位置的访问控制（GeoLite2 数据库）
- `authentik.policies.event_matcher`：事件日志匹配策略
- `authentik.policies.reputation`：请求信誉评分（防暴力破解）

### 2.2 Rust Outpost（代理架构）

Proxy Outpost 使用 Rust 编写，核心依赖在 `Cargo.toml` 中定义：

```toml
[dependencies]
axum = { version = "= 0.8.9", features = ["http2", "macros", "ws"] }
axum-server = { version = "= 0.8.0", features = ["tls-rustls-no-provider"] }
hyper = { version = "= 1.11.0", features = ["client", "http1", "http2"] }
hyper-rustls = { version = "= 0.27.9", features = ["aws-lc-rs", "http1", "http2"] }
tokio = { version = "1.53.1", features = ["full", "tracing"] }
tower-http = { version = "= 0.7.0", features = ["compression-full", "fs", "limit", "timeout"] }
axum-extra = { version = "= 0.12.6", features = ["cookie-signed", "cookie-key-expansion"] }
moka = { version = "= 0.12.15", features = ["future"] }  # 内存缓存
serde = { version = "= 1.0.229", features = ["derive"] }
sqlx = { version = "= 0.9.0", features = ["postgres", "runtime-tokio"] }
aws-lc-rs = { version = "= 1.17.3", features = ["fips"] }  # FIPS 兼容 TLS
```

Rust Outpost 的主要职责是作为反向代理，在用户访问目标应用时注入认证 Cookie。其工作流程：

```
用户请求 → Outpost（Rust）
    ├─ 检查已登录 Cookie → 有效则直接转发
    ├─ 未登录 → 重定向到 Authentik Core 认证
    └─ 认证成功 → 注入 session cookie → 转发请求到后端应用
```

Rust 实现的优势：内存安全、高并发、低延迟，非常适合作为 Sidecar 或独立代理节点部署。

### 2.3 Go Outpost（LDAP/RADIUS 代理）

LDAP 和 RADIUS Outpost 使用 Go 编写（`goauthentik.io` 模块），通过 gRPC 或 HTTP 与 Core 通信：

```go
// go.mod 核心依赖
require (
    beryju.io/ldap v0.2.1        // LDAP 协议实现
    beryju.io/radius-eap v0.1.1   // RADIUS + EAP
    golang.org/x/oauth2 v0.36.0   // OAuth2
    gorm.io/driver/postgres v1.6.2  // 数据库
    sirupsen/logrus v1.9.4         // 日志
)
```

LDAP Outpost 的典型部署场景：企业内部已有大量使用 LDAP 认证的系统（如 OpenLDAP 连接的 Samba 文件共享等），只需在 Authentik 中配置一次认证源，这些系统即可通过 LDAP Outpost 获得统一 SSO 体验，无需逐个改造。

## 三、安装与快速开始

### 3.1 Docker Compose（推荐测试/小规模使用）

```bash
# 创建工作目录
mkdir authentik && cd authentik
# 下载官方 docker-compose.yml
wget https://goauthentik.io/docker-compose.yml
# 修改外部访问地址（必须配置，否则邮件链接和 OIDC 重定向地址会错误）
AUTHENTIK_SECRET_KEY="your-secret-key-here"
AUTHENTIK_PORT=9000
AUTHENTIK_EXTERNAL_PORT=9000

# 启动
docker compose up -d
```

启动后访问 `http://your-server:9000/if/admin/`，首次启动会引导创建管理员账户。

### 3.2 Kubernetes Helm Chart（生产推荐）

```bash
# 添加 Helm 仓库
helm repo add authentik https://charts.goauthentik.io
helm repo update

# 安装
helm install authentik authentik/authentik \
  --namespace authentik \
  --create-namespace \
  --set authentik.outposts.enabled=true \
  --set authentik.images.nginx.pullPolicy=IfNotPresent
```

生产环境建议使用外置 PostgreSQL 和 Redis，在 Helm Values 文件中配置：

```yaml
# values.yaml
postgresql:
  enabled: false
externalDatabase:
  host: "postgres-svc.namespace"
  port: 5432
  name: "authentik"
  username: "authentik"

redis:
  enabled: false
externalRedis:
  host: "redis-svc.namespace"
  port: 6379
```

### 3.3 第一个应用接入 SSO

1. **创建 Provider**：在 Authentik 管理后台「Providers」中新建 Provider，选择类型（OIDC/SAML/Proxy），填写应用信息。
2. **创建 Application**：在「Applications」中新建应用，关联刚才的 Provider。
3. **配置 Outpost**（Proxy 场景）：部署 Proxy Outpost，配置目标域名和认证策略。
4. **测试访问**：访问目标应用，自动跳转 Authentik 登录页，登录后带 Token/Cookie 回跳。

## 四、使用方法与实战

### 4.1 Flow 与 Stage（认证流程编排）

Authentik 的认证流程通过「Flow」和「Stage」组合实现，Flow 定义流程，Stage 定义每个步骤：

```python
# authentik/flows/models.py 中 Stage 的核心继承关系
class Stage(Stem):
    name: str
    order = 0

# 内置 Stage 类型：
# AuthenticatorValidateStage - MFA 验证
# AuthenticatorTOTPStage - TOTP（Google Authenticator 等）
# AuthenticatorDuoStage - Duo Security MFA
# AuthenticatorWebAuthnStage - FIDO2/WebAuthn
# PasswordStage - 密码认证
# UserLoginStage - 用户查找
# ConsentStage - 用户授权同意
# EmailStage - 邮件发送/验证
```

Flow 支持条件分支（Policy 驱动），例如：

```
默认登录 Flow：
  User Login (找用户) → Password (密码) → Authenticator Validate (可选 MFA)
      ↓
  Policy: 信任设备 → 直接通过
  Policy: 新位置登录 → 触发邮件验证
      ↓
  Success → 完成认证
```

### 4.2 LDAP 目录服务集成

如果企业内部已有 LDAP 目录（OpenLDAP、Active Directory），Authentik 支持作为 LDAP Proxy，透传认证到后端目录同时支持 SSO：

```python
# 在 Source 配置中新增 LDAP Source
class LDAPSource(Source):
    property_mappings = models.ManyToManyField(PropertyMapping)
    server_uri = models.URLField()
    bind_cn = models.CharField(max_length=255)
    start_tls = models.BooleanField(default=True)
    base_dn = models.CharField(max_length=200)
    # 用户搜索基础 DN
```

### 4.3 监控与可观测性

Authentik 原生集成 Prometheus metrics，通过 `django-prometheus` 暴露关键指标：

- 认证成功率/失败率
- Flow 执行时长
- Outpost 健康状态
- 用户会话活跃数
- SCIM 同步事件统计

## 五、常见问题与解决方案

**Q: Docker Compose 部署后邮件发送失败？**  
检查 `.env` 中的邮件配置（SMTP 服务器地址、端口、用户名密码），Authentik 首次安装时默认使用 Console Backend（邮件打印到日志而非真发送），需要在「Property → Email」中配置实际 SMTP 服务器。

**Q: Proxy Outpost 接入后认证重定向循环？**  
常见原因是 `AUTHENTIK_HOST` 环境变量设置错误，导致 Outpost 生成的重定向 URL 与用户实际访问的域名不匹配。确保设置为外部可访问的完整 URL（含协议）。

**Q: LDAP Outpost 连接后端 LDAP 服务器报错？**  
检查几项：① LDAP 服务器是否支持 StartTLS（`start_tls: true`）；② Bind DN 是否有足够搜索权限；③ 防火墙是否放行 LDAP 端口（默认 389/636）。

**Q: 多租户场景下数据完全隔离吗？**  
是的。`django-tenants` 基于 PostgreSQL Schema 实现，每个租户有独立 Schema，租户间数据完全隔离。Outpost 进程通过 API 与 Core 通信，也天然支持多租户隔离。

## 六、总结

Authentik 最大的亮点是**把 Okta 的体验完整地用开源方式复现了**——不是只做 OAuth2 端点，而是一整套企业级 IdP 能力：全协议覆盖、可视化 Flow 编排、细粒度策略引擎、Outpost 代理架构和多租户支持。它的多语言架构（Python Django + Rust Outpost + Go LDAP）看似复杂，实际上每层都各司其职——Django 处理复杂业务逻辑，Rust 处理高并发代理，Go 处理网络协议代理。

对于正在寻找 Okta/Auth0 替代方案的企业或自托管爱好者，Authentik 是目前开源生态中最接近商业产品完成度的选择，值得优先考虑。

> GitHub 地址：https://github.com/goauthentik/authentik
> 官方文档：https://docs.goauthentik.io/
