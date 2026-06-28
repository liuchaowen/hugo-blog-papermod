---
title: "FluidVoice：开源 macOS 语音转文字应用，本地 AI 加持的终极听写工具"
date: 2026-06-29
description: "FluidVoice 是一款开源的 macOS 语音转文字听写应用，支持多种语音识别模型（Nemotron、Parakeet、Whisper 等），并内置 Fluid Intelligence 本地 AI 引擎，实现智能格式化、上下文感知大小写转换和后处理，所有数据均在本地运行，无需担心隐私泄露。"
author: "Cheman"
slug: fluidvoice
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, macOS, AI, 语音识别, 效率工具]
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

今天在 GitHub Trending 上看到一个有意思的项目：**FluidVoice**，这是一款开源的 macOS 语音转文字听写应用，最吸引我的是它内置的 Fluid Intelligence 本地 AI 引擎——所有数据处理都在本地完成，无需联网，既保护隐私又能大幅提升听写体验。

## 一、项目概述

FluidVoice 是一款面向 macOS 用户的开源语音转文字（Speech-to-Text）应用，采用 GPLv3 许可证发布。它的核心价值在于：

- **多模型支持**：集成 Nemotron Speech 3.5、Parakeet Flash、Parakeet TDT v3/v2、Cohere Transcribe、Apple Speech 和 Whisper 等多种语音识别模型，用户可根据语言和延迟需求自由选择。
- **Fluid Intelligence**：独立的本地 AI 运行时，提供智能格式化、上下文感知大小写转换和后处理功能，所有计算均在 Mac 本地完成。
- **双模式操作**：Command Mode（命令模式）可通过语音控制 Mac（启动应用、运行快捷指令等）；Write Mode（写入模式）可在任意应用的文本框中直接听写或重写选中文本。
- **实时预览**：支持 Notch 周边自适应转录叠加层，说话时即可看到文字实时出现。

项目使用 Swift + SwiftUI 构建，依赖 Swift Package Manager 管理第三方库，最低支持 macOS 15.0（Sequoia）。

## 二、技术原理

### 2.1 架构设计

从 `Package.swift` 可以看出，FluidVoice 采用模块化架构，核心依赖包括：

| 依赖库 | 用途 |
|--------|------|
| `FluidAudio` | 音频采集与处理（自主维护库） |
| `SwiftWhisper` | Whisper 模型推理封装 |
| `DynamicNotchKit` | Notch 周边动态叠加层适配 |
| `PromiseKit` | 异步编程 Promise 封装 |
| `AppUpdater` | 自动更新机制 |
| `posthog-ios` | 匿名 analytics（可选） |

整体架构分为四层：

1. **音频采集层**：通过 AVAudioEngine 实时采集麦克风输入，支持采样率配置和音频缓冲区管理。
2. **语音识别层**：根据用户的模型选择，动态加载对应的 ASR（Automatic Speech Recognition）引擎。Nemotron 和 Parakeet 系列基于 CoreML 推理，Whisper 使用 GGML 格式模型。
3. **AI 增强层（Fluid Intelligence）**：本地运行的 AI 模型，对原始转录结果进行后处理，包括：
   - 智能标点恢复
   - 上下文感知的大小写转换（如"iphone"→"iPhone"）
   - 电子邮件模板识别与格式化
   - 数字、日期、连字符的智能处理
4. **输入注入层**：通过 macOS Accessibility API 将识别结果直接注入到前端应用的文本输入框中，实现跨应用的无缝听写。

### 2.2 核心技术栈与选型理由

- **Swift + SwiftUI**：原生 macOS 开发技术栈，性能最优，能够充分利用 Apple Silicon 的 Neural Engine。
- **CoreML**：苹果官方机器学习框架，支持硬件加速，适合本地 ASR 模型推理。
- **Accessibility API**：macOS 辅助功能接口，允许应用向其他应用的文本输入框注入内容，是实现全局听写的关键。
- **GGML / ONNX**：Whisper 和 Parakeet 模型的推理格式，兼顾推理速度和内存占用。

### 2.3 关键算法与设计模式

FluidVoice 的核心算法集中在语音端点的检测（Endpoint Detection）和实时流式推理：

- **流式转录**：Parakeet Flash 模型支持流式输入，将音频分块发送至 ASR 引擎，实现"说完即见"的低延迟体验。
- **Voice Activity Detection (VAD)**：内置 VAD 算法，自动检测用户是否停止说话，触发转录结果的提交。
- **AI 后处理的 Prompt 工程**：Fluid Intelligence 使用本地 LLM（大语言模型），通过精心设计的 Prompt 模板，实现不同场景下的文本增强。例如，邮件场景会自动添加称呼、落款，代码场景会保留缩进和语法。

## 三、安装与快速开始

### 3.1 环境要求

- macOS 15.0（Sequoia）或更高版本
- Apple Silicon Mac（推荐，所有模型均支持）
- Intel Mac（仅支持 Whisper 模型，从 v1.5.1 开始支持）
- 约 1 GB 磁盘空间（用于语音模型）
- 约 3.5 GB 磁盘空间（用于 Fluid Intelligence 模型，可选）

