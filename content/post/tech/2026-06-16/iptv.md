---
title: "Free-TV/IPTV：一个收录全球免费电视频道的 M3U8 播放列表"
date: 2026-06-16
description: "Free-TV/IPTV 是一个开源 M3U 播放列表项目，收录全球 70+ 国家和地区的免费电视频道，支持 DVB-T/ATV 地面广播和互联网直播，是目前覆盖最广、质量最高的免费 IPTV 聚合项目之一。"
author: "Cheman"
slug: iptv
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "IPTV", "M3U8", "直播"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Free-TV/IPTV**，一个收录全球免费电视频道的 M3U8 播放列表项目，支持 70+ 国家和地区，堪称免费电视频道的百科全书。

## 一、项目概述

Free-TV/IPTV 是一个开源社区驱动的免费电视频道播放列表项目，通过 M3U8 格式聚合了全球各地的公共免费电视信号。

### 核心特性

- **覆盖广**：支持 70+ 国家和地区，几乎囊括全球所有主流地区
- **质量优先**：只收录能正常播放的频道，优先 HD 画质，每个频道只保留一个最优信号源
- **完全免费**：只收录免费频道，不收录任何付费频道，公共税收资助的频道例外
- **主流频道**：不含成人内容、宗教频道、单一政党频道，排除一切商业付费内容
- **持续维护**：社区通过 PR 共同维护频道列表，失效频道会被移入 Invalid 分类

### 收录国家（部分）

支持包括中国（含香港、澳门、台湾）、美国、加拿大、英国、爱尔兰、澳大利亚、日本、印度、德国、法国、意大利、西班牙、俄罗斯、巴西、墨西哥等 70+ 国家/地区。

## 二、技术原理

### M3U8 格式

项目核心使用 M3U8（HTTP Live Streaming playlist）格式存储播放列表。每个频道的信息通过 `#EXTINF` 行描述，包含频道名称、Logo、频道号、国家代码等信息。

核心代码在 `make_playlist.py` 中，关键数据结构为 `Channel` 类：

```python
class Channel:
    def __init__(self, group, md_line, country_code=""):
        self.group = group
        self.country_code = country_code
        parts = md_line.split("|")
        self.number = parts[1].strip()
        self.name = parts[2].strip()
        self.url = parts[3].strip()
        self.logo = parts[4].strip()

    def to_m3u_line(self):
        country = f' tvg-country="{self.country_code}"' if self.country_code else ""
        chno = f' tvg-chno="{self.chno}"' if self.chno else ""
        return (f'#EXTINF:-1 tvg-name="{self.name}" tvg-logo="{self.logo}"{chno}{country} group-title="{self.group}",{self.name}\n{self.url}')
```

### 频道分类管理

所有频道按国家/地区分文件存储在 `lists/` 目录下，每个 `.md` 文件对应一个国家/地区，`make_playlist.py` 脚本遍历所有 `.md` 文件自动生成聚合播放列表 `playlist.m3u8`。

### 信号源优先级

项目信号源优先级为：
1. DVB-S / DVB-T 地面广播（最稳定）
2. YouTube 官方直播（需满足频道在播、URL 固定且有稳定观众）
3. DailyMotion

## 三、安装与快速开始

### 环境要求

- 支持 M3U8 格式的播放器（见下方推荐）

### 推荐播放器

- **IPTV Player**（支持桌面和移动端）
- **Kodi**（支持多平台）
- **VLC**（免费开源，Windows/Mac/Linux 全平台支持）
- **PotPlayer**（Windows 用户首选）

### 使用方法

**直接使用（最简方式）：**

在任意支持 IPTV 的播放器中添加以下 URL 即可：

```
https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8
```

**按国家单独使用：**

访问项目的 [lists 目录](https://github.com/Free-TV/IPTV/tree/master/lists)，找到对应国家的 `.m3u8` 文件链接添加即可。

## 四、使用方法与实战

### 基础用法

以 VLC 为例：
1. 打开 VLC → 菜单栏 `媒体` → `打开网络串流`
2. 在网络URL中粘贴上面的播放列表地址
3. 点击播放即可观看

###进阶用法

**按国家过滤：** 打开 `lists/` 目录下对应国家的 `.md` 文件，找到标记为 `[>]` 的频道，这些是当前可用的频道。将对应的 `.m3u8` 文件 URL 复制到播放器中即可。

**使用 EPG 电子节目单：** 项目在 `epglist.txt` 中维护了 EPG 源地址列表，支持节目预告和自动节目信息显示。

### 频道状态标记

- `Ⓢ` 标记：标清频道（非 HD）
- `Ⓖ` 标记：GeoIP 地理封锁频道
- `Ⓨ` 标记：YouTube 直播源

## 五、常见问题与解决方案

**Q：频道无法播放怎么办？**
> 大多数情况下是信号源失效。项目维护者建议直接提交 PR 将失效频道移入 Invalid 分类，而非开 Issue 询问。社区会定期清理失效链接。

**Q：有些频道有地理限制？**
> 部分频道使用 GeoIP 封锁，会在列表中标记为 `Ⓖ`。可使用 VPN 配合播放。

**Q：如何添加新频道？**
> 提交 Pull Request，只修改对应国家的 `.md` 文件，需提供频道为免费的证明材料，Logo 建议使用 imgur.com 托管。

**Q：播放列表更新频率如何？**
> 项目由社区维护，有用户提交 PR 时会自动更新。建议定期拉取最新版本，或使用自动更新功能。

## 六、总结

Free-TV/IPTV 是目前最完善的免费 IPTV 聚合项目之一，以"质量优于数量"为核心理念，维护了一个活跃的社区驱动的播放列表。对于需要收听海外电视频道、搭建家庭媒体中心或研究全球广播电视覆盖情况的用户，这个项目极具参考价值。

> 项目地址：[https://github.com/Free-TV/IPTV](https://github.com/Free-TV/IPTV)
