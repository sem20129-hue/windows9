/* ============================================================
   core.js — сцена, DOM-хелперы, динамик, стадии
   ============================================================ */
'use strict';

const Q  = (s, r) => (r || document).querySelector(s);
const QQ = (s, r) => Array.from((r || document).querySelectorAll(s));

function el(tag, o, kids) {
  const n = document.createElement(tag);
  if (o) {
    if (o.id) n.id = o.id;
    if (o.cls) n.className = o.cls;
    if (o.text != null) n.textContent = o.text;
    if (o.html != null) n.innerHTML = o.html;
    if (o.title != null) n.title = o.title;
    if (o.type) n.type = o.type;
    if (o.value != null) n.value = o.value;
    if (o.attrs) for (const k in o.attrs) n.setAttribute(k, o.attrs[k]);
    if (o.style) n.setAttribute('style', o.style);
    if (o.on) for (const k in o.on) n.addEventListener(k, o.on[k]);
  }
  /* потомков можно передать третьим аргументом или ключом o.kids — оба способа равноправны */
  const children = (o && o.kids != null) ? o.kids : kids;
  if (children != null) (Array.isArray(children) ? children : [children]).forEach(k => {
    if (k == null) return;
    n.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
  });
  return n;
}
const spacer = (h) => el('div', { style: 'height:' + h + 'px;flex:0 0 ' + h + 'px' });
const frag = (kids) => { const f = document.createDocumentFragment(); (kids || []).forEach(k => k && f.appendChild(k)); return f; };

/* ---------- ускорение загрузки по ESC ---------- */
let MUTED = false;
const FF = { on: false };
function sleep(ms) { return new Promise(r => setTimeout(r, FF.on ? Math.min(ms, 24) : ms)); }
function waitForever() { return new Promise(() => {}); }

/* ---------- динамик PC-speaker ----------
   Windows 9 звучала через один 8-битный моно-динамик без баса,
   поэтому основной голос — прямоугольная волна, а «красивые» тона
   оставлены для приветствий и мелодий. */
const Speaker = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  /* один тон с мягкой атакой и спадом — иначе на квадратной волне слышны щелчки */
  function tone(f, dur, type, vol, delay) {
    const c = ac();
    if (!c || MUTED) return;
    const t0 = c.currentTime + (delay || 0);
    const vol0 = vol == null ? 0.035 : vol;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f || 800, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol0), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  /* мелодия: [[частота, длительность, пауза перед], ...] */
  function melody(seq, type, vol) {
    if (MUTED) return;
    let at = 0;
    seq.forEach(n => {
      const f = n[0], d = n[1], pause = n[2] == null ? 0 : n[2];
      tone(f, d, type, vol, at);
      at += d + pause;
    });
    return at;
  }

  const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00, C6: 1046.50, E6: 1318.51 };

  return {
    tone: tone,
    melody: melody,
    ok() { tone(880, 0.05); },

    /* короткий щелчок при движении по меню — самый частый звук в системе */
    ticks() { tone(1800, 0.014, 'square', 0.012); },

    /* переход: две ноты вверх */
    ding() { melody([[N.E5, 0.09], [N.A5, 0.13]], 'triangle', 0.05); },

    /* ошибка: низкий нисходящий трезвук */
    error() { melody([[196, 0.10], [165, 0.12], [131, 0.20]], 'square', 0.05); },

    /* открытие/закрытие окна — глухой «тук» */
    open() { melody([[N.C5, 0.05, 0], [N.G4, 0.07]], 'square', 0.03); },
    close() { melody([[N.G4, 0.05, 0], [N.C4, 0.07]], 'square', 0.03); },

    /* открытие папки — характерные три ступеньки */
    explore() { melody([[N.C5, 0.05, 0], [N.E5, 0.05, 0.02], [N.G5, 0.07]], 'square', 0.028); },

    /* удаление в корзину — короткий шорох */
    trash() { for (let i = 0; i < 4; i++) tone(2400 - i * 350 + Math.random() * 300, 0.035, 'square', 0.02, i * 0.045); },

    /* диск/модем: шорох лотка */
    chatter() { for (let i = 0; i < 6; i++) tone(2100 + Math.random() * 1200, 0.025, 'square', 0.012, i * 0.05); },

    /* приветствие Windows: арпеджио из четырёх нот */
    startup() { melody([[N.C5, 0.16, 0.10], [N.G5, 0.16, 0.10], [N.C6, 0.18, 0.14], [N.E6, 0.45]], 'triangle', 0.06); },

    /* выигрыш в игре */
    tada() { melody([[N.C5, 0.10, 0.06], [N.E5, 0.10, 0.06], [N.G5, 0.10, 0.06], [N.C6, 0.30]], 'triangle', 0.055); },

    /* модем: гудок, набор, handshake — как в 1995-м */
    dialTone() { tone(350, 1.2, 'sine', 0.02, 0); tone(440, 1.2, 'sine', 0.02, 0); },
    modemDial() {
      this.dialTone();
      for (let i = 0; i < 9; i++) tone(1200 + (i % 3) * 200, 0.05, 'square', 0.022, 1.25 + i * 0.16);
      melody([[2100, 0.22, 0.05], [1200, 0.18, 0.05], [2400, 0.22, 0.05], [900, 0.30]], 'sine', 0.035);
    },

    /* щелчок клавиши при вводе в строке */
    key() { tone(1400, 0.012, 'square', 0.008); }
  };
})();

