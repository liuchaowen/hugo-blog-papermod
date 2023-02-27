---
title: "Flutter3新特性学习"
date: 2022-12-26T16:59:05+08:00
draft: false
categories: ["技术"]
tags: ["flutter","dev","新特性"]
description: 粗略地看看flutter3.0版本有什么新特性
author: "Chao"
showToc: true
TocOpen: false
hidemeta: false
comments: false
canonicalURL: "https://canonical.url/to/page"
disableHLJS: true # to disable highlightjs
disableShare: false
disableHLJS: false
hideSummary: false
searchHidden: true
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
---
## 新特性

### 平台支持

旧版本除了传统的Android与iOS，还有web端与windows平台，

现又增加了对 macOS 和 Linux 应用的稳定支持，真正的一套代码，六端运行。

### Superlist

一个崭新的应用将列表、任务和自由形式的内容结合在一起，将待办事项和个人计划等功能打磨得焕然一新。

### Material Design 3

自适应性强、跨平台的设计系统，包括其动态颜色方案和经过更新的视觉组件

### Dart语言

枚举支持成员变量、改进的超类参数继承，以及更为灵活的命名参数相关的新的语言特性

### lint 规则

`package:lints` 开启了 2.x 版本，这是一套官方的 lint 规则，是根据我们总结的 Dart 最佳实践整合而成的一个 lint 规则集。

### 指令集与原生交互

使用 `dart:ffi` 与原生平台进行 C 语言的互操作、对 RISC-V 指令集提供实验性支持，以及对 macOS 和 Windows 可执行文件的签名支持

### Firebase

谷歌亲儿子。构建、发布和运营自己的应用，包括认证、数据存储、崩溃信息收集、云端功能和设备测试等服务。包括 [Sentry](https://docs.sentry.io/platforms/flutter/ "Sentry 文档: Flutter 平台集成")、[AppWrite](https://appwrite.io/docs/getting-started-for-flutter "AppWrite 文档: 在 Appwrite 平台中使用 Flutter") 、[Crashlytics](https://firebase.google.cn/docs/crashlytics "Firebase Crashlytics 产品主页") 和 [AWS Amplify](https://docs.amplify.aws/start/q/integration/flutter/ "AWS Amplify 文档: Flutter 集成")。

### Flutter 休闲游戏工具包

Flame 开源游戏引擎。[Flutter 休闲游戏工具包](https://flutter.dev/games "Flutter 休闲游戏工具包") (Casual Game Toolkit)，它提供了模板、最佳实践入门套件，还为您准备了可用于广告和云服务的赞助额度。

## 开发学习

### `Context`上下文

```dart
final studentState = StudentState.of(context);
```

调用 `of(context)` 会根据当前构建的上下文（即当前 widget 位置的句柄），并返回类型为 `StudentState` 的 [在树中距离最近的祖先节点](https://api.flutter-io.cn/flutter/flutter/widgets/BuildContext/dependOnInheritedWidgetOfExactType.html)。更深层级的 widget 便可以使用 `.of()` 方法来查找相关的主题数据, 如主题：

```dart
Theme.of(context).textTheme.headline1
```

### 渲染和布局

编写绘制的内容时，你需要调用 Android 框架的 Java 代码。 Android 的系统库提供了可以将自身绘制到 Canvas 对象的组件，接下来 Android 就可以使用由 C/C++ 编写的 [Skia](https://skia.org/) 图像引擎，调用 CPU 和 GPU 完成在设备上的绘制在渲染树中，

每个节点的基类都是 [`RenderObject`](https://api.flutter-io.cn/flutter/rendering/RenderObject-class.html)，该基类为布局和绘制定义了一个抽象模型。这是再平凡不过的事情：它并不总是一个固定的大小，甚至不遵循笛卡尔坐标规律（根据该 [极坐标系的示例](https://dartpad.cn/?id=0f020197a5d4c980342d5c7d9e935cee&null_safety=true) 所示）。每一个 `RenderObject` 都了解其父节点的信息，但对于其子节点，除了如何 **访问** 和获得他们的布局约束，并没有更多的信息。这样的设计让 `RenderObject` 拥有高效的抽象能力，能够处理各种各样的使用场景

### 平台通道

![How platform channels allow Flutter to communicate with host
code](https://flutter.cn/docs/assets/images/docs/arch-overview/platform-channels.png)

### WEB支持

Flutter 在 Web 平台上以浏览器的标准 API 重新实现了引擎。目前我们有两种在 Web 上呈现内容的选项：HTML 和 WebGL。在 HTML 模式下，Flutter 使用 HTML、CSS、Canvas 和 SVG 进行渲染。而在 WebGL 模式下，Flutter 使用了一个编译为 WebAssembly 的 Skia 版本，名为 [CanvasKit](https://skia.org/user/modules/canvaskit)。

![Flutter web
architecture](https://flutter.cn/docs/assets/images/docs/arch-overview/web-arch.png)

Web 版本的 Flutter 使用支持增量编译的编译器 [`dartdevc`](https://dart.cn/tools/dartdevc) 进行编译，以支持应用热重启（尽管目前尚未支持热重载）。相反，当你准备好创建一个生产环境的 Web 应用时，Dart 深度优化的编译器 [`dart2js`](https://dart.cn/tools/dart2js) 将会用于编译，将 Flutter 核心框架和你的应用打包至缩小的源文件中，可部署在任何服务器上
