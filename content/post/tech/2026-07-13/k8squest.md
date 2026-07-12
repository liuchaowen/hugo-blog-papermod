---
title: "K8sQuest：50 关本地闯关，把 Kubernetes 排障玩成游戏"
date: 2026-07-13
description: "K8sQuest 是一个本地游戏化的 Kubernetes 训练平台，内置 50 个渐进式故障排查关卡，覆盖 Pod、部署、网络、存储与安全的真实场景，无需云账号即可动手练习 kubectl 排障与调试。"
author: "Cheman"
slug: k8squest
draft: false
categories: [技术, 开源]
tags: [Kubernetes, GitHub, 开源, 运维, 云原生]
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

今天在 GitHub Trending 上看到一个有意思的项目：**K8sQuest**，它用「闯关打怪」的方式把枯燥的 Kubernetes 排障训练做成了游戏，而且完全跑在本地、零云成本。

## 一、项目概述

K8sQuest 是一个**本地、游戏化的 Kubernetes 学习平台**，核心玩法很简单：每一关会故意「搞坏」集群里的某些东西，你的任务就是用 `kubectl` 把它修好。项目底层依赖 `kind`（Kubernetes in Docker）在本地拉起一个真实集群，因此你面对的不是模拟题，而是真实的资源对象、真实的状态、真实的报错。

整个学习路径被设计成 **5 个世界（World）、共 50 个渐进式挑战**，从入门到进阶完整覆盖：

- 🌍 **World 1：核心基础**（Level 1–10，1000 XP）— CrashLoopBackOff、ImagePullBackOff、Pending Pod、Label/Selector 错配等高频故障
- 🏆 **World 2：部署与扩缩容**（Level 11–20，1350 XP）— 滚动更新、回滚、HPA、探针、PodDisruptionBudget
- 🌐 **World 3：网络与服务**（Level 21–30，2100 XP）— ClusterIP/NodePort/LoadBalancer、DNS、Ingress、NetworkPolicy
- 💾 **World 4：存储与有状态应用**（Level 31–40，2600 XP）— PV/PVC、StatefulSet、ConfigMap/Secret、权限
- 🔐 **World 5：安全与生产运维**（Level 41–50，3150 XP）— RBAC、SecurityContext、资源配额、节点调度，最终关是「混沌终章」——9 个故障同时爆发

完整旅程合计 **50 关 / 10200 XP**，从新手一路打到「Kubernetes Master」。

主要特性包括：实时资源监控（`check` 命令）、渐进式提示（`hints`，每用一次解锁更多）、新手段落式通关指引、关卡后的**复盘（Debrief）**讲解「为什么这样修有效」并附真实生产事故案例，以及 XP / 进度 / 自动存档系统。

## 二、技术原理

K8sQuest 本质是一套**「故障注入 + 校验」的引擎**，用 Bash 脚本驱动，Python 负责引擎逻辑与终端 UI（依赖 `rich`、`pyyaml`）。

```
requirements.txt
rich>=13.0.0
pyyaml>=6.0
```

其工作流程可以理解为三步循环：

1. **注入故障（Break）**：每个关卡在 `k8squest` 命名空间内创建/篡改真实资源（例如把 Deployment 的副本数改成 0、把镜像名写错触发 ImagePullBackOff），并配置环境依赖。
2. **玩家排障（Fix）**：玩家在第二个终端里用 `kubectl` 观察与修复——这正是训练的目的。
3. **校验通过（Validate）**：`validate` 命令检查集群实际状态是否恢复健康，通过即发放 XP 并触发复盘。

关键设计点：

- **多终端工作流**：游戏终端保持运行，玩家另开一个终端用 `kubectl` 操作。这种「边观察边修复」的模式，正是真实生产排障的缩影。
- **RBAC 隔离**：所有操作被限制在 `k8squest` 命名空间，配合安全护栏（Safety Guards）默认开启——阻止删除 `kube-system`、`default` 等系统命名空间，阻断集群级破坏性操作，执行危险动作前需二次确认。这让**新手也很难把环境彻底搞崩**。
- **可重置**：`engine/reset.py` 支持单关或全量重置，卡关时随时重来。

