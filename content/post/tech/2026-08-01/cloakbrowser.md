---
title: "CloakBrowser：源码级 C++ 补丁的隐身 Chromium，通过所有反爬虫检测"
date: "2026-08-01"
description: "CloakBrowser 是一款在 C++ 源码层面对 Chromium 进行指纹修改的隐身浏览器，71 个源码级补丁让它在 bot 检测中表现为真实浏览器。pip install 即可使用，兼容 Playwright API，通过 Cloudflare Turnstile、FingerprintJS 等 30+ 检测服务验证。"
author: "Cheman"
slug: cloakbrowser
draft: false
categories: ["技术", "开源"]
tags: ["Python", "JavaScript", "浏览器自动化", "反爬虫", "Chromium"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**CloakBrowser**，一个在 C++ 源码层面对 Chromium 指纹进行修改的隐身浏览器，官方宣称它通过 Cloudflare Turnstile、FingerprintJS、reCAPTCHA v3 等 30+ 反爬虫检测服务——而且它不是打补丁注入 JS，而是真正修改源码后编译出来的二进制。

## 一、项目概述

CloakBrowser 由 [CloakHQ](https://github.com/CloakHQ/CloakBrowser) 开发，核心思路非常直接：**不是给 Chrome 加配置参数或注入 JS 脚本，而是直接把指纹修改写进 Chromium 源码，重新编译成二进制**。这样检测系统看到的浏览器"指纹"本身就是真实浏览器的指纹，不需要通过 JS 逆向去骗过检测。

核心特性一览：

- **71 个源码级 C++ 补丁** — 覆盖 canvas、WebGL、audio、fonts、GPU、screen、WebRTC、网络时序、自动化信号、CDP 输入行为等所有常见检测维度
- **`humanize=True`** — 一行参数开启类人行为模拟（鼠标曲线、键盘时序、滚动模式）
- **reCAPTCHA v3 得分 0.9** — 达到人类级别，由服务端验证
- **通过 Cloudflare Turnstile** — 非交互式挑战自动通过，单击式挑战一次点击通过
- **pip / npm 一键安装** — 二进制自动下载，无需手动配置
- **零配置开箱即用** — 启动时自动生成随机指纹种子，不需要手动指定任何参数

支持的编程语言绑定：

| 语言 | 安装命令 | 依赖 |
|---|---|---|
| Python | `pip install cloakbrowser` | playwright |
| JavaScript/Node.js | `npm install cloakbrowser playwright-core` | Playwright |
| .NET / C# | `dotnet add package CloakBrowser` | Microsoft.Playwright |

**免费版 vs. Pro 版：**

- **免费版**：最新 Chromium 150 二进制，带 71 个补丁，一个并发会话，GitHub 登录即可获取
- **Pro 版**：支持 5/20/200/2000+ 并发，最新补丁优先推送，含技术支持

## 二、技术原理

### 2.1 为什么源码级补丁比 JS 注入更强

大多数隐身浏览器（如 `playwright-stealth`、`undetected-chromedriver`、`puppeteer-extra`）的工作方式是：**在浏览器启动后，通过 JS 脚本修改 `navigator.webdriver`、`navigator.plugins` 等属性**，或者通过启动参数隐藏 `HeadlessChrome` 等特征。

这种方式有两个致命问题：

1. **Chrome 每次更新都可能破坏这些补丁** — JS 注入点或启动参数一变，整个方案就失效
2. **检测系统专门针对这类补丁** — FingerprintJS 等现代检测库会识别出 JS 被修改过的痕迹

CloakBrowser 的做法是**直接修改 Chromium 源码中的相关 C++ 文件**，在编译时将修改固化进二进制：

```
chromium/src/content/browser/devtools/protocol/...
                                      ↓
                          源码级 C++ 补丁（71个）
                                      ↓
                              Chromium 二进制
                                      ↓
                   所有指纹在二进制层面就是真实浏览器的指纹
```

以 `navigator.webdriver` 为例，源码级补丁直接修改了生成该属性的 C++ 代码，让它返回 `false`，而不是通过 JS 注入去覆盖它。检测系统调用原生浏览器 API，拿到的就是原生返回值。

### 2.2 核心补丁维度

根据项目文档，CloakBrowser 的 71 个源码级补丁覆盖以下维度：

| 维度 | 检测内容 | 补丁效果 |
|---|---|---|
| Canvas | 2D 画布指纹 | 返回真实随机噪声 |
| WebGL | WebGL 渲染器指纹 | 返回真实 GPU 参数 |
| Audio | AudioContext 指纹 | 模拟真实音频处理链 |
| Fonts | 字体枚举指纹 | 返回与真实 Chrome 一致的字体列表 |
| GPU | GPU 型号、渲染器 | 真实硬件信息或合理模拟值 |
| Screen | 分辨率、颜色深度 | 匹配实际屏幕配置 |
| WebRTC | 本地 IP / 候选地址 | 支持代理出口 IP 自动 spoofing |
| 网络时序 | 请求延迟特征 | 移除代理特征时序 |
| 自动化信号 | `navigator.webdriver` | 永久返回 `false` |
| CDP 输入行为 | 自动化工具特征 | 模拟真实用户输入模式 |
| TLS 指纹 | JA3/JA4/Akamai | 与 Chrome 完全一致 |

### 2.3 WebRTC IP 隐藏

当使用代理并开启 `geoip=True` 时，CloakBrowser 会自动解析代理出口 IP，并通过 `--fingerprint-webrtc-ip=auto` 参数将 WebRTC ICE 候选地址 spoofing 为代理出口 IP，整个过程无需额外网络调用：

```python
browser = launch(
    proxy="http://user:pass@proxy:port",
    geoip=True,  # 自动匹配时区和 locale，并 spoof WebRTC IP
)
```

### 2.4 humanize 行为模拟

`humanize=True` 参数开启后，所有鼠标、键盘、滚动操作都会模拟真实用户行为：

```python
from cloakbrowser import launch

browser = launch(humanize=True)
page = browser.new_page()
# 鼠标移动走贝塞尔曲线，而不是直线
page.click("#submit-button")
# 键盘输入有随机延迟，逐字输入
page.type("#search-input", "hello world")
```

内部使用 Bézier 曲线生成鼠标轨迹，并自动等待元素变为 visible、enabled、stable 之后再执行动作，避免被行为检测捕获。

## 三、安装与快速开始

### 3.1 环境要求

- **Python 3.8+** 或 **Node.js 18+**
- Linux / Windows / macOS 均支持
- 首次运行自动下载 ~200MB 的定制 Chromium 二进制（自动根据平台选择免费版或 Pro 版）

### 3.2 安装步骤

**Python：**

```bash
pip install cloakbrowser
```

**JavaScript / Node.js（Playwright）：**

```bash
npm install cloakbrowser playwright-core
```

**JavaScript / Node.js（Puppeteer）：**

```bash
npm install cloakbrowser puppeteer-core
```

**Docker 一键体验（无需安装）：**

```bash
docker run --rm cloakhq/cloakbrowser cloaktest
```

### 3.3 最简运行示例

**Python（Playwright 风格）：**

```python
from cloakbrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
browser.close()
```

**JavaScript：**

```javascript
import { launch } from 'cloakbrowser';

const browser = await launch();
const page = await browser.newPage();
await page.goto('https://example.com');
await browser.close();
```

**从 Playwright 迁移（改动极小）：**

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from cloakbrowser import launch
+ browser = launch()

page = browser.new_page()
page.goto("https://example.com")
# 其余代码完全不变
```

### 3.4 配合代理使用（反爬高难度站点）

```python
from cloakbrowser import launch

browser = launch(
    proxy="http://user:pass@residential-proxy:port",  # 推荐住宅 IP，不建议数据中心 IP
    geoip=True,        # 自动匹配代理 IP 对应的时区和语言
    headless=False,    # 部分站点会检测 headless，即使有 C++ 补丁也建议关闭
    humanize=True,     # 开启类人行为模拟
)

page = browser.new_page()
page.goto("https://target-site.com")
```

## 四、使用方法与进阶

### 4.1 隐身配置一览

| 参数 | 类型 | 说明 |
|---|---|---|
| `proxy` | str | HTTP/SOCKS5 代理地址 |
| `geoip` | bool | 自动从代理 IP 匹配时区和 locale |
| `humanize` | bool | 开启类人鼠标/键盘/滚动行为 |
| `headless` | bool | 是否无头模式（部分站点建议 False） |
| `license_key` | str | Pro 版许可证密钥 |
| `extension_paths` | list | 加载 Chrome 扩展路径 |
| `human_config` | dict | 单次调用覆盖 humanize 设置 |

### 4.2 持久化上下文（保持登录状态）

```python
from cloakbrowser import launch_persistent_context

context = launch_persistent_context(
    proxy="http://proxy:port",
    geoip=True,
)
# cookies 和 localStorage 会持久化到本地
# 再次运行时代理登录状态保留，不触发 re-login 检测
page = context.new_page()
```

### 4.3 与 AI Agent 框架集成

CloakBrowser 官方列出了以下集成案例：

```python
# browser-use
from agent import Agent
from cloakbrowser import launch

agent = Agent(launch)

# Crawl4AI
from crawl4ai import AsyncWebCrawler
# CloakBrowser 二进制注入到 crawler 即可

# Stagehand / LangChain / Selenium
# 均通过 Playwright API 兼容层接入
```

### 4.4 Native SOCKS5 代理支持

CloakBrowser 支持在 `proxy` 参数中直接传入 SOCKS5 代理，并自动通过 UDP ASSOCIATE 处理 QUIC/HTTP3 隧穿：

```python
browser = launch(proxy="socks5://user:pass@proxy:port")
```

## 五、常见问题与解决方案

**Q：CloakBrowser 能解决 CAPTCHA 吗？**

不能。CloakBrowser 的目标是防止 CAPTCHA 出现（通过让浏览器看起来像真实用户），而不是解决已经出现的 CAPTCHA。它不集成任何 CAPTCHA 破解服务。

**Q：免费版和 Pro 版的区别是什么？**

免费版使用 GitHub 登录获取许可证，支持一个并发会话；Pro 版支持 5/20/200/2000+ 并发，补丁更新优先，有技术支持。注意：反爬虫系统每周都在更新，过旧的二进制会逐渐失效，因此 Pro 版的"最新补丁优先"特性是核心价值。

**Q：Docker 中运行需要 GUI 环境吗？**

不需要。Docker 镜像内置了 Xvfb + Openbox 虚拟帧缓冲，在无头服务器环境下完全正常运行。

**Q：代理被检测到了怎么办？**

确保使用**住宅代理（Residential Proxy）而非数据中心代理**。数据中心代理的 IP 段本身就被许多反爬虫系统标记。同时配合 `geoip=True` 让时区和 locale 与代理 IP 匹配，进一步降低被检测概率。

**Q：`headless=False` 仍然被检测到怎么办？**

部分高级检测系统（如 Kasada）会检测浏览器是否运行在虚拟机或 Docker 环境中。可以尝试在真实物理机的 macOS/Windows 上以 headed 模式运行，或使用 `--no-sandbox` 和特定启动参数绕过虚拟机检测。

## 六、总结

CloakBrowser 的核心创新在于**将反爬虫检测的博弈从"运行时 JS 注入"升级到了"源码编译时固化"**，从根本上避免了 JS 补丁易失效、被检测的问题。71 个源码级 C++ 补丁覆盖了几乎所有主流指纹维度，加上可选的 `humanize` 行为模拟，让它成为目前对抗高级反爬虫系统最彻底的方案之一。

如果你在做的项目遇到：

- Cloudflare Turnstile 频繁拦截
- reCAPTCHA 得分极低
- FingerprintJS 识别为机器人
- 行为检测（鼠标轨迹、输入时序）触发风控

CloakBrowser 值得一试——特别是它的免费版，pip 一键安装，3 行代码即可替换现有 Playwright 代码，零配置体验最新隐身 Chromium。

项目地址：[https://github.com/CloakHQ/CloakBrowser](https://github.com/CloakHQ/CloakBrowser)
