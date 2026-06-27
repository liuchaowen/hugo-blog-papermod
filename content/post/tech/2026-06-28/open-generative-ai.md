---
title: "Open Generative AI：打破内容过滤的开源 AI 创作工作室，200+ 模型自由调用"
date: 2026-06-28
description: "Open Generative AI 是一款开源的 AI 图像、视频、Lip Sync 创作工作室，基于 MuAPI 聚合 200+ 前沿模型（Flux、Kling、Sora、Veo 等），无任何内容过滤与订阅费用，支持本地推理，桌面端 + Web 双端可用，是 AI 创作类闭源平台的彻底开源替代方案。"
author: "Cheman"
slug: open-generative-ai
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 图像生成, 视频生成, MuAPI]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Open-Generative-AI**，一个完全开源、无任何内容过滤的 AI 图像/视频创作工作室，聚合了 200+ 前沿生成模型，堪比闭源商业平台的创作自由度，却完全免费、可自托管。

## 一、项目概述

**Open Generative AI** 是由 Anil-matcha 开发的开源 AI 创作工具，定位是「AI Video Platforms 的 unrestricted open-source alternative」。核心亮点：

- **无内容过滤**：不设 prompt 审查、不拒绝敏感提示词，完全创作自由
- **200+ 模型**：覆盖 Text-to-Image、Image-to-Image、Text-to-Video、Image-to-Video、Lip Sync 五大类
- **免费开源**：MIT 协议，无订阅费，无厂商锁定
- **多端可用**：桌面 Electron App（Mac/Win/Linux）+ 自托管 Web（Next.js）
- **本地推理**：支持 sd.cpp（ bundled ）和 Wan2GP（远程 GPU 服务器）两种本地引擎

