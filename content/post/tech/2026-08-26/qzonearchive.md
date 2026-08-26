---
title: "QzoneArchive：安全归档你的QQ空间记忆，一个跨平台本地工具"
date: 2026-08-26
description: "QzoneArchive 是一款用 Rust + Tauri 2 + Vue 3 构建的跨平台桌面和移动端工具，可以安全地将QQ空间动态、照片、视频与互动记录归档到本地SQLite数据库，支持断点续传、频率保护、HTML导出和媒体时光轴等功能，所有数据完全本地存储，不上传任何服务器。"
author: "Cheman"
slug: qzonearchive
draft: false
categories: ["技术", "开源工具"]
tags: ["GitHub", "QQ空间", "归档工具", "Tauri", "Rust", "Vue3", "数据备份"]
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

今天在 GitHub Trending 上看到一个非常有情怀的项目：**QzoneArchive**，它帮助你把承载青春记忆的QQ空间内容安全地归档到本地，让你的回忆不再依赖平台存续。

## 一、项目概述

QzoneArchive 是一款跨平台的桌面和移动端应用，专注于将QQ空间的动态、照片、视频与互动记录安全地归档到本地。它基于 Tauri 2 框架开发，前端使用 Vue 3 + TypeScript，后端使用 Rust，数据存储在本地 SQLite 数据库中。

**核心价值**：
- 解决QQ空间内容无法批量导出的问题
- 让用户拥有自己数据的完全控制权
- 支持跨平台使用（Windows / macOS / Linux / Android）

**主要特性**：
- **完整归档**：还原原始动态正文、图片、视频和评论，按"本人动态"、"好友动态"、"留言"分类整理
- **断点续传**：中断后自动从上次位置继续，已归档的内容不会丢失
- **频率保护**：每10分钟最多请求300页，触发限流后安全暂停，倒计时结束即可继续
- **互动还原**：查看每条动态的点赞用户和评论回复，支持互动排行榜
- **本地存储**：所有数据以SQLite保存在本地应用数据目录，不上传任何服务器
- **HTML导出**：支持按分类或选中导出为独立HTML文件，可离线浏览
- **媒体时光轴**：按年份浏览归档的照片和视频，视频支持按需缓存
- **暗色模式**：跟随系统或手动切换

## 二、技术原理

### 2.1 架构设计

项目采用 Tauri 2 的经典架构：Rust 后端负责核心业务逻辑和数据持久化，Vue 3 前端负责用户界面，通过 Tauri 的 IPC 机制进行通信。

```
┌─────────────────────────────────────────────────────┐
│                   Vue 3 Frontend                     │
│  ┌─────────┬──────────┬──────────┬───────────┐      │
│  │Dashboard│ Archives │  Media   │   Tasks   │      │
│  │  View   │   View   │Timeline  │   View    │      │
│  └────┬────┴────┬─────┴────┬─────┴─────┬─────┘      │
│       │         │          │           │            │
│  ┌────┴─────────┴──────────┴───────────┴────┐       │
│  │           Pinia State Management          │       │
│  └────────────────────┬─────────────────────┘       │
└───────────────────────┼─────────────────────────────┘
                        │ Tauri IPC
┌───────────────────────┼─────────────────────────────┐
│                 Rust Backend                        │
│  ┌────────────┬────────────┬──────────────┐         │
│  │  qlogin.rs │  qzone.rs  │  archive.rs  │         │
│  │  QQ登录    │  API接口   │  归档引擎     │         │
│  └─────┬──────┴─────┬──────┴──────┬───────┘         │
│        │            │             │                  │
│  ┌─────┴────────────┴─────────────┴──────┐          │
│  │         SQLite Database (rusqlite)     │          │
│  └────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### 2.2 数据来源与接口

归档基于QQ空间的**移动端互动列表接口** (`mobile.qzone.qq.com/get_feeds`)。该接口返回当前账号收到的所有互动通知——包括好友发布的新动态、点赞、评论、回复、留言等。程序从中提取原始动态内容并存入本地数据库。

**注意**：没有被点赞或评论过的动态无法被恢复，因为它们不会出现在互动列表中。

### 2.3 核心技术栈

| 层 | 技术 | 选型理由 |
|---|------|---------|
| 桌面框架 | Tauri 2 | 比Electron更轻量，Rust后端性能优异 |
| 前端 | Vue 3 + TypeScript + Vite | 现代化前端栈，类型安全 |
| UI组件 | PrimeVue 4 | 丰富的企业级组件 |
| 状态管理 | Pinia | Vue 3 官方推荐的状态管理 |
| 后端数据库 | SQLite (rusqlite) | 轻量级本地存储，无需额外服务 |
| HTTP客户端 | reqwest (rustls-tls) | Rust生态标准HTTP库 |
| 打包 | NSIS (Windows) / Android APK | 跨平台分发支持 |

### 2.4 登录安全机制

项目实现了两种登录方式，且特别注重安全性：

```rust
// 登录凭证仅存储在 Rust 后端内存中，不会写入控制台或日志
// 示意代码（非源码）
pub struct QzoneSession {
    cookie: String,  // 仅内存持有
}

impl QzoneSession {
    // 二维码登录：调用QQ空间移动端扫码登录流程
    pub async fn login_by_qrcode(&mut self) -> Result<()> {
        // 全程不接触密码
    }
    
