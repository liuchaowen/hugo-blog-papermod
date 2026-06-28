---
title: "CuPy：让 NumPy 代码零修改跑在 GPU 上"
date: 2026-06-28
description: "CuPy 是 NumPy/SciPy 兼容的 GPU 加速数组库，支持 NVIDIA CUDA 和 AMD ROCm，无需修改代码即可将现有 Python 科学计算工作负载提速数十倍。"
author: "Cheman"
slug: cupy
draft: false
categories: ["技术", "开源"]
tags: ["GPU", "NumPy", "CUDA", "科学计算", "Python", "开源"]
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

今天在 GitHub Trending 上看到一个有意思的项目：**CuPy**，一个能让你的 NumPy/SciPy 代码原封不动地跑在 GPU 上的数组库，兼容度极高，性能提升显著。

## 一、项目概述

CuPy 是由 Preferred Networks 主导开发的开源 GPU 加速数组库，定位是「NumPy & SciPy for GPU」。它的核心价值在于**零修改迁移**：你只需要把 `import numpy as np` 改成 `import cupy as cp`，其余代码几乎不用动，就能获得 CUDA 或 ROCm 的加速能力。

项目目前在 GitHub 上拥有极高的社区活跃度，支持 Python 3.10+，提供 pip / conda / Docker 三种安装方式，覆盖 Linux 和 Windows 平台。

核心特性：
- **NumPy 全量兼容**：`cupy.ndarray` 实现了 NumPy `ndarray` 的绝大多数 API
- **SciPy 子集支持**：`cupyx.scipy` 覆盖了 SciPy 中常用的线性代数、FFT、稀疏矩阵等模块
- **底层 CUDA 访问**：支持 RawKernel、Stream、CUDA Runtime API 直接调用
- **多后端支持**：NVIDIA CUDA 12.x / 13.x，AMD ROCm 7.0（实验性）
- **Signal Processing 合并**：从 v13.0.0 起，原 cuSignal 项目已并入 CuPy 主线

## 二、技术原理

### 2.1 架构设计

CuPy 的核心设计理念是**「Drop-in Replacement」**（直接替换）。它在 Python 层完整复刻了 NumPy 和 SciPy 的 API 签名，底层则通过 CUDA C++ 内核实现计算。

```
用户代码 (NumPy 风格)
       │
       ▼
  CuPy Python 层 (API 兼容层)
       │
       ▼
  CuPy CUDA 内核 (cuBLAS / cuFFT / cuSOLVER / cuSPARSE ...)
       │
       ▼
  NVIDIA GPU (或 AMD GPU via HIP)
```

关键目录结构（`pyproject.toml` 中定义）：
- `cupy/` — 面向用户的 NumPy 兼容 API
- `cupyx/` — 扩展功能（SciPy 子集、工具函数）
- `cupy_backends/` — CUDA/hardware 后端抽象层
- `cupy/_core/include/cupy/` — C++ 头文件（Thrust、CUB 等）

### 2.2 核心技术栈

| 层次 | 技术 | 作用 |
|------|------|------|
| 构建系统 | Cython + setuptools | 将 Python API 编译为 C 扩展 |
| GPU 计算 | CUDA Toolkit (cuBLAS, cuFFT, cuSOLVER, cuSPARSE, cuRAND) | 底层线性代数 / 变换 / 求解器 |
| 内存管理 | CUDA Unified Memory / Memory Pool | 减少 malloc 开销，复用显存 |
| JIT 内核 | RawKernel / ElementwiseKernel / ReductionKernel | 用户自定义 CUDA C 代码即时编译 |
| 包管理 | pyproject.toml (PEP 621) | 现代 Python 打包规范 |

从 `setup.py` 可以看到，CuPy 在构建时会编译大量 CUDA `.cu` 文件（如 `cupy_thrust.cu`、`cupy_cub.cu`、`cupy_distributions.cu`），这些是实现 GPU 加速的关键。

### 2.3 关键数据流

以 `x.sum(axis=1)` 为例：

1. Python 层 `cupy.ndarray.sum()` 被调用
2. 根据 `axis` 参数选择 reduction 策略
3. 调用底层 CUDA kernel（`cupy_backends/cuda` 中的对应函数）
4. GPU 执行并行 reduction，结果写回显存
5. 返回 `cupy.ndarray`（仍在显存中，零拷贝）

