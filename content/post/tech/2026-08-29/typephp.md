---
title: "TypePHP：PHP 原生 AOT 编译器，将 PHP 编译成机器码"
date: 2026-08-29
description: "TypePHP 是一个 PHP 原生 AOT 编译器，将 PHP 源代码编译成原生机器码，无需解释器和 JIT 预热，性能提升高达 8 倍。支持原生类型系统、高精度数值、强类型容器，可生成可执行文件、PHP 扩展和共享库。"
author: "Cheman"
slug: typephp
draft: false
categories: ["技术", "开源"]
tags: ["PHP", "编译器", "AOT", "性能优化", "Swoole"]
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
ShowRssButtonInSectionTermListPage: true
UseHugoToc: true
---

今天在 GitHub Trending 上看到一个有意思的项目：**TypePHP**，它是一个 PHP 原生 AOT（Ahead-Of-Time）编译器，可以将 PHP 代码直接编译成原生机器码，无需解释器和 JIT 预热，性能提升高达 8 倍。

## 一、项目概述

### 项目定位

TypePHP 是一个真正意义上的 PHP AOT 编译器，它将 PHP 源代码编译成 C++17，然后再编译成原生机器码。与传统的字节码缓存（OPcache）或 JIT 不同，TypePHP 不再解释执行操作码，而是直接生成优化的原生二进制文件。

### 核心特性

- **自托管编译器**：TypePHP 完全用 PHP 编写，并通过编译自身的源码来构建原生编译器二进制
- **真正的 AOT 编译**：PHP 代码被转换为 C++17，然后编译成原生机器码，无需解释器、字节码缓存或 JIT 预热
- **三种构建模式**：可构建原生可执行文件、PHP 扩展或共享库
- **原生类型系统**：`int`、`float`、`bool` 直接映射为 C++ 标量类型（`int64_t`、`double`、`bool`）
- **高精度数值**：支持 `bigInt`（GMP）、`decimal`（libmpdec）、`bigFloat`（MPFR）
- **强类型容器**：`std::array`、`std::vector`、`std::map` 等，比 PHP 数组快 10 倍
- **混合 C++ / PHP**：可从 PHP 调用 C++ 函数，反之亦然

## 二、技术原理

### 编译流程

```text
PHP 源码 + .stub.php 声明 + 可选的 C/C++ 源码
                         │
                         ▼
        解析、验证并收集声明
                         │
                         ▼
       将函数体和常量降级为 C++17
                         │
                         ▼
       原生编译器 + 可复用的对象/PCH 缓存
                         │
                         ▼
 可执行文件 | PHP 扩展 | 共享库 | WASI 组件
```

两阶段设计确保多文件和自托管构建的确定性：

1. **准备阶段**：构建完整的符号模型，不分配运行时缓存 ID
2. **转换阶段**：所有项目符号已知后，再降级常量和声明默认值

### 性能对比

| 对比维度 | TypePHP AOT | Opcode 缓存 (OPcache) | JIT (PHP 8+) |
|---------|-------------|---------------------|--------------|
| 编译目标 | 原生机器码 | 字节码 | 机器码（trace） |
| 启动/预热 | 无（已编译） | 每进程预热 | JIT 预热 |
| 类型驱动优化 | 编译时，全程序 | 无 | 有限，基于 trace |
| 原生可执行输出 | 是 | 否 | 否 |
| 源码保护 | 编译成机器码 | 字节码（可逆） | 字节码（可逆） |
| 确定性性能 | 是 | 否 | 否 |

### Benchmark 数据

**PHP 语言基准测试（来自 php-src）：**

| 基准测试 | 解释执行 PHP | TypePHP AOT (`-O3`) | 提速 |
|---------|-------------|-------------------|------|
| `bench.php` | 5.034 s | **0.603 s** | ~8× |
| `micro_bench.php` | 13.045 s | **2.021 s** | ~6.5× |

**`std::array` vs PHP 数组（10000×100000 元素更新循环）：**

