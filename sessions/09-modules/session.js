/* ============================================================
   SESSION 09: Modules & Imports
   Demos: import runs a file once, from-import copies a binding,
   __name__ and the main guard, a circular import, a file that
   shadows a standard-library module
   ============================================================ */

'use strict';

/* Stable, made-up CPython-style addresses. One family (0x7fd...) for the whole
   session; the digit after "d" is the demo number, so an address is never
   reused across demos by accident. Demo 3 runs two programs, and the second
   one uses 0x7fd31... */
const ADDRS = {
  /* one module type for every demo */
  ModuleType:   '0x7fd00040',

  /* 1 · import runs it once */
  sysModules1:  '0x7fd10010',
  sysMod1:      '0x7fd10080',
  mainMod1:     '0x7fd10100',
  config1:      '0x7fd10200',

  /* 2 · from-import */
  config2:      '0x7fd20200',
  setFn:        '0x7fd200a0',
  int3:         '0x7fd20030',
  int5:         '0x7fd20050',

  /* 3 · __name__ (two separate runs) */
  sysModules3:  '0x7fd30010',
  sysMod3:      '0x7fd30080',
  mainTools:    '0x7fd30100',
  doubleFnA:    '0x7fd300a0',
  sysModules3b: '0x7fd31010',
  sysMod3b:     '0x7fd31080',
  mainApp:      '0x7fd31100',
  tools:        '0x7fd31200',
  doubleFnB:    '0x7fd310a0',

  /* 4 · circular */
  sysModules4:  '0x7fd40010',
  sysMod4:      '0x7fd40080',
  mainMod4:     '0x7fd40100',
  AttrErrCls:   '0x7fd40040',
  modA:         '0x7fd40200',
  modB:         '0x7fd40300',
  excAttr:      '0x7fd40400',

  /* 5 · shadowing */
  sysPath5:     '0x7fd50010',
  sysModules5:  '0x7fd50080',
  sysMod5:      '0x7fd500c0',
  mainMod5:     '0x7fd50100',
  AttrErrCls5:  '0x7fd50040',
  myRandom:     '0x7fd50200',
  pickFn:       '0x7fd500a0',
  excRandom:    '0x7fd50400',
};

/* A module is an ordinary instance (Session 04's vocabulary, as with Session
   08's exceptions): a class link to `module`, and a __dict__ that holds the
   file's top-level names. Real modules also carry __file__, __spec__,
   __loader__ and a few more dunders; only __name__ is drawn. */
function moduleObj(id, pyId, name, file, pairs, opts) {
  const o = opts || {};
  return {
    id, pyId,
    type: 'instance',
    value: `<module '${name}' from '${file}'>`,
    refcount: o.refcount ?? 2,
    mutable: true,
    state: o.state || 'normal',
    classRef: { name: 'module', pyId: ADDRS.ModuleType },
    dictLabel: 'module __dict__',
    pairs: [{ key: '__name__', value: name, type: 'str' }].concat(pairs || []),
    note: o.note,
  };
}

/* sys.modules is a plain dict from names to module objects. The interpreter
   loads a few dozen modules before your first line runs; only the entries a
   demo touches are drawn. `sys` and `__main__` are always there, and their
   module objects are left off the heap to save space. */
function sysModules(id, pyId, entries, opts) {
  const o = opts || {};
  return {
    id, pyId,
    type: 'dict',
    refcount: 2,
    mutable: true,
    state: o.state || 'normal',
    dictLabel: 'sys.modules',
    pairs: entries.map(([name, addr]) => ({ key: name, value: `module -> ${addr}`, type: 'ref' })),
    note: o.note ?? 'plus a few dozen more, loaded at startup and not drawn',
  };
}

/* Copied from Session 08: an exception is an instance with a class link and a
   few well-known attributes. `__traceback__` lists the frames it has passed
   through so far, outermost first. Nothing in this session chains one
   exception to another, so `brief: true` leaves out __cause__ and __context__
   (both None) to keep the panel short. */
function exception(id, pyId, clsName, clsId, message, opts) {
  const o = opts || {};
  const chain = o.brief ? [] : [
    { key: '__cause__', value: o.cause || 'None', type: o.cause ? 'ref' : 'none' },
    { key: '__context__', value: o.context || 'None', type: o.context ? 'ref' : 'none' },
  ];
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
    ].concat(chain, o.extra || []),
    note: o.note,
  };
}

const smallInt = (id, pyId, value, state) =>
  ({ id, pyId, type: 'int', value, refcount: '∞', mutable: false, state: state || 'normal' });

/* ── shared pieces for demo 1 ── */
const D1_BASE = [['sys', ADDRS.sysMod1], ['__main__', ADDRS.mainMod1]];
const D1_FULL = D1_BASE.concat([['config', ADDRS.config1]]);
const D1_FILE = 'config.py';

/* ── shared pieces for demo 2 ── */
const configMod2 = (retriesAt, opts) => moduleObj('configMod', ADDRS.config2, 'config', 'config.py', [
  { key: 'retries', value: `int -> ${retriesAt}`, type: 'ref' },
  { key: 'set_retries', value: `fn -> ${ADDRS.setFn}`, type: 'ref' },
], opts);
const setFnObj = (state, refcount, note) => ({
  id: 'setFn', pyId: ADDRS.setFn, type: 'function', value: 'set_retries(n)', refcount: refcount || 1, mutable: false,
  state: state || 'normal', note,
  dictLabel: 'function attributes',
  pairs: [{ key: '__globals__', value: "config's __dict__", type: 'ref' }],
});

