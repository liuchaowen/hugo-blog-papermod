---
title: "CUPP：交互式社工密码字典生成利器"
date: "2026-07-01"
description: "CUPP（Common User Passwords Profiler）是一款经典的交互式社工密码分析工具，通过收集目标个人信息生成高度定制化的密码字典，支持 1337 模式和海量词库下载，广泛用于渗透测试与安全审计。"
author: "Cheman"
slug: cupp
draft: false
categories: ["技术", "安全"]
tags: ["GitHub", "开源", "安全工具", "密码破解", "社会工程学"]
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

今天在 GitHub Trending 上看到一个有意思的安全工具：**CUPP**（Common User Passwords Profiler），一个通过交互式问答收集目标个人信息，自动生成高度定制化密码字典的经典开源工具，已经活跃了近 20 年。

## 一、项目概述

CUPP 由 Muris Kurgas（j0rgan）于 2000 年代初开发，旨在帮助安全研究人员和渗透测试人员在合法授权的场景下，针对特定目标构建更精准的密码攻击字典。项目的核心思路很简单：**密码往往与个人身份信息强相关**，姓名、生日、昵称、宠物名、伴侣信息等组合起来，才是真实世界中大量密码的构成方式。

**核心功能一览：**

| 功能 | 说明 |
|------|------|
| `-i` 交互模式 | 通过问答收集目标信息，生成个性化密码字典 |
| `-w` 字典增强 | 读取已有字典文件，追加各种组合变体（数字、后缀、Leet 等） |
| `-l` 下载词库 | 从官方仓库下载 38 类海量词库（Moby、Names、French 等） |
| `-a` Alecto DB | 直接解析 Alecto 泄密数据库中的用户名和密码 |

项目基于 GNU General Public License v3，由 Mebus 在 GitHub 上持续维护，当前版本为 **v3.3.1**，仅依赖 Python 3。

## 二、技术原理

### 2.1 配置文件驱动

CUPP 通过 `cupp.cfg` 文件管理所有生成规则，保持了良好的可扩展性：

```ini
[years]
years = 1990,1991,1992,...,2030

[specialchars]
chars = !,@,#,$,%,^,&,*,+,_,~

[nums]
from = 0
to = 99
wcfrom = 6
wcto = 30
threshold = 1000
```

这些配置控制着年份范围、特殊字符组合、随机数字位数以及单词长度过滤阈值。

### 2.2 核心生成算法

CUPP 的密码组合逻辑封装在 `generate_wordlist_from_profile()` 函数中，核心策略包括：

**（1）生日日期组合**

```python
# 提取生日的多种表示形式
birthdate_yy = profile["birthdate"][-2:]   # 52
birthdate_yyy = profile["birthdate"][-3:]   # 952
birthdate_yyyy = profile["birthdate"][-4:]  # 1952
birthdate_dd = profile["birthdate"][:2]     # 07
birthdate_mm = profile["birthdate"][2:4]    # 10
```

然后对 7 种日期片段做全排列组合，生成 `ddmmyy`、`mmddyyyy`、`yymmdd` 等数十种变体。

**（2）Leet 转换**

将明文密码替换为 1337 speak 变体，核心通过 `make_leet()` 函数实现：

```python
def make_leet(x):
    for letter, leetletter in CONFIG["LEET"].items():
        x = x.replace(letter, leetletter)
    return x
```

配置文件中定义了标准映射：`a→4`、`i→1`、`e→3`、`t→7`、`o→0`、`s→5`、`g→9`、`z→2`。例如 `password` → `p4ssw0rd`。

**（3）多层组合引擎**

```python
# 姓名 + 年份 + 特殊字符的笛卡尔积组合
kombi[1]  = list(komb(kombinaa, bdss))       # 姓名 + 生日组合
kombi[4]  = list(komb(kombinaa, years))        # 姓名 + 年份
kombi[17] = list(komb(reverse, years))        # 反向姓名 + 年份
kombi[12] = list(concats(word, numfrom, numto))  # 单词 + 随机数字
```

