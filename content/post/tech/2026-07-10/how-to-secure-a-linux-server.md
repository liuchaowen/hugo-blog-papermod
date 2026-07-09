---
title: "手把手加固 Linux 服务器：一份持续演进的安全实战指南"
date: 2026-07-10
description: "How-To-Secure-A-Linux-Server 是 GitHub 上一份持续更新的 Linux 服务器安全加固指南，覆盖 SSH 加固、UFW 防火墙、Fail2Ban/CrowdSec 入侵防御、审计与监控等完整防线。本文梳理其核心思路与可落地的操作清单。"
author: "Cheman"
slug: how-to-secure-a-linux-server
draft: false
categories: [技术, 安全]
tags: [Linux, 服务器安全, 安全加固, GitHub, 开源, SSH, 防火墙]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**How-To-Secure-A-Linux-Server**，这是一份由社区持续维护的 Linux 服务器安全加固实战指南，把从 SSH 到防火墙、从入侵防御到审计监控的完整防线串成了一条可照做的操作链。

## 一、项目概述

[How-To-Secure-A-Linux-Server](https://github.com/imthenachoman/How-To-Secure-A-Linux-Server) 不是某个具体的软件工具，而是一份"会持续生长"的 How-To 文档。作者 imthenachoman 的核心目标是：**手把手教会你如何加固一台暴露在公网的 Linux 服务器，同时让你理解"为什么这些步骤重要"**，而不是只给一堆复制粘贴命令。

它的几个关键特质：

- **理念先行**：在动手前先让你明确自己的安全原则（最小化攻击面、默认拒绝、最小权限），而不是盲目套用配置。
- **覆盖面广且分层**：从"SSH 服务器"→"基础加固"→"网络"→"审计"→"危险区"逐层递进，形成纵深防御（Defense in Depth）。
- **原则可迁移**：指南以 Debian/Ubuntu 系为主，但思路通用，所有发行版都能复用。
- **配套自动化**：社区维护的 [Ansible Playbook 版本](https://github.com/moltenbit/How-To-Secure-A-Linux-Server-With-Ansible) 可把文档中的步骤一键编排，适合批量运维。
- **开放协作**：采用 CC-BY-SA 协议，任何人都能提交 PR 补充新的加固项。

> 一句话定位：它是 Linux 服务器安全领域的"百科全书式 Checklist"，特别适合个人 VPS、自建服务、homelab 玩家作为基线加固参考。

## 二、技术原理

整份指南背后的设计哲学是 **纵深防御**——没有任何单点措施能 100% 挡住攻击，所以要让每一层都增加攻击者的成本。我们可以把它的防线拆成四道防线：

### 1. 身份与访问层（SSH + 权限）

SSH 是服务器对外的"正门"。指南强烈建议关闭密码登录、仅用密钥，并配合 `AllowGroups` 限制可登录的账户组。其底层原理是：`/etc/ssh/sshd_config` 决定了 sshd 的认证策略，配置不当等于把钥匙挂在门上。

### 2. 网络层（防火墙 + 入侵检测）

Linux 内核通过 `netfilter/iptables` 控制流量。UFW 只是 iptables 的"人话前端"。默认拒绝（deny by default）、按需放行的策略，能把攻击面压到最小；而 PSAD、Fail2Ban、CrowdSec 则在第 4 层（网络）和第 7 层（应用）上识别并封禁可疑 IP。

### 3. 应用层（入侵防御）

即使防火墙放行了 22 端口，Fail2Ban 仍会盯着 SSH/Web 日志，发现短时间大量失败登录就动态下发封禁规则。CrowdSec 更进一步——把本地检测到的恶意 IP 上报社区，再下发全局威胁情报黑名单。

### 4. 审计层（可见性）

"你无法防护你不知道的事"。Lynis、AIDE、rkHunter、logwatch、OSSEC 等工具负责持续审视系统状态、文件完整性、rootkit 与日志异常，让入侵尽可能早暴露。

## 三、安装与快速开始

这不是需要 `apt install` 的二进制包，而是"照着做"的指南。最小起步路径如下：

```bash
# 1. 先准备好一台干净的 Linux 服务器（指南建议先确定发行版与安全原则）
# 2. 创建专用于 SSH 登录的用户组，避免直接用 root 登录
sudo groupadd sshusers

# 3. 生成 SSH 密钥对（本地执行，把公钥放到服务器）
ssh-keygen -t ed25519 -C "your@email.com"

# 4. 备份并精简 sshd_config，去掉注释方便审阅
sudo cp --archive /etc/ssh/sshd_config /etc/ssh/sshd_config-COPY-$(date +"%Y%m%d%H%M%S")
sudo sed -i -r -e '/^#|^$/ d' /etc/ssh/sshd_config
```

指南强调：**任何 SSH 改动前务必保留一个仍登录着的会话**，否则一旦配置写错，你可能被自己锁在门外。

## 四、使用方法与实战

### 实战 1：加固 `/etc/ssh/sshd_config`

指南参考 Mozilla OpenSSH 现代配置基线，给出了一份「无论哪种部署都应应用」的核心设置（节选）：

```bash
# 仅允许强算法 HostKey（按优先级）
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# 关闭明文密码、仅用公钥
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes

# 限制可登录组
AllowGroups sshusers

# 缩短空闲超时、限制认证尝试
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
```

> 注意：OpenSSH 9.1+ 可启用 `RequiredRSASize 3072` 强制 RSA 密钥最小 3072 位；老版本需留注释，否则 sshd 可能起不来。修改后用 `sudo sshd -t` 校验语法，再 `sudo systemctl reload sshd`。

### 实战 2：用 UFW 默认拒绝所有流量

```bash
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default deny outgoing   # 偏执模式：出站也默认拒绝
sudo ufw allow ssh                # 先放行 SSH，避免锁死
sudo ufw enable
sudo ufw status verbose
```

### 实战 3：Fail2Ban 自动封禁爆破 IP

```bash
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# 启用 [sshd]  jail，设置 bantime / findtime / maxretry
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### 实战 4：CrowdSec 接入社区威胁情报

```bash
curl -s https://package.cloud.crowdsec.net/.../install.sh | sudo sh   # 安装
sudo cscli collections install crowdsecurity/sshd                    # 启用 SSH 场景
sudo systemctl enable --now crowdsec
sudo cscli decisions list            # 查看已封禁 IP
```

### 进阶：2FA/MFA 双因素登录

通过 PAM 模块（如 `libpam-google-authenticator`），让 SSH 登录需要"密码 + 30 秒动态令牌"双因子，即使密钥泄露也有第二道防线。

## 五、常见问题与解决方案

- **改完 sshd_config 后连不上服务器？**
  先确认还有另一个活跃会话没断开；用 `sudo sshd -t` 校验语法。指南提醒 SSH 会忽略重复冲突设置中的后一条，需手动清理重复项。

- **UFW enable 后被锁在外面？**
  务必在 `enable` 之前先 `ufw allow ssh`。偏执模式（`deny outgoing`）若过严会导致 `apt`/DNS 失败，需按需放行 53、80、443 等。

- **Fail2Ban 没生效？**
  检查 jail 是否启用、日志路径是否匹配当前发行版；`sudo fail2ban-client status` 确认后端（systemd 或 logpath）配置正确。

- **CrowdSec 与 Fail2Ban 能否共存？**
  可以。两者原理相似但情报来源不同，指南建议按需求叠加；注意避免对同一 IP 的规则互相冲突。

- **密钥还是密码？**
  指南明确建议禁用密码登录（`PasswordAuthentication no`），密钥 + 禁用 root 登录是基线中的基线。

## 六、总结

How-To-Secure-A-Linux-Server 的价值不在于发明了什么黑科技，而在于它把零散的安全实践**体系化、分层化、可操作化**——从 SSH 这一道门，到 UFW/CrowdSec 这道墙，再到 Lynis/OSSEC 这双眼睛，构成了一条完整的纵深防御链。对于想认真对待自己服务器安全、却又不知道从何下手的开发者来说，它是一份值得从头到尾照做一遍的"安全基线清单"。配合社区维护的 Ansible 版本，还能把这份知识沉淀成可复用的自动化剧本。

> 安全不是一次性的"加固完成"，而是一个持续演进的过程——这点，从项目名里的 "evolving" 就能管窥一斑。
