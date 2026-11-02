/* =====================================================================
   idcard.js — KARTU ID DENGAN TALI (LANYARD) BERFISIKA
   ---------------------------------------------------------------------
   Tali = rangkaian titik yang saling terhubung (simulasi "Verlet").
   Kartu menggantung di ujung tali, bisa DITARIK dengan mouse/jari, lalu
   dilepas: tali melentur dan kartu mengayun/goyang sampai berhenti.
   Cara mengubah tampilan:
     - Ukuran kartu   -> variabel --cw (lebar) & --ch (tinggi) di style.css
     - Foto           -> atribut src pada <img> di dalam .idcard (index.html)
     - Warna/tebal tali, berat kartu, kelenturan -> objek CFG di bawah
   ===================================================================== */
const CFG = {
  points: 12,                      // jumlah titik tali (lebih banyak = lebih lentur)
  gravity: 0.55,                   // gravitasi (lebih besar = kartu lebih "berat" jatuh)
  damping: 0.993,                  // 1 = goyang terus, lebih kecil = cepat berhenti
  iterations: 14,                  // kekakuan tali (lebih besar = tali tidak molor)
  bobMass: 7,                      // berat kartu (lebih besar = ayunan lebih lambat)
  grab: 0.55,                      // kehalusan saat ditarik (0.1 santai ... 1 kaku)
  strap: ['#00e5ff', '#8a5cff'],   // warna tali dari atas ke bawah
  strapWidth: 12,                  // tebal tali (px)
  bottomGap: 30                    // jarak kartu ke dasar area saat diam (px)
};

export function initIdCard(stage) {
  const cvs = stage.querySelector('canvas'), card = stage.querySelector('.idcard'), ctx = cvs.getContext('2d');
  const N = CFG.points;
  let W = 0, H = 0, cw = 0, ch = 0, dpr = 1, seg = 20, restY = 150;
  let pts = [], raf = 0, running = false, last = 0, acc = 0, ang = 0, drag = null, lastW = 0;

  function resize() {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height; cw = card.offsetWidth; ch = card.offsetHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    restY = Math.max(80, H - ch - CFG.bottomGap); seg = restY / (N - 1);
    lastW = W;
  }
  function build() {                       // tali lurus menggantung dari tengah atas
    pts = [];
    for (let i = 0; i < N; i++) {
      const y = i * seg;
      pts.push({ x: W / 2, y, px: W / 2, py: y, w: i === 0 ? 0 : (i === N - 1 ? 1 / CFG.bobMass : 1), pin: false });
    }
    ang = 0; drag = null; card.classList.remove('grabbing');
  }
  const kick = (f = 16) => { const b = pts[N - 1]; if (b) b.px = b.x - f; };   // dorongan awal agar langsung goyang

  function applyDrag() {                   // kartu mengikuti jari/mouse, titik pegang tetap di bagian kartu yang sama
    const b = pts[N - 1], c = Math.cos(ang), s = Math.sin(ang);
    let tx = drag.x - (drag.lx * c + drag.ly * s), ty = drag.y - (-drag.lx * s + drag.ly * c);
    const ax = W / 2, dx = tx - ax, dist = Math.hypot(dx, ty), max = restY * 1.04;   // tali tidak bisa ditarik melebihi panjangnya
    if (dist > max) { tx = ax + dx * max / dist; ty = ty * max / dist; }
    b.pin = true; b.px = b.x; b.py = b.y;
    b.x += (tx - b.x) * CFG.grab; b.y += (ty - b.y) * CFG.grab;
  }

  function step() {
    const g = CFG.gravity, d = CFG.damping;
    for (let i = 1; i < N; i++) {
      const p = pts[i]; if (p.pin) continue;
      const vx = (p.x - p.px) * d, vy = (p.y - p.py) * d;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g;
    }
    for (let k = 0; k < CFG.iterations; k++) for (let i = 0; i < N - 1; i++) {
      const a = pts[i], b = pts[i + 1], wa = a.pin ? 0 : a.w, wb = b.pin ? 0 : b.w, s = wa + wb;
      if (!s) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1e-4, f = (dist - seg) / dist;
      a.x += dx * f * wa / s; a.y += dy * f * wa / s; b.x -= dx * f * wb / s; b.y -= dy * f * wb / s;
    }
    const b = pts[N - 1], minX = cw / 2 + 2, maxX = W - cw / 2 - 2, maxY = H - ch - 4;   // kartu tidak keluar dari area
    if (b.x < minX) { b.x = minX; b.px = b.x; } else if (b.x > maxX) { b.x = maxX; b.px = b.x; }
    if (b.y > maxY) { b.y = maxY; b.py = b.y; }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const path = () => {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < N - 1; i++) ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
      ctx.lineTo(pts[N - 1].x, pts[N - 1].y);
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    path(); ctx.lineWidth = CFG.strapWidth + 4; ctx.strokeStyle = 'rgba(3,5,18,.85)'; ctx.stroke();        // garis tepi gelap
    const gr = ctx.createLinearGradient(0, 0, 0, restY); gr.addColorStop(0, CFG.strap[0]); gr.addColorStop(1, CFG.strap[1]);
    path(); ctx.lineWidth = CFG.strapWidth; ctx.strokeStyle = gr; ctx.stroke();                            // tali berwarna
    path(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();                    // kilau
    const a = pts[Math.max(0, N - 4)], b = pts[N - 1];                                                     // sudut kartu mengikuti arah tali
    ang += (Math.atan2(b.x - a.x, b.y - a.y) - ang) * .4;
    card.style.transform = `translate3d(${b.x - cw / 2}px,${b.y}px,0) rotate(${-ang}rad)`;
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    acc += Math.min(.05, (t - last) / 1000 || 0); last = t;
    while (acc >= 1 / 60) { if (drag) applyDrag(); step(); acc -= 1 / 60; }
    draw();
  }
  function start() {
    stop(); resize(); if (W < 10) return;
    build(); kick(); running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); running = false; }

  card.addEventListener('pointerdown', e => {
    e.preventDefault(); card.setPointerCapture(e.pointerId);
    const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, b = pts[N - 1];
    const dx = x - b.x, dy = y - b.y, c = Math.cos(ang), s = Math.sin(ang);
    drag = { x, y, lx: dx * c - dy * s, ly: dx * s + dy * c };
    card.classList.add('grabbing');
  });
  card.addEventListener('pointermove', e => {
    if (!drag) return; const r = stage.getBoundingClientRect(); drag.x = e.clientX - r.left; drag.y = e.clientY - r.top;
  });
  const release = () => { if (!drag) return; drag = null; pts[N - 1].pin = false; card.classList.remove('grabbing'); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => card.addEventListener(ev, release));
  card.addEventListener('contextmenu', e => e.preventDefault());

  new ResizeObserver(() => { if (running && Math.abs(stage.getBoundingClientRect().width - lastW) > 2) start(); }).observe(stage);
  return { start, stop, kick };
}
