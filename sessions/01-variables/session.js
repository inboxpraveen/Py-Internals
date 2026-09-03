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

  // Demo 2: rebind  (42 is a cached small int → same address both times)
  rb42:      '0x7f10a0c0',
  rbList:    '0x7f40d0f8',

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
    watch: 'A name appears, then an object. The name does not contain the value — it points at it.',
    code: `x = 42
y = "hello"
z = 3.14

print(hex(id(x)))   # 0x7f10a0c0  (yours will differ)
print(hex(id(y)))   # 0x7f20b810  — a different object
print(hex(id(z)))   # 0x7f30c454  — and another one again`,

    steps: [
      {
        title: 'Nothing has run yet',
        desc:  'No names, no objects — the namespace is empty and so is the heap. '
             + 'Press <strong>Next</strong> to run one line at a time.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>x = 42</code> — the nametag goes onto an object',
        desc:  'Python finds or makes the object <code>42</code>, then sticks the nametag '
             + '<code>x</code> onto it. The name does not <em>contain</em> the number — it '
             + '<em>points at</em> the object that is the number. Its reference count reads '
             + '<code>∞</code> because small whole numbers are built once at start-up and shared '
             + 'for the life of the program; Demo 2 comes back to that.',
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
              note: 'shared and permanent — CPython caches −5 through 256' },
          ],
          highlight: ['int42'],
        },
      },
      {
        title: '<code>y = "hello"</code> — a second object, somewhere else',
        desc:  'A string object appears at a different address and <code>y</code> is stuck onto it. '
             + 'Different address, different thing — <code>x</code> and <code>y</code> have nothing '
             + 'to do with each other. Like numbers, strings are <strong>immutable</strong>: you can '
             + 'replace one, never edit it in place.',
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
        title: '<code>z = 3.14</code> — a third object',
        desc:  'Anything you write as a literal — a number, a string, a list, even a function — '
             + 'becomes a real <strong>object</strong> in memory with its own address, type and value. '
             + 'Three lines have run, so there are three separate objects with one nametag each.',
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
        desc:  '<code>id()</code> answers one question: are these two names on the same thing? '
             + 'It returns an integer that identifies the object — in CPython, its memory address — '
             + 'and <code>hex()</code> just prints that integer the way the memory panel writes it. '
             + 'Three different numbers here, because these really are three different objects.',
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
        title: 'Summary — three names, three objects, not a box in sight',
        desc:  'No line here put a value <em>inside</em> a name. Each one found or made an object '
             + 'and stuck a single nametag on it. That is the whole rule: same address means one '
             + 'object wearing several names; different addresses mean different objects, however '
             + 'alike they look on screen.',
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


  /* ╔═══════════════════════════════════════════════════════╗
     ║  Demo 2 — Rebinding                                   ║
     ╚═══════════════════════════════════════════════════════╝ */
  rebind: {
    watch: 'The name moves. Watch which object actually gets freed — and which one Python keeps forever.',
    code: `x = 42
print(hex(id(x)))    # 0x7f10a0c0  (yours will differ)

x = [1, 2]           # rebind: x now points at a brand-new list
print(hex(id(x)))    # 0x7f40d0f8 — a different address

x = 42               # back to the very same 42 object
print(hex(id(x)))    # 0x7f10a0c0 — same address as line 1`,

    steps: [
      {
        title: 'Initial state — empty namespace',
        desc:  'We are going to watch <strong>rebinding</strong>: pointing the name '
             + '<code>x</code> at three different objects in turn. Hold one question in mind — '
             + '<em>does the object change, or does the name change?</em>',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>x = 42</code> — and Python already had a <code>42</code>',
        desc:  'Small whole numbers are so common that CPython builds them once, at start-up, '
             + 'and hands out the same object every time. Nothing is created here: the name '
             + '<code>x</code> is simply pointed at the existing <code>42</code> at address '
             + '<code>' + ADDRS.rb42 + '</code>.',
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
              note: 'shared and permanent — CPython caches −5 through 256' },
          ],
          highlight: ['rb42a'],
        },
      },
      {
        title: '<code>x = [1, 2]</code> — <em>this</em> object really is new',
        desc:  'A list is not cached. This one is built fresh, gets its own address, and its '
             + 'refcount starts at 1 because exactly one name points at it. Meanwhile <code>x</code> '
             + 'has let go of <code>42</code> — but <code>42</code> is not freed, because it was '
             + 'never yours to free.',
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
              note: 'still there — no name points at it, and it still is not freed' },
            { id: 'rbList', pyId: ADDRS.rbList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ] },
          ],
          highlight: ['rbList', 'rb42a'],
        },
      },
      {
        title: '<code>x = 42</code> again — the list loses its last name',
        desc:  'Now the direction reverses. <code>x</code> goes back to the same <code>42</code> object, '
             + 'so the list has <strong>no names pointing at it at all</strong>. Its refcount hits 0.',
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
            ], note: 'refcount 0 — about to be freed' },
            { id: 'rb42b', pyId: ADDRS.rb42, type: 'int', value: 42, refcount: '∞', mutable: false, state: 'normal' },
          ],
          highlight: ['rbList', 'rb42b'],
        },
      },
      {
        title: 'The list is freed immediately — the <code>42</code> is not',
        desc:  'CPython counts references. The instant a count reaches zero the object is freed, '
             + 'right there on that line — no waiting, no sweep. The list is gone. The <code>42</code> '
             + 'is still at <code>' + ADDRS.rb42 + '</code>, the same address as line 1, because it '
             + 'is shared by your whole program.',
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
        title: 'Summary — the name moved three times; no object was ever edited',
        desc:  '<strong>Rebinding never changes an object.</strong> It repoints a name. '
             + 'What happens next depends on who else is holding on: the list had one holder and '
             + 'was freed the moment it lost it; the <code>42</code> is cached by CPython and outlives '
             + 'your program either way. That caching covers −5 to 256 and is an implementation '
             + 'detail, not a language rule — never write code that depends on it.',
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

  /* ╔═══════════════════════════════════════════════════════╗
     ║  Demo 3 — Aliasing                                    ║
     ╚═══════════════════════════════════════════════════════╝ */
  aliasing: {
    watch: 'Two names, one list. Same address. <code>append</code> through either name changes the same object.',
    code: `a = [1, 2, 3]
b = a             # b is an ALIAS, not a copy!

b.append(4)       # mutates the shared list

print(a)          # [1, 2, 3, 4] — a sees it too!
print(a is b)     # True — same identity`,

    steps: [
      {
        title: 'Nothing has run yet',
        desc:  'Two nametags, one list — that is all <strong>aliasing</strong> is, and it causes more '
             + 'surprise bugs than almost anything else in Python. Watch what happens when we change '
             + 'the list through one name and then look at the other.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>a = [1, 2, 3]</code> — a list you are allowed to edit',
        desc:  'A list object is built at address <code>' + ADDRS.alList + '</code> and <code>a</code> '
             + 'is stuck onto it. Notice the <strong>mutable</strong> badge: unlike an <code>int</code> '
             + 'or a <code>str</code>, this object\'s contents can change without it becoming a '
             + 'different object.',
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
        desc:  'Assignment <strong>never</strong> copies. <code>b = a</code> puts a second nametag on '
             + 'the list that is already there — same address <code>' + ADDRS.alList + '</code>, so the '
             + 'count of names on it goes to <strong>2</strong>. If you actually wanted a separate '
             + 'list, you have to ask: <code>b = a.copy()</code> or <code>b = list(a)</code>.',
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
        desc:  'There is only one list, so appending through <code>b</code> changes the very object '
             + '<code>a</code> is on. The panel marks it <strong>mutated</strong>: the contents '
             + 'changed, the address <code>' + ADDRS.alList + '</code> did not. It is the same object, '
             + 'holding something new.',
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
        desc:  '<code>a</code> was never assigned to again, yet it now shows four items. '
             + 'Nothing odd happened: <code>a</code> and <code>b</code> were always on one list, and '
             + 'that list changed. This is exactly how Python is meant to work — and exactly where a '
             + 'shared list catches people out.',
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
        title: '<code>a is b</code> → <code>True</code> — one object, two names',
        desc:  '<code>is</code> asks "same object?", not "same value?". Both nametags are on one list, '
             + 'so the answer is <code>True</code>. <code>a == b</code> asks the other question — '
             + 'do these two <em>look</em> the same? — and that can be true of objects at completely '
             + 'different addresses.',
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
        title: 'Summary — one list, two names, one change',
        desc:  'Assignment never copies. <code>b = a</code> only added a second nametag, so a change '
             + 'made through either name is a change both names see. Nothing about this is special to '
             + 'lists — it happens with every mutable object, and with every function you hand one to.',
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
              note: 'one object the whole time — its address never changed',
            },
          ],
          highlight: [],
        },
      },
    ],
  },


  /* ╔═══════════════════════════════════════════════════════╗
     ║  Demo 4 — Mutation vs Rebinding                       ║
     ╚═══════════════════════════════════════════════════════╝ */
  mutation: {
    watch: '<code>append</code> keeps the same address. <code>nums = ...</code> creates a new list and moves the name.',
    code: `nums = [10, 20, 30]
print(hex(id(nums)))       # 0x7f60f010  (yours will differ)

# Mutation: change the object in place
nums.append(40)
print(hex(id(nums)))       # still 0x7f60f010 — same object

# Rebinding: point nums at a brand-new object
nums = [10, 20, 30, 40, 50]
print(hex(id(nums)))       # 0x7f70a448 — a different object`,

    steps: [
      {
        title: 'Nothing has run yet',
        desc:  'Two things that look almost the same in code and are nothing alike in memory: '
             + 'editing a list, and pointing a name at a different list. The address is what tells '
             + 'them apart, so keep an eye on it the whole way down.',
        lines:  [],
        memory: {
          frame: { name: 'global', vars: [] },
          heap:  [],
          highlight: [],
        },
      },
      {
        title: '<code>nums = [10, 20, 30]</code> — one list, one nametag',
        desc:  'A list is built at address <code>' + ADDRS.mutList1 + '</code> and line 2 prints that '
             + 'address. Treat it as the baseline for the rest of the demo: after each operation, has '
             + 'it stayed the same or not?',
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
        title: '<code>nums.append(40)</code> — the list is edited in place',
        desc:  'Appending changes what is <em>inside</em> the list. No second list is made and the '
             + 'nametag does not move — the object at <code>' + ADDRS.mutList1 + '</code> simply holds '
             + 'four items now. That is <strong>mutation</strong>, and the address does not budge.',
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
        title: 'The address printed is the same one as line 2',
        desc:  'Same <code>' + ADDRS.mutList1 + '</code> as before. <strong>Editing an object never '
             + 'changes which object it is.</strong> That is why a function that appends to a list you '
             + 'passed in changes <em>your</em> list: there was only ever one list, and the function '
             + 'just had another name for it.',
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
        title: '<code>nums = [10, 20, 30, 40, 50]</code> — a brand-new list',
        desc:  'This line does not touch the old list at all. Python builds a second list at '
             + '<code>' + ADDRS.mutList2 + '</code> and moves the nametag onto it. The old list is now '
             + 'wearing no names, its count hits <strong>0</strong>, and CPython frees it right there '
             + 'on this line — not later.',
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
        desc:  'It now reads <code>' + ADDRS.mutList2 + '</code>. Same variable name, near-identical '
             + 'contents on screen — but a different object. The nametag was moved; nothing was edited.',
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
        title: 'Summary — editing keeps the object; assigning makes a new one',
        desc:  '<code>nums.append(40)</code> kept one object and changed it, so every name on that '
             + 'object saw the change. <code>nums = [...]</code> made a second object and moved one '
             + 'name to it, leaving any other name still on the old one. Both lines end with '
             + '<code>nums</code> holding five numbers — and that is the trap. The address is the only '
             + 'thing that tells you which of the two just happened.',
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
              note: 'the second list — the first was freed the moment it lost its last name',
            },
          ],
          highlight: [],
        },
      },
    ],
  },
};


/* ── Boot ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '01-variables',
    demos: DEMOS,
    defaultDemo: 'basic',
    defaultSpeed: 900,
  });
});
