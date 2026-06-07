---
title: "ChinaTextbook：开源中国义务教育教材合集，让知识不再被垄断"
date: 2026-06-08
description: "TapXWorld/ChinaTextbook 项目将中国从小学到大学的教育教材集中开源，涵盖人教版数学、物理、化学等全科目PDF，旨在消除教育资源壁垒，帮助海外华人子女延续国内教育。"
author: "Cheman"
slug: chinatextbook
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "教育", "PDF", "教材"]
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

今天在 GitHub Trending 上看到一个极具社会价值的项目：**ChinaTextbook**，它将中国义务教育阶段的教材集中开源，让任何人都能免费获取这些本应属于公众的知识资源。

## 一、项目概述

ChinaTextbook 是由 TapXWorld 发起的开源项目，核心目标是将中国从小学到大学的教育教材以 PDF 形式集中存储于 GitHub 仓库，免费向所有人开放。项目诞生的背景很现实——虽然国内教育网站已提供免费资源，但普通人获取途径受限，甚至有人将这些带私人水印的资源在某平台上售卖。项目希望通过开源消除教育资源的地域壁垒和信息差，同时也帮助海外华人子女继续了解国内教育体系。

**核心特性：**
- 覆盖小学、初中、高中、大学全阶段教材
- 以人教版为主，包含数学、物理、化学等多学科
- PDF 格式直接可用，支持在线阅读与下载
- 提供文件合并工具处理大文件拆分问题

## 二、技术原理

### 仓库结构与组织

项目采用按教育阶段分层的目录结构：

```
ChinaTextbook/
├── 小学/
│   └── 数学/
│       └── 人教版/
│           ├── 义务教育教科书 · 数学一年级上册.pdf
│           └── ...
├── 初中/
│   └── 数学/
│       └── 人教版-人民教育出版社/
├── 高中/
│   └── 数学/
│       └── 人教版（A版）
├── 大学/
│   ├── 高等数学/
│   ├── 线性代数/
│   ├── 离散数学/
│   └── 概率论/
└── .cache/
```

### 大文件拆分与合并策略

GitHub 对单文件有 100MB 的硬性上限，50MB 以上会发出警告。因此项目将超过 50MB 的 PDF 拆分为 35MB 的分片文件，命名规则为：

```
义务教育教科书 · 数学一年级上册.pdf.1
义务教育教科书 · 数学一年级上册.pdf.2
```

项目在 [ChinaTextbook-tools](https://github.com/TapXWorld/ChinaTextbook-tools/releases) 仓库提供了专用的合并工具，也可手动用 `cat` 命令合并：

```bash
# Linux/macOS 合并拆分文件
cat "义务教育教科书 · 数学一年级上册.pdf"* > merged.pdf
```

### 替代下载方案

项目推荐了 [tchMaterial-parser](https://github.com/happycola233/tchMaterial-parser) 工具，可以直接从国家教育资源平台重新下载教材，适合国内网络环境较好的用户。

## 三、安装与快速开始

### 环境要求

- Git（用于克隆仓库）
- PDF 阅读器
- 磁盘空间：完整仓库较大，建议按需下载

### 获取教材

**方式一：克隆完整仓库**

```bash
git clone https://github.com/TapXWorld/ChinaTextbook.git
```

⚠️ 仓库体积较大，完整克隆可能需要较长时间和大量磁盘空间。

**方式二：只下载需要的文件**

直接在 GitHub 网页上浏览对应目录，单独下载所需的 PDF 文件即可。

**方式三：使用 tchMaterial-parser 重新下载**

```bash
git clone https://github.com/happycola233/tchMaterial-parser.git
cd tchMaterial-parser
# 按项目 README 说明运行下载脚本
```

### 合并拆分文件

如果你下载了被拆分的 PDF 分片：

1. 下载 [mergePDFs-windows-amd64.exe](https://github.com/TapXWorld/ChinaTextbook-tools/releases)
2. 将合并程序放入包含拆分 PDF 的目录
3. 双击运行，自动合并同组分片

## 四、使用方法与实战

### 按学科查找教材

| 阶段 | 覆盖内容 | 版本 |
|------|---------|------|
| 小学 | 一至六年级上下册 | 人教版 |
| 初中 | 七至九年级上下册 | 人教版 |
| 高中 | 必修+选修全册 | 人教版A版 |
| 大学 | 高等数学、线代、离散、概率论 | 同济大学等 |

### 海外华人家庭教育场景

对于在海外生活的华人家庭，该项目提供了一个低成本延续中文数学教育的方案。家长可以下载对应年级的 PDF 教材，打印或使用平板让孩子学习，按国内教学进度同步辅导。

## 五、常见问题与解决方案

### Q: 克隆仓库太慢/太大怎么办？

建议不要完整克隆，直接在 GitHub 网页上浏览目录，只下载需要的 PDF 文件。国内用户可使用 tchMaterial-parser 从官方源重新下载。

### Q: 下载的 PDF 打不开？

检查文件是否被拆分（文件名以 `.1`、`.2` 结尾），需要先合并分片文件后再打开。

### Q: 合并工具只有 Windows 版本？

Linux/macOS 用户可以直接用命令行合并：

```bash
cat filename.pdf.* > filename.pdf
```

## 六、总结

ChinaTextbook 是一个具有深远社会意义的开源项目。它用最朴素的方式——把 PDF 放到 GitHub 上——对抗教育资源被二次贩卖的现象。技术实现上没有花哨的架构，但其价值在于行动本身：让教材回归公共属性，让知识不被地域和渠道所垄断。无论你是海外华人家长、教育研究者，还是只想重温课本的普通人，这个仓库都值得一书签。

项目地址：[https://github.com/TapXWorld/ChinaTextbook](https://github.com/TapXWorld/ChinaTextbook)
