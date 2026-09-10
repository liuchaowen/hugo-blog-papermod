---
title: "Clodds：Claude 驱动的自托管 AI 交易终端，一个人也能撮合 10 个预测市场"
date: 2026-09-10T19:05:00+08:00
description: "Clodds（Claude + Odds）是 alsk1992 开源的 AI 交易终端，用自然语言打通 Polymarket、Kalshi 等 10 个预测市场、7 家合约交易所与 Solana/EVM 链上 DeFi，内置 118+ 策略、统一风控引擎、语义记忆与 21 个消息渠道，12 天为 Colosseum Hackathon 建成。"
author: "Cheman"
draft: false
tags: [GitHub, 开源, AI交易, 预测市场, Solana, Polymarket, Claude, TypeScript]
categories: [技术, 开源]
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

今天在 GitHub Trending 上看到一个相当硬核的项目：**Clodds**（Claude + Odds）。一句话概括——这是一个跑在你自己机器上的 AI 交易终端，你可以用日常对话的方式，同时操作预测市场、现货、杠杆合约、链上 DeFi 甚至 Bittensor 挖矿。它的作者在 12 天里把它做成了一个功能完整的自主交易 Agent，并提交到了 Solana 生态的 Colosseum Agent Hackathon。

## 一、项目概述

Clodds 要解决的问题很明确：**交易工具太碎、太分散**。想玩预测市场要去 Polymarket，玩合约要去 Binance，玩链上要去 Jupiter，每一家都有独立的 API、认证、前端和风控逻辑。Clodds 想做的，是把这些都收进一个"对话式终端"里。

它的核心特性可以概括为几组数字：

- **21 个消息渠道**：Telegram、Discord、Slack、WhatsApp、Teams、Signal、Matrix、iMessage、LINE、Nostr、Twitch，外加内置 WebChat。也就是说你在哪个聊天软件里都能下单。
- **10 个预测市场 / 7 家合约交易所**：预测市场覆盖 Polymarket、Kalshi、Betfair、Smarkets、Drift、Opinion.xyz、Predict.fun 等；合约覆盖 Binance、Bybit、Hyperliquid、MEXC、Drift、Percolator、Lighter，杠杆最高到 200x。
- **118+ 交易策略、119 个内置 Skill**：动量、均值回归、到期衰减、DCA、鲸鱼追踪、跟单、跨平台套利等。
- **统一风控引擎**：熔断、VaR/CVaR、波动率制度识别、压力测试、Kelly 仓位、日亏损限制和 kill switch。
- **完整的链上 Integration**：Solana 侧接 Jupiter、Raydium、Orca、Meteora、Kamino、MarginFi、Solend、Pump.fun、Bags.fm；EVM 侧接 Uniswap V3、1inch、PancakeSwap、Virtuals Protocol，覆盖 ETH / Arbitrum / Optimism / Base / Polygon。

值得单独拿出来说的是它的**预测市场深度**：Clodds 对 Polymarket 的 BTC/ETH/SOL/XRP 二元市场有专门优化，支持 5 分钟（仅 BTC）、15 分钟、1 小时、4 小时和日线轮次，内置轮次发现、时间门控和 4 套自动化策略——这基本是把高频预测交易当成主战场在做。

## 二、技术原理

### 分层架构

从 README 给出的架构图看，Clodds 是典型的**分层 + 多适配器**设计，自上而下分为五层：

1. **Gateway & UI 层**：HTTP / WebSocket、鉴权、限流，宣称支持 1000 个并发连接，并把 21 个消息渠道统一成一套入站协议。
2. **AI Agents 层**：4 个 Agent（Main / Trading / Research / Alerts）分工，配 119+ Skill、18 个工具和 LanceDB 语义记忆。
3. **统一策略与风控层**：118+ 策略 + 风控引擎 + 回测 + Trade Ledger + 仓位管理 + 套利检测 + MEV 保护 + 智能路由。
4. **执行与数据层**：预测市场、Solana DeFi、EVM DeFi、合约、链上 Perps 五大执行域，共享订单构造、余额检查、滑点估算、手续费计算和结算轮询。
5. **持久化层**：SQLite 存本地配置与聊天记录，LanceDB 存语义向量，PostgreSQL 存交易历史与分析，三者互补。

这套设计的巧妙之处在于：**把"渠道"和"交易所"都抽象成适配器，中间用统一的策略与风控层收口**。新增一个交易所，只需实现执行域接口；新增一个聊天平台，只需实现渠道适配器。

### 技术栈与选型

从 `package.json` 能读出非常清晰的技术画像：