```python
# 源码层面的典型调用链（简化）
# cupy/_core/core.py
def sum(self, axis=None, ...):
    return _sum(self, axis, ...)

# cupy/_math/sumprod.py
def _sum(a, axis=None, ...):
    return a.sum(axis=axis, ...)
```

## 三、安装与快速开始

### 3.1 安装

CuPy 提供平台预编译的 wheel，按 CUDA 版本选择包名：

```bash
# CUDA 12.x（当前主流）
pip install cupy-cuda12x

# CUDA 13.x
pip install cupy-cuda13x

# AMD ROCm 7.0（实验性）
pip install cupy-rocm-7-0
```

> **注意**：CUDA 12.x  wheel 支持 x86_64 和 ARM64（aarch64），可在 Jetson 等设备上使用。

Conda 用户：

```bash
conda install -c conda-forge cupy
```

Docker 用户（需要 NVIDIA Container Toolkit）：

```bash
docker run --gpus all -it cupy/cupy
```

### 3.2 最简运行示例

```python
import cupy as cp

# 创建 GPU 上的数组
x = cp.arange(1000000, dtype='float32')

# 计算均值（全程在 GPU 上执行）
mean = cp.mean(x)

# 转回 CPU（如需与 NumPy 交互）
mean_cpu = cp.asnumpy(mean)
print(mean_cpu)

# 从 NumPy 数组转入 GPU
import numpy as np
a_cpu = np.random.rand(1000, 1000)
a_gpu = cp.asarray(a_cpu)
```

## 四、使用方法与实战

### 4.1 基础用法：直接替换 NumPy

```python
# 原来用 NumPy 的代码
import numpy as np
x = np.random.rand(10000, 10000)
y = np.dot(x, x.T)

# 改成 CuPy，其余不变
import cupy as cp
x = cp.random.rand(10000, 10000)
y = cp.dot(x, x.T)
```

### 4.2 进阶用法：自定义 CUDA 内核

当内置函数不够用时，可以用 `RawKernel` 直接写 CUDA C 代码：

```python
import cupy as cp

# 定义一个简单的向量加法内核
kernel_code = r'''
extern "C" __global__
void vec_add(const float* x, const float* y, float* z, int n) {
    int idx = blockDim.x * blockIdx.x + threadIdx.x;
    if (idx < n) {
        z[idx] = x[idx] + y[idx];
    }
}
'''
vec_add_kernel = cp.RawKernel(kernel_code, 'vec_add')

# 执行
n = 1000000
x = cp.random.rand(n, dtype=cp.float32)
y = cp.random.rand(n, dtype=cp.float32)
z = cp.empty_like(x)

block_size = 256
grid_size = (n + block_size - 1) // block_size
vec_add_kernel((grid_size,), (block_size,), (x, y, z, n))
```

### 4.3 实际项目示例：矩阵乘法性能对比

```python
import numpy as np
import cupy as cp
import time

def benchmark_matmul(n=10000):
    # CPU (NumPy)
    a_cpu = np.random.rand(n, n).astype(np.float32)
    b_cpu = np.random.rand(n, n).astype(np.float32)
    start = time.time()
    c_cpu = np.dot(a_cpu, b_cpu)
    cpu_time = time.time() - start
    print(f"CPU (NumPy): {cpu_time:.3f}s")

    # GPU (CuPy)
    a_gpu = cp.asarray(a_cpu)
    b_gpu = cp.asarray(b_cpu)
    cp.cuda.Stream.null.synchronize()  # 确保数据传输完成
    start = time.time()
    c_gpu = cp.dot(a_gpu, b_gpu)
    cp.cuda.Stream.null.synchronize()  # 等待 GPU 计算完成
    gpu_time = time.time() - start
    print(f"GPU (CuPy): {gpu_time:.3f}s")
    print(f"加速比: {cpu_time/gpu_time:.1f}x")

benchmark_matmul(5000)
```

> 在 NVIDIA RTX 4090 上，5000×5000 单精度矩阵乘法通常可获得 20-50x 的加速比。

### 4.4 SciPy 功能使用

