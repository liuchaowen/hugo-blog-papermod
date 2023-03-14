---
title: "Hugo使用简码Shortcode指南"
date: 2023-03-09T15:51:45+08:00
draft: false
categories: ["技术"]
tags: ["shortcode","hugo","简码"]
description: 记录平时使用的调用方法，方便写文章时调用
author: "Chao"
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
请去掉"{}"前后的"/"字符

## code 代码

```html
\{\{<code javascript>\}\}
这里替换你的代码
\{\{</code>\}\}
```

常规的md插入的代码不支持折叠，如果代码太长会很不友好，所以要用简码让代码展开收起; 
以下为接入过程，由于有评友说了些不一样的需求，本人小改了一下：
code.html
```html
<div class="highlight-wrapper">
    <div class="highlight-before" style="display:none">{{ .Get 0 }}</div>
    {{ if len .Params | eq 2 }}
        {{ highlight (trim .Inner "\n\r") (.Get 0) (.Get 1) }}
    {{ else }}
        {{ highlight (trim .Inner "\n\r") (.Get 0) "" }}
    {{ end }}
</div>
```

head引入代码：
{{<code javascript>}}
var height = "300px";

if (
  document.readyState === "complete" ||
  (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
  makeCollapsible();
} else {
  document.addEventListener("DOMContentLoaded", makeCollapsible);
}

function toggle(e) {
  e.preventDefault();
  var link = e.target;
  var div = link.parentElement.parentElement;

  if (link.innerHTML == "&nbsp;展开&nbsp;") {
    link.innerHTML = "&nbsp;收起&nbsp;";
    div.style.maxHeight = "";
    div.style.overflow = "none";
  }
  else {
    link.innerHTML = "&nbsp;展开&nbsp;";
    div.style.maxHeight = height;
    div.style.overflow = "hidden";
    div.scrollIntoView({ behavior: 'smooth' });
  }
}

function makeCollapsible() {
  var divs = document.querySelectorAll('.highlight-wrapper');

  for (i = 0; i < divs.length; i++) {
    var div = divs[i];
    if (div.offsetHeight > parseInt(height, 10)) {
      div.style.maxHeight = height;
      div.style.overflow = "hidden";

      var e = document.createElement('div');
      e.className = "highlight-link";

      var html = '<a href="">&nbsp;展开&nbsp;</a>';
      e.innerHTML = html;
      div.appendChild(e);
    }
  }

  var links = document.querySelectorAll('.highlight-link');
  for (i = 0; i < links.length; i++) {
    var link = links[i];
    link.addEventListener('click', toggle);
  }
}

//事件处理
window.onload = function () {
  var divs = document.querySelectorAll('.highlight-wrapper');
  var eleItems = [].slice.call(divs);
  eleItems.forEach(function (item, idx) {
      item.addEventListener('mouseover', function () {
        var tag = item.querySelectorAll('.highlight-before')[0];
        tag.style.display = "block";
      });
      item.addEventListener('mouseout', function () {
        var tag = item.querySelectorAll('.highlight-before')[0];
        tag.style.display = "none";
      });
  });
}
{{</code>}}

{{<code css>}}
.highlight-wrapper {
    position: relative;
}

.highlight-before {
    position: absolute;
    top: 10px;
    left: 0;
    z-index: 2;
    color: white;
    background-color: #333333;
    opacity: .8;
    padding: 2.5px 10px;
    border-radius: 5px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -o-user-select: none;
    user-select: none;
}

.highlight-link {
    position: absolute;
    bottom: 0;
    right: 0;
}

.highlight-link a{
    box-shadow: 0 0px;
    font-size: 14px;
    color: #eea2a4;
}
{{</code>}}

## github 源卡片

```html
\{\{< github title="liuchaowen/hugo-blog-papermod" >\}\}
```

效果：
{{< github title="liuchaowen/hugo-blog-papermod" >}}
只需要把repo的id放入即可，会自动去组装卡片，很方便

## youtube 油管视频

```html
\{\{< youtube "AYEeCauuRsA" >\}\}
```

效果：
{{< youtube "AYEeCauuRsA" >}}

## bilibili B站视频

```html
\{\{< bilibili "BV1Jo4y167JP" >\}\}
```

效果：
{{< bilibili "BV1Jo4y167JP" >}}

## game 游戏卡片

```html
\{\{< game "https://www.yystv.cn/g/36">\}\}
```

效果：
{{< game "https://www.yystv.cn/g/36">}}

## music 网易云音乐歌单

```html
\{\{< music id="1443928242" >\}\}
```

效果：
{{< music id="1443928242" >}}

## innerlink 内链文章

```html
\{\{< innerlink src="/post/tech/HugoUseShortcode.md" >\}\}
```

效果：
{{< innerlink src="/post/tech/HugoUseShortcode.md" >}}
我去掉了摘要，因为加上.Summary会运行不成功，未找到原因，如有大神知道请评论留言。

## link 外链跳转（带提示）

```html
\{\{< link "林木木" "https://immmmm.com" >\}\}
```

效果：
{{< link "林木木" "https://immmmm.com" >}}
\
注意要修改link.html的跳转地址
\
下面是跳转代码jump.html
{{<code html>}}
<!DOCTYPE html>
<head>
<style>
    .box {
      height: 100vh;
      background-color: #f4f5f5;
    }
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
    </style>
    <script>
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
        </script>
</head>
<body>
    <div class="box">
        <div class="tip-box">
            <div class="logo-box">
                <img
                class="logo"
                src="https://blog.xlap.top/logo.png"
              />
              <span class="text">LapTop</span>
            </div>
          <div class="content">
            <div class="title">
              即将离开 Cheman 的博客，请注意账号财产安全
            </div>
            <div class="link" id="target-link"></div>
            <button class="btn" onclick="navigateToTarget()">继续访问</button>
          </div>
        </div>
      </div>
</body>
</html>
{{</code>}}
## ppt 幻灯片

```html
\{\{< ppt src="ppt网址" >\}\}
```

详情点击 {{< link "Sulv" "https://www.sulvblog.cn/posts/blog/shortcodes" >}}

## gallery 画廊

```html
\{\{< gallery "images/dirname">\}\}
```

## figure 作者/人物/角色

```html
\{\{< figure src="https://blog.xlap.top/avatar.jpeg" width="50" height="50" title="Cheman" link="https://blog.xlap.top">\}\}
```

效果：
{{< figure src="https://blog.xlap.top/avatar.jpeg" width="50" height="50" title="Cheman" link="https://blog.xlap.top">}}

## douban 我看过的书影

```html
\{\{< books >\}\} or \{\{< movies>\}\}
```

详细效果看[关于](/about)
需要搭建服务，详情点击 {{< link "林木木" "https://immmmm.com/hugo-shortcodes-recently-by-douban/" >}}

## douban 某个书影

```html
\{\{< douban "https://book.douban.com/subject/35496106/">\}\}
\{\{< douban "https://movie.douban.com/subject/35267208/">\}\}
```

效果：
{{< douban "https://book.douban.com/subject/35496106/">}}
{{< douban "https://movie.douban.com/subject/35267208/">}}
书还有点问题，待解决

## collapse 可折叠文本

```html
\{\{<collapse summary="**A Title**">\}\}
  this is content
\{\{</collapse>\}\}
```

效果：
{{<collapse summary="**A Title**">}}
  this is content
{{</collapse>}}

## html 原代码

```html
\{\{< rawhtml >\}\}
  <p class="speshal-fancy-custom">
    This is <strong>raw HTML</strong>, inside Markdown.
  </p>
\{\{< /rawhtml >\}\}
```

效果：
{{< rawhtml >}}
  <p class="speshal-fancy-custom">
    This is <strong>raw HTML</strong>, inside Markdown.
  </p>
{{< /rawhtml >}}

## rtl or ltr 右左方向文本(藏文) 未懂

```html
{{ rtl md="Md"}}
这是从右向左的文本
{{/rtl}}
```

## album 动态图集

```html
\{\{< album >\}\}
```

需要搭建memos，详情点击 {{< link "林木木" "https://immmmm.com/hugo-shortcodes-recently-by-memos/" >}}
\
效果：
{{< album >}}

## memos 说说动态

```html
\{\{< memos >\}\}
```

需要搭建memos，详情点击 {{< link "林木木" "https://immmmm.com/hugo-shortcodes-recently-by-memos/" >}}
\
效果：
{{< memos >}}
