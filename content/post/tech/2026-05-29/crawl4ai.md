---
title: "Crawl4AI：专为 LLM 设计的开源 Web 爬虫与数据抓取工具"
date: 2026-05-29
draft: false
categories: [技术, 开源, AI工具]
tags: [GitHub, 开源, Python, LLM, RAG, 爬虫, Web抓取]
description: "Crawl4AI 是一款专为大型语言模型优化的开源 Web 爬虫工具，可将网页内容转换为干净的 Markdown 格式，适用于 RAG、Agent 和数据管道场景。"
author: "Cheman"
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

## 一、项目概述

**Crawl4AI**（GitHub: [unclecode/crawl4ai](https://github.com/unclecode/crawl4ai)）是一款专为 LLM（大型语言模型）优化的开源 Web 爬虫与数据抓取工具。该项目在 GitHub 上已获得超过 50,000 Star，是最受欢迎的开源爬虫项目之一。

### 核心特性

- **LLM 友好的输出**：智能 Markdown 生成，保留标题、表格、代码和引用标记
- **高性能架构**：异步浏览器池、智能缓存、最小化跳转
- **完全可控**：支持会话管理、代理、Cookie、用户脚本和钩子函数
- **自适应智能**：自动学习网站结构，只探索相关内容
- **灵活部署**：零密钥要求，支持 CLI、Docker，云友好

Crawl4AI 的核心价值在于将网页内容转换为**干净的、结构化的 Markdown 格式**，这种格式特别适合：
- **RAG（检索增强生成）**系统
- **AI Agent** 的数据获取
- **数据管道**的预处理环节

## 二、技术原理

### 2.1 架构设计

Crawl4AI 采用异步架构，基于 **Playwright** 实现浏览器自动化，核心组件如下：

```
┌─────────────────────────────────────────┐
│   AsyncWebCrawler (核心爬虫引擎)        │
├─────────────────────────────────────────┤
│  - BrowserConfig (浏览器配置)           │
│  - CrawlerRunConfig (爬取配置)         │
│  - 浏览器池管理                         │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│   内容处理管道                           │
├─────────────────────────────────────────┤
│  1. HTML 抓取 → 2. Markdown 生成      │
│  3. 内容过滤 (Pruning/BM25)           │
│  4. 结构化数据提取 (CSS/LLM)          │
└─────────────────────────────────────────┘
```

### 2.2 核心技术栈

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **Python 3.10+** | 主开发语言 | 异步支持、丰富的生态 |
| **Playwright** | 浏览器自动化 | 跨浏览器、稳定的 CDP 支持 |
| **asyncio** | 异步并发 | 高效处理大量请求 |
| **LiteLLM** | 多 LLM 支持 | 统一接口调用各种 LLM |
| **BM25/余弦相似度** | 内容相关性 | 智能过滤无关内容 |

### 2.3 Markdown 生成策略

Crawl4AI 提供两种 Markdown 输出：

1. **Raw Markdown**：完整的页面内容
2. **Fit Markdown**：经过启发式过滤的精简版本，去除噪声和无关部分

```python
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.content_filter_strategy import PruningContentFilter

# 使用 PruningContentFilter 生成 Fit Markdown
browser_config = BrowserConfig(headless=True, verbose=True)
run_config = CrawlerRunConfig(
    markdown_generator=DefaultMarkdownGenerator(
        content_filter=PruningContentFilter(
            threshold=0.48,
            threshold_type="fixed",
            min_word_threshold=0
        )
    )
)

async with AsyncWebCrawler(config=browser_config) as crawler:
    result = await crawler.arun(url="https://example.com", config=run_config)
    print(result.markdown.fit_markdown)  # 精简后的内容
```

### 2.4 深度爬取策略

Crawl4AI 支持三种深度爬取策略：

- **BFS (广度优先)**：逐层遍历
- **DFS (深度优先)**：优先深入单个路径
- **BestFirst (最佳优先)**：基于相关性评分优先爬取

```python
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy

strategy = BFSDeepCrawlStrategy(
    max_depth=3,
    max_pages=20,
    include_external=False
)

async with AsyncWebCrawler() as crawler:
    result = await crawler.arun(
        url="https://docs.example.com",
        config=CrawlerRunConfig(deep_crawl_strategy=strategy)
    )
    print(f"爬取了 {len(result.links['internal'])} 个内部链接")
```

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.10 或更高版本
- pip 包管理器
- （可选）Docker 用于容器化部署

### 3.2 安装步骤

**基础安装**：

```bash
# 安装 Crawl4AI
pip install -U crawl4ai

# 运行安装后设置（自动安装 Playwright 浏览器）
crawl4ai-setup

# 验证安装
crawl4ai-doctor
```

如果遇到浏览器相关问题，可以手动安装：

```bash
python -m playwright install --with-deps chromium
```

### 3.3 最简运行示例

**Python API 方式**：

```python
import asyncio
from crawl4ai import *

async def main():
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(
            url="https://www.nbcnews.com/business",
        )
        print(result.markdown)

if __name__ == "__main__":
    asyncio.run(main())
```

**命令行方式**：

```bash
# 基础爬取，输出 Markdown
crwl https://www.nbcnews.com/business -o markdown

# 深度爬取（BFS 策略，最多 10 页）
crwl https://docs.crawl4ai.com --deep-crawl bfs --max-pages 10

# 使用 LLM 提取特定信息
crwl https://www.example.com/products -q "提取所有产品价格"
```

## 四、使用方法与实战

### 4.1 基础用法

#### 4.1.1 执行 JavaScript

对于需要动态加载内容的页面，可以执行自定义 JavaScript：

```python
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

async def main():
    browser_config = BrowserConfig(headless=False, verbose=True)
    run_config = CrawlerRunConfig(
        js_code="""
        (async () => {
            // 滚动到底部加载更多内容
            await new Promise(resolve => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if(totalHeight >= document.body.scrollHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        })();
        """,
        cache_mode=CacheMode.BYPASS
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(
            url="https://example.com/infinite-scroll",
            config=run_config
        )
        print(result.markdown)

if __name__ == "__main__":
    asyncio.run(main())
```

#### 4.1.2 使用浏览器配置文件中

Crawl4AI 支持使用真实的浏览器配置文件，绕过 bot 检测：

```python
import os
from pathlib import Path
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

async def main():
    # 创建持久化的用户数据目录
    user_data_dir = os.path.join(Path.home(), ".crawl4ai", "browser_profile")
    os.makedirs(user_data_dir, exist_ok=True)

    browser_config = BrowserConfig(
        verbose=True,
        headless=True,
        user_data_dir=user_data_dir,
        use_persistent_context=True,
    )
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        url = "https://需要登录的网站.com"
        
        result = await crawler.arun(
            url,
            config=run_config,
            magic=True,  # 自动处理常见反爬措施
        )
        
        print(f"成功爬取 {url}")
        print(f"内容长度: {len(result.markdown)}")

if __name__ == "__main__":
    asyncio.run(main())
```

### 4.2 进阶用法

#### 4.2.1 结构化数据提取（无 LLM）

使用 CSS 选择器提取结构化数据：

```python
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai import JsonCssExtractionStrategy
import json

async def main():
    schema = {
        "name": "课程列表",
        "baseSelector": "section.charge-methodology .w-tab-content > div",
        "fields": [
            {
                "name": "section_title",
                "selector": "h3.heading-50",
                "type": "text",
            },
            {
                "name": "course_name",
                "selector": ".text-block-93",
                "type": "text",
            },
            {
                "name": "course_icon",
                "selector": ".image-92",
                "type": "attribute",
                "attribute": "src"
            }
        ]
    }

    extraction_strategy = JsonCssExtractionStrategy(schema, verbose=True)

    browser_config = BrowserConfig(headless=False, verbose=True)
    run_config = CrawlerRunConfig(
        extraction_strategy=extraction_strategy,
        js_code=["""(async () => {
            const tabs = document.querySelectorAll("section.charge-methodology .tabs-menu-3 > div");
            for(let tab of tabs) {
                tab.scrollIntoView();
                tab.click();
                await new Promise(r => setTimeout(r, 500));
            }
        })();"""],
        cache_mode=CacheMode.BYPASS
    )
        
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(
            url="https://www.example.com/degrees/technology",
            config=run_config
        )

        companies = json.loads(result.extracted_content)
        print(f"成功提取 {len(companies)} 条数据")
        print(json.dumps(companies[0], indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

#### 4.2.2 使用 LLM 提取结构化数据

```python
import os
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, LLMConfig
from crawl4ai import LLMExtractionStrategy
from pydantic import BaseModel, Field

class OpenAIModelFee(BaseModel):
    model_name: str = Field(..., description="OpenAI 模型名称")
    input_fee: str = Field(..., description="输入 Token 费用")
    output_fee: str = Field(..., description="输出 Token 费用")

async def main():
    browser_config = BrowserConfig(verbose=True)
    run_config = CrawlerRunConfig(
        word_count_threshold=1,
        extraction_strategy=LLMExtractionStrategy(
            llm_config=LLMConfig(
                provider="openai/gpt-4o",
                api_token=os.getenv('OPENAI_API_KEY')
            ),
            schema=OpenAIModelFee.schema(),
            extraction_type="schema",
            instruction="""从爬取的内容中，提取所有提到的模型名称及其输入输出 Token 费用。
            不要遗漏内容中的任何模型。提取的 JSON 格式示例：
            {"model_name": "GPT-4", "input_fee": "US$10.00 / 1M tokens", "output_fee": "US$30.00 / 1M tokens"}。"""
        ),            
        cache_mode=CacheMode.BYPASS,
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(
            url='https://openai.com/api/pricing/',
            config=run_config
        )
        print(result.extracted_content)

if __name__ == "__main__":
    asyncio.run(main())
```

### 4.3 实际项目示例

#### 示例：构建 RAG 系统的数据管道

```python
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy

async def build_rag_dataset():
    """为 RAG 系统构建数据集"""
    browser_config = BrowserConfig(headless=True, verbose=False)
    
    # 配置深度爬取
    deep_crawl = BFSDeepCrawlStrategy(
        max_depth=2,
        max_pages=50,
        include_external=False
    )
    
    run_config = CrawlerRunConfig(
        deep_crawl_strategy=deep_crawl,
        markdown_generator=DefaultMarkdownGenerator(
            content_filter=PruningContentFilter(threshold=0.5)
        ),
        cache_mode=CacheMode.ENABLED  # 启用缓存加速
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(
            url="https://docs.example.com",
            config=run_config
        )
        
        # 保存所有页面的 Fit Markdown
        for i, (url, markdown) in enumerate(zip(
            result.deep_crawl_results['urls'],
            result.deep_crawl_results['markdown']
        )):
            with open(f"rag_data/page_{i}.md", "w") as f:
                f.write(f"# {url}\n\n{markdown}")

if __name__ == "__main__":
    asyncio.run(build_rag_dataset())
```

## 五、常见问题与解决方案

### 5.1 安装失败

**问题**：`pip install crawl4ai` 后运行 `crawl4ai-setup` 失败。

**解决方案**：
1. 手动安装 Playwright 浏览器：
   ```bash
   python -m playwright install chromium
   ```
2. 如果使用 macOS，可能需要安装依赖：
   ```bash
   brew install chromium
   ```

### 5.2 运行时错误

**问题**：`Error: Executable doesn't exist at ...`

**解决方案**：
```bash
# 重新安装 Playwright 浏览器
playwright install --force chromium
```

**问题**：`asyncio.exceptions.TimeoutError`

**解决方案**：
- 增加超时时间：
  ```python
  run_config = CrawlerRunConfig(
      page_timeout=60000,  # 60 秒
      cache_mode=CacheMode.BYPASS
  )
  ```
- 使用 `headless=False` 观察浏览器行为

### 5.3 性能问题

**问题**：爬取速度慢

**解决方案**：
1. 启用缓存：
   ```python
   run_config = CrawlerRunConfig(
       cache_mode=CacheMode.ENABLED
   )
   ```
2. 使用 `prefetch=True` 模式快速发现 URL：
   ```python
   run_config = CrawlerRunConfig(prefetch=True)
   ```
3. 调整浏览器池大小（Docker 部署时）：
   ```bash
   docker run -d -p 11235:11235 \
     -e CRAWL4AI_BROWSER_POOL_SIZE=10 \
     --name crawl4ai \
     unclecode/crawl4ai:latest
   ```

### 5.4 兼容性

**问题**：某些网站无法正确渲染

**解决方案**：
1. 启用 `magic=True` 自动处理常见反爬措施：
   ```python
   result = await crawler.arun(url, magic=True)
   ```
2. 使用 undetected Chrome 模式：
   ```python
   browser_config = BrowserConfig(
       browser_type="undetected",
       headless=True
   )
   ```
3. 配置代理链和重试策略（v0.8.5+）：
   ```python
   from crawl4ai.async_configs import ProxyConfig
   
   run_config = CrawlerRunConfig(
       proxy_config=[
           ProxyConfig.DIRECT,
           ProxyConfig(server="http://my-proxy:8080")
       ],
       max_retries=2
   )
   ```

## 六、总结

Crawl4AI 是一款功能强大且易于使用的开源 Web 爬虫工具，特别适合需要将网页内容转换为 LLM 友好格式的场景。其核心优势包括：

1. **专为 LLM 优化**：生成的 Markdown 格式天然适合 RAG 和 AI Agent
2. **灵活的配置**：支持从简单爬取到复杂的深度爬取和结构化提取
3. **活跃的社区**：50,000+ Star，持续的版本更新和问题修复
4. **多种部署方式**：支持 Python API、CLI、Docker、云部署

无论是构建 RAG 系统、训练数据集，还是开发 AI Agent，Crawl4AI 都能显著简化数据获取和预处理流程。

### 相关资源

- **官方文档**：https://docs.crawl4ai.com/
- **GitHub 仓库**：https://github.com/unclecode/crawl4ai
- **Docker 镜像**：`unclecode/crawl4ai:latest`
- **赞助支持**：https://github.com/sponsors/unclecode

---

**标签**：#Crawl4AI #Web爬虫 #LLM #RAG #开源工具 #Python #数据抓取
