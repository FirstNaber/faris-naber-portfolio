const root = document.documentElement;
root.classList.add('js');
if (location.hash === '#all') root.classList.add('nojs'); // screenshot/debug: show everything
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ORANGE = '#ff5a36', TEAL = '#8ff0ee';

addEventListener('load', () => root.classList.add('loaded'));
setTimeout(() => root.classList.add('loaded'), 1200);

/* ---------- starfield ---------- */
(function stars() {
  const cv = document.getElementById('stars');
  const ctx = cv.getContext('2d');
  let w, h, dpr, pts = [];
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 4200);
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h * 3,
      z: Math.random() ** 2,                       // depth: most stars far away
      s: Math.random() < 0.05 ? 2.4 : Math.random() < 0.3 ? 1.4 : 0.9,
      p: Math.random() * 6.28, f: 0.5 + Math.random() * 1.5,
    }));
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY;
    for (const s of pts) {
      const y = ((s.y - sy * (0.05 + s.z * 0.35)) % (h * 3) + h * 3) % (h * 3);
      if (y > h) continue;
      const a = reduce ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(t / 1000 * s.f + s.p));
      ctx.globalAlpha = a * (0.4 + s.z * 0.6);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, y, s.s, s.s);
    }
    if (!reduce) requestAnimationFrame(draw);
  }
  size(); addEventListener('resize', size);
  requestAnimationFrame(draw);
  if (reduce) addEventListener('scroll', () => requestAnimationFrame(draw), { passive: true });
})();

