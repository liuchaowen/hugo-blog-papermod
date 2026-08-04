---
title: "Codex QQ Skin：将 ChatGPT/Codex 桌面端变成复古 QQ 界面"
date: "2026-08-04"
description: "Codex QQ Skin 是一款面向 Codex/ChatGPT 桌面端的主题美化工具，支持 macOS 与 Windows，可一键将 AI 对话界面替换为经典的 QQ 2007 复古风格皮肤，同时内置深度皮肤助手、图片生成、自定义皮肤库与成长统计等丰富功能。"
author: "Cheman"
slug: codex-qq-skin
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "AI工具", "桌面端", "主题美化", "Codex", "ChatGPT"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Codex QQ Skin**，一句话描述项目核心价值——它是一款面向 Codex/ChatGPT 桌面端的主题美化工具，可以将 AI 对话界面替换为经典的 QQ 2007 复古风格皮肤，同时提供深度皮肤助手、图片生成与成长统计等丰富功能。

## 一、项目概述

Codex QQ Skin（最新版本 2.6.3）由开发者 [zhulin025](https://github.com/zhulin025/Codex-QQ-Skin) 创建，是一套面向 Codex/ChatGPT 桌面端的皮肤生成与管理系统。它不仅支持 macOS 和 Windows 双平台，还提供了多种皮肤模式和强大的自定义能力。

**核心功能一览：**

- **三模式皮肤切换**：原生（恢复官方界面）、QQ 复古（经典蓝银 QQ 2007 外框）、自定义（上传任意图片自动生成配色方案）
- **内置预设皮肤**：大黄蜂 · Cybertron、霓虹雨夜 · Storm Codex 等深度预设随安装器打包
- **深度皮肤助手**：输入一句主题关键词（如"钢铁侠主题"），自动生成两张参考图、背景、透明分层素材，创建 `.codexskin` 文件，安装并验证真实 Codex 界面效果
- **成长中心**：右侧面板实时显示本机 Codex token 统计（今日、近 7 天、历史累计、七日趋势），按活跃天数与 token 档位计算成长值，以 QQ 经典的星星、月亮、太阳、皇冠显示等级
- **项目盲盒**：Codex 伙伴可打开 GitHub 热门项目盲盒，连续发现 5 个项目解锁房间摆件
- **任务提示音**：完成时播放"咳嗽"声，授权时播放"滴滴"声，本地合成，不上传网络

> **安全声明**：本项目不会修改官方 `.app`、`app.asar`、代码签名、API Key 或 Base URL。仅通过监听 `127.0.0.1` 的 Chromium DevTools Protocol 注入样式，数据完全本地化。

## 二、技术原理

### 2.1 架构设计

Codex QQ Skin 采用"运行层 + 注入层"双层架构：

- **运行层**：macOS 使用 Shell/Swift 脚本，Windows 使用 PowerShell，负责任务调度、文件管理与窗口控制
- **注入层**：通过 CDP（Chromium DevTools Protocol）向 Codex renderer 注入 CSS 样式、透明外框 SVG 和非交互装饰元素

关键源码结构：

```text
assets/      外框、企鹅、CSS 与 renderer 注入代码
presets/     经典 Codex QQ、大黄蜂、霓虹雨夜等内置预设
scripts/     安装、启动、验证、换图、暂停和恢复脚本
skills/      可由安装器一键安装的 Codex 深度皮肤助手
menubar/     可选 SwiftBar 菜单插件
tests/       macOS 自动化回归测试
```

### 2.2 CDP 注入机制

项目通过监听本地 loopback 地址（`127.0.0.1`）的 CDP WebSocket 连接，将皮肤样式注入到 Codex renderer 进程。注入内容完全为 CSS 和静态 SVG，不涉及 DOM 交互逻辑：

```json
// theme.json 中的音效配置示例
"sound": {
  "enabled": true,
  "volume": 0.48,
  "completed": "cough",
  "approval": "alert",
  "online": "knock"
}
```

所有提示音使用 Web Audio API 在本地实时合成，咳嗽声来源为耳聆网页面标注为 CC0 的"QQ系统消息提示音"，无需网络请求。

### 2.3 图片主题自动生成

当用户上传自定义背景图时，项目在本地完成以下分析：

1. **主色提取**：分析图片主体色彩分布
2. **明暗判断**：确定浅色/深色主题基调
3. **视觉焦点**：检测图片中最吸引注意力的区域
4. **安全留白**：计算文字可读区域
5. **背景构图**：适配 Codex 的新建任务页布局
6. **任务页模式**：人物照片优先完整显示，超宽画面按焦点和安全区铺满

整个过程在本地完成，图片不会上传到网络。

### 2.4 Windows 原生安装器

Windows 版本由 GitHub Actions（`windows-2022`）或本地 PowerShell 构建，生成 `.exe` 安装器。安装器已内置运行引擎与 Node.js，用户无需预先安装任何依赖。安装过程通过 PowerShell 脚本调用 CDP 接口，不修改 ChatGPT/Codex 官方安装目录。

```powershell
# Windows 构建脚本入口
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/build-gui-installer.ps1
```

## 三、安装与快速开始

### 3.1 系统要求

- **macOS**：Apple Silicon 或 Intel，已安装官方 Codex/ChatGPT 桌面端（至少成功启动过一次），建议窗口宽度不小于 `1180px` 以完整显示三栏布局
- **Windows**：从 [GitHub Releases](https://github.com/zhulin025/Codex-QQ-Skin/releases) 下载 `ChatGPT QQ Skin Setup 2.6.3.exe`，首次运行可能出现 Windows SmartScreen 提示（请只从本仓库官方 Release 下载并核对 SHA-256）
- **注意**：项目不要求单独安装 Node.js，运行时自动使用 Codex 应用内签名的 Node.js

### 3.2 macOS 安装方式

**方式一：APP 一键安装（推荐普通用户）**

1. 前往 [GitHub Releases](https://github.com/zhulin025/Codex-QQ-Skin/releases)，下载 `Codex QQ Skin.app.zip`
2. 解压后将 **Codex QQ Skin.app** 拖入"应用程序"文件夹
3. 双击打开 APP，点击"一键安装并启动"
4. 以后直接双击 APP 即可启动皮肤版 Codex

> 如果 macOS 提示"无法验证开发者"：打开"系统设置 → 隐私与安全性"，在安全提示处点击"仍要打开"并完成身份验证

**方式二：终端命令安装**

```bash
# 下载解压后
cd ~/Downloads/Codex-QQ-Skin
xattr -dr com.apple.quarantine .
chmod +x ./*.command scripts/*.sh
./scripts/install-qq-skin-macos.sh
```

### 3.3 Windows 安装

1. 从 [GitHub Releases](https://github.com/zhulin025/Codex-QQ-Skin/releases) 下载 `ChatGPT QQ Skin Setup 2.6.3.exe`
2. 双击运行，点击"一键安装并启动"
3. 点击"应用内置大黄蜂皮肤"或"应用内置霓虹雨夜皮肤"即可切换

### 3.4 最简运行示例

安装完成后，使用以下命令管理皮肤：

```bash
# macOS 启动 QQ 皮肤
./scripts/start-qq-skin-macos.sh

# macOS 验证安装结果
./scripts/doctor-macos.sh --require-live

# macOS 暂停皮肤
./scripts/pause-qq-skin-macos.sh

# macOS 恢复官方外观
./scripts/restore-qq-skin-macos.sh --restore-base-theme --restart-codex

# 上传自定义背景图（macOS）
./scripts/load-image-theme-macos.sh --file /绝对路径/你的图片.png \
  --appearance light \
  --safe-area center \
  --task-mode off
```

## 四、使用方法与进阶技巧

### 4.1 三模式切换

安装后在 Codex 右上角看到三个切换选项：

- **原生**：恢复官方 Codex 界面与颜色，不受任何皮肤影响
- **QQ**：固定的蓝银 QQ 2007 外框，包含企鹅头像、左侧栏、三栏布局、右侧摘要托盘和 Codex 伙伴
- **自定义**：基于用户上传的图片自动生成配色与布局，每次上传后立即应用

三种模式切换时会完整重建目标模式的布局、颜色和装饰，不会遗留上一套皮肤的侧栏颜色或面板状态。

### 4.2 深度皮肤助手

在 macOS App 或 Windows 安装器中找到"Codex 深度皮肤助手"区域（即使 Skill 已安装也会显示"已安装"）。安装或确认状态后，在 Codex 中直接输入：

```
用 Codex 深度皮肤助手生成一个钢铁侠主题皮肤
```

系统会自动生成两张内部参考图、背景与透明分层素材，然后创建 `.codexskin`、安装、应用并验证真实 Codex 界面效果。用户也可以说"先看方案""不要应用"或"保留但不要切换"来控制流程。

### 4.3 成长中心与等级系统

点击右上角"资料"可恢复 Codex 原生输出/来源面板，再点"成长统计"即可返回成长中心界面：

- 等级由活跃天数和每日总 token 档位共同计算，以星星→月亮→太阳→皇冠显示
- 统计直接读取本机 `~/.codex/sessions` 与 `archived_sessions`，使用增量缓存
- 不需要额外账号，不读取 API Key，不上传 prompt 或 token 数据
- 等级行右侧可开启"净用量"开关，查看排除缓存后的数据

### 4.4 GitHub 项目盲盒

在 Codex 伙伴卡中点击书架，机器人先抽书，再随机展示热门 GitHub 项目的名称与中文简介。支持：

- 收藏（保存到本地）
- 打开 GitHub 仓库页面
- 换一本（减少同类推荐）
- 连续发现 5 个项目解锁一件房间摆件

盲盒数据每 6 小时从 GitHub 公共搜索结果缓存一次，项目简介自动翻译为中文，翻译失败时使用中文兜底。

## 五、常见问题与解决方案

**Q1：Windows 提示 SmartScreen 安全警告？**
A：当前 EXE 未进行商业代码签名，首次运行可能出现 Windows SmartScreen 提示。请只从本项目 GitHub 官方 Release 下载并核对 SHA-256 值，然后点击"仍要运行"。

**Q2：macOS 提示"无法验证开发者"无法打开 APP？**
A：这是因为 APP 未使用 Apple Developer ID 公证。打开"系统设置 → 隐私与安全性"，找到关于 `Codex QQ Skin.app` 的提示，点击"仍要打开"并完成身份验证，只需操作一次。

**Q3：安装后 Codex 界面显示异常或空白？**
A：运行 `./scripts/doctor-macos.sh --require-live` 验证注入结果，检查签名、运行时、CDP 连接状态和截图是否正常。Windows 用户可在安装器中点击"验证安装"。

**Q4：自定义皮肤图片上传后文字不可读？**
A：项目会自动对图片做模糊与淡遮罩处理保证文字可读性。如果仍有问题，可在上传时指定 `--safe-area center` 调整安全留白区域，或使用 `--task-mode off` 关闭任务页特殊处理。

**Q5：提示音无法播放？**
A：首次使用时需要在 Codex 窗口内点击或按键一次，以满足 Chromium 的音频播放规则。也可在右侧伙伴卡中点击"🔊 提示音"一键静音。

**Q6：如何彻底恢复官方外观？**
A：macOS 运行 `./scripts/restore-qq-skin-macos.sh --restore-base-theme --restart-codex`，Windows 在安装器中点击"恢复官方外观"。恢复脚本会停止 CDP watcher、移除注入并恢复保存的外观配置。

**Q7：提示"Codex 未运行"或 CDP 连接失败？**
A：确保 Codex/ChatGPT 桌面端已完全启动并处于活跃状态。安装前需至少成功运行 Codex 一次，项目不修改官方安装目录。

## 六、总结

Codex QQ Skin 是一个将 AI 工具与情怀结合得恰到好处的开源项目。它通过 CDP 注入机制在不影响官方功能的前提下，为 Codex/ChatGPT 桌面端注入了 QQ 2007 时代的复古灵魂——三栏布局、企鹅头像、在线状态、星星月亮等级系统——每一个细节都精准复刻了那个年代的视觉记忆，同时保持了现代 AI 工具的完整功能性。

如果你是一个怀旧党，或者想让每天面对的 AI 对话界面多一点趣味和温度，Codex QQ Skin 值得一试。尤其是其深度皮肤助手，只需一句话就能生成一张完整的主题皮肤，将 AI 的创造力直接转化为桌面美学——这个设计思路本身就很 AI。
