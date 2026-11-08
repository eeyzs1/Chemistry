/* ============================================================
   Chemistry Academy · 交互引擎
   —— 所有教程页面统一引用：assets/tutor.js
   职责：三级讲解阶梯 / 例题脚手架步进 / 自测引擎 / 目录高亮 /
         共享 SVG 辅助 el() / 视口感知动画循环 autoloop /
         自测最佳成绩与分支进度徽章 / 回到顶部
   约定：每个功能独立初始化并容错，任何组件损坏不影响其他功能
   ============================================================ */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ---------- 0. 共享工具 ---------- */
  var SVGNS = "http://www.w3.org/2000/svg";

  /* 创建 SVG 元素：<el("circle", {r:5, fill:"#fff"}, parent, "文本")> */
  function el(tag, attrs, parent, text) {
    var node = document.createElementNS(SVGNS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  /* 系统"减少动态效果"偏好 */
  function prefersReduced() {
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* 视口感知动画循环：元素在视口内且页面可见时才跑，滚出/切走自动暂停。
     frameFn 不再自行调用 requestAnimationFrame；返回 {start, stop}。 */
  function autoloop(watchEl, frameFn, opts) {
    opts = opts || {};
    var running = false, rafId = null, visible = false;
    var minDt = opts.maxFps ? 1000 / opts.maxFps : 0;
    var last = 0;

    function tick(ts) {
      rafId = null;
      if (!running) return;
      if (minDt && ts - last < minDt) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      last = ts;
      frameFn(ts);
      if (running) rafId = requestAnimationFrame(tick);
    }
    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }
    function update() {
      if (visible && !document.hidden) start();
      else stop();
    }

    if ("IntersectionObserver" in window && watchEl) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible = en.isIntersecting; });
        update();
      }, { rootMargin: opts.rootMargin || "80px" });
      io.observe(watchEl);
    } else {
      visible = true;
      update();
    }
    document.addEventListener("visibilitychange", update);
    return { start: start, stop: stop };
  }

  /* ---------- 进度存取（localStorage，容错：不可用时静默降级） ---------- */
  var PROG_KEY = "dshchem:progress";

  function readProg() {
    try { return JSON.parse(localStorage.getItem(PROG_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function writeProg(store) {
    try { localStorage.setItem(PROG_KEY, JSON.stringify(store)); } catch (e) {}
  }
  /* 进度键 = 分支 body class + 页面文件名（跨页面稳定） */
  function pageKey(fileName) {
    var b = (document.body.className.match(/b\d{2}/) || [""])[0];
    var p = fileName || location.pathname.split("/").pop() || location.href;
    try { p = decodeURIComponent(p); } catch (e) {}
    return b + ":" + p;
  }

  /* ---------- 1. 三级讲解阶梯 ---------- */
  function initLadders(root) {
    (root || document).querySelectorAll(".ladder").forEach(function (ladder, li) {
      var tabs = ladder.querySelectorAll(".ladder-tab");
      var panels = ladder.querySelectorAll(".ladder-panel");
      var tabsWrap = ladder.querySelector(".ladder-tabs");
      if (tabsWrap) tabsWrap.setAttribute("role", "tablist");

      function activate(i) {
        tabs.forEach(function (t, j) {
          var on = j === i;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p, j) { p.classList.toggle("is-active", j === i); });
      }

      panels.forEach(function (p, j) {
        p.setAttribute("role", "tabpanel");
        if (!p.id) p.id = "ladder" + li + "-panel" + j;
        if (tabs[j]) tabs[j].setAttribute("aria-controls", p.id);
      });

      tabs.forEach(function (tab, i) {
        tab.setAttribute("role", "tab");
        tab.setAttribute("type", "button");
        tab.addEventListener("click", function () { activate(i); });
        tab.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          var n = (i + d + tabs.length) % tabs.length;
          activate(n);
          tabs[n].focus();
        });
      });
      activate(0);
    });
  }

  /* ---------- 2. 例题脚手架步进 ---------- */
  function initWorked(root) {
    (root || document).querySelectorAll(".worked").forEach(function (box) {
      var steps = Array.prototype.slice.call(box.querySelectorAll(".worked-steps .step"));
      if (!steps.length) return;
      var btnNext = box.querySelector(".js-step-next");
      var btnAll  = box.querySelector(".js-step-all");
      var btnReset= box.querySelector(".js-step-reset");
      var shown = 0;

      function render() {
        steps.forEach(function (s, i) { s.classList.toggle("is-shown", i < shown); });
        if (btnNext) {
          if (shown >= steps.length) {
            btnNext.disabled = true;
            btnNext.textContent = "已完成 ✓";
          } else {
            btnNext.disabled = false;
            btnNext.textContent = "下一步（" + shown + "/" + steps.length + "）";
          }
        }
      }
      if (btnNext) btnNext.addEventListener("click", function () { if (shown < steps.length) { shown++; render(); } });
      if (btnAll)  btnAll.addEventListener("click",  function () { shown = steps.length; render(); });
      if (btnReset)btnReset.addEventListener("click",function () { shown = 0; render(); });
      render();
    });
  }

  /* ---------- 3. 自测引擎（含最佳成绩记录） ---------- */
  var KEYS = ["A", "B", "C", "D", "E", "F"];

  function buildQuiz(box) {
    var dataScript = box.querySelector("script.quiz-data");
    if (!dataScript) return;
    var data;
    try { data = JSON.parse(dataScript.textContent); }
    catch (e) { console.warn("quiz JSON 解析失败：", e); return; }
    var questions = data.questions || [];
    if (!questions.length) return;

    var body = document.createElement("div");
    body.className = "quiz-body";

    var answered = 0, correct = 0;
    var score = box.querySelector(".quiz-score");

    var prog = readProg();
    var myKey = pageKey();
    var best = (typeof prog[myKey] === "number") ? prog[myKey] : null;

    function scoreText(extra) {
      var s = "已答 " + answered + "/" + questions.length + " · 正确 " + correct;
      if (extra) s += extra;
      return s;
    }

    questions.forEach(function (q, qi) {
      var qDiv = document.createElement("div");
      qDiv.className = "quiz-q";

      var qText = document.createElement("div");
      qText.className = "q-text";
      var no = document.createElement("span");
      no.className = "q-no";
      no.textContent = "Q" + (qi + 1);
      qText.appendChild(no);
      qText.appendChild(document.createTextNode(q.q));
      qDiv.appendChild(qText);

      var opts = document.createElement("div");
      opts.className = "quiz-opts";

      var explain = document.createElement("div");
      explain.className = "quiz-explain";

      (q.options || []).forEach(function (optText, oi) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-opt";
        var key = document.createElement("span");
        key.className = "opt-key";
        key.textContent = KEYS[oi] || String(oi + 1);
        btn.appendChild(key);
        btn.appendChild(document.createTextNode(optText));

        btn.addEventListener("click", function () {
          if (qDiv.dataset.done) return;
          qDiv.dataset.done = "1";
          answered++;
          var isRight = (oi === q.answer);
          if (isRight) correct++;
          Array.prototype.forEach.call(opts.children, function (b, bj) {
            b.disabled = true;
            if (bj === q.answer) b.classList.add("correct");
          });
          if (!isRight) btn.classList.add("wrong");
          explain.innerHTML = (isRight
            ? "<b class='good'>✓ 回答正确。</b> "
            : "<b class='bad'>✗ 再想想。</b> ") + (q.explain || "");
          explain.classList.add("is-shown");
          if (score) {
            var tail = "";
            if (answered === questions.length) {
              var pct = Math.round(correct / questions.length * 100);
              tail = "（" + pct + "%）";
              var isRecord = (best === null || pct > best);
              if (isRecord) {
                best = pct;
                prog[myKey] = pct;
                writeProg(prog);
                tail += " 🏆 新纪录";
              } else if (best !== null) {
                tail += " · 历史最佳 " + best + "%";
              }
            }
            score.textContent = scoreText(tail);
          }
        });
        opts.appendChild(btn);
      });

      qDiv.appendChild(opts);
      qDiv.appendChild(explain);
      body.appendChild(qDiv);
    });

    box.appendChild(body);

    if (score) {
      score.textContent = "共 " + questions.length + " 题" +
        (best !== null ? " · 历史最佳 " + best + "%" : "");
    }
  }

  function initQuizzes(root) {
    (root || document).querySelectorAll(".quiz").forEach(buildQuiz);
  }

  /* ---------- 4. 目录滚动高亮 ---------- */
  function initTocSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    var sections = [];
    links.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute("href").slice(1));
      if (sec) { map[sec.id] = a; sections.push(sec); }
    });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.style.background = ""; a.style.color = ""; });
          var a = map[en.target.id];
          if (a) { a.style.background = "var(--accent-soft)"; a.style.color = "var(--accent-deep)"; }
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach(function (s) { obs.observe(s); });
  }

  /* ---------- 5. 分支导学页：章节进度徽章 ---------- */
  function initLessonProgress(root) {
    var cards = (root || document).querySelectorAll(".lesson-card");
    if (!cards.length) return;
    var prog = readProg();
    cards.forEach(function (card) {
      var href = (card.getAttribute("href") || "").split("/").pop();
      if (!href) return;
      var pct = prog[pageKey(href)];
      if (typeof pct !== "number") return;
      var meta = card.querySelector(".lc-meta");
      if (!meta || meta.querySelector(".lc-done, .lc-part")) return;
      var b = document.createElement("span");
      if (pct >= 80) { b.className = "lc-done"; b.textContent = "✓ 已通过 " + pct + "%"; }
      else { b.className = "lc-part"; b.textContent = "最佳 " + pct + "%"; }
      meta.appendChild(b);
    });
  }

  /* ---------- 6. 回到顶部 ---------- */
  function initBackTop() {
    if (!document.querySelector(".page")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "backtop";
    btn.textContent = "↑ 顶部";
    btn.setAttribute("aria-label", "回到页面顶部");
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    });
    document.body.appendChild(btn);
    function show() { btn.classList.toggle("is-shown", (window.scrollY || window.pageYOffset) > 600); }
    window.addEventListener("scroll", show, { passive: true });
    show();
  }

  /* ---------- 启动 ---------- */
  ready(function () {
    try { initLadders(null); } catch (e) { console.warn(e); }
    try { initWorked(null); } catch (e) { console.warn(e); }
    try { initQuizzes(null); } catch (e) { console.warn(e); }
    try { initTocSpy(); } catch (e) { console.warn(e); }
    try { initLessonProgress(null); } catch (e) { console.warn(e); }
    try { initBackTop(); } catch (e) { console.warn(e); }
  });

  /* 暴露给章节页自定义动画使用 */
  window.DSHChem = {
    el: el,
    autoloop: autoloop,
    prefersReduced: prefersReduced,
    initLadders: initLadders,
    initWorked: initWorked,
    initQuizzes: initQuizzes
  };
})();
