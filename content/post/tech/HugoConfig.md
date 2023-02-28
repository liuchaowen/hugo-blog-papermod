---
title: "Hugo个人博客站点常用配置"
date: 2023-02-28T14:40:13+08:00
draft: false
categories: ["技术"]
tags: ["hugo","配置"]
description: 有一些小问题需要记录一下，方便后来者使用
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
## 流量统计

国内可以使用百度统计、cnzz、51la、或者cloudflare等免费统计工具

## 文章阅读统计

卜算子，或者自己搭个云函数

## 站内统计

#### 文章数统计

直接使用hugo变量，但网站有点问题

*官方:*

```html
{{ $posts := (where .Site.RegularPages "Section" "==" "posts") }}
{{ $postCount := len $posts }}
```

*林木木:*

```html
共 {{ len (where .Site.RegularPages "Section" "posts") }} 篇文章
```

有些主题是做过优化的，不用.Site，直接使用site变量，还有就是如果你的文章目录不是posts，像我的改成post，这个相应也要更改，不然运行报错。

#### 运行天数

```javascript
function show_run_day() {
  var BirthDay = new Date("12/27/2022 00:00:00");
  var today = new Date();
  var timeold = (today.getTime() - BirthDay.getTime());
  var sectimeold = timeold / 1000
  var msPerDay = 24 * 60 * 60 * 1000
  var e_daysold = timeold / msPerDay
  var daysold = Math.floor(e_daysold);
  console.log('stat day',daysold)
  document.getElementById("run-num").innerHTML = daysold;
}
show_run_day();
```

放到html的body结束前就好了

#### 评论数

遍历sitemap.xml，获取post的路径list，调用twikoo的api接口，获取总评论数

```javascript

/* 获取所有路径 */
function getAllUrls(isFullUrl,cb){
  fetch("/sitemap.xml")
  .then((res) => res.text())
  .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
  .then((data) => {
    let ls = data.querySelectorAll("url loc");
    let locationHref, locSplit;
    let list = [];
    ls.forEach((element) => {
      var ele = element.innerHTML;
      var ele_split = ele.split("/")[3] || "";
      var ele_split_tail = ele.split("/")[4] || "";
      if (ele_split == "post" && ele_split_tail != "") {
        if (isFullUrl) {
          list.push(ele);
        }
        else{
          var uriList = new URL(ele);
          list.push(uriList.pathname);
        }
      }
    });
    cb && cb(list);
  });
}

/* 评论数统计 */
getAllUrls(false,(urllist)=>{
  twikoo.getCommentsCount({
    envId: 'https://[vercel地址或者是你自定义的后端域名地址]', // 环境 ID
    // region: 'ap-guangzhou', // 环境地域，默认为 ap-shanghai，如果您的环境地域不是上海，需传此参数
    urls: urllist,
    includeReply: false // 评论数是否包括回复，默认：false
  }).then(function (res) {
    var count = 0;
    for (let index = 0; index < res.length; index++) {
      const element = res[index];
      count += element.count
    }
    document.getElementById("comment-num").innerHTML = count;
  }).catch(function (err) {
    // 发生错误
    console.error('twikoo err',err);
  });
})
```

#### 总字数

林木木（基于他的小改）:

```html
{{ $scratch := newScratch}}
{{ range (where site.Pages "Kind" "page") }}
    {{ $scratch.Add "total" .WordCount }}
{{ end }}
{{ $wordnum := div ($scratch.Get "total") 10000}}
```

放在head，调用时如下

```html
<span> {{ printf "%.1f" $wordnum }}w</span>
```

#### 标签数

```javascript
{{ len site.Taxonomies.tags.ByCount }}
```

#### 互链数

```html
{{ $linknum := "-"}}
{{ range (where site.Pages "RelPermalink" "/links/") }}
    {{ $linklist := findRE `(?s)<div class="archive-item links-item cf-friends" .*?>.*?</div>` .Content }}
    {{ $linknum = len $linklist }}
{{ end }}
```

/links/ 为你.md的文件名

## 功能系统

### 评论功能

twikoo + vercel + free mongodb

### 广播广场

memos + vps主机 + docker  (racknerd一年费用80左右)

### 豆瓣书影

github + action

### 链友文集

vercel
