---
title: "ipatool：用命令行搜索并下载 App Store 应用 IPA 包的利器"
date: 2026-08-30
description: "majd/ipatool 是一款用 Go 编写的命令行工具，可在终端中搜索 App Store（iOS/iPadOS/tvOS/visionOS）应用并下载其 IPA 安装包。本文从功能定位、技术原理（purego 调用原生框架、plist/Mach-O 解析、FairPlay 加密包下载）到认证、搜索、购买、下载全流程实战进行拆解。"
author: "Cheman"
slug: ipatool
draft: false
categories: [工具, 开源]
tags: [GitHub, 开源, 命令行, Go, iOS, App Store]
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

今天在 GitHub Trending 上看到一个实用的开源项目：**ipatool**——一款能让你在命令行里搜索 App Store 应用、并把应用安装包（IPA）下载到本地的工具。对做 iOS 逆向、企业内部分发、离线归档或安全研究的人来说，它把原本需要 iTunes / Apple Configurator 才能完成的"抓包"动作变成了几行命令。

## 一、项目概述

`ipatool` 是一个命令行工具，允许你搜索 iOS、iPadOS、tvOS 和 visionOS 平台上的 App Store 应用，并下载应用的安装包——也就是 _ipa_ 文件。它的核心价值在于：**把 App Store 的"搜索 + 下载 IPA"这一整套流程搬到了纯命令行环境**，因此可以被脚本、CI 或自动化工具调用。

项目由 `majd` 维护，使用 Go 编写，采用 MIT 许可证发布。主要能力包括：

- **跨平台搜索**：支持 iPhone（iOS）、iPad（iPadOS）、Apple TV（tvOS）、Vision Pro（visionOS）四大平台。
- **账号认证**：通过 Apple ID 登录 App Store，凭证保存在系统钥匙串中。
- **购买授权**：为已购买的应用获取下载许可证（license）。
- **版本枚举与下载**：列出某个应用所有可用版本，并下载指定版本的（加密）IPA 包。

需要注意：下载得到的是**加密的 IPA 包**，其解密（FairPlay DRM）属于另一层面的话题，ipatool 本身负责"把包从苹果服务器拉到本地"。

## 二、技术原理

### 架构与命令设计

ipatool 基于 `cobra` 构建命令行，整体是一棵命令树：`auth`（认证）、`search`（搜索）、`purchase`（购买授权）、`list-purchases`（列出已购）、`list-versions`（列出版本）、`download`（下载）、`get-version-metadata`（解析版本元数据）。入口极简：

```go
package main

import (
	"os"

	"github.com/majd/ipatool/v2/cmd"
)

func main() {
	os.Exit(cmd.Execute())
}
```

`go.mod` 显示模块路径为 `github.com/majd/ipatool/v2`，要求 Go 1.25，说明项目已经迭代到第二代架构，依赖了大量现代 Go 生态库。

### 核心技术栈与选型理由

从 `go.mod` 的依赖可以反推其实现思路：

| 依赖 | 作用 |
| --- | --- |
| `github.com/ebitengine/purego` | **关键**：无需 cgo 即可在 Go 中调用原生 C/Objective-C 框架（如 macOS 上的 Security、iTunes 相关框架），用于 App Store 认证与会话处理 |
| `github.com/byteness/keyring` + `github.com/byteness/go-keychain` | 跨平台凭证存储，macOS 上对接系统钥匙串；`noamcohen97/touchid-go` 支持 Touch ID 解锁钥匙串 |
| `howett.net/plist` | 解析苹果 Property List（plist）格式，App Store 通信与 IPA 元数据中大量使用 |
| `github.com/blacktop/go-macho` | 解析 Mach-O 二进制（IPA 本质是一个 zip，内部是可执行 Mach-O），用于读取 app 的架构、bundle 等信息 |
| `github.com/bodgit/sevenzip` + `github.com/klauspost/compress` | 处理压缩格式，IPA 的解包/分析用到 |
| `github.com/juju/persistent-cookiejar` | 持久化登录后的 Cookie，维持 App Store 会话 |
| `howett.net/ranger` | 支持 HTTP Range 请求，便于断点续传式下载大体积 IPA |
| `github.com/avast/retry-go` | 对网络请求做重试，提升在弱网下的健壮性 |
| `github.com/spf13/cobra` + `github.com/thediveo/enumflag/v2` | CLI 框架与枚举型 flag（如 `--platform`） |
| `github.com/rs/zerolog` + `github.com/schollz/progressbar/v3` | 结构化日志与下载进度条 |

### 数据流：从搜索到下载

一次完整的下载大致经历以下步骤：

