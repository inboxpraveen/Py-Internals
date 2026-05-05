/* ============================================================
   SESSION 02 - Functions, Scope & the Call Stack
   Demos: function calls, local scope, mutable arguments, closures
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
  strNotebook:  '0x7f220220',

  makeCounterFn:'0x7f2103d0',
  incFn:        '0x7f2104e0',
  closureDict:  '0x7f440010',
  int0:         '0x7f110000',
  int1:         '0x7f110010',
};

const EMPTY_MEMORY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {
  call: {
    code: `def add(a, b):
    total = a + b
    return total

answer = add(2, 3)`,
    steps: [
      {
        title: 'Initial state - only the global frame exists',
        desc: 'Before this code runs, there is one namespace: <strong>global</strong>. No function object exists yet, and no call frame has been created.',
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
        desc: 'Calling the function creates a fresh frame for that call. The parameters <code>a</code> and <code>b</code> are local names inside the <code>add</code> frame, bound to the argument objects <code>2</code> and <code>3</code>.',
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
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: 1, mutable: false, state: 'new' },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['int2', 'int3'],
        },
      },
      {
        title: '<code>total = a + b</code> creates a local name',
        desc: 'Python evaluates <code>a + b</code>, creates the integer object <code>5</code>, then binds the local name <code>total</code> to it. This name exists only in the active function frame.',
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
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int5', pyId: ADDRS.int5, type: 'int', value: 5, refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['int5'],
        },
      },
      {
        title: '<code>return total</code> hands an object back to the caller',
        desc: 'The return statement does not return the name <code>total</code>. It returns the object that <code>total</code> points to. That object is handed back to the suspended global line.',
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
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int5', pyId: ADDRS.int5, type: 'int', value: 5, refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['int5'],
        },
      },
      {
        title: 'The call frame disappears; <code>answer</code> receives the result',
        desc: 'After the function returns, its local frame is removed. The local names <code>a</code>, <code>b</code>, and <code>total</code> disappear. The returned object survives because global name <code>answer</code> now points to it.',
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
            { id: 'int5', pyId: ADDRS.int5, type: 'int', value: 5, refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['int5'],
        },
      },
    ],
  },

  scope: {
    code: `message = "global"

def show():
    message = "local"
    return message

result = show()
print(message)`,
    steps: [
      {
        title: 'Initial state - no names yet',
        desc: 'This demo shows that assigning to a name inside a function creates a <strong>local</strong> binding unless you explicitly say otherwise.',
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
        desc: 'The call creates a <code>show()</code> frame. Inside that frame, <code>message = "local"</code> creates a new local name. It shadows the global name; it does not overwrite it.',
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
        title: '<code>result</code> is local value; global <code>message</code> remains',
        desc: 'After the frame disappears, <code>result</code> points to <code>"local"</code>. The global name <code>message</code> still points to <code>"global"</code>, so <code>print(message)</code> prints <code>global</code>.',
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
    code: `def add_item(items):
    items.append("notebook")
    return items

bag = []
same_bag = add_item(bag)

print(bag)
print(bag is same_bag)`,
    steps: [
      {
        title: 'Initial state - preparing to pass a list',
        desc: 'Arguments are passed by object reference. That means the parameter name receives a reference to the same object the caller passed.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>def add_item(items)</code> creates the function',
        desc: 'The name <code>add_item</code> points to a function object. No list exists yet and the parameter <code>items</code> does not exist until a call begins.',
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
        desc: 'The global name <code>bag</code> points to an empty list object. Because lists are mutable, the object can be changed in-place.',
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
        title: '<code>add_item(bag)</code> binds parameter <code>items</code>',
        desc: 'No list is copied. The local name <code>items</code> points to the same list object as global name <code>bag</code>. The refcount rises because two names reference one object.',
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
        desc: 'The append call changes the list object itself. Because <code>bag</code> and <code>items</code> point to the same object, the caller will see the new item.',
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
            { id: 'strNotebook', pyId: ADDRS.strNotebook, type: 'str', value: 'notebook', refcount: 1, mutable: false, state: 'new' },
            { id: 'bagList', pyId: ADDRS.bagList, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 'notebook', type: 'str' },
            ] },
          ],
          highlight: ['bagList'],
        },
      },
      {
        title: '<code>return items</code> returns the same list object',
        desc: 'The function returns the object referenced by <code>items</code>. That object is the original <code>bag</code> list, not a new list.',
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
        title: '<code>same_bag</code> and <code>bag</code> share identity',
        desc: 'The function frame is gone. Global names <code>bag</code> and <code>same_bag</code> both point to the same list, so <code>print(bag)</code> shows the item and <code>bag is same_bag</code> is <code>True</code>.',
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
        title: 'Initial state - closures keep outer state alive',
        desc: 'A closure happens when an inner function remembers a name from an outer function after the outer call has returned.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>def make_counter()</code> creates the outer function',
        desc: 'The global name <code>make_counter</code> points to a function object. Its body will run only when we call it.',
        lines: [1, 2, 4, 9],
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
        title: '<code>make_counter()</code> creates an outer call frame',
        desc: 'The call creates a frame for <code>make_counter</code>. Inside it, <code>count = 0</code> creates a local name. Because an inner function will use this name, Python keeps it in a closure cell.',
        lines: [11, 2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            ]},
            { name: 'make_counter()', vars: [
              { name: 'count', ref: 'int0', pyId: ADDRS.int0, type: 'int', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int0', pyId: ADDRS.int0, type: 'int', value: 0, refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['int0'],
        },
      },
      {
        title: '<code>def inc()</code> creates an inner function with memory',
        desc: 'The inner function object is created during the outer call. Because <code>inc</code> uses <code>count</code>, it carries a closure: a small hidden storage area that remembers the outer name.',
        lines: [4, 5, 6, 7],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            ]},
            { name: 'make_counter()', vars: [
              { name: 'count', ref: 'int0', pyId: ADDRS.int0, type: 'int', state: 'normal' },
              { name: 'inc', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int0', pyId: ADDRS.int0, type: 'int', value: 0, refcount: 1, mutable: false, state: 'normal' },
            { id: 'closureDict', pyId: ADDRS.closureDict, type: 'dict', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'count', value: 0, type: 'int' },
            ] },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc() + closure', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['incFn', 'closureDict'],
        },
      },
      {
        title: '<code>return inc</code> returns the function object',
        desc: 'The outer function returns the inner function itself. The <code>make_counter</code> frame will disappear, but the closure keeps <code>count</code> alive for later calls.',
        lines: [9],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            ]},
            { name: 'make_counter()', vars: [
              { name: 'count', ref: 'int0', pyId: ADDRS.int0, type: 'int', state: 'normal' },
              { name: 'inc', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'closureDict', pyId: ADDRS.closureDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'count', value: 0, type: 'int' },
            ] },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc() + closure', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['incFn', 'closureDict'],
        },
      },
      {
        title: '<code>counter</code> now points to <code>inc</code>',
        desc: 'The outer call has finished. Local names from <code>make_counter</code> are gone, but the returned function is still alive because global name <code>counter</code> points to it. Its closure still remembers <code>count</code>.',
        lines: [11],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            { name: 'counter', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'closureDict', pyId: ADDRS.closureDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'count', value: 0, type: 'int' },
            ] },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc() + closure', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['incFn', 'closureDict'],
        },
      },
      {
        title: '<code>counter()</code> reopens the closure state',
        desc: 'Calling <code>counter</code> runs the inner function <code>inc</code>. The line <code>nonlocal count</code> means assignment should update the remembered outer <code>count</code>, not create a new local <code>count</code>.',
        lines: [12, 5, 6],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
              { name: 'counter', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'normal' },
            ]},
            { name: 'inc()', vars: [
              { name: 'count', ref: 'int1', pyId: ADDRS.int1, type: 'int', state: 'rebound' },
            ]},
          ],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'closureDict', pyId: ADDRS.closureDict, type: 'dict', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'count', value: 1, type: 'int' },
            ] },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc() + closure', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['closureDict', 'int1'],
        },
      },
      {
        title: '<code>value</code> receives the updated count',
        desc: 'The inner frame returns <code>1</code> and disappears. The important idea: a closure lets a function carry remembered state without using a global variable.',
        lines: [7, 12],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'make_counter', ref: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', state: 'normal' },
            { name: 'counter', ref: 'incFn', pyId: ADDRS.incFn, type: 'function', state: 'normal' },
            { name: 'value', ref: 'int1', pyId: ADDRS.int1, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'makeCounterFn', pyId: ADDRS.makeCounterFn, type: 'function', value: 'make_counter()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'closureDict', pyId: ADDRS.closureDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'count', value: 1, type: 'int' },
            ] },
            { id: 'incFn', pyId: ADDRS.incFn, type: 'function', value: 'inc() + closure', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['closureDict', 'int1'],
        },
      },
    ],
  },
};

let currentAnimator = null;
let memViz = null;

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchDemo(demoKey) {
  document.querySelectorAll('.demo-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.demo === demoKey);
  });

  const demo = DEMOS[demoKey];
  if (!demo) return;

  const codePanel = document.getElementById('codePanel');
  PJ.Syntax.render(demo.code, codePanel);

  if (currentAnimator) currentAnimator.pause();

  currentAnimator = new PJ.Animator({
    steps: demo.steps,
    containerId: 'stage',
    defaultSpeed: 900,

    onStep(step, index) {
      PJ.Syntax.highlightLines(codePanel, step.lines || []);
      if (step.memory) memViz.render(step.memory);

      const numEl = document.getElementById('stepNum');
      const titleEl = document.getElementById('stepTitle');
      const descEl = document.getElementById('stepDesc');

      if (numEl) numEl.textContent = index + 1;
      if (titleEl) {
        titleEl.innerHTML = step.title || '';
        titleEl.classList.remove('explanation-text--animate');
        void titleEl.offsetWidth;
        titleEl.classList.add('explanation-text--animate');
      }
      if (descEl) descEl.innerHTML = step.desc || '';
    },

    onComplete() {
      PJ.Core.markSessionComplete('02-functions');
    },

    onReset() {
      PJ.Syntax.highlightLines(codePanel, []);
    },
  });

  currentAnimator.mount();
}

function initStage() {
  memViz = new PJ.MemoryViz('memPanel');
  switchDemo('call');

  const bar = document.getElementById('readProgress');
  if (bar) {
    const updateBar = () => {
      const scrolled = window.scrollY;
      const total = document.body.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
    };
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();
  }

  const sidebarAnchors = [...document.querySelectorAll('.sidebar__item[href^="#"]')]
    .map(link => ({ link, el: document.getElementById(link.getAttribute('href').slice(1)) }))
    .filter(item => item.el);

  function updateSidebarActive() {
    const scrollY = window.scrollY + 110;
    let current = sidebarAnchors[0];

    for (const item of sidebarAnchors) {
      if (item.el.offsetTop <= scrollY) current = item;
    }

    sidebarAnchors.forEach(item => item.link.classList.remove('active'));
    if (current) current.link.classList.add('active');
  }

  if (sidebarAnchors.length) {
    window.addEventListener('scroll', PJ.Core.debounce(updateSidebarActive, 40), { passive: true });
    updateSidebarActive();
  }
}

document.addEventListener('DOMContentLoaded', initStage);
