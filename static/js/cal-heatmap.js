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
    var pubDate = child[2];
    if (pubDate && pubDate.textContent) {
      var date = new Date(pubDate.textContent);
      var dateFormat =
        date.getFullYear() +
        "-" +
        Appendzero(date.getMonth() + 1) +
        "-" +
        Appendzero(date.getDate());
      if (resultObj.hasOwnProperty(dateFormat)) {
        resultObj[dateFormat]++;
      } else {
        resultObj[dateFormat] = 1;
      }
    }
  }
}
//遍历obj，放入list
for (var key in resultObj) {
  var val = resultObj[key];
  var tmpJson = { date: key, value: val };
  resultList.push(tmpJson);
}
console.log("HeatMap处理后的结果", resultList);

/*渲染数据*/

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
var lastnweekday = getLastNWeeksDate(weekNum - 2);
var firstday = getMonday(lastnweekday);

const cal = new CalHeatmap();

//一年
// cal.paint({
//   theme: "dark",
//   domain: { type: "month" },
//   subDomain: { type: "day", label: "D", sort: "asc" },
// });

//一月
// cal.paint({
//   theme: "dark",
//   domain: {
//     type: "month",
//     label: {
//       text: null, //不显示标签
//     },
//   },
//   range: 1,
//   subDomain: { type: "day", label: "D", sort: "asc" },
// });

//两个月，即8周
cal.paint({
  theme: "dark",
  verticalOrientation: true,
  date: {
    start: firstday, //开始时间为上8-2个周的周一
    highlight: new Date(),
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
});

//事件处理
cal.on("mouseover", (event, timestamp, value) => {
  var date = new Date(timestamp).toLocaleDateString();
  if (value == null) {
    value = 0;
  }
  tippy(event.target, {
    placement: "top",
    content: date + " , " + value + " Posts",
  });
});
