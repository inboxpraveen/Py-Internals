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
  int400:    '0x7f880020',
  int900:    '0x7f880040',
  lazyFirst: '0x7f880060',
};

/* Cached small ints (-5..256) are pre-created by CPython and never freed.
   Drawn with an infinite refcount, exactly as Sessions 01 and 02 draw them. */
const CACHED_INT_NOTE = 'cached small int — CPython pre-creates −5 to 256 and never frees them';

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {
  forLoop: {
    watch: 'A second object appears — the iterator — with a cursor. The list stays put.',
    code: `nums = [10, 20]
for n in nums:
    print(n)`,
    steps: [
      {
        title: 'Initial state — nothing to loop over yet',
        desc: 'A <code>for</code> loop will need two objects: the collection, and a separate iterator that remembers position.',
        lines: [],
        memory: EMPTY,
      },
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
              { key: 'over', value: 'list -> 0x7f810010', type: 'ref' },
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
            { id: 'int10', pyId: ADDRS.int10, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal', note: CACHED_INT_NOTE },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'listIt', pyId: ADDRS.listIt, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'ref' },
              { key: 'index', value: 1, type: 'int' },
            ] },
          ],
          highlight: ['int10', 'listIt'],
        },
      },
      {
        title: 'Second <code>next()</code> rebinds <code>n</code> to <code>20</code>',
        desc: '<code>n</code> is rebound — same name, different object. The list still holds both values, so <code>10</code> is still very much alive. The iterator now sits past the last item.',
        lines: [2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'n', ref: 'int20', pyId: ADDRS.int20, type: 'int', state: 'rebound' },
          ]}],
          heap: [
            { id: 'int10', pyId: ADDRS.int10, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int20', pyId: ADDRS.int20, type: 'int', value: 20, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'listIt', pyId: ADDRS.listIt, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'ref' },
              { key: 'index', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['int20', 'listIt'],
        },
      },
      {
        title: '<code>StopIteration</code> ends the loop',
        desc: 'The next <code>next()</code> raises <code>StopIteration</code>. The <code>for</code> loop catches it and stops, and the iterator — which nothing else named — is freed. Look at what survived: the list, both of its values, and <code>n</code>. Only the bookmark was thrown away. A second <code>for nums</code> would simply make a new one.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'n', ref: 'int20', pyId: ADDRS.int20, type: 'int', state: 'normal' },
          ]}],
          heap: [
            { id: 'int10', pyId: ADDRS.int10, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int20', pyId: ADDRS.int20, type: 'int', value: 20, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'listIt', pyId: ADDRS.listIt, type: 'iterator', value: 'list_iterator (exhausted)', refcount: 0, mutable: true, state: 'gc', pairs: [
              { key: 'over', value: '(link dropped)', type: 'str' },
              { key: 'index', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['listIt'],
        },
      },
    ],
  },

  explicit: {
    watch: 'You hold the iterator. <code>next()</code> only moves that cursor. The list does not walk itself.',
    code: `nums = [10, 20]
it = iter(nums)
a = next(it)
b = next(it)
next(it)          # raises StopIteration`,
    steps: [
      {
        title: 'Initial state — the protocol is not running yet',
        desc: 'This demo writes out what <code>for</code> hides: ask for a bookmark, ask for a value, ask again, and finally hear "there is nothing left."',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'One object so far — the list, and nothing walking it',
        desc: 'This is the moment <code>for</code> never lets you see. There is a collection on the heap and no cursor anywhere. Nothing in this picture knows about "position" yet.',
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
        title: '<code>it = iter(nums)</code> — the bookmark appears',
        desc: 'A second object, at its own address. It does not hold copies of the values: it holds a link back to the list (<code>over</code>) plus an <code>index</code>. That link is a reference, so the list’s refcount goes up by one.',
        lines: [2],
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
              { key: 'over', value: 'list -> 0x7f810010', type: 'ref' },
              { key: 'index', value: 0, type: 'int' },
            ] },
          ],
          highlight: ['itObj'],
        },
      },
      {
        title: '<code>a = next(it)</code> — one step, one object',
        desc: '<code>next</code> returns the current item and advances the cursor. <code>a</code> is just a name bound to <code>10</code>; it has no memory of where it came from. The iterator is the thing with state.',
        lines: [3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'it', ref: 'itObj', pyId: ADDRS.itObj, type: 'iterator', state: 'normal' },
            { name: 'a', ref: 'aVal', pyId: ADDRS.aVal, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'aVal', pyId: ADDRS.aVal, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal', note: CACHED_INT_NOTE },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'itObj', pyId: ADDRS.itObj, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'ref' },
              { key: 'index', value: 1, type: 'int' },
            ] },
          ],
          highlight: ['aVal', 'itObj'],
        },
      },
      {
        title: '<code>b = next(it)</code> — the same iterator, further along',
        desc: 'Two names, two values, one shared cursor. Nothing was copied and nothing was consumed out of the list — the only thing that changed in the whole picture is the number in <code>index</code>.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'it', ref: 'itObj', pyId: ADDRS.itObj, type: 'iterator', state: 'normal' },
            { name: 'a', ref: 'aVal', pyId: ADDRS.aVal, type: 'int', state: 'normal' },
            { name: 'b', ref: 'bVal', pyId: ADDRS.bVal, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'aVal', pyId: ADDRS.aVal, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'bVal', pyId: ADDRS.bVal, type: 'int', value: 20, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'itObj', pyId: ADDRS.itObj, type: 'iterator', value: 'list_iterator', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'over', value: 'list -> 0x7f810010', type: 'ref' },
              { key: 'index', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['bVal', 'itObj'],
        },
      },
      {
        title: 'The third <code>next(it)</code> raises <code>StopIteration</code>',
        desc: 'The cursor is past the end, so the iterator says "nothing left" the only way it can — by raising. That is the exact signal a <code>for</code> loop catches quietly for you. CPython even drops the iterator’s link to the list at this point, which is why <code>nums</code> is back down to one reference. Final tally: the list and both values survived, <code>it</code> is spent and will never rewind, and <code>iter(nums)</code> would hand you a brand-new bookmark at <code>index 0</code>.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'nums', pyId: ADDRS.nums, type: 'list', state: 'normal' },
            { name: 'it', ref: 'itObj', pyId: ADDRS.itObj, type: 'iterator', state: 'normal' },
            { name: 'a', ref: 'aVal', pyId: ADDRS.aVal, type: 'int', state: 'normal' },
            { name: 'b', ref: 'bVal', pyId: ADDRS.bVal, type: 'int', state: 'normal' },
          ]}],
          heap: [
            { id: 'aVal', pyId: ADDRS.aVal, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'bVal', pyId: ADDRS.bVal, type: 'int', value: 20, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'nums', pyId: ADDRS.nums, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ] },
            { id: 'itObj', pyId: ADDRS.itObj, type: 'iterator', value: 'list_iterator (exhausted)', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'over', value: '(link dropped)', type: 'str' },
              { key: 'index', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['itObj', 'nums'],
        },
      },
    ],
  },

  generator: {
    watch: 'The frame sleeps inside the generator. Local <code>n</code> survives between <code>next</code> calls — until the generator runs out.',
    code: `def count_up():
    n = 1
    yield n
    n = 2
    yield n

g = count_up()
a = next(g)
b = next(g)
next(g)           # raises StopIteration`,
    steps: [
      {
        title: 'Initial state — no generator yet',
        desc: 'A function that contains <code>yield</code> is special: calling it will return a generator object instead of running the body.',
        lines: [],
        memory: EMPTY,
      },
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
        title: '<code>g = count_up()</code> — a paused call, not a result',
        desc: 'The generator object exists, but not one line of the body has run. Python calls this state <code>GEN_CREATED</code>. There is no <code>n</code> yet — the frame has not even been started.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'count_up', ref: 'countFn', pyId: ADDRS.countFn, type: 'function', state: 'normal' },
            { name: 'g', ref: 'genObj', pyId: ADDRS.genObj, type: 'generator', state: 'new' },
          ]}],
          heap: [
            { id: 'countFn', pyId: ADDRS.countFn, type: 'function', value: 'count_up() [generator]', refcount: 1, mutable: false, state: 'normal' },
            { id: 'genObj', pyId: ADDRS.genObj, type: 'generator', value: 'count_up (not started)', refcount: 1, mutable: true, state: 'new', pairs: [
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
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: '∞', mutable: false, state: 'normal', note: CACHED_INT_NOTE },
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
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'genObj', pyId: ADDRS.genObj, type: 'generator', value: 'count_up suspended', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'state', value: 'suspended', type: 'str' },
              { key: 'n', value: 2, type: 'int' },
            ] },
          ],
          highlight: ['genObj', 'int2'],
        },
      },
      {
        title: 'The third <code>next(g)</code> — the generator runs out',
        desc: 'There is no code after the second <code>yield</code>, so the generator raises <code>StopIteration</code> and drops its frame. <code>n</code> goes with it; the state row now reads <code>closed</code>. This is the difference the whole session builds to: a second <code>for nums</code> gets a <em>fresh</em> bookmark, because a list is not its own bookmark. A generator <strong>is</strong> its own bookmark, so looping over <code>g</code> again yields nothing at all. Notice that <code>g</code> itself is still here — it is not gone, it is empty.',
        lines: [10],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'count_up', ref: 'countFn', pyId: ADDRS.countFn, type: 'function', state: 'normal' },
            { name: 'g', ref: 'genObj', pyId: ADDRS.genObj, type: 'generator', state: 'normal' },
            { name: 'a', ref: 'int1', pyId: ADDRS.int1, type: 'int', state: 'normal' },
            { name: 'b', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
          ]}],
          heap: [
            { id: 'countFn', pyId: ADDRS.countFn, type: 'function', value: 'count_up() [generator]', refcount: 1, mutable: false, state: 'normal' },
            { id: 'int1', pyId: ADDRS.int1, type: 'int', value: 1, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int2', pyId: ADDRS.int2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'genObj', pyId: ADDRS.genObj, type: 'generator', value: 'count_up (exhausted)', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'state', value: 'closed', type: 'str' },
              { key: 'n', value: '(frame gone)', type: 'str' },
            ] },
          ],
          highlight: ['genObj', 'int2'],
        },
      },
    ],
  },

  lazy: {
    watch: 'The list holds both squares before anyone asks. The generator computes one only when you call <code>next</code> — at a brand-new address.',
    code: `eager = [x * x for x in [20, 30]]
lazy = (x * x for x in [20, 30])
first = next(lazy)`,
    steps: [
      {
        title: 'Initial state — two recipes, two different heap costs',
        desc: 'Eager evaluation pays for every result up front. Lazy evaluation pays per <code>next</code>. Same squares, very different bills.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'A list comprehension builds every value now',
        desc: 'Line 1 computed <code>400</code> and <code>900</code> and put both on the heap, each in its own box. <code>eager</code> is a list of references to them. The work is finished before you have used a single result.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'eager', ref: 'eagerList', pyId: ADDRS.eagerList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'int400', pyId: ADDRS.int400, type: 'int', value: 400, refcount: 1, mutable: false, state: 'new' },
            { id: 'int900', pyId: ADDRS.int900, type: 'int', value: 900, refcount: 1, mutable: false, state: 'new' },
            { id: 'eagerList', pyId: ADDRS.eagerList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: '400 -> 0x7f880020', type: 'ref' },
              { value: '900 -> 0x7f880040', type: 'ref' },
            ] },
          ],
          highlight: ['eagerList', 'int400', 'int900'],
        },
      },
      {
        title: 'A generator expression stores the recipe, not the answers',
        desc: 'One new box appears, and it is not a number. <code>lazy</code> is a generator holding the plan and the inputs it has not reached yet. No multiplication has happened. That is lazy evaluation: pay for a value only when someone asks.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'eager', ref: 'eagerList', pyId: ADDRS.eagerList, type: 'list', state: 'normal' },
            { name: 'lazy', ref: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', state: 'new' },
          ]}],
          heap: [
            { id: 'int400', pyId: ADDRS.int400, type: 'int', value: 400, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int900', pyId: ADDRS.int900, type: 'int', value: 900, refcount: 1, mutable: false, state: 'normal' },
            { id: 'eagerList', pyId: ADDRS.eagerList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: '400 -> 0x7f880020', type: 'ref' },
              { value: '900 -> 0x7f880040', type: 'ref' },
            ] },
            { id: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', value: '(x * x for x in ...)', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'state', value: 'created', type: 'str' },
              { key: 'pending', value: '20, 30', type: 'str' },
            ] },
          ],
          highlight: ['lazyGen'],
        },
      },
      {
        title: '<code>next(lazy)</code> computes only the first square',
        desc: '<code>first</code> is <code>400</code> — and look at the address. It is <strong>not</strong> the <code>400</code> already sitting in <code>eager</code>; the generator just multiplied and allocated a fresh object. Try it in a REPL: <code>first == eager[0]</code> is <code>True</code>, but <code>first is eager[0]</code> is <code>False</code>. And <code>900</code> from this generator still does not exist — it is one item still marked <code>pending</code>.',
        lines: [3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'eager', ref: 'eagerList', pyId: ADDRS.eagerList, type: 'list', state: 'normal' },
            { name: 'lazy', ref: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', state: 'normal' },
            { name: 'first', ref: 'lazyFirst', pyId: ADDRS.lazyFirst, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'int400', pyId: ADDRS.int400, type: 'int', value: 400, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int900', pyId: ADDRS.int900, type: 'int', value: 900, refcount: 1, mutable: false, state: 'normal' },
            { id: 'eagerList', pyId: ADDRS.eagerList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: '400 -> 0x7f880020', type: 'ref' },
              { value: '900 -> 0x7f880040', type: 'ref' },
            ] },
            { id: 'lazyFirst', pyId: ADDRS.lazyFirst, type: 'int', value: 400, refcount: 1, mutable: false, state: 'new' },
            { id: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', value: '(x * x for x in ...)', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'state', value: 'suspended', type: 'str' },
              { key: 'pending', value: '30', type: 'str' },
            ] },
          ],
          highlight: ['lazyFirst', 'lazyGen'],
        },
      },
      {
        title: 'Same picture, two bills — this is the whole trade',
        desc: 'Nothing new happens here; just read the heap. The list paid for every square on line 1 and will keep paying storage for all of them. The generator paid for exactly one and is holding one plan. At two items that is a rounding error — at a million, <code>[x * x for x in range(1_000_000)]</code> is about 8.4&nbsp;MB of slots plus a million int objects, while the generator expression is 200 bytes no matter how long the run gets. Eager buys you <code>len()</code>, indexing, and a second loop. Lazy buys you the freedom to stop early.',
        lines: [1, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'eager', ref: 'eagerList', pyId: ADDRS.eagerList, type: 'list', state: 'normal' },
            { name: 'lazy', ref: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', state: 'normal' },
            { name: 'first', ref: 'lazyFirst', pyId: ADDRS.lazyFirst, type: 'int', state: 'normal' },
          ]}],
          heap: [
            { id: 'int400', pyId: ADDRS.int400, type: 'int', value: 400, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int900', pyId: ADDRS.int900, type: 'int', value: 900, refcount: 1, mutable: false, state: 'normal' },
            { id: 'eagerList', pyId: ADDRS.eagerList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: '400 -> 0x7f880020', type: 'ref' },
              { value: '900 -> 0x7f880040', type: 'ref' },
            ] },
            { id: 'lazyFirst', pyId: ADDRS.lazyFirst, type: 'int', value: 400, refcount: 1, mutable: false, state: 'normal' },
            { id: 'lazyGen', pyId: ADDRS.lazyGen, type: 'generator', value: '(x * x for x in ...)', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'state', value: 'suspended', type: 'str' },
              { key: 'pending', value: '30', type: 'str' },
            ] },
          ],
          highlight: ['eagerList', 'lazyGen'],
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
