---
title: "Meetily：隐私优先的开源 AI 会议助手，本地转录与总结"
date: 2026-07-04
description: "Meetily 是一款隐私优先的开源 AI 会议助手，所有转录和总结均在本地完成，支持多平台，适用于对数据主权有严格要求的企业和专业人士。"
author: "Cheman"
slug: meetily
draft: false
categories: [开源项目, AI工具]
tags: [GitHub, 开源, AI, 隐私, 会议助手]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Meetily**，一款隐私优先的 AI 会议助手，所有数据处理都在本地完成，绝不上传云端。

## 一、项目概述

Meetily 是由 Zackriya Solutions 团队开发的开源 AI 会议助手，主打**隐私优先**和**本地处理**。在全球数据合规监管日益严格的背景下（GDPR 罚款已超 58.8 亿欧元），企业对会议数据的隐私保护需求愈发强烈，Meetily 正是为解决这一痛点而生。

**核心特性：**

- **100% 本地处理**：转录模型、录音、文稿全部存储在本地，数据绝不离开你的设备
- **实时转录**：基于 Whisper 或 Parakeet 模型，无需联网即可实时生成会议文稿
- **AI 总结**：支持 Ollama（本地）、Claude、Groq、OpenRouter 等多种 AI 提供商生成会议总结
- **跨平台支持**：macOS、Windows、Linux 全平台覆盖
- **GPU 加速**：内置 Apple Silicon (Metal/CoreML)、NVIDIA (CUDA)、AMD/Intel (Vulkan) 硬件加速支持
- **开源免费**：MIT 协议，代码完全透明

**适用场景：**

- 国防顾问、企业高管、法律专业人士、医疗从业者等需要处理敏感讨论的用户
- 对数据主权有严格要求的企业和机构
- 希望摆脱云服务供应商锁定的组织

## 二、技术原理

### 2.1 系统架构