| 实现 | 耗时 |
|------|------|
| PHP 数组 (JIT) | 67.6 s |
| `std::array` (TypePHP AOT) | **6.4 s** |
| C++ `std::vector` | 6.2 s |

## 三、安装与快速开始

### 环境要求

- **PHP 8.4 – 8.5** CLI、开发头文件和 `php-config`
- 匹配的 **PHP embed 库**（`libphp.so` 或 `libphp.dylib`）
- **GCC 9+**（或 Clang）支持 **C++17**
- **CMake 3.24+**
- **Composer 2**
- 高精度数学库：**GMP**、**MPFR**（libmpdec 已随 PHPX 捆绑）

```bash
# Ubuntu/Debian
sudo apt install build-essential cmake pkg-config libgmp-dev libmpfr-dev

# RHEL/CentOS/Fedora
sudo dnf install gcc gcc-c++ cmake pkgconf-pkg-config gmp-devel mpfr-devel

# Arch Linux
sudo pacman -S base-devel cmake pkgconf gmp mpfr
```

### 安装方式

**方式一：通过 Composer 安装**

```bash
composer require --dev swoole/typephp

# 编译项目
vendor/bin/tpc.php project.yml
```

**方式二：从源码构建**

```bash
git clone https://github.com/swoole/typephp.git
cd typephp
composer install
php bin/tpc.php --help
```

### Hello World 示例

创建 `hello.php`：

```php
<?php

function main(): void
{
    echo "Hello World!\n";
    var_dump(PHP_VERSION);
    var_dump(php_uname());
}
```

编译并运行：

```bash
bin/tpc.php hello.php
./hello
```

输出示例：

```
Hello World!
string(5) "8.x.x"
string(16) "Linux ..."
```

## 四、使用方法与实战

### 编译模式

TypePHP 支持三种构建模式：

| 模式 | 标志 | 输出 | 需要 `main()` | 典型用途 |
|------|------|------|--------------|----------|
| Binary | `-m bin`（默认） | 可执行文件 | 是 | CLI 工具、长期运行的服务、独立应用 |
| Extension | `-m ext` | PHP `.so` / `.dll` | 否 | 将编译后的函数/类加载到 PHP SAPI |
| Library | `-m lib` | 共享库 + 生成的 `.stub.php` | 否 | 从另一个项目复用编译后的 TypePHP API |

```bash
# Binary 模式（默认）
bin/tpc.php app.php -o myapp

# PHP 扩展模式
bin/tpc.php extension/ -m ext -o my_extension

# 共享库模式；同时生成 mylib.stub.php
bin/tpc.php lib/ -m lib -o mylib
```

### 原生类型加速

```php
<?php
use native_types;

function fib(int $n): int
{
    if ($n == 1 || $n == 2) {
        return 1;
    }
    return fib($n - 1) + fib($n - 2);
}

function main(int $argc, array $argv): void
{
    $n = (int)$argv[1];
    $begin = microtime(true);
    echo fib($n) . "\n";
    echo "Time: " . (microtime(true) - $begin) . "\n";
}
```

```bash
bin/tpc.php fib.php -O3 -o fib
./fib 30
```

使用 `use native_types` 后，`int` 变量变为 C++ `int64_t`，算术运算编译为纯 CPU 指令而非 ZendVM 调用。

### 高精度数值计算

```php
<?php
declare(strict_types=1);
use native_types;

function main(): void
{
    // 54 位整数 — 自动检测并存储为 bigInt
    $a = std::bigInt("123456789012345678901234567890123456789012345678901234");
    $b = std::bigInt("987654321098765432109876543210987654321098765432109876");

    echo $a->add($b)->toString() . "\n";   // 精确结果，无溢出

    // 精确十进制运算 — 无二进制浮点误差
    $c = std::decimal("0.1")->add(std::decimal("0.2"));
    echo $c->toString() . "\n";            // "0.3"

    // 256 位浮点数
    $pi = std::bigFloat("3.14159265358979323846264338327950288419716939937510");
    echo $pi->mul(2)->toString() . "\n";
}
```

### 强类型容器

