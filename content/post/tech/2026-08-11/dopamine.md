---
title: "Dopamine：iOS 15-26 跨代越狱的技术实现解析"
date: 2026-08-11
description: "深入解析 Dopamine 越狱工具如何通过多代内核漏洞利用、Rootless 架构设计、dyld 动态注入等技术实现 iOS 15 至 26 的全链路越狱，涵盖 ClearSword/Titan/kfd 等核心漏洞利用链的技术原理与工程实践。"
author: "Cheman"
slug: dopamine
draft: false
categories: ["iOS安全", "越狱开发"]
tags: ["iOS", "越狱", "内核漏洞", "Rootless", "ElleiKit", "Dopamine"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Dopamine**，一个支持 iOS 15.0 到 iOS 26.0.1 全版本的半系留越狱工具，以 Rootless 架构和多漏洞利用链适配闻名，目前已有近 6000 星标。

## 一、项目概述

Dopamine 是由 opa334 开发的半系留越狱工具，支持从 iOS 15 到 iOS 26（含 26.0.1）的广泛版本范围，涵盖 arm64e（A14+）、A12/A13 以及传统 arm64 设备。项目采用 Rootless（无根）越狱架构，不破坏系统分区，通过 `jbroot`（越狱根目录）机制在 `/var/jb` 下构建完整的越狱环境。

核心特性包括：
- **多代漏洞利用链**：针对不同 iOS 版本和设备型号集成了 kfd、ClearSword、Titan、weightBufs、momentarius 等多种内核读写原语
- **Rootless 架构**：通过 `libroot` 和路径重定向实现无根环境下的包管理器兼容
- **模块化设计**：Exploit 插件化架构，支持动态加载和版本适配
- **完整的越狱生态**：内置 Sileo/Zebra 包管理器、ElleKit 框架、launchd hook、dyld hook 等完整基础设施

## 二、技术原理

### 2.1 Rootless 架构设计与路径管理

Rootless 越狱的核心挑战在于：在不修改系统分区的前提下，为越狱应用和 tweak 提供一个"伪根目录"环境。Dopamine 通过三层路径抽象实现：

```c
// Packages/libroot/src/paths.c
const char *libroot_get_root_prefix(void)
{
    return "";  // 系统根保持不变
}

const char *libroot_get_jbroot_prefix(void)
{
    return jbclient_get_jbroot();  // 返回 /var/jb
}
```

`libroot` 作为路径抽象层，向越狱进程提供两个关键路径：
- **root_prefix**：空字符串，表示真实系统根 `/`
- **jbroot_prefix**：通过 XPC 通信从 `launchdhook` 获取的越狱根路径（默认 `/var/jb`）

```c
// BaseBin/libjailbreak/src/jbroot.c
char *get_jbroot(void)
{
    return jbinfo(rootPath);  // 从越狱信息字典读取
}
```

所有越狱 tweak、deb 包和动态库均被安装到 `/var/jb` 下，包管理器通过 `libroot` 的路径重写机制感知"伪根目录"，而对系统其他进程完全透明。

### 2.2 内核读写原语与漏洞利用链

Dopamine 针对不同 iOS 版本和设备集成了多种内核漏洞利用方式，核心是通过内核漏洞获取 `kernel_read` 和 `kernel_write` 原语，进而修改内核数据结构实现提权和沙盒逃逸。

项目中的 Exploit 抽象接口定义：

```objc
// Application/Dopamine/Jailbreak/DOExploit.h
typedef enum {
    EXPLOIT_TYPE_KERNEL = 0,  // 内核读写原语
    EXPLOIT_TYPE_PAC,         // PAC 绕过
    EXPLOIT_TYPE_PPL,         // PPL 绕过
} ExploitType;

@interface DOExploit : NSObject
@property (nonatomic) NSString *name;
@property (nonatomic) NSString *identifier;
@property (nonatomic) NSArray *requirements;  // 版本/设备要求
@property (nonatomic) ExploitType type;

- (int)load;   // 加载利用模块
- (int)run;    // 执行漏洞利用
- (int)cleanup;
@end
```

主要漏洞利用链包括：

**kfd（Kernel File Descriptor）**
针对 iOS 16-17 的漏洞利用库，利用 `IOSurface`、`kqueue_workloop_ctl`、`sem_open` 等内核接口构建读写原语。核心是 PUAF（Phys Unreclaimable After Free）技术，通过物理页释放后重用实现内核内存任意读写。

**ClearSword**
针对特定 iOS 版本的内核漏洞利用，通过 `phys_oob`（物理内存越界访问）和 socket/surface 操作构建原语。

**Titan**
利用 GPU 驱动（IOGPUDevice）漏洞实现内核读写，包含 `gfx_patchfinder` 和 `kernel_patchfinder` 用于定位内核关键地址。

**weightBufs**
利用 Apple Neural Engine（ANE）驱动的 weight buffer 操作实现内核任意读写，涉及 `_ANEClient` 私有框架的复杂调用链。

### 2.3 systemhook 与进程注入机制

越狱需要 hook 所有进程的启动和执行过程，Dopamine 通过 `systemhook` 在进程 fork/exec 时注入动态库：

```c
// BaseBin/systemhook/src/main.c
#include <libjailbreak/jbroot.h>
#include <libjailbreak/codesign.h>

char *JB_RootPath = NULL;
char *get_jbroot(void) { return JB_RootPath; }

// hook sandbox_apply 以注入沙盒扩展
void *(*sandbox_apply_orig)(void *) = NULL;
void *sandbox_apply_hook(void *a1)
{
    // 消费 tokenized sandbox extensions
    consume_tokenized_sandbox_extensions(JB_SandboxExtensions);
    return sandbox_apply_orig(a1);
}
```

关键注入点：
- **spawn_hook**：拦截 `posix_spawn` 调用，注入环境变量和动态库
- **sandbox_apply_hook**：注入沙盒扩展，允许进程访问 `/var/jb`
- **dyld hook**：拦截动态链接器，重定向库加载路径到越狱根目录

### 2.4 launchdhook 与越狱服务管理

`launchdhook` 是越狱环境的核心守护进程，hook 系统 `launchd` 提供越狱特定的服务：

```c
// BaseBin/launchdhook/src/jbserver/jbserver_global.h
// 越狱服务端点定义
jbdomain_dopamine.c    // Dopamine 特定服务
jbdomain_platform.c    // 平台相关服务
jbdomain_root.c        // root 权限服务
jbdomain_systemwide.c  // 系统全局服务
```

服务功能包括：
- **jbroot 查询**：通过 XPC 返回越狱根路径
- **进程注入协调**：为新启动的进程提供注入信息
- **越狱环境管理**：重启、卸载、更新越狱环境
- **信任缓存管理**：动态添加签名信任

### 2.5 dyld 动态链接器 Hook

`dyldhook` 重写动态链接器的行为，使其能从 `/var/jb` 加载动态库：

```c
// BaseBin/dyldhook/src/main.c
// hook dyld 加载逻辑
void dyld_hook_main(void)
{
    // 重定向 @rpath/@executable_path 到越狱根
    // 处理 fake library 重定向
    // 实现越狱环境的 library injection
}
```

核心功能：
- **路径重定向**：将 `@rpath`、`@loader_path` 重定向到 `/var/jb` 下对应路径
- **fake library 机制**：创建假的库文件欺骗系统验证
- **inline hook 注入**：在目标进程中内联 hook 关键函数

## 三、安装与快速开始

### 环境要求

- iOS 15.0 - 26.0.1（arm64e 设备：iOS 15-17.3.1；A12/A13 设备：iOS 15-18.7.1, 26-26.0.1；arm64 设备：iOS 15-18.7.1）
- macOS + Xcode（从源码编译）或直接下载预编译 .tipa 文件
- 已安装 Procursus 或 Bootstrap 环境

### 安装步骤

**方法一：直接安装（推荐）**
1. 从官网下载 .tipa 文件：https://ellekit.space/dopamine/
2. 使用 AltStore/SideStore 或其他侧载工具安装到设备
3. 打开 Dopamine 应用，点击越狱按钮

**方法二：从源码编译**
```bash
# 克隆仓库
git clone -b 3.x https://github.com/opa334/Dopamine.git
cd Dopamine

# 编译（需要 Xcode 和 theos）
make

# 输出文件位于 Application/Dopamine.tipa
```

### 验证安装

越狱成功后：
- `/var/jb` 目录存在并包含越狱环境
- Sileo 或 Zebra 包管理器已安装
- 可以通过 `ssh` 连接设备（需安装 openssh 包）

## 四、使用方法与实战

### 基础用法

**越狱环境管理**
- 打开 Dopamine 应用查看当前状态
- 重启后需要重新越狱（半系留特性）
- 设置中可选择不同的 exploit 方式（自动适配）

**包管理器选择**
Dopamine 支持两种包管理器：
- **Sileo**：现代 UI，支持多个仓库，推荐新手使用
- **Zebra**：轻量级，兼容性好

可在 Dopamine 设置中切换。

**安装常用插件**
```bash
# 通过 Sileo/Zebra 图形界面搜索安装
# 常用插件：
# - ElleKit：越狱框架基础
# - PreferenceLoader：设置插件加载器
# - AppSync Unified：绕过签名验证
```

### 进阶用法

**自定义越狱根路径**
```c
// 通过 XPC 查询当前 jbroot
// 代码示例：libroot API
const char *jbroot = libroot_get_jbroot_prefix();
printf("Jailbreak root: %s\n", jbroot);  // 输出: /var/jb
```

**调试越狱环境**
```bash
# 查看越狱信息
cat /var/jb/.jb_info

# 检查进程注入
ps aux | grep -E "(hookd|jbctl)"

# 日志查看
log stream --predicate 'process == "Dopamine"'
```

**开发 tweak**
在 `/var/jb/Library/MobileSubstrate/DynamicLibraries/` 下创建 `.dylib` 和 `.plist` 文件：
```xml
<!-- com.example.mytweak.plist -->
<dict>
    <key>Filter</key>
    <dict>
        <key>Bundles</key>
        <array>
            <string>com.apple.springboard</string>
        </array>
    </dict>
</dict>
```

### 实际项目示例

**案例：开发 SpringBoard tweak**
1. 安装 theos 和开发工具
2. 创建项目：
```bash
cd /var/jb
THEOS=/var/jb/theos
$THEOS/bin/nic.pl  # 选择 iphone/tweak 模板
```

3. 编写代码：
```objc
// Tweak.xm
%hook SpringBoard
- (void)applicationDidFinishLaunching:(id)application {
    %orig;
    NSLog(@"[MyTweak] SpringBoard launched!");
}
%end
```

4. 编译安装：
```bash
make package install
```

## 五、常见问题与解决方案

### 安装失败

**问题：tipa 安装后闪退**
- 原因：签名问题或 iOS 版本不兼容
- 解决：重新签名，或检查 iOS 版本是否在支持列表

**问题：越狱按钮点击后无反应**
- 原因：exploit 选择错误或设备不支持
- 解决：在设置中手动选择 exploit（如 kfd、ClearSword）

### 运行时错误

**问题：重启后越狱失效**
- 这是半系留越狱的正常行为
- 解决：重新打开 Dopamine 应用点击越狱

**问题：Cydia/Sileo 无法打开**
- 原因：bootstrap 未正确安装
- 解决：在 Dopamine 设置中重新安装 bootstrap

### 性能问题

**问题：设备卡顿或耗电快**
- 原因：tweak 过多或某些 tweak 有性能问题
- 解决：通过 Sileo 卸载不必要的 tweak，或进入安全模式排查

**问题：某些应用闪退**
- 原因：越狱检测或 tweak 冲突
- 解决：安装越狱隐藏插件（如 Liberty Lite），或逐个禁用 tweak 排查

### 兼容性

**问题：iOS 26 是否支持？**
- 支持：iOS 26.0 和 26.0.1（A12/A13 设备）
- 不支持：iOS 26.1 及以上版本（待更新）

**问题：iPad 支持？**
- 支持：所有支持的 iOS 版本对应的 iPad
- 注意：部分 iPad 专用 tweak 可能不兼容

## 六、总结

Dopamine 通过精巧的 Rootless 架构和多代漏洞利用链，实现了从 iOS 15 到 26 的全版本越狱支持。其模块化的 Exploit 系统、完整的 hook 机制、以及 libroot 路径抽象层，不仅展示了越狱开发的技术深度，也为 iOS 安全研究提供了宝贵的参考实现。对于开发者而言，通过阅读源码可以深入学习内核漏洞利用、动态库注入、沙盒逃逸等高级技术；对于普通用户，Dopamine 提供了稳定易用的越狱体验，是目前 iOS 越狱生态中最活跃的项目之一。
