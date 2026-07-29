---
title: "Snipe-IT：免费开源的 IT 资产管理系统"
date: 2026-07-30
description: "Snipe-IT 是一款基于 Laravel 12 构建的免费开源 IT 资产管理系统，支持资产追踪、库存管理、软件许可证管理和报废折旧，适用于企业 IT 运维场景，支持 Docker 一键部署。"
author: "Cheman"
slug: snipe-it
draft: false
categories: ["技术", "开源"]
tags: ["GitHub", "开源", "Laravel", "资产管理", "IT运维"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Snipe-IT**，一款完全免费开源的 IT 资产管理系统，一句话描述：追踪每一台笔记本、每一个软件许可证，让 IT 运维从 Excel 表格中解放出来。

## 一、项目概述

Snipe-IT 由 [grokability](https://github.com/grokability) 团队维护，是一个功能完整的 Web 端资产管理系统，主要解决以下问题：

- **谁持有哪台设备？** 笔记本、台式机、显示器等硬件资产的领取和归还记录
- **软件许可证管理** — 追踪 Office、Adobe 等软件的授权数量和到期时间
- **折旧计算** — 按购买日期自动计算资产残值
- **报表导出** — 支持 PDF、CSV、Excel 多格式导出
- **API 集成** — 提供完整的 JSON REST API，可对接 Jamf、Kandji、Mosyle、UniFi 等第三方系统

### 技术栈一览

```
PHP ^8.2 | Laravel 12 | MySQL/PostgreSQL | Docker
Apache 2.4 | Bootstrap 3 | AdminLTE 2.4
jQuery + Livewire | Chart.js | TCPDF
```

官方提供 [在线演示站点](https://snipeitapp.com/demo/)，账号密码均为 `admin@snipeitapp.com` / `password`，可以直接体验完整功能。

## 二、技术原理

### 2.1 架构设计

Snipe-IT 采用标准的 Laravel MVC 架构，核心数据模型包括：

- **Assets（资产）**：设备本体，含资产编号、型号、序列号、购买日期、价格
- **Users（用户）**：持有资产的员工信息
- **Manufacturers / Models / Categories**：资产分类体系
- **Licenses / Accessories / Consumables**：许可证、配件、耗材独立管理
- **Locations / Departments**：地理位置和组织架构支持

ERD（实体关系图）在 [DrawSQL](https://drawsql.app/templates/snipe-it) 上公开可查。

### 2.2 Docker 部署核心逻辑

项目根目录的 `Dockerfile` 体现了 Snipe-IT 的完整运行环境：

```dockerfile
FROM ubuntu:24.04
RUN apt-get install -qqy --no-install-recommends \
    apache2 libapache2-mod-php8.3 \
    php8.3-curl php8.3-ldap php8.3-mysql \
    php8.3-gd php8.3-xml php8.3-mbstring \
    php8.3-zip php8.3-bcmath php8.3-redis

# PHP 环境变量顺序配置
RUN sed -i 's/variables_order = .*/variables_order = "EGPCS"/' \
    /etc/php/8.3/apache2/php.ini

# 数据持久化（符号链接到挂载卷 /var/lib/snipeit）
RUN rm -r "/var/www/html/storage/private_uploads" && \
    ln -fs "/var/lib/snipeit/data/private_uploads" \
           "/var/www/html/storage/private_uploads"

VOLUME ["/var/lib/snipeit"]
```

数据卷 `/var/lib/snipeit` 挂载了所有持久化数据（上传文件、备份、OAuth 密钥），与应用程序目录分离，升级时不会丢失数据。

### 2.3 OAuth 与 API 安全

Laravel Passport 为系统提供 OAuth 2.0 认证，密钥路径通过符号链接指向持久化卷：

```bash
/var/lib/snipeit/keys/oauth-private.key  →  storage/oauth-private.key
/var/lib/snipeit/keys/oauth-public.key   →  storage/oauth-public.key
```

## 三、安装与快速开始

### 3.1 Docker Compose（一行启动）

```bash
git clone https://github.com/grokability/snipe-it.git
cd snipe-it
docker volume create snipeit_vol
docker-compose up -d
```

然后访问 `http://localhost:8080`，按引导完成初始化配置。

### 3.2 手动安装（Ubuntu 24.04）

```bash
# 安装依赖
apt-get install -y apache2 php8.3 mysql-server \
    php8.3-curl php8.3-gd php8.3-xml php8.3-mbstring \
    php8.3-zip php8.3-bcmath php8.3-redis php8.3-ldap git unzip

# 下载项目
git clone https://github.com/grokability/snipe-it.git
cd snipe-it

# 配置环境变量
cp .env.example .env
php artisan key:generate

# 安装 PHP 依赖
composer install

# 运行数据库迁移
php artisan migrate

# 启动服务
php artisan serve --host=0.0.0.0 --port=8080
```

### 3.3 系统要求

- PHP 8.2+（最高支持 PHP 8.x，当前不支持 PHP 9+）
- MySQL 5.7+ 或 PostgreSQL
- Web 服务器：Apache 或 Nginx
- PHP 扩展：bcmath, curl, exif, gd/imagick, json, ldap, mbstring, PDO, sodium, xml, zip

## 四、实战技巧与第三方集成

### 4.1 与 Jamf Pro 同步

[grokability/jamf2snipe](https://github.com/grokability/jamf2snipe) 可将 Jamf 管理的 Mac 设备自动同步到 Snipe-IT，保持两套系统数据一致。

### 4.2 生成资产标签 PDF

通过内置 TCPDF 模块，可以直接生成带 QR Code 的资产标签，打印后贴在设备上，扫码即可查看资产详情。

### 4.3 LDAP/Active Directory 集成

PHP `ext-ldap` 扩展启用后，可在 `.env` 中配置 LDAP 服务器，实现 AD 账号自动登录和组织架构同步。

## 五、常见问题与解决方案

**Q：安装后提示 "APP_KEY should not be blank"？**
A：运行 `php artisan key:generate` 生成应用密钥。

**Q：Docker 部署数据迁移后提示 500 错误？**
A：检查 `/var/lib/snipeit` 卷是否正确挂载，确认 `storage` 目录下的符号链接指向正确。

**Q：LDAP 登录失败？**
A：确认 `.env` 中 `LDAP_HOSTS`、`LDAP_BASE_DN` 配置正确，且服务器开放了 LDAP 端口（默认 389）。

**Q：升级后页面样式错乱？**
A：运行 `php artisan view:clear && php artisan cache:clear` 清理缓存。

**Q：PHP 版本不兼容？**
A：运行根目录的 `upgrade.php` 脚本，脚本会自动从 GitHub 获取当前分支的 PHP 版本要求，并引导你完成升级。

## 六、总结

Snipe-IT 是 IT 资产管理领域最成熟的免费开源方案之一，**超过 331 位贡献者**参与维护，功能覆盖从资产入库到报废的全生命周期。相比商业方案（如 ServiceNow Asset Management），Snipe-IT 完全免费、Docker 部署简单、社区活跃，特别适合中小企业 IT 团队或 MSP（管理服务提供商）使用。

如果你正在为团队寻找一个零成本的资产管理系统，不妨先试试它的 [在线演示](https://snipeitapp.com/demo/)。

> 📎 GitHub：https://github.com/grokability/snipe-it  
> 📖 文档：https://snipe-it.readme.io/docs