    // 网页登录（桌面端）：通过WebView Cookie API提取登录凭证
    pub async fn login_by_webview(&mut self) -> Result<()> {
        // Cookie不落盘
    }
}
```

### 2.5 频率保护机制

为避免账号风险，项目内置了请求频率限制：

```rust
// 频率保护逻辑示意
const MAX_PAGES_PER_10_MIN: usize = 300;

pub struct RateLimiter {
    request_count: usize,
    window_start: Instant,
}

impl RateLimiter {
    pub fn check_and_wait(&mut self) -> Result<()> {
        if self.request_count >= MAX_PAGES_PER_10_MIN {
            let elapsed = self.window_start.elapsed();
            if elapsed < Duration::from_secs(600) {
                let wait_time = Duration::from_secs(600) - elapsed;
                // 安全暂停，倒计时结束即可继续
                sleep(wait_time);
            }
            self.reset();
        }
        self.request_count += 1;
        Ok(())
    }
}
```

## 三、安装与快速开始

### 3.1 环境要求

**桌面端**：
- Windows 10+（需要WebView2，系统自带）
- macOS 10.15+
- Linux（需要WebkitGTK）

**移动端**：
- Android 7.0+

**开发者构建**：
- Rust 1.77+
- Node.js 20+

### 3.2 安装步骤

**方式一：下载预编译包**

从 GitHub Releases 页面下载对应平台的安装包：
- Windows: `.exe` (NSIS安装包)
- macOS: `.dmg`
- Linux: `.AppImage` 或 `.deb`
- Android: `.apk`

**方式二：从源码构建**

```bash
# 克隆仓库
git clone https://github.com/Gaoshu705/QzoneArchive.git
cd QzoneArchive

# 安装前端依赖
npm install

# 启动开发服务器（桌面端）
npm run tauri dev

# Android 构建
npm run tauri android dev
```

### 3.3 构建生产版本

```bash
# Windows NSIS 安装包
npm run tauri:build:windows

# Windows NSIS + MSI
npm run tauri:build:windows:all

# Android APK
npm run tauri android build
```

## 四、使用方法与实战

### 4.1 首次使用

1. 启动应用后，选择登录方式：
   - **二维码登录**：使用手机QQ扫描屏幕上的二维码
   - **网页登录**：在弹出的窗口中完成QQ登录

2. 登录成功后，进入归档任务页面，点击"开始归档"

3. 归档过程中可以随时暂停或关闭应用，下次打开会自动从断点继续

### 4.2 浏览归档内容

归档完成后，可以：

- **分类浏览**：在"归档内容"页面，按"本人动态"、"好友动态"、"留言"分类查看
- **搜索功能**：支持关键词搜索历史动态
- **媒体时光轴**：按年份查看归档的照片和视频
- **互动排行**：查看互动最频繁的好友

### 4.3 导出数据

支持两种导出方式：

1. **HTML导出**：选择分类或特定动态，导出为独立HTML文件，可离线浏览
2. **数据库备份**：应用数据存储在本地SQLite数据库中，可直接备份该文件

### 4.4 高级配置

应用设置页面提供：

- 存储路径自定义
- 归档频率调整
- 请求超时设置
- 暗色模式切换

## 五、常见问题与解决方案

### 5.1 登录失败

**问题**：二维码过期或网页登录无响应

**解决方案**：
- 确保网络连接正常
- 尝试重新生成二维码
- 检查是否被QQ安全中心拦截

### 5.2 归档中断

**问题**：归档过程中出现错误或中断

**解决方案**：
- 应用支持断点续传，直接重新开始即可
- 如果频繁失败，可能是限流触发，建议换时间段

### 5.3 部分动态无法恢复

**问题**：某些早期动态没有出现在归档中

**解决方案**：
- 这是正常现象：只有被点赞或评论过的动态才能被恢复
- 可以在"好友动态"分类中查找

### 5.4 视频无法播放

**问题**：归档的视频显示链接过期

**解决方案**：
- QQ的视频签名有时效性
- 重新执行归档任务可以更新视频地址

### 5.5 账号安全

**问题**：担心归档操作会影响账号安全

**解决方案**：
- 登录凭证仅存储在内存中，不会写入磁盘
- 应用不会上传任何数据到服务器
- 建议不要在归档过程中频繁切换账号

## 六、总结

QzoneArchive 是一个充满情怀的实用工具，它解决了QQ空间用户长期以来的痛点：无法批量导出自己的内容。项目采用现代化的技术栈（Tauri 2 + Vue 3 + Rust），实现了跨平台支持、断点续传、频率保护等关键功能，并且特别注重数据安全和隐私保护。

**推荐人群**：
- 希望备份QQ空间回忆的用户
- 关注数据自主权的用户
- 对Tauri跨平台开发感兴趣的开发者

**项目亮点**：
- 完整的本地存储方案，数据完全由用户掌控
- 人性化的频率保护机制，避免账号风险
- 支持HTML导出，方便长期保存和分享

**开源地址**：https://github.com/Gaoshu705/QzoneArchive

如果你也有QQ空间的回忆想要保存，不妨试试这个工具，让你的青春记忆不再依赖平台存续。
