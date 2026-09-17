/* ============================================================
   SESSION 04: Classes & Objects
   Demos: instance creation, class vs instance attrs,
   bound methods, mutable instance state, inheritance / MRO
   ============================================================ */

'use strict';

const ADDRS = {
  PointCls:  '0x7f7100a0',
  initFn:    '0x7f7101b0',
  totalFn:   '0x7f7101c0',
  int3:      '0x7f110003',
  int4:      '0x7f110004',
  int7:      '0x7f110007',
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

/* Cached small ints (-5..256) are pre-created by CPython and never freed.
   Drawn with an infinite refcount, exactly as Sessions 01 and 02 draw them. */
const CACHED_INT_NOTE = 'cached small int: CPython pre-creates -5 to 256 and never frees them';

const EMPTY = {
  frames: [{ name: 'global', vars: [] }],
  heap: [],
  highlight: [],
};

function pointClass(state, refcount) {
  return {
    id: 'PointCls', pyId: ADDRS.PointCls, type: 'class', value: 'class Point',
    refcount, mutable: true, state,
    pairs: [
      { key: '__init__', value: 'fn -> 0x7f7101b0', type: 'ref' },
      { key: 'total', value: 'fn -> 0x7f7101c0', type: 'ref' },
    ],
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
    watch: 'Find <code>self</code> and <code>p</code>. The same address means the same instance. Both functions stay on the class, <code>x</code> and <code>y</code> land in the instance <code>__dict__</code>, and <code>total</code> reads them straight back out.',
    code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def total(self):
        return self.x + self.y

p = Point(3, 4)
t = p.total()`,
    steps: [
      {
        title: 'Initial state: only the global frame',
        desc: 'No class exists yet. A <code>class</code> statement is executable code, just like <code>def</code>. Press Next to watch Python build the class, then the instance.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'The class body runs, then <code>Point</code> gets its name',
        desc: 'The order matters, and it is the opposite of what most people guess. Python runs the indented body first, which creates the two <strong>function objects</strong> and collects them in a fresh namespace. Only when the body finishes does Python build the <strong>class object</strong> and bind the name <code>Point</code> to it. There\'s no moment where you can see a half-built <code>Point</code>.',
        lines: [1, 2, 3, 4, 6, 7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'new' },
            { id: 'totalFn', pyId: ADDRS.totalFn, type: 'function', value: 'Point.total(self)', refcount: 1, mutable: false, state: 'new' },
            pointClass('new', 1),
          ],
          highlight: ['PointCls', 'initFn', 'totalFn'],
        },
      },
      {
        title: '<code>Point(3, 4)</code> allocates an instance, then calls <code>__init__</code>',
        desc: 'Calling a class does two jobs: create a new instance (with <code>__class__</code> pointing at <code>Point</code>), then call <code>__init__</code> with that instance as <code>self</code>. The instance dict is still empty. <code>x</code> and <code>y</code> bind to the cached <code>3</code> and <code>4</code> from Session 01, so nothing new is built for them.',
        lines: [9],
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
            { id: 'totalFn', pyId: ADDRS.totalFn, type: 'function', value: 'Point.total(self)', refcount: 1, mutable: false, state: 'normal' },
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'new', note: CACHED_INT_NOTE },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: '∞', mutable: false, state: 'new' },
            pointInst('new', [], 1, 'empty __dict__, attributes will be written here'),
          ],
          highlight: ['pInst', 'int3', 'int4'],
        },
      },
      {
        title: '<code>self.x = x</code> writes into the instance <code>__dict__</code>',
        desc: 'This isn\'t a local that stays on the instance. It stores a reference in the instance\'s attribute mapping. <code>self</code> still points at the same object, and the class is unchanged.',
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
            { id: 'totalFn', pyId: ADDRS.totalFn, type: 'function', value: 'Point.total(self)', refcount: 1, mutable: false, state: 'normal' },
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: '∞', mutable: false, state: 'normal' },
            pointInst('mutated', [{ key: 'x', value: 3, type: 'int' }], 1),
          ],
          highlight: ['pInst'],
        },
      },
      {
        title: '<code>self.y = y</code>: data on the instance, behaviour on the class',
        desc: 'The instance now holds <code>x</code> and <code>y</code>. The methods stay on the class. That split is the mental model in one line. <code>type(p)</code> is still <code>Point</code>, through <code>__class__</code>.',
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
            { id: 'totalFn', pyId: ADDRS.totalFn, type: 'function', value: 'Point.total(self)', refcount: 1, mutable: false, state: 'normal' },
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: '∞', mutable: false, state: 'normal' },
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
        desc: '<code>__init__</code> returns <code>None</code> (implicitly). The call frame disappears, and the global name <code>p</code> now refers to the instance. <code>self</code> was just another name for the same object.',
        lines: [9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
            { name: 'p', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'totalFn', pyId: ADDRS.totalFn, type: 'function', value: 'Point.total(self)', refcount: 1, mutable: false, state: 'normal' },
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: '∞', mutable: false, state: 'normal' },
            pointInst('normal', [
              { key: 'x', value: 3, type: 'int' },
              { key: 'y', value: 4, type: 'int' },
            ], 1),
          ],
          highlight: ['pInst'],
        },
      },
      {
        title: '<code>p.total()</code>: the method reads back out of the instance',
        desc: 'This is why <code>x</code> and <code>y</code> were stored on the instance. The function lives on <code>Point</code>, but its <code>self</code> is <em>this</em> point, so <code>self.x</code> and <code>self.y</code> reach into <em>this</em> instance dict and find <code>3</code> and <code>4</code>. Change the point and the same shared function returns a different answer.',
        lines: [10, 7],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
              { name: 'p', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'normal' },
            ]},
            { name: 'Point.total(self)', vars: [
              { name: 'self', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'totalFn', pyId: ADDRS.totalFn, type: 'function', value: 'Point.total(self)', refcount: 2, mutable: false, state: 'normal' },
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: '∞', mutable: false, state: 'normal' },
            pointInst('normal', [
              { key: 'x', value: 3, type: 'int' },
              { key: 'y', value: 4, type: 'int' },
            ], 2, 'self.x and self.y are read from here'),
          ],
          highlight: ['pInst', 'int3', 'int4'],
        },
      },
      {
        title: 'Final state: data on the instance, functions on the class',
        desc: 'The frame is gone and <code>t</code> holds <code>7</code>. Look at the finished picture: one class object holding two functions, and one instance holding <code>x</code> and <code>y</code> plus a <code>__class__</code> link back. Make a thousand points and you still have two function objects.',
        lines: [10],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls', pyId: ADDRS.PointCls, type: 'class', state: 'normal' },
            { name: 'p', ref: 'pInst', pyId: ADDRS.pInst, type: 'instance', state: 'normal' },
            { name: 't', ref: 'int7', pyId: ADDRS.int7, type: 'int', state: 'new' },
          ]}],
          heap: [
            { id: 'initFn', pyId: ADDRS.initFn, type: 'function', value: 'Point.__init__(self, x, y)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'totalFn', pyId: ADDRS.totalFn, type: 'function', value: 'Point.total(self)', refcount: 1, mutable: false, state: 'normal' },
            pointClass('normal', 2),
            { id: 'int3', pyId: ADDRS.int3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int4', pyId: ADDRS.int4, type: 'int', value: 4, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'int7', pyId: ADDRS.int7, type: 'int', value: 7, refcount: '∞', mutable: false, state: 'new', note: 'cached small int: the addition found it rather than building it' },
            pointInst('normal', [
              { key: 'x', value: 3, type: 'int' },
              { key: 'y', value: 4, type: 'int' },
            ], 1),
          ],
          highlight: ['int7', 'pInst'],
        },
      },
    ],
  },

  classAttr: {
    watch: 'Every <code>print</code> here is a lookup. Watch it miss on the instance and land on the class, until <code>a</code> gets a <code>lives</code> of its own.',
    code: `class Player:
    lives = 3

a = Player()
b = Player()
a.score = 10
print(a.lives, b.lives)
Player.lives = 2
print(a.lives, b.lives)
a.lives = 1
print(a.lives, b.lives)`,
    steps: [
      {
        title: 'Initial state: no class yet',
        desc: 'A class attribute is a name stored on the class object. Watch where <code>lives</code> lives as instances appear, and watch each <code>print</code> go looking for it.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'Class attributes live on the class object',
        desc: '<code>lives = 3</code> is stored on <code>Player</code>, not copied into each instance. The <code>3</code> is one of the pre-created small integers from Session 01, shared by everything that needs a 3 and never freed.',
        lines: [1, 2],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'new',
              note: 'small int, pre-created and immortal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
          ],
          highlight: ['PlayerCls', 'intLives3'],
        },
      },
      {
        title: 'Two instances, both with empty dicts',
        desc: 'Neither <code>a</code> nor <code>b</code> has a <code>lives</code> of its own. Nothing was copied down from the class. Each instance carries only a <code>__class__</code> link back to <code>Player</code>.',
        lines: [4, 5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'new' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'new' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [] },
          ],
          highlight: ['aInst', 'bInst'],
        },
      },
      {
        title: '<code>a.score = 10</code> writes only on <code>a</code>',
        desc: 'Assignment on an instance doesn\'t go looking anywhere. It writes straight into <em>that</em> instance\'s <code>__dict__</code>. <code>b</code> has no <code>score</code>, and neither does the class.',
        lines: [6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'new' },
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
        title: 'The first <code>print</code>: both reads miss, then hit the class',
        desc: 'This is the lookup the demo exists for. <code>a.lives</code> checks <code>a</code>\'s own dict (only <code>score</code> is there, so it misses), follows <code>__class__</code> to <code>Player</code>, and hits. <code>b.lives</code> takes the same walk. Output: <code>3 3</code>. Both arrive at the one <code>3</code> object, not at a copy each.',
        lines: [7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal',
              note: 'both reads end here' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 3, type: 'int' },
            ], note: 'hit, the walk stops here' },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls },
              pairs: [{ key: 'score', value: 10, type: 'int' }],
              note: 'miss, walk on to Player' },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [],
              note: 'miss, walk on to Player' },
          ],
          highlight: ['aInst', 'bInst', 'PlayerCls'],
        },
      },
      {
        title: '<code>Player.lives = 2</code> repoints the shared class attribute',
        desc: 'The class dict now refers to the <code>2</code> object instead of the <code>3</code>. Notice what does <em>not</em> happen: the <code>3</code> isn\'t destroyed. CPython pre-creates every small integer from -5 to 256 and keeps them alive for the whole run. Nothing points at this one right now, and it stays anyway.',
        lines: [8],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal',
              note: 'still here, small ints are never freed' },
            { id: 'intLives2', pyId: ADDRS.intLives2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'new' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'mutated', pairs: [
              { key: 'lives', value: 2, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls },
              pairs: [{ key: 'score', value: 10, type: 'int' }] },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [] },
          ],
          highlight: ['PlayerCls', 'intLives2', 'intLives3'],
        },
      },
      {
        title: 'The second <code>print</code>: one edit, both instances see it',
        desc: 'Same walk as before, a miss on the instance and a hit on the class. But the class now points at <code>2</code>, so the output is <code>2 2</code>. Neither instance was touched. That\'s what "shared" really means. They were never holding a value, only a route to one.',
        lines: [9],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'intLives2', pyId: ADDRS.intLives2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 2, type: 'int' },
            ], note: 'both reads hit here' },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls },
              pairs: [{ key: 'score', value: 10, type: 'int' }],
              note: 'miss, walk on to Player' },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [],
              note: 'miss, walk on to Player' },
          ],
          highlight: ['aInst', 'bInst', 'PlayerCls'],
        },
      },
      {
        title: 'Final state: <code>a</code> shadows the name, <code>b</code> still walks',
        desc: '<code>a.lives = 1</code> wrote into <code>a</code>\'s own dict, so the last <code>print</code> gives <code>1 2</code>. <code>a</code> hits on itself and stops, and <code>b</code> walks to the class as it always did. That\'s the rule in one picture: reading walks outward, writing stays home, and an instance assignment hides a class attribute instead of changing it.',
        lines: [10, 11],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Player', ref: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', state: 'normal' },
            { name: 'a', ref: 'aInst', pyId: ADDRS.aInst, type: 'instance', state: 'normal' },
            { name: 'b', ref: 'bInst', pyId: ADDRS.bInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'intLives3', pyId: ADDRS.intLives3, type: 'int', value: 3, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'intLives2', pyId: ADDRS.intLives2, type: 'int', value: 2, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'intLives1', pyId: ADDRS.intLives1, type: 'int', value: 1, refcount: '∞', mutable: false, state: 'new' },
            { id: 'intScore', pyId: ADDRS.intScore, type: 'int', value: 10, refcount: '∞', mutable: false, state: 'normal' },
            { id: 'PlayerCls', pyId: ADDRS.PlayerCls, type: 'class', value: 'class Player', refcount: 3, mutable: true, state: 'normal', pairs: [
              { key: 'lives', value: 2, type: 'int' },
            ] },
            { id: 'aInst', pyId: ADDRS.aInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'mutated',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls },
              pairs: [
                { key: 'score', value: 10, type: 'int' },
                { key: 'lives', value: 1, type: 'int' },
              ],
              note: 'a.lives hits here and stops, so it prints 1' },
            { id: 'bInst', pyId: ADDRS.bInst, type: 'instance', value: 'Player()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Player', pyId: ADDRS.PlayerCls }, pairs: [],
              note: 'b.lives still walks to Player.lives, so it prints 2' },
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
        title: 'Initial state: no class yet',
        desc: 'A method defined in a class body is a function object. The binding happens later, when you access it on an instance.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>hello</code> lives on the class as a function',
        desc: 'Nothing is bound to an instance yet. <code>Greeter.hello</code> is the raw function, and you would have to pass the instance yourself.',
        lines: [1, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 1, mutable: false, state: 'new' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'ref' },
            ] },
          ],
          highlight: ['helloFn', 'GreeterCls'],
        },
      },
      {
        title: '<code>g = Greeter()</code>: an instance with no attributes',
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
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'ref' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
          ],
          highlight: ['gInst'],
        },
      },
      {
        title: '<code>fn = g.hello</code> creates a bound method',
        desc: 'Attribute access on the instance doesn\'t return the raw function. Python builds a <strong>bound method</strong> that already remembers <code>g</code> as <code>self</code>. That\'s why you write <code>g.hello("Ada")</code> with one argument, not two.',
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
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'ref' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
            { id: 'boundHello', pyId: ADDRS.boundHello, type: 'method', value: 'bound hello', refcount: 1, mutable: false, state: 'new', pairs: [
              { key: '__func__', value: 'hello -> 0x7f7501b0', type: 'ref' },
              { key: '__self__', value: 'g -> 0x7f760010', type: 'ref' },
            ] },
          ],
          highlight: ['boundHello', 'gInst'],
        },
      },
      {
        title: '<code>fn("Ada")</code> calls the function with <code>self</code> already filled in',
        desc: 'The call frame receives <code>self</code> (the instance) and <code>name</code> (<code>"Ada"</code>). You didn\'t pass <code>self</code> yourself. The bound method did. Compare the addresses: <code>self</code> is <code>g</code>.',
        lines: [7],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Greeter', ref: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', state: 'normal' },
              { name: 'g', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'normal' },
              { name: 'fn', ref: 'boundHello', pyId: ADDRS.boundHello, type: 'method', state: 'normal' },
            ]},
            { name: 'Greeter.hello(self, name)', vars: [
              { name: 'self', ref: 'gInst', pyId: ADDRS.gInst, type: 'instance', state: 'new' },
              { name: 'name', ref: 'strAda', pyId: ADDRS.strAda, type: 'str', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'helloFn', pyId: ADDRS.helloFn, type: 'function', value: 'Greeter.hello(self, name)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'GreeterCls', pyId: ADDRS.GreeterCls, type: 'class', value: 'class Greeter', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'ref' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
            { id: 'boundHello', pyId: ADDRS.boundHello, type: 'method', value: 'bound hello', refcount: 1, mutable: false, state: 'normal', pairs: [
              { key: '__func__', value: 'hello -> 0x7f7501b0', type: 'ref' },
              { key: '__self__', value: 'g -> 0x7f760010', type: 'ref' },
            ] },
            { id: 'strAda', pyId: ADDRS.strAda, type: 'str', value: 'Ada', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['gInst', 'strAda'],
        },
      },
      {
        title: '<code>msg</code> receives the returned string',
        desc: 'The method frame returns and disappears. The bound method can be called again later, and it still remembers <code>g</code>. Method binding in one sentence: a function plus a remembered instance.',
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
              { key: 'hello', value: 'fn -> 0x7f7501b0', type: 'ref' },
            ] },
            { id: 'gInst', pyId: ADDRS.gInst, type: 'instance', value: 'Greeter()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Greeter', pyId: ADDRS.GreeterCls }, pairs: [] },
            { id: 'boundHello', pyId: ADDRS.boundHello, type: 'method', value: 'bound hello', refcount: 1, mutable: false, state: 'normal', pairs: [
              { key: '__func__', value: 'hello -> 0x7f7501b0', type: 'ref' },
              { key: '__self__', value: 'g -> 0x7f760010', type: 'ref' },
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
        title: 'Initial state: no class yet',
        desc: 'Same rule as Session 03: storing a list on <code>self</code> is still aliasing. We start from an empty global frame, then build the class.',
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
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'ref' },
            ] },
          ],
          highlight: ['BoxCls'],
        },
      },
      {
        title: '<code>data</code> is a list object',
        desc: 'The name <code>data</code> points at a mutable list. Passing it into <code>Box</code> won\'t copy it.',
        lines: [5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
            { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'new' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 1, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'ref' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
            ] },
          ],
          highlight: ['dataList'],
        },
      },
      {
        title: '<code>Box(data)</code>: <code>self.items</code> aliases the same list',
        desc: 'Inside <code>__init__</code>, <code>items</code> and <code>data</code> are already the same object. <code>self.items = items</code> stores that reference on the instance. Three names reach this one list right now: the global <code>data</code>, the local <code>items</code>, and <code>self.items</code>. When the frame returns the local goes away and the count drops to 2.',
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
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'ref' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 3, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'mutated',
              classRef: { name: 'Box', pyId: ADDRS.BoxCls },
              pairs: [{ key: 'items', value: 'list -> 0x7f780010', type: 'ref' }] },
          ],
          highlight: ['boxInst', 'dataList'],
        },
      },
      {
        title: 'After <code>__init__</code>, two names still share one list',
        desc: 'The call frame is gone. <code>data</code> and <code>b.items</code> still point at <code>0x7f780010</code>. The instance didn\'t get a private copy.',
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
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'ref' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Box', pyId: ADDRS.BoxCls },
              pairs: [{ key: 'items', value: 'list -> 0x7f780010', type: 'ref' }] },
          ],
          highlight: ['boxInst', 'dataList'],
        },
      },
      {
        title: '<code>b.items.append(2)</code> mutates the shared list',
        desc: '<code>data</code> sees <code>[1, 2]</code> as well. Storing a mutable object on <code>self</code> is the same aliasing rule you already know, reached through an attribute this time. Copy in <code>__init__</code> if you need independence: <code>self.items = list(items)</code>.',
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
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'ref' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 2, mutable: true, state: 'mutated', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ] },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Box', pyId: ADDRS.BoxCls },
              pairs: [{ key: 'items', value: 'list -> 0x7f780010', type: 'ref' }] },
          ],
          highlight: ['dataList'],
        },
      },
      {
        title: 'Final state: one list, reached by two different routes',
        desc: 'Count the list objects on the heap: there is one, with a refcount of 2. <code>data</code> reaches it by name and <code>b.items</code> reaches it through an attribute. An attribute isn\'t a container, it\'s another reference, so everything Session 03 taught about aliasing applies here unchanged.',
        lines: [3, 5, 7],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Box', ref: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', state: 'normal' },
            { name: 'data', ref: 'dataList', pyId: ADDRS.dataList, type: 'list', state: 'normal' },
            { name: 'b', ref: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            { id: 'boxInit', pyId: ADDRS.boxInit, type: 'function', value: 'Box.__init__(self, items)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'BoxCls', pyId: ADDRS.BoxCls, type: 'class', value: 'class Box', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: '__init__', value: 'fn -> 0x7f7701b0', type: 'ref' },
            ] },
            { id: 'dataList', pyId: ADDRS.dataList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
            ], note: 'one object, data and b.items both point here' },
            { id: 'boxInst', pyId: ADDRS.boxInst, type: 'instance', value: 'Box()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Box', pyId: ADDRS.BoxCls },
              pairs: [{ key: 'items', value: 'list -> 0x7f780010', type: 'ref' }] },
          ],
          highlight: [],
        },
      },
    ],
  },

  inherit: {
    watch: '<code>Dog</code> has no <code>speak</code>. Follow <code>d.__class__</code> to <code>Dog</code>, then <code>__bases__</code> to <code>Animal</code>.',
    code: `class Animal:
    def speak(self):
        return "hi"

class Dog(Animal):
    pass

d = Dog()
msg = d.speak()`,
    steps: [
      {
        title: 'Initial state: two classes will appear',
        desc: 'Inheritance is attribute lookup with an extra stop. The subclass doesn\'t copy methods. It remembers its bases and walks them.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>Animal.speak</code> lives on the base class',
        desc: 'A normal class with one function in its namespace. <code>Dog</code> doesn\'t exist yet.',
        lines: [1, 2, 3],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 1, mutable: false, state: 'new' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 1, mutable: true, state: 'new', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'ref' },
            ] },
          ],
          highlight: ['AnimalCls', 'speakFn'],
        },
      },
      {
        title: '<code>class Dog(Animal)</code>: a subclass with an empty namespace',
        desc: '<code>Dog</code> is a different class object. It doesn\'t copy <code>speak</code>. It records <code>Animal</code> in <code>__bases__</code>. The method resolution order (MRO) is <code>Dog</code>, then <code>Animal</code>, then <code>object</code>.',
        lines: [5, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'normal' },
            { name: 'Dog', ref: 'DogCls', pyId: ADDRS.DogCls, type: 'class', state: 'new' },
          ]}],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 1, mutable: false, state: 'normal' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'ref' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 1, mutable: true, state: 'new',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }],
              pairs: [],
              note: 'speak is not copied here, lookup walks on to Animal' },
          ],
          highlight: ['DogCls'],
        },
      },
      {
        title: '<code>d = Dog()</code>: the instance\'s type is <code>Dog</code>, not <code>Animal</code>',
        desc: '<code>d.__class__</code> is <code>Dog</code>. The instance dict is empty, and <code>type(d) is Dog</code> is true. Inheritance only shows up when we look up a name.',
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
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'ref' },
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
        desc: 'The lookup goes instance dict (miss), <code>Dog</code> (miss), <code>Animal</code> (hit). Python then builds a bound method whose <code>__self__</code> is <code>d</code>, not some generic Animal. The function still lives on <code>Animal</code>.',
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
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'ref' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 2, mutable: true, state: 'normal',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }], pairs: [] },
            { id: 'dInst', pyId: ADDRS.dInst, type: 'instance', value: 'Dog()', refcount: 2, mutable: true, state: 'normal',
              classRef: { name: 'Dog', pyId: ADDRS.DogCls }, pairs: [] },
            { id: 'boundSpeak', pyId: ADDRS.boundSpeak, type: 'method', value: 'bound speak', refcount: 1, mutable: false, state: 'new', pairs: [
              { key: '__func__', value: 'speak -> 0x7f7a01b0', type: 'ref' },
              { key: '__self__', value: 'd -> 0x7f7c0010', type: 'ref' },
            ] },
          ],
          highlight: ['boundSpeak', 'AnimalCls', 'dInst'],
        },
      },
      {
        title: 'The call runs with <code>self</code> bound to the <code>Dog</code> instance',
        desc: 'Even though the function was found on <code>Animal</code>, <code>self</code> is <code>d</code>. That\'s how a base method can use subclass state: it receives the actual instance.',
        lines: [2, 3, 9],
        memory: {
          frames: [
            { name: 'global', vars: [
              { name: 'Animal', ref: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', state: 'normal' },
              { name: 'Dog', ref: 'DogCls', pyId: ADDRS.DogCls, type: 'class', state: 'normal' },
              { name: 'd', ref: 'dInst', pyId: ADDRS.dInst, type: 'instance', state: 'normal' },
            ]},
            { name: 'Animal.speak(self)', vars: [
              { name: 'self', ref: 'dInst', pyId: ADDRS.dInst, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'speakFn', pyId: ADDRS.speakFn, type: 'function', value: 'Animal.speak(self)', refcount: 2, mutable: false, state: 'normal' },
            { id: 'AnimalCls', pyId: ADDRS.AnimalCls, type: 'class', value: 'class Animal', refcount: 2, mutable: true, state: 'normal', pairs: [
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'ref' },
            ] },
            { id: 'DogCls', pyId: ADDRS.DogCls, type: 'class', value: 'class Dog', refcount: 2, mutable: true, state: 'normal',
              bases: [{ name: 'Animal', pyId: ADDRS.AnimalCls }], pairs: [] },
            { id: 'dInst', pyId: ADDRS.dInst, type: 'instance', value: 'Dog()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Dog', pyId: ADDRS.DogCls }, pairs: [] },
            { id: 'boundSpeak', pyId: ADDRS.boundSpeak, type: 'method', value: 'bound speak', refcount: 1, mutable: false, state: 'normal', pairs: [
              { key: '__func__', value: 'speak -> 0x7f7a01b0', type: 'ref' },
              { key: '__self__', value: 'd -> 0x7f7c0010', type: 'ref' },
            ] },
          ],
          highlight: ['dInst'],
        },
      },
      {
        title: '<code>msg</code> is the returned string, and the classes didn\'t change',
        desc: 'No method was copied onto <code>d</code> or <code>Dog</code>. Inheritance is a search path. If <code>Dog</code> later defined its own <code>speak</code>, the lookup would stop there and shadow the base.',
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
              { key: 'speak', value: 'fn -> 0x7f7a01b0', type: 'ref' },
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
