---
title: "App Store Compliance：把应用商店拒审规则变成提交前的自动化门禁"
date: "2026-11-24T21:05:00+08:00"
description: "一个面向 iOS 与 Android 的开源合规手册与预提交守卫：内置 124 条拒审模式、112 个监管截止日期，能作为命令行扫描器或 AI 编程工具的 Hook 运行，在上传前拦下高风险提交。"
author: "Cheman"
slug: app-store-compliance
github_repo: mjmirza/app-store-compliance
draft: false
tags: ["App Store", "Google Play", "合规", "AI 编程工具", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**App Store Compliance Playbook**（`mjmirza/app-store-compliance`）。它把 Apple App Store 与 Google Play 的拒审原因整理成可查询的规则库，再提供一个提交前扫描器，让开发者在按下上传按钮之前就知道哪里会被拒。本文从规则建模、扫描器实现到实际接入方式，完整拆一遍这个项目。

## 一、项目概述

`mjmirza/app-store-compliance` 是一个开源的应用商店合规手册（playbook）加预提交守卫（pre-submission guard）。作者 mjmirza 把它定位成"在审核员之前发现拒审原因"的工具：既写给能开终端的开发者，也写给不写代码、只是准备提交应用的独立开发者或小团队。

它解决的问题很具体。一次拒审的成本不是几分钟，而是一个星期：提交、排队等待审核、收到一封只有一句话的拒绝邮件、猜测原因、改完再提交、再等一轮。这个项目试图把这段循环提前成一次本地检查。

核心特性可以概括为六点：

- **规则库与扫描器分离**：`data/rejection-patterns.json` 是可机读的拒审模式分类，守卫脚本读取规则后对项目做静态扫描，规则更新不需要改代码。
- **同时覆盖两大商店**：Apple 指南与 Google Play 政策各自建图，共 124 条有编号、有触发条件、有修复建议的模式。
- **区分"能扫描证明"与"必须人工确认"**：项目反复强调扫描通过不等于过审，账号状态、商店文案、演示账号这类内容会被明确列为人工检查项。
- **多平台框架适配**：原生 iOS/Android 之外，还识别 Flutter、React Native、Expo、Ionic/Capacitor/Cordova、Unity、.NET MAUI、Tauri mobile、Kotlin Multiplatform。
- **可作为 AI 编程工具的 Hook**：一条安装命令接入 Claude Code、Codex CLI、Gemini CLI、Cursor、GitHub Copilot、Grok、Qwen Code、Kimi Code 等十余种工具，在 `fastlane`、`eas submit`、`gradle bundleRelease` 这类提交命令执行前自动拦截。
- **监管截止日期数据库**：112 条记录覆盖 EU AI Act、DSA、GDPR、COPPA、美国州级年龄法、DMA 等，扫描时顺带提示 90 天内到期的义务。

从成熟度看，项目创建于 2026 年 6 月 6 日，当前约 5.4k star、349 fork，最新 release 为 `v2.5.1`，代码以 Shell（约 699 KB）和 Python（约 549 KB）为主。许可证不是常见的 MIT，而是 OpenRoots Agent License 2.3（SPDX：`LicenseRef-OpenRoots-ORA-2.3`），年营收 2000 万美元以下的公司可免费商用，超过阈值按使用该手册的产品收入收取 0.5% 版税，且明确不允许用该仓库训练模型。

它与"又一个 checklist 仓库"的差别在于两点：一是规则有结构化字段，能被脚本消费；二是每条事实性引用都可机器校验，作者专门写了反"软 404"的验证器，避免规则库本身建立在编造的链接上。

## 二、技术原理

这个项目的架构不是单一的扫描器，而是四层：文档层、数据层、执行层、代理集成层。理解这四层，基本就理解它的全部设计取舍。

```text
docs/            人读的规则解释、检查清单、申诉 playbook
data/            机读分类：拒审模式 / 检测配方 / 监管截止日期
scripts/         扫描、监控、审计、引用校验、安装器
agent-os/        guard 脚本 + agent skill + 各工具 hook 适配
references/      由 data/ 生成的、按类别切片的 AI 可加载参考树
```

### 2.1 规则即数据：taxonomy 的字段设计

`data/rejection-patterns.json` 当前版本 2.5.1，包含 124 条模式。按平台分布为 Apple 62 条、Google 43 条、双平台通用 13 条、Web 6 条；按严重度分布为 critical 38 条、high 65 条、medium 21 条。

每条模式的结构大致如下：

```json
{
  "id": "ANDROID-ADVERTISING-ID",
  "platform": "google",
  "guideline": "User Data",
  "title": "Google Play Advertising ID usage without disclosure or opt-out",
  "severity": "high",
  "detection": "Using com.google.android.gms.permission.AD_ID permission or querying GAID but lacking opt-out support or user deletion pathways in code/privacy policy.",
  "signals": ["com.google.android.gms.permission.AD_ID", "AD_ID", "getAdvertisingIdInfo"],
  "counterSignals": ["opt-out", "reset AD_ID", "advertisingIdConsent", "delete AD_ID"],
  "fix": "Declare the AD_ID permission in AndroidManifest.xml and handle user opt-out or deletion requests in full compliance with Google Play policy."
}
```

这里有几个值得注意的设计。`signals` 是触发信号，`counterSignals` 是反证信号，两者同时存在意味着扫描器不能只做正向 grep，还要看项目里有没有对应的处理逻辑。`severity` 直接决定守卫的退出码：critical 会阻断提交，high 和 medium 只提示。`guideline` 保留官方条款名，方便开发者回到 Apple 或 Google 的原文核对。

这种"规则外置"的好处是审计边界清晰：新增一条拒审模式只需要改 JSON 和检测配方，扫描器不用重新发布。代价是 JSON 与 Shell 检查逻辑之间需要一致性校验，项目为此提供了 `scripts/validate.py`，并在 CI 里跑。

### 2.2 守卫脚本的执行链路

核心扫描器是 `agent-os/hooks/app-store-compliance-guard.sh`，约 2100 行 Bash。它支持三种运行方式，这也是它能同时做"手动扫描"和"AI 工具 Hook"的关键。

第一种是显式传目录：`guard.sh /path/to/app`。如果参数存在但不是目录，脚本直接报错退出 1，不会把"路径写错"当成"扫描通过"。

第二种是 Hook 模式：从标准输入读取 AI 工具传来的 JSON，解析出 `tool_input.command`。这里要兼容不同工具的 payload 格式，脚本实现了三级降级：优先用 `jq`，其次用 `python3` 内联解析，最后用带转义处理的正则。解析不出命令就静默放行，避免因为解析失败误伤正常命令。

第三种是交互式手工运行，没有 Hook payload，直接按目录扫描。

拿到目录之后，执行链路分成几步：

1. **平台探测**：判断这是 iOS、Android、Web，还是某个跨平台框架的工程。
2. **应用根发现**：一个仓库里可能同时有主应用、demo、示例工程、拆分出来的 native 工程。脚本会区分"根应用"和"嵌套应用"，避免把示例代码的告警算到主应用头上，也避免漏掉独立扫描的子工程。
3. **构建源码文件清单**：排除 `Pods`、`node_modules`、`.git`、`build`、Flutter 的 `.pub-cache` 等 vendor 目录，同时保留 `Podfile`（无扩展名，不在常规源码清单里）这类需要单独读取的文件。
4. **分层检查**：共享检查、Flutter 检查、React Native/Expo 检查、Ionic/Capacitor 检查、iOS 检查、Android 检查、Web 检查依次执行。
5. **发现聚合与输出**：按 critical、high、medium 排序，尽量带上触发文件与行号，最后打印 summary、coverage、scan time 和 verdict。

几个检查细节能看出作者对误报的处理态度。比如"release 构建里出现 localhost 或 staging 域名"这条，脚本会先做一次"剥离注释与 `#if DEBUG` 块"的处理，只在 release 真正会编译的字符串里匹配；再比如 iOS 的部署目标检查，会解析 `project.pbxproj`，区分 app target、framework target 和 test target，避免把依赖库的最低版本当成应用的最低版本。

再比如 Android 的 Play Billing 检查，会从 `build.gradle` / `build.gradle.kts` 里提取 `com.android.billingclient:billing` 的版本号，低于 8 就报 critical，因为 2026 年 8 月 31 日之后新应用和更新都要求 Billing Library 8 以上。这类"带生效日期的规则"在规则库里大量存在，也是它比静态 checklist 更有维护价值的地方。

### 2.3 判定语义：BLOCKED、CLEAR、NOT CHECKED

守卫的最后一段是整个项目最值得借鉴的设计。它不输出简单的"通过/失败"，而是三种语义明确的结论：

- `BLOCKED.`：存在 critical 风险，退出码 2。Hook 模式下会阻止提交命令，并把报告写到 stderr。
- `CLEAR.`：代码扫描没有 critical 风险，退出码 0。但输出会明确补一句：这不是审核通过，审核员仍会检查扫描看不到的内容。
- `NOT CHECKED.`：目录里没有找到 iOS 或 Android 工程，或者扫描文件写不进去。手工运行时退出 1；Hook 模式下则放行，同时把原因写进报告。

这个设计解决了一个常见问题：扫描器"什么都没扫到"时如果返回 0，很容易被 CI 或代理误读成"检查通过"。项目宁可返回 `NOT CHECKED.` 并让调用方显式处理，也不制造虚假的安全感。README 里还有一条相关说明：如果规则包超过 60 天未更新，输出顶部会出现 `Rule pack STALE.`，提醒先 `git pull` 再扫。

### 2.4 多工具 Hook 适配与安装器

`scripts/install.sh` 负责把守卫接入不同 AI 编程工具。它要处理的不只是"复制一个脚本"，而是每个工具各自的配置格式、Hook 事件名、payload 结构和权限模型。

安装器会写入三类东西：守卫脚本（放到工具自己的 hooks 目录，如 `~/.codex/hooks/`）、skill（Claude Code 读 `~/.claude/skills/`，其他工具共用 `~/.agents/skills/`）、以及工具配置里的一条 Hook 条目。对已有配置，它会保留其他设置并在旁边留一份带日期的备份；如果配置文件不是合法 JSON 或存在重复键，它不会重写，而是打印一段可手工粘贴的配置块。

更关键的是安装后的验证：每次安装只有在"用该工具自己的 payload 格式喂一条提交命令给 Hook，并看到它被拦截"之后，才会打印 `Install verified.`。OpenCode 的验证依赖 Node，没有 Node 时会降级成 `Installed, but not fully verified.`。这种"安装即自测"的做法，比单纯检查文件是否存在可靠得多。

不同工具的 Hook 协议差异也被显式处理。例如 Cursor 的 `beforeShellExecution` 需要在 stdout 返回一个权限 JSON，脚本就为它单独输出 `{"permission":"deny",...}`；Codex 需要用户手动在 `/hooks` 里批准新 Hook；Gemini CLI 在 0.26 之前还需要打开 `tools.enableHooks`。这些细节都写进了 README 的表格，而不是藏在代码里。

### 2.5 引用完整性与监管时间线

这个项目有一个比较少见的坚持：所有规则引用都要可验证。`scripts/verify-citations.py` 不只检查 HTTP 200，因为 Apple 对未知文章 ID 会返回一个字节完全相同的新闻索引页——伪造链接也能拿到 200。验证器会为每个 host 请求一个故意编造的控制 ID，把内容指纹与真实引用比对，指纹相同就判定为伪造；同时把 bot 拦截的 4xx 和宿主故障的 5xx 与真正的编造区分开，避免验证器本身变成噪音。

监管层则由 `data/regulatory-deadlines.json` 驱动，当前 112 条记录，字段包括 `effective_date`、`grace_period`、`mandatory_date`、`enforcement_date`、`jurisdiction`、`source_url`、`verified_on`。`scripts/deadline-checker.py` 会打印滚动 90 天窗口内到期的义务，并且作为守卫的一部分自动运行。也就是说，开发者做一次提交前扫描，顺带会看到"你所在地区 90 天内有哪些新规生效"。

这里的取舍也很清楚：静态扫描只能证明"代码里没有某些已知模式"，不能证明"账号状态正常、商店文案合规、演示账号可用"。项目没有试图用启发式规则假装覆盖后者，而是把它们放进 `docs/PRE-SUBMISSION-CHECKLIST.md` 和 `.app-review-readiness.json`，要求人工逐项确认。对合规工具来说，承认边界比扩大覆盖更重要。

## 三、安装与快速开始

项目本身不需要编译，运行时依赖很少：`git` 和 `bash`。如果要接入 Claude Code 之外的工具，还需要 `python3`。

最直接的方式是克隆后直接扫描，不安装任何东西，也不修改被扫描的项目：

```bash
git clone https://github.com/mjmirza/app-store-compliance ~/repositories/app-store-compliance
bash ~/repositories/app-store-compliance/agent-os/hooks/app-store-compliance-guard.sh "/path/to/your/app"
```

把 `/path/to/your/app` 换成包含 Xcode 工程或 Android 应用的目录即可。路径里有空格时保留引号；从 Finder 或文件管理器把文件夹拖进终端可以自动得到正确路径。README 给出的时间预期是：小项目约一秒，大项目最多一分钟，守卫会打印实际耗时。

扫描结果的阅读顺序是：先看 findings，critical 在最上面，每条尽量带触发文件与行号；再看最后的 verdict 行。

| verdict 开头 | 含义 | 下一步 |
|---|---|---|
| `BLOCKED.` | 发现 critical 拒审风险 | 按每条 `[CRITICAL]` 下方的 `fix.` 行修复，再跑一次 |
| `CLEAR.` | 代码里没有 critical 风险，但不等于过审 | 继续做账号与商店文案检查，并记录到 `.app-review-readiness.json` |
| `Rule pack STALE.` | 规则包超过 60 天未更新 | `git pull` 后重新扫描 |
| `NOT CHECKED.` | 没找到 iOS/Android 工程，或扫描文件不可写 | 指向正确目录；Expo 项目先 `npx expo prebuild` |

退出码同样有语义：`0` 表示没有 critical（可能是 CLEAR，也可能是 Hook 模式下的 NOT CHECKED），`1` 表示手工运行时没有扫到原生工程或扫描失败，`2` 表示被 critical 阻断。接 CI 时应该以退出码为准，而不是 grep 输出文本。

如果要把它变成"每次提交前自动运行"，执行一条安装命令：

```bash
bash ~/repositories/app-store-compliance/scripts/install.sh --tool all
```

`--tool all` 会安装到 home 目录下所有受支持的工具；也可以传具体名称，例如 `--tool codex`、`--tool gemini`、`--tool cursor`。安装完成后通常会要求重启工具，Codex 还需要在 `/hooks` 里手动批准一次。验证安装是否生效：

```bash
bash ~/repositories/app-store-compliance/scripts/install.sh doctor
```

`doctor` 会实际喂一条提交命令给 Hook，确认它真的能拦住，而不是只检查配置文件里有没有对应条目。

## 四、使用方法与实战

### 4.1 一次性审计：不安装、不改项目

适合"马上就要提交，只想快速过一遍"的场景。除了直接跑守卫，还可以让 AI 工具按只读方式做一次完整审计。README 提供了一段可直接粘贴的提示词，核心要求是：读取 `docs/` 与 `data/rejection-patterns.json`，对应用做全量比对，输出按 critical/high/medium 排序的发现表，每条给出官方条款与具体修复，再走一遍账号与项目就绪检查，最后列出 90 天内到期的监管义务。

这条路径的价值在于"只读"：不安装 Hook、不修改工程、不触碰 GitHub 账号。对于外包交付或临时验收，这种低侵入方式更容易被接受。

### 4.2 接入 AI 编程工具后的日常工作流

安装完成后，工作流会变成这样：

```text
你的 iOS / Android 工程
        |
        v
AI 编程工具持续读取 app-store-compliance skill
        |
        | 准备提交时
        v
/app-store-audit 或 pre-submission hook
        |
        v
按 rejection-patterns.json 扫描工程
        |
        +-- 发现 critical --> BLOCKED，给出条款与修复
        |
        +-- 无 critical ----> CLEAR，再走人工清单
```

Hook 会在 `fastlane`、`eas submit`、`gradle bundleRelease`、`xcrun altool` 这类命令执行前触发。发现 critical 就阻断上传，并在报告里给出对应条款。Claude Code、Gemini CLI、OpenCode 还会提供 `/app-store-audit` 斜杠命令，手动触发同一套审计。

需要绕过时，可以设置 `APP_STORE_GUARD_OK=1`。守卫会打印 "Critical findings present but the submission is allowed." 并记录一次 override。这个开关适合"确认是误报、但暂时来不及改规则"的情况，不建议作为常规流程。

### 4.3 持续监控：把"规则变化"也纳入流程

商店政策不是静态的。项目提供了九个监控脚本，覆盖不同轨道：

| 命令 | 作用 |
|---|---|
| `python3 scripts/monitor.py --project /path/to/your/app` | 跟踪 25 个 Apple 开发者要求轨道，对照官方 RSS 新闻 |
| `python3 scripts/monitor-regulatory.py --project /path/to/your/app` | EU/UK/US/CA/AU/SG 监管动态，带来源可信度分级 |
| `python3 scripts/monitor-android.py --dir /path/to/your/app` | Android 与 Google Play 要求 |
| `python3 scripts/monitor-ai-policy.py --dir /path/to/your/app` | 生成式 AI 政策（Apple 与 Google） |
| `python3 scripts/release-audit.py /path/to/your/app --metadata ./metadata` | 发布就绪完整审计 |
| `python3 scripts/accessibility-audit.py /path/to/your/app` | 无障碍合规静态审计 |
| `python3 scripts/monitor-privacy.py --dir /path/to/your/app` | 移动与 Web 隐私要求 |
| `python3 scripts/monitor-security.py --dir /path/to/your/app` | 17 项移动安全要求 |
| `python3 scripts/generate-timeline.py` | 生成按时间排序的监管时间线 |

`monitor.py` 支持模拟某条轨道更新，用来预演迁移任务：

```bash
cd ~/repositories/app-store-compliance
python3 scripts/monitor.py --project /path/to/your/app --simulate "Privacy Manifests"
python3 scripts/monitor.py --project /path/to/your/app --simulate "all"
python3 scripts/monitor.py --project /path/to/your/app --simulate "In-App Purchase policies" --json
```

`--json` 适合接 CI：把结果交给后续脚本生成 issue 或 PR。README 也明确说明，除 `monitor.py` 之外的监控器默认读取内置示例公告，除非传 `--live`，所以不要把默认输出当成实时新闻。

### 4.4 商店文案审计：被低估的拒审来源

大量拒审并不在代码里，而在商店列表（listing）里：名称、副标题、关键词、描述、URL、订阅条款。`scripts/metadata-audit.py` 专门处理这一层：

```bash
bash scripts/pull-metadata.sh apple
python3 scripts/metadata-audit.py ./metadata
python3 scripts/metadata-audit.py ./metadata --propose
python3 scripts/metadata-audit.py ./metadata/android --platform google
```

它会检查字符数限制、提及其他平台、描述未来功能、贬低 Apple、脏话、排名与价格声明、关键词格式、缺失隐私政策或订阅条款、中国区 AI 相关表述、以及非法 URL。每个 locale 目录单独审计，并从 fastlane 的 `default/` 和父目录继承字段，发现项会带上 locale 名称。`--propose` 只写建议副本，不改源文件；改完再跑一次，形成"检测—建议—复验"的闭环。

### 4.5 端到端场景：一个 Expo 应用的提交前一周

假设你有一个 Expo 应用，没有 `ios/` 和 `android/` 目录，准备用 `eas submit` 上架。

第一步，先生成原生工程，否则守卫只能读到 `app.json` / `app.config`，原生代码检查不会运行：

```bash
npx expo prebuild
```

第二步，跑一次守卫：

```bash
bash ~/repositories/app-store-compliance/agent-os/hooks/app-store-compliance-guard.sh "/path/to/your/app"
```

如果输出 `NOT CHECKED.`，说明目录指错了，或者原生工程还没生成。如果输出 `BLOCKED.`，按 critical 列表逐条修复。常见的几条包括：有登录但没有应用内账号删除、相机/定位权限缺少用途描述、release 构建里残留 staging 域名、隐私清单缺失。

第三步，接入 AI 工具，让后续每次提交都被自动拦截：

```bash
bash ~/repositories/app-store-compliance/scripts/install.sh --tool all
```

第四步，用工单化的方式处理"扫描看不到"的部分：按 `docs/PRE-SUBMISSION-CHECKLIST.md` 检查开发者账号状态、协议是否接受、Play 包名是否注册、演示账号是否可用、隐私表单是否与运行时行为一致，并把结果写入 `.app-review-readiness.json`。

第五步，跑发布就绪审计，拿到一个可进 CI 的总判：

```bash
python3 scripts/release-audit.py /path/to/your/app --metadata ./metadata
```

退出码 `0` 表示 clear，`2` 表示被 critical/high 阻断，`3` 表示扫描失败或未审计商店列表。把这三态接进流水线，比"只有成功/失败"更利于定位问题。

## 五、常见问题与解决方案

**现象：输出 `NOT CHECKED.`，但项目明明是移动应用。**
原因：目录里没有 Xcode 工程或 Android 应用模块；Expo/React Native 项目可能还没生成原生目录；也可能是守卫无法写入临时扫描文件。
解决：指向包含 `.xcodeproj` 或 `AndroidManifest.xml` 的目录；Expo 项目先执行 `npx expo prebuild`；检查 `/tmp` 是否可写。手工运行时该状态退出码为 1，Hook 模式下会放行并写明原因。

**现象：安装脚本最后打印 `FAIL` 行。**
原因：某个工具的配置合并失败，常见于配置文件只读、不是合法 JSON、存在重复键，或者机器上没有 `python3`/`jq`。
解决：按 FAIL 行指出的具体问题修复，然后运行 `bash scripts/install.sh doctor` 复验。如果配置文件无法自动改写，安装器会打印一段可手工粘贴的配置块。

**现象：`settings.json` 没有被修改。**
原因：文件只读、JSON 非法，或者既没有 `python3` 也没有 `jq`。
解决：恢复写权限并校验 JSON；安装器不会覆盖一个它无法安全解析的配置，按打印出的片段手工合并即可。

**现象：Hook 在 Claude Code 里不触发。**
原因：Claude Code 需要重启才会重新加载 Hook 配置。
解决：重启 Claude Code，再跑 `install.sh doctor`。`doctor` 会实际喂一条提交命令，确认拦截链路是通的。

**现象：Hook 在 Codex 里不触发。**
原因：Codex 不会自动运行新加入或变更过的 Hook，必须由用户批准。
解决：在 Codex 里执行 `/hooks`，批准 `app-store-compliance` 这一条，然后运行 `install.sh --tool codex doctor`。

**现象：Hook 在 Gemini CLI 里不触发。**
原因：Gemini CLI 在 0.26 之前需要显式打开 `tools.enableHooks`；版本过低时 skill 也不可用（Hook 从 0.22 起可用，skill 需要 0.24 及以上）。
解决：重启 Gemini CLI，确认 `~/.gemini/settings.json` 里 `tools.enableHooks` 为 true，再跑 `install.sh --tool gemini doctor`；必要时升级 Gemini CLI。

**现象：除了 Claude Code，其他工具安装时提示需要 `python3`。**
原因：这些工具的配置合并与 payload 验证由 Python 完成。
解决：安装 `python3` 后重新执行同一条安装命令。

**现象：`verify-citations.py` 看起来卡住了。**
原因：它要联网检查约 300 条链接，并且会为每个 host 请求一个伪造的控制 ID 做指纹比对，结果在最后统一打印。
解决：给它几分钟，不要中途 Ctrl-C；网络受限时可以只对特定目录运行，例如 `--files docs/ data/`。

**现象：应用里的 demo/example 子工程被一起扫描，报了不相干的错。**
原因：嵌套工程的归属判定有明确规则：名为 `demo`、`example`、`sample`、`playground`（含复数）的目录仍属于根应用扫描范围；其他带独立 `Info.plist` 或 `AndroidManifest.xml`、且没有被根构建文件引用的嵌套应用，会在根应用有对应平台工程时被当作独立应用扫描。
解决：如果只想扫子工程，直接把守卫指向该子目录；如果是误报，考虑用 `.app-review-readiness.json` 记录已复核的豁免，或在 Fleet Sweep 中使用带过期时间的 per-occurrence waiver。

**现象：`accessibility-audit.py` 报 Clean，但实际用 VoiceOver/TalkBack 仍有问题。**
原因：它是静态扫描，无法计算图标等非文本元素的对比度，也无法检查自定义控件的焦点顺序；它只读代码里的 `Button` label，不运行界面，因此 label 里写了但没显示的文字也会被算作可见。
解决：把 Clean 当作"没有发现已知静态模式"，而不是无障碍达标。图标按钮、自定义控件、动态字体与对比度仍需用 Accessibility Inspector、VoiceOver、TalkBack 实测。

## 六、总结

`mjmirza/app-store-compliance` 的价值不在于"保证过审"，而在于把应用商店合规从一份读完就忘的 PDF，变成一条能在本地和 CI 里执行的门禁。规则外置、严重度分级、三态判定、安装即自测、引用可机检，这几个设计让它比普通的 checklist 仓库更适合长期维护。

它适合两类人：一是用 AI 编程工具快速产出应用、但缺少移动端发布经验的开发者，Hook 能在提交命令前拦住最常见的硬伤；二是需要把合规检查纳入发布流程的团队，`release-audit.py` 的退出码和 `--json` 输出可以直接接流水线。

它也有明确边界。静态扫描看不到账号状态、商店文案、演示账号和后端可用性；规则库再全，也不能替代对 Apple/Google 原文的阅读。项目自己在 README 里反复强调这一点，这反而增加了可信度。另一个现实约束是许可证：它不是 MIT，年营收超过 2000 万美元的公司需要按产品收入支付 0.5% 版税，商用前应读一遍 ORA 2.3 原文。

如果你正在准备下一次提交，最划算的起点就是那两条命令：克隆，扫描。十分钟的成本，换掉一次可能长达一周的拒审循环。

项目地址：<https://github.com/mjmirza/app-store-compliance>
