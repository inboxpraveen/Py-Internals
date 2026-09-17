/* ============================================================
   SESSION 02: Functions, Scope & the Call Stack
   Demos: call and return, local scope, mutable arguments, closures,
          mutable default arguments (and the None cure)
   ============================================================ */

'use strict';

const ADDRS = {
  addFn:        '0x7f2100a0',
  int2:         '0x7f110020',
  int3:         '0x7f110030',
  int5:         '0x7f110050',

  globalMsg:    '0x7f2200a0',
  showFn:       '0x7f2101b0',
  localMsg:     '0x7f2200f8',

  addItemFn:    '0x7f2102c0',
  bagList:      '0x7f330010',

  makeCounterFn:'0x7f2103d0',
  incFn:        '0x7f2104e0',
  cellCount:    '0x7f440010',
  int1:         '0x7f110010',

  addItemDef:   '0x7f2105f0',
  defaultBag:   '0x7f3300aa',
  safeAddFn:    '0x7f210700',
  freshBag1:    '0x7f3300bb',
  freshBag2:    '0x7f3300cc',
};

/* Cached small ints (-5..256) are pre-created by CPython and never freed.
   They are drawn with an infinite refcount, exactly as Session 01 draws them. */
const CACHED_INT_NOTE = 'cached small int: CPython pre-creates -5 to 256 and never frees them';

