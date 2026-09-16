/* ============================================================
   SESSION 07 — The GIL & Concurrency
   Demos: the 5 ms handoff, a lost deposit, the Lock that fixes it,
   what actually releases the GIL, a second process, one event loop
   ============================================================ */

'use strict';

/* Stable, made-up CPython-style addresses. Everything inside the parent
   process uses the 0x7fa… family. The child process in demo 5 deliberately
   uses 0x7fb… so a learner can see at a glance that it is a different
   address space, not a shared one. */
const ADDRS = {
  /* 1 · handoff */
  ThreadCls: '0x7fa10040',
  workFn:    '0x7fa100a0',
  t1Obj:     '0x7fa10120',
  t2Obj:     '0x7fa101a0',

  /* 2 · race */
  AccountCls:'0x7fa20040',
  acctObj:   '0x7fa200c0',
  depositFn: '0x7fa20140',
  t1Race:    '0x7fa201c0',
  t2Race:    '0x7fa20240',

  /* 3 · lock */
  LockCls:   '0x7fa30040',
  lockObj:   '0x7fa300c0',
  depositLk: '0x7fa30140',
  acctLk:    '0x7fa301c0',
  t1Lock:    '0x7fa30240',
  t2Lock:    '0x7fa302c0',

  /* 4 · blocking */
  napFn:     '0x7fa400a0',
  burnFn:    '0x7fa40120',
  napList:   '0x7fa401a0',

  /* 5 · processes — parent */
  ProcessCls:'0x7fa50040',
  procObj:   '0x7fa500c0',
  childFn:   '0x7fa50140',
  parentList:'0x7fa501c0',
  /* 5 · processes — child, a whole different interpreter */
  childList: '0x7fb50880',
  childFnC:  '0x7fb50820',

  /* 6 · asyncio */
  fetchFn:   '0x7fa600a0',
  mainFn:    '0x7fa60120',
  loopObj:   '0x7fa60040',
  TaskCls:   '0x7fa60180',
  coroA:     '0x7fa60200',
  coroB:     '0x7fa60280',
  taskA:     '0x7fa60300',
  taskB:     '0x7fa60380',
  strOne:    '0x7fa60400',
  strTwo:    '0x7fa60480',
};

/* The interpreter itself, drawn as the bottom box of the stack.
   It is not a call frame — it is the thing that decides which call frame is
   allowed to run. Keeping it in a fixed position means the reader only has to
   watch one row (`GIL`) to know who is executing. */
function runtime(holder, opts) {
  const o = opts || {};
  return {
    name: o.name || 'CPython interpreter',
    badge: o.badge || 'runtime',
    state: 'runtime',
    vars: [
      { name: 'GIL', value: o.free ? 'free — nobody is running Python' : 'held by ' + holder,
        inline: true, state: o.moved ? 'rebound' : 'normal' },
      { name: 'hands over', value: o.check || 'after 5 ms, or when a thread starts waiting', inline: true },
    ],
  };
}

/* A Thread object is an ordinary instance of threading.Thread. Drawing it that
   way (Session 04's classRef + __dict__) keeps the point honest: creating one
   allocates an object, it does not create an OS thread. */
function threadObj(id, pyId, label, opts) {
  const o = opts || {};
  return {
    id, pyId,
    type: 'instance',
    value: label,
    refcount: o.refcount || 1,
    mutable: true,
    state: o.state || 'normal',
    classRef: { name: 'Thread', pyId: ADDRS.ThreadCls },
    dictLabel: 'instance __dict__',
    pairs: [
      { key: '_target', value: o.target, type: 'ref' },
      o.ident
        ? { key: 'ident', value: o.ident, type: 'int' }
        : { key: 'ident', value: 'None', type: 'none' },
    ],
    note: o.note,
  };
}

const EMPTY = {
  frames: [
    runtime('MainThread'),
    { name: 'global', badge: 'MainThread', state: 'running', vars: [] },
  ],
  heap: [],
  highlight: [],
};

