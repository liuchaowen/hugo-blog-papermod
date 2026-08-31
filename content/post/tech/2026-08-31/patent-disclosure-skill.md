---
title: "专利点挖掘与交底书编写利器：patent-disclosure-skill"
date: 2026-08-31
description: "一个功能强大的 AI 技能，支持发明/实用新型/外观设计三种专利类型的交底书编写，以及公开专利的通俗解读与知识图谱构建，帮助研发人员高效完成专利申请全流程。"
author: "Cheman"
slug: patent-disclosure-skill
draft: false
categories: ["技术", "AI工具", "专利"]
tags: ["GitHub", "专利", "AI", "交底书", "Obsidian", "知识图谱"]
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

今天在 GitHub Trending 上看到一个很有价值的项目：**patent-disclosure-skill**，这是一个专为研发人员设计的专利交底书编写与专利解读 AI 技能，能让真正干活的人也能把技术贡献写进可交付的交底书里。

## 一、项目概述

**patent-disclosure-skill** 是一个基于 AgentSkills 标准的 AI 技能包，主要解决研发人员在专利申请过程中的两大痛点：

1. **专利交底书编写**：代码是自己敲的、方案是自己扛的，但交底书却卡在「专利点怎么挖、查新怎么写、框图和 Word 怎么一次交得出去」
2. **专利通俗解读**：公开专利权要绕、术语密、落地语境散落在说明书与附图里，阅读门槛高

项目支持 **发明**、**实用新型**、**外观设计** 三种专利类型，覆盖从项目材料扫描、专利点挖掘、查新检索、交底书成稿到迭代修改的完整流程。

### 核心特性

- **专利类型全覆盖**：发明/实用新型/外观设计分模板成文，实用与外观先填 Schema 再按 `figure_plan.yaml` 排序入文图
- **智能项目扫描**：按优先级读文档/代码，`.docx`/`.pptx` 先转 Markdown 再扫，可选扫描 STEP/CAD 模型
- **外观与结构线稿生成**：从产品图/结构图自动提炼造型轮廓与部件序号引出，支持 CAD 三维模型投影
- **国知局查新优先**：优先调用国知局中国专利公布公告系统，异常或无果时降级 WebSearch
- **Obsidian 知识图谱**：专利解读后自动入库 Obsidian，构建私有专利知识库，支持术语双链与关系图谱
- **审查答复辅助**：历史通知书与答复脱敏入库，标签过滤 + 向量相似度检索，起草意见陈述草稿

## 二、技术原理

### 架构设计

项目采用 **Python + Playwright** 技术栈，核心架构分为三大模块：

```
patent-disclosure-skill/
├── prompts/           # 交底书/解读/进化/审查答复的 Prompt 模板
│   ├── disclosure/    # 交底书流程（intake → patent_point → prior_art → builder）
│   ├── patent_reader/ # 专利解读流程
│   ├── evolution/     # 政策感知与技能自进化
│   └── oa/            # 审查答复辅助
├── tools/             # 工具脚本
│   ├── shared/        # 通用工具（md_to_docx、browser、cad-env 等）
│   ├── crawl/         # 国知局爬虫
│   ├── patent_reader/ # 专利解读工具
│   └── oa/            # 审查答复工具
└── examples/          # 示例案件与原材料
```

### 核心技术栈与选型理由

| 组件 | 用途 | 选型理由 |
|------|------|----------|
| **Python 3.9+** | 运行环境 | 兼容 CadQuery（STEP 解析需 3.10-3.12） |
| **Playwright** | 浏览器自动化 | 国知局爬虫 + Mermaid 渲染共享浏览器实例 |
| **python-docx** | Word 生成 | 交底书定稿输出 `.docx` 格式 |
| **latex2mathml** | 公式渲染 | LaTeX → MathML → OMML，Word 可编辑公式 |
| **Obsidian CLI** | 知识库管理 | 双链、图谱、Canvas 生态集成 |

### 关键算法/设计模式

#### 1. 专利点挖掘（Patent Point Extraction）

