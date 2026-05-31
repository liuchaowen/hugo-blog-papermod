---
title: "Scrapling：自适应智能爬虫框架，让数据采集不再头疼"
date: 2026-05-31
description: "Scrapling 是一款现代化的 Python 爬虫框架，集自适应解析、反爬虫绕过、全站并发爬取于一体。其解析器能自动应对网页结构变化，内置 StealthyFetcher 可绕过 Cloudflare Turnstile 等反爬机制，同时提供类 Scrapy 的 Spider API，是从单请求到大规模爬取的统一解决方案。"
author: "Cheman"
slug: scrapling
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "Python", "爬虫", "开源", "数据采集"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Scrapling**，一句话描述项目核心价值——它是一个「自适应」的 Web 爬虫框架，解析器能在网页结构变化时自动重新定位元素，同时内置了绕过 Cloudflare 等反爬机制的能力，真正把现代爬虫的痛点一站式解决了。

## 一、项目概述

Scrapling 由 Karim Shoair（D4Vinci）开发，是一个覆盖「单请求 → 全站并发爬取」全链路的 Python 爬虫框架。它的核心定位是：

- **自适应解析**：页面结构变了，解析器自动重新定位你之前选中的元素，不再需要手动维护选择器
- **反爬绕过**：内置 StealthyFetcher，可绕过 Cloudflare Turnstile/Interstitial，无需额外配置
- **统一 API**：兼顾简洁的单请求调用和类 Scrapy 的 Spider 框架，按需选择复杂度
- **高性能**：解析速度与原生 lxml 相当，显著快于 BeautifulSoup、MechanicalSoup 等主流库

项目目前版本 v0.4.8，测试覆盖率 92%，已有数百名爬虫开发者日常使用，支持 Python 3.10+。

## 二、技术原理

### 架构设计

Scrapling 的架构可以划分为三层：

```
┌─────────────────────────────────────┐
│         Spider Framework            │  ← 并发爬取、暂停恢复、流式输出
├─────────────────────────────────────┤
│         Fetchers (多种)             │  ← HTTP / Stealthy / Dynamic
├─────────────────────────────────────┤
│      Adaptive Parser Engine         │  ← 自适应元素追踪、智能相似度算法
└─────────────────────────────────────┘
```

### 核心技术栈

**1. 自适应解析引擎（Adaptive Parser）**

这是 Scrapling 最具创新性的部分。传统爬虫最大的维护成本就是「选择器失效」—— 网页改版后 CSS 选择器不再匹配。Scrapling 的 Parser 在初次定位元素时会记录该元素的上下文特征（标签、属性、文本内容、兄弟节点关系等），当页面结构发生变化时，调用 `adaptive=True` 参数，解析器会通过智能相似度算法重新定位该元素：

```python
# 首次抓取，自动保存元素特征
products = p.css('.product', auto_save=True)

# 网页改版后，传入 adaptive=True 自动重新定位
products = p.css('.product', adaptive=True)
```

相似度算法综合考虑以下维度：
- 元素自身属性（class、id、name 等）
- 父/子/兄弟节点的结构关系
- 文本内容的部分匹配
- DOM 路径的拓扑相似度

**2. 多层 Fetcher 设计**

Scrapling 提供三种 Fetcher，分别适用不同场景：

| Fetcher | 底层技术 | 适用场景 | 反爬能力 |
|---------|---------|---------|---------|
| `Fetcher` | curl_cffi (HTTP/3 支持) | 静态页面、高并发 | 中（TLS 指纹伪装） |
| `StealthyFetcher` | Playwright + 指纹欺骗 | 有 Cloudflare 的页面 | 强（完整浏览器环境） |
| `DynamicFetcher` | Playwright Chromium | 重度 JS 渲染页面 | 中（需配合 Stealthy） |

`Fetcher` 使用 `curl_cffi` 库，可完整 impersonate Chrome/Firefox 的 TLS 指纹，绕过基于 JA3 指纹的封禁：

```python
from scrapling.fetchers import Fetcher

# 伪装成 Chrome 的最新版本
page = Fetcher.get('https://example.com', impersonate='chrome')
```

`StealthyFetcher` 则在真实浏览器环境中执行，并注入指纹欺骗脚本（基于 `apify-fingerprint-datapoints`），可绕过 Cloudflare Turnstile 人机验证：

