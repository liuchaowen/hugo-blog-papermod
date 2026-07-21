---
title: "text-to-cad：AI驱动的CAD与机器人设计技能库"
date: 2026-07-21
description: "text-to-cad是一个开源的AI Agent技能库,专注于CAD模型生成、机器人描述文件创建和硬件设计自动化。支持STEP/STL/3MF导出、URDF/SDF/SRDF机器人文件生成、G-code切片和3D打印集成，让AI Agent能够从自然语言生成工程级CAD模型和机器人描述。"
author: "Cheman"
slug: text-to-cad
draft: false
categories: ["技术", "开源", "AI", "机器人"]
tags: ["GitHub", "开源", "CAD", "机器人", "AI Agent", "3D打印"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**text-to-cad**，一个专注于CAD、机器人和硬件设计的AI Agent技能库，能够将自然语言转化为工程级CAD模型和机器人描述文件。

## 一、项目概述

text-to-cad是一个开源的技能库，为AI Agent提供了一套完整的工具链，用于生成、检查、采购、切片和交接CAD及机器人描述工件。该项目的核心价值在于让AI Agent能够理解工程需求并输出标准化的工程文件，从而实现从概念设计到制造准备的自动化流程。

**核心特性：**

- **CAD模型生成**：从自然语言或图片请求创建和编辑CAD模型，输出STEP、STL、3MF、GLB等标准格式
- **机器人描述文件**：生成URDF（机器人结构）、SRDF（MoveIt规划配置）、SDF（仿真模型）等机器人标准文件
- **CAD浏览器预览**：本地浏览器预览CAD、G-code和机器人文件
- **零部件采购**：查找标准件STEP模型（螺丝、轴承、电机、连接器等）
- **切片与3D打印**：将网格文件切片为FDM G-code，支持Bambu Lab打印机集成
- **制造准备**：SendCutSend文件检查和上传准备

## 二、技术原理

### 2.1 架构设计

项目采用**模块化技能库架构**，每个技能独立实现特定工作流，支持按需安装和组合使用。核心架构包括：

- **技能层（Skills Layer）**：独立的Python模块，每个技能封装特定工作流
- **插件适配层（Plugin Adapter）**：支持Codex、Claude Code等主流AI Agent框架
- **渲染引擎（Rendering Engine）**：基于浏览器的CAD几何预览和隐式CAD建模
- **文件转换层（File Conversion）**：支持STEP、STL、3MF、GLB、DXF等多种格式的导出

```python
# 从项目结构可以看到模块化设计
skills/
├── cad/                  # CAD模型生成
├── cad-viewer/           # CAD浏览器预览
├── step-parts/           # 标准件查找
├── dxf/                  # 2D DXF绘图
├── urdf/                 # 机器人结构文件
├── srdf/                 # MoveIt规划配置
├── sdf/                  # 仿真模型
├── sendcutsend/          # 制造准备
├── gcode/                # G-code切片
├── bambu-labs/           # 3D打印集成
└── implicit-cad/         # 隐式CAD建模
```

### 2.2 CAD技能核心实现

CAD技能是项目的核心，使用Python构建，基于CadQuery几何内核实现参数化建模。核心设计理念：

1. **自然语言解析**：将用户描述转换为几何参数和操作序列
2. **参数化建模**：使用CadQuery的Python API构建可编辑的参数化模型
3. **多格式导出**：支持STEP（工程标准）、STL（3D打印）、3MF（增材制造）、GLB（Web展示）

```python
# 示例：从自然语言到CAD模型的转换流程
import cadquery as cq

# 用户请求："创建一个100x60x20mm的矩形块，四角有8mm通孔"
result = (
    cq.Workplane("XY")
    .box(100, 60, 20, centered=True)
    .faces(">Z")
    .workplane()
    .rect(80, 40, forConstruction=True)
    .vertices()
    .hole(8)
)

# 导出STEP格式（工程标准）
result.val().exportStep("rectangular_block.step")
```

### 2.3 机器人描述文件生成

机器人技能模块支持生成三种标准机器人描述格式：

- **URDF（Unified Robot Description Format）**：描述机器人连杆、关节、惯性、网格模型
- **SRDF（Semantic Robot Description Format）**：定义MoveIt规划组、末端执行器、姿态、碰撞规则
- **SDF（Simulation Description Format）**：创建仿真模型和世界，包含坐标系、物理、传感器、光源

```xml
<!-- URDF示例：机器人连杆和关节定义 -->
<link name="base_link">
  <visual>
    <geometry>
      <mesh filename="base.stl"/>
    </geometry>
  </visual>
  <inertial>
    <mass value="10.0"/>
    <inertia ixx="0.1" ixy="0" ixz="0" iyy="0.1" iyz="0" izz="0.1"/>
  </inertial>
</link>

<joint name="shoulder_pan_joint" type="revolute">
  <parent link="base_link"/>
  <child link="shoulder_link"/>
  <limit lower="-3.14" upper="3.14" effort="100" velocity="1.0"/>
</joint>
```

### 2.4 G-code切片与3D打印集成

G-code技能使用真实切片器CLI（如PrusaSlicer、Cura）将网格文件转换为打印就绪的G-code：

```bash
# 切片流程
python3 skills/gcode/skill.py \
  --input model.stl \
  --profile prusa_mk3s \
  --output print.gcode
```

Bambu Labs技能进一步集成了Bambu Lab打印机：

- 干运行（dry-run）验证G-code
- 上传到打印机
- 谨慎启动本地打印任务

## 三、安装与快速开始

### 3.1 环境要求

- **Python 3.11+**
- **Node.js**（用于Skills CLI安装）
- **Git**（克隆仓库）
- **可选**：PrusaSlicer/Cura（G-code切片）、Bambu Lab打印机（3D打印集成）

### 3.2 安装方式

**方式一：Skills CLI安装（推荐）**

```bash
# 使用npx安装CAD技能
npx skills install earthtojake/text-to-cad
```

**方式二：Codex插件安装**

```bash
codex plugin marketplace add earthtojake/text-to-cad
codex plugin add cad@text-to-cad
```

**方式三：Claude Code插件安装**

```bash
claude plugin marketplace add earthtojake/text-to-cad
claude plugin install cad@text-to-cad
```

**方式四：克隆仓库开发**

```bash
git clone https://github.com/earthtojake/text-to-cad.git
cd text-to-cad
# 切换到develop分支进行开发
git checkout develop
```

### 3.3 快速验证

安装后重启AI Agent，验证技能是否加载：

```bash
# 查看已安装技能
npx skills list
```

## 四、使用方法与实战

### 4.1 CAD模型生成

**场景：从自然语言生成校准块**

```python
# 用户描述："创建一个100x60x20mm的矩形校准块，四角有8mm垂直通孔，顶部外边缘倒角2mm"

# AI Agent调用CAD技能
result = (
    cq.Workplane("XY")
    .box(100, 60, 20, centered=True)
    .faces(">Z")
    .workplane()
    .rect(80, 40, forConstruction=True)
    .vertices()
    .hole(8)
    .faces(">Z")
    .edges("NOT |Z")
    .chamfer(2)
)

# 导出多种格式
result.val().exportStep("calibration_block.step")  # 工程CAD
result.val().exportStl("calibration_block.stl")   # 3D打印
```

**场景：从图片生成CAD模型**

AI Agent可以识别技术图纸或产品照片，提取几何特征并生成对应的CAD模型：

```python
# 用户上传：产品截图或技术图纸
# Agent处理：
# 1. 图像识别提取关键尺寸和特征
# 2. 生成参数化CadQuery代码
# 3. 导出STEP文件供后续工程流程使用
```

### 4.2 机器人描述文件实战

**场景：创建6轴机械臂URDF**

```xml
<!-- AI Agent生成URDF结构 -->
<robot name="6dof_arm">
  <!-- 基座 -->
  <link name="base_link">...</link>
  
  <!-- 肩部 -->
  <link name="shoulder_link">...</link>
  <joint name="shoulder_pan_joint" type="revolute">
    <parent link="base_link"/>
    <child link="shoulder_link"/>
    <limit lower="-180" upper="180" effort="150" velocity="2.0"/>
  </joint>
  
  <!-- 肘部 -->
  <link name="elbow_link">...</link>
  <joint name="elbow_joint" type="revolute">
    <parent link="shoulder_link"/>
    <child link="elbow_link"/>
    <limit lower="-135" upper="135" effort="150" velocity="2.0"/>
  </joint>
  
  <!-- 末端执行器 -->
  <link name="end_effector">...</link>
</robot>
```

**场景：为URDF添加MoveIt规划配置**

```xml
<!-- SRDF示例 -->
<robot name="6dof_arm">
  <!-- 规划组 -->
  <group name="arm">
    <chain base_link="base_link" tip_link="end_effector"/>
  </group>
  
  <!-- 末端执行器 -->
  <end_effector name="gripper" parent_link="end_effector" group="gripper"/>
  
  <!-- 预定义姿态 -->
  <group_state name="home" group="arm">
    <joint name="shoulder_pan_joint" value="0"/>
    <joint name="elbow_joint" value="0"/>
  </group_state>
  
  <!-- 碰撞规则 -->
  <disable_collisions link1="base_link" link2="shoulder_link" reason="adjacent"/>
</robot>
```

### 4.3 标准件采购

**场景：查找标准螺丝和轴承**

```python
# 使用step.parts技能查找标准件
from skills.step_parts import search_parts

# 查找M4螺丝
screws = search_parts(
    category="screws",
    specifications={
        "thread": "M4",
        "length": "20mm"
    }
)

# 返回可用的STEP模型链接和供应商信息
```

### 4.4 切片与3D打印

**场景：将CAD模型切片并打印**

```bash
# 步骤1：导出STL
result.val().exportStl("part.stl")

# 步骤2：切片
python3 skills/gcode/skill.py \
  --input part.stl \
  --profile bambu_x1c \
  --output part.gcode

# 步骤3：验证G-code
python3 skills/bambu-labs/skill.py \
  --action dry-run \
  --gcode part.gcode

# 步骤4：上传并打印
python3 skills/bambu-labs/skill.py \
  --action upload \
  --gcode part.gcode
```

## 五、常见问题与解决方案

### 5.1 安装问题

**Q: 技能安装后Agent未识别**

A: 安装后需要重启AI Agent。如果仍未识别，检查安装路径是否正确：

```bash
# 验证技能文件
ls -la ~/.skills/earthtojake/text-to-cad/

# 重新安装
npx skills install earthtojake/text-to-cad --force
```

**Q: Python版本不兼容**

A: 项目要求Python 3.11+，使用pyenv或conda管理版本：

```bash
# 使用pyenv安装Python 3.11
pyenv install 3.11.0
pyenv global 3.11.0
```

### 5.2 CAD生成问题

**Q: 生成的STEP文件在CAD软件中打开失败**

A: STEP文件依赖CadQuery几何内核，确保导出前模型有效：

```python
# 验证模型有效性
result.val().isValid()  # 返回True/False

# 检查几何体
result.val().Shape().check()
```

**Q: 复杂几何生成失败**

A: 复杂模型可能需要分步构建，避免一次性生成：

```python
# 错误：一次性构建所有特征
result = cq.Workplane("XY").box(100,60,20).hole(8).fillet(5).chamfer(2)

# 正确：分步构建并验证
result = cq.Workplane("XY").box(100,60,20)
result = result.faces(">Z").workplane().hole(8)
result = result.edges(">Z").fillet(5)
```

### 5.3 机器人描述文件问题

**Q: URDF在ROS中加载失败**

A: 检查坐标系定义和网格文件路径：

```xml
<!-- 确保网格文件路径正确 -->
<mesh filename="package://my_robot/meshes/base.stl"/>

<!-- 检查惯性参数是否合理 -->
<inertial>
  <mass value="1.0"/>  <!-- 质量必须为正 -->
  <inertia ixx="0.1" ixy="0" ixz="0" iyy="0.1" iyz="0" izz="0.1"/>  <!-- 惯性矩阵必须正定 -->
</inertial>
```

**Q: MoveIt规划失败**

A: 检查SRDF中的碰撞规则和规划组定义：

```bash
# 使用MoveIt Setup Assistant验证配置
roslaunch moveit_setup_assistant setup_assistant.launch
```

### 5.4 3D打印问题

**Q: G-code切片质量差**

A: 调整切片参数和打印机配置：

```bash
# 使用自定义切片配置
python3 skills/gcode/skill.py \
  --input model.stl \
  --profile custom \
  --config my_slicer_config.ini \
  --output print.gcode
```

**Q: Bambu Lab打印机连接失败**

A: 确保打印机网络配置正确，IP地址可达：

```bash
# 测试连接
ping <printer_ip>

# 检查Bambu Lab API配置
export BAMBU_API_KEY="your_api_key"
export BAMBU_PRINTER_IP="192.168.1.100"
```

## 六、总结

text-to-cad代表了AI Agent在工程设计和制造领域的重要突破。通过将自然语言理解、参数化建模、机器人描述文件生成和制造准备整合到一个统一的技能库中，该项目让AI Agent能够真正参与到工程设计的核心流程中。

**项目核心价值：**

1. **降低工程门槛**：设计师和工程师可以用自然语言描述需求，AI生成标准工程文件
2. **加速迭代周期**：从概念到CAD模型到G-code，全流程自动化
3. **机器人开发利器**：URDF/SRDF/SDF自动化生成，大幅减少机器人开发工作量
4. **模块化扩展**：技能库架构支持按需安装和扩展

**适用场景：**

- 产品设计和原型开发
- 机器人建模和仿真
- 3D打印工作流自动化
- 硬件设计和制造准备

该项目采用MIT开源协议，代码托管在GitHub，文档完善，示例丰富，包含10个基准测试案例，是AI Agent工程化应用的优秀范例。无论是CAD工程师、机器人开发者还是AI Agent研究者，都能从中获得价值。

---

**项目地址**：https://github.com/earthtojake/text-to-cad  
**文档**：https://www.cadskills.xyz  
**在线演示**：https://demo.cadskills.xyz
