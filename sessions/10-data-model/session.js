/* ============================================================
   SESSION 10: Special Methods & the Data Model
   Demos: str(p) finds __repr__ through object, len() asks the
   class and not the instance, v * 3 against 3 * v and
   NotImplemented, __eq__ switching hashing off, a set entry
   whose object changed after it was hashed
   ============================================================ */

'use strict';

/* Stable, made-up CPython-style addresses. One family (0x7fe...) for the whole
   session; the digit after "e" is the demo number, and 0 is for built-in
   objects that every demo shares. */
const ADDRS = {
  /* built in: here before the first line runs, never freed */
  objectCls:   '0x7fe00010',
  TypeErrCls:  '0x7fe00040',
  NotImplCls:  '0x7fe00048',
  notImpl:     '0x7fe00050',
  int2:        '0x7fe00062',
  int3:        '0x7fe00063',

  /* 1 · str(p) and __repr__ */
  PointCls1:   '0x7fe100a0',
  init1:       '0x7fe101b0',
  repr1:       '0x7fe101c0',
  p1:          '0x7fe10010',
  text1:       '0x7fe10200',

  /* 2 · len() asks the class */
  PlaylistCls: '0x7fe200a0',
  init2:       '0x7fe201b0',
  len2:        '0x7fe201c0',
  lambda2:     '0x7fe201d0',
  mix:         '0x7fe20010',
  songs:       '0x7fe20300',

  /* 3 · v * 3 and 3 * v */
  VecCls:      '0x7fe300a0',
  init3:       '0x7fe301b0',
  mul3:        '0x7fe301c0',
  v3:          '0x7fe30010',
  a3:          '0x7fe30020',
  b3:          '0x7fe30030',

  /* 4 · __eq__ switches hashing off */
  PointCls4:   '0x7fe400a0',
  init4:       '0x7fe401b0',
  eq4:         '0x7fe401c0',
  p4:          '0x7fe40010',
  q4:          '0x7fe40020',
  exc4:        '0x7fe40400',

  /* 5 · a key that moved */
  PointCls5:   '0x7fe500a0',
  init5:       '0x7fe501b0',
  eq5:         '0x7fe501c0',
  hash5:       '0x7fe501d0',
  p5:          '0x7fe50010',
  seen5:       '0x7fe50300',
};

/* Refcounts follow Session 04: they count the references this panel draws
   (names, slots, __class__ links, a running frame's hold on its function).
   While a special method runs, CPython's C call machinery holds one or two
   more for a moment, which the diagram leaves out. Built-in objects (object,
   NotImplemented, the small ints, TypeError) are immortal since 3.12. */
const IMMORTAL = '∞';

const fn = (id, pyId, value, opts) => {
  const o = opts || {};
  return { id, pyId, type: 'function', value, refcount: o.refcount ?? 1, mutable: false, state: o.state || 'normal' };
};

function classObj(id, pyId, name, pairs, opts) {
  const o = opts || {};
  return {
    id, pyId,
    type: 'class',
    value: `class ${name}`,
    refcount: o.refcount ?? 1,
    mutable: true,
    state: o.state || 'normal',
    bases: o.bases,
    pairs,
    note: o.note,
  };
}

/* No `value` line on an instance in this session: demo 1 is about what an
   instance's repr is, so the box shouldn't show one of its own. */
function inst(id, pyId, clsName, clsId, pairs, opts) {
  const o = opts || {};
  return {
    id, pyId,
    type: 'instance',
    refcount: o.refcount ?? 1,
    mutable: true,
    state: o.state || 'normal',
    classRef: { name: clsName, pyId: clsId },
    pairs,
    note: o.note,
  };
}

const itemRef = (label, addr) => ({ value: `${label} -> ${addr}`, type: 'ref' });
const pair = (key, label, addr) => ({ key, value: `${label} -> ${addr}`, type: 'ref' });
const num = (key, value) => ({ key, value, type: 'int' });

const smallInt = (id, pyId, value, state) =>
  ({ id, pyId, type: 'int', value, refcount: IMMORTAL, mutable: false, state: state || 'normal' });

/* `object` is a class like any other, written in C. Its namespace holds 24
   entries, every one a slot wrapper (`type(object.__dict__['__str__'])` is
   wrapper_descriptor); only the two demo 1 needs are drawn. */
const objectCls = (opts) => {
  const o = opts || {};
  return {
    id: 'objectCls', pyId: ADDRS.objectCls,
    type: 'class',
    value: 'class object',
    refcount: IMMORTAL,
    mutable: false,
    state: o.state || 'normal',
    pairs: [
      { key: '__repr__', value: 'slot wrapper, C code' },
      { key: '__str__', value: 'slot wrapper, C code' },
    ],
    note: o.note ?? 'built in and immortal; 22 more entries not drawn',
  };
};

/* NotImplemented is a single built-in object, like None. */
const notImplObj = (opts) => {
  const o = opts || {};
  return {
    id: 'notImpl', pyId: ADDRS.notImpl,
    type: 'instance',
    value: 'NotImplemented',
    refcount: IMMORTAL,
    mutable: false,
    state: o.state || 'normal',
    classRef: { name: 'NotImplementedType', pyId: ADDRS.NotImplCls },
    note: o.note,
  };
};

/* Copied from Sessions 08 and 09: an exception is an instance with a class
   link and a few well-known attributes. Nothing chains here, so __cause__ and
   __context__ (both None) are left out. */
function exception(id, pyId, clsName, clsId, message, opts) {
  const o = opts || {};
  return {
    id, pyId,
    type: 'instance',
    value: `${clsName}(${JSON.stringify(message)})`,
    refcount: o.refcount ?? 1,
    mutable: true,
    state: o.state || 'normal',
    classRef: { name: clsName, pyId: clsId },
    dictLabel: 'exception state',
    pairs: [
      { key: 'args', value: `(${JSON.stringify(message)},)`, type: 'tuple' },
      { key: '__traceback__', value: o.tb || 'None', type: o.tb ? 'ref' : 'none' },
    ],
    note: o.note,
  };
}

