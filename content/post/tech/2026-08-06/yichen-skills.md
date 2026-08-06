---
title: "yichen-skills：一站式 AI 创作者工具箱，支持微信、X、剪映、飞书等多个平台"
date: "2026-08-06"
description: "yichen-skills 是专为 AI 创作者打造的一站式工具集，涵盖微信本地数据解析、X 文章发布、AI 视频字幕剪映对接、飞书操作、企业微信管理、跨平台内容归档等 21 个独立 Skill，开箱即用。"
author: "Cheman"
slug: yichen-skills
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "AI工具", "自动化", "效率"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**yichen-skills**，一个专为 AI 创作者（尤其是 Claude Code / Codex 用户）打造的一站式工具集，集成了微信、X（Twitter）、剪映、飞书、企业微信等多个平台，共 21 个独立 Skill，涵盖内容创作、数据提取、工作流自动化等多个场景。

## 一、项目概述

yichen-skills 由开发者 **逸尘 (Yichen)** 维护，是一个聚合了多个生产级 Skill 的 monorepo。所有 Skill 均以独立文件夹形式组织，可按需选择性安装，无需一次性引入全部依赖。

**核心能力矩阵如下：**

| Skill 名称 | 功能描述 |
|---|---|
| yichen-summary | 从 AI 对话中提取关键洞察，保存为 Obsidian 结构化笔记 |
| yichen-x-article-draft-uploader | 将 Markdown 文章上传到 X Articles 草稿 |
| yichen-wechat-local-vault | 解密并导出微信 Mac 4.x 本地数据库（聊天、朋友圈、收藏夹） |
| yichen-mac-wechat-dual-open | 在 macOS 上双开微信，无第三方工具 |
| yichen-wechat-mp-batch-exporter | 批量导出微信公众号历史文章 |
| yichen-wecom-local-vault | 读取企业微信 5.x 本地数据库快照 |
| yichen-wecom-operations | 通过官方 CLI 操作企业微信文档、待办、日程 |
| yichen-volc-asr | 火山引擎 ASR 音视频转字幕 + 粗剪 MP4 |
| yichen-chatgpt-web-research | 复用用户 Chrome 已登录态，在 ChatGPT 官网跑研究任务 |
| yichen-grok-consult | 在 Codex 任务中调用 Grok 原生 X 搜索 |
| yichen-social-bookmarks-exporter | 导出小红书、抖音、X 的收藏夹链接 |
| yichen-web-research | 多阶段互联网研究顶层路由器 |
| yichen-unified-search | 跨平台统一搜索（AnySearch、GitHub、微信、小红书、抖音等） |
| yichen-content-archive | 已知链接内容存档（抖音、小红书、微信公众号、YouTube 等） |
| yichen-bookmarks-export | 带授权验证的社交书签安全导出 |
| yichen-asr | 统一 ASR 路由，自动选择火山引擎或 Step |
| yichen-agent-memory | 安装和维护 Agent Memory Vault 本地记忆系统 |
| yichen-jianying-editor | 剪映/CapCut 桌面版收尾剪辑指导 |

## 二、技术原理与架构设计

### 2.1 模块化 Skill 结构

每个 Skill 均为独立目录，内含 `SKILL.md`（入口定义）、`scripts/`（Python 脚本）、`agents/`（Agent 配置）等。以 `yichen-x-article-draft-uploader` 为例：

```text
yichen-x-article-draft-uploader/
├─ SKILL.md
├─ README.md
├─ agents/
└─ scripts/
   ├─ export_x_cookies_from_chrome.py   # 从 Chrome 导出 X 认证 cookie
   ├─ parse_markdown.py                 # 解析 Markdown，提取正文和图片
   └─ upload_markdown_to_x_article.py   # Playwright 驱动上传
```

这种结构遵循"一个 Skill 一件事"原则，每个 Skill 的触发词、输入输出边界清晰，Claude Code 可通过 `/<skill-name>` 直接调用。

### 2.2 数据安全设计

项目在隐私边界设计上值得称道：

- **Cookie 处理**：X cookie 从用户本地 Chrome 导出到临时文件，用完即删，不持久化存储
- **微信数据**：解密后生成时间戳快照，仅写入只读导出文件，不回写原数据库
- **企业微信**：所有操作通过 `@wecom/cli` 官方 CLI 完成，不控制桌面 App
- **Git 隔离**：cookie、key、快照、chat 导出等敏感文件均被 `.gitignore` 排除

核心解密逻辑依赖 `frida` hook 获取 iOS/macOS 微信的 SQLCipher 密钥：

```python
# yichen-wechat-local-vault/scripts/decrypt_all_dbs.py（概念示意）
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2

def derive_key(passphrase: bytes, salt: bytes) -> bytes:
    return PBKDF2(passphrase, salt, dkLen=32, count=100000, prf=lambda p, s: __import__('hmac').new(p, s, 'sha256'))

def decrypt_db(key: bytes, encrypted_db_path: str) -> bytes:
    with open(encrypted_db_path, 'rb') as f:
        iv = f.read(16)
        ciphertext = f.read()
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return cipher.decrypt(ciphertext)
```

### 2.3 Playwright 浏览器自动化

X 文章上传、抖音/小红书内容抓取均基于 Playwright，使用独立临时 Chrome 实例，不影响用户主浏览器状态：

