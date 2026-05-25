---
title: "cmux — Ghostty-based macOS terminal with vertical tabs and notifications for AI coding agents"
date: 2026-05-25
draft: false
tags: ["GitHub Trending", "开源项目"]
categories: ["开源项目", "技术博客"]
---

# cmux — Ghostty-based macOS terminal with vertical tabs and notifications for AI coding agents

## 一、项目概述
<h1 align="center"cmux</h1
<p align="center"A Ghostty-based macOS terminal with vertical tabs and notifications for AI coding agents</p

**GitHub：** https://github.com/manaflow-ai/cmux
**语言：** Swift
**⭐ Stars：** 19,323

## 二、核心特性
- 标准包管理，依赖安装简单
- README 文档完善，上手容易

## 三、技术实现
项目基于以下关键技术实现：

### 核心文件结构

| 文件 | 说明 |
|------|------|
| `cmux-Bridging-Header.h` | H · 0.0 KB |
| `ghostty.h` | H · 0.3 KB |
| `package.json` | JSON · 0.2 KB |
| `skills.sh` | SH · 4.1 KB |

### 核心代码示例

**ghostty.h**：
```h
#ifndef CMUX_GHOSTTY_BRIDGE_HEADER_H
#define CMUX_GHOSTTY_BRIDGE_HEADER_H

// Keep the Swift bridge on Ghostty's canonical C API header so Xcode and the
// bundled GhosttyKit stay ABI-aligned across submodule upgrades.
#include "ghostty/include/ghostty.h"

#endif
```

**package.json**：
```json
{
  "scripts": {
    "feed-tui": "bun Resources/feed-tui/index.ts"
  },
  "dependencies": {
    "@opentui/core": "^0.1.106",
    "vercel": "^50.9.5"
  },
  "license": "GPL-3.0-or-later"
}
```

**skills.sh**：
```sh
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: skills.sh [options]

Install cmux agent skills into the Codex skills directory.

Options:
  --dest DIR       Destination directory. Default: ${CODEX_HOME:-$HOME/.codex}/skills
  --source DIR     Source checkout or skills directory. Default: local checkout, or GitHub when piped
  --ref REF        GitHub ref to download when no local skills directory is available. Default: main
  --skill NAME     Install one skill. Repeat to install multiple. Default: all skills
  --list           List available skills and exit
  --dry-run        Print what would be installed
  -h, --help       Show this help

Examples:
  ./skills.sh
  ./skills.sh --list
  ./skills.sh --skill cmux --skill cmux-browser
  curl -fsSL https://raw.githubusercontent.com/manaflow-ai/cmux/main/skills.sh | bash
EOF
}

die() {
  printf 'skills.sh: %s\n' "$*" >&2
  exit 1
}
```

## 四、快速开始

```bash
brew tap manaflow-ai/cmux
brew install --cask cmux
```

## 五、适用场景

- 开发者研究新技术栈和最佳实践
- 项目快速启动和原型开发
- 学习开源项目的设计思路和架构
- 集成到现有项目中作为依赖

## 六、总结
cmux 是 GitHub Trending 上的热门开源项目，
当前已获得 19,323 ⭐，在技术社区具有较高影响力。
项目代码结构清晰，文档完善，适合深入学习和实际应用。

> 🔗 项目地址：https://github.com/manaflow-ai/cmux