/* ---------- fluid planet (WebGL): a lit 3D sphere, texture wrapped on its surface ---------- */
(function orb() {
  const cv = document.getElementById('orb');
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) { cv.style.background = 'radial-gradient(circle at 35% 40%,#ff8a4a,#b3240f 45%,#2a0c06 72%,transparent 73%)'; return; }
  // BANDS: 0 = continents/lava, 1 = gas-giant bands. RIDGE: crispness of the surface detail.
  const PAL = {
    lava:  'vec3 PAL0=vec3(.035,.03,.03),PAL1=vec3(.11,.09,.085),PAL2=vec3(.95,.34,.12),PAL3=vec3(1.,.72,.38),ATM=vec3(1.,.42,.18);const float BANDS=0.;',
    jove:  'vec3 PAL0=vec3(.36,.2,.12),PAL1=vec3(.72,.5,.34),PAL2=vec3(.93,.85,.72),PAL3=vec3(.62,.24,.12),ATM=vec3(.95,.72,.5);const float BANDS=1.;',
    ice:   'vec3 PAL0=vec3(.04,.1,.16),PAL1=vec3(.16,.38,.5),PAL2=vec3(.55,.88,.9),PAL3=vec3(.93,.98,1.),ATM=vec3(.56,.94,.93);const float BANDS=1.;',
    moon:  'vec3 PAL0=vec3(.07,.07,.075),PAL1=vec3(.3,.29,.28),PAL2=vec3(.62,.6,.57),PAL3=vec3(.9,.88,.84),ATM=vec3(1.,.45,.22);const float BANDS=0.;',
  };
  const pal = PAL[new URLSearchParams(location.search).get('pal')] || PAL.lava;
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform vec2 r;uniform float t;
  PALETTE
  float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return v;}
  mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
  void main(){
    vec2 uv=(gl_FragCoord.xy*2.-r)/min(r.x,r.y);
    float R=.86;
    vec2 q0=uv/R; float d=length(q0);
    // outer atmosphere glow (outside the disc edge)
    float glow=exp(-max(d-1.,0.)*14.)*.32*(1.-smoothstep(1.,1.09,d));
    vec3 col=vec3(0.);float alpha=0.;
    if(d<1.){
      float z=sqrt(1.-d*d);
      vec3 nrm=vec3(q0,z);
      // texture lives on the sphere surface, so it rotates and foreshortens like a real planet
      vec3 sp=rotY(t*.01)*nrm*1.6;
      float T=t*.004;
      vec3 w=vec3(fbm(sp*.8+T),fbm(sp*.8+vec3(5.2,1.3,8.1)-T),fbm(sp*.8+vec3(2.4,7.7,3.3)+T));
      vec3 P=sp*1.5+1.1*w;
      // ridged noise = crisp, sharp-edged detail (no fog)
      float rg=0.,amp=.55;vec3 pp=P;
      for(int i=0;i<6;i++){float v=1.-abs(2.*n(pp)-1.);rg+=amp*v*v;pp=pp*2.07+vec3(3.1,1.7,5.3);amp*=.5;}
      float f=fbm(P);
      vec3 c;
      if(BANDS>.5){
        float lat=nrm.y*6.+w.x*1.6+f*.9;
        float bnd=.5+.5*sin(lat*3.1);
        c=mix(PAL0,PAL1,smoothstep(.15,.55,bnd));
        c=mix(c,PAL2,smoothstep(.55,.9,bnd)*.9);
        c=mix(c,PAL3,smoothstep(.72,.95,rg)*.55);
        c*=.86+.28*rg;
      }else{
        c=mix(PAL0,PAL1,smoothstep(.25,.75,f));
        float crack=smoothstep(.78,.97,rg);            // glowing fissures / bright ridges
        c=mix(c,PAL2,crack);
        c=mix(c,PAL3,smoothstep(.93,1.,rg));
        c*=.9+.25*rg;
      }
      vec3 L=normalize(vec3(-.6,.42,.68));
      float diff=clamp(dot(nrm,L),0.,1.);
      float lit=.16+.9*smoothstep(-.1,.9,diff);
      if(BANDS<.5) lit=mix(lit,1.,smoothstep(.8,.97,rg)*.75); // lava glows on the night side too
      c*=lit*mix(.8,1.,z);
      float fres=pow(1.-z,4.);
      c=mix(c,ATM,fres*(.25+.55*diff));                 // thin rim of atmosphere, not haze
      col=c;alpha=1.-smoothstep(.985,1.002,d);
    }
    vec3 gcol=ATM*glow;
    col=col*alpha+gcol*(1.-alpha);
    float a=alpha+glow*(1.-alpha);
    gl_FragColor=vec4(col,a);
  }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src.replace('PALETTE', pal)); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't');
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(cv);
  function place() {
    const y = scrollY, fade = Math.max(0, 1 - y / (innerHeight * 0.85));
    cv.style.transform = `translateY(calc(-50% + ${y * 0.22}px))`;
    cv.style.opacity = fade;
  }
  function frame(t) {
    const s = Math.min(devicePixelRatio || 1, 2) * 0.85;
    const W = Math.round(cv.clientWidth * s), H = Math.round(cv.clientHeight * s);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    gl.uniform2f(uR, W, H); gl.uniform1f(uT, reduce ? 20 : t / 1000 + 20);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !reduce) requestAnimationFrame(frame);
  }
  addEventListener('scroll', place, { passive: true });
  place(); requestAnimationFrame(frame);
})();

/* ---------- menu ---------- */
const menuBtn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open);
  menu.setAttribute('aria-hidden', !open);
  menuBtn.firstElementChild.textContent = open ? 'CL' : 'ME';
  menuBtn.children[1].textContent = open ? 'OSE' : 'NU';
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- mega headlines slide in from the sides as you scroll ---------- */
const megas = [...document.querySelectorAll('.mega')];
function megaScroll() {
  const vh = innerHeight;
  for (const m of megas) {
    const r = m.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) continue;
    // 1 while the headline is entering from below, easing to 0 by the time it reaches the upper third
    const p = Math.max(0, Math.min(1, (r.top - vh * 0.25) / (vh * 0.75)));
    const e = p * p;
    const dir = m.classList.contains('right') ? -1 : 1; // start offset toward the centre, settle at the resting edge
    m.children[0].style.transform = `translateX(${dir * e * 16}vw)`;
    m.children[1].style.transform = `translateX(${dir * e * 6}vw)`;
    m.children[0].style.opacity = m.children[1].style.opacity = 1 - e * 0.6;
  }
}
if (!reduce && !root.classList.contains('nojs')) {
  addEventListener('scroll', () => requestAnimationFrame(megaScroll), { passive: true });
  megaScroll();
}

