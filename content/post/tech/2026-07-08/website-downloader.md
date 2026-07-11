---
title: "Website Downloader：一键下载任意网站的完整源码"
date: 2026-07-08T00:01:00+08:00
draft: false
tags: ["GitHub", "Node.js", "网站下载", "wget"]
categories: ["技术"]
keywords: ["Website Downloader", "wget", "离线下载", "网站镜像", "Node.js"]
description: "Website Downloader 利用 wget 与 Socket 通道，帮你离线下载任意网站的完整源码与静态资源。"
thumbnail: "https://github.com/AhmadIbrahiim/Website-downloader/raw/master/public/Record.gif"
cover:
    image: "https://github.com/AhmadIbrahiim/Website-downloader/raw/master/public/Record.gif"
    alt: "Website Downloader"
slug: "website-downloader"
---

## 简介

**Website Downloader** 是 GitHub Trending 上的一款实用工具，能够一键下载任意网站的完整源代码（包括所有静态资源），让你轻松实现离线浏览或备份网站内容。项目基于 Node.js + Express 构建，后端调用经典命令行工具 `wget`，并通过 Socket 通道实时推送下载进度，最终将网站内容压缩打包供用户下载。

<!--more-->

## 核心原理

工具的核心是 `wget` 的以下参数组合：

```bash
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent http://example.org
```

各参数含义：

| 参数 | 作用 |
|------|------|
| `--mirror` | 递归下载整站 |
| `--convert-links` | 将所有链接（HTML、CSS 等）转换为相对路径，适配离线浏览 |
| `--adjust-extension` | 自动为 HTML/CSS 文件添加合适的后缀 |
| `--page-requisites` | 下载 CSS、图片等页面渲染所必需的资源 |
| `--no-parent` | 禁止向上爬取父目录，限定下载范围 |

后端通过 `archiver` 将下载完成的文件压缩，再经由 Socket 实时推送压缩进度，用户无需等待整个过程结束即可看到下载状态。

## 技术栈

- **Node.js** + **Express** Web 框架
- **socket.io** 实时双向通信
- **archiver** / **jszip** 文件压缩
- **wget** 命令行工具（系统依赖）
- **Handlebars** 模板引擎

## 快速开始

```bash
# 克隆项目
git clone https://github.com/AhmadIbrahiim/Website-downloader.git
cd Website-downloader

# 安装依赖
npm install

# 启动服务
npm start

# 访问
http://localhost:3000/
```

## 在线体验

作者提供了免费的 [Live Demo](https://website-downloader.onrender.com)，可直接在浏览器中输入目标网址体验下载效果。

## 多平台一键部署

项目还支持多个平台的按钮式部署，点击即可在对应平台自动完成部署：

- [Replit](https://replit.com/github/AhmadIbrahiim/Website-downloader)
- [Glitch](https://glitch.com/edit/#!/import/github/AhmadIbrahiim/Website-downloader)
- [Railway](https://railway.app/new/template?template=https://github.com/AhmadIbrahiim/Website-downloader)
- [Cyclic](https://app.cyclic.sh/api/app/deploy/AhmadIbrahiim/Website-downloader)
- [Koyeb](https://app.koyeb.com/deploy?type=git&repository=github.com/AhmadIbrahiim/Website-downloader)
- [Render](https://render.com/deploy?repo=https://github.com/AhmadIbrahiim/Website-downloader)

## 使用场景

- 📥 备份/归档感兴趣的网站内容
- 📴 在无网络环境下离线浏览网页
- 🧪 分析竞争对手网站的实现方式
- 📚 保存技术文档或教程页面供离线学习

## 总结

Website Downloader 将 wget 的强大能力与现代化的 Web 界面相结合，提供了一个简单易用的网站离线下载方案。如果你有备份网站、离线阅读或网站分析的需求，这款工具值得一试。

> GitHub：[AhmadIbrahiim/Website-downloader](https://github.com/AhmadIbrahiim/Website-downloader)
