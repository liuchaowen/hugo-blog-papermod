---
title: "Build Your Own X：从零实现你最喜欢的技术——程序员进阶的终极资源清单"
date: 2026-05-29
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 编译器, 操作系统, 数据库, 神经网络, 自学]
description: "codecrafters-io/build-your-own-x 是 GitHub 上最著名的自学资源清单之一，收录了 30+ 个技术方向、数百篇『从零实现』风格的深度教程，涵盖编译器、操作系统、数据库、神经网络、Docker、Git 等核心领域，是程序员系统性提升底层能力的必读项目。"
author: "Cheman"
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

## 一、项目概述

[codecrafters-io/build-your-own-x](https://github.com/codecrafters-io/build-your-own-x) 是 GitHub 上 star 数最高的自学资源清单之一（170k+ stars），由 [CodeCrafters](https://codecrafters.io) 团队维护。项目主旨非常明确：

> *What I cannot create, I do not understand — Richard Feynman.*

这份清单不做泛泛而谈，而是精选出**一步步手把手教你从零实现某项技术的教程**——不是「用 API」，而是「造轮子」。

**覆盖的技术方向（30+ 个）：**

3D 渲染器、AI 模型、增强现实、BitTorrent 客户端、区块链/加密货币、Bot、命令行工具、数据库、Docker、模拟器/虚拟机、前端框架、游戏、Git、内存分配器、网络协议栈、神经网络、操作系统、物理引擎、处理器、编程语言、正则表达式引擎、搜索引擎、Shell、模板引擎、文本编辑器、视觉识别、Voxel 引擎、Web 浏览器、Web 服务器，以及大量未分类的综合项目。

## 二、技术原理与设计哲学

### 为什么「造轮子」有效？

这个项目背后的核心理念是：**真正理解一个技术的最好方式，就是自己实现它**。

以「Build your own Database」方向为例，清单收录了：

- **C 语言**：[*Let's Build a Simple Database*](https://cstack.github.io/db_tutorial/) —— 从 B-Tree 开始，手把手实现一个 SQLite 风格的磁盘数据库，是公认最经典的数据库入门教程之一。
- **Go 语言**：[*Build Your Own Database from Scratch*](https://build-your-own.org/database/) —— 从 B+Tree 到 SQL 解析，3000 行代码完整实现。
- **Python**：[*DBDB: Dog Bed Database*](http://aosabook.org/en/500L/dbdb-dog-bed-database.html) —— 《500 Lines or Less》系列的典范，展示如何设计一个简单的键值存储引擎。

每个方向都遵循同样的逻辑：**先理解数据结构，再实现核心算法，最后组装成可用系统**。

### 项目选型与覆盖面分析

| 方向 | 代表教程 | 语言覆盖 |
|------|---------|---------|
| 编程语言 | *Crafting Interpreters*, *mal - Make a Lisp* | C/Java/JS/Python/Rust/Haskell 等 15+ 种 |
| 操作系统 | *OS From 0 to 1*, *Writing an OS in Rust* | C/Rust/Assembly |
| 数据库 | *Let's Build a Simple Database*, *Build Your Own Redis* | C/Go/Python |
| 神经网络 | *Neural Networks: Zero to Hero* (Karpathy) | Python |
| 正则表达式引擎 | *Regular Expression Matching Can Be Simple And Fast* | C/Go/Python/JS |
| Web 服务器 | *Let's Build A Web Server* (Ruslan Spivak 系列) | Python/Node.js/C# |
| Docker | *Build Your Own Container Using Less than 100 Lines of Go* | Go/Python/Shell |

## 三、安装与快速开始

这不是一个需要「安装」的软件项目，而是一个**资源索引**。使用方式非常简单：

1. **直接访问 GitHub 仓库**：[github.com/codecrafters-io/build-your-own-x](https://github.com/codecrafters-io/build-your-own-x)
2. **找到你感兴趣的方向**，点击对应语言的教程链接
3. **跟着教程写代码**——大多数教程都是「边读边写」风格，建议同步动手

如果你喜欢中文阅读体验，社区也有非官方的中文衍生项目，可以搜索 `build-your-own-x-zh` 等关键词。

**推荐入门路径（由易到难）：**

```
编程语言（mal Lisp）→ Shell → 正则表达式引擎 → Git → 数据库 → 操作系统 → 神经网络
```

## 四、使用方法与实战建议

### 如何最大化利用这份清单？

**1. 选一个你「用过但不懂」的技术**

比如你每天都在用 Git，但不知道内部原理 → 选 *Build your own Git* 方向，跟着 [ugit](https://www.leshenko.net/p/ugit/) 或 [wyag](https://wyag.thb.lt/) 一步步实现，你会彻底理解 blob、tree、commit 对象。

**2. 用「测试驱动」方式跟着写**

以 *Build your own Database* 为例，先写一个失败的测试（比如「插入一行数据后能读出来」），再实现功能代码，和教程给出的参考实现对照。

**3. 把实现结果发到博客或 GitHub**

这是巩固理解的最佳方式。codecrafters.io 的创始人也鼓励大家把「从零实现」的过程写成博客——这本身就是这份清单存在的意义之一。

### 实战示例：用 500 行 Python 实现一个 Lisp 解释器

选自 [*lispy*](http://norvig.com/lispy.html)（Peter Norvig 的经典教程）：

```python
def parse(program):
    "Read a Scheme expression from a string."
    return read_from_tokens(tokenize(program))

def standard_env():
    "An environment with some Scheme standard procedures."
    import math, operator as op
    env = Env()
    env.update(vars(math))  # sin, cos, sqrt, pi, ...
    env.update({
        '+':op.add, '-':op.sub, '*':op.mul, '/':op.truediv,
        '>':op.gt, '<':op.lt, '>=':op.ge, '<=':op.le, '=':op.eq,
        'abs':abs, 'append':op.add, 'apply':lambda proc, args: proc(*args),
    })
    return env
```

50 行核心代码就能跑一个可用的 Scheme 解释器——这就是「造轮子」的魔力。

## 五、常见问题与解决方案

**Q：教程太多，不知道选哪个方向入门？**
→ 建议从 *Build your own Programming Language*（mal Lisp）或 *Build your own Shell* 开始，这两个方向门槛最低、反馈最快。

**Q：跟着教程写完了，但感觉还是不理解？**
→ 正常。建议再「盲写」一遍，不参考教程，只参考自己的第一篇代码。如果写不出来，说明某些环节还没真正理解。

**Q：有些教程链接打不开或失效了？**
→ 可以在仓库的 [Issues 页面](https://github.com/codecrafters-io/build-your-own-x/issues)提交 PR 或报告失效链接，维护者响应很及时。

**Q：有没有更结构化的学习路径，而不是零散的教程？**
→ 推荐结合 [CodeCrafters](https://codecrafters.io) 的付费课程（有免费试用），它把「Build your own X」做成了交互式、测试驱动的挑战。

**Q：我只用 Python/JavaScript，能看懂其他语言的教程吗？**
→ 大部分教程的核心逻辑是语言无关的。C 语言的数据库教程，用 Python 重新实现一遍，效果反而更好（因为你需要自己思考翻译过程）。

## 六、总结

`build-your-own-x` 不只是一份链接清单，它代表了一种**工程师成长的核心方法论**：**理解 = 实现**。

这份清单最打动人的地方在于：它把「高深莫测」的技术（操作系统、数据库、神经网络）拆解成了「普通人跟着写就能做出来」的教程。无论你是想夯实底层基础，还是想在面试中脱颖而出，或者只是纯粹享受「我搞清楚了」的快感——这里都有适合你的入口。

> 项目地址：https://github.com/codecrafters-io/build-your-own-x
> 维护者：CodeCrafters, Inc. | 开源协议：CC0（公有领域）
