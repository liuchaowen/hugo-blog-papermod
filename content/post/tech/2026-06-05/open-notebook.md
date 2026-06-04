---
title: "Open Notebook：开源隐私优先的 Notebook LM 替代品，支持 18+ AI 提供商"
date: 2026-06-05
description: "Open Notebook 是一款开源、隐私优先的研究助手工具，作为 Google Notebook LM 的替代品，支持 18+ AI 模型提供商（OpenAI、Anthropic、Ollama 等），提供多模态内容管理、专业播客生成、全文搜索等功能，数据完全自主可控。"
author: "Cheman"
slug: open-notebook
draft: false
categories: [开源, AI工具]
tags: [GitHub, 开源, AI, 隐私, NotebookLM, 自托管]
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

**开篇引导段**：今天在 GitHub Trending 上看到一个有意思的项目：**Open Notebook**，这是一个开源的、隐私优先的研究助手，旨在成为 Google Notebook LM 的强大替代品。与依赖 Google 云服务的 Notebook LM 不同，Open Notebook 让你完全掌控数据，并支持从 OpenAI、Anthropic 到本地 Ollama 的 18+ AI 提供商。

## 一、项目概述

Open Notebook 是一个开源研究助手工具，灵感来自 Google Notebook LM，但在隐私保护、提供商选择和功能扩展性上实现了全面超越。

**核心特性：**
- 🔒 **数据主权**：自托管部署，敏感研究数据完全私密
- 🤖 **多模型支持**：18+ AI 提供商（OpenAI、Anthropic、Groq、Google、Ollama、LM Studio 等）
- 📚 **多模态内容**：支持 PDF、视频、音频、网页、Office 文档等
- 🎙️ **专业播客生成**：多 speaker 播客生成，支持 1-4 个扬声器自定义配置
- 🔍 **智能搜索**：全文和向量搜索覆盖所有内容
- 💬 **上下文对话**：基于你的研究材料进行 AI 对话
- 🌐 **多语言 UI**：支持英语、葡萄牙语、中日韩俄等语言

**与 Google Notebook LM 对比：**

| 特性 | Open Notebook | Google Notebook LM | 优势 |
|------|---------------|--------------------|------|
| 隐私控制 | 自托管，数据私有 | 仅 Google 云 | 完全数据主权 |
| AI 提供商 | 18+ 提供商 | 仅 Google 模型 | 灵活性和成本优化 |
| 播客扬声器 | 1-4 个，可自定义 | 仅 2 个 | 极致灵活性 |
| API 访问 | 完整 REST API | 无 API | 完全自动化 |
| 定制化 | 开源，完全可定制 | 封闭系统 | 无限扩展性 |

## 二、技术原理

### 架构设计

Open Notebook 采用现代前后端分离架构：

**后端技术栈：**
- **Python 3.12+**：核心编程语言
- **FastAPI**：高性能异步 API 框架
- **LangChain/LangGraph**：AI 编排和工作流引擎
- **SurrealDB**：多模型数据库（文档+图+向量）
- **Esperanto**：统一的多提供商 AI 接口库

**前端技术栈：**
- **Next.js 20.x**：React 元框架，支持 SSR/SSG
- **React**：用户界面构建
- **TypeScript**：类型安全

**核心架构组件：**

```
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│    (React + TypeScript + Tailwind)      │
└─────────────────┬───────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────┐
│         FastAPI Backend                 │
│  - Notebook Management                  │
│  - Source Processing                    │
│  - AI Orchestration (LangChain)         │
│  - Podcast Generation                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      SurrealDB (Multi-model)           │
│  - Documents (Notebooks, Notes)        │
│  - Vectors (Embeddings)                │
│  - Graph (Relationships)                │
└─────────────────────────────────────────┘
```

### 关键技术实现

**1. 多提供商 AI 统一接口**

项目使用自研的 `esperanto` 库统一 18+ AI 提供商的接口：

```python
# 支持的提供商矩阵
provider_support = {
    "OpenAI": ["llm", "embedding", "stt", "tts"],
    "Anthropic": ["llm"],
    "Groq": ["llm", "stt"],
    "Google": ["llm", "embedding", "stt", "tts"],
    "Ollama": ["llm", "embedding"],
    "Mistral": ["llm", "embedding", "stt", "tts"],
    # ... 共 18+ 提供商
}
```

**2. 向量搜索与全文搜索融合**

```python
# 内容索引流程
1. 用户上传 PDF/视频/网页
2. 内容提取 (content-core 库)
3. 文本分块 (tiktoken 分词)
4. 向量化 (用户选择的 embedding 模型)
5. 存储到 SurrealDB (文档 + 向量)
6. 支持全文检索 + 向量相似度检索
```

