---
title: "Vorssaint：一个菜单栏图标，替掉十几款付费 Mac 工具"
date: 2026-08-10
description: "Vorssaint 是一款用 Swift 编写的开源 macOS 菜单栏工具集，把逐应用音量、系统监控、窗口管理、剪贴板历史、截图录屏、清理卸载等十余款付费软件的能力，装进一个可按需安装/卸载的模块化应用中，本地优先、零账号、零遥测。"
author: "Cheman"
slug: vorssaint-utils
draft: false
categories: [技术, 开源, macOS]
tags: [Swift, macOS, 开源工具, 菜单栏应用, 系统监控, 效率工具, GitHub Trending]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Vorssaint**，它把 Mac 用户平时要一款一款买的效率工具——逐应用音量、系统监控、窗口贴边、剪贴板历史、截图录屏、应用卸载——全部塞进了一个菜单栏图标里，免费、开源、全本地运行。项目从第一次提交到冲上 GitHub Trending 只用了三天，还拿下了 Trendshift 当日 Swift 榜第一。

## 一、项目概述

### 它是什么

Vorssaint 是一个面向 Apple Silicon Mac 的**开源菜单栏工具集**（GPL-3.0-or-later），仓库地址 [vorssaint/vorssaint-utils](https://github.com/vorssaint/vorssaint-utils)。它不做某一件事做到极致，而是把 macOS 生态里长期"一个功能一个 App、一个 App 一份订阅"的碎片化现状，收敛到单一入口。

### 它解决什么问题

一台用得比较狠的 Mac，桌面工具栈往往是这样的：

| 需求 | 常见商业方案 |
|---|---|
| 逐应用音量 / 音频路由 | 音频控制类付费 App |
| CPU/GPU/温度/风扇监控 | 系统监控类付费 App |
| 窗口贴边与分屏 | 窗口管理类付费 App |
| 剪贴板历史 / 文本片段 | 剪贴板与扩写类付费 App |
| 截图标注 / 录屏剪辑 | 截图录屏类付费 App |
| 应用彻底卸载 / 缓存清理 | 清理类付费 App |

六个需求，六个常驻进程，六份订阅，六套快捷键冲突。Vorssaint 的判断是：这些功能底层依赖的系统 API 高度重叠（Accessibility、CoreAudio、ScreenCaptureKit、IOKit），完全没必要跑六份。

### 核心特性

- **模块化安装**：Features 页面以"功能"为单位安装/卸载。卸载后该功能从整个 App 消失并停止加载，不再占用 CPU、内存和电量；设置不会被删除，重装即恢复。
- **能耗透明**：每个功能都带一枚"诚实的能耗徽章"，明确告诉你开启后它会让什么东西一直活着。
- **权限最小化**：首次配置提供 Essentials / Windows / Battery and quiet 三个一键组合包，只申请所选功能真正需要的权限；甚至会在某个已授予的权限"已无功能使用"时主动提示你去撤销。
- **本地优先**：无账号、无分析、无追踪。触网的只有更新检查、测速、Homebrew 操作、你主动生成的临时分享链接和你主动发送的反馈。
- **国际化**：内置十三种语言。

功能面上大致覆盖六个域：声音、系统监控、窗口与 Dock、键鼠、剪贴板与文件、日常工具（Command Bar、截图录屏、清理卸载、Homebrew 管理等）以及电源与显示。

## 二、技术原理

### 技术栈与选型

从 `Package.swift` 可以看到项目的骨架异常干净：

```swift
// swift-tools-version:5.9
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Vorssaint

import PackageDescription

let package = Package(
    name: "Vorssaint",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "Vorssaint",
            path: "Sources/Vorssaint"
        )
    ]
)
```

几个值得注意的决策：

1. **零第三方依赖**。`dependencies` 数组是空的，整个 App 只依赖系统框架。这对一个需要申请辅助功能、屏幕录制、系统音频录制等高敏感权限的工具来说是关键——供应链攻击面为零，用户审计成本也最低。
2. **单一 `executableTarget`，而非 Xcode 项目**。用 SwiftPM 直接产出可执行文件，再由 `build.sh` 负责生成图标、组装并签名 `.app` bundle。这让"只装 Xcode Command Line Tools 就能自己编译"成为可能，不必安装完整 Xcode。
3. **`platforms: [.macOS(.v14)]`**。锁定 Sonoma 起步，意味着可以放心使用 ScreenCaptureKit 的新 API、SwiftUI 的成熟版本以及新的音频进程捕获能力，不用为向下兼容写双份实现。
4. **仅 Apple Silicon**。省掉 Rosetta 与 x86 分支，风扇/温度/能耗读取只需处理一套 SoC 传感器模型。

### 模块化架构：为什么"卸载"是真卸载

大多数"全家桶"工具的所谓功能开关，其实只是一个 `if enabled` 判断，代码依然被加载、监听器依然被注册。Vorssaint 强调的是"uninstall a feature"而非"disable"——卸载后功能"从整个 App 消失并停止加载"。

这在实现上通常对应这样一套结构：

```swift
// 概念示意：功能以协议 + 注册表的形式解耦
protocol Feature {
    static var id: FeatureID { get }
    static var requiredPermissions: Set<Permission> { get }
    static var energyImpact: EnergyBadge { get }

    func activate()    // 注册事件监听 / 启动采样定时器
    func deactivate()  // 反注册，释放所有常驻资源
}

final class FeatureRegistry {
    private var live: [FeatureID: Feature] = [:]

    func sync(with installed: Set<FeatureID>) {
        // 已装但未激活 → activate
        for id in installed where live[id] == nil {
            let f = make(id)
            f.activate()
            live[id] = f
        }
        // 已激活但被卸载 → deactivate 并从注册表移除
        for (id, f) in live where !installed.contains(id) {
            f.deactivate()
            live.removeValue(forKey: id)
        }
    }
}
```

这套设计带来三个连锁收益：

- **权限按需申请**：`requiredPermissions` 是各功能自声明的，所有已安装功能求并集，就是这台 Mac 真正需要授予的权限集合。差集变化时，就能提示"这个权限已经没人用了"。
- **能耗可归因**：`energyImpact` 让 UI 能在安装前就告诉用户代价，而不是等电池掉得快了让用户自己排查。
- **UI 自动收敛**：设置页、快捷键页、面板 Tab 都从注册表派生，卸载后对应条目自然消失，不需要在十几处写隐藏逻辑。

### 关键技术点拆解

**逐应用音量，且无需音频驱动。** README 明确写了 "No audio driver, no setup"。传统方案要装虚拟音频设备（HAL 插件）把系统输出劫持过来，代价是内核态组件、系统更新后失效、以及一堆权限对话框。Vorssaint 走的是 macOS 14 起提供的 **系统音频录制（System Audio Recording）权限 + 进程级音频捕获/重路由** 路径——权限表里也印证了这一点：

> System Audio Recording → 用于 Per app volume and output routing；不授予时，各 App 仍走系统默认音频。

这条路径的好处是纯用户态、可被系统隐私中心统一管理；代价是把系统版本门槛抬到了 Sonoma。

**窗口切换器与 Dock 预览的缩略图。** 这两个功能都要"实时窗口画面"，对应 Screen Recording 权限，底层就是 ScreenCaptureKit 的 `SCShareableContent` 枚举窗口 + `SCStream` 抓帧。这里最大的工程难点是成本控制：切换器要"可调节的实时缩略图"，Dock hover 也要，一旦无脑常驻抓帧，风扇立刻起飞。项目给出的答案是显式的暂停名单：

> Choose apps where Vorssaint pauses both switcher and Dock thumbnail capture while they are in front.

即当全屏游戏、3D 工具等应用在前台时，主动停掉抓流。同类思路也出现在键鼠功能里的 "Apps to leave alone"——为那些自己接管鼠标的设计/建模软件让路。这是一种很务实的工程取舍：与其追求通用启发式算法，不如给用户一个明确可控的开关。

**窗口布局与边缘吸附。** 依赖 Accessibility（AXUIElement）读写目标窗口的 `kAXPositionAttribute` / `kAXSizeAttribute`。"Restore steps back through recent placements"说明它维护了一个每窗口的位置栈，这是比单纯"贴边"更细的实现——需要在每次自己发起的移动前入栈，同时忽略用户手动拖动产生的噪声。

**离线 OCR 与二维码。** "Copy text from screen"强调 offline，走的是 Vision 框架的 `VNRecognizeTextRequest`，二维码则是 `VNDetectBarcodesRequest`，完全本地，无需联网。

**录屏编辑器的自动缩放。** "adds automatic zooms that can stay with typing after a click"——把点击与后续键盘输入视为同一个"注意力区间"，缩放窗口不在点击后立刻收回，而是延续到打字结束。这是个很细的交互洞察，也是这类工具容易被忽略的差异点。

### 数据流

以"系统监控"这条链路为例，典型的数据流是：

```
IOKit / SMC / powermetrics 类传感器
        │  定时采样（可调间隔）
        ▼
   采样聚合层（环形缓冲，保留历史用于绘制曲线）
        │
        ├──► 面板 System Tab（SwiftUI 曲线图）
        ├──► 菜单栏 readouts（数值 / 紧凑条形）
        └──► 阈值判定 ──► 通知中心告警
                          （持续高 CPU、高温、内存压力、
                            磁盘不足、低电量）
```

关键在于**单一采样源、多路消费**：菜单栏读数、面板曲线、告警判定共用同一份采样，避免三个模块各开一个定时器。这也是"能耗徽章"能给出可信数字的前提。

## 三、安装与快速开始

### 环境要求

- Apple Silicon 芯片的 Mac（不支持 Intel）
- macOS 14 Sonoma 或更新版本

### 方式一：Homebrew（推荐）

```sh
brew install --cask vorssaint
```

### 方式二：下载 DMG

前往 [Releases 页面](https://github.com/vorssaint/vorssaint-utils/releases) 下载磁盘映像，把 Vorssaint 拖进"应用程序"。

官方构建使用 Apple Developer ID 签名并已公证（notarized），macOS 不会拦截，升级后已授予的权限也不会失效。

### 方式三：自行编译

```sh
git clone https://github.com/vorssaint/vorssaint-utils.git
cd vorssaint-utils
./build.sh            # 编译、生成图标、组装签名后的 bundle
./build.sh --install  # 上述流程 + 安装到 Applications 并启动
```

唯一前置依赖是 Xcode Command Line Tools：

```sh
xcode-select --install
```

### 卸载

```sh
# Homebrew 安装的
brew uninstall --cask vorssaint

# 彻底清除，含设置与权限授予记录
./Tools/uninstall.sh
```

### 首次运行

启动后会进入引导流程，这一步值得慢慢做：

1. **选择组合包**：`Essentials`（通用效率）、`Windows`（窗口党）、`Battery and quiet`（续航优先），也可以进可视化选择器逐个勾。
2. **按需授权**：系统只会弹出你所选功能实际需要的权限。
3. **随时可改**：Settings → Features 里增删功能，Settings → Keyboard shortcuts 里统一编辑所有已装功能的全局快捷键。

如果只想先尝个鲜，我的建议是从这三个开始：音量混音器（Volume mixer）、Command Bar（`⌘` 系呼出的全局命令栏）、剪贴板历史。这三个是最容易立刻感知到价值、能耗又最低的。

## 四、使用方法与实战

### 基础用法：三个高频入口

**1. 音量混音器**

点击菜单栏图标 → Sound 面板，可以看到每个正在发声的 App 各自一条滑杆。两个常被忽略的细节：

- 单个 App 可以推过 100%，用来救那些音量做得过低的视频。
- 系统提示音可以单独指定输出设备，开会时不会突然从耳机里炸出来。

**2. Command Bar**

一个快捷键唤起悬浮输入框，输入几个字母即可：

- 运行任意 Vorssaint 动作
- 打开 App、切换窗口
- 插入文本片段、粘贴剪贴板历史条目到光标处
- **调用当前前台 App 菜单栏里的任意命令**，并显示该命令自身的快捷键
- 算数、单位换算、日期计算、查询 Mac 状态
- 直接输入网址打开

在任意行按 `⌘K` 可以对该项做二次操作（对 App 可退出/重启/强制退出/送去卸载器；对任意行可重命名、置顶、隐藏或单独绑定快捷键）。它会学习你的高频项，但**不会记住你输入过的内容**。

**3. 窗口布局**

先在 Window Layout 里打开边缘吸附，然后：

- 拖标题栏到屏幕边缘/角落 → 实时预览分区
- 按住自定义修饰键 + 拖动任意位置 → 移动窗口；再加 `Shift` → 缩放
- 鼠标右键拖动 → 缩放
- 半屏 / 三分 / 六分 / 四角 / 居中 / 最大化（可带边距）/ 移到上一或下一显示器，每个动作都能单独绑快捷键
- Restore 可逐步回退到之前的位置

### 进阶用法

**文本片段 + 剪贴板变量**

在 Text snippets 里定义触发词，支持剪贴板变量与任意格式的日期时间。例如定义 `;today` 展开为当天日期、`;cb` 插入剪贴板内容，配合 Command Bar 的片段搜索，基本能替掉独立的文本扩写工具。

**Super Key：解决快捷键冲突的思路**

这是我认为设计上最聪明的一处。按住 `Caps Lock` 时，它等价于同时按下 `Shift + Control + Option + Command`（俗称 Hyper Key）。因为几乎没有 App 会占用四修饰键组合，所以你基于它构建的所有快捷键**天然不会和任何应用冲突**。而单独轻点 `Caps Lock` 仍可保留切换大小写、映射为 `Escape` 或干脆什么都不做。

**Radial Menu：给鼠标党的入口**

按住某个快捷键或鼠标侧键，指针周围展开一圈轮盘菜单，可放 App、文件、链接、组合键、媒体控制、快速开关和 Vorssaint 工具，支持子菜单。指向并松手即执行。对于需要频繁切换的重复操作，比记忆十几个快捷键更可持续。

**Clean URL：自动去掉追踪参数**

复制链接时自动剥离 `utm_*` 之类的追踪参数，也可以自定义要移除的参数名。可设为按需触发或全自动。分享链接给别人时很省心。

**App updates：统一升级入口**

汇总 Homebrew 和 App Store 两个来源里有新版本的应用，勾选后批量升级，不必为每个 App 打开不同的商店。也可以后台检查并在有更新时通知。

### 实战组合：一套"零订阅"日常工作流

```text
早上开机
  └─ Keep awake（接外接显示器时自动保持唤醒）

写代码
  ├─ Super Key + H/L      → 窗口左右半屏
  ├─ Command Bar          → 直接执行 IDE 菜单里的命令
  └─ Key debounce         → 过滤老键盘的连击重复字符

开会
  ├─ Camera preview       → 入会前先照个镜子
  ├─ Per app output       → 音乐走音箱，会议走耳机
  ├─ Mute all mics        → 一键静音全部麦克风
  └─ Scratchpad           → 浮动便签记要点

写文档
  ├─ Screenshot + 编辑器  → 截长图、标注、打码、加背景
  ├─ Copy text from screen→ 离线 OCR 抓图里的文字
  ├─ Text snippets        → 展开常用段落
  └─ Clean URL            → 引用链接自动去追踪参数

收尾
  ├─ Cleaner（定时）      → 清缓存、日志、App 残留
  ├─ Uninstaller          → 卸载 App 连带清理配置与辅助进程
  └─ Cleaning Mode        → 锁键盘 + 全屏黑屏，擦屏幕
```

这套流程如果用商业软件拼出来，一年的订阅费大概是三位数美元级别。

## 五、常见问题与解决方案

### 安装与首次启动

**Q：首次打开被 macOS 拦截，提示"无法验证开发者"。**

官方 Release 是经过 Developer ID 签名并公证的，正常情况下不会拦。若被拦，通常是因为下载过程中的 quarantine 属性异常，或者你装的是自行编译版本。可以在"系统设置 → 隐私与安全性"页面底部点击"仍要打开"。自行编译的版本因为用的是本地签名，第一次需要手动放行。仓库的 [troubleshooting 文档](https://github.com/vorssaint/vorssaint-utils/blob/main/docs/TROUBLESHOOTING.md) 专门覆盖了这一类情况。

**Q：Intel Mac 能装吗？**

不能。项目明确只支持 Apple Silicon。温度、风扇、能耗读取以及部分音频能力都基于 Apple Silicon 的传感器与 API 模型，没有 x86 分支。

**Q：`brew install --cask vorssaint` 提示找不到 cask。**

先执行 `brew update` 刷新 tap 索引。若仍不行，直接从 Releases 页下载 DMG。

### 权限相关

**Q：授予了辅助功能权限，但重启后功能又失效了。**

这是 macOS TCC 数据库的经典问题，常见于 App 被移动过位置或被重新签名（比如你先装了 DMG 版又装了自编译版）。解决办法是在"系统设置 → 隐私与安全性 → 辅助功能"里把 Vorssaint 条目删掉，再重新添加当前实际运行的那个 App 副本。

**Q：不想给屏幕录制权限，会损失什么？**

只会失去和"画面"相关的能力：窗口切换器缩略图、Dock 预览、截图、录屏、屏幕取字。其余功能不受影响——这也是模块化设计的直接好处，你可以干脆把这些功能卸载掉，权限提示就不会再出现。

**Q：有权限我给了但好像没用上。**

Vorssaint 会主动检测这种情况并在 Permissions 页面提示"该权限已无功能使用"，并给出撤销入口。这是很少见的、反向替用户减权限的设计。

### 运行时与性能

**Q：装了之后电池掉得快 / 风扇变吵。**

按这个顺序排查：

1. 打开 Features 页面，看已安装功能的能耗徽章，优先卸载标记为高能耗的。
2. 缩略图捕获（窗口切换器、Dock Preview）和系统监控采样是主要开销源。降低系统监控的采样频率，或把缩略图分辨率调小。
3. 把全屏游戏、3D/设计工具加入"暂停缩略图捕获"名单。
4. 如果开了 Keep awake 的"接电源自动保持唤醒"，注意它会阻止系统睡眠。

**Q：窗口缩略图显示成应用图标而不是实际画面。**

说明该窗口的画面抓取失败了。最常见原因是屏幕录制权限未授予或已失效；其次是某些 App 主动屏蔽了录制（比如带 DRM 的播放器）。前者去权限页重新授权，后者属于预期行为。

**Q：某个 App 的鼠标操作变得很奇怪。**

Vorssaint 的平滑滚动、滚动方向反转、侧键映射、中键模拟等功能会介入鼠标事件。对于自己接管鼠标的软件（Blender、CAD、部分游戏），把它加入各功能的 "Apps to leave alone" 名单即可。

**Q：快捷键和某个 App 冲突了。**

去 Settings → Keyboard shortcuts，这里集中列出所有已安装功能的全局快捷键并标注哪些处于激活状态。更彻底的方案是启用 Super Key，把自定义快捷键统一迁移到四修饰键组合上，从根源上消除冲突。

### 隐私与数据

**Q：它会不会上传我的剪贴板 / 截图？**

不会。剪贴板历史、OCR、媒体压缩全部本地完成。会触网的行为是有限且可见的：更新检查、测速、Homebrew 操作、**你主动生成的**截图/录屏临时分享链接（1/6/24 小时可选，可提前删除），以及你主动发送的反馈——反馈发送前会先把所有技术细节摊开给你看，由你决定是否包含。完整说明见 [PRIVACY.md](https://github.com/vorssaint/vorssaint-utils/blob/main/docs/PRIVACY.md)。

**Q：换 Mac 了，配置能带走吗？**

可以。设置支持导出成文件，在新机器上导入即可。

### 关于 Fork

项目采用 GPL-3.0-or-later，源码可自由 fork 和修改。但要注意：Vorssaint 这个名称、图标和整体视觉由 [TRADEMARKS.md](https://github.com/vorssaint/vorssaint-utils/blob/main/TRADEMARKS.md) 单独约束，官方构建仅由维护者发布。也就是说，fork 出去的版本必须换一套自己的品牌标识。这是开源项目在 GPL 之上叠加商标保护的常见做法，目的是防止有人套壳分发夹带私货的构建。

## 六、总结

Vorssaint 值得关注的地方，其实不在于功能多——功能列表长到有点吓人，反而容易让人怀疑深度。真正有意思的是它对"工具集"这个形态给出的三个回答：

**第一，用模块化解决"全家桶必然臃肿"的宿命。** 把 install / uninstall 做到功能粒度，卸载即不加载，配合每个功能自带的能耗徽章和权限声明，让用户对"我付出了什么"有完整可见性。这比"我们做了很多优化"这类说辞有说服力得多。

**第二，用零依赖 + 系统原生 API 换取信任。** 一个要申请辅助功能、屏幕录制、系统音频录制的 App，本质上能看到你在 Mac 上做的一切。`Package.swift` 里空着的 `dependencies` 数组、GPL 开源、可自行编译、本地优先无遥测——这套组合拳，是这类高权限工具唯一能站得住的信任基础。

**第三，把系统版本门槛当作设计资源而非负担。** 锁定 macOS 14 + Apple Silicon，让它可以直接用 ScreenCaptureKit 和系统级音频进程捕获，从而实现"逐应用音量无需安装音频驱动"这种以前做不到的体验。放弃兼容性换取实现优雅，在工具类软件里是个越来越常见也越来越正确的选择。

当然它也有明确的边界：Intel Mac 用户完全无缘；macOS 13 及更早版本无法使用；功能面铺得极广，单点深度未必比得过各领域的专精商业软件；Fan Control 还挂着 beta 标签。如果你重度依赖某一个具体功能的高级能力，专用工具可能仍是更好的选择。

但如果你的诉求是"这十来个小功能我都想要，但一个也不值得单独付费订阅"——那 Vorssaint 大概是目前最合适的答案。它在三天内冲上 Trending 并非偶然，而是精准命中了一个存在很久却始终没被系统性解决的需求。

项目地址：[github.com/vorssaint/vorssaint-utils](https://github.com/vorssaint/vorssaint-utils)
