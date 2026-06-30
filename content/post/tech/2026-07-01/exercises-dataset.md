---
title: "Exercises Dataset：含 1,324 个健身练习的多语言结构化数据集与开发者脚手架"
date: 2026-07-01
description: "Exercises Dataset 提供 1,324 条健身练习结构化数据，覆盖 6 种语言指令，附带交互式浏览器与开发者脚手架（DB Schema、API 代码、LLM Prompt），适合健身应用后端快速搭建。"
author: "Cheman"
slug: exercises-dataset
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "数据集", "健身", "JSON", "开发者工具"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Exercises Dataset**，一个包含 1,324 条健身练习的结构化多语言数据集，还自带开发者脚手架，可以直接生成数据库 Schema、API 接口代码，甚至给 LLM 生成 Prompt 让你一键出后端。

## 一、项目概述

**Exercises Dataset**（[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)）是一个面向开发者的健身练习数据集 + 设置向导工具。它解决了健身类应用开发中最头疼的问题之一：**去哪里找结构化、准确、可机器读取的健身练习数据？**

项目核心亮点：

- **1,324 条健身练习**，每条包含名称、类别、部位、器械、目标肌群、协同肌群、分步指令
- **6 种语言指令**：英语、西班牙语、意大利语、土耳其语、俄语、中文
- **零服务端依赖**：`index.html` 可直接在浏览器打开，本地运行交互式练习浏览器
- **开发者脚手架** `setup.html`：自动生成 SQL、API 调用代码（支持 7 种语言），还能生成 LLM Prompt 让 AI 帮你写完整后端
- **清晰的数据归属声明**：数据源自 ExerciseDB v1，项目维护者添加了多语言翻译和开发者工具，媒体文件因版权问题未包含

## 二、技术原理

### 数据结构设计

每条练习的核心 Schema 设计非常实用，直接映射健身领域的领域模型：

```json
{
  "id": "0001",
  "name": "3/4 sit-up",
  "category": "waist",
  "body_part": "waist",
  "equipment": "body weight",
  "instructions": {
    "en": "Lie flat on your back...",
    "es": "...",
    "zh": "平躺，膝盖弯曲..."
  },
  "muscle_group": "hip flexors",
  "secondary_muscles": ["hip flexors", "lower back"],
  "target": "abs",
  "media_id": "2gPfomN",
  "image": null,
  "gif_url": null,
  "created_at": "2026-03-18T12:31:32.854798+00:00"
}
```

几个值得注意的设计决策：

1. **`instructions` 是多语言对象而非单一字符串** —— 直接支持国际化，前端无需额外处理
2. **`media_id` 保留原始引用，但 `image` / `gif_url` 设为 `null`** —— 明确的版权隔离设计，避免分发侵权内容
3. **`secondary_muscles` 是数组** —— 准确反映健身练习会涉及多个肌群的事实，方便做"相关练习推荐"

### 数据统计概览

| 维度 | 分布 |
|---|---|
| 总练习数 | 1,324 |
| 按部位 | 上臂 292 / 大腿 227 / 背部 203 / 腰部 169 / 胸部 163 |
| 按器械 | 自重 325 / 哑铃 294 / 拉力器 157 / 杠铃 154 |
| 自重练习占比 | ~25%，适合家庭健身场景 |

### 开发者脚手架架构

`setup.html` 是一个纯前端工具，核心能力分三层：

1. **数据库层**：根据用户选择的数据库类型（SQL Server / PostgreSQL / MySQL / SQLite），在浏览器端生成完整的 `CREATE TABLE` + 1,324 条 `INSERT` 语句的 `.sql` 文件
2. **API 集成层**：根据用户填写的 base URL，动态生成 7 种语言（JavaScript / Python / C# / Java / PHP / Go / cURL）的调用示例代码
3. **LLM 辅助层**：生成结构化 Prompt，指定框架（Express / FastAPI / ASP.NET Core / Spring Boot / Laravel / Gin）+ 数据库，让 ChatGPT / Claude / Gemini 直接生成可运行的完整 REST API

这个设计思路非常实用：**数据集 + 脚手架合一**，拿到数据后 5 分钟内就能跑起来一个可用的后端。

## 三、安装与快速开始

项目是纯静态的，无需安装任何依赖。

