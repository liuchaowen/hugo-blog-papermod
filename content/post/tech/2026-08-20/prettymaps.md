---
title: "prettymaps：用一行 Python 把任意地点画成艺术地图"
date: 2026-08-20
description: "prettymaps 是一个基于 OpenStreetMap 的极简 Python 地图绘图库，底层由 osmnx、matplotlib、shapely 与 vsketch 驱动。本文拆解它的技术原理、核心参数、安装方法、实战示例与常见问题，带你用一行代码把任意城市街区画成风格化艺术地图。"
author: "Cheman"
slug: prettymaps
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, Python, 数据可视化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**prettymaps**，一个能用一行 Python 把任意地点从 OpenStreetMap 数据画成高度可定制艺术地图的极简库。它不追求地理精度，而是把真实的街区、河流、绿地变成一幅可以打印、可以上墙的「手绘风」地图。

## 一、项目概述

prettymaps 由 Marcelo Prates 维护，定位是 "A minimal Python library to draw customized maps from OpenStreetMap"。它的核心价值在于：**用真实地理数据，产出有设计感的地图插画**。

- **数据源真实**：所有底图来自 OpenStreetMap，通过 osmnx 抓取街道网络与地物要素。
- **极致简洁**：默认一行代码即可出图，`prettymaps.plot('地点名')`。
- **高度可定制**：图层、配色、边界形状（圆形/方形）、半径、扩张（dilate）全部可参数化。
- **可出生产级文件**：支持导出 PNG / SVG，适合打印、海报、绘本。
- **可视化探索成本低**：自带 Streamlit 前端与 marimo 交互式教程。

仓库内置的 README 也强调：作品基于 AGPL v3.0 许可，允许商业使用、分发与修改，但必须保留源码署名与版权声明。

## 二、技术原理

prettymaps 本质是一条「OSM 数据 → 几何处理 → 美术渲染」的流水线，关键依赖在 `requirements.txt` 中可见：

```
numpy>=1.26.4
matplotlib>=3.9.0
shapely>=2.0.0
osmnx>=2.0.5
rasterio>=1.4.3
rioxarray>=0.18.2
opencv-python-headless>=4.11.0.86
scikit-image>=0.25.2
vsketch>=1.0.0
thefuzz>=0.22.1
elevation>=1.1.3
streamlit>=1.60.0
marimo>=0.23.0
```

四个核心库各司其职：

1. **osmnx**：向 Overpass API 请求指定区域的街道网络、建筑、水域、绿地等地物，返回 GeoDataFrame。
2. **shapely**：对地图边界做几何运算（圆形/方形裁剪、缓冲区扩张 `dilate`），决定「取哪一块地」。
3. **matplotlib**：最终的图层绘制与配色，每个图层可独立设置 `facecolor` / `edgecolor` / `palette`。
4. **vsketch**：提供生成式「手绘草图」风格，让线条带抖动与手绘感，这是它「好看」的关键。

### 数据流与 Plot 对象

`prettymaps.plot()` 返回一个 dataclass，包含三类产物：

```python
plot = prettymaps.plot('Praça Ferreira do Amaral, Macau')
# plot.geodataframes  -> 各图层的 GeoDataFrame 字典
# plot.fig            -> matplotlib Figure
# plot.ax             -> matplotlib Axes
```

典型调用会传入四类参数：`layers`（抓取哪些 OSM 层）、`style`（每层 matplotlib 样式）、`preset`（预设主题）、`circle`/`radius`/`dilate`（边界形状）。一次完整调用示例：

```python
plot = prettymaps.plot(
    'Praça Ferreira do Amaral, Macau',
    circle=True,
    radius=1100,
    layers={
        "water":    {"tags": {"natural": ["water", "bay"]}},
        "building": {"tags": {"building": True}},
    },
    style={
        "water":    {"fc": "#a1e3ff", "ec": "#2F3737"},
        "building": {"palette": ["#FFC857", "#E9724C", "#C5283D"]},
    },
)
```

其中 `layers` 的 `tags` 直接映射到 OSM 的 key/value 过滤条件，意味着你能精确控制「只画河流」「只画住宅建筑」等。

### 预设（preset）机制

仓库内置多套主题预设，可通过 `prettymaps.presets()` 查看，再用 `preset` 参数加载：

