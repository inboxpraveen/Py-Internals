/* ============================================================
   SESSION 03 - Lists, Dicts & References
   Demos: list aliases, shallow copies, function mutation, dict references
   ============================================================ */

'use strict';

const ADDRS = {
  numsList:      '0x7f530010',

  originalList:  '0x7f531100',
  copyList:      '0x7f5312a0',
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
  strAda:        '0x7f590010',

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
    code: `nums = [10, 20]
same = nums

nums.append(30)
same[0] = 99

print(nums)
print(nums is same)`,
    steps: [
      {
        title: 'Initial state - no names, no list yet',
        desc: 'This demo focuses on one question: when two names point to one list, what exactly changes when the list is edited?',
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
        desc: 'Assignment copies the reference. It does not duplicate the list. Now <code>nums</code> and <code>same</code> point to the exact same heap object, so the list refcount rises to 2.',
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
        desc: '<code>append</code> changes the existing list in-place. The list address stays <code>' + ADDRS.numsList + '</code>. Because both names point there, both names see the new element.',
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
        desc: 'Index assignment changes a slot inside the same list object. The name used for the mutation does not matter. <code>same</code> and <code>nums</code> are two paths to one object.',
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
        desc: 'The final print shows <code>[99, 20, 30]</code>, and identity comparison confirms the mental model: one list object, two names, all mutations visible through both names.',
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
    code: `original = [[1], [2]]
copy = original.copy()

copy.append([3])
copy[0].append(99)

print(original)
print(copy)`,
    steps: [
      {
        title: 'Initial state - shallow copy means one level only',
        desc: 'A shallow copy creates a new outer container, but it keeps references to the same inner objects. That single sentence explains many nested-list surprises.',
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
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
            ]},
          ],
          highlight: ['originalList', 'rowOne', 'rowTwo'],
        },
      },
      {
        title: '<code>copy = original.copy()</code> creates a new outer list',
        desc: '<code>copy</code> points to a different outer list object. But the inner references are reused, so both outer lists still point to the same two inner lists.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'copy', ref: 'copyList', pyId: ADDRS.copyList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 1, type: 'int' }] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
            ]},
            { id: 'copyList', pyId: ADDRS.copyList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
            ]},
          ],
          highlight: ['copyList', 'rowOne', 'rowTwo'],
        },
      },
      {
        title: '<code>copy.append([3])</code> changes only the copied outer list',
        desc: 'Appending to <code>copy</code> mutates the new outer list. The original outer list is separate, so it does not grow a third slot.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'copy', ref: 'copyList', pyId: ADDRS.copyList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 1, type: 'int' }] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'rowThree', pyId: ADDRS.rowThree, type: 'list', refcount: 1, mutable: true, state: 'new', items: [{ value: 3, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
            ]},
            { id: 'copyList', pyId: ADDRS.copyList, type: 'list', refcount: 1, mutable: true, state: 'mutated', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
              { value: 'rowThree -> 0x7f532180', type: 'str' },
            ]},
          ],
          highlight: ['copyList', 'rowThree'],
        },
      },
      {
        title: '<code>copy[0].append(99)</code> changes a shared inner list',
        desc: 'This time Python follows <code>copy[0]</code> to the inner list shared with <code>original[0]</code>. That inner object mutates, so both outer lists now show <code>[1, 99]</code> in their first slot.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'copy', ref: 'copyList', pyId: ADDRS.copyList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 1, type: 'int' },
              { value: 99, type: 'int' },
            ] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'rowThree', pyId: ADDRS.rowThree, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [{ value: 3, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
            ]},
            { id: 'copyList', pyId: ADDRS.copyList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
              { value: 'rowThree -> 0x7f532180', type: 'str' },
            ]},
          ],
          highlight: ['rowOne', 'originalList', 'copyList'],
        },
      },
      {
        title: 'Summary - shallow copies separate the container, not the contents',
        desc: '<code>original</code> and <code>copy</code> are different outer lists. Their shared inner list is still one object. Use <code>copy.deepcopy()</code> only when you truly need recursively independent nested objects.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'original', ref: 'originalList', pyId: ADDRS.originalList, type: 'list', state: 'normal' },
            { name: 'copy', ref: 'copyList', pyId: ADDRS.copyList, type: 'list', state: 'normal' },
          ]}],
          heap: [
            { id: 'rowOne', pyId: ADDRS.rowOne, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 99, type: 'int' },
            ] },
            { id: 'rowTwo', pyId: ADDRS.rowTwo, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [{ value: 2, type: 'int' }] },
            { id: 'rowThree', pyId: ADDRS.rowThree, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [{ value: 3, type: 'int' }] },
            { id: 'originalList', pyId: ADDRS.originalList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
            ]},
            { id: 'copyList', pyId: ADDRS.copyList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'rowOne -> 0x7f532010', type: 'str' },
              { value: 'rowTwo -> 0x7f5320c0', type: 'str' },
              { value: 'rowThree -> 0x7f532180', type: 'str' },
            ]},
          ],
          highlight: ['rowOne'],
        },
      },
    ],
  },

  functionDict: {
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
        title: 'Initial state - function arguments bind names to objects',
        desc: 'This demo combines session 2 with containers: passing a dict to a function binds the parameter name to the same dict object the caller passed.',
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
              { key: 'math', value: 'list -> 0x7f560010', type: 'str' },
            ]},
          ],
          highlight: ['bookDict', 'mathList'],
        },
      },
      {
        title: '<code>add_score(book)</code> creates a frame; <code>scores</code> points to <code>book</code>',
        desc: 'No dictionary is copied. Global name <code>book</code> and local parameter <code>scores</code> point to the same dict object.',
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
              { key: 'math', value: 'list -> 0x7f560010', type: 'str' },
            ]},
          ],
          highlight: ['bookDict'],
        },
      },
      {
        title: '<code>scores["math"].append(95)</code> mutates the caller-visible list',
        desc: 'Python looks up <code>"math"</code>, finds the list object, then appends to that list. Since the list is inside the same dict object <code>book</code> uses, the caller will see the score.',
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
              { key: 'math', value: 'list -> 0x7f560010', type: 'str' },
            ]},
          ],
          highlight: ['mathList', 'bookDict'],
        },
      },
      {
        title: '<code>scores = {"math": []}</code> rebinds only the local name',
        desc: 'This line does not replace <code>book</code>. It makes the local name <code>scores</code> point to a new dict. The original <code>book</code> still points to the old dict containing <code>[95]</code>.',
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
              { key: 'math', value: 'list -> 0x7f560010', type: 'str' },
            ]},
            { id: 'newMathList', pyId: ADDRS.newMathList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [] },
            { id: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'math', value: 'list -> 0x7f5601a0', type: 'str' },
            ]},
          ],
          highlight: ['newBookDict', 'bookDict'],
        },
      },
      {
        title: '<code>return scores</code> returns the new dict',
        desc: 'The returned object is whatever the local name <code>scores</code> points to at return time: the new empty dict. The earlier mutation to <code>book</code> remains.',
        lines: [4, 7, 9, 10],
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
              { key: 'math', value: 'list -> 0x7f560010', type: 'str' },
            ]},
            { id: 'newMathList', pyId: ADDRS.newMathList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [] },
            { id: 'newBookDict', pyId: ADDRS.newBookDict, type: 'dict', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'math', value: 'list -> 0x7f5601a0', type: 'str' },
            ]},
          ],
          highlight: ['bookDict', 'newBookDict'],
        },
      },
    ],
  },

  dictAlias: {
    code: `profile = {"name": "Ada", "skills": ["Python"]}
alias = profile

profile["skills"].append("debugging")
alias["city"] = "London"

print(profile)
print(alias is profile)`,
    steps: [
      {
        title: 'Initial state - dicts are mutable containers of references',
        desc: 'A dictionary stores key-value associations. At the Python level, keys and values are objects, and the dict keeps references to them.',
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
            { id: 'strAda', pyId: ADDRS.strAda, type: 'str', value: 'Ada', refcount: 1, mutable: false, state: 'new' },
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'Python', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'str' },
            ]},
          ],
          highlight: ['profileDict', 'skillsList'],
        },
      },
      {
        title: '<code>alias = profile</code> shares the dict',
        desc: 'Like lists, dictionaries are not copied by assignment. <code>alias</code> becomes a second name for the same dict object.',
        lines: [2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'new' },
          ]}],
          heap: [
            { id: 'strAda', pyId: ADDRS.strAda, type: 'str', value: 'Ada', refcount: 1, mutable: false, state: 'normal' },
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Python', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'str' },
            ]},
          ],
          highlight: ['profileDict'],
        },
      },
      {
        title: '<code>profile["skills"].append("debugging")</code> mutates the nested list',
        desc: 'Python first retrieves the list stored under <code>"skills"</code>, then mutates that list. The dict still points to the same list object, but the list contents changed.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
          ]}],
          heap: [
            { id: 'strAda', pyId: ADDRS.strAda, type: 'str', value: 'Ada', refcount: 1, mutable: false, state: 'normal' },
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'mutated', items: [
              { value: 'Python', type: 'str' },
              { value: 'debugging', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'str' },
            ]},
          ],
          highlight: ['skillsList', 'profileDict'],
        },
      },
      {
        title: '<code>alias["city"] = "London"</code> mutates the shared dict',
        desc: 'Adding a key-value pair changes the dict object itself. Since <code>alias</code> and <code>profile</code> are the same dict, both names see the new <code>"city"</code> key.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
          ]}],
          heap: [
            { id: 'strAda', pyId: ADDRS.strAda, type: 'str', value: 'Ada', refcount: 1, mutable: false, state: 'normal' },
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Python', type: 'str' },
              { value: 'debugging', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'mutated', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'str' },
              { key: 'city', value: 'London', type: 'str' },
            ]},
          ],
          highlight: ['profileDict'],
        },
      },
      {
        title: '<code>alias is profile</code> is <code>True</code>',
        desc: 'The final state confirms the rule: dictionary mutation through any alias updates the one shared dictionary. To avoid sharing, make an explicit copy and remember that <code>dict.copy()</code> is shallow.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'profile', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
            { name: 'alias', ref: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', state: 'normal' },
          ]}],
          heap: [
            { id: 'strAda', pyId: ADDRS.strAda, type: 'str', value: 'Ada', refcount: 1, mutable: false, state: 'normal' },
            { id: 'skillsList', pyId: ADDRS.skillsList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Python', type: 'str' },
              { value: 'debugging', type: 'str' },
            ]},
            { id: 'profileDict', pyId: ADDRS.profileDict, type: 'dict', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'name', value: 'Ada', type: 'str' },
              { key: 'skills', value: 'list -> 0x7f580010', type: 'str' },
              { key: 'city', value: 'London', type: 'str' },
            ]},
          ],
          highlight: ['profileDict', 'skillsList'],
        },
      },
    ],
  },

  deepCopy: {
    code: `import copy
original = [[1]]
shallow = original.copy()
deep = copy.deepcopy(original)
original[0].append(2)`,
    steps: [
      {
        title: '<code>original</code> is an outer list holding one inner list',
        desc: 'Two container objects already. A shallow copy will clone only the outer one. A deep copy will clone both.',
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
              { value: 'inner -> 0x7f5a1010', type: 'str' },
            ] },
          ],
          highlight: ['deepOuter', 'deepInner'],
        },
      },
      {
        title: '<code>original.copy()</code> shares the inner list',
        desc: 'A new outer list appears. Its slot still points at the same inner list. This is the shallow-copy rule from demo 2.',
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
              { value: 'inner -> 0x7f5a1010', type: 'str' },
            ] },
            { id: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'inner -> 0x7f5a1010', type: 'str' },
            ] },
          ],
          highlight: ['shallowOuter', 'deepInner'],
        },
      },
      {
        title: '<code>deepcopy</code> clones the inner list too',
        desc: '<code>deep</code> is a new outer list whose slot points at a <em>new</em> inner list with the same values. Nested identity is no longer shared.',
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
              { value: 'inner -> 0x7f5a1010', type: 'str' },
            ] },
            { id: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'str' },
            ] },
            { id: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'inner -> 0x7f5a4010', type: 'str' },
            ] },
          ],
          highlight: ['deepCopyOuter', 'deepCopyInner'],
        },
      },
      {
        title: 'Mutating the original inner list leaves <code>deep</code> alone',
        desc: '<code>original[0].append(2)</code> changes the shared inner list, so <code>shallow</code> sees <code>2</code> as well. <code>deep</code> still holds <code>[1]</code> because its inner list is a different object.',
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
              { value: 'inner -> 0x7f5a1010', type: 'str' },
            ] },
            { id: 'shallowOuter', pyId: ADDRS.shallowOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a1010', type: 'str' },
            ] },
            { id: 'deepCopyOuter', pyId: ADDRS.deepCopyOuter, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'inner -> 0x7f5a4010', type: 'str' },
            ] },
          ],
          highlight: ['deepInner', 'deepCopyInner'],
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
    defaultSpeed: 950,

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
      PJ.Core.markSessionComplete('03-lists-dicts');
    },

    onReset() {
      PJ.Syntax.highlightLines(codePanel, []);
    },
  });

  currentAnimator.mount();
}

function initStage() {
  memViz = new PJ.MemoryViz('memPanel');
  switchDemo('listAlias');

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
