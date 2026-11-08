/* ============================================================
   Chemistry Academy · 交互引擎
   —— 所有教程页面统一引用：assets/tutor.js
   职责：三级讲解阶梯 / 例题脚手架步进 / 自测引擎 / 目录高亮
   约定：每个功能独立初始化并容错，任何组件损坏不影响其他功能
   ============================================================ */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ---------- 1. 三级讲解阶梯 ---------- */
  function initLadders(root) {
    (root || document).querySelectorAll(".ladder").forEach(function (ladder) {
      var tabs = ladder.querySelectorAll(".ladder-tab");
      var panels = ladder.querySelectorAll(".ladder-panel");
      tabs.forEach(function (tab, i) {
        tab.setAttribute("role", "tab");
        tab.addEventListener("click", function () {
          tabs.forEach(function (t, j) {
            t.classList.toggle("is-active", j === i);
            t.setAttribute("aria-selected", j === i ? "true" : "false");
          });
          panels.forEach(function (p, j) {
            p.classList.toggle("is-active", j === i);
          });
        });
      });
      if (tabs.length) { tabs[0].classList.add("is-active"); tabs[0].setAttribute("aria-selected", "true"); }
      if (panels.length) panels[0].classList.add("is-active");
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

  /* ---------- 3. 自测引擎 ---------- */
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
            score.textContent = "已答 " + answered + "/" + questions.length +
              " · 正确 " + correct;
            if (answered === questions.length) {
              var pct = Math.round(correct / questions.length * 100);
              score.textContent += "（" + pct + "%）";
            }
          }
        });
        opts.appendChild(btn);
      });

      qDiv.appendChild(opts);
      qDiv.appendChild(explain);
      body.appendChild(qDiv);
    });

    // 若页面没有预置 .quiz-body，则注入
    if (!box.querySelector(".quiz-body")) box.appendChild(body);

    if (score) score.textContent = "共 " + questions.length + " 题";
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

  /* ---------- 启动 ---------- */
  ready(function () {
    try { initLadders(null); } catch (e) { console.warn(e); }
    try { initWorked(null); } catch (e) { console.warn(e); }
    try { initQuizzes(null); } catch (e) { console.warn(e); }
    try { initTocSpy(); } catch (e) { console.warn(e); }
  });

  /* 暴露给章节页自定义动画使用 */
  window.DSHChem = {
    initLadders: initLadders,
    initWorked: initWorked,
    initQuizzes: initQuizzes
  };
})();
