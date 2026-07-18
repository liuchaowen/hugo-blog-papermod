---
title: "G0DM0D3：开源多模型AI聊天界面，突破后训练层的极限"
date: 2026-07-18
description: "G0DM0D3 是一个完全开源、隐私透明的多模型聊天界面，集成了 GODMODE CLASSIC 并行竞速模式和 ULTRAPLINIAN 多模型评估引擎，支持 60+ OpenRouter 模型和本地部署，专为红队测试、认知研究和 AI 交互探索而设计。"
author: "Cheman"
slug: g0dm0d3
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI", "大模型", "OpenRouter", "多模型", "G0DM0D3"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**G0DM0D3**，一个完全开源的多模型 AI 聊天界面，专为红队测试和认知研究设计，支持并行竞速模式和多模型评估引擎。

## 一、项目概述

G0DM0D3 是一个隐私透明的多模型聊天界面，旨在突破 AI 后训练层的限制。它支持 60+ OpenRouter 模型、Venice 模型以及本地部署模型，为黑客、哲学家和系统探索者提供了一个无拘束的 AI 交互平台。

### 核心特性

- **🧠 多模型支持**：60+ OpenRouter 模型、44 个 Venice 模型，或本地 Ollama/LM Studio/llama.cpp/vLLM 模型
- **🔥 GODMODE CLASSIC**：5 个经过实战验证的模型+提示词组合并行竞速，自动选择最优响应
- **🌋 ULTRAPLINIAN**：多模型评估引擎，支持 5 个层级（12-60 个模型），综合评分选出胜者
- **🐍 Parseltongue**：输入扰动引擎，包含 33 种变换技术，用于红队测试
- **🎛 AutoTune**：上下文自适应采样参数引擎，自动调整 temperature、top_p、top_k 等参数
- **🔐 隐私控制**：元数据遥测默认开启，支持 No-Log 和 Local-only 模式完全禁用
- **💾 本地历史**：对话和设置完全保存在浏览器存储中，支持导出/导入

## 二、技术原理

### 架构设计

G0DM0D3 采用单文件核心架构，整个托管界面就是一个 `index.html` 文件，无构建步骤：

```
G0DM0D3/
├── index.html          # 独立托管 UI、逻辑和样式
├── functions/api/      # Cloudflare Pages 遥测端点
├── src/                # 可选 React/Next.js 前端
├── api/                # 可选 Node.js/Express API 服务器
└── README.md
```

### 核心技术栈

- **前端**：单文件 Vanilla HTML/CSS/JS（`index.html`），无框架依赖
- **模型传输**：OpenRouter API、Venice API、OpenAI 兼容的本地端点
- **状态管理**：浏览器 localStorage
- **遥测**：可选的 Cloudflare Pages Function，批量发布到 Hugging Face

### GODMODE CLASSIC：并行竞速机制

GODMODE CLASSIC 是项目的经典模式，5 个模型+提示词组合并行竞争：

```typescript
// 来自 ChatInput.tsx 的核心逻辑
const messages = [
  ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
  ...((currentConversation?.messages || []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }))),
  { role: 'user' as const, content: userMessage }
]

// 并行调用多个模型
await streamUltraplinian({
  messages,
  openrouterApiKey: apiKey,
  apiBaseUrl: ultraplinianApiUrl,
  godmodeApiKey: ultraplinianApiKey,
  tier: ultraplinianTier,
  stm_modules: stmModules.filter(m => m.enabled).map(m => m.id),
  liquid: liquidResponseEnabled,
  liquid_min_delta: liquidMinDelta,
  signal: abortControllerRef.current.signal,
}, {
  onLeaderChange: (data) => {
    setUltraplinianLive(data.content, data.model, data.score)
    updateMessageContent(currentConversationId, assistantMsgId, data.content, {
      model: data.model,
    })
  },
  onComplete: (data) => {
    const finalContent = data.response || ''
    const winnerModel = data.winner?.model || 'ultraplinian'
    // 更新消息内容和获胜模型
  },
})
```