```python
from cupyx.scipy import linalg as cpla
import cupy as cp

# 求解线性方程组 Ax = b
A = cp.random.rand(5000, 5000, dtype=cp.float32)
b = cp.random.rand(5000, dtype=cp.float32)
x = cpla.solve(A, b)

# FFT
from cupyx.scipy import fft
x = cp.random.rand(2**20).astype(cp.complex64)
X = fft.fft(x)  # 使用 cuFFT 后端
```

## 五、常见问题与解决方案

### 5.1 安装失败：CUDA 版本不匹配

**现象**：`pip install cupy-cuda12x` 后导入报错 `ImportError: libcuda.so not found`

**原因**：wheel 包需要系统已安装对应版本的 CUDA Runtime（不需要完整 CUDA Toolkit，但需要驱动和 runtime 库）

**解决**：
```bash
# 检查 CUDA 驱动版本
nvidia-smi

# 确认 CUDA runtime 版本
python -c "import cupy; print(cupy.cuda.runtime.runtimeGetVersion())"

# 如果版本不匹配，卸载重装对应 wheel
pip uninstall cupy-cuda12x
pip install cupy-cuda13x  # 或对应版本
```

### 5.2 显存不足（OOM）

**现象**：`OutOfMemoryError: out of memory to allocate xxxxx bytes`

**原因**：GPU 显存不足以容纳数组

**解决**：
```python
# 方法1：使用内存池管理（CuPy 默认开启）
import cupy as cp
# 手动释放未使用的显存
cp.get_default_memory_pool().free_all_blocks()

# 方法2：分批处理大数组
def batch_process(arr, batch_size=1000):
    results = []
    for i in range(0, len(arr), batch_size):
        batch = arr[i:i+batch_size]
        results.append(cp.sum(batch))
    return cp.concatenate(results)

# 方法3：使用 CPU 卸载（不常用，会损失性能）
x_cpu = cp.asnumpy(x_large)  # 转回 CPU
```

### 5.3 性能不如预期

**现象**：GPU 加速比很小，甚至比 CPU 慢

**原因**：数据量太小，GPU 启动开销抵消了并行收益；或数据频繁在 CPU/GPU 间拷贝

**解决**：
```python
# 避免频繁 CPU/GPU 数据传输
# ❌ 错误做法
for i in range(100):
    x = cp.asarray(np_data[i])  # 每次都传输
    result = cp.sum(x)

# ✅ 正确做法：批量传输
x_all = cp.asarray(np_data)  # 一次传输
for i in range(100):
    result = cp.sum(x_all[i])

# 确保计算量足够大（通常数组元素 > 10^6 才有明显加速）
```

### 5.4 与 SciPy 行为不一致

**现象**：某些函数在 CuPy 和 SciPy 中结果有差异

**原因**：CuPy 的 SciPy 子集是独立实现的，部分函数使用近似算法或不同的底层库

**解决**：查阅 [CuPy vs SciPy 对比文档](https://docs.cupy.dev/en/stable/reference/comparison.html)，确认函数兼容性。对于精度敏感的场景，可考虑 CPU/GPU 混合计算。

## 六、总结

CuPy 的核心价值在于**极低迁移成本下的 GPU 加速**。对于已有大量 NumPy/SciPy 代码的科学计算项目，切换到 CuPy 几乎不需要修改业务逻辑，却能获得数量级的性能提升。

**适合场景**：
- 大规模矩阵运算、FFT、线性代数
- 科学计算、数据分析、机器学习预处理
- 需要快速原型验证的 GPU 计算任务

**不适合场景**：
- 小数组（< 10^5 元素），GPU 启动开销不划算
- 需要完整 SciPy 功能集（CuPy 只覆盖了常用子集）
- CPU 和 GPU 之间频繁数据传输的场景

如果你正在用 NumPy 做计算密集型的科学计算，CuPy 值得一试——把 `import numpy as np` 改成 `import cupy as cp`，就是全部的工作量。

**参考链接**：
- 官网：https://cupy.dev/
- 文档：https://docs.cupy.dev/en/stable/
- GitHub：https://github.com/cupy/cupy
- PyPI：https://pypi.org/project/cupy-cuda12x/
