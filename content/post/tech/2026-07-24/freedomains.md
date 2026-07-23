---
title: "免费领取你的专属子域名：Stackryze FreeDomains 项目解析"
date: 2026-07-24
description: "FreeDomains 是 Stackryze 推出的免费托管子域名服务，面向开发者、学生与开源社区，支持 .indevs.in、.sryze.cc 等后缀，可指向任意托管商且完全无锁定。本文解析其架构、技术栈与本地部署方式。"
author: "Cheman"
slug: freedomains
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 前端, DNS]
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

今天在 GitHub Trending 上看到一个有意思的项目：**FreeDomains**，一个由 Stackryze 提供的免费托管子域名服务，让开发者、学生和开源社区可以零成本、无锁定地拥有自己的 `*.indevs.in`、`*.sryze.cc` 等子域名。

## 一、项目概述

FreeDomains 是 Stackryze Domains 推出的**免费托管子域名服务（free managed subdomain service）**，核心目标很朴素：抹平"上线"这件事的成本与复杂度。

- **面向人群**：开发者、学生、开源社区项目
- **核心价值**：免费领取子域名，可指向任意托管商或自有基础设施，获得**完整所有权与掌控权**，无厂商锁定（No lock-in）
- **可用后缀**：`.indevs.in`、`.sryze.cc`、`.ryzedns.org`、`.nx.kg`（更多后缀陆续上线）
- **全球分布式 DNS**：由三台跨大洲的 Name Server 支撑，保证低延迟与高可用
  - `ns1.stackryze.com`（美国纽约，主）
  - `ns2.stackryze.com`（德国纽伦堡）
  - `ns3.stackryze.com`（印度海得拉巴）
- 本仓库 `github.com/stackryze/FreeDomains` 是其**前端 Dashboard（控制台）**的源码，用户通过它搜索、申请并管理自己的子域名。

## 二、技术原理

Dashboard 采用现代化前端技术栈，整体是一个以 React 19 构建的单页应用（SPA）。

### 核心架构

```text
用户浏览器 ──> React SPA (Vite 构建) ──> 后端 API (VITE_API_URL)
                                        └─> Stackryze DNS / 子域名管理
```

- **构建工具**：Vite 7，配合 `@vitejs/plugin-react` 与 `@tailwindcss/vite`
- **UI 体系**：Tailwind CSS 4 + Radix UI 全家桶（accordion、dialog、toast、tooltip 等 20+ 组件），统一可访问性与交互体验
- **表单与校验**：`react-hook-form` + `zod`，实现类型安全的表单校验
- **人机验证**：同时集成 `hCaptcha` 与 `Cloudflare Turnstile`，双重防刷
- **路由**：`react-router-dom` v7（注意已更名为 react-router，不再是 react-router-dom 的旧版 API）
- **数据可视化与动效**：`recharts`（图表）、`framer-motion`（动画）、`three`（3D）、`embla-carousel`（轮播）、`sonner` / `react-hot-toast`（通知）
- **路径别名**：在 `vite.config.js` 中配置了 `@` → `./src` 的别名，便于模块引用

```js
// vite.config.js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
```

### 容器化与交付

仓库提供了多阶段 `Dockerfile`，基于 `node:22-alpine`：构建阶段执行 `npm ci` 与 `npm run build`，运行阶段通过全局 `serve` 静态托管 `dist`，对外暴露 3000 端口。后端 API 地址通过构建参数 `VITE_API_URL` 注入，实现前后端解耦。

```dockerfile
# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

## 三、安装与快速开始

本地跑起这个 Dashboard 非常简单，需要 Node 22+ 环境。

**环境要求**：Node.js 22 及以上、npm（或 pnpm/yarn）。

```bash
# 1. 克隆仓库
git clone https://github.com/stackryze/FreeDomains.git
cd FreeDomains

# 2. 安装依赖
npm install

# 3. 本地开发（默认 Vite 启动在 5173）
npm run dev

# 4. 构建静态产物
npm run build

# 5. 本地预览构建结果
npm run preview
```

> 说明：`npm ci` 在 CI 中已开启 `NPM_CONFIG_LEGACY_PEER_DEPS=true`，以兼容部分生态的 peer 依赖冲突。

**使用 Docker 部署**：

```bash
docker build -t freedomains \
  --build-arg VITE_API_URL=https://your-api.example.com .

docker run -p 3000:3000 freedomains
# 浏览器访问 http://localhost:3000
```

官方托管的控制台已在线：**https://domain.stackryze.com**

## 四、使用方法与实战

作为使用者，领取一个子域名的典型流程如下：

1. 打开控制台 `https://domain.stackryze.com`，注册/登录账号
2. 搜索想要的子域名（例如 `myapp.indevs.in`），确认未被占用
3. 通过 **hCaptcha / Turnstile** 完成人机验证，防止恶意批量注册
4. 填写 DNS 记录（A 记录指向服务器 IP，或 CNAME 指向托管平台）
5. 提交申请，等待社区审核通过
6. 解析生效后即可将该域名用于你的站点或 API

**实战示例：把个人博客绑定到 FreeDomains**

假设你用 Vercel / Cloudflare Pages 部署了博客，申请子域名 `blog.indevs.in`，在控制台将它以 CNAME 指向 `cname.vercel-dns.com`（Vercel 提供的目标）。几分钟后，访问 `https://blog.indevs.in` 即可看到你的博客——全程零费用，且随时可改指向其他托管商，真正实现无锁定。

## 五、常见问题与解决方案

**Q1：本地 `npm install` 报 peer dependencies 冲突？**
仓库 CI 已设置 `NPM_CONFIG_LEGACY_PEER_DEPS=true`。本地若遇到冲突，可改用：

```bash
npm install --legacy-peer-deps
```

**Q2：为什么还要配置 `VITE_API_URL`？**
Dashboard 只是前端，真正的子域名管理在后端 API。Docker 构建时需通过 `--build-arg VITE_API_URL=...` 注入，否则页面无法正确请求数据。

**Q3：人机验证组件不显示？**
检查 `VITE_API_URL` 是否正确，以及 hCaptcha / Turnstile 的 sitekey 是否已配置。这类第三方脚本对域名白名单敏感。

**Q4：子域名解析一直不生效？**
DNS 记录是全球分布式同步的，通常需要等待 TTL 时间（几分钟到几十分钟）才能完全生效，可用 `dig ns3.stackryze.com` 或在线 DNS 工具排查。

**Q5：想确认服务是否在线？**
访问服务状态页：https://status.stackryze.com，可查看实时状态与故障公告。

## 六、总结

FreeDomains 用一个透明、社区驱动、无锁定的方式，把"拥有自己的域名"这件事的门槛降到了零，对学生、个人开发者和开源项目非常友好。其前端 Dashboard 也展示了 React 19 + Vite 7 + Tailwind 4 的现代化工程实践，值得作为 SPA 项目的参考范本。

- 官方控制台：https://domain.stackryze.com
- 源码仓库：https://github.com/stackryze/FreeDomains
- 社区交流：https://discord.gg/wr7s97cfM7
- 服务状态：https://status.stackryze.com
