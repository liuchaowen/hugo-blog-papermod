# Understand-Anything — Graphs that teach > graphs that impress. Turn any code into an interactive knowledge graph you can explore, search, and ask questions about. Works with Claude Code, Codex, Cursor, Copilot, Gemini CLI, and more.

## 一、项目概述
<p align="center"
  <strongTurn any codebase, knowledge base, or docs into an interactive knowledge graph you can explore, search, and ask questions about.</strong
  <br /
  <emWorks with Claude Code, Codex, Cursor, Copilot, Gemini CLI, and more.</em
</p

**GitHub：** https://github.com/Lum1104/Understand-Anything
**语言：** TypeScript
**⭐ Stars：** 29,453

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
| `eslint.config.mjs` | MJS · 1.3 KB |
| `install.sh` | SH · 7.6 KB |
| `package.json` | JSON · 1.1 KB |
| `tsconfig.json` | JSON · 0.4 KB |
| `vitest.config.ts` | TS · 1.0 KB |

### 核心代码示例

**eslint.config.mjs**：
```mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/public/**',
      '**/coverage/**',
      '**/.understand-anything/**',
      '**/.claude-plugin/**',
      '**/.cursor-plugin/**',
      '**/.copilot-plugin/**',
      '**/.astro/**',
      '.private/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
```

**install.sh**：
```sh
#!/usr/bin/env bash
# Understand-Anything installer (macOS / Linux)
#
# Usage:
#   ./install.sh                       Prompt for platform
#   ./install.sh <platform>            Install for <platform>
#   ./install.sh --update              Pull latest changes
#   ./install.sh --uninstall <plat>    Remove links for <plat>
#   ./install.sh --help
#
# Curl-pipe usage:
#   curl -fsSL https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.sh | bash -s codex
#
# Environment:
#   UA_REPO_URL  Override clone URL (default: official GitHub repo)
#   UA_DIR       Override clone destination (default: $HOME/.understand-anything/repo)

set -euo pipefail

REPO_URL="${UA_REPO_URL:-https://github.com/Lum1104/Understand-Anything.git}"
REPO_DIR="${UA_DIR:-$HOME/.understand-anything/repo}"
PLUGIN_LINK="$HOME/.understand-anything-plugin"

# Platform table — id|skills-target-dir|style
# style "per-skill": one symlink per skill into the target dir
# style "folder":    one symlink for the whole skills/ dir into the target,
#                    named "understand-anything"
platforms_table() {
  cat <<EOF
```

**package.json**：
```json
{
  "name": "understand-anything",
  "private": true,
  "type": "module",
  "main": ".opencode/plugins/understand-anything.js",
  "packageManager": "pnpm@10.6.2+sha512.47870716bea1572b53df34ad8647b42962bc790ce2bf4562ba0f643237d7302a3d6a8ecef9e4bdfc01d23af1969aa90485d4cebb0b9638fa5ef1daef656f6c1b",
  "scripts": {
    "prepare": "pnpm --filter @understand-anything/core build",
    "build": "pnpm -r build",
    "test": "vitest run",
    "dev:dashboard": "pnpm --filter @understand-anything/dashboard dev",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "globals": "^17.6.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^3.1.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "sharp",
      "tree-sitter-c",
      "tree-sitter-c-sharp",
      "tree-sitter-cpp",
      "tree-sitter-go",
      "tree-sitter-java",
```

## 四、快速开始

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

## 五、适用场景

- 开发者研究新技术栈和最佳实践
- 项目快速启动和原型开发
- 学习开源项目的设计思路和架构
- 集成到现有项目中作为依赖

## 六、总结
Understand-Anything 是 GitHub Trending 上的热门开源项目，
当前已获得 29,453 ⭐，在技术社区具有较高影响力。
项目代码结构清晰，文档完善，适合深入学习和实际应用。

> 🔗 项目地址：https://github.com/Lum1104/Understand-Anything