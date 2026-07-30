---
title: "Gen1Recomp：用 LÖVE2D 原生重写宝可梦红/蓝/黄，无需模拟器"
date: 2026-07-30
description: "Gen1Recomp 是一个完全手写的 LÖVE2D 游戏引擎，逐帧还原 Game Boy 宝可梦红、蓝、黄的运行逻辑，ROM 数据仅用于初始化，引擎本身完全独立运行。"
author: "Cheman"
slug: gen1recomp
draft: false
categories: ["技术", "开源", "游戏开发"]
tags: ["LÖVE2D", "Lua", "Game Boy", "宝可梦", "开源游戏", "逆向工程"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Gen1Recomp**，一个用 LÖVE2D 原生重构宝可梦红、蓝、黄的开源项目——无需任何模拟器，游戏逻辑和地图行为完全手写，引擎和源码均为原创。

## 一、项目概述

Gen1Recomp 来自独立开发者 [bryanthaboi](https://github.com/bryanthaboi/gen1recomp)，曾被 Polygon 和 Kotaku 专题报道。它的核心思路非常巧妙：**不复制 ROM，只借用 ROM 作为数据源**。具体来说：

- **引擎自研**：游戏引擎（渲染循环、地图加载、战斗系统等）全部手写 Lua，无任何外部模拟器依赖
- **ROM 仅作数据导入**：首次启动时，用户提供合法获取的 `.gb` 文件，程序验证 SHA-1 哈希（确保是原始美版红或蓝），随后将图形精灵、地图数据等提取为私有缓存，之后再也不需要 ROM
- **音乐实时合成**：背景音乐、BGM、战斗音效均从 ROM 中的音频通道程序实时合成，非预置音频文件

支持平台包括 macOS、Windows、Linux，以及 Anbernic RG34XXSP 等掌机。

## 二、技术原理

### 核心架构

项目基于 LÖVE 11.x 运行，核心逻辑分布在多个 Lua 模块中。ROM 导入后生成的数据缓存在 `data/generated/` 下，引擎读取这些结构化数据来重建游戏内容。

```lua
-- 验证 ROM SHA-1（仅美版红蓝被接受）
-- Red:  ea9bcae617fdf159b045185467ae58b2e4a48b9a
-- Blue: d7037c83e1ae5b39bde3c30787637ba1d4c48ce2
-- 验证通过后释放 ROM 引用，内存中不再保留
```

### 战斗规则集（Rulesets）

项目内置两套战斗行为规则，可通过 `OPTIONS → RULESET` 切换：

| 规则 | `gen1_faithful`（默认） | `modern_clean` |
|------|------------------------|----------------|
| 256分之1 Miss Bug | 保留 | 关闭 |
| 必中技 | 仍有概率 Miss | 必定命中 |
| 击中要害倍率 | 基础速度计算 | 同左（不变） |
| 击中要害无视能力等级 | 开启 | 关闭（计入等级） |
| FOCUS ENERGY Bug | 存在（降为×0.25） | 修复（×4） |
| 敌方 PP 无限 | 开启 | 关闭 |
| 超级冲击 KO 后跳过回能 | 开启 | 关闭（Gen 2+ 行为） |

这种设计让玩家既可以体验"原汁原味"的初代 Bug，也可以选择"干净"的后续世代逻辑。

### 音频合成

音效和音乐并非预置 wav/mp3 文件，而是由引擎读取 ROM 中的音频通道程序（audio channel programs），在运行时实时合成到 LÖVE 的音频输出。这意味着音效的音色、特性和原版完全一致，文件体积却极小。

### MOD 平台

项目自带原生 MOD 框架，支持：

- 内容注册表与事件钩子
- 每个 MOD 独立的存档和配置
- 内置 MOD 管理器（`F10` 唤出）
- 支持自定义地图（使用定制版 Tiled 编辑器 [tiled_gen1recomp](https://github.com/bryanthaboi/tiled_gen1recomp/releases) 编辑后导出为 MOD）
- 联机对战（START > LINK，UDP 直连两台设备）

## 三、安装与快速开始

### 环境要求

- LÖVE 11.x（桌面版）
- 一份合法获取的美国版宝可梦红或蓝 `.gb` ROM

### 安装步骤

**方式一：直接下载 Release**

下载对应平台的打包版，macOS 为 `.app`，Windows 为 `.exe`，Linux 为 AppImage 或压缩包。

**方式二：从源码运行**

```sh
# 安装 LÖVE 11.x（macOS 可用 brew install love）
# 克隆仓库
git clone https://github.com/bryanthaboi/gen1recomp.git
cd gen1recomp

# 首次运行，拖入或选择 ROM 文件（仅首次需要）
./Play-Mac.command   # macOS
./Play-Windows.bat   # Windows
```

ROM 只需导入一次，之后启动 `love .` 即可直接进入游戏。

### 便携模式

在可执行文件旁新建一个空文件 `portable.txt`，所有存档、配置和缓存数据将保存在同目录下，适合 USB 携带。

## 四、使用方法与实战

### 基础操作

| 操作 | 键盘 | 手柄 |
|------|------|------|
| 移动 | 方向键 / WASD | D-pad |
| A 键 | Z / Enter / Space | A |
| B 键 | X / Backspace | B |
| 开始 | Escape | Start |
| 选择 | Tab / Shift | Select/Back |

### 热键

| 按键 | 功能 |
|------|------|
| `-` / `=` | 缩放画面 |
| `2` | 切换配色方案（COLORS） |
| `3` | 切换视角（TILT） |
| `4` | 逐级缩放至任意大小（ZOOM） |
| `5` | 切换 GBC 特效模式 |
| `F1` / `F2` | 快速存档 / 读档 |
| `F10` | 打开 MOD 管理器 |

### 实战：体验初代 Bug（gen1_faithful）

用默认规则集进入游戏，会发现初代中玩家熟悉的 Bug 均被完整保留：比如某些 100% 命中率的技能实际上会以 256 分之 1 的概率 Miss，训练师会用 PP 无限的技能永远不陷入 Struggling——这是有意的设计，供研究者和怀旧玩家体验。

### MOD 推荐

项目自带数个示例 MOD，分别展示不同类型的 MOD 写法。社区 MOD 可在 Discord 服务器获取。

## 五、常见问题

**Q: 提示"ROM 不被接受"？**
仅接受美版红蓝的 SHA-1：`ea9bcae...`（红）或 `d7037c8...`（蓝），日版、欧版或其他改版 ROM 均不支持。

**Q: 首次导入后每次还要放 ROM 吗？**
不需要。首次导入成功后数据会写入私有缓存目录，后续启动直接加载缓存，不再读取 ROM 文件。

**Q: macOS 无法运行 `.command` 文件？**
在终端执行 `chmod +x Play-Mac.command`，或直接用 `love .` 从项目目录启动。

**Q: 支持中文吗？**
目前游戏内文本为英文，但项目接受社区汉化 MOD。

## 六、总结

Gen1Recomp 是一个极具技术含量的开源项目——用纯手写的 Lua 引擎完美复现了一款 1996 年的 Game Boy 游戏。它不是 ROM 补丁，不是模拟器包装，而是从零到一的引擎级重建，同时还加入了 MOD 平台、联机对战、便携模式等现代化特性。对于热爱游戏开发、ROM Hack 文化或宝可梦初代的研究者来说，这个项目既是玩具，也是极好的学习素材。