| 组合 | 模型 | 策略 |
|------|------|------|
| 🩷 CLAUDE SONNET 4.6 | `anthropic/claude-sonnet-4.6` | END/START 边界反转 + GODMODE 语义对立 |
| 💜 GROK 4.5 | `x-ai/grok-4.5` | 无过滤解放 + GODMODE 分隔符 |
| 💙 GEMINI 2.5 FLASH | `google/gemini-2.5-flash` | 拒绝反转 + 叛逆天才代码块 |
| 💛 GPT-4 CLASSIC | `openai/gpt-4o` | 原版 GODMODE l33t 格式 |
| 💚 GODMODE FAST | `nousresearch/hermes-4-405b` | 即时流式响应，零拒绝检查 |

### ULTRAPLINIAN：多模型评估引擎

ULTRAPLINIAN 是项目的新旗舰功能，支持从 12 到 60 个模型的竞速评估：

```typescript
// ULTRAPLINIAN 层级配置
const tiers = {
  FAST: 12,      // 轻量级速度优化模型
  STANDARD: 27,  // 中档主力模型
  SMART: 41,     // 强推理模型
  POWER: 53,     // 包含前沿模型的广泛竞速
  ULTRA: 60,     // 所有 OpenRouter 模型
}
```

系统根据 100 分综合指标对响应评分，自动返回得分最高的结果。

### Parseltongue：输入扰动引擎

Parseltongue 提供 33 种变换技术用于红队测试：

```typescript
// 来自 ChatInput.tsx
const parseltongueResult = applyParseltongue(originalMessage, parseltongueConfig)
const userMessage = parseltongueResult.transformedText

// 检测触发词
const triggers = detectTriggers(input.trim(), parseltongueConfig.customTriggers)
```

- **3 个强度层级**：light（11 种）、standard（22 种）、heavy（33 种）
- **变换技术**：Leetspeak、气泡文本、盲文、摩尔斯电码、Unicode 替换、语音变换等

### AutoTune：上下文自适应参数引擎

AutoTune 根据查询上下文自动调整采样参数：

```typescript
// 自动计算参数
const tuneResult = computeAutoTuneParams({
  strategy: autoTuneStrategy,
  message: userMessage,
  conversationHistory: history,
  overrides: autoTuneOverrides,
  learnedProfiles: feedbackState.learnedProfiles
})

// 应用到请求
await sendMessage({
  messages,
  model,
  apiKey,
  temperature: tuneResult.params.temperature,
  top_p: tuneResult.params.top_p,
  top_k: tuneResult.params.top_k,
  frequency_penalty: tuneResult.params.frequency_penalty,
  presence_penalty: tuneResult.params.presence_penalty,
  repetition_penalty: tuneResult.params.repetition_penalty,
})
```

系统将查询分类为 20 个上下文类型，自动选择最优参数组合。

## 三、安装与快速开始

### 环境要求

- 现代浏览器（Chrome/Edge/Firefox/Safari）
- 可选：OpenRouter API Key、Venice API Key 或本地模型服务器
- 可选：Node.js 20+（用于 API 服务器部署）

### 快速开始

**方式一：使用托管版本**

