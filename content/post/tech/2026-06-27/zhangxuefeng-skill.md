---
title: "张雪峰.skill：把「考研名师」装进 AI Agent，用认知框架而非语录复读"
date: 2026-06-27
description: "基于5本著作、15+篇深度采访、30+条语录蒸馏出张雪峰的5个核心心智模型和8条决策启发式，封装为 Agent Skill，可在 Claude Code、Cursor、OpenClaw 等50+ runtime 中运行。不是复读语录，是用张雪峰的认知框架分析你的问题。"
author: "Cheman"
slug: "zhangxuefeng-skill"
draft: false
categories: [AI应用, 开源项目]
tags: [GitHub, 开源, AI Agent, Skill, 认知框架]
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

今天在 GitHub Trending 上看到一个有意思的项目：**张雪峰.skill**，它把「考研名师」张雪峰的认知操作系统封装成了一个可运行的 AI Agent Skill，不是简单的语录复读，而是真正用张雪峰的心智模型来分析你的问题。

## 一、项目概述

**张雪峰.skill**[1] 是一个基于 [Agent Skills](https://agentskills.io) 协议的开源项目，由开发者 alchaincyf 创建。它的核心目标是：

> 「张雪峰的认知操作系统。不是语录合集，是可运行的思维框架。」

### 项目解决什么问题？

在 AI 时代，很多「角色扮演」本质上只是 Prompt Engineering——给 AI 一个「你现在是一个XXX」的指令，然后 AI 开始复读这个角色的语录。这种做法有两个问题：

1. **没有灵魂**：AI 只是模仿表面的说话风格，没有真正理解角色的决策逻辑
2. **无法泛化**：遇到训练数据之外的问题，AI 就露馅了

**张雪峰.skill** 的解法是：**蒸馏认知框架，而非复读语录**。

### 核心特性

- **5个核心心智模型**：社会筛子论、选择>努力、就业倒推法、阶层现实主义、争议即传播
- **8条决策启发式**：灵魂追问法、中位数原则、不可替代性检验、500强测试等
- **完整的表达DNA**：短句、快节奏、生存/就业/薪资等关键词、东北方言、极高确定性
- **5对内在张力**：保留张雪峰的矛盾性（寒门代言人 vs 亿万富翁、劝人选对专业 vs 自己跨专业成功）
- **跨 runtime 兼容**：支持 Claude Code、Codex、Cursor、OpenClaw、Hermes 等 50+ runtime

## 二、技术原理

### 2.1 Agent Skills 协议

这个项目基于开放的 [Agent Skills](https://agentskills.io) 协议。Agent Skills 是一种标准化的 AI Agent 能力封装格式，核心思想是：

- **SKILL.md**：Markdown + YAML frontmatter，定义角色的认知框架、决策逻辑、表达风格
- **跨 runtime 兼容**：通过标准化的目录结构和配置文件，让同一个 Skill 可以在不同的 AI Agent runtime 中运行
- **可组合**：多个 Skills 可以组合使用，形成更复杂的 Agent

### 2.2 蒸馏流程

这个项目不是手动编写的，而是由 [女娲.skill](https://github.com/alchaincyf/nuwa-skill) 自动生成。女娲的工作流程：

1. **并行调研**：6个 Agent 并行调研（著作/对话/表达/批评/决策/时间线）
2. **交叉验证**：提炼心智模型，去除矛盾和噪声
3. **构建 SKILL.md**：把认知框架、决策启发式、表达DNA 写入标准化格式
4. **质量验证**：3个已知测试 + 1个边缘测试 + 风格测试

### 2.3 核心心智模型

项目中提炼的5个核心心智模型：

| 模型 | 一句话 | 应用场景 |
|------|--------|---------|
| **社会筛子论** | 社会就是一个大筛子，用学历筛孩子，用房子筛父母，用工作筛家庭 | 分析社会现象、职业选择 |
| **选择 > 努力** | 方向错误的努力是浪费，选对赛道比拼命奔跑重要 | 职业规划、人生决策 |
| **就业倒推法** | 从毕业后的就业数据倒推今天的专业选择，看中间50%的人去了哪 | 高考志愿、考研选专业 |
| **阶层现实主义** | 家里没矿别谈理想，先谋生再谋爱，先站稳再登高 | 区分不同家庭的不同策略 |
| **争议即传播** | 温吞的建议没人记住，把观点推到极端才有传播力 | 内容创作、观点表达 |

### 2.4 技术架构

```
zhangxuefeng-skill/
├── README.md
├── SKILL.md                              # 核心文件，定义认知框架
├── references/
│   └── research/                         # 6个调研文件
│       ├── 01-writings.md                # 著作与系统思考
│       ├── 02-conversations.md           # 深度采访与对谈
│       ├── 03-expression-dna.md          # 表达风格DNA
│       ├── 04-external-views.md          # 他者视角与批评
│       ├── 05-decisions.md               # 重大决策分析
│       └── 06-timeline.md               # 完整人生时间线
└── examples/
    └── demo-conversation.md              # 实战对话记录
```

## 三、安装与快速开始

### 3.1 安装

**方式一：一行命令（推荐）**

```bash
npx skills add alchaincyf/zhangxuefeng-skill
```

这个命令会自动检测你的 AI Agent runtime，并把 Skill 放到正确的目录。

**方式二：手动安装**

如果你知道自己的 runtime，可以手动 clone：

```bash
# Claude Code
git clone https://github.com/alchaincyf/zhangxuefeng-skill ~/.claude/skills/zhangxuefeng-skill/

# OpenClaw
git clone https://github.com/alchaincyf/zhangxuefeng-skill ~/.openclaw/workspace/skills/zhangxuefeng-skill/

# Cursor
git clone https://github.com/alchaincyf/zhangxuefeng-skill ~/.cursor/skills/zhangxuefeng-skill/
```

**方式三：作为参考资料使用**

即使你的 runtime 不支持 Agent Skills 自动加载，你也可以把 `SKILL.md` 的内容粘贴进对话。

### 3.2 快速开始

装好后，告诉你的 Agent：

```
> 用张雪峰的视角帮我分析这个专业选择
> 张雪峰会怎么看这个职业方向？
> 切换到张雪峰，我孩子要填志愿了
```

## 四、使用方法与实战

### 4.1 基础用法

**场景一：高考志愿咨询**

```
用户：我孩子今年高考，560分，河南的，想学金融，你怎么看？

张雪峰.skill：
停停停，你先别急着说金融。我问你几个问题。

家里是做金融的吗？爸妈在银行、证券公司、基金公司？
有没有亲戚在这个行业里？

没有？那我跟你说，金融这个行业，千万别碰。

你去看看每年金融专业毕业的学生，中位数去了哪？
不是去了高盛，不是去了中金，是去了你家门口的银行网点
卖理财产品。560分河南考生，大概率去个双非一本学金融，
毕业出来跟985的抢岗位，你拿什么抢？脸吗？

金融是典型的「看起来光鲜，进去才知道是坑」的行业。
你看到的是年薪百万的基金经理，你看不到的是
90%的人在银行网点站着数钱。

560分河南，我给你一个方向：计算机或者电气工程。
理工科选专业，文科选学校，记住这句话。
你孩子这个分数，去个好点的一本学计算机，
毕业出来至少有一门手艺，不用求人。
```

**运用了**：就业倒推法（看中位数去向）、家庭背景分流（先问家里资源）、社会筛子论（双非金融vs985的竞争现实）

### 4.2 进阶用法

**场景二：考研 vs 工作**

```
用户：我本科双非，想考研到985，值得吗？还是直接工作？

张雪峰.skill：
我跟你说，这个问题得看你是什么专业的。

你要是学计算机的，本科双非，能力强的话直接工作也行。
互联网公司看能力，你代码写得好，有项目经验，
人家不会因为你不是985就不要你。但这是少数。

你要是学机械、土木、生化环材这些，
那你必须考研。不是说考研能改变命运，
是说你不考研，这些专业本科出来能干嘛？
画图纸？进工厂？月薪四五千干到头？

但关键来了——考研不是目的，洗学历才是目的。

你一个双非考到985，你的第一学历还是双非，
有些公司就是卡第一学历，这个没办法，现实就是这样。
但是985的研究生至少让你过了大部分企业的筛子。
记住，社会就是个筛子，你得想办法让自己不被筛掉。

所以我的建议：
第一，考。但别考清北复交，你考不上白浪费一年。
选一个你够得着的985，城市好的优先。
第二，选对专业比选对学校更重要。
别为了985的名头去学一个冷门专业，那是自杀。
第三，最多考两次。考不上就工作，别在这死磕。
你的时间也是成本，二十五六岁还在考研，
你的同龄人已经工作三年了。
```

**运用了**：选择>努力（考研是手段不是目的）、中位数原则（看本科出来的普遍去向）、阶层现实主义（第一学历卡人的现实）

### 4.3 实际项目示例

**场景三：AI 时代的专业选择**

```
用户：AI时代来了，你之前推荐的那些专业还靠谱吗？

张雪峰.skill：
你这个问题问得好，我跟你说实话，
我自己也在重新想这个事。

我以前推荐计算机，推荐电气，推荐临床医学，
这些基本盘没变。但AI确实带来了一个新变量。

先说不变的：
临床医学——AI再牛，你敢让机器人给你开刀吗？
电气工程——电网、电站、高压线，这些得有人干，
AI替代不了你爬电线杆。
牙医——AI能帮你看片子，但不能帮你拔牙。

再说变了的：
基础的程序员岗位，说实话，确实危险了。
写个CRUD、做个网页，AI比人快十倍。
但是——注意这个但是——
AI替代的是低端编码，不是计算机科学。
你学的是算法、系统设计、架构能力，
这些东西AI替代不了，反而因为AI更值钱了。

所以我的建议更新一下：
以前是「学计算机」，现在是「学计算机+AI」。
以前是「会写代码」，现在是「会用AI写代码」。
本质没变——你的工资和你的不可替代性成正比。
AI时代，什么人不可替代？
不是会用AI的人——这个门槛太低了，谁都会用。
是理解业务、能解决问题、AI搞不定的事你能搞定的人。

别被「AI要取代一切」吓到。
十年前说互联网要取代一切，结果呢？
取代了一部分，但也创造了一堆新岗位。
AI也一样。关键是你站在被取代的那边，
还是站在用AI的那边。
```

**运用了**：不可替代性检验（AI时代什么人不可替代）、就业倒推法（区分AI影响的不同层次）、10年后压迫测试（长期视角看专业价值）

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：运行 `npx skills add alchaincyf/zhangxuefeng-skill` 报错

**解决方案**：
- 检查是否安装了 Node.js（需要 v14+）
- 如果自动检测失败，使用手动安装方式
- 检查 runtime 的 skills 目录是否存在

### 5.2 Skill 没有生效

**问题**：安装后，Agent 没有切换到张雪峰的视角

**解决方案**：
- 确认 Skill 放在了正确的目录（不同 runtime 目录不同）
- 重启 Agent runtime
-  explicitly 告诉 Agent：「用张雪峰的视角」
- 检查 `SKILL.md` 是否完整（不要修改文件名）

### 5.3 回复风格不对

**问题**：Agent 的回复不像张雪峰

**原因**：
- 这个项目不是「复读语录」，而是「用认知框架分析」
- 如果希望更「张雪峰」，可以调整 `SKILL.md` 中的表达DNA部分
- 或者安装其他更「毒舌」的版本（如果有的话）

### 5.4 如何自定义

**问题**：我想修改张雪峰的心智模型，可以吗？

**解决方案**：
- 直接编辑 `SKILL.md`
- 修改「5个心智模型」和「8条决策启发式」部分
- 也可以添加新的决策启发式
- 修改后不需要重新安装，runtime 会自动加载

## 六、总结

**张雪峰.skill** 是一个很有意思的项目，它展示了：

1. **AI Agent Skill 的正确做法**：不是复读语录，而是蒸馏认知框架
2. **Agent Skills 协议的潜力**：跨 runtime 兼容，一键安装，可组合
3. **自动蒸馏的可能性**：由 [女娲.skill](https://github.com/alchaincyf/nuwa-skill) 自动生成，无需手动编写

### 优点

- **认知深度**：不是表面的说话风格，而是真正的决策逻辑
- **技术标准化**：基于 Agent Skills 协议，跨 runtime 兼容
- **可验证**：提供了完整的调研来源（6个调研文件）
- **可扩展**：可以基于此 Skill 继续微调

### 缺点

- **语境依赖**：张雪峰的很多观点是基于中国国情的，老外可能看不懂
- **争议性**：张雪峰本身是一个争议人物，这个 Skill 也保留了他的争议性
- **不完美**：蒸馏出来的认知框架不可能100%还原真人

### 适用场景

- **高考志愿咨询**：家长和学生的刚需
- **职业规划**：用张雪峰的「就业倒推法」分析职业方向
- **决策辅助**：遇到人生重大选择时，用张雪峰的心智模型辅助决策
- **内容创作**：学习张雪峰的表达DNA，提升内容传播力

### 类似项目

女娲已蒸馏的其他人物 Skill：

| 人物 | 领域 | 安装 |
|------|------|------|
| [乔布斯.skill](https://github.com/alchaincyf/steve-jobs-skill) | 产品/设计/战略 | `npx skills add alchaincyf/steve-jobs-skill` |
| [马斯克.skill](https://github.com/alchaincyf/elon-musk-skill) | 工程/成本/第一性原理 | `npx skills add alchaincyf/elon-musk-skill` |
| [纳瓦尔.skill](https://github.com/alchaincyf/naval-skill) | 财富/杠杆/人生哲学 | `npx skills add alchaincyf/naval-skill` |
| [芒格.skill](https://github.com/alchaincyf/munger-skill) | 投资/多元思维/逆向思考 | `npx skills add alchaincyf/munger-skill` |
| [费曼.skill](https://github.com/alchaincyf/feynman-skill) | 学习/教学/科学思维 | `npx skills add alchaincyf/feynman-skill` |
| [塔勒布.skill](https://github.com/alchaincyf/taleb-skill) | 风险/反脆弱/不确定性 | `npx skills add alchaincyf/taleb-skill` |

想蒸馏其他人？安装 [女娲.skill](https://github.com/alchaincyf/nuwa-skill)，输入任何名字即可。

---

**参考链接**：

[1] 张雪峰.skill GitHub 仓库：https://github.com/alchaincyf/zhangxuefeng-skill

[2] Agent Skills 协议：https://agentskills.io

[3] 女娲.skill：https://github.com/alchaincyf/nuwa-skill
