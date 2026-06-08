---
title: "GhostTrack：开源 OSINT 信息收集工具深度解析"
date: 2026-06-08
description: "GhostTrack 是一款基于 Python 的开源 OSINT 工具，集成了 IP 地址追踪、手机号码查询和社交媒体用户名搜索三大功能，适合安全研究人员进行合法的信息收集工作。"
author: "Cheman"
slug: "ghosttrack"
draft: false
categories: ["安全", "开源"]
tags: ["OSINT", "信息收集", "Python", "GitHub", "网络安全"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**GhostTrack**，一款集 IP 追踪、手机号查询和社交媒体用户名搜索于一体的 OSINT（开源情报）信息收集工具，使用 Python 编写，界面简洁、功能实用。

## 一、项目概述

GhostTrack 由开发者 HunxByts 创建，是一款面向安全研究人员和白帽测试人员的开源情报收集工具。当前版本为 2.2，已在 GitHub 上获得广泛关注。

项目核心功能包括：

- **IP 地址追踪**：通过 `ipwho.is` API 获取目标 IP 的详细地理信息、ISP 数据、时区等
- **手机号码查询**：利用 `phonenumbers` 库解析号码归属地、运营商、时区等元数据
- **用户名跨平台追踪**：批量检测目标用户名在 20+ 社交媒体平台上的注册情况

## 二、技术原理

### 架构设计

GhostTrack 采用单文件架构（`GhostTR.py`），整个应用约 300 行 Python 代码，结构清晰：

- **装饰器模式**：`@is_option` 装饰器为每个功能函数自动附加 Banner 显示逻辑，避免重复代码
- **菜单驱动**：通过 `options` 列表配置菜单项，每项绑定对应的执行函数，实现灵活的菜单管理
- **模块化设计**：IP 追踪、手机号查询、用户名追踪各自封装为独立函数，互不耦合

### 核心技术栈

| 技术 | 用途 |
|------|------|
| `requests` | HTTP 请求，调用 ipwho.is 和 ipify API |
| `phonenumbers` | 电话号码解析、格式化和元数据提取 |
| `json` | API 响应数据解析 |
| `os` / `sys` | 终端清屏和标准错误输出 |

### 关键实现细节

IP 追踪模块通过调用 `ipwho.is` 免费接口获取数据：

```python
req_api = requests.get(f"http://ipwho.is/{ip}")
ip_data = json.loads(req_api.text)
```

返回的数据覆盖了地理位置（经纬度、城市、国家）、网络信息（ASN、ISP、ORG）、时区信息等多个维度，甚至还生成了 Google Maps 链接。

手机号查询模块使用 Google 的 `phonenumbers` 库：

```python
parsed_number = phonenumbers.parse(User_phone, default_region)
jenis_provider = carrier.name_for_number(parsed_number, "en")
location = geocoder.description_for_number(parsed_number, "id")
```

该库通过号码前缀规则解析归属信息，无需外部 API，完全离线运行。

用户名追踪模块采用最朴素的方式——对 20+ 社交媒体平台逐一发起 HTTP GET 请求，根据返回状态码判断用户名是否存在：

```python
for site in social_media:
    url = site['url'].format(username)
    response = requests.get(url)
    if response.status_code == 200:
        results[site['name']] = url
```

### 数据流分析

```
用户输入 → 菜单选择 → 功能函数执行
    ├─ IP 追踪：输入IP → 请求 ipwho.is API → 解析 JSON → 格式化输出
    ├─ 手机号：输入号码 → phonenumbers 解析 → 提取元数据 → 格式化输出
    └─ 用户名：输入用户名 → 批量 HTTP 请求 → 状态码判断 → 结果汇总
```

## 三、安装与快速开始

### 环境要求

- Python 3.x
- pip3
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/HunxByts/GhostTrack.git
cd GhostTrack

# 安装依赖
pip3 install -r requirements.txt
```

依赖非常精简，仅需两个包：

```
requests
phonenumbers
```

### 运行

```bash
python3 GhostTR.py
```

启动后进入交互式菜单，按数字选择功能即可。项目同时支持 Linux 桌面和 Termux（Android）环境。

## 四、使用方法与实战

### IP 地址追踪

选择菜单中的 `IP Tracker`（选项 1），输入目标 IP 地址后，工具会展示完整的地理位置、网络运营商、时区等信息，并自动生成 Google Maps 链接方便查看。

可以配合 [Seeker](https://github.com/thewhiteh4t/seeker) 工具获取目标的公网 IP，再进行追踪。

### 查看本机 IP

选择 `Show Your IP`（选项 2），通过 `api.ipify.org` 快速查看当前设备的公网 IP 地址。

### 手机号码查询

选择 `Phone Number Tracker`（选项 3），输入目标手机号（国际格式，如 `+86138xxxx`），工具会解析出归属地、运营商、时区、号码类型（移动/固话）等信息。

### 用户名跨平台追踪

选择 `Username Tracker`（选项 4），输入目标用户名，工具会依次检测 Facebook、Twitter、Instagram、LinkedIn、GitHub、TikTok 等 20+ 平台，报告该用户名在各平台的注册状态。

## 五、常见问题与解决方案

- **API 请求失败**：IP 追踪依赖 `ipwho.is` 服务，如果该服务不可达，IP 追踪功能将无法使用。可以尝试更换网络环境或使用代理
- **手机号解析不准确**：`phonenumbers` 库基于号码前缀规则判断归属地，对于虚拟号码或携号转网的号码，结果可能存在偏差
- **用户名追踪误报**：部分平台对不存在的用户名也返回 200 状态码（如显示"用户不存在"页面），导致假阳性。结果需人工验证
- **运行报 ModuleNotFoundError**：确认已执行 `pip3 install -r requirements.txt`，且使用的 Python 版本与 pip 对应

## 六、总结

GhostTrack 是一款轻量级的 OSINT 信息收集工具，代码简洁、依赖少、上手快，适合安全研究初学者和需要进行基础情报收集的场景。虽然用户名追踪模块的实现方式较为简单（基于 HTTP 状态码），但对于日常的快速侦察任务已经足够实用。项目开源免费，是了解 OSINT 工具原理的良好学习素材。

> ⚠️ **免责声明**：信息收集工具应在合法授权范围内使用，未经授权对他人进行追踪和信息收集可能违反相关法律法规。本文仅供技术学习和研究参考。
