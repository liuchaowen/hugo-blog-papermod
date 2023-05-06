/* 站点统计数据 */
function show_run_day() {
  var BirthDay = new Date("12/27/2022 00:00:00");
  var today = new Date();
  var timeold = today.getTime() - BirthDay.getTime();
  var sectimeold = timeold / 1000;
  var msPerDay = 24 * 60 * 60 * 1000;
  var e_daysold = timeold / msPerDay;
  var daysold = Math.floor(e_daysold);
  document.getElementById("run-num").innerHTML = daysold + "d";
}
show_run_day();

/* 评论数统计 */
getAllUrls(false, (urllist) => {
  twikoo
    .getCommentsCount({
      envId: "https://db.twk.xlap.top", // 环境 ID
      // region: 'ap-guangzhou', // 环境地域，默认为 ap-shanghai，如果您的环境地域不是上海，需传此参数
      urls: urllist,
      includeReply: true, // 评论数是否包括回复，默认：false
    })
    .then(function (res) {
      var count = 0;
      for (let index = 0; index < res.length; index++) {
        const element = res[index];
        count += element.count;
      }
      document.getElementById("comment-num").innerHTML = count;
    })
    .catch(function (err) {
      // 发生错误
      console.error("twikoo err", err);
    });
});

/* 解决加载刷新首页闪屏问题 */
var statDiv = document.getElementsByClassName("site-stat")[0];
if (statDiv.style.display === "none") {
  statDiv.style.display = "block";
} else {
  statDiv.style.display = "none";
}
var iconDiv = document.getElementsByClassName("arrow-icon")[0];
if (iconDiv.style.display === "none") {
  iconDiv.style.display = "block";
} else {
  iconDiv.style.display = "none";
}
