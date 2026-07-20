---
title: "AstronRPA：讯飞开源企业级 RPA 桌面应用，支持低代码可视化流程设计"
date: 2026-07-21
description: "AstronRPA 是科大讯飞开源的企业级 RPA（机器人流程自动化）桌面应用，基于 Python 引擎，提供 300+ 预置原子组件，支持 Windows 桌面应用和网页自动化，采用前后端分离 + Docker 微服务架构，低代码可视化设计器让业务人员也能快速构建自动化工作流。"
author: "Cheman"
slug: astron-rpa
draft: false
categories: ["技术", "开源", "RPA"]
tags: ["RPA", "Python", "低代码", "自动化", "开源", "科大讯飞"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**AstronRPA**，这是科大讯飞开源的企业级 RPA（Robotic Process Automation）桌面应用，支持可视化低代码开发、300+ 预置组件和 AI Agent 深度集成，让企业流程自动化不再是技术团队的专属。

## 一、项目概述

AstronRPA 是一款面向企业的桌面级 RPA 平台，核心定位是**低代码/无代码的流程自动化**。用户通过可视化的流程设计器（类似 UIpath、Power Automate 的拖拽式体验），即可快速构建自动化工作流，覆盖 Windows 桌面软件操作、网页自动化等常见场景。

核心特性包括：

- **全面自动化覆盖**：支持 WPS、Office、金蝶、用友等主流办公/ERP 软件，以及 IE、Edge、Chrome 等浏览器，实现跨应用的端到端自动化。
- **300+ 预置原子能力**：涵盖 UI 操作、数据处理、系统交互、浏览器自动化、Excel/Word/PDF 操作、AI 集成等开箱即用组件。
- **企业级安全与协作**：内置卓越中心、团队市场、终端监控、调度模式和机器人团队共享功能，构建完整的权限管控体系。
- **原生 AI Agent 加持**：深度集成 [Astron Agent](https://github.com/iflytek/astron-agent) 平台，支持 RPA 流程与 AI Agent 双向调用，实现智能决策与自动执行的无缝衔接。
- **多渠道触发**：支持直接执行、定时任务、API 调用和 MCP 服务调用，灵活嵌入复杂业务场景。

## 二、技术架构

AstronRPA 采用**前端-后端分离**的微服务架构：

| 层级 | 技术选型 |
|------|---------|
| 桌面前端 | Vue 3 + TypeScript + Electron |
| 后端服务 | Java Spring Boot + Python FastAPI |
| RPA 引擎核心 | Python（集成 20+ RPA 组件） |
| 部署方式 | Docker Compose 全栈容器化 |

架构分层清晰：

- **引擎层**：基于 Python 构建，集成图像识别与 UI 自动化能力，是整个 RPA 系统的执行核心。
- **组件生态**：包含 `astronverse.system`（系统操作）、`astronverse.browser`（浏览器自动化）、`astronverse.gui`（GUI 操作）、`astronverse.excel`（Excel 处理）、`astronverse.vision`（图像识别）、`astronverse.ai`（AI 服务集成）等多个模块化包。
- **执行框架**：`astronverse.actionlib` 定义原子操作，`astronverse.executor` 负责工作流执行，`astronverse.scheduler` 做任务调度，`astronverse.trigger` 管理触发机制。

引擎层 Python 依赖通过 `uv` 工具管理，保证了环境的一致性和可复现性。客户端打包采用 SWIG 连接 Python 与 C/C++，实现高性能的本地执行。

## 三、快速开始

### 环境要求

- 操作系统：Windows 10/11
- 内存：≥ 8 GiB
- Python：3.13.x
- Node.js：≥ 22
- Java：JDK 8+

### 服务器端 Docker 一键部署

```bash
git clone https://github.com/iflytek/astron-rpa.git
cd astron-rpa/docker
cp .env.example .env
# 修改 .env 中 casdoor 服务地址
CASDOOR_EXTERNAL_ENDPOINT="http://<YOUR_SERVER_IP>:8000"
docker compose up -d
```

部署后验证：
- 访问 `http://<YOUR_SERVER_IP>:32742/api/rpa-auth/user/login-check`，返回 `unauthorized` 即表示连接正常。
- 访问 `http://<YOUR_SERVER_IP>:8000` 查看 Casdoor 登录页。

### 客户端构建

下载 [Release 包](https://github.com/iflytek/astron-rpa/releases) 或源码一键构建：

```bash
git clone https://github.com/iflytek/astron-rpa.git
cd astron-rpa
./build.bat --python-exe "C:\Program Files\Python313\python.exe"
```

构建成功后，在安装目录修改 `resources/conf.yaml` 中的服务端地址：

```yaml
remote_addr: http://YOUR_SERVER_ADDRESS:32742/
skip_engine_start: false
```

## 四、使用方法与实战

安装完成后，打开客户端即可使用可视化流程设计器。典型使用步骤：

1. **新建流程**：点击「新建流程」，在画布上拖拽需要的组件节点。
2. **配置节点**：选中节点，在右侧属性面板填写参数（如目标应用的选择器、输入值等）。
3. **调试运行**：点击「调试」按钮实时查看执行过程，支持断点、单步执行。
4. **发布到服务器**：流程设计完成后，一键发布到企业服务器，供其他成员或调度机器人调用。

对于 AI Agent 集成场景，可以在 AstronRPA 中调用 [Astron Agent](https://github.com/iflytek/astron-agent) 的推理能力，让自动化流程具备自然语言理解和决策能力；也可以在 Astron Agent 中直接调用 RPA 工作流节点，实现 AI + 自动化的闭环。

## 五、常见问题

**Q: Docker 部署后客户端连接失败？**
检查服务器防火墙是否开放了 32742 端口（默认），并确认 `resources/conf.yaml` 中的 `remote_addr` 已正确修改为服务器实际 IP。

**Q: 构建客户端时报 Python 相关错误？**
确保指定的 Python 目录是干净的 3.13.x 纯净安装，不含额外第三方包，以减小打包体积。可使用 `uv venv` 创建隔离环境。

**Q: 组件节点找不到目标元素？**
检查是否使用了正确的浏览器内核（IE/Edge/Chrome），以及选择器表达式是否精确。`astronverse.vision` 模块提供了图像识别备选方案，适用于目标界面结构经常变化的场景。

**Q: Linux/macOS 用户能否使用？**
当前服务端支持 Docker 部署（跨平台），客户端以 Windows 为主要支持平台，Linux/macOS 桌面客户端尚未提供。

## 六、总结

AstronRPA 带来了企业级 RPA 的完整开源方案，从可视化设计器、丰富的组件生态到 Docker 化部署、AI Agent 集成，在功能和架构上都具有较高完成度。对于有 Windows 端流程自动化需求的企业或团队，它是 UiPath、Power Automate 之外一个值得关注的开源替代选择。

> GitHub 地址：https://github.com/iflytek/astron-rpa