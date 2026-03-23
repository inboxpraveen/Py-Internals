/* ============================================================
   PY INTERNALS — MEMORY-VIZ.JS
   Renders Python's memory model:
   - Named bindings (stack / namespace)
   - Heap objects with id(), type, value, refcount
   - Reference arrows (SVG)
   - Mutations, rebindings, GC pending states
   ============================================================ */

'use strict';

window.PJ = window.PJ || {};

/**
 * PJ.MemoryViz
 * ------------
 * Renders a snapshot of Python's memory model into a target element.
 *
 * Usage:
 *   const viz = new PJ.MemoryViz('memory-panel');
 *   viz.render(snapshot);
 *
 * Snapshot format:
 *   {
 *     frame: {
 *       name: 'global',
 *       vars: [
 *         { name: 'x', ref: 'obj-1' },           // reference to heap obj
 *         { name: 'y', value: 42, type: 'int', inline: true }, // inline display
 *       ]
 *     },
 *     heap: [
 *       {
 *         id: 'obj-1',
 *         pyId: '0x7f1234',  // simulated Python id()
 *         type: 'int',
 *         value: 42,
 *         refcount: 1,
 *         mutable: false,
 *         state: 'new' | 'normal' | 'gc' | 'mutated',
 *         items: [...],      // for list/tuple/set
 *         pairs: [...],      // for dict: [{key, val}]
 *       }
 *     ],
 *     highlight: ['obj-1'],  // IDs to highlight
 *   }
 */