1. **认证**（`auth login`）：用 Apple ID 登录，凭证经钥匙串加密保存；后续请求复用持久化的 Cookie 会话。
2. **搜索**（`search <term>`）：向 App Store 搜索接口查询，返回应用列表与 `app-id` / `bundle-identifier`。
3. **购买授权**（`purchase -b <bundle-id>`）：为账号获取该应用的下载许可证（若已购买则直接复用）。
4. **枚举版本**（`list-versions`）：拿到应用所有可下载的 `external-version-id`。
5. **下载**（`download`）：携带会话与许可证，从苹果内容分发服务器拉取（加密）IPA，必要时用 Range 请求分片下载。

值得注意的是 `purego` 的引入：它让 tool 不依赖 cgo 就能调用系统原生库，既保持跨平台编译的便利性，又能触达苹果私有的认证/加密接口——这正是 ipatool 能"假装成一个真实 App Store 客户端"的技术基础。

## 三、安装与快速开始

### 环境要求

- 受支持的操作系统：Windows、Linux 或 macOS。
- 一个已注册并能正常登录 App Store 的 Apple ID。

### 安装方式

**方式一：Homebrew（macOS 推荐）**

```shell
$ brew install ipatool
```

**方式二：从 GitHub Releases 手动下载**

前往 [releases 页面](https://github.com/majd/ipatool/releases) 获取对应平台的预编译二进制。

**方式三：从源码编译**

需要 Go 1.25 工具链：

```shell
$ go build -o ipatool
```

## 四、使用方法与实战

> 默认以交互模式运行；若在自动化/脚本环境使用，请加上 `--non-interactive` 与 `--format json`。

### 1. 登录 App Store

```text
$ ipatool auth login
# 按提示输入 Apple ID 与密码
$ ipatool auth info     # 查看当前账号信息
$ ipatool auth revoke   # 撤销凭证
```

### 2. 搜索应用

```text
$ ipatool search "telegram" --limit 10 --platform iphone
```

- `--platform` 可选：`iphone` / `ipad` / `appletv` / `visionos`。
- `--limit` 控制返回条数（visionOS 最多 12）。

### 3. 获取下载授权

```text
$ ipatool purchase -b com.atebits.Tweetie2
```

通过 `--bundle-identifier` 为当前账号取得该应用的许可证。

### 4. 列出已购与可用版本

```text
$ ipatool list-purchases --page 1 --max-results 10
$ ipatool list-versions -b com.atebits.Tweetie2
```

### 5. 下载 IPA

```text
$ ipatool download \
    -b com.atebits.Tweetie2 \
    --purchase \
    --output ./out/app.ipa
```

关键选项：
- `-b/--bundle-identifier` 或 `-i/--app-id` 指定目标。
- `--external-version-id` 下载指定版本（不填则默认最新）。
- `--purchase` 在下载前自动补授权。
- `--platform` 指定下载目标平台。

## 五、常见问题与解决方案

**Q1：登录时提示凭证无法保存 / 钥匙串相关报错？**
依赖 `byteness/keyring` 与 `go-keychain`，在 macOS 上需要访问系统钥匙串；若在 CI 等非交互环境，使用 `--keychain-passphrase` 配合 `--non-interactive`，或用环境变量注入，避免交互式 Touch ID 弹窗。

**Q2：下载失败或中途断流？**
网络层用 `retry-go` 做了重试，但仍建议在网络稳定时操作；大体积 IPA 借助 `ranger` 支持 Range 请求，可复用会话重试。

**Q3：下载下来的 IPA 是加密的，怎么用？**
ipatool 的 `download` 明确标注为下载"加密"包，FairPlay 解密不在其职责范围内，需要配合其他逆向工具链处理——它负责的是"搬运"。

**Q4：如何在脚本里自动化？**
所有命令都接受 `--non-interactive` 与 `--format json`，可将输出解析后串联到流水线中，非常适合做归档或批量抓取。

**Q5：支持哪些平台的应用？**
iOS、iPadOS、tvOS、visionOS 全覆盖，通过 `--platform` 区分；注意不同平台搜索条数上限略有差异。

## 六、总结

ipatool 把"搜索 App Store + 下载 IPA"这件原本依赖图形化工具的事，变成了一个干净、可脚本化的命令行工具。它在工程上的亮点在于用 `purego` 无 cgo 地调用原生框架、用 `plist` / `go-macho` 处理苹果专属格式、用钥匙串安全地管理凭证，整体设计务实而克制（MIT 许可证也利于二次开发）。如果你有 iOS 应用归档、离线分发或安全研究的诉求，值得把它加入工具箱。

- 项目地址：<https://github.com/majd/ipatool>
- 许可证：MIT
- FAQ 与发布说明：见项目 [Wiki](https://github.com/majd/ipatool/wiki/FAQ) 与 [Releases](https://github.com/majd/ipatool/releases)