/* ── shared pieces for demo 4 ── */
const D4_BASE = [['sys', ADDRS.sysMod4], ['__main__', ADDRS.mainMod4]];
const modAObj = (opts) => moduleObj('modA', ADDRS.modA, 'a', 'a.py', [], opts);
const modBObj = (pairs, opts) => moduleObj('modB', ADDRS.modB, 'b', 'b.py', pairs, opts);
const B_NAMES_A = [{ key: 'a', value: `module -> ${ADDRS.modA}`, type: 'ref' }];
const attrErr = (opts) => exception('excAttr', ADDRS.excAttr, 'AttributeError', ADDRS.AttrErrCls,
  "module 'a' has no attribute 'VALUE'", Object.assign({
    brief: true,
    extra: [{ key: 'obj', value: `module -> ${ADDRS.modA}`, type: 'ref' }],
  }, opts));

/* ── shared pieces for demo 5 ── */
const D5_BASE = [['sys', ADDRS.sysMod5], ['__main__', ADDRS.mainMod5]];
const sysPathObj = (state, note) => ({
  id: 'sysPath', pyId: ADDRS.sysPath5, type: 'list', refcount: 1, mutable: true, state: state || 'normal',
  items: [
    { value: '/home/sam/game', type: 'str' },
    { value: '/usr/lib/python313.zip', type: 'str' },
    { value: '/usr/lib/python3.13', type: 'str' },
    { value: '/usr/lib/python3.13/lib-dynload', type: 'str' },
    { value: '/home/sam/game/.venv/lib/python3.13/site-packages', type: 'str' },
  ],
  note: note || 'sys.path: the folders import searches, in order',
});
const RANDOM_FILE = '/home/sam/game/random.py';
const myRandomObj = (opts) => moduleObj('myRandom', ADDRS.myRandom, 'random', RANDOM_FILE, [
  { key: 'pick', value: `fn -> ${ADDRS.pickFn}`, type: 'ref' },
], opts);
const pickFnObj = (state) => ({ id: 'pickFn', pyId: ADDRS.pickFn, type: 'function', value: 'pick()', refcount: 1, mutable: false, state: state || 'normal' });