`komb()` 函数负责将两组词表拼接，`concats()` 则追加数字后缀。整个过程使用 `dict.fromkeys()` 去重，保证最终字典不含重复条目。

### 2.3 特殊字符组合

```python
if profile["spechars1"] == "y":
    for spec1 in chars:
        profile["spechars"].append(spec1)
        for spec2 in chars:
            profile["spechars"].append(spec1 + spec2)
            for spec3 in chars:
                profile["spechars"].append(spec1 + spec2 + spec3)
```

支持 1~3 个特殊字符的任意组合，叠加在用户名/单词后生成 `password!`、`password!!` 等变体。

## 三、安装与快速开始

**环境要求：** Python 3（无需任何第三方依赖）

```bash
# 克隆仓库
git clone https://github.com/Mebus/cupp.git
cd cupp

# 查看帮助
python3 cupp.py -h

# 查看版本
python3 cupp.py -v
```

**配置文件** `cupp.cfg` 包含年份范围、特殊字符、Leet 映射等全部可调参数，开箱即用。

## 四、使用方法与实战

### 4.1 交互式生成目标密码字典（最常用）

```bash
$ python3 cupp.py -i

[+] Insert the information about the victim to make a dictionary
[+] If you don't know all the info, just hit enter when asked! ;)

> First Name: julian
> Surname: assange
> Nickname: mendax
> Birthdate (DDMMYYYY): 03071971
> Do you want to add special chars at the end of words? Y/[N]: Y
> Do you want to add some random numbers at the end of words? Y/[N]: Y
> Leet mode? (i.e. leet = 1337) Y/[N]: Y

[+] Now making a dictionary...
[+] Sorting list and removing duplicates...
[+] Saving dictionary to julian.txt, counting 32847 words.
[+] Now load your pistolero with julian.txt and shoot! Good luck!
```

生成结果包含 `julian`、`Julian3071`、`mendax!`、`ASSANGE91`、`Julian_1990` 等所有姓名、年份、特殊字符的排列组合。

### 4.2 增强已有字典

```bash
# 基于现有字典追加变体
python3 cupp.py -w existing_wordlist.txt
```

### 4.3 下载海量词库

```bash
$ python3 cupp.py -l
# 选择类别编号即可下载（Moby、Names、French 等 38 类）
```

### 4.4 集成 Alecto 泄密数据库

```bash
python3 cupp.py -a
# 生成 alectodb-usernames.txt 和 alectodb-passwords.txt
```

## 五、常见问题与解决方案

**Q: 运行报错 "Configuration file cupp.cfg not found!"**
> 确保在 cupp 目录下运行，或检查 cupp.cfg 是否被误删。

**Q: 生成的字典文件体积过大，超过 1GB**
> 在 `cupp.cfg` 中调低 `threshold`（默认 1000）以限制全排列数量，或减少关键词数量。

**Q: 交互模式下生日格式错误**
> 必须输入 8 位数字，格式为 DDMMYYYY，如 `03071971`。

**Q: Leet 模式生成的密码不够全面**
> 编辑 `cupp.cfg` 的 `[leet]` 段可添加更多字符映射规则。

**Q: Python 2 环境下运行报错**
> CUPP v3.x 已全面迁移至 Python 3，请使用 `python3 cupp.py` 运行。

## 六、总结

CUPP 是社工密码分析领域最经典、最简洁的工具之一。它不依赖机器学习或大数据，完全基于规则组合，却往往能在授权渗透测试中取得意想不到的效果——因为**真实的密码往往比复杂性规则预测的更有个性**。如果你在做 Web 安全测试、Wi-Fi 渗透或红队演练，CUPP 绝对值得加入你的工具箱。

> 声明：本文所有工具使用场景均限于合法授权的安全测试与教育研究，请勿将其用于任何未授权的入侵活动。
