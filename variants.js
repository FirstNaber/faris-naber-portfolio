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

  /* 4 ─ one fluid ribbon: draws the growth curve in the hero, leaves off the top, loops back in,
         snakes down the page around the corners of headlines and boxes, and becomes the Rep Rally
         cumulative-sales chart, where it stops. */
  if (v === 4) {
    const st = document.createElement('div'); st.className = 'hv-stage hv-curve'; hero.prepend(st);
    const m1 = label(st, 'm1', '<em>90 days</em>80+ accounts · $100K');
    const m2 = label(st, 'm2', '<em>Just over a year</em><span class="c-o">323 accounts · $530K+</span>');
    label(st, 'cap', 'Rep Rally · Texas · from a cold start');
    const heroPt = (k) => ({ x: 0.06 + 0.88 * k, y: 0.88 - 0.78 * Math.pow(k, 1.7) });
    const K1 = 0.23;
    const q1 = heroPt(K1), q2 = heroPt(1);
    m1.style.cssText = `left:${q1.x * 100}%;top:${q1.y * 100}%`;
    m2.style.cssText = `left:${q2.x * 100}%;top:${q2.y * 100}%`;

    const cv = document.createElement('canvas'); cv.className = 'hv-ribbon-page'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);

    let P = [], S = [], idx = {};             // dense path points (document px), arc lengths, key indices
    const doc = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top + scrollY, r: r.right, b: r.bottom + scrollY, w: r.width, h: r.height }; };
    function catmull(way) {
      const out = [];
      for (let i = 0; i < way.length - 1; i++) {
        const p0 = way[i - 1] || way[i], p1 = way[i], p2 = way[i + 1], p3 = way[i + 2] || p2;
        const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 6));
        for (let j = 0; j < n; j++) {
          const t = j / n, t2 = t * t, t3 = t2 * t;
          out.push({
            x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
          });
        }
      }
      out.push(way[way.length - 1]);
      return out;
    }
    function build() {
      const W = document.documentElement.clientWidth, pad = 26, cx = (x) => clamp(x, pad, W - pad);
      const sr = doc(st);
      const way = [];
      for (let k = 0; k <= 1.0001; k += 0.04) { const q = heroPt(k); way.push({ x: sr.l + q.x * sr.w, y: sr.t + q.y * sr.h }); }
      const E = way[way.length - 1];
      const heroN = way.length;
      // rise off the top, loop, and come back in on the right
      way.push({ x: cx(E.x + 30), y: E.y - 110 }, { x: cx(E.x + 70), y: -160 }, { x: cx(W - 40), y: -120 }, { x: cx(W - 34), y: 60 });
      const apexN = way.length - 2;
      // snake down the page: pass each box diagonally behind it, wrapping its corners, alternating sides
      const sel = ['.intro-card', '#numbers .mega', '#numbers .rank', '#numbers .stats', '#motion .mega', '#motion .pull',
        '#work .mega', '#work .case:nth-of-type(1) .case-grid', '#work .case:nth-of-type(2) .case-title', '#work .case:nth-of-type(2) .case-grid'];
      let right = true;
      for (const q of sel) {
        const el = document.querySelector(q); if (!el) continue;
        const r = doc(el), o = 34;
        if (right) way.push({ x: cx(r.r + o), y: r.t - o }, { x: cx(r.r + o * 0.4), y: r.t + r.h * 0.2 }, { x: cx(r.l - o * 0.4), y: r.b - r.h * 0.2 }, { x: cx(r.l - o), y: r.b + o });
        else way.push({ x: cx(r.l - o), y: r.t - o }, { x: cx(r.l - o * 0.4), y: r.t + r.h * 0.2 }, { x: cx(r.r + o * 0.4), y: r.b - r.h * 0.2 }, { x: cx(r.r + o), y: r.b + o });
        right = !right;
      }
      // the chart: approach the start of the plotted line, then follow it exactly
      const line = document.querySelector('.growth2 .g2-line'), plot = doc(document.querySelector('.growth2 .g2-plot'));
      const L = line.getTotalLength(), chart = [];
      for (let i = 0; i <= 60; i++) { const q = line.getPointAtLength(L * i / 60); chart.push({ x: plot.l + q.x / 1000 * plot.w, y: plot.t + q.y / 360 * plot.h }); }
      const panel = doc(document.querySelector('.growth2'));
      way.push({ x: cx(panel.r + 30), y: panel.t - 40 }, { x: cx(panel.l + panel.w * 0.5), y: panel.t - 26 }, { x: cx(panel.l - 20), y: panel.t + 40 }, { x: cx(plot.l - 26), y: chart[0].y - 70 }, { x: chart[0].x - 18, y: chart[0].y - 16 });
      const pre = catmull(way);
      // key indices (map waypoint positions to dense indices by nearest point)
      const near = (pt, from = 0) => { let bi = from, bd = 1e12; for (let i = from; i < pre.length; i++) { const d = (pre[i].x - pt.x) ** 2 + (pre[i].y - pt.y) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
      idx.k1 = near({ x: sr.l + q1.x * sr.w, y: sr.t + q1.y * sr.h });
      idx.heroEnd = near(way[heroN - 1]);
      idx.apex = near(way[apexN], idx.heroEnd);
      const join = catmull([pre[pre.length - 1], chart[0], chart[1]]).slice(1, -1);
      idx.chart = pre.length + join.length;
      P = pre.concat(join, catmull(chart));
      S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y));
    }
    const t0 = performance.now();
    let head = 0;
    function target() {
      const vh = innerHeight, y = scrollY;
      const intro = reduce ? idx.heroEnd : Math.round(idx.heroEnd * 0.3 * clamp((performance.now() - t0) / 1800));
      // hero: the curve finishes and climbs off the top during the first ~40% of a screen of scrolling
      const up = Math.round(idx.apex * clamp(y / (vh * 0.4)));
      // then the head rides ~62% down the viewport
      let down = idx.apex, lim = y + vh * 0.62;
      for (let i = idx.apex; i < idx.chart; i++) { if (P[i].y <= lim) down = i; else if (P[i].y > lim + vh) break; }
      if (y < vh * 0.4) down = 0;                 // the hero phase is driven by `up`
      let h = Math.max(intro, up, down);
      if (h >= idx.chart - 1) {
        // on the chart, follow the same scrub the chart itself uses
        const b = document.querySelector('.growth2').getBoundingClientRect();
        const f = clamp((vh * 0.95 - b.top) / (vh * 0.75));
        h = idx.chart + Math.round((P.length - 1 - idx.chart) * f);
      }
      return h;
    }
    const mc = document.createElement('canvas');
    const mask = (W, H, s) => {
      mc.width = W; mc.height = H;
      const ctx = mc.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      if (!P.length) return mc;
      head += (target() - head) * 0.14;
      const hi = Math.min(P.length - 1, Math.round(head)), oy = scrollY, t = performance.now() / 1000;
      const width = (i) => {
        if (i >= idx.chart) return 9;                                   // the chart line
        const base = i < idx.heroEnd ? 20 : 26;
        const twist = 0.3 + 0.7 * Math.abs(Math.cos(S[i] / 240 + t * 0.5)); // ribbon twisting as it travels
        const toChart = clamp((idx.chart - i) / 120);                   // narrow into the chart line
        return 9 + (base * twist - 9) * toChart;
      };
      const L = [], R = [];
      const top = oy - 80, bot = oy + H / s + 80;
      for (let i = 0; i <= hi; i++) {
        const p = P[i];
        if (p.y < top - 400 || p.y > bot + 400) { if (L.length) break; else continue; }
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        let nx = -(b.y - a.y), ny = b.x - a.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        const w = width(i) / 2;
        L.push([(p.x + nx * w) * s, (p.y - oy + ny * w) * s]); R.push([(p.x - nx * w) * s, (p.y - oy - ny * w) * s]);
      }
      if (L.length > 1) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
        for (const q of L) ctx.lineTo(q[0], q[1]);
        for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
        ctx.closePath(); ctx.fill();
        if (hi < P.length - 1) {                                        // glowing head
          const p = P[hi]; ctx.beginPath(); ctx.arc(p.x * s, (p.y - oy) * s, width(hi) * 0.75 * s, 0, 7); ctx.fill();
        }
      }
      m1.classList.toggle('on', head >= idx.k1);
      m2.classList.toggle('on', head >= idx.heroEnd - 2);
      return mc;
    };
    let rb; const rebuild = () => { clearTimeout(rb); rb = setTimeout(build, 120); };
    fontsReady.then(() => { build(); setTimeout(build, 1500); });
    addEventListener('resize', rebuild);
    new ResizeObserver(rebuild).observe(document.body);
    fluid(cv, { mask, liveMask: true, scale: 0.6, zoom: 1.3, scrollPhysics: true });
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
