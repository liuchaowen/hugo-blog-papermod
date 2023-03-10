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

由于常规的md插入的代码不支持折叠，如果代码太长会很不友好，所以要用简码让代码展开收起

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

  for (i=0; i < divs.length; i++) {
    var div = divs[i];
    if (div.offsetHeight > parseInt(height, 10)) {
      div.style.maxHeight = height;
      div.style.overflow = "hidden";

    var e = document.createElement('div');
      e.className = "highlight-link";

    var html = '`<a href="">`&nbsp;展开&nbsp;`</a>`';
      e.innerHTML = html;
      div.appendChild(e);
    }
  }

  var links = document.querySelectorAll('.highlight-link');
  for (i=0; i<links.length; i++) {
    var link = links[i];
    link.addEventListener('click', toggle);
  }
}
{{</code>}}

```css
/*css*/
.highlight-wrapper {
    position: relative;
}

.highlight-link {
    position: absolute;
    bottom: 0;
    right: 0;
}

.highlight-link a{
    box-shadow: 0 0px;
}
```

## github 源卡片

```html
\{\{< github title="liuchaowen/hugo-blog-papermod" >\}\}
```

只需要把repo的id放入即可，会自动去组装卡片，很方便

## youtube 油管视频

```html
\{\{< youtube 09jf3ow9jfw >\}\}
```

## bilibili B站视频

```html
\{\{< bilibili BV号 >\}\}
```

## game 游戏卡片

```html
\{\{< game "https://www.yystv.cn/g/36">\}\}
```

详情点击 [林木木](https://immmmm.com/hugo-shortcodes-game/)

## music 网易云音乐歌单

```html
\{\{< music id="1443928242" >\}\}
```

## innerlink 内链文章

```html
\{\{< innerlink src="https://blog.xlap.top/post/tech/hugouseshortcode/" >\}\}
```

## ppt 幻灯片

```html
\{\{< ppt src="ppt网址" >\}\}
```

详情点击 [Sulv](https://www.sulvblog.cn/posts/blog/shortcodes)

## gallery 画廊

```html
\{\{< gallery "images/dirname">\}\}
```

## figure 作者/人物/角色

```html
\{\{< figure src="https://blog.xlap.top/avatar.jpeg" width="50" height="50" title="Cheman" link="https://blog.xlap.top">\}\}
```

## douban 我看过的书影

```html
\{\{< books >\}\} or \{\{< movies>\}\}
```

需要搭建服务，详情点击 [林木木](https://immmmm.com/hugo-shortcodes-recently-by-douban/)

## douban 某个书影

```html
\{\{< douban "https://book.douban.com/subject/35496106/">\}\}
\{\{< douban "https://movie.douban.com/subject/35267208/">\}\}
```

## collapse 可折叠文本

```html
\{\{<collapse summary="**A Title**">\}\}
  this is content
\{\{</collapse>\}\}
```

## html 原代码

```html
\{\{< rawhtml >\}\}
  <p class="speshal-fancy-custom">
    This is <strong>raw HTML</strong>, inside Markdown.
  </p>
\{\{< /rawhtml >\}\}
```

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

需要搭建memos，详情点击 [林木木](https://immmmm.com/hugo-shortcodes-recently-by-memos/)

## memos 说说动态

```html
\{\{< memos >\}\}
```

需要搭建memos，详情点击 [林木木](https://immmmm.com/hugo-shortcodes-recently-by-memos/)

## Memos 最近图集

{{< album >}}

## Memos 最近言录

{{< memos >}}
