document.documentElement.classList.add('js');
if (location.hash === "#all") document.documentElement.classList.add("nojs");

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function count(el) {
  const target = parseFloat(el.dataset.count);
  const dec = +(el.dataset.dec || 0);
  if (reduce || target === 0) return;
  const t0 = performance.now(), dur = 1400;
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-count]').forEach(count);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (el.closest('.hero') ? i * 80 : 0) + 'ms';
  io.observe(el);
});

document.querySelectorAll('.case-head').forEach((btn) => {
  btn.addEventListener('click', () => {
    const c = btn.closest('.case');
    const open = c.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
});
// open the first case by default so the story is visible
document.querySelector('.case-head')?.click();
