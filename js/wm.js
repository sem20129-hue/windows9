/* ============================================================
   wm.js — рабочий стол, меню Пуск, панель задач, окна, трей
   ============================================================ */
'use strict';

/* ---------- значки ---------- */
function iconEl(cls, size) {
  size = size || 16;
  return el('div', { cls: 'ico', style: 'width:' + size + 'px;height:' + size + 'px' },
    [el('div', { cls: 'body ' + cls })]);
}

/* ---------- всплывающие меню ---------- */
const STAGE_W = 800, STAGE_H = 572;
function stageScale() {
  const sr = Q('#screen').getBoundingClientRect();
  return (sr.width / STAGE_W) || 1;
}
/* экран масштабируется transform-ом, а координаты мыш�� приходят в пикселях браузера —
   пересчитываем их в координаты сцены, иначе меню уезжает за край */
function stageCoords(clientX, clientY) {
  const sr = Q('#screen').getBoundingClientRect();
  const k = stageScale();
  return { x: (clientX - sr.left) / k, y: (clientY - sr.top) / k };
}

let openPops = [];
function closePops() { openPops.forEach(p => p.remove()); openPops = []; }
function popMenu(items, x, y, opts) {
  opts = opts || {};
  const pop = el('div', { cls: 'pop' });
  buildPop(pop, items, opts);
  Q('#menuLayer').appendChild(pop);
  pop.classList.add('pop-in');
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const px = Math.max(0, Math.min(x, STAGE_W - w - 2));
  const py = Math.max(0, Math.min(y, STAGE_H - h - 2));
  pop.style.left = px + 'px'; pop.style.top = py + 'px';
  openPops.push(pop);
  return pop;
}
function buildPop(pop, items, opts) {
  (items || []).forEach(it => {
    if (!it) return;
    if (it.sep) { pop.appendChild(el('div', { cls: 'sep' })); return; }
    const node = el('div', { cls: 'item' + (it.disabled ? ' dis' : '') }, [
      it.checked ? el('span', { cls: 'chk', text: '✓' }) : (it.radio ? el('span', { cls: 'chk', text: '●' }) : null),
      el('span', { text: it.label }),
      it.accel ? el('span', { cls: 'acc', text: it.accel }) : null,
      it.sub ? el('span', { cls: 'arr', text: '▶' }) : null
    ]);
    if (!it.disabled) {
      let subTimer = null;
      node.addEventListener('mouseenter', () => {
        // закрыть вложенные, если курсор ушёл в другую ветку
        while (openPops.length > (opts.depth || 1)) openPops.pop().remove();
        if (it.sub) {
          subTimer = setTimeout(() => {
            const r = node.getBoundingClientRect();
            const sc = stageCoords(r.right, r.top);
            popMenu(it.sub, sc.x - 3, sc.y - 3, { depth: (opts.depth || 1) + 1 });
          }, 120);
        }
      });
      node.addEventListener('mouseleave', () => { if (subTimer) clearTimeout(subTimer); });
      node.addEventListener('click', e => {
        e.stopPropagation();
        if (it.sub) return;
        closePops();
        Speaker.ticks();
        if (it.action) setTimeout(it.action, 0);
      });
    }
    pop.appendChild(node);
  });
}

/* ============================================================
   Менеджер окон
   ============================================================ */