/* ---------- counters ---------- */
function count(el, attr) {
  const target = parseFloat(el.dataset[attr]), dec = +(el.dataset.dec || 0);
  if (reduce || !target) return;
  const t0 = performance.now(), dur = 1500;
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ---------- 1,800-dot field: #3 highlighted, sonar ripple, hover ranks ---------- */
function dotField(cv) {
  const COLS = 60, ROWS = 30, N = COLS * ROWS, ME = 2;
  const tip = cv.parentElement.querySelector('.dots-tip');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let w, cw, r, ctx;
  function size() {
    w = cv.clientWidth; const h = w * ROWS / COLS;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cw = w / COLS; r = Math.max(1, cw * 0.2);
  }
  size(); addEventListener('resize', size);
  const mx = (ME % COLS + .5), my = (Math.floor(ME / COLS) + .5);
  const dist = Array.from({ length: N }, (_, i) => Math.hypot(i % COLS + .5 - mx, Math.floor(i / COLS) + .5 - my));
  const delay = Array.from({ length: N }, () => Math.random());
  const t0 = performance.now(), intro = reduce ? 0 : 1600;
  let hover = -1;
  function draw(now) {
    const p = intro ? Math.min((now - t0) / intro, 1) : 1;
    const wave = ((now - t0 - intro) / 1000 * 22) % 90;   // ring radius in cells, repeats
    ctx.clearRect(0, 0, w, w * ROWS / COLS);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < N; i++) {
      if (i === ME) continue;
      const a = Math.max(0, Math.min(1, (p - delay[i] * 0.7) / 0.3));
      if (!a) continue;
      let lum = 0.2;
      if (p >= 1 && !reduce) { const d = Math.abs(dist[i] - wave); if (d < 3) lum += 0.5 * (1 - d / 3) * (1 - wave / 90); }
      if (i === hover) lum = 1;
      ctx.globalAlpha = a * lum;
      ctx.fillRect((i % COLS + .5) * cw - r, (Math.floor(i / COLS) + .5) * cw - r, r * 2, r * 2);
    }
    if (p >= 1) {
      const x = mx * cw, y = my * cw, pulse = reduce ? 0 : (Math.sin(now / 380) + 1) / 2;
      ctx.fillStyle = TEAL;
      ctx.globalAlpha = 0.25 * (1 - pulse); ctx.beginPath(); ctx.arc(x, y, r * (3 + pulse * 4), 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }
  cv.onmousemove = (e) => {
    const b = cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - b.left) / cw), rr = Math.floor((e.clientY - b.top) / cw);
    hover = c >= 0 && c < COLS && rr >= 0 && rr < ROWS ? rr * COLS + c : -1;
    if (hover < 0) return;
    tip.textContent = hover === ME ? '#3 of 1,800 — me' : 'Rep #' + (hover + 1).toLocaleString();
    tip.classList.toggle('me', hover === ME);
    tip.style.left = ((hover % COLS + .5) * cw) + 'px';
    tip.style.top = ((Math.floor(hover / COLS) + .5) * cw) + 'px';
    tip.classList.add('on');
  };
  cv.onmouseleave = () => { hover = -1; tip.classList.remove('on'); };
  requestAnimationFrame(draw);
}

