---
title: "用 Python 命令行逆向 GetContact 私有 API：getcontact-cli 技术拆解"
date: 2026-08-22
description: "getcontact-cli 是一个以 Python 编写的命令行工具，通过逆向还原 GetContact Android 客户端的通信协议（AES-256-ECB 加密、HMAC-SHA256 签名、Diffie-Hellman 密钥协商），在不安装 App 的情况下直接查询手机号归属信息与标签。本文从源码角度拆解其协议还原、凭据管理与批量查询实现。"
author: "Cheman"
slug: getcontact-cli
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, 逆向, Python, API]
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

今天在 GitHub Trending 上看到一个硬核的逆向研究项目：**getcontact-cli**。它把 GetContact Android 客户端的私有 API 通信协议完整复刻到了一个纯 Python 命令行工具里，让你无需安装 App、也无需浏览器，就能用脚本直接查询手机号信息。

## 一、项目概述

getcontact-cli 由 `xdreizein666` 维护，定位是一个**独立的研究与学习项目（research and learning project）**，核心目标是理解移动端 App 如何与后端服务通信、认证流程与 API 请求是如何组织的。

它能做的事情包括：

- 查询单个手机号：`displayName`（GetContact 对其展示的名字）、标签数量、可用邮箱；
- 查看某个号码被其他人保存的标签列表（tags）；
- 查询账号剩余的搜索配额与重置日期；
- 通过 CSV 文件批量查询多个号码；
- 在账号被限流（HTTP 403）时交互式处理 captcha；
- 通过 WhatsApp 验证码流程自己生成并保存账号凭据；
- 本地保存多个账号并在它们之间切换。

每次命令的输出都会自动落盘到 `results/` 目录，方便脚本化处理与留档。

> ⚠️ 负责任使用提示：该项目在 `README` 中明确声明它**并非 GetContact 官方客户端**，会伪装成官方客户端访问其私有 API，返回的数据也包含他人的个人信息。作者强调项目仅用于技术学习、API 通信研究与安全探索，**不鼓励**滥用、批量抓取或侵犯他人隐私。请仅在有权查询的号码上使用该工具，并遵守当地数据保护法规（#DWYOR）。

## 二、技术原理

整个工具的本质是：把 GetContact Android 8.4.0 客户端的请求「翻译」成 Python 函数。下面从源码 `gtc.py` 中提取几个关键环节。

### 1. 请求加密与签名

客户端发出的每个请求体都先用账号专属的 `finalKey` 做 **AES-256-ECB** 加密，再包裹成 `{"data": "<base64>"}` 发送；同时附带一个 `x-req-signature` 请求头，用于对请求做完整性校验：

```python
def _sig(ts: str, message: str, key_hex: str) -> str:
    mac = hmac.new(bytes.fromhex(key_hex), f"{ts}-{message}".encode(), hashlib.sha256)
    return base64.b64encode(mac.digest()).decode()

def encrypt(data: str, key_hex: str) -> str:
    enc = Cipher(algorithms.AES(bytes.fromhex(key_hex)), modes.ECB()).encryptor()
    return base64.b64encode(enc.update(_pad(data.encode())) + enc.finalize()).decode()
```

其中 `finalKey` 来自注册阶段的 **Diffie-Hellman 密钥协商**。客户端发送自己的公钥，服务端返回它的公钥，双方各自用 `SHA-256(共享密钥)` 派生出 AES 密钥：

```python
DH_P = 900719898367
DH_G = 7

def dh_final_key(priv: int, server_pub: int) -> str:
    return hashlib.sha256(str(pow(int(server_pub), priv, DH_P)).encode()).hexdigest()
```

服务端响应若带有 `data` 字段，则用同样的 `finalKey` 解密后再做 JSON 解析——整个链路都是端到端可逆的。

### 2. 容易被误导的端点命名

作者特别标注了一个坑：`/v2.8/search` 实际返回的是**个人资料（profile）**，而 `/v2.8/number-detail` 返回的才是**标签列表（tags）**，命名正好相反。修复映射后的核心查询逻辑如下：

```python
def api_search(cred: dict, phone: str, source: str) -> dict:
    # /v2.8/search -> profile; /v2.8/number-detail -> tags
    endpoint = "/v2.8/number-detail" if source == "tags" else "/v2.8/search"
    ...
```

### 3. 账号注册与 WhatsApp 验证

