"""Browser regressions. Run: python -m unittest discover -s tests -v"""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest
from urllib.parse import quote, unquote, urlsplit
from urllib.request import url2pathname

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ZH_ATOM = "00-化学总论/01-原子与元素.html"
EN_ATOM = "en/00-Foundations/01-Atoms-and-Elements.html"
PROGRESS_KEY = "dshchem:progress"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()
        cls.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
        )
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}/"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.server_thread.join()
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(reduced_motion="reduce")
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda exc: self.errors.append(str(exc)))

    def tearDown(self):
        self.context.close()

    def visit(self, path):
        self.page.goto(self.base + quote(path, safe="/"))

    def progress(self):
        return self.page.evaluate("key => JSON.parse(localStorage.getItem(key))", PROGRESS_KEY)

    def complete_quiz(self, page=None, wrong=False):
        page = page or self.page
        answers = page.locator(".quiz-data").evaluate(
            "e => JSON.parse(e.textContent).questions.map(q => q.answer)"
        )
        for i, answer in enumerate(answers):
            buttons = page.locator(".quiz-q").nth(i).locator(".quiz-opt")
            buttons.nth((answer + 1) % buttons.count() if wrong else answer).click()

    def test_all_pages_open_offline_at_mobile_and_desktop_sizes(self):
        self.context.set_offline(True)
        files = sorted(p for p in ROOT.rglob("*.html") if not any(
            part.startswith(".") or part == "node_modules" for part in p.relative_to(ROOT).parts
        ))
        self.assertTrue(files)
        for width in (320, 390, 1280):
            self.page.set_viewport_size({"width": width, "height": 844})
            for file in files:
                with self.subTest(page=file.relative_to(ROOT).as_posix(), width=width):
                    self.errors.clear()
                    self.page.goto(file.as_uri())
                    self.assertFalse(self.errors)
                    self.assertLessEqual(self.page.evaluate(
                        "document.documentElement.scrollWidth - innerWidth"
                    ), 1)
                    self.assertEqual(self.page.locator(".langswitch").count(), 1)
                    target = Path(url2pathname(urlsplit(
                        self.page.locator(".langswitch").evaluate("a => a.href")
                    ).path))
                    self.assertTrue(target.is_file(), str(target))
                    self.assertNotEqual(target.resolve(), file.resolve())
                    # Exercise slider endpoints where mathematical models often fail.
                    for slider in self.page.locator('input[type="range"]').all():
                        slider.evaluate("""e => {
                          for (const v of [e.min, (+e.min + +e.max)/2, e.max]) {
                            e.value = v; e.dispatchEvent(new Event('input', {bubbles:true}));
                          }
                        }""")
                    if width == 390:
                        for button in self.page.locator(".fig-controls button[id]").all():
                            if button.is_enabled():
                                button.evaluate("b => b.click()")
                    self.assertFalse(self.errors)
                    self.assertFalse(self.page.locator("svg").evaluate_all("""nodes => nodes.some(
                      svg => [...svg.querySelectorAll('*')].some(node => [...node.attributes].some(
                        a => /(?:NaN|Infinity)/.test(a.value))))"""))
                    self.assertFalse(self.page.locator(".fig-readout, #ggQuad").evaluate_all(
                        "nodes => nodes.some(n => /undefined|NaN/.test(n.textContent))"
                    ))

    def test_language_roundtrip_and_retry_preserve_best_score(self):
        self.visit(ZH_ATOM)
        self.complete_quiz()
        self.assertIn("100%", self.page.locator(".quiz-score").inner_text())
        self.page.locator(".quiz-controls button").click()
        self.assertEqual(self.page.locator(".quiz-opt:disabled").count(), 0)
        self.complete_quiz(wrong=True)
        self.assertEqual(self.progress()["b00:01-原子与元素.html"], 100)
        self.page.locator(".langswitch").click()
        self.assertEqual(unquote(urlsplit(self.page.url).path).lstrip("/"), EN_ATOM)
        self.assertIn("best 100%", self.page.locator(".quiz-score").inner_text())
        self.page.locator(".langswitch").click()
        self.assertEqual(unquote(urlsplit(self.page.url).path).lstrip("/"), ZH_ATOM)
        self.visit("en/00-Foundations/index.html")
        self.assertIn("100%", self.page.locator(".lesson-card").first.inner_text())

    def test_progress_recovers_from_corruption_and_unavailable_storage(self):
        self.visit(ZH_ATOM)
        for value in ("null", "[]", "false", '"broken"', "{oops", '{"b00:01-原子与元素.html":999}'):
            with self.subTest(stored=value):
                self.page.evaluate("([key,value]) => localStorage.setItem(key,value)", [PROGRESS_KEY, value])
                self.page.reload()
                self.complete_quiz()
                self.assertEqual(self.progress()["b00:01-原子与元素.html"], 100)
                self.assertFalse(self.errors)
        self.page.add_init_script("""Object.defineProperty(window, 'localStorage', {
          get() { throw new DOMException('Storage unavailable', 'SecurityError'); }
        });""")
        self.page.reload()
        self.complete_quiz()
        self.page.locator(".quiz-controls button").click()
        self.assertIn("100%", self.page.locator(".quiz-score").inner_text())
        self.assertFalse(self.errors)

    def test_old_english_scores_and_two_open_chapters_merge(self):
        self.visit(ZH_ATOM)
        self.page.evaluate("([key,value]) => localStorage.setItem(key,JSON.stringify(value))", [
            PROGRESS_KEY, {"b00:01-Atoms-and-Elements.html": 100}
        ])
        self.page.reload()
        self.assertIn("100%", self.page.locator(".quiz-score").inner_text())
        other = self.context.new_page()
        other.goto(self.base + "en/00-Foundations/02-Chemical-Bonding-and-Molecular-Structure.html")
        self.complete_quiz()
        self.complete_quiz(other)
        self.assertEqual(self.progress()["b00:01-原子与元素.html"], 100)
        self.assertEqual(self.progress()["b00:02-化学键与分子结构.html"], 100)

    def test_tabs_keyboard_and_component_initialization(self):
        self.visit(ZH_ATOM)
        tabs = self.page.locator(".ladder").first.locator('[role="tab"]')
        tabs.first.focus()
        self.page.keyboard.press("End")
        self.assertEqual(tabs.last.get_attribute("aria-selected"), "true")
        self.page.keyboard.press("Home")
        self.assertEqual(tabs.first.get_attribute("aria-selected"), "true")
        count = self.page.locator(".quiz-q").count()
        self.page.evaluate("DSHChem.initQuizzes(); DSHChem.initLadders(); DSHChem.initWorked()")
        self.assertEqual(self.page.locator(".quiz-q").count(), count)
        self.page.locator("#miniPtable button").last.focus()
        self.page.keyboard.press("Enter")
        self.assertIn("Kr", self.page.locator("#ptInfo").inner_text())

    def test_quiz_without_score_label_and_bad_sibling_still_work(self):
        self.visit(ZH_ATOM)
        self.page.locator(".quiz-score").evaluate("e => e.remove()")
        self.complete_quiz()
        self.assertEqual(self.progress()["b00:01-原子与元素.html"], 100)
        self.page.evaluate("""() => {
          const holder = document.createElement('section');
          holder.innerHTML = '<div class="quiz"><script class="quiz-data" type="application/json">null<\\/script></div>';
          const valid = document.querySelector('.quiz').cloneNode(true);
          valid.querySelector('.quiz-body').remove(); valid.querySelector('.quiz-controls').remove();
          delete valid.dataset.initialized; holder.append(valid); document.body.append(holder);
          DSHChem.initQuizzes(holder);
        }""")
        self.assertEqual(self.page.locator(".quiz-body").count(), 2)
        self.assertFalse(self.errors)

    def test_animation_pause_survives_visibility_and_motion_changes(self):
        self.visit(ZH_ATOM)
        self.page.emulate_media(reduced_motion="no-preference")
        self.page.evaluate("""() => {
          const target = document.createElement('div');
          target.style.cssText = 'position:fixed;top:0;left:0;width:10px;height:10px';
          document.body.append(target); window.testFrames = 0;
          window.testLoop = DSHChem.autoloop(target, () => window.testFrames++);
        }""")
        self.page.wait_for_function("testFrames > 1")
        stopped = self.page.evaluate("testLoop.stop(); testFrames")
        self.page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.evaluate("testFrames"), stopped)
        self.page.evaluate("testLoop.start()")
        self.page.wait_for_function("n => testFrames > n", arg=stopped)
        self.page.emulate_media(reduced_motion="reduce")
        self.page.wait_for_timeout(80)
        reduced = self.page.evaluate("testFrames")
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.evaluate("testFrames"), reduced)
        self.page.evaluate("testLoop.destroy()")
        self.page.emulate_media(reduced_motion="no-preference")
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.evaluate("testFrames"), reduced)

    def test_titration_is_continuous_monotone_and_finite(self):
        self.visit("01-无机化学/04-酸碱与水溶液.html")
        values = self.page.evaluate("""() => [0, 10, 19.999999, 20, 20.000001, 30, 40].map(
          v => DSHChem.strongAcidBasePH(.002, .1*v/1000, (20+v)/1000))""")
        self.assertAlmostEqual(values[0], 1, places=8)
        self.assertAlmostEqual(values[3], 7, places=10)
        self.assertEqual(values, sorted(values))
        self.assertLess(values[4] - values[2], 0.1)
        for v in (19.99, 20, 20.01):
            self.page.locator("#titrSlider").evaluate(
                "(e,v) => {e.value=v; e.dispatchEvent(new Event('input'))}", v
            )
            self.assertNotIn("NaN", self.page.locator("#titrReadout").inner_text())
        self.assertFalse(self.errors)
        self.visit("03-分析化学/02-滴定与化学分析.html")
        self.page.locator("#titSlider").evaluate(
            "e => {e.value=20; e.dispatchEvent(new Event('input'))}"
        )
        self.assertIn("化学计量点", self.page.locator("#titReadout").inner_text())
        self.page.locator("#titPlay").click()
        self.assertIn("40.00", self.page.locator("#titReadout").inner_text())

    def test_thermodynamics_quadrants_and_zero_boundaries(self):
        self.visit("04-物理化学/01-化学热力学.html")
        for h, s, expected in ((-100, 100, "ul"), (100, 100, "ur"), (-100, -100, "ll"), (100, -100, "lr")):
            self.page.evaluate("""([h,s]) => {
              document.querySelector('#ggH').value=h; document.querySelector('#ggS').value=s;
              document.querySelector('#ggH').dispatchEvent(new Event('input'));
            }""", [h, s])
            self.assertEqual(self.page.locator("#ggQ" + expected).get_attribute("opacity"), "1")
            self.assertNotIn("undefined", self.page.locator("#ggQuad").text_content())
        self.page.locator("#ggH").evaluate("e => {e.value=0; e.dispatchEvent(new Event('input'))}")
        self.assertIn("ΔH=0", self.page.locator("#ggQuad").text_content())
        self.assertIn("0 K", self.page.locator("#ggTstar").text_content())

    def test_flame_selection_and_electron_transfer_reset(self):
        self.visit("01-无机化学/02-主族元素.html")
        for symbol in ("Na", "K", "Ca", "Sr", "Cu"):
            button = self.page.locator("#fl-" + symbol)
            button.click()
            self.assertEqual(button.get_attribute("aria-pressed"), "true")
            self.assertIn(symbol, self.page.locator("#flameReadout").inner_text())
        self.assertFalse(self.errors)
        self.visit(ZH_ATOM)
        self.page.emulate_media(reduced_motion="no-preference")
        self.page.locator("#naclGo").click()
        self.page.locator("#naclGo").click()
        self.page.locator("#naclReset").click()
        # Let the original animation duration elapse: a stale frame must not undo reset.
        self.page.wait_for_timeout(1250)
        self.assertIn("电中性", self.page.locator("#naclReadout").inner_text())
        self.assertNotIn("Na⁺", self.page.locator("#naclSvg").text_content())
        self.page.emulate_media(reduced_motion="reduce")
        self.page.locator("#naclGo").click()
        self.assertIn("Na⁺", self.page.locator("#naclReadout").inner_text())


if __name__ == "__main__":
    unittest.main()
