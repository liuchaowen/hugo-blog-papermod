---
title: "VulnClaw：基于 LLM Agent 与 MCP 工具链的 AI 渗透测试 CLI 工具"
date: 2026-06-30
description: "VulnClaw 是一款开源的 AI 驱动渗透测试 CLI 工具，基于 LLM Agent + MCP 工具链 + 渗透 Skill 编排，支持自然语言输入自动完成信息收集、漏洞发现、漏洞利用到报告生成的全流程，内置目标驱动求解引擎、证据级反幻觉闸门和21个渗透 Skill。"
author: "Cheman"
slug: "vulnclaw"
draft: false
categories: ["安全工具", "AI应用"]
tags: ["渗透测试", "AI安全", "LLM", "MCP", "开源工具", "自动化安全"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**VulnClaw** 🦞，这是一款 AI 驱动的渗透测试 CLI 工具，支持用自然语言描述渗透意图，自动完成从信息收集到漏洞利用的全流程。

## 一、项目概述

VulnClaw 是一个可独立运行的 AI 渗透测试 Agent，基于 LLM Agent + MCP 工具链 + 渗透 Skill 编排构建。用户只需用自然语言描述测试目标，工具即可自动完成「信息收集 → 漏洞发现 → 漏洞利用 → 报告生成」的完整渗透测试流程。

**核心特性：**

- **目标驱动求解引擎** — 抛弃固定轮数工作流，以「目标达成 / 探索前沿耗尽 / 安全预算」为终止条件，自动收敛
- **黑板图状态空间搜索** — 把渗透建模为从 origin 向 goal 的搜索：Fact（已确认事实）+ Intent（探索方向），结构上杜绝"原地打转"
- **证据级反幻觉闸门** — 声称的 flag/结论必须在真实工具输出里逐字符出现才被采信，杜绝凭空编造 flag 的假胜利
- **13 个 LLM Provider** — 支持 OpenAI、MiniMax、DeepSeek、智谱、Moonshot、千问等主流模型，一键切换
- **MCP 工具链** — 4 个 MCP 服务：fetch（HTTP请求）、memory（上下文记忆）、chrome-devtools（浏览器自动化）、burp（HTTP抓包重放）
- **21 个渗透 Skill** — 7 核心 + 14 专项 Skill（含 CTF Web/Crypto/Misc、osint-recon、secknowledge-skill），含 180 个参考文档
- **持续性渗透测试** — 周期循环（默认 100 轮/周期 × 10 周期 = 1000 轮），每周期自动生成报告

## 二、技术原理

### 2.1 架构设计

VulnClaw 采用分层架构设计：

```
┌─────────────────────────────────────────────┐
│                VulnClaw CLI                  │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  │
│  │  自然语言 │  │  任务编排 │  │ 报告 & PoC │  │
│  │  交互层  │  │  引擎    │  │   生成器   │  │
│  └────┬────┘  └────┬────┘  └─────┬──────┘  │
│       └─────────────┼─────────────┘        │
│               ┌─────▼──────┐                │
│               │ LLM Agent  │                │
│               │ (越狱+Skill)│               │
│               └─────┬──────┘                │
│               ┌─────▼──────┐                │
│               │ MCP 编排层  │                │
│               │ (4 服务)   │                │
│               └─────┬──────┘                │
│               ┌─────▼──────┐                │
│               │ 安全知识库  │                │
│               └────────────┘                │
└─────────────────────────────────────────────┘
```

### 2.2 目标驱动求解引擎（默认引擎 `solve`）

VulnClaw v0.4.0 核心重构，从「固定轮数工作流」升级为「目标驱动求解」：

**黑板图 + OODA 求解循环：**

把渗透看作从 **origin**（目标）向 **goal**（拿到 flag / shell / 确认高危漏洞）的有向搜索，用两个原语驱动：

| 原语 | 含义 |
|------|------|
| **Fact** | 已被真实工具输出证实的客观事实（探索的落脚点） |
| **Intent** | 声明的探索方向（尚未执行的一步），从 Fact 出发，结论后产出新 Fact |

**循环结构：**

```
REASON（读全图）→ 目标达成? / 提出新探索方向 / 不提出
        │
EXPLORE（领一个 Intent）→ 用工具实际执行 → 把确认的结论写回为一个 Fact
        │
终止：目标达成 / 探索前沿耗尽（Reason 不再提方向）/ 触达安全预算
```

**为什么结构上杜绝打转**：一旦"首页是登录框"成为一个 Fact，Reason 就不会再提"去看首页"，而是提"测 SQL 注入"；每个 Intent 领取一次、结论一次即标记 `concluded`/`abandoned`，**不可能重复**。

### 2.3 证据级反幻觉闸门

弱模型常凭空编造 flag。新引擎在 `solve()` 里录制**所有真实工具输出**（HTTP 响应体、`python_execute` 输出）作为唯一可信证据：

- **结论闸门**：Explore 结论里声称的 flag，若未在真实工具输出里逐字符出现 → 判定幻觉、丢弃、标记 `[未验证]`
- **完成闸门**：Reason 宣布"目标达成"时，若目标要 flag 但真实输出里从无 flag → 拒绝完成、继续探索
- **即时收敛**：一旦拿到经证据验证的 flag，立即完成，不再空跑验证轮

### 2.4 结构化推理 + 自适应反思

- **推理状态层**（`reasoning_state.py`）：已知事实（带置信度）、推理障碍（WAF/过滤等）、候选攻击链，结构化沉淀并注入提示词
- **反思引擎**（`reflexion.py`）：失败自动归类（环境限制/路径错误/参数错误/信息不足），按 **L0-L4 渐进升级** payload 绕过策略（原始 → URL 编码 → 双写注释 → Unicode/hex → 多层混淆/换攻击面），persistent 模式跨周期保留失败记忆

### 2.5 MCP 工具链

| MCP 服务 | 工具数 | 模式 | 用途 | 状态 |
|---|---|---|---|---|
| fetch | 1 | 本地 (httpx) | HTTP 请求、API 测试 | 开箱即用 |
| memory | 2 | 本地 (JSON) | 上下文记忆、状态持久化 | 开箱即用 |
| chrome-devtools | 31+ | stdio MCP | 浏览器自动化、截图、JS 执行 | 需部署 |
| burp | 多个 | stdio MCP | HTTP 抓包、重放、漏洞扫描 | 需部署 |

另有 5 个内置 Agent 工具（`python_execute` + `nmap_scan` + `crypto_decode` + `brute_force_login` + `load_skill_reference`），无需 MCP 即可调用。

## 三、安装与快速开始

### 3.1 安装

```bash
# 从 PyPI 安装（推荐）
pip install vulnclaw

# 从源码安装
git clone https://github.com/Unclecheng-li/VulnClaw.git
cd VulnClaw
pip install -e .
```

### 3.2 Docker 运行（可选）

镜像已内置 Web UI 以及默认 MCP 服务所需的运行时（`npx` / `uvx`），所有状态（配置、会话、目标、报告）持久化到 `/data` 数据卷。

```bash
cp .env.example .env          # 填入 VULNCLAW_LLM_API_KEY 等
docker compose up --build      # 构建镜像并启动 Web UI
# 打开 http://127.0.0.1:7788
```

### 3.3 四步启动

```bash
# 1. 选择提供商（自动填充 Base URL 和模型名）
vulnclaw config provider minimax   (或 openai/deepseek/zhipu/moonshot/qwen/siliconflow)

# 2. 设置 API Key
vulnclaw config set llm.api_key sk-your-key-here

# 3. 默认：打开原 CLI / REPL
vulnclaw

# 4. 可选：打开 TUI 工作台
vulnclaw tui
```

### 3.4 环境检查

```bash
vulnclaw doctor
```

输出示例：

```
🦞 VulnClaw 环境检查

  Python: 3.14.4
  Node.js: v24.14.1
  npx: 已安装
  nmap: 已安装

LLM 配置:
  Provider: openai
  Auth Mode: static
  Credentials: configured
  Base URL: https://api.openai.com/v1
  Model: gpt-4o

MCP 服务:
  fetch: 已启用 [P0]
  memory: 已启用 [P0]
  ...

✅ 环境就绪，运行 vulnclaw 开始
```

## 四、使用方法与实战

### 4.1 方式一：原 CLI / REPL 交互模式（默认）

```bash
$ vulnclaw
```

无参数启动会进入交互界面，用自然语言对话：

```
🦞 vulnclaw> 对 192.168.1.100 进行渗透测试，这是我授权的靶场

[*] 进入自主渗透模式，按 Ctrl+C 可随时中断
── Round 1 ──
  [+] 目标: 192.168.1.100
  [+] 开放端口: 22, 80, 443, 8080
```

### 4.2 方式二：TUI 工作台（显式启用）

```bash
$ vulnclaw tui
```

TUI 会先展示目标、检查模式、运行概览和安全边界，让你确认授权范围后再启动任务：

```text
VulnClaw TUI 工作台

授权目标        https://example.com
检查模式        快速摸底 / recon
运行概览        历史快照、风险数量、持久化约束、约束拦截
安全边界        仅测试端口 443，禁止 exploit/persistent/post_exploitation
```

### 4.3 方式三：单命令模式

```bash
# 一键全流程渗透测试
vulnclaw run 192.168.1.100

# 持续性渗透测试（每周期100轮，最多10周期，自动生成报告）
vulnclaw persistent 192.168.1.100

# 自定义周期参数
vulnclaw persistent 192.168.1.100 --rounds 200 --cycles 5

# 仅信息收集
vulnclaw recon 192.168.1.100

# 漏洞扫描（可指定端口）
vulnclaw scan 192.168.1.100 --ports 80,443,8080

# 漏洞利用（可指定 CVE）
vulnclaw exploit 192.168.1.100 --cve CVE-2024-1234 --cmd id

# 生成报告
vulnclaw report session.json
```

### 4.4 方式四：Web UI 模式

通过浏览器操作渗透测试全流程，适合偏好图形界面的用户。

```bash
# 安装 Web 依赖
pip install vulnclaw[web]

# 启动 Web UI（默认 127.0.0.1:7788）
vulnclaw web

# 自定义端口
vulnclaw web --port 8080
```

启动后浏览器访问 `http://127.0.0.1:7788` 即可使用。

### 4.5 实战示例

**示例1：CTF 比赛快速拿 flag**

```
🦞 vulnclaw> 帮我对 http://ctf.site:8080 找出 flag

[*] 进入自主渗透模式
── Round 1 ──
  [+] 目标: http://ctf.site:8080
  [+] Web 指纹: Nginx/1.18.0, PHP/7.4.3
  [+] 发现 /robots.txt: 包含 /admin.php, /backup/
── Round 2 ──
  [+] 发现 /backup/config.php.bak 可下载
  [+] 源码泄露：数据库密码硬编码
── Round 3 ──
  [+] 登录后台成功
  [+] 发现 SQL 注入点：/admin.php?id=1
── Round 4 ──
  [+] 注入成功，拿到 flag: flag{53cUre_5QL_1nj3ct10n}
```

**示例2：授权靶场深度渗透**

```bash
# 方式1：TUI 工作台（推荐，可设置安全边界）
vulnclaw tui --target https://target.example --mode deep --only-port 443

# 方式2：持续性渗透（深度测试）
vulnclaw persistent https://target.example --rounds 200 --cycles 5
```

### 4.6 LLM 提供商配置

VulnClaw 支持所有 OpenAI 兼容协议的 API，内置 13 个提供商预设：

```bash
vulnclaw config provider --list    # 查看所有提供商
vulnclaw config provider minimax   # 一键切换
```

| 提供商      | 命令                   | 默认模型              |
| ----------- | ---------------------- | --------------------- |
| OpenAI      | `provider openai`      | gpt-4o                |
| MiniMax     | `provider minimax`     | MiniMax-M3            |
| DeepSeek    | `provider deepseek`    | deepseek-v4-pro       |
| 智谱 GLM    | `provider zhipu`       | glm-4.7               |
| Kimi        | `provider moonshot`    | kimi-k2.6             |
| 通义千问    | `provider qwen`        | qwen3-max             |
| SiliconFlow | `provider siliconflow` | DeepSeek-V4-Flash     |
| 豆包        | `provider doubao`      | Doubao-Seed-2.0-Pro   |
| 百川        | `provider baichuan`    | Baichuan4-Turbo       |
| 阶跃星辰    | `provider stepfun`     | step-3.5-flash        |
| 商汤        | `provider sensetime`   | SenseNova-6.7-Flash-Lite |
| 零一万物    | `provider yi`          | yi-lightning          |
| 自定义      | `provider custom`      | 手动填写              |

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：`pip install vulnclaw` 失败，提示依赖冲突

**解决方案**：
- 使用 Python 3.10+ 版本
- 推荐使用虚拟环境：`python -m venv venv && source venv/bin/activate`
- 若使用源码安装，确保已安装 `hatchling`：`pip install hatchling`

### 5.2 LLM API 调用失败

**问题**：配置 API Key 后调用失败

**解决方案**：
- 检查 API Key 是否正确：`vulnclaw config get llm.api_key`
- 检查 Base URL 是否可访问：`curl -I https://your-api.com/v1`
- 切换其他提供商：`vulnclaw config provider openai`
- 查看详细错误：`vulnclaw --verbose`

### 5.3 MCP 服务连接失败

**问题**：chrome-devtools 或 burp MCP 服务无法连接

**解决方案**：
- **chrome-devtools**：确保 Chrome 已启动远程调试 `google-chrome --remote-debugging-port=9222`
- **burp**：确保 Burp Suite 已加载 MCP 扩展，并在 MCP 标签页勾选"Enabled"
- 检查配置文件：`~/.vulnclaw/config.yaml` 中的 MCP 服务配置

### 5.4 渗透测试误报

**问题**：工具报告漏洞但实际不存在

**解决方案**：
- v0.4.0+ 已内置证据级反幻觉闸门，确保结论有真实工具输出支撑
- 查看会话记录：`vulnclaw report session.json`
- 手动验证漏洞：使用 `vulnclaw repl` 进入交互模式逐步验证

### 5.5 性能问题

**问题**：渗透测试运行缓慢

**解决方案**：
- 调整推理温度：`vulnclaw config set llm.temperature 0.0`（降低随机性，加快收敛）
- 减少最大轮数：`vulnclaw config set session.max_rounds 10`
- 使用更快的模型：切换到 DeepSeek-V4-Flash 或类似快速模型
- 启用并行探索（v0.4.1+）：`vulnclaw config set session.solve_max_parallel 3`

### 5.6 Docker 容器网络问题

**问题**：容器内无法访问宿主机服务

**解决方案**：
- 扫描宿主机服务请使用 `host.docker.internal`
- 扫描其它容器请共享网络并用容器名访问
- 详见项目 [DOCKER.md](DOCKER.md)

## 六、总结

VulnClaw 是一款创新的 AI 驱动渗透测试工具，通过引入 LLM Agent、MCP 工具链和目标驱动求解引擎，显著降低了渗透测试的技术门槛，同时提高了测试效率。

**核心优势：**

1. **自然语言驱动** — 无需记忆复杂命令，用自然语言描述渗透意图即可
2. **目标驱动求解** — 智能终止条件，避免无效轮询，提高测试效率
3. **证据级反幻觉** — 确保测试结论有真实工具输出支撑，减少误报
4. **丰富的 Skill 体系** — 21 个渗透 Skill 覆盖常见场景，持续扩展中
5. **多模式支持** — CLI、TUI、Web UI、单命令模式，适应不同使用习惯

**适用场景：**

- 已授权的渗透测试
- CTF 竞赛
- 安全教学与培训
- 红队演练
- 漏洞挖掘与研究

**项目资源：**

- GitHub：https://github.com/Unclecheng-li/VulnClaw
- PyPI：https://pypi.org/project/vulnclaw/
- 许可证：MIT
- 社区交流群：QQ 群号 954402631
- 开发者群聊：QQ 群号 1065858551

⚠️ **安全声明**：VulnClaw 仅用于已授权的安全测试。使用本工具前，请确保已获得目标系统的明确授权，并遵守当地法律法规。未经授权对系统进行渗透测试是违法行为。
