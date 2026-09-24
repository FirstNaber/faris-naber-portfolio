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

function ccount(el) {
  const target = parseFloat(el.dataset.ccount), dec = +(el.dataset.dec || 0);
  if (reduce) return;
  const t0 = performance.now(), dur = 1500;
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

// 1,800-dot field, #3 highlighted
function dotField(cv) {
  const COLS = 60, ROWS = 30, N = COLS * ROWS, ME = 2;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = w * ROWS / COLS;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cw = w / COLS, r = Math.max(1, cw * 0.22);
  const order = [...Array(N).keys()].map((i) => [i, Math.random()]);
  const t0 = performance.now(), dur = reduce ? 0 : 1400;
  let hover = -1;
  function draw(now) {
    const p = dur ? Math.min((now - t0) / dur, 1) : 1;
    ctx.clearRect(0, 0, w, h);
    for (const [i, d] of order) {
      if (i === ME) continue;
      const a = Math.max(0, Math.min(1, (p - d * 0.7) / 0.3));
      if (!a) continue;
      ctx.globalAlpha = a * (i === hover ? 0.9 : 0.28);
      ctx.fillStyle = '#efece4';
      ctx.beginPath(); ctx.arc((i % COLS + .5) * cw, (Math.floor(i / COLS) + .5) * cw, r, 0, 7); ctx.fill();
    }
    if (p >= 1) {
      const x = (ME % COLS + .5) * cw, y = (Math.floor(ME / COLS) + .5) * cw;
      const pulse = reduce ? 0 : (Math.sin(now / 400) + 1) / 2;
      ctx.globalAlpha = 0.25 * (1 - pulse); ctx.fillStyle = '#d9b26b';
      ctx.beginPath(); ctx.arc(x, y, r * (2.5 + pulse * 3), 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!cv.closest('.case').classList.contains('open')) return;
    requestAnimationFrame(draw);
  }
  cv.onmousemove = (e) => {
    const b = cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - b.left) / cw), rr = Math.floor((e.clientY - b.top) / cw);
    hover = rr * COLS + c;
    cv.title = hover === ME ? 'Rank #3 — me' : 'Rank #' + (hover + 1).toLocaleString();
  };
  cv.onmouseleave = () => { hover = -1; };
  requestAnimationFrame(draw);
}

// streak cells
function cells(el, n, label) {
  if (!el.children.length) {
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.title = label + ' ' + (i + 1);
      el.appendChild(c);
    }
    const read = document.createElement('p'); read.className = 'cell-read';
    el.after(read);
    el.addEventListener('mouseover', (e) => {
      const i = [...el.children].indexOf(e.target);
      if (i >= 0) read.textContent = label + ' ' + (i + 1) + ' of ' + n;
    });
    el.addEventListener('mouseleave', () => { read.textContent = ''; });
  }
  [...el.children].forEach((c, i) => {
    c.classList.remove('f');
    setTimeout(() => c.classList.add('f'), reduce ? 0 : 300 + i * 45);
  });
}

// kiosk motion stepper cycles while open
let stepTimer;
function stepper(ol) {
  const li = [...ol.children]; let k = 0;
  clearInterval(stepTimer);
  const set = (i) => li.forEach((l, j) => l.classList.toggle('on', j <= i));
  set(0);
  stepTimer = setInterval(() => { k = (k + 1) % (li.length + 1); set(k === li.length ? li.length - 1 : k); if (k === li.length) k = -1; }, 700);
  li.forEach((l, i) => l.onmouseenter = () => { clearInterval(stepTimer); set(i); });
}

function play(c) {
  c.classList.remove('play'); void c.offsetWidth; c.classList.add('play');
  c.querySelectorAll('[data-ccount]').forEach(ccount);
  c.querySelectorAll('.dots').forEach((cv) => setTimeout(() => dotField(cv), 250));
  c.querySelectorAll('.cells.s29').forEach((el) => cells(el, 29, 'Unit'));
  c.querySelectorAll('.stepper').forEach(stepper);
}

document.querySelectorAll('.case-head').forEach((btn) => {
  btn.addEventListener('click', () => {
    const c = btn.closest('.case');
    const open = c.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    if (open) play(c); else c.classList.remove('play');
  });
});
// open the first case by default so the story is visible
if (location.hash === '#all') document.querySelectorAll('.case-head').forEach((b) => b.click()); else document.querySelector('.case-head')?.click();