```python
# 复用 Chrome 已登录态（临时 cookie 文件）
from playwright.sync_api import sync_playwright

def upload_with_auth(markdown_file: str, cookie_file: str):
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir="/tmp/x-upload-chrome-temp",
            channel="chrome"
        )
        # 注入已导出的 cookie
        import json
        with open(cookie_file) as f:
            cookies = json.load(f)
        browser.context.add_cookies(cookies)
        # ... 执行上传操作
```

## 三、安装与快速开始

### 3.1 环境要求

- **通用**：Python 3.9+、pip
- **按需安装**：Playwright（火山 ASR 粗剪、X 上传、抖音/小红书抓取）、pycryptodome（微信数据库解密）、zstandard（微信数据库压缩格式）、Pillow（微信双开图标）
- **浏览器**：Chrome 已登录 X（用于 X Article 上传）、Chrome 已登录 ChatGPT（用于 Web Research）

### 3.2 安装步骤

```bash
# 克隆仓库到 skills 目录（以 Claude Code 为例）
git clone https://github.com/mcncarl/yichen-skills.git ~/.claude/skills/yichen-skills

# 安装通用依赖
pip install pycryptodome zstandard

# 安装 Playwright（如果需要 X 上传 / 内容抓取）
pip install playwright pycryptodome
python3 -m playwright install chromium

# 安装微信双开图标依赖
pip install Pillow
```

### 3.3 快速启动示例

**场景 1：一键总结当前 AI 对话**

```
$ Claude Code
> /yichen-summary
```

Claude Code 会提取对话中的关键洞察，写入 Obsidian 指定目录。

**场景 2：将 Markdown 文章推送到 X Articles 草稿**

```bash
# 导出 Chrome X 认证 cookie（首次）
python3 ~/.claude/skills/yichen-skills/yichen-x-article-draft-uploader/scripts/export_x_cookies_from_chrome.py \
    --output /tmp/x_current_cookies.json

# Claude Code 中执行
> upload this article to X Articles draft: /path/to/my-article.md
```

**场景 3：导出微信聊天记录**

```bash
# 首次运行会引导提取加密密钥
> 微信解析 导出发给老张的聊天记录
```

## 四、实战技巧与进阶用法

### 4.1 创作者完整工作流

yichen-skills 最强大的用法是将多个 Skill 串联成完整创作链路：

1. **内容采集**：`yichen-content-archive` 抓取抖音/小红书对标视频的字幕和封面
2. **内容转录**：`yichen-volc-asr` 将视频转成带时间戳的 SRT 字幕
3. **内容诊断**：`yichen-video-content` 分析对标视频的文案结构
4. **AI 创作**：`yichen-chatgpt-web-research` 深度研究行业背景
5. **文章发布**：`yichen-x-article-draft-uploader` 将 Markdown 推送到 X Articles 草稿
6. **本地归档**：`yichen-agent-memory` 将创作过程存档到 Obsidian

### 4.2 Agent Memory Vault 持久化记忆

`yichen-agent-memory` 帮你构建私有知识库：

```bash
# 安装 Agent Memory Vault
> install Agent Memory Vault

# 任务结束后自动清理并归档
> run memory closeout
```

底层使用 Markdown 作为源数据，SQLite/FTS 作为全文索引，支持模糊语义检索。

### 4.3 企业微信批量文档管理

```bash
# 创建飞书文档
> create a Wecom document: 项目周报模板

# 批量写入待办
> create todos for project alpha: 需求评审, 技术方案设计, 开发联调
```

## 五、常见问题

### Q1：X Articles 上传失败？

最常见原因是 Chrome 登录态过期。重新导出 cookie：

```bash
python3 yichen-x-article-draft-uploader/scripts/export_x_cookies_from_chrome.py \
    --output /tmp/x_current_cookies.json
```

### Q2：微信数据库解密失败？

微信 macOS 每次更新后数据库加密密钥会变化，需重新用 `frida` 提取：

```bash
python3 yichen-wechat-local-vault/scripts/extract_keys.py
```

### Q3：yichen-skills 支持私有部署吗？

支持。所有 Skill 均可克隆到本地，Cookie、密钥等敏感信息均不硬编码，完全私有。

### Q4：企业微信 CLI 需要安装什么？

需要先安装官方 `@wecom/cli`：

```bash
npm install -g @wecom/cli
wecom login  # 扫码认证
```

## 六、总结

yichen-skills 是一套经过精心设计、生产可用的 AI 创作者工具链，最大的亮点在于：

- **平台覆盖广**：微信、X、抖音、小红书、剪映、飞书、企业微信、ChatGPT、Grok 等平台全覆盖
- **隐私边界清晰**：所有敏感操作（cookie、密钥、聊天记录）均有明确隔离策略，不上传、不泄露
- **模块化即插即用**：按需安装，Skill 之间无隐性依赖，Claude Code / Codex 可直接通过触发词调用
- **文档完整**：每个 Skill 均有独立 README，提供安装、配置、隐私说明和故障排查指南

如果你经常在 AI 辅助下做内容创作、内容归档或多平台运营，这套工具箱值得深度研究和按需引入。建议从最刚需的 1-2 个 Skill 入手，逐步扩展到完整工作流。

> **项目地址**：https://github.com/mcncarl/yichen-skills
> **维护者微信**：yichen365ai（添加请注明 GitHub）
