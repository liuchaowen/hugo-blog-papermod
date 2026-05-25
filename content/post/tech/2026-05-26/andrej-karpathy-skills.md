---
title: "Karpathy 式 Claude Code 编程指南：四大原则提升 AI 编码质量"
date: 2026-05-26
draft: false
categories: [AI编程, 开源项目]
tags: [Claude, AI编程, Karpathy, LLM, 编程指南]
description: "基于 Andrej Karpathy 对 LLM 编码问题的观察，提炼出四大原则帮助 Claude Code 生成更高质量的代码"
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

[multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) 是一个改进 Claude Code 行为的开源项目，通过单个 `CLAUDE.md` 文件提供了一套编程指南，源于 Andrej Karpathy 对 LLM（大语言模型）编码陷阱的深刻观察。

### 核心问题

Karpathy 在他的推文中指出了 LLM 编码的三大问题：

1. **错误假设**：模型会替你做错误假设并直接执行，不会主动核实
2. **过度复杂**：喜欢过度复杂化代码和 API，膨胀抽象层，不清理死代码
3. **副作用修改**：即使与任务无关，也会修改/删除未充分理解的注释和代码

### 解决方案

项目提出了四大原则直接应对这些问题：

| 原则 | 解决什么问题 |
|------|-------------|
| **思考后再编码** | 错误假设、隐藏困惑、缺失权衡分析 |
| **简洁优先** | 过度复杂、膨胀的抽象 |
| **精准修改** | 无关编辑、触碰不应动的代码 |
| **目标驱动执行** | 通过测试优先、可验证的成功标准实现杠杆效应 |

## 二、技术原理

### 2.1 思考后再编码（Think Before Coding）

这一原则是解决 LLM "隐藏困惑"问题的核心。传统 LLM 编码助手往往会：

- 默默选择一个解释然后执行
- 不会主动提出澄清问题
- 不会展示权衡分析
- 不会在应该时提出异议

**实现机制**：

```markdown
## Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- **State assumptions explicitly** — If uncertain, ask rather than guess
- **Present multiple interpretations** — Don't pick silently when ambiguity exists
- **Push back when warranted** — If a simpler approach exists, say 
```

强制 LLM 进行显式推理，在编码前：
1. 明确陈述假设
2. 展示多种解释方案
3. 在适当时提出异议
4. 在困惑时停止并请求澄清

### 2.2 简洁优先（Simplicity First）

这一原则对抗 LLM 的"过度工程化"倾向：

**简洁测试**：
- 不添加未要求的功能
- 不为单次使用的代码创建抽象
- 不为未请求的"灵活性"或"可配置性"添加代码
- 不为不可能发生的场景添加错误处理
- 如果 200 行可以缩减到 50 行，就重写

**核心思想**：如果高级工程师会说这过度复杂了，那就简化它。

### 2.3 精准修改（Surgical Changes）

编辑现有代码时的核心准则：

**不该做的事**：
- 不要"改进"相邻代码、注释或格式
- 不要重构未损坏的东西
- 不要清理不是你创建的混乱

**应该做的事**：
- 匹配现有风格（即使你会用不同方式）
- 只移除你的更改导致未使用的导入/变量/函数
- 注意到不相关的死代码时，提及它——不要删除它

**测试标准**：每一行更改都应该直接追溯到用户的请求。

### 2.4 目标驱动执行（Goal-Driven Execution）

这是最具洞察力的原则，源于 Karpathy 的观察：

> "LLMs are exceptionally good at looping until they meet specific goals... Don't tell it what to do, give it success criteria and watch it go."

**转换示例**：

| 不要说... | 转换为... |
|----------|----------|
| "添加验证" | "为无效输入编写测试，然后让它们通过" |
| "修复 bug" | "编写重现 bug 的测试，然后让它通过" |
| "重构 X" | "确保测试在重构前后都能通过" |

**多步骤任务模板**：

```
1. [步骤] → 验证: [检查点]
2. [步骤] → 验证: [检查点]
3. [步骤] → 验证: [检查点]
```

## 三、安装与快速开始

### 3.1 方式 A：Claude Code 插件（推荐）

