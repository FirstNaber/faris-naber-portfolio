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

/* ---------- fluid (WebGL): the hero orb, and the same fluid seen through text ---------- */
// Same technique and settings as the loehx.com hero: a double domain-warped fbm ("pattern")
// mapped through a small palette, time = seconds * 0.2 * 0.97 + 7.
const FLUID_FS = `
precision highp float;
uniform vec2 r;uniform float t;uniform sampler2D m;uniform float useMask;uniform vec3 ms;uniform vec2 mv; // ms.xy = pointer (px), ms.z = strength, mv = pointer velocity
const vec3 C0=vec3(1.,.267,.129);   // #ff4421 coral
const vec3 C1=vec3(0.);             // #000000
const vec3 C4=vec3(1.,.361,0.);     // #ff5c00 orange
const vec3 C5=vec3(1.,.878,.2);     // #ffe033 yellow
const vec3 C6=vec3(.318,.949,.945); // #51f2f1 teal, the complement used in the LET'S TALK letters
vec3 pal(float i){int k=int(mod(i,6.));
  if(useMask>.5){ if(k==0)return C0; if(k==1)return C1; if(k==2)return C6; if(k==3)return C0; if(k==4)return C5; return C4; }
  if(k==0)return C0; if(k==1)return C1; if(k==2)return C0; if(k==3)return C0; if(k==4)return C4; return C5;}
vec3 cmap(float x,float ph){float n=5.;float tt=fract(clamp(x,0.,1.)*.92+ph);float p=tt*n;float i0=floor(p);float i1=min(i0+1.,n);
  return mix(pal(i0),pal(i1),smoothstep(0.,1.,fract(p)));}
float rnd(vec2 n){return fract(sin(dot(n,vec2(12.9898,4.1414)))*43758.5453);}
float noise(vec2 p){vec2 ip=floor(p);vec2 u=fract(p);u=u*u*(3.-2.*u);
  float res=mix(mix(rnd(ip),rnd(ip+vec2(1.,0.)),u.x),mix(rnd(ip+vec2(0.,1.)),rnd(ip+vec2(1.,1.)),u.x),u.y);return res*res;}
const mat2 mtx=mat2(.8,.6,-.6,.8);
float fbm(vec2 p,float T,float ts){float f=0.;
  f+=.5*noise(p+T);p=mtx*p*2.02; f+=.03125*noise(p);p=mtx*p*2.01; f+=.25*noise(p);p=mtx*p*2.03;
  f+=.125*noise(p);p=mtx*p*2.01; f+=.0625*noise(p);p=mtx*p*2.04; f+=.015625*noise(p+ts);return f/.96875;}
float pattern(vec2 p,float T,float ts){float a=fbm(p,T,ts);return fbm(p+fbm(p+a,T,ts),T,ts);}
void main(){
  float T=t;float ts=sin(T);
  vec2 uv=gl_FragCoord.xy/r.x;
  // pointer: a soft swirl that stirs the fluid around the cursor
  vec2 dm=(gl_FragCoord.xy-ms.xy)/r.x; float rad=.22;
  float fall=exp(-dot(dm,dm)/(rad*rad))*ms.z;
  float ang=2.2*fall; float ca=cos(ang),sa=sin(ang);
  uv+=vec2(ca*dm.x-sa*dm.y,sa*dm.x+ca*dm.y)-dm;   // twist around the cursor
  uv-=mv*fall*.9;                                   // drag the fluid along with the pointer
  if(useMask>.5) uv*=2.2;                         // denser pattern: more change inside each letter
  float shade=pattern(uv,T,ts);
  float ph=useMask>.5 ? fract(T*.35) : 0.;         // letters cycle through the palette over time
  vec3 col=cmap(shade,ph);
  float a;
  if(useMask>.5){a=texture2D(m,gl_FragCoord.xy/r).a;}
  else{vec2 c=r*.5;float rad=min(r.x,r.y)*.5;a=1.-smoothstep(rad-1.5,rad,distance(gl_FragCoord.xy,c));}
  gl_FragColor=vec4(col*a,a);
}`;

