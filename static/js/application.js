/**
 * utteranc主题切换
 * utteranc:基于github issue的静态评论插件
 * [因为只能github账号登录才能评论，对非开发人员不友好，故弃用，改用twikoo]
 */

/*
var DARK_THEME = "github-dark";
var LIGHT_THEME = "github-light";
var REPO = "liuchaowen/hugo-blog-papermod";
var LABEL = "Comment"; //can be empty
// Defer loading utterances until everything else is loaded.
// This way more important page content is prioritized.
window.addEventListener("load", () => {
  var initialTheme = DARK_THEME;
  if (document.body.className.includes("dark")) {
    initialTheme = DARK_THEME;
  } else {
    initialTheme = LIGHT_THEME;
  }

  // Add script that loads utterance
  var commentsContainer = document.getElementById("comments");
  if (commentsContainer) {
    const s = document.createElement("script");
    s.src = "https://utteranc.es/client.js";
    s.setAttribute("repo", REPO);
    s.setAttribute("issue-term", "pathname");
    s.setAttribute("label", LABEL);
    s.setAttribute("theme", initialTheme);
    s.setAttribute("crossorigin", "anonymous");
    s.setAttribute("async", "");
    commentsContainer.appendChild(s);
  }
});

document.getElementById("theme-toggle").addEventListener("click", () => {
  var theme = DARK_THEME;
  if (document.body.className.includes("dark")) {
    theme = DARK_THEME;
  } else {
    theme = LIGHT_THEME;
  }
  console.log("change theme", theme);
  for (const frame of document.getElementsByClassName("utterances-frame")) {
    frame.contentWindow.postMessage({ type: "set-theme", theme: theme }, "*");
  }
});
*/

/* 获取所有路径 */
function getAllUrls(isFullUrl, cb) {
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
          else {
            var uriList = new URL(ele);
            list.push(uriList.pathname);
          }
        }
      });
      cb && cb(list);
    });
}

/* 随机阅读文章 */
function randomPost() {
  getAllUrls(true, (list) => {
    locationHref = list[Math.floor(Math.random() * list.length)];
    location.href = locationHref;
  })
}

/* 代码折叠 */
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
function initCodeHlEvent() {
  var divs = document.querySelectorAll('.highlight-wrapper');
  for (i = 0; i < divs.length; i++) {
    divs[i].addEventListener("mouseover", ()=>{
      showMouseOver()
    });
    divs[i].addEventListener("mouseout", ()=>{
      showMouseOut()
    });
  }
}

function showMouseOver() {
  var tags = document.querySelectorAll('.highlight-before');
  for (i = 0; i < tags.length; i++) {
    var tag = tags[i];
    tag.style.display = "block";
  }
}

function showMouseOut() {
  var tags = document.querySelectorAll('.highlight-before');
  for (i = 0; i < tags.length; i++) {
    var tag = tags[i];
    tag.style.display = "none";
  }
}

window.onload = function () {
  initCodeHlEvent();
}