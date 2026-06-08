---
title: "Personal AI Infrastructure：构建你的个人 AI 生命操作系统"
date: 2026-06-08
description: "深入解析 Daniel Miessler 的 Personal AI Infrastructure (PAI) 项目——一个完整的个人 AI 生命操作系统，通过统一的 Pulse 守护进程、DA 数字助手身份层和 Algorithm v6.3.0 算法，帮助用户从当前状态迈向理想状态。包含 45 个技能、171 个工作流和完整的内存系统。"
author: "Cheman"
slug: personal-ai-infrastructure
draft: false
categories: [AI基础设施, 开源项目]
tags: [GitHub, AI, 开源, Claude Code, 生命操作系统]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Personal AI Infrastructure (PAI)**，这是一个将 AI 从"工具"升级为"生命操作系统"的开源基础设施，帮助你用 AI 构建理想的自己。

## 一、项目概述

**Personal AI Infrastructure (PAI)** 是一个建立在 Claude Code 之上的个人 AI 操作系统。它不再是简单的"AI 脚手架"，而是一个完整的**生命操作系统**（Life Operating System），通过三层架构协同工作：

- **PAI**：操作系统本身，包含技能、内存、算法、你的 Telos（目的）、身份文件
- **Pulse**：运行在 `localhost:31337` 的生命仪表盘，实时展示你的状态、目标和进展
- **DA (Digital Assistant)**：你的数字助手，与你对话的语音和人格界面

项目的核心理念是**理想状态驱动一切**——通过定义"什么是好的/完成的"，让 AI 帮助你从当前状态系统性地迈向理想状态。这是 Daniel Miessler 自 2016 年提出《The Real Internet of Things》愿景以来的实践落地。

**核心特性：**
- 统一的 **Pulse** 守护进程（22 个 API 路由），集成语音、hooks、可观测性、cron 和生命仪表盘
- **DA 身份层**：PRINCIPAL_IDENTITY + DA_IDENTITY 配对，会话启动时自动加载
- **Algorithm v6.3.0**：七阶段循环（OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN），由 Sonnet 支持的模式分类器自动选择 MINIMAL/NATIVE/ALGORITHM 和 E1-E5 层级
- **ISA（理想状态工件）**：通用"理想状态"表达原语，包含 12 个部分（问题→愿景→范围外→原则→约束→目标→标准→测试策略→功能→决策→变更日志→验证）
- **45 个公共技能、171 个工作流、37 个 hooks**
- 基于文本的内存系统（Memory v7.6），通过目的结构化：WORK、KNOWLEDGE、LEARNING、RELATIONSHIP、OBSERVABILITY、STATE
- 结构化隐私：通过 `containment-zones.ts` 声明每个目录的隐私区域，`ContainmentGuard` PreToolUse hook 阻止跨区泄漏

## 二、技术原理

### 架构设计

PAI 采用**文件系统即上下文**的架构，避免使用 RAG（检索增强生成）的嵌入复杂性和检索不稳定性。核心设计原则：

1. **文本优于不透明存储**：强烈倾向纯文本和 Markdown，避免使用 SQLite、Postgres 等不透明存储。一切都应该是透明且可解析的——可以被你、你的 DA、`rg`（ripgrep）或任何其他工具读取。

2. **上下文脚手架 > 模型**：PAI 从根本上是一个为最智能的模型提供正确上下文的系统——关于你是谁、你想要完成什么、你拥有的工具——这样它们才能真正帮助你达到理想状态。模型的重要性低于围绕它的东西。

3. **Bitter-pilled 工程**：随着模型变强，它们需要更少的操作指令。PAI 不断审核系统，移除模型在正确上下文和工具下可以做得更好的过于规范的指令。

4. **无 RAG 的文件系统**：自 2025 年 6 月以来，PAI 避免了 RAG。带有交叉引用的富文本加上 ripgrep 等快速搜索，提供了人们通常从 RAG 获得的一切——没有嵌入复杂性、检索脆弱性或保真度损失。文件系统就是索引。

### 核心技术栈

