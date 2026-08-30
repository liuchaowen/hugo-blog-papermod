---
title: "Address：基于 PostgreSQL 的自托管真实住宅地址生成器"
date: 2026-08-30
description: "Address 是一个自托管的真实住宅地址生成器，底层由 PostgreSQL 驱动，覆盖 27 个国家与地区的官方公开地址源。本文解析其架构、技术选型、数据同步机制与一键部署方式。"
author: "Cheman"
slug: address
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 地址生成, PostgreSQL, Node.js, 自托管]
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

今天在 GitHub Trending 上看到一个很有意思的项目：**Address**——一个基于 PostgreSQL 的自托管真实住宅地址生成器。它不靠随机拼装街道、门牌、邮编来"伪造"地址，而是从各国官方公开地址源里检索真实存在的住宅记录。

## 一、项目概述

地址生成器类产品并不少见，但大多数只是按照格式"概率拼凑"省市区、街道和门牌号，生成的字符串在地图上往往搜不到对应实体。Address 的核心卖点恰恰相反：**它发布的住宅基础地址全部来自官方开放数据、国家或地区地址登记册、地图登记建筑，以及带有明确住宅证据的开放地图记录**。

项目的关键特征包括：

- **真实住宅源**：覆盖美国、加拿大、墨西哥、英国、德国、法国、意大利、西班牙、荷兰、俄罗斯、中国、日本、韩国、新加坡、澳大利亚、巴西等 **27 个国家与地区**，并支持国家 / 行政区 / 城市 / 邮编维度的过滤。
- **严格过滤语义**：当某个过滤条件匹配不到任何记录时，直接返回错误，而不会静默切换到其他地区"凑数"。
- **数据库随机**：基于 PostgreSQL 在完整合格范围内快速随机取址，不会反复只读取前几行。
- **多语言展示**：支持源语言、英语、简体中文、繁体中文、日语、韩语、德语、法语、西班牙语、葡萄牙语展示路径，且地址语言与档案语言在浏览器中独立持久化。
- **收藏与管理**：浏览器端收藏夹支持大洲 / 国家分组、拖拽排序、复制、删除，并生成 Google Maps / 高德地图链接。
- **管理员能力**：公开覆盖监控、管理员仪表盘、地址数据规则、同步队列与历史、快速定位编辑器、服务凭证、访问控制、黑名单与 API Token。

> 一个设计上的诚实点：除中国室内字段（楼栋 / 单元 / 楼层 / 房间）会标注为 `synthetic` 合成外，其余地址组件均来自源数据，不随机编造。缺少必要字段、与行政区划冲突或缺少住宅证据的记录不会被发布。

## 二、技术原理

### 架构设计

从 README 的架构图可以看出，Address 采用前后端分离、计算下沉到数据库的设计：

```text
Astro 静态页面 + React UI
             │
             ▼
       Hono Node.js API
        ├─ PostgreSQL 地址与控制数据
        ├─ 从 PostgreSQL 重建的内存随机/过滤索引
        └─ 本地格式化、档案生成与可选翻译

同步监督器
        ├─ 可断点续传的批量 / API 适配器
        ├─ 国家特定的校验与住宅证据门控
        ├─ 事务化 PostgreSQL 发布
        └─ 覆盖统计与有界队列状态
```

这里有两个值得注意的设计决策：

1. **Astro 负责静态前端，Hono 负责 API**。Astro 默认输出纯静态页面，配合 React 集成只把交互组件 hydrate，首屏极轻；API 层用 Hono 跑在 Node.js 上（见 `package.json`：`@hono/node-server` + `hono`）。
2. **随机取址放在数据库侧**。把全量合格记录加载到内存并建立随机 / 过滤索引，查询时由 PostgreSQL 完成范围随机，避免应用层反复扫前几行导致分布偏斜。

### 核心技术栈与选型理由

从 `package.json` 与 `Dockerfile` 可以还原出实际依赖：

| 维度 | 选型 | 说明 |
|---|---|---|
| 运行时 | Node.js 24（bookworm） | `engines.node >= 24`，Docker 基础镜像 `node:24-bookworm` |
| API | Hono + `@hono/node-server` | 轻量、适配 Node 的 HTTP 服务 |
| 前端 | Astro 7 + React（`@astrojs/react`） | 静态优先 + 局部水合 |
| 数据库 | `pg`（node-postgres） | 唯一运行时数据库，连接池化 |
| 拖拽 | `@dnd-kit/core`、`@dnd-kit/sortable` | 收藏夹拖拽排序 |
| 地图 | `maplibre-gl` | 收藏夹的地图链接预览 |
| 中文 | `opencc-js`、`pinyin-pro` | 简繁转换与拼音 |
| 数据 | `@faker-js/faker` | 档案生成的占位内容 |

`astro.config.mjs` 揭示了本地开发时代理配置：

```js
vite: {
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/sync-control': {
        target: 'http://localhost:8791',
        rewrite: (path) => path.replace(/^\/sync-control/u, '') || '/'
      }
    }
  }
}
```

也就是说：Web 跑在 Astro dev server，业务 API 跑在 8787，同步控制面（监督器）跑在 8791，三者通过 Vite 代理聚合到同一来源，避免跨域。

### 关键算法 / 设计模式

**事务化发布（Transactional Publication）**：同步监督器把一批地址校验通过后，以事务方式写入 PostgreSQL 再"发布"，保证查询端看到的永远是完整、一致的数据集，而非半同步的中间态。

