---
title: "Catch2：现代 C++ 原生的单元测试、微基准与 BDD 框架"
date: 2026-07-11
description: "Catch2 是当前 GitHub 上最受欢迎的 C++ 测试框架之一，以纯 C++ 语法、类自然语言的断言、Section 共享测试夹具、内置微基准与 BDD 宏著称。本文从架构、技术原理、安装实战到常见问题，带你看懂这个现代 C++ 原生测试框架。"
author: "Cheman"
slug: catch2
draft: false
categories: [技术, 开源]
tags: [C++, 单元测试, GitHub, 开源, 测试框架]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Catch2**——一个现代、C++ 原生的单元测试框架，它把测试写成了像普通 C++ 布尔表达式一样自然的代码，还顺手内置了微基准测试和 BDD 风格宏。

## 一、项目概述

Catch2 主要由 **catchorg** 组织维护，是 C++ 生态中最被广泛采用的测试框架之一。它的定位不是"又一个小巧的单头文件库"，而是一套完整的测试基础设施。

- **单元测试**：核心能力，断言写成 `REQUIRE(expr)` 形式，读起来就像一句布尔表达式。
- **微基准（Micro-benchmarking）**：内置 `BENCHMARK` 宏，无需额外依赖即可对函数做吞吐/耗时测量。
- **BDD 风格**：提供行为驱动开发的宏，让测试用例以"故事"的方式组织。

它最大的卖点是"**简单且自然**"：测试名不必是合法标识符、断言像普通 C++ 表达式、用 `SECTION` 在测试内局部共享 setup/teardown 代码。

下面这段来自 README 的示例，最能体现它的风格：

```cpp
#include <catch2/catch_test_macros.hpp>
#include <cstdint>

uint32_t factorial( uint32_t number ) {
    return number <= 1 ? number : factorial(number-1) * number;
}

TEST_CASE( "Factorials are computed", "[factorial]" ) {
    REQUIRE( factorial( 1) == 1 );
    REQUIRE( factorial( 2) == 2 );
    REQUIRE( factorial( 3) == 6 );
    REQUIRE( factorial(10) == 3'628'800 );
}
```

注意 `TEST_CASE` 的第一个字符串是**可读的测试名**（不是标识符），第二个是 **tag**（用于按标签筛选用例，`[factorial]` 即属于阶乘分组）。

## 二、技术原理

### 架构演进：从单头文件到真正的库

Catch2 发展历程里最关键的一次变化是 **v3 重写**。在 `devel` 分支上，项目已经发布 v3，它不再是 v2 时代的"单头文件库（single-header）"，而是回归为一个**正常的 C++ 库**：多个头文件 + 独立编译的实现（implementation TUs）。

从 `CMakeLists.txt` 可以看到这一设计的落地：

```cmake
project(Catch2
  VERSION 3.15.2 # CML version placeholder, don't delete
  LANGUAGES CXX
  HOMEPAGE_URL "https://github.com/catchorg/Catch2"
  DESCRIPTION "A modern, C++-native, unit test framework."
)
```

版本号 `3.15.2` 还被 `conanfile.py` 通过正则从 `CMakeLists.txt` 反向解析：

```python
pattern = re.compile(r"\w*VERSION (\d+\.\d+\.\d+) # CML version placeholder, don't delete")
```

这种"单一事实来源（single source of truth）"的做法，避免了版本在多处维护而出错。

### 核心技术栈与构建系统

Catch2 选择 **CMake** 作为一等公民构建系统，并提供丰富的 CMake 选项（来自 `CMakeLists.txt`）：

- `CATCH_INSTALL_DOCS`：是否随库安装文档（默认 ON）
- `CATCH_INSTALL_EXTRAS`：是否安装 extras（CMake 脚本、调试器助手）
- `CATCH_BUILD_TESTING` / `CATCH_BUILD_EXAMPLES` / `CATCH_BUILD_FUZZERS`：按需构建测试/示例/模糊测试
- `CATCH_ENABLE_WERROR`：开发构建时开启 `-Werror`（默认 ON）

它还贴心地处理了**不支持 in-tree 构建**的情况，直接 `FATAL_ERROR` 防止误用：

```cmake
if(CMAKE_BINARY_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
  message(FATAL_ERROR "Building in-source is not supported! ...")
endif()
```

### 跨包管理支持

除 CMake 外，Catch2 还提供 Conan 配方（`conanfile.py`），通过 `package_info` 暴露 `Catch2::Catch2` 与 `Catch2::Catch2WithMain` 两个 CMake target，并处理 Release/Debug 的库名后缀（`lib_suffix = "d"`）。它要求的编译标准是不低于 **C++14**：

```python
@property
def _min_cppstd(self):
    return "14"
```

### Section 机制与数据流

`SECTION` 是 Catch2 的数据流核心。它基于 RAII + 分支重入（re-run）实现：同一个 `TEST_CASE` 会被多次执行，每次进入不同的 Section 分支，从而自然地复用 setup 代码、隔离 teardown，而不需要手写 fixture 类。这比传统 xUnit 的 `SetUp/TearDown` 更轻、更局部。

## 三、安装与快速开始

