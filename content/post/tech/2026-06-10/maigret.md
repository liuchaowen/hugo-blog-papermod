---
title: "Maigret：通过用户名一键收集数字身份档案的 OSINT 利器"
date: 2026-06-10
description: "Maigret 是一款开源的 OSINT 工具，仅凭用户名即可在 3000+ 网站上搜索关联账号，集信息提取、报告生成、AI 分析于一体，是数字身份调查的瑞士军刀。"
author: "Cheman"
slug: maigret
draft: false
categories: ["技术", "开源", "OSINT"]
tags: ["GitHub", "开源", "OSINT", "Maigret", "信息安全", "用户名搜索", "侦查工具"]
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

**开篇引导段**：
今天在 GitHub Trending 上看到一个颇为硬核的开源项目：**Maigret**——一个仅凭用户名就能在 3000+ 个社交平台、论坛、电商网站上自动搜索关联账号，并提取账户公开信息的 OSINT 工具，无需任何 API Key。开源地址：<https://github.com/soxoj/maigret>

## 一、项目概述

Maigret（取名自法国侦探小说《梅格雷探长》——Georges Simenon 笔下的经典角色，与此前同类工具 Sherlock 形成有趣的延续）本质上是一个**用户名关联搜索引擎**。输入一个用户名，它在短短几十秒内替你"扫遍"互联网：

- 支持 **3,000+ 个站点**（默认扫描流量排名前 500 的站点，`-a` 参数可全量扫描）
- 自动从个人主页和站点 API **提取公开信息**（昵称、头像、地理位置、简介等）
- 支持**递归搜索**——提取其他用户名和 ID 后继续扩线
- 生成 HTML、PDF、CSV、XMind、JSON 等多种格式的报告
- 内置**Web 图形界面**，以知识图谱形式呈现搜索结果
- 可选 **AI 分析模式**（`--ai`），调用 LLM 生成侦查摘要

该项目在 GitHub 上已收获大量 Star，维护活跃，社区生态成熟，诸多专业 OSINT 商业产品（如 Social Links、UserSearch.ai）也基于它构建。

## 二、技术原理

### 2.1 架构设计

Maigret 的核心架构可以概括为三层：

```
[用户名输入] → [调度引擎] → [站点检测器并行池] → [结果聚合 → 报告生成]
```

- **调度引擎**：基于 asyncio + aiohttp 构建异步事件循环，支持高并发连接（默认 100），大幅缩短全量扫描时间。
- **站点数据库**：`data.json` 集中维护所有站点的检测规则，包括 URL 模式、用户名占位符、检测方式（HTTP 状态码/内容关键词/JSON 路径提取等）。
- **结果处理器**：通过 `socid-extractor` 库从已匹配的页面中提取额外字段信息。

### 2.2 核心技术栈

| 组件 | 技术选型 | 考量 |
|------|----------|------|
| 异步 HTTP | aiohttp + aiohttp-socks | 支持高并发及代理/SOCKS5 隧道 |
| 站点数据库 | 本地 JSON（含自动更新） | 支持离线运行和增量拉取 |
| HTML 解析 | lxml + soupsieve | 性能比纯 Python 解析器高一个量级 |
| 报告渲染 | Jinja2 (HTML)、reportlab (PDF)、xhtml2pdf | 模块化，可扩展 |
| 交互式 UI | Flask + pyvis (D3 图) | 轻量级 Web 界面 |
| AI 分析 | OpenAI 兼容 API | 可替换任意 LLM 后端 |

### 2.3 检测机制与智能化

每个站点的检测规则支持多种模式：

```python
# 简化示例：站点检测规则的逻辑
{
  "example_site": {
    "url": "https://example.com/user/{}",    # {} 为用户名占位符
    "urlMain": "https://example.com/",
    "username_claimed": "demo_user",          # 确认存在的用户名
    "username_unclaimed": "noonewouldusethis",  # 确认不存在的用户名
    "detection": {
      "status_code": 200,                     # 通过 HTTP 状态码判断
      "errorMsg": "User not found",           # 或通过页面内容关键词
      "errorType": "message"                  # 匹配方式
    }
  }
}
```

Maigret 在检测环节还支持：
- **Cloudflare 绕过**：通过 FlareSolverr 处理 JavaScript 质询
- **Tor / I2P 代理**：用于访问暗网站点
- **站点自检**（`--self-check`）：自动验证检测规则是否仍有效，帮助维护者发现失效站点
- **关键词高亮**：对匹配页面中包含用户感兴趣关键词的结果做特殊标记

## 三、安装与快速开始

### 环境要求

- Python 3.10+

### pip 安装

```bash
pip3 install maigret
maigret username
```