在 Claude Code 中添加 marketplace：

```bash
/plugin marketplace add forrestchang/andrej-karpathy-skills
```

然后安装插件：

```bash
/plugin install andrej-karpathy-skills@karpathy-skills
```

这会将指南作为 Claude Code 插件安装，使其在所有项目中可用。

### 3.2 方式 B：CLAUDE.md（单项目）

**新项目**：

```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md
```

**现有项目（追加）**：

```bash
echo "" >> CLAUDE.md
curl https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md >> CLAUDE.md
```

### 3.3 Cursor 集成

项目包含了提交的 Cursor 项目规则（`.cursor/rules/karpathy-guidelines.mdc`），在 Cursor 中打开项目时同样的指南会生效。详见 `CURSOR.md`。

## 四、使用方法与实战

### 4.1 在 Claude Code 中使用

安装插件后，Claude Code 会自动加载这些指南。你会注意到：

- Claude 会在实现前提出澄清问题
- 生成的代码更简洁，没有过度工程化
- 编辑更精准，不会有无关的"改进"
- Claude 会主动提出更简单的替代方案

### 4.2 实战示例

**场景 1：添加新功能**

**没有指南**（Claude 可能会）：
- 添加不必要的抽象层
- 实现未要求的可配置性
- 修改相邻代码"以改进它"

**有指南**（Claude 会）：
- 只实现要求的功能
- 使用最简单直接的方案
- 只修改直接相关的代码

**场景 2：修复 Bug**

**没有指南**：
```
"修复这个 bug"
→ Claude 可能会过度复杂化修复，或改动无关代码
```

**有指南**：
```
"编写重现这个 bug 的测试，然后修复它让测试通过"
→ Claude 会编写测试，然后最小化修改修复问题
```

### 4.3 项目特定定制

这些指南设计用于与项目特定指令合并。在你的 `CLAUDE.md` 中添加：

```markdown
## Project-Specific Guidelines

- 使用 TypeScript strict 模式
- 所有 API 端点必须有测试
- 遵循 `src/utils/errors.ts` 中的现有错误处理模式
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：插件安装失败或 `CLAUDE.md` 下载失败

**解决方案**：
- 检查网络连接
- 确认 Claude Code 版本支持插件系统
- 手动下载 `CLAUDE.md` 并放入项目根目录

### 5.2 指南没有效果

**问题**：安装后没有注意到行为变化

**解决方案**：
- 确认 `CLAUDE.md` 在项目根目录
- 重启 Claude Code 会话
- 检查是否与其他指令冲突

### 5.3 过度谨慎

**问题**：Claude 变得过于谨慎，连简单任务都要问太多问题

**解决方案**：
- 这些指南偏向**谨慎而非速度**
- 对于简单任务（明显的一行代码修改、简单 typo 修复），使用判断
- 不是每个更改都需要完整流程

### 5.4 与现有工作流冲突

**问题**：项目已有完善的指南，添加这个会冲突

**解决方案**：
- 将这些指南与现有指令合并
- 保留项目特定的规则
- 根据需要调整原则优先级

## 六、总结

`andrej-karpathy-skills` 项目提供了一个简洁而强大的解决方案来改进 Claude Code 的编码质量。通过四大原则：

1. **思考后再编码** — 减少错误假设和隐藏困惑
2. **简洁优先** — 对抗过度工程化
3. **精准修改** — 避免无关编辑和副作用
4. **目标驱动执行** — 利用可验证目标实现杠杆效应

**如何判断指南在起作用**：

- ✅ diff 中不必要的更改更少
- ✅ 因过度复杂导致的重写更少
- ✅ 澄清问题在实现前提出（而非错误后）
- ✅ clean、minimal 的 PR，没有顺手重构

这个项目不仅是一个工具，更是一种**编程哲学**：让 AI 编码助手从"盲目执行"转向"深思熟虑"，最终产出更高质量、更可维护的代码。

---

**相关链接**：
- 项目地址：[multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)
- Andrej Karpathy 原推文：[Twitter](https://x.com/karpathy/status/2015883857489522876)
- Multica 项目：[github.com/multica-ai/multica](https://github.com/multica-ai/multica)
