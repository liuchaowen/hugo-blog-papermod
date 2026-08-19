---
title: "BetterWright：为 AI Agent 量身打造的 token 高效浏览器"
date: 2026-08-20
description: "BetterWright 是一个基于 Playwright、面向 AI Agent 的持久化浏览器：用压缩快照替代原始 HTML，只读任务单轮完成，内置策略沙箱、凭证保险库与 CAPTCHA 助手，让 Agent 像人类一样高效、安全地操作网页。"
author: "Cheman"
slug: betterwright
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI Agent, 浏览器自动化, Playwright]
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

**开篇引导段**：最近在 GitHub Trending 上刷到一个很有意思的项目：**BetterWright**。它把 Playwright 重新包装成了一个"为 AI Agent 而生"的浏览器——核心卖点不是"能自动化网页"，而是"能在最少 token 消耗下自动化网页"。

## 一、项目概述

BetterWright 的定位是 **the token-efficient browser for AI agents（面向 AI 智能体的 token 高效浏览器）**。它解决的问题非常具体：当一个 LLM 驱动的 Agent 去操作浏览器时，观察（observe）这一步会无情地吃掉上下文窗口——原始 HTML、完整可访问性树、纯截图循环，每轮都要耗掉成千上万个 token，最后任务还没完成，上下文就先爆了。

它提供两种使用形态，但底层共享同一套持久会话、凭证保险库、网络策略与快照机制：

| 形态 | 适用场景 | 拿到什么 |
| --- | --- | --- |
| **集成模式（Integrated）** | 你的 Agent（Claude Code、Codex、Pi、任意 MCP 客户端、自己写的代码）把浏览当作大任务的一环 | 一个 skill、一个 MCP server、或一个 JS API，让你自己的 Agent 逐步操控浏览器 |
| **独立 Agent 模式（Standalone）** | 你把整个浏览器任务丢出去，只等一个答案 | `betterwright exec "<task>"`——BetterWright 自带的浏览器 Agent 循环完成驱动，你只拿回一个 JSON 结果 |

核心特性可以概括为：

- **压缩快照**：用 Playwright 的 `mode: "ai"` 可访问性树，并把 Agent 无法操作的内容剪掉，留下 `[ref=eN]` 标记直接给模型点击/填写。
- **Diff 模式**：动作之后只返回"变了什么"，而不是整页重发。
- **单轮完成**：只读任务一个模型回合就结束，代码直接返回 `{finalAnswer}`，无需二次确认。
- **持久会话**：一个长生命周期浏览器，登录态跨回合、跨天、跨重启存活。
- **策略沙箱**：模型代码运行在沙箱里，拿不到文件、进程或网络路由 API。
- **凭证保险库**：AES-256-GCM 加密，表单自动填充但密钥绝不进入对话上下文。

## 二、技术原理

### 2.1 观察栈：把 token 成本压到最低

README 里有一张表清楚说明了它的观察机制，这也是整个项目的"技术心脏"：

| 机制 | Token 效果 |
| --- | --- |
| **压缩 Agent 快照** | Playwright `mode:"ai"` 可访问性树，剪掉 Agent 不能操作的部分——`/url` 属性行、非可操作角色的 ref、裸 `generic` 包装、重复文本、超过 100 字符的名字——只留 `[ref=eN]` 标记 |
| **Diff 模式** | 动作后只返回变化部分，而非整页 |
| **仅交互过滤** | 丢弃静态文本节点，只保留可点击/可填/可读的内容 |
| **作用域截断** | 给出"下一步去哪看"的提示，而非静默截断的一堵墙 |
| **单轮完成** | 只读任务一个模型回合结束，循环直接退出 |
| **持久会话** | 一次登录、一次导航，不重复支付 token 成本 |
| **子 Agent 委派** | `betterwright exec` 把整个浏览转录留在子 Agent 内部，主 Agent 只花一次工具调用 |

### 2.2 架构：一个长寿命 Node Worker 持有浏览器

根据项目说明，CLI（或你的 JS 宿主）拥有一个长寿命的 Node worker。worker 持有持久浏览器上下文，向模型代码暴露**沙箱化的全局变量**（`page`、`snapshot`、`screenshot`、`human`、`credentials` 等）；它会回调宿主来授权请求、解析凭证，但绝不让密钥出现在返回结果里。CDP 句柄和原始浏览器句柄始终留在 worker 内部。

