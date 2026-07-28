---
title: "Go Music DL：一站式多平台音乐搜索下载工具，支持 Web/TUI/桌面/移动端"
date: 2026-07-28
description: "Go Music DL 是一个用 Go 语言编写的开源音乐搜索与下载工具，支持 Web 界面、TUI 终端、原生桌面和移动端，覆盖网易云、QQ 音乐、酷狗、酷我、咪咕、Bilibili 等 13 个平台，并提供 FLAC 无损音乐下载、歌单解析、本地音乐管理等功能。"
author: "Cheman"
slug: go-music-dl
draft: false
categories: ["技术", "开源"]
tags: ["Go", "音乐", "开源", "多平台", "Docker", "TUI"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Go Music DL**，一个用 Go 语言编写的全平台音乐搜索与下载聚合工具，支持 Web、TUI、桌面应用和移动端四种使用模式，覆盖 13 个主流音乐平台，堪称音乐下载领域的「瑞士军刀」。

## 一、项目概述

Go Music DL 并不是又一个简单的音乐解析脚本，而是一个完整的多端应用生态。它的核心目标是：**一个工具，解决所有音乐平台的搜索、试听、下载、歌词抓取、歌单管理和本地音乐组织问题。**

**核心特性一览：**

- **四套 UI 模式**：Web 界面、TUI 终端、原生桌面应用（Windows/macOS/Linux）、移动端 App（Android/iOS）
- **13 个音乐平台覆盖**：网易云音乐、QQ 音乐、酷狗、酷我、咪咕、千千音乐、汽水音乐、5sing、Jamendo、JOOX、Bilibili、Apple Music
- **FLAC 无损音乐**：网易云、QQ 音乐、Bilibili 支持 FLAC 无损格式下载
- **歌单与专辑解析**：支持单曲 / 歌单 / 专辑搜索，链接直接解析，批量下载
- **歌词双格式**：网易云、QQ 音乐、酷狗支持原文 / 译文 / 罗马音逐字 LRC 展示及卡拉 OK 式逐字高亮
- **本地音乐管理**：Web 端内置本地音乐库，支持上传、元数据探测、封面 / 歌词自动匹配、SQLite 索引加速搜索
- **Cookie 扫码登录**：Web 设置面板支持网易云、QQ、酷狗、Bilibili 扫码获取 Cookie，读取个人歌单和高音质资源
- **自制歌单**：Web 端可创建本地收藏夹，将不同平台歌曲聚合收藏
- **每日歌单推荐**：聚合多平台官方推荐歌单

## 二、技术原理

### 架构设计

项目采用前后端分离架构，核心由 Go 语言实现：

```
go-music-dl/
├── cmd/music-dl/          # CLI/TUI 主程序入口
├── core/                   # 核心业务逻辑
├── internal/
│   ├── cli/               # TUI 界面 (Bubble Tea 框架)
│   └── web/               # Web 后端 (Gin 框架)
│       ├── music.go       # 音乐搜索与解析路由
│       ├── collection.go  # 自制歌单接口 (GORM)
│       └── local_music.go # 本地音乐扫描与管理
├── desktop/               # Rust + Tao/Wry 桌面应用
├── desktop_go/            # Go + WebView2 桌面应用
└── desktop_app/           # Go + Gio 移动端应用
```

**核心技术栈：**

| 组件 | 技术选型 | 选型理由 |
|------|---------|---------|
| CLI/TUI | Cobra + Bubble Tea | 命令行参数管理 + 终端 UI |
| Web 框架 | Gin | 高性能中间件生态丰富 |
| 数据库 | SQLite (GORM) | 零配置、嵌入式，适合本地持久化 |
| 桌面端 | Tao/Wry (Rust) 或 WebView2 (Go) | 跨平台窗口管理 |
| 移动端 | Gio | 纯 Go 跨平台 UI 框架 |
| 音乐解析 | music-lib | 作者自研的多平台音乐解析库 |

### Web 模式原理

Web 模式本质是一个内置 HTTP 服务器，提供 RESTful API + HTML 模板渲染：

```go
// internal/web/server.go 核心结构
type WebServer struct {
    Engine *gin.Engine
    Music  *MusicService    // 音乐搜索下载服务
    DB     *gorm.DB         // SQLite 数据库
    Config *Settings
}

// 典型 API 路由
GET  /api/search?q=关键词&source=平台
GET  /api/song/:id/download
GET  /api/playlist/:id
GET  /api/local_music?refresh=0
POST /api/collection          // 创建自制歌单
```

启动命令简单直接：

```bash
./music-dl web --port 8080 --no-browser
```

浏览器访问 `http://localhost:8080` 即可使用。Web 端默认不需要登录，只有「系统配置」（Cookie 管理、管理员账号）才需要认证。

### Docker 部署架构

Docker 部署使用 Alpine 轻量镜像，并内置 `ffmpeg` 和 `ffprobe`：

```dockerfile
FROM alpine:3.22
RUN apk --no-cache add ca-certificates tzdata ffmpeg
RUN adduser -D -s /bin/sh appuser
USER appuser
CMD ["./music-dl", "web", "--port", "8080", "--no-browser"]
```

数据通过 `./data` 目录持久化挂载：

```bash
docker compose up -d
# 访问 http://localhost:8080
```

### 本地音乐性能优化

本地音乐管理是该项目的一大亮点，技术实现上有多层优化：

1. **SQLite 索引表**：启动时异步建立索引表（下载目录的路径 + 文件大小 + 修改时间），关键词搜索免去逐次重扫
2. **元数据缓存**：每首歌的标题 / 歌手 / 封面 / 歌词 / 时长 / 码率按路径哈希索引，命中后跳过 `ffprobe` 与 tag 解析
3. **扫描快照缓存**：`GET /api/local_music` 结果缓存 10 秒，TTL 内反复访问直接返回快照，不重扫
4. **后台异步刷新**：缓存过期时先返回上次结果，再启动后台重扫，不阻塞用户请求
5. **分页加载**：按配置分页，支持快捷键翻页，避免一次性渲染大量数据

```go
// internal/web/local_music.go 核心逻辑
func (s *Server) handleLocalMusic(c *gin.Context) {
    refresh := c.Query("refresh") == "1"
    if !refresh {
        if cached := s.localMusicCache.Get(); cached != nil {
            c.JSON(200, cached)
            return
        }
    }
    // 启动后台异步扫描
    go s.scanLocalMusicAsync()
    // 立即返回上次结果
    c.JSON(200, s.lastScanResult)
}
```

## 三、安装与快速开始

### 环境要求

- Go 1.25+
- FFmpeg（可选，未安装时本地音乐部分功能降级）
- Docker（可选，容器部署）

### 二进制下载（推荐）

前往 [Releases](https://github.com/guohuiyuan/go-music-dl/releases) 页面下载对应平台的二进制文件：

- **Windows**: `music-dl-desktop-go.exe` 或 `music-dl-desktop-rust.exe`（原生桌面，绿色免安装）
- **macOS**: 下载后 `chmod +x` 赋予执行权限
- **Linux**: 下载后 `chmod +x` 赋予执行权限
- **Android**: `music-dl_arm64-v8a.apk`（推荐，已内置 FFmpeg）
- **iOS**: `music-dl-ios-unsigned.ipa`（需自行签名）

### Docker 部署

```bash
# 创建数据目录
mkdir -p data && chmod 777 data

# 拉取并启动
docker compose up -d --remove-orphans

# 查看日志
docker compose logs -f
```

### 编译安装

```bash
# 克隆仓库
git clone https://github.com/guohuiyuan/go-music-dl.git
cd go-music-dl

# 编译 CLI/TUI 版本
go build -o music-dl ./cmd/music-dl

# 运行
./music-dl -k "周杰伦 晴天"
```

### FFmpeg 安装（如需本地音乐元数据功能）

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
winget install Gyan.FFmpeg
```

## 四、使用方法与实战

### TUI 模式：终端里的音乐宝库

```bash
./music-dl -k "周杰伦"
```

TUI 常用按键：

| 按键 | 功能 |
|------|------|
| `↑/↓` | 移动光标 |
| `空格` | 选择歌曲 |
| `a` | 全选 / 清空 |
| `r` | 对勾选歌曲批量换源 |
| `Enter` | 下载选中歌曲 |
| `b` | 返回上级菜单 |
| `w` | 每日歌单推荐 |
| `p` | 播放（基于系统 ffplay） |
| `s` | 停止播放 |
| `q` | 退出程序 |

### 指定平台搜索

```bash
# 只搜索网易云和 QQ 音乐
./music-dl -k "周杰伦" -s qq,netease

# 指定下载目录
./music-dl -k "周杰伦" -o ./my_music

# 下载时内嵌封面和歌词
./music-dl -k "周杰伦" --cover --lyrics
```

### 链接解析：单曲 / 歌单 / 专辑

直接粘贴分享链接即可解析：

```bash
# 单曲
./music-dl -k "https://music.163.com/#/song?id=123456"

# 歌单
./music-dl -k "https://music.163.com/#/playlist?id=123456"

# 专辑
./music-dl -k "https://music.163.com/#/album?id=123456"
```

### Web 模式：浏览器里的全能音乐站

```bash
./music-dl web --port 8080
```

浏览器打开 `http://localhost:8080` 后，可以：

- 搜索单曲 / 歌单 / 专辑，批量选择后下载
- 登录个人账号（Cookie 扫码登录），访问「我的歌单」
- 浏览官方歌单分类（网易云、QQ、酷狗等）
- 管理本地下载目录的音乐，上传文件，自动补全元信息
- 创建自制收藏夹，跨平台聚合歌曲
- 下载时选择是否内嵌元数据（封面 / 歌词）

### Cookie 扫码登录

Web 右上角「设置」→「Cookie 管理」：

1. 点击对应平台的「扫码」按钮
2. 用对应音乐 App 扫码并确认登录
3. Cookie 自动写入并保存到本地

支持的扫码平台：网易云音乐、QQ 音乐、酷狗音乐、Bilibili。

> 注意：汽水音乐因新版动态风控签名暂未调通，需手动配置 Cookie。

### 自制歌单与本地音乐

Web 端支持完整的本地音乐管理：

- **上传音频**：在本地音乐弹窗中上传，文件保存到下载目录
- **元数据探测**：优先读取音频内嵌信息，缺失时用 ffprobe 探测补全
- **封面 / 歌词**：自动查找同目录同名 `.jpg`、`.lrc` 等文件
- **添加到自制歌单**：本地歌曲可一键收藏到自建歌单
- **搜索索引**：本地音乐已成为独立搜索源（`local`），关键词搜索时与在线结果一起返回

## 五、常见问题与解决方案

**Q: 桌面应用打不开或显示空白？**
> 确认已安装 WebView2 运行时。从 [Microsoft 官网](https://developer.microsoft.com/microsoft-edge/webview2/) 下载安装最新版本。Windows 11 和 macOS 通常已自带。

**Q: 桌面应用启动时提示"另一个程序正在使用此文件"？**
> 上一次运行的后台进程未正常退出。Windows 上执行：
> ```powershell
> taskkill /F /IM music-dl.exe
> ```

**Q: 有些歌曲搜不到或下载失败？**
> 可能是付费限制、平台接口变更或网络问题。可尝试「换源」功能，在其他平台找替代版本。Web 端设置中可开启「自动选择无效音源并批量换源」。

**Q: Android APK 无法读取本地音乐？**
> App 启动时会动态申请 `READ_MEDIA_AUDIO` / `READ_EXTERNAL_STORAGE` 权限，请在系统提示时授予。Android 11+ 建议将本地下载目录设置为 `/sdcard/Music`，便于系统音乐应用识别。

**Q: 开启"内嵌元数据"后没生效？**
> 确认系统已安装 FFmpeg 且 `ffmpeg -version` 可执行。Docker 镜像和 Android APK 已内置 FFmpeg；CLI/桌面/Linux 包仍需手动安装。

**Q: Docker 部署后 Web 界面访问不到？**
> 检查容器是否正常启动：`docker compose logs -f`。确认端口 8080 未被占用，或在 `docker-compose.yml` 中修改映射端口。

**Q: iOS IPA 无法安装？**
> `music-dl-ios-unsigned.ipa` 需要用户用自己的证书和 provisioning profile 重签后才能安装。如需 GitHub Actions 自动发布已签名包，需配置 `IOS_PROVISION_PROFILE_BASE64`、`IOS_CERTIFICATE_P12_BASE64` 和 `IOS_CERTIFICATE_PASSWORD`。

## 六、总结

Go Music DL 是一个功能极其全面的音乐工具，在多平台覆盖、使用模式丰富度、本地音乐管理和部署便捷性上都做得相当出色。核心优势总结如下：

1. **一站式体验**：四种使用模式（Web/TUI/桌面/移动），用户可以根据场景自由选择
2. **平台覆盖广**：13 个主流音乐平台，几乎涵盖了国内外的所有常用音乐服务
3. **无损音乐**：网易云、QQ、Bilibili 均支持 FLAC 无损下载，对于音质有要求的用户很有吸引力
4. **本地音乐管理完善**：分页、缓存、索引三重优化，上千首本地音乐也能秒级搜索
5. **部署零门槛**：Docker 一键启动，无需配置任何环境变量

如果你是音乐爱好者、播客制作者或者需要批量整理音乐资源，Go Music DL 值得一试。项目仍在活跃开发中（Star History 持续增长），作者响应也很及时，遇到问题可以提 Issue。

项目地址：[https://github.com/guohuiyuan/go-music-dl](https://github.com/guohuiyuan/go-music-dl)