**住宅证据门控（Residential Evidence Gates）**：每个国家有各自的门控策略。例如美国要求 Overture Maps / OSM 分片中存在明确的住宅建筑标签；中国要求严格住宅分类、区匹配、数字门牌与机构黑名单；荷兰要求活动 BAG `woonfunctie`（住宅功能）。不通过门控的记录被丢弃。

**有界重试队列**：同步队列应用"有界重试 + 指数退避 + 冷却 / 配额重置 + 可续传检查点 + 无进展闩锁（no-progress latching）+ 多次失败后挂起"。它**不能对同一个无进展的源无限跑下去**，源被证明耗尽后保留为"可见但不完整"并移出活跃工作，直到源 / 版本指纹变化。

### 数据流分析

```text
官方源（OSM / Overture / 各国登记册）
   │  同步适配器（可续传、限流、凭证轮换）
   ▼
校验 + 住宅证据门控
   │  事务化写入
   ▼
PostgreSQL 地址表 + 控制数据
   │  重建内存随机/过滤索引
   ▼
Hono API（随机取址 / 批量 / 搜索 / 监控）
   │
   ▼
Astro + React 前端（生成器 / 收藏夹 / 管理员控制台）
```

## 三、安装与快速开始

### 环境要求

- Docker 与 Docker Compose（最简部署方式）
- 或：Node.js >= 24 + PostgreSQL（自建部署，详见 `docs/DEPLOYMENT.md`）

### 一键部署

README 给出的最简路径就是 docker compose：

```bash
mkdir address && cd address
curl -fsSLo docker-compose.yml https://raw.githubusercontent.com/daimon3332/address/main/docker-compose.yml
docker compose up -d
```

启动后：

- 初始管理员密码为 `admin`，前端密码默认关闭；
- **务必在首次启动前于 `docker-compose.yml` 中修改初始管理员密码**，登录后控制台会强制要求替换默认管理员密码。

### 本地开发

如果你要改代码，开发脚本在 `package.json` 里很完整：

```bash
npm ci            # 安装依赖
npm run dev       # 构建并启动 dev:api（含 Astro dev + tsx watch API）
npm run build     # astro build
npm run check     # astro check + tsc 类型检查
npm run test      # vitest 运行测试
```

数据侧脚本则覆盖了地区目录、地址池 ETL、覆盖统计、审计等，例如：

```bash
npm run data:address-pool:bootstrap   # 初始化地址池（--initial --all）
npm run data:address-pool:sync        # 增量同步地址池
npm run data:coverage                 # 刷新住宅覆盖统计
```

## 四、使用方法与实战

### 基础用法：生成地址

以美国为例，前端生成器会随机返回一条真实存在的住宅地址（门牌、街道、城市、州、ZIP、坐标均来自源数据，无合成字段），并可一键复制、收藏、跳转到 Google Maps / 高德。

### JSON API

项目暴露了 health、readiness、countries、availability、location options、search、地址 / 档案生成、批量生成、监控等 JSON API，并附带 Python、cURL、JavaScript 示例。典型调用形态（Bearer 鉴权）类似：

```bash
curl -H "Authorization: Bearer $TOKEN" \
     "https://your-host/api/v1/address?country=US&state=CA"
```

批量生成与监控端点则适合做测试数据工厂、演示数据填充等场景。

### 管理员实战

管理员控制台可配置：前端 / 管理员密码、API Token、服务凭证与配额、快速定位、黑名单、同步队列。多个凭证独立轮换——某个 Key 冷却时自动尝试下一个可用 Key，全部不可用时等待最早的重置点。中国源因为体量大且持续合格，会被自动赋予最高同步优先级。

## 五、常见问题与解决方案

**Q1：部署后访问提示管理员密码错误或前端密码被禁用？**
默认管理员密码是 `admin`，前端密码默认关闭。若你已在 `docker-compose.yml` 修改过初始值，请使用修改后的值；首次登录控制台会强制要求替换默认管理员密码。

**Q2：选择了某个过滤条件却报错而不是返回地址？**
这是预期行为（严格过滤语义）。当匹配池为空时，Address 直接返回错误，不会静默切到其它地区。检查国家 / 行政区 / 城市 / 邮编组合是否在已同步范围内，或用公开覆盖监控确认该区域是否已同步完成。

**Q3：某个国家地址很少或不完整？**
同步监督器要求"总数 + 最低行政层级覆盖 + 各节点最小值 + 显式覆盖"全部通过才标记国家完成。只达到总数不会算完成；源被证明耗尽则保留为不完整并移出活跃工作，直到源指纹变化。可到同步队列查看运行历史与增长。

**Q4：API 限流或同步卡住？**
队列内置指数退避、配额冷却与无进展闩锁。若某个源长时间无进展会被挂起，不会无限占用资源；配置多个服务凭证可让 Key 之间独立轮换。

**Q5：需要 PostgreSQL 以外的数据库吗？**
不需要，也不需要。Address 是 **PostgreSQL-only** 运行时，依赖池化连接、事务化发布、索引化位置搜索与预建的随机地址索引。

## 六、总结

Address 把一个"看似简单"的需求做得很扎实：用官方真实住宅源替代随机拼装，用 PostgreSQL 事务化发布保证一致性，用有界重试队列保证同步健壮性，再用 Astro + Hono 把前后端做得轻量。对需要"看起来真实、在地图上可定位"的测试 / 演示地址、或想自托管地址服务的团队来说，它是一个值得收藏的开源项目。

如果你更关心数据真实性而非数量，这个项目对"住宅证据门控"和"按国别源策略"的设计思路，也值得在其它数据类项目中借鉴。