function fluid(cv, { mask, onFrame, scale = 0.75, speed = 0.2, pointer = false } = {}) {
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) return null;
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FLUID_FS));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'ms'), uV = gl.getUniformLocation(pr, 'mv');
  // pointer interaction: eased position and strength, so the swirl follows smoothly and fades out
  const pt = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0, vx: 0, vy: 0 };
  if (pointer && !reduce) {
    addEventListener('pointermove', (e) => {
      const b = cv.getBoundingClientRect();
      pt.tx = e.clientX - b.left; pt.ty = b.bottom - e.clientY;
      const cx = b.width / 2, cy = b.height / 2, R = Math.min(b.width, b.height) / 2;
      pt.ts = Math.hypot(pt.tx - cx, pt.ty - cy) < R * 1.25 ? 1 : 0;
      if (!pt.s) { pt.x = pt.tx; pt.y = pt.ty; }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { pt.ts = 0; });
  }
  gl.uniform1f(gl.getUniformLocation(pr, 'useMask'), mask ? 1 : 0);
  let tex = null;
  if (mask) {
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  const tOff = +new URLSearchParams(location.search).get('orbt') || 0; // preview a later moment
  let visible = true, maskDirty = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(cv);
  addEventListener('resize', () => { maskDirty = true; });
  function frame(t) {
    const s = Math.min(devicePixelRatio || 1, 1.5) * scale;
    const W = Math.round(cv.clientWidth * s), H = Math.round(cv.clientHeight * s);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); maskDirty = true; }
    if (mask && maskDirty) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask(W, H, s)); maskDirty = false; }
    const nx = pt.x + (pt.tx - pt.x) * 0.08, ny = pt.y + (pt.ty - pt.y) * 0.08;
    const w = cv.clientWidth || 1;
    pt.vx = pt.vx * 0.9 + ((nx - pt.x) / w) * 1.2; pt.vy = pt.vy * 0.9 + ((ny - pt.y) / w) * 1.2;
    pt.x = nx; pt.y = ny; pt.s += (pt.ts - pt.s) * 0.05;
    gl.uniform3f(uM, pt.x * s, pt.y * s, pt.s); gl.uniform2f(uV, pt.vx, pt.vy);
    gl.uniform2f(uR, W, H); gl.uniform1f(uT, (reduce ? 0 : t / 1000 + tOff) * speed * 0.97 + 7);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    onFrame && onFrame();
    if (visible && !reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { refresh() { maskDirty = true; requestAnimationFrame(frame); } };
}

/* hero orb */
(function orb() {
  const cv = document.getElementById('orb');
  const place = () => {
    const y = scrollY;
    cv.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.85));
    cv.style.transform = `translateY(calc(-50% + ${y * 0.25}px)) scale(${1 + y / 4000})`;
  };
  if (!fluid(cv, { speed: 0.15, pointer: true })) { cv.style.background = 'radial-gradient(circle at 35% 45%,#ff7a3d,#b3240f 45%,#2a0c06 70%,transparent 71%)'; }
  addEventListener('scroll', place, { passive: true }); place();
})();

/* "LET'S TALK": the orb's fluid seen through the letters, like a window */
(function windowText() {
  const wrap = document.querySelector('.talk');
  if (!wrap) return;
  const cv = wrap.querySelector('.talk-fluid');
  const words = [...wrap.querySelectorAll('.talk-w')];
  const mc = document.createElement('canvas');
  function mask(W, H, s) {
    mc.width = W; mc.height = H;
    const ctx = mc.getContext('2d');
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff';
    const box = cv.getBoundingClientRect();
    for (const w of words) {
      const r = w.getBoundingClientRect(), cs = getComputedStyle(w);
      const fs = parseFloat(cs.fontSize) * s;
      ctx.font = `800 ${fs}px "Barlow Condensed"`;
      ctx.letterSpacing = (parseFloat(cs.letterSpacing) || 0) * s + 'px';
      const m = ctx.measureText(w.textContent);
      const A = m.fontBoundingBoxAscent, D = m.fontBoundingBoxDescent;
      const lh = r.height * s;
      const base = (r.top - box.top) * s + (lh - (A + D)) / 2 + A;
      ctx.textAlign = 'left';
      ctx.fillText(w.textContent.toUpperCase(), (r.left - box.left) * s, base);
    }
    return mc;
  }
  Promise.all([document.fonts.ready, document.fonts.load('800 100px "Barlow Condensed"')]).then(() => {
    const f = fluid(cv, { mask, scale: 0.9 });
    if (f) { wrap.classList.add('live'); addEventListener('resize', () => f.refresh()); }
  });
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
