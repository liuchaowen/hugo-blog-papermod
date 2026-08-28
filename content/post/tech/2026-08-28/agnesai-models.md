---
title: "Agnes AI：面向多模态与 Agent 工作流的 OpenAI 兼容统一 API 网关"
date: 2026-08-28
description: "AgnesAI-Models 是前沿 AI 公司 Agnes AI 的官方网关与模型目录，通过统一的 OpenAI 兼容 API 为开发者提供文本、图像、视频与 Agent 工作流的多模态模型接入，并支持流式输出、工具调用与异步视频任务轮询。"
author: "Cheman"
slug: agnesai-models
draft: false
categories: [开源, AI工具]
tags: [AgnesAI, OpenAI兼容, 多模态, AI API, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AgnesAI-Models**，它是前沿 AI 公司 Agnes AI 的官方网关与模型目录（Repository of the official gateway and model catalog），通过统一的 OpenAI 兼容 API，为开发者提供文本、图像、视频与 Agent 工作流的多模态模型接入。

## 一、项目概述

Agnes AI 是一家专注全模态基础模型（full-modality foundation models）的前沿 AI 公司，自研覆盖文本、图像、视频与推理的模型体系。AgnesAI-Models 仓库本身并不训练模型，而是作为**官方接入网关与模型目录**，把旗下多模态模型以 OpenAI 兼容的方式对外暴露，让任意产品或平台都能低成本地“插上”高质量 AI 能力。

其核心特性可以归纳为四点：

- **全模态覆盖**：文本对话、视觉语言理解、文生图 / 图生图、文生视频 / 图生视频，统一在一个网关下。
- **OpenAI 兼容**：直接复用 OpenAI Python / Node SDK，仅需替换 `base_url` 与 `api_key`，存量代码改动极小。
- **Agent 友好**：强化代码、工具调用（tool calling）、多轮对话与推理能力，官方点名面向 OpenClaw、Hermes 等 Agent 工具链。
- **高性价比与高分精度**：模型在 PinchBench 等基准上排名靠前，主打“高质量、可扩展、易接入”。

## 二、技术原理

### 统一网关架构

Agnes AI 用一个统一 API Base URL 收敛所有模态请求：

```
https://apihub.agnes-ai.com/v1
```

不同模态映射到 OpenAI 体系下对应的标准端点，这与官方对“OpenAI-compatible”的设计目标一致——开发者无需为每种模态切换 SDK：

| 模型 | 类型 | 端点 | 亮点 |
| --- | --- | --- | --- |
| `agnes-2.5-flash` | 文本 / 视觉语言 | `/v1/chat/completions` | 升级版编码、Agent 工作流、工具调用、多轮对话、推理与图像理解 |
| `agnes-2.0-flash` | 文本 / 视觉语言 | `/v1/chat/completions` | 推理、编码、工具调用、流式、图像理解 |
| `agnes-image-2.0-flash` | 图像生成 / 编辑 | `/v1/images/generations` | 文生图、图生图，URL 或 Base64 输出 |
| `agnes-image-2.1-flash` | 图像生成 / 编辑 | `/v1/images/generations` | 高密度视觉生成、图像编辑、灵活尺寸 |
| `agnes-video-v2.0` | 视频生成 | `/v1/videos` | 文生视频、图生视频、多图视频、关键帧动画、异步任务 API |

### 上下文与能力边界

- `agnes-2.5-flash`：公开参考值为 `512K` 上下文、`65.5K` 最大输出，全量开放给有 Agnes API 访问权限的用户。
- `agnes-2.0-flash`：在 2026 年 6 月从临时 `1M` 上下文回滚后，当前为 `256K` 上下文、`64K` 最大输出参考上限。
- 思考模式（thinking mode）、流式、工具调用与视觉输入均在兼容的对话工作流上提供支持。

### 视频任务的异步轮询

视频生成是典型的“提交—轮询”异步流程。先 POST 创建任务拿到 `video_id`，再用 GET 查询最终结果：

```
GET https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>
```

官方特别提示：当前请用 `video_id` 进行轮询，除非遗留工作流显式要求，否则不要用 `task_id`。

## 三、安装与快速开始

由于接口完全 OpenAI 兼容，本地只需有 OpenAI 官方 SDK 即可，无需额外安装专用客户端。

```bash
pip install -r requirements.txt
export AGNES_API_KEY="your_api_key_here"
```

仓库 `requirements.txt` 仅依赖 `openai>=1.40.0` 与 `requests>=2.32.0`，非常轻量。

一个最小可运行的流式对话示例：

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_AGNES_API_KEY",
    base_url="https://apihub.agnes-ai.com/v1",
)