从 `package.json` 可以看到它的模块导出结构非常清晰：

```json
{
  ".": { "import": "./dist/src/index.js" },
  "./agent": { "import": "./dist/src/agent.js" },
  "./auth": { "./dist/src/auth.js" },
  "./policy": { "./dist/src/policy.js" },
  "./vault": { "./dist/src/vault.js" },
  "./mcp-server": { "./dist/src/mcp-server.js" },
  "./skills": { "./dist/src/skills.js" }
}
```

依赖极简——核心只依赖 `playwright-core` 和 `tldts`，可选 `patchright-core`，说明它把注意力放在了"浏览器 + 策略层"本身，而不是堆砌依赖。

### 2.3 为什么不是直接 Playwright？

Playwright 是为测试而生的：可信脚本、已知选择器、跑完即销毁。而 Agent 恰恰相反——不可信的模型输出根据所见决定下一步，且浏览器下一回合还得在。BetterWright 在关键维度上做了差异化：

| 维度 | Playwright | BetterWright |
| --- | --- | --- |
| 观察 | 原始可访问性树或自拼 HTML | 压缩、可 diff、脱敏的快照，为上下文窗口计价 |
| 会话 | 每脚本一个浏览器 | 一个受管持久浏览器，登录态跨回合存活 |
| 信任 | 完整 API 访问 | 模型代码沙箱化，无文件/进程/网络路由 API |
| 网络 | 任意 URL | 每次请求策略检查（DNS 重绑定防护），云元数据端点始终阻断 |
| 密钥 | 写在脚本里 | AES-256-GCM 保险库，表单检测后自动填充且密钥不入对话 |
| 证据 | 断言 | `screenshot({kind:'proof'})` 带标签的产物，Agent 可引用为完成证据 |
| 验证码 | 不在范围 | 本地 `captcha.solve()` 支持勾选框/Turnstile/滑块 |

## 三、安装与快速开始

环境要求：**Node.js 22+**（实际 `engines` 字段要求 `>=22.18.0`）。安装时不会作为 npm 生命周期副作用下载任何东西，因此安装行为可预测，可加 `--ignore-scripts`。

```bash
npm install -g betterwright
betterwright init      # 引导式：下载浏览器 + 接线 Agent + 真实加载一个页面
```

`init` 是安全的，可重复运行，并报告哪些步骤已经完成。更细粒度的命令也都可以单独跑：

```bash
betterwright setup     # 为当前主机安装受管浏览器
betterwright update    # 刷新受管浏览器
betterwright doctor    # 列出已装/缺失以及如何修复
```

验证安装是否可用，最快的一行：

```bash
betterwright run -c "await page.goto('https://example.com'); return page.title()"
# {"ok": true, "result": "Example Domain", ...}
```

## 四、使用方法与实战

### 4.1 集成模式：让你的 Agent 操控浏览器

任何能跑 shell 命令的 Agent 都能驱动它。`init` 会自动探测你机器上的 Agent 宿主并接好：

```bash
betterwright init
# 或者手动逐个宿主安装：
betterwright skill --install       # ~/.claude/skills + ~/.agents/skills
betterwright skill --install --all # 还装上 ~/.cursor/skills
betterwright skill --status        # 检查是否到位、是否最新
```

或者以 MCP 方式接入（stdio server，提供 `browser` / `browser_login` / `browser_download` / `browser_handoff` / `browser_doctor` 工具）：

```bash
npm install -g betterwright @modelcontextprotocol/sdk
claude mcp add betterwright -- npx betterwright mcp
betterwright mcp --check
```

从你自己代码驱动也很直接：

```js
import { BetterWright } from "betterwright";

const bw = new BetterWright();
await bw.run("await page.goto('http://localhost:5173')", { session: "dev" });
const title = await bw.run("return page.title()", { session: "dev" });
console.log(title.result);
await bw.close();
```

`run()` 接收一个包含沙箱化全局变量的 Playwright 异步 JS 字符串，返回一个结果信封。

### 4.2 独立 Agent 模式：把任务整体丢出去

BetterWright 自带一个浏览器调优的 Agent 循环。接好模型，用自然语言给任务：

