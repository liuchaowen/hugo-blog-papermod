---
title: "Dioxus 0.8：用 Rust 写跨平台应用，一套代码覆盖 Web、桌面、移动端"
date: 2026-07-23
description: "Dioxus 是一个用 Rust 编写的跨平台 UI 框架，支持 Web、桌面、移动端、SSR 等平台，一套代码多端运行。本文深入解析其核心理念、技术架构与快速上手指南。"
author: "Cheman"
slug: dioxus
draft: false
categories: ["技术", "开源"]
tags: ["Rust", "跨平台", "UI框架", "WebAssembly", "Dioxus"]
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

今天在 GitHub Trending 上看到一个值得关注的项目：**Dioxus**，一个用 Rust 编写的声明式 UI 框架，用**一套代码**即可同时构建 Web（WebAssembly）、桌面（macOS/Linux/Windows）、移动端（iOS/Android）乃至 SSR 全栈应用，项目已获得 33k+ Star，核心团队由 FutureWei 等资助全职开发。

## 一、项目概述

Dioxus 的核心设计哲学是"**Write Once, Deploy Anywhere**"——不同于 Electron（打包整个 Chromium）带来的体积问题，Dioxus 利用 Rust 编译器和 WebAssembly 技术，生成的 Web 应用体积可小至 **50kb**，桌面应用二进制文件小于 **5MB**，性能与原生应用无异。

### 核心特性一览

- **声明式 UI**：采用类似 React JSX 的 `rsx!` 宏语法，Rust 程序员零学习曲线
- **信号（Signals）状态管理**：借鉴 SolidJS 细粒度响应式模型，比 React 的虚拟 DOM 渲染更高效
- **一体化全栈框架**：内置 axum 集成，支持 SSR、Server Functions、WebSockets、SSE 等服务端能力
- **零配置 CLI**：`dx serve` 开箱即用，带热重载（HMR）支持，Rust 代码热修复亚秒级完成
- **原生移动端支持**：直接调用 JNI（Android）和 Objective-C（iOS）原生 API，无需 WebView
- **多渲染器后端**：支持 Web DOM、Webview、WebGPU（WGPU 实验性）、SSR、LiveView 等多种渲染路径

## 二、技术原理

### 2.1 架构设计

Dioxus 的架构分为两层：**核心层（core）** 和**平台层**。

```
dioxus-core        → 跨平台渲染逻辑、Virtual DOM / 虚拟树
dioxus-signals     → 响应式状态管理，细粒度依赖追踪
dioxus-rsx         → JSX-like 宏解析，编译时优化
dioxus-html        → 所有 HTML 元素的类型定义
dioxus-web         → Web 平台渲染器（wasm-bindgen → DOM）
dioxus-desktop     → WebView 渲染器（wry/tao → 系统窗口）
dioxus-mobile      → iOS/Android 原生渲染
dioxus-ssr         → 服务端渲染
dioxus-fullstack   → 端到端全栈集成（axum）
```

从 `Cargo.toml` 可以看到项目采用了 **workspace 架构**，所有子包统一版本管理，核心依赖包括 `syn`、`quote`、`proc-macro2` 用于过程宏展开，`slotmap` 管理虚拟 DOM 节点生命周期，`rustc-hash` 提供高性能哈希。

### 2.2 细粒度响应式信号

Dioxus 的状态管理是最大亮点。它借鉴了 SolidJS 的 Signals 模式，每个信号都是独立订阅单元，组件只在实际使用的信号变化时才重新渲染：

```rust
fn app() -> Element {
    let mut count = use_signal(|| 0);

    rsx! {
        h1 { "High-Five counter: {count}" }
        button { onclick: move |_| count += 1, "Up high!" }
        button { onclick: move |_| count -= 1, "Down low!" }
    }
}
```

对比 React 需要手动 `useState` + `setCount` 分离读写，Dioxus 的 `count += 1` 直接触发精确更新，无需中间层。

### 2.3 Server Functions：前后端类型安全通信

Dioxus 全栈最优雅的设计之一是 **Server Functions**——前后端通过同一个 Rust 函数签名自动生成类型安全的 RPC 调用：

```rust
#[server]
async fn fetch_weather(city: String) -> Result<Weather, ServerFnError> {
    // 这段代码只在服务端执行
    WeatherApi::new().get(&city).await
}

// 前端调用——和普通异步函数一样
let weather = use_resource(move || fetch_weather(city.clone()));
```

前后端通信通过 axum 的 extractors 和自定义 wire format 实现，错误类型也自动序列化传递。

### 2.4 全栈能力矩阵

| 能力 | 实现方式 |
|------|---------|
| SSR | `dioxus-ssr` 直接渲染 Virtual DOM 为 HTML 字符串 |
| Hydration | 复用 SSR 生成的 HTML，客户端接管交互 |
| WebSockets | axum `tower-web` 集成 |
| SSE | axum `axum::SSE` 流式响应 |
| 文件上传/下载 | `FormData` + axum multipart |
| 增量静态再生 | 服务端缓存 + 客户端 SWR 模式 |

