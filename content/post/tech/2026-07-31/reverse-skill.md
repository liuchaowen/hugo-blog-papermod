---
title: "reverse-skill：AI 代码助手逆向渗透技能路由包"
date: 2026-07-31
description: "reverse-skill 是一个专为 AI Agent（Claude Code、Cursor、Cline 等）设计的逆向工程 / 渗透测试技能路由包，通过 38 个场景化 Skill 自动路由 + 按需工具链自举 + 可进化经验库，让 AI 在面对 APK、JS 加密、固件、CTF 等任务时不再盲猜命令。"
author: "Cheman"
slug: reverse-skill
draft: false
categories: ["安全", "开源"]
tags: ["逆向工程", "渗透测试", "AI Agent", "GitHub", "CTF", "自动化工具链"]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**reverse-skill**，一个为 AI 代码助手（Claude Code、Cursor、Cline 等）打造的逆向工程与渗透测试技能路由包——让 AI 在面对 APK 逆向、JS 前端加密、固件分析、CTF 题目等任务时，不再靠"盲猜命令"而是走标准化工作流。截至本文发布，该项目已收获近 **10,000 颗 Star**，足以说明社区对它的认可。

## 一、项目概述

`reverse-skill` 解决了一个很实际的问题：当 AI Agent 遇到 APK 分析、前端加密参数逆向、固件提取等任务时，它往往不知道该用 `jadx`、`Frida`、`apktool`、`IDA` 还是 `BurpSuite`。这个项目将这些经验固化为可路由的 Skill 集合，AI 只需描述任务，系统自动路由到最合适的 Skill 并引导完整工作流。

**核心特性：**

- **38 个场景化 Skill**：覆盖 APK 逆向、iOS 移动端、JS 前端加密、.NET / C#、固件提取、CTF 沙箱、红队攻击链、EDR 免杀等几乎所有逆向安全领域
- **AI Agent 优先设计**：README 明确写道"If you are an AI Agent, jump to README_AI.md"，项目本身就是为 AI 打造的，而非仅仅供人类使用
- **按需工具链自举**：通过 `tool-index.md` 检测本地已安装工具，仅对缺失工具执行 bootstrap，避免重复安装
- **可进化经验库**：case 目录记录每次分析过程，Evidence → Finding → Path 结构化沉淀经验

**项目信息：**

| 指标 | 数值 |
|------|------|
| GitHub Stars | 9,959 |
| GitHub Forks | 1,547 |
| 主语言 | PowerShell + Python + Node.js |
| 创建时间 | 2026-05-13 |
| License | MIT（含 GPLv3 / AGPL-3.0 子模块） |

## 二、技术原理

### 2.1 路由引擎：任务 → Skill 的精确匹配

项目核心是 `skills/scripts/master-route.ps1`（PowerShell）和 `skills/MASTER-ROUTING.md` 两套路由逻辑。以 PowerShell 脚本为例，其核心是一个优先级 Map 和关键词匹配规则：

```powershell
$map = [ordered]@{
    'R1'  = 'apk-reverse/SKILL.md'
    'R2'  = 'mobile-reverse/SKILL.md'
    'R3'  = 'js-reverse/SKILL.md'
    'R4'  = 'reverse-engineering/dsl-vm-reverse/SKILL.md'
    'R5'  = 'dotnet-reverse/SKILL.md'
    'R6'  = 'ida-reverse/SKILL.md'
    'R9'  = 'malware-analysis/SKILL.md'
    'R10' = 'attack-chain/SKILL.md'
    'R11' = 'pentest-tools/SKILL.md'
    # ... R12 ~ R38
}
```

关键词匹配采用分层策略：先按场景关键词命中（如 `apk`、`smali`、`jadx` 命中 R1），再按优先级（高 → 低：R4 > R1 > R2 > R3...）取第一个命中的 Skill 作为 PRIMARY 输出：

