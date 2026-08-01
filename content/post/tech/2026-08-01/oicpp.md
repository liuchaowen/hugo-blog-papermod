---
title: "OICPP IDE：一款专为信息学竞赛打造的轻量级 IDE"
date: "2026-08-01"
description: "OICPP IDE 是一款基于 Electron + Monaco Editor 构建的竞赛编程集成开发环境，内置代码编辑、调试、对拍、云编译、云空间等专为 OI/ACM 选手设计的功能，支持 Codeforces、AtCoder、Luogu 等主流竞赛平台的样例一键抓取。"
author: "Cheman"
slug: oicpp
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "Electron", "Monaco Editor", "信息学竞赛", "IDE"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**OICPP IDE**，一款专为信息学竞赛（OI/ACM）选手打造的轻量级集成开发环境，基于 Electron + Monaco Editor 构建，瞄准了"退役 OIer 对编程工具的热爱"这个细分需求。

## 一、项目概述

OICPP IDE 起源于一位退役高中 OIer 对信息学竞赛工具的深度思考。开发团队实地采访了现役 OI 选手（Genius_Star、__Cby___、水星湖等），提炼出竞赛编程中真正的高频痛点，并围绕这些痛点打造了整套功能闭环。

**核心功能矩阵：**

- **代码编辑与运行**：基于 Monaco Editor（VS Code 同款），支持语法高亮、代码补全、多标签页
- **一键下载编译器 & testlib**：自动配置 GCC/Clang 工具链，无需手动折腾环境
- **样例测试器**：支持文件大样例批量测试，输入输出比对一目了然
- **代码对拍器**：差异高亮 + 数据导出，快速验证算法正确性
- **调试功能**：内置调试支持，断点、变量监视一应俱全
- **平台样例抓取**：通过浏览器插件自动抓取 Codeforces、AtCoder、Luogu、He Tao 的样例数据
- **云编译**：一键测试代码在 Linux 环境下的编译是否通过
- **云空间**：多设备间同步代码，项目随时随地可继续
- **内置终端 + PDF 阅读器 + Markdown 侧边预览**
- **深浅主题切换 + 自定义背景图片 + 窗口透明度调节**

技术栈方面，项目使用 **Electron 37+** + **Node.js 20+** + **Monaco Editor 0.52+**，构建工具为 **electron-builder**，支持 Windows（NSIS）、macOS、Linux（deb/rpm/AppImage）全平台打包。

## 二、技术原理

### 2.1 整体架构

OICPP IDE 采用经典的 Electron 多进程架构：

```
┌─────────────────────────────────────────────┐
│              Main Process                    │
│  (src/main.js — 窗口管理、系统交互、node-pty) │
└──────────────┬──────────────────────────────┘
               │ IPC
┌──────────────▼──────────────────────────────┐
│            Renderer Process                  │
│  (Monaco Editor + React-like UI + Xterm.js)  │
└─────────────────────────────────────────────┘
```

核心依赖解析：

```json
// package.json 关键依赖
{
  "dependencies": {
    "monaco-editor": "^0.52.2",        // 代码编辑器核心
    "node-pty": "^1.0.0",              // 跨平台终端模拟器（Go 实现）
    "xterm": "^5.3.0",                 // 终端前端组件
    "pdfjs-dist": "5.0.375",           // PDF 渲染（内置 PDF 阅读器）
    "markdown-it": "^14.1.0",          // Markdown 渲染
    "@iktakahiro/markdown-it-katex": "^4.0.1", // LaTeX 公式支持
    "axios": "latest",                 // 网络请求（样例抓取）
    "sharp": "^0.33.5",                // 图片处理（图标生成）
    "node-stream-zip": "^1.15.0"       // ZIP 解压（安装包处理）
  },
  "devDependencies": {
    "electron": "^37.2.0",
    "electron-builder": "^26.0.0",
    "webpack": "^5.101.0",             // 打包 Monaco Editor 资源
    "monaco-editor-webpack-plugin": "^7.1.0"
  }
}
```

### 2.2 竞赛编程专用功能实现

**样例抓取机制**：通过 Electron 内置浏览器加载 Codeforces/Luogu 等平台页面，注入内容脚本提取题目描述和样例数据，然后通过 IPC 传回渲染进程，直接填入测试面板。这是典型的"浏览器自动化 + IPC 通信"模式。

**对拍器原理**：利用 `node-pty` 启动两个编译后的可执行文件，用随机生成器（或指定数据）分别喂入，比较输出差异，高亮显示不一致的位置。核心是一个典型的 diff 比对逻辑：

```javascript
// 对拍器核心逻辑（示意）
const runProgram = (exePath, input) => {
  return new Promise((resolve, reject) => {
    pty.write(input + '\n');
    pty.onData(data => resolve(data));
  });
};

const compare = (out1, out2) => {
  const lines1 = out1.trim().split('\n');
  const lines2 = out2.trim().split('\n');
  for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
    if (lines1[i] !== lines2[i]) {
      return { equal: false, line: i, a: lines1[i], b: lines2[i] };
    }
  }
  return { equal: true };
};
```