- **TypeScript**：主要编程语言
- **Bun**：JavaScript/TypeScript 运行时（替代 Node.js）
- **Claude Code**：底层 AI 编码助手和 hook 系统
- **launchd**（macOS）/ systemd（Linux）：Pulse 守护进程管理
- **ElevenLabs API**：可选语音合成（回退到桌面通知）

### Algorithm v6.3.0 七阶段循环

算法是 PAI 的引力中心——每个非平凡任务都通过它运行。基于科学方法建模，使用 Deutsch 的"难以变通的解释"作为"好"的标准：

```
OBSERVE（观察）
  ↓
THINK（思考）→ 调用思维技能（第一性原理、委员会辩论、红队等）
  ↓
PLAN（计划）→ 生成 ISA（理想状态工件）
  ↓
BUILD（构建）→ 代码/文档/任何交付物
  ↓
EXECUTE（执行）→ 运行/部署/交付
  ↓
VERIFY（验证）→ 实时探测、顾问调用、跨供应商审计（E4/E5 层级）
  ↓
LEARN（学习）→ 捕获信号、改进系统
```

模式分类器根据提示复杂性自动选择：
- **MINIMAL**：简单任务，直接执行
- **NATIVE**：中等复杂性，使用原生 Claude Code 能力
- **ALGORITHM**：高复杂性，完整七阶段循环

层级（E1-E5）：
- E1：最小验证
- E2：基本验证
- E3：标准验证
- E4：强验证 + 跨供应商审计
- E5：最强验证 + 完整审计轨迹

### 内存系统（Memory v7.6）

内存按目的结构化，形成一个复合系统：

- **WORK**：活动任务的 ISA
- **KNOWLEDGE**：类型化图谱（人物、公司、想法、研究、博客）
- **LEARNING**：元模式
- **RELATIONSHIP**：DA-委托人笔记
- **OBSERVABILITY**：每个工具调用 + hook 触发 + 满意度信号
- **STATE**：会话注册表

内存系统会复合：捕获你做过什么、学到什么、什么值得保留——并作为未来工作的输入反馈。

## 三、安装与快速开始

### 环境要求

- **Claude Code**（必须）：PAI 是 Claude Code 原生项目
- **Bun**：JavaScript/TypeScript 运行时
- **Git**：版本控制
- **Node.js v18+**（Claude Code 依赖）
- macOS 或 Linux（Windows 未测试）

### 一键安装（推荐）

```bash
curl -sSL https://ourpai.ai/install.sh | bash
```

安装向导会自动：
1. 验证 Bun、Git 和 Claude Code
2. 提示输入 ElevenLabs API key（可跳过，语音回退到桌面通知）
3. 启动 DA 身份向导（名称 + 语音 + 人格）
4. 将 Pulse 设置为 launchd 服务（`com.pai.pulse`）
5. 运行验证

现有 `~/.claude/` 会自动备份到 `~/.claude.backup-{TIMESTAMP}`。

### 手动安装

```bash
# 1. 克隆仓库
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git
cd Personal_AI_Infrastructure/Releases/v5.0.0

# 2. 复制到 ~/.claude
cp -R .claude ~/

# 3. 运行安装脚本
cd ~/.claude && ./install.sh
```

### 安装后配置

```bash
# 打开生命仪表盘
open http://localhost:31337
```

然后在 Claude Code 中运行 `/interview`，你的 DA 会引导你完成：

1. **Phase 1 — TELOS**：使命、目标、信仰、智慧、挑战、书籍、思维模型、叙事
2. **Phase 2 — IDEAL_STATE**：对你来说，成功是什么样子？
3. **Phase 3 — Preferences**：工具、约定、工作风格
4. **Phase 4 — Identity**：最终 DA 人格调优

**这是最重要的步骤。没有 TELOS，你的 DA 就没有优化的目标。**

### 验证安装

```bash
# Pulse 是否运行
curl -s http://localhost:31337/api/pulse/health | jq

# 语音通知是否工作
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from your DA"}'

# 仪表盘是否渲染
open http://localhost:31337
```

## 四、使用方法与实战

### 基础用法

