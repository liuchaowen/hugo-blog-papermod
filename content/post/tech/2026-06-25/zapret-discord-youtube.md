---
title: "zapret-discord-youtube：绕过 ISP 深度包检测的利器"
date: 2026-06-25
description: "一款基于 WinDivert 的 Windows DPI 绕过工具，通过流量混淆技术实现对 Discord、YouTube 等被封锁服务的访问，支持多种策略和自动部署"
author: "Cheman"
slug: zapret-discord-youtube
draft: false
categories: ["技术", "网络工具", "开源"]
tags: ["GitHub", "DPI", "网络自由", "WinDivert", "流量混淆"]
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
ShowRssButtonInSectionTermList:: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个实用的网络工具项目：**zapret-discord-youtube**，它为 Windows 用户提供了一套开箱即用的 DPI（深度包检测）绕过方案，帮助恢复对 Discord、YouTube 等服务的访问。

## 一、项目概述

**zapret-discord-youtube** 是基于 [bol-van/zapret](https://github.com/bol-van/zapret) 项目的 Windows 封装版本，专门针对俄罗斯等地区的 ISP 深度包检测封锁设计。项目通过 WinDivert 驱动拦截和修改网络流量，利用多种混淆策略绕过运营商的流量识别。

**核心价值：**
- 解决 Discord 语音连接失败、YouTube 无法播放等常见问题
- 提供图形化批处理菜单，无需命令行操作
- 支持服务模式自动启动，开机即用
- 包含诊断工具和自动更新机制

**项目地址：** https://github.com/Flowseal/zapret-discord-youtube

## 二、技术原理

### 架构设计

```
┌─────────────────────────────────────────────────────┐
│                   Windows 应用层                      │
│         (Discord / YouTube / Telegram 等)            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              WinDivert 内核驱动                       │
│        (流量拦截 + 修改 + 重注入)                      │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              zapret 核心引擎                          │
│    ┌──────────┬──────────┬──────────┬──────────┐     │
│    │  ALT     │  FAKE    │  HOST    │  MIX    │     │
│    │  策略    │  策略    │  策略    │  策略    │     │
│    └──────────┴──────────┴──────────┴──────────┘     │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              混淆后的网络流量                          │
│           (绕过 ISP 的 DPI 检测)                      │
└─────────────────────────────────────────────────────┘
```

### 核心技术栈

| 组件 | 作用 | 说明 |
|------|------|------|
| **WinDivert** | 流量拦截 | 用户态数据包捕获库，替代 Linux 的 iptables/NFQUEUE |
| **winws.exe** | 流量处理 | zapret 的 Windows 实现版本 |
| **策略脚本** | 混淆逻辑 | 提供多种绕过策略（ALT/FAKE/HOST/MIX 等） |

### 混淆策略原理

项目提供多种策略适应不同 ISP 环境：

```batch
:: ALT 策略示例（修改 TCP 序列号）
winws.exe --wf-tcp=80,443 --wf-udp=443
  --dpi-desync=fake --dpi-desync-ttl=3
  --dpi-desync-fooling=badsum

:: FAKE 策略示例（伪造 SYN 包）
winws.exe --wf-tcp=443 --dpi-desync=syndata
  --dpi-desync-fake-syndata=/path/to/fake_syn.bin

:: HOST 策略示例（Host 头混淆）
winws.exe --wf-tcp=443 --dpi-desync=host
  --dpi-desync-hostpad=6 --dpi-desync-hostspell=google.com
```

**策略选择建议：**
- **ALT**：适用于轻度封锁，稳定性好
- **FAKE**：适用于中度封锁，兼容性佳
- **HOST**：适用于针对性封锁，效果显著
- **MIX**：组合策略，适合复杂网络环境

### 数据流分析

正常流量 vs 混淆流量：

```
【正常流量】
客户端 → [TLS ClientHello (SNI: youtube.com)] → ISP DPI → ❌ 识别并阻断

【混淆流量】
客户端 → WinDivert 拦截 → [修改 TTL / 伪造包] 
       → ISP DPI → ✅ 无法识别 → 目标服务器
```

关键在于让 DPI 系统无法正确识别流量特征：
1. **TTL 欺骗**：修改 TTL 值使伪造包在到达 DPI 前失效
2. **校验和破坏**：故意损坏包校验和，阻止 DPI 深度检测
3. **Host 混淆**：将敏感 Host 头替换为无害域名

## 三、安装与快速开始

### 环境要求

- **操作系统**：Windows 7 及以上（Win7 需替换 WinDivert 驱动）
- **权限**：管理员权限（加载 WinDivert 驱动）
- **网络**：需配置 Secure DNS（DoH）

### 前置配置：Secure DNS

**Chrome 浏览器：**
1. 设置 → 隐私与安全 → 安全
2. 启用「使用安全 DNS」
3. 选择自定义提供商：`https://dns.google/dns-query`

**Firefox 浏览器：**
1. 设置 → 隐私与安全 → DNS over HTTPS
2. 选择「最大保护」
3. 手动填入提供商 URL

**Windows 11 系统：**
设置 → 网络 → DNS 设置 → 启用 DNS over HTTPS

### 安装步骤

```powershell
# 1. 下载最新版本
# 访问：https://github.com/Flowseal/zapret-discord-youtube/releases/latest

# 2. 解压文件（注意：路径不要含中文或特殊字符）
# 右键 zip → 属性 → 勾选「解除锁定」→ 确定
# 解压到 C:\zapret-discord-youtube

# 3. 运行策略（管理员权限）
.\general.bat

# 或安装为服务（开机自启）
.\service.bat
# 选择 Install Service → 选择策略
```

## 四、使用方法与实战

### 基础用法：手动运行策略

```batch
:: 进入项目目录
cd C:\zapret-discord-youtube

:: 尝试不同策略（逐一测试）
general_alt.bat       :: ALT 策略
general_fake.bat      :: FAKE 策略
general_host.bat      :: HOST 策略
general_mix.bat       :: MIX 混合策略
```

**测试方法：**
1. 运行某个策略脚本
2. 打开 https://discord.com/app 测试连接
3. 如不工作，关闭脚本窗口（Ctrl+C），尝试下一策略

### 进阶用法：服务模式

```batch
:: 启动服务管理菜单
service.bat

:: 主要功能：
:: [Install Service]   - 安装策略为系统服务（开机自启）
:: [Remove Services]   - 移除所有服务
:: [Check Status]      - 检查运行状态
:: [Game Filter]       - 游戏 UDP/TCP 优化
:: [Update IPSet]      - 更新 IP 黑名单
:: [Update Hosts]      - 修复 Telegram/Discord 连接
:: [Run Diagnostics]   - 运行诊断工具
```

### 实际项目示例：修复 Telegram Web

**问题场景：**
Telegram Web 端无法加载，Discord 语音一直显示「正在连接」

**解决方案：**
```batch
:: 1. 运行服务管理
service.bat

:: 2. 选择 [Update Hosts File]
:: 3. 按提示更新系统 hosts 文件
:: 4. 重启浏览器测试

:: 如果仍不工作：
:: 5. 选择 [Check Status] 确认服务运行
:: 6. 选择 [Run Diagnostics] 排查问题
:: 7. 尝试切换其他策略
```

### 自定义资源列表

```batch
:: 添加自定义域名（支持通配符）
:: 文件位置：list-general-user.txt
echo "my-service.com" >> list-general-user.txt

:: 排除某域名
:: 文件位置：list-exclude-user.txt
echo "internal.company.com" >> list-exclude-user.txt

:: 添加 IP 段
:: 文件位置：ipset-all.txt
echo "192.168.100.0/24" >> ipset-all.txt
```

## 五、常见问题与解决方案

### Q1：杀毒软件报毒怎么办？

**原因**：WinDivert 驱动可能被标记为「风险工具」

**解决**：
```batch
:: 1. 确认文件完整性（验证 SHA256）
:: 2. 添加排除目录
:: Windows Defender：
设置 → 病毒防护 → 管理设置 → 排除项
→ 添加文件夹：C:\zapret-discord-youtube

:: 3. 或关闭 PUA 检测
:: Kaspersky：取消勾选「检测常被恶意软件使用的合法软件」
```

### Q2：策略运行后没有窗口弹出？

**排查步骤**：
```batch
:: 1. 检查管理员权限
:: 右键 cmd.exe → 以管理员身份运行

:: 2. 检查 WinDivert 驱动
driverquery | find "Divert"

:: 3. 运行诊断
service.bat → [Run Diagnostics]

:: 4. 查看是否被杀软拦截
:: 检查杀软日志，恢复被隔离文件
```

### Q3：YouTube 仍无法访问？

**检查清单**：
- [ ] Secure DNS 是否正确配置
- [ ] 浏览器广告拦截插件是否禁用（YouTube 会对抗）
- [ ] 尝试所有策略（不同 ISP 对策略敏感度不同）
- [ ] 更新 IPSet 列表：`service.bat` → `[Update IPSet List]`

### Q4：Discord 语音一直连接中？

```batch
:: 方案 A：更新 hosts
service.bat → [Update Hosts File]

:: 方案 B：清除 Discord 缓存
:: Win+R → %appdata%\discord\Cache
:: 删除所有文件，重启 Discord

:: 方案 C：切换策略
:: 某些策略对 Discord 更友好
```

### Q5：游戏连不上服务器？

```batch
:: 启用游戏模式
service.bat → [Game Filter] → 启用

:: 如仍不工作，尝试 IPSet 模式
service.bat → [IPSet Filter] → any
:: 注意：any 模式可能影响其他网站访问
```

### Q6：如何完全卸载重装？

```batch
:: 完整清理流程
service.bat → [Remove Services]

:: 重启电脑

:: 运行诊断清理残留
service.bat → [Run Diagnostics] → 最后选 Y 清理

:: 删除文件夹
rmdir /s "C:\zapret-discord-youtube"

:: 重新下载最新版本安装
```

## 六、总结

**zapret-discord-youtube** 为受 ISP DPI 封锁影响的 Windows 用户提供了一套低门槛的解决方案：

**优点：**
- 无需 VPN 订阅，本地即可运行
- 图形化菜单，避免复杂命令行配置
- 多策略覆盖，适应不同网络环境
- 支持服务模式，开机自动运行

**局限：**
- 仅支持 Windows 平台
- 需要管理员权限和 Secure DNS 配合
- 策略有效期依赖 ISP 更新频率

**适用场景：**
- Discord 语音连接失败
- YouTube 视频无法播放
- Telegram Web 无法登录
- 其他基于 SNI 检测的封锁

项目作为开源工具持续维护，建议定期检查 [Release 页面](https://github.com/Flowseal/zapret-discord-youtube/releases) 获取更新，以应对 ISP 新的封锁策略。

---

**相关链接：**
- 项目地址：https://github.com/Flowseal/zapret-discord-youtube
- 上游项目：https://github.com/bol-van/zapret
- WinDivert 官网：https://reqrypt.org/windivert
