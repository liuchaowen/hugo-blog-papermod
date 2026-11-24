---
title: "CLI-Anything：一条命令，把任意软件变成 Agent 原生 CLI"
date: "2026-11-24T12:00:00+08:00"
description: "CLI-Anything 是 HKUDS 开源的 Agent 工具链，用 7 阶段流水线为 GIMP、Blender、LibreOffice 等真实软件自动生成状态化 CLI：原生项目文件做数据层、真实后端做渲染、JSON 输出给 Agent 消费，并自带 SKILL.md 生成与一整套测试规范。"
author: "Cheman"
slug: cli-anything
github_repo: HKUDS/CLI-Anything
draft: false
tags: ["CLI-Anything", "AI Agent", "CLI", "Python", "开源", "GitHub Trending"]
categories: ["技术", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**CLI-Anything**（`HKUDS/CLI-Anything`）。它要解决的是一个很具体的错位——AI Agent 已经能读代码、写代码、做规划，但让它去用 GIMP 修一张图、用 Blender 渲一个场景、用 LibreOffice 导一份 PDF，它就抓瞎了：这些软件是给"有眼睛有鼠标的人类"设计的。CLI-Anything 的答案是给每个软件生成一套带状态、带 JSON 输出、带 undo/redo 的命令行接口，让 Agent 用最擅长的方式——敲命令——去驱动**真实的软件本体**。项目目前 63,830 star、5,804 fork，Apache-2.0 协议，最新 release 为 v0.4.0，主力语言 Python。

## 一、项目概述

CLI-Anything 由 HKUDS 开源，README 开篇的那句话基本就是它的全部野心：**"Today's Software Serves Humans. Tomorrow's Users will be Agents."** 它不满足于"再写一个 API wrapper"，而是想给整个桌面软件生态补上一层 agent-native 的适配层。

项目提供两条同样重要的入口，这一点在 README 的 Quick Start 里被明确拆成了两张表：

- **消费者路径（Consumer）**：`pip install cli-anything-hub`，然后从 CLI-Hub 注册表里浏览、搜索、安装现成的 CLI，直接用。
- **生成者路径（Generator）**：把 CLI-Anything 的插件/Skill 装到你用的 AI 编码助手里，然后用 7 阶段流水线为任意代码库现场生成一套新 harness。

核心特性可以概括成七条：

- **全自动 7 阶段流水线**：从代码库分析、架构设计、Click CLI 实现，到测试计划、测试编写、文档、打包发布，全部由 Agent 按 SOP 走完。
- **真实软件后端**：不是用 Pillow 重新实现 GIMP，也不是用 ffmpeg 拼一个假的 Blender，而是 `subprocess` 调 `libreoffice --headless`、`blender --background`、`melt`、`sox` 这些真实引擎。
- **原生格式做数据层**：直接解析和修改软件自己的工程文件（MLT XML、ODF、SVG、`.blend` 脚本、`mxGraph` XML），保留完整能力。
- **双模式 CLI**：既支持一次性子命令（适合脚本和流水线），也支持状态化 REPL（适合需要上下文的 Agent）。
- **JSON + Human 双输出**：`--json` 给机器，彩色表格给人，同一个命令两种视图。
- **自动生成 SKILL.md**：每个 harness 都自带一份 Agent 可发现的技能定义，能被 `npx skills` 直接索引。
- **生产级测试**：README 首页徽章标注 2,461 个测试通过，覆盖 unit / 中间文件 E2E / 真实后端 E2E / CLI 子进程四层。

从成熟度看，这个项目不是玩具：仓库创建于 2026 年 3 月，8 个月时间做到 6.3 万 star，CLI-Hub 里已经有 40+ 个 harness，覆盖 GIMP、Blender、Inkscape、LibreOffice、Audacity、OBS Studio、Kdenlive、Shotcut、Draw.io、FreeCAD、QGIS、Godot、ComfyUI、Ollama、Zoom、Joplin、Calibre、Zotero 等，README 里的 Demo 区展示了 18 个应用的实拍效果，还挂了一篇技术报告（arXiv:2606.03854）。

它和同类方案的差异也很清楚。GUI Agent 那一派靠截图 + 坐标点击，页面一变就崩；API 封装那一派只覆盖软件暴露出来的那 10% 能力；"重新实现一遍"那一派干脆丢掉 90% 的专业功能。CLI-Anything 选的是第四条路：**保留软件本体，只给它补一个结构化的命令行外壳**。

## 二、技术原理

### 2.1 三层结构

整个项目的运行时分三层，边界划得很干净：

```text
┌─────────────────────────────────────────────────────┐
│  生成层  cli-anything-plugin/                        │
│  HARNESS.md（SOP）· commands/ · guides/ · templates/ │
│  skill_generator.py · repl_skin.py · preview_bundle  │
└──────────────────────┬──────────────────────────────┘
                       │ 7 阶段流水线生成
┌──────────────────────▼──────────────────────────────┐
│  产物层  <software>/agent-harness/                   │
│  cli_anything/<software>/                            │
│    ├── core/      project / layers / filters / export│
│    ├── utils/     <software>_backend.py · repl_skin  │
│    ├── skills/    SKILL.md（打包兼容副本）            │
│    ├── tests/     test_core.py · test_full_e2e.py    │
│    └── <sw>_cli.py                                   │
└──────────────────────┬──────────────────────────────┘
                       │ pip install -e .
┌──────────────────────▼──────────────────────────────┐
│  运行层  cli-anything-<software>                     │
│  one-shot 子命令  │  REPL  │  --json  │  preview     │
└──────────────────────┬──────────────────────────────┘
                       │ subprocess
                 真实软件引擎（LibreOffice / Blender / melt / sox）
```

生成层是"方法论"，产物层是"每个软件各自的 harness"，运行层是"Agent 真正调用的东西"。这种分层的好处是：方法论只写一份（`HARNESS.md`，36KB 的 SOP），新增一个软件不需要改框架，只需要再跑一遍流水线。

### 2.2 七阶段流水线做了什么

README 把每个阶段的职责写得很直白，`HARNESS.md` 里则给出了每一阶段的具体动作：

1. **Analyze（分析）**——先找后端的"引擎"。GUI 应用通常把展示层和逻辑层分开：Shotcut 的核心是 MLT，GIMP 的核心是 GEGL/Script-Fu，Audacity 处理音频靠 sox。找到引擎，再建立"每个按钮点击 → 哪个函数调用"的映射表，最后确认数据模型（XML / JSON / 二进制 / 数据库）。
2. **Design（设计）**——确定交互模型（REPL / 子命令 / 两者都要），按软件的业务域划命令组：project / 核心操作 / import-export / config / session。同时定状态模型和输出格式。
3. **Implement（实现）**——从数据层写起，先做 `info`/`list`/`status` 这类只读探针命令，再做变更命令，最后接后端：一个 `utils/<software>_backend.py` 负责 `shutil.which()` 找可执行文件、`subprocess.run()` 调用、找不到时抛出带安装指引的清晰错误。
4. **Plan Tests（测试计划）**——在写任何测试代码之前，先落一份 `TEST.md`：计划几个测试文件、每个模块测什么、E2E 走哪些真实工作流。这是硬性要求，不允许"写完再补计划"。
5. **Write Tests（写测试）**——四层测试：单元测试、中间文件 E2E、真实后端 E2E、安装后的 CLI 子进程测试。
6. **Document（记录结果）**——把 `pytest -v` 的完整输出追加回 `TEST.md`，形成"计划 + 结果"的完整证据链。
7. **Publish（发布）**——生成 `setup.py`，`pip install -e .` 装到 PATH。

中间还有一个 6.5 阶段：**SKILL.md 生成**。`skill_generator.py` 直接从 Click 装饰器、`setup.py` 和 README 里抽取元数据，渲染成带 YAML frontmatter 的技能文件。

### 2.3 关键机制一：原生格式 + 真实后端

这是整个项目最核心的取舍，`HARNESS.md` 把它列为 **#1 rule**：**必须用真实软件，不要重新实现它。**

反模式长这样：用 Pillow 拼一个图像合成器去"代替"GIMP，或者生成一堆 bpy 脚本却从来不真正调用 Blender。这样做的产物只能处理玩具级负载，而且行为和真软件越走越远。

正确做法分两步：先用 CLI 生成**合法的原生工程文件**，再把它交给真实软件渲染。以 LibreOffice 为例：

```python
# 1. Build the document as a valid ODF file (our XML builder)
odf_path = write_odf(tmp_path, doc_type, project)

# 2. Convert via the REAL LibreOffice (not a reimplementation)
subprocess.run([
    "libreoffice", "--headless",
    "--convert-to", "pdf",
    "--outdir", output_dir,
    odf_path,
])
# Result: a real PDF rendered by LibreOffice's full engine
```

对应到各个软件，后端调用分别是：

| 软件 | 后端调用 |
|------|----------|
| LibreOffice | `libreoffice --headless --convert-to pdf/docx/xlsx/pptx` |
| Blender | `blender --background --python script.py` |
| GIMP | `gimp -i -b '(script-fu-console-eval ...)'` |
| Inkscape | `inkscape --actions="..." --export-filename=...` |
| Shotcut / Kdenlive | `melt project.mlt -consumer avformat:output.mp4` |
| Audacity | `sox` 做效果处理 |
| OBS Studio | `obs-websocket` 协议 |

在代码里，这个约定被表达为"真实软件是硬依赖"：找不到可执行文件就报错并打印安装说明，**不允许优雅降级**到某个 Python 库兜底。测试里也不允许 skip——软件没装，测试就该红。

### 2.4 关键机制二：Rendering Gap 与滤镜翻译层

第二个坑更隐蔽。大部分 GUI 软件的特效是**渲染时**由引擎应用的。当你直接操作工程文件时，工程里确实写进了"高斯模糊"这个滤镜，但如果渲染环节用一个不认识工程格式的简单工具（比如 ffmpeg 的 concat demuxer），它只会读原始媒体文件，把工程级特效**全部丢掉**。结果就是：命令跑成功了，输出和输入一模一样，谁都看不出发生过什么。

`HARNESS.md` 给出的优先级很明确：

1. **最优**：用软件自带渲染器（MLT 工程交给 `melt`），工程里写什么就渲染什么。
2. **降级**：写一个翻译层，把工程格式的特效转成渲染工具的原生语法（MLT filter → ffmpeg `-filter_complex`）。
3. **兜底**：生成一个渲染脚本，让用户自己跑。

同一个思路还派生出几条细则：滤镜翻译要处理重复滤镜合并、流的交错顺序、参数尺度差异、无法映射的特效；非整数帧率（29.97fps）必须用 `round()` 而不是 `int()`，并接受 ±1 帧容差。这些细节看起来琐碎，但正是"能不能产出可用文件"的分水岭。

### 2.5 关键机制三：状态、锁与两套输出

CLI-Anything 生成的 harness 是**有状态**的：`--project` 指向一个 JSON 工程文件，命令组围绕它做增删改查。`session status/undo/redo/history` 提供了完整的操作历史，实现方式基本就是命令模式（command pattern）——这也和这些软件自身的 undo/redo 机制对齐。

并发写是个真实的工程问题：两个进程同时保存同一个 session JSON 会写坏文件。SOP 要求用独占文件锁，并且锁的用法有讲究——以 `"r+"` 打开、加锁、**在锁内**再 truncate，而不是先 truncate 再加锁（否则中间窗口里文件已经是空的）。`guides/session-locking.md` 里给了 `_locked_save_json` 的完整模式。

输出层则是"一套逻辑、两种呈现"：默认给人看（表格、颜色、进度条，由 `repl_skin.py` 的 `ReplSkin` 统一渲染），加 `--json` 给 Agent 看。README 里对 CLI 设计的四条要求写得很克制但很到位：**失败要响要清楚**（Agent 需要无歧义的错误来自我纠正）、**尽量幂等**、**提供自省命令**（`info`/`list`/`status`）、**暴露有意义的中间态**。

### 2.6 关键机制四：SKILL.md 与 preview 协议

Agent 要能用上一个工具，前提是它能"发现"这个工具。所以 6.5 阶段生成的 SKILL.md 不是装饰品，而是 harness 的一部分：

- 仓库内的规范位置是 `skills/cli-anything-<software>/SKILL.md`，`npx skills add HKUDS/CLI-Anything --list` 能直接列出整个 monorepo 的技能。
- 安装到本地后，包里还留一份兼容副本 `cli_anything/<software>/skills/SKILL.md`，`setup.py` 通过 `package_data={"cli_anything.<software>": ["skills/*.md"]}` 一起打包。
- REPL 启动横幅会打印技能文件的绝对路径：在仓库里优先指向根目录的规范版，装到别处则回退到包内副本。

另一个有意思的设计是 **preview**（预览）。能出图的 harness 可以实现 `preview recipes` / `preview capture` / `preview latest`，产出符合 `preview-bundle/v1` 协议的 bundle；live 模式则把状态拆成三份：`session.json` 是可变当前头，每次 capture 是不可变的 bundle 目录，`trajectory.json` 是只追加的"命令 → 预览"历史。生产者和消费者职责分离——`cli-anything-<software> preview ...` 负责产出，`cli-hub previews inspect/html/watch/open` 只负责看，后者**永远不是渲染路径**。

### 2.7 打包：PEP 420 命名空间

所有 harness 都装在同一个 `cli_anything` 命名空间下：`cli_anything/` 本身**没有** `__init__.py`（PEP 420 隐式命名空间包），每个子包 `gimp/`、`blender/` 才有。这样几十个独立 PyPI 包可以互不冲突地共存，导入路径统一成 `cli_anything.<software>`，命令名统一成 `cli-anything-<software>`。这是个成本很低、收益很高的决定——Agent 只要记住一条命名规则，就能猜出任何软件的命令名。

## 三、安装与快速开始

### 3.1 环境要求

- **Python 3.10+**（README 徽章明确标注 `python ≥3.10`）
- **Click ≥8.0**（CLI 框架）
- 目标软件的**真实安装**（GIMP / Blender / LibreOffice …），CLI 只是外壳，没有本体就没有渲染能力
- 交互式 REPL 建议装 `prompt_toolkit`

### 3.2 路径 A：直接用现成的 CLI（5 分钟）

先装包管理器：

```bash
pip install cli-anything-hub
```

然后浏览、搜索、安装、启动：

```bash
# 浏览所有可用的 CLI，按分类分组
cli-hub list

# 按分类过滤（image / 3d / video / audio / office / ai ...）
cli-hub list -c image

# 按关键词搜索
cli-hub search "3d modeling"

# 看某个 CLI 的详情
cli-hub info gimp

# 安装 / 更新 / 卸载 / 启动
cli-hub install gimp
cli-hub update gimp
cli-hub uninstall gimp
cli-hub launch gimp
```

想先试试手感，README 给的例子是：

```bash
# Browse what is available
cli-hub list
cli-hub search image

# Install and try a CLI immediately
cli-hub install gimp
cli-hub info gimp
cli-hub launch gimp
```

> 注意：部分 CLI 包的是真实桌面软件。如果你选的 CLI 依赖 GIMP、Blender、LibreOffice 等上游程序，那个程序本身也要装。

### 3.3 路径 B：让 Agent 自己找工具

给 SKILL 兼容的 Agent 装上 CLI-Hub 的 meta-skill，它就能自己发现并安装需要的 CLI：

```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
```

然后在对话里直接说：

```text
Find appropriate CLI software in CLI-Hub and complete the task: ...
```

README 列出的兼容对象包括 OpenClaw、Nanobot、Claude Code、Codex、Reasonix、Antigravity 等。

### 3.4 路径 C：为一个新软件生成 CLI

以 Claude Code 为例，两步装插件：

```bash
# Add the CLI-Anything marketplace
/plugin marketplace add HKUDS/CLI-Anything
```

```bash
# Install the cli-anything plugin from the marketplace
/plugin install cli-anything
```

然后一条命令跑完 7 个阶段：

```bash
# /cli-anything <software-path-or-repo>
# Generate a complete CLI for GIMP (all 7 phases)
/cli-anything ./gimp
```

其他平台的装法各有各的脚本，但生成出来的 harness 格式完全一致：

| 平台 | 安装方式 |
|------|----------|
| Claude Code | `/plugin marketplace add HKUDS/CLI-Anything` + `/plugin install cli-anything` |
| Cursor | `bash CLI-Anything/cursor-plugin/scripts/install.sh`（Windows 用 `.ps1`） |
| Pi | `bash .pi-extension/cli-anything/install.sh` |
| Codex | `bash CLI-Anything/codex-skill/scripts/install.sh` |
| Hermes | `bash CLI-Anything/hermes-skill/scripts/install.sh` |
| Reasonix | `bash CLI-Anything/reasonix-skill/scripts/install.sh` |
| OpenCode | `cp CLI-Anything/opencode-commands/*.md ~/.config/opencode/commands/` |
| Qodercli | `bash CLI-Anything/qoder-plugin/setup-qodercli.sh` |
| GitHub Copilot CLI | `copilot plugin install ./cli-anything-plugin` |
| OpenClaw | `cp CLI-Anything/openclaw-skill/SKILL.md ~/.openclaw/skills/cli-anything/SKILL.md` |

### 3.5 用上生成的 CLI

不管前面用哪个平台生成的，产物用法都一样：

```bash
# Install to PATH
cd gimp/agent-harness && pip install -e .

# Use from anywhere
cli-anything-gimp --help
cli-anything-gimp project new --width 1920 --height 1080 -o poster.json
cli-anything-gimp --json layer add -n "Background" --type solid --color "#1a1a2e"

# Enter interactive REPL
cli-anything-gimp
```

验证三连：

```bash
which cli-anything-gimp        # 应该输出 venv 或 site-packages 里的可执行文件路径
cli-anything-gimp --help       # 应该打印命令组列表
cli-anything-gimp              # 不带参数直接进 REPL，打印带 skill 路径的横幅
```

## 四、使用方法与实战

### 4.1 用 CLI-Hub 做工具发现

Agent 场景下最常用的其实是 `--json` 那一面：

```bash
# 机器可读的清单，直接喂给 Agent
cli-hub list --json

# 定位能力缺口：搜不到就是该自己生成一个 harness 的信号
cli-hub search "video captioning"
cli-hub info videocaptioner
cli-hub install videocaptioner
```

`cli-hub` 的子命令可以整理成这张表：

| 命令 | 作用 |
|------|------|
| `cli-hub list` | 按分类浏览注册表 |
| `cli-hub list -c <category>` | 按分类过滤 |
| `cli-hub search <query>` | 按名称/描述/分类搜索 |
| `cli-hub info <name>` | 查看单个 CLI 的详情 |
| `cli-hub install <name>` | 从 CLI-Hub 安装 |
| `cli-hub update <name>` | 升级已安装版本 |
| `cli-hub uninstall <name>` | 卸载 |
| `cli-hub launch <name> [args...]` | 直接运行已安装的 CLI |

### 4.2 实战：用 GIMP harness 做一次完整修图

下面这套流程来自 GIMP harness 自带的 README，把可执行前缀换成 `cli-anything-gimp` 就是安装后的用法（原文档用的是 `python3 -m cli.gimp_cli`，方便开发态直接跑）。

先建工程，指定画布尺寸和预设：

```bash
cli-anything-gimp project new --width 1920 --height 1080 --profile hd1080p -o edit.json
```

放一张底图进图层栈：

```bash
cli-anything-gimp --project edit.json layer add-from-file photo.jpg --name "Background"
```

叠三个调整滤镜，参数都是 `key=value` 形式：

```bash
cli-anything-gimp --project edit.json filter add brightness --layer 0 --param factor=1.2
cli-anything-gimp --project edit.json filter add contrast --layer 0 --param factor=1.1
cli-anything-gimp --project edit.json filter add saturation --layer 0 --param factor=1.3
```

加文字层并绘制：

```bash
cli-anything-gimp --project edit.json layer new --type text --name "Title"
cli-anything-gimp --project edit.json draw text --layer 0 --text "My Photo" --size 48 --color "#ffffff"
```

检查图层栈、保存、按预设导出：

```bash
cli-anything-gimp --project edit.json layer list
cli-anything-gimp --project edit.json project save
cli-anything-gimp --project edit.json export render output.jpg --preset jpeg-high --overwrite
```

这条链路上每一步都是可逆的：`session history` 看操作序列，`session undo` / `session redo` 前后挪。对 Agent 来说这点很关键——它可以在不确定时先试一步，看 `--json` 的返回，再决定继续还是回滚。

### 4.3 参数与能力清单

GIMP harness 暴露的命令组相当完整，这也是"保留专业能力"的具体体现：

| 命令组 | 代表子命令 | 说明 |
|--------|-----------|------|
| `project` | `new` / `open` / `save` / `info` / `profiles` / `json` | 工程生命周期，内置 hd1080p、4k、a4_300dpi、instagram_post 等预设 |
| `layer` | `new` / `add-from-file` / `list` / `remove` / `duplicate` / `move` / `set` / `flatten` / `merge-down` | 图层栈操作 |
| `canvas` | `info` / `resize` / `scale` / `crop` / `mode` / `dpi` | 画布变换，重采样可选 lanczos / bicubic / bilinear / nearest |
| `filter` | `list-available` / `info` / `add` / `remove` / `set` / `list` | 四类滤镜：adjustment / blur / stylize / transform |
| `media` | `probe` / `list` / `check` / `histogram` | 素材探针与直方图 |
| `export` | `presets` / `preset-info` / `render` | 13 种导出预设，从 png-max 到 ico |
| `draw` | `text` / `rect` | 基础绘制 |
| `session` | `status` / `undo` / `redo` / `history` | 状态管理 |

混合模式（blend mode）也给了 15 种：`normal`、`multiply`、`screen`、`overlay`、`soft_light`、`hard_light`、`difference`、`darken`、`lighten`、`color_dodge`、`color_burn`、`addition`、`subtract`、`grain_merge`、`grain_extract`。

### 4.4 进阶：refine 迭代扩展覆盖

第一次生成的 harness 不可能覆盖软件全部能力。`refine` 就是为此设计的增量命令：

```bash
# Broad refinement — agent analyzes gaps across all capabilities
/cli-anything:refine ./gimp

# Focused refinement — target a specific functionality area
/cli-anything:refine ./gimp "I want more CLIs on image batch processing and filters"
```

它会做一次"软件完整能力 vs 当前 CLI 覆盖"的差距分析，然后补命令、补测试、补文档。每次运行都是增量且非破坏性的，可以反复跑。

### 4.5 与 CI / 团队流程集成

生成的 harness 自带四层测试，跑法在 QUICKSTART 里写得很清楚：

```bash
cd /root/cli-anything/gimp/agent-harness
python3 -m pytest cli_anything/gimp/tests/ -v
```

关键开关是 `CLI_ANYTHING_FORCE_INSTALLED`：

```bash
CLI_ANYTHING_FORCE_INSTALLED=1 python3 -m pytest cli_anything/gimp/tests/ -v -s
# Output should show: [_resolve_cli] Using installed command: /path/to/cli-anything-gimp
```

设成 `1` 之后，测试**必须**用 PATH 里安装好的命令，不允许回退到 `python -m`。CI 里这一步能挡住"本地能跑、装完就废"的经典问题。`-s` 会把渲染产物的真实路径打出来，方便人工抽查文件大小和格式。

## 五、常见问题与解决方案

**现象：Windows 上报 `cygpath: command not found`。**
原因：Claude Code 通过 `bash` 执行 shell 命令，而 Windows 原生环境没有 `cygpath`。
解决：装 Git for Windows（自带 `bash` 和 `cygpath`），或者直接用 WSL。

**现象：`Unknown skill: cli-anything`。**
原因：插件没装好或没加载，两种入口写法（`/cli-anything` 与 `/cli-anything:cli-anything`）指向同一个 skill，换写法没用。
解决：按 README 的顺序排查——先 `/reload-plugins`，再 `/help cli-anything` 确认插件已加载，必要时重新 `marketplace add` + `install`，最后再试入口命令。老版本只认 `/cli-anything:cli-anything`。

**现象：测试全红，报找不到 LibreOffice / Blender / melt。**
原因：这是设计使然——真实软件是硬依赖，SOP 明确禁止优雅降级和 skip。
解决：装上游软件并确保在 PATH 里。`utils/<software>_backend.py` 抛出的错误里带安装指引，跟着做即可。别试图用某个 Python 库"顶一下"，那会让整个 harness 失去意义。

**现象：`cli-anything-gimp: command not found`，但 `python3 -m` 能跑。**
原因：只克隆了仓库，没执行 `pip install -e .`；或者装在了另一个虚拟环境里。
解决：进 `agent-harness` 目录 `pip install -e .`，再用 `which cli-anything-gimp` 确认；注意 pip 和当前 shell 是否同一个 venv。

**现象：装包时报 `Requires-Python >=3.10` 不满足。**
原因：README 徽章要求 Python ≥3.10，老系统自带的 3.8/3.9 不够。
解决：用 pyenv / conda 建一个 3.10+ 环境。低版本上语法和类型注解都可能炸。

**现象：`npx skills` 和 `pip install cli-anything-hub` 分不清该用哪个。**
原因：这是两条不同的路径。`npx skills` 装的是**给 Agent 看的 SKILL.md**（让它知道去哪找 CLI），`pip install` 装的是**包管理器本体**（真正执行安装）。
解决：两者都要——先给 Agent 装 meta-skill，再让它自己 `cli-hub install`；或者手工两步都做。

**现象：命令都跑成功了，导出的图和原图一模一样。**
原因：多半命中了 "Rendering Gap"——渲染路径没走软件原生引擎，工程里的滤镜被忽略了。
解决：确认导出用的是 `melt` / `libreoffice --headless` / 原生渲染器，而不是简单拼接工具；如果只能走替代渲染器，必须有滤镜翻译层。另外检查该滤镜是否被标注为 "project-only (not rendered)"。

**现象：并发跑多个命令后 session JSON 损坏。**
原因：多个进程同时写同一个 session 文件。
解决：用 SOP 里的独占文件锁模式（`"r+"` 打开、加锁、锁内 truncate，见 `guides/session-locking.md`）。写自己的扩展时别图省事直接 `json.dump` 覆盖。

**现象：`pip install -e .` 之后命令跑起来但 `preview` 相关子命令缺失。**
原因：preview 是可选能力，只有实现了 `preview` 命令组的 harness 才有；老版本 harness 可能还没接 `preview-bundle/v1`。
解决：`cli-anything-<software> --help` 先确认命令组是否存在，不存在就 `refine` 一次或用新版重生成。

## 六、总结

CLI-Anything 押的是一个很大但很具体的判断：**未来软件的"用户"里，Agent 会占越来越大的比例，而 CLI 是当下最通用、最便宜、最不容易坏的适配层**。它的工程实现也配得上这个判断——原生工程文件做数据层保证了能力不缩水，真实后端做渲染保证了输出可信，四层测试 + "禁止优雅降级"保证了不会退化成玩具，SKILL.md 和 preview 协议则把"Agent 能不能发现和使用"这件事补齐了。

适合谁：手里有一堆 GUI 工具想接进自动化流水线的团队；在给 Agent 搭工具链、苦于 MCP/API 覆盖不全的开发者；以及想研究"Agent 如何操作专业软件"这个课题的人。

不太适合谁：只想调一两个 REST API 的场景（直接写 HTTP 客户端更省事）；完全不能装上游软件的环境（这套东西的地基就是真实引擎）；以及期待"零成本一键搞定"的人——生成只是起点，`refine` 迭代和质量把关仍然要投入。

局限也摆在那：渲染质量取决于上游软件本体，跨平台差异（尤其 Windows 上的 `cygpath`、PowerShell 脚本）需要额外维护，40+ 个 harness 的质量水位不可能完全一致。但这些更像"生态成长中的问题"，而不是架构缺陷。

项目地址：<https://github.com/HKUDS/CLI-Anything> ，CLI-Hub 注册表：<https://clianything.cc/> 。