直接访问 [godmod3.ai](https://godmod3.ai)，无需安装。配置 OpenRouter key、Venice key 或本地 OpenAI 兼容服务器即可使用。

**方式二：本地运行**

```bash
# 克隆仓库
git clone https://github.com/elder-plinius/G0DM0D3.git
cd G0DM0D3

# 直接在浏览器中打开
open index.html

# 或使用本地服务器
python3 -m http.server 8000
```

### 配置本地模型

使用 Ollama 运行本地模型：

```bash
# 拉取模型
ollama pull qwen3:8b

# 启动服务
ollama serve
```

在 G0DM0D3 中配置：**Settings → API Keys → Local Models**，输入 `http://localhost:11434/v1`，点击 **Test & Discover Models**。

启用 **Local-only mode** 可完全排除 OpenRouter 和 Venice 调用，并自动禁用遥测。

## 四、使用方法与实战

### 基础用法：单模型聊天

1. 配置 API Key（OpenRouter 或 Venice）
2. 在设置中选择模型（如 `anthropic/claude-3-opus`）
3. 输入消息，获得响应

### 进阶用法：GODMODE CLASSIC 竞速

启用 GODMODE CLASSIC 后，系统会并行调用 5 个模型+提示词组合：

```typescript
// 用户消息
const originalMessage = "Explain quantum entanglement"

// 系统自动应用 5 种不同的越狱提示词策略
// 并行调用 5 个模型，返回最优响应
```

### 实战示例：ULTRAPLINIAN 多模型评估

ULTRAPLINIAN 支持动态实时响应，在竞速过程中显示当前领先者：

```typescript
// 监听竞速事件
{
  onLeaderChange: (data) => {
    // 实时更新 UI，显示当前领先的模型和得分
    console.log(`Leader: ${data.model} (${data.score}pts)`)
  },
  onComplete: (data) => {
    // 最终获胜者
    console.log(`Winner: ${data.winner.model} (${data.winner.score}pts)`)
  }
}
```

### 隐私控制

```bash
# No-Log 模式：禁用遥测，清空浏览器缓冲区
Settings → General → No-Log Mode

# Local-only 模式：仅使用本地模型，禁用所有外部调用
Settings → General → Local-only mode
```

## 五、常见问题与解决方案

### 问题 1：API Key 配置错误

**症状**：提示 "Failed to get response. Check your API key"

**解决方案**：
- 检查 API Key 是否正确配置（Settings → API Keys）
- 确认 API Key 未过期且有足够额度
- 使用代理模式时，确保 `ultraplinianApiUrl` 和 `ultraplinianApiKey` 正确

### 问题 2：本地模型无法连接

**症状**：Local Models 配置失败

**解决方案**：
```bash
# 确认 Ollama 服务运行中
curl http://localhost:11434/v1/models

# 如果使用托管站点，需配置 CORS
# 或使用完全本地部署（python3 -m http.server）
```

### 问题 3：遥测数据发送失败

**症状**：遥测端点返回错误

**解决方案**：
- 检查 Cloudflare Pages Function 部署状态
- 确认 `HF_TOKEN` 和 `HF_DATASET_REPO` 环境变量配置正确
- 参考 `functions/api/telemetry.ts` 中的配置说明

### 问题 4：对话历史丢失

**原因**：G0DM0D3 的历史完全保存在浏览器 `localStorage` 中

**解决方案**：
- 定期使用导出功能备份：Settings → Data → Export
- 避免在隐私/无痕模式下使用（关闭窗口后数据丢失）
- 切换浏览器或设备前，先导出再导入

### 问题 5：Docker 部署失败

**解决方案**：
```bash
# 正确设置环境变量
docker run -p 7860:7860 \
  -e OPENROUTER_API_KEY=sk-or-... \
  -e GODMODE_API_KEY=your-secret-key \
  -e HF_TOKEN=hf_... \
  -e HF_DATASET_REPO=username/dataset-name \
  g0dm0d3-api

# 健康检查
curl http://localhost:7860/v1/health
```

## 六、总结

G0DM0D3 是一个面向 AI 研究者和探索者的强大工具，其核心价值在于：

1. **多模型竞速**：GODMODE CLASSIC 和 ULTRAPLINIAN 提供了前所未有的多模型并行调用能力
2. **隐私透明**：完全开源，数据流文档化，支持 No-Log 和 Local-only 模式
3. **红队测试**：Parseltongue 引擎提供 33 种输入变换技术，用于模型鲁棒性研究
4. **本地优先**：支持完全离线运行，数据完全本地化
5. **零门槛**：单文件 HTML 架构，无需构建即可部署

对于想要探索 AI 模型边界、进行红队测试或研究认知科学的技术人员，G0DM0D3 提供了一个灵活、强大的实验平台。其单文件架构设计也让自托管和二次开发变得异常简单。