/* ---------- стадии ---------- */
const StageInit = {};
let CurrentStage = 'bios';
function showStage(id, skipInit) {
  QQ('.stage').forEach(s => s.classList.remove('on'));
  const n = Q('#st-' + id);
  if (!n) return;
  n.classList.add('on');
  CurrentStage = id;
  if (!skipInit && StageInit[id]) StageInit[id](n);
}

/* ---------- масштабирование сцены ---------- */
function fitScreen() {
  const s = Math.min(window.innerWidth / 800, window.innerHeight / 600);
  Q('#stageWrap').style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  const hint = Q('#hint');
  if (hint) hint.style.opacity = s > 0.92 ? '0' : '1';   /* на полном экране подсказка лезет на панель задач */
}
window.addEventListener('resize', fitScreen);

/* ---------- мелкие хелперы интерфейса ---------- */
function mkCheckbox(label, checked, onchange) {
  const box = el('span', { cls: 'box' });
  const n = el('label', { cls: 'cb' + (checked ? ' on' : ''), kids: [box, label != null ? el('span', { text: label }) : null] });
  n.set = v => n.classList.toggle('on', !!v);
  n.get = () => n.classList.contains('on');
  n.addEventListener('click', e => { e.stopPropagation(); n.classList.toggle('on'); if (onchange) onchange(n.get()); });
  return n;
}
function mkRadio(name, label, checked, onchange) {
  const box = el('span', { cls: 'box' });
  const n = el('label', { cls: 'rb' + (checked ? ' on' : ''), attrs: { 'data-rname': name }, kids: [box, label != null ? el('span', { text: label }) : null] });
  n.addEventListener('click', e => {
    e.stopPropagation();
    QQ('[data-rname="' + name + '"]').forEach(x => x.classList.remove('on'));
    n.classList.add('on');
    if (onchange) onchange(name);
  });
  return n;
}
function radioGroup(name, items, value, onchange) {
  const g = el('div', { cls: 'col' });
  const nodes = items.map(it => {
    const r = mkRadio(name, it.label, it.value === value, v => onchange && onchange(v));
    g.appendChild(r); return r;
  });
  g.get = () => { const f = nodes.find(n => n.classList.contains('on')); return f ? f.getAttribute('data-val') : null; };
  g.setVal = v => { nodes.forEach(n => n.classList.toggle('on', n.textContent === '' ? false : false)); };
  g.nodes = nodes;
  return g;
}
function mkSlider(min, max, value, onchange, width) {
  const thumb = el('div', { cls: 'thumb' });
  const track = el('div', { cls: 'track', kids: [thumb] });
  const inp = el('input', { attrs: { type: 'range', min: min, max: max, value: value } });
  const wrap = el('div', { cls: 'slider', style: width ? 'width:' + width + 'px' : '', kids: [track, inp] });
  const set = v => {
    v = Math.max(min, Math.min(max, v));
    const p = (v - min) / (max - min || 1);
    thumb.style.left = 'calc(' + (p * 100) + '% - ' + (p * 11) + 'px)';
    inp.value = v;
  };
  set(value);
  inp.addEventListener('input', () => { set(+inp.value); if (onchange) onchange(+inp.value); });
  wrap.set = v => { set(v); if (onchange) onchange(+inp.value); };
  wrap.get = () => +inp.value;
  return wrap;
}
function mkSelect(options, value, onchange, width) {
  const s = el('select', { cls: 'field', style: width ? 'width:' + width + 'px' : '' });
  options.forEach(o => {
    const v = (typeof o === 'string') ? o : o.value;
    const t = (typeof o === 'string') ? o : o.label;
    s.appendChild(el('option', { value: v, text: t }));
  });
  s.value = value;
  if (onchange) s.addEventListener('change', () => onchange(s.value));
  return s;
}

