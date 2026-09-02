---
title: "TypeWords 深度解析：基于记忆曲线的开源英语打字练习工具"
date: 2026-09-03T03:04:00+08:00
description: "TypeWords 是一个开源的英语单词与文章打字练习工具，采用 Nuxt 4 + Vue 3 构建，内置 FSRS 记忆曲线算法、14 国语言 i18n 与本地 IndexedDB 存储。本文从架构、技术原理到本地运行，带你全面拆解这款 GitHub Trending 项目。"
author: "Cheman"
slug: typewords
draft: false
tags: [GitHub, 开源, 英语学习, Nuxt, 记忆曲线]
categories: [技术, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**TypeWords**，一个"边打字边记单词"的开源英语学习工具——它把记忆曲线算法、双语文章跟读和本地优先的存储设计揉进了一个干净的 Nuxt 应用里。

## 一、项目概述

TypeWords（在线地址 <https://typewords.cc>）的定位很清晰：**通过"键盘输入"这一动作本身来强化英语记忆**，而不是传统的"看—读—背"。它的核心主张是"Learn English, one keystroke at a time"（一次按键，记住一个单词）。

项目主要解决两个痛点：

- **单词记不牢**：单纯浏览单词表 retention 低。TypeWords 用"跟读 / 听写 / 自检 / 默写"四种练习模式强制 recall（提取记忆），并通过 FSRS 间隔重复算法安排复习。
- **文章读不进去**：内置经典教材（如新概念英语 NCE 1–4），支持一键翻译、双语对照、逐句跟读 + 听写，边打边听边记。

核心特性一览：

- **单词练习**：跟读、听写、自检、记忆拼写四种模式；智能模式按记忆曲线自动计算待学词，自由模式自定义计划。
- **文章背诵**：内置教材 + 自定义/导入文章，逐句输入 + 自动发音 + 双语对照。
- **错词本 / 熟词本 / 收藏夹**：打错的词自动进错词本，主动标记熟词后下次自动跳过。
- **高度可定制**：丰富的键盘音效、快捷键、设置项。
- **词库覆盖**：CET-4/6、GMAT、GRE、IELTS、SAT、TOEFL、专四/专八等内置词书。
- **干净无广告**：纯本地优先，无强制平台订阅。

## 二、技术原理

### 架构与核心技术栈

从 `package.json` 和 `nuxt.config.ts` 可以看清技术骨架：

- **Nuxt 4（Vue 3.5 + Pinia 3）**：SSR/预渲染 + 客户端交互混合。`routeRules` 中 `/words`、`/articles`、`/setting` 关闭 SSR（`ssr: false`），而 `/book/nce1~4` 启用 `prerender`，兼顾首屏与动态交互。
- **@nuxtjs/i18n（v10）**：一口气支持 14 种语言（en/zh/es/fr/de/ru/uk/ja/ko/th/vi/id/tw/pt），默认 `zh`、策略 `no_prefix`。
- **UnoCSS（Wind3 preset）**：原子化 CSS + 自定义主题色快捷方式（`bg-primary`、`color-main` 等）。
- **ts-fsrs（^5.2.3）**：Free Spaced Repetition Scheduler，记忆曲线算法的真正实现者。
- **idb-keyval（^6.2.2）**：基于 IndexedDB 的轻量 KV 存储——这就是"数据本地保存、换设备需手动备份"的技术基础。
- **@supabase/supabase-js**：用于可选的云端能力（如同步/备份）。
- **vue-virtual-scroller + vxe-table**：长列表虚拟滚动与表格（词书/词库渲染）。

### 记忆曲线：从依赖看算法选型

`compromise`（自然语言处理）、`ts-fsrs`（间隔重复）、`string-comparison`（字符串相似度，用于拼写纠错/模糊匹配）三者组合，构成了"智能练习"的引擎。FSRS 不再是老式 SM-2 的固定间隔，而是用机器学习式权重预测每张卡片的遗忘概率，从而动态安排复习时机——这正是 README 中"Smart mode 按记忆曲线自动计算待学词"的底层支撑。

### i18n 的工程化：用 Gulp + Excel 管理多语言

项目有一个很"工程化"的细节：用 `gulpfile.js` 把一份 Excel 翻译表自动拆成 14 个语言 JSON。

```js
// gulpfile.js 核心：Excel 多语言 → 多 locale JSON
const workbook = XLSX.read(file.contents);
const excelData = XLSX.utils.sheet_to_json(workbook.Sheets['Sheet1']);

LANGUAGES.forEach(lang => { translations[lang] = {}; });
excelData.forEach(row => {
  // 解析每行，按语言列填充对应翻译对象
  LANGUAGES.forEach(lang => {
    if (parsedRow[lang]) translations[lang][parsedRow.key] = parsedRow[lang];
  });
});
// 每种语言生成一个 Vinyl 文件推入流，最终写入 nuxt/i18n/locales
```

这个设计让译者只需维护一张 Excel，运行 `pnpm run i18n:write`（即 `gulp i18nWrite`）即可同步全部语言包，极大降低了多语言维护成本。

### 本地优先的数据流

`nuxt.config.ts` 里有一条注释性约束：`API_BASE` 默认 `http://localhost/`，且运行时配置 `public.apiBase` 指向本地。结合 `idb-keyval`，用户的学习进度、错词本、收藏全部落在浏览器 IndexedDB——**不依赖中心服务器也能完整使用**，只有"换设备"时才需要手动导出/备份。这是典型的 Local-first 架构取舍。

## 三、安装与快速开始

项目基于 Nuxt，需要 Node.js 环境。**注意官方明确提示：项目较大，必须用 git clone，GitHub 的 Download ZIP 无法正常工作。**

```bash
# 1. 安装 NodeJS（参考 nodejs.org 官方文档）

# 2. 浅克隆（只拉最新提交，避免体积过大）
git clone --depth 1 https://github.com/zyronon/TypeWords.git
cd TypeWords

# 3. 安装依赖（使用 pnpm）
pnpm install

# 4. 启动开发服务器
pnpm run dev
# 默认地址：http://localhost:5567

# 5. 生产构建（生成静态文件）
pnpm run generate
```

访问 `http://localhost:5567` 即可开始练习。开发服务器端口在 `nuxt.config.ts` 的 `devServer.port` 中配置为 `5567`。

## 四、使用方法与实战

### 基础用法：四档单词练习模式

- **跟读（Follow-along）**：看着单词 + 音标 + 例句，逐字输入，强化拼写与拼读对应。
- **听写（Dictation）**：只听发音，凭记忆输入，强制 recall。
- **自检（Self-test）**：隐藏释义，自己判断是否掌握。
- **记忆拼写（Spelling from memory）**：完全默写。

输入错误的词会自动落入**错词本**；主动标记为"已掌握"的词会在后续训练中自动跳过，实现个性化过滤。

### 进阶用法：文章背诵 + 双语对照

在 `/articles` 中加载内置教材或导入自己的文章：

- **逐句跟读 + 听写双模式**：一句话放完音后，在输入框逐句打字，系统自动发音校对。
- **一键翻译 + 双语对照**：借助内置的百度翻译代理（`nitro.devProxy['/baidu']` 指向 `api.fanyi.baidu.com`），导入外文文章可即时生成中文对照。
- **边听边写**：听写过程中后台播放音频，强化"听觉—拼写"联结。

### 实战示例：导入一篇外刊做精读

1. 把英文文章粘贴/导入到 Articles 模块；
2. 点击"一键翻译"生成双语对照；
3. 切到"听写模式"，逐句听音打字；
4. 过程中打错的词组会自动进错词本，训练后集中复习。

## 五、常见问题与解决方案

**Q1：GitHub 下载 ZIP 后运行报错 / 依赖异常？**
官方明确说明：项目较大，**Download ZIP 无法正常工作**，必须使用 `git clone --depth 1` 克隆。请改用浅克隆。

**Q2：本地数据换设备后丢失？**
项目为纯本地存储（IndexedDB），切换设备需**手动备份**当前浏览器数据再导入，官方未做自动云同步（Supabase 仅预留可选能力）。换机前记得导出。

**Q3：构建/类型检查慢或报错？**
`package.json` 中已刻意关闭类型检查以加快构建：

```json
"typescript": {
  "strict": false,
  "typeCheck": false
}
```

开发期若遇到类型报错但不影响运行，可暂时忽略；如需严格校验可自行开启 `typeCheck: true`。

**Q4：部署到子路径（非根域名）？**
`nuxt.config.ts` 通过环境变量 `NUXT_APP_BASE_URL` 支持自定义 baseURL，并用 `normalizeBaseURL` 做了首尾斜杠归一化，部署到子目录时设置该变量即可。

**Q5：首次运行 `pnpm install` 拉取依赖很慢？**
依赖较多（含 `xlsx`、`ali-oss`、`edgeone` 等），建议使用浅克隆 + 配置 pnpm 镜像源，网络环境差时可耐心等待或分步安装。

## 六、总结

TypeWords 是一个"小而美"的开源英语学习工具：它把**FSRS 记忆曲线**、**打字即记忆**的交互范式和**本地优先**的存储哲学结合得相当干净。技术上它用 Nuxt 4 + Vue 3 搭出可 SSR/预渲染的混合架构，用 Gulp + Excel 的工程化方案解决了 14 语言维护难题，并对中文用户做了默认 locale 与内置词库（四六级/考研/雅思等）的贴心适配。

如果你正在找一款无广告、可自托管、能真正"用起来"的背单词工具，或者想研究 Nuxt 4 的多语言 + 本地优先实践，TypeWords 都值得 Star 一波。项目仍处早期开发阶段，欢迎提 Issue 与 PR。

> 项目地址：<https://github.com/zyronon/TypeWords> ｜ 在线体验：<https://typewords.cc>