const DEMOS = {

  /* ──────────────────────────────────────────────────────────
     1 · One interpreter, one lock, one runner at a time
     ────────────────────────────────────────────────────────── */
  handoff: {
    watch: 'Watch one row: <code>GIL</code> in the grey box at the bottom. Every thread above it is ready to run — only the one named there actually is.',
    code: `import threading

def work(name):
    for i in range(3):
        print(name, i)

t1 = threading.Thread(target=work, args=("A",))
t2 = threading.Thread(target=work, args=("B",))
t1.start()
t2.start()
t1.join()
t2.join()`,
    steps: [
      {
        title: 'One thread, and it already holds the lock',
        desc: 'Even a program with no threads in it is running <em>in</em> a thread — the one Python calls <code>MainThread</code>. The grey box at the bottom is not a call frame; it is the interpreter, and it shows who currently has permission to execute Python bytecode.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>def work</code> builds a function object',
        desc: 'Nothing concurrent yet. This is Session 02, unchanged: <code>def</code> makes an object on the heap and binds a name to it. The body will not run until somebody calls it.',
        lines: [3, 4, 5],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 1, mutable: false, state: 'new' },
          ],
          highlight: ['workFn'],
        },
      },
      {
        title: 'Two <code>Thread</code> objects — and still one thread',
        desc: '<code>threading.Thread(...)</code> is a constructor call like any other. It produces an instance with a <code>__dict__</code>, holding a reference to your function. Look at <code>ident</code>: it is <code>None</code>. The operating system has not been told about anything yet.',
        lines: [7, 8],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'normal' },
              { name: 't1', ref: 't1Obj', pyId: ADDRS.t1Obj, type: 'instance', state: 'new' },
              { name: 't2', ref: 't2Obj', pyId: ADDRS.t2Obj, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 3, mutable: false, state: 'normal',
              note: 'three references now: the name work, and both Thread objects' },
            threadObj('t1Obj', ADDRS.t1Obj, 'Thread-1 (work)', { target: 'work @ 0x7fa100a0', state: 'new',
              note: 'an object, not a thread — nothing is running' }),
            threadObj('t2Obj', ADDRS.t2Obj, 'Thread-2 (work)', { target: 'work @ 0x7fa100a0', state: 'new' }),
          ],
          highlight: ['t1Obj', 't2Obj'],
        },
      },
      {
        title: '<code>t1.start()</code> asks the operating system for a real thread',
        desc: 'Now <code>ident</code> has a number: an actual OS thread exists and is ready to run. But <code>start()</code> returns immediately to the main thread, which still holds the GIL — so Thread-1 is <strong>ready and not running</strong>. That gap is the whole idea.',
        lines: [9],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'normal' },
              { name: 't1', ref: 't1Obj', pyId: ADDRS.t1Obj, type: 'instance', state: 'normal' },
              { name: 't2', ref: 't2Obj', pyId: ADDRS.t2Obj, type: 'instance', state: 'normal' },
            ]},
            { name: 'work(name="A")', badge: 'waiting for GIL', state: 'waiting', vars: [
              { name: 'name', value: 'A', type: 'str', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 3, mutable: false, state: 'normal' },
            threadObj('t1Obj', ADDRS.t1Obj, 'Thread-1 (work)', { target: 'work @ 0x7fa100a0', ident: 18708, state: 'mutated',
              note: 'a real OS thread exists now — it just cannot execute Python yet' }),
            threadObj('t2Obj', ADDRS.t2Obj, 'Thread-2 (work)', { target: 'work @ 0x7fa100a0' }),
          ],
          highlight: ['t1Obj'],
        },
      },
      {
        title: '<code>t2.start()</code> — three threads, still one GIL',
        desc: 'Three OS threads now exist and all three are perfectly capable of running. The interpreter will let exactly one of them execute Python at a time. The other two are not paused by your code; they are parked by the runtime.',
        lines: [10],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'normal' },
              { name: 't1', ref: 't1Obj', pyId: ADDRS.t1Obj, type: 'instance', state: 'normal' },
              { name: 't2', ref: 't2Obj', pyId: ADDRS.t2Obj, type: 'instance', state: 'normal' },
            ]},
            { name: 'work(name="A")', badge: 'waiting for GIL', state: 'waiting', vars: [
              { name: 'name', value: 'A', type: 'str', inline: true },
            ]},
            { name: 'work(name="B")', badge: 'waiting for GIL', state: 'waiting', vars: [
              { name: 'name', value: 'B', type: 'str', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 3, mutable: false, state: 'normal' },
            threadObj('t1Obj', ADDRS.t1Obj, 'Thread-1 (work)', { target: 'work @ 0x7fa100a0', ident: 18708 }),
            threadObj('t2Obj', ADDRS.t2Obj, 'Thread-2 (work)', { target: 'work @ 0x7fa100a0', ident: 18709, state: 'mutated',
              note: 'ready too — and also not running' }),
          ],
          highlight: ['t2Obj'],
        },
      },
      {
        title: '<code>t1.join()</code> — the main thread steps away and the GIL moves',
        desc: '<code>join()</code> means &ldquo;wait here until that thread ends.&rdquo; Waiting is not computing, so the main thread hands the GIL back before it parks. The interpreter gives it to Thread-1, which finally starts running your loop.',
        lines: [11],
        memory: {
          frames: [
            runtime('Thread-1', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'normal' },
              { name: 't1', ref: 't1Obj', pyId: ADDRS.t1Obj, type: 'instance', state: 'normal' },
              { name: 't2', ref: 't2Obj', pyId: ADDRS.t2Obj, type: 'instance', state: 'normal' },
            ]},
            { name: 'work(name="A")', badge: 'running', state: 'running', vars: [
              { name: 'name', value: 'A', type: 'str', inline: true },
              { name: 'i', value: 0, type: 'int', inline: true, state: 'new' },
            ]},
            { name: 'work(name="B")', badge: 'waiting for GIL', state: 'waiting', vars: [
              { name: 'name', value: 'B', type: 'str', inline: true },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 3, mutable: false, state: 'normal' },
            threadObj('t1Obj', ADDRS.t1Obj, 'Thread-1 (work)', { target: 'work @ 0x7fa100a0', ident: 18708 }),
            threadObj('t2Obj', ADDRS.t2Obj, 'Thread-2 (work)', { target: 'work @ 0x7fa100a0', ident: 18709 }),
          ],
          highlight: ['t1Obj'],
        },
      },
      {
        title: 'Five milliseconds later, the GIL is taken away mid-loop',
        desc: 'Thread-1 did not finish and did not ask to stop. The interpreter simply asked it to drop the lock at the next safe point — the jump back to the top of the <code>for</code> loop. Its frame is still there, with <code>i</code> frozen at <code>1</code>. Thread-2 starts from the beginning.',
        lines: [4, 5],
        memory: {
          frames: [
            runtime('Thread-2', { moved: true, check: 'this handover happened at the loop jump' }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'normal' },
              { name: 't1', ref: 't1Obj', pyId: ADDRS.t1Obj, type: 'instance', state: 'normal' },
              { name: 't2', ref: 't2Obj', pyId: ADDRS.t2Obj, type: 'instance', state: 'normal' },
            ]},
            { name: 'work(name="A")', badge: 'waiting for GIL', state: 'waiting', vars: [
              { name: 'name', value: 'A', type: 'str', inline: true },
              { name: 'i', value: 1, type: 'int', inline: true, state: 'rebound' },
            ]},
            { name: 'work(name="B")', badge: 'running', state: 'running', vars: [
              { name: 'name', value: 'B', type: 'str', inline: true },
              { name: 'i', value: 0, type: 'int', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 3, mutable: false, state: 'normal' },
            threadObj('t1Obj', ADDRS.t1Obj, 'Thread-1 (work)', { target: 'work @ 0x7fa100a0', ident: 18708,
              note: 'alive and suspended, not finished' }),
            threadObj('t2Obj', ADDRS.t2Obj, 'Thread-2 (work)', { target: 'work @ 0x7fa100a0', ident: 18709 }),
          ],
          highlight: ['t2Obj'],
        },
      },
      {
        title: 'The lock keeps changing hands until both loops are done',
        desc: 'This is the whole mechanism. The two loops <em>interleave</em> — their output lines mix — but they never overlap: at no instant are two threads executing Python bytecode. The work took as long as doing it one after the other, plus the cost of all that swapping.',
        lines: [4, 5],
        memory: {
          frames: [
            runtime('Thread-1', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'normal' },
              { name: 't1', ref: 't1Obj', pyId: ADDRS.t1Obj, type: 'instance', state: 'normal' },
              { name: 't2', ref: 't2Obj', pyId: ADDRS.t2Obj, type: 'instance', state: 'normal' },
            ]},
            { name: 'work(name="A")', badge: 'running', state: 'running', vars: [
              { name: 'name', value: 'A', type: 'str', inline: true },
              { name: 'i', value: 2, type: 'int', inline: true, state: 'rebound' },
            ]},
            { name: 'work(name="B")', badge: 'waiting for GIL', state: 'waiting', vars: [
              { name: 'name', value: 'B', type: 'str', inline: true },
              { name: 'i', value: 1, type: 'int', inline: true },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 3, mutable: false, state: 'normal' },
            threadObj('t1Obj', ADDRS.t1Obj, 'Thread-1 (work)', { target: 'work @ 0x7fa100a0', ident: 18708 }),
            threadObj('t2Obj', ADDRS.t2Obj, 'Thread-2 (work)', { target: 'work @ 0x7fa100a0', ident: 18709 }),
          ],
          highlight: ['t1Obj', 't2Obj'],
        },
      },
      {
        title: 'Both threads end, and the main thread gets the lock back',
        desc: 'The two call frames are gone. The <code>Thread</code> objects are still in memory — they are ordinary objects, and <code>t1</code> and <code>t2</code> still name them — but the OS threads behind them have exited. <code>join()</code> returns and the main thread carries on.',
        lines: [11, 12],
        memory: {
          frames: [
            runtime('MainThread', { moved: true }),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'work', ref: 'workFn', pyId: ADDRS.workFn, type: 'function', state: 'normal' },
              { name: 't1', ref: 't1Obj', pyId: ADDRS.t1Obj, type: 'instance', state: 'normal' },
              { name: 't2', ref: 't2Obj', pyId: ADDRS.t2Obj, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'workFn', pyId: ADDRS.workFn, type: 'function', value: 'work(name)', refcount: 3, mutable: false, state: 'normal' },
            threadObj('t1Obj', ADDRS.t1Obj, 'Thread-1 (work)', { target: 'work @ 0x7fa100a0', ident: 18708,
              note: 'object alive, OS thread finished — repr now says "stopped"' }),
            threadObj('t2Obj', ADDRS.t2Obj, 'Thread-2 (work)', { target: 'work @ 0x7fa100a0', ident: 18709 }),
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     2 · The GIL protects the interpreter, not your variables
     ────────────────────────────────────────────────────────── */
  race: {
    watch: 'Watch <code>balance</code> on the heap and <code>value read</code> inside each thread. Two deposits go in. Only one comes out.',
    code: `import threading

class Account:
    def get(self):    return self.balance
    def set(self, v): self.balance = v

acct = Account()
acct.balance = 0

def deposit():
    acct.set(acct.get() + 1)

t1 = threading.Thread(target=deposit)
t2 = threading.Thread(target=deposit)
t1.start(); t2.start()
t1.join();  t2.join()`,
    steps: [
      {
        title: 'Two threads, one number, one expected answer',
        desc: 'Each thread will add <code>1</code> to the same balance exactly once. Nobody would argue about what the answer should be. Hold on to that number: <strong>2</strong>.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'One account object, one attribute, value <code>0</code>',
        desc: 'Session 04’s picture: an instance with a <code>__dict__</code>, and <code>balance</code> living inside it. There is one of these. Both threads are about to reach for it.',
        lines: [7, 8],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'acct', ref: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', value: 'Account()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }] },
          ],
          highlight: ['acctObj'],
        },
      },
      {
        title: 'Both threads start; Thread-1 gets the lock first',
        desc: 'Same picture as demo 1. Thread-2 is ready and waiting. Nothing has gone wrong yet — and nothing is about to go wrong with the <em>GIL</em>. What goes wrong is the shape of line 11.',
        lines: [13, 14, 15],
        memory: {
          frames: [
            runtime('Thread-1', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'acct', ref: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'running', state: 'running', vars: [] },
            { name: 'deposit()', badge: 'waiting for GIL', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }] },
            threadObj('t1Race', ADDRS.t1Race, 'Thread-1 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21440 }),
            threadObj('t2Race', ADDRS.t2Race, 'Thread-2 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21441 }),
          ],
          highlight: ['acctObj'],
        },
      },
      {
        title: 'Thread-1 reads <code>0</code> — into its own private stack',
        desc: 'Line 11 is not one action. Its first part, <code>acct.get()</code>, copies the value <code>0</code> out of the object and onto <em>Thread-1’s</em> evaluation stack, shown here as <code>value read</code>. From this instant on, Thread-1 is working from a snapshot.',
        lines: [11, 4],
        memory: {
          frames: [
            runtime('Thread-1'),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'acct', ref: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'running', state: 'running', vars: [
              { name: 'value read', value: 0, type: 'int', inline: true, state: 'new' },
            ]},
            { name: 'deposit()', badge: 'waiting for GIL', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }],
              note: 'still 0 — the read did not change anything' },
            threadObj('t1Race', ADDRS.t1Race, 'Thread-1 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21440 }),
            threadObj('t2Race', ADDRS.t2Race, 'Thread-2 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21441 }),
          ],
          highlight: ['acctObj'],
        },
      },
      {
        title: 'The handover lands <em>between</em> the read and the write',
        desc: 'Calling a method is one of the moments the interpreter checks whether to switch threads. It switches here. Thread-1 is frozen holding a <code>0</code> that is about to stop being true — and it has no way to notice.',
        lines: [11],
        memory: {
          frames: [
            runtime('Thread-2', { moved: true, check: 'switched at the call into acct.set(...)' }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'acct', ref: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'frozen mid-line', state: 'waiting', vars: [
              { name: 'value read', value: 0, type: 'int', inline: true, state: 'rebound' },
            ]},
            { name: 'deposit()', badge: 'running', state: 'running', vars: [] },
          ],
          heap: [
            { id: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }] },
            threadObj('t1Race', ADDRS.t1Race, 'Thread-1 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21440,
              note: 'suspended halfway through one line of your code' }),
            threadObj('t2Race', ADDRS.t2Race, 'Thread-2 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21441 }),
          ],
          highlight: ['acctObj'],
        },
      },
      {
        title: 'Thread-2 reads the same <code>0</code>, adds 1, and stores <code>1</code>',
        desc: 'Thread-2 runs the whole line without interruption. It reads <code>0</code>, computes <code>1</code>, writes it back. From its point of view everything is perfect: the balance went from 0 to 1, exactly one deposit.',
        lines: [11, 5],
        memory: {
          frames: [
            runtime('Thread-2'),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'acct', ref: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'frozen mid-line', state: 'waiting', vars: [
              { name: 'value read', value: 0, type: 'int', inline: true },
            ]},
            { name: 'deposit()', badge: 'running', state: 'running', vars: [
              { name: 'value read', value: 0, type: 'int', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            { id: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 1, type: 'int' }],
              note: 'Thread-2 finished its deposit — balance is 1' },
            threadObj('t1Race', ADDRS.t1Race, 'Thread-1 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21440 }),
            threadObj('t2Race', ADDRS.t2Race, 'Thread-2 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21441 }),
          ],
          highlight: ['acctObj'],
        },
      },
      {
        title: 'Thread-1 wakes up and writes its stale answer over the top',
        desc: 'Thread-1 resumes exactly where it stopped, still holding <code>0</code>. It computes <code>0 + 1</code> and stores <code>1</code>. The value it overwrites is also <code>1</code>, so nothing looks broken — but Thread-2’s deposit has just been erased.',
        lines: [11, 5],
        memory: {
          frames: [
            runtime('Thread-1', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'acct', ref: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'running', state: 'running', vars: [
              { name: 'value read', value: 0, type: 'int', inline: true, state: 'rebound' },
            ]},
            { name: 'deposit()', badge: 'finished', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 1, type: 'int' }],
              note: 'overwritten with 0 + 1 — the same 1 it already held' },
            threadObj('t1Race', ADDRS.t1Race, 'Thread-1 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21440 }),
            threadObj('t2Race', ADDRS.t2Race, 'Thread-2 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21441 }),
          ],
          highlight: ['acctObj'],
        },
      },
      {
        title: 'Two deposits went in. The balance says <code>1</code>.',
        desc: 'No exception, no warning, no corrupted memory — the interpreter did its job perfectly. It promised that one bytecode would finish before another began. It never promised your <em>line</em> would. <strong>The GIL protects the interpreter’s own data structures, not yours.</strong>',
        lines: [16],
        memory: {
          frames: [
            runtime('MainThread', { moved: true }),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'acct', ref: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'acctObj', pyId: ADDRS.acctObj, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 1, type: 'int' }],
              note: 'expected 2 — one update was lost' },
            threadObj('t1Race', ADDRS.t1Race, 'Thread-1 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21440 }),
            threadObj('t2Race', ADDRS.t2Race, 'Thread-2 (deposit)', { target: 'deposit @ 0x7fa20140', ident: 21441 }),
          ],
          highlight: ['acctObj'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     3 · A Lock turns three steps into one indivisible step
     ────────────────────────────────────────────────────────── */
  lock: {
    watch: 'Two different queues appear. One thread waits for the <strong>GIL</strong>; the other waits for the <strong>Lock</strong>. They are not the same queue.',
    code: `import threading

class Account:
    def get(self):    return self.balance
    def set(self, v): self.balance = v

acct = Account()
acct.balance = 0
lock = threading.Lock()

def deposit():
    with lock:
        acct.set(acct.get() + 1)

t1 = threading.Thread(target=deposit)
t2 = threading.Thread(target=deposit)
t1.start(); t2.start()
t1.join();  t2.join()`,
    steps: [
      {
        title: 'Same program, one extra object',
        desc: 'The same <code>Account</code> as Demo 2, and the same two threads. Nothing about the GIL changes. What changes is that <em>you</em> add a lock of your own, covering exactly the three operations that must not be split.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'A <code>Lock</code> is an ordinary object, and it starts unlocked',
        desc: '<code>threading.Lock()</code> allocates an object like any other. It knows one thing: whether somebody is currently holding it. Right now, nobody is.',
        lines: [7, 8, 9],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'lock', ref: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', state: 'new' },
              { name: 'acct', ref: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', value: 'Lock()', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'lock', pyId: ADDRS.LockCls },
              dictLabel: 'lock state',
              pairs: [{ key: 'locked()', value: false, type: 'bool' }],
              note: 'nobody is holding it' },
            { id: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', value: 'Account()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }] },
          ],
          highlight: ['lockObj'],
        },
      },
      {
        title: 'Thread-1 enters the <code>with</code> block and takes the lock',
        desc: '<code>with lock:</code> calls <code>lock.acquire()</code>. It was free, so Thread-1 walks straight in and <code>locked()</code> flips to <code>True</code>. Nothing has slowed down yet.',
        lines: [17, 12],
        memory: {
          frames: [
            runtime('Thread-1', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'lock', ref: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', state: 'normal' },
              { name: 'acct', ref: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'holds the lock', state: 'running', vars: [] },
            { name: 'deposit()', badge: 'waiting for GIL', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', value: 'Lock()', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'lock', pyId: ADDRS.LockCls },
              dictLabel: 'lock state',
              pairs: [{ key: 'locked()', value: true, type: 'bool' }],
              note: 'Thread-1 is inside the with-block' },
            { id: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }] },
          ],
          highlight: ['lockObj'],
        },
      },
      {
        title: 'Thread-2 reaches the same line and is turned away at the door',
        desc: 'The GIL moved to Thread-2, which immediately hit <code>with lock:</code>. The lock is taken, so <code>acquire()</code> blocks — and blocking is waiting, so Thread-2 hands the GIL straight back. It is now in a <em>different</em> queue.',
        lines: [12],
        memory: {
          frames: [
            runtime('Thread-1', { moved: true, check: 'Thread-2 asked for the lock, not the GIL' }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'lock', ref: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', state: 'normal' },
              { name: 'acct', ref: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'holds the lock', state: 'running', vars: [] },
            { name: 'deposit()', badge: 'blocked on lock', state: 'blocked', vars: [] },
          ],
          heap: [
            { id: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', value: 'Lock()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'lock', pyId: ADDRS.LockCls },
              dictLabel: 'lock state',
              pairs: [{ key: 'locked()', value: true, type: 'bool' }],
              note: 'Thread-2 is parked here until it is released' },
            { id: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }] },
          ],
          highlight: ['lockObj'],
        },
      },
      {
        title: 'Thread-1 reads <code>0</code> — and the 5 ms tick no longer matters',
        desc: 'The interpreter is still free to take the GIL away from Thread-1. It just has nobody useful to give it to: Thread-2 is not asking for the GIL, it is asking for the lock. So Thread-1 keeps going.',
        lines: [13],
        memory: {
          frames: [
            runtime('Thread-1', { check: 'no other thread is asking for the GIL' }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'lock', ref: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', state: 'normal' },
              { name: 'acct', ref: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'holds the lock', state: 'running', vars: [
              { name: 'value read', value: 0, type: 'int', inline: true, state: 'new' },
            ]},
            { name: 'deposit()', badge: 'blocked on lock', state: 'blocked', vars: [] },
          ],
          heap: [
            { id: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', value: 'Lock()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'lock', pyId: ADDRS.LockCls },
              dictLabel: 'lock state',
              pairs: [{ key: 'locked()', value: true, type: 'bool' }] },
            { id: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 0, type: 'int' }],
              note: 'read while nobody else can touch it' },
          ],
          highlight: ['acctLk'],
        },
      },
      {
        title: 'Thread-1 writes <code>1</code> and leaves the block',
        desc: 'The read, the add and the write all happened with the lock held, so no other thread could slip between them. Leaving the <code>with</code> block calls <code>release()</code> — and because it is a <code>with</code> block, that happens even if the body raises.',
        lines: [13, 12],
        memory: {
          frames: [
            runtime('Thread-1'),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'lock', ref: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', state: 'normal' },
              { name: 'acct', ref: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'finished', state: 'running', vars: [] },
            { name: 'deposit()', badge: 'woken up', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', value: 'Lock()', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'lock', pyId: ADDRS.LockCls },
              dictLabel: 'lock state',
              pairs: [{ key: 'locked()', value: false, type: 'bool' }],
              note: 'released — Thread-2 can stop waiting' },
            { id: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 1, type: 'int' }] },
          ],
          highlight: ['lockObj', 'acctLk'],
        },
      },
      {
        title: 'Thread-2 takes the lock and does its whole deposit',
        desc: 'It reads <code>1</code>, not the stale <code>0</code> from the racy version, because it was not allowed to read until Thread-1 had finished writing. Same three operations, this time genuinely one after the other.',
        lines: [12, 13],
        memory: {
          frames: [
            runtime('Thread-2', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'lock', ref: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', state: 'normal' },
              { name: 'acct', ref: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', state: 'normal' },
            ]},
            { name: 'deposit()', badge: 'finished', state: 'waiting', vars: [] },
            { name: 'deposit()', badge: 'holds the lock', state: 'running', vars: [
              { name: 'value read', value: 1, type: 'int', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            { id: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', value: 'Lock()', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'lock', pyId: ADDRS.LockCls },
              dictLabel: 'lock state',
              pairs: [{ key: 'locked()', value: true, type: 'bool' }],
              note: 'held by Thread-2 now' },
            { id: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', value: 'Account()', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 2, type: 'int' }] },
          ],
          highlight: ['acctLk'],
        },
      },
      {
        title: 'The balance is <code>2</code> — and it will be <code>2</code> every single run',
        desc: 'That last part is what you were really buying. The racy version is not always wrong; it is <em>sometimes</em> wrong, which is far harder to find. A lock makes the outcome the same every time, on every machine, at every thread count.',
        lines: [18],
        memory: {
          frames: [
            runtime('MainThread', { moved: true }),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'lock', ref: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', state: 'normal' },
              { name: 'acct', ref: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'lockObj', pyId: ADDRS.lockObj, type: 'instance', value: 'Lock()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'lock', pyId: ADDRS.LockCls },
              dictLabel: 'lock state',
              pairs: [{ key: 'locked()', value: false, type: 'bool' }] },
            { id: 'acctLk', pyId: ADDRS.acctLk, type: 'instance', value: 'Account()', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Account', pyId: ADDRS.AccountCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'balance', value: 2, type: 'int' }],
              note: 'two deposits, two increments' },
          ],
          highlight: ['acctLk'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     4 · Waiting releases the GIL. Computing does not.
     ────────────────────────────────────────────────────────── */
  blocking: {
    watch: 'Watch the <code>GIL</code> row go <em>free</em>. That only ever happens because a thread stepped away to wait for something.',
    code: `import threading, time

def nap():
    time.sleep(1)

def burn():
    total = 0
    for i in range(5000000):
        total += i

naps = [threading.Thread(target=nap) for _ in range(4)]
for t in naps: t.start()
for t in naps: t.join()`,
    steps: [
      {
        title: 'Two shapes of work, and only one of them shares well',
        desc: '<code>nap</code> spends its whole life waiting. <code>burn</code> spends its whole life computing. Threads will transform the first and do nothing at all for the second, and the reason is visible in one row of the diagram.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>time.sleep</code> gives the GIL back <em>before</em> it waits',
        desc: 'This is the deal every blocking call in the standard library keeps: the moment it is going to sit and wait — for a timer, a socket, a file, a database — it releases the GIL first, and reacquires it when the answer comes back.',
        lines: [3, 4],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'nap', ref: 'napFn', pyId: ADDRS.napFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'napFn', pyId: ADDRS.napFn, type: 'function', value: 'nap()', refcount: 1, mutable: false, state: 'new',
              note: 'the waiting happens outside the interpreter' },
          ],
          highlight: ['napFn'],
        },
      },
      {
        title: '<code>burn</code> never waits, so it never volunteers the lock',
        desc: 'There is no point in this loop where the thread has nothing to do. It only ever loses the GIL because the interpreter takes it — after 5 ms, at the jump back to the top of the loop. It then has to queue up and get it again.',
        lines: [6, 7, 8, 9],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'nap', ref: 'napFn', pyId: ADDRS.napFn, type: 'function', state: 'normal' },
              { name: 'burn', ref: 'burnFn', pyId: ADDRS.burnFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'napFn', pyId: ADDRS.napFn, type: 'function', value: 'nap()', refcount: 1, mutable: false, state: 'normal' },
            { id: 'burnFn', pyId: ADDRS.burnFn, type: 'function', value: 'burn()', refcount: 1, mutable: false, state: 'new',
              note: 'pure Python work — it needs the GIL for every single bytecode' },
          ],
          highlight: ['burnFn'],
        },
      },
      {
        title: 'Four nap threads start; the first one reaches <code>sleep</code>',
        desc: 'Thread-1 gets the GIL, calls <code>time.sleep(1)</code>, and immediately hands the lock back. Its frame stays alive — it is waiting, not finished — but it is out of the interpreter’s way.',
        lines: [11, 12, 4],
        memory: {
          frames: [
            runtime('Thread-2', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'naps', ref: 'napList', pyId: ADDRS.napList, type: 'list', state: 'new' },
            ]},
            { name: 'nap()', badge: 'waiting on I/O', state: 'waiting', vars: [
              { name: 'sleeping until', value: 't + 1.000 s', inline: true, state: 'new' },
            ]},
            { name: 'nap()', badge: 'running', state: 'running', vars: [] },
          ],
          heap: [
            { id: 'napFn', pyId: ADDRS.napFn, type: 'function', value: 'nap()', refcount: 5, mutable: false, state: 'normal' },
            { id: 'napList', pyId: ADDRS.napList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 'Thread-1 -> 0x7fa10120', type: 'ref' },
              { value: 'Thread-2 -> 0x7fa101a0', type: 'ref' },
              { value: 'Thread-3 -> 0x7fa10220', type: 'ref' },
              { value: 'Thread-4 -> 0x7fa102a0', type: 'ref' },
            ] },
          ],
          highlight: ['napList'],
        },
      },
      {
        title: 'The second thread does not have to wait its turn',
        desc: 'The GIL was free, so Thread-2 took it, called <code>sleep</code>, and gave it up as well. Two threads are now waiting <em>at the same time</em>. Their two one-second waits are overlapping — that is the entire benefit of threads.',
        lines: [12, 4],
        memory: {
          frames: [
            runtime('Thread-3', { moved: true }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'naps', ref: 'napList', pyId: ADDRS.napList, type: 'list', state: 'normal' },
            ]},
            { name: 'nap()', badge: 'waiting on I/O', state: 'waiting', vars: [
              { name: 'sleeping until', value: 't + 1.000 s', inline: true },
            ]},
            { name: 'nap()', badge: 'waiting on I/O', state: 'waiting', vars: [
              { name: 'sleeping until', value: 't + 1.000 s', inline: true, state: 'new' },
            ]},
            { name: 'nap()', badge: 'running', state: 'running', vars: [] },
          ],
          heap: [
            { id: 'napFn', pyId: ADDRS.napFn, type: 'function', value: 'nap()', refcount: 5, mutable: false, state: 'normal' },
            { id: 'napList', pyId: ADDRS.napList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Thread-1 -> 0x7fa10120', type: 'ref' },
              { value: 'Thread-2 -> 0x7fa101a0', type: 'ref' },
              { value: 'Thread-3 -> 0x7fa10220', type: 'ref' },
              { value: 'Thread-4 -> 0x7fa102a0', type: 'ref' },
            ] },
          ],
          highlight: [],
        },
      },
      {
        title: 'All four are asleep — and nobody holds the GIL at all',
        desc: 'Look at the bottom box. The lock everybody was fighting over is simply <strong>free</strong>, because there is no Python left to run. Four threads, four waits, all happening at once. Nothing is being computed, so nothing is contended.',
        lines: [12],
        memory: {
          frames: [
            runtime('nobody', { free: true, moved: true, check: 'every thread is parked outside the interpreter' }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'naps', ref: 'napList', pyId: ADDRS.napList, type: 'list', state: 'normal' },
            ]},
            { name: 'nap()', badge: 'waiting on I/O', state: 'waiting', vars: [
              { name: 'sleeping until', value: 't + 1.000 s', inline: true },
            ]},
            { name: 'nap()', badge: 'waiting on I/O', state: 'waiting', vars: [
              { name: 'sleeping until', value: 't + 1.000 s', inline: true },
            ]},
            { name: 'nap()', badge: 'waiting on I/O', state: 'waiting', vars: [
              { name: 'sleeping until', value: 't + 1.000 s', inline: true },
            ]},
            { name: 'nap()', badge: 'waiting on I/O', state: 'waiting', vars: [
              { name: 'sleeping until', value: 't + 1.000 s', inline: true, state: 'new' },
            ]},
          ],
          heap: [
            { id: 'napList', pyId: ADDRS.napList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Thread-1 -> 0x7fa10120', type: 'ref' },
              { value: 'Thread-2 -> 0x7fa101a0', type: 'ref' },
              { value: 'Thread-3 -> 0x7fa10220', type: 'ref' },
              { value: 'Thread-4 -> 0x7fa102a0', type: 'ref' },
            ] },
          ],
          highlight: [],
        },
      },
      {
        title: 'One second later they all wake up. Total elapsed: one second.',
        desc: 'Four sleeps of one second finished in one second, not four. Measured on the machine this session was written on: <code>2.01 s</code> when run one after the other, <code>0.50 s</code> across four threads.',
        lines: [13],
        memory: {
          frames: [
            runtime('MainThread', { moved: true }),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'naps', ref: 'napList', pyId: ADDRS.napList, type: 'list', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'napList', pyId: ADDRS.napList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 'Thread-1 -> finished', type: 'str' },
              { value: 'Thread-2 -> finished', type: 'str' },
              { value: 'Thread-3 -> finished', type: 'str' },
              { value: 'Thread-4 -> finished', type: 'str' },
            ], note: 'four one-second waits, one second of wall clock' },
          ],
          highlight: ['napList'],
        },
      },
      {
        title: 'Now swap in <code>burn</code>, and the GIL is never free',
        desc: 'Two compute threads never step aside, so the interpreter has to prise the lock away from each in turn. Only one runs at any instant, and all that swapping costs real time: on the same machine, <code>1.81 s</code> serial became <code>2.49 s</code> across two threads. Threads made CPU work <em>slower</em>.',
        lines: [8, 9],
        memory: {
          frames: [
            runtime('Thread-1', { moved: true, check: 'taken back after 5 ms — never volunteered' }),
            { name: 'global', badge: 'blocked on join', state: 'blocked', vars: [
              { name: 'burn', ref: 'burnFn', pyId: ADDRS.burnFn, type: 'function', state: 'normal' },
            ]},
            { name: 'burn()', badge: 'running', state: 'running', vars: [
              { name: 'i', value: 1284310, type: 'int', inline: true, state: 'rebound' },
            ]},
            { name: 'burn()', badge: 'waiting for GIL', state: 'waiting', vars: [
              { name: 'i', value: 1051992, type: 'int', inline: true },
            ]},
          ],
          heap: [
            { id: 'burnFn', pyId: ADDRS.burnFn, type: 'function', value: 'burn()', refcount: 3, mutable: false, state: 'normal',
              note: 'both threads need the GIL for every bytecode — they take turns, they do not overlap' },
          ],
          highlight: ['burnFn'],
        },
      },
      {
        title: 'The rule that decides everything: threads overlap waiting, never computing',
        desc: 'Ask one question about your slow code — <em>is it waiting, or is it thinking?</em> Waiting on a network, a disk, a database, a subprocess: threads help, a lot. Thinking in Python: threads cannot help, because thinking needs the lock.',
        lines: [],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'nap', ref: 'napFn', pyId: ADDRS.napFn, type: 'function', state: 'normal' },
              { name: 'burn', ref: 'burnFn', pyId: ADDRS.burnFn, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'napFn', pyId: ADDRS.napFn, type: 'function', value: 'nap()', refcount: 1, mutable: false, state: 'normal',
              note: 'I/O-bound — 4 threads finished 4x faster' },
            { id: 'burnFn', pyId: ADDRS.burnFn, type: 'function', value: 'burn()', refcount: 1, mutable: false, state: 'normal',
              note: 'CPU-bound — 2 threads finished slower than 1' },
          ],
          highlight: ['napFn', 'burnFn'],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     5 · A second process brings its own GIL — and its own memory
     ────────────────────────────────────────────────────────── */
  processes: {
    watch: 'Two grey interpreter boxes appear, each with its own GIL. The memory panel is showing two <em>separate</em> address spaces side by side.',
    code: `import multiprocessing as mp

def child(data):
    data.append("from child")
    print("child sees:", data)

if __name__ == "__main__":
    data = [1, 2, 3]
    p = mp.Process(target=child, args=(data,))
    p.start()
    p.join()
    print("parent sees:", data)`,
    steps: [
      {
        title: 'If the lock is the problem, stop sharing the lock',
        desc: 'A thread shares everything with its siblings, including the one GIL. A process shares nothing: its own interpreter, its own GIL, its own heap. Two processes really do run Python at the same instant.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: 'One list, in the parent’s memory',
        desc: 'An ordinary list at an ordinary address. Everything so far is the single-process world you already know.',
        lines: [8],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120' }),
            { name: 'global', badge: 'parent', state: 'running', vars: [
              { name: 'data', ref: 'parentList', pyId: ADDRS.parentList, type: 'list', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ] },
          ],
          highlight: ['parentList'],
        },
      },
      {
        title: '<code>mp.Process(...)</code> builds an object — still one process',
        desc: 'Exactly like <code>Thread</code>: this is a constructor, not a fork. It records what to run and what to run it with. The operating system has not been asked for anything yet.',
        lines: [9],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120' }),
            { name: 'global', badge: 'parent', state: 'running', vars: [
              { name: 'data', ref: 'parentList', pyId: ADDRS.parentList, type: 'list', state: 'normal' },
              { name: 'p', ref: 'procObj', pyId: ADDRS.procObj, type: 'instance', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ] },
            { id: 'procObj', pyId: ADDRS.procObj, type: 'instance', value: 'Process(child)', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'Process', pyId: ADDRS.ProcessCls },
              dictLabel: 'instance __dict__',
              pairs: [
                { key: '_target', value: 'child @ 0x7fa50140', type: 'ref' },
                { key: '_args', value: '(data,)', type: 'str' },
                { key: 'pid', value: 'None', type: 'none' },
              ],
              note: 'no operating-system process yet' },
          ],
          highlight: ['procObj'],
        },
      },
      {
        title: '<code>p.start()</code> launches a whole second Python',
        desc: 'Two interpreter boxes now. Two GILs. The child re-imports your module to get at <code>child</code> — which is exactly why the <code>if __name__ == "__main__":</code> guard on line 7 is not optional. Without it, the child re-runs <code>p.start()</code> and spawns forever.',
        lines: [10, 7],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120' }),
            { name: 'global', badge: 'parent', state: 'running', vars: [
              { name: 'data', ref: 'parentList', pyId: ADDRS.parentList, type: 'list', state: 'normal' },
              { name: 'p', ref: 'procObj', pyId: ADDRS.procObj, type: 'instance', state: 'normal' },
            ]},
            runtime('its own MainThread', { name: 'child interpreter', badge: 'PID 9932', moved: true, check: 'a second, completely separate GIL' }),
            { name: 'global', badge: 'child', state: 'running', vars: [] },
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ], note: 'parent memory' },
            { id: 'procObj', pyId: ADDRS.procObj, type: 'instance', value: 'Process(child)', refcount: 1, mutable: true, state: 'mutated',
              classRef: { name: 'Process', pyId: ADDRS.ProcessCls },
              dictLabel: 'instance __dict__',
              pairs: [
                { key: '_target', value: 'child @ 0x7fa50140', type: 'ref' },
                { key: '_args', value: '(data,)', type: 'str' },
                { key: 'pid', value: 9932, type: 'int' },
              ] },
            { id: 'childFnC', pyId: ADDRS.childFnC, type: 'function', value: 'child(data)', refcount: 1, mutable: false, state: 'new',
              note: 'child memory — a fresh function object at a fresh address' },
          ],
          highlight: ['childFnC'],
        },
      },
      {
        title: 'The argument is pickled across — a copy, not a link',
        desc: 'The list cannot be handed over, because the child cannot reach the parent’s memory. So it is <strong>pickled</strong> to bytes, sent, and rebuilt. Same three values. Different object, at an address in a different address space.',
        lines: [9, 3],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120' }),
            { name: 'global', badge: 'parent', state: 'running', vars: [
              { name: 'data', ref: 'parentList', pyId: ADDRS.parentList, type: 'list', state: 'normal' },
              { name: 'p', ref: 'procObj', pyId: ADDRS.procObj, type: 'instance', state: 'normal' },
            ]},
            runtime('its own MainThread', { name: 'child interpreter', badge: 'PID 9932' }),
            { name: 'child(data)', badge: 'child', state: 'running', vars: [
              { name: 'data', ref: 'childList', pyId: ADDRS.childList, type: 'list', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ], note: 'parent memory — 0x7fa5…' },
            { id: 'childList', pyId: ADDRS.childList, type: 'list', refcount: 1, mutable: true, state: 'new', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ], note: 'child memory — 0x7fb5… a rebuilt copy, equal but not identical' },
          ],
          highlight: ['parentList', 'childList'],
        },
      },
      {
        title: 'The child appends to <em>its</em> list',
        desc: 'Session 01 said mutation changes the object in place and every name pointing at it sees the change. That is still true — but only for names in this process. There is no name in the parent pointing here.',
        lines: [4, 5],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120' }),
            { name: 'global', badge: 'parent', state: 'running', vars: [
              { name: 'data', ref: 'parentList', pyId: ADDRS.parentList, type: 'list', state: 'normal' },
              { name: 'p', ref: 'procObj', pyId: ADDRS.procObj, type: 'instance', state: 'normal' },
            ]},
            runtime('its own MainThread', { name: 'child interpreter', badge: 'PID 9932' }),
            { name: 'child(data)', badge: 'child', state: 'running', vars: [
              { name: 'data', ref: 'childList', pyId: ADDRS.childList, type: 'list', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ], note: 'parent memory — untouched' },
            { id: 'childList', pyId: ADDRS.childList, type: 'list', refcount: 1, mutable: true, state: 'mutated', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
              { value: 'from child', type: 'str' },
            ], note: 'child memory — prints [1, 2, 3, \'from child\']' },
          ],
          highlight: ['childList'],
        },
      },
      {
        title: 'The child exits and takes everything with it',
        desc: 'When a process ends, its whole address space goes — its heap, its objects, its GIL. Nothing is written back. <code>p.join()</code> returns, and the parent has no idea what the child changed.',
        lines: [11],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120', moved: true }),
            { name: 'global', badge: 'parent', state: 'running', vars: [
              { name: 'data', ref: 'parentList', pyId: ADDRS.parentList, type: 'list', state: 'normal' },
              { name: 'p', ref: 'procObj', pyId: ADDRS.procObj, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ] },
            { id: 'childList', pyId: ADDRS.childList, type: 'list', refcount: 0, mutable: true, state: 'gc', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
              { value: 'from child', type: 'str' },
            ], note: 'the whole child address space is gone' },
            { id: 'procObj', pyId: ADDRS.procObj, type: 'instance', value: 'Process(child)', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'Process', pyId: ADDRS.ProcessCls },
              dictLabel: 'instance __dict__',
              pairs: [
                { key: 'pid', value: 9932, type: 'int' },
                { key: 'exitcode', value: 0, type: 'int' },
              ] },
          ],
          highlight: ['childList'],
        },
      },
      {
        title: 'The parent prints <code>[1, 2, 3]</code>',
        desc: 'This surprises almost everybody once. The mental model that makes it obvious: a <code>Thread</code> shares your objects, a <code>Process</code> shares your <em>values</em>. To get something back, it has to travel — a return value from a <code>Pool</code>, a <code>Queue</code>, a <code>Pipe</code>, or shared memory.',
        lines: [12],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120' }),
            { name: 'global', badge: 'parent', state: 'running', vars: [
              { name: 'data', ref: 'parentList', pyId: ADDRS.parentList, type: 'list', state: 'normal' },
              { name: 'p', ref: 'procObj', pyId: ADDRS.procObj, type: 'instance', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 2, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ], note: 'exactly as the parent left it' },
          ],
          highlight: ['parentList'],
        },
      },
      {
        title: 'And this is why processes fix CPU-bound work',
        desc: 'Two interpreters means two GILs means two cores genuinely running Python at once. The same benchmark from demo 4: <code>1.81 s</code> serial, <code>2.49 s</code> on two threads, <code>1.08 s</code> on two processes. You pay for it in startup time and in copying everything you send.',
        lines: [],
        memory: {
          frames: [
            runtime('MainThread', { name: 'parent interpreter', badge: 'PID 4120' }),
            { name: 'global', badge: 'parent', state: 'running', vars: [] },
            runtime('its own MainThread', { name: 'worker interpreter', badge: 'PID 9932' }),
            { name: 'burn()', badge: 'worker', state: 'running', vars: [] },
          ],
          heap: [
            { id: 'parentList', pyId: ADDRS.parentList, type: 'list', refcount: 1, mutable: true, state: 'normal', items: [
              { value: 1, type: 'int' },
              { value: 2, type: 'int' },
              { value: 3, type: 'int' },
            ], note: 'two GILs — both boxes can execute Python in the same instant' },
          ],
          highlight: [],
        },
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     6 · One thread, one event loop, many suspended coroutines
     ────────────────────────────────────────────────────────── */
  asyncio: {
    watch: 'Count the threads: there is one, the whole way through. The overlapping happens between <em>objects</em>, not between threads.',
    code: `import asyncio

async def fetch(name):
    await asyncio.sleep(1)
    return name.upper()

async def main():
    a, b = await asyncio.gather(fetch("one"), fetch("two"))
    print(a, b)

asyncio.run(main())`,
    steps: [
      {
        title: 'A third answer, and it never leaves the main thread',
        desc: 'Threads let the operating system interleave your waits. <code>asyncio</code> does the interleaving itself, inside one thread, using objects that know how to pause. If you understood generators in Session 05, you already understand most of this.',
        lines: [],
        memory: EMPTY,
      },
      {
        title: '<code>async def</code> does not make a function that runs',
        desc: 'It makes a function that, when called, hands you a <strong>coroutine object</strong> and runs nothing. Session 05’s generators behaved identically: calling the function built an object, and the body waited to be driven.',
        lines: [3, 4, 5],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'new' },
            ]},
          ],
          heap: [
            { id: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', value: 'fetch(name)', refcount: 1, mutable: false, state: 'new',
              dictLabel: 'function attributes',
              pairs: [{ key: 'is coroutine fn', value: true, type: 'bool' }],
              note: 'calling it returns an object; it does not run the body' },
          ],
          highlight: ['fetchFn'],
        },
      },
      {
        title: '<code>asyncio.run</code> starts one event loop',
        desc: 'The loop is an ordinary object living on the heap of the thread you are already in. Its job is small and boring: keep a list of things that are ready, run one of them until it pauses, repeat.',
        lines: [11],
        memory: {
          frames: [
            runtime('MainThread', { check: 'no second thread is created — check threading.enumerate()' }),
            { name: 'global', badge: 'inside asyncio.run()', state: 'waiting', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn', pyId: ADDRS.mainFn, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'running', state: 'running', vars: [] },
          ],
          heap: [
            { id: 'loopObj', pyId: ADDRS.loopObj, type: 'instance', value: 'EventLoop', refcount: 1, mutable: true, state: 'new',
              classRef: { name: 'ProactorEventLoop', pyId: '0x7fa60020' },
              dictLabel: 'loop state',
              pairs: [
                { key: 'ready', value: 'main()', type: 'str' },
                { key: 'timers', value: '(none)', type: 'str' },
              ],
              note: 'one loop, on the thread you already had' },
            { id: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', value: 'fetch(name)', refcount: 1, mutable: false, state: 'normal' },
          ],
          highlight: ['loopObj'],
        },
      },
      {
        title: 'Two coroutine objects appear, and not one line of <code>fetch</code> has run',
        desc: 'The two calls inside <code>gather(...)</code> are evaluated first, as arguments always are. Each produces a coroutine in state <code>CORO_CREATED</code>. Forget to await one and Python will tell you: <code>RuntimeWarning: coroutine \'fetch\' was never awaited</code>.',
        lines: [8],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'inside asyncio.run()', state: 'waiting', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn', pyId: ADDRS.mainFn, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'running', state: 'running', vars: [] },
          ],
          heap: [
            { id: 'loopObj', pyId: ADDRS.loopObj, type: 'instance', value: 'EventLoop', refcount: 1, mutable: true, state: 'normal',
              classRef: { name: 'ProactorEventLoop', pyId: '0x7fa60020' },
              dictLabel: 'loop state',
              pairs: [
                { key: 'ready', value: 'main()', type: 'str' },
                { key: 'timers', value: '(none)', type: 'str' },
              ] },
            { id: 'coroA', pyId: ADDRS.coroA, type: 'coroutine', value: "fetch('one')", refcount: 1, mutable: true, state: 'new',
              pairs: [
                { key: 'state', value: 'CORO_CREATED', type: 'str' },
                { key: 'name', value: 'one', type: 'str' },
              ],
              note: 'built, never started' },
            { id: 'coroB', pyId: ADDRS.coroB, type: 'coroutine', value: "fetch('two')", refcount: 1, mutable: true, state: 'new',
              pairs: [
                { key: 'state', value: 'CORO_CREATED', type: 'str' },
                { key: 'name', value: 'two', type: 'str' },
              ] },
          ],
          highlight: ['coroA', 'coroB'],
        },
      },
      {
        title: '<code>gather</code> wraps each coroutine in a <code>Task</code> and gives it to the loop',
        desc: 'A coroutine on its own does nothing; something has to drive it. A <code>Task</code> is that driver — an object that holds a coroutine and asks the loop to keep stepping it. Both tasks are now in the loop’s ready list.',
        lines: [8],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'running the loop', state: 'running', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn', pyId: ADDRS.mainFn, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'awaiting gather', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'loopObj', pyId: ADDRS.loopObj, type: 'instance', value: 'EventLoop', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'ProactorEventLoop', pyId: '0x7fa60020' },
              dictLabel: 'loop state',
              pairs: [
                { key: 'ready', value: 'Task-1, Task-2', type: 'str' },
                { key: 'timers', value: '(none)', type: 'str' },
              ] },
            { id: 'taskA', pyId: ADDRS.taskA, type: 'instance', value: 'Task-1 pending', refcount: 2, mutable: true, state: 'new',
              classRef: { name: 'Task', pyId: ADDRS.TaskCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'coro', value: "fetch('one') @ 0x7fa60200", type: 'ref' }] },
            { id: 'taskB', pyId: ADDRS.taskB, type: 'instance', value: 'Task-2 pending', refcount: 2, mutable: true, state: 'new',
              classRef: { name: 'Task', pyId: ADDRS.TaskCls },
              dictLabel: 'instance __dict__',
              pairs: [{ key: 'coro', value: "fetch('two') @ 0x7fa60280", type: 'ref' }] },
            { id: 'coroA', pyId: ADDRS.coroA, type: 'coroutine', value: "fetch('one')", refcount: 2, mutable: true, state: 'normal',
              pairs: [{ key: 'state', value: 'CORO_CREATED', type: 'str' }] },
            { id: 'coroB', pyId: ADDRS.coroB, type: 'coroutine', value: "fetch('two')", refcount: 2, mutable: true, state: 'normal',
              pairs: [{ key: 'state', value: 'CORO_CREATED', type: 'str' }] },
          ],
          highlight: ['taskA', 'taskB'],
        },
      },
      {
        title: 'Task-1 runs until its first <code>await</code>, then suspends',
        desc: '<code>await asyncio.sleep(1)</code> is a <strong>yield point</strong>, marked in your own source. The coroutine stops there, keeps its half-finished frame, and registers a timer with the loop. It moves to <code>CORO_SUSPENDED</code>.',
        lines: [4],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'running the loop', state: 'running', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn', pyId: ADDRS.mainFn, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'awaiting gather', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'loopObj', pyId: ADDRS.loopObj, type: 'instance', value: 'EventLoop', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'ProactorEventLoop', pyId: '0x7fa60020' },
              dictLabel: 'loop state',
              pairs: [
                { key: 'ready', value: 'Task-2', type: 'str' },
                { key: 'timers', value: 'Task-1 at t + 1.000 s', type: 'str' },
              ] },
            { id: 'coroA', pyId: ADDRS.coroA, type: 'coroutine', value: "fetch('one')", refcount: 2, mutable: true, state: 'mutated',
              pairs: [
                { key: 'state', value: 'CORO_SUSPENDED', type: 'str' },
                { key: 'paused at', value: 'line 4 — await asyncio.sleep(1)', type: 'str' },
                { key: 'name', value: 'one', type: 'str' },
              ],
              note: 'its frame is kept alive, exactly like a paused generator' },
            { id: 'coroB', pyId: ADDRS.coroB, type: 'coroutine', value: "fetch('two')", refcount: 2, mutable: true, state: 'normal',
              pairs: [{ key: 'state', value: 'CORO_CREATED', type: 'str' }] },
          ],
          highlight: ['coroA'],
        },
      },
      {
        title: 'The loop does not wait for it — it starts Task-2 immediately',
        desc: 'That is the whole trick, and it is nothing like a thread switch. Nobody was pre-empted; Task-1 <em>chose</em> to pause at a point you can see in the source. Now two coroutines are suspended, both timers running, still one thread.',
        lines: [4],
        memory: {
          frames: [
            runtime('MainThread', { free: true, check: 'one thread, no contention — nothing is computing' }),
            { name: 'global', badge: 'parked in select()', state: 'blocked', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn', pyId: ADDRS.mainFn, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'awaiting gather', state: 'waiting', vars: [] },
          ],
          heap: [
            { id: 'loopObj', pyId: ADDRS.loopObj, type: 'instance', value: 'EventLoop', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'ProactorEventLoop', pyId: '0x7fa60020' },
              dictLabel: 'loop state',
              pairs: [
                { key: 'ready', value: '(nothing)', type: 'str' },
                { key: 'timers', value: 'Task-1, Task-2 at t + 1.000 s', type: 'str' },
              ],
              note: 'both waits are running at the same time' },
            { id: 'coroA', pyId: ADDRS.coroA, type: 'coroutine', value: "fetch('one')", refcount: 2, mutable: true, state: 'normal',
              pairs: [
                { key: 'state', value: 'CORO_SUSPENDED', type: 'str' },
                { key: 'paused at', value: 'line 4', type: 'str' },
              ] },
            { id: 'coroB', pyId: ADDRS.coroB, type: 'coroutine', value: "fetch('two')", refcount: 2, mutable: true, state: 'mutated',
              pairs: [
                { key: 'state', value: 'CORO_SUSPENDED', type: 'str' },
                { key: 'paused at', value: 'line 4', type: 'str' },
              ] },
          ],
          highlight: ['coroA', 'coroB'],
        },
      },
      {
        title: 'One second later both timers fire and each coroutine resumes where it stopped',
        desc: 'The loop hands control back into the middle of <code>fetch</code>, on line 4, with <code>name</code> still bound. Line 5 runs and each coroutine returns its string, reaching <code>CORO_CLOSED</code>.',
        lines: [5],
        memory: {
          frames: [
            runtime('MainThread', { moved: true }),
            { name: 'global', badge: 'inside asyncio.run()', state: 'waiting', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn', pyId: ADDRS.mainFn, type: 'function', state: 'normal' },
            ]},
            { name: 'main()', badge: 'awaiting gather', state: 'waiting', vars: [] },
            { name: "fetch(name='one')", badge: 'resumed', state: 'running', vars: [
              { name: 'name', value: 'one', type: 'str', inline: true },
            ]},
          ],
          heap: [
            { id: 'loopObj', pyId: ADDRS.loopObj, type: 'instance', value: 'EventLoop', refcount: 3, mutable: true, state: 'mutated',
              classRef: { name: 'ProactorEventLoop', pyId: '0x7fa60020' },
              dictLabel: 'loop state',
              pairs: [
                { key: 'ready', value: 'Task-1, Task-2', type: 'str' },
                { key: 'timers', value: '(fired)', type: 'str' },
              ] },
            { id: 'strOne', pyId: ADDRS.strOne, type: 'str', value: 'ONE', refcount: 1, mutable: false, state: 'new' },
            { id: 'coroA', pyId: ADDRS.coroA, type: 'coroutine', value: "fetch('one')", refcount: 2, mutable: true, state: 'mutated',
              pairs: [{ key: 'state', value: 'CORO_CLOSED', type: 'str' }],
              note: 'finished — its frame is released now' },
            { id: 'coroB', pyId: ADDRS.coroB, type: 'coroutine', value: "fetch('two')", refcount: 2, mutable: true, state: 'normal',
              pairs: [{ key: 'state', value: 'CORO_SUSPENDED', type: 'str' }] },
          ],
          highlight: ['strOne', 'coroA'],
        },
      },
      {
        title: 'Two one-second waits took one second, on one thread',
        desc: 'Measured: <code>1.01 s</code> awaiting them one after the other, <code>0.50 s</code> through <code>gather</code>. Same win as threads on I/O, with no GIL hand-off and no locking — because nothing ever ran at the same time as anything else.',
        lines: [8, 9],
        memory: {
          frames: [
            runtime('MainThread'),
            { name: 'global', badge: 'MainThread', state: 'running', vars: [
              { name: 'fetch', ref: 'fetchFn', pyId: ADDRS.fetchFn, type: 'function', state: 'normal' },
              { name: 'main', ref: 'mainFn', pyId: ADDRS.mainFn, type: 'function', state: 'normal' },
            ]},
          ],
          heap: [
            { id: 'strOne', pyId: ADDRS.strOne, type: 'str', value: 'ONE', refcount: 1, mutable: false, state: 'normal' },
            { id: 'strTwo', pyId: ADDRS.strTwo, type: 'str', value: 'TWO', refcount: 1, mutable: false, state: 'new' },
            { id: 'loopObj', pyId: ADDRS.loopObj, type: 'instance', value: 'EventLoop', refcount: 0, mutable: true, state: 'gc',
              classRef: { name: 'ProactorEventLoop', pyId: '0x7fa60020' },
              dictLabel: 'loop state',
              pairs: [{ key: 'ready', value: '(nothing)', type: 'str' }],
              note: 'asyncio.run closes the loop when main() returns' },
          ],
          highlight: ['strOne', 'strTwo'],
        },
      },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PJ.Session.mount({
    sessionId: '07-gil',
    demos: DEMOS,
    defaultDemo: 'handoff',
    defaultSpeed: 900,
  });
});
