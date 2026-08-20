---
title: "把 Google 地图时间线变成动态旅行视频：google-timeline-visualizer 技术解析"
date: 2026-08-21
description: "google-timeline-visualizer 能把 Google 地图时间线导出的 JSON 变成动态旅行视频。本文从源码解析其 Web Mercator 投影、大圆插值、长途压缩与相机平滑等核心实现。"
author: "Cheman"
slug: google-timeline-visualizer
draft: false
categories: ["技术", "开源项目"]
tags: ["GitHub Trending", "Python", "数据可视化", "Google Maps", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**google-timeline-visualizer**，它能把你导出的 Google 地图时间线（`Timeline.json`）变成一段会"动起来"的旅行视频——移动的光点、逐渐绘出的路线、随旅程缩放的地图，全部在你的手机或电脑本地完成。

## 一、项目概述

google-timeline-visualizer 是一个把谷歌地图「地点记录 / 时间线（Timeline）」导出文件转化为动态旅行视频的开源工具。作者 mahlernim 提供了三种使用形态：

- **Android 原生应用**：从 Releases 下载 APK 侧载安装；
- **iPhone 网页应用**：Safari 打开即可，无需安装、不上传文件；
- **桌面端 Python 生成器**：本文重点讲解其实现原理。

它解决的问题很具体：Google Takeout / 地图导出的时间线是一个冷冰冰的 JSON，而人是「讲故事」的动物。这个项目用动画重新「播放」你的轨迹，既能做旅行回忆，也能直观看到自己一年里到底去了哪里。

核心特性：

- 支持 Android / iOS 直出数组、旧版 `semanticSegments`、原始坐标兜底等多种导出格式；
- 支持字符串、`latLng`、度数、`geo:`、E7 多种坐标表示，甚至能正确处理跨越国际日期变更线；
- 三种相机运动（`fixed` / `steady` / `dynamic`）+ 四档长途压缩（`off` / `gentle` / `balanced` / `strong`）；
- 长航线沿大圆路径插值，避免「瞬移穿地」；
- 隐私友好：不登录 Google、不上传时间线，视频渲染全程在本地设备完成；
- 多语言界面（含简体 / 繁体中文）。

## 二、技术原理

### 2.1 Web Mercator 投影与地图瓦片

为了在 matplotlib 上贴真实地图，作者先把经纬度投影到 Web Mercator 米制坐标：

```python
def latlon_to_meters(lat, lon):
    x = R_EARTH * math.radians(lon)
    y = R_EARTH * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return x, y
```

地图底图来自 CARTO 的 OpenStreetMap 瓦片（`https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`），`get_map_image` 根据当前视野的跨度自动计算合适的 zoom 级别，拼接多张 256×256 瓦片，并用 `TILE_CACHE` 做本地缓存。一个值得注意的细节是：当视野过大导致瓦片数超过 25 张时，算法会自动降一级 zoom，避免一次性请求过多瓦片拖慢渲染。

### 2.2 距离累加与「长途压缩」时间映射

每段轨迹用 Haversine 公式算出真实里程，累加成 `cum_dist`，总里程用于决定整体动画节奏。

最关键的设计在 `build_journey_timing`：它**不改变任何路线几何**，只改变「时间 → 距离」的映射关系。通过对每段距离取指数（balanced = 0.85）再做单调三次样条插值，让长途旅行被压缩、短途通勤更舒展，最终视频的节奏更「好看」：

```python
exponent = COMPRESSION_EXPONENTS[compression]  # off=1.0, balanced=0.85 ...
effective_total += segment ** exponent
```

`distance_at(progress)` 使用单调 Hermite 样条（`_monotone_slopes`）保证速度非负、不回弹，从而画面不会「倒着走」。

### 2.3 大圆插值：让长途「平滑飞行」

短距离用直线插值即可，但跨洋航线若做线性插值会「穿地」。作者用球面线性插值（slerp）沿大圆计算中间点：

```python
def interpolate_latlon(lat1, lon1, lat2, lon2, fraction):
    # 转成单位向量 → 求夹角 omega → 球面插值
    dot = max(-1.0, min(1.0, ax*bx + ay*by + az*bz))
    omega = math.acos(dot)
    # ...
```

这让相机顺着航线平滑前进，而不是瞬间跳到目的地，观感上更贴近真实飞行。

### 2.4 相机运动：context 跨度与死区

相机行为由 `CAMERA_MOVEMENTS` 字典定义。其核心是「context 跨度」——相机要展示当前点前后多大范围：

- `fixed`：固定一个缩放级别（`fixed_zoom=True`），不随旅程变化；
- `steady`：context 设为整个旅程的 100%（默认上下限 650km），平稳顺滑；
- `dynamic`：context 仅 10%，并积极跟随本地移动（`leg_aware=True`）。

`build_camera_track` 采样 480 个点，对每个采样用 `raw_camera_sample` 算出中心点 `(center_x, center_y)` 与跨度 `span`，再用指数平滑（zoom_out / zoom_in alpha）避免缩放抖动；同时引入「死区」（dead_zone）：标记点只要在中心 ±20% 跨度内，相机就不移动，有效减少了通勤时的来回抖动。

### 2.5 「分段（legs）」识别长途转移

`get_map_image` 始终只渲染当前 context 范围内的瓦片，以控制开销。为了让跨城 / 跨国长途时聚焦当前这一段，`build_legs` 会基于每跳距离的中位数自动识别「转移段」（transfer）：动态相机模式下只对转移段放大 context，本地段则保持紧凑，兼顾性能与观感。

### 2.6 坐标解析与 GPS 离群过滤

`parse_coordinate` 兼容大量坐标格式：字典里的 `latLng` / `point`、带 `geo:` 前缀、`°` 符号，甚至 E7 整数（绝对值 > 1e6 时除以 1e7）。App 端还提供 Conservative GPS 离群过滤：默认只忽略孤立的「出去又回来」的不合理坐标，并**保持原始 JSON 不变**，需要时也可关闭过滤使用文件里的每一个点。

## 三、安装与快速开始

桌面版本需要 Python 3.9+ 与 FFmpeg：

```bash
python -m pip install -r requirements.txt
# 依赖：numpy, matplotlib, pillow, python-dateutil
python visualizer.py --input Timeline.json --year 2025 --camera-movement steady \
  --long-trip-compression balanced --output my_trip_2025.mp4
```

导出时间线：Android 在「设置 → 位置 → 位置服务 → Timeline → 导出」；iOS 在 Google 地图「设置 → 个人内容 → 导出 Timeline 数据」，把 `Timeline.json` 存到文件即可。

## 四、使用方法与实战

- `--camera-movement`：`fixed`（单缩放）/ `steady`（平稳，默认）/ `dynamic`（积极跟随）；
- `--long-trip-compression`：`off` / `gentle` / `balanced` / `strong` 控制动画快慢；
- `--year` 指定年份，`--title` 设置片头标题，`--output` 指定输出路径。

实战建议：当一年总里程很大时，先用 `dynamic` + `balanced` 看整体节奏；若只想回放某次几天的小旅行，最好把时间线拆成小文件，或用 App 的「Exact dates」精确选期，避免整年渲染耗时过长。

## 五、常见问题与解决方案

**Q1：运行提示 Missing dependency numpy**

这是没装依赖，执行 `pip install -r requirements.txt` 即可。脚本在 import 失败时会给出明确提示，而不是甩出一堆堆栈。

**Q2：视频生成很慢 / 文件很大**

超过 60 秒的时长 App 会主动提醒渲染时间与存储占用；桌面端可在 `visualizer.py` 中调整 `DEFAULT_FPS`（默认 30）、`DEFAULT_DURATION`（默认 90 秒）或降低 `dpi` 来平衡质量与速度。

**Q3：跨洋航线在地图上「穿墙」**

作者已用大圆插值解决，但若你的导出点位过稀，轨迹可能仍不够圆滑。可确认导出的是完整的 `timelinePath` 而非只有语义段，必要时提高采样密度。

**Q4：点位漂到海里 / 坐标系显示异常**

多为坐标格式解析问题。`parse_coordinate` 已覆盖大多数格式，仍异常时可开启 App 的 raw location 兜底（带本地降噪），或检查是否误把 E7 整数当成了度数。

**Q5：隐私顾虑**

项目不登录、不上传你的时间线，渲染完全在本地；唯一联网项是向 CARTO 请求「所显示区域」的地图瓦片（基于 OpenStreetMap 数据），Timeline JSON 本身不会被上传。

## 六、总结

google-timeline-visualizer 用不算复杂却相当讲究的数学——Web Mercator 投影、Haversine 累加、大圆插值、单调样条时间映射、指数平滑相机——把一个枯燥的 JSON 变成了有叙事感的旅行视频。它最值得称道的是「隐私优先 + 本地渲染」的取舍，以及把复杂坐标格式、长途与通勤的节奏差异都照顾到的工程细节。如果你手头有一份 Google 时间线导出，不妨用它的桌面版跑一段，看看自己这一年走过的路。