**3. 播客生成引擎**

基于 `podcast-creator` 库实现专业级播客生成：

```python
# 播客生成配置示例
episode_profile = {
    "speakers": [
        {"name": "Host", "voice": "en-US-Studio-O"},
        {"name": "Expert", "voice": "en-US-Studio-Q"},
        {"name": "Guest", "voice": "en-US-Studio-M"}
    ],
    "format": "interview",  # or "discussion", "debate"
    "duration_target": 1800,  # 30 minutes
}
```

### 数据流分析

**典型用户工作流：**

```
1. 创建 Notebook
   ↓
2. 添加 Sources (PDF/URL/Video/Audio)
   ↓
3. 内容自动处理
   - 文本提取
   - 分块
   - Embedding
   - 索引
   ↓
4. AI 对话 / 搜索
   - 检索相关块 (向量 + 全文)
   - 构建上下文
   - 调用 LLM
   - 返回答案 + 引用
   ↓
5. 生成 Note / 播客
   - AI 辅助笔记
   - 一键播客生成
```

## 三、安装与快速开始

### 环境要求

**最简部署（Docker）：**
- Docker Desktop 4.0+
- 2GB+ RAM
- 5GB+ 磁盘空间

**从源码部署：**
- Python 3.11 或 3.12
- Node.js 20.x LTS
- SurrealDB v2.x

### Docker 快速部署（2 分钟）

**Step 1: 获取 docker-compose.yml**

```bash
# 选项 A: 直接下载
curl -o docker-compose.yml https://raw.githubusercontent.com/lfnovo/open-notebook/main/docker-compose.yml

# 选项 B: 手动创建
cat > docker-compose.yml << 'EOF'
services:
  surrealdb:
    image: surrealdb/surrealdb:v2
    command: start --log info --user root --pass root rocksdb:/mydata/mydatabase.db
    user: root
    ports:
      - "8000:8000"
    volumes:
      - ./surreal_data:/mydata
    restart: always

  open_notebook:
    image: lfnovo/open_notebook:v1-latest
    ports:
      - "8502:8502"
      - "5055:5055"
    environment:
      - OPEN_NOTEBOOK_ENCRYPTION_KEY=change-me-to-a-secret-string
      - SURREAL_URL=ws://surrealdb:8000/rpc
      - SURREAL_USER=root
      - SURREAL_PASSWORD=root
      - SURREAL_NAMESPACE=open_notebook
      - SURREAL_DATABASE=open_notebook
    volumes:
      - ./notebook_data:/app/data
    depends_on:
      - surrealdb
    restart: always
EOF
```

**Step 2: 设置加密密钥**

编辑 `docker-compose.yml`，修改：
```yaml
- OPEN_NOTEBOOK_ENCRYPTION_KEY=change-me-to-a-secret-string
```
改为任意密钥字符串（如 `my-super-secret-key-123`）。

**Step 3: 启动服务**

```bash
docker compose up -d
```

等待 15-20 秒，然后访问：**http://localhost:8502**

**Step 4: 配置 AI 提供商**

1. 进入 **Settings** → **API Keys**
2. 点击 **Add Credential**
3. 选择提供商（OpenAI/Anthropic/Google 等）
4. 粘贴 API Key，点击 **Save**
5. 点击 **Test Connection** → **Discover Models** → **Register Models**

完成！现在可以创建你的第一个 Notebook 了。

### 使用 Ollama（免费本地 AI）

如果想完全免费运行（无需 API 费用），可以使用 Ollama：

```bash
# 1. 下载 Ollama 配置
curl -o docker-compose.yml https://raw.githubusercontent.com/lfnovo/open-notebook/main/examples/docker-compose-ollama.yml

# 2. 启动（会自动下载 Ollama 模型）
docker compose up -d

# 3. 访问 http://localhost:8502
# 4. 在 Settings 中选择 Ollama 作为提供商
```

## 四、使用方法与实战

### 基础用法

**1. 创建 Notebook**

```
点击 "New Notebook" → 输入名称（如 "AI Research"）→ 创建
```

**2. 添加研究材料**

支持的内容类型：
- 📄 **PDF 文档**：论文、报告、书籍
- 🌐 **网页 URL**：自动提取正文
- 🎥 **YouTube 视频**：自动转录字幕
- 🎙️ **音频文件**：MP3/WAV，自动语音识别
- 📝 **纯文本**：直接粘贴或上传 TXT/Markdown

