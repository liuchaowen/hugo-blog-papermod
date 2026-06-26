---
title: "MediaCrawler：多平台自媒体数据采集利器，一键爬取小红书、抖音、B站"
date: 2026-06-26
description: "MediaCrawler 是一个功能强大的多平台自媒体数据采集工具，支持小红书、抖音、快手、B站、微博、贴吧、知乎等主流平台的公开信息抓取，基于 Playwright 浏览器自动化框架，无需 JS 逆向即可优雅采集数据。"
author: "Cheman"
slug: mediacrawler
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "爬虫", "Python", "Playwright", "数据采集"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MediaCrawler**，一个支持小红书、抖音、快手、B站、微博、贴吧、知乎七大平台的多功能自媒体数据采集工具，核心亮点是基于 Playwright 浏览器自动化实现登录态复用，**无需 JS 逆向**即可获取签名参数，大幅降低了技术门槛。

## 一、项目概述

MediaCrawler 由开发者 [NanmiCoder](https://github.com/NanmiCoder) 维护，是一个非商业学习许可证下的开源项目（[NON-COMMERCIAL LEARNING LICENSE](https://github.com/NanmiCoder/MediaCrawler/blob/main/LICENSE)）。其定位是帮助研究者和学习者探索网络数据采集技术，而非用于大规模商业爬虫。

项目核心特点：
- **零 JS 逆向**：利用保留登录态的浏览器上下文，通过 JS 表达式获取签名参数，避免了复杂的加密算法逆向
- **CDP 模式**：默认通过 Chrome DevTools Protocol 连接用户已有浏览器，复用登录态、Cookie、扩展，显著降低平台风控风险
- **多平台覆盖**：支持小红书（xhs）、抖音（dy）、快手（ks）、B站（bili）、微博（wb）、贴吧、知乎七大平台
- **WebUI 可视化**：提供基于 FastAPI + Uvicorn 的 Web 操作界面，无需命令行也可使用
- **多种存储方式**：支持 CSV、JSON、JSONL、Excel、SQLite、MySQL 等多种数据导出格式

## 二、技术原理

### 2.1 架构设计

项目采用工厂模式（Factory Pattern）管理多平台爬虫：

```python
class CrawlerFactory:
    CRAWLERS: dict[str, Type[AbstractCrawler]] = {
        "xhs": XiaoHongShuCrawler,
        "dy": DouYinCrawler,
        "ks": KuaishouCrawler,
        "bili": BilibiliCrawler,
        "wb": WeiboCrawler,
        "tieba": TieBaCrawler,
        "zhihu": ZhihuCrawler,
    }

    @staticmethod
    def create_crawler(platform: str) -> AbstractCrawler:
        crawler_class = CrawlerFactory.CRAWLERS.get(platform)
        if not crawler_class:
            supported = ", ".join(sorted(CrawlerFactory.CRAWLERS))
            raise ValueError(f"Invalid media platform: {platform!r}. Supported: {supported}")
        return crawler_class()
```

每个平台的爬虫均继承自 `AbstractCrawler` 抽象基类，统一接口设计，扩展新平台只需实现对应类即可。

### 2.2 CDP 模式核心原理

MediaCrawler 默认使用 Chrome DevTools Protocol（CDP）模式，这是其区别于传统爬虫方案的关键：

1. **浏览器复用**：直接连接用户本机已打开的 Chrome 浏览器，无需启动独立浏览器实例
2. **登录态保留**：复用用户已在浏览器中登录各平台的账号状态，避免频繁验证码
3. **签名参数获取**：通过在浏览器上下文中注入 JS 表达式，直接从页面运行时环境读取加密签名，而非逆向加密算法

项目要求 Chrome 版本 >= 144，开启方式：在 Chrome 地址栏输入 `chrome://inspect/#remote-debugging`，勾选 "Allow remote debugging for this browser instance"。

### 2.3 技术栈一览

| 组件 | 技术选型 | 作用 |
|------|---------|------|
| 浏览器自动化 | Playwright | 跨平台浏览器控制 |
| HTTP 客户端 | httpx / requests | 异步/同步网络请求 |
| 数据库 | SQLite / MySQL / PostgreSQL | 结构化数据存储 |
| Web 框架 | FastAPI + Uvicorn | WebUI 服务端 |
| 数据处理 | Pandas + Jieba | 数据分析与中文分词 |
| 词云生成 | WordCloud + Matplotlib | 可视化评论分析 |
| 依赖管理 | uv | 极速 Python 包管理器 |

## 三、安装与快速开始

### 3.1 环境要求

- **Python**: >= 3.11（项目使用 pyproject.toml 管理依赖，推荐使用 uv）
- **Node.js**: >= 16.0.0（用于部分平台的签名处理）
- **Chrome 浏览器**: 版本 >= 144

### 3.2 使用 uv 安装（推荐）

```shell
# 克隆项目
git clone https://github.com/NanmiCoder/MediaCrawler.git
cd MediaCrawler

# 使用 uv sync 安装依赖（自动锁定版本和环境）
uv sync

# 安装 Playwright 浏览器驱动（CDP 模式无需此步）
uv run playwright install
```

### 3.3 Chrome 浏览器配置（CDP 模式）

1. 安装 Chrome（版本 >= 144）
2. 在 Chrome 地址栏输入：`chrome://inspect/#remote-debugging`
3. 勾选 **"Allow remote debugging for this browser instance"**
4. 页面显示 `Server running at: 127.0.0.1:9222` 即表示就绪

### 3.4 最简运行示例

```shell
# 小红书关键词搜索模式
uv run main.py --platform xhs --lt qrcode --type search

# 小红书指定帖子 ID 模式
uv run main.py --platform xhs --lt qrcode --type detail

# 抖音搜索模式
uv run main.py --platform dy --lt qrcode --type search

# 查看所有可用命令
uv run main.py --help
```

运行时，程序会弹出 Chrome 浏览器窗口（如果使用 CDP 模式则复用已有浏览器），扫描对应平台 App 的二维码完成登录授权即可。

### 3.5 WebUI 模式

```shell
# 启动 API 服务器（默认端口 8080）
uv run uvicorn api.main:app --port 8080 --reload

# 然后访问 http://localhost:8080 打开可视化界面
```

WebUI 提供了可视化配置爬虫参数、实时查看运行状态、数据预览和导出等能力。

## 四、使用方法与实战

### 4.1 数据存储配置

在 `config/base_config.py` 中配置存储方式：

```python
# 可选值: csv / json / jsonl / excel / db / sqlite / mysql
SAVE_DATA_OPTION = "json"

# 启用评论爬取
ENABLE_GET_COMMENTS = True

# 生成评论词云
ENABLE_GET_WORDCLOUD = True
```

### 4.2 二级评论与创作者主页爬取

除了一级帖文内容，MediaCrawler 还支持：

- **二级评论**：递归爬取帖子的子评论，获取完整的讨论树
- **指定创作者主页**：输入创作者 ID，抓取该创作者的所有帖子

在 `config/base_config.py` 中配置关键词列表即可启用相应功能。

### 4.3 IP 代理池支持

项目集成了代理池支持，可配置多个代理 IP 轮换使用，有效降低被平台封禁的风险。适用于需要持续、大量采集的场景。

### 4.4 断点续爬与 AI Agent 支持

进阶版 [MediaCrawlerPro](https://github.com/MediaCrawlerPro) 提供了断点续爬功能，即使爬虫中断也能从上次位置继续，避免重复采集。同时还支持 OpenClaw、Claude Code、Cursor 等 AI Agent 一键调用，实现自动化数据采集。

## 五、常见问题与解决方案

### Q1: 运行时报 `playwright` 相关错误

确保已安装 Playwright 和浏览器驱动（CDP 模式除外）：
```shell
uv run playwright install chromium
```

### Q2: 登录后仍然被平台风控拦截

这是正常现象。解决方案：
- 使用 CDP 模式连接已有登录态的 Chrome 浏览器
- 降低请求频率，在 `config/base_config.py` 中调整 `REQUEST_INTERVAL`
- 启用 IP 代理池轮换 IP

### Q3: Python 版本不兼容（报错 `SyntaxError` 或 `ImportError`）

项目要求 Python >= 3.11。使用以下命令检查和切换版本：
```shell
python --version   # 查看当前版本
uv python list    # 查看已安装的 Python 版本
uv python pin 3.11  # 固定项目使用 3.11
```

### Q4: 抖音/知乎爬虫无法获取数据

这两个平台需要提前安装 Node.js 环境（版本 >= 16），因为它们依赖 Node.js 执行 JS 签名逻辑。

### Q5: 导出 Excel 格式数据为空

确保配置 `SAVE_DATA_OPTION = "excel"`，爬虫运行结束后调用 `ExcelStoreBase.flush_all()` 保存文件。

### Q6: 词云生成失败

词云依赖 `jieba` 中文分词和 `wordcloud` 库。确保这些依赖已安装，且评论数据为中文文本。

## 六、总结

MediaCrawler 是一个架构清晰、功能完善的多平台自媒体数据采集工具，CDP 模式的创新设计让它在**无需 JS 逆向**的前提下，依然能有效绕过平台签名验证，兼顾了技术易用性和采集成功率。

如果你对社交媒体数据分析、内容研究或推荐系统感兴趣，这个项目无论是作为**学习素材**还是**研究工具**，都值得一试。项目代码结构规整（工厂模式、异步架构、抽象基类），阅读源码本身也是一次不错的 Python 工程实践学习。

最后提醒：所有爬虫工具请仅用于**学习和技术研究**目的，遵守各平台服务条款和 robots.txt 规则，尊重数据隐私与版权。

---

> 📢 **声明**：本文内容基于 GitHub 开源项目 [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) 的公开信息整理，仅供技术学习参考，请勿用于任何非法或商业用途。
