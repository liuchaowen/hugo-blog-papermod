---
title: "God's Eye View：用公开数据在浏览器里造一个实时的「上帝视角」地球"
date: "2026-08-25"
description: "God's Eye View 是一个完全运行在浏览器里的实时地理空间情报控制台：基于 CesiumJS 与 Google 真实感 3D 地球，叠加全球航班、船舶、卫星、地震、交通与公共摄像头等 13 个公开数据源，还支持用 OpenAI Realtime API 语音指挥。本文拆解它的架构、技术栈与本地运行方式。"
author: "Cheman"
slug: gods-eye-view
draft: false
categories: ["技术", "开源", "可视化", "GIS"]
tags: ["CesiumJS", "3D 地球", "实时数据", "开源情报", "可视化", "Vite", "WebGL"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**God's Eye View**，一个完全跑在浏览器里的「间谍卫星模拟器」——直到你意识到它的数据源全是公开的、数据是真实的。它把全球航班、船舶、卫星、地震、交通和公共摄像头等公开信号，渲染在一颗照片级真实的 3D 地球上，还能用语音实时指挥。

## 一、项目概述

God's Eye View（前身为 WorldView）由 Bilawal Sidhu 开源，起源于他在 YouTube 上爆火的「God's Eye View / 上帝视角」系列视频（累计 500 万+播放）。它的核心洞见是：**世界的信号其实一直在广播**——飞机的 ADS-B 应答机、船舶的 AIS 信标、卫星的轨道根数、地震台网、公共摄像头——但这些信息散落在一堆浏览器标签页里，真正的瓶颈是「界面」。

这个项目要做的，就是把这些公开信号变成「一个地方」：在一颗实时、照片级真实的 3D 地球上，让你看得见整个星球的脉动。

### 核心特性速览

- **🛩️ 驾驶舱视角**：坐进任意一架被追踪的航班里，镜头一路贴着真实地形俯冲到跑道。
- **📡 实时联系人**：以目标为中心 250 km 半径内的所有飞行器/船舶名单，一键切换任意驾驶舱。
- **🎯 点击即追踪**：镜头锁定、拖尾、完整元数据，被追踪的火点或船只可一键跳转到最近的公共摄像头。
- **🖊️ 语音白板**：用说话的方式在世界地图上画边界多边形、标记和航线。
- **🛫 3D 机库**：787、ATR-72、Citation、Bell 206、MQ-9 等真实机型模型，靠近时从图标切换为 3D 模型。
- **🎨 传感器滤镜**：CRT、夜视(NVG)、FLIR/热成像、黑白、雪景等 GLSL 视觉效果。
- **🎙️ 语音指挥**：基于 OpenAI Realtime API 的实时 AI agent，28 个工具覆盖「导演镜头 / 标注世界 / 分析师提问 / 免提操作」。

> 一半的魔力在于它看起来像一个被封锁的作战驾驶舱，另一半在于每一行代码都可被审查。

### 13 个实时图层，10 个零密钥即可用

整个地球其实大部分是「绿色」的——无需注册、开箱即用：

| 图层 | 数据源 | 授权 |
|------|--------|------|
| 🗺️ 地图底图 | Google 真实感 3D / Bing / OSM | 🔴 Google(必需) · 🟡 ion · 🟢 OSM |
| ✈️ 实时航班 | OpenSky + adsb.lol | 🟢（🟡 可选更多额度） |
| 🎖️ 军事航班 | adsb.lol | 🟢 |
| 🚢 实时船舶 | AISStream | 🟡 |
| 🛰️ 卫星 | CelesTrak（约 840 个核心星表） | 🟢 |
| 🌍 地震 | USGS（近 24h） | 🟢 |
| 🚗 交通 | TomTom + OSM（无密钥时为近似模拟） | 🟢（🟡 TomTom 变真实） |
| 📹 公共摄像头网格 | 城市 API（奥斯汀/加州/伦敦） | 🟢 |
| 📻 电台 | Radio Browser | 🟢 |
| 🚲 共享单车 | GBFS | 🟢 |
| 🔥 活跃火点 | NASA FIRMS | 🟡 |
| 🚀 航天任务 | Launch Library 2 | 🟢 |
| 🎖️ 军事设施 | OpenStreetMap | 🟢 |

另外还内置了 4351 个数据中心、704 座水坝、712 条海底光缆等静态基础设施数据集。

## 二、技术原理

God's Eye View 的底层工程非常讲究——它不像多数 Demo 那样「看起来能跑」，而是追求「感觉真实」。核心技术栈是**纯原生 JavaScript + CesiumJS + Vite**，配合 Google Photorealistic 3D Tiles 作为地球、OpenAI Realtime API 作为语音。

源码结构（来自 `docs/CURRENT-STATE.md`）非常清晰：

```
src/
├── main.js                 # 启动：Google 3D Tiles、图层注册
├── ui.js                   # 运行时 UI——面板、HUD、样式、控制门面
├── hud.js                  # 情报 HUD + AI 场景摘要
├── mapStackController.js   # Google 3D / Bing / OSM 切换
├── iconOrientation.js      # 屏幕投影的世界空间朝向 + 地平线剔除
├── voice/                  # OpenAI Realtime 会话 + 28 个语音工具
├── data/                   # 每个图层一个模块 + 管理 + 上下文存储
│   └── local_data/         # 内置数据集（按文件夹记录来源）
└── scenes/                 # 电影级场景导演
```

### 关键工程点

- **世界稳定的图标朝向**：飞机和船舶在任意相机角度下都沿其**真实世界航向**指向，靠的是逐帧的屏幕空间航向投影（`iconOrientation.js`）。无论正俯视还是看地平线，都不会乱转、不会锁视口。
- **用「跳变数据」做出顺滑运动**：公开实时数据通常每 15–30 秒才到一批，地球渲染时故意**比实时慢一个轮询间隔**，并在已知定位点之间做插值，用航位推算填补空隙。
- **诚实的卫星**：采用 SGP4 轨道传播，轨道环通过 GMST 重新对齐锁定卫星，避免漂移和逐秒闪烁。
- **站在真实地面上**：实体高度经过真实的垂直基准面（大地水准面感知，对渲染出的地形网格采样），让飞机停在新停机坪、摄像头立在街角，而不是悬空。
- **像花自己的钱一样省配额**：付费 feed 都跑在带缓存、受预算治理的代理之后——OpenSky 信用限速器、TomTom 每日瓦片预算、磁盘缓存的 TLE——让一个下午的把玩不至于烧光 API 额度。
- **本地优先的密钥处理**：OpenAI、AISStream、OpenSky OAuth、TomTom、FIRMS 等带密钥的提供商都在**服务端代理**；代理目标固定或加白名单，高风险路径额外加了有界请求、超时、响应上限和错误净化。唯一故意暴露给浏览器的只有 Google Maps 和 Cesium ion 的凭据。

整个 `package.json` 的依赖也印证了这点——只有 `cesium`、`satellite.js`（轨道计算）、`egm96-universal`（大地水准面）、`mgrs`、`pbf`、`@mapbox/vector-tile` 等少量专精库，没有重型框架：

```json
"dependencies": {
  "@mapbox/vector-tile": "^3.0.0",
  "cesium": "^1.124.0",
  "egm96-universal": "^1.1.1",
  "mgrs": "^2.1.0",
  "pbf": "^5.1.2",
  "satellite.js": "^6.0.2"
}
```

引擎约束也写得很死——强制 Node.js 24.14.x 或 26.x：

```json
"engines": {
  "node": ">=24.14.0 <25 || >=26 <27"
}
```

### 诚实的交互哲学

项目刻意区分「实时」与「建模」：公开密钥的交通层标为模拟、摄像头位姿在标定前是估计值、火箭上升回放标为 `RECONSTRUCTED ESTIMATE`（重建估算）。每个图层都持续显示自己的数据源与新鲜度状态（部分、延迟、模拟、不可用）。README 开头就用警示框明确：**这是公开与第三方数据的探索性可视化，不得用于导航、应急、医疗或投资决策**。

## 三、安装与快速开始

### 环境要求

- **Node.js 24.14.x 或 26.x**（`package.json` 的 engines 字段会强制校验）
- 一个 **Google Maps API Key**（唯一必需的付费项，买的是照片级地球）

### 最简运行步骤

1. 复制 `.env.example` 为 `.env`，填入 `GOOGLE_MAPS_API_KEY`：

```bash
cp .env.example .env
# 编辑 .env，设置 GOOGLE_MAPS_API_KEY=你的密钥
```

2. 安装依赖并启动开发服务器：

```bash
npm install
npm run dev -- --host localhost --port 4173
```

3. 打开 **`http://localhost:4173`**。冷启动在近期笔记本上可在 2 秒内稳定（官方点测中位数 1.86 s）。首次运行会弹出一张引导卡，帮你一键布置「实时联系人 / 航天任务 / 环境」任一任务，也可以手动探索。

> 开发服务器默认绑定 **localhost**，密钥只留在你的机器上。

**macOS 快捷方式**：`./scripts/dev-fresh.sh` 会清掉 Vite 缓存，并直接从 Keychain 拉取密钥：

```bash
security add-generic-password -U -s "google-maps-api" -a "api-key" -w
security add-generic-password -U -s "openai-api"      -a "api-key" -w
# ...其余密钥同理
```

## 四、使用方法与实战

### 前 5 分钟的「顿悟时刻」

无需账号、无需注册。引导卡会帮你布置任务，也可以自己跑这套流程——往往在 5 分钟内的某个瞬间，它不再像一个 Demo：

1. **点亮天空**：开启「实时航班」，成千上万架真实遥测的飞机开始滑翔，检测网格已经在读场景；点中一架，镜头锁定、拖出尾迹、弹出遥测卡片。
2. **接管操控**：在追踪的飞机上点 **COCKPIT**，跟着它俯冲，飞行中切换传感器：NVG 切到 Ironbow FLIR 热成像。
3. **扎进繁忙机场**：搜索一个机场，开启 **3D** 飞机，看停机坪、滑行道、整片机坪实时运转。
4. **透过公共摄像头看世界**：开启奥斯汀/伦敦/加州的 **CCTV**，画面不是网页嵌入，而是**投影进 3D 城市**；切到 **VIEWSHED** 视角，每路摄像头会画出它估算的覆盖体积——能看到哪、看不到哪。
5. **追踪轨道上的东西**：开启 **Satellites**，点 ISS 国际空间站，镜头贴着轨道环陪它飞越乌克兰。
6. **切换光学**：按 `1`–`7`，整个实时地球通过 CRT / NVG / FLIR 等不同传感器重新渲染。
7. **跟它说话**（需 OpenAI Key）：*「带我去 LAX，选中最近的空中飞机。」*
8. **回家**：点 **Reset Globe**，或直接说 *「缩回地球视角」*。

### 键盘速查

`1`–`7` 视觉风格 · `H` HUD · `D` 检测框 · `C` 驾驶舱 · `Esc` 退出。

### 语音指挥的四种玩法（需 OpenAI Key）

语音不是简单的「语音遥控器」，agent 在回答前会先拉取实时场景上下文（坐标、街道名、激活图层、视图比例），并且被要求**绝不臆造标签**：

- **🎥 导演镜头**：*「带我去东京」「绕着这片区域慢慢转」「画出从国会到 Zilker 公园的步行路线，然后飞一遍。」*
- **🖊️ 标注世界**：*「描出德克萨斯州的边界」*——它画的是**真实包围边界**而非圆圈；*「埃菲尔铁塔离卢浮宫多远？」*——出现一根连接箭头并播报距离。
- **🔎 分析师提问**：*「德州上空现在有多少架航班？」「哪些船正驶向奥克兰？」「洛杉矶附近最大的火点是什么？」「ISS 下次什么时候过境？」*
- **🎛️ 免提操作**：*「切到夜视并打开航班图层」「开启摄像头视域」「播放奥斯汀附近的新闻电台」*。

### 推荐「外勤任务」

上手后不妨试试：夜班（飞到自己城市切 NVG）、港口停靠（Long Beach 的船只 → 点 NEAREST 在 CCTV 面板看同片水域）、火箭回放（Space Missions 选近 30 天发射，0.25×–4× 拖拽复盘）、「墓地巡游」（飞进退役飞机的密集机库阵列）。

## 五、常见问题与解决方案

**Q1：为什么 Google Maps Key 是必需的？**
整个「照片级地球」都来自 Google Photorealistic 3D Tiles，所以它是唯一🔴（计量付费）的必需项；其余 10 个图层靠这个底图就能点亮，大部分是🟢/🟡。务必在 Google Cloud 里**限制 Key、设配额、配预算告警**。

**Q2：Node 版本报错 / 安装失败？**
`package.json` 的 engines 字段强制要求 Node **24.14.x 或 26.x**，低于或介于 25 之间的版本会被直接拒绝。用 `nvm` 切到合规版本即可。

**Q3：语音功能点不开 / 提示不可用？**
语音需要 **OpenAI Key**，没有它整个 App 仍能跑，只是麦克风按钮会报告「语音不可用」。同一把 Key 还驱动 **AI HUD 摘要**（随移动刷新的五词情报式读数）。Key 只经服务端短期会话令牌，从不到达浏览器。

**Q4：某些图层没数据 / 显示模拟？**
陆基 AIS 在远洋会静默、卫星 AIS 要真金白银；交通层在无 TomTom Key 时是近似模拟，摄像头位姿在标定前是估计值。这是架构允许的「诚实状态」，并非 bug。需要更真实数据就补对应🟡免费 Key（AISStream、FIRMS、TomTom、Cesium ion 均提供免费额度）。

**Q5：想局域网分享给朋友？**
默认只绑定 localhost，别人连不上。显式开启 `npm run dev -- --host 0.0.0.0 --port 4173` 即可，但⚠️ **LAN 可见的服务器会把你的 API Key 代理给任何能连上的人**。务必先设各 IP 限流（`GEV_RATELIMIT_OPENAI_PER_MIN`、`GEV_RATELIMIT_GOOGLE_PER_MIN`）和提供商的预算上限——限流是应用层护栏，不是计费上限。

**Q6：成本到底多少？**
大部分图层 $0 无注册；Google 3D Tiles 按会话计费（各区域免费额度不同）；OpenAI 语音按用量计费，App 内显示实时估算、到 $2 警告、并设 **$5 单会话上限**。具体以各提供商定价页为准。

## 六、总结

God's Eye View 最迷人的地方，是它用「被封锁作战室」的视觉语法，却**完全由公开信号和可审查代码**搭建而成。它不妨碍你做 OSINT/GEOINT 的探索与学习，又明确划了线：只建模事件、资产、基础设施与系统，**不为个人检索、人脸识别或追踪个人**建模——越线的 PR 不会被合并。

它没有重型框架，纯原生 JS + CesiumJS + Vite，读起来快、改起来也快。13 个图层只是「一个人能找到并融合的信号」的样板，你可以加城市包、数据源、传感器风格或语音工具。把它当作理解世界的一扇窗，再把这扇窗分享给别人——**No place left behind.**

> 项目以 **MIT License** 开源，托管数据集各有自己的条款。地址：<https://github.com/bilawalsidhu/gods-eye-view>
