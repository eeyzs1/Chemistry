"""Validate the offline library with Python's standard library and Node.js.

Run from any directory: python scripts/check_site.py
"""

from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = []
        self.links = []
        self.scripts = []
        self.quizzes = []
        self.lang = None
        self.viewport = False
        self.has_title = False
        self._script = None
        self._data = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "title":
            self.has_title = True
        if tag == "meta" and attrs.get("name") == "viewport":
            self.viewport = True
        if tag in ("a", "link", "script", "img", "source"):
            target = attrs.get("href", attrs.get("src"))
            if target:
                self.links.append((tag, target))
        if tag == "script":
            self._script = attrs
            self._data = []

    def handle_data(self, data):
        if self._script is not None:
            self._data.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._script is not None:
            code = "".join(self._data)
            if "quiz-data" in self._script.get("class", "").split():
                self.quizzes.append(code)
            elif not self._script.get("src") and self._script.get("type", "") in (
                "", "text/javascript", "application/javascript", "module"
            ):
                self.scripts.append(code)
            self._script = None


def page_identity(path):
    parts = path.relative_to(ROOT).parts
    if parts[0] == "en":
        parts = parts[1:]
    return (parts[0][:2], parts[-1][:2]) if len(parts) > 1 else ("portal", "index")


def validate():
    issues = []
    pages = {}
    quiz_shapes = [{}, {}]
    question_count = 0
    node = shutil.which("node")
    if not node:
        issues.append("Node.js is required to validate JavaScript syntax")

    def error(path, message):
        issues.append(f"{path.relative_to(ROOT).as_posix()}: {message}")

    def check_js(path, code):
        if not node:
            return
        result = subprocess.run(
            [node, "--check"], input=code, text=True, encoding="utf-8", capture_output=True
        )
        if result.returncode:
            error(path, "JavaScript syntax error:\n" + result.stderr.strip())

    for path in sorted(ROOT.rglob("*.html")):
        if any(part.startswith(".") or part in ("node_modules", "__pycache__")
               for part in path.relative_to(ROOT).parts):
            continue
        page = Page(path)
        page.feed(path.read_text(encoding="utf-8"))
        pages[path.resolve()] = page
        english = path.relative_to(ROOT).parts[0] == "en"
        expected_lang = "en" if english else "zh-CN"
        if page.lang != expected_lang:
            error(path, f"expected lang={expected_lang!r}, got {page.lang!r}")
        if not page.has_title or not page.viewport:
            error(path, "missing title or viewport metadata")
        for name, count in Counter(page.ids).items():
            if count > 1:
                error(path, f"duplicate id {name!r}")
        shapes = []
        for raw in page.quizzes:
            try:
                data = json.loads(raw)
                questions = data["questions"]
                if not isinstance(questions, list) or not questions:
                    raise ValueError("questions must be a nonempty array")
                for q in questions:
                    options = q["options"]
                    if not isinstance(q["q"], str) or not q["q"].strip():
                        raise ValueError("empty question")
                    if not isinstance(options, list) or len(options) < 2 or not all(
                        isinstance(option, str) and option.strip() for option in options
                    ):
                        raise ValueError("invalid options")
                    if type(q["answer"]) is not int or not 0 <= q["answer"] < len(options):
                        raise ValueError("answer is outside option range")
                    if not isinstance(q["explain"], str) or not q["explain"].strip():
                        raise ValueError("missing explanation")
                question_count += len(questions)
                shapes.append([(len(q["options"]), q["answer"]) for q in questions])
            except (ValueError, KeyError, TypeError) as exc:
                error(path, f"invalid quiz: {exc}")
        identity = page_identity(path)
        if identity in quiz_shapes[english]:
            error(path, f"duplicate chapter identity {identity}")
        quiz_shapes[english][identity] = shapes
        if path.name != "index.html" and not shapes:
            error(path, "chapter has no valid quiz")
        for code in page.scripts:
            check_js(path, code)

    for path, page in pages.items():
        for tag, raw in page.links:
            parsed = urlsplit(raw)
            if parsed.scheme or parsed.netloc:
                if tag != "a":
                    error(path, f"external runtime dependency breaks offline use: {raw}")
                continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            if target.is_dir():
                target /= "index.html"
            if not target.is_file():
                error(path, f"broken local link {raw!r}")
            elif parsed.fragment and target in pages:
                if unquote(parsed.fragment) not in pages[target].ids:
                    error(path, f"missing anchor in {raw!r}")
    if quiz_shapes[0] != quiz_shapes[1]:
        issues.append("Chinese/English page or quiz structure differs (chapter, options, answer index)")
    for path in sorted((ROOT / "assets").glob("*.js")):
        check_js(path, path.read_text(encoding="utf-8"))
    return issues, len(pages), question_count


if __name__ == "__main__":
    problems, count, questions = validate()
    for problem in problems:
        print(problem, file=sys.stderr)
    print(f"Checked {count} pages and {questions} questions; {len(problems)} issue(s).")
    raise SystemExit(bool(problems))