/* ---------- Rep Rally growth chart, scrubbed by scroll ---------- */
(function growth() {
  const box = document.querySelector('.growth2');
  if (!box) return;
  const line = box.querySelector('.g2-line'), clip = box.querySelector('.g2-cliprect');
  const dot = box.querySelector('.g2-head-dot');
  const accEl = box.querySelector('.g2-acc'), salesEl = box.querySelector('.g2-sales');
  const L = line.getTotalLength(); // real length, for point lookup; dashes use pathLength=1
  line.style.strokeDasharray = 1; line.style.strokeDashoffset = 1;
  const M1 = 267.7; // x of the 90-day milestone
  const on = (sel, v) => box.querySelectorAll(sel).forEach((el) => el.classList.toggle('on', v));
  // readouts only ever show real milestone values; they tween between them
  let shown = { a: 0, s: 0 }, target = { a: 0, s: 0 }, raf;
  function tween() {
    shown.a += (target.a - shown.a) * 0.12; shown.s += (target.s - shown.s) * 0.12;
    if (Math.abs(target.a - shown.a) < 0.5) shown = { ...target };
    accEl.textContent = Math.round(shown.a) + (target.a === 80 && shown.a === 80 ? '+' : '');
    salesEl.textContent = '$' + Math.round(shown.s) + 'K' + (target.s === 530 && shown.s === 530 ? '+' : '');
    raf = shown.a !== target.a ? requestAnimationFrame(tween) : null;
  }
  function setTarget(a, s) { if (target.a === a) return; target = { a, s }; if (!raf) raf = requestAnimationFrame(tween); }
  function update() {
    const b = box.getBoundingClientRect(), vh = innerHeight;
    // 0 when the chart's top enters the lower part of the screen, 1 when it's comfortably in view
    const p = reduce || root.classList.contains('nojs') ? 1 : Math.max(0, Math.min(1, (vh * 0.95 - b.top) / (vh * 0.75)));
    const len = L * p;
    line.style.strokeDashoffset = 1 - p;
    const pt = line.getPointAtLength(Math.max(0.01, len));
    clip.setAttribute('width', pt.x);
    dot.style.left = pt.x / 10 + '%'; dot.style.top = pt.y / 3.6 + '%';
    dot.style.opacity = p > 0 ? 1 : 0;
    const past1 = pt.x >= M1 - 0.5, done = p >= 0.995;
    on('.p1, .c1, .d1', past1); on('.p2, .c2, .d2', done);
    setTarget(done ? 323 : past1 ? 80 : 0, done ? 530 : past1 ? 100 : 0);
  }
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  addEventListener('resize', update);
  update();
})();

/* ---------- record-month bars ---------- */
function cells(el, n, label) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.title = label + ' ' + (i + 1);
    el.appendChild(c);
    setTimeout(() => c.classList.add('f'), reduce ? 0 : 400 + i * 50);
  }
  const read = document.createElement('p'); read.className = 'cell-read';
  el.after(read);
  el.addEventListener('mouseover', (e) => {
    const i = [...el.children].indexOf(e.target);
    if (i >= 0) read.textContent = label + ' ' + (i + 1) + ' of ' + n;
  });
  el.addEventListener('mouseleave', () => { read.textContent = ''; });
}

/* ---------- kiosk-motion stepper ---------- */
function stepper(ol) {
  const li = [...ol.children]; let k = 0, timer;
  const set = (i) => li.forEach((l, j) => l.classList.toggle('on', j <= i));
  const run = () => { clearInterval(timer); timer = setInterval(() => { k = (k + 1) % (li.length + 2); set(Math.min(k, li.length - 1)); }, 650); };
  set(0); run();
  li.forEach((l, i) => { l.onmouseenter = () => { clearInterval(timer); set(i); }; l.onmouseleave = run; });
}

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    el.querySelectorAll('[data-count]').forEach((c) => count(c, 'count'));
    el.querySelectorAll('[data-ccount]').forEach((c) => count(c, 'ccount'));
    el.querySelectorAll('.dots').forEach((cv) => setTimeout(() => dotField(cv), 200));
    el.querySelectorAll('.cells').forEach((c) => cells(c, 29, 'Unit'));
    el.querySelectorAll('.stepper').forEach(stepper);
    io.unobserve(el);
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- phone: tilt toward the pointer ---------- */
(function phone() {
  const ph = document.querySelector('.phone'), stage = document.querySelector('.phone-stage');
  if (!ph || reduce) return;
  function tilt(x, y) {
    ph.style.setProperty('--ry', (x * 28) + 'deg');
    ph.style.setProperty('--rx', (-y * 18) + 'deg');
  }
  stage.addEventListener('pointermove', (e) => {
    const b = ph.getBoundingClientRect();
    tilt(Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / (b.width * 1.5))),
         Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / (b.height))));
  });
  stage.addEventListener('pointerleave', () => { ph.style.removeProperty('--ry'); ph.style.removeProperty('--rx'); });
  // on touch devices, tilt gently with scroll
  addEventListener('scroll', () => {
    if (matchMedia('(hover: hover)').matches) return;
    const b = ph.getBoundingClientRect();
    const p = (b.top + b.height / 2 - innerHeight / 2) / innerHeight;
    tilt(-0.6 + p * 0.5, p * 0.6);
  }, { passive: true });
})();
