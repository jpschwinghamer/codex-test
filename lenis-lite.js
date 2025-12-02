export default class LenisLite {
  constructor({ lerp = 0.08, smoothWheel = true, smoothTouch = false } = {}) {
    this.lerp = lerp;
    this.smoothWheel = smoothWheel;
    this.smoothTouch = smoothTouch;
    this.current = window.scrollY;
    this.target = window.scrollY;
    this.listeners = [];

    this._maxScroll = this.getMaxScroll();

    this._onWheel = this.onWheel.bind(this);
    this._onScroll = this.onScroll.bind(this);
    this._onResize = this.onResize.bind(this);

    if (this.smoothWheel) {
      window.addEventListener('wheel', this._onWheel, { passive: false });
    } else {
      window.addEventListener('scroll', this._onScroll, { passive: true });
    }

    if (this.smoothTouch) {
      window.addEventListener('touchmove', this._onWheel, { passive: false });
    }

    window.addEventListener('resize', this._onResize, { passive: true });
  }

  getMaxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  clampTarget() {
    this.target = Math.max(0, Math.min(this.target, this._maxScroll));
  }

  on(event, callback) {
    if (event === 'scroll') {
      this.listeners.push(callback);
    }
  }

  emit() {
    for (const cb of this.listeners) {
      cb({ scroll: this.current });
    }
  }

  onWheel(event) {
    event.preventDefault();
    const deltaY = event.deltaY || event.touches?.[0]?.clientY || 0;
    this.target += deltaY;
    this.clampTarget();
  }

  onScroll() {
    this.target = window.scrollY;
    this.clampTarget();
  }

  onResize() {
    this._maxScroll = this.getMaxScroll();
    this.clampTarget();
  }

  raf() {
    this.current += (this.target - this.current) * this.lerp;

    if (Math.abs(this.target - this.current) < 0.1) {
      this.current = this.target;
    }

    window.scrollTo(0, this.current);
    this.emit();
  }

  destroy() {
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('touchmove', this._onWheel);
    window.removeEventListener('resize', this._onResize);
    this.listeners = [];
  }
}
