---
title: "Pascal Editor：一个基于 WebGPU 的专业级 3D 建筑编辑器"
date: "2026-07-28"
description: "Pascal Editor 是一个开源的 3D 建筑编辑器，基于 React Three Fiber 和 WebGPU 构建，提供模块化节点系统、实时几何生成和插件扩展能力，适合建筑建模、室内设计及 BIM 可视化场景。"
author: "Cheman"
slug: editor
draft: false
categories: ["技术", "开源", "Web"]
tags: ["React", "WebGPU", "Three.js", "3D编辑器", "开源", "建筑建模"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Pascal Editor**，一个基于 React Three Fiber 和 WebGPU 构建的专业级 3D 建筑编辑器，提供模块化的节点系统和实时几何生成能力。

## 一、项目概述

Pascal Editor 是一个面向建筑/室内设计场景的 3D 编辑器，核心定位于**可视化构建与实时预览**。它采用 Turborepo monorepo 架构，将运行时（viewer）和编辑工具（editor）解耦，并通过 npm 包形式发布核心模块，供第三方应用直接集成。

**核心特性：**

- **WebGPU 渲染管线**：基于 Three.js 的 WebGPU 渲染器，支持高质量实时光照和后处理
- **模块化节点系统**：墙、楼板、门窗、屋顶、区域等建筑元素均抽象为节点，统一管理生命周期
- **实时几何生成**：WallSystem、SlabSystem 等系统在帧循环中检测"脏节点"，动态更新几何体
- **CSG 布尔运算**：借助 `three-bvh-csg` 实现门洞/窗洞的自动切割
- **分层视图**：支持堆叠（stacked）、爆炸（exploded）和独立（solo）三种楼层显示模式
- **插件生态**：提供完整的 Plugin API，可扩展节点类型、工具、面板，示例插件包括树木花草等
- **持久化与撤销**：场景数据自动保存至 IndexedDB，配合 Zundo 实现 50 步撤销/重做
- **MIT 许可证**：完全开源，商业友好

## 二、技术原理

### 2.1 整体架构

Pascal Editor 的架构分为三个层次：**core**（核心数据层）、**viewer**（渲染层）和 **editor**（编辑工具层），均以 npm 包形式独立发布：

```
@pascal-app/core    → 节点 schema、场景状态、注册表、空间查询、事件总线
@pascal-app/viewer  → 3D 渲染、相机控制、后处理、层级显示
@pascal-app/editor  → 编辑工具（选择/画墙/放置物品）、层级导航
@pascal-app/nodes   → 内置节点定义、渲染器、几何系统
apps/editor         → Next.js 主应用，整合以上所有包
```

这种分层设计使得 **viewer** 包可以被独立嵌入到任何 React 应用中，无需引入完整的编辑器 UI：

```tsx
import { loadPlugin } from '@pascal-app/core'
import { builtinPlugin } from '@pascal-app/nodes'
import { Viewer } from '@pascal-app/viewer'

await loadPlugin(builtinPlugin)

export default function App() {
  return <Viewer />
}
```

### 2.2 节点系统：数据抽象层

所有 3D 场景元素都是节点（Node），继承自 `BaseNode`：

```typescript
BaseNode {
  id: string          // 自动生成，带类型前缀，如 "wall_abc123"
  type: string        // 类型标识符
  parentId: string | null  // 父子关系
  visible: boolean
  camera?: Camera      // 可选，保存相机位姿
  metadata?: JSON     // 任意元数据
}
```

节点以**扁平字典**形式存储在 Zustand store 中（而非嵌套树），通过 `parentId` 维护层级关系：

```typescript
useScene.getState().nodes  // Record<id, AnyNode>

// 节点层级
Site → Building → Level → (Wall, Slab, Ceiling, Roof, Zone, Scan, Guide)
                        → Item (doors, windows, lights...)
```

这种设计的优势在于：查找、遍历和状态更新都可以直接通过字典操作完成，无需递归遍历树结构。

### 2.3 状态管理：Zustand Store

三个独立 store 分别管理不同维度的状态：

| Store | 作用域 | 职责 |
|-------|--------|------|
| `useScene` | `@pascal-app/core` | 节点 CRUD、脏标记、IndexedDB 持久化、撤销/重做 |
| `useViewer` | `@pascal-app/viewer` | 当前选中楼层、楼层显示模式、相机状态 |
| `useEditor` | `apps/editor` | 激活工具、面板状态、层级可见性 |

核心场景状态通过 `useScene` 管理：

```typescript
// 在 React 组件中订阅状态
const nodes = useScene((state) => state.nodes)

// 在非 React 上下文中直接访问
const wallNode = useScene.getState().nodes[wallId]

// 更新节点，自动触发脏标记
useScene.getState().updateNode(wallId, { thickness: 0.2 })
// → wallId 被加入 dirtyNodes → WallSystem 下一帧重新生成几何
```

Store 中间件：
- **Persist**：将场景数据序列化写入 IndexedDB，刷新页面后自动恢复
- **Temporal（Zundo）**：记录状态快照，实现 50 步撤销/重做

### 2.4 场景注册表：桥接数据与渲染

`sceneRegistry` 是连接节点数据与 Three.js 对象的桥梁：

```typescript
sceneRegistry = {
  nodes: Map<id, Object3D>,     // 节点 ID → Three.js 对象
  byType: {
    wall: Set<id>,
    item: Set<id>,
    zone: Set<id>,
    // ...
  }
}
```

渲染器通过 `useRegistry` hook 注册自己的 Three.js 对象引用：

```tsx
const WallRenderer = ({ node }) => {
  const ref = useRef<Mesh>(null!)
  // 将此 mesh 注册到 sceneRegistry
  useRegistry(node.id, 'wall', ref)

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0, 0, 0]} /> {/* 由 WallSystem 替换 */}
      <meshStandardMaterial />
    </mesh>
  )
}
```

这样做的好处是：几何系统可以直接通过 `sceneRegistry.nodes.get(id)` 获取到对应的 Three.js 对象，无需在场景图中遍历查找。

### 2.5 几何系统：Dirty Flag 模式

几何更新采用 **Dirty Flag** 模式，在 `useFrame` 中统一处理：

```typescript
useFrame(() => {
  for (const id of dirtyNodes) {
    const obj = sceneRegistry.nodes.get(id)
    const node = useScene.getState().nodes[id]
    updateGeometry(obj, node)
    dirtyNodes.delete(id)
  }
})
```

当 `useScene.getState().updateNode()` 被调用时，节点自动被标记为脏——无需手动干预。核心系统包括：

- **WallSystem**：生成墙体几何，支持檐口（mitering）和门洞/窗洞的 CSG 切割
- **SlabSystem**：从多边形数据生成楼板几何
- **CeilingSystem** / **RoofSystem**：天花板和屋顶生成
- **ItemSystem**：将门、窗、灯具等放置在墙面、楼板或天花板上
- **LevelSystem**：管理楼层的垂直定位和可见性
- **ScanSystem** / **GuideSystem**：控制 3D 扫描参考和 2D 导引图的显示

### 2.6 事件总线：组件间通信

使用 typed mitt 实现跨组件事件通信：

```typescript
// 节点事件
emitter.on('wall:click', (event) => {
  event.stopPropagation()  // 阻止冒泡
  // ...
})

// 事件 payload 结构
NodeEvent {
  node: AnyNode
  position: [x, y, z]
  localPosition: [x, y, z]
  normal?: [x, y, z]
  stopPropagation: () => void
}
```

空间网格管理器（`spatialGridManager`）负责放置验证：

```typescript
// 验证物品在楼板上的放置
spatialGridManager.canPlaceOnFloor(levelId, position, dimensions, rotation)
spatialGridManager.canPlaceOnWall(wallId, t, height, dimensions)
```

### 2.7 插件系统

Pascal Editor 的插件通过统一的 `Plugin` manifest 定义节点、工具和面板，无需区分"内部 API"和"外部 API"：

```typescript
// 插件结构（伪代码）
Plugin {
  nodes: NodeDefinition[]       // 新增节点类型
  tools: Tool[]                 // 新增编辑工具
  panels: Panel[]              // 新增侧边栏面板
  onMount: () => void           // 挂载生命周期
}
```

官方示例插件 [plugin-trees](https://github.com/pascalorg/plugin-trees) 演示了程序化树木、花草和预设面板的开发方式。

## 三、安装与快速开始

### 环境要求

- **Node.js** >= 18
- **Bun**（推荐，v1.3.0）或 npm/yarn
- 现代浏览器（Chrome/Edge 112+ 支持 WebGPU）

### 方式一：直接使用编辑器

```bash
git clone https://github.com/pascalorg/editor.git
cd editor
bun install
bun dev
```

然后打开 http://localhost:3002 即可看到编辑器界面。

> ⚠️ **重要**：必须从根目录运行 `bun dev`，这样 Turbo 才能同时监听所有包的变更并触发热更新。

### 方式二：在自己的项目中集成 Viewer

```bash
npm install @pascal-app/core @pascal-app/viewer @pascal-app/nodes
```

```tsx
import { loadPlugin } from '@pascal-app/core'
import { builtinPlugin } from '@pascal-app/nodes'
import { Viewer } from '@pascal-app/viewer'
import '@pascal-app/viewer/styles.css'

await loadPlugin(builtinPlugin)

export default function App() {
  return <Viewer />
}
```

### 发布自己的 npm 包

```bash
turbo build --filter=@pascal-app/core --filter=@pascal-app/viewer

npm publish --workspace=@pascal-app/core --access public
npm publish --workspace=@pascal-app/viewer --access public
```

## 四、使用方法与实战

### 4.1 基础操作

- **选择工具（SelectTool）**：点击场景中的节点进行选择，支持 Site → Building → Level → Zone → Items 的层级导航
- **画墙工具（WallTool）**：在楼层内绘制墙体，自动处理墙体间的交角
- **区域工具（ZoneTool）**：创建区域（Zone），用于空间分组和语义标注
- **物品工具（ItemTool）**：从预设库中选择门、窗、家具等放置到墙面或楼板上
- **楼板工具（SlabTool）**：绘制楼板多边形

### 4.2 楼层显示模式

通过 `useViewer` store 控制楼层显示方式：

```typescript
// 堆叠模式（默认）：所有楼层垂直堆叠显示
useViewer.getState().setLevelDisplayMode('stacked')

// 爆炸模式：楼层之间拉开间距，方便查看层间结构
useViewer.getState().setLevelDisplayMode('exploded')

// 独立模式：仅显示当前选中楼层
useViewer.getState().setLevelDisplayMode('solo')
```

### 4.3 层级导航

点击场景中的建筑、楼层或区域进行导航选中：

```typescript
// 选中某个楼层
useViewer.getState().setSelection({
  levelId: 'level_abc123',
  buildingId: 'building_xyz'
})
```

### 4.4 开发自定义插件

参考 [官方插件开发文档](https://editor.pascal.app/docs/developers/plugins)，主要步骤：

1. 创建新的 npm 包或独立仓库
2. 实现 `Plugin` manifest，定义节点、工具和面板
3. 通过编辑器的插件加载 API 注册
4. 参考 [plugin-trees](https://github.com/pascalorg/plugin-trees) 作为起点

## 五、常见问题与解决方案

**Q: 浏览器不支持 WebGPU，报错 "WebGPU is not supported"**

确保使用 Chrome 113+、Edge 113+ 或 Firefox Nightly，并确认系统层面 GPU 驱动已更新。在编辑器中会自动降级到 WebGL2，但部分高级渲染特性将不可用。

**Q: `bun dev` 启动后编辑器空白**

检查 `.env` 文件是否包含必要的环境变量。编辑器依赖 `NEXT_PUBLIC_*` 变量。确认端口 3002 未被占用：`lsof -i :3002`。

**Q: 门/窗无法正确切割墙体**

WallSystem 的 CSG 切割依赖 `three-bvh-csg`，确保 `node_modules` 中的版本与 overrides 配置一致。门/窗物品必须作为 Wall 节点的子节点才能触发切割逻辑。

**Q: 场景数据丢失**

`useScene` store 默认持久化到 IndexedDB。如果在 `metadata` 中标记 `{ isTransient: true }`，该节点不会被持久化——确认重要节点没有此标记。

**Q: 热更新不生效**

删除缓存后重新启动：`bun clean:cache && bun dev`。确保从 monorepo 根目录运行而非子包目录。

**Q: npm publish 报错 " unauthorized"**

确认已登录 npm：`npm login`，并确保包名在 npm 上未被占用。发布 scoped 包（`@pascal-app/xxx`）需要组织权限。

## 六、总结

Pascal Editor 的架构设计非常值得学习：它通过**扁平节点 + Zustand store + 脏标记帧循环**的三层分离，实现了数据管理与渲染的解耦；通过 **viewer/editor 分层包**，做到了"展示"与"编辑"能力的按需复用；通过 **统一的 Plugin API**，建立了开放的生态扩展路径。

对于前端开发者而言，它可以作为 React + Three.js 大型 3D 应用架构的参考范例；对于建筑/BIM 领域的开发者，它提供了一条低门槛的 Web 端 3D 编辑器构建路径。项目完全开源（MIT），且已有 npm 包生态，集成到现有项目中并非难事。

GitHub：https://github.com/pascalorg/editor