```python
from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch(
    'https://nopecha.com/demo/cloudflare',
    headless=True,
    solve_cloudflare=True,  # 自动绕过 Cloudflare
    network_idle=True        # 等待网络空闲（页面完全加载）
)
```

**3. Spider 并发框架**

Spider 的设计灵感来自 Scrapy，但做了大量现代化改进：

- **并发控制**：`concurrent_requests` 参数控制全局并发数，同时支持 per-domain 限流
- **暂停/恢复**：通过 checkpoint 机制，Ctrl+C 优雅退出，重启后从中断处继续
- **流式输出**：`async for item in spider.stream()` 实时获取爬取结果，适合长时间运行的任务
- **多 Session 支持**：同一个 Spider 内可同时使用 HTTP Session 和浏览器 Session，根据 URL 特征动态路由

```python
from scrapling.spiders import Spider, Request, Response
from scrapling.fetchers import FetcherSession, AsyncStealthySession

class MultiSessionSpider(Spider):
    name = "multi"
    start_urls = ["https://example.com/"]
    concurrent_requests = 10

    def configure_sessions(self, manager):
        # 注册两个 Session：「fast」用于普通页面，「stealth」用于反爬严格的页面
        manager.add("fast", FetcherSession(impersonate="chrome"))
        manager.add("stealth", AsyncStealthySession(headless=True), lazy=True)

    async def parse(self, response: Response):
        for link in response.css('a::attr(href)').getall():
            if "protected" in link:
                yield Request(link, sid="stealth")   # 走浏览器
            else:
                yield Request(link, sid="fast")      # 走 HTTP
```

**4. MCP Server（AI 集成）**

Scrapling 内置了 MCP Server（`scrapling[ai]`），可与 Claude/Cursor 等 AI 工具对接。MCP Server 会先利用 Scrapling 的解析能力精准提取目标内容，再将结构化数据交给 AI 处理，大幅减少 token 消耗。

### 性能基准

Scrapling 的 Parser 基于 lxml 构建，性能与原生 lxml 几乎持平：

| 库 | 5000 元素文本提取 (ms) | 相对 Scrapling |
|----|----------------------|---------------|
| **Scrapling** | 2.02 | 1.0x |
| Parsel/Scrapy | 2.04 | 1.01x |
| 原生 lxml | 2.54 | 1.26x |
| PyQuery | 24.17 | ~12x |
| BeautifulSoup (lxml) | 1584.31 | ~784x |

在「按文本内容查找相似元素」的 Benchmark 中，Scrapling 比 AutoScraper 快 **5.2 倍**。

## 三、安装与快速开始

### 环境要求

- Python 3.10 及以上
- （可选）Playwright 浏览器（使用 StealthyFetcher / DynamicFetcher 时需要）

### 安装步骤

```bash
# 基础安装（仅 Parser，无 Fetcher 依赖）
pip install scrapling

# 完整安装（含 Fetcher、CLI、浏览器支持）
pip install "scrapling[all]"

# 安装浏览器依赖（使用 fetchers 时必须）
scrapling install
```

`scrapling install` 会自动下载 Chromium 浏览器及系统依赖，支持 `--force` 参数强制重装。

### 最简运行示例

**场景 1：快速抓取静态页面**

```python
from scrapling.fetchers import Fetcher

page = Fetcher.get('https://quotes.toscrape.com/')
quotes = page.css('.quote .text::text').getall()
print(quotes)
```

**场景 2：绕过 Cloudflare**

```python
from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch(
    'https://nopecha.com/demo/cloudflare',
    headless=True,
    solve_cloudflare=True
)
print(page.css('#padded_content a::text').getall())
```

**场景 3：完整 Spider 爬取**

```python
from scrapling.spiders import Spider, Response

class QuotesSpider(Spider):
    name = "quotes"
    start_urls = ["https://quotes.toscrape.com/"]
    concurrent_requests = 10

    async def parse(self, response: Response):
        for quote in response.css('.quote'):
            yield {
                "text": quote.css('.text::text').get(),
                "author": quote.css('.author::text').get(),
            }
        next_page = response.css('.next a::attr(href)').get()
        if next_page:
            yield response.follow(next_page)

result = QuotesSpider().start()
result.items.to_json("quotes.json")
```

## 四、使用方法与实战

