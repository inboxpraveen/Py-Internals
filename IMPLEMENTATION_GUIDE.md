# Py Internals — Implementation Guide
## How to Build New Sessions Using the Common Component System

> Read this before creating any new session. Following this guide ensures
> visual consistency, code reuse, and a coherent learning experience.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [The CSS System](#2-the-css-system)
3. [The JavaScript Modules](#3-the-javascript-modules)
4. [Creating a New Session — Step by Step](#4-creating-a-new-session-step-by-step)
5. [Defining Steps for the Animator](#5-defining-steps-for-the-animator)
6. [Memory Snapshot Format](#6-memory-snapshot-format)
7. [Component Reference](#7-component-reference)
8. [Design Principles & Dos / Don'ts](#8-design-principles--dos--donts)
9. [Responsive Checklist](#9-responsive-checklist)
10. [Example: Minimal New Session](#10-example-minimal-new-session)

---

## 1. Project Structure

```
Py-Internals/
├── index.html                  ← Course homepage
├── LICENSE                     ← Py Internals Community License v1.0
├── README.md
├── IMPLEMENTATION_GUIDE.md     ← This file
│
├── assets/
│   ├── css/
│   │   ├── base.css            ← Design tokens, reset, typography utilities
│   │   ├── layout.css          ← App shell, sidebar, stage, hero, narrative
│   │   ├── components.css      ← Buttons, badges, callouts, type chips, controls
│   │   ├── memory-viz.css      ← Memory visualizer — stack, heap, objects
│   │   ├── animations.css      ← Keyframes and animation utilities
│   │   └── session.css         ← Shared session-page layout (overview, lab, tables)
│   │
│   └── js/
│       ├── core.js             ← App init, sidebar, progress, quizzes, PJ.Session.mount
│       ├── animator.js         ← Step engine (autoplay, pause, step, speed)
│       ├── memory-viz.js       ← Renders memory snapshots to DOM
│       └── syntax.js           ← Python syntax highlighter + line tools
│
└── sessions/
    ├── 01-variables/
    │   ├── index.html          ← Session HTML (uses common CSS/JS)
    │   └── session.js          ← Demo definitions + step data
    ├── 02-functions/           ← Functions, scope, call-stack frames
    ├── 03-lists-dicts/         ← Containers, aliases, shallow copies
    ├── 04-classes/             ← Instances, self, __dict__, methods
    ├── 05-iterators/           ← iter/next, yield, lazy evaluation
    ├── 06-decorators/          ← f = deco(f), wrappers, closure cells, wraps
    └── ...

`glossary.html` at the repo root is the searchable term list. Link it from every session topbar.
```

**Rule:** Each session lives in its own folder under `sessions/`.
Every session imports the same CSS files and JS modules from `../../assets/`.
Session-specific logic lives only in `session.js`.

---

## 2. The CSS System

### Loading order (always this exact order)

```html
<link rel="stylesheet" href="../../assets/css/base.css" />
<link rel="stylesheet" href="../../assets/css/layout.css" />
<link rel="stylesheet" href="../../assets/css/components.css" />
<link rel="stylesheet" href="../../assets/css/memory-viz.css" />
<link rel="stylesheet" href="../../assets/css/animations.css" />
<link rel="stylesheet" href="../../assets/css/session.css" />
```

### Design Tokens (in `base.css`)

All values are CSS custom properties on `:root`. Use them everywhere — never hardcode colors, font sizes, or spacing.

```css
/* Colors */
--clr-bg, --clr-surface, --clr-surface-2, --clr-border
--clr-text, --clr-text-2, --clr-text-3, --clr-text-inv
--clr-accent (teal), --clr-accent-lt, --clr-accent-2 (amber)

/* Python type colors */
--clr-type-int, --clr-type-float, --clr-type-str
--clr-type-bool, --clr-type-none, --clr-type-list, --clr-type-function, etc.

/* Memory viz colors */
--clr-mem-stack, --clr-mem-heap, --clr-mem-ref, --clr-mem-new

/* Typography */
--font-display (Lora), --font-body (DM Sans), --font-mono (JetBrains Mono)
--fs-xs through --fs-3xl   (font sizes)

/* Spacing */
--sp-1 (0.25rem) through --sp-20 (5rem)

/* Effects */
--shadow-xs through --shadow-xl
--radius-sm through --radius-full
--ease-out, --ease-spring, --dur-fast, --dur-base, --dur-slow, --dur-anim
```

### Session-specific CSS

**There is none.** Sessions carry no `<style>` block at all — every session page
loads exactly the six stylesheets above and nothing else.

Sessions 01–03 used to keep a few hundred lines of inline CSS each. Those blocks
were ~95% identical to `session.css`, and the small differences meant the same
component quietly rendered differently depending on which session you were
reading. They have all been removed.

If your session needs a style that does not exist yet:

1. Check first — `grep -rn "your-class" assets/css/` — it very likely exists.
2. If it genuinely does not, add it to `session.css` (or `components.css` if it
   is a general-purpose component), using design tokens only.
3. Give it a name that describes the idea, not the session (`.lookup-path`, not
   `.session04-lookup`), because the next session will want it too.

The one exception is `index.html` and `glossary.html`, which are standalone
pages outside the session shell and keep their own page-level `<style>`.

### Where the shared session styles live

Everything the session shell needs is already in `session.css`:
`learning-overview`, `learning-card`, `learning-path`, `stage-intro`,
`demo-guide`, `demo-selector`, `demo-pill`, `demo-watch`, `demo-group`,
`key-idea`, `lookup-path`, `mistake-list`, `explanation-strip`, `in-plain`,
`then-precise`, `flow-grid`, `rule-grid` (with `rule-card--rebind` /
`rule-card--mutate`), `diagram-grid`, `mental-model`, `comparison-table`,
`reference-map`, `type-explorer` and the `type-card` family.

Use them as they are. Do not copy them into a session.

### Shared additions from Session 02

Session 02 added reusable support for function-focused sessions:

- `components.css` now includes `.type-chip--function`, so any memory object or variable with `type: 'function'` renders with a consistent chip.
- `memory-viz.css` includes `.mem-frame--active`, used to highlight the currently running call frame when multiple frames are shown.

Use these shared styles before adding session-local equivalents. Only add session CSS for page-specific layout blocks such as learning cards, flow cards, or lab instructions.

### Reusable patterns from Session 03

Session 03 did **not** add new shared CSS or JS files. It intentionally reuses the existing `PJ.MemoryViz`, `PJ.Animator`, `PJ.Syntax`, type chips, callouts, tables, and stage shell.

It did introduce a few session-local patterns that future container-heavy sessions can copy:

- `.diagram-card` — a simple narrative card for before/after diagrams or conceptual comparisons.
- `.diagram-grid` — a two-column responsive grid for paired explanations.
- `.reference-map` and related elements — a static narrative diagram for showing names pointing to container objects and container slots pointing to values.
- The convention of displaying nested container references as readable labels like `list -> 0x7f560010` inside list cells or dict values.

These are now in `session.css` and available to every session.

---

## 3. The JavaScript Modules

### Loading order (always this exact order)

```html
<script src="../../assets/js/core.js"></script>
<script src="../../assets/js/syntax.js"></script>
<script src="../../assets/js/memory-viz.js"></script>
<script src="../../assets/js/animator.js"></script>
<script src="session.js"></script>        <!-- your session logic last -->
```

### `PJ.Core`
- **`PJ.Core.sleep(ms)`** — Returns a Promise that resolves after `ms` milliseconds
- **`PJ.Core.debounce(fn, delay)`** — Returns a debounced function
- **`PJ.Core.formatPyValue(val, type)`** — Formats a value with Python repr (adds quotes for strings, etc.)
- **`PJ.Core.getTypeColor(type)`** — Returns the CSS variable for a type's color
- **`PJ.Core.markSessionComplete(id)`** — Saves completion to localStorage
- **`PJ.Core.scrollToSection(selector)`** — Smooth-scroll helper for sidebar anchors
- **`PJ.Session.mount({ sessionId, demos, defaultDemo, defaultSpeed })`** — Preferred session bootstrap (wires the lab, keyboard, and completion)

Keyboard playback (once an animator is mounted): `→` next, `←` previous, `Space` play/pause, `R` reset.

Quizzes are plain HTML. Add `<section class="quiz" data-session="NN-topic">` with `.quiz-card` elements. Set `data-answer` to the winning `data-choice`. `PJ.Core` scores them automatically.

### `PJ.Syntax`
- **`PJ.Syntax.render(source, container, opts)`** — Highlights Python source and renders numbered lines into `container`
- **`PJ.Syntax.highlightLines(container, lines)`** — Highlights specific lines (1-indexed) and clears others
- **`PJ.Syntax.markExecuted(container, lines)`** — Adds a faded "already executed" style

### `PJ.MemoryViz`
```js
const viz = new PJ.MemoryViz('container-id');
viz.render(snapshot);   // snapshot format below
viz.clear();
```

`PJ.MemoryViz` supports two stack formats:
- `frame` for a single namespace, used by simple sessions like variables.
- `frames` for an actual call stack, used by function/scope sessions.

When using `frames`, list frames in execution order from oldest to newest, for example global first and the active function call last. The visualizer displays the active frame at the top and gives it the `.mem-frame--active` style.

### `PJ.Animator`
```js
const anim = new PJ.Animator({
  steps: [...],                // array of step objects
  containerId: 'stage',        // ID of wrapper — must contain the control buttons
  defaultSpeed: 800,           // ms per step in autoplay
  onStep(step, index, total),  // called on every step change
  onComplete(),                // called when last step reached
  onReset(),                   // called on reset
});
anim.mount();  // wires up DOM controls
```

The `containerId` element must contain buttons with these `data-action` attributes:
- `data-action="play"` — play/pause toggle
- `data-action="prev"` — previous step
- `data-action="next"` — next step
- `data-action="reset"` — reset to step 0
- `data-action="speed"` — `<select>` with speed values in ms
- `data-role="step-counter"` — displays "N / Total"
- `data-role="step-track"` — container for dot indicators

---

## 4. Creating a New Session — Step by Step

### Step 1: Create the folder

```bash
mkdir sessions/02-functions
touch sessions/02-functions/index.html
touch sessions/02-functions/session.js
```

### Step 2: Copy the HTML shell

Copy `sessions/06-decorators/` — it is the current reference shell (no inline
styles, no inline `onclick`, `PJ.Session.mount`, skip link, labelled controls).
Session 04 is the richest object-model example (`classRef`, `bases`,
inheritance); Session 02 is the one to read for call stacks; Session 03 for
containers and references. Replace:
- `<title>` — update session name
- `<meta name="description">` — describe the session
- `.session-hero__eyebrow` — e.g., "Foundations · Session 02"
- `.session-hero__title` — your title
- `.session-hero__subtitle` — one-paragraph intro
- `.session-meta` items — time estimate, demo count, difficulty
- Sidebar `.sidebar__item` links — update active state and anchors
- The breadcrumb
- `.session-footer` — update prev/next links

### Step 3: Plan your demos

A session typically has 3–5 interactive demos. Each demo focuses on one concrete behavior.
Sketch it on paper first:
- What code will be shown?
- How does memory change at each step?
- What is the key insight the learner should have at the end?

### Step 4: Write `session.js`

Define an `ADDRS` map and a `DEMOS` object (one key per demo), then hand both to
`PJ.Session.mount` on `DOMContentLoaded`:

```js
document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '06-decorators',   // must match the folder name and PJ.COURSE id
    demos: DEMOS,
    defaultDemo: 'manual',
    defaultSpeed: 900,
  });
});
```

That is the whole bootstrap. `mount` wires the demo pills (from their
`data-demo` attributes), the code panel, the memory panel, the explanation
strip, the animator and completion tracking. **Do not** write your own
`initStage`, `switchDemo`, `scrollTo`, read-progress bar or sidebar scroll-spy —
`PJ.Core.init()` already installs the last two on every page, and a second copy
means two scroll listeners doing the same work.

**Never add an `onclick` attribute.** Demo pills are found by `data-demo`;
sidebar links navigate by their `href="#id"` with `scroll-behavior: smooth`.
An inline handler that duplicates a listener in `core.js` fires twice — that is
how the mobile menu ended up toggling itself shut on every tap.

### Step 5: Write the narrative

Below the stage, add an `<article class="narrative">` with explanatory text, callouts,
code blocks, and type cards. This is where the deeper explanation lives.

### Step 5b: Register the session in `PJ.COURSE`

In `assets/js/core.js`, add an entry (or flip `status` from `planned` to
`live`):

```js
{ id: '06-decorators', num: '06', title: 'Decorators', short: 'f = deco(f), wrappers, wraps', status: 'live' },
```

This is not optional. `PJ.COURSE` drives the "Session N of M" counter, the
Start-here / Done badges, the Continue-Learning button and the next-incomplete
logic. A session that is not registered still renders, but its own chrome
silently reports the wrong numbers.

### Step 6: Add to `index.html` (homepage)

Add a new session card in the homepage sessions grid.
Use `<a href="sessions/NN-topic/" class="session-card ...">` once the session is ready.
Leave future sessions as `<div class="session-card locked">`.

---

## 5. Defining Steps for the Animator

Each step is a plain JavaScript object:

```js
{
  title: 'Short title shown in the explanation strip (can contain <code> tags)',
  desc:  'Longer explanation paragraph. Can contain <code>, <strong>, <em>.',
  lines: [2, 3],           // 1-indexed line numbers to highlight in code panel
  memory: { ... }          // Memory snapshot (see Section 6)
}
```

### Step design principles

- **One idea per step.** Don't try to explain two things at once.
- **First step = initial state.** Show an empty namespace before any code runs.
- **Last step = summary state.** Show the final state after all code has run.
- **5–8 steps per demo is ideal.** Fewer feels too fast; more feels tedious.
- **Highlight only relevant lines.** Don't highlight a line just because it was executed earlier.

---

## 6. Memory Snapshot Format

Use `frame` when the demo only needs one namespace:

```js
{
  frame: {
    name: 'global',          // Scope name shown in frame header
    vars: [
      // Reference-style variable (points to heap):
      {
        name: 'x',
        ref:  'obj-id',      // ID of the heap object this name points to
        pyId: '0x7f1234',    // Simulated Python id() — shown in namespace
        type: 'int',         // Used for the type chip
        state: 'new' | 'rebound' | 'deleted' | 'normal'
      },
      // Inline variable (value shown directly, no heap object):
      {
        name: 'FLAG',
        value: true,
        type: 'bool',
        inline: true,
        state: 'new'
      }
    ]
  },
  heap: [
    // Simple value object (int, float, str, bool, None):
    {
      id:       'obj-1',       // Internal ID for reference matching
      pyId:     '0x7f1234',   // Displayed as the simulated address
      type:     'int',
      value:    42,
      refcount: 1,             // Reference count
      mutable:  false,
      state:    'new' | 'normal' | 'gc' | 'mutated'
    },

    // List / tuple / set object:
    {
      id: 'lst-1', pyId: '0x7f2000',
      type: 'list', refcount: 1, mutable: true,
      items: [
        { value: 1, type: 'int' },
        { value: 2, type: 'int' },
      ]
    },

    // Dict object:
    {
      id: 'dct-1', pyId: '0x7f3000',
      type: 'dict', refcount: 1, mutable: true,
      pairs: [
        { key: 'name', value: 'Alice', type: 'str' },
        { key: 'age',  value: 30,      type: 'int'  },
      ]
    }
  ],

  highlight: ['obj-1', 'lst-1']  // IDs (or var names) to visually highlight
}
```

Use `frames` when the demo needs a call stack. This is the recommended format for functions, recursion, generators, decorators, context managers, and exceptions.

```js
{
  frames: [
    {
      name: 'global',
      vars: [
        { name: 'add', ref: 'addFn', pyId: ADDRS.addFn, type: 'function', state: 'normal' },
      ],
    },
    {
      name: 'add(a, b)',
      vars: [
        { name: 'a', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'new' },
        { name: 'b', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'new' },
      ],
    },
  ],
  heap: [
    { id: 'addFn', pyId: ADDRS.addFn, type: 'function', value: 'add(a, b)', refcount: 1, mutable: false },
    { id: 'int2',  pyId: ADDRS.int2,  type: 'int',      value: 2,           refcount: 1, mutable: false },
    { id: 'int3',  pyId: ADDRS.int3,  type: 'int',      value: 3,           refcount: 1, mutable: false },
  ],
  highlight: ['int2', 'int3'],
}
```

Frame ordering rule: write frames from caller to callee (`global`, then the active function, then deeper calls). The visualizer reverses that order visually so the active frame appears at the top of the call stack.

### Function objects

Function definitions can be represented like normal heap objects:

```js
{
  id: 'greetFn',
  pyId: ADDRS.greetFn,
  type: 'function',
  value: 'greet(name)',
  refcount: 1,
  mutable: false,
  state: 'new',
}
```

This keeps the explanation Python-level: `def` creates a function object and binds a name to it. Avoid explaining low-level runtime implementation details unless they directly help the learner's mental model.

### Closures and remembered state

For closure demos, represent remembered outer names explicitly as Python-level state. A small `dict` object works well because the visualizer already supports key/value pairs:

```js
{
  id: 'closureState',
  pyId: ADDRS.closureState,
  type: 'dict',
  refcount: 1,
  mutable: true,
  state: 'normal',
  pairs: [
    { key: 'count', value: 1, type: 'int' },
  ],
}
```

This is a teaching diagram, not a claim that Python literally stores closures as dictionaries. Use copy such as "remembered outer state" or "closure cell" so learners understand the behavior without needing implementation internals.

### Container references and nested objects

For list and dict sessions, keep the model Python-level: containers are heap objects, and their slots/values point to other objects. Avoid claiming that the browser diagram is the literal CPython structure.

The current visualizer displays collection items as values, not as clickable arrows. When teaching nested containers, use readable labels inside the parent container and render the nested objects separately on the heap:

```js
{
  frames: [{ name: 'global', vars: [
    { name: 'original', ref: 'outerList', pyId: ADDRS.outerList, type: 'list', state: 'new' },
    { name: 'copy',     ref: 'copyList',  pyId: ADDRS.copyList,  type: 'list', state: 'new' },
  ]}],
  heap: [
    {
      id: 'innerList',
      pyId: ADDRS.innerList,
      type: 'list',
      refcount: 2,
      mutable: true,
      state: 'mutated',
      items: [
        { value: 1, type: 'int' },
        { value: 99, type: 'int' },
      ],
    },
    {
      id: 'outerList',
      pyId: ADDRS.outerList,
      type: 'list',
      refcount: 1,
      mutable: true,
      state: 'normal',
      items: [
        { value: 'innerList -> 0x7f532010', type: 'str' },
      ],
    },
    {
      id: 'copyList',
      pyId: ADDRS.copyList,
      type: 'list',
      refcount: 1,
      mutable: true,
      state: 'normal',
      items: [
        { value: 'innerList -> 0x7f532010', type: 'str' },
      ],
    },
  ],
  highlight: ['innerList', 'outerList', 'copyList'],
}
```

Use this pattern when showing:

- aliasing: two names point to the same container object;
- shallow copy: two outer containers point to some of the same inner objects;
- function side effects: a parameter name points to the caller's mutable object;
- dict values: keys map to values, and those values can be mutable objects such as lists.

For dicts, use `pairs` and the same label convention when a value points to a nested object:

```js
{
  id: 'profileDict',
  pyId: ADDRS.profileDict,
  type: 'dict',
  refcount: 1,
  mutable: true,
  pairs: [
    { key: 'name', value: 'Ada', type: 'str' },
    { key: 'skills', value: 'list -> 0x7f580010', type: 'str' },
  ],
}
```

When explaining this to learners, say "at the Python level, think of this slot/value as referring to another object." This gives the right mental model without introducing C structs or implementation-specific storage details.

### Classes, instances, and lookup links

Session 04 uses extra snapshot fields so learners can see type links without stuffing them into `__dict__`:

```js
{
  id: 'pInst',
  pyId: ADDRS.pInst,
  type: 'instance',
  value: 'Point()',
  refcount: 1,
  mutable: true,
  classRef: { name: 'Point', pyId: ADDRS.PointCls },  // type(p)
  dictLabel: 'instance __dict__',                     // optional caption
  pairs: [{ key: 'x', value: 3, type: 'int' }],
  note: 'empty __dict__ — lookup walks to the class', // optional footer
}
```

On a subclass, show bases instead of copying methods:

```js
{
  id: 'DogCls',
  type: 'class',
  value: 'class Dog',
  bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }],
  pairs: [],
  note: 'speak is not copied here',
}
```

`classRef` and `bases` are teaching links for `__class__` / `__bases__`. Count them in `refcount` when you want the diagram to show that instances keep the class alive.

### Function attributes (`__name__`, `__wrapped__`)

A `type: 'function'` object accepts `pairs`, so a decorator session can show the
labels a wrapper carries:

```js
{
  id: 'wrapper',
  pyId: ADDRS.wrapper,
  type: 'function',
  value: 'wrapper(text)',
  refcount: 1,
  mutable: false,
  dictLabel: 'function attributes',
  pairs: [
    { key: '__name__', value: 'greet', type: 'str' },
    { key: '__wrapped__', value: 'greet @ 0x7f9200c8', type: 'str' },
  ],
}
```

For a closure, keep using a separate labelled `dict` object (`dictLabel:
'closure cell on wrapper'`) as Session 02 does. Real closures are a tuple of
cells, not a dict — the label is what keeps the diagram honest.

### Demo "Watch for" hints

Each demo may include a `watch` HTML string. `PJ.Session.mount` writes it into `#demoWatch`. Older sessions can call `PJ.Session.setWatch(demo.watch)` from their own `switchDemo`.

```js
create: {
  watch: 'Find <code>self</code> and <code>p</code>. Same address means the same instance.',
  code: `...`,
  steps: [ /* ... */ ],
}
```

### Memory address conventions

Pre-generate a set of stable addresses for each session to keep the display consistent:

```js
const ADDRS = {
  globalInt: '0x7f10a0',
  localStr:  '0x7f20d0',
  heapList:  '0x7f30e4',
};
```

Use sequential `0x7fXXXX` format. Real CPython addresses look like this.

---

## 7. Component Reference

### Buttons

```html
<button class="btn btn--primary">Primary Action</button>
<button class="btn btn--secondary">Secondary</button>
<button class="btn btn--ghost">Ghost</button>
<button class="btn btn--primary btn--sm">Small</button>
<button class="btn btn--primary btn--lg">Large</button>
<button class="btn btn--icon btn--secondary">...</button>
```

### Type Chips

```html
<span class="type-chip type-chip--int">int</span>
<span class="type-chip type-chip--str">str</span>
<span class="type-chip type-chip--list">list</span>
<span class="type-chip type-chip--function">function</span>
<!-- values: int, float, str, bool, none, list, dict, tuple, set, function, class, instance, method, generator, iterator -->
```

Use `type: 'function'` in memory snapshots for objects created by `def`. The shared chip style is available in `components.css`.

### Callout Boxes

```html
<div class="callout callout--info">    <!-- blue/teal -->
<div class="callout callout--warn">    <!-- amber -->
<div class="callout callout--success"> <!-- green -->
<div class="callout callout--insight"> <!-- purple -->
  <div class="callout__icon">💡</div>
  <div>
    <div class="callout__title">Title here</div>
    <div class="callout__body">Body text here.</div>
  </div>
</div>
```

### Code Block (static, no animation)

```html
<div class="code-block">
  <div class="code-block__header">
    <div class="code-block__dots">
      <div class="code-block__dot"></div>
      <div class="code-block__dot"></div>
      <div class="code-block__dot"></div>
    </div>
    <span class="code-block__lang">python</span>
  </div>
  <div class="code-block__body">
    <!-- Use syntax token classes: tok-kw, tok-fn, tok-str, tok-num, tok-cmt, tok-op, tok-bool -->
    <span class="tok-kw">x</span> = <span class="tok-num">42</span>
  </div>
</div>
```

### Section Divider

```html
<div class="section-divider">
  <div class="section-divider__label">My Section</div>
</div>
```

### Narrative Layout

```html
<article class="narrative">
  <h2>Section Title</h2>
  <p>Body text...</p>

  <div class="callout callout--info">...</div>

  <h3>Sub-section</h3>
  <p>More text...</p>
</article>
```

### Learning Overview / Lab Flow Pattern

Session 02 introduced a reusable page structure for complex topics, and Session 03 reused it successfully for container/reference topics:

```html
<section class="learning-overview">...</section>
<section class="stage-intro">...</section>
<div class="demo-guide">...</div>
<div class="demo-selector">...</div>
<div class="stage" id="stage">...</div>
<div class="explanation-strip">...</div>
<article class="narrative">...</article>
```

All of these classes are in `session.css`. Every live session uses this order:
- `learning-overview` states the mental model and learning path before the animation.
- `stage-intro` explains how to read the code panel and memory panel.
- `demo-guide` gives short interaction instructions.
- `demo-selector` switches between 3-5 focused demos.
- `narrative` provides the deep explanation after learners have seen the animation.

Follow the same order in a new session so a reader who has done one session already knows where to look in the next.

### Static Reference Map Pattern

Session 03 uses a static `reference-map` in the narrative to reinforce the same idea shown in the animation:

```html
<div class="reference-map" aria-label="Reference diagram for a list alias">
  <div class="reference-map__row">
    <div class="reference-map__name">nums</div>
    <div class="reference-map__arrow">-&gt;</div>
    <div class="reference-map__object">
      list @ 0x7f530010
      <span class="reference-map__slot">[0] -&gt; 99</span>
      <span class="reference-map__slot">[1] -&gt; 20</span>
    </div>
  </div>
</div>
```

Use this for concepts where a static diagram helps learners pause after the animation:

- name-to-object aliases;
- nested list/dict references;
- shallow copy before/after states;
- function parameter references.

These classes live in `session.css` and are available to every session.

### Entrance Animations

Add these classes to any element for entrance animations:
```html
<div class="animate-fade-up">Fades in from below</div>
<div class="animate-fade-up delay-1">...with 80ms delay</div>
<div class="animate-fade-up delay-2">...with 160ms delay</div>
<div class="animate-scale-in">Scales in</div>
```
Delays: `delay-1` = 80ms, `delay-2` = 160ms, `delay-3` = 240ms, `delay-4` = 320ms, `delay-5` = 400ms.

---

## 8. Design Principles & Dos / Don'ts

### DO

- ✅ Use design tokens (CSS variables) for every color, size, and spacing value
- ✅ Test at 320px, 375px, 768px, 900px and 1440px before committing
- ✅ Explain in plain words first, then name the term — the `in-plain` / `then-precise`
     pair exists for exactly this, and it is what makes one page work for a
     school student and a senior engineer at the same time
- ✅ Run every factual claim through the interpreter before you write it down
- ✅ Keep steps short — one concept per step
- ✅ Use `state: 'new'` on newly created heap objects (triggers the appear animation)
- ✅ Use `state: 'gc'` on objects about to be garbage collected (triggers the red pulsing border)
- ✅ Use `state: 'rebound'` on a var row when its reference has just changed
- ✅ Use `frames` instead of `frame` when showing function calls, recursion, closures, or nested scopes
- ✅ Represent function definitions with `type: 'function'` heap objects
- ✅ Represent list and dict aliases by pointing multiple names at the same heap object ID
- ✅ For nested containers, render the nested object separately and label parent slots/values with `name -> 0x7f...`
- ✅ Put the most important insight in the second-to-last step, and confirm/summarize on the last
- ✅ Use callouts generously — they break up text and highlight key insights
- ✅ Make `highlight` arrays specific — highlight only the objects currently being discussed

### DON'T

- ❌ Add a `<style>` block to a session page, or an `onclick` attribute anywhere
- ❌ Re-implement anything `PJ.Core.init()` or `PJ.Session.mount()` already does
- ❌ State a Python fact you have not run — especially about refcounts, identity or freeing
- ❌ Draw a cached small int (−5 to 256) or a short string as garbage collected; they are immortal
- ❌ Hardcode hex colors or pixel values — use CSS variables
- ❌ Add more than 10 steps to a demo — learners lose context
- ❌ Skip the initial "empty state" step — learners need to see the baseline
- ❌ Use `inline: true` on variables that point to heap objects — use `ref` instead
- ❌ Explain Python behavior through C/Cython implementation details in learner-facing copy; keep the model Python-level unless low-level details are essential
- ❌ Claim the visualizer's nested-reference labels are literal CPython storage; they are teaching labels for Python-level references
- ❌ Name heap objects generically (e.g., `obj1`) — use meaningful names like `iCount` for an int named `count`
- ❌ Forget to update the sidebar active state in each session
- ❌ Add session-global styles that leak into the common CSS files

---

## 9. Responsive Checklist

Before shipping a session, verify:

- [ ] No horizontal page scroll at **320px** — the strictest real width. Check with
      `document.documentElement.scrollWidth > document.documentElement.clientWidth`.
- [ ] Stage code panel readable at 375px; indentation visible (the panel uses `white-space: pre`)
- [ ] Memory panel scrolls rather than clipping when a snapshot is tall — step to
      the busiest step of the busiest demo and confirm you can reach the bottom
- [ ] The memory panel does not overlap the explanation strip below it
- [ ] Playback controls reachable with a thumb (tap targets ≥ 44px on touch)
- [ ] Sidebar toggle opens **and** closes, and tapping a section link dismisses it
- [ ] Narrative text has appropriate padding on mobile (`var(--sp-5)`)
- [ ] Type explorer grid wraps gracefully at small sizes
- [ ] Comparison tables scroll horizontally (wrap in `<div style="overflow-x:auto">`)
- [ ] Check the awkward middle too: **860–1024px**, where the sidebar is still
      pinned but the stage has just gone single-column
- [ ] Prose never says "on the right" or "on the left" about the panels — below
      860px they stack vertically
- [ ] Tab through the whole lab: every control has a visible focus ring, and
      `Space` on a quiz option answers it rather than starting playback

---

## 10. Example: Minimal New Session

Here is the complete `session.js` for a new session. This is the whole file —
there is no `initStage`, no `switchDemo`, no scroll wiring.

```js
'use strict';

/* Stable, made-up CPython-style addresses. Reuse the same address for the same
   object across steps so a learner can track it by eye. */
const ADDRS = {
  greetFn: '0x7f9100a0',
  int2:    '0x7f110002',
};

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {
  callStack: {
    watch: 'Watch the frame appear, then disappear. The function object stays put.',
    code: `def greet(name):
    return "Hello, " + name

result = greet("Alice")`,
    steps: [
      {
        // First step: always the empty/initial state, always lines: [].
        title: 'Nothing has run yet',
        desc: 'The module has been read but no line has executed.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>def greet</code> creates a function object',
        desc: '<code>def</code> builds an object on the heap and binds a name to it. The body does not run.',
        lines: [1, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'greet', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['greetFn'],
        },
      },
      // ... more steps; last one summarises the final state.
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '07-your-topic',
    demos: DEMOS,
    defaultDemo: 'callStack',
    defaultSpeed: 900,
  });
});
```

### Before you open a PR

Run these. They are quick and they catch the mistakes that actually ship:

```bash
# 1. The file parses.
node --check sessions/07-your-topic/session.js

# 2. Every `lines:` number is a real line of that demo's own `code` string.
#    (Off-by-one line references are the single most common session bug.)
node -e "
  const fs=require('fs');
  let src=fs.readFileSync('sessions/07-your-topic/session.js','utf8')
            .replace(/document\.addEventListener[\s\S]*$/,'')+'
module.exports=DEMOS;';
  fs.writeFileSync('/tmp/d.js',src);
  for (const [k,d] of Object.entries(require('/tmp/d.js'))) {
    const n=d.code.split('
').length;
    d.steps.forEach((s,i)=>(s.lines||[]).forEach(L=>{
      if(L<1||L>n) console.log('BAD', k, 'step', i+1, '-> line', L, '(code has', n, 'lines)');
    }));
    if((d.steps[0].lines||[]).length) console.log('BAD', k, 'step 1 should have lines: []');
    if(d.steps.length<5||d.steps.length>10) console.log('WARN', k, 'has', d.steps.length, 'steps');
  }
  console.log('line-reference check done');
"

# 3. Every factual claim is true in the Python you are targeting.
python -c "import sys; print(sys.version)"
```

**Run your claims through the interpreter.** If a step says an object is freed,
prove it — subclass with `__del__` and watch it fire. If it says two names share
an object, check `a is b`. Small integers (−5 to 256) and short strings are
cached and, since CPython 3.12, **immortal**: `sys.getrefcount(42)` is
4294967295 and they are never garbage collected. Never draw one with
`state: 'gc'` or `refcount: 0`. When a demo needs a genuine refcount → 0 → freed
moment, use a list.

---

## Questions / Contributing

Open an issue on GitHub, or submit a PR!
All contributions must follow the [PI Community License](LICENSE).