## 三、安装与快速开始

### 环境要求

- Rust 1.85.0+（见 `Cargo.toml` 中 `rust-version = "1.85.0"`）
- Node.js（仅 Web 平台需要，用于 npm 包管理）

### 安装 Dioxus CLI

```bash
# 推荐方式：一键安装（自动下载预编译二进制）
curl -fsSL https://dioxuslabs.com/install.sh | bash

# 或通过 cargo 安装
cargo install --git https://github.com/DioxusLabs/dioxus dioxus-cli --locked
```

### 创建新项目

```bash
# 初始化一个完整项目（含路由、样式、热重载）
dx create my-app
cd my-app
dx serve
```

项目目录结构（以 workspace 根项目为例）：

```
dioxus/
├── packages/
│   ├── core/          ← 核心渲染引擎
│   ├── signals/        ← 响应式状态
│   ├── web/           ← Web 渲染器
│   ├── desktop/       ← 桌面渲染器
│   ├── fullstack/     ← 全栈集成
│   └── ...
└── examples/
    ├── 01-app-demos/  ← 完整应用示例
    ├── 07-fullstack/ ← 全栈示例
    └── ...
```

### Web 平台运行

```bash
# 在 examples 中选择示例运行
cargo run --example todomvc

# 或用 CLI 指定 Web 平台
dx serve --example router --platform web -- --no-default-features
```

## 四、使用方法与实战

### 4.1 路由与导航

```rust
use dioxus::prelude::*;
use dioxus_router::prelude::*;

#[component]
fn Home() -> Element {
    rsx! { h1 { "欢迎首页" } }
}

#[component]
fn BlogPost(cx: Scope, id: i32) -> Element {
    rsx! { p { "文章 ID: {id}" } }
}

#[component]
fn App(cx: Scope) -> Element {
    let routes = use_route(cx);
    rsx! {
        Router {
            Route { to: "/", Home {} }
            Route { to: "/blog/:id", BlogPost {} }
        }
    }
}
```

### 4.2 样式与 CSS 集成

Dioxus 使用纯 HTML/CSS 构建界面，支持任意 CSS 方案：

```rust
rsx! {
    div { class: "container",
        // 内联样式
        style: "display: flex; gap: 16px;",

        // 或加载外部样式表（通过 manganis 资源管理）
        link { rel: "stylesheet", href: "/public/tailwind.css" }
    }
}
```

Dioxus 还内置 TailwindCSS 支持，只需在 `dioxus.toml` 中启用即可。

### 4.3 移动端构建

```bash
# Android（需要 Android SDK）
dx bundle --platform android

# iOS（需要 Xcode）
dx bundle --platform ios
```

构建产物分别为 `.apk` 和 `.ipa`，无需额外配置打包脚本。

## 五、常见问题与解决方案

### Q1: `dx serve` 报错 "not a dioxus project"

确保当前目录包含 `Dioxus.toml` 配置文件，或在项目根目录运行：

```bash
dx init
dx serve
```

### Q2: Web 平台编译慢（首次构建 5-10 分钟）

WebAssembly 编译本身较慢属正常现象。Dioxus 提供了 `dx serve --hotpatch` 模式，**仅重编译变更的 Rust 模块**，后续修改热修复可在亚秒内完成。对于大型项目，可关闭 `default-features` 中不需要的包：

```toml
# Cargo.toml
dioxus = { version = "0.8", default-features = false, features = ["web", "router"] }
```

### Q3: 热重载不生效

- 确保使用的是 `dx serve` 而非 `cargo run`
- 检查 `Dioxus.toml` 中 `watch_path` 配置是否包含源码目录
- 对于 `wasm32` 目标，`dx serve --hotpatch` 需要目标平台支持

### Q4: 全栈 Server Functions 401/403 错误

Server Functions 默认需要 CSRF token，在 axum 服务端注册时需要显式添加：

```rust
use dioxus_fullstack::prelude::*;

fn main() {
    axum::Server::bind(&"0.0.0.0:8080".parse().unwrap())
        .serve(
            axum::Router::new()
                .serve_dioxus_game(GameConfig::Tokio)
                .into_make_service(),
        );
}
```

### Q5: 移动端 API 调用报错

移动端访问 HTTP 服务需要在 `Info.plist`（iOS）和 `AndroidManifest.xml` 中声明网络权限。

## 六、总结

Dioxus 正在成为 Rust 生态中最具野心的跨平台 UI 框架——它不仅解决了"用 Rust 写前端"的问题，更通过 Signals 响应式模型、Server Functions 全栈集成和零配置 CLI，将开发体验提升到了接近现代 Web 框架的水平。

如果你追求**极致性能 + 跨平台覆盖**，Dioxus 值得关注。Web 应用小至 50kb 的包体积、桌面应用小于 5MB 的二进制，配合 `dx serve` 的亚秒级热重载，开发效率也不输 Node.js 生态。

- 官网：https://dioxuslabs.com
- 文档：https://dioxuslabs.com/learn/0.7/
- 示例仓库：https://github.com/DioxusLabs/dioxus/tree/main/examples
