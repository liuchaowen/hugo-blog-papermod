---
title: "StackChan：超可爱的开源 AI 桌面机器人"
date: 2026-07-29
description: "StackChan 是 M5Stack 社区共创的超可爱开源 AI 桌面机器人，基于 ESP32-S3 的 CoreS3 主控，支持 AI Agent、表情动画、远程遥控和 OTA 升级，可 Arduino / UiFlow2 编程，高度可定制。"
author: "Cheman"
slug: stackchan
draft: false
categories: ["技术", "开源"]
tags: ["M5Stack", "ESP32", "AI Robot", "开源硬件", "IoT"]
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

今天在 GitHub Trending 上看到一个让人忍不住想拥有的项目：**StackChan**，一款由 M5Stack 与社区用户共创的超可爱开源 AI 桌面机器人。它用 ESP32-S3 驱动，配有 2 寸触摸屏、摄像头、麦克风和 RGB  LED，内置 AI Agent，直接买回家就能玩。

## 一、项目概述

StackChan 是一个开源桌面机器人项目，核心目标是打造一款**既有科技感又有灵魂感**的桌面伴侣。开发者可以在 M5Stack CoreS3 的基础上，通过修改固件赋予它不同的性格和能力。

**核心技术参数：**

| 模块 | 参数 |
|------|------|
| 主控 | M5Stack CoreS3（ESP32-S3，240MHz 双核） |
| 内存 | 16MB Flash + 8MB PSRAM |
| 显示屏 | 2.0 英寸电容式触摸屏 |
| 传感 | 0.3MP 摄像头、光感 + 接近传感器、9轴 IMU |
| 音频 | 1W 扬声器、双麦克风 |
| 通信 | Wi-Fi + BLE |
| 存储 | microSD 卡槽 |
| 机器人身体 | 550mAh 电池、360° 连续旋转舵机 + 90° 俯仰舵机、12 颗 RGB LED、红外收发、NFC |

出厂固件功能已相当完善：内置 AI Agent、丰富的表情动画、ESP-NOW 无线遥控、手机 App 远程avatar控制，以及在线 OTA 升级。

## 二、技术原理

### 硬件架构

StackChan 采用**主控 + 机器人身体**的分体设计。主控 CoreS3 通过底部连接器和排线与机器人身体通信，两者通过 UART 协议交换控制指令。

**舵机控制核心片段（Arduino 示例）：**

```cpp
#include <M5Stack.h>
#include <StackChan_Config.h>

// 水平轴：360° 连续旋转（方向 + 速度控制）
void servo_rotate(int speed) {
  int pulse = map(constrain(speed, -100, 100), -100, 100, 1000, 2000);
  ledcWrite(SERVO_H_PWM_CH, pulse);
}

// 垂直轴：90° 俯仰（角度控制）
void servo_tilt(int angle) {
  int pulse = map(constrain(angle, -45, 90), -45, 90, 1000, 2000);
  ledcWrite(SERVO_V_PWM_CH, pulse);
}
```

### AI Agent 集成

出厂固件通过 Wi-Fi 连接云端 AI 服务，实现语音对话和情感反馈。核心交互逻辑为：麦克风采集 → ASR 语音识别 → 大模型对话生成 → TTS 语音合成 → 舵机动画 + 表情驱动。

### ESP-NOW 遥控

StackChan 支持 ESP-NOW 协议进行低延迟无线遥控，无需 Wi-Fi 路由器即可点对点通信，控制距离可达百米级别，延迟低于 20ms，非常适合作为远程操控的 avatar 载体。

## 三、安装与快速开始

### 购买与组装

官方提供完整套件，可从 [M5Stack 官方商店](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) 或淘宝购买。组装难度中等，随套件附赠详细组装指南。

### 开发环境

**方式一：Arduino**

在 Arduino Library Manager 中搜索并安装 `StackChan` 库，然后选择 `Tools > Board > M5Stack-CoreS3`，即可开始编程。

```cpp
#include <StackChan.h>

StackChan robot;

void setup() {
  Serial.begin(115200);
  robot.begin();
  robot.setLED(255, 100, 200); // 设置 LED 颜色
}

void loop() {
  robot.shake();  // 摇头
  delay(1000);
  robot.nod();     // 点头
  delay(1000);
}
```

**方式二：UiFlow2 可视化编程**

M5Stack 官方提供 UiFlow2图形化编程工具，拖拽积木即可控制舵机、屏幕显示和 AI 对话，无需写代码，适合教育场景。

### OTA 固件升级

固件支持在线升级，只需长按机器人背后的复位键进入下载模式，连接 Wi-Fi 后自动检测并推送最新固件。

## 四、常见问题与解决方案

**Q：舵机发出异响怎么办？**
A：检查舵机供电是否稳定（需 5V/1A 以上），确保机器人身体排线连接牢固；避免在舵机运动时手动旋转关节。

**Q：AI Agent 无法连接？**
A：确认 Wi-Fi 正常后，检查固件版本是否支持最新的 API 配置；可通过串口查看详细错误日志。

**Q：OTA 升级失败？**
A：建议使用有线方式重新烧录固件，可从 [StackChan-BSP](https://github.com/m5stack/StackChan-BSP) 获取最新版本。

## 五、总结

StackChan 的魅力在于它同时兼顾了**开源可玩性**和**开箱即用的完成度**——你可以零基础用出厂固件当桌面伴侣，也可以深入改写固件让它变成专属 AI 助手；舵机 + LED + 屏幕的组合为交互设计提供了丰富的表达空间。如果你对硬件编程、AI 机器人和开源文化感兴趣，StackChan 绝对值得关注。
