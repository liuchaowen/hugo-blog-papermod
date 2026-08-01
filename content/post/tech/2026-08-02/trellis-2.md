---
title: "微软 TRELLIS.2：基于 O-Voxel 原生结构化潜变量的图像到 3D 生成新范式"
date: 2026-08-02
description: "TRELLIS.2 是微软推出的 40 亿参数图像到 3D 生成模型，提出 O-Voxel 这一「无场」稀疏体素表示，以原生、紧凑的结构化潜变量突破传统 SDF/NeRF 的拓扑限制，支持开放表面、非流形几何与完整 PBR 材质，H100 上 512³ 资产生成仅需约 3 秒。"
author: "Cheman"
slug: trellis-2
draft: false
categories: [技术, 开源]
tags: [GitHub, 开源, AI, 3D生成, 微软, 深度学习]
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

今天在 GitHub Trending 上看到一个有意思的项目：**microsoft/TRELLIS.2**——一个 40 亿参数的 SOTA 图像到 3D 生成模型。它用一种叫 **O-Voxel** 的「无场」稀疏体素结构，把任意拓扑、带完整 PBR 材质的 3D 资产以原生、紧凑的方式生成出来，刷新了我们对 3D 生成效率与质量的认知。

## 一、项目概述

TRELLIS.2 是微软继初代 TRELLIS 之后的新一代大规模 3D 生成模型，核心定位是**高质量图像到 3D（image-to-3D）**。它在多个维度上做了关键升级：

- **高保真 + 高效率**：4B 参数模型借助 vanilla DiT（Diffusion Transformer），配合 16× 空间下采样的稀疏 3D VAE，在 H100 上即可实现极高分辨率的纹理化资产生成。
- **任意拓扑处理**：O-Voxel 表示打破了等值面场（iso-surface field）的限制，能够原生处理开放表面（如衣物、叶片）、非流形几何（non-manifold）以及内部封闭结构，无需有损转换。
- **丰富纹理建模**：不仅建模基础颜色，还同时建模 Base Color、Roughness、Metallic、Opacity 等表面属性，支持照片级渲染与透明材质。
- **极简处理**：数据处理无渲染、无优化，纹理化网格 ↔ O-Voxel 双向转换在单 CPU 上 < 10s，CUDA 上 < 100ms。

官方给出的性能基准（NVIDIA H100）非常亮眼：

| 分辨率 | 总耗时 | 拆分（形状 + 材质） |
| :--- | :--- | :--- |
| 512³ | ~3s | 2s + 1s |
| 1024³ | ~17s | 10s + 7s |
| 1536³ | ~60s | 35s + 25s |

## 二、技术原理

### O-Voxel：field-free 的稀疏体素结构

传统 3D 生成大多依赖 SDF（符号距离场）或 NeRF（神经辐射场）这类「场」表示，它们本质上是连续函数，处理开放表面、薄片、非流形结构时往往力不从心，且提取网格需要 Marching Cubes 等有损步骤。TRELLIS.2 提出的 **O-Voxel** 是一种**无场（field-free）的稀疏体素结构**，它直接以稀疏、紧凑的结构化潜变量表达几何与材质，从而在表示层面就规避了拓扑限制。

### 三阶段生成流程

模型并非一步到位，而是拆解为清晰的级联阶段。从 `example.py` 与 `app.py` 的采样参数即可看出这一结构：

```python
outputs, latents = pipeline.run(
    image,
    seed=seed,
    sparse_structure_sampler_params={
        "steps": ss_sampling_steps,
        "guidance_strength": ss_guidance_strength,
        "guidance_rescale": ss_guidance_rescale,
        "rescale_t": ss_rescale_t,
    },
    shape_slat_sampler_params={ ... },   # 形状结构化潜变量
    tex_slat_sampler_params={ ... },      # 材质结构化潜变量
    pipeline_type={"512": "512", "1024": "1024_cascade", "1536": "1536_cascade"}[resolution],
    return_latent=True,
)
```