/* ── demo 1 pieces ── */
const point1 = (o) => classObj('PointCls1', ADDRS.PointCls1, 'Point', [
  pair('__init__', 'fn', ADDRS.init1),
  pair('__repr__', 'fn', ADDRS.repr1),
], Object.assign({ bases: [{ name: 'object', pyId: ADDRS.objectCls }] }, o));
const init1 = (o) => fn('init1', ADDRS.init1, 'Point.__init__(self, x, y)', o);
const repr1 = (o) => fn('repr1', ADDRS.repr1, 'Point.__repr__(self)', o);
const p1 = (o) => inst('p1', ADDRS.p1, 'Point', ADDRS.PointCls1, [num('x', 3), num('y', 4)], o);
const D1_NAMES = [
  { name: 'Point', ref: 'PointCls1', pyId: ADDRS.PointCls1, type: 'class', state: 'normal' },
  { name: 'p', ref: 'p1', pyId: ADDRS.p1, type: 'instance', state: 'normal' },
];

/* ── demo 2 pieces ── */
const playlist = (o) => classObj('PlaylistCls', ADDRS.PlaylistCls, 'Playlist', [
  pair('__init__', 'fn', ADDRS.init2),
  pair('__len__', 'fn', ADDRS.len2),
], o);
const init2 = (o) => fn('init2', ADDRS.init2, 'Playlist.__init__(self, songs)', o);
const len2 = (o) => fn('len2', ADDRS.len2, 'Playlist.__len__(self)', o);
const songsList = (o) => Object.assign({
  id: 'songs', pyId: ADDRS.songs, type: 'list', refcount: 1, mutable: true, state: 'normal',
  items: [{ value: 'intro', type: 'str' }, { value: 'outro', type: 'str' }],
}, o);
const MIX_SONGS = pair('songs', 'list', ADDRS.songs);
const MIX_LAMBDA = pair('__len__', 'fn', ADDRS.lambda2);
const mixObj = (pairs, o) => inst('mix', ADDRS.mix, 'Playlist', ADDRS.PlaylistCls, pairs, o);
const lambda2 = (o) => fn('lambda2', ADDRS.lambda2, '<lambda>()', o);
const D2_NAMES = [
  { name: 'Playlist', ref: 'PlaylistCls', pyId: ADDRS.PlaylistCls, type: 'class', state: 'normal' },
  { name: 'mix', ref: 'mix', pyId: ADDRS.mix, type: 'instance', state: 'normal' },
];

/* ── demo 3 pieces ── */
const vec = (o) => classObj('VecCls', ADDRS.VecCls, 'Vec', [
  pair('__init__', 'fn', ADDRS.init3),
  pair('__mul__', 'fn', ADDRS.mul3),
  pair('__rmul__', 'fn', ADDRS.mul3),
], o);
const init3 = (o) => fn('init3', ADDRS.init3, 'Vec.__init__(self, x, y)', o);
const mul3 = (o) => fn('mul3', ADDRS.mul3, 'Vec.__mul__(self, k)', Object.assign({ refcount: 2 }, o));
const v3 = (o) => inst('v3', ADDRS.v3, 'Vec', ADDRS.VecCls, [num('x', 1), num('y', 2)], o);
const a3 = (o) => inst('a3', ADDRS.a3, 'Vec', ADDRS.VecCls, [num('x', 3), num('y', 6)], o);
const b3 = (o) => inst('b3', ADDRS.b3, 'Vec', ADDRS.VecCls, [num('x', 3), num('y', 6)], o);
const V_NAME = { name: 'Vec', ref: 'VecCls', pyId: ADDRS.VecCls, type: 'class', state: 'normal' };
const v_NAME = { name: 'v', ref: 'v3', pyId: ADDRS.v3, type: 'instance', state: 'normal' };
const a_NAME = { name: 'a', ref: 'a3', pyId: ADDRS.a3, type: 'instance', state: 'normal' };
const mulFrame = () => ({ name: 'Vec.__mul__(self, k)', vars: [
  { name: 'self', ref: 'v3', pyId: ADDRS.v3, type: 'instance', state: 'new' },
  { name: 'k', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'new' },
]});

/* ── demo 4 pieces ── */
const point4 = (o) => classObj('PointCls4', ADDRS.PointCls4, 'Point', [
  pair('__init__', 'fn', ADDRS.init4),
  pair('__eq__', 'fn', ADDRS.eq4),
  { key: '__hash__', value: 'None', type: 'none' },
], o);
const init4 = (o) => fn('init4', ADDRS.init4, 'Point.__init__(self, x, y)', o);
const eq4 = (o) => fn('eq4', ADDRS.eq4, 'Point.__eq__(self, other)', o);
const p4 = (o) => inst('p4', ADDRS.p4, 'Point', ADDRS.PointCls4, [num('x', 1), num('y', 2)], o);
const q4 = (o) => inst('q4', ADDRS.q4, 'Point', ADDRS.PointCls4, [num('x', 1), num('y', 2)], o);
const D4_NAMES = [
  { name: 'Point', ref: 'PointCls4', pyId: ADDRS.PointCls4, type: 'class', state: 'normal' },
  { name: 'p', ref: 'p4', pyId: ADDRS.p4, type: 'instance', state: 'normal' },
  { name: 'q', ref: 'q4', pyId: ADDRS.q4, type: 'instance', state: 'normal' },
];
const SAME_TRUE = { name: 'same', value: true, type: 'bool', inline: true, state: 'normal' };
const unhashable = (o) => exception('exc4', ADDRS.exc4, 'TypeError', ADDRS.TypeErrCls,
  "unhashable type: 'Point'", Object.assign({ tb: '<module> (line 14)' }, o));

