/* ============================================================
   PY INTERNALS — CORE.JS
   App state, global navigation, sidebar, utilities
   ============================================================ */

'use strict';

// ── App Namespace ──────────────────────────────────────────
window.PJ = window.PJ || {};

PJ.Core = (function () {

  // ── State ────────────────────────────────────────────────
  const state = {
    sidebarOpen: false,
    currentSession: null,
    completedSessions: JSON.parse(localStorage.getItem('pj_completed') || '[]'),
  };

  // ── Init ─────────────────────────────────────────────────
  function init() {
    _initSidebar();
    _initTabs();
    _markCurrentSession();
    _animateHeroEntrance();
    console.log('[PJ] Core initialized');
  }

  // ── Sidebar (mobile) ─────────────────────────────────────
  function _initSidebar() {
    const toggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => toggleSidebar());

    if (overlay) {
      overlay.addEventListener('click', () => closeSidebar());
    }

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.sidebarOpen) closeSidebar();
    });
  }

  function toggleSidebar() {
    state.sidebarOpen ? closeSidebar() : openSidebar();
  }

  function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    state.sidebarOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    state.sidebarOpen = false;
    document.body.style.overflow = '';
  }

  // ── Tabs ─────────────────────────────────────────────────
  function _initTabs() {
    document.querySelectorAll('.tabs').forEach((tabContainer) => {
      const tabs = tabContainer.querySelectorAll('.tab');
      const panel = tabContainer.closest('.tab-group') || tabContainer.parentElement;

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.tab;

          // Update tab states
          tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          // Update content panels
          panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          const targetContent = panel.querySelector(`[data-tab-content="${target}"]`);
          if (targetContent) {
            targetContent.classList.add('active');
            targetContent.classList.add('animate-fade-in');
          }
        });
      });
    });
  }

  // ── Sidebar Active State ──────────────────────────────────
  function _markCurrentSession() {
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar__item[href]').forEach(link => {
      if (path.includes(link.getAttribute('href'))) {
        link.classList.add('active');
      }
    });
  }

  // ── Hero Entrance Animations ──────────────────────────────
  function _animateHeroEntrance() {
    const elements = document.querySelectorAll('.session-hero > *');
    elements.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.animation = `fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) ${80 + i * 80}ms both`;
    });
  }

  // ── Progress Tracking ─────────────────────────────────────
  function markSessionComplete(sessionId) {
    if (!state.completedSessions.includes(sessionId)) {
      state.completedSessions.push(sessionId);
      localStorage.setItem('pj_completed', JSON.stringify(state.completedSessions));
    }
  }

  function isSessionComplete(sessionId) {
    return state.completedSessions.includes(sessionId);
  }

  // ── Utility: Format Python Value ─────────────────────────
  function formatPyValue(val, type) {
    if (type === 'str') return `'${val}'`;
    if (type === 'bool') return val ? 'True' : 'False';
    if (type === 'none') return 'None';
    return String(val);
  }

  // ── Utility: Get Type Color ───────────────────────────────
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
      set:  'var(--clr-type-set)',
    };
    return map[type] || 'var(--clr-text)';
  }

  // ── Utility: Sleep ────────────────────────────────────────
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Utility: Debounce ─────────────────────────────────────
  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    markSessionComplete,
    isSessionComplete,
    formatPyValue,
    getTypeColor,
    sleep,
    debounce,
    state,
  };
})();

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => PJ.Core.init());
