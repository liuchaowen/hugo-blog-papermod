---
title: "SWC：用 Rust 重写的超快 JavaScript/TypeScript 编译器"
date: 2026-06-14
description: "SWC（Speedy Web Compiler）是基于 Rust 的高性能 JavaScript/TypeScript 编译器，可替代 Babel 实现转译与压缩，速度提升 20 倍以上，已被 Next.js、Turbopack 等主流工具链广泛采用。"
author: "Cheman"
slug: swc
draft: false
categories: ["技术", "开源"]
tags: ["SWC", "Rust", "JavaScript", "TypeScript", "编译器", "前端工程化"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**SWC**，一个用 Rust 编写的超快 JavaScript/TypeScript 编译器，目标是让 Web 开发更快——而且是真正意义上的"快"。

## 一、项目概述

SWC（Speedy Web Compiler）是一个基于 Rust 的高性能 JavaScript/TypeScript 编译器，同时提供 Rust 和 JavaScript 两种语言绑定。它能够完成代码转译（transpilation）、类型剥离（type stripping）、代码压缩（minification）等核心编译任务，性能相比 Babel 提升 20 倍以上。

核心特性：

- **极致性能**：Rust 原生实现 + 多线程并行，转译速度远超 Babel
- **Babel 兼容**：支持从 Babel 迁移，覆盖主流 plugin 生态
- **双语言绑定**：Rust 端通过 `swc` crate 使用，JavaScript 端通过 `@swc/core` 使用
- **生态集成**：Next.js 13+ 默认使用 SWC，Turbopack 也基于 SWC 构建
- **插件系统**：支持 WASM 插件，可扩展自定义转换逻辑

## 二、技术原理

### 架构设计

SWC 采用经典的编译器多阶段管线架构：

```
Source Code → Parser → AST → Transforms → Code Generator → Output
```

核心模块包括：

- **Parser**（`swc_ecma_parser`）：将 JavaScript/TypeScript 源码解析为 AST，基于手写递归下降解析器
- **AST 定义**（`swc_ecma_ast`）：ECMAScript AST 节点类型，使用 `#[ast_node]` 宏自动派生序列化
- **Transforms**（`swc_ecma_transforms_*`）：一系列 pass 对 AST 进行转换，包括 ES2015+ 降级、TypeScript 剥离、压缩优化等
- **Code Generator**（`swc_ecma_codegen`）：将转换后的 AST 重新生成目标代码 + Source Map

### 多线程并行

从 `Cargo.toml` 依赖可以看到 `rayon`、`dashmap`、`par-core`/`par-iter` 等，SWC 大量使用并行处理：

```rust
// par-core 提供并行迭代抽象
use par_core::Parallel;

// 多文件并行转译
inputs.into_par_iter().map(|input| {
    let fm = cm.new_source_file(…);
    let module = parser.parse()?;
    transforms.apply(&mut module);
    emitter.emit(&module)
}).collect();
```

### 性能优化策略

从 `Cargo.toml` 的 profile 配置可以看出 SWC 对性能的极致追求：

```toml
[profile.release]
lto = "fat"           # 全链接时优化
strip = "symbols"     # 去除调试符号
codegen-units = 1     # 单编译单元，牺牲编译速度换运行性能
panic = "abort"       # 去除 unwinding 代码，减小二进制体积

# 关键 crate 逐个调优 opt-level
[profile.release.package.swc_ecma_parser]
opt-level = 3         # 解析器最高优化
[profile.release.package.swc_ecma_minifier]
opt-level = 3         # 压缩器最高优化
```

### Node.js 绑定

SWC 通过 `napi-rs`（`napi`/`napi-derive`）实现 Node.js 原生绑定，`@swc/core` 的核心逻辑全部在 Rust 侧完成，JavaScript 侧仅做薄封装：

```json
// package.json 标识 pnpm workspace 管理
{
  "name": "@swc/workspace",
  "packageManager": "pnpm@10.33.3",
  "workspaces": ["./packages/*", "./bindings/*"]
}
```

### 插件架构

SWC 插件基于 WASM 运行时（`wasmer`/`wasmtime`），用户可用 Rust 编写插件编译为 WASM，在安全沙箱中运行：

```toml
# Cargo.toml 中的 WASM 运行时依赖
wasmer = { version = "6.1.0-rc.3", default-features = false }
wasmtime = { version = "38", default-features = false }
```

## 三、安装与快速开始

### 环境要求

- Node.js >= 20（开发）/ Node.js >= 10（使用）
- Rust MSRV 1.73（Rust 端开发）

### 安装

```bash
# JavaScript 端（最常用）
npm install --save-dev @swc/core @swc/cli

# Rust 端
cargo add swc
```

### 最简示例

```javascript
// swc.config.js
module.exports = {
  jsc: {
    parser: {
      syntax: "typescript",
      tsx: true,
    },
    transform: {
      react: {
        runtime: "automatic",
      },
    },
    target: "es2015",
  },
};
```

```bash
# 命令行转译
npx swc src/ --out-dir dist/
```

### Rust 端使用

```rust
use swc::Compiler;
use swc_common::sync::Lrc;
use swc_common::SourceMap;

let cm: Lrc<SourceMap> = Default::default();
let compiler = Compiler::new(cm);

let output = compiler.process_js_file( fm, &options)?;
println!("{}", output.code);
```

## 四、使用方法与实战

### 替代 Babel

SWC 提供了完整的 Babel 迁移指南，大部分 Babel 配置可直接映射：

```json
{
  "presets": ["@babel/preset-env", "@babel/preset-typescript"]
}
```

等价于 SWC 配置：

```json
{
  "jsc": {
    "parser": { "syntax": "typescript" },
    "target": "es2015",
    "experimental": { "plugins": [] }
  },
  "env": {
    "targets": { "chrome": "80" }
  }
}
```

### 代码压缩

```javascript
const swc = require("@swc/core");

const result = await swc.minify(code, {
  compress: true,
  mangle: true,
  format: { comments: false },
});
```

### 与 Webpack 集成

```bash
npm install --save-dev swc-loader
```

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        use: "swc-loader",
      },
    ],
  },
};
```

### Next.js 中自动启用

Next.js 13+ 默认使用 SWC，无需额外配置：

```bash
npx create-next-app@latest
# 自动使用 SWC 编译 TypeScript 和 JSX
```

## 五、常见问题与解决方案

### 安装 @swc/core 失败

**问题**：`npm install @swc/core` 报平台二进制下载失败。

**解决**：
```bash
# 清除缓存重试
npm cache clean --force
# 或指定平台
npm install @swc/core --platform=darwin-arm64
# 网络问题可设置镜像
npm config set swc_binary_site https://npmmirror.com/mirrors/swc
```

### 与 Babel 插件不兼容

**问题**：某些 Babel 插件在 SWC 中找不到对应实现。

**解决**：SWC 支持 WASM 插件扩展，可编写自定义插件。社区也在持续补充插件覆盖度，查看 [swc.rs/docs/migrating-from-babel](https://swc.rs/docs/migrating-from-babel) 中的兼容性表。

### 压缩结果与 Terser 不一致

**问题**：SWC minify 输出与 Terser 有细微差异。

**解决**：SWC 的压缩器仍在快速迭代，对于生产环境可先用 `compress: true, mangle: false` 验证功能正确性，再逐步开启 mangle。

### Rust MSRV 问题

**问题**：编译 SWC Rust crate 时 Rust 版本不满足。

**解决**：
```bash
rustup update stable
# SWC MSRV 为 1.73，确保 Rust >= 1.73
```

## 六、总结

SWC 用 Rust 重新定义了前端编译的性能上限。通过 LTO、并行解析、WASM 插件沙箱等工程手段，它在保持与 Babel 高度兼容的同时，将编译速度提升了一个数量级。无论你是想加速现有项目的构建，还是探索 Rust + WebAssembly 的技术前沿，SWC 都值得深入体验。

项目地址：[https://github.com/swc-project/swc](https://github.com/swc-project/swc)
