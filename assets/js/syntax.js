/* ============================================================
   PY INTERNALS — SYNTAX.JS
   Lightweight Python syntax highlighter + line manager
   ============================================================ */

'use strict';

window.PJ = window.PJ || {};

PJ.Syntax = (function () {

  const KEYWORDS = new Set(('def class return if elif else for while in not and or import from as ' +
    'with try except finally raise pass break continue lambda yield del global nonlocal assert is')
    .split(' '));

  const BUILTINS = new Set(('print len type id range list dict tuple set int float str bool input ' +
    'enumerate zip map filter sorted reversed sum min max abs isinstance hasattr getattr setattr ' +
    'super staticmethod classmethod property iter next append extend insert remove pop update ' +
    'keys values items copy deepcopy').split(' '));

  const CONSTANTS = new Set(['True', 'False', 'None']);

  /* One pass, left to right. Each token is consumed exactly once, so the
     markup this emits can never be re-matched by a later rule — the previous
     multi-pass version wrapped the word `bool` inside its own `tok-bool`
     class attribute, and lost string placeholders that landed in comments. */
  const TOKEN = new RegExp([
    '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\')',   // 1 triple-quoted string
    '("[^"\\n]*"|\'[^\'\\n]*\')',                  // 2 single-line string
    '(#[^\\n]*)',                                  // 3 comment
    '(@[A-Za-z_][\\w.]*)',                         // 4 decorator
    '([A-Za-z_]\\w*)',                             // 5 word
    '(\\d+\\.?\\d*)',                              // 6 number
  ].join('|'), 'g');

  function escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function wrap(cls, text) {
    return `<span class="tok-${cls}">${escapeHTML(text)}</span>`;
  }

  /**
   * Highlight a Python source string → HTML string
   */
  function highlight(source) {
    let out = '';
    let last = 0;
    let m;

    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(source)) !== null) {
      out += escapeHTML(source.slice(last, m.index));
      last = TOKEN.lastIndex;

      if (m[1] || m[2])      out += wrap('str', m[1] || m[2]);
      else if (m[3])         out += wrap('cmt', m[3]);
      else if (m[4])         out += wrap('kw', m[4]);
      else if (m[5]) {
        const word = m[5];
        if (KEYWORDS.has(word))       out += wrap('kw', word);
        else if (CONSTANTS.has(word)) out += wrap('bool', word);
        else if (BUILTINS.has(word))  out += wrap('fn', word);
        else                          out += escapeHTML(word);
      }
      else if (m[6])         out += wrap('num', m[6]);
    }

    return out + escapeHTML(source.slice(last));
  }

  /**
   * Render code into a container with line numbers and highlight support
   * @param {string}  source        - Python source string
   * @param {Element} container     - DOM element to render into
   * @param {Object}  [opts]
   * @param {number}  [opts.startLine=1]
   * @param {Array}   [opts.executedLines]  - Lines already executed
   */
  function render(source, container, opts = {}) {
    const lines      = source.split('\n');
    const startLine  = opts.startLine || 1;
    const executed   = new Set(opts.executedLines || []);

    container.innerHTML = '';

    lines.forEach((rawLine, i) => {
      const lineNum = startLine + i;
      const lineEl  = document.createElement('span');
      lineEl.className = 'code-line';
      lineEl.dataset.line = lineNum;

      if (executed.has(lineNum)) lineEl.classList.add('executed');

      const numEl = document.createElement('span');
      numEl.style.cssText = `
        display:inline-block;
        width:2.5em;
        text-align:right;
        margin-right:1em;
        color:rgba(255,255,255,0.42);
        user-select:none;
        font-size:.9em;
      `;
      numEl.textContent = lineNum;

      const codeEl = document.createElement('span');
      codeEl.innerHTML = highlight(rawLine || ' ');

      lineEl.appendChild(numEl);
      lineEl.appendChild(codeEl);
      container.appendChild(lineEl);
    });
  }

  /**
   * Highlight specific lines (1-indexed), clear others
   * @param {Element} container
   * @param {number|number[]} lines  - line number(s) to highlight
   */
  function highlightLines(container, lines) {
    const target = Array.isArray(lines) ? lines : [lines];

    container.querySelectorAll('.code-line').forEach(el => {
      el.classList.remove('highlighted', 'highlighting');
    });

    let first = null;
    target.forEach(lineNum => {
      const el = container.querySelector(`[data-line="${lineNum}"]`);
      if (el) {
        el.classList.add('highlighted', 'highlighting');
        if (!first) first = el;
      }
    });

    // Scroll the code panel itself, never the page. scrollIntoView() would drag
    // the whole document around every step on a phone.
    if (first && container.scrollHeight > container.clientHeight) {
      const top = first.offsetTop - container.clientHeight / 2 + first.offsetHeight / 2;
      const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({ top: Math.max(0, top), behavior: calm ? 'auto' : 'smooth' });
    }
  }

  /**
   * Mark lines as executed (greyed out highlight)
   */
  function markExecuted(container, lines) {
    const target = Array.isArray(lines) ? lines : [lines];
    target.forEach(lineNum => {
      const el = container.querySelector(`[data-line="${lineNum}"]`);
      if (el) el.classList.add('executed');
    });
  }

  return { highlight, render, highlightLines, markExecuted };
})();
