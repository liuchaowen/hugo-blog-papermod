function viewMoreHeapmap() {
  var imgObj = document.getElementById("view-more-icon");
  if (imgObj.src.includes("arrow-left.svg")) {
    imgObj.src = "/image/arrow-right.svg";
    //一年
    cal.paint({
      animationDuration: 100,
      theme: isDark ? "dark" : "light",
      verticalOrientation: false,
      domain: { type: "month" },
      subDomain: {
        type: "day",
        label: function (timestamp, value) {
          return value;
        },
        sort: "asc",
      },
    });
  } else {
    imgObj.src = "/image/arrow-left.svg";
    cal.paint(options);
  }
  //显隐info
  var infoDiv = document.getElementsByClassName("home-info")[0];
  if (infoDiv.style.display === "none") {
    infoDiv.style.display = "block";
  } else {
    infoDiv.style.display = "none";
  }
}
