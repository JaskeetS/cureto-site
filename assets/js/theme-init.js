/* Runs in <head>, before first paint: follow the device first, then the visitor's remembered choice. */
(function () {
  var t = null;
  try { t = localStorage.getItem("cureto-theme"); } catch (e) {}
  if (t !== "light" && t !== "dark") {
    t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.className += " js";
})();
