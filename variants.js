/* Hero variations, previewed with ?hero=1, 4 or 5. The default site (no ?hero) is untouched. */
(function heroVariants() {
  const v = +new URLSearchParams(location.search).get('hero');
  if (![1, 4, 5].includes(v)) return;

  const hero = document.querySelector('.hero');
  root.classList.add('hv', 'hv-' + v);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const progress = () => clamp(scrollY / (innerHeight * 0.75));   // 0 at top, 1 after ~3/4 screen of scrolling
  const fontsReady = Promise.all([document.fonts.ready, document.fonts.load('800 100px "Barlow Condensed"')]);

  // a stage on the right of the hero that lingers while you scroll, then fades
  function stage(cls) {
    const el = document.createElement('div');
    el.className = 'hv-stage ' + (cls || '');
    hero.prepend(el);
    const place = () => {
      const y = scrollY;
      el.style.transform = `translateY(calc(-50% + ${y * 0.55}px))`;
      el.style.opacity = clamp(1 - (y - innerHeight * 0.55) / (innerHeight * 0.5));
    };
    addEventListener('scroll', place, { passive: true }); place();
    return el;
  }
  const canvasIn = (parent, cls) => { const c = document.createElement('canvas'); c.className = cls || 'hv-canvas'; c.setAttribute('aria-hidden', 'true'); parent.appendChild(c); return c; };
  const label = (parent, cls, html) => { const d = document.createElement('div'); d.className = 'hv-label ' + cls; d.innerHTML = html; parent.appendChild(d); return d; };

  /* 1 ─ the fluid shows through the headline words; no circle */
  if (v === 1) {
    const cv = canvasIn(hero, 'hv-canvas hv-full');
    const lines = [...hero.querySelectorAll('.ln > span')];
    const mc = document.createElement('canvas');
    const mask = (W, H, s) => {
      mc.width = W; mc.height = H;
      const ctx = mc.getContext('2d'), box = cv.getBoundingClientRect(), cs = getComputedStyle(hero.querySelector('.hero-title'));
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff';
      ctx.font = `800 ${parseFloat(cs.fontSize) * s}px "Barlow Condensed"`;
      ctx.letterSpacing = (parseFloat(cs.letterSpacing) || 0) * s + 'px';
      for (const el of lines) {
        const r = el.getBoundingClientRect(), m = ctx.measureText('H');
        const A = m.fontBoundingBoxAscent, D = m.fontBoundingBoxDescent;
        ctx.fillText(el.textContent.toUpperCase(), (r.left - box.left) * s, (r.top - box.top) * s + (r.height * s - (A + D)) / 2 + A);
      }
      return mc;
    };
    fontsReady.then(() => {
      const f = fluid(cv, { mask, scale: 0.8, zoom: 1.6, scrollPhysics: true });
      if (f) { root.classList.add('hv-live'); addEventListener('resize', () => f.refresh()); }
    });
  }

  /* 4 ─ a glowing line draws itself and becomes the Rep Rally growth curve */
  if (v === 4) {
    const st = stage('hv-curve');
    const cv = canvasIn(st);
    const m1 = label(st, 'm1', '<em>90 days</em>80+ accounts · $100K');
    const m2 = label(st, 'm2', '<em>Just over a year</em><span class="c-o">323 accounts · $530K+</span>');
    label(st, 'cap', 'Rep Rally · Texas · from a cold start');
    const pt = (k) => ({ x: 0.06 + 0.88 * k, y: 0.88 - 0.78 * Math.pow(k, 1.7) });
    const K1 = 0.23;
    const t0 = performance.now();
    let prog = 0;
    const mc = document.createElement('canvas');
    const mask = (W, H) => {
      mc.width = W; mc.height = H;
      const ctx = mc.getContext('2d');
      const intro = reduce ? 1 : clamp((performance.now() - t0) / 1800) * 0.3;
      prog += (Math.max(intro, 0.3 + progress() * 0.7) - prog) * 0.12;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(10, W * 0.028);
      ctx.beginPath();
      const N = 120, end = Math.round(N * prog);
      for (let i = 0; i <= end; i++) { const q = pt(i / N); i ? ctx.lineTo(q.x * W, q.y * H) : ctx.moveTo(q.x * W, q.y * H); }
      ctx.stroke();
      const hd = pt(end / N);
      ctx.beginPath(); ctx.arc(hd.x * W, hd.y * H, ctx.lineWidth * 1.1, 0, 7); ctx.fill();
      m1.classList.toggle('on', prog >= K1);
      m2.classList.toggle('on', prog > 0.985);
      return mc;
    };
    const q1 = pt(K1), q2 = pt(1);
    m1.style.cssText = `left:${q1.x * 100}%;top:${q1.y * 100}%`;
    m2.style.cssText = `left:${q2.x * 100}%;top:${q2.y * 100}%`;
    fluid(cv, { mask, liveMask: true, scale: 0.7, zoom: 1.4, scrollPhysics: true });
  }

  /* 5 ─ a flowing ribbon of fluid along the bottom of the hero, like a horizon */
  if (v === 5) {
    const wrap = document.createElement('div'); wrap.className = 'hv-ribbon'; hero.prepend(wrap);
    const cv = canvasIn(wrap);
    const mc = document.createElement('canvas');
    const mask = (W, H) => {
      mc.width = W; mc.height = H;
      const ctx = mc.getContext('2d'), t = performance.now() / 1000 * (reduce ? 0 : 1), ph = scrollY * 0.004;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff';
      ctx.filter = `blur(${Math.round(H * 0.02)}px)`;
      const top = (x) => H * (0.42 - progress() * 0.12) + Math.sin(x * 5.2 + t * 0.5 + ph) * H * 0.12 + Math.sin(x * 11 - t * 0.35) * H * 0.04;
      const bot = (x) => top(x) + H * (0.2 + 0.08 * Math.sin(x * 3.1 - t * 0.4 + ph * 1.5));
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const x = i / 60; i ? ctx.lineTo(x * W, top(x)) : ctx.moveTo(0, top(0)); }
      for (let i = 60; i >= 0; i--) { const x = i / 60; ctx.lineTo(x * W, bot(x)); }
      ctx.closePath(); ctx.fill();
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'destination-in';
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.12, '#000'); g.addColorStop(.88, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      return mc;
    };
    fluid(cv, { mask, liveMask: true, scale: 0.6, zoom: 0.9, scrollPhysics: true });
  }

  /* switcher */
  const names = ['Current', 'Fluid headline', 'Funnel', 'Constellation', 'Growth line', 'Ribbon', 'Eclipse'];
  const bar = document.createElement('nav');
  bar.className = 'hv-bar';
  bar.innerHTML = `<span>Hero option <b>${v}</b> · ${names[v]}</span>` +
    [0, 1, 4, 5].map((i) => `<a href="${i ? '?hero=' + i : './'}" class="${i === v ? 'on' : ''}" title="${names[i]}">${i || '✕'}</a>`).join('');
  document.body.appendChild(bar);
})();
