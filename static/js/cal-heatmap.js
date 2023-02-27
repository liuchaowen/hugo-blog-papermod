/*结果变量*/

var resultObj = {};
var resultList = [];

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

var localurl = "/index.xml";
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

//获取上个月的头天
function getLastMonthFirstDate() {
  var date = new Date();
  var firstDay = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return firstDay;
}

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
  date: { start: getLastMonthFirstDate() }, //开始时间为上个月的第一天，即看前一个月与当前月的数据
  domain: {
    type: "week",
    label: {
      position: "right",
      text: null, //不显示标签
    },
  },
  range: 8,
  subDomain: {
    width: 12,
    height: 12,
    type: "day",
    label: "D",
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
  console.log(date + "," + value + " post");
});
