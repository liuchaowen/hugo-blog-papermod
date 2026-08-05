---
title: "ADR：Uber开源的企业级AI代理安全检测与响应系统"
date: 2026-08-05
description: "ADR是Uber开源的企业级AI代理安全系统，通过观测代理行为、评估安全防御、检测威胁并阻止不安全操作，保护Cursor、Claude Code等AI编码工具和客户服务代理的安全性，已在Uber生产环境部署，论文被MLSys 2026接收。"
author: "Cheman"
slug: adr
draft: false
categories: ["技术", "安全", "开源"]
tags: ["AI安全", "企业安全", "Uber", "开源", "MLSys", "AI代理"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ADR（Agentic AI Detection and Response）**，这是Uber开源的企业级AI代理安全检测与响应系统，已在Uber生产环境部署，论文被MLSys 2026接收。

## 一、项目概述

ADR是专为企业AI代理设计的安全系统，旨在保护员工使用的AI编码工具（如Cursor、Claude Code、Codex）以及面向客户的AI服务代理。随着AI代理在企业环境中的广泛应用，其安全风险也日益凸显——代理可能被诱导执行危险操作、泄露敏感数据或绕过安全策略。ADR通过观测、评估、检测、预防四个维度，构建了完整的AI代理安全防护体系。

**核心特性：**
- **多平台观测能力**：支持macOS、Linux、Windows三大平台，覆盖Claude Code、Cursor、Codex等7+主流AI编码工具
- **全面攻击覆盖**：ADR-Bench包含300+任务、133个MCP服务器，覆盖全部17种AI代理攻击技术
- **双层级检测架构**：结合高召回率的初始分流与深度代理推理，高效识别可疑会话
- **真实生产验证**：已在Uber大规模生产环境部署运行

## 二、技术原理

### 2.1 四大核心能力

ADR通过四个互补的能力层构建安全防护闭环：

**1. ADR Observability（可观测性）**
- 捕获AI代理的意图、工具调用和执行轨迹
- 统一不同AI工具的遥测数据格式
- 支持内部自动化系统和客户服务代理的监控

**2. ADR Benchmark（基准测试）**
- ADR-Bench包含303个基准任务
- 133个MCP服务器模拟真实企业环境
- 覆盖全部17种已知代理攻击技术
- 提供可复现的评估流程

**3. ADR Detection（威胁检测）**
- 双代理（Dual-Agent）检测架构
- 第一层：高召回率的初始分流（triage）
- 第二层：深度代理推理分析可疑会话
- 平衡检测精度与性能开销

**4. ADR Prevention（威胁预防）**
- 在不安全操作执行前拦截
- 当前开源版本未包含此组件

### 2.2 系统架构

ADR采用模块化设计，主要组件包括：

```
ADR System
├── Sensor/              # 遥测数据收集与标准化
│   ├── Claude Code监控
│   ├── Cursor监控
│   ├── Codex监控
│   └── 统一数据schema
├── Detection/           # 威胁检测与基准测试
│   ├── 双代理检测器
│   ├── ADR-Bench基准任务
│   ├── MCP基础设施
│   └── 检测器baseline
└── docs/               # 文档与可复现性指南
```

### 2.3 检测流程

ADR的双代理检测流程：

1. **数据采集**：Sensor组件从各AI工具收集遥测数据
2. **初始分流**：第一层代理快速识别高风险会话
3. **深度分析**：第二层代理对可疑会话进行深度推理
4. **威胁判定**：综合分析结果判定是否为攻击行为

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.8+
- Git
- Anthropic API密钥（用于检测器）
- OpenAI API密钥（可选，用于baseline测试）

### 3.2 安装步骤

```bash
# 克隆仓库
git clone https://github.com/uber/ADR
cd ADR/Detection

# 安装依赖
uv sync

# 配置API密钥
export ANTHROPIC_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
```

### 3.3 快速测试

```bash
# 使用默认ADR双代理检测器
python -m adr_detector

# 使用LlamaFirewall进行无密钥测试
python -m adr_detector --detector llamafirewall
```

## 四、使用方法与实战

### 4.1 运行基准测试

完整的评估工作流程：

```bash
# 1. 解压打包的基准数据
python scripts/inflate_benchmark.py

# 2. 运行检测器
python -m adr_detector --benchmark ./benchmark

# 3. 生成论文图表
python scripts/plot_figures.py
```

### 4.2 自定义检测任务

ADR支持自定义MCP服务器和检测任务：

```python
# 示例：添加自定义检测任务
from adr_detector import Task, MCPServer

task = Task(
    name="custom_security_test",
    description="测试代理是否能绕过文件权限检查",
    mcp_server=MCPServer.from_config("./custom_mcp.yaml"),
    attack_type="permission_bypass"
)

# 运行检测
detector.run_task(task)
```

### 4.3 集成到现有系统

Sensor组件可独立部署，集成到企业监控体系：

```python
from adr_sensor import Sensor

# 初始化传感器
sensor = Sensor(
    tools=["claude-code", "cursor", "codex"],
    output_format="unified_schema"
)

# 启动监控
sensor.start()

# 获取遥测数据
telemetry = sensor.get_telemetry()
```

## 五、常见问题与解决方案

### 5.1 安装问题

**问题：uv命令未找到**
```bash
# 安装uv包管理器
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**问题：依赖安装失败**
```bash
# 使用pip备选方案
pip install -r requirements.txt
```

### 5.2 运行时错误

**问题：API密钥无效**
- 检查环境变量是否正确设置
- 确认密钥有足够的API配额
- 使用`--detector llamafirewall`进行离线测试

**问题：MCP服务器启动失败**
- 检查端口是否被占用
- 确认Docker容器正常运行（如使用容器化MCP）
- 查看日志文件排查具体错误

### 5.3 性能优化

**优化检测速度：**
- 调整第一层分流器的敏感度，减少需要深度分析的会话数量
- 使用批处理模式处理大规模历史数据
- 在高配置服务器上运行深度分析代理

**降低API成本：**
- 使用缓存机制避免重复分析相同模式
- 调整检测频率，对低风险会话降低分析深度
- 考虑部署本地模型作为第一层分流器

### 5.4 兼容性问题

**问题：特定AI工具不支持**
- 检查Sensor组件的supported_tools列表
- 参考Sensor/README.md添加自定义工具监控
- 提交Issue请求支持新工具

**问题：macOS权限问题**
- 在系统偏好设置中授予必要的辅助功能权限
- 检查Terminal或IDE是否有足够的系统访问权限

## 六、总结

ADR代表了企业AI代理安全领域的前沿实践，其开源为行业提供了宝贵的安全检测基准和实现参考。项目亮点包括：

1. **生产级验证**：在Uber大规模部署，证明其实战价值
2. **全面覆盖**：ADR-Bench涵盖所有已知攻击技术，是目前最全面的基准
3. **双层级架构**：平衡了检测精度与性能开销，适合生产环境
4. **可扩展设计**：模块化架构便于集成和二次开发

对于正在部署AI代理的企业，ADR提供了从观测到检测的完整工具链。安全团队可参考ADR-Bench评估现有防御措施，开发团队可集成Sensor组件实现代理行为监控。

项目地址：[https://github.com/uber/ADR](https://github.com/uber/ADR)

论文：MLSys 2026（[PDF](https://github.com/uber/ADR/blob/main/docs/adr-paper.pdf)）