1. **稀疏结构生成（Sparse Structure）**：先用图像条件生成粗略的稀疏体素结构，决定资产整体占据的空间布局。
2. **形状生成（Shape SLAT）**：在稀疏结构指引下，细化几何形状，支持非流形与开放表面。
3. **材质生成（Texture SLAT）**：为几何赋予 PBR 材质属性，输出完整纹理。

高分辨率（1024³/1536³）走的是 `cascade`（级联）流程，先低分辨率再级联细化，兼顾质量与显存。

### 核心支撑库

TRELLIS.2 建立在团队自研的几个高性能组件之上：

- **O-Voxel**：核心库，负责纹理化网格与 O-Voxel 表示之间的即时双向转换。
- **FlexGEMM**：基于 Triton 的高效稀疏卷积实现，加速稀疏体素结构的处理。
- **CuMesh**：CUDA 加速的网格工具，用于后处理、重网格化（remesh）、抽稀（decimation）与 UV 展开。

最终资产通过 `o_voxel.postprocess.to_glb` 导出为 GLB，并支持 WebP 纹理压缩：

```python
glb = o_voxel.postprocess.to_glb(
    vertices=mesh.vertices, faces=mesh.faces,
    attr_volume=mesh.attrs, coords=mesh.coords,
    attr_layout=mesh.layout, voxel_size=mesh.voxel_size,
    aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
    decimation_target=1000000, texture_size=4096,
    remesh=True, remesh_band=1, remesh_project=0, verbose=True,
)
glb.export("sample.glb", extension_webp=True)
```

## 三、安装与快速开始

### 环境要求

- **系统**：目前仅在 **Linux** 上测试。
- **硬件**：NVIDIA GPU，至少 **24GB** 显存（官方验证 A100 / H100）。
- **软件**：CUDA Toolkit（推荐 12.4）、Conda、Python 3.8+。

### 安装步骤

```sh
# 1. 克隆仓库（含子模块）
git clone -b main https://github.com/microsoft/TRELLIS.2.git --recursive
cd TRELLIS.2

# 2. 安装依赖（自动创建名为 trellis2 的 conda 环境）
. ./setup.sh --new-env --basic --flash-attn --nvdiffrast --nvdiffrec --cumesh --o-voxel --flexgemm
```

几点注意：

- `--new-env` 会新建 `trellis2` 环境；想用已有环境可去掉该 flag。
- 默认使用 `flash-attn` 注意力后端；不支持 flash-attn 的 GPU（如 V100）需手动安装 `xformers` 并设置 `ATTN_BACKEND=xformers`。
- 多 CUDA 版本共存时，需先 `export CUDA_HOME=/usr/local/cuda-12.4`。

预训练权重 **TRELLIS.2-4B** 已发布于 Hugging Face，直接 `from_pretrained` 即可加载，无需手动下载。

## 四、使用方法与实战

### 图像到 3D：最简示例

`example.py` 给出了最精简的调用方式——加载管线、送入图像、渲染视频、导出 GLB：

```python
import os
os.environ['OPENCV_IO_ENABLE_OPENEXR'] = '1'
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"  # 节省显存
import cv2, imageio
from PIL import Image
import torch
from trellis2.pipelines import Trellis2ImageTo3DPipeline
from trellis2.utils import render_utils
from trellis2.renderers import EnvMap
import o_voxel

envmap = EnvMap(torch.tensor(
    cv2.cvtColor(cv2.imread('assets/hdri/forest.exr', cv2.IMREAD_UNCHANGED), cv2.COLOR_BGR2RGB),
    dtype=torch.float32, device='cuda'))

pipeline = Trellis2ImageTo3DPipeline.from_pretrained("microsoft/TRELLIS.2-4B")
pipeline.cuda()

image = Image.open("assets/example_image/T.png")
mesh = pipeline.run(image)[0]
mesh.simplify(16777216)  # nvdiffrast 上限

video = render_utils.make_pbr_vis_frames(render_utils.render_video(mesh, envmap=envmap))
imageio.mimsave("sample.mp4", video, fps=15)
glb = o_voxel.postprocess.to_glb(
    vertices=mesh.vertices, faces=mesh.faces, attr_volume=mesh.attrs,
    coords=mesh.coords, attr_layout=mesh.layout, voxel_size=mesh.voxel_size,
    aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
    decimation_target=1000000, texture_size=4096, remesh=True, verbose=True)
glb.export("sample.glb", extension_webp=True)
```

