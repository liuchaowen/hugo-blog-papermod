---
title: "Decimen Optical Transfer：用屏幕和摄像头实现无网络文件传输"
date: "2026-08-02"
description: "Decimen Optical Transfer 是一个巧妙的离线文件传输工具，通过屏幕显示动态 QR 码、摄像头实时解码，实现两台设备间的无网络文件传输，零配对、零权限、零依赖。"
author: "Cheman"
slug: decimen-optical-transfer
draft: false
categories: ["技术", "开源", "工具"]
tags: ["GitHub", "开源", "工具", "离线传输", "QR码", "Fountain Code", "WebAssembly"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Decimen Optical Transfer**，一个利用屏幕显示动画 QR 码、摄像头实时解码来实现两台设备间文件传输的离线工具——不需要任何网络连接，不需要配对，不需要安装 App。

## 一、项目概述

**Decimen Optical Transfer** 是一个将文件编码为连续动画 QR 码序列、通过摄像头实时重建文件的传输工具。

### 核心特性

- **完全离线**：两台设备之间不需要任何网络路径，文件通过光传输
- **无需配对**：没有蓝牙配对、没有 Wi-Fi 直连、没有 QR 扫码握手，只需一方屏幕对着另一方摄像头
- **支持文件+文本**：可传输任意文件（最大 64 MB）或粘贴的文本片段，发送端自动识别类型
- **SHA-256 完整性校验**：接收完成后自动验证哈希，确认无误后才提供下载
- **自适应压缩**：仅在 gzip 压缩能缩小光载波时才使用，减少传输帧数
- **离线可用**：首次访问后 Service Worker 缓存全部资源，后续完全离线工作

### 性能数据

| 场景 | 速率 |
|------|------|
| 手机到手持 | ~128 KB/s |
| 手机固定（推荐） | ~186 KB/s |
| 极限测试（ProMotion + 堆叠码） | ~186 KB/s |

以 186 KB/s 计算，传输一张 5 MB 的照片大约需要 **27 秒**。

## 二、技术原理

### 2.1 问题建模：单向光通道

屏幕→摄像头的物理链路是一个**纯单向信道**：接收端无法向发送端发出重传请求，而摄像头不可避免地会漏帧（运动模糊、刷新周期、帧率抖动）。

传统的循环播放方案（LOOP）有一个致命缺陷：**错过一帧就等于等满一整个周期才能重试**。这在高帧率 QR 流中体验极差。

### 2.2 解决方案：Fountain Code（LT 码）

项目采用 **Luby Transform (LT) Codes**，这是一种喷泉码（Fountain Code）的实现，核心思想是：

> 发送端**永不直接发送文件块**，每一帧都是文件中所有块的一个随机子集的 XOR 叠加，接收端只要收集到足够多（略多于块数）的任意帧，就能在数学上完全恢复原始文件。

关键代码来自 `fountain.ts`：

```typescript
// 确定性伪随机子集选择
function encodeFrame(blocks: Uint8Array[], frameIndex: number): Uint8Array {
  const result = new Uint8Array(blockSize);
  // 根据 frameIndex 确定性生成随机子集
  const subset = generateRobustSolitonSubset(blocks.length, frameIndex);
  for (const idx of subset) {
    xorBytes(result, blocks[idx]);
  }
  return result;
}
```

子集大小由 **Robust Soliton 分布**决定，这是一种精心设计的概率分布，兼顾编码效率和解码成功率。这是经过数学证明的最优分布，项目源码中特意实现了**确定性版本的 Math.log**，避免不同 JS 引擎（V8 vs JavaScriptCore）因浮点实现差异导致分布不一致——这是一个silent, total failure mode。

### 2.3 帧格式设计

每一帧 QR 码都携带完整的会话头信息，接收端可以**中途加入**任意正在进行的传输：

```typescript
interface FrameHeader {
  sessionId: string;      // 新会话自动重置接收端
  sequence: number;       // 帧序号
  blockCount: number;    // 文件被分成的块数
  blockSize: number;      // 每块字节数
  fileLength: number;     // 文件总字节数
  hash: string;           // SHA-256 哈希
}
```

无握手、无协商，接收端锁定 stream 后自动开始重建。

### 2.4 解码实现：zxing-cpp WASM

iOS Safari 至今未实现 `BarcodeDetector` API（WebKit bug #281848），因此解码端使用 [zxing-cpp](https://github.com/zxing-cpp/zxing-cpp) 编译为 WebAssembly，配合 `requestVideoFrameCallback` API 实现逐帧捕获：

```typescript
// 使用 requestVideoFrameCallback 实现高精度帧捕获
const rvfc = new RequestVideoFrameCallback(video, (now, metadata) => {
  // metadata.placedByteStreamTimingInfo 含精确时间戳
  decodeFrame(canvas);
});
```

注意：iOS Safari 会**谎报帧率**——请求 `{ideal: 60}` 时实际返回 30 fps。正确做法是请求 `{exact: 60}` 并回退读取 `getSettings()` 的真实值。

### 2.5 进度条设计

作者特别提到一个重要细节：**进度条必须追踪"收集的帧数"而非"已解出的块数"**。LT 码的求解过程是后端密集型——大部分时间看起来进度条"卡住"，然后突然跳到 100%。项目采用入帧速率 + 已解码块数的混合策略，保证进度条在整个传输过程中平滑前进。

## 三、安装与快速开始

### 方式一：直接使用线上版本（推荐）

访问 **[decimen.app](https://decimen.app/)**，在两台设备上同时打开：
- **发送端**：打开 `/send/` 页面，选择文件或粘贴文本，调整屏幕亮度
- **接收端**：打开 `/receive/` 页面，点击 **Start Camera**，对准发送端屏幕

首次访问后 Service Worker 自动缓存，可离线使用。

### 方式二：本地运行

```bash
git clone https://github.com/bashalarmistalt/decimen-optical-transfer.git
cd decimen-optical-transfer
npm install
npm run dev
```

开发服务器使用自签名 HTTPS 证书（`@vitejs/plugin-basic-ssl`），首次访问时需在浏览器中手动通过安全警告（手机端点击"显示详情→继续访问"）。

### 方式三：独立单文件

```bash
npm run build:all
```

生成：
- `decimen-sender.html`（~55 KB）：可从 `file://` 打开，发送端专用
- `decimen-receiver.html`（~1.3 MB）：解码 WASM 内嵌为 data URI，**需通过 HTTP(S) 服务打开**（iOS Safari 和 Android Chrome 在 `file://` 下无法获取摄像头权限）

## 四、使用方法与实战

### 4.1 基础文件传输

1. 发送端：打开 decimen.app/send/ → 选择文件
2. 接收端：打开 decimen.app/receive/ → 授权摄像头 → 对准屏幕
3. 等待 SHA-256 验证通过 → 保存文件

**最佳实践**：将手机靠在固定物体上（手抖是吞吐量最大的敌人），屏幕亮度调至最高。

### 4.2 传输调参

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| TX FPS | 60 | 120 Hz 屏幕最佳；60 Hz 屏幕建议降至 24-30 fps |
| Bytes/Frame | 2953（QR v40） | 近距离高密度；远距离或小屏幕降至 1465（v27） |

如果传输缓慢，首先尝试：降低 Bytes/Frame 到 1465，同时将 TX FPS 降至 24。

### 4.3 文本片段传输

切换发送端到 **Text snippet** 模式，粘贴文本后直接发送。接收端根据媒体类型自动判断文件到达，无需额外操作。

### 4.4 Demo 模式（适合演示）

```bash
npm run demo
```

锁定发送端只能选择两个内置图片，适合在公共场合演示，防止他人通过文件选择器访问主机文件系统。

## 五、常见问题与解决方案

### Q1: 接收端摄像头无法打开？
iOS Safari 和 Android Chrome 强制要求 **HTTPS** 上下文才能访问 `getUserMedia` API。请确保：
- 使用 `decimen.app` 的线上版本，或
- 通过 HTTPS 服务本地文件（开发服务器自带自签名证书，需手动通过浏览器警告），或
- 使用桌面 Chrome/Firefox 打开本地 `file://` 文件（摄像头权限不受 `file://` 限制）

### Q2: 传输速度很慢？
1. **检查手机是否稳定**——手抖导致的自动对焦搜索是吞吐量最大的杀手
2. 调低 Bytes/Frame 到 1465，降低 TX FPS 到 24
3. 确保发送端屏幕亮度最高

### Q3: 接收端提示 SHA-256 校验失败？
传输过程中有帧丢失导致解码不完整。重新开始传输即可——发送端会分配新的 session ID，接收端自动重置状态。

### Q4: 无法在 iOS Safari 上使用？
Decimen 针对 iOS 做了充分适配（iOS Camera 权限管理较为严格），但 Safari 不支持 `BarcodeDetector`，因此使用了 zxing WASM 解码方案，理论上支持所有现代浏览器。若 iOS Safari 出现摄像头黑屏，尝试刷新页面或重启摄像头授权。

## 六、总结

Decimen Optical Transfer 是一个工程完成度极高的项目。它用**纯 Web 技术**解决了一个看似不可能的问题：让两台设备仅通过屏幕和摄像头就能可靠传输文件。Fountain Code 的引入是核心——它将"丢帧就重传"的噩梦变成了优雅的数学保证：只要帧足够多，文件就必然能恢复。

从技术角度看，这个项目对细节的打磨令人印象深刻：确定性 Soliton 分布规避 JS 引擎差异、iOS 帧率谎报的处理、`requestVideoFrameCallback` 生命周期管理、Safari `BarcodeDetector` 缺失的兜底方案……每一行注释都是踩坑记录。

**体验地址**：[decimen.app](https://decimen.app/)（支持 PWA 离线使用）

**GitHub 仓库**：[bashalarmistalt/decimen-optical-transfer](https://github.com/bashalarmistalt/decimen-optical-transfer)