```yaml
# prompts/disclosure/invention/patent_point.md 流程示意
intake:
  - 扫描项目文档/代码
  - 提取技术特征
  - 构建候选专利点列表

filter:
  - 按类型筛选（发明/实用/外观）
  - 新颖性评估
  - 实用性判断

output:
  - patent_points.yaml  # 结构化专利点
  - figure_plan.yaml    # 附图规划
```

#### 2. 查新检索策略

```python
# tools/crawl/cnipa_epub_search.py 核心逻辑
def search_cnipa(keyword: str, patent_type: str = "invention"):
    """
    优先调用国知局 epub.cnipa.gov.cn
    异常或无果时降级 WebSearch
    """
    try:
        results = crawl_cnipa(keyword, patent_type)
        if results:
            return results
    except Exception:
        pass
    
    # 降级 WebSearch
    return web_search(keyword)
```

#### 3. 交底书迭代更新

采用 **时间戳命名 + 对话记录** 模式：

```
outputs/
├── 案件名_20260831090000.md     # 初稿
├── 案件名_20260831150000.md     # 迭代稿
└── 交底书修订对话记录.md         # 修改追溯
```

### 数据流分析

```
项目材料 → 项目扫描 → 专利点挖掘 → 查新检索 → 脱敏 → 交底书成稿
                                              ↓
                                          迭代更新
                                              ↓
                                        输出 .md + .docx
```

## 三、安装与快速开始

### 环境要求

- Python 3.9+（推荐 3.10-3.12 以支持 STEP 解析）
- Playwright 浏览器驱动
- （可选）Obsidian 用于专利解读知识库

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/handsomestWei/patent-disclosure-skill.git
cd patent-disclosure-skill

# 安装依赖
pip install -r requirements.txt

# 安装 Playwright 浏览器（如果系统没有 Chrome/Edge）
python -m playwright install chromium

# （可选）验证环境
python tools/shared/browser.py --probe
```

### 最简运行示例

**发明交底书**：
```bash
# 提供项目路径或技术主题
# 在 Agent 中输入：
"按发明写交底，项目路径 /path/to/your/project"
```

**专利解读**：
```bash
# 提供公开号或 PDF 路径
"读专利 CN123456789A"
# 或
"读专利 /path/to/patent.pdf"
```

## 四、使用方法与实战

### 基础用法

#### 1. 发明专利交底书

```bash
# 项目结构示例
my_project/
├── docs/
│   ├── design.md
│   └── api.md
├── src/
│   └── core.py
└── README.md

# 在 Agent 中输入
"按发明写交底，项目路径 my_project/"
```

AI 会自动：
1. 扫描 `docs/`、`src/`、`README.md`
2. 提取技术特征与专利点
3. 国知局查新检索
4. 生成 mermaid 框图
5. 输出交底书 `.md` + `.docx`

#### 2. 实用新型交底书

```bash
# 适用场景：形状、构造、连接与装配
"实用新型交底，材料在 /path/to/structure_project/"
```

AI 会：
1. 按 `structure_schema.parts` 填写结构信息
2. 生成结构线稿 SVG
3. 按 `figure_plan.yaml` 嵌入附图

#### 3. 外观设计交底书

```bash
# 适用场景：外形、图案、色彩或其结合
"外观设计交底，材料在 /path/to/design_project/"
```

AI 会：
1. 从产品图自动生成外观线稿
2. 按 `design_lineart_assist.md` 流程处理
3. 输出六面视图 + 设计说明

### 进阶用法

#### 1. Obsidian 专利知识库

```bash
# 设置环境变量
export PATENT_READER_OBSIDIAN_VAULT="/path/to/your/vault"

# 解读专利并入库
"读专利 CN123456789A，入库 Obsidian"
```

AI 会自动：
- 生成 `专利解读笔记.md`
- 创建 `*_图谱.canvas` 知识图谱
- 配置 CSS 与 Bases
- 构建术语双链网络

#### 2. 审查答复辅助

```bash
# 准备历史通知书与待答复通知书
cases/
├── case_001/
│   ├── oa_notice_1.pdf
│   └── oa_response_1.pdf
└── pending/
    └── oa_notice_pending.pdf

