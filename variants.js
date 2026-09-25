/* Hero variations, previewed with ?hero=1..6. The default site (no ?hero) is untouched. */
(function heroVariants() {
  const v = +new URLSearchParams(location.search).get('hero');
  if (!(v >= 1 && v <= 6)) return;

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

  /* 2 ─ funnel: cold leads pour in at the top, closed deals collect at the bottom */
  if (v === 2) {
    const st = stage('hv-funnel');
    st.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M4 6 L96 6 L55 52 L55 62 L45 62 L45 52 Z" /><circle cx="50" cy="82" r="13" /></svg>`;
    const cv = canvasIn(st);
    label(st, 'top', 'Cold leads');
    label(st, 'bottom', 'Closed deals');
    const mc = document.createElement('canvas');
    const mask = (W, H) => {
      mc.width = W; mc.height = H;
      const ctx = mc.getContext('2d'), p = progress(), t = performance.now() / 1000;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff';
      const X = (x) => x / 100 * W, Y = (y) => y / 100 * H;
      // funnel body, draining as you scroll
      ctx.save();
      ctx.beginPath(); ctx.moveTo(X(4), Y(6)); ctx.lineTo(X(96), Y(6)); ctx.lineTo(X(55), Y(52)); ctx.lineTo(X(55), Y(62)); ctx.lineTo(X(45), Y(62)); ctx.lineTo(X(45), Y(52)); ctx.closePath(); ctx.clip();
      const level = Y(8 + p * 38);
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, level + Math.sin(x / W * 9 + t * 1.6) * H * 0.008);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.restore();
      // stream + drops
      const sw = W * (0.03 + 0.03 * p);
      ctx.fillRect(X(50) - sw / 2, Y(61), sw, Y(8));
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.9 + i / 4) % 1;
        ctx.beginPath(); ctx.arc(X(50), Y(62) + k * Y(8), sw * (0.7 - k * 0.3), 0, 7); ctx.fill();
      }
      // pool of closed deals, filling as you scroll
      ctx.save();
      ctx.beginPath(); ctx.arc(X(50), Y(82), Math.min(X(13), Y(13)), 0, 7); ctx.clip();
      const top = Y(95) - (Y(26)) * (0.25 + 0.75 * p);
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, top + Math.sin(x / W * 14 - t * 2) * H * 0.006);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.restore();
      return mc;
    };
    fluid(cv, { mask, liveMask: true, scale: 0.7, zoom: 1.2, scrollPhysics: true });
  }

  /* 3 ─ 1,800-rep constellation: the camera flies toward the coral star (#3) as you scroll */
  if (v === 3) {
    const cv = document.createElement('canvas'); cv.className = 'hv-sky'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const tag = label(document.body, 'hv-me', '<b>#3</b> of 1,800 reps');
    const ctx = cv.getContext('2d');
    let W, H, dpr;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const stars = Array.from({ length: 1800 }, () => ({ x: (rnd() - .5) * 6, y: (rnd() - .5) * 4, z: 0.6 + rnd() * 6 }));
    const ME = { x: 0.45, y: -0.12, z: 4.2 };
    stars[2] = ME;
    const near = stars.map((s, i) => [i, Math.hypot(s.x - ME.x, s.y - ME.y, (s.z - ME.z) * .5)]).sort((a, b) => a[1] - b[1]).slice(1, 8).map((a) => stars[a[0]]);
    function draw(now) {
      const p = progress(), e = p * p * (3 - 2 * p), t = now / 1000;
      const cz = e * 3.85, cx = ME.x * e * 0.85 + Math.sin(t * .05) * .05, cy = ME.y * e * 0.85;
      const f = Math.min(W, H) * 0.9, ox = W * (innerWidth > 900 ? 0.64 : 0.5), oy = H * 0.5;
      const proj = (s) => { const z = s.z - cz; if (z < 0.08) return null; return [ox + (s.x - cx) / z * f, oy + (s.y - cy) / z * f, z]; };
      ctx.clearRect(0, 0, W, H);
      const pm = proj(ME);
      if (pm) {
        ctx.strokeStyle = 'rgba(143,240,238,.22)'; ctx.lineWidth = 1;
        for (const s of near) { const q = proj(s); if (q) { ctx.beginPath(); ctx.moveTo(pm[0], pm[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); } }
      }
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        if (s === ME) continue;
        const q = proj(s); if (!q) continue;
        const r = clamp(1.6 / q[2], 0.4, 3.2);
        ctx.globalAlpha = clamp(1.3 / q[2], 0.12, 0.95);
        ctx.fillRect(q[0] - r / 2, q[1] - r / 2, r, r);
      }
      ctx.globalAlpha = 1;
      if (pm) {
        const r = clamp(16 / pm[2], 4.5, 60), pulse = reduce ? 0 : (Math.sin(t * 2.2) + 1) / 2;
        const g = ctx.createRadialGradient(pm[0], pm[1], 0, pm[0], pm[1], r * (4 + pulse * 2));
        g.addColorStop(0, 'rgba(255,68,33,.55)'); g.addColorStop(1, 'rgba(255,68,33,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pm[0], pm[1], r * (4 + pulse * 2), 0, 7); ctx.fill();
        ctx.fillStyle = '#ff5a36'; ctx.beginPath(); ctx.arc(pm[0], pm[1], r, 0, 7); ctx.fill();
        tag.style.transform = `translate(${pm[0] + r + 14}px, ${pm[1] - 10}px)`;
      }
      const fade = clamp(1 - (scrollY - innerHeight * 0.9) / (innerHeight * 0.5));
      cv.style.opacity = fade; tag.style.opacity = fade * clamp(0.35 + p);
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
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

  /* 6 ─ eclipse: only the lit edge of the orb shows; the shadow slides off as you scroll */
  if (v === 6) {
    const st = stage('hv-eclipse');
    const cv = canvasIn(st);
    const mc = document.createElement('canvas');
    const mask = (W, H) => {
      mc.width = W; mc.height = H;
      const ctx = mc.getContext('2d'), R = Math.min(W, H) / 2 - 2, cx = W / 2, cy = H / 2, p = progress();
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.filter = `blur(${Math.round(R * 0.035)}px)`;
      const off = R * (0.24 + p * 0.55);
      ctx.beginPath(); ctx.arc(cx - off, cy + off * 0.18, R * 1.02, 0, 7); ctx.fill();
      ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
      return mc;
    };
    fluid(cv, { mask, liveMask: true, scale: 0.7, zoom: 1, scrollPhysics: true, speed: 0.15 });
  }

  /* switcher */
  const names = ['Current', 'Fluid headline', 'Funnel', 'Constellation', 'Growth line', 'Ribbon', 'Eclipse'];
  const bar = document.createElement('nav');
  bar.className = 'hv-bar';
  bar.innerHTML = `<span>Hero option <b>${v}</b> · ${names[v]}</span>` +
    names.map((n, i) => `<a href="${i ? '?hero=' + i : './'}" class="${i === v ? 'on' : ''}" title="${n}">${i || '✕'}</a>`).join('');
  document.body.appendChild(bar);
})();
