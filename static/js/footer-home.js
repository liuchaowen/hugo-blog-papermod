/* 查看今年Heatmap */
function viewMoreHeapmap() {
  var imgObj = document.getElementById("view-more-icon");
  if (imgObj.src.includes("arrow-left.svg")) {
    imgObj.src = "/image/arrow-right.svg";
    //一年
    cal.paint({
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
    });
  } else {
    imgObj.src = "/image/arrow-left.svg";
    options.verticalOrientation = true;
    cal.paint(options);
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

/* 站点统计数据 */
function show_run_day() {
  var BirthDay = new Date("12/27/2022 00:00:00");
  var today = new Date();
  var timeold = (today.getTime() - BirthDay.getTime());
  var sectimeold = timeold / 1000
  var msPerDay = 24 * 60 * 60 * 1000
  var e_daysold = timeold / msPerDay
  var daysold = Math.floor(e_daysold);
  document.getElementById("run-num").innerHTML = daysold;
}
show_run_day();