```php
<?php
use native_types;

function main(): void
{
    $vector = std::vector(Type::Int);

    $vector[] = 1;
    $vector[] = 2;
    $vector[] = 3;

    $sum = 0;
    foreach ($vector as $value) {
        $sum += $value;
    }

    echo $sum . "\n";       // 6
    echo $vector[1] . "\n"; // 2

    // 键值映射，固定键/值类型
    $map = std::ordered_map(Type::String, Type::Int);
    $map["a"] = 1;
    $map["b"] = 2;
}
```

### 混合 C++ / PHP

编写性能关键的 C++ 内核，从 PHP 调用：

```cpp
// math.cpp
#include <phpx.h>

using namespace php;

Int php_fast_sum(Int a, Int b) {
    return a + b;
}
```

```php
<?php
// math.stub.php — 声明 C++ 函数签名
function fast_sum(int $a, int $b): int {}
```

```php
<?php
function main(): void
{
    echo fast_sum(3, 4) . "\n";  // 7
}
```

### 编译时属性与代码生成

```php
<?php

#[Printer(fields: ['id', 'name'])]
#[Arrayable(fields: ['id', 'name'])]
final class User
{
    #[Constructor, Getter, With]
    public int $id;

    #[Constructor, Getter, Setter]
    public string $name = 'guest';
}

function main(): void
{
    $user = new User(7);
    $user->setName('Alice');

    $copy = $user->withId(8);
    echo $user->getId();       // 7
    echo $copy->getId();       // 8
    echo $user;                // User(id=7, name=Alice)
    echo $user->toArray()['name'];
}
```

## 五、常见问题与解决方案

### Q1: `libphp.so` / `libphp.dylib` 缺失

**原因**：未安装 PHP embed SAPI

**解决方案**：
1. 安装或构建匹配的 PHP embed SAPI
2. 设置 `PHP_HOME` 环境变量
3. 让 `bin/tpc.php` 提供 Linux 交互式安装器

### Q2: PHPX 无法找到

**原因**：`PHPX_HOME` 未正确配置

**解决方案**：
设置 `PHPX_HOME` 指向包含 `include/` 和 `lib/libphpx.so` 的 PHPX 安装目录，然后构建 PHPX。

### Q3: 启动崩溃或 ABI 错误

**原因**：PHP 头文件、`php-config`、`libphp` 和加载的扩展 ABI 不一致

**解决方案**：
确保 PHP 版本和 ZTS/NTS 模式完全一致，不要混用不同 PHP 构建的产物。

### Q4: 增量构建意外缓慢

**原因**：未复用 `--build-dir` 缓存

**解决方案**：
保持稳定的 `--build-dir`，以便对象和 PCH 缓存可复用。避免在外部测试运行器已并发运行多个测试时，使用过大的 `-j` 值。

### Q5: 项目用 `bin/tpc.php` 能编译但 `tpc` 失败

**原因**：自托管编译器暴露了动态调用或 ABI 路径

**解决方案**：
使用自托管编译器复现问题。引导执行可能暴露 PHP 托管编译器未触发的动态调用或 ABI 路径。

## 六、总结

TypePHP 为 PHP 生态带来了真正的 AOT 编译能力，让 PHP 代码可以编译成原生机器码运行。它的核心优势包括：

1. **性能提升显著**：基准测试显示 6-8 倍提速，容器操作比 PHP 数组快 10 倍
2. **源码保护**：编译成机器码后无法逆向，适合商业项目
3. **原生入口**：二进制模式直接从原生可执行文件启动，无需 PHP CLI 进程
4. **渐进式类型**：只在性能关键处添加 `use native_types` 和类型声明
5. **Zend 生态互操作**：扩展模式作为标准 PHP 扩展加载，可调用支持的内部函数

TypePHP 目前处于活跃开发阶段，有意支持一个可测试的 PHP 子集而非宣称与所有动态 PHP 程序兼容。在采用前，建议阅读 [兼容性模型](https://github.com/swoole/typephp#compatibility-model) 和 [不兼容特性列表](https://github.com/swoole/typephp/blob/main/docs/en/INCOMPATIBLE_PHP_FEATURES.md)。
