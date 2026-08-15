/* ============================================================
   SESSION 05 — Iterators & Generators
   Demos: for-loop protocol, explicit iter/next,
   yield suspension, lazy vs eager
   ============================================================ */

'use strict';

const ADDRS = {
  nums:      '0x7f810010',
  int10:     '0x7f11000a',
  int20:     '0x7f110014',
  listIt:    '0x7f820010',
  nName:     '0x7f11000a',

  itObj:     '0x7f830010',
  aVal:      '0x7f11000a',
  bVal:      '0x7f110014',

  countFn:   '0x7f8400a0',
  genObj:    '0x7f850010',
  int1:      '0x7f110001',
  int2:      '0x7f110002',

  eagerList: '0x7f860010',
  lazyGen:   '0x7f870010',
  int4:      '0x7f110004',
  int9:      '0x7f110009',
};

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {
  forLoop: {
    code: `nums = [10, 20]
for n in nums:
    print(n)`,
    steps: [
      {
        title: 'A list is iterable — it is not itself the iterator',
        desc: 'The list object holds the values. A <code>for</code> loop will ask the list for a <strong>separate iterator</strong> that remembers how far it has walked.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
          ],
          highlight: ['nums'],
        },
      },
      {
        title: '<code>for n in nums</code> calls <code>iter(nums)</code>',
        desc: 'Python creates a list iterator. The iterator has its own identity and an internal cursor (shown here as <code>index</code>). The list is unchanged.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'listIt', pyId: ADDRS.listIt, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'str' },
              { key: 'index', value: 0, type: 'int' },
            ] },
          ],
          highlight: ['listIt'],
        },
      },
      {
        title: 'First <code>next()</code> binds <code>n</code> to <code>10</code>',
        desc: 'The loop body runs with <code>n</code> pointing at <code>10</code>. The iterator advances its cursor. This is what <code>for</code> hides: <code>n = next(it)</code> again and again.',
        lines: [2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'n', ref: 'int10', pyId: ADDRS.int10, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'int10', pyId: ADDRS.int10, type: 'int', value: 10, refcount: 2, mutable: false, state: 'normal' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'listIt', pyId: ADDRS.listIt, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'str' },
              { key: 'index', value: 1, type: 'int' },
            ] },
          ],
          highlight: ['int10', 'listIt'],
        },
      },
      {
        title: 'Second <code>next()</code> rebinds <code>n</code> to <code>20</code>',
        desc: '<code>n</code> is rebound — same name, different object. The list still holds both values. The iterator now sits past the last item.',
        lines: [2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'n', ref: 'int20', pyId: ADDRS.int20, type: 'int', state: 'rebound' },
          ]}],
          heap: [
            { id: 'int10', pyId: ADDRS.int10, type: 'int', value: 10, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int20', pyId: ADDRS.int20, type: 'int', value: 20, refcount: 2, mutable: false, state: 'normal' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'listIt', pyId: ADDRS.listIt, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'str' },
              { key: 'index', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['int20', 'listIt'],
        },
      },
      {
        title: '<code>StopIteration</code> ends the loop',
        desc: 'The next <code>next()</code> raises <code>StopIteration</code>. The <code>for</code> loop catches it and stops. The iterator is exhausted; the list is still there. A new <code>for</code> would create a <em>new</em> iterator.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'n', ref: 'int20', pyId: ADDRS.int20, type: 'int', state: 'normal' },
          ]}],
          heap: [
            { id: 'int20', pyId: ADDRS.int20, type: 'int', value: 20, refcount: 2, mutable: false, state: 'normal' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'listIt', pyId: ADDRS.listIt, type: 'iterator', value: 'list_iterator (exhausted)', refcount: 0, mutable: true, state: 'gc', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'str' },
              { key: 'index', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['listIt'],
        },
      },
    ],
  },

  explicit: {
    code: `nums = [10, 20]
it = iter(nums)
a = next(it)
b = next(it)`,
    steps: [
      {
        title: 'Same list, but you hold the iterator yourself',
        desc: 'This is the protocol <code>for</code> uses, written out. <code>iter(nums)</code> asks the list for an iterator object.',
        lines: [1, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'it', ref: 'itObj', pyId: ADDRS.itObj, type: 'iterator', state: 'new' },
          ]}],
          heap: [
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'itObj', pyId: ADDRS.itObj, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'index', value: 0, type: 'int' },
            ] },
          ],
          highlight: ['itObj'],
        },
      },
      {
        title: '<code>a = next(it)</code> — one step, one object',
        desc: '<code>next</code> returns the current item and advances the iterator. <code>a</code> is just a name bound to <code>10</code>. The iterator is the thing with state.',
        lines: [3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'it', ref: 'itObj', pyId: ADDRS.itObj, type: 'iterator', state: 'normal' },
            { name: 'a', ref: 'aVal', pyId: ADDRS.aVal, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'aVal', pyId: ADDRS.aVal, type: 'int', value: 10, refcount: 2, mutable: false, state: 'new' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'itObj', pyId: ADDRS.itObj, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'index', value: 1, type: 'int' },
            ] },
          ],
          highlight: ['aVal', 'itObj'],
        },
      },
      {
        title: '<code>b = next(it)</code> — the same iterator, further along',
        desc: 'A second name, a second value, one shared cursor. If you called <code>iter(nums)</code> again you would get a <em>new</em> iterator starting at the beginning. Exhausted iterators do not rewind.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'it', ref: 'itObj', pyId: ADDRS.itObj, type: 'iterator', state: 'normal' },
            { name: 'a', ref: 'aVal', pyId: ADDRS.aVal, type: 'int', state: 'normal' },
            { name: 'b', ref: 'bVal', pyId: ADDRS.bVal, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'aVal', pyId: ADDRS.aVal, type: 'int', value: 10, refcount: 2, mutable: false, state: 'normal' },
            { id: 'bVal', pyId: ADDRS.bVal, type: 'int', value: 20, refcount: 2, mutable: false, state: 'new' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'itObj', pyId: ADDRS.itObj, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'index', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['bVal', 'itObj'],
        },
      },
    ],
  },

  generator: {
    code: `def count_up():
    n = 1
    yield n
    n = 2
    yield n

g = count_up()
a = next(g)
b = next(g)`,
    steps: [
      {
        title: '<code>def count_up</code> creates a generator function',
        desc: 'Because the body contains <code>yield</code>, calling this function will <em>not</em> run the body. It will return a generator object.',
        lines: [1, 2, 3, 4, 5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'count_up', ref: 'countFn', pyId: ADDRS.countFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'countFn', pyId: ADDRS.countFn, type: 'function', value: 'count_up() [generator]', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['countFn'],
        },
      },
      {
        title: '<code>g = count_up()</code> — a suspended frame, not a result',
        desc: 'The generator object is created. The function body has not run yet. Think of <code>g</code> as a handle to a paused call that can be resumed.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'count_up', ref: 'countFn', pyId: ADDRS.countFn, type: 'function', state: 'normal' },
            { name: 'g', ref: 'genObj', pyId: ADDRS.genObj, type: 'generator', state: 'new' },
          ]}],
          heap: [
            { id: 'countFn', pyId: ADDRS.countFn, type: 'function', value: 'count_up() [generator]', refcount: 1, mutable: false, state: 'normal' },
            { id: 'genObj', pyId: ADDRS.genObj, type: 'generator', value: 'count_up suspended', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'state', value: 'created', type: 'str' },
              { key: 'n', value: '(not yet)', type: 'str' },
            ] },
          ],
          highlight: ['genObj'],
        },
      },
      {
        title: '<code>next(g)</code> runs until the first <code>yield</code>',
        desc: 'Now the body runs: <code>n = 1</code>, then <code>yield n</code>. The value <code>1</code> is handed to the caller. The frame does <strong>not</strong> disappear — it stays paused inside the generator, remembering <code>n</code>.',
        lines: [2, 3, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'count_up', ref: 'countFn', pyId: ADDRS.countFn, type: 'function', state: 'normal' },
            { name: 'g', ref: 'genObj', pyId: ADDRS.genObj, type: 'generator', state: 'normal' },
            { name: 'a', ref: 'int1', pyId: ADDRS.int1, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'countFn', pyId: ADDRS.countFn, type: 'function', value: 'count_up() [generator]', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: 2, mutable: false, state: 'new' },
            { id: 'genObj', pyId: ADDRS.genObj, type: 'generator', value: 'count_up suspended', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'state', value: 'suspended', type: 'str' },
              { key: 'n', value: 1, type: 'int' },
            ] },
          ],
          highlight: ['genObj', 'int1'],
        },
      },
      {
        title: 'Second <code>next(g)</code> resumes the same frame',
        desc: 'Execution continues after the first <code>yield</code>: <code>n = 2</code>, then yield again. Same generator object, updated local state. This is why generators can remember work without globals.',
        lines: [4, 5, 9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'count_up', ref: 'countFn', pyId: ADDRS.countFn, type: 'function', state: 'normal' },
            { name: 'g', ref: 'genObj', pyId: ADDRS.genObj, type: 'generator', state: 'normal' },
            { name: 'a', ref: 'int1', pyId: ADDRS.int1, type: 'int', state: 'normal' },
            { name: 'b', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'countFn', pyId: ADDRS.countFn, type: 'function', value: 'count_up() [generator]', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: 2, mutable: false, state: 'new' },
            { id: 'genObj', pyId: ADDRS.genObj, type: 'generator', value: 'count_up suspended', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'state', value: 'suspended', type: 'str' },
              { key: 'n', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['genObj', 'int2'],
        },
      },
    ],
  },

  lazy: {
    code: `eager = [x * x for x in [2, 3]]
lazy = (x * x for x in [2, 3])
first = next(lazy)`,
    steps: [
      {
        title: 'A list comprehension builds every value now',
        desc: '<code>eager</code> is a list object that already holds <code>4</code> and <code>9</code>. The work is done. Memory holds the full result.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'eager', ref: 'eagerList', pyId: ADDRS.eagerList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'new' },
            { id: 'int9', pyId: ADDRS.int9, type: 'int', value: 9, refcount: 1, mutable: false, state: 'new' },
            { id: 'eagerList', pyId: ADDRS.eagerList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 4, type: 'int' },
              { value: 9, type: 'int' },
            ] },
          ],
          highlight: ['eagerList'],
        },
      },
      {
        title: 'A generator expression stores the recipe, not the answers',
        desc: '<code>lazy</code> is a generator. The squares have not been computed yet. That is lazy evaluation: pay for a value only when someone asks.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'eager', ref: 'eagerList', pyId: ADDRS.eagerList, type: 'list', state: 'normal' },
            { name: 'lazy', ref: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', state: 'new' },
          ]}],
          heap: [
            { id: 'eagerList', pyId: ADDRS.eagerList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 4, type: 'int' },
              { value: 9, type: 'int' },
            ] },
            { id: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', value: '(x * x for x in ...)', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'state', value: 'created', type: 'str' },
              { key: 'pending', value: '2, 3', type: 'str' },
            ] },
          ],
          highlight: ['lazyGen'],
        },
      },
      {
        title: '<code>next(lazy)</code> computes only the first square',
        desc: '<code>first</code> is <code>4</code>. The second square still does not exist as a heap object from this generator. The list <code>eager</code> already paid for both. Choose eager when you need random access; choose lazy when you need one-at-a-time.',
        lines: [3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'eager', ref: 'eagerList', pyId: ADDRS.eagerList, type: 'list', state: 'normal' },
            { name: 'lazy', ref: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', state: 'normal' },
            { name: 'first', ref: 'int4b', pyId: ADDRS.int4, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'eagerList', pyId: ADDRS.eagerList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 4, type: 'int' },
              { value: 9, type: 'int' },
            ] },
            { id: 'int4b', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'new' },
            { id: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', value: '(x * x for x in ...)', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'state', value: 'suspended', type: 'str' },
              { key: 'pending', value: '3', type: 'str' },
            ] },
          ],
          highlight: ['int4b', 'lazyGen'],
        },
      },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '05-iterators',
    demos: DEMOS,
    defaultDemo: 'forLoop',
    defaultSpeed: 950,
  });
});
