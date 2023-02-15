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
