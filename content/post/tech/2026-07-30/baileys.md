---
title: "Baileys：基于 WebSocket 的 WhatsApp Web API TypeScript 库"
date: 2026-07-30
description: "Baileys 是一个轻量级的 TypeScript 库，通过 WebSocket 协议与 WhatsApp Web API 交互，支持完整的消息收发、群组管理、媒体处理等功能，适合构建 WhatsApp 自动化工具和机器人。"
author: "Cheman"
slug: baileys
draft: false
categories: ["技术", "开源"]
tags: ["WhatsApp", "TypeScript", "WebSocket", "自动化", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Baileys**，一个基于 WebSocket 的 TypeScript 库，让你能够通过代码与 WhatsApp Web API 进行交互，非常适合构建聊天机器人或自动化工具。

## 一、项目概述

Baileys 是由 WhiskeySockets 社区维护的 TypeScript 库，它通过 WebSocket 协议实现了与 WhatsApp Web API 的完整交互能力。这意味着开发者可以在不依赖官方 API 的情况下，构建自己的 WhatsApp 自动化解决方案。

**核心特性：**

- **完整协议支持**：支持消息收发、群组管理、媒体文件处理、状态同步等 WhatsApp 核心功能
- **轻量级架构**：基于 WebSocket 的设计，无需浏览器环境，资源占用低
- **TypeScript 原生**：完整的类型定义，开发体验友好
- **MIT 开源**：商业友好的开源协议，可自由使用和修改
- **Node.js 20+ 支持**：利用最新 Node.js 特性，性能优异

## 二、技术原理

### 架构设计

Baileys 采用了模块化的架构设计，核心组件包括：

1. **WebSocket 连接层**：管理与 WhatsApp 服务器的长连接，处理心跳、重连、认证等
2. **协议编解码层**：基于 Protobuf 的消息序列化与反序列化（WAProto 目录）
3. **加密层**：使用 `libsignal` 实现端到端加密通信
4. **状态管理层**：通过 LRU Cache 和 async-mutex 管理会话状态

### 核心技术栈

从 `package.json` 可以看出 Baileys 的技术选型：

```json
{
  "dependencies": {
    "ws": "^8.13.0",              // WebSocket 客户端
    "protobufjs": "^7.5.6",       // Protobuf 编解码
    "libsignal": "^6.0.0",        // Signal 协议加密
    "whatsapp-rust-bridge": "0.5.4", // Rust 实现的核心桥接
    "pino": "^9.6",               // 高性能日志
    "p-queue": "^9.0.0"           // 并发控制
  }
}
```

**技术亮点：**

- **Rust 桥接层**：`whatsapp-rust-bridge` 使用 Rust 实现核心加密逻辑，性能更高
- **Protobuf 协议**：WhatsApp 使用 Protobuf 进行消息编码，Baileys 完整实现了协议定义
- **Signal 协议**：继承了 WhatsApp 的端到端加密机制，确保消息安全

### 消息处理流程

```
用户代码 → Baileys API
    ↓
Protobuf 编码
    ↓
Signal 协议加密
    ↓
WebSocket 发送
    ↓
WhatsApp 服务器
```

### 并发控制机制

Baileys 使用 `p-queue` 进行并发控制，避免因消息发送过快被 WhatsApp 限流：

```typescript
// 来自 package.json 的依赖
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 5 });
queue.add(() => sendMessage(to, content));
```

## 三、安装与快速开始

### 环境要求

- **Node.js 20.0.0+**（库中有引擎检查）
- **npm 或 yarn**

Baileys 在安装时会自动检查 Node.js 版本：

```javascript
// engine-requirements.js
const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 20) {
  console.error(
    `\n❌ This package requires Node.js 20+ to run reliably.\n` +
    `   You are using Node.js ${process.versions.node}.\n`
  );
  process.exit(1);
}
```

### 安装步骤

```bash
# 使用 npm
npm install baileys

# 或使用 yarn
yarn add baileys
```

### 最简运行示例

```typescript
import makeWASocket, { DisconnectReason } from 'baileys';
import { Boom } from '@hapi/boom';

// 创建连接
const sock = makeWASocket({
  printQRInTerminal: true,  // 在终端打印二维码
});

// 监听连接事件
sock.ev.on('connection.update', (update) => {
  const { connection, lastDisconnect } = update;
  
  if (connection === 'close') {
    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
    console.log('连接关闭，是否重连:', shouldReconnect);
    
    if (shouldReconnect) {
      // 重新创建连接
    }
  } else if (connection === 'open') {
    console.log('连接成功！');
  }
});

// 监听消息
sock.ev.on('messages.upsert', (m) => {
  console.log('收到消息:', m);
});
```

## 四、使用方法与实战

### 基础用法：发送消息

```typescript
import makeWASocket from 'baileys';

const sock = makeWASocket();

// 发送文本消息
await sock.sendMessage('8613800138000@s.whatsapp.net', { 
  text: 'Hello from Baileys!' 
});

// 发送图片
await sock.sendMessage('8613800138000@s.whatsapp.net', { 
  image: { url: './photo.jpg' },
  caption: '图片描述'
});

// 发送文件
await sock.sendMessage('8613800138000@s.whatsapp.net', { 
  document: { url: './file.pdf' },
  mimetype: 'application/pdf',
  fileName: 'document.pdf'
});
```

### 进阶用法：群组管理

```typescript
// 创建群组
const group = await sock.groupCreate('我的群组', [
  '8613800138000@s.whatsapp.net',
  '8613900139000@s.whatsapp.net'
]);

// 添加成员
await sock.groupParticipantsUpdate(group.id, [
  '8613700137000@s.whatsapp.net'
], 'add');

// 设置群组描述
await sock.groupUpdateDescription(group.id, '群组简介');

// 获取群组元数据
const metadata = await sock.groupMetadata(group.id);
console.log('群组成员:', metadata.participants);
```

### 进阶用法：消息编辑与删除

```typescript
// 编辑消息
const sent = await sock.sendMessage(jid, { text: '原消息' });
await sock.sendMessage(jid, { 
  text: '编辑后的消息',
  edit: sent.key 
});

// 删除消息（仅自己可见）
await sock.sendMessage(jid, { 
  delete: sent.key 
});

// 删除消息（所有人不可见，需要管理员权限）
await sock.sendMessage(jid, { 
  delete: sent.key,
  everyone: true 
});
```

### 实战示例：简单聊天机器人

```typescript
import makeWASocket from 'baileys';

const sock = makeWASocket({ printQRInTerminal: true });

sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0];
  
  // 忽略自己发送的消息
  if (msg.key.fromMe) return;
  
  const from = msg.key.remoteJid;
  const text = msg.message?.conversation || 
               msg.message?.extendedTextMessage?.text || '';
  
  // 简单的关键词回复
  if (text.includes('你好')) {
    await sock.sendMessage(from, { 
      text: '你好！我是机器人，有什么可以帮助你的？' 
    });
  }
  
  if (text.includes('时间')) {
    await sock.sendMessage(from, { 
      text: `当前时间: ${new Date().toLocaleString('zh-CN')}` 
    });
  }
});
```

## 五、常见问题与解决方案

### 1. 安装失败：Node.js 版本不兼容

**问题：** 运行 `npm install baileys` 报错或安装后无法启动。

**原因：** Baileys 要求 Node.js 20+，使用了较新的 ES Module 特性。

**解决方案：**

```bash
# 检查当前 Node.js 版本
node -v

# 如果版本低于 20，使用 nvm 升级
nvm install 20
nvm use 20
```

### 2. 二维码无法扫描登录

**问题：** 终端显示的二维码无法被 WhatsApp 扫描识别。

**原因：** 终端字符编码或大小问题。

**解决方案：**

```typescript
// 方案 1：使用更大的终端窗口
// 方案 2：保存二维码为图片
import makeWASocket, { makeInMemoryStore } from 'baileys';
import { writeFile } from 'fs/promises';

const sock = makeWASocket({
  qrHandler: async (qr) => {
    // 将二维码保存为文件，用其他工具扫描
    await writeFile('./qr.png', qr);
  }
});
```

### 3. 消息发送频率限制

**问题：** 快速发送大量消息后被 WhatsApp 限流或封号。

**原因：** WhatsApp 对自动化行为有严格检测。

**解决方案：**

- 使用 `p-queue` 控制发送频率（Baileys 已内置）
- 模拟真实用户行为，添加随机延迟
- 避免短时间内发送大量相同内容

```typescript
import PQueue from 'p-queue';

const queue = new PQueue({ 
  concurrency: 1,           // 串行发送
  interval: 2000,           // 每条消息间隔 2 秒
  intervalCap: 1 
});

for (const user of users) {
  await queue.add(() => 
    sock.sendMessage(user, { text: '个性化消息' })
  );
}
```

### 4. 连接频繁断开

**问题：** WebSocket 连接不稳定，频繁断开。

**原因：** 网络问题或 WhatsApp 服务器响应超时。

**解决方案：**

```typescript
import makeWASocket, { DisconnectReason } from 'baileys';
import { Boom } from '@hapi/boom';

let sock;

const connect = () => {
  sock = makeWASocket({
    // 保持会话状态
    browser: ['Chrome (Linux)', '', ''],
    reconnectIntervalMs: 5000,  // 重连间隔
  });
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      
      // 仅在非登出情况下重连
      if (code !== DisconnectReason.loggedOut) {
        console.log('重连中...');
        setTimeout(connect, 5000);
      }
    }
  });
};

connect();
```

### 5. TypeScript 类型错误

**问题：** 使用 TypeScript 时遇到类型不匹配错误。

**原因：** Baileys 使用 ESM 模块，需要正确配置 `tsconfig.json`。

**解决方案：**

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "verbatimModuleSyntax": true
  }
}
```

## 六、总结

Baileys 作为一个功能完整的 WhatsApp Web API 库，为开发者提供了构建自动化工具的能力。它的 TypeScript 原生支持、WebSocket 轻量级架构以及完整的消息处理能力，使其成为 WhatsApp 自动化领域的热门选择。

**适用场景：**

- 客服机器人：自动回复常见问题
- 通知推送：订单状态、提醒消息
- 群组管理：自动化群运营
- 数据采集：消息监控与分析

**注意事项：**

- WhatsApp 对自动化行为有严格限制，使用时需遵守服务条款
- 建议控制消息频率，模拟真实用户行为
- 敏感数据传输需做好加密和隐私保护

如果你需要构建 WhatsApp 相关的自动化工具，Baileys 是一个值得深入研究的开源方案。官方文档正在迁移至 [baileys.wiki](https://baileys.wiki)，可以关注最新进展。

---

**项目地址：** https://github.com/WhiskeySockets/Baileys  
**许可证：** MIT  
**社区：** https://whiskey.so/discord
