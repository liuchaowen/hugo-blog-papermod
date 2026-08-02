---
title: "k-skill：韩国生活全场景 AI 自动化技能包，让 Coding Agent 帮你搞定一切"
date: 2026-08-02
description: "一个覆盖韩国日常生活方方面面的 AI Agent 技能集合，包含 SRT/KTX 预订、地铁公交、房产、法律、金融等 100+ 实用技能，让 Claude Code、OpenClaw 等 Coding Agent 自动处理繁琐事务。"
author: "Cheman"
slug: k-skill
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI Agent", "韩国", "自动化", "Skill"]
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

今天在 GitHub Trending 上发现一个令人印象深刻的项目：**k-skill**，它为 Coding Agent 提供了 100 多个覆盖韩国生活各场景的技能，让 AI 自动帮你处理从火车预订到税务申报的各种繁琐事务。

## 一、项目概述

k-skill 是一个专为 AI Coding Agent 设计的技能集合包，目标是让韩国用户将日常生活中重复、繁琐的事务全部交给 AI Agent 处理。项目支持 Claude Code、OpenClaw/ClawHub、Codex、OpenCode 等主流 Coding Agent 框架。

**核心特性：**
- **100+ 实用技能**：覆盖交通出行、政务服务、金融法律、生活服务、娱乐消费等全场景
- **零客户端 API 层**：无需额外开发 HTTP 接口，直接通过 Agent 调用
- **统一安装管理**：一行命令安装全部技能或按需选择
- **代理服务器支持**：通过 k-skill-proxy 提供统一 API 网关

项目用一句话概括：**韩国人必备的 AI 生活助手技能包，总有一天你会用到它。**

## 二、技术原理

### 架构设计

k-skill 采用分层架构设计：

```
┌─────────────────────────────────────────┐
│         Coding Agent Layer              │
│  (Claude Code / OpenClaw / Codex)       │
├─────────────────────────────────────────┤
│         Skill Runtime                   │
│  (Node.js / Python scripts)             │
├─────────────────────────────────────────┤
│         API / Proxy Layer               │
│  (k-skill-proxy / Public APIs)          │
├─────────────────────────────────────────┤
│         External Services               │
│  (SRT/KTX/政府API/电商平台)              │
└─────────────────────────────────────────┘
```

### 核心技术栈

从 `package.json` 可以看出项目采用 **Monorepo + Workspaces** 架构：

```json
{
  "name": "k-skill",
  "engines": { "node": ">=18" },
  "workspaces": ["packages/*"]
}
```

关键依赖：
- **Node.js 18+**：运行时环境
- **Python 3**：部分数据处理脚本
- **Changesets**：版本管理与发布
- **TypeScript**：类型安全

### 技能分类体系

项目将技能按认证需求分为三类：

| 类型 | 说明 | 示例技能 |
|------|------|----------|
| **无需登录** | 公开 API 或公开网页数据 | 天气查询、地铁到站、垃圾分类 |
| **需要用户登录** | 用户自有凭证 | SRT/KTX 预订、银行查询、税务申报 |
| **可选认证** | 有则功能更全，无则 fallback | 쿠팡搜索、대한통운快递 |

### 数据流分析

以 SRT 预订技能为例：

```python
# srt_booking.py 核心流程
def srt_booking_flow():
    # 1. 读取用户凭证（环境变量/配置文件）
    credentials = load_srt_credentials()

    # 2. 构建请求参数
    params = {
        "departure": "서울",
        "arrival": "부산",
        "date": "2026-08-15",
        "time": "08:00"
    }

    # 3. 调用 SRT 官方 API 或代理服务器
    response = call_srt_api(params, credentials)

    # 4. 解析返回数据，Agent 呈现给用户
    trains = parse_train_list(response)
    return format_for_agent(trains)
```

## 三、安装与快速开始

### 环境要求

- **Node.js 18+**
- **npm / npx**
- **Python 3**（部分技能需要）

### 一键安装全部技能