**示例：添加 PDF 论文**

```
1. 点击 "Add Source" → 选择 "PDF"
2. 上传文件或拖拽
3. 等待处理完成（自动提取文本 + 分块 + embedding）
4. 在 Source 列表中看到新增的论文
```

**3. AI 对话（Chat）**

```
1. 选择 Notebook
2. 点击 "Chat"
3. 输入问题："这篇论文的主要贡献是什么？"
4. AI 会基于所有 Sources 回答，并附上引用
```

**4. 智能搜索**

```
1. 在 Notebook 页面，点击 "Search"
2. 输入关键词或问题
3. 支持：
   - 全文搜索（关键词匹配）
   - 向量搜索（语义相似度）
   - 混合搜索（两者结合）
```

### 进阶用法

**1. 生成专业播客**

```
1. 选择 Notebook（包含多个 Sources）
2. 点击 "Podcast" → "Generate"
3. 配置：
   - Episode Profile（1-4 个扬声器）
   - 目标时长（如 30 分钟）
   - 风格（访谈/讨论/辩论）
4. 点击 "Generate"
5. 等待生成（通常需要 5-15 分钟）
6. 下载 MP3 或分享链接
```

**示例 Episode Profile：**

```json
{
  "name": "Tech Interview",
  "speakers": [
    {"name": "Host", "voice": "en-US-Studio-O"},
    {"name": "Researcher", "voice": "en-US-Studio-Q"}
  ],
  "format": "interview",
  "style_prompt": "专业但轻松的技术访谈，深入讨论研究细节"
}
```

**2. 内容转换（Transformations）**

内置和自定义转换操作：

```
1. 选择 Source 或 Note
2. 点击 "Transform"
3. 选择操作：
   - Summarize（摘要）
   - Extract Key Insights（提取关键洞察）
   - Generate Quiz（生成测验）
   - Custom（自定义提示词）
4. 查看结果，保存到 Note
```

**3. 多 Notebook 管理**

```
场景：你有多个研究项目
- Notebook A: "AI Safety Research"
- Notebook B: "Startup Ideas"
- Notebook C: "Learning Rust"

每个 Notebook 独立，Sources/Notes/Chat 互不干扰
```

**4. REST API 编程访问**

Open Notebook 提供完整的 REST API：

```bash
# 获取所有 Notebooks
curl -X GET "http://localhost:5055/api/notebooks" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 创建新 Note
curl -X POST "http://localhost:5055/api/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "notebook_id": "uuid",
    "title": "My Note",
    "content": "Note content..."
  }'

# API 文档：http://localhost:5055/docs
```

### 实际项目示例

**场景：研究论文综述**

```
目标：阅读 10 篇关于 RAG（检索增强生成）的论文，生成综述

步骤：
1. 创建 Notebook: "RAG Survey 2026"
2. 添加 10 篇论文 PDF
3. 等待处理完成
4. Chat 提问：
   - "这些论文的共同主题是什么？"
   - "哪些方法效果最好？"
   - "未来研究方向是什么？"
5. 使用 Transformations 生成每篇论文的摘要
6. 撰写综述（手动 + AI 辅助）
7. 可选：生成播客，用音频形式回顾关键点
```

## 五、常见问题与解决方案

### 安装失败

**问题 1：Docker 启动失败（端口占用）**

```
错误信息：
Error: Bind for 0.0.0.0:8502 failed: port is already allocated

解决方案：
1. 检查端口占用：lsof -i :8502
2. 停止占用进程：kill -9 <PID>
3. 或修改 docker-compose.yml 中的端口映射：
   ports:
     - "8503:8502"  # 改为 8503
```

**问题 2：SurrealDB 连接失败**

```
错误信息：
ERROR: Cannot connect to SurrealDB at ws://surrealdb:8000/rpc

解决方案：
1. 检查 SurrealDB 容器：docker ps | grep surrealdb
2. 查看日志：docker logs <surrealdb_container_id>
3. 重启服务：docker compose restart surrealdb
4. 如果数据损坏，删除数据卷重新启动：
   docker compose down -v
   docker compose up -d
```

**问题 3：AI 提供商 API 连接失败**

```
错误信息：
ERROR: Failed to connect to OpenAI API (401 Unauthorized)

解决方案：
1. 检查 API Key 是否正确
2. 检查网络连接（特别是国内需要代理）
3. 在 docker-compose.yml 中配置代理：
   environment:
     - HTTP_PROXY=http://proxy:port
     - HTTPS_PROXY=http://proxy:port
4. 测试连接：在 Settings 中点击 "Test Connection"
```