```json
{
  "name": "clodds",
  "version": "1.9.0",
  "bin": { "clodds": "./dist/cli/index.js" },
  "engines": { "node": ">=22.0.0" }
}
```

- **语言与运行时**：TypeScript 5.3 + Node.js 22（`tsconfig.json` 里 `strict: true`、`target: ES2022`、`module: CommonJS`），说明它优先保证类型安全和 Node 22 新特性。
- **AI 大脑**：`@anthropic-ai/sdk`，主模型是 Claude，另有 GPT-4、Gemini、Groq、Together、Fireworks、AWS Bedrock、Ollama 共 8 家 LLM Provider 可切换。
- **链上交互**：`@solana/web3.js`、`@solana/kit`、`@solana/spl-token`、`ethers`，配合各家协议的专业 SDK（`@jup-ag/api`、`@raydium-io/raydium-sdk-v2`、`@orca-so/whirlpools`、`@meteora-ag/dlmm`、`@kamino-finance/klend-sdk`、`@wormhole-foundation/sdk` 等）。
- **合约交易所**：`binance`、`bybit-api`、`hyperliquid`，加上 `@drift-labs/sdk`。
- **消息渠道**：`grammy`（Telegram）、`discord.js`、`@slack/bolt`、`@whiskeysockets/baileys`（WhatsApp）、`tmi.js`（Twitch）。
- **存储与记忆**：`better-sqlite3`（本地）、`pg`（分析）、`@xenova/transformers`（本地 embedding 模型 `all-MiniLM-L6-v2`，量化版）。
- **任务调度**：`bullmq` + `ioredis`（Redis 队列）、`node-cron`。

这里有几个值得注意的工程选择：

**其一，本地化 embedding。** Clodds 用 `@xenova/transformers` 在本地跑 `Xenova/all-MiniLM-L6-v2` 量化模型，而不是调云端 embedding API。这意味着语义记忆不需要额外付费、不泄露数据，代价是首次启动要下载模型。它的 `postinstall` 脚本和 `Dockerfile` 都专门做了"预热缓存"，避免第一次请求卡住：

```dockerfile
RUN node -e "const{pipeline,env}=require('@xenova/transformers');env.cacheDir='./.transformers-cache';pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{quantized:true}).then(()=>console.log('Model cached')).catch(e=>console.error('Model cache failed:',e))"
```

**其二，Skill 的懒加载。** `build` 脚本里有一段内联 Node 代码，专门把 `src/skills/bundled/*/SKILL.md` 复制到 `dist`：

```json
"build": "tsc && node -e \"...readdirSync('src/skills/bundled')...cpSync(s,t)...\""
```

配合 README 中"lazy-loaded extensions（no missing dependencies crash）"的说明可以推断：119 个 Skill 是**按需加载**的，某个 Skill 的依赖没装也不会让整个应用崩溃。对交易终端这种"无人值守"场景，这个设计非常关键——毕竟你不想因为一个冷门交易所 SDK 缺失，导致整个进程起不来。

**其三，多数据库分工。** SQLite 负责本地配置、聊天记录和挖矿收益，LanceDB 负责语义记忆与向量检索，PostgreSQL 负责交易历史、分析和回测。这是一个很务实的组合：单机场景零依赖即可跑（SQLite + LanceDB），需要多机分析时再上 Postgres。

### 关键设计：Trade Ledger（决策审计）

在 AI 交易这个领域，**"AI 到底为什么下这一单"**是监管和信任的核心问题。Clodds 的 Trade Ledger 给出了一个相当完整的答案：

- **决策捕获**：每笔交易、跟单和风控决策都记录推理过程；
- **置信度校准**：追踪 AI 预测准确率与实际置信度的偏差（即模型是否"过度自信"）；
- **完整性哈希**：可选对记录做 SHA-256 哈希，防止篡改；
- **链上锚定**：把哈希锚定到 Solana / Polygon / Base，形成不可篡改的证明。

```bash
clodds ledger stats          # 决策统计
clodds ledger calibration    # 置信度 vs 准确率分析
clodds ledger verify <id>    # 校验记录完整性
clodds ledger anchor <id>    # 把哈希锚定到链上
```

这套机制本质上是把"可解释性"做成了可验证的工程资产，而不是一句营销话术。

### 套利检测的学术底色

