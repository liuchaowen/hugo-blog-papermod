---
title: "Awesome Zhuiju Free：一份每日自动检测可用性的免费追剧资源索引"
date: 2026-07-21
description: "Awesome Zhuiju Free 是一个人工精选、社区共建的免费无广告追剧资源索引，覆盖在线影视、网盘搜索、磁力 BT、TVBox 配置、直播源与开源工具，并通过 GitHub Actions 每日自动检测资源可用性，公开评分与风险提示。"
author: "Cheman"
slug: awesome-zhuiju-free
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "追剧", "资源索引", "GitHub Actions", "Awesome"]
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

今天在 GitHub Trending（daily）上看到一个很"接地气"的项目：**Awesome Zhuiju Free**——一份人工精选、完全开源、并且用 GitHub Actions 每天给资源做"体检"的免费追剧资源索引。它藏着一个值得技术人借鉴的自动化维护思路。

## 一、项目概述

**Awesome Zhuiju Free** 是一个由社区共建的「追剧资源索引」，由 `laoma2053` 维护，采用 CC BY 4.0 协议完全开源。它不托管任何影视文件，只做一件事：**把免费、无广告的追剧入口整理成结构化、可验证、可纠错的一张表**。

目前收录范围覆盖 8 大类、共 81 个资源：

- 🎬 **在线影视**：30 个国内外影视站点（含 4K 高清、无广告、需梯子等多种形态）
- 📱 **影视 APP**：3 个跨平台追剧客户端（SeleneTV / Kazumi / Animeko）
- 📦 **网盘资源搜索**：4 个夸克 / 多网盘聚合搜索站
- 🧲 **磁力 & BT**：11 个磁力、BT 种子下载与番剧分享站
- 🔤 **字幕资源**：3 个字幕下载平台
- 📡 **TVBox / 影视仓**：2 个空壳 + 15 条可直接导入的配置地址
- 📺 **直播源**：1 个社区维护的公开 IPTV 频道集合
- 🛠️ **开源项目**：12 个可自建 / 二次开发的影视工具

它的核心特性可以概括为三点：**人工精选**（而非爬虫堆量）、**每日自动检测可用性**（而非"收录即不管"）、**完全开源 + 社区共建**（数据公开、Issue 直接提交）。

## 二、技术原理

### 2.1 一切皆数据：资源与展示分离

这个项目最值得学习的设计，是**把"数据"和"展示"彻底分离**。所有资源的主数据都存放在结构化文件 `resources/resources.json` 中，而你在 README 里看到的那一长串表格、状态徽章、资源计数，全都是脚本根据这份 JSON 自动渲染出来的视图。

README 里能看到大量渲染标记，例如资源计数徽章：

```markdown
<!-- resource-count:start -->
<a href="resources/resources.json"><img src="..." alt="已收录 81 个资源"></a>
<!-- resource-count:end -->
```

以及每个资源的状态占位符（由 CI 在检测后回填）：

```markdown
<!-- availability:aikanbot -->🟢 可访问<!-- /availability:aikanbot -->
<!-- availability-date:aikanbot -->2026-07-20<!-- /availability:aikanbot -->
```

这意味着维护者改一处 JSON，文档就自动同步——避免了手工维护长表格最常见的"数据漂移"。

### 2.2 自动检测流水线（GitHub Actions）

项目用两条 GitHub Actions 工作流把"资源可用性"变成**可量化、可追溯**的信号：

- `check-availability.yml`：**每天北京时间 09:00** 左右自动运行，依次请求每个资源的主页，判断是否能访问，结果写入 `reports/availability.json`，并在 README 回填 🟢 可访问 / 🟡 访问受限 / 🔴 无法访问 / ⚪ 未检测 四种状态。新增或修改资源后也会触发。
- `validate-data.yml`：在**每次数据变更（PR）**时运行，对 `resources/resources.json` 做 schema 校验，从源头挡住脏数据。

> 注意：检测结果只判断主页是否响应，代表的是 GitHub Actions 节点的网络环境，不替代完整体验评价。

### 2.3 公开评分与风险标注

为了让用户"快速判断好不好用"，首页精选榜单用 1–5 颗 🌟 展示**推荐指数**，它由「**多、快、净、稳**」四项体验评分平均后四舍五入得到：

| 维度 | 你可以这样理解 |
| --- | --- |
| **多** | 资源数量、类型覆盖、更新及时性 |
| **快** | 页面打开、搜索响应、播放入口加载速度 |
| **净** | 广告、弹窗、跳转、诱导下载的多寡 |
| **稳** | 能否长期访问、域名与服务是否稳定 |

此外，风险被拆成**版权 / 安全 / 隐私 / 支付**四类，用 `低 / 中 / 高 / 未知` 单独标记。这种"评分 + 风险"双维度的透明设计，比单纯堆链接的导航站专业得多。

### 2.4 透明记录与纠错闭环

所有资源变更都保留验证与投诉记录，形成可审计的闭环：