`generate` 命令完整复现了「注册一个新设备 → DH 协商密钥 → 通过 VerifyKit 走 WhatsApp 验证」的全流程：`/v2.8/register` 拿到 `token` 和服务端公钥，随后一系列 `/v2.8/init-*` 初始化端点，最后通过 VerifyKit（`api.verifykit.com`）生成一条携带验证码的 WhatsApp 深链，等待用户发送后回查 `sessionId` 完成校验。

### 4. 凭据安全设计

生成的凭据（token、`finalKey`、`clientDeviceId`）保存在 `~/.config/gtc/credentials.json`，在 POSIX 系统上以 `0o600` 权限写入，相当于把这份文件当作密码来保护：

```python
def save_store(store: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CRED_FILE.write_text(json.dumps(store, indent=2), "utf-8")
    try:
        os.chmod(CRED_FILE, 0o600)
    except OSError:
        pass
```

## 三、安装与快速开始

环境要求很低：**Python 3.9+**，外加两个依赖包：

```bash
pip install requests cryptography
```

仓库里没有构建步骤、也无需修改任何配置文件。克隆后即可运行：

```bash
python gtc.py          # 进入交互式菜单（适合日常使用）
python gtc.py search 08123456789          # 直接查询资料
python gtc.py search 08123456789 -t tags  # 查询标签
python gtc.py quota                        # 查看配额
```

所有号码都会按印尼场景归一化为 E.164 格式：`08…` → `+628…`，`62…` → `+62…`，已带 `+` 的保持不变。

## 四、使用方法与实战

工具提供两种使用方式：**菜单模式**（无参数直接运行，显示编号功能列表）和**命令模式**（适合脚本化）。命令模式的核心子命令如下：

| 命令 | 作用 |
| --- | --- |
| `search <号码>` | 查询单号，`-t profile\|tags`，`--json` 取原始响应 |
| `batch <file.csv>` | 批量查询 CSV，`-o` 指定输出，`--delay` 控制间隔（默认 1.5 秒） |
| `quota` | 查看 `search` 与 `numberDetail` 剩余配额及重置日期 |
| `captcha` | 账号被临时封禁时交互式解验证码 |
| `generate <号码>` | 通过 DH + WhatsApp 注册并保存新凭据 |
| `cred list\|add\|use\|remove` | 管理已保存的多个账号 |

一个实战示例——批量查询：

```bash
python gtc.py batch nomor.csv --delay 2
```

CSV 格式为每行一个号码（首行若含 `phone` / `nomor` 等表头则按该列读取），输出同样是一份 CSV：`phone,status,displayName,tagCount,tags,error`。单个号码失败不会中断整个流程，对应行会被标记 `error`，其余继续。

环境变量也提供了灵活性：`GTC_CONFIG_DIR` 改变凭据位置，`GTC_RESULTS_DIR` 改变输出目录，`GTC_NO_BANNER` 可隐藏启动横幅与日志。

## 五、常见问题与解决方案

**1. 请求过快触发 captcha（HTTP 403）**
这是限流机制。批量查询时调高 `--delay`（如 `--delay 2` 或更大），若已经触发，用 `python gtc.py captcha` 交互式完成验证解锁。

**2. 配额耗尽返回错误而非空结果**
搜索配额跟随账号订阅。用 `quota` 命令确认剩余量，耗尽即报错，需要等待 `renewDate` 重置。

**3. 国外号码结果异常**
默认国家为印尼（`COUNTRY = "id"`）。非印尼号码需写全 `+国家码`，否则可能影响响应准确性。

**4. 协议常量失效**
HMAC 密钥与应用版本号（`APP_VERSION = "8.4.0"`）是写死在 `gtc.py` 顶部的静态常量。一旦 GetContact 更换这两者，需手动更新源码里对应的常量。

**5. 凭据与结果文件泄露**
`credentials.json` 等同于账号密码，`results/` 目录可能包含敏感号码信息（已被 `.gitignore` 排除）。不要将凭据提交到公开仓库，也不要在公网论坛晒截图。

## 六、总结

getcontact-cli 是一个相当「上强度」的逆向学习样本：它把移动端私有 API 的认证协商（DH 密钥交换）、请求加密（AES-256-ECB）、签名（HMAC-SHA256）、第三方验证（VerifyKit / WhatsApp）整条链路用不到 700 行的 Python 干净复现，并考虑了凭据权限、批量容错、限流解封等工程细节。对于想理解「App 到底是怎么跟服务器说话的」的开发者来说，是一份非常具体的参考材料。再次提醒：请把它当作学习用途，在合法合规、尊重他人隐私与平台 ToS 的前提下使用。
