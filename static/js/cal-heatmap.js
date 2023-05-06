/*结果变量*/
const weekNum = 8;
const resultObj = {};
const resultList = [];

/*获取index.xml页面的数据*/

//补位0
function Appendzero(obj) {
  if (obj < 10) return "0" + "" + obj;
  else return obj;
}

if (window.XMLHttpRequest) {
  xhttp = new XMLHttpRequest();
} else {
  // IE 5/6
  xhttp = new ActiveXObject("Microsoft.XMLHTTP");
}

var localurl = "/index.xml"; //ssr地址
xhttp.overrideMimeType("text/xml");
xhttp.open("GET", localurl, false);
xhttp.send(null);
xmlDoc = xhttp.responseXML;

//遍历元素
var rootEle = xmlDoc.getElementsByTagName("channel")[0]["children"];
for (var key in rootEle) {
  var element = rootEle[key];
  if (element.nodeName == "item") {
    var child = element["children"];
    var title = child[0];
    var pubDate = child[2];
    if (pubDate.textContent == "" || title.textContent == "") {
      continue;
    }
    var date = new Date(pubDate.textContent);
    var dateFormat =
      date.getFullYear() +
      "-" +
      Appendzero(date.getMonth() + 1) +
      "-" +
      Appendzero(date.getDate());
    if (resultObj.hasOwnProperty(dateFormat)) {
      resultObj[dateFormat]["num"]++;
      resultObj[dateFormat]["postTitles"] += "," + title.textContent;
    } else {
      resultObj[dateFormat] = {};
      resultObj[dateFormat]["num"] = 1;
      resultObj[dateFormat]["postTitles"] = title.textContent;
    }
  }
}
//遍历obj，放入list
for (var key in resultObj) {
  var val = resultObj[key];
  var tmpJson = { date: key, value: val["num"], title: val["postTitles"] };
  resultList.push(tmpJson);
}
// console.log("HeatMap处理后的结果", resultList);

/*获取数据*/

//获取上几个星期的天
function getLastNWeeksDate(n) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * n);
}
//获取这星期的周一
function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}
//获取上8个月前的第一天
function getLastTwelveMonthDate() {
  var day = new Date();
  day.setDate(1); //日期设置为这个月的1号
  day.setMonth(day.getMonth() - 8); //修改月份
  return new Date(day);
}
var lastnweekday = getLastNWeeksDate(weekNum - 2);
var weekFirstDay = getMonday(lastnweekday);
var monthStartDate = getLastTwelveMonthDate();
const cal = new CalHeatmap();

/*深色与明亮主题初始值判断*/
var isDark = document.body.className.includes("dark");
// console.log("是否深色主题", isDark);
var hlDate = new Date().toLocaleDateString();
var hlArr = hlDate.split("/");
var dateFormat = hlArr[0] + "-" + Appendzero(hlArr[1]) + "-" + Appendzero(hlArr[2]);
var realHLDate = new Date(dateFormat);

/* 周参数 */
var weekOptions = {
  animationDuration: 200,
  theme: isDark ? "dark" : "light",
  verticalOrientation: true,
  date: {
    start: weekFirstDay, //开始时间为上8-2个周的周一
    highlight: [realHLDate],
    locale: { weekStart: 1 }, //周一为第一天
  },
  domain: {
    type: "week",
    label: {
      position: "right",
      text: null, //不显示标签
    },
  },
  range: weekNum,
  subDomain: {
    width: 12,
    height: 12,
    type: "day",
    // label: "D", //D是显示日期的日；null是不显示；回调函数是自定义
    label: function (timestamp, value) {
      return value;
    },
    sort: "asc",
  },
  data: {
    type: "json",
    source: resultList,
    x: "date",
    y: "value",
  },
  scale: {
    color: {
      range: ["#eea2a4", "#5c2223"], //[浅色，深色]
      interpolate: "hsl",
      type: "linear",
      domain: [0, 5], //文章数阈值：[min,max]
    },
  },
};
/* 月参数 */
var monthOptions = {
  date: {
    start: monthStartDate,
  },
  animationDuration: 200,
  theme: isDark ? "dark" : "light",
  verticalOrientation: false,
  domain: { type: "month" },
  subDomain: {
    width: 12,
    height: 12,
    type: "day",
    label: function (timestamp, value) {
      return value;
    },
    sort: "asc",
  },
};
/*深色与明亮主题切换监听*/
document.getElementById("theme-toggle").addEventListener("click", () => {
  location.reload(); // 由于没有重新渲染的函数，只能刷新界面
});

/*渲染*/
cal.paint(weekOptions);

/* 查看今年Heatmap */
function viewMoreHeapmap() {
  var imgObj = document.getElementById("view-more-icon");
  if (imgObj.src.includes("arrow-left.svg")) {
    // console.log("切换成月份", monthOptions);
    imgObj.src = "/image/arrow-right.svg";
    cal.paint(monthOptions);
  } else {
    // console.log("切换成周", weekOptions);
    imgObj.src = "/image/arrow-left.svg";
    cal.paint(weekOptions);
  }
  //显隐info
  setTimeout(() => {
    var infoDiv = document.getElementsByClassName("home-info")[0];
    var statDiv = document.getElementsByClassName("site-stat")[0];
    if (infoDiv.style.display === "none") {
      infoDiv.style.display = "block";
    } else {
      infoDiv.style.display = "none";
    }
    if (statDiv.style.display === "none") {
      statDiv.style.display = "block";
    } else {
      statDiv.style.display = "none";
    }
  }, 100);
}

/*初始点击的数据*/
let listObj = {}
function initClickUrls() {
  fetch("/index.xml")
    .then((res) => res.text())
    .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
    .then((data) => {
      let ls = data.querySelectorAll("channel item");
      listObj = {};
      ls.forEach(element => {
        let eleCollect = element.children;
        let dateStr = eleCollect.item(2).textContent;
        let url = eleCollect.item(3).textContent;
        let dateTs = Date.parse(dateStr);
        var date = new Date(dateTs);
        var ymd = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
        if (listObj.hasOwnProperty(ymd)) {
          listObj[ymd]['url'].push(url);
        }
        else {
          listObj[ymd] = { 'date': ymd, 'url': [url] };
        }
      });
    });
}
initClickUrls();

//事件处理
cal.on("mouseover", (event, timestamp, value) => {
  var date = new Date(timestamp);
  var dateFormat = date.getFullYear() + "/" + Appendzero(date.getMonth() + 1) + "/" + Appendzero(date.getDate());
  var str = '周' + '日一二三四五六'.charAt(new Date(timestamp).getDay());
  var tips = "";
  if (value == null) {
    tips = str + " " + dateFormat + " , 懒虫!";
  }
  else {
    tips = str + " " + dateFormat + " , " + value + " 篇";
  }
  tippy(event.target, {
    placement: "top",
    content: tips,
  });
});
cal.on('click', (event, timestamp, value) => {
  var date = new Date(timestamp);
  var ymd = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
  var dateObj = listObj[ymd];
  if (dateObj) {
    var urlList = dateObj.url;
    if (urlList && urlList.length > 0) {
      var locationHref = urlList[Math.floor(Math.random() * urlList.length)];
      location.href = locationHref;
    }
  }
});