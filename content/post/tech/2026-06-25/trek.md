---
title: "TREK: 开源自托管旅行规划协作平台"
date: 2026-06-25
draft: false
tags: ["开源", "旅行", "协作", "自托管", "NestJS", "React"]
categories: ["工具·效率"]
slug: trek
description: "TREK 是一个功能完备的开源自托管旅行规划工具，支持实时协作、地图、日程、预算、分摊和 AI 辅助，一键 Docker 部署。"
cover:
    image: https://cdn.jsdelivr.net/gh/oddity-code/oss@main/blog/trek-cover.png
    alt: "TREK 旅行规划平台"
    # hidden: true # hide on all pages
---

## 项目概述

**TREK**（[mauriceboe/TREK](https://github.com/mauriceboe/TREK)）是一个功能完备的开源自托管旅行规划协作平台，支持多人实时同步，覆盖旅行规划全流程：**地图行程、日程安排、费用预算、行李清单、旅行日记**，并内置 AI（MCP）辅助能力。

<!--more-->

## 核心功能

- 🗺️ **交互式地图规划**：支持 Leaflet / Mapbox GL，含 3D 建筑和地形图层
- 👥 **实时协作**：WebSocket 驱动，多人同时编辑即时同步
- ✈️ **行程管理**：航班、酒店、餐饮预订，导入 Google Maps / Naver Maps 列表
- 💰 **费用分摊**：Splitwise 风格，多币种结算
- 📦 **行李清单**：模板化分类、成员分配、进度追踪
- 🌤️ **天气预报**：集成 Open-Meteo（无需 API Key）
- 📖 **旅行日记**：图文杂志风格日志，连接 Immich 相册
- 🤖 **AI / MCP 支持**：内置 MCP 服务器，150+ 工具，OAuth 2.1 认证
- 🌐 **PWA 离线可用**：Service Worker 缓存，桌面/移动全屏安装
- 🔐 **安全认证**：Passkeys（WebAuthn）/ OIDC / TOTP 2FA / JWT

## 技术栈

Node.js 22+ / SQLite

后端基于 NestJS 11 + Zustand 状态管理，实时同步走 WebSocket，认证支持 JWT + OAuth 2.1 + OIDC + WebAuthn。

## 快速部署

一行命令启动：

```bash
ENCRYPTION_KEY=$(openssl rand -hex 32) docker run -d -p 3000:3000 \
  -e ENCRYPTION_KEY=$ENCRYPTION_KEY \
  -v ./data:/app/data -v ./uploads:/app/uploads mauriceboe/trek
```

> 首次启动后，管理员账号凭据会打印在容器日志中（`docker logs trek`）。

## 适用人群

- 🎒 **自由行者 / 背包客**：规划路线、管理预算、记录日记
- 👨‍👩‍👧 **家庭/团队出行**：多人协作、分工安排
- 🏢 **差旅管理**：企业差旅预订与费用分摊
- 🔒 **隐私优先用户**：数据完全自托管，无需依赖任何云服务

## 小结

TREK 将 Notion 的协作体验与专业旅行规划深度融合，是目前功能最完整的开源旅行规划方案。从个人Solo游到多人团队出行，一套工具全覆盖，值得一试。

> 🏠 项目地址：[github.com/mauriceboe/TREK](https://github.com/mauriceboe/TREK)
> 🐳 Docker 镜像：[hub.docker.com/r/mauriceboe/trek](https://hub.docker.com/r/mauriceboe/trek)
