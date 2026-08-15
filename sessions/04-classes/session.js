/* ============================================================
   SESSION 04 — Classes & Objects
   Demos: instance creation, class vs instance attrs,
   bound methods, mutable instance state, inheritance / MRO
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
  intLives1: '0x7f110011',
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

  AnimalCls: '0x7f7a00a0',
  speakFn:   '0x7f7a01b0',
  DogCls:    '0x7f7b00a0',
  dInst:     '0x7f7c0010',
  boundSpeak:'0x7f7c01c0',
  strHi2:    '0x7f2200cc',
};

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

function pointClass(state, refcount) {
  return {
    id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point',
    refcount, mutable: true, state,
    pairs: [{ key: '__init__', value: 'fn -> 0x7f7101b0', type: 'str' }],
  };
}

function pointInst(state, pairs, refcount, note) {
  return {
    id: 'pInst', pyId: ADDRS.pInst, type: 'instance', value: 'Point()',
    refcount, mutable: true, state,
    classRef: { name: 'Point', pyId: ADDRS.PointCls },
    pairs,
    note,
  };
}

const DEMOS = {
  create: {
    watch: 'Find <code>self</code> and <code>p</code>. Same address means the same instance. Methods stay on the class; <code>x</code> and <code>y</code> land in the instance <code>__dict__</code>.',
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
        desc: 'The method is a function object. It lives on the <strong>class</strong>, not on any instance. Instances will find it later by walking <code>__class__</code>.',
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
        title: '<code>Point(3, 4)</code> allocates an instance, then calls <code>__init__</code>',
        desc: 'Calling a class does two jobs: create a new instance (with <code>__class__</code> pointing at <code>Point</code>), then call <code>__init__</code> with that instance as <code>self</code>. The instance dict is still empty.',
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
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'new' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'new' },
            pointInst('new', [], 1, 'empty __dict__ — attributes will be written here'),
          ],
          highlight: ['pInst', 'int3', 'int4'],
        },
      },
      {
        title: '<code>self.x = x</code> writes into the instance <code>__dict__</code>',
        desc: 'This is not a local that stays on the instance. It stores a reference in the instance\'s attribute mapping. <code>self</code> still points at the same object. The class is unchanged.',
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
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 2, mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'normal' },
            pointInst('mutated', [{ key: 'x', value: 3, type: 'int' }], 1),
          ],
          highlight: ['pInst'],
        },
      },
      {
        title: '<code>self.y = y</code> — data on the instance, behavior on the class',
        desc: 'The instance now holds <code>x</code> and <code>y</code>. Methods stay on the class. That split is the whole mental model. <code>type(p)</code> is still <code>Point</code> via <code>__class__</code>.',
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
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 2, mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 2, mutable: false, state: 'normal' },
            pointInst('mutated', [
              { key: 'x', value: 3, type: 'int' },
              { key: 'y', value: 4, type: 'int' },
            ], 1),
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
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: 1, mutable: false, state: 'normal' },
            pointInst('normal', [
              { key: 'x', value: 3, type: 'int' },
              { key: 'y', value: 4, type: 'int' },
            ], 1),
          ],
          highlight: ['pInst'],
        },
      },
    ],
  },

  classAttr: {
    watch: 'Empty instance dicts still read <code>lives</code> from the class. Assignment on <code>a</code> writes only into <code>a</code>.',
    code: `class Player:
    lives = 3

a = Player()
b = Player()
a.score = 10
Player.lives = 2
a.lives = 1`,
    steps: [
      {
        title: 'Initial state — no class yet',
        desc: 'A class attribute is just a name stored on the class object. Watch where <code>lives</code> lives as instances appear.',
        lines: [],
        memory: EMPTY,
      },
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
        desc: 'The new instance has no <code>lives</code> of its own. Reading <code>a.lives</code> walks instance → class via <code>__class__</code> and finds <code>3</code>.',
        lines: [4],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [],
              note: 'lookup miss here → walk to Player' },
          ],
          highlight: ['aInst'],
        },
      },
      {
        title: '<code>b = Player()</code> — a second empty instance',
        desc: 'Two instances, one class attribute. <code>a.lives</code> and <code>b.lives</code> are the same lookup: instance dict (miss) → class dict (hit). They are not copies of <code>3</code>.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: 1, mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [] },
          ],
          highlight: ['bInst', 'PlayerCls'],
        },
      },
      {
        title: '<code>a.score = 10</code> writes only on <code>a</code>',
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
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'mutated',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls },
              pairs: [{ key: 'score', value: 10, type: 'int' }] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [] },
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
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'mutated', pairs: [
              { key: 'lives', value: 2, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls },
              pairs: [{ key: 'score', value: 10, type: 'int' }] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [] },
          ],
          highlight: ['PlayerCls', 'intLives2'],
        },
      },
      {
        title: '<code>a.lives = 1</code> shadows the class name on <code>a</code> only',
        desc: 'Now <code>a.lives</code> hits the instance dict and stops. <code>b.lives</code> still walks to the class and sees <code>2</code>. Assignment does not edit the class attribute — it hides it for one instance.',
        lines: [8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives2', pyId: ADDRS.intLives2, type: 'int', value: 2, refcount: 1, mutable: false, state: 'normal' },
            { id: 'intLives1', pyId: ADDRS.intLives1, type: 'int', value: 1, refcount: 1, mutable: false, state: 'new' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: 1, mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 2, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'mutated',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls },
              pairs: [
                { key: 'score', value: 10, type: 'int' },
                { key: 'lives', value: 1, type: 'int' },
              ],
              note: 'a.lives hits here and stops' },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [],
              note: 'b.lives still walks to Player.lives' },
          ],
          highlight: ['aInst', 'intLives1'],
        },
      },
    ],
  },

  method: {
    watch: 'The function lives on the class. <code>g.hello</code> is a new object that already remembers <code>g</code> as <code>self</code>.',
    code: `class Greeter:
    def hello(self, name):
        return "hi " + name

g = Greeter()
fn = g.hello
msg = fn("Ada")`,
    steps: [
      {
        title: 'Initial state — no class yet',
        desc: 'A method defined in a class body is a function object. Binding happens later, when you access it on an instance.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>hello</code> lives on the class as a function',
        desc: 'Nothing is bound to an instance yet. <code>Greeter.hello</code> is the raw function — you would have to pass the instance yourself.',
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
        desc: 'The instance is empty. It can still find <code>hello</code> by following <code>__class__</code> to <code>Greeter</code>.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'normal' },
            { name: 'g', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
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
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
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
        desc: 'The call frame receives <code>self</code> (the instance) and <code>name</code> (<code>"Ada"</code>). You did not pass <code>self</code> yourself — the bound method did. Compare addresses: <code>self</code> is <code>g</code>.',
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
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
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
        desc: 'The method frame returns and disappears. The bound method can be called again later — it still remembers <code>g</code>. Method binding in one sentence: a function plus a remembered instance.',
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
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'str' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
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
    watch: 'The list address on <code>self.items</code> should match <code>data</code>. <code>append</code> mutates that one list.',
    code: `class Box:
    def __init__(self, items):
        self.items = items

data = [1]
b = Box(data)
b.items.append(2)`,
    steps: [
      {
        title: 'Initial state — class already defined in this story',
        desc: 'Same rule as Session 03: storing a list on <code>self</code> is still aliasing. We start from an empty global, then build the class.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>class Box</code> stores <code>__init__</code> on the class',
        desc: 'No instance yet. The function that will write <code>self.items</code> lives on <code>Box</code>.',
        lines: [1, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'new' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'str' },
            ] },
          ],
          highlight: ['BoxCls'],
        },
      },
      {
        title: '<code>data</code> is a list object',
        desc: 'The name <code>data</code> points at a mutable list. Passing it into <code>Box</code> will not copy it.',
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
        desc: 'Inside <code>__init__</code>, <code>items</code> and <code>data</code> are already the same object. <code>self.items = items</code> stores that reference on the instance. Refcount becomes 2 after the frame returns — plus the instance attribute.',
        lines: [6, 3],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
              { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'normal' },
            ]},
            { name: 'Box.__init__(self, items)', vars: [
              { name: 'self', ref: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', state: 'new' },
              { name: 'items', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'str' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 3, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'mutated',
              classRef: { name: 'Box', pyId: ADDRS.BoxCls },
              pairs: [{ key: 'items', value: 'list -> 0x7f780010', type: 'str' }] },
          ],
          highlight: ['boxInst', 'dataList'],
        },
      },
      {
        title: 'After <code>__init__</code>, two names still share one list',
        desc: 'The call frame is gone. <code>data</code> and <code>b.items</code> still point at <code>0x7f780010</code>. The instance did not get a private copy.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
            { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'normal' },
            { name: 'b', ref: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'str' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Box', pyId: ADDRS.BoxCls },
              pairs: [{ key: 'items', value: 'list -> 0x7f780010', type: 'str' }] },
          ],
          highlight: ['boxInst', 'dataList'],
        },
      },
      {
        title: '<code>b.items.append(2)</code> mutates the shared list',
        desc: '<code>data</code> sees <code>[1, 2]</code> as well. Storing a mutable object on <code>self</code> is the same aliasing rule you already know — just reached through an attribute. Copy in <code>__init__</code> if you need independence: <code>self.items = list(items)</code>.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
            { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'normal' },
            { name: 'b', ref: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'str' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Box', pyId: ADDRS.BoxCls },
              pairs: [{ key: 'items', value: 'list -> 0x7f780010', type: 'str' }] },
          ],
          highlight: ['dataList'],
        },
      },
    ],
  },

  inherit: {
    watch: '<code>Dog</code> has no <code>speak</code>. Follow <code>d.__class__</code> → <code>Dog</code> → <code>__bases__</code> → <code>Animal</code>.',
    code: `class Animal:
    def speak(self):
        return "hi"

class Dog(Animal):
    pass

d = Dog()
msg = d.speak()`,
    steps: [
      {
        title: 'Initial state — two classes will appear',
        desc: 'Inheritance is attribute lookup with an extra stop. The subclass does not copy methods. It remembers its bases and walks them.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>Animal.speak</code> lives on the base class',
        desc: 'A normal class with one function in its namespace. <code>Dog</code> does not exist yet.',
        lines: [1, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 1, mutable: false, state: 'new' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'str' },
            ] },
          ],
          highlight: ['AnimalCls', 'speakFn'],
        },
      },
      {
        title: '<code>class Dog(Animal)</code> — a subclass with an empty namespace',
        desc: '<code>Dog</code> is a different class object. It does not copy <code>speak</code>. It records <code>Animal</code> in <code>__bases__</code>. The method resolution order (MRO) is <code>Dog → Animal → object</code>.',
        lines: [5, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'normal' },
            { name: 'Dog', ref: 'DogCls', pyId: ADDRS.DogCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'str' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 1, mutable: true, state: 'new',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }],
              pairs: [],
              note: 'speak is not copied here — lookup walks to Animal' },
          ],
          highlight: ['DogCls'],
        },
      },
      {
        title: '<code>d = Dog()</code> — instance type is <code>Dog</code>, not <code>Animal</code>',
        desc: '<code>d.__class__</code> is <code>Dog</code>. The instance dict is empty. <code>type(d) is Dog</code> is true. Inheritance will show up only when we look up a name.',
        lines: [8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'normal' },
            { name: 'Dog', ref: 'DogCls', pyId: ADDRS.DogCls, type: 'class', state: 'normal' },
            { name: 'd', ref: 'dInst', pyId: ADDRS.dInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'str' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 2, mutable: true, state: 'normal',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }], pairs: [] },
            { id: 'dInst', pyId: ADDRS.dInst, type: 'instance', value: 'Dog()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Dog', pyId: ADDRS.DogCls }, pairs: [],
              note: 'd.speak starts here, then Dog, then Animal' },
          ],
          highlight: ['dInst'],
        },
      },
      {
        title: '<code>d.speak</code> misses twice, then binds <code>self</code>',
        desc: 'Lookup: instance dict (miss) → <code>Dog</code> (miss) → <code>Animal</code> (hit). Python then builds a bound method whose <code>__self__</code> is <code>d</code>, not some generic Animal. The function still lives on <code>Animal</code>.',
        lines: [9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'normal' },
            { name: 'Dog', ref: 'DogCls', pyId: ADDRS.DogCls, type: 'class', state: 'normal' },
            { name: 'd', ref: 'dInst', pyId: ADDRS.dInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'str' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 2, mutable: true, state: 'normal',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }], pairs: [] },
            { id: 'dInst', pyId: ADDRS.dInst, type: 'instance', value: 'Dog()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Dog', pyId: ADDRS.DogCls }, pairs: [] },
            { id: 'boundSpeak', pyId: ADDRS.boundSpeak, type: 'method', value: 'bound speak', refcount: 1, mutable: false, state: 'new', pairs: [
              { key: '__func__', value: 'speak -> 0x7f7a01b0', type: 'str' },
              { key: '__self__', value: 'd -> 0x7f7c0010', type: 'str' },
            ] },
          ],
          highlight: ['boundSpeak', 'AnimalCls', 'dInst'],
        },
      },
      {
        title: 'The call runs with <code>self</code> bound to the <code>Dog</code> instance',
        desc: 'Even though the function was found on <code>Animal</code>, <code>self</code> is <code>d</code>. That is how a base method can use subclass state: it receives the actual instance.',
        lines: [2, 3, 9],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'normal' },
              { name: 'Dog', ref: 'DogCls', pyId: ADDRS.DogCls, type: 'class', state: 'normal' },
              { name: 'd', ref: 'dInst', pyId: ADDRS.dInst, type: 'instance', state: 'normal' },
            ]},
            { name: 'speak(self)', vars: [
              { name: 'self', ref: 'dInst', pyId: ADDRS.dInst, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'str' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 2, mutable: true, state: 'normal',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }], pairs: [] },
            { id: 'dInst', pyId: ADDRS.dInst, type: 'instance', value: 'Dog()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Dog', pyId: ADDRS.DogCls }, pairs: [] },
            { id: 'boundSpeak', pyId: ADDRS.boundSpeak, type: 'method', value: 'bound speak', refcount: 1, mutable: false, state: 'normal', pairs: [
              { key: '__func__', value: 'speak -> 0x7f7a01b0', type: 'str' },
              { key: '__self__', value: 'd -> 0x7f7c0010', type: 'str' },
            ] },
          ],
          highlight: ['dInst'],
        },
      },
      {
        title: '<code>msg</code> is the returned string — the classes did not change',
        desc: 'No method was copied onto <code>d</code> or <code>Dog</code>. Inheritance is a search path. If <code>Dog</code> later defined its own <code>speak</code>, lookup would stop there and shadow the base.',
        lines: [9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'normal' },
            { name: 'Dog', ref: 'DogCls', pyId: ADDRS.DogCls, type: 'class', state: 'normal' },
            { name: 'd', ref: 'dInst', pyId: ADDRS.dInst, type: 'instance', state: 'normal' },
            { name: 'msg', ref: 'strHi2', pyId: ADDRS.strHi2, type: 'str', state: 'new' },
          ]}],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'str' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 2, mutable: true, state: 'normal',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }], pairs: [] },
            { id: 'dInst', pyId: ADDRS.dInst, type: 'instance', value: 'Dog()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Dog', pyId: ADDRS.DogCls }, pairs: [] },
            { id: 'strHi2', pyId: ADDRS.strHi2, type: 'str', value: 'hi', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['strHi2'],
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
