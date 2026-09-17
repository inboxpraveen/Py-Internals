/* ============================================================
   SESSION 03: Lists, Dicts & References
   Demos: list aliases, shallow copies, function mutation, dict references
   ============================================================ */

'use strict';

const ADDRS = {
  numsList:      '0x7f530010',

  originalList:  '0x7f531100',
  shallowList:   '0x7f5312a0',
  rowOne:        '0x7f532010',
  rowTwo:        '0x7f5320c0',
  rowThree:      '0x7f532180',

  addScoreFn:    '0x7f540010',
  bookDict:      '0x7f550010',
  mathList:      '0x7f560010',
  newBookDict:   '0x7f5501a0',
  newMathList:   '0x7f5601a0',

  profileDict:   '0x7f570010',
  skillsList:    '0x7f580010',

  deepOuter:     '0x7f5a0010',
  deepInner:     '0x7f5a1010',
  shallowOuter:  '0x7f5a2010',
  deepCopyOuter: '0x7f5a3010',
  deepCopyInner: '0x7f5a4010',
};

const EMPTY_MEMORY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {
  listAlias: {
    watch: 'Both names show the same list address. Mutation through one is visible through the other.',
    code: `nums = [10, 20]
same = nums

nums.append(30)
same[0] = 99

print(nums)
print(nums is same)`,
    steps: [
      {
        title: 'Initial state: no names, no list yet',
        desc: 'This demo is about one question: when two names point to one list, what changes when the list is edited?',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>nums = [10, 20]</code> creates one mutable list object',
        desc: 'Python creates a list object on the heap and binds the global name <code>nums</code> to it. The list object owns slots for its elements. At the Python level, think of each slot as holding a reference to an element object.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'numsList', pyId: ADDRS.numsList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ]},
          ],
          highlight: ['numsList'],
        },
      },
      {
        title: '<code>same = nums</code> adds another name, not another list',
        desc: 'Assignment copies the reference. It doesn\'t duplicate the list. Now <code>nums</code> and <code>same</code> point to the same heap object, so the list\'s refcount rises to 2.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'normal' },
            { name: 'same', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'numsList', pyId: ADDRS.numsList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
            ]},
          ],
          highlight: ['numsList'],
        },
      },
      {
        title: '<code>nums.append(30)</code> mutates the shared object',
        desc: '<code>append</code> changes the existing list in place. The list\'s address stays <code>0x7f530010</code>, and because both names point there, both names see the new element.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'normal' },
            { name: 'same', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'numsList', pyId: ADDRS.numsList, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 10, type: 'int' },
              { value: 20, type: 'int' },
              { value: 30, type: 'int' },
            ]},
          ],
          highlight: ['numsList'],
        },
      },
      {
        title: '<code>same[0] = 99</code> mutates through the other name',
        desc: 'Index assignment changes a slot inside the same list object. It doesn\'t matter which name you used for the mutation. <code>same</code> and <code>nums</code> are two paths to one object.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'normal' },
            { name: 'same', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'numsList', pyId: ADDRS.numsList, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 99, type: 'int' },
              { value: 20, type: 'int' },
              { value: 30, type: 'int' },
            ]},
          ],
          highlight: ['numsList'],
        },
      },
      {
        title: '<code>nums is same</code> is <code>True</code>',
        desc: 'The final print shows <code>[99, 20, 30]</code>, and the identity check confirms the picture: one list object, two names, and every mutation visible through both.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'nums', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'normal' },
            { name: 'same', ref: 'numsList', pyId: ADDRS.numsList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'numsList', pyId: ADDRS.numsList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 99, type: 'int' },
              { value: 20, type: 'int' },
              { value: 30, type: 'int' },
            ]},
          ],
          highlight: ['numsList'],
        },
      },
    ],
  },

  shallowCopy: {
    watch: 'The outer list is new. The nested objects keep the same address, and that is what "shallow" means.',
    code: `original = [[1], [2]]
shallow = original.copy()

shallow.append([3])
shallow[0].append(99)

print(original)
print(shallow)`,
    steps: [
      {
        title: 'Initial state: a shallow copy goes one level deep',
        desc: 'A shallow copy creates a new outer container but keeps references to the same inner objects. That one sentence explains most nested-list surprises.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>original = [[1], [2]]</code> creates an outer list and two inner lists',
        desc: 'The outer list has two slots. Each slot points to an inner list object. In the diagram, the outer list cells show labels for those inner-list references.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 1, mutable: true, state: 'new', items: [{ value: 1, type: 'int' }] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 1, mutable: true, state: 'new', items: [{ value: 2, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
            ]},
          ],
          highlight: ['originalList', 'rowOne', 'rowTwo'],
        },
      },
      {
        title: '<code>shallow = original.copy()</code> creates a new outer list',
        desc: '<code>shallow</code> points to a different outer list object. But the inner references are reused, so both outer lists still point to the same two inner lists.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowList', pyId: ADDRS.shallowList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 1, type: 'int' }] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
            ]},
            { id: 'shallowList', pyId: ADDRS.shallowList, type: 'list', refcount: 1, mutable: true, state:'new', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
            ]},
          ],
          highlight: ['shallowList', 'rowOne', 'rowTwo'],
        },
      },
      {
        title: '<code>shallow.append([3])</code> changes only the copied outer list',
        desc: 'Appending to <code>shallow</code> mutates the new outer list. The original outer list is separate, so it does not grow a third slot.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowList', pyId: ADDRS.shallowList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 1, type: 'int' }] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'rowThree', pyId: ADDRS.rowThree, type: 'list', refcount: 1, mutable: true, state: 'new', items: [{ value: 3, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
            ]},
            { id: 'shallowList', pyId: ADDRS.shallowList, type: 'list', refcount: 1, mutable: true, state:'mutated', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
              { value: 'rowThree -> 0x7f532180', type: 'ref' },
            ]},
          ],
          highlight: ['shallowList', 'rowThree'],
        },
      },
      {
        title: '<code>shallow[0].append(99)</code> changes a shared inner list',
        desc: 'This time Python follows <code>shallow[0]</code> to the inner list shared with <code>original[0]</code>. That inner object mutates, so both outer lists now show <code>[1, 99]</code> in their first slot.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowList', pyId: ADDRS.shallowList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 1, type: 'int' },
              { value: 99, type: 'int' },
            ] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'rowThree', pyId: ADDRS.rowThree, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [{ value: 3, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
            ]},
            { id: 'shallowList', pyId: ADDRS.shallowList, type: 'list', refcount: 1, mutable: true, state:'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
              { value: 'rowThree -> 0x7f532180', type: 'ref' },
            ]},
          ],
          highlight: ['rowOne', 'originalList', 'shallowList'],
        },
      },
      {
        title: 'Summary: a shallow copy separates the container, not the contents',
        desc: '<code>original</code> prints as <code>[[1, 99], [2]]</code> and <code>shallow</code> as <code>[[1, 99], [2], [3]]</code>. Two outer lists, one shared inner list. When you really need independent nested objects, use the <code>copy</code> module: <code>copy.deepcopy(original)</code>. Demo 5 walks through it.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowList', pyId: ADDRS.shallowList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 99, type: 'int' },
            ] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'rowThree', pyId: ADDRS.rowThree, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [{ value: 3, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
            ]},
            { id: 'shallowList', pyId: ADDRS.shallowList, type: 'list', refcount: 1, mutable: true, state:'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'ref' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'ref' },
              { value: 'rowThree -> 0x7f532180', type: 'ref' },
            ]},
          ],
          highlight: ['rowOne'],
        },
      },
    ],
  },

  functionDict: {
    watch: 'Mutation through the parameter is visible to the caller. Rebinding the parameter is not.',
    code: `def add_score(scores):
    scores["math"].append(95)
    scores = {"math": []}
    return scores

book = {"math": []}
new_book = add_score(book)

print(book)
print(new_book)`,
    steps: [
      {
        title: 'Initial state: arguments bind names to objects',
        desc: 'This demo joins Session 02 up with containers. Passing a dict to a function binds the parameter name to the same dict object the caller passed.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>def add_score(scores)</code> creates the function object',
        desc: 'The function body is stored for later. Nothing inside the body runs until <code>add_score(book)</code> is called.',
        lines: [1, 2, 3, 4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_score', ref: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', state: 'new' },
          ]}],
          heap: [
            { id: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', value: 'add_score(scores)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['addScoreFn'],
        },
      },
      {
        title: '<code>book = {"math": []}</code> creates a dict containing a list',
        desc: 'The dict maps key <code>"math"</code> to a list object. The dict is mutable, and the list stored as its value is mutable too.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_score', ref: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', state: 'normal' },
            { name: 'book', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'new' },
          ]}],
          heap: [
            { id: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', value: 'add_score(scores)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mathList', pyId: ADDRS.mathList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [] },
            { id: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'math', value: 'list -> 0x7f560010', type: 'ref' },
            ]},
          ],
          highlight: ['bookDict', 'mathList'],
        },
      },
      {
        title: '<code>add_score(book)</code> creates a frame, and <code>scores</code> points at <code>book</code>',
        desc: 'No dictionary is copied. The global name <code>book</code> and the local parameter <code>scores</code> point to the same dict object.',
        lines: [7],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_score', ref: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', state: 'normal' },
              { name: 'book', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'normal' },
            ]},
            { name: 'add_score(scores)', vars: [
              { name: 'scores', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', value: 'add_score(scores)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mathList', pyId: ADDRS.mathList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [] },
            { id: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f560010', type: 'ref' },
            ]},
          ],
          highlight: ['bookDict'],
        },
      },
      {
        title: '<code>scores["math"].append(95)</code> mutates the caller-visible list',
        desc: 'Python looks up <code>"math"</code>, finds the list object, then appends to that list. The list sits inside the same dict object <code>book</code> uses, so the caller will see the score.',
        lines: [2],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_score', ref: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', state: 'normal' },
              { name: 'book', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'normal' },
            ]},
            { name: 'add_score(scores)', vars: [
              { name: 'scores', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', value: 'add_score(scores)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mathList', pyId: ADDRS.mathList, type: 'list', refcount: 1, mutable: true, state: 'mutated', items: [{ value: 95, type: 'int' }] },
            { id: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f560010', type: 'ref' },
            ]},
          ],
          highlight: ['mathList', 'bookDict'],
        },
      },
      {
        title: '<code>scores = {"math": []}</code> rebinds only the local name',
        desc: 'This line doesn\'t replace <code>book</code>. It makes the local name <code>scores</code> point to a new dict. The original <code>book</code> still points to the old dict, which now contains <code>[95]</code>.',
        lines: [3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'add_score', ref: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', state: 'normal' },
              { name: 'book', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'normal' },
            ]},
            { name: 'add_score(scores)', vars: [
              { name: 'scores', ref: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', state: 'rebound' },
            ]},
          ],
          heap: [
            { id: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', value: 'add_score(scores)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mathList', pyId: ADDRS.mathList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [{ value: 95, type: 'int' }] },
            { id: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f560010', type: 'ref' },
            ]},
            { id: 'newMathList', pyId: ADDRS.newMathList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [] },
            { id: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'math', value: 'list -> 0x7f5601a0', type: 'ref' },
            ]},
          ],
          highlight: ['newBookDict', 'bookDict'],
        },
      },
      {
        title: '<code>return scores</code> hands back the new dict',
        desc: 'The frame is gone, and the local name <code>scores</code> is gone with it. What travelled out is the object it pointed to at return time: the new, empty dict, which the caller now calls <code>new_book</code>.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_score', ref: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', state: 'normal' },
            { name: 'book', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'normal' },
            { name: 'new_book', ref: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', state: 'new' },
          ]}],
          heap: [
            { id: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', value: 'add_score(scores)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mathList', pyId: ADDRS.mathList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [{ value: 95, type: 'int' }] },
            { id: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f560010', type: 'ref' },
            ]},
            { id: 'newMathList', pyId: ADDRS.newMathList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [] },
            { id: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f5601a0', type: 'ref' },
            ]},
          ],
          highlight: ['newBookDict'],
        },
      },
      {
        title: 'Summary: the mutation travelled, the rebinding did not',
        desc: 'Two dicts, two outcomes. <code>print(book)</code> shows <code>{\'math\': [95]}</code> because the append changed the object the caller still holds. <code>print(new_book)</code> shows <code>{\'math\': []}</code> because <code>scores = {...}</code> only moved a local name onto a brand-new dict.',
        lines: [9, 10],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'add_score', ref: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', state: 'normal' },
            { name: 'book', ref: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', state: 'normal' },
            { name: 'new_book', ref: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', state: 'normal' },
          ]}],
          heap: [
            { id: 'addScoreFn', pyId: ADDRS.addScoreFn, type: 'function', value: 'add_score(scores)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'mathList', pyId: ADDRS.mathList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [{ value: 95, type: 'int' }] },
            { id: 'bookDict', pyId: ADDRS.bookDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f560010', type: 'ref' },
            ]},
            { id: 'newMathList', pyId: ADDRS.newMathList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [] },
            { id: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f5601a0', type: 'ref' },
            ]},
          ],
          highlight: ['bookDict', 'newBookDict'],
        },
      },
    ],
  },

  dictAlias: {
    watch: 'A dict value can be a list. That list is still one object, reachable from every alias.',
    code: `profile = {"name": "Ada", "skills": ["Python"]}
alias = profile

profile["skills"].append("debugging")
alias["city"] = "London"

print(profile)
print(alias is profile)`,
    steps: [
      {
        title: 'Initial state: a dict is a mutable container of references',
        desc: 'A dictionary stores key-value pairs. At the Python level the keys and values are objects, and the dict keeps references to them.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>profile = {...}</code> creates a dict with a nested list value',
        desc: 'The dict object points from key <code>"name"</code> to a string and from key <code>"skills"</code> to a list object. The list can be mutated separately from the dict itself.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'new' },
          ]}],
          heap: [
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'Python', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'ref' },
            ]},
          ],
          highlight: ['profileDict', 'skillsList'],
        },
      },
      {
        title: '<code>alias = profile</code> shares the dict',
        desc: 'Like lists, dictionaries aren\'t copied by assignment. <code>alias</code> becomes a second name for the same dict object.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'new' },
          ]}],
          heap: [
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Python', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'ref' },
            ]},
          ],
          highlight: ['profileDict'],
        },
      },
      {
        title: '<code>profile["skills"].append("debugging")</code> mutates the nested list',
        desc: 'Python first fetches the list stored under <code>"skills"</code>, then mutates it. The dict still points to the same list object, but the list\'s contents have changed.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
          ]}],
          heap: [
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'mutated', items: [
              { value: 'Python', type: 'str' },
              { value: 'debugging', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'ref' },
            ]},
          ],
          highlight: ['skillsList', 'profileDict'],
        },
      },
      {
        title: '<code>alias["city"] = "London"</code> mutates the shared dict',
        desc: 'Adding a key-value pair changes the dict object itself. <code>alias</code> and <code>profile</code> are the same dict, so both names see the new <code>"city"</code> key.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
          ]}],
          heap: [
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Python', type: 'str' },
              { value: 'debugging', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'mutated', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'ref' },
              { key: 'city', value: 'London', type: 'str' },
            ]},
          ],
          highlight: ['profileDict'],
        },
      },
      {
        title: '<code>alias is profile</code> is <code>True</code>',
        desc: 'The final state confirms the rule: a dictionary mutation through any alias updates the one shared dictionary. To avoid sharing, make a copy on purpose, and remember that <code>dict.copy()</code> is shallow.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
          ]}],
          heap: [
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Python', type: 'str' },
              { value: 'debugging', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'ref' },
              { key: 'city', value: 'London', type: 'str' },
            ]},
          ],
          highlight: ['profileDict', 'skillsList'],
        },
      },
    ],
  },

  deepCopy: {
    watch: 'The nested objects get new addresses. Independence costs a full walk of the tree.',
    code: `import copy
original = [[1]]
shallow = original.copy()
deep = copy.deepcopy(original)
original[0].append(2)

print(original, shallow, deep)`,
    steps: [
      {
        title: 'Initial state: nothing allocated yet',
        desc: 'One question drives this demo: which of the three names survives a change to the original? Nothing exists yet, so we start from an empty namespace and an empty heap.',
        lines: [],
        memory: EMPTY_MEMORY,
      },
      {
        title: '<code>original = [[1]]</code> creates two list objects, not one',
        desc: 'Line 1 pulls in the standard-library <code>copy</code> module for later. Line 2 builds the data: an outer list whose single slot points at an inner list. Two containers, two addresses, and that is the whole reason copying has a depth at all.',
        lines: [1, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'deepInner', pyId: ADDRS.deepInner, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
          ],
          highlight: ['deepOuter', 'deepInner'],
        },
      },
      {
        title: '<code>original.copy()</code> shares the inner list',
        desc: 'A new outer list appears. Its slot still points at the same inner list. This is the shallow-copy rule from demo 2, and the inner list\'s refcount rising to 2 is the proof.',
        lines: [3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'deepInner', pyId: ADDRS.deepInner, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
            { id: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
          ],
          highlight: ['shallowOuter', 'deepInner'],
        },
      },
      {
        title: '<code>copy.deepcopy</code> clones the inner list too',
        desc: '<code>deep</code> is a new outer list whose slot points at a <em>new</em> inner list holding the same value. Deepcopy walked the whole tree instead of stopping at the first level, so no nested object is shared any more.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', state: 'normal' },
            { name: 'deep', ref: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'deepInner', pyId: ADDRS.deepInner, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'deepCopyInner', pyId: ADDRS.deepCopyInner, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
            { id: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
            { id: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'inner -> 0x7f5a4010', type: 'ref' },
            ] },
          ],
          highlight: ['deepCopyOuter', 'deepCopyInner'],
        },
      },
      {
        title: 'Mutating the original inner list leaves <code>deep</code> alone',
        desc: '<code>original[0].append(2)</code> changes the shared inner list at <code>0x7f5a1010</code>, so <code>shallow</code> sees the <code>2</code> as well. It was pointing there all along. <code>deep</code> still holds <code>[1]</code>, because its inner list is a different object at <code>0x7f5a4010</code>.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', state: 'normal' },
            { name: 'deep', ref: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'deepInner', pyId: ADDRS.deepInner, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ] },
            { id: 'deepCopyInner', pyId: ADDRS.deepCopyInner, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
            { id: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
            { id: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a4010', type: 'ref' },
            ] },
          ],
          highlight: ['deepInner', 'deepCopyInner'],
        },
      },
      {
        title: 'Summary: only the deep copy is independent',
        desc: 'The print gives <code>[[1, 2]] [[1, 2]] [[1]]</code>. Three outer lists but only two inner lists: <code>original</code> and <code>shallow</code> still share one, and <code>deep</code> owns its own. How deep a copy goes is a choice, and this line is where you find out which one you made.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', state: 'normal' },
            { name: 'shallow', ref: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', state: 'normal' },
            { name: 'deep', ref: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'deepInner', pyId: ADDRS.deepInner, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ] },
            { id: 'deepCopyInner', pyId: ADDRS.deepCopyInner, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'deepOuter', pyId: ADDRS.deepOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
            { id: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'ref' },
            ] },
            { id: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a4010', type: 'ref' },
            ] },
          ],
          highlight: ['deepInner', 'deepCopyInner'],
        },
      },
    ],
  },
};


/* Boot */
document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '03-lists-dicts',
    demos: DEMOS,
    defaultDemo: 'listAlias',
    defaultSpeed: 950,
  });
});
