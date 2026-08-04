---
title: "MTPROTO FIX By MEKO：用 iptables 分层限流修复 MTProto 代理的 TCP 握手顽疾"
date: 2026-08-04
description: "深度解析 GitHub Trending 项目 MTPROTO_FIX_By_MEKO：它如何通过 iptables hashlimit 分层规则、REJECT 替代 DROP、按 iOS 指纹分流，解决 MTProto 代理首次 TCP 握手卡顿与媒体加载慢的问题，并附源码级的 SNI/PQ 检测实现分析。"
author: "Cheman"
slug: mtproto-fix-by-meko
draft: false
categories: ["技术", "开源", "网络"]
tags: ["MTProto", "iptables", "TCP", "网络调优", "Python", "OpenSSL", "GitHub"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**MTPROTO_FIX_By_MEKO**，它用一套精心设计的 iptables 分层限流规则，解决了 MTProto 代理服务端长期存在的「首次 TCP 握手被判死刑」问题——不需要客户端做任何改动，全部在服务器侧完成。抛开它的应用场景不谈，这个项目在**内核态限流策略设计**与**TLS 指纹检测**上的工程思路，本身就很值得拆解。

> 本文为独立技术分析，聚焦于其中的 TCP/iptables/TLS 工程实现，不构成任何使用建议。请在所在司法辖区法律允许的范围内阅读与实践。

## 一、项目概述

### 它是什么

MTPROTO_FIX_By_MEKO（作者称之为 **MEKO Launcher**）是一个 Bash + Python 编写的服务端管理器，主体能力有两块：

1. **Fix 层**：向服务器注入一套 iptables 规则，修复 MTProto 代理在特定网络环境下「连接建立极慢 / 建立后 2 分钟内被拉黑 / 媒体文件（视频、图片、贴纸）加载缓慢」的问题。
2. **Launcher 层**：把 TELEMT、MTG、MTPROTO.zig 这三种主流 MTProto 实现的安装、更新、回滚、改配置、看日志、装面板、取连接链接等操作，全部收敛进一个交互式菜单，用户不需要手敲任何命令。

项目已在 Telemt 3.4.25、MTProto.zig 1.9.0、MTG 2.2.8、Erlang MTProto Proxy、MTProtoProxy(Python)、JSMTProxy 上验证过，MIT 协议开源。

### 解决的核心问题

作者描述的故障现象非常具体，也是这个项目最有价值的部分——**它对问题的定位比对解法的实现更精彩**：

| 现象 | 表现 |
|---|---|
| 初始 TCP 阶段不稳定 | 连接挂起、长时间建立不上 |
| 首次连接后被封 2 分钟 | 客户端到服务器的访问被临时阻断 |
| iOS 端「无限更新中」 | 客户端卡在 connecting 状态 |
| 媒体不工作 | 视频/图片/GIF/圆形视频/贴纸加载失败 |

### 核心特性

- **单端口通吃所有设备**：iOS / Android / macOS / Desktop 共用一个端口，不需要为 iOS 单独开端口这种「拐杖式」方案。
- **媒体速度不受损**：明确规避了会拖慢媒体的 MSS 钳制方案。
- **一键安装 + 双模式**：标准安装（逐项选择）与自动安装（先声明将执行什么，确认后全自动）。
- **内置域名 SNI 检测器**：判断 Fake TLS 所用域名是否带「marker」，这是 iOS 端能否稳定连上的关键前置条件。

## 二、技术原理

这是本项目最有嚼头的部分。整套 Fix 的本质是：**在 iptables 里构造一个两层分流的状态机，对不同客户端指纹施加不同的 SYN 速率上限，并用 REJECT 而非 DROP 收尾。**

### 2.1 两层分流架构

```
                 ┌─────────────────────────┐
   入站 SYN  ──▶ │  第 1 层：iOS 指纹判定   │
                 └───────┬─────────┬───────┘
                         │ 是 iOS   │ 非 iOS
                         ▼          ▼
              ┌──────────────┐  ┌──────────────────────┐
              │ iOS 专用规则  │  │ 第 2 层：通用限流      │
              │ (独立限额)    │  │ hashlimit 54/minute  │
              └──────────────┘  └──────────┬───────────┘
                                            │ 超限
                                            ▼
                                   REJECT --tcp-reset
```

设计要点在于：iOS 与 Android/Desktop 的**连接建立模式完全不同**。iOS 客户端在弱网和后台恢复时会以短时间内密集重试的方式建连，而 Android/Desktop 更接近线性重试。如果把它们塞进同一个 hashlimit 桶里，iOS 的突发流量会把 Android 的配额吃光，反之 Android 的持续流量会让 iOS 一直触顶。

作者最初的 v2 方案用 **TTL + 包长度** 做设备判定，但这套方案在真实链路上会翻车：iOS 客户端的流量经过多级负载均衡后 TTL 被削减，跳出了预设阈值，于是被误判为 Desktop 并施加了错误的限额。**v3 改用 iOS TLS/TCP 指纹判定**，才把误判率压下来——这也是排障时的一条重要经验：**任何依赖 TTL 做终端识别的方案，都会被中间设备摧毁**。

### 2.2 为什么是 54/minute 而不是 1/second

这是全项目最精妙的一个数字，值得单独说：

- 目标限速是「1 个 SYN 包 / 1.1 秒」。
- iptables 的 `hashlimit` 模块**不支持毫秒粒度**，最小单位是秒。
- 于是换算成分钟维度：`54 / 60 = 0.9 包/秒`，即平均 1 包 / 1.11 秒。

那多出来的 100ms 余量是干什么的？作者的解释是：**为了吃掉瞬时 REJECT 带来的时序误差**。如果限额卡在正好 1 包/秒，抖动会让某个包恰好越界，触发即时 REJECT，而这次 REJECT 会导致客户端到该 MTProto 服务器的连接被封锁 2 分钟。100ms 的缓冲带就是为了让这个边界事件不发生。

```bash
# 概念示意（非项目原文规则）
iptables -A INPUT -p tcp --dport 443 --syn \
  -m hashlimit \
  --hashlimit-name mtproto_syn \
  --hashlimit-above 54/minute \
  --hashlimit-mode srcip \
  -j REJECT --reject-with tcp-reset
```

### 2.3 REJECT vs DROP：一个反直觉的选择

安全领域的肌肉记忆是「能 DROP 就不 REJECT」——不给对端任何信息。但在这个场景下，作者的判断完全相反：

| 策略 | 客户端感知 | 后果 |
|---|---|---|
| `DROP` | 无响应，静默丢弃 | 客户端等待 3–5 秒超时 → 退避重试、间隔越来越长 → 总体延迟爆炸 |
| `REJECT --tcp-reset` | 立即收到 RST | 客户端立刻知道失败，无退避直接重连 → 连上 Telegram 快得多 |

结论是：**当限流的目的是「整形」而非「防御」时，快速失败优于静默丢弃。** 这个取舍思路可以迁移到任何做客户端限流的服务端设计中。

### 2.4 死连接（dead socket）回收

另一个被修复的问题是移动端特有的：

> 移动客户端切到后台时，socket 没有干净关闭，服务端会一直持有这个死连接。用户切回前台时，客户端仍然挂在这个已死的 socket 上，表现为「一直转圈」。

Fix 的做法是调整 keepalive 相关参数，让死连接在**几分钟内**被识别并断开，而不是默认的几小时。客户端返回前台时立刻得到「socket 已死」的信号，直接重连，不再卡死。

### 2.5 为什么必须关掉 MSS

项目强烈建议移除服务端已有的 MSS clamping 规则或 telemt 配置里的 MSS 项，原因很直接：

- MSS clamping 会**削减每个 TCP 包的有效载荷**；
- 载荷变小 → 相同数据量需要更多包 → 吞吐直接掉；
- 表现就是「媒体加载极慢」。

但这里有一个**硬性前置条件**：不使用 MSS 时，Fake TLS 所用域名必须支持 `X25519MLKEM768`（后量子密钥交换组）。否则 iOS 客户端连接后会被封锁。这就引出了项目里那个最有工程含量的 Python 脚本。

### 2.6 源码解析：`proxy_checker.py` 的 PQ 检测

`proxy_checker.py` 是仓库里唯一一个体量较大的 Python 文件（约 39 KB），用来检测一个域名 / IP:port 是否带「marker」。它的判定逻辑是：

> **PQ（X25519MLKEM768）不支持 + Peer Temp Key 是 X25519 ⇒ 有 marker ⇒ iOS 端有被封风险。**

这个脚本有三个实现细节做得相当扎实：

**① 不靠版本号判断能力，靠能力本身判断能力**

Ubuntu 24.04 的系统 openssl 是 3.0.x，不认识 ML-KEM；而 3.5 又不能直接覆盖装进 `/usr`（会搞坏 apt/ssh/systemd），所以通常被编译到独立前缀。脚本因此按优先级搜索多个路径，并且**不解析 `openssl version` 字符串**：

```python
def _supports_pq(path):
    """umeet 这个二进制是否支持 REQUIRED_GROUP。

    通过 `list -tls-groups` 检测，而不是解析 `openssl version`：
    直接回答了我们关心的问题，且不会被 3.5.7-dev / 3.5.7+quic 这类后缀搞挂。
    """
    try:
        proc = subprocess.run(
            [path, "list", "-tls-groups"],
            capture_output=True, text=True, timeout=5,
        )
    except (subprocess.SubprocessError, OSError):
        return False
    return REQUIRED_GROUP in proc.stdout
```

这是特性检测（feature detection）优于版本嗅探（version sniffing）的教科书式例子。

**② 检测器给自己上了限流锁——因为它会被自己的 Fix 打死**

这是我最喜欢的一段。检测脚本用线程池并发探测域名的多个 A 记录，但如果被检测的目标恰好装了 MEKO Fix，并发探测会直接撞上 `54/minute` 的限额，被自己写的规则 RST 掉：

```python
# MEKO 的 fix 会限制入站 SYN：hashlimit 54/minute（约 1.1 秒一次），
# 超限回 REJECT + tcp-reset，客户端侧表现为 ECONNREFUSED。
# 不加停顿的话，检测器在探测装了该 fix 的代理时会把自己打死。
# Lock 是必须的：check_ip() 从 ThreadPoolExecutor 并发调用，
# 不做串行化的话多个 worker 会同时通过时间检查，照样一起撞限额。
RATE_DELAY = 1.3
_rate_lock = threading.Lock()
_last_call = 0.0


def _throttle():
    global _last_call
    with _rate_lock:
        gap = time.monotonic() - _last_call
        if gap < RATE_DELAY:
            time.sleep(RATE_DELAY - gap)
        _last_call = time.monotonic()
```

注意 `_rate_lock` 的必要性说明——「不加锁的话多个 worker 会同时通过时间检查」，这是典型的 check-then-act 竞态，很多人写限流器时都会漏掉。`RATE_DELAY = 1.3` 也比服务端的 1.1 秒留了余量。

**③ 区分「谁的问题」：客户端 / 网络 / 服务器三态归因**

检测工具最容易犯的错误是把「我这边不支持」报告成「对方不支持」。脚本用 `classify_failure` 明确做了三态区分：

```python
def classify_failure(output):
    """区分客户端问题与服务端结论。

    只有 "server" 级别才是对被测域名的判断：
    "client" = openssl 不对，"blocked" = 连接没到达。
    """
    if "gid_cb" in output and REQUIRED_GROUP in output:
        return ("client",
                f"本地 OpenSSL 不支持 {REQUIRED_GROUP} —— 无法检测。"
                f"这不代表服务器不支持。需要 OpenSSL >= 3.5。")
    if "Connection refused" in output or "BIO_connect" in output:
        return ("blocked",
                "连接被拒绝 (RST)。可能触发了目标服务器上 MEKO fix 的限流，"
                "约 2 秒后重试。")
    if "handshake failure" in output:
        return ("server",
                f"服务器拒绝了 {REQUIRED_GROUP} —— 不支持 PQ。")
    if "TIMEOUT" in output:
        return ("blocked", "连接超时。")
    return None
```

最终输出的三色结论也很清晰：

- 🟢 **Marker: 无** — 服务器接受 X25519MLKEM768，域名可用
- 🔴 **Marker: 有** — 不支持 PQ 且 Peer Temp Key 为 X25519，iOS 有被封风险，换域名
- 🟡 **无法判定** — 本地 openssl 能力不足或连接未到达，结论不可信

### 2.7 数据流总览

```
客户端 SYN
   │
   ▼
iptables INPUT (第1层：iOS 指纹匹配)
   ├─ iOS      → iOS 专用 hashlimit 桶
   └─ 非 iOS   → 第2层通用桶 (54/minute, srcip)
                    │
              超限 → REJECT --reject-with tcp-reset
                    │
              通过 ↓
              MTProto 进程 (Telemt / MTG / mtproto.zig)
                    │
                    ▼
              Fake TLS 握手 (SNI 域名需支持 X25519MLKEM768)
                    │
                    ▼
              建立连接 → keepalive 参数保证死连接分钟级回收
```

## 三、安装与快速开始

### 环境要求

- Linux 服务器（Debian/Ubuntu 系为主），root 权限
- 内核 iptables 支持 `hashlimit` 模块
- Python 3（检测脚本用）
- 若使用 SelfSteal 自建域名：**nginx 必须基于 OpenSSL 3.5+ 编译**，否则 iOS 会周期性连不上；备选方案是改用 Caddy

### 安装

```bash
curl -fsSL https://raw.githubusercontent.com/Mekotofeuka/MTPROTO_FIX_By_MEKO/main/install.sh | sudo bash
```

> ⚠️ 老规矩：任何 `curl | sudo bash` 都应该先把脚本下下来读一遍再执行。生产环境更是如此。

安装后用一条命令打开交互菜单：

```bash
mekopr
```

### 最小可用流程

1. 安装/更新脚本（上面那条 curl）
2. 装一个 MTProto 实现：Telemt / MTPROTO.zig / MTG —— 可以直接在菜单里装，**顺序无所谓**（先装代理再打 fix，或反过来都行）
3. 菜单里按 **[1] MTProto FIX 安装菜单**，应用 fix
4. 按 **[5]** 关掉 telemt 配置里内置的 MSS 与 SYN 限制（如果之前配过）
5. 按 **[7]** 检测 SNI 域名，必须拿到 🟢 **Marker: 无**
6. 用 SelfSteal 的话，确认服务器 OpenSSL ≥ 3.5
7. 完成

单独跑域名检测也可以（脚本支持命令行参数）：

```bash
python3 proxy_checker.py example.com
python3 proxy_checker.py 1.2.3.4:443
python3 proxy_checker.py "tg://proxy?server=1.2.3.4&port=443&secret=..."
```

## 四、使用方法与实战

### 4.1 基础用法：全在菜单里

项目的定位是「零命令行」，主菜单覆盖了完整生命周期：

| 操作类别 | 覆盖能力 |
|---|---|
| 代理管理 | 安装 / 更新 / 回滚 / 卸载 Telemt、MTG、mtproto.zig |
| 配置 | 改配置文件、关闭内置 MSS/SYN 限制、获取连接链接 |
| 观测 | 查看日志、查看运行状态 |
| 面板 | 安装与管理 telemt_panel、3x-ui-pro、remnawave 等 |
| Fix | 应用/移除 fix、切换 v3/v4 版本 |
| 优化 | **[2]** 服务器基础调优（作者称测得更快、更稳、更省资源） |

### 4.2 进阶：域名选型是成败关键

实战中 80% 的「装了 fix 还是不行」都出在域名上。判定链路是：

```
选一个 Fake TLS 域名
   │
   ├─ 用 [7] 或 @Sni_checker_bot 检测
   │
   ├─ 🟢 Marker 无  → 可用，继续
   ├─ 🔴 Marker 有  → 换域名（iOS 必炸）
   └─ 🟡 无法判定   → 先修本地 OpenSSL，再测
```

如果坚持用 SelfSteal（自建站伪装）而服务器 OpenSSL 上不去 3.5，有三条路：

1. 升级 OpenSSL 到 3.5 并重新编译 nginx（推荐）
2. 换用 Caddy
3. 退回启用 MSS —— **但媒体会明显变慢**，这是明码标价的取舍

### 4.3 把这套思路迁移到别处

抛开具体场景，这个项目里有三条可以直接复用到自己服务端设计的经验：

1. **限流粒度受工具约束时，用换算而不是妥协。** hashlimit 不支持毫秒，就换成 `54/minute` 表达 1.1 秒——同时主动留出 100ms 抖动余量。
2. **限流的错误响应方式要按目的来选。** 整形用 REJECT（快速失败），防御用 DROP（不给信息）。用错会让延迟指标彻底失真。
3. **异构客户端不要共用一个限流桶。** 移动端与桌面端的重试模式差异巨大，混在一起两边都被拖累；按指纹分层比按端口拆分优雅得多。

## 五、常见问题与解决方案

**Q1：装完 fix 还是连不上**

先排除 IP/端口/网段已被封的情况。作者提到一个很实用的经验：**443 端口不通的代理，换到 9443 往往正常**。如果 IP 本身已经被封，任何 fix 都救不回来。

**Q2：iOS 连不上，Android 正常**

按概率排三个原因：

1. 还在用 v2 fix（TTL + Length 判定）→ 链路上的负载均衡改了 TTL，被误判成桌面端并触发封锁 → **升级到 v3**
2. Fake TLS 域名不支持 `X25519MLKEM768` → 用 **[7]** 或 `@Sni_checker_bot` 检测，🔴 就换域名
3. 用了 SelfSteal 但 nginx 基于 OpenSSL < 3.5 编译 → 升级 OpenSSL 重编 nginx，或换 Caddy

**Q3：媒体（视频/图片/贴纸）加载很慢**

几乎必然是 MSS 在作祟。检查服务端是否还留着 MSS clamping 的 iptables 规则，或 telemt 配置里的 MSS 项，用菜单 **[5]** 关掉。

如果是因为域名不支持 X25519MLKEM768 而被迫开着 MSS 导致的慢——**这是预期行为**，MSS 削减了包大小，直接影响吞吐。想快就得换域名。

**Q4：检测脚本报「不支持 PQ」，但我怀疑是本机问题**

看脚本给的颜色：🟡 表示本地 OpenSSL 能力不足（`gid_cb` 错误）或连接未到达，此时结论**对被测服务器无效**。解决方式是装 OpenSSL ≥ 3.5，或者通过环境变量指定路径：

```bash
MEKO_OPENSSL_BIN=/opt/openssl-3.5/bin/openssl python3 proxy_checker.py example.com
```

**Q5：检测多 IP 域名时大量 Connection refused**

如果目标服务器自己也装了 MEKO fix，并发探测会撞上 `54/minute` 限额。脚本内置了 `RATE_DELAY = 1.3` 秒的全局串行节流来规避，如果仍然出现，等约 2 秒再重试即可（RST 触发的封锁窗口是 2 分钟，所以要避免反复触顶）。

**Q6：连接一段时间后卡住不动**

典型的死连接症状：客户端切后台 → socket 未干净关闭 → 服务端持有死连接 → 切回前台挂在死 socket 上。确认 fix 已正确应用（它会把死连接回收时间从数小时压到几分钟）。

## 六、总结

MTPROTO_FIX_By_MEKO 表面上是个「一键脚本」，但真正的价值在它对问题的**归因深度**：从「iOS 连不上」这个模糊症状，一路挖到 TTL 被中间设备篡改、hashlimit 不支持毫秒、REJECT 与 DROP 对客户端重试行为的差异、MSS clamping 与后量子密钥交换组的耦合关系——每一层都给出了可验证的原因和明确的取舍代价。

几个值得带走的工程结论：

- **特性检测 > 版本嗅探**：`openssl list -tls-groups` 比解析 version 字符串可靠一个数量级。
- **限流器要考虑「打死自己」**：检测工具并发探测被自己规则保护的服务器，是个很容易忽略的自反问题；`_throttle()` 里那个 Lock 的注释值得抄下来。
- **归因要三态而非二态**：失败不只有「对方不行」，还有「我不行」和「没到达」，工具混淆这三者就会误导排障。
- **快速失败有时优于静默丢弃**：这条在任何有客户端重试逻辑的系统里都成立。

如果你在做任何涉及 TCP 层限流、异构客户端整形、或者 TLS 能力探测的工作，这个仓库的规则设计与 `proxy_checker.py` 都值得读一遍——技术密度远超它「一键脚本」的外表。

**项目地址**：<https://github.com/Mekotofeuka/MTPROTO_FIX_By_MEKO>（MIT License）

> 免责声明：本文为独立技术分析，仅用于网络协议与系统调优的学习研究。文中涉及的任何工具请在所在地法律允许的范围内使用，作者与本站不对任何第三方行为负责。
