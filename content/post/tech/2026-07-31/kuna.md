---
title: "Kuna：用 Rust 重写 Ghidra，一个为 AI Agent 而生的反编译器"
date: 2026-07-31
description: "Kuna 是一个由 LLM 自主迭代打磨的 agent-first 反编译器，用 Rust 从 Ghidra 移植而来，可编译为 WebAssembly 在浏览器中运行，并在控制流结构化指标上逼近 IDA Pro。本文拆解它的分阶段管线设计、可调选项体系与自动精炼闭环。"
author: "Cheman"
slug: kuna
draft: false
categories: ["技术", "开源", "逆向工程"]
tags: ["Kuna", "反编译器", "Rust", "Ghidra", "逆向工程", "LLM Agent", "WebAssembly", "二进制安全"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Kuna**，一个用 Rust 从 Ghidra 移植而来、专门为 AI Agent 使用并由 AI Agent 持续自我精炼的反编译器。它的作者直言：这个项目里几乎每一行代码都是 LLM 写的，但它在控制流结构化这项核心指标上已经能和 IDA Pro 9.2 掰手腕。

## 一、项目概述

### 它是什么

Kuna 是一个**agent-first（以智能体为第一使用者）**的反编译器，由 Noelo Lab 发布，采用 Apache-2.0 协议开源。它最初是 NSA 的 [Ghidra](https://github.com/NationalSecurityAgency/ghidra) 反编译核心的 Rust 移植版本，但在特性集与管线设计上已经与上游产生了明显分叉，并大量借鉴了 angr 反编译器的流水线组织方式。

作者把这个项目定义为一场**实验**：如果让 LLM 基于科学化的评测指标去自动改进一个反编译器，这条路能走多远？

### 它想解决什么问题

传统反编译器（IDA、Ghidra、Binary Ninja）的设计前提是"人坐在 GUI 前面读代码"。但现实正在变化：越来越多的逆向与漏洞挖掘工作由 LLM Agent 直接调用反编译器完成，人类读的是 Agent 的日志而不是伪代码本身。这带来两个错配：

1. **优化目标错了**：GUI、交叉引用面板、图形视图对 Agent 毫无价值，Agent 唯一在乎的是**反编译文本的质量**。
2. **迭代方式错了**：反编译器的特性改进过去依赖资深研究者数年的积累，而 Agent 需要的是能在运行时按场景切换的、可配置的行为。

Kuna 的回答是：把反编译器本身变成 Agent 可读、可改、可调的工程体。

### 核心特性

| 特性 | 说明 |
|---|---|
| 单二进制分发 | 纯 Rust 实现，`kuna` CLI 一个文件跑起来，无 JVM 依赖 |
| 浏览器内运行 | 编译为 WebAssembly，二进制文件不出本机即可反编译 |
| Ghidra GUI 兼容 | 可作为反编译核心嵌入原版 Ghidra GUI |
| 运行时可调选项 | 通过 `--option` 在运行时切换内部特性，专为 LLM 设计 |
| 分阶段管线 | `p0_knowledge` → `p9_emit` 的显式阶段划分 |
| 自然语言规格 | `docs/spec` 中用自然语言描述每个关键算法 |
| 自动精炼闭环 | 基于 DecBench 指标让 LLM 持续自我改进 |

一个值得注意的数据：在 [DecBench](https://decbench.com/) 的基准测试中，Kuna 在 44.4% 的函数上实现了完美的控制流结构化，而 IDA Pro 9.2 是 45.7%。对一个由 LLM 在一个夏天写出来的项目来说，这个差距小得有点吓人。

## 二、技术原理

### 2.1 架构分层

Kuna 的仓库结构本身就是设计文档：

```
decompiler/                 # cargo workspace，引擎本体
├── kuna-decomp/            # 反编译器核心，按阶段分文件夹 p0_knowledge/ ... p9_emit/
├── kuna-analysis/          # 加载器 / 分析器层
├── kuna-sleigh/            # SLEIGH 运行时（指令语义解释）
├── kuna-slacomp/           # SLEIGH 编译器，产出 slacomp 二进制
├── kuna-console/           # decomp_dbg / decomp_test_dbg 调试控制台
├── kuna-cli/               # 用户面 kuna 二进制
├── kuna-ghidra/            # Ghidra 前端集成
└── kuna-wasm/              # 浏览器前端
specs/Ghidra/Processors/    # 供货的 SLEIGH 处理器规格（.sla 为构建产物）
tests/datatests/            # 上游 XML 回归语料：83 文件 / 675 条断言
tests/stages/               # kuna 自有的阶段模型 issue 测试用例
tests/golden/               # 差分黄金向量
docs/spec/                  # 自然语言规格说明
```

这套分层最关键的一点不是"干净"，而是**可定位**：当 LLM 被要求"改进 switch 语句的恢复效果"时，它需要能在几秒钟内确定该改哪个文件。`p0` 到 `p9` 的编号目录，本质上是给 Agent 用的索引。

### 2.2 SLEIGH：架构无关的基石

Kuna 继承了 Ghidra 最有价值的资产——SLEIGH 处理器描述语言。SLEIGH 用声明式语法描述某个 ISA 的指令编码与语义，编译成 `.sla` 后由运行时加载，把机器码翻译为架构无关的 P-Code 中间表示。

这意味着 Kuna 支持一个新架构不需要写 Rust 代码，只需要一份 `.slaspec`：

```bash
make specs   # 用 slacomp 把所有 .slaspec 编译为 .sla
```

后续所有分析阶段（数据流、类型恢复、控制流结构化）都跑在 P-Code 上，与具体 CPU 解耦。这也是为什么一个"port"能这么快达到可用状态：难啃的指令语义部分是可以直接迁移的资产。

### 2.3 分阶段（Phase-based）管线

Kuna 明确要求每个阶段边界清晰，理由写在 README 里：*"give LLMs a better chance at finding features and code when they need to make changes"*。

阶段模型是可运行时查询的，控制台提供了 `stage list / map / catalog` 命令。对 Agent 而言，这相当于一个自省 API：先问"当前有哪些阶段"，再决定往哪个阶段插入新的变换。

粗略对应的经典反编译流水线是这样的：

```
二进制 → 加载/分区 (kuna-analysis)
       → SLEIGH 解码 → P-Code
       → p0 knowledge   知识/先验注入
       → ...            数据流、变量恢复、类型传播、优化
       → p9 emit        C 代码输出
```

### 2.4 Options：给 LLM 的控制面

这是 Kuna 最有辨识度的设计。README 里写得很直接：LLM Agent 应当去读 `./docs/options.md`，那里列出了所有可在运行时切换的特性，以及**它们分别适用于什么症状**（a generated symptom index）。

```bash
# 切换反编译器内部的某个特性——README 明确标注"对 LLM 很有用"
kuna decompile ./a.out main --option compareform canonical
```

这个设计背后的判断非常清醒：不同使用者对"好的反编译结果"定义不同。逆向分析者想要高层次、接近源码的 C；做 pwn 的人想要贴近汇编、能看清栈布局的低层表示。与其在这两者之间选一个折中，不如把它做成开关，让调用方（Agent）按任务自选。

于是"改进反编译器"这件事的形态变了：不是提交一个不可逆的行为变更，而是新增一个带有明确适用症状描述的可选变换。

### 2.5 自动精炼闭环

Kuna 最像论文的部分在这里。作者 Zion Leonahenahe Basque 在[发布博文](https://noelo.org/blog/kuna-release/)中描述了这个循环：

1. 在 DecBench 上跑基准，找出 Kuna 表现劣于 IDA Pro / Ghidra / angr 的函数样本；
2. 让 LLM 研究这些差异案例，推断对方是如何解决该问题的；
3. 生成实现，跑四道测试门禁验证没有回归；
4. 合入为一个新的可配置特性，进入下一轮。

据作者所述，通过这套方法，LLM 在 Kuna 中重新实现了 angr 里超过 20 项基础特性——那些原本是团队用数年科研时间设计出来的东西。

需要强调的是作者自己划的边界：**这不是自动化科研**。这套闭环之所以能转起来，前提是过去几年学界已经建立起了可量化的反编译评估指标（什么叫"结构化得更好"必须先有定义）。没有这些人类研究成果，LLM 连"我哪里差"都判断不了。

### 2.6 质量门禁

在一个"代码基本由 AI 写"的项目里，测试是唯一的锚点。Kuna 定义了四道每次提交前都必须是绿的门禁：

```bash
make test        # 675/675 反编译回归对齐（tests/datatests/ vs docs/baseline.json）
make test-stages # kuna 自有的阶段 issue 用例（vs docs/baseline-stages.json）
make rust-test   # 完整 cargo workspace 测试：单元测试、黄金差分向量、
                 # SLEIGH 编译器 .sla 内容一致性、docs/options.md 新鲜度检查
make check-spec  # docs/spec 诚实性：锚点与代码路径必须能解析，
                 # 且每个阶段目录必须由且仅由一个规格章节负责
```

其中两条特别值得学习：

- **`docs/options.md` 新鲜度检查**被纳入了单元测试。也就是说，代码里加了选项却没更新文档，CI 直接红。对于一个"文档就是 Agent 的 API"的项目，这条约束是刚需。
- **`check-spec` 强制规格与代码目录一一对应**。它防止的是 AI 生成项目最典型的腐化：文档写得很漂亮，但和代码早已对不上。

## 三、安装与快速开始

### 环境要求

- **仅需 Rust 工具链**（`cargo`）——这是相比 Ghidra（需要 JDK + Gradle）最直观的改善
- `make`
- Python 3（仅 `check-spec` 与改进管线脚本需要）

### 从源码构建

```bash
git clone https://github.com/Noelo-Lab/kuna
cd kuna

make binaries   # 构建 decomp_dbg / decomp_test_dbg / slacomp / kuna CLI
make specs      # 用 slacomp 把所有 .slaspec 编译为 .sla（解码器必需）
make            # 等价于 binaries + specs
```

产物全部落在 `decompiler/target/release/`，其中 `kuna` 就是 CLI 入口。

如果只是日常开发，直接在 cargo workspace 里操作更快：

```bash
cd decompiler
cargo build
cargo test --workspace
```

也可以直接下载官方 Release 里的预编译二进制，跳过整个构建过程。

### 最简运行示例

```bash
# 反编译某个符号
kuna decompile ./a.out main

# 剥离符号的二进制，直接按地址反编译
kuna decompile ./stripped.bin 0x401040 --addr

# 反编译整个二进制，产出 .c / .h / .asm 三个文件
kuna decompile-project ./a.out
```

### 零安装：浏览器方案

因为核心是 Rust，Kuna 可以编译成 WebAssembly 直接跑在浏览器里，**全部计算在本地完成，二进制文件不会上传**：

> https://kuna.noelo.org/decompile

对于"临时看一眼某个函数"或者不方便在生产机上装工具的场景，这个入口非常实用。自建站点的代码在 `./integrations/web`。

## 四、使用方法与实战

### 4.1 作为 Ghidra 的反编译核心

Kuna 的输出格式与 Ghidra 保持了很大程度的兼容，因此可以把它作为反编译引擎塞进原版 Ghidra GUI，享受 Ghidra 的项目管理、交叉引用、脚本生态，同时换掉底层的反编译内核：

```bash
cd integrations/ghidra
# 按目录内说明构建扩展，再在 Ghidra 中安装
```

注意：README 明确说明 **Ghidra 的全部特性尚未完全支持**，把它当成一个可以对照实验的替代内核更合适，不建议直接用于关键任务。

### 4.2 按场景切换选项

这是 Kuna 与传统反编译器用法上最大的不同。典型工作流：

```bash
# 1. 先出一版默认结果
kuna decompile ./target.bin sub_401230 > out_default.c

# 2. 结果里的比较表达式形态不理想，切换到 canonical 形式
kuna decompile ./target.bin sub_401230 \
  --option compareform canonical > out_canonical.c

# 3. 对比两版，选更适合当前分析目标的那个
diff out_default.c out_canonical.c
```

如果你在写一个调用 Kuna 的 Agent，正确的做法是把 `docs/options.md` 塞进 Agent 的上下文（或者做成可检索的工具描述）。那份文档带有"症状索引"，Agent 可以按"我看到的输出有什么毛病"反查该开哪个开关。

### 4.3 集成到 LLM 逆向工作流

一个可行的 Agent 编排模式：

```python
import subprocess, json

KUNA = "./decompiler/target/release/kuna"

def decompile(binary: str, symbol: str, options: dict | None = None) -> str:
    cmd = [KUNA, "decompile", binary, symbol]
    for k, v in (options or {}).items():
        cmd += ["--option", k, str(v)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:500])
    return r.stdout

# Agent 循环：拿到伪代码 → 判断可读性 → 不满意就换选项重来
code = decompile("./a.out", "main")
if "看不懂的控制流" in analyze(code):
    code = decompile("./a.out", "main", {"compareform": "canonical"})
```

相比把整个 Ghidra headless 拉起来（JVM 冷启动动辄十几秒），单二进制 CLI 的启动开销可以忽略，这在需要成百上千次调用的 Agent 循环里是决定性的差异。

### 4.4 参与贡献

如果你想给 Kuna 提交代码，务必先读 `AGENTS.md`（它是 `docs/agents.md` 的软链接）。这份文件是**强制性**的贡献规则，同时也是整个文档体系的地图。项目预期大部分代码分析与编写由 Codex、Claude Code 这类 Agent 框架完成，所以规则是写给 Agent 看的。

提交前记得把四道门禁跑全绿。

## 五、常见问题与解决方案

**Q1：`make test` 报错说找不到 `.sla` 文件**

解码器依赖编译后的 SLEIGH 规格。单独跑一次：

```bash
make specs
```

Makefile 里其实已经有兜底逻辑（`test` 目标会检查 `.sla` 是否存在并自动触发 `make specs`），如果仍然失败，检查 `specs/` 目录是否完整、`slacomp` 是否成功构建。

**Q2：构建耗时很长 / 内存吃紧**

这是一个包含多个 crate 的 cargo workspace，release 模式全量构建确实重。开发期建议：

```bash
cd decompiler && cargo build          # debug 模式，编译快得多
make PROFILE=debug binaries           # 或通过 PROFILE 变量控制
```

**Q3：反编译结果和 Ghidra 不一致**

这是预期行为。README 已经说明 Kuna 在特性和管线设计上"has since diverged"，它对齐的是 angr 的流水线组织方式，而不是 Ghidra 的逐位复刻。675 条回归断言保证的是解码与核心行为的正确性，不是输出文本与 Ghidra 完全一致。

**Q4：某个函数反编译效果很差**

按优先级处理：先查 `docs/options.md` 的症状索引，看是否有对应开关可以缓解；如果确实是缺陷，按 README 的要求提 issue。作者明确欢迎 bug 报告——因为每个 issue 都会变成 `tests/stages/` 里的一个测试用例，进而成为自动精炼闭环的输入。你报的 bug 会直接喂给这套自我改进系统。

**Q5：能用在生产级逆向工作中吗？**

谨慎评估。作者本人反复强调这是 experiment：结构化做得不错，但**类型恢复、优化、可重编译性、变量识别**这些维度都还有明显差距。当前更合适的定位是：作为 IDA/Ghidra/angr 的交叉验证工具，或者作为 Agent 工作流里的低成本快速通道。

**Q6：WASM 版本安全吗？会上传我的二进制吗？**

不会。README 明确说明所有计算在本机浏览器内完成（*"This will do all of the work on your machine, which means the binary remains private"*）。如果仍有顾虑，`./integrations/web` 提供了自建站点的完整代码。

## 六、总结

Kuna 的技术价值和它的方法论价值大概各占一半。

技术上，它给出了一个很实在的东西：一个不依赖 JVM、单文件分发、能在浏览器里跑、还能反过来插进 Ghidra GUI 的 Rust 反编译内核。仅这一点对逆向工具链的部署体验就是明显改善。

方法论上，它提出了一个更有意思的问题：**当工具的主要使用者从人变成 Agent，工具应该长什么样？** Kuna 的三个回答值得任何做开发者工具的人参考——阶段边界要显式（让 Agent 能定位代码）、特性要可开关且带症状描述（让 Agent 能选择行为）、文档新鲜度要进 CI（让文档成为可信的 API）。

同时也要看清它的边界。作者自己说得很克制：Kuna 建立在数十年反编译研究的积累之上，它的自动精炼之所以能启动，是因为人类先定义好了"什么叫更好"；这不是自动化科研，而是**由人类科研指引的自动化工程**。控制流结构化 44.4% vs IDA 45.7% 是漂亮的数字，但类型恢复、变量识别、可重编译性这些硬骨头还都在前面。

对于一个"每一行代码几乎都由 LLM 写就"的项目来说，最让人意外的不是它跑得多快，而是它的工程纪律有多严——675 条回归断言、规格诚实性检查、文档新鲜度门禁。这大概才是这个实验里最值得抄的部分：**你允许 AI 写多少代码，取决于你能自动验证多少代码。**

---

**项目地址**：https://github.com/Noelo-Lab/kuna
**在线体验**：https://kuna.noelo.org/decompile
**开源协议**：Apache-2.0（衍生自 Ghidra，含 angr 移植部分 BSD-2-Clause）