#### 1. 与你的 DA 对话

安装完成后，你的 DA 会在 Claude Code 中等待你。你可以像这样使用它：

```
你：帮我研究一下向量数据库的最新进展
DA：【调用 Research 技能，生成 ISA，执行七阶段循环】
```

#### 2. 使用技能

PAI 有 45 个公共技能，每个技能都是确定性的单元。技能层次结构：

```
代码 → 运行代码的 CLI → 提示 CLI 的工作流 → 在工作流之间路由的 SKILL.md
```

技能是容器；SKILL.md 是前门；实际工作尽可能是真实代码。提示包装代码；代码不包装提示。

示例技能：
- **ISA 技能**：Scaffold、Interview、CheckCompleteness、Reconcile、Seed、Append
- **Migrate 技能**：从 `.md`/`.markdown`/`.txt`、Obsidian、Notion、Apple Notes 导入，按 v5 分类法分类（TELOS、KNOWLEDGE、PROJECTS、FEED 等）
- **Research 技能**：深度研究，生成 ISA，执行算法循环
- **Thinking 技能**：第一性原理、委员会辩论、红队、根因、系统思维、迭代深度、光圈振荡等

#### 3. 运行 Pulse 守护进程

Pulse 是统一守护进程，提供：
- 生命仪表盘（22 个路由）
- 语音通知
- Hooks 集成
- 可观测性
- Cron 作业
- 可选 Telegram/iMessage 桥接

```bash
# 检查 Pulse 状态
curl -s http://localhost:31337/api/pulse/health | jq

# 查看当前状态
curl -s http://localhost:31337/api/pulse/state | jq
```

### 进阶用法

#### 1. 自定义 TELOS

TELOS 是 PAI 的核心——它定义了你是谁、你想要什么、你去哪里。编辑 `PAI/USER/TELOS/` 中的文件：

```markdown
# PAI/USER/TELOS/MISSION.md
我的使命是构建工具，帮助人们增强自己。

# PAI/USER/TELOS/GOALS.md
## 短期目标（6 个月）
- 发布 3 个开源项目
- 学会 Rust 编程语言

## 长期目标（5 年）
- 建立一个人本技术的社区
- 写一本关于 AI 伦理的书
```

#### 2. 创建自定义技能

创建新技能非常简单：

```bash
# 1. 创建技能目录
mkdir -p ~/.claude/PAI/SKILLS/my-skill

# 2. 创建 SKILL.md
cat > ~/.claude/PAI/SKILLS/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: 我的自定义技能
---

# My Skill

## 触发词
我的技能、自定义能力

## 工作流程
1. 第一步
2. 第二步
EOF

# 3. 创建工作流（可选）
mkdir -p ~/.claude/PAI/SKILLS/my-skill/workflows
```

#### 3. 使用 PAI Packs

Packs 是独立、AI 可安装的功能，你可以添加到任何 AI 编码工具，而无需安装 PAI。每个 pack 都是一个自包含的提示，你的 DA 可以读取并执行。

```bash
# 浏览所有 packs
open https://github.com/danielmiessler/Personal_AI_Infrastructure/tree/main/Packs

# 安装 pack：指向你的 DA
你：安装这个 pack：<pack 目录路径>
DA：【读取 pack，执行安装工作流】
```

#### 4. 内存系统实战

内存系统会自动捕获你的工作。你也可以手动添加：

```bash
# 添加 KNOWLEDGE
cat >> ~/.claude/PAI/MEMORY/KNOWLEDGE/ideas.md << 'EOF'
## 2026-06-08
### AI 生命操作系统的设计模式
- 上下文脚手架优于模型选择
- 文本优于不透明存储
- 文件系统即索引，无需 RAG
EOF

# DA 会自动读取这些内容，在未来的会话中使用
```

### 实际项目示例

#### 示例 1：研究一个新技术