PJ.MemoryViz = class {

  constructor(containerId) {
    this._container = document.getElementById(containerId);
    this._prevSnapshot = null;

    if (!this._container) {
      console.warn('[PJ.MemoryViz] Container not found:', containerId);
    }
  }

  // ── Main Render ───────────────────────────────────────────
  render(snapshot) {
    if (!this._container) return;

    // Clear
    this._container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'mem-canvas';

    // Stack section
    if (snapshot.frame) {
      wrap.appendChild(this._renderFrame(snapshot.frame, snapshot.highlight || []));
    }

    // Heap section
    if (snapshot.heap && snapshot.heap.length > 0) {
      wrap.appendChild(this._renderHeap(snapshot.heap, snapshot.highlight || []));
    }

    this._container.appendChild(wrap);
    this._prevSnapshot = snapshot;
  }

  // ── Frame (namespace / stack) ─────────────────────────────
  _renderFrame(frame, highlight) {
    const section = document.createElement('div');
    section.className = 'mem-stack';

    const label = document.createElement('div');
    label.className = 'mem-section-label';
    label.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style="color:var(--clr-mem-stack);opacity:.7">
        <rect x="1" y="3" width="10" height="7" rx="1.5" opacity=".4"/>
        <rect x="3" y="1" width="6" height="3" rx="1"/>
      </svg>
      Namespace
    `;
    section.appendChild(label);

    const frameEl = document.createElement('div');
    frameEl.className = 'mem-frame';

    const header = document.createElement('div');
    header.className = 'mem-frame__header';
    header.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style="color:var(--clr-mem-stack)">
        <rect x="1" y="1" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4 4h4M4 6h3M4 8h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <span>${frame.name || 'global'}</span>
      <span class="mem-frame__scope-badge">scope</span>
    `;
    frameEl.appendChild(header);

    if (!frame.vars || frame.vars.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:12px 16px;font-size:var(--fs-xs);color:var(--clr-text-3);font-style:italic';
      empty.textContent = '(no variables yet)';
      frameEl.appendChild(empty);
    } else {
      frame.vars.forEach(v => {
        frameEl.appendChild(this._renderVar(v, highlight));
      });
    }

    section.appendChild(frameEl);
    return section;
  }

  _renderVar(v, highlight) {
    const row = document.createElement('div');
    row.className = 'mem-var';
    row.dataset.varName = v.name;

    // Animation classes
    if (v.state === 'new')      row.classList.add('new-var');
    if (v.state === 'deleted')  row.classList.add('deleted');
    if (v.state === 'rebound')  row.classList.add('rebound');
    if (highlight.includes(v.ref || v.name)) row.classList.add('highlight');

    const nameEl = document.createElement('span');
    nameEl.className = 'mem-var__name';
    nameEl.textContent = v.name;

    const arrow = document.createElement('span');
    arrow.className = 'mem-var__arrow';
    arrow.innerHTML = '→';

    row.appendChild(nameEl);
    row.appendChild(arrow);

    if (v.inline) {
      // Show value directly (for simple immutable display)
      const val = document.createElement('span');
      val.className = 'mem-var__inline-val';
      val.innerHTML = this._renderValueHTML(v.value, v.type);
      row.appendChild(val);
    } else {
      // Show reference ID + type chip
      const ref = document.createElement('span');
      ref.className = 'mem-var__ref';
      ref.textContent = v.pyId || (v.ref ? `id:${v.ref.replace('obj-','')}` : '?');
      ref.dataset.ref = v.ref;
      ref.title = `Points to object at id ${v.pyId || v.ref}`;

      const chip = this._makeTypeChip(v.type || '?');

      row.appendChild(chip);
      row.appendChild(ref);
    }

    return row;
  }

  // ── Heap ─────────────────────────────────────────────────
  _renderHeap(heap, highlight) {
    const section = document.createElement('div');
    section.className = 'mem-heap';

    const label = document.createElement('div');
    label.className = 'mem-section-label';
    label.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style="color:var(--clr-mem-heap);opacity:.7">
        <ellipse cx="6" cy="4" rx="5" ry="2.5" opacity=".4"/>
        <path d="M1 4v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V4" fill="none" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      Heap Objects
    `;
    section.appendChild(label);

    heap.forEach(obj => {
      section.appendChild(this._renderObj(obj, highlight));
    });

    return section;
  }

  _renderObj(obj, highlight) {
    const el = document.createElement('div');
    el.className = 'mem-obj';
    el.id = `heap-${obj.id}`;
    el.classList.add(obj.mutable ? 'mutable' : 'immutable');

    if (obj.state === 'new')     el.classList.add('new-obj', 'mem-appear');
    if (obj.state === 'gc')      el.classList.add('gc-pending');
    if (obj.state === 'mutated') el.classList.add('mutated');
    if (highlight.includes(obj.id)) el.classList.add('id-match-highlight');

    // Header
    const header = document.createElement('div');
    header.className = 'mem-obj__header';
    header.innerHTML = `
      ${this._makeTypeChip(obj.type).outerHTML}
      ${this._makeMutabilityBadge(obj.mutable).outerHTML}
      <span class="mem-obj__id">${obj.pyId || obj.id}</span>
      <span class="mem-obj__refcount ${obj.refcount === 0 ? 'decreasing' : ''}"
            title="Reference count">
        refs: ${obj.refcount ?? '?'}
      </span>
    `;
    el.appendChild(header);

    // Value / items
    if (obj.type === 'list' || obj.type === 'tuple' || obj.type === 'set') {
      el.appendChild(this._renderCollectionItems(obj));
    } else if (obj.type === 'dict') {
      el.appendChild(this._renderDict(obj));
    } else {
      const valEl = document.createElement('div');
      valEl.className = 'mem-obj__value';
      valEl.innerHTML = this._renderValueHTML(obj.value, obj.type);
      el.appendChild(valEl);
    }

    return el;
  }

  _renderCollectionItems(obj) {
    const wrap = document.createElement('div');
    wrap.className = 'mem-obj__items';
    (obj.items || []).forEach((item, i) => {
      const cell = document.createElement('span');
      cell.className = 'mem-obj__item-cell';
      cell.innerHTML = `
        <span class="item-index">[${i}]</span>
        ${this._renderValueHTML(item.value, item.type)}
      `;
      wrap.appendChild(cell);
    });
    return wrap;
  }

  _renderDict(obj) {
    const wrap = document.createElement('div');
    (obj.pairs || []).forEach(pair => {
      const row = document.createElement('div');
      row.className = 'mem-obj__dict-row';
      row.innerHTML = `
        <span class="dict-key">'${pair.key}'</span>
        <span class="dict-colon">:</span>
        <span class="dict-val">${this._renderValueHTML(pair.value, pair.type)}</span>
      `;
      wrap.appendChild(row);
    });
    return wrap;
  }

  // ── Helper: render a value as colored HTML ────────────────
  _renderValueHTML(value, type) {
    if (type === 'str')   return `<span style="color:var(--clr-type-str)">'${value}'</span>`;
    if (type === 'int')   return `<span style="color:var(--clr-type-int)">${value}</span>`;
    if (type === 'float') return `<span style="color:var(--clr-type-float)">${value}</span>`;
    if (type === 'bool')  return `<span style="color:var(--clr-type-bool)">${value ? 'True' : 'False'}</span>`;
    if (type === 'none')  return `<span style="color:var(--clr-type-none)">None</span>`;
    return `<span>${value}</span>`;
  }

  // ── Helper: type chip element ─────────────────────────────
  _makeTypeChip(type) {
    const el = document.createElement('span');
    el.className = `type-chip type-chip--${type}`;
    el.textContent = type;
    return el;
  }

  // ── Helper: mutability badge ──────────────────────────────
  _makeMutabilityBadge(mutable) {
    const el = document.createElement('span');
    el.className = `mutability-badge mutability-badge--${mutable ? 'mutable' : 'immutable'}`;
    el.innerHTML = mutable
      ? `<svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M1 4h6M4 1v6" stroke-linecap="round"/></svg> mutable`
      : `<svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M2 2a2 2 0 004 0" stroke="currentColor" fill="none" stroke-width="1.2"/><rect x="1" y="3" width="6" height="4" rx="1"/></svg> immutable`;
    return el;
  }

  // ── Clear ─────────────────────────────────────────────────
  clear() {
    if (this._container) this._container.innerHTML = '';
  }
};