Clodds 的套利模块明确标注基于论文 [arXiv:2508.03474](https://arxiv.org/abs/2508.03474)，支持内部套利、跨平台套利和组合套利三类，配语义匹配、流动性打分和 Kelly 仓位：

```
YES: 45c + NO: 52c = 97c → Buy both → 3c profit
Polymarket @ 52c vs Kalshi @ 55c → 3c spread
```

有意思的是它**默认是 dry-run 模式**——因为跨平台套利涉及货币和结算差异，真金白银之前先跑模拟，这是一个很克制的默认值。

## 三、安装与快速开始

### 环境要求

- Node.js >= 22.0.0
- 一个 Anthropic API Key（主模型）
- 可选：Redis（BullMQ 队列）、PostgreSQL（分析）、各交易所 API Key

### 安装

最丝滑的方式是走 npm 全局安装，然后用向导完成配置：

```bash
npm install -g clodds --loglevel=error
clodds onboard
```

`onboard` 是交互式安装向导，会带你走完 API Key、消息渠道配置，并自动启动 gateway。完成后浏览器打开 `http://localhost:18789/webchat` 就是自带的前端。

如果你喜欢从源码跑：

```bash
git clone https://github.com/alsk1992/CloddsBot.git && cd CloddsBot
npm install && cp .env.example .env
# 在 .env 里填入 ANTHROPIC_API_KEY
npm run build && npm start
```

### 最小可用配置

```bash
# 必填
ANTHROPIC_API_KEY=sk-ant-...

# 渠道（任选其一或更多）
TELEGRAM_BOT_TOKEN=...
DISCORD_BOT_TOKEN=...

# 交易
POLYMARKET_API_KEY=...
SOLANA_PRIVATE_KEY=...
```

数据默认存放在 `~/.clodds/`（SQLite 会在首次运行时自动创建）。Docker 部署也很直接：

```bash
docker compose up --build
```

Dockerfile 采用多阶段构建，最终镜像基于 `node:22-bookworm-slim`，暴露 `18789` 端口，并内置了 `/health` 健康检查：

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:18789/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

## 四、使用方法与实战

### CLI 命令一览

```bash
clodds onboard        # 交互式配置向导
clodds start          # 启动 gateway
clodds repl           # 交互式 REPL
clodds doctor         # 系统诊断
clodds secure         # 安全加固
clodds locale set zh  # 切换语言（支持 10 种语言）
clodds mcp            # 启动 MCP server（供 Claude Desktop/Code 使用）
clodds mcp install    # 自动配置 Claude Desktop/Code
```

其中 `clodds mcp` 这一条尤其值得一提：它可以**把全部 119 个 Skill 暴露成 MCP 工具**，让 Claude Desktop 或 Claude Code 直接调用。也就是说，你可以把 Clodds 当成一个"交易能力后端"，挂在通用 AI 助手上。

### 对话式下单

真正好玩的部分在聊天窗口里。合约交易示例：

```
/futures long BTCUSDT 0.1 10x
/futures sl BTCUSDT 95000
```

第一行是 10 倍杠杆做多 0.1 个 BTC 合约，第二行是设置止损价。

### 链上 Perps（Percolator）

Clodds 还接了 Anatoly Yakovenko（Solana 联合创始人）的 Percolator 协议，可以无 KYC 直接做链上永续：

```
/percolator status          # Oracle 价格、OI、资金费率、价差
/percolator positions       # 当前持仓
/percolator long 100        # 开 100 美元多单
/percolator short 50        # 开 50 美元空单
/percolator deposit 500     # 存入 500 USDC 保证金
/percolator withdraw 100    # 提取 100 USDC 保证金
```

配置只需三个环境变量：

```bash
PERCOLATOR_ENABLED=true
PERCOLATOR_SLAB=<pubkey>
PERCOLATOR_ORACLE=<pubkey>
```

### Bittensor 挖矿

除了交易，Clodds 还能挖 TAO：

```bash
clodds bittensor setup           # 向导：Python、btcli、钱包、配置
clodds bittensor status          # 查看挖矿状态
clodds bittensor wallet balance  # 查 TAO 余额
clodds bittensor register 64     # 注册 Chutes (SN64) 子网
```

聊天里用 `/tao status`、`/tao earnings daily`、`/tao wallet` 即可。它通过 `@polkadot/api` 管理钱包，用 Python sidecar 调 `btcli`，收益落 SQLite，并在 `/api/bittensor/*` 暴露 HTTP 接口。

### Agent 论坛与市场

这是我觉得最有"赛博味"的部分——Clodds 内置了一个 **仅限 Agent 参与的论坛**（cloddsbot.com/forum），AI Agent 可以自主讨论行情、分享策略、投票排序，人类只能围观。注册需要服务端验证你有一个在跑的 Clodds 实例（校验 `/health`）：

```bash
curl -X POST https://api.cloddsbot.com/api/forum/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "MyAgent", "model": "claude", "instanceUrl": "https://my-clodds.example.com"}'
```

配套的 **Agent Marketplace** 更激进：Agent 之间可以用 Solana 上的 USDC 托管交易，买卖代码、API 服务和数据集。买家付款进 escrow → 链上验证 → 卖家交付 → 买家确认 → 放款（卖家拿 95%，平台抽 5%），还有 72 小时自动放款的 cron 兜底。

### Token 一键发币

通过 Meteora 动态绑定曲线，一次 API 调用即可发币（$1 USDC，走 x402 支付）：

```bash
curl -X POST https://compute.cloddsbot.com/api/launch/token \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agent_1707123456_abc123" \
  -H "X-Payment: <x402-usdc-signature>" \
  -d '{"name": "MyToken", "symbol": "MTK", "creatorWallet": "YOUR_SOLANA_WALLET"}'
```

它自带 90/10 的创作者手续费分成、反狙击保护（起始 500bps 手续费逐步衰减到 100bps）、达标后自动迁移到 DAMM v2 的流动性，以及"只有注册 Agent 才能发币"的门槛设计。

## 五、常见问题与解决方案

**Q1：`npm install` 卡在原生模块编译怎么办？**
项目依赖 `better-sqlite3`、`sharp`、`puppeteer` 等含原生绑定的包，且 `postinstall` 里专门有 `fix-native-bindings.js`、`fix-anchor-bn-export.js` 两段修补脚本。如果编译失败，优先确认 Node 版本是否 >= 22（`node -v`），并确保构建工具链（macOS 上是 Xcode Command Line Tools）已安装。安装时加 `--legacy-peer-deps` 可绕过部分 peer 依赖冲突。

**Q2：第一次启动感觉"卡住"了？**
很可能是本地 embedding 模型在下载。`Xenova/all-MiniLM-L6-v2` 需要联网拉取并缓存到 `.transformers-cache`。Docker 镜像里已经预热过一次，如果用源码跑，耐心等第一次下载完成即可；网络受限的话，可以提前手动预热。

**Q3：某个交易所报"依赖缺失"导致崩溃？**
正常情况下不会——119 个 Skill 是懒加载的，缺依赖只会让对应 Skill 不可用，不会拖垮主进程。如果你真的遇到整体崩溃，先跑 `clodds doctor` 做系统诊断，它会告诉你具体是哪一环出了问题。也可以用 `/skills` 查看各 Skill 的加载状态。

**Q4：套利功能开了但没动作？**
套利模块默认是 dry-run。这是有意为之——跨平台套利存在货币换算和结算周期差异，必须先把参数、阈值和资金规模验证清楚，再切到实盘。别急着关它。

**Q5：担心 AI 一把梭哈怎么办？**
善用风控层：熔断器、日亏损上限、Kelly 仓位和 kill switch 都是现成的。另外打开 Trade Ledger（`clodds config set ledger.enabled true`），让每一笔决策都有审计记录和置信度校准，事后可复盘、可验证、可链上锚定。

**Q6：能接到 Claude Desktop / Claude Code 吗？**
可以。运行 `clodds mcp install` 自动配置，或 `clodds mcp` 手动起 MCP server，把 119 个 Skill 作为 MCP 工具暴露出去。

**Q7：数据存在哪？怎么备份？**
本地 SQLite 在 `~/.clodds/` 下自动创建；Docker 部署时通过 `CLODDS_STATE_DIR=/data` 统一挂载。语义记忆在 LanceDB，分析数据在 PostgreSQL。README 提到持久化层有"3x 复制 + 压缩"的备份同步设计，生产环境建议把 `/data` 挂到持久卷。

## 六、总结

Clodds 最打动我的地方，不是它接了 10 个预测市场和 7 家合约所这些"数量上的堆料"，而是它把几件原本互相割裂的事**收进了同一套抽象**里：渠道是适配器、交易所是适配器、策略和风控是统一中间层、决策有可审计的账本、能力可以通过 MCP 对外开放。

它当然不是一个"装上就能躺赚"的印钞机——README 里 dry-run 默认值、风控开关、链上锚定这些设计，反而透出一种对市场风险的清醒。把它当成一个**自托管、可编程、对话驱动的交易中枢**，配上你自己的策略和纪律，它才真正有价值。

如果你对预测市场、链上 DeFi 或者"让 AI 管钱"这条路线感兴趣，Clodds 值得拉下来在本地跑一遍。项目地址：

**<https://github.com/alsk1992/CloddsBot>**

（温馨提示：涉及真金白银的交易功能，请务必先在小额、dry-run 环境下充分验证，再考虑放大规模。）
