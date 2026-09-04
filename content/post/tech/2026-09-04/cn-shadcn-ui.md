---
title: "cn：shadcn 团队打造的新一代 Tailwind 类名合并引擎，比 tailwind-merge 快 30 倍"
date: 2026-09-04T16:06:00+08:00
description: "shadcn-ui 团队推出的 cn 库，替代 tailwind-merge 和 clsx，采用编译时表生成 + 运行时缓存策略，性能提升 30 倍，零依赖且框架无关。"
author: "Cheman"
draft: false
tags: ["Tailwind CSS", "前端工具", "性能优化", "开源", "shadcn"]
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

今天在 GitHub Trending 上看到一个备受瞩目的项目：**cn**，由 shadcn-ui 团队打造的新一代 Tailwind 类名合并引擎，号称比 tailwind-merge 快 30 倍，直接对标 clsx + tailwind-merge 的组合。

## 一、项目概述

`cn` 是一个用于 Tailwind CSS 类名合并与冲突解决的轻量引擎。它的核心定位是 **tailwind-merge 和 clsx 的直接替代品**——相同的 API、完全的输出一致性，但性能大幅领先。

项目由 [aidenybai](https://x.com/aidenybai) 和 [shadcn](https://x.com/shadcn) 共同维护，已在 GitHub 上获得近 700 星的关注。

### 核心特性

- **30× 性能提升**：在组件最常见的调用模式下，`cn` 仅需 10ns，而 clsx + tailwind-merge 需 320ns
- **零依赖**：不依赖任何第三方库，框架无关，支持 React、Vue、Svelte、Solid、Astro 等
- **完全兼容**：与 tailwind-merge 输出完全一致，通过 356,000+ 差异化测试验证
- **即插即用**：`npx shadcn@latest migrate cn` 一键迁移现有项目

## 二、技术原理

### 核心思路：编译时表生成

`cn` 的核心技术非常精妙——**将 tailwind-merge 的运行时配置解释，提前到编译时完成**。

传统的 tailwind-merge 在运行时维护着约 380 个 class group 的配置对象，每次调用都需要：分割类名 → 遍历 Map trie → 执行正则验证 → 用字符串键追踪冲突。这些操作发生在你的渲染循环中。

`cn` 的做法是：

1. **编译阶段**：一个编译器读取相同的配置对象，生成扁平的查找表（typed arrays）
2. **运行时**：引擎对输入字符串做单次遍历，类名通过字符 trie（存储在类型化数组中）匹配，验证器直接对输入的字符区间运行，变体和冲突检查退化为整数比较

```ts
// cn 的运行时引擎核心逻辑（简化示意）
// 类名通过字符 trie 匹配 → 整数比较判断冲突 → 无分配返回
function cn(...inputs) {
  // 指针比较缓存：相同参数直接返回缓存结果
  if (cachedArgsMatch(inputs)) return cachedResult;
  // 单次遍历：trie 查找 + 整数比较
  const result = mergeClasses(inputs);
  return result;
}
```

### 三层缓存架构

`cn` 在引擎之上叠加了三层缓存，专门针对 React 渲染循环的重复模式：

1. **参数缓存（Argument Cache）**：组件每次渲染调用 `cn(base, variant, cond && extra)` 时，传入的字符串实例相同。`cn` 通过指针比较参数，直接返回缓存结果。更厉害的是，它还能学习调用序列——渲染循环中连查找都可以跳过，每次调用仅需约 10ns。这就是 30× 性能提升的来源。

2. **整串缓存（Whole-string Cache）**：字符串必须出现两次才被纳入缓存。一次性的 SSR 字符串不会污染缓存，而真实工作集会完全预热。

3. **Token 记忆（Token Memo）**：在新字符串中重复出现的类名也保持低成本。

### 与 tailwind-merge 的对比

| 维度 | clsx + tailwind-merge | cn |
|------|----------------------|-----|
| 运行时配置解释 | 每次调用都解释 | 编译时一次完成 |
| 冲突检测 | Map trie + 字符串键 | 整数比较 + 类型化数组 |
| 缓存策略 | 无 | 三层缓存（参数/整串/Token） |
| 首次调用 | ~3.2ms（构建 trie） | ~0.4ms（填充数组） |
| 包体积（minified） | ~27.4 KB | ~26.2 KB |
| 依赖 | clsx + tailwind-merge | 零依赖 |

## 三、安装与快速开始

### 安装

```bash
npm install cn
```

### 新项目使用

直接导入即可，无需额外配置：

```tsx
import { cn } from "cn"

export function Button({
  className,
  active,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "rounded-md px-4 py-2 text-sm",
        active && "bg-primary",
        className
      )}
      {...props}
    />
  )
}
```

### 从现有项目迁移

#### 方式一：使用 CLI 一键迁移（推荐）

```bash
npx shadcn@latest migrate cn
```

#### 方式二：手动迁移

替换 `lib/utils.ts` 中的 `cn` 包装函数：

```diff
// lib/utils.ts
- import { clsx, type ClassValue } from "clsx";
- import { twMerge } from "tailwind-merge";
-
- export function cn(...inputs: ClassValue[]) {
-   return twMerge(clsx(inputs));
- }
+ export { cn } from "cn";
```

然后从依赖中移除 `clsx` 和 `tailwind-merge`。如果其他包仍然引用它们，可以使用 [aliasing](https://github.com/shadcn-ui/cn/blob/main/docs/aliasing.md) 将它们指向 `cn`，确保打包只包含一个实现。

## 四、使用方法与实战

### 基础用法：条件类名拼接

```ts
import { cn } from "cn"

// 条件拼接（clsx 风格）+ 冲突解决（tailwind-merge 风格）
cn("px-2 py-1", isActive && "bg-blue-500", { "text-white": isActive })
// 输出: "px-2 py-1 bg-blue-500 text-white"（当 isActive 为 true）
```

### 进阶用法：自定义主题配置

`cn/config` 提供与 tailwind-merge 相同的配置接口：

```ts
// 迁移前：tailwind-merge
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["hero"] }] } },
})

// 迁移后：cn
import { createCn } from "cn/config"

const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: ["hero"] }] } },
})
```

### API 对照表

从 tailwind-merge 迁移时的 API 映射：

| tailwind-merge | cn |
|----------------|---|
| `twMerge(...)` | `twMerge(...)` from `"cn"` |
| `twJoin(...)` | `twJoin(...)` from `"cn"` |
| `extendTailwindMerge(ext)` | 同名，from `"cn/config"` |
| `createTailwindMerge(fn)` | `createTwMerge(fn)` from `"cn/config"` |
| `getDefaultConfig()` | `defaultConfig()` from `"cn/config"` |
| `fromTheme`, `validators` | 同名，from `"cn/config"` |
| `mergeConfigs` | 同名，from `"cn/config"` |

### 按需构建：cn build

`cn` 提供了一个杀手级功能——`cn build` 可以根据项目实际使用的类名重新生成查找表，丢弃未使用的 group。这意味着在真实项目中，包体积可以进一步缩小，而行为完全一致：

```bash
npx cn build
```

由于一个类名的 group 定义就是第一个匹配它的 group，移除代码中从未匹配的 group 不会改变结果。这和 Tailwind 自身的内容扫描是同样的契约。

## 五、常见问题与解决方案

### Q: cn 支持 Tailwind CSS v3 吗？

不支持。`cn` 仅支持 Tailwind CSS v4（与 tailwind-merge v3 对齐）。如果你还在使用 Tailwind v3，请继续使用 tailwind-merge v2。

### Q: 动态构造的类名能用吗？

在使用 `cn build` 时，动态构造的类名（如 `"p-" + size`）无法被检测到。这与 Tailwind 本身的规则一致。解决方案是使用 `--safelist` 显式声明动态类名。

### Q: 看起来像 Tailwind 工具类但不是的类名会怎样？

像 `text-2xs` 这样的类名会被当作 Tailwind 工具类处理。这与 tailwind-merge 的行为和指南一致。

### Q: Node 版本要求？

CLI 需要 Node 20+。运行时本身支持浏览器、Node、Bun、Deno 和 edge runtimes。

### Q: 迁移后输出会变化吗？

不会。`cn` 通过 356,000+ 差异化测试保证与 tailwind-merge 输出完全一致。在 58 个开源代码库的 144,265 次调用测试中，几何平均性能提升 37 倍。

## 六、总结

`cn` 的核心创新在于一个简洁而深刻的洞察：**tailwind-merge 的配置对象在运行时是静态的，那么为什么不在编译时就把它的解释结果固化下来？** 这个思路把运行时的 Map trie 遍历、正则匹配、字符串键比较全部消除，替换为整数比较和类型化数组查找。

对于使用 shadcn/ui 或 tailwind-merge 的项目来说，`cn` 是一个几乎零成本的高收益升级——相同 API、相同输出、更快的速度、更小的包。一键迁移命令让切换过程不到一分钟。

项目地址：[https://github.com/shadcn-ui/cn](https://github.com/shadcn-ui/cn)
