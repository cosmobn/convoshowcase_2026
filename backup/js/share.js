// share.js — share card (canvas, 1080×1350) + Web Share API + copy/toast helpers (spec §3.4)

const QR_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
const CONFETTI_SRC = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';

const scripts = {};
export function loadScript(src) {
  if (!scripts[src]) {
    scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = resolve; s.onerror = () => { delete scripts[src]; reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }
  return scripts[src];
}

/* ---------- Toast + clipboard ---------- */
let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

export function whatsappHref(text) {
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}

/** Share text + link: native share sheet if available, else copy the link. */
export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  if (await copyText(url)) toast('Link copied — send it to a friend 👀');
}

export async function confettiOnce(key = 'pf-confetti') {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* storage blocked: still fire once */ }
  try {
    await loadScript(CONFETTI_SRC);
    if (!window.confetti) return;
    // Run on a worker-backed canvas so the burst never blocks the main thread.
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:70';
    document.body.appendChild(cv);
    const fire = window.confetti.create(cv, { resize: true, useWorker: true, disableForReducedMotion: true });
    await fire({
      particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.7 },
      colors: ['#fdd00d', '#202959', '#ffffff', '#fdd00d'],
    });
    cv.remove();
  } catch { /* offline: no confetti, no problem */ }
}

/* ---------- Share card ---------- */
const W = 1080, H = 1350;

function fitFont(ctx, text, maxW, size, min, weight, family) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= maxW) return s; s -= 2; } while (s >= min);
  return min;
}
function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

async function drawQR(ctx, text, x, y, size) {
  await loadScript(QR_SRC);
  const qr = window.qrcode(0, 'M');
  qr.addData(text); qr.make();
  const n = qr.getModuleCount();
  const pad = 16;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, size, size, 20); ctx.fill();
  const cell = (size - pad * 2) / n;
  ctx.fillStyle = '#202959';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) ctx.fillRect(Math.floor(x + pad + c * cell), Math.floor(y + pad + r * cell), Math.ceil(cell), Math.ceil(cell));
  }
}

/**
 * @param {{title:string, steps:string[], url:string, sectorName:string, sectorColor:string, fromLabel:string}} o
 * @returns {Promise<Blob>}
 */
