/* ============================================================
   PY INTERNALS — ANIMATOR.JS
   Step-based animation engine: autoplay, pause, step forward/back,
   speed control, step dots, progress tracking
   ============================================================ */

'use strict';

window.PJ = window.PJ || {};

/**
 * PJ.Animator
 * -----------
 * Usage:
 *   const anim = new PJ.Animator({
 *     steps: [ ...stepDefinitions ],
 *     onStep: (step, index, total) => { ... render step ... },
 *     onComplete: () => { ... },
 *     containerId: 'my-stage',
 *   });
 *   anim.mount();  // wire up controls
 */
PJ.Animator = class {

  /**
   * @param {Object} options
   * @param {Array}  options.steps           - Array of step objects
   * @param {Function} options.onStep        - Called with (step, index, total)
   * @param {Function} [options.onComplete]  - Called when last step reached
   * @param {Function} [options.onReset]     - Called when reset
   * @param {string}  [options.containerId]  - ID of wrapper element
   * @param {number}  [options.defaultSpeed] - Default ms between steps (800)
   */
  constructor(options) {
    this.steps         = options.steps || [];
    this.onStep        = options.onStep;
    this.onComplete    = options.onComplete || (() => {});
    this.onReset       = options.onReset    || (() => {});
    this.containerId   = options.containerId;
    this.speed         = options.defaultSpeed ?? 800;

    this._currentIndex = -1;
    this._playing      = false;
    this._timer        = null;
    this._container    = null;

    // DOM element refs (populated in mount())
    this._els = {};
  }

  // ── Mount ─────────────────────────────────────────────────
  mount() {
    const root = this.containerId
      ? document.getElementById(this.containerId)
      : document;

    if (!root) {
      console.warn('[PJ.Animator] Container not found:', this.containerId);
      return this;
    }

    this._container = root;

    // Wire controls
    this._els.playBtn   = root.querySelector('[data-action="play"]');
    this._els.prevBtn   = root.querySelector('[data-action="prev"]');
    this._els.nextBtn   = root.querySelector('[data-action="next"]');
    this._els.resetBtn  = root.querySelector('[data-action="reset"]');
    this._els.speedSel  = root.querySelector('[data-action="speed"]');
    this._els.counter   = root.querySelector('[data-role="step-counter"]');
    this._els.track     = root.querySelector('[data-role="step-track"]');

    this._els.playBtn?.addEventListener('click',  () => this.togglePlay());
    this._els.prevBtn?.addEventListener('click',  () => this.prev());
    this._els.nextBtn?.addEventListener('click',  () => this.next());
    this._els.resetBtn?.addEventListener('click', () => this.reset());

    this._els.speedSel?.addEventListener('change', (e) => {
      this.speed = parseInt(e.target.value, 10);
    });

    // Build step track dots
    this._buildTrack();

    // Initialize state
    this._updateControls();

    // Show first step immediately
    this.goTo(0);

    return this;
  }

  // ── Track Dots ────────────────────────────────────────────
  _buildTrack() {
    const track = this._els.track;
    if (!track) return;

    track.innerHTML = '';
    this.steps.forEach((step, i) => {
      const dot = document.createElement('span');
      dot.className = 'step-track__dot';
      dot.title = step.title || `Step ${i + 1}`;
      dot.addEventListener('click', () => this.goTo(i));

      if (i < this.steps.length - 1) {
        const line = document.createElement('span');
        line.className = 'step-track__line';
        track.appendChild(dot);
        track.appendChild(line);
      } else {
        track.appendChild(dot);
      }
    });
  }

  _updateTrack() {
    const dots = this._els.track?.querySelectorAll('.step-track__dot');
    if (!dots) return;

    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'visited');
      if (i === this._currentIndex) dot.classList.add('active');
      else if (i < this._currentIndex) dot.classList.add('visited');
    });
  }

  // ── Playback Controls ────────────────────────────────────
  togglePlay() {
    this._playing ? this.pause() : this.play();
  }

  play() {
    if (this._playing) return;

    // If at end, reset before playing
    if (this._currentIndex >= this.steps.length - 1) {
      this.reset();
    }

    this._playing = true;
    this._setPlayIcon('pause');
    this._tick();
  }

  pause() {
    this._playing = false;
    clearTimeout(this._timer);
    this._setPlayIcon('play');
  }

  _tick() {
    if (!this._playing) return;
    this._timer = setTimeout(() => {
      if (this._currentIndex < this.steps.length - 1) {
        this.next();
        this._tick();
      } else {
        this.pause();
        this.onComplete();
      }
    }, this.speed);
  }

  next() {
    if (this._currentIndex < this.steps.length - 1) {
      this.goTo(this._currentIndex + 1);
    } else {
      this.pause();
    }
  }

  prev() {
    if (this._currentIndex > 0) {
      this.goTo(this._currentIndex - 1);
    }
  }

  reset() {
    this.pause();
    this.onReset();
    this.goTo(0);
  }

  goTo(index) {
    if (index < 0 || index >= this.steps.length) return;

    this._currentIndex = index;
    const step = this.steps[index];

    // Call the user's render callback
    this.onStep(step, index, this.steps.length);

    this._updateControls();
    this._updateTrack();
    this._updateCounter();
  }

  // ── UI Updates ────────────────────────────────────────────
  _updateControls() {
    const atStart = this._currentIndex <= 0;
    const atEnd   = this._currentIndex >= this.steps.length - 1;

    if (this._els.prevBtn) this._els.prevBtn.disabled = atStart;
    if (this._els.nextBtn) this._els.nextBtn.disabled = atEnd;
  }

  _updateCounter() {
    if (!this._els.counter) return;
    const total   = this.steps.length;
    const current = this._currentIndex + 1;
    this._els.counter.textContent = `${current} / ${total}`;
    this._els.counter.classList.add('count-change');
    this._els.counter.addEventListener('animationend', () => {
      this._els.counter.classList.remove('count-change');
    }, { once: true });
  }

  _setPlayIcon(state) {
    const btn = this._els.playBtn;
    if (!btn) return;
    btn.innerHTML = state === 'play'
      ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
           <path d="M3 2.5l8 4.5-8 4.5z"/>
         </svg>`
      : `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
           <rect x="2" y="2" width="4" height="10" rx="1"/>
           <rect x="8" y="2" width="4" height="10" rx="1"/>
         </svg>`;
  }

  // ── Getters ───────────────────────────────────────────────
  get currentStep()  { return this.steps[this._currentIndex]; }
  get currentIndex() { return this._currentIndex; }
  get isPlaying()    { return this._playing; }
  get totalSteps()   { return this.steps.length; }
};