/* ---------- полосы прокрутки в стиле Win9 ---------- */
function scrollify(viewport, opts) {
  opts = opts || {};
  /* полоса крепится к самому блоку: если он в потоке, надо дать точку опоры,
     иначе полоса уезжает к внешнему позиционированному родителю */
  if (getComputedStyle(viewport).position === 'static') viewport.style.position = 'relative';
  const horiz = !!opts.horizontal;
  const wrap = el('div', { style: horiz ? 'position:absolute;left:0;right:0;bottom:0;height:16px' : 'position:absolute;right:0;top:0;bottom:16px;width:16px' });
  const sc = el('div', { cls: 'scroll ' + (horiz ? 'h' : 'v') });
  const mkBtn = (cls, arrow, fn) => {
    const b = el('div', { cls: 'btn ' + cls + ' ' + arrow, on: { mousedown: e => e.stopPropagation() } });
    b.addEventListener('click', () => { fn(); Speaker.ticks(); });
    return b;
  };
  const track = el('div', { cls: 'track' });
  const grip = el('div', { cls: 'grip' });
  sc.appendChild(track); sc.appendChild(grip); wrap.appendChild(sc);
  let vis = 0;
  /* запоминаем исходные отступы, чтобы вернуть их, когда полоса не нужна */
  const pad0 = { r: viewport.style.paddingRight || '', b: viewport.style.paddingBottom || '' };

  function layout() {
    const vsize = horiz ? viewport.clientWidth : viewport.clientHeight;
    const csize = horiz ? viewport.scrollWidth : viewport.scrollHeight;
    const bsize = 17;
    const range = vsize - bsize;
    if (csize <= vsize || vsize <= bsize) {
      sc.style.display = 'none';
      /* полосы нет — содержимое занимает всю ширину */
      if (horiz) viewport.style.paddingBottom = pad0.b;
      else viewport.style.paddingRight = pad0.r;
      return;
    }
    sc.style.display = '';
    /* отступ, а не right: у относительного блока right сдвигает его, а не ужимает */
    if (horiz) viewport.style.paddingBottom = '16px';
    else viewport.style.paddingRight = '16px';
    vis = Math.max(20, Math.round(range * (vsize / csize)));
    grip.style.width = horiz ? '' : '16px';
    grip.style.height = horiz ? '16px' : '';
    grip.style.left = horiz ? '' : '0';
    grip.style.top = horiz ? '0' : '';
    const maxPos = range - vis;
    const p = Math.max(0, Math.min(1, (horiz ? viewport.scrollLeft : viewport.scrollTop) / (csize - vsize || 1)));
    if (horiz) grip.style.left = Math.round(p * maxPos) + 'px';
    else grip.style.top = Math.round(p * maxPos) + 'px';
  }
  const step = horiz ? viewport.clientWidth * 0.9 : viewport.clientHeight * 0.9;
  sc.appendChild(mkBtn(horiz ? 'lf' : 'up', horiz ? 'arrow-l' : 'arrow-u', () => {
    if (horiz) viewport.scrollLeft -= step; else viewport.scrollTop -= step; layout();
  }));
  sc.appendChild(mkBtn(horiz ? 'rt' : 'dn', horiz ? 'arrow-r' : 'arrow-d', () => {
    if (horiz) viewport.scrollLeft += step; else viewport.scrollTop += step; layout();
  }));
  function dragging(e0) {
    const startPos = horiz ? e0.clientX : e0.clientY;
    const startOff = horiz ? parseFloat(grip.style.left || 0) : parseFloat(grip.style.top || 0);
    const range = (horiz ? viewport.clientWidth : viewport.clientHeight) - 17 - vis;
    const move = e => {
      /* дельта приходит в пикселях браузера, offset ползунка — в координатах
         сцены; без деления на масштаб ползунок уезжает не туда */
      const d = ((horiz ? e.clientX : e.clientY) - startPos) / stageScale();
      const p = Math.max(0, Math.min(1, (startOff + d) / (range || 1)));
      if (horiz) viewport.scrollLeft = p * (viewport.scrollWidth - viewport.clientWidth);
      else viewport.scrollTop = p * (viewport.scrollHeight - viewport.clientHeight);
      layout();
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }
  grip.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); dragging(e); });
  viewport.addEventListener('scroll', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(viewport);
  if (viewport.firstElementChild) { if (window.ResizeObserver) new ResizeObserver(layout).observe(viewport.firstElementChild); }
  viewport.parentNode.insertBefore(wrap, viewport.nextSibling);
  setTimeout(layout, 0);
  setTimeout(layout, 30);
  return { relayout: layout, node: wrap };
}

/* ---------- мелочи ---------- */
function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
const ruDate = d => (d.getDate() + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear());
const ruTime = d => (pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()));