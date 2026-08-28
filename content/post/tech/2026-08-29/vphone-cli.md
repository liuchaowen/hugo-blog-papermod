---
title: "vphone-cli：用 Apple Virtualization.framework 在 Mac 上启动一台虚拟 iPhone"
date: 2026-08-29
description: "vphone-cli 借助 Apple PCC 研究用 VM 基础设施与 Virtualization.framework，在 Apple Silicon Mac 上完整启动一台虚拟 iPhone。本文深入解析它的 Swift 补丁流水线、五档固件变体、DFU 恢复与 CFW 注入机制，并给出安装、实战与常见问题排查方案。"
author: "Cheman"
slug: vphone-cli
draft: false
categories: ["技术", "开源", "iOS 逆向"]
tags: ["vphone-cli", "Virtualization.framework", "iOS", "虚拟机", "Apple Silicon", "越狱", "固件补丁", "Swift", "GitHub"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**vphone-cli**，它把 Apple 内部用于 Private Cloud Compute（PCC）安全研究的虚拟机基础设施拿来"逆向复用"，让你能在一台 Apple Silicon Mac 上真正跑起一台虚拟 iPhone——完整的 iOS 系统、可 SSH、可 VNC、甚至可以自动装上 Sileo 和 TrollStore。

## 一、项目概述

### 它是什么

vphone-cli 是一个用 Swift 编写的命令行工具（作者 Lakr233），核心能力可以概括成一句话：**在 macOS 宿主上，用 `Virtualization.framework` 引导一个 arm64 的 iOS guest**。

这件事之所以可能，是因为 Apple 为了让安全研究者审计 PCC，在系统里留下了一套"research guest"的虚拟化通路（`csrutil allow-research-guests`），并配套发布了 cloudOS 的 IPSW。vphone-cli 做的事情是把 **iPhone 的 IPSW** 和 **cloudOS 的 IPSW** 合并、给启动链打补丁、走一遍 DFU 恢复，最后让这个"混血"固件在 VM 里启动起来。

### 解决什么问题

在此之前，iOS 侧的动态分析基本只有三条路：真机越狱（版本受限、风险高）、Corellium（商业、昂贵）、模拟器（不是真 iOS，只是 x86/arm 上的 API 桩）。vphone-cli 提供了第四条路：**本地、免费、跑真 iOS 内核、可任意快照与克隆**。

### 核心特性

- **一条命令端到端建机**：下载 → 打补丁 → DFU 恢复 → CFW 安装 → 首次启动，全自动
- **五档固件变体**：从"完全不动 iOS 缓解措施"到"141 处补丁 + 反虚拟机检测"，按研究需求分级
- **APFS 秒级克隆**：`vm clone` 复制一台机器只需几秒，并自动生成全新设备标识
- **导入导出**：`vm export` 默认用 zstd 快速打包，`--max` 走 `xz -9` 极限压缩
- **自动化友好**：暴露一个 Unix 域套接字 `vphone.sock`，支持截图、触摸、滑动、硬件键、剪贴板，每个动作都回传一张内联截图——这正是为 AI 驱动的端到端测试设计的接口
- **可跑越狱环境**：`jb` 变体首次启动即自动安装 Sileo / TrollStore

## 二、技术原理

### 2.1 整体架构：Swift 主体 + Python 桥 + 一堆外部工具

从 `Package.swift` 可以清楚看到项目的分层：

```swift
// swift-tools-version:6.0
let package = Package(
    name: "vphone-cli",
    platforms: [.macOS(.v15)],
    dependencies: [
        .package(path: "vendor/swift-argument-parser"),
        .package(path: "vendor/Dynamic"),
        .package(path: "vendor/libcapstone-spm"),
        .package(path: "vendor/libimg4-spm"),
        .package(path: "vendor/MachOKit"),
    ],
    targets: [
        .target(
            name: "FirmwarePatcher",
            dependencies: [
                .product(name: "Capstone", package: "libcapstone-spm"),
                .product(name: "Img4tool", package: "libimg4-spm"),
                .product(name: "MachOKit", package: "MachOKit"),
                "VPhoneCore",
            ],
            path: "sources/FirmwarePatcher"
        ),
        .target(
            name: "VPhoneCore",
            path: "sources/VPhoneCore",
            linkerSettings: [.linkedFramework("Virtualization")]
        ),
        .executableTarget(
            name: "vphone-cli",
            dependencies: [
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
                .product(name: "Dynamic", package: "Dynamic"),
                "FirmwarePatcher", "VPhoneCore",
            ],
            path: "sources/vphone-cli",
            linkerSettings: [
                .linkedFramework("Virtualization"),
                .linkedFramework("AppKit"),
                .linkedFramework("SwiftUI"),
                .linkedFramework("CoreLocation"),
                .linkedFramework("AVFoundation"),
            ]
        ),
    ]
)
```

几个关键的选型信号：

| 依赖 | 作用 | 为什么选它 |
| --- | --- | --- |
| `libcapstone-spm` | ARM64 反汇编 | 补丁不是硬编码字节偏移，而是**反汇编后模式匹配**——这才能跨 iOS 版本复用 |
| `libimg4-spm` | IMG4 容器解析/重签 | iBoot、内核、DeviceTree 都封装在 IMG4 里，改完必须重新封装 |
| `MachOKit` | Mach-O 解析 | 定位 `__TEXT`/`__DATA` 段、符号、加载命令 |
| `Dynamic` | Objective-C 动态调用 | `Virtualization.framework` 的 PV=3 私有 API 没有公开头文件，只能运行时动态调用 |
| `swift-argument-parser` | CLI 骨架 | `vm create` / `fw patch` 这类子命令树 |

注意 `Dynamic` 这个依赖——它基本就是在告诉你：**这个项目的核心是调用 Apple 未公开的虚拟化私有接口**。这也解释了为什么必须放松 SIP/AMFI（下文详述）。

Python 侧则通过 `scripts/pymobiledevice3_bridge.py` 承担设备恢复协议，依赖清单很直白：

```text
typer
capstone
keystone-engine
pyimg4
pymobiledevice3>=9.5.0
ipsw-parser
setuptools
```

`pymobiledevice3` 负责与 DFU/Recovery 中的"设备"通信、向 Apple TSS 服务器请求 SHSH blob、执行 restore；`pyimg4` 和 `keystone-engine`（汇编器，与 Swift 侧的 capstone 反汇编器互补）用于脚本化的固件加工。

### 2.2 数据流：从两个 IPSW 到一台能开机的 iPhone

Makefile 里的目标顺序几乎就是完整的数据流图：

```makefile
fw_prepare:
	cd "$(VM_DIR)" && bash "$(CURDIR)/$(SCRIPTS)/fw_prepare.sh"

fw_patch: patcher_build
	"$(CURDIR)/$(PATCHER_BINARY)" patch-firmware --vm-directory "$(VM_DIR_ABS)" --variant regular \
	$(if $(filter 1 true yes YES TRUE,$(FORCE_EXC_GUARD)),--force-exc-guard,)
```

拆解成六个阶段：

1. **`vm new`** — 创建空的 VM bundle，写入 `config.plist`（CPU / 内存 / 磁盘尺寸都存在这个 manifest 里）
2. **`fw prepare`** — 下载 iPhone IPSW + cloudOS IPSW，解包并**合并**。合并是关键：iPhone 侧提供用户态与系统卷，cloudOS 侧提供能在 `Virtualization.framework` 下启动的引导链与内核
3. **`fw patch`** — Swift `FirmwarePatcher` 对 iBSS / iBEC / LLB / kernelcache / TXM / DeviceTree 逐个组件打补丁
4. **`vm launch --dfu`** + **`restore --get-shsh`** + **`restore`** — 把 VM 引导进 DFU，向 Apple 取 SHSH，然后走标准 restore 流程把镜像刷进虚拟磁盘
5. **`cfw install`** — VM 关机状态下，宿主直接挂载 guest 的 APFS 卷，落地自定义文件（SSH、VNC、`vphoned` 守护进程、越狱组件），并**离线翻转 boot snapshot**
6. **`vm launch`** — 首次启动

第 5 步的"host-mount + 离线翻转快照"是很聪明的一手：iOS 的 SSV（Signed System Volume）机制下，运行时改系统卷几乎不可能；但在宿主上把卷挂载起来改完再重建 snapshot seal，就绕开了整个运行时校验路径。这也是为什么 `cfw install` 要求 sudo。

### 2.3 补丁分级：五档变体的设计哲学

这是项目最值得学习的设计——**把"安全绕过强度"做成一个可选的刻度盘**：

| 变体 | 启动链补丁 | CFW 阶段 | 说明 |
| --- | --- | --- | --- |
| `less` | 4 处 | 2 阶段 | 近乎无补丁，保留 iOS 全部缓解措施 |
| `regular` | 42 处 | 10 阶段 | AMFI / SSV / Img4 / TXM 绕过 |
| `dev` | 53 处 | 12 阶段 | 追加 TXM entitlement / debug 绕过 |
| `jb` | 113 处 | 14 阶段 | 追加完整越狱（Sileo、TrollStore 首启动自动装） |
| `exp` | 141 处 | 18 阶段 | JB 超集 + 反虚拟机检测研究补丁 |

为什么要分级？因为**补丁越多，环境失真越严重**。如果你研究的目标是"某个 App 在标准 iOS 缓解措施下的行为"，`less` 才是正确选择；如果你要注入 dylib、hook 系统调用，才需要往 `jb` 走。这种分级避免了"为了方便而永久污染研究环境"的常见陷阱。

`exp` 变体里的补丁清单尤其能看出作者在跟谁较劲，Makefile 的 help 文本里写得很清楚：

```text
EXP=1   Experimental firmware/CFW path (JB + EXP-only patches:
        kernel hv_vmm rename, DSC byte-5 mangle, watchdogd surgical,
        DT identity properties, post-restore DT rewrite, opt-in build spoof)
```

- `kernel hv_vmm rename` — 内核里标识"运行在 hypervisor 下"的字符串被改名，让 guest 里的检测代码查不到
- `DT identity properties` / `post-restore DT rewrite` — 改写 DeviceTree 的设备标识属性，伪装成真实硬件
- `SPOOF_BUILD=<id>` — 重写 `SystemVersion.plist` 里的 `ProductBuildVersion`，让"设置 → 关于本机"显示指定构建号

一整套针对**反虚拟机检测**的对抗工程。

### 2.4 一个容易忽略的工程细节

Makefile 里这段注释值得单独拎出来，是很实用的 GNU Make 经验：

```makefile
# CPU cores, memory (MB), disk size (GB) — used only during vm_new.
# NB: no inline comments on these `?=` lines — make would fold the trailing
# whitespace into the value (e.g. CPU="8   ") and break numeric consumers.
CPU         ?= 8
MEMORY      ?= 8192
DISK_SIZE   ?= 64
```

在 `?=` 赋值行尾写行内注释，Make 会把注释前的空白折进变量值，于是 `CPU` 变成 `"8   "`，传给下游数值解析器直接炸。踩过这个坑的人应该不少。

另一处是 `VM_DIR_ABS := $(abspath $(VM_DIR))`——用 `abspath` 同时兼容相对路径（默认 `vm`）和绝对路径（比如把 VM 放外置 SSD），`abspath` 对已是绝对路径的输入原样返回，对相对路径则拼接 `CURDIR`。

### 2.5 启动前的自检机制

项目定义了一个 `BOOT_BINARY_CHECK` 宏，在真正启动 VM 之前先做一次"能不能跑"的探测：

```makefile
define BOOT_BINARY_CHECK
	@zsh $(SCRIPTS)/boot_host_preflight.sh $(1)
	@tmp_log="$$(mktemp -t vphone-boot-preflight.XXXXXX)"; \
	set +e; \
	"$(CURDIR)/$(BINARY)" --help >"$$tmp_log" 2>&1; \
	rc=$$?; \
	set -e; \
	if [ $$rc -ne 0 ]; then \
		echo "Error: signed vphone-cli failed to launch (exit $$rc)." >&2; \
		echo "Check private virtualization entitlement support and ensure SIP/AMFI are disabled on the host." >&2; \
		echo "Repo workaround: start the AMFI bypass helper with 'make amfidont_allow_vphone' and retry." >&2; \
		...
	fi
endef
```

思路很朴素但有效：先跑一次 `--help`，如果连这个都被 AMFI 杀掉，说明宿主的 SIP/AMFI 配置没到位，此时给出明确的修复建议，而不是让用户面对一个莫名的 `zsh: killed`。**这是 CLI 工具里值得抄的错误处理模式——把最常见的环境故障前置成一次成本极低的探针。**

### 2.6 签名与 entitlement

```makefile
$(BINARY): $(SWIFT_SOURCES) Package.swift $(ENTITLEMENTS)
	@echo '// Auto-generated — do not edit' > $(BUILD_INFO)
	@echo 'enum VPhoneBuildInfo { static let commitHash = "$(GIT_HASH)" }' >> $(BUILD_INFO)
	@set -o pipefail; swift build -c release 2>&1 | tail -5
	codesign --force --sign - --entitlements $(ENTITLEMENTS) $@
```

用 ad-hoc 签名（`--sign -`）附加 `sources/vphone.entitlements`。里面申请的是 Apple 的私有 **PV=3** entitlement——正规 Developer 证书签不出来，所以只能自签，而自签又必然触发 AMFI 拦截，于是回到了那个前置条件：宿主必须放松 AMFI。

guest 侧的 `vphoned` 守护进程则走另一条签名路径，用 procursus 版 `ldid` 配合项目自带的 p12：

```makefile
vphoned:
	@command -v ldid >/dev/null 2>&1 \
		|| (echo "Error: ldid not found. Run: brew install ldid-procursus" && exit 1)
	$(MAKE) -C $(SCRIPTS)/vphoned GIT_HASH=$(GIT_HASH)
	cp $(SCRIPTS)/vphoned/vphoned $(VM_DIR)/.vphoned.signed
	ldid -S$(SCRIPTS)/vphoned/entitlements.plist \
		-M "-K$(SCRIPTS)/vphoned/signcert.p12" \
		$(VM_DIR)/.vphoned.signed
```

### 2.7 目录布局：可移植性优先

所有产物都放在 `~/.vphone/`，刻意与仓库和 `.app` 分离：

| 路径 | 内容 |
| --- | --- |
| `~/.vphone/` | 用户数据根，`$VPHONE_ROOT` 可整体重定向 |
| `~/.vphone/VMs/` | VM bundle，一台机器一个目录；`$VPHONE_LIBRARY_ROOT` 单独覆盖 |
| `~/.vphone/ipsws/` | 下载的 iPhone / cloudOS IPSW，跨 VM 复用缓存 |
| `~/.vphone/tools/` | `fw prepare` 阶段拉取的 APFS seal-volume 工件 |
| `~/.vphone/debs/` | `jb`/`exp` CFW 注入 guest 的 `.deb` 缓存（Sileo、apt 等） |
| `~/.vphone/venv/` | 自动置备的 Python 环境；`$VPHONE_VENV_DIR` 可覆盖 |

优先级链条：**单项覆盖（`$VPHONE_LIBRARY_ROOT`、`$VPHONE_VENV_DIR`）> `$VPHONE_ROOT` > 默认 `~/.vphone`**。这样设计的直接收益是签名后的 `.app` 保持纯净可搬迁——IPSW 动辄好几个 GB，缓存跟着 bundle 走会是灾难。

## 三、安装与快速开始

### 3.1 环境要求

宿主必须满足：

- **Apple Silicon**（Intel Mac 无解）
- **macOS 15+**（Sequoia 及以上）
- **Xcode + iOS SDK**（用于交叉编译 guest 侧的 `vphoned`）
- **放松 SIP/AMFI**，以允许未签名二进制持有私有 PV=3 entitlement

⚠️ 宿主本身不能是虚拟机——PV=3 guest 无法嵌套。

### 3.2 依赖安装

```bash
brew install python@3.13 aria2 wget gnu-tar openssl@3 \
  ldid-procursus sshpass keystone cmake libusb ipsw zstd
```

### 3.3 最省事：直接装 Homebrew tap

```bash
brew install zqxwce/tap/vphone-cli
```

### 3.4 从源码构建

```bash
git clone --recurse-submodules https://github.com/Lakr233/vphone-cli.git
cd vphone-cli

./scripts/setup_tools.sh   # 安装依赖、构建工具链子模块、创建 Python venv
./scripts/build.sh         # 构建并签名 vphone-cli、打 .app 包、交叉编译 vphoned

cd .build/vphone-cli.app/Contents/MacOS/
vphone-cli --help
```

注意 `--recurse-submodules` 不能省——`vendor/` 下的 capstone、libimg4、MachOKit、Dynamic 全是子模块。

### 3.5 SIP/AMFI 放松：两条路线

**方案 A：彻底关闭 SIP，再用 boot-arg 关掉 AMFI（最宽松）**

在恢复模式下（长按电源键 → 终端）：

```bash
csrutil disable
csrutil allow-research-guests enable
```

重启回 macOS 后设置 AMFI boot-arg（需要 SIP 完全关闭才生效）：

```bash
sudo nvram boot-args="amfi_get_out_of_my_way=1 -v"   # 之后重启
```

**方案 B：保留 SIP（仅放松 debug），用 amfidont 单独放行二进制（AMFI 系统级仍启用）**

恢复模式下：

```bash
csrutil enable --without debug
csrutil allow-research-guests enable
```

重启回 macOS 后：

```bash
vphone-amfidont
# 本地构建对应 .build/vphone-cli.app/Contents/Resources/vphone-amfidont
```

**方案 B 更值得推荐**：它只对这一个二进制开洞，系统其余部分的代码签名强制仍然有效。日常主力机上关掉整个 AMFI 是相当激进的决定。

### 3.6 最简运行示例

一条命令端到端建机：

```bash
vphone-cli vm create myphone -V jb   # -V / --variant
vphone-cli vm launch myphone
```

## 四、使用方法与实战

### 4.1 VM 生命周期管理

```bash
vphone-cli vm list                              # 列出所有 VM（--json 便于脚本消费）
vphone-cli vm info myphone                      # 查看单台详情
vphone-cli vm new myphone                       # 创建空 bundle（可指定 cpu/mem/disk）
vphone-cli vm config myphone --cpu 8 --memory 8192
vphone-cli vm clone myphone myphone-2           # APFS 快速克隆 + 全新设备标识
vphone-cli vm rename myphone iphone16
vphone-cli vm delete iphone16
```

`vm clone` 值得特别说明：它走 APFS 的 copy-on-write 克隆，几十 GB 的 VM 复制在秒级完成且几乎不占额外空间，同时**重新生成设备标识**（UDID/ECID 等）。做"污染性实验"时的正确姿势就是：建一台干净基线机，每次实验前 clone 一份，用完删掉。

### 4.2 导入导出

```bash
# 默认 zstd 快速压缩；--max 走 xz -9
# --out 可以是目录，会自动命名为 <vm>.tzst / <vm>.txz
# 自动跳过 restore 目录与中间 staging 文件
vphone-cli vm export myphone --out myphone.tzst
vphone-cli vm export myphone --out ~/backups/ --max

vphone-cli vm import myphone.tzst --name restored
```

默认用 zstd 而不是 xz 是个务实的取舍：VM 镜像本来就大，zstd 在可接受的压缩率下能快好几倍；真要归档存盘再上 `--max`。

### 4.3 手动分步建机（`vm create` 的展开）

当你需要重跑某一个阶段（比如换 iOS 版本只需重做 2、3 步）时：

```bash
vphone-cli vm new myphone                              # 1. 空 bundle
vphone-cli fw prepare myphone --iphone-version 26.1    # 2. 下载 + 合并 IPSW
vphone-cli fw patch myphone --variant jb               # 3. 给启动链打补丁

vphone-cli vm launch myphone --dfu &                   # 4. 后台引导进 DFU
vphone-cli restore myphone --get-shsh                  #    取 SHSH
vphone-cli restore myphone                             #    DFU 恢复
vphone-cli vm stop myphone                             #    停掉 DFU 启动

vphone-cli cfw install myphone --variant jb            # 5. 安装 CFW（宿主挂载，需 sudo）
vphone-cli vm launch myphone                           # 6. 首次启动
```

升级 iOS 版本时把本地 IPSW 喂给 `fw prepare`：

```bash
vphone-cli fw prepare myphone \
  --iphone-source /path/to/iPhone.ipsw \
  --cloudos-source /path/to/cloudOS.ipsw
```

### 4.4 连接进 guest

| 方式 | 命令 / 地址 | 适用变体 |
| --- | --- | --- |
| SSH | `ssh -p 22222 mobile@<vm-ip>`（密码 `alpine`） | `jb` |
| SSH | `ssh -p 22222 root@<vm-ip>` | `regular` / `dev` |
| VNC | `vnc://<vm-ip>:5901` | 全部 |

### 4.5 进阶：自动化与 AI 驱动测试

这是我认为项目最有想象力的部分。`vphone-cli` 在 VM bundle 下暴露一个控制套接字 `<bundle>/vphone.sock`，支持截图、触摸、滑动、硬件按键、剪贴板操作，**每个动作执行后直接回传一张内联截图**。

这个"动作 → 截图"的同步闭环，恰好就是视觉 Agent 需要的接口形态：LLM 发一个 tap，立刻拿到结果画面，再决定下一步。官方还给出了 MCP 封装 [vphone-mcp](https://github.com/pluginslab/vphone-mcp)，接进支持 MCP 的客户端就能让模型直接操作这台虚拟 iPhone 做端到端测试。

相比传统 XCUITest 那套"写死选择器"的方案，这条路子对 UI 变更的鲁棒性要高得多。

### 4.6 回归测试：防补丁漂移

项目自带两层测试，思路很值得借鉴：

```bash
# 在 README 支持的每个 cloudOS 内核上跑全部 JB 内核补丁（含所有 Sandbox hook）
make test_jb_patches
make test_jb_patches QUICK=1        # 只测本地最新内核，快速开发循环

# 跑完整 patch-firmware 流水线（启动链 + 基础内核 + JB + EXP），
# 任何子补丁被跳过（出现 `[-]` 行）即失败
make test_fw_patches
make test_fw_patches VARIANTS="exp"
```

`test_fw_patches` 的注释点明了它存在的理由：`test_jb_patches` 在结构上看不到 JB 内核层之外的漂移（iBSS/iBEC/LLB、基础 KernelPatcher、TXM、DeviceTree），所以需要一个更宽的闸门。**"补丁被静默跳过"是这类项目最危险的失效模式**——补丁没打上但流程不报错，最后表现为一个莫名其妙的启动失败。把 `[-]` 行提升为测试失败，是非常干净的解法。

### 4.7 已验证环境

作者维护了一张相当详尽的兼容矩阵，覆盖 iPhone 17,3 从 18.6.2 到 27.0 beta 的十余个版本，cloudOS 从 `26.1-23B85` 到 `26.4-23E5207q`。摘录几行：

| 宿主 | iPhone | CloudOS |
| --- | --- | --- |
| Mac16,11 27.0b2 | `17,3_18.6.2_22G100` | `26.1-23B85` |
| Mac16,12 26.3 | `17,3_26.3_23D127` | `26.3-23D128` |
| Mac16,6 26.4.1 | `17,3_26.6_23G71` | `26.4-23E5207q` |
| Mac16,11 27.0b2 | `17,3_27.0_24A5424a` | `26.4-23E5207q` |

**实操建议：直接对齐矩阵里的组合**。补丁是基于反汇编模式匹配的，未验证的版本组合很可能因为编译器代码生成变化导致某处补丁匹配失败。

## 五、常见问题与解决方案

### 5.1 `zsh: killed ./vphone-cli`

**原因**：AMFI / debug 限制未绕过，内核直接杀掉了带私有 entitlement 的自签名二进制。

**解决**：回到前置条件，二选一——设置 `amfi_get_out_of_my_way=1` boot-arg（需 SIP 完全关闭），或运行 `vphone-amfidont` 放行该二进制。仓库里也可以用 `make amfidont_allow_vphone`。

### 5.2 `Virtualization is not available on this hardware`

**原因**：你的 Mac 本身就是一台虚拟机，PV=3 guest 无法嵌套虚拟化。

**解决**：换一台非嵌套的 macOS 15+ 物理主机。没有 workaround。

### 5.3 卡在 "Press home to continue"

**原因**：虚拟机没有物理 Home 键。

**解决**：用 VNC 连进去，右键（双指点击）模拟 Home 键。

### 5.4 系统 App 装不上

**原因**：iOS 初始化时选了日本或欧盟地区，会触发 VM 无法满足的额外监管检查。

**解决**：设置向导里选美国等地区。这个坑很隐蔽——现象是"系统 App 静默安装失败"，很难联想到地区设置。

### 5.5 App 启动崩溃，`EXC_GUARD` / `GUARD_TYPE_MACH_PORT`

**原因**：Mach port guard 违规。常见于第三方 App 集成的崩溃上报 SDK。

**解决**：带 `--force-exc-guard` 重新打补丁，然后重跑 restore / cfw install：

```bash
vphone-cli fw patch <name> --variant <v> --force-exc-guard
```

iOS 18 基线上此补丁默认常开。对应 issue [#291](https://github.com/Lakr233/vphone-cli/issues/291)。

### 5.6 安装 `.ipa` / `.tipa`

用运行中 VM 的 Install 菜单——支持拖放或文件选择器。

### 5.7 `cfw install` 卡在重签某个系统二进制，内存无限增长

这是整份 FAQ 里最有技术含量的一条，值得完整拆解。

**现象**：`cfw install` 在重签某个系统二进制（例如 `Campo`）时挂住，`ldid` 进程内存持续攀升不收敛。

**根因**：`ldid-procursus` 直到 `2.1.5-procursus7`（当前 Homebrew stable）都存在的一个 UB bug——`bytes(uint64_t)` 调用 `__builtin_clzll(0)` 时没有零值保护。`__builtin_clzll(0)` 是未定义行为，在这个构建上解析出长度 `0`，随后下溢了一个无符号循环计数器，导致 `ldid` 一次写一个字节地往不断增长的缓冲区里塞数据，永不终止。

**触发条件**：**任何** entitlements plist 里含有整数值恰好为 `0` 的项——而部分真实的 Apple 系统二进制确实带这种 entitlement。

**解决**：上游已修但未进 tagged release，从源码重建：

```bash
# 已经中招的话先杀掉挂死的 ldid
sudo kill -9 <pid>

brew install --HEAD ldid-procursus
brew link --overwrite ldid-procursus
```

这条 FAQ 本身就是一份优秀的 debug 报告范本：从现象（挂住 + 内存增长）到根因（`__builtin_clzll(0)` UB → 长度 0 → 无符号下溢 → 无限循环）到触发条件（entitlement 整数值为 0）到修复路径，链条完整、可复现、可验证。遇到"内存无限增长的死循环"时，**去查是不是某个无符号计数器下溢了**，是相当高命中率的直觉。

### 5.8 其他实践提醒

- **磁盘空间**：iPhone IPSW + cloudOS IPSW + 解包 + 合并 + VM 磁盘，单台机器轻松吃掉上百 GB。`~/.vphone/ipsws/` 的跨 VM 缓存复用很关键，别随手删
- **`fw_patch_less` 必须 sudo**：Makefile 里有显式的 UID 检查，非 root 直接报错退出
- **变体互斥**：`setup_machine` 目标会检查 `JB=1`/`DEV=1`/`EXP=1`/`LESS=1` 是否同时给了多个，冲突即 fail fast

## 六、总结

vphone-cli 让我印象最深的不是"能跑虚拟 iPhone"这个结果，而是它把一件极度脆弱的事情做成了可维护的工程：

1. **补丁靠模式匹配而非硬编码偏移**。选 capstone 做反汇编、MachOKit 做 Mach-O 解析，换来的是跨十几个 iOS 版本复用同一套补丁逻辑的能力——那张兼容矩阵就是这个决策的回报。
2. **把绕过强度做成刻度盘**。`less` → `regular` → `dev` → `jb` → `exp` 五档，让"研究保真度"和"操作便利性"变成用户可以显式权衡的参数，而不是作者替所有人做的一次性妥协。
3. **拒绝静默失败**。启动前的 `--help` 探针、把补丁跳过的 `[-]` 行提升为测试失败、变体互斥的 fail fast 检查——都在对抗同一类问题：**流程"成功"了但结果是错的**。这在固件补丁领域是致命的。
4. **为 Agent 时代预留接口**。`vphone.sock` 那个"每个动作返回内联截图"的设计，配上 MCP 封装，几乎就是在说：这台虚拟 iPhone 的主要使用者可能不是人，而是模型。

需要清醒的是它的门槛：Apple Silicon、macOS 15+、放松 SIP/AMFI、宿主不能是 VM、上百 GB 磁盘。**放松 SIP/AMFI 是有实际安全代价的操作**，请只在专用的研究机上做，用方案 B（`csrutil enable --without debug` + `amfidont`）而不是彻底关掉 AMFI。

如果你在做 iOS 安全研究、移动端逆向，或者想给 App 搭一套真 iOS 内核上的自动化测试环境，这个项目值得认真投入时间。

**项目地址**：<https://github.com/Lakr233/vphone-cli>
**MCP 封装**：<https://github.com/pluginslab/vphone-mcp>
**致谢**：项目参考了 [wh1te4ever/super-tart-vphone-writeup](https://github.com/wh1te4ever/super-tart-vphone-writeup)
