---
title: "用 DeepSeek Harness 打造本地 AI 工作台：DeepSeek Harness Desktop App 深度解析"
date: 2026-08-20
description: "DeepSeek Harness Desktop App 是构建在 DeepSeek Harness（DSH）之上的本地 AI 桌面工作台，基于 Electron 与同一套 Session/Agent/Tool/Skill/MCP 运行时，集成项目管理、Git Worktree、Canvas、本地 Site 与 Office 产物，把 AI 对话与研发工作流统一在同一个桌面应用中。"
author: "Cheman"
slug: deepseek-harness-desktop-app
draft: false
categories: ["开源", "AI 工具"]
tags: ["DeepSeek", "Electron", "AI 桌面应用", "开源", "GitHub"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**DeepSeek Harness Desktop App**。它把 DeepSeek 官方 Harness（DSH）的 Session、Agent、Tool、Skill、MCP 与 Profile Bundle，与项目、文件、网页、Git Worktree、Canvas、Site 和 Office 产物组织在同一个本地桌面应用里，让 AI 对话真正嵌入研发工作流。

## 一、项目概述

DeepSeek Harness Desktop App 是一个**本地优先的 AI 工作桌面**，建立在 DeepSeek Harness（简称 DSH）之上。它并不是把 DSH Web 套一层 iframe，也没有重写一套 Agent 运行时，而是通过 Electron 启动 DSH Web Profile，并复用同一套 Session、Agent、Tool、Skill、MCP、Settings、Profile Bundle 与 Client Loader，再在上面叠加自己的桌面外壳。

它的核心价值可以概括为一句话：**对话即工作，轨迹即证据**。一个项目对话对应一个 DSH Session，右侧的「结果与证据」面板直接读取当前绑定 Session 的 `session.history`，把用户消息、模型输出、工具调用、工具结果、权限变化和最终回答放在同一条可回放轨迹中，不再维护第二套运行中心。

从能力矩阵看，它覆盖了：

- **DSH 对话**：流式回答、思考过程、工具调用、消息分支、重启恢复；
- **模型与权限**：Provider/模型/推理强度切换，凭据引用、Session 权限、工具审批管理；
- **Tool/Skill/MCP/多 Agent**：直接使用当前 Profile 中的工具、技能、MCP、Hook、子 Agent 与 Workflow；
- **桌面外壳**：三列工作台、左右栏折叠、全局搜索、缩放快捷键、更新检查；
- **Office 产物**：Markdown、DOCX、XLSX、PPTX、PDF 的创建、查看与定点编辑，并保留版本。

## 二、技术原理

### 运行时架构：同一链条上的桌面外壳

项目最值得注意的设计点是它**与 DSH 官方 Web 的关系**。README 明确说明：应用不是 DSH Web 的 iframe，也没有复制 Agent 运行时。Electron 负责启动 DSH Web Profile，继续使用同一套核心能力；需要模型调用的产品能力通过绑定 Session 和 DSH Tool 接入，而项目数据、文件权限、网页、Worktree 与产物版本仍由桌面应用自己管理。

从 `package.json` 可见，桌面端被拆成了 `electron`（主进程）与 `renderer`（渲染进程）两个包，主入口为 `electron/main.js`，并通过 `scripts/run-with-project-node.mjs` 用项目自带的 Node 运行脚本，保证 Electron 主进程与渲染进程使用一致的 Node 大版本（要求 >= 24）：

```json
{
  "name": "dsh-desktop",
  "version": "0.0.1",
  "license": "MIT",
  "productName": "DeepSeek Harness Desktop App",
  "main": "electron/main.js",
  "engines": { "node": ">=24" },
  "scripts": {
    "doctor": "node scripts/run-with-project-node.mjs node scripts/doctor.mjs",
    "dev": "node scripts/run-with-project-node.mjs node scripts/dev.mjs",
    "build:renderer": "node scripts/run-with-project-node.mjs npm --prefix renderer run build:app",
    "package:mac": "node scripts/run-with-project-node.mjs npm --prefix electron run package:mac"
  }
}
```

### 轨迹即证据：单一可回放数据源

与很多「对话 + 日志」双轨系统不同，DSH Desktop 的右侧「结果与证据」面板直接读取绑定 Session 的 `session.history`。所有交互产物（用户消息、请求上下文、模型输出、工具输入输出、耗时、Token、最终回答）都在同一条轨迹里，天然具备可审计性与可复盘性——这对需要向团队或客户展示「AI 到底做了什么」的场景非常关键。

### 数据与安全边界

项目数据默认保存在本机 `~/.dsh`，项目源码目录默认只读，Agent 若要写入必须经过用户明确授权。安全规则由 `PRIVACY.md`、`SECURITY.md` 与 `THIRD_PARTY_NOTICES.md` 约束。主题与插件也做了边界隔离：本地主题只能使用安全的颜色与外观设置，不能注入原始 CSS、远程图片或修改应用名称；第三方 Client UI Bundle 默认不会进入拥有 Electron 权限的主窗口，只有随应用提供并经过审核的 Bundle 才不受此限制。

## 三、安装与快速开始

本地开发要求 **Node.js 24 或更高版本**，当前项目基于 DSH `0.1.0-rc.6`。

```bash
# 1. 安装依赖（postinstall 会自动执行 bootstrap）
npm install

# 2. 环境自检，确认 Node/依赖/路径就绪
npm run doctor

# 3. 启动开发模式（Electron 主进程 + 渲染进程热重载）
npm run dev
```

如果你切换了 Node.js 大版本、CPU 架构或操作系统，需要重新准备依赖：

```bash
# 重新引导依赖（强制）
npm run setup
```

`npm run doctor` 会在启动前帮助你发现环境不一致的问题，建议在 `npm run dev` 之前先跑一遍，避免「能装不能跑」的常见坑。

## 四、使用方法与实战

### 项目对话与工作台

一个项目对话对应一个 DSH Session。工作台右侧可以添加多个标签页：结果与证据、浏览器、文件、产物、Site。项目文件树、Agent 工作目录、当前 Diff 与行内编辑都跟随当前项目权限和活动 Worktree。

典型工作流如下：

1. 新建一个项目，或在全局/临时对话中开始；
2. 在对话里让 Agent 修改代码，右侧「文件」面板会显示 Diff；
3. 对 Diff 逐行评论、在外部编辑器打开，或发起 AI Review；
4. 用「安全撤销」回退模型产生的文件修改。

### Git Worktree 隔离开发

这是把 AI 编码风险降到最低的关键能力。你可以为项目创建多个独立分支与工作目录，同一时间启用一个，新对话的 Agent、DSH Session、Diff 与行编辑都运行在该 Worktree 中，主检出保持不变：

1. 为项目创建独立分支与工作目录，启用其中一个；
2. 此后新建对话会自动落在 Worktree，主分支干净；
3. 切换工作目录**不会**迁移已有对话，应先启用目标 Worktree 再新建对话；
4. 删除前必须切回主检出——删除目录后会保留 Git 分支，避免误删提交。

非 Git 目录、重复分支、越界路径和异常符号链接会被拒绝，磁盘上丢失的 Worktree 会被标记为不可用。

### Canvas 与本地 Site

Canvas 保存不可变版本，支持正文编辑、版本比较、精确行内建议与冲突处理；Site 复用同一套版本能力，并在隔离沙箱中提供桌面、平板、手机预览。Site 目前只提供预览和单文件导出，没有部署服务。

### 插件中心

普通用户可从左侧「插件」页面安装 DSH Profile Bundle：

1. 输入带精确版本的 npm 包，或带完整 commit 的 `dsh-external` 仓库地址；
2. 先运行兼容性检查，只有结果为「可以安装」才能写入当前 Profile；
3. 安装后查看来源、版本、加载顺序与能力，用户安装的 Bundle 可卸载。

## 五、常见问题与解决方案

**Q1：`npm install` 后运行报错，提示 Node 版本不对？**
项目要求 Node.js >= 24，且用 `scripts/run-with-project-node.mjs` 以项目自带 Node 运行脚本。切换 Node 大版本后请先执行 `npm run setup` 重新引导依赖，再跑 `npm run doctor` 验证。

**Q2：Agent 改了文件但看不到 Diff / 无法写入？**
项目源码目录默认只读，Agent 写入需要用户明确授权。请在项目设置中授权源码目录与写入目标，并检查当前活动 Worktree 是否正确绑定。

**Q3：Worktree 切换后历史对话消失了？**
切换工作目录不会迁移已有对话。正确做法是：先启用目标 Worktree，再新建对话。删除 Worktree 前必须切回主检出。

**Q4：想装第三方 Bundle 但被拒绝？**
插件中心会先做兼容性检查，结果非「可以安装」时禁止写入。包含第三方 Client UI 的 Bundle 不会进入拥有 Electron 权限的主窗口；如需主窗口能力，应使用随应用提供且经审核的 Client Bundle。

**Q5：本地 Site 能直接部署/公网分享吗？**
当前本地 Site 仅提供预览与单文件导出，没有部署服务；公开分享目前只有只读查看，没有移动端远程控制、二维码配对、公网隧道或 SSH/SFTP/端口转发。

## 六、总结

DeepSeek Harness Desktop App 的亮点不在于「又做了一个聊天客户端」，而在于它用 **DSH 同一套运行时 + 桌面外壳**的方式，把 AI 对话、代码编辑、Git Worktree 隔离、文件授权、Canvas、Site 与 Office 产物收敛到一个本地优先的工作台里，并用「轨迹即证据」的设计让 AI 的每一步都可视、可回放、可审计。对于希望把 LLM Agent 真实嵌入日常研发、又对数据安全与操作边界有要求的中文开发者来说，这是一个值得关注的本地化方案。

> 项目地址：[github.com/vibeinging/deepseek-harness-desktop-app](https://github.com/vibeinging/deepseek-harness-desktop-app)
> 许可证：MIT（第三方依赖与二进制的来源与限制见 `THIRD_PARTY_NOTICES.md`）