项目基于 [MuAPI](https://muapi.ai) 作为模型网关，所有云端推理请求经由 MuAPI 统一转发。桌面端也支持完全离线运行（sd.cpp 引擎），数据不离开本地。

代表性支持模型包括：Flux、Nano Banana 2、Seedream 5.0、Kling、Sora、Veo、Wan 2.2、Midjourney、GPT-4o Image、Infinite Talk 等。

## 二、技术原理

### 架构设计

项目是一个 **Next.js Monorepo**，核心分包如下：

```
Open-Generative-AI/
├── app/                        # Next.js App Router
│   └── studio/page.js          # 主 studio 入口
├── components/
│   ├── StandaloneShell.js      # Tab 导航 + API Key 管理
│   └── ApiKeyModal.js          # API Key 输入弹窗
├── packages/studio/            # 核心 UI 组件库（独立 npm 包）
│   └── src/
│       ├── models.js           # 200+ 模型定义（单一可信源）
│       ├── muapi.js            # MuAPI HTTP 客户端
│       └── components/         # ImageStudio / VideoStudio / LipSyncStudio ...
├── packages/Vibe-Workflow/     # 工作流引擎（submodule）
├── packages/Open-Poe-AI/       # Agent 组件（submodule）
└── electron/                   # Electron 桌面端入口
```

`packages/studio` 是独立 npm 包，通过 `npm workspaces` 联动，同时供自托管版和 [muapi.ai](https://muapi.ai/open-generative-ai) 托管版共用，模型更新只改一处即可同步两端。

### 模型调用流程

所有云端模型调用遵循统一的两步模式：

```
1. POST /api/v1/{model-endpoint}  →  提交生成任务（返回 request_id）
2. GET  /api/v1/predictions/{request_id}/result  →  轮询直到 status=completed
```

`muapi.js` 中的核心封装（简化）：

```js
// 提交任务
export async function submitGeneration(apiKey, endpoint, params) {
  const res = await fetch(`https://api.muapi.ai/api/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json(); // { request_id, status }
}

// 轮询结果
export async function pollResult(apiKey, requestId, maxWait = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(
      `https://api.muapi.ai/api/v1/predictions/${requestId}/result`,
      { headers: { 'x-api-key': apiKey } }
    );
    const data = await res.json();
    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error(data.error);
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timeout');
}
```

开发环境下，Next.js `middleware.js` 将 `/api/v1/*` 请求 rewrite 到 `https://api.muapi.ai`，解决 CORS 问题；Electron 端则通过 Vite proxy 做同样的事情。

### 本地推理架构

桌面端支持两套本地推理引擎，设计上完全解耦：

| 引擎 | 实现方式 | 适用模型 | 硬件要求 |
|---|---|---|---|
| **sd.cpp** | 捆绑 C++ 二进制（Metal/CUDA/Vulkan） | SD 1.5、SDXL、Z-Image | 本地运行，Apple Silicon 支持 Metal GPU |
| **Wan2GP** | HTTP 客户端 → 远程 Gradio 服务器 | Flux、Qwen-Image、Wan 2.2、Hunyuan | 需独立 CUDA GPU 服务器 |

sd.cpp 引擎的二进制（`sd-cli` + `libstable-diffusion.dylib`）在用户首次启用时从 App 内自动下载，存储在 Electron appData 目录下。模型权重也通过 App 内 UI 按需下载，不需要用户手动管理文件。

Wan2GP 的设计思路很巧妙：把它当成一个远程服务，桌面 App 只负责发请求收结果，这样 Mac 用户可以用 Mac 跑前端，把推理卸载到局域网里的 Linux GPU 机器（或者 RunPod/vast.ai 实例）。

### 多图片输入实现

部分进阶模型（如 Nano Banana 2 Edit）支持最多 14 张参考图，前端实现了一个有序多选区组件：

```jsx
// 多图选择状态
const [selectedImages, setSelectedImages] = useState([]);

// 切换选中，带顺序编号
function toggleSelect(image) {
  if (selectedImages.find(i => i.id === image.id)) {
    setSelectedImages(selectedImages.filter(i => i.id !== image.id));
  } else {
    setSelectedImages([...selectedImages, { ...image, order: selectedImages.length }]);
  }
}
```

选中图片后，API 请求时通过 `images_list` 字段将多图 URL 数组一并提交给 MuAPI。

## 三、安装与快速开始

### 桌面端（推荐，无需 Node.js）

直接下载预构建安装包：

| 平台 | 下载链接 |
|---|---|
| macOS Apple Silicon | [Open.Generative.AI-1.0.9-arm64.dmg](https://github.com/Anil-matcha/Open-Generative-AI/releases/download/v1.0.9/Open.Generative.AI-1.0.9-arm64.dmg) |
| macOS Intel | [Open.Generative.AI-1.0.9.dmg](https://github.com/Anil-matcha/Open-Generative-AI/releases/download/v1.0.9/Open.Generative.AI-1.0.9.dmg) |
| Windows x64 | [Open.Generative.AI.Setup.1.0.9.exe](https://github.com/Anil-matcha/Open-Generative-AI/releases/download/v1.0.9/Open.Generative.AI.Setup.1.0.9.exe) |

> macOS 用户注意：因未做 Apple 公证，首次打开需要在终端执行 `xattr -cr "/Applications/Open Generative AI.app"` 然后右键打开。

### 自托管 Web 版（开发者）

```bash
# 克隆（含 submodule，必须递归克隆）
git clone --recurse-submodules https://github.com/Anil-matcha/Open-Generative-AI.git
cd Open-Generative-AI

# 安装依赖 + 构建 workspace 包（必须，不能只 npm install）
npm run setup

# 启动开发服务器（Next.js，localhost:3000）
npm run dev

# 或启动桌面端开发模式（Electron + Vite）
npm run electron:dev
```

### 最简运行示例

1. 打开 App，在设置页面填入 [MuAPI Access Key](https://muapi.ai/access-keys)（免费注册可获额度）
2. 进入 **Image Studio**，输入提示词：`a serene mountain lake at sunrise, oil painting`
3. 选择模型（默认 Flux Dev），点击 Generate
4. 约 10-30 秒后生成结果出现在下方，可一键下载

如果不想用云端 API，进入 **Settings → Local Models**，下载 sd.cpp 引擎和 SD 1.5 模型（如 Dreamshaper 8，约 2 GB），即可完全离线生成。

## 四、使用方法与实战

### Image Studio：双模式自动切换

Image Studio 根据是否上传参考图自动切换模型集：

- **无参考图** → Text-to-Image 模型（50+）：Flux、Nano Banana 2、Seedream 5.0、Midjourney v7…
- **有参考图** → Image-to-Image 模型（55+）：Flux Kontext、Nano Banana 2 Edit（支持 14 张参考图）、GPT-4o Edit…

实战示例——用 Nano Banana 2 Edit 做多参考图编辑：

1. 选择模型 `Nano Banana 2 Edit`
2. 上传 3 张参考图（比如：一张人脸、一张风格图、一张构图参考）
3. 输入提示词：`blend the face with the art style, keep the composition`
4. 点击 Generate，模型会按照参考图顺序处理

### Video Studio：Text-to-Video 与 Image-to-Video

Video Studio 同样智能切换：

- 无参考图 → 40+ T2V 模型（Kling v3、Sora 2、Veo 3、Wan 2.6…）
- 有起始帧 → 60+ I2V 模型（Kling I2V、Veo3 I2V、Runway I2V…）

Seedance 2.0 支持 **Video Extend** 功能：可以无缝延续已生成视频的长度，保留风格、动作和音频，支持 5/10/15 秒扩展。

### Lip Sync Studio

Lip Sync Studio 支持两种输入模式：

- **Portrait Image + Audio** → 说话头像视频（Infinite Talk、Wan 2.2 Speech to Video、LTX Lipsync…）
- **Video + Audio** → 对口型视频（Sync Lipsync、LatentSync、Creatify Lipsync…）

生成历史独立存储在 `lipsync_history`，页面刷新后任务状态自动恢复。

### Workflow Studio：可视化 AI 管道

Workflow Studio 允许用户用节点编辑器搭建多步 AI 管道，比如：

```
[Text-to-Image: Flux] → [Image-to-Image: Upscaler] → [Image-to-Video: Kling]
```

每个节点对应一个模型调用，输出自动传递给下一个节点。支持社区模板，也可以保存自己的管道复用。底层由 [Vibe-Workflow](https://github.com/SamurAIGPT/Vibe-Workflow) 驱动。

## 五、常见问题与解决方案

### 安装/启动类

**Q：macOS 提示「无法打开，因为无法验证开发者」**
A：终端执行 `xattr -cr "/Applications/Open Generative AI.app"`，然后右键打开。或去「系统设置 → 隐私与安全」点「仍要打开」。

**Q：`npm run dev` 报错 `Couldn't find a 'pages' directory`**
A：确认克隆时加了 `--recurse-submodules`，并且执行了 `npm run setup`（构建 workspace 包）。如果 `packages/Vibe-Workflow` 目录为空，重新运行 `git submodule update --init --recursive`。

**Q：Electron 桌面端 SWC 二进制报错**
A：这是 electron-builder 打包时将所有平台的 SWC 二进制都打进去了，afterPack.js 脚本会在打包后清理无关平台的二进制。开发模式下一般不受影响。

### 运行类

**Q：生成任务一直 pending / 超时**
A：先检查 MuAPI API Key 是否有效、余额是否充足。可以在 [muapi.ai/access-keys](https://muapi.ai/access-keys) 查看用量。部分大模型（如 Wan 2.2）生成时间较长，耐心等待或调低分辨率。

**Q：sd.cpp 本地推理在 8GB Mac 上卡死**
A：Z-Image 模型需要约 7.4 GB 权重 + 2.4 GB 计算缓冲，8 GB 机型会Swap 到磁盘导致系统挂起。建议 8GB Mac 用户只用 SD 1.5 模型（Dreamshaper 8 等）。

**Q：Wan2GP 远程服务器连接失败**
A：确认服务器上已运行 `python wgp.py --listen --server-name 0.0.0.0`，并且防火墙已放开 7860 端口。在 App 设置中填 `http://服务器IP:7860`，点 Test 验证连通性。

### 兼容性

**Q：Ubuntu 24.04 上 Electron App 无法启动**
A：Ubuntu 24.04 启用了 `apparmor_restrict_unprivileged_userns`，阻止 Chromium sandbox。建议安装 `.deb` 包（自带 AppArmor profile），或者临时执行 `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`。

## 六、总结

Open Generative AI 是一款完成度很高的开源 AI 创作工具，其最大价值在于：

1. **打破了商业 AI 平台的内容审查壁垒**，对创作者更友好
2. **200+ 模型的统一入口**，不需要分别注册各个平台
3. **本地推理选项**，数据隐私有保障
4. **桌面端体验良好**，预构建安装包让非技术用户也能直接使用

相对于商业竞品（如 Runway、Midjourney Web），它的劣势是目前依赖 MuAPI 作为模型网关（需注册获取 API Key），部分先进模型可能产生费用。但本地推理的加入让完全离线的使用场景也能覆盖。

整体来说，对于需要高频使用 AI 图像/视频生成、又不想被订阅费和内容审查束缚的创作者和开发者，这是一个非常值得关注的开源项目。

- GitHub: [Anil-matcha/Open-Generative-AI](https://github.com/Anil-matcha/Open-Generative-AI)
- 在线体验: [muapi.ai/open-generative-ai](https://muapi.ai/open-generative-ai)
- 协议: MIT
