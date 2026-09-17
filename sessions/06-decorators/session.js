/* ============================================================
   SESSION 06: Decorators
   Demos: f = deco(f), the @ shorthand, the name-tag problem,
   decorator factories, stacking
   ============================================================ */

'use strict';

const ADDRS = {
  shoutFn:   '0x7f9100a0',
  greetFn:   '0x7f9100c8',
  wrapperFn: '0x7f9101f0',
  cellBox:   '0x7f910280',

  wrapsFn:   '0x7f920060',
  wrapper3:  '0x7f9201a0',
  greet3:    '0x7f9200c8',

  repeatFn:  '0x7f9300a0',
  decoFn:    '0x7f930140',
  pingFn:    '0x7f9301c0',
  wrapper4:  '0x7f930240',
  cellDeco:  '0x7f930300',
  cellWrap:  '0x7f930380',
  int2:      '0x7f110002',

  boldFn:    '0x7f9400a0',
  italicFn:  '0x7f940120',
  textFn:    '0x7f9401a0',
  italicW:   '0x7f940220',
  boldW:     '0x7f9402a0',
  cellIt:    '0x7f940340',
  cellBd:    '0x7f9403c0',
};

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {

  /* ──────────────────────────────────────────────────────────
     1 · The whole idea, without any @ at all
     ────────────────────────────────────────────────────────── */
  manual: {
    watch: 'Watch the name <code>greet</code> move. It ends up pointing at a <em>different</em> function from the one you wrote.',
    code: `def shout(func):
    def wrapper(text):
        return func(text).upper()
    return wrapper

def greet(name):
    return "hi " + name

greet = shout(greet)`,
    steps: [
      {
        title: 'Nothing has run yet',
        desc: 'A decorator isn\'t new machinery. It\'s one line you already know how to read: take a function, hand it to another function, and give the result the old name.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>def shout</code> makes a function object',
        desc: '<code>def</code> always does two things: build a function object on the heap, and bind a name to it. Nothing inside <code>shout</code> runs yet.',
        lines: [1, 4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['shoutFn'],
        },
      },
      {
        title: '<code>def greet</code> makes a second function object',
        desc: 'Two ordinary functions, two objects, two names. Nothing special so far. <code>shout</code> just happens to expect a function as its argument.',
        lines: [6, 7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            { name: 'greet', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['greetFn'],
        },
      },
      {
        title: '<code>shout(greet)</code> opens a frame, and <code>func</code> is a second name for your function',
        desc: 'Calling <code>shout</code> creates a frame. The parameter <code>func</code> binds to the <em>same object</em> that <code>greet</code> points at. Same address, so the reference count goes from 1 to 2. This is Session 02\'s rule, unchanged.',
        lines: [9, 1],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
              { name: 'greet', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'normal' },
            ]},
            { name: 'shout(func)', vars: [
              { name: 'func', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 2, mutable: false, state: 'normal',
              note: 'two names point here now: greet and func' },
          ],
          highlight: ['greetFn'],
        },
      },
      {
        title: '<code>def wrapper</code> builds a third function that remembers <code>func</code>',
        desc: 'This <code>def</code> runs <em>during the call</em>. Because <code>wrapper</code> uses <code>func</code>, Python attaches a closure cell to it, the same remembered-state box from Session 02. The cell holds your original function.',
        lines: [2, 3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
              { name: 'greet', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'normal' },
            ]},
            { name: 'shout(func)', vars: [
              { name: 'func', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'normal' },
              { name: 'wrapper', ref: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 3, mutable: false, state: 'normal' },
            { id: 'cellBox', pyId: ADDRS.cellBox, type: 'dict', refcount: 1, mutable: true, state: 'new',
              dictLabel: 'closure cell on wrapper', pairs: [
                { key: 'func', value: 'greet @ 0x7f9100c8', type: 'ref' },
              ] },
            { id: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'new',
              note: 'carries the cell above' },
          ],
          highlight: ['wrapperFn', 'cellBox'],
        },
      },
      {
        title: '<code>return wrapper</code>: the frame goes, the wrapper stays',
        desc: 'The <code>shout</code> frame is thrown away, so the local name <code>func</code> disappears. The closure cell doesn\'t. It\'s part of the wrapper object, and the wrapper is being returned.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            { name: 'greet', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'cellBox', pyId: ADDRS.cellBox, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cell on wrapper', pairs: [
                { key: 'func', value: 'greet @ 0x7f9100c8', type: 'ref' },
              ] },
            { id: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['wrapperFn'],
        },
      },
      {
        title: 'The name <code>greet</code> is rebound, and that\'s the trick',
        desc: 'Assignment moves a nametag, just as in Session 01. <code>greet</code> now points at the wrapper. <strong>No name points at your original function any more.</strong> The only thing keeping it alive is the closure cell inside the wrapper. Call <code>greet("ada")</code> and you get <code>"HI ADA"</code>.',
        lines: [9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            { name: 'greet', ref: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', state: 'rebound' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'mutated',
              note: 'greet points here now' },
            { id: 'cellBox', pyId: ADDRS.cellBox, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cell on wrapper', pairs: [
                { key: 'func', value: 'greet @ 0x7f9100c8', type: 'ref' },
              ] },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 1, mutable: false, state: 'normal',
              note: 'reachable only through the cell, no name points here' },
          ],
          highlight: ['wrapperFn', 'greetFn'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     2 · The @ line is shorthand for that same assignment
     ────────────────────────────────────────────────────────── */
  sugar: {
    watch: 'Same ending as demo 1, so watch the <em>order</em> instead. The function is built first, decorated second, named last.',
    code: `def shout(func):
    def wrapper(text):
        return func(text).upper()
    return wrapper

@shout
def greet(name):
    return "hi " + name`,
    steps: [
      {
        title: 'This ends in the same place as demo 1',
        desc: 'Nothing new happens here. The only difference is that Python writes the <code>greet = shout(greet)</code> line for you. Watch the order of the three moments.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>def shout</code>: a decorator is just a function',
        desc: 'Anything callable that takes one function and returns something can sit after an <code>@</code>. There\'s no special "decorator type" in Python.',
        lines: [1, 4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['shoutFn'],
        },
      },
      {
        title: 'Moment 1: the body under <code>@</code> is built first',
        desc: 'Python reads the <code>def</code> and creates the function object. Notice what\'s <em>not</em> on the screen: a name. The object exists before anything is called with it.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 1, mutable: false, state: 'new',
              note: 'created, not yet named' },
          ],
          highlight: ['greetFn'],
        },
      },
      {
        title: 'Moment 2: that object is passed straight to <code>shout</code>',
        desc: 'The <code>@shout</code> line means "call <code>shout</code> with whatever this <code>def</code> just made". Same frame, same closure cell, same wrapper as in demo 1.',
        lines: [6, 1, 2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            ]},
            { name: 'shout(func)', vars: [
              { name: 'func', ref: 'greetFn', pyId: ADDRS.greetFn, type: 'function', state: 'new' },
              { name: 'wrapper', ref: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'cellBox', pyId: ADDRS.cellBox, type: 'dict', refcount: 1, mutable: true, state: 'new',
              dictLabel: 'closure cell on wrapper', pairs: [
                { key: 'func', value: 'greet @ 0x7f9100c8', type: 'ref' },
              ] },
            { id: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['wrapperFn', 'cellBox'],
        },
      },
      {
        title: 'Moment 3: the name <code>greet</code> is bound to the result',
        desc: 'Only now does the name appear, and it points at the wrapper. Compare this picture with the last step of demo 1. They\'re identical. <code>@shout</code> saved you one line and changed nothing else.',
        lines: [6, 7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            { name: 'greet', ref: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'mutated' },
            { id: 'cellBox', pyId: ADDRS.cellBox, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cell on wrapper', pairs: [
                { key: 'func', value: 'greet @ 0x7f9100c8', type: 'ref' },
              ] },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 1, mutable: false, state: 'normal',
              note: 'still there, reachable only through the cell' },
          ],
          highlight: ['wrapperFn', 'greetFn'],
        },
      },
      {
        title: 'Say it in one sentence',
        desc: '<code>@deco</code> above a <code>def</code> means <code>name = deco(name)</code>. Every later question (arguments, stacking, lost docstrings) is a question about that one line.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            { name: 'greet', ref: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'wrapperFn', pyId: ADDRS.wrapperFn, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellBox', pyId: ADDRS.cellBox, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cell on wrapper', pairs: [
                { key: 'func', value: 'greet @ 0x7f9100c8', type: 'ref' },
              ] },
            { id: 'greetFn', pyId: ADDRS.greetFn, type: 'function', value: 'greet(name)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     3 · The wrapper wears the wrong name tag
     ────────────────────────────────────────────────────────── */
  identity: {
    watch: 'Read the <code>__name__</code> row on the function object. It\'s wrong until <code>functools.wraps</code> fixes it.',
    code: `import functools

def shout(func):
    @functools.wraps(func)
    def wrapper(text):
        return func(text).upper()
    return wrapper

@shout
def greet(name):
    "Say hello."
    return "hi " + name`,
    steps: [
      {
        title: 'A wrapper is a different object, so it has different labels',
        desc: 'Your original function carries a name, a docstring and a module. The wrapper is a brand new object and carries its own, which say <code>wrapper</code> and nothing else.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'Without help, the wrapper introduces itself as "wrapper"',
        desc: 'Here is the plain wrapper before <code>wraps</code> runs. <code>help()</code>, tracebacks, log lines and debuggers all read these labels, so all of them would now say the wrong thing.',
        lines: [5, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greet3', pyId: ADDRS.greet3, type: 'function', value: 'greet(name)', refcount: 1, mutable: false, state: 'normal',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'greet', type: 'str' },
                { key: '__doc__', value: 'Say hello.', type: 'str' },
              ] },
            { id: 'wrapper3', pyId: ADDRS.wrapper3, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'new',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'wrapper', type: 'str' },
                { key: '__doc__', value: 'None', type: 'str' },
              ], note: 'wrong labels, and this is the object greet will name' },
          ],
          highlight: ['wrapper3'],
        },
      },
      {
        title: '<code>@functools.wraps(func)</code> is itself a decorator',
        desc: 'It\'s applied to <code>wrapper</code> the same way <code>@shout</code> is applied to <code>greet</code>. <code>wraps(func)</code> is a factory: it returns a small decorator that already knows which function to copy the labels <em>from</em>.',
        lines: [4],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            ]},
            { name: 'shout(func)', vars: [
              { name: 'func', ref: 'greet3', pyId: ADDRS.greet3, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greet3', pyId: ADDRS.greet3, type: 'function', value: 'greet(name)', refcount: 2, mutable: false, state: 'normal',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'greet', type: 'str' },
                { key: '__doc__', value: 'Say hello.', type: 'str' },
              ] },
            { id: 'wrapsFn', pyId: ADDRS.wrapsFn, type: 'function', value: 'wraps(greet)', refcount: 1, mutable: false, state: 'new',
              note: 'copies labels from greet onto whatever it decorates' },
            { id: 'wrapper3', pyId: ADDRS.wrapper3, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'normal',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'wrapper', type: 'str' },
                { key: '__doc__', value: 'None', type: 'str' },
              ] },
          ],
          highlight: ['wrapsFn'],
        },
      },
      {
        title: 'It copies the labels across, and leaves a trail back',
        desc: 'Five labels are copied: <code>__name__</code>, <code>__qualname__</code>, <code>__doc__</code>, <code>__module__</code> and <code>__annotations__</code>. It also sets <code>__wrapped__</code>, a direct reference to the function underneath, so tools can still find the real thing.',
        lines: [4, 5],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            ]},
            { name: 'shout(func)', vars: [
              { name: 'func', ref: 'greet3', pyId: ADDRS.greet3, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'greet3', pyId: ADDRS.greet3, type: 'function', value: 'greet(name)', refcount: 3, mutable: false, state: 'normal',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'greet', type: 'str' },
                { key: '__doc__', value: 'Say hello.', type: 'str' },
              ] },
            { id: 'wrapper3', pyId: ADDRS.wrapper3, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'mutated',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'greet', type: 'str' },
                { key: '__doc__', value: 'Say hello.', type: 'str' },
                { key: '__wrapped__', value: 'greet @ 0x7f9200c8', type: 'ref' },
              ], note: 'labels copied, the behaviour is unchanged' },
          ],
          highlight: ['wrapper3'],
        },
      },
      {
        title: 'Same wrapper, honest name tag',
        desc: '<code>greet</code> still points at the wrapper, so you still get <code>"HI ADA"</code>. But <code>greet.__name__</code> is now <code>\'greet\'</code>, <code>help(greet)</code> shows the real docstring, and <code>greet.__wrapped__</code> hands you the undecorated function back.',
        lines: [9, 10],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'shout', ref: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', state: 'normal' },
            { name: 'greet', ref: 'wrapper3', pyId: ADDRS.wrapper3, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'shoutFn', pyId: ADDRS.shoutFn, type: 'function', value: 'shout(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'wrapper3', pyId: ADDRS.wrapper3, type: 'function', value: 'wrapper(text)', refcount: 1, mutable: false, state: 'normal',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'greet', type: 'str' },
                { key: '__doc__', value: 'Say hello.', type: 'str' },
                { key: '__wrapped__', value: 'greet @ 0x7f9200c8', type: 'ref' },
              ] },
            { id: 'greet3', pyId: ADDRS.greet3, type: 'function', value: 'greet(name)', refcount: 2, mutable: false, state: 'normal',
              dictLabel: 'function attributes', pairs: [
                { key: '__name__', value: 'greet', type: 'str' },
                { key: '__doc__', value: 'Say hello.', type: 'str' },
              ], note: 'held by the closure cell and by __wrapped__' },
          ],
          highlight: ['wrapper3', 'greet3'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     4 · A decorator that takes an argument
     ────────────────────────────────────────────────────────── */
  factory: {
    watch: 'Count the calls. <code>repeat(2)</code> runs <em>first</em> and returns a decorator. Only then is anything decorated.',
    code: `def repeat(times):
    def decorator(func):
        def wrapper():
            return [func() for _ in range(times)]
        return wrapper
    return decorator

@repeat(2)
def ping():
    return "ping"`,
    steps: [
      {
        title: 'Why three levels of <code>def</code>?',
        desc: 'Because <code>@</code> only ever calls <em>one</em> thing with your function. If you also want to pass a <code>2</code>, something has to accept the <code>2</code> first and hand back a decorator. That\'s the extra layer, and nothing more.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>def repeat</code>: this isn\'t the decorator yet',
        desc: '<code>repeat</code> is a <em>decorator factory</em>, a function whose job is to produce a decorator. What goes after <code>@</code> is whatever <code>repeat(...)</code> returns.',
        lines: [1, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'repeat', ref: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', value: 'repeat(times)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['repeatFn'],
        },
      },
      {
        title: 'Call 1: <code>repeat(2)</code> runs and remembers the 2',
        desc: 'A frame opens with <code>times</code> bound to <code>2</code>. Inside it, <code>def decorator</code> creates a function that uses <code>times</code>, so it gets a closure cell holding that <code>2</code>.',
        lines: [8, 1, 2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'repeat', ref: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', state: 'normal' },
            ]},
            { name: 'repeat(times)', vars: [
              { name: 'times', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'new' },
              { name: 'decorator', ref: 'decoFn', pyId: ADDRS.decoFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', value: 'repeat(times)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'new',
              note: 'cached small int: CPython pre-creates -5 to 256 and never frees them' },
            { id: 'cellDeco', pyId: ADDRS.cellDeco, type: 'dict', refcount: 1, mutable: true, state: 'new',
              dictLabel: 'closure cell on decorator', pairs: [
                { key: 'times', value: 2, type: 'int' },
              ] },
            { id: 'decoFn', pyId: ADDRS.decoFn, type: 'function', value: 'decorator(func)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['decoFn', 'cellDeco'],
        },
      },
      {
        title: 'The <code>repeat</code> frame closes, and <code>decorator</code> is what <code>@</code> will use',
        desc: 'The line <code>@repeat(2)</code> has now finished its first half. What sits above <code>def ping</code> is this <code>decorator</code> object, and it already knows the number 2.',
        lines: [6, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'repeat', ref: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', value: 'repeat(times)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'decoFn', pyId: ADDRS.decoFn, type: 'function', value: 'decorator(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellDeco', pyId: ADDRS.cellDeco, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cell on decorator', pairs: [
                { key: 'times', value: 2, type: 'int' },
              ] },
          ],
          highlight: ['decoFn'],
        },
      },
      {
        title: 'Call 2: <code>def ping</code> builds the function, then hands it over',
        desc: 'The same three moments as in demo 2. The <code>ping</code> object is created, passed to <code>decorator</code>, and <code>decorator</code>\'s frame opens with <code>func</code> pointing at it.',
        lines: [9, 10, 2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'repeat', ref: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', state: 'normal' },
            ]},
            { name: 'decorator(func)', vars: [
              { name: 'func', ref: 'pingFn', pyId: ADDRS.pingFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', value: 'repeat(times)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'decoFn', pyId: ADDRS.decoFn, type: 'function', value: 'decorator(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'pingFn', pyId: ADDRS.pingFn, type: 'function', value: 'ping()', refcount: 1, mutable: false, state: 'new' },
            { id: 'cellDeco', pyId: ADDRS.cellDeco, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cell on decorator', pairs: [
                { key: 'times', value: 2, type: 'int' },
              ] },
          ],
          highlight: ['pingFn'],
        },
      },
      {
        title: '<code>wrapper</code> gets <em>two</em> remembered names',
        desc: 'It uses <code>func</code> (from this frame) and <code>times</code> (from the frame above), so its closure holds both. This is what the extra layer was for: the argument you wrote in <code>@repeat(2)</code> travelled down two levels and is still there.',
        lines: [3, 4],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'repeat', ref: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', state: 'normal' },
            ]},
            { name: 'decorator(func)', vars: [
              { name: 'func', ref: 'pingFn', pyId: ADDRS.pingFn, type: 'function', state: 'normal' },
              { name: 'wrapper', ref: 'wrapper4', pyId: ADDRS.wrapper4, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', value: 'repeat(times)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'pingFn', pyId: ADDRS.pingFn, type: 'function', value: 'ping()', refcount: 2, mutable: false, state: 'normal' },
            { id: 'cellWrap', pyId: ADDRS.cellWrap, type: 'dict', refcount: 1, mutable: true, state: 'new',
              dictLabel: 'closure cells on wrapper', pairs: [
                { key: 'func', value: 'ping @ 0x7f9301c0', type: 'ref' },
                { key: 'times', value: 2, type: 'int' },
              ] },
            { id: 'wrapper4', pyId: ADDRS.wrapper4, type: 'function', value: 'wrapper()', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['wrapper4', 'cellWrap'],
        },
      },
      {
        title: 'The name <code>ping</code> lands on the wrapper',
        desc: 'Now <code>ping()</code> returns <code>[\'ping\', \'ping\']</code>. Two calls happened while the file was being read, <code>repeat(2)</code> and then <code>decorator(ping)</code>, and neither of them ran your function body.',
        lines: [8, 9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'repeat', ref: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', state: 'normal' },
            { name: 'ping', ref: 'wrapper4', pyId: ADDRS.wrapper4, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'repeatFn', pyId: ADDRS.repeatFn, type: 'function', value: 'repeat(times)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'wrapper4', pyId: ADDRS.wrapper4, type: 'function', value: 'wrapper()', refcount: 1, mutable: false, state: 'mutated' },
            { id: 'cellWrap', pyId: ADDRS.cellWrap, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cells on wrapper', pairs: [
                { key: 'func', value: 'ping @ 0x7f9301c0', type: 'ref' },
                { key: 'times', value: 2, type: 'int' },
              ] },
            { id: 'pingFn', pyId: ADDRS.pingFn, type: 'function', value: 'ping()', refcount: 1, mutable: false, state: 'normal',
              note: 'your original body, held by the cell' },
          ],
          highlight: ['wrapper4', 'pingFn'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     5 · Two decorators on one function
     ────────────────────────────────────────────────────────── */
  stacking: {
    watch: 'Applied bottom-up, executed top-down. Two different orders, and both are visible in the diagram.',
    code: `def bold(func):
    def wrapper():
        return "<b>" + func() + "</b>"
    return wrapper

def italic(func):
    def wrapper():
        return "<i>" + func() + "</i>"
    return wrapper

@bold
@italic
def text():
    return "hi"`,
    steps: [
      {
        title: 'Two decorators, stacked',
        desc: 'The question everyone asks is which one runs first. The answer depends on whether you mean "applied" or "called", and both answers fall out of <code>name = deco(name)</code>.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'Both decorators are just functions on the heap',
        desc: 'Neither has done anything yet. They only act when something is handed to them.',
        lines: [1, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'bold', ref: 'boldFn', pyId: ADDRS.boldFn, type: 'function', state: 'new' },
            { name: 'italic', ref: 'italicFn', pyId: ADDRS.italicFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'boldFn', pyId: ADDRS.boldFn, type: 'function', value: 'bold(func)', refcount: 1, mutable: false, state: 'new' },
            { id: 'italicFn', pyId: ADDRS.italicFn, type: 'function', value: 'italic(func)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['boldFn', 'italicFn'],
        },
      },
      {
        title: '<code>def text</code> builds your function',
        desc: 'As always, the body under the decorators is created first. It isn\'t named <code>text</code> yet.',
        lines: [13, 14],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'bold', ref: 'boldFn', pyId: ADDRS.boldFn, type: 'function', state: 'normal' },
            { name: 'italic', ref: 'italicFn', pyId: ADDRS.italicFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'boldFn', pyId: ADDRS.boldFn, type: 'function', value: 'bold(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'italicFn', pyId: ADDRS.italicFn, type: 'function', value: 'italic(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'textFn', pyId: ADDRS.textFn, type: 'function', value: 'text()', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['textFn'],
        },
      },
      {
        title: 'The <em>nearest</em> decorator goes first: <code>@italic</code>',
        desc: 'Decorators are applied from the <code>def</code> outwards, so the bottom line goes first. <code>italic(text)</code> returns a wrapper whose cell holds your original function.',
        lines: [12, 6, 7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'bold', ref: 'boldFn', pyId: ADDRS.boldFn, type: 'function', state: 'normal' },
            { name: 'italic', ref: 'italicFn', pyId: ADDRS.italicFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'boldFn', pyId: ADDRS.boldFn, type: 'function', value: 'bold(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'italicFn', pyId: ADDRS.italicFn, type: 'function', value: 'italic(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'italicW', pyId: ADDRS.italicW, type: 'function', value: 'italic wrapper', refcount: 1, mutable: false, state: 'new' },
            { id: 'cellIt', pyId: ADDRS.cellIt, type: 'dict', refcount: 1, mutable: true, state: 'new',
              dictLabel: 'closure cell', pairs: [
                { key: 'func', value: 'text @ 0x7f9401a0', type: 'ref' },
              ] },
            { id: 'textFn', pyId: ADDRS.textFn, type: 'function', value: 'text()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['italicW', 'cellIt'],
        },
      },
      {
        title: 'Then <code>@bold</code> wraps <em>the wrapper</em>',
        desc: '<code>bold</code> never sees your function. It receives the italic wrapper, and its own cell holds that. You now have a chain three objects deep.',
        lines: [11, 1, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'bold', ref: 'boldFn', pyId: ADDRS.boldFn, type: 'function', state: 'normal' },
            { name: 'italic', ref: 'italicFn', pyId: ADDRS.italicFn, type: 'function', state: 'normal' },
          ]}],
          heap: [
            { id: 'boldFn', pyId: ADDRS.boldFn, type: 'function', value: 'bold(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'italicFn', pyId: ADDRS.italicFn, type: 'function', value: 'italic(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'boldW', pyId: ADDRS.boldW, type: 'function', value: 'bold wrapper', refcount: 1, mutable: false, state: 'new' },
            { id: 'cellBd', pyId: ADDRS.cellBd, type: 'dict', refcount: 1, mutable: true, state: 'new',
              dictLabel: 'closure cell', pairs: [
                { key: 'func', value: 'italic wrapper @ 0x7f940220', type: 'ref' },
              ] },
            { id: 'italicW', pyId: ADDRS.italicW, type: 'function', value: 'italic wrapper', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellIt', pyId: ADDRS.cellIt, type: 'dict', refcount: 1, mutable: true, state: 'normal',
              dictLabel: 'closure cell', pairs: [
                { key: 'func', value: 'text @ 0x7f9401a0', type: 'ref' },
              ] },
            { id: 'textFn', pyId: ADDRS.textFn, type: 'function', value: 'text()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['boldW', 'cellBd'],
        },
      },
      {
        title: 'The name <code>text</code> lands on the outermost wrapper',
        desc: 'The decorator closest to <code>def</code> is applied first, so the one furthest away ends up outermost. That\'s why the top line is the last one applied and the first one entered.',
        lines: [11, 13],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'bold', ref: 'boldFn', pyId: ADDRS.boldFn, type: 'function', state: 'normal' },
            { name: 'italic', ref: 'italicFn', pyId: ADDRS.italicFn, type: 'function', state: 'normal' },
            { name: 'text', ref: 'boldW', pyId: ADDRS.boldW, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'boldFn', pyId: ADDRS.boldFn, type: 'function', value: 'bold(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'italicFn', pyId: ADDRS.italicFn, type: 'function', value: 'italic(func)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'boldW', pyId: ADDRS.boldW, type: 'function', value: 'bold wrapper', refcount: 1, mutable: false, state: 'mutated' },
            { id: 'italicW', pyId: ADDRS.italicW, type: 'function', value: 'italic wrapper', refcount: 1, mutable: false, state: 'normal' },
            { id: 'textFn', pyId: ADDRS.textFn, type: 'function', value: 'text()', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['boldW'],
        },
      },
      {
        title: 'Calling <code>text()</code> walks the chain outside-in',
        desc: 'Bold runs, calls italic, which calls your function. The result comes back through the same chain in reverse: <code>&lt;b&gt;&lt;i&gt;hi&lt;/i&gt;&lt;/b&gt;</code>. Applied bottom-up, executed top-down, in one picture.',
        lines: [3, 8, 14],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'text', ref: 'boldW', pyId: ADDRS.boldW, type: 'function', state: 'normal' },
            ]},
            { name: 'bold wrapper()', vars: [
              { name: 'func', ref: 'italicW', pyId: ADDRS.italicW, type: 'function', state: 'normal' },
            ]},
            { name: 'italic wrapper()', vars: [
              { name: 'func', ref: 'textFn', pyId: ADDRS.textFn, type: 'function', state: 'normal' },
            ]},
            { name: 'text()', vars: [] },
          ],
          heap: [
            { id: 'boldW', pyId: ADDRS.boldW, type: 'function', value: 'bold wrapper', refcount: 1, mutable: false, state: 'normal' },
            { id: 'italicW', pyId: ADDRS.italicW, type: 'function', value: 'italic wrapper', refcount: 2, mutable: false, state: 'normal' },
            { id: 'textFn', pyId: ADDRS.textFn, type: 'function', value: 'text()', refcount: 2, mutable: false, state: 'normal',
              note: 'reached last, returns "hi"' },
          ],
          highlight: ['textFn'],
        },
      },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '06-decorators',
    demos: DEMOS,
    defaultDemo: 'manual',
    defaultSpeed: 900,
  });
});
