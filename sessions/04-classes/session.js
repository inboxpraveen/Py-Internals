/* ============================================================
   SESSION 04 — Classes & Objects
   Demos: instance creation, class vs instance attrs,
   bound methods, mutable instance state
   ============================================================ */

'use strict';

const ADDRS = {
  PointCls:  '0x7f7100a0',
  initFn:    '0x7f7101b0',
  int3:      '0x7f110003',
  int4:      '0x7f110004',
  pInst:     '0x7f720010',

  PlayerCls: '0x7f7300a0',
  intLives3: '0x7f110013',
  intLives2: '0x7f110012',
  intScore:  '0x7f11000a',
  aInst:     '0x7f740010',
  bInst:     '0x7f740020',

  GreeterCls:'0x7f7500a0',
  helloFn:   '0x7f7501b0',
  gInst:     '0x7f760010',
  boundHello:'0x7f7601c0',
  strAda:    '0x7f2200aa',
  strHi:     '0x7f2200bb',

  BoxCls:    '0x7f7700a0',
  boxInit:   '0x7f7701b0',
  dataList:  '0x7f780010',
  boxInst:   '0x7f790010',
};

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

const DEMOS = {
  create: {
    code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(3, 4)`,
    steps: [
      {
        title: 'Initial state — only the global frame',
        desc: 'No class exists yet. A <code>class</code> statement is executable code, just like <code>def</code>. Press Next to watch Python build the class, then the instance.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>class Point</code> creates a class object',
        desc: 'Python creates a <strong>class object</strong> and binds the name <code>Point</code> to it. The class is itself a heap object. It will hold methods and class-level attributes.',
        lines: [1],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point', refcount: 1, mutable: true, state: 'new', pairs: [] },
          ],
          highlight: ['PointCls'],
        },
      },
      {
        title: '<code>__init__</code> is stored on the class',
        desc: 'The method is a function object. It lives on the <strong>class</strong>, not on any instance. When you later write <code>p.x = ...</code>, that function will receive the instance as <code>self</code>.',
        lines: [2, 3, 4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
          ]}],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'new' },
            { id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7101b0', type: 'str' },
            ] },
          ],
          highlight: ['initFn', 'PointCls'],
        },
      },
      {
        title: '<code>Point(3, 4)</code> creates an instance, then calls <code>__init__</code>',
        desc: 'Calling a class does two jobs: allocate a new instance, then call <code>__init__</code> with that instance as <code>self</code>. The <code>__init__</code> frame now holds <code>self</code>, <code>x</code>, and <code>y</code>.',
        lines: [6],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
            ]},
            { name: 'Point.__init__(self, x, y)', vars: [
              { name: 'self', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'new' },
              { name: 'x', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'new' },
              { name: 'y', ref: 'int4', pyId: ADDRS.int4, type: 'int', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7101b0', type: 'str' },
            ] },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'new' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'new' },
            { id: 'pInst', pyId: ADDRS.pInst, type: 'instance', value: 'Point()', refcount: 1, mutable: true, state: 'new', pairs: [] },
          ],
          highlight: ['pInst', 'int3', 'int4'],
        },
      },
      {
        title: '<code>self.x = x</code> writes into the instance <code>__dict__</code>',
        desc: 'This is not a local variable named <code>x</code> on the instance. It stores a reference in the instance\'s attribute mapping. The name <code>self</code> still points at the same instance object.',
        lines: [3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
            ]},
            { name: 'Point.__init__(self, x, y)', vars: [
              { name: 'self', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'normal' },
              { name: 'x', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'normal' },
              { name: 'y', ref: 'int4', pyId: ADDRS.int4, type: 'int', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7101b0', type: 'str' },
            ] },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 2, mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'normal' },
            { id: 'pInst', pyId: ADDRS.pInst, type: 'instance', value: 'Point()', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'x', value: 3, type: 'int' },
            ] },
          ],
          highlight: ['pInst'],
        },
      },
      {
        title: '<code>self.y = y</code> — the instance now holds both attributes',
        desc: 'The instance <code>__dict__</code> has <code>x</code> and <code>y</code>. Methods stay on the class. That split is the whole mental model: data on the instance, behavior on the class.',
        lines: [4],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
            ]},
            { name: 'Point.__init__(self, x, y)', vars: [
              { name: 'self', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'normal' },
              { name: 'x', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'normal' },
              { name: 'y', ref: 'int4', pyId: ADDRS.int4, type: 'int', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7101b0', type: 'str' },
            ] },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 2, mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 2, mutable: false, state: 'normal' },
            { id: 'pInst', pyId: ADDRS.pInst, type: 'instance', value: 'Point()', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'x', value: 3, type: 'int' },
              { key: 'y', value: 4, type: 'int' },
            ] },
          ],
          highlight: ['pInst'],
        },
      },
      {
        title: '<code>p</code> is bound to the finished instance',
        desc: '<code>__init__</code> returns <code>None</code> (implicitly). The call frame disappears. The global name <code>p</code> now references the instance. <code>self</code> was just another name for that same object.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
            { name: 'p', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7101b0', type: 'str' },
            ] },
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'normal' },
            { id: 'pInst', pyId: ADDRS.pInst, type: 'instance', value: 'Point()', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'x', value: 3, type: 'int' },
              { key: 'y', value: 4, type: 'int' },
            ] },
          ],
          highlight: ['pInst'],
        },
      },
    ],
  },

  classAttr: {
    code: `class Player:
    lives = 3

a = Player()
b = Player()
a.score = 10
Player.lives = 2`,
    steps: [
      {
        title: 'Class attributes live on the class object',
        desc: '<code>lives = 3</code> is stored on <code>Player</code>, not copied into each instance. Both <code>a</code> and <code>b</code> will look it up on the class unless they shadow it.',
        lines: [1, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'new' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
          ],
          highlight: ['PlayerCls', 'intLives3'],
        },
      },
      {
        title: '<code>a = Player()</code> — empty instance dict',
        desc: 'The new instance has no <code>lives</code> of its own. Reading <code>a.lives</code> will walk from the instance to the class and find <code>3</code>.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'new', pairs: [] },
          ],
          highlight: ['aInst'],
        },
      },
      {
        title: '<code>b = Player()</code> — a second empty instance',
        desc: 'Two instances, one class attribute. <code>a.lives</code> and <code>b.lives</code> are the same lookup: instance dict (miss) → class dict (hit).',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal', pairs: [] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'new', pairs: [] },
          ],
          highlight: ['bInst', 'PlayerCls'],
        },
      },
      {
        title: '<code>a.score = 10</code> shadows only on <code>a</code>',
        desc: 'Assignment on an instance writes into <em>that</em> instance\'s <code>__dict__</code>. <code>b</code> has no <code>score</code>. Class attributes are unchanged.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: 1, mutable: false, state: 'new' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'score', value: 10, type: 'int' },
            ] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal', pairs: [] },
          ],
          highlight: ['aInst', 'intScore'],
        },
      },
      {
        title: '<code>Player.lives = 2</code> updates the shared class attribute',
        desc: 'Both instances still have no <code>lives</code> of their own, so both now see <code>2</code>. Changing a class attribute is visible to every instance that has not shadowed that name.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: 0, mutable: false, state: 'gc' },
            { id: 'intLives2', pyId: ADDRS.intLives2, type: 'int', value: 2, refcount: 1, mutable: false, state: 'new' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: 1, mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 1, mutable: true, state: 'mutated', pairs: [
              { key: 'lives', value: 2, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'score', value: 10, type: 'int' },
            ] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal', pairs: [] },
          ],
          highlight: ['PlayerCls', 'intLives2'],
        },
      },
    ],
  },

  method: {
    code: `class Greeter:
    def hello(self, name):
        return "hi " + name

g = Greeter()
fn = g.hello
msg = fn("Ada")`,
    steps: [
      {
        title: '<code>hello</code> lives on the class as a function',
        desc: 'A method defined in the class body is a plain function object stored on the class. Nothing is bound to an instance yet.',
        lines: [1, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 1, mutable: false, state: 'new' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
          ],
          highlight: ['helloFn', 'GreeterCls'],
        },
      },
      {
        title: '<code>g = Greeter()</code> — instance with no attributes',
        desc: 'The instance is empty. It can still find <code>hello</code> by looking on the class.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'normal' },
            { name: 'g', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 1, mutable: true, state: 'new', pairs: [] },
          ],
          highlight: ['gInst'],
        },
      },
      {
        title: '<code>fn = g.hello</code> creates a bound method',
        desc: 'Attribute access on the instance does not return the raw function. Python builds a <strong>bound method</strong> that already remembers <code>g</code> as <code>self</code>. That is why you write <code>g.hello("Ada")</code> with one argument, not two.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'normal' },
            { name: 'g', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'normal' },
            { name: 'fn', ref: 'boundHello', pyId: ADDRS.boundHello, type: 'method', state: 'new' },
          ]}],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 2, mutable: true, state: 'normal', pairs: [] },
            { id: 'boundHello', pyId: ADDRS.boundHello, type: 'method', value: 'bound hello', refcount: 1, mutable: false, state: 'new', pairs: [
              { key: '__func__', value: 'hello -> 0x7f7501b0', type: 'str' },
              { key: '__self__', value: 'g -> 0x7f760010', type: 'str' },
            ] },
          ],
          highlight: ['boundHello', 'gInst'],
        },
      },
      {
        title: '<code>fn("Ada")</code> calls the function with <code>self</code> already filled in',
        desc: 'The call frame receives <code>self</code> (the instance) and <code>name</code> (<code>"Ada"</code>). You did not pass <code>self</code> yourself — the bound method did.',
        lines: [7],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'normal' },
              { name: 'g', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'normal' },
              { name: 'fn', ref: 'boundHello', pyId: ADDRS.boundHello, type: 'method', state: 'normal' },
            ]},
            { name: 'hello(self, name)', vars: [
              { name: 'self', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'new' },
              { name: 'name', ref: 'strAda', pyId: ADDRS.strAda, type: 'str', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 3, mutable: true, state: 'normal', pairs: [] },
            { id: 'boundHello', pyId: ADDRS.boundHello, type: 'method', value: 'bound hello', refcount: 1, mutable: false, state: 'normal', pairs: [
              { key: '__func__', value: 'hello -> 0x7f7501b0', type: 'str' },
              { key: '__self__', value: 'g -> 0x7f760010', type: 'str' },
            ] },
            { id: 'strAda', pyId: ADDRS.strAda, type: 'str', value: 'Ada', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['gInst', 'strAda'],
        },
      },
      {
        title: '<code>msg</code> receives the returned string',
        desc: 'The method frame returns and disappears. The bound method can be called again later — it still remembers <code>g</code>. That is method binding in one sentence: a function plus a remembered instance.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'normal' },
            { name: 'g', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'normal' },
            { name: 'fn', ref: 'boundHello', pyId: ADDRS.boundHello, type: 'method', state: 'normal' },
            { name: 'msg', ref: 'strHi', pyId: ADDRS.strHi, type: 'str', state: 'new' },
          ]}],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 2, mutable: true, state: 'normal', pairs: [] },
            { id: 'boundHello', pyId: ADDRS.boundHello, type: 'method', value: 'bound hello', refcount: 1, mutable: false, state: 'normal', pairs: [
              { key: '__func__', value: 'hello -> 0x7f7501b0', type: 'str' },
              { key: '__self__', value: 'g -> 0x7f760010', type: 'str' },
            ] },
            { id: 'strHi', pyId: ADDRS.strHi, type: 'str', value: 'hi Ada', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['strHi', 'boundHello'],
        },
      },
    ],
  },

  sharedMut: {
    code: `class Box:
    def __init__(self, items):
        self.items = items

data = [1]
b = Box(data)
b.items.append(2)`,
    steps: [
      {
        title: '<code>data</code> is a list object',
        desc: 'Same rule as Session 03: the name <code>data</code> points at a mutable list. Passing it into <code>Box</code> will not copy it.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
            { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'str' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
            ] },
          ],
          highlight: ['dataList'],
        },
      },
      {
        title: '<code>Box(data)</code> — <code>self.items</code> aliases the same list',
        desc: '<code>__init__</code> stores a reference, not a copy. The instance attribute <code>items</code> and the global name <code>data</code> now point at one list. Refcount is 2.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
            { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'normal' },
            { name: 'b', ref: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'str' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'items', value: 'list -> 0x7f780010', type: 'str' },
            ] },
          ],
          highlight: ['boxInst', 'dataList'],
        },
      },
      {
        title: '<code>b.items.append(2)</code> mutates the shared list',
        desc: 'The instance did not get a new list. <code>data</code> sees <code>[1, 2]</code> as well. Storing a mutable object on <code>self</code> is the same aliasing rule you already know — just reached through an attribute.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
            { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'normal' },
            { name: 'b', ref: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'str' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: 'items', value: 'list -> 0x7f780010', type: 'str' },
            ] },
          ],
          highlight: ['dataList'],
        },
      },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '04-classes',
    demos: DEMOS,
    defaultDemo: 'create',
    defaultSpeed: 950,
  });
});
