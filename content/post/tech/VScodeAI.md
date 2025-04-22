---
title: "使用VSCode接入DeepSeek V3平替Cursor与Trae的AI编程方案"
date: 2025-04-22T14:45:24+08:00
draft: false
categories: ["技术"]
tags: ["AI编程","Trea","Cursor","AI API"]
description: 
author: "Cheman"
showToc: true
TocOpen: false
hidemeta: false
comments: false
canonicalURL: "https://canonical.url/to/page"
disableHLJS: false # to disable highlightjs
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
在深入体验 AI 编程的这几天里，我深刻感受到，程序员们完全可以借助 AI 的力量来提升工作效率，节省脑力。

平时需要一天完成的工作量，现在半天都不用就做完了，在做逻辑比较能用简单的事（前端、脚本或者后端接口）特别高效准确，只要你能精准命令 AI ，真的事半功倍。

一开始，我尝试了 Cursor 和 Trae 这两个工具。初次使用时，它们的表现确实令人惊艳，AI 能够自动帮我生成代码、修复 BUG ，这让我感到非常兴奋。

然而，随着时间的推移，问题逐渐显现。Cursor 的免费 Token 用完后，升级 Pro 的费用较高，这让我有些犹豫。而 Trae 虽然打着免费的旗号，确实也是免费，但在并发高时需要排队等待，严重影响了工作进度。

经过一番探索，我找到了一个不错的平替方案，分为两步：

第一步，使用 VSCode 的 Roo Code 插件，替代 Cursor 与 Trae 这两个 IDE 。直接搜索并安装中文版，具体操作这里就不详细展开了。

第二步，使用第三方 API 平台 Key 。

具体操作如下：

登录 XLapTop API 接口中转平台： [https://api.xlap.top](https://api.xlap.top/) ，获取 Key 。

点击“令牌”，添加令牌，渠道分组默认

进行 Roo Code 插件配置，将 Key 放入，API 提供商选择 OpenAI Compatible （不影响使用 DeepSeek 等，只是名称而已），Base URL 填入 [https://api.xlap.top/v1](https://api.xlap.top/v1) ，Model 填入 DeepSeek V3-0324 （最新版本），选择其他可以查看 Model 列表。

完成以上步骤后，你就可以开始享受 AI 编程带来的便利，让代码飞起来吧！

使用心得：在写命令时如果逻辑只用到某个文件，直接用 @把代码编写范围框住；描述最好细节化，精准化，如 class=xxx ，某一行代码，某个方法，使用什么方法；把问题描写得具体一点，不要模糊。
