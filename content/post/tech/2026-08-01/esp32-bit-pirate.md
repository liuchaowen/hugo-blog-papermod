---
title: "ESP32 Bit Pirate：开源固件让 ESP32 秒变全协议调试神器"
date: 2026-08-01
description: "ESP32 Bit Pirate 是一款开源固件，将 ESP32-S3 设备变成多协议开发和分析工具，支持 I2C、SPI、UART、蓝牙、Wi-Fi、Sub-GHz、RFID 等数十种协议 sniffing、发送和脚本控制，Web 烧录和 Web Serial 工具开箱即用。"
author: "Cheman"
slug: esp32-bit-pirate
draft: false
categories: ["技术", "开源", "嵌入式"]
tags: ["ESP32", "开源固件", "硬件黑客", "协议分析", "I2C", "SPI", "蓝牙", "Wi-Fi"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ESP32 Bit Pirate**，它是一款开源固件，可以把 ESP32-S3 设备变成多协议开发、分析与脚本控制的全能调试工具，灵感来源于经典硬件圈传奇——Bus Pirate。

## 一、项目概述

ESP32 Bit Pirate 将 ESP32-S3 的强大无线能力与丰富的 GPIO 接口结合，提供了一个统一的交互式命令行界面（CLI），支持通过 USB 串口或 Wi-Fi Web 访问。项目支持的设备包括 ESP32-S3 Dev Kit、LILYGO T-Display-S3、LILYGO T-Embed、M5 AtomS3 Lite、M5 Cardputer、M5 Stick S3、Seeed Studio Xiao ESP32-S3 等多种主流 ESP32-S3 开发板。

固件内置了超过 20 种工作模式，涵盖有线协议、无线协议和射频协议三大类：

**有线协议模式：**
- HiZ（高阻抗默认模式）
- I2C（扫描、Glitch、从机模式、EEPROM dump）
- SPI（EEPROM、Flash、SD 卡）
- UART / 半双工 UART（桥接、读写）
- 1-Wire（iButton、EEPROM）
- 2-Wire / 3-Wire（嗅探、智能卡）
- DIO（数字 I/O、PWM）
- JTAG（扫描、SWD）

**无线与射频协议：**
- 蓝牙（BLE HID、扫描、伪造、嗅探）
- Wi-Fi / Ethernet（嗅探、Deauth、Nmap、Netcat）
- 红外（发送、录制、万能遥控，支持 80+ 协议）
- USB（HID、Flashrom、存储）
- Sub-GHz（分析、录制、重放）
- RFID（读、写、克隆）
- RF24（扫描、发送、接收）
- FM（分析、广播）
- CAN（嗅探、收发帧）
- CELL（SIM 卡读取、短信、电话）

## 二、技术原理

### 架构设计

固件采用模块化分层架构，核心层负责协议解析和 GPIO 控制，协议层各自独立实现不同模式，主控层通过统一的 CLI 接口与用户交互。所有模式共享同一套命令解析引擎，命令结构参考了 Bus Pirate 的字节码风格，同时支持 Python 脚本自动化。

核心源码结构（从仓库 files 字段分析）：
```
src/
├── modes/           # 各协议模式实现
│   ├── i2c.c
│   ├── spi.c
│   ├── uart.c
│   ├── bluetooth.c
│   ├── wifi.c
│   └── ...
├── cli/             # 命令行接口
├── bytecode/        # Bus Pirate 风格字节码解释器
├── web/             # Web 界面
└── main.c
```

### Web 烧录原理

固件集成了 [Web Flasher](https://geo-tp.github.io/ESP32-Bit-Pirate/webflasher/)，利用浏览器 Web Serial API 直接将固件烧录到设备，无需安装任何桌面软件。其底层调用 `esptool.py` 的 WebAssembly 版本，通过串口与 ESP32 通信完成分区写入。

### 协议嗅探原理

以 I2C 嗅探为例，固件在 HiZ 模式下将 GPIO 配置为开漏上拉，实时采样 SCL 和 SDA 线，通过中断精确记录边沿时间戳，再在内存中重组为协议帧。整个过程在 ESP32-S3 的两个 CPU 核上分别运行采样和分析任务，保证不丢帧。

### Baudrate 自动检测

UART 模式下内置了自动波特率检测算法，通过统计起始位和数据位的脉冲宽度分布来识别标准速率（9600~921600），无需手动设置，降低了使用门槛。

## 三、安装与快速开始

### 环境要求

- ESP32-S3 开发板（至少 8MB Flash）
- Chrome / Edge / Firefox 等现代浏览器（用于 Web 烧录和 Web Serial）
- USB 数据线

### 快速安装

**方式一：Web 烧录（推荐）**

1. 打开 [ESP32 Bit Pirate Web Flasher](https://geo-tp.github.io/ESP32-Bit-Pirate/webflasher/)
2. 选择对应的设备型号
3. 点击烧录，等待完成

**方式二：M5Burner**

在 [M5Stack 官方文档](https://docs.m5stack.com/en/download) 下载 M5Burner，找到对应设备分类中的 ESP32-Bit-Pirate，一键烧录。

### 连接使用

**串口连接：**
```bash
# 使用 screen 或 minicom 连接
screen /dev/ttyUSB0 115200
```

**Web Serial（无需安装软件）：**
打开 [Web Serial Terminal](https://geo-tp.github.io/ESP32-Bit-Pirate/web-tools/web-serial-terminal/)，浏览器直接连接设备。

**Wi-Fi 模式：**
首次启动后在 HiZ 模式输入 `wifi setup` 配置 SSID 和密码，之后即可通过浏览器访问设备的 Web CLI。

### 基础命令示例

```
> mode              # 切换模式，选择 I2C/SPI/UART 等
> help              # 查看当前模式下的所有命令
> scan              # I2C 地址扫描
> sniff             # 启动协议嗅探
> eeprom dump       # 读取 EEPROM 内容
```

## 四、使用方法与实战

### 实战一：I2C 设备扫描与 EEPROM 读取

以读取常见 I2C EEPROM 为例：

```
> mode I2C
> scan
# 输出: [0x50] -> found!
> eeprom dump 0x50 0x0000 256
# 输出 EEPROM 前 256 字节内容
```

### 实战二：UART 嗅探抓取调试数据

```
> mode UART
> sniff
# 自动检测波特率并开始抓包
# 输出 ASCII 十六进制混合数据流
```

### 实战三：红外万能遥控

```
> mode INFRARED
> send philips tv power
# 或录制自己的遥控信号
> record
# 按下遥控器按键
> send recorded
```

### 进阶：Python 自动化脚本

通过 Python 脚本实现自动化协议交互：

```python
from esp32_bit_pirate import BitPirate

bp = BitPirate('/dev/ttyUSB0', baudrate=115200)
bp.mode('I2C')
bp.write(0x50, b'\x00\x00\x12\x34')
data = bp.read(0x50, 4)
print(data)
```

Python Lab 提供了[浏览器内在线编辑和运行脚本](https://geo-tp.github.io/ESP32-Bit-Pirate/web-tools/python-lab/)的能力，无需本地配置环境。

## 五、常见问题与解决方案

**Q1：烧录后设备无法启动？**
确保开发板有至少 8MB Flash，且为 ESP32-S3 芯片。部分克隆板使用 ESP32（非 S3 变体）则不支持该固件。

**Q2：Wi-Fi 模式连接失败？**
首次使用需在串口终端中配置 Wi-Fi：`wifi setup <ssid> <password>`，确认路由器频段为 2.4GHz（固件暂不支持 5GHz Wi-Fi）。

**Q3：I2C 扫描找不到设备？**
检查接线是否正确（SDL/SCLA），确认设备已上电，且上拉电阻已连接（固件提供软件上拉，可通过命令 `pullup on` 开启）。

**Q4：蓝牙嗅探没有数据？**
蓝牙模式需要在配置中启用对应权限，且部分设备蓝牙天线位置不同，信号强度有差异。建议靠近目标设备。

**Q5：波特率自动检测不准？**
对于非标准波特率，可手动指定：`uart baud 57600`，支持的速率范围从 300 到 921600。

## 六、总结

ESP32 Bit Pirate 将 ESP32-S3 的硬件能力发挥到了极致，融合了经典 Bus Pirate 的命令行交互风格与现代 Web 技术的便利性。无论你是嵌入式开发者、硬件逆向工程师，还是 IoT 爱好者，这款开源固件都值得一试。它用极低的硬件门槛（百元内的 ESP32-S3 开发板）提供了专业级的协议分析和调试能力，且完全开源、社区活跃，值得持续关注。

- GitHub：[geo-tp/ESP32-Bit-Pirate](https://github.com/geo-tp/ESP32-Bit-Pirate)
- 官网：[geo-tp.github.io/ESP32-Bit-Pirate](https://geo-tp.github.io/ESP32-Bit-Pirate/)
