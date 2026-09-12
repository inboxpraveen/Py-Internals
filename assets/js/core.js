/* ============================================================
   PY INTERNALS — CORE.JS
   App state, navigation, progress, quizzes, session boot
   ============================================================ */

'use strict';

window.PJ = window.PJ || {};

PJ.COURSE = [
  { id: '01-variables',   num: '01', title: 'Variables & Mutability',           short: 'Names, objects, mutation',     status: 'live' },
  { id: '02-functions',   num: '02', title: 'Functions, Scope & the Call Stack', short: 'Frames, LEGB, closures',      status: 'live' },
  { id: '03-lists-dicts', num: '03', title: 'Lists, Dicts & References',        short: 'Aliases, copies, nested refs', status: 'live' },
  { id: '04-classes',     num: '04', title: 'Classes & Objects',                short: 'self, __dict__, methods',      status: 'live' },
  { id: '05-iterators',   num: '05', title: 'Iterators & Generators',           short: 'iter, next, yield',            status: 'live' },
  { id: '06-decorators',  num: '06', title: 'Decorators',                       short: 'f = deco(f), wrappers, wraps', status: 'live' },
  { id: '07-gil',         num: '07', title: 'The GIL & Concurrency',            short: 'Threads, processes, asyncio',  status: 'live' },
];