```
你：研究一下 Rust 的异步编程模型，我想学会它

DA：【Research 技能】
1. OBSERVE：捕获你的目标（学会 Rust 异步编程）
2. THINK：调用第一性原理思维技能，分解异步编程的核心概念
3. PLAN：生成 ISA
   - 问题：我想要学会 Rust 异步编程
   - 愿景：能够阅读和编写 Rust 异步代码
   - 标准：完成 5 个实践项目，理解 async/await、Future、tokio
   - 测试策略：代码审查、项目部署
4. BUILD：创建学习材料、代码示例、练习项目
5. EXECUTE：交付学习路径
6. VERIFY：测试你的理解，通过问答验证
7. LEARN：捕获学习信号，改进未来的学习路径
```

#### 示例 2：构建一个 Web 应用

```
你：帮我构建一个 Markdown 笔记本应用，支持实时预览

DA：【Build 技能】
1. OBSERVE：捕获需求（Markdown 笔记本、实时预览）
2. THINK：技术选型（React + CodeMirror + marked）
3. PLAN：生成 ISA
   - 功能：编辑器、预览面板、保存/加载、导出
   - 约束：使用 localStorage、无后端
   - 标准：实时预览延迟 <100ms、支持 GitHub Flavored Markdown
4. BUILD：编写代码
5. EXECUTE：启动开发服务器
6. VERIFY：测试所有功能、检查预览延迟
7. LEARN：捕获构建模式，改进未来的 Web 应用构建
```

## 五、常见问题与解决方案

### 安装失败

**问题**：一键安装脚本失败

**解决方案**：

```bash
# 1. 检查 Bun 是否安装
bun --version

# 2. 检查 Git 是否安装
git --version

# 3. 检查 Claude Code 是否安装
claude --version

# 4. 手动安装缺失的依赖
# macOS
brew install bun git

# Linux
curl -fsSL https://bun.sh/install | bash
```

**问题**：权限错误

**解决方案**：

```bash
# 确保你有 ~/.claude 目录的写权限
chmod -R u+w ~/.claude

# 如果使用了 sudo 安装，修复权限
sudo chown -R $USER:$GROUP ~/.claude
```

### 运行时错误

**问题**：Pulse 守护进程无法启动

**解决方案**：

```bash
# 1. 检查端口 31337 是否被占用
lsof -i :31337

# 2. 检查日志
cat ~/.claude/PAI/LOGS/pulse.log

# 3. 手动启动 Pulse
cd ~/.claude/PAI/PULSE
bun run index.ts

# 4. 检查 launchd 服务状态（macOS）
launchctl list | grep pai
```

**问题**：DA 没有响应

**解决方案**：

```bash
# 1. 检查 Claude Code 是否运行
ps aux | grep claude

# 2. 检查 DA 身份文件是否存在
cat ~/.claude/PAI/USER/DA_IDENTITY.md

# 3. 重新运行 /interview
# 在 Claude Code 中运行
/interview
```

**问题**：语音通知不工作

**解决方案**：

```bash
# 1. 检查 ElevenLabs API key 是否配置
cat ~/.claude/PAI/CONFIG/voice.json

# 2. 如果没有配置，语音会回退到桌面通知
# 检查桌面通知是否工作
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification"}'

# 3. 配置 ElevenLabs API key
# 编辑 ~/.claude/PAI/CONFIG/voice.json
{
  "provider": "elevenlabs",
  "apiKey": "your-api-key-here"
}
```

### 性能问题

**问题**：算法循环太慢

**解决方案**：

1. **使用更低的层级**：在 DA 身份文件中设置默认层级为 E1 或 E2
2. **使用 MINIMAL 模式**：对于简单任务，DA 会自动选择 MINIMAL 模式
3. **优化上下文**：移除不必要的上下文文件，减少 README 长度

**问题**：内存系统太大，DA 响应慢

**解决方案**：

```bash
# 1. 清理旧的内存文件
# 删除 30 天前的 LEARNING 文件
find ~/.claude/PAI/MEMORY/LEARNING -name "*.md" -mtime +30 -delete

# 2. 压缩 KNOWLEDGE 图谱
# 手动编辑 ~/.claude/PAI/MEMORY/KNOWLEDGE/*.md，移除过时内容

# 3. 使用 ripgrep 而不是让 DA 读取所有文件
# 在 CLAUDE.md 中添加
# 使用 `rg <关键词>` 搜索内存，而不是读取整个文件
```

