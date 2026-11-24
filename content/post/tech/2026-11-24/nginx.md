---
title: "NGINX：33k star 的官方开源仓库，如何用 master-worker 撑起全球最流行的反向代理"
date: "2026-11-24T16:05:00+08:00"
description: "NGINX 官方开源仓库（nginx/nginx）深度解析：从 master-worker 进程模型、事件驱动与模块化阶段机制讲起，完整走一遍源码编译安装、反向代理与负载均衡、TLS/HTTP2/HTTP3、限流与缓存的实战配置，并整理生产环境最常见的踩坑清单。"
author: "Cheman"
slug: nginx
github_repo: nginx/nginx
draft: false
tags: ["NGINX", "反向代理", "负载均衡", "C", "GitHub Trending"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**NGINX**（`nginx/nginx`），官方把自家源码仓库直接开源在了 GitHub 上，一天涨了 174 star。它解决的是高并发场景下"一个进程扛不住、线程切换开销大"的老问题——用事件驱动加多进程模型，把 C10K 甚至 C100K 变成常规操作。本文从架构原理到编译安装、再到反向代理与限流的实战配置，带你完整过一遍这个 33k star 的 Web 服务器基座。

## 一、项目概述

NGINX（读作 "engine x"）是目前世界上使用最广的 Web 服务器之一，同时也是一个高性能的负载均衡器（Load Balancer）、反向代理（Reverse Proxy）、API 网关和内容缓存（Content Cache）。这个仓库是它的**官方开源源码仓库**，由 NGINX 团队维护，企业级发行版、商业支持和培训由 F5, Inc 提供。

仓库本身只放源码和文档，不放编译好的二进制包——这是它和很多"开箱即用型"开源项目的第一个区别。截至抓取时，仓库有 33100 star、8394 fork，主语言是 C（约 680 万字节），采用 BSD-2-Clause 许可证，默认分支是 `master`，当前 release 标签为 `release-1.31.10`，属于 mainline（主线）版本。仓库创建于 2015 年 6 月，至今仍在高频提交，最近一次 push 就在抓取前一天。

核心能力可以概括成下面几条：

- **静态文件与 Web 服务**：最基础也最稳的用法，配合 sendfile、gzip、缓存头等指令即可承载大量静态资源。
- **反向代理与负载均衡**：把请求转发到上游（upstream）服务池，支持轮询、权重、最少连接、IP Hash 等策略，并能做健康检查与连接复用。
- **TLS 终止**：在边缘节点统一处理 HTTPS，把明文流量交给内网后端，降低后端服务的证书管理成本。
- **内容缓存**：作为 CDN 边缘节点缓存上游响应，减少回源次数，README 里专门指向了官方的 Caching Guide。
- **限流与 API 网关**：基于共享内存的 `limit_req` / `limit_conn` 可以在网关层做粗粒度限流，是 API Gateway 场景的常见起点。
- **HTTP/2 与 HTTP/3**：仓库 topics 里明确列了 http2、http3、quic，说明这两代协议都是一等公民。
- **模块化扩展**：官方模块、第三方静态模块、以及 1.9.11 引入的动态模块（Dynamic Modules），让功能可以按需裁剪或后期加载。

项目成熟度不用多说：一个跑了二十多年、几乎每台 Linux 服务器上都可能躺着一份的项目。它的定位不是"轻量替代品"，而是**基础设施层**——你配错了它不会报错得很明显，但你会在凌晨三点被告警叫醒。

## 二、技术原理

### 2.1 master-worker 进程模型

README 里对运行时的描述很直接：NGINX 不是单个巨型进程，而是一组进程，用来突破操作系统对单进程的限制。

```text
                 ┌──────────────────────────┐
                 │      master process      │
                 │  读取/校验配置、管理 worker │
                 └────────────┬─────────────┘
                              │ fork + 监控
        ┌─────────────┬───────┴───────┬─────────────┐
        ▼             ▼               ▼             ▼
   ┌─────────┐   ┌─────────┐     ┌─────────┐   ┌─────────┐
   │ worker  │   │ worker  │ ... │ worker  │   │ cache   │
   │  处理   │   │  处理   │     │  处理   │   │ manager │
   │  请求   │   │  请求   │     │  请求   │   │ /loader │
   └────┬────┘   └────┬────┘     └────┬────┘   └─────────┘
        └─────────────┴───────────────┘
                      │
              ┌───────▼────────┐
              │  shared memory │  限流计数、缓存索引、SSL session
              └────────────────┘
```

**master 进程**只做三件事：读取并校验配置、维护 worker 进程数量、在收到信号时平滑地启停 worker。它不处理任何业务请求，所以哪怕某个 worker 崩了，master 也能立刻补一个上来。

**worker 进程**才是真正干活的。它数量由 `worker_processes` 决定，可以写死，也可以设成 `auto` 自动跟随 CPU 核数。README 的建议是后者在多数情况下能更好地均衡负载，因为 NGINX 的设计目标就是让工作在所有 worker 之间高效分布。

这种模型的取舍很清晰：多进程意味着**没有共享的可变状态**，天然规避了多线程锁竞争；代价是进程间要通信就必须走共享内存。README 特意强调了一句——很多指令需要分配共享内存区（shared memory zone），比如配置限流时，客户端计数要放进 `limit_req_zone` 定义的公共内存区，所有 worker 才能看到"这个 IP 这一秒已经来了多少次"。

### 2.2 事件驱动与连接处理

每个 worker 内部是单线程的事件循环（event loop）。在 Linux 上用 epoll，在 FreeBSD 上用 kqueue，在 Solaris 上用 event ports——这一层被 NGINX 抽象成了 event module。请求进来后 worker 不阻塞等待，而是把 socket 注册进事件表，等内核通知"可读了/可写了"再回来处理。

这解释了一个常被误解的现象：`worker_connections` 限制的是**单个 worker 能同时打开的最大连接数**，而一个反向代理请求会同时占用"客户端连接"和"上游连接"两条，所以实际能处理的并发请求数大约是 `worker_connections / 2`。这也解释了为什么静态文件服务能轻松跑到几万 QPS，而代理场景的并发上限要打折。

### 2.3 模块体系与请求处理阶段

NGINX 的所有功能都是模块。README 说得很清楚：模块分静态和动态两种，静态模块在编译期确定并打进二进制，动态模块可以事后下载、安装、配置——1.9.11 版本加入的 `load_module` 指令就是入口。官方还特别推荐了 **njs**（NGINX JavaScript），用 JS 语法扩展核心功能，是动态模块里最活跃的一个。

一个 HTTP 请求在内部并不是"一路走到底"，而是被切成若干阶段（phase），每个阶段的模块依次有机会介入：

```text
POST_READ → SERVER_REWRITE → FIND_CONFIG → REWRITE → POST_REWRITE
   → PREACCESS → ACCESS → POST_ACCESS → PRECONTENT → CONTENT → LOG
```

`rewrite` 模块在 REWRITE 阶段干活，`access` 模块在 ACCESS 阶段判断黑白名单，`proxy_pass` 属于 CONTENT 阶段。理解这个顺序，很多"为什么 rewrite 之后 location 又匹配了一次""为什么 `if` 在 location 里行为诡异"的问题就都有了答案。

### 2.4 配置继承与合并

NGINX 的配置是树形的：`http` → `server` → `location`。指令在子层级没写时，会从父层级继承；但**数组类指令（比如 `add_header`、`proxy_set_header`）的继承规则是"子层一旦出现，就完全覆盖父层"**，不是追加。这是配置文件里最容易埋雷的地方之一，后文的问题章节会再提。

## 三、安装与快速开始

### 3.1 两条安装路线

README 给了两条路。日常使用建议走**官方软件源**：先按 https://nginx.org/en/linux_packages.html 的步骤把 NGINX 官方仓库加进系统的包管理器，然后用包管理器安装和升级。README 明确提醒：虽然几乎所有主流 Linux 发行版都自带一个社区版 nginx，但官方强烈建议使用官方包或本仓库源码，以确保拿到最新版本、最新特性和安全补丁。

另一条路是**从源码编译**，适合需要裁剪模块、打补丁、或者要精确控制编译参数的场景。下面按 README 的顺序走一遍。

### 3.2 安装编译依赖

README 给的依赖命令针对 `apt`（Ubuntu/Debian 及其衍生版）。先更新软件源列表：

```bash
sudo apt update
```

安装 GNU C 编译器和 Make：

```bash
sudo apt install gcc make
```

安装最小依赖库：

```bash
sudo apt install libpcre3-dev zlib1g-dev
```

README 特别标注了：这只是支持 rewrite 和 gzip 的**最小集**。如果要开 TLS，还需要 OpenSSL 开发库：

```bash
sudo apt install libssl-dev
```

其他模块依赖可以在 `configure` 阶段的输出里看到——它会告诉你哪个模块因为缺库被跳过了。

### 3.3 克隆并编译

```bash
git clone https://github.com/nginx/nginx.git
```

进入源码根目录后，跑配置脚本：

```bash
auto/configure
```

不加任何参数就是用默认选项编译。要定制就加 `--with-*` / `--without-*`，完整列表在 https://nginx.org/en/docs/configure.html 。配置成功后会在源码根目录生成 `Makefile`，接着编译：

```bash
make
```

### 3.4 安装与验证

```bash
sudo make install
```

二进制会被装到 `/usr/local/nginx/` 目录下。启动：

```bash
sudo /usr/local/nginx/sbin/nginx
```

验证方式 README 也给得很直接：

```bash
curl localhost
```

输出应该以这段 HTML 开头：

```html
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
```

看到 `Welcome to nginx!` 就说明进程起来了、80 端口在监听、默认站点配置生效。如果没看到，先跑 `nginx -t` 检查配置语法，再看 `logs/error.log`。

## 四、使用方法与实战

### 4.1 反向代理 + 负载均衡

这是 NGINX 在生产里最常见的角色：前面挡一层，把流量分给后面多个应用实例。

```nginx
upstream app_backend {
    least_conn;
    server 10.0.0.11:8080 weight=3 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:8080 weight=1;
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

几个点值得单独说：

`least_conn` 是"最少连接"策略，比默认轮询更适合请求耗时差异大的场景——慢请求会把连接占住，轮询还会继续往里塞。`weight=3` 让 10.0.0.11 承担三倍流量，适合新旧机器混部时做灰度配比。`keepalive 32` 是**到上游**的长连接池，配合 `proxy_http_version 1.1` 和把 `Connection` 头置空才生效；不加这三行，NGINX 每个请求都新建一条 TCP 连接，高 QPS 下 TIME_WAIT 会把端口耗光。

`X-Forwarded-*` 这组头是给后端应用识别真实客户端用的。少了 `X-Forwarded-Proto`，后端生成回调 URL 时可能拼成 `http://`，然后你会在 OAuth 回调里收获一个 400。

### 4.2 TLS 终止与 HTTP/2、HTTP/3

```nginx
server {
    listen 443 ssl;
    listen 443 quic reuseport;
    http2 on;
    server_name example.com;

    ssl_certificate     /etc/nginx/certs/example.com.pem;
    ssl_certificate_key /etc/nginx/certs/example.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1h;

    add_header Alt-Svc 'h3=":443"; ma=86400' always;

    location / {
        proxy_pass http://app_backend;
    }
}
```

`http2 on;` 是 1.25.1 之后的新写法，取代了老的 `listen 443 ssl http2;`——后者在新版本里已被标记为废弃。HTTP/3 走 QUIC，基于 UDP，所以 `listen ... quic` 是独立的一行，同时要靠 `Alt-Svc` 响应头告诉浏览器"这个站点支持 h3"，浏览器第二次访问才会真正切过去。上线前记得在防火墙放行 UDP 443，否则 QUIC 握手会静默失败然后回落 HTTP/2，你只会觉得"怎么没快"。

证书这块可以把 `ssl_certificate` 指向包含中间证书的 fullchain 文件，避免部分安卓设备和老客户端报证书链不完整。

### 4.3 限流：把突发流量挡在网关层

```nginx
http {
    limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn_perip:10m;

    server {
        listen 80;

        location /api/ {
            limit_req zone=perip burst=20 nodelay;
            limit_conn conn_perip 10;
            limit_req_status 429;
            limit_conn_status 429;

            proxy_pass http://app_backend;
        }
    }
}
```

`limit_req_zone` 定义的是**共享内存区**和**键**：这里用 `$binary_remote_addr`（比 `$remote_addr` 省空间，IPv4 只占 4 字节），`10m` 大约能存 16 万个状态，`rate=10r/s` 是每个键的平均速率。

`burst=20` 允许排队 20 个突发请求，`nodelay` 表示这 20 个不排队、立刻放行——组合起来的效果是"平时 10r/s，瞬间最多容忍 20 个尖峰，超了直接 429"。如果不加 `nodelay`，超出的请求会被延迟处理，客户端看到的是变慢而不是报错，适合对成功率敏感但对延迟不敏感的场景。

`limit_conn` 是另一维度：限制**同时**的连接数，用来防慢速攻击（slowloris）和单个客户端把连接池占满。

### 4.4 内容缓存

```nginx
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m
                     max_size=10g inactive=60m use_temp_path=off;

    server {
        location /static/ {
            proxy_cache api_cache;
            proxy_cache_valid 200 302 10m;
            proxy_cache_valid 404 1m;
            proxy_cache_key "$scheme$request_method$host$request_uri";
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_background_update on;
            add_header X-Cache-Status $upstream_cache_status always;

            proxy_pass http://app_backend;
        }
    }
}
```

`levels=1:2` 是目录分片，避免单目录下几十万文件导致 `readdir` 变慢。`keys_zone=api_cache:10m` 存的是**索引**（key 到文件路径的映射），10m 大约对应 8 万个键，不是缓存内容本身——内容落在 `max_size=10g` 的磁盘上。`inactive=60m` 表示 60 分钟没被访问就淘汰。

`proxy_cache_use_stale` 是可用性设计的关键：上游挂了的时候，宁可返回一份过期的缓存，也别给用户一个 502。加 `X-Cache-Status` 响应头（值会是 HIT / MISS / EXPIRED / STALE / UPDATING）是排查缓存问题的第一手段，上线时建议先留着。

### 4.5 常用指令速查

| 指令 | 作用 | 典型值 |
| --- | --- | --- |
| `worker_processes` | worker 进程数 | `auto` |
| `worker_connections` | 单 worker 最大连接数 | `10240` |
| `keepalive_timeout` | 客户端长连接空闲超时 | `65s` |
| `client_max_body_size` | 请求体大小上限 | `10m` |
| `proxy_read_timeout` | 读上游响应超时 | `60s` |
| `gzip on` | 开启响应压缩 | `on` |
| `sendfile on` | 零拷贝发送静态文件 | `on` |
| `server_tokens off` | 隐藏版本号 | `off` |

### 4.6 平滑生效：不重启换配置

改完配置不要直接 `restart`。标准流程是先测语法，再发 reload 信号：

```bash
sudo /usr/local/nginx/sbin/nginx -t
sudo /usr/local/nginx/sbin/nginx -s reload
```

`-t` 会完整解析配置并检查文件可读性，报错会带上行号。`reload` 对应的是 HUP 信号：master 重新读取配置、拉起新的 worker、再优雅关闭旧的 worker——旧 worker 会把手上正在处理的请求做完才退出，所以**用户不会看到连接被重置**。这也是 NGINX 能在生产环境频繁变更的底气。

用包管理器安装的话，命令通常是 `nginx -t && systemctl reload nginx`，二进制路径不同，逻辑一样。

## 五、常见问题与解决方案

**1. `nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)`**

现象：启动直接失败，报端口被占用。原因：80 端口已被别的进程占了，常见是系统自带的 Apache、旧的 nginx 进程、或者 Docker 的 port mapping。解决：`ss -lntp | grep :80` 找到占用者，`systemctl stop` 掉或者改 `listen` 端口；确认是残留 nginx 进程就 `nginx -s stop` 后再启。

**2. 非 root 用户启动报 `Permission denied`**

现象：用普通用户跑 `nginx`，绑定 80/443 失败。原因：Linux 下 1024 以下的端口需要特权。解决：给二进制加 capability（`sudo setcap 'cap_net_bind_service=+ep' /usr/local/nginx/sbin/nginx`），或者用 systemd 的 `AmbientCapabilities=CAP_NET_BIND_SERVICE`，或者干脆让 nginx 监听 8080 再由上层做转发。

**3. `413 Request Entity Too Large`**

现象：上传文件或提交大 JSON 时被拒。原因：`client_max_body_size` 默认只有 1m。解决：在 `http`、`server` 或 `location` 层显式调大，比如 `client_max_body_size 50m;`。注意这个指令在 `location` 里写的值会覆盖上层，别只改了一处就以为全局生效。

**4. `502 Bad Gateway` 但后端明明活着**

现象：浏览器 502，后端日志里没有任何请求记录。原因通常是三类：上游地址/端口配错；后端只监听 `127.0.0.1` 而 nginx 在另一台机器上；或者 SELinux 阻止了 nginx 发起网络连接。解决：先在 nginx 机器上 `curl http://10.0.0.11:8080/health` 直连验证；再看 `error.log` 里的 `connect() failed (111: Connection refused)` 或 `(13: Permission denied)`；SELinux 环境执行 `setsebool -P httpd_can_network_connect 1`。

**5. `upstream sent too big header while reading response header`**

现象：后端返回带大量 Set-Cookie 或超长 JWT 时，nginx 报这个错并返回 502。原因：`proxy_buffer_size` 默认 4k/8k，装不下响应头。解决：适当调大 `proxy_buffer_size 16k; proxy_buffers 8 16k; proxy_busy_buffers_size 32k;`。这是治标；如果响应头真有几十 KB，更该反思后端是不是塞了太多东西进 header。

**6. `worker_connections are not enough`**

现象：高并发时 error.log 刷这条，新连接被拒。原因：单 worker 连接数打满，且反向代理场景一个请求吃两条连接。解决：提高 `worker_connections`，同时确认 `worker_rlimit_nofile` 和系统的 `ulimit -n` 足够大——nginx 能打开的 fd 受三者共同约束，只改配置不改内核限制等于白改。

**7. 动态模块加载报 `module ... is not binary compatible`**

现象：`load_module` 之后启动失败，提示版本或签名不兼容。原因：动态模块必须用**与主程序完全相同的版本和编译参数**构建，尤其是 `--with-compat`。解决：用 `nginx -V` 拿到当前二进制的 configure 参数，在模块源码里用同一份参数加 `--with-compat --add-dynamic-module=...` 重新编译；升级 nginx 主程序后，所有动态模块都要跟着重编。

**8. `add_header` 在 location 里加了，父层的头却消失了**

现象：在 `server` 层配了 `add_header X-Frame-Options DENY`，某个 `location` 里加了 `add_header Cache-Control ...`，结果前者不生效。原因：`add_header` 是数组类指令，子层一旦出现就**完全覆盖**父层，不继承。解决：在子层把需要的头全部重写一遍，或者用 `include` 抽一个公共片段在每个层级都引一次。这个坑非常隐蔽，因为配置看起来完全合法。

## 六、总结

`nginx/nginx` 这个仓库的价值不在于"又一个 Web 服务器"，而在于它把高并发服务的工程答案摊开给你看：master-worker 隔离故障、事件循环榨干单核、共享内存解决进程间协作、模块阶段划分把功能解耦。这套设计从 2004 年沿用至今，仍然是很多网关和代理的学习范本。

它适合谁：需要在前端做 TLS 终止、流量分发、限流、缓存的基础设施团队；要把单体应用平滑拆成多实例的后端团队；以及想理解"一台机器如何扛住十万连接"的工程师。它不太适合谁：只想跑个静态博客、不想碰配置文件的人——那种场景 Caddy 或托管平台更省事；以及需要动态服务编排、内置服务发现的场景，那属于 Service Mesh 的领地。

需要留意的是，这个仓库只提供源码，二进制要走官方软件源或自己编译；Windows 版本 README 明确说是 Proof-of-Concept 阶段，只能用于开发和测试。生产环境请认准官方包，别用发行版自带的老版本——安全补丁的差距可能有好几个 CVE。

项目地址：https://github.com/nginx/nginx ，完整文档在 https://nginx.org/en/docs/ 。
