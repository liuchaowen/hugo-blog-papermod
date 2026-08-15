---
title: "public-apis：开发者必备的免费公共 API 大全集"
date: 2026-08-16
description: "public-apis 是 GitHub 上星标极高的社区维护清单，按 50+ 分类汇总了上千个免费公共 API，并标注鉴权方式、HTTPS 与 CORS 支持。本文介绍其数据结构、检索方式，以及如何把它用进真实项目。"
author: "Cheman"
slug: public-apis
draft: false
categories: [开源项目, 开发工具]
tags: [GitHub, 开源, API, 开发资源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**public-apis**，一个由社区维护、收纳了 50 多个分类、上千个免费公共 API 的超级清单，几乎覆盖了开发者日常能想到的所有场景。它不只是一份「收藏夹」，更像是一本随时可查的「公共接口字典」。

## 一、项目概述

`public-apis/public-apis` 是目前 GitHub 上最知名的免费 API 聚合清单之一。它的目标非常纯粹：**把互联网上可用的、免费的、对开发者友好的 API 集中到一起，并给出一致的元数据描述**，让开发者在「想做个小项目但缺数据」时，能在一分钟之内找到合适的接口。

- **覆盖广泛**：从 Animals、Anime、Weather，到 Machine Learning、Cryptocurrency、Government 等，README 中的 Index 列出了 50 多个分类入口。
- **条目海量**：清单内仅带链接的 API 条目就超过 1700 个，且仍在通过社区 PR 持续增长。
- **统一元数据**：每个 API 都标注了「鉴权方式 / 是否 HTTPS / 是否支持 CORS」三项关键信息，方便快速判断能否直接在前端使用。
- **低门槛协作**：任何人都可以通过提 Pull Request 增补或修正条目，仓库靠社区自治维持更新。

对于一个想练手、做 Demo、写教程，或给原型快速接入真实数据的开发者来说，这份清单几乎是「开箱即用」的起点。

## 二、技术原理与数据结构

`public-apis` 本质上是一份**结构化的 Markdown 清单**，而非传统意义的「代码仓库」。它把数据组织成统一的表格，每个分类下都是一行一行的 API 记录：

```text
API | Description | Auth | HTTPS | CORS
|:---|:---|:---|:---|:---|
| [AdoptAPet](https://www.adoptapet.com/...) | Resource to help get pets adopted | apiKey | Yes | Yes |
| [Axolotl](https://theaxolotlapi.netlify.app/) | Collection of axolotl pictures and facts | No | Yes | No |
```

每行包含 5 个标准化字段，理解它们是用好这份清单的关键：

| 字段 | 含义 | 常见取值 |
|------|------|----------|
| **API** | 接口名称与官网链接 | — |
| **Description** | 一句话能力描述 | — |
| **Auth** | 鉴权方式 | `No`（免鉴权）、`apiKey`、`OAuth`、`X-Mashape-Key` |
| **HTTPS** | 是否支持加密传输 | `Yes` / `No` |
| **CORS** | 是否允许跨域（前端直连） | `Yes` / `No` |

这种「轻量、人类可读、机器可解析」的设计，带来了两个实际好处：

1. **对人不设门槛**：直接在 GitHub 网页上就能浏览、搜索、复制链接。
2. **对机器友好**：因为格式规整，社区衍生出了多种解析脚本，可以把这份 Markdown 离线转成 JSON，再接入自己的工具链或检索面板。

值得注意的是，清单顶部还会穿插赞助商/生态入口（如 APILayer Unified Suite），而主体始终由社区贡献的免费接口构成——使用时应优先挑选 `Auth: No` 且 `CORS: Yes` 的条目做前端实验。

## 三、安装与快速开始

作为一份「清单」，它不需要传统意义上的「安装依赖」，获取方式有三种：

```bash
# 方式一：直接克隆仓库到本地离线查阅
git clone https://github.com/public-apis/public-apis.git
cd public-apis
# README.md 即为完整清单，用编辑器或浏览器打开即可

# 方式二：在线浏览（最常用）
# 直接访问 https://github.com/public-apis/public-apis 阅读 README

# 方式三：仅拉取 README
curl -L https://raw.githubusercontent.com/public-apis/public-apis/master/README.md -o public-apis.md
```

确认需求后，最快的「快速开始」就是挑一个免鉴权的接口直接调用。例如，使用一个无需 Key、支持 HTTPS 的趣味接口来验证你的网络请求链路是否通畅。

## 四、使用方法与实战

下面用一个真实、可直接运行的例子，演示如何把清单里的 API 接入项目。

**场景**：你想在网页或脚本里展示一条随机的趣味数据，挑选清单中 `Auth: No` 的接口最省事。以「动物类」中的免鉴权接口为例，用 Python 发起一次请求：

```python
import requests

# 以清单中某个免鉴权、支持 HTTPS 的接口为例
resp = requests.get("https://theaxolotlapi.netlify.app/", timeout=10)
if resp.status_code == 200:
    data = resp.json()
    print("接口返回：", data)
else:
    print("请求失败，状态码：", resp.status_code)
```

**前端直连时的关键判断**：如果一个 API 的 `CORS: Yes` 且 `Auth: No`，你甚至可以在浏览器里直接 `fetch`，无需自建后端代理：

```javascript
// 仅适用于 CORS=Yes 且无需鉴权的接口
fetch("https://api.example.com/v1/resource")
  .then((r) => r.json())
  .then((data) => console.log(data))
  .catch((e) => console.error("跨域或网络错误：", e));
```

**进阶用法**：把整份清单解析成 JSON 后，可以做一个本地「API 搜索引擎」——按分类、按 `Auth=No`、按 `CORS=Yes` 做多维筛选，再生成自己的「今日可用接口」面板。这对做教学 Demo、黑客松原型尤其高效。

## 五、常见问题与解决方案

- **调用返回 429 / 限流**：多数免费 API 对匿名请求有速率限制。解决方案是注册获取 `apiKey` 并放入请求头，或在前端加一层自己的后端做缓存与限流转发。
- **浏览器报 CORS 错误**：清单里 `CORS: No` 的接口不允许前端直连。解决方式是加一个后端代理（如 Node/Python 转发），或优先选择 `CORS: Yes` 的条目。
- **链接失效 / 接口已下线**：社区清单靠 PR 维护，个别条目会过期。使用前先实际请求一次确认可用性，发现问题可以顺手提 PR 修正，反哺社区。
- **需要 OAuth 但不知道流程**：`Auth: OAuth` 的接口通常需要在其官网创建应用并走授权码流程，建议先从不需鉴权的接口入手，熟悉后再扩展。
- **想贡献自己的 API**：在对应分类表格下按既有格式追加一行，确保 `Auth/HTTPS/CORS` 信息准确，然后提交 Pull Request 即可。

## 六、总结

`public-apis` 的价值不在于「代码多复杂」，而在于**把分散、易过期、难检索的免费接口，整理成一份可信任、可搜索、可协作的单一事实源**。无论你是想快速验证一个产品想法、给学生设计练手作业，还是给原型接上真实数据，它都能帮你省下大量「找接口」的时间。把它放进你的开发书签，下次缺数据的时候，先来这里翻一翻。
