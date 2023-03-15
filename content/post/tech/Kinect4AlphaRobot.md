---
title: "Kinect4AlphaRobot"
date: 2022-12-28T10:26:24+08:00
draft: false
categories: ["技术"]
tags: [“dev","机器人","体感","控制"]
description: 使用kinect体感控制机器人
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
基于Kinect 2.0 与 Alpha 1s 阿尔法机器人的体感控制开发，项目是两位成员@Cheman @JYang 完成。

## 项目说明

项目通过Kinect捕捉人体动作数据，通过蓝牙模块控制 Alpha Robot （优必选阿尔法机器人1S）

## 演示视频

{{< link "点击播放" "https://share.weiyun.com/IhiifkW6" >}}

## 项目技术点

* 蓝牙通信串口开发（项目可实现的基础）
* Kinect获取到的骨骼节点三维坐标数据与Alpha 1S电机转动角度的转换运算
* 机器人动作重心偏移解决方法（未解决）
* 解决Kinect排除多人数据捕捉干扰方法（未解决）

## 项目硬件模块

![bluemodel](https://raw.githubusercontent.com/sixcit/Kinect4AlphaRobot/master/readme-img/220645xhyws3tsjj3g5jw1.jpg)
![kinect2.0](https://raw.githubusercontent.com/sixcit/Kinect4AlphaRobot/master/readme-img/220645of84nu2lf522f2fs.jpg)
![alpha1s](https://raw.githubusercontent.com/sixcit/Kinect4AlphaRobot/master/readme-img/220646aisiujmhc7u2e3lc.jpg)

BLE蓝牙4.0串口模块，购买链接：

\ {{< link "带底板HC-05主从机一体蓝牙模块 无线串口透传通讯 兼容arduino" "https://item.taobao.com/item.htm?spm=a230r.1.14.62.55cc54ccJ5Dicz&id=39244262350&ns=1&abbucket=15#detail" >}}
\ {{< link "CH340G代替PL2303 USB转TTL 转串口 中九升级小板 刷机线 STC下载" "https://item.taobao.com/item.htm?spm=a1z10.3-c-s.w4002-16248799899.14.5ec6546ewcZDPA&id=17817178269" >}}

Kinect One 2.0（可同时记录6个人的20个关节点）

\ {{< link "XBOX ONE/S Kinect 2.0感应器 开发高清体感摄像头 Kinect体感器" "https://item.jd.com/11466539367.html?jd_pop=ba27070e-17ed-489b-900c-178a9b63ff51&abt=0" >}}
\ {{< link "Alpha 1s 阿尔法机器人" "https://item.jd.com/10536803062.html" >}}（16个自由度）
\ {{< link "Win8系统以上的主机" "https://item.jd.com/3879331.html" >}}（支持USB3.0+内存在4G以上）

开发环境搭建：

1、找一台Win8系统以上的主机（支持USB3.0+内存在4G以上）

2、{{< link "安装Kinect开发环境" "http://www.microsoft.com/en-us/download/details.aspx?id=44561" >}}  完成后插入Kinect设备看是否正常

3、{{< link "安装.net framework" "https://www.microsoft.com/en-us/download/details.aspx?id=17851" >}} 与 {{< link "visual studio 开发环境" "https://visualstudio.microsoft.com/" >}}

4、打开vs ,  导入项目工程文件

5、按淘宝买来的蓝牙模块组装后，按附带的教程，测试蓝牙发射模块是否可行

6、去优必优官网下载蓝牙控制指令文档

* {{< link "蓝牙控制指令文档" "https://assets-new.ubtrobot.com/Alpha%201%20%E7%B3%BB%E5%88%97%E8%93%9D%E7%89%99%E9%80%9A%E4%BF%A1%E5%8D%8F%E8%AE%AE.pdf?download" >}}
* {{< link "用户使用说明书" "https://assets-new.ubtrobot.com/Alpha%201S%E7%94%A8%E6%88%B7%E4%BD%BF%E7%94%A8%E6%89%8B%E5%86%8C.pdf?download" >}}


7、确定可以通过PC发送指令给机器人，机器人能动

8、核实蓝牙模块插的USB口与代码里的一致

9、运行项目程序 （应该有动作了，祝你好运），也可以自己打包生成BIN文件  ，下次直接双击运行就可了，因为代码目录里的BIN文件是基于我的电脑环境的，所以在你的电脑可能会不行，USB口一致性的问题，也可以在VS里下载个打包插件，这样能生成EXE，也是可以的

## 开发软件环境

* Kinect for Windows  SDK  2.0(附带kinect browser与kinect studio)
* 串口调试助手
* Visual Studio 2017（本项目使用C#）

## 实现原理思路

![yuanli](https://raw.githubusercontent.com/sixcit/Kinect4AlphaRobot/master/readme-img/220646w805w0z9tnujzndj.png)

* 利用Kinect获取人体骨骼关节点的三维空间坐标数据（）

> Kinect技术可追踪20个骨骼关节点，骨骼数据包含20个关节点的X,Y,Z坐标信息，我们利用Kinect SDK 里的BodyBase案例里的深度图像处理技术进行二次开发，取相对应的14个节点数值

![zuobiao](https://raw.githubusercontent.com/sixcit/Kinect4AlphaRobot/master/readme-img/220907drmmj6tgy6ygtr9g.png)
（图片只画出左侧标注）

* 头部(Head) –肩膀中心(ShoulderCenter)
* 肩膀中心(ShoulderCenter) – 脊柱中心(Spine)
* 脊柱中心(Spine) – 髋部中心(HipCenter)
* 髋部中心(HipCenter) – 左或右膝关节(KneeLeft or KneeRight)
* 左膝关节KneeLeft(右膝关节KneeRight) – 左踝关节leLeft (右踝关节AnkleRight)
* 左踝关节leLeft (右踝关节AnkleRight)- 左脚FootLeft (右脚FootRight)
* 左手(HeadLeft) –左手腕(Wrist Left)
* 左手腕(Wrist Left) – 左胳膊肘(Elbow Left)
* 左胳膊肘(Elbow Left) – 左肩膀(Shoulder Left)
* 左肩膀(Shoulder Left)–肩膀中心(Shoulder Center)
* 肩膀中心(Shoulder Center)-右肩膀(Shoulder Right)
* 右肩膀(Shoulder Right)- 右胳膊肘 (Elbow Right)
* 右胳膊肘 (Elbow Right)- 右手腕(Wrist Right)
* 右手腕(Wrist Right)- 右手 (Hand Right)

## Kinect 人体感应示意图

![yuanli](https://raw.githubusercontent.com/sixcit/Kinect4AlphaRobot/master/readme-img/220646vdm7sky2na3a3du3.jpg)

面向感应器，X代表左右，Y代表上下，Z代表前后（距离在1.2~3.5m范围内，1.8米最适合）
蓝牙通信协议开发标准（可上优必选官网下载，看懂文档是开发者的基本功就不多说了）

> 要注意的是它是16进制，需要把组装好的命令字符串进行转换打包后，通过蓝牙模块发送
> 应用三角函数进行角度转换

面向感应器，三维坐标在扫描画面的左下角，以画面左边手臂为参考；
手从竖直立正抬至P状态为动作过程分析，r为与初始位置时的角度；
每一帧获取到的r值随运动改变，电机也将即时改变角度；

## 体感控制示意图（面向设备）

![jishuan](https://raw.githubusercontent.com/sixcit/Kinect4AlphaRobot/master/readme-img/220646iz4fz300105fpf7s.jpg)

设P状态下，取shoulder肩部点O（x0,y0,z0）,elbow肘部点P（x,y,z），Z轴值保持不变；

对于肘到肩部shoulder所对应的机器人电机可忽略Z轴的影响，即通过这两点的X与Y值来求出r值。

当双手竖直向下时，Alpha 1S机器人有以下初始值：

* 机器人的左手（即画面右则手臂） shoulder对应的机器人电机初始角度为 0 度，竖直向上时为180度；
* 机器人的右手（即画面左则手臂） shoulder对应的机器人电机初始角度 180 度，竖直向上时为0度；

tan值的 + 与 –  区域正好可表达角度是大于90度还是小于90度，也可观察其递变规律。

转化为平面三角运算示意图为：为：

当手竖直向下时 电机角度 r= 0 ,当手竖直向上时，电机角度 r= 180; 则

> tan r = (x-x0)/（y-y0）,  r = arctan (x-x0)/（y-y0）(0<r<π)

将小数转换成实际角度

> α = r/π*180

将含有角度值的命令字符串用16进制转换后通过蓝牙传给机器人，即可响应。

同样道理，当手向前水平合拢时，肩部关节点shoulder基本不变，通过X与Z轴求得手臂在肩部点前后转动的角度，方法与公式就不再详细说明。