### 兼容性

**问题**：从 v4.x 升级到 v5.0.0 失败

**解决方案**：

> ⚠️ v5.0.0 是一个不同的系统，不是补丁。在安装之前阅读迁移指南。

```bash
# 1. 备份现有安装
cp -R ~/.claude ~/.claude.backup-$(date +%Y%m%d)

# 2. 阅读迁移指南
open https://github.com/danielmiessler/Personal_AI_Infrastructure/tree/main/Releases/v5.0.0/README.md#migration-guide-from-v4x

# 3. 安装 v5.0.0
curl -sSL https://ourpai.ai/install.sh | bash

# 4. 迁移旧内容
# 告诉你的 DA
你：帮我把我的旧内容迁移到 PAI/USER/ 结构中

DA：【Migrate 技能】
- 从 v4.x 导入笔记、项目状态、自定义规则
- 按 v5 分类法分类（TELOS、KNOWLEDGE、PROJECTS、FEED 等）
- 提交并保留来源
```

**问题**：Windows 不支持

**解决方案**：

PAI 主要支持 macOS 和 Linux。Windows 用户可以使用：

1. **WSL2**（Windows Subsystem for Linux）：
   ```bash
   # 在 WSL2 中安装 Bun、Git、Claude Code
   curl -fsSL https://bun.sh/install | bash
   ```

2. **等待社区贡献**：项目欢迎 Windows 支持的 PR

## 六、总结

**Personal AI Infrastructure (PAI)** 是一个雄心勃勃的项目，它试图回答一个问题：**如果 AI 真的要增强每个人，它应该是什么样子？**

答案是：一个**生命操作系统**——它捕获你是谁、你在乎什么、你要去哪里，然后帮助你用 AI 到达那里。

### 核心洞察

1. **AI 应该放大每个人**——不仅仅是 top 1%。PAI 是开源的、免费的、社区驱动的。

2. **数字助手是 AI 的终极界面**。我们都在构建同一个东西，终点就是每个人的一个 DA。PAI 是这个愿景的早期实现。

3. **理想状态驱动一切**。AI 的最大未解决问题是没人能定义任务"好"或"完成"实际上意味着什么。PAI 围绕理想状态的概念构建——特别是从你的当前状态到你的理想状态的转变。

4. **上下文脚手架优于模型选择**。PAI 从根本上是一个为最智能的模型提供正确上下文的系统。模型的重要性低于围绕它的东西。

5. **文本优于不透明存储**。避免使用 SQLite、Postgres 等。一切都应该透明且可解析。

### 适用人群

- **AI 爱好者和研究者**：想要一个开放的、可定制的 AI 基础设施
- **开发者**：想要用 AI 增强自己的工作和生活
- **思考者**：相信 AI 应该以人为本，而不是以工具为本
- **Claude Code 用户**：想要将 Claude Code 变成你的专属 AI 操作系统

### 开始使用

```bash
# 一键安装
curl -sSL https://ourpai.ai/install.sh | bash

# 打开生命仪表盘
open http://localhost:31337

# 在 Claude Code 中运行 /interview，捕获你的 TELOS
/interview
```

**PAI 是开源的、免费的、社区驱动的。如果你觉得它有价值，可以 [赞助这个项目](https://github.com/sponsors/danielmiessler)。**

---

**相关资源：**
- [GitHub 仓库](https://github.com/danielmiessler/Personal_AI_Infrastructure)
- [The Real Internet of Things](https://danielmiessler.com/blog/the-real-internet-of-things)——PAI 背后的愿景
- [AI's Predictable Path: 7 Components](https://danielmiessler.com/blog/ai-predictable-path-7-components-2024)——AI 发展路径的可视化演练
- [Building a Personal AI Infrastructure](https://danielmiessler.com/blog/personal-ai-infrastructure)——完整的 PAI 演练和示例
- [社区 Discord](https://danielmiessler.com/upgrade)
- [GitHub Discussions](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions)

**Augment yourself.** 🚀
