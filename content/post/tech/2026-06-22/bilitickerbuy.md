---
title: "biliTickerBuy：开源免费的 B 站会员购辅助工具"
date: 2026-06-22
description: "biliTickerBuy 是一款开源免费的 B 站会员购辅助工具，基于 Python 和 Gradio 构建，提供命令行和 Web 界面两种操作方式，支持 Docker 部署，帮助用户更便捷地完成 B 站会员购的票务购买流程。"
author: "Cheman"
slug: bilitickerbuy
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, Python, Gradio, B站, 自动化]
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

今天在 GitHub Trending 上看到一个有意思的项目：**biliTickerBuy**，这是一款开源免费的 B 站会员购辅助工具，旨在帮助用户更便捷地完成 B 站会员购的票务购买流程。

## 一、项目概述

**biliTickerBuy** 是一个基于 Python 开发的 B 站会员购辅助工具，提供简单易用的操作界面，支持通过二维码或 Cookie 登录 B 站账号，自动完成票务信息的获取、配置和购买流程。

**核心特性：**
- 🆓 开源免费，MIT 协议
- 🖥️ 双模式操作：命令行 CLI + Gradio Web 界面
- 🐳 Docker 支持，一键部署
- 🔐 支持二维码登录和 Cookie 登录
- 📦 自动获取购票所需信息（收货地址、购买者信息等）
- ⚡ 实时状态监控和任务管理
- 🔄 自动更新检查（支持稳定版和测试版）

