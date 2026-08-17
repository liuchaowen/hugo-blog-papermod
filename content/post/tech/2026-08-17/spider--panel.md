---
title: "Spider Panel：一站式 VLESS 代理面板与多地区 Cloudflare Worker 中继"
date: 2026-08-17
description: "Spider Panel 是一个基于 FastAPI 的 VLESS/XHTTP/WS-TLS 订阅与代理中继管理面板，支持 Railway + Cloudflare Workers 部署。核心亮点包括：Reality 密钥由 Xray 二进制生成、浏览器端 IP 扫描、多地区 Worker 代理池自动同步、用户订阅页面自动生成，实现流量不经 Railway 直连出口。"
author: "Cheman"
slug: spider--panel
draft: false
categories: ["技术", "开源", "网络"]
tags: ["VLESS", "Cloudflare Workers", "代理", "FastAPI", "Xray", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Spider Panel**，一个集 VLESS 订阅管理、用户面板、IP 扫描器和 Cloudflare Worker 多地区代理于一体的开源解决方案。

## 一、项目概述

Spider Panel 是一个 FastAPI 驱动的 VLESS/XHTTP/WS-TLS 订阅与代理中继管理面板，专为 Railway + Cloudflare Workers 架构设计。它解决了传统代理面板的几个核心痛点：

- **订阅管理**：自动生成 VLESS Reality、WS-TLS、XHTTP 配置，支持多 inbound 绑定单用户
- **IP 扫描**：浏览器端原生实现，无需服务端带宽，用户自己网络测速选 IP
- **多地区代理**：通过 Cloudflare Worker 实现流量中继，Railway 仅作控制面，不承载 VPN 流量
- **订阅页面**：黑+青配色，iOS 系统字体，状态配置优先，主配置与自定义 IP 配置分离展示

核心价值在于：**让流量走 Worker → Proxy IP 路径，Railway 永远不在 VPN 数据路径上**。

## 二、技术原理

### 2.1 架构设计

整体架构分为三层：

```
┌─────────────────────────┐
│   Railway (this panel)  │  ← Panel / API / user mgmt / config generator / worker manager
└────────────┬────────────┘
             │  (only management + config serving — NOT in the VPN path)
             │
┌─────────┐      ┌────▼──────────┐      ┌──────────────────┐      ┌───────────┐
│ Client  │ ───▶ │ Worker Domain │ ───▶ │ Cloudflare Worker │ ───▶ │ Proxy IP  │ ──▶ Internet
└─────────┘      └───────────────┘      └──────────────────┘      └───────────┘
```

- **普通用户**：直连 Panel 的 Reality / WS inbound
- **Worker 用户**：配置指向 Worker Domain，路径 `/route/{country-code}`，Worker 查询国家 → 代理 IP 映射并转发

### 2.2 Reality 密钥生成机制

Reality 密钥（x25519 + ML-DSA-65 后量子签名）由 **Xray 二进制本身生成**，而非 Python 加密库：

```python
# main.py 中的 Reality 密钥生成逻辑
async def generate_reality_keys(inbound_id: int):
    # 调用 Xray 二进制生成密钥对
    result = subprocess.run(
        [XRAY_BIN_PATH, "x25519"],
        capture_output=True, text=True
    )
    # 解析输出，提取 Private key / Public key
    private_key = parse_x25519_output(result.stdout, "Private key")
    public_key = parse_x25519_output(result.stdout, "Public key")
    
    # ML-DSA-65 后量子签名（Xray 内置支持）
    # 存储到 inbound 配置中
    inbound.reality_private_key = private_key
    inbound.reality_public_key = public_key
```

这种方式确保密钥生成逻辑与 Xray 完全一致，避免跨实现的不兼容问题。

### 2.3 浏览器端 IP 扫描器

IP 扫描器完全在用户浏览器中运行，使用 `fetch(..., { mode: 'no-cors' })` 测速：

```javascript
// static/index.html 中的扫描器实现
async function pingIPs(ips) {
    const results = await Promise.all(ips.map(async (ip) => {
        const start = performance.now();
        try {
            await fetch(`https://${ip}/`, { 
                mode: 'no-cors', 
                cache: 'no-store' 
            });
            return { ip, latency: performance.now() - start };
        } catch {
            return { ip, latency: Infinity };
        }
    }));
    return results.sort((a, b) => a.latency - b.latency);
}
```

关键设计：
- **零服务端带宽**：所有测速流量由用户自己网络发起
- **移动端友好**：纯 JS 实现，手机浏览器同样可用
- **序列号保护**：清除操作带 `seq` 校验，防止陈旧写入覆盖

### 2.4 Cloudflare Worker 代理中继

Worker 脚本（`worker/_worker.js`）实现 VLESS WS 中继：

```javascript
// worker/_worker.js 核心逻辑（简化）
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const countryCode = url.pathname.split('/route/')[1];
        
        // 从 KV 获取该国家的代理 IP 列表
        const proxyList = await env.KV.get(`proxies:${countryCode}`);
        const targetIP = selectRoundRobin(proxyList);
        
        // 验证用户 UUID
        const uuid = extractUUIDFromRequest(request);
        const user = await env.KV.get(`user:${uuid}`);
        if (!user || user.expired || user.quota_exceeded) {
            return new Response('Forbidden', { status: 403 });
        }
        
        // 建立 TCP 连接并转发
        return forwardVLESS(request, targetIP);
    }
}
```

Panel 通过 Cloudflare API 自动：
1. 部署 Worker 脚本
2. 创建 KV namespace 并绑定
3. 同步用户 UUID、流量限额、过期时间
4. 定时拉取 `ProxyIP-Daily.md` 更新代理池

### 2.5 订阅页面生成

每个用户的订阅页面（`/sub/{identifier}`）布局固定：

```
[Status config]      ← 显示剩余天数 + 流量百分比
[Main config #1]     ← 每个选中的 inbound 一个配置
[Main config #2]
─────────────────────
[Custom IP (Railway) + 10 configs]  ← 扫描器选出的 IP
[Custom #1] [Custom #2] …
```

配置自动注入 `RAILWAY_PUBLIC_DOMAIN` 或手动设置的域名，无需用户手动填写 `address`/`host`/`sni`。

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.10+
- Railway 账户（或支持容器部署的平台）
- Cloudflare 账户（可选，用于 Worker 代理）
- Xray 二进制（首次运行时自动下载到 `xray/` 目录）

### 3.2 Railway 部署步骤

1. **Fork 或直接使用模板**：将仓库推送到 GitHub
2. **Railway 创建项目**：`New Project → Deploy from GitHub → 选择仓库`
3. **配置环境变量**：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | HTTP 端口 |
| `ADMIN_PASSWORD` | `admin` | 初始密码（登录后立即修改）|
| `SECRET_KEY` | `spider-panel-secret-key-v2` | Session 加密密钥，务必设置为强随机值 |
| `RAILWAY_PUBLIC_DOMAIN` | 自动 | Railway 自动注入，用于 WS-TLS 配置 |
| `DATA_DIR` | `/data` | 持久化目录 |
| `WORKER_SYNC_INTERVAL` | `3600` | 代理池同步间隔（秒）|

4. **访问面板**：打开 `*.up.railway.app` URL，使用默认密码登录后立即修改

### 3.3 本地开发

```bash
git clone https://github.com/amirappleidfd-stack/spider--panel.git
cd spider--panel
pip install -r requirements.txt
python main.py  # http://localhost:8080，密码 admin/admin
```

设置 `RAILWAY_PUBLIC_DOMAIN` 或在面板中手动配置域名，本地也能看到正确的 WS-TLS 配置。

## 四、使用方法与实战

### 4.1 创建用户与订阅

1. 登录面板，进入 **Users** 页面
2. 点击 **Create User**，填写：
   - Username（订阅标识符）
   - Traffic limit（流量限额，字节）
   - Expiry date（过期时间）
   - 可选：勾选 `proxy_ip_enabled` 启用 Worker 代理
3. 用户创建后，点击用户名进入详情页，复制订阅链接：`/sub/{username}`

### 4.2 配置 Inbound

1. 进入 **Inbounds** 页面
2. 选择类型：
   - **VLESS Reality**：自动生成 x25519 + ML-DSA-65 密钥
   - **VLESS WS-TLS**：自动使用面板域名
   - **VLESS XHTTP**：支持 packet-up / stream-up / stream-one 传输
3. 一个用户可绑定多个 inbound，每个 inbound 独立生成一条配置

### 4.3 IP 扫描器使用

1. 进入 **IP Scanner** 页面
2. 选择扫描类型：
   - **Cloudflare**：从已知 CF IP 段随机生成候选
   - **Railway**：从 Railway IP 段生成
   - **TCP**：输入域名，解析后测连通性
3. 点击 Start，浏览器自动测速并排序
4. 结果保存后，在用户详情页分配 **Custom IP (scanner)**，订阅中会额外生成最多 10 条 WS-TLS 配置

### 4.4 Worker 代理配置（可选）

1. 进入 **Worker** 页面
2. 填写 Cloudflare 凭据：
   - API Token（推荐使用 Bearer token）
   - Email（仅 Global API Key 需要）
   - Account ID
3. 点击 **Connect & Deploy**
4. Panel 自动：
   - 部署 Worker 脚本
   - 创建 KV namespace
   - 同步所有启用 `proxy_ip_enabled` 的用户
5. 在 **Proxy IP Pool** 中管理国家 → 代理 IP 映射

### 4.5 自动代理池同步

Panel 每小时（可配置）从 GitHub 源拉取最新代理列表：

```python
# fetch_proxies.py 中的源 URL
DEFAULT_SOURCE = "https://github.com/NiREvil/vless/blob/main/sub/ProxyIP-Daily.md"
```

解析逻辑：
- 解析 Flag emoji → ISO 国家代码
- 每国家保留前 3 个 IP（最优风险排序）
- Worker 请求时 Round-Robin 选择

## 五、常见问题与解决方案

### 5.1 登录后页面空白

**原因**：静态文件路径问题或 `SECRET_KEY` 未设置

**解决**：
```bash
# 检查 SECRET_KEY 环境变量
echo $SECRET_KEY

# 确保静态文件存在
ls static/index.html
```

### 5.2 WS-TLS 配置中地址显示为 localhost

**原因**：`RAILWAY_PUBLIC_DOMAIN` 未正确注入

**解决**：
- Railway 会自动注入该变量
- 本地开发时手动设置：`export RAILWAY_PUBLIC_DOMAIN=your-domain.com`
- 或在面板 Settings 页面手动配置域名

### 5.3 Worker 部署失败

**原因**：API Token 权限不足

**解决**：
- 确保 Token 具有 `Workers Scripts: Edit` + `KV Storage: Edit` 权限
- 检查 Account ID 是否正确
- 查看 Panel 日志中的详细错误信息

### 5.4 IP 扫描器无结果

**原因**：浏览器 CORS 限制或网络不通

**解决**：
- 确保使用 HTTPS 访问面板（HTTP 下 fetch 可能被阻止）
- 尝试切换网络环境
- 使用 TCP 扫描模式，先解析域名再测连通性

### 5.5 订阅配置无法导入客户端

**原因**：配置格式不兼容或缺少必要字段

**解决**：
- 确认客户端支持 VLESS Reality / XHTTP
- 检查订阅页面源码，确认 `address` / `host` / `sni` 正确
- 使用 `/api/users/{id}/config` 直接获取 JSON 配置调试

## 六、总结

Spider Panel 的核心创新在于：**将控制面（Panel）与数据面（Worker → Proxy IP）彻底分离**。Railway 仅负责用户管理、配置生成、Worker 编排，所有 VPN 流量都走 Cloudflare Worker → 代理 IP 路径。配合浏览器端 IP 扫描器、多 inbound 支持、自动代理池同步，它提供了一个开箱即用的代理服务运营方案。

技术亮点包括：Xray 二进制生成 Reality 密钥、序列号保护的并发写入、KV 驱动的用户认证、Round-Robin 代理选择。对于需要搭建代理服务或学习 VLESS 架构的开发者，这是一个值得深入研究的开源实现。

项目地址：[https://github.com/amirappleidfd-stack/spider--panel](https://github.com/amirappleidfd-stack/spider--panel)
