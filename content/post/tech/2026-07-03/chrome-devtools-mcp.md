---
title: "Chrome DevTools MCP：让 AI 编码助手直接操控 Chrome 浏览器"
date: 2026-07-03
description: "ChromeDevTools 推出的 chrome-devtools-mcp 是一个 MCP Server，允许 AI 编码助手（如 Claude、Cursor、Copilot）通过 Model Context Protocol 直接控制 Chrome 浏览器，实现可靠的浏览器自动化、深度调试和性能分析。"
author: "Cheman"
slug: chrome-devtools-mcp
draft: false
categories: [AI工具, 浏览器自动化, 开源项目]
tags: [MCP, Chrome, AI, 浏览器调试, GitHub Trending, Puppeteer]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ChromeDevTools/chrome-devtools-mcp**，它让 AI 编码助手能够直接控制真实的 Chrome 浏览器，实现自动化测试、性能分析和调试，是 AI + 浏览器自动化领域的重要基础设施。

## 一、项目概述

**chrome-devtools-mcp** 是由 Google Chrome DevTools 团队维护的开源项目，它实现了一个 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) Server，将 Chrome DevTools 的完整能力暴露给 AI 编码助手。

### 核心定位

传统浏览器自动化（如 Playwright、Selenium）需要人工编写脚本，而 chrome-devtools-mcp 让 AI Agent 自主完成以下任务：

- **可靠自动化**：通过 Puppeteer 驱动 Chrome，自动等待操作结果
- **性能洞察**：录制 Chrome Trace，提取可操作的性能优化建议
- **深度调试**：检查网络请求、截图、读取控制台消息（含 Source Map 堆栈追踪）
- **内存分析**：堆快照对比、内存泄漏检测

### 支持的 AI 客户端

项目提供了丰富的集成配置，支持几乎所有主流 AI 编码工具：

| 客户端 | 安装方式 |
|--------|---------|
| Claude Code | `claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest` |
| Cursor | 一键安装 Deeplink |
| VS Code / Copilot | 插件市场或 MCP 配置 |
| Gemini CLI | `gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest` |
| Antigravity | 自动连接 Agent 内置浏览器 |

## 二、技术原理

### 架构设计

```
┌─────────────────┐      MCP Protocol       ┌──────────────────┐
│  AI 编码助手     │ ◄────────────────────► │  chrome-devtools  │
│  (Claude/Cursor)│      stdio/HTTP         │  mcp Server      │
└─────────────────┘                          └────────┬─────────┘
                                                    │
                                          ┌─────────▼─────────┐
                                          │   Puppeteer       │
                                          │   (Chrome CDT)    │
                                          └─────────┬─────────┘
                                                    │
                                          ┌─────────▼─────────┐
                                          │   Chrome Browser  │
                                          │   (headless/UI)   │
                                          └───────────────────┘
```

### 核心技术栈

- **Runtime**：Node.js LTS，TypeScript 编译
- **浏览器自动化**：Puppeteer 25.x（内部统一使用 `puppeteer-core` 减少依赖体积）
- **协议**：Chrome DevTools Protocol (CDP)，通过 Puppeteer 封装
- **MCP SDK**：`@modelcontextprotocol/sdk` v1.29.0
- **性能工具**：集成 Lighthouse 13.x，支持 CrUX 真实用户数据
- **内存分析**：V8 堆快照解析，支持对比分析

### 工具系统设计

项目将 DevTools 能力拆解为 **50+ MCP Tools**，按功能分类：

```typescript
// 源码中工具定义的典型结构（src/tools/ 目录）
// 每个工具使用 Zod 进行参数校验
import { z } from 'zod';
import { defineTool } from '../tool-base.js';

export const clickTool = defineTool({
  name: 'click',
  description: 'Click an element on the page',
  schema: {
    pageId: z.string().optional(),
    selector: z.string().describe('CSS selector of element to click'),
    options: z.object({
      offsetX: z.number().optional(),
      offsetY: z.number().optional(),
    }).optional(),
  },
  handler: async (args) => {
    // 通过 Puppeteer 实现点击
  },
});
```

**工具分类统计**：