PJ.Core = (function () {

  function _readCompleted() {
    try {
      const saved = JSON.parse(localStorage.getItem('pj_completed') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (err) {
      return [];
    }
  }

  const state = {
    sidebarOpen: false,
    currentSession: null,
    completedSessions: _readCompleted(),
  };

  function init() {
    _initSidebar();
    _initTabs();
    _markCurrentSession();
    _animateHeroEntrance();
    _rememberVisit();
    _initHome();
    _initQuizzes();
    _initReadProgress();
    _initSidebarSpy();
    _paintSessionChrome();
    window.scrollToSection = scrollToSection;
  }

  function liveSessions() {
    return PJ.COURSE.filter((s) => s.status === 'live');
  }

  function sessionHref(id) {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (/\/sessions\//.test(path)) return `../${id}/`;
    return `sessions/${id}/`;
  }

  function glossaryHref() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (/\/sessions\//.test(path)) return '../../glossary.html';
    return 'glossary.html';
  }

  function currentSessionId() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const match = path.match(/\/sessions\/([^/]+)/);
    return match ? match[1] : null;
  }

  function _initSidebar() {
    const toggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (!toggle || !sidebar) return;

    // The button owns its behaviour here. Inline onclick handlers used to do the
    // same thing, which toggled twice per tap and left the menu permanently shut.
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'sessionNav');
    if (!sidebar.id) sidebar.id = 'sessionNav';
    toggle.addEventListener('click', () => toggleSidebar());

    if (overlay) {
      overlay.addEventListener('click', () => closeSidebar());
    }

    // On a phone the sidebar covers the page, so tapping a section link has to
    // dismiss it — otherwise you scroll to a heading you cannot see.
    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('.sidebar__item') && state.sidebarOpen) closeSidebar();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.sidebarOpen) {
        closeSidebar();
        toggle.focus();
      }
    });
  }

  function toggleSidebar() {
    state.sidebarOpen ? closeSidebar() : openSidebar();
  }

  function openSidebar() {
    document.querySelector('.sidebar')?.classList.add('open');
    document.querySelector('.sidebar-overlay')?.classList.add('active');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'true');
    state.sidebarOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
    state.sidebarOpen = false;
    document.body.style.overflow = '';
  }

  function _initTabs() {
    document.querySelectorAll('.tabs').forEach((tabContainer) => {
      const tabs = tabContainer.querySelectorAll('.tab');
      const panel = tabContainer.closest('.tab-group') || tabContainer.parentElement;

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.tab;
          tabContainer.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          panel.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
          const targetContent = panel.querySelector(`[data-tab-content="${target}"]`);
          if (targetContent) {
            targetContent.classList.add('active', 'animate-fade-in');
          }
        });
      });
    });
  }

  function _markCurrentSession() {
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar__item[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href !== '#' && path.includes(href.replace(/^\.\.\//, ''))) {
        link.classList.add('active');
      }
    });
  }

  function _animateHeroEntrance() {
    const elements = document.querySelectorAll('.session-hero > *');
    elements.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.animation = `fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) ${80 + i * 80}ms both`;
    });
  }

  function _rememberVisit() {
    const id = currentSessionId();
    if (!id) return;
    try { localStorage.setItem('pj_last', id); } catch (err) { /* ignore */ }
  }

  function markSessionComplete(sessionId) {
    if (!state.completedSessions.includes(sessionId)) {
      state.completedSessions.push(sessionId);
      try {
        localStorage.setItem('pj_completed', JSON.stringify(state.completedSessions));
      } catch (err) { /* private browsing — progress just won't persist */ }
    }
  }

  function isSessionComplete(sessionId) {
    return state.completedSessions.includes(sessionId);
  }

  function nextIncomplete() {
    return liveSessions().find((s) => !isSessionComplete(s.id)) || liveSessions()[0];
  }

  function _initHome() {
    const start = document.getElementById('startCta');
    if (start) {
      const target = nextIncomplete();
      const last = localStorage.getItem('pj_last');
      const completed = state.completedSessions.length;
      if (completed > 0 || last) {
        start.textContent = '';
        start.append('Continue Learning');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.innerHTML = '<path d="M6.5 3L11.5 8L6.5 13" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
        start.appendChild(svg);
      }
      start.setAttribute('href', sessionHref(target.id));
    }

    const lastNote = document.getElementById('lastSessionNote');
    if (lastNote) {
      const lastId = localStorage.getItem('pj_last');
      const last = PJ.COURSE.find((s) => s.id === lastId);
      if (last) {
        lastNote.hidden = false;
        lastNote.innerHTML = `Last opened: <a href="${sessionHref(last.id)}">Session ${last.num} — ${last.title}</a>`;
      }
    }

    const chip = document.getElementById('homeProgressChip');
    if (chip) {
      const done = state.completedSessions.filter((id) =>
        liveSessions().some((s) => s.id === id)
      ).length;
      const total = liveSessions().length;
      chip.textContent = done === 0
        ? `${total} live sessions`
        : `${done} of ${total} sessions complete`;
    }

    document.querySelectorAll('.session-card[data-session]').forEach((card) => {
      const id = card.dataset.session;
      const session = PJ.COURSE.find((s) => s.id === id);
      if (!session) return;

      let badge = card.querySelector('.session-card__status');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'session-card__status';
        card.appendChild(badge);
      }

      if (session.status !== 'live') {
        badge.textContent = 'Soon';
        return;
      }
      if (isSessionComplete(id)) {
        badge.textContent = 'Done';
        badge.classList.add('is-done');
      } else if (nextIncomplete()?.id === id) {
        badge.textContent = 'Start here';
        badge.classList.add('is-next');
      } else {
        badge.textContent = 'Open';
      }
    });
  }

  function _initQuizzes() {
    document.querySelectorAll('.quiz').forEach((quiz) => {
      const cards = [...quiz.querySelectorAll('.quiz-card')];
      let answered = 0;
      let correct = 0;

      const lede = quiz.querySelector('.quiz__lede');
      if (lede && !quiz.querySelector('.quiz__hint')) {
        const hint = document.createElement('p');
        hint.className = 'quiz__hint';
        hint.textContent = 'Pick the model that matches the memory diagram. The explanation appears after you choose.';
        lede.after(hint);

        const meta = document.createElement('div');
        meta.className = 'quiz__meta';
        meta.innerHTML =
          `<span>${cards.length} question${cards.length === 1 ? '' : 's'}</span>` +
          `<span>One best model each</span>` +
          `<span>No tricks</span>`;
        hint.after(meta);
      }

      cards.forEach((card, index) => {
        const q = card.querySelector('.quiz-card__q');
        if (q && !card.querySelector('.quiz-card__head')) {
          q.innerHTML = q.innerHTML.replace(/^\s*\d+\.\s*/, '');
          const head = document.createElement('div');
          head.className = 'quiz-card__head';
          head.innerHTML =
            `<span class="quiz-card__num">${index + 1}</span>` +
            `<span class="quiz-card__kind">Predict the memory</span>` +
            `<span class="quiz-card__status" hidden></span>`;
          card.insertBefore(head, q);
        }

        card.querySelectorAll('.quiz-option').forEach((btn, optIndex) => {
          if (!btn.querySelector('.quiz-option__key')) {
            const letter = String.fromCharCode(65 + optIndex);
            btn.innerHTML =
              `<span class="quiz-option__key">${letter}</span>` +
              `<span class="quiz-option__text">${btn.innerHTML}</span>`;
          }
        });

        const explain = card.querySelector('.quiz-explain');
        if (explain) {
          // Without this the verdict and the explanation — the part that actually
          // teaches — are visible only to people who can see them.
          explain.setAttribute('role', 'status');
          explain.setAttribute('aria-live', 'polite');
        }
        if (explain && !explain.querySelector('.quiz-explain__label')) {
          const label = document.createElement('span');
          label.className = 'quiz-explain__label';
          label.textContent = 'Why this is the model';
          explain.insertBefore(label, explain.firstChild);
        }

        const answer = card.dataset.answer;
        card.querySelectorAll('.quiz-option').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (card.classList.contains('is-answered')) return;
            const choice = btn.dataset.choice;
            const isRight = choice === answer;
            card.classList.add('is-answered', isRight ? 'is-right' : 'is-miss');
            answered += 1;

            const status = card.querySelector('.quiz-card__status');
            if (status) {
              status.hidden = false;
              status.textContent = isRight ? 'Correct' : 'Not quite';
            }

            if (isRight) {
              correct += 1;
              btn.classList.add('is-correct');
            } else {
              btn.classList.add('is-wrong');
              const right = card.querySelector(`.quiz-option[data-choice="${answer}"]`);
              if (right) right.classList.add('is-correct');
            }
            // aria-disabled, not disabled: disabling the button the reader just
            // pressed drops focus to <body> and they have to tab back from the top.
            card.querySelectorAll('.quiz-option').forEach((b) => {
              b.setAttribute('aria-disabled', 'true');
            });

            if (answered === cards.length) {
              let score = quiz.querySelector('.quiz-score');
              if (!score) {
                score = document.createElement('div');
                score.className = 'quiz-score';
                quiz.appendChild(score);
              }
              const perfect = correct === cards.length;
              score.classList.toggle('is-perfect', perfect);
              score.classList.toggle('is-partial', !perfect);
              score.innerHTML =
                `<div class="quiz-score__label">Result</div>` +
                `<h3 class="quiz-score__title">${perfect
                  ? `All ${cards.length} correct`
                  : `${correct} of ${cards.length} correct`}</h3>` +
                `<p>${perfect
                  ? 'This mental model is sticking. Move on when you can draw the same picture from memory.'
                  : 'Re-read the teal explanations, then rewind the matching demo and try again.'}</p>`;

              const sessionId = quiz.dataset.session || currentSessionId();
              if (sessionId) markSessionComplete(sessionId);
            }
          });
        });
      });
    });
  }

  function _initReadProgress() {
    const bar = document.getElementById('readProgress');
    if (!bar) return;
    const updateBar = () => {
      const scrolled = window.scrollY;
      const total = document.body.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0%';
    };
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();
  }

  function _initSidebarSpy() {
    const sidebarAnchors = [...document.querySelectorAll('.sidebar__item[href^="#"]')]
      .map((link) => ({ link, el: document.getElementById(link.getAttribute('href').slice(1)) }))
      .filter((item) => item.el);

    if (!sidebarAnchors.length) return;

    function updateSidebarActive() {
      const scrollY = window.scrollY + 110;
      let current = sidebarAnchors[0];
      for (const item of sidebarAnchors) {
        if (item.el.offsetTop <= scrollY) current = item;
      }
      sidebarAnchors.forEach((item) => item.link.classList.remove('active'));
      if (current) current.link.classList.add('active');
    }

    window.addEventListener('scroll', debounce(updateSidebarActive, 40), { passive: true });
    updateSidebarActive();
  }

  function _paintSessionChrome() {
    const id = currentSessionId();
    if (!id) return;
    const live = liveSessions();
    const index = live.findIndex((s) => s.id === id);
    if (index === -1) return;

    document.querySelectorAll('[data-role="session-count"]').forEach((el) => {
      el.textContent = `Session ${String(index + 1).padStart(2, '0')} of ${String(live.length).padStart(2, '0')}`;
    });

    // Completion is earned by finishing the quiz (see _initQuizzes), not by
    // scrolling to the bottom — otherwise the Done badge means nothing.
  }

  function scrollToSection(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function formatPyValue(val, type) {
    if (type === 'str') return `'${val}'`;
    if (type === 'bool') return val ? 'True' : 'False';
    if (type === 'none') return 'None';
    return String(val);
  }

  function getTypeColor(type) {
    const map = {
      int: 'var(--clr-type-int)',
      float: 'var(--clr-type-float)',
      str: 'var(--clr-type-str)',
      bool: 'var(--clr-type-bool)',
      none: 'var(--clr-type-none)',
      list: 'var(--clr-type-list)',
      dict: 'var(--clr-type-dict)',
      tuple: 'var(--clr-type-tuple)',
      set: 'var(--clr-type-set)',
      function: 'var(--clr-type-function)',
      class: 'var(--clr-type-class)',
      instance: 'var(--clr-type-instance)',
      method: 'var(--clr-type-method)',
      generator: 'var(--clr-type-generator)',
      iterator: 'var(--clr-type-iterator)',
      coroutine: 'var(--clr-type-coroutine)',
    };
    return map[type] || 'var(--clr-text)';
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  return {
    init,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    markSessionComplete,
    isSessionComplete,
    nextIncomplete,
    sessionHref,
    glossaryHref,
    currentSessionId,
    scrollToSection,
    formatPyValue,
    getTypeColor,
    sleep,
    debounce,
    state,
  };
})();

