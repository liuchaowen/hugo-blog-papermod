---
title: "Immich：高性能自托管照片和视频管理解决方案"
date: 2026-07-05
description: "Immich 是一个开源的高性能自托管照片和视频管理解决方案，支持自动备份、多用户、元数据查看、人脸识别、CLIP 搜索等功能，是 Google Photos 的自托管替代品。"
author: "Cheman"
slug: immich
draft: false
categories: ["技术", "开源"]
tags: ["Immich", "自托管", "照片管理", "开源", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Immich**，这是一个高性能的自托管照片和视频管理解决方案，旨在为用户提供类似 Google Photos 的体验，同时让用户完全掌控自己的数据。

## 一、项目概述

Immich 是一个开源项目（AGPL v3 许可证），提供高性能的自托管照片和视频管理服务。项目的核心目标是让用户能够完全掌控自己的照片和视频数据，同时享受现代化的照片管理体验。

**核心特性：**
- 上传和查看视频和照片
- 打开应用时自动备份
- 防止资源重复
- 选择性备份相册
- 下载照片和视频到本地设备
- 多用户支持
- 相册和共享相册
- 可拖动的滚动条
- 支持 RAW 格式
- 元数据查看（EXIF、地图）
- 基于元数据、对象、人脸和 CLIP 的搜索
- OAuth 支持
- LivePhoto/MotionPhoto 备份和播放
- 人脸识别 and 聚类
- 记忆功能（x 年前的今天）

**支持平台：**
- 移动端（iOS、Android）：完整功能支持
- Web 端：完整功能支持

## 二、技术原理

### 架构设计

Immich 采用 monorepo 架构，使用 pnpm 作为包管理器。从项目的 package.json 可以看出，项目包含多个模块：

```
MODULES = e2e server web cli sdk docs .github
```

主要模块包括：
- **server**：后端服务，处理 API 请求、文件存储、元数据提取等
- **web**：Web 前端，提供照片管理的用户界面
- **cli**：命令行工具
- **sdk**：软件开发工具包
- **e2e**：端到端测试
- **docs**：项目文档

### 核心技术栈

1. **后端**：
   - Node.js + TypeScript
   - 使用 pnpm 管理依赖
   - 使用 exiftool-vendored 处理图片元数据

2. **前端**：
   - 可能使用 React 或 Vue（根据现代 Web 开发实践）
   - 响应式设计，支持移动端和桌面端

3. **机器学习**：
   - 人脸识别 and 聚类
   - CLIP 模型用于图像搜索
   - 对象检测

4. **存储**：
   - 支持用户定义的存储结构
   - 防止重复资源

### 关键设计

从 Makefile 可以看出，项目使用 `mise` 作为开发工具管理器，替代了传统的 Make 命令。这表明项目注重开发体验和现代化工具链。

**依赖管理策略：**
项目通过 `.pnpmfile.cjs` 自定义 pnpm 的依赖解析行为，特别是处理 `exiftool-vendored` 的依赖。在 Docker 生产镜像构建时，使用 `--no-optional` 来减小镜像大小，因此需要将 `exiftool-vendored.pl` 从可选依赖转换为常规依赖。

```javascript
// .pnpmfile.cjs 关键代码
if (pkg.name === "exiftool-vendored") {
  const binaryPackage =
    process.platform === "win32"
      ? "exiftool-vendored.exe"
      : "exiftool-vendored.pl";

  if (pkg.optionalDependencies[binaryPackage]) {
    pkg.dependencies[binaryPackage] =
      pkg.optionalDependencies[binaryPackage];
    delete pkg.optionalDependencies[binaryPackage];
  }
}
```

这个设计确保了在不同平台（Windows/Linux/macOS）上都能正确安装 exiftool，同时在 Docker 生产环境中也能正常工作。

### 数据流分析

1. **上传流程**：
   - 用户通过移动端或 Web 端上传照片/视频
   - 服务端接收文件，计算哈希值防止重复
   - 提取元数据（EXIF、地理位置等）
   - 存储文件到用户定义的存储结构
   - 触发机器学习任务（人脸识别、对象检测等）

2. **搜索流程**：
   - 用户输入搜索词
   - 系统通过 CLIP 模型将搜索词编码为向量
   - 与照片的向量表示进行相似度匹配
   - 返回匹配的照片

3. **备份流程**：
   - 移动端应用监听照片库变化
   - 自动上传新照片到服务器
   - 支持后台备份和选择性相册备份

## 三、安装与快速开始

### 环境要求

- Docker 和 Docker Compose（推荐）
- 或者：Node.js、PostgreSQL、Redis 等

### 安装步骤

**使用 Docker Compose（推荐）：**

1. 创建 `docker-compose.yml` 文件：

```yaml
version: "3.8"

services:
  immich-server:
    image: ghcr.io/immich-app/immich-server:${IMMICH_VERSION:-release}
    volumes:
      - ${UPLOAD_LOCATION}:/usr/src/app/upload
    env_file:
      - .env
    ports:
      - 2283:3001

  immich-machine-learning:
    image: ghcr.io/immich-app/immich-machine-learning:${IMMICH_VERSION:-release}
    env_file:
      - .env

  redis:
    image: redis:6.2-alpine

  database:
    image: postgres:14-alpine
    env_file:
      - .env
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

2. 创建 `.env` 文件：

```env
UPLOAD_LOCATION=/path/to/your/uploads
IMMICH_VERSION=release
DB_PASSWORD=postgres
DB_USERNAME=postgres
DB_DATABASE_NAME=immich
```

3. 启动服务：

```bash
docker-compose up -d
```

4. 访问 `http://localhost:2283` 并开始使用

### 最简运行示例

**使用移动端应用：**

1. 从 App Store 或 Google Play 下载 Immich 应用
2. 打开应用，输入服务器地址（如 `http://your-server:2283`）
3. 注册账号或登录
4. 启用自动备份

## 四、使用方法与实战

### 基础用法

1. **上传照片**：
   - Web 端：拖拽照片到网页
   - 移动端：启用自动备份，或手动选择照片上传

2. **浏览照片**：
   - 按时间线浏览
   - 查看照片详情（元数据、地图位置）
   - 全屏查看

3. **创建相册**：
   - 选择照片创建相册
   - 共享相册给其他用户

### 进阶用法

1. **搜索照片**：
   - 按对象搜索："猫"、"汽车"
   - 按人脸搜索：识别并聚类人脸
   - 按元数据搜索：日期、位置、相机型号

2. **共享和协作**：
   - 创建共享相册
   - 邀请其他用户协作
   - 设置相册权限

3. **Partner Sharing**：
   - 与伴侣共享照片
   - 互相查看对方的照片

### 实际项目示例

**场景：家庭照片管理**

1. 部署 Immich 到家庭服务器
2. 为每个家庭成员创建账号
3. 开启自动备份
4. 创建"家庭相册"，所有成员上传的照片自动汇总
5. 使用搜索功能快速找到特定照片（如"2024年夏天"、"海滩"）

**场景：摄影师作品管理**

1. 上传 RAW 格式照片
2. 查看 EXIF 信息（相机设置、镜头信息）
3. 使用标签功能组织作品
4. 创建共享相册，与客户分享精选作品

## 五、常见问题与解决方案

### 安装失败

**问题**：Docker 镜像拉取失败
**解决方案**：
- 检查网络连接
- 配置 Docker 镜像加速器
- 使用代理

**问题**：PostgreSQL 启动失败
**解决方案**：
- 检查 `.env` 文件中的数据库配置
- 确保数据卷权限正确
- 查看 Docker 日志：`docker logs immich-postgres`

### 运行时错误

**问题**：上传失败
**解决方案**：
- 检查上传目录权限
- 检查磁盘空间
- 查看服务器日志

**问题**：机器学习功能不工作
**解决方案**：
- 确保 `immich-machine-learning` 服务正在运行
- 检查 GPU 支持（如果需要加速）
- 查看机器学习服务日志

### 性能问题

**问题**：照片加载慢
**解决方案**：
- 启用缩略图生成
- 使用 CDN 加速
- 优化数据库查询

**问题**：搜索慢
**解决方案**：
- 确保机器学习服务正常运行
- 预计算照片向量
- 使用更快的硬件（GPU）

### 兼容性问题

**问题**：移动端应用无法连接服务器
**解决方案**：
- 检查服务器地址是否正确
- 确保服务器端口已开放
- 检查 SSL 证书（如果使用 HTTPS）

**问题**：RAW 格式不支持
**解决方案**：
- 确保 exiftool 已正确安装
- 检查文件权限
- 查看支持格式列表

## 六、总结

Immich 是一个功能强大、性能优异的开源自托管照片和视频管理解决方案。它具有以下优点：

1. **完全掌控数据**：用户数据存储在自己的服务器上，确保隐私安全
2. **功能丰富**：支持自动备份、多用户、搜索、共享等功能
3. **跨平台支持**：移动端和 Web 端都提供完整功能
4. **现代化技术栈**：使用 TypeScript、pnpm、Docker 等现代技术
5. **活跃社区**：项目在 GitHub 上活跃开发，持续更新

**注意事项**：
- 项目处于快速开发阶段，可能存在 bug
- 需要遵循 3-2-1 备份策略（3 份副本、2 种介质、1 个异地备份）
- 生产环境部署需要合理配置硬件资源

如果你在寻找一个开源的、自托管的 Google Photos 替代品，Immich 绝对值得尝试。

**项目链接**：
- GitHub：https://github.com/immich-app/immich
- 文档：https://docs.immich.app/
- Demo：https://demo.immich.app/