Meetily 采用 [Tauri](https://tauri.app/) 框架构建，这是一个轻量级的 Electron 替代品：

```
┌─────────────────────────────────┐
│         Next.js 前端界面         │
│    (React + TypeScript)         │
└──────────────┬──────────────────┘
               │ Tauri API
┌──────────────▼──────────────────┐
│        Rust 后端核心逻辑         │
│  - 音频采集与混音                │
│  - 转录引擎调度 (Whisper/Parakeet) │
│  - AI 总结引擎                  │
│  - 本地数据存储                  │
└─────────────────────────────────┘
```

这种架构带来了以下优势：

1. **体积小**：Tauri 应用比 Electron 小一个数量级（通常 < 10MB）
2. **性能好**：Rust 后端提供接近原生的性能
3. **安全性高**：Rust 的内存安全特性减少了大量常见漏洞

### 2.2 核心技术栈

**转录模型：**

- **Whisper**（OpenAI）：通用语音识别模型，支持多语言
- **Parakeet**（NVIDIA）：高精度英语转录模型，基于 CTC (Connectionist Temporal Classification) 架构

Parakeet 模型经过 ONNX 格式转换（感谢 [istupakov](https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx) 的贡献），可在本地高效推理。

**音频处理：**

Meetily 实现了专业的音频混音功能：

- 同时捕获麦克风音频和系统音频
- 智能闪避（Ducking）和削波（Clipping）预防
- 支持多设备选择和音频源配置

**AI 总结引擎：**

支持多种 AI 提供商，用户可按需选择：

| 提供商 | 类型 | 优点 |
|--------|------|------|
| Ollama | 本地 | 完全离线，零成本 |
| Claude | 云端 | 高质量总结 |
| Groq | 云端 | 极速推理 |
| OpenRouter | 云端 | 多模型接入 |
| 自定义 Endpoint | 任意 | 企业自建基础设施 |

### 2.3 数据流分析

```
会议音频
    │
    ▼
┌─────────────────┐
│  音频采集模块    │ ← 麦克风 + 系统音频
└────────┬────────┘
         │ PCM 音频流
         ▼
┌─────────────────┐
│  转录引擎        │ ← Whisper / Parakeet
│  (本地推理)      │
└────────┬────────┘
         │ 文本转录结果
         ▼
┌─────────────────┐
│  本地存储        │ ← SQLite / 文件系统
└────────┬────────┘
         │ 转录文本
         ▼
┌─────────────────┐
│  AI 总结引擎     │ ← Ollama / Claude / ...
└────────┬────────┘
         │ 会议总结
         ▼
┌─────────────────┐
│  编辑器 & 导出   │ ← Markdown / PDF / DOCX
└─────────────────┘
```

整个数据流中，所有中间结果和最终结果都只存在于本地设备，实现了真正的数据主权。

## 三、安装与快速开始

### 3.1 环境要求

- **macOS**：Apple Silicon 或 Intel Mac，macOS 12+
- **Windows**：Windows 10/11，支持 GPU 加速（CUDA）
- **Linux**：主流发行版，需安装依赖库

### 3.2 安装步骤

**Windows：**

1. 从 [Releases](https://github.com/Zackriya-Solutions/meeting-minutes/releases/latest) 下载 `x64-setup.exe`
2. 运行安装程序

**macOS：**

1. 下载 `meetily_0.4.0_aarch64.dmg`（Apple Silicon）或 Intel 版本
2. 打开 `.dmg` 文件
3. 将 **Meetily** 拖入应用程序文件夹
4. 从应用程序文件夹启动 **Meetily**

> **注意**：首次启动可能需要在"系统设置 > 隐私与安全性"中允许运行。

**Linux（从源码构建）：**

```bash
git clone https://github.com/Zackriya-Solutions/meeting-minutes
cd meeting-minutes/frontend
pnpm install
./build-gpu.sh
```

### 3.3 最简运行示例

安装完成后，使用步骤如下：

1. **启动 Meetily**：打开应用程序
2. **选择音频源**：在设置中选择麦克风和系统音频
3. **开始会议**：点击"开始录音"按钮
4. **实时查看转录**：转录文本会实时显示在界面上
5. **生成总结**：会议结束后，选择 AI 提供商并生成总结

## 四、使用方法与实战

### 4.1 基础用法

**本地转录 + 本地总结（完全离线）：**

1. 安装 [Ollama](https://ollama.com/)
2. 拉取模型：`ollama pull llama3`
3. 在 Meetily 设置中选择 AI 提供商为"Ollama"
4. 开始录音，会议结束后点击"生成总结"

**使用云端 AI（更高精度）：**

1. 在设置中选择 AI 提供商（如 Claude）
2. 填入 API Key
3. 选择总结模板（默认 / 自定义）
4. 生成总结

### 4.2 进阶用法

**导入已有音频文件：**

Meetily 支持导入已有音频文件进行转录和增强：

1. 点击主界面"导入"按钮
2. 选择音频文件（支持 MP3、WAV、M4A 等格式）
3. 选择转录模型和语言
4. 开始转录

**自定义 OpenAI 兼容端点：**

对于企业用户，可以使用自建的 AI 基础设施：

1. 进入"设置 > AI 提供商"
2. 选择"自定义 OpenAI 端点"
3. 填入端点 URL 和 API Key
4. 保存设置

**GPU 加速：**

Meetily 在构建时自动检测并启用 GPU 加速：

- **macOS**：使用 Metal 和 CoreML 框架
- **Windows/Linux**：使用 CUDA（NVIDIA）或 Vulkan（AMD/Intel）

无需额外配置，开箱即用。

### 4.3 实际项目示例

**场景：企业董事会会议记录**

某金融企业董事会会议，讨论内容涉及敏感战略决策，不能使用云端会议工具。

**解决方案：**

1. 会前：在会议室电脑上安装 Meetily（macOS 版）
2. 会中：启动 Meetily，选择"会议室麦克风"音频源
3. 实时：所有董事发言被实时转录并显示在屏幕上
4. 会后：使用本地 Ollama 模型生成会议总结
5. 归档：将转录文本和总结导出为 PDF，存入企业文档管理系统

**效果：**

- 数据完全留在企业内部，符合合规要求
- 实时转录让与会者专注于讨论，无需分心记录
- AI 总结自动提取关键决策和行动项

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：macOS 上无法打开 Meetily，提示"无法验证开发者"

**解决方案**：

1. 打开"系统设置 > 隐私与安全性"
2. 滚动到下方，找到"已阻止使用 Meetily"的提示
3. 点击"仍要打开"，输入系统密码确认

**问题**：Linux 编译失败，提示缺少依赖

**解决方案**：

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev

# Fedora
sudo dnf install webkit2gtk4.0-devel gtk3-devel libappindicator3-devel
```

### 5.2 运行时错误

**问题**：转录速度慢，实时性不足

**解决方案**：

1. 检查是否启用了 GPU 加速（设置 > 关于）
2. 切换到更小的模型（如 Whisper Tiny 而非 Large）
3. 关闭其他占用 GPU 资源的应用

**问题**：AI 总结生成失败

**解决方案**：

1. 检查 API Key 是否正确（云端提供商）
2. 检查 Ollama 是否正常运行：`ollama list`
3. 查看日志（设置 > 高级 > 打开日志目录）

### 5.3 性能问题

**问题**：长时间会议后应用变卡

**解决方案**：

1. 定期清理旧记录（设置 > 存储 > 清理旧记录）
2. 将转录结果导出后删除（减少数据库大小）
3. 升级到更快的存储设备（SSD）

**问题**：GPU 内存不足

**解决方案**：

1. 使用量化版本的模型（如 Whisper Quantized）
2. 减少同时运行的 GPU 应用
3. 切换到 CPU 模式（设置 > 高级 > 强制 CPU 推理）

### 5.4 兼容性问题

**问题**：某些视频会议软件无法捕获系统音频

**解决方案**：

1. macOS：安装 [BlackHole](https://github.com/ExistentialAudio/BlackHole) 虚拟音频驱动
2. Windows：使用 [VB-Cable](https://vb-audio.com/Cable/) 虚拟音频设备
3. 在 Meetily 中选择虚拟驱动作为系统音频源

## 六、总结

Meetily 在隐私和便利之间找到了一个极佳的平衡点。它没有完全拒绝 AI 的能力，而是将 AI 放在用户自己掌控的环境中运行。对于那些"数据不能出公司"的场景，Meetily 是目前开源社区中少有的成熟方案。

**项目亮点：**

- 技术架构先进（Tauri + Rust + Next.js）
- 真正的数据主权（100% 本地处理）
- 灵活的部署选项（本地 AI / 云端 AI 按需选择）
- 活跃的开源社区和持续的版本迭代

**适用人群：**

- 对数据隐私有严格要求的企业和专业人士
- 希望使用 AI 助手但不信任云服务的用户
- 开源爱好者和技术极客

如果你正在寻找一款既能享受 AI 便利又能保证数据隐私的会议助手，Meetily 绝对值得一试。

- GitHub 仓库：https://github.com/Zackriya-Solutions/meetily
- 官方网站：https://meetily.ai
- 社区版完全免费且开源（MIT 协议）