export async function makeCard(o) {
  const HEAD = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';
  const BODY = 'Inter, "Segoe UI", system-ui, sans-serif';
  try {
    await Promise.all([
      document.fonts.load(`800 80px "Plus Jakarta Sans"`),
      document.fonts.load(`700 40px "Plus Jakarta Sans"`),
      document.fonts.load(`500 30px Inter`),
    ]);
  } catch { /* fall back to system fonts */ }

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // background
  ctx.fillStyle = '#202959'; ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(W * .9, 120, 0, W * .9, 120, 520);
  g.addColorStop(0, 'rgba(79,124,255,.30)'); g.addColorStop(1, 'rgba(79,124,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(80, H - 200, 0, 80, H - 200, 600);
  g.addColorStop(0, 'rgba(139,92,246,.22)'); g.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const L = 80;
  // brand
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 34px ${HEAD}`; ctx.fillStyle = '#ffffff';
  ctx.fillText('PathFinder', L, 110);
  const bw = ctx.measureText('PathFinder ').width;
  ctx.fillStyle = '#fdd00d'; ctx.fillText('ICT', L + bw, 110);

  // heading
  ctx.fillStyle = '#ffffff'; ctx.font = `800 58px ${HEAD}`;
  ctx.fillText('My road to', L, 220);
  let size = 92, lines;
  do {
    ctx.font = `800 ${size}px ${HEAD}`;
    lines = wrap(ctx, o.title + ' 🚀', W - L * 2);
    size -= 4;
  } while ((lines.length > 3 || lines.some(l => ctx.measureText(l).width > W - L * 2)) && size > 48);
  size += 4;
  const lh = Math.round(size * 1.08);
  let y = 220 + lh;
  ctx.fillStyle = '#fdd00d';
  for (const l of lines) { ctx.fillText(l, L, y); y += lh; }

  // sector + start line
  y += 8;
  ctx.fillStyle = o.sectorColor; ctx.beginPath(); ctx.arc(L + 10, y - 10, 10, 0, Math.PI * 2); ctx.fill();
  ctx.font = `500 30px ${BODY}`; ctx.fillStyle = '#d6d9ef';
  ctx.fillText(ellipsize(ctx, `${o.sectorName} · starting from ${o.fromLabel}`, W - L * 2 - 34), L + 34, y);

  // steps with yellow path line
  const top = y + 60, bottom = 1030;
  const n = o.steps.length;
  const row = Math.min(100, (bottom - top) / Math.max(n, 1));
  const cx = L + 22;
  const first = top + row / 2 - 12, last = top + row * (n - 1) + row / 2 - 12;
  ctx.strokeStyle = '#fdd00d'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, first); ctx.lineTo(cx, last); ctx.stroke();
  o.steps.forEach((t, i) => {
    const cy = top + row * i + row / 2 - 12;
    const isGoal = i === n - 1;
    ctx.beginPath(); ctx.arc(cx, cy, isGoal ? 22 : 17, 0, Math.PI * 2);
    ctx.fillStyle = isGoal ? '#fdd00d' : '#ffffff'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = isGoal ? '#ffffff' : '#fdd00d'; ctx.stroke();
    const fs = fitFont(ctx, t, W - L * 2 - 80, Math.min(40, row * .5), 26, isGoal ? 800 : 700, HEAD);
    ctx.font = `${isGoal ? 800 : 700} ${fs}px ${HEAD}`;
    ctx.fillStyle = isGoal ? '#fdd00d' : '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(ellipsize(ctx, t, W - L * 2 - 80), cx + 52, cy + 2);
    ctx.textBaseline = 'alphabetic';
  });

  // footer: QR + url
  const qs = 210, qy = H - qs - 70;
  let tx = L;
  try { await drawQR(ctx, o.url, L, qy, qs); tx = L + qs + 36; } catch { /* no QR offline */ }
  const tw = W - tx - L;
  ctx.fillStyle = '#ffffff'; ctx.font = `800 36px ${HEAD}`;
  ctx.fillText(tx > L ? 'Scan to see my full road' : 'See my full road', tx, qy + 60);
  ctx.font = `500 26px ${BODY}`; ctx.fillStyle = '#d6d9ef';
  const shown = o.url.replace(/^https?:\/\//, '');
  ctx.fillText(ellipsize(ctx, shown, tw), tx, qy + 106);
  ctx.font = `500 22px ${BODY}`; ctx.fillStyle = '#a5a9c9';
  ctx.fillText(ellipsize(ctx, 'Unofficial student guide based on BIICF · biicf.bn', tw), tx, qy + 150);
  ctx.fillText(ellipsize(ctx, 'Make yours: what do you want to become?', tw), tx, qy + 186);

  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

/* ---------- Share sheet ---------- */
let current = null;

/**
 * Opens the share sheet. The image is generated as soon as the sheet opens so that the
 * Share button can call navigator.share() straight from the tap (needed on iOS Safari).
 */
export function openShareSheet(o) {
  const dlg = document.getElementById('share-sheet');
  const preview = document.getElementById('share-preview');
  const btnShare = document.getElementById('share-native');
  const wa = document.getElementById('share-wa');
  const text = o.text;

  if (current?.objectUrl) URL.revokeObjectURL(current.objectUrl);
  current = { file: null, objectUrl: null, o };
  preview.innerHTML = '<div class="spinner" role="img" aria-label="Making your share card"></div>';
  btnShare.disabled = true;
  btnShare.textContent = 'Share image';
  wa.href = whatsappHref(`${text} ${o.url}`);
  if (!dlg.open) dlg.showModal();

  const job = current;
  makeCard(o).then(blob => {
    if (job !== current) return;
    const name = `pathfinder-road-to-${o.slug}.png`;
    job.file = new File([blob], name, { type: 'image/png' });
    job.objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.alt = `Share card: my road to ${o.title}, ${o.steps.length} steps`;
    img.src = job.objectUrl;
    img.width = 1080; img.height = 1350;
    preview.replaceChildren(img);
    btnShare.disabled = false;
    const canFiles = !!(navigator.canShare && navigator.canShare({ files: [job.file] }));
    btnShare.textContent = canFiles ? 'Share image' : 'Download image';
  }).catch(() => {
    if (job !== current) return;
    preview.innerHTML = '<p>Could not make the image on this device. You can still share the link.</p>';
  });
}

export function setupShareSheet() {
  const dlg = document.getElementById('share-sheet');
  document.getElementById('share-native').addEventListener('click', async () => {
    if (!current?.file) return;
    const { file, o } = current;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `My road to ${o.title}`, text: `${o.text} ${o.url}` });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = current.objectUrl; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    toast('Image saved — post it and tag a friend 📸');
  });
  document.getElementById('share-copy').addEventListener('click', async () => {
    if (!current) return;
    if (await copyText(current.o.url)) toast('Link copied — send it to a friend 👀');
  });
  dlg.addEventListener('close', () => {
    if (current?.objectUrl) URL.revokeObjectURL(current.objectUrl);
    current = null;
  });
}