let winSeq = 0;
const WinList = [];
const Wm = {
  active: null,
  startDesktop: null,
  refreshDesktop: null,

  icon: iconEl,

  open(o) {
    const id = ++winSeq;
    const w = o.w || 420, h = o.h || 300;
    let x = o.x != null ? o.x : Math.round((800 - w) / 2 + (WinList.length % 6) * 18);
    let y = o.y != null ? o.y : Math.round((572 - h) / 2 + (WinList.length % 6) * 18);
    x = clamp(x, 0, Math.max(0, 800 - w));
    y = clamp(y, 0, Math.max(0, 572 - h));

    const node = el('div', { cls: 'win', style: 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px' });
    const ticon = el('span', { cls: 'ico ticon' }, [el('div', { cls: 'body ' + (o.icon || 'i-folder'), style: 'width:16px;height:16px' })]);
    const ttext = el('span', { cls: 'ttext', text: o.title || '' });
    const btnMin = el('div', { cls: 'tbtn min', attrs: { title: 'Свернуть' } });
    const btnMax = el('div', { cls: 'tbtn max', attrs: { title: 'Развернуть' } });
    const btnCls = el('div', { cls: 'tbtn cls', attrs: { title: 'Закрыть' } });
    const titlebar = el('div', { cls: 'titlebar' }, [ticon, ttext, btnMin, btnMax, btnCls]);
    node.appendChild(titlebar);

    /* уголок изменения размера */
    const grip = el('div', { cls: 'sizegrip' });
    grip.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      if (win.maximized) return;
      win.focus();
      const sw = node.offsetWidth, sh = node.offsetHeight, sl = node.offsetLeft, st = node.offsetTop;
      const sx = e.clientX, sy = e.clientY;
      const move = ev => {
        /* дельты — в пикселях браузера, а width/left живут в координатах сцены */
        const k = stageScale();
        node.style.width = clamp(sw + (ev.clientX - sx) / k, 120, 800 - sl) + 'px';
        node.style.height = clamp(sh + (ev.clientY - sy) / k, 60, 572 - st) + 'px';
      };
      const up = () => {
        window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
        window.dispatchEvent(new Event('resize'));
      };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    });
    node.appendChild(grip);

    let menubar = null;
    if (o.menus && o.menus.length) {
      menubar = el('div', { cls: 'menubar' });
      o.menus.forEach(m => {
        const mi = el('div', { cls: 'mi', text: m.label });
        mi.addEventListener('mousedown', e => { e.stopPropagation(); openBarMenu(mi, m, node); });
        mi.addEventListener('mouseenter', () => {
          const opened = menubar.querySelector('.mi.open');
          if (opened && opened !== mi) openBarMenu(mi, m, node);
        });
        menubar.appendChild(mi);
      });
      node.appendChild(menubar);
    }

    const body = el('div', { cls: 'winbody' });
    node.appendChild(body);
    let status = null;
    if (o.status) {
      status = el('div', { cls: 'statusbar' });
      (Array.isArray(o.status) ? o.status : [o.status]).forEach(s => {
        if (s && s.nodeType === 1) status.appendChild(s);
        else status.appendChild(el('div', { cls: 'cell', text: s }));
      });
      node.appendChild(status);
    }
    Q('#winLayer').appendChild(node);
    /* появление окна: короткое «вырастание», чтобы движение читалось как движение */
    node.classList.add('win-in');

    let taskBtn = null;
    if (!o.noTask) {
      taskBtn = el('div', { cls: 'task-btn' }, [
        el('span', { cls: 'ico', style: 'width:16px;height:16px' }, [el('div', { cls: 'body ' + (o.icon || 'i-folder'), style: 'width:16px;height:16px' })]),
        el('span', { cls: 'ttext', text: o.title || '' })
      ]);
      taskBtn.addEventListener('click', () => {
        if (win.minimized) win.restore();
        else if (Wm.active === win) win.minimize();
        else win.focus();
      });
      Q('#taskList').appendChild(taskBtn);
    }

    const win = {
      id: id, el: node, body: body, titlebar: titlebar, taskBtn: taskBtn,
      minimized: false, maximized: false, onKey: o.onKey || null, onClose: o.onClose || null,
      setTitle(t) { ttext.textContent = t; if (taskBtn) taskBtn.querySelector('.ttext').textContent = t; },
      setStatus(i, t) { if (status) status.children[i].textContent = t; },
      close() {
        if (win.onClose && win.onClose() === false) return;
        Speaker.close();
        node.classList.add('win-out');
        setTimeout(() => node.remove(), 90);
        node.style.pointerEvents = 'none';
        if (taskBtn) taskBtn.remove();
        const i = WinList.indexOf(win); if (i >= 0) WinList.splice(i, 1);
        if (Wm.active === win) {
          Wm.active = null;
          const next = WinList.filter(v => !v.minimized).pop();
          if (next) next.focus(); else blurbAll();
        }
      },
      minimize() {
        win.minimized = true; node.style.display = 'none';
        if (taskBtn) taskBtn.classList.remove('act');
        if (Wm.active === win) {
          Wm.active = null;
          const next = WinList.filter(v => !v.minimized && v.el.isConnected).pop();
          if (next) next.focus(); else blurbAll();
        }
      },
      restore() { win.minimized = false; node.style.display = ''; win.focus(); },
      toggleMax() {
        if (win.maximized) {
          node.style.left = win._r.left; node.style.top = win._r.top;
          node.style.width = win._r.w; node.style.height = win._r.h;
          win.maximized = false;
        } else {
          win._r = { left: node.style.left, top: node.style.top, w: node.style.width, h: node.style.height };
          node.style.left = '0px'; node.style.top = '0px';
          node.style.width = '800px'; node.style.height = '572px';
          win.maximized = true;
        }
        Speaker.ticks();
        setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
      },
      focus() {
        node.style.zIndex = zTopX();
        if (Wm.active && Wm.active !== win) Wm.active.el.classList.add('blur');
        Wm.active = win;
        node.classList.remove('blur');
        WinList.forEach(v => { if (v.taskBtn) v.taskBtn.classList.toggle('act', v === win); });
        closePops();
        return win;
      }
    };
    function openBarMenu(mi, m, hostNode) {
      closePops();
      menubar.querySelectorAll('.mi').forEach(x => x.classList.remove('open'));
      mi.classList.add('open');
      const r = mi.getBoundingClientRect();
      const sc = stageCoords(r.left, r.bottom);
      const p = popMenu(m.items, sc.x - 1, sc.y - 1, {});
      const obs = setInterval(() => {
        if (!p.isConnected) { mi.classList.remove('open'); clearInterval(obs); }
      }, 120);
    }

    node.addEventListener('mousedown', () => { if (Wm.active !== win) win.focus(); }, true);

    /* перетаскивание + системное меню по клику без движения */
    win._dragged = false;
    titlebar.addEventListener('mousedown', e => {
      if (e.target.classList.contains('tbtn')) return;
      win.focus();
      win._dragged = false;
      if (win.maximized) return;
      const sx = e.clientX, sy = e.clientY;
      const nl = node.offsetLeft, nt = node.offsetTop;
      const move = ev => {
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) win._dragged = true;
        /* координаты сцены, а не экрана: без деления окно уезжает от курсора
           в stageScale() раз — заметно на 1920×1080, где масштаб 1.8 */
        const k = stageScale();
        node.style.left = clamp(nl + (ev.clientX - sx) / k, -node.offsetWidth + 60, 800 - 30) + 'px';
        node.style.top = clamp(nt + (ev.clientY - sy) / k, 0, 572 - 20) + 'px';
      };
      const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      e.preventDefault();
    });
    titlebar.addEventListener('click', e => {
      if (e.target.classList.contains('tbtn')) return;
      if (win._dragged) return;
      const sc = stageCoords(e.clientX, e.clientY);
      Wm.systemMenu(win, sc.x, sc.y);
    });
    titlebar.addEventListener('dblclick', e => { if (!e.target.classList.contains('tbtn')) win.toggleMax(); });
    btnMin.addEventListener('click', () => win.minimize());
    btnMax.addEventListener('click', () => win.toggleMax());
    btnCls.addEventListener('click', () => win.close());

    WinList.push(win);
    if (o.build) o.build(body, win);
    if (!o.noFocus) win.focus();
    return win;
  },

  /* после изменения размера окна — вернуть его на рабочий стол целиком */
  clampInto(win) {
    win.el.style.left = clamp(parseFloat(win.el.style.left) || win.el.offsetLeft, 0, Math.max(0, 800 - win.el.offsetWidth)) + 'px';
    win.el.style.top = clamp(parseFloat(win.el.style.top) || win.el.offsetTop, 0, Math.max(0, 572 - win.el.offsetHeight)) + 'px';
    return win;
  },

  /* системное меню окна: клик по заголовку или Alt+Пробел */
  systemMenu(win, x, y) {
    closePops();
    popMenu([
      {
        label: 'Восстановить', disabled: (!win.maximized && !win.minimized),
        action: () => { if (win.maximized) win.toggleMax(); else if (win.minimized) win.restore(); }
      },
      { label: 'Переместить', disabled: true },
      { label: 'Размер', disabled: true },
      { label: 'Свернуть', action: () => win.minimize() },
      { label: 'Развернуть', disabled: win.maximized, action: () => win.toggleMax() },
      { sep: true },
      { label: 'Закрыть', accel: 'Alt+F4', action: () => win.close() }
    ], x, y);
  },

  /* показать рабочий стол: свернуть всё */
  showDesktop() {
    const anyOpen = WinList.some(v => !v.minimized);
    if (!anyOpen) { WinList.forEach(v => v.restore()); return; }
    WinList.forEach(v => { if (!v.minimized) v.minimize(); });
  },

  /* ---------- диалоги ---------- */
  dialog(o) {
    return Wm.open(Object.assign({}, o, {
      w: o.w || 380, h: o.h || 200, noTask: true, resizable: false
    }));
  },

  msgBox(title, text, buttons, icon) {
    buttons = buttons || [{ label: 'ОК', value: 'ok', def: true }];
    return new Promise(resolve => {
      let btns = buttons, done = false;
      const finish = v => { if (!done) { done = true; resolve(v); } };
      const w = Wm.dialog({
        title: title, w: 360, h: 0, x: 200, y: 180, icon: icon || 'i-help',
        build(body, win) {
          const pad = el('div', { cls: 'pad' });
          pad.appendChild(el('div', { cls: 'row' }, [
            el('div', { cls: 'ico-lg' }, [iconEl(icon || 'i-help', 32)]),
            el('div', { cls: 'msg txt', html: String(text).replace(/\n/g, '<br>') })
          ]));
          body.appendChild(pad);
          const bar = el('div', { cls: 'btns' });
          btns.forEach(b => {
            const btn = el('button', { cls: 'btn' + (b.def ? ' def' : ''), text: b.label });
            btn.addEventListener('click', () => {
              Speaker.ding();
              if (b.action) b.action();
              win.close();
              finish(b.value);
            });
            bar.appendChild(btn);
          });
          body.appendChild(bar);
          node_autoheight(win, body);
          const def = btns.find(b => b.def);
          win.onKey = e => {
            if (e.key === 'Enter' && def) { Speaker.ding(); win.close(); finish(def.value); return true; }
            if (e.key === 'Escape') { Speaker.ticks(); win.close(); finish(null); return true; }
            return false;
          };
        },
        onClose() { finish(null); }
      });
      setTimeout(() => { const b = w.el.querySelector('.btn.def'); if (b) b.focus(); }, 30);
    });
  },

  printJob(name) {
    const tray = Q('#printStatus');
    Q('#trayIcons').textContent = name;
    tray.hidden = false;
    Speaker.ticks();
    setTimeout(() => { tray.hidden = true; Q('#trayIcons').textContent = ''; }, 3000);
  }
};
function node_autoheight(win, body) {
  const h = body.offsetHeight + (win.el.querySelector('.titlebar') ? 18 : 0) + 6;
  win.el.style.height = h + 'px';
}
/* окна копятся в пределах 100..89999, меню живут выше — иначе при долгой работе
   счётчик перерастает их и меню уезжает под окна */
