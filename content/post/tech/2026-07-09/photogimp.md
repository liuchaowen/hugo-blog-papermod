---
title: "PhotoGIMP：把 GIMP 武装成你熟悉的 Photoshop 工作流"
date: 2026-07-09
description: "PhotoGIMP 是一个面向 GIMP 3.0+ 的社区补丁，通过替换配置文件把免费开源的 GIMP 改造成贴近 Adobe Photoshop 的界面布局、快捷键与默认面板，帮助从 PS 迁移的用户零成本上手。"
author: "Cheman"
slug: photogimp
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, GIMP, Photoshop, 设计工具]
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

今天在 GitHub Trending 上看到一个非常实用的项目：**PhotoGIMP**。它不是一个新的图像编辑器，而是一个轻量补丁——把免费开源的 GIMP 改造成你熟悉的 Photoshop 操作体验。

## 一、项目概述

PhotoGIMP 由 Diolinux 维护，本质上是一套针对 GIMP 3.0+ 的**配置覆盖文件**。GIMP 本身是功能强大、跨平台（Linux / macOS / Windows）的免费图像编辑器，能完成照片精修、图像合成、平面设计等绝大多数 Photoshop 能做的事。但它默认的工具布局、面板排布和快捷键与 Photoshop 差异明显，是很多设计师迁移时的心理门槛。

PhotoGIMP 的目标很简单：**让刚刚从 Photoshop 转投 GIMP 的用户一打开就有「回家」的感觉**。它不修改 GIMP 的源码、不增加新功能，只通过替换用户级配置文件，实现以下核心特性：

- **Photoshop 风格的工具布局**：工具箱、面板的位置重新排列，贴近 Adobe Photoshop 的习惯。
- **Photoshop 快捷键映射**：键位严格参照 Adobe 官方 Windows 版默认快捷键文档。
- **自定义启动画面**：专属 PhotoGIMP Splash 图，启动更有仪式感。
- **最大化画布空间**：默认配置优化可视工作区，减少界面留白。
- **独立图标与应用名**：在 Linux 上通过 `.desktop` 文件拥有自己的图标与菜单名称，与原始 GIMP 共存。

## 二、技术原理

PhotoGIMP 的工作原理是「**用预置的用户配置覆盖 GIMP 默认配置**」。GIMP 启动时会读取用户目录下的配置目录（如 Linux 的 `~/.config/GIMP/3.0`），PhotoGIMP 把这一组精心调校的文件放进去即可生效。

补丁在 GIMP 配置目录中替换或新增的文件如下：

| 文件 / 文件夹 | 作用 |
|---|---|
| `shortcutsrc` | 键盘快捷键，映射为 Photoshop 风格 |
| `toolrc` | 工具配置与排序 |
| `sessionrc` | 窗口布局与面板位置 |
| `dockrc` | Dock / 面板组合配置 |
| `gimprc` | GIMP 通用偏好（画布、网格等） |
| `contextrc` | 当前工具 / 颜色上下文设置 |
| `splashes/` | 自定义 PhotoGIMP 启动画面 |
| `theme.css` | 少量 UI 主题微调 |
| `templaterc` | 预置画布模板 |

在 Linux 平台上，补丁还会额外安装：

- 一个自定义 `.desktop` 文件（带 PhotoGIMP 名称与图标的启动器）
- 一张自定义应用图标，位于 `~/.local/share/icons/`

从数据流角度看，整个过程是**静态配置注入**，不涉及运行时 hook，因此不会拖慢 GIMP，也不会影响你已有的个人资源（笔刷、字体、渐变、插件均保持不变）。这也解释了 FAQ 中「升级 GIMP 大版本会不兼容」的原因——GIMP 2.x 与 3.x 的配置格式差异显著，PhotoGIMP 这一版专用于 GIMP 3.0+。

## 三、安装与快速开始

### 环境要求