**云编译**：通过 HTTP 请求将源代码 POST 到编译服务器，服务器在 Linux 容器中执行编译并返回结果，客户端展示编译日志。这一步解决了 Windows 用户在本地编译通过但 Linux 下 CE（Compile Error）的问题。

### 2.3 构建与打包

Electron 应用的构建链路：

```bash
npm run build
# 等价于：
# npm run prebuild:buildinfo      → 生成版本信息
# npm run prebuild:icons          → 生成多尺寸图标（sharp 处理 PNG）
# npm run prebuild:clangd         → 下载 clangd 语言服务器（代码补全后端）
# electron-builder                → 打包为各平台安装包
```

各平台的 clangd（代码补全引擎）通过 `scripts/download-clangd.js` 按平台独立下载，放入 `build/clangd/{platform}` 目录，最终打包到 `extraResources` 中。

## 三、安装与快速开始

### 3.1 下载安装

**方式一：从官网下载（推荐）**

访问 [oicpp.mywwzh.top](https://oicpp.mywwzh.top) 下载最新版本的安装包，对应你的操作系统。

**方式二：从 GitHub Release 下载**

进入 [Releases 页面](https://github.com/mywwzh/oicpp/releases) 下载 `.exe`（Windows）或 `.dmg`（macOS）安装包。

**方式三：源码编译**

```bash
git clone https://github.com/mywwzh/oicpp.git
cd oicpp
npm install
npm run build      # 需要 Node.js 20+，Windows 需额外安装 Python 3
```

### 3.2 初始配置

首次启动后，OICPP 会自动检测编译器环境。若未检测到，点击菜单 **工具 → 下载编译器**，程序会自动下载 GCC 并配置到 PATH 中。

## 四、使用方法与实战

### 4.1 基础使用：完成一道 Codeforces 题目

1. 打开 OICPP IDE，新建文件（`Ctrl+N`）
2. 点击右侧 **平台样例** 面板，选择 Codeforces，输入题目链接
3. 程序自动抓取题目描述和样例，填入测试面板
4. 在 Monaco Editor 中编写代码，保存为 `solution.cpp`
5. 点击 **▶ 运行**，查看所有样例的输出结果
6. 点击 **提交**，程序将代码复制到剪贴板，跳转到 Codeforces 提交页面

### 4.2 对拍验证算法正确性

```bash
# 在 OICPP IDE 中：
# 1. 编写暴力解法（solution_brute.cpp），保存
# 2. 编写正解（solution.cpp），保存
# 3. 打开对拍器，加载两个文件
# 4. 设置测试数据范围（随机数据生成器）
# 5. 点击"开始对拍"，程序自动运行并比对
```

对拍器会自动记录每次比对结果，发现不匹配时会暂停并高亮差异行，帮助你快速定位 bug。

### 4.3 深色主题 + 自定义背景

OICPP 支持完整的深色主题，并提供代码编辑器背景图片自定义和窗口透明度调节功能。进入 **设置 → 外观**，即可调整主题、背景图和透明度，适合长时间训练时保护视力。

## 五、常见问题与解决方案

**Q1：首次启动提示"编译器未找到"？**

A：OICPP 需要本地安装 GCC 或 Clang。进入 **工具 → 下载编译器**，程序会自动下载 MinGW-w64（Windows）或提示安装 Xcode Command Line Tools（macOS）。Linux 用户确保系统已安装 `g++`。

**Q2：代码补全不工作？**

A：检查是否成功下载了 clangd。进入 **工具 → 下载 clangd**，程序会自动为当前平台下载对应版本。clangd 下载完成后重启 IDE。

**Q3：云编译显示连接失败？**

A：云编译依赖网络连接。检查防火墙/代理设置，确保可以访问 `oicpp.mywwzh.top`。如果在内网环境中，可考虑自建编译服务器（项目提供了编译接口文档）。

**Q4：对拍器提示"程序崩溃"？**

A：检查代码中是否存在段错误（空指针访问、数组越界等），可在对拍器中开启 **启用调试模式**，程序崩溃时会自动进入调试界面定位问题。

**Q5：macOS 版本无法打开，提示"已损坏"？**

A：这是 macOS 对未签名应用的限制。进入 **系统设置 → 隐私与安全性**，找到 OICPP IDE 的安全提示，点击"仍要打开"。或执行：`xattr -d com.apple.quarantine /Applications/OICPP\ IDE.app`

## 六、总结

OICPP IDE 是一款定位非常清晰的产品——不做通用 IDE，而是聚焦信息学竞赛选手的真实工作流：写代码 → 调试 → 测样例 → 对拍 → 提交，每个环节都打磨到位。基于 Electron + Monaco Editor 的技术选型保证了跨平台能力和开发效率，而内置浏览器插件抓取样例、云编译绕过系统差异等设计则体现了对竞赛场景的深度理解。

如果你是一名 OI/ACM 选手，或者正在准备 CSP/NOIP 等国内信奥比赛，OICPP IDE 值得一试。官网：[https://oicpp.mywwzh.top](https://oicpp.mywwzh.top)，GitHub：[https://github.com/mywwzh/oicpp](https://github.com/mywwzh/oicpp)。
