---
title: "Manim：用代码编织数学之美的动画引擎"
date: 2026-08-12
description: "Manim 是 3Blue1Brown 作者 Grant Sanderson 开源的精确编程动画引擎，专注数学可视化，助你用代码生成电影级数学解说视频。"
author: "Cheman"
slug: manim
draft: false
categories: [技术, 开源]
tags: [GitHub, Python, 数学可视化, 动画引擎, 开源]
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

今天在 GitHub Trending 上看到一个有意思的项目：**Manim**，它是 3Blue1Brown（3蓝1棕）频道作者 Grant Sanderson 开源的精确编程动画引擎，专注数学可视化，一行代码就能生成高质量数学动画视频。

## 一、项目概述

Manim 最初是 Grant Sanderson 为制作 3Blue1Brown 视频而开发的内部工具，后来逐步开源，成为数学教育可视化领域最受欢迎的开源项目之一。目前该仓库维护的是 **ManimGL** 版本（3b1b 原版），另有社区维护的 Manim Community 分支，两者在稳定性和功能方向上各有侧重。

核心特性：
- **精确控制**：所有动画、图形对象均可精确编程，不依赖 GUI 拖拽
- **LaTeX 支持**：内置对 LaTeX 公式的渲染，可直接在动画中使用复杂数学表达式
- **Pythonic API**：面向对象的场景描述，代码即剧本，可版本化管理
- **多坐标系统**：支持平面坐标系（NumberPlane）、复平面（ComplexPlane）、3D 坐标系（ThreeDAxes）等
- **帧级动画控制**：每一帧的渲染逻辑完全可控，支持自定义插值函数
- **Python 3.10+**，跨平台（Linux/macOS/Windows），MIT 许可证

## 二、技术原理

### 2.1 场景与对象模型

Manim 的核心是 `Scene` 类，所有动画场景都继承自它。每个场景通过 `construct` 方法定义动画序列，对象则以 `Mobject`（Math Object）为基类构建。

```python
from manimlib import *

class OpeningManimExample(Scene):
    def construct(self):
        intro_words = Text("""
            The original motivation for manim was to
            better illustrate mathematical functions
            as transformations.
        """)
        intro_words.to_edge(UP)
        self.play(Write(intro_words))
        self.wait(2)
```

这里 `Text` 是 `Mobject` 的子类，`Write` 是动画指令，告知 Manim「以写字的方式逐字符显示这段文字」。

### 2.2 坐标变换与矩阵动画

Manim 最强大的能力之一是对坐标空间进行矩阵变换并动画化。在 example_scenes.py 中，线性代数与动画的结合令人叹为观止：

```python
grid = NumberPlane((-10, 10), (-5, 5))
matrix = [[1, 1], [0, 1]]
self.play(
    ShowCreation(grid),
    FadeTransform(intro_words, linear_transform_words)
)
self.wait()
self.play(grid.animate.apply_matrix(matrix), run_time=3)
```

`NumberPlane` 绘制坐标系网格，`apply_matrix(matrix)` 对整个平面应用剪切矩阵 `[1,1; 0,1]`，整个变换过程以 3 秒动画呈现——这正是 3Blue1Brown 视频中常见的手法。

### 2.3 函数图像与追踪器

Manim 支持任意函数的图像绘制，并可通过 `ValueTracker` 实现参数动画：

```python
axes = Axes((-3, 10), (-1, 8), height=6)
axes.add_coordinate_labels()
parabola = axes.get_graph(lambda x: 0.25 * x**2)

x_tracker = ValueTracker(2)
dot = Dot(fill_color=RED)
dot.move_to(axes.i2gp(x_tracker.get_value(), parabola))
dot.add_updater(lambda d: d.move_to(axes.i2gp(x_tracker.get_value(), parabola)))
self.play(x_tracker.animate.set_value(4), run_time=3)
```

`add_updater` 在每一帧自动更新点位置，实现「点沿抛物线运动」的流畅动画。

### 2.4 隐函数与特殊图形

除了显式函数，Manim 还支持隐函数绘制和特殊图形对象：

```python
def func(x, y):
    xa, ya = axes.point_to_coords(np.array([x, y, 0]))
    return xa**4 + ya**4 - 4

new_curve = ImplicitFunction(func)
```

### 2.5 3D 场景与光照系统

ManimGL 内置 3D 场景支持，可以渲染曲面、球面、圆环体等三维对象，并支持自定义光源位置：

```python
class SurfaceExample(ThreeDScene):
    def construct(self):
        torus1 = Torus(r1=1, r2=1)
        sphere = Sphere(radius=3)
        surface = TexturedSurface(surface, day_texture, night_texture)
        self.play(FadeIn(surface), ShowCreation(surface.mesh, lag_ratio=0.01, run_time=3))
```

### 2.6 TransformMatchingStrings 智能变换

Manim 的 `TransformMatchingStrings` 可以智能识别两个表达式中相同的子字符串，仅变换不同部分，是做数学推导动画的利器：

