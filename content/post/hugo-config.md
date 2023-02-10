---
title: "Hugo自定义主题与配置"
date: 2023-02-10T16:26:48+08:00
draft: false
tags: ["hugo","blog","icons"]
author: "CHAO"
showToc: true
TocOpen: false
hidemeta: false
comments: false
description: "Desc Text."
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
cover:
    image: "<image path/url>" # image path/url
    alt: "<alt text>" # alt text
    caption: "<text>" # display caption under cover
    relative: false # when using page bundles set this to true
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/<path_to_repo>/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
---
###### 引入fontAwesome图标库

主题项目 -layout -partials -head.html

```html
{{ if .Site.Params.fontAwesome }}
<script src="{{ .Site.Params.fontAwesome.kitURL }}" crossorigin="anonymous"></script>
{{ end }}
```

config.yml

```yaml
fontAwesome:
    kitURL: "https://kit.fontawesome.com/844a346ce0.js"
```