/* ── demo 5 pieces ── */
const HASH_12 = '-3550055125485641917';   /* hash((1, 2)) on a 64-bit build */
const HASH_102 = '-1767087503132776002';  /* hash((10, 2)) */
const point5 = (o) => classObj('PointCls5', ADDRS.PointCls5, 'Point', [
  pair('__init__', 'fn', ADDRS.init5),
  pair('__eq__', 'fn', ADDRS.eq5),
  pair('__hash__', 'fn', ADDRS.hash5),
], o);
const init5 = (o) => fn('init5', ADDRS.init5, 'Point.__init__(self, x, y)', o);
const eq5 = (o) => fn('eq5', ADDRS.eq5, 'Point.__eq__(self, other)', o);
const hash5 = (o) => fn('hash5', ADDRS.hash5, 'Point.__hash__(self)', o);
const p5 = (x, o) => inst('p5', ADDRS.p5, 'Point', ADDRS.PointCls5, [num('x', x), num('y', 2)], o);
const seen5 = (o) => Object.assign({
  id: 'seen5', pyId: ADDRS.seen5, type: 'set', refcount: 1, mutable: true, state: 'normal',
  items: [itemRef('Point', ADDRS.p5)],
  note: `entry filed under hash ${HASH_12}`,
}, o);
const D5_CLASS = { name: 'Point', ref: 'PointCls5', pyId: ADDRS.PointCls5, type: 'class', state: 'normal' };
const D5_P = { name: 'p', ref: 'p5', pyId: ADDRS.p5, type: 'instance', state: 'normal' };
const D5_SEEN = { name: 'seen', ref: 'seen5', pyId: ADDRS.seen5, type: 'set', state: 'normal' };
const D5_FNS = (o) => [init5(), eq5(), hash5(o)];
const hashFrame = () => ({ name: 'Point.__hash__(self)', vars: [
  { name: 'self', ref: 'p5', pyId: ADDRS.p5, type: 'instance', state: 'new' },
]});

