---
title: "iptv-org/iptv：一个收录全球公开 IPTV 频道的开源项目"
date: 2026-06-13
description: "iptv-org/iptv 是一个开源社区项目，汇集了来自全球各地的公开 IPTV 频道播放链接，支持 M3U 格式导出，可直接导入 VLC、PotPlayer 等播放器使用，并配套提供 EPG 电子节目指南和 API 接口。"
author: "Cheman"
slug: iptv
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "IPTV", "流媒体"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**iptv-org/iptv**，一个汇聚全球公开 IPTV 频道的开源项目，一行 M3U 链接就能在任意播放器里看遍天下电视。

## 一、项目概述

`iptv-org/iptv` 是由社区驱动的开源项目，旨在收录互联网上的公开 IPTV（Internet Protocol Television）频道链接，让用户无需订阅即可免费观看全球电视直播。项目核心特点：

- **海量频道**：收录全球范围内的公开电视频道，涵盖新闻、体育、娱乐、儿童等各类内容
- **标准化格式**：输出符合 M3U 标准的播放列表，兼容 VLC、PotPlayer、Kodi 等主流播放器
- **实时更新**：通过 GitHub Actions 自动校验频道链接有效性，剔除失效链接
- **多维度分类**：提供按国家、语言、类别的独立播放列表，方便精准获取目标频道
- **配套生态**：包含 EPG（电子节目指南）生成工具、RESTful API 以及数据库项目

## 二、技术原理

### 架构设计

项目采用多仓库架构，生态链完整：

| 子项目 | 仓库 | 作用 |
|--------|------|------|
| iptv | 本仓库 | 播放列表维护与分发 |
| database | iptv-org/database | 频道元数据（名称、国家、语言等） |
| api | iptv-org/api | RESTful 接口封装 |
| epg | iptv-org/epg | 电子节目指南生成 |

### 数据模型

频道数据以 M3U 格式存储，关键字段包括 `#EXTINF` 扩展信息：

```m3u
#EXTINF:-1 tvg-id="CNN.us" tvg-name="CNN" tvg-country="US" tvg-language="English" group-title="News",CNN
https://live.cnn.com/hls/feed/123.m3u8
```

`#EXTINF` 行定义元数据，`url` 行定义实际流地址。项目使用 `iptv-playlist-parser` 库解析 M3U 文件，关键解析逻辑：

```typescript
// eslint.config.mjs (项目 ESLint 配置节选)
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import stylistic from '@stylistic/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { FlatCompat } from '@eslint/eslintrc'
import globals from 'globals'

export default [
  ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      '@stylistic': stylistic
    },
    languageOptions: {
      globals: { ...globals.browser },
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      '@stylistic/linebreak-style': ['error', 'windows'],
      quotes: ['error', 'single'],
      semi: ['error', 'never']
    }
  }
]
```

### 核心技术栈

从 `package.json` 可以看出项目使用的关键技术：

- **Node.js + TypeScript**：主体开发语言，通过 SWC 加速 Jest 测试
- **@octokit/core**：与 GitHub API 交互，自动化工作流
- **iptv-playlist-parser**：M3U/M3U8 格式解析
- **hls-parser / mpd-parser**：HLS 与 DASH 流协议解析
- **axios**：HTTP 请求
- **ESLint + TypeScript ESLint**：代码质量保障

### 自动化流水线

项目通过 GitHub Actions 实现频道链接的自动化校验与播放列表更新：

```bash
npm run act:check   # 触发 PR 检查工作流
npm run act:format  # 触发格式编排工作流
npm run act:update  # 触发播放列表更新工作流
```

## 三、安装与快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/iptv-org/iptv.git
cd iptv

# 安装依赖
npm install

# 加载 API 数据（首次安装必需）
npm run api:load
```

### 最简运行示例

**方法一：直接用 VLC 打开**

获取主播放列表，复制以下链接到 VLC「打开网络串流」：

```
https://iptv-org.github.io/iptv/index.m3u
```

**方法二：按国家筛选**

获取特定国家的频道列表（如中国）：

```
https://iptv-org.github.io/iptv/channels/cn.m3u
```

**方法三：通过 API 查询**

```bash
# 获取所有频道
curl "https://api.iptv.org/channels"

# 按国家筛选
curl "https://api.iptv.org/channels?country=cn"
```

## 四、使用方法与实战

### 基础用法

1. 在支持 M3U 的播放器（VLC、PotPlayer、IINA 等）中打开播放列表 URL
2. 选择想看的频道，播放器自动连接流地址
3. 如遇卡顿，可切换同频道的其他镜像源

### 进阶用法：结合 EPG 使用

下载节目指南：

```bash
# 克隆 EPG 工具
git clone https://github.com/iptv-org/epg.git
cd epg
npm install

# 生成指定频道的节目单
npm run start -- --channels=https://iptv-org.github.io/iptv/channels/cn.m3u
```

### 实际项目示例：集成到家庭媒体中心

```javascript
// 使用 @iptv-org/sdk 编程调用
import { Client } from '@iptv-org/sdk'

const client = new Client()
const channels = await client.getChannels({ country: 'CN' })

for (const channel of channels) {
  console.log(`${channel.name}: ${channel.url}`)
}
```

## 五、常见问题与解决方案

**Q: 频道播放不了，提示连接失败？**
A: 公开频道链接可能随时失效，这是正常现象。尝试刷新播放列表获取最新链接，或切换到同频道的其他源。项目 GitHub 页面会定期自动更新失效链接。

**Q: 播放卡顿严重？**
A: 优先选择同地区的 CDN 镜像节点，或尝试降低视频码率。也可以使用 `m3u-linter` 工具（`npm run playlist:lint`）提前检测链接质量。

**Q: 如何贡献新频道？**
A: 在 `iptv-org/database` 仓库提交 issue 或 PR，提供频道名称、国家、语言及官方流地址。项目有严格的贡献指南（CONTRIBUTING.md），需确保来源合法且经版权方授权公开。

**Q: 支持回看/点播吗？**
A: 本项目仅收录实时直播流，不提供回看功能。如需时移播放，需借助 DVR 系统（如 Jellyfin + tvheadend）配合 IPTV 源录制实现。

## 六、总结

`iptv-org/iptv` 是一个维护活跃、覆盖面广的优质开源项目，适合需要获取国际电视信号的技术用户和媒体爱好者。它以极简的 M3U 格式输出数据，兼容所有主流播放器，配套的 EPG 和 API 生态进一步扩展了应用场景。需要注意的是，频道链接的稳定性和版权合规性需要用户自行判断，项目本身仅负责链接聚合，不存储任何视频内容。