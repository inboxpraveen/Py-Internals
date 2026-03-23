<div align="center">

<img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.10+"/>
<img src="https://img.shields.io/badge/Licnse-PI_Community-1A6B5C?style=for-the-badge" alt="PI Community License"/>
<img src="https://img.shields.io/badge/Deployed_on-GitHub_Pages-222222?style=for-the-badge&logo=github" alt="GitHub Pages"/>
<img src="https://img.shields.io/badge/No_build_tools-Pure_HTML%2FCSS%2FJS-B85C1A?style=for-the-badge" alt="No build tools"/>

<br /><br />

# 🐍 Py Internals — Learn Python from the Inside Out

**An open-source, interactive Python course that shows you what Python is *actually* doing**

[**View the Course →**](https://inboxpraveen.github.io/Py-Internals) &nbsp;·&nbsp;
[**Session 01: Variables**](https://inboxpraveen.github.io/Py-Internals/sessions/01-variables/) &nbsp;·&nbsp;
[**Report a Bug**](https://github.com/inboxpraveen/Py-Internals/issues) &nbsp;·&nbsp;
[**Request a Topic**](https://github.com/inboxpraveen/Py-Internals/discussions)

<br />

<img width="860" alt="Py Internals — memory visualization of variable rebinding" src="./assets//images/Py-Internals.png" />

</div>

---

## What is this?

Most Python tutorials teach you *what* to type. Py Internals teaches you *what Python does with it.*

When you write `x = 42`, Python doesn't "store 42 in x". It creates an integer **object** on the heap, then binds the name `x` to it in the current namespace. When you write `x = 100`, the old `42` object doesn't disappear immediately — it waits until its reference count hits zero, then gets garbage collected.

This course makes all of that **visible**. Every concept is paired with an animated memory diagram that shows stack frames, heap objects, reference counts, and garbage collection — step by step, at your pace.

---

## Why this exists

> "I know *how* to use Python. I don't know *why* it works this way."

That gap — between using a tool and understanding it — is where bugs hide. It's why `a = b; b.append(1)` surprises you. It's why passing a list to a function sometimes mutates the original and sometimes doesn't. It's why your "optimization" did nothing.

Py Internals closes that gap, visually, for free.

---

## Features

- 🎞️ **Step-by-step animations** — walk through code execution one step at a time, or let it autoplay
- 🧠 **Real memory diagrams** — see the actual heap, stack frames, reference counts, and GC cycles
- 🔬 **Type explorer** — every built-in Python type, its mutability, and its memory behavior
- 📖 **Narrative articles** — each session pairs the visual with a clear written explanation
- 📱 **Fully responsive** — reads well on mobile, animates beautifully on desktop
- ⚡ **No login, no account, no tracking** — just open and learn
- 💾 **Progress saved locally** — your completed sessions are remembered via `localStorage`
- 🌐 **Works offline** — pure static files, once loaded they work without internet

---

## Course content

| # | Session | Status | Concepts |
|---|---------|--------|----------|
| 01 | [Variables & Mutability](sessions/01-variables/) | ✅ Live | Names vs objects, rebinding, aliasing, mutation, GC |
| 02 | Functions & Scope | 🚧 Planned | Call stack, LEGB rule, closures, `nonlocal` |
| 03 | Lists & References | 📋 Planned | Shallow copy, deep copy, list internals |
| 04 | Dictionaries | 📋 Planned | Hash tables, key lookup, collision |
| 05 | Classes & Objects | 📋 Planned | `__init__`, `self`, method binding, `__dict__` |
| 06 | Iterators & Generators | 📋 Planned | `__iter__`, `__next__`, `yield`, lazy evaluation |
| 07 | Decorators | 📋 Planned | First-class functions, wrapper pattern, `functools` |
| 08 | The GIL & Concurrency | 📋 Planned | GIL, threads vs processes, `asyncio` |

---

## Project structure

```
Py-Internals/
├── index.html                   ← Course homepage & session grid
├── LICENSE                      ← PJ Community License v1.0
├── README.md                    ← This file
├── IMPLEMENTATION_GUIDE.md      ← How to build new sessions
│
├── assets/
│   ├── css/
│   │   ├── base.css             ← Design tokens, reset, typography
│   │   ├── layout.css           ← App shell, sidebar, stage, hero, narrative
│   │   ├── components.css       ← Buttons, badges, callouts, type chips
│   │   ├── memory-viz.css       ← Stack frames, heap objects, reference arrows
│   │   └── animations.css       ← All keyframes and transition utilities
│   │
│   └── js/
│       ├── core.js              ← App init, sidebar, utilities (PJ.Core)
│       ├── animator.js          ← Play/pause/step engine (PJ.Animator)
│       ├── memory-viz.js        ← Memory snapshot renderer (PJ.MemoryViz)
│       └── syntax.js            ← Python syntax highlighter (PJ.Syntax)
│
└── sessions/
    ├── 01-variables/
    │   ├── index.html           ← Session page (imports shared CSS/JS)
    │   └── session.js           ← Demo definitions and step data
    └── 02-functions/            ← Next session (same pattern)
```

---

## Running locally

No build tools. No npm install. No webpack. Just:

```bash
git clone https://github.com/inboxpraveen/Py-Internals.git
cd Py-Internals

# Option 1 — Python (most systems)
python -m http.server 8000

# Option 2 — Node
npx serve .

# Option 3 — VS Code
# Install the "Live Server" extension, right-click index.html → Open with Live Server
```

Then open [http://localhost:8000](http://localhost:8000).

> **Why a server?** The JS modules use `fetch()` to load session data, which requires a server context. Opening `index.html` directly as a `file://` URL won't work.

---

## Contributing

Contributions are very welcome — especially new sessions.

### Adding a session

1. Read [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) — it covers everything
2. Copy `sessions/01-variables/` as a starting point
3. Create your demo steps in `session.js` following the memory snapshot format
4. Submit a PR against `main`

### Good first issues

- 🐛 Fix a typo or explanation in an existing session
- 🎨 Improve mobile layout for a specific component
- 📝 Add a callout or tip to an existing narrative section
- ✨ Propose a new session topic in [Discussions](https://github.com/inboxpraveen/Py-Internals/discussions)

### Standards

- All new sessions must follow the step design rules in the implementation guide (first step = empty state, last step = summary, one concept per step)
- CSS changes must use the existing design token system — no hardcoded hex values
- JS changes must not introduce external dependencies

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Markup | Semantic HTML5 | Accessible, no framework needed |
| Styles | Vanilla CSS with custom properties | Zero runtime, full browser support |
| Scripts | Vanilla JS (ES2020 modules) | No bundler, trivial to read and fork |
| Fonts | [Lora](https://fonts.google.com/specimen/Lora) · [DM Sans](https://fonts.google.com/specimen/DM+Sans) · [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | Editorial + readable + code-optimised |
| Hosting | GitHub Pages | Free, zero config, git-native |
| Persistence | `localStorage` | Session progress, no backend needed |

---

## Design philosophy

**Show, don't just tell.** Every concept in this course has a visual representation. If you can't draw a memory diagram for it, the explanation isn't done yet.

**One thing per step.** Each animation step introduces exactly one new idea. No step ever asks you to track two changes at once.

**Beautiful enough to take seriously.** The design is intentional — warm cream backgrounds, editorial typography, restrained color. Learning tools don't have to look like homework.

**Zero friction to fork.** You can clone this, remove the attribution (wait, keep the attribution — it's in the license), and build your own course on top of it. The implementation guide exists so this is a 20-minute job, not a 20-hour one.

---

## License

This project is published under the **PI Community License v1.0** (Py Internals Community License) — see [`LICENSE`](LICENSE) for the full text.

**Short version:**
- ✅ Free to use, share, and adapt for educational purposes
- ✅ Free to embed visuals in blog posts, talks, and notes
- 📌 Attribution required (visible credit with a link back to this repo)
- 🔁 Derivatives must use the same or a compatible license
- 🚫 No selling or paywalling without written permission

---

## Acknowledgements

Inspired by the incredible work of:

- [Python Tutor](https://pythontutor.com/) by Philip Guo — the original Python visualizer
- [CPython internals documentation](https://devguide.python.org/) — the source of truth
- [Fluent Python](https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/) by Luciano Ramalho — the book that made Python's object model click

---

<div align="center">

Made with patience and obsessive attention to spacing.<br />
If this helped you, consider starring the repo ⭐ — it helps others find it.

</div>
