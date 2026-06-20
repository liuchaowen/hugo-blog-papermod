---
title: "SmsForwarder：Android 短信转发神器，备用机必备"
date: 2026-06-21
description: "SmsForwarder 是一款开源 Android 应用，可监控手机短信、来电和 APP 通知，并通过钉钉、企业微信、飞书、邮箱、Telegram 等多种渠道自动转发，还支持远程发短信、查通话、自动化任务等功能，是备用机的必备神器。"
author: "Cheman"
slug: smsforwarder
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "Android", "短信转发", "开源", "自动化"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**SmsForwarder**，它能把 Android 备用机的短信、来电和 APP 通知自动转发到你的主力设备，再也不怕错过备用机上的重要信息了。

## 一、项目概述

SmsForwarder（短信转发器）是一款开源 Android 应用，核心功能是监控手机上的短信、来电和 APP 通知，然后根据用户配置的规则，将消息转发到指定的目标渠道。

**核心特性：**

- **多渠道转发**：支持钉钉群机器人、企业微信群机器人、飞书群机器人、邮箱、Bark、Webhook、Telegram 机器人、Server酱、PushPlus、手机短信等十余种转发通道
- **双向控制**：不仅能转发消息，还支持远程发短信、查短信、查通话记录、查通讯录、查电量等主动操作（V3.0 新增）
- **自动任务与快捷指令**：支持自动化规则配置，轻松实现场景化转发（V3.3 新增）
- **规则过滤**：可根据发件人、关键词等条件灵活配置转发规则
- **隐私安全**：不收集任何用户隐私数据，仅在使用友盟统计和版本检查时发送必要信息

## 二、技术原理

### 架构设计

SmsForwarder 采用经典的 Android 监听+转发架构：

1. **监听层**：通过 Android 系统广播接收器（BroadcastReceiver）监听短信到达（`SMS_RECEIVED`）和来电事件，通过 NotificationListenerService 监听 APP 通知
2. **规则引擎**：收到消息后进入规则匹配模块，根据用户配置的发送人、关键词等条件过滤
3. **转发层**：匹配成功后，调用对应渠道的 API/SDK 将消息推送出去
4. **控制服务端**：内置 HTTP Server（基于 AndServer），提供 RESTful 接口供远程客户端调用

### 核心技术栈

| 模块 | 技术选型 | 说明 |
|------|---------|------|
| UI 框架 | XUI | 提供统一的设计规范和组件库 |
| 在线升级 | XUpdate | 支持多渠道升级检测 |
| 权限管理 | XXPermissions | 简化 Android 动态权限申请 |
| 内网穿透 | frpc_android | 实现远程控制能力 |
| 进程保活 | Cactus | 保证后台服务持续运行 |
| HTTP 服务 | AndServer | 内嵌 Web 服务器，提供远程控制 API |
| 定位服务 | Location | 支持基于位置的自动化规则 |

### 进程保活机制

在 Android 系统对后台进程管控日益严格的背景下，SmsForwarder 使用 Cactus 保活框架确保短信监听服务不被系统杀死：

```java
// Cactus 保活配置示例
Cactus.getInstance()
    .isDebug(true)
    .setPendingIntent(pendingIntent)
    .addCallback(new CactusCallback() {
        @Override
        public void doWork(int i) {
            // 保活回调，确保服务持续运行
        }
    })
    .register(this);
```

### 消息转发流程

```
短信/来电/通知 → BroadcastReceiver/NotificationListenerService
    → 规则匹配引擎（发送人+关键词过滤）
        → 匹配成功 → 渠道适配器（钉钉/微信/飞书/邮箱/...）
            → HTTP API 调用 → 消息送达
        → 匹配失败 → 忽略
```

## 三、安装与快速开始

### 环境要求

- Android 4.4 ~ 13.0
- 需要授予短信读取、通知监听等权限

### 安装步骤

1. 从 [GitHub Releases](https://github.com/pppscn/SmsForwarder/releases) 下载最新 APK
2. 安装到备用 Android 手机
3. 打开应用，授予必要权限（短信、通讯录、通知等）
4. 配置转发规则和目标渠道

### 最简运行示例

以配置钉钉群机器人为例：

1. 在钉钉群中添加自定义机器人，获取 Webhook URL
2. 在 SmsForwarder 中添加「钉钉」发送通道，填入 Webhook 地址
3. 新建转发规则：监听所有短信 → 转发到钉钉
4. 发送测试短信，验证钉钉群收到转发消息

## 四、使用方法与实战

### 基础用法：短信转发到微信

1. 创建企业微信群机器人，获取 Webhook URL
2. 在 SmsForwarder 中配置企业微信通道
3. 设置规则：监控所有短信，转发到企业微信
4. 验证码、银行通知等重要短信即时推送到微信

### 进阶用法：条件过滤转发

```yaml
规则示例：
  匹配规则: 发送人包含 "10086" 或 "95588"
  关键词: "验证码" 或 "余额"
  转发到: 邮箱 + Bark
  附加操作: 标记为已读
```

这样只有运营商和银行的重要短信才会被转发，避免垃圾短信干扰。

### 实战：远程控制备用机

利用内置的 AndServer HTTP 服务，可以通过 RESTful API 远程操作备用机：

- 查询短信列表
- 发送短信
- 查询通话记录
- 查询电池状态
- 查询通讯录

配合 frpc_android 内网穿透，即使备用机不在同一局域网也能远程控制。

### 自动化任务

V3.3 新增的自动任务功能，支持基于时间、位置等条件触发特定操作：

- 工作时间自动转发工作相关短信
- 到家后停止转发家庭相关通知
- 低电量时自动发送提醒到主设备

## 五、常见问题与解决方案

### 后台服务被系统杀死

**现象**：一段时间后不再转发消息。

**解决方案**：
1. 在系统设置中为 SmsForwarder 关闭电池优化
2. 允许自启动和后台弹出界面
3. 在最近任务列表中锁定应用
4. 项目集成了 Cactus 保活框架，但仍需手动配置系统级白名单

### 通知监听权限丢失

**现象**：APP 通知不再转发，但短信正常。

**解决方案**：部分 ROM 重启后会重置通知监听权限，需重新在系统设置中授权，或在 SmsForwarder 设置中开启「通知监听守护」。

### 多条转发延迟

**现象**：短时间内大量短信时转发有延迟。

**解决方案**：调整转发间隔和并发数设置，或在规则中设置去重逻辑，避免同一条短信被重复转发。

### 适配 Android 13 通知权限

**解决方案**：Android 13 引入了 `POST_NOTIFICATIONS` 运行时权限，需确保已授予。SmsForwarder V3.x 已适配，首次启动时会请求该权限。

## 六、总结

SmsForwarder 是一款功能完善、设计合理的 Android 短信转发工具，它解决了"备用机短信无人查看"的痛点，支持十余种主流转发渠道，还提供远程控制和自动化任务等高级功能。项目基于成熟的开源组件构建（XUI、AndServer、Cactus 等），代码质量较高，文档完善，社区活跃。对于拥有 Android 备用机的用户来说，这绝对是一款必备工具。

**项目地址**：https://github.com/pppscn/SmsForwarder
