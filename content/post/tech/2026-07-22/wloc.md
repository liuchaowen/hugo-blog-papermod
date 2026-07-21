---
title: "wloc：一行不改 GPS 也能改定位？深挖 Apple 网络定位（WLOC）虚拟定位黑科技"
date: 2026-07-22
description: "GitHub Trending 项目 wloc 通过 MITM 拦截 Apple 的 /clls/wloc 网络定位接口并补丁 protobuf 响应坐标，实现 iOS 虚拟定位。本文解析其架构、数据流、iOS 26 缓存坑与自部署方案。"
author: "Cheman"
slug: wloc
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, iOS, 虚拟定位, 代理, Cloudflare]
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

今天在 GitHub Trending 上看到一个有意思的项目：**wloc**，它能在不越狱、不装破解插件的情况下，把 iPhone 的「网络定位（WiFi/基站）」坐标改成任意地点。一句话概括它的核心价值：只改网络定位、不碰 GPS 硬件，配合代理模块即可实现 iOS 虚拟定位。

## 一、项目概述

`wloc`（仓库：[Yu9191/wloc](https://github.com/Yu9191/wloc)）是一个针对 Apple 网络定位服务（WLOC，即 WiFi Location/Observable Client Location Service）的虚拟定位方案。iOS 在没有 GPS 信号（或 GPS 信号弱）的室内场景，会大量依赖 Apple 的服务器根据周边 WiFi 热点、基站信息反推坐标；`wloc` 要做的，就是在这个过程中「狸猫换太子」。

- **目标**：修改 `gs-loc.apple.com` 返回的 WLOC 坐标，让 App 拿到的网络定位变成你指定的任意地点。
- **非目标**：不修改 GPS 硬件定位。当 GPS 信号强时，系统可能忽略网络定位结果，所以该方案在 WiFi 定位为主的室内场景效果最佳。
- **核心特性**：
  - 支持 Surge / Quantumult X / Loon / Stash / Shadowrocket(小火箭) 主流代理工具模块订阅。
  - 提供在线选点页面（Cloudflare Worker / Pages），地图选点、搜索地名、粘贴地图链接即可生效，无需手填经纬度。
  - 提供 iOS 快捷指令，一键「设置地理位置 / 清理恢复位置」。
  - 支持收藏多个位置、快速切换；坐标通过浏览器端 GCJ-02→WGS84 换算统一。

## 二、技术原理

定位流程的本质是一条「请求—响应—拦截—补丁」的链路：

```
选点页面 → fetch gs-loc.apple.com/wloc-settings/save?lon=x&lat=y
         → 代理模块拦截 → wloc-settings.js 写入 $persistentStore
         → 下次 WLOC 触发 → wloc.js 读取坐标 → patch protobuf 响应
```

模块包含两条核心规则：

- **`wloc.js`**：拦截 `/clls/wloc` 响应，解析 protobuf 并替换其中的坐标字段。
- **`wloc-settings.js`**：拦截 `/wloc-settings/save` 请求，把选好的经纬度写入代理工具的持久化存储。

**坐标优先级**：在线选点储存 > 模块参数 > 默认值。也就是说，只要你通过选点页面存过坐标，它就会优先生效；否则才回落到模块里写死的参数。默认值（`113.94114, 22.544577`，即深圳附近）是一个巧妙的设计——当持久化数据为空且模块参数为默认值时，脚本判定「用户未自定义坐标」，自动进入**透传模式**，直接放行原始响应，系统恢复真实定位。

**关于坐标系的暗坑**：很多人以为地图链接里拿到的就是真坐标，其实 Apple 地图和高德在中国大陆返回的都是 **GCJ-02（火星坐标）** 偏移坐标。`wloc` 用一个开源 Worker（`wloc-spoofer.wloc.workers.dev/api/parse`）统一处理：收到链接 → 跟随 302 跳转 → 抠出坐标 → 做 GCJ-02→WGS84 换算 → 返回 JSON；境外坐标则通过 `out_of_china` 判断跳过换算，原样返回。该接口是「纯转发解析」，不写存储、不记日志、不缓存，处理完即丢，从设计上规避了隐私风险。

**iOS 26+ 的缓存大坑**：从 iOS 26 起，Apple 大幅强化了 `locationd` 的定位缓存机制，会把之前获取的真实定位缓存在内存里并长时间复用。即便脚本已成功 patch 了 WLOC 响应（日志显示「已修改」），系统仍可能继续用缓存里的旧坐标，导致「看起来没变化」。此时**必须重启设备**来清空 `locationd` 内存缓存，飞行模式开关、关闭定位服务在 iOS 26+ 上都清不掉这个缓存。iOS 15~18 通常无需重启即可生效。

## 三、安装与快速开始

环境要求：一台开启了代理（且已信任 `gs-loc.apple.com` / `gs-loc-cn.apple.com` MITM 证书）的 iOS 设备。

**最简开始（以 Surge 为例）**：

1. 订阅模块并启用 MITM：

```
https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/main/modules/wloc.sgmodule
```

2. 打开在线选点页面（建议「添加到主屏幕」），在地图上选好位置 / 搜索地名 / 粘贴地图链接。
3. 点击「储存到设备」。
4. 下次 Apple 定位触发时，修改后的坐标自动生效。

若使用快捷指令，可直接用「wloc 设置地理位置」一键切换，连选点页面都不用开：

- 设置：`https://www.icloud.com/shortcuts/a82717d8fdad4e6280866fcf911173f7`
- 清理恢复：`https://www.icloud.com/shortcuts/f42632d406504f24a2cd163af4fe012f`

## 四、使用方法与实战

**基础用法**：在苹果地图里长按选点 → 共享 → 选「wloc 设置地理位置」；高德地图则是选点 → 分享 → 更多 → 同样选该快捷指令。Worker 会自动跟跳转并处理 GCJ-02→WGS84 换算。

**进阶玩法**：

- **收藏位置**：选点页面支持收藏多个地点（备注名最多 30 字），来回切换时点击收藏 → 地图跳转 → 储存到设备即可。注意收藏列表保存在浏览器 `localStorage`，清空浏览器缓存需重新收藏；而真正生效的坐标保存在代理工具的 `$persistentStore`（`wloc_settings` 字段），两者独立。
- **高版本系统成功率最高的流程（iOS 26+）**：先在选点页存好位置 → 开飞行模式 → 关定位服务 → 重启 → 关飞行模式（WiFi 也关）→ 连代理（确认 VPN 图标出现）→ 开定位服务 → 打开地图验证。
- **恢复真实定位**：关闭/删除模块即可让脚本不再拦截；或清除持久化数据字段 `wloc_settings`（Surge/Loon 运行 `$persistentStore.write(null, "wloc_settings")`，Quantumult X 运行 `$prefs.removeValueForKey("wloc_settings")`），脚本即进入透传模式。注意若你手动改过模块参数经纬度（非默认值），即使清了持久化数据，脚本仍会用模块参数——必须保持默认参数才能触发透传。

**自部署（推荐）**：公共选点页有请求上限，建议部署自己的实例。一键部署 Workers：

```
git clone https://github.com/Yu9191/wloc.git
cd wloc/worker
npm install
npx wrangler login
npm run deploy
```

免费账户每天 10 万次请求，个人使用完全够。部署后把快捷指令里的 `wloc-spoofer.wloc.workers.dev` 换成你自己的 Worker 域名即可。解析逻辑与路由均开源（`worker/src/parse.js`、`worker/src/index.js`），不放心可完全自建。

## 五、常见问题与解决方案

- **改了坐标但地图没变？** 大概率是 iOS 26+ 的 `locationd` 缓存问题，按上文「高版本流程」**重启设备**。GPS 信号强时系统可能忽略网络定位，建议室内/弱 GPS 场景验证。
- **选点页面打不开 / 储存没反应？** 选点页面需在代理模式下使用——Safari 必须走代理才能被拦截到储存请求。确认代理已开、模块已启用、且已信任 `gs-loc.apple.com`。
- **清除持久化后仍是虚拟定位？** 检查模块参数是否被手动改过经纬度；只有保持默认 `113.94114, 22.544577` 时，清除持久化才会触发透传模式。
- **高德短链解析失败？** 真实坐标藏在 302 跳转的 `Location` 头里，快捷指令读不到跳转头也难做坐标换算，因此统一交给 Worker 解析，请确保 Worker 域名可访问。
- **性能/隐私顾虑？** `/api/parse` 是纯转发解析，不写存储、不记日志、不缓存，且源码完全开源可自部署。

## 六、总结

`wloc` 是一个设计精巧、工程完整度很高的「网络定位虚拟定位」方案：它不越狱、不碰 GPS，而是精准地卡在 Apple WLOC 接口这一层做 MITM + protobuf 补丁，配合 Cloudflare Worker 解决坐标系换算与隐私顾虑，再用快捷指令把体验做到「一键切换」。对需要在室内场景临时切换定位的 iOS 用户来说，它把原本复杂的操作压到了极致简单。唯一需要留意的，是 iOS 26+ 那道「重启才能清缓存」的门槛——但只要按官方推荐流程走，成功率依然很高。
