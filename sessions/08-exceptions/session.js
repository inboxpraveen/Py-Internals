/* ============================================================
   SESSION 08 — Exceptions, Tracebacks & Context Managers
   Demos: raise unwinds the stack, try/except stops it, finally on
   the way out, with (success), with (exception), raise ... from
   ============================================================ */

'use strict';

/* Stable, made-up CPython-style addresses. One family (0x7fc…) for the whole
   session; the second digit is the demo number so an address is never reused
   across demos by accident. */
const ADDRS = {
  /* 1 · unwind */
  ValueErrorCls: '0x7fc10040',
  loadFn:        '0x7fc100a0',
  parseFn:       '0x7fc10120',
  mainFn:        '0x7fc101a0',
  exc1:          '0x7fc10240',

  /* 2 · catch */
  loadFn2:       '0x7fc200a0',
  mainFn2:       '0x7fc20120',
  exc2:          '0x7fc20240',
  strFallback:   '0x7fc20300',

  /* 3 · finally */
  FileCls:       '0x7fc30040',
  readFn:        '0x7fc300a0',
  fileObj:       '0x7fc30140',
  strText:       '0x7fc30200',

  /* 4 · with */
  ResourceCls:   '0x7fc40040',
  enterFn:       '0x7fc400c0',
  exitFn:        '0x7fc40140',
  rInst:         '0x7fc401c0',

  /* 5 · with + raise */
  ResourceCls5:  '0x7fc50040',
  enterFn5:      '0x7fc500c0',
  exitFn5:       '0x7fc50140',
  rInst5:        '0x7fc501c0',
  ValueErrorCls5:'0x7fc50060',
  exc5:          '0x7fc50240',

  /* 6 · chaining */
  RuntimeErrorCls:'0x7fc60040',
  ValueErrorCls6: '0x7fc60060',
  parseFn6:      '0x7fc600a0',
  valErr:        '0x7fc60140',
  runErr:        '0x7fc601c0',
};

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

/* An exception is an ordinary instance (Session 04's vocabulary): a class
   link, and a few well-known attributes. `__traceback__` is drawn as the list
   of frames the exception has passed through so far, outermost first — that
   is the order `tb_next` walks, and the order the printed traceback uses. */
function exception(id, pyId, clsName, clsId, message, opts) {
  const o = opts || {};
  return {
    id, pyId,
    type: 'instance',
    value: `${clsName}(${JSON.stringify(message)})`,
    refcount: o.refcount ?? 1,
    mutable: true,
    state: o.state || 'normal',
    classRef: { name: clsName, pyId: clsId },
    dictLabel: 'exception state',
    pairs: [
      { key: 'args', value: `(${JSON.stringify(message)},)`, type: 'tuple' },
      { key: '__traceback__', value: o.tb || 'None', type: o.tb ? 'ref' : 'none' },
      { key: '__cause__', value: o.cause || 'None', type: o.cause ? 'ref' : 'none' },
      { key: '__context__', value: o.context || 'None', type: o.context ? 'ref' : 'none' },
    ].concat(o.extra || []),
    note: o.note,
  };
}

