---
title: "SpiderFoot：开源情报(OSINT)自动化利器，200+模块助你掌控网络空间侦察"
date: 2026-06-22
description: "SpiderFoot 是一款功能强大的开源情报(OSINT)自动化工具，集成200多个模块，支持对IP、域名、邮箱、用户名等目标进行全方位情报收集，广泛应用于渗透测试、红队演练和安全防御。本文深入剖析其架构设计、核心技术栈、安装使用方法及实战技巧。"
author: "Cheman"
slug: spiderfoot
draft: false
categories: ["开源工具", "安全工具", "OSINT"]
tags: ["SpiderFoot", "OSINT", "开源情报", "安全工具", "渗透测试", "信息收集", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**SpiderFoot**，一个用 Python 3 编写的开源情报(OSINT)自动化工具，拥有超过200个模块，能够帮助安全研究人员自动化完成大规模的网络空间情报收集工作。

## 一、项目概述

**SpiderFoot** 是一个开源情报（OSINT，Open Source Intelligence）自动化工具，由 Steve Micallef 于2012年创建并持续维护至今（已有14年历史！）。它能够自动化地从几乎每一个可用的公开数据源中提取信息，并利用多种数据分析方法，使数据易于导航和理解。

核心特性：
- **Web UI + CLI 双模式**：内置 Web 服务器提供简洁直观的 Web 界面，同时也完全支持命令行操作
- **200+ 模块集成**：覆盖域名、IP、邮箱、社交媒体、暗网、威胁情报等各个维度
- **YAML 可配置关联引擎**：4.0版本引入的关联规则引擎，内置37条预定义规则
- **多种导出格式**：支持 CSV、JSON、GEXF 图格式导出
- **SQLite 后端**：支持自定义查询
- **高度可配置**：几乎所有功能都可以通过配置文件调整
- **TOR 集成**：支持暗网搜索
- **Docker 支持**：提供 Dockerfile 便于容器化部署
- **可调用外部工具**：如 DNSTwist、Whatweb、Nmap、CMSeeK 等

SpiderFoot 适用于红队演练、渗透测试中的侦察阶段，也适用于防御方评估自身或组织在互联网上暴露的信息。

**GitHub 仓库**：https://github.com/smicallef/spiderfoot  
**Star 数**：20.2k+  
**开源协议**：MIT License  
**最新版本**：v4.0（2024年发布）

## 二、技术原理

### 2.1 架构设计

SpiderFoot 采用 **发布者/订阅者（Publisher/Subscriber）模型**，各个模块之间通过事件进行通信和数据传递。

核心组件：
- **`sf.py`**：主入口，负责解析命令行参数、加载模块、启动 Web 服务器或扫描任务
- **`sflib.py`**：SpiderFoot 核心库，定义了 `SpiderFoot` 主类，负责任务调度和事件分发
- **`sfscan.py`**：扫描器核心，启动 `startSpiderFootScanner` 函数，管理扫描生命周期
- **`sfwebui.py`**：Web UI 实现，基于 CherryPy 框架
- **`spiderfoot/db.py`**：数据库层，使用 SQLite 存储扫描结果
- **`spiderfoot/correlator.py`**：关联规则引擎，基于 YAML 配置的规则对扫描结果进行关联分析

### 2.2 核心技术栈

```
编程语言：Python 3.7+
Web框架：CherryPy 18.8.0+
前端：原生 HTML/JS + Mako 模板
数据库：SQLite（通过 spiderfoot/db.py 封装）
依赖库：
  - dnspython：DNS 解析
  - beautifulsoup4 + lxml：HTML/XML 解析
  - requests + pysocks：HTTP 请求与 SOCKS 代理支持
  - netaddr + ipwhois：IP 地址处理与 WHOIS 查询
  - pyOpenSSL：SSL/TLS 证书处理
  - cryptography：加密算法支持
  - networkx：图结构分析（用于关联分析）
  - PyPDF2 + python-docx + python-pptx：文档元数据分析
  - ExifRead：图片 EXIF 数据提取
```

### 2.3 模块系统

SpiderFoot 的模块系统非常灵活，每个模块都是一个独立的 Python 文件，放在 `modules/` 目录下。

模块类型分为：
- **内部模块（Internal）**：不需要 API 密钥，直接分析本地数据
- **免费 API 模块（Free API）**：调用免费公开的 API
- **分级 API 模块（Tiered API）**：需要 API 密钥，通常有免费额度
- **商业 API 模块（Commercial API）**：需要付费订阅
- **工具模块（Tool）**：调用外部工具（如 Nmap、DNSTwist）

模块基本结构（以 `sfp_template.py` 为模板）：
```python
from sflib import SpiderFoot, SpiderFootPlugin, SpiderFootEvent

class sfp_template(SpiderFootPlugin):
    meta = {
        'name': "Module Name",
        'summary': "Module description",
        'flags': [""],
        'useCases': ["Passive", "Investigate", "Footprint"],
        'categories': ["Category"],
        'dataSource': {
            'model': "FREE_AUTH_LIMITED",  # FREE, Tiered, Commercial, Internal
            'apiKeyInstructions': [...],
            'website': "https://example.com",
            'yearPublished': 2024,
            'possibleCats': ["Information"],
            'rules': ["NOATTRIBUTION", "NOSTORAGE", "NOSELL"]
        }
    }

    opts = {
        # 模块配置选项
    }

    def setup(self, sfc, userOpts=dict()):
        # 初始化模块
        pass

    def watchedEvents(self):
        # 返回该模块监听的事件类型
        return ["INTERESTING_EVENT"]

    def emittedEvents(self):
        # 返回该模块产生的事件类型
        return ["OUTPUT_EVENT"]

    def handleEvent(self, sfEvent):
        # 处理事件的核心逻辑
        pass
```

### 2.4 数据流分析

SpiderFoot 的数据流是事件驱动的：

```
目标输入（IP/域名/邮箱等）
    ↓
扫描器初始化
    ↓
模块加载（根据目标类型和启用的模块列表）
    ↓
事件循环：
  1. 模块 A 产生事件 E1（如：域名解析得到 IP）
  2. 事件总线通知所有监听 E1 的模块
  3. 模块 B 收到 E1，进行处理，可能产生新事件 E2
  4. 重复 2-3，直到没有新事件产生
    ↓
扫描完成
    ↓
关联规则引擎运行（SpiderFoot 4.0+）
    ↓
结果展示/导出
```

这种设计使得模块之间可以自动串联，例如：
- `sfp_dnsresolve` 解析域名得到 IP → 
- `sfp_shodan` 用 IP 查询 Shodan → 
- `sfp_virustotal` 用 IP 查询 VirusTotal → 
- `sfp_portscan_tcp` 对 IP 进行端口扫描

### 2.5 关联规则引擎

SpiderFoot 4.0 引入了基于 YAML 的关联规则引擎，位于 `correlations/` 目录。

规则示例（`correlations/template.yaml`）：
```yaml
name: "Rule Name"
description: "Rule description"
severity: "HIGH"  # HIGH, MEDIUM, LOW, INFO
conditions:
  - event_type: "IP_ADDRESS"
    field: "data"
    regex: ".*"
  - event_type: "VULNERABILITY"
    field: "data"
    contains: "CVE-"
actions:
  - type: "CREATE_EVENT"
    event_type: "CORRELATION"
    data: "Correlated finding"
```

内置37条规则，涵盖：
- 同一 IP 上的多个恶意事件关联
- 域名和 IP 的威胁情报交叉验证
- 证书透明日志中的异常模式
- 暗网提及与明网资产的关联

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.7 及以上版本
- pip（Python 包管理器）
- Git（可选，用于克隆开发版）

### 3.2 安装步骤

**方式一：稳定版（推荐）**

```bash
# 下载最新稳定版（v4.0）
wget https://github.com/smicallef/spiderfoot/archive/v4.0.tar.gz

# 解压
tar zxvf v4.0.tar.gz
cd spiderfoot-4.0

# 安装依赖
pip3 install -r requirements.txt

# 启动 Web UI
python3 ./sf.py -l 127.0.0.1:5001
```

**方式二：开发版（最新功能）**

```bash
# 克隆仓库
git clone https://github.com/smicallef/spiderfoot.git
cd spiderfoot

# 安装依赖
pip3 install -r requirements.txt

# 启动 Web UI
python3 ./sf.py -l 127.0.0.1:5001
```

**方式三：Docker 部署**

```bash
# 构建镜像
sudo docker build -t spiderfoot .

# 运行容器
sudo docker run -p 5001:5001 --security-opt no-new-privileges spiderfoot

# 使用数据卷持久化数据
sudo docker run -p 5001:5001 -v /mydir/spiderfoot:/var/lib/spiderfoot spiderfoot
```

### 3.3 最简运行示例

**Web UI 模式**：
```bash
python3 ./sf.py -l 127.0.0.1:5001
```
然后在浏览器中打开 `http://127.0.0.1:5001`，通过 Web 界面创建扫描任务。

**命令行模式**：
```bash
# 对域名 example.com 进行被动信息收集
python3 ./sf.py -s example.com -t PASSIVE

# 对 IP 地址进行全量扫描
python3 ./sf.py -s 8.8.8.8 -u all

# 对邮箱地址进行调查
python3 ./sf.py -s user@example.com -t EMAILADDR
```

## 四、使用方法与实战

### 4.1 支持的目标类型

SpiderFoot 可以对以下实体类型进行扫描：

| 目标类型 | 说明 | 示例 |
|---------|------|------|
| IP 地址 | IPv4 或 IPv6 地址 | `8.8.8.8` |
| 域名/子域名 | 互联网域名 | `example.com` |
| 主机名 | 主机名 | `mail.example.com` |
| 网络子网 | CIDR 格式 | `192.168.1.0/24` |
| ASN | 自治系统号 | `AS13335` |
| 邮箱地址 | 电子邮件地址 | `user@example.com` |
| 电话号码 | 国际格式电话号码 | `+8613800138000` |
| 用户名 | 网络用户名 | `johndoe` |
| 人名 | 真实姓名 | `"John Doe"` |
| 比特币地址 | BTC 地址 | `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` |

### 4.2 使用场景实战

**场景一：红队侦察**

```bash
# 对目标域名进行全量扫描（Footprint 模式）
python3 ./sf.py -s target.com -u footprint -o json > results.json
```

扫描将自动完成：
- 子域名枚举
- IP 和主机发现
- 邮箱和电话号码提取
- 社交媒体账号发现
- 威胁情报查询
- 端口扫描和服务识别

**场景二：防御性安全评估**

```bash
# 检查自家域名是否泄露敏感信息
python3 ./sf.py -s mycompany.com -t DOMAIN_NAME,EMAILADDR,PHONE_NUMBER
```

关注点：
- 是否有泄露的邮箱在 HaveIBeenPwned 等数据库中
- 是否有敏感文件（如 `.git`, `robots.txt`, 备份文件）可访问
- 子域名是否可能被劫持（Subdomain Takeover）
- 证书透明日志中是否有异常证书

**场景三：威胁情报分析**

```bash
# 对可疑 IP 进行威胁情报查询
python3 ./sf.py -s 198.51.100.1 -t IP_ADDRESS
```

SpiderFoot 会自动查询：
- VirusTotal、AbuseIPDB、AlienVault OTX
- Shodan、Censys
- 各类黑名单（Spamhaus、SORBS 等）
- 恶意软件哈希库

### 4.3 Web UI 使用流程

1. **创建扫描**：点击 "New Scan"，输入目标，选择扫描类型（Passive/Footprint/Investigate/All）
2. **选择模块**：可以手动选择模块，或使用预设用例（Passive、Footprint、Investigate）
3. **启动扫描**：点击 "Start Scan"
4. **查看结果**：
   - **Summary**：概览页面，显示关键发现
   - **Graph**：可视化关联图
   - **Events**：所有事件的列表，可按类型过滤
   - **Correlation**：关联规则触发的结果（4.0+）
   - **Export**：导出为 CSV/JSON/GEXF

### 4.4 高级用法

**使用 SOCKS 代理（TOR）**：
```bash
python3 ./sf.py -s target.onion -l 127.0.0.1:5001 &
# 在 Web UI 中配置 SOCKS 代理：
# _socks1type: TOR
# _socks3port: 9050
```

**API 密钥配置**：
在 Web UI 的 "Settings" → "Modules" 中，为需要的模块配置 API 密钥（如 Shodan、VirusTotal、HaveIBeenPwned 等）。

**自定义关联规则**：
参考 `correlations/template.yaml`，编写自己的规则，放入 `correlations/` 目录，重启 SpiderFoot 即可加载。

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：`pip3 install -r requirements.txt` 报错，提示某些包编译失败。

**原因**：缺少编译依赖（如 `swig`、`libffi-dev`、`libxml2-dev` 等）。

**解决**：
```bash
# Ubuntu/Debian
sudo apt-get install -y gcc python3-dev python3-pip swig libffi-dev libxml2-dev libxslt1-dev libssl-dev

# macOS
brew install swig libxml2 libxslt openssl

# 然后重新安装
pip3 install -r requirements.txt
```

### 5.2 Web UI 无法访问

**问题**：启动后访问 `http://127.0.0.1:5001` 显示无法连接。

**原因**：
1. 端口被占用
2. 防火墙阻止
3. 绑定地址错误

**解决**：
```bash
# 检查端口占用
lsof -i :5001

# 使用其他端口
python3 ./sf.py -l 127.0.0.1:5002

# 允许远程访问（谨慎使用）
python3 ./sf.py -l 0.0.0.0:5001
```

### 5.3 模块运行缓慢

**问题**：扫描速度很慢，长时间没有新结果。

**原因**：
1. 并发线程数过低（默认3）
2. 某些模块等待超时（默认5秒）
3. 网络延迟高

**解决**：
```bash
# 增加并发线程数
python3 ./sf.py -s target.com --max-threads 10

# 或者修改配置（通过 Web UI 或命令行）
# _maxthreads: 10
# _fetchtimeout: 10
```

### 5.4 API 限流问题

**问题**：使用某些模块时提示 API 限流（如 GitHub、Shodan）。

**原因**：免费 API 有请求频率限制。

**解决**：
1. 申请更高限额的 API 密钥
2. 在模块配置中增加请求间隔
3. 禁用不需要的 API 模块

### 5.5 数据库锁定

**问题**：同时运行多个扫描时提示数据库被锁定。

**原因**：SQLite 不支持高并发写入。

**解决**：
1. 一次只运行一个扫描
2. 或者为每个扫描实例使用不同的数据库文件（修改 `_database` 配置）

## 六、总结

SpiderFoot 是一款功能强大、模块丰富、易于扩展的开源情报自动化工具。其发布者/订阅者架构使得200多个模块能够自动协同工作，从多个维度对目标进行全方位侦察。

**核心优势**：
1. **全面性**：200+ 模块覆盖几乎所有公开数据源
2. **自动化**：无需手动查询每个数据源，一键完成大规模情报收集
3. **可扩展性**：易于编写自定义模块和关联规则
4. **活跃维护**：自2012年以来持续更新，社区活跃

**适用人群**：
- 渗透测试人员 / 红队成员
- 安全研究人员
- 威胁情报分析师
- 防守方安全团队

**商业版本**：
如果需要更多功能（如多目标扫描、团队协作、API 驱动、变更通知等），可以考虑 SpiderFoot HX（商业版本）。

**项目资源**：
- 官网：https://www.spiderfoot.net/
- GitHub：https://github.com/smicallef/spiderfoot
- 文档：https://www.spiderfoot.net/documentation
- Discord 社区：https://discord.gg/vyvztrG

如果你对 OSINT 感兴趣，或者需要进行网络空间侦察，SpiderFoot 绝对是一个值得深入研究的工具！
