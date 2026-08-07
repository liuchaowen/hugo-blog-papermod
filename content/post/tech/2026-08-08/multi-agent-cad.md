---
title: "MAC (Multi-Agent CAD)：用 1% 的 Token 生成可 3D 打印的模型"
date: 2026-08-08
description: "清华 IEI Lab 开源的 Multi-Agent CAD 框架，用 4 个 Agent + LangGraph 状态机把文本转 CAD 的 Token 消耗压到 1/116、成本降到 1/13，特征通过率反而提升到 99.3%。本文深入解析其结构化状态传递、确定性翻译器与白盒可审计设计。"
author: "Cheman"
slug: multi-agent-cad
draft: false
categories: ["技术", "开源", "AI Agent"]
tags: ["GitHub", "Multi-Agent", "LangGraph", "CAD", "build123d", "LLM", "3D打印", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Multi-Agent-CAD（MAC）**，来自清华大学 IEI Lab——它把「自然语言直接生成可 3D 打印模型」这件事的 Token 成本砍到了原来的 1/116，而特征通过率反而从 97.9% 提升到 99.3%。

## 一、项目概述

### 项目解决什么问题

近两年基于 LLM 的 text-to-CAD Agent 已经能生成相当复杂的模型，但它们有一个共同的痛点：**推理过程极其昂贵**。

原因在于 CAD 生成本质上是一个多轮迭代过程：生成代码 → 执行 → 分析报错 → 修复 → 再生成。一个"朴素"的单 Agent 实现，每一轮都会把完整对话（用户 prompt + build123d 文档 + 报错堆栈 + 历史修复记录）重新塞进上下文，于是 Token 随迭代轮次呈指数级增长。

MAC 作者给出了一组扎心的数据：在一个 10 条 prompt 的基准测试上，单 Agent 方案烧掉了 **1.039 亿 Token、1307 次 API 调用**。

MAC 的核心判断是：**瓶颈不在于 CAD 能力，而在于推理组织方式的低效**。

### 核心指标对比

| 指标 | CAD Skills（单 Agent 基线） | **MAC** | 优势 |
|---|---:|---:|---:|
| 总 Token | 103,950,189 | **896,340** | **116× ↓** |
| 总成本（CNY） | ¥125.69 | **¥9.67** | **13× ↓** |
| API 调用次数 | 1,307 | **50** | **26× ↓** |
| 特征通过率 | 97.9% (138/141) | **99.3%** (140/141) | ↑ |

基线来自 [earthtojake/text-to-cad](https://github.com/earthtojake/text-to-cad)，10 条 benchmark prompt（P1–P10）也直接沿用该项目，属于同题对比而非自选样本。

### 核心特性一览

- **4 Agent 解耦**：需求解析 / 几何设计 / 代码生成 / 自主修复，各司其职
- **结构化状态传递**：Agent 之间只传 JSON 快照，不传对话历史
- **确定性翻译器**：常见 CAD 操作零 Token 成本，不走 LLM
- **白盒可审计**：每个中间产物都落盘，人可读、可介入、可覆盖
- **混合路由**：4 个阶段可各自挂不同模型，甚至换成本地小模型
- **多体可动打印件**：支持 print-in-place 的免装配活动结构（0.4–1mm 间隙控制）

项目基于 [build123d](https://github.com/gumyr/build123d) B-rep CAD 内核 + [LangGraph](https://langchain-ai.github.io/langgraph/) 状态机 + [Aider](https://aider.chat/) 代码修复引擎，MIT 协议，Python 3.11+。

## 二、技术原理

### 2.1 四阶段流水线架构

MAC 用一个 LangGraph 状态机把生成过程拆成 4 个 Agent：

| 阶段 | Agent | 输入 | 输出 |
|---|---|---|---|
| 1 | **Spec Planner** | 自然语言请求 | `CADBrief` JSON（仅 3 个校验目标） |
| 2 | **Geometric Architect** | `CADBrief` | `ArchitectPlan` JSON（草图、步骤、选择器） |
| 3 | **Python Coder** | `ArchitectPlan` | `temp_design.py`（确定性翻译优先，Aider 兜底） |
| 4 | **Autonomous Skill Loop** | 代码 + STEP/STL | 最终 STEP + 双引擎 QA 报告（Aider 修复循环） |

关键设计在于：**每个 Agent 只看到它这个角色所需的那一小份结构化快照，不存在共享的臃肿上下文**。

这带来一个额外的好处——**幻觉传播在阶段边界被切断**。即便某个 Agent 出错，下一阶段接手的是结构化输出（一份 JSON），而不是上一个 Agent 的叙述性推理过程。错误不会被"复述放大"。

### 2.2 为什么 Token 效率是核心指标

这一点值得展开。传统单 Agent 的 Token 增长模式大致是：

```
轮次 1: [prompt + 文档] → 代码
轮次 2: [prompt + 文档 + 代码1 + 报错1] → 代码2
轮次 3: [prompt + 文档 + 代码1 + 报错1 + 代码2 + 报错2] → 代码3
...
```

上下文长度随轮次线性累加，而每轮都要重新计费整个上下文，于是**总 Token 呈平方级增长**。CAD 这种需要反复几何校验的场景，10 轮迭代是常态，成本从几分钱飙到几美元。

MAC 的做法是把"上下文重放"换成"结构化状态传递"：

- Spec Planner 只读用户请求
- Architect 只读 `CADBrief`
- Coder 只读 `ArchitectPlan`
- Aider 只读 QA 错误报告 + `build123d_reference.md`

**没有任何一个 Agent 需要重读完整对话历史。** 指数增长被拉成线性。

### 2.3 确定性翻译器：把 LLM 从常规工作中解放出来

这是我认为整个项目里最漂亮的一处设计。

Coder 阶段的工作本质是"读 JSON，写代码"——这其实是一个**确定性映射**，根本不需要 LLM。MAC 实现了一个 `_plan_to_code` 翻译器（在 `multi_agent_cad/nodes.py` 中），直接把 `ArchitectPlan` 翻译成 build123d 代码，**Token 成本为零**。

支持的操作覆盖了绝大多数常规 CAD 需求：

```
extrude / revolve / hole
boolean_union / boolean_cut
pattern_linear / pattern_circular
mirror / fillet / chamfer / shell
```

只有翻译器不支持的步骤类型（`draft`、`rib`、没有 `control_points` 的自定义多边形）才会输出 `# TODO_AIDER` 占位符，交给 Aider 填补。

换句话说：**常规几何操作走翻译器，LLM 只在边缘情况被唤醒**。这是 116× Token 削减的关键之一，也是「混合路由」思想的极致形态——Coder 阶段的模型调用直接降到了 0。

### 2.4 混合路由：每个阶段自选模型

单 Agent 架构下，你被迫用一个"全能型"贵模型处理所有任务：需求解析、几何设计、代码生成、错误修复。

MAC 解耦后，`config.py` 里的 `SPEC_PLANNER_*` / `ARCHITECT_*` / `CODER_*` / `AIDER_*` / `REPAIR_*` 各自独立配置 `MODEL` / `TEMPERATURE` / `MAX_TOKENS` / `KWARGS`：

- **Spec Planner**（需求解析）——"读一段话，输出结构化 JSON"，挂个便宜的轻量模型甚至本地小模型足够
- **Geometric Architect / Python Coder**——需要空间想象和算法推理，用强模型（如 qwen3.7-max）
- **Aider Repair**——换 Claude/GPT（代码能力更强），或者训一个专门修 build123d 的本地模型

更进一步的意义在于：**因为阶段之间只通过结构化 JSON 交接，任何一个阶段都可以被你自己训练的专用本地模型替换，而不影响其他阶段**。比如训一个只读 `CADBrief`、输出 `ArchitectPlan` 的小模型，把 Architect 阶段的单次成本从约 ¥0.5 降到接近 0。

这在单 Agent 架构里是做不到的——单 Agent 的 prompt 和上下文深度耦合，你无法只换其中一块。

### 2.5 白盒透明性与双引擎 QA

MAC 的每一个中间产物都会序列化到磁盘：

| 文件 | 内容 |
|---|---|
| `pipeline_cache/cad_brief.json` | Spec Planner 输出的结构化需求 |
| `pipeline_cache/architect_plan.json` | 几何方案（草图、步骤、选择器） |
| `temp_design_0.py` | 生成的 build123d 源码 |
| `temp_output_0.step` / `.stl` | 最终模型 |
| `temp_measurements_0.json` | 白盒特征尺寸测量 |
| `temp_missed_0.json` | 运行时诊断（`MISSED_CUT` / `FILLET_FAILED` / `CHAMFER_FAILED`） |

QA 阶段是"双引擎"的：Engine A 走 B-rep 特征测量（`temp_measurements`），Engine B 走 STL 网格分析（trimesh + rtree）。两路互相印证，比单纯"代码跑通了"要严格得多。

更实用的是**迭代检查点**：每轮 QA 结束后，终端会打印 STEP/STL 路径、QA 状态，并给你 10 秒窗口选择：

- `1` 自动迭代（超时默认）
- `2` 注入变更需求（你的文字会**原样前置**到 Aider 修复 prompt）
- `3` 停止并保留当前产物

这意味着即便 QA 判定"通过"，你也能人工覆盖并继续打磨。

## 三、安装与快速开始

### 环境要求

- Python 3.11+
- 推荐使用 conda（原因见下）
- 一个 OpenAI 兼容的 LLM API endpoint

### 推荐路径：conda

```bash
git clone https://github.com/Pan-Chera/Multi-Agent-CAD
cd Multi-Agent-CAD
conda env create -f environment.yml
conda activate multi_agent_cad
```

conda 路径能从 conda-forge 拿到 `trimesh`、`rtree` 的预编译包，`OCP` 由 `build123d` 通过 `cadquery-ocp-novtk` 传递引入，省心。

### 纯 pip 的依赖冲突与解法

这里有个坑值得单独说：`aider-chat` 把 numpy 钉在 `1.26.4`，而 `build123d>=0.8` 要求 `numpy>=2,<3`——纯 pip 会直接 `ResolutionImpossible`。

项目给了一个在 macOS arm64 + Python 3.11 上验证过的绕行方案：

```bash
python3.11 -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\activate
pip install --upgrade pip

# 先装 aider（拉入 numpy 1.26.4 及传递依赖），再强制升级 numpy
pip install "aider-chat==0.82.3"
pip install --no-deps --force-reinstall "numpy>=2,<3"

pip install "build123d>=0.8" "langgraph>=0.2,<0.3" "langgraph-checkpoint>=2.0,<3.0" \
            "pydantic>=2.5" "openai>=1.20.0" "anthropic>=0.30" \
            "trimesh>=4.0" "rtree>=1.1" "scipy>=1.10" "scikit-learn>=1.3" \
            "fastapi>=0.110" "uvicorn[standard]>=0.27" "ipython>=8.15" "pytest>=7.4"

# --no-deps 跳过 pyproject.toml 里 numpy 版本约束的二次校验
pip install --no-deps -e .
```

作者的说明是：aider 0.82.3 在 numpy 2.x 上实测能正常 import，上游那个 pin 属于过度保守。

> ⚠️ **Windows 用户不要用这个 pip 绕行方案**，`trimesh` / `rtree` 的原生 wheel 在 Windows 上不可靠，老老实实用 conda。

### 配置 API Key 与 Provider

MAC 通过 **OpenAI 兼容接口**调用模型，默认指向阿里云 DashScope（`qwen3.7-max`）。改两个字段就能换任意 provider：

```python
# multi_agent_cad/config.py
DS_BASE_URL = "https://api.openai.com/v1"
SPEC_PLANNER_MODEL = ARCHITECT_MODEL = CODER_MODEL = REPAIR_MODEL = "gpt-5.6"

# 关闭 Qwen 专有的 thinking 开关
SPEC_PLANNER_KWARGS = ARCHITECT_KWARGS = CODER_KWARGS = REPAIR_KWARGS = {}

# Aider 阶段用 litellm 前缀的模型名
AIDER_MODEL = "openai/gpt-5.6"
```

然后导出密钥（环境变量名是历史遗留，接受任何 OpenAI 兼容 key）：

```bash
export DASHSCOPE_API_KEY="sk-..."              # bash / zsh
# PowerShell:  $env:DASHSCOPE_API_KEY = "sk-..."
```

各 provider 的配置参考：

| Provider | `DS_BASE_URL` | 示例模型 |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-5.6` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-v4-pro` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-3.6-flash` |
| 本地 Ollama | `http://localhost:11434/v1` | `qwen3-coder:32b`（无需 key） |
| Anthropic Claude | 经 OpenRouter / LiteLLM 网关 | `claude-sonnet-4-6` |

> 注意：README 中的模型 ID 仅为示意，实际使用前请到对应 provider 文档核对当前在服的模型名。

改坏了配置想恢复默认：

```bash
python -m multi_agent_cad._config_defaults --reset
```

### 最简运行

```bash
python -m multi_agent_cad.graph
```

跑完在仓库根目录会看到 `temp_output_0.step` / `.stl`、`temp_design_0.py`、`temp_measurements_0.json`、`temp_missed_0.json`。

## 四、使用方法与实战

### 4.1 两种运行方式的取舍

| | 终端 | Web UI |
|---|---|---|
| 适合场景 | 运行中途干预 | 视觉反馈，更直观 |
| 中途注入变更 / 中止 | ✅ 每轮 QA 有 10 秒检查点 | ❌ 只能自动迭代 |
| 3D 预览 | ❌ 需外部查看器打开 STEP/STL | ✅ 浏览器内 `<model-viewer>` + 一键下载 |
| 配置编辑 | 改 `config.py` | 填表单 |
| 输出位置 | 仓库根目录（`temp_*`） | 每任务独立临时目录（可选复制到指定路径） |

我的建议是：**调试期用终端**（干预能力是核心价值），**演示期用 Web UI**。

### 4.2 终端入口

```bash
# 原始工作流：确定性 coder 优先，Aider 兜底
python -m multi_agent_cad.graph

# 改文件工作流：把 USER_REQUEST 当作修改需求，作用于已有的 temp_design*.py
python -m multi_agent_cad.graph_aider
```

两个入口都会把 LangGraph 事件流式打到终端。`graph_aider` 特别有用——当你已经有一版模型，只想"把孔径改成 12mm"时，不必从头跑整条流水线。

### 4.3 Web UI

```bash
pip install -e ".[web]"          # 加装 fastapi + uvicorn
python -m multi_agent_cad.web    # 默认监听 http://0.0.0.0:8000
```

> ⚠️ **安全提示**：Web UI 会在服务端执行 LLM 生成的 `.py` 代码，作者明确标注为**单用户、可信网络内使用**。远程访问务必走 SSH 隧道：
>
> ```bash
> ssh -L 8000:localhost:8000 user@server
> ```
> 然后本地打开 `http://localhost:8000`，不要直接把 8000 端口暴露到公网。

### 4.4 缓存机制（省钱关键）

`pipeline_cache/` 会缓存前两个阶段的输出：

| 文件 | 来源 | 用途 |
|---|---|---|
| `cad_brief.json` | Spec Planner（阶段 1） | 结构化后的需求 |
| `architect_plan.json` | Geometric Architect（阶段 2） | 几何方案 |

**同一 prompt 重跑**：直接 `python -m multi_agent_cad.graph`，缓存命中，跳过前两个 LLM 阶段，从 Python Coder 开始并重置修复循环。上一轮 QA 挂了、或 Aider 修歪了的时候特别有用——同样的方案，重开一局，秒级而非分钟级。

**⚠️ 换新模型时的坑**：缓存**只检查文件是否存在，不校验 `USER_REQUEST` 是否变了**。所以改了 prompt 但没清缓存，你拿到的还是旧模型。务必先清：

```bash
rm pipeline_cache/cad_brief.json pipeline_cache/architect_plan.json
```

或者在 `multi_agent_cad/graph.py` 的 `get_default_initial_state` 里设 `force_refresh: True` 绕过。

### 4.5 自定义 prompt

编辑 `config.py` 的 `USER_REQUEST`：

```python
USER_REQUEST = "Create a single solid circular flange as a STEP model in millimeters. The flange is a cylinder with an outside diameter of 80 mm and a thickness of 10 mm. Add a central vertical through-bore with diameter 30 mm."
```

从这个示例能看出**好 prompt 的写法**：明确单位（millimeters）、明确输出格式（STEP model）、明确是否单体（single solid）、给出精确尺寸。CAD 生成对模糊描述极其敏感，"做个法兰盘"这种 prompt 只会浪费 Token。

### 4.6 进阶：免装配的可动打印件

这是 MAC 展示的最硬核场景——**print-in-place 多体可动模型**：多个独立实体共存于一个 STEP 中，彼此留 0.4–1mm 间隙，打印出来直接就能动，无需装配。

难点不只是"分别建模每个实体"，更在于**精确控制间隙**，让运动副真的能转起来。两个官方示例：

**笼中球（Ball-in-Cage）**
- 40mm 立方笼，内部 16mm 半径球形空腔，居中于原点
- 15mm 半径实心球——四周与笼内壁留 1mm 间隙
- 六个面各开 12mm 半径通孔，球可见可触

**可动陀螺仪（Articulable Gyroscope）**
- 外环：外径 30mm / 内径 23mm，高 10mm，位于 XY 平面
- 沿 X 轴穿过外环的两个 2.4mm 半径枢轴孔
- 内转子：外径 22mm / 内径 15mm，高 10mm，8 个内凹槽
- 两根枢轴销（2.0mm 半径，6mm 长）向外伸入外环孔
- **0.4mm 径向间隙**让内环绕 X 轴自由 360° 旋转

注意这些 prompt 的共同点：**每一个约束都是可测量的数值**。这正是 MAC 白盒 QA 能工作的前提——`temp_measurements_*.json` 会逐项测量这些特征，不达标就触发 Aider 修复。

### 4.7 Benchmark 参考成本

P1–P10 单条 prompt 的成本对比（CAD Skills → MAC，CNY）：

| 零件 | 基线 | MAC | 降幅 |
|---|---:|---:|---:|
| P1 矩形块带 4 通孔 | ¥5.53 | ¥0.31 | 17.8× |
| P2 圆形法兰 | ¥8.07 | ¥0.34 | 23.7× |
| P3 L 形支架 | ¥13.07 | ¥1.08 | 12.1× |
| P4 阶梯轴 | ¥6.53 | ¥0.57 | 11.5× |
| P5 开顶壳体 | ¥2.88 | ¥0.36 | 8.0× |
| P6 航空叉形支架 | ¥15.21 | ¥3.10 | 4.9× |
| P7 星型发动机缸体 | ¥17.42 | ¥0.53 | 32.9× |
| P8 离心叶轮 | ¥32.75 | ¥1.20 | 27.3× |
| P9 微型螺旋楼梯 | ¥12.80 | ¥1.45 | 8.8× |
| P10 行星齿轮组 | ¥11.43 | ¥0.73 | 15.7× |
| **合计** | **¥125.69** | **¥9.67** | **13.0×** |

有意思的是降幅的分布：**P7 星型发动机缸体（32.9×）、P8 离心叶轮（27.3×）这类高度规则、大量阵列/旋转特征的零件降幅最大**——因为它们几乎完全走确定性翻译器（`pattern_circular`、`revolve`）。而 P6 航空叉形支架只有 4.9×，说明它包含较多翻译器不支持的异形特征，仍需 Aider 介入。

这条规律对使用者很有指导意义：**你的零件越"工程化"（规则阵列、标准特征），MAC 的收益越大**。

## 五、常见问题与解决方案

### Q1: `pip install -r requirements.txt` 报 ResolutionImpossible

**这是预期行为**，`requirements.txt` 是一份参考清单而非可直接安装的锁文件。`aider-chat` 钉 `numpy==1.26.4`，`build123d>=0.8` 要 `numpy>=2,<3`，纯 pip 无解。

→ 用 conda（`conda env create -f environment.yml`），或走 §3 的 pip 绕行方案。

### Q2: Windows 上 trimesh / rtree 安装失败

Windows 的原生 wheel 不可靠。**必须用 conda**，`environment.yml` 开箱即用。

PowerShell 设 key：`$env:DASHSCOPE_API_KEY = "sk-..."`；cmd.exe：`set DASHSCOPE_API_KEY=sk-...`。

Web UI 在 conda 环境下 `pip install -e ".[web]"` 可用，`uvloop` 会在 Windows 上自动跳过。作者说明 Windows 不在 CI 中，但代码避开了 Unix-only API 并全程 UTF-8。

### Q3: 改了 prompt 却生成了旧模型

**缓存没清**。这是 MAC 最容易踩的坑——缓存只判断文件存在性，不比对 `USER_REQUEST`。

```bash
rm pipeline_cache/cad_brief.json pipeline_cache/architect_plan.json
```

### Q4: 换了 provider 后调用报错

两个常见原因：

1. **`*_KWARGS` 没清空**。默认配置里带着 Qwen 专有的 `enable_thinking` 开关，非 Qwen provider 会拒绝这个参数。→ 设 `*_KWARGS = {}`。
2. **模型 ID 不存在**。README 里的模型名只是示意，务必到 provider 控制台核对当前在服的 ID。

另外 `AIDER_MODEL` 需要 litellm 前缀格式（如 `openai/gpt-5.6`），和其他阶段的裸模型名写法不同，容易漏。

### Q5: QA 一直不通过，Aider 反复修不好

三个应对手段，按推荐顺序：

1. **用检查点介入**：QA 后的 10 秒窗口按 `2`，用自然语言描述问题（如"底部倒角没做出来，请检查 fillet 的边选择器"），你的文字会原样前置到 Aider 的修复 prompt。
2. **看诊断文件**：`temp_missed_0.json` 会把失败分类为 `MISSED_CUT` / `FILLET_FAILED` / `CHAMFER_FAILED`，`temp_measurements_0.json` 给出实测尺寸——对照 prompt 就知道是哪一步偏了。
3. **重开一局**：保留缓存直接重跑，同一份 `ArchitectPlan` 换一次代码生成尝试，成本极低。

如果反复失败集中在同一特征，多半是 **prompt 本身的几何描述有歧义**，回头改 `USER_REQUEST` 比继续修代码更有效。

### Q6: 生成的模型打印出来动不了 / 粘连

多体可动件的间隙没控好。参考官方示例的经验值：**径向运动副 0.4mm，包容式间隙 1mm**。在 prompt 里把间隙作为显式数值约束写出来（"0.4 mm radial clearance"），而不是描述性的"留一点缝隙"。

### Q7: Web UI 能不能开放给团队用

**不建议**。服务端会执行 LLM 生成的 Python 代码，这是一个远程代码执行面。作者定位为单用户 + 可信网络。团队场景请用 SSH 隧道逐人转发，或自行加一层认证与沙箱隔离。

### Q8: 性能感受如何

作者没有做正式的 wall-clock benchmark，但表示在 10 条 prompt 上 MAC 大致比单 Agent 基线快一个数量级（约 10×）。这个数字是**量级估计而非测量值**，逻辑上说得通——Token 少 116×、API 调用少 26×，往返延迟自然大幅下降。

## 六、总结

MAC 这个项目最值得学习的，其实不是它做了 CAD，而是它**把「多 Agent 协作」这件事做对了**。

现在很多 multi-agent 框架的做法是：多个 Agent 共享一个大上下文，互相"对话"。这本质上只是把单 Agent 的 prompt 拆成了几段，Token 没省，反而因为多轮对话变得更贵。

MAC 的三个核心洞察值得抄作业：

1. **Agent 之间应该传结构化状态，不是传对话**。`CADBrief` / `ArchitectPlan` 这种严格 schema 的 JSON，既压缩了 Token，又天然阻断了幻觉传播——下游拿到的是数据，不是别人的推理叙述。

2. **不是所有环节都需要 LLM**。确定性翻译器把"读 JSON 写代码"这个可确定映射的环节从 LLM 手里拿走，直接把 Coder 阶段成本降到 0。这是很多 Agent 系统忽略的——**先问「这一步真的需要模型吗」，再问「用哪个模型」**。

3. **解耦带来的不只是省钱，更是可替换性**。因为交接协议是 JSON，任何一个阶段都能独立换模型、换实现，甚至换成你自己训的小模型。单 Agent 架构下 prompt 和上下文深度耦合，这种"局部替换"根本无从谈起。

至于 CAD 本身，如果你有 3D 打印需求，MAC 目前的形态已经相当可用——尤其是规则的工程零件，成本能降到几毛钱一个。白盒中间产物 + 迭代检查点的设计，也让它不是一个"祈祷式"的黑盒工具，而是可以真正介入调试的工程系统。

需要注意的边界：Web UI 有 RCE 风险不要暴露公网；缓存不校验 prompt 变更是个易踩的坑；Windows 建议走 conda；异形特征（`draft`、`rib`、自定义多边形）仍要依赖 Aider，降本效果会打折。

项目地址：[https://github.com/Pan-Chera/Multi-Agent-CAD](https://github.com/Pan-Chera/Multi-Agent-CAD) （MIT 协议）