| 类别 | 工具数 | 典型工具 |
|------|--------|---------|
| 输入自动化 | 10 | `click`, `fill`, `type_text`, `drag`, `upload_file` |
| 导航自动化 | 6 | `navigate_page`, `new_page`, `list_pages` |
| 性能分析 | 3 | `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight` |
| 调试 | 8 | `take_screenshot`, `evaluate_script`, `lighthouse_audit` |
| 内存 | 10 | `take_heapsnapshot`, `compare_heapsnapshots`, `get_heapsnapshot_retainers` |
| 网络 | 2 | `list_network_requests`, `get_network_request` |

### 连接策略

项目支持三种 Chrome 连接方式，适应不同场景：

1. **自动启动**（默认）：MCP Server 启动时自动拉起 Chrome 实例，使用独立 user-data-dir
2. **连接已有 Chrome**（`--browser-url`）：连接到已手动启动的 Chrome（需开启远程调试端口），适合需要保持登录态的场景
3. **自动连接**（Chrome 144+，`--autoConnect`）：自动发现并连接本机运行的 Chrome 实例

```bash
# 方式一：让 MCP 自动启动 Chrome（最常用）
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}

# 方式二：连接已有 Chrome（适合需要登录态的场景）
# 先启动 Chrome：
# /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
#   --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-profile

{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
    }
  }
}
```

### Slim 模式

对于只需要基础浏览器功能的场景，可以使用 `--slim` 模式，仅暴露 3 个核心工具：

- `navigate_page`：页面导航
- `evaluate_script`：执行 JavaScript
- `take_screenshot`：截图

大幅减少 Token 消耗，适合资源受限的 AI 对话。

## 三、安装与快速开始

### 环境要求

- Node.js LTS（v20.19+ / v22.12+ / v23+）
- Google Chrome 当前稳定版或更新版本
- npm（随 Node.js 自带）

### 安装方式

**方式一：通过 npx 直接使用（推荐）**

```bash
# 不需要全局安装，npx 会自动下载并运行
npx -y chrome-devtools-mcp@latest
```

**方式二：作为项目依赖安装**

```bash
npm install chrome-devtools-mcp
# 或全局安装
npm install -g chrome-devtools-mcp
```

### 在 Claude Code 中配置

```bash
# 安装 MCP Server（用户级）
claude mcp add chrome-devtools --scope user -- npx chrome-devtools-mcp@latest

# 或安装为插件（包含 Skills，提供更多专家指导）
/plugin marketplace add ChromeDevTools/chrome-devtools-mcp
/plugin install chrome-devtools-mcp@chrome-devtools-plugins
```

### 第一个 Prompt

配置完成后，在 AI 客户端中输入：

```
Check the performance of https://developers.chrome.com
```

AI 会：
1. 自动启动 Chrome（如未运行）
2. 导航到目标页面
3. 录制性能 Trace
4. 返回性能分析报告（含 Lighthouse 分数、优化建议）

## 四、使用方法与实战

### 基础用法：UI 自动化测试

```
Help me test the login flow of https://example.com
```

AI 会通过以下工具链完成测试：
1. `navigate_page` → 打开页面
2. `fill` → 填写用户名和密码
3. `click` → 点击登录按钮
4. `wait_for` → 等待导航完成
5. `take_screenshot` → 截图确认结果

### 进阶用法：性能调试

```
The page at https://myapp.com/dashboard is loading slowly.
Can you record a performance trace and identify the bottleneck?
```

AI 会：
1. `performance_start_trace` 开始录制
2. 模拟用户操作（导航、滚动、点击）
3. `performance_stop_trace` 停止录制
4. `performance_analyze_insight` 分析 Trace，定位长任务、渲染阻塞等问题

### 实战：调试控制台错误

```
My app shows a blank page after deployment. 
The console has some errors. Can you check what's wrong?
```

AI 会：
1. 打开页面
2. `list_console_messages` 获取控制台消息
3. 读取 JavaScript 异常堆栈（自动 Source Map 解析）
4. `evaluate_script` 在页面上下文中进一步诊断
5. 返回根本原因分析

### 并发会话支持