let _z = 100;
function zTopX() {
  if (_z > 89999) { _z = 100; WinList.forEach((v, i) => { if (v.el.isConnected) v.el.style.zIndex = 100 + i; }); }
  return ++_z;
}
function blurbAll() { WinList.forEach(v => { v.el.classList.add('blur'); if (v.taskBtn) v.taskBtn.classList.remove('act'); }); }

/* ============================================================
   Рабочий стол
   ============================================================ */
const DESK_ICONS = [
  { order: 0, key: 'mycomputer', label: 'Мой компьютер', icon: 'i-computer', open: () => Apps.myComputer() },
  { order: 1, key: 'ie', label: 'Обозреватель Интернета', icon: 'i-ie', open: () => Apps.browser() },
  { order: 2, key: 'google', label: 'Google Search 1.0', icon: 'i-goo', open: () => Apps.google() },
  { order: 3, key: 'mydocs', label: 'Мои документы', icon: 'i-doc', open: () => Apps.explorerFolder('C:\\Мои документы') },
  { order: 4, key: 'briefcase', label: 'Мой портфель', icon: 'i-txt', open: () => Wm.msgBox('Мой портфель', 'Портфель пуст.\nПеретащите в него файлы, чтобы забрать их с собой.', [{ label: 'ОК', value: 'ok', def: true }], 'i-txt') },
  { order: 5, key: 'network', label: 'Сетевое окружение', icon: 'i-net', open: () => Apps.explorerFolder('The Microsoft Network') },
  { order: 6, key: 'inbox', label: 'Входящая почта', icon: 'i-msn', open: () => Apps.inbox() },
  { order: 7, key: 'recycle', label: 'Корзина', icon: 'i-bin', open: () => Apps.recycleBin() }
];
const Recycle = { items: [] };