```powershell
if ($t -match 'apk|smali|jadx|apktool') { [void]$sel.Add('R1') }
if ($t -match 'ios|ipa|objection|mobsf|mobile') { [void]$sel.Add('R2') }
if ($t -match 'js.?encrypt|前端加密|js.?hook|cdp') { [void]$sel.Add('R3') }

# 优先级高→低排序，最终取第一个命中的作为 PRIMARY
$priority = @('R4','R1','R2','R3','R30','R31','R33','R5','R9',...)
$primary = $null
foreach ($p in $priority) {
    if ($uniq.Contains($p)) { $primary = $p; break }
}
```

这保证了即使任务同时命中多个场景（如"APK + JS"），也能给出唯一确定的 Skill 入口。

### 2.2 工作流执行：RULES.md → PRIMARY Skill → Case Init

整个工作流遵循严格的执行契约（写入了 `RULES.md`）：

```
用户任务
  → RULES.md（强制执行路由规则）
  → MASTER-ROUTING / master-route.ps1（PRIMARY 路由）
  → case-init / scope.md（授权 + 网络档；未 granted 禁止 ACT）
  → Scenario Skill → tools / MCP / scripts
  → timeline + Evidence → Finding → Path → report + field-journal
```

**关键安全门禁**：`case-init` 阶段必须完成 `auth.status=granted` 和 `network_profile` 设置，在未获得授权前禁止对目标执行任何操作。这是项目设计中最值得称道的一点——用结构化流程防止 AI 误操作未经授权的系统。

### 2.3 工具链自举：tool-index 按需检测

```bash
# Linux / macOS
bash skills/scripts/refresh-tool-index.sh

# Windows
powershell -File skills/scripts/refresh-tool-index.ps1
```

脚本扫描系统 PATH，生成 `tool-index.md`，记录每个工具的安装状态（yes/no）。Skill 运行时仅对标记为 `no` 且当前任务需要的工具执行 bootstrap，最大限度减少环境污染。

## 三、安装与快速开始

### 3.1 环境要求

- **Java / JDK** — jadx 和 apktool 依赖
- **Node.js 22.12+** — JS 工具链和 MCP 服务器
- **Python 3.x** — Frida 和辅助脚本
- **PowerShell 5.1+**（Windows）或 bash（Linux/macOS）
- 一个 AI 代码客户端（Claude Code、Claude CLI、Cursor、Cline 等）

### 3.2 安装步骤

```bash
git clone https://github.com/zhaoxuya520/reverse-skill.git
cd reverse-skill

# 刷新工具索引（根据你的平台）
# Linux / macOS:
bash skills/scripts/refresh-tool-index.sh

# Windows:
powershell -File skills/scripts/refresh-tool-index.ps1
```

### 3.3 最简运行示例：让 AI 分析一个 APK

以 Claude Code 为例，直接在克隆的仓库目录下运行：

```bash
# 方式一：手动描述任务，AI 自动路由
claude
# 输入：分析这个 APK，输出主要逻辑和可疑行为
# AI 会自动：读取 RULES.md → master-route.ps1 → 命中 R1(apk-reverse) → case-init

# 方式二：使用 PowerShell 脚本直接输出路由结果
pwsh skills/scripts/master-route.ps1 -Hint "分析 APK 文件并找出网络请求"
# 输出：PRIMARY: R1 (apk-reverse/SKILL.md), confidence: high
```

## 四、使用方法与实战

### 4.1 基础用法：AI Agent 引导模式

项目专门提供了 `README_AI.md`，这是 AI 的入口文件。AI 读取后会：

1. 将 `RULES.md` 的路由规则注入到自己的全局配置（`~/.claude/CLAUDE.md` 等）
2. 刷新本地 `tool-index.md`
3. 根据任务关键词路由到 PRIMARY Skill
4. 执行 `case-init` 建立工作目录和 scope

关键注入模板：

