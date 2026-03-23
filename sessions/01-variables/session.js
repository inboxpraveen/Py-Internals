/* ============================================================
   SESSION 01 — Variables & Mutability
   Demos: basic assignment, rebinding, aliasing, mutation vs rebind
   ============================================================ */

'use strict';

/* ── Stable memory addresses (CPython-style 0x7fXXXXXX) ─── */
const ADDRS = {
  // Demo 1: basic
  int42:     '0x7f10a0c0',
  strHello:  '0x7f20b810',
  float314:  '0x7f30c454',

  // Demo 2: rebind  (42 is interned → same address both times)
  rb42:      '0x7f10a0c0',
  rb100:     '0x7f40d0f8',

  // Demo 3: aliasing
  alList:    '0x7f50e880',

  // Demo 4: mutation vs rebind
  mutList1:  '0x7f60f010',
  mutList2:  '0x7f70a448',
};

/* ── Demo definitions ────────────────────────────────────── */
const DEMOS = {

  /* ╔═══════════════════════════════════════════════════════╗
     ║  Demo 1 — Basic Variable Assignment                   ║
     ╚═══════════════════════════════════════════════════════╝ */
  basic: {
    code: `x = 42
y = "hello"
z = 3.14

print(id(x))   # e.g. 140712345678752
print(id(y))   # different address
print(id(z))   # yet another address`,

    steps: [
      {
        title: 'Initial state — empty namespace',
        desc:  'Before any code runs, the global namespace contains no names. '
             + 'There are no objects on the heap yet. '
             + 'Press <strong>Next</strong> to execute line by line.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>x = 42</code> — Python creates an <code>int</code> object',
        desc:  'Two things happen: Python allocates an <strong>integer object</strong> '
             + '<code>42</code> on the heap (giving it a type, value, and refcount of 1), '
             + 'then it binds the name <code>x</code> in the global namespace to point at that object. '
             + 'The variable <code>x</code> doesn\'t <em>hold</em> 42 — it <em>references</em> the object that does.',
        lines:  [1],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'int42', pyId: ADDRS.int42, type: 'int', state: 'new' },
            ],
          },
          heap: [
            { id: 'int42', pyId: ADDRS.int42, type: 'int', value: 42, refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['int42'],
        },
      },
      {
        title: '<code>y = "hello"</code> — a <code>str</code> object appears',
        desc:  'A string object is created at a <em>different</em> memory address. '
             + 'The name <code>y</code> is bound to it. '
             + 'Notice <code>x</code> and <code>y</code> point to completely different objects '
             + '— each has its own <code>id()</code>. '
             + 'Strings, like integers, are <strong>immutable</strong>: once created, their value never changes.',
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
            { id: 'int42',    pyId: ADDRS.int42,    type: 'int', value: 42,      refcount: 1, mutable: false, state: 'normal' },
            { id: 'strHello', pyId: ADDRS.strHello, type: 'str', value: 'hello', refcount: 1, mutable: false, state: 'new'    },
          ],
          highlight: ['strHello'],
        },
      },
      {
        title: '<code>z = 3.14</code> — a <code>float</code> object',
        desc:  'Every literal in Python — whether a number, a string, a list, or a function — '
             + 'becomes a <strong>heap object</strong> with its own address, type, value, and reference count. '
             + 'There are now three distinct objects and three names pointing to them.',
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
            { id: 'int42',    pyId: ADDRS.int42,    type: 'int',   value: 42,      refcount: 1, mutable: false, state: 'normal' },
            { id: 'strHello', pyId: ADDRS.strHello, type: 'str',   value: 'hello', refcount: 1, mutable: false, state: 'normal' },
            { id: 'float314', pyId: ADDRS.float314, type: 'float', value: 3.14,    refcount: 1, mutable: false, state: 'new'    },
          ],
          highlight: ['float314'],
        },
      },
      {
        title: '<code>id()</code> reveals each object\'s unique memory address',
        desc:  'The built-in <code>id(x)</code> returns an integer that is the <strong>memory address</strong> '
             + 'of the object <code>x</code> refers to (in CPython). '
             + 'All three <code>id()</code> calls return different numbers because <code>x</code>, '
             + '<code>y</code>, and <code>z</code> point to three separate objects. '
             + 'Two names with the <em>same</em> <code>id()</code> point to the exact same object — no copy was made.',
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
            { id: 'int42',    pyId: ADDRS.int42,    type: 'int',   value: 42,      refcount: 1, mutable: false, state: 'normal' },
            { id: 'strHello', pyId: ADDRS.strHello, type: 'str',   value: 'hello', refcount: 1, mutable: false, state: 'normal' },
            { id: 'float314', pyId: ADDRS.float314, type: 'float', value: 3.14,    refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['int42', 'strHello', 'float314'],
        },
      },
    ],
  },


  /* ╔═══════════════════════════════════════════════════════╗
     ║  Demo 2 — Rebinding                                   ║
     ╚═══════════════════════════════════════════════════════╝ */
  rebind: {
    code: `x = 42
print(id(x))    # 0x7f10a0c0

x = 100         # rebind: x points to a NEW object
print(id(x))    # 0x7f40d0f8 — different address!

x = 42          # CPython interns small ints — reuses existing 42
print(id(x))    # 0x7f10a0c0 — same address as line 1!`,

    steps: [
      {
        title: 'Initial state — empty namespace',
        desc:  'We\'re going to watch <strong>rebinding</strong> in action: '
             + 'pointing the name <code>x</code> at a series of different objects. '
             + 'Key question to hold in mind: <em>does the object change, or does the name change?</em>',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>x = 42</code> — name <code>x</code> bound to int <code>42</code>',
        desc:  'An <code>int</code> object with value <code>42</code> is created on the heap '
             + '(address <code>' + ADDRS.rb42 + '</code>, refcount: 1). '
             + 'The name <code>x</code> is bound to it in the global namespace.',
        lines:  [1],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb42a', pyId: ADDRS.rb42, type: 'int', state: 'new' },
            ],
          },
          heap: [
            { id: 'rb42a', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['rb42a'],
        },
      },
      {
        title: '<code>x = 100</code> — <code>x</code> is <em>rebound</em> to a new object',
        desc:  '<strong>Rebinding</strong>: the name <code>x</code> is detached from the <code>42</code> '
             + 'object and attached to a brand-new <code>100</code> object at address '
             + '<code>' + ADDRS.rb100 + '</code>. '
             + 'The original <code>42</code> object\'s refcount drops to <strong>0</strong> '
             + '— the garbage collector will reclaim it immediately.',
        lines:  [4],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb100', pyId: ADDRS.rb100, type: 'int', state: 'rebound' },
            ],
          },
          heap: [
            { id: 'rb42a', pyId: ADDRS.rb42,  type: 'int', value: 42,  refcount: 0, mutable: false, state: 'gc'  },
            { id: 'rb100', pyId: ADDRS.rb100, type: 'int', value: 100, refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['rb100', 'rb42a'],
        },
      },
      {
        title: 'The <code>42</code> object is garbage collected (refcount → 0)',
        desc:  'CPython uses <strong>reference counting</strong> as its primary garbage collection strategy. '
             + 'The moment a refcount reaches 0, the object\'s memory is freed. '
             + 'The old <code>42</code> object is gone. '
             + 'Only the <code>100</code> object remains.',
        lines:  [5],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb100', pyId: ADDRS.rb100, type: 'int', state: 'normal' },
            ],
          },
          heap: [
            { id: 'rb100', pyId: ADDRS.rb100, type: 'int', value: 100, refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['rb100'],
        },
      },
      {
        title: '<code>x = 42</code> again — CPython reuses the interned <code>42</code>!',
        desc:  'CPython <strong>pre-creates ("interns") integer objects for values -5 through 256</strong>. '
             + 'These are singletons — only one object per value exists. '
             + 'When you write <code>42</code> again, Python finds the existing interned object '
             + 'and reuses it, giving back address <code>' + ADDRS.rb42 + '</code> — '
             + 'the <em>same address</em> as line 1.',
        lines:  [7],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb42b', pyId: ADDRS.rb42, type: 'int', state: 'rebound' },
            ],
          },
          heap: [
            { id: 'rb100', pyId: ADDRS.rb100, type: 'int', value: 100, refcount: 0, mutable: false, state: 'gc'  },
            { id: 'rb42b', pyId: ADDRS.rb42,  type: 'int', value: 42,  refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['rb42b'],
        },
      },
      {
        title: 'Summary — names change; immutable objects never do',
        desc:  '<strong>Key insight:</strong> When you "reassign" a variable pointing to an immutable type, '
             + 'Python never modifies the original object. It creates a new object and <em>rebinds</em> the name. '
             + 'The old object\'s refcount drops; if it hits 0, it\'s freed. '
             + 'Integer interning (−5 to 256) is a CPython optimization — not a language guarantee.',
        lines:  [1, 4, 7],
        memory: {
          frame: {
            name: 'global',
            vars: [
              { name: 'x', ref: 'rb42b', pyId: ADDRS.rb42, type: 'int', state: 'normal' },
            ],
          },
          heap: [
            { id: 'rb42b', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['rb42b'],
        },
      },
    ],
  },


  /* ╔═══════════════════════════════════════════════════════╗
     ║  Demo 3 — Aliasing                                    ║
     ╚═══════════════════════════════════════════════════════╝ */
  aliasing: {
    code: `a = [1, 2, 3]
b = a             # b is an ALIAS, not a copy!

b.append(4)       # mutates the shared list

print(a)          # [1, 2, 3, 4] — a sees it too!
print(a is b)     # True — same identity`,

    steps: [
      {
        title: 'Initial state — empty namespace',
        desc:  '<strong>Aliasing</strong> means two names pointing to the same mutable object. '
             + 'It is one of the most common sources of bugs for Python beginners. '
             + 'Watch closely: we\'ll mutate the list through one name and observe both.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>a = [1, 2, 3]</code> — a mutable list on the heap',
        desc:  'A <strong>mutable</strong> list object is created on the heap at address '
             + '<code>' + ADDRS.alList + '</code>. '
             + 'Notice the <code>mutable</code> badge — unlike <code>int</code> or <code>str</code>, '
             + 'this object\'s <em>contents</em> can be changed without creating a new object.',
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
        title: '<code>b = a</code> — <code>b</code> is an alias, <em>not</em> a copy!',
        desc:  'Assignment <strong>never</strong> copies objects. <code>b = a</code> makes '
             + '<code>b</code> point to the <em>exact same list</em> object. '
             + 'Both names share the same address <code>' + ADDRS.alList + '</code>. '
             + 'The refcount is now <strong>2</strong> — two names reference one heap object. '
             + 'To get an independent copy, you\'d need <code>b = a.copy()</code> or <code>b = list(a)</code>.',
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
        title: '<code>b.append(4)</code> — mutates the <em>shared</em> list',
        desc:  'Because <code>a</code> and <code>b</code> reference the <em>same object</em>, '
             + 'appending through <code>b</code> changes the object that <code>a</code> also points to. '
             + 'The list object is marked <strong>mutated</strong> — its contents changed, '
             + 'but its address (<code>' + ADDRS.alList + '</code>) and identity did not.',
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
        desc:  '<code>a</code> was never reassigned — yet it now "sees" 4 items. '
             + 'This is the aliasing trap: <code>a</code> still points to the same object. '
             + 'That object was mutated. So <code>a</code> reflects the mutation. '
             + 'This is <em>not a bug</em> — it\'s Python\'s intentional reference semantics.',
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
        title: '<code>a is b</code> → <code>True</code> — they share identity',
        desc:  'The <code>is</code> operator checks <strong>identity</strong> (same <code>id()</code>), '
             + 'not equality. Since both names point to the same object, '
             + '<code>a is b</code> is <code>True</code>. '
             + 'Compare with <code>a == b</code>, which only checks <em>value</em>. '
             + '<strong>Rule of thumb:</strong> use <code>is</code> only when checking against '
             + '<code>None</code>, <code>True</code>, or <code>False</code>.',
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
    ],
  },


  /* ╔═══════════════════════════════════════════════════════╗
     ║  Demo 4 — Mutation vs Rebinding                       ║
     ╚═══════════════════════════════════════════════════════╝ */
  mutation: {
    code: `nums = [10, 20, 30]
print(id(nums))       # 0x7f60f010

# Mutation: changes the object in-place
nums.append(40)
print(id(nums))       # still 0x7f60f010 — same object!

# Rebinding: points nums at a brand-new object
nums = [10, 20, 30, 40, 50]
print(id(nums))       # 0x7f70a448 — new address!`,

    steps: [
      {
        title: 'Initial state — empty namespace',
        desc:  'This demo draws the sharpest possible line between '
             + '<strong>mutation</strong> (changing an object\'s contents in-place) '
             + 'and <strong>rebinding</strong> (pointing a name at a different object). '
             + 'We\'ll track the address of <code>nums</code> throughout.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>nums = [10, 20, 30]</code> — list created on the heap',
        desc:  'A mutable list is allocated at address <code>' + ADDRS.mutList1 + '</code>. '
             + 'We\'ll use this address as our baseline: does it stay the same after operations, or does it change?',
        lines:  [1],
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
        title: '<code>nums.append(40)</code> — MUTATION: same object, new content',
        desc:  '<strong>Mutation</strong> changes what\'s <em>inside</em> the object — '
             + 'without touching the object\'s address or creating a new one. '
             + 'The list at <code>' + ADDRS.mutList1 + '</code> now holds 4 items, '
             + 'but it is still the <em>same object</em>. '
             + 'Watch the address: it does <em>not</em> change.',
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
        title: '<code>id(nums)</code> is unchanged — identity preserved by mutation',
        desc:  '<code>print(id(nums))</code> still outputs <code>' + ADDRS.mutList1 + '</code>. '
             + 'The address is identical to line 2. '
             + '<strong>Mutation does not change identity.</strong> '
             + 'This is why functions that mutate a list passed as an argument affect the caller\'s list too — '
             + 'it\'s always the same underlying object.',
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
        title: '<code>nums = [10, 20, 30, 40, 50]</code> — REBINDING: new object!',
        desc:  '<strong>Rebinding</strong> is fundamentally different from mutation. '
             + 'Python allocates a <em>brand-new</em> list at address <code>' + ADDRS.mutList2 + '</code> '
             + 'and makes <code>nums</code> point to it. '
             + 'The old list\'s refcount drops to <strong>0</strong> — it will be garbage collected. '
             + 'Any other name that was pointing to the old list is <em>unaffected</em> — '
             + 'it still references the old object.',
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
        title: '<code>id(nums)</code> → new address — rebinding creates new identity',
        desc:  '<code>print(id(nums))</code> now outputs <code>' + ADDRS.mutList2 + '</code> '
             + '— a completely different address. '
             + '<strong>The golden rule: mutation preserves identity; rebinding creates new identity.</strong> '
             + 'Use <code>.append()</code>, <code>.update()</code>, etc. to mutate in-place. '
             + 'Use <code>nums = ...</code> to rebind.',
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
    ],
  },
};


/* ── Module state ────────────────────────────────────────── */
let currentAnimator = null;
let memViz          = null;


/* ── Scroll helper (used by sidebar onclick attributes) ─── */
function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ── Switch demo (called by demo-pill buttons) ─────────── */
function switchDemo(demoKey) {
  /* Update pill active states */
  document.querySelectorAll('.demo-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.demo === demoKey);
  });

  const demo = DEMOS[demoKey];
  if (!demo) return;

  /* Render code */
  const codePanel = document.getElementById('codePanel');
  PJ.Syntax.render(demo.code, codePanel);

  /* Tear down previous animator */
  if (currentAnimator) currentAnimator.pause();

  /* Build new animator */
  currentAnimator = new PJ.Animator({
    steps:        demo.steps,
    containerId:  'stage',
    defaultSpeed: 800,

    onStep(step, index, total) {
      /* Highlight active lines */
      PJ.Syntax.highlightLines(codePanel, step.lines || []);

      /* Render memory snapshot */
      if (step.memory) memViz.render(step.memory);

      /* Update explanation strip */
      const numEl   = document.getElementById('stepNum');
      const titleEl = document.getElementById('stepTitle');
      const descEl  = document.getElementById('stepDesc');

      if (numEl)   numEl.textContent = index + 1;
      if (titleEl) {
        titleEl.innerHTML = step.title || '';
        /* Trigger re-animation on content change */
        titleEl.classList.remove('explanation-text--animate');
        void titleEl.offsetWidth;
        titleEl.classList.add('explanation-text--animate');
      }
      if (descEl) descEl.innerHTML = step.desc || '';
    },

    onComplete() {
      PJ.Core.markSessionComplete('01-variables');
      const btn = document.getElementById('nextSessionBtn');
      if (btn) btn.style.display = 'inline-flex';
    },

    onReset() {
      PJ.Syntax.highlightLines(codePanel, []);
    },
  });

  currentAnimator.mount();
}


/* ── Init ────────────────────────────────────────────────── */
function initStage() {
  /* Create memory visualizer */
  memViz = new PJ.MemoryViz('memPanel');

  /* Boot on the first demo */
  switchDemo('basic');

  /* Read-progress bar */
  const bar = document.getElementById('readProgress');
  if (bar) {
    const updateBar = () => {
      const scrolled = window.scrollY;
      const total    = document.body.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
    };
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();
  }

  /* Sidebar active-section highlighting on scroll */
  const sections = document.querySelectorAll('[id]');
  const sideLinks = document.querySelectorAll('.sidebar__item[href^="#"]');

  if (sideLinks.length && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          sideLinks.forEach(l => l.classList.remove('active'));
          const active = document.querySelector(`.sidebar__item[href="#${entry.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));
  }
}

document.addEventListener('DOMContentLoaded', initStage);