### 环境要求

- C++14 及以上编译器（GCC ≥ 7、Clang ≥ 5、MSVC ≥ 191/VS2017 等）
- CMake ≥ 3.16（用于 CMake 构建）
- 可选：Conan ≥ 1.53（用于包管理）

### 安装方式

**方式一：CMake（推荐，获取完整库）**

```bash
git clone https://github.com/catchorg/Catch2.git
cd Catch2
cmake -B build -S . -DBUILD_TESTING=OFF
cmake --build build
cmake --install build
```

**方式二：Conan**

```bash
conan install catch2/3.15.2@ --build=missing
```

**方式三：包管理器（vcpkg / Homebrew / apt 等）** 视平台而定。

### 最简运行示例

写一个测试文件 `test.cpp`：

```cpp
#include <catch2/catch_test_macros.hpp>

TEST_CASE("1 + 1 == 2", "[sanity]") {
    REQUIRE(1 + 1 == 2);
}
```

链接 `Catch2WithMain`（自带 `main` 函数），编译运行即可看到测试报告。

## 四、使用方法与实战

### 基础用法：断言家族

- `REQUIRE(expr)`：表达式为假时失败并停止该 Section
- `CHECK(expr)`：表达式为假时记录失败但继续执行
- `REQUIRE_FALSE(expr)` / `CHECK_FALSE(expr)`：反向断言
- 浮点比较：`REQUIRE(a == Approx(b).epsilon(0.01))`

### 进阶用法：微基准

内置 benchmark 无需默认执行，需用 `[!benchmark]` tag 显式运行：

```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/benchmark/catch_benchmark.hpp>
#include <cstdint>

uint64_t fibonacci(uint64_t number) {
    return number < 2 ? number : fibonacci(number - 1) + fibonacci(number - 2);
}

TEST_CASE("Benchmark Fibonacci", "[!benchmark]") {
    REQUIRE(fibonacci(20) == 6'765);
    BENCHMARK("fibonacci 20") {
        return fibonacci(20);
    };
    REQUIRE(fibonacci(25) == 75'025);
    BENCHMARK("fibonacci 25") {
        return fibonacci(25);
    };
}
```

运行：`your_test_binary "[!benchmark]"`，即可看到各 `BENCHMARK` 块的耗时统计。

### 实际项目示例：Section 共享夹具

```cpp
#include <catch2/catch_test_macros.hpp>
#include <vector>

TEST_CASE("vector push_back", "[container]") {
    std::vector<int> v;
    REQUIRE(v.empty());

    SECTION("push one") {
        v.push_back(1);
        REQUIRE(v.size() == 1);
    }
    SECTION("push three") {
        v.push_back(1); v.push_back(2); v.push_back(3);
        REQUIRE(v.size() == 3);
    }
}
```

每个 `SECTION` 都会从 `v` 的初始（空）状态重新开始，天然实现了"共享 setup、隔离 tear-down"。

## 五、常见问题与解决方案

### 1. v2 → v3 迁移：找不到单头文件 / 链接错误

v3 不再是单头文件库。**现象**：`#include "catch.hpp"` 或直接把单头文件拖进项目后链接失败。
**解决**：改用 `catch2/catch_test_macros.hpp` 等拆分头文件，并链接 `Catch2::Catch2` 与 `Catch2::Catch2WithMain`；参考官方 `docs/migrate-v2-to-v3.md` 迁移指南。

### 2. in-tree 构建直接报错

**现象**：`cmake -S . -B .` 报 `Building in-source is not supported!`
**解决**：始终在独立 build 目录构建（`cmake -B build -S .`），不要在原目录内编译。

### 3. 基准测试"不运行"

**现象**：写了 `BENCHMARK` 但没有任何耗时输出。
**解决**：基准默认不执行，需显式带 `[!benchmark]` tag 运行测试二进制，例如 `./tests "[!benchmark]"`。

### 4. 浮点断言偶发失败

**现象**：`REQUIRE(a == b)` 在浮点上不稳定。
**解决**：使用 `Approx` 做近似比较：`REQUIRE(a == Approx(b).epsilon(1e-6))`。

### 5. Werror 导致 CI 编译失败（开发构建）

**现象**：开启 `CATCH_DEVELOPMENT_BUILD` 后 `-Werror` 触发告警即失败。
**解决**：非贡献者构建时保持 `CATCH_DEVELOPMENT_BUILD=OFF`（默认），即不会开启 `Werror`。

## 六、总结

Catch2 凭借"像写普通 C++ 一样写测试"的设计哲学，成为现代 C++ 测试的事实标准之一。它的 v3 重构让它从单头文件实验品蜕变为一个结构清晰、构建系统完善（CMake + Conan 双支持）、并内置微基准与 BDD 能力的成熟框架。无论是小型库还是大型工程，引入 `Catch2::Catch2WithMain` 几乎零成本，就能获得可读性强、易维护的测试套件。

如果你正在为 C++ 项目挑选测试框架，Catch2 值得作为首选评估对象——尤其是当你希望测试代码读起来像规格说明、而非一堆样板时。

> 仓库地址：https://github.com/catchorg/Catch2