```python
lines = VGroup(
    Tex("A^2 + B^2 = C^2"),
    Tex("A^2 = C^2 - B^2"),
    Tex("A^2 = (C + B)(C - B)"),
    Tex(R"A = \sqrt{(C + B)(C - B)}"),
)
self.play(TransformMatchingStrings(
    lines[0].copy(), lines[1],
    matched_keys=["A^2", "B^2", "C^2"],
    key_map={"+": "-"},
    path_arc=90 * DEG,
))
```

## 三、安装与快速开始

### 3.1 环境要求

- Python 3.10 及以上
- FFmpeg（视频编码）
- OpenGL（图形渲染）
- LaTeX（可选，渲染数学公式）
- macOS 需安装：`brew install ffmpeg mactex`

### 3.2 安装 ManimGL（3b1b 原版）

```bash
# 安装 manimgl（注意包名是 manimgl，不是 manim）
pip install manimgl

# 或从源码安装
git clone https://github.com/3b1b/manim.git
cd manim
pip install -e .

# 运行示例
manimgl example_scenes.py OpeningManimExample
```

### 3.3 常用命令行参数

- `-w`：将动画写入视频文件
- `-o`：写完视频后自动打开
- `-s`：跳过动画，直接渲染最后一帧图像
- `-so`：保存最终帧为图片并打开
- `-n <number>`：跳过前 n 个动画，直接从指定处开始
- `-f`：全屏播放

### 3.4 自定义配置

在运行目录创建 `custom_config.yml`，可自定义输出路径、视频质量、样式主题等：

```yaml
# 参考 3b1b/videos 仓库中的配置
output_dir: ./videos
pixel_height: 1080
frame_rate: 60
```

## 四、使用方法与实战

### 4.1 第一个场景：Hello Math

```python
from manimlib import *

class HelloMath(Scene):
    def construct(self):
        formula = Tex(R"e^{\pi i} = -1")
        formula.set_width(FRAME_WIDTH - 1)
        self.play(Write(formula))
        self.wait(2)
```

运行：`manimgl -ow hello_math.py HelloMath`，自动生成并打开视频。

### 4.2 交互式开发

Manim 提供嵌入式 IPython 终端，便于边写边调试：

```python
class InteractiveDevelopment(Scene):
    def construct(self):
        circle = Circle()
        circle.set_fill(BLUE, opacity=0.5)
        self.play(ShowCreation(square))
        self.embed()  # 运行时暂停，进入交互终端
```

在交互终端中可直接调用 `play`、`add`、`wait` 等命令，修改参数后继续播放。

### 4.3 UI 控件与交互动画

Manim 支持文本框、复选框、颜色选择器等 UI 控件，实现真正的交互动画：

```python
class ControlsExample(Scene):
    drag_to_pan = False

    def setup(self):
        self.textbox = Textbox()
        self.checkbox = Checkbox()
        self.color_picker = ColorSliders()
        self.panel = ControlPanel(...)
        self.add(self.panel)
```

### 4.4 在 3Blue1Brown 视频中学习

最深入的学习资源就是 [3b1b/videos](https://github.com/3b1b/videos) 仓库——里面包含几乎所有 3Blue1Brown 视频的源代码，涵盖线性代数、微积分、概率论、神经网络等各个领域的动画实现。

## 五、常见问题与解决方案

**Q1：安装 manimgl 后运行报 `No module named 'manimlib'`？**
注意包名是 `manimgl`，而非 `manim` 或 `manimlib`。正确安装命令：`pip install manimgl`。如果你想安装社区版，请搜索 `manim`（不带 gl 后缀）。

**Q2：LaTeX 公式渲染失败，显示方块或乱码？**
确保系统已安装完整 LaTeX 发行版（macOS：`brew install mactex`，Linux：`sudo apt install texlive-full`，Windows：安装 MiKTeX）。同时检查 `fc-list` 字体列表中是否有数学字体。

**Q3：渲染视频卡顿或内存不足？**
降低帧率：在配置文件中设置 `"frame_rate": 30`。对于复杂 3D 场景，可减少曲面分辨率参数。必要时在代码中显式设置 `resolution`。

**Q4：Windows 上 OpenGL 报错？**
确保显卡驱动为最新，安装 [glew](https://glew.sourceforge.net/) 和 [glfw](https://www.glfw.org/) 的 Windows 版本。Anaconda 用户建议在 conda 环境中安装。

**Q5：manimgl 和 manim community 该选哪个？**
如果你是 3Blue1Brown 的忠实粉丝、想要复现其视频风格，选 **ManimGL**。如果你是贡献者、追求稳定性和测试覆盖，选 **Manim Community**（社区版对新手更友好）。

## 六、总结

Manim 将数学的精确性与动画的艺术性完美融合，用代码取代传统视频编辑，让数学可视化拥有了版本控制的能力。无论是教育工作者制作课件、独立创作者做数学科普视频，还是研究者展示算法动态，Manim 都是一个值得深入学习的工具。当前版本 1.7.2 已相当成熟，结合 FFmpeg 的高效编码和 LaTeX 的公式渲染，零基础也能在几个小时内完成一个高质量数学动画。

> 工具的价值不仅在于降低门槛，更在于激发创造欲。如果你曾被 3Blue1Brown 的视频震撼过，不妨亲手用 Manim 做一期属于自己的数学动画——你会发现，数学之美，从未如此生动。