const DEMOS = {
  repr: {
    watch: 'Watch which class answers. <code>str(p)</code> never looks inside <code>p</code>: it searches <code>Point</code>, then <code>object</code>, and <code>object</code> sends it back to your <code>__repr__</code>.',
    code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

p = Point(3, 4)
text = str(p)
print(p)`,
    steps: [
      {
        title: 'Initial state: one built-in class is already here',
        desc: 'Before your first line runs, <code>object</code> exists. Every class you write inherits from it, and it carries a fallback version of the special methods every object needs. It\'s built into the interpreter and never freed, so its refcount is drawn as &infin;, like the small ints.',
        lines: [],
        memory: {
          frames: [{ name: 'global', vars: [] }],
          heap: [objectCls()],
          highlight: [],
        },
      },
      {
        title: '<code>class Point</code>: two functions, and no <code>__str__</code>',
        desc: 'The body leaves two functions in the class namespace. <code>__repr__</code> is an ordinary function with an unusual name. Nothing about the <code>def</code> is special. It\'s special because built-in code knows the name and goes looking for it. <code>Point</code> has no <code>__str__</code>, and its <code>__bases__</code> link points at <code>object</code>.',
        lines: [1, 2, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls1', pyId: ADDRS.PointCls1, type: 'class', state: 'new' },
          ]}],
          heap: [init1({ state: 'new' }), repr1({ state: 'new' }), point1({ state: 'new' }), objectCls()],
          highlight: ['PointCls1', 'repr1'],
        },
      },
      {
        title: '<code>p = Point(3, 4)</code>: the data goes on the instance',
        desc: 'Session 04 traced this call line by line. What it leaves behind is an instance whose <code>__dict__</code> holds <code>x</code> and <code>y</code>, and a <code>__class__</code> link to <code>Point</code>. Its <code>__dict__</code> holds no methods, special or otherwise.',
        lines: [9],
        memory: {
          frames: [{ name: 'global', vars: [
            D1_NAMES[0],
            { name: 'p', ref: 'p1', pyId: ADDRS.p1, type: 'instance', state: 'new' },
          ]}],
          heap: [init1(), repr1(), point1({ refcount: 2 }), objectCls(), p1({ state: 'new' })],
          highlight: ['p1'],
        },
      },
      {
        title: '<code>str(p)</code> asks the class, and <code>Point</code> has no <code>__str__</code>',
        desc: '<code>str(p)</code> doesn\'t look in <code>p</code> at all. It goes to <code>type(p)</code>, which is <code>Point</code>, and searches it and its bases for <code>__str__</code>, the same walk as Session 04\'s inherited methods. <code>Point</code> misses, so the search moves on to <code>object</code> and finds its <code>__str__</code>.',
        lines: [10],
        memory: {
          frames: [{ name: 'global', badge: 'calling str(p)', vars: D1_NAMES }],
          heap: [init1(), repr1(), point1({ refcount: 2 }), objectCls({ note: 'found __str__ here, after missing on Point' }), p1()],
          highlight: ['PointCls1', 'objectCls'],
        },
      },
      {
        title: '<code>object.__str__</code> calls <code>repr(p)</code>, which finds yours',
        desc: 'The fallback <code>__str__</code> has one job: return <code>repr(p)</code>. That starts a second search, for <code>__repr__</code>, again on the class. This time <code>Point</code> has one, so your function runs with <code>self</code> bound to <code>p</code>. C code like <code>object.__str__</code> gets no frame on this diagram. Your <code>__repr__</code> does.',
        lines: [10, 6, 7],
        memory: {
          frames: [
            { name: 'global', badge: 'calling str(p)', vars: D1_NAMES },
            { name: 'Point.__repr__(self)', vars: [
              { name: 'self', ref: 'p1', pyId: ADDRS.p1, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [init1(), repr1({ refcount: 2 }), point1({ refcount: 2 }), objectCls(), p1({ refcount: 2 })],
          highlight: ['repr1', 'p1'],
        },
      },
      {
        title: '<code>text</code> is the string your method returned',
        desc: 'The f-string builds <code>\'Point(3, 4)\'</code>, <code>__repr__</code> returns it, and its frame goes. <code>object.__str__</code> hands the same string straight back, and <code>text</code> is bound to it. Without lines 6 and 7, the second search would also end at <code>object</code>, and <code>text</code> would be <code>\'&lt;__main__.Point object at 0x...&gt;\'</code>.',
        lines: [10],
        memory: {
          frames: [{ name: 'global', vars: D1_NAMES.concat([
            { name: 'text', ref: 'text1', pyId: ADDRS.text1, type: 'str', state: 'new' },
          ])}],
          heap: [
            init1(), repr1(), point1({ refcount: 2 }), objectCls(), p1(),
            { id: 'text1', pyId: ADDRS.text1, type: 'str', value: 'Point(3, 4)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['text1'],
        },
      },
      {
        title: '<code>print(p)</code> makes the same two trips',
        desc: '<code>print</code> calls <code>str()</code> on what you pass it, so this line repeats the last three steps and writes <code>Point(3, 4)</code>. f-strings and <code>format()</code> do the same. A container is different: <code>str([p])</code> uses <code>repr</code> for every item, giving <code>[Point(3, 4)]</code>. That\'s why <code>__repr__</code> is the one to write first. It covers both.',
        lines: [11],
        memory: {
          frames: [{ name: 'global', badge: 'printed Point(3, 4)', vars: D1_NAMES.concat([
            { name: 'text', ref: 'text1', pyId: ADDRS.text1, type: 'str', state: 'normal' },
          ])}],
          heap: [
            init1(), repr1(), point1({ refcount: 2 }), objectCls(), p1(),
            { id: 'text1', pyId: ADDRS.text1, type: 'str', value: 'Point(3, 4)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['repr1', 'objectCls'],
        },
      },
      {
        title: 'Summary: a built-in call, then a method lookup on the type',
        desc: 'Two searches ran, and neither looked inside <code>p</code>. Both started at <code>type(p)</code> and walked towards <code>object</code>. That\'s the data model in miniature: Python turns a built-in operation into a call to a specially named method, and finds that method on the class.',
        lines: [6, 10, 11],
        memory: {
          frames: [{ name: 'global', vars: D1_NAMES.concat([
            { name: 'text', ref: 'text1', pyId: ADDRS.text1, type: 'str', state: 'normal' },
          ])}],
          heap: [
            init1(), repr1(), point1({ refcount: 2 }), objectCls(), p1(),
            { id: 'text1', pyId: ADDRS.text1, type: 'str', value: 'Point(3, 4)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },

  lookup: {
    watch: 'A <code>__len__</code> ends up in the instance\'s <code>__dict__</code>. Watch whether <code>len(mix)</code> ever reads it.',
    code: `class Playlist:
    def __init__(self, songs):
        self.songs = songs

    def __len__(self):
        return len(self.songs)

mix = Playlist(["intro", "outro"])
n = len(mix)
mix.__len__ = lambda: 99
m = len(mix)`,
    steps: [
      {
        title: 'Initial state: a rule from Session 04, about to bend',
        desc: 'Session 04\'s rule for <code>obj.name</code> was instance first, then the class. This demo puts a special method in the instance on purpose, and watches what <code>len()</code> does about it.',
        lines: [],
        memory: {
          frames: [{ name: 'global', vars: [] }],
          heap: [],
          highlight: [],
        },
      },
      {
        title: '<code>class Playlist</code> defines <code>__len__</code>',
        desc: 'Defining <code>__len__</code> is how a class opts in to <code>len()</code>. Without it, <code>len(mix)</code> would raise <code>TypeError: object of type \'Playlist\' has no len()</code>.',
        lines: [1, 2, 5],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Playlist', ref: 'PlaylistCls', pyId: ADDRS.PlaylistCls, type: 'class', state: 'new' },
          ]}],
          heap: [init2({ state: 'new' }), len2({ state: 'new' }), playlist({ state: 'new' })],
          highlight: ['PlaylistCls', 'len2'],
        },
      },
      {
        title: '<code>mix</code> holds a list of two songs',
        desc: 'The instance reaches the list through <code>self.songs</code>. Its two strings are drawn inside the list to save space.',
        lines: [8],
        memory: {
          frames: [{ name: 'global', vars: [
            D2_NAMES[0],
            { name: 'mix', ref: 'mix', pyId: ADDRS.mix, type: 'instance', state: 'new' },
          ]}],
          heap: [init2(), len2(), playlist({ refcount: 2 }), songsList({ state: 'new' }), mixObj([MIX_SONGS], { state: 'new' })],
          highlight: ['mix', 'songs'],
        },
      },
      {
        title: '<code>len(mix)</code> runs <code>Playlist.__len__</code>',
        desc: '<code>len(mix)</code> means <code>type(mix).__len__(mix)</code>. Your method runs, and its <code>len(self.songs)</code> asks the list\'s own class the same question. <code>list.__len__</code> is C code, so it gets no frame.',
        lines: [9, 5, 6],
        memory: {
          frames: [
            { name: 'global', badge: 'calling len(mix)', vars: D2_NAMES },
            { name: 'Playlist.__len__(self)', vars: [
              { name: 'self', ref: 'mix', pyId: ADDRS.mix, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [init2(), len2({ refcount: 2 }), playlist({ refcount: 2 }), songsList(), mixObj([MIX_SONGS], { refcount: 2 })],
          highlight: ['len2', 'mix'],
        },
      },
      {
        title: '<code>n</code> is 2',
        desc: 'The method returns 2, a cached small int, and <code>n</code> is bound to it. <code>len()</code> checks the answer on the way out: a negative number raises <code>ValueError</code>, and anything that isn\'t an int raises <code>TypeError</code>.',
        lines: [9],
        memory: {
          frames: [{ name: 'global', vars: D2_NAMES.concat([
            { name: 'n', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'new' },
          ])}],
          heap: [init2(), len2(), playlist({ refcount: 2 }), songsList(), mixObj([MIX_SONGS]), smallInt('int2', ADDRS.int2, 2, 'new')],
          highlight: ['int2'],
        },
      },
      {
        title: '<code>mix.__len__ = ...</code> writes into the instance',
        desc: 'This is a normal attribute assignment, so the lambda lands in the instance\'s <code>__dict__</code>, just as <code>self.songs</code> did. Ask the instance directly and Session 04\'s rule holds: <code>mix.__len__()</code> finds the lambda first and returns 99.',
        lines: [10],
        memory: {
          frames: [{ name: 'global', vars: D2_NAMES.concat([
            { name: 'n', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
          ])}],
          heap: [
            init2(), len2(), playlist({ refcount: 2 }), songsList(),
            mixObj([MIX_SONGS, MIX_LAMBDA], { state: 'mutated' }),
            lambda2({ state: 'new' }),
            smallInt('int2', ADDRS.int2, 2),
          ],
          highlight: ['mix', 'lambda2'],
        },
      },
      {
        title: '<code>len(mix)</code> still goes to the class',
        desc: '<code>len()</code> never reads the instance\'s <code>__dict__</code>. It starts at <code>type(mix)</code>, finds <code>Playlist.__len__</code> and runs it again. The lambda sits in the instance, one box away, and nothing looks at it.',
        lines: [11, 5, 6],
        memory: {
          frames: [
            { name: 'global', badge: 'calling len(mix)', vars: D2_NAMES.concat([
              { name: 'n', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
            ])},
            { name: 'Playlist.__len__(self)', vars: [
              { name: 'self', ref: 'mix', pyId: ADDRS.mix, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            init2(), len2({ refcount: 2 }), playlist({ refcount: 2 }), songsList(),
            mixObj([MIX_SONGS, MIX_LAMBDA], { refcount: 2 }),
            lambda2({}),
            smallInt('int2', ADDRS.int2, 2),
          ],
          highlight: ['len2', 'PlaylistCls'],
        },
      },
      {
        title: '<code>m</code> is 2, the same as <code>n</code>',
        desc: 'The class answered both times, so <code>n</code> and <code>m</code> share the one cached 2. The lambda is still there, and only an explicit <code>mix.__len__()</code> would ever call it.',
        lines: [11],
        memory: {
          frames: [{ name: 'global', vars: D2_NAMES.concat([
            { name: 'n', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
            { name: 'm', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'new' },
          ])}],
          heap: [
            init2(), len2(), playlist({ refcount: 2 }), songsList(),
            mixObj([MIX_SONGS, MIX_LAMBDA]),
            lambda2({}),
            smallInt('int2', ADDRS.int2, 2),
          ],
          highlight: ['int2'],
        },
      },
      {
        title: 'Summary: special methods are looked up on the type',
        desc: 'Everything the language does for you (<code>len()</code>, <code>*</code>, <code>==</code>, <code>for</code>, <code>with</code>, <code>if x:</code>) finds its method on the class and skips the instance. That\'s a third place Session 04\'s rule bends. Assigning to the class does work: <code>Playlist.__len__ = ...</code> changes <code>len()</code> for every playlist, because CPython refreshes the class\'s internal method table when a special method on it changes.',
        lines: [10, 11],
        memory: {
          frames: [{ name: 'global', vars: D2_NAMES.concat([
            { name: 'n', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
            { name: 'm', ref: 'int2', pyId: ADDRS.int2, type: 'int', state: 'normal' },
          ])}],
          heap: [
            init2(), len2(), playlist({ refcount: 2 }), songsList(),
            mixObj([MIX_SONGS, MIX_LAMBDA], { note: 'len() never reads this __dict__' }),
            lambda2({}),
            smallInt('int2', ADDRS.int2, 2),
          ],
          highlight: [],
        },
      },
    ],
  },

  operators: {
    watch: 'Two multiplications that look alike. Watch who is asked first each time, and the <code>NotImplemented</code> that hands the job to the other side.',
    code: `class Vec:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __mul__(self, k):
        if not isinstance(k, int):
            return NotImplemented
        return Vec(self.x * k, self.y * k)

    __rmul__ = __mul__

v = Vec(1, 2)
a = v * 3
b = 3 * v`,
    steps: [
      {
        title: 'Initial state: the left operand is asked first',
        desc: 'For a binary operator, Python asks the object on the left before the one on the right. <code>v * 3</code> and <code>3 * v</code> are about to take different routes to the same answer.',
        lines: [],
        memory: {
          frames: [{ name: 'global', vars: [] }],
          heap: [],
          highlight: [],
        },
      },
      {
        title: '<code>class Vec</code>: one function under two names',
        desc: 'The body defines <code>__init__</code> and <code>__mul__</code>. Line 11 is a plain assignment inside the class body: it binds a second key, <code>__rmul__</code>, to the same function object. Two keys, one function, refcount 2.',
        lines: [1, 2, 6, 11],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Vec', ref: 'VecCls', pyId: ADDRS.VecCls, type: 'class', state: 'new' },
          ]}],
          heap: [init3({ state: 'new' }), mul3({ state: 'new' }), vec({ state: 'new' })],
          highlight: ['VecCls', 'mul3'],
        },
      },
      {
        title: '<code>v = Vec(1, 2)</code>',
        desc: 'One instance, with two small ints in its <code>__dict__</code>. The class keeps the behaviour, as in Session 04.',
        lines: [13],
        memory: {
          frames: [{ name: 'global', vars: [
            V_NAME,
            { name: 'v', ref: 'v3', pyId: ADDRS.v3, type: 'instance', state: 'new' },
          ]}],
          heap: [init3(), mul3(), vec({ refcount: 2 }), v3({ state: 'new' })],
          highlight: ['v3'],
        },
      },
      {
        title: '<code>v * 3</code>: the left operand goes first',
        desc: 'Python asks the left operand\'s class: <code>Vec.__mul__(v, 3)</code>. <code>k</code> is 3, an int, so the guard on line 7 lets it through.',
        lines: [14, 6, 7],
        memory: {
          frames: [
            { name: 'global', badge: 'evaluating v * 3', vars: [V_NAME, v_NAME] },
            mulFrame(),
          ],
          heap: [init3(), mul3({ refcount: 3 }), vec({ refcount: 2 }), v3({ refcount: 2 }), smallInt('int3', ADDRS.int3, 3)],
          highlight: ['mul3', 'v3'],
        },
      },
      {
        title: '<code>a</code> is a new <code>Vec</code>',
        desc: 'Line 9 builds a new instance (through <code>__init__</code>, as usual) and returns it. <code>v</code> is unchanged: <code>*</code> makes a new object, it doesn\'t edit one.',
        lines: [9, 14],
        memory: {
          frames: [{ name: 'global', vars: [
            V_NAME, v_NAME,
            { name: 'a', ref: 'a3', pyId: ADDRS.a3, type: 'instance', state: 'new' },
          ]}],
          heap: [init3(), mul3(), vec({ refcount: 3 }), v3(), a3({ state: 'new' })],
          highlight: ['a3'],
        },
      },
      {
        title: '<code>3 * v</code>: the int is asked first, and says <code>NotImplemented</code>',
        desc: 'Now the left operand is the int, so Python calls <code>int.__mul__(3, v)</code>. That C code can multiply by numbers and nothing else, so it returns <code>NotImplemented</code>, a built-in object like <code>None</code>. It isn\'t an error. It means "not with this type", and tells Python to ask the other side.',
        lines: [15],
        memory: {
          frames: [{ name: 'global', badge: 'evaluating 3 * v', vars: [V_NAME, v_NAME, a_NAME] }],
          heap: [
            init3(), mul3(), vec({ refcount: 3 }), v3(), a3(),
            smallInt('int3', ADDRS.int3, 3),
            notImplObj({ note: 'returned by int.__mul__(3, v)' }),
          ],
          highlight: ['notImpl', 'int3'],
        },
      },
      {
        title: 'Then Python asks <code>v</code>, through <code>__rmul__</code>',
        desc: 'The right operand gets its turn through the <em>reflected</em> method, <code>Vec.__rmul__(v, 3)</code>, with the operands swapped so <code>self</code> is still the Vec. <code>__rmul__</code> is the same function, so the frame is named <code>__mul__</code>, the name it was created with.',
        lines: [15, 6, 7],
        memory: {
          frames: [
            { name: 'global', badge: 'evaluating 3 * v', vars: [V_NAME, v_NAME, a_NAME] },
            mulFrame(),
          ],
          heap: [
            init3(), mul3({ refcount: 3 }), vec({ refcount: 3 }), v3({ refcount: 2 }), a3(),
            smallInt('int3', ADDRS.int3, 3),
            notImplObj(),
          ],
          highlight: ['mul3', 'VecCls'],
        },
      },
      {
        title: '<code>b</code> is another new <code>Vec</code>: equal numbers, a different object',
        desc: '<code>a</code> and <code>b</code> hold the same numbers in two separate objects. <code>a == b</code> is <code>False</code> for now: <code>Vec</code> has no <code>__eq__</code>, and the fallback, <code>object.__eq__</code>, compares identity. Demo 4 defines one.',
        lines: [9, 15],
        memory: {
          frames: [{ name: 'global', vars: [
            V_NAME, v_NAME, a_NAME,
            { name: 'b', ref: 'b3', pyId: ADDRS.b3, type: 'instance', state: 'new' },
          ]}],
          heap: [init3(), mul3(), vec({ refcount: 4 }), v3(), a3(), b3({ state: 'new' })],
          highlight: ['a3', 'b3'],
        },
      },
      {
        title: 'Summary: if both sides say <code>NotImplemented</code>, you get the <code>TypeError</code>',
        desc: 'Try <code>v * 2.5</code>. <code>Vec.__mul__</code> returns <code>NotImplemented</code>, <code>float.__rmul__</code> does too, and Python raises <code>TypeError: unsupported operand type(s) for *: \'Vec\' and \'float\'</code>. Returning <code>NotImplemented</code> is what makes that message right. Raising your own error inside <code>__mul__</code> would stop Python from ever asking the other side.',
        lines: [7, 8],
        memory: {
          frames: [{ name: 'global', vars: [
            V_NAME, v_NAME, a_NAME,
            { name: 'b', ref: 'b3', pyId: ADDRS.b3, type: 'instance', state: 'normal' },
          ]}],
          heap: [init3(), mul3(), vec({ refcount: 4 }), v3(), a3(), b3()],
          highlight: [],
        },
      },
    ],
  },

  eqHash: {
    watch: 'Look at the class namespace when it\'s created. There\'s a <code>__hash__</code> entry that the code never wrote.',
    code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

p = Point(1, 2)
q = Point(1, 2)
same = p == q
seen = {p}`,
    steps: [
      {
        title: 'Initial state: by default, <code>==</code> means <code>is</code>',
        desc: 'Without an <code>__eq__</code> of its own, an object is equal only to itself, as <code>a</code> and <code>b</code> were at the end of demo 3. This class changes what equal means, and something else changes with it.',
        lines: [],
        memory: {
          frames: [{ name: 'global', vars: [] }],
          heap: [],
          highlight: [],
        },
      },
      {
        title: '<code>class Point</code>, and a <code>__hash__</code> nobody wrote',
        desc: 'Python saw <code>__eq__</code> in the class body and no <code>__hash__</code>, so it put <code>__hash__ = None</code> in the namespace itself. The rule for hashing is that equal objects must have equal hashes. The inherited <code>object.__hash__</code> works from the object\'s identity, which would give two equal points two different hashes. So Python switches hashing off rather than let it be wrong.',
        lines: [1, 2, 6],
        memory: {
          frames: [{ name: 'global', vars: [
            { name: 'Point', ref: 'PointCls4', pyId: ADDRS.PointCls4, type: 'class', state: 'new' },
          ]}],
          heap: [init4({ state: 'new' }), eq4({ state: 'new' }), point4({ state: 'new', note: '__hash__ = None was added because the body defines __eq__' })],
          highlight: ['PointCls4'],
        },
      },
      {
        title: '<code>p</code> and <code>q</code>: equal numbers, two objects',
        desc: 'Two separate instances that hold the same numbers. <code>p is q</code> is <code>False</code>, and the next line asks whether they\'re equal.',
        lines: [11, 12],
        memory: {
          frames: [{ name: 'global', vars: [
            D4_NAMES[0],
            { name: 'p', ref: 'p4', pyId: ADDRS.p4, type: 'instance', state: 'new' },
            { name: 'q', ref: 'q4', pyId: ADDRS.q4, type: 'instance', state: 'new' },
          ]}],
          heap: [init4(), eq4(), point4({ refcount: 3 }), p4({ state: 'new' }), q4({ state: 'new' })],
          highlight: ['p4', 'q4'],
        },
      },
      {
        title: '<code>p == q</code> calls <code>Point.__eq__(p, q)</code>',
        desc: '<code>==</code> asks the left operand\'s class first, as <code>*</code> did in demo 3. <code>other</code> is a Point, so the guard passes, and line 9 compares two tuples, <code>(1, 2) == (1, 2)</code>.',
        lines: [13, 6, 7, 9],
        memory: {
          frames: [
            { name: 'global', badge: 'evaluating p == q', vars: D4_NAMES },
            { name: 'Point.__eq__(self, other)', vars: [
              { name: 'self', ref: 'p4', pyId: ADDRS.p4, type: 'instance', state: 'new' },
              { name: 'other', ref: 'q4', pyId: ADDRS.q4, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [init4(), eq4({ refcount: 2 }), point4({ refcount: 3 }), p4({ refcount: 2 }), q4({ refcount: 2 })],
          highlight: ['eq4', 'p4', 'q4'],
        },
      },
      {
        title: '<code>same</code> is <code>True</code>',
        desc: 'Equal by value now, not only by identity. <code>p != q</code> gives <code>False</code> with no more code, because the default <code>__ne__</code> calls <code>__eq__</code> and flips the answer. And <code>p == 5</code> is <code>False</code>: the guard returns <code>NotImplemented</code>, the int has no answer either, and Python falls back to comparing identity.',
        lines: [13],
        memory: {
          frames: [{ name: 'global', vars: D4_NAMES.concat([Object.assign({}, SAME_TRUE, { state: 'new' })]) }],
          heap: [init4(), eq4(), point4({ refcount: 3 }), p4(), q4()],
          highlight: ['same'],
        },
      },
      {
        title: '<code>{p}</code> needs <code>hash(p)</code>, and <code>Point.__hash__</code> is <code>None</code>',
        desc: 'A set files each element under its hash, so building <code>{p}</code> starts with <code>hash(p)</code>. That looks up <code>__hash__</code> on the class, finds <code>None</code>, and raises <code>TypeError: unhashable type: \'Point\'</code>. A dict key, a set member and a direct <code>hash(p)</code> all fail the same way.',
        lines: [14],
        memory: {
          frames: [{ name: 'global', badge: 'raising', state: 'unwinding', vars: D4_NAMES.concat([SAME_TRUE]) }],
          heap: [init4(), eq4(), point4({ refcount: 3 }), p4(), q4(), unhashable({ state: 'new' })],
          highlight: ['PointCls4', 'exc4'],
        },
      },
      {
        title: 'Summary: write <code>__hash__</code> from the fields <code>__eq__</code> compares',
        desc: 'Nothing handles the error, so the program stops. If your points never change once they\'re made, add <code>def __hash__(self): return hash((self.x, self.y))</code>, built from the same fields <code>__eq__</code> compares, so equal points hash alike. If they can change, leave them unhashable. Demo 5 shows why.',
        lines: [6, 9, 14],
        memory: {
          frames: [{ name: 'global', badge: 'exit status 1', vars: D4_NAMES.concat([SAME_TRUE]) }],
          heap: [init4(), eq4(), point4({ refcount: 3 }), p4(), q4(), unhashable({ note: 'printed to stderr, then the process exits' })],
          highlight: [],
        },
      },
    ],
  },

  movedKey: {
    watch: 'Keep an eye on the hash written under the set. Then watch <code>p</code> change while that number stays put.',
    code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))

p = Point(1, 2)
seen = {p}
p.x = 10
found = p in seen`,
    steps: [
      {
        title: 'Initial state: the same <code>Point</code>, now hashable',
        desc: 'This time the class has a <code>__hash__</code> to match its <code>__eq__</code>, so a point can go in a set. Then one of its fields changes.',
        lines: [],
        memory: {
          frames: [{ name: 'global', vars: [] }],
          heap: [],
          highlight: [],
        },
      },
      {
        title: '<code>class Point</code>: <code>__eq__</code> and <code>__hash__</code> read the same fields',
        desc: 'The body defines <code>__hash__</code> itself, so Python leaves it alone. Both methods read <code>x</code> and <code>y</code>, so two equal points always get the same hash. The rule is kept.',
        lines: [1, 2, 6, 11],
        memory: {
          frames: [{ name: 'global', vars: [Object.assign({}, D5_CLASS, { state: 'new' })] }],
          heap: [init5({ state: 'new' }), eq5({ state: 'new' }), hash5({ state: 'new' }), point5({ state: 'new' })],
          highlight: ['PointCls5', 'hash5'],
        },
      },
      {
        title: '<code>p = Point(1, 2)</code>',
        desc: 'One instance, holding <code>x = 1</code> and <code>y = 2</code>.',
        lines: [14],
        memory: {
          frames: [{ name: 'global', vars: [D5_CLASS, Object.assign({}, D5_P, { state: 'new' })] }],
          heap: D5_FNS().concat([point5({ refcount: 2 }), p5(1, { state: 'new' })]),
          highlight: ['p5'],
        },
      },
      {
        title: 'Building <code>{p}</code> calls <code>Point.__hash__</code>',
        desc: `The method hashes the tuple <code>(1, 2)</code>. On a 64-bit build that's <code>${HASH_12}</code>, the same number on every run. Python randomises the hashes of strings for each run, but not of ints or tuples of ints.`,
        lines: [15, 11, 12],
        memory: {
          frames: [
            { name: 'global', badge: 'building {p}', vars: [D5_CLASS, D5_P] },
            hashFrame(),
          ],
          heap: D5_FNS({ refcount: 2 }).concat([point5({ refcount: 2 }), p5(1, { refcount: 2 })]),
          highlight: ['hash5', 'p5'],
        },
      },
      {
        title: '<code>seen</code> keeps <code>p</code> under that hash',
        desc: 'The set stores two things for the entry: the reference to <code>p</code> and the hash, worked out once on the way in. Where the entry sits in the set\'s table depends on that number.',
        lines: [15],
        memory: {
          frames: [{ name: 'global', vars: [D5_CLASS, D5_P, Object.assign({}, D5_SEEN, { state: 'new' })] }],
          heap: D5_FNS().concat([point5({ refcount: 2 }), p5(1, { refcount: 2 }), seen5({ state: 'new' })]),
          highlight: ['seen5'],
        },
      },
      {
        title: '<code>p.x = 10</code> changes the object, not the set',
        desc: `Setting an attribute changes the instance's <code>__dict__</code> and nothing else. Nobody tells the set. Its entry still carries <code>${HASH_12}</code>, the hash of <code>(1, 2)</code>, while the point it refers to is now <code>(10, 2)</code>.`,
        lines: [16],
        memory: {
          frames: [{ name: 'global', vars: [D5_CLASS, D5_P, D5_SEEN] }],
          heap: D5_FNS().concat([point5({ refcount: 2 }), p5(10, { refcount: 2, state: 'mutated' }), seen5()]),
          highlight: ['p5', 'seen5'],
        },
      },
      {
        title: '<code>p in seen</code> hashes <code>p</code> again, and gets a different number',
        desc: `<code>in</code> on a set starts the way building one did: hash the thing you're looking for. <code>hash((10, 2))</code> is <code>${HASH_102}</code>, so the set looks in the place for that number.`,
        lines: [17, 11, 12],
        memory: {
          frames: [
            { name: 'global', badge: 'evaluating p in seen', vars: [D5_CLASS, D5_P, D5_SEEN] },
            hashFrame(),
          ],
          heap: D5_FNS({ refcount: 2 }).concat([
            point5({ refcount: 2 }),
            p5(10, { refcount: 3, note: `hash(p) is now ${HASH_102}` }),
            seen5(),
          ]),
          highlight: ['hash5', 'p5'],
        },
      },
      {
        title: 'Nothing is filed under the new hash, so <code>found</code> is <code>False</code>',
        desc: 'The set compares stored hashes first, and no entry has the new one, so <code>__eq__</code> is never even called. <code>found</code> is <code>False</code>, though <code>p</code> is plainly inside: <code>len(seen)</code> is 1 and <code>p in list(seen)</code> is <code>True</code>. Looking for <code>Point(1, 2)</code> fails too. Its hash matches the stored one, but then <code>__eq__</code> compares it with the changed <code>p</code> and says no.',
        lines: [17],
        memory: {
          frames: [{ name: 'global', vars: [D5_CLASS, D5_P, D5_SEEN,
            { name: 'found', value: false, type: 'bool', inline: true, state: 'new' },
          ]}],
          heap: D5_FNS().concat([point5({ refcount: 2 }), p5(10, { refcount: 2 }), seen5({ note: `entry filed under hash ${HASH_12}, which no lookup for p will ever use again` })]),
          highlight: ['seen5'],
        },
      },
      {
        title: 'Summary: hash only what can\'t change',
        desc: 'A dict or set trusts that an object\'s hash stays the same for as long as it\'s stored there. That was Session 03\'s reason lists can\'t be keys, and it holds for your classes too. Build <code>__hash__</code> only from fields that never change, or make the class immutable. <code>@dataclass(frozen=True)</code> does both: it writes <code>__eq__</code> and <code>__hash__</code> from the fields, and makes <code>p.x = 10</code> raise <code>FrozenInstanceError</code>.',
        lines: [11, 12, 16],
        memory: {
          frames: [{ name: 'global', vars: [D5_CLASS, D5_P, D5_SEEN,
            { name: 'found', value: false, type: 'bool', inline: true, state: 'normal' },
          ]}],
          heap: D5_FNS().concat([point5({ refcount: 2 }), p5(10, { refcount: 2 }), seen5()]),
          highlight: [],
        },
      },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '10-data-model',
    demos: DEMOS,
    defaultDemo: 'repr',
    defaultSpeed: 900,
  });
});
