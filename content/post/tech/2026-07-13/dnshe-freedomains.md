---
title: "DNSHE Free Domains：面向开发者的免费域名与 DNS 解析服务"
date: "2026-07-13"
description: "DNSHE 是一个由新加坡公益团队运营的免费域名注册和 DNS 解析平台，为开发者、开源项目和早期互联网创作者提供稳定、易用的免费域名基础设施，支持 A/AAAA/CNAME/MX/TXT 等全量 DNS 记录和 API 自动化管理。"
author: "Cheman"
slug: dnshe-freedomains
draft: false
categories: ["技术", "开源", "工具"]
tags: ["GitHub", "开源", "DNS", "免费域名", "开发者工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**DNSHE Free Domains**，一个来自新加坡公益团队的免费域名注册和 DNS 解析平台，一句话描述它的核心价值——为开发者、学生和开源项目提供永久免费的域名基础设施。

## 一、项目概述

DNSHE 是一个专注于公共利益的域名服务平台，核心使命是为开发者社区提供稳定、免费的域名注册和 DNS 解析能力。与传统域名服务商不同，DNSHE 完全免费，无需信用卡，支持 API 驱动的工作流，特别适合自动化、CI/CD 测试环境和个人项目展示等场景。

### 核心特性一览

- **免费域名注册**：支持多个开放注册的后缀，包括 `.de5.net`、`.us.ci`、`.cc.cd`、`.bot.cd` 等
- **全量 DNS 记录支持**：A、AAAA、CNAME、MX、TXT、NS、SRV、CAA 等所有主流记录类型
- **仪表盘管理**：Web 控制台直接管理域名和 DNS 记录
- **API 自动化**：完整 API 接口，支持脚本化、CI/CD 集成、部署流水线
- **零门槛注册**：无需信用卡，公益基础设施人人可用

### 支持的后缀及推荐场景

| 后缀 | 推荐使用场景 |
|------|-------------|
| `.de5.net` | 技术博客、作品集、演示项目、开源项目主页 |
| `.us.ci` | CI/CD、SaaS、API 端点、测试环境 |
| `.cc.cd` | 个人品牌、设计工作室、创意项目展示 |
| `.bot.cd` | AI 机器人、聊天助手、Webhook、自动化项目 |

## 二、技术原理与架构

DNSHE 的技术架构可以划分为三个核心层次：**域名注册层**、**DNS 解析层**和**API 自动化层**。

### 域名注册层

DNSHE 拥有自主运营的公共后缀（如 `.de5.net`、`.us.ci` 等），用户在平台注册后获得子域名的完整控制权。与 ICANN 体系下的顶级域名（TLD）不同，这些后缀由 DNSHE 团队直接运营，绕过了传统域名注册商的高昂费用和繁琐流程。

注册流程极为简洁：

```bash
# 1. 访问 DNSHE 注册账号
# https://my.dnshe.com/register.php

# 2. 进入 Domain Hub 搜索可用域名
# https://my.dnshe.com/index.php?m=domain_hub

# 3. 选择后缀（如 de5.net）和前缀，完成注册
```

### DNS 解析层

DNS 记录通过 DNSHE 的权威 DNS 服务器进行分发，底层基于标准 DNS 协议实现全量记录类型支持。以下是常见 DNS 记录的配置示例：

```bash
# A 记录 — 指向 IPv4 地址
# 适用于：个人博客、VPS 项目

# AAAA 记录 — 指向 IPv6 地址
# 适用于：IPv6 支持的服务器

# CNAME 记录 — 域名别名
# 适用于：绑定 GitHub Pages、Netlify 等平台

# TXT 记录 — 文本记录
# 适用于：邮件 SPF、域名验证、DKIM 配置

# MX 记录 — 邮件交换
# 适用于：配置自定义邮箱（如 @yourdomain.de5.net）
```

### API 自动化层

DNSHE 的 API 是整个平台最有技术含量的部分，支持通过 HTTP 请求程序化管理域名和 DNS 记录，实现了"代码即基础设施"的理念。

```bash
# 示例：通过 API 添加 DNS 记录
curl -X POST "https://api.dnshe.com/v1/records" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "myproject.de5.net",
    "type": "A",
    "name": "@",
    "value": "192.0.2.1",
    "ttl": 3600
  }'
```

完整的 API 文档可在 [Free Domain Name Service API User Manual](https://my.dnshe.com/knowledgebase/1/Free-Domain-Name-Service-API-User-Manual) 获取。

## 三、安装与快速开始

### 环境要求

- 一个 DNSHE 账号（免费注册，无需信用卡）
- 可访问 DNSHE 控制台或 API 的网络环境
- （可选）GitHub Token 用于私有仓库场景

### 注册账号

访问 [DNSHE 注册页面](https://my.dnshe.com/register.php) 完成账号创建，验证邮箱后即可使用全部功能。

### 配置第一个免费域名

```bash
# Step 1: 登录 DNSHE，进入 Domain Hub
# https://my.dnshe.com/index.php?m=domain_hub

# Step 2: 搜索你想要的域名（如 yourname.de5.net）
# 如果可用，直接注册

# Step 3: 配置 DNS 记录
# 添加 A 记录指向你的服务器 IP

# Step 4: 等待 DNS 生效（通常 5 分钟内）
```

### 使用 API 管理域名

如果你需要自动化管理，可以使用 Python 脚本调用 API：

```python
import requests

API_BASE = "https://api.dnshe.com/v1"
TOKEN = "your_access_token_here"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 获取域名列表
domains = requests.get(f"{API_BASE}/domains", headers=headers)
print(domains.json())

# 添加 DNS 记录
record = {
    "domain": "myproject.de5.net",
    "type": "A",
    "name": "www",
    "value": "192.0.2.1",
    "ttl": 3600
}
resp = requests.post(f"{API_BASE}/records", json=record, headers=headers)
print(resp.json())
```

## 四、使用方法与实战

### 场景一：个人作品集/技术博客

如果你想为个人博客绑定一个免费域名（避免每年续费成本）：

```bash
# 1. 注册 yourname.de5.net
# 2. 配置 CNAME 记录指向 GitHub Pages
#    name: @, value: yourname.github.io
# 3. 完成！访问 yourname.de5.net 即可
```

### 场景二：自动化测试环境

在 CI/CD 流水线中，每次构建动态生成一个测试域名：

```bash
#!/bin/bash
# .github/workflows/dynamic-domain.yml

DOMAIN="test-$(date +%s).us.ci"

# 通过 API 创建临时子域名
curl -X POST "https://api.dnshe.com/v1/records" \
  -H "Authorization: Bearer $DNSHE_TOKEN" \
  -d "{\"domain\":\"$DOMAIN\",\"type\":\"A\",\"value\":\"$SERVER_IP\"}"

echo "Test URL: https://$DOMAIN"
# 跑测试...
```

### 场景三：Webhook 与自动化工具

配置自定义域名给自动化工具使用：

```bash
# 注册 bot.cc.cd 域名
# 配置 A 记录指向服务器
# 部署 Telegram Bot、Discord Bot 或 GitHub Webhook Receiver
# 不再需要每次更换 IP 或依赖动态 DNS 服务
```

## 五、常见问题与解决方案

### 注册时提示"域名已被使用"

这是正常现象——DNSHE 的后缀是开放注册的，热门前缀（如 `test`、`demo`、`www`）通常很快被占用。建议：
- 使用更独特的前缀（如 `john-2026.de5.net`）
- 尝试不同的后缀（如从 `.de5.net` 切换到 `.us.ci`）
- 使用较长的随机字符串作为前缀

### DNS 记录修改后不生效

DNS 传播通常需要 5-30 分钟，全球递归 DNS 服务器缓存会导致延迟。解决方法：
- 清除本地 DNS 缓存（`sudo dscacheutil -flushcache` on macOS）
- 使用 `dig yourdomain.de5.net` 验证解析结果
- 等待 30 分钟后再次测试

### API 请求返回 401 Unauthorized

检查以下几点：
- Token 是否正确获取（在 Domain Hub 中生成）
- Token 是否过期，重新生成
- 请求头格式是否正确（必须是 `Bearer TOKEN`）

### 免费服务是否有使用限制？

根据 DNSHE 的服务条款，基础免费服务对以下行为有限制：
- 禁止用于钓鱼、欺诈、恶意软件
- 禁止大规模自动化滥用
- 禁止商业转售或出租域名
- 合理使用范围内无硬性流量限制

## 六、总结

DNSHE Free Domains 是一个难得一见的开发者友好型免费域名基础设施。它解决了两个长期困扰个人开发者的痛点：**高昂的域名续费成本**和**缺乏自动化 DNS 管理能力**。无论是搭建个人博客、自动化测试环境、CI/CD 流水线还是 AI Bot，DNSHE 都能提供即开即用的免费域名方案。

公益团队的运营理念也让人印象深刻——平台没有强制广告，不收集过度隐私数据，并且提供了完整的滥用举报机制来维护域名生态的健康。

如果你正在为个人项目寻找免费域名，或者需要一套支持 API 自动化的 DNS 管理方案，不妨去 [dnshe.com](https://www.dnshe.com) 体验一下。

> 项目地址：[https://github.com/dnshe/DNSHE-FreeDomains](https://github.com/dnshe/DNSHE-FreeDomains)
> 免费注册：[https://my.dnshe.com/register.php](https://my.dnshe.com/register.php)
