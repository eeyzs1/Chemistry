/* ============================================================
   Chemistry Academy · 交互引擎
   —— 所有教程页面统一引用：assets/tutor.js
   职责：三级讲解阶梯 / 例题脚手架步进 / 自测引擎 / 目录高亮 /
         共享 SVG 辅助 el() / 视口感知动画循环 autoloop /
         自测最佳成绩与分支进度徽章 / 回到顶部 / 中英双语切换
   约定：每个功能独立初始化并容错，任何组件损坏不影响其他功能
   ============================================================ */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  var isZh = (document.documentElement.lang || "").indexOf("zh") === 0;
  function tr(zh, en) { return isZh ? zh : en; }

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
     frameFn 不再自行调用 requestAnimationFrame；返回 {start, stop, destroy}。 */
  function autoloop(watchEl, frameFn, opts) {
    opts = opts || {};
    var running = false, enabled = true, destroyed = false, rafId = null, visible = false;
    var minDt = opts.maxFps ? 1000 / opts.maxFps : 0;
    var last = 0;
    var motion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");

    function tick(ts) {
      rafId = null;
      if (!running) return;
      if (minDt && ts - last < minDt) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      last = ts;
      frameFn(ts);
      if (running && rafId === null) rafId = requestAnimationFrame(tick);
    }
    function pause() {
      running = false;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }
    function update() {
      if (!destroyed && enabled && visible && !document.hidden && !(motion && motion.matches)) {
        if (!running) {
          running = true;
          last = 0;
          rafId = requestAnimationFrame(tick);
        }
      } else pause();
    }
    function start() { enabled = true; update(); }
    function stop() { enabled = false; pause(); }
    function motionChanged() {
      update();
      if (enabled && visible && !document.hidden && motion.matches) frameFn(performance.now());
    }

    var io = null;
    if ("IntersectionObserver" in window && watchEl) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible = en.isIntersecting; });
        update();
      }, { rootMargin: opts.rootMargin || "80px" });
      io.observe(watchEl);
    } else {
      visible = true;
      update();
    }
    document.addEventListener("visibilitychange", update);
    if (motion && motion.addEventListener) motion.addEventListener("change", motionChanged);
    return {
      start: start,
      stop: stop,
      destroy: function () {
        destroyed = true;
        stop();
        if (io) io.disconnect();
        document.removeEventListener("visibilitychange", update);
        if (motion && motion.removeEventListener) motion.removeEventListener("change", motionChanged);
      }
    };
  }

  /* 连续滴定等数值模型共用：25 °C、理想稀溶液，计入水的自解离。
     使用数值稳定的二次方程解，避免计量点附近出现 pH 倒跳或无穷大。 */
  function strongAcidBasePH(acidMoles, baseMoles, volumeLitres) {
    if (!Number.isFinite(acidMoles) || !Number.isFinite(baseMoles) ||
        !Number.isFinite(volumeLitres) || acidMoles < 0 || baseMoles < 0 || volumeLitres <= 0) {
      throw new RangeError("Non-negative amounts and a positive volume are required");
    }
    var excess = (acidMoles - baseMoles) / volumeLitres;
    var major = (Math.abs(excess) + Math.hypot(excess, 2e-7)) / 2;
    return excess >= 0 ? -Math.log10(major) : 14 + Math.log10(major);
  }

  /* ---------- 进度存取（localStorage，容错：不可用时静默降级） ---------- */
  var PROG_KEY = "dshchem:progress";
  var memoryProg = {};

  function validScore(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100; }

  function readProg() {
    try {
      var parsed = JSON.parse(localStorage.getItem(PROG_KEY) || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      var clean = {};
      Object.keys(parsed).forEach(function (key) {
        if (/^b\d{2}:/.test(key) && validScore(parsed[key])) clean[key] = parsed[key];
      });
      return clean;
    } catch (e) { return memoryProg; }
  }
  function writeProg(store) {
    memoryProg = store;
    try { localStorage.setItem(PROG_KEY, JSON.stringify(store)); } catch (e) {}
  }
  /* 中英文同章使用中文文件名作为规范键，同时兼容旧版英文进度。 */
  function branchKey() { return (document.body.className.match(/\bb\d{2}\b/) || [""])[0]; }
  function pagePair(fileName) {
    var p = (fileName || location.pathname.split("/").pop() || "index.html").split(/[?#]/)[0];
    try { p = decodeURIComponent(p); } catch (e) {}
    return LANG_PAIRS.find(function (pair) {
      return pair[0] === branchKey() && (pair[1] === p || pair[2] === p);
    }) || [branchKey(), p, p];
  }
  function pageKey(fileName) {
    var pair = pagePair(fileName);
    return pair[0] + ":" + pair[1];
  }
  function bestScore(fileName, store) {
    var pair = pagePair(fileName);
    var scores = [store[pair[0] + ":" + pair[1]], store[pair[0] + ":" + pair[2]]].filter(validScore);
    return scores.length ? Math.max.apply(null, scores) : null;
  }
  function saveBest(pct) {
    // 提交时重新读取，防止较早打开的章节覆盖其他标签页后来写入的成绩。
    var prog = readProg();
    var previous = bestScore(null, prog);
    var best = previous === null ? pct : Math.max(previous, pct);
    prog[pageKey()] = best;
    writeProg(prog);
    return { best: best, record: previous === null || pct > previous };
  }

  /* ---------- 1. 三级讲解阶梯 ---------- */
  function initLadders(root) {
    (root || document).querySelectorAll(".ladder").forEach(function (ladder, li) {
      if (ladder.dataset.initialized) return;
      var tabs = ladder.querySelectorAll(".ladder-tab");
      var panels = ladder.querySelectorAll(".ladder-panel");
      var tabsWrap = ladder.querySelector(".ladder-tabs");
      if (!tabs.length || tabs.length !== panels.length) return;
      ladder.dataset.initialized = "1";
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
        p.tabIndex = 0;
        if (!p.id) p.id = "ladder" + li + "-panel" + j;
        if (!tabs[j].id) tabs[j].id = p.id + "-tab";
        tabs[j].setAttribute("aria-controls", p.id);
        p.setAttribute("aria-labelledby", tabs[j].id);
      });

      tabs.forEach(function (tab, i) {
        tab.setAttribute("role", "tab");
        tab.setAttribute("type", "button");
        tab.addEventListener("click", function () { activate(i); });
        tab.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d && e.key !== "Home" && e.key !== "End") return;
          e.preventDefault();
          var n = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + d + tabs.length) % tabs.length;
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
      if (box.dataset.initialized) return;
      var steps = Array.prototype.slice.call(box.querySelectorAll(".worked-steps .step"));
      if (!steps.length) return;
      box.dataset.initialized = "1";
      var btnNext = box.querySelector(".js-step-next");
      var btnAll  = box.querySelector(".js-step-all");
      var btnReset= box.querySelector(".js-step-reset");
      var shown = 0;

      function render() {
        steps.forEach(function (s, i) { s.classList.toggle("is-shown", i < shown); });
        if (btnNext) {
          if (shown >= steps.length) {
            btnNext.disabled = true;
            btnNext.textContent = tr("已完成 ✓", "Done ✓");
          } else {
            btnNext.disabled = false;
            btnNext.textContent = tr("下一步（", "Next step (") + shown + "/" + steps.length + tr("）", ")");
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
    if (box.dataset.initialized) return;
    var dataScript = box.querySelector("script.quiz-data");
    if (!dataScript) return;
    var data;
    try { data = JSON.parse(dataScript.textContent); }
    catch (e) { console.warn("Invalid quiz JSON:", e); return; }
    var questions = data && data.questions;
    if (!Array.isArray(questions) || !questions.length || !questions.every(function (q) {
      return q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length >= 2 &&
        q.options.every(function (option) { return typeof option === "string"; }) &&
        Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length &&
        (q.explain === undefined || typeof q.explain === "string");
    })) { console.warn("Invalid quiz questions"); return; }
    box.dataset.initialized = "1";

    var body = document.createElement("div");
    body.className = "quiz-body";

    var answered = 0, correct = 0;
    var score = box.querySelector(".quiz-score");
    if (score) { score.setAttribute("role", "status"); score.setAttribute("aria-live", "polite"); }

    var best = bestScore(null, readProg());

    function scoreText(extra) {
      var s = tr("已答 ", "Answered ") + answered + "/" + questions.length + tr(" · 正确 ", " · Correct ") + correct;
      if (extra) s += extra;
      return s;
    }

    questions.forEach(function (q, qi) {
      var qDiv = document.createElement("div");
      qDiv.className = "quiz-q";

      var qText = document.createElement("div");
      qText.className = "q-text";
      qText.id = "quiz-" + Array.prototype.indexOf.call(document.querySelectorAll(".quiz"), box) + "-q" + qi;
      qDiv.setAttribute("role", "group");
      qDiv.setAttribute("aria-labelledby", qText.id);
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
      explain.setAttribute("aria-live", "polite");

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
          var feedback = document.createElement("b");
          feedback.className = isRight ? "good" : "bad";
          feedback.textContent = isRight ? tr("✓ 回答正确。 ", "✓ Correct. ") : tr("✗ 回答有误，请看解析。 ", "✗ Incorrect. See the explanation. ");
          explain.replaceChildren(feedback, document.createTextNode(q.explain || ""));
          explain.classList.add("is-shown");
          var tail = "";
          if (answered === questions.length) {
            var pct = Math.round(correct / questions.length * 100);
            var result = saveBest(pct);
            best = result.best;
            tail = " (" + pct + "%)" + (result.record
              ? tr(" 🏆 新纪录", " 🏆 New record") : tr(" · 历史最佳 ", " · best ") + best + "%");
          }
          if (score) score.textContent = scoreText(tail);
          retry.hidden = false;
        });
        opts.appendChild(btn);
      });

      qDiv.appendChild(opts);
      qDiv.appendChild(explain);
      body.appendChild(qDiv);
    });

    box.appendChild(body);

    var controls = document.createElement("div");
    controls.className = "quiz-controls";
    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn ghost";
    retry.textContent = tr("↻ 重新自测", "↻ Try again");
    retry.hidden = true;
    retry.addEventListener("click", function () {
      body.remove();
      controls.remove();
      delete box.dataset.initialized;
      buildQuiz(box);
      var first = box.querySelector(".quiz-opt");
      if (first) first.focus({ preventScroll: true });
    });
    controls.appendChild(retry);
    box.appendChild(controls);

    if (score) {
      score.textContent = tr("共 " + questions.length + " 题", questions.length + (questions.length === 1 ? " question" : " questions")) +
        (best !== null ? tr(" · 历史最佳 ", " · best ") + best + "%" : "");
    }
  }

  function initQuizzes(root) {
    (root || document).querySelectorAll(".quiz").forEach(function (box) {
      try { buildQuiz(box); } catch (e) { console.warn(e); }
    });
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
      var pct = bestScore(href, prog);
      var meta = card.querySelector(".lc-meta");
      if (!meta) return;
      var b = meta.querySelector(".lc-done, .lc-part");
      if (pct === null) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement("span"); meta.appendChild(b); }
      if (pct >= 80) { b.className = "lc-done"; b.textContent = tr("✓ 已通过 ", "✓ Passed ") + pct + "%"; }
      else { b.className = "lc-part"; b.textContent = tr("最佳 ", "Best ") + pct + "%"; }
    });
  }

  /* ---------- 6. 回到顶部 ---------- */
  function initBackTop() {
    if (!document.querySelector(".page")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "backtop";
    btn.textContent = tr("↑ 顶部", "↑ Top");
    btn.setAttribute("aria-label", tr("回到页面顶部", "Back to top of page"));
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    });
    document.body.appendChild(btn);
    function show() {
      var on = (window.scrollY || window.pageYOffset) > 600;
      btn.classList.toggle("is-shown", on);
      btn.tabIndex = on ? 0 : -1;
      btn.setAttribute("aria-hidden", on ? "false" : "true");
    }
    window.addEventListener("scroll", show, { passive: true });
    show();
  }

  /* ---------- 7. 中英双语切换 ---------- */
  /* 页面对应表：[body class, 中文文件名, 英文文件名]；class 为空串表示根目录页。
     命中后在面包屑右侧注入 EN / 中文 切换按钮；未命中则静默跳过。 */
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
    if (!crumbs || crumbs.querySelector(".langswitch")) return;
    var b = branchKey();
    var file = location.pathname.split("/").pop() || "index.html";
    try { file = decodeURIComponent(file); } catch (e) {}
    var hit = null;
    for (var i = 0; i < LANG_PAIRS.length; i++) {
      if (LANG_PAIRS[i][0] === b && LANG_PAIRS[i][isZh ? 1 : 2] === file) { hit = LANG_PAIRS[i]; break; }
    }
    if (!hit) return;
    var href = b
      ? (isZh ? "../en/" + LANG_EN_FOLDERS[b] + "/" + hit[2]
              : "../../" + LANG_ZH_FOLDERS[b] + "/" + hit[1])
      : (isZh ? "en/index.html" : "../index.html");
    var a = document.createElement("a");
    a.className = "langswitch";
    a.href = href;
    a.textContent = isZh ? "EN" : "中文";
    a.setAttribute("aria-label", isZh ? "English version" : "中文版");
    a.hreflang = isZh ? "en" : "zh-CN";
    a.lang = isZh ? "en" : "zh-CN";
    crumbs.appendChild(a);
  }

  /* 宽表格在自己的区域滚动，正文和公式可以在窄屏上换行。 */
  function initReading() {
    document.querySelectorAll("table.tbl").forEach(function (table) {
      if (table.parentElement.classList.contains("table-scroll")) return;
      var wrap = document.createElement("div");
      wrap.className = "table-scroll";
      wrap.tabIndex = 0;
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", tr("表格，可横向滚动", "Table, scroll horizontally"));
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  /* CSS 的常驻动效也按整个图示暂停；新绘制的 SVG 子节点自动遵循父级状态。 */
  function initFigureMotion() {
    function pageVisibility() { document.documentElement.classList.toggle("document-paused", document.hidden); }
    document.addEventListener("visibilitychange", pageVisibility);
    pageVisibility();
    if (!("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.classList.toggle("motion-paused", !entry.isIntersecting); });
    }, { rootMargin: "80px" });
    document.querySelectorAll(".fig, .portal-hero").forEach(function (figure) { observer.observe(figure); });
  }

  /* ---------- 启动 ---------- */
  ready(function () {
    try { initLadders(null); } catch (e) { console.warn(e); }
    try { initWorked(null); } catch (e) { console.warn(e); }
    try { initQuizzes(null); } catch (e) { console.warn(e); }
    try { initTocSpy(); } catch (e) { console.warn(e); }
    try { initLessonProgress(null); } catch (e) { console.warn(e); }
    try { initBackTop(); } catch (e) { console.warn(e); }
    try { initLangSwitch(); } catch (e) { console.warn(e); }
    try { initReading(); } catch (e) { console.warn(e); }
    try { initFigureMotion(); } catch (e) { console.warn(e); }
    window.addEventListener("pageshow", function () { initLessonProgress(null); });
    window.addEventListener("storage", function (event) {
      if (event.key === PROG_KEY || event.key === null) initLessonProgress(null);
    });
  });

  /* 暴露给章节页自定义动画使用 */
  window.DSHChem = {
    el: el,
    autoloop: autoloop,
    prefersReduced: prefersReduced,
    strongAcidBasePH: strongAcidBasePH,
    initLadders: initLadders,
    initWorked: initWorked,
    initQuizzes: initQuizzes
  };
})();