const DEMOS = {

  /* ──────────────────────────────────────────────────────────
     1 · import runs the file once, then hits the cache
     ────────────────────────────────────────────────────────── */
  once: {
    watch: 'Keep one eye on <code>sys.modules</code>. The new module lands in it <em>before</em> any of <code>config.py</code> runs, and the second <code>import</code> never gets past it.',
    code: `# main.py
import config
import config
print(config.TIMEOUT)

# config.py
print("loading config")
TIMEOUT = 30`,
    steps: [
      {
        title: 'Nothing has run yet',
        desc: 'Two files in one folder. You run <code>python main.py</code>, and <code>config.py</code> sits next to it. The dict on the heap is <code>sys.modules</code>, where the interpreter keeps every module it has loaded so far. It already has a few dozen entries before your first line runs. Two are drawn: <code>sys</code>, and <code>__main__</code>, which is <code>main.py</code> itself. Its namespace is the frame above.',
        lines: [],
        memory: {
          frames: [{ name: 'main.py', vars: [] }],
          heap: [sysModules('sysModules', ADDRS.sysModules1, D1_BASE)],
          highlight: [],
        },
      },
      {
        title: '<code>import config</code> looks in <code>sys.modules</code> first',
        desc: 'Before it touches the disk, Python asks one question: is there a module called <code>config</code> in <code>sys.modules</code> already? There isn\'t, so it goes looking for a file (demo 5 shows where it looks), finds <code>config.py</code>, and creates an empty module object. Look at the order. The new module goes into <code>sys.modules</code> <strong>before</strong> a single line of <code>config.py</code> has run.',
        lines: [2],
        memory: {
          frames: [{ name: 'main.py', badge: 'importing', vars: [] }],
          heap: [
            sysModules('sysModules', ADDRS.sysModules1, D1_FULL, { state: 'mutated' }),
            moduleObj('configMod', ADDRS.config1, 'config', D1_FILE, [], {
              state: 'new', refcount: 3, note: 'registered first, filled in second' }),
          ],
          highlight: ['configMod'],
        },
      },
      {
        title: 'The body of <code>config.py</code> runs in a frame of its own',
        desc: 'Importing a module means running it, top to bottom, like a script. It gets a frame, much like a function call in Session 02, and that frame\'s global namespace <em>is</em> the module\'s <code>__dict__</code>. Line 7 prints <code>loading config</code>. <code>main.py</code> waits on line 2 until the body is done.',
        lines: [7],
        memory: {
          frames: [
            { name: 'main.py', badge: 'paused on import', vars: [] },
            { name: 'config.py', badge: 'importing', vars: [
              { name: '__name__', value: 'config', type: 'str', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules1, D1_FULL),
            moduleObj('configMod', ADDRS.config1, 'config', D1_FILE, [], {
              refcount: 3, note: 'refs 3: sys.modules, plus two held by the import system while the body runs' }),
          ],
          highlight: ['configMod'],
        },
      },
      {
        title: '<code>TIMEOUT = 30</code> lands in the frame and in the module at once',
        desc: 'An assignment at the top level of a file binds a global name, and this frame\'s globals are the module\'s <code>__dict__</code>. So the new row shows up on the <code>config.py</code> frame and inside the module object at the same moment. It\'s one dict, drawn twice.',
        lines: [8],
        memory: {
          frames: [
            { name: 'main.py', badge: 'paused on import', vars: [] },
            { name: 'config.py', badge: 'importing', vars: [
              { name: '__name__', value: 'config', type: 'str', inline: true },
              { name: 'TIMEOUT', value: 30, type: 'int', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules1, D1_FULL),
            moduleObj('configMod', ADDRS.config1, 'config', D1_FILE, [
              { key: 'TIMEOUT', value: 30, type: 'int' },
            ], { state: 'mutated', refcount: 3, note: 'the same dict as the config.py frame\'s globals' }),
          ],
          highlight: ['configMod', 'TIMEOUT'],
        },
      },
      {
        title: 'The body finishes. The frame goes, the module stays',
        desc: 'After the last line of <code>config.py</code>, its frame is cleared like any other. The names survive, because they belong to the module object, and <code>sys.modules</code> is holding on to that. Only now does <code>import</code> do the part you can see: it binds the name <code>config</code> in <code>main.py</code>. Two references, the cache and your name.',
        lines: [2],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config1, type: 'instance', state: 'new' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules1, D1_FULL),
            moduleObj('configMod', ADDRS.config1, 'config', D1_FILE, [
              { key: 'TIMEOUT', value: 30, type: 'int' },
            ], { refcount: 2, note: 'refs 2: sys.modules and the name config in main.py' }),
          ],
          highlight: ['configMod'],
        },
      },
      {
        title: 'The second <code>import config</code> is a dict lookup',
        desc: '<code>config</code> is already in <code>sys.modules</code>, so Python takes that object and binds the name to it again. No file is opened and the body doesn\'t run, so <code>loading config</code> is printed once, not twice. That holds for the whole process. Every file that imports <code>config</code> gets this same object.',
        lines: [3],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config1, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules1, D1_FULL),
            moduleObj('configMod', ADDRS.config1, 'config', D1_FILE, [
              { key: 'TIMEOUT', value: 30, type: 'int' },
            ], { refcount: 2, note: 'same object, same address, and config.py did not run again' }),
          ],
          highlight: ['sysModules', 'configMod'],
        },
      },
      {
        title: '<code>config.TIMEOUT</code> reads the module\'s <code>__dict__</code>',
        desc: 'A dotted name on a module is ordinary attribute lookup (Session 04), and a module keeps its attributes in its <code>__dict__</code>. <code>config.TIMEOUT</code> finds the <code>TIMEOUT</code> entry there, so line 4 prints <code>30</code>.',
        lines: [4],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config1, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules1, D1_FULL),
            moduleObj('configMod', ADDRS.config1, 'config', D1_FILE, [
              { key: 'TIMEOUT', value: 30, type: 'int' },
            ], { refcount: 2 }),
          ],
          highlight: ['configMod'],
        },
      },
      {
        title: 'Summary: one file, one module object, run once per process',
        desc: 'The output is <code>loading config</code>, then <code>30</code>. An import is four moves: check the cache, create and register a module, run the file into its <code>__dict__</code>, bind a name. If you edit <code>config.py</code> while the program is running, nothing changes until the process restarts, or until you call <code>importlib.reload(config)</code>, which runs the body again into the same object.',
        lines: [2, 3],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config1, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules1, D1_FULL),
            moduleObj('configMod', ADDRS.config1, 'config', D1_FILE, [
              { key: 'TIMEOUT', value: 30, type: 'int' },
            ], { refcount: 2 }),
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     2 · from config import retries copies a binding
     ────────────────────────────────────────────────────────── */
  fromImport: {
    watch: 'Compare two addresses: the one your <code>retries</code> points at, and the one inside the module\'s <code>__dict__</code>. They start out the same. (<code>sys.modules</code> is still there, it\'s just not drawn this time.)',
    code: `# main.py
import config
from config import retries
config.set_retries(5)
print(config.retries, retries)

# config.py
retries = 3

def set_retries(n):
    global retries
    retries = n`,
    steps: [
      {
        title: '<code>from config import retries</code> looks like a shortcut',
        desc: 'It reads like "let me write <code>retries</code> instead of <code>config.retries</code>". It isn\'t that. It makes a <strong>new name</strong> in your file, pointing at whatever object <code>config.retries</code> pointed at when the line ran. Watch what happens when <code>config</code> changes its mind later.',
        lines: [],
        memory: {
          frames: [{ name: 'main.py', vars: [] }],
          heap: [],
          highlight: [],
        },
      },
      {
        title: '<code>import config</code> builds the module, as in demo 1',
        desc: 'Running <code>config.py</code> fills the module\'s <code>__dict__</code> with two names: <code>retries</code>, pointing at the int <code>3</code>, and <code>set_retries</code>, a function object. The function remembers where it was defined: its <code>__globals__</code> is this module\'s <code>__dict__</code>. <code>main.py</code> has one name so far, <code>config</code>.',
        lines: [2, 8, 10],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config2, type: 'instance', state: 'new' },
          ]}],
          heap: [
            configMod2(ADDRS.int3, { state: 'new' }),
            setFnObj('new'),
            smallInt('int3', ADDRS.int3, 3, 'new'),
          ],
          highlight: ['configMod', 'setFn'],
        },
      },
      {
        title: '<code>from config import retries</code> copies the binding, not the name',
        desc: 'Python imports <code>config</code> (cached, so nothing runs), reads <code>config.retries</code>, and binds a <strong>new</strong> name <code>retries</code> in <code>main.py</code> to that same object. Two names in two namespaces, one int, one address. Nothing links the two names to each other. They just point at the same thing, like <code>b = a</code> in Session 01.',
        lines: [3],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config2, type: 'instance', state: 'normal' },
            { name: 'retries', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'new' },
          ]}],
          heap: [
            configMod2(ADDRS.int3),
            setFnObj(),
            smallInt('int3', ADDRS.int3, 3),
          ],
          highlight: ['int3', 'configMod'],
        },
      },
      {
        title: '<code>config.set_retries(5)</code>: <code>global</code> means this module',
        desc: 'Inside <code>set_retries</code>, <code>global retries</code> tells Python to bind <code>retries</code> in the function\'s global namespace. A function\'s globals belong to the module where it was <em>defined</em>, not to the file that called it. So line 12 rebinds the <code>retries</code> slot in <code>config</code>\'s <code>__dict__</code> to the int <code>5</code>.',
        lines: [4, 11, 12],
        memory: {
          frames: [
            { name: 'main.py', vars: [
              { name: 'config', ref: 'configMod', pyId: ADDRS.config2, type: 'instance', state: 'normal' },
              { name: 'retries', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'normal' },
            ]},
            { name: 'set_retries(n)', badge: 'globals: config', vars: [
              { name: 'n', ref: 'int5', pyId: ADDRS.int5, type: 'int', state: 'new' },
            ]},
          ],
          heap: [
            configMod2(ADDRS.int5, { state: 'mutated', note: 'retries rebound inside the module' }),
            setFnObj('normal', 2, 'refs 2: the module __dict__, and the call that is running'),
            smallInt('int3', ADDRS.int3, 3),
            smallInt('int5', ADDRS.int5, 5, 'new'),
          ],
          highlight: ['configMod', 'int5'],
        },
      },
      {
        title: 'The call returns. <code>config.retries</code> is 5, your <code>retries</code> is still 3',
        desc: 'Line 5 prints <code>5 3</code>. The module\'s slot was rebound to a new object. Your name was never touched, because nothing ever told it to follow. It\'s Session 01\'s rule stretched across two files: rebinding one name never moves another.',
        lines: [5],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config2, type: 'instance', state: 'normal' },
            { name: 'retries', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'normal' },
          ]}],
          heap: [
            configMod2(ADDRS.int5, { note: 'config.retries now points at 5' }),
            setFnObj(),
            smallInt('int3', ADDRS.int3, 3),
            smallInt('int5', ADDRS.int5, 5),
          ],
          highlight: ['int3', 'int5'],
        },
      },
      {
        title: 'Summary: <code>config.retries</code> follows changes, a from-imported name doesn\'t',
        desc: 'Write <code>config.retries</code> when you want whatever the module holds <em>now</em>. That lookup happens every time the line runs. A from-imported name is a snapshot of one binding. Mutation is different: if <code>retries</code> were a list and the function appended to it, both names would see the change, because they share one object. The same rule decides where <code>unittest.mock.patch</code> has to aim, which the notes below cover.',
        lines: [3, 5],
        memory: {
          frames: [{ name: 'main.py', vars: [
            { name: 'config', ref: 'configMod', pyId: ADDRS.config2, type: 'instance', state: 'normal' },
            { name: 'retries', ref: 'int3', pyId: ADDRS.int3, type: 'int', state: 'normal' },
          ]}],
          heap: [
            configMod2(ADDRS.int5),
            setFnObj(),
            smallInt('int3', ADDRS.int3, 3),
            smallInt('int5', ADDRS.int5, 5),
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     3 · __name__ depends on how the file was loaded
     ────────────────────────────────────────────────────────── */
  mainGuard: {
    watch: 'Watch the <code>__name__</code> row in the <code>tools.py</code> frame. Same file, same line, two different values, depending on which command started the program.',
    code: `# tools.py
def double(x):
    return x * 2

if __name__ == "__main__":
    print(double(21))

# app.py
import tools
print(tools.double(4))`,
    steps: [
      {
        title: 'One file, two ways to load it',
        desc: 'Every module has a <code>__name__</code>. Python sets it before the body runs, and its value depends on <em>how</em> the file was loaded, not on what the file is called. This demo runs two separate programs: first <code>python tools.py</code>, then <code>python app.py</code>.',
        lines: [],
        memory: {
          frames: [{ name: 'tools.py', vars: [] }],
          heap: [],
          highlight: [],
        },
      },
      {
        title: '<code>python tools.py</code>: the file you run is called <code>__main__</code>',
        desc: 'The script you start is loaded as a module too, but it\'s registered in <code>sys.modules</code> under the key <code>"__main__"</code>, and that\'s also the <code>__name__</code> in its namespace. The file name plays no part. Then <code>def</code> builds <code>double</code> as usual.',
        lines: [2],
        memory: {
          frames: [{ name: 'tools.py', badge: 'run as script', vars: [
            { name: '__name__', value: '__main__', type: 'str', inline: true, state: 'new' },
            { name: 'double', ref: 'doubleFnA', pyId: ADDRS.doubleFnA, type: 'function', state: 'new' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules3, [['sys', ADDRS.sysMod3], ['__main__', ADDRS.mainTools]], {
              note: "'__main__' is tools.py itself, and its namespace is the frame above" }),
            { id: 'doubleFnA', pyId: ADDRS.doubleFnA, type: 'function', value: 'double(x)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['__name__'],
        },
      },
      {
        title: 'The guard is true, so line 6 runs',
        desc: '<code>__name__ == "__main__"</code> compares two ordinary strings. They match, so the block runs and prints <code>42</code>. Read the guard as "only when this file is the program".',
        lines: [5, 6],
        memory: {
          frames: [{ name: 'tools.py', badge: 'run as script', vars: [
            { name: '__name__', value: '__main__', type: 'str', inline: true },
            { name: 'double', ref: 'doubleFnA', pyId: ADDRS.doubleFnA, type: 'function', state: 'normal' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules3, [['sys', ADDRS.sysMod3], ['__main__', ADDRS.mainTools]], {
              note: "'__main__' is tools.py itself, and its namespace is the frame above" }),
            { id: 'doubleFnA', pyId: ADDRS.doubleFnA, type: 'function', value: 'double(x)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['__name__'],
        },
      },
      {
        title: 'A new run, <code>python app.py</code>: now <code>tools</code> is imported',
        desc: 'A fresh process, with nothing carried over. This time <code>app.py</code> is <code>__main__</code>, and line 9 imports <code>tools</code> the way demo 1 imported <code>config</code>: a module object registered as <code>"tools"</code>, and its body run in a frame of its own. The first entry in that namespace is <code>__name__</code>, set to <code>"tools"</code>.',
        lines: [9, 2],
        memory: {
          frames: [
            { name: 'app.py', badge: 'paused on import', vars: [
              { name: '__name__', value: '__main__', type: 'str', inline: true },
            ]},
            { name: 'tools.py', badge: 'importing', vars: [
              { name: '__name__', value: 'tools', type: 'str', inline: true, state: 'new' },
              { name: 'double', ref: 'doubleFnB', pyId: ADDRS.doubleFnB, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules3b, [['sys', ADDRS.sysMod3b], ['__main__', ADDRS.mainApp], ['tools', ADDRS.tools]], { state: 'mutated' }),
            moduleObj('toolsMod', ADDRS.tools, 'tools', 'tools.py', [
              { key: 'double', value: `fn -> ${ADDRS.doubleFnB}`, type: 'ref' },
            ], { state: 'new', refcount: 3 }),
            { id: 'doubleFnB', pyId: ADDRS.doubleFnB, type: 'function', value: 'double(x)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['__name__', 'toolsMod'],
        },
      },
      {
        title: 'This time the guard is false, so line 6 is skipped',
        desc: '<code>__name__</code> is <code>"tools"</code>, which isn\'t <code>"__main__"</code>. The test print is skipped and the body ends with nothing but <code>double</code> defined. That\'s what the guard is for: the code under it runs when you start the file, and stays quiet when someone imports it.',
        lines: [5],
        memory: {
          frames: [
            { name: 'app.py', badge: 'paused on import', vars: [
              { name: '__name__', value: '__main__', type: 'str', inline: true },
            ]},
            { name: 'tools.py', badge: 'importing', vars: [
              { name: '__name__', value: 'tools', type: 'str', inline: true },
              { name: 'double', ref: 'doubleFnB', pyId: ADDRS.doubleFnB, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules3b, [['sys', ADDRS.sysMod3b], ['__main__', ADDRS.mainApp], ['tools', ADDRS.tools]]),
            moduleObj('toolsMod', ADDRS.tools, 'tools', 'tools.py', [
              { key: 'double', value: `fn -> ${ADDRS.doubleFnB}`, type: 'ref' },
            ], { refcount: 3 }),
            { id: 'doubleFnB', pyId: ADDRS.doubleFnB, type: 'function', value: 'double(x)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['__name__'],
        },
      },
      {
        title: 'Back in <code>app.py</code>: <code>tools.double(4)</code>',
        desc: 'The <code>tools.py</code> frame is gone and the module stays, just as in demo 1. <code>app.py</code> now has the name <code>tools</code> and calls a function through it, so <code>8</code> is printed. <code>42</code> never is.',
        lines: [9, 10],
        memory: {
          frames: [{ name: 'app.py', vars: [
            { name: '__name__', value: '__main__', type: 'str', inline: true },
            { name: 'tools', ref: 'toolsMod', pyId: ADDRS.tools, type: 'instance', state: 'new' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules3b, [['sys', ADDRS.sysMod3b], ['__main__', ADDRS.mainApp], ['tools', ADDRS.tools]]),
            moduleObj('toolsMod', ADDRS.tools, 'tools', 'tools.py', [
              { key: 'double', value: `fn -> ${ADDRS.doubleFnB}`, type: 'ref' },
            ], { refcount: 2, note: 'refs 2: sys.modules and the name tools in app.py' }),
            { id: 'doubleFnB', pyId: ADDRS.doubleFnB, type: 'function', value: 'double(x)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['toolsMod'],
        },
      },
      {
        title: 'Summary: <code>__name__</code> is set by whoever loads the file',
        desc: '<code>python tools.py</code> and <code>python -m tools</code> both load it as <code>"__main__"</code>. <code>import tools</code> loads it as <code>"tools"</code>. Put the code that starts your program under the guard, usually as one call to a <code>main()</code> function, and keep definitions above it. Session 07 showed a place where the guard is required: with the <code>spawn</code> start method, <code>multiprocessing</code> imports your main file again in every child process.',
        lines: [5],
        memory: {
          frames: [{ name: 'app.py', vars: [
            { name: '__name__', value: '__main__', type: 'str', inline: true },
            { name: 'tools', ref: 'toolsMod', pyId: ADDRS.tools, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules3b, [['sys', ADDRS.sysMod3b], ['__main__', ADDRS.mainApp], ['tools', ADDRS.tools]]),
            moduleObj('toolsMod', ADDRS.tools, 'tools', 'tools.py', [
              { key: 'double', value: `fn -> ${ADDRS.doubleFnB}`, type: 'ref' },
            ], { refcount: 2 }),
            { id: 'doubleFnB', pyId: ADDRS.doubleFnB, type: 'function', value: 'double(x)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     4 · A circular import meets a half-built module
     ────────────────────────────────────────────────────────── */
  circular: {
    watch: 'Look inside module <code>a</code> when <code>b</code> asks for it. It\'s in the cache, so <code>b</code> gets it, but line 6 of <code>a.py</code> hasn\'t run yet.',
    code: `# main.py
import a

# a.py
import b
VALUE = 1

# b.py
import a
print(a.VALUE)`,
    steps: [
      {
        title: 'Two files that import each other',
        desc: '<code>a</code> imports <code>b</code>, and <code>b</code> imports <code>a</code>. Python allows that, and often it works. It breaks when one of them reads a name from the other <em>while the imports are still going on</em>. Watch <code>sys.modules</code>. It\'s what stops this from looping forever, and it\'s also what hands out a half-built module.',
        lines: [],
        memory: {
          frames: [{ name: 'main.py', vars: [] }],
          heap: [sysModules('sysModules', ADDRS.sysModules4, D4_BASE)],
          highlight: [],
        },
      },
      {
        title: '<code>import a</code>: module <code>a</code> is registered, then its body starts',
        desc: 'The same moves as demo 1. <code>a</code> isn\'t in the cache, so a module object is created and stored in <code>sys.modules</code>, and <code>a.py</code> starts running in a new frame. Its <code>__dict__</code> holds nothing but <code>__name__</code> so far.',
        lines: [2],
        memory: {
          frames: [
            { name: 'main.py', badge: 'paused on import', vars: [] },
            { name: 'a.py', badge: 'importing', vars: [
              { name: '__name__', value: 'a', type: 'str', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules4, D4_BASE.concat([['a', ADDRS.modA]]), { state: 'mutated' }),
            modAObj({ state: 'new', refcount: 3 }),
          ],
          highlight: ['modA'],
        },
      },
      {
        title: 'Line 5, <code>import b</code>: module <code>b</code> is registered and <code>a</code> waits',
        desc: '<code>a.py</code> stops on its very first line, before it ever reaches <code>VALUE = 1</code>, and the same moves start for <code>b</code>. Three frames are open now, each one paused on an <code>import</code> line, stacked up like nested function calls.',
        lines: [5],
        memory: {
          frames: [
            { name: 'main.py', badge: 'paused on import', vars: [] },
            { name: 'a.py', badge: 'paused on import', vars: [
              { name: '__name__', value: 'a', type: 'str', inline: true },
            ]},
            { name: 'b.py', badge: 'importing', vars: [
              { name: '__name__', value: 'b', type: 'str', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules4, D4_BASE.concat([['a', ADDRS.modA], ['b', ADDRS.modB]]), { state: 'mutated' }),
            modAObj({ refcount: 3 }),
            modBObj([], { state: 'new', refcount: 3 }),
          ],
          highlight: ['modB'],
        },
      },
      {
        title: 'Line 9, <code>import a</code>: found in the cache, half built',
        desc: '<code>a</code> is already in <code>sys.modules</code>, so Python doesn\'t run <code>a.py</code> again. If it did, <code>a</code> would import <code>b</code>, which would import <code>a</code>, forever. Instead <code>b</code> gets the module object that exists, and its name <code>a</code> is bound to it. Look at what\'s inside: still only <code>__name__</code>, because line 6 hasn\'t run.',
        lines: [9],
        memory: {
          frames: [
            { name: 'main.py', badge: 'paused on import', vars: [] },
            { name: 'a.py', badge: 'paused on import', vars: [
              { name: '__name__', value: 'a', type: 'str', inline: true },
            ]},
            { name: 'b.py', badge: 'importing', vars: [
              { name: '__name__', value: 'b', type: 'str', inline: true },
              { name: 'a', ref: 'modA', pyId: ADDRS.modA, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules4, D4_BASE.concat([['a', ADDRS.modA], ['b', ADDRS.modB]])),
            modAObj({ refcount: 4, note: 'half built: line 6 has not run, so there is no VALUE yet' }),
            modBObj(B_NAMES_A, { state: 'mutated', refcount: 3 }),
          ],
          highlight: ['sysModules', 'modA'],
        },
      },
      {
        title: 'Line 10, <code>a.VALUE</code>: the name isn\'t there yet',
        desc: 'Looking up an attribute on a module means looking in its <code>__dict__</code>, and <code>VALUE</code> isn\'t in it. Python raises <code>AttributeError: module \'a\' has no attribute \'VALUE\'</code>, and the frame starts to unwind, as in Session 08. The exception keeps the module it was looking in as its <code>obj</code> attribute, which is the extra reference on <code>a</code>. Python 3.13 adds a hint in brackets after the message. The notes below explain why it can point you the wrong way.',
        lines: [10],
        memory: {
          frames: [
            { name: 'main.py', badge: 'paused on import', vars: [] },
            { name: 'a.py', badge: 'paused on import', vars: [
              { name: '__name__', value: 'a', type: 'str', inline: true },
            ]},
            { name: 'b.py', badge: 'raising', state: 'unwinding', vars: [
              { name: '__name__', value: 'b', type: 'str', inline: true },
              { name: 'a', ref: 'modA', pyId: ADDRS.modA, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            attrErr({ state: 'new', tb: 'b.py (line 10)' }),
            sysModules('sysModules', ADDRS.sysModules4, D4_BASE.concat([['a', ADDRS.modA], ['b', ADDRS.modB]])),
            modAObj({ refcount: 5 }),
            modBObj(B_NAMES_A, { refcount: 3 }),
          ],
          highlight: ['excAttr'],
        },
      },
      {
        title: 'A failed import is taken back out of <code>sys.modules</code>',
        desc: '<code>b.py</code> has no handler, so its frame is cleared. Its body never finished, so the import system deletes <code>"b"</code> from <code>sys.modules</code>. A module that blew up halfway isn\'t left in the cache for the next <code>import b</code> to find. The exception arrives in <code>a.py</code> at line 5, which has no handler either.',
        lines: [10, 5],
        memory: {
          frames: [
            { name: 'main.py', badge: 'paused on import', vars: [] },
            { name: 'a.py', badge: 'unwinding', state: 'unwinding', vars: [
              { name: '__name__', value: 'a', type: 'str', inline: true },
            ]},
          ],
          heap: [
            attrErr({ state: 'mutated', tb: 'a.py (line 5) → b.py (line 10)' }),
            sysModules('sysModules', ADDRS.sysModules4, D4_BASE.concat([['a', ADDRS.modA]]), { state: 'mutated' }),
            modAObj({ refcount: 5, note: 'still in the cache, for one more step' }),
            modBObj(B_NAMES_A, { refcount: 2, note: 'out of sys.modules. Only the traceback still reaches it' }),
          ],
          highlight: ['sysModules', 'modB'],
        },
      },
      {
        title: 'Then <code>a</code> goes too, and <code>main.py</code> has no handler',
        desc: '<code>a</code> is removed from the cache the same way, and the exception reaches <code>main.py</code> at line 2 with no <code>try</code> around it. The traceback lists <code>main.py</code> line 2, <code>a.py</code> line 5 and <code>b.py</code> line 10, outermost first: three <code>&lt;module&gt;</code> frames and no function in sight. The import system\'s own frames are left out of tracebacks on purpose.',
        lines: [2],
        memory: {
          frames: [{ name: 'main.py', badge: 'no handler', vars: [] }],
          heap: [
            attrErr({ state: 'mutated', tb: 'main.py (line 2) → a.py (line 5) → b.py (line 10)' }),
            sysModules('sysModules', ADDRS.sysModules4, D4_BASE, { state: 'mutated' }),
            modAObj({ refcount: 4, note: 'out of sys.modules too' }),
            modBObj(B_NAMES_A, { refcount: 2 }),
          ],
          highlight: ['excAttr', 'sysModules'],
        },
      },
      {
        title: 'Summary: read the other module\'s names later, not at import time',
        desc: 'Nothing was wrong with <code>import a</code> itself. The bug was <em>using</em> <code>a.VALUE</code> while <code>a</code> was still half built. Move that line into a function that runs after both imports have finished, and it works, because by then the lookup finds a full module. The other cures are to move the shared name into a third module that imports neither, or to import inside the function that needs it. <code>from a import VALUE</code> on line 9 fails the same way, with <code>ImportError: cannot import name</code>.',
        lines: [9, 10],
        memory: {
          frames: [{ name: 'main.py', badge: 'exit status 1', vars: [] }],
          heap: [
            attrErr({ tb: 'main.py (line 2) → a.py (line 5) → b.py (line 10)', note: 'printed to stderr, then the process exits' }),
            sysModules('sysModules', ADDRS.sysModules4, D4_BASE),
            modAObj({ refcount: 4 }),
            modBObj(B_NAMES_A, { refcount: 2 }),
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     5 · The first match on sys.path wins
     ────────────────────────────────────────────────────────── */
  shadow: {
    watch: 'Read <code>sys.path</code> from the left. The search stops at the first folder that has a <code>random.py</code> in it, and the standard library comes later.',
    code: `# /home/sam/game/random.py
def pick():
    return 4

# /home/sam/game/game.py
import random
print(random.randint(1, 6))`,
    steps: [
      {
        title: 'A file with an unlucky name',
        desc: 'Someone writing a dice game saved a helper as <code>random.py</code>, in the same folder as <code>game.py</code>. The standard library has a <code>random</code> module too. Which one does <code>import random</code> find? The answer is in a list you can print yourself, <code>sys.path</code>, drawn here as it would be for <code>python game.py</code> on a Linux machine with a virtual environment.',
        lines: [],
        memory: {
          frames: [{ name: 'game.py', vars: [] }],
          heap: [
            sysModules('sysModules', ADDRS.sysModules5, D5_BASE),
            sysPathObj(),
          ],
          highlight: [],
        },
      },
      {
        title: '<code>import random</code> checks the cache first',
        desc: '<code>random</code> isn\'t loaded at startup, so it\'s not in <code>sys.modules</code>, and Python has to search for it. It walks <code>sys.path</code> in order and takes the <strong>first</strong> match. Entry 0 is the folder of the script you ran.',
        lines: [6],
        memory: {
          frames: [{ name: 'game.py', badge: 'importing', vars: [] }],
          heap: [
            sysModules('sysModules', ADDRS.sysModules5, D5_BASE, { note: 'no random here: it is not loaded at startup' }),
            sysPathObj(),
          ],
          highlight: ['sysModules', 'sysPath'],
        },
      },
      {
        title: 'Entry 0 is the script\'s own folder, and there\'s a <code>random.py</code> in it',
        desc: 'The search stops at the first folder that has <code>random.py</code> (or a <code>random/</code> package). That\'s <code>/home/sam/game</code>. The real one in <code>/usr/lib/python3.13</code> is never even looked at. Your file is registered under the name <code>random</code>, and its body runs.',
        lines: [2, 6],
        memory: {
          frames: [
            { name: 'game.py', badge: 'paused on import', vars: [] },
            { name: 'random.py', badge: 'importing', vars: [
              { name: '__name__', value: 'random', type: 'str', inline: true, state: 'new' },
              { name: 'pick', ref: 'pickFn', pyId: ADDRS.pickFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            sysModules('sysModules', ADDRS.sysModules5, D5_BASE.concat([['random', ADDRS.myRandom]]), { state: 'mutated' }),
            sysPathObj('normal', 'searched in order: [0] had a random.py, so the search stopped there'),
            myRandomObj({ state: 'new', refcount: 3 }),
            pickFnObj('new'),
          ],
          highlight: ['sysPath', 'myRandom'],
        },
      },
      {
        title: '<code>random</code> now means your file, for the whole process',
        desc: 'The name <code>random</code> in <code>game.py</code> points at your module, and so does <code>sys.modules["random"]</code>. Any other code in this process that runs <code>import random</code>, including modules in the standard library, now gets your two-line file instead.',
        lines: [6],
        memory: {
          frames: [{ name: 'game.py', vars: [
            { name: 'random', ref: 'myRandom', pyId: ADDRS.myRandom, type: 'instance', state: 'new' },
          ]}],
          heap: [
            sysModules('sysModules', ADDRS.sysModules5, D5_BASE.concat([['random', ADDRS.myRandom]])),
            sysPathObj(),
            myRandomObj({ refcount: 2, note: 'every import random in this process gets this file now' }),
            pickFnObj(),
          ],
          highlight: ['myRandom'],
        },
      },
      {
        title: '<code>random.randint</code> doesn\'t exist in your file',
        desc: 'Your module has <code>pick</code> and nothing else. Line 7 raises <code>AttributeError: module \'random\' has no attribute \'randint\'</code>. Python 3.13 spots this case and adds a hint after the message: <em>consider renaming \'/home/sam/game/random.py\' since it has the same name as the standard library module named \'random\'</em>.',
        lines: [7],
        memory: {
          frames: [{ name: 'game.py', badge: 'raising', state: 'unwinding', vars: [
            { name: 'random', ref: 'myRandom', pyId: ADDRS.myRandom, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            exception('excRandom', ADDRS.excRandom, 'AttributeError', ADDRS.AttrErrCls5,
              "module 'random' has no attribute 'randint'", {
                state: 'new', tb: 'game.py (line 7)',
                brief: true,
                extra: [{ key: 'obj', value: `module -> ${ADDRS.myRandom}`, type: 'ref' }],
                note: 'message shortened: 3.13 adds the renaming hint' }),
            sysModules('sysModules', ADDRS.sysModules5, D5_BASE.concat([['random', ADDRS.myRandom]])),
            sysPathObj(),
            myRandomObj({ refcount: 3 }),
            pickFnObj(),
          ],
          highlight: ['excRandom', 'myRandom'],
        },
      },
      {
        title: 'Summary: the first match on <code>sys.path</code> wins',
        desc: 'Rename the file (<code>dice.py</code>, say) and the real module comes back. When an import behaves strangely, <code>print(random.__file__)</code> tells you which file you actually got. The usual suspects are files named after modules you also use: <code>random.py</code>, <code>json.py</code>, <code>email.py</code>, <code>test.py</code>, or <code>requests.py</code> for a library from <code>pip</code>.',
        lines: [6],
        memory: {
          frames: [{ name: 'game.py', badge: 'exit status 1', vars: [
            { name: 'random', ref: 'myRandom', pyId: ADDRS.myRandom, type: 'instance', state: 'normal' },
          ]}],
          heap: [
            exception('excRandom', ADDRS.excRandom, 'AttributeError', ADDRS.AttrErrCls5,
              "module 'random' has no attribute 'randint'", {
                tb: 'game.py (line 7)',
                brief: true,
                extra: [{ key: 'obj', value: `module -> ${ADDRS.myRandom}`, type: 'ref' }],
                note: 'printed to stderr, then the process exits' }),
            sysModules('sysModules', ADDRS.sysModules5, D5_BASE.concat([['random', ADDRS.myRandom]])),
            sysPathObj(),
            myRandomObj({ refcount: 3 }),
            pickFnObj(),
          ],
          highlight: [],
        },
      },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '09-modules',
    demos: DEMOS,
    defaultDemo: 'once',
    defaultSpeed: 900,
  });
});
