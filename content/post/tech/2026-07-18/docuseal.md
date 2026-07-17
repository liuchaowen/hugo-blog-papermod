---
title: "DocuSeal：开源文档填写与电子签名平台，几分钟完成私有化部署"
date: 2026-07-18
description: "DocuSeal 是一款基于 Ruby on Rails + Vue 3 的开源电子签名平台，提供 WYSIWYG 表单构建、12 种字段类型、PDF 自动签名与验证，并支持 Docker 一键私有化部署，是 DocuSign 等商业方案的开源替代。"
author: "Cheman"
slug: docuseal
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 电子签名, DocuSeal, Ruby on Rails]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**DocuSeal**，一个开源的文档填写与电子签名平台，让你用几分钟就能在自己服务器上搭建一套类似 DocuSign 的电子签章服务。

## 一、项目概述

DocuSeal 是一个开源的数字文档签署与处理平台，核心理念是用「自托管（self-hosted）」的方式取代昂贵的商业电子签名 SaaS。它可以帮助你在任何设备上创建、填写并在线签署 PDF 表单，整个过程移动端友好、无需安装插件。

官方一句话定位：**Open source document filling and signing**（开源的文档填写与签名）。

与商业方案相比，DocuSeal 的核心价值在于：

- **数据可控**：支持数据存储在本地磁盘或 AWS S3 / Google Storage / Azure Cloud，敏感文档无需经过第三方。
- **合规友好**：基于 AGPLv3 许可（含 Section 7(b) 附加条款），可私有化部署以满足本地电子文档法规。
- **成本可控**：开源版已包含核心签名能力，Pro 版才提供白标、SSO、批量发送等增值功能。

项目主要功能包括：

- PDF 表单字段构建器（WYSIWYG 所见即所得）
- 12 种字段类型（签名、日期、文件、复选框等）
- 每个文档支持多个提交人（签署方）
- 通过 SMTP 自动发送邮件通知
- 自动 PDF 电子签名与签名验证
- 用户管理与权限控制
- 7 种 UI 语言，签署界面支持 14 种语言
- 提供 API 与 Webhooks 便于集成

## 二、技术原理

从仓库的 `Dockerfile`、`Gemfile`、`package.json` 等文件可以看出，DocuSeal 采用的是一套成熟的「Rails 后端 + Vue 3 前端 + 后台任务队列」的全栈架构。

### 2.1 后端技术栈

后端基于 **Ruby on Rails**（Gemfile 中指定 `ruby '4.0.5'`），关键依赖如下：

```ruby
gem 'rails'
gem 'devise'              # 用户认证
gem 'devise-two-factor'   # 两步验证
gem 'cancancan'           # 权限控制
gem 'sidekiq'             # 后台异步任务（邮件、提醒等）
gem 'puma'                # 应用服务器
gem 'turbo-rails'         # Hotwire 实现页面局部刷新
gem 'hexapdf'             # PDF 生成与处理
gem 'onnxruntime'         # 运行字段检测 ONNX 模型
gem 'sqlite3'             # 默认数据库
gem 'pg'                  # 可选 PostgreSQL
gem 'trilogy'             # 可选 MySQL
```

数据库层面非常灵活：默认使用 SQLite，也可通过 `DATABASE_URL` 环境变量切换为 PostgreSQL 或 MySQL。存储层抽象了对 AWS S3、Google Cloud Storage、Azure Blob 的支持，文件落盘位置可配置。

### 2.2 前端技术栈

前端使用 **Vue 3 + Tailwind CSS + daisyUI**，并通过 `shakapacker`（基于 Webpack 的 Rails 前端打包方案）构建：

```json
{
  "vue": "^3.3.2",
  "tailwindcss": "^3.4.17",
  "daisyui": "^3.9.4",
  "@hotwired/turbo": "https://github.com/docusealco/turbo#main",
  "@tiptap/core": "^3.19.0",
  "signature_pad": "^4.1.5",
  "codemirror": "^6.0.2",
  "chart.js": "^4.5.1"
}
```

- **tiptap**：驱动模板构建器的富文本编辑能力。
- **signature_pad**：实现手写签名画板。
- **codemirror**：提供 HTML 模板的源码编辑（配合 HTML API 创建模板）。
- **chart.js**：用于后台数据分析展示。

### 2.3 关键子系统

两个值得关注的技术点：

1. **PDF 渲染**：Dockerfile 中拉取了 `pdfium` 的预编译二进制（musl 版本），用于服务端高精度渲染 PDF 并定位字段坐标。
2. **字段自动检测**：通过 ONNX Runtime 加载 `model.onnx`（来自 `docusealco/fields-detection` 仓库的字段检测模型），实现上传 PDF 后自动识别可填写区域。镜像还内置了 GoNoto 与 DancingScript 字体，后者专门用于渲染手写风格签名。

