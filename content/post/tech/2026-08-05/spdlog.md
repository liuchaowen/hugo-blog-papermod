---
title: "spdlog：速度极快的 C++ 日志库"
date: "2026-08-05"
description: "spdlog 是一个高性能 C++ 日志库，支持头文件和编译两种使用模式，提供异步日志、多 Sink（文件、控制台、syslog 等）、运行时日志级别过滤、彩色输出等丰富功能，安装方式覆盖主流包管理器。"
author: "Cheman"
slug: spdlog
draft: false
categories: ["技术", "开源"]
tags: ["C++", "日志库", "开源", "高性能"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**spdlog**，这是一个久经考验、高性能的 C++ 日志库，GitHub 星标超过 15k，被众多知名项目（如 Chromium、LLVM、OpenCV 等）广泛使用。

## 一、项目概述

spdlog（全称 "speed log"）诞生于 2014 年，专为高性能 C++ 应用设计。其核心设计哲学是：**零成本抽象**——日志调用在关闭对应日志级别时应该完全不产生开销，而在开启时也要保持极致的性能。

**核心特性：**
- 极快的性能：单线程下每秒可处理超过 500 万次日志调用
- 两种使用模式：头文件模式（零配置）和编译模式（更好的编译时间）
- 异步日志支持：高并发场景下可稳定达到每秒 50 万+ 次日志写入
- 丰富的 Sink（输出目标）：文件（支持滚动/按天切分）、彩色控制台、syslog、Windows 事件日志等
- 灵活的格式化：基于 fmt 库，支持 Python 风格的格式化语法 `{}`
- 运行时/编译期日志级别过滤
- 跨平台支持：Linux、macOS、Windows、Android、FreeBSD 等

**项目信息：**

| 指标 | 数据 |
|------|------|
| GitHub Stars | 15k+ |
| 语言 | C++11/14/17/20 |
| 许可证 | MIT |
| 包管理器 | vcpkg、conan、Homebrew、apt、pacman 等 |

## 二、技术原理

### 2.1 架构设计：Sink 模式

spdlog 的核心架构基于 **Sink（槽）模式**——每个 Sink 负责将日志写入特定目标（文件、控制台等），Logger 则持有多个 Sink 并将日志分发过去。这种设计让日志输出的扩展变得极为简单：

```cpp
// 自定义 Sink 示例
class my_sink : public spdlog::sink {
public:
    void log(const spdlog::details::log_msg& msg) override {
        // 自定义日志处理逻辑
    }
    void flush() override {}
};
```

从 CMakeLists.txt 中可以看到，spdlog 将不同 Sink 编译为独立目标文件：

```cpp
// src/file_sinks.cpp — 文件相关 Sink
// src/stdout_sinks.cpp — 标准输出 Sink
// src/color_sinks.cpp — 彩色控制台 Sink
// src/async.cpp — 异步处理核心
```

### 2.2 格式化引擎：基于 fmt

spdlog 使用 [fmt](https://github.com/fmtlib/fmt) 作为格式化库，这带来了两个关键优势：

**性能**：fmt 在基准测试中比 `std::ostream` 快 10-30 倍，比 `sprintf` 快 2-10 倍。

**简洁语法**：fmt 支持 Python 风格的格式化：

```cpp
spdlog::info("Welcome to spdlog!");
spdlog::error("Some error message with arg: {}", 1);
spdlog::warn("Easy padding in numbers like {:08d}", 12);
spdlog::critical("Support for int: {0:d}; hex: {0:x}; oct: {0:o}; bin: {0:b}", 42);
spdlog::info("Positional args are {1} {0}..", "too", "supported");
spdlog::info("{:<30}", "left aligned");
```

### 2.3 异步日志实现

spdlog 的异步模式使用**线程池 + 无锁队列**：

```cpp
#include "spdlog/async.h"
#include "spdlog/sinks/basic_file_sink.h"

void async_example() {
    auto async_file = spdlog::basic_logger_mt<spdlog::async_factory>(
        "async_file_logger", "logs/async_log.txt"
    );
    // 默认线程池：8192 槽位队列，1 个后台线程
    async_file->info("Hello from async logger!");
}
```

基准测试中，异步模式在 10 线程、100 万条消息的场景下：
- `overflow_policy::block`：约 58 万次/秒（队列满时阻塞）
- `overflow_policy::overrun`：约 268 万次/秒（丢弃最旧消息）

```cpp
// 可自定义线程池参数
spdlog::init_thread_pool(8192, 1); // 队列大小，后台线程数
```

### 2.4 多 Sink 与日志级别

```cpp
// 不同 Sink 设置不同日志级别
auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
console_sink->set_level(spdlog::level::warn); // 控制台只显示警告以上

auto file_sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(
    "logs/multisink.txt", true
);
file_sink->set_level(spdlog::level::trace); // 文件记录所有级别

spdlog::logger logger("multi_sink", {console_sink, file_sink});
logger.set_level(spdlog::level::debug);
```

### 2.5 回溯（Backtrace）支持

spdlog 支持将调试消息暂存于环形缓冲区，待需要时再统一输出，这在调试复杂问题时极为有用：

```cpp
spdlog::enable_backtrace(32); // 保存最近 32 条调试消息
for (int i = 0; i < 100; i++) {
    spdlog::debug("Backtrace message {}", i); // 不立即输出
}
// 发生错误时，一次性输出所有缓存的调试消息
spdlog::dump_backtrace();
```

## 三、安装与快速开始

### 3.1 包管理器（一行命令安装）

```bash
# Debian/Ubuntu
sudo apt install libspdlog-dev

# macOS
brew install spdlog

# Windows (vcpkg)
vcpkg install spdlog

# Conda
conda install -c conda-forge spdlog

# Fedora
dnf install spdlog

# Arch Linux
pacman -S spdlog
```

### 3.2 CMake 编译安装

```bash
git clone https://github.com/gabime/spdlog.git
cd spdlog
mkdir build && cd build
cmake .. && cmake --build .
```

配合 CMake 使用：

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.10)
add_executable(my_app main.cpp)
target_link_libraries(my_app spdlog::spdlog)
```

### 3.3 头文件模式（零依赖）

```bash
cp -r include/spdlog /your/project/include/
```

```cpp
#define SPDLOG_HEADER_ONLY
#include "spdlog/spdlog.h"

int main() {
    spdlog::info("Welcome to spdlog!");
    return 0;
}
```

## 四、使用方法与实战

### 4.1 基础用法

```cpp
#include "spdlog/spdlog.h"

int main() {
    spdlog::info("Welcome to spdlog!");
    spdlog::error("Some error message with arg: {}", 1);
    spdlog::warn("Easy padding in numbers like {:08d}", 12);
    spdlog::critical("Support for int: {0:d}; hex: {0:x}", 42);

    // 全局设置日志级别
    spdlog::set_level(spdlog::level::debug);
    spdlog::debug("This message should be displayed..");

    // 自定义格式
    spdlog::set_pattern("[%H:%M:%S %z] [%n] [%^---%L---%$] [thread %t] %v");

    // 编译期日志级别（不产生运行时开销）
    SPDLOG_TRACE("Some trace message with param {}", 42);
    SPDLOG_DEBUG("Some debug message");
}
```

### 4.2 文件日志

```cpp
// 基础文件日志
auto logger = spdlog::basic_logger_mt("basic_logger", "logs/basic-log.txt");

// 滚动日志（单个文件最大 5MB，保留 3 个历史文件）
auto rotating = spdlog::rotating_logger_mt(
    "rotating", "logs/rotating.txt", 1048576 * 5, 3
);

// 按天日志（每天凌晨 2:30 创建新文件）
auto daily = spdlog::daily_logger_mt("daily_logger", "logs/daily.txt", 2, 30);
```

### 4.3 彩色控制台

```cpp
#include "spdlog/sinks/stdout_color_sinks.h"

auto console = spdlog::stdout_color_mt("console");
auto err_logger = spdlog::stderr_color_mt("stderr"); // 错误输出到 stderr
```

### 4.4 定期刷新

```cpp
// 每 3 秒自动刷新所有注册的日志器
spdlog::flush_every(std::chrono::seconds(3));
```

### 4.5 二进制十六进制输出

```cpp
#include "spdlog/fmt/bin_to_hex.h"

std::array<char, 80> buf;
console->info("Binary: {}", spdlog::to_hex(buf));
console->info("Uppercase: {:X}", spdlog::to_hex(buf));
console->info("No delimiters: {:Xs}", spdlog::to_hex(buf));
console->info("ASCII: {:a}", spdlog::to_hex(buf));
```

### 4.6 环境变量控制日志级别

```cpp
#include "spdlog/cfg/env.h"

int main(int argc, char* argv[]) {
    spdlog::cfg::load_env_levels();
    // 支持：SPDLOG_LEVEL=info,mylogger=trace ./app
}
```

### 4.7 注册与获取 Logger

```cpp
// 全局注册和获取
spdlog::register_logger(logger);
auto retrieved = spdlog::get("my_logger");

// 替换默认日志器
auto new_logger = spdlog::basic_logger_mt("new_default", "logs/new-default.txt");
spdlog::set_default_logger(new_logger);
spdlog::info("这条日志会写入新的默认日志器");
```

## 五、常见问题与解决方案

### Q1: 编译报错 "fmt 库未找到"？
**解决方案**：spdlog 默认自带 fmt 库（bundled 版本）。如果使用外部 fmt：
```cmake
cmake .. -DSPDLOG_FMT_EXTERNAL=ON
find_package(fmt REQUIRED)
```

### Q2: 异步日志丢失消息？
**原因**：队列满且策略为 `overrun` 时会丢弃最旧消息。
**解决**：增大队列或改用 `block` 策略：
```cpp
spdlog::init_thread_pool(16384, 2); // 增大队列，增加线程
```

### Q3: Windows 下中文日志乱码？
**解决方案**：确保源文件保存为 UTF-8 编码，并在 CMake 中设置：
```cmake
add_compile_options(/utf-8)
```

### Q4: 日志文件权限问题（Linux）？
**解决方案**：日志文件继承进程 umask。使用 `umask(0)` 或创建文件后设置权限。

### Q5: 如何与 Qt 项目集成？
**方案**：spdlog 支持直接输出到 Qt 的 `QTextEdit`：
```cpp
#include "spdlog/sinks/qt_sinks.h"
auto logger = spdlog::qt_color_logger_mt("qt_logger", log_widget, 500);
```

### Q6: 如何记录自定义类型？
**方案**：特化 `fmt::formatter`：
```cpp
template<>
struct fmt::formatter<my_type> : fmt::formatter<std::string> {
    auto format(my_type my, format_context &ctx) const {
        return fmt::format_to(ctx.out(), "[my_type i={}]", my.i);
    }
};
```

## 六、总结

spdlog 是 C++ 生态中最成熟的日志库之一，其设计处处体现了对**性能**和**易用性**的双重追求。，无论是个人项目还是大型工程，它都能提供开箱即用的高质量日志解决方案。如果你还没有在项目中使用 spdlog，现在就是最好的时机——一行 `brew install spdlog` 或 `apt install libspdlog-dev`，5 分钟内就能体验到它的全部能力。

---

> 项目地址：https://github.com/gabime/spdlog
> 文档：https://github.com/gabime/spdlog/wiki