PJ.Session = {
  setWatch(html) {
    const el = document.getElementById('demoWatch');
    if (!el) return;
    if (!html) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML = `<span class="demo-watch__label">Watch for</span><span class="demo-watch__text">${html}</span>`;
  },

  mount(options) {
    const demos = options.demos;
    const defaultDemo = options.defaultDemo || Object.keys(demos)[0];
    const defaultSpeed = options.defaultSpeed ?? 900;
    const sessionId = options.sessionId;
    const memViz = new PJ.MemoryViz('memPanel');
    let currentAnimator = null;

    function switchDemo(demoKey) {
      const demo = demos[demoKey];
      if (!demo) return;

      document.querySelectorAll('.demo-pill').forEach((p) => {
        const isActive = p.dataset.demo === demoKey;
        p.classList.toggle('active', isActive);
        p.setAttribute('aria-selected', String(isActive));
        p.tabIndex = isActive ? 0 : -1;
      });

      PJ.Session.setWatch(demo.watch);

      const codePanel = document.getElementById('codePanel');
      PJ.Syntax.render(demo.code, codePanel);

      if (currentAnimator) {
        currentAnimator.pause();
        currentAnimator.unmount();
      }

      const speedSel = document.querySelector('[data-action="speed"]');
      const chosenSpeed = speedSel ? parseInt(speedSel.value, 10) : defaultSpeed;

      currentAnimator = new PJ.Animator({
        steps: demo.steps,
        containerId: 'stage',
        defaultSpeed: Number.isFinite(chosenSpeed) ? chosenSpeed : defaultSpeed,
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
          if (sessionId) PJ.Core.markSessionComplete(sessionId);
          if (typeof options.onComplete === 'function') options.onComplete();
        },
        onReset() {
          PJ.Syntax.highlightLines(codePanel, []);
        },
      });

      currentAnimator.mount();
    }

    // Pills are wired here rather than with inline onclick attributes, so a
    // session never depends on a global function existing.
    const pills = [...document.querySelectorAll('.demo-pill')];
    pills.forEach((pill, i) => {
      pill.setAttribute('role', 'tab');
      pill.addEventListener('click', () => switchDemo(pill.dataset.demo));
      pill.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const nextPill = pills[(i + dir + pills.length) % pills.length];
        nextPill.focus();
        switchDemo(nextPill.dataset.demo);
      });
    });
    const selector = document.querySelector('.demo-selector');
    if (selector) selector.setAttribute('role', 'tablist');

    window.switchDemo = switchDemo;
    window.scrollToSection = PJ.Core.scrollToSection;
    switchDemo(defaultDemo);
    return { switchDemo };
  },
};

document.addEventListener('DOMContentLoaded', () => PJ.Core.init());
