---
title: "BOSS直聘爬虫实战：基于 Chrome CDP 的明文薪资抓取方案"
date: 2026-07-15
description: "深入解析 boss-zhipin-scraper 项目如何通过 Chrome DevTools Protocol 绕过字体反爬，获取 BOSS 直聘职位数据并生成明文薪资分析报告。技术栈简洁、无需 Selenium/Playwright，输出 JSON/CSV 双格式，适合求职数据分析与市场洞察。"
author: "Cheman"
slug: boss-zhipin-scraper
draft: false
categories: ["技术", "开源"]
tags: ["Python", "爬虫", "Chrome CDP", "数据分析", "求职工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**boss-zhipin-scraper**，一个通过 Chrome DevTools Protocol 绕过字体反爬的 BOSS 直聘数据采集工具，直接输出明文薪资数据。

## 一、项目概述

boss-zhipin-scraper 是一个轻量级的 BOSS 直聘职位抓取工具，核心价值在于：

- **绕过字体反爬**：通过 Chrome CDP 调用搜索 API，直接获取明文 `salaryDesc` 字段
- **复用真实登录态**：连接本地已登录的 Chrome，无需处理复杂的登录流程
- **多维数据分析**：自动生成薪资分布、技能词频、求职材料优化提示词

相比传统的 Selenium/Playwright 方案，该工具更轻量、更稳定、更难被风控识别。

### 核心特性

- ✅ 明文薪资输出（JSON / CSV 双格式）
- ✅ 详情页 JD 抓取 + 技能分析
- ✅ 增量写入（异常退出不丢数据）
- ✅ 持久隔离 Chrome CDP profile
- ✅ 多维筛选（规模、融资、薪资、经验、学历、行业）
- ✅ 支持全国 300+ 城市（含三四五线）

## 二、技术原理

### 架构设计

项目的核心思路是 **"绕过前端，直取 API"**：

```
┌─────────────────┐
│  本地 Chrome    │ ← 用户手动登录 BOSS
│  (已登录状态)    │
└────────┬────────┘
         │ CDP (9222端口)
         ↓
┌─────────────────┐
│  Python 脚本    │
│  boss_cdp_raw   │
└────────┬────────┘
         │ 注入 JS (同步 XHR)
         ↓
┌─────────────────┐
│  BOSS 搜索 API  │
│  返回明文薪资   │
└─────────────────┘
```

### 核心技术栈

- **Chrome DevTools Protocol (CDP)**：WebSocket 通信协议，用于控制 Chrome 浏览器
- **websocket-client**：Python WebSocket 客户端，连接 Chrome CDP
- **requests**：用于下载城市码表等静态资源

### 关键设计：为什么不用 Selenium/Playwright？

传统爬虫方案的问题：

```python
# Selenium/Playwright 方案（不推荐）
driver.get("https://www.zhipin.com/web/geek/job")
salary = driver.find_element(".salary").text  # ❌ 字体反爬，薪资显示为乱码
```

CDP 方案的优势：

```python
# CDP 方案（推荐）
# 直接调用页面内的搜索 API，返回 JSON
response = cdp_runtime_evaluate('''
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/wapi/zpgeek/search/joblist.json?...", false);
    xhr.send(null);
    JSON.parse(xhr.responseText);
''')

salary = response['zpData']['jobList'][0]['salaryDesc']  # ✅ 明文薪资
```

### 数据流分析

1. **启动隔离 Chrome**：`--setup-chrome` 创建专用 profile，登录态持久保存
2. **CDP 连接**：通过 `ws://localhost:9222` 建立 WebSocket 连接
3. **注入 JS**：在页面上下文中执行同步 XHR，调用搜索 API
4. **提取明文薪资**：API 返回的 `salaryDesc` 本就是明文，无需破解字体映射
5. **增量写入**：按 `job_id` 去重，异常退出不丢数据

## 三、安装与快速开始

### 环境要求

- Python 3.10+
- macOS / Linux（Windows 分支已预留，未经实测）

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/eatmoreduck/boss-zhipin-scraper.git
cd boss-zhipin-scraper

# 2. 安装依赖
pip install -r requirements.txt
# 或使用 uv
uv sync

# 3. 启动隔离 Chrome 并登录
python3 scripts/boss_cdp_raw.py --setup-chrome
```

首次使用会弹出专用 Chrome 窗口，手动登录 BOSS 直聘后，登录态会保存在 `~/.boss-zhipin-scraper/chrome-profile`。

### 最简运行示例

```bash
# 抓取上海 AI Agent 岗位（3 页）
python3 scripts/boss_cdp_raw.py --keyword "AI Agent" --city 上海 --pages 3 --analysis

# 抓取后生成聚合摘要 + 提示词
python3 scripts/job_summary.py
```

## 四、使用方法与实战

### 基础用法

```bash
# 搜索关键词 + 城市 + 页数
python3 scripts/boss_cdp_raw.py \
    --keyword "前端" \
    --city 赣州 \
    --pages 5 \
    --format csv \
    --analysis

# 查看支持的城市
python3 scripts/boss_cdp_raw.py --list-cities 江
```

**输出文件**（默认目录 `~/.boss-zhipin-scraper/job-result/`）：

- `boss_jobs_YYYYMMDD_HHMM.json`：职位列表
- `boss_details_YYYYMMDD_HHMM.json`：详情页 JD
- `boss_jobs_YYYYMMDD_HHMM.csv`：CSV 格式导出

### 进阶用法

#### 多维筛选

```bash
# 筛选规模 100-499 人、本科、3-5 年经验
python3 scripts/boss_cdp_raw.py \
    --keyword "Python" \
    --city 北京 \
    --pages 3 \
    --scale "100-499人" \
    --degree 本科 \
    --experience "3-5年"
```

#### 详情页抓取

```bash
# 抓取详情页 JD（默认开启）
python3 scripts/boss_cdp_raw.py \
    --keyword "AI Agent" \
    --city 深圳 \
    --pages 2 \
    --detail

# 不抓详情页
python3 scripts/boss_cdp_raw.py --keyword "测试" --city 上海 --no-detail
```

#### 合并历史数据

```bash
# 按 job_id 去重合并
python3 scripts/boss_cdp_raw.py \
    --keyword "数据分析" \
    --city 广州 \
    --merge ~/.boss-zhipin-scraper/job-result/boss_jobs_20260701_1200.json
```

### 实际项目示例：求职数据分析

```bash
# 1. 抓取目标岗位
python3 scripts/boss_cdp_raw.py \
    --keyword "AI Agent" \
    --city 上海 \
    --pages 5 \
    --format csv \
    --analysis

# 2. 生成聚合摘要 + 提示词
python3 scripts/job_summary.py --top 15

# 输出示例：
# 📊 薪资分布：20-30K 占比 42%，30-50K 占比 28%
# 📈 经验要求：3-5 年占比 55%，5-10 年占比 30%
# 🏷️ 高频技能：Python, LangChain, OpenAI, RAG, Agent
# 💡 简历优化提示词：[可复制到 AI 助手]
```

## 五、常见问题与解决方案

### 1. Chrome CDP 连接失败

**错误信息**：
```
WebSocketConnectionError: [Errno 61] Connection refused
```

**解决方案**：
```bash
# 检查 Chrome 是否启动
lsof -i :9222

# 重新启动隔离 Chrome
python3 scripts/boss_cdp_raw.py --setup-chrome
```

### 2. 登录态失效

**现象**：抓取时报错"登录查看完整内容"或返回空数据。

**解决方案**：
```bash
# 重新登录
python3 scripts/boss_cdp_raw.py --setup-chrome

# 或清空专用 profile 重新登录
python3 scripts/boss_cdp_raw.py --setup-chrome --reset-chrome-profile
```

### 3. 抓取数据为空

**可能原因**：

1. **关键词过于冷门**：尝试更通用的关键词
2. **城市不支持**：用 `--list-cities` 确认城市名称
3. **API 限流**：减少 `--pages` 数量，或等待几分钟后重试

```bash
# 测试接口连通性
python3 scripts/boss_cdp_raw.py --smoke-test
```

### 4. 性能优化建议

- **详情页抓取**：`--detail` 会增加请求次数，建议 `--pages` 不超过 5
- **并发控制**：脚本内部已实现请求间隔，无需手动加延时
- **增量写入**：异常退出后重新运行，会自动跳过已抓取的 `job_id`

### 5. Windows 系统兼容性

当前代码主要针对 macOS/Linux 优化，Windows 分支已预留但未经实测：

```python
# scripts/boss_cdp_raw.py 中的 Windows 适配代码
if sys.platform == "win32":
    CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
```

建议 Windows 用户在 WSL 环境中运行，或等待官方 Windows 支持。

## 六、总结

boss-zhipin-scraper 展示了一种优雅的爬虫设计思路：**不与前端对抗，直接取数据源头**。通过 Chrome CDP 复用真实浏览器环境，绕过字体反爬、验证码、登录墙等常见障碍，实现稳定高效的数据采集。

对于求职者、HR、市场研究人员来说，这是一个实用的开源工具：既能快速获取市场行情数据，又能通过聚合分析洞察岗位趋势。代码结构清晰、文档完善，也适合作为 Chrome CDP 技术的学习案例。

**GitHub 仓库**：[eatmoreduck/boss-zhipin-scraper](https://github.com/eatmoreduck/boss-zhipin-scraper)
