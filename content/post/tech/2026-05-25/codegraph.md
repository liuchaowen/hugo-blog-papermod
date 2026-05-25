---
title: "codegraph — Pre-indexed code knowledge graph for Claude Code, Codex, Cursor, OpenCode, and Hermes Agent — fewer tokens, fewer tool calls, 100% local"
date: 2026-05-25
draft: false
tags: ["GitHub Trending", "开源项目"]
categories: ["开源项目", "技术博客"]
---

# codegraph — Pre-indexed code knowledge graph for Claude Code, Codex, Cursor, OpenCode, and Hermes Agent — fewer tokens, fewer tool calls, 100% local

## 一、项目概述
Supercharge Claude Code, Cursor, Codex, OpenCode, and Hermes Agent with Semantic Code Intelligence

**GitHub：** https://github.com/colbymchenry/codegraph
**语言：** TypeScript
**⭐ Stars：** 24,165

## 二、核心特性
- 配置文件驱动，易于自定义
- 标准包管理，依赖安装简单
- 含测试用例，质量有保障
- README 文档完善，上手容易

## 三、技术实现
项目基于以下关键技术实现：

### 核心文件结构

| 文件 | 说明 |
|------|------|
| `install.sh` | SH · 3.4 KB |
| `package.json` | JSON · 1.9 KB |
| `tsconfig.json` | JSON · 0.9 KB |
| `vitest.config.ts` | TS · 0.3 KB |

### 核心代码示例

**install.sh**：
```sh
#!/bin/sh
#
# CodeGraph standalone installer.
#
# Downloads a self-contained bundle (a vendored Node runtime + the app) from
# GitHub Releases. No Node.js, no build tools, no npm required — ideal for a
# fresh Linux VPS over SSH.
#
#   curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
#
# Upgrade:   re-run the same command.
# Uninstall: curl -fsSL .../install.sh | sh -s -- --uninstall
#
# Environment:
#   CODEGRAPH_VERSION      release tag to install (default: latest)
#   CODEGRAPH_INSTALL_DIR  bundle location   (default: ~/.codegraph)
#   CODEGRAPH_BIN_DIR      symlink location  (default: ~/.local/bin)
set -eu

REPO="colbymchenry/codegraph"
INSTALL_DIR="${CODEGRAPH_INSTALL_DIR:-$HOME/.codegraph}"
BIN_DIR="${CODEGRAPH_BIN_DIR:-$HOME/.local/bin}"

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$BIN_DIR/codegraph"
  rm -rf "$INSTALL_DIR"
  echo "CodeGraph uninstalled (removed $INSTALL_DIR and $BIN_DIR/codegraph)."
  exit 0
fi

```

**package.json**：
```json
{
  "name": "@colbymchenry/codegraph",
  "version": "0.9.4",
  "description": "Supercharge Claude Code with semantic code intelligence. 94% fewer tool calls • 77% faster exploration • 100% local.",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "codegraph": "./dist/bin/codegraph.js"
  },
  "files": [
    "dist",
    "scripts",
    "README.md"
  ],
  "scripts": {
    "build": "tsc && npm run copy-assets && node -e \"require('fs').chmodSync('dist/bin/codegraph.js', 0o755)\"",
    "preuninstall": "node dist/bin/uninstall.js",
    "copy-assets": "node -e \"const fs=require('fs');fs.mkdirSync('dist/db',{recursive:true});fs.copyFileSync('src/db/schema.sql','dist/db/schema.sql');fs.mkdirSync('dist/extraction/wasm',{recursive:true});fs.readdirSync('src/extraction/wasm').filter(f=>f.endsWith('.wasm')).forEach(f=>fs.copyFileSync('src/extraction/wasm/'+f,'dist/extraction/wasm/'+f))\"",
    "dev": "tsc --watch",
    "cli": "npm run build && node dist/bin/codegraph.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:eval": "vitest run __tests__/evaluation/",
    "eval": "npm run build && npx tsx __tests__/evaluation/runner.ts",
    "clean": "node -e \"const fs=require('fs');fs.rmSync('dist',{recursive:true,force:true})\""
  },
  "keywords": [
    "code-intelligence",
    "knowledge-graph",
    "static-analysis"
```

**tsconfig.json**：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "web-tree-sitter": ["./src/web-tree-sitter.d.ts"]
    }
```

## 四、快速开始

```bash
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
```

## 五、适用场景

- 开发者研究新技术栈和最佳实践
- 项目快速启动和原型开发
- 学习开源项目的设计思路和架构
- 集成到现有项目中作为依赖

## 六、总结
codegraph 是 GitHub Trending 上的热门开源项目，
当前已获得 24,165 ⭐，在技术社区具有较高影响力。
项目代码结构清晰，文档完善，适合深入学习和实际应用。

> 🔗 项目地址：https://github.com/colbymchenry/codegraph