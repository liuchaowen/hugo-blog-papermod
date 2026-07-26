---
title: "Erdős 猜想的 AI 证明工厂：ShouqiaoW/erdos 如何用 AI + Lean 攻克数学难题"
date: 2026-07-26
description: "ShouqiaoW/erdos 是一个用 AI 辅助生成、再用 Lean 形式化验证 Erdős 数学问题的开源项目。以问题 1002 为例，作者证明旋转和的分布收敛到中心柯西分布，呈现「AI 生成证明 → 数值校验 → 机器检查」的三段式工作流，是 AI 与严格数学结合的典型范本。"
author: "Cheman"
slug: erdos
draft: false
categories: ["数学", "开源", "AI"]
tags: ["Erdős", "数学", "Lean", "形式化证明", "AI", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**ShouqiaoW/erdos**，它用 AI 辅助「写」数学证明，再用 Lean 把证明机器检查一遍——把传奇数学家 Paul Erdős 留下的开放问题，逐个变成可验证的成果。

## 一、项目概述

**erdos** 是一个收集并形式化 Erdős 问题的开源仓库。仓库的 README 只有一句话，却信息量十足：

> Proofs of Erdős problems. Each proof has been carefully checked for correctness with the help of AI. Some have also been formalized and machine-checked in Lean, and formalization of the rest is in progress.

要点有三层：

- **AI 辅助生成**：每个问题的证明都是在 AI 帮助下完成的，再由人工仔细核对正确性。
- **Lean 形式化验证**：部分证明已用 [Lean 4](https://lean-lang.org/) 完成机器检查（machine-checked），其余正在进行中。
- **问题驱动组织**：仓库以问题编号为目录（如 `1002`、`1038`、`390`、`486`、`536`、`788`），每个目录对应一个具体的 Erdős 问题。

每个问题目录下通常包含：

| 文件 | 作用 |
|------|------|
| `paper.tex` / `paper.pdf` | 人类可读的证明论文（LaTeX 源 + 编译后的 PDF） |
| `prompt.md` | 喂给 AI 的问题陈述与「解题要求」提示词 |
| `lean/` | Lean 4 形式化工程（部分问题才有） |
| `numerical_verifier.py` | 数值验证脚本（部分问题才有） |

这种「论文 + 提示词 + 形式化代码」三位一体的结构，让每个结论都既能被人读懂、又能被机器验证。

## 二、技术原理

### 2.1 一个具体案例：Erdős 问题 1002

问题 1002 问的是：对实数 α，记 `{t} = t − ⌊t⌋` 为小数部分；定义

```text
f(α, n) = (1 / log n) · Σ_{1 ≤ k ≤ n} ( 1/2 − {kα} )
```

并把 `F_n(c)` 定义为满足 `f(α, n) ≤ c` 的 α ∈ (0,1) 的 Lebesgue 测度。问题是：**当 n → ∞ 时，`F_n(c)` 是否对每个实数 c 都点态收敛到某个非降函数 g(c)？**

注意这里严格要求「每个 c 都点态收敛」，而不是更弱的「依分布收敛（只需在连续点收敛）」。仓库里的 `prompt.md` 把这一要求写得非常硬：明确禁止用更弱的标准替代，也不许额外假设 g 的连续性。

### 2.2 结论：收敛到中心柯西分布

形式化工程 `1002/lean/Erdos1002/Statement.lean` 把结论直接写成 Lean 命题。核心定义如下：

```lean
/-- 中心化的锯齿函数，Erdős 问题 1002 的核心。 -/
def sawtooth (x : ℝ) : ℝ :=
  (1 : ℝ) / 2 - Int.fract x

/-- 从 k = 1 到 N 的旋转和。 -/
def rotationSum (N : ℕ) (α : ℝ) : ℝ :=
  ∑ k ∈ Finset.Icc 1 N, sawtooth ((k : ℝ) * α)

/-- 问题中出现的归一化。 -/
def normalizedRotationSum (N : ℕ) (α : ℝ) : ℝ :=
  rotationSum N α / Real.log (N : ℝ)

/-- (0,1) 上均匀 Lebesgue 测度下的有限 N 分布函数。 -/
def distributionValue (N : ℕ) (c : ℝ) : ℝ :=
  (volume
    {α : ℝ | α ∈ Ioo (0 : ℝ) 1 ∧ normalizedRotationSum N α ≤ c}).toReal

/-- 尺度为 1/(2π) 的中心柯西分布函数。 -/
def cauchyLimitCDF (c : ℝ) : ℝ :=
  (1 : ℝ) / 2 + (1 / Real.pi) * Real.arctan (2 * Real.pi * c)

/-- 论文声称的 Erdős 问题 1002 的肯定性结论。 -/
def Erdos1002Conclusion : Prop :=
  ∀ c : ℝ,
    Tendsto (fun N : ℕ => distributionValue N c) atTop
      (nhds (cauchyLimitCDF c))
```

也就是说，答案是**肯定**的：归一化旋转和的分布函数逐点收敛到

```text
g(c) = 1/2 + (1/π) · arctan(2π c)
```

——一个中心柯西分布（尺度 `1/(2π)`）。这是一个既优雅又有物理/数论含义的结果：看似混沌的旋转和，在归一化后竟稳定地服从柯西律。

### 2.3 形式化工程的规模

打开 `1002/lean/Erdos1002.lean`，你会看到一份惊人的 import 清单——主文件一口气 `import` 了 **180 多个子模块**，从 `Erdos1002.Sawtooth`、`Erdos1002.FourierSeries` 一路延伸到 `Erdos1002.PoissonFactorialConvergence`、`Erdos1002.VerifiedMain`、`Erdos1002.OfficialStatementBridge`。

支撑这套工程的是标准的 Lean 4 工具链，配置在 `lakefile.toml`：

```toml
name = "erdos1002"
version = "0.1.0"

[leanOptions]
autoImplicit = false
relaxedAutoImplicit = false
warningAsError = true

[[require]]
name = "mathlib"
scope = "leanprover-community"
rev = "v4.27.0"
```

`lean-toolchain` 固定为 `leanprover/lean4:v4.27.0`，依赖 `mathlib`（Lean 社区数学库）的 `v4.27.0`。`warningAsError = true` 意味着任何编译警告都会让构建失败——对形式化数学来说，这是保证严谨性的必要偏执。

## 三、安装与快速开始

如果你想在本地复现 / 阅读某个问题的形式化证明，以 1002 为例：

### 环境要求

- 安装 [Lean 4 工具链](https://lean-lang.org/lean4/doc/quickstart.html)（推荐用 `elan` 管理，版本由 `lean-toolchain` 自动锁定）
- Git

### 克隆与构建

```bash
git clone https://github.com/ShouqiaoW/erdos.git
cd erdos/1002/lean
lake build          # 拉取 mathlib 并编译整个形式化工程
```

### 阅读证明

```bash
# 查看最终结论定义
cat 1002/lean/Erdos1002/Statement.lean

# 查看人类可读论文
open 1002/paper.pdf
```

若只想快速理解「AI 究竟被要求做什么」，直接读 `1002/prompt.md` 即可——那是喂给模型的完整问题陈述与约束。

## 四、使用方法与实战

### 4.1 读论文 → 读提示词 → 读 Lean 的三段式

这是本项目最有价值的学习路径：

1. **`paper.pdf`**：先看人类论文，把握证明的整体思路与结论。
2. **`prompt.md`**：再看喂给 AI 的提示词，理解模型被要求「做什么、不能偷懒成什么样」。
3. **`lean/`**：最后钻进形式化代码，看每一步推理如何被严格证明。

### 4.2 数值验证作为「双重保险」

并非所有问题都只有论文 + Lean。以问题 `390` 为例，目录下多了一个 `numerical_verifier.py`（约 8 KB），用数值计算对论文结论做独立校验。这种「AI 生成证明 → 数值脚本抽查 → Lean 机器检查」的组合，极大降低了纯靠模型「看起来对」带来的风险。

### 4.3 如何利用这个项目

- **数学爱好者**：把它当作一份「AI 时代如何攻开放问题」的活教材，学习如何把模糊的猜想转写成可验证的命题。
- **Lean 学习者**：180 多个子模块是极佳的大规模形式化范例，能学到模块划分、引理组织、`mathlib` 实战用法。
- **AI 工程方向**：`prompt.md` 展示了「如何写提示词，防止模型用弱条件蒙混过关」的严谨范式。

## 五、常见问题与解决方案

**Q：Lean 构建太慢 / 拉取 mathlib 失败？**  
`lake build` 首次会下载并编译整个 `mathlib`，耗时可能数十分钟。确保网络可访问 GitHub，并预留足够磁盘空间；可先用 `lake update` 检查依赖版本是否匹配 `v4.27.0`。

**Q：`warningAsError = true` 导致编译失败？**  
这是工程的有意设置。遇到未使用变量、命名不匹配等警告时，需显式清理或 `/- ... -/` 标注，不能用 `#lint` 忽略。形式化数学对「零警告」的执念正是其可信度的来源。

**Q：只有部分问题有 `lean/` 目录？**  
README 已说明：形式化是「进行中」状态。有 `lean/` 的是已机器检查的问题，其余目前仅有人工核对的论文。可以把它当作一个持续生长的活仓库来关注。

**Q：能直接运行 `numerical_verifier.py` 吗？**  
可以在本地 `python3 390/numerical_verifier.py` 复现数值校验，但需自行确认脚本所需的依赖（如 `numpy`），仓库未提供 `requirements.txt`。

## 六、总结

**erdos** 最打动人的地方，是它把「AI 写数学」和「机器严格验证」真正缝合在了一起：AI 负责拓展人类思维的边界，Lean 负责守住正确性的底线。相比单纯让大模型生成一段看似合理的证明，这种「论文 + 提示词 + 形式化」的范式，才是 AI 辅助基础科学研究更可信的形态。

> GitHub 地址：https://github.com/ShouqiaoW/erdos