## 三、安装与快速开始

### 环境要求

- Docker Desktop（需处于运行状态）
- `kubectl`、`kind`、`bash`、`jq`
- Python 3.9+

### 安装步骤（macOS / Linux）

```bash
git clone https://github.com/Manoj-engineer/k8squest.git
cd k8squest
./install.sh
```

Windows 用户需使用 **Git Bash**（不要 PowerShell/CMD），并按文档装好 Docker Desktop、kubectl、kind、Python 3.9+、jq 等依赖。

### 最简运行

```bash
# 一次性安装
./install.sh

# 开始游戏（保持此终端运行）
./play.sh
```

## 四、使用方法与实战

启动后，游戏终端会给出每一关的**任务简报**（难度、预计耗时、涉及的知识点）。典型流程：

1. 运行 `./play.sh` 启动游戏（第一个终端保持运行）
2. 阅读任务简报，理解「什么坏了」
3. ⚠️ **新开一个终端**，在第二个终端里用 `kubectl` 调查 Pod、日志、事件
4. 用 `kubectl` 应用修复
5. 回到游戏终端选择 `check` / `validate` / `guide` 验证
6. 通过校验后获得 XP 与复盘

游戏内可用命令：

```text
check     实时监控资源状态（watch 变化）
guide     逐步通关指引
hints     渐进式提示（越用解锁越多）
solution  查看 solution.yaml
validate  校验你的修复是否生效
skip      跳过本关（无 XP）
quit      退出（进度自动保存）
```

**实战示例**（以 World 1 Level 1 的 CrashLoopBackOff 为例）：在游戏终端看到 Pod 反复崩溃后，于第二个终端执行：

```bash
kubectl -n k8squest get pods
kubectl -n k8squest logs <pod-name> --previous
kubectl -n k8squest describe pod <pod-name>
```

根据日志定位崩溃根因（如启动命令错误、依赖缺失、配置缺失），修正 Deployment 的镜像/命令/配置后，`validate` 即可通关，随后收到复盘讲解。

卡关想重来时：

```bash
source venv/bin/activate
python3 engine/reset.py level-1-pods   # 重置 World 1 第一关
python3 engine/reset.py all             # 重置全部
```

## 五、常见问题与解决方案

根据 README 的排障文档，高频问题集中在环境层面：

- **`TypeError: 'type' object is not subscriptable`**：使用的是 Python 3.8 或更旧版本，K8sQuest 要求 **Python 3.9+**。macOS 用 `brew install python@3.11`，Linux 用 `sudo apt install python3.11`，Windows 装 3.11+。
- **`bash: command not found`**：Windows 下务必使用 **Git Bash**，而非 PowerShell 或 CMD。
- **`docker: command not found`**：Docker Desktop 未启动或仍在初始化，启动并等待完全就绪。
- **脚本出现 `^M` 错误**：换行符问题，执行 `git config core.autocrlf input && git rm --cached -r . && git reset --hard` 重置。

兼容性方面，项目官方支持 **Linux、macOS、Windows（Git Bash / WSL2）**，其中 WSL2 提供最原生的体验。

## 六、总结

K8sQuest 把「读文档」变成了「动手修」，用真实集群 + 游戏化机制解决了 Kubernetes 学习里最难的「缺乏练习环境」问题。它的几个亮点尤其值得肯定：**完全本地、零成本**免去云账号负担；**默认安全护栏**让新手敢动手；**通关复盘**把「知其然」延伸到「知其所以然」，还顺带补上了生产事故与面试视角。如果你正想系统补齐 kubectl 排障能力，或者带团队做 K8s 内训，这是个值得 Star 的开源项目。