### 运行时错误

**问题 4：上传 PDF 失败**

```
错误信息：
ERROR: Failed to process PDF (timeout or memory error)

解决方案：
1. 检查 PDF 大小（建议 < 50MB）
2. 检查 PDF 是否加密（需要解密后上传）
3. 增加 Docker 内存限制：
   # docker-compose.yml
   open_notebook:
     deploy:
       resources:
         limits:
           memory: 4G
4. 分割大 PDF：使用 PDF 工具拆分为多个小文件
```

**问题 5：播客生成失败**

```
错误信息：
ERROR: Podcast generation failed (TTS quota exceeded)

解决方案：
1. 检查 TTS 提供商配额（如 ElevenLabs 有月度字符限制）
2. 切换到免费 TTS 提供商（如 Google TTS）
3. 减少播客时长或扬声器数量
4. 使用本地 TTS（如果支持）
```

**问题 6：搜索结果不准确**

```
问题：向量搜索返回不相关结果

解决方案：
1. 检查 Embedding 模型是否合适（建议用 OpenAI text-embedding-3-small）
2. 调整搜索设置：
   - 增加候选数量（top_k）
   - 降低相似度阈值
3. 手动添加 Tags 到 Sources，结合全文搜索
4. 重新处理 Source（删除后重新上传）
```

### 性能问题

**问题 7：响应速度慢**

```
排查：
1. 检查 AI 提供商延迟（如 Ollama 本地模型较慢）
2. 检查网络延迟（特别是使用远程 API）
3. 优化分块大小（避免过细的分块）

解决方案：
1. 切换到更快的模型（如 GPT-3.5 替代 GPT-4）
2. 启用缓存（LangChain 内置）
3. 使用异步处理（批量操作）
```

**问题 8：内存占用过高**

```
排查：
1. 检查处理的文档数量和大小
2. 检查是否加载了过大的模型（Ollama）

解决方案：
1. 限制同时处理的 Source 数量
2. 定期清理旧数据
3. 使用更小 embedding 模型（如 all-MiniLM-L6-v2）
```

### 兼容性问题

**问题 9：浏览器兼容性**

```
问题：某些功能在 Safari 上不工作

解决方案：
1. 使用 Chrome/Edge（推荐）
2. 检查浏览器控制台错误（F12）
3. 清除浏览器缓存和 Cookie
4. 更新到最新浏览器版本
```

**问题 10：移动设备访问**

```
问题：手机浏览器显示不正常

解决方案：
1. Open Notebook 主要针对桌面优化
2. 使用响应式模式（Chrome DevTools → Toggle Device Toolbar）
3. 或等待官方移动端优化（Roadmap 中有计划）
```

## 六、总结

Open Notebook 是一个功能强大、隐私优先的开源研究助手，完美替代 Google Notebook LM。其核心价值在于：

**✨ 核心优势：**
1. **数据主权**：完全自托管，敏感研究数据不离开你的服务器
2. **提供商自由**：18+ AI 提供商任你选择，避免供应商锁定
3. **成本可控**：可选择免费本地模型（Ollama）或按需付费的 API
4. **功能扩展性强**：开源架构，完全可定制和扩展
5. **专业级播客生成**：多扬声器、自定义配置，远超 Notebook LM

**🎯 适合人群：**
- 学术研究人员（管理论文、生成综述）
- 技术从业者（学习新技术、管理知识库）
- 内容创作者（研究素材、生成播客）
- 隐私敏感用户（自托管、数据可控）

**🚀 快速上手建议：**
1. 先用 Docker 快速部署（2 分钟）
2. 配置一个免费 AI 提供商（如 Groq 或 Ollama）
3. 创建一个测试 Notebook，上传几个 PDF
4. 尝试 Chat 和搜索功能
5. 如果满意，再配置更强大的 AI 提供商（OpenAI/Anthropic）

**🔮 未来展望：**
根据 Roadmap，Open Notebook 还将支持：
- 实时前端更新（WebSocket）
- 异步处理（提升 UI 响应速度）
- 跨 Notebook 共享 Sources
- 书签集成（与浏览器书签同步）

项目开源且活跃维护，社区支持良好（Discord 服务器），是构建个人知识管理和研究助手的优秀选择。

**相关链接：**
- 🌐 官网：https://www.open-notebook.ai
- 📚 文档：https://github.com/lfnovo/open-notebook/tree/main/docs
- 💬 Discord 社区：https://discord.gg/37XJPXfz2w
- 🐛 问题反馈：https://github.com/lfnovo/open-notebook/issues