| 要求 | 说明 |
|---|---|
| GIMP 3.0 或更新版本 | 从 [gimp.org](https://www.gimp.org/downloads/) 或 Linux 的 [Flathub](https://flathub.org/apps/org.gimp.GIMP) 获取 |
| 先启动一次 GIMP | GIMP 需要生成配置文件，安装顺序：**装 GIMP → 打开一次 → 关闭 → 再装 PhotoGIMP** |

> ⚠️ **安装前务必备份当前 GIMP 设置**，PhotoGIMP 会覆盖配置文件。

### Linux（Flatpak）

```bash
# 备份（可选）
cp -r ~/.config/GIMP/3.0 ~/GIMP-3.0-backup

# 1. 确保已从 Flathub 安装 GIMP，并先打开一次再关闭
# 2. 下载 PhotoGIMP-linux.zip 并解压到 home 目录（~）
#    zip 内文件会写入 ~/.config 与 ~/.local（均为隐藏目录）
# 3. 提示覆盖时选择「Replace / Overwrite」
# 4. 重新打开 GIMP，即可看到新布局
```

### Windows

```powershell
# 备份（可选）：Win+R 输入 %APPDATA%\GIMP，复制 3.0 文件夹
# 1. 从官网安装 GIMP，打开一次后关闭
# 2. 下载 PhotoGIMP.zip 解压到任意目录
# 3. 复制其中的 3.0 文件夹
# 4. Win+R 输入 %APPDATA%\GIMP 并回车，粘贴 3.0 文件夹，选择「替换目标中的文件」
# 5. 重新打开 GIMP
```

Windows 用户还可用 Chocolatey 一键安装：

```powershell
choco install photogimp
```

### macOS

```bash
# 备份（可选）：Finder 中 Cmd+Shift+G 前往 ~/Library/Application Support/GIMP 并复制
# 1. 从官网安装 GIMP，打开一次后关闭
# 2. 下载 PhotoGIMP.zip 解压，复制其中的 3.0 文件夹
# 3. Cmd+Shift+G 前往 ~/Library/Application Support/GIMP 并粘贴 3.0 文件夹
# 4. 若残留 2.10 文件夹请删除，避免冲突
# 5. 重新打开 GIMP
```

## 四、使用方法与实战

装好即生效，无需额外配置。打开 GIMP 后你会立刻注意到：

- 工具箱与面板顺序更接近 Photoshop，左侧工具栏、右侧图层面板等布局符合肌肉记忆。
- 快捷键直接可用，例如移动工具、自由变换、画笔等常用操作的键位与 Photoshop Windows 版一致。
- 启动画面变为 PhotoGIMP 定制图，工作区默认最大化，画布更开阔。

**进阶用法**：PhotoGIMP 只是给你一个「起点」。你仍可以随意自定义——通过菜单 **Edit → Keyboard Shortcuts** 调整任意快捷键；通过 `templaterc` 里预置的画布模板快速新建项目。如果你想要回原始 GIMP 布局，删除配置目录即可（见下文卸载）。

实战建议：迁移项目时，先打开 PhotoGIMP，再逐步把常用的 Photoshop 动作对照成 GIMP 的对应流程（如「自由变换」对应 GIMP 的 `Shift+T` 缩放旋转），借助接近的快捷键，熟悉成本可以降到很低。

## 五、常见问题与解决方案

**装完 GIMP 界面没变化？**
最可能是文件放错了位置。Linux 下 `.config` / `.local` 必须在 home（`~`）目录且为隐藏文件夹（文件管理器按 `Ctrl+H` 显示）；Windows 下 `3.0` 必须位于 `%APPDATA%\GIMP` 内而非旁边；macOS 下 `3.0` 必须在 `~/Library/Application Support/GIMP` 内。另外务必先**关闭 GIMP** 再粘贴文件，否则 GIMP 退出时会覆盖你的设置。

**打开 GIMP 报错？**
通常是版本不匹配。本版 PhotoGIMP 仅支持 **GIMP 3.0+**，GIMP 2.x 无法兼容。删除配置目录后重装即可。

**能和 GIMP 2.10 一起用吗？**
不能。PhotoGIMP 3.0 专为 GIMP 3.x 设计，2.x 与 3.x 的配置格式差异很大。

**会删掉我的笔刷 / 字体 / 插件吗？**
不会。PhotoGIMP 只替换配置文件（快捷键、布局、偏好），个人笔刷、字体、渐变、插件均保留。

**如何更新到新版本？**
重新下载最新 release，按安装步骤再走一遍即可覆盖旧配置。

**如何卸载 / 还原？**

```bash
# Linux
rm -rf ~/.config/GIMP/3.0
# 若之前备份过则还原：
# cp -r ~/GIMP-3.0-backup ~/.config/GIMP/3.0

# Windows：Win+R 输入 %APPDATA%\GIMP，删除 3.0 文件夹
# macOS：Cmd+Shift+G 前往 ~/Library/Application Support/GIMP，删除 3.0 文件夹
```

删除后重新打开 GIMP，会自动生成全新默认配置。

## 六、总结

PhotoGIMP 用一个极简的思路——**纯配置覆盖，零代码侵入**——解决了开源图像编辑软件最大的迁移痛点：习惯。对于预算有限、想脱离 Photoshop 订阅，又不愿重新适应一套陌生界面的设计师来说，它是低门槛、高回报的过渡方案。安装只需解压覆盖配置文件，卸载更是删个文件夹的事，值得一试。
