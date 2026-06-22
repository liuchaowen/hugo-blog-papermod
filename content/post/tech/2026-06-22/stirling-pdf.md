---
title: "Stirling PDF：功能最全的开源 PDF 处理平台，支持 50+ 工具私有化部署"
date: 2026-06-22
description: "Stirling PDF 是一个功能强大的开源 PDF 编辑平台，提供 50 多种 PDF 处理工具，支持桌面端、浏览器和自托管服务器部署，无需将文档发送到外部服务即可完成编辑、签名、转换等操作。"
author: "Cheman"
slug: "stirling-pdf"
draft: false
categories: ["技术", "开源"]
tags: ["PDF", "开源工具", "Docker", "Java", "Spring Boot", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个非常实用的项目：**Stirling PDF**，一个功能极其强大的开源 PDF 处理平台，支持 50 多种 PDF 操作工具，完全私有化部署，再也不用担心文档隐私泄露了。

## 一、项目概述

Stirling PDF（原 s-pdf）由 Stirling-Tools 团队开发维护，是一个企业级开源 PDF 编辑平台。它旨在解决一个核心痛点：**PDF 处理的隐私与可控性**。市面上大多数在线 PDF 工具都需要上传文件到云端处理，而 Stirling PDF 让你可以在本地或自有服务器上完成所有 PDF 操作。

### 核心特性

- **多端支持**：桌面客户端、浏览器 UI、自托管服务器三种运行模式，覆盖所有使用场景
- **50+ PDF 工具**：编辑、合并、拆分、签名、涂黑、转换、OCR、压缩等一应俱全
- **无代码工作流**：直接在 UI 中构建自动化处理管道，支持 API 处理百万级 PDF
- **企业级能力**：SSO 单点登录、审计日志、灵活的本地部署方案
- **REST API**：几乎所有工具都提供 API 接口，可无缝集成到现有系统
- **国际化**：支持 40+ 种语言的界面

项目采用开源核心（Open Core）许可模式，基础功能完全免费，当前版本为 **2.13.1**。

## 二、技术原理

### 架构设计

Stirling PDF 采用经典的 Spring Boot 单体架构，但通过 Gradle 多模块设计保持了良好的代码组织：

- **`app/core`** — 主应用模块，包含 PDF 处理的核心业务逻辑
- **`common`** — 公共工具库，提供跨模块的共享组件
- **`proprietary`** — 专有功能模块（仅在安全未禁用时加载）
- **`frontend`** — 前端工程，包含基于 TypeScript 的编辑器 UI

从 `build.gradle` 中可以看到，项目使用 `ext.isSecurityDisabled` 闭包动态判断是否加载专有模块，这种设计允许在禁用安全特性的精简模式下运行。

### 核心技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 后端框架 | Spring Boot 4.0.6 | 最新主版本，搭配 Java 25 |
| PDF 引擎 | Apache PDFBox 3.0.7 | 业界标准的 Java PDF 处理库 |
| 构建工具 | Gradle + Taskfile | 统一的构建和开发命令入口 |
| 安全组件 | BouncyCastle 1.84 | PDF 签名和加密的核心依赖 |
| 前端 | TypeScript + Tauri | 原生桌面客户端方案 |
| 容器化 | Docker | 一行命令即可部署 |

### 关键设计决策

项目在安全方面做得非常细致。在 `build.gradle` 的 `configurations.configureEach` 中，可以看到一系列 **CVE 强制修复策略**：

```groovy
resolutionStrategy.force "com.google.code.gson:gson:2.13.2"
resolutionStrategy.force "org.mozilla:rhino:1.9.1"
resolutionStrategy.force "org.apache.commons:commons-lang3:3.20.0"
resolutionStrategy.force "commons-io:commons-io:2.21.0"
```

通过 `resolutionStrategy.force` 硬编码安全版本号，确保即使传递依赖引入了已知漏洞的旧版本，构建时也会被强制替换为安全版本。同时使用 `pixee java-security-toolkit` 作为编译时安全检查工具。

### 数据流分析

PDF 处理的典型数据流为：

1. 用户通过浏览器 UI 或 API 上传 PDF 文件
2. 请求经 Spring Boot Controller 路由到对应的 Tool Service
3. Tool Service 调用 PDFBox / iText / LibreOffice 等引擎执行处理
4. 处理结果直接返回给用户，不经过任何第三方服务

整个处理流程完全在用户控制的实例内闭环，这是 Stirling PDF 最大的卖点。

## 三、安装与快速开始

### 环境要求

- **Docker 部署**（推荐）：仅需 Docker 环境，无其他依赖
- **桌面版**：支持 Windows / macOS / Linux
- **源码构建**：Java 25+，Gradle 8.x

### Docker 一键部署

```bash
docker run -d -p 8080:8080 docker.stirlingpdf.com/stirlingtools/stirling-pdf
```

启动后访问 `http://localhost:8080` 即可使用完整功能。

### 持久化数据

生产环境建议挂载数据卷：

```bash
docker run -d \
  -p 8080:8080 \
  -v /data/stirling-pdf/config:/configs \
  -v /data/stirling-pdf/logs:/logs \
  -v /data/stirling-pdf/custom:/custom \
  docker.stirlingpdf.com/stirlingtools/stirling-pdf
```

### 源码构建

```bash
git clone https://github.com/Stirling-Tools/Stirling-PDF.git
cd Stirling-PDF
task dev
```

项目使用 [Task](https://taskfile.dev/) 作为统一命令入口，`task dev` 会启动完整的开发环境。

## 四、使用方法与实战

### 基础用法

Stirling PDF 的 Web UI 直观易用，打开浏览器后可以直接：

1. **合并 PDF**：拖拽多个 PDF 文件，一键合并为一个文档
2. **PDF 转换**：支持 PDF ↔ Word、Excel、PPT、图片等多种格式互转
3. **页面操作**：旋转、删除、重排、提取指定页面
4. **添加水印**：批量添加文字或图片水印
5. **PDF 签名**：数字签名和手写签名
6. **OCR 识别**：对扫描件进行文字识别

### 进阶用法：API 自动化

几乎所有 UI 操作都有对应的 REST API。例如通过 API 合并 PDF：

```bash
curl -X POST http://localhost:8080/v1/worker/merge \
  -F "fileInput=@document1.pdf" \
  -F "fileInput=@document2.pdf" \
  -o merged.pdf
```

API 文档地址：`https://registry.scalar.com/@stirlingpdf/apis/stirling-pdf-processing-api/`

### 无代码工作流

在企业场景中，可以构建自动化处理管道：

1. 在 UI 中选择多个 PDF 工具串联
2. 设置触发条件（定时、文件上传等）
3. 定义输出路径和格式
4. 一键发布工作流

这种方式适合批量处理合同、发票等标准化文档。

## 五、常见问题与解决方案

### 安全特性相关

**Q: 启动时提示安全相关错误？**

Stirling PDF 默认启用安全认证。如果在内网或测试环境不需要认证，可以设置环境变量：

```bash
docker run -e DOCKER_ENABLE_SECURITY=false -p 8080:8080 stirlingtools/stirling-pdf
```

**Q: 如何配置 SSO 单点登录？**

项目支持 SAML 2.0 SSO，使用 Spring Security SAML 模块（版本 7.0.5，搭配 OpenSAML 5.2.1）。详细配置参考官方文档。

### 运行时问题

**Q: PDF 处理速度慢？**

从 JVM 启动参数可以看到项目做了大量 GC 调优：

```groovy
runtimeArgs = [
    "-XX:+UseG1GC",
    "-XX:MaxGCPauseMillis=200",
    "-XX:G1HeapRegionSize=4m",
    "-XX:+ExplicitGCInvokesConcurrent",
    "-XX:+UseStringDeduplication",
    "-XX:+UseCompactObjectHeaders"
]
```

如果仍需提升性能，可以增加容器内存限制并调整 G1GC 参数。

**Q: 转换格式支持不全？**

部分格式转换依赖 LibreOffice，需要确保 Docker 镜像中包含 LibreOffice。官方镜像已内置，自定义部署时需要额外安装。

## 六、总结

Stirling PDF 是目前开源社区中功能最全面的 PDF 处理平台之一。它最大的优势在于 **隐私可控**——所有处理都在本地完成，不需要将敏感文档上传到第三方服务。50 多种 PDF 工具覆盖了日常和企业的绝大多数需求，Docker 一键部署和完善的 REST API 更是让集成变得极其简单。

对于个人用户，它是替代 Adobe Acrobat 的免费方案；对于企业用户，它是构建文档处理服务的理想基础。如果你正在寻找一个可私有化部署的 PDF 工具，Stirling PDF 值得重点关注。

项目地址：[Stirling-Tools/Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF)
