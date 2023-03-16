---
title: "Hugo的标签使用词云WordCloud2展示"
date: 2023-03-16T13:41:23+08:00
draft: false
categories: ["技术"]
tags: ["hugo","wordcloud","词云","标签云"]
description: 让你的标签展示更加好看，更加直观
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
最近的“折腾病”又犯了，感觉是时候搞搞标签云，在伟大的开源世界找到这个项目：

## 项目地址

{{< github title="timdream/wordcloud2.js" >}}

最后的效果：[tags页面](/tags/)

于是，开搞！

## 引入依赖

在head引入文件，css主要是做动画用的

```html
{{- if eq .Section "tags"}}
{{/* 标签云 */}}
<link rel="stylesheet" href="/css/word-cloud.css"\>
<script src="/js/wordcloud2.js"></script>
{{- end }}
```

style具体代码
{{<code css>}}
.word-color:nth-child(7n + 1) {
    color: rgb(202, 110, 255);
  }
  .word-color:nth-child(7n + 2) {
    color: rgb(83, 110, 255);
  }
  .word-color:nth-child(7n + 3) {
    color: rgb(143, 253, 241);
  }
  .word-color:nth-child(7n + 4) {
    color: rgb(183, 255, 112);
  }
  .word-color:nth-child(7n + 5) {
    color: rgb(255, 212, 126);
  }
  .word-color:nth-child(7n + 6) {
    color: rgb(248, 140, 131);
  }
  .word-color:nth-child(7n + 7) {
    color: rgb(104, 160, 255);
  }
  @keyframes word {
    0% {
      opacity: 0.5;
    }
    3% {
      opacity: 1;
    }
    9% {
      opacity: 1;
    }
    12% {
      opacity: 0.5;
    }
    100% {
      opacity: 0.5;
    }
  }

  .word-animate {
    animation-name: word;
    animation-duration: 20s;
    animation-iteration-count: infinite;
    will-change: opacity;
    opacity: 0.5;
  }

  .word-animate:nth-child(7n + 1) {
    animation-delay: 0s;
  }
  .word-animate:nth-child(7n + 2) {
    animation-delay: 3s;
  }
  .word-animate:nth-child(7n + 3) {
    animation-delay: 6s;
  }
  .word-animate:nth-child(7n + 4) {
    animation-delay: 9s;
  }
  .word-animate:nth-child(7n + 5) {
    animation-delay: 12s;
  }
  .word-animate:nth-child(7n + 6) {
    animation-delay: 15s;
  }
  .word-animate:nth-child(7n + 7) {
    animation-delay: 18s;
  }
{{</code>}}

## 接入代码

找到layouts/_default/terms.html，把原来的注释掉，用wc2替代
{{<code html>}}

<!--标签云-->

<div id="sourrounding_div" style="width:100%;height:100%;min-height: 500px;">
    <div id="tag-canvas"></div>
</div>

<script src="/js/wordcloud2.js"></script>

{{- range $key, $value := .Data.Terms.Alphabetical }}
    {{ if eq "" ($.Scratch.Get "tagsMap") }}
        {{ $.Scratch.Set "tagsMap" (slice (dict .Name .Count))  }}
    {{ else }}
        {{ $.Scratch.Add "tagsMap" (slice (dict .Name .Count)) }}
    {{ end }}
{{- end }}
{{ $result := ($.Scratch.Get "tagsMap")}}
`<span id="tag-temp" style="display:none">`{{$result | jsonify }}

<script>
    //因为前期每个标签值比较小，帮X一个系数
    var XISHU = 20;
    //为了动态宽度
    var div = document.querySelector("#sourrounding_div");
    var canvas = document.querySelector("#tag-canvas");
    canvas.style.width = div.offsetWidth+'px';
    canvas.style.height = div.offsetHeight+'px';
    var wordFreqData =  document.querySelector("#tag-temp").innerHTML;
    var jsonObj = JSON.parse(wordFreqData);
    var arr = []
    jsonObj.forEach(element => {
        var key = Object.keys(element);
        var itemArr = [key[0],element[key]*XISHU];
        arr.push(itemArr);
    });
    //获取当前是暗色还是浅色
    var isDark = document.body.className.includes("dark");
    WordCloud(canvas, {
          "list": arr,//或者[['各位观众',45],['词云', 21],['来啦!!!',13]],只要格式满足这样都可以
          "gridSize": 6, // 密集程度 数字越小越密集
          "weightFactor": 1, // 字体大小=原始大小*weightFactor
          "fontWeight": 'normal', //字体粗细
          "fontFamily": 'Times, serif', // 字体
          "color": isDark?'random-light':'random-dark', // 字体颜色 'random-dark' 或者 'random-light'
          "backgroundColor": 'transparent', // 背景颜色
          "classes": "tag-cloud-item word-color", //用于点击事件
      });
      canvas.addEventListener('wordcloudstop', function (e) {
            //动画
            setTimeout(() => {
                var els = document.querySelectorAll(".word-color");
                Array.from(els).forEach((el) => {
                    console.log('动画',el)
                    el.classList.add("word-animate")
                })
            }, 2000);
            //点击
            document.querySelectorAll('.tag-cloud-item').forEach(function (element) {
                const text = element.innerHTML;
                element.innerHTML = `<a href="/tags/${text}" style="color: inherit;">${text}</a>`;
            });
        });
  
</script>

<!-- <ul class="terms-tags">
    {{- $type := .Type }}
    {{- range $key, $value := .Data.Terms.Alphabetical }}
    {{- $name := .Name }}
    {{- $count := .Count }}
    {{- with site.GetPage (printf "/%s/%s" $type $name) }}
    <li>
        <a href="{{ .Permalink }}">{{ .Name }} <sup><strong><sup>{{ $count }}</sup></strong></sup> </a>
    </li>
    {{- end }}
    {{- end }}
</ul> -->

{{</code>}}

## 拓展选项

* [X] 切换深色浅色主题，标签颜色改变
* [X] 动态响应式尺寸
* [X] 词云动态展示效果
* [ ] 词云聚合显示成一个特定形状
