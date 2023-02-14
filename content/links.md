---
title: 朋友圈
date: 2022-10-09 00:38:16
---

<div id="hexo-circle-of-friends-root"></div>
<script>
    let UserConfig = {
        // 填写你的api地址
        private_api_url: 'https://hugo-friendcircle-api.xlap.top',
        // 初始加载几篇文章
        page_init_number: 20,
        // 点击加载更多时，一次最多加载几篇文章，默认10
        page_turning_number: 10,
        // 头像加载失败时，默认头像地址
        error_img: 'https://sdn.geekzu.org/avatar/57d8260dfb55501c37dde588e7c3852c',
        // 进入页面时第一次的排序规则
        sort_rule: 'created',
        // 本地文章缓存数据过期时间（天）
        expire_days: 1, 
    }
</script>
<script type="text/javascript" src="https://npm.elemecdn.com/fcircle-theme-yyyz@1.0.12/dist/fcircle.min.js"></script>