```bash
# 安装全部 100+ 技能
npx --yes skills add NomaDamas/k-skill --all -g
```

### 选择性安装

```bash
# 只安装 SRT 预订技能
npx --yes skills add NomaDamas/k-skill --skill srt-booking -g

# 安装多个技能
npx --yes skills add NomaDamas/k-skill --skill srt-booking,ktx-booking,lotto-results -g
```

### Claude Code 插件安装

```bash
# 从 Claude Code Marketplace 安装
/plugin marketplace add NomaDamas/k-skill
/plugin install k-skill@k-skill
```

安装后技能以 `/k-skill:<技能名>` 命名空间调用，如 `/k-skill:lotto-results`。

## 四、使用方法与实战

### 场景一：火车票预订

```bash
# 在 Claude Code 中
> 帮我查一下明天上午首尔到釜山的 SRT 列车
> 预订 09:00 那班，靠窗座位
```

Agent 会自动调用 `srt-booking` 技能完成查询和预订。

### 场景二：企业信息尽调

```bash
# 综合使用多个技能
> 帮我查一下这家公司的背景：상호명, 사업자번호
```

Agent 会组合调用：
- `nts-business-registration`：国税厅登记信息
- `biz-health-check`：综合实调报告
- `nts-tax-delinquency`：欠税名单核查
- `g2b-sanctioned-supplier`：政府采购黑名单

### 场景三：生活服务查询

```bash
# 查询首尔实时拥挤度
> 明天去弘大玩，帮我看看实时人流量

# 查地铁到站时间
> 江南站 2号线 下班方向 还有几分钟到

# 查垃圾分类
> 이태원동 음식물 쓰레기 배출 요일?
```

### 场景四：金融法律

```bash
# 查询韩国银行基准利率
> 最近韩国央行利率走势怎么样？

# 搜索判例
> 帮我搜一下有关"전세 사기"的判例

# 查询专利
> 검색어: 삼성전자 특허
```

## 五、常见问题与解决方案

### Q1: 安装后技能无法调用？

**原因**：部分技能需要凭证（API Key 或登录信息）

**解决方案**：
```bash
# 运行配置向导
k-skill-setup

# 按提示配置凭证
# 凭证存储位置：~/.config/k-skill/secrets/
```

### Q2: SRT/KTX 预订失败？

**原因**：需要用户自有账号凭证

**解决方案**：
1. 访问 SRT/KTX 官网获取凭证
2. 配置环境变量：
```bash
export SRT_USERNAME="your_id"
export SRT_PASSWORD="your_password"
```

### Q3: 技能返回数据不准确？

**原因**：部分技能依赖公开网页爬取，网站结构可能变化

**解决方案**：
- 查看 `docs/features/<skill>.md` 了解数据来源
- 使用 `k-skill-proxy` 获得更稳定的数据

### Q4: 如何贡献新技能？

项目欢迎社区贡献，流程如下：
1. Fork 仓库
2. 参考 `CONTRIBUTING.md` 创建新技能目录
3. 提交 PR 到 `main` 分支
4. 通过 Changesets 管理版本

## 六、总结

k-skill 是一个非常实用的 AI Agent 技能集合，它将韩国日常生活中 100 多个常见场景封装成可被 Coding Agent 直接调用的技能。对于在韩国生活的开发者来说，这是一套"总有一天会用得到"的工具箱。

**亮点总结：**
- 覆盖场景广：交通、政务、金融、生活、娱乐全方位覆盖
- 安装简单：一条命令安装全部或按需选择
- 无缝集成：支持 Claude Code、OpenClaw 等主流框架
- 开源免费：MIT 许可证，可自由修改和贡献

如果你是韩国生活的开发者，强烈建议安装这个技能包。即使现在不需要，当某天你需要抢火车票、查企业信息、或处理税务时，它会成为你的得力助手。

---

**项目信息：**
- GitHub: https://github.com/NomaDamas/k-skill
- 许可证: MIT（核心）/ AGPL-3.0（代理服务器）
- Node.js 要求: ≥18
