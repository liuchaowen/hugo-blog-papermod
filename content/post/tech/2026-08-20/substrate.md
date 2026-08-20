---
title: "Agent Substrate：大规模 AI Agent 部署的高密度运行时环境"
date: 2026-08-20
description: "Agent Substrate 是 Google 开源的高性能 Agent 运行时基础设施，通过 Actor-Worker 多路复用架构实现亚秒级 Agent 挂起/恢复，支持 30 倍以上资源超售，让大规模 AI Agent 部署变得经济可行。"
author: "Cheman"
slug: substrate
draft: false
categories: ["技术", "云计算", "AI基础设施"]
tags: ["Agent Substrate", "Kubernetes", "AI Agent", "gVisor", "微虚拟机", "开源", "Google"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Agent Substrate**，这是 Google 开源的大规模 AI Agent 部署基础设施，一句话描述核心价值：通过 Actor-Worker 多路复用架构，实现 30 倍以上的资源超售，让大规模 Agent 部署从"烧钱"变成"省钱"。

## 一、项目概述

### 项目背景

随着 AI Agent 应用的爆发式增长，传统的容器化部署方式面临严峻挑战：每个 Agent 都需要独立的运行环境（内存、文件系统、进程空间），但 Agent 大部分时间处于空闲状态（等待用户输入、API 响应、模型推理），导致资源利用率极低（通常低于 5%）。

**Agent Substrate** 应运而生，它是一个高性能、高密度的 Agent 运行时环境，专门为大规模 Agent 部署设计。其核心理念是：**将大量"Actor"（Agent 应用）映射到少量"Worker"（物理运行环境），利用 Agent 的空闲特性实现重度的资源复用**。

### 核心特性

1. **亚秒级挂起/恢复**：Agent 可以在 <1 秒内完成状态保存和恢复，实现"瞬移"到任意可用 Worker
2. **状态持久化**：完整的内存状态（RAM）和文件系统状态通过快照保存，Agent 重启后恢复如初
3. **30 倍以上资源超售**：官方 Demo 展示了 250 个有状态 Actor 复用 8 个物理 Pod
4. **多沙箱技术支持**：支持 gVisor 和 microVM 两种沙箱隔离技术
5. **Kubernetes 原生**：基于 K8s 构建，支持 Pod 自动扩缩容和统一基础设施管理

### 架构设计

Agent Substrate 的架构围绕以下核心概念展开：

- **Actor**：应用实例（如 AI Agent），每个 Actor 有独立的身份、内存状态和文件系统
- **Worker**：物理运行环境（Pod），多个 Actor 可以时分复用同一个 Worker
- **Atespace**：命名空间级别的隔离单元，Actor 属于某个 Atespace
- **ActorTemplate**：Actor 的模板定义，类似于 Deployment
- **WorkerPool**：Worker 的资源池，支持自动扩缩容

## 二、技术原理

### 核心架构：控制平面与数据平面

Agent Substrate 的控制平面由以下组件构成：

```
┌─────────────────────────────────────────────────────────────┐
│                     ate-api (Control Plane)                 │
│  gRPC API: CreateActor, DestroyActor, SuspendActor, ResumeActor │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ atelet   │    │ atelet   │    │ atelet   │
        │ (Node)   │    │ (Node)   │    │ (Node)   │
        └──────────┘    └──────────┘    └──────────┘
              │               │               │
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Workers  │    │ Workers  │    │ Workers  │
        │ (Pods)   │    │ (Pods)   │    │ (Pods)   │
        └──────────┘    └──────────┘    └──────────┘
```

**关键组件说明**：

1. **ate-api**：核心控制平面 API Server，暴露 gRPC 端点管理 Actor 和 Worker 生命周期
2. **atelet**：节点级 DaemonSet，负责物理 Worker Pod 的监管、快照协调和状态迁移
3. **atecontroller**：Kubernetes Controller，调和 WorkerPool 和 ActorTemplate 自定义资源
4. **atenet**：网络控制器，提供 DNS、Envoy 路由和代理 sidecar
5. **ateom-gvisor / ateom-microvm**：沙箱内部助手，执行 `runsc` checkpoint/restore 或 microVM 管理

### Actor 生命周期管理

Actor 的核心价值在于其**有状态性**——内存中的变量、打开的文件句柄、运行中的进程都可以完整保存。实现这一能力的核心技术是 **Checkpoint/Restore**：

```bash
# gVisor 沙箱的快照流程（简化）
runsc checkpoint --image-path=/state/snapshot <container-id>

# 恢复快照
runsc restore --image-path=/state/snapshot <container-id>
```

Agent Substrate 通过 `ateom-gvisor` 在 Pod 内部执行这些命令，将完整状态保存到持久化存储（GCS/S3），然后在任意 Worker 上恢复。

### 网络路由：请求如何找到 Actor？

Actor 可能在任意 Worker 上运行，网络路由是关键挑战。Agent Substrate 使用 **动态 DNS + Envoy 路由**：

```yaml
# Actor 的 DNS 名称格式
<actor-name>.<atespace>.actors.resources.substrate.ate.dev

# 示例
my-counter-1.demo.actors.resources.substrate.ate.dev
```

当请求到达 `atenet-router` 时：

1. 查询 Actor 当前绑定的 Worker
2. 如果 Actor 处于挂起状态，触发恢复
3. 将请求路由到目标 Worker

### 沙箱隔离技术选型

Agent Substrate 支持两种沙箱技术：

| 特性 | gVisor | microVM |
|------|--------|---------|
| 隔离强度 | 系统调用过滤 | 硬件级隔离 |
| 性能开销 | 低（约 5-10%） | 中（约 10-20%） |
| 启动速度 | 快 | 较慢 |
| 快照大小 | 较小 | 较大 |
| 适用场景 | 一般 Agent | 高安全需求 |

**gVisor** 使用用户态内核（runsc）拦截系统调用，提供轻量级隔离；**microVM** 使用 cloud-hypervisor 运行完整 Linux 内核，提供更强的隔离性。

### 多路复用算法

Actor-Worker 映射的核心策略：

1. **Actor 注册**：所有 Actor 注册到控制平面，初始状态为 `Suspended`
2. **请求触发**：当请求到达时，路由器查询 Actor 状态
3. **快速唤醒**：如果 Actor 挂起，选择一个可用 Worker，恢复其状态
4. **空闲回收**：Actor 空闲超过阈值后，自动挂起并释放 Worker
5. **请求排队**：当 Worker 池饱和时，路由器可以"停车"请求而非返回 503

## 三、安装与快速开始

### 环境要求

- **Go 1.26+**
- **kubectl**
- **Docker**
- **kind**（本地开发集群）或 **GKE**（生产环境）

### 本地快速体验（kind 集群）

```bash
# 1. 创建 kind 集群和本地镜像仓库
hack/create-kind-cluster.sh

# 2. 安装 Agent Substrate 核心组件
hack/install-ate-kind.sh --deploy-ate-system

# 3. 安装 Counter Demo
hack/install-ate-kind.sh --deploy-demo-counter

# 4. 安装 kubectl-ate 插件
go install ./cmd/kubectl-ate

# 5. 创建 Atespace 和 Actor
kubectl ate create atespace demo
kubectl ate create actor my-counter-1 -a demo --template=ate-demo-counter/counter

# 6. 端口转发网络路由器
kubectl port-forward -n ate-system svc/atenet-router 8000:80
```

### 测试 Actor

在另一个终端发送 HTTP 请求：

```bash
curl -X POST \
  -H "Host: my-counter-1.demo.actors.resources.substrate.ate.dev" \
  -i http://localhost:8000/
```

每次请求都会增加计数器，即使 Actor 被挂起和恢复，计数器状态也会保持。

### GKE 生产部署

```bash
# 1. 配置环境变量
cp hack/ate-dev-env.sh.example .ate-dev-env.sh
source .ate-dev-env.sh

# 2. 认证
gcloud auth application-default login --project=${PROJECT_ID}

# 3. 创建 GCP 资源（GKE、Redis、GCS、IAM）
go run ./tools/setup-gcp bootstrap

# 4. 部署 Agent Substrate
./hack/install-ate.sh --deploy-ate-system

# 5. 部署 Demo
./hack/install-ate.sh --deploy-demo-counter
```

## 四、使用方法与实战

### 基础用法：创建有状态 Actor

```bash
# 创建 Atespace（命名空间）
kubectl ate create atespace production

# 创建 ActorTemplate（模板）
cat <<EOF | kubectl apply -f -
apiVersion: ate.substrate.dev/v1
kind: ActorTemplate
metadata:
  name: my-agent
  namespace: production
spec:
  image: gcr.io/my-project/my-agent:latest
  resources:
    memory: "512Mi"
    cpu: "500m"
EOF

# 创建 Actor 实例
kubectl ate create actor agent-001 -a production --template=my-agent
```

### 进阶用法：配置 WorkerPool 自动扩缩容

```yaml
apiVersion: ate.substrate.dev/v1
kind: WorkerPool
metadata:
  name: agent-pool
  namespace: production
spec:
  minReplicas: 2
  maxReplicas: 100
  template:
    spec:
      containers:
      - name: worker
        resources:
          memory: "4Gi"
          cpu: "2"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agent-pool-hpa
spec:
  scaleTargetRef:
    apiVersion: ate.substrate.dev/v1
    kind: WorkerPool
    name: agent-pool
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: External
    external:
      metric:
        name: assigned_actor_count
      target:
        type: AverageValue
        averageValue: "10"  # 每个 Worker 最多承载 10 个 Actor
```

### 实际项目示例：Claude Code 多路复用

官方提供了 **Claude Code Multiplex** Demo，展示了如何将多个 Claude Code Agent 复用到有限的 Worker 池：

```bash
# 部署 Claude Code Multiplex Demo
./hack/install-ate.sh --deploy-demo-claude-code-multiplex
```

场景：10 个开发者同时使用 Claude Code，但只有 3 个物理 GPU Worker。Agent Substrate 会：

1. 当开发者 A 使用 Claude Code 时，唤醒其 Actor 到 GPU Worker
2. 当开发者 A 离开（空闲超过阈值），挂起 Actor 释放 GPU
3. 当开发者 B 发起请求，立即唤醒其 Actor

### 请求排队机制

当 Worker 池饱和时，可以启用请求排队而非返回 503：

```yaml
apiVersion: ate.substrate.dev/v1
kind: WorkerPool
metadata:
  name: oversubscribed-pool
spec:
  parking:
    enabled: true
    maxQueueSize: 100
    timeoutSeconds: 30
```

## 五、常见问题与解决方案

### 安装问题

**Q: kind 集群创建失败**

```bash
# 错误信息
ERROR: failed to create cluster: node(s) already exist for cluster "ate"

# 解决方案
./hack/delete-kind-cluster.sh
./hack/create-kind-cluster.sh
```

**Q: kubectl-ate 安装后找不到命令**

```bash
# 确保 GOPATH/bin 在 PATH 中
export PATH=$PATH:$(go env GOPATH)/bin

# 或者直接使用绝对路径
~/go/bin/kubectl-ate
```

### 运行时问题

**Q: Actor 无法启动**

检查 ActorTemplate 和 WorkerPool 状态：

```bash
kubectl get actortemplate -n production
kubectl get workerpool -n production
kubectl get actors -n production
kubectl describe actor my-counter-1 -n demo
```

常见原因：
- WorkerPool 未创建或无可用 Worker
- 镜像拉取失败
- 资源不足（内存/CPU）

**Q: 快照恢复失败**

检查持久化存储配置：

```bash
# 检查 GCS/S3 配置
kubectl get secret ate-state-storage -n ate-system -o yaml

# 查看 atelet 日志
kubectl logs -n ate-system daemonset/atelet
```

### 性能问题

**Q: Actor 恢复速度慢**

影响因素：
- 快照大小（microVM 快照通常 >1GB，gVisor 较小）
- 存储网络带宽
- Worker 资源状态

优化建议：
- 使用 gVisor 而非 microVM（如安全要求允许）
- 使用高性能存储（如 GCP Persistent Disk SSD）
- 预热 Worker 池（保持一定数量空闲 Worker）

**Q: 资源利用率仍然低**

检查 Actor 空闲阈值配置：

```yaml
apiVersion: ate.substrate.dev/v1
kind: ActorTemplate
metadata:
  name: my-agent
spec:
  idleTimeoutSeconds: 60  # 空闲 60 秒后挂起
  maxResumeLatencyMs: 500 # 目标恢复延迟
```

### 兼容性

**Q: 支持哪些 Agent 框架？**

Agent Substrate 是框架无关的，支持：
- **Google ADK**：原生支持 Actor 身份和持久化内存
- **LangChain**：适合长时间运行的有状态 Agent
- **Claude Code**：支持高密度、有状态的编码环境
- **MCP Server**：部署安全沙箱化的 MCP 服务器

**Q: 支持哪些 Kubernetes 版本？**

当前支持最新稳定版和前一个次版本。例如，如果最新稳定版是 1.31，则支持 1.30 和 1.31。

## 六、总结

Agent Substrate 是 AI Agent 基础设施领域的重大创新，它通过以下技术组合解决了大规模 Agent 部署的成本难题：

1. **Actor-Worker 多路复用**：利用 Agent 空闲特性，实现 30 倍以上资源超售
2. **亚秒级快照恢复**：通过 gVisor/microVM 的 checkpoint 能力，完整保存和恢复状态
3. **动态路由**：请求自动找到当前运行的 Actor，对应用透明
4. **Kubernetes 原生**：与企业现有基础设施无缝集成

目前项目处于早期开发阶段，API 可能变化，不建议直接用于生产环境。但对于需要大规模部署 Agent 的团队，这是值得关注和提前学习的技术方向。

**推荐人群**：
- AI Agent 平台工程师
- 大规模 LLM 应用架构师
- Kubernetes 基础设施团队
- 对 Agent 运行时优化感兴趣的工程师

**项目地址**：https://github.com/agent-substrate/substrate

**相关资源**：
- [官方 Demo 视频](https://www.youtube.com/watch?v=ZEzkCFJkzjY)
- [架构文档](https://github.com/agent-substrate/substrate/blob/main/docs/architecture.md)
- [API 配置指南](https://github.com/agent-substrate/substrate/blob/main/docs/api-guide.md)
- [威胁模型](https://github.com/agent-substrate/substrate/blob/main/docs/threat-model.md)
