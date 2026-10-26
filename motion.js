/** Finite, optional motion; pathway content stays visible without animation. */
export function initializeMotion() {
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Map();
  const watched = new Set();
  const selector = '.pathway-card, .study-card, .starting-card, .course-card, .empty-state';
  let observer;
  // Motion is always on unless the device asks for reduced motion.
  const enabled = () => !reduced.matches;
  function animate(element, frames, options = {}) {
    if (!enabled() || !element?.animate) return;
    animations.get(element)?.cancel();
    const animation = element.animate(frames, { duration: 420, easing: 'cubic-bezier(.2,.75,.25,1)', ...options });
    animations.set(element, animation);
    const clean = () => { if (animations.get(element) === animation) animations.delete(element); };
    animation.finished.then(clean, clean);
  }
  if ('IntersectionObserver' in window) observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      observer.unobserve(entry.target); watched.delete(entry.target);
      animate(entry.target, [{ opacity: 0, translate: '24px 0' }, { opacity: 1, translate: '0 0' }], { delay: Number(entry.target.dataset.motionDelay || 0) });
    }
  }, { threshold: .08 });
  function refresh(root = document, { animate: shouldAnimate = true } = {}) {
    for (const element of watched) if (!element.isConnected) { observer?.unobserve(element); watched.delete(element); }
    for (const [element, animation] of animations) if (!element.isConnected) { animation.cancel(); animations.delete(element); }
    root.querySelectorAll(selector).forEach((element, index) => {
      if (element.dataset.motionSeen) return;
      element.dataset.motionSeen = 'true';
      element.dataset.motionDelay = String(Math.min(index, 3) * 55);
      if (!enabled() || !shouldAnimate) return;
      if (observer) { watched.add(element); observer.observe(element); }
      else animate(element, [{ opacity: 0, translate: '20px 0' }, { opacity: 1, translate: '0 0' }]);
    });
  }
  function sync() {
    html.classList.add('motion-ready');
    html.classList.toggle('motion-paused', !enabled());
    if (!enabled()) { for (const animation of animations.values()) animation.cancel(); animations.clear(); observer?.disconnect(); watched.clear(); }
    document.dispatchEvent(new CustomEvent('pathfinder-motion-change', { detail: { enabled: enabled() } }));
    refresh();
  }
  reduced.addEventListener('change', sync);
  document.getElementById('detail-dialog')?.addEventListener('close', () => { for (const [element, animation] of animations) if (element.closest('#detail-dialog')) { animation.cancel(); animations.delete(element); } });
  sync();
  return {
    get enabled() { return enabled(); },
    refresh,
    saved(button) { animate(button.querySelector('svg'), [{ scale: '1' }, { scale: '.75', offset: .25 }, { scale: '1.2', offset: .6 }, { scale: '1' }], { duration: 360 }); },
    toast(element) { animate(element, [{ opacity: 0, translate: '18px 0' }, { opacity: 1, translate: '0 0' }], { duration: 250 }); },
  };
}