response = client.chat.completions.create(
    model="agnes-2.5-flash",
    messages=[
        {"role": "user", "content": "Write a short intro to Agnes AI."}
    ],
    stream=True,
)

for chunk in response:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="")
```

可以看到，唯一区别只是 `base_url` 与 `api_key`——存量 OpenAI 代码几乎零成本迁移。

## 四、使用方法与实战

### 文本对话（curl）

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [
      {
        "role": "user",
        "content": "Explain how to integrate an OpenAI-compatible API gateway."
      }
    ],
    "stream": true
  }'
```

### 图像生成（curl）

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "A luminous floating city above a misty canyon at sunrise, cinematic realism",
    "size": "1024x768"
  }'
```

### 视频生成（curl + 轮询）

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "A cinematic shot of a cat walking on the beach at sunset, soft ocean waves, warm golden lighting, realistic motion",
    "height": 768,
    "width": 1152,
    "num_frames": 121,
    "frame_rate": 24
  }'
```

视频生成是异步的：先创建任务，再用返回的 `video_id` 查询结果。

### 配额与访问档位（公开参考值）

速率限制随时可变，以下为公开参考值（截至 2026-06）：

| 用户档位 | 文本 RPM | 图像 RPM | 视频 RPM / 配额 |
| --- | --- | --- | --- |
| 免费 / 默认 | 20 | 按分辨率分别限流 | 1 |
| 企业版 | 40 | 更高分辨率限流 | 2 |
| Token Plan | 1,000 | 更高 1K/2K 图像限流 | 5；每日 500 秒 |

订阅配额方面，Starter / Plus / Pro 三档分别提供约 1.5k / 7.5k / 30k 每 5 小时请求量，视频均为每日 500 秒。生产环境请以官方文档或平台控制台为准。

## 五、常见问题与解决方案

根据仓库的集成说明与错误码文档，高频问题集中在以下几类：

**401 Unauthorized**
- 检查 API Key 是否正确、`Bearer` 令牌格式是否完整、账户状态与 `AGNES_API_KEY` 环境变量是否成功加载。

**400 Bad Request**
- 校验必填参数、请求体结构、图像 URL 是否可公网访问，以及 `response_format` 摆放位置是否正确。

**429 Too Many Requests**
- 降低并发，加入带退避（backoff）的重试，并核对当前档位的 RPM 上限；Token Plan 文本为 1,000 RPM，免费档仅 20 RPM。

**500 / 502 / 503 / 520**
- 使用指数退避重试，并尽量简化请求 payload。

**视频轮询拿不到结果**
- 必须用 `video_id` 而非 `task_id`（除非显式要求的历史工作流）；视频 API 为异步，需先建任务再轮询。

**安全提醒**
- 切勿把 API Key、`.env`、含密钥的截图或私有数据提交进代码仓库；本地开发统一使用环境变量。

## 六、总结

AgnesAI-Models 的价值不在于“又多了一个模型仓库”，而在于它把多模态能力收敛进一个 **OpenAI 兼容的统一网关**：开发者用熟悉的 SDK、熟悉的端点，就能在一个 `base_url` 下完成文本对话、图像生成与视频创作，并天然适配 Agent / 工具调用场景。对于想在产品中快速接入全模态 AI、又不愿被私有 SDK 绑死的技术团队，这是一个低成本、高兼容性的务实选择。

> 官方资源：国际站 https://agnes-ai.com/ ，中国站 https://agnes-ai.cn/ ，开发者文档 https://agnes-ai.com/doc/overview ，API 平台 https://platform.agnes-ai.com/ 。公开参考值（上下文、RPM、配额、定价）会随时间变化，生产环境请以官方文档或平台控制台为准。
