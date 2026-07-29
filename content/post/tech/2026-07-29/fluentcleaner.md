---
title: "FluentCleaner：一款让 Windows 系统清洁工具回归初心的开源项目"
date: 2026-07-29
description: "FluentCleaner 是一款由个人开发者打造的现代 Windows 系统清洁工具，基于 WinUI 3 构建，兼容 winapp2.ini 清洁规则集，无广告、无暗模式，旨在让系统清理这件事回归纯粹和透明。"
author: "Cheman"
slug: fluentcleaner
draft: false
categories: ["技术", "Windows"]
tags: ["Windows", "开源", "工具", "WinUI3", ".NET"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**FluentCleaner**，一款现代 Windows 系统清洁工具，用 WinUI 3 打造，无广告、无暗模式、无钓鱼套路——作者甚至在 README 开头专门写了一行警告让大家别被假冒网站骗了，光是这个细节就让人对这项目多了几分好感。

## 一、项目概述

FluentCleaner 的诞生背景很清晰：CCleaner 从曾经的小而美变成了臃肿的"恐吓软件"（scareware），作者干脆自己动手，写了一个真正干净的系统清理工具。

**核心特点：**

- **双版本并行**：主版本基于 .NET 10 + Windows App SDK（WinUI 3），Classic 版本基于 .NET Framework 4.8 WinForms，前者约 140MB 自包含，后者仅 3.57MB
- **共享清洁引擎**：`FluentCleaner.Core`（netstandard2.0）封装了扫描/清理逻辑和 winapp2.ini 解析器，两个版本共用
- **winapp2.ini 兼容**：直接复用 CCleaner 社区维护了 15+ 年的清洁规则库，覆盖数千款应用，无需重新造轮子
- **隐私友好**：没有遥测、没有广告、没有虚假注册表扫描，只有真正需要清理的临时文件和缓存
- **支持国际化**：内置多语言支持，翻译者只需复制 `en-US` 资源文件并翻译 `<value>` 内容即可提 PR

```
winapp2.ini 是一个社区维护的清洁规则数据库，
告诉 FluentCleaner 具体要清理哪些临时文件夹、缓存路径和注册表项。
每一项规则都是精确指定、公开可审计的，不是"一键清理所有 temp"的粗暴逻辑。
```

## 二、技术原理

### 2.1 架构设计

项目采用典型的 Core + UI 分离架构：

```
FluentCleaner.sln
├── FluentCleaner.Core/          # 清洁引擎（netstandard2.0）
│   ├── Scanner.cs               # 扫描逻辑
│   ├── Cleaner.cs               # 清理执行
│   └── Winapp2Parser.cs         # winapp2.ini 规则解析
├── FluentCleaner/                # WinUI 3 主应用（.NET 10 + Windows App SDK）
└── FluentCleaner.Classic/       # WinForms 经典版（.NET Framework 4.8）
```

核心引擎面向 `netstandard2.0`，意味着可以被任何兼容 .NET Standard 的运行时调用。

### 2.2 winapp2.ini 解析器的实现思路

从 README 可以推断，`Winapp2Parser.cs` 的核心逻辑大致如下：

```csharp
// 读取 .ini 格式的清洁规则
public class Winapp2Parser
{
    public List<CleanEntry> Parse(string iniPath)
    {
        var entries = new List<CleanEntry>();
        foreach (var section in IniFile.ReadSections(iniPath))
        {
            if (section.StartsWith("Application"))
            {
                entries.Add(ParseEntry(section));
            }
        }
        return entries;
    }
}
```

作者在 README 中特别提到，这个解析器"出乎意料地快"——比早期 CCleaner（Piriform 时代）的实现还快。这可能归功于 .NET 运行时本身的性能提升，以及没有历史包袱的干净实现。

### 2.3 安全性设计

FluentCleaner 在安全方面的设计原则非常务实：

**不提供安全删除的原因**：SSD 使用 Wear Leveling + TRIM，控制器决定数据物理位置，软件层面的多轮覆写在 SSD 上无法保证真正擦除，且目标文件（浏览器缓存、临时文件）对法证恢复需求极低。提供 7-pass DoD 或 35-pass Gutmann 覆写属于"安全剧场"。

**不提供注册表清理的原因**：注册表项按需加载，孤立卸载项对性能影响为零，误删注册表键的代价远大于收益。Hugo 工具作者的观点："只做真正有用的功能，不做看起来很技术化但实际是安慰剂的功能"。

### 2.4 自动化与计划任务

FluentCleaner 支持完全无 UI 的自动化运行：

```powershell
# 静默清理（使用保存的选项配置）
FluentCleaner.exe /AUTO

# 清理完成后关机
FluentCleaner.exe /AUTO /SHUTDOWN
```

运行日志写入 `%AppData%\FluentCleaner\auto.log`，可通过 Windows 任务计划程序实现定时清理。

## 三、安装与快速开始

### 环境要求

| 版本 | 系统要求 | 其他依赖 |
|------|---------|---------|
| FluentCleaner（WinUI 3） | Windows 10 build 17763+ 或 Windows 11 | 需安装 [Windows App SDK 2.0.1 运行时](https://aka.ms/windowsappsdk/2.0/2.0.1/windowsappruntimeinstall-x64.exe)（一次性安装） |
| FluentCleaner Classic | 几乎所有 Windows | 无，需系统已有 .NET Framework 4.8 |

### 安装步骤

1. 访问 [GitHub Releases](https://github.com/builtbybel/FluentCleaner/releases/latest) 下载对应版本
2. WinUI 3 版：下载 `FluentCleaner-win-x64.zip` 并解压，双击 `FluentCleaner.exe` 即可
3. Classic 版：下载 `FluentCleaner-Classic-net48.zip`，解压后运行

**推荐做法**：如果追求现代 UI 体验，选择 WinUI 3 主版；如果追求轻量和便携性，选择 Classic 版——两者清洁引擎完全相同，差异仅在运行时和 UI。

### 自定义清洁数据库

FluentCleaner 不绑定单一 winapp2 数据源。进入 **Settings → Database → Custom**，可以指定任何兼容的 winapp2.ini 文件或社区变种（如 BBleachBit 的调整版）。

## 四、使用方法与实战

### 基础用法

1. 启动 FluentCleaner，应用会自动扫描可清理的项目（基于 winapp2.ini 规则）
2. 查看左侧分类（浏览器、应用、系统和日志等），勾选需要清理的项
3. 点击 **分析** 查看待清理空间大小，确认无误后点击 **运行清理**
4. 清理完成后会显示释放的空间总量

### 使用 winapp2 自定义规则

winapp2 项目维护了多个规则集 flavor，FluentCleaner 使用的是原始 CCleaner flavor：

```
官方数据库：https://github.com/MoscaDotTo/Winapp2
将仓库中的 winapp2.ini 下载后，在 FluentCleaner 中指定为 Custom 数据库即可。
```

### 自动化定时清理

适合需要定期维护系统的用户：

1. 打开 Windows 任务计划程序
2. 创建新任务，指定 `FluentCleaner.exe` 路径为程序，`/AUTO` 为参数
3. 设置触发周期（如每月一次）
4. 配合 Microsoft 官方"每月运行一次磁盘清理"的建议，保持系统健康

## 五、常见问题

### Q: FluentCleaner 会让我的电脑更快吗？

取决于具体情况。现代系统存储空间充足时，速度提升不明显。但如果硬盘快满了，Microsoft 官方明确表示这会影响 Windows Update 甚至整体性能。FluentCleaner 的价值更多在于：释放被废弃缓存占用的空间、保护隐私（清理浏览器数据和最近文件记录），以及让 Windows 更新顺畅运行。

### Q: FluentCleaner 和 CCleaner 有什么区别？

最大的区别是商业化程度：CCleaner 已被 Piriform/Avast 商业化，陆续加入浏览器保护、注册表清理、VPN 订阅等暗模式。FluentCleaner 由个人开发者维护，无广告、无遥测、不做虚假功能。另外 FluentCleaner 坚持使用 winapp2.ini 规则库，而这个规则库在 CCleaner v7 之后已被官方放弃。

### Q: 支持哪些 Windows 版本？

官方支持 Windows 10 2004（Build 19041）及之后版本，以及 Windows 11。尽管使用 WinUI 3，作者特意没有加入 Windows 11 独占限制，让 Windows 10 用户也能享受现代 UI。

### Q: 可以翻译成其他语言吗？

可以！FluentCleaner 内置国际化支持。只需复制 `FluentCleaner/Strings/en-US/Resources.resw` 到对应语言目录（如 `zh-CN/`），翻译所有 `<value>` 内容，然后提 PR。注意只修改 `<value>` 中的文本，XML 结构和 `name` 属性不可改动，文件保存为 UTF-8。

## 六、总结

FluentCleaner 是一个难得的个人开发者作品——不追求功能堆叠，不做虚假承诺。作者在 README 中写道：

> "_just wanted something that doesn't suck_"

这种克制和坦诚，反而让这个工具比很多商业竞品更值得信赖。如果你对 CCleaner 的臃肿早已不满，又不信任来路不明的"系统优化大师"，FluentCleaner 值得一试——至少它是开源的，代码透明，清洁规则可审计。

GitHub 地址：[builtbybel/FluentCleaner](https://github.com/builtbybel/FluentCleaner)
