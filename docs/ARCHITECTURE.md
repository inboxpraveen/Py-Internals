# Architecture

Py Internals is a folder of static files. There is no server, no framework and no build step between the source and what a reader gets. This page explains how the pieces fit, so you can change one without breaking the others.

![How Py Internals fits together: session files are written by hand, the shared engine runs them in the browser, and a Python script generates the SEO files that get committed and served by GitHub Pages](../assets/images/architecture.png)

The diagram has three stages. A contributor **writes** a session. The reader's browser **runs** it with the shared engine. The maintainer **publishes** by regenerating the metadata files and pushing.

## 1. Write

A session lives in its own folder, `sessions/NN-topic/`, and has two files.

| File | What goes in it |
| --- | --- |
| `session.js` | A `DEMOS` object. Each demo has the Python source (`code`) and a list of `steps`. Each step has a title, a short explanation, the source lines it is about (`lines`) and one memory snapshot (`memory`). |
| `index.html` | The page shell: the hero, the written narrative, the lab markup, the quiz cards and the links to the glossary and the next session. |

A snapshot is a plain object: the frames that exist (each with its variables), the heap objects that are alive (type, value, refcount, state) and which of them to highlight. It is a teaching diagram, not a dump from a live interpreter, so addresses are stable on purpose and every number shown has been checked against real CPython. The exact format is in [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md#6-memory-snapshot-format).

Nothing is computed at runtime. A step shows only what its author wrote, which is why each one can carry a single idea.

## 2. Run

Every session loads the same four scripts, in this order, then its own `session.js`:

```html
<script src="../../assets/js/core.js"></script>
<script src="../../assets/js/syntax.js"></script>
<script src="../../assets/js/memory-viz.js"></script>
<script src="../../assets/js/animator.js"></script>
<script src="session.js"></script>
```

Each script adds one object to a shared `PJ` namespace.

| Module | Job |
| --- | --- |
| `PJ.Core` (`core.js`) | Sidebar, the reading progress bar and current-section highlight, quizzes, the "Continue Learning" button on the homepage and saved progress. `PJ.Session.mount()` wires a whole lab together. |
| `PJ.Animator` (`animator.js`) | Owns time. It holds the current step index and the autoplay timer, wires the play, previous, next, reset and speed controls, and calls `onStep(step, index, total)` whenever the step changes. It also owns the keyboard (arrows, Space, R), but only while the lab is on screen. |
| `PJ.MemoryViz` (`memory-viz.js`) | `render(snapshot)` turns one snapshot into DOM: the frames on one side, the heap objects on the other, reference links, refcount badges and the new, rebound, mutated and about-to-be-collected states. |
| `PJ.Syntax` (`syntax.js`) | Highlights Python source into numbered lines and marks the line a step is about, and the lines that have already run. |

When a session page loads, `PJ.Session.mount({ sessionId, demos, defaultDemo, defaultSpeed })` does the following:

1. creates a `PJ.MemoryViz` for the memory panel,
2. renders the chosen demo's source with `PJ.Syntax`,
3. creates a `PJ.Animator` over the demo's steps, and
4. on every step, calls `PJ.Syntax.highlightLines` with the step's `lines` and `PJ.MemoryViz.render` with the step's `memory`.

Choosing another demo tears the animator down and repeats the same four steps. The animator and the visualiser never talk to each other directly, which is why a new kind of lesson needs new data and not a new renderer.

### What is stored on the reader's device

Only two `localStorage` keys, both written by `core.js`. Every read and write is wrapped in a `try`, so the site still works when the browser blocks storage; progress just does not persist.

- `pj_completed`: the ids of sessions whose quiz has been finished (every question answered).
- `pj_last`: the id of the session opened most recently.

There are no cookies, no accounts and no analytics, and no page asks another site for anything. The fonts (Lora, DM Sans, JetBrains Mono, under the SIL Open Font License) are served from `assets/fonts/`.

### Styles

Six stylesheets in `assets/css/`, all driven by the custom properties in `base.css`, which also declares the self-hosted font faces: `base`, `layout`, `components`, `memory-viz`, `animations` and `session`. Anything a second session needs unchanged is promoted into these files. Anything only one session needs stays in that session's own page.

## 3. Publish

`tools/build_seo.py` generates everything that helps a search engine, a social network or a language model find the course. It reads each page, and uses node to read each session's steps, then writes:

- the head tags, Open Graph tags and JSON-LD of every page, between the `<!-- seo:head -->` markers,
- the "all sessions" footer navigation, between the `<!-- seo:sessions-nav -->` markers,
- a share card per page in `assets/images/og/`, drawn with Pillow,
- `sitemap.xml`, `robots.txt`, `feed.xml` and `manifest.webmanifest`,
- `llms.txt` and `llms-full.txt`, the whole course as Markdown.

The output is committed, so the live site needs no build. Modified dates come from git, which means running the script twice changes nothing the second time. GitHub Pages serves the repository root as it is (`.nojekyll` switches Jekyll off).

## Design decisions

**Hand-authored snapshots, not a live interpreter.** A real interpreter would show interned ints, frame objects and details a learner is not ready for. A snapshot shows the one thing a step is about. The cost is authoring time, and the guide spends most of its length on keeping that honest.

**Plain `<script>` tags, no modules.** A contributor can open one HTML file and read what the page does. It also means the pages work when opened from disk.

**Python-level model, not C-level.** Names, objects, references and frames. Implementation details (small-int caching, the GIL) appear only where they change the mental model.

**No backend.** Progress is local. That means no sync between devices and no learning analytics, and also no outage, no accounts and nothing to secure.

**One page per session, one data file per demo.** URLs, README links and the `pj_completed` ids all depend on the folder names, so sessions are never renumbered. New topics are appended.

## Checking your changes

```bash
node tools/check_sessions.js          # demo data: line numbers, heap refs, small ints, labels
python tools/build_seo.py nocards     # regenerate head tags, sitemap, feed, llms files
```

[CONTRIBUTING.md](../CONTRIBUTING.md) has the full list, including the browser checks.
