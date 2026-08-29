---
title: "codex-chatgpt-web：将 ChatGPT Web 变身为 Codex 原生模型的本地桥梁"
date: 2026-08-30
description: "codex-chatgpt-web 是一个本地 Responses 桥接工具，通过嵌入式浏览器让用户在 Codex 的原生界面中直接调用 ChatGPT Web（包括 Pro 订阅）的模型，无需 API Key，真正实现零成本使用高级 AI 能力。"
author: "Cheman"
slug: codex-chatgpt-web
draft: false
categories: ["技术", "开源"]
tags: ["Codex", "ChatGPT", "MCP", "Playwright", "AI工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**codex-chatgpt-web**，它是一个本地 Responses 桥接工具，能让用户在 OpenAI Codex 原生界面中直接使用 ChatGPT Web（包括 Pro 订阅）的模型，无需任何 API Key，真正实现了"零成本调用最强模型"的体验。

## 一、项目概述

[codex-chatgpt-web](https://github.com/miuuyy/codex-chatgpt-web) 由开发者 [miuuyy](https://github.com/miuuyy) 创建，核心思路是：通过一个跨平台桌面启动器（macOS / Windows / Linux），在嵌入的私有浏览器中登录 ChatGPT 账号，然后以 Responses + SSE 的方式将 Codex 的任务请求转发到 ChatGPT Temporary Chat，再将流式响应（推理过程、工具调用、Markdown 内容）实时返回给 Codex。

简单来说，它让 **Codex 以为自己调用的是原生模型，但实际上背后跑的是 ChatGPT Web**，从而绕过了 API 限流和费用问题，同时保留了 Codex 原生的任务管理、上下文生命周期、文件系统访问和工具沙箱等完整能力。

### 核心功能亮点

- **原生模型体验**：ChatGPT Web 模型出现在 Codex 的模型选择器中，但任务 UI、上下文管理、流式输出和工具展示完全由 Codex 处理，体验与原生模型无异。
- **免费使用高级模型**：Free/Go 账号可使用 Luna，Plus 账号可使用 Instant~High，Pro 账号额外获得 Extra High 和 Pro，无需任何 API 消费。
- **Full Harness 模式（可选）**：通过 OpenAI 官方 `tunnel-client` 建立 MCP 连接，将 ChatGPT 的工具调用（如写文件、执行命令）反向路由回同一个 Codex 任务，获得完整的"AI 写代码+AI 执行+AI 反思"闭环。
- **跨平台桌面启动器**：macOS（arm64/x64）、Windows x64、Linux x64 全平台支持，内置浏览器、登录态和 MCP 引导，无需安装 Chrome/Node/Bun。
- **失败即停（Fail-closed）**：模型不可用、工具缺失或 UI 结构变化时直接报错，而不是静默降级或返回错误结果，保证结果可预期。

## 二、技术原理

### 2.1 整体架构

```
Codex 任务
    │
    │  Responses + SSE
    ▼
┌─────────────────────────┐
│   codex-chatgpt-web     │
│  （本地 Responses 桥接）  │
│   port: 17841 (默认)     │
└─────────┬───────────────┘
          │ 嵌入式私有浏览器
          ▼
    ChatGPT Temporary Chat
    (用户账号 · 云端推理)
```

关键点在于：**Codex 不知道自己连的是 ChatGPT 网页版**，它以为自己在调用一个标准的 Responses API 兼容模型。而 codex-chatgpt-web 做的事，就是把这个协议"翻译"成 ChatGPT Temporary Chat 的 HTTP 请求。

### 2.2 核心技术栈

从 `package.json` 可以看到项目使用的关键依赖：

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.30.0",
    "chromium-bidi": "12.1.0",
    "fflate": "^0.8.2",
    "playwright-core": "^1.62.0",
    "tiktoken": "1.0.22",
    "turndown": "7.2.0",
    "turndown-plugin-gfm": "1.0.2",
    "zod": "4.4.3"
  },
  "packageManager": "bun@1.4.0"
}
```

- **Playwright + chromium-bidi**：使用 CDP（Chrome DevTools Protocol）无头控制嵌入式 Chromium 浏览器，完成 ChatGPT 页面的自动化操作和 SSE 流式响应解析。
- **@modelcontextprotocol/sdk**：在 Full Harness 模式下，充当 MCP 客户端，将 ChatGPT 的工具调用通过 OpenAI tunnel-client 路由回 Codex。
- **tiktoken**：对对话内容进行 token 计数，用于估算上下文长度和 compaction 边界。
- **turndown**：将 ChatGPT 返回的 HTML 内容（主要是 Markdown 渲染后的页面）转换回纯 Markdown 流式输出。
- **zod**：对 ChatGPT 响应结构、配置文件等进行运行时类型校验。
- **Bun**：运行时选择 Bun 1.4.0，项目本身也用 Bun 打包和开发。

### 2.3 Responses 桥接实现

从源码结构来看，核心逻辑在 `src/` 目录下，通过 `cli.ts` 提供命令行接口。其中最关键的流程是：

**Browser-only 模式（无需 MCP）：**

1. 启动器在本地开启一个 HTTP 服务，模拟标准的 OpenAI Responses API 端点。
2. Codex 向该服务发送 `/v1/responses` 请求。
3. 启动器在嵌入的 ChatGPT 浏览器中新建一个 Temporary Chat，将 Codex 的 system prompt + user message 注入。
4. 监听 SSE 流式事件，提取 `content_blocks`（文本和思维过程），实时转发给 Codex。
5. 处理上下文 compaction：ChatGPT 有上下文长度限制，当接近边界时，启动器写入 checkpoint，让 Codex 决定何时开启新的对话轮次。

**Full Harness 模式（需要 MCP + OpenAI tunnel）：**

1. 在 ChatGPT 开发者模式下创建一个名为 `Codex Native2` 的 Tunnel MCP 连接器。
2. 启动器同时作为 MCP 客户端，通过 OpenAI tunnel 与该连接器建立双向通信。
3. ChatGPT 的每次 `tools_outputs` 或 `reasoning` 事件，通过 tunnel 回调给启动器，启动器再将工具调用转发给 Codex 的沙箱环境执行。
4. 执行结果（含 stdout、文件变更）以 tool output 形式发回 ChatGPT，继续推理循环。

关键源码示例（`src/cli.ts` 核心流程示意）：

```typescript
// 伪代码：Responses API 端点处理
async function handleResponseRequest(req: Request): Promise<Response> {
  const { model, input, tools } = await req.json();
  
  // 创建新的 Temporary Chat
  const chatId = await browser.createTemporaryChat();
  
  // 注入系统提示词和用户消息
  await browser.fillAndSend(chatId, buildSystemPrompt(input), input.messages);
  
  // 建立 SSE 流，实时推送 ChatGPT 响应
  const stream = new ReadableStream({
    async start(controller) {
      await browser.onSSEEvent(chatId, (event) => {
        const chunk = parseContentBlock(event);
        controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
      });
    }
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

### 2.4 安全模型

项目在 [docs/security-model.md](https://github.com/miuuyy/codex-chatgpt-web/blob/main/docs/security-model.md) 中有详细说明，几个关键设计：

- **浏览器隔离**：使用独立的 Electron 配置文件，ChatGPT 登录态不会与其他浏览器共享。
- **loopback 监听受限**：本地 HTTP 服务绑定在 `127.0.0.1`，同一机器上的其他进程可以访问（安全影响范围仅限于同一用户），但不暴露到公网。
- **Fail-closed 行为**：ChatGPT UI 结构变化时，解析器直接抛出异常，而不是返回错误数据，避免误导用户。

## 三、安装与快速开始

### 3.1 环境要求

- 操作系统：macOS 13+（Apple Silicon 或 Intel）、Windows x64、Linux x64
- 无需安装 Node.js、Python、Chrome 或 Chromium（启动器自带）
- 需要一个 ChatGPT 账号（Free/Plus/Pro 均可）

### 3.2 一键安装（推荐）

**macOS / Linux：**

```bash
curl -fsSL https://github.com/miuuyy/codex-chatgpt-web/releases/latest/download/install-launcher.sh | sh
```

**Windows PowerShell：**

```powershell
irm https://github.com/miuuyy/codex-chatgpt-web/releases/latest/download/install-launcher.ps1 | iex
```

安装后，终端会提示你启动应用并完成引导配置。

### 3.3 从源码运行（开发者模式）

```bash
git clone https://github.com/miuuyy/codex-chatgpt-web.git
cd codex-chatgpt-web
bun run app
```

需要提前安装 **Bun 1.4.0**。

### 3.4 初始配置三步走

1. **登录 ChatGPT**：在启动器的嵌入式浏览器中直接登录，登录态保存在启动器私有配置文件中，与系统浏览器完全隔离。
2. **运行浏览器冒烟测试**：确保嵌入式浏览器能正确渲染 ChatGPT 页面。
3. **安装模型并重启 Codex**：点击 "Install models"，重启 Codex 后，即可在模型选择器中看到 "ChatGPT Web — Luna/Instant/High/Pro" 等选项。

## 四、使用方法与实战

### 4.1 Browser-only 模式（最简体验）

完成引导配置后，直接在 Codex 中选择任意一个 "ChatGPT Web — …" 模型即可使用：

| 账号类型 | 可用模型 |
|---------|---------|
| Free / Go | ChatGPT Web — Luna |
| Plus | Luna, Instant, Medium, High |
| Pro | 以上全部 + Extra High, Pro |

这个模式下，你可以获得 ChatGPT 的推理能力和知识覆盖，但无法调用文件系统、终端等 Codex 原生工具。

### 4.2 Full Harness 模式（完整工具链）

需要额外配置 OpenAI tunnel：

1. 在启动器的 **MCP** 页面，点击创建 Tunnel，使用与 ChatGPT 账号相同的 OpenAI API key（创建 key 本身免费，不消耗积分）。
2. 复制 Tunnel ID 和 API key，粘贴后点击 "Connect harness"。
3. 在 ChatGPT 设置中开启 **Developer Mode**，创建一个新的 Tunnel 连接器，命名为 **`Codex Native2`**（名称必须完全一致），认证方式选 None，权限选 **Allow all actions**。
4. 运行 "Verify runtime" 验证连接是否成功。

完成后，Codex 的所有工具（文件系统、Shell、搜索、 MCP 工具/应用）都可以被 ChatGPT 调用，形成真正的 AI 自主编码闭环。

### 4.3 子代理兼容性

项目支持两种协议处理模式，通过 CLI 命令切换：

```bash
# 查看当前模式
codex-chatgpt-web subagents status

# 切换到兼容性模式（推荐用于跨后端场景）
codex-chatgpt-web subagents compatibility-v1

# 切换到原生模式（保留 Codex 自己的特性设置）
codex-chatgpt-web subagents native
```

### 4.4 诊断与排错

启动器内置诊断工具：

```bash
# 启动器内置诊断
codex-chatgpt-web doctor

# 设置调试截图（每个浏览器检查点都截图）
CODEX_CHATGPT_WEB_BROWSER_DIAGNOSTICS=1 codex-chatgpt-web serve
```

## 五、常见问题与解决方案

### Q1: 启动器安装后，浏览器冒烟测试失败？

这通常是因为 ChatGPT 页面结构发生了变化（UI 更新导致 CSS 选择器失效）。可以：
- 检查是否使用了最新版本的 codex-chatgpt-web（运行安装命令重新安装）
- 查看 [release validation 文档](https://github.com/miuuyy/codex-chatgpt-web/blob/main/docs/release-validation.md)，确认支持当前 ChatGPT UI 版本
- 启用 `CODEX_CHATGPT_WEB_BROWSER_DIAGNOSTICS=1` 获取截图排查

### Q2: Full Harness 模式下验证失败，提示找不到 `Codex Native2`？

确保：
- 连接器名称**完全一致**是 `Codex Native2`（注意空格和大小写）
- 不要复用旧的 `Codex Native` 连接器——ChatGPT 会按连接器身份缓存 MCP 合同
- 权限必须选择 **Allow all actions**，而非 "Allow low-risk actions"

### Q3: Pro 模型在选择器中看不到？

启动器会在设置阶段检测账号的 ChatGPT 控制项。如果账号不支持某个模型，它就不会出现在列表中。这是 ChatGPT 服务端限制，不是启动器 bug。

### Q4: 每次 Codex 重启后需要重新配置吗？

不需要。登录态、模型配置和 MCP 连接设置都保存在启动器的独立配置文件中，永久有效。只有升级启动器版本时，建议重新运行安装命令进行覆盖更新。

### Q5: Temporary Chat 是否安全？

Temporary Chat 是 ChatGPT 的隐私模式（不保存对话历史），但提示词仍然由 OpenAI 服务器处理，受账号设置和 [Temporary Chat 政策](https://help.openai.com/en/articles/8914046-temporary-chat-faq) 约束。用户需自行确保符合所在组织的合规要求。

## 六、总结

codex-chatgpt-web 是一个非常巧妙的"桥接"项目，它不破解、不逆向，而是巧妙利用了 OpenAI 自家的 Codex + ChatGPT 两套系统，通过标准化的 Responses API 和 MCP 协议将它们串联起来。对于没有 API 预算但又想用上 ChatGPT 高级模型的开发者来说，这是一个值得一试的方案——尤其是它的 Full Harness 模式，能让 AI 在"思考"过程中真正调用工具、修改文件，形成真正的自主编码闭环。

当然，作为非官方的浏览器自动化项目，它天然依赖于 ChatGPT 前端 UI 的稳定性，OpenAI 一次大的 UI 改版就可能导致兼容性问题。不过项目本身有 CI 测试覆盖，且采用了 fail-closed 策略，整体风险可控。

如果你对 AI 编程工具链有兴趣，推荐同时关注作者的另一款工具 [ChatGPT Persona Voice](https://github.com/miuuyy/ChatGPT-Persona-Voice)，可以在近实时地切换 ChatGPT/Codex 的语音角色，同样无需触碰账号请求，零封号风险。

**项目地址**：[miuuyy/codex-chatgpt-web](https://github.com/miuuyy/codex-chatgpt-web)
**Star History**：

[![Star History Chart](https://api.star-history.com/chart?repos=miuuyy/codex-chatgpt-web&type=date&theme=dark&legend=top-left)](https://star-history.com/#miuuyy/codex-chatgpt-web&Date)
