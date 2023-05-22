---
title: "做个免费简单的跳转提示页"
date: 2023-05-22T09:21:46+08:00
draft: false
categories: ["技术"]
tags: ["跳转页","跳转提示"]
description: 使用Github Pages做个纯静态的跳转提示页功能
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
好久没写文章了，看着首页的热力图，有点自愧。

从知乎跳转外链时，都会提示跳转链接地址，以前觉得这样的功能很鸡肋。
但出于对用户的告知，对网站的安全责任的提示，这个功能却又是有必要的。

于是，小搞了一下。

效果图： ![jump](https://i.imgtg.com/2023/05/22/OOLSVB.png)

单个 HTML 代码(index.html)：
header的css
{{<code css>}}
.box { height: 100vh; background-color: #f4f5f5; }

    .box .tip-box {
      position: absolute;
      left: 50%;
      top: 30%;
      max-width: 624px;
      width: 86%;
      background-color: #fff;
      transform: translateX(-50%);
      padding: 30px 40px 0;
      box-sizing: border-box;
      border: 1px solid #e5e6eb;
      border-radius: 2px;
    }

    .box .tip-box .logo-box .text{
        display: block;
        position: absolute;
        top: -38px;
        left: 36px;
        font-size: 24px;
        font-weight: bold;
    }

    .box .tip-box .logo-box .logo {
      display: block;
      width: 35px;
      height: 35px;
      position: absolute;
      top: -40px;
      left: 0;
    }

    .box .tip-box .content .title {
      font-size: 18px;
      line-height: 24px;
    }

    .box .tip-box .content .link {
      padding: 16px 0 24px;
      border-bottom: 1px solid #e5e6eb;
      position: relative;
      color: gray;
      font-size: 14px;
    }

    .box .tip-box .content .btn {
      display: block;
      margin: 20px 0 24px auto;
      color: #fff;
      border-radius: 3px;
      border: none;
      background: #eea2a4;
      height: 32px;
      font-size: 14px;
      padding: 0 14px;
      cursor: pointer;
      outline: 0;
    }
{{</code>}}
header的js
{{<code js>}}
  // 获取 url
        var url = "";
        function getTargetURL() {
            console.log(window.location.href)
              var query = window.location.href.split("?")[1] || "";
              var target = query.split("target=")[1] || "";
               url = window.decodeURIComponent(target);
              document.getElementById('target-link').innerHTML = url;
              console.log(url)
        }
        // 跳转页面
        function navigateToTarget() {
              if (!url) {
                return;
              }
              window.location.href = url;
        }
        window.onload = function(){
            getTargetURL(); // 获取 url
        }
{{</code>}}

{{<code html>}}
    `<div class="box">`
        `<div class="tip-box">`
            `<div class="logo-box">`
                `<img                 class="logo"                 src="https://blog.xlap.top/logo.png"               />`
              `<span class="text">`LapTop
            `</div>`

    `<div class="content">`
            `<div class="title">`
              即将离开 Cheman 的博客，请注意账号财产安全
            `</div>`
            `<div class="link" id="target-link"></div>`
            `<button class="btn" onclick="navigateToTarget()">`继续访问 `</button>`
          `</div>`
        `</div>`
      `</div>`
{{</code>}}

然后在需要跳转的地方直接拼接地址即可，如：

```code
<a target="_blank" href="https://[GITHUB_PAGE_URL]/index.html?target=xxx"></a>
```

题外话：

> 文章技术含量较低，纯属提升活跃度，可略！嘻嘻~