数据流转大致为：上传文档 →（可选）ONNX 模型自动检测字段 → 用户在 WYSIWYG 构建器中标注字段 → 生成签署链接 → 多方依次填写/签名 → Sidekiq 异步发送邮件 → 产出带签名的 PDF 并校验。

## 三、安装与快速开始

DocuSeal 对部署极其友好，官方提供了多种一键部署通道（Heroku、Railway、DigitalOcean、Render），但最推荐的是自托管 Docker 方式。

### 3.1 最简 Docker 运行

```sh
docker run --name docuseal -p 3000:3000 -v .:/data docuseal/docuseal
```

默认容器使用 SQLite，数据持久化在挂载的 `/data` 目录。浏览器访问 `http://localhost:3000` 即可使用。

### 3.2 Docker Compose 自定义域名 + HTTPS

下载官方编排文件并在自有服务器启动：

```sh
curl https://raw.githubusercontent.com/docusealco/docuseal/master/docker-compose.yml > docker-compose.yml

# 通过 Caddy 自动签发 SSL 证书（需提前把 DNS 指向该服务器）
sudo HOST=your-domain-name.com docker compose up
```

这种方式适合生产环境，配合 Caddy 实现自动 HTTPS。

### 3.3 环境要求

- Docker 或 Ruby 4.0.5 + Node.js + Yarn 运行环境
- 默认 SQLite；生产建议 PostgreSQL / MySQL 以获得并发能力
- 需要可访问的 SMTP 服务用于发送签署邀请邮件

## 四、使用方法与实战

### 4.1 创建可填写表单

进入模板构建器，上传 PDF 后通过 WYSIWYG 界面拖拽放置 12 类字段（签名、日期、文本、文件、复选框等）。DocuSeal 还支持「嵌入式文本字段标签」：在 PDF/DOCX 中直接写入标签，导入后自动生成可填表单。

### 4.2 多方签署流程

为每个文档添加多个提交人（签署方），系统会按顺序发送签署链接。每位签署人可在手机或电脑上完成填写与签名，全程移动端优化。

### 4.3 与业务系统集成

通过 REST API 与 Webhooks 将签署能力嵌入自有应用。官方还提供了 React / Vue / Angular / 原生 JS 的嵌入式组件，可直接把签名表单嵌入你的产品页面：

```js
// 通过 Webhook 监听签署完成事件（示例）
// 在 DocuSeal 后台配置 Webhook URL，完成签署后会收到回调
// 可用于：更新业务系统状态、触发后续流程、归档 PDF 等
```

Pro 版进一步支持：HTML API 创建模板、批量通过 CSV/XLSX 导入发送、SSO/SAML、条件字段与公式、短信身份验证等。

## 五、常见问题与解决方案

**Q1：Docker 启动后数据丢失？**
确保已正确挂载卷 `-v .:/data`，SQLite 数据文件与上传文件均保存在该目录。生产环境建议改用 PostgreSQL 并配置外部对象存储。

**Q2：邮件邀请发不出去？**
DocuSeal 通过 SMTP 发送邮件，需在环境变量中正确配置 SMTP 主机、账号与端口（如未配置，系统无法主动推送签署链接，只能手动复制签署 URL 分享）。

**Q3：想切换数据库？**
通过 `DATABASE_URL` 环境变量指定，例如 `postgres://user:pass@host:5432/docuseal`，容器启动时会按该连接初始化，无需改动代码。

**Q4：PDF 中文字段渲染异常？**
镜像内置 GoNoto 字体用于 CJK 字符渲染；若使用自定义字体或签名样式异常，可检查容器内 `/fonts` 目录是否包含对应字体文件。

**Q5：性能与并发？**
默认 SQLite 适合小规模；高并发或多用户场景请使用 PostgreSQL，并依赖 Sidekiq 将邮件、提醒等耗时任务异步化。

## 六、总结

DocuSeal 用一套扎实的 Rails + Vue 全栈架构，把「电子签名」这件通常由商业 SaaS 垄断的事，重新交回给开发者自己掌控。它在开源版中就提供了表单构建、多方签署、自动签名与验证、API 集成等核心能力，部署上又做到了 Docker 一键拉起，对个人隐私敏感型团队和需要合规自托管的企业的确是一个值得尝试的开源替代方案。

如果你正在寻找 DocuSign / PandaDoc 的开源平替，不妨从一条 `docker run` 开始体验。

> 项目地址：https://github.com/docusealco/docuseal