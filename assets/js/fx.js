/* Cureto site, motion layer. Vanilla, no library, no network.
   - fluid colour field (WebGL), falls back to the static CSS gradient
   - scroll reveals, pointer tilt (mouse only), 3D hero mark
   Everything here is skipped under prefers-reduced-motion. */
(function () {
  "use strict";
  var root = document.documentElement;
  var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var phone = window.matchMedia("(max-width: 767px), (pointer: coarse)");

  /* ---------- scroll reveals ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (rmq.matches || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  if (rmq.matches) return; /* static, fully readable */

  /* ---------- pointer tilt (mouse on a fine pointer only) ---------- */
  function tilt(el) {
    var max = parseFloat(el.getAttribute("data-tilt")) || 6, raf = 0, ev = null;
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !fine.matches) return;
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = el.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.setProperty("--ry", ((x - 0.5) * 2 * max).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - y) * 2 * max).toFixed(2) + "deg");
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        el.style.setProperty("--sheen", "1");
      });
    });
    el.addEventListener("pointerleave", function () {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--sheen", "0");
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tilt"), tilt);

  /* ---------- hero mark: follows the pointer a little, drifts with scroll ---------- */
  var mark = document.querySelector(".mark3d");
  var mtilt = document.querySelector(".m-tilt");
  var py = 0;
  function onScroll() {
    if (!mark) return;
    var v = Math.min(window.scrollY, 900) * -0.12;
    if (v !== py) { py = v; mark.style.setProperty("--py", v.toFixed(1)); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- fluid colour field ---------- */
  var field = document.querySelector(".field");
  if (!field) return;
  var cvs = document.createElement("canvas");
  cvs.className = "fluid";
  cvs.setAttribute("aria-hidden", "true");
  var gl = null;
  try { gl = cvs.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" }); } catch (e) {}
  if (!gl) return; /* the static gradient stays */

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH", "precision highp float;", "#else", "precision mediump float;", "#endif",
    "uniform vec2 uRes;uniform float uS,uT,uScroll,uOp,uPA;uniform vec2 uPtr;",
    "uniform vec3 uStage,uP;uniform vec2 uB[5];uniform float uR[5];uniform vec3 uC[5];",
    "void main(){",
    " vec2 p=vec2(gl_FragCoord.x,uRes.y*uS-gl_FragCoord.y)/uS;",
    " p+=26.*vec2(sin(p.y*.008+uT*.35),cos(p.x*.009+uT*.3));",
    " vec3 col=uStage;",
    " for(int i=0;i<5;i++){",
    "  float f=float(i);",
    "  vec2 c=uB[i]+vec2(sin(uT*.11*(1.+f*.37)+f*1.7),cos(uT*.09*(1.+f*.29)+f*2.3))*70.;",
    "  c.y-=uScroll*(.04+.03*f);",
    "  float s=clamp(1.-length(p-c)/uR[i],0.,1.);s=s*s*(3.-2.*s);",
    "  col=mix(col,uC[i],s*uOp);",
    " }",
    " float q=clamp(1.-length(p-uPtr)/320.,0.,1.);q=q*q*(3.-2.*q);",
    " col=mix(col,uP,q*uPA);",
    " col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;",
    " gl_FragColor=vec4(col,1.);}"
  ].join("\n");

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ["uRes", "uS", "uT", "uScroll", "uOp", "uPA", "uPtr", "uStage", "uP", "uB", "uR", "uC"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  function hex(h) {
    h = (h || "").trim();
    if (h.charAt(0) !== "#") return [0.5, 0.5, 0.5];
    if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255];
  }
  /* blob layout mirrors the CSS field: left %, top %, size px (phones use 520) */
  var LAYOUT = [[-0.08, -0.14, 760], [0.58, -0.2, 680], [0.7, 0.44, 720], [-0.1, 0.52, 640], [0.3, 0.3, 520]];
  var W = 0, H = 0, scale = 0.5;
  function colours() {
    var cs = getComputedStyle(root), c = [];
    ["--f1", "--f2", "--f3", "--f4", "--f1"].forEach(function (n) { c = c.concat(hex(cs.getPropertyValue(n))); });
    gl.uniform3fv(U.uC, new Float32Array(c));
    gl.uniform3fv(U.uStage, new Float32Array(hex(cs.getPropertyValue("--stage"))));
    gl.uniform1f(U.uOp, parseFloat(cs.getPropertyValue("--fieldOp")) || 0.9);
    var f1 = hex(cs.getPropertyValue("--f1"));
    var dark = root.getAttribute("data-theme") === "dark";
    gl.uniform3fv(U.uP, new Float32Array([f1[0] + (1 - f1[0]) * (dark ? 0.2 : 0.35), f1[1] + (1 - f1[1]) * (dark ? 0.2 : 0.35), f1[2] + (1 - f1[2]) * (dark ? 0.25 : 0.35)]));
  }
  function size() {
    var ph = phone.matches;
    W = window.innerWidth; H = window.innerHeight;
    scale = ph ? 0.35 : 0.5;
    cvs.width = Math.max(2, Math.round(W * scale));
    cvs.height = Math.max(2, Math.round(H * scale));
    gl.viewport(0, 0, cvs.width, cvs.height);
    var b = [], r = [];
    LAYOUT.forEach(function (l) {
      var s = ph ? 520 : l[2];
      b.push(l[0] * W + s / 2, l[1] * H + s / 2); r.push(s * 0.52);
    });
    gl.uniform2fv(U.uB, new Float32Array(b));
    gl.uniform1fv(U.uR, new Float32Array(r));
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uS, scale);
  }

  var tx = -9999, ty = -9999, px = -9999, py2 = -9999, pa = 0, pat = 0, sy = 0;
  var t0 = performance.now(), last = 0, raf = 0, running = false;
  var fpsGap = 1000 / (phone.matches ? 30 : 45);

  function draw(now) {
    px += (tx - px) * 0.08; py2 += (ty - py2) * 0.08;
    pa += (pat - pa) * 0.06; sy += (window.scrollY - sy) * 0.1;
    gl.uniform1f(U.uT, (now - t0) / 1000);
    gl.uniform1f(U.uScroll, sy);
    gl.uniform2f(U.uPtr, px, py2);
    gl.uniform1f(U.uPA, pa * (root.getAttribute("data-theme") === "dark" ? 0.28 : 0.4));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < fpsGap - 2) return;
    last = now; draw(now);
  }
  function setRun(on) {
    if (on === running) return;
    running = on;
    cvs.setAttribute("data-running", on ? "1" : "0");
    if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
  }
  function want() { setRun(!document.hidden && !rmq.matches); }

  colours(); size();
  draw(performance.now());
  field.appendChild(cvs);
  root.classList.add("gl-on");
  want();

  document.addEventListener("visibilitychange", want);
  if (rmq.addEventListener) rmq.addEventListener("change", function () {
    if (rmq.matches) { setRun(false); root.classList.remove("gl-on"); } else { root.classList.add("gl-on"); want(); }
  });
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (!running) draw(performance.now()); }, 120); });
  new MutationObserver(function () { colours(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  cvs.addEventListener("webglcontextlost", function (e) { e.preventDefault(); setRun(false); root.classList.remove("gl-on"); });

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    tx = e.clientX; ty = e.clientY; pat = 1;
    if (px < -9000) { px = tx; py2 = ty; }
    if (mtilt && fine.matches) {
      mtilt.style.setProperty("--ry", (((e.clientX / W) - 0.5) * 20).toFixed(2) + "deg");
      mtilt.style.setProperty("--rx", (((0.5 - e.clientY / H)) * 14).toFixed(2) + "deg");
    }
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", function () { pat = 0; });
})();
