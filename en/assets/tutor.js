/* ============================================================
   Chemistry Academy · Interactive Engine (English edition)
   —— Linked by every tutorial page: assets/tutor.js
   Responsibilities: three-level explanation ladders / worked-example
   scaffold stepping / self-test engine / TOC scroll highlight /
   shared SVG helper el() / viewport-aware animation loop autoloop /
   self-test best scores and branch progress badges / back-to-top /
     language switching (EN ↔ 中文)
   Convention: every feature initializes independently and fails
   gracefully; a broken component never affects the others
   ============================================================ */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ---------- 0. Shared utilities ---------- */
  var SVGNS = "http://www.w3.org/2000/svg";

  /* Create an SVG element: <el("circle", {r:5, fill:"#fff"}, parent, "text")> */
  function el(tag, attrs, parent, text) {
    var node = document.createElementNS(SVGNS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  /* System "reduced motion" preference */
  function prefersReduced() {
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* Viewport-aware animation loop: runs only while the element is in the
     viewport and the page is visible; pauses automatically when scrolled
     away or hidden. frameFn no longer calls requestAnimationFrame itself;
     returns {start, stop}. */
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

  /* ---------- Progress storage (localStorage; fail-safe: silently
       degrades when unavailable) ---------- */
  var PROG_KEY = "dshchem:progress";

  function readProg() {
    try { return JSON.parse(localStorage.getItem(PROG_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function writeProg(store) {
    try { localStorage.setItem(PROG_KEY, JSON.stringify(store)); } catch (e) {}
  }
  /* Progress key = branch body class + page file name (stable across pages) */
  function pageKey(fileName) {
    var b = (document.body.className.match(/b\d{2}/) || [""])[0];
    var p = fileName || location.pathname.split("/").pop() || location.href;
    try { p = decodeURIComponent(p); } catch (e) {}
    return b + ":" + p;
  }

  /* ---------- 1. Three-level explanation ladder ---------- */
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

  /* ---------- 2. Worked-example scaffold stepping ---------- */
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
            btnNext.textContent = "Done ✓";
          } else {
            btnNext.disabled = false;
            btnNext.textContent = "Next step (" + shown + "/" + steps.length + ")";
          }
        }
      }
      if (btnNext) btnNext.addEventListener("click", function () { if (shown < steps.length) { shown++; render(); } });
      if (btnAll)  btnAll.addEventListener("click",  function () { shown = steps.length; render(); });
      if (btnReset)btnReset.addEventListener("click",function () { shown = 0; render(); });
      render();
    });
  }

  /* ---------- 3. Self-test engine (with best-score tracking) ---------- */
  var KEYS = ["A", "B", "C", "D", "E", "F"];

  function buildQuiz(box) {
    var dataScript = box.querySelector("script.quiz-data");
    if (!dataScript) return;
    var data;
    try { data = JSON.parse(dataScript.textContent); }
    catch (e) { console.warn("quiz JSON parse failed: ", e); return; }
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
      var s = "Answered " + answered + "/" + questions.length + " · Correct " + correct;
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
            ? "<b class='good'>✓ Correct.</b> "
            : "<b class='bad'>✗ Try again.</b> ") + (q.explain || "");
          explain.classList.add("is-shown");
          if (score) {
            var tail = "";
            if (answered === questions.length) {
              var pct = Math.round(correct / questions.length * 100);
              tail = " (" + pct + "%)";
              var isRecord = (best === null || pct > best);
              if (isRecord) {
                best = pct;
                prog[myKey] = pct;
                writeProg(prog);
                tail += " 🏆 New record";
              } else if (best !== null) {
                tail += " · best " + best + "%";
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
      score.textContent = questions.length + (questions.length === 1 ? " question" : " questions") +
        (best !== null ? " · best " + best + "%" : "");
    }
  }

  function initQuizzes(root) {
    (root || document).querySelectorAll(".quiz").forEach(buildQuiz);
  }

  /* ---------- 4. TOC scroll highlight ---------- */
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

  /* ---------- 5. Branch overview page: chapter progress badges ---------- */
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
      if (pct >= 80) { b.className = "lc-done"; b.textContent = "✓ Passed " + pct + "%"; }
      else { b.className = "lc-part"; b.textContent = "Best " + pct + "%"; }
      meta.appendChild(b);
    });
  }

  /* ---------- 6. Back to top ---------- */
  function initBackTop() {
    if (!document.querySelector(".page")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "backtop";
    btn.textContent = "↑ Top";
    btn.setAttribute("aria-label", "Back to top of page");
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    });
    document.body.appendChild(btn);
    function show() { btn.classList.toggle("is-shown", (window.scrollY || window.pageYOffset) > 600); }
    window.addEventListener("scroll", show, { passive: true });
    show();
  }

  /* ---------- 7. Language switch (EN <-> 中文) ---------- */
  /* Page correspondence table: [body class, Chinese file, English file]; an empty
     class means a root-level page. On a hit, an EN / 中文 toggle is appended to the
     right of the breadcrumbs; on a miss, this silently does nothing. */
  var LANG_PAIRS = [
    ["", "index.html", "index.html"],
    ["b00", "index.html", "index.html"],
    ["b00", "01-原子与元素.html", "01-Atoms-and-Elements.html"],
    ["b00", "02-化学键与分子结构.html", "02-Chemical-Bonding-and-Molecular-Structure.html"],
    ["b00", "03-化学反应与化学计量.html", "03-Chemical-Reactions-and-Stoichiometry.html"],
    ["b00", "04-物态与溶液.html", "04-States-of-Matter-and-Solutions.html"],
    ["b01", "index.html", "index.html"],
    ["b01", "01-元素周期律.html", "01-The-Periodic-Law.html"],
    ["b01", "02-主族元素.html", "02-Main-Group-Elements.html"],
    ["b01", "03-过渡金属与配位化学.html", "03-Transition-Metals-and-Coordination-Chemistry.html"],
    ["b01", "04-酸碱与水溶液.html", "04-Acids-Bases-and-Aqueous-Chemistry.html"],
    ["b02", "index.html", "index.html"],
    ["b02", "01-碳骨架与官能团.html", "01-Carbon-Skeletons-and-Functional-Groups.html"],
    ["b02", "02-立体化学.html", "02-Stereochemistry.html"],
    ["b02", "03-反应机理入门.html", "03-Introduction-to-Reaction-Mechanisms.html"],
    ["b02", "04-官能团反应巡礼.html", "04-A-Tour-of-Functional-Group-Reactions.html"],
    ["b03", "index.html", "index.html"],
    ["b03", "01-概论与数据处理.html", "01-Introduction-and-Data-Treatment.html"],
    ["b03", "02-滴定与化学分析.html", "02-Titration-and-Classical-Analysis.html"],
    ["b03", "03-仪器分析三剑客.html", "03-The-Big-Three-of-Instrumental-Analysis.html"],
    ["b04", "index.html", "index.html"],
    ["b04", "01-化学热力学.html", "01-Chemical-Thermodynamics.html"],
    ["b04", "02-化学动力学.html", "02-Chemical-Kinetics.html"],
    ["b04", "03-电化学.html", "03-Electrochemistry.html"],
    ["b04", "04-量子化学与分子结构.html", "04-Quantum-Chemistry-and-Molecular-Structure.html"],
    ["b05", "index.html", "index.html"],
    ["b05", "01-生物分子四大家族.html", "01-The-Four-Families-of-Biomolecules.html"],
    ["b05", "02-酶与代谢.html", "02-Enzymes-and-Metabolism.html"],
    ["b05", "03-遗传信息的化学.html", "03-The-Chemistry-of-Genetic-Information.html"],
    ["b06", "index.html", "index.html"],
    ["b06", "01-从单体到聚合物.html", "01-From-Monomers-to-Polymers.html"],
    ["b07", "index.html", "index.html"],
    ["b07", "01-材料的化学世界.html", "01-The-Chemical-World-of-Materials.html"],
    ["b08", "index.html", "index.html"],
    ["b08", "01-化学与环境.html", "01-Chemistry-and-the-Environment.html"],
    ["b09", "index.html", "index.html"],
    ["b09", "01-用计算机做实验.html", "01-Experiments-in-Silico.html"],
    ["b10", "index.html", "index.html"],
    ["b10", "01-药物设计的化学.html", "01-The-Chemistry-of-Drug-Design.html"],
    ["b11", "index.html", "index.html"],
    ["b11", "01-原子核的化学.html", "01-Chemistry-of-the-Atomic-Nucleus.html"]
  ];
  var LANG_ZH_FOLDERS = {
    b00: "00-化学总论", b01: "01-无机化学", b02: "02-有机化学", b03: "03-分析化学",
    b04: "04-物理化学", b05: "05-生物化学", b06: "06-高分子化学", b07: "07-材料化学",
    b08: "08-环境化学", b09: "09-理论与计算化学", b10: "10-药物化学", b11: "11-核化学与放射化学"
  };
  var LANG_EN_FOLDERS = {
    b00: "00-Foundations", b01: "01-Inorganic-Chemistry", b02: "02-Organic-Chemistry",
    b03: "03-Analytical-Chemistry", b04: "04-Physical-Chemistry", b05: "05-Biochemistry",
    b06: "06-Polymer-Chemistry", b07: "07-Materials-Chemistry", b08: "08-Environmental-Chemistry",
    b09: "09-Theoretical-and-Computational-Chemistry", b10: "10-Medicinal-Chemistry",
    b11: "11-Nuclear-and-Radiochemistry"
  };

  function initLangSwitch() {
    var crumbs = document.querySelector(".crumbs");
    if (!crumbs) return;
    var isZh = (document.documentElement.lang || "").indexOf("zh") === 0;
    var b = (document.body.className.match(/b\d{2}/) || [""])[0];
    var file = location.pathname.split("/").pop() || "index.html";
    try { file = decodeURIComponent(file); } catch (e) {}
    var hit = null;
    for (var i = 0; i < LANG_PAIRS.length; i++) {
      if (LANG_PAIRS[i][0] === b && LANG_PAIRS[i][isZh ? 1 : 2] === file) { hit = LANG_PAIRS[i]; break; }
    }
    if (!hit) return;
    var href = b
      ? (isZh ? "../en/" + LANG_EN_FOLDERS[b] + "/" + hit[2]
              : "../" + LANG_ZH_FOLDERS[b] + "/" + hit[1])
      : (isZh ? "en/index.html" : "index.html");
    var a = document.createElement("a");
    a.className = "langswitch";
    a.href = href;
    a.textContent = isZh ? "EN" : "中文";
    a.setAttribute("aria-label", isZh ? "English version" : "中文版");
    crumbs.appendChild(a);
  }

  /* ---------- Boot ---------- */
  ready(function () {
    try { initLadders(null); } catch (e) { console.warn(e); }
    try { initWorked(null); } catch (e) { console.warn(e); }
    try { initQuizzes(null); } catch (e) { console.warn(e); }
    try { initTocSpy(); } catch (e) { console.warn(e); }
    try { initLessonProgress(null); } catch (e) { console.warn(e); }
    try { initBackTop(); } catch (e) { console.warn(e); }
    try { initLangSwitch(); } catch (e) { console.warn(e); }
  });

  /* Exposed for chapter-specific animations */
  window.DSHChem = {
    el: el,
    autoloop: autoloop,
    prefersReduced: prefersReduced,
    initLadders: initLadders,
    initWorked: initWorked,
    initQuizzes: initQuizzes
  };
})();
