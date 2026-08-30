---
title: "Sprix SAGE Router：面向开放 A2A 网络的检查点感知式中途重路由"
date: 2026-08-31
description: "Sprix SAGE Router 是屿智同行 Sprix AI 开源的 A2A 决策层路由，能在任务执行中途基于已完成 DAG 节点、可复用产物、预算与截止时间，决定继续、协作还是交接。本文解析其算法、A2A 集成与基准实验。"
author: "Cheman"
slug: sprix-sage-router
draft: false
categories: [开源, 技术]
tags: [A2A, 多智能体, GitHub, 开源, 技术研究]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Sprix SAGE Router**——它想解决多智能体协作里最棘手的一个问题：当任务已经跑了一半，到底该让原智能体继续、临时拉人协作，还是整体交接给更合适的专家？

## 一、项目概述

SAGE（State-Aware Graph Exchange，状态感知图交换）是屿智同行（Sprix AI）开源的一个**决策层路由**，定位在 A2A（Agent2Agent）协议发现与任务执行之间。A2A 负责告诉你「有哪些 Agent、它们的能力卡片是什么、如何收发消息与产物」，而 SAGE 回答的是更难的运行期问题：**执行已经开始之后，究竟该谁和谁一起把任务做完，以什么模式，为什么？**

它把中途路由收敛为三种互斥但不对等的可审计动作：

| 路由 | 所有权归属 | 适用场景 |
|---|---|---|
| **SELF**（继续） | 现任 Agent | 现有能力与已积累的上下文已足够 |
| **COLLABORATE**（协作） | 现任保留所有权 | 一个小型互补团队即可补齐缺失能力 |
| **HANDOFF**（交接） | 对等同仁接管全部所有权 | 专家优势超过上下文迁移损耗 |

项目当前是 **Research Preview（研究预览）**，无运行时依赖、仅需 Python 3.10+，核心代码集中在 `sprix_sage.py`、`sprix_learning.py`、`sprix_types.py`、`sprix_a2a.py` 四个模块，并配套了完整的基准套件与可控干预实验。

## 二、技术原理

### 2.1 检查点感知的「续作价值」

传统路由往往把「要不要换人」当成 0/1 决策。SAGE 的关键洞察是：**任务中途的可复用产物（artifact）与已完成节点，决定了接手方真正需要重做多少工作**。

对任务需求 \(r\)，SAGE 把全局信任与需求条件信任融合为校准能力 \(\bar q_{a,r}\)，其中复用比例 \(\eta_r\) 取决于当前所有者是否已变更，以及产物的可迁移性 \(\tau_r\)：

\[
\eta_r=\begin{cases}f_r,&\text{owner retained}\\f_r\tau_r,&\text{owner changed}\end{cases},\qquad
\bar q_{a,r}=\eta_r q^{\mathrm{current}}_r+(1-\eta_r)q_{a,r}
\]

这里 \(f_r\) 是当前所有者已完成的需求比例，\(\tau_r\) 是产物可迁移性。只有被分配的所有者才贡献需求覆盖（避免了 noisy-OR 式「加人就有质量增益」的假象），而复用比例同时降低了预估的剩余成本与耗时——**已完成的活不会在成功概率里被重复计费**。

### 2.2 统一效用目标下的联合搜索

SAGE 在权限、预算、截止时间约束下，对三种模式做统一排序：

\[
U(m,S,z,E)=V\hat p_\theta(y=1\mid x,m,S,z,E)-\lambda_c C-\lambda_l L-\lambda_r R-\lambda_h H-\lambda_o O-\lambda_u\mathcal U+\beta\mathcal B
\]

其中 \(z\) 是角色分配，\(E\) 是诱导出的通信拓扑，\(H\) 为上下文迁移损耗，\(O\) 为协调开销，\(\mathcal U/\mathcal B\) 提供不确定性感知的探索。它会**联合搜索校准后的需求所有者与其调度**：同一 Agent 的工作串行化，独立 Agent 的工作可并发，构造完成后再复查团队级成本与关键路径延迟。

### 2.3 需求条件信任与轨迹级证伪

区别于「一个声誉分打天下」的做法，SAGE 按**每个 Agent、每个需求**维护可靠性，而不是假设某一项声誉能跨技能迁移。同时，一个独立的 evaluator 会回放检查点，从产物复用、新增成本、恢复延迟、浪费工时与最终质量打分——**它完全不调用 SAGE 自己的切换方程**，从而构成轨迹级的可证伪性。

### 2.4 A2A 集成映射

生产集成通过 `sprix_a2a.py` 把协议与市场信号翻译进 SAGE：

| A2A / 市场信号 | SAGE 表示 |
|---|---|
| `AgentCard.skills` | 归一化能力向量 |
| 安全需求 | 硬性 `permissions` 资格过滤 |
| 支持的输入/输出模式 | 打分前兼容性过滤 |
| 任务状态、产物、失败 | `ExecutionState`、活跃所有权、已完成节点、在途质量/进度、单产物可迁移性 |
| Provider quote | `Bid(cost, latency, confidence)` |
| 已完成任务评估 | 上下文信任、显式配对证据、成功模型、报价保真度更新 |

