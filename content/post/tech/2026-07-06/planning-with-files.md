---
title: "planning-with-files：让AI编程助手不再失忆的持久化规划技能"
date: 2026-07-06
description: "一个为AI编程助手设计的持久化文件规划技能，通过三文件模式解决上下文丢失、目标漂移等问题，让Agent在/clear或崩溃后自动恢复任务进度。"
author: "Cheman"
slug: planning-with-files
draft: false
categories: ["技术", "开源", "AI"]
tags: ["GitHub", "开源", "AI编程", "Agent", "Claude Code"]
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

今天在 GitHub Trending 上发现一个备受关注的项目：**planning-with-files**，这是一个为AI编程助手设计的持久化文件规划技能，采用与Meta以20亿美元收购的Manus相同的"上下文工程"理念，让AI Agent在上下文丢失后能够自动恢复任务进度。

## 一、项目概述

**planning-with-files** 是一个基于SKILL.md标准的持久化文件规划技能，专为AI编程助手（Claude Code、Cursor、Codex、Gemini CLI等60+平台）设计。它通过在磁盘上维护`task_plan.md`、`findings.md`和`progress.md`三个文件，让AI Agent在遭遇上下文丢失、`/clear`命令或崩溃后能够自动恢复任务状态。

**核心问题与解决方案：**

| 问题 | 解决方案 |
|------|---------|
| **易失性记忆** — TodoWrite工具在上下文重置后消失 | 文件系统存储，持久化到磁盘 |
| **目标漂移** — 50+工具调用后忘记原始目标 | Hook机制在每轮对话开始时重新注入计划 |
| **错误隐藏** — 失败未被跟踪，重复相同错误 | 在plan文件中记录所有错误和尝试 |
| **上下文堆砌** — 所有信息塞进上下文而非存储 | 三文件模式分离关注点 |

**核心特性：**
- 📁 三文件模式：`task_plan.md`（规划）、`findings.md`（发现）、`progress.md`（进度）
- 🔄 会话恢复：`/clear`或崩溃后自动恢复上下文
- 🎯 完成门控（v3.0+）：可选的Stop Hook验证计划是否真正完成
- 🚀 自主模式：针对强模型的优化注入策略
- 🔒 哈希认证：SHA-256锁定`task_plan.md`防止篡改
- 🌍 多语言支持：英语、中文、阿拉伯语、德语、西班牙语

## 二、技术原理

### 架构设计

planning-with-files采用**"文件系统即内存"**的核心理念：

```
Context Window = RAM (易失、有限)
Filesystem = Disk (持久、无限)

→ 任何重要信息都写入磁盘
```

项目通过Hook机制在AI Agent的关键生命周期节点注入行为：

| Hook类型 | 触发时机 | 功能 |
|---------|---------|------|
| `SessionStart` | 会话开始 | 初始化三文件，检查现有计划 |
| `UserPromptSubmit` | 用户输入提交 | 重新注入当前计划到上下文 |
| `PreToolUse` | 工具调用前 | （传统模式）决策前重读计划 |
| `PostToolUse` | 工具调用后 | 提醒更新progress.md |
| `Stop` | 会话结束前 | 验证所有阶段是否完成 |
| `PreCompact` | `/compact`执行前 | 提示在压缩前刷新进度 |

### 核心代码解析

**1. 计划注入机制（inject-plan.sh核心逻辑）**

```bash
# 从SKILL.md中的inject-plan.sh简化逻辑
inject_plan() {
    local plan_dir=$(resolve_plan_dir)
    local plan_file="$plan_dir/task_plan.md"
    
    if [[ -f "$plan_file" ]]; then
        # 验证认证哈希
        if verify_attestation "$plan_file"; then
            echo "===BEGIN PLAN DATA==="
            cat "$plan_file"
            echo "===END PLAN DATA==="
        else
            echo "Warning: Plan tampered, refusing injection"
        fi
    fi
}
```

**2. 完成验证（check-complete.sh核心逻辑）**

```bash
# 检查所有阶段是否完成
check_complete() {
    local plan_file="$1"
    local incomplete=$(grep -c '\[ \]' "$plan_file" 2>/dev/null || echo "0")
    
    if [[ "$incomplete" -gt 0 ]]; then
        echo "❌ $incomplete phases incomplete"
        return 1
    else
        echo "✅ All phases complete"
        return 0
    fi
}
```

