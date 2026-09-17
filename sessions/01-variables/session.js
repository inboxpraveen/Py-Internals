/* ============================================================
   SESSION 01: Variables & Mutability
   Demos: basic assignment, rebinding, aliasing, mutation vs rebind
   ============================================================ */

'use strict';

/* Stable, made-up addresses in the CPython 0x7fXXXXXX style. */
const ADDRS = {
  // Demo 1: basic
  int42:     '0x7f10a0c0',
  strHello:  '0x7f20b810',
  float314:  '0x7f30c454',

  // Demo 2: rebind (42 is a cached small int, so it has the same address both times)
  rb42:      '0x7f10a0c0',
  rbList:    '0x7f40d0f8',

  // Demo 3: aliasing
  alList:    '0x7f50e880',

  // Demo 4: mutation vs rebind
  mutList1:  '0x7f60f010',
  mutList2:  '0x7f70a448',
};

/* Demo definitions */
const DEMOS = {

  /* Demo 1: Basic Variable Assignment */
  basic: {
    watch: 'A name appears, then an object. The name doesn\'t hold the value, it points at it.',
    code: `x = 42
y = "hello"
z = 3.14

print(hex(id(x)))   # 0x7f10a0c0  (yours will differ)
print(hex(id(y)))   # 0x7f20b810  (a different object)
print(hex(id(z)))   # 0x7f30c454  (and another one again)`,

    steps: [
      {
        title: 'Nothing has run yet',
        desc:  'No names, no objects. The namespace is empty and so is the heap. Press <strong>Next</strong> to run one line at a time.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>x = 42</code>: the nametag goes on an object',
        desc:  'Python finds or makes the object <code>42</code>, then sticks the nametag <code>x</code> on it. The name doesn\'t <em>contain</em> the number. It <em>points at</em> the object that holds it. The reference count shows <code>∞</code> because small whole numbers are built once when Python starts and shared for the rest of the run. Demo 2 comes back to that.',
        lines:  [1],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'int42', pyId: ADDRS.int42, type: 'int', state: 'new' },
            ],
          },
          heap: [
            { id: 'int42', pyId: ADDRS.int42, type: 'int', value: 42, refcount: '∞', mutable: false, state: 'new',
              note: 'shared and permanent, CPython caches -5 through 256' },
          ],
          highlight: ['int42'],
        },
      },
      {
        title: '<code>y = "hello"</code>: a second object, somewhere else',
        desc:  'A string object appears at a different address and <code>y</code> is stuck on it. Different address, different thing, so <code>x</code> and <code>y</code> have nothing to do with each other. Strings are <strong>immutable</strong> like numbers: you can replace one, but you can\'t edit it in place.',
        lines:  [2],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'int42',    pyId: ADDRS.int42,    type: 'int', state: 'normal' },
              { name: 'y', ref: 'strHello', pyId: ADDRS.strHello, type: 'str', state: 'new'    },
            ],
          },
          heap: [
            { id: 'int42',    pyId: ADDRS.int42,    type: 'int', value: 42,      refcount: '∞', mutable: false, state: 'normal' },
            { id: 'strHello', pyId: ADDRS.strHello, type: 'str', value: 'hello', refcount: 1, mutable: false, state: 'new'    },
          ],
          highlight: ['strHello'],
        },
      },
      {
        title: '<code>z = 3.14</code>: a third object',
        desc:  'Anything you write as a literal (a number, a string, a list, even a function) becomes a real <strong>object</strong> in memory, with its own address, type and value. Three lines have run, so there are three separate objects with one nametag each.',
        lines:  [3],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'int42',    pyId: ADDRS.int42,    type: 'int',   state: 'normal' },
              { name: 'y', ref: 'strHello', pyId: ADDRS.strHello, type: 'str',   state: 'normal' },
              { name: 'z', ref: 'float314', pyId: ADDRS.float314, type: 'float', state: 'new'    },
            ],
          },
          heap: [
            { id: 'int42',    pyId: ADDRS.int42,    type: 'int',   value: 42,      refcount: '∞', mutable: false, state: 'normal' },
            { id: 'strHello', pyId: ADDRS.strHello, type: 'str',   value: 'hello', refcount: 1, mutable: false, state: 'normal' },
            { id: 'float314', pyId: ADDRS.float314, type: 'float', value: 3.14,    refcount: 1, mutable: false, state: 'new'    },
          ],
          highlight: ['float314'],
        },
      },
      {
        title: '<code>id()</code> tells you <em>which</em> object a name is on',
        desc:  '<code>id()</code> answers one question: are these two names on the same thing? It returns an integer that identifies the object, which in CPython is its memory address, and <code>hex()</code> prints that integer the way the memory panel does. Three different numbers here, because these really are three different objects.',
        lines:  [5, 6, 7],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'int42',    pyId: ADDRS.int42,    type: 'int',   state: 'normal' },
              { name: 'y', ref: 'strHello', pyId: ADDRS.strHello, type: 'str',   state: 'normal' },
              { name: 'z', ref: 'float314', pyId: ADDRS.float314, type: 'float', state: 'normal' },
            ],
          },
          heap: [
            { id: 'int42',    pyId: ADDRS.int42,    type: 'int',   value: 42,      refcount: '∞', mutable: false, state: 'normal' },
            { id: 'strHello', pyId: ADDRS.strHello, type: 'str',   value: 'hello', refcount: 1, mutable: false, state: 'normal' },
            { id: 'float314', pyId: ADDRS.float314, type: 'float', value: 3.14,    refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['int42', 'strHello', 'float314'],
        },
      },
      {
        title: 'Summary: three names, three objects, no boxes',
        desc:  'None of these lines put a value <em>inside</em> a name. Each one found or made an object and stuck a nametag on it. That\'s the rule to keep: the same address means one object with several names on it, and different addresses mean different objects, however alike they look on screen.',
        lines:  [1, 2, 3],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'int42',    pyId: ADDRS.int42,    type: 'int',   state: 'normal' },
              { name: 'y', ref: 'strHello', pyId: ADDRS.strHello, type: 'str',   state: 'normal' },
              { name: 'z', ref: 'float314', pyId: ADDRS.float314, type: 'float', state: 'normal' },
            ],
          },
          heap: [
            { id: 'int42',    pyId: ADDRS.int42,    type: 'int',   value: 42,      refcount: '∞', mutable: false, state: 'normal' },
            { id: 'strHello', pyId: ADDRS.strHello, type: 'str',   value: 'hello', refcount: 1,   mutable: false, state: 'normal' },
            { id: 'float314', pyId: ADDRS.float314, type: 'float', value: 3.14,    refcount: 1,   mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },


  /* Demo 2: Rebinding */
  rebind: {
    watch: 'The name moves. Watch which object gets freed, and which one Python keeps for good.',
    code: `x = 42
print(hex(id(x)))    # 0x7f10a0c0  (yours will differ)

x = [1, 2]           # rebind: x now points at a brand-new list
print(hex(id(x)))    # 0x7f40d0f8, a different address

x = 42               # back to the very same 42 object
print(hex(id(x)))    # 0x7f10a0c0, same address as line 1`,

    steps: [
      {
        title: 'Initial state: an empty namespace',
        desc:  'This demo is about <strong>rebinding</strong>: pointing the name <code>x</code> at three different objects in turn. Keep one question in mind as you go. <em>Does the object change, or does the name change?</em>',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>x = 42</code>, and Python already had a <code>42</code>',
        desc:  'Small whole numbers come up so often that CPython builds them once at start-up and hands out the same object every time. Nothing is created here. The name <code>x</code> is pointed at the <code>42</code> that already exists at address <code>0x7f10a0c0</code>.',
        lines:  [1],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb42a', pyId: ADDRS.rb42, type: 'int', state: 'new' },
            ],
          },
          heap: [
            { id: 'rb42a', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: '∞', mutable: false, state: 'new',
              note: 'shared and permanent, CPython caches -5 through 256' },
          ],
          highlight: ['rb42a'],
        },
      },
      {
        title: '<code>x = [1, 2]</code>: <em>this</em> object really is new',
        desc:  'Lists aren\'t cached. This one is built fresh, gets its own address, and its refcount starts at 1 because one name points at it. <code>x</code> has let go of <code>42</code>, but <code>42</code> isn\'t freed. It was never yours to free.',
        lines:  [4],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rbList', pyId: ADDRS.rbList, type: 'list', state: 'rebound' },
            ],
          },
          heap: [
            { id: 'rb42a', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: '∞', mutable: false, state: 'normal',
              note: 'still here, no name points at it and it still is not freed' },
            { id: 'rbList', pyId: ADDRS.rbList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ] },
          ],
          highlight: ['rbList', 'rb42a'],
        },
      },
      {
        title: '<code>x = 42</code> again: the list loses its last name',
        desc:  'Now it goes the other way. <code>x</code> moves back to the same <code>42</code> object, so <strong>no name points at the list any more</strong>. Its refcount drops to 0.',
        lines:  [7],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb42b', pyId: ADDRS.rb42, type: 'int', state: 'rebound' },
            ],
          },
          heap: [
            { id: 'rbList', pyId: ADDRS.rbList, type: 'list', refcount: 0, mutable: true, state: 'gc', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ], note: 'refcount 0, about to be freed' },
            { id: 'rb42b', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: '∞', mutable: false, state: 'normal' },
          ],
          highlight: ['rbList', 'rb42b'],
        },
      },
      {
        title: 'The list is freed at once. The <code>42</code> isn\'t',
        desc:  'CPython counts references. The moment a count reaches zero the object is freed, on that very line, with no waiting and no sweep. The list is gone. The <code>42</code> is still at <code>0x7f10a0c0</code>, the same address as on line 1, because the whole program shares it.',
        lines:  [7, 8],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb42b', pyId: ADDRS.rb42, type: 'int', state: 'normal' },
            ],
          },
          heap: [
            { id: 'rb42b', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: '∞', mutable: false, state: 'normal',
              note: 'same object, same address as line 1' },
          ],
          highlight: ['rb42b'],
        },
      },
      {
        title: 'Summary: the name moved three times and no object was edited',
        desc:  '<strong>Rebinding never changes an object.</strong> It points a name somewhere else. What happens next depends on who else is holding on. The list had one holder and was freed the moment it lost it. The <code>42</code> is cached by CPython and outlives your program either way. That cache covers -5 to 256 and it\'s an implementation detail, not a language rule, so never write code that depends on it.',
        lines:  [1, 4, 7],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb42b', pyId: ADDRS.rb42, type: 'int', state: 'normal' },
            ],
          },
          heap: [
            { id: 'rb42b', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: '∞', mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },

  /* Demo 3: Aliasing */
  aliasing: {
    watch: 'Two names, one list, one address. <code>append</code> through either name changes the same object.',
    code: `a = [1, 2, 3]
b = a             # b is an alias, not a copy

b.append(4)       # mutates the shared list

print(a)          # [1, 2, 3, 4]  a sees it too
print(a is b)     # True, same identity`,

    steps: [
      {
        title: 'Nothing has run yet',
        desc:  'Two nametags on one list. That\'s all <strong>aliasing</strong> is, and it causes more surprise bugs than almost anything else in Python. Watch what happens when we change the list through one name and then look at it through the other.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>a = [1, 2, 3]</code>: a list you\'re allowed to edit',
        desc:  'A list object is built at address <code>0x7f50e880</code> and <code>a</code> is stuck on it. Notice the <strong>mutable</strong> badge. Unlike an <code>int</code> or a <code>str</code>, this object\'s contents can change without it becoming a different object.',
        lines:  [1],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'a', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'new' },
            ],
          },
          heap: [
            {
              id: 'alList', pyId: ADDRS.alList, type: 'list', refcount: 1, mutable: true, state: 'new',
              items: [
                { value: 1, type: 'int' },
                { value: 2, type: 'int' },
                { value: 3, type: 'int' },
              ],
            },
          ],
          highlight: ['alList'],
        },
      },
      {
        title: '<code>b = a</code>: <code>b</code> is an alias, <em>not</em> a copy',
        desc:  'Assignment <strong>never</strong> copies. <code>b = a</code> puts a second nametag on the list that\'s already there, at the same address <code>0x7f50e880</code>, so the count of names on it goes up to <strong>2</strong>. If you wanted a separate list you have to ask for one: <code>b = a.copy()</code> or <code>b = list(a)</code>.',
        lines:  [2],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'a', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
              { name: 'b', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'new'    },
            ],
          },
          heap: [
            {
              id: 'alList', pyId: ADDRS.alList, type: 'list', refcount: 2, mutable: true, state: 'normal',
              items: [
                { value: 1, type: 'int' },
                { value: 2, type: 'int' },
                { value: 3, type: 'int' },
              ],
            },
          ],
          highlight: ['alList'],
        },
      },
      {
        title: '<code>b.append(4)</code> mutates the <em>shared</em> list',
        desc:  'There\'s only one list, so appending through <code>b</code> changes the object <code>a</code> is on. The panel marks it <strong>mutated</strong>: the contents changed, the address <code>0x7f50e880</code> didn\'t. Same object, new contents.',
        lines:  [4],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'a', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
              { name: 'b', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'alList', pyId: ADDRS.alList, type: 'list', refcount: 2, mutable: true, state: 'mutated',
              items: [
                { value: 1, type: 'int' },
                { value: 2, type: 'int' },
                { value: 3, type: 'int' },
                { value: 4, type: 'int' },
              ],
            },
          ],
          highlight: ['alList'],
        },
      },
      {
        title: '<code>print(a)</code> → <code>[1, 2, 3, 4]</code>',
        desc:  '<code>a</code> was never assigned to again, yet it now shows four items. Nothing odd happened. <code>a</code> and <code>b</code> were always on one list, and that list changed. This is how Python is meant to work, and it\'s also where a shared list catches people out.',
        lines:  [6],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'a', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
              { name: 'b', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'alList', pyId: ADDRS.alList, type: 'list', refcount: 2, mutable: true, state: 'normal',
              items: [
                { value: 1, type: 'int' },
                { value: 2, type: 'int' },
                { value: 3, type: 'int' },
                { value: 4, type: 'int' },
              ],
            },
          ],
          highlight: ['alList'],
        },
      },
      {
        title: '<code>a is b</code> → <code>True</code>: one object, two names',
        desc:  '<code>is</code> asks "same object?", not "same value?". Both nametags are on one list, so the answer is <code>True</code>. <code>a == b</code> asks the other question, whether the two <em>look</em> the same, and that can be true of objects at completely different addresses.',
        lines:  [7],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'a', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
              { name: 'b', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'alList', pyId: ADDRS.alList, type: 'list', refcount: 2, mutable: true, state: 'normal',
              items: [
                { value: 1, type: 'int' },
                { value: 2, type: 'int' },
                { value: 3, type: 'int' },
                { value: 4, type: 'int' },
              ],
            },
          ],
          highlight: ['alList'],
        },
      },
      {
        title: 'Summary: one list, two names, one change',
        desc:  'Assignment never copies. <code>b = a</code> only added a second nametag, so a change made through either name is a change both names see. There\'s nothing special about lists here. It happens with every mutable object, and with every function you hand one to.',
        lines:  [1, 2, 4],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'a', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
              { name: 'b', ref: 'alList', pyId: ADDRS.alList, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'alList', pyId: ADDRS.alList, type: 'list', refcount: 2, mutable: true, state: 'normal',
              items: [
                { value: 1, type: 'int' },
                { value: 2, type: 'int' },
                { value: 3, type: 'int' },
                { value: 4, type: 'int' },
              ],
              note: 'one object the whole time, its address never changed',
            },
          ],
          highlight: [],
        },
      },
    ],
  },


  /* Demo 4: Mutation vs Rebinding */
  mutation: {
    watch: '<code>append</code> keeps the same address. <code>nums = ...</code> makes a new list and moves the name.',
    code: `nums = [10, 20, 30]
print(hex(id(nums)))       # 0x7f60f010  (yours will differ)

# Mutation: change the object in place
nums.append(40)
print(hex(id(nums)))       # still 0x7f60f010, same object

# Rebinding: point nums at a brand-new object
nums = [10, 20, 30, 40, 50]
print(hex(id(nums)))       # 0x7f70a448, a different object`,

    steps: [
      {
        title: 'Nothing has run yet',
        desc:  'Two things that look almost the same in code and are very different in memory: editing a list, and pointing a name at a different list. The address is what tells them apart, so keep an eye on it all the way through.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>nums = [10, 20, 30]</code>: one list, one nametag',
        desc:  'A list is built at address <code>0x7f60f010</code> and line 2 prints that address. Treat it as the baseline for the rest of the demo. After each operation, ask whether it has stayed the same.',
        lines:  [1, 2],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'nums', ref: 'mutList1', pyId: ADDRS.mutList1, type: 'list', state: 'new' },
            ],
          },
          heap: [
            {
              id: 'mutList1', pyId: ADDRS.mutList1, type: 'list', refcount: 1, mutable: true, state: 'new',
              items: [
                { value: 10, type: 'int' },
                { value: 20, type: 'int' },
                { value: 30, type: 'int' },
              ],
            },
          ],
          highlight: ['mutList1'],
        },
      },
      {
        title: '<code>nums.append(40)</code>: the list is edited in place',
        desc:  'Appending changes what\'s <em>inside</em> the list. No second list is made and the nametag doesn\'t move. The object at <code>0x7f60f010</code> now holds four items. That\'s <strong>mutation</strong>, and the address doesn\'t budge.',
        lines:  [5],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'nums', ref: 'mutList1', pyId: ADDRS.mutList1, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'mutList1', pyId: ADDRS.mutList1, type: 'list', refcount: 1, mutable: true, state: 'mutated',
              items: [
                { value: 10, type: 'int' },
                { value: 20, type: 'int' },
                { value: 30, type: 'int' },
                { value: 40, type: 'int' },
              ],
            },
          ],
          highlight: ['mutList1'],
        },
      },
      {
        title: 'The address printed is the same one as on line 2',
        desc:  'Still <code>0x7f60f010</code>. <strong>Editing an object never changes which object it is.</strong> That\'s why a function that appends to a list you passed in changes <em>your</em> list: there was only ever one list, and the function had another name for it.',
        lines:  [6],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'nums', ref: 'mutList1', pyId: ADDRS.mutList1, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'mutList1', pyId: ADDRS.mutList1, type: 'list', refcount: 1, mutable: true, state: 'normal',
              items: [
                { value: 10, type: 'int' },
                { value: 20, type: 'int' },
                { value: 30, type: 'int' },
                { value: 40, type: 'int' },
              ],
            },
          ],
          highlight: ['mutList1'],
        },
      },
      {
        title: '<code>nums = [10, 20, 30, 40, 50]</code>: a brand-new list',
        desc:  'This line doesn\'t touch the old list at all. Python builds a second list at <code>0x7f70a448</code> and moves the nametag onto it. The old list now has no names on it, its count hits <strong>0</strong>, and CPython frees it on this line, not later.',
        lines:  [9],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'nums', ref: 'mutList2', pyId: ADDRS.mutList2, type: 'list', state: 'rebound' },
            ],
          },
          heap: [
            {
              id: 'mutList1', pyId: ADDRS.mutList1, type: 'list', refcount: 0, mutable: true, state: 'gc',
              items: [
                { value: 10, type: 'int' },
                { value: 20, type: 'int' },
                { value: 30, type: 'int' },
                { value: 40, type: 'int' },
              ],
            },
            {
              id: 'mutList2', pyId: ADDRS.mutList2, type: 'list', refcount: 1, mutable: true, state: 'new',
              items: [
                { value: 10, type: 'int' },
                { value: 20, type: 'int' },
                { value: 30, type: 'int' },
                { value: 40, type: 'int' },
                { value: 50, type: 'int' },
              ],
            },
          ],
          highlight: ['mutList2', 'mutList1'],
        },
      },
      {
        title: 'This time the printed address is different',
        desc:  'It now reads <code>0x7f70a448</code>. Same variable name, near-identical contents on screen, but a different object. The nametag was moved and nothing was edited.',
        lines:  [10],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'nums', ref: 'mutList2', pyId: ADDRS.mutList2, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'mutList2', pyId: ADDRS.mutList2, type: 'list', refcount: 1, mutable: true, state: 'normal',
              items: [
                { value: 10, type: 'int' },
                { value: 20, type: 'int' },
                { value: 30, type: 'int' },
                { value: 40, type: 'int' },
                { value: 50, type: 'int' },
              ],
            },
          ],
          highlight: ['mutList2'],
        },
      },
      {
        title: 'Summary: editing keeps the object, assigning makes a new one',
        desc:  '<code>nums.append(40)</code> kept one object and changed it, so every name on that object saw the change. <code>nums = [...]</code> made a second object and moved one name to it, leaving any other name on the old one. Both lines end with <code>nums</code> holding five numbers, and that\'s the trap. The address is the only thing that tells you which of the two just happened.',
        lines:  [5, 9],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'nums', ref: 'mutList2', pyId: ADDRS.mutList2, type: 'list', state: 'normal' },
            ],
          },
          heap: [
            {
              id: 'mutList2', pyId: ADDRS.mutList2, type: 'list', refcount: 1, mutable: true, state: 'normal',
              items: [
                { value: 10, type: 'int' },
                { value: 20, type: 'int' },
                { value: 30, type: 'int' },
                { value: 40, type: 'int' },
                { value: 50, type: 'int' },
              ],
              note: 'the second list. The first was freed the moment it lost its last name',
            },
          ],
          highlight: [],
        },
      },
    ],
  },
};


/* Boot */
document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '01-variables',
    demos: DEMOS,
    defaultDemo: 'basic',
    defaultSpeed: 900,
  });
});