该适配器会把选中的路由转换成**传输中立（transport-neutral）**的 `ExecutionPlan`，包含所有权、分配、DAG 依赖、通信边、预估资源与理由。注意当前原型刻意**不传输任务、不鉴权端点、不校验签名**——这些仍由调用方 A2A 客户端负责。

## 三、安装与快速开始

无第三方运行时依赖，克隆即用：

```bash
git clone https://github.com/wang2122/sprix-sage-router.git
cd sprix-sage-router
python demo.py
```

运行验证套件（保证数学与调度逻辑正确）：

```bash
python -m unittest -v
python benchmark.py
python benchmark_dynamic.py
python benchmark_trust.py
```

## 四、使用方法与实战

下面是一段最小可用示例，展示如何在任务执行到一半时做检查点感知路由：

```python
from sprix_sage import (
    Agent, ExecutionOutcome, ExecutionState, Requirement, SAGERouter, Task,
)

agents = [
    Agent("planner", {"planning": 0.92, "coding": 0.55}, cost=0.08, latency_ms=900),
    Agent("coder",   {"planning": 0.35, "coding": 0.96}, cost=0.12, latency_ms=1200),
]

task = Task(
    "build-feature",
    requirements=(
        Requirement("planning", 0.4),
        Requirement("coding", 0.6, depends_on=("planning",)),
    ),
    value=1.0, budget=0.30, deadline_ms=4000, progress=0.35,
)

router = SAGERouter(agents, incumbent_id="planner")
state = ExecutionState(
    active_agents=("planner",),
    active_assignments={"planning": "planner", "coding": "planner"},
    completed_requirements=frozenset({"planning"}),
    inflight_requirement="coding",
    inflight_progress=0.35,
    inflight_quality=0.72,
    artifact_transferability={"planning": 0.95, "coding": 0.40},
)

trace = router.route_with_trace(task, state=state)
decision = trace.selected
print(decision.mode, decision.assignments, decision.topology)
print(trace.excluded_agents)

# 执行后用最强可得证据回灌
router.record_outcome(
    decision,
    ExecutionOutcome(
        success=0.9,
        requirement_scores={"planning": 0.95, "coding": 0.86},
        actual_cost=0.19,
        actual_latency_ms=1450,
    ),
)
snapshot = router.export_state()  # 持久化学到的证据
```

`route_with_trace` 返回的 `trace` 不仅给出 `decision.mode` / `assignments` / `topology`，还提供了 `excluded_agents`，让你能审计「为什么某些 Agent 被剔除」。所有基准 CLI 都支持确定性种子与 JSON 输出，便于回归与复现。

## 五、常见问题与解决方案

**Q1：为什么我的 SAGE 总是选 HANDOFF / 频繁切换？**
A：`benchmark_dynamic` 显示「总是交接」策略的切换率为 100%，且浪费工时显著偏高。请检查在途质量 `inflight_quality` 与产物可迁移性 `artifact_transferability`——若现任产物可迁移性低、且专家能力差距大，交接确实更优；但若切换率异常，多半是 `context_transferability` / `handoff_friction` 配置不合理，应调高现任产物可迁移性或降低交接摩擦系数。

**Q2：能否直接接入真实 A2A 端点？**
A：当前原型**刻意不实现**任务传输、端点鉴权与签名校验。`sprix_a2a.py` 仅做 Agent Card 归一化与计划生成，真实的 `message/send`、流式、轮询、取消与安全的产物处理仍由你的 A2A 客户端负责。生产部署还需签名能力元数据、隐私与安全评审、持久化事件驱动恢复等（见 `docs/OPERATIONS.md`）。

**Q3：基准数据能代表真实生产效果吗？**
A：**不能。** 作者明确声明这些合成数字只是回归与证伪证据，两个 evaluator 都是随仓库一起编写的，并非真实端点证据。可发表的评估仍需在异构真实端点上做反复检查点执行，并引入独立治理的产物裁判。

**Q4：运行时依赖有哪些？**
A：参考实现**零运行时依赖**，仅需 Python 3.10+。若出现 `ImportError`，请先确认 Python 版本（`python --version`）。

## 六、总结

Sprix SAGE Router 把一个长期被「发现层」掩盖的运行期难题——**中途该继续、协作还是交接——**形式化为一个可审计、可证伪、可学习的统一效用优化问题。其最大价值不在某一项「发明」，而在于：以检查点感知的续作价值取代粗糙切换、以需求条件信任取代单一声誉、并以独立的轨迹级 evaluator 防止自我粉饰。作为研究预览，它诚实标注了边界（合成基准、无鉴权、无真实端点验证），对正在搭建 A2A / 多智能体调度系统的团队，是一份少见的、把「开关决策」讲清楚的开源参考实现。

- 仓库地址：<https://github.com/wang2122/sprix-sage-router>
- 许可：MIT（© 2026 Sprix AI at 屿智同行）