**3. 会话恢复（session-catchup.py核心逻辑）**

```python
def catchup_session():
    """从IDE会话存储中恢复丢失的上下文"""
    # 检查各IDE的会话存储路径
    session_stores = {
        'claude': Path.home() / '.claude' / 'projects',
        'codex': Path.home() / '.codex' / 'sessions',
        # ... 其他IDE
    }
    
    # 查找planning文件最后更新时间
    plan_mtime = get_plan_mtime()
    
    # 提取该时间之后的对话内容
    lost_context = extract_conversation_after(plan_mtime, session_stores)
    
    # 生成catchup报告
    return generate_catchup_report(lost_context)
```

### 关键设计模式

**Slug模式（v2.36.0+）**：支持并行多任务隔离

```bash
# 每个任务使用独立目录
.planning/2026-07-06-task-a/
.planning/2026-07-06-task-b/

# 通过.active_plan文件指向当前活动计划
echo ".planning/2026-07-06-task-a" > .active_plan
```

**自主模式 vs 传统模式（v3.0+）**：

```bash
# 传统模式：每次工具调用都注入计划（适合弱模型）
./init-session.sh

# 自主模式：仅在会话开始和阶段转换时注入（适合强模型）
./init-session.sh --autonomous

# 门控模式：添加完成门控，未完成时阻塞Stop
./init-session.sh --gated
```

## 三、安装与快速开始

### 环境要求

- 支持的AI编程助手：Claude Code、Cursor、Codex、Gemini CLI、GitHub Copilot等60+平台
- Bash 4.0+（macOS/Linux）或 PowerShell 5.1+（Windows）
- Git（用于版本控制和会话恢复）

### 安装步骤

**方式一：一键安装（推荐）**

```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g
```

**方式二：Claude Code插件模式（支持`/plan`命令）**

```bash
/plugin marketplace add OthmanAdi/planning-with-files
/plugin install planning-with-files@planning-with-files
```

**方式三：中文版本**

```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-zh -g
```

### 最简运行示例

安装后，在Claude Code中输入：

```
/planning-with-files:plan
```

或直接描述任务，Agent会自动：
1. 创建`task_plan.md`、`findings.md`、`progress.md`
2. 在关键决策点重读计划
3. 记录所有发现和错误
4. 在停止前验证完成度

## 四、使用方法与实战

### 基础用法

**1. 启动规划会话**

```bash
# Claude Code中使用快捷命令
/plan

# 或手动初始化
~/.claude/skills/planning-with-files/scripts/init-session.sh
```

**2. task_plan.md结构示例**

```markdown
# Task: 实现用户认证模块

## Phase 1: 需求分析 [x]
- [x] 确定认证方式（JWT vs Session）
- [x] 定义用户模型字段

## Phase 2: 数据库设计 [x]
- [x] 创建users表
- [x] 设置索引

## Phase 3: API实现 [ ]
- [ ] POST /auth/register
- [ ] POST /auth/login
- [ ] POST /auth/logout

## Phase 4: 测试 [ ]
- [ ] 单元测试
- [ ] 集成测试
```

**3. findings.md记录发现**

```markdown
# Findings

## 2026-07-06 14:30
- 使用Passlib进行密码哈希，成本因子设为12
- JWT过期时间建议15分钟，配合refresh token

## 2026-07-06 15:45
- 发现现有代码base已实现部分用户模型，需要迁移而非重写
- 错误：第一次尝试用bcrypt，但项目已有Passlib依赖
```

**4. progress.md日志**

```markdown
# Progress Log

## 2026-07-06
- 14:00 - 开始认证模块开发
- 14:30 - 完成需求分析
- 15:00 - 数据库设计完成
- 15:45 - 发现与现有代码冲突，调整方案
- 16:30 - API实现中...
```

### 进阶用法

**1. 并行任务管理**

```bash
# 初始化多个并行任务
./scripts/init-session.sh --slug task-a
./scripts/init-session.sh --slug task-b

# 切换活动任务
./scripts/set-active-plan.sh .planning/2026-07-06-task-a

# 查看当前任务状态
./scripts/check-complete.sh
```

**2. 计划认证锁定**