let startMenuOpen = null, startMenuTimer = null;
function toggleStartMenu() {
  if (startMenuOpen) { closeStartMenu(); return; }
  Speaker.ticks();
  const btn = Q('#startBtn');
  btn.classList.add('on');
  const items = Apps.startMenu();
  const p = popMenu(items, 2, STAGE_H, {});   /* y=высота экрана → прижимается к низу */
  startMenuOpen = p;
  if (startMenuTimer) clearInterval(startMenuTimer);
  startMenuTimer = setInterval(() => {
    if (p.isConnected) return;
    clearInterval(startMenuTimer);
    startMenuTimer = null;
    startMenuOpen = null;
    const b = Q('#startBtn'); if (b) b.classList.remove('on');
  }, 100);
}
function closeStartMenu() {
  if (startMenuTimer) { clearInterval(startMenuTimer); startMenuTimer = null; }
  if (startMenuOpen) { startMenuOpen.remove(); startMenuOpen = null; }
  const b = Q('#startBtn'); if (b) b.classList.remove('on');
}

function renderDesktopIcons() {
  const layer = Q('#deskIcons');
  layer.innerHTML = '';
  const pos = {};
  DESK_ICONS.forEach((it, i) => {
    const col = Math.floor(i / 8), row = i % 8;
    const node = el('div', { cls: 'dicon', style: 'left:' + (8 + col * 78) + 'px;top:' + (8 + row * 62) + 'px', attrs: { 'data-key': it.key } }, [
      el('div', { cls: 'ico', style: 'margin:0 auto;width:32px;height:32px' }, [el('div', { cls: 'body ' + it.icon, style: 'width:32px;height:32px' })]),
      el('div', { cls: 'lbl', text: it.label })
    ]);
    node.addEventListener('click', e => {
      e.stopPropagation();
      if (node._moved) return;
      QQ('.dicon').forEach(d => d.classList.remove('sel'));
      node.classList.add('sel');
    });
    /* перетаскивание значка */
    node.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      const nl = parseFloat(node.style.left), nt = parseFloat(node.style.top);
      const dr = Q('#desktop');
      const move = ev => {
        const dx = (ev.clientX - sx) / stageScale(), dy = (ev.clientY - sy) / stageScale();
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 3) node._moved = true;
        node.style.left = clamp(nl + dx, 0, dr.clientWidth - node.offsetWidth) + 'px';
        node.style.top = clamp(nt + dy, 0, dr.clientHeight - node.offsetHeight) + 'px';
      };
      const up = () => {
        window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
        setTimeout(() => { node._moved = false; }, 0);
      };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    });
    node.addEventListener('dblclick', () => { Speaker.ding(); it.open(); });
    node.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      QQ('.dicon').forEach(d => d.classList.remove('sel'));
      node.classList.add('sel');
      const sc = stageCoords(e.clientX, e.clientY);
      e_lastX = sc.x; e_lastY = sc.y;
      desktopIconMenu(node, it);
    });
    layer.appendChild(node);
  });
  attachDesktopContext();
}
function desktopIconMenu(node, it) {
  popMenu([
    { label: 'Открыть', action: () => it.open() },
    { label: 'Переименовать', action: () => renameIcon(node, it) },
    { sep: true },
    { label: 'Вырезать', disabled: true }, { label: 'Копировать', disabled: true },
    { sep: true },
    { label: 'Удалить', action: () => moveToBin(node, it) },
    { sep: true },
    { label: 'Свойства', action: () => Apps.iconProps(it) }
  ], e_lastX, e_lastY);
}
let e_lastX = 0, e_lastY = 0;
/* переименование значка рабочего стола */
function renameIcon(node, it) {
  const inp = el('input', { cls: 'field', value: it.label, style: 'flex:1' });
  const hook = {};
  return Wm.dialog({
    title: 'Переименование', w: 360, h: 140, icon: 'i-folder',
    build(b, w) {
      const apply = () => {
        const v = inp.value.trim();
        if (v) it.label = v;
        w.close();
        renderDesktopIcons();
      };
      b.appendChild(el('div', { style: 'padding:14px 14px 4px', text: 'Новое имя:' }));
      b.appendChild(el('div', { style: 'display:flex;gap:8px;padding:4px 14px 0' }, [inp]));
      b.appendChild(el('div', { cls: 'btns' }, [
        el('button', { cls: 'btn', text: 'Отмена', on: { click: () => w.close() } }),
        el('button', { cls: 'btn def', text: 'ОК', on: { click: apply } })
      ]));
      hook.ok = apply;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { apply(); e.preventDefault(); } });
      setTimeout(() => { inp.focus(); inp.select(); }, 40);
    }
  });
}

