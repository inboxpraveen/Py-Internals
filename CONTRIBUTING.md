# Contributing to Py Internals

Thanks for taking the time. The most useful contributions are corrections (a wrong explanation, a typo, a layout that breaks on a phone) and new sessions. This page covers how to run the project, how to check a change, and what a good pull request looks like.

## Run it locally

There is nothing to install for the site itself. Serve the folder and open it:

```bash
git clone https://github.com/inboxpraveen/Py-Internals.git
cd Py-Internals
python -m http.server 8000
```

Then open <http://localhost:8000>. A server is better than opening the files from disk, because it keeps the browser cache and the `localStorage` origin behaving as they will in production.

## Set up the tools

Two small tools live in `tools/`. You only need them when you add or rename a page, or change a title or description.

| Tool | Needs | Does |
| --- | --- | --- |
| `tools/check_sessions.js` | node | Checks every session's demo data |
| `tools/build_seo.py` | Python 3.10+, Pillow, node | Regenerates head tags, share cards, sitemap, feed and the `llms` files |

```bash
conda create -n py-internals python=3.13 pillow     # or: python -m venv .venv && pip install -r tools/requirements.txt
conda activate py-internals
```

## Check your change

```bash
node tools/check_sessions.js           # line numbers, heap refs, small ints, labels
python tools/build_seo.py nocards      # regenerate generated files (drop "nocards" if a title or description changed)
python tools/build_seo.py nocards      # a second run should change nothing
```

Then do the checks a script cannot do:

1. **Run every Python claim through the interpreter.** If a step says an object is freed, show it with a `__del__`. If it quotes a refcount, measure it with `sys.getrefcount`. Small integers are immortal on Python 3.12 and later, so never draw one as garbage collected.
2. **Look at it on a narrow screen.** Check 320, 375, 768 and a desktop width. Nothing should scroll sideways, and the busiest step of a demo should still fit.
3. **Step through every demo** in the lab and read the written section next to it.

## Where things live

| Area | Path | Notes |
| --- | --- | --- |
| Sessions | `sessions/NN-topic/` | `index.html` is the page, `session.js` holds the demos |
| Shared engine | `assets/js/` | `core.js`, `animator.js`, `memory-viz.js`, `syntax.js` |
| Shared styles | `assets/css/` | Driven by the tokens in `base.css` |
| Glossary | `glossary.html` | One entry per term, linked from the sessions |
| Generated files | `sitemap.xml`, `feed.xml`, `llms*.txt`, `assets/images/og/` | Written by `tools/build_seo.py`. Do not edit by hand |
| Docs | `docs/ARCHITECTURE.md`, `IMPLEMENTATION_GUIDE.md` | How it fits together, and how to write a session |

## Adding a session

Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) first. It covers the step rules (first step is the empty state, last step is the settled state, one idea per step), the snapshot format and the components. Copy `sessions/06-decorators/` as a starting point, add the session to `PAGES` in `tools/build_seo.py` and run the tool.

Sessions are never renumbered. URLs, README links and saved progress all depend on the folder names, so new topics are appended.

For anything bigger than a fix, open a [discussion](https://github.com/inboxpraveen/Py-Internals/discussions) first so we can agree on the topic before you write it.

## Guidelines

- **No dependencies.** Plain HTML, CSS and JavaScript. No build step, no framework, no bundler.
- **Use the tokens.** CSS changes use the custom properties in `base.css`, with no hard-coded colours.
- **Keep it accurate.** A diagram that is simple is fine. A diagram that is wrong is not. If you simplify, say so in the text.
- **Write plainly.** Short sentences, everyday words, commas and full stops instead of dashes. Explain the idea first, then name it.
- **Do not edit generated files** by hand. Change the source and run the tool.

## Pull requests

1. Branch from `main` and keep commits focused.
2. Fill in the pull request template.
3. Run the checks above. For a layout change, a screenshot helps.

By contributing you agree that your code is published under the [Apache License 2.0](LICENSE) and your writing and diagrams under [CC BY-SA 4.0](LICENSE-CONTENT.txt).

## Reporting bugs

Use the bug template and say which session, which demo and which step, plus your browser and screen size. Security problems do not go in a public issue, see [SECURITY.md](SECURITY.md).

## Code of conduct

Be kind and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
