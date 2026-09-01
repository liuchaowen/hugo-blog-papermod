---
title: "Codex with ChatGPT：让 ChatGPT 负责思考，Codex 负责干活"
date: 2026-09-02T07:25:00+08:00
description: "Codex with ChatGPT 是一个将 ChatGPT 网页版变为 Codex 编码会话规划大脑的开源项目，通过只读 MCP 桥接实现思考与执行的分离，无需 API Key，不搞逆向代理，安全高效地复用付费订阅额度。"
author: "Cheman"
draft: false
tags: ["GitHub", "开源", "Codex", "ChatGPT", "MCP", "AI编程"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**codex-with-chatgpt**，它巧妙地解决了 ChatGPT 付费订阅额度闲置与 Codex API 额度紧张之间的矛盾。

## 一、项目概述

**codex-with-chatgpt** 是一个将 ChatGPT 网页版变成 Codex 编码会话"规划与审查大脑"的工具。核心思路很简单：ChatGPT 负责思考（规划、审查），Codex 负责执行（写代码、跑测试）。

这个项目解决了一个很现实的痛点——很多开发者订阅了 ChatGPT Plus/Pro，但网页版的额度大量闲置；与此同时，Codex 却在消耗紧张的 API 额度做规划和 Review。本项目把"思考"交给你已付费的网页版 ChatGPT，Codex 只负责执行，不用 API Key、不搞逆向代理，通过官方网页 + 只读 MCP 桥接实现。

### 核心特性

- **无需 API Key**：直接复用 ChatGPT 网页版订阅
- **只读 MCP 桥接**：通过 OAuth 保护的只读连接，仓库永远不会被上传
- **独立审查机制**：ChatGPT 通过 MCP 读取实际 git diff 和测试记录，不盲信"所有测试通过"
- **零逆向工程**：使用官方 Web UI + Cloudflare Quick Tunnel，不违反 ToS
- **一段话安装**：非技术用户也能一键部署

## 二、技术原理

### 架构设计

整个系统由三个核心部分组成，形成一个清晰的"思考-执行"分离架构：

```
             ┌───────────────────────────┐
             │       ChatGPT Web         │
             │  Reason / Plan / Review   │
             └──────────┬──────────▲─────┘
                        │          │
               MCP      │          │ Computer Use
            Data Plane  │          │ Control Plane (<1 KB messages)
                        ▼          │
             ┌─────────────────────┐
             │      C2C Bridge     │   loopback-only HTTP server
             │  read-only MCP      │   OAuth 2.1 + one-time pairing code
             │  OAuth + Pairing    │   Cloudflare Quick Tunnel
             │  Tunnel Manager     │
             └──────────┬──────────┘
                        │  read-only
                        ▼
             ┌─────────────────────┐          ┌─────────────────────┐
             │   Local Workspace   │◀─────────│    Codex Harness    │
             └─────────────────────┘ edit/git │ shell / tests / fix │
                                              └─────────────────────┘
```

### 双平面设计

项目采用了精巧的**双平面架构**：

**控制平面（Computer Use）**：Codex 和 ChatGPT 之间交换微小的结构化 `[C2C]` 状态消息——`INIT → PLAN → EXECUTED → REVIEW → DONE`。不传 diff、不传日志、不传文件内容，消息体通常小于 1KB。

**数据平面（MCP）**：ChatGPT 通过 9 个只读工具按需拉取工作区数据：

- `workspace_info` — 获取工作区基本信息
- `list_directory` — 列出目录内容
- `read_file` — 读取指定文件
- `search_workspace` — 搜索工作区
- `git_status` — 查看 Git 状态
- `git_diff` — 查看 Git 差异
- `test_status` — 查看测试状态
- `execution_summary` — 获取执行摘要
- `execution_output` — 获取执行输出

### 技术栈

从 `package.json` 可以看到核心依赖：

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "commander": "^14.0.0",
    "express": "^5.1.0",
    "ignore": "^7.0.5",
    "zod": "^3.25.0"
  }
}
```

- **MCP SDK**：Model Context Protocol 官方 SDK，实现只读工具集
- **Express 5**：loopback HTTP 服务器，端口恢复机制
- **Commander**：CLI 命令行工具
- **Zod**：运行时类型校验
- **ignore**：`.c2cignore` 规则匹配

TypeScript 严格模式编译，146 个测试覆盖路径安全、OAuth、配对和 MCP 端到端流程。

### 安全模型

安全设计是这个项目的亮点之一：

- **只读架构**：服务器上根本不存在写/删除/Shell/提交工具，prompt injection 也无法启用它们
- **单工作区边界**：每个 token 绑定单个工作区，路径包含使用规范化 realpath，符号链接/`../`/绝对路径逃逸全部被阻止并测试
- **敏感文件保护**：`.env*`、密钥、SSH、凭证默认拒绝（`.env.example` 允许），`.c2cignore` 支持自定义规则
- **OAuth 2.1**：PKCE S256、动态客户端注册、轮换刷新令牌。知道 URL 也没用——没有 token 就是 401，错误工作区就是 403
- **一次性配对码**：5 分钟 TTL、5 次尝试限制、速率限制、使用即销毁

## 三、安装与快速开始

### 环境要求

- Node.js >= 20
- Git
- `cloudflared`（自动检测，Skill 会帮你安装）

### 一键安装（推荐）

把下面这段话原样复制给你的编码 Agent（如 Codex），然后去倒杯咖啡：

```text
请帮我完整安装并配置 Codex with ChatGPT，全程自动，我是不懂技术的小白，
所有事情你自己做：