**项目数据：**
- GitHub Stars: [实时更新](https://github.com/mikumifa/biliTickerBuy/stargazers)
- 总下载量: [查看 Releases](https://github.com/mikumifa/biliTickerBuy/releases)
- 最新版本: 2.15.13
- 开源协议: MIT License

## 二、技术原理

### 2.1 架构设计

项目采用模块化设计，核心模块包括：

```
biliTickerBuy/
├── main.py              # 入口文件，CLI 参数解析
├── app_cmd/             # 命令行模块
│   ├── buy.py          # 购买命令
│   └── ticker.py       # Ticker UI 命令
├── app_update.py        # 更新检查
├── app_version.py       # 版本管理
└── [核心逻辑模块]
```

**设计亮点：**
1. **双入口设计**：通过 `tyro` 库实现类型安全的 CLI 参数解析，支持 `buy`（纯命令行）和 `ui`（Gradio 界面）两种模式
2. **配置持久化**：使用 TinyDB 本地数据库存储配置和任务记录
3. **登录态管理**：支持二维码登录和 Cookie 导入两种方式

### 2.2 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | ≥3.11 | 主开发语言 |
| Gradio | ≥6.19.0 | Web UI 框架 |
| httpx | ≥0.28.1 | 异步 HTTP 客户端（支持 HTTP/2、SOCKS 代理） |
| requests | ~2.31.0 | 同步 HTTP 请求 |
| pydantic | ~2.8.2 | 数据验证和设置管理 |
| Tyro | ≥0.9.28 | 类型安全的 CLI 框架 |
| Textual | ≥8.2.7 | 终端 UI（TUI） |
| Rich | ≥15.0.0 | 终端美化输出 |
| TinyDB | ~4.8.0 | 轻量级本地数据库 |

### 2.3 关键流程分析

**登录流程：**
```python
# 来自 __init__.py 的接口暴露
from .interface import (
    start_qr_login,      # 启动二维码登录
    poll_qr_login,       # 轮询登录状态
    login_with_cookies,  # Cookie 登录
    get_login_state,     # 获取登录状态
)
```

**购票流程：**
```python
# 核心购票接口
from .interface import (
    search_tickets,             # 搜索票务项目
    fetch_project_detail,       # 获取项目详情
    fetch_ticket_options,       # 获取票务选项
    build_ticket_config_from_selection,  # 构建购票配置
    start_buy,                 # 启动购买任务
    task_status,                # 查询任务状态
)
```

**更新检查机制：**
```python
# app_update.py 中的版本检查逻辑
def fetch_update(current_version: str, channel: str) -> ReleaseInfo | None:
    # 调用 GitHub Releases API
    # 支持稳定版和测试版两个频道
    # 使用 packaging.version 进行版本号比对
```

使用 `packaging.version.Version` 进行语义化版本比对，确保只有更高版本才会触发更新提示。

### 2.4 数据流设计

```
用户操作 → Gradio/CLI 界面
    ↓
接口层 (interface.py)
    ↓
B 站 API 调用 (httpx/requests)
    ↓
数据解析与配置生成
    ↓
执行购票任务
    ↓
状态反馈与记录 (TinyDB)
```

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.11 或更高版本
- pip 包管理器
- （可选）Docker 环境

### 3.2 安装方法

**方式一：PyPI 安装（推荐）**
```bash
pip install bilitickerbuy
```

**方式二：从源码安装**
```bash
git clone https://github.com/mikumifa/biliTickerBuy.git
cd biliTickerBuy
pip install -e .
```

**方式三：Docker 部署**
```bash
docker pull mikumifa/bilitickerbuy:latest
docker run -d -p 7860:7860 mikumifa/bilitickerbuy:latest
```

Docker 镜像已配置好中文字体（文泉驿微米黑、文泉驿正黑），避免中文显示问题。

### 3.3 最简运行示例

**启动 Web 界面：**
```bash
btb ui
```

**命令行购买：**
```bash
btb buy --config-file config.json
```

**查看帮助：**
```bash
btb --help
btb ui --help
btb buy --help
```

## 四、使用方法与实战

### 4.1 基础用法：Web 界面模式

1. 启动程序：`btb ui`
2. 浏览器访问：`http://localhost:7860`
3. 扫码登录或导入 Cookie
4. 搜索目标票务项目
5. 配置购票选项（场次、票价、数量等）
6. 启动购买任务

### 4.2 进阶用法：命令行自动化

**配置文件示例（`config.json`）：**
```json
{
  "project_id": "123456",
  "ticket_id": "789",
  "buyer_info": {
    "name": "购买人姓名",
    "tel": "手机号"
  },
  "address": {
    "province": "省份",
    "city": "城市",
    "district": "区",
    "detail": "详细地址"
  },
  "count": 1,
  "auto_submit": true
}
```

**执行命令：**
```bash
btb buy -cf config.json
```

### 4.3 分布式版本

项目还提供了分布式版本 [biliTickerStorm](https://github.com/mikumifa/biliTickerStorm)，适合需要多账号、高并发的场景。

### 4.4 Skill 版本

对于 AI 助手集成，可以使用 [biliTickerSkill](https://github.com/mikumifa/biliTickerSkill)。

## 五、常见问题与解决方案

### 5.1 安装失败

**问题：** `pip install` 时依赖冲突
**解决：**
```bash
# 使用虚拟环境隔离
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install bilitickerbuy
```

### 5.2 中文显示问题

**问题：** Docker 环境中中文显示为方块
**解决：** Dockerfile 已安装中文字体，如使用自定义镜像请确保安装了 `fonts-wqy-microhei` 和 `fonts-wqy-zenhei`

### 5.3 登录失败

**问题：** 二维码登录超时
**解决：**
- 检查网络连接（可能需要代理）
- 尝试使用 Cookie 登录
- 查看 [Discussions](https://github.com/mikumifa/biliTickerBuy/discussions) 中的解决方案

### 5.4 购票任务失败

**问题：** 任务启动后无响应或报错
**解决：**
- 检查登录态是否过期
- 确认项目配置是否正确（项目 ID、票价 ID 等）
- 查看程序日志（Loguru 输出）
- 提 Issue 时请附上完整日志

### 5.5 更新检查失败

**问题：** 启动时提示更新检查失败
**解决：**
- 检查网络连接
- 配置代理：`export HTTPS_PROXY=http://proxy:port`
- 在设置中关闭自动更新检查

## 六、总结

**biliTickerBuy** 是一款设计优雅、功能完善的 B 站会员购辅助工具，其技术亮点包括：

1. **现代化技术栈**：使用 Gradio 构建 Web 界面，Tyro 实现类型安全的 CLI，Pydantic 进行数据验证
2. **良好的用户体验**：支持双模式操作，自动更新检查，丰富的配置选项
3. **开放性**：MIT 协议开源，提供 Skill 和分布式版本扩展
4. **责任设计**：项目在 README 中明确免责声明和平台尊重声明，体现开发者的合规意识

**适用场景：**
- 需要购买 B 站会员购票务的用户
- 希望学习 Python 自动化工具开发的学习者
- 需要参考 Gradio + Tyro 技术栈整合的开发者

**项目链接：**
- GitHub: https://github.com/mikumifa/biliTickerBuy
- 使用文档: https://n1x87b5cqay.feishu.cn/wiki/Eg4xwt3Dbiah02k1WqOcVk2YnMd
- Issue 反馈: https://github.com/mikumifa/biliTickerBuy/issues
- Discussion: https://github.com/mikumifa/biliTickerBuy/discussions

> **免责声明**：本项目仅供个人学习与研究使用，请勿用于任何商业牟利行为或违反平台规则用途。使用时请遵守相关法律法规与目标平台规则。
