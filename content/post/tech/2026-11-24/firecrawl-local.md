---
title: "Firecrawl Local：20 万 Star 的抓取引擎搬进本地，一个 Rust 二进制搞定网页转 Markdown 与 MCP"
date: "2026-11-24T15:05:00+08:00"
description: "Firecrawl 把云端抓取能力压缩成一个 Rust 单二进制 firecrawl-local：本地完成 scrape、crawl、map 和文档解析，内置 MCP 服务与 v2 API，必要时才回退到云端。本文拆解它的架构、安装方式与实战用法。"
author: "Cheman"
slug: firecrawl-local
github_repo: firecrawl/firecrawl
draft: false
tags: ["Firecrawl", "Rust", "MCP", "网页抓取", "AI Agent", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Firecrawl**（`firecrawl/firecrawl`），一款给 AI Agent 提供网页知识的基础设施。它最值得关注的变化不是云端 API，而是新加入的 **Firecrawl Local**——把整套抓取、爬站、站点地图能力塞进一个 Rust 二进制，在本机跑完再交给 Agent 使用。本文从架构到安装、从 CLI 到 MCP 集成，完整走一遍。

## 一、项目概述

Firecrawl 由 Firecrawl 团队开源，仓库主语言是 TypeScript，但组件横跨 Python、Rust、Go、Java、PHP、Elixir 等多种语言。它的定位很明确：**把任意网站变成 LLM 可以直接消费的干净数据**。官方描述是"Knowledge infrastructure to make your agents smarter"，即让 Agent 变聪明的知识基础设施。

按仓库 README 的划分，同一个项目现在有三种用法：

- **Firecrawl Local**：装在自己机器上的单二进制，负责 scrape、crawl、map、文档解析，并能作为 MCP server 接入 AI 工具，同时在 localhost 提供 Firecrawl v2 API。
- **Firecrawl Cloud**：托管服务，除本地全部能力之外，还提供 search、Interact、Agent，以及 Alexandria 里 550+ 数据提供方。
- **Self-hosting**：从 `apps/api` 部署完整服务端，自带队列、worker 和数据库。

核心能力可以归纳为几条：

- **Scrape**：抓单个页面，输出 Markdown、HTML、rawHtml、links；云端额外支持结构化 JSON、摘要、截图和浏览器动作。
- **Crawl**：从起始 URL 顺着链接爬整站，支持页数上限、深度上限、include/exclude 路径正则。
- **Map**：不做正文抓取，直接从 sitemap 和起始页列出站点所有 URL，速度极快。
- **Batch Scrape**：一次提交多个 URL，异步任务轮询拿结果。
- **文档解析**：PDF 和 Office 文档在本地解析，不依赖云端。
- **MCP 集成**：一条 `init` 命令把本地服务注册进 Claude Code、Claude Desktop、Cursor、Windsurf、Gemini CLI 和 Codex。
- **本地 API 兼容**：`serve` 在 3002 端口提供 v2 接口，现有 Firecrawl SDK 改个 URL 就能跑。

项目的成熟度不用怀疑：截至 2026 年 11 月 24 日，仓库有 **208,172 star、10,876 fork**，最新 release 是 **v2.11.0**，主仓以 **AGPL-3.0** 授权（SDK 与部分 UI 组件为 MIT），最近一次 push 就在当天。`apps/local` 这个 Rust crate 版本为 **0.1.1**，属于刚落地但迭代很快的新组件。

与纯爬虫框架（如 Scrapy、Crawlee）相比，Firecrawl 的差异在于"为 LLM 优化"：它不追求通用抓取表达式，而是把导航栏、广告、页脚等噪声清掉，直接产出 token 友好的 Markdown；与纯 SaaS 抓取 API 相比，Local 模式又把数据主权和零调用成本拿了回来。

云端侧还有一个值得单独提的组件：**Firecrawl Alexandria**。它把 550 多个数据提供方收进一个库，官方给出的规模是 2.5 亿+ 人物、7500 万+ 公司、4100 万+ 研究论文，Agent 可以在网页搜索结果旁发现工具、查看输入参数与计费，再调用拿结构化数据。发现工具免费，执行按标注的额度扣费。Alexandria 只跑在云端，Local 需要在 `login` 之后才能用。另外 Firecrawl Keyless 提供每月 1000 免费额度，MCP、CLI 和 API 都可直接用，不需要注册。

## 二、技术原理

### 2.1 三层结构：CLI、本地引擎、云端兜底

Firecrawl Local 不是把云服务打包成容器，而是一个独立的 Rust 程序。它的运行边界可以画成这样：

```
┌───────────────────────────────────────────────┐
│  CLI: scrape / crawl / map / serve / mcp      │
├───────────────────────────────────────────────┤
│  scrape.rs    crawl.rs    markdown.rs         │
│  fetch.rs     browser.rs  documents.rs        │
│  guard.rs     netguard.rs cloud.rs            │
├───────────────────────────────────────────────┤
│  native/: html.rs crawler.rs document.rs      │
│  （与 apps/api 共用同一份清洗代码）            │
└───────────────────────────────────────────────┘
            │ 需要时
            ▼
   Firecrawl Cloud（search / 被拒页面 / Alexandria）
```

源码目录 `apps/local/src` 里能直接看到这条链路：`fetch.rs` 负责普通 HTTP 抓取，`browser.rs` 负责 Chrome 渲染，`scrape.rs` 编排单页流程，`crawl.rs` 管理队列与链接过滤，`markdown.rs` 做正文提取和格式转换，`documents.rs` 处理 PDF/Office，`cloud.rs` 处理云端回退，`netguard.rs` 与 `guard.rs` 负责地址安全，`serve.rs` 用 axum 暴露 HTTP 接口。

### 2.2 与云端共用同一份清洗代码

这是整个设计里最关键的一点。`apps/local/src/lib.rs` 的模块声明直接把 `../../api/native/src` 下的 `html.rs`、`crawler.rs`、`document.rs` 编译进本地二进制：

```rust
#[cfg_attr(not(vendored_native), path = "../../api/native/src/html.rs")]
pub mod html;
```

注释写得很直白：**同一个页面，本地清洗和云端清洗走的是完全相同的代码**，不会出现"线上效果好、本地效果差"的漂移。代价是 crate 发布时无法引用仓库外的路径，所以 `scripts/vendor-native.sh` 会把共享代码复制到 `src/native`，再由 `build.rs` 在仓库内构建时优先使用原始文件。

从 `Cargo.toml` 还能看出清洗管线的技术选型：`lol_html` 做流式 HTML 重写，`kuchikiki` 提供 DOM 查询，`nodesig` 做节点签名（用于识别正文与重复区块），`texting_robots` 解析 robots.txt，`psl` 处理公共后缀以判断站点边界。这套组合是典型的"高性能 + 可精确控制"路线，而不是套一个 Readability 库了事。

### 2.3 浏览器渲染与网络防护

需要 JavaScript 的页面交给本机已安装的 Chrome/Chromium，通过 `chromiumoxide` 驱动。Firecrawl 在这里做了一个容易被忽略的设计：浏览器不是直连网络，而是跑在 Firecrawl Local 内部的 **loopback 代理**后面，每一个连接——包括重定向、子资源、脚本请求和 WebSocket——都要经过检查。

`netguard.rs` 的规则相当严格：

- link-local 地址和云厂商 metadata 地址在**所有模式**下都被拒绝，重定向和 DNS 解析之后还会再查一次。
- `serve` 默认只监听 `127.0.0.1`，并且默认拒绝访问 localhost 与私网地址；要放开必须显式加 `--allow-private`。
- 绑定非回环地址必须同时提供 `--token`。

这背后的威胁模型很具体：Agent 读到的网页里可能藏着提示注入，诱导它去访问内网地址。`--public-only` 就是给"会浏览不可信站点"的 Agent 准备的安全阀。

### 2.4 任务模型：内存队列与 API 兼容

`serve` 用 axum 实现 Firecrawl v2 的路由：`POST /v2/scrape`、`POST /v2/map`、`POST /v2/crawl`、`GET/DELETE /v2/crawl/{id}`、`POST /v2/batch/scrape`、`GET/DELETE /v2/batch/scrape/{id}`，外加 `/health`。crawl 与 batch 任务放在内存里，**启动一小时后过期**，`serve` 停止即消失——这是"单机工具"而非"生产队列"的自觉取舍。

其余 `/v2` 路由（例如 `/v2/search`）会转发到 Firecrawl Cloud；v0 和 v1 路由不提供。返回结果里如果某页是云端代抓的，会标记 `"source": "firecrawl-cloud"`；云端也抓不到则返回 `"blocked": true` 并附原因。

### 2.5 自托管是另一套东西

如果你需要队列、worker、持久化，那对应的是 `apps/api` 的完整栈。按 `SELF_HOST.md` 的描述，当前版本的 Compose 会拉起 API 与 worker、Playwright、Redis、RabbitMQ、NuQ PostgreSQL，以及可选的 FoundationDB 队列后端，默认只把 API 的 `3002` 端口发布到宿主机。这套栈面向生产，但默认**没有认证、没有持久化卷**，官方明确说它是"与源码对齐的起点，不是生产架构"。

## 三、安装与快速开始

### 3.1 环境要求

Firecrawl Local 需要 **Rust 工具链和 C 编译器**。macOS 上装 Xcode 命令行工具，Debian/Ubuntu 上装 `build-essential`：

```bash
# macOS
xcode-select --install

# Debian / Ubuntu
sudo apt-get install build-essential
```

两个可选组件会解锁更多能力：

- **Chrome 或 Chromium**：用于渲染 JS 页面。没有浏览器时静态页面照常工作，需要渲染的页面会返回警告。
- **Node.js 22 或更高**：MCP server 实际是 `firecrawl-mcp` 这个 npm 包，由 Firecrawl Local 通过 `npx` 拉起。

### 3.2 安装

从 crates.io 安装：

```bash
cargo install firecrawl-local
firecrawl-local --version
```

想用仓库最新代码，可以本地构建：

```bash
git clone https://github.com/firecrawl/firecrawl.git
cd firecrawl/apps/local
cargo build --release
./target/release/firecrawl-local --version
```

如果不想装 Rust，也可以先用 CLI 走云端：

```bash
npx -y firecrawl-cli@latest scrape https://firecrawl.dev
```

### 3.3 第一个抓取

抓一个页面并直接打印 Markdown：

```bash
firecrawl-local scrape https://example.com --markdown
```

不加 `--markdown` 时，输出与 Firecrawl API 一致的 JSON。想要多种格式用 `--format`，可选 `markdown`、`html`、`rawHtml`、`links`：

```bash
firecrawl-local scrape https://example.com --format markdown,links
```

### 3.4 验证本地 API

开一个终端跑服务：

```bash
firecrawl-local serve
```

另开一个终端请求：

```bash
curl -s http://localhost:3002/v2/scrape \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","formats":["markdown"]}'
```

返回体里应该能看到 `markdown` 字段和页面正文。本地路由不需要 API key。

## 四、使用方法与实战

### 4.1 爬整站并落盘

```bash
firecrawl-local crawl https://docs.firecrawl.dev --limit 50 --out ./pages
```

`--limit` 控制页数上限（默认 100），`--max-depth` 控制链接深度，`--include` / `--exclude` 接受路径正则，`--entire-domain` 允许跟出起始路径之外的链接。`--out` 会把每页写成一个 Markdown 文件，适合直接喂给 RAG 流水线。

### 4.2 用 map 先摸清站点结构

```bash
firecrawl-local map https://firecrawl.dev
```

只列 URL 不抓正文，通常比 crawl 快一个量级。加 `--search pricing` 可以只保留包含关键词的 URL，按相关性排序，适合"先看看有没有值得抓的页面"。

### 4.3 接入 AI Agent（MCP）

最省事的方式是让 `init` 自动发现本机的 AI 工具：

```bash
firecrawl-local init
```

它支持 Claude Code、Claude Desktop、Cursor、Windsurf、Gemini CLI 和 Codex，**改配置前会逐个备份**。想先看它要改什么，加 `--dry-run`；只配一个工具用 `--agent cursor`。改完记得重启对应工具。

手动注册的话，把 `firecrawl-local mcp` 作为 stdio MCP server 写进配置：

```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "/path/to/firecrawl-local",
      "args": ["mcp"]
    }
  }
}
```

`mcp` 子命令会在回环端口起一个本地 API，再让 `firecrawl-mcp` 连上去。结果是：scrape、crawl、map、batch scrape 在自己机器上跑，其余工具转发到云端。

### 4.4 让现有 SDK 指向本地

任何 Firecrawl SDK 只要改 API URL 就能切到本地，本地路由免鉴权：

```python
from firecrawl import Firecrawl

app = Firecrawl(api_url="http://localhost:3002")
print(app.scrape("https://example.com").markdown)
```

```javascript
import { Firecrawl } from "firecrawl";

const app = new Firecrawl({ apiUrl: "http://localhost:3002" });
const doc = await app.scrape("https://example.com");
console.log(doc.markdown);
```

这意味着你可以在开发环境用 Local 跑单元测试和离线调试，上线时把 URL 换回云端，业务代码一行不用动。

### 4.5 关键配置项

| 变量 | 作用 |
| --- | --- |
| `FIRECRAWL_CLOUD` | `auto`（默认）/ `search` / `off`，控制云端回退范围 |
| `FIRECRAWL_API_KEY` | 指定 API key，优先于已保存的登录态 |
| `FIRECRAWL_API_URL` | 覆盖云端地址 |
| `FIRECRAWL_LOCAL_BROWSER` | `auto` / `never` / `always`，等价于 `--browser` |
| `FIRECRAWL_CHROME_PATH` | 指定 Chrome/Chromium 路径 |
| `FIRECRAWL_LOCAL_TOKEN` | `serve` 的 Bearer token |
| `FIRECRAWL_LOCAL_ALLOW_PRIVATE` | 允许 `serve` 访问私网地址 |
| `FIRECRAWL_LOCAL_USER_AGENT` | 自定义 User-Agent |
| `FIRECRAWL_LOCAL_SCROLL` | 读取前先滚动渲染页面 |
| `FIRECRAWL_LOCAL_HOME` | 存放 install ID 等本地文件的目录 |
| `FIRECRAWL_CLI_CREDENTIALS` | 登录凭据路径，默认复用 CLI 的位置 |
| `FIRECRAWL_MCP_PACKAGE` | `mcp` 拉起的 npm 包，默认 `firecrawl-mcp` |
| `FIRECRAWL_LOCAL_TRACE` | 把浏览器耗时打到 stderr，便于排障 |

### 4.6 一个端到端场景：给内部知识库做增量索引

假设你要把公司文档站做成 Agent 可查的知识库，且文档不能出内网。

第一步，用 map 拿到全量 URL 清单：

```bash
firecrawl-local map https://docs.internal.example.com --limit 2000 > urls.txt
```

第二步，用 crawl 抓正文并落盘，限制在文档路径内：

```bash
firecrawl-local crawl https://docs.internal.example.com \
  --include '/docs/.*' \
  --limit 500 \
  --out ./kb
```

第三步，把 `./kb` 下的 Markdown 按修改时间做增量切片，写入向量库。由于全程本地，`FIRECRAWL_CLOUD=off` 可以彻底断掉外发：

```bash
FIRECRAWL_CLOUD=off firecrawl-local crawl https://docs.internal.example.com --out ./kb
```

第四步，把本地 API 注册成 MCP，让编码 Agent 在写代码时能直接查文档。这里要注意 `serve` 默认拒绝私网地址——如果文档站本身在内网，需要显式放开：

```bash
firecrawl-local serve --allow-private
```

如果只是给 Agent 用，用 `mcp --public-only` 的反向配置更稳妥：让 Agent 只读公网，内网文档走离线索引。

### 4.7 放进 CI 做文档快照

Firecrawl Local 是静态二进制，很适合在 CI 里跑"文档快照"任务：每次发版前把上游文档抓下来存档，方便对比变更。GitHub Actions 里大致是这样：

```yaml
- uses: dtolnay/rust-toolchain@stable
- run: cargo install firecrawl-local
- run: firecrawl-local crawl https://docs.example.com --limit 100 --out ./snapshot
- uses: actions/upload-artifact@v4
  with:
    name: docs-snapshot
    path: ./snapshot
```

这里不需要数据库、不需要 API key，也不用起容器；若 CI 环境没有 Chrome，就把抓取范围限制在静态页面，或接受需要渲染的页面返回警告。把 `FIRECRAWL_CLOUD=off` 写进 job 的环境变量，可以让构建完全离线、结果可复现。

## 五、常见问题与解决方案

**现象：`cargo install firecrawl-local` 编译失败，报链接器或头文件缺失。**
原因：缺少 C 编译器或系统开发库。解决：macOS 执行 `xcode-select --install`，Debian/Ubuntu 安装 `build-essential` 后重试；确认 Rust 工具链为当前稳定版。

**现象：抓取 JS 页面只拿到空壳 HTML，结果里带警告。**
原因：本机没有 Chrome/Chromium，或 `--browser never` 强制禁用了渲染。解决：安装 Chrome，或用 `FIRECRAWL_CHROME_PATH` 指定路径；临时需要渲染时加 `--browser always`。静态页面不受影响。

**现象：`firecrawl-local init` 成功，但 Agent 里看不到工具。**
原因：MCP server 依赖 Node.js 22+，版本过低会导致 `npx firecrawl-mcp` 启动失败；另外多数客户端需要重启才会加载新配置。解决：升级 Node 到 22 以上，重启 AI 工具；用 `init --dry-run` 核对写入的路径是否指向真实二进制。

**现象：crawl 任务过一段时间查不到结果。**
原因：`serve` 模式下 crawl 与 batch 任务存在内存里，启动一小时后过期，服务重启即丢失。解决：长任务直接落盘（`--out`），或改用自托管的 `apps/api` 队列；不要把它当持久化任务系统。

**现象：调用 `/v1/scrape` 返回 404。**
原因：Local 只实现 v2 路由，v0 与 v1 明确不提供。解决：把 SDK 和手写请求统一升级到 `/v2/*`。

**现象：`serve --host 0.0.0.0` 启动报错。**
原因：绑定非回环地址强制要求鉴权。解决：同时提供 `--token`（或 `FIRECRAWL_LOCAL_TOKEN`），并用 `--allowed-host` 补充允许的 Host；不要把无鉴权的本地 API 暴露到公网。

**现象：Docker 里 JS 页面渲染失败，Chrome 起不来。**
原因：Chrome 沙箱依赖 user namespace，Docker 默认 seccomp 配置会拦截 `clone`、`setns`、`unshare`。解决：使用保留默认规则并放行这三个系统调用的 seccomp profile（Playwright 官方提供了一份），**不要**图省事用 `seccomp=unconfined`。

**现象：本地 scrape 传了 `formats: ["json"]` 或 `summary`，结果被跳过。**
原因：这两个格式属于云端能力，Local 会忽略并给警告；`actions` 同样不生效，截图则依赖 Chrome。解决：需要结构化抽取时走云端，或本地拿 Markdown 后自己用模型抽取。

**现象：内网地址抓取被拒绝。**
原因：`netguard` 默认拦截 localhost、私网、link-local 与云 metadata 地址，且重定向后会再次校验。解决：确认目标确实可信后，用 `--allow-private`（`serve`）或去掉 `--public-only`；生产环境不建议整体关闭这层防护。

**现象：search 或 Alexandria 不可用。**
原因：这两项必须走云端，Alexandria 还需要登录。解决：执行 `firecrawl-local login` 完成浏览器登录；只想本地抓取时设 `FIRECRAWL_CLOUD=off`，接受 search 不可用。

## 六、总结

Firecrawl Local 的价值不在于"又一个爬虫"，而在于它把云端产品的清洗质量、协议兼容和安全边界一起搬到了本地：同一个 Rust 清洗内核、同一套 v2 接口、同一份 MCP 工具定义，切换成本几乎为零。单二进制、无数据库、无队列的设计，让它在笔记本和 CI 里都能随手跑起来。

它适合这些人：需要给 Agent 喂网页上下文但不想把数据发出去的团队；想离线开发和测试抓取逻辑的工程师；以及希望用 MCP 让编码助手直接读文档的开发者。它不适合把抓取当生产级分布式任务的人——那种场景应该看 `apps/api` 的自托管栈，而且官方也提醒那只是起点，认证、持久化、监控都得自己补。

两个局限值得提前知道：Local 不支持结构化 JSON、摘要、Interact 和 Agent，这些仍是云端专属；crawl 任务只存在内存里，一小时过期。把边界搞清楚，它就是个非常趁手的工具。

项目地址：<https://github.com/firecrawl/firecrawl>