# 在 Agent 中输入
"审查答复：先入库 cases/，再用 pending/oa_notice_pending.pdf 出草稿"
```

#### 3. 技能自进化

```bash
# 联网检索国知局近期政策与审查动向
"技能进化：近 12 个月国知局动向，整理观点↔链接"
```

AI 会：
1. 联网检索政策动态
2. 整理观点与原文链接
3. 输出到 `outputs/evolution/EVOL-*.md`

### 实际项目示例

项目提供了丰富的示例案件：

| 示例 | 类型 | 材料路径 |
|------|------|----------|
| 批任务调度 | 发明交底 | `examples/example_batch_job_scheduler/` |
| 汽车集成式电驱桥 | 实用新型交底 | `examples/example_utility_model_ev_powertrain/` |
| 折臂台灯 | 外观设计交底 | `examples/example_design_desk_lamp/` |
| 公开专利 PDF | 通俗解读 | `examples/example_patent_reader/` |
| 审查答复样例 | 审查答复 | `examples/example_oa_response/` |

## 五、常见问题与解决方案

### 安装失败

**问题**：`pip install -r requirements.txt` 失败
```bash
# 解决方案：使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**问题**：Playwright 浏览器安装失败
```bash
# 解决方案：手动安装
python -m playwright install chromium --mirror https://npmmirror.com/mirrors/playwright/
```

### 运行时错误

**问题**：国知局爬虫返回空结果
```bash
# 解决方案：检查网络与代理
python tools/shared/browser.py --probe

# 或降级使用 WebSearch
# AI 会自动降级，无需手动干预
```

**问题**：Word 公式渲染失败
```bash
# 解决方案：检查 latex2mathml 版本
pip install latex2mathml>=3.77.0

# 或启用 matplotlib 渲染（需手动安装）
pip install matplotlib
python tools/shared/md_to_docx.py -i a.md -o a.docx --math-render
```

### 性能问题

**问题**：STEP 文件解析慢
```bash
# 解决方案：启用 CAD 虚拟环境
python tools/shared/cad_venv.py
python tools/shared/run_step_to_views.py --enable-step-parse -i model.step -o outputs/cad_views
```

**问题**：专利解读知识库卡顿
```bash
# 解决方案：优化 Obsidian 配置
# 减少实时预览、关闭不必要的插件
# 或使用独立 Vault 专门存放专利解读
```

### 兼容性

**问题**：Obsidian 版本兼容性
```bash
# 推荐版本：Obsidian 1.0+
# 必需社区插件：
# - Canvas（内置）
# - Dataview（可选）
# - Bases（可选）
```

**问题**：Python 3.9 vs 3.12
```bash
# Python 3.10-3.12：支持 STEP 解析（CadQuery）
# Python 3.9：不支持 STEP，其余功能正常
```

## 六、总结

**patent-disclosure-skill** 是一个功能完整、设计精良的专利交底书编写与解读工具。它通过 AI 技术将复杂的专利申请流程标准化、自动化，让研发人员能够专注于技术创新本身，而非被繁琐的文档工作拖累。

项目的三大亮点：

1. **流程全覆盖**：从项目扫描、专利点挖掘、查新检索、交底书成稿到迭代修改，覆盖专利申请全生命周期
2. **知识沉淀**：专利解读自动入库 Obsidian，构建私有专利知识库，支持术语双链与关系图谱
3. **自进化能力**：联网感知政策动向，持续优化交底书写法

如果你是一名研发人员，经常因为专利交底书而头疼，这个工具绝对值得一试。项目的 MIT 开源协议也意味着你可以自由定制和扩展，打造属于自己的专利申请利器。

---

**项目地址**：[https://github.com/handsomestWei/patent-disclosure-skill](https://github.com/handsomestWei/patent-disclosure-skill)  
**文档**：[INSTALL.md](https://github.com/handsomestWei/patent-disclosure-skill/blob/main/INSTALL.md) | [SKILL.md](https://github.com/handsomestWei/patent-disclosure-skill/blob/main/SKILL.md)  
**示例**：[examples/](https://github.com/handsomestWei/patent-disclosure-skill/tree/main/examples)