const DEMOS = {

  /* ──────────────────────────────────────────────────────────
     1 · raise builds an object and unwinds the stack
     ────────────────────────────────────────────────────────── */
  unwind: {
    watch: 'Watch the <code>__traceback__</code> row on the exception. It grows by one frame every time a desk is cleared — and nobody ever catches it.',
    code: `def load():
    raise ValueError("bad data")

def parse():
    return load()

def main():
    return parse()

main()`,
    steps: [
      {
        title: 'Nothing has run yet',
        desc: 'An exception is not a crash. It is an <strong>object</strong> that travels up the call stack, clearing one desk at a time, until some frame says it will deal with it. In this demo no frame does — so you get to see the whole journey.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'Three ordinary function objects',
        desc: 'Session 02, unchanged: each <code>def</code> builds a function object and binds a name. The <code>raise</code> on line 2 is just a line of code inside <code>load</code> — nothing has been raised.',
        lines: [1, 4, 7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'load',  ref: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', state: 'new' },
            { name: 'parse', ref: 'parseFn', pyId: ADDRS.parseFn, type: 'function', state: 'new' },
            { name: 'main',  ref: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', value: 'load()',  refcount: 1, mutable: false, state: 'new' },
            { id: 'parseFn', pyId: ADDRS.parseFn, type: 'function', value: 'parse()', refcount: 1, mutable: false, state: 'new' },
            { id: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', value: 'main()',  refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['loadFn', 'parseFn', 'mainFn'],
        },
      },
      {
        title: '<code>main()</code> → <code>parse()</code> → <code>load()</code>: three desks on the stack',
        desc: 'Each call opens a frame on top of the last. Every frame below the top one is paused on the line that made the call, waiting for a value to come back. Keep that picture — it is what an exception is about to walk through.',
        lines: [10, 8, 5],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load',  ref: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', state: 'normal' },
              { name: 'parse', ref: 'parseFn', pyId: ADDRS.parseFn, type: 'function', state: 'normal' },
              { name: 'main',  ref: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', state: 'normal' },
            ]},
            { name: 'main()',  vars: [] },
            { name: 'parse()', vars: [] },
            { name: 'load()',  vars: [] },
          ],
          heap: [
            { id: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', value: 'load()',  refcount: 1, mutable: false, state: 'normal' },
            { id: 'parseFn', pyId: ADDRS.parseFn, type: 'function', value: 'parse()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', value: 'main()',  refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
      {
        title: '<code>raise ValueError("bad data")</code> builds an object first',
        desc: '<code>ValueError("bad data")</code> is a constructor call like <code>Point(3, 4)</code> in Session 04: it makes an instance with a <code>__class__</code> link and an <code>args</code> tuple. Only then does <code>raise</code> act on it — it attaches a traceback entry for <em>this</em> frame and asks: does <code>load</code> have a handler around line 2? It does not.',
        lines: [2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load',  ref: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', state: 'normal' },
              { name: 'parse', ref: 'parseFn', pyId: ADDRS.parseFn, type: 'function', state: 'normal' },
              { name: 'main',  ref: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', state: 'normal' },
            ]},
            { name: 'main()',  vars: [] },
            { name: 'parse()', vars: [] },
            { name: 'load()',  badge: 'raising', state: 'unwinding', vars: [] },
          ],
          heap: [
            exception('exc1', ADDRS.exc1, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              state: 'new', tb: 'load (line 2)',
              note: 'an instance like any other — it has no idea it is "in flight"' }),
            { id: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', value: 'load()',  refcount: 1, mutable: false, state: 'normal' },
            { id: 'parseFn', pyId: ADDRS.parseFn, type: 'function', value: 'parse()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', value: 'main()',  refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc1'],
        },
      },
      {
        title: 'No handler in <code>load</code> — its desk is cleared, and the exception moves up',
        desc: 'The frame is removed exactly as it would be on <code>return</code>, except that no value goes back. Instead the exception object arrives in <code>parse</code>, at the line that made the call, and the same question is asked there. Look at <code>__traceback__</code>: a second entry, for <code>parse</code>, was added on the way in.',
        lines: [2, 5],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load',  ref: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', state: 'normal' },
              { name: 'parse', ref: 'parseFn', pyId: ADDRS.parseFn, type: 'function', state: 'normal' },
              { name: 'main',  ref: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', state: 'normal' },
            ]},
            { name: 'main()',  vars: [] },
            { name: 'parse()', badge: 'unwinding', state: 'unwinding', vars: [] },
          ],
          heap: [
            exception('exc1', ADDRS.exc1, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              state: 'mutated', tb: 'parse (line 5) → load (line 2)',
              note: 'same object, same address — only the traceback grew' }),
            { id: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', value: 'load()',  refcount: 1, mutable: false, state: 'normal' },
            { id: 'parseFn', pyId: ADDRS.parseFn, type: 'function', value: 'parse()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', value: 'main()',  refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc1'],
        },
      },
      {
        title: 'Same again in <code>main</code>',
        desc: '<code>parse</code> had no <code>try</code> around line 5, so its frame goes too. Now <code>main</code> is asked, at line 8. Three entries in the traceback, three desks it has walked through. Nothing in your code has been consulted yet — this is all bookkeeping the interpreter does between lines.',
        lines: [5, 8],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load',  ref: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', state: 'normal' },
              { name: 'parse', ref: 'parseFn', pyId: ADDRS.parseFn, type: 'function', state: 'normal' },
              { name: 'main',  ref: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'unwinding', state: 'unwinding', vars: [] },
          ],
          heap: [
            exception('exc1', ADDRS.exc1, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              state: 'mutated', tb: 'main (line 8) → parse (line 5) → load (line 2)' }),
            { id: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', value: 'load()',  refcount: 1, mutable: false, state: 'normal' },
            { id: 'parseFn', pyId: ADDRS.parseFn, type: 'function', value: 'parse()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', value: 'main()',  refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc1'],
        },
      },
      {
        title: 'It reaches the module level — and there is no handler anywhere',
        desc: 'The last desk is the module itself, paused on line 10. No <code>try</code> there either. When an exception runs out of frames, the interpreter prints the traceback to <code>stderr</code> and the process exits with status <code>1</code>. Nothing after line 10 will ever run.',
        lines: [8, 10],
        memory: {
          frames: [
            { name: 'global', badge: 'no handler', state: 'unwinding', vars: [
              { name: 'load',  ref: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', state: 'normal' },
              { name: 'parse', ref: 'parseFn', pyId: ADDRS.parseFn, type: 'function', state: 'normal' },
              { name: 'main',  ref: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            exception('exc1', ADDRS.exc1, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              state: 'mutated', tb: '<module> (line 10) → main (line 8) → parse (line 5) → load (line 2)',
              note: 'four frames deep — this list is what gets printed' }),
            { id: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', value: 'load()',  refcount: 1, mutable: false, state: 'normal' },
            { id: 'parseFn', pyId: ADDRS.parseFn, type: 'function', value: 'parse()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', value: 'main()',  refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc1'],
        },
      },
      {
        title: 'The printed traceback <em>is</em> that chain, written top to bottom',
        desc: '<code>Traceback (most recent call last):</code> then one entry per frame, outermost first: <code>&lt;module&gt;</code> line 10, <code>main</code> line 8, <code>parse</code> line 5, <code>load</code> line 2, and finally <code>ValueError: bad data</code>. Read it from the bottom: the last line is what went wrong, the entry above it is where, and everything above that is how the program got there.',
        lines: [10],
        memory: {
          frames: [
            { name: 'global', badge: 'exit status 1', vars: [
              { name: 'load',  ref: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', state: 'normal' },
              { name: 'parse', ref: 'parseFn', pyId: ADDRS.parseFn, type: 'function', state: 'normal' },
              { name: 'main',  ref: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            exception('exc1', ADDRS.exc1, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              tb: '<module> (line 10) → main (line 8) → parse (line 5) → load (line 2)',
              note: 'printed to stderr, then the whole process — and this object — is gone' }),
            { id: 'loadFn',  pyId: ADDRS.loadFn,  type: 'function', value: 'load()',  refcount: 1, mutable: false, state: 'normal' },
            { id: 'parseFn', pyId: ADDRS.parseFn, type: 'function', value: 'parse()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn',  pyId: ADDRS.mainFn,  type: 'function', value: 'main()',  refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     2 · try / except stops the unwinding at one frame
     ────────────────────────────────────────────────────────── */
  catch: {
    watch: 'Watch <code>main</code>&rsquo;s desk. It survives, <code>err</code> appears on it — and then <code>err</code> is deleted <em>before</em> the function returns.',
    code: `def load():
    raise ValueError("bad data")

def main():
    try:
        return load()
    except ValueError as err:
        print("recovered:", err)
    return "fallback"

result = main()`,
    steps: [
      {
        title: 'A handler is a frame that says &ldquo;I will deal with that&rdquo;',
        desc: 'Same <code>load</code>, same <code>raise</code>. The one difference is on lines 5–7: <code>main</code> wraps its call in a <code>try</code>. That is enough to stop the unwinding one desk up — and to show you what <code>as err</code> really binds.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'Two functions; <code>main</code> has a <code>try</code> around its call',
        desc: 'Defining a function with a <code>try</code> in it costs nothing at definition time. The <code>except</code> clause is not registered anywhere — it is just a region of <code>main</code>&rsquo;s code that the interpreter will look up <em>only if</em> an exception arrives while line 6 is executing.',
        lines: [1, 4, 5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'load', ref: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', state: 'new' },
            { name: 'main', ref: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', value: 'load()', refcount: 1, mutable: false, state: 'new' },
            { id: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', value: 'main()', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['loadFn2', 'mainFn2'],
        },
      },
      {
        title: '<code>main()</code> calls <code>load()</code> from inside the <code>try</code>',
        desc: 'Two desks. <code>main</code> is paused on line 6, which sits between <code>try</code> and <code>except</code>. That position is what will matter in a moment — not the word <code>try</code> itself, but which line the frame was on when the exception came back.',
        lines: [11, 6],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load', ref: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', vars: [] },
            { name: 'load()', vars: [] },
          ],
          heap: [
            { id: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', value: 'load()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', value: 'main()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
      {
        title: '<code>raise</code> builds the exception; <code>load</code> has no handler',
        desc: 'Exactly as in demo 1: an instance appears, a traceback entry for <code>load</code> is attached, and <code>load</code>&rsquo;s desk is cleared because nothing in it can handle a <code>ValueError</code>.',
        lines: [2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load', ref: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', vars: [] },
            { name: 'load()', badge: 'raising', state: 'unwinding', vars: [] },
          ],
          heap: [
            exception('exc2', ADDRS.exc2, 'ValueError', ADDRS.ValueErrorCls, 'bad data', { state: 'new', tb: 'load (line 2)' }),
            { id: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', value: 'load()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', value: 'main()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc2'],
        },
      },
      {
        title: 'It arrives in <code>main</code> at line 6 — inside a <code>try</code>',
        desc: 'This desk is <strong>not</strong> cleared. Because line 6 is covered by a <code>try</code>, Python walks the <code>except</code> clauses in order and asks <code>isinstance(exc, ValueError)</code> for each. The first match wins. A subclass would match too — <code>except LookupError</code> catches a <code>KeyError</code> — and if none matched, the desk would go and the search would continue upward.',
        lines: [6, 7],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load', ref: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'matching except', state: 'running', vars: [] },
          ],
          heap: [
            exception('exc2', ADDRS.exc2, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              state: 'mutated', tb: 'main (line 6) → load (line 2)',
              note: 'isinstance(exc, ValueError) → True: the search stops here' }),
            { id: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', value: 'load()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', value: 'main()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc2'],
        },
      },
      {
        title: '<code>as err</code> binds an ordinary local name to the exception object',
        desc: 'Nothing magical: <code>err</code> is a name on <code>main</code>&rsquo;s desk pointing at the instance — same address as before. The handler body runs and prints <code>recovered: bad data</code>. While it runs, the interpreter also holds a reference of its own, so <code>sys.exception()</code> can hand the object to a bare <code>raise</code>.',
        lines: [7, 8],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load', ref: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'handling', state: 'running', vars: [
              { name: 'err', ref: 'exc2', pyId: ADDRS.exc2, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            exception('exc2', ADDRS.exc2, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              refcount: 2, tb: 'main (line 6) → load (line 2)',
              note: 'refs 2: the name err, and the interpreter’s "current exception" slot' }),
            { id: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', value: 'load()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', value: 'main()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc2'],
        },
      },
      {
        title: 'The handler ends — and <code>err</code> is deleted on purpose',
        desc: 'This surprises everyone once: at the end of an <code>except ... as err</code> block Python runs <code>del err</code> for you, so <code>print(err)</code> on line 9 would raise <code>NameError</code>. The reason is a cycle: the exception holds the traceback, the traceback holds the frames it passed through, and this frame would hold <code>err</code> — nothing would ever be freed. With <code>err</code> gone and the handler finished, the exception&rsquo;s count hits zero and it takes the traceback with it. Bind it to another name if you need it later.',
        lines: [8, 9],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'load', ref: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'running', state: 'running', vars: [
              { name: 'err', ref: 'exc2', pyId: ADDRS.exc2, type: 'instance', state: 'deleted' },
            ]},
          ],
          heap: [
            exception('exc2', ADDRS.exc2, 'ValueError', ADDRS.ValueErrorCls, 'bad data', {
              refcount: 0, state: 'gc', tb: 'main (line 6) → load (line 2)',
              note: 'no name and no handler holds it — freed, traceback and all' }),
            { id: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', value: 'load()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', value: 'main()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['exc2'],
        },
      },
      {
        title: 'Summary — the frame that caught it finishes like any other',
        desc: 'Line 9 runs, <code>main</code> returns <code>"fallback"</code>, and the global name <code>result</code> is bound to it. Nothing below the handler ever knew an exception existed. A caught exception is an object that was built, used for a few lines, and discarded — the stack only looks dramatic while it is in flight.',
        lines: [9, 11],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'load',   ref: 'loadFn2',     pyId: ADDRS.loadFn2,     type: 'function', state: 'normal' },
            { name: 'main',   ref: 'mainFn2',     pyId: ADDRS.mainFn2,     type: 'function', state: 'normal' },
            { name: 'result', ref: 'strFallback', pyId: ADDRS.strFallback, type: 'str',      state: 'new' },
          ]}],
          heap: [
            { id: 'loadFn2', pyId: ADDRS.loadFn2, type: 'function', value: 'load()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mainFn2', pyId: ADDRS.mainFn2, type: 'function', value: 'main()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'strFallback', pyId: ADDRS.strFallback, type: 'str', value: 'fallback', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['strFallback'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     3 · finally runs on the way out — even past a return
     ────────────────────────────────────────────────────────── */
  finally: {
    watch: 'The <code>return</code> on line 4 does not leave the frame. Watch <code>closed</code> flip to <code>True</code> first, and only then the desk go.',
    code: `def read(path):
    f = open(path)
    try:
        return f.read()
    finally:
        f.close()

text = read("notes.txt")`,
    steps: [
      {
        title: '<code>finally</code> is a promise about the way out',
        desc: 'Whatever happens inside the <code>try</code> — a <code>return</code>, an exception, a <code>break</code>, or just reaching the end — the <code>finally</code> block runs before the frame is left. This demo takes the most common case: a file that must be closed.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>read("notes.txt")</code> opens a file object',
        desc: '<code>open</code> returns an ordinary instance (Session 04) whose class is <code>TextIOWrapper</code>. Behind it sits something the diagram cannot draw: a real operating-system file handle, a limited resource that Python does not get back until this object is closed.',
        lines: [8, 2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'read', ref: 'readFn', pyId: ADDRS.readFn, type: 'function', state: 'normal' },
            ]},
            { name: 'read(path)', vars: [
              { name: 'path', value: 'notes.txt', type: 'str', inline: true },
              { name: 'f', ref: 'fileObj', pyId: ADDRS.fileObj, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'readFn', pyId: ADDRS.readFn, type: 'function', value: 'read(path)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'fileObj', pyId: ADDRS.fileObj, type: 'instance', value: 'open("notes.txt")', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'TextIOWrapper', pyId: ADDRS.FileCls },
              dictLabel: 'file state',
              pairs: [
                { key: 'name', value: 'notes.txt', type: 'str' },
                { key: 'closed', value: false, type: 'bool' },
              ],
              note: 'an OS file handle is held open behind this object' },
          ],
          highlight: ['fileObj'],
        },
      },
      {
        title: '<code>return f.read()</code> — the value is computed and set aside',
        desc: 'Here is the part people do not expect. <code>return</code> evaluates its expression — the file is read, a string is built — but the frame is <strong>not</strong> left yet. Because the <code>return</code> sits inside a <code>try</code> that has a <code>finally</code>, the result is parked and control jumps to line 5.',
        lines: [4],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'read', ref: 'readFn', pyId: ADDRS.readFn, type: 'function', state: 'normal' },
            ]},
            { name: 'read(path)', badge: 'return pending', state: 'running', vars: [
              { name: 'path', value: 'notes.txt', type: 'str', inline: true },
              { name: 'f', ref: 'fileObj', pyId: ADDRS.fileObj, type: 'instance', state: 'normal' },
              { name: 'return value', ref: 'strText', pyId: ADDRS.strText, type: 'str', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'readFn', pyId: ADDRS.readFn, type: 'function', value: 'read(path)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'strText', pyId: ADDRS.strText, type: 'str', value: 'milk, eggs, bread', refcount: 1, mutable: false, state: 'new',
              note: 'parked on this frame’s own stack, not under a real name' },
            { id: 'fileObj', pyId: ADDRS.fileObj, type: 'instance', value: 'open("notes.txt")', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'TextIOWrapper', pyId: ADDRS.FileCls },
              dictLabel: 'file state',
              pairs: [
                { key: 'name', value: 'notes.txt', type: 'str' },
                { key: 'closed', value: false, type: 'bool' },
              ] },
          ],
          highlight: ['strText'],
        },
      },
      {
        title: '<code>finally</code> runs: <code>f.close()</code>',
        desc: 'The cleanup happens with the return value still parked. <code>closed</code> flips to <code>True</code> and the OS handle is released. Had <code>f.read()</code> raised instead, this block would have run just the same — with the exception parked instead of the value — and the exception would carry on afterwards.',
        lines: [5, 6],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'read', ref: 'readFn', pyId: ADDRS.readFn, type: 'function', state: 'normal' },
            ]},
            { name: 'read(path)', badge: 'in finally', state: 'running', vars: [
              { name: 'path', value: 'notes.txt', type: 'str', inline: true },
              { name: 'f', ref: 'fileObj', pyId: ADDRS.fileObj, type: 'instance', state: 'normal' },
              { name: 'return value', ref: 'strText', pyId: ADDRS.strText, type: 'str', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'readFn', pyId: ADDRS.readFn, type: 'function', value: 'read(path)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'strText', pyId: ADDRS.strText, type: 'str', value: 'milk, eggs, bread', refcount: 1, mutable: false, state: 'normal' },
            { id: 'fileObj', pyId: ADDRS.fileObj, type: 'instance', value: 'open("notes.txt")', refcount: 1, mutable: true, state: 'mutated',
              classRef: { name: 'TextIOWrapper', pyId: ADDRS.FileCls },
              dictLabel: 'file state',
              pairs: [
                { key: 'name', value: 'notes.txt', type: 'str' },
                { key: 'closed', value: true, type: 'bool' },
              ],
              note: 'the OS handle is released now, on a line you chose' },
          ],
          highlight: ['fileObj'],
        },
      },
      {
        title: 'Now the parked value is returned and the desk is cleared',
        desc: 'Only after <code>finally</code> finishes does the pending <code>return</code> complete. <code>text</code> is bound to the string; the frame goes; the file object loses its last name and is freed. It was closed by your code, deliberately — not by the luck of garbage collection, which on other Python implementations can be a long time coming.',
        lines: [4, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'read', ref: 'readFn',  pyId: ADDRS.readFn,  type: 'function', state: 'normal' },
            { name: 'text', ref: 'strText', pyId: ADDRS.strText, type: 'str',      state: 'new' },
          ]}],
          heap: [
            { id: 'readFn', pyId: ADDRS.readFn, type: 'function', value: 'read(path)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'strText', pyId: ADDRS.strText, type: 'str', value: 'milk, eggs, bread', refcount: 1, mutable: false, state: 'normal' },
            { id: 'fileObj', pyId: ADDRS.fileObj, type: 'instance', value: 'open("notes.txt")', refcount: 0, mutable: true, state: 'gc',
              classRef: { name: 'TextIOWrapper', pyId: ADDRS.FileCls },
              dictLabel: 'file state',
              pairs: [
                { key: 'name', value: 'notes.txt', type: 'str' },
                { key: 'closed', value: true, type: 'bool' },
              ],
              note: 'the name f went with the frame — already closed, so nothing is leaked' },
          ],
          highlight: ['strText', 'fileObj'],
        },
      },
      {
        title: 'Summary — what <code>finally</code> guarantees, and what it does not',
        desc: 'It guarantees the block runs on every exit path. It does <em>not</em> cancel an exception in flight — the exception resumes afterwards — unless the <code>finally</code> block itself does a <code>return</code>, which silently swallows it. That is a bug so common that Python 3.14 warns about <code>return</code> inside <code>finally</code>. Demo 4 shows the idiom that packages this whole shape into two lines: <code>with</code>.',
        lines: [3, 5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'read', ref: 'readFn',  pyId: ADDRS.readFn,  type: 'function', state: 'normal' },
            { name: 'text', ref: 'strText', pyId: ADDRS.strText, type: 'str',      state: 'normal' },
          ]}],
          heap: [
            { id: 'readFn', pyId: ADDRS.readFn, type: 'function', value: 'read(path)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'strText', pyId: ADDRS.strText, type: 'str', value: 'milk, eggs, bread', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     4 · with: __enter__, the as-name, __exit__(None, None, None)
     ────────────────────────────────────────────────────────── */
  with: {
    watch: 'Two method calls you never wrote: <code>__enter__</code> before the body and <code>__exit__</code> after it. Watch what <code>as r</code> is actually bound to.',
    code: `class Resource:
    def __enter__(self):
        print("open")
        return self

    def __exit__(self, exc_type, exc, tb):
        print("close")
        return False

with Resource() as r:
    print("working")`,
    steps: [
      {
        title: 'Two methods with reserved names',
        desc: 'A <strong>context manager</strong> is any object whose class defines <code>__enter__</code> and <code>__exit__</code>. The <code>with</code> statement is the code that calls them for you — in a fixed order, with a <code>try/finally</code> around the body, exactly like demo 3.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'The class holds <code>__enter__</code> and <code>__exit__</code>',
        desc: 'Session 04&rsquo;s picture: a class object with two function objects in its namespace. Nothing has been entered. These names are only special because <code>with</code> knows to look them up — there is no registration, no decorator, no base class to inherit from.',
        lines: [1, 2, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Resource', ref: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'enterFn', pyId: ADDRS.enterFn, type: 'function', value: 'Resource.__enter__(self)', refcount: 1, mutable: false, state: 'new' },
            { id: 'exitFn',  pyId: ADDRS.exitFn,  type: 'function', value: 'Resource.__exit__(self, exc_type, exc, tb)', refcount: 1, mutable: false, state: 'new' },
            { id: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', value: 'class Resource', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc400c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc40140', type: 'ref' },
            ] },
          ],
          highlight: ['ResourceCls', 'enterFn', 'exitFn'],
        },
      },
      {
        title: '<code>with Resource()</code> builds the instance, then calls <code>__enter__</code>',
        desc: 'The expression after <code>with</code> is evaluated first — a constructor call, so an instance appears. Before running anything else, Python looks up <code>__exit__</code> <em>and</em> <code>__enter__</code> on its class; if either is missing you get <code>TypeError: \'Resource\' object does not support the context manager protocol</code> right here. Then <code>__enter__</code> is called with the instance as <code>self</code>.',
        lines: [10, 2, 3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Resource', ref: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', state: 'normal' },
            ]},
            { name: 'Resource.__enter__(self)', vars: [
              { name: 'self', ref: 'rInst', pyId: ADDRS.rInst, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'enterFn', pyId: ADDRS.enterFn, type: 'function', value: 'Resource.__enter__(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'exitFn',  pyId: ADDRS.exitFn,  type: 'function', value: 'Resource.__exit__(self, exc_type, exc, tb)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc400c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc40140', type: 'ref' },
            ] },
            { id: 'rInst', pyId: ADDRS.rInst, type: 'instance', value: 'Resource()', refcount: 2, mutable: true, state: 'new',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls }, pairs: [],
              note: 'held by the with statement itself, and by self while __enter__ runs' },
          ],
          highlight: ['rInst'],
        },
      },
      {
        title: 'Whatever <code>__enter__</code> returns is what <code>as r</code> binds',
        desc: 'It returned <code>self</code>, so <code>r</code> is the same instance — same address. It did not have to: <code>open()</code> returns the file, <code>threading.Lock().__enter__</code> returns <code>True</code>, and plenty of managers return <code>None</code>, which is why <code>with lock:</code> without <code>as</code> is so common. The name lands on the <em>enclosing</em> desk, not on a desk of its own.',
        lines: [4, 10],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Resource', ref: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', state: 'normal' },
            { name: 'r', ref: 'rInst', pyId: ADDRS.rInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'enterFn', pyId: ADDRS.enterFn, type: 'function', value: 'Resource.__enter__(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'exitFn',  pyId: ADDRS.exitFn,  type: 'function', value: 'Resource.__exit__(self, exc_type, exc, tb)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc400c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc40140', type: 'ref' },
            ] },
            { id: 'rInst', pyId: ADDRS.rInst, type: 'instance', value: 'Resource()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls }, pairs: [],
              note: 'refs 2: the name r, and the with statement keeping it for __exit__' },
          ],
          highlight: ['rInst'],
        },
      },
      {
        title: 'The body runs, inside an invisible <code>try</code>',
        desc: 'Line 11 prints <code>working</code>. Nothing in memory changes, but something is armed: the interpreter has wrapped this body in the same kind of <code>try/finally</code> as demo 3, with <code>__exit__</code> as the cleanup. Whichever way the body ends, that call is coming.',
        lines: [11],
        memory: {
          frames: [{ name: 'global', badge: 'in with body', state: 'running', vars: [
            { name: 'Resource', ref: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', state: 'normal' },
            { name: 'r', ref: 'rInst', pyId: ADDRS.rInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'enterFn', pyId: ADDRS.enterFn, type: 'function', value: 'Resource.__enter__(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'exitFn',  pyId: ADDRS.exitFn,  type: 'function', value: 'Resource.__exit__(self, exc_type, exc, tb)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc400c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc40140', type: 'ref' },
            ] },
            { id: 'rInst', pyId: ADDRS.rInst, type: 'instance', value: 'Resource()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls }, pairs: [] },
          ],
          highlight: [],
        },
      },
      {
        title: 'Leaving the block calls <code>__exit__(None, None, None)</code>',
        desc: 'Three <code>None</code>s mean &ldquo;the body finished without an exception&rdquo;. This call is the <code>finally</code> block of demo 3, given a name and moved into the class — so every user of <code>Resource</code> gets the cleanup without writing it. Its return value, <code>False</code>, is ignored on the success path.',
        lines: [6, 7, 8],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Resource', ref: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', state: 'normal' },
              { name: 'r', ref: 'rInst', pyId: ADDRS.rInst, type: 'instance', state: 'normal' },
            ]},
            { name: 'Resource.__exit__(self, exc_type, exc, tb)', vars: [
              { name: 'self',     ref: 'rInst', pyId: ADDRS.rInst, type: 'instance', state: 'new' },
              { name: 'exc_type', value: 'None', type: 'none', inline: true, state: 'new' },
              { name: 'exc',      value: 'None', type: 'none', inline: true, state: 'new' },
              { name: 'tb',       value: 'None', type: 'none', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            { id: 'enterFn', pyId: ADDRS.enterFn, type: 'function', value: 'Resource.__enter__(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'exitFn',  pyId: ADDRS.exitFn,  type: 'function', value: 'Resource.__exit__(self, exc_type, exc, tb)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc400c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc40140', type: 'ref' },
            ] },
            { id: 'rInst', pyId: ADDRS.rInst, type: 'instance', value: 'Resource()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls }, pairs: [],
              note: 'prints "close" — the cleanup nobody can forget to call' },
          ],
          highlight: ['rInst'],
        },
      },
      {
        title: 'After the block, <code>r</code> is still there',
        desc: 'The <code>as</code> name is an ordinary variable of the enclosing frame — nothing deletes it when the block ends. What ended is the <em>guarantee</em>: <code>__exit__</code> has run, so from here on <code>r</code> is a finished resource, and using it (reading a closed file, say) is your mistake to make. The with statement has let go of its own reference, so the count is back to 1.',
        lines: [10],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Resource', ref: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', state: 'normal' },
            { name: 'r', ref: 'rInst', pyId: ADDRS.rInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'enterFn', pyId: ADDRS.enterFn, type: 'function', value: 'Resource.__enter__(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'exitFn',  pyId: ADDRS.exitFn,  type: 'function', value: 'Resource.__exit__(self, exc_type, exc, tb)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'ResourceCls', pyId: ADDRS.ResourceCls, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc400c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc40140', type: 'ref' },
            ] },
            { id: 'rInst', pyId: ADDRS.rInst, type: 'instance', value: 'Resource()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls }, pairs: [],
              note: 'still alive under r — just no longer protected by the with' },
          ],
          highlight: ['rInst'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     5 · with, when the body raises
     ────────────────────────────────────────────────────────── */
  withRaise: {
    watch: 'This time <code>__exit__</code> receives three real arguments. Watch what its <code>return False</code> does to the exception afterwards.',
    code: `class Resource:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        print("close")
        return False

with Resource() as r:
    raise ValueError("boom")

print("never printed")`,
    steps: [
      {
        title: 'What happens to the cleanup when the body blows up?',
        desc: 'The whole reason context managers exist is this case. The body raises; the resource still has to be released; and then the exception has to keep going so that somebody up the stack finds out. Watch all three happen in order.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'Enter, exactly as in demo 4',
        desc: 'Instance built, <code>__enter__</code> called, <code>r</code> bound to what it returned. The with statement is holding its own reference to the instance so it can call <code>__exit__</code> later — even if the body rebinds <code>r</code> to something else.',
        lines: [9, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Resource', ref: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', state: 'normal' },
            { name: 'r', ref: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc500c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc50140', type: 'ref' },
            ] },
            { id: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', value: 'Resource()', refcount: 2, mutable: true, state: 'new',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls5 }, pairs: [] },
          ],
          highlight: ['rInst5'],
        },
      },
      {
        title: '<code>raise</code> inside the body builds the exception',
        desc: 'Demo 1&rsquo;s first step, at module level: an instance of <code>ValueError</code>, with a traceback entry for the frame it was raised in. The line that follows the body — <code>print("never printed")</code> — is now unreachable; the only question is whether the exception leaves this frame.',
        lines: [10],
        memory: {
          frames: [{ name: 'global', badge: 'exception raised', state: 'running', vars: [
            { name: 'Resource', ref: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', state: 'normal' },
            { name: 'r', ref: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            exception('exc5', ADDRS.exc5, 'ValueError', ADDRS.ValueErrorCls5, 'boom', { state: 'new', tb: '<module> (line 10)' }),
            { id: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc500c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc50140', type: 'ref' },
            ] },
            { id: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', value: 'Resource()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls5 }, pairs: [] },
          ],
          highlight: ['exc5'],
        },
      },
      {
        title: '<code>__exit__</code> is called with the exception, not with three <code>None</code>s',
        desc: 'The with statement catches the exception before it can go anywhere, and calls <code>__exit__(type(exc), exc, exc.__traceback__)</code>. Compare the desk with demo 4: <code>exc_type</code> points at the class, <code>exc</code> at the instance, <code>tb</code> at its traceback. The cleanup runs — <code>close</code> is printed — with full knowledge of what went wrong.',
        lines: [5, 6],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Resource', ref: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', state: 'normal' },
              { name: 'r', ref: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', state: 'normal' },
            ]},
            { name: 'Resource.__exit__(self, exc_type, exc, tb)', vars: [
              { name: 'self',     ref: 'rInst5',        pyId: ADDRS.rInst5,         type: 'instance', state: 'new' },
              { name: 'exc_type', ref: 'ValueErrorCls5', pyId: ADDRS.ValueErrorCls5, type: 'class',    state: 'new' },
              { name: 'exc',      ref: 'exc5',          pyId: ADDRS.exc5,           type: 'instance', state: 'new' },
              { name: 'tb',       value: 'traceback → line 10', type: 'ref', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            exception('exc5', ADDRS.exc5, 'ValueError', ADDRS.ValueErrorCls5, 'boom', {
              refcount: 2, tb: '<module> (line 10)', note: 'refs 2: the name exc, and the with statement holding it in flight' }),
            { id: 'ValueErrorCls5', pyId: ADDRS.ValueErrorCls5, type: 'class', value: 'class ValueError', refcount: 2, mutable: true, state: 'normal',
              bases: [{ name: 'Exception', pyId: '0x7fc50020' }], pairs: [], note: 'a built-in class — exc_type points here' },
            { id: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc500c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc50140', type: 'ref' },
            ] },
            { id: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', value: 'Resource()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls5 }, pairs: [],
              note: 'prints "close" — the resource is released even though the body failed' },
          ],
          highlight: ['exc5', 'ValueErrorCls5'],
        },
      },
      {
        title: '<code>return False</code> means &ldquo;I did not handle it&rdquo; — the exception carries on',
        desc: 'The with statement re-raises the very same object, as if the <code>with</code> had never been there — except that the cleanup has happened. A bare function returns <code>None</code>, which counts as <code>False</code>, so this is the default. Returning <code>True</code> would swallow the exception and line 12 would print; <code>contextlib.suppress</code> is exactly an <code>__exit__</code> that returns <code>True</code> for the classes you name.',
        lines: [7, 10],
        memory: {
          frames: [{ name: 'global', badge: 'no handler', state: 'unwinding', vars: [
            { name: 'Resource', ref: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', state: 'normal' },
            { name: 'r', ref: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            exception('exc5', ADDRS.exc5, 'ValueError', ADDRS.ValueErrorCls5, 'boom', {
              state: 'mutated', tb: '<module> (line 10)', note: 'the same object continues its journey — no handler at module level' }),
            { id: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc500c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc50140', type: 'ref' },
            ] },
            { id: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', value: 'Resource()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls5 }, pairs: [], note: 'closed, and still named r' },
          ],
          highlight: ['exc5'],
        },
      },
      {
        title: 'Uncaught at module level — traceback printed, line 12 never runs',
        desc: 'Output, in order: <code>close</code>, then <code>Traceback (most recent call last): File "app.py", line 10, in &lt;module&gt; … ValueError: boom</code>. Notice what is <em>not</em> in that traceback: <code>__exit__</code>. It ran and returned normally, so it left no frame behind. The cleanup was invisible and guaranteed — which is the entire promise of <code>with</code>.',
        lines: [12],
        memory: {
          frames: [{ name: 'global', badge: 'exit status 1', vars: [
            { name: 'Resource', ref: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', state: 'normal' },
            { name: 'r', ref: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            exception('exc5', ADDRS.exc5, 'ValueError', ADDRS.ValueErrorCls5, 'boom', {
              tb: '<module> (line 10)', note: 'printed as the traceback, then the process exits' }),
            { id: 'ResourceCls5', pyId: ADDRS.ResourceCls5, type: 'class', value: 'class Resource', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__enter__', value: 'fn -> 0x7fc500c0', type: 'ref' },
              { key: '__exit__',  value: 'fn -> 0x7fc50140', type: 'ref' },
            ] },
            { id: 'rInst5', pyId: ADDRS.rInst5, type: 'instance', value: 'Resource()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Resource', pyId: ADDRS.ResourceCls5 }, pairs: [] },
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     6 · One exception causes another: raise ... from
     ────────────────────────────────────────────────────────── */
  chain: {
    watch: 'Two exception objects end up on the heap. Watch <code>__cause__</code> on the second one point at the first — that link is what the two-part traceback is printing.',
    code: `def parse(text):
    try:
        return int(text)
    except ValueError as err:
        raise RuntimeError("bad input") from err

parse("x1")`,
    steps: [
      {
        title: 'One error causes another',
        desc: 'Real handlers often cannot fix the problem; they translate it. A low-level <code>ValueError</code> from <code>int()</code> becomes a <code>RuntimeError</code> that means something to the caller. Python keeps both objects, links them, and prints both — as long as you tell it how they are related.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>parse("x1")</code> — <code>int()</code> raises inside the <code>try</code>',
        desc: '<code>int</code> is written in C, so there is no Python frame for it; the first desk the exception lands on is <code>parse</code>&rsquo;s, at line 3. Its message is the one you have seen a hundred times: <code>invalid literal for int() with base 10: \'x1\'</code>.',
        lines: [7, 3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'parse', ref: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', state: 'normal' },
            ]},
            { name: 'parse(text)', badge: 'matching except', state: 'running', vars: [
              { name: 'text', value: 'x1', type: 'str', inline: true },
            ]},
          ],
          heap: [
            exception('valErr', ADDRS.valErr, 'ValueError', ADDRS.ValueErrorCls6, "invalid literal for int() with base 10: 'x1'", {
              state: 'new', tb: 'parse (line 3)' }),
            { id: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', value: 'parse(text)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['valErr'],
        },
      },
      {
        title: 'Matched by <code>except ValueError as err</code>',
        desc: 'Demo 2&rsquo;s step: the desk survives, <code>err</code> is bound to the instance. The handler could log it and return a default. Instead it is going to raise something new — while this exception is still the &ldquo;current&rdquo; one.',
        lines: [4],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'parse', ref: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', state: 'normal' },
            ]},
            { name: 'parse(text)', badge: 'handling', state: 'running', vars: [
              { name: 'text', value: 'x1', type: 'str', inline: true },
              { name: 'err', ref: 'valErr', pyId: ADDRS.valErr, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            exception('valErr', ADDRS.valErr, 'ValueError', ADDRS.ValueErrorCls6, "invalid literal for int() with base 10: 'x1'", {
              refcount: 2, tb: 'parse (line 3)', note: 'refs 2: err, plus the interpreter’s current-exception slot' }),
            { id: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', value: 'parse(text)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['valErr'],
        },
      },
      {
        title: '<code>raise RuntimeError("bad input") from err</code> builds a second object and links it',
        desc: 'A second instance appears. Two attributes on it now point back at the first: <code>__cause__</code>, set explicitly by <code>from err</code>, and <code>__context__</code>, which Python sets on <em>any</em> exception raised while another is being handled. <code>from</code> also sets <code>__suppress_context__</code> to <code>True</code>, which is how the traceback printer knows to say &ldquo;direct cause&rdquo; rather than &ldquo;during handling&rdquo;.',
        lines: [5],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'parse', ref: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', state: 'normal' },
            ]},
            { name: 'parse(text)', badge: 'raising', state: 'unwinding', vars: [
              { name: 'text', value: 'x1', type: 'str', inline: true },
              { name: 'err', ref: 'valErr', pyId: ADDRS.valErr, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            exception('runErr', ADDRS.runErr, 'RuntimeError', ADDRS.RuntimeErrorCls, 'bad input', {
              state: 'new', tb: 'parse (line 5)',
              cause: 'ValueError -> 0x7fc60140', context: 'ValueError -> 0x7fc60140',
              extra: [{ key: '__suppress_context__', value: true, type: 'bool' }],
              note: 'two links to the first exception — cause is the one you set' }),
            exception('valErr', ADDRS.valErr, 'ValueError', ADDRS.ValueErrorCls6, "invalid literal for int() with base 10: 'x1'", {
              refcount: 4, tb: 'parse (line 3)', note: 'refs 4: err, the current-exception slot, __cause__ and __context__' }),
            { id: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', value: 'parse(text)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['runErr'],
        },
      },
      {
        title: 'The new exception unwinds; <code>err</code> is gone, but the first exception survives through <code>__cause__</code>',
        desc: 'Leaving the handler deletes <code>err</code> and clears the current-exception slot, as in demo 2. The <code>ValueError</code> would normally be freed here — but the <code>RuntimeError</code> holds it, so it travels along inside the second exception, traceback and all. <code>parse</code>&rsquo;s desk is cleared; the module level has no handler.',
        lines: [5, 7],
        memory: {
          frames: [
            { name: 'global', badge: 'no handler', state: 'unwinding', vars: [
              { name: 'parse', ref: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            exception('runErr', ADDRS.runErr, 'RuntimeError', ADDRS.RuntimeErrorCls, 'bad input', {
              state: 'mutated', tb: '<module> (line 7) → parse (line 5)',
              cause: 'ValueError -> 0x7fc60140', context: 'ValueError -> 0x7fc60140',
              extra: [{ key: '__suppress_context__', value: true, type: 'bool' }] }),
            exception('valErr', ADDRS.valErr, 'ValueError', ADDRS.ValueErrorCls6, "invalid literal for int() with base 10: 'x1'", {
              refcount: 2, tb: 'parse (line 3)', note: 'kept alive only by the links from the RuntimeError' }),
            { id: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', value: 'parse(text)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['runErr', 'valErr'],
        },
      },
      {
        title: 'The traceback prints both, oldest first',
        desc: 'First the <code>ValueError</code> with its own traceback (<code>parse</code>, line 3), then the sentence <code>The above exception was the direct cause of the following exception:</code>, then the <code>RuntimeError</code> with its traceback (<code>&lt;module&gt;</code> line 7, <code>parse</code> line 5). Leave out <code>from err</code> and the link is still there via <code>__context__</code>, but the sentence becomes <code>During handling of the above exception, another exception occurred:</code> — Python assuming the second error was an accident. <code>from None</code> hides the first one entirely.',
        lines: [7],
        memory: {
          frames: [
            { name: 'global', badge: 'exit status 1', vars: [
              { name: 'parse', ref: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            exception('runErr', ADDRS.runErr, 'RuntimeError', ADDRS.RuntimeErrorCls, 'bad input', {
              tb: '<module> (line 7) → parse (line 5)',
              cause: 'ValueError -> 0x7fc60140', context: 'ValueError -> 0x7fc60140',
              extra: [{ key: '__suppress_context__', value: true, type: 'bool' }],
              note: 'printed second — the error the caller actually sees' }),
            exception('valErr', ADDRS.valErr, 'ValueError', ADDRS.ValueErrorCls6, "invalid literal for int() with base 10: 'x1'", {
              refcount: 2, tb: 'parse (line 3)', note: 'printed first — the reason' }),
            { id: 'parseFn6', pyId: ADDRS.parseFn6, type: 'function', value: 'parse(text)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '08-exceptions',
    demos: DEMOS,
    defaultDemo: 'unwind',
    defaultSpeed: 900,
  });
});
