---
title: amnezia-client — Amnezia VPN Client (Desktop+Mobile)
date: '2026-07-26'
description: '(https://github.com/amnezia-vpn/amnezia-client/actions/workflows/deploy.yml?query=branch:dev)

  (https://gitpod.io/https://github.com/amnezia-vpn/amnezia-client)'
author: Cheman
slug: amnezia-client
draft: false
tags:
- GitHub Trending
- C++
categories:
- 开源项目
- 技术博客
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

今天在 GitHub Trending 上看到一个有意思的项目：
**amnezia-client**，Amnezia VPN Client (Desktop+Mobile)

## 一、项目概述
(https://github.com/amnezia-vpn/amnezia-client/actions/workflows/deploy.yml?query=branch:dev)
(https://gitpod.io/https://github.com/amnezia-vpn/amnezia-client)

**GitHub：** https://github.com/amnezia-vpn/amnezia-client
**语言：** C++
**⭐ Stars：** 13,088

## 二、核心特性
- README 文档完善，上手容易

## 三、技术实现
项目基于以下关键技术实现：

### 核心文件结构

| 文件 | 说明 |
|------|------|
| `CMakeLists.txt` | TXT · 2.2 KB |
| `conanfile.py` | PY · 1.6 KB |

### 核心代码示例

**CMakeLists.txt：**
```txt
cmake_minimum_required(VERSION 3.25.0 FATAL_ERROR)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(PROJECT AmneziaVPN)
set(AMNEZIAVPN_VERSION 5.0.0.5)

set(QT_CREATOR_SKIP_PACKAGE_MANAGER_SETUP ON CACHE BOOL "" FORCE)
set(CMAKE_PROJECT_TOP_LEVEL_INCLUDES
    ${CMAKE_SOURCE_DIR}/cmake/platform_settings.cmake
    ${CMAKE_SOURCE_DIR}/cmake/recipes_bootstrap.cmake
    ${CMAKE_SOURCE_DIR}/cmake/conan_provider.cmake
    CACHE STRING "" FORCE)

project(${PROJECT} VERSION ${AMNEZIAVPN_VERSION}
        DESCRIPTION "AmneziaVPN"
        HOMEPAGE_URL "https://amnezia.org/"
)

# trigger conan to kick off `conan install` globally
find_package(OpenSSL REQUIRED)
if (PREBUILTS_ONLY)
    return()
endif()

string(TIMESTAMP CURRENT_DATE "%Y-%m-%d")
set(RELEASE_DATE "${CURRENT_DATE}")

set(APP_MAJOR_VERSION ${CMAKE_PROJECT_VERSION_MAJOR}.${CMAKE_PROJECT_VERSION_MINOR}.${CMAKE_PROJECT_VERSION_PATCH})
```

**conanfile.py：**
```py
from conan import ConanFile

class AmneziaVPN(ConanFile):
    settings = "os", "compiler", "build_type", "arch"
    generators = "VirtualBuildEnv", "CMakeConfigDeps"

    options = {
        "macos_ne": [True, False]
    }
    default_options = {
        "macos_ne": False
    }

    def requirements(self):
        os = str(self.settings.os)

        has_ne = os == "iOS" or (os == "Macos" and self.options.macos_ne)
        has_service = os == "Windows" or os == "Linux" or (os == "Macos" and not has_ne)

        if has_service:
            if os == "Windows":
                self.requires("awg-windows/3.0.2")
                self.requires("tap-windows6/9.27.0")
                self.requires("win-split-tunnel/1.2.5.0")
                self.requires("wintun/0.14.1")
            else:
                self.requires("awg-go/3.0.1")

            self.requires("amnezia-xray-bindings/1.3.0")
            self.requires("tun2socks/2.6.0")
```

## 四、快速开始

```bash
git submodule update --init --recursive
```

## 五、适用场景

- 开发者研究新技术栈和最佳实践
- 项目快速启动和原型开发
- 学习开源项目的设计思路和架构
- 集成到现有项目中作为依赖

## 六、总结
amnezia-client 是 GitHub Trending 上的热门开源项目，
当前已获得 13,088 ⭐，在技术社区具有较高影响力。
项目代码结构清晰，文档完善，适合深入学习和实际应用。

> 🔗 项目地址：https://github.com/amnezia-vpn/amnezia-client