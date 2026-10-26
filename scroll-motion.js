/** Scroll-linked polish for the journey page; every section stays visible without it. */
export function initializeScrollMotion(motion) {
  const html = document.documentElement;
  const page = document.getElementById('career-experience');
  const hero = document.getElementById('hero');
  if (!page || !hero || !('IntersectionObserver' in window)) return;
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  page.prepend(bar);
  const sections = [...page.querySelectorAll('.pathway-heading, .pathway-tools, .journey-panel, .requirements-heading, .pathway-hint, .data-notice, .site-footer')];
  sections.forEach(section => section.classList.add('scroll-reveal'));
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  let frame = 0;
  function update() {
    frame = 0;
    if (page.hidden) return;
    const max = html.scrollHeight - innerHeight;
    bar.style.setProperty('--scroll-progress', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : '0');
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty('--hero-shift', Math.max(0, Math.min(1, -rect.top / rect.height)).toFixed(4));
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  function sync() {
    html.classList.toggle('scroll-fx', motion.enabled);
    if (motion.enabled) {
      for (const section of sections) if (!section.classList.contains('is-revealed')) observer.observe(section);
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', schedule);
      schedule();
      return;
    }
    // Paused motion shows everything at rest, so re-enabling never hides content already read.
    observer.disconnect();
    sections.forEach(section => section.classList.add('is-revealed'));
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    hero.style.removeProperty('--hero-shift');
  }
  document.addEventListener('pathfinder-motion-change', sync);
  sync();
}
