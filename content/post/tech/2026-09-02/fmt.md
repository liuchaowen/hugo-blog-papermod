---
title: "{fmt}：现代 C++ 格式化库的性能与优雅"
date: 2026-09-02T20:04:00+08:00
description: "深入解析 GitHub Trending 热门项目 {fmt}——一个快速、安全、可扩展的 C++ 格式化库，实现了 C++20 std::format 和 C++23 std::print，性能比 printf 快 50%，比 iostreams 快数倍。"
author: "Cheman"
draft: false
tags: ["C++", "格式化", "开源", "GitHub", "性能优化"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个持续热门的项目：**{fmt}**，一个用现代 C++ 打造的高速格式化库，号称比 `printf` 还快 50%，同时又是 C++20 `std::format` 和 C++23 `std::print` 的参考实现。

## 一、项目概述

**{fmt}** 是由 Victor Zverovich 开发的开源 C++ 格式化库，旨在提供 `stdio` 和 `iostreams` 的快速、安全替代方案。它不仅是 C++20 `std::format` 和 C++23 `std::print` 的参考实现，更在性能、安全性和易用性上树立了行业标杆。

核心特性一览：

- **简洁的格式 API**：支持位置参数，方便国际化
- **C++20/C++23 标准实现**：`std::format` 和 `std::print` 的参考库
- **Python 风格语法**：格式字符串语法与 Python `str.format` 类似，降低学习成本
- **高性能浮点格式化**：使用 Dragonbox 算法实现 IEEE 754 浮点数的正确舍入、最短表示和往返保证
- **可移植 Unicode 支持**：跨平台一致的 Unicode 输出
- **安全的 printf 实现**：包含 POSIX 位置参数扩展
- **用户类型扩展**：支持自定义类型的格式化
- **极小代码体积**：最小配置仅需三个文件（`base.h`、`format.h`、`format-inl.h`）
- **MIT 许可证**：无外部依赖，商业友好

## 二、技术原理

### 架构设计

{fmt} 的核心架构分为几个层次：

1. **基础层（base.h）**：定义核心类型和接口，包括 `format_context`、`format_args` 等
2. **格式化层（format.h / format-inl.h）**：实现格式字符串解析和参数格式化逻辑
3. **扩展模块**：`chrono.h`（时间日期）、`color.h`（彩色输出）、`os.h`（操作系统 API）、`ranges.h`（容器范围）、`printf.h`（printf 兼容）

这种分层设计使得最小构建仅需基础格式化功能，用户按需引入扩展模块，有效控制编译时间和二进制体积。

### Dragonbox 浮点格式化算法

{fmt} 在浮点数格式化上实现了惊人的性能，核心在于采用了 [Dragonbox](https://github.com/jk-jeon/dragonbox) 算法。这是一个基于 Grisu 和 Ryū 改进的浮点数转十进制算法，保证了：

- **正确舍入**：输出最短的可以往返恢复的十进制表示
- **高性能**：比 `sprintf` 和 `to_chars` 快 20-30 倍

### 编译时格式字符串检查

在 C++20 下，{fmt} 能在编译时验证格式字符串：

```cpp
// 这行代码会在编译时报错，因为 "d" 不是 string 类型的有效格式说明符
std::string s = fmt::format("{:d}", "I am not a number");
```

这种编译时安全性是 `printf` 和 `iostreams` 无法提供的——`printf` 的格式错误只能在运行时被发现，而 {fmt} 直接将这类错误拦截在编译阶段。

### 性能对比

根据项目 README 中的基准测试（macOS 15.6.1，clang++ -O3，输出到 `/dev/null`，200 万次迭代）：

| 库 | 方法 | 运行时间 |
|---|---|---|
| libc | printf | 0.66s |
| libc++ | std::ostream | 1.63s |
| **{fmt} 12.1** | **fmt::print** | **0.44s** |
| Boost Format 1.88 | boost::format | 3.89s |
| Folly Format | folly::format | 1.28s |

{fmt} 比经典的 `printf` 快约 50%，比 `iostreams` 快 3.7 倍，比 Boost Format 快近 9 倍。

在编译时间和代码体积方面，{fmt} 也表现出色：

| 方法 | 编译时间 | 可执行文件大小 |
|---|---|---|
| printf | 1.6s | 54 KiB |
| IOStreams | 28.4s | 98 KiB |
| {fmt} | 5.0s | 54 KiB |
| tinyformat | 32.6s | 164 KiB |
| Boost Format | 55.0s | 530 KiB |

{fmt} 的编译速度和二进制体积与 `printf` 几乎持平，远优于其他 C++ 格式化方案。

## 三、安装与快速开始

### 环境要求

- C++11 或更高版本的编译器（GCC、Clang、MSVC 均可）
- CMake 3.8+

### 安装方式

**方式一：CMake FetchContent（推荐）**

```cmake
include(FetchContent)
FetchContent_Declare(
  fmt
  GIT_REPOSITORY https://github.com/fmtlib/fmt.git
  GIT_TAG master
)
FetchContent_MakeAvailable(fmt)
```

**方式二：Header-only 模式**

只需将 `include` 目录加入头文件搜索路径，并定义宏 `FMT_HEADER_ONLY`：

```cmake
add_definitions(-DFMT_HEADER_ONLY)
include_directories(path/to/fmt/include)
```

**方式三：系统安装（macOS）**

```bash
brew install fmt
```

### 最简示例

```cpp
#include <fmt/base.h>

int main() {
  fmt::print("Hello, world!\n");
}
```

编译运行：

```bash
g++ -std=c++17 hello.cpp -lfmt -o hello
./hello
# 输出: Hello, world!
```

## 四、使用方法与实战

### 基础格式化

```cpp
// 位置参数
std::string s = fmt::format("I'd rather be {1} than {0}.", "right", "happy");
// s == "I'd rather be happy than right."

// 数字格式化
std::string s = fmt::format("The answer is {}.", 42);
// s == "The answer is 42."
```

### 时间日期格式化

```cpp
#include <fmt/chrono.h>

auto now = std::chrono::system_clock::now();
fmt::print("Date and time: {}\n", now);
fmt::print("Time: {:%H:%M}\n", now);
// 输出:
// Date and time: 2023-12-26 19:10:31.557195597
// Time: 19:10
```

### 容器格式化

```cpp
#include <vector>
#include <fmt/ranges.h>

std::vector<int> v = {1, 2, 3};
fmt::print("{}\n", v);
// 输出: [1, 2, 3]
```

### 彩色输出

```cpp
#include <fmt/color.h>

fmt::print(fg(fmt::color::crimson) | fmt::emphasis::bold,
           "Hello, {}!\n", "world");
fmt::print(fg(fmt::color::steel_blue) | fmt::emphasis::italic,
           "你好{}！\n", "世界");
```

### 高性能文件写入

```cpp
#include <fmt/os.h>

auto out = fmt::output_file("guide.txt");
out.print("Don't {}", "Panic");
```

这种写入方式比 `fprintf` 快最高 9 倍，得益于优化的缓冲区大小策略。

### 自定义类型格式化

```cpp
#include <fmt/format.h>

struct Point {
  int x, y;
};

template <>
struct fmt::formatter<Point> {
  constexpr auto parse(format_parse_context& ctx) { return ctx.begin(); }
  auto format(const Point& p, format_context& ctx) const {
    return fmt::format_to(ctx.out(), "({}, {})", p.x, p.y);
  }
};

Point p{1, 2};
std::string s = fmt::format("Point: {}", p);
// s == "Point: (1, 2)"
```

## 五、常见问题与解决方案

### Q1: 链接错误 "undefined reference to fmt::v11::..."

**原因**：未正确链接 {fmt} 库或未启用 header-only 模式。

**解决方案**：

- 使用 CMake 时确保 `target_link_libraries(your_target fmt::fmt)`
- 或定义 `FMT_HEADER_ONLY` 宏使用头文件模式

### Q2: MSVC 下 Unicode 输出乱码

**原因**：MSVC 默认不使用 UTF-8 编码。

**解决方案**：{fmt} 在 MSVC 下需要 `/utf-8` 编译选项。如果使用 CMake 构建 {fmt}，库本身会自动添加此选项；但你的项目也需要确保使用 UTF-8 源文件编码。如果不需要 Unicode 支持，可以定义 `FMT_UNICODE=0` 禁用。

### Q3: 编译时间过长

**原因**：引入了不必要的头文件。

**解决方案**：

- 仅包含 `fmt/base.h` 和 `fmt/format.h`，按需引入 `chrono.h`、`color.h` 等
- 最小配置仅需三个文件：`base.h`、`format.h`、`format-inl.h`
- 编译时间约 5 秒，与 `printf` 相当

### Q4: 与 C++20 std::format 的关系

{fmt} 是 `std::format` 的参考实现，两者 API 高度一致。如果你的编译器已支持 C++20，可以直接使用 `std::format`；但 {fmt} 通常提供比标准库实现更好的性能和更多扩展功能（如彩色输出、文件写入等）。

## 六、总结

{fmt} 是 C++ 格式化领域的事实标准。它用简洁的 API、卓越的性能和严格的安全性，重新定义了 C++ 中字符串格式化的最佳实践。从 C++20 `std::format` 到 C++23 `std::print`，{fmt} 持续推动着 C++ 标准的演进。

这个库被众多重量级项目采用：**PyTorch**、**MongoDB**、**ClickHouse**、**Apple FoundationDB**、**Windows Terminal**、**Envoy**、**Ceph**、**Blizzard Battle.net**……这个名单本身就是 {fmt} 可靠性和性能的最佳背书。

如果你还在用 `printf` 或 `iostreams`，是时候迁移了。clang-tidy v18 甚至提供了 `modernize-use-std-print` 检查，可以自动将 `printf`/`fprintf` 调用转换为 `fmt::print`，迁移成本极低。

**项目地址**：[https://github.com/fmtlib/fmt](https://github.com/fmtlib/fmt)
**文档**：[https://fmt.dev](https://fmt.dev)
