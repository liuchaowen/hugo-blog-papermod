---
title: "Recordly：开源录屏编辑器，自动放大 + 光标美化 + 动态背景一条龙"
date: 2026-07-27
description: "Recordly 是一款免费开源的跨平台录屏与视频编辑工具，支持自动放大镜头、光标美化、动态摄像头叠加、时间线剪辑、MP4/GIF 导出，无需设计师也能做出精致的演示视频。"
author: "Cheman"
slug: recordly
draft: false
categories: ["开源", "工具软件", "视频处理"]
tags: ["开源", "录屏", "Electron", "视频编辑", "macOS", "Windows", "Linux"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Recordly**，一款免费开源的跨平台录屏与视频编辑工具，专为录制演示视频、Demo、产品介绍而设计。它把录屏、后期加工、导出合为一体，录制完成后直接进入编辑器，加上自动放大、光标美化、动态背景、摄像头叠加等效果，无需设计师也能输出精致的成品。

## 一、项目概述

### 1.1 它是什么

Recordly 是一个桌面级录屏编辑器，基于 Electron + React + PixiJS 构建，支持 macOS、Windows 和 Linux三大平台。用户在应用中选中屏幕或窗口、配置麦克风和系统音频后开始录制；录制完成后直接进入时间线编辑界面，添加放大镜头、修剪片段、文字标注、光标美化等处理，最后导出为 MP4 或 GIF。整个流程在一个应用内闭环完成，无需调用额外软件。

### 1.2 核心特性

- **录制**：全屏或单窗口录制，支持麦克风音频和系统音频捕获；macOS 使用原生 ScreenCaptureKit，Windows 使用 Windows Graphics Capture（WGC）实现高质量光标隐藏
- **时间线剪辑**：拖拽式时间线，支持裁剪、手动放大区域、自动放大建议、变速片段、文字/图片标注、额外音频轨道
- **光标美化**：光标大小调节、平滑动画、运动模糊、点击弹跳、摇曳效果；macOS 提供原生光标素材
- **摄像头叠加**：以气泡形式叠加 webcam，支持预设位置、自定义坐标、镜像、阴影、圆角，并可随放大动作自动缩放
- **帧样式与背景**：内置壁纸、运行时壁纸发现、自定义图片、纯色/渐变背景、圆角、模糊、阴影
- **导出**：MP4 和 GIF 两种格式，支持质量选择、帧率控制、循环开关、尺寸预设
- **扩展系统**：社区驱动，开发者可发布光标音效、设备框架、浏览器模拟、壁纸等插件

### 1.3 技术栈

| 层级 | 技术选型 |
|------|---------|
| 框架 | Electron |
| 前端 UI | React 18 + TypeScript + TailwindCSS + Radix UI |
| 渲染引擎 | PixiJS（场景合成与导出） |
| 音视频处理 | ffmpeg-static + mediabunny + mp4box |
| 光标捕获 | uiohook-napi + capturekit（macOS ScreenCaptureKit） |
| 构建工具 | Vite + electron-builder |
| 平台原生辅助 | macOS: ScreenCaptureKit Helper；Windows: WGC + WASAPI Helper；Linux: Electron capture API |
| 代码质量 | Biome（lint/format）+ Vitest（测试） |

## 二、技术原理

### 2.1 录制层架构

Recordly 的录制模块由 Electron 主进程协调，针对不同平台调用原生捕获后端：

```javascript
// electron/main.ts — 录制会话启动（简化）
const captureOptions = {
  source: 'display', // 或 'window'
  audio: { microphone: true, system: true },
  frameRate: 60,
};

const captureSession = new CaptureSession(captureOptions);
captureSession.on('data', (frameBuffer) => {
  // 通过 IPC 发送到渲染进程进行预览
  mainWindow.webContents.send('frame', frameBuffer);
});

captureSession.start();
```

- **macOS**：基于 `ScreenCaptureKit`，支持原生光标排除，获得干净的录制画面
- **Windows**：使用原生 Windows Graphics Capture（WGC）辅助工具，配合 WASAPI 完成音频捕获；需 Windows 10 Build 19041+
- **Linux**：通过 Electron 捕获 API 实现，系统音频通常需要 PipeWire

### 2.2 场景合成引擎（PixiJS）

编辑器的核心渲染基于 PixiJS，所有时间线上的效果（放大、光标、背景、摄像头）都作为场景节点参与合成：

```javascript
// 编辑器场景合成示意
import * as PIXI from 'pixi.js';

const app = new PIXI.Application({ width: 1920, height: 1080, backgroundColor: 0x000000 });
document.body.appendChild(app.view);

// 背景层
const background = PIXI.Sprite.from(wallpaperTexture);
background.width = 1920;
app.stage.addChild(background);

// 光标覆盖层
const cursor = new PIXI.Graphics();
cursor.drawCircle(0, 0, 12);
cursor.x = cursorX;
cursor.y = cursorY;
app.stage.addChild(cursor);

// 摄像头气泡
const webcam = PIXI.Sprite.from(webcamTexture);
webcam.position.set(1600, 900);
webcam.alpha = 0.9;
app.stage.addChild(webcam);
```

导出的 MP4 和 GIF 与预览使用相同的 PixiJS 场景逻辑，确保所见即所得。

### 2.3 时间线数据模型

时间线以 JSON 结构保存每个片段的属性，支持撤销重做：

```javascript
// .recordly 项目文件结构（简化）
{
  "version": "1.3.5",
  "sourceMedia": "/path/to/recording.mp4",
  "timeline": [
    { "type": "trim",    "start": 0,     "end": 15000 },
    { "type": "zoom",    "start": 5000,  "end": 8000,  "x": 640, "y": 360, "scale": 2.0 },
    { "type": "speed",   "start": 10000, "end": 12000, "factor": 1.5 },
    { "type": "annotation", "text": "Hello", "x": 100, "y": 100, "start": 3000, "end": 5000 }
  ],
  "cursor": { "size": 2.0, "smoothing": 0.8, "bounce": true },
  "webcam": { "enabled": true, "position": "bottom-right", "scaleOnZoom": true }
}
```

`.recordly` 文件保留了原始媒体路径和完整编辑器状态，可随时重新打开继续编辑。

### 2.4 导出管线

导出管线复用预览的 PixiJS 场景，逐帧渲染到 canvas，再由 ffmpeg 编码为最终视频：

```javascript
// 导出流程（简化）
const exporter = new MP4Exporter({
  fps: 30,
  bitrate: 'medium',
  outputPath: '/output/demo.mp4',
});

await exporter.start();

for (let frame = 0; frame < totalFrames; frame++) {
  app.renderer.render(app.stage); // 渲染 PixiJS 场景到 canvas
  const imageData = app.view.toDataURL('image/png');
  exporter.addFrame(imageData);
}

await exporter.finalize();
```

GIF 导出使用 gif.js 库，支持帧率、尺寸和循环参数配置。

## 三、安装与快速开始

### 3.1 系统要求

| 平台 | 最低版本 | 特别说明 |
|------|---------|---------|
| macOS | macOS 14.0 (Sonoma) | 音频和麦克风捕获依赖 ScreenCaptureKit |
| Windows | Windows 10 20H1 (Build 19041) | WGC 辅助工具和最佳光标隐藏需要此版本 |
| Linux | 任意现代发行版 | 建议配合 PipeWire 使用系统音频 |

### 3.2 安装方式

**方式一：直接下载（推荐）**

前往 [GitHub Releases](https://github.com/webadderallorg/Recordly/releases) 下载对应平台的安装包，双击安装即可。

**方式二：包管理器**

Arch Linux / Manjaro 用户可通过 AUR 安装：

```bash
yay -S recordly-bin
```

**方式三：源码构建**

```bash
# macOS 需要 Xcode Command Line Tools
xcode-select --install

# Linux (Ubuntu/Debian) 依赖
sudo apt install build-essential cmake libx11-dev libxtst-dev libxrandr-dev libxt-dev

git clone https://github.com/webadderallorg/Recordly.git recordly
cd recordly
npm install
npm run dev          # 开发模式运行
npm run build        # 构建安装包
```

### 3.3 macOS 安全提示

本地构建的 App 会被 macOS 隔离，执行以下命令解除：

```bash
xattr -rd com.apple.quarantine /Applications/Recordly.app
```

## 四、使用方法与实战

### 4.1 录制流程

1. 启动 Recordly，选择录制范围（全屏或指定窗口）
2. 勾选麦克风和系统音频来源
3. 点击开始录制，录制完成后自动进入编辑器
4. 如果需要，也可以从"新建录制"界面跳转到编辑器

### 4.2 编辑时间线

在编辑器中可以：

- **添加放大区域**：拖动时间线上的放大条，系统还会基于光标活动自动给出放大建议
- **修剪**：拖动片段边缘，去除不需要的开头结尾
- **变速**：选中片段设置加速或减速倍率
- **文字/图片标注**：从工具栏添加标注元素，放置在时间轴任意位置
- **调整光标行为**：在右侧面板设置光标大小、平滑度、点击动画

### 4.3 导出设置

导出界面支持：

- **格式**：MP4（通用视频）或 GIF（轻量分享）
- **质量**：低/中/高/原始
- **GIF 特有**：帧率（10/15/20/24 fps）、循环开关、尺寸预设
- **纵横比**：16:9 / 9:16 / 1:1 / 4:3 等

完成后点击导出，文件会在文件管理器中显示。

### 4.4 扩展使用

从 [Recordly Marketplace](https://marketplace.recordly.dev/extensions) 安装社区扩展，扩展类型包括：光标点击音效、设备框架、浏览器模拟壁纸等。

## 五、常见问题与解决方案

### 5.1 macOS 录制时声音过小或没有声音

确保在"系统设置 → 隐私与安全 → 屏幕录制"中授权 Recordly 访问麦克风。同时确认录制界面的麦克风和系统音频开关已打开。

### 5.2 Windows 录制后光标仍然可见

检查 Windows 版本是否为 19041 及以上。低于此版本的系统没有 WGC 支持，会回退到 Electron 捕获模式，导致真实光标无法隐藏。升级系统或使用较新版本的预构建包可以解决此问题。

### 5.3 Linux 导出 GIF 尺寸异常

Linux 上 Electron 捕获 API 对 GIF 导出有尺寸限制，建议使用 MP4 格式导出，或在系统配置中启用 PipeWire 以改善捕获效果。

### 5.4 录制时 CPU 占用高

高帧率（60fps）录制对 CPU 要求较高。录制前在设置中适当降低帧率或禁用系统音频可以减轻负载。

### 5.5 找不到已保存的项目文件

`.recordly` 项目文件存储在 `~/Library/Application Support/Recordly/`（macOS）或对应平台的应用数据目录中。编辑器内置了"打开项目"入口，可直接浏览并恢复工作。

## 六、总结

Recordly 填补了"轻量录屏"和"专业视频剪辑"之间的空白——它比 OBS 更傻瓜、更适合做演示类产品视频，又比传统录屏工具多了精细的编辑能力。对于需要频繁录制 Demo、教程、产品演示的开发者来说，Recordly 是目前开源生态中功能最完整、体验最顺滑的选择之一。开源协议为 AGPL 3.0，有兴趣的开发者也可以参与贡献，尤其在 Linux 光标捕获和导出性能方面还有提升空间。

> GitHub：[webadderallorg/Recordly](https://github.com/webadderallorg/Recordly)
> 官网：[recordly.dev](https://www.recordly.dev)
> Marketplace：[marketplace.recordly.dev](https://marketplace.recordly.dev/extensions)