```bash
betterwright auth --login codex     # OAuth 登录，无需粘贴 API key
betterwright exec "find the top Hacker News story and give me its title and points" --model gpt-5.6-sol
```

循环会观察压缩快照、执行、验证、截图存证，最后打印**一个 JSON 对象**——答案、步骤、token 用量、证据路径。

把 `exec` 当作子 Agent 用是它最巧妙的设计：因为它是"一条 shell 命令进、一个 JSON 对象出"，所以一个**编码** Agent 可以把整段浏览器任务委派给它。一个 30 回合的结账流程，主 Agent 只花**一次工具调用**，而不是 30 页上下文。

### 4.3 模型选择：用真实 id，而非昵称

模型通过真实 id 选择，而不是适配器昵称。直接传你想要的模型 id（`gpt-5.6-sol`、`claude-opus-4-8`、`qwen3:8b` …）。BetterWright 会探测本机运行的 Ollama/vLLM、有 key 时的 OpenRouter，以及原生 Claude/Codex/Grok 路由；若恰好只有一个来源暴露该 id 就用它：

```bash
betterwright models                      # 查看可用模型
betterwright exec "check example.com" --model ollama/qwen3:8b
OPENROUTER_API_KEY=… betterwright exec "check example.com" --model anthropic/claude-sonnet-5
```

### 4.4 人介入：看、教、接手

每次运行都可以挂一个自托管的 [live view](docs/live-view.md)：实时展示浏览器，带聊天在回合间引导 Agent，以及 **handoff** 流程处理不该全自动完成的时刻——MFA、顽固验证码、重大点击。Agent 暂停，你接手，点 **Done**，它带着你的备注继续。

## 五、常见问题与解决方案

**Q：`init` 卡在下载浏览器？**
A：安装不会作为 npm 副作用下载浏览器，需要 `betterwright setup` 或 `init` 显式拉取受管 BetterChromium。GPU 缺失的 Linux 会用 SwiftShader 软件渲染器运行。

**Q：Agent 客户端看不到 MCP 工具？**
A：先跑 `betterwright mcp --check` 诊断；确认已用 `claude mcp add betterwright -- npx betterwright mcp` 注册，且 `@modelcontextprotocol/sdk` 已安装。

**Q：网络策略阻断了合法请求？**
A：网络策略对每次导航、子资源、WebSocket、原始 TCP 都做检查，且云元数据端点始终阻断（防 SSRF/DNS 重绑定）。若是误杀，需要检查策略配置（见 `docs/network-policy.md`），而非绕过。

**Q：Agent 生成的密码把自己锁在外面了？**
A：保险库只把登录填充给模型代码、绝不给明文密钥，所以提供了单独的人类专用门：`betterwright vault copy <id>`（复制到剪贴板）、`vault show <id> --reveal`（只打到终端，重定向会失败关闭）。这些命令在 owner-only API 上，浏览器 worker 和模型代码片段都够不到。

**Q：想换身份 / 并行多账号？**
A：`--session <name>` 是同一浏览器内的并行通道（共享 cookie jar，同一身份）；`--profile <name>` 是独立身份（自己的 cookie jar、自己的会话守护进程、自己的 `exec` 历史），两者可同时运行且都保持登录。

**Q：token 还是很高？**
A：打开快照的 Diff / 仅交互过滤；只读任务确保走单轮完成；把整段任务用 `betterwright exec` 委派成子 Agent，把浏览转录挡在主 Agent 上下文之外。

## 六、总结

BetterWright 真正有意思的地方，不是"又一个 Playwright 封装"，而是它把 **token 经济性**当成了浏览器自动化的第一性原则来设计：压缩快照、Diff、单轮完成、持久会话、子 Agent 委派，每一环都在帮 Agent 省上下文。再加上策略沙箱、AES-256-GCM 凭证保险库、网络策略、验证码助手和 live-view 接手机制，它把"让不可信的模型安全地开一个浏览器"这件原本很危险的事，框进了一套可审计的边界里。

如果你正在给自己的 Agent 接浏览器能力，又苦于上下文被 HTML 灌爆、登录态反复丢失、密钥满天飞，BetterWright 值得一试。它基于 MIT 协议开源，欢迎 fork、修改、集成与商用。

> 项目地址：[github.com/BetterWright/betterwright](https://github.com/BetterWright/betterwright)