### Web Demo

`app.py` 提供了一个 Gradio 交互界面，支持多种渲染模式（普通、黏土、基础色、多种 HDRI 环境光）与多角度预览：

```sh
python app.py
```

随后在终端显示的地址即可访问。它允许上传带 alpha 蒙版的前景图，点击 Generate 生成 3D 资产，满意后点击 Extract GLB 导出下载。

### PBR 纹理生成

除了从图像生成几何，`example_texturing.py` 还展示了对已有网格进行 PBR 材质生成的能力——输入网格与参考图，输出带纹理的 GLB：

```python
import trimesh
from PIL import Image
from trellis2.pipelines import Trellis2TexturingPipeline

pipeline = Trellis2TexturingPipeline.from_pretrained(
    "microsoft/TRELLIS.2-4B", config_file="texturing_pipeline.json")
pipeline.cuda()

mesh = trimesh.load("assets/example_texturing/the_forgotten_knight.ply")
image = Image.open("assets/example_texturing/image.webp")
output = pipeline.run(mesh, image)
output.export("textured.glb", extension_webp=True)
```

### 训练

项目还开源了完整训练代码，支持从零训练或微调。通过 `train.py` 统一驱动，配合 `configs/` 下的配置文件，可分别训练形状 SC-VAE、材质 SC-VAE 以及各级 Flow 模型。例如训练稀疏结构流模型：

```sh
python train.py \
  --config configs/gen/ss_flow_img_dit_1_3B_64_bf16.json \
  --output_dir results/ss_flow_img_dit_1_3B_64_bf16 \
  --data_dir '{"ObjaverseXL_sketchfab": {"base": "datasets/ObjaverseXL_sketchfab", "ss_latent": "...", "render_cond": "..."}}'
```

## 五、常见问题与解决方案

**1. 显存不足（OOM）**
源码中已内置 `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` 以节省显存；若仍爆显存，可尝试降低 `resolution`（512³ 最省）或 `decimation_target`/`texture_size`。

**2. flash-attn 不支持**
对于 V100 等不支持 flash-attn 的 GPU，手动安装 `xformers` 并设置 `ATTN_BACKEND=xformers` 再运行。

**3. CUDA 版本冲突**
当系统存在多个 CUDA Toolkit 时，必须 `export CUDA_HOME=/usr/local/cuda-12.4`（指向正确版本）后再执行安装/推理。

**4. 透明材质未生效**
导出的 `.glb` 默认以 `OPAQUE` 模式输出，纹理中的 alpha 通道未被激活。需在 3D 软件中手动将纹理的 alpha 通道连接到材质的 Opacity/Alpha 输入。

**5. 安装依赖耗时较长**
`setup.sh` 依赖较多，可逐个 flag 分批安装排查；遇到问题欢迎提 issue。

## 六、总结

TRELLIS.2 凭借 **O-Voxel 原生结构化潜变量**，在拓扑自由度、材质丰富度与生成效率三者之间取得了出色的平衡——它既摆脱了传统「场」表示对复杂几何的束缚，又以级联 DiT + 稀疏 VAE 的架构把 3D 资产生成压到了秒级。对于游戏、影视、XR 内容生产，以及需要可控 PBR 资产的下游任务，这是一个非常有价值的开源基线。模型与代码均以 MIT 协议发布，并附带完整训练代码，值得相关研究者和工程师深入试用与二次开发。

> 项目地址：https://github.com/microsoft/TRELLIS.2
> 论文：https://arxiv.org/abs/2512.14692 ｜ 在线 Demo：https://huggingface.co/spaces/microsoft/TRELLIS.2
