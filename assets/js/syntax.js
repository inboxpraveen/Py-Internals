/* ============================================================
   PY INTERNALS — SYNTAX.JS
   Lightweight Python syntax highlighter + line manager
   ============================================================ */

'use strict';

window.PJ = window.PJ || {};

PJ.Syntax = (function () {

  // Python keywords, builtins, constants
  const KEYWORDS  = /\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|pass|break|continue|lambda|yield|del|global|nonlocal|assert|is)\b/g;
  const BUILTINS  = /\b(print|len|type|id|range|list|dict|tuple|set|int|float|str|bool|input|enumerate|zip|map|filter|sorted|reversed|sum|min|max|abs|isinstance|hasattr|getattr|setattr|append|extend|insert|remove|pop|update|keys|values|items)\b/g;
  const CONSTANTS = /\b(True|False|None)\b/g;
  const STRINGS1  = /("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*')/g;
  const NUMBERS   = /\b(\d+\.?\d*)\b/g;
  const COMMENTS  = /(#[^\n]*)/g;
  const OPERATORS = /([=!<>+\-*\/&|^~%]+|:)/g;
  const DECORATORS = /(@\w+)/g;

  /**
   * Highlight a Python source string → HTML string
   */
  function highlight(source) {
    // Escape HTML first
    let s = source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Order matters: strings first (avoid highlighting inside strings)
    // We'll use a token-based approach with placeholders

    const tokens = [];
    let idx = 0;

    // Extract strings (single + triple quoted)
    s = s.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*')/g, (m) => {
      const key = `\x00STR${idx++}\x00`;
      tokens.push({ key, html: `<span class="tok-str">${m}</span>` });
      return key;
    });

    // Extract comments
    s = s.replace(/(#[^\n]*)/g, (m) => {
      const key = `\x00CMT${idx++}\x00`;
      tokens.push({ key, html: `<span class="tok-cmt">${m}</span>` });
      return key;
    });

    // Keywords
    s = s.replace(KEYWORDS, (m) => `<span class="tok-kw">${m}</span>`);

    // Constants
    s = s.replace(CONSTANTS, (m) => `<span class="tok-bool">${m}</span>`);

    // Built-ins
    s = s.replace(BUILTINS, (m) => `<span class="tok-fn">${m}</span>`);

    // Numbers
    s = s.replace(NUMBERS, (m) => `<span class="tok-num">${m}</span>`);

    // Decorators
    s = s.replace(DECORATORS, (m) => `<span class="tok-kw">${m}</span>`);

    // Restore placeholders
    tokens.forEach(({ key, html }) => {
      s = s.replace(key, html);
    });

    return s;
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
        color:rgba(255,255,255,0.2);
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

    target.forEach(lineNum => {
      const el = container.querySelector(`[data-line="${lineNum}"]`);
      if (el) {
        el.classList.add('highlighted', 'highlighting');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
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
