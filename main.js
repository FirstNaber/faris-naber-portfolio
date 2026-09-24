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

/* ---------- fluid orb (WebGL) ---------- */
(function orb() {
  const cv = document.getElementById('orb');
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) { cv.style.background = 'radial-gradient(circle at 35% 45%,#ff7a3d,#b3240f 45%,#2a0c06 70%,transparent 71%)'; return; }
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;uniform vec2 r;uniform float t;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
  void main(){
    vec2 uv=(gl_FragCoord.xy*2.-r)/min(r.x,r.y);
    float d=length(uv);
    float T=t*.06;
    vec2 q=vec2(fbm(uv*1.4+T),fbm(uv*1.4+vec2(5.2,1.3)-T));
    vec2 w=vec2(fbm(uv*1.4+3.5*q+vec2(1.7,9.2)+T*1.3),fbm(uv*1.4+3.5*q+vec2(8.3,2.8)-T));
    float f=fbm(uv*1.6+3.8*w);
    vec3 c=mix(vec3(.05,.015,.01),vec3(.62,.12,.04),smoothstep(.25,.7,f));
    c=mix(c,vec3(1.,.36,.16),smoothstep(.55,.85,f*length(w)*1.3));
    c=mix(c,vec3(1.,.72,.35),smoothstep(.78,1.,f*w.x*1.5));
    float rim=smoothstep(.6,1.,d)*smoothstep(.2,-.9,uv.x);
    c+=vec3(1.,.45,.15)*rim*.9;
    c*=1.-smoothstep(.3,1.,d)*.35*smoothstep(-.3,.7,uv.x);
    float a=1.-smoothstep(.985,1.,d);
    gl_FragColor=vec4(c*a,a);
  }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
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
  function frame(t) {
    const s = Math.min(devicePixelRatio || 1, 1.5) * 0.75;
    const W = Math.round(cv.clientWidth * s), H = Math.round(cv.clientHeight * s);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    gl.uniform2f(uR, W, H); gl.uniform1f(uT, reduce ? 20 : t / 1000 + 20);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const y = scrollY;
    cv.style.transform = `translateY(calc(-50% + ${y * 0.25}px)) scale(${1 + y / 4000})`;
    if (visible && !reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener('scroll', () => { const y = scrollY; cv.style.transform = `translateY(calc(-50% + ${y * 0.25}px)) scale(${1 + y / 4000})`; }, { passive: true });
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

/* ---------- 1,800-dot field, #3 highlighted ---------- */
function dotField(cv) {
  const COLS = 60, ROWS = 30, N = COLS * ROWS, ME = 2;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = w * ROWS / COLS;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cw = w / COLS, r = Math.max(1, cw * 0.2);
  const order = [...Array(N).keys()].map((i) => [i, Math.random()]);
  const t0 = performance.now(), dur = reduce ? 0 : 1600;
  let hover = -1;
  function draw(now) {
    const p = dur ? Math.min((now - t0) / dur, 1) : 1;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (const [i, d] of order) {
      if (i === ME) continue;
      const a = Math.max(0, Math.min(1, (p - d * 0.7) / 0.3));
      if (!a) continue;
      ctx.globalAlpha = a * (i === hover ? 0.95 : 0.22);
      ctx.fillRect((i % COLS + .5) * cw - r, (Math.floor(i / COLS) + .5) * cw - r, r * 2, r * 2);
    }
    if (p >= 1) {
      const x = (ME % COLS + .5) * cw, y = (Math.floor(ME / COLS) + .5) * cw;
      const pulse = reduce ? 0 : (Math.sin(now / 380) + 1) / 2;
      ctx.fillStyle = TEAL;
      ctx.globalAlpha = 0.25 * (1 - pulse);
      ctx.beginPath(); ctx.arc(x, y, r * (3 + pulse * 4), 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }
  cv.onmousemove = (e) => {
    const b = cv.getBoundingClientRect();
    hover = Math.floor((e.clientY - b.top) / cw) * COLS + Math.floor((e.clientX - b.left) / cw);
    cv.title = hover === ME ? 'Rank #3: me' : 'Rank #' + (hover + 1).toLocaleString();
  };
  cv.onmouseleave = () => { hover = -1; };
  requestAnimationFrame(draw);
}

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