function moveToBin(node, it) {
  Speaker.trash();
  Recycle.items.push(it);
  node.remove();
  const tray = Q('#trayIcons');
}
/* рамка выделения мышью, как в Windows 9 */
function startMarquee(e) {
  const desk = Q('#desktop');
  const k = stageScale();
  const x0 = (e.clientX - desk.getBoundingClientRect().left) / k;
  const y0 = (e.clientY - desk.getBoundingClientRect().top) / k;
  const box = el('div', { cls: 'marquee' });
  Q('#deskIcons').appendChild(box);
  const move = ev => {
    const x = (ev.clientX - desk.getBoundingClientRect().left) / k;
    const y = (ev.clientY - desk.getBoundingClientRect().top) / k;
    const l = Math.min(x, x0), t = Math.min(y, y0);
    const w = Math.abs(x - x0), h = Math.abs(y - y0);
    box.style.left = l + 'px'; box.style.top = t + 'px';
    box.style.width = w + 'px'; box.style.height = h + 'px';
    QQ('.dicon').forEach(d => {
      const dl = parseFloat(d.style.left), dt = parseFloat(d.style.top);
      const hit = dl < l + w && dl + d.offsetWidth > l && dt < t + h && dt + d.offsetHeight > t;
      d.classList.toggle('sel', hit);
    });
  };
  const up = () => {
    window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
    box.remove();
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

function attachDesktopContext() {
  const desk = Q('#desktop');
  desk.addEventListener('mousedown', e => {
    if (e.target === desk || e.target.id === 'deskIcons') {
      QQ('.dicon').forEach(d => d.classList.remove('sel'));
      closePops(); closeStartMenu();
      startMarquee(e);
    }
  });
  desk.addEventListener('click', e => {
    if (e.target.id === 'deskIcons') { QQ('.dicon').forEach(d => d.classList.remove('sel')); }
  });
  desk.addEventListener('contextmenu', e => {
    if (e.target.closest && e.target.closest('.win')) return;
    e.preventDefault();
    const sc = stageCoords(e.clientX, e.clientY);
    e_lastX = sc.x; e_lastY = sc.y;
    popMenu([
      { label: 'Упорядочить значки', sub: [
        { label: 'по имени', action: () => Apps.arrangeIcons('по имени') },
        { label: 'по типу', action: () => Apps.arrangeIcons('по типу') },
        { label: 'по размеру', action: () => Apps.arrangeIcons('по размеру') },
        { label: 'автоматически', action: () => Apps.arrangeIcons('автоматически') }
      ] },
      { label: 'Обновить', accel: 'F5', action: () => renderDesktopIcons() },
      { sep: true },
      { label: 'Вставить', disabled: true },
      { label: 'Вставить ярлык', disabled: true },
      { sep: true },
      { label: 'Свойства', action: () => Apps.displayProps('desktop') }
    ], sc.x, sc.y);
  });
}

/* ============================================================
   Панель задач
   ============================================================ */
function buildTaskbar() {
  Q('#quickLaunch').innerHTML = '';
  [
    { icon: 'i-ie', t: 'Обозреватель Интернета', fn: () => Apps.browser() },
    { icon: 'i-goo', t: 'Google Search 1.0', fn: () => Apps.google() },
    { icon: 'i-folder', t: 'Проводник Windows', fn: () => Apps.explorerFolder('C:\\') },
    { icon: 'i-computer', t: 'Мой компьютер', fn: () => Apps.myComputer() },
    { icon: 'i-cp', t: 'Панель управления', fn: () => Apps.controlPanel() },
    { icon: 'i-bin', t: 'Показать рабочий стол', fn: () => Wm.showDesktop() }
  ].forEach(q => {
    const b = el('div', { cls: 'ql-btn', attrs: { title: q.t } }, [iconEl(q.icon, 16)]);
    b.addEventListener('click', () => { Speaker.ticks(); q.fn(); });
    Q('#quickLaunch').appendChild(b);
  });

  Q('#trayIcons').innerHTML = '';
  const spk = el('span', { attrs: { title: 'Громкость' }, style: 'display:inline-block;width:14px;height:14px;position:relative' }, [
    el('div', { cls: 'i-media', style: 'position:absolute;inset:2px' })
  ]);
  spk.addEventListener('click', () => {
    MUTED = !MUTED;
    spk.style.opacity = MUTED ? '.35' : '1';
    if (!MUTED) Speaker.ding();
    spk.title = MUTED ? 'Звук отключён' : 'Громкость';
  });
  Q('#tray').insertBefore(spk, Q('#trayClock'));

  const clock = Q('#trayClock');
  clock.addEventListener('click', () => { Speaker.ticks(); Apps.dateTimeProps(); });
  clock.addEventListener('dblclick', () => { Speaker.ticks(); Apps.dateTimeProps(); });
  const tick = () => {
    const d = new Date(Date.now() + (Sys.clockOffset || 0));
    clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    clock.title = 'Дата: ' + ruDate(d) + '\nВремя: ' + ruTime(d);
  };
  tick(); setInterval(tick, 1000);
}

/* ============================================================
   Глобальные клавиши
   ============================================================ */
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePops();
  if (e.key === 'F1' && CurrentStage === 'desktop') { e.preventDefault(); Apps.help(); }
  if (e.ctrlKey && e.key === 'Escape' && CurrentStage === 'desktop') { e.preventDefault(); toggleStartMenu(); }
  if (CurrentStage !== 'desktop') return;

  /* Alt+Пробел — системное меню активного окна */
  if (e.altKey && e.code === 'Space' && Wm.active) {
    e.preventDefault();
    const r = Wm.active.titlebar.getBoundingClientRect();
    const sc = stageCoords(r.left, r.top);
    Wm.systemMenu(Wm.active, sc.x + 2, sc.y + 20);
    return;
  }
  if (e.altKey && e.key === 'F4') {
    e.preventDefault();
    if (Wm.active) Wm.active.close();
    return;
  }
  /* F10 — первое меню строки заголовка */
  if (e.key === 'F10' && Wm.active && Wm.active.el.querySelector('.menubar')) {
    e.preventDefault();
    const mi = Wm.active.el.querySelector('.menubar .mi');
    if (mi) mi.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    return;
  }
  const w = Wm.active;
  if (w && w.onKey) {
    const r = w.onKey(e);
    if (r) e.preventDefault();
  }
});

/* ============================================================
   Запуск рабочего стола
   ============================================================ */
function startDesktop() {
  if (CurrentStage === 'desktop' && WinList.length) return;
  showStage('desktop');
  Apps.applyWallpaper(Apps.wallpaper);
  Speaker.startup();   /* приветствие Windows при загрузке рабочего стола */
  renderDesktopIcons();
  buildTaskbar();
  Q('#startBtn').addEventListener('click', e => { e.stopPropagation(); toggleStartMenu(); });
  document.body.addEventListener('click', () => { if (startMenuOpen) closeStartMenu(); });
  Speaker.ding();
  setTimeout(() => {
    Apps.welcomeDialog();
  }, 700);
  Apps.idleWatch();
}