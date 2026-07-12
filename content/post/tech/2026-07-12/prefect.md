---
title: "Prefect：让 Python 脚本秒变生产级数据工作流的利器"
date: "2026-07-12"
description: "Prefect 是一个 Python 原生的工作流编排框架，几行代码即可将脚本升级为具备调度、重试、可观测性的生产级数据管道，支持自托管与云端两种部署模式。"
author: "Cheman"
slug: prefect
draft: false
categories: ["技术", "开源"]
tags: ["Python", "数据工程", "工作流编排", "ETL", "自动化"]
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

Prefect 是一个 Python 原生的工作流编排框架，GitHub stars 已超过 25k，是 data pipeline 领域近年来最受关注的开源项目之一。只需几行代码，就能把一个普通 Python 脚本升级为具备调度、重试、可视化监控能力的生产级数据管道。

## 一、项目概述

Prefect 由 PrefectHQ 团队开发，当前版本为 3.x，主打"将脚本提升为生产工作流"这一核心理念。与 Airflow 相比，Prefect 的学习曲线更低，API 更 Pythonic，是数据团队快速实现工作流自动化的理想选择。

**核心特性：**

- **Pythonic 装饰器驱动**：用 `@flow` 和 `@task` 装饰器即可定义工作流，无需学习 DAG 专用语法
- **原生可观测性**：内置 UI，实时追踪每个任务的执行状态、日志和耗时
- **灵活调度**：支持 Cron 表达式、定时触发、事件驱动等多种调度模式
- **错误恢复**：内置重试机制、超时控制、任务依赖管理
- **双模式部署**：可自托管 Prefect Server（SQLite/PostgreSQL），也可使用托管 Prefect Cloud
- **轻量级客户端**：提供 `prefect-client` 独立包，适用于 ephemeral 执行环境

**技术栈：**

- Python 3.10 ~ 3.14
- 核心依赖：FastAPI、Pydantic 2、SQLAlchemy 2、httpx、uvicorn
- 异步支持：aiosqlite、asyncpg
- 构建工具：hatchling + versioningit

## 二、技术原理

### 2.1 Flow 与 Task 架构

Prefect 的核心抽象是 **Flow**（工作流）和 **Task**（任务）：

```python
from prefect import flow, task

@task(log_prints=True, retries=3)
def get_stars(repo: str):
    """获取 GitHub 仓库的 stars 数量"""
    url = f"https://api.github.com/repos/{repo}"
    count = httpx.get(url).json()["stargazers_count"]
    print(f"{repo} has {count} stars!")
    return count

@flow(name="GitHub Stars", log_prints=True)
def github_stars(repos: list[str]):
    """并行获取多个仓库的 stars"""
    for repo in repos:
        get_stars(repo)

if __name__ == "__main__":
    github_stars(["PrefectHQ/prefect", "python/cpython"])
```

- `@flow` 包装整个工作流，管理执行上下文、调度和监控
- `@task` 包装单个任务，支持重试、超时、并发控制
- Flow 和 Task 支持嵌套组合，构建复杂 DAG

### 2.2 调度与部署机制

Prefect 的 Deployment（部署）机制将工作流代码与调度配置分离：

```python
# 方式一：Cron 调度
if __name__ == "__main__":
    github_stars.serve(
        name="first-deployment",
        cron="0 * * * *",  # 每小时执行
        parameters={"repos": ["PrefectHQ/prefect"]}
    )

# 方式二：Interval 间隔调度
github_stars.serve(
    name="interval-deployment",
    interval=3600,  # 每小时
    parameters={"repos": ["PrefectHQ/prefect"]}
)
```

### 2.3 可观测性：内置 UI

运行 `prefect server start` 后，Prefect 自动启动本地 Web UI（默认 `http://localhost:4200`），展示：

- 每个 Flow Run 的状态、时间线、DAG 图
- 每个 Task 的日志、输入输出、重试历史
- 调度器活动与事件流

## 三、安装与快速开始

**环境要求：** Python 3.10+

**安装方式：**

```bash
# pip
pip install -U prefect

# uv（推荐，更快）
uv add prefect
```

**快速验证：**

```bash
# 启动本地服务器
prefect server start

# 在另一个终端运行一个简单 Flow
python -c "
from prefect import flow
@flow
def hello():
    print('Hello from Prefect!')
hello()
"
```

## 四、实战：构建 ETL 流水线

Prefect 最常见的场景是构建 ETL 流水线：

```python
import httpx
from prefect import flow, task
from pathlib import Path

@task(retries=2, timeout_seconds=30)
def fetch_data(url: str) -> dict:
    """从 API 拉取原始数据"""
    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    return response.json()

@task()
def transform(raw: dict) -> list[dict]:
    """清洗与转换数据"""
    return [
        {"id": item["id"], "name": item["name"].strip()}
        for item in raw.get("data", [])
        if "id" in item
    ]

@task()
def save_to_file(records: list[dict], path: Path):
    """保存到本地文件"""
    import json
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2))

@flow(name="ETL Pipeline", log_prints=True)
def etl_pipeline(api_url: str, output_path: str):
    raw = fetch_data(api_url)
    cleaned = transform(raw)
    save_to_file(cleaned, Path(output_path))
    print(f"ETL 完成，共处理 {len(cleaned)} 条记录")

if __name__ == "__main__":
    etl_pipeline.serve(
        name="daily-etl",
        cron="0 2 * * *",  # 每天凌晨 2 点执行
        parameters={
            "api_url": "https://api.example.com/data",
            "output_path": "/data/output.json"
        }
    )
```

## 五、常见问题与解决方案

**Q1：安装时报 `prefect version` 报错？**
确保 Python 版本 >= 3.10，且系统已安装 `git >= 2.47.3`（Prefect 构建过程需要）。

**Q2：Prefect Server 启动后 UI 加载慢？**
Prefect 3.x 内置了新版 UI（V2），首次构建 UI bundle 耗时较长，后续启动会缓存。确保 Docker 或 Node.js 依赖正常。

**Q3：Flow 中任务并行执行？**
`@task` 默认顺序执行，使用 `TaskRunner` 可以实现并行：
```python
from prefect.tasks import task_input_hash
from datetime import timedelta

@task(cache_key_fn=task_input_hash, cache_expiration=timedelta(hours=1))
def slow_task(x): ...
```

**Q4：私有仓库认证？**
 Prefect Cloud 支持 API Key 认证；在自托管场景下配置 `PREFECT_API_URL` 和 `PREFECT_API_KEY` 环境变量即可。

**Q5：想接入 Kubernetes / Dask 集群？**
Prefect 提供丰富的官方集成包：`prefect-kubernetes`、`prefect-dask`、`prefect-aws`、`prefect-gcp` 等，一条 `pip install "prefect[kubernetes]"` 即可解锁。

## 六、总结

Prefect 将"让 Python 脚本变成可靠的数据管道"这件事做到了极致——无需学习复杂的 DAG 定义语言，几行装饰器代码就能获得调度、重试、监控全链路能力。无论是个人数据项目还是企业级 ETL 流水线，Prefect 都是一个值得优先考虑的选择。

社区规模已超 25k stars、每月处理 2 亿+ 任务，社区资源丰富（Slack、YouTube、Newsletter），文档质量在同类工具中也属于上乘。推荐数据工程师和 Python 开发者尽快上手体验。

**相关链接：**

- GitHub：https://github.com/PrefectHQ/prefect
- 官方文档：https://docs.prefect.io
- Prefect Cloud：https://app.prefect.cloud
