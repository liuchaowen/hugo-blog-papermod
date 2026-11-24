---
title: "Claude-BugHunter：84 个 Skill 把 Claude Code 变成外网红队操作员"
date: "2026-11-24T11:10:00+08:00"
description: "Claude-BugHunter 是一套面向漏洞挖掘与外网红队工作的 Claude Code 技能包：84 个自动加载的 Skill、15 个斜杠命令、681 条公开披露报告模式，覆盖 24 类核心漏洞，并附带确定性引擎与 cbh 命令行工具。本文拆解其分层架构、Skill 触发机制、7 问门禁与确定性优先的设计取舍，并给出完整安装与实战流程。"
author: "Cheman"
slug: claude-bughunter
github_repo: elementalsouls/Claude-BugHunter
draft: false
tags: ["Claude Code", "安全工具", "漏洞挖掘", "红队", "AI Agent", "GitHub Trending"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Claude-BugHunter**（`elementalsouls/Claude-BugHunter`）。它把漏洞挖掘和外网红队需要的判断力、检查清单、载荷库、报告规范，压缩成 84 个 Claude Code Skill，安装一次之后，你用大白话描述正在测什么，对应的技能就会自动加载。项目用 Python 编写，MIT 与 CC BY 4.0 双许可，当前 release 为 v2.1，仓库约 1.99 万 star、2112 fork。本文从架构原理讲到安装与实战，带你完整过一遍。

## 一、项目概述

Claude-BugHunter 的作者是 Sachin Sharma（GitHub 账号 ElementalSoul），定位写得很直白：一套自包含的 Claude 技能包，服务于漏洞赏金（bug bounty）与外网红队（external red-team）两类工作。仓库创建于 2026 年 5 月，到 11 月已经迭代到 v2.1，主语言 Python，附带的 PowerShell 与 Shell 脚本负责跨平台安装。

它要解决的问题不是"给模型灌安全知识"，而是把资深研究者脑子里的那一套流程固化下来：先看什么、什么信号值得追、什么情况必须放弃、报告里哪句话会被 triage 打回。README 里对此有个精确的抱怨——大多数人的 Claude 安全配置要么太泛（一个巨大的 "security" prompt），要么太碎（收藏了 30 篇披露报告，每次开工重读一遍），两者都撑不过第二个目标。

核心能力可以归纳为六条：

- **84 个按主题自动加载的 Skill**：不需要按名字调用，描述目标即可触发。其中 58 个是 `hunt-*` 漏洞类技能，10 个企业平台攻击链，7 个报告与验证，5 个侦察与 OSINT，4 个方法论与心态。
- **681 条公开披露报告模式**：从 HackerOne 公开报告中提炼，其中 433 条已逐条标注出处、可审计，分布在 36 个模式库文件中，覆盖 24 类核心漏洞。
- **企业身份与基础设施攻击矩阵**：M365 / Entra ID、Okta、vCenter、SSL VPN 设备（Cisco、Fortinet、Citrix、Palo Alto、Pulse、SonicWall、F5）、SharePoint，附带 2024–2026 年的 CVE 链与拿到凭据之后的横向升级路径。
- **确定性执行引擎**：`engine/` 目录用纯 Python 做侦察、参数发现、密钥扫描与技能映射，默认不烧 token、不调 agent，把 LLM 留给真正需要判断的环节。
- **终端原生 CLI**：`cbh` 提供 `recon → classify → triage → report` 的流水线，带确定的退出码，适合 CI/CD 与定时任务。
- **多 harness 兼容**：同一份 Skill 可以装进 Claude Code、OpenCode、OpenAI Codex CLI、Hermes Agent、Google AntiGravity，因为底层就是标准的 `SKILL.md` 格式。

许可方面需要特别注意：仓库是双许可。`*.py`、`*.sh` 等源码走 MIT；`*.md` 文档、字典、正则目录、评级量表走 CC BY 4.0。商业复用内容可以，但要署名 Sachin Sharma / Claude-BugHunter 并回链仓库。

成熟度上，这不是一个周末项目：`engine/` 下带着 30 多个测试文件，覆盖 scope 规则归一化、重定向越界、验证状态恢复、Windows 编码等边角；`docs/` 里有架构图、CVE 覆盖快照（每周由 workflow 刷新）、多 harness 指南和完整的 `cbh` 命令文档。v2.1 的 CHANGELOG 与 NOTICE 也说明它把上游 vendored 技能的归属交代得很清楚——84 个技能中 56 个原创、20 个社区贡献、8 个来自 `shuvonsec/claude-bug-bounty`。

## 二、技术原理

### 4 层能力栈

README 用四层来描述这个包的组织方式，这四层不是流程顺序，而是"角色"：

```text
┌──────────────────────────────────────────────────────────┐
│  Ship it      triage-validation / report-writing /        │
│               evidence-hygiene / bugcrowd-reporting       │
├──────────────────────────────────────────────────────────┤
│  Hit perimeter  m365-entra / okta / vcenter /             │
│                 enterprise-vpn / hunt-sharepoint /        │
│                 cloud-iam-deep / apk-redteam-pipeline     │
├──────────────────────────────────────────────────────────┤
│  Hunt webapps   58 × hunt-*   (XSS / SQLi / SSRF / IDOR / │
│                 OAuth / GraphQL / SSTI / deserialization) │
├──────────────────────────────────────────────────────────┤
│  Think        bb-methodology / redteam-mindset /          │
│               mid-engagement-ir-detection                 │
└──────────────────────────────────────────────────────────┘
```

底层是"怎么想"，中间两层是"打什么"，顶层是"怎么交"。作者在"为什么存在"一节里列了九个能力缺口，其中四个来自赏金场景（缺假设纪律、缺按平台的报告策略、缺工作区协调、缺证据脱敏），五个来自外网红队场景（保守默认值过早放弃、缺中途 IR 感知、缺企业平台链、缺客户交付格式、缺拿到凭据后的升级模型）。这九条基本就是这个包的设计需求文档。

### 机制一：Skill 靠 description 语义匹配自动加载

这是整个项目最关键的机制，也是最容易被误解的地方。很多人以为"84 个技能"意味着要记 84 个命令，实际不是。每个技能就是一个目录加一个 `SKILL.md`，开头是 YAML front matter：

```yaml
---
name: hunt-ssrf
description: Hunting skill for ssrf vulnerabilities. Built from 15 public bug bounty
  reports including AWS metadata SSRF (...), GCP metadata SSRF (...), DNS rebinding
  SSRF (...), gopher-protocol-to-Redis-RCE (...). Use when hunting SSRF on any
  target — OOB Collaborator confirmation mandatory for blind cases.
sources: github, hackerone_public, portswigger_research, binarysecurity_research
report_count: 34
---
```

`description` 字段不只是给人看的摘要，它是模型做技能路由的唯一依据。所以这套技能包的写法有个共同特征：描述里密集堆叠触发词——漏洞类名、具体场景（"link-preview SSRF"、"PDF-generator SSRF"）、甚至真实案例的赔付金额。你输入"这个 `?url=` 参数看起来可疑"，模型匹配到 `hunt-ssrf` 的描述，就把整份技能正文加载进上下文；你说"这个 GraphQL 端点 introspection 开着"，加载的就是 `hunt-graphql`。

这个设计的收益是上下文经济：84 个技能全量塞进去会直接撑爆窗口，按需加载则每次只带一份。代价是路由依赖描述质量，描述写得含糊的技能会永远不被触发——这也是为什么仓库里有个 `scripts/gen_skill_index.py` 和一套技能质量规范。

### 机制二：6 阶段非线性流程与 7 问门禁

`bb-methodology` 定义的是 6 阶段：scope → recon → map & rank → hunt → validate → report。README 特意强调"非线性"，意思是允许中途跳入，比如接手别人做到一半的 engagement，可以直接从 map & rank 起手。

真正的质量控制点在 validate。`triage-validation` 技能里有一道 **7-Question Gate**，提交前逐条自问，其中两条最致命：

- **Q2**：这个问题是否在该项目接受的影响类型清单里？（决定严重级别，也决定会不会被降级）
- **Q3**：资产是否在授权范围内？
- **Q7**：是否命中"永不提交"清单？（self-XSS、单纯缺安全响应头、纯 rate-limit、clickjacking 之类）

门禁的输出不是二元通过/拒绝，而是四种分支：**PASS**（七问都有证据，可以进报告）、**KILL**（多问失败或命中 Q7，不许动笔）、**CHAIN-REQUIRED**（单点影响不足，必须补链）、**DOWNGRADE**（只失 Q2 或 Q5，降级后继续）。这个四分支设计比"能不能提交"更贴近真实 triage：大量赏金报告不是假漏洞，而是影响被高估。

### 机制三：确定性优先的引擎

`engine/` 的设计原则第一条写得很克制：**Deterministic-first**。广度工作——侦察、参数发现、密钥扫描、服务指纹、技能归类——全部是纯 Python 加被动工具，`$0`、不调 agent、不烧 rate limit；LLM 只保留给少数需要判断的环节。默认运行停在"武器库地图"（arsenal map）就交还控制权，要看它真的去打，得显式加 `--hunt`。

几个模块的职责切得很干净：

| 模块 | 职责 |
|---|---|
| `scope.py` | 确定性白名单：apex / 通配符 / CIDR / 正则，deny 优先，默认拒绝；侦察与狩猎两个阶段都强制 |
| `recon.py` | 服务与技术指纹（JS 特征）、JS bundle 端点挖掘、JS 密钥扫描（AWS/GCP/Anthropic/OpenAI/Slack/GitHub/Stripe/EmailJS 等，输出脱敏）、参数发现（`gau` 被动历史 + `katana` 主动爬取双源） |
| `skill_map.py` | 把每个 `(endpoint\|param, class)` 映射到**本机实际安装**的 `hunt-*` 技能，并附一条可直接跑的 curl |
| `agent.py` | 无头 `claude -p` 调度与 JSON 提取；**默认关闭 skills**（作者 eval 结论：能力增益约等于 0，每 agent 省 12–15k token） |
| `state.py` | 可恢复的 engagement 存储：`state.json` + `evidence/` + `engine.log` + `arsenal.md` + `report.md` |

地图产物的形态很实用，一行就是一条可执行情报：

```text
map:   redirect_to   https://t/wp-login.php?redirect_to=FUZZ   ssrf→hunt-ssrf  lfi→hunt-lfi  open-redirect→hunt-open-redirect
```

安全约束是写死在代码里的，不是提示词里的君子协定：狩猎与验证 agent 默认只读，被明确告知只能碰范围内主机（哪怕为了证明漏洞也不许打第三方）、不许做状态变更操作（不发邮件、不写、不删、不刷缓存、不试用泄露的凭据）；`--allow-intrusive` 才解除。每个确认的发现还会过一遍确定性的范围审计，PoC 里出现范围外主机就打 ⚠ 标记。

### 机制四：cbh 的两级分类器与 fail-closed 范围导入

`cbh classify` 用两阶段匹配：第一级是 18 条手工正则，把 URL 形状直接映射到技能，置信度高，例如 `[?&](url|next|redirect|return)=` → `hunt-ssrf`、`/api/users/{id}` → `hunt-idor` + `hunt-api-misconfig`、`/graphql` → `hunt-graphql`、`/_layouts/15/` 或 `/_vti_bin/` → `hunt-sharepoint`、`/functionRouter` → `hunt-rce` + `hunt-ssti`（对应 Spring Cloud Function CVE-2022-22963）。第二级是描述关键词重叠，置信度低，作为兜底。

`cbh scope import` 更值得一读，因为它的设计哲学是 **fail closed**——范围门禁是无人值守引擎所信任的东西，宁可少导入，不可多授权。规则映射相当细：

- 裸域名 `app.example.com` 会被转成 `re:^app\.example\.com$` 的精确主机规则，而不是 `app.example.com`，否则它会顺带放行所有子域；
- `*.example.com` 转成子域通配规则；
- IP、CIDR、IP 段转成覆盖 CIDR；
- 带路径的资产（`https://api.example.com/v1/users`）因为范围检查是按主机做的，不会被直接导入，而是列进"需要人工复核"，并给一条建议规则；
- 模板占位符、`<your-tenant>` 这类、自由文本、mobile app ID、源码、硬件，一律进复核或 `## Other assets`。

作者拿 `bounty-targets-data` 的全量公开项目跑过验证：939 个项目、52,947 个资产，HackerOne 主机资产 97.5% 转成规则、Intigriti 91%、YesWeHack 90%、Bugcrowd 68%（公开 dump 有脱敏）；所有 939 个项目的每条规则都能往返通过 `engine/scope.py`，声明的资产全部被放行，精确主机不会误放子域，deny 规则都能拒掉目标主机，重复导入是幂等的。这些数字是仓库里少见的、可复现的量化声明。

### 设计取舍

这套架构里有两处明显的取舍值得学习。

第一处：**为什么侦察不用 LLM**。侦察是广度问题，答案确定（域名存在与否、端口开不开、参数叫什么），用 LLM 做既不省钱也不更准，还会引入不确定性。所以 `recon.py` 用 `socket.getaddrinfo()` 做解析——文档里提到这是为了绕开 macOS arm64 上 `dnsx` 的 segfault；HTTP 探测用 10 线程 `urllib`，重定向只记录首次响应状态而不去请求目标地址，避免把侦察变成越界访问。

第二处：**为什么子 agent 默认关掉 skills**。直觉上"给 agent 更多知识总是更好"，但作者的 eval 结论相反：在已经由 `skill_map.py` 精确指路的前提下，再塞 84 个技能进子 agent 上下文，能力增益接近零，成本是每个 agent 多 12–15k token。这是个很务实的判断——知识注入的边际收益，取决于任务是否已经被人为收窄。

## 三、安装与快速开始

### 环境要求

- **Claude Code**：从 https://claude.ai/download 安装（是 CLI 应用，不是浏览器里的 Claude.ai）
- **操作系统**：macOS、Linux 或 Windows；前两者用 bash 安装脚本，Windows 用原生 PowerShell 脚本
- **Python 3.9+**：`cbh` CLI 的运行要求（`pyproject.toml` 里写的是 `requires-python = ">=3.9"`，且 `dependencies = []`，不装第三方包也能跑）
- **可选但推荐**：Burp Suite Pro/Community（`cbh --burp` 走代理）、Burp MCP Server 扩展（对话式狩猎）、`subfinder`（没有它 `cbh recon` 只靠 crt.sh）、Java（Burp MCP 需要）

### 安装方式 A：作为 Claude Code 插件（推荐）

在 Claude Code 会话里直接执行两行：

```text
/plugin marketplace add elementalsouls/Claude-BugHunter
/plugin install claude-bughunter@elementalsouls
```

84 个技能和 15 个命令会以 `claude-bughunter:` 命名空间加载，插件版本升级时自动更新，不会往 `~/.claude/` 里拷文件。

安装过程会问你 HackerOne API 的用户名和 token，**这是可选的**。它们只用于让 HackerOne MCP 读取你的私有项目和自己的报告；留空的话，所有技能、命令以及 MCP 的公开工具（重复报告搜索、项目范围查询）都照常工作。

### 安装方式 B：克隆后拷贝安装

需要 `cbh` 命令行或 `hunt` 脚手架时走这条路：

```bash
git clone https://github.com/elementalsouls/Claude-BugHunter.git
cd Claude-BugHunter
```

```bash
# macOS / Linux
bash scripts/install.sh

# Windows (PowerShell)
pwsh ./scripts/install.ps1
```

脚本会把 84 个技能拷到 `~/.claude/skills/`（Windows 是 `%USERPROFILE%\.claude\skills\`）、15 个斜杠命令拷到 `~/.claude/commands/`，并在 macOS/Linux 上把 `hunt` 脚手架装到 `~/.claude/scripts/hunt.sh`。同名技能会被备份到 `~/.claude/install-backups/<timestamp>/`，备份目录在 skills 与 commands 之外，所以不会被当成重复技能加载；重复执行是非破坏性的。

两种方式的差异，README 给了张表，很值得先看清楚：

| 路径 | 84 技能 + 15 命令 | `cbh` CLI | `hunt` 脚手架 |
|---|---|---|---|
| A — 插件 | ✅ 命名空间 `claude-bughunter:` | ➕ 需单独 `pipx install` | ❌ 仅克隆可用 |
| B — 拷贝安装 | ✅ 拷进 `~/.claude/` | ✅ 来自克隆 | ✅ 来自克隆 |

也就是说插件是最快到"技能 + 斜杠命令"的路，但终端工具是独立发布的，可以单独装：

```bash
pipx install git+https://github.com/elementalsouls/Claude-BugHunter
```

### 多 harness 安装

因为技能就是标准 Agent Skills，一条命令可以装到所有已安装的 harness：

```bash
# macOS / Linux
bash scripts/install.sh --all --burp-mcp

# Windows (PowerShell)
pwsh ./scripts/install.ps1 -All -BurpMcp
```

`--all` 会探测本机装了哪些 harness，分别拷到 `~/.claude/skills`、`~/.agents/skills`（Codex / OpenCode）、`~/.hermes/skills`（Hermes）、`~/.gemini/config/skills`（AntiGravity）；`--burp-mcp` 同时把 Burp MCP 接进这些 harness。注意知识层可以移植，斜杠命令和 `/hunt` 引擎是 Claude Code 专有的。

### 验证与最小可运行示例

重载 shell 后直接运行 `hunt`，不带参数应当打印用法：

```bash
source ~/.zshrc 2>/dev/null || source ~/.bashrc
hunt
```

预期输出类似：

```text
Usage: hunt <target-name>
Creates a new engagement folder at $HUNT_BASE/<target-name>
Default $HUNT_BASE is /Users/you/Targets
```

如果报 `command not found`，把终端完全重启再试。走 CLI 路线的话，最小验证是跑一次被动侦察：

```bash
cbh recon hackerone.com
```

它会做四步：crt.sh 证书透明日志（无需 key）加可选的 `subfinder`、合并去重；用标准库解析 DNS；10 线程并发做 HTTP 探测，提取状态码、`Server`、`X-Powered-By`、`X-Drupal-Cache` 和 `<title>`；最后生成 `recon/<target>/RECON_SUMMARY.md`，里面是活主机表格和"下一步建议"。

产物固定在 `recon/<target>/` 下：`subdomains.txt`、`resolved.txt`、`live-hosts.json`、`RECON_SUMMARY.md`，以及关键的 `manifest.json`——它是侦察到狩猎的交接契约，`cbh surface` 靠它输出 P1 / P2 / Kill 分级面，`hunt` 靠它初始化 `scope.md` 与 `notes.md`。

## 四、使用方法与实战

### 用法一：用大白话触发技能

装好之后不需要背命令。在 Claude Code 里描述目标即可，README 给的示例是：

```text
> Testing acme.com — an in-scope HackerOne target. Run recon and rank the surface.
```

然后它会加载 `web2-recon`、`offensive-osint`、`bb-methodology`，跑子域枚举与活主机探测，按技术栈给攻击面排序，指出 `api.acme.com` 的 GraphQL introspection 开着、`auth.acme.com` 是 OAuth/SSO，并建议下一步探 introspection 与 `redirect_uri`。

更细的触发也是同样的机制：

```text
> 我在 /api/v1/invoices/1042 看到用数字 ID 直接取单据，换个 ID 还能拿到别人的
```

这句话会命中 `hunt-idor` 与 `hunt-api-misconfig`，加载对应模式库——里面是 26 条披露报告提炼出的检测模式、绕过表和链模板，而不是一段泛泛的 OWASP 解释。

### 用法二：`/hunt` 加 cbh 的完整闭环

文档给的 4 天闭环是最贴近真实的用法：

```bash
# Day 1 — intake
cbh scope import h1:target -o ~/Targets/target/scope.md   # 然后读 "## Needs manual review"
cbh recon target.com
# → recon/target.com/RECON_SUMMARY.md

# Day 2 — hunt
# 从侦察摘要里挑一条可疑 URL 做分类
cbh classify "https://api.target.com/v1/users/42?token=abc"
# → matches hunt-idor + hunt-api-misconfig + hunt-ssrf
# → 读 docs/disclosed-reports/hunt-idor.md 里的模式库

# Day 3 — validate
cbh triage findings/idor.md
# → PASS — eligible for report drafting

# Day 4 — submit
cbh report findings/idor.md --platform h1 --out drafts/h1-draft.md
```

`cbh report` 支持 `h1` / `hackerone` / `bugcrowd` / `intigriti` / `immunefi` 五个平台，输出结构不同：Bugcrowd 会加 VRT 映射与严重级别申辩段，Intigriti 留 CVSS 3.1 向量槽，Immunefi 预填 `forge test --match-test` 调用。有一条设计纪律必须知道：**CLI 从不编造内容**，finding 里没写的段落一律留 `(fill in)` 占位，由操作者自己补。

### 用法三：确定性引擎的三种跑法

```bash
# 默认 — 只做确定性地图（$0，不调 agent），停在 arsenal.md 交还控制权
python3 engine/engine.py --scope my-engagement.json

# 显式开启 agent 自动测试（只读、curl 优先、并行）
python3 engine/engine.py --scope my-engagement.json --hunt --parallel 3 --max-hunts 12

# 允许状态变更型 PoC（默认关闭）
python3 engine/engine.py --scope my-engagement.json --hunt --allow-intrusive
```

范围文件的最小结构是 `{name, in_scope, out_of_scope, seeds}`，输出落在 `~/.bughunter-engagements/<name>/`。想先看接线是否正常、又不想花钱调模型，可以用罐头输出跑一遍：

```bash
python3 engine/engine.py --scope engine/engagement.example.json --base /tmp/eng --mock --hunt
```

常用参数：

| 参数 | 作用 |
|---|---|
| `--hunt` | 显式开启 agent 阶段（默认只到地图） |
| `--allow-intrusive` | 解除只读限制，允许状态变更型 PoC |
| `--parallel N` | 并发 agent 数，默认 3 |
| `--max-hunts N` | 限制本轮狩猎数量 |
| `--phases a,b,c` | 显式指定阶段，跳过默认顺序 |
| `--use-memory` | 开启跨 engagement 台账（读写 `findings.jsonl` / `negatives.jsonl`） |
| `--use-metrics` | 开启脱敏的通用命中率指标 |

注意 `--use-memory` 是个隐私开关：默认运行不会跨项目汇集任何可识别目标的信息，台账里存的是主机名和 URL，只有在显式开启时才既读又写。

### 用法四：接 Burp

三种模式都是一等公民，按你手上有什么选：

```bash
# 只走 curl，不需要 Burp
cbh recon target.com

# 全流量过 Burp 代理，请求响应都进 Proxy history，一键送 Repeater
cbh recon target.com --burp
cbh classify "https://target.com/api/users/42" --burp

# 换端口或换代理（mitmproxy / ZAP 同理）
cbh recon target.com --proxy http://127.0.0.1:8081
export CBH_BURP_PROXY=http://127.0.0.1:8080   # 设一次，之后自动探测
```

想走对话式，先装 Burp 的 MCP Server 扩展（BApp Store 搜 "MCP Server"），确认 Output 里出现 `Started MCP server on 127.0.0.1:9876`，然后注册：

```bash
claude mcp add burp -s user -- java -jar ~/.BurpSuite/mcp-proxy/mcp-proxy-all.jar
```

新开一个 `claude` 会话，`/mcp` 里应当看到 `burp · ✓ connected`。此后 LLM 可以自己调 Burp 发 Repeater、换 header、取响应，`cbh` 负责批量发现与分类，两者互补。

### 端到端演练：一个 IDOR 从发现到提交

把上面的零件串起来，一个真实流程大概是这样：

1. **导入范围**：`cbh scope import h1:acme -o ~/Targets/acme/scope.md`，然后**必须先读**文件里的 `## Needs manual review` 段。带路径的资产、模板占位符、mid-label 通配符都会落到这里，没确认之前不要开打。
2. **侦察**：`cbh recon acme.com`，看 `RECON_SUMMARY.md` 里的活主机表，再用 `cbh surface acme.com` 拿 P1/P2 分级。
3. **分类**：从摘要里挑 `https://api.acme.com/v1/invoices/1042`，`cbh classify` 命中 `hunt-idor`，打开 `docs/disclosed-reports/hunt-idor.md` 对照 26 条模式，确认这是"数字 ID 直接对象引用"而非"UUID 但可枚举"这类会被打回的形状。
4. **验证**：用两个不同权限的账号交叉取同一资源，保存原始请求响应。写 `findings/idor.md`，包含 curl 复现、影响描述、受影响数据范围。
5. **过门禁**：`cbh triage findings/idor.md`。这一步会检查 Q1（有没有真实 HTTP 测试痕迹）、Q6（影响是"理论上可能"还是"已泄露/已回连"）、Q7（是否命中永不提交清单）。缺证据会被判"未回答"，这是故意的。
6. **出稿**：`cbh report findings/idor.md --platform bugcrowd --out drafts/bugcrowd-draft.md`，补完占位符，附证据，提交。

这套流程的价值在于把"纪律"变成了可执行的门。junior 最常犯的三类 N/A——没真测、没具体影响、命中永不提交清单——正好对应门禁的三条硬规则。

## 五、常见问题与解决方案

**现象：安装脚本报 `syntax error`，怎么重跑都不行。**
原因：老 checkout 在 `.gitattributes` 之前克隆，shell / PowerShell 脚本被 CRLF 污染，带 CRLF 的脚本会直接语法失败且无法自愈。
解决：`git add --renormalize . && git checkout .`，或者干脆重新克隆。仓库已用 `.gitattributes` 强制这两个脚本用 LF，新克隆不会有这个问题。

**现象：`hunt` 提示 `command not found` / `not recognized`。**
原因：安装脚本往 `.zshrc` / `.bashrc` / `$PROFILE` 里加了 source 行，当前 shell 还没加载。
解决：`source ~/.zshrc 2>/dev/null || source ~/.bashrc`（Windows 用 `. $PROFILE`）；仍然不行就完全重启终端。

**现象：插件装完了，但 `cbh` 命令不存在，`hunt` 也没有。**
原因：插件只提供技能和斜杠命令，设计如此。`cbh` 是独立发布的包，`hunt` 脚手架只在克隆安装路径里。
解决：`pipx install git+https://github.com/elementalsouls/Claude-BugHunter` 拿 CLI；需要 `hunt` 就按方式 B 克隆再跑 `bash scripts/install.sh`。

**现象：明明是授权测试，Claude 却拒绝，或者回答质量突然下降。**
原因：两件不同的事。一是 Anthropic 运行时对"漏洞利用或攻击性安全工具开发"有默认拦截，授权的范围内工作也可能被误伤；二是 Opus 5 上有一小类高风险网络请求（利用代码生成、二进制漏洞扫描、渗透测试）会**降级回 Opus 4.8** 而不是拒绝，长会话里很容易滚过去没注意，看起来像模型变笨了。
解决：前者去申请免费的 [Cyber Verification Program](https://claude.com/form/cyber-use-case)，让双用途工作的防护阈值被调整（大规模数据外泄与勒索软件开发不在可调范围）；后者在 Settings → Capabilities 里关掉自动模型切换。另外，`/hunt` 会在第一轮就声明"授权、范围受限、可修复的发现"这个 engagement 框架，因为这本来就该显式写进会话，而不是靠暗示。

**现象：`cbh recon` 只找到很少的子域。**
原因：没装 `subfinder`，只剩 crt.sh 一条被动源。
解决：装 ProjectDiscovery 的 `subfinder` 并确认在 PATH 里；或者接受 crt.sh 的结果，改用 JS bundle 挖掘补面（`recon.py` 会从 JS 里提端点）。

**现象：`cbh scope import` 把一堆资产丢进"需要人工复核"，看着像 bug。**
原因：这是 fail-closed 设计的正常行为。带路径的资产（`https://api.example.com/v1/users`）无法用主机级规则表达，`<your-tenant>.example.com`、`app[.staging].example.com`、自由文本、mid-label 通配符同理。
解决：逐条人工判断，手工写成 `re:` 正则规则或显式列入 out of scope。范围门禁是无人值守引擎唯一信任的东西，这里偷懒的代价是越界。

**现象：Windows 上 `install-community-skills.ps1` 跳过了上游技能刷新。**
原因：上游 `shuvonsec/claude-bug-bounty` 只有 bash 安装器，脚本会尝试用 Git-for-Windows 的 `bash` 调它，找不到就跳过并提示。
解决：装 Git for Windows（https://git-scm.com）。注意这一步是可选的新鲜度刷新，不影响首次安装。

**现象：同时装了 Claude-OSINT，两个包都带 `offensive-osint` 和 `osint-methodology`，会不会互相覆盖？**
原因：这两个技能在 Claude-BugHunter 里是权威维护、再导出到 Claude-OSINT 的，内容字节一致。
解决：不用处理。两边的安装器都会写 manifest，遇到内容相同的技能跳过拷贝，`--uninstall` 也会保留另一个包仍然拥有的技能，卸载一个不会弄坏另一个。

**现象：想拿它打内网 AD，发现完全没有 BloodHound、Kerberoasting 这类内容。**
原因：不是遗漏，是刻意的范围界定。这个包只覆盖**外网攻击面**——从互联网可达、无需先攻破内网端点的一切。内网 AD 攻击、C2 框架、后渗透与持久化、免杀对抗、iOS/硬件/RF/ICS、二进制与内核利用，全部明确排除。
解决：换工具链。作者自己写得很清楚："与其让你在 engagement 中途才发现，不如一开始就说。"外网到内网的交接（Impacket、NetExec、Rubeus、Certify、BloodHound）被有意留在包外。

## 六、总结

Claude-BugHunter 值得看的地方，不在于"84 个技能"这个数字，而在于它把三件事做对了：用 `description` 语义路由解决了上下文预算问题；用 7 问门禁和四分支结论把 triage 纪律变成可执行的门；用确定性优先的引擎把不花钱、不需要判断的广度工作从 LLM 手里拿走。681 条披露报告模式里 433 条逐条可审计，这种可追溯性在安全类"提示词工程"项目里并不常见。

它适合谁：做漏洞赏金、Web 应用渗透、外网红队的从业者；已经有 Claude Code 使用习惯、想把工作流固化下来的人；以及想学"资深研究者怎么想"的入门者——技能正文本身就是一份可读的方法论。它也适合研究 Agent 工程的人，`engine/` 里"默认只读、范围写死在代码里、子 agent 关掉技能省 12–15k token"这些取舍，比大多数 agent 框架的文档更诚实。

不适合谁：做内网 AD、C2、后渗透、免杀的人，这个包明确不覆盖；期待"一键出报告"的人，`cbh report` 会留一堆 `(fill in)` 给你；以及没有授权目标的人——它的全部设计前提是"你拥有或已获书面授权"，这一点 README 和 `SECURITY.md` 都写得很硬。

双许可（代码 MIT、内容 CC BY 4.0）意味着内容可以商用，记得署名回链。v2.1 的 roadmap 上还挂着 per-engagement 记忆层、`citrix-netscaler-deep` / `f5-bigip-attack` / `ad-cs-attack` 三个企业平台技能，以及季度刷新的 VPN CVE 矩阵——后续值得跟。

项目地址：https://github.com/elementalsouls/Claude-BugHunter