```python
presets = prettymaps.presets().to_dict()   # 查看所有预设
prettymaps.plot('你的地点', preset='macao') # 加载澳门主题
```

内置预设包括 `default`、`minimal`、`macao`、`tijuca` 等，本质上是一组预打包的 `layers` + `style` 配置。

## 三、安装与快速开始

### 环境要求

- Python 3.11+（setup.py 标注 `python_requires>=3.12`，README 标注 3.11+，建议用 3.12 以上）。
- 网络可访问 OpenStreetMap / Overpass API。

### 安装

```bash
pip install prettymaps
```

若在 Google Colaboratory 中安装：

```bash
!pip install -e "git+https://github.com/marceloprates/prettymaps#egg=prettymaps"
```

> Colab 中安装后需 **Restart runtime**（Runtime → Restart Runtime）再 import，否则可能导入到旧的命名空间。

### 最简出图

```python
import prettymaps

plot = prettymaps.plot('Stad van de Zon, Heerhugowaard, Netherlands')
```

执行后 matplotlib 会弹出窗口显示地图，你也可以通过 `plot.fig.savefig('map.png', dpi=300)` 导出。

## 四、使用方法与实战

### 基础用法：自定义边界与半径

```python
plot = prettymaps.plot(
    '北京市朝阳区三里屯',
    circle=True,      # 圆形边界
    radius=1500,      # 半径（米）
)
```

`circle=False` 时为方形边界；`dilate` 可让边界向外扩张，容纳更多标注要素。

### 进阶用法：配色与多图层

通过 `style` 为每个图层指定填充色（`fc`）、描边色（`ec`），建筑层可用 `palette` 调色板做随机配色，让街区更有层次：

```python
style = {
    "building": {"palette": ["#433633", "#FF5E5B", "#FFC857"]},
    "water":    {"fc": "#a1e3ff", "ec": "#2F3737"},
    "green":    {"fc": "#cde6c3", "ec": "#2F3737"},
}
```

### 带交互的前端

仓库自带 Streamlit 前端，可本地启动可视化调参界面：

```bash
streamlit run app.py
```

`app.py` 通过 `st.slider`、`st.color_picker`、`st.checkbox` 让用户拖拽半径、选预设、改配色，并支持导出 PNG / SVG（SVG 通过 `plt.savefig(format="svg")` 生成，适合矢量印刷）。

### 交互式教程

完整教程在 `docs/tutorial.md`，另提供 marimo 可运行笔记本：

```bash
pip install marimo
marimo edit notebooks/tutorial.py
```

教程覆盖 Macau、Bom Fim、马赛克、Barcelona plotter、Tijuca、multiplot、hillshade、keypoints 等示例。

## 五、常见问题与解决方案

**Q1：安装时报 Python 版本不满足**
`requirements` / setup 要求 3.11+（或更严格的 3.12+）。请升级 Python 至 3.12 后重建虚拟环境再装。

**Q2：Colab 里 import 报错或样式缺失**
安装后未重启运行时会导致旧命名空间残留，执行 Runtime → Restart Runtime 即可。

**Q3：地图抓取不到数据 / 长时间卡住**
底层依赖 osmnx 访问 Overpass API。检查网络是否可访问 OpenStreetMap；若频繁请求可能被限流，可增大 `radius` 间隔或换个查询地点。地名建议写完整行政区划（如 `"Macau"`、`"Heerhugowaard, Netherlands"`）。

**Q4：导出的 SVG 文字/线条错位**
SVG 用 `bbox_inches="tight"` + `dpi=150` 导出；若前端预览异常，优先用 PNG 验证渲染逻辑，再排查矢量导出参数。

**Q5：配色只有两种 / 想更多颜色**
`building.palette` 的颜色数量由你传入的列表长度决定。在 Streamlit 前端用 `Number of colors` 调整，或直接给 `palette` 传入更长列表。

## 六、总结

prettymaps 把「真实地理数据」与「生成式美术渲染」结合起来，一行代码即可产出可打印、可上墙的风格化地图。它的工程亮点在于用 osmnx 取数、shapely 裁边界、matplotlib 上色、vsketch 加手绘感，四者解耦清晰、参数化彻底。无论是做城市插画、绘本、海报，还是作为数据可视化练手项目，都值得一试。

> 仓库地址：https://github.com/marceloprates/prettymaps ｜ 许可：AGPL v3.0（商用需保留署名）