### 3.2 安装步骤

**方式一：Homebrew（推荐）**

```bash
brew install --cask fluidvoice
```

**方式二：手动下载**

前往 [GitHub Releases](https://github.com/altic-dev/FluidVoice/releases/latest) 页面下载最新的 `.dmg` 安装包。

### 3.3 初始配置

1. **授予权限**：首次启动会请求麦克风和辅助功能权限，两者均为必需（前者用于收音，后者用于向其他应用注入文本）。
2. **设置全局热键**：在设置中选择一个全局热键，用于从任意应用快速触发听写。
3. **完成引导**：引导流程会帮助你选择语音模型（根据语言需求和延迟敏感度），并可选择下载 Fluid Intelligence 本地 AI 模型。
4. **（可选）配置自定义 AI 提供商**：如果希望使用云端 AI 增强，可在设置中添加 OpenAI、Groq 或自定义 API Key（密钥存储在 macOS Keychain 中）。

### 3.4 最简运行示例

按下全局热键 → 开始说话 → 再次按下热键（或自动检测语音结束）→ 文字自动注入到当前文本框。

## 四、使用方法与实战

### 4.1 基础用法

- **听写文本**：在任意文本框中按下热键，说话，文字实时出现。
- **重写选中文本**：选中一段文字，按下热键，说出重写指令（如"改成更正式的语气"），Fluid Intelligence 会自动处理。
- **切换模型**：在工具栏中快速切换语音模型，适应不同语言和场景。

### 4.2 进阶用法

- **Command Mode（命令模式）**：通过语音启动应用、运行快捷指令、触发系统操作。例如说"打开 Safari"或"运行我的晨间快捷指令"。
- **Per-App 配置**：为不同应用配置不同的 Prompt 集合。例如，在邮件应用中自动启用"邮件格式化"Prompt，在代码编辑器中使用"代码友好"Prompt。
- **音频历史记录**：可选开启本地音频历史记录，所有听写会话均保存在本地，支持 ZIP 导出回顾。

### 4.3 实际项目示例

**场景一：撰写英文邮件**

1. 在邮件客户端中按下热键。
2. 说出："Dear John, I hope this email finds you well. I'm writing to confirm our meeting scheduled for next Tuesday at 2 PM. Please let me know if the time works for you."
3. Fluid Intelligence 自动添加标点、格式化段落，并注入到邮件正文。

**场景二：代码注释听写**

1. 在 Xcode 中按下热键。
2. 说出："Function to load user preferences from JSON file, returns dictionary or empty if file not found."
3. 文字直接注入到代码注释位置，无需手动输入。

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：Homebrew 安装时提示"cask not found"。

**解决方案**：先运行 `brew update`，然后再次尝试安装。如果问题依旧，可以从 GitHub Releases 手动下载。

### 5.2 运行时错误

**问题**：按下热键后无反应。

**可能原因**：
- 未授予辅助功能权限。前往"系统设置 → 隐私与安全性 → 辅助功能"，确保 FluidVoice 已勾选。
- 热键冲突。前往设置，更换一个未被占用的全局热键。

**问题**：转录结果不准确。

**解决方案**：
- 检查麦克风输入质量，确保环境安静。
- 尝试切换到更大的模型（如 Whisper Medium），虽然延迟稍高，但准确率更好。
- 启用 Fluid Intelligence，本地 AI 会显著改善格式化效果。

### 5.3 性能问题

**问题**：使用某些模型时 CPU 占用过高。

**解决方案**：
- 优先使用 Apple Silicon 优化的模型（Nemotron、Parakeet 系列），它们利用 Neural Engine 加速，CPU 占用极低。
- 关闭不需要的功能（如音频历史记录）以节省资源。

### 5.4 兼容性问题

**问题**：在某些应用中无法注入文字。

**解决方案**：
- 确保目标应用已授予辅助功能权限。
- 部分应用（如某些游戏）可能不支持辅助功能 API，属于正常情况。

## 六、总结

FluidVoice 是一款技术扎实、体验优秀的开源 macOS 听写应用。它的亮点在于：

1. **真正本地化**：Fluid Intelligence 让 AI 增强不再依赖云端，保护用户隐私的同时降低延迟。
2. **模型选择丰富**：从零下载的 Apple Speech 到高精度的 Whisper Large，覆盖不同需求和硬件配置。
3. **双模式创新**：Command Mode 和 Write Mode 的组合，让语音交互从"输入文字"扩展到"控制电脑"。
4. **开源可持续**：GPLv3 许可证保障代码透明，社区驱动的开发模式让项目持续迭代。

如果你是高频率文字输入用户（程序员、作家、客服等），或者希望提升 macOS 无障碍体验，FluidVoice 绝对值得一试。项目在 GitHub 上保持活跃开发，Star 数也在快速增长，未来有望成为 macOS 平台最佳开源听写工具。

**项目地址**：https://github.com/altic-dev/FluidVoice

**安装命令**：

```bash
brew install --cask fluidvoice
```