### 方式一：直接使用数据集

```bash
# 克隆仓库
git clone https://github.com/hasaneyldrm/exercises-dataset.git
cd exercises-dataset

# 数据集在 data/exercises.json
# 直接用 Python / Node.js 读取
```

Python 快速验证：

```python
import json

with open("data/exercises.json", "r", encoding="utf-8") as f:
    exercises = json.load(f)

print(f"共 {len(exercises)} 条练习")

# 筛选自重练习
bodyweight = [e for e in exercises if e["equipment"] == "body weight"]
print(f"自重练习: {len(bodyweight)} 条")

# 读取中文指令
print(exercises[0]["instructions"]["zh"])
```

### 方式二：打开交互式浏览器

直接用浏览器打开 `index.html`，无需任何服务器：

```bash
# macOS
open index.html

# 或者拖进浏览器窗口
```

功能：实时搜索 1,324 条练习、按部位/器械/目标肌群筛选、点击查看多语言分步指令。

### 方式三：用开发者脚手架生成后端

打开 `setup.html`，按顺序操作：
1. 选择数据库类型 → 生成并下载 `.sql` 文件
2. 输入你的 API base URL → 自动生成多语言调用代码
3. 选择框架 + 数据库 → 复制 LLM Prompt → 粘贴到 ChatGPT/Claude → 获得完整后端代码

## 四、使用方法与实战

### 场景 1：搭建健身 App 后端

最典型的用法。`setup.html` 生成 LLM Prompt 后，用 Claude 生成 FastAPI 后端：

```python
# 生成的 Prompt 示例（用户选择 FastAPI + PostgreSQL）
"""
Generate a complete FastAPI REST API for a fitness exercise database with:
- PostgreSQL as database
- Endpoints: GET /exercises, GET /exercises/{id}, 
  GET /exercises?category=chest&equipment=dumbbell
- Support multilingual instructions (en, es, it, tr, ru, zh)
- Response model with proper serialization
Include requirements.txt and main.py ready to run.
"""
```

### 场景 2：数据分析和可视化

用 Pandas 分析哪些肌群覆盖最全、哪些器械最常用，指导训练计划算法设计：

```python
import pandas as pd
import json

with open("data/exercises.json") as f:
    df = pd.DataFrame(json.load(f))

# 找出覆盖最全面的器械
print(df["equipment"].value_counts())

# 胸部练习中，哪些目标肌群最常见？
chest = df[df["category"] == "chest"]
print(chest["target"].value_counts())
```

### 场景 3：多语言健身应用

`instructions` 对象直接提供 6 种语言，前端根据用户语言偏好切换：

```javascript
function getInstruction(exercise, lang = "zh") {
  return exercise.instructions[lang] || exercise.instructions.en;
}
```

## 五、常见问题与解决方案

**Q：媒体文件（图片/GIF）在哪里？**
A：因存在多重版权主张，本项目不包含媒体文件。每条记录有 `media_id` 字段，可引用 ExerciseDB 的原始媒体（需自行确认使用权限）。

**Q：数据准确性如何？**
A：数据源自 ExerciseDB v1（AscendAPI），通过 Kaggle 分发。指令的多语言翻译由本项目维护者添加，建议在生产使用前进行专业审校。

**Q：如何贡献？**
A：可以通过 Issue 报告错误，或联系维护者。由于涉及多语言内容，贡献前建议先开 Issue 讨论。

**Q：能否用于商业项目？**
A：需同时遵守 ExerciseDB 的使用条款和本项目的数据归属声明。建议在商业使用前咨询法律意见或联系权利持有人。

## 六、总结

Exercises Dataset 的价值不在于"数据"本身（健身练习数据在很多地方能找到），而在于**把数据、国际化、开发者工具三件事打包在一起**。

对于想快速验证健身类 App 想法的开发者，这个项目可以帮你省掉至少 2-3 天的数据清洗和后端脚手架搭建时间。对于学 NLP 或推荐系统的人，这个带多语言标注的结构化数据集也是一个不错的练手素材。

唯一需要注意的是媒体文件的版权问题 —— 如果要做商业化产品，需要自行解决图片/动画的版权合规。

**项目地址**：https://github.com/hasaneyldrm/exercises-dataset