1. 环境自检：需要 git 和 Node.js ≥ 20，缺什么就自动安装
  （macOS 用 Homebrew，Windows 用 winget），同时安装 cloudflared。
2. 下载：把 https://github.com/XiaoDuoYa/codex-with-chatgpt 克隆到
   ~/codex-with-chatgpt（已存在就 git pull 更新）。
3. 构建：在该目录里执行 corepack pnpm install 和 corepack pnpm build。
4. 安装 Skill：把仓库里的 skill/SKILL.md 复制到
   ~/.codex/skills/codex-with-chatgpt/SKILL.md，并把文件中
   "The codex-with-chatgpt checkout lives at:" 那一行的路径改成实际克隆路径。
5. 首次配置：按 SKILL.md 里的 first-time setup 流程执行
  （运行 c2c setup，用内置浏览器打开 ChatGPT 配置连接器并输入配对码）。
   全程只用内置浏览器，禁止打开任何第三方浏览器。
6. 只有遇到需要我登录（ChatGPT / Cloudflare）、验证码或两步验证时才叫我，
   而且一次只告诉我一个动作。
7. 完成后给我看 ✓ 清单，并确认文件读取测试通过。
```

### 手动安装

```bash
# 克隆仓库
git clone https://github.com/XiaoDuoYa/codex-with-chatgpt ~/codex-with-chatgpt
cd ~/codex-with-chatgpt

# 安装依赖并构建
corepack pnpm install
corepack pnpm build

# 安装 Skill
cp skill/SKILL.md ~/.codex/skills/codex-with-chatgpt/SKILL.md

# 首次配置
c2c setup
```

安装完成后你会看到：

```
Codex with ChatGPT

✓ Project detected
✓ Workspace Bridge started
✓ Secure connection established
✓ ChatGPT connected
✓ File read test passed

Ready.
```

## 四、使用方法与实战

### 基础用法

安装完成后，直接在 Codex 中说：

> "Use Codex with ChatGPT to implement XXX."

中文环境可以说：

> "使用 Codex with ChatGPT 来实现 XXX 功能。"

Codex 会自动启动桥接，ChatGPT 通过 MCP 读取你的工作区代码进行规划，Codex 负责执行。

### 工作流程

一次完整的开发循环如下：

1. **INIT** — Codex 初始化工作区，启动 C2C Bridge
2. **PLAN** — ChatGPT 通过 MCP 读取代码，制定实施计划
3. **EXECUTED** — Codex 执行计划，写代码、跑测试
4. **REVIEW** — ChatGPT 通过 MCP 读取实际 git diff 和测试记录，独立审查
5. **DONE** — 审查通过，任务完成

### 进阶：可选稳定域名

默认使用 Cloudflare 临时 URL，每次重启会变化。如果你有 Cloudflare 账号和域名，可以配置稳定域名：

```bash
c2c setup  # 首次配置时会询问是否要稳定域名
```

配置后连接器跨重启保持工作，无需每次重新配对。

### 开发者命令

```bash
c2c setup           # 桥接 + 隧道 + 配对码，一步到位
c2c sandbox-allow   # 在 Codex 中白名单设置目录（macOS + Windows）
c2c status          # 查看当前状态
c2c doctor          # 诊断问题
c2c pair            # 重新配对
c2c unpair          # 取消配对
c2c logs            # 查看日志
c2c stop            # 停止桥接
```

## 五、常见问题与解决方案

### 1. ChatGPT 连接器配置失败

**问题**：配对码输入后提示连接失败。

**解决**：先对 Codex 说"更新 Codex with ChatGPT"，更新到最新版本可以解决大多数已知问题。如果仍然失败，运行 `c2c doctor` 诊断。

### 2. 隧道 URL 变化导致连接断开

**问题**：重启桥接后 Cloudflare 临时 URL 变化，ChatGPT 连接器失效。

**解决**：Codex 会自动修复——删除旧连接器并重新添加。如果频繁重启，建议配置 Cloudflare Named Tunnel 获取稳定域名。

### 3. 敏感文件被拒绝读取

**问题**：ChatGPT 无法读取 `.env` 等敏感文件。

**解决**：这是安全设计。如果确实需要让 ChatGPT 读取某个被拒绝的文件，在 `.c2cignore` 中添加例外规则。但请谨慎操作，确保不会泄露真正的密钥。

### 4. Node.js 版本不兼容

**问题**：构建时报 Node.js 版本错误。

**解决**：项目要求 Node.js >= 20。使用 `nvm install 20` 或 `brew install node@20` 升级。

### 5. 测试失败

**问题**：运行 `pnpm test` 时部分测试失败。

**解决**：确保在项目根目录运行，检查 Node.js 版本和依赖安装是否完整。项目包含 146 个测试，覆盖路径安全、OAuth、配对和 MCP 端到端流程。

## 六、总结

**codex-with-chatgpt** 展示了一种巧妙的"思考-执行分离"模式：利用已有的 ChatGPT 付费订阅作为规划大脑，通过只读 MCP 桥接让 ChatGPT 安全地访问本地代码，Codex 专注执行。这种设计既节省了 API 额度，又保证了代码安全（仓库永不上传），还通过独立审查机制提升了代码质量。

项目的安全模型设计尤其值得学习——只读架构从源头杜绝了越权风险，OAuth 2.1 + 一次性配对码保证了连接安全，单工作区边界防止了横向移动。对于想要复用 ChatGPT 订阅额度、降低 API 成本的开发者来说，这是一个非常实用的工具。

> 项目地址：[https://github.com/XiaoDuoYa/codex-with-chatgpt](https://github.com/XiaoDuoYa/codex-with-chatgpt)
> 许可证：MIT
