---
title: "WebToApp：把整个 APK 工坊装进口袋，在 Android 手机上打包 Web、Node、PHP、Python 与 Go 应用"
date: 2026-09-08T14:05:00+08:00
description: "WebToApp 是一款开源 Android 应用，无需电脑即可在手机上把网页、HTML、Node.js、PHP、Python、Go 乃至 WordPress 打包成 APK/AAB，内置本地服务运行时、反审查网络栈与 MV3 扩展支持，并可直接签名上架 Google Play。"
author: "Cheman"
draft: false
tags: [GitHub, 开源, Android, APK, 工具]
categories: [技术, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**WebToApp**，它把"网站转 App"这件常被做成 WebView 套壳的小事，升级成了一座装在 Android 手机里的 APK 工坊——不依赖电脑、不依赖云端编译队列，就能把网页、HTML 前端、乃至 Node.js / PHP / Python / Go 服务端运行时直接打包成可安装的 APK。

## 一、项目概述

WebToApp 由 shiaho 开发，采用 The Unlicense 开源协议，定位是"在手机上构建 Android APK"。与大多数只做 URL 套壳的"网站转应用"工具有本质区别，它的能力边界更接近一个迷你 IDE + 打包器：

- **真·本地服务运行时**：Node.js 18.20、PHP 8.4（含 Composer 2.10）、Python 3.14、官方 Go 1.26、以及跑在本地 PHP + SQLite 上的 WordPress 7.x，全部以原生二进制 `fork+exec` 的方式在应用沙盒内运行，类似把 Termux 打包进了可安装的 APK。
- **加固的反审查网络栈**：DNS-over-HTTPS（7 家提供商）、TLS 指纹伪装（Chrome/Edge/Firefox/Safari 的 JA3 模板）配合本地 MITM 桥、Encrypted Client Hello（ECH，基于 GeckoView 加密 SNI）、按应用代理、以及针对受限 SPA 的 CORS 绕过。
- **完全自洽的构建链路**：AXML/ARSC 二进制补丁、权限裁剪、V1/V2/V3 签名、以及 Play 上架用的 AAB 导出，全部在应用内借助 `apksig` 完成。
- **可扩展**：无需重编宿主即可注入 JS/CSS 模块、Tampermonkey 式 userscript、或 MV3 Chrome 扩展（可从 Chrome 应用商店实时搜索安装）。
- **多语言宿主 UI**：开箱支持中文、English、العربية（RTL）、Português、Español、Français、Deutsch、Русский、日本語、한국어 共 10 种语言。

## 二、技术原理

### 2.1 三模块 Gradle 架构

仓库包含三个 Gradle 模块，关注点分离：

- `app`：完整的构建器与宿主应用本体；
- `shell`：被嵌入到生成 APK 中的运行时宿主；
- `clone-host`：克隆 App 所用的宿主代码，编译为 `classes.jar` 后经 `d8` 转 DEX，作为资源打包供 AppCloner 使用。

运行时代码只在 `app` 中维护，再同步进 `shell`，从而保证 WebView/运行时行为"单一事实来源"（`core/shell`、`core/webview`、`core/engine`、`core/extension`、`ui/shell` 等包）。

### 2.2 为什么生成的 APK 故意锁定 targetSdk = 28

这是整个项目最反直觉、也最关键的设计：

> 生成 APK 绑定 `targetSdk = 28`（经由 shell 模板），正是它让 APK 能够从应用存储 `fork+exec` 原生运行时（Node.js、PHP、Python、Go、WordPress）——这是 URL 套壳工具做不到的能力。

原因在于：当 `targetSdk >= 29` 时，Android 强制启用 SELinux W^X（写时不可执行）限制，会直接阻断对打包二进制的 `fork+exec`。因此服务端运行时类应用必须锁在 28。

宿主应用自身则 `targetSdk = 35`（杀毒引擎会把低 targetSdk 的包标记为"遗留/可疑软件"）。在 35 下，宿主侧预览 exec 类运行时受 W^X 限制会降级并给出明确提示——但 Node.js 的 JNI 预览和所有导出的 App 不受影响。对于 Play 分发，AAB 导出器会单独把 `targetSdk` 重写为 Play 要求的 36 并本地生成 protobuf 元数据。纯 WebView 类应用（Web/HTML/Frontend/Gallery/Media/MultiWeb）可在导出面板自行提升至 34/35/36；服务运行时类则被强制锁在 28。

### 2.3 二进制级 APK 构建

构建器在二进制层面对模板 APK 做 AXML/ARSC 补丁、注入配置与资源、裁剪未用权限，再用 `apksig` 签名。加密构建路径 `EncryptedApkBuilder` 额外提供资源加密、加壳与完整性校验。配置中枢是 `WebApp`（`data/model/WebApp.kt`）及其 `*Config` 系列类——全量功能开关的单一事实来源，并贯穿整条打包透传链注入到生成 APK 中。

### 2.4 本地运行时如何拿到 DNS 与出站

`Go 1.26` 走官方 Linux arm64 工具链（来自 `dl.google.com`，国内走 USTC 镜像），在设备上 `go build` / `go mod` / `go run`，DNS 与 CA 信任经由与 PHP 相同的本地 JVM 桥。原生 Node（`:nodejs` 专属 OS 进程，经 `node_launcher` 加载 `libnode.so`）、PHP、Python 也都通过这条**本地 DNS 桥代理**（在 Android JVM 内做 HTTP CONNECT）获得在 musl/打包二进制无法触及系统解析器时的可用 DNS 与外网 HTTP。

### 2.5 技术栈一览

| 领域 | 选型 |
| --- | --- |
| 语言/UI | Kotlin、Jetpack Compose、Material 3 |
| 依赖注入 | Koin |
| 持久化 | Room 2.7.2 + KSP |
| 网络 | OkHttp 4.12.0 + `okhttp-dnsoverhttps` |
| 签名 | `com.android.tools.build:apksig` 8.3.0、BouncyCastle 1.78.1 |
| AAB 元数据 | `protobuf-javalite` 3.25.5 |
| 可选引擎 | GeckoView（原生库首次使用下载） |
| 图片/模糊 | Coil、Haze |
| 图表/二维码 | Vico Compose-M3、ZXing |

## 三、安装与快速开始

要求：Android Studio Hedgehog 及以上、JDK 17，Gradle 包装器固定 Gradle 9.4.1。

```bash
git clone https://github.com/shiaho777/web-to-app.git
cd web-to-app
./gradlew assembleDebug
```

Release 构建需在 `local.properties` 与 `app/build.gradle.kts` 中配置签名。

对普通用户而言，真正的使用路径是安装编译好的宿主 App，然后在应用内选择"输入类型 → 打包/导出 APK"，原生运行时与 GeckoView 的原生库均在首次使用时按需下载，而非塞进基础 APK。

## 四、使用方法与实战

### 4.1 七种输入与目标

| 输入 | 输出 | 适合 |
| --- | --- | --- |
| 网站 URL | WebView APK | 落地页、工具、仪表盘、文档、内部系统 |
| HTML/静态前端 | 本地服务 APK | React/Vue/Vite、静态构建、离线 Web 应用 |
| Node/PHP/Python/Go | 带本地服务的 APK | 小型服务端、管理后台、Demo、原型 |
| WordPress | 本地 PHP+SQLite 运行 | 可移植站点、主题/插件 Demo |
| 图片/视频/相册 | 媒体 APK | 相册、课程、作品集、离线查看器 |

### 4.2 内置 Agent：用自然语言驱动整个工坊

WebToApp 内置 AI Agent（从 `⋮ → Agent` 进入），通过任意你配置的 LLM 端点（Chat Completions / Anthropic Messages / OpenAI Responses / Gemini / Ollama / LM Studio / VLLM）以 tool-calling 循环操作整个应用。它提供最多 57 个内置工具，覆盖文件、应用生命周期、端口与引擎、运行时、广告拦截、统计与健康、克隆、构建合规、模块与交互等域；只读工具立即执行，写操作先弹权限框；遇到 429/5xx 自动退避重试，并支持 Plan 模式（提议→批准→执行）。

### 4.3 社区模块市场

`modules/` 目录下的文件即模块目录，贡献走普通 PR 流程：应用只展示同时出现在 `registry.json` 与 `submissions.json` 的模块，保证应用内目录与实际合并的 PR 一致。默认客户端缓存 1 小时，合并的模块无需发版即可生效。MV3 浏览器扩展则改为在"Browser Extensions"标签内实时搜索 Chrome 应用商店并一键安装。

## 五、常见问题与解决方案

- **生成的 App 无法启动本地服务（fork+exec 失败）**：几乎都源于 `targetSdk` 被提升到 29+ 触发 W^X。服务端运行时类应用必须保持 28；纯前端类可在导出面板提升，但别把服务类也提上去。
- **首次打包后体积异常或运行慢**：原生运行时（Node/PHP/Python/Go）与 GeckoView 的 `.so` / `omni.ja` 是首次使用时按需下载，而非内置于基础 APK，首次需联网且耗流量。
- **想上架 Google Play 报 targetSdk 过低**：使用一键 AAB 导出，导出器会把 `targetSdk` 重写为 Play 要求的 36 并本地生成 protobuf 元数据；宿主 App 自身已是 35。
- **ECH / SNI 加密不生效**：ECH 仅 GeckoView 引擎支持；在设置中开启后会自动联动 DoH + GeckoView。
- **中国大陆访问商店/文档慢**：模块目录与图标走全球镜像优先，`raw.githubusercontent.com` 与 jsDelivr 自动兜底；Go 工具链国内走 USTC 镜像。
- **资源被反编译提取**：开启资源加密（PBKDF2 + AES-256-GCM），运行时进一步抗调试 / 抗 Frida / DEX 篡改，威胁响应可选日志、静默退出或随机崩溃。

## 六、总结

WebToApp 把"网站转 App"从一句 WebView 套壳的玩笑，做成了一个真能在手机上完成的、带本地服务运行时、加固网络栈与可扩展模块生态的 APK 工坊。它最聪明的取舍是把生成的运行时 APK 锁在 `targetSdk = 28` 以保住 `fork+exec` 能力，同时用单独的 AAB 导出链路满足 Play 的 36 要求。无论你是想给落地页做个离线壳、把内部小工具装上手机，还是研究安卓打包与反审查网络栈，`git clone` 下来玩一遍都挺值。