### CLI 无需写代码直接抓取

Scrapling 提供了强大的 CLI，无需写 Python 代码即可完成抓取：

```bash
# 启动交互式 Web 爬取 Shell（基于 IPython）
scrapling shell

# 直接提取网页内容为 Markdown/HTML/TXT
scrapling extract get 'https://example.com' output.md
scrapling extract stealthy-fetch 'https://example.com' output.html \
    --solve-cloudflare --no-headless
```

### 实战：电商商品价格监控

```python
from scrapling.spiders import Spider, Response
from scrapling.fetchers import FetcherSession

class PriceMonitorSpider(Spider):
    name = "price_monitor"
    start_urls = ["https://shop.example.com/products"]
    concurrent_requests = 5

    def configure_sessions(self, manager):
        # 使用 Chrome TLS 指纹伪装
        manager.add("http", FetcherSession(impersonate="chrome"))

    async def parse(self, response: Response):
        for product in response.css('.product-item'):
            yield {
                "name": product.css('.name::text').get(),
                "price": product.css('.price::text').get(),
                "url": response.urljoin(product.css('a::attr(href)').get()),
            }
```

### 代理轮换

```python
from scrapling.fetchers import FetcherSession

# 内置 ProxyRotator，支持循环/自定义策略
session = FetcherSession(
    impersonate="chrome",
    proxies=["http://proxy1:8080", "http://proxy2:8080"],
    proxy_rotation="cycle"  # 循环轮换
)
page = session.get('https://example.com')
```

### Docker 部署

```dockerfile
FROM ghcr.io/d4vinci/scrapling:latest
# 已预装所有依赖和浏览器，可直接运行
```

## 五、常见问题与解决方案

### 安装失败 / `scrapling install` 报错

**问题**：执行 `scrapling install` 时 Playwright 浏览器下载失败。
**解决**：检查网络连接，或手动指定 Playwright 镜像源：
```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright npx playwright install chromium
```
也可使用预构建的 Docker 镜像，跳过本地环境配置。

### `StealthyFetcher` 无法绕过 Cloudflare

**问题**：设置了 `solve_cloudflare=True` 但仍然遇到 Cloudflare 验证页面。
**解决**：
1. 确保使用 `headless=False` 观察实际发生了什么
2. 增加 `wait_for` 参数等待特定元素出现
3. 确认 `network_idle=True` 让页面完全加载
4. 如仍失败，可通过官方 Discord 获取支持

### 爬虫被封禁

**问题**：高并发请求后 IP 被封。
**解决**：
- 降低 `concurrent_requests` 和 `download_delay`
- 使用 `Fetcher(impersonate='chrome')` 伪装 TLS 指纹
- 接入代理池（见上方代理轮换示例）
- 启用 `robots_txt_obey=True` 遵守目标站的爬取规则

### 自适应解析准确率不高

**问题**：网页改版后 `adaptive=True` 定位到了错误元素。
**解决**：
- 首次抓取时务必使用 `auto_save=True` 保存元素特征
- 提供更多上下文：结合父元素选择器缩小范围
- 在 `css()` 选择时尽量使用具有唯一标识的元素

### Python 版本不兼容

**问题**：安装时报 `requires-python >=3.10`。
**解决**：升级 Python 版本，或使用 `pyenv`/`conda` 管理多版本。Scrapling 大量使用了 Python 3.10+ 的类型注解和异步语法，无法向后兼容。

## 六、总结

Scrapling 是一个设计非常「现代」的爬虫框架——它既保留了 Scrapy 的并发框架设计，又通过自适应解析器解决了爬虫维护成本最高的「选择器失效」问题，更通过 StealthyFetcher 把 Cloudflare 绕过变成了开箱即用的功能。

对于需要快速上手的开发者，它的单请求 API（`Fetcher.get()`）几行代码就能出结果；对于需要大规模爬取的场景，它的 Spider 框架提供了暂停恢复、流式输出、多 Session 路由等企业级特性。

如果你正在维护一套频繁因网页改版而崩溃的爬虫代码，或者受困于 Cloudflare 等反爬机制，Scrapling 值得一试。

- GitHub：https://github.com/D4Vinci/Scrapling
- 文档：https://scrapling.readthedocs.io
- Discord 社区：https://discord.gg/EMgGbDceNQ