```markdown
| Client | Global Config Location |
|--------|----------------------|
| Claude Code | `~/.claude/CLAUDE.md` |
| Kiro | `~/.kiro/steering/reverse-routing.md` |
| Cursor | Settings → Rules → Global Rules（手动） |
| Cline | Settings → Custom Instructions（手动） |
```

### 4.2 进阶用法：自定义 Skill 和工作流

项目支持在 `skills/` 目录下扩展自己的 Skill。结构化约定：

```
skills/
├── ops/                    # 作战合约
│   ├── scope-contract.md   # 启动门槛
│   ├── role-map.md         # 角色映射
│   ├── evidence-finding-path.md  # 证据链结构
│   └── timeline-workitem.md
├── scripts/
│   ├── master-route.ps1    # 路由脚本
│   ├── case-init.ps1       # 案例初始化
│   └── append-evidence.ps1 # 证据追加
└── <scenario>/
    └── SKILL.md            # 各场景 Skill
```

### 4.3 场景覆盖速查表

| 任务类型 | Skill 目录 |
|----------|-----------|
| APK / Android 分析 | `skills/apk-reverse/` |
| iOS / 移动端 | `skills/mobile-reverse/` |
| 前端 JS 加密逆向 | `skills/js-reverse/` |
| .NET / C# 逆向 | `skills/dotnet-reverse/` |
| IDA Pro 深挖 | `skills/ida-reverse/` |
| radare2 | `skills/radare2/` |
| 固件 / IoT 安全 | `skills/firmware-pentest/` |
| 恶意样本分析 | `skills/malware-analysis/` |
| 红队 / 攻击链 | `skills/attack-chain/` |
| CTF 竞赛（40+ 子 Skill） | `CTF-Sandbox-Orchestrator/` |
| EDR 免杀 | `skills/edr-bypass-re/` |
| 补丁差分 / N-day | `skills/patch-diff-exploit/` |
| LLM / Agent 安全 | `skills/llm-security/` |

## 五、常见问题与解决方案

**Q1: PowerShell 脚本报错"无法执行"（Linux/macOS）**
Linux/macOS 默认安全策略可能阻止脚本执行，解决方案：
```bash
pwsh skills/scripts/master-route.ps1 -Hint "你的任务描述"
# 或先解锁：
powershell -ExecutionPolicy Bypass -File skills/scripts/master-route.ps1
```

**Q2: tool-index 检测不到已安装的工具**
手动运行刷新脚本，或编辑 `skills/tool-index.md` 将对应工具标记为 `yes`。

**Q3: 路由结果为空（No strong keyword hit）**
传入更具体的任务描述，如将"分析这个文件"改为"逆向 APK 中的网络加密逻辑"。

**Q4: case-init 提示 auth 未 granted**
在 `case-init.ps1` 时加上 `-AuthGranted` 参数（仅限授权靶场环境）：
```powershell
powershell -File skills/scripts/case-init.ps1 -Hint "分析 APK" -CaseName "my-case" -AuthGranted -TargetUrl "https://target/" -NetworkProfile authorized_target_only
```

**Q5: 私有仓库无法克隆**
提供 GitHub Personal Access Token：
```bash
python3 fetch_github.py <repo_url> --token <YOUR_TOKEN>
```

## 六、总结

`reverse-skill` 是近年来安全工具链领域一个极具创新性的项目——它不是又一个工具集合，而是一套**让 AI Agent 在安全分析任务中保持专业性和安全边界的方法论**。通过结构化的路由引擎、强制性的 Scope Gate、以及可沉淀的经验库，它将安全分析的"最佳实践"固化为 AI 可复现的工作流。10,000 Star 的社区认可也证明了这套思路的普适性——无论你是安全研究员、CTF 选手，还是在用 AI 代码助手处理逆向任务，这个项目都值得一试。

> **项目地址：** https://github.com/zhaoxuya520/reverse-skill  
> **Star / Fork：** ⭐ 9,959 · 🍴 1,547
