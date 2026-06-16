---
title: "Win11Debloat: 一键精简 Windows 11，关闭遥测与预装全家桶"
date: "2026-06-16"
description: "Win11Debloat 是一款轻量级 PowerShell 脚本，无需安装即可快速清理 Windows 11 预装应用、关闭遥测、精简任务栏与开始菜单，让系统回归纯净状态。"
author: "Cheman"
slug: win11debloat
draft: false
categories: ["技术", "开源", "Windows"]
tags: ["Windows 11", "PowerShell", "开源工具", "系统优化", "隐私保护"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Win11Debloat**，一款轻量级的 PowerShell 脚本，可以一键清理 Windows 11 预装应用、关闭遥测、禁用 Copilot 和 Recall 等 AI 功能，让系统恢复清爽。

## 一、项目概述

Win11Debloat 是一款开源的 PowerShell 脚本，旨在帮助用户快速精简 Windows 11 系统中的预装应用和冗余功能。它无需安装，下载后直接运行，通过直观的菜单界面即可完成系统优化。项目基于 MIT 许可证托管在 GitHub，由 Raphire 维护，社区活跃度高，支持命令行参数，适合个人用户和系统管理员使用。

**核心功能亮点：**

- **应用清理**：批量移除预装应用（如 Xbox、OneDrive、Cortana、Weather 等）
- **隐私关闭**：禁用遥测、诊断数据、活动历史、应用追踪和定向广告
- **AI 功能管理**：可关闭 Copilot、Recall、Click to Do 等 Windows 11 AI 功能
- **界面定制**：恢复旧版右键菜单、隐藏任务栏图标、关闭动画效果
- **完全可逆**：所有变更均可还原，预装应用可通过 Microsoft Store 重新安装

## 二、技术原理

Win11Debloat 的核心是一个经过精心设计的 PowerShell 脚本，通过修改 Windows 注册表、系统策略和预装应用配置来实现各项优化。以下从几个关键技术点展开分析。

### 2.1 脚本架构与执行模式

脚本支持三种运行方式：

**快速方式（推荐）**：一行命令自动下载并运行
```powershell
& ([scriptblock]::Create((irm "https://debloat.raphi.re/")))
```

**传统方式**：下载 ZIP 包，双击 `Run.bat` 启动

**高级方式**：手动解压后以管理员权限 PowerShell 运行
```powershell
Set-ExecutionPolicy Unrestricted -Scope Process -Force
.\Win11Debloat.ps1
```

脚本内部通过 `irm`（Invoke-RestMethod）从远程服务器拉取最新脚本体，实现了自动更新能力。每次运行都会获取最新版本，确保用户始终使用最新的清理规则。

### 2.2 应用移除机制

预装应用的移除通过 `Get-AppxPackage` 和 `Remove-AppxPackage` cmdlet 实现。以移除 Xbox 相关应用为例：

```powershell
$packages = @(
    "Microsoft.XboxApp",
    "Microsoft.XboxGameOverlay",
    "Microsoft.XboxGamingOverlay",
    "Microsoft.XboxIdentityProvider",
    "Microsoft.XboxTCUI"
)
foreach ($package in $packages) {
    Get-AppxPackage -Name $package -AllUsers | Remove-AppxPackage -AllUsers
}
```

`-AllUsers` 参数确保该操作对系统上所有用户生效，而非仅限于当前用户。同时，脚本还支持 `-WhatIf` 模式（预览将要移除的应用，不实际执行），降低误操作风险。

### 2.3 隐私设置的注册表操作

关闭遥测和诊断数据是 Win11Debloat 的核心功能之一。脚本通过修改以下注册表路径实现：

```powershell
# 禁用遥测
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" `
    -Name "AllowTelemetry" -Value 0 -Type DWord

# 禁用活动历史
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" `
    -Name "PublishUserActivities" -Value 0 -Type DWord

# 关闭定位服务
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location" `
    -Name "Value" -Value "Deny" -Type String
```

脚本会检测系统版本（家庭版/专业版/企业版），因为不同版本支持的组策略项不同。对于家庭版（不支持 gpedit.msc 的版本），脚本直接操作注册表而非调用组策略 API，保证所有 Windows 11 版本均可使用。

### 2.4 AI 功能的专项关闭

针对 Windows 11 的 AI 功能，脚本提供了细粒度控制：

```powershell
# 禁用 Copilot
Set-ItemProperty -Path "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" `
    -Name "TurnOffWindowsCopilot" -Value 1 -Type DWord

# 禁用 Recall（截图监控）
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows AI" `
    /v DisableAIDataCollection /t REG_DWORD /d 1 /f

# 禁用 Paint/Notepad AI 功能
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AI" `
    -Name "GPUImprovedPaintExperience" -Value 0 -Type DWord
```

### 2.5 Sysprep 模式与多用户支持

Win11Debloat 支持 **Sysprep 模式**，可修改 Windows 默认用户配置文件（Default User Profile），确保所有新建用户都继承优化设置。这对系统管理员批量部署或重装系统场景极为有用：

```powershell
# 修改默认用户配置
& "$PSScriptRoot\Win11Debloat.ps1" -Sysprep
```

同时支持通过 `-User <username>` 参数对指定用户账户应用变更，而非仅修改当前登录用户。

## 三、安装与快速开始

### 环境要求

- 操作系统：Windows 11（所有版本，家庭版可用）
- 权限：需要管理员权限（UAC 提权）
- PowerShell：Windows 11 内置 PowerShell 5.1+，建议升级到最新版本
- 网络：首次运行需联网以下载脚本（如使用快速方式）

### 安装步骤

**方式一：一键在线运行（推荐）**

1. 右键开始菜单 → 选择「Windows PowerShell (管理员)」或「终端 (管理员)」
2. 粘贴以下命令：
```powershell
& ([scriptblock]::Create((irm "https://debloat.raphi.re/")))
```
3. 按回车，等待脚本下载完成
4. 按屏幕提示操作，选择需要应用的优化项

**方式二：本地下载离线使用**

1. 访问 https://github.com/Raphire/Win11Debloat/releases/latest 下载最新 ZIP
2. 解压到任意目录（如 `C:\Win11Debloat`）
3. 右键 `Run.bat` → 「以管理员身份运行」

### 命令行参数（高级用法）

脚本支持丰富的命令行参数，适合自动化部署场景：

```powershell
# 以静默模式应用预设配置
.\Win11Debloat.ps1 -Silent -DefaultSettings

# 仅移除预装应用，不修改系统设置
.\Win11Debloat.ps1 -RemoveApps

# 应用优化并生成回滚脚本
.\Win11Debloat.ps1 -CreateUndoScript

# 对指定用户账户应用
.\Win11Debloat.ps1 -User "OtherUser"
```

## 四、使用方法与实战

### 4.1 首次运行推荐配置

首次使用建议直接选择 **Default Settings（默认预设）**，它经过维护者精心调优，包含以下优化：

- 移除最常用的预装应用（不破坏系统核心功能）
- 关闭遥测和诊断数据收集
- 关闭开始菜单中的建议内容和广告
- 隐藏任务栏中的冗余图标（Widgets、Chat 等）
- 禁用 Copilot 和 Recall

### 4.2 按需定制优化方案

如果只想做局部优化，可以在菜单中单独勾选：

| 优化类别 | 具体选项 |
|---------|---------|
| 应用管理 | 移除 X / 保留 X（精细化控制每个预装应用） |
| 隐私保护 | 关闭遥测 / 关闭广告追踪 / 关闭位置服务 |
| AI 功能 | 禁用 Copilot / 禁用 Recall / 禁用 Paint AI |
| 界面定制 | 恢复旧版右键菜单 / 任务栏图标左对齐 / 关闭动画 |
| 系统设置 | 禁用快速启动 / 关闭自动更新 / 禁用 Storage Sense |

### 4.3 回滚所有变更

所有变更均可一键还原，脚本会自动在系统目录生成回滚脚本：

```
位置：C:\ProgramData\Win11Debloat\Undo.ps1
```

运行该脚本即可恢复所有默认设置，被移除的 UWP 应用可通过 Microsoft Store 重新安装对应应用即可恢复。

## 五、常见问题与解决方案

**Q1：运行脚本后部分功能异常怎么办？**
A：立即运行 `C:\ProgramData\Win11Debloat\Undo.ps1` 回滚所有变更。脚本设计遵循最小修改原则，不触及系统核心组件，但个别第三方软件可能依赖某些预装运行时（如 .NET Framework 预装包），误移除后需重新安装。

**Q2：提示「无法加载脚本，因为在此系统上禁止运行脚本」？**
A：需要调整 PowerShell 执行策略。使用快速方式（一行命令）运行时，会自动设置 `Scope Process` 的临时策略，不影响系统全局设置。如需手动处理：
```powershell
Set-ExecutionPolicy Unrestricted -Scope Process -Force
```

**Q3：家庭版 Windows 11 是否可用？**
A：完全支持。Win11Debloat 通过直接操作注册表而非组策略（gpedit.msc），绕过了家庭版不支持组策略的限制，所有功能在家庭版上均可正常工作。

**Q4：移除应用后想恢复某个预装应用怎么办？**
A：通过 Microsoft Store 搜索对应应用名称重新安装即可。例如重新安装 Xbox：打开 Microsoft Store → 搜索「Xbox」→ 安装。

**Q5：脚本会被杀毒软件误报吗？**
A：由于脚本需要修改系统设置（注册表、UWP 应用等），部分安全软件可能将其标记为「可能不需要的程序」。这是正常现象——脚本是开源的（MIT 许可证），代码完全透明，可在 GitHub 页面审查所有操作逻辑。

## 六、总结

Win11Debloat 是一款成熟度极高的 Windows 11 系统优化工具，将原本需要手动查找数十个设置项的繁琐工作浓缩为一个交互式脚本。无论是希望摆脱预装全家桶打扰的普通用户，还是需要批量部署干净系统的 IT 管理员，都能从中受益。

其设计哲学值得称道：**可逆、渐进、透明**——用户始终掌控所有变更，随时可回滚，每次操作的影响范围清晰可见。如果你刚装了 Windows 11 不久，不妨跑一下这个脚本，给系统来一次彻底的「大扫除」。