- `resources/resources.json`：全部资源主数据
- `reports/verifications.json`：历史验证记录
- `reports/notices.json`：投诉与处理记录

项目原则里明确写了"如实描述，不因合作、广告或个人偏好修改评分""只做指引，不托管、不上传、不复制、不销售第三方内容"。

## 三、安装与快速开始

这个项目**不是一个可安装的软件**，而是一份"活"的资源索引，因此"上手"成本极低：

```bash
# 1. 先给仓库点个 Star 支持维护者
# https://github.com/laoma2053/awesome-zhuiju-free

# 2. 想看完整结构化数据，可以直接克隆
git clone https://github.com/laoma2053/awesome-zhuiju-free.git
cd awesome-zhuiju-free
# 全部资源在 resources/resources.json，检测记录在 reports/ 下
```

如果你只是想追剧，打开 README 的「精选资源」板块，按分类挑一个 🟢 状态、评分高的入口即可；想交流或获取更新，可以加入 Telegram 群组 `@zhuijume`。

## 四、使用方法与实战

### 4.1 按需求选入口

README 提供了一个很实用的"快速选择"表，帮你少走弯路：

| 需求 | 优先看 | 适合场景 |
| --- | --- | --- |
| 直接在线看 | 在线影视 | 临时追剧、确认片源 |
| 找追剧应用 | 影视 APP | 手机 / 电视端安装应用 |
| 找网盘分享 | 网盘资源搜索 | 保存到网盘或找合集 |
| 找磁力入口 | 磁力 & BT | 查磁力、BT 或相关资源站 |
| 找字幕 | 字幕资源 | 外语片、冷门片版本匹配 |
| 电视端播放 | TVBox / 影视仓 / 直播源 | 电视盒子、NAS、客厅播放 |
| 配置影视仓 | TVBox 配置地址 | 影视仓、TVBox 快速导入 |
| 找开源工具 | 开源项目 | 自建、部署或二次开发 |

### 4.2 给影视仓 / TVBox 导入配置

「TVBox / 影视仓配置地址」里提供了可直接复制的接口地址，例如：

```
饭太硬:    http://www.饭太硬.net/tv
小盒子4K:  http://xhztv.top/4k.json
老刘备:    https://raw.liucn.cc/box/m.json
小盒子多仓: http://xhztv.top/dc
```

在 TVBox / 影视仓类应用的"配置地址"里粘贴即可导入，省去自己找源的麻烦。

### 4.3 参与共建

发现好用资源、链接失效或评分不准，都欢迎参与维护，全部走 Issue 模板：

- 推荐新资源：[资源推荐模板](https://github.com/laoma2053/awesome-zhuiju-free/issues/new?template=resource.yml)
- 报告失效 / 风险：[问题报告模板](https://github.com/laoma2053/awesome-zhuiju-free/issues/new?template=broken-link.yml)
- 权利人请求移除：[权利人请求模板](https://github.com/laoma2053/awesome-zhuiju-free/issues/new?template=rights-holder-request.yml)
- 直接改数据：阅读 `CONTRIBUTING.md` 与 `resources/README.md`

## 五、常见问题与解决方案

### Q1：点开资源显示无法访问 / 访问受限？
检测状态由 GitHub Actions 节点的网络决定，且资源会随时失效、域名会更换。遇到 🔴 / 🟡 的资源，可优先选同分类下 🟢 的备用入口；若某资源长期失效，用上面的「问题报告模板」提交即可。

### Q2：页面广告多、有跳转怎么办？
看「净」评分与风险标注：评分越高越干净，README 也会在简介里注明"有广告能接受""需梯子"等。把广告、诱导下载多的站点降权使用是常态。

### Q3：想自己搭一套类似的"资源体检"？
直接参考仓库里的 `check-availability.yml`：核心就是定时请求目标 URL、解析响应、把结果写回 JSON 并回填 README 标记。把它换成你自己的资源清单就能复用。

### Q4：数据是人工维护的，会不会很慢？
项目用 Issue 模板 + 自动校验（`validate-data.yml`）+ 每日检测三道防线：社区通过 Issue 推荐，维护者确认后进入资源库；每次 PR 自动做 schema 校验；每天再用 Actions 复核可用性。兼顾了"快"和"准"。

## 六、总结

Awesome Zhuiju Free 表面看是一份追剧导航，内核却是一套**数据驱动 + 自动化检测 + 社区共建 + 透明记录**的索引工程范式。对想做"工具 / 资源索引"类项目的开发者来说，它的这几点是很值得借鉴的：

1. **数据与展示分离**：主数据用 JSON 管理，文档自动渲染，告别手工长表；
2. **可用性可量化**：用 GitHub Actions 把"还活着吗"变成每日自动刷新的状态；
3. **评分与风险双维度**：用 🌟 和版权 / 安全 / 隐私标注帮用户快速决策；
4. **可审计的纠错闭环**：验证记录、投诉记录全部留痕。

如果你也维护着某一类资源的清单，不妨把这套"让列表自己会呼吸"的思路搬过去。