```bash
# 锁定当前计划，防止意外修改
./scripts/attest-plan.sh

# 后续任何对task_plan.md的修改都会被检测到
```

**3. 会话恢复**

在执行`/clear`后或新会话开始时，会自动检测并提示：

```
📋 Session Catchup Report
━━━━━━━━━━━━━━━━━━━━━━━━━
Last plan update: 2026-07-06 16:30
Lost context: 45 messages

Recent activity:
- Phase 3: API实现 进行中
- 最后操作: 实现POST /auth/login

建议: 阅读progress.md了解最新进展
```

### 实际项目示例

**场景：重构遗留代码库**

```
用户: 帮我重构这个用户认证模块，改成现代化的JWT方案

Agent执行流程:
1. 创建task_plan.md，规划4个阶段
2. 分析现有代码，将发现写入findings.md
3. 每完成一个子任务，更新task_plan.md的复选框
4. 遇到错误时，记录到progress.md
5. 用户执行/clear后，Agent自动从磁盘恢复计划
6. 完成时，Stop Hook验证所有阶段已完成
```

## 五、常见问题与解决方案

### Q1: 安装后不生效，Agent没有自动创建规划文件？

**原因**：部分IDE需要手动配置hooks.json

**解决方案**：
```bash
# Cursor用户
cp ~/.claude/skills/planning-with-files/.cursor/hooks.json ~/.cursor/

# Codex用户
codex features set hooks true

# 验证配置
cat ~/.cursor/hooks.json | grep planning
```

### Q2: Stop Hook阻塞了会话，无法停止？

**原因**：启用了gated模式但计划未完成

**解决方案**：
```bash
# 方式一：完成所有阶段（推荐）
# 更新task_plan.md，标记所有任务为[x]

# 方式二：临时禁用门控
rm .planning/*/gated

# 方式三：检查错误日志
cat progress.md | grep ERROR
```

### Q3: 会话恢复报告显示"0 messages lost"？

**原因**：IDE会话存储路径不正确或权限问题

**解决方案**：
```bash
# 检查Claude Code会话路径
ls ~/.claude/projects/

# 检查Codex会话路径
ls ~/.codex/sessions/

# 手动指定会话目录
CLAUDE_PROJECT_DIR=/path/to/project ./scripts/session-catchup.py
```

### Q4: Windows Git Bash下脚本执行失败？

**原因**：路径分隔符或编码问题（v2.40.0已修复）

**解决方案**：
```bash
# 确保使用最新版本（≥v2.40.0）
npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g --force

# 或使用PowerShell版本
./scripts/init-session.ps1
```

### Q5: 计划认证总是失败？

**原因**：`.attestation`文件损坏或路径问题

**解决方案**：
```bash
# 清除认证缓存
rm .planning/*/.attestation

# 重新认证
./scripts/attest-plan.sh

# 检查SHA缓存
ls $XDG_CACHE_HOME/pwf-sha/
```

### Q6: 如何在多Agent协作中使用？

**场景**：多个Claude Code实例并行工作

**解决方案**：
```bash
# Agent 1: 前端任务
./scripts/init-session.sh --slug frontend

# Agent 2: 后端任务  
./scripts/init-session.sh --slug backend

# 每个Agent切换到自己的计划目录
./scripts/set-active-plan.sh .planning/2026-07-06-frontend
```

## 六、总结

planning-with-files通过"三文件模式"和Hook机制，优雅地解决了AI编程助手的**上下文丢失**和**目标漂移**问题。其核心价值在于：

1. **持久化**：将易失的上下文转化为持久的磁盘文件
2. **自动化**：通过生命周期Hook自动注入行为，无需手动干预
3. **标准化**：基于SKILL.md开放标准，支持60+AI编程平台
4. **可控性**：提供认证、门控、并行任务等高级控制能力

该项目在GitHub上获得了极高的关注（Benchmark 96.7%通过率、A/B测试3/3获胜），已被多个开源项目集成使用。对于经常使用AI编程助手的开发者来说，这是一个值得尝试的"必装"技能。

**相关链接：**
- GitHub仓库：https://github.com/OthmanAdi/planning-with-files
- 文档：https://github.com/OthmanAdi/planning-with-files/tree/main/docs
- Benchmark详情：https://github.com/OthmanAdi/planning-with-files/blob/main/docs/evals.md