**零安装方案**：使用[社区 Telegram Bot](https://sites.google.com/view/maigret-bot-link) 或 Google Colab 等方式在线使用。

### 源码安装

```bash
git clone https://github.com/soxoj/maigret.git
cd maigret
pip3 install .
maigret username
```

### Docker

```bash
# CLI 模式
docker pull soxoj/maigret
docker run -v ./reports:/app/reports soxoj/maigret:latest username --html

# Web UI 模式
docker run -p 5000:5000 soxoj/maigret:web
```

## 四、使用方法与实战

### 基础用法

```bash
# 默认扫描（前 500 个站点）
maigret john_doe

# 全量扫描（3000+ 站点）
maigret john_doe -a

# 生成 HTML 报告
maigret john_doe --html

# 生成 PDF 报告（需先安装 PDF 依赖）
pip install 'maigret[pdf]'
maigret john_doe --pdf
```

### 进阶用法

```bash
# 按标签筛选：仅搜索照片和约会类站点
maigret user --tags photo,dating

# 按国家筛选：仅搜索美国站点
maigret user --tags us

# 多用户名搜索（全量）
maigret user1 user2 user3 -a

# 关键词匹配高亮
maigret user --keywords python rust

# 递归搜索：从 URL 中提取更多 ID 继续搜索
maigret --parse https://twitter.com/someuser

# AI 辅助分析侦查摘要（需配置 OPENAI_API_KEY）
export OPENAI_API_KEY=sk-...
maigret user --ai
```

### 使用 Web 界面

```bash
maigret --web 5000
```

打开 `http://127.0.0.1:5000` 即可在浏览器中操作，搜索结果以交互式 D3 力导向图呈现，所有报告类型只需点击即可导出。

### 代理与暗网

```bash
# 通过 SOCKS5 代理
maigret user --proxy socks5://127.0.0.1:1080

# 通过 Tor
maigret user --tor-proxy socks5://127.0.0.1:9050

# 通过 I2P
maigret user --i2p-proxy http://127.0.0.1:4444
```

### 嵌入 Python 项目

Maigret 的 CLI 仅仅是一个薄封装，核心是异步函数，可以直接在你的代码中调用：

```python
import asyncio
from maigret import MaigretDatabase, search

async def run_check(username: str):
    db = MaigretDatabase().load_from_file(
        './maigret/resources/data.json'
    )
    sites = db.ranked_sites_dict(top=500)
    results = await search(
        username=username,
        site_dict=sites,
        timeout=10,
        max_connections=50,
    )
    for site, data in results.items():
        if data['status'].is_found():
            print(f'{site}: FOUND')
    return results

asyncio.run(run_check('demo_user'))
```

## 五、常见问题与解决方案

### Q1：安装失败（编译报错）

PDF 报告依赖 `xhtml2pdf`，在 Linux/macOS 上需要系统级别的 Cairo 图形库：

```bash
# macOS
brew install cairo pkg-config

# Ubuntu/Debian
sudo apt-get install build-essential python3-dev libcairo2-dev libxml2-dev libxslt1-dev
```

### Q2：遇到 403/超时/被屏蔽

- 使用 `--proxy` 或 `--tor-proxy` 切换出口 IP
- 对于 Cloudflare 保护的站点，启用 `--cloudflare-bypass` 并确保本地运行了 FlareSolverr
- 降低并发数：暂无直接参数，可通过修改源码调整 `max_connections`

### Q3：结果太少或没有匹配

- 尝试 `-a` 启用全量扫描
- 部分网站可能需要代理才能访问
- 检查用户名是否太独特：Maigret 依赖站点检测规则，非常偏僻的站点可能未收录
- 运行 `--self-check` 检查站点规则是否仍有效

### Q4：Ai 分析模式无效

- 确认已设置 `OPENAI_API_KEY` 环境变量
- 也可在 `settings.json` 中配置 `openai_api_key` 和 `openai_api_base_url`，指向任意兼容的 API

## 六、总结

Maigret 是当前开源生态中能力最全面的用户名 OSINT 工具之一。相比同类项目（如 Sherlock、WhatsMyName），其核心优势在于：

- **站点数量遥遥领先**：3,000+ 站点，且数据库支持自动增量更新
- **信息提取深度**：不止是"有/无"判断，还主动提取账户详情
- **报告格式全面**：从 HTML/PDF 到 XMind/JSON，覆盖侦查全生命周期
- **可编程性强**：可作为 Python 库嵌入自有工作流
- **AI 增强**：可选 LLM 辅助分析，降低分析师认知负担

不过它也并非万能：部分站点需要代理绕过、检测规则需要社区持续维护、PDF 报告依赖额外的系统库。但对于安全研究员、渗透测试人员、社工调查员而言，Maigret 绝对是不可或缺的一把利器。MIT 许可证下的开源项目，值得收藏和贡献。