const EMPTY_MEMORY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {
  call: {
    watch: 'A new frame appears on top, then disappears on return. The locals go with it.',
    code: `def add(a, b):
    total = a + b
    return total

answer = add(2, 3)`,
    steps: [
      {
        title: 'Initial state: only the global frame exists',
        desc: 'Before this code runs there is one namespace, <strong>global</strong>. No function object exists yet and no call frame has been created.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>def add(a, b):</code> creates a function object',
        desc: 'A <code>def</code> statement is executable code. Python builds a <strong>function object</strong> and binds the name <code>add</code> to it in the global namespace. The function body is not running yet.',
        lines: [1, 2, 3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add', ref: 'addFn', pyId: ADDRS.addFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'addFn', pyId: ADDRS.addFn, type: 'function', value: 'add(a, b)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['addFn'],
        },
      },
      {
        title: '<code>add(2, 3)</code> creates a new call frame',
        desc: 'Calling the function opens a fresh desk for that call. The parameters <code>a</code> and <code>b</code> are local names on it, bound to the objects <code>2</code> and <code>3</code>. Those two objects aren\'t built here. CPython made them at startup, along with every int from -5 to 256.',
        lines: [5],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add', ref: 'addFn', pyId: ADDRS.addFn, type: 'function', state: 'normal' },
            ]},
            { name: 'add(a, b)', vars: [
              { name: 'a', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'new' },
              { name: 'b', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'addFn', pyId: ADDRS.addFn, type: 'function', value: 'add(a, b)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'new', note: CACHED_INT_NOTE },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'new', note: CACHED_INT_NOTE },
          ],
          highlight: ['int2', 'int3'],
        },
      },
      {
        title: '<code>total = a + b</code> creates a local name',
        desc: 'Python evaluates <code>a + b</code> and gets back the <strong>same cached <code>5</code></strong> the rest of your program uses, so nothing new is built. It then binds the local name <code>total</code> to that object. The name lives only on this desk. The object doesn\'t.',
        lines: [2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add', ref: 'addFn', pyId: ADDRS.addFn, type: 'function', state: 'normal' },
            ]},
            { name: 'add(a, b)', vars: [
              { name: 'a', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
              { name: 'b', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'normal' },
              { name: 'total', ref: 'int5', pyId: ADDRS.int5, type: 'int', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'addFn', pyId: ADDRS.addFn, type: 'function', value: 'add(a, b)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int5', pyId: ADDRS.int5, type: 'int', value: 5, refcount: '∞', mutable: false, state: 'new', note: CACHED_INT_NOTE },
          ],
          highlight: ['int5'],
        },
      },
      {
        title: '<code>return total</code> hands an object back to the caller',
        desc: 'The return statement doesn\'t return the name <code>total</code>. It returns the object <code>total</code> points to, and that object is handed back to the global line that was waiting on the call.',
        lines: [3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add', ref: 'addFn', pyId: ADDRS.addFn, type: 'function', state: 'normal' },
            ]},
            { name: 'add(a, b)', vars: [
              { name: 'a', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
              { name: 'b', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'normal' },
              { name: 'total', ref: 'int5', pyId: ADDRS.int5, type: 'int', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'addFn', pyId: ADDRS.addFn, type: 'function', value: 'add(a, b)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int5', pyId: ADDRS.int5, type: 'int', value: 5, refcount: '∞', mutable: false, state: 'normal' },
          ],
          highlight: ['int5'],
        },
      },
      {
        title: 'Summary: the desk is cleared, the objects on it are not',
        desc: 'The frame is gone, so the <em>names</em> <code>a</code>, <code>b</code> and <code>total</code> are gone with it. Every object they pointed at is still where it was: <code>2</code>, <code>3</code> and <code>5</code> are cached ints that outlive any call. The only change in global is one new name, <code>answer</code>, pointing at the object the function handed back.',
        lines: [5],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add', ref: 'addFn', pyId: ADDRS.addFn, type: 'function', state: 'normal' },
              { name: 'answer', ref: 'int5', pyId: ADDRS.int5, type: 'int', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'addFn', pyId: ADDRS.addFn, type: 'function', value: 'add(a, b)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'normal', note: 'no name points here any more, and it is still not freed' },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int5', pyId: ADDRS.int5, type: 'int', value: 5, refcount: '∞', mutable: false, state: 'normal' },
          ],
          highlight: ['int5'],
        },
      },
    ],
  },

  scope: {
    watch: 'Assignment creates a local name, even if a global has the same spelling.',
    code: `message = "global"

def show():
    message = "local"
    return message

result = show()
print(message)`,
    steps: [
      {
        title: 'Initial state: no names yet',
        desc: 'This demo shows that assigning to a name inside a function creates a <strong>local</strong> binding unless you say otherwise.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>message = "global"</code> binds a global name',
        desc: 'The global frame now has a name <code>message</code> pointing to the string object <code>"global"</code>.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'message', ref: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', state: 'new' },
          ]}],
          heap: [
            { id: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', value: 'global', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['globalMsg'],
        },
      },
      {
        title: '<code>def show()</code> creates another function object',
        desc: 'Python binds <code>show</code> in the global namespace. The body still has not run, so the local <code>message</code> does not exist yet.',
        lines: [3, 4, 5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'message', ref: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', state: 'normal' },
            { name: 'show', ref: 'showFn', pyId: ADDRS.showFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', value: 'global', refcount: 1, mutable: false, state: 'normal' },
            { id: 'showFn', pyId: ADDRS.showFn, type: 'function', value: 'show()', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['showFn'],
        },
      },
      {
        title: '<code>show()</code> creates a local frame',
        desc: 'The call creates a <code>show()</code> frame. Inside it, <code>message = "local"</code> creates a new local name. It shadows the global name. It doesn\'t overwrite it.',
        lines: [7, 4],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'message', ref: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', state: 'normal' },
              { name: 'show', ref: 'showFn', pyId: ADDRS.showFn, type: 'function', state: 'normal' },
            ]},
            { name: 'show()', vars: [
              { name: 'message', ref: 'localMsg', pyId: ADDRS.localMsg, type: 'str', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', value: 'global', refcount: 1, mutable: false, state: 'normal' },
            { id: 'showFn', pyId: ADDRS.showFn, type: 'function', value: 'show()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'localMsg', pyId: ADDRS.localMsg, type: 'str', value: 'local', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['localMsg', 'globalMsg'],
        },
      },
      {
        title: '<code>return message</code> returns the local object',
        desc: 'Name lookup starts in the local frame, so <code>message</code> means the local string <code>"local"</code>. The global <code>message</code> is still untouched.',
        lines: [5],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'message', ref: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', state: 'normal' },
              { name: 'show', ref: 'showFn', pyId: ADDRS.showFn, type: 'function', state: 'normal' },
            ]},
            { name: 'show()', vars: [
              { name: 'message', ref: 'localMsg', pyId: ADDRS.localMsg, type: 'str', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', value: 'global', refcount: 1, mutable: false, state: 'normal' },
            { id: 'showFn', pyId: ADDRS.showFn, type: 'function', value: 'show()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'localMsg', pyId: ADDRS.localMsg, type: 'str', value: 'local', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['localMsg'],
        },
      },
      {
        title: 'Summary: two names, two frames, two objects',
        desc: 'The desk is cleared, so the local <code>message</code> is gone as a name. The object it pointed at survives, because <code>result</code> now points at it too. The global <code>message</code> was never touched, so <code>print(message)</code> prints <code>global</code>. Same spelling, different frames, different names.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'message', ref: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', state: 'normal' },
            { name: 'show', ref: 'showFn', pyId: ADDRS.showFn, type: 'function', state: 'normal' },
            { name: 'result', ref: 'localMsg', pyId: ADDRS.localMsg, type: 'str', state: 'new' },
          ]}],
          heap: [
            { id: 'globalMsg', pyId: ADDRS.globalMsg, type: 'str', value: 'global', refcount: 1, mutable: false, state: 'normal' },
            { id: 'showFn', pyId: ADDRS.showFn, type: 'function', value: 'show()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'localMsg', pyId: ADDRS.localMsg, type: 'str', value: 'local', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['globalMsg', 'localMsg'],
        },
      },
    ],
  },

  mutableArgs: {
    watch: 'The parameter points at the caller\'s list. <code>append</code> is visible outside. <code>items = ...</code> is not.',
    code: `def add_item(items):
    items.append("notebook")
    return items

bag = []
same_bag = add_item(bag)

print(bag)
print(bag is same_bag)`,
    steps: [
      {
        title: 'Initial state: about to pass a list',
        desc: 'Arguments are passed by object reference. The parameter name receives a reference to the same object the caller passed in.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>def add_item(items)</code> creates the function',
        desc: 'The name <code>add_item</code> points to a function object. No list exists yet, and the parameter <code>items</code> doesn\'t exist until a call begins.',
        lines: [1, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', value: 'add_item(items)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['addItemFn'],
        },
      },
      {
        title: '<code>bag = []</code> creates one mutable list',
        desc: 'The global name <code>bag</code> points to an empty list object. Lists are mutable, so this object can be changed in place.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', state: 'normal' },
            { name: 'bag', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', value: 'add_item(items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'bagList', pyId: ADDRS.bagList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [] },
          ],
          highlight: ['bagList'],
        },
      },
      {
        title: '<code>add_item(bag)</code> binds the parameter <code>items</code>',
        desc: 'No list is copied. The local name <code>items</code> points to the same list object as the global name <code>bag</code>. The refcount rises because two names now reference one object.',
        lines: [6],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_item', ref: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', state: 'normal' },
              { name: 'bag', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'normal' },
            ]},
            { name: 'add_item(items)', vars: [
              { name: 'items', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', value: 'add_item(items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'bagList', pyId: ADDRS.bagList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [] },
          ],
          highlight: ['bagList'],
        },
      },
      {
        title: '<code>items.append("notebook")</code> mutates the shared list',
        desc: 'The append changes the list object itself. <code>bag</code> and <code>items</code> point to the same object, so the caller will see the new item.',
        lines: [2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_item', ref: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', state: 'normal' },
              { name: 'bag', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'normal' },
            ]},
            { name: 'add_item(items)', vars: [
              { name: 'items', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', value: 'add_item(items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'bagList', pyId: ADDRS.bagList, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 'notebook', type: 'str' },
            ], note: 'same object, same address, one item longer' },
          ],
          highlight: ['bagList'],
        },
      },
      {
        title: '<code>return items</code> returns the same list object',
        desc: 'The function returns the object <code>items</code> refers to. That object is the original <code>bag</code> list, not a new one.',
        lines: [3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_item', ref: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', state: 'normal' },
              { name: 'bag', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'normal' },
            ]},
            { name: 'add_item(items)', vars: [
              { name: 'items', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', value: 'add_item(items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'bagList', pyId: ADDRS.bagList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 'notebook', type: 'str' },
            ] },
          ],
          highlight: ['bagList'],
        },
      },
      {
        title: '<code>same_bag</code> and <code>bag</code> are the same object',
        desc: 'The function frame is gone. The global names <code>bag</code> and <code>same_bag</code> both point to the same list, so <code>print(bag)</code> shows the item and <code>bag is same_bag</code> is <code>True</code>.',
        lines: [6, 8, 9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', state: 'normal' },
            { name: 'bag', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'normal' },
            { name: 'same_bag', ref: 'bagList', pyId: ADDRS.bagList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemFn', pyId: ADDRS.addItemFn, type: 'function', value: 'add_item(items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'bagList', pyId: ADDRS.bagList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 'notebook', type: 'str' },
            ] },
          ],
          highlight: ['bagList'],
        },
      },
    ],
  },

  closure: {
    watch: 'Look at <code>inc()</code>\'s desk: it has no locals at all. The remembered <code>count</code> lives in a <strong>cell</strong> that the function object carries around.',
    code: `def make_counter():
    count = 0

    def inc():
        nonlocal count
        count = count + 1
        return count

    return inc

counter = make_counter()
value = counter()`,
    steps: [
      {
        title: 'Initial state: nothing defined yet',
        desc: 'A <strong>closure</strong> is what you get when an inner function still needs a name from an outer function after that outer call has finished. Nothing exists yet, just the global frame.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>def make_counter()</code> stores the whole body for later',
        desc: 'Running the <code>def</code> builds one function object and binds <code>make_counter</code> to it. Everything indented under it, including the inner <code>def inc()</code>, is stored rather than run. No <code>count</code> exists yet.',
        lines: [1, 2, 4, 5, 6, 7, 9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['makeCounterFn'],
        },
      },
      {
        title: '<code>make_counter()</code> puts <code>count</code> in a cell, not on the desk',
        desc: 'The call opens a desk for <code>make_counter</code>. But Python read the body at compile time and saw that <code>inc</code> uses <code>count</code>, so <code>count</code> is never stored on the desk. <code>count = 0</code> writes into a <strong>cell</strong>, a one-slot box that can outlive the desk. That\'s why <code>make_counter</code>\'s desk looks empty here.',
        lines: [11, 2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            ]},
            { name: 'make_counter()', vars: [] },
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellCount', pyId: ADDRS.cellCount, type: 'dict', dictLabel: 'cell: one slot, holding count', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'count', value: 0, type: 'int' },
            ], note: 'drawn as a box with one named slot; in CPython this is a cell object' },
          ],
          highlight: ['cellCount'],
        },
      },
      {
        title: '<code>def inc()</code> creates a function that carries the cell',
        desc: 'The inner function object is built during the outer call. Because its body mentions <code>count</code>, Python hands it a reference to that same cell, not a copy of the value. From here on, one box has two users.',
        lines: [4, 5, 6, 7],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            ]},
            { name: 'make_counter()', vars: [
              { name: 'inc', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellCount', pyId: ADDRS.cellCount, type: 'dict', dictLabel: 'cell: one slot, holding count', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'count', value: 0, type: 'int' },
            ], note: 'refs went from 1 to 2: the running call holds it, and now inc holds it too' },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc()', refcount: 1, mutable: false, state: 'new',
              note: '__closure__ points at the cell at ' + ADDRS.cellCount },
          ],
          highlight: ['incFn', 'cellCount'],
        },
      },
      {
        title: '<code>return inc</code> hands back the function object',
        desc: 'The outer function returns the inner function itself, the object rather than a call to it. Nothing is copied. The same <code>inc</code> object on the heap is handed to the caller, cell and all.',
        lines: [9],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            ]},
            { name: 'make_counter()', vars: [
              { name: 'inc', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellCount', pyId: ADDRS.cellCount, type: 'dict', dictLabel: 'cell: one slot, holding count', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'count', value: 0, type: 'int' },
            ] },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc()', refcount: 2, mutable: false, state: 'normal',
              note: '__closure__ points at the cell at ' + ADDRS.cellCount },
          ],
          highlight: ['incFn'],
        },
      },
      {
        title: 'The desk is cleared. The cell is not',
        desc: 'The outer call is over, so <code>make_counter</code>\'s frame is removed completely. Nothing about it is kept alive. What survives is a separate object: the cell, held by the <code>inc</code> function object, which the global name <code>counter</code> now points at.',
        lines: [11],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            { name: 'counter', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellCount', pyId: ADDRS.cellCount, type: 'dict', dictLabel: 'cell: one slot, holding count', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'count', value: 0, type: 'int' },
            ], note: 'the desk is gone; only inc still holds this box, so refs dropped back to 1' },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc()', refcount: 1, mutable: false, state: 'normal',
              note: '__closure__ points at the cell at ' + ADDRS.cellCount },
          ],
          highlight: ['cellCount', 'incFn'],
        },
      },
      {
        title: '<code>counter()</code> writes through to the cell',
        desc: 'Look at <code>inc()</code>\'s desk: it\'s empty. <code>inc</code> has no local <code>count</code>, and that is what <code>nonlocal count</code> buys you. Reading and writing <code>count</code> both go straight through to the cell, so <code>count + 1</code> points the cell\'s one slot at <code>1</code>.',
        lines: [12, 5, 6],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
              { name: 'counter', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'normal' },
            ]},
            { name: 'inc()', vars: [] },
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellCount', pyId: ADDRS.cellCount, type: 'dict', dictLabel: 'cell: one slot, holding count', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'count', value: 1, type: 'int' },
            ], note: 'same box, same address, its one slot now points at 1' },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: '∞', mutable: false, state: 'new', note: CACHED_INT_NOTE },
          ],
          highlight: ['cellCount', 'int1'],
        },
      },
      {
        title: 'Summary: the state lives in the cell, not in a frame',
        desc: 'The inner desk is cleared too, and <code>value</code> is bound to the object <code>inc</code> returned. Every frame this demo opened has been removed, and the counter still works because its memory was never in a frame. That\'s a closure: a function object plus the cells it carries.',
        lines: [7, 12],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            { name: 'counter', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'normal' },
            { name: 'value', ref: 'int1', pyId: ADDRS.int1, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'cellCount', pyId: ADDRS.cellCount, type: 'dict', dictLabel: 'cell: one slot, holding count', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'count', value: 1, type: 'int' },
            ], note: 'call counter() again and this same box goes to 2' },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc()', refcount: 1, mutable: false, state: 'normal',
              note: '__closure__ points at the cell at ' + ADDRS.cellCount },
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: '∞', mutable: false, state: 'normal' },
          ],
          highlight: ['cellCount', 'incFn'],
        },
      },
    ],
  },

  defaultArgs: {
    watch: 'One shared list for <code>bag=[]</code>. Then watch <code>bag=None</code> build a fresh list on every call.',
    code: `def add_item(item, bag=[]):
    bag.append(item)
    return bag

first  = add_item("a")
second = add_item("b")

def safe_add(item, bag=None):
    if bag is None:
        bag = []
    bag.append(item)
    return bag

one = safe_add("x")
two = safe_add("y")`,
    steps: [
      {
        title: 'Initial state: nothing defined yet',
        desc: 'Two versions of the same function are coming up. The first has the classic bug, the second is the habit to keep. Count how many list objects each version creates.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: 'The default list is built once, at <code>def</code> time',
        desc: 'Python evaluates <code>bag=[]</code> while it is building the function object, not on each call. That one empty list is stored on the function and handed out again and again.',
        lines: [1, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', value: 'add_item(item, bag=[])', refcount: 1, mutable: false, state: 'new' },
            { id: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', refcount: 1, mutable: true, state: 'new', items: [],
              note: 'held by the function object: this is add_item.__defaults__[0]' },
          ],
          highlight: ['defaultBag', 'addItemDef'],
        },
      },
      {
        title: 'The first call binds <code>bag</code> to that same list',
        desc: '<code>add_item("a")</code> doesn\'t build a new list. The local name <code>bag</code> is bound to the list already sitting on the function, and <code>append</code> mutates it in place. Check the address: it\'s the one from the previous step.',
        lines: [5, 2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_item', ref: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', state: 'normal' },
            ]},
            { name: 'add_item(item, bag)', vars: [
              { name: 'item', inline: true, value: 'a', type: 'str' },
              { name: 'bag', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', value: 'add_item(item, bag=[])', refcount: 1, mutable: false, state: 'normal' },
            { id: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 'a', type: 'str' },
            ], note: 'refs 2: the function still holds it, and so does the local name bag' },
          ],
          highlight: ['defaultBag'],
        },
      },
      {
        title: '<code>first</code> is another name for the default list',
        desc: 'The desk is cleared, but the function returned the default list itself, so <code>first</code> now points at it. The list the function will reach for next time is no longer empty.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', state: 'normal' },
            { name: 'first', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', value: 'add_item(item, bag=[])', refcount: 1, mutable: false, state: 'normal' },
            { id: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 'a', type: 'str' },
            ] },
          ],
          highlight: ['defaultBag'],
        },
      },
      {
        title: 'The second call appends to the <em>same</em> list',
        desc: '<code>add_item("b")</code> doesn\'t start from <code>[]</code>. It reaches for the same stored list, which already holds <code>"a"</code>. That\'s why <code>second</code> is <code>["a", "b"]</code>, and why <code>first</code> is too. There\'s only one list here, wearing three names.',
        lines: [6, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', state: 'normal' },
            { name: 'first', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'normal' },
            { name: 'second', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', value: 'add_item(item, bag=[])', refcount: 1, mutable: false, state: 'normal' },
            { id: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', refcount: 3, mutable: true, state: 'mutated', items: [
              { value: 'a', type: 'str' },
              { value: 'b', type: 'str' },
            ], note: 'first, second and add_item.__defaults__[0] are all this one address' },
          ],
          highlight: ['defaultBag'],
        },
      },
      {
        title: 'The cure: <code>def safe_add(item, bag=None)</code>',
        desc: 'Same idea, one change. The default is now <code>None</code>, a single immutable object with nothing to mutate. Nothing gets stored on this function that a later call could grow.',
        lines: [8, 9, 10, 11, 12],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', state: 'normal' },
            { name: 'first', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'normal' },
            { name: 'second', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'normal' },
            { name: 'safe_add', ref: 'safeAddFn', pyId: ADDRS.safeAddFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', value: 'add_item(item, bag=[])', refcount: 1, mutable: false, state: 'normal' },
            { id: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', refcount: 3, mutable: true, state: 'normal', items: [
              { value: 'a', type: 'str' },
              { value: 'b', type: 'str' },
            ] },
            { id: 'safeAddFn', pyId: ADDRS.safeAddFn, type: 'function', value: 'safe_add(item, bag=None)', refcount: 1, mutable: false, state: 'new',
              note: 'safe_add.__defaults__ is (None,), no list attached' },
          ],
          highlight: ['safeAddFn'],
        },
      },
      {
        title: '<code>safe_add("x")</code> builds a list inside the call',
        desc: 'Here\'s the difference, on screen. <code>bag</code> arrives as <code>None</code>, the <code>if</code> is true, and line 10 runs <code>bag = []</code>: a brand-new list object at a brand-new address, belonging to this call alone.',
        lines: [14, 9, 10, 11],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_item', ref: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', state: 'normal' },
              { name: 'first', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'normal' },
              { name: 'second', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'normal' },
              { name: 'safe_add', ref: 'safeAddFn', pyId: ADDRS.safeAddFn, type: 'function', state: 'normal' },
            ]},
            { name: 'safe_add(item, bag)', vars: [
              { name: 'item', inline: true, value: 'x', type: 'str' },
              { name: 'bag', ref: 'freshBag1', pyId: ADDRS.freshBag1, type: 'list', state: 'rebound' },
            ]},
          ],
          heap: [
            { id: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', value: 'add_item(item, bag=[])', refcount: 1, mutable: false, state: 'normal' },
            { id: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', refcount: 3, mutable: true, state: 'normal', items: [
              { value: 'a', type: 'str' },
              { value: 'b', type: 'str' },
            ] },
            { id: 'safeAddFn', pyId: ADDRS.safeAddFn, type: 'function', value: 'safe_add(item, bag=None)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'freshBag1', pyId: ADDRS.freshBag1, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'x', type: 'str' },
            ], note: 'created by line 10, on this call. Nothing on the function points here' },
          ],
          highlight: ['freshBag1'],
        },
      },
      {
        title: 'Summary: one shared list, or a fresh one per call',
        desc: '<code>safe_add("y")</code> runs line 10 again and gets a <em>second</em>, different list. Count the addresses. <code>first</code> and <code>second</code> are one object that keeps growing, while <code>one</code> and <code>two</code> are two separate objects. The rule behind both halves is the same: <code>def</code> runs its defaults once, so never let a mutable object be one.',
        lines: [15, 10],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_item', ref: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', state: 'normal' },
            { name: 'first', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'normal' },
            { name: 'second', ref: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', state: 'normal' },
            { name: 'safe_add', ref: 'safeAddFn', pyId: ADDRS.safeAddFn, type: 'function', state: 'normal' },
            { name: 'one', ref: 'freshBag1', pyId: ADDRS.freshBag1, type: 'list', state: 'new' },
            { name: 'two', ref: 'freshBag2', pyId: ADDRS.freshBag2, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'addItemDef', pyId: ADDRS.addItemDef, type: 'function', value: 'add_item(item, bag=[])', refcount: 1, mutable: false, state: 'normal' },
            { id: 'defaultBag', pyId: ADDRS.defaultBag, type: 'list', refcount: 3, mutable: true, state: 'normal', items: [
              { value: 'a', type: 'str' },
              { value: 'b', type: 'str' },
            ], note: 'one object: first, second and the stored default' },
            { id: 'safeAddFn', pyId: ADDRS.safeAddFn, type: 'function', value: 'safe_add(item, bag=None)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'freshBag1', pyId: ADDRS.freshBag1, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'x', type: 'str' },
            ] },
            { id: 'freshBag2', pyId: ADDRS.freshBag2, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'y', type: 'str' },
            ], note: 'a different address from the previous call' },
          ],
          highlight: ['defaultBag', 'freshBag1', 'freshBag2'],
        },
      },
    ],
  },
};


/* Boot */
document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '02-functions',
    demos: DEMOS,
    defaultDemo: 'call',
    defaultSpeed: 900,
  });
});
