---
title: "用 Claude Code 打造 AI 求职助手：从自我画像到简历、求职信全自动生成"
date: 2026-07-07
description: "AI Job Search 是一个基于 Claude Code 的求职框架，通过 /setup、/scrape、/apply 三条命令将 AI 变成求职全流程助手：自动构建候选人画像、抓取招聘门户、评估岗位匹配度，并以 drafter-reviewer 双人工作流生成 LaTeX 简历与求职信，外加 PDF 视觉校验与 ATS 文本层校验，杜绝排版翻车与关键词堆砌。"
author: "Cheman"
slug: ai-job-search
draft: false
categories: [AI, 开源, 效率工具]
tags: [GitHub, AI, Claude, 求职, 自动化, LaTeX]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MadsLorentzen/ai-job-search**，它把 Claude Code 变成了一个全流程求职助手——不仅能帮你写简历和求职信，还会替你搜索岗位、评估匹配度，并确保产出的 PDF 在排版和 ATS 解析两个维度都站得住脚。

## 一、项目概述

AI Job Search 是一个建立在 [Claude Code](https://claude.com/claude-code) 之上的求职工作流框架。它的核心思路不是调用某个封闭的 SaaS，而是把一整套「职业咨询最佳实践」编码进 Claude Code 的 commands 和 skills 中，让你 fork 一份、填好个人画像后，就能让 AI 完成从岗位评估、CV 裁剪到面试准备的全部工作。

整个框架的工作流可以用一张图概括：

```
/setup          /scrape              /apply <url>
  |                |                     |
  v                v                     v
Fill in        Search job           Evaluate fit
your profile   portals              Score & recommend
  |                |                     |
  v                v                     v
Profile        Present matches      Draft CV + Cover Letter
files ready    with fit ratings     (LaTeX, tailored)
                   |                     |
                   v                     v
               Pick a match         Reviewer agent critiques
               -> /apply            -> Revise -> Final output
```

**核心特性：**

- **语言/国家无关的核心工作流**：自画像、匹配评估、drafter-reviewer 投递流水线是与地区解耦的，任何人都能用。
- **市场可插拔的招聘爬虫**：内置丹麦市场（Jobindex、Jobnet、Akademikernes Jobbank 等）的 CLI 工具，并提供 `/add-portal` 一键为你的本地招聘网站生成抓取 skill。
- **零依赖的 LinkedIn 搜索**：`linkedin-search` 基于公开未鉴权的 `jobs-guest` 接口，只需 `bun` 即可运行，支持任意地点。
- **PDF 与 ATS 双重校验**：每份产出都会真正编译成 PDF 并视觉检查，再用 `pdftotext` 抽取文本层核对 ATS 可读性。
- **诚实原则**：绝不编造技能或经历，关键词覆盖率不足时如实标记为 gap，而非硬塞。

## 二、技术原理

### 架构设计

项目把「求职能力」拆成了三层结构：

1. **`.claude/commands/`** —— 暴露给用户的命令入口：`setup`（画像构建）、`scrape`（岗位搜索）、`apply`（投递流水线）、`expand`（能力补全）、`upskill`（技能差距分析）、`add-template`、`add-portal`、`reset`。
2. **`.claude/skills/job-application-assistant/`** —— 真正的「大脑」，包含 7 个结构化 markdown 文件：`01-candidate-profile`（教育/经历/技能）、`02-behavioral-profile`（性格评估）、`03-writing-style`（文风）、`04-job-evaluation`（匹配评分框架）、`05-cv-templates`、`06-cover-letter-templates`、`07-interview-prep`（STAR 案例）。
3. **`.agents/skills/`** —— 市场特定的招聘门户 CLI 抓取工具（丹麦四家 + LinkedIn）。

### 核心技术栈

- **Claude Code（CLI）** 作为编排与生成引擎；
- **Python 3.10+** 编写薪酬基准工具；
- **Bun** 运行各招聘门户的 TS 抓取 CLI；
- **LaTeX**（moderncv + 自定义 `cover.cls`）负责 CV 与求职信的最终渲染，CV 用 `lualatex` 编译，求职信用 `xelatex` 编译；
- **poppler 的 `pdftotext`** 做 ATS 文本层校验（缺失时优雅降级为视觉关键词检查）。

### 关键设计：drafter-reviewer 双人工作流

`/apply` 是框架的技术精华，运行流程如下：

1. **解析**岗位（URL 或粘贴的 JD 文本）；
2. **匹配评估**：用 `04-job-evaluation` 的评分框架对照你的画像（技能、经历、文化、地点、职业契合度）；
3. **起草** LaTeX 简历与求职信；
4. **派出 reviewer agent**：用一个全新上下文的 Claude 去调研公司、 critique 草稿；
5. **修订**：drafter 根据反馈改写；
6. **编译并视觉校验**：`lualatex` 编 CV、`xelatex` 编求职信，Claude 读渲染页迭代，直到 CV 恰好 2 页、求职信恰好 1 页；
7. **ATS 校验**：抽取 PDF 文本层，核对联系方式、阅读顺序、关键词覆盖；
8. **交付**带校验清单的最终产物。

其核心动机在于：多数 LaTeX 简历模板在 `.tex` 里「看着没问题」，进 PDF 就翻车——职位孤行到下一页、求职信溢出到第 2 页、列表字体静默回退到正文字体。`/apply` 通过 `\needspace`、`\enlargethispage`、列表项字体包装等手段自动修复，且**每次投递都跑**。

### 相关性加权的 CV 删减

当 CV 超过 2 页时，工作流不机械地删「最旧」部分，而是对每一行按 `(a) 与目标岗位的关联度、(b) 在文档中的独特性、(c) 求职信是否依赖它` 打分，先删总分最低的一行。一个命中岗位关键词的「旧经历」bullet，会比没命中的「近期经历」bullet 优先保留。

### 薪酬基准工具的设计细节

`salary_lookup.py` 展示了框架对「鲁棒模糊匹配」的讲究。它支持丹麦/北欧字符的英文化变体（ø→o、æ→ae、å→aa），并剥离 `A/S`、`ApS`、`Group`、`Holding` 等法定后缀与噪音，再综合归一化、子串包含、词集合重叠计算 0–100 的匹配分：

```python
def match_score(query, entry_name):
    q_norm = normalize(query)
    n_norm = normalize(entry_name)
    if not q_norm or not n_norm:
        return 0
    if q_norm == n_norm:
        return 100
    if q_norm in n_norm:
        ratio = len(q_norm) / len(n_norm)
        return 80 + int(ratio * 10)
    # 词集合重叠兜底，覆盖 +40 区间打分
    ...
```

## 三、安装与快速开始

### 环境要求

- [Claude Code](https://claude.com/claude-code)（CLI）
- Python 3.10+
- [Bun](https://bun.sh)（丹麦招聘 CLI 工具）
- 含 `lualatex` 与 `xelatex` 的 LaTeX 发行版（TeX Live 或 MiKTeX）
- 可选：`pdftotext`（poppler）——用于 `/apply` 的 ATS 解析校验

### 1. Fork 并克隆

```bash
gh repo fork MadsLorentzen/ai-job-search --clone
cd ai-job-search
```

### 2. 安装招聘搜索工具

```bash
cd .agents/skills/jobbank-search/cli && bun install && cd ../../../..
cd .agents/skills/jobdanmark-search/cli && bun install && cd ../../../..
cd .agents/skills/jobindex-search/cli && bun install && cd ../../../..
cd .agents/skills/jobnet-search/cli && bun install && cd ../../../..
cd .agents/skills/linkedin-search/cli && bun install && cd ../../../..
```

`linkedin-search` 的 `bun install` 仅拉 TS 开发类型，运行本身零依赖。

### 3. 构建个人画像

```bash
claude
# 在 Claude Code 内部执行：
/setup
```

`/setup` 提供三条路径：读取你的 `documents/` 文件夹（CV PDF、LinkedIn 导出、文凭、推荐信、过往投递）、粘贴单份 CV、或走一遍访谈式录入。文档夹模式是幂等且可重复运行的。

## 四、使用方法与实战

### 搜索岗位

```bash
/scrape
```

这会按你的画像搜索多个招聘门户、去重、并按匹配度排序展示结果；挑一个匹配项即可直接对其运行 `/apply`。

### 投递岗位

```bash
/apply https://jobindex.dk/job/1234567
```

当 URL 无法抓取时，可直接粘贴 JD 文本：

```bash
/apply <在这里粘贴完整的岗位描述>
```

### 进阶命令

- **`/expand`**：扫描你画像中已链接的公开来源（GitHub、作品集、Kaggle、Google Scholar）并补全能力清单；
- **`/upskill`**：分析画像与跟踪岗位间的技能差距，产出带学习资源和时长的热力图；
- **`/add-template`**：注册你自己的 LaTeX CV/求职信模板，自动跑测试编译并接入 `/apply`；
- **`/add-portal`**：为你的本地招聘网站生成抓取 skill，上线前会真实跑一次查询验证。

### 自定义画像

偏好手动编辑时，直接改 `CLAUDE.md`（完整画像）、`01-candidate-profile.md`（结构化 CV 数据）、`04-job-evaluation.md`（技能匹配区）等文件即可。随着优先级变化，还能用 `/setup --section search` 只重新配置搜索策略。

## 五、常见问题与解决方案

**Q：LaTeX 编译失败，报 fontawesome5 字体展开错误？**
A：CV 必须用 `lualatex` 编译（现代 MiKTeX 配 `pdflatex` 常因 `fontawesome5` 出错）；求职信用 `xelatex`，因为 `cover.cls` 依赖 `fontspec`。

**Q：某些招聘门户抓不到岗位？**
A：部分门户会屏蔽自动化访问，`/apply` 支持直接粘贴 JD 文本绕过；对于鉴权墙门户，`/add-portal` 会明确拒绝并给出「仅个人使用」警告。

**Q：没有薪酬数据，salary 步骤会报错吗？**
A：不会。`salary_lookup.py` 找不到 `salary_data.json` 时只会提示需要先建数据文件，`/apply` 会直接跳过薪酬基准步骤。

**Q：生成的 PDF 排版不对（孤行、溢出）？**
A：这正是 `/apply` 的 PDF 校验循环要解决的——它会自动应用 `\needspace`/`\enlargethispage` 等修复并迭代，无需手动干预。

**Q：ATS 检查依赖 `pdftotext`，没装会怎样？**
A：会优雅降级为视觉关键词检查，不会中断流程；装了 poppler 则会抽取文本层做更严格的解析校验。

## 六、总结

AI Job Search 值得关注的地方，在于它把「AI 帮写简历」这件容易翻车的事，做成了**有验证闭环**的工程：drafter-reviewer 双人分工避免单一视角的套话，PDF 视觉校验杜绝排版翻车，ATS 文本层校验保证机器可读，再加上「不编造、不堆砌」的诚实原则。对正在找工作、又想用 Claude Code 把自己的职业资产系统化的开发者来说，这是一份可以直接 fork 上手的高质量脚手架。