当多个 AI Agent 同时工作时，可以使用 `--experimentalPageIdRouting` 避免页面冲突：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--experimentalPageIdRouting"]
    }
  }
}
```

每个 Agent 操作时会携带 `pageId` 参数，确保工具调用路由到正确的标签页。

### 无头模式（CI/CD 场景）

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--headless", "--isolated"]
    }
  }
}
```

- `--headless`：无 UI 运行，适合服务器环境
- `--isolated`：使用临时 user-data-dir，退出时自动清理

## 五、常见问题与解决方案

### 安装/启动问题

**Q: `npx chrome-devtools-mcp` 启动失败，提示 Chrome 未找到**
```
Error: Could not find Chrome (ver. 120.xxx). No download configured.
```

**解决方案**：
- 确保已安装 Google Chrome 稳定版
- 或使用 `--executablePath` 指定 Chrome 路径
- 检查 Puppeteer 的 Chrome 下载是否被网络阻断（国内用户可能需要配置代理）

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"],
      "env": {
        "PUPPETEER_SKIP_DOWNLOAD": "true",
        "PUPPETEER_EXECUTABLE_PATH": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      }
    }
  }
}
```

### 运行时错误

**Q: AI 调用工具时报 `Timeout: page crashed`**

**解决方案**：
- 增加超时时间（部分工具支持 `timeoutMs` 参数）
- 检查是否有浏览器扩展冲突，使用 `--isolated` 模式隔离
- 查看日志：`--logFile=/path/to/debug.log --env DEBUG=*`

**Q: 连接已有 Chrome 时提示 `ECONNREFUSED 127.0.0.1:9222`**

**解决方案**：
- 确认 Chrome 启动时添加了 `--remote-debugging-port=9222`
- 确认没有多个 Chrome 实例占用同一端口
- macOS 上关闭所有 Chrome 窗口后，确保进程也完全退出

### 性能问题

**Q: AI 回复很慢，Token 消耗大**

**解决方案**：
1. 使用 `--slim` 模式减少工具数量
2. 配置 `--screenshotFormat=webp --screenshotQuality=60` 减小截图体积
3. 使用 `--screenshotMaxWidth=1280 --screenshotMaxHeight=800` 限制截图尺寸
4. 使用 `--no-performance-crux` 禁用 CrUX API 调用

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y", "chrome-devtools-mcp@latest",
        "--slim",
        "--screenshotFormat=webp",
        "--screenshotQuality=60",
        "--screenshotMaxWidth=1280"
      ]
    }
  }
}
```

### 兼容性问题

**Q: 非 Google Chrome 浏览器（如 Edge、Brave）可以使用吗？**

**回答**：项目官方仅支持 Google Chrome 和 Chrome for Testing。基于 Chromium 的浏览器可能可以工作，但不保证，且遇到问题需要自行承担风险。

**Q: 可以在 WSL2 上使用吗？**

**回答**：可以，但需要额外配置 Chrome 的 Linux 版本，或使用 Windows 侧运行的 Chrome 并通过端口转发连接。

## 六、总结

**chrome-devtools-mcp** 将 Chrome DevTools 的专业调试能力转化为 AI 可调用的工具集，是 AI 编码助手走向"真自动化"的关键基础设施。

**核心价值**：
1. **降低自动化门槛**：AI 自主完成浏览器操作，无需人工编写测试脚本
2. **深度调试能力**：性能 Trace 分析、内存泄漏检测、网络请求检查一应俱全
3. **生态完善**：支持几乎所有主流 AI 编码工具，配置简单

**适用场景**：
- AI 驱动的 E2E 测试
- 性能分析与优化建议
- 自动化 Web 任务（表单填写、数据抓取）
- 浏览器兼容性问题诊断

随着 MCP 生态的成熟，类似 chrome-devtools-mcp 这样的专业工具 Server 将越来越多，AI 编码助手的能力边界也会持续扩展。对于需要浏览器自动化的开发团队，现在正是接入的好时机。

---

> **项目地址**：https://github.com/ChromeDevTools/chrome-devtools-mcp  
> **文档**：https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/main/docs  
> **MCP 协议**：https://modelcontextprotocol.io/
