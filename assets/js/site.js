/* Cureto site: header shadow on scroll, Light/Dark switch, contact-form checks. Vanilla, no dependencies. */
(function () {
  "use strict";

  /* header: transparent until the page scrolls 8 px */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* theme switch (radiogroup) */
  var seg = document.querySelector("[data-theme-switch]");
  if (seg) {
    var buttons = Array.prototype.slice.call(seg.querySelectorAll("button"));
    var sync = function () {
      var cur = document.documentElement.getAttribute("data-theme");
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-value") === cur;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
    };
    var set = function (v) {
      document.documentElement.setAttribute("data-theme", v);
      try { localStorage.setItem("cureto-theme", v); } catch (e) {}
      sync();
    };
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { set(b.getAttribute("data-value")); });
      b.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowRight" || k === "ArrowDown") n = (i + 1) % buttons.length;
        if (k === "ArrowLeft" || k === "ArrowUp") n = (i - 1 + buttons.length) % buttons.length;
        if (n !== null) { e.preventDefault(); set(buttons[n].getAttribute("data-value")); buttons[n].focus(); }
      });
    });
    sync();
  }

  /* contact form */
  var form = document.getElementById("contact-form");
  if (!form) return;
  var btn = form.querySelector("button[type=submit]");
  var rules = {
    name: function (v) { return v.trim() ? "" : "Please tell us your name."; },
    email: function (v) {
      if (!v.trim()) return "Please enter your email address.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "That email address does not look right. It should look like name@example.com.";
    },
    phone: function (v) {
      if (!v.trim()) return "";
      var d = v.replace(/\D/g, "");
      return d.length >= 7 && d.length <= 15 ? "" : "Please check the phone number, or leave it empty.";
    },
    message: function (v) { return v.trim() ? "" : "Please write a short message."; }
  };
  function check(field) {
    var msg = rules[field.name](field.value);
    var out = document.getElementById("err-" + field.name);
    out.textContent = msg;
    if (msg) field.setAttribute("aria-invalid", "true"); else field.removeAttribute("aria-invalid");
    return !msg;
  }
  var fields = Object.keys(rules).map(function (n) { return form.elements[n]; });
  fields.forEach(function (f) {
    f.addEventListener("blur", function () { if (f.value || f.hasAttribute("aria-invalid")) check(f); });
    f.addEventListener("input", function () { if (f.hasAttribute("aria-invalid")) check(f); });
  });
  form.addEventListener("submit", function (e) {
    var first = null;
    fields.forEach(function (f) { if (!check(f) && !first) first = f; });
    if (first) { e.preventDefault(); first.focus(); return; }
    btn.disabled = true;
    btn.textContent = "Sending…";
  });
  /* if the visitor comes back with the browser's Back button, the form must work again */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && btn) { btn.disabled = false; btn.textContent = "Send message"; }
  });
